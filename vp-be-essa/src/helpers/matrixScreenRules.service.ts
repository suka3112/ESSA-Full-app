/**
 * N-way screen backed by cfg."VALIDATION_RULE" (migrations 033 and 034).
 *
 * The screen payload stays the same shape the UI already posts.
 * AP_MATCH_RULE is only read once, to turn those ACTIVE keys on in cfg
 * for testing. It is not the list the screen edits.
 *
 * TODO(open-item): exception owner is not signed off. The test activation
 * writes "AP Team" only because ck_active_spec requires an owner.
 * Tolerance mode is not invented; those rules stay inactive.
 */
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { ensureMatchRuleTable } from "./matchRules.service";

const TEST_OWNER = "AP Team";
const SYNC_ACTOR = "nway-active-sync";
const loggedSkips = new Set<string>();

const CFG_CATEGORY_TO_SCREEN: Record<string, string> = {
  MATERIAL: "MATERIAL",
  MANPOWER_OUTSOURCING: "MANPOWER",
  CATERING: "CATERING",
  HOUSEKEEPING: "HOUSEKEEPING",
  RENTAL_EQUIPMENT: "RENTAL_EQUIPMENT",
  CIVIL_WORKS_CONSTRUCTION: "CIVIL",
  PIB: "PIB",
  TRAVEL_NON_PO: "TRAVEL",
  HOTEL_NON_PO: "HOTEL",
  IMPORT_LOGISTICS: "IMPORT_LOGISTICS",
  DOMESTIC_LOGISTIC: "DOMESTIC_LOGISTICS",
  CONSULTANTS_TIME_BASED: "CONSULTANT_TIME",
  CONSULTANTS_MILESTONE: "CONSULTANT_MILESTONE",
  MEDICAL_SERVICES: "MEDICAL",
  SURVEILLANCE_AND_INSPECTION: "SURVEILLANCE",
  TELECOM_AND_INTERNET_SERVICES: "TELECOM",
  CSR_EXTERNAL_RELATION: "CSR",
  CORPORATE_CREDIT_CARD: "CORPORATE_CARD",
  MISC_BUSINESS_EXPENSES: "MISC_EXPENSES",
  EVENTS_AND_CELEBRATIONS: "EVENTS",
  EMPLOYEE_SETTLEMENTS: "EMPLOYEE_SETTLEMENT",
};

const SCREEN_CATEGORY_TO_CFG: Record<string, string> = Object.fromEntries(
  Object.entries(CFG_CATEGORY_TO_SCREEN).map(([cfg, screen]) => [screen, cfg]),
);

const DOC_TO_SCREEN: Record<string, string> = {
  BANK_GUARANTEE_BOND_WARRANTY_LETTER: "BANK_GUARANTEE",
  CONTRACT_ENGAGEMENT_LETTER: "CONTRACT",
  WORK_PROGRESS_CERTIFICATE_BAST: "BAST",
  MEAL_ATTENDANCE_AT_CANTEEN_ALL_MEAL_TYPES: "MEAL_ATTENDANCE",
  RECAPITULATION_BACK_CHARGE_SNACKS_SPECIAL_LUNCH_DI: "BACK_CHARGE",
  MEASUREMENTS_BILL_OF_QUANTITY: "BOQ",
  INSPECTION_REPORT_CERTIFICATE_INCL_QUANTITY_CERTIF: "INSPECTION_REPORT",
  SIUJK_PERMIT: "SIUJK",
  MANAGEMENT_OR_FUNCTIONAL_APPROVAL_AS_PER_DOA: "DOA_APPROVAL",
};

const SCREEN_TO_DOC: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TO_SCREEN).map(([cfg, screen]) => [screen, cfg]),
);

const REF_TO_SCREEN: Record<string, string> = {
  matrix_po: "PO",
  matrix_grn: "GRN_SES",
  matrix_service_entry_sheet: "GRN_SES",
  matrix_vendor_master_data: "VENDOR_MASTER",
  matrix_processed_invoice_history: "INVOICE_HISTORY",
  matrix_coretax_validation_djp_portal: "CORETAX",
  matrix_attendence_face_id: "FACE_ID",
  matrix_hcis_clearing_account: "HCIS",
  matrix_internal_order: "INTERNAL_ORDER",
};

const SCREEN_TO_REFS: Record<string, string[]> = {
  PO: ["matrix_po"],
  GRN_SES: ["matrix_grn", "matrix_service_entry_sheet"],
  VENDOR_MASTER: ["matrix_vendor_master_data"],
  INVOICE_HISTORY: ["matrix_processed_invoice_history"],
  CORETAX: ["matrix_coretax_validation_djp_portal"],
  FACE_ID: ["matrix_attendence_face_id"],
  HCIS: ["matrix_hcis_clearing_account"],
  INTERNAL_ORDER: ["matrix_internal_order"],
};

const DATA_KEY_BY_CODE: Record<string, string> = {
  DP_1_01: "vendor_name",
  DP_1_02: "bank_account",
  DP_1_03: "invoice_date",
  DP_1_04: "po_number",
  DP_1_05: "invoice_number",
  DP_1_06: "unit_rate",
  DP_1_07: "payment_terms",
  DP_1_08: "invoice_amount",
  DP_1_09: "item_description",
};

type Json = Record<string, any>;

export interface CfgEvalRule {
  RuleKey: string;
  DataPoint: string;
  DataKey: string;
  RuleType: string;
  Scope: string;
  Categories: string[];
  DisabledCategories: string[];
  SourceDoc: string;
  SourceField: string;
  Targets: Array<{ doc: string; requirement: string; field: string }>;
  OnFail: string;
  LinkedCheck: string | null;
}

const bad = (message: string) => new APIError(message, StatusCodeEnum.HTTP_BAD_REQUEST);

const has = (body: Json, key: string) => Object.prototype.hasOwnProperty.call(body || {}, key);

function pgCode(error: unknown): string | undefined {
  const err = error as { original?: { code?: string }; parent?: { code?: string } };
  return err?.original?.code || err?.parent?.code;
}

function asDbError(error: unknown, fallback: string): APIError {
  logger.error(fallback, error);
  const code = pgCode(error);
  if (code === "23514") return bad("This rule cannot be saved that way. A required matrix setting is still open.");
  if (code === "23505") return new APIError("A rule with this key already exists", StatusCodeEnum.HTTP_CONFLICT);
  if (code === "23503") return bad("This rule already has stored results, so that change was not applied.");
  return new APIError(fallback, 500);
}

async function q<T = Json>(sql: string, replacements?: Json, transaction?: Transaction): Promise<T[]> {
  return sequelize.query(sql, { replacements, transaction, type: QueryTypes.SELECT }) as Promise<T[]>;
}

function screenCategory(code: string): string {
  return CFG_CATEGORY_TO_SCREEN[code] || code;
}

function cfgCategory(code: string): string {
  const upper = String(code || "").toUpperCase();
  return SCREEN_CATEGORY_TO_CFG[upper] || upper;
}

function screenDoc(documentCode: string | null, physicalName: string | null): string {
  if (physicalName && REF_TO_SCREEN[physicalName]) return REF_TO_SCREEN[physicalName];
  if (!documentCode) return "";
  return DOC_TO_SCREEN[documentCode] || documentCode;
}

function dataKeyOf(code: string | null, name: string | null): string {
  if (code && DATA_KEY_BY_CODE[code]) return DATA_KEY_BY_CODE[code];
  return String(name || code || "field")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function screenType(ruleType: string): string {
  if (ruleType === "LOGICAL_AI" || ruleType === "FUZZY") return "LOGICAL";
  if (ruleType === "PRESENCE") return "AVAILABILITY";
  return ruleType || "EXACT";
}

function screenLevel(level: string): string {
  if (level === "GROUP") return "WORKER";
  return level === "LINE" ? "LINE" : "HEADER";
}

function cfgLevel(level: string): string {
  const upper = String(level || "HEADER").toUpperCase();
  if (upper === "WORKER" || upper === "GROUP") return "GROUP";
  return upper === "LINE" ? "LINE" : "HEADER";
}

function screenOnFail(action: string | null): string {
  if (action === "BLOCK") return "BLOCK";
  if (action === "ROUTE") return "APPROVAL";
  if (action === "NO_IMPACT") return "REPORT";
  return "REVIEW";
}

function flagsFor(onFail: string): {
  action: string;
  block: boolean;
  raise: boolean;
  severity: string;
  owner: string | null;
  queue: string | null;
} {
  switch (String(onFail || "REVIEW").toUpperCase()) {
    case "BLOCK":
      return { action: "BLOCK", block: true, raise: true, severity: "HARD_FAIL", owner: TEST_OWNER, queue: null };
    case "APPROVAL":
      return { action: "ROUTE", block: false, raise: true, severity: "ERROR", owner: TEST_OWNER, queue: "APPROVAL" };
    case "REPORT":
      return { action: "NO_IMPACT", block: false, raise: false, severity: "INFO", owner: null, queue: null };
    default:
      // REVIEW and CALCULATE. cfg has no Calculate action; Warn still raises an exception and does not block.
      return { action: "WARN", block: false, raise: true, severity: "WARNING", owner: TEST_OWNER, queue: null };
  }
}

function refOrder(ref: string): number {
  const [major, minor] = String(ref || "").split(".");
  const a = Number(major);
  const b = Number(minor);
  if (!Number.isFinite(a)) return 100000;
  return a * 1000 + (Number.isFinite(b) ? b : 0);
}

function requirementOf(mark: string | null, onMissing: string | null): string {
  if (mark === "PARTIAL") return "PARTIAL";
  if (onMissing === "NOT_APPLICABLE") return "IF_PRESENT";
  return "REQUIRED";
}

function actor(userId?: number | null): string {
  return userId ? String(userId) : "portal";
}

async function hiddenRuleIds(transaction?: Transaction): Promise<Set<number>> {
  const rows = await q<{ entity_id: string; action: string }>(
    `SELECT DISTINCT ON (entity_id) entity_id, action
       FROM cfg."CONFIG_CHANGE_LOG"
      WHERE entity_name = 'VALIDATION_RULE'
      ORDER BY entity_id, changed_at DESC, config_change_log_id DESC`,
    undefined,
    transaction,
  );
  const hidden = new Set<number>();
  for (const row of rows) {
    if (row.action === "DEACTIVATE") hidden.add(Number(row.entity_id));
  }
  return hidden;
}

async function logChange(
  ruleId: number,
  action: string,
  before: Json | null,
  after: Json | null,
  userId: number | null | undefined,
  transaction: Transaction,
) {
  await sequelize.query(
    `INSERT INTO cfg."CONFIG_CHANGE_LOG"
       (entity_name, entity_id, action, before_json, after_json, changed_by)
     VALUES ('VALIDATION_RULE', :id, :action, CAST(:before AS jsonb), CAST(:after AS jsonb), :by)`,
    {
      replacements: {
        id: ruleId,
        action,
        before: JSON.stringify(before),
        after: JSON.stringify(after),
        by: actor(userId),
      },
      transaction,
    },
  );
}

type RuleRow = {
  validation_rule_id: string;
  matrix_ref: string | null;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  match_level: string;
  applies_to_all_categories: boolean;
  description: string | null;
  failure_action: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  priority: number;
  updated_at: string | null;
  data_point_id: string | null;
  data_point_code: string | null;
  data_point_name: string | null;
};

type OperandRow = {
  validation_rule_id: string;
  seq: number;
  role: string;
  on_missing: string | null;
  field_label: string | null;
  document_code: string | null;
  physical_name: string | null;
  bundle_mark: string | null;
  ref_mark: string | null;
};

type CategoryRow = {
  validation_rule_id: string;
  scope: string;
  category_code: string;
};

function assemble(
  rule: RuleRow,
  operands: OperandRow[],
  categories: CategoryRow[],
  linked: Map<string, string | null>,
) {
  const ordered = operands.slice().sort((a, b) => a.seq - b.seq);
  const sourceOp = ordered.find((row) => row.role === "SOURCE") || ordered[0];
  const source = sourceOp ? screenDoc(sourceOp.document_code, sourceOp.physical_name) : "";
  const targets = ordered
    .filter((row) => row !== sourceOp)
    .map((row) => ({
      doc: screenDoc(row.document_code, row.physical_name),
      requirement: requirementOf(row.bundle_mark || row.ref_mark, row.on_missing),
      field: row.field_label || "",
    }))
    .filter((row) => row.doc);
  const includes = categories.filter((row) => row.scope === "INCLUDE").map((row) => screenCategory(row.category_code));
  const excludes = categories.filter((row) => row.scope === "EXCLUDE").map((row) => screenCategory(row.category_code));
  const ruleKey = rule.matrix_ref || rule.rule_code;
  const id = Number(rule.validation_rule_id);
  const ruleType = screenType(rule.rule_type);
  return {
    id,
    ruleId: id,
    ruleKey,
    dataPoint: rule.data_point_name || rule.rule_name,
    dataKey: dataKeyOf(rule.data_point_code, rule.data_point_name || rule.rule_name),
    ruleType,
    scope: rule.applies_to_all_categories ? "COMMON" : "CATEGORY",
    categories: includes,
    disabledCategories: excludes,
    source,
    targets,
    compareMode: "ONE_TO_ALL",
    criteria: {},
    criteriaText: rule.description || "",
    runCondition: { type: "ALWAYS", text: "" },
    onFail: screenOnFail(rule.failure_action),
    status: rule.is_active ? "ACTIVE" : "DRAFT",
    businessNote: rule.description || "",
    noteBy: "",
    confirmWith: "",
    linkedCheck: linked.get(ruleKey) || null,
    serverSide: ["CALCULATION", "UNIQUENESS", "AUTHENTICITY"].includes(ruleType),
    group: null as string | null,
    sourceField: sourceOp?.field_label || "",
    matchLevel: screenLevel(rule.match_level),
    mandatory: rule.is_mandatory !== false,
    refs: rule.matrix_ref || "",
    displayOrder: rule.matrix_ref ? refOrder(rule.matrix_ref) : Number(rule.priority) || 0,
    updatedAt: rule.updated_at,
    dataPointId: rule.data_point_id ? Number(rule.data_point_id) : null,
  };
}

async function loadBundles(transaction?: Transaction) {
  const [rules, operands, categories, links] = await Promise.all([
    q<RuleRow>(
      `SELECT r.validation_rule_id, r.matrix_ref, r.rule_code, r.rule_name, r.rule_type::text AS rule_type,
              r.match_level::text AS match_level, r.applies_to_all_categories, r.description,
              r.failure_action::text AS failure_action, r.is_active, r.is_mandatory, r.priority, r.updated_at,
              dp.data_point_id, dp.data_point_code, dp.data_point_name
         FROM cfg."VALIDATION_RULE" r
         LEFT JOIN LATERAL (
           SELECT p.data_point_id, p.data_point_code, p.data_point_name
             FROM cfg."RULE_OPERAND" o
             LEFT JOIN cfg."BUNDLE_DOCUMENT_FIELD" bf ON bf.bundle_document_field_id = o.bundle_document_field_id
             LEFT JOIN cfg."REFERENCE_FIELD" rf ON rf.reference_field_id = o.reference_field_id
             JOIN cfg."DATA_POINT" p ON p.data_point_id = COALESCE(bf.data_point_id, rf.data_point_id)
            WHERE o.validation_rule_id = r.validation_rule_id
            ORDER BY CASE WHEN o.role = 'SOURCE' THEN 0 ELSE 1 END, o.seq
            LIMIT 1
         ) dp ON TRUE
        ORDER BY r.priority, r.matrix_ref, r.validation_rule_id`,
      undefined,
      transaction,
    ),
    q<OperandRow>(
      `SELECT o.validation_rule_id, o.seq, o.role::text AS role, o.on_missing::text AS on_missing,
              COALESCE(bf.field_label, rf.display_name) AS field_label,
              bd.document_code, rt.physical_name,
              bf.matrix_mark::text AS bundle_mark, rm.matrix_mark::text AS ref_mark
         FROM cfg."RULE_OPERAND" o
         JOIN cfg."VALIDATION_RULE" r ON r.validation_rule_id = o.validation_rule_id
         LEFT JOIN cfg."BUNDLE_DOCUMENT_FIELD" bf ON bf.bundle_document_field_id = o.bundle_document_field_id
         LEFT JOIN cfg."BUNDLE_DOCUMENT_TYPE" bd ON bd.bundle_document_type_id = bf.bundle_document_type_id
         LEFT JOIN cfg."REFERENCE_FIELD" rf ON rf.reference_field_id = o.reference_field_id
         LEFT JOIN cfg."REFERENCE_TABLE" rt ON rt.reference_table_id = rf.reference_table_id
         LEFT JOIN cfg."REFERENCE_DATA_POINT_MARK" rm
           ON rm.reference_field_id = o.reference_field_id AND rm.matrix_ref = r.matrix_ref
        WHERE o.invoice_category_id IS NULL`,
      undefined,
      transaction,
    ),
    q<CategoryRow>(
      `SELECT c.validation_rule_id, c.scope::text AS scope, v.category_code
         FROM cfg."VALIDATION_RULE_CATEGORY" c
         JOIN cfg."VAL_INVOICE_CATEGORY" v ON v.invoice_category_id = c.invoice_category_id`,
      undefined,
      transaction,
    ),
    linkedChecks(),
  ]);
  return { rules, operands, categories, links };
}

async function linkedChecks(): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  try {
    await ensureMatchRuleTable();
    const rows = await q<{ RuleKey: string; LinkedCheck: string | null; OnFail: string; Status: string }>(
      `SELECT "RuleKey", "LinkedCheck", "OnFail", "Status"
         FROM "AP_MATCH_RULE"
        WHERE "IsDeleted" = false`,
    );
    for (const row of rows) map.set(row.RuleKey, row.LinkedCheck || null);
  } catch (error) {
    logger.warn("AP_MATCH_RULE could not be read for linked checks", error);
  }
  return map;
}

function canActivate(row: { rule_type: string; tolerance_mode: string | null; tolerance_base_role: string | null; tolerance_pct: unknown; tolerance_amount: unknown; tolerance_days: unknown }): boolean {
  if (row.rule_type !== "TOLERANCE") return true;
  const hasLimit = row.tolerance_pct != null || row.tolerance_amount != null || row.tolerance_days != null;
  return Boolean(row.tolerance_mode && row.tolerance_base_role && hasLimit);
}

/**
 * Turn on cfg rules whose matrix_ref is an ACTIVE AP_MATCH_RULE key.
 * Runs once per rule (updated_by is stamped). Does not turn drafts on.
 */
export async function syncActiveRulesForTest(): Promise<{ activated: string[]; skipped: string[] }> {
  const activated: string[] = [];
  const skipped: string[] = [];
  let legacy: Array<{ RuleKey: string; OnFail: string }> = [];
  try {
    await ensureMatchRuleTable();
    legacy = await q(
      `SELECT "RuleKey", "OnFail" FROM "AP_MATCH_RULE" WHERE "IsDeleted" = false AND "Status" = 'ACTIVE'`,
    );
  } catch (error) {
    logger.warn("Active-rule sync skipped; AP_MATCH_RULE is not readable", error);
    return { activated, skipped };
  }
  if (!legacy.length) return { activated, skipped };
  const onFail = new Map(legacy.map((row) => [row.RuleKey, row.OnFail]));
  const keys = legacy.map((row) => row.RuleKey);
  const rows = await q<{
    validation_rule_id: string;
    matrix_ref: string;
    rule_type: string;
    tolerance_mode: string | null;
    tolerance_base_role: string | null;
    tolerance_pct: unknown;
    tolerance_amount: unknown;
    tolerance_days: unknown;
    is_active: boolean;
    updated_by: string | null;
  }>(
    `SELECT validation_rule_id, matrix_ref, rule_type::text AS rule_type,
            tolerance_mode::text AS tolerance_mode, tolerance_base_role::text AS tolerance_base_role,
            tolerance_pct, tolerance_amount, tolerance_days, is_active, updated_by
       FROM cfg."VALIDATION_RULE"
      WHERE matrix_ref IN (:keys)`,
    { keys },
  );
  const hidden = await hiddenRuleIds();
  for (const row of rows) {
    const id = Number(row.validation_rule_id);
    if (row.is_active || row.updated_by || hidden.has(id)) continue;
    if (!canActivate(row)) {
      skipped.push(row.matrix_ref);
      continue;
    }
    const flags = flagsFor(onFail.get(row.matrix_ref) || "REVIEW");
    try {
      await sequelize.transaction(async (transaction) => {
        await sequelize.query(
          `UPDATE cfg."VALIDATION_RULE"
              SET is_active = TRUE,
                  spec_status = 'READY',
                  failure_action = CAST(:action AS cfg.failure_action),
                  on_fail_block = :block,
                  on_fail_raise_exception = :raise,
                  severity = CAST(:severity AS cfg.rule_severity),
                  exception_owner = :owner,
                  exception_queue = :queue,
                  updated_by = :actor,
                  updated_at = NOW()
            WHERE validation_rule_id = :id
              AND is_active = FALSE
              AND updated_by IS NULL`,
          {
            replacements: {
              id,
              action: flags.action,
              block: flags.block,
              raise: flags.raise,
              severity: flags.severity,
              owner: flags.owner,
              queue: flags.queue,
              actor: SYNC_ACTOR,
            },
            transaction,
          },
        );
        await logChange(id, "UPDATE", { is_active: false }, { is_active: true, failure_action: flags.action, testSync: true }, null, transaction);
      });
      activated.push(row.matrix_ref);
    } catch (error) {
      skipped.push(row.matrix_ref);
      if (!loggedSkips.has(row.matrix_ref)) {
        loggedSkips.add(row.matrix_ref);
        logger.warn(`Rule ${row.matrix_ref} stayed inactive`, error);
      }
    }
  }
  return { activated, skipped };
}

export async function listCfgMatchRules(userId?: number | null) {
  const sync = await syncActiveRulesForTest();
  void userId;
  const hidden = await hiddenRuleIds();
  const { rules, operands, categories, links } = await loadBundles();
  const byRule = new Map<number, OperandRow[]>();
  for (const row of operands) {
    const id = Number(row.validation_rule_id);
    const list = byRule.get(id) || [];
    list.push(row);
    byRule.set(id, list);
  }
  const cats = new Map<number, CategoryRow[]>();
  for (const row of categories) {
    const id = Number(row.validation_rule_id);
    const list = cats.get(id) || [];
    list.push(row);
    cats.set(id, list);
  }
  const screen = rules
    .filter((rule) => !hidden.has(Number(rule.validation_rule_id)))
    .map((rule) => {
      const id = Number(rule.validation_rule_id);
      const item = assemble(rule, byRule.get(id) || [], cats.get(id) || [], links);
      const { dataPointId, ...rest } = item;
      void dataPointId;
      return rest;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder || String(a.ruleKey).localeCompare(String(b.ruleKey)));
  return {
    seeded: false,
    matrixDraftsAdded: 0,
    activatedForTest: sync.activated,
    activationSkipped: sync.skipped,
    rules: screen,
  };
}

async function readOne(ruleId: number, transaction?: Transaction) {
  const hidden = await hiddenRuleIds(transaction);
  if (hidden.has(ruleId)) return null;
  const { rules, operands, categories, links } = await loadBundles(transaction);
  const rule = rules.find((row) => Number(row.validation_rule_id) === ruleId);
  if (!rule) return null;
  return assemble(
    rule,
    operands.filter((row) => Number(row.validation_rule_id) === ruleId),
    categories.filter((row) => Number(row.validation_rule_id) === ruleId),
    links,
  );
}

function publicRule(rule: Json) {
  const { dataPointId, ...rest } = rule;
  void dataPointId;
  return rest;
}

async function categoryId(code: string, transaction: Transaction): Promise<number | null> {
  const rows = await q<{ invoice_category_id: string }>(
    `SELECT invoice_category_id FROM cfg."VAL_INVOICE_CATEGORY" WHERE category_code = :code`,
    { code: cfgCategory(code) },
    transaction,
  );
  return rows[0] ? Number(rows[0].invoice_category_id) : null;
}

async function saveCategories(ruleId: number, body: Json, current: Json, transaction: Transaction) {
  const touch = has(body, "scope") || has(body, "categories") || has(body, "disabledCategories");
  if (!touch) return;
  const scope = has(body, "scope") ? String(body.scope || "COMMON").toUpperCase() : current.scope;
  const includes: string[] = has(body, "categories") ? body.categories || [] : current.categories || [];
  const excludes: string[] = has(body, "disabledCategories") ? body.disabledCategories || [] : current.disabledCategories || [];
  if (scope === "CATEGORY" && !includes.length) throw bad("Pick at least one category, or set the rule to Common");
  await sequelize.query(
    `UPDATE cfg."VALIDATION_RULE"
        SET applies_to_all_categories = :all, updated_at = NOW()
      WHERE validation_rule_id = :id`,
    { replacements: { id: ruleId, all: scope !== "CATEGORY" }, transaction },
  );
  await sequelize.query(`DELETE FROM cfg."VALIDATION_RULE_CATEGORY" WHERE validation_rule_id = :id`, {
    replacements: { id: ruleId },
    transaction,
  });
  const rows = scope === "CATEGORY"
    ? includes.map((code) => ({ code, scopeType: "INCLUDE" }))
    : excludes.map((code) => ({ code, scopeType: "EXCLUDE" }));
  for (const row of rows) {
    const id = await categoryId(String(row.code), transaction);
    if (!id) throw bad(`Unknown category ${row.code}`);
    await sequelize.query(
      `INSERT INTO cfg."VALIDATION_RULE_CATEGORY" (validation_rule_id, invoice_category_id, scope)
       VALUES (:ruleId, :categoryId, CAST(:scope AS cfg.scope_type))`,
      { replacements: { ruleId, categoryId: id, scope: row.scopeType }, transaction },
    );
  }
}

async function ensureBundleField(
  documentCode: string,
  dataPointId: number,
  matrixRef: string,
  label: string,
  mark: "EXACT" | "PARTIAL",
  transaction: Transaction,
): Promise<number> {
  const types = await q<{ bundle_document_type_id: string }>(
    `SELECT bundle_document_type_id FROM cfg."BUNDLE_DOCUMENT_TYPE" WHERE document_code = :code`,
    { code: documentCode },
    transaction,
  );
  if (!types[0]) throw bad(`Document ${documentCode} is not in the matrix`);
  const typeId = Number(types[0].bundle_document_type_id);
  const existing = await q<{ bundle_document_field_id: string }>(
    `SELECT bundle_document_field_id
       FROM cfg."BUNDLE_DOCUMENT_FIELD"
      WHERE bundle_document_type_id = :typeId AND data_point_id = :dataPointId AND matrix_ref = :matrixRef`,
    { typeId, dataPointId, matrixRef },
    transaction,
  );
  if (existing[0]) {
    const fieldId = Number(existing[0].bundle_document_field_id);
    await sequelize.query(
      `UPDATE cfg."BUNDLE_DOCUMENT_FIELD"
          SET field_label = :label, matrix_mark = CAST(:mark AS cfg.matrix_mark)
        WHERE bundle_document_field_id = :fieldId`,
      { replacements: { fieldId, label: label || "Field", mark }, transaction },
    );
    return fieldId;
  }
  const inserted = await q<{ bundle_document_field_id: string }>(
    `INSERT INTO cfg."BUNDLE_DOCUMENT_FIELD"
       (bundle_document_type_id, data_point_id, matrix_ref, matrix_mark, field_label, field_level)
     VALUES (:typeId, :dataPointId, :matrixRef, CAST(:mark AS cfg.matrix_mark), :label, 'HEADER')
     RETURNING bundle_document_field_id`,
    { typeId, dataPointId, matrixRef, mark, label: label || "Field" },
    transaction,
  );
  return Number(inserted[0].bundle_document_field_id);
}

async function ensureReferenceField(
  physicalNames: string[],
  dataPointId: number,
  matrixRef: string,
  mark: "EXACT" | "PARTIAL",
  transaction: Transaction,
): Promise<{ fieldId: number; origin: "EAPA_DB" | "EXTERNAL_SERVICE" }> {
  for (const name of physicalNames) {
    const rows = await q<{ reference_field_id: string; source_kind: string }>(
      `SELECT f.reference_field_id, t.source_kind::text AS source_kind
         FROM cfg."REFERENCE_FIELD" f
         JOIN cfg."REFERENCE_TABLE" t ON t.reference_table_id = f.reference_table_id
        WHERE t.physical_name = :name AND f.data_point_id = :dataPointId
        LIMIT 1`,
      { name, dataPointId },
      transaction,
    );
    if (!rows[0]) continue;
    const fieldId = Number(rows[0].reference_field_id);
    await sequelize.query(
      `INSERT INTO cfg."REFERENCE_DATA_POINT_MARK" (reference_field_id, data_point_id, matrix_ref, matrix_mark)
       VALUES (:fieldId, :dataPointId, :matrixRef, CAST(:mark AS cfg.matrix_mark))
       ON CONFLICT (reference_field_id, matrix_ref)
       DO UPDATE SET matrix_mark = EXCLUDED.matrix_mark`,
      { replacements: { fieldId, dataPointId, matrixRef, mark }, transaction },
    );
    return { fieldId, origin: rows[0].source_kind === "EXTERNAL_API" ? "EXTERNAL_SERVICE" : "EAPA_DB" };
  }
  throw bad("That document has no stored column for this data point.");
}

async function resolveOperand(
  screenCode: string,
  dataPointId: number,
  matrixRef: string,
  label: string,
  mark: "EXACT" | "PARTIAL",
  transaction: Transaction,
): Promise<{ origin: string; bundleId: number | null; refId: number | null }> {
  const code = String(screenCode || "").toUpperCase();
  const refs = SCREEN_TO_REFS[code];
  if (refs) {
    const ref = await ensureReferenceField(refs, dataPointId, matrixRef, mark, transaction);
    return { origin: ref.origin, bundleId: null, refId: ref.fieldId };
  }
  const documentCode = SCREEN_TO_DOC[code] || code;
  const bundleId = await ensureBundleField(documentCode, dataPointId, matrixRef, label, mark, transaction);
  return { origin: "BUNDLE_DOCUMENT", bundleId, refId: null };
}

async function replaceOperands(ruleId: number, current: Json, body: Json, transaction: Transaction) {
  const touch = has(body, "source") || has(body, "sourceField") || has(body, "targets");
  if (!touch) return;
  const dataPointId = current.dataPointId as number | null;
  if (!dataPointId) throw bad("This rule has no data point, so its documents cannot be changed.");
  const source = String(has(body, "source") ? body.source : current.source || "").toUpperCase();
  const sourceField = String(has(body, "sourceField") ? body.sourceField : current.sourceField || "");
  const targets = (has(body, "targets") ? body.targets : current.targets) || [];
  if (!source) throw bad("source (document A) is required");
  const matrixRef = String(current.ruleKey || "");
  await sequelize.query(
    `DELETE FROM cfg."RULE_CONDITION" c
      USING cfg."RULE_OPERAND" o
      WHERE c.rule_operand_id = o.rule_operand_id AND o.validation_rule_id = :id`,
    { replacements: { id: ruleId }, transaction },
  );
  await sequelize.query(`DELETE FROM cfg."RULE_OPERAND" WHERE validation_rule_id = :id`, {
    replacements: { id: ruleId },
    transaction,
  });
  const desired: Array<{ code: string; label: string; role: "SOURCE" | "TARGET"; mark: "EXACT" | "PARTIAL"; missing: string }> = [
    { code: source, label: sourceField, role: "SOURCE", mark: "EXACT", missing: "" },
  ];
  for (const target of targets as Json[]) {
    const requirement = String(target?.requirement || "REQUIRED").toUpperCase();
    if (requirement === "EXTRACT") continue;
    const doc = String(target?.doc || "").toUpperCase();
    if (!doc || doc === source) continue;
    desired.push({
      code: doc,
      label: String(target?.field || ""),
      role: "TARGET",
      mark: requirement === "PARTIAL" ? "PARTIAL" : "EXACT",
      missing: requirement === "IF_PRESENT" ? "NOT_APPLICABLE" : "",
    });
  }
  let seq = 1;
  for (const item of desired) {
    const resolved = await resolveOperand(item.code, dataPointId, matrixRef, item.label, item.mark, transaction);
    await sequelize.query(
      `INSERT INTO cfg."RULE_OPERAND"
         (validation_rule_id, seq, role, origin, operand_alias, bundle_document_field_id, reference_field_id, match_method, on_missing)
       VALUES (:ruleId, :seq, CAST(:role AS cfg.operand_role), CAST(:origin AS cfg.operand_origin), :alias,
               :bundleId, :refId, 'EXACT', CAST(NULLIF(:missing, '') AS cfg.missing_action))`,
      {
        replacements: {
          ruleId,
          seq,
          role: item.role,
          origin: resolved.origin,
          alias: seq === 1 ? "src" : `tgt_${seq}`,
          bundleId: resolved.bundleId,
          refId: resolved.refId,
          missing: item.missing,
        },
        transaction,
      },
    );
    seq += 1;
  }
}

async function applyActive(ruleId: number, onFail: string, userId: number | null | undefined, transaction: Transaction) {
  const rows = await q<{ rule_type: string; tolerance_mode: string | null; tolerance_base_role: string | null; tolerance_pct: unknown; tolerance_amount: unknown; tolerance_days: unknown }>(
    `SELECT rule_type::text AS rule_type, tolerance_mode::text AS tolerance_mode,
            tolerance_base_role::text AS tolerance_base_role, tolerance_pct, tolerance_amount, tolerance_days
       FROM cfg."VALIDATION_RULE" WHERE validation_rule_id = :id`,
    { id: ruleId },
    transaction,
  );
  if (!rows[0]) throw new APIError("Rule not found", StatusCodeEnum.HTTP_NOT_FOUND);
  if (!canActivate(rows[0])) throw bad("Tolerance mode is not confirmed, so this rule stays inactive.");
  const flags = flagsFor(onFail);
  await sequelize.query(
    `UPDATE cfg."VALIDATION_RULE"
        SET is_active = TRUE,
            spec_status = 'READY',
            failure_action = CAST(:action AS cfg.failure_action),
            on_fail_block = :block,
            on_fail_raise_exception = :raise,
            severity = CAST(:severity AS cfg.rule_severity),
            exception_owner = :owner,
            exception_queue = :queue,
            updated_by = :by,
            updated_at = NOW()
      WHERE validation_rule_id = :id`,
    {
      replacements: {
        id: ruleId,
        action: flags.action,
        block: flags.block,
        raise: flags.raise,
        severity: flags.severity,
        owner: flags.owner,
        queue: flags.queue,
        by: actor(userId),
      },
      transaction,
    },
  );
}

async function applyInactive(ruleId: number, userId: number | null | undefined, transaction: Transaction) {
  await sequelize.query(
    `UPDATE cfg."VALIDATION_RULE"
        SET is_active = FALSE, spec_status = 'DRAFT', updated_by = :by, updated_at = NOW()
      WHERE validation_rule_id = :id`,
    { replacements: { id: ruleId, by: actor(userId) }, transaction },
  );
}

async function ensureDataPoint(name: string, transaction: Transaction): Promise<number> {
  const existing = await q<{ data_point_id: string }>(
    `SELECT data_point_id FROM cfg."DATA_POINT" WHERE data_point_name = :name LIMIT 1`,
    { name },
    transaction,
  );
  if (existing[0]) return Number(existing[0].data_point_id);
  const code = `DP_UI_${name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)}`;
  const inserted = await q<{ data_point_id: string }>(
    `INSERT INTO cfg."DATA_POINT" (data_point_code, data_point_name, data_type, default_level)
     VALUES (:code, :name, 'TEXT', 'HEADER')
     RETURNING data_point_id`,
    { code, name },
    transaction,
  );
  return Number(inserted[0].data_point_id);
}

async function logicalPrompt(transaction: Transaction): Promise<number | null> {
  const rows = await q<{ prompt_template_id: string }>(
    `SELECT prompt_template_id FROM cfg."PROMPT_TEMPLATE"
      WHERE template_key = 'matrix.logical.unspecified'
      ORDER BY template_version DESC LIMIT 1`,
    undefined,
    transaction,
  );
  return rows[0] ? Number(rows[0].prompt_template_id) : null;
}

export async function createCfgMatchRule(body: Json, userId?: number | null) {
  const ruleKey = String(body?.ruleKey || "").trim();
  const dataPoint = String(body?.dataPoint || "").trim();
  if (!ruleKey) throw bad("ruleKey is required");
  if (!dataPoint) throw bad("dataPoint is required");
  const screenRuleType = String(body?.ruleType || "EXACT").toUpperCase();
  try {
    const id = await sequelize.transaction(async (transaction) => {
      const dataPointId = await ensureDataPoint(dataPoint, transaction);
      const promptId = screenRuleType === "LOGICAL" ? await logicalPrompt(transaction) : null;
      const ruleType = screenRuleType === "LOGICAL" && promptId ? "LOGICAL_AI" : screenRuleType === "LOGICAL" ? "LOGICAL" : screenRuleType === "AVAILABILITY" ? "PRESENCE" : screenRuleType === "AUTHENTICATE" ? "AUTHENTICITY" : ["EXACT", "CALCULATION", "TOLERANCE", "UNIQUENESS", "AUTHENTICITY"].includes(screenRuleType) ? screenRuleType : "EXACT";
      const comparator = ruleType === "LOGICAL" ? "CONTAINS" : "EQUALS";
      const handler = ruleType === "CALCULATION" || ruleType === "AUTHENTICITY" ? "todo.screen" : null;
      const code = `MX-UI-${ruleKey.replace(/[^A-Za-z0-9]+/g, "-")}`.slice(0, 80);
      const inserted = await q<{ validation_rule_id: string }>(
        `INSERT INTO cfg."VALIDATION_RULE" (
           applies_to_all_categories, rule_code, rule_name, matrix_ref, description,
           rule_stage, rule_type, comparator, handler_key, prompt_template_id, match_level,
           on_fail_block, on_fail_raise_exception, severity, spec_status, is_active, is_mandatory, priority, created_by
         ) VALUES (
           :all, :code, :name, :ref, :description,
           'HEADER', CAST(:ruleType AS cfg.rule_type), CAST(:comparator AS cfg.rule_comparator), :handler, :promptId,
           CAST(:level AS cfg.match_level), FALSE, TRUE, 'ERROR', 'DRAFT', FALSE, :mandatory, :priority, :by
         ) RETURNING validation_rule_id`,
        {
          all: String(body.scope || "COMMON").toUpperCase() !== "CATEGORY",
          code,
          name: dataPoint,
          ref: ruleKey,
          description: body.businessNote || body.criteriaText || null,
          ruleType,
          comparator,
          handler,
          promptId,
          level: cfgLevel(body.matchLevel),
          mandatory: body.mandatory !== false,
          priority: Number(body.displayOrder) || refOrder(ruleKey),
          by: actor(userId),
        },
        transaction,
      );
      const ruleId = Number(inserted[0].validation_rule_id);
      const current = {
        ruleKey,
        dataPointId,
        source: "",
        sourceField: "",
        targets: [] as Json[],
        scope: "COMMON",
        categories: [] as string[],
        disabledCategories: [] as string[],
      };
      await replaceOperands(ruleId, current, body, transaction);
      await saveCategories(ruleId, body, current, transaction);
      if (String(body.status || "").toUpperCase() === "ACTIVE") {
        await applyActive(ruleId, body.onFail, userId, transaction);
      }
      await logChange(ruleId, "INSERT", null, { ruleKey }, userId, transaction);
      return ruleId;
    });
    const saved = await readOne(id);
    return { rule: saved ? publicRule(saved) : null };
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw asDbError(error, "Could not create the rule");
  }
}

export async function updateCfgMatchRule(ruleIdRaw: unknown, body: Json, userId?: number | null) {
  const ruleId = Number(ruleIdRaw);
  if (!Number.isFinite(ruleId) || ruleId <= 0) throw bad("Invalid rule id");
  try {
    await sequelize.transaction(async (transaction) => {
      const current = await readOne(ruleId, transaction);
      if (!current) throw new APIError("Rule not found", StatusCodeEnum.HTTP_NOT_FOUND);
      if (has(body, "dataPoint") && current.dataPointId) {
        await sequelize.query(
          `UPDATE cfg."DATA_POINT" SET data_point_name = :name WHERE data_point_id = :id`,
          { replacements: { id: current.dataPointId, name: String(body.dataPoint).slice(0, 200) }, transaction },
        );
        await sequelize.query(
          `UPDATE cfg."VALIDATION_RULE" SET rule_name = :name, updated_at = NOW() WHERE validation_rule_id = :id`,
          { replacements: { id: ruleId, name: String(body.dataPoint).slice(0, 200) }, transaction },
        );
      }
      if (has(body, "businessNote") || has(body, "criteriaText")) {
        await sequelize.query(
          `UPDATE cfg."VALIDATION_RULE" SET description = :note, updated_at = NOW() WHERE validation_rule_id = :id`,
          { replacements: { id: ruleId, note: body.businessNote || body.criteriaText || null }, transaction },
        );
      }
      if (has(body, "matchLevel")) {
        await sequelize.query(
          `UPDATE cfg."VALIDATION_RULE"
              SET match_level = CAST(:level AS cfg.match_level), updated_at = NOW()
            WHERE validation_rule_id = :id`,
          { replacements: { id: ruleId, level: cfgLevel(body.matchLevel) }, transaction },
        );
      }
      if (has(body, "mandatory")) {
        await sequelize.query(
          `UPDATE cfg."VALIDATION_RULE" SET is_mandatory = :mandatory, updated_at = NOW() WHERE validation_rule_id = :id`,
          { replacements: { id: ruleId, mandatory: body.mandatory !== false }, transaction },
        );
      }
      await saveCategories(ruleId, body, current, transaction);
      await replaceOperands(ruleId, current, body, transaction);
      const status = has(body, "status") ? String(body.status || "").toUpperCase() : "";
      if (status === "ACTIVE") await applyActive(ruleId, body.onFail || current.onFail, userId, transaction);
      else if (status === "INACTIVE" || status === "DRAFT" || status === "CONFIRM") await applyInactive(ruleId, userId, transaction);
      await logChange(ruleId, "UPDATE", { ruleKey: current.ruleKey }, body, userId, transaction);
    });
    const saved = await readOne(ruleId);
    return { rule: saved ? publicRule(saved) : null };
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw asDbError(error, "Could not update the rule");
  }
}

export async function deleteCfgMatchRule(ruleIdRaw: unknown, userId?: number | null) {
  const ruleId = Number(ruleIdRaw);
  if (!Number.isFinite(ruleId) || ruleId <= 0) throw bad("Invalid rule id");
  const current = await readOne(ruleId);
  if (!current) throw new APIError("Rule not found", StatusCodeEnum.HTTP_NOT_FOUND);
  await sequelize.transaction(async (transaction) => {
    await applyInactive(ruleId, userId, transaction);
    await logChange(ruleId, "DEACTIVATE", { ruleKey: current.ruleKey }, { hidden: true }, userId, transaction);
  });
  return { ruleId, deleted: true };
}

export async function restoreCfgMatchRules(userId?: number | null) {
  const hidden = await hiddenRuleIds();
  if (hidden.size) {
    await sequelize.transaction(async (transaction) => {
      for (const id of hidden) {
        await logChange(id, "UPDATE", { hidden: true }, { hidden: false }, userId, transaction);
      }
    });
  }
  return listCfgMatchRules(userId);
}

export async function loadCfgEvalRules(): Promise<CfgEvalRule[]> {
  const listed = await listCfgMatchRules();
  return listed.rules
    .filter((rule) => rule.status === "ACTIVE")
    .map((rule) => ({
      RuleKey: rule.ruleKey,
      DataPoint: rule.dataPoint,
      DataKey: rule.dataKey,
      RuleType: rule.ruleType,
      Scope: rule.scope,
      Categories: rule.categories,
      DisabledCategories: rule.disabledCategories,
      SourceDoc: rule.source,
      SourceField: rule.sourceField,
      Targets: rule.targets,
      OnFail: rule.onFail,
      LinkedCheck: rule.linkedCheck,
    }));
}
