import { Op } from "sequelize";
import { ApDocumentExtraction } from "../models/apDocumentExtraction";
import { EssaInvoice } from "../models/essaInvoice";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import {
  mintCorrelationId,
  writeAudit,
  roleLabelFromId,
  type AuditSource,
} from "./auditEvent.service";
import {
  auditClassify,
  auditExtractFailed,
  auditExtractOk,
  auditHitlAssign,
  auditRegister,
} from "./invoiceProcessAudit.service";
import { User } from "../models/user";
import { validateEmailSubject } from "./apEmailSubjectValidation";
import logger from "../utils/logger";

const HITL_CONFIDENCE_THRESHOLD = Number(
  process.env.AP_HITL_CONFIDENCE_THRESHOLD || 80,
);

export type ActionActor = {
  userId?: number | null;
  name?: string | null;
  role?: string | null;
  ip?: string | null;
};

const toFieldCode = (raw: string): string =>
  String(raw || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s.-]+/g, "_")
    .toUpperCase() || "FIELD";

const displayValue = (value: unknown): string => {
  if (value == null) return "—";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  const s = String(value).trim();
  if (!s) return "—";
  const asNum = Number(s.replace(/,/g, ""));
  if (/^-?[\d,.]+$/.test(s) && Number.isFinite(asNum) && s.replace(/[^\d]/g, "").length >= 4) {
    return asNum.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return s;
};

export function parseInvoiceRef(raw: string): { documentId?: number; invoiceNo?: string; essaId?: number } {
  const id = String(raw || "").trim();
  if (!id) return {};
  const ocr = id.match(/^ocr-(\d+)$/i);
  if (ocr) return { documentId: Number(ocr[1]) };
  const inv = id.match(/^inv-(\d+)$/i);
  if (inv) return { essaId: Number(inv[1]) };
  if (/^\d+$/.test(id)) return { documentId: Number(id), essaId: Number(id) };
  return { invoiceNo: id };
}

export async function resolveEssaInvoice(rawId: string): Promise<EssaInvoice> {
  const ref = parseInvoiceRef(rawId);
  let row: EssaInvoice | null = null;
  if (ref.documentId) {
    row = await EssaInvoice.findOne({ where: { DocumentId: ref.documentId, IsDeleted: false } });
  }
  if (!row && ref.essaId) {
    row = await EssaInvoice.findOne({ where: { Id: ref.essaId, IsDeleted: false } });
  }
  if (!row && ref.invoiceNo) {
    row = await EssaInvoice.findOne({
      where: { InvoiceNo: ref.invoiceNo, IsDeleted: false },
      order: [["Id", "DESC"]],
    });
  }
  if (!row) {
    throw new APIError("Invoice not found", StatusCodeEnum.HTTP_NOT_FOUND);
  }
  return row;
}

export function invoiceObjectId(row: EssaInvoice): string {
  return row.InvoiceNo || `ocr-${row.DocumentId}` || `INV-${row.Id}`;
}

export async function ensureCorrelationId(
  row: EssaInvoice,
  hint?: string | null,
): Promise<string> {
  if (row.CorrelationId) return row.CorrelationId;
  const correlationId = mintCorrelationId(hint || `inv${row.Id}`);
  await row.update({ CorrelationId: correlationId });
  row.CorrelationId = correlationId;
  return correlationId;
}

async function resolveActor(actor: ActionActor) {
  const userId = Number(actor.userId);
  if (Number.isFinite(userId) && userId > 0) {
    const user = await User.findByPk(userId);
    return {
      actorId: userId,
      actorName: actor.name || user?.Name || `User ${userId}`,
      actorRole: actor.role || roleLabelFromId(user?.Role_id),
      actorType: "USER" as const,
    };
  }
  return {
    actorId: "system",
    actorName: actor.name || "AP Automation Engine",
    actorRole: actor.role || "SYSTEM",
    actorType: "SYSTEM" as const,
  };
}

function sourceFromChannel(channel?: string | null): AuditSource {
  const c = String(channel || "").toUpperCase();
  if (c === "EMAIL") return "EMAIL";
  if (c === "SHAREPOINT" || c === "SP") return "SHAREPOINT";
  if (c === "UPLOAD" || c === "MANUAL") return "UPLOAD";
  if (c === "TEAMS") return "TEAMS";
  if (c === "RPA") return "RPA";
  if (c === "SYSTEM" || c === "BACKEND") return "SYSTEM";
  return "PORTAL";
}

async function loadLowConfidenceFields(documentId: number): Promise<
  Array<{ fieldCode: string; confidence: number }>
> {
  const rows = await ApDocumentExtraction.findAll({
    where: { DocumentId: documentId },
    attributes: ["FieldName", "Confidence"],
    order: [["ExtractionId", "DESC"]],
    limit: 500,
  });
  const seen = new Set<string>();
  const low: Array<{ fieldCode: string; confidence: number }> = [];
  for (const row of rows) {
    const name = String(row.FieldName || "").trim();
    if (!name || name.startsWith("__") || seen.has(name)) continue;
    seen.add(name);
    const conf = Number((row as any).Confidence);
    if (!Number.isFinite(conf)) continue;
    const pct = conf <= 1 ? conf * 100 : conf;
    if (pct < HITL_CONFIDENCE_THRESHOLD) {
      low.push({ fieldCode: toFieldCode(name), confidence: Number(pct.toFixed(2)) });
    }
  }
  return low;
}

/** Called when ESSA_INVOICE is first created from OCR persist. */
export async function auditInvoiceCreated(
  row: EssaInvoice,
  options: { sourceChannel?: string | null; actorUserId?: number | null } = {},
): Promise<void> {
  try {
    const correlationId = await ensureCorrelationId(row);
    const source = sourceFromChannel(options.sourceChannel);
    const objectId = invoiceObjectId(row);
    const invoiceId = Number(row.DocumentId);
    const base = {
      objectId,
      invoiceId,
      correlationId,
      source,
    };

    await auditRegister({
      ...base,
      actorId: options.actorUserId ?? null,
      actorType: options.actorUserId ? "USER" : "SYSTEM",
      newValue: row.InvoiceNo || objectId,
      reasonRemarks: "Invoice registered as Draft",
      details: {
        workflowStage: row.WorkflowStage || "draft",
        invoiceWorkflow: row.InvoiceWorkflow,
        invoiceType: row.InvoiceType,
        sourceChannel: options.sourceChannel || source,
      },
    });

    await auditClassify({
      ...base,
      newValue: row.InvoiceType || row.InvoiceWorkflow || null,
      reasonRemarks: "Category / document type resolved",
      details: {
        invoiceWorkflow: row.InvoiceWorkflow,
        invoiceType: row.InvoiceType,
      },
    });

    await auditExtractOk({
      ...base,
      source: "SYSTEM",
      reasonRemarks: "OCR extraction persisted",
      details: {
        promptOrEngine: "ocr-demo",
        documentId: invoiceId,
      },
    });

    const lowFields = await loadLowConfidenceFields(invoiceId);
    if (lowFields.length) {
      await auditHitlAssign({
        ...base,
        reasonRemarks: `${lowFields.length} low-confidence field(s) routed to HITL`,
        details: {
          threshold: HITL_CONFIDENCE_THRESHOLD,
          fields: lowFields.slice(0, 50),
        },
      });
    }
  } catch (error) {
    logger.warn(`Failed to write intake/EXTRACT audit for invoice ${row.Id}`, error);
  }
}

/** Intake OCR/persist/download failures — EXTRACT_FAILED with channel source. */
export async function auditInboundExtractFailure(input: {
  reason: string;
  inboundEmailId?: number | null;
  inboundSharePointId?: number | null;
  messageId?: string | null;
  subject?: string | null;
  fileName?: string | null;
  invoiceWorkflow?: string | null;
  primaryDocumentId?: number | null;
  stage?: string | null;
  source?: AuditSource | string | null;
}): Promise<void> {
  try {
    const source = sourceFromChannel(input.source || (input.inboundSharePointId ? "SHAREPOINT" : "EMAIL"));
    const subjectCheck = input.subject ? validateEmailSubject(input.subject) : null;
    const invoiceNo =
      subjectCheck && subjectCheck.valid === true ? subjectCheck.invoiceNumber : null;
    const objectId =
      invoiceNo ||
      (input.primaryDocumentId ? `ocr-${input.primaryDocumentId}` : null) ||
      (input.fileName ? String(input.fileName) : null) ||
      (input.inboundEmailId ? `email-${input.inboundEmailId}` : null) ||
      (input.inboundSharePointId ? `sp-${input.inboundSharePointId}` : null) ||
      `${source}-UNKNOWN`;

    const remarks = [
      input.stage,
      input.reason,
      input.fileName ? `file=${input.fileName}` : null,
      input.invoiceWorkflow ? `workflow=${input.invoiceWorkflow}` : null,
      input.subject ? `subject=${input.subject}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 2000);

    const corrHint =
      input.inboundEmailId != null
        ? `email${input.inboundEmailId}`
        : input.inboundSharePointId != null
          ? `sp${input.inboundSharePointId}`
          : input.messageId || source.toLowerCase();

    await auditExtractFailed({
      objectId,
      invoiceId: input.primaryDocumentId ?? null,
      source,
      reasonRemarks: remarks,
      correlationId: mintCorrelationId(corrHint),
      actorName: source === "SHAREPOINT" ? "SharePoint Intake" : "Email Intake",
      newValue: "FAIL",
      details: {
        stage: input.stage,
        fileName: input.fileName,
        inboundEmailId: input.inboundEmailId ?? null,
        inboundSharePointId: input.inboundSharePointId ?? null,
      },
    });
  } catch (error) {
    logger.warn(
      `Failed to write EXTRACT_FAILED audit: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function correctExtractedFields(
  rawId: string,
  body: {
    reason?: string;
    reasonRemarks?: string;
    fields?: Array<{ fieldName?: string; fieldCode?: string; value?: string | null }> | Record<string, string | null>;
    source?: string;
  },
  actor: ActionActor,
) {
  const reason = String(body.reasonRemarks || body.reason || "").trim();
  if (!reason) {
    throw new APIError("reason_remarks is required for field corrections", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  const row = await resolveEssaInvoice(rawId);
  const correlationId = await ensureCorrelationId(row);
  const actorInfo = await resolveActor(actor);

  let fieldEntries: Array<{ fieldName: string; value: string | null }> = [];
  if (Array.isArray(body.fields)) {
    fieldEntries = body.fields
      .map((f) => ({
        fieldName: String(f.fieldName || f.fieldCode || "").trim(),
        value: f.value == null ? null : String(f.value),
      }))
      .filter((f) => f.fieldName);
  } else if (body.fields && typeof body.fields === "object") {
    fieldEntries = Object.entries(body.fields).map(([fieldName, value]) => ({
      fieldName: String(fieldName).trim(),
      value: value == null ? null : String(value),
    }));
  }

  if (!fieldEntries.length) {
    throw new APIError("At least one field correction is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  const events = [];
  for (const entry of fieldEntries) {
    const candidates = [
      entry.fieldName,
      toFieldCode(entry.fieldName),
      entry.fieldName.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      entry.fieldName.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, ""),
    ].filter(Boolean);

    let existing = await ApDocumentExtraction.findOne({
      where: {
        DocumentId: row.DocumentId,
        FieldName: { [Op.in]: [...new Set(candidates)] },
      },
      order: [["ExtractionId", "DESC"]],
    });
    if (!existing) {
      existing = await ApDocumentExtraction.findOne({
        where: {
          DocumentId: row.DocumentId,
          FieldName: { [Op.iLike]: entry.fieldName },
        },
        order: [["ExtractionId", "DESC"]],
      });
    }

    const previous = existing?.FieldValue ?? null;
    const next = entry.value;
    if (String(previous ?? "") === String(next ?? "")) continue;

    const isManualEnter = !existing;
    if (existing) {
      await existing.update({ FieldValue: next });
    } else {
      await ApDocumentExtraction.create({
        DocumentId: row.DocumentId,
        FieldName: entry.fieldName,
        FieldValue: next,
      });
    }

    const fieldCode = toFieldCode(existing?.FieldName || entry.fieldName);
    const audit = await writeAudit({
      action: isManualEnter ? "MANUAL_ENTER" : "CORRECT",
      objectType: "INVOICE",
      objectId: invoiceObjectId(row),
      invoiceId: Number(row.DocumentId),
      fieldCode,
      oldValue: displayValue(previous),
      newValue: displayValue(next),
      reasonRemarks: reason,
      source: (body.source as AuditSource) || "PORTAL",
      correlationId,
      result: "SUCCESS",
      actorId: actorInfo.actorId,
      actorName: actorInfo.actorName,
      actorRole: actorInfo.actorRole,
      actorType: actorInfo.actorType,
      ip: actor.ip,
    });
    events.push(audit);
  }

  // Keep header denormalised columns in sync for common fields
  const headerPatch: Record<string, unknown> = { ModifiedDt: new Date(), ModifiedBy: actor.userId || null };
  for (const entry of fieldEntries) {
    const key = entry.fieldName.toLowerCase();
    if (["invoicenumber", "invoice_no", "invno"].includes(key) && entry.value) {
      headerPatch.InvoiceNo = entry.value;
    }
    if (["ponumber", "po_number"].includes(key)) headerPatch.PoNumber = entry.value;
    if (["vendorname", "vendor_name"].includes(key)) headerPatch.VendorName = entry.value;
    if (["totalamount", "total_amount", "invoiceamount", "invoice_amount"].includes(key) && entry.value != null) {
      const n = Number(String(entry.value).replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n)) headerPatch.TotalAmount = n;
    }
  }
  await row.update(headerPatch);
  await row.reload();

  return {
    invoice: {
      id: `ocr-${row.DocumentId}`,
      documentId: Number(row.DocumentId),
      invoice_no: row.InvoiceNo,
      correlation_id: correlationId,
      workflow_stage: row.WorkflowStage,
    },
    events: events.map((e) => ({
      event_id: e.EventId,
      action: e.Action,
      field_code: e.FieldCode,
      old_value: e.OldValue,
      new_value: e.NewValue,
    })),
    timeline_hint: {
      event_type: "manual_correction",
      message: reason,
      actor_name: actorInfo.actorName,
      actor_role: actorInfo.actorRole,
    },
  };
}

/** AP confirms extracted value(s) unchanged — auditable control decision. */
export async function verifyExtractedFields(
  rawId: string,
  body: {
    reason?: string;
    reasonRemarks?: string;
    fields?: Array<{ fieldName?: string; fieldCode?: string; value?: string | null }> | string[];
    source?: string;
  },
  actor: ActionActor,
) {
  const reason = String(
    body.reasonRemarks || body.reason || "AP verified extracted value without change",
  ).trim();
  const row = await resolveEssaInvoice(rawId);
  const correlationId = await ensureCorrelationId(row);
  const actorInfo = await resolveActor(actor);

  let fieldNames: string[] = [];
  if (Array.isArray(body.fields)) {
    fieldNames = body.fields
      .map((f) => (typeof f === "string" ? f : String(f.fieldName || f.fieldCode || "").trim()))
      .filter(Boolean);
  }
  if (!fieldNames.length) {
    throw new APIError(
      "At least one field is required for VERIFY",
      StatusCodeEnum.HTTP_BAD_REQUEST,
    );
  }

  const events = [];
  for (const fieldName of fieldNames) {
    const candidates = [
      fieldName,
      toFieldCode(fieldName),
      fieldName.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
    ].filter(Boolean);

    let existing = await ApDocumentExtraction.findOne({
      where: {
        DocumentId: row.DocumentId,
        FieldName: { [Op.in]: [...new Set(candidates)] },
      },
      order: [["ExtractionId", "DESC"]],
    });
    if (!existing) {
      existing = await ApDocumentExtraction.findOne({
        where: {
          DocumentId: row.DocumentId,
          FieldName: { [Op.iLike]: fieldName },
        },
        order: [["ExtractionId", "DESC"]],
      });
    }

    const value = existing?.FieldValue ?? null;
    const fieldCode = toFieldCode(existing?.FieldName || fieldName);
    const audit = await writeAudit({
      action: "VERIFY",
      objectType: "INVOICE",
      objectId: invoiceObjectId(row),
      invoiceId: Number(row.DocumentId),
      fieldCode,
      oldValue: displayValue(value),
      newValue: displayValue(value),
      reasonRemarks: reason,
      source: (body.source as AuditSource) || "PORTAL",
      correlationId,
      result: "SUCCESS",
      actorId: actorInfo.actorId,
      actorName: actorInfo.actorName,
      actorRole: actorInfo.actorRole,
      actorType: actorInfo.actorType,
      ip: actor.ip,
      details: {
        confidence: existing?.Confidence != null ? Number(existing.Confidence) : null,
        acceptedUnchanged: true,
      },
    });
    events.push(audit);
  }

  return {
    invoice: {
      id: `ocr-${row.DocumentId}`,
      documentId: Number(row.DocumentId),
      invoice_no: row.InvoiceNo,
      correlation_id: correlationId,
      workflow_stage: row.WorkflowStage,
    },
    events: events.map((e) => ({
      event_id: e.EventId,
      action: e.Action,
      field_code: e.FieldCode,
      old_value: e.OldValue,
      new_value: e.NewValue,
    })),
    timeline_hint: {
      event_type: "hitl_verify",
      message: reason,
      actor_name: actorInfo.actorName,
      actor_role: actorInfo.actorRole,
    },
  };
}

export async function approveOrRejectInvoice(
  rawId: string,
  body: { decision?: string; note?: string; reason?: string; reasonRemarks?: string; source?: string },
  actor: ActionActor,
) {
  const decision = String(body.decision || "").trim().toLowerCase();
  if (decision !== "approved" && decision !== "rejected") {
    throw new APIError("decision must be 'approved' or 'rejected'", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  const reason = String(body.reasonRemarks || body.reason || body.note || "").trim();
  if (decision === "rejected" && !reason) {
    throw new APIError("reason_remarks is required when rejecting", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  const row = await resolveEssaInvoice(rawId);
  const correlationId = await ensureCorrelationId(row);
  const actorInfo = await resolveActor(actor);
  const previousStage = row.WorkflowStage;
  const nextStage = decision === "approved" ? "approved" : "rejected";

  await row.update({
    WorkflowStage: nextStage,
    ModifiedDt: new Date(),
    ModifiedBy: actor.userId || null,
  });

  const action = decision === "approved" ? "APPROVE" : "REJECT";
  const audit = await writeAudit({
    action,
    objectType: "INVOICE",
    objectId: invoiceObjectId(row),
    invoiceId: Number(row.DocumentId),
    oldValue: previousStage,
    newValue: nextStage,
    reasonRemarks: reason || null,
    source: (body.source as AuditSource) || "PORTAL",
    correlationId,
    result: decision === "approved" ? "SUCCESS" : "REJECTED",
    actorId: actorInfo.actorId,
    actorName: actorInfo.actorName,
    actorRole: actorInfo.actorRole,
    actorType: actorInfo.actorType,
    ip: actor.ip,
  });

  return {
    invoice: {
      id: `ocr-${row.DocumentId}`,
      documentId: Number(row.DocumentId),
      invoice_no: row.InvoiceNo,
      workflow_stage: nextStage,
      correlation_id: correlationId,
    },
    event: {
      event_id: audit.EventId,
      action: audit.Action,
      result: audit.Result,
    },
    timeline_hint: {
      event_type: decision === "approved" ? "approved" : "rejected",
      message: reason || (decision === "approved" ? "Approved" : "Rejected"),
      actor_name: actorInfo.actorName,
      actor_role: actorInfo.actorRole,
    },
  };
}

export async function overrideValidation(
  rawId: string,
  body: {
    ruleCode?: string;
    fieldCode?: string;
    reason?: string;
    reasonRemarks?: string;
    source?: string;
  },
  actor: ActionActor,
) {
  const reason = String(body.reasonRemarks || body.reason || "").trim();
  if (!reason) {
    throw new APIError("reason_remarks is required for overrides", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  const fieldCode = toFieldCode(body.fieldCode || body.ruleCode || "VALIDATION");

  const row = await resolveEssaInvoice(rawId);
  const correlationId = await ensureCorrelationId(row);
  const actorInfo = await resolveActor(actor);

  const audit = await writeAudit({
    action: "OVERRIDE",
    objectType: "INVOICE",
    objectId: invoiceObjectId(row),
    invoiceId: Number(row.DocumentId),
    fieldCode,
    reasonRemarks: reason,
    source: (body.source as AuditSource) || "PORTAL",
    correlationId,
    result: "OVERRIDDEN",
    actorId: actorInfo.actorId,
    actorName: actorInfo.actorName,
    actorRole: actorInfo.actorRole,
    actorType: actorInfo.actorType,
    ip: actor.ip,
    newValue: "OVERRIDDEN",
  });

  return {
    invoice: {
      id: `ocr-${row.DocumentId}`,
      documentId: Number(row.DocumentId),
      invoice_no: row.InvoiceNo,
      correlation_id: correlationId,
    },
    event: {
      event_id: audit.EventId,
      action: audit.Action,
      field_code: audit.FieldCode,
      result: audit.Result,
    },
    timeline_hint: {
      event_type: "exception",
      message: `Override ${fieldCode}: ${reason}`,
      actor_name: actorInfo.actorName,
      actor_role: actorInfo.actorRole,
    },
  };
}

export default {
  correctExtractedFields,
  verifyExtractedFields,
  approveOrRejectInvoice,
  overrideValidation,
  auditInvoiceCreated,
  auditInboundExtractFailure,
  ensureCorrelationId,
  resolveEssaInvoice,
  invoiceObjectId,
};
