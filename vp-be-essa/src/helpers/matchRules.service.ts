/**
 * N-way match rules ("check A against B") — admin CRUD.
 *
 * Table: AP_MATCH_RULE (db/migrations/030_AP_MATCH_RULE_PG.sql).
 * The table is seeded from src/json/matchRulesSeed.json on first read, so a fresh
 * environment always has the rule set agreed on the 25 Sep 2026 requirement call.
 * The seed file is generated from the frontend catalog
 * (vp-fe-essa/src/components/Essa/lib/nWay/seedRules.js) — keep them in sync.
 */
import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { ApMatchRule } from "../models/apMatchRule";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import seedRules from "../json/matchRulesSeed.json";

const RULE_TYPES = ["EXACT", "LOGICAL", "CALCULATION", "TOLERANCE", "UNIQUENESS", "AUTHENTICITY", "AVAILABILITY"];
const MATCH_LEVELS = ["HEADER", "LINE", "WORKER"];
const COMBINES = ["LOWER", "HIGHER", "PCT", "AMOUNT"];
const GROUPS = ["IDENTITY", "COMMERCIAL", "QUANTITY", "AMOUNTS", "CONTROLS", "DOCUMENTS"];
const SCOPES = ["COMMON", "CATEGORY"];
const COMPARE_MODES = ["ONE_TO_ALL", "STEPWISE"];
const FAIL_ACTIONS = ["REVIEW", "BLOCK", "CALCULATE", "APPROVAL", "REPORT"];
const STATUSES = ["ACTIVE", "CONFIRM", "DRAFT", "INACTIVE"];
const REQUIREMENTS = ["REQUIRED", "IF_PRESENT", "PARTIAL", "EXTRACT"];
const RUN_CONDITIONS = ["ALWAYS", "PO_CLAUSE", "DOC_PRESENT", "CUSTOM"];

type Json = Record<string, any>;

const bad = (message: string) => new APIError(message, StatusCodeEnum.HTTP_BAD_REQUEST);

const pick = (value: unknown, allowed: string[], fallback: string, field: string): string => {
  if (value == null || value === "") return fallback;
  const v = String(value).trim().toUpperCase();
  if (!allowed.includes(v)) throw bad(`${field} must be one of ${allowed.join(", ")}`);
  return v;
};

const strList = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((v) => String(v || "").trim().toUpperCase()).filter(Boolean)))
    : [];

const optText = (value: unknown, max: number): string | null => {
  const s = value == null ? "" : String(value).trim();
  return s ? s.slice(0, max) : null;
};

const numOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function serializeMatchRule(row: ApMatchRule) {
  return {
    id: Number(row.RuleId),
    ruleId: Number(row.RuleId),
    ruleKey: row.RuleKey,
    dataPoint: row.DataPoint,
    dataKey: row.DataKey,
    ruleType: row.RuleType,
    scope: row.Scope,
    categories: row.Categories || [],
    disabledCategories: row.DisabledCategories || [],
    source: row.SourceDoc,
    targets: row.Targets || [],
    compareMode: row.CompareMode,
    criteria: row.Criteria || {},
    criteriaText: row.CriteriaText || "",
    runCondition: row.RunCondition || { type: "ALWAYS", text: "" },
    onFail: row.OnFail,
    status: row.Status,
    businessNote: row.BusinessNote || "",
    noteBy: row.NoteBy || "",
    confirmWith: row.ConfirmWith || "",
    linkedCheck: row.LinkedCheck || null,
    serverSide: Boolean(row.ServerSide),
    group: row.RuleGroup || null,
    sourceField: row.SourceField || "",
    matchLevel: row.MatchLevel || "HEADER",
    mandatory: row.IsMandatory !== false,
    refs: row.MatrixRefs || "",
    displayOrder: row.DisplayOrder,
    updatedAt: row.UpdatedAt || row.CreatedAt,
  };
}

/** Validate an API payload into model attributes. `partial` allows PATCH semantics. */
function toAttributes(body: Json, partial = false): Json {
  const out: Json = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  if (!partial || has("ruleKey")) {
    const key = String(body.ruleKey || "").trim();
    if (!key) throw bad("ruleKey is required");
    out.RuleKey = key.slice(0, 20);
  }
  if (!partial || has("dataPoint")) {
    const dp = String(body.dataPoint || "").trim();
    if (!dp) throw bad("dataPoint is required");
    out.DataPoint = dp.slice(0, 200);
  }
  if (!partial || has("dataKey")) {
    const dk = String(body.dataKey || "").trim();
    if (!dk) throw bad("dataKey is required");
    out.DataKey = dk.slice(0, 60);
  }
  if (!partial || has("ruleType")) out.RuleType = pick(body.ruleType, RULE_TYPES, "EXACT", "ruleType");
  if (!partial || has("scope")) out.Scope = pick(body.scope, SCOPES, "COMMON", "scope");
  if (!partial || has("categories")) out.Categories = strList(body.categories);
  if (!partial || has("disabledCategories")) out.DisabledCategories = strList(body.disabledCategories);
  if (!partial || has("source")) {
    const src = String(body.source || "").trim().toUpperCase();
    if (!src) throw bad("source (document A) is required");
    out.SourceDoc = src.slice(0, 40);
  }
  if (!partial || has("targets")) {
    const targets = Array.isArray(body.targets) ? body.targets : [];
    out.Targets = targets
      .map((t: Json) => ({
        doc: String(t?.doc || "").trim().toUpperCase(),
        requirement: pick(t?.requirement, REQUIREMENTS, "REQUIRED", "targets.requirement"),
        field: String(t?.field || "").slice(0, 200),
      }))
      .filter((t: Json) => t.doc);
  }
  if (!partial || has("compareMode")) {
    out.CompareMode = pick(body.compareMode, COMPARE_MODES, "ONE_TO_ALL", "compareMode");
  }
  if (!partial || has("criteria")) {
    const c: Json = body.criteria || {};
    out.Criteria = {
      similarity: numOrNull(c.similarity),
      tolerancePct: numOrNull(c.tolerancePct),
      toleranceAmount: numOrNull(c.toleranceAmount),
      aiConfidence: numOrNull(c.aiConfidence),
      combine: (() => {
        const raw = String(c.combine || "HIGHER").toUpperCase();
        const mapped = raw === "BOTH" ? "LOWER" : raw === "EITHER" ? "HIGHER" : raw;
        return COMBINES.includes(mapped) ? mapped : "HIGHER";
      })(),
      measuredOn: String(c.measuredOn || "TARGET").toUpperCase() === "SOURCE" ? "SOURCE" : "TARGET",
      uniqueKey: Array.isArray(c.uniqueKey) ? c.uniqueKey.map(String) : [],
    };
  }
  if (!partial || has("criteriaText")) out.CriteriaText = optText(body.criteriaText, 4000);
  if (!partial || has("runCondition")) {
    const rc: Json = body.runCondition || {};
    out.RunCondition = {
      type: pick(rc.type, RUN_CONDITIONS, "ALWAYS", "runCondition.type"),
      text: String(rc.text || "").slice(0, 1000),
    };
  }
  if (!partial || has("onFail")) out.OnFail = pick(body.onFail, FAIL_ACTIONS, "REVIEW", "onFail");
  if (!partial || has("status")) out.Status = pick(body.status, STATUSES, "ACTIVE", "status");
  if (!partial || has("businessNote")) out.BusinessNote = optText(body.businessNote, 4000);
  if (!partial || has("noteBy")) out.NoteBy = optText(body.noteBy, 200);
  if (!partial || has("confirmWith")) out.ConfirmWith = optText(body.confirmWith, 200);
  if (!partial || has("linkedCheck")) out.LinkedCheck = optText(body.linkedCheck, 60);
  if (!partial || has("serverSide")) out.ServerSide = Boolean(body.serverSide);
  if (!partial || has("group")) {
    const g = body.group ? String(body.group).toUpperCase() : "";
    out.RuleGroup = GROUPS.includes(g) ? g : null;
  }
  if (!partial || has("sourceField")) out.SourceField = optText(body.sourceField, 200);
  if (!partial || has("matchLevel")) out.MatchLevel = pick(body.matchLevel, MATCH_LEVELS, "HEADER", "matchLevel");
  if (!partial || has("mandatory")) out.IsMandatory = body.mandatory !== false;
  if (!partial || has("refs")) out.MatrixRefs = optText(body.refs, 200);
  if (has("displayOrder")) out.DisplayOrder = numOrNull(body.displayOrder) ?? 0;

  if (out.Scope === "CATEGORY" && Array.isArray(out.Categories) && !out.Categories.length) {
    throw bad("Pick at least one category, or set the rule to Common");
  }
  return out;
}

/**
 * Make sure AP_MATCH_RULE exists, so the admin screen works right after a pull
 * without a manual migration. Runs migration 030 (idempotent: CREATE … IF NOT EXISTS)
 * once per process; falls back to Sequelize sync if the SQL file is not shipped.
 */
let tableReady: Promise<void> | null = null;
export function ensureMatchRuleTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const file = path.resolve(__dirname, "../../db/migrations/030_AP_MATCH_RULE_PG.sql");
      if (fs.existsSync(file)) {
        await sequelize.query(fs.readFileSync(file, "utf8"));
      } else {
        await ApMatchRule.sync();
      }
    })().catch((err) => {
      tableReady = null; // retry on the next request
      throw err;
    });
  }
  return tableReady;
}

async function seedIfEmpty(userId?: number | null) {
  await ensureMatchRuleTable();
  const count = await ApMatchRule.count({ where: { IsDeleted: false } });
  if (count > 0) return false;
  const rows = (seedRules as Json[]).map((r, i) => ({
    ...toAttributes(r),
    DisplayOrder: r.displayOrder ?? i + 1,
    IsDeleted: false,
    CreatedBy: userId ?? null,
  }));
  await ApMatchRule.bulkCreate(rows as any[]);
  return true;
}

export async function listMatchRules(userId?: number | null) {
  const seeded = await seedIfEmpty(userId);
  const rows = await ApMatchRule.findAll({
    where: { IsDeleted: false },
    order: [
      ["DisplayOrder", "ASC"],
      ["RuleId", "ASC"],
    ],
  });
  return { seeded, rules: rows.map(serializeMatchRule) };
}

async function assertKeyFree(ruleKey: string, exceptId?: number) {
  const where: Json = { RuleKey: ruleKey, IsDeleted: false };
  if (exceptId) where.RuleId = { [Op.ne]: exceptId };
  const clash = await ApMatchRule.findOne({ where });
  if (clash) {
    throw new APIError(`Rule ${ruleKey} already exists`, StatusCodeEnum.HTTP_CONFLICT);
  }
}

export async function createMatchRule(body: Json, userId?: number | null) {
  await ensureMatchRuleTable();
  const attrs = toAttributes(body || {});
  await assertKeyFree(attrs.RuleKey);
  if (attrs.DisplayOrder == null) {
    const max = (await ApMatchRule.max("DisplayOrder", { where: { IsDeleted: false } })) as number | null;
    attrs.DisplayOrder = (Number(max) || 0) + 1;
  }
  const row = await ApMatchRule.create({
    ...attrs,
    IsDeleted: false,
    CreatedAt: sequelize.literal("NOW()"),
    CreatedBy: userId ?? null,
  } as any);
  return { rule: serializeMatchRule(row) };
}

async function findRule(ruleIdRaw: unknown) {
  await ensureMatchRuleTable();
  const ruleId = Number(ruleIdRaw);
  if (!Number.isFinite(ruleId) || ruleId <= 0) throw bad("Invalid rule id");
  const row = await ApMatchRule.findOne({ where: { RuleId: ruleId, IsDeleted: false } });
  if (!row) throw new APIError("Rule not found", StatusCodeEnum.HTTP_NOT_FOUND);
  return row;
}

export async function updateMatchRule(ruleIdRaw: unknown, body: Json, userId?: number | null) {
  const row = await findRule(ruleIdRaw);
  const attrs = toAttributes(body || {}, true);
  if (attrs.RuleKey && attrs.RuleKey !== row.RuleKey) await assertKeyFree(attrs.RuleKey, Number(row.RuleId));
  const nextScope = attrs.Scope ?? row.Scope;
  const nextCats = attrs.Categories ?? row.Categories;
  if (nextScope === "CATEGORY" && (!nextCats || !nextCats.length)) {
    throw bad("Pick at least one category, or set the rule to Common");
  }
  await row.update({ ...attrs, UpdatedAt: new Date(), UpdatedBy: userId ?? null });
  return { rule: serializeMatchRule(row) };
}

export async function deleteMatchRule(ruleIdRaw: unknown, userId?: number | null) {
  const row = await findRule(ruleIdRaw);
  await row.update({ IsDeleted: true, UpdatedAt: new Date(), UpdatedBy: userId ?? null });
  return { ruleId: Number(row.RuleId), deleted: true };
}

/** Soft-delete every rule and reseed the agreed defaults. */
export async function restoreDefaultMatchRules(userId?: number | null) {
  await ensureMatchRuleTable();
  await ApMatchRule.update(
    { IsDeleted: true, UpdatedAt: new Date(), UpdatedBy: userId ?? null },
    { where: { IsDeleted: false } },
  );
  return listMatchRules(userId);
}
