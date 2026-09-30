/**
 * Separate SAP field-mapping validator (logs only).
 * Compares OCR-extracted values to an editable JSON mock keyed by CapturedFieldCode.
 * Does NOT mutate the 12-rule InvoiceValidationResult used by the FE checklist.
 */
import fs from "fs";
import path from "path";
import logger from "../utils/logger";
import { ApSapFieldMapping } from "../models/apSapFieldMapping";
import {
  loadActiveInvoiceConfigByTypeCode,
  loadActiveInvoiceConfigForWorkflow,
} from "./invoiceConfig.service";
import { fieldNameCandidatesForCapturedCode } from "./sapCapturedFieldMap";
import { normalizeBankAccountNumber } from "./apInvoiceOcr.normalize";

type MappingSeverity = "PASS" | "WARNING" | "FAIL" | "SKIP";

type MockRecord = Record<string, string | number | string[] | null | undefined>;

type SapMappingMockFile = {
  invoiceTypeCode?: string;
  failOnMissingExtract?: boolean;
  recordsByPo?: Record<string, MockRecord>;
};

type MappingCheckResult = {
  capturedFieldCode: string;
  sapFieldName: string;
  validationType: string;
  severity: MappingSeverity;
  expected: string | null;
  actual: string | null;
  message: string;
  mappingId: number | null;
  isMandatory: boolean;
};

export type SapMappingValidationSummary = {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
  skipped: number;
};

/** Result of a mapping run — null when the check did not apply (disabled / no mock / etc.). */
export type SapMappingValidationOutcome = {
  enabled: boolean;
  ran: boolean;
  summary: SapMappingValidationSummary;
  checks: MappingCheckResult[];
  hasFailOrWarning: boolean;
  failCount: number;
  warningCount: number;
};

type ExtractedHeaderLike = Record<string, string | null | undefined>;

/** Minimal payload shape — avoids circular import with apInvoiceValidation.service. */
export type SapMappingValidatePayload = {
  header?: ExtractedHeaderLike;
  supportingDocs?: Record<string, { header?: ExtractedHeaderLike }>;
  documentId?: number;
  invoiceTypeCode?: string;
  workflow?: string;
};

const DEFAULT_MOCK_RELATIVE = path.join(
  "data",
  "validation-mocks",
  "sap-field-mapping.json",
);

let cachedMtimeMs: number | null = null;
let cachedPath: string | null = null;
let cachedFile: SapMappingMockFile | null = null;

function isEnabled(): boolean {
  const v = String(process.env.AP_SAP_MAPPING_MOCK_ENABLED || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function resolveMockPath(): string {
  const configured = String(process.env.AP_SAP_MAPPING_MOCK_PATH || "").trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), DEFAULT_MOCK_RELATIVE);
}

function loadMockFile(): SapMappingMockFile | null {
  const filePath = resolveMockPath();
  try {
    const stat = fs.statSync(filePath);
    if (
      cachedFile &&
      cachedPath === filePath &&
      cachedMtimeMs === stat.mtimeMs
    ) {
      return cachedFile;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as SapMappingMockFile;
    cachedFile = parsed && typeof parsed === "object" ? parsed : {};
    cachedPath = filePath;
    cachedMtimeMs = stat.mtimeMs;
    return cachedFile;
  } catch (error) {
    logger.warn("[SAP_MAPPING] Failed to load mock JSON", {
      path: filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function normalizePoDigits(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\D/g, "");
  return digits.length ? digits : null;
}

function normalizeName(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(PT|CV|TBK|PERSERO|UD)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[^0-9.,-]/g, "");
  if (!s || s === "-" || s === "." || s === ",") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length !== 3) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (!(parts.length === 2 && parts[1].length !== 3)) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function stringifyValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  const s = String(value).trim();
  return s.length ? s : null;
}

function isPlaceholder(value: unknown): boolean {
  const s = String(value ?? "").trim().toUpperCase();
  return !s || s === "FILL_FROM_OCR" || s === "TODO" || s === "PLACEHOLDER";
}

function getHeaderValue(
  header: ExtractedHeaderLike,
  keys: string[],
): string | null {
  for (const key of keys) {
    const raw = header[key];
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
      return String(raw);
    }
  }
  return null;
}

function resolveExtractedValue(
  payload: SapMappingValidatePayload,
  capturedFieldCode: string,
): string | null {
  const code = String(capturedFieldCode || "").trim().toUpperCase();
  const header = (payload.header || {}) as ExtractedHeaderLike;
  const candidates = fieldNameCandidatesForCapturedCode(code);

  let value = getHeaderValue(header, candidates);

  if (code === "SES_NO" && !value) {
    const sesDoc = payload.supportingDocs?.ses;
    const sesHeader = (sesDoc?.header || {}) as ExtractedHeaderLike;
    value = getHeaderValue(sesHeader, candidates);
  }

  return value;
}

function normalizeValidationType(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function mismatchSeverity(isMandatory: boolean): MappingSeverity {
  return isMandatory ? "FAIL" : "WARNING";
}

function compareValues(params: {
  capturedFieldCode: string;
  validationType: string;
  toleranceType: string;
  toleranceValue: number | null;
  toleranceMin: number | null;
  toleranceMax: number | null;
  expected: unknown;
  actual: string | null;
  isMandatory: boolean;
}): { ok: boolean; message: string } {
  const {
    capturedFieldCode,
    validationType,
    toleranceType,
    toleranceValue,
    toleranceMin,
    toleranceMax,
    expected,
    actual,
    isMandatory,
  } = params;

  const type = normalizeValidationType(validationType);
  const code = capturedFieldCode.toUpperCase();

  if (type === "LIST_MATCH") {
    if (Array.isArray(expected)) {
      const actualNorm = String(actual ?? "").trim().toUpperCase();
      const ok = expected.some(
        (item) => String(item).trim().toUpperCase() === actualNorm,
      );
      return {
        ok,
        message: ok
          ? "Value is in the allowed SAP list."
          : `Value is not in the allowed list (${expected.join(", ")}).`,
      };
    }
    const tol = String(toleranceType || "").toUpperCase();
    if (tol === "RANGE" || tol.includes("RANGE")) {
      const n = parseAmount(actual);
      if (n === null || toleranceMin == null || toleranceMax == null) {
        return {
          ok: false,
          message: "Cannot evaluate LIST_MATCH range — missing bounds or actual.",
        };
      }
      const ok = n >= Number(toleranceMin) && n <= Number(toleranceMax);
      return {
        ok,
        message: ok
          ? `Value is within range ${toleranceMin}–${toleranceMax}.`
          : `Value ${n} is outside range ${toleranceMin}–${toleranceMax}.`,
      };
    }
    // Fall through to exact string compare when expected is a single string
  }

  if (type === "AMOUNT_MATCH") {
    const expectedAmt = parseAmount(expected);
    const actualAmt = parseAmount(actual);
    if (expectedAmt === null || actualAmt === null) {
      return {
        ok: false,
        message: "Cannot compare amounts — missing or unparseable value.",
      };
    }
    const pctTol =
      String(toleranceType || "").toUpperCase().includes("PERCENT") ||
      String(toleranceType || "").toUpperCase().includes("%")
        ? Number(toleranceValue ?? 0)
        : Number(toleranceValue ?? 0);
    const allowed =
      expectedAmt === 0
        ? Math.abs(actualAmt) <= 0.0001
        : (Math.abs(actualAmt - expectedAmt) / Math.abs(expectedAmt)) * 100 <=
          pctTol;
    return {
      ok: allowed,
      message: allowed
        ? `Amount within ${pctTol}% tolerance.`
        : `Amount outside ${pctTol}% tolerance (expected ${expectedAmt}, actual ${actualAmt}).`,
    };
  }

  if (type === "DATE_MATCH") {
    const expectedDate = parseDate(expected);
    const actualDate = parseDate(actual);
    if (!expectedDate || !actualDate) {
      return {
        ok: false,
        message: "Cannot compare dates — missing or unparseable value.",
      };
    }
    const dayTol = Number(toleranceValue ?? 0);
    const diff = daysBetween(expectedDate, actualDate);
    const ok = diff <= dayTol;
    return {
      ok,
      message: ok
        ? `Date within ±${dayTol} day(s).`
        : `Date differs by ${diff} day(s) (tolerance ±${dayTol}).`,
    };
  }

  // EXACT_MATCH / CODE_MATCH / default
  if (code === "BANK_ACCOUNT") {
    const a = normalizeBankAccountNumber(actual);
    const b = normalizeBankAccountNumber(expected);
    const ok = Boolean(a && b && a === b);
    return {
      ok,
      message: ok ? "Bank account matches." : "Bank account does not match.",
    };
  }

  if (code === "PO_NUMBER") {
    const a = normalizePoDigits(actual);
    const b = normalizePoDigits(expected);
    const ok = Boolean(a && b && a === b);
    return {
      ok,
      message: ok ? "PO number matches." : "PO number does not match.",
    };
  }

  if (code === "VENDOR_NAME" || type === "EXACT_MATCH") {
    if (code === "VENDOR_NAME") {
      const ok = normalizeName(actual) === normalizeName(expected);
      return {
        ok,
        message: ok ? "Vendor name matches." : "Vendor name does not match.",
      };
    }
  }

  if (type === "CODE_MATCH" || code.endsWith("_CODE") || code === "GL_ACCOUNT" || code === "BANK_KEY" || code === "COMPANY_CODE" || code === "COST_CENTER" || code === "TAX_CODE" || code === "VENDOR_CODE") {
    const a = String(actual ?? "").trim().toUpperCase();
    const b = String(expected ?? "").trim().toUpperCase();
    const ok = a.length > 0 && a === b;
    return {
      ok,
      message: ok ? "Code matches." : "Code does not match.",
    };
  }

  const a = String(actual ?? "").trim();
  const b = String(expected ?? "").trim();
  const ok = a.length > 0 && a.toUpperCase() === b.toUpperCase();
  return {
    ok,
    message: ok
      ? "Values match."
      : isMandatory
        ? "Values do not match."
        : "Values do not match (optional field).",
  };
}

function evaluateMapping(
  mapping: ApSapFieldMapping,
  expected: unknown,
  actual: string | null,
  failOnMissingExtract: boolean,
): MappingCheckResult {
  const capturedFieldCode = String(mapping.CapturedFieldCode || "").trim();
  const sapFieldName = String(mapping.SapFieldName || "");
  const isMandatory = Boolean(mapping.IsMandatory);
  const base = {
    capturedFieldCode,
    sapFieldName,
    validationType: String(mapping.ValidationType || ""),
    mappingId: mapping.MappingId ?? null,
    isMandatory,
  };

  if (expected === undefined || isPlaceholder(expected)) {
    return {
      ...base,
      severity: "SKIP",
      expected: stringifyValue(expected),
      actual,
      message: "No SAP mock value configured (FILL_FROM_OCR / missing key).",
    };
  }

  if (actual === null || String(actual).trim() === "") {
    if (failOnMissingExtract && isMandatory) {
      return {
        ...base,
        severity: "FAIL",
        expected: stringifyValue(expected),
        actual: null,
        message: "Mandatory field — no extracted value.",
      };
    }
    return {
      ...base,
      severity: "SKIP",
      expected: stringifyValue(expected),
      actual: null,
      message: "No extracted value.",
    };
  }

  const { ok, message } = compareValues({
    capturedFieldCode,
    validationType: String(mapping.ValidationType || "EXACT_MATCH"),
    toleranceType: String(mapping.ToleranceType || "EXACT"),
    toleranceValue:
      mapping.ToleranceValue != null ? Number(mapping.ToleranceValue) : null,
    toleranceMin:
      mapping.ToleranceMin != null ? Number(mapping.ToleranceMin) : null,
    toleranceMax:
      mapping.ToleranceMax != null ? Number(mapping.ToleranceMax) : null,
    expected,
    actual,
    isMandatory,
  });

  return {
    ...base,
    severity: ok ? "PASS" : mismatchSeverity(isMandatory),
    expected: stringifyValue(expected),
    actual,
    message,
  };
}

function buildOutcome(
  checks: MappingCheckResult[],
): SapMappingValidationOutcome {
  const summary: SapMappingValidationSummary = {
    total: checks.length,
    passed: checks.filter((c) => c.severity === "PASS").length,
    warnings: checks.filter((c) => c.severity === "WARNING").length,
    failed: checks.filter((c) => c.severity === "FAIL").length,
    skipped: checks.filter((c) => c.severity === "SKIP").length,
  };
  return {
    enabled: true,
    ran: true,
    summary,
    checks,
    hasFailOrWarning: summary.failed > 0 || summary.warnings > 0,
    failCount: summary.failed,
    warningCount: summary.warnings,
  };
}

class SapFieldMappingValidationService {
  /**
   * Run SAP mapping checks against the editable JSON mock and log results.
   * Returns null when the check does not apply (disabled / no mock / no mappings / no PO record).
   */
  async validateAndLog(
    payload: SapMappingValidatePayload,
  ): Promise<SapMappingValidationOutcome | null> {
    if (!isEnabled()) return null;

    try {
      const mock = loadMockFile();
      if (!mock) return null;

      const invoiceTypeCode =
        payload.invoiceTypeCode ||
        mock.invoiceTypeCode ||
        undefined;

      let activeConfig = null;
      try {
        if (invoiceTypeCode) {
          activeConfig = await loadActiveInvoiceConfigByTypeCode(invoiceTypeCode);
        } else {
          activeConfig = await loadActiveInvoiceConfigForWorkflow(
            payload.workflow || "PO",
          );
        }
      } catch (error) {
        logger.warn("[SAP_MAPPING] Failed to load invoice config", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }

      const mappings = (activeConfig?.sapMappings || []).filter(
        (m) => String(m.Status || "").toLowerCase() === "active" && !m.IsDeleted,
      );

      if (!mappings.length) {
        logger.info("[SAP_MAPPING]", {
          phase: "no_active_mappings",
          invoiceTypeCode: invoiceTypeCode || activeConfig?.invoiceTypeCode || null,
          documentId: payload.documentId ?? null,
        });
        return null;
      }

      const poNumber =
        normalizePoDigits(payload.header?.poNumber) ||
        normalizePoDigits(payload.header?.poNo);
      const recordsByPo = mock.recordsByPo || {};
      const record =
        (poNumber && recordsByPo[poNumber]) ||
        (poNumber &&
          Object.entries(recordsByPo).find(
            ([key]) => normalizePoDigits(key) === poNumber,
          )?.[1]) ||
        null;

      if (!record) {
        logger.info("[SAP_MAPPING]", {
          phase: "no_mock_record_for_po",
          poNumber,
          documentId: payload.documentId ?? null,
          availablePos: Object.keys(recordsByPo),
        });
        return null;
      }

      const failOnMissingExtract = Boolean(mock.failOnMissingExtract);

      const extractedSnapshot: Record<string, string | null> = {};
      for (const mapping of mappings) {
        const code = String(mapping.CapturedFieldCode || "").trim().toUpperCase();
        if (!code) continue;
        extractedSnapshot[code] = resolveExtractedValue(payload, code);
      }

      logger.info("[SAP_MAPPING] extractedSnapshot", {
        poNumber,
        documentId: payload.documentId ?? null,
        invoiceTypeCode: activeConfig?.invoiceTypeCode ?? invoiceTypeCode ?? null,
        configVersionId: activeConfig?.configVersionId ?? null,
        extractedSnapshot,
      });

      const checks: MappingCheckResult[] = mappings.map((mapping) => {
        const code = String(mapping.CapturedFieldCode || "").trim().toUpperCase();
        const expected = record[code];
        const actual = resolveExtractedValue(payload, code);
        return evaluateMapping(mapping, expected, actual, failOnMissingExtract);
      });

      for (const check of checks) {
        logger.info("[SAP_MAPPING] field", {
          capturedFieldCode: check.capturedFieldCode,
          sapFieldName: check.sapFieldName,
          validationType: check.validationType,
          severity: check.severity,
          expected: check.expected,
          actual: check.actual,
          message: check.message,
          mappingId: check.mappingId,
          isMandatory: check.isMandatory,
        });
      }

      const outcome = buildOutcome(checks);

      logger.info("[SAP_MAPPING] summary", {
        poNumber,
        documentId: payload.documentId ?? null,
        invoiceTypeCode: activeConfig?.invoiceTypeCode ?? invoiceTypeCode ?? null,
        configVersionId: activeConfig?.configVersionId ?? null,
        mockPath: resolveMockPath(),
        summary: outcome.summary,
        hasFailOrWarning: outcome.hasFailOrWarning,
        failedCodes: checks
          .filter((c) => c.severity === "FAIL" || c.severity === "WARNING")
          .map((c) => `${c.capturedFieldCode}:${c.severity}`),
      });

      return outcome;
    } catch (error) {
      logger.error("[SAP_MAPPING] Unexpected error during mapping validation", error);
      return null;
    }
  }
}

export default new SapFieldMappingValidationService();
