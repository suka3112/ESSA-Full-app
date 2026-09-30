import { getValidationConfig } from "../config/loadConfig.js";

function buildRule(ruleCode, ruleName, severity, message, extra = {}) {
  return {
    ruleCode,
    ruleName,
    severity,
    message,
    expectedValue: extra.expectedValue ?? null,
    actualValue: extra.actualValue ?? null,
    ...extra,
  };
}

/**
 * @param {Array<object>} documents
 * @param {string} [requestedMode]
 * @returns {"skip"|"generic"}
 */
export function resolveValidationMode(documents, requestedMode) {
  void documents;
  const normalized = String(requestedMode || getValidationConfig().defaultMode || "generic")
    .trim()
    .toLowerCase();

  if (normalized === "false" || normalized === "skip" || normalized === "none") {
    return "skip";
  }

  return "generic";
}

function validateGeneric(documents) {
  const extracted = documents.filter((d) => d.status === "extracted");
  const failed = documents.filter((d) => d.status !== "extracted");
  const categories = [...new Set(documents.map((d) => d.documentType))];

  const results = [
    buildRule(
      "EXTRACTION_COUNT",
      "Documents extracted",
      extracted.length > 0 ? "PASS" : "FAIL",
      extracted.length > 0
        ? `Extracted ${extracted.length} document(s) across ${categories.length} categor${categories.length === 1 ? "y" : "ies"}.`
        : "No documents were successfully extracted.",
      {
        expectedValue: ">= 1",
        actualValue: String(extracted.length),
      },
    ),
    buildRule(
      "CATEGORY_COVERAGE",
      "Detected categories",
      categories.length > 0 ? "PASS" : "WARN",
      categories.length > 0
        ? `Categories: ${categories.join(", ")}`
        : "No categories were detected.",
      {
        expectedValue: "At least one category",
        actualValue: categories.join(", ") || "—",
      },
    ),
  ];

  if (failed.length > 0) {
    results.push(
      buildRule(
        "EXTRACTION_FAILURES",
        "Failed extractions",
        "WARN",
        `${failed.length} categor${failed.length === 1 ? "y" : "ies"} failed extraction.`,
        {
          expectedValue: "0 failures",
          actualValue: failed.map((d) => d.documentType).join(", "),
        },
      ),
    );
  }

  const failCount = results.filter((r) => r.severity === "FAIL").length;
  const warnCount = results.filter((r) => r.severity === "WARN").length;
  const overallStatus = failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS";

  return {
    mode: "generic",
    overallStatus,
    summary:
      overallStatus === "PASS"
        ? "Validation passed."
        : overallStatus === "WARN"
          ? "Validation completed with warnings."
          : "Validation failed.",
    results,
    categories,
    presentDocuments: extracted.map((d) => d.documentType),
  };
}

/**
 * @param {Array<object>} documents
 * @param {{ mode?: string }} [options]
 * @returns {object|null}
 */
export function validate(documents, options = {}) {
  const mode = resolveValidationMode(documents, options.mode);
  if (mode === "skip") return null;
  return validateGeneric(documents);
}

