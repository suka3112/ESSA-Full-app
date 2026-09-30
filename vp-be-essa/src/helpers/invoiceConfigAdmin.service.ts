/**
 * Admin CRUD for SAP field mappings and document validation rules
 * (AP_INVOICE_CONFIG_VERSION + child tables).
 */
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { ApExtractionInvoiceType } from "../models/apExtractionInvoiceType";
import { ApExtractionDocument } from "../models/apExtractionDocument";
import {
  ApInvoiceConfigVersion,
  ApSapFieldMapping,
  ApDocumentValidationRule,
} from "../models/apInvoiceConfigAssociations";

const VALIDATION_TYPE_DB = [
  "EXACT_MATCH",
  "DATE_MATCH",
  "AMOUNT_MATCH",
  "CODE_MATCH",
  "LIST_MATCH",
] as const;
const TOLERANCE_TYPE_DB = ["EXACT", "DAYS", "PERCENT", "RANGE"] as const;
const CHECK_SCOPE_DB = ["AVAILABILITY_CONTENT", "AVAILABILITY_ONLY"] as const;
const MISSING_ACTION_DB = ["BLOCK", "WARNING"] as const;

const VALIDATION_TYPE_FROM_UI: Record<string, string> = {
  "exact match": "EXACT_MATCH",
  exact_match: "EXACT_MATCH",
  "date match": "DATE_MATCH",
  date_match: "DATE_MATCH",
  "amount match": "AMOUNT_MATCH",
  amount_match: "AMOUNT_MATCH",
  "code match": "CODE_MATCH",
  code_match: "CODE_MATCH",
  "list match": "LIST_MATCH",
  list_match: "LIST_MATCH",
};

const VALIDATION_TYPE_TO_UI: Record<string, string> = {
  EXACT_MATCH: "Exact Match",
  DATE_MATCH: "Date Match",
  AMOUNT_MATCH: "Amount Match",
  CODE_MATCH: "Code Match",
  LIST_MATCH: "List Match",
};

const CHECK_SCOPE_FROM_UI: Record<string, string> = {
  "availability + content": "AVAILABILITY_CONTENT",
  "availability and content": "AVAILABILITY_CONTENT",
  availability_content: "AVAILABILITY_CONTENT",
  "availability only": "AVAILABILITY_ONLY",
  availability_only: "AVAILABILITY_ONLY",
};

const CHECK_SCOPE_TO_UI: Record<string, string> = {
  AVAILABILITY_CONTENT: "Availability + Content",
  AVAILABILITY_ONLY: "Availability Only",
};

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function requireId(value: unknown, label: string): number {
  const n = asNumber(value);
  if (!n || n <= 0) {
    throw new APIError(`Invalid ${label}`, StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return n;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return fallback;
}

function asStatus(value: unknown, fallback = "Active"): "Active" | "Inactive" {
  const s = String(value ?? fallback).trim();
  if (s.toLowerCase() === "inactive") return "Inactive";
  return "Active";
}

function yesNo(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

function parseValidationType(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) {
    throw new APIError("Validation type is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  const mapped = VALIDATION_TYPE_FROM_UI[s.toLowerCase()] || s.toUpperCase().replace(/\s+/g, "_");
  if (!VALIDATION_TYPE_DB.includes(mapped as (typeof VALIDATION_TYPE_DB)[number])) {
    throw new APIError("Invalid validation type", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return mapped;
}

function parseTolerance(
  rawType: unknown,
  rawValue: unknown,
  rawPreset: unknown,
): { toleranceType: string; toleranceValue: number | null } {
  const preset = String(rawPreset || "").trim();
  if (preset) {
    const days = preset.match(/([+-]?\s*)?(\d+)\s*days?/i);
    const pct = preset.match(/(\d+(?:\.\d+)?)\s*%/);
    if (/^exact$/i.test(preset)) return { toleranceType: "EXACT", toleranceValue: null };
    if (/range/i.test(preset)) return { toleranceType: "RANGE", toleranceValue: asNumber(rawValue) };
    if (days) return { toleranceType: "DAYS", toleranceValue: Number(days[2]) };
    if (pct) return { toleranceType: "PERCENT", toleranceValue: Number(pct[1]) };
  }
  const typeRaw = String(rawType || "EXACT").trim();
  const mapped = typeRaw.toUpperCase().replace(/\s+/g, "_");
  if (!TOLERANCE_TYPE_DB.includes(mapped as (typeof TOLERANCE_TYPE_DB)[number])) {
    throw new APIError("Invalid tolerance type", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return { toleranceType: mapped, toleranceValue: asNumber(rawValue) };
}

function toleranceToUi(type: string, value: number | null): string {
  if (type === "DAYS") return `Allow +/- ${value ?? 3} days`;
  if (type === "PERCENT") return `Difference <= ${value ?? 2}%`;
  if (type === "RANGE") return "From - To Range";
  return "Exact";
}

function parseCheckScope(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) {
    throw new APIError("Check scope is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  const mapped = CHECK_SCOPE_FROM_UI[s.toLowerCase()] || s.toUpperCase().replace(/\s+/g, "_");
  if (!CHECK_SCOPE_DB.includes(mapped as (typeof CHECK_SCOPE_DB)[number])) {
    throw new APIError("Invalid check scope", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return mapped;
}

function parseMissingAction(raw: unknown): string {
  const s = String(raw || "").trim().toUpperCase();
  if (!MISSING_ACTION_DB.includes(s as (typeof MISSING_ACTION_DB)[number])) {
    throw new APIError("Missing action must be BLOCK or WARNING", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  return s;
}

function sapTableFromField(sapFieldName: string): string | null {
  const part = String(sapFieldName || "").split("-")[0];
  return part ? part.slice(0, 50) : null;
}

function slugRuleCode(name: string): string {
  const slug = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return slug || "RULE";
}

function serializeVersion(row: ApInvoiceConfigVersion) {
  return {
    configVersionId: Number(row.ConfigVersionId),
    invoiceTypeId: Number(row.InvoiceTypeId),
    versionCode: row.VersionCode,
    versionLabel: row.VersionLabel,
    status: row.Status,
    effectiveFrom: row.EffectiveFrom,
    effectiveTo: row.EffectiveTo,
  };
}

function serializeMapping(row: ApSapFieldMapping) {
  const value = row.ToleranceValue == null ? null : Number(row.ToleranceValue);
  return {
    mappingId: Number(row.MappingId),
    configVersionId: Number(row.ConfigVersionId),
    capturedField: row.CapturedFieldCode,
    capturedFieldCode: row.CapturedFieldCode,
    description: row.CapturedFieldDescription || "",
    sapField: row.SapFieldName,
    sapFieldName: row.SapFieldName,
    sapFieldDescription: row.SapFieldDescription || "",
    validationType: VALIDATION_TYPE_TO_UI[row.ValidationType] || row.ValidationType,
    validationTypeCode: row.ValidationType,
    tolerance: toleranceToUi(row.ToleranceType, value),
    toleranceType: row.ToleranceType,
    toleranceValue: value,
    mandatory: yesNo(Boolean(row.IsMandatory)),
    isMandatory: Boolean(row.IsMandatory),
    status: row.Status,
    displayOrder: row.DisplayOrder,
  };
}

function serializeRule(row: ApDocumentValidationRule, invoiceTypeCode?: string, categoryLabel?: string) {
  return {
    ruleId: Number(row.RuleId),
    configVersionId: Number(row.ConfigVersionId),
    documentId: row.DocumentId == null ? null : Number(row.DocumentId),
    documentTitle: row.DocumentTitle,
    ruleCode: row.RuleCode,
    ruleName: row.RuleName,
    checkScope: CHECK_SCOPE_TO_UI[row.CheckScope] || row.CheckScope,
    checkScopeCode: row.CheckScope,
    mandatory: yesNo(Boolean(row.IsMandatory)),
    isMandatory: Boolean(row.IsMandatory),
    missingAction: row.MissingAction === "BLOCK" ? "Block" : "Warning",
    missingActionCode: row.MissingAction,
    contentValidation: yesNo(Boolean(row.ContentValidation)),
    workflowImpact: row.WorkflowImpact || "",
    workflowImpactDetail: row.WorkflowImpactDetail || "",
    status: row.Status,
    displayOrder: row.DisplayOrder,
    category: invoiceTypeCode || null,
    categoryLabel: categoryLabel || invoiceTypeCode || null,
  };
}

async function findInvoiceType(code: string): Promise<ApExtractionInvoiceType> {
  const invoiceType = await ApExtractionInvoiceType.findOne({
    where: { Code: String(code || "").trim().toUpperCase(), IsDeleted: false },
  });
  if (!invoiceType) {
    throw new APIError(
      `Invoice type ${String(code || "").trim()} was not found. Create it under Document Types first.`,
      StatusCodeEnum.HTTP_NOT_FOUND,
    );
  }
  return invoiceType;
}

async function loadVersionOrThrow(configVersionId: number): Promise<ApInvoiceConfigVersion> {
  const version = await ApInvoiceConfigVersion.findOne({
    where: { ConfigVersionId: configVersionId, IsDeleted: false },
  });
  if (!version) {
    throw new APIError("Config version not found", StatusCodeEnum.HTTP_NOT_FOUND);
  }
  return version;
}

export async function ensureConfigVersion(
  invoiceTypeCode: string,
  configVersionId?: number | null,
  userId?: number | null,
): Promise<ApInvoiceConfigVersion> {
  const type = await findInvoiceType(invoiceTypeCode);
  if (configVersionId) {
    const version = await loadVersionOrThrow(configVersionId);
    if (Number(version.InvoiceTypeId) !== Number(type.InvoiceTypeId)) {
      throw new APIError(
        "Config version does not belong to this invoice type",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    return version;
  }

  const existing = await ApInvoiceConfigVersion.findOne({
    where: { InvoiceTypeId: type.InvoiceTypeId, IsDeleted: false, Status: "Active" },
    order: [["ConfigVersionId", "DESC"]],
  });
  if (existing) return existing;

  const anyVersion = await ApInvoiceConfigVersion.findOne({
    where: { InvoiceTypeId: type.InvoiceTypeId, IsDeleted: false },
    order: [["ConfigVersionId", "DESC"]],
  });
  if (anyVersion) return anyVersion;

  const today = new Date().toISOString().slice(0, 10);
  return ApInvoiceConfigVersion.create({
    InvoiceTypeId: type.InvoiceTypeId,
    VersionCode: "v1.0",
    VersionLabel: "v1.0",
    EffectiveFrom: today,
    Status: "Active",
    IsDeleted: false,
    CreatedAt: sequelize.literal("NOW()"),
    CreatedBy: userId ?? null,
  } as any);
}

async function nextDisplayOrder(
  model: typeof ApSapFieldMapping | typeof ApDocumentValidationRule,
  configVersionId: number,
): Promise<number> {
  const maxRow = await (model as any).findOne({
    where: { ConfigVersionId: configVersionId, IsDeleted: false },
    order: [["DisplayOrder", "DESC"]],
  });
  return Number(maxRow?.DisplayOrder || 0) + 1;
}

async function resolveDocumentId(documentTitle: string): Promise<number | null> {
  const title = String(documentTitle || "").trim();
  if (!title) return null;
  const docs = await ApExtractionDocument.findAll({
    where: { IsDeleted: false },
    attributes: ["DocumentId", "Name"],
  });
  const match = docs.find((d) => String(d.Name || "").trim().toLowerCase() === title.toLowerCase());
  return match ? Number(match.DocumentId) : null;
}

async function uniqueRuleCode(configVersionId: number, desired: string, excludeRuleId?: number): Promise<string> {
  let code = slugRuleCode(desired);
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? code : `${code.slice(0, 46)}_${i + 1}`.slice(0, 50);
    const clash = await ApDocumentValidationRule.findOne({
      where: {
        ConfigVersionId: configVersionId,
        RuleCode: candidate,
        IsDeleted: false,
        ...(excludeRuleId ? { RuleId: { [Op.ne]: excludeRuleId } } : {}),
      },
    });
    if (!clash) return candidate;
  }
  return `${code.slice(0, 40)}_${Date.now()}`.slice(0, 50);
}

export async function getInvoiceConfig(params: {
  invoiceTypeCode: string;
  configVersionId?: number | null;
}) {
  const type = await findInvoiceType(params.invoiceTypeCode);
  const versions = await ApInvoiceConfigVersion.findAll({
    where: { InvoiceTypeId: type.InvoiceTypeId, IsDeleted: false },
    order: [
      ["Status", "ASC"],
      ["ConfigVersionId", "DESC"],
    ],
  });

  let selected =
    params.configVersionId != null
      ? versions.find((v) => Number(v.ConfigVersionId) === Number(params.configVersionId)) || null
      : versions.find((v) => v.Status === "Active") || versions[0] || null;

  const sapMappings = selected
    ? await ApSapFieldMapping.findAll({
        where: { ConfigVersionId: selected.ConfigVersionId, IsDeleted: false },
        order: [["DisplayOrder", "ASC"], ["MappingId", "ASC"]],
      })
    : [];
  const documentRules = selected
    ? await ApDocumentValidationRule.findAll({
        where: { ConfigVersionId: selected.ConfigVersionId, IsDeleted: false },
        order: [["DisplayOrder", "ASC"], ["RuleId", "ASC"]],
      })
    : [];

  return {
    invoiceTypeId: Number(type.InvoiceTypeId),
    invoiceTypeCode: type.Code,
    invoiceTypeName: type.Name,
    versions: versions.map(serializeVersion),
    selectedVersion: selected
      ? {
          ...serializeVersion(selected),
          sapMappings: sapMappings.map(serializeMapping),
          documentRules: documentRules.map((row) => serializeRule(row, type.Code, type.Name)),
        }
      : null,
  };
}

export async function createSapMapping(body: Record<string, unknown>, userId?: number | null) {
  const invoiceTypeCode = String(body.invoiceTypeCode || body.category || "").trim();
  if (!invoiceTypeCode) {
    throw new APIError("invoiceTypeCode is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  const version = await ensureConfigVersion(
    invoiceTypeCode,
    asNumber(body.configVersionId),
    userId,
  );
  const capturedFieldCode = String(body.capturedFieldCode || body.capturedField || "")
    .trim()
    .toUpperCase();
  const sapFieldName = String(body.sapFieldName || body.sapField || "").trim();
  if (!capturedFieldCode) {
    throw new APIError("Captured field is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  if (!sapFieldName) {
    throw new APIError("SAP field is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  const dup = await ApSapFieldMapping.findOne({
    where: {
      ConfigVersionId: version.ConfigVersionId,
      CapturedFieldCode: capturedFieldCode,
      IsDeleted: false,
    },
  });
  if (dup) {
    throw new APIError(
      `A mapping for ${capturedFieldCode} already exists on this version`,
      StatusCodeEnum.HTTP_CONFLICT,
    );
  }

  const validationType = parseValidationType(body.validationType || body.validationTypeCode);
  const { toleranceType, toleranceValue } = parseTolerance(
    body.toleranceType,
    body.toleranceValue,
    body.tolerance,
  );
  const displayOrder =
    asNumber(body.displayOrder) ??
    (await nextDisplayOrder(ApSapFieldMapping, Number(version.ConfigVersionId)));

  const row = await ApSapFieldMapping.create({
    ConfigVersionId: version.ConfigVersionId,
    CapturedFieldCode: capturedFieldCode.slice(0, 100),
    CapturedFieldDescription: String(body.capturedFieldDescription || body.description || "").trim() || null,
    SapTable: sapTableFromField(sapFieldName),
    SapFieldName: sapFieldName.slice(0, 100),
    SapFieldDescription: String(body.sapFieldDescription || "").trim() || null,
    ValidationType: validationType,
    ToleranceType: toleranceType,
    ToleranceValue: toleranceValue,
    IsMandatory: asBool(body.isMandatory ?? body.mandatory, true),
    Status: asStatus(body.status),
    DisplayOrder: displayOrder,
    IsDeleted: false,
    CreatedAt: sequelize.literal("NOW()"),
    CreatedBy: userId ?? null,
  } as any);

  return {
    configVersion: serializeVersion(version),
    mapping: serializeMapping(row),
  };
}

export async function updateSapMapping(
  mappingIdRaw: unknown,
  body: Record<string, unknown>,
  userId?: number | null,
) {
  const mappingId = requireId(mappingIdRaw, "mapping id");
  const row = await ApSapFieldMapping.findOne({
    where: { MappingId: mappingId, IsDeleted: false },
  });
  if (!row) {
    throw new APIError("SAP field mapping not found", StatusCodeEnum.HTTP_NOT_FOUND);
  }

  if (body.isDeleted === true) {
    await row.update({
      IsDeleted: true,
      UpdatedAt: sequelize.literal("NOW()"),
      UpdatedBy: userId ?? null,
    });
    return { mappingId, deleted: true };
  }

  const capturedFieldCode = String(
    body.capturedFieldCode || body.capturedField || row.CapturedFieldCode,
  )
    .trim()
    .toUpperCase();
  const sapFieldName = String(body.sapFieldName || body.sapField || row.SapFieldName).trim();
  if (!capturedFieldCode || !sapFieldName) {
    throw new APIError("Captured field and SAP field are required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  if (capturedFieldCode !== row.CapturedFieldCode) {
    const dup = await ApSapFieldMapping.findOne({
      where: {
        ConfigVersionId: row.ConfigVersionId,
        CapturedFieldCode: capturedFieldCode,
        IsDeleted: false,
        MappingId: { [Op.ne]: mappingId },
      },
    });
    if (dup) {
      throw new APIError(
        `A mapping for ${capturedFieldCode} already exists on this version`,
        StatusCodeEnum.HTTP_CONFLICT,
      );
    }
  }

  const validationType = parseValidationType(
    body.validationType || body.validationTypeCode || row.ValidationType,
  );
  const { toleranceType, toleranceValue } = parseTolerance(
    body.toleranceType ?? row.ToleranceType,
    body.toleranceValue ?? row.ToleranceValue,
    body.tolerance,
  );

  await row.update({
    CapturedFieldCode: capturedFieldCode.slice(0, 100),
    CapturedFieldDescription:
      body.capturedFieldDescription != null || body.description != null
        ? String(body.capturedFieldDescription || body.description || "").trim() || null
        : row.CapturedFieldDescription,
    SapTable: sapTableFromField(sapFieldName),
    SapFieldName: sapFieldName.slice(0, 100),
    SapFieldDescription:
      body.sapFieldDescription != null
        ? String(body.sapFieldDescription || "").trim() || null
        : row.SapFieldDescription,
    ValidationType: validationType,
    ToleranceType: toleranceType,
    ToleranceValue: toleranceValue,
    IsMandatory: asBool(body.isMandatory ?? body.mandatory, Boolean(row.IsMandatory)),
    Status: asStatus(body.status ?? row.Status),
    DisplayOrder: asNumber(body.displayOrder) ?? row.DisplayOrder,
    UpdatedAt: sequelize.literal("NOW()"),
    UpdatedBy: userId ?? null,
  });

  await row.reload();
  return { mapping: serializeMapping(row) };
}

export async function createValidationRule(body: Record<string, unknown>, userId?: number | null) {
  const invoiceTypeCode = String(body.invoiceTypeCode || body.category || "").trim();
  if (!invoiceTypeCode) {
    throw new APIError("invoiceTypeCode is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  const version = await ensureConfigVersion(
    invoiceTypeCode,
    asNumber(body.configVersionId),
    userId,
  );
  const documentTitle = String(body.documentTitle || "").trim();
  const ruleName = String(body.ruleName || "").trim();
  if (!documentTitle) {
    throw new APIError("Document title is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }
  if (!ruleName) {
    throw new APIError("Rule name is required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  const checkScope = parseCheckScope(body.checkScope || body.checkScopeCode);
  const missingAction = parseMissingAction(body.missingAction || body.missingActionCode);
  const ruleCode = await uniqueRuleCode(
    Number(version.ConfigVersionId),
    String(body.ruleCode || ruleName),
  );
  const displayOrder =
    asNumber(body.displayOrder) ??
    (await nextDisplayOrder(ApDocumentValidationRule, Number(version.ConfigVersionId)));
  const contentValidation =
    body.contentValidation != null
      ? asBool(body.contentValidation, checkScope !== "AVAILABILITY_ONLY")
      : checkScope !== "AVAILABILITY_ONLY";
  const isMandatory = asBool(body.isMandatory ?? body.mandatory, true);
  const workflowImpact =
    String(body.workflowImpact || "").trim() ||
    (missingAction === "BLOCK" ? "Exception + Hold" : "Exception");
  const workflowImpactDetail =
    String(body.workflowImpactDetail || "").trim() ||
    (missingAction === "BLOCK"
      ? "Create exception and block workflow until uploaded."
      : "Create exception");

  const row = await ApDocumentValidationRule.create({
    ConfigVersionId: version.ConfigVersionId,
    DocumentId: await resolveDocumentId(documentTitle),
    DocumentTitle: documentTitle.slice(0, 200),
    RuleCode: ruleCode,
    RuleName: ruleName.slice(0, 200),
    CheckScope: checkScope,
    IsMandatory: isMandatory,
    MissingAction: missingAction,
    ContentValidation: contentValidation,
    WorkflowImpact: workflowImpact.slice(0, 100),
    WorkflowImpactDetail: workflowImpactDetail.slice(0, 500),
    Status: asStatus(body.status),
    DisplayOrder: displayOrder,
    IsDeleted: false,
    CreatedAt: sequelize.literal("NOW()"),
    CreatedBy: userId ?? null,
  } as any);

  return {
    configVersion: serializeVersion(version),
    rule: serializeRule(row, invoiceTypeCode),
  };
}

export async function updateValidationRule(
  ruleIdRaw: unknown,
  body: Record<string, unknown>,
  userId?: number | null,
) {
  const ruleId = requireId(ruleIdRaw, "rule id");
  const row = await ApDocumentValidationRule.findOne({
    where: { RuleId: ruleId, IsDeleted: false },
  });
  if (!row) {
    throw new APIError("Validation rule not found", StatusCodeEnum.HTTP_NOT_FOUND);
  }

  if (body.isDeleted === true) {
    await row.update({
      IsDeleted: true,
      UpdatedAt: sequelize.literal("NOW()"),
      UpdatedBy: userId ?? null,
    });
    return { ruleId, deleted: true };
  }

  const documentTitle = String(body.documentTitle ?? row.DocumentTitle).trim();
  const ruleName = String(body.ruleName ?? row.RuleName).trim();
  if (!documentTitle || !ruleName) {
    throw new APIError("Document title and rule name are required", StatusCodeEnum.HTTP_BAD_REQUEST);
  }

  const checkScope = parseCheckScope(body.checkScope || body.checkScopeCode || row.CheckScope);
  const missingAction = parseMissingAction(
    body.missingAction || body.missingActionCode || row.MissingAction,
  );
  let ruleCode = row.RuleCode;
  if (body.ruleCode != null && String(body.ruleCode).trim()) {
    ruleCode = await uniqueRuleCode(
      Number(row.ConfigVersionId),
      String(body.ruleCode),
      ruleId,
    );
  }

  await row.update({
    DocumentTitle: documentTitle.slice(0, 200),
    DocumentId: await resolveDocumentId(documentTitle),
    RuleCode: ruleCode,
    RuleName: ruleName.slice(0, 200),
    CheckScope: checkScope,
    IsMandatory: asBool(body.isMandatory ?? body.mandatory, Boolean(row.IsMandatory)),
    MissingAction: missingAction,
    ContentValidation:
      body.contentValidation != null
        ? asBool(body.contentValidation, Boolean(row.ContentValidation))
        : row.ContentValidation,
    WorkflowImpact:
      body.workflowImpact != null
        ? String(body.workflowImpact || "").trim().slice(0, 100) || null
        : row.WorkflowImpact,
    WorkflowImpactDetail:
      body.workflowImpactDetail != null
        ? String(body.workflowImpactDetail || "").trim().slice(0, 500) || null
        : row.WorkflowImpactDetail,
    Status: asStatus(body.status ?? row.Status),
    DisplayOrder: asNumber(body.displayOrder) ?? row.DisplayOrder,
    UpdatedAt: sequelize.literal("NOW()"),
    UpdatedBy: userId ?? null,
  });

  await row.reload();
  return { rule: serializeRule(row) };
}
