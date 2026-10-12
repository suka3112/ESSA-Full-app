/**
 * Server evaluation for active N-way rules.
 *
 * Rules are the active cfg."VALIDATION_RULE" rows (same list as the screen).
 * Only EXACT and LOGICAL rules whose anchor and every Must-match target
 * already name a field. Drafts are not loaded. A value that cannot be read
 * is not a pass and does not block the invoice. A compared mismatch does.
 * Logical differences are not passed by a similarity score: they stay
 * unevaluated until Azure OpenAI is called for that rule.
 */
import logger from "../utils/logger";
import { loadExceptionCatalogue, resolveRuleExceptions } from "./exceptionCode.service";
import { loadCfgEvalRules, type CfgEvalRule } from "./matrixScreenRules.service";

export type MatchRuleSeverity = "PASS" | "FAIL" | "BLOCKED" | "SKIP";

export interface MatchRuleCheckResult {
  ruleKey: string;
  ruleName: string;
  severity: MatchRuleSeverity;
  expectedValue: string | null;
  actualValue: string | null;
  message: string;
  exceptionCode: string | null;
}

interface TargetRef {
  doc?: string;
  requirement?: string;
  field?: string;
}

interface ChecklistRule {
  ruleCode: string;
  expectedValue?: string | null;
  actualValue?: string | null;
}

export interface MatchRuleEvaluationInput {
  invoiceTypeCode?: string | null;
  header?: Record<string, unknown> | null;
  supportingDocs?: Record<string, { header?: Record<string, unknown> | null }> | null;
  checklist: ChecklistRule[];
}

const INVOICE_TYPE_CATEGORY: Record<string, string> = {
  MATERIAL_IMPORT: "MATERIAL",
  MATERIAL_LOCAL: "MATERIAL",
  MANPOWER_SERVICES: "MANPOWER",
  CAMP_SERVICE_AND_CATERING: "CATERING",
  CIVIL_CONTRACTOR: "CIVIL",
  HOUSEKEEPING: "HOUSEKEEPING",
  RENTAL_EQUIPMENT: "RENTAL_EQUIPMENT",
  LOGISTICS: "DOMESTIC_LOGISTICS",
  NON_PO: "TRAVEL",
};

const DOC_TYPES: Record<string, string[]> = {
  INVOICE: ["invoice"],
  FAKTUR_PAJAK: ["tax_invoice"],
  PO: ["po", "po_appendix"],
  BAST: ["berita_acara"],
  TIMESHEET: ["timesheet"],
  MANPOWER_SUMMARY: ["manhour_summary"],
  GRN_SES: ["ses"],
};

const HEADER_FIELDS: Record<string, string[]> = {
  vendor_name: ["vendorName", "vendor_name", "supplierName"],
  bank_account: ["bankAccount", "bankAccountNumber", "accountNumber"],
  invoice_date: ["invoiceDate"],
  po_number: ["poNumber", "poNo"],
  invoice_number: ["invoiceNumber", "invoiceNo"],
  unit_rate: ["unitRate", "unitPrice", "manhourUnitRate"],
  invoice_amount: ["totalAmount", "invoiceAmount", "grandTotal"],
  quantity: ["quantity", "totalQuantity"],
  company_name: ["buyerName", "companyName", "customerName"],
  npwp: ["npwp", "vendorNpwp", "taxId"],
  fp_value: ["taxAmount", "vatAmount", "ppn"],
  fp_date: ["taxInvoiceDate", "fakturDate"],
  currency: ["currency"],
  dpp: ["subtotal", "dpp"],
  item_description: ["itemDescription", "description"],
  payment_terms: ["paymentTerms"],
};

const NAME_KEYS = new Set(["vendor_name", "company_name", "item_description", "payment_terms"]);
const AMOUNT_KEYS = new Set(["invoice_amount", "unit_rate", "quantity", "fp_value", "dpp"]);
const DATE_KEYS = new Set(["invoice_date", "fp_date"]);

const text = (value: unknown): string | null => {
  if (value == null) return null;
  const s = String(value).trim();
  return s && s !== "—" ? s : null;
};

const normName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(pt|cv|tbk|persero|ltd|limited|inc|co|corp)\b\.?/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normId = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Indonesian or plain amounts as integer cents. Not a floating comparison. */
function toCents(value: string): bigint | null {
  let s = value.replace(/[^0-9.,-]/g, "");
  if (!/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1 && (s.length - lastDot - 1 === 3 || (s.match(/\./g) || []).length > 1)) {
    s = s.replace(/\./g, "");
  }
  const negative = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  if (!/^\d+$/.test(whole || "")) return null;
  const cents = `${whole}${frac.padEnd(2, "0").slice(0, 2)}`;
  return BigInt(negative ? `-${cents}` : cents);
}

function sameValue(dataKey: string, left: string, right: string): boolean {
  if (AMOUNT_KEYS.has(dataKey)) {
    const a = toCents(left);
    const b = toCents(right);
    return a !== null && b !== null && a === b;
  }
  if (DATE_KEYS.has(dataKey)) return left.slice(0, 10) === right.slice(0, 10);
  if (NAME_KEYS.has(dataKey)) return normName(left) === normName(right) && normName(left).length > 0;
  return normId(left) === normId(right) && normId(left).length > 0;
}

function readHeader(header: Record<string, unknown> | null | undefined, dataKey: string): string | null {
  if (!header) return null;
  for (const key of HEADER_FIELDS[dataKey] || []) {
    const value = text(header[key]);
    if (value) return value;
  }
  return null;
}

function checklist(rules: ChecklistRule[], code: string): ChecklistRule | undefined {
  return rules.find((rule) => rule.ruleCode === code);
}

function readOperand(
  doc: string,
  dataKey: string,
  input: MatchRuleEvaluationInput,
): string | null {
  if (doc === "INVOICE") {
    const fromHeader = readHeader(input.header, dataKey);
    if (fromHeader) return fromHeader;
    if (dataKey === "vendor_name") return text(checklist(input.checklist, "VENDOR_PO_INVOICE")?.actualValue);
    if (dataKey === "bank_account") return text(checklist(input.checklist, "BANK_VENDOR_MASTER")?.actualValue);
    return null;
  }
  if (doc === "PO" && dataKey === "vendor_name") {
    return text(checklist(input.checklist, "VENDOR_PO_INVOICE")?.expectedValue);
  }
  if (doc === "PO" && dataKey === "po_number") {
    const expected = text(checklist(input.checklist, "PO_NUMBER_MASTER")?.expectedValue);
    const digits = expected?.match(/\d{6,}/);
    return digits ? digits[0] : readHeader(input.header, "po_number");
  }
  if (doc === "VENDOR_MASTER" && dataKey === "bank_account") {
    return text(checklist(input.checklist, "BANK_VENDOR_MASTER")?.expectedValue);
  }
  for (const type of DOC_TYPES[doc] || []) {
    const value = readHeader(input.supportingDocs?.[type]?.header, dataKey);
    if (value) return value;
  }
  return null;
}

function ready(rule: CfgEvalRule): boolean {
  if (!text(rule.SourceField)) return false;
  const targets = (rule.Targets || []) as TargetRef[];
  return targets
    .filter((target) => String(target.requirement || "REQUIRED").toUpperCase() === "REQUIRED")
    .every((target) => text(target.field) && text(target.doc));
}

function applies(rule: CfgEvalRule, invoiceTypeCode?: string | null): boolean {
  const category = INVOICE_TYPE_CATEGORY[String(invoiceTypeCode || "").toUpperCase()];
  const disabled = (rule.DisabledCategories || []).map((code) => String(code).toUpperCase());
  if (category && disabled.includes(category)) return false;
  if (rule.Scope !== "CATEGORY") return true;
  const categories = (rule.Categories || []).map((code) => String(code).toUpperCase());
  return Boolean(category) && categories.includes(category);
}

export async function evaluateReadyMatchRules(
  input: MatchRuleEvaluationInput,
): Promise<MatchRuleCheckResult[]> {
  // Archived AP_MATCH_RULE load. The screen and this run both use cfg.
  // await ensureMatchRuleTable();
  // const rules = await ApMatchRule.findAll({
  //   where: { IsDeleted: false, Status: "ACTIVE" },
  //   order: [["DisplayOrder", "ASC"], ["RuleId", "ASC"]],
  // });
  const rules = await loadCfgEvalRules();
  const selected = rules.filter(
    (rule) =>
      (rule.RuleType === "EXACT" || rule.RuleType === "LOGICAL") &&
      ready(rule) &&
      applies(rule, input.invoiceTypeCode) &&
      HEADER_FIELDS[rule.DataKey],
  );
  if (!selected.length) return [];

  let exceptionMaps: Awaited<ReturnType<typeof loadExceptionCatalogue>> | null = null;
  try {
    exceptionMaps = await loadExceptionCatalogue();
  } catch (error) {
    logger.warn("Match-rule exception catalogue unavailable", error);
  }

  const results: MatchRuleCheckResult[] = [];
  for (const rule of selected) {
    const source = readOperand(rule.SourceDoc, rule.DataKey, input);
    const targets = ((rule.Targets || []) as TargetRef[]).filter((target) => {
      const requirement = String(target.requirement || "REQUIRED").toUpperCase();
      return requirement === "REQUIRED" || requirement === "IF_PRESENT";
    });
    const compared: string[] = [];
    const missing: string[] = [];
    for (const target of targets) {
      const requirement = String(target.requirement || "REQUIRED").toUpperCase();
      const value = readOperand(String(target.doc || ""), rule.DataKey, input);
      if (!value) {
        if (requirement === "REQUIRED") missing.push(String(target.doc));
        continue;
      }
      compared.push(`${target.doc}=${value}`);
      if (source && !sameValue(rule.DataKey, source, value)) {
        if (rule.RuleType === "LOGICAL") {
          results.push({
            ruleKey: rule.RuleKey,
            ruleName: rule.DataPoint,
            severity: "SKIP",
            expectedValue: source,
            actualValue: value,
            message: "Values differ. The Azure OpenAI check is not run here, so this is not a pass and not a business rejection.",
            exceptionCode: null,
          });
          break;
        }
        const blocked = rule.OnFail === "BLOCK";
        const message = blocked
          ? `${rule.DataPoint} does not match ${target.doc}. Exception E-1003. Workflow stopped.`
          : `${rule.DataPoint} does not match ${target.doc}. Exception E-1003.`;
        results.push({
          ruleKey: rule.RuleKey,
          ruleName: rule.DataPoint,
          severity: blocked ? "BLOCKED" : "FAIL",
          expectedValue: source,
          actualValue: value,
          message,
          exceptionCode: exceptionCodeFor(rule.LinkedCheck, message, exceptionMaps),
        });
        break;
      }
    }
    if (results.some((row) => row.ruleKey === rule.RuleKey)) continue;
    if (!source || missing.length || !compared.length) {
      results.push({
        ruleKey: rule.RuleKey,
        ruleName: rule.DataPoint,
        severity: "SKIP",
        expectedValue: source,
        actualValue: missing.length ? `Not captured: ${missing.join(", ")}` : null,
        message: "Not evaluated. A required value is missing, so this rule is not a pass.",
        exceptionCode: null,
      });
      continue;
    }
    if (rule.RuleType === "LOGICAL") {
      results.push({
        ruleKey: rule.RuleKey,
        ruleName: rule.DataPoint,
        severity: "PASS",
        expectedValue: source,
        actualValue: compared.join("; ") || source,
        message: "Values are the same after normalisation. No AI call was required.",
        exceptionCode: null,
      });
      continue;
    }
    results.push({
      ruleKey: rule.RuleKey,
      ruleName: rule.DataPoint,
      severity: "PASS",
      expectedValue: source,
      actualValue: compared.join("; ") || source,
      message: "All compared values match.",
      exceptionCode: null,
    });
  }
  return results;
}

function exceptionCodeFor(
  linkedCheck: string | null,
  message: string,
  catalogue: Awaited<ReturnType<typeof loadExceptionCatalogue>> | null,
): string {
  if (!catalogue || !linkedCheck) return "E-1003";
  const byCode = new Map(catalogue.codes.map((row) => [row.code, row]));
  const resolved = resolveRuleExceptions(linkedCheck, message, catalogue.maps, byCode);
  return resolved[0]?.code || "E-1003";
}
