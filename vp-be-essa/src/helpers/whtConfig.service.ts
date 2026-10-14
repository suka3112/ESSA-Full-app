/**
 * WHT (withholding tax) configuration — admin CRUD and rule evaluation.
 *
 * Tables: cfg."WHT_RULE" (one row per SAP WHT code, migrations 043/044),
 * cfg."WHT_VENDOR_FACILITY" (SKB / PP23), cfg."WHT_TAX_RATE_DOCUMENT" (see
 * whtTaxRateDocument.service.ts). cfg."WHT_SBUJK" exists but SBUJK is switched off
 * until its business purpose is confirmed. Every change is written to cfg."CONFIG_CHANGE_LOG".
 *
 * Rules are saved as a Category → Condition → Sub-condition combination from
 * whtTaxonomy.ts; the step, WHT article and reference master follow from it.
 * A SAP WHT code can belong to only one non-inactive rule for any given date.
 *
 * evaluateWht() walks the steps in order (1 Offshore, 2 Individual, then for a
 * domestic company 3 Facility, 4 Rental, 5 Construction, 6 Service, 7 Default).
 */
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { RATE_TYPES, SAP_WHT_CODES, WHT_TAXONOMY, categoryOfLabel, resolveCombination } from "./whtTaxonomy";
import { currentTreatyRow, getTaxRateVersion } from "./whtTaxRateDocument.service";

type Json = Record<string, any>;

/** SBUJK configuration is disabled until its requirements are confirmed. */
export const SBUJK_ENABLED = process.env.WHT_SBUJK_ENABLED === "true";

const RULE_STATUSES = ["ACTIVE", "DRAFT", "INACTIVE"];
const MASTER_STATUSES = ["ACTIVE", "INACTIVE"];

const bad = (message: string) => new APIError(message, StatusCodeEnum.HTTP_BAD_REQUEST);
const notFound = () => new APIError("Record not found", StatusCodeEnum.HTTP_NOT_FOUND);

async function q<T = Json>(sql: string, replacements?: Json, transaction?: Transaction): Promise<T[]> {
  return sequelize.query(sql, { replacements, transaction, type: QueryTypes.SELECT }) as Promise<T[]>;
}

const isoDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};
const today = () => isoDate(new Date())!;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const actor = (userId?: number | null) => (userId ? String(userId) : "portal");

async function logChange(name: string, id: number, action: string, before: Json | null, after: Json | null,
  userId: number | null | undefined, transaction: Transaction) {
  await sequelize.query(
    `INSERT INTO cfg."CONFIG_CHANGE_LOG" (entity_name, entity_id, action, before_json, after_json, changed_by)
     VALUES (:name, :id, :action, CAST(:before AS jsonb), CAST(:after AS jsonb), :by)`,
    { replacements: { name, id, action, before: JSON.stringify(before), after: JSON.stringify(after), by: actor(userId) }, transaction },
  );
}

function wrapDbError(error: any, fallback: string): never {
  if (error instanceof APIError) throw error;
  logger.error(fallback, error);
  const code = error?.original?.code || error?.parent?.code;
  if (code === "23514") throw bad("One of the values is not allowed.");
  throw new APIError(fallback, 500);
}

function parseId(raw: any): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw bad("Invalid id");
  return id;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function ruleToApi(row: Json) {
  const category = categoryOfLabel(row.category);
  return {
    id: Number(row.wht_rule_id),
    step: Number(row.step),
    categoryCode: category?.code || null,
    category: row.category,
    condition: row.condition,
    conditionCode: row.condition_code,
    subCondition: row.sub_condition,
    subConditionCode: row.sub_condition_code,
    whtArticle: row.wht_article,
    rateType: row.rate_type,
    ratePct: row.rate_pct == null ? null : Number(row.rate_pct),
    rateText: row.rate_text,
    sapWhtCode: row.sap_wht_code,
    referenceMaster: row.reference_master,
    remarks: row.remarks,
    effectiveFrom: isoDate(row.effective_from),
    effectiveTo: isoDate(row.effective_to),
    status: row.status,
    displayOrder: Number(row.display_order),
    needsReview: Boolean(row.needs_review),
    reviewNote: row.review_note,
    updatedAt: row.updated_at || row.created_at || null,
  };
}

const fmtRate = (n: number) => `${Number(n.toFixed(3))}%`;

/** Validate a rule payload (merged over the existing rule for updates) into DB columns. */
function ruleColumns(body: Json, existing: Json | null) {
  const pick = (key: string, fallback: any) => (key in body ? body[key] : fallback);
  const categoryCode = pick("categoryCode", existing ? categoryOfLabel(existing.category)?.code : null);
  const conditionCode = pick("conditionCode", existing?.condition_code);
  const subConditionCode = pick("subConditionCode", existing?.sub_condition_code) || null;
  const combo = resolveCombination(String(categoryCode || ""), String(conditionCode || ""), subConditionCode);
  if ("error" in combo) throw bad(combo.error!);

  const rateType = String(pick("rateType", existing?.rate_type) || "").toUpperCase();
  if (!RATE_TYPES.some((r) => r.value === rateType)) throw bad("Select a rate type");
  let ratePct: number | null = null;
  const rawRate = pick("ratePct", existing?.rate_pct);
  if (rateType === "PROGRESSIVE") {
    ratePct = null;
  } else {
    if (rawRate === "" || rawRate == null) throw bad("Enter the rate (%)");
    ratePct = Number(rawRate);
    if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 100) throw bad("The rate must be between 0 and 100");
  }

  const sapWhtCode = String(pick("sapWhtCode", existing?.sap_wht_code) || "").trim().toUpperCase();
  if (!sapWhtCode) throw bad("Select a SAP WH code");
  if (!SAP_WHT_CODES.some((c) => c.code === sapWhtCode)) throw bad(`"${sapWhtCode}" is not a known SAP WH code`);

  const effectiveFrom = isoDate(pick("effectiveFrom", existing?.effective_from));
  const effectiveTo = isoDate(pick("effectiveTo", existing?.effective_to));
  if (!effectiveFrom || !DATE_RE.test(effectiveFrom)) throw bad("Enter the effective-from date");
  if (effectiveTo && !DATE_RE.test(effectiveTo)) throw bad("The effective-to date is not valid");
  if (effectiveTo && effectiveTo < effectiveFrom) throw bad("The effective-to date is before the effective-from date");

  const status = String(pick("status", existing?.status) || "ACTIVE").toUpperCase();
  if (!RULE_STATUSES.includes(status)) throw bad("Status must be Active, Draft or Inactive");

  const remarks = pick("remarks", existing?.remarks);
  const confirmed = body.confirmReview === true;
  return {
    step: combo.category!.step,
    category: combo.category!.label,
    condition: combo.condition!.label,
    sub_condition: combo.sub?.label || null,
    condition_code: combo.condition!.code,
    sub_condition_code: combo.sub?.code || null,
    wht_article: combo.condition!.article,
    reference_master: combo.reference || null,
    requires_document: ["SKB", "PP23", "SBUJK", "TAX_TREATY"].includes(combo.reference || ""),
    rate_type: rateType,
    rate_pct: ratePct,
    rate_text: rateType === "PROGRESSIVE" ? "Progressive" : fmtRate(ratePct!),
    sap_wht_code: sapWhtCode,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    status,
    remarks: remarks == null || String(remarks).trim() === "" ? null : String(remarks).trim(),
    needs_review: confirmed ? false : Boolean(existing?.needs_review),
    review_note: confirmed ? null : existing?.review_note ?? null,
  };
}

/** One SAP WH code → one live rule for any given date. */
async function assertCodeFree(cols: Json, ruleId: number | null, t: Transaction) {
  if (cols.status === "INACTIVE") return;
  const clash = await q(
    `SELECT * FROM cfg."WHT_RULE"
      WHERE NOT is_deleted AND status <> 'INACTIVE' AND upper(sap_wht_code) = :code
        AND (CAST(:id AS int) IS NULL OR wht_rule_id <> :id)
        AND effective_from <= COALESCE(CAST(:to AS date), DATE '9999-12-31')
        AND COALESCE(effective_to, DATE '9999-12-31') >= CAST(:from AS date)
      LIMIT 1`,
    { code: cols.sap_wht_code, id: ruleId, from: cols.effective_from, to: cols.effective_to },
    t,
  );
  if (clash.length) {
    const c = clash[0];
    const span = `${isoDate(c.effective_from)} – ${isoDate(c.effective_to) || "open-ended"}`;
    throw new APIError(
      `SAP WH code ${cols.sap_wht_code} is already mapped to ${[c.category, c.condition, c.sub_condition].filter(Boolean).join(" · ")} (${span}). ` +
        "A code can belong to only one active or draft rule at a time — end that rule's validity or make it inactive first.",
      StatusCodeEnum.HTTP_CONFLICT,
    );
  }
}

async function getRuleRow(id: number, t?: Transaction) {
  const rows = await q(`SELECT * FROM cfg."WHT_RULE" WHERE wht_rule_id = :id AND NOT is_deleted`, { id }, t);
  if (!rows.length) throw notFound();
  return rows[0];
}

async function saveRule(rawId: any, body: Json, userId?: number | null) {
  const id = rawId == null ? null : parseId(rawId);
  try {
    return await sequelize.transaction(async (t) => {
      const existing = id ? await getRuleRow(id, t) : null;
      const cols = ruleColumns(body || {}, existing);
      await assertCodeFree(cols, id, t);
      let row: Json;
      if (existing) {
        const sets = Object.keys(cols).map((c) => `${c} = :${c}`);
        [row] = await q(`UPDATE cfg."WHT_RULE" SET ${sets.join(", ")}, updated_at = now(), updated_by = :by WHERE wht_rule_id = :id RETURNING *`,
          { ...cols, by: userId || null, id }, t);
      } else {
        const [{ next }] = await q<{ next: number }>(`SELECT COALESCE(MAX(display_order), 0) + 10 AS next FROM cfg."WHT_RULE" WHERE step = :step`, { step: cols.step }, t);
        const all = { ...cols, display_order: Number(body.displayOrder) || next };
        const names = Object.keys(all);
        [row] = await q(`INSERT INTO cfg."WHT_RULE" (${names.join(", ")}, created_by) VALUES (${names.map((c) => `:${c}`).join(", ")}, :by) RETURNING *`,
          { ...all, by: userId || null }, t);
      }
      const after = ruleToApi(row);
      await logChange("WHT_RULE", after.id, existing ? "UPDATE" : "INSERT", existing ? ruleToApi(existing) : null, after, userId, t);
      return after;
    });
  } catch (error) {
    return wrapDbError(error, "Could not save the rule");
  }
}

// ---------------------------------------------------------------------------
// Vendor tax facilities (SKB / PP23)
// ---------------------------------------------------------------------------

function facilityToApi(row: Json) {
  const validTo = isoDate(row.valid_to);
  return {
    id: Number(row.wht_vendor_facility_id),
    vendorCode: row.vendor_code,
    vendorName: row.vendor_name,
    facilityType: row.facility_type,
    certificateNo: row.certificate_no,
    validFrom: isoDate(row.valid_from),
    validTo,
    notes: row.notes,
    status: row.status,
    isExpired: Boolean(validTo && validTo < today()),
    updatedAt: row.updated_at || row.created_at || null,
  };
}

function facilityColumns(body: Json, existing: Json | null) {
  const pick = (key: string, col: string) => (key in body ? body[key] : existing?.[col]);
  const text = (key: string, col: string, label: string, max: number, required = true) => {
    const v = pick(key, col);
    const s = v == null ? "" : String(v).trim();
    if (required && !s) throw bad(`${label} is required`);
    if (s.length > max) throw bad(`${label} is longer than ${max} characters`);
    return s || null;
  };
  const facilityType = String(pick("facilityType", "facility_type") || "").toUpperCase();
  if (!["SKB", "PP23"].includes(facilityType)) throw bad("Facility type must be SKB or PP23");
  const validFrom = isoDate(pick("validFrom", "valid_from"));
  const validTo = isoDate(pick("validTo", "valid_to"));
  if (!validFrom || !DATE_RE.test(validFrom)) throw bad("Valid from is required");
  if (!validTo || !DATE_RE.test(validTo)) throw bad("Valid to is required");
  if (validTo < validFrom) throw bad("Valid to is before valid from");
  const status = String(pick("status", "status") || "ACTIVE").toUpperCase();
  if (!MASTER_STATUSES.includes(status)) throw bad("Status must be Active or Inactive");
  return {
    vendor_code: text("vendorCode", "vendor_code", "Vendor code", 20),
    vendor_name: text("vendorName", "vendor_name", "Vendor name", 250),
    facility_type: facilityType,
    certificate_no: text("certificateNo", "certificate_no", "Certificate no.", 80),
    valid_from: validFrom,
    valid_to: validTo,
    notes: text("notes", "notes", "Notes", 2000, false),
    status,
  };
}

async function saveFacility(rawId: any, body: Json, userId?: number | null) {
  const id = rawId == null ? null : parseId(rawId);
  try {
    return await sequelize.transaction(async (t) => {
      const existing = id
        ? (await q(`SELECT * FROM cfg."WHT_VENDOR_FACILITY" WHERE wht_vendor_facility_id = :id AND NOT is_deleted`, { id }, t))[0]
        : null;
      if (id && !existing) throw notFound();
      const cols = facilityColumns(body || {}, existing);
      const dup = await q(
        `SELECT 1 FROM cfg."WHT_VENDOR_FACILITY" WHERE NOT is_deleted AND facility_type = :type AND upper(certificate_no) = upper(:no)
           AND (CAST(:id AS int) IS NULL OR wht_vendor_facility_id <> :id) LIMIT 1`,
        { type: cols.facility_type, no: cols.certificate_no, id }, t);
      if (dup.length) throw new APIError(`${cols.facility_type} certificate ${cols.certificate_no} is already recorded`, StatusCodeEnum.HTTP_CONFLICT);
      let row: Json;
      if (existing) {
        const sets = Object.keys(cols).map((c) => `${c} = :${c}`);
        [row] = await q(`UPDATE cfg."WHT_VENDOR_FACILITY" SET ${sets.join(", ")}, updated_at = now(), updated_by = :by WHERE wht_vendor_facility_id = :id RETURNING *`,
          { ...cols, by: userId || null, id }, t);
      } else {
        const names = Object.keys(cols);
        [row] = await q(`INSERT INTO cfg."WHT_VENDOR_FACILITY" (${names.join(", ")}, created_by) VALUES (${names.map((c) => `:${c}`).join(", ")}, :by) RETURNING *`,
          { ...cols, by: userId || null }, t);
      }
      const after = facilityToApi(row);
      await logChange("WHT_VENDOR_FACILITY", after.id, existing ? "UPDATE" : "INSERT", existing ? facilityToApi(existing) : null, after, userId, t);
      return after;
    });
  } catch (error) {
    return wrapDbError(error, "Could not save the facility");
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type SaveFn = (rawId: any, body: Json, userId?: number | null) => Promise<Json>;
const LISTS: Record<string, { table: string; idCol: string; logName: string; toApi: (r: Json) => Json; save: SaveFn }> = {
  rules: { table: 'cfg."WHT_RULE"', idCol: "wht_rule_id", logName: "WHT_RULE", toApi: ruleToApi, save: saveRule },
  facilities: { table: 'cfg."WHT_VENDOR_FACILITY"', idCol: "wht_vendor_facility_id", logName: "WHT_VENDOR_FACILITY", toApi: facilityToApi, save: saveFacility },
};

function listOf(name: string) {
  if (name === "sbujk" && !SBUJK_ENABLED) {
    throw new APIError("SBUJK configuration is disabled until its requirements are confirmed.", StatusCodeEnum.HTTP_FORBIDDEN);
  }
  if (name === "treaties") throw bad("Tax treaty rates come from the uploaded Tax Rate document and cannot be edited here.");
  const list = LISTS[name];
  if (!list) throw bad(`Unknown WHT list: ${name}`);
  return list;
}

/** Everything the WHT Configuration screen needs. */
export async function listWhtConfig() {
  try {
    const rules = await q(`SELECT * FROM cfg."WHT_RULE" WHERE NOT is_deleted ORDER BY step, display_order, wht_rule_id`);
    const facilities = await q(`SELECT * FROM cfg."WHT_VENDOR_FACILITY" WHERE NOT is_deleted ORDER BY vendor_code, valid_to DESC`);
    const doc = await getTaxRateVersion("current");
    return {
      rules: rules.map(ruleToApi),
      facilities: facilities.map(facilityToApi),
      taxonomy: WHT_TAXONOMY,
      sapCodes: SAP_WHT_CODES,
      rateTypes: RATE_TYPES,
      sbujkEnabled: SBUJK_ENABLED,
      taxRateDocument: doc ? { id: doc.id, versionNo: doc.versionNo, fileName: doc.fileName, rowCount: doc.rowCount, uploadedAt: doc.uploadedAt } : null,
    };
  } catch (error) {
    return wrapDbError(error, "Could not load the WHT configuration");
  }
}

export async function createWhtRecord(name: string, body: Json, userId?: number | null) {
  return listOf(name).save(null, body, userId);
}

export async function updateWhtRecord(name: string, rawId: any, body: Json, userId?: number | null) {
  return listOf(name).save(rawId, body, userId);
}

export async function deleteWhtRecord(name: string, rawId: any, userId?: number | null) {
  const list = listOf(name);
  const id = parseId(rawId);
  try {
    return await sequelize.transaction(async (t) => {
      const rows = await q(`SELECT * FROM ${list.table} WHERE ${list.idCol} = :id AND NOT is_deleted`, { id }, t);
      if (!rows.length) throw notFound();
      await sequelize.query(`UPDATE ${list.table} SET is_deleted = TRUE, updated_at = now(), updated_by = :by WHERE ${list.idCol} = :id`,
        { replacements: { id, by: userId || null }, transaction: t });
      await logChange(list.logName, id, "DELETE", list.toApi(rows[0]), null, userId, t);
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
  serviceType?: string;
  date?: string;
};

type TraceItem = { step: number; label: string; applies: boolean; reason: string };
const truthy = (v: any) => v === true || v === "true" || v === "YES" || v === "yes";

/** All active, in-date rules for a step / condition (/ sub-condition) — one per SAP code. */
async function findRules(step: number, cond: string, sub: string | null, date: string) {
  const rows = await q(
    `SELECT * FROM cfg."WHT_RULE"
      WHERE NOT is_deleted AND status = 'ACTIVE' AND step = :step AND condition_code = :cond
        AND (CAST(:sub AS text) IS NULL OR sub_condition_code = :sub)
        AND effective_from <= CAST(:date AS date) AND (effective_to IS NULL OR effective_to >= CAST(:date AS date))
      ORDER BY display_order, wht_rule_id`,
    { step, cond, sub, date },
  );
  return rows.map(ruleToApi);
}

/** Treaty column(s) the income type reads from the Tax Rate document. */
const TREATY_COLUMNS: Record<string, RegExp[]> = {
  DIVIDEND_INTEREST: [/^dividend.*portfolio/i, /^dividend.*substantial/i, /^interest/i],
  SERVICES: [/fts|service.*rate/i],
  ROYALTY: [/^royalt/i],
  TECHNICAL_SERVICE: [/fts|service.*rate/i],
};
/** Shown with service rates for context; never read as a rate. */
const TREATY_CONTEXT = /treatment|basis/i;

/** "10%" -> [10]; "10/0%" -> [10, 0]; "—" -> []. */
const ratesIn = (text: string) =>
  String(text || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];

export async function evaluateWht(input: WhtEvaluationInput) {
  const date = isoDate(input?.date) || today();
  const vendorType = String(input?.vendorType || "DOMESTIC_COMPANY").toUpperCase();
  const vendorCode = String(input?.vendorCode || "").trim();
  const trace: TraceItem[] = [];
  const sources: Json = {};

  let hasSkb = truthy(input?.hasSkb);
  let pp23 = truthy(input?.pp23Eligible);
  if (vendorCode) {
    const facilities = await q(
      `SELECT * FROM cfg."WHT_VENDOR_FACILITY"
        WHERE NOT is_deleted AND status = 'ACTIVE' AND vendor_code = :code
          AND valid_from <= CAST(:date AS date) AND valid_to >= CAST(:date AS date)`,
      { code: vendorCode, date },
    );
    for (const f of facilities) {
      if (f.facility_type === "SKB") { hasSkb = true; sources.skb = facilityToApi(f); }
      if (f.facility_type === "PP23") { pp23 = true; sources.pp23 = facilityToApi(f); }
    }
  }
  // SBUJK is disabled: the answer comes only from the question, never from a vendor master.
  const sbujk = String(input?.sbujk || "NONE").toUpperCase();

  const done = async (step: number, cond: string, sub: string | null, label: string, reason: string, treaty?: Json | null) => {
    trace.push({ step, label, applies: true, reason });
    let candidates = await findRules(step, cond, sub, date);
    let note: string | null = null;
    if (treaty?.rates?.length && candidates.length > 1) {
      const narrowed = candidates.filter((r) => r.ratePct != null && treaty.rates.includes(r.ratePct));
      if (narrowed.length) candidates = narrowed;
    }
    if (candidates.length > 1) {
      note = candidates.find((c) => c.reviewNote)?.reviewNote
        || `${candidates.length} SAP WH codes match; the WHT Matrix does not say which one applies.`;
    }
    const rule = candidates.length === 1 ? candidates[0] : null;
    let treatyMismatch = false;
    if (rule && treaty?.rates?.length && rule.ratePct != null && !treaty.rates.includes(rule.ratePct)) {
      treatyMismatch = true;
      note = `The Tax Rate document (v${treaty.versionNo}) gives ${treaty.country} ${treaty.rates.map((r: number) => `${r}%`).join(" / ")}, `
        + `but SAP WH code ${rule.sapWhtCode} is set at ${rule.rateText}. Check the rule or the treaty rate.`;
    }
    return {
      result: !candidates.length ? "NO_ACTIVE_RULE" : rule && !rule.needsReview && !treatyMismatch ? "WHT_APPLICABLE" : "NEEDS_REVIEW",
      step,
      rule,
      candidates,
      reviewNote: treatyMismatch ? note : rule?.needsReview ? rule.reviewNote : note,
      treaty: treaty || null,
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
    let treaty: Json | null = null;
    if (input?.country) {
      const found = await currentTreatyRow(input.country);
      if (!found) treaty = { country: input.country, versionNo: null, values: {}, rates: [], message: "No Tax Rate document has been uploaded." };
      else if (!found.row) treaty = { country: input.country, versionNo: found.versionNo, values: {}, rates: [], message: `${input.country} is not in the current Tax Rate document (v${found.versionNo}).` };
      else {
        const cols = Object.keys(found.row).filter((c) => (TREATY_COLUMNS[income] || []).some((re) => re.test(c)));
        const values: Json = {};
        cols.forEach((c) => { values[c] = found.row![c]; });
        if (income === "SERVICES" || income === "TECHNICAL_SERVICE") {
          Object.keys(found.row).filter((c) => TREATY_CONTEXT.test(c)).forEach((c) => { values[c] = found.row![c]; });
        }
        const rates = [...new Set(cols.flatMap((c) => ratesIn(found.row![c])))];
        treaty = { country: input.country, versionNo: found.versionNo, values, rates, message: rates.length ? null : "The treaty lists no rate for this income type." };
      }
    }
    return done(1, "WITH_DGT", income, "Offshore", `Offshore vendor with a DGT form (${income.toLowerCase().replace(/_/g, " ")})`, treaty);
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
    const why = has ? `SBUJK ${sbujk === "SMALL" ? "small" : "non-small"} (as answered)` : "no SBUJK";
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
