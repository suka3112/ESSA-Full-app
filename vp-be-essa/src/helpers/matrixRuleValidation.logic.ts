/**
 * Compare seeded cfg.VALIDATION_RULE rows against the OCR bundle already
 * passed into invoice validation.
 *
 * Draft rules stay non-blocking. A mismatch is FAIL only when the rule is
 * already active and failure_action is BLOCK. Placeholder SAP columns and
 * unmapped handlers are not queried and are not invented.
 */
import {
  readBundleDocumentValue,
  type ClassifiedDocument,
  type MatrixFieldSpec,
} from "./matrixDocumentRead.logic";

export type MatrixSeverity = "PASS" | "WARNING" | "FAIL" | "SKIP";

export type MatrixOperand = {
  seq: number;
  role: string;
  origin: string;
  operandAlias: string;
  invoiceCategoryId: number | null;
  matchMethod: string;
  documentCode: string | null;
  dataPointCode: string | null;
  dataPointName: string | null;
  fieldLabel: string | null;
  extractionKey: string | null;
  referencePhysicalName: string | null;
  referenceColumnName: string | null;
};

export type MatrixRule = {
  ruleCode: string;
  ruleName: string;
  ruleType: string;
  ruleStage: string;
  matchLevel: string;
  targetMatchMode: string;
  minTargetsMatched: number | null;
  isActive: boolean;
  failureAction: string | null;
  handlerKey: string | null;
  toleranceMode: string | null;
  tolerancePct: number | string | null;
  toleranceAmount: number | string | null;
  toleranceDays: number | null;
  operands: MatrixOperand[];
};

export type MatrixRuleOutcome = {
  ruleCode: string;
  ruleName: string;
  severity: MatrixSeverity;
  expectedValue: string | null;
  actualValue: string | null;
  message: string;
};

const UNEVALUATED_TYPES = new Set([
  "CALCULATION",
  "AUTHENTICITY",
  "LOGICAL",
  "LOGICAL_AI",
  "UNIQUENESS",
]);

export function normalizeComparedValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function tokensCover(need: string[], have: string[]): boolean {
  const used = new Set<number>();
  for (const token of need) {
    const index = have.findIndex(
      (other, position) => !used.has(position) && (other === token || other.startsWith(token)),
    );
    if (index < 0) return false;
    used.add(index);
  }
  return true;
}

/** Case-insensitive token contains. A shorter token may prefix a longer one. */
export function tokenContains(left: string, right: string): boolean {
  const a = tokens(left);
  const b = tokens(right);
  if (a.length === 0 || b.length === 0) return false;
  return tokensCover(a, b) || tokensCover(b, a);
}

export function valuesMatch(source: string, target: string, method: string): boolean {
  const left = source.trim();
  const right = target.trim();
  if (!left || !right) return false;
  const mode = String(method || "EXACT").toUpperCase();
  if (mode === "FUZZY" || mode === "TOKEN_CONTAINS") return tokenContains(left, right);
  return normalizeComparedValue(left) === normalizeComparedValue(right);
}

/** Seeded matrix reference tables are names, not confirmed SAP lookups. */
export function isMatrixPlaceholderReference(
  physicalName: string | null | undefined,
  columnName: string | null | undefined,
): boolean {
  const table = String(physicalName || "").trim().toLowerCase();
  const column = String(columnName || "").trim().toLowerCase();
  return table.startsWith("matrix_") || /^dp_\d+_\d+$/.test(column);
}

export function operandsInScope(
  operands: MatrixOperand[],
  invoiceCategoryId: number | null,
): MatrixOperand[] {
  const scoped = operands.filter((operand) => {
    if (operand.invoiceCategoryId == null) return true;
    return invoiceCategoryId != null && operand.invoiceCategoryId === invoiceCategoryId;
  });
  const specificAliases = new Set(
    scoped
      .filter((operand) => operand.invoiceCategoryId != null)
      .map((operand) => operand.operandAlias),
  );
  return scoped
    .filter(
      (operand) => operand.invoiceCategoryId != null || !specificAliases.has(operand.operandAlias),
    )
    .sort((left, right) => left.seq - right.seq);
}

function skip(rule: MatrixRule, message = "Not applicable"): MatrixRuleOutcome {
  return {
    ruleCode: rule.ruleCode,
    ruleName: rule.ruleName,
    severity: "SKIP",
    expectedValue: null,
    actualValue: null,
    message,
  };
}

function fieldSpec(operand: MatrixOperand): MatrixFieldSpec | null {
  if (!operand.documentCode || !operand.dataPointCode) return null;
  const label = operand.fieldLabel || operand.dataPointName || operand.dataPointCode;
  return {
    documentCode: operand.documentCode,
    documentName: operand.documentCode,
    dataPointCode: operand.dataPointCode,
    dataPointName: operand.dataPointName || label,
    fieldLabel: label,
    extractionKey: operand.extractionKey,
    matrixRef: null,
  };
}

function resolveOperand(
  operand: MatrixOperand,
  documents: ClassifiedDocument[],
): string | null {
  if (operand.origin === "EAPA_DB" || operand.origin === "EXTERNAL_SERVICE") {
    return null;
  }
  if (operand.origin !== "BUNDLE_DOCUMENT") return null;
  const spec = fieldSpec(operand);
  if (!spec) return null;
  return readBundleDocumentValue(documents, spec);
}

function outcomeSeverity(rule: MatrixRule, matched: boolean): MatrixSeverity {
  if (matched) return "PASS";
  if (rule.isActive === true && rule.failureAction === "BLOCK") return "FAIL";
  return "WARNING";
}

function targetsMatch(
  mode: string,
  minTargetsMatched: number | null,
  matchedCount: number,
  resolvedCount: number,
): boolean {
  if (resolvedCount === 0) return false;
  const normalized = String(mode || "ALL").toUpperCase();
  if (normalized === "ANY") return matchedCount > 0;
  if (normalized === "AT_LEAST_N") {
    const minimum = minTargetsMatched == null ? resolvedCount : minTargetsMatched;
    return matchedCount >= minimum;
  }
  return matchedCount === resolvedCount;
}

export function evaluateMatrixRule(
  rule: MatrixRule,
  documents: ClassifiedDocument[],
  invoiceCategoryId: number | null = null,
): MatrixRuleOutcome {
  const ruleType = String(rule.ruleType || "").toUpperCase();
  if (UNEVALUATED_TYPES.has(ruleType)) return skip(rule, "Not applicable");
  // Tolerance mode is not invented, and this path does not run tolerance arithmetic.
  if (ruleType === "TOLERANCE") return skip(rule, "Not applicable");
  if (
    ruleType !== "EXACT"
    || String(rule.ruleStage || "").toUpperCase() !== "HEADER"
    || String(rule.matchLevel || "HEADER").toUpperCase() !== "HEADER"
  ) {
    return skip(rule, "Not applicable");
  }

  const operands = operandsInScope(rule.operands, invoiceCategoryId);
  const sourceOperand = operands.find((operand) => operand.role === "SOURCE");
  const sourceValue = sourceOperand ? resolveOperand(sourceOperand, documents) : null;
  if (!sourceValue) return skip(rule, "Not applicable");

  const resolvedTargets: Array<{ value: string; method: string }> = [];
  for (const operand of operands) {
    if (operand.role !== "TARGET") continue;
    if (
      operand.origin === "EAPA_DB"
      && isMatrixPlaceholderReference(operand.referencePhysicalName, operand.referenceColumnName)
    ) {
      continue;
    }
    const value = resolveOperand(operand, documents);
    if (!value) continue;
    resolvedTargets.push({ value, method: operand.matchMethod });
  }
  if (resolvedTargets.length === 0) return skip(rule, "Not applicable");

  const matchedCount = resolvedTargets.filter((target) =>
    valuesMatch(sourceValue, target.value, target.method),
  ).length;
  const matched = targetsMatch(
    rule.targetMatchMode,
    rule.minTargetsMatched,
    matchedCount,
    resolvedTargets.length,
  );
  const actualValue = resolvedTargets.map((target) => target.value).join(" | ");
  const severity = outcomeSeverity(rule, matched);
  const message = matched
    ? "Pass — compared values match."
    : severity === "FAIL"
      ? "Fail — compared values differ."
      : "Warning — compared values differ.";
  return {
    ruleCode: rule.ruleCode,
    ruleName: rule.ruleName,
    severity,
    expectedValue: sourceValue,
    actualValue,
    message,
  };
}

export function evaluateMatrixRules(
  rules: MatrixRule[],
  documents: ClassifiedDocument[],
  invoiceCategoryId: number | null = null,
): MatrixRuleOutcome[] {
  return rules.map((rule) => evaluateMatrixRule(rule, documents, invoiceCategoryId));
}

/**
 * Categories allowed to use matrix results as the only validation result.
 * Empty until master-data rules cover the BPD §9 hard blocks. The checklist
 * remains the validation result while this set is empty.
 */
export const MATRIX_ONLY_CATEGORY_CODES = new Set<string>();

export function categoryUsesMatrixOnly(categoryCode: string | null | undefined): boolean {
  const code = String(categoryCode || "").trim();
  return code.length > 0 && MATRIX_ONLY_CATEGORY_CODES.has(code);
}

/**
 * True only when the matrix produced no usable result.
 * A warning or a failure is the result. Fallback is an empty run or every rule skipped.
 */
export function matrixValidationFailed(outcomes: MatrixRuleOutcome[]): boolean {
  if (outcomes.length === 0) return true;
  return outcomes.every((outcome) => outcome.severity === "SKIP");
}

export function matrixFallbackReason(outcomes: MatrixRuleOutcome[]): "no_rules" | "all_skipped" | null {
  if (!matrixValidationFailed(outcomes)) return null;
  return outcomes.length === 0 ? "no_rules" : "all_skipped";
}

/** Portal invoice-type codes that are the same matrix category. Unlisted codes are tried as-is. */
const PORTAL_TYPE_TO_MATRIX_CATEGORY: Record<string, string> = {
  MANPOWER_SERVICES: "MANPOWER_OUTSOURCING",
  CAMP_SERVICE_AND_CATERING: "CATERING",
  CIVIL_CONTRACTOR: "CIVIL_WORKS_CONSTRUCTION",
};

export function matrixCategoryCandidates(
  ...values: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  const push = (value: string) => {
    const text = value.trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };
  for (const value of values) {
    const code = String(value || "").trim();
    if (!code) continue;
    const key = code.toUpperCase().replace(/[\s-]+/g, "_");
    const mapped = PORTAL_TYPE_TO_MATRIX_CATEGORY[key];
    if (mapped) push(mapped);
    push(code);
  }
  return candidates;
}

function definedFields(
  header: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (!header || typeof header !== "object") return fields;
  for (const [key, value] of Object.entries(header)) {
    if (value == null || value === "") continue;
    fields[key] = value;
  }
  return fields;
}

function invoiceDocument(input: {
  header?: Record<string, unknown> | null;
  lineItems?: Array<Record<string, unknown>> | null;
}): ClassifiedDocument {
  return {
    type: "invoice",
    fields: definedFields(input.header),
    entries: {
      invoiceLineItems: Array.isArray(input.lineItems) ? input.lineItems : [],
    },
  };
}

function isInvoiceType(type: string): boolean {
  const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug === "invoice";
}

/** Classified OCR documents stored on the upload snapshot. Header lives on the document or under data. */
export function classifiedDocumentsFromBundle(
  documents: Array<Record<string, unknown>> | null | undefined,
): ClassifiedDocument[] {
  const found: ClassifiedDocument[] = [];
  for (const doc of documents || []) {
    if (!doc || typeof doc !== "object") continue;
    const nested =
      doc.data && typeof doc.data === "object" && !Array.isArray(doc.data)
        ? (doc.data as Record<string, unknown>)
        : doc;
    const type = String(
      doc.type || doc.documentType || nested.documentType || nested.type || "",
    ).trim();
    if (!type) continue;
    const header =
      (nested.header && typeof nested.header === "object" ? nested.header : null)
      || (doc.header && typeof doc.header === "object" ? doc.header : null)
      || (nested.fields && typeof nested.fields === "object" ? nested.fields : null)
      || (doc.fields && typeof doc.fields === "object" ? doc.fields : null);
    const lineItems = Array.isArray(nested.lineItems)
      ? nested.lineItems
      : Array.isArray(doc.lineItems)
        ? doc.lineItems
        : [];
    found.push({
      type,
      fields: definedFields(header as Record<string, unknown> | null),
      entries: { lineItems: lineItems as Array<Record<string, unknown>> },
    });
  }
  return found;
}

/** Invoice header, supporting-doc headers, and the classified bundle when the snapshot has one. */
export function classifiedDocumentsFromValidationInput(input: {
  header?: Record<string, unknown> | null;
  lineItems?: Array<Record<string, unknown>> | null;
  supportingDocs?: Record<
    string,
    {
      header?: Record<string, unknown> | null;
      lineItems?: Array<Record<string, unknown>> | null;
    }
  > | null;
  bundleDocuments?: Array<Record<string, unknown>> | null;
}): ClassifiedDocument[] {
  const bundled = classifiedDocumentsFromBundle(input.bundleDocuments);
  const invoice = invoiceDocument(input);
  const documents: ClassifiedDocument[] = [];
  const bundleHasInvoice = bundled.some((doc) => isInvoiceType(String(doc.type || "")));
  if (!bundleHasInvoice) documents.push(invoice);
  for (const doc of bundled) {
    if (!isInvoiceType(String(doc.type || ""))) {
      documents.push(doc);
      continue;
    }
    documents.push({
      ...doc,
      fields: { ...invoice.fields, ...(doc.fields || {}) },
      entries: {
        invoiceLineItems: Array.isArray(input.lineItems) ? input.lineItems : [],
        ...(doc.entries || {}),
      },
    });
  }
  if (documents.length === 0) documents.push(invoice);
  const supporting = input.supportingDocs || {};
  for (const [type, doc] of Object.entries(supporting)) {
    const key = String(type || "").trim();
    if (!key) continue;
    documents.push({
      type: key,
      fields: definedFields(doc?.header),
      entries: {
        lineItems: Array.isArray(doc?.lineItems) ? doc.lineItems : [],
      },
    });
  }
  return documents;
}
