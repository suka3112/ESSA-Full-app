import axios from "axios";
import FormData from "form-data";
import apInvoiceDocumentService, {
  DuplicateInvoiceError,
} from "./apInvoiceDocument.service";
import apSesDocumentService from "./apSesDocument.service";
import extractionPromptConfigService from "./extractionPromptConfig.service";
import {
  assembleExtractionPromptMap,
  assembleInvoiceTypeCatalog,
  buildMissingMandatoryExtractPayload,
  findMissingMandatoryDocuments,
} from "./invoiceTypeCatalog.service";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import {
  isZipMimeOrName,
  resolveUploadToSinglePdf,
} from "./apZipPdfExtract.service";
import {
  getOcrEngineMode,
  runInProcessExtract,
  type OcrExtractHttpLikeResponse,
} from "./ocrEngine.adapter";
import { EssaInvoice } from "../models/essaInvoice";

export type ExtractSourceChannel = "UPLOAD" | "EMAIL" | "SHAREPOINT";

/** Soft-gate channels: missing mandatory docs still persist for review. */
const isReviewPersistChannel = (channel: ExtractSourceChannel): boolean =>
  channel === "EMAIL" || channel === "SHAREPOINT";

const INVOICE_TYPE_LABEL_TO_CODE: Record<string, string> = {
  Manpower: "MANPOWER_SERVICES",
  "Civil Contractor": "CIVIL_CONTRACTOR",
  "Material Import": "MATERIAL_IMPORT",
  "Camp Service and Catering": "CAMP_SERVICE_AND_CATERING",
  "Non-PO": "NON_PO",
};

/** Reuse the existing invoice's type so DOCREQ replies classify BA / tax invoice correctly. */
const pinMergeInvoiceWorkflow = async (
  primaryDocumentId: number,
): Promise<string | null> => {
  const row = await EssaInvoice.findOne({
    where: { DocumentId: primaryDocumentId, IsDeleted: false },
    attributes: ["InvoiceType", "InvoiceWorkflow"],
  });
  if (!row) return null;
  const fromLabel = INVOICE_TYPE_LABEL_TO_CODE[String(row.InvoiceType || "").trim()];
  if (fromLabel) return fromLabel;
  const workflow = String(row.InvoiceWorkflow || "").trim().toUpperCase();
  if (workflow === "NON_PO") return "NON_PO";
  if (workflow === "PO") return "MANPOWER_SERVICES";
  return null;
};

export type ExtractEmailMeta = {
  fromAddress?: string | null;
  subject?: string | null;
  messageId?: string | null;
  receivedAt?: string | null;
  vendorId?: number | null;
  vendorMatched?: boolean;
};

export type ExtractAndPersistInput = {
  file: Express.Multer.File;
  invoiceWorkflow?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  uploadedBy?: number | null;
  traceId?: string;
  sourceChannel?: ExtractSourceChannel;
  emailMeta?: ExtractEmailMeta;
  /** Email worker waits; UI upload keeps background persist. */
  awaitPersist?: boolean;
  /**
   * DOCREQ path: merge OCR sections into this existing primary instead of
   * creating a new invoice package.
   */
  mergeIntoPrimaryDocumentId?: number;
  requestedDocumentTypes?: string[];
  replacementTypes?: string[];
  /** Why this extract started (new inbound vs retry). Logged only. */
  extractReason?: string | null;
  inboundRef?: string | null;
};

export type ExtractAndPersistResult = {
  httpStatus: number;
  body: Record<string, unknown>;
  primaryDocumentId: number | null;
  success: boolean;
  status?: string | null;
  /** DOCREQ: document ids keyed by type that were merged */
  receivedByType?: Record<string, number>;
  mergedDocumentTypes?: string[];
};

const OCR_EXTRACT_URL =
  process.env.AP_OCR_EXTRACT_URL ?? "http://localhost:8181/extract";

const OCR_EXTRACT_TIMEOUT_MS = parseInt(
  process.env.AP_OCR_EXTRACT_TIMEOUT_MS || String(30 * 60 * 1000),
  10,
);

const OCR_HEARTBEAT_MS = parseInt(
  process.env.AP_OCR_HEARTBEAT_MS || "30000",
  10,
);

/** Default: in-process vendored engine. Set AP_OCR_ENGINE=http to use remote ocr-demo. */
const OCR_ENGINE_MODE = getOcrEngineMode();

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

const buildTraceId = (file?: Express.Multer.File, hint?: string): string => {
  if (hint && String(hint).trim()) return String(hint).trim();
  const safeName = String(file?.originalname || "upload")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 40);
  return `be-${Date.now().toString(36)}-${safeName}`;
};

class ApInvoiceExtractService {
  async extractAndPersist(
    input: ExtractAndPersistInput,
  ): Promise<ExtractAndPersistResult> {
    const requestStartedAt = Date.now();
    let file = input.file;
    const traceId = buildTraceId(file, input.traceId);
    const sourceChannel = input.sourceChannel || "UPLOAD";
    const body = input.body || {};
    const query = input.query || {};

    if (!file) {
      throw new APIError(
        "Invoice document is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    if (isZipMimeOrName(file.mimetype, file.originalname)) {
      try {
        const resolved = await resolveUploadToSinglePdf(file);
        file = {
          ...file,
          buffer: resolved.buffer,
          originalname: resolved.fileName,
          mimetype: resolved.mimeType,
          size: resolved.buffer.length,
        };
      } catch (zipError) {
        const message =
          zipError instanceof Error ? zipError.message : String(zipError);
        throw new APIError(message, StatusCodeEnum.HTTP_BAD_REQUEST);
      }
    }

    let invoiceWorkflow =
      String(
        input.invoiceWorkflow ?? body.invoiceWorkflow ?? query.invoiceWorkflow ?? "AUTO",
      )
        .trim()
        .toUpperCase() || "AUTO";

    const extractReason = String(input.extractReason || "upload").trim() || "upload";
    const inboundRef = input.inboundRef || null;
    const mergeInto = Number(input.mergeIntoPrimaryDocumentId);
    const createsNewInvoice =
      !Number.isInteger(mergeInto) || mergeInto <= 0;
    // DOCREQ merge and mailbox/SharePoint intake: vendor replies often only
    // contain the requested supporting docs (Tax Invoice, Berita Acara), not a
    // full Invoice + PO bundle. Skip the catalog hard-stop so OCR still extracts.
    const skipMandatoryDocuments =
      !createsNewInvoice || isReviewPersistChannel(sourceChannel);

    if (
      !createsNewInvoice &&
      (invoiceWorkflow === "AUTO" || invoiceWorkflow === "DOCREQ")
    ) {
      const pinned = await pinMergeInvoiceWorkflow(mergeInto);
      if (pinned) {
        invoiceWorkflow = pinned;
        logger.info(
          `[OCR][${traceId}] DOCREQ merge pinned invoice type ${pinned} from existing invoice ${mergeInto}`,
        );
      }
    }

    logger.info(
      `[OCR] LIVE_EXTRACT starting — this is a real OCR run (not a skip). ` +
        `channel=${sourceChannel} reason=${extractReason}` +
        `${inboundRef ? ` inbound=${inboundRef}` : ""} ` +
        `file=${file.originalname} bytes=${file.size} workflow=${invoiceWorkflow} ` +
        `persist=${createsNewInvoice ? "NEW_INVOICE" : `MERGE_INTO_${mergeInto}`}`,
    );

    logExtractPhase(traceId, "REQUEST_RECEIVED", requestStartedAt, {
      fileName: file.originalname,
      sizeBytes: file.size,
      ocrEngine: OCR_ENGINE_MODE,
      ocrUrl: OCR_ENGINE_MODE === "http" ? OCR_EXTRACT_URL : "inprocess",
      sourceChannel,
      invoiceWorkflow,
      extractReason,
      inboundRef,
      persistMode: createsNewInvoice ? "new_invoice" : "merge",
      mergeIntoPrimaryDocumentId: createsNewInvoice ? null : mergeInto,
      skipMandatoryDocuments,
      requestedDocumentTypes: input.requestedDocumentTypes || [],
      bodyKeys: Object.keys(body),
    });

    const catalog = await assembleInvoiceTypeCatalog();
    const extractionPrompts = await assembleExtractionPromptMap();

    const extractionPromptFromClient = String(body.extractionPrompt ?? "").trim();
    const extractionPromptPoFromClient = String(
      body.extractionPromptPo ?? "",
    ).trim();

    let extractionPrompt =
      extractionPromptFromClient || extractionPrompts.NON_PO || "";
    let extractionPromptPo =
      extractionPromptPoFromClient ||
      extractionPrompts.MANPOWER_SERVICES ||
      "";

    if (invoiceWorkflow === "NON_PO" && !extractionPrompt) {
      logger.warn(
        `[OCR][${traceId}] NON_PO override but Non-PO Prompt Builder template is missing — OCR engine will fall back to schema/hints`,
      );
    }
    if (
      (invoiceWorkflow === "PO" || invoiceWorkflow === "MANPOWER_SERVICES") &&
      !extractionPromptPo
    ) {
      logger.warn(
        `[OCR][${traceId}] PO/Manpower override but Manpower Prompt Builder template is missing — OCR engine will fall back to schema/hints`,
      );
    }

    if (extractionPrompt) {
      logExtractPhase(traceId, "PROMPT_BUILDER_NON_PO_CANDIDATE", requestStartedAt, {
        invoiceWorkflow,
        promptChars: extractionPrompt.length,
        promptSource: extractionPromptFromClient
          ? "client_form_body"
          : "AP_EXTRACTION_PROMPT_TEMPLATE:NON_PO",
        promptPreview: extractionPrompt.slice(0, 400),
      });
    }

    if (extractionPromptPo) {
      logExtractPhase(
        traceId,
        "PROMPT_BUILDER_PO_MANPOWER_CANDIDATE",
        requestStartedAt,
        {
          invoiceWorkflow,
          promptChars: extractionPromptPo.length,
          promptSource: extractionPromptPoFromClient
            ? "client_form_body"
            : "AP_EXTRACTION_PROMPT_TEMPLATE:MANPOWER_SERVICES",
          promptPreview: extractionPromptPo.slice(0, 400),
        },
      );
    }

    logExtractPhase(traceId, "INVOICE_TYPE_CATALOG_ATTACHED", requestStartedAt, {
      invoiceWorkflow,
      catalogTypeCount: catalog.invoiceTypes.length,
      catalogTypeIds: catalog.invoiceTypes.map((type) => type.invoiceTypeId),
      mandatoryByType: Object.fromEntries(
        catalog.invoiceTypes.map((type) => [
          type.invoiceTypeId,
          type.documents
            .filter((doc) => doc.mandatory)
            .map((doc) => doc.categoryLabel),
        ]),
      ),
      promptMapKeys: Object.keys(extractionPrompts),
      promptMapChars: Object.fromEntries(
        Object.entries(extractionPrompts).map(([key, text]) => [key, text.length]),
      ),
    });

    const validationMode = query.validate ?? body.validate;

    logExtractPhase(traceId, "OCR_PROXY_START", requestStartedAt, {
      invoiceWorkflow,
      ocrEngine: OCR_ENGINE_MODE,
      catalogTypeCount: catalog.invoiceTypes.length,
      promptMapKeys: Object.keys(extractionPrompts),
      nonPoPromptCandidateAttached: Boolean(extractionPrompt),
      poManpowerPromptCandidateAttached: Boolean(extractionPromptPo),
      extractionPromptChars: extractionPrompt.length,
      extractionPromptPoChars: extractionPromptPo.length,
      sourceChannel,
      extractReason,
      inboundRef,
      persistMode: createsNewInvoice ? "new_invoice" : "merge",
      skipMandatoryDocuments,
    });

    const ocrStartedAt = Date.now();
    const heartbeat = setInterval(() => {
      logExtractPhase(traceId, "OCR_PROXY_WAITING", requestStartedAt, {
        waitingMs: Date.now() - ocrStartedAt,
        ocrEngine: OCR_ENGINE_MODE,
      });
    }, OCR_HEARTBEAT_MS);

    let response: OcrExtractHttpLikeResponse;
    try {
      if (OCR_ENGINE_MODE === "inprocess") {
        response = await runInProcessExtract({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          options: {
            validationMode,
            traceId,
            extractionPrompt: extractionPrompt || undefined,
            extractionPromptPo: extractionPromptPo || undefined,
            extractionPrompts,
            invoiceTypeCatalog: catalog,
            invoiceWorkflow,
            skipMandatoryDocuments,
            requestedDocumentTypes: input.requestedDocumentTypes || [],
          },
        });
      } else {
        const form = new FormData();
        form.append("file", file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });

        for (const [key, value] of Object.entries(body)) {
          if (
            key === "extractionPrompt" ||
            key === "extractionPromptPo" ||
            key === "extractionPrompts" ||
            key === "invoiceTypeCatalog"
          ) {
            continue;
          }
          if (value !== undefined && value !== null) {
            form.append(key, String(value));
          }
        }

        form.append("invoiceTypeCatalog", JSON.stringify(catalog));
        form.append("extractionPrompts", JSON.stringify(extractionPrompts));
        if (extractionPrompt) form.append("extractionPrompt", extractionPrompt);
        if (extractionPromptPo) {
          form.append("extractionPromptPo", extractionPromptPo);
        }
        if (skipMandatoryDocuments) {
          form.append("skipMandatoryDocuments", "true");
        }
        if ((input.requestedDocumentTypes || []).length) {
          form.append(
            "requestedDocumentTypes",
            JSON.stringify(input.requestedDocumentTypes),
          );
        }
        if (
          !body.invoiceWorkflow &&
          !query.invoiceWorkflow &&
          !input.invoiceWorkflow
        ) {
          form.append("invoiceWorkflow", "AUTO");
        } else if (input.invoiceWorkflow && !body.invoiceWorkflow) {
          form.append("invoiceWorkflow", invoiceWorkflow);
        }

        const axiosResponse = await axios.post(OCR_EXTRACT_URL, form, {
          headers: {
            ...form.getHeaders(),
            "X-Extract-Trace-Id": traceId,
          },
          params: query,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: OCR_EXTRACT_TIMEOUT_MS,
          validateStatus: () => true,
        });
        response = {
          status: axiosResponse.status,
          data: axiosResponse.data,
        };
      }
    } catch (error) {
      clearInterval(heartbeat);
      if (axios.isAxiosError(error)) {
        logger.error(
          `[OCR][${traceId}] Remote extract call failed: ${error.message}`,
          {
            code: error.code ?? null,
            httpStatus: error.response?.status ?? null,
            responseData:
              error.response?.data && typeof error.response.data === "object"
                ? error.response.data
                : error.response?.data != null
                  ? String(error.response.data).slice(0, 500)
                  : null,
            ocrUrl: OCR_EXTRACT_URL,
          },
        );
        if (error.response) {
          return {
            httpStatus: error.response.status,
            body: {
              ...(typeof error.response.data === "object" && error.response.data
                ? error.response.data
                : {}),
              extractionTrace: { traceId, failed: true },
            },
            primaryDocumentId: null,
            success: false,
          };
        }
        // Soft failure — email/SharePoint intake must not crash the process.
        return {
          httpStatus: StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
          body: {
            message: `OCR extraction service is unavailable (${OCR_EXTRACT_URL}). Is ocr-demo running?`,
            extractionTrace: { traceId, failed: true },
          },
          primaryDocumentId: null,
          success: false,
          status: "ocr_unavailable",
        };
      }
      logger.error(
        `[OCR][${traceId}] Extract call failed`,
        {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : null,
          ocrEngine: OCR_ENGINE_MODE,
        },
      );
      return {
        httpStatus: StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
        body: {
          message:
            error instanceof Error
              ? error.message
              : "OCR extraction failed unexpectedly",
          extractionTrace: { traceId, failed: true },
        },
        primaryDocumentId: null,
        success: false,
        status: "ocr_failed",
      };
    } finally {
      clearInterval(heartbeat);
    }

    logExtractPhase(traceId, "OCR_PROXY_DONE", requestStartedAt, {
      httpStatus: response.status,
      ocrEngine: OCR_ENGINE_MODE,
      ocrMs: Date.now() - ocrStartedAt,
      documentCount: Array.isArray(response.data?.data?.documents)
        ? (response.data.data.documents as unknown[]).length
        : 0,
      ocrTiming:
        (response.data?.data?.meta as Record<string, unknown> | undefined)
          ?.timing ?? null,
      resolvedInvoiceWorkflow:
        (response.data?.data?.meta as Record<string, unknown> | undefined)
          ?.invoiceWorkflow ?? null,
      resolvedInvoiceTypeId:
        (response.data?.data?.meta as Record<string, unknown> | undefined)
          ?.invoiceTypeId ?? null,
    });

    const resolvedWorkflow =
      response.data?.data?.meta?.invoiceWorkflow ?? invoiceWorkflow;

    const extractionTrace = {
      traceId,
      phases: {
        requestReceivedMs: Date.now() - requestStartedAt,
        ocrProxyMs: Date.now() - ocrStartedAt,
      },
      ocrTiming: response.data?.data?.meta?.timing ?? null,
      invoiceTypeId: response.data?.data?.meta?.invoiceTypeId ?? null,
      invoiceTypeSource: response.data?.data?.meta?.invoiceTypeSource ?? null,
      invoiceTypeConfidence:
        response.data?.data?.meta?.invoiceTypeConfidence ?? null,
      invoiceWorkflow: resolvedWorkflow || null,
      invoiceWorkflowRequested: invoiceWorkflow || null,
      invoiceWorkflowSource:
        response.data?.data?.meta?.invoiceWorkflowSource ?? null,
      invoiceWorkflowReasons:
        response.data?.data?.meta?.invoiceWorkflowReasons ?? null,
      promptBuilderMode: response.data?.data?.meta?.promptBuilderMode ?? false,
      promptSourceType: response.data?.data?.meta?.promptSourceType ?? null,
      usedOcrDemoExtractionHints:
        response.data?.data?.meta?.usedOcrDemoExtractionHints ?? null,
      extractionPromptChars:
        response.data?.data?.meta?.extractionPromptChars ?? 0,
      extractionPromptText:
        response.data?.data?.meta?.extractionPromptText ?? null,
      sourceChannel,
    };

    if (response.data?.data?.status === "needs_invoice_type_review") {
      // Email/SharePoint already set workflow; still allow persist so finance can review
      if (!isReviewPersistChannel(sourceChannel)) {
        return {
          httpStatus: response.status,
          body: {
            ...response.data,
            extractionTrace: {
              ...extractionTrace,
              needsInvoiceTypeReview: true,
            },
          },
          primaryDocumentId: null,
          success: false,
          status: "needs_invoice_type_review",
        };
      }
      logger.warn(
        `[OCR][${traceId}] ${sourceChannel} intake: needs_invoice_type_review — continuing to persist for review`,
      );
    }

    if (response.data?.data?.status === "missing_mandatory_documents") {
      if (!skipMandatoryDocuments) {
        return {
          httpStatus: response.status,
          body: {
            ...response.data,
            extractionTrace: {
              ...extractionTrace,
              missingMandatoryDocuments: true,
            },
          },
          primaryDocumentId: null,
          success: false,
          status: "missing_mandatory_documents",
        };
      }
      logger.warn(
        `[OCR][${traceId}] ${sourceChannel} intake: ocr-demo reported missing_mandatory_documents — continuing to persist for review`,
      );
    }

    const ocrPayload = response.data?.data as Record<string, unknown> | undefined;
    const ocrMeta =
      ocrPayload?.meta && typeof ocrPayload.meta === "object"
        ? (ocrPayload.meta as Record<string, unknown>)
        : {};
    const resolvedTypeId = String(
      ocrMeta.invoiceTypeId || ocrMeta.invoiceWorkflow || invoiceWorkflow || "",
    )
      .trim()
      .toUpperCase();
    const classificationSource =
      ocrPayload?.classification &&
      typeof ocrPayload.classification === "object"
        ? (ocrPayload.classification as Record<string, unknown>)
        : {};
    const catalogMissing = findMissingMandatoryDocuments(catalog, resolvedTypeId, {
      ...classificationSource,
      documents: Array.isArray(ocrPayload?.documents)
        ? ocrPayload.documents
        : classificationSource.documents,
    });
    if (catalogMissing.length) {
      const labels = catalogMissing.map(
        (doc) => doc.categoryLabel || doc.categoryId,
      );
      // UI upload: hard-stop so the operator can attach the package.
      // Email/SharePoint + DOCREQ merge: supporting-doc replies omit Invoice —
      // continue so Tax Invoice / Berita Acara can still be extracted and merged.
      if (!skipMandatoryDocuments) {
        return {
          httpStatus: 200,
          body: {
            status: 200,
            message: `Extraction stopped — required documents were not found: ${labels.join(", ")}.`,
            extractionTrace: {
              ...extractionTrace,
              missingMandatoryDocuments: true,
            },
            data: buildMissingMandatoryExtractPayload(ocrPayload, catalogMissing),
          },
          primaryDocumentId: null,
          success: false,
          status: "missing_mandatory_documents",
        };
      }
      logger.warn(
        `[OCR][${traceId}] ${sourceChannel} intake: missing mandatory [${labels.join(", ")}] — ${
          createsNewInvoice
            ? "persisting incomplete package for review"
            : "continuing merge of requested supporting documents"
        }`,
      );
      (extractionTrace as Record<string, unknown>).missingMandatoryDocuments =
        true;
      (extractionTrace as Record<string, unknown>).missingMandatoryLabels =
        labels;
    }

    if (
      response.status >= 200 &&
      response.status < 300 &&
      response.data?.data &&
      Array.isArray(response.data.data.documents) &&
      response.data.data.documents.length > 0
    ) {
      const ocrData = response.data.data as Record<string, unknown>;
      const invoiceNumber =
        apInvoiceDocumentService.extractInvoiceNumberFromBatch(ocrData);
      logExtractPhase(traceId, "DUPLICATE_CHECK_SKIPPED", requestStartedAt, {
        invoiceNumber: invoiceNumber ?? null,
      });

      const enrichedOcrData =
        await apSesDocumentService.enrichExtractResponse(ocrData);

      const enrichedMeta =
        enrichedOcrData.meta && typeof enrichedOcrData.meta === "object"
          ? (enrichedOcrData.meta as Record<string, unknown>)
          : {};
      const resolvedTypeId = String(enrichedMeta.invoiceTypeId || "")
        .trim()
        .toUpperCase();
      const workflowToken = String(
        enrichedMeta.invoiceWorkflow || resolvedWorkflow || invoiceWorkflow || "",
      ).toUpperCase();
      const hashTypeCode =
        resolvedTypeId || (workflowToken === "NON_PO" ? "NON_PO" : "MANPOWER_SERVICES");
      const { byOcrType: configHashesByOcrType } =
        await extractionPromptConfigService.getDocumentConfigHashesByInvoiceTypeCode(
          hashTypeCode,
        );

      const docsWithHashes = Array.isArray(enrichedOcrData.documents)
        ? (enrichedOcrData.documents as Array<Record<string, unknown>>).map(
            (doc) => {
              const docType = String(
                doc.documentType || doc.type || doc.schemaId || "",
              )
                .trim()
                .toLowerCase();
              const configHash = configHashesByOcrType[docType] || null;
              return configHash ? { ...doc, configHash } : doc;
            },
          )
        : enrichedOcrData.documents;

      const stampedOcrData = {
        ...enrichedOcrData,
        documents: docsWithHashes,
      };

      const persistOptions = {
        uploadedBy: input.uploadedBy ?? undefined,
        traceId,
        configHashesByOcrType,
        sourceChannel,
        emailMeta: input.emailMeta,
        storedFilePath: null as string | null,
      };

      const mergePrimaryId = Number(input.mergeIntoPrimaryDocumentId);
      const isMergePath =
        Number.isInteger(mergePrimaryId) && mergePrimaryId > 0;

      let primaryDocumentId: number | null = null;
      let receivedByType: Record<string, number> | undefined;
      let mergedDocumentTypes: string[] | undefined;

      const runPersist = async () => {
        const persistStartedAt = Date.now();
        if (isMergePath) {
          logExtractPhase(traceId, "MERGE_START", requestStartedAt, {
            mergeIntoPrimaryDocumentId: mergePrimaryId,
            requestedDocumentTypes: input.requestedDocumentTypes || [],
          });
          try {
            const merged =
              await apInvoiceDocumentService.mergeExtractIntoExistingBatch(
                file,
                stampedOcrData,
                {
                  primaryDocumentId: mergePrimaryId,
                  requestedDocumentTypes: input.requestedDocumentTypes || [],
                  replacementTypes: input.replacementTypes || [],
                  uploadedBy: input.uploadedBy ?? null,
                  sourceChannel,
                  emailMeta: input.emailMeta,
                  storedFilePath: null,
                  traceId,
                },
              );
            primaryDocumentId = merged.primaryDocumentId;
            receivedByType = merged.receivedByType;
            mergedDocumentTypes = merged.mergedDocumentTypes;
            logExtractPhase(traceId, "MERGE_DONE", requestStartedAt, {
              persistMs: Date.now() - persistStartedAt,
              primaryDocumentId,
              mergedDocumentTypes,
            });
            return {
              ...stampedOcrData,
              primaryDocumentId,
              receivedByType,
              mergedDocumentTypes,
              snapshot: merged.snapshot,
            };
          } catch (mergeError) {
            logger.error(
              `[OCR][${traceId}] Merge failed`,
              mergeError instanceof Error
                ? {
                    name: mergeError.name,
                    message: mergeError.message,
                    stack: mergeError.stack,
                  }
                : mergeError,
            );
            return {
              __persistError: "exception",
              message:
                mergeError instanceof Error
                  ? mergeError.message
                  : String(mergeError),
            } as Record<string, unknown>;
          }
        }

        logExtractPhase(traceId, "PERSIST_START", requestStartedAt, {
          persistMode: "new_invoice",
          sourceChannel,
          extractReason,
          inboundRef,
          note: "Creates a new invoice row. Invoice-number duplicate check is disabled.",
        });
        try {
          const enriched = await apInvoiceDocumentService.persistExtractResponse(
            file,
            stampedOcrData,
            persistOptions,
          );
          primaryDocumentId =
            typeof enriched.primaryDocumentId === "number"
              ? enriched.primaryDocumentId
              : null;
          logExtractPhase(traceId, "PERSIST_DONE", requestStartedAt, {
            persistMs: Date.now() - persistStartedAt,
            primaryDocumentId,
          });
          return enriched;
        } catch (persistError) {
          if (persistError instanceof DuplicateInvoiceError) {
            logExtractPhase(traceId, "PERSIST_DUPLICATE", requestStartedAt, {
              invoiceNumber: persistError.invoiceNumber,
            });
            return {
              __persistError: "duplicate",
              invoiceNumber: persistError.invoiceNumber,
              message: persistError.message,
            } as Record<string, unknown>;
          }
          logger.error(
            `[OCR][${traceId}] Persist failed`,
            persistError instanceof Error
              ? {
                  name: persistError.name,
                  message: persistError.message,
                  stack: persistError.stack,
                }
              : persistError,
          );
          return {
            __persistError: "exception",
            message:
              persistError instanceof Error
                ? persistError.message
                : String(persistError),
          } as Record<string, unknown>;
        }
      };

      if (input.awaitPersist) {
        const persistOutcome = await runPersist();
        const persistErrorKind = String(
          (persistOutcome as Record<string, unknown>)?.__persistError || "",
        );
        if (persistErrorKind === "duplicate") {
          const inv = String(
            (persistOutcome as Record<string, unknown>).invoiceNumber || "",
          );
          const message =
            String((persistOutcome as Record<string, unknown>).message || "") ||
            `Invoice ${inv || "(unknown)"} already exists and cannot be processed.`;
          logExtractPhase(traceId, "EXTRACT_FAILED", requestStartedAt, {
            reason: "duplicate_invoice",
            invoiceNumber: inv || null,
            sourceChannel,
            fileName: file.originalname,
          });
          return {
            httpStatus: response.status,
            body: {
              ...response.data,
              extractionTrace,
              message,
            },
            primaryDocumentId: null,
            success: false,
            status: "duplicate_invoice",
          };
        }
        if (persistErrorKind === "exception") {
          const message =
            String((persistOutcome as Record<string, unknown>).message || "") ||
            "OCR completed but saving the invoice to the database failed.";
          logExtractPhase(traceId, "EXTRACT_FAILED", requestStartedAt, {
            reason: "persist_exception",
            sourceChannel,
            fileName: file.originalname,
            message,
          });
          return {
            httpStatus: response.status,
            body: {
              ...response.data,
              extractionTrace,
              message,
            },
            primaryDocumentId: null,
            success: false,
            status: "persist_failed",
          };
        }
        if (!primaryDocumentId) {
          logExtractPhase(traceId, "EXTRACT_FAILED", requestStartedAt, {
            reason: "persist_no_document_id",
            sourceChannel,
            invoiceWorkflow,
            fileName: file.originalname,
            message:
              "OCR completed but no document id was returned after save.",
          });
          return {
            httpStatus: response.status,
            body: {
              ...response.data,
              extractionTrace,
              message:
                "OCR completed but no document id was returned after save.",
            },
            primaryDocumentId: null,
            success: false,
            status: "persist_failed",
          };
        }
        return {
          httpStatus: response.status,
          body: {
            ...response.data,
            extractionTrace,
            data: {
              ...stampedOcrData,
              persistStatus: "done",
              primaryDocumentId,
              extractionTrace,
              ...(isMergePath
                ? {
                    receivedByType: receivedByType || {},
                    mergedDocumentTypes: mergedDocumentTypes || [],
                    mergeMode: true,
                  }
                : {}),
            },
          },
          primaryDocumentId,
          success: true,
          status: "extracted",
          receivedByType,
          mergedDocumentTypes,
        };
      }

      setImmediate(() => {
        void runPersist().catch((): void => undefined);
      });

      logExtractPhase(traceId, "RESPONSE_SENT", requestStartedAt, {
        persistStatus: "pending",
      });

      return {
        httpStatus: response.status,
        body: {
          ...response.data,
          extractionTrace,
          data: {
            ...stampedOcrData,
            persistStatus: "pending",
            extractionTrace,
          },
        },
        primaryDocumentId: null,
        success: true,
        status: "extracted",
      };
    }

    logExtractPhase(traceId, "OCR_NON_SUCCESS_RESPONSE", requestStartedAt, {
      httpStatus: response.status,
      message: response.data?.message ?? null,
      dataStatus: response.data?.data?.status ?? null,
      sourceChannel,
      invoiceWorkflow,
      fileName: file.originalname,
    });
    logger.error(
      `[OCR][${traceId}] EXTRACT_FAILED — OCR service returned non-success`,
      {
        httpStatus: response.status,
        message: response.data?.message ?? null,
        dataStatus: response.data?.data?.status ?? null,
        sourceChannel,
        invoiceWorkflow,
        fileName: file.originalname,
      },
    );

    return {
      httpStatus: response.status,
      body: {
        ...response.data,
        extractionTrace,
      },
      primaryDocumentId: null,
      success: false,
      status: response.data?.data?.status ?? null,
    };
  }
}

export default new ApInvoiceExtractService();
