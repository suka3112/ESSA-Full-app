import { ApInboundSharePoint } from "../models/apInboundSharePoint";
import apInvoiceExtractService from "./apInvoiceExtract.service";
import {
  formatSubjectRejectMessage,
  validateEmailSubject,
  type EmailSubjectValidationResult,
} from "./apEmailSubjectValidation";
import {
  downloadDriveItemContent,
  getSharePointFolderPath,
  isSharePointConfigured,
  isSharePointIntakeEnabled,
  listFolderPdfItems,
  type GraphDriveItem,
} from "./microsoftGraphSharePoint.client";
import { fileInvoicePdfToSharePoint } from "./apSharePointFiling.service";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import {
  extractPdfsFromZip,
  isZipMimeOrName,
} from "./apZipPdfExtract.service";
import { auditInboundExtractFailure } from "./essaInvoiceActions.service";
import {
  auditDuplicateDetected,
  auditReceive,
  auditRejectIntake,
} from "./invoiceProcessAudit.service";
import { mintCorrelationId } from "./auditEvent.service";

export type InboundSharePointStatus =
  | "QUEUED"
  | "PENDING"
  | "PROCESSED"
  | "FAILED"
  | "INVALID_NAME"
  | "IGNORED"
  | "NO_DOCUMENT";

const TERMINAL_SKIP_STATUSES = new Set([
  "PROCESSED",
  "IGNORED",
  "NO_DOCUMENT",
]);

const STALE_PENDING_MS = Math.max(
  15 * 60 * 1000,
  parseInt(process.env.SHAREPOINT_INTAKE_STALE_PENDING_MS || String(15 * 60 * 1000), 10) ||
    15 * 60 * 1000,
);

const STALE_PENDING_MESSAGE =
  "Processing interrupted or timed out (stuck in Pending). Poll SharePoint to retry.";

const bumpCount = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] || 0) + 1;
};

const isDuplicateFailure = (
  status?: string | null,
  error?: string | null,
): boolean =>
  String(status || "").toUpperCase() === "FAILED" &&
  /already exists|duplicate invoice/i.test(String(error || ""));

const describeQueueReason = (priorStatus: string | null): string => {
  if (!priorStatus) return "new";
  const status = priorStatus.toUpperCase();
  if (status === "FAILED") return "retry_failed";
  if (status === "PENDING") return "retry_interrupted";
  if (status === "QUEUED") return "retry_queued";
  return `retry_${status.toLowerCase()}`;
};

const subjectWorkflow = (
  parsed: Extract<EmailSubjectValidationResult, { valid: true }>,
): string => {
  if (parsed.type === "DOCREQ") return "AUTO";
  return parsed.invoiceWorkflow;
};

/** File name without extension used as the EAPA subject gate. */
export const fileNameToSubjectCandidate = (fileName: string | null | undefined): string => {
  const raw = String(fileName || "").trim();
  if (!raw) return "";
  return raw.replace(/\.(pdf|zip)$/i, "").trim();
};

const sanitizeSyntheticIdPart = (value: string): string =>
  String(value || "file")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80) || "file";

const buildSyntheticDriveItemId = (
  parentDriveItemId: string,
  pdfIndex: number,
  pdfFileName: string,
): string =>
  `${parentDriveItemId}::pdf::${pdfIndex}::${sanitizeSyntheticIdPart(pdfFileName)}`;

const toMulterFile = (
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Express.Multer.File =>
  ({
    fieldname: "document",
    originalname: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    encoding: "7bit",
    mimetype: mimeType || "application/pdf",
    size: buffer.length,
    buffer,
    destination: "",
    filename: "",
    path: "",
    stream: undefined as any,
  }) as Express.Multer.File;

const ageMsFrom = (value: Date | string | null | undefined): number | null => {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Date.now() - t);
};

const isStalePendingStamp = (
  status: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): boolean => {
  if (String(status || "").toUpperCase() !== "PENDING") return false;
  if (!updatedAt) return false;
  const age = ageMsFrom(updatedAt);
  return age != null && age >= STALE_PENDING_MS;
};

const formatExtractFailureMessage = (extractResult: {
  status?: string | null;
  body?: any;
}): string => {
  const status = String(extractResult.status || "").trim();
  const bodyMessage = String(
    extractResult.body?.message || extractResult.body?.data?.message || "",
  ).trim();
  if (status === "duplicate_invoice" || /already exists/i.test(bodyMessage)) {
    return bodyMessage || "This invoice number already exists in the system (duplicate).";
  }
  if (status === "persist_failed") {
    return bodyMessage || "OCR completed but saving the invoice to the database failed.";
  }
  if (bodyMessage) return bodyMessage;
  if (status) return `OCR extract failed (${status}).`;
  return "OCR extract failed or produced no document";
};

const logSharePointExtractFailure = (
  context: Record<string, unknown>,
  extractResult?: { status?: string | null; body?: any; httpStatus?: number; primaryDocumentId?: number | null } | null,
  error?: unknown,
) => {
  const reason = extractResult
    ? formatExtractFailureMessage(extractResult)
    : error instanceof Error
      ? error.message
      : error
        ? String(error)
        : "unknown";
  logger.error(`[SharePointIntake] EXTRACT_FAILED — ${reason}`, {
    ...context,
    extractStatus: extractResult?.status ?? null,
    httpStatus: extractResult?.httpStatus ?? null,
    primaryDocumentId: extractResult?.primaryDocumentId ?? null,
    ocrMessage: extractResult?.body?.message ?? null,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error
          ? String(error)
          : null,
  });

  void auditInboundExtractFailure({
    reason,
    stage: String(context.stage || "extract"),
    inboundSharePointId:
      context.inboundSharePointId != null ? Number(context.inboundSharePointId) : null,
    fileName: context.fileName != null ? String(context.fileName) : null,
    invoiceWorkflow:
      context.invoiceWorkflow != null ? String(context.invoiceWorkflow) : null,
    primaryDocumentId: extractResult?.primaryDocumentId ?? null,
    source: "SHAREPOINT",
  });
};

class ApSharePointIntakeService {
  /** Prevents overlapping pollFolder runs (cron + UI) from double-extracting. */
  private pollRunning = false;

  private async findByDriveItemId(driveItemId: string) {
    return ApInboundSharePoint.findOne({ where: { DriveItemId: driveItemId } });
  }

  private isActivelyInFlight(row: ApInboundSharePoint): boolean {
    if (String(row.Status || "").toUpperCase() !== "PENDING") return false;
    if (!row.UpdatedAt) return true;
    return !isStalePendingStamp(row.Status, row.UpdatedAt);
  }

  async listInboundSharePoint(options: { status?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (options.status) {
      where.Status = String(options.status).trim().toUpperCase();
    }

    const rows = await ApInboundSharePoint.findAll({
      where,
      order: [
        ["LastModifiedAt", "DESC"],
        ["InboundSharePointId", "DESC"],
      ],
      limit: 200,
    });

    for (const row of rows) {
      const status = String(row.Status || "").toUpperCase();
      if (status === "PENDING" && isStalePendingStamp(status, row.UpdatedAt)) {
        await row.update({
          Status: "FAILED",
          ErrorMessage: STALE_PENDING_MESSAGE,
          UpdatedAt: new Date(),
        });
      }
    }

    return rows.map((row) => {
      const subjectCandidate = fileNameToSubjectCandidate(row.FileName);
      const subjectCheck = validateEmailSubject(subjectCandidate);
      const subjectParse =
        subjectCheck.valid === true
          ? subjectCheck.type === "DOCREQ"
            ? {
                type: "DOCREQ" as const,
                eapaInvoiceId: subjectCheck.eapaInvoiceId,
                requestCode: subjectCheck.requestCode,
                documentType: subjectCheck.documentType,
                vendorName: subjectCheck.vendorName,
                invoiceNumber: subjectCheck.invoiceNumber,
                invoiceWorkflow: subjectCheck.invoiceWorkflow,
                invoiceTypeId: subjectCheck.invoiceTypeId,
              }
            : {
                type: subjectCheck.type,
                category: subjectCheck.category,
                poNumber: subjectCheck.poNumber ?? null,
                vendorName: subjectCheck.vendorName,
                invoiceNumber: subjectCheck.invoiceNumber,
                invoiceWorkflow: subjectCheck.invoiceWorkflow,
                invoiceTypeId: subjectCheck.invoiceTypeId,
              }
          : null;
      const statusUpper = String(row.Status || "").toUpperCase();
      return {
        inboundSharePointId: Number(row.InboundSharePointId),
        driveItemId: row.DriveItemId,
        fileName: row.FileName,
        folderPath: row.FolderPath,
        mimeType: row.MimeType,
        fileSizeBytes: row.FileSizeBytes,
        webUrl: row.WebUrl,
        lastModifiedAt: row.LastModifiedAt?.toISOString?.() || null,
        siteId: row.SiteId,
        driveId: row.DriveId,
        status: row.Status,
        documentId: row.DocumentId,
        errorMessage: row.ErrorMessage,
        createdAt: row.CreatedAt?.toISOString?.() || null,
        updatedAt: row.UpdatedAt?.toISOString?.() || null,
        statusAgeMs: ageMsFrom(row.UpdatedAt || row.CreatedAt),
        stale: isStalePendingStamp(statusUpper, row.UpdatedAt),
        subjectParse,
      };
    });
  }

  async enqueueDriveItem(item: GraphDriveItem): Promise<{
    skipped: boolean;
    reason?: string;
    status?: string;
    shouldProcess: boolean;
    inboundSharePointId?: number;
    priorStatus?: string | null;
    queueReason?: string;
  }> {
    const driveItemId = String(item.id || "").trim();
    if (!driveItemId) {
      return { skipped: true, reason: "missing_id", shouldProcess: false };
    }

    const existing = await this.findByDriveItemId(driveItemId);
    const priorStatus = existing
      ? String(existing.Status || "").toUpperCase()
      : null;

    if (existing?.DocumentId) {
      if (priorStatus !== "PROCESSED") {
        await existing.update({
          Status: "PROCESSED",
          ErrorMessage: null,
          UpdatedAt: new Date(),
        });
      }
      logger.info(
        `[SharePointIntake] SKIP_ALREADY_EXTRACTED inboundSharePointId=${existing.InboundSharePointId} ` +
          `documentId=${existing.DocumentId} file=${existing.FileName} — OCR will not re-run`,
      );
      return {
        skipped: true,
        reason: "already_extracted",
        status: "PROCESSED",
        shouldProcess: false,
        inboundSharePointId: Number(existing.InboundSharePointId),
        priorStatus,
      };
    }
    if (existing && TERMINAL_SKIP_STATUSES.has(String(existing.Status))) {
      return {
        skipped: true,
        reason: "already_handled",
        status: existing.Status,
        shouldProcess: false,
        inboundSharePointId: Number(existing.InboundSharePointId),
        priorStatus,
      };
    }
    if (existing && isDuplicateFailure(existing.Status, existing.ErrorMessage)) {
      logger.info(
        `[SharePointIntake] SKIP_DUPLICATE inboundSharePointId=${existing.InboundSharePointId} ` +
          `file=${existing.FileName} — OCR will not re-run`,
      );
      void auditDuplicateDetected({
        objectId: existing.FileName || `sp-${existing.InboundSharePointId}`,
        source: "SHAREPOINT",
        correlationId: mintCorrelationId(`sp${existing.InboundSharePointId}`),
        reasonRemarks: existing.ErrorMessage || "Duplicate invoice package detected",
        details: {
          inboundSharePointId: Number(existing.InboundSharePointId),
          priorStatus,
        },
      });
      return {
        skipped: true,
        reason: "duplicate_invoice",
        status: existing.Status,
        shouldProcess: false,
        inboundSharePointId: Number(existing.InboundSharePointId),
        priorStatus,
      };
    }
    if (existing && this.isActivelyInFlight(existing)) {
      return {
        skipped: true,
        reason: "in_progress",
        status: existing.Status,
        shouldProcess: false,
        inboundSharePointId: Number(existing.InboundSharePointId),
        priorStatus,
      };
    }

    const fileName = String(item.name || "").trim();
    const subjectCandidate = fileNameToSubjectCandidate(fileName);
    const subjectCheck = validateEmailSubject(subjectCandidate);
    if (subjectCheck.valid === false) {
      logger.info(
        `[SharePointIntake] Skipping file ${fileName}: ${subjectCheck.reason}`,
      );
      if (existing) {
        await existing.update({
          Status: "INVALID_NAME",
          ErrorMessage: formatSubjectRejectMessage(subjectCheck.reason),
          FileName: fileName || existing.FileName,
          UpdatedAt: new Date(),
        });
        void auditRejectIntake({
          objectId: fileName || `sp-${existing.InboundSharePointId}`,
          source: "SHAREPOINT",
          correlationId: mintCorrelationId(`sp${existing.InboundSharePointId}`),
          reasonRemarks: formatSubjectRejectMessage(subjectCheck.reason),
          details: { stage: "invalid_name", reason: subjectCheck.reason },
        });
      }
      // Do not persist INVALID_NAME for every non-matching file in the folder (noise).
      return {
        skipped: true,
        reason: subjectCheck.reason,
        status: "INVALID_NAME",
        shouldProcess: false,
      };
    }

    // Document-request replies are email-only; do not create a new invoice from SP.
    if (subjectCheck.type === "DOCREQ") {
      logger.info(
        `[SharePointIntake] Skipping DOCREQ file ${fileName} (email correlation only)`,
      );
      if (existing) {
        await existing.update({
          Status: "INVALID_NAME",
          ErrorMessage:
            "Document-request ([DOCREQ]) files must be emailed as a reply; SharePoint intake does not create or merge invoices for DOCREQ.",
          FileName: fileName || existing.FileName,
          UpdatedAt: new Date(),
        });
      }
      return {
        skipped: true,
        reason: "docreq_not_supported_on_sharepoint",
        status: "INVALID_NAME",
        shouldProcess: false,
      };
    }

    const folderPath = getSharePointFolderPath();
    const siteId = String(process.env.SHAREPOINT_SITE_ID || "").trim() || null;
    const driveId = String(process.env.SHAREPOINT_DRIVE_ID || "").trim() || null;

    const inbound =
      existing ||
      (await ApInboundSharePoint.create({
        DriveItemId: driveItemId,
        FileName: fileName,
        FolderPath: folderPath,
        MimeType: item.file?.mimeType || "application/pdf",
        FileSizeBytes: item.size ?? null,
        WebUrl: item.webUrl || null,
        LastModifiedAt: item.lastModifiedDateTime
          ? new Date(item.lastModifiedDateTime)
          : null,
        SiteId: siteId,
        DriveId: driveId,
        Status: "QUEUED",
      }));

    if (existing) {
      await inbound.update({
        FileName: fileName || inbound.FileName,
        FolderPath: folderPath,
        MimeType: item.file?.mimeType || inbound.MimeType,
        FileSizeBytes: item.size ?? inbound.FileSizeBytes,
        WebUrl: item.webUrl || inbound.WebUrl,
        LastModifiedAt: item.lastModifiedDateTime
          ? new Date(item.lastModifiedDateTime)
          : inbound.LastModifiedAt,
        Status: "QUEUED",
        ErrorMessage: null,
        UpdatedAt: new Date(),
      });
    }

    return {
      skipped: false,
      status: "QUEUED",
      shouldProcess: true,
      inboundSharePointId: Number(inbound.InboundSharePointId),
      priorStatus,
      queueReason: describeQueueReason(priorStatus),
    };
  }

  async processDriveItem(item: GraphDriveItem) {
    const driveItemId = String(item.id || "").trim();
    const inbound = await this.findByDriveItemId(driveItemId);
    if (!inbound) {
      return { skipped: true, reason: "not_enqueued" };
    }
    if (inbound.DocumentId) {
      if (String(inbound.Status || "").toUpperCase() !== "PROCESSED") {
        await inbound.update({
          Status: "PROCESSED",
          ErrorMessage: null,
          UpdatedAt: new Date(),
        });
      }
      logger.info(
        `[SharePointIntake] SKIP_ALREADY_EXTRACTED inboundSharePointId=${inbound.InboundSharePointId} ` +
          `documentId=${inbound.DocumentId} — OCR will not re-run`,
      );
      return {
        skipped: true,
        reason: "already_extracted",
        status: "PROCESSED",
        inboundSharePointId: Number(inbound.InboundSharePointId),
        documentId: inbound.DocumentId,
      };
    }
    if (TERMINAL_SKIP_STATUSES.has(String(inbound.Status))) {
      logger.info(
        `[SharePointIntake] SKIP_ALREADY_HANDLED inboundSharePointId=${inbound.InboundSharePointId} status=${inbound.Status} — OCR will not re-run`,
      );
      return { skipped: true, reason: "already_handled", status: inbound.Status };
    }
    if (isDuplicateFailure(inbound.Status, inbound.ErrorMessage)) {
      logger.info(
        `[SharePointIntake] SKIP_DUPLICATE inboundSharePointId=${inbound.InboundSharePointId} — OCR will not re-run`,
      );
      return { skipped: true, reason: "duplicate_invoice", status: inbound.Status };
    }

    const extractReason = describeQueueReason(String(inbound.Status || "QUEUED"));

    const archiveFileName = String(item.name || inbound.FileName || "invoice.pdf");
    const subjectCandidate = fileNameToSubjectCandidate(archiveFileName);
    const subjectCheck = validateEmailSubject(subjectCandidate);
    if (subjectCheck.valid === false) {
      await inbound.update({
        Status: "INVALID_NAME",
        ErrorMessage: formatSubjectRejectMessage(subjectCheck.reason),
        UpdatedAt: new Date(),
      });
      return {
        skipped: false,
        status: "INVALID_NAME" as InboundSharePointStatus,
        inboundSharePointId: Number(inbound.InboundSharePointId),
      };
    }

    if (subjectCheck.type === "DOCREQ") {
      await inbound.update({
        Status: "INVALID_NAME",
        ErrorMessage:
          "Document-request ([DOCREQ]) files must be emailed as a reply; SharePoint intake does not create or merge invoices for DOCREQ.",
        UpdatedAt: new Date(),
      });
      return {
        skipped: false,
        status: "INVALID_NAME" as InboundSharePointStatus,
        inboundSharePointId: Number(inbound.InboundSharePointId),
      };
    }

    const workflow = subjectWorkflow(subjectCheck);

    await inbound.update({
      Status: "PENDING",
      ErrorMessage: null,
      UpdatedAt: new Date(),
    });

    try {
      const buffer = await downloadDriveItemContent(driveItemId);
      if (!buffer?.length) {
        const errorMessage = "SharePoint file content missing or empty";
        logger.error(`[SharePointIntake] EXTRACT_FAILED — ${errorMessage}`, {
          driveItemId,
          fileName: archiveFileName,
        });
        await inbound.update({
          Status: "FAILED",
          ErrorMessage: errorMessage,
          UpdatedAt: new Date(),
        });
        return {
          skipped: false,
          status: "FAILED" as InboundSharePointStatus,
          inboundSharePointId: Number(inbound.InboundSharePointId),
        };
      }

      const isZip = isZipMimeOrName(item.file?.mimeType, archiveFileName);
      let pdfEntries: Array<{ fileName: string; buffer: Buffer }>;

      if (isZip) {
        try {
          const extracted = await extractPdfsFromZip(buffer, archiveFileName);
          if (!extracted.length) {
            const errorMessage =
              "ZIP archive contains no PDF files. Only PDFs inside ZIP archives are processed.";
            await inbound.update({
              Status: "FAILED",
              ErrorMessage: errorMessage,
              UpdatedAt: new Date(),
            });
            return {
              skipped: false,
              status: "FAILED" as InboundSharePointStatus,
              inboundSharePointId: Number(inbound.InboundSharePointId),
            };
          }
          pdfEntries = extracted.map((pdf) => ({
            fileName: pdf.fileName,
            buffer: pdf.buffer,
          }));
        } catch (zipError) {
          const errMsg =
            zipError instanceof Error ? zipError.message : String(zipError);
          await inbound.update({
            Status: "FAILED",
            ErrorMessage: errMsg,
            UpdatedAt: new Date(),
          });
          return {
            skipped: false,
            status: "FAILED" as InboundSharePointStatus,
            inboundSharePointId: Number(inbound.InboundSharePointId),
            error: errMsg,
          };
        }
      } else {
        pdfEntries = [{ fileName: archiveFileName, buffer }];
      }

      let lastResult:
        | {
            skipped: boolean;
            status: InboundSharePointStatus;
            inboundSharePointId: number;
            documentId?: number;
            subjectParse?: EmailSubjectValidationResult;
            error?: string;
          }
        | undefined;
      let processedCount = 0;
      let failedCount = 0;

      for (let pdfIndex = 0; pdfIndex < pdfEntries.length; pdfIndex++) {
        const { fileName: pdfFileName, buffer: pdfBuffer } = pdfEntries[pdfIndex];
        const targetInbound = await this.resolveInboundRowForPdf({
          parentDriveItemId: driveItemId,
          pdfIndex,
          pdfFileName,
          parentInbound: inbound,
          item,
          archiveFileName,
        });

        if (
          pdfIndex > 0 &&
          (TERMINAL_SKIP_STATUSES.has(String(targetInbound.Status)) ||
            targetInbound.DocumentId)
        ) {
          continue;
        }

        const result = await this.processSharePointPdfBuffer({
          inbound: targetInbound,
          pdfBuffer,
          pdfFileName,
          subjectCandidate,
          subjectCheck,
          workflow,
          extractReason,
          driveItemId:
            pdfIndex === 0
              ? driveItemId
              : buildSyntheticDriveItemId(driveItemId, pdfIndex, pdfFileName),
          item,
        });

        lastResult = result;
        if (result.status === "PROCESSED") processedCount += 1;
        if (result.status === "FAILED") failedCount += 1;
      }

      if (pdfEntries.length > 1) {
        logger.info(
          `[SharePointIntake] ZIP expanded driveItemId=${driveItemId} pdfs=${pdfEntries.length} processed=${processedCount} failed=${failedCount}`,
        );
      }

      return (
        lastResult || {
          skipped: false,
          status: "FAILED" as InboundSharePointStatus,
          inboundSharePointId: Number(inbound.InboundSharePointId),
        }
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logSharePointExtractFailure(
        {
          stage: "extract_exception",
          inboundSharePointId: Number(inbound.InboundSharePointId),
          driveItemId,
          fileName: archiveFileName,
        },
        null,
        error,
      );
      await inbound.update({
        Status: "FAILED",
        ErrorMessage: errMsg,
        UpdatedAt: new Date(),
      });
      return {
        skipped: false,
        status: "FAILED" as InboundSharePointStatus,
        inboundSharePointId: Number(inbound.InboundSharePointId),
        error: errMsg,
      };
    }
  }

  private async resolveInboundRowForPdf(params: {
    parentDriveItemId: string;
    pdfIndex: number;
    pdfFileName: string;
    parentInbound: ApInboundSharePoint;
    item: GraphDriveItem;
    archiveFileName: string;
  }): Promise<ApInboundSharePoint> {
    if (params.pdfIndex === 0) {
      return params.parentInbound;
    }

    const syntheticId = buildSyntheticDriveItemId(
      params.parentDriveItemId,
      params.pdfIndex,
      params.pdfFileName,
    );
    const existing = await this.findByDriveItemId(syntheticId);
    if (existing) return existing;

    const folderPath = getSharePointFolderPath();
    const siteId = String(process.env.SHAREPOINT_SITE_ID || "").trim() || null;
    const driveId = String(process.env.SHAREPOINT_DRIVE_ID || "").trim() || null;

    return ApInboundSharePoint.create({
      DriveItemId: syntheticId,
      FileName: params.pdfFileName,
      FolderPath: folderPath,
      MimeType: "application/pdf",
      FileSizeBytes: null,
      WebUrl: params.item.webUrl || params.parentInbound.WebUrl,
      LastModifiedAt: params.item.lastModifiedDateTime
        ? new Date(params.item.lastModifiedDateTime)
        : params.parentInbound.LastModifiedAt,
      SiteId: siteId,
      DriveId: driveId,
      Status: "PENDING",
      ErrorMessage: `Expanded from ZIP: ${params.archiveFileName}`,
      UpdatedAt: new Date(),
    });
  }

  private async processSharePointPdfBuffer(params: {
    inbound: ApInboundSharePoint;
    pdfBuffer: Buffer;
    pdfFileName: string;
    subjectCandidate: string;
    subjectCheck: Extract<EmailSubjectValidationResult, { valid: true }>;
    workflow: string;
    extractReason?: string;
    driveItemId: string;
    item: GraphDriveItem;
  }) {
    const {
      inbound,
      pdfBuffer,
      pdfFileName,
      subjectCandidate,
      subjectCheck,
      workflow,
      extractReason,
      driveItemId,
      item,
    } = params;

    if (inbound.DocumentId) {
      logger.info(
        `[SharePointIntake] SKIP_ALREADY_EXTRACTED inboundSharePointId=${inbound.InboundSharePointId} ` +
          `documentId=${inbound.DocumentId} file=${pdfFileName} — OCR will not re-run`,
      );
      return {
        skipped: true,
        status: "PROCESSED" as InboundSharePointStatus,
        inboundSharePointId: Number(inbound.InboundSharePointId),
        documentId: inbound.DocumentId,
      };
    }
    if (TERMINAL_SKIP_STATUSES.has(String(inbound.Status))) {
      return {
        skipped: true,
        status: inbound.Status as InboundSharePointStatus,
        inboundSharePointId: Number(inbound.InboundSharePointId),
      };
    }

    await inbound.update({
      Status: "PENDING",
      FileName: pdfFileName,
      ErrorMessage: null,
      UpdatedAt: new Date(),
    });

    const file = toMulterFile(pdfBuffer, pdfFileName, "application/pdf");

    logger.info(
      `[SharePointIntake] EXTRACT_START inboundSharePointId=${inbound.InboundSharePointId} file=${file.originalname} workflow=${workflow} bytes=${pdfBuffer.length} reason=${extractReason || "new"} persist=NEW_INVOICE`,
    );

    const invoiceNo =
      subjectCheck && subjectCheck.valid === true
        ? subjectCheck.invoiceNumber
        : null;
    void auditReceive({
      objectId: invoiceNo || file.originalname || `sp-${inbound.InboundSharePointId}`,
      invoiceId: null,
      source: "SHAREPOINT",
      correlationId: mintCorrelationId(`sp${inbound.InboundSharePointId}`),
      reasonRemarks: "Invoice package received from monitored SharePoint folder",
      details: {
        inboundSharePointId: Number(inbound.InboundSharePointId),
        fileName: file.originalname,
        driveItemId,
      },
    });

    const extractResult = await apInvoiceExtractService.extractAndPersist({
      file,
      invoiceWorkflow: workflow,
      uploadedBy: null,
      sourceChannel: "SHAREPOINT",
      awaitPersist: true,
      extractReason: extractReason || "new",
      inboundRef: `sp-${inbound.InboundSharePointId}`,
      emailMeta: {
        subject: subjectCandidate,
        messageId: driveItemId,
        receivedAt: item.lastModifiedDateTime || null,
      },
      traceId: `sp-${inbound.InboundSharePointId}-${driveItemId}`,
    });

    if (!extractResult.success || !extractResult.primaryDocumentId) {
      const errorMessage = formatExtractFailureMessage(extractResult);
      logSharePointExtractFailure(
        {
          stage: "extract_and_persist",
          inboundSharePointId: Number(inbound.InboundSharePointId),
          driveItemId,
          fileName: pdfFileName,
          invoiceWorkflow: workflow,
        },
        extractResult,
      );
      await inbound.update({
        Status: "FAILED",
        ErrorMessage: errorMessage,
        UpdatedAt: new Date(),
      });
      return {
        skipped: false,
        status: "FAILED" as InboundSharePointStatus,
        inboundSharePointId: Number(inbound.InboundSharePointId),
      };
    }

    logger.info(
      `[SharePointIntake] EXTRACT_OK inboundSharePointId=${inbound.InboundSharePointId} documentId=${extractResult.primaryDocumentId}`,
    );

    try {
        await fileInvoicePdfToSharePoint({
          buffer: pdfBuffer,
          fileName: file.originalname,
          contentType: file.mimetype,
          subjectParse: subjectCheck,
          asOfDate: item.lastModifiedDateTime || inbound.LastModifiedAt || new Date(),
          sourceChannel: "SHAREPOINT",
          documentId: extractResult.primaryDocumentId,
          poNumber: subjectCheck.type === "PO" ? subjectCheck.poNumber : null,
          vendorName: subjectCheck.vendorName,
        });
    } catch (fileError) {
      logger.warn(
        `[SharePointIntake] SharePoint filing threw after successful extract (invoice kept)`,
        fileError,
      );
    }

    await inbound.update({
      Status: "PROCESSED",
      DocumentId: extractResult.primaryDocumentId,
      ErrorMessage: null,
      UpdatedAt: new Date(),
    });

    return {
      skipped: false,
      status: "PROCESSED" as InboundSharePointStatus,
      inboundSharePointId: Number(inbound.InboundSharePointId),
      documentId: extractResult.primaryDocumentId,
      subjectParse: subjectCheck,
    };
  }

  async simulateIntake(input: {
    file: Express.Multer.File;
    fileName?: string;
    invoiceWorkflow?: string;
  }) {
    const fileName =
      input.fileName || input.file.originalname || "simulate-invoice.pdf";
    const subjectCandidate = fileNameToSubjectCandidate(fileName);
    const subjectCheck = validateEmailSubject(subjectCandidate);
    if (subjectCheck.valid === false) {
      throw new APIError(
        formatSubjectRejectMessage(subjectCheck.reason),
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    if (subjectCheck.type === "DOCREQ") {
      throw new APIError(
        "Document-request ([DOCREQ]) is email-only. Use email intake / simulate with a DOCREQ subject.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const driveItemId = `simulate-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const workflow =
      input.invoiceWorkflow &&
      String(input.invoiceWorkflow).trim().toUpperCase() !== "AUTO"
        ? String(input.invoiceWorkflow).trim().toUpperCase()
        : subjectWorkflow(subjectCheck);

    const inbound = await ApInboundSharePoint.create({
      DriveItemId: driveItemId,
      FileName: fileName,
      FolderPath: "Simulate",
      MimeType: input.file.mimetype,
      FileSizeBytes: input.file.size,
      Status: "PENDING",
      UpdatedAt: new Date(),
    });

    try {
      const extractResult = await apInvoiceExtractService.extractAndPersist({
        file: input.file,
        invoiceWorkflow: workflow,
        uploadedBy: null,
        sourceChannel: "SHAREPOINT",
        awaitPersist: true,
        extractReason: "simulate",
        inboundRef: `sp-${inbound.InboundSharePointId}`,
        emailMeta: {
          subject: subjectCandidate,
          messageId: driveItemId,
        },
        traceId: `sp-sim-${inbound.InboundSharePointId}`,
      });

      if (!extractResult.success || !extractResult.primaryDocumentId) {
        const errorMessage = formatExtractFailureMessage(extractResult);
        logSharePointExtractFailure(
          {
            stage: "simulate_extract",
            inboundSharePointId: Number(inbound.InboundSharePointId),
            fileName,
            invoiceWorkflow: workflow,
          },
          extractResult,
        );
        await inbound.update({
          Status: "FAILED",
          ErrorMessage: errorMessage,
          UpdatedAt: new Date(),
        });
        return {
          inboundSharePointId: Number(inbound.InboundSharePointId),
          status: "FAILED",
          subjectParse: subjectCheck,
          primaryDocumentId: null,
          extract: extractResult.body,
        };
      }

      await inbound.update({
        Status: "PROCESSED",
        DocumentId: extractResult.primaryDocumentId,
        UpdatedAt: new Date(),
      });

      try {
        await fileInvoicePdfToSharePoint({
          buffer: input.file.buffer,
          fileName,
          contentType: input.file.mimetype,
          subjectParse: subjectCheck,
          asOfDate: new Date(),
          sourceChannel: "SHAREPOINT",
          documentId: extractResult.primaryDocumentId,
          poNumber: subjectCheck.type === "PO" ? subjectCheck.poNumber : null,
          vendorName: subjectCheck.vendorName,
        });
      } catch (fileError) {
        logger.warn(
          `[SharePointIntake] SharePoint filing threw after successful extract (invoice kept)`,
          fileError,
        );
      }

      return {
        inboundSharePointId: Number(inbound.InboundSharePointId),
        status: "PROCESSED",
        subjectParse: subjectCheck,
        primaryDocumentId: extractResult.primaryDocumentId,
        extract: extractResult.body,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await inbound.update({
        Status: "FAILED",
        ErrorMessage: message,
        UpdatedAt: new Date(),
      });
      throw error;
    }
  }

  async pollFolder() {
    if (!isSharePointIntakeEnabled()) {
      return {
        enabled: false,
        message: "SHAREPOINT_INTAKE_ENABLED is not set — poll skipped",
      };
    }
    if (!isSharePointConfigured()) {
      throw new APIError(
        "SharePoint is not configured for invoice intake",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    if (this.pollRunning) {
      logger.info(
        "[SharePointIntake] Poll skipped — another poll is already running",
      );
      throw new APIError(
        "A SharePoint poll is already running. Wait for OCR to finish, then poll again.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    this.pollRunning = true;
    try {
      return await this.runPollFolder();
    } finally {
      this.pollRunning = false;
    }
  }

  private async runPollFolder() {
    logger.info(
      "[SharePointIntake] POLL_START scanning Incoming folder for new [EAPA] files; " +
        "FAILED/QUEUED rows are retried, PROCESSED rows are skipped",
    );
    const top = Math.max(
      1,
      Math.min(
        50,
        parseInt(process.env.SHAREPOINT_INTAKE_POLL_TOP || "25", 10) || 25,
      ),
    );
    logger.info(`[SharePointIntake] listing folder (top=${top})`);
    const items = await listFolderPdfItems(top);
    logger.info(`[SharePointIntake] folder listed count=${items.length}`);
    const results: Array<Record<string, unknown>> = [];
    const toProcess: GraphDriveItem[] = [];
    const skipCounts: Record<string, number> = {};
    let newQueued = 0;
    let retryQueued = 0;

    for (const item of items) {
      try {
        const enqueued = await this.enqueueDriveItem(item);
        results.push({
          driveItemId: item.id,
          fileName: item.name,
          phase: "enqueue",
          ...enqueued,
        });
        if (enqueued.skipped || !enqueued.shouldProcess) {
          bumpCount(skipCounts, enqueued.reason || enqueued.status || "skipped");
          continue;
        }
        toProcess.push(item);
        const reason = enqueued.queueReason || "new";
        if (reason === "new") newQueued += 1;
        else retryQueued += 1;
        logger.info(
          `[SharePointIntake] QUEUE_${reason === "new" ? "NEW" : "RETRY"} ` +
            `inboundSharePointId=${enqueued.inboundSharePointId} reason=${reason} ` +
            `priorStatus=${enqueued.priorStatus || "none"} file=${item.name}`,
        );
      } catch (error) {
        logger.error(
          `[SharePointIntake] Failed enqueueing ${item.id}`,
          error,
        );
        bumpCount(skipCounts, "enqueue_error");
        results.push({
          driveItemId: item.id,
          fileName: item.name,
          phase: "enqueue",
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("[SharePointIntake] POLL_SCAN", {
      scannedFolder: items.length,
      skipped: skipCounts,
      newQueued,
      retryQueued,
      ocrQueue: toProcess.length,
      folderPath: getSharePointFolderPath(),
    });

    if (!toProcess.length) {
      logger.info(
        `[SharePointIntake] POLL_IDLE no OCR will run — folder has no new or retryable invoices ` +
          `(scanned=${items.length}, skipped=${JSON.stringify(skipCounts)})`,
      );
    } else {
      logger.info(
        `[SharePointIntake] POLL_OCR_QUEUE ${toProcess.length} file(s) will run OCR one at a time ` +
          `(new=${newQueued}, retry=${retryQueued})`,
      );
    }

    let processedOk = 0;
    let processedFailed = 0;
    let processedSkipped = 0;
    for (const item of toProcess) {
      try {
        const result = await this.processDriveItem(item);
        results.push({
          driveItemId: item.id,
          fileName: item.name,
          phase: "process",
          ...result,
        });
        if (result.skipped) {
          processedSkipped += 1;
        } else if (String(result.status).toUpperCase() === "PROCESSED") {
          processedOk += 1;
        } else if (String(result.status).toUpperCase() === "FAILED") {
          processedFailed += 1;
        }
      } catch (error) {
        logger.error(
          `[SharePointIntake] Failed processing ${item.id}`,
          error,
        );
        processedFailed += 1;
        results.push({
          driveItemId: item.id,
          fileName: item.name,
          phase: "process",
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const idle = toProcess.length === 0;
    const summary = {
      scanned: items.length,
      enqueued: toProcess.length,
      newQueued,
      retryQueued,
      skipped: skipCounts,
      ocrRan: toProcess.length - processedSkipped,
      processedOk,
      processedFailed,
      processedSkipped,
      idle,
      folderPath: getSharePointFolderPath(),
    };
    logger.info(
      idle
        ? `[SharePointIntake] POLL_DONE idle — OCR did not run. scannedFolder=${items.length}`
        : `[SharePointIntake] POLL_DONE ocrRan=${summary.ocrRan} processed=${processedOk} failed=${processedFailed} skipped=${processedSkipped} (new=${newQueued} retry=${retryQueued})`,
      summary,
    );

    return {
      enabled: true,
      ...summary,
      results,
    };
  }
}

export default new ApSharePointIntakeService();
