import { NextFunction } from "express";
import axios from "axios";
import { BaseController } from "./baseController";
import apInvoiceOcrService from "../helpers/apInvoiceOcr.service";
import apInvoiceValidationService from "../helpers/apInvoiceValidation.service";
import apInvoiceDocumentService, {
  DuplicateInvoiceError,
} from "../helpers/apInvoiceDocument.service";
import apInvoiceExtractService from "../helpers/apInvoiceExtract.service";
import apEmailIntakeService from "../helpers/apEmailIntake.service";
import apSharePointIntakeService from "../helpers/apSharePointIntake.service";
import apDocumentRequestService from "../helpers/apDocumentRequest.service";
import apSesDocumentService, {
  getSesDocumentFilePath,
} from "../helpers/apSesDocument.service";
import fs from "fs";
import path from "path";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import poMatchOutput from "../json/po_match.json";
import poNoMatchOutput from "../json/po_nomatch.json";
import nopoMatchOutput from "../json/nopo_match.json";
import ocrOldOutput from "../json/ocrold.json";
import extractionPromptConfigService from "../helpers/extractionPromptConfig.service";
import {
  getInProcessOcrHealth,
  getOcrEngineMode,
  resolveOcrUploadsDir,
} from "../helpers/ocrEngine.adapter";

type MockOutputKey = "po_match" | "po_nomatch" | "nopo_match" | "ocrold";

const MOCK_OUTPUTS: Record<MockOutputKey, any> = {
  po_match: poMatchOutput,
  po_nomatch: poNoMatchOutput,
  nopo_match: nopoMatchOutput,
  ocrold: ocrOldOutput,
};

const resolveMockOutputKey = (fileName: string): MockOutputKey => {
  const name = fileName.toLowerCase();
  switch (true) {
    case name.includes("po_nomatch"):
      return "po_nomatch";
    case name.includes("po_match"):
      return "po_match";
    case name.includes("nopo_match"):
    case name.includes("290518") && name.includes("wisata"):
    case name.includes("wisata kawan"):
      return "nopo_match";
    case name.includes("ocrold"):
      return "ocrold";
    default:
      return "po_match";
  }
};

// Only invoice-like documents carry a PO/SES reference worth validating against
// the PO/SES records. Other classified types (timesheet, attendance, etc.) are
// extracted and returned, but skipped during validation.
const VALIDATABLE_TYPES = new Set<string>([
  "invoice",
  "tax_invoice",
  "berita_acara",
  "ses",
]);

const OCR_EXTRACT_URL =
  process.env.AP_OCR_EXTRACT_URL ?? "http://localhost:8181/extract";

const OCR_PUBLIC_BASE_URL = OCR_EXTRACT_URL.replace(/\/extract\/?$/, "");

const OCR_HEALTH_URL =
  process.env.AP_OCR_HEALTH_URL ??
  OCR_EXTRACT_URL.replace(/\/extract\/?$/, "/health");

const resolveExtractTraceId = (req: {
  headers?: Record<string, string | string[] | undefined>;
  file?: Express.Multer.File;
}): string => {
  const header = req.headers?.["x-extract-trace-id"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader && String(fromHeader).trim()) {
    return String(fromHeader).trim();
  }
  const safeName = String(req.file?.originalname || "upload")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 40);
  return `be-${Date.now().toString(36)}-${safeName}`;
};

const logExtractPhase = (
  traceId: string,
  phase: string,
  startedAt: number,
  detail: Record<string, unknown> = {},
) => {
  const elapsedMs = Date.now() - startedAt;
  logger.info(
    `[OCR][${traceId}] ${phase} (+${elapsedMs}ms) ${JSON.stringify(detail)}`,
  );
};

class ApInvoiceOcrController extends BaseController {
  async extractInvoice(req: any, res: any, next: NextFunction) {
    const requestStartedAt = Date.now();
    const traceId = resolveExtractTraceId(req);

    try {
      if (!req.file) {
        throw new APIError(
          "Invoice document is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await apInvoiceExtractService.extractAndPersist({
        file: req.file,
        body: req.body && typeof req.body === "object" ? req.body : {},
        query: req.query && typeof req.query === "object" ? req.query : {},
        uploadedBy: req.user?.id ?? null,
        traceId,
        sourceChannel: "UPLOAD",
        awaitPersist: false,
      });

      logExtractPhase(traceId, "RESPONSE_SENT", requestStartedAt, {
        httpStatus: result.httpStatus,
        success: result.success,
        status: result.status ?? null,
      });

      return res.status(result.httpStatus).json(result.body);
    } catch (error) {
      logExtractPhase(traceId, "REQUEST_FAILED", requestStartedAt, {
        message: error instanceof Error ? error.message : String(error),
      });
      logger.error(`[OCR][${traceId}] Invoice OCR extraction failed:`, error);
      next(error);
    }
  }

  async simulateEmailIntake(req: any, res: any, next: NextFunction) {
    try {
      if (!req.file) {
        throw new APIError(
          "Invoice document is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await apEmailIntakeService.simulateIntake({
        file: req.file,
        fromAddress: String(req.body?.fromAddress || req.body?.from || "").trim(),
        subject: String(req.body?.subject || "Simulated vendor invoice").trim(),
        receivedAt: req.body?.receivedAt
          ? String(req.body.receivedAt)
          : new Date().toISOString(),
        invoiceWorkflow: String(req.body?.invoiceWorkflow || "AUTO")
          .trim()
          .toUpperCase(),
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Email intake simulation completed",
      );
    } catch (error) {
      next(error);
    }
  }

  async listInboundEmails(req: any, res: any, next: NextFunction) {
    try {
      const status = req.query?.status ? String(req.query.status) : undefined;
      const rows = await apEmailIntakeService.listInboundEmails({ status });
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        rows,
        "Inbound emails retrieved",
      );
    } catch (error) {
      next(error);
    }
  }

  async ignoreInboundEmail(req: any, res: any, next: NextFunction) {
    try {
      const inboundEmailId = Number(req.params?.inboundEmailId);
      const result = await apEmailIntakeService.ignoreInboundEmail(inboundEmailId);
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Inbound email ignored — OCR will not retry",
      );
    } catch (error) {
      next(error);
    }
  }

  async pollEmailIntake(req: any, res: any, next: NextFunction) {
    try {
      const result = await apEmailIntakeService.pollMailbox();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Email intake poll completed",
      );
    } catch (error) {
      next(error);
    }
  }

  async simulateSharePointIntake(req: any, res: any, next: NextFunction) {
    try {
      if (!req.file) {
        throw new APIError(
          "Invoice document is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await apSharePointIntakeService.simulateIntake({
        file: req.file,
        fileName: String(
          req.body?.fileName || req.file.originalname || "",
        ).trim(),
        invoiceWorkflow: String(req.body?.invoiceWorkflow || "AUTO")
          .trim()
          .toUpperCase(),
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "SharePoint intake simulation completed",
      );
    } catch (error) {
      next(error);
    }
  }

  async listInboundSharePoint(req: any, res: any, next: NextFunction) {
    try {
      const status = req.query?.status ? String(req.query.status) : undefined;
      const rows = await apSharePointIntakeService.listInboundSharePoint({
        status,
      });
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        rows,
        "Inbound SharePoint files retrieved",
      );
    } catch (error) {
      next(error);
    }
  }

  async pollSharePointIntake(req: any, res: any, next: NextFunction) {
    try {
      const result = await apSharePointIntakeService.pollFolder();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "SharePoint intake poll completed",
      );
    } catch (error) {
      next(error);
    }
  }

  async ocrServiceHealth(req: any, res: any, next: NextFunction) {
    const startedAt = Date.now();
    const engineMode = getOcrEngineMode();

    if (engineMode === "inprocess") {
      const health = await getInProcessOcrHealth();
      return await this.success(
        req,
        res,
        health.ok ? this.status.HTTP_OK : 503,
        {
          ok: health.ok,
          ocrEngine: "inprocess",
          ocrHealthUrl: "inprocess",
          ocrExtractUrl: "inprocess",
          latencyMs: Date.now() - startedAt,
          openAiEnabled: health.openAiEnabled,
          service: health.service,
          activeExtracts: health.activeExtracts,
          queuedExtracts: health.queuedExtracts,
          ocrStatus: health.ocrStatus,
          error: health.error ?? null,
        },
        health.ok
          ? "OCR engine is ready (in-process)"
          : "OCR engine health check failed",
      );
    }

    try {
      const response = await axios.get(OCR_HEALTH_URL, {
        timeout: 8000,
        validateStatus: () => true,
      });
      const ok = response.status >= 200 && response.status < 300;
      return await this.success(
        req,
        res,
        ok ? this.status.HTTP_OK : 503,
        {
          ok,
          ocrEngine: "http",
          ocrHealthUrl: OCR_HEALTH_URL,
          ocrExtractUrl: OCR_EXTRACT_URL,
          latencyMs: Date.now() - startedAt,
          openAiEnabled: response.data?.openAiEnabled ?? null,
          service: response.data?.service ?? null,
          activeExtracts: response.data?.activeExtracts ?? null,
          queuedExtracts: response.data?.queuedExtracts ?? null,
          ocrStatus: response.data?.status ?? null,
        },
        ok ? "OCR service is reachable" : "OCR service health check failed",
      );
    } catch (error) {
      return await this.success(
        req,
        res,
        503,
        {
          ok: false,
          ocrEngine: "http",
          ocrHealthUrl: OCR_HEALTH_URL,
          ocrExtractUrl: OCR_EXTRACT_URL,
          latencyMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        },
        "OCR service is not reachable",
      );
    }
  }

  async extractInvoiceMock(req: any, res: any, next: NextFunction) {
    try {
      if (!req.file) {
        throw new APIError(
          "Invoice document is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      // const delayMs = 10_000 + Math.floor(Math.random() * 20_001);
      const fileName = req.file.originalname ?? "";
      const mockKey = resolveMockOutputKey(fileName);
      const mockOutput = MOCK_OUTPUTS[mockKey];
      // logger.info(
      //   `[OCR][MOCK] Waiting ${delayMs}ms before returning ${mockKey} mock output`,
      // );
      // await new Promise((resolve) => setTimeout(resolve, delayMs));

      const mockWorkflow =
        String(req.body?.invoiceWorkflow ?? req.query?.invoiceWorkflow ?? "")
          .trim()
          .toUpperCase() || "AUTO";
      const hashTypeCode = mockWorkflow === "NON_PO" ? "NON_PO" : "MANPOWER_SERVICES";
      const { byOcrType: configHashesByOcrType } =
        await extractionPromptConfigService.getDocumentConfigHashesByInvoiceTypeCode(
          hashTypeCode,
        );

      const enrichedData = await apInvoiceDocumentService.persistExtractResponse(
        req.file,
        mockOutput.data,
        {
          uploadedBy: req.user?.id,
          configHashesByOcrType,
          sourceChannel: "UPLOAD",
        },
      );

      return res.status(mockOutput.status).json({
        ...mockOutput,
        data: enrichedData,
      });

    } catch (error) {
      if (error instanceof DuplicateInvoiceError) {
        return res.status(StatusCodeEnum.HTTP_CONFLICT).json({
          status: StatusCodeEnum.HTTP_CONFLICT,
          code: "DUPLICATE_INVOICE",
          message: error.message,
          data: {
            exists: true,
            invoiceNumber: error.invoiceNumber,
          },
        });
      }
      logger.error("Invoice OCR extraction failed:", error);
      next(error);
    }
  }

  async extractInvoiceOri(req: any, res: any, next: NextFunction) {
    try {
      if (!req.file) {
        throw new APIError(
          "Invoice document is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      // The file is auto-classified and split into one result per detected
      // document type so the UI can show a tab for each.
      const results = await apInvoiceOcrService.extractDocuments(req.file);

      const skipValidation =
        String(req.query?.validate ?? req.body?.validate ?? "") === "false";

      const documents = [];
      for (const result of results) {
        // Persist each extraction so it can be re-validated later by documentId.
        const documentId = await apInvoiceDocumentService.saveExtraction(
          req.file,
          result,
          req.user?.id,
        );

        // Validate the freshly extracted data against the PO/SES records in the
        // same request, unless the caller opted out via ?validate=false.
        let validation = null;
        const shouldValidate =
          result.status === "extracted" &&
          !skipValidation &&
          VALIDATABLE_TYPES.has(result.documentType);
        if (shouldValidate) {
          try {
            validation = await apInvoiceValidationService.validateInvoice({
              header: result.header,
              lineItems: result.lineItems,
              batchDocumentTypes: result.documentType ? [result.documentType] : [],
              documentId: documentId ?? undefined,
              createdBy: req.user?.id,
              invoiceTypeCode: req.body?.invoiceTypeCode,
              workflow: req.body?.invoiceWorkflow ?? req.body?.workflow,
              triggerEvent: "INITIAL_VALIDATION",
            });
            logger.info(
              `[OCR] Validation outcome (${result.documentType}): ${JSON.stringify({
                documentId,
                poNumber: validation.poNumber,
                sesNo: validation.sesNo,
                overallStatus: validation.overallStatus,
                summary: validation.summary,
              })}`,
            );
          } catch (validationError) {
            logger.error("Inline invoice validation failed:", validationError);
          }
        } else {
          logger.info(
            `[OCR] Validation skipped for ${result.documentType} (status=${result.status}, skip=${skipValidation})`,
          );
        }

        documents.push({ ...result, documentId, validation });
      }

      // TEMP DEBUG: dump the full classified extraction payload so it can be
      // inspected in the logs. Remove once verified.
      logger.info(
        `[OCR][DEBUG] Extraction response:\n${JSON.stringify({ documents }, null, 2)}`,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        { documents },
        "Document extracted and classified successfully",
      );
    } catch (error) {
      logger.error("Invoice OCR extraction failed:", error);
      next(error);
    }
  }

  async validateInvoice(req: any, res: any, next: NextFunction) {
    try {
      const header = req.body?.header;
      const lineItems = req.body?.lineItems;
      const invoiceHeaderId = req.body?.invoiceHeaderId;
      const documentId = req.body?.documentId;
      const supportingDocs = req.body?.supportingDocs;
      const batchDocumentTypes = req.body?.batchDocumentTypes;

      if (!header || typeof header !== "object") {
        throw new APIError(
          "Extracted invoice header is required for validation",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await apInvoiceValidationService.validateInvoice({
        header,
        lineItems,
        tables: Array.isArray(req.body?.tables) ? req.body.tables : undefined,
        supportingDocs,
        batchDocumentTypes,
        invoiceHeaderId,
        documentId,
        createdBy: req.user?.id,
        invoiceTypeCode: req.body?.invoiceTypeCode,
        workflow: req.body?.workflow,
        triggerEvent: "MANUAL_RETRIGGER",
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Invoice validated successfully",
      );
    } catch (error) {
      logger.error("Invoice validation failed:", error);
      next(error);
    }
  }

  async checkInvoiceNumberExists(req: any, res: any, next: NextFunction) {
    try {
      const invoiceNumber = String(req.query?.invoiceNumber ?? "").trim();
      if (!invoiceNumber) {
        throw new APIError(
          "invoiceNumber query parameter is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const excludeDocumentId = Number(req.query?.excludeDocumentId);
      const exists = await apInvoiceDocumentService.invoiceNumberExists(
        invoiceNumber,
        Number.isInteger(excludeDocumentId) && excludeDocumentId > 0
          ? excludeDocumentId
          : undefined,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        { exists },
        exists
          ? "Invoice number already exists in extractions"
          : "Invoice number not found in extractions",
      );
    } catch (error) {
      logger.error("Invoice number existence check failed:", error);
      next(error);
    }
  }

  async listUploadedInvoices(req: any, res: any, next: NextFunction) {
    try {
      const rows = await apInvoiceDocumentService.listUploadedInvoices();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        rows,
        "Uploaded invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Failed to list uploaded invoices:", error);
      next(error);
    }
  }

  async getUploadedInvoice(req: any, res: any, next: NextFunction) {
    try {
      const documentId = Number(req.params?.documentId);
      if (!Number.isInteger(documentId) || documentId <= 0) {
        throw new APIError(
          "A valid documentId is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const snapshot =
        await apInvoiceDocumentService.getUploadedInvoiceSnapshot(documentId);
      if (!snapshot) {
        throw new APIError(
          "No uploaded invoice found for the given documentId",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const enrichedSnapshot =
        await apSesDocumentService.enrichExtractResponse(snapshot);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enrichedSnapshot,
        "Uploaded invoice retrieved successfully",
      );
    } catch (error) {
      logger.error("Failed to get uploaded invoice:", error);
      next(error);
    }
  }

  async validateDocument(req: any, res: any, next: NextFunction) {
    try {
      const documentId = Number(req.params?.documentId);
      if (!Number.isInteger(documentId) || documentId <= 0) {
        throw new APIError(
          "A valid documentId is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const stored =
        await apInvoiceDocumentService.getReconstructedExtraction(documentId);
      if (!stored) {
        throw new APIError(
          "No extracted document found for the given documentId",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await apInvoiceValidationService.validateInvoice({
        header: stored.header,
        lineItems: stored.lineItems,
        supportingDocs: body.supportingDocs,
        batchDocumentTypes: body.batchDocumentTypes,
        documentId,
        invoiceHeaderId: stored.document.InvoiceHeaderId ?? undefined,
        createdBy: req.user?.id,
        invoiceTypeCode: body.invoiceTypeCode,
        workflow: body.workflow,
        triggerEvent: "MANUAL_RETRIGGER",
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Invoice validated successfully",
      );
    } catch (error) {
      logger.error("Invoice validation failed:", error);
      next(error);
    }
  }

  async resolveSesDocument(req: any, res: any, next: NextFunction) {
    try {
      const context = {
        sesNo: req.query?.sesNo ?? req.query?.ses_no ?? null,
        poNumber: req.query?.poNumber ?? req.query?.po_number ?? null,
        periodStart: req.query?.periodStart ?? req.query?.period_start ?? null,
        periodEnd: req.query?.periodEnd ?? req.query?.period_end ?? null,
      };

      const backendSes = await apSesDocumentService.resolveForInvoice(context);
      if (!backendSes) {
        throw new APIError(
          "No backend SES document matched this invoice",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        backendSes,
        "SES document resolved",
      );
    } catch (error) {
      logger.error("Failed to resolve SES document:", error);
      next(error);
    }
  }

  async getSesDocumentFile(req: any, res: any, next: NextFunction) {
    try {
      const sesNo = String(req.params?.sesNo || "").trim();
      if (!sesNo) {
        throw new APIError(
          "SES number is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const filePath = getSesDocumentFilePath(sesNo);
      if (!filePath) {
        throw new APIError(
          "SES document file not found",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${path.basename(filePath)}"`,
      );
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      logger.error("Failed to stream SES document:", error);
      next(error);
    }
  }

  /** Serve a split-section PDF from local uploads (in-process) or proxy ocr-demo (http). */
  async getOcrSectionFile(req: any, res: any, next: NextFunction) {
    try {
      const uploadId = String(req.params?.uploadId || "").trim();
      const fileName = String(req.params?.fileName || "").trim();
      if (
        !/^upload_\d+_\d+$/.test(uploadId) ||
        !/^[\w.-]+\.pdf$/i.test(fileName)
      ) {
        throw new APIError(
          "A valid OCR upload path is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (getOcrEngineMode() === "inprocess") {
        const uploadsDir = await resolveOcrUploadsDir();
        const filePath = path.join(uploadsDir, uploadId, fileName);
        const resolved = path.resolve(filePath);
        const uploadsRoot = path.resolve(uploadsDir);
        const relative = path.relative(uploadsRoot, resolved);
        if (
          !relative ||
          relative.startsWith("..") ||
          path.isAbsolute(relative) ||
          !fs.existsSync(resolved)
        ) {
          throw new APIError(
            "OCR section PDF is not available. Re-extract if you just uploaded this file.",
            StatusCodeEnum.HTTP_NOT_FOUND,
          );
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${fileName}"`,
        );
        return fs.createReadStream(resolved).pipe(res);
      }

      const url = `${OCR_PUBLIC_BASE_URL}/uploads/${encodeURIComponent(uploadId)}/${encodeURIComponent(fileName)}`;
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new APIError(
          "OCR section PDF is not available. Restart ocr-demo if you just extracted this file.",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`,
      );
      return res.send(Buffer.from(response.data));
    } catch (error) {
      logger.error("Failed to serve OCR section PDF:", error);
      next(error);
    }
  }

  async createDocumentRequest(req: any, res: any, next: NextFunction) {
    try {
      const primaryDocumentId = Number(
        req.body?.primaryDocumentId ?? req.body?.documentId,
      );
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const result = await apDocumentRequestService.createRequest({
        primaryDocumentId,
        items,
        vendorEmail: req.body?.vendorEmail ?? req.body?.to ?? null,
        vendorName: req.body?.vendorName ?? null,
        invoiceNumber: req.body?.invoiceNumber ?? null,
        createdBy: req.user?.id ?? null,
        extraBody: req.body?.extraBody ?? null,
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Document request created successfully",
      );
    } catch (error) {
      logger.error("Failed to create document request:", error);
      next(error);
    }
  }

  async listDocumentRequests(req: any, res: any, next: NextFunction) {
    try {
      const documentId = Number(
        req.query?.documentId ?? req.query?.primaryDocumentId,
      );
      if (!Number.isInteger(documentId) || documentId <= 0) {
        throw new APIError(
          "documentId query parameter is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const rows =
        await apDocumentRequestService.listRequestsForDocument(documentId);
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        rows,
        "Document requests retrieved successfully",
      );
    } catch (error) {
      logger.error("Failed to list document requests:", error);
      next(error);
    }
  }

  async cancelDocumentRequest(req: any, res: any, next: NextFunction) {
    try {
      const requestId = Number(req.params?.id);
      if (!Number.isInteger(requestId) || requestId <= 0) {
        throw new APIError(
          "A valid request id is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const result = await apDocumentRequestService.cancelRequest(requestId);
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Document request cancelled",
      );
    } catch (error) {
      logger.error("Failed to cancel document request:", error);
      next(error);
    }
  }

  async sendDocumentRequest(req: any, res: any, next: NextFunction) {
    try {
      const requestId = Number(req.params?.id);
      if (!Number.isInteger(requestId) || requestId <= 0) {
        throw new APIError(
          "A valid request id is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const result = await apDocumentRequestService.sendRequestEmail({
        requestId,
        to: req.body?.to ?? req.body?.vendorEmail ?? null,
        body: req.body?.body ?? null,
      });
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Document request email sent to vendor",
      );
    } catch (error) {
      logger.error("Failed to send document request email:", error);
      next(error);
    }
  }
}

export default new ApInvoiceOcrController();
