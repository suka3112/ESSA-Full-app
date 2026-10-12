import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { ApDocument } from "../models/apDocument";
import { ApDocumentExtraction } from "../models/apDocumentExtraction";
import { EssaInvoice } from "../models/essaInvoice";
import { mintCorrelationId } from "./auditEvent.service";
import apInvoiceDocumentService from "./apInvoiceDocument.service";
import apInvoiceExtractService from "./apInvoiceExtract.service";
import {
  auditDuplicateDetected,
  auditExtractFailed,
  auditExtractOk,
  auditReceive,
  auditRegister,
  auditRejectIntake,
} from "./invoiceProcessAudit.service";
import logger from "../utils/logger";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { enqueueInvoiceOcr } from "../queues/invoiceOcrQueue";
import matrixDocumentReadService from "./matrixDocumentRead.service";
import {
  ASYNC_HEARTBEAT_ALIVE_MS,
  ASYNC_HEARTBEAT_FIELD,
  ASYNC_PRIMARY_FIELD,
  ASYNC_STATUS_DETAIL_FIELD,
  FAILED_STAGE,
  PROCESSING_STAGE,
  assertFileSignature,
  assertPathInsideRoot,
  classifyExtractResult,
  heartbeatIsAlive,
  placeholderInvoiceNo,
  placeholderWorkflow,
  storedFileName,
} from "./apInvoiceAsyncUpload.logic";

const HEARTBEAT_WRITE_MS = 4_000;

const uploadRoot = (): string =>
  path.resolve(
    process.env.AP_INVOICE_UPLOAD_DIR ||
      path.join(process.cwd(), "uploads", "ap-invoices"),
  );

type AcceptInput = {
  file: Express.Multer.File;
  documentType?: string | null;
  invoiceWorkflow?: string | null;
  uploadedBy?: number | null;
};

export type AcceptedUpload = {
  id: string;
  documentId: number;
  invoiceId: number;
  status: typeof PROCESSING_STAGE;
  workflow_stage: typeof PROCESSING_STAGE;
  fileName: string;
  invoice_no: string;
};

const messageFromResult = (body: Record<string, unknown> | undefined): string => {
  const direct = body?.message;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const data =
    body?.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : null;
  const nested = data?.message;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  return "";
};

const backgroundStatusDetail = (
  body: Record<string, unknown> | undefined,
): string | null => {
  const trace =
    body?.extractionTrace && typeof body.extractionTrace === "object"
      ? (body.extractionTrace as Record<string, unknown>)
      : null;
  if (!trace?.missingMandatoryDocuments && !trace?.needsInvoiceTypeReview) {
    return null;
  }
  return (
    messageFromResult(body) ||
    "Extraction finished with required documents still missing. Complete validation before parking."
  );
};

const writeField = async (
  documentId: number,
  fieldName: string,
  fieldValue: string | null,
): Promise<void> => {
  const existing = await ApDocumentExtraction.findOne({
    where: { DocumentId: documentId, FieldName: fieldName },
  });
  if (!fieldValue) {
    if (existing) await existing.destroy();
    return;
  }
  if (existing) {
    await existing.update({ FieldValue: fieldValue });
    return;
  }
  await ApDocumentExtraction.create({
    DocumentId: documentId,
    FieldName: fieldName,
    FieldValue: fieldValue,
  });
};

const readField = async (
  documentId: number,
  fieldName: string,
): Promise<string | null> => {
  const row = await ApDocumentExtraction.findOne({
    where: { DocumentId: documentId, FieldName: fieldName },
    attributes: ["FieldValue"],
  });
  return row?.FieldValue || null;
};

class ApInvoiceAsyncUploadService {
  async acceptUpload(input: AcceptInput): Promise<AcceptedUpload> {
    const file = input.file;
    if (!file?.buffer?.length) {
      throw new APIError(
        "Invoice document is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    try {
      assertFileSignature(file.buffer, file.originalname || "");
    } catch (error) {
      throw new APIError(
        error instanceof Error ? error.message : "The uploaded file is not valid.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const workflow = placeholderWorkflow(input.invoiceWorkflow);
    const invoiceNo = placeholderInvoiceNo(file.originalname || "upload");
    const documentType = String(input.documentType || "invoice")
      .trim()
      .toUpperCase()
      .slice(0, 50) || "INVOICE";
    const correlationId = mintCorrelationId("upload");
    const now = new Date();
    const created = await this.insertProcessingRows({
      file,
      documentType,
      workflow,
      invoiceNo,
      correlationId,
      uploadedBy: input.uploadedBy ?? null,
      now,
    });
    const documentId = created.documentId;
    const invoiceId = created.invoiceId;

    const root = uploadRoot();
    const fileName = storedFileName(documentId, file.originalname || "");
    const absolutePath = path.join(root, fileName);
    try {
      await fs.promises.mkdir(root, { recursive: true });
      await fs.promises.writeFile(absolutePath, file.buffer);
      await ApDocument.update(
        { StoredFilePath: absolutePath },
        { where: { DocumentId: documentId } },
      );
    } catch (error) {
      const message = "The invoice file could not be stored.";
      logger.error(`[AsyncUpload] store failed documentId=${documentId}`, error);
      await this.markFailed(documentId, message);
      throw new APIError(message, StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR);
    }

    await writeField(
      documentId,
      ASYNC_STATUS_DETAIL_FIELD,
      "Extracting and validating the uploaded document.",
    );

    const objectId = `ocr-${documentId}`;
    await auditReceive({
      objectId,
      invoiceId: documentId,
      correlationId,
      source: "UPLOAD",
      actorId: input.uploadedBy ?? null,
      actorType: input.uploadedBy ? "USER" : "SYSTEM",
      newValue: file.originalname || invoiceNo,
      reasonRemarks: "Invoice file accepted for background OCR",
      details: { documentId, invoiceId, fileName: file.originalname || null },
    });
    await auditRegister({
      objectId,
      invoiceId: documentId,
      correlationId,
      source: "UPLOAD",
      actorId: input.uploadedBy ?? null,
      actorType: input.uploadedBy ? "USER" : "SYSTEM",
      newValue: invoiceNo,
      reasonRemarks: "Invoice registered as Processing",
      details: { workflowStage: PROCESSING_STAGE, invoiceWorkflow: workflow },
    });

    try {
      await enqueueInvoiceOcr(documentId);
    } catch (error) {
      logger.error(
        `[AsyncUpload] enqueue failed documentId=${documentId}; recovery will retry`,
        error,
      );
    }

    return {
      id: objectId,
      documentId,
      invoiceId,
      status: PROCESSING_STAGE,
      workflow_stage: PROCESSING_STAGE,
      fileName: file.originalname || invoiceNo,
      invoice_no: invoiceNo,
    };
  }

  /**
   * Run OCR for one accepted upload. Retryable failures throw.
   * Business failures (duplicate, missing documents, unreadable type) mark the row Failed.
   */
  async processAcceptedUpload(documentId: number): Promise<void> {
    if (!Number.isInteger(documentId) || documentId <= 0) return;

    const marker = await readField(documentId, ASYNC_PRIMARY_FIELD);
    const markedPrimary = Number(marker);
    if (Number.isInteger(markedPrimary) && markedPrimary > 0) {
      await this.finalizeFromPrimary(documentId, markedPrimary);
      return;
    }

    const claimed = await this.claim(documentId);
    if (!claimed) return;

    const stopHeartbeat = this.startHeartbeat(documentId);
    try {
      const document = await ApDocument.findByPk(documentId);
      const invoice = await EssaInvoice.findOne({
        where: { DocumentId: documentId, IsDeleted: false },
      });
      if (!document?.StoredFilePath || !invoice) {
        await this.markFailed(documentId, "The stored invoice file is missing.");
        return;
      }
      if (invoice.WorkflowStage !== PROCESSING_STAGE) return;

      const absolutePath = assertPathInsideRoot(uploadRoot(), document.StoredFilePath);
      const buffer = await fs.promises.readFile(absolutePath);
      const workflow =
        invoice.InvoiceWorkflow === "PO" || invoice.InvoiceWorkflow === "NON_PO"
          ? invoice.InvoiceWorkflow
          : "AUTO";

      const result = await apInvoiceExtractService.extractAndPersist({
        file: {
          buffer,
          originalname: document.OriginalFileName || `invoice-${documentId}.pdf`,
          mimetype: document.MimeType || "application/pdf",
          size: buffer.length,
          fieldname: "document",
          encoding: "7bit",
          destination: "",
          filename: "",
          path: absolutePath,
          stream: undefined as never,
        },
        invoiceWorkflow: workflow,
        uploadedBy: document.UploadedBy ?? null,
        sourceChannel: "UPLOAD",
        awaitPersist: true,
        skipEssaInvoiceUpsert: true,
        reviewOnIncomplete: true,
        storedFilePath: absolutePath,
        extractReason: "async_upload",
        query: { validate: "true" },
        body: { invoiceWorkflow: workflow, validate: "true" },
      });

      const outcome = classifyExtractResult({
        success: result.success,
        status: result.status,
        primaryDocumentId: result.primaryDocumentId,
        message:
          messageFromResult(result.body) ||
          (result.status === "duplicate_invoice"
            ? "This invoice number already exists and cannot be processed."
            : ""),
      });

      await this.recordMatrixReads(
        documentId,
        document.DocumentType,
        result.primaryDocumentId,
        result.body,
      );

      if (outcome.action === "complete" && result.primaryDocumentId) {
        await writeField(
          documentId,
          ASYNC_PRIMARY_FIELD,
          String(result.primaryDocumentId),
        );
        await this.finalizeFromPrimary(
          documentId,
          result.primaryDocumentId,
          backgroundStatusDetail(result.body),
        );
        return;
      }
      if (outcome.action === "fail") {
        await this.markFailed(documentId, outcome.message, result.status);
        return;
      }
      if (outcome.action === "retry") {
        throw new Error(outcome.message);
      }
    } catch (error) {
      stopHeartbeat();
      await writeField(documentId, ASYNC_HEARTBEAT_FIELD, null);
      throw error;
    } finally {
      stopHeartbeat();
    }
  }

  private async insertProcessingRows(input: {
    file: Express.Multer.File;
    documentType: string;
    workflow: string;
    invoiceNo: string;
    correlationId: string;
    uploadedBy: number | null;
    now: Date;
  }): Promise<{ documentId: number; invoiceId: number }> {
    try {
      return await this.insertProcessingRowsOnce(input, true);
    } catch (error) {
      logger.warn(
        `[AsyncUpload] create with CorrelationId failed; retrying without it: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.insertProcessingRowsOnce(input, false);
    }
  }

  private async insertProcessingRowsOnce(
    input: {
      file: Express.Multer.File;
      documentType: string;
      workflow: string;
      invoiceNo: string;
      correlationId: string;
      uploadedBy: number | null;
      now: Date;
    },
    withCorrelation: boolean,
  ): Promise<{ documentId: number; invoiceId: number }> {
    const transaction = await sequelize.transaction();
    try {
      const document = await ApDocument.create(
        {
          DocumentType: input.documentType,
          OriginalFileName: input.file.originalname || input.invoiceNo,
          StoredFilePath: null,
          MimeType: input.file.mimetype || "application/pdf",
          FileSizeBytes: input.file.size,
          ExtractionStatus: "PROCESSING",
          UploadedBy: input.uploadedBy,
          UploadedAt: input.now,
          LifecycleStatus: "ACTIVE",
          VersionNo: 1,
        },
        { transaction },
      );
      const rawDocumentId =
        document.DocumentId ??
        (document as { getDataValue?: (key: string) => unknown }).getDataValue?.(
          "DocumentId",
        );
      const documentId = Number(rawDocumentId);
      if (!Number.isInteger(documentId) || documentId <= 0) {
        throw new Error("AP_DOCUMENT was created without a DocumentId.");
      }
      const invoice = await EssaInvoice.create(
        {
          DocumentId: documentId,
          InvoiceNo: input.invoiceNo,
          InvoiceWorkflow: input.workflow,
          InvoiceType: "Pending",
          WorkflowStage: PROCESSING_STAGE,
          FailedChecks: 0,
          OpenExceptions: 0,
          Currency: "IDR",
          ...(withCorrelation ? { CorrelationId: input.correlationId } : {}),
          IsDeleted: false,
          CreatedDt: input.now,
          CreatedBy: input.uploadedBy,
          ModifiedDt: input.now,
          ModifiedBy: input.uploadedBy,
        },
        { transaction },
      );
      const invoiceId = Number(invoice.Id);
      await transaction.commit();
      return { documentId, invoiceId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /** Last queue attempt: leave a Failed row instead of Processing forever. */
  async markFailedFromQueue(documentId: number, message: string): Promise<void> {
    await this.markFailed(documentId, message, "ocr_failed");
  }

  /** Queue OCR again for an invoice whose background run failed. */
  async reprocessFailedUpload(
    documentId: number,
    actorUserId: number | null,
  ): Promise<AcceptedUpload> {
    if (!Number.isInteger(documentId) || documentId <= 0) {
      throw new APIError("Invoice was not found.", StatusCodeEnum.HTTP_NOT_FOUND);
    }
    const invoice = await EssaInvoice.findOne({
      where: { DocumentId: documentId, IsDeleted: false },
    });
    if (!invoice) {
      throw new APIError("Invoice was not found.", StatusCodeEnum.HTTP_NOT_FOUND);
    }
    if (invoice.WorkflowStage !== FAILED_STAGE) {
      throw new APIError(
        "Only a failed invoice can be re-run.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }
    const document = await ApDocument.findByPk(documentId);
    if (!document?.StoredFilePath) {
      throw new APIError(
        "The stored invoice file is missing, so it cannot be re-run.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    try {
      const absolutePath = assertPathInsideRoot(uploadRoot(), document.StoredFilePath);
      await fs.promises.access(absolutePath);
    } catch {
      throw new APIError(
        "The stored invoice file is missing, so it cannot be re-run.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const transaction = await sequelize.transaction();
    try {
      await invoice.update(
        {
          WorkflowStage: PROCESSING_STAGE,
          ModifiedDt: new Date(),
          ModifiedBy: actorUserId,
        },
        { transaction },
      );
      await document.update({ ExtractionStatus: "PROCESSING" }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await writeField(
      documentId,
      ASYNC_STATUS_DETAIL_FIELD,
      "Extracting and validating the uploaded document.",
    );
    await writeField(documentId, ASYNC_HEARTBEAT_FIELD, null);

    await auditRegister({
      objectId: `ocr-${documentId}`,
      invoiceId: documentId,
      correlationId: invoice.CorrelationId,
      source: "UPLOAD",
      actorId: actorUserId,
      actorType: actorUserId ? "USER" : "SYSTEM",
      oldValue: FAILED_STAGE,
      newValue: PROCESSING_STAGE,
      reasonRemarks: "Background OCR re-run requested",
    });

    try {
      await enqueueInvoiceOcr(documentId);
    } catch (error) {
      logger.error(
        `[AsyncUpload] re-run enqueue failed documentId=${documentId}; recovery will retry`,
        error,
      );
    }

    return {
      id: `ocr-${documentId}`,
      documentId,
      invoiceId: Number(invoice.Id),
      status: PROCESSING_STAGE,
      workflow_stage: PROCESSING_STAGE,
      fileName: document.OriginalFileName || invoice.InvoiceNo || "",
      invoice_no: invoice.InvoiceNo || "",
    };
  }

  /** Pick up processing rows after a restart. A live worker (fresh heartbeat) is left alone. */
  async recoverStuckProcessing(): Promise<number> {
    const rows = await EssaInvoice.findAll({
      where: { IsDeleted: false, WorkflowStage: PROCESSING_STAGE },
      attributes: ["DocumentId"],
    });
    let queued = 0;
    for (const row of rows) {
      const documentId = Number(row.DocumentId);
      if (!Number.isInteger(documentId) || documentId <= 0) continue;
      try {
        await enqueueInvoiceOcr(documentId);
        queued += 1;
      } catch (error) {
        logger.error(`[AsyncUpload] recovery enqueue failed documentId=${documentId}`, error);
      }
    }
    if (queued > 0) {
      logger.info(`[AsyncUpload] requeued ${queued} processing invoice(s)`);
    }
    return queued;
  }

  /**
   * BPD §8.1 — store matrix data points the classifier could not read.
   * A failure here does not fail OCR; the invoice stays on its existing stage.
   */
  private async recordMatrixReads(
    documentId: number,
    hintedDocumentType: string | null,
    primaryDocumentId: number | null,
    extractBody: Record<string, unknown> | undefined,
  ): Promise<void> {
    const targetId =
      Number(primaryDocumentId) > 0 ? Number(primaryDocumentId) : documentId;
    try {
      const unread = await matrixDocumentReadService.recordUnread({
        documentId: targetId,
        extractBody: extractBody || {},
        hintedDocumentType,
      });
      logger.info(
        `[MatrixRead] documentId=${targetId} unread=${unread}`,
      );
    } catch (error) {
      logger.error(`[MatrixRead] documentId=${targetId} failed`, error);
    }
  }

  private startHeartbeat(documentId: number): () => void {
    const write = () => {
      void writeField(documentId, ASYNC_HEARTBEAT_FIELD, String(Date.now())).catch(
        (error) => {
          logger.warn(
            `[AsyncUpload] heartbeat failed documentId=${documentId}`,
            error,
          );
        },
      );
    };
    write();
    const timer = setInterval(write, HEARTBEAT_WRITE_MS);
    return () => clearInterval(timer);
  }

  private async claim(documentId: number): Promise<boolean> {
    const transaction = await sequelize.transaction();
    try {
      const document = await ApDocument.findByPk(documentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const invoice = await EssaInvoice.findOne({
        where: { DocumentId: documentId, IsDeleted: false },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!document || !invoice || invoice.WorkflowStage !== PROCESSING_STAGE) {
        await transaction.commit();
        return false;
      }
      if (
        document.ExtractionStatus === "EXTRACTED" ||
        document.ExtractionStatus === "FAILED" ||
        document.ExtractionStatus === "SUPERSEDED"
      ) {
        await transaction.commit();
        return false;
      }
      if (document.ExtractionStatus === "EXTRACTING") {
        const raw = await ApDocumentExtraction.findOne({
          where: { DocumentId: documentId, FieldName: ASYNC_HEARTBEAT_FIELD },
          transaction,
        });
        const beat = raw?.FieldValue ? Number(raw.FieldValue) : null;
        if (heartbeatIsAlive(beat, Date.now(), ASYNC_HEARTBEAT_ALIVE_MS)) {
          await transaction.commit();
          return false;
        }
      }
      document.ExtractionStatus = "EXTRACTING";
      await document.save({ transaction });
      const beatRow = await ApDocumentExtraction.findOne({
        where: { DocumentId: documentId, FieldName: ASYNC_HEARTBEAT_FIELD },
        transaction,
      });
      const now = String(Date.now());
      if (beatRow) {
        await beatRow.update({ FieldValue: now }, { transaction });
      } else {
        await ApDocumentExtraction.create(
          {
            DocumentId: documentId,
            FieldName: ASYNC_HEARTBEAT_FIELD,
            FieldValue: now,
          },
          { transaction },
        );
      }
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async finalizeFromPrimary(
    placeholderDocumentId: number,
    primaryDocumentId: number,
    statusDetail?: string | null,
  ): Promise<void> {
    let invoice = await EssaInvoice.findOne({
      where: { DocumentId: placeholderDocumentId, IsDeleted: false },
    });
    if (!invoice) {
      invoice = await EssaInvoice.findOne({
        where: { DocumentId: primaryDocumentId, IsDeleted: false },
      });
    }
    if (!invoice || invoice.WorkflowStage !== PROCESSING_STAGE) return;

    if (Number(invoice.DocumentId) !== primaryDocumentId) {
      const transaction = await sequelize.transaction();
      try {
        const stray = await EssaInvoice.findOne({
          where: { DocumentId: primaryDocumentId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (stray && Number(stray.Id) !== Number(invoice.Id)) {
          // List backfill can insert a second row for the OCR package before
          // this job attaches it to the processing invoice. Drop that duplicate.
          await stray.destroy({ transaction });
        }
        await invoice.update(
          { DocumentId: primaryDocumentId, ModifiedDt: new Date() },
          { transaction },
        );
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    const primary = await ApDocument.findByPk(primaryDocumentId);
    const snapshot = await apInvoiceDocumentService.getUploadedInvoiceSnapshot(
      primaryDocumentId,
    );
    if (primary && snapshot) {
      await apInvoiceDocumentService.upsertEssaInvoiceFromSnapshot(
        primaryDocumentId,
        snapshot,
        primary,
      );
    } else {
      await invoice.update({
        WorkflowStage: "review",
        ModifiedDt: new Date(),
      });
    }

    if (placeholderDocumentId !== primaryDocumentId) {
      await ApDocument.update(
        { LifecycleStatus: "SUPERSEDED", ExtractionStatus: "SUPERSEDED" },
        { where: { DocumentId: placeholderDocumentId } },
      );
    }

    await writeField(
      primaryDocumentId,
      ASYNC_STATUS_DETAIL_FIELD,
      statusDetail ? String(statusDetail).slice(0, 500) : null,
    );

    const refreshed = await EssaInvoice.findOne({
      where: { DocumentId: primaryDocumentId, IsDeleted: false },
    });
    await auditExtractOk({
      objectId: `ocr-${primaryDocumentId}`,
      invoiceId: primaryDocumentId,
      correlationId: refreshed?.CorrelationId || invoice.CorrelationId,
      source: "UPLOAD",
      reasonRemarks: "Background OCR and validation finished",
      details: {
        placeholderDocumentId,
        primaryDocumentId,
        workflowStage: refreshed?.WorkflowStage || null,
      },
    });
  }

  private async markFailed(
    documentId: number,
    message: string,
    status?: string | null,
  ): Promise<void> {
    const safeMessage = String(message || "Invoice processing failed.").slice(0, 500);
    const invoice = await EssaInvoice.findOne({
      where: { DocumentId: documentId, IsDeleted: false },
    });
    const previous = invoice?.WorkflowStage || PROCESSING_STAGE;
    if (invoice && invoice.WorkflowStage === PROCESSING_STAGE) {
      await invoice.update({
        WorkflowStage: FAILED_STAGE,
        ModifiedDt: new Date(),
      });
    }
    await ApDocument.update(
      { ExtractionStatus: "FAILED" },
      {
        where: {
          DocumentId: documentId,
          ExtractionStatus: { [Op.notIn]: ["SUPERSEDED", "EXTRACTED"] },
        },
      },
    );
    await writeField(documentId, ASYNC_STATUS_DETAIL_FIELD, safeMessage);

    const correlationId = invoice?.CorrelationId || null;
    const base = {
      objectId: `ocr-${documentId}`,
      invoiceId: documentId,
      correlationId,
      source: "UPLOAD" as const,
      reasonRemarks: safeMessage,
      oldValue: previous,
      newValue: FAILED_STAGE,
      details: { status: status || null },
    };
    if (status === "duplicate_invoice") {
      await auditDuplicateDetected(base);
    } else if (
      status === "missing_mandatory_documents" ||
      status === "needs_invoice_type_review"
    ) {
      await auditRejectIntake(base);
    } else {
      await auditExtractFailed(base);
    }
    logger.info(
      `[AsyncUpload] documentId=${documentId} marked failed status=${status || "error"}`,
    );
  }
}

const apInvoiceAsyncUploadService = new ApInvoiceAsyncUploadService();
export default apInvoiceAsyncUploadService;
