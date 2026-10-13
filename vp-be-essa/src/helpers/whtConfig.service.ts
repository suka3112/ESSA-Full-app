/**
 * WHT (withholding tax) configuration — admin CRUD and rule evaluation.
 *
 * Tables (migration 043): cfg."WHT_RULE", cfg."WHT_TAX_TREATY",
 * cfg."WHT_VENDOR_FACILITY", cfg."WHT_SBUJK". Every change is written to
 * cfg."CONFIG_CHANGE_LOG".
 *
 * evaluateWht() walks the steps in order (1 Offshore, 2 Individual, then for a
 * domestic company 3 Facility, 4 Rental, 5 Construction, 6 Service, 7 Default)
 * and returns the first ACTIVE rule that applies, with a trace of each step.
 */
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

type Json = Record<string, any>;

type FieldType = "int" | "num" | "text" | "bool" | "date" | "enum";
type Field = { col: string; type: FieldType; required?: boolean; values?: string[]; max?: number };
type Entity = { table: string; idCol: string; logName: string; orderBy: string; fields: Record<string, Field> };

const STATUSES = ["ACTIVE", "DRAFT", "INACTIVE"];

const ENTITIES: Record<string, Entity> = {
  rules: {
    table: 'cfg."WHT_RULE"',
    idCol: "wht_rule_id",
    logName: "WHT_RULE",
    orderBy: "step, display_order, wht_rule_id",
    fields: {
      step: { col: "step", type: "int", required: true },
      category: { col: "category", type: "text", required: true, max: 60 },
      condition: { col: "condition", type: "text", required: true, max: 120 },
      subCondition: { col: "sub_condition", type: "text", max: 120 },
      conditionCode: { col: "condition_code", type: "text", required: true, max: 40 },
      subConditionCode: { col: "sub_condition_code", type: "text", max: 40 },
      whtArticle: { col: "wht_article", type: "text", required: true, max: 20 },
      rateType: { col: "rate_type", type: "enum", required: true, values: ["FIXED", "TREATY", "PROGRESSIVE"] },
      ratePct: { col: "rate_pct", type: "num" },
      rateText: { col: "rate_text", type: "text", required: true, max: 60 },
      sapWhtCode: { col: "sap_wht_code", type: "text", required: true, max: 40 },
      referenceMaster: { col: "reference_master", type: "enum", values: ["TAX_TREATY", "SKB", "PP23", "SBUJK", "PPH21_TARIFF"] },
      requiresDocument: { col: "requires_document", type: "bool" },
      documentExamples: { col: "document_examples", type: "text", max: 200 },
      remarks: { col: "remarks", type: "text" },
      effectiveFrom: { col: "effective_from", type: "date", required: true },
      effectiveTo: { col: "effective_to", type: "date" },
      status: { col: "status", type: "enum", required: true, values: STATUSES },
      displayOrder: { col: "display_order", type: "int" },
    },
  },
  treaties: {
    table: 'cfg."WHT_TAX_TREATY"',
    idCol: "wht_tax_treaty_id",
    logName: "WHT_TAX_TREATY",
    orderBy: "country",
    fields: {
      country: { col: "country", type: "text", required: true, max: 80 },
      dividendPortfolioPct: { col: "dividend_portfolio_pct", type: "num" },
      dividendSubstantialPct: { col: "dividend_substantial_pct", type: "num" },
      interestPct: { col: "interest_pct", type: "num" },
      royaltyPct: { col: "royalty_pct", type: "num" },
      servicePct: { col: "service_pct", type: "num" },
      serviceTreatment: { col: "service_treatment", type: "text", max: 60 },
      notes: { col: "notes", type: "text" },
      effectiveFrom: { col: "effective_from", type: "date", required: true },
      effectiveTo: { col: "effective_to", type: "date" },
      status: { col: "status", type: "enum", required: true, values: STATUSES },
    },
  },
  facilities: {
    table: 'cfg."WHT_VENDOR_FACILITY"',
    idCol: "wht_vendor_facility_id",
    logName: "WHT_VENDOR_FACILITY",
    orderBy: "vendor_code, valid_to DESC",
    fields: {
      vendorCode: { col: "vendor_code", type: "text", required: true, max: 20 },
      vendorName: { col: "vendor_name", type: "text", required: true, max: 250 },
      facilityType: { col: "facility_type", type: "enum", required: true, values: ["SKB", "PP23"] },
      certificateNo: { col: "certificate_no", type: "text", required: true, max: 80 },
      validFrom: { col: "valid_from", type: "date", required: true },
      validTo: { col: "valid_to", type: "date", required: true },
      notes: { col: "notes", type: "text" },
      status: { col: "status", type: "enum", required: true, values: ["ACTIVE", "INACTIVE"] },
    },
  },
  sbujk: {
    table: 'cfg."WHT_SBUJK"',
    idCol: "wht_sbujk_id",
    logName: "WHT_SBUJK",
    orderBy: "vendor_code, valid_to DESC",
    fields: {
      vendorCode: { col: "vendor_code", type: "text", required: true, max: 20 },
      vendorName: { col: "vendor_name", type: "text", required: true, max: 250 },
      sbujkNo: { col: "sbujk_no", type: "text", required: true, max: 80 },
      businessScope: { col: "business_scope", type: "enum", required: true, values: ["EXECUTION", "PLANNING_CONSULTING"] },
      businessScopeText: { col: "business_scope_text", type: "text", max: 120 },
      qualification: { col: "qualification", type: "enum", required: true, values: ["SMALL", "NON_SMALL"] },
      qualificationText: { col: "qualification_text", type: "text", max: 60 },
      validTo: { col: "valid_to", type: "date", required: true },
      notes: { col: "notes", type: "text" },
      status: { col: "status", type: "enum", required: true, values: ["ACTIVE", "INACTIVE"] },
    },
  },
};

const bad = (message: string) => new APIError(message, StatusCodeEnum.HTTP_BAD_REQUEST);
const notFound = () => new APIError("Record not found", StatusCodeEnum.HTTP_NOT_FOUND);

function entityOf(name: string): Entity {
  const entity = ENTITIES[name];
  if (!entity) throw bad(`Unknown WHT list: ${name}`);
  return entity;
}

function actor(userId?: number | null): string {
  return userId ? String(userId) : "portal";
}

async function q<T = Json>(sql: string, replacements?: Json, transaction?: Transaction): Promise<T[]> {
  return sequelize.query(sql, { replacements, transaction, type: QueryTypes.SELECT }) as Promise<T[]>;
}

const isoDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

/** DB row -> API shape (camelCase, numbers as numbers, dates as YYYY-MM-DD). */
function toApi(entity: Entity, row: Json): Json {
  const out: Json = { id: Number(row[entity.idCol]) };
  for (const [key, field] of Object.entries(entity.fields)) {
    const value = row[field.col];
    if (field.type === "num") out[key] = value == null ? null : Number(value);
    else if (field.type === "int") out[key] = value == null ? null : Number(value);
    else if (field.type === "date") out[key] = isoDate(value);
    else out[key] = value ?? null;
  }
  out.updatedAt = row.updated_at || row.created_at || null;
  if (entity.fields.validTo) {
    const validTo = isoDate(row.valid_to);
    out.isExpired = Boolean(validTo && validTo < isoDate(new Date())!);
  }
  return out;
}

/** Validate a create/update payload against the entity's fields. */
function toColumns(entity: Entity, body: Json, partial: boolean): Json {
  const values: Json = {};
  for (const [key, field] of Object.entries(entity.fields)) {
    if (!(key in body)) {
      if (!partial && field.required) throw bad(`${key} is required`);
      continue;
    }
    let value = body[key];
    if (value === "" || value === undefined) value = null;
    if (value == null) {
      if (field.required) throw bad(`${key} is required`);
      values[field.col] = null;
      continue;
    }
    switch (field.type) {
      case "int":
      case "num": {
        const n = Number(value);
        if (!Number.isFinite(n)) throw bad(`${key} must be a number`);
        if (field.type === "int" && !Number.isInteger(n)) throw bad(`${key} must be a whole number`);
        values[field.col] = n;
        break;
      }
      case "bool":
        values[field.col] = value === true || value === "true" || value === 1;
        break;
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw bad(`${key} must be a date (YYYY-MM-DD)`);
        values[field.col] = String(value);
        break;
      case "enum": {
        const v = String(value).toUpperCase();
        if (!field.values!.includes(v)) throw bad(`${key} must be one of ${field.values!.join(", ")}`);
        values[field.col] = v;
        break;
      }
      default: {
        const v = String(value).trim();
        if (field.max && v.length > field.max) throw bad(`${key} is longer than ${field.max} characters`);
        values[field.col] = v;
      }
    }
  }
  const from = values.effective_from ?? values.valid_from;
  const to = values.effective_to ?? values.valid_to;
  if (from && to && to < from) throw bad("The end date is before the start date");
  return values;
}

async function logChange(entity: Entity, id: number, action: string, before: Json | null, after: Json | null,
  userId: number | null | undefined, transaction: Transaction) {
  await sequelize.query(
    `INSERT INTO cfg."CONFIG_CHANGE_LOG" (entity_name, entity_id, action, before_json, after_json, changed_by)
     VALUES (:name, :id, :action, CAST(:before AS jsonb), CAST(:after AS jsonb), :by)`,
    {
      replacements: { name: entity.logName, id, action, before: JSON.stringify(before), after: JSON.stringify(after), by: actor(userId) },
      transaction,
    },
  );
}

async function getRow(entity: Entity, id: number, transaction?: Transaction): Promise<Json> {
  const rows = await q(`SELECT * FROM ${entity.table} WHERE ${entity.idCol} = :id AND NOT is_deleted`, { id }, transaction);
  if (!rows.length) throw notFound();
  return rows[0];
}

function parseId(raw: any): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw bad("Invalid id");
  return id;
}

function wrapDbError(error: any, fallback: string): never {
  if (error instanceof APIError) throw error;
  logger.error(fallback, error);
  const code = error?.original?.code || error?.parent?.code;
  if (code === "23514") throw bad("One of the values is not allowed.");
  throw new APIError(fallback, 500);
}

/** All four lists for the WHT Configuration screen. */
export async function listWhtConfig() {
  try {
    const out: Json = {};
    for (const [name, entity] of Object.entries(ENTITIES)) {
      const rows = await q(`SELECT * FROM ${entity.table} WHERE NOT is_deleted ORDER BY ${entity.orderBy}`);
      out[name] = rows.map((row) => toApi(entity, row));
    }
    return out;
  } catch (error) {
    return wrapDbError(error, "Could not load the WHT configuration");
  }
}

export async function createWhtRecord(name: string, body: Json, userId?: number | null) {
  const entity = entityOf(name);
  const values = toColumns(entity, body || {}, false);
  try {
    return await sequelize.transaction(async (transaction) => {
      const cols = Object.keys(values);
      const rows = await q(
        `INSERT INTO ${entity.table} (${cols.join(", ")}, created_by)
         VALUES (${cols.map((c) => `:${c}`).join(", ")}, :createdBy) RETURNING *`,
        { ...values, createdBy: userId || null },
        transaction,
      );
      const created = toApi(entity, rows[0]);
      await logChange(entity, created.id, "INSERT", null, created, userId, transaction);
      return created;
    });
  } catch (error) {
    return wrapDbError(error, "Could not save the record");
  }
}

export async function updateWhtRecord(name: string, rawId: any, body: Json, userId?: number | null) {
  const entity = entityOf(name);
  const id = parseId(rawId);
  const values = toColumns(entity, body || {}, true);
  if (!Object.keys(values).length) throw bad("Nothing to update");
  try {
    return await sequelize.transaction(async (transaction) => {
      const before = toApi(entity, await getRow(entity, id, transaction));
      const sets = Object.keys(values).map((c) => `${c} = :${c}`);
      const rows = await q(
        `UPDATE ${entity.table} SET ${sets.join(", ")}, updated_at = now(), updated_by = :updatedBy
          WHERE ${entity.idCol} = :id AND NOT is_deleted RETURNING *`,
        { ...values, updatedBy: userId || null, id },
        transaction,
      );
      const after = toApi(entity, rows[0]);
      await logChange(entity, id, "UPDATE", before, after, userId, transaction);
      return after;
    });
  } catch (error) {
    return wrapDbError(error, "Could not update the record");
  }
}

export async function deleteWhtRecord(name: string, rawId: any, userId?: number | null) {
  const entity = entityOf(name);
  const id = parseId(rawId);
  try {
    return await sequelize.transaction(async (transaction) => {
      const before = toApi(entity, await getRow(entity, id, transaction));
      await sequelize.query(
        `UPDATE ${entity.table} SET is_deleted = TRUE, updated_at = now(), updated_by = :updatedBy WHERE ${entity.idCol} = :id`,
        { replacements: { id, updatedBy: userId || null }, transaction },
      );
      await logChange(entity, id, "DELETE", before, null, userId, transaction);
      return { id, deleted: true };
    });
  } catch (error) {
    return wrapDbError(error, "Could not delete the record");
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export type WhtEvaluationInput = {
  vendorCode?: string;
  vendorType?: "DOMESTIC_COMPANY" | "OFFSHORE" | "INDIVIDUAL";
  country?: string;
  hasDgtForm?: boolean;
  offshoreIncome?: "DIVIDEND_INTEREST" | "SERVICES" | "ROYALTY" | "TECHNICAL_SERVICE";
  isRental?: boolean;
  rentalType?: "LAND_BUILDING" | "MOVABLE_ASSET";
  hasSkb?: boolean;
  pp23Eligible?: boolean;
  isConstruction?: boolean;
  constructionType?: "EXECUTION" | "PLANNING_CONSULTING";
  sbujk?: "SMALL" | "NON_SMALL" | "NONE";
  serviceType?: "NOT_VAT" | "FREIGHT_TRAVEL" | "ROYALTY_LICENSE" | "INTEREST" | "DOMESTIC_SHIPPING"
    | "DOMESTIC_AIRLINE" | "FOREIGN_SHIPPING" | "OTHER_SERVICES";
  date?: string;
};

type TraceItem = { step: number; label: string; applies: boolean; reason: string };

const truthy = (v: any) => v === true || v === "true" || v === "YES" || v === "yes";

/** Find the first active rule for a step and condition (and optional sub-condition). */
async function findRule(step: number, conditionCode: string, subConditionCode: string | null, date: string) {
  const rows = await q(
    `SELECT * FROM cfg."WHT_RULE"
      WHERE NOT is_deleted AND status = 'ACTIVE' AND step = :step AND condition_code = :cond
        AND (CAST(:sub AS text) IS NULL OR sub_condition_code = :sub)
        AND effective_from <= CAST(:date AS date) AND (effective_to IS NULL OR effective_to >= CAST(:date AS date))
      ORDER BY display_order, wht_rule_id LIMIT 1`,
    { step, cond: conditionCode, sub: subConditionCode, date },
  );
  return rows[0] ? toApi(ENTITIES.rules, rows[0]) : null;
}

export async function evaluateWht(input: WhtEvaluationInput) {
  const date = isoDate(input?.date) || isoDate(new Date())!;
  const vendorType = String(input?.vendorType || "DOMESTIC_COMPANY").toUpperCase();
  const vendorCode = String(input?.vendorCode || "").trim();
  const trace: TraceItem[] = [];
  const sources: Json = {};

  // Vendor masters can answer the SKB / PP23 / SBUJK questions for a known vendor.
  let hasSkb = truthy(input?.hasSkb);
  let pp23 = truthy(input?.pp23Eligible);
  let sbujk = String(input?.sbujk || "NONE").toUpperCase();
  if (vendorCode) {
    const facilities = await q(
      `SELECT * FROM cfg."WHT_VENDOR_FACILITY"
        WHERE NOT is_deleted AND status = 'ACTIVE' AND vendor_code = :code
          AND valid_from <= CAST(:date AS date) AND valid_to >= CAST(:date AS date)`,
      { code: vendorCode, date },
    );
    for (const f of facilities) {
      if (f.facility_type === "SKB") { hasSkb = true; sources.skb = toApi(ENTITIES.facilities, f); }
      if (f.facility_type === "PP23") { pp23 = true; sources.pp23 = toApi(ENTITIES.facilities, f); }
    }
    const sb = await q(
      `SELECT * FROM cfg."WHT_SBUJK"
        WHERE NOT is_deleted AND status = 'ACTIVE' AND vendor_code = :code AND valid_to >= CAST(:date AS date)
        ORDER BY valid_to DESC LIMIT 1`,
      { code: vendorCode, date },
    );
    if (sb[0]) { sbujk = sb[0].qualification; sources.sbujk = toApi(ENTITIES.sbujk, sb[0]); }
  }

  const done = async (step: number, cond: string, sub: string | null, label: string, reason: string) => {
    trace.push({ step, label, applies: true, reason });
    const rule = await findRule(step, cond, sub, date);
    let treaty: Json | null = null;
    if (rule?.rateType === "TREATY" && input?.country) {
      const rows = await q(
        `SELECT * FROM cfg."WHT_TAX_TREATY"
          WHERE NOT is_deleted AND status = 'ACTIVE' AND lower(country) = lower(:country)
            AND effective_from <= CAST(:date AS date) AND (effective_to IS NULL OR effective_to >= CAST(:date AS date))
          LIMIT 1`,
        { country: input.country, date },
      );
      treaty = rows[0] ? toApi(ENTITIES.treaties, rows[0]) : null;
    }
    return {
      result: rule ? "WHT_APPLICABLE" : "NO_ACTIVE_RULE",
      step,
      rule,
      treaty,
      treatyRatePct: treaty ? treatyRate(treaty, sub) : null,
      sources,
      trace,
      evaluatedOn: date,
    };
  };
  const skip = (step: number, label: string, reason: string) => trace.push({ step, label, applies: false, reason });

  // 1 Offshore
  if (vendorType === "OFFSHORE") {
    if (!truthy(input?.hasDgtForm)) return done(1, "NO_DGT", null, "Offshore", "Offshore vendor without a DGT form");
    const income = String(input?.offshoreIncome || "SERVICES").toUpperCase();
    return done(1, "WITH_DGT", income, "Offshore", `Offshore vendor with a DGT form (${income.toLowerCase().replace(/_/g, " ")})`);
  }
  skip(1, "Offshore", "Vendor is not offshore");

  // 2 Individual vendor
  if (vendorType === "INDIVIDUAL" && !truthy(input?.isRental)) {
    return done(2, "NOT_RENTAL", null, "Individual Vendor", "Individual vendor, not a rental");
  }
  skip(2, "Individual Vendor", vendorType === "INDIVIDUAL" ? "Individual vendor, but a rental - continues to the rental step" : "Vendor is not an individual");

  // 3 Facility (domestic company)
  if (hasSkb) return done(3, "HAS_SKB", null, "Facility", sources.skb ? `Valid SKB ${sources.skb.certificateNo}` : "Vendor has an SKB");
  if (pp23) return done(3, "PP23", null, "Facility", sources.pp23 ? `Valid PP23 ${sources.pp23.certificateNo}` : "Vendor is PP23 eligible");
  skip(3, "Facility", "No valid SKB or PP23 facility");

  // 4 Rental
  if (truthy(input?.isRental)) {
    const type = String(input?.rentalType || "LAND_BUILDING").toUpperCase();
    return done(4, type, null, "Rental", type === "MOVABLE_ASSET" ? "Rental of a movable asset" : "Rental of land / building");
  }
  skip(4, "Rental", "Not a rental");

  // 5 Construction
  if (truthy(input?.isConstruction)) {
    const type = String(input?.constructionType || "EXECUTION").toUpperCase();
    const has = sbujk === "SMALL" || sbujk === "NON_SMALL";
    const sub = type === "PLANNING_CONSULTING"
      ? (has ? "SBUJK" : "NO_SBUJK")
      : (sbujk === "SMALL" ? "SBUJK_SMALL" : sbujk === "NON_SMALL" ? "SBUJK_NON_SMALL" : "NO_SBUJK");
    const why = has ? `SBUJK ${sbujk === "SMALL" ? "small" : "non-small"}${sources.sbujk ? ` (${sources.sbujk.sbujkNo})` : ""}` : "no SBUJK";
    return done(5, type, sub, "Construction", `Construction ${type === "EXECUTION" ? "execution" : "planning / consulting"}, ${why}`);
  }
  skip(5, "Construction", "Not construction");

  // 6 Service
  const service = String(input?.serviceType || "").toUpperCase();
  if (service && service !== "OTHER_SERVICES") {
    return done(6, service, null, "Service", `Service: ${service.toLowerCase().replace(/_/g, " ")}`);
  }
  skip(6, "Service", "No specific service type");

  // 7 Default
  return done(7, "OTHER_SERVICES", null, "Default", "Nothing more specific applies - other services");
}

function treatyRate(treaty: Json, sub: string | null): number | null {
  switch (sub) {
    case "DIVIDEND_INTEREST": return treaty.dividendPortfolioPct ?? treaty.interestPct ?? null;
    case "ROYALTY": return treaty.royaltyPct ?? null;
    case "SERVICES":
    case "TECHNICAL_SERVICE": return treaty.servicePct ?? null;
    default: return null;
  }
}
