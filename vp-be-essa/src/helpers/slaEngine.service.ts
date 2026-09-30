import { CardFactory, MessageFactory } from "botbuilder";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { EssaInvoice } from "../models/essaInvoice";
import { EssaSlaCalendar } from "../models/essaSlaCalendar";
import { EssaSlaInstance } from "../models/essaSlaInstance";
import { EssaSlaPolicy } from "../models/essaSlaPolicy";
import { User } from "../models/user";
import { UserRole } from "../utils/enums/role.enum";
import { NotificationCategory } from "../utils/enums/category.enum";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import mail from "../utils/mail";
import notificationService from "./notiticationService";
import emailTemplateService, { renderPlaceholders } from "./emailTemplate.service";
import {
  findConversationReferences,
} from "../bots/approvalBot";
import { isTeamsBotConfigured, teamsAdapter } from "./teamsBot.adapter";
import slaService, {
  canonicalBreach,
  canonicalTrigger,
  formatRemaining,
  isPolicyEffectiveOn,
  loadCalendarByPublicId,
  ownerLabel,
  parseJson,
  parsePublicId,
  remainingMsOf,
  SlaActor,
  toCalendarShape,
  toPolicyDto,
  writeSlaAudit,
} from "./sla.service";
import { addDuration, CalendarShape, DurationUnit, subtractDuration } from "./slaTime.util";

const TRIGGER_STAGE: Record<string, string> = {
  INVOICE_CREATED: "INVOICE_CREATION",
  INVOICE_RECEIVED: "INVOICE_CREATION",
  VALIDATION_COMPLETED: "INVOICE_CREATION",
  TAX_REVIEW_ASSIGNED: "TAX_REVIEW",
  TAX_ASSIGNED: "TAX_REVIEW",
  WORKFLOW_STEP_ASSIGNED: "AP_APPROVAL",
  APPROVAL_REQUESTED: "AP_APPROVAL",
  INVOICE_APPROVED: "PAYMENT",
  READY_FOR_PAYMENT: "PAYMENT",
  DOCUMENT_REQUEST_SENT: "DOCUMENT_REQUEST",
  DOCUMENT_REQUESTED: "DOCUMENT_REQUEST",
};

const OPEN_TICK = ["PENDING", "RUNNING", "WARNING", "PAUSED"];
const LIVE = ["PENDING", "RUNNING", "WARNING"];

type TriggerContext = {
  objectType: "INVOICE" | "WORKFLOW_STEP" | "DOCUMENT_REQUEST";
  objectId: string;
  reference?: string | null;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  activity?: string | null;
  invoiceId?: number | null;
  vendorEmail?: string | null;
  approverEmail?: string | null;
};

type ReminderSent = { seq: number; lastSentAt: string; count: number };
type InstanceEvent = { at: string; type?: string; event?: string; detail?: string };

const SYSTEM_ACTOR: SlaActor = { name: "System", userId: 0 };

const parseEmailList = (raw: unknown): string[] =>
  String(raw || "")
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.includes("@"));

const uniqueEmails = (...groups: string[][]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const email of group) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(email);
    }
  }
  return out;
};

const slaTestEmails = (): string[] => parseEmailList(process.env.SLA_TEST_EMAIL);
const slaTestCcEmails = (): string[] => parseEmailList(process.env.SLA_TEST_CC);

const parseEvents = (raw: string): InstanceEvent[] => parseJson(raw, []);
const parseSent = (raw: string): ReminderSent[] => parseJson(raw, []);

async function claimInstance(
  id: number,
  values: Record<string, unknown>,
  where: Record<string, unknown>,
): Promise<boolean> {
  const [affected] = await EssaSlaInstance.update(values, {
    where: { Id: id, IsDeleted: false, ...where },
  });
  return Number(affected) > 0;
}

const appendEvent = (row: EssaSlaInstance, event: string, detail?: string, at = new Date()) => {
  const events = parseEvents(row.EventsJson);
  const type = String(event || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/^SLA_/, "");
  events.push({ at: at.toISOString(), type, event, detail });
  row.EventsJson = JSON.stringify(events);
};

export function mapInvoiceCategory(invoiceType: string, invoiceWorkflow: string) {
  const t = String(invoiceType || "").toLowerCase();
  const wf = String(invoiceWorkflow || "").toUpperCase();
  if (wf === "NON_PO" || t.includes("non-po") || t.includes("non po")) {
    return { activity: "NON_PO", categoryId: "non-po", categoryName: invoiceType || "Non-PO" };
  }
  if (t.includes("catering")) {
    return { activity: "CATERING", categoryId: "catering", categoryName: invoiceType || "Catering" };
  }
  if (t.includes("manpower")) {
    return { activity: "MANPOWER", categoryId: "manpower", categoryName: invoiceType || "Manpower" };
  }
  if (t.includes("service") || t.includes("civil")) {
    return { activity: "SERVICE", categoryId: "service", categoryName: invoiceType || "Service Invoice" };
  }
  if (t.includes("material")) {
    return { activity: "MATERIAL", categoryId: "material", categoryName: invoiceType || "Material" };
  }
  return {
    activity: null as string | null,
    categoryId: null as string | null,
    categoryName: invoiceType || null,
  };
}

async function resolveActivePolicy(stage: string, activity: string | null, trigger?: string) {
  const policies = await EssaSlaPolicy.findAll({
    where: { Status: "ACTIVE", IsDeleted: false, Stage: stage },
    order: [["Version", "DESC"], ["Id", "DESC"]],
  });
  const today = new Date().toISOString().slice(0, 10);
  const effective = policies.filter((p) => isPolicyEffectiveOn(p, today));
  const wanted = trigger ? canonicalTrigger(trigger) : "";
  const pool = wanted
    ? effective.filter((p) => canonicalTrigger(p.TriggerEvent) === wanted)
    : effective;
  const match = pool.length ? pool : effective;
  if (stage === "DOCUMENT_REQUEST") {
    const dr = match.find((p) => p.ScopeType === "DOCUMENT_REQUEST");
    if (dr) return dr;
  }
  if (activity) {
    const cat = match.find(
      (p) => p.ScopeType === "INVOICE_CATEGORY" && p.Activity === activity,
    );
    if (cat) return cat;
    const wfAct = match.find((p) => p.ScopeType === "WORKFLOW" && p.Activity === activity);
    if (wfAct) return wfAct;
  }
  const wfAll = match.find((p) => p.ScopeType === "WORKFLOW" && !p.Activity);
  if (wfAll) return wfAll;
  return match.find((p) => p.ScopeType === "GLOBAL") || null;
}

async function loadCalendarForTimer(calendarId?: string | null): Promise<{
  row: EssaSlaCalendar | null;
  shape: CalendarShape;
}> {
  const row = await loadCalendarByPublicId(calendarId || "");
  return { row, shape: toCalendarShape(row) };
}

const freezeRemaining = (row: EssaSlaInstance, now = Date.now()) =>
  remainingMsOf(row.Status === "PAUSED" ? "RUNNING" : row.Status, row.DueAt, null, now);

async function syncInvoiceFromInstance(row: EssaSlaInstance) {
  if (row.ObjectType !== "INVOICE") return;
  const documentId = Number(row.ObjectId);
  if (!Number.isInteger(documentId)) return;
  const invoice =
    (row.InvoiceId ? await EssaInvoice.findByPk(row.InvoiceId) : null) ||
    (await EssaInvoice.findOne({ where: { DocumentId: documentId, IsDeleted: false } }));
  if (!invoice) return;
  const breached = row.Status === "BREACHED";
  await invoice.update({
    SlaDueAt: row.DueAt,
    SlaBreached: breached,
    ModifiedDt: new Date(),
  });
}

const RECIPIENT_ROLE: Record<string, number> = {
  AP_PROCESSOR: UserRole.AP_TEAM,
  AP_SUPERVISOR: UserRole.AP_SUPERVISOR,
  APPROVER_AP_SUPERVISOR: UserRole.AP_SUPERVISOR,
  HEAD_OF_FUNCTION: UserRole.HOF,
  NEXT_APPROVAL_LEVEL: UserRole.AP_SUPERVISOR,
};

async function emailsForRecipient(
  recipient: string,
  ctx: { vendorEmail?: string | null; approverEmail?: string | null },
): Promise<{ emails: string[]; userIds: number[] }> {
  if (recipient === "VENDOR") {
    return ctx.vendorEmail ? { emails: [ctx.vendorEmail], userIds: [] } : { emails: [], userIds: [] };
  }
  if (recipient === "CURRENT_APPROVER" && ctx.approverEmail) {
    return { emails: [ctx.approverEmail], userIds: [] };
  }
  const roleId = RECIPIENT_ROLE[recipient] || UserRole.AP_TEAM;
  const users = await User.findAll({
    where: { Role_id: roleId, Is_Deleted: false, Is_Active: true },
    attributes: ["ID", "Email"],
  });
  return {
    emails: users.map((u) => u.Email).filter(Boolean),
    userIds: users.map((u) => u.ID),
  };
}

async function sendTeams(text: string, emails: string[]) {
  if (!isTeamsBotConfigured() || !teamsAdapter) return;
  const botAppId = process.env.MicrosoftAppId ?? "";
  for (const email of emails) {
    const refs = findConversationReferences({ upn: email });
    for (const reference of refs) {
      try {
        await teamsAdapter.continueConversationAsync(botAppId, reference, async (context) => {
          await context.sendActivity(
            MessageFactory.attachment(
              CardFactory.adaptiveCard({
                type: "AdaptiveCard",
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                version: "1.4",
                body: [{ type: "TextBlock", text, wrap: true }],
              }),
            ),
          );
        });
      } catch (error) {
        logger.warn("SLA Teams notify failed", error);
      }
    }
  }
}

function slaRenderContext(opts: {
  ctx: TriggerContext;
  row?: EssaSlaInstance | null;
  reminderSeq?: number | string;
  escalationTarget?: string;
  now?: number;
}): Record<string, string> {
  const dueAt = opts.row?.DueAt ? new Date(opts.row.DueAt) : null;
  const dueIso = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString() : "";
  const remaining = opts.row
    ? remainingMsOf(
        opts.row.Status,
        dueAt,
        opts.row.FrozenRemainingMs,
        opts.now ?? Date.now(),
      )
    : null;
  return {
    invoiceNumber: String(opts.ctx.invoiceNumber || opts.ctx.reference || opts.row?.InvoiceNumber || ""),
    vendorName: String(opts.ctx.vendorName || opts.row?.VendorName || ""),
    policyCode: String(opts.row?.PolicyCode || ""),
    policyName: String(opts.row?.PolicyName || ""),
    stage: String(opts.row?.Stage || ""),
    dueDate: dueIso,
    dueAt: dueIso,
    slaDueDate: dueIso ? dueIso.slice(0, 10) : "",
    remainingTime: formatRemaining(remaining),
    owner: String(opts.row?.Owner || ""),
    reminderSeq: opts.reminderSeq != null ? String(opts.reminderSeq) : "",
    escalationTarget: String(opts.escalationTarget || ""),
    vendorEmail: String(opts.ctx.vendorEmail || ""),
    approverEmail: String(opts.ctx.approverEmail || ""),
  };
}

async function notifyChannels(opts: {
  channels: string[];
  templateName?: string;
  templateId?: string | null;
  scenarioKey?: string;
  subject: string;
  body: string;
  recipient: string;
  ctx: TriggerContext;
  invoiceId?: number | null;
  slaContext: Record<string, string>;
}) {
  const resolved = await emailsForRecipient(opts.recipient, opts.ctx);
  const testTo = slaTestEmails();
  const defaultTo = testTo.length ? testTo : resolved.emails;
  const userIds = testTo.length ? [] : resolved.userIds;
  if (testTo.length) {
    logger.info(`SLA_TEST_EMAIL override → ${testTo.join(", ")}`);
  }
  const channels = opts.channels.map((c) => String(c).toUpperCase());
  const values = { ...opts.slaContext };

  let subject = renderPlaceholders(opts.subject, values);
  let html = renderPlaceholders(opts.body, values);
  let templateTo: string[] = [];
  let templateCc: string[] = [];

  const named = await emailTemplateService.findActiveTemplate({
    templateId: opts.templateId,
    name: opts.templateName,
  });
  if (named) {
    subject = renderPlaceholders(named.Subject, values);
    html = renderPlaceholders(named.BodyHtml, values);
    templateTo = parseEmailList(named.RecipientTo);
    templateCc = parseEmailList(named.RecipientCc);
  } else {
    const fallbackKey =
      opts.scenarioKey ||
      (opts.slaContext.stage === "DOCUMENT_REQUEST" ? "sla.missing_document" : "sla.reminder");
    const rendered = await emailTemplateService.resolveForSend(fallbackKey, values);
    if (rendered) {
      subject = rendered.subject;
      html = rendered.html;
      templateTo = parseEmailList(rendered.to);
      templateCc = parseEmailList(rendered.cc);
    }
  }

  const emails = uniqueEmails(defaultTo, templateTo);
  const toKeys = new Set(emails.map((email) => email.toLowerCase()));
  const cc = uniqueEmails(slaTestCcEmails(), templateCc).filter(
    (email) => !toKeys.has(email.toLowerCase()),
  );
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (channels.includes("EMAIL") || channels.includes("PORTAL")) {
    if (channels.includes("EMAIL") && emails.length) {
      try {
        await mail.sendEmail(emails.join(", "), subject, html, [], cc.join(", "));
      } catch (error) {
        logger.warn("SLA email notify failed", error);
      }
    }
    if (channels.includes("PORTAL") && userIds.length) {
      for (const userId of userIds) {
        try {
          await notificationService.createNotification({
            User_Id: userId,
            Message: subject,
            Module_Category_Id: NotificationCategory.PO_Invoice,
            Redirect_Id: String(opts.invoiceId || opts.ctx.objectId).slice(0, 10),
          });
        } catch (error) {
          logger.warn("SLA portal notify failed", error);
        }
      }
    }
  }
  if (channels.includes("TEAMS") && emails.length) {
    await sendTeams(`${subject}\n${text}`, emails);
  }
}

class SlaEngineService {
  async onTrigger(trigger: string, ctx: TriggerContext, opts?: { skipIfAnyInstance?: boolean }) {
    const canon = canonicalTrigger(trigger);
    const stage = TRIGGER_STAGE[canon] || TRIGGER_STAGE[String(trigger).toUpperCase()];
    if (!stage) return null;
    const policy = await resolveActivePolicy(stage, ctx.activity || null, canon);
    if (!policy) return null;

    const existingWhere = {
      ObjectType: ctx.objectType,
      ObjectId: String(ctx.objectId),
      Stage: stage,
      IsDeleted: false,
    };
    const existing = await EssaSlaInstance.findOne({
      where: opts?.skipIfAnyInstance
        ? existingWhere
        : { ...existingWhere, Status: { [Op.in]: ["PENDING", "RUNNING", "WARNING", "PAUSED"] } },
    });
    if (existing) return existing;

    const dto = toPolicyDto(policy);
    const startedAt = new Date();
    const { row: calendar, shape } = await loadCalendarForTimer(dto.timer.calendarId);
    const dueAt =
      dto.timer.duration == null
        ? null
        : addDuration(startedAt, Number(dto.timer.duration), dto.timer.unit as DurationUnit, shape);
    let warningAt: Date | null = null;
    if (dueAt && dto.timer.warningBefore?.value) {
      warningAt = subtractDuration(
        dueAt,
        Number(dto.timer.warningBefore.value),
        dto.timer.warningBefore.unit,
        shape,
      );
    }
    let status = "RUNNING";
    if (warningAt && startedAt >= warningAt && (!dueAt || startedAt < dueAt)) status = "WARNING";

    const inst = await EssaSlaInstance.create({
      ObjectType: ctx.objectType,
      ObjectId: String(ctx.objectId),
      Reference: ctx.reference || ctx.invoiceNumber || null,
      InvoiceNumber: ctx.invoiceNumber || null,
      VendorName: ctx.vendorName || null,
      CategoryId: ctx.categoryId || null,
      CategoryName: ctx.categoryName || null,
      PolicyId: policy.Id,
      PolicyCode: policy.Code,
      PolicyName: policy.Name,
      PolicyVersion: policy.Version,
      Stage: stage,
      Owner: ownerLabel(policy.Owner),
      StartedAt: startedAt,
      DueAt: dueAt,
      WarningAt: warningAt,
      Status: status,
      FrozenRemainingMs: null,
      Note: null,
      EventsJson: JSON.stringify([
        {
          at: startedAt.toISOString(),
          type: "STARTED",
          event: "SLA started",
          detail: `Clock opened for ${policy.Code}`,
        },
      ]),
      RemindersSentJson: "[]",
      CalendarId: calendar?.Id || null,
      InvoiceId: ctx.invoiceId || null,
      CreatedDt: startedAt,
    });
    await syncInvoiceFromInstance(inst);
    await this.fireReminders(inst, startedAt);
    return inst;
  }

  private invoiceTriggerContext(invoice: EssaInvoice): TriggerContext {
    const mapped = mapInvoiceCategory(invoice.InvoiceType, invoice.InvoiceWorkflow);
    return {
      objectType: "INVOICE",
      objectId: String(invoice.DocumentId),
      reference: invoice.InvoiceNo,
      invoiceNumber: invoice.InvoiceNo,
      vendorName: invoice.VendorName,
      categoryId: mapped.categoryId,
      categoryName: mapped.categoryName,
      activity: mapped.activity,
      invoiceId: invoice.Id,
    };
  }

  async onInvoiceCreated(invoice: EssaInvoice) {
    return this.onTrigger("INVOICE_CREATED", this.invoiceTriggerContext(invoice));
  }

  /**
   * Attach clocks for ACTIVE policies onto existing invoices that never got one
   * (policy published after the invoice was created). Start time is now so
   * historic invoices are not immediately treated as overdue.
   */
  async backfillMissingClocks() {
    const invoices = await EssaInvoice.findAll({
      where: {
        IsDeleted: false,
        WorkflowStage: { [Op.notIn]: ["rejected", "paid"] },
      },
    });
    const skip = { skipIfAnyInstance: true };
    for (const invoice of invoices) {
      try {
        const ctx = this.invoiceTriggerContext(invoice);
        const stage = String(invoice.WorkflowStage || "").toLowerCase();
        await this.onTrigger("INVOICE_CREATED", ctx, skip);
        if (stage === "pending_approval" || stage === "approval") {
          await this.onTrigger(
            "WORKFLOW_STEP_ASSIGNED",
            {
              ...ctx,
              objectType: "WORKFLOW_STEP",
              objectId: `wf-${ctx.objectId}`,
            },
            skip,
          );
        }
        if (stage === "tax_review" || stage === "tax") {
          await this.onTrigger("TAX_REVIEW_ASSIGNED", ctx, skip);
        }
        if (stage === "parked" || stage === "posted") {
          await this.onTrigger("INVOICE_APPROVED", ctx, skip);
        }
      } catch (error) {
        logger.warn(`SLA backfill failed for invoice ${invoice.Id}`, error);
      }
    }
  }

  async onDocumentRequestSent(
    invoice: EssaInvoice,
    requestId: string,
    extras?: { vendorEmail?: string | null },
  ) {
    const mapped = mapInvoiceCategory(invoice.InvoiceType, invoice.InvoiceWorkflow);
    const inst = await this.onTrigger("DOCUMENT_REQUEST_SENT", {
      objectType: "DOCUMENT_REQUEST",
      objectId: String(requestId),
      reference: String(requestId),
      invoiceNumber: invoice.InvoiceNo,
      vendorName: invoice.VendorName,
      categoryId: mapped.categoryId,
      categoryName: mapped.categoryName,
      activity: mapped.activity,
      invoiceId: invoice.Id,
      vendorEmail: extras?.vendorEmail || null,
    });
    await this.pauseOpenForDocumentWait(invoice);
    return inst;
  }

  async onVendorDocumentReceived(requestId: string, invoice: EssaInvoice) {
    await this.completeStage("DOCUMENT_REQUEST", String(requestId), "DOCUMENT_REQUEST");
    const paused = await EssaSlaInstance.findAll({
      where: {
        InvoiceId: invoice.Id,
        Status: "PAUSED",
        IsDeleted: false,
      },
    });
    for (const row of paused) {
      const policy = await EssaSlaPolicy.findByPk(row.PolicyId);
      const dto = policy ? toPolicyDto(policy) : null;
      const rule = dto?.pauseRules?.find((r) => r.resumeEvent === "DOCUMENT_RECEIVED");
      if (!rule) continue;
      await this.resumeInstance(`i-${row.Id}`, "DOCUMENT_RECEIVED", SYSTEM_ACTOR, {
        skipIfNotPaused: true,
      });
    }
  }

  async onDocumentRequestCancelled(requestId: string) {
    await this.cancelStage("DOCUMENT_REQUEST", String(requestId), "DOCUMENT_REQUEST");
  }

  private async pauseOpenForDocumentWait(invoice: EssaInvoice) {
    const rows = await EssaSlaInstance.findAll({
      where: {
        InvoiceId: invoice.Id,
        Status: { [Op.in]: LIVE },
        ObjectType: { [Op.ne]: "DOCUMENT_REQUEST" },
        IsDeleted: false,
      },
    });
    for (const row of rows) {
      const policy = await EssaSlaPolicy.findByPk(row.PolicyId);
      const dto = policy ? toPolicyDto(policy) : null;
      const rule = dto?.pauseRules?.find((r) => r.code === "WAITING_VENDOR_DOCUMENT");
      if (!rule?.pause) continue;
      try {
        await this.pauseInstance(`i-${row.Id}`, "WAITING_VENDOR_DOCUMENT", null, SYSTEM_ACTOR);
      } catch (error) {
        logger.warn(`SLA auto-pause failed for instance ${row.Id}`, error);
      }
    }
  }

  async completeStage(
    objectType: string,
    objectId: string,
    stage: string,
    now = new Date(),
  ) {
    const rows = await EssaSlaInstance.findAll({
      where: {
        ObjectType: objectType,
        ObjectId: String(objectId),
        Stage: stage,
        Status: { [Op.in]: LIVE },
        IsDeleted: false,
      },
    });
    for (const row of rows) {
      if (row.DueAt && now.getTime() > new Date(row.DueAt).getTime()) continue;
      row.FrozenRemainingMs = freezeRemaining(row, now.getTime());
      row.Status = "COMPLETED";
      row.ModifiedDt = now;
      appendEvent(row, "Completed", "Stage finished before due", now);
      await row.save();
    }
  }

  async cancelStage(objectType: string, objectId: string, stage?: string, now = new Date()) {
    const where: any = {
      ObjectType: objectType,
      ObjectId: String(objectId),
      Status: { [Op.in]: [...LIVE, "PAUSED"] },
      IsDeleted: false,
    };
    if (stage) where.Stage = stage;
    const rows = await EssaSlaInstance.findAll({ where });
    for (const row of rows) {
      row.FrozenRemainingMs = freezeRemaining(row, now.getTime());
      row.Status = "CANCELLED";
      row.ModifiedDt = now;
      appendEvent(row, "Cancelled", "Stage skipped", now);
      await row.save();
    }
  }

  async pauseInstance(rawId: string, code: string, reason: string | null, actorRaw: SlaActor) {
    const actor = await slaService.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "i");
    const row = await EssaSlaInstance.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Instance not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (!LIVE.includes(row.Status)) {
      throw new APIError("Instance cannot be paused", StatusCodeEnum.HTTP_CONFLICT);
    }
    const policy = await EssaSlaPolicy.findByPk(row.PolicyId);
    const dto = policy ? toPolicyDto(policy) : null;
    const wanted = code === "WAITING_VENDOR" ? "WAITING_VENDOR_DOCUMENT" : code;
    const rule =
      dto?.pauseRules?.find((r) => r.code === wanted || r.code === code) ||
      ((wanted === "ON_HOLD" || code === "ON_HOLD") && dto?.manualPauseAllowed
        ? { code: "ON_HOLD", pause: true, resumeEvent: "RESUME", reasonRequired: true }
        : undefined);
    if (rule?.reasonRequired && !String(reason || "").trim()) {
      throw new APIError("A reason is required to pause this SLA.", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    if (dto?.maxPause?.value) {
      const { shape } = await loadCalendarForTimer(dto.timer.calendarId);
      const maxUntil = addDuration(
        new Date(row.StartedAt),
        Number(dto.maxPause.value),
        String(dto.maxPause.unit) as DurationUnit,
        shape,
      );
      const used = Number(row.PauseUsedMs || 0);
      if (used > 0 && new Date(row.StartedAt).getTime() + used > maxUntil.getTime()) {
        throw new APIError("Maximum pause duration has been reached.", StatusCodeEnum.HTTP_CONFLICT);
      }
    }
    const now = new Date();
    row.FrozenRemainingMs = freezeRemaining(row, now.getTime());
    row.Status = "PAUSED";
    row.PauseStartedAt = now;
    row.Note = reason || row.Note;
    row.ModifiedDt = now;
    appendEvent(row, "Paused", code, now);
    await row.save();
    await writeSlaAudit("INSTANCE", row.Id, "PAUSE", actor, reason || code);
    return row;
  }

  async resumeInstance(
    rawId: string,
    event: string,
    actorRaw: SlaActor,
    opts?: { skipIfNotPaused?: boolean },
  ) {
    const actor = await slaService.resolveActor(actorRaw);
    const id = parsePublicId(rawId, "i");
    const row = await EssaSlaInstance.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Instance not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status !== "PAUSED") {
      if (opts?.skipIfNotPaused) return row;
      throw new APIError("Instance is not paused", StatusCodeEnum.HTTP_CONFLICT);
    }
    const now = new Date();
    const pausedMs = row.PauseStartedAt ? now.getTime() - new Date(row.PauseStartedAt).getTime() : 0;
    const nextDueAt = row.DueAt
      ? new Date(new Date(row.DueAt).getTime() + pausedMs)
      : row.DueAt;
    const nextWarningAt = row.WarningAt
      ? new Date(new Date(row.WarningAt).getTime() + pausedMs)
      : row.WarningAt;
    const dueMs = nextDueAt ? new Date(nextDueAt).getTime() : null;
    const nextStatus = dueMs && now.getTime() >= dueMs ? "BREACHED" : "RUNNING";
    const nextPauseUsedMs = Number(row.PauseUsedMs || 0) + pausedMs;
    appendEvent(row, "Resumed", event, now);
    const claimed = await claimInstance(
      row.Id,
      {
        PauseUsedMs: nextPauseUsedMs,
        DueAt: nextDueAt,
        WarningAt: nextWarningAt,
        Status: nextStatus,
        PauseStartedAt: null,
        FrozenRemainingMs: null,
        ModifiedDt: now,
        EventsJson: row.EventsJson,
      },
      { Status: "PAUSED" },
    );
    if (!claimed) {
      const fresh = await EssaSlaInstance.findByPk(row.Id);
      return fresh || row;
    }
    row.PauseUsedMs = nextPauseUsedMs;
    row.DueAt = nextDueAt;
    row.WarningAt = nextWarningAt;
    row.Status = nextStatus;
    row.PauseStartedAt = null;
    row.FrozenRemainingMs = null;
    row.ModifiedDt = now;
    await writeSlaAudit("INSTANCE", row.Id, "RESUME", actor, event);
    if (row.Status === "BREACHED") {
      await this.escalate(row, now);
    }
    return row;
  }

  private async escalate(row: EssaSlaInstance, now: Date) {
    const claimed = await claimInstance(
      row.Id,
      { EscalatedAt: now, ModifiedDt: now },
      { EscalatedAt: null },
    );
    if (!claimed) return;
    row.EscalatedAt = now;
    const policy = await EssaSlaPolicy.findByPk(row.PolicyId);
    if (!policy) return;
    const dto = toPolicyDto(policy);
    if (!dto.escalation?.enabled) return;
    const target =
      dto.escalation.primaryTarget && dto.escalation.primaryTarget !== "OFF"
        ? dto.escalation.primaryTarget
        : dto.escalation.fallbackTarget;
    const ctx: TriggerContext = {
      objectType: row.ObjectType as "INVOICE" | "WORKFLOW_STEP" | "DOCUMENT_REQUEST",
      objectId: row.ObjectId,
      reference: row.Reference,
      invoiceNumber: row.InvoiceNumber,
      vendorName: row.VendorName,
      invoiceId: row.InvoiceId,
    };
    await notifyChannels({
      channels: dto.escalation.channels || ["EMAIL"],
      templateName: dto.escalation.template || "Final Approval Reminder",
      templateId: dto.escalation.templateId,
      scenarioKey: "sla.escalated",
      subject: `SLA escalated: ${row.PolicyName}`,
      body: `SLA ${row.PolicyCode} for ${row.Reference || row.ObjectId} has been escalated to ${target}.`,
      recipient: target,
      ctx,
      invoiceId: row.InvoiceId,
      slaContext: slaRenderContext({
        ctx,
        row,
        escalationTarget: target,
      }),
    });
    if (dto.escalation.createAuditEvent) {
      await writeSlaAudit(
        "INSTANCE",
        row.Id,
        "ESCALATE",
        SYSTEM_ACTOR,
        `Escalate to ${target}`,
      );
    }
    if (dto.escalation.createBreachFlag) {
      await syncInvoiceFromInstance(row);
    }
    appendEvent(row, "Escalation", `Escalate to ${target}`, now);
    await row.save();
  }

  private async fireReminders(row: EssaSlaInstance, now: Date) {
    const policy = await EssaSlaPolicy.findByPk(row.PolicyId);
    if (!policy) return;
    const dto = toPolicyDto(policy);
    const { shape } = await loadCalendarForTimer(dto.timer.calendarId);
    const ctx: TriggerContext = {
      objectType: row.ObjectType as "INVOICE" | "WORKFLOW_STEP" | "DOCUMENT_REQUEST",
      objectId: row.ObjectId,
      reference: row.Reference,
      invoiceNumber: row.InvoiceNumber,
      vendorName: row.VendorName,
      invoiceId: row.InvoiceId,
    };

    const dueReminders = await sequelize.transaction(async (transaction) => {
      const locked = await EssaSlaInstance.findOne({
        where: { Id: row.Id, IsDeleted: false },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked) return [] as Array<{
        channels: string[];
        template: string;
        templateId?: string;
        recipient: string;
        seq: number;
        escalateAfter: boolean;
      }>;

      const sent = parseSent(locked.RemindersSentJson);
      const claimed: Array<{
        channels: string[];
        template: string;
        templateId?: string;
        recipient: string;
        seq: number;
        escalateAfter: boolean;
      }> = [];

      for (const reminder of dto.reminders.filter((r) => r.enabled !== false)) {
        const afterValue = Number(reminder.after?.value || 0);
        const afterUnit = String(reminder.after?.unit || "HOURS") as DurationUnit;
        const firstAt = addDuration(
          new Date(locked.StartedAt),
          afterValue,
          afterUnit,
          shape,
        );
        const record = sent.find((s) => s.seq === reminder.seq);
        const last = record ? new Date(record.lastSentAt) : null;
        let due = false;
        if (!record && now.getTime() >= firstAt.getTime()) due = true;
        if (record && reminder.repeat && afterValue > 0) {
          const next = addDuration(last || firstAt, afterValue, afterUnit, shape);
          if (now.getTime() >= next.getTime()) due = true;
        }
        if (!due) continue;

        const isFirstSend = !record;
        appendEvent(locked, `Reminder ${reminder.seq}`, reminder.template, now);
        if (record) {
          record.lastSentAt = now.toISOString();
          record.count += 1;
        } else {
          sent.push({ seq: reminder.seq, lastSentAt: now.toISOString(), count: 1 });
        }
        claimed.push({
          seq: reminder.seq,
          channels: reminder.channels || ["EMAIL"],
          template: reminder.template,
          templateId: reminder.templateId,
          recipient: reminder.recipient,
          escalateAfter:
            Boolean(dto.escalation?.enabled) &&
            canonicalBreach(dto.escalation.breachCondition) ===
              "AFTER_FIRST_UNANSWERED_REMINDER" &&
            isFirstSend,
        });
      }

      if (claimed.length) {
        locked.RemindersSentJson = JSON.stringify(sent);
        locked.ModifiedDt = now;
        await locked.save({ transaction });
        row.RemindersSentJson = locked.RemindersSentJson;
        row.EventsJson = locked.EventsJson;
        row.ModifiedDt = locked.ModifiedDt;
      }
      return claimed;
    });

    for (const reminder of dueReminders) {
      await notifyChannels({
        channels: reminder.channels,
        templateName: reminder.template,
        templateId: reminder.templateId,
        scenarioKey:
          row.Stage === "DOCUMENT_REQUEST" ? "sla.missing_document" : "sla.reminder",
        subject: `${reminder.template}: ${row.PolicyName}`,
        body: `Reminder for ${row.Reference || row.ObjectId} (${row.PolicyCode}).`,
        recipient: reminder.recipient,
        ctx,
        invoiceId: row.InvoiceId,
        slaContext: slaRenderContext({
          ctx,
          row,
          reminderSeq: reminder.seq,
        }),
      });
      if (reminder.escalateAfter) {
        await this.escalate(row, now);
      }
    }
  }

  async onInvoiceStageChange(invoice: EssaInvoice, previousStage?: string | null) {
    const mapped = mapInvoiceCategory(invoice.InvoiceType, invoice.InvoiceWorkflow);
    const objectId = String(invoice.DocumentId);
    const ctx: TriggerContext = {
      objectType: "INVOICE",
      objectId,
      reference: invoice.InvoiceNo,
      invoiceNumber: invoice.InvoiceNo,
      vendorName: invoice.VendorName,
      categoryId: mapped.categoryId,
      categoryName: mapped.categoryName,
      activity: mapped.activity,
      invoiceId: invoice.Id,
    };
    const stage = String(invoice.WorkflowStage || "").toLowerCase();
    if (stage === "rejected") {
      await this.cancelStage("INVOICE", objectId);
      await this.cancelStage("WORKFLOW_STEP", `wf-${objectId}`);
      return;
    }
    if (["validated", "parked", "posted", "paid"].includes(stage)) {
      await this.completeStage("INVOICE", objectId, "INVOICE_CREATION");
    }
    if (stage === "validated") {
      await this.onTrigger("VALIDATION_COMPLETED", ctx);
    }
    if (stage === "pending_approval" || stage === "approval") {
      await this.onTrigger("WORKFLOW_STEP_ASSIGNED", {
        ...ctx,
        objectType: "WORKFLOW_STEP",
        objectId: `wf-${objectId}`,
      });
    }
    if (stage === "tax_review" || stage === "tax") {
      await this.onTrigger("TAX_REVIEW_ASSIGNED", ctx);
    }
    if (["posted", "paid"].includes(stage)) {
      await this.completeStage("INVOICE", objectId, "AP_APPROVAL");
      await this.completeStage("WORKFLOW_STEP", `wf-${objectId}`, "AP_APPROVAL");
      await this.completeStage("INVOICE", objectId, "TAX_REVIEW");
    }
    if (stage === "parked" || stage === "posted") {
      await this.onTrigger("INVOICE_APPROVED", ctx);
    }
    if (stage === "paid") {
      await this.completeStage("INVOICE", objectId, "PAYMENT");
    }
    void previousStage;
  }

  async tick() {
    try {
      await this.backfillMissingClocks();
    } catch (error) {
      logger.warn("SLA backfill during tick failed", error);
    }
    const now = new Date();
    const rows = await EssaSlaInstance.findAll({
      where: { Status: { [Op.in]: OPEN_TICK }, IsDeleted: false },
    });
    for (const row of rows) {
      try {
        if (row.Status === "PAUSED") {
          const policy = await EssaSlaPolicy.findByPk(row.PolicyId);
          const dto = policy ? toPolicyDto(policy) : null;
          if (dto?.maxPause?.value && row.PauseStartedAt) {
            const { shape } = await loadCalendarForTimer(dto.timer.calendarId);
            const limit = addDuration(
              new Date(row.PauseStartedAt),
              Number(dto.maxPause.value),
              String(dto.maxPause.unit) as DurationUnit,
              shape,
            );
            if (now.getTime() >= limit.getTime()) {
              await this.resumeInstance(`i-${row.Id}`, "RESUME", SYSTEM_ACTOR, {
                skipIfNotPaused: true,
              });
            }
          }
          continue;
        }
        if (row.Status === "PENDING") {
          const claimedRunning = await claimInstance(
            row.Id,
            { Status: "RUNNING", ModifiedDt: now },
            { Status: "PENDING" },
          );
          if (claimedRunning) {
            row.Status = "RUNNING";
            row.ModifiedDt = now;
          } else {
            const fresh = await EssaSlaInstance.findByPk(row.Id);
            if (!fresh || !LIVE.includes(fresh.Status)) continue;
            row.Status = fresh.Status;
            row.EventsJson = fresh.EventsJson;
            row.ModifiedDt = fresh.ModifiedDt;
          }
        }
        if (row.DueAt && now.getTime() >= new Date(row.DueAt).getTime()) {
          appendEvent(row, "Breached", "Target elapsed", now);
          const claimedBreach = await claimInstance(
            row.Id,
            { Status: "BREACHED", ModifiedDt: now, EventsJson: row.EventsJson },
            { Status: { [Op.in]: LIVE } },
          );
          if (!claimedBreach) continue;
          row.Status = "BREACHED";
          row.ModifiedDt = now;
          await this.escalate(row, now);
          await syncInvoiceFromInstance(row);
          continue;
        }
        if (
          row.WarningAt &&
          row.Status === "RUNNING" &&
          now.getTime() >= new Date(row.WarningAt).getTime()
        ) {
          appendEvent(row, "Warning", "Inside warning window", now);
          const claimedWarning = await claimInstance(
            row.Id,
            { Status: "WARNING", ModifiedDt: now, EventsJson: row.EventsJson },
            { Status: "RUNNING" },
          );
          if (claimedWarning) {
            row.Status = "WARNING";
            row.ModifiedDt = now;
          }
        }
        await this.fireReminders(row, now);
      } catch (error) {
        logger.warn(`SLA tick failed for instance ${row.Id}`, error);
      }
    }
  }
}

export default new SlaEngineService();
