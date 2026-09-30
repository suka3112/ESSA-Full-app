import { Op } from "sequelize";
import { BaseController } from "../controllers/baseController";
import { EssaEmailScenario } from "../models/essaEmailScenario";
import { EssaEmailScenarioVariable } from "../models/essaEmailScenarioVariable";
import { EssaEmailTemplate } from "../models/essaEmailTemplate";
import { EssaEmailTemplateVersion } from "../models/essaEmailTemplateVersion";
import { EssaInvoice } from "../models/essaInvoice";
import { EssaSlaInstance } from "../models/essaSlaInstance";
import { User } from "../models/user";
import { UserRole } from "../utils/enums/role.enum";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import mail from "../utils/mail";
import { SLA_SCENARIO_CATALOG } from "./slaEmailCatalog";

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const SORT_FIELDS: Record<string, string> = {
  name: "Name",
  scenario: "ScenarioKey",
  subject: "Subject",
  to: "RecipientTo",
  status: "Status",
  updatedAt: "ModifiedDt",
  updatedBy: "ModifiedBy",
};
const PAGE_SIZES = new Set([10, 20, 50]);
const STATUSES = new Set(["ACTIVE", "INACTIVE"]);

export class TemplateProblemsError extends APIError {
  problems: string[];
  constructor(problems: string[]) {
    super(problems[0] || "Validation failed", StatusCodeEnum.HTTP_BAD_REQUEST);
    this.problems = problems;
  }
}

type TemplateBody = {
  name?: string;
  scenario?: string;
  description?: string;
  subject?: string;
  bodyHtml?: string;
  status?: string;
  recipients?: { to?: string; cc?: string; bcc?: string };
};

type Snapshot = {
  name: string;
  scenario: string;
  description: string;
  subject: string;
  bodyHtml: string;
  recipients: { to: string; cc: string; bcc: string };
  requiredPlaceholders: string[];
  status: string;
};

const parseTemplateId = (raw: string): number => {
  const text = String(raw || "").trim();
  const numeric = text.startsWith("tpl-") ? text.slice(4) : text;
  const id = Number(numeric);
  if (!Number.isInteger(id) || id <= 0) {
    throw new APIError("Invalid template id", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return id;
};

const parseVersionId = (raw: unknown): number => {
  const text = String(raw ?? "").trim();
  const numeric = text.startsWith("ver-") ? text.slice(4) : text;
  const id = Number(numeric);
  if (!Number.isInteger(id) || id <= 0) {
    throw new APIError("Invalid versionId", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return id;
};

const stripHtml = (html: string): string =>
  String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractTokens = (subject: string, bodyHtml: string): string[] => {
  const found = new Set<string>();
  const scan = (text: string) => {
    PLACEHOLDER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_RE.exec(text))) {
      found.add(match[1]);
    }
  };
  scan(subject || "");
  scan(bodyHtml || "");
  return [...found];
};

export const renderPlaceholders = (
  text: string,
  values: Record<string, string>,
): string =>
  String(text || "").replace(PLACEHOLDER_RE, (_, name: string) =>
    values[name] != null ? String(values[name]) : `{{${name}}}`,
  );

export const isSlaScenarioKey = (key: string): boolean =>
  String(key || "").trim().toLowerCase().startsWith("sla.");

const enrichSlaContext = (context: Record<string, string>): Record<string, string> => {
  const values = { ...context };
  if (!values.dueDate && values.dueAt) values.dueDate = values.dueAt;
  if (!values.dueAt && values.dueDate) values.dueAt = values.dueDate;
  if (!values.slaDueDate && (values.dueDate || values.dueAt)) {
    values.slaDueDate = String(values.dueDate || values.dueAt).slice(0, 10);
  }
  return values;
};

const asContextMap = (raw: unknown): Record<string, string> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null || value === "") continue;
    if (typeof value === "object") continue;
    out[key] = String(value);
  }
  return out;
};

const parseOptionalNumericId = (raw: unknown, prefix?: string): number | null => {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const numeric = prefix && text.startsWith(`${prefix}-`) ? text.slice(prefix.length + 1) : text;
  const id = Number(numeric);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isoOrEmpty = (raw: unknown): string => {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString();
  const text = String(raw);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.includes("T") ? parsed.toISOString() : text.slice(0, 10);
  }
  return text;
};

const formatRemainingPreview = (dueAt: Date | null, now = Date.now()): string => {
  if (!dueAt || Number.isNaN(dueAt.getTime())) return "";
  const ms = dueAt.getTime() - now;
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

const parseRequired = (raw: string | null): string[] => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const toSnapshot = (row: EssaEmailTemplate): Snapshot => ({
  name: row.Name,
  scenario: row.ScenarioKey,
  description: row.Description || "",
  subject: row.Subject,
  bodyHtml: row.BodyHtml,
  recipients: {
    to: row.RecipientTo || "",
    cc: row.RecipientCc || "",
    bcc: row.RecipientBcc || "",
  },
  requiredPlaceholders: parseRequired(row.RequiredPlaceholders),
  status: row.Status,
});

const toTemplateDto = (row: EssaEmailTemplate, updatedBy?: string | null) => ({
  id: `tpl-${row.Id}`,
  name: row.Name,
  scenario: row.ScenarioKey,
  description: row.Description || "",
  subject: row.Subject,
  bodyHtml: row.BodyHtml,
  status: row.Status,
  recipients: {
    to: row.RecipientTo || "",
    cc: row.RecipientCc || "",
    bcc: row.RecipientBcc || "",
  },
  requiredPlaceholders: parseRequired(row.RequiredPlaceholders),
  isSystem: !!row.IsSystem,
  version: row.Version,
  updatedAt: (row.ModifiedDt || row.CreatedDt)?.toISOString?.() || null,
  updatedBy: updatedBy || "",
});

const toScenarioDto = (row: EssaEmailScenario) => ({
  key: row.ScenarioKey,
  label: row.Label,
  description: row.Description || "",
  category: row.Category,
  defaultTo: row.DefaultTo,
  defaultCc: row.DefaultCc || "",
  defaultBcc: row.DefaultBcc || "",
  variables: ((row as any).variables || []).map((v: EssaEmailScenarioVariable) => ({
    name: v.VariableName,
    label: v.Label,
    sampleValue: v.SampleValue || "",
    required: !!v.IsRequired,
  })),
});

class EmailTemplateService extends BaseController {
  private slaCatalogReady = false;

  async ensureSlaScenarioCatalog() {
    if (this.slaCatalogReady) return;
    const now = new Date();
    for (const seed of SLA_SCENARIO_CATALOG) {
      let scenario = await EssaEmailScenario.findOne({
        where: { ScenarioKey: seed.key },
      });
      if (!scenario) {
        scenario = await EssaEmailScenario.create({
          ScenarioKey: seed.key,
          Label: seed.label,
          Description: seed.description,
          Category: seed.category,
          DefaultTo: seed.defaultTo,
          DefaultCc: null,
          DefaultBcc: null,
          IsDeleted: false,
          CreatedDt: now,
          CreatedBy: null,
          ModifiedDt: now,
          ModifiedBy: null,
        });
      } else if (scenario.IsDeleted) {
        await scenario.update({
          IsDeleted: false,
          Label: seed.label,
          Description: seed.description,
          Category: seed.category,
          DefaultTo: seed.defaultTo,
          ModifiedDt: now,
        });
      }
      for (const variable of seed.variables) {
        const existing = await EssaEmailScenarioVariable.findOne({
          where: { ScenarioId: scenario.Id, VariableName: variable.name },
        });
        if (existing) continue;
        await EssaEmailScenarioVariable.create({
          ScenarioId: scenario.Id,
          VariableName: variable.name,
          Label: variable.label,
          SampleValue: variable.sample,
          IsRequired: !!variable.required,
        });
      }
    }
    this.slaCatalogReady = true;
  }

  async listActiveSlaTemplates() {
    await this.ensureSlaScenarioCatalog();
    const rows = await EssaEmailTemplate.findAll({
      where: {
        IsDeleted: false,
        Status: "ACTIVE",
        ScenarioKey: { [Op.like]: "sla.%" },
      },
      order: [["Name", "ASC"], ["Id", "ASC"]],
    });
    return rows.map((row) => ({
      id: `tpl-${row.Id}`,
      name: row.Name,
      scenario: row.ScenarioKey,
    }));
  }

  async findActiveTemplate(opts: {
    templateId?: string | null;
    name?: string | null;
  }): Promise<EssaEmailTemplate | null> {
    const templateId = String(opts.templateId || "").trim();
    if (templateId) {
      const numeric = templateId.startsWith("tpl-") ? templateId.slice(4) : templateId;
      const id = Number(numeric);
      if (Number.isInteger(id) && id > 0) {
        const byId = await EssaEmailTemplate.findOne({
          where: { Id: id, IsDeleted: false, Status: "ACTIVE" },
        });
        if (byId) return byId;
      }
    }
    const name = String(opts.name || "").trim();
    if (!name) return null;
    return EssaEmailTemplate.findOne({
      where: { Name: name, IsDeleted: false, Status: "ACTIVE" },
    });
  }

  private async loadScenario(key: string) {
    if (isSlaScenarioKey(key)) {
      await this.ensureSlaScenarioCatalog();
    }
    const scenario = await EssaEmailScenario.findOne({
      where: { ScenarioKey: key, IsDeleted: false },
      include: [{ model: EssaEmailScenarioVariable, as: "variables" }],
    });
    return scenario;
  }

  private async listScenarios() {
    await this.ensureSlaScenarioCatalog();
    const rows = await EssaEmailScenario.findAll({
      where: { IsDeleted: false },
      include: [{ model: EssaEmailScenarioVariable, as: "variables" }],
      order: [
        ["Category", "ASC"],
        ["Label", "ASC"],
      ],
    });
    return rows.map(toScenarioDto);
  }

  private validateBody(body: TemplateBody, scenario: EssaEmailScenario | null): string[] {
    const problems: string[] = [];
    const name = String(body?.name || "").trim();
    const subject = String(body?.subject || "").trim();
    const bodyHtml = String(body?.bodyHtml || "");
    const to = String(body?.recipients?.to || "").trim();

    if (!name) problems.push("Name is required");
    if (!String(body?.scenario || "").trim()) problems.push("Scenario is required");
    if (!subject) problems.push("Subject is required");
    if (!stripHtml(bodyHtml)) problems.push("Body is required");

    if (!scenario) {
      problems.push("Unknown scenario");
      return problems;
    }

    if (!to && !isSlaScenarioKey(scenario.ScenarioKey)) {
      problems.push("To recipient is required");
    }

    const variables: EssaEmailScenarioVariable[] = (scenario as any).variables || [];
    const known = new Set(variables.map((v) => v.VariableName));
    const used = new Set(extractTokens(subject, bodyHtml));
    for (const token of used) {
      if (!known.has(token)) {
        problems.push(`Unknown placeholder {{${token}}}`);
      }
    }
    const status = String(body?.status || "ACTIVE").toUpperCase();
    if (!STATUSES.has(status)) problems.push("Status must be ACTIVE or INACTIVE");
    return problems;
  }

  private async writeVersion(
    template: EssaEmailTemplate,
    action: string,
    userId: number | null,
    note?: string | null,
  ) {
    await EssaEmailTemplateVersion.create({
      TemplateId: template.Id,
      Version: template.Version,
      Action: action,
      SnapshotJson: JSON.stringify(toSnapshot(template)),
      Note: note || null,
      ChangedAt: new Date(),
      ChangedBy: userId,
    });
  }

  private displayName(user?: User | null): string {
    return user?.Name || "";
  }

  private async reloadDto(id: number) {
    const row = await EssaEmailTemplate.findByPk(id, {
      include: [{ model: User, as: "modifier", attributes: ["ID", "Name"], required: false }],
    });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    return { template: toTemplateDto(row, this.displayName((row as any).modifier)) };
  }

  async list(query: Record<string, unknown>) {
    const q = String(query.q || "").trim();
    const scenario = String(query.scenario || "").trim();
    const status = String(query.status || "").trim().toUpperCase();
    const sortKey = String(query.sort || "updatedAt");
    const sortCol = SORT_FIELDS[sortKey] || "ModifiedDt";
    const dir = String(query.dir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const page = Math.max(1, Number(query.page) || 1);
    const pageSizeRaw = Number(query.pageSize) || 20;
    const pageSize = PAGE_SIZES.has(pageSizeRaw) ? pageSizeRaw : 20;

    const where: Record<string, unknown> = { IsDeleted: false };
    if (scenario) where.ScenarioKey = scenario;
    if (STATUSES.has(status)) where.Status = status;
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      (where as any)[Op.or] = [
        { Name: like },
        { ScenarioKey: like },
        { Subject: like },
        { RecipientTo: like },
        { Description: like },
      ];
    }

    const { rows, count } = await EssaEmailTemplate.findAndCountAll({
      where,
      include: [{ model: User, as: "modifier", attributes: ["ID", "Name"], required: false }],
      order: [[sortCol, dir]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      items: rows.map((row) => toTemplateDto(row, this.displayName((row as any).modifier))),
      total: count,
      scenarios: await this.listScenarios(),
    };
  }

  async getById(rawId: string) {
    const id = parseTemplateId(rawId);
    const row = await EssaEmailTemplate.findOne({
      where: { Id: id, IsDeleted: false },
      include: [{ model: User, as: "modifier", attributes: ["ID", "Name"], required: false }],
    });
    if (!row) {
      throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    }
    const versions = await EssaEmailTemplateVersion.findAll({
      where: { TemplateId: id },
      include: [{ model: User, as: "changer", attributes: ["ID", "Name"], required: false }],
      order: [["Version", "DESC"], ["Id", "DESC"]],
    });
    return {
      template: toTemplateDto(row, this.displayName((row as any).modifier)),
      versions: versions.map((v) => ({
        id: v.Id,
        versionId: v.Id,
        version: v.Version,
        action: v.Action,
        snapshot: JSON.parse(v.SnapshotJson || "{}"),
        note: v.Note || "",
        changedAt: v.ChangedAt?.toISOString?.() || null,
        changedBy: this.displayName((v as any).changer),
      })),
    };
  }

  async preview(body: {
    scenario?: string;
    subject?: string;
    bodyHtml?: string;
    context?: Record<string, unknown>;
    values?: Record<string, unknown>;
    invoiceId?: string | number;
    documentId?: string | number;
    invoiceNumber?: string;
    instanceId?: string | number;
  }) {
    const scenarioKey = String(body?.scenario || "").trim();
    if (scenarioKey) {
      const scenario = await this.loadScenario(scenarioKey);
      if (!scenario) {
        throw new TemplateProblemsError(["Unknown scenario"]);
      }
    }
    const subject = String(body?.subject || "");
    const bodyHtml = String(body?.bodyHtml || "");
    const values = await this.resolvePreviewValues(body);
    return {
      subject: renderPlaceholders(subject, values),
      html: renderPlaceholders(bodyHtml, values),
      text: stripHtml(renderPlaceholders(bodyHtml, values)),
      values,
    };
  }

  private async resolvePreviewValues(body: {
    context?: Record<string, unknown>;
    values?: Record<string, unknown>;
    invoiceId?: string | number;
    documentId?: string | number;
    invoiceNumber?: string;
    instanceId?: string | number;
  }): Promise<Record<string, string>> {
    const explicit = {
      ...asContextMap(body?.values),
      ...asContextMap(body?.context),
    };
    const real = await this.loadRealPreviewContext({
      invoiceId: body?.invoiceId ?? explicit.invoiceId,
      documentId: body?.documentId ?? explicit.documentId,
      invoiceNumber: body?.invoiceNumber ?? explicit.invoiceNumber,
      instanceId: body?.instanceId ?? explicit.instanceId,
    });
    return enrichSlaContext({ ...real, ...explicit });
  }

  private async loadRealPreviewContext(ids: {
    invoiceId?: unknown;
    documentId?: unknown;
    invoiceNumber?: unknown;
    instanceId?: unknown;
  }): Promise<Record<string, string>> {
    const instanceId = parseOptionalNumericId(ids.instanceId, "i");
    const invoicePk = parseOptionalNumericId(ids.invoiceId);
    const documentId = parseOptionalNumericId(ids.documentId);
    const invoiceNumber = String(ids.invoiceNumber || "").trim();

    let instance: EssaSlaInstance | null = null;
    if (instanceId) {
      instance = await EssaSlaInstance.findOne({
        where: { Id: instanceId, IsDeleted: false },
      });
    }

    let invoice: EssaInvoice | null = null;
    if (invoicePk) {
      invoice = await EssaInvoice.findOne({
        where: { Id: invoicePk, IsDeleted: false },
      });
    } else if (documentId) {
      invoice = await EssaInvoice.findOne({
        where: { DocumentId: documentId, IsDeleted: false },
      });
    } else if (invoiceNumber) {
      invoice = await EssaInvoice.findOne({
        where: { InvoiceNo: invoiceNumber, IsDeleted: false },
        order: [["Id", "DESC"]],
      });
    } else if (instance?.InvoiceId) {
      invoice = await EssaInvoice.findByPk(instance.InvoiceId);
    }

    if (invoice && !instance) {
      instance = await EssaSlaInstance.findOne({
        where: { InvoiceId: invoice.Id, IsDeleted: false },
        order: [["StartedAt", "DESC"], ["Id", "DESC"]],
      });
    }

    const values: Record<string, string> = {};
    if (invoice) {
      const dueIso = isoOrEmpty(invoice.SlaDueAt);
      Object.assign(values, {
        invoiceNumber: String(invoice.InvoiceNo || ""),
        vendorName: String(invoice.VendorName || ""),
        vendorCode: String(invoice.VendorCode || ""),
        poNumber: String(invoice.PoNumber || ""),
        invoiceDate: isoOrEmpty(invoice.InvoiceDate).slice(0, 10),
        totalAmount: invoice.TotalAmount != null ? String(invoice.TotalAmount) : "",
        currency: String(invoice.Currency || ""),
        stage: String(invoice.WorkflowStage || ""),
        slaDueDate: dueIso ? dueIso.slice(0, 10) : "",
        dueAt: dueIso,
        dueDate: dueIso,
      });
    }
    if (instance) {
      const dueAt = instance.DueAt ? new Date(instance.DueAt) : null;
      const dueIso = isoOrEmpty(instance.DueAt);
      Object.assign(values, {
        invoiceNumber: values.invoiceNumber || String(instance.InvoiceNumber || ""),
        vendorName: values.vendorName || String(instance.VendorName || ""),
        policyCode: String(instance.PolicyCode || ""),
        policyName: String(instance.PolicyName || ""),
        stage: String(instance.Stage || values.stage || ""),
        owner: String(instance.Owner || ""),
        dueAt: dueIso,
        dueDate: dueIso,
        slaDueDate: dueIso ? dueIso.slice(0, 10) : values.slaDueDate || "",
        remainingTime: formatRemainingPreview(dueAt),
      });
    }

    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value) cleaned[key] = value;
    }
    return cleaned;
  }

  async create(body: TemplateBody, userId: number) {
    const scenario = await this.loadScenario(String(body?.scenario || "").trim());
    const problems = this.validateBody(body, scenario);
    if (problems.length) throw new TemplateProblemsError(problems);
    if (!scenario) throw new TemplateProblemsError(["Unknown scenario"]);

    const required = ((scenario as any).variables as EssaEmailScenarioVariable[])
      .filter((v) => v.IsRequired)
      .map((v) => v.VariableName);
    const now = new Date();
    const row = await EssaEmailTemplate.create({
      Name: String(body.name).trim(),
      ScenarioKey: scenario.ScenarioKey,
      Description: String(body.description || "").trim() || null,
      Subject: String(body.subject).trim(),
      BodyHtml: String(body.bodyHtml || ""),
      RecipientTo: String(body.recipients?.to || "").trim(),
      RecipientCc: String(body.recipients?.cc || "").trim() || null,
      RecipientBcc: String(body.recipients?.bcc || "").trim() || null,
      RequiredPlaceholders: JSON.stringify(required),
      Status: String(body.status || "ACTIVE").toUpperCase(),
      IsSystem: false,
      Version: 1,
      IsDeleted: false,
      CreatedDt: now,
      CreatedBy: userId,
      ModifiedDt: now,
      ModifiedBy: userId,
    });
    await this.writeVersion(row, "CREATED", userId);
    return this.reloadDto(row.Id);
  }

  async update(rawId: string, body: TemplateBody, userId: number) {
    const id = parseTemplateId(rawId);
    const row = await EssaEmailTemplate.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);

    const nextScenarioKey = String(body?.scenario || row.ScenarioKey).trim();
    if (row.IsSystem && nextScenarioKey !== row.ScenarioKey) {
      throw new TemplateProblemsError(["System templates cannot change scenario"]);
    }

    const scenario = await this.loadScenario(nextScenarioKey);
    const problems = this.validateBody({ ...body, scenario: nextScenarioKey }, scenario);
    if (problems.length) throw new TemplateProblemsError(problems);
    if (!scenario) throw new TemplateProblemsError(["Unknown scenario"]);

    const nextStatus = String(body.status || row.Status).toUpperCase();
    const onlyStatus =
      String(body.name || "").trim() === row.Name &&
      nextScenarioKey === row.ScenarioKey &&
      String(body.description || "") === (row.Description || "") &&
      String(body.subject || "").trim() === row.Subject &&
      String(body.bodyHtml || "") === row.BodyHtml &&
      String(body.recipients?.to || "").trim() === (row.RecipientTo || "") &&
      String(body.recipients?.cc || "").trim() === (row.RecipientCc || "") &&
      String(body.recipients?.bcc || "").trim() === (row.RecipientBcc || "") &&
      nextStatus !== row.Status;

    const required = ((scenario as any).variables as EssaEmailScenarioVariable[])
      .filter((v) => v.IsRequired)
      .map((v) => v.VariableName);
    const now = new Date();
    await row.update({
      Name: String(body.name).trim(),
      ScenarioKey: scenario.ScenarioKey,
      Description: String(body.description || "").trim() || null,
      Subject: String(body.subject).trim(),
      BodyHtml: String(body.bodyHtml || ""),
      RecipientTo: String(body.recipients?.to || "").trim(),
      RecipientCc: String(body.recipients?.cc || "").trim() || null,
      RecipientBcc: String(body.recipients?.bcc || "").trim() || null,
      RequiredPlaceholders: JSON.stringify(required),
      Status: nextStatus,
      Version: row.Version + 1,
      ModifiedDt: now,
      ModifiedBy: userId,
    });

    let action = "UPDATED";
    if (onlyStatus) {
      action = nextStatus === "ACTIVE" ? "ACTIVATED" : "DEACTIVATED";
    }
    await this.writeVersion(row, action, userId);
    return this.reloadDto(row.Id);
  }

  async duplicate(rawId: string, userId: number) {
    const id = parseTemplateId(rawId);
    const row = await EssaEmailTemplate.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    const now = new Date();
    const copy = await EssaEmailTemplate.create({
      Name: `${row.Name} (copy)`,
      ScenarioKey: row.ScenarioKey,
      Description: row.Description,
      Subject: row.Subject,
      BodyHtml: row.BodyHtml,
      RecipientTo: row.RecipientTo,
      RecipientCc: row.RecipientCc,
      RecipientBcc: row.RecipientBcc,
      RequiredPlaceholders: row.RequiredPlaceholders,
      Status: "INACTIVE",
      IsSystem: false,
      Version: 1,
      IsDeleted: false,
      CreatedDt: now,
      CreatedBy: userId,
      ModifiedDt: now,
      ModifiedBy: userId,
    });
    await this.writeVersion(copy, "DUPLICATED", userId, `Copied from ${row.Name}`);
    return this.reloadDto(copy.Id);
  }

  async setStatus(rawId: string, statusRaw: string, userId: number) {
    const id = parseTemplateId(rawId);
    const status = String(statusRaw || "").toUpperCase();
    if (!STATUSES.has(status)) {
      throw new TemplateProblemsError(["Status must be ACTIVE or INACTIVE"]);
    }
    const row = await EssaEmailTemplate.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.Status === status) {
      return this.reloadDto(row.Id);
    }
    await row.update({
      Status: status,
      Version: row.Version + 1,
      ModifiedDt: new Date(),
      ModifiedBy: userId,
    });
    await this.writeVersion(row, status === "ACTIVE" ? "ACTIVATED" : "DEACTIVATED", userId);
    return this.reloadDto(row.Id);
  }

  async remove(rawId: string, userId: number) {
    const id = parseTemplateId(rawId);
    const row = await EssaEmailTemplate.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (row.IsSystem) {
      throw new APIError("System templates cannot be deleted", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    await row.update({
      IsDeleted: true,
      ModifiedDt: new Date(),
      ModifiedBy: userId,
    });
    return { ok: true };
  }

  async restore(rawId: string, versionIdRaw: unknown, userId: number) {
    const id = parseTemplateId(rawId);
    const versionId = parseVersionId(versionIdRaw);
    const row = await EssaEmailTemplate.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    const version = await EssaEmailTemplateVersion.findOne({
      where: { Id: versionId, TemplateId: id },
    });
    if (!version) throw new APIError("Version not found", StatusCodeEnum.HTTP_NOT_FOUND);

    let snapshot: Snapshot;
    try {
      snapshot = JSON.parse(version.SnapshotJson || "{}");
    } catch {
      throw new APIError("Version snapshot is corrupt", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    const scenarioKey = row.IsSystem ? row.ScenarioKey : snapshot.scenario || row.ScenarioKey;
    const now = new Date();
    await row.update({
      Name: snapshot.name || row.Name,
      ScenarioKey: scenarioKey,
      Description: snapshot.description || null,
      Subject: snapshot.subject || row.Subject,
      BodyHtml: snapshot.bodyHtml || row.BodyHtml,
      RecipientTo: snapshot.recipients?.to || row.RecipientTo,
      RecipientCc: snapshot.recipients?.cc || null,
      RecipientBcc: snapshot.recipients?.bcc || null,
      RequiredPlaceholders: JSON.stringify(snapshot.requiredPlaceholders || parseRequired(row.RequiredPlaceholders)),
      Status: snapshot.status || row.Status,
      Version: row.Version + 1,
      ModifiedDt: now,
      ModifiedBy: userId,
    });
    await this.writeVersion(row, "RESTORED", userId, `Restored v${version.Version}`);
    return this.reloadDto(row.Id);
  }

  async testSend(rawId: string, userId: number) {
    const id = parseTemplateId(rawId);
    const row = await EssaEmailTemplate.findOne({ where: { Id: id, IsDeleted: false } });
    if (!row) throw new APIError("Template not found", StatusCodeEnum.HTTP_NOT_FOUND);
    const user = await User.findByPk(userId);
    const userEmail = String(user?.Email || "").trim();
    const templateTo = String(row.RecipientTo || "")
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter((part) => part.includes("@"));
    const recipients = [...new Set([userEmail, ...templateTo].filter(Boolean))];
    if (!recipients.length) {
      throw new APIError(
        "No email address to send to. Set a To recipient on the template or add an email on your user account.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    const subject = `[TEST] ${row.Subject}`;
    const html = row.BodyHtml;
    try {
      const info = await mail.sendEmail(recipients.join(", "), subject, html);
      return {
        sent: true,
        to: recipients.join(", "),
        subject,
        previewUrl: (info as { previewUrl?: string })?.previewUrl || null,
      };
    } catch (error: any) {
      throw new APIError(
        error?.message || "Failed to send test email. Check SMTP configuration.",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resolveForSend(scenarioKey: string, context: Record<string, string> = {}) {
    const active = await EssaEmailTemplate.findOne({
      where: { ScenarioKey: scenarioKey, Status: "ACTIVE", IsDeleted: false },
      order: [["ModifiedDt", "DESC"], ["Id", "DESC"]],
    });
    const system = await EssaEmailTemplate.findOne({
      where: { ScenarioKey: scenarioKey, IsSystem: true },
      order: [["Id", "ASC"]],
    });
    const row = active || system;
    if (!row) return null;

    const values = enrichSlaContext(context);
    return {
      subject: renderPlaceholders(row.Subject, values),
      html: renderPlaceholders(row.BodyHtml, values),
      text: stripHtml(renderPlaceholders(row.BodyHtml, values)),
      to: await this.resolveAudience(row.RecipientTo, values),
      cc: await this.resolveAudience(row.RecipientCc, values),
      bcc: await this.resolveAudience(row.RecipientBcc, values),
    };
  }

  private async resolveAudience(
    label: string | null,
    context: Record<string, string>,
  ): Promise<string> {
    const raw = String(label || "").trim();
    if (!raw) return "";
    if (raw.includes("@")) return raw;

    const normalized = raw.toLowerCase();
    if (normalized.includes("vendor")) return context.vendorEmail || "";
    if (normalized.includes("approver")) return context.approverEmail || "";

    const roleByLabel: Record<string, number> = {
      "ap team": UserRole.AP_TEAM,
      "ap processor": UserRole.AP_TEAM,
      "ap supervisor": UserRole.AP_SUPERVISOR,
      "ap lead": UserRole.AP_LEAD,
      "finance manager": UserRole.FINANCE_MANAGER,
      admin: UserRole.ADMIN,
    };
    const roleId = roleByLabel[normalized];
    if (!roleId) return raw;
    const users = await User.findAll({
      where: { Role_id: roleId, Is_Deleted: false, Is_Active: true },
      attributes: ["Email"],
    });
    return users.map((u) => u.Email).filter(Boolean).join(", ");
  }
}

export default new EmailTemplateService();
