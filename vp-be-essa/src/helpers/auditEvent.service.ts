import { Op, QueryTypes, WhereOptions } from "sequelize";
import { randomBytes } from "crypto";
import { sequelize } from "../config/sequelize";
import { EssaAuditEvent } from "../models/essaAuditEvent";
import { User } from "../models/user";
import { UserRole } from "../utils/enums/role.enum";
import logger from "../utils/logger";

export type AuditActorType = "USER" | "SYSTEM" | "INTEGRATION";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "CORRECT"
  | "OVERRIDE"
  | "APPROVE"
  | "REJECT"
  | "ESCALATE"
  | "REVALIDATE"
  | "EXTRACT"
  | "EXTRACT_FAILED"
  | "VALIDATE"
  | "MATCH"
  | "LOGIN"
  | "LOGOUT"
  | "AUTHORIZE"
  | "RECEIVE"
  | "REGISTER"
  | "CLASSIFY"
  | "REJECT_INTAKE"
  | "DUPLICATE_DETECTED"
  | "SUPERSEDE"
  | "DOC_REQUEST_ISSUED"
  | "DOC_RECEIVED"
  | "DOC_ASSOCIATED"
  | "DOC_REPLACED"
  | "DOC_REQUEST_ESCALATED"
  | "HITL_ASSIGN"
  | "VERIFY"
  | "MANUAL_ENTER"
  | "VALIDATE_RUN"
  | "RULE_FAIL"
  | "RULE_WARN"
  | "RULE_HARD_FAIL";

export type AuditSource =
  | "PORTAL"
  | "EMAIL"
  | "SHAREPOINT"
  | "TEAMS"
  | "RPA"
  | "SYSTEM"
  | "UPLOAD";

export type AuditResult = "SUCCESS" | "FAIL" | "OVERRIDDEN" | "DENIED" | "REJECTED" | "PASS";

export type AuditObjectType =
  | "INVOICE"
  | "DOCUMENT"
  | "FIELD"
  | "WORKFLOW"
  | "RULE"
  | "CONFIG"
  | "VENDOR"
  | "SESSION";

export type AuditActorInput = {
  actorId?: string | number | null;
  actorName?: string | null;
  actorRole?: string | null;
  actorType?: AuditActorType;
};

export type WriteAuditInput = AuditActorInput & {
  action: AuditAction | string;
  objectType: AuditObjectType | string;
  objectId: string;
  fieldCode?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reasonRemarks?: string | null;
  source?: AuditSource | string;
  correlationId?: string | null;
  result?: AuditResult | string;
  invoiceId?: number | null;
  ip?: string | null;
  eventTime?: Date | string | null;
  /** Structured maker-checker / N-way / replacement payload. */
  details?: Record<string, unknown> | null;
  /** Rule outcome code e.g. PO-005, SES-007, TAX-004. */
  outcomeCode?: string | null;
};

export type AuditListQuery = {
  search?: string;
  objectType?: string;
  objectId?: string;
  action?: string;
  source?: string;
  result?: string;
  actorId?: string;
  actorName?: string;
  fieldCode?: string;
  correlationId?: string;
  invoiceId?: string | number;
  outcomeCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string | number;
  pageSize?: string | number;
  sortBy?: string;
  sortDir?: string;
};

const ROLE_LABEL: Record<number, string> = {
  [UserRole.VENDOR]: "VENDOR",
  [UserRole.FINANCE]: "AP_PROCESSOR",
  [UserRole.BUSINESS]: "BUSINESS",
  [UserRole.ADMIN]: "ADMIN",
  [UserRole.AP_TEAM]: "AP_PROCESSOR",
  [UserRole.AP_SUPERVISOR]: "AP_SUPERVISOR",
  [UserRole.AP_LEAD]: "AP_LEAD",
  [UserRole.FINANCE_MANAGER]: "FINANCE_MANAGER",
  [UserRole.HOS]: "HOS",
  [UserRole.HOD]: "HOD",
  [UserRole.HOF]: "HOF",
  [UserRole.STH]: "STH",
  [UserRole.GFD]: "GFD",
};

export function mintCorrelationId(hint?: string | null): string {
  const raw = String(hint || "").trim();
  if (raw) {
    if (raw.toUpperCase().startsWith("CORR-")) return raw;
    return `CORR-${raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24)}`;
  }
  return `CORR-${randomBytes(4).toString("hex")}`;
}

export function roleLabelFromId(roleId?: number | null): string {
  if (roleId == null) return "SYSTEM";
  return ROLE_LABEL[roleId] || `ROLE_${roleId}`;
}

async function nextEventId(): Promise<string> {
  try {
    const rows = (await sequelize.query(
      `SELECT nextval('"ESSA_AUDIT_EVENT_ID_SEQ"') AS "nextId"`,
      { type: QueryTypes.SELECT },
    )) as Array<{ nextId: string | number }>;
    const n = Number(rows?.[0]?.nextId);
    if (Number.isFinite(n) && n > 0) return `AUD-${n}`;
  } catch (error) {
    logger.warn("ESSA_AUDIT_EVENT_ID_SEQ unavailable; falling back to timestamp id", error);
  }
  return `AUD-${Date.now()}`;
}

async function resolveActor(input: AuditActorInput): Promise<{
  actorId: string | null;
  actorName: string;
  actorRole: string;
  actorType: AuditActorType;
}> {
  const actorType: AuditActorType = input.actorType || (input.actorId ? "USER" : "SYSTEM");
  if (actorType === "SYSTEM" || actorType === "INTEGRATION") {
    return {
      actorId: input.actorId != null ? String(input.actorId) : actorType.toLowerCase(),
      actorName: input.actorName || (actorType === "INTEGRATION" ? "Integration" : "AP Automation Engine"),
      actorRole: input.actorRole || "SYSTEM",
      actorType,
    };
  }

  const numericId = Number(input.actorId);
  if (Number.isFinite(numericId) && numericId > 0) {
    const user = await User.findByPk(numericId);
    return {
      actorId: String(numericId),
      actorName: input.actorName || user?.Name || `User ${numericId}`,
      actorRole: input.actorRole || roleLabelFromId(user?.Role_id),
      actorType: "USER",
    };
  }

  return {
    actorId: input.actorId != null ? String(input.actorId) : null,
    actorName: input.actorName || "Unknown",
    actorRole: input.actorRole || "UNKNOWN",
    actorType: "USER",
  };
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalizeSource(source?: string | null): string {
  const s = String(source || "PORTAL").trim().toUpperCase();
  if (s === "BACKEND" || s === "SCHEDULER") return "SYSTEM";
  if (s === "ENTRA_SSO" || s === "V1_SWITCH") return "PORTAL";
  if (s === "SP" || s === "SHARE_POINT") return "SHAREPOINT";
  if (s === "MANUAL" || s === "PORTAL_UPLOAD") return "UPLOAD";
  return s || "PORTAL";
}

export function toAuditDto(row: EssaAuditEvent) {
  return {
    event_id: row.EventId,
    event_time: toIso(row.EventTime),
    action: row.Action,
    field_code: row.FieldCode,
    old_value: row.OldValue,
    new_value: row.NewValue,
    actor_id: row.ActorId,
    actor_name: row.ActorName,
    actor_role: row.ActorRole,
    actor_type: row.ActorType,
    reason_remarks: row.ReasonRemarks,
    source: normalizeSource(row.Source),
    correlation_id: row.CorrelationId,
    result: row.Result,
    object_type: row.ObjectType,
    object_id: row.ObjectId,
    /** AP_DOCUMENT.DocumentId when object is an invoice (used for ocr-{id} deep links). */
    invoice_id: row.InvoiceId,
    document_id: row.InvoiceId,
    ip: row.Ip,
    outcome_code: row.OutcomeCode,
    details: (() => {
      if (!row.DetailsJson) return null;
      try {
        return JSON.parse(row.DetailsJson);
      } catch {
        return { raw: row.DetailsJson };
      }
    })(),
  };
}

/**
 * Append-only business audit writer. Never updates or deletes.
 */
export async function writeAudit(input: WriteAuditInput): Promise<EssaAuditEvent> {
  const actor = await resolveActor(input);
  const eventId = await nextEventId();
  const eventTime = input.eventTime ? new Date(input.eventTime) : new Date();

  const row = await EssaAuditEvent.create({
    EventId: eventId,
    EventTime: Number.isNaN(eventTime.getTime()) ? new Date() : eventTime,
    Action: String(input.action || "").trim().toUpperCase() || "UPDATE",
    FieldCode: input.fieldCode ? String(input.fieldCode).trim() : null,
    OldValue: input.oldValue != null ? String(input.oldValue) : null,
    NewValue: input.newValue != null ? String(input.newValue) : null,
    ActorId: actor.actorId,
    ActorName: actor.actorName,
    ActorRole: actor.actorRole,
    ActorType: actor.actorType,
    ReasonRemarks: input.reasonRemarks ? String(input.reasonRemarks).trim() : null,
    Source: normalizeSource(input.source),
    CorrelationId: input.correlationId ? String(input.correlationId).trim() : null,
    Result: String(input.result || "SUCCESS").trim().toUpperCase() || "SUCCESS",
    ObjectType: String(input.objectType || "").trim().toUpperCase() || "INVOICE",
    ObjectId: String(input.objectId || "").trim() || "UNKNOWN",
    InvoiceId: input.invoiceId != null && Number.isFinite(Number(input.invoiceId))
      ? Number(input.invoiceId)
      : null,
    Ip: input.ip ? String(input.ip).slice(0, 80) : null,
    DetailsJson: input.details
      ? JSON.stringify(input.details).slice(0, 20000)
      : null,
    OutcomeCode: input.outcomeCode
      ? String(input.outcomeCode).trim().slice(0, 40)
      : null,
  });

  return row;
}

export async function systemAudit(
  partial: Omit<WriteAuditInput, "actorType" | "actorId" | "actorName"> & {
    actorName?: string;
    correlationId?: string | null;
  },
): Promise<EssaAuditEvent> {
  return writeAudit({
    ...partial,
    actorType: "SYSTEM",
    actorId: "system",
    actorName: partial.actorName || "AP Automation Engine",
    actorRole: "SYSTEM",
    source: partial.source || "SYSTEM",
    correlationId: partial.correlationId || mintCorrelationId(),
  });
}

function buildWhere(query: AuditListQuery): WhereOptions {
  const where: WhereOptions = {};
  const and: WhereOptions[] = [];

  if (query.objectType) where.ObjectType = String(query.objectType).trim().toUpperCase();
  if (query.objectId) where.ObjectId = String(query.objectId).trim();
  if (query.action) where.Action = String(query.action).trim().toUpperCase();
  if (query.source) where.Source = normalizeSource(query.source);
  if (query.result) where.Result = String(query.result).trim().toUpperCase();
  if (query.actorId) where.ActorId = String(query.actorId).trim();
  if (query.actorName) {
    where.ActorName = { [Op.iLike]: `%${String(query.actorName).trim()}%` };
  }
  if (query.fieldCode) where.FieldCode = String(query.fieldCode).trim();
  if (query.outcomeCode) where.OutcomeCode = String(query.outcomeCode).trim();
  if (query.correlationId) where.CorrelationId = String(query.correlationId).trim();
  if (query.invoiceId != null && String(query.invoiceId).trim()) {
    const id = Number(query.invoiceId);
    if (Number.isFinite(id)) where.InvoiceId = id;
  }

  if (query.dateFrom) {
    const from = new Date(String(query.dateFrom));
    if (!Number.isNaN(from.getTime())) and.push({ EventTime: { [Op.gte]: from } });
  }
  if (query.dateTo) {
    const raw = String(query.dateTo).trim();
    const to = new Date(raw.includes("T") ? raw : `${raw}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) and.push({ EventTime: { [Op.lte]: to } });
  }

  const search = String(query.search || "").trim();
  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    and.push({
      [Op.or]: [
        { EventId: like },
        { ActorName: like },
        { ActorId: like },
        { Action: like },
        { ObjectType: like },
        { ObjectId: like },
        { FieldCode: like },
        { OutcomeCode: like },
        { CorrelationId: like },
        { ReasonRemarks: like },
        { DetailsJson: like },
        { OldValue: like },
        { NewValue: like },
      ],
    });
  }

  if (and.length) {
    (where as any)[Op.and] = and;
  }
  return where;
}

async function loadFacets() {
  const [objectTypes, actions, sources, results, users] = await Promise.all([
    EssaAuditEvent.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("ObjectType")), "value"]],
      order: [[sequelize.col("ObjectType"), "ASC"]],
      raw: true,
    }),
    EssaAuditEvent.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("Action")), "value"]],
      order: [[sequelize.col("Action"), "ASC"]],
      raw: true,
    }),
    EssaAuditEvent.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("Source")), "value"]],
      order: [[sequelize.col("Source"), "ASC"]],
      raw: true,
    }),
    EssaAuditEvent.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("Result")), "value"]],
      order: [[sequelize.col("Result"), "ASC"]],
      raw: true,
    }),
    EssaAuditEvent.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("ActorName")), "value"]],
      order: [[sequelize.col("ActorName"), "ASC"]],
      raw: true,
    }),
  ]);

  const uniq = (rows: Array<{ value?: string | null }>, mapFn?: (v: string) => string) =>
    rows
      .map((r) => (r.value != null ? String(r.value) : ""))
      .map((v) => (mapFn ? mapFn(v) : v))
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();

  return {
    objectTypes: uniq(objectTypes as any),
    actions: uniq(actions as any),
    sources: uniq(sources as any, normalizeSource),
    results: uniq(results as any),
    users: uniq(users as any),
  };
}

export async function listAuditEvents(query: AuditListQuery = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
  const sortByRaw = String(query.sortBy || "eventTime").trim();
  const sortDir = String(query.sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const sortMap: Record<string, string> = {
    eventTime: "EventTime",
    event_time: "EventTime",
    action: "Action",
    objectType: "ObjectType",
    object_type: "ObjectType",
    objectId: "ObjectId",
    object_id: "ObjectId",
    result: "Result",
    source: "Source",
    actorName: "ActorName",
    actor_name: "ActorName",
  };
  const orderCol = sortMap[sortByRaw] || "EventTime";

  const where = buildWhere(query);
  const [total, rows, facets] = await Promise.all([
    EssaAuditEvent.count({ where }),
    EssaAuditEvent.findAll({
      where,
      order: [[orderCol, sortDir], ["Id", sortDir]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    loadFacets(),
  ]);

  return {
    items: rows.map(toAuditDto),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets,
  };
}

export default {
  writeAudit,
  systemAudit,
  listAuditEvents,
  mintCorrelationId,
  toAuditDto,
  roleLabelFromId,
};
