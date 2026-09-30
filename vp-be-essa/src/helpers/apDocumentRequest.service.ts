import { Op } from "sequelize";
import { ApDocument } from "../models/apDocument";
import { ApDocumentExtraction } from "../models/apDocumentExtraction";
import {
  ApDocumentRequest,
  ApDocumentRequestItem,
} from "../models/apDocumentRequestAssociations";
import {
  buildDocReqSubject,
  formatEapaInvoiceId,
  formatRequestCode,
} from "./apEmailSubjectValidation";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { EssaInvoice } from "../models/essaInvoice";
import slaEngine from "./slaEngine.service";
import mail from "../utils/mail";
import { toStoredDocumentType, documentTypesMatch } from "./apDocumentTypeCanon";
import {
  auditDocAssociated,
  auditDocReceived,
  auditDocReplaced,
  auditDocRequestIssued,
} from "./invoiceProcessAudit.service";
import { mintCorrelationId } from "./auditEvent.service";

const BATCH_PRIMARY_FIELD = "__batchPrimary__";
const BATCH_SNAPSHOT_FIELD = "__batchSnapshot__";

async function resolveInvoiceAuditContext(primaryDocumentId: number) {
  const row = await EssaInvoice.findOne({
    where: { DocumentId: primaryDocumentId, IsDeleted: false },
  });
  const objectId = row?.InvoiceNo || `ocr-${primaryDocumentId}`;
  const correlationId =
    row?.CorrelationId || mintCorrelationId(`doc${primaryDocumentId}`);
  return {
    objectId,
    invoiceId: primaryDocumentId,
    correlationId,
    actorId: null as number | null,
  };
}

const SUBJECT_WARNING = [
  "IMPORTANT — Do not change the subject line of this email.",
  "Please use Reply (not a new message) and keep the subject exactly as it is.",
  'A "RE:" prefix added by your mail system is fine. If the subject is edited, we cannot match this reply to your invoice.',
].join("\n");

export type DocumentRequestItemInput = {
  documentType: string;
  reason: "MISSING" | "REPLACEMENT";
  targetDocumentId?: number | null;
};

export type CreateDocumentRequestInput = {
  primaryDocumentId: number;
  items: DocumentRequestItemInput[];
  vendorEmail?: string | null;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  createdBy?: number | null;
  /** Extra body paragraphs (e.g. validation issue list) appended after the DOCREQ instructions */
  extraBody?: string | null;
};

const normalizeDocumentType = (value: unknown): string =>
  toStoredDocumentType(value);

const labelForDocumentType = (documentType: string): string =>
  String(documentType || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const plainTextToHtml = (text: string): string =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "<br>\n");

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function assertPrimaryDocument(primaryDocumentId: number): Promise<ApDocument> {
  const primary = await ApDocument.findByPk(primaryDocumentId);
  if (!primary) {
    throw new APIError(
      "Invoice package not found for the given primaryDocumentId",
      StatusCodeEnum.HTTP_NOT_FOUND,
    );
  }
  const marker = await ApDocumentExtraction.findOne({
    where: {
      DocumentId: primaryDocumentId,
      FieldName: BATCH_PRIMARY_FIELD,
      FieldValue: "1",
    },
  });
  if (!marker) {
    // Still allow if a snapshot exists (primary may have been marked differently)
    const snapshot = await ApDocumentExtraction.findOne({
      where: {
        DocumentId: primaryDocumentId,
        FieldName: BATCH_SNAPSHOT_FIELD,
      },
    });
    if (!snapshot) {
      throw new APIError(
        "Document is not an invoice package primary",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
  }
  return primary;
}

function buildRequestBody(input: {
  vendorName: string;
  invoiceNumber: string;
  eapaInvoiceId: string;
  requestCode: string;
  items: Array<{ documentType: string; reason: string }>;
  extraBody?: string | null;
}): string {
  const lines: string[] = [
    `Dear ${input.vendorName || "Vendor"},`,
    "",
    SUBJECT_WARNING,
    "",
    `We need supporting documents for invoice ${input.invoiceNumber} (EAPA ${input.eapaInvoiceId}, request ${input.requestCode}).`,
    "",
    "Please reply to this email and attach the following PDF document(s):",
    "",
  ];

  input.items.forEach((item, index) => {
    const reasonLabel =
      String(item.reason).toUpperCase() === "REPLACEMENT"
        ? "replacement / correction"
        : "missing";
    lines.push(
      `${index + 1}. ${labelForDocumentType(item.documentType)} (${reasonLabel})`,
    );
  });

  lines.push(
    "",
    "Reply to this message (do not start a new email) so the subject line stays intact.",
    "",
  );

  if (input.extraBody && String(input.extraBody).trim()) {
    lines.push(String(input.extraBody).trim(), "");
  }

  lines.push("Regards,", "Accounts Payable Team", "ESSA");
  return lines.join("\n");
}

class ApDocumentRequestService {
  async createRequest(input: CreateDocumentRequestInput) {
    const primaryDocumentId = Number(input.primaryDocumentId);
    if (!Number.isInteger(primaryDocumentId) || primaryDocumentId <= 0) {
      throw new APIError(
        "A valid primaryDocumentId is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const rawItems = Array.isArray(input.items) ? input.items : [];
    if (!rawItems.length) {
      throw new APIError(
        "At least one document request item is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    await assertPrimaryDocument(primaryDocumentId);

    const items = rawItems.map((item) => {
      const documentType = normalizeDocumentType(item.documentType);
      const reason = String(item.reason || "MISSING")
        .trim()
        .toUpperCase();
      if (!documentType) {
        throw new APIError(
          "documentType is required on each item",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      if (reason !== "MISSING" && reason !== "REPLACEMENT") {
        throw new APIError(
          "reason must be MISSING or REPLACEMENT",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const targetId = Number(item.targetDocumentId);
      return {
        documentType,
        reason: reason as "MISSING" | "REPLACEMENT",
        targetDocumentId:
          Number.isInteger(targetId) && targetId > 0 ? targetId : null,
      };
    });

    // Reuse an open request for the same primary when items match, otherwise create new
    const existingOpen = await ApDocumentRequest.findOne({
      where: {
        PrimaryDocumentId: primaryDocumentId,
        Status: { [Op.in]: ["OPEN", "PARTIALLY_FULFILLED"] },
      },
      include: [{ model: ApDocumentRequestItem, as: "items" }],
      order: [["RequestId", "DESC"]],
    });

    let request = existingOpen;
    if (!request) {
      request = await ApDocumentRequest.create({
        PrimaryDocumentId: primaryDocumentId,
        Status: "OPEN",
        VendorEmail: input.vendorEmail || null,
        CreatedBy: input.createdBy ?? null,
      });
      await ApDocumentRequestItem.bulkCreate(
        items.map((item) => ({
          RequestId: Number(request!.RequestId),
          DocumentType: item.documentType,
          Reason: item.reason,
          TargetDocumentId: item.targetDocumentId,
          Status: "PENDING",
        })),
      );
    } else {
      // Refresh vendor email if provided
      if (input.vendorEmail) {
        await request.update({ VendorEmail: input.vendorEmail });
      }
      // Add any new pending types not already on the open request
      const existingItems = ((request as any).items ||
        []) as ApDocumentRequestItem[];
      const pendingTypes = new Set(
        existingItems
          .filter((i) => String(i.Status).toUpperCase() === "PENDING")
          .map((i) => normalizeDocumentType(i.DocumentType)),
      );
      const toAdd = items.filter((item) => !pendingTypes.has(item.documentType));
      if (toAdd.length) {
        await ApDocumentRequestItem.bulkCreate(
          toAdd.map((item) => ({
            RequestId: Number(request!.RequestId),
            DocumentType: item.documentType,
            Reason: item.reason,
            TargetDocumentId: item.targetDocumentId,
            Status: "PENDING",
          })),
        );
      }
    }

    const requestId = Number(request.RequestId);
    const refreshed = await this.getRequestById(requestId);
    if (!refreshed) {
      throw new APIError(
        "Failed to load created document request",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const pendingItems = refreshed.items.filter(
      (i) => String(i.status).toUpperCase() === "PENDING",
    );
    const documentTypes = pendingItems.map((i) => i.documentType);
    const vendorName = String(input.vendorName || "Vendor").trim() || "Vendor";
    const invoiceNumber =
      String(input.invoiceNumber || "").trim() || "UNKNOWN";
    const eapaInvoiceId = formatEapaInvoiceId(primaryDocumentId);
    const requestCode = formatRequestCode(requestId);
    const subject = buildDocReqSubject({
      primaryDocumentId,
      requestId,
      documentTypes,
      vendorName,
      invoiceNumber,
    });

    await ApDocumentRequest.update(
      { Subject: subject, VendorEmail: input.vendorEmail || refreshed.vendorEmail },
      { where: { RequestId: requestId } },
    );

    const body = buildRequestBody({
      vendorName,
      invoiceNumber,
      eapaInvoiceId,
      requestCode,
      items: pendingItems.map((i) => ({
        documentType: i.documentType,
        reason: i.reason,
      })),
      extraBody: input.extraBody,
    });

    logger.info(
      `[DocReq] Created/refreshed request ${requestCode} for ${eapaInvoiceId} types=${documentTypes.join(",")}`,
    );

    try {
      const invoice = await EssaInvoice.findOne({
        where: { DocumentId: primaryDocumentId, IsDeleted: false },
      });
      if (invoice) {
        await slaEngine.onDocumentRequestSent(invoice, String(requestId), {
          vendorEmail: input.vendorEmail || refreshed.vendorEmail || null,
        });
      }
    } catch (error) {
      logger.warn(`[DocReq] SLA trigger failed for request ${requestCode}`, error);
    }

    const auditCtx = await resolveInvoiceAuditContext(primaryDocumentId);
    void auditDocRequestIssued({
      ...auditCtx,
      actorId: input.createdBy ?? null,
      actorType: input.createdBy ? "USER" : "SYSTEM",
      source: input.createdBy ? "PORTAL" : "SYSTEM",
      reasonRemarks: `Document request ${requestCode} issued`,
      outcomeCode: pendingItems.some((i) => String(i.reason).toUpperCase() === "REPLACEMENT")
        ? "VCH-002"
        : "VCH-001",
      details: {
        requestId,
        requestCode,
        eapaInvoiceId,
        documentTypes,
        vendorEmail: input.vendorEmail || refreshed.vendorEmail || null,
        items: pendingItems.map((i) => ({
          documentType: i.documentType,
          reason: i.reason,
        })),
      },
    });

    return {
      requestId,
      requestCode,
      eapaInvoiceId,
      primaryDocumentId,
      status: refreshed.status,
      subject,
      body,
      to: input.vendorEmail || refreshed.vendorEmail || "",
      items: refreshed.items,
    };
  }

  async getRequestById(requestId: number) {
    const row = await ApDocumentRequest.findByPk(requestId, {
      include: [{ model: ApDocumentRequestItem, as: "items" }],
    });
    if (!row) return null;
    return this.serializeRequest(row);
  }

  async listRequestsForDocument(primaryDocumentId: number) {
    const rows = await ApDocumentRequest.findAll({
      where: { PrimaryDocumentId: primaryDocumentId },
      include: [{ model: ApDocumentRequestItem, as: "items" }],
      order: [["RequestId", "DESC"]],
    });
    return rows.map((row) => this.serializeRequest(row));
  }

  async cancelRequest(requestId: number) {
    const row = await ApDocumentRequest.findByPk(requestId, {
      include: [{ model: ApDocumentRequestItem, as: "items" }],
    });
    if (!row) {
      throw new APIError(
        "Document request not found",
        StatusCodeEnum.HTTP_NOT_FOUND,
      );
    }
    const status = String(row.Status || "").toUpperCase();
    if (status === "FULFILLED" || status === "CANCELLED") {
      return this.serializeRequest(row);
    }
    await row.update({
      Status: "CANCELLED",
      ClosedAt: new Date(),
    });
    const items = ((row as any).items || []) as ApDocumentRequestItem[];
    for (const item of items) {
      if (String(item.Status).toUpperCase() === "PENDING") {
        await item.update({ Status: "CANCELLED", UpdatedAt: new Date() });
      }
    }
    try {
      await slaEngine.onDocumentRequestCancelled(String(requestId));
    } catch (error) {
      logger.warn(`[DocReq] SLA cancel failed for request ${requestId}`, error);
    }
    return this.getRequestById(requestId);
  }

  /**
   * Send the locked [DOCREQ] subject + composed body to the vendor via SMTP.
   * Subject always comes from the stored request (never from the client).
   */
  async sendRequestEmail(input: {
    requestId: number;
    to?: string | null;
    body?: string | null;
  }) {
    const requestId = Number(input.requestId);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new APIError(
        "A valid request id is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const row = await ApDocumentRequest.findByPk(requestId, {
      include: [{ model: ApDocumentRequestItem, as: "items" }],
    });
    if (!row) {
      throw new APIError(
        "Document request not found",
        StatusCodeEnum.HTTP_NOT_FOUND,
      );
    }

    const status = String(row.Status || "").toUpperCase();
    if (status === "CANCELLED" || status === "FULFILLED") {
      throw new APIError(
        `Cannot send email for a ${status.toLowerCase()} document request`,
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const subject = String(row.Subject || "").trim();
    if (!subject) {
      throw new APIError(
        "Document request has no locked subject yet. Create the request again.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const to = String(input.to || row.VendorEmail || "")
      .trim()
      .toLowerCase();
    if (!to || !isValidEmail(to)) {
      throw new APIError(
        "A valid vendor email address is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const body = String(input.body || "").trim();
    if (!body) {
      throw new APIError(
        "Email message body is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    await row.update({ VendorEmail: to });

    const html = plainTextToHtml(body);
    let sendResult: { messageId?: string; previewUrl?: string } = {};
    try {
      sendResult = await mail.sendEmail(to, subject, html);
    } catch (error) {
      logger.error(`[DocReq] Failed to send request ${requestId} to ${to}:`, error);
      throw new APIError(
        error instanceof Error
          ? `Failed to send email: ${error.message}`
          : "Failed to send email to vendor",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const serialized = (await this.getRequestById(requestId)) || this.serializeRequest(row);
    logger.info(
      `[DocReq] Sent request ${serialized.requestCode} to ${to}${sendResult.messageId ? ` (${sendResult.messageId})` : ""
      }`,
    );

    const auditCtx = await resolveInvoiceAuditContext(Number(row.PrimaryDocumentId));
    void auditDocRequestIssued({
      ...auditCtx,
      source: "EMAIL",
      actorType: "SYSTEM",
      reasonRemarks: `Vendor chase email sent (${serialized.requestCode})`,
      outcomeCode: "VCH-003",
      details: {
        requestId,
        requestCode: serialized.requestCode,
        to,
        subject,
        messageId: sendResult.messageId || null,
      },
    });

    return {
      ...serialized,
      to,
      subject,
      body,
      sent: true,
      messageId: sendResult.messageId || null,
      previewUrl: sendResult.previewUrl || null,
    };
  }

  /**
   * Resolve an open request by id + primary document id for inbound DOCREQ correlation.
   */
  async resolveOpenRequest(input: {
    requestId: number;
    primaryDocumentId: number;
  }): Promise<{
    request: ApDocumentRequest;
    items: ApDocumentRequestItem[];
  } | null> {
    const request = await ApDocumentRequest.findOne({
      where: {
        RequestId: input.requestId,
        PrimaryDocumentId: input.primaryDocumentId,
        Status: { [Op.in]: ["OPEN", "PARTIALLY_FULFILLED"] },
      },
      include: [{ model: ApDocumentRequestItem, as: "items" }],
    });
    if (!request) return null;
    const items = ((request as any).items || []) as ApDocumentRequestItem[];
    return { request, items };
  }

  async markItemsReceived(input: {
    requestId: number;
    receivedByType: Record<string, number>;
  }): Promise<{
    status: string;
    items: ApDocumentRequestItem[];
  }> {
    const request = await ApDocumentRequest.findByPk(input.requestId, {
      include: [{ model: ApDocumentRequestItem, as: "items" }],
    });
    if (!request) {
      throw new APIError(
        "Document request not found",
        StatusCodeEnum.HTTP_NOT_FOUND,
      );
    }

    const items = ((request as any).items || []) as ApDocumentRequestItem[];
    const now = new Date();

    for (const item of items) {
      if (String(item.Status).toUpperCase() !== "PENDING") continue;
      const typeKey = normalizeDocumentType(item.DocumentType);
      const receivedId =
        input.receivedByType[typeKey] ??
        Object.entries(input.receivedByType).find(([key]) =>
          documentTypesMatch(key, typeKey),
        )?.[1];
      if (receivedId == null) continue;
      await item.update({
        Status: "RECEIVED",
        ReceivedDocumentId: receivedId,
        UpdatedAt: now,
      });
      item.Status = "RECEIVED";
      item.ReceivedDocumentId = receivedId;

      const auditCtx = await resolveInvoiceAuditContext(Number(request.PrimaryDocumentId));
      const isReplacement = String(item.Reason || "").toUpperCase() === "REPLACEMENT";
      void auditDocReceived({
        ...auditCtx,
        source: "EMAIL",
        reasonRemarks: `Document received for request item ${typeKey}`,
        outcomeCode: isReplacement ? "VCH-005" : "VCH-004",
        details: {
          requestId: Number(request.RequestId),
          documentType: typeKey,
          receivedDocumentId: receivedId,
          reason: item.Reason,
        },
      });
      if (isReplacement) {
        void auditDocReplaced({
          ...auditCtx,
          source: "SYSTEM",
          reasonRemarks: `Replacement document associated for ${typeKey}`,
          outcomeCode: "VCH-005",
          details: {
            requesterId: request.CreatedBy ?? null,
            submitterId: null,
            reviewingApUserId: null,
            reason: item.Reason,
            versionFrom: item.TargetDocumentId ?? null,
            versionTo: receivedId,
            affectedValidationResults: null,
            approvalImpact: "pending_revalidation",
            documentType: typeKey,
          },
        });
      } else {
        void auditDocAssociated({
          ...auditCtx,
          reasonRemarks: `Document associated to invoice package (${typeKey})`,
          outcomeCode: "VCH-004",
          details: {
            documentType: typeKey,
            receivedDocumentId: receivedId,
            requestId: Number(request.RequestId),
          },
        });
      }
    }

    const pendingLeft = items.filter(
      (i) => String(i.Status).toUpperCase() === "PENDING",
    ).length;
    const receivedCount = items.filter(
      (i) => String(i.Status).toUpperCase() === "RECEIVED",
    ).length;

    let nextStatus = String(request.Status);
    let closedAt: Date | null = request.ClosedAt;
    if (pendingLeft === 0 && receivedCount > 0) {
      nextStatus = "FULFILLED";
      closedAt = now;
    } else if (receivedCount > 0) {
      nextStatus = "PARTIALLY_FULFILLED";
      closedAt = null;
    }

    await request.update({
      Status: nextStatus,
      ClosedAt: closedAt,
    });

    if (nextStatus === "FULFILLED") {
      try {
        const invoice = await EssaInvoice.findOne({
          where: { DocumentId: request.PrimaryDocumentId, IsDeleted: false },
        });
        if (invoice) {
          await slaEngine.onVendorDocumentReceived(String(input.requestId), invoice);
        }
      } catch (error) {
        logger.warn(
          `[DocReq] SLA resume failed for request ${input.requestId}`,
          error,
        );
      }
    }

    return { status: nextStatus, items };
  }

  private serializeRequest(row: ApDocumentRequest) {
    const items = ((row as any).items || []) as ApDocumentRequestItem[];
    const requestId = Number(row.RequestId);
    const primaryDocumentId = Number(row.PrimaryDocumentId);
    return {
      requestId,
      requestCode: formatRequestCode(requestId),
      eapaInvoiceId: formatEapaInvoiceId(primaryDocumentId),
      primaryDocumentId,
      status: row.Status,
      vendorEmail: row.VendorEmail,
      subject: row.Subject,
      graphDraftMessageId: row.GraphDraftMessageId,
      createdBy: row.CreatedBy,
      createdAt: row.CreatedAt?.toISOString?.() || null,
      closedAt: row.ClosedAt?.toISOString?.() || null,
      items: items.map((item) => ({
        requestItemId: Number(item.RequestItemId),
        documentType: item.DocumentType,
        reason: item.Reason,
        targetDocumentId: item.TargetDocumentId
          ? Number(item.TargetDocumentId)
          : null,
        status: item.Status,
        receivedDocumentId: item.ReceivedDocumentId
          ? Number(item.ReceivedDocumentId)
          : null,
      })),
    };
  }
}

export default new ApDocumentRequestService();
