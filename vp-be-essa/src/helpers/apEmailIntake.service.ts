import { Op } from "sequelize";
import { ApInboundEmail } from "../models/apInboundEmail";
import { ApInboundEmailAttachment } from "../models/apInboundEmailAttachment";
import { ApDocument } from "../models/apDocument";
import { VendorEmail } from "../models/vendorEmail";
import apInvoiceExtractService from "./apInvoiceExtract.service";
import apDocumentRequestService from "./apDocumentRequest.service";
import apInvoiceDocumentService from "./apInvoiceDocument.service";
import apInvoiceValidationService from "./apInvoiceValidation.service";
import {
  formatSubjectRejectMessage,
  validateEmailSubject,
  type EmailSubjectValidationResult,
} from "./apEmailSubjectValidation";
import { fileInvoicePdfToSharePoint } from "./apSharePointFiling.service";
import {
  downloadFileAttachment,
  isEmailIntakeEnabled,
  isGraphConfigured,
  listInboxMessages,
  listMessageAttachments,
  type GraphMailAttachment,
  type GraphMailMessage,
} from "./microsoftGraphMail.client";
import {
  flattenEmailAttachmentsToPdfs,
  type ExpandableMailAttachment,
} from "./apZipPdfExtract.service";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { auditInboundExtractFailure } from "./essaInvoiceActions.service";
import {
  auditDuplicateDetected,
  auditReceive,
  auditRejectIntake,
} from "./invoiceProcessAudit.service";
import { mintCorrelationId } from "./auditEvent.service";

export type InboundEmailStatus =
  | "QUEUED"
  | "PENDING"
  | "PROCESSED"
  | "NO_DOCUMENT"
  | "FAILED"
  | "IGNORED"
  | "VENDOR_UNMATCHED"
  | "INVALID_SUBJECT"
  | "UNCORRELATED";

const TERMINAL_SKIP_STATUSES = new Set([
  "PROCESSED",
  "NO_DOCUMENT",
  "IGNORED",
  "UNCORRELATED",
  // INVALID_SUBJECT / FAILED / QUEUED / PENDING are retriable or in-flight
]);

/** PENDING older than this is treated as stalled (crash / hung OCR), not in-flight */
const STALE_PENDING_MS = Math.max(
  // Never auto-fail sooner than 15 minutes — protects against TZ skew false positives
  15 * 60 * 1000,
  parseInt(process.env.EMAIL_INTAKE_STALE_PENDING_MS || String(15 * 60 * 1000), 10) ||
    15 * 60 * 1000,
);

const STALE_PENDING_MESSAGE =
  "Processing interrupted or timed out (stuck in Pending). Poll mailbox to retry.";

/** Claim parent email for OCR only from these statuses (not PROCESSED / in-flight). */
const CLAIMABLE_INBOUND_STATUSES = ["QUEUED", "FAILED", "INVALID_SUBJECT"] as const;

/** Claim attachment for OCR only from these statuses. */
const CLAIMABLE_ATTACHMENT_STATUSES = ["QUEUED", "FAILED"] as const;

const normalizeEmail = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase();

const ageMsFrom = (value: Date | string | null | undefined): number | null => {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Date.now() - t);
};

/**
 * Only PENDING with a Node-written UpdatedAt can be "stale".
 * Do NOT use CreatedAt (DB NOW()) — timezone skew vs Node Date makes brand-new
 * rows look hours old and immediately auto-fail.
 */
const isStalePendingStamp = (
  status: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): boolean => {
  if (String(status || "").toUpperCase() !== "PENDING") return false;
  if (!updatedAt) return false;
  const age = ageMsFrom(updatedAt);
  return age != null && age >= STALE_PENDING_MS;
};

const isPdfAttachment = (att: {
  name?: string | null;
  contentType?: string | null;
  isInline?: boolean;
}): boolean => {
  if (att.isInline) return false;
  const mime = String(att.contentType || "")
    .trim()
    .toLowerCase();
  const name = String(att.name || "")
    .trim()
    .toLowerCase();
  if (mime === "application/pdf") return true;
  return name.endsWith(".pdf");
};

const NO_PROCESSABLE_PDF_MESSAGE =
  "No PDF attachments found. Send PDF files or ZIP archives containing PDFs only.";

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

const isAutoReply = (message: GraphMailMessage): boolean => {
  const subject = String(message.subject || "").toLowerCase();
  return (
    subject.startsWith("automatic reply") ||
    subject.startsWith("auto:") ||
    subject.includes("out of office")
  );
};

const subjectWorkflow = (
  parsed: Extract<EmailSubjectValidationResult, { valid: true }>,
): string => {
  if (parsed.type === "DOCREQ") return "AUTO";
  return parsed.invoiceWorkflow;
};

const toSubjectParse = (
  subjectCheck: EmailSubjectValidationResult,
): Record<string, unknown> | null => {
  if (subjectCheck.valid !== true) return null;
  if (subjectCheck.type === "DOCREQ") {
    return {
      type: "DOCREQ",
      eapaInvoiceId: subjectCheck.eapaInvoiceId,
      requestCode: subjectCheck.requestCode,
      documentType: subjectCheck.documentType,
      vendorName: subjectCheck.vendorName,
      invoiceNumber: subjectCheck.invoiceNumber,
      primaryDocumentId: subjectCheck.primaryDocumentId,
      requestId: subjectCheck.requestId,
      invoiceWorkflow: "DOCREQ",
      invoiceTypeId: "DOCREQ",
    };
  }
  return {
    type: subjectCheck.type,
    category: subjectCheck.category,
    poNumber: subjectCheck.poNumber ?? null,
    vendorName: subjectCheck.vendorName,
    invoiceNumber: subjectCheck.invoiceNumber,
    invoiceWorkflow: subjectCheck.invoiceWorkflow,
    invoiceTypeId: subjectCheck.invoiceTypeId,
  };
};

/** Build a clear operator-facing error from extractAndPersist result. */
const formatExtractFailureMessage = (extractResult: {
  status?: string | null;
  body?: any;
  httpStatus?: number;
}): string => {
  const status = String(extractResult.status || "").trim();
  const bodyMessage = String(
    extractResult.body?.message ||
      extractResult.body?.data?.message ||
      "",
  ).trim();
  const missing =
    extractResult.body?.data?.missingMandatoryDocuments ||
    extractResult.body?.extractionTrace?.missingMandatoryLabels ||
    [];
  const missingLabels = (Array.isArray(missing) ? missing : [])
    .map((doc: unknown) =>
      typeof doc === "string"
        ? doc
        : (doc as { categoryLabel?: string; categoryId?: string })?.categoryLabel ||
          (doc as { categoryId?: string })?.categoryId,
    )
    .filter(Boolean);

  if (status === "missing_mandatory_documents" || missingLabels.length) {
    return (
      bodyMessage ||
      `OCR ran, but required documents were missing: ${
        missingLabels.join(", ") || "see catalog"
      }.`
    );
  }
  if (status === "needs_invoice_type_review") {
    return bodyMessage || "OCR needs invoice type review before saving.";
  }
  if (status === "duplicate_invoice" || /already exists/i.test(bodyMessage)) {
    return (
      bodyMessage ||
      "This invoice number already exists in the system (duplicate)."
    );
  }
  if (status === "persist_failed") {
    return (
      bodyMessage ||
      "OCR completed but saving the invoice to the database failed."
    );
  }
  if (bodyMessage) return bodyMessage;
  if (status) return `OCR extract failed (${status}).`;
  return "OCR extract failed or produced no document";
};

/** Terminal-visible diagnosis when email OCR / persist fails. */
const logEmailExtractFailure = (
  context: {
    inboundEmailId?: number | null;
    messageId?: string | null;
    subject?: string | null;
    fileName?: string | null;
    invoiceWorkflow?: string | null;
    stage: string;
  },
  extractResult?: {
    success?: boolean;
    status?: string | null;
    httpStatus?: number;
    primaryDocumentId?: number | null;
    body?: any;
  } | null,
  error?: unknown,
) => {
  const reason = extractResult
    ? formatExtractFailureMessage(extractResult)
    : error instanceof Error
      ? error.message
      : error
        ? String(error)
        : "unknown";
  const trace =
    extractResult?.body?.extractionTrace &&
    typeof extractResult.body.extractionTrace === "object"
      ? (extractResult.body.extractionTrace as Record<string, unknown>)
      : {};
  const ocrData = extractResult?.body?.data;
  const documentCount = Array.isArray(ocrData?.documents)
    ? ocrData.documents.length
    : Array.isArray(extractResult?.body?.data?.documents)
      ? extractResult.body.data.documents.length
      : null;

  logger.error(
    `[EmailIntake] EXTRACT_FAILED — ${reason}`,
    {
      stage: context.stage,
      inboundEmailId: context.inboundEmailId ?? null,
      messageId: context.messageId ?? null,
      subject: context.subject ?? null,
      fileName: context.fileName ?? null,
      invoiceWorkflow: context.invoiceWorkflow ?? null,
      extractStatus: extractResult?.status ?? null,
      httpStatus: extractResult?.httpStatus ?? null,
      primaryDocumentId: extractResult?.primaryDocumentId ?? null,
      ocrDocumentCount: documentCount,
      resolvedInvoiceTypeId: trace.invoiceTypeId ?? null,
      resolvedInvoiceWorkflow: trace.invoiceWorkflow ?? null,
      missingMandatory: trace.missingMandatoryLabels ?? null,
      ocrMessage:
        extractResult?.body?.message ??
        extractResult?.body?.data?.message ??
        null,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error
            ? String(error)
            : null,
    },
  );

  void auditInboundExtractFailure({
    reason,
    stage: context.stage,
    inboundEmailId: context.inboundEmailId ?? null,
    messageId: context.messageId ?? null,
    subject: context.subject ?? null,
    fileName: context.fileName ?? null,
    invoiceWorkflow: context.invoiceWorkflow ?? null,
    primaryDocumentId: extractResult?.primaryDocumentId ?? null,
  });
};

class ApEmailIntakeService {
  /** Prevents overlapping pollMailbox runs (cron + UI) from double-extracting. */
  private pollRunning = false;

  async resolveVendorByFromAddress(
    fromAddress: string | null | undefined,
  ): Promise<{ vendorId: number | null; matched: boolean }> {
    const email = normalizeEmail(fromAddress);
    if (!email) return { vendorId: null, matched: false };

    const rows = await VendorEmail.findAll({
      where: {
        [Op.or]: [{ Is_Deleted: false }, { Is_Deleted: null }],
      },
      attributes: ["Email", "Vendor_Id", "Sorting_Order"],
      order: [["Sorting_Order", "ASC"]],
      limit: 10000,
    });

    const hit = rows.find((r) => normalizeEmail(r.Email) === email);
    if (!hit?.Vendor_Id) return { vendorId: null, matched: false };
    return { vendorId: Number(hit.Vendor_Id), matched: true };
  }

  async simulateIntake(input: {
    file: Express.Multer.File;
    fromAddress: string;
    subject: string;
    receivedAt?: string;
    invoiceWorkflow?: string;
  }) {
    const fromAddress = normalizeEmail(input.fromAddress) || "vendor@example.com";
    const subject = input.subject || "";
    const receivedAt = input.receivedAt || new Date().toISOString();
    const messageId = `simulate-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const attachmentId = `sim-att-${Date.now().toString(36)}`;

    const subjectCheck = validateEmailSubject(subject);
    if (subjectCheck.valid === false) {
      const errorMessage = formatSubjectRejectMessage(subjectCheck.reason);
      const inbound = await ApInboundEmail.create({
        MessageId: messageId,
        InternetMessageId: `<${messageId}@simulate.local>`,
        FromAddress: fromAddress,
        Subject: subject || null,
        ReceivedAt: new Date(receivedAt),
        HasAttachments: true,
        Status: "INVALID_SUBJECT",
        VendorMatched: false,
        ErrorMessage: errorMessage,
        MailboxFolder: "Simulate",
      });
      throw new APIError(
        `${errorMessage} (inboundEmailId=${inbound.InboundEmailId})`,
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const vendor = await this.resolveVendorByFromAddress(fromAddress);
    const workflow =
      input.invoiceWorkflow &&
      String(input.invoiceWorkflow).trim().toUpperCase() !== "AUTO"
        ? String(input.invoiceWorkflow).trim().toUpperCase()
        : subjectWorkflow(subjectCheck);

    let docReqMerge: {
      primaryDocumentId: number;
      requestId: number;
      requestedDocumentTypes: string[];
      replacementTypes: string[];
    } | null = null;

    if (subjectCheck.type === "DOCREQ") {
      const correlation = await this.resolveDocReqCorrelation(subjectCheck);
      if (correlation.ok === false) {
        const errorMessage = correlation.errorMessage;
        const inbound = await ApInboundEmail.create({
          MessageId: messageId,
          InternetMessageId: `<${messageId}@simulate.local>`,
          FromAddress: fromAddress,
          Subject: subject,
          ReceivedAt: new Date(receivedAt),
          HasAttachments: true,
          Status: "UNCORRELATED",
          VendorId: vendor.vendorId,
          VendorMatched: vendor.matched,
          ErrorMessage: errorMessage,
          MailboxFolder: "Simulate",
        });
        return {
          inboundEmailId: Number(inbound.InboundEmailId),
          status: "UNCORRELATED" as InboundEmailStatus,
          vendorMatched: vendor.matched,
          vendorId: vendor.vendorId,
          subjectParse: toSubjectParse(subjectCheck),
          primaryDocumentId: null as number | null,
          extract: { message: errorMessage },
        };
      }
      docReqMerge = correlation;
    }

    const inbound = await ApInboundEmail.create({
      MessageId: messageId,
      InternetMessageId: `<${messageId}@simulate.local>`,
      FromAddress: fromAddress,
      Subject: subject,
      ReceivedAt: new Date(receivedAt),
      HasAttachments: true,
      Status: "PENDING",
      VendorId: vendor.vendorId,
      VendorMatched: vendor.matched,
      MailboxFolder: "Simulate",
      DocumentRequestId: docReqMerge?.requestId ?? null,
      CorrelatedDocumentId: docReqMerge?.primaryDocumentId ?? null,
    });

    const attachmentRow = await ApInboundEmailAttachment.create({
      InboundEmailId: inbound.InboundEmailId,
      AttachmentId: attachmentId,
      FileName: input.file.originalname,
      MimeType: input.file.mimetype,
      FileSizeBytes: input.file.size,
      Status: "PENDING",
    });

    try {
      const extractResult = await apInvoiceExtractService.extractAndPersist({
        file: input.file,
        invoiceWorkflow: workflow,
        uploadedBy: null,
        sourceChannel: "EMAIL",
        awaitPersist: true,
        extractReason: "simulate",
        inboundRef: `email-${inbound.InboundEmailId}`,
        emailMeta: {
          fromAddress,
          subject,
          messageId,
          receivedAt,
          vendorId: vendor.vendorId,
          vendorMatched: vendor.matched,
        },
        traceId: `email-sim-${inbound.InboundEmailId}`,
        ...(docReqMerge
          ? {
              mergeIntoPrimaryDocumentId: docReqMerge.primaryDocumentId,
              requestedDocumentTypes: docReqMerge.requestedDocumentTypes,
              replacementTypes: docReqMerge.replacementTypes,
            }
          : {}),
      });

      if (!extractResult.success || !extractResult.primaryDocumentId) {
        const status: InboundEmailStatus = "FAILED";
        const errorMessage = formatExtractFailureMessage(extractResult);
        logEmailExtractFailure(
          {
            stage: "simulate_extract_and_persist",
            inboundEmailId: Number(inbound.InboundEmailId),
            messageId,
            subject,
            fileName: input.file.originalname,
            invoiceWorkflow: workflow,
          },
          extractResult,
        );
        await attachmentRow.update({
          Status: "FAILED",
          ErrorMessage: errorMessage,
          UpdatedAt: new Date(),
        });
        await inbound.update({
          Status: status,
          ErrorMessage: errorMessage,
          UpdatedAt: new Date(),
        });

        return {
          inboundEmailId: Number(inbound.InboundEmailId),
          status,
          vendorMatched: vendor.matched,
          vendorId: vendor.vendorId,
          subjectParse: toSubjectParse(subjectCheck),
          primaryDocumentId: null as number | null,
          extract: extractResult.body,
        };
      }

      if (docReqMerge && extractResult.receivedByType) {
        await apDocumentRequestService.markItemsReceived({
          requestId: docReqMerge.requestId,
          receivedByType: extractResult.receivedByType,
        });
        await this.revalidateAfterDocReqMerge(
          docReqMerge.primaryDocumentId,
          extractResult.mergedDocumentTypes || [],
        );
      }

      const linkDocumentId = docReqMerge
        ? docReqMerge.primaryDocumentId
        : extractResult.primaryDocumentId;

      await this.fileProcessedPdfToSharePoint({
        buffer: input.file.buffer,
        fileName: input.file.originalname,
        contentType: input.file.mimetype,
        subjectParse: subjectCheck.valid === true ? subjectCheck : null,
        asOfDate: receivedAt,
        documentId: linkDocumentId,
      });

      await attachmentRow.update({
        Status: "PROCESSED",
        DocumentId: linkDocumentId,
        UpdatedAt: new Date(),
      });

      const finalStatus: InboundEmailStatus = "PROCESSED";
      await inbound.update({
        Status: finalStatus,
        CorrelatedDocumentId: linkDocumentId,
        UpdatedAt: new Date(),
      });

      return {
        inboundEmailId: Number(inbound.InboundEmailId),
        status: finalStatus,
        vendorMatched: vendor.matched,
        vendorId: vendor.vendorId,
        subjectParse: toSubjectParse(subjectCheck),
        primaryDocumentId: linkDocumentId,
        extract: extractResult.body,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logEmailExtractFailure(
        {
          stage: "simulate_extract_exception",
          inboundEmailId: Number(inbound.InboundEmailId),
          messageId,
          subject,
          fileName: input.file.originalname,
          invoiceWorkflow: workflow,
        },
        null,
        error,
      );
      await attachmentRow.update({
        Status: "FAILED",
        ErrorMessage: message,
        UpdatedAt: new Date(),
      });
      await inbound.update({
        Status: "FAILED",
        ErrorMessage: message,
        UpdatedAt: new Date(),
      });
      throw error;
    }
  }

  async listInboundEmails(options: { status?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (options.status) {
      where.Status = String(options.status).trim().toUpperCase();
    }

    const emails = await ApInboundEmail.findAll({
      where,
      include: [{ model: ApInboundEmailAttachment, as: "attachments" }],
      order: [["ReceivedAt", "DESC"], ["InboundEmailId", "DESC"]],
      limit: 200,
    });

    // Heal finished attachments; only auto-fail truly stalled PENDING (not QUEUED)
    for (const email of emails) {
      const attachments = ((email as any).attachments ||
        []) as ApInboundEmailAttachment[];
      const parentStatus = String(email.Status || "").toUpperCase();

      if (parentStatus === "PENDING" || parentStatus === "QUEUED") {
        if (attachments.length) {
          const resolved = this.resolveInboundStatusFromAttachments(
            attachments.map((a) => a.Status),
          );
          // Only promote to a terminal status from attachments — never from stale-heal here
          if (
            resolved.status !== parentStatus &&
            (resolved.status === "PROCESSED" || resolved.status === "FAILED")
          ) {
            // Don't promote QUEUED → FAILED just because a prior false "stale" marked an att FAILED
            const onlyStaleFalsePositives =
              resolved.status === "FAILED" &&
              parentStatus === "QUEUED" &&
              attachments.every((a) => {
                const s = String(a.Status || "").toUpperCase();
                if (s === "QUEUED" || s === "PROCESSED") return true;
                if (s !== "FAILED") return false;
                return String(a.ErrorMessage || "").includes(
                  "stuck in Pending",
                );
              });
            if (onlyStaleFalsePositives) {
              // Reset false-positive FAILED attachments so poll can retry
              for (const att of attachments) {
                if (
                  String(att.Status || "").toUpperCase() === "FAILED" &&
                  String(att.ErrorMessage || "").includes("stuck in Pending")
                ) {
                  await att.update({
                    Status: "QUEUED",
                    ErrorMessage: null,
                    UpdatedAt: new Date(),
                  });
                  att.Status = "QUEUED";
                  att.ErrorMessage = null;
                }
              }
              continue;
            }

            const firstAttError = attachments.find(
              (a) =>
                String(a.Status).toUpperCase() === "FAILED" && a.ErrorMessage,
            )?.ErrorMessage;
            await email.update({
              Status: resolved.status,
              ErrorMessage: firstAttError || resolved.errorMessage,
              UpdatedAt: new Date(),
            });
            continue;
          }
        }
        if (parentStatus === "PENDING") {
          await this.failStalePending(email, attachments);
        }
      } else if (
        attachments.some((a) => String(a.Status || "").toUpperCase() === "PENDING")
      ) {
        await this.failStalePending(email, attachments);
      }
    }

    return emails.map((email) => {
      const attachments = (email as any).attachments || [];
      const subjectCheck = validateEmailSubject(email.Subject);
      const subjectParse = toSubjectParse(subjectCheck);
      const updatedAt = email.UpdatedAt?.toISOString?.() || null;
      const statusUpper = String(email.Status || "").toUpperCase();
      // Age for display: prefer UpdatedAt; CreatedAt only for UI elapsed (not stale-fail)
      const statusAgeMs = ageMsFrom(email.UpdatedAt || email.CreatedAt);
      const stale = isStalePendingStamp(email.Status, email.UpdatedAt);
      return {
        inboundEmailId: Number(email.InboundEmailId),
        messageId: email.MessageId,
        internetMessageId: email.InternetMessageId,
        fromAddress: email.FromAddress,
        subject: email.Subject,
        subjectParse,
        receivedAt: email.ReceivedAt?.toISOString?.() || null,
        hasAttachments: Boolean(email.HasAttachments),
        status: email.Status,
        vendorId: email.VendorId,
        vendorMatched: Boolean(email.VendorMatched),
        errorMessage: email.ErrorMessage,
        mailboxFolder: email.MailboxFolder,
        documentRequestId: email.DocumentRequestId
          ? Number(email.DocumentRequestId)
          : null,
        correlatedDocumentId: email.CorrelatedDocumentId
          ? Number(email.CorrelatedDocumentId)
          : null,
        createdAt: email.CreatedAt?.toISOString?.() || null,
        updatedAt,
        statusAgeMs,
        stale,
        attachments: attachments.map((att: ApInboundEmailAttachment) => ({
          inboundAttachmentId: Number(att.InboundAttachmentId),
          attachmentId: att.AttachmentId,
          fileName: att.FileName,
          mimeType: att.MimeType,
          fileSizeBytes: att.FileSizeBytes,
          documentId: att.DocumentId
            ? Number(att.DocumentId)
            : email.CorrelatedDocumentId
              ? Number(email.CorrelatedDocumentId)
              : null,
          status: att.Status,
          errorMessage: att.ErrorMessage,
          updatedAt: att.UpdatedAt?.toISOString?.() || null,
        })),
      };
    });
  }

  /**
   * Stop OCR retries for one inbound email. Poll skips IGNORED rows.
   */
  async ignoreInboundEmail(inboundEmailId: number) {
    const id = Number(inboundEmailId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new APIError("inboundEmailId is required", StatusCodeEnum.HTTP_BAD_REQUEST);
    }

    const inbound = await ApInboundEmail.findByPk(id);
    if (!inbound) {
      throw new APIError("Inbound email not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }

    const current = String(inbound.Status || "").toUpperCase();
    if (current === "IGNORED") {
      return {
        inboundEmailId: id,
        status: "IGNORED" as InboundEmailStatus,
        skipped: true,
        reason: "already_ignored",
      };
    }
    if (current === "PROCESSED") {
      throw new APIError(
        "This email is already processed. Ignore is only for rows that keep retrying OCR.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    if (this.isActivelyInFlight(inbound)) {
      throw new APIError(
        "OCR is still running on this email. Wait for it to fail or finish, then ignore.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    const message = "Ignored — OCR will not retry this email.";
    const attachments = await ApInboundEmailAttachment.findAll({
      where: { InboundEmailId: inbound.InboundEmailId },
    });
    for (const att of attachments) {
      if (att.DocumentId || String(att.Status || "").toUpperCase() === "PROCESSED") {
        continue;
      }
      await att.update({
        Status: "FAILED",
        ErrorMessage: message,
        UpdatedAt: new Date(),
      });
    }

    await inbound.update({
      Status: "IGNORED",
      ErrorMessage: message,
      UpdatedAt: new Date(),
    });

    logger.info(
      `[EmailIntake] IGNORED inboundEmailId=${id} priorStatus=${current} — OCR retries stopped`,
    );

    return {
      inboundEmailId: id,
      status: "IGNORED" as InboundEmailStatus,
      priorStatus: current,
    };
  }

  private async findExistingMessage(messageId: string) {
    return ApInboundEmail.findOne({ where: { MessageId: messageId } });
  }

  /**
   * Atomically claim a parent inbound row for processing (QUEUED/FAILED → PENDING).
   * Returns false if another worker already owns it or it is terminal.
   */
  private async claimInboundForProcessing(
    inboundEmailId: number,
  ): Promise<boolean> {
    const [affected] = await ApInboundEmail.update(
      {
        Status: "PENDING",
        ErrorMessage: null,
        UpdatedAt: new Date(),
      },
      {
        where: {
          InboundEmailId: inboundEmailId,
          Status: { [Op.in]: [...CLAIMABLE_INBOUND_STATUSES] },
        },
      },
    );
    return affected > 0;
  }

  /**
   * Atomically claim an attachment for OCR. Skips PROCESSED / active PENDING.
   * Also skips rows that already have a DocumentId (already extracted).
   */
  private async claimAttachmentForExtract(
    attachmentRow: ApInboundEmailAttachment,
  ): Promise<"claimed" | "already_processed" | "in_progress"> {
    await attachmentRow.reload();
    const status = String(attachmentRow.Status || "").toUpperCase();
    if (status === "PROCESSED" || attachmentRow.DocumentId) {
      return "already_processed";
    }
    if (status === "PENDING" && !isStalePendingStamp(status, attachmentRow.UpdatedAt)) {
      return "in_progress";
    }

    const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
    const [affected] = await ApInboundEmailAttachment.update(
      {
        Status: "PENDING",
        ErrorMessage: null,
        UpdatedAt: new Date(),
      },
      {
        where: {
          InboundAttachmentId: attachmentRow.InboundAttachmentId,
          DocumentId: null,
          [Op.or]: [
            { Status: { [Op.in]: [...CLAIMABLE_ATTACHMENT_STATUSES] } },
            {
              Status: "PENDING",
              UpdatedAt: { [Op.lt]: staleBefore },
            },
          ],
        },
      },
    );

    if (affected > 0) {
      await attachmentRow.reload();
      return "claimed";
    }

    await attachmentRow.reload();
    const after = String(attachmentRow.Status || "").toUpperCase();
    if (after === "PROCESSED" || attachmentRow.DocumentId) {
      return "already_processed";
    }
    return "in_progress";
  }

  /** True only when PENDING was updated recently (another worker likely still extracting). */
  private isActivelyInFlight(email: ApInboundEmail): boolean {
    if (String(email.Status || "").toUpperCase() !== "PENDING") return false;
    // If UpdatedAt is missing, treat as in-flight to avoid double-processing
    if (!email.UpdatedAt) return true;
    return !isStalePendingStamp(email.Status, email.UpdatedAt);
  }

  /**
   * Mark parent + PENDING attachments as FAILED when OCR never finished
   * (server restart, hung proxy, etc.). Never applies to QUEUED.
   */
  private async failStalePending(
    email: ApInboundEmail,
    attachments: ApInboundEmailAttachment[],
  ): Promise<boolean> {
    const parentStatus = String(email.Status || "").toUpperCase();
    const parentStale = isStalePendingStamp(parentStatus, email.UpdatedAt);

    const staleAttachments = attachments.filter((a) =>
      isStalePendingStamp(a.Status, a.UpdatedAt),
    );

    if (!parentStale && !staleAttachments.length) return false;

    for (const att of staleAttachments) {
      await att.update({
        Status: "FAILED",
        ErrorMessage: STALE_PENDING_MESSAGE,
        UpdatedAt: new Date(),
      });
      att.Status = "FAILED";
      att.ErrorMessage = STALE_PENDING_MESSAGE;
    }

    if (parentStale) {
      const resolved = this.resolveInboundStatusFromAttachments(
        attachments.map((a) => a.Status),
      );
      const nextStatus =
        resolved.status === "PROCESSED" ? "PROCESSED" : "FAILED";
      await email.update({
        Status: nextStatus,
        ErrorMessage:
          nextStatus === "FAILED"
            ? STALE_PENDING_MESSAGE
            : resolved.errorMessage,
        UpdatedAt: new Date(),
      });
      email.Status = nextStatus;
      email.ErrorMessage =
        nextStatus === "FAILED" ? STALE_PENDING_MESSAGE : resolved.errorMessage;
      return true;
    }

    // Parent not stale but some attachments were — reconcile parent from attachments
    if (staleAttachments.length) {
      await this.reconcileInboundStatus(email);
      return true;
    }

    return false;
  }

  /** Derive parent email status from attachment rows after OCR attempts. */
  private resolveInboundStatusFromAttachments(
    attachmentStatuses: string[],
  ): {
    status: InboundEmailStatus;
    errorMessage: string | null;
  } {
    const normalized = attachmentStatuses.map((s) =>
      String(s || "").trim().toUpperCase(),
    );
    const processed = normalized.filter((s) => s === "PROCESSED").length;
    const failed = normalized.filter((s) => s === "FAILED").length;
    const pending = normalized.filter((s) => s === "PENDING").length;
    const queued = normalized.filter((s) => s === "QUEUED").length;

    if (processed > 0 && failed === 0 && pending === 0 && queued === 0) {
      return { status: "PROCESSED", errorMessage: null };
    }
    if (processed > 0 && failed > 0 && pending === 0 && queued === 0) {
      return {
        status: "PROCESSED",
        errorMessage: `${failed} attachment(s) failed OCR; ${processed} processed`,
      };
    }
    if (failed > 0 && processed === 0 && pending === 0 && queued === 0) {
      return {
        status: "FAILED",
        errorMessage: `${failed} attachment(s) failed OCR`,
      };
    }
    // Any attachment currently extracting → parent is in progress
    if (pending > 0) {
      return { status: "PENDING", errorMessage: null };
    }
    // Waiting for OCR to start
    if (queued > 0 && failed === 0 && processed === 0) {
      return { status: "QUEUED", errorMessage: null };
    }
    // Mixed queued/failed (or incomplete run) — treat as failed once any OCR failed
    if (failed > 0) {
      return {
        status: "FAILED",
        errorMessage: `${failed} attachment(s) failed OCR${
          queued > 0 ? `; ${queued} still queued` : ""
        }`,
      };
    }
    return { status: "QUEUED", errorMessage: null };
  }

  /**
   * Heal parent rows stuck in PENDING when attachments already finished
   * (e.g. process crashed after attachment FAILED write).
   */
  private async reconcileInboundStatus(
    inbound: ApInboundEmail,
    options: { preferAttachmentError?: boolean } = {},
  ): Promise<InboundEmailStatus> {
    const attachments = await ApInboundEmailAttachment.findAll({
      where: { InboundEmailId: inbound.InboundEmailId },
    });
    if (!attachments.length) {
      return String(inbound.Status || "QUEUED").toUpperCase() as InboundEmailStatus;
    }

    const resolved = this.resolveInboundStatusFromAttachments(
      attachments.map((a) => a.Status),
    );
    const current = String(inbound.Status || "").toUpperCase();

    // Never leave QUEUED/PENDING when every attachment attempt has finished
    const shouldUpdate =
      resolved.status !== current ||
      (resolved.status === "FAILED" &&
        (current === "PENDING" || current === "QUEUED"));

    if (shouldUpdate) {
      const firstAttError =
        options.preferAttachmentError !== false
          ? attachments.find(
              (a) =>
                String(a.Status).toUpperCase() === "FAILED" && a.ErrorMessage,
            )?.ErrorMessage
          : null;
      await inbound.update({
        Status: resolved.status,
        ErrorMessage: firstAttError || resolved.errorMessage,
        UpdatedAt: new Date(),
      });
    }

    return resolved.status;
  }

  private async fileProcessedPdfToSharePoint(input: {
    buffer: Buffer;
    fileName: string;
    contentType?: string;
    subjectParse: Extract<EmailSubjectValidationResult, { valid: true }> | null;
    asOfDate?: Date | string | null;
    documentId?: number | null;
  }) {
    if (!input.buffer?.length) {
      logger.warn(
        `[EmailIntake] SharePoint filing skipped — empty PDF buffer (doc=${input.documentId ?? "n/a"})`,
      );
      return;
    }
    try {
      const result = await fileInvoicePdfToSharePoint({
        ...input,
        sourceChannel: "EMAIL",
      });
      if (!result.ok) {
        logger.warn(
          `[EmailIntake] SharePoint filing skipped: ${result.error} (doc=${input.documentId ?? "n/a"})`,
        );
      }
    } catch (fileError) {
      logger.warn(
        `[EmailIntake] SharePoint filing threw after successful extract (invoice kept)`,
        fileError,
      );
    }
  }

  private async processPdfAttachment(params: {
    inbound: ApInboundEmail;
    message: GraphMailMessage;
    attachmentMeta: ExpandableMailAttachment;
    fromAddress: string;
    vendorId: number | null;
    vendorMatched: boolean;
    invoiceWorkflow: string;
    extractReason?: string;
    docReqMerge?: {
      primaryDocumentId: number;
      requestId: number;
      requestedDocumentTypes: string[];
      replacementTypes: string[];
    } | null;
  }) {
    const {
      inbound,
      message,
      attachmentMeta,
      fromAddress,
      vendorId,
      vendorMatched,
      invoiceWorkflow,
      extractReason,
      docReqMerge,
    } = params;

    const existingAtt = await ApInboundEmailAttachment.findOne({
      where: {
        InboundEmailId: inbound.InboundEmailId,
        AttachmentId: attachmentMeta.id,
      },
    });
    if (existingAtt && (existingAtt.Status === "PROCESSED" || existingAtt.DocumentId)) {
      logger.info(
        `[EmailIntake] SKIP_ALREADY_EXTRACTED inboundEmailId=${inbound.InboundEmailId} ` +
          `file=${existingAtt.FileName || attachmentMeta.name} documentId=${existingAtt.DocumentId} ` +
          `— OCR will not re-run this attachment`,
      );
      return {
        status: "PROCESSED" as const,
        documentId: existingAtt.DocumentId,
      };
    }

    const attachmentRow =
      existingAtt ||
      (await ApInboundEmailAttachment.create({
        InboundEmailId: inbound.InboundEmailId,
        AttachmentId: attachmentMeta.id,
        FileName: attachmentMeta.name,
        MimeType: attachmentMeta.contentType,
        FileSizeBytes: attachmentMeta.size,
        Status: "QUEUED",
      }));

    try {
      const claim = await this.claimAttachmentForExtract(attachmentRow);
      if (claim === "already_processed") {
        logger.info(
          `[EmailIntake] SKIP_ALREADY_EXTRACTED inboundEmailId=${inbound.InboundEmailId} ` +
            `file=${attachmentRow.FileName} documentId=${attachmentRow.DocumentId} — OCR will not re-run`,
        );
        return {
          status: "PROCESSED" as const,
          documentId: attachmentRow.DocumentId,
        };
      }
      if (claim === "in_progress") {
        logger.info(
          `[EmailIntake] SKIP_IN_PROGRESS inboundEmailId=${inbound.InboundEmailId} file=${attachmentRow.FileName} — another extract owns this attachment`,
        );
        return {
          status: "PENDING" as const,
          documentId: attachmentRow.DocumentId,
        };
      }

      const downloaded = attachmentMeta.preloadedBuffer
        ? {
            name: attachmentMeta.name,
            contentType: attachmentMeta.contentType || "application/pdf",
            contentBytes: attachmentMeta.preloadedBuffer.toString("base64"),
          }
        : await downloadFileAttachment(message.id, attachmentMeta.id);
      if (!downloaded?.contentBytes) {
        const errorMessage = attachmentMeta.parentZipName
          ? `PDF from ZIP "${attachmentMeta.parentZipName}" could not be read`
          : "Attachment content missing from Microsoft Graph";
        logger.error(`[EmailIntake] EXTRACT_FAILED — ${errorMessage}`, {
          stage: "download_attachment",
          inboundEmailId: inbound.InboundEmailId,
          messageId: message.id,
          subject: message.subject,
          fileName: attachmentMeta.name,
          attachmentId: attachmentMeta.id,
        });
        void auditInboundExtractFailure({
          reason: errorMessage,
          stage: "download_attachment",
          inboundEmailId: Number(inbound.InboundEmailId),
          messageId: message.id,
          subject: message.subject,
          fileName: attachmentMeta.name,
        });
        await attachmentRow.update({
          Status: "FAILED",
          ErrorMessage: errorMessage,
          UpdatedAt: new Date(),
        });
        return { status: "FAILED" as const, documentId: null as number | null };
      }

      const buffer = Buffer.from(downloaded.contentBytes, "base64");
      const file = {
        fieldname: "document",
        originalname: downloaded.name || attachmentMeta.name || "invoice.pdf",
        encoding: "7bit",
        mimetype: downloaded.contentType || "application/pdf",
        size: buffer.length,
        buffer,
        destination: "",
        filename: "",
        path: "",
        stream: undefined as any,
      } as Express.Multer.File;

      logger.info(
        `[EmailIntake] EXTRACT_START inboundEmailId=${inbound.InboundEmailId} file=${file.originalname} workflow=${invoiceWorkflow || "AUTO"} bytes=${buffer.length} reason=${extractReason || "new"}${
          docReqMerge
            ? ` mergeInto=${docReqMerge.primaryDocumentId} req=${docReqMerge.requestId}`
            : " persist=NEW_INVOICE"
        }`,
      );

      if (!docReqMerge) {
        const subjectParsed = message.subject
          ? validateEmailSubject(message.subject)
          : null;
        const invoiceNo =
          subjectParsed && subjectParsed.valid === true
            ? subjectParsed.invoiceNumber
            : null;
        void auditReceive({
          objectId: invoiceNo || file.originalname || `email-${inbound.InboundEmailId}`,
          invoiceId: null,
          source: "EMAIL",
          correlationId: mintCorrelationId(`email${inbound.InboundEmailId}`),
          reasonRemarks: "Invoice package received from AP mailbox",
          details: {
            inboundEmailId: Number(inbound.InboundEmailId),
            fileName: file.originalname,
            subject: message.subject || null,
            fromAddress,
          },
        });
      }

      const extractResult = await apInvoiceExtractService.extractAndPersist({
        file,
        invoiceWorkflow: invoiceWorkflow || "AUTO",
        uploadedBy: null,
        sourceChannel: "EMAIL",
        awaitPersist: true,
        extractReason: extractReason || (docReqMerge ? "email_docreq_merge" : "new"),
        inboundRef: `email-${inbound.InboundEmailId}`,
        emailMeta: {
          fromAddress,
          subject: message.subject || null,
          messageId: message.id,
          receivedAt: message.receivedDateTime || null,
          vendorId,
          vendorMatched,
        },
        traceId: `email-${inbound.InboundEmailId}-${attachmentMeta.id}`,
        ...(docReqMerge
          ? {
              mergeIntoPrimaryDocumentId: docReqMerge.primaryDocumentId,
              requestedDocumentTypes: docReqMerge.requestedDocumentTypes,
              replacementTypes: docReqMerge.replacementTypes,
            }
          : {}),
      });

      if (!extractResult.success || !extractResult.primaryDocumentId) {
        const errorMessage = formatExtractFailureMessage(extractResult);
        logEmailExtractFailure(
          {
            stage: docReqMerge
              ? "extract_and_merge"
              : "extract_and_persist",
            inboundEmailId: Number(inbound.InboundEmailId),
            messageId: message.id,
            subject: message.subject,
            fileName: file.originalname,
            invoiceWorkflow: invoiceWorkflow || "AUTO",
          },
          extractResult,
        );
        await attachmentRow.update({
          Status: "FAILED",
          ErrorMessage: errorMessage,
          UpdatedAt: new Date(),
        });
        return { status: "FAILED" as const, documentId: null as number | null };
      }

      if (docReqMerge && extractResult.receivedByType) {
        await apDocumentRequestService.markItemsReceived({
          requestId: docReqMerge.requestId,
          receivedByType: extractResult.receivedByType,
        });
        await this.revalidateAfterDocReqMerge(
          docReqMerge.primaryDocumentId,
          extractResult.mergedDocumentTypes || [],
        );
      }

      const linkDocumentId = docReqMerge
        ? docReqMerge.primaryDocumentId
        : extractResult.primaryDocumentId;

      logger.info(
        `[EmailIntake] EXTRACT_OK inboundEmailId=${inbound.InboundEmailId} documentId=${linkDocumentId} file=${file.originalname}${
          docReqMerge ? " (DOCREQ merge)" : ""
        }`,
      );

      // Spec 7.4 — copy processed PDF into SharePoint Filed/{Year}/{Month}/{Vendor}[/{PO}]
      const subjectCheck = validateEmailSubject(message.subject);
      await this.fileProcessedPdfToSharePoint({
        buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        subjectParse: subjectCheck.valid === true ? subjectCheck : null,
        asOfDate: message.receivedDateTime || inbound.ReceivedAt || new Date(),
        documentId: linkDocumentId,
      });

      await attachmentRow.update({
        Status: "PROCESSED",
        DocumentId: linkDocumentId,
        ErrorMessage: null,
        UpdatedAt: new Date(),
      });

      return {
        status: "PROCESSED" as const,
        documentId: linkDocumentId,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      logEmailExtractFailure(
        {
          stage: "extract_exception",
          inboundEmailId: Number(inbound.InboundEmailId),
          messageId: message.id,
          subject: message.subject,
          fileName: attachmentMeta.name,
          invoiceWorkflow: invoiceWorkflow || "AUTO",
        },
        null,
        error,
      );
      await attachmentRow.update({
        Status: "FAILED",
        ErrorMessage: errMsg,
        UpdatedAt: new Date(),
      });
      return { status: "FAILED" as const, documentId: null as number | null };
    }
  }

  /** Re-run validation on the existing package after a DOCREQ merge when prior results exist. */
  private async revalidateAfterDocReqMerge(
    primaryDocumentId: number,
    mergedTypes: string[],
  ): Promise<void> {
    try {
      const hadResults =
        await apInvoiceDocumentService.hasValidationResults(primaryDocumentId);
      if (!hadResults) {
        logger.info(
          `[EmailIntake] DOCREQ merge: skip revalidate (no prior results) primary=${primaryDocumentId}`,
        );
        return;
      }

      const snapshot =
        await apInvoiceDocumentService.getUploadedInvoiceSnapshot(
          primaryDocumentId,
        );
      const stored =
        await apInvoiceDocumentService.getReconstructedExtraction(
          primaryDocumentId,
        );
      if (!stored) return;

      const docs = Array.isArray(snapshot?.documents)
        ? (snapshot!.documents as Array<Record<string, unknown>>)
        : [];
      const batchDocumentTypes = docs
        .map((d) => {
          const nested =
            d?.data && typeof d.data === "object"
              ? (d.data as Record<string, unknown>)
              : d;
          return String(
            nested?.documentType || d?.documentType || d?.type || "",
          )
            .trim()
            .toLowerCase();
        })
        .filter(Boolean);

      const meta =
        snapshot?.meta && typeof snapshot.meta === "object"
          ? (snapshot.meta as Record<string, unknown>)
          : {};
      const invoiceTypeCode = String(
        meta.invoiceTypeId || meta.invoiceWorkflow || "",
      )
        .trim()
        .toUpperCase();

      await apInvoiceValidationService.validateInvoice({
        header: stored.header,
        lineItems: stored.lineItems,
        batchDocumentTypes,
        documentId: primaryDocumentId,
        invoiceHeaderId: stored.document.InvoiceHeaderId ?? undefined,
        invoiceTypeCode: invoiceTypeCode || undefined,
        workflow: invoiceTypeCode === "NON_PO" ? "NON_PO" : "PO",
        triggerEvent: "DOCREQ_REVALIDATION",
      });

      logger.info(
        `[EmailIntake] DOCREQ revalidate OK primary=${primaryDocumentId} merged=${mergedTypes.join(",")}`,
      );
    } catch (error) {
      logger.error(
        `[EmailIntake] DOCREQ revalidate failed primary=${primaryDocumentId}`,
        error,
      );
    }
  }

  /**
   * Resolve INV + open REQ for a DOCREQ subject. Returns null + error when
   * correlation fails (must not create a new invoice).
   */
  private async resolveDocReqCorrelation(
    subjectCheck: Extract<
      EmailSubjectValidationResult,
      { valid: true; type: "DOCREQ" }
    >,
  ): Promise<
    | {
        ok: true;
        primaryDocumentId: number;
        requestId: number;
        requestedDocumentTypes: string[];
        replacementTypes: string[];
      }
    | { ok: false; errorMessage: string }
  > {
    const primary = await ApDocument.findByPk(subjectCheck.primaryDocumentId);
    if (!primary) {
      return {
        ok: false,
        errorMessage: `Could not match INV/REQ — invoice ${subjectCheck.eapaInvoiceId} was not found. Invoice was not created.`,
      };
    }

    const resolved = await apDocumentRequestService.resolveOpenRequest({
      requestId: subjectCheck.requestId,
      primaryDocumentId: subjectCheck.primaryDocumentId,
    });
    if (!resolved) {
      return {
        ok: false,
        errorMessage: `Could not match INV/REQ — request ${subjectCheck.requestCode} is not open for ${subjectCheck.eapaInvoiceId}. Invoice was not created.`,
      };
    }

    const pendingItems = resolved.items.filter(
      (i) => String(i.Status).toUpperCase() === "PENDING",
    );
    if (!pendingItems.length) {
      return {
        ok: false,
        errorMessage: `Request ${subjectCheck.requestCode} has no pending document items. Invoice was not created.`,
      };
    }

    if (subjectCheck.documentType) {
      const match = pendingItems.find(
        (i) =>
          String(i.DocumentType).toUpperCase() ===
          String(subjectCheck.documentType).toUpperCase(),
      );
      if (!match) {
        return {
          ok: false,
          errorMessage: `Document type ${subjectCheck.documentType} is not pending on request ${subjectCheck.requestCode}. Invoice was not created.`,
        };
      }
    }

    const scopedItems = subjectCheck.documentType
      ? pendingItems.filter(
          (i) =>
            String(i.DocumentType).toUpperCase() ===
            String(subjectCheck.documentType).toUpperCase(),
        )
      : pendingItems;

    return {
      ok: true,
      primaryDocumentId: subjectCheck.primaryDocumentId,
      requestId: subjectCheck.requestId,
      requestedDocumentTypes: scopedItems.map((i) => i.DocumentType),
      replacementTypes: scopedItems
        .filter((i) => String(i.Reason).toUpperCase() === "REPLACEMENT")
        .map((i) => i.DocumentType),
    };
  }

  /**
   * Phase 1 of poll: accept [EAPA] messages into the log as QUEUED (no OCR yet).
   */
  async enqueueGraphMessage(message: GraphMailMessage): Promise<{
    skipped: boolean;
    reason?: string;
    status?: string;
    shouldProcess: boolean;
    inboundEmailId?: number;
    priorStatus?: string | null;
    queueReason?: string;
  }> {
    const messageId = String(message.id || "").trim();
    if (!messageId) {
      return { skipped: true, reason: "missing_id", shouldProcess: false };
    }

    const existing = await this.findExistingMessage(messageId);
    const priorStatus = existing
      ? String(existing.Status || "").toUpperCase()
      : null;

    if (existing && TERMINAL_SKIP_STATUSES.has(String(existing.Status))) {
      return {
        skipped: true,
        reason: "already_handled",
        status: existing.Status,
        shouldProcess: false,
        inboundEmailId: Number(existing.InboundEmailId),
        priorStatus,
      };
    }
    if (existing && isDuplicateFailure(existing.Status, existing.ErrorMessage)) {
      logger.info(
        `[EmailIntake] SKIP_DUPLICATE inboundEmailId=${existing.InboundEmailId} ` +
          `already failed as duplicate invoice — OCR will not re-run`,
        { subject: existing.Subject, error: existing.ErrorMessage },
      );
      void auditDuplicateDetected({
        objectId: existing.Subject || `email-${existing.InboundEmailId}`,
        source: "EMAIL",
        correlationId: mintCorrelationId(`email${existing.InboundEmailId}`),
        reasonRemarks: existing.ErrorMessage || "Duplicate invoice package detected",
        details: {
          inboundEmailId: Number(existing.InboundEmailId),
          priorStatus,
        },
      });
      return {
        skipped: true,
        reason: "duplicate_invoice",
        status: existing.Status,
        shouldProcess: false,
        inboundEmailId: Number(existing.InboundEmailId),
        priorStatus,
      };
    }
    if (existing && this.isActivelyInFlight(existing)) {
      return {
        skipped: true,
        reason: "in_progress",
        status: existing.Status,
        shouldProcess: false,
        inboundEmailId: Number(existing.InboundEmailId),
        priorStatus,
      };
    }

    if (existing) {
      const attachments = await ApInboundEmailAttachment.findAll({
        where: { InboundEmailId: existing.InboundEmailId },
      });
      const extracted = attachments.filter((att) => att.DocumentId);
      if (attachments.length > 0 && extracted.length === attachments.length) {
        await this.reconcileInboundStatus(existing);
        logger.info(
          `[EmailIntake] SKIP_ALREADY_EXTRACTED inboundEmailId=${existing.InboundEmailId} ` +
            `${extracted.length} attachment(s) already have document ids — OCR will not re-run`,
        );
        return {
          skipped: true,
          reason: "already_extracted",
          status: "PROCESSED",
          shouldProcess: false,
          inboundEmailId: Number(existing.InboundEmailId),
          priorStatus,
        };
      }
    }

    if (isAutoReply(message)) {
      logger.info(`[EmailIntake] Skipping auto-reply ${messageId} (left in Inbox)`);
      return { skipped: true, reason: "auto_reply", shouldProcess: false };
    }

    const subjectCheck = validateEmailSubject(message.subject);
    if (subjectCheck.valid === false) {
      logger.info(
        `[EmailIntake] Skipping message ${messageId}: ${subjectCheck.reason} (left in Inbox, not read)`,
        { subject: message.subject },
      );
      return {
        skipped: true,
        reason: subjectCheck.reason,
        status: "INVALID_SUBJECT",
        shouldProcess: false,
      };
    }

    const fromAddress = normalizeEmail(message.from?.emailAddress?.address);
    const vendor = await this.resolveVendorByFromAddress(fromAddress);

    const inbound =
      existing ||
      (await ApInboundEmail.create({
        MessageId: messageId,
        InternetMessageId: message.internetMessageId || null,
        FromAddress: fromAddress || null,
        Subject: message.subject || null,
        ReceivedAt: message.receivedDateTime
          ? new Date(message.receivedDateTime)
          : null,
        HasAttachments: Boolean(message.hasAttachments),
        Status: "QUEUED",
        VendorId: vendor.vendorId,
        VendorMatched: vendor.matched,
        MailboxFolder: "Inbox",
      }));

    if (existing) {
      const current = String(existing.Status || "").toUpperCase();
      // Keep FAILED visible until process starts; re-queue for retry
      await inbound.update({
        FromAddress: fromAddress || inbound.FromAddress,
        Subject: message.subject || inbound.Subject,
        VendorId: vendor.vendorId,
        VendorMatched: vendor.matched,
        Status: current === "PENDING" ? "PENDING" : "QUEUED",
        ErrorMessage: null,
        MailboxFolder: "Inbox",
        UpdatedAt: new Date(),
      });
    }

    // Stub PDF rows as QUEUED so the UI shows waiting attachments before OCR
    try {
      const attachments = await listMessageAttachments(messageId);
      const pdfAttachments = await flattenEmailAttachmentsToPdfs(
        messageId,
        attachments,
      );
      await inbound.update({
        HasAttachments: attachments.length > 0,
        UpdatedAt: new Date(),
      });

      if (!pdfAttachments.length) {
        await inbound.update({
          Status: "NO_DOCUMENT",
          ErrorMessage: NO_PROCESSABLE_PDF_MESSAGE,
          UpdatedAt: new Date(),
        });
        void auditRejectIntake({
          objectId: message.subject || `email-${inbound.InboundEmailId}`,
          source: "EMAIL",
          correlationId: mintCorrelationId(`email${inbound.InboundEmailId}`),
          reasonRemarks: NO_PROCESSABLE_PDF_MESSAGE,
          details: {
            stage: "enqueue_no_document",
            inboundEmailId: Number(inbound.InboundEmailId),
            messageId,
          },
        });
        return {
          skipped: false,
          status: "NO_DOCUMENT",
          shouldProcess: false,
          inboundEmailId: Number(inbound.InboundEmailId),
          priorStatus,
          queueReason: describeQueueReason(priorStatus),
        };
      }

      for (const att of pdfAttachments) {
        const existingAtt = await ApInboundEmailAttachment.findOne({
          where: {
            InboundEmailId: inbound.InboundEmailId,
            AttachmentId: att.id,
          },
        });
        if (existingAtt) {
          const attStatus = String(existingAtt.Status || "").toUpperCase();
          if (attStatus === "PROCESSED" || existingAtt.DocumentId) continue;
          // Skip only if this attachment is actively extracting (fresh PENDING)
          if (
            attStatus === "PENDING" &&
            !isStalePendingStamp(attStatus, existingAtt.UpdatedAt)
          ) {
            continue;
          }
          await existingAtt.update({
            FileName: att.name || existingAtt.FileName,
            MimeType: att.contentType || existingAtt.MimeType,
            FileSizeBytes: att.size ?? existingAtt.FileSizeBytes,
            Status: "QUEUED",
            ErrorMessage: null,
            UpdatedAt: new Date(),
          });
        } else {
          await ApInboundEmailAttachment.create({
            InboundEmailId: inbound.InboundEmailId,
            AttachmentId: att.id,
            FileName: att.name,
            MimeType: att.contentType,
            FileSizeBytes: att.size,
            Status: "QUEUED",
          });
        }
      }
    } catch (error) {
      logger.error(
        `[EmailIntake] Failed listing attachments while enqueueing ${messageId}`,
        error,
      );
      // Still allow process phase to try again
    }

    return {
      skipped: false,
      status: "QUEUED",
      shouldProcess: true,
      inboundEmailId: Number(inbound.InboundEmailId),
      priorStatus,
      queueReason: describeQueueReason(priorStatus),
    };
  }

  async processGraphMessage(message: GraphMailMessage) {
    const messageId = String(message.id || "").trim();
    if (!messageId) return { skipped: true, reason: "missing_id" };

    const existing = await this.findExistingMessage(messageId);
    if (existing && TERMINAL_SKIP_STATUSES.has(String(existing.Status))) {
      logger.info(
        `[EmailIntake] SKIP_ALREADY_HANDLED inboundEmailId=${existing.InboundEmailId} status=${existing.Status} — OCR will not re-run`,
      );
      return { skipped: true, reason: "already_handled", status: existing.Status };
    }
    if (existing && isDuplicateFailure(existing.Status, existing.ErrorMessage)) {
      logger.info(
        `[EmailIntake] SKIP_DUPLICATE inboundEmailId=${existing.InboundEmailId} — OCR will not re-run`,
      );
      return { skipped: true, reason: "duplicate_invoice", status: existing.Status };
    }

    // Subject / auto-reply gate using list metadata only — no attachment download, no folder moves
    if (isAutoReply(message)) {
      logger.info(`[EmailIntake] Skipping auto-reply ${messageId} (left in Inbox)`);
      return { skipped: true, reason: "auto_reply" };
    }

    const subjectCheck = validateEmailSubject(message.subject);
    if (subjectCheck.valid === false) {
      logger.info(
        `[EmailIntake] Skipping message ${messageId}: ${subjectCheck.reason} (left in Inbox, not read)`,
        { subject: message.subject },
      );
      return {
        skipped: true,
        reason: subjectCheck.reason,
        status: "INVALID_SUBJECT" as InboundEmailStatus,
      };
    }

    // Subject matched — only now read attachments / run OCR. Mail stays in Inbox.
    const fromAddress = normalizeEmail(message.from?.emailAddress?.address);
    const vendor = await this.resolveVendorByFromAddress(fromAddress);
    const workflow = subjectWorkflow(subjectCheck);

    let docReqMerge: {
      primaryDocumentId: number;
      requestId: number;
      requestedDocumentTypes: string[];
      replacementTypes: string[];
    } | null = null;

    if (subjectCheck.type === "DOCREQ") {
      const correlation = await this.resolveDocReqCorrelation(subjectCheck);
      if (correlation.ok === false) {
        const errorMessage = correlation.errorMessage;
        const inboundUncorr =
          existing ||
          (await ApInboundEmail.create({
            MessageId: messageId,
            InternetMessageId: message.internetMessageId || null,
            FromAddress: fromAddress || null,
            Subject: message.subject || null,
            ReceivedAt: message.receivedDateTime
              ? new Date(message.receivedDateTime)
              : null,
            HasAttachments: Boolean(message.hasAttachments),
            Status: "UNCORRELATED",
            VendorId: vendor.vendorId,
            VendorMatched: vendor.matched,
            ErrorMessage: errorMessage,
            MailboxFolder: "Inbox",
          }));
        if (existing) {
          await inboundUncorr.update({
            Status: "UNCORRELATED",
            ErrorMessage: errorMessage,
            UpdatedAt: new Date(),
          });
        }
        logger.warn(
          `[EmailIntake] DOCREQ UNCORRELATED ${messageId}: ${errorMessage}`,
        );
        return {
          skipped: false,
          status: "UNCORRELATED" as InboundEmailStatus,
          subjectParse: subjectCheck,
          inboundEmailId: Number(inboundUncorr.InboundEmailId),
          error: errorMessage,
        };
      }
      docReqMerge = correlation;
    }

    const inbound =
      existing ||
      (await ApInboundEmail.create({
        MessageId: messageId,
        InternetMessageId: message.internetMessageId || null,
        FromAddress: fromAddress || null,
        Subject: message.subject || null,
        ReceivedAt: message.receivedDateTime
          ? new Date(message.receivedDateTime)
          : null,
        HasAttachments: Boolean(message.hasAttachments),
        Status: "QUEUED",
        VendorId: vendor.vendorId,
        VendorMatched: vendor.matched,
        MailboxFolder: "Inbox",
        DocumentRequestId: docReqMerge?.requestId ?? null,
        CorrelatedDocumentId: docReqMerge?.primaryDocumentId ?? null,
      }));

    const extractReason = docReqMerge
      ? "email_docreq_merge"
      : describeQueueReason(existing ? String(existing.Status || "QUEUED") : null);

    // Claim QUEUED/FAILED → PENDING; skip if already PROCESSED or another poll owns it
    const claimed = await this.claimInboundForProcessing(
      Number(inbound.InboundEmailId),
    );
    if (!claimed) {
      await inbound.reload();
      if (TERMINAL_SKIP_STATUSES.has(String(inbound.Status))) {
        return {
          skipped: true,
          reason: "already_handled",
          status: inbound.Status,
        };
      }
      if (this.isActivelyInFlight(inbound)) {
        return {
          skipped: true,
          reason: "in_progress",
          status: inbound.Status,
        };
      }
      // Stale PENDING or unexpected status — force claim by healing then retry once
      if (String(inbound.Status || "").toUpperCase() === "PENDING") {
        await inbound.update({
          Status: "QUEUED",
          UpdatedAt: new Date(),
        });
        const retried = await this.claimInboundForProcessing(
          Number(inbound.InboundEmailId),
        );
        if (!retried) {
          return {
            skipped: true,
            reason: "in_progress",
            status: inbound.Status,
          };
        }
      } else {
        return {
          skipped: true,
          reason: "not_claimable",
          status: inbound.Status,
        };
      }
    }

    await inbound.update({
      FromAddress: fromAddress || inbound.FromAddress,
      Subject: message.subject || inbound.Subject,
      VendorId: vendor.vendorId,
      VendorMatched: vendor.matched,
      ErrorMessage: null,
      MailboxFolder: "Inbox",
      DocumentRequestId: docReqMerge?.requestId ?? inbound.DocumentRequestId,
      CorrelatedDocumentId:
        docReqMerge?.primaryDocumentId ?? inbound.CorrelatedDocumentId,
      UpdatedAt: new Date(),
    });

    try {
      const attachments = await listMessageAttachments(messageId);
      const pdfAttachments = await flattenEmailAttachmentsToPdfs(
        messageId,
        attachments,
      );

      if (!pdfAttachments.length) {
        await inbound.update({
          Status: "NO_DOCUMENT",
          HasAttachments: attachments.length > 0,
          ErrorMessage: NO_PROCESSABLE_PDF_MESSAGE,
          MailboxFolder: "Inbox",
          UpdatedAt: new Date(),
        });
        void auditInboundExtractFailure({
          reason: NO_PROCESSABLE_PDF_MESSAGE,
          stage: "no_document",
          inboundEmailId: Number(inbound.InboundEmailId),
          messageId,
          subject: message.subject,
        });
        return {
          skipped: false,
          status: "NO_DOCUMENT",
          subjectParse: subjectCheck,
          inboundEmailId: Number(inbound.InboundEmailId),
        };
      }

      let processedCount = 0;
      let failedCount = 0;
      let skippedInFlight = 0;

      for (const att of pdfAttachments) {
        const result = await this.processPdfAttachment({
          inbound,
          message,
          attachmentMeta: att,
          fromAddress,
          vendorId: vendor.vendorId,
          vendorMatched: vendor.matched,
          invoiceWorkflow: workflow,
          extractReason,
          docReqMerge,
        });
        if (result.status === "PROCESSED") processedCount += 1;
        else if (result.status === "PENDING") skippedInFlight += 1;
        else failedCount += 1;
      }

      const finalStatus = await this.reconcileInboundStatus(inbound);
      if (!inbound.HasAttachments) {
        await inbound.update({
          HasAttachments: true,
          UpdatedAt: new Date(),
        });
      }

      return {
        skipped: false,
        status: finalStatus,
        subjectParse: subjectCheck,
        inboundEmailId: Number(inbound.InboundEmailId),
        processedCount,
        failedCount,
        skippedInFlight,
        correlatedDocumentId: docReqMerge?.primaryDocumentId ?? null,
      };
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      logger.error(
        `[EmailIntake] Message processing failed for ${messageId}`,
        error,
      );
      void auditInboundExtractFailure({
        reason: messageText,
        stage: "message_processing",
        inboundEmailId: Number(inbound.InboundEmailId),
        messageId,
        subject: message.subject,
      });
      const reconciled = await this.reconcileInboundStatus(inbound);
      if (reconciled === "PENDING" || reconciled === "QUEUED") {
        await inbound.update({
          Status: "FAILED",
          ErrorMessage: messageText,
          MailboxFolder: "Inbox",
          UpdatedAt: new Date(),
        });
        return {
          skipped: false,
          status: "FAILED" as InboundEmailStatus,
          subjectParse: subjectCheck,
          inboundEmailId: Number(inbound.InboundEmailId),
          error: messageText,
        };
      }
      return {
        skipped: false,
        status: reconciled,
        subjectParse: subjectCheck,
        inboundEmailId: Number(inbound.InboundEmailId),
        error: messageText,
      };
    }
  }

  async pollMailbox() {
    if (!isEmailIntakeEnabled()) {
      return {
        enabled: false,
        message: "EMAIL_INTAKE_ENABLED is not set — poll skipped",
      };
    }
    if (!isGraphConfigured()) {
      throw new APIError(
        "Microsoft Graph is not configured for email intake",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    if (this.pollRunning) {
      logger.info(
        "[EmailIntake] Poll skipped — another poll is already running",
      );
      throw new APIError(
        "A mailbox poll is already running. Wait for OCR to finish, then poll again.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }

    this.pollRunning = true;
    try {
      return await this.runPollMailbox();
    } finally {
      this.pollRunning = false;
    }
  }

  private toGraphMessageFromInbound(email: ApInboundEmail): GraphMailMessage {
    return {
      id: String(email.MessageId || ""),
      internetMessageId: email.InternetMessageId || undefined,
      subject: email.Subject || undefined,
      receivedDateTime: email.ReceivedAt
        ? new Date(email.ReceivedAt).toISOString()
        : undefined,
      hasAttachments: Boolean(email.HasAttachments),
      from: email.FromAddress
        ? { emailAddress: { address: email.FromAddress } }
        : undefined,
    };
  }

  private isSimulatedMessageId(messageId: string): boolean {
    return String(messageId || "").startsWith("simulate-");
  }

  /**
   * Previous poll/OCR was killed while rows were PENDING. This process is not
   * extracting them (poll lock is free), so reclaim immediately for retry.
   */
  private async requeueInterruptedInbound(): Promise<number> {
    const pending = await ApInboundEmail.findAll({
      where: { Status: "PENDING" },
    });
    let count = 0;
    for (const email of pending) {
      const attachments = await ApInboundEmailAttachment.findAll({
        where: { InboundEmailId: email.InboundEmailId },
      });
      await email.update({
        Status: "QUEUED",
        ErrorMessage: STALE_PENDING_MESSAGE,
        UpdatedAt: new Date(),
      });
      for (const att of attachments) {
        if (
          String(att.Status || "").toUpperCase() === "PENDING" &&
          !att.DocumentId
        ) {
          await att.update({
            Status: "QUEUED",
            ErrorMessage: STALE_PENDING_MESSAGE,
            UpdatedAt: new Date(),
          });
        }
      }
      count += 1;
      logger.info(
        `[EmailIntake] Requeued interrupted inboundEmailId=${email.InboundEmailId}`,
      );
    }
    return count;
  }

  /** Failed/queued Graph mails that may no longer be in the latest Inbox page. */
  private async listRetryableGraphMessages(
    already: Set<string>,
  ): Promise<GraphMailMessage[]> {
    const rows = await ApInboundEmail.findAll({
      where: {
        Status: { [Op.in]: ["QUEUED", "FAILED"] },
      },
      order: [
        ["UpdatedAt", "ASC"],
        ["InboundEmailId", "ASC"],
      ],
    });
    const messages: GraphMailMessage[] = [];
    for (const row of rows) {
      const id = String(row.MessageId || "").trim();
      if (!id || already.has(id) || this.isSimulatedMessageId(id)) continue;
      if (isDuplicateFailure(row.Status, row.ErrorMessage)) {
        logger.info(
          `[EmailIntake] SKIP_DUPLICATE inboundEmailId=${row.InboundEmailId} ` +
            `status=${row.Status} — not retrying OCR for a duplicate invoice`,
        );
        continue;
      }
      const attachments = await ApInboundEmailAttachment.findAll({
        where: { InboundEmailId: row.InboundEmailId },
      });
      if (
        attachments.length > 0 &&
        attachments.every((att) => att.DocumentId)
      ) {
        await this.reconcileInboundStatus(row);
        logger.info(
          `[EmailIntake] SKIP_ALREADY_EXTRACTED inboundEmailId=${row.InboundEmailId} ` +
            `from retry log — attachments already have document ids`,
        );
        continue;
      }
      already.add(id);
      logger.info(
        `[EmailIntake] RETRY_FROM_LOG inboundEmailId=${row.InboundEmailId} ` +
          `status=${row.Status} subject=${JSON.stringify(row.Subject || "")} ` +
          `— not a new inbox item; re-running because it is still ${row.Status}`,
      );
      messages.push(this.toGraphMessageFromInbound(row));
    }
    return messages;
  }

  private async runPollMailbox() {
    logger.info(
      "[EmailIntake] POLL_START scanning Inbox for new [EAPA] invoices; " +
        "FAILED/QUEUED rows are retried, PROCESSED rows are skipped",
    );
    logger.info("[EmailIntake] requeueing interrupted PENDING rows");
    const requeuedPending = await this.requeueInterruptedInbound();
    const top = Math.max(
      1,
      Math.min(50, parseInt(process.env.EMAIL_INTAKE_POLL_TOP || "25", 10) || 25),
    );
    logger.info(`[EmailIntake] listing inbox (top=${top})`);
    const messages = await listInboxMessages(top);
    logger.info(`[EmailIntake] inbox listed count=${messages.length}`);
    const results: Array<Record<string, unknown>> = [];
    const toProcess: GraphMailMessage[] = [];
    const queuedIds = new Set<string>();
    const skipCounts: Record<string, number> = {};
    let newQueued = 0;
    let retryQueued = 0;

    // Phase 1 — enqueue accepted emails as QUEUED (no OCR yet)
    for (const message of messages) {
      try {
        const enqueued = await this.enqueueGraphMessage(message);
        results.push({
          messageId: message.id,
          subject: message.subject,
          phase: "enqueue",
          ...enqueued,
        });
        if (enqueued.skipped || !enqueued.shouldProcess) {
          bumpCount(skipCounts, enqueued.reason || enqueued.status || "skipped");
          continue;
        }
        const id = String(message.id || "").trim();
        if (!id || queuedIds.has(id)) {
          bumpCount(skipCounts, "duplicate_in_page");
          continue;
        }
        queuedIds.add(id);
        toProcess.push(message);
        const reason = enqueued.queueReason || "new";
        if (reason === "new") newQueued += 1;
        else retryQueued += 1;
        logger.info(
          `[EmailIntake] QUEUE_${reason === "new" ? "NEW" : "RETRY"} ` +
            `inboundEmailId=${enqueued.inboundEmailId} reason=${reason} ` +
            `priorStatus=${enqueued.priorStatus || "none"} ` +
            `subject=${JSON.stringify(message.subject || "")}`,
        );
      } catch (error) {
        logger.error(
          `[EmailIntake] Failed enqueueing message ${message.id}`,
          error,
        );
        bumpCount(skipCounts, "enqueue_error");
        results.push({
          messageId: message.id,
          subject: message.subject,
          phase: "enqueue",
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const retries = await this.listRetryableGraphMessages(queuedIds);
    if (retries.length) {
      logger.info(
        `[EmailIntake] RETRY_FROM_LOG ${retries.length} queued/failed email(s) ` +
          `not in the current Inbox page — these are not new invoices`,
      );
      toProcess.push(...retries);
      retryQueued += retries.length;
    }
    if (requeuedPending) {
      logger.info(
        `[EmailIntake] Requeued ${requeuedPending} interrupted PENDING email(s) for retry`,
      );
    }

    logger.info("[EmailIntake] POLL_SCAN", {
      scannedInbox: messages.length,
      skipped: skipCounts,
      newQueued,
      retryQueued,
      retriedFromLog: retries.length,
      requeuedInterruptedPending: requeuedPending,
      ocrQueue: toProcess.length,
    });

    if (!toProcess.length) {
      logger.info(
        `[EmailIntake] POLL_IDLE no OCR will run — Inbox has no new or retryable invoices ` +
          `(scanned=${messages.length}, skipped=${JSON.stringify(skipCounts)})`,
      );
    } else {
      logger.info(
        `[EmailIntake] POLL_OCR_QUEUE ${toProcess.length} email(s) will run OCR one at a time ` +
          `(new=${newQueued}, retry=${retryQueued})`,
      );
    }

    // Phase 2 — run OCR one email at a time (QUEUED → PENDING → PROCESSED/FAILED)
    let processedOk = 0;
    let processedFailed = 0;
    let processedSkipped = 0;
    for (const message of toProcess) {
      try {
        const result = await this.processGraphMessage(message);
        results.push({
          messageId: message.id,
          subject: message.subject,
          phase: "process",
          ...result,
        });
        if (result.skipped) {
          processedSkipped += 1;
          logger.info(
            `[EmailIntake] PROCESS_SKIPPED messageId=${message.id} reason=${
              (result as { reason?: string }).reason || "skipped"
            } status=${result.status || ""}`,
          );
        } else if (String(result.status).toUpperCase() === "PROCESSED") {
          processedOk += 1;
        } else if (String(result.status).toUpperCase() === "FAILED") {
          processedFailed += 1;
        }
      } catch (error) {
        logger.error(
          `[EmailIntake] Failed processing message ${message.id}`,
          error,
        );
        processedFailed += 1;
        try {
          const existing = await this.findExistingMessage(String(message.id || ""));
          if (existing) {
            const reconciled = await this.reconcileInboundStatus(existing);
            if (reconciled === "PENDING" || reconciled === "QUEUED") {
              await existing.update({
                Status: "FAILED",
                ErrorMessage:
                  error instanceof Error ? error.message : String(error),
                UpdatedAt: new Date(),
              });
            }
          }
        } catch (healError) {
          logger.error(
            `[EmailIntake] Could not heal inbound status for ${message.id}`,
            healError,
          );
        }
        results.push({
          messageId: message.id,
          subject: message.subject,
          phase: "process",
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const idle = toProcess.length === 0;
    const summary = {
      scanned: messages.length,
      enqueued: toProcess.length,
      newQueued,
      retried: retries.length,
      retryQueued,
      requeuedPending,
      skipped: skipCounts,
      ocrRan: toProcess.length - processedSkipped,
      processedOk,
      processedFailed,
      processedSkipped,
      idle,
    };
    logger.info(
      idle
        ? `[EmailIntake] POLL_DONE idle — OCR did not run. scannedInbox=${messages.length}`
        : `[EmailIntake] POLL_DONE ocrRan=${summary.ocrRan} processed=${processedOk} failed=${processedFailed} skipped=${processedSkipped} (new=${newQueued} retry=${retryQueued})`,
      summary,
    );

    return {
      enabled: true,
      ...summary,
      results,
    };
  }
}

export default new ApEmailIntakeService();
