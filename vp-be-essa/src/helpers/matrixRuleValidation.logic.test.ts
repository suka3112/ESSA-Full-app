import assert from "assert";
import {
  classifiedDocumentsFromBundle,
  evaluateMatrixRule,
  matrixCategoryCandidates,
  categoryUsesMatrixOnly,
  matrixFallbackReason,
  matrixValidationFailed,
  type MatrixOperand,
  type MatrixRule,
  type MatrixRuleOutcome,
} from "./matrixRuleValidation.logic";
import type { ClassifiedDocument } from "./matrixDocumentRead.logic";

function operand(partial: Partial<MatrixOperand> & Pick<MatrixOperand, "role" | "origin">): MatrixOperand {
  return {
    seq: partial.role === "SOURCE" ? 1 : 2,
    operandAlias: partial.role === "SOURCE" ? "src" : "tgt",
    invoiceCategoryId: null,
    matchMethod: "EXACT",
    documentCode: null,
    dataPointCode: null,
    dataPointName: null,
    fieldLabel: null,
    extractionKey: null,
    referencePhysicalName: null,
    referenceColumnName: null,
    ...partial,
  };
}

function rule(partial: Partial<MatrixRule> & Pick<MatrixRule, "ruleCode" | "ruleType">): MatrixRule {
  return {
    ruleName: partial.ruleCode,
    ruleStage: "HEADER",
    matchLevel: "HEADER",
    targetMatchMode: "ALL",
    minTargetsMatched: null,
    isActive: false,
    failureAction: null,
    handlerKey: null,
    toleranceMode: null,
    tolerancePct: null,
    toleranceAmount: null,
    toleranceDays: null,
    operands: [],
    ...partial,
  };
}

const invoiceAndFaktur = (invoiceVendor: string, fakturVendor: string): ClassifiedDocument[] => [
  { type: "invoice", fields: { vendorName: invoiceVendor } },
  { type: "faktur_pajak", fields: { vendorName: fakturVendor } },
];

const vendorOperands = [
  operand({
    role: "SOURCE",
    origin: "BUNDLE_DOCUMENT",
    documentCode: "INVOICE",
    dataPointCode: "DP_1_01",
    dataPointName: "Vendor name",
    fieldLabel: "Vendor name",
  }),
  operand({
    seq: 2,
    role: "TARGET",
    origin: "BUNDLE_DOCUMENT",
    operandAlias: "tgt_fp",
    documentCode: "FAKTUR_PAJAK",
    dataPointCode: "DP_1_15",
    dataPointName: "Vendor name",
    fieldLabel: "Vendor name",
  }),
];

const matched = evaluateMatrixRule(
  rule({ ruleCode: "MX-1-01", ruleType: "EXACT", operands: vendorOperands }),
  invoiceAndFaktur("PT Example", "PT Example"),
);
assert.strictEqual(matched.severity, "PASS");
assert.strictEqual(matched.expectedValue, "PT Example");
assert.strictEqual(matched.actualValue, "PT Example");

const draftMismatch = evaluateMatrixRule(
  rule({ ruleCode: "MX-1-01", ruleType: "EXACT", isActive: false, operands: vendorOperands }),
  invoiceAndFaktur("PT Example", "Other Vendor"),
);
assert.strictEqual(draftMismatch.severity, "WARNING");
assert.notStrictEqual(draftMismatch.severity, "FAIL");
assert.strictEqual(draftMismatch.expectedValue, "PT Example");
assert.strictEqual(draftMismatch.actualValue, "Other Vendor");

const blocking = evaluateMatrixRule(
  rule({
    ruleCode: "MX-1-01",
    ruleType: "EXACT",
    isActive: true,
    failureAction: "BLOCK",
    operands: vendorOperands,
  }),
  invoiceAndFaktur("PT Example", "Other Vendor"),
);
assert.strictEqual(blocking.severity, "FAIL");

const placeholder = evaluateMatrixRule(
  rule({
    ruleCode: "MX-1-01",
    ruleType: "EXACT",
    operands: [
      vendorOperands[0],
      operand({
        seq: 2,
        role: "TARGET",
        origin: "EAPA_DB",
        operandAlias: "tgt_po",
        referencePhysicalName: "matrix_po",
        referenceColumnName: "dp_1_01",
      }),
    ],
  }),
  invoiceAndFaktur("PT Example", "PT Example"),
);
assert.strictEqual(placeholder.severity, "SKIP");
assert.match(placeholder.message, /not applicable/i);

const withResolvedTarget = evaluateMatrixRule(
  rule({
    ruleCode: "MX-1-01",
    ruleType: "EXACT",
    targetMatchMode: "ALL",
    operands: [
      ...vendorOperands,
      operand({
        seq: 3,
        role: "TARGET",
        origin: "EAPA_DB",
        operandAlias: "tgt_po",
        referencePhysicalName: "matrix_po",
        referenceColumnName: "dp_1_01",
      }),
    ],
  }),
  invoiceAndFaktur("PT Example", "pt example"),
);
assert.strictEqual(withResolvedTarget.severity, "PASS");

const fuzzy = evaluateMatrixRule(
  rule({
    ruleCode: "MX-1-01",
    ruleType: "EXACT",
    operands: [
      vendorOperands[0],
      operand({
        seq: 2,
        role: "TARGET",
        origin: "BUNDLE_DOCUMENT",
        operandAlias: "tgt_fp",
        matchMethod: "FUZZY",
        documentCode: "FAKTUR_PAJAK",
        dataPointCode: "DP_1_15",
        dataPointName: "Vendor name",
        fieldLabel: "Vendor name",
      }),
    ],
  }),
  [
    { type: "invoice", fields: { vendorName: "Nitish Sharma" } },
    { type: "faktur_pajak", fields: { vendorName: "Nitish S" } },
  ],
);
assert.strictEqual(fuzzy.severity, "PASS");

const calculation = evaluateMatrixRule(
  rule({
    ruleCode: "MX-1-20",
    ruleType: "CALCULATION",
    handlerKey: "unmapped",
    operands: vendorOperands,
  }),
  invoiceAndFaktur("PT Example", "PT Example"),
);
assert.strictEqual(calculation.severity, "SKIP");
assert.match(calculation.message, /not applicable/i);

const outcome = (
  severity: MatrixRuleOutcome["severity"],
): MatrixRuleOutcome => ({
  ruleCode: "MX-1-01",
  ruleName: "Vendor name",
  severity,
  expectedValue: null,
  actualValue: null,
  message: severity === "SKIP" ? "Not applicable" : severity,
});

assert.strictEqual(matrixValidationFailed([]), true);
assert.strictEqual(
  matrixValidationFailed([outcome("PASS"), outcome("SKIP")]),
  false,
);
assert.strictEqual(matrixValidationFailed([outcome("WARNING")]), false);
assert.strictEqual(matrixValidationFailed([outcome("FAIL")]), false);
assert.strictEqual(matrixValidationFailed([draftMismatch]), false);
assert.strictEqual(matrixValidationFailed([outcome("PASS"), outcome("WARNING")]), false);
assert.strictEqual(matrixValidationFailed([matched, placeholder]), false);
assert.strictEqual(matrixValidationFailed([outcome("SKIP"), placeholder]), true);
assert.strictEqual(matrixFallbackReason([]), "no_rules");
assert.strictEqual(matrixFallbackReason([outcome("SKIP")]), "all_skipped");
assert.strictEqual(matrixFallbackReason([outcome("FAIL")]), null);
assert.strictEqual(categoryUsesMatrixOnly("MANPOWER_OUTSOURCING"), false);
assert.strictEqual(categoryUsesMatrixOnly("CIVIL_WORKS_CONSTRUCTION"), false);
assert.strictEqual(categoryUsesMatrixOnly("CATERING"), false);
assert.strictEqual(categoryUsesMatrixOnly("TRAVEL_NON_PO"), false);
assert.strictEqual(categoryUsesMatrixOnly("HOTEL_NON_PO"), false);
assert.strictEqual(categoryUsesMatrixOnly("MATERIAL"), false);
assert.strictEqual(categoryUsesMatrixOnly(null), false);

assert.deepStrictEqual(
  matrixCategoryCandidates("MANPOWER_SERVICES"),
  ["MANPOWER_OUTSOURCING", "MANPOWER_SERVICES"],
);
assert.deepStrictEqual(matrixCategoryCandidates("CATERING"), ["CATERING"]);
assert.deepStrictEqual(matrixCategoryCandidates("NON_PO"), ["NON_PO"]);

const bundled = classifiedDocumentsFromBundle([
  {
    documentType: "faktur_pajak",
    data: { header: { vendorName: "PT Example" } },
  },
]);
assert.strictEqual(bundled[0].type, "faktur_pajak");
assert.strictEqual(bundled[0].fields?.vendorName, "PT Example");

console.log("matrixRuleValidation.logic.test.ts passed");
