import { Op } from "sequelize";
import { EssaSlaAudit } from "../models/essaSlaAudit";
import { EssaSlaCalendar } from "../models/essaSlaCalendar";
import { EssaSlaInstance } from "../models/essaSlaInstance";
import { EssaSlaPolicy } from "../models/essaSlaPolicy";
import { User } from "../models/user";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import emailTemplateService from "./emailTemplate.service";
import {
  addDuration,
  CalendarShape,
  defaultCalendarShape,
  DurationUnit,
  subtractDuration,
} from "./slaTime.util";

export class SlaProblemsError extends APIError {
  problems: string[];
  constructor(problems: string[]) {
    super(problems[0] || "Validation failed", StatusCodeEnum.HTTP_BAD_REQUEST);
    this.problems = problems;
  }
}

export type SlaActor = { name: string; userId: number };

type Timer = {
  duration: number | null;
  unit: string;
  unitConfirmed?: boolean;
  calendarId?: string | null;
  timezone?: string;
  warningBefore?: { value: number; unit: string } | null;
  countdownOnWorkbench?: boolean;
  dashboardIndicator?: boolean;
};

type Reminder = {
  id: string;
  seq: number;
  after: { value: number; unit: string };
  repeat: boolean;
  recipient: string;
  channels: string[];
  template: string;
  templateId?: string;
  enabled: boolean;
};

type Escalation = {
  enabled: boolean;
  breachCondition: string;
  primaryTarget: string;
  fallbackTarget: string;
  channels: string[];
  createAuditEvent: boolean;
  createBreachFlag: boolean;
  template?: string;
  templateId?: string;
};

type PauseRule = {
  code: string;
  label?: string;
  pause: boolean;
  resumeEvent: string;
  reasonRequired: boolean;
};

const STAGE_TRIGGER: Record<string, string> = {
  INVOICE_CREATION: "INVOICE_CREATED",
  TAX_REVIEW: "TAX_REVIEW_ASSIGNED",
  AP_APPROVAL: "WORKFLOW_STEP_ASSIGNED",
  PAYMENT: "INVOICE_APPROVED",
  DOCUMENT_REQUEST: "DOCUMENT_REQUEST_SENT",
};

const TRIGGER_ALIASES: Record<string, string> = {
  INVOICE_RECEIVED: "INVOICE_CREATED",
  TAX_ASSIGNED: "TAX_REVIEW_ASSIGNED",
  APPROVAL_REQUESTED: "WORKFLOW_STEP_ASSIGNED",
  READY_FOR_PAYMENT: "INVOICE_APPROVED",
  DOCUMENT_REQUESTED: "DOCUMENT_REQUEST_SENT",
};

const BREACH_ALIASES: Record<string, string> = {
  AFTER_FIRST_UNANSWERED: "AFTER_FIRST_UNANSWERED_REMINDER",
  ON_DUE: "ON_DUE_TIME",
};

export const canonicalTrigger = (code: string): string =>
  TRIGGER_ALIASES[String(code || "").toUpperCase()] || String(code || "").toUpperCase();

export const canonicalBreach = (code: string): string =>
  BREACH_ALIASES[String(code || "").toUpperCase()] || String(code || "").toUpperCase();

const toIsoWeekdays = (days: unknown): number[] => {
  const raw = Array.isArray(days) ? days : [1, 2, 3, 4, 5];
  return [...new Set(raw.map((n) => (Number(n) === 0 ? 7 : Number(n))).filter((n) => n >= 1 && n <= 7))];
};

const normalizeExceptions = (raw: unknown, calendarId: number) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((ex: any, i: number) => {
    const type = EXCEPTION_TYPES.has(String(ex?.type || "").toUpperCase())
      ? String(ex.type).toUpperCase()
      : "PUBLIC_HOLIDAY";
    return {
      id: ex?.id || `h-${calendarId}-${i + 1}`,
      date: String(ex?.date || ""),
      name: String(ex?.name || ""),
      type,
      working: type === "WORKING_DAY_EXCEPTION",
    };
  });
};

const DEFAULT_PAUSE: PauseRule[] = [
  { code: "WAITING_VENDOR_DOCUMENT", label: "Waiting for Vendor Document", pause: false, resumeEvent: "DOCUMENT_RECEIVED", reasonRequired: false },
  { code: "WAITING_SAP_REFERENCE", label: "Waiting for SAP GRN / SES", pause: false, resumeEvent: "SAP_REFERENCE_AVAILABLE", reasonRequired: false },
  { code: "SAP_INTEGRATION_UNAVAILABLE", label: "SAP Integration Unavailable", pause: false, resumeEvent: "INTEGRATION_RECOVERED", reasonRequired: false },
  { code: "APPROVED_SYSTEM_MAINTENANCE", label: "Approved System Maintenance", pause: false, resumeEvent: "MAINTENANCE_ENDED", reasonRequired: false },
  { code: "WAITING_INTERNAL_AP_ACTION", label: "Waiting for Internal AP Action", pause: false, resumeEvent: "AP_ACTION_COMPLETED", reasonRequired: false },
];

const PAUSE_ALIASES: Record<string, string | null> = {
  WAITING_VENDOR: "WAITING_VENDOR_DOCUMENT",
  ON_HOLD: null,
};

export const mergePauseRules = (existing?: PauseRule[] | null): { pauseRules: PauseRule[]; hadManualHold: boolean } => {
  const byCode = new Map<string, PauseRule>();
  let hadManualHold = false;
  for (const r of existing || []) {
    const alias = Object.prototype.hasOwnProperty.call(PAUSE_ALIASES, r.code)
      ? PAUSE_ALIASES[r.code]
      : r.code;
    if (!alias) {
      hadManualHold = hadManualHold || !!r.pause;
      continue;
    }
    byCode.set(alias, { ...r, code: alias });
  }
  return {
    pauseRules: DEFAULT_PAUSE.map((def) => ({
      ...def,
      ...(byCode.get(def.code) || {}),
      code: def.code,
      label: def.label,
      resumeEvent: def.resumeEvent,
    })),
    hadManualHold,
  };
};

const CODE_RE = /^[A-Z0-9_]+$/;
const BUSINESS_UNITS = new Set(["BUSINESS_DAYS", "BUSINESS_HOURS"]);
const POLICY_STATUSES = new Set(["DRAFT", "TEST", "ACTIVE", "RETIRED"]);
const EXCEPTION_TYPES = new Set(["PUBLIC_HOLIDAY", "COMPANY_HOLIDAY", "WORKING_DAY_EXCEPTION"]);
const RUNNING_CLOCKS = ["PENDING", "RUNNING", "WARNING"];

const DEFAULT_ESCALATION: Escalation = {
  enabled: false,
  breachCondition: "AFTER_FINAL_REMINDER",
  primaryTarget: "NEXT_APPROVAL_LEVEL",
  fallbackTarget: "AP_SUPERVISOR",
  channels: ["EMAIL"],
  createAuditEvent: true,
  createBreachFlag: true,
};

const OWNER_LABELS: Record<string, string> = {
  AP_TEAM: "AP Team",
  TAX_TEAM: "Tax Team",
  APPROVER: "Current Approver",
  TREASURY: "Treasury",
  VENDOR: "Vendor",
};

const FROZEN_STATUSES = new Set(["PAUSED", "COMPLETED", "CANCELLED"]);
const OPEN_STATUSES = ["PENDING", "RUNNING", "WARNING", "PAUSED", "BREACHED"];
const CLOSED_STATUSES = ["COMPLETED", "CANCELLED"];
const LEGACY_TEMPLATE_NAMES = [
  "Approval Reminder 1",
  "Approval Reminder 2",
  "Final Approval Reminder",
  "Missing Document Reminder",
  "AP Verification Reminder",
  "sla.reminder",
];

export const SLA_META = {
  scopeTypes: [
    { code: "INVOICE_CATEGORY", label: "Invoice category", hint: "Applies to one invoice type." },
    { code: "WORKFLOW", label: "Workflow", hint: "Applies while an approval step is open." },
    { code: "DOCUMENT_REQUEST", label: "Document request", hint: "Applies while waiting for a document." },
    { code: "GLOBAL", label: "All types", hint: "Applies to every invoice category." },
  ],
  stages: [
    { code: "INVOICE_CREATION", label: "AP Verification", hint: "From invoice receipt to AP validation complete." },
    { code: "TAX_REVIEW", label: "Tax Review", hint: "Tax reviewer turnaround." },
    { code: "AP_APPROVAL", label: "Approval", hint: "Each approval step response." },
    { code: "PAYMENT", label: "Payment", hint: "Payment processing turnaround." },
    { code: "DOCUMENT_REQUEST", label: "Document Request", hint: "Vendor document chase." },
  ],
  activities: [
    { code: "NON_PO", label: "Non-PO", categoryCodes: ["NON_PO"], categoryIds: ["non-po"] },
    { code: "MATERIAL", label: "Material", categoryCodes: ["MATERIAL"], categoryIds: ["material"] },
    { code: "SERVICE", label: "Services", categoryCodes: ["SERVICE"], categoryIds: ["service"] },
    { code: "CATERING", label: "Catering", categoryCodes: ["CATERING"], categoryIds: ["catering"] },
    { code: "MANPOWER", label: "Manpower", categoryCodes: ["MANPOWER"], categoryIds: ["manpower"] },
  ],
  triggerEvents: [
    { code: "INVOICE_CREATED", label: "Invoice created", stages: ["INVOICE_CREATION"] },
    { code: "VALIDATION_COMPLETED", label: "Validation completed", stages: ["INVOICE_CREATION"] },
    { code: "TAX_REVIEW_ASSIGNED", label: "Tax review assigned", stages: ["TAX_REVIEW"] },
    { code: "WORKFLOW_STEP_ASSIGNED", label: "Workflow step assigned", stages: ["AP_APPROVAL"] },
    { code: "INVOICE_APPROVED", label: "Invoice approved", stages: ["PAYMENT"] },
    { code: "DOCUMENT_REQUEST_SENT", label: "Document request sent", stages: ["DOCUMENT_REQUEST"] },
  ],
  owners: [
    { code: "AP_TEAM", label: "AP Team" },
    { code: "TAX_TEAM", label: "Tax Team" },
    { code: "APPROVER", label: "Current Approver" },
    { code: "TREASURY", label: "Treasury" },
    { code: "VENDOR", label: "Vendor" },
  ],
  recipients: [
    { code: "CURRENT_APPROVER", label: "Current Approver" },
    { code: "APPROVER_AP_SUPERVISOR", label: "Approver, AP Supervisor" },
    { code: "AP_PROCESSOR", label: "AP Processor" },
    { code: "AP_SUPERVISOR", label: "AP Supervisor" },
    { code: "VENDOR", label: "Vendor" },
    { code: "HEAD_OF_FUNCTION", label: "Head of Function" },
  ],
  escalationTargets: [
    { code: "NEXT_APPROVAL_LEVEL", label: "Next Approval Level" },
    { code: "AP_SUPERVISOR", label: "AP Supervisor" },
    { code: "HEAD_OF_FUNCTION", label: "Head of Function" },
    { code: "OFF", label: "—" },
  ],
  units: [
    { code: "HOURS", label: "Hours" },
    { code: "CALENDAR_DAYS", label: "Calendar Days" },
    { code: "BUSINESS_HOURS", label: "Business Hours" },
    { code: "BUSINESS_DAYS", label: "Business Days" },
  ],
  channels: [
    { code: "EMAIL", label: "Email" },
    { code: "TEAMS", label: "Microsoft Teams" },
    { code: "PORTAL", label: "Portal" },
  ],
  breachConditions: [
    { code: "AFTER_FINAL_REMINDER", label: "After the final reminder" },
    { code: "AFTER_FIRST_UNANSWERED_REMINDER", label: "After the first unanswered reminder" },
    { code: "ON_DUE_TIME", label: "When the SLA due time is reached" },
  ],
  templates: [] as Array<{ id: string; name: string; scenario: string }>,
  templateNames: [
    "Approval Reminder 1",
    "Approval Reminder 2",
    "Final Approval Reminder",
    "Missing Document Reminder",
    "AP Verification Reminder",
    "sla.reminder",
  ],
  timezones: ["Asia/Jakarta", "Asia/Singapore", "UTC"],
  pauseConditions: [
    { code: "WAITING_VENDOR_DOCUMENT", label: "Waiting for Vendor Document", resumeEvent: "DOCUMENT_RECEIVED" },
    { code: "WAITING_SAP_REFERENCE", label: "Waiting for SAP GRN / SES", resumeEvent: "SAP_REFERENCE_AVAILABLE" },
    { code: "SAP_INTEGRATION_UNAVAILABLE", label: "SAP Integration Unavailable", resumeEvent: "INTEGRATION_RECOVERED" },
    { code: "APPROVED_SYSTEM_MAINTENANCE", label: "Approved System Maintenance", resumeEvent: "MAINTENANCE_ENDED" },
    { code: "WAITING_INTERNAL_AP_ACTION", label: "Waiting for Internal AP Action", resumeEvent: "AP_ACTION_COMPLETED" },
  ],
  statuses: ["DRAFT", "TEST", "ACTIVE", "RETIRED"],
  runtimeStatuses: [
    { code: "PENDING", label: "Pending", hint: "Clock created, not yet started." },
    { code: "RUNNING", label: "Open", hint: "Timer is running." },
    { code: "WARNING", label: "At risk", hint: "Inside the warning threshold." },
    { code: "PAUSED", label: "Paused", hint: "Clock stopped while waiting on an external party." },
    { code: "COMPLETED", label: "Completed", hint: "Stage finished within the target." },
    { code: "BREACHED", label: "Breached", hint: "Target elapsed before the stage completed." },
    { code: "CANCELLED", label: "Cancelled", hint: "Clock cancelled because the stage was skipped." },
  ],
};

export const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
  try {
    if (raw == null || raw === "") return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const publicId = (prefix: string, id: number) => `${prefix}-${id}`;

export const parsePublicId = (raw: string, prefix: string): number => {
  const text = String(raw || "").trim();
  const numeric = text.startsWith(`${prefix}-`) ? text.slice(prefix.length + 1) : text;
  const id = Number(numeric);
  if (!Number.isInteger(id) || id <= 0) {
    throw new APIError("Not found", StatusCodeEnum.HTTP_NOT_FOUND);
  }
  return id;
};

const deepMerge = (base: any, patch: any): any => {
  if (patch === undefined) return base;
  if (patch === null || Array.isArray(patch) || typeof patch !== "object") return patch;
  const out = { ...(base && typeof base === "object" ? base : {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
};

const normalizeCode = (raw: unknown): string =>
  String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const asIsoDate = (raw: unknown): string | null => {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const text = String(raw).trim();
  if (!text) return null;
  return text.length >= 10 ? text.slice(0, 10) : text;
};

export const isPolicyEffectiveOn = (
  row: { EffectiveFrom?: unknown; EffectiveTo?: unknown },
  today = todayIsoDate(),
): boolean => {
  const from = asIsoDate(row.EffectiveFrom) || "0000-01-01";
  const to = asIsoDate(row.EffectiveTo);
  return from <= today && (to == null || today <= to);
};

const datesOverlap = (
  fromA: string,
  toA: string | null,
  fromB: string | null,
  toB: string | null,
): boolean => {
  const a1 = fromA || "0000-01-01";
  const a2 = toA || "9999-12-31";
  const b1 = fromB || "0000-01-01";
  const b2 = toB || "9999-12-31";
  return a1 <= b2 && b1 <= a2;
};

export const formatRemaining = (ms: number | null): string => {
  if (ms == null) return "";
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && (minutes || !parts.length)) parts.push(`${minutes}m`);
  const text = parts.join(" ");
  return overdue ? `overdue by ${text}` : text;
};

const normalizeReminders = (raw: Reminder[]): Reminder[] =>
  raw.map((r, i) => {
    const templateId = r?.templateId != null && String(r.templateId).trim()
      ? String(r.templateId).trim()
      : undefined;
    return {
      id: String(r?.id || `r-${i + 1}`),
      seq: Number(r?.seq) || i + 1,
      after: r?.after || { value: 0, unit: "HOURS" },
      repeat: !!r?.repeat,
      recipient: String(r?.recipient || ""),
      channels: Array.isArray(r?.channels) ? r.channels.map((c) => String(c)) : [],
      template: String(r?.template || ""),
      ...(templateId ? { templateId } : {}),
      enabled: r?.enabled !== false,
    };
  });

const parseDuration = (raw: unknown): number | null => {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const defaultTimer = (calendarId: string | null, timezone: string): Timer => ({
  duration: null,
  unit: "BUSINESS_DAYS",
  unitConfirmed: true,
  calendarId,
  timezone,
  warningBefore: { value: 4, unit: "HOURS" },
  countdownOnWorkbench: true,
  dashboardIndicator: true,
});

const normalizeTimer = (raw: unknown, fallback: Timer): Timer => {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const calendarId =
    src.calendarId !== undefined
      ? src.calendarId == null || src.calendarId === ""
        ? null
        : String(src.calendarId)
      : fallback.calendarId || null;
  return {
    duration: parseDuration(src.duration !== undefined ? src.duration : fallback.duration),
    unit: String(src.unit || fallback.unit || "BUSINESS_DAYS").toUpperCase(),
    unitConfirmed:
      src.unitConfirmed != null ? !!src.unitConfirmed : fallback.unitConfirmed !== false,
    calendarId,
    timezone: String(src.timezone || fallback.timezone || "Asia/Jakarta"),
    warningBefore:
      src.warningBefore !== undefined
        ? (src.warningBefore as Timer["warningBefore"])
        : fallback.warningBefore ?? { value: 4, unit: "HOURS" },
    countdownOnWorkbench:
      src.countdownOnWorkbench != null
        ? !!src.countdownOnWorkbench
        : fallback.countdownOnWorkbench !== false,
    dashboardIndicator:
      src.dashboardIndicator != null
        ? !!src.dashboardIndicator
        : fallback.dashboardIndicator !== false,
  };
};

type PolicyDraft = {
  code: string;
  name: string;
  description: string;
  scopeType: string;
  activity: string | null;
  stage: string;
  triggerEvent: string;
  owner: string;
  provisional: boolean;
  provisionalNote: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  timer: Timer;
  reminders: Reminder[];
  escalation: Escalation;
  pauseRules: PauseRule[];
  manualPauseAllowed: boolean;
  maxPause: { value: number; unit: string } | null;
};

const readPolicyDraft = (
  body: Record<string, unknown>,
  current: Partial<PolicyDraft> | null,
  timerFallback: Timer,
): PolicyDraft => {
  const stage = String(body.stage || current?.stage || "INVOICE_CREATION").toUpperCase();
  const scopeType = String(body.scopeType || current?.scopeType || "INVOICE_CATEGORY").toUpperCase();
  const activityRaw = body.activity !== undefined ? body.activity : current?.activity;
  const activity =
    activityRaw == null || activityRaw === "" ? null : String(activityRaw).toUpperCase();
  const timerSource =
    body.timer !== undefined
      ? body.timer
      : body.duration !== undefined || body.unit !== undefined
        ? { duration: body.duration, unit: body.unit }
        : undefined;
  return {
    code: normalizeCode(body.code ?? current?.code),
    name: String(body.name != null ? body.name : current?.name || "").trim(),
    description: String(body.description != null ? body.description : current?.description || ""),
    scopeType,
    activity,
    stage,
    triggerEvent: canonicalTrigger(
      String(body.triggerEvent || current?.triggerEvent || STAGE_TRIGGER[stage] || "INVOICE_CREATED"),
    ),
    owner: String(body.owner || current?.owner || "AP_TEAM").toUpperCase(),
    provisional: body.provisional != null ? !!body.provisional : !!current?.provisional,
    provisionalNote: String(
      body.provisionalNote != null ? body.provisionalNote : current?.provisionalNote || "",
    ),
    effectiveFrom: String(
      body.effectiveFrom != null ? body.effectiveFrom : current?.effectiveFrom || "",
    ).trim(),
    effectiveTo: (() => {
      const raw = body.effectiveTo !== undefined ? body.effectiveTo : current?.effectiveTo;
      if (raw == null || raw === "") return null;
      return String(raw).trim() || null;
    })(),
    timer: normalizeTimer(timerSource, timerFallback),
    reminders: Array.isArray(body.reminders)
      ? normalizeReminders(body.reminders as Reminder[])
      : current?.reminders || [],
    escalation: (() => {
      const merged =
        body.escalation != null
          ? deepMerge(current?.escalation || DEFAULT_ESCALATION, body.escalation)
          : current?.escalation || DEFAULT_ESCALATION;
      const templateId =
        merged.templateId != null && String(merged.templateId).trim()
          ? String(merged.templateId).trim()
          : undefined;
      return {
        ...merged,
        breachCondition: canonicalBreach(merged.breachCondition || "AFTER_FINAL_REMINDER"),
        template: merged.template != null ? String(merged.template) : merged.template,
        ...(templateId ? { templateId } : { templateId: undefined }),
      };
    })(),
    pauseRules: mergePauseRules(
      Array.isArray(body.pauseRules) ? (body.pauseRules as PauseRule[]) : current?.pauseRules || DEFAULT_PAUSE,
    ).pauseRules,
    manualPauseAllowed:
      body.manualPauseAllowed != null
        ? !!body.manualPauseAllowed
        : current?.manualPauseAllowed ?? mergePauseRules(current?.pauseRules).hadManualHold,
    maxPause:
      body.maxPause === null
        ? null
        : body.maxPause != null
          ? (body.maxPause as { value: number; unit: string })
          : current?.maxPause ?? null,
  };
};

const assertPolicyDraft = (draft: PolicyDraft, requireCode: boolean) => {
  const problems: string[] = [];
  if (requireCode) {
    if (!draft.code) problems.push("Code is required.");
    else if (!CODE_RE.test(draft.code)) {
      problems.push("Code must be uppercase letters, numbers, and underscores.");
    }
  }
  if (!draft.name) problems.push("Name is required.");
  else if (draft.name.length > 120) problems.push("Name must be 120 characters or fewer.");
  if (draft.description.length > 200) problems.push("Description must be 200 characters or fewer.");
  if (!draft.effectiveFrom) problems.push("Effective from is required.");
  if (draft.effectiveTo && draft.effectiveFrom && draft.effectiveTo < draft.effectiveFrom) {
    problems.push("Effective to must be on or after effective from.");
  }
  if (draft.scopeType === "INVOICE_CATEGORY" && !draft.activity) {
    problems.push("Activity is required for invoice category scope.");
  }
  if (draft.timer.duration != null && draft.timer.duration <= 0) {
    problems.push("Duration must be greater than 0.");
  }
  if (
    BUSINESS_UNITS.has(draft.timer.unit) &&
    draft.timer.duration != null &&
    !draft.timer.calendarId
  ) {
    problems.push("Calendar is required for business-day or business-hour timers.");
  }
  draft.reminders
    .filter((r) => r.enabled !== false)
    .forEach((reminder, i) => {
      const label = `Reminder ${reminder.seq || i + 1}`;
      if (!reminder.recipient) problems.push(`${label}: recipient is required.`);
      if (!reminder.channels?.length) problems.push(`${label}: at least one channel is required.`);
      if (!reminder.templateId && !String(reminder.template || "").trim()) {
        problems.push(`${label}: templateId or template is required.`);
      }
    });
  if (draft.escalation?.enabled) {
    const primary = String(draft.escalation.primaryTarget || "");
    const fallback = String(draft.escalation.fallbackTarget || "");
    if ((!primary || primary === "OFF") && (!fallback || fallback === "OFF")) {
      problems.push("Escalation requires a primary or fallback target.");
    }
    if (!draft.escalation.channels?.length) {
      problems.push("Escalation requires at least one channel.");
    }
  }
  if (problems.length) throw new SlaProblemsError(problems);
};

async function assertPolicyContent(
  draft: PolicyDraft,
  opts: { requireCode: boolean; checkOverlap?: boolean; keepId?: number },
) {
  assertPolicyDraft(draft, opts.requireCode);
  const problems: string[] = [];
  await assertAssignableCalendar(draft.timer.calendarId);

  for (const reminder of draft.reminders.filter((r) => r.enabled !== false)) {
    if (!reminder.templateId) continue;
    const row = await emailTemplateService.findActiveTemplate({
      templateId: reminder.templateId,
      name: reminder.template,
    });
    if (!row) {
      problems.push(
        `Reminder ${reminder.seq}: templateId does not match an ACTIVE template.`,
      );
    }
  }

  if (draft.escalation?.enabled && draft.escalation.templateId) {
    const row = await emailTemplateService.findActiveTemplate({
      templateId: draft.escalation.templateId,
      name: draft.escalation.template,
    });
    if (!row) {
      problems.push("Escalation templateId does not match an ACTIVE template.");
    }
  }

  if (opts.checkOverlap) {
    const actives = await EssaSlaPolicy.findAll({
      where: {
        Status: "ACTIVE",
        IsDeleted: false,
        ScopeType: draft.scopeType,
        Stage: draft.stage,
        Code: { [Op.ne]: draft.code },
        ...(opts.keepId ? { Id: { [Op.ne]: opts.keepId } } : {}),
      },
    });
    const trigger = canonicalTrigger(draft.triggerEvent);
    const activity = draft.activity || null;
    const conflict = actives.find((p) => {
      if ((p.Activity || null) !== activity) return false;
      if (canonicalTrigger(p.TriggerEvent) !== trigger) return false;
      return datesOverlap(
        draft.effectiveFrom,
        draft.effectiveTo,
        asIsoDate(p.EffectiveFrom),
        asIsoDate(p.EffectiveTo),
      );
    });
    if (conflict) {
      problems.push(
        `Overlaps active policy ${conflict.Code} v${conflict.Version} for the same scope, activity, stage, and trigger.`,
      );
    }
  }

  if (problems.length) throw new SlaProblemsError(problems);
}

const policyAttrs = (draft: PolicyDraft, actor: SlaActor, now: Date) => ({
  Name: draft.name,
  Description: draft.description,
  ScopeType: draft.scopeType,
  Activity: draft.activity,
  Stage: draft.stage,
  TriggerEvent: draft.triggerEvent,
  Owner: draft.owner,
  Provisional: draft.provisional,
  ProvisionalNote: draft.provisionalNote || null,
  EffectiveFrom: draft.effectiveFrom,
  EffectiveTo: draft.effectiveTo,
  TimerJson: JSON.stringify(draft.timer),
  RemindersJson: JSON.stringify(draft.reminders),
  EscalationJson: JSON.stringify(draft.escalation),
  PauseRulesJson: JSON.stringify(draft.pauseRules),
  ManualPauseAllowed: draft.manualPauseAllowed,
  MaxPauseJson: draft.maxPause == null ? null : JSON.stringify(draft.maxPause),
  ChangedBy: actor.name,
  ChangedAt: now,
  ModifiedDt: now,
  ModifiedBy: actor.userId || null,
});

export const ownerLabel = (code: string): string => OWNER_LABELS[code] || code;

export const toCalendarShape = (row: EssaSlaCalendar | null): CalendarShape => {
  if (!row) return defaultCalendarShape();
  return {
    timezone: row.Timezone || "Asia/Jakarta",
    workingDays: toIsoWeekdays(parseJson<number[]>(row.WorkingDays, [1, 2, 3, 4, 5])),
    workStart: row.WorkStart || "08:00",
    workEnd: row.WorkEnd || "17:00",
    exceptions: parseJson(row.ExceptionsJson, []),
  };
};

export const toCalendarDto = (row: EssaSlaCalendar) => ({
  id: publicId("cal", row.Id),
  code: row.Code,
  name: row.Name,
  timezone: row.Timezone,
  workingDays: toIsoWeekdays(parseJson<number[]>(row.WorkingDays, [1, 2, 3, 4, 5])),
  workStart: row.WorkStart,
  workEnd: row.WorkEnd,
  status: row.Status,
  version: row.Version,
  effectiveFrom: row.EffectiveFrom,
  changedBy: row.ChangedBy || "",
  changedAt: row.ChangedAt ? new Date(row.ChangedAt).toISOString() : null,
  exceptions: parseJson(row.ExceptionsJson, []),
});

export const toPolicyDto = (row: EssaSlaPolicy) => {
  const escalation = parseJson<Escalation>(row.EscalationJson, DEFAULT_ESCALATION);
  return {
    id: publicId("p", row.Id),
    code: row.Code,
    name: row.Name,
    description: row.Description || "",
    scopeType: row.ScopeType,
    activity: row.Activity,
    stage: row.Stage,
    triggerEvent: canonicalTrigger(row.TriggerEvent),
    owner: row.Owner,
    provisional: !!row.Provisional,
    provisionalNote: row.ProvisionalNote || "",
    version: row.Version,
    status: row.Status,
    effectiveFrom: row.EffectiveFrom || "",
    effectiveTo: asIsoDate(row.EffectiveTo) || "",
    changedBy: row.ChangedBy || "",
    changedAt: row.ChangedAt ? new Date(row.ChangedAt).toISOString() : null,
    changeSummary: row.ChangeSummary || "",
    publishedBy: row.PublishedBy || "",
    publishedAt: row.PublishedAt ? new Date(row.PublishedAt).toISOString() : null,
    retiredAt: row.RetiredAt ? new Date(row.RetiredAt).toISOString() : null,
    lastTestedAt: row.LastTestedAt ? new Date(row.LastTestedAt).toISOString() : null,
    timer: parseJson<Timer>(row.TimerJson, {
      duration: null,
      unit: "BUSINESS_DAYS",
    }),
    reminders: normalizeReminders(parseJson<Reminder[]>(row.RemindersJson, [])),
    escalation: {
      ...escalation,
      breachCondition: canonicalBreach(escalation.breachCondition || "AFTER_FINAL_REMINDER"),
    },
    ...(() => {
      const mergedPause = mergePauseRules(parseJson<PauseRule[]>(row.PauseRulesJson, DEFAULT_PAUSE));
      return {
        pauseRules: mergedPause.pauseRules,
        manualPauseAllowed:
          row.ManualPauseAllowed != null ? !!row.ManualPauseAllowed : mergedPause.hadManualHold,
      };
    })(),
    maxPause:
      row.MaxPauseJson == null || row.MaxPauseJson === ""
        ? null
        : parseJson<{ value: number; unit: string } | null>(row.MaxPauseJson, null),
  };
};

export const remainingMsOf = (
  status: string,
  dueAt: Date | null,
  frozen: number | null,
  now = Date.now(),
): number | null => {
  if (!dueAt) return null;
  if (FROZEN_STATUSES.has(status)) {
    return frozen != null ? Number(frozen) : dueAt.getTime() - now;
  }
  return dueAt.getTime() - now;
};

export const toInstanceDto = (row: EssaSlaInstance, now = Date.now()) => {
  const dueAt = row.DueAt ? new Date(row.DueAt) : null;
  const warningAt = row.WarningAt ? new Date(row.WarningAt) : null;
  return {
    id: publicId("i", row.Id),
    objectType: row.ObjectType,
    objectId: row.ObjectId,
    reference: row.Reference,
    invoiceId: row.InvoiceId != null ? String(row.InvoiceId) : undefined,
    invoiceNumber: row.InvoiceNumber,
    vendorName: row.VendorName,
    categoryId: row.CategoryId,
    categoryName: row.CategoryName,
    policyId: publicId("p", row.PolicyId),
    policyCode: row.PolicyCode,
    policyName: row.PolicyName,
    policyVersion: row.PolicyVersion ?? undefined,
    stage: row.Stage,
    owner: row.Owner,
    startedAt: new Date(row.StartedAt).toISOString(),
    warningAt: warningAt ? warningAt.toISOString() : null,
    dueAt: dueAt ? dueAt.toISOString() : null,
    status: row.Status,
    remainingMs: remainingMsOf(row.Status, dueAt, row.FrozenRemainingMs, now),
    note: row.Note,
    events: parseJson(row.EventsJson, []).map((e: any) => ({
      type: e.type || String(e.event || "").toUpperCase().replace(/\s+/g, "_"),
      at: e.at,
      detail: e.detail || "",
    })),
  };
};

const codeToLabel = (code: string) => String(code || "").replace(/_/g, " ");

export async function writeSlaAudit(
  entityType: string,
  entityId: number,
  action: string,
  actor: SlaActor,
  detail?: string | null,
) {
  await EssaSlaAudit.create({
    EntityType: entityType,
    EntityId: entityId,
    Action: action,
    Detail: detail || null,
    Actor: actor.name,
    ActorUserId: actor.userId || null,
    CreatedDt: new Date(),
  });
}

async function defaultCalendarId(): Promise<{ id: string | null; timezone: string }> {
  const row = await EssaSlaCalendar.findOne({
    where: { Status: "ACTIVE", IsDeleted: false },
    order: [["Id", "ASC"]],
  });
  return {
    id: row ? publicId("cal", row.Id) : null,
    timezone: row?.Timezone || "Asia/Jakarta",
  };
}

export async function loadCalendarByPublicId(raw?: string | null): Promise<EssaSlaCalendar | null> {
  if (!raw) return null;
  try {
    const id = parsePublicId(String(raw), "cal");
    return await EssaSlaCalendar.findOne({ where: { Id: id, IsDeleted: false } });
  } catch {
    return null;
  }
}

async function assertAssignableCalendar(calendarId?: string | null) {
  if (!calendarId) return;
  const cal = await loadCalendarByPublicId(calendarId);
  if (!cal || cal.Status !== "ACTIVE") {
    throw new SlaProblemsError(["Only an ACTIVE calendar can be assigned to a policy."]);
  }
}

class SlaService {
  async resolveActor(raw: SlaActor): Promise<SlaActor> {
    if (raw.name) return raw;
    if (!raw.userId) return { name: "System", userId: 0 };
    const user = await User.findByPk(raw.userId);
    return { name: user?.Name || "System", userId: raw.userId };
  }

  async meta() {
    const templates = await emailTemplateService.listActiveSlaTemplates();
    return {
      ...SLA_META,
      templates,
      templateNames: LEGACY_TEMPLATE_NAMES,
    };
  }

  async listPolicies() {
    const [policies, calendars] = await Promise.all([
      EssaSlaPolicy.findAll({
        where: { IsDeleted: false },
        order: [["Code", "ASC"], ["Version", "DESC"], ["Id", "DESC"]],
      }),
      EssaSlaCalendar.findAll({
        where: { IsDeleted: false },
        order: [["Name", "ASC"], ["Id", "ASC"]],
      }),
    ]);
    return {
      policies: policies.map(toPolicyDto),
      calendars: calendars.map(toCalendarDto),
    };
  }

  async getPolicy(rawId: string) {
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    return toPolicyDto(row);
  }

  async createPolicy(body: Record<string, unknown>, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const cal = await defaultCalendarId();
    const draft = readPolicyDraft(body, null, defaultTimer(cal.id, cal.timezone));
    await assertPolicyContent(draft, { requireCode: true });

    const existing = await EssaSlaPolicy.findOne({
      where: { Code: draft.code, IsDeleted: false },
    });
    if (existing) {
      throw new APIError(`Policy ${draft.code} already exists.`, StatusCodeEnum.HTTP_CONFLICT);
    }

    const now = new Date();
    let row: EssaSlaPolicy;
    try {
      row = await EssaSlaPolicy.create({
        Code: draft.code,
        Version: 1,
        Status: "DRAFT",
        PublishedBy: null,
        PublishedAt: null,
        CreatedDt: now,
        CreatedBy: actor.userId || null,
        ...policyAttrs(draft, actor, now),
      });
    } catch (err: any) {
      if (err?.name === "SequelizeUniqueConstraintError") {
        throw new APIError(`Policy ${draft.code} already exists.`, StatusCodeEnum.HTTP_CONFLICT);
      }
      throw err;
    }
    await writeSlaAudit("POLICY", row.Id, "CREATE", actor, row.Code);
    return toPolicyDto(row);
  }

  async updatePolicy(rawId: string, body: Record<string, unknown>, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status === "ACTIVE") {
      throw new APIError("ACTIVE policies are immutable.", StatusCodeEnum.HTTP_CONFLICT);
    }

    const current = toPolicyDto(row);
    const draft = readPolicyDraft(
      { ...body, code: current.code },
      current,
      current.timer,
    );
    await assertPolicyContent(draft, {
      requireCode: false,
      checkOverlap: String(body.status || "").toUpperCase() === "ACTIVE" && row.Status !== "ACTIVE",
      keepId: row.Id,
    });

    const now = new Date();
    let nextStatus = row.Status;
    let publishedBy = row.PublishedBy;
    let publishedAt = row.PublishedAt;
    if (body.status != null) {
      const status = String(body.status).toUpperCase();
      if (!POLICY_STATUSES.has(status)) {
        throw new SlaProblemsError(["Status must be DRAFT, TEST, ACTIVE, or RETIRED."]);
      }
      nextStatus = status;
    }
    if (draft.provisional && nextStatus !== "DRAFT") {
      throw new SlaProblemsError([
        "Provisional policies must remain Draft until the flag is cleared.",
      ]);
    }
    if (nextStatus === "ACTIVE" && row.Status !== "ACTIVE") {
      await this.retirePreviousActive(row.Code, row.Id, actor, now);
      publishedBy = actor.name;
      publishedAt = now;
    }

    await row.update({
      ...policyAttrs(draft, actor, now),
      Status: nextStatus,
      PublishedBy: publishedBy,
      PublishedAt: publishedAt,
    });
    await writeSlaAudit("POLICY", row.Id, "UPDATE", actor, row.Code);
    await row.reload();
    return toPolicyDto(row);
  }

  async publishPolicy(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Provisional) {
      throw new SlaProblemsError([
        "Provisional policies cannot be published until the flag is cleared.",
      ]);
    }
    if (!row.EffectiveFrom) {
      throw new SlaProblemsError(["Effective from is required."]);
    }
    if (!["DRAFT", "TEST"].includes(row.Status)) {
      throw new APIError(
        "Only Draft or Test policies can be published.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    const draft = toPolicyDto(row);
    await assertPolicyContent(draft as PolicyDraft, {
      requireCode: false,
      checkOverlap: true,
      keepId: row.Id,
    });
    const now = new Date();
    await this.retirePreviousActive(row.Code, row.Id, actor, now);
    await row.update({
      Status: "ACTIVE",
      PublishedBy: actor.name,
      PublishedAt: now,
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("POLICY", row.Id, "PUBLISH", actor, row.Code);
    await row.reload();
    return toPolicyDto(row);
  }

  async markTested(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Provisional) {
      throw new SlaProblemsError([
        "Provisional policies must remain Draft until the flag is cleared.",
      ]);
    }
    if (row.Status !== "DRAFT") {
      throw new APIError("Only Draft policies can be marked tested.", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    const now = new Date();
    await row.update({
      Status: "TEST",
      LastTestedAt: now,
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("POLICY", row.Id, "TEST", actor, row.Code);
    await row.reload();
    return toPolicyDto(row);
  }

  async newVersion(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status !== "ACTIVE") {
      throw new APIError("Only ACTIVE policies can be versioned.", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    const maxVersion = Number(
      (await EssaSlaPolicy.max("Version", {
        where: { Code: row.Code, IsDeleted: false },
      })) || row.Version,
    );
    const now = new Date();
    const clone = await EssaSlaPolicy.create({
      Code: row.Code,
      Name: row.Name,
      Description: row.Description,
      ScopeType: row.ScopeType,
      Activity: row.Activity,
      Stage: row.Stage,
      TriggerEvent: row.TriggerEvent,
      Owner: row.Owner,
      Provisional: row.Provisional,
      ProvisionalNote: row.ProvisionalNote,
      Version: maxVersion + 1,
      Status: "DRAFT",
      EffectiveFrom: row.EffectiveFrom,
      EffectiveTo: row.EffectiveTo,
      TimerJson: row.TimerJson,
      RemindersJson: row.RemindersJson,
      EscalationJson: row.EscalationJson,
      PauseRulesJson: row.PauseRulesJson,
      ManualPauseAllowed: row.ManualPauseAllowed,
      MaxPauseJson: row.MaxPauseJson,
      PublishedBy: null,
      PublishedAt: null,
      ChangedBy: actor.name,
      ChangedAt: now,
      CreatedDt: now,
      CreatedBy: actor.userId || null,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("POLICY", clone.Id, "VERSION", actor, `${row.Code} v${clone.Version}`);
    return toPolicyDto(clone);
  }

  private async retirePreviousActive(
    code: string,
    keepId: number,
    actor: SlaActor,
    now: Date,
  ) {
    await EssaSlaPolicy.update(
      {
        Status: "RETIRED",
        RetiredAt: now,
        ChangedBy: actor.name,
        ChangedAt: now,
        ModifiedDt: now,
        ModifiedBy: actor.userId || null,
      },
      {
        where: {
          Code: code,
          Status: "ACTIVE",
          IsDeleted: false,
          Id: { [Op.ne]: keepId },
        },
      },
    );
  }

  async clonePolicy(rawId: string, body: Record<string, unknown>, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    const code = normalizeCode(body.code);
    if (!code) throw new SlaProblemsError(["Code is required."]);
    if (!CODE_RE.test(code)) {
      throw new SlaProblemsError(["Code must be uppercase letters, numbers, and underscores."]);
    }
    const existing = await EssaSlaPolicy.findOne({
      where: { Code: code, IsDeleted: false },
    });
    if (existing) {
      throw new APIError(`Policy ${code} already exists.`, StatusCodeEnum.HTTP_CONFLICT);
    }
    const now = new Date();
    let clone: EssaSlaPolicy;
    try {
      clone = await EssaSlaPolicy.create({
        Code: code,
        Name: row.Name,
        Description: row.Description,
        ScopeType: row.ScopeType,
        Activity: row.Activity,
        Stage: row.Stage,
        TriggerEvent: row.TriggerEvent,
        Owner: row.Owner,
        Provisional: row.Provisional,
        ProvisionalNote: row.ProvisionalNote,
        Version: 1,
        Status: "DRAFT",
        EffectiveFrom: row.EffectiveFrom,
        EffectiveTo: row.EffectiveTo,
        TimerJson: row.TimerJson,
        RemindersJson: row.RemindersJson,
        EscalationJson: row.EscalationJson,
        PauseRulesJson: row.PauseRulesJson,
        ManualPauseAllowed: row.ManualPauseAllowed,
        MaxPauseJson: row.MaxPauseJson,
        PublishedBy: null,
        PublishedAt: null,
        ChangedBy: actor.name,
        ChangedAt: now,
        CreatedDt: now,
        CreatedBy: actor.userId || null,
        ModifiedDt: now,
        ModifiedBy: actor.userId || null,
      });
    } catch (err: any) {
      if (err?.name === "SequelizeUniqueConstraintError") {
        throw new APIError(`Policy ${code} already exists.`, StatusCodeEnum.HTTP_CONFLICT);
      }
      throw err;
    }
    await writeSlaAudit("POLICY", clone.Id, "CLONE", actor, `${row.Code} → ${code}`);
    return toPolicyDto(clone);
  }

  async retirePolicy(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status !== "ACTIVE") {
      throw new APIError("Only ACTIVE policies can be retired.", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    const now = new Date();
    await row.update({
      Status: "RETIRED",
      RetiredAt: now,
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("POLICY", row.Id, "RETIRE", actor, row.Code);
    await row.reload();
    return toPolicyDto(row);
  }

  async deletePolicy(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "p");
    const row = await EssaSlaPolicy.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status === "ACTIVE" || row.Status === "RETIRED") {
      throw new APIError(
        "ACTIVE and RETIRED policies cannot be deleted. Retire an ACTIVE policy instead.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }
    const now = new Date();
    await row.update({
      IsDeleted: true,
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("POLICY", row.Id, "DELETE", actor, row.Code);
    return { id: publicId("p", row.Id) };
  }

  async createCalendar(actorRaw: SlaActor, body: Record<string, unknown> = {}) {
    const actor = await this.resolveActor(actorRaw);
    const code = normalizeCode(body.code);
    const name = String(body.name || "").trim();
    if (!code) throw new APIError("Code is required.", StatusCodeEnum.HTTP_BAD_REQUEST);
    if (!CODE_RE.test(code)) {
      throw new APIError(
        "Code must be uppercase letters, numbers, and underscores.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    if (!name) throw new APIError("Name is required.", StatusCodeEnum.HTTP_BAD_REQUEST);

    const existing = await EssaSlaCalendar.findOne({
      where: { Code: code, IsDeleted: false },
    });
    if (existing) {
      throw new APIError(`Calendar ${code} already exists.`, StatusCodeEnum.HTTP_CONFLICT);
    }

    const now = new Date();
    let row: EssaSlaCalendar;
    try {
      row = await EssaSlaCalendar.create({
        Code: code,
        Name: name,
        Timezone: String(body.timezone || "Asia/Jakarta"),
        WorkingDays: JSON.stringify([1, 2, 3, 4, 5]),
        WorkStart: "08:00",
        WorkEnd: "17:00",
        Status: "DRAFT",
        Version: 1,
        EffectiveFrom: String(body.effectiveFrom || todayIsoDate()),
        ExceptionsJson: "[]",
        ChangedBy: actor.name,
        ChangedAt: now,
        CreatedDt: now,
        CreatedBy: actor.userId || null,
        ModifiedDt: now,
        ModifiedBy: actor.userId || null,
      });
    } catch (err: any) {
      if (err?.name === "SequelizeUniqueConstraintError") {
        throw new APIError(`Calendar ${code} already exists.`, StatusCodeEnum.HTTP_CONFLICT);
      }
      throw err;
    }
    await writeSlaAudit("CALENDAR", row.Id, "CREATE", actor, row.Code);
    return toCalendarDto(row);
  }

  async updateCalendar(rawId: string, body: Record<string, unknown>, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "cal");
    const row = await EssaSlaCalendar.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Calendar not found", StatusCodeEnum.HTTP_NOT_FOUND);
    const now = new Date();
    const exceptions = Array.isArray(body.exceptions)
      ? normalizeExceptions(body.exceptions, id)
      : parseJson(row.ExceptionsJson, []);
    const nextVersion = row.Status === "ACTIVE" ? Number(row.Version || 1) + 1 : row.Version;
    await row.update({
      Name: body.name != null ? String(body.name) : row.Name,
      Timezone: body.timezone != null ? String(body.timezone) : row.Timezone,
      WorkingDays:
        body.workingDays != null ? JSON.stringify(toIsoWeekdays(body.workingDays)) : row.WorkingDays,
      WorkStart: body.workStart != null ? String(body.workStart) : row.WorkStart,
      WorkEnd: body.workEnd != null ? String(body.workEnd) : row.WorkEnd,
      Version: nextVersion,
      EffectiveFrom:
        body.effectiveFrom != null ? String(body.effectiveFrom) : row.EffectiveFrom,
      ExceptionsJson: JSON.stringify(exceptions),
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("CALENDAR", row.Id, "UPDATE", actor, row.Code);
    await row.reload();
    if (row.Status === "ACTIVE") {
      await this.recalculateRunningClocks(row);
    }
    return toCalendarDto(row);
  }

  async publishCalendar(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "cal");
    const row = await EssaSlaCalendar.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Calendar not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status !== "DRAFT") {
      throw new APIError(
        "Only Draft calendars can be published.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    const now = new Date();
    await row.update({
      Status: "ACTIVE",
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("CALENDAR", row.Id, "PUBLISH", actor, row.Code);
    await row.reload();
    return toCalendarDto(row);
  }

  async retireCalendar(rawId: string, actorRaw: SlaActor) {
    const actor = await this.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "cal");
    const row = await EssaSlaCalendar.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Calendar not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status !== "ACTIVE") {
      throw new APIError(
        "Only ACTIVE calendars can be retired.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    const publicCalId = publicId("cal", id);
    const active = await EssaSlaPolicy.findAll({
      where: { Status: "ACTIVE", IsDeleted: false },
    });
    const inUse = active.some((p) => parseJson<Timer>(p.TimerJson, { duration: null, unit: "HOURS" }).calendarId === publicCalId);
    if (inUse) {
      throw new APIError(
        "Cannot retire calendar that is in use by active policies.",
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }
    const now = new Date();
    await row.update({
      Status: "RETIRED",
      ChangedBy: actor.name,
      ChangedAt: now,
      ModifiedDt: now,
      ModifiedBy: actor.userId || null,
    });
    await writeSlaAudit("CALENDAR", row.Id, "RETIRE", actor, row.Code);
    await row.reload();
    return toCalendarDto(row);
  }

  private async recalculateRunningClocks(calendar: EssaSlaCalendar) {
    const shape = toCalendarShape(calendar);
    const rows = await EssaSlaInstance.findAll({
      where: {
        CalendarId: calendar.Id,
        Status: { [Op.in]: RUNNING_CLOCKS },
        IsDeleted: false,
      },
    });
    const now = new Date();
    for (const inst of rows) {
      const policy = await EssaSlaPolicy.findByPk(inst.PolicyId);
      if (!policy) continue;
      const dto = toPolicyDto(policy);
      if (!BUSINESS_UNITS.has(dto.timer.unit) || dto.timer.duration == null) continue;
      let dueAt = addDuration(
        new Date(inst.StartedAt),
        Number(dto.timer.duration),
        dto.timer.unit as DurationUnit,
        shape,
      );
      const pauseMs = Number(inst.PauseUsedMs || 0);
      if (pauseMs) dueAt = new Date(dueAt.getTime() + pauseMs);
      let warningAt: Date | null = null;
      if (dto.timer.warningBefore?.value) {
        warningAt = subtractDuration(
          dueAt,
          Number(dto.timer.warningBefore.value),
          dto.timer.warningBefore.unit,
          shape,
        );
      }
      inst.DueAt = dueAt;
      inst.WarningAt = warningAt;
      if (warningAt && now >= warningAt && now < dueAt) {
        inst.Status = inst.Status === "PENDING" ? inst.Status : "WARNING";
      } else if (inst.Status === "WARNING" && (!warningAt || now < warningAt)) {
        inst.Status = "RUNNING";
      }
      inst.ModifiedDt = now;
      await inst.save();
    }
  }

  async simulate(body: Record<string, unknown>) {
    const policyId = parsePublicId(String(body.policyId || ""), "p");
    const policy = await EssaSlaPolicy.findOne({ where: { Id: policyId, IsDeleted: false } });
    if (!policy) throw new APIError("Policy not found", StatusCodeEnum.HTTP_NOT_FOUND);
    const dto = toPolicyDto(policy);
    const calendar =
      (await loadCalendarByPublicId(String(body.calendarId || dto.timer.calendarId || ""))) ||
      (await EssaSlaCalendar.findOne({
        where: { Status: "ACTIVE", IsDeleted: false },
        order: [["Id", "ASC"]],
      }));
    const shape = toCalendarShape(calendar);
    const startAt = body.startAt ? new Date(String(body.startAt)) : new Date();
    if (Number.isNaN(startAt.getTime())) {
      throw new APIError("Invalid startAt", StatusCodeEnum.HTTP_BAD_REQUEST);
    }

    const policySummary = {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      version: dto.version,
      status: dto.status,
    };
    const calendarName = calendar?.Name || "Default calendar";

    type SimRow = {
      event: string;
      at: string | null;
      detail: string;
      recipient?: string;
      channels?: string[];
      template?: string;
      templateId?: string;
    };

    if (dto.timer.duration == null) {
      return {
        policy: policySummary,
        startAt: startAt.toISOString(),
        calendarName,
        rows: [
          {
            event: "No target",
            at: null,
            detail: "Timer is not applicable for this policy",
          },
        ] as SimRow[],
      };
    }

    let pauseMs = 0;
    let pauseFrom: Date | null = null;
    let pauseTo: Date | null = null;
    if (body.pauseFrom && body.pauseTo) {
      const from = new Date(String(body.pauseFrom));
      const to = new Date(String(body.pauseTo));
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to > from) {
        pauseFrom = from;
        pauseTo = to;
        pauseMs = to.getTime() - from.getTime();
      }
    }

    const shiftIfPaused = (at: Date): Date => {
      if (!pauseFrom || !pauseMs) return at;
      return at.getTime() >= pauseFrom.getTime() ? new Date(at.getTime() + pauseMs) : at;
    };

    const dueAt = shiftIfPaused(
      addDuration(
        startAt,
        Number(dto.timer.duration),
        dto.timer.unit as DurationUnit,
        shape,
      ),
    );
    const rows: SimRow[] = [
      {
        event: "SLA started",
        at: startAt.toISOString(),
        detail: `Clock opened for ${dto.code}`,
      },
    ];
    if (pauseFrom && pauseTo) {
      rows.push({
        event: "Paused",
        at: pauseFrom.toISOString(),
        detail: "Simulated pause",
      });
      rows.push({
        event: "Resumed",
        at: pauseTo.toISOString(),
        detail: "Simulated resume",
      });
    }
    const reminderTimes: Date[] = [];
    for (const reminder of dto.reminders.filter((r) => r.enabled !== false)) {
      const at = shiftIfPaused(
        addDuration(
          startAt,
          Number(reminder.after?.value || 0),
          String(reminder.after?.unit || "HOURS") as DurationUnit,
          shape,
        ),
      );
      reminderTimes.push(at);
      rows.push({
        event: `Reminder ${reminder.seq}`,
        at: at.toISOString(),
        detail: `${reminder.template || reminder.templateId || "template"} → ${codeToLabel(reminder.recipient)}`,
        recipient: reminder.recipient,
        channels: reminder.channels || [],
        template: reminder.template || "",
        templateId: reminder.templateId,
      });
    }
    rows.push({
      event: "SLA due",
      at: dueAt.toISOString(),
      detail: "Target elapsed",
    });

    if (dto.escalation?.enabled) {
      const condition = canonicalBreach(dto.escalation.breachCondition);
      let at = dueAt;
      if (condition === "AFTER_FINAL_REMINDER" && reminderTimes.length) {
        at = reminderTimes[reminderTimes.length - 1];
      } else if (condition === "AFTER_FIRST_UNANSWERED_REMINDER" && reminderTimes.length) {
        at = reminderTimes[0];
      }
      rows.push({
        event: "Escalation",
        at: at.toISOString(),
        detail: `Escalate to ${codeToLabel(dto.escalation.primaryTarget || dto.escalation.fallbackTarget)}`,
        recipient: dto.escalation.primaryTarget || dto.escalation.fallbackTarget,
        channels: dto.escalation.channels || [],
        template: dto.escalation.template || "",
        templateId: dto.escalation.templateId,
      });
    }

    rows.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return {
      policy: policySummary,
      startAt: startAt.toISOString(),
      calendarName,
      rows,
    };
  }

  async listInstances(query: Record<string, unknown> = {}) {
    const now = Date.now();
    const where: Record<string, unknown> = { IsDeleted: false };
    const status = String(query.status || "").trim().toUpperCase();
    const includeClosedRaw = query.includeClosed;
    const includeClosed =
      includeClosedRaw === undefined || includeClosedRaw === ""
        ? true
        : !["false", "0", "no"].includes(String(includeClosedRaw).toLowerCase());

    if (status) {
      where.Status = status;
    } else if (!includeClosed) {
      where.Status = { [Op.notIn]: CLOSED_STATUSES };
    }

    const stage = String(query.stage || "").trim().toUpperCase();
    if (stage) where.Stage = stage;

    const owner = String(query.owner || "").trim();
    if (owner) where.Owner = { [Op.like]: `%${owner}%` };

    const policyIdRaw = String(query.policyId || "").trim();
    if (policyIdRaw) {
      where.PolicyId = parsePublicId(policyIdRaw, "p");
    }

    const dueFrom = query.dueFrom ? new Date(String(query.dueFrom)) : null;
    const dueTo = query.dueTo ? new Date(String(query.dueTo)) : null;
    if (
      (dueFrom && !Number.isNaN(dueFrom.getTime())) ||
      (dueTo && !Number.isNaN(dueTo.getTime()))
    ) {
      const dueAt: any = {};
      if (dueFrom && !Number.isNaN(dueFrom.getTime())) dueAt[Op.gte] = dueFrom;
      if (dueTo && !Number.isNaN(dueTo.getTime())) dueAt[Op.lte] = dueTo;
      where.DueAt = dueAt;
    }

    const q = String(query.q || "").trim();
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      (where as any)[Op.or] = [
        { Reference: like },
        { InvoiceNumber: like },
        { VendorName: like },
        { PolicyCode: like },
        { PolicyName: like },
      ];
    }

    const rows = await EssaSlaInstance.findAll({
      where,
      order: [["StartedAt", "DESC"], ["Id", "DESC"]],
    });
    return rows.map((row) => toInstanceDto(row, now));
  }

  async getInstance(rawId: string) {
    const id = parsePublicId(rawId, "i");
    const row = await EssaSlaInstance.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Instance not found", StatusCodeEnum.HTTP_NOT_FOUND);
    return toInstanceDto(row);
  }

  async summarizeInstances() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const rows = await EssaSlaInstance.findAll({
      where: { IsDeleted: false },
      attributes: ["Status", "DueAt"],
    });
    const inFlight = new Set(["PENDING", "RUNNING", "WARNING", "PAUSED"]);
    let open = 0;
    let dueToday = 0;
    let atRisk = 0;
    let breached = 0;
    let paused = 0;
    for (const row of rows) {
      if (inFlight.has(row.Status)) open += 1;
      if (row.Status === "WARNING") atRisk += 1;
      if (row.Status === "BREACHED") breached += 1;
      if (row.Status === "PAUSED") paused += 1;
      if (row.DueAt && inFlight.has(row.Status)) {
        const dueDay = new Date(row.DueAt).toISOString().slice(0, 10);
        if (dueDay === today) dueToday += 1;
      }
    }
    return { open, dueToday, atRisk, breached, paused };
  }

  async openInstancesForObjects(objectType: string, objectIds: string[]) {
    if (!objectIds.length) return [];
    return EssaSlaInstance.findAll({
      where: {
        ObjectType: objectType,
        ObjectId: { [Op.in]: objectIds },
        Status: { [Op.in]: OPEN_STATUSES },
        IsDeleted: false,
      },
      order: [["StartedAt", "DESC"]],
    });
  }
}

export default new SlaService();
