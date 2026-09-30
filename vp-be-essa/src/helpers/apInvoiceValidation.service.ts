import { QueryTypes } from "sequelize";
import { ApSesHeader } from "../models/apSesHeader";
import { ApValidationResult } from "../models/apValidationResult";
import { ApValidationRun } from "../models/apValidationRun";
import { EssaInvoice } from "../models/essaInvoice";
import { POHeader } from "../models/purchaseOrderHeader";
import { Vendor } from "../models/vendor";
import { VendorBankData } from "../models/vendorBank";
import { sequelize } from "../config/sequelize";
import logger from "../utils/logger";
import apDocumentRequestService from "./apDocumentRequest.service";
import apInvoiceDocumentService from "./apInvoiceDocument.service";
import { toStoredDocumentType } from "./apDocumentTypeCanon";
import {
  bankAccountsMatch,
  buildTextCorpus,
  extractIndonesianBankDetails,
  normalizeBankAccountNumber,
  reconcileInvoiceLineItems,
} from "./apInvoiceOcr.normalize";
import {
  loadActiveInvoiceConfigByTypeCode,
  loadActiveInvoiceConfigForWorkflow,
  runtimeDocTypesForRule,
  type ActiveInvoiceConfig,
} from "./invoiceConfig.service";
import sapFieldMappingValidationService from "./sapFieldMappingValidation.service";
import {
  auditRuleFail,
  auditRuleHardFail,
  auditRuleWarn,
  auditValidateRun,
} from "./invoiceProcessAudit.service";
import { mintCorrelationId } from "./auditEvent.service";

export type ValidationSeverity = "PASS" | "WARNING" | "FAIL" | "BLOCKED" | "SKIP";

export interface ValidationRuleDetail {
  label: string;
  value: string;
  status?: ValidationSeverity;
  invoicedAmount?: number | null;
  hours?: number | null;
  appliedRate?: number | null;
  poRate?: number | null;
  issue?: string | null;
}

export interface ValidationRuleResult {
  sequence: number;
  ruleCode: string;
  ruleName: string;
  severity: ValidationSeverity;
  expectedValue: string | null;
  actualValue: string | null;
  variance: number | null;
  message: string;
  sourceTable: string | null;
  sourceRecordId: string | null;
  details?: ValidationRuleDetail[];
  /** BPD outcome code e.g. PO-005, SES-007, TAX-004 when present on rule metadata. */
  outcomeCode?: string | null;
  /** Optional links to config-driven schema (migration 015). */
  configVersionId?: number | null;
  mappingId?: number | null;
  documentRuleId?: number | null;
}

export interface InvoiceValidationResult {
  poNumber: string | null;
  sesNo: string | null;
  matched: boolean;
  overallStatus: ValidationSeverity;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
    blocked: number;
    skipped: number;
  };
  results: ValidationRuleResult[];
  ld_pct?: number;
  ld_amount?: number;
  advance_recovery?: number;
  retention_held?: number;
  net_payable?: number;
  configVersionId?: number | null;
  validationRunId?: number | null;
}

interface ExtractedHeader {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  vendorName?: string | null;
  poNumber?: string | null;
  currency?: string | null;
  subtotal?: string | null;
  taxAmount?: string | null;
  totalAmount?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBranch?: string | null;
  totalRegularManhour?: string | null;
  totalOvertimeManhour?: string | null;
  thisManhours?: string | null;
  periodEnd?: string | null;
  deliveryDate?: string | null;
  manhourUnitRate?: string | null;
  [key: string]: string | null | undefined;
}

interface ExtractedLineItem {
  description?: string | null;
  quantity?: string | null;
  unit?: string | null;
  unitPrice?: string | null;
  amount?: string | null;
  regularManhour?: string | null;
  overtimeManhour?: string | null;
  [key: string]: string | null | undefined;
}

interface SupportingDocPayload {
  header?: ExtractedHeader;
  lineItems?: ExtractedLineItem[];
}

export type ValidationTriggerEvent =
  | "INITIAL_VALIDATION"
  | "DOCREQ_REVALIDATION"
  | "MANUAL_RETRIGGER";

export interface ValidateInvoicePayload {
  header?: ExtractedHeader;
  lineItems?: ExtractedLineItem[];
  tables?: unknown[];
  supportingDocs?: Record<string, SupportingDocPayload>;
  batchDocumentTypes?: string[];
  invoiceHeaderId?: number;
  documentId?: number;
  createdBy?: number;
  /** Extraction invoice type code, e.g. MANPOWER_SERVICES / NON_PO */
  invoiceTypeCode?: string;
  /** Workflow hint when invoiceTypeCode is omitted: PO | NON_PO */
  workflow?: string;
  /** Why this run was started. Defaults to INITIAL_VALIDATION. */
  triggerEvent?: ValidationTriggerEvent;
}

interface SesHeaderRow {
  SESNo: string;
  PONo: string;
  VendorName: string | null;
  POValue: number | null;
  TotalSESValueIDR: number | null;
  RemainingPOBalance: number | null;
}

interface SesManhourDetailRow {
  description: string | null;
  unit: string | null;
  acceptedQty: number | null;
}

interface PoMasterRow {
  PONo: string;
  PODate: Date | string | null;
  POValue: number | null;
  InvValue: number | null;
  POStatus: string | null;
  VendorName: string | null;
  VendorId: number | null;
  IsVat: boolean | null;
  LDApplicable: boolean | null;
  LDRatePerWeek: number | null;
  LDMaxPercentage: number | null;
  DeliveryEndDate: Date | string | null;
}

const REQUIRED_MANPOWER_DOCS = [
  "invoice",
  "tax_invoice",
  "berita_acara",
  "manhour_summary",
  "timesheet",
  "attendance",
] as const;

const DOC_LABELS: Record<string, string> = {
  invoice: "Invoice",
  tax_invoice: "Tax Invoice (Faktur Pajak)",
  berita_acara: "Berita Acara",
  manhour_summary: "Summary Calculation Manhour",
  timesheet: "Daily Timesheet",
  attendance: "Daily Attendance",
  po: "PO",
  po_appendix: "PO Appendix",
  ses: "Service Entry Sheet (SES)",
};

/** TEMP local diagnostic — gated by TEMP_LOG_DOC_COMPLETENESS. Do not enable on dest. */
function isTempDocCompletenessLogEnabled(): boolean {
  const v = String(process.env.TEMP_LOG_DOC_COMPLETENESS || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function tempLogDocCompleteness(meta: Record<string, unknown>): void {
  if (!isTempDocCompletenessLogEnabled()) return;
  logger.info("[TEMP_DOC_COMPLETENESS]", meta);
}

/** Temporary override — do not send missing-document emails to the real vendor yet. */
const MISSING_DOC_EMAIL_OVERRIDE =
  String(process.env.MISSING_DOC_VENDOR_EMAIL_OVERRIDE || "n.sabrina@aven-sys.com")
    .trim()
    .toLowerCase();

function storedTypeForMissingTitle(title: string): string {
  const types = runtimeDocTypesForRule({ DocumentTitle: title });
  if (types[0]) return toStoredDocumentType(types[0]);
  const fromLabel = Object.entries(DOC_LABELS).find(
    ([, label]) => label.toLowerCase() === title.toLowerCase(),
  );
  if (fromLabel) return toStoredDocumentType(fromLabel[0]);
  return toStoredDocumentType(title);
}

function blockedMissingDocumentItems(
  result: InvoiceValidationResult,
): Array<{ documentType: string; title: string }> {
  const completeness = result.results.find((rule) => rule.ruleCode === "DOC_COMPLETENESS");
  if (!completeness || completeness.severity !== "FAIL") return [];
  let titles = (completeness.details || [])
    .filter((detail) => detail.status === "FAIL")
    .map((detail) => String(detail.label || "").trim())
    .filter(Boolean);
  if (!titles.length) {
    const message = String(completeness.message || "");
    const match = message.match(/Missing:\s*(.+)$/i);
    titles = match?.[1]
      ? match[1]
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : [];
  }
  const seen = new Set<string>();
  const items: Array<{ documentType: string; title: string }> = [];
  for (const title of titles) {
    const documentType = storedTypeForMissingTitle(title);
    if (!documentType || seen.has(documentType)) continue;
    seen.add(documentType);
    items.push({ documentType, title });
  }
  return items;
}

async function notifyVendorBlockedMissingDocuments(
  documentId: number,
  missingItems: Array<{ documentType: string; title: string }>,
): Promise<void> {
  if (!missingItems.length) return;
  try {
    const row = await EssaInvoice.findOne({ where: { DocumentId: documentId } });
    const invoiceNumber = row?.InvoiceNo || "UNKNOWN";
    const vendorName = row?.VendorName || "Vendor";
    const created = await apDocumentRequestService.createRequest({
      primaryDocumentId: documentId,
      items: missingItems.map((item) => ({
        documentType: item.documentType,
        reason: "MISSING",
      })),
      vendorEmail: MISSING_DOC_EMAIL_OVERRIDE,
      vendorName,
      invoiceNumber,
      extraBody:
        "This invoice cannot be processed until the missing required documents are received.",
    });
    const sent = await apDocumentRequestService.sendRequestEmail({
      requestId: created.requestId,
      to: MISSING_DOC_EMAIL_OVERRIDE,
      body: created.body,
    });
    logger.info(
      `[DOC_COMPLETENESS] BLOCK missing DOCREQ sent to ${sent.to} subject="${sent.subject}" types=${missingItems
        .map((item) => item.documentType)
        .join(",")}`,
    );
  } catch (error) {
    logger.error(
      `[DOC_COMPLETENESS] Failed to send DOCREQ for blocked missing documents on document ${documentId}`,
      error,
    );
  }
}

const RULE_DEFINITIONS = [
  { sequence: 1, ruleCode: "DOC_COMPLETENESS", ruleName: "Document completeness" },
  { sequence: 2, ruleCode: "PO_NUMBER_MASTER", ruleName: "PO number → PO Master" },
  { sequence: 3, ruleCode: "VENDOR_PO_INVOICE", ruleName: "Vendor name: PO → Invoice" },
  { sequence: 4, ruleCode: "BANK_VENDOR_MASTER", ruleName: "Bank details → Vendor Master" },
  { sequence: 5, ruleCode: "NON_PKP_VENDOR", ruleName: "Non-PKP vendor check" },
  { sequence: 6, ruleCode: "TAX_INVOICE_MATCH", ruleName: "Vendor + VAT vs Tax Invoice" },
  { sequence: 7, ruleCode: "QTY_RECONCILIATION", ruleName: "Quantity reconciliation" },
  { sequence: 8, ruleCode: "RATE_VALIDATION", ruleName: "Rate validation" },
  { sequence: 9, ruleCode: "LATE_DELIVERY_LD", ruleName: "Late delivery / LD" },
  { sequence: 10, ruleCode: "PO_VALUE_ZERO_TOLERANCE", ruleName: "Total PO value (0% tolerance)" },
  { sequence: 11, ruleCode: "SES_DEVIATION", ruleName: "SES vs invoice deviation" },
  { sequence: 12, ruleCode: "ADVANCE_RETENTION", ruleName: "Advance recovery & retention" },
] as const;

class ApInvoiceValidationService {
  private parseAmount(raw: unknown): number | null {
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

  private parseHours(raw: unknown): number | null {
    const n = this.parseAmount(raw);
    return n !== null ? n : null;
  }

  private normalizePoNumber(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const digits = String(raw).replace(/\D/g, "");
    return digits.length ? digits : null;
  }

  private normalizeName(raw: unknown): string {
    return String(raw ?? "")
      .toUpperCase()
      .replace(/[.,]/g, " ")
      .replace(/\b(PT|CV|TBK|PERSERO|UD)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeBankAccount(raw: unknown): string {
    return normalizeBankAccountNumber(raw) ?? "";
  }

  private resolveInvoiceBankAccount(payload: ValidateInvoicePayload): string | null {
    const header = payload.header ?? {};
    if (header.bankAccount) return header.bankAccount;

    for (const type of ["receipt", "notice"]) {
      const doc = this.getDoc(payload, type);
      const docHeader = doc.header ?? {};
      const bankText =
        docHeader.bankDetails ||
        docHeader["Mohon Dikirimkan Di"] ||
        null;
      if (bankText) {
        const parsed = extractIndonesianBankDetails(String(bankText));
        if (parsed.bankAccount) return parsed.bankAccount;
      }
      if (docHeader.bankAccount) return docHeader.bankAccount;
    }

    return header.bankAccount ?? null;
  }

  private formatIDR(value: number | null): string | null {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return null;
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private namesMatch(a: unknown, b: unknown): boolean {
    const left = this.normalizeName(a);
    const right = this.normalizeName(b);
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  }

  private withinRelativeTolerance(a: number, b: number, tolerance = 0.01): boolean {
    const diff = Math.abs(a - b);
    if (diff <= 1) return true;
    const base = Math.max(Math.abs(a), Math.abs(b), 1);
    return diff / base <= tolerance;
  }

  private formatSesDifference(
    diffIdr: number,
    diffPct: number,
  ): string {
    if (diffIdr === 0) return "IDR 0";
    return `${diffIdr > 0 ? "+" : "−"}IDR ${this.formatIDR(Math.abs(diffIdr))} (${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%)`;
  }

  private buildSesDeviationDetails(params: {
    subtotal: number | null;
    invoiceAmount: number | null;
    maxSes: number | null;
    sesAmount: number | null;
    sesSeverity: ValidationSeverity;
  }): Array<{ label: string; value: string; status?: ValidationSeverity }> {
    const { subtotal, invoiceAmount, maxSes, sesAmount, sesSeverity } = params;
    const diffIdr =
      sesAmount != null && invoiceAmount != null ? sesAmount - invoiceAmount : null;
    const diffPct =
      diffIdr != null && invoiceAmount != null && invoiceAmount > 0
        ? (diffIdr / invoiceAmount) * 100
        : null;

    return [
      {
        label: "Invoice subtotal",
        value: subtotal != null ? `IDR ${this.formatIDR(subtotal)}` : "—",
      },
      {
        label: "Total amount excluding VAT",
        value:
          invoiceAmount != null ? `IDR ${this.formatIDR(invoiceAmount)}` : "—",
      },
      {
        label: "Maximum SES amount",
        value: maxSes != null ? `IDR ${this.formatIDR(maxSes)}` : "—",
      },
      {
        label: "Difference",
        value:
          diffIdr != null && diffPct != null
            ? this.formatSesDifference(diffIdr, diffPct)
            : "—",
        ...(sesAmount != null ? { status: sesSeverity } : {}),
      },
    ];
  }

  private makeRule(
    partial: Pick<
      ValidationRuleResult,
      "sequence" | "ruleCode" | "ruleName" | "severity" | "message"
    > &
      Partial<ValidationRuleResult>,
  ): ValidationRuleResult {
    return {
      expectedValue: null,
      actualValue: null,
      sourceTable: null,
      sourceRecordId: null,
      variance: null,
      details: undefined,
      ...partial,
    };
  }

  /** Not applicable — counts as PASS for overall validation. */
  private naRule(
    sequence: number,
    ruleCode: string,
    ruleName: string,
    message: string,
  ): ValidationRuleResult {
    return this.makeRule({
      sequence,
      ruleCode,
      ruleName,
      severity: "PASS",
      expectedValue: null,
      actualValue: null,
      message,
    });
  }

  private failRule(
    sequence: number,
    ruleCode: string,
    ruleName: string,
    message: string,
    partial?: Partial<ValidationRuleResult>,
  ): ValidationRuleResult {
    return this.makeRule({
      sequence,
      ruleCode,
      ruleName,
      severity: "FAIL",
      message,
      ...partial,
    });
  }

  private failRemainingRules(
    results: ValidationRuleResult[],
    fromSequence: number,
    message: string,
  ): void {
    for (const def of RULE_DEFINITIONS) {
      if (def.sequence >= fromSequence) {
        results.push(this.failRule(def.sequence, def.ruleCode, def.ruleName, message));
      }
    }
  }

  private getPresentDocTypes(
    payload: ValidateInvoicePayload,
  ): Set<string> {
    const present = new Set<string>();
    const batchTypes = (payload.batchDocumentTypes || []).map((t) =>
      String(t),
    );

    for (const type of batchTypes) {
      if (type) present.add(type);
    }
    for (const type of Object.keys(payload.supportingDocs || {})) {
      if (type) present.add(type);
    }

    // Invoice presence is classification-only. Do not infer it from an
    // invoice number found on tax invoice / PO / Berita Acara / header merge.

    return present;
  }

  private getDoc(
    payload: ValidateInvoicePayload,
    type: string,
  ): SupportingDocPayload {
    if (type === "invoice") {
      return {
        header: payload.header,
        lineItems: payload.lineItems,
      };
    }
    return payload.supportingDocs?.[type] || {};
  }

  /** PO total from OCR extract (header / line sum) — matches Extract & Validate PO tab. */
  private resolvePoValueFromExtract(payload: ValidateInvoicePayload): number | null {
    const poDoc = this.getDoc(payload, "po");
    const hdr = poDoc?.header || {};
    const lineItems = poDoc?.lineItems || [];

    const headerCandidates = [
      this.parseAmount(hdr.poValue),
      this.parseAmount(hdr.totalAmount),
      this.parseAmount(hdr.totalPrice),
    ].filter((value): value is number => value !== null && value > 0);

    if (headerCandidates.length) {
      return Math.max(...headerCandidates);
    }

    let sum = 0;
    let hasLineAmount = false;
    for (const line of lineItems) {
      const raw = line as Record<string, unknown>;
      const amount = this.parseAmount(
        raw.amount ?? raw.totalPrice ?? raw.totalAmount ?? line.lineValue,
      );
      if (amount !== null && amount > 0) {
        sum += amount;
        hasLineAmount = true;
      }
    }

    return hasLineAmount && sum > 0 ? sum : null;
  }

  private sumLineQuantity(lines: ExtractedLineItem[]): number {
    return lines.reduce((sum, line) => {
      const qty = this.parseHours(line.quantity);
      return qty !== null ? sum + qty : sum;
    }, 0);
  }

  private daysBetweenDates(fromRaw: unknown, toRaw: unknown): number | null {
    if (!fromRaw || !toRaw) return null;
    const from = new Date(String(fromRaw));
    const to = new Date(String(toRaw));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  }

  /** PKP when vendor master is VAT-registered or the bundle shows VAT (tax invoice + VAT amount). */
  private resolveIsPkpVendor(
    po: PoMasterRow,
    header: ExtractedHeader,
    presentDocs: Set<string>,
    invoiceTaxAmount: number | null,
  ): boolean {
    if (po.IsVat === true) return true;
    const vatAmount = invoiceTaxAmount ?? this.parseAmount(header.taxAmount);
    const hasVatOnInvoice = vatAmount !== null && vatAmount > 0;
    return presentDocs.has("tax_invoice") && hasVatOnInvoice;
  }

  private async fetchSesHeader(poNumber: string): Promise<SesHeaderRow | null> {
    const ses = await ApSesHeader.findOne({
      where: { PONo: poNumber },
      order: [["SESHeaderId", "DESC"]],
    });
    if (!ses) return null;
    return {
      SESNo: ses.SESNo,
      PONo: ses.PONo,
      VendorName: ses.VendorName,
      POValue: this.toNumber(ses.POValue),
      TotalSESValueIDR: this.toNumber(ses.TotalSESValueIDR),
      RemainingPOBalance: this.toNumber(ses.RemainingPOBalance),
    };
  }

  private async fetchPoMaster(poNumber: string): Promise<PoMasterRow | null> {
    const po = await POHeader.findOne({
      where: { PONo: poNumber, Is_Deleted: false },
      include: [{ model: Vendor, as: "vendor", required: false }],
    });
    if (!po) return null;

    let ldRow: Record<string, unknown> | null = null;
    try {
      const rows = (await sequelize.query(
        `SELECT LD_Applicable, LD_Rate_Per_Week, LD_Max_Percentage, Delivery_End_Date
         FROM PO_HEADER WHERE PONo = :poNumber`,
        { replacements: { poNumber }, type: QueryTypes.SELECT },
      )) as Record<string, unknown>[];
      ldRow = rows[0] ?? null;
    } catch {
      ldRow = null;
    }

    const vendor = (po as { vendor?: Vendor }).vendor;
    return {
      PONo: po.PONo,
      PODate: po.PO_date ?? null,
      POValue: this.toNumber(po.POValue),
      InvValue: this.toNumber(po.InvValue),
      POStatus: po.POStatus ?? null,
      VendorName: vendor?.Vendor_Name_EN ?? null,
      VendorId: vendor?.ID ?? po.Vendor_id ?? null,
      IsVat: vendor?.Is_VAT ?? null,
      LDApplicable: ldRow?.LD_Applicable === true || ldRow?.LD_Applicable === 1,
      LDRatePerWeek: this.toNumber(ldRow?.LD_Rate_Per_Week),
      LDMaxPercentage: this.toNumber(ldRow?.LD_Max_Percentage),
      DeliveryEndDate: (ldRow?.Delivery_End_Date as Date | string | null) ?? null,
    };
  }

  private formatMhQty(value: number | null): string {
    return value !== null && value > 0 ? `${value.toFixed(1)} MH` : "—";
  }

  /**
   * Classify SES MH lines for qty reconciliation:
   * - OT-HRS / overtime descriptions → overtime bucket
   * - Any non-empty MH-unit line without OT keywords → regular bucket (role-agnostic)
   */
  private classifySesManhourLine(
    description: unknown,
    unit: unknown,
  ): "overtime" | "regular" | null {
    const unitNorm = String(unit ?? "").trim().toUpperCase();
    if (unitNorm && unitNorm !== "MH") return null;

    const desc = String(description ?? "").trim();
    if (!desc) return null;
    const upper = desc.toUpperCase();

    if (/OT[-\s]?HRS|\bOVERTIME\b|,\s*OT\b/.test(upper)) {
      return "overtime";
    }

    return "regular";
  }

  /** Canonical role name: "Pipe Fitter" → "Fitter"; others are title-cased. */
  private normalizeRoleKey(raw: string): string | null {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();
    if (!upper || upper === "TOTAL") return null;
    if (/\bPIPE\s*FITTER\b/.test(upper)) return "Fitter";
    return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private isTotalManhourRow(line: ExtractedLineItem): boolean {
    const name = String(
      line.manpowerName ?? line.Name ?? line.name ?? "",
    )
      .trim()
      .toUpperCase();
    const role = String(line.role ?? line.Position ?? line.position ?? "")
      .trim()
      .toUpperCase();
    const no = String(line["No."] ?? line.no ?? "").trim().toUpperCase();
    return name === "TOTAL" || role === "TOTAL" || no === "TOTAL";
  }

  private resolveLineOvertimeHours(line: ExtractedLineItem): number {
    const weekday = this.parseHours(
      line.overtimeMondaySaturdayManhour ??
      line.overtimeMondaySaturday ??
      line["Overtime Monday-Saturday"] ??
      line["Overtime Monday - Saturday"],
    );
    const sunday = this.parseHours(
      line.overtimeSundayHolidayManhour ??
      line.overtimeSundayPublicHoliday ??
      line["Overtime Sunday & Public Holiday"] ??
      line["Overtime Sunday and Public Holiday"],
    );
    if (weekday !== null || sunday !== null) {
      return (weekday ?? 0) + (sunday ?? 0);
    }
    return this.parseHours(line.overtimeManhour) ?? 0;
  }

  /** Reconcile invoice claim rows (Direct Cost / Overtime Welder-Fitter) before rate checks. */
  private prepareInvoiceLineItemsForRateValidation(
    payload: ValidateInvoicePayload,
  ): ExtractedLineItem[] {
    const raw = Array.isArray(payload.lineItems) ? payload.lineItems : [];
    const tables = Array.isArray(payload.tables) ? payload.tables : [];
    const headerRecord: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(payload.header || {})) {
      headerRecord[key] = value == null ? null : String(value);
    }

    const corpus = buildTextCorpus(headerRecord, [], raw, { tables });
    const reconciled = reconcileInvoiceLineItems(raw, tables, corpus);
    if (reconciled.length) {
      return reconciled.map((item) => ({
        description: item.description,
        amount: item.amount,
      }));
    }
    return raw;
  }

  /** Build role map from manhour summary lines — dynamic, not limited to Welder/Fitter. */
  private extractRolesFromManhourLines(
    lines: ExtractedLineItem[],
  ): Map<string, { unitPrice: number | null; regularHours: number; otHours: number }> {
    const roles = new Map<string, { unitPrice: number | null; regularHours: number; otHours: number }>();

    for (const line of lines) {
      if (this.isTotalManhourRow(line)) continue;
      const rawRole = String(
        line.role ?? line.Position ?? line.position ?? line.manpowerRole ?? "",
      ).trim();
      const role = this.normalizeRoleKey(rawRole);
      if (!role) continue;

      if (!roles.has(role)) {
        roles.set(role, { unitPrice: null, regularHours: 0, otHours: 0 });
      }
      const entry = roles.get(role)!;

      const rate = this.parseAmount(
        line.unitPrice ??
        line.unitPricePerHour ??
        line["Unit Price / Hour (IDR)"] ??
        line["Amount/Hour (Rp)"],
      );
      if (rate != null && rate > 0 && entry.unitPrice == null) {
        entry.unitPrice = rate;
      }

      entry.regularHours +=
        this.parseHours(
          line.regularManhour ?? line.actualMhr ?? line["Actual Mhr"] ?? line.actualMH,
        ) ?? 0;
      entry.otHours += this.resolveLineOvertimeHours(line);
    }

    return roles;
  }


  private formatRatePerHour(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return "—";
    return `IDR ${this.formatIDR(value)}/hr`;
  }

  private formatHoursQty(value: number | null): string {
    if (value === null || !Number.isFinite(value) || value <= 0) return "—";
    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  }

  private buildRateValidationRow(params: {
    category: string;
    invoicedAmount: number | null;
    hours: number | null;
    poRate: number | null;
  }): ValidationRuleDetail {
    const { category, invoicedAmount, hours, poRate } = params;
    const appliedRate =
      invoicedAmount !== null && hours !== null && hours > 0
        ? invoicedAmount / hours
        : null;

    let status: ValidationSeverity | undefined;
    let issue: string | null = null;

    if (invoicedAmount === null) {
      status = "FAIL";
      issue = `Missing invoiced amount — no invoice line matched "${category}" (Direct Cost or Overtime claim row).`;
    } else if (hours === null || hours <= 0) {
      status = "FAIL";
      issue = `Missing hours — sum regular or OT manhours for ${category} from Summary Calculation Manhour.`;
    } else if (poRate === null) {
      status = "FAIL";
      issue = "Missing contract rate — unit price not found in manhour summary, PO appendix, or PO lines.";
    } else if (appliedRate !== null) {
      const ok = this.withinRelativeTolerance(appliedRate, poRate, 0.01);
      status = ok ? "PASS" : "FAIL";
      if (!ok) {
        issue = `Applied ${this.formatRatePerHour(appliedRate)} (${this.formatIDR(invoicedAmount)} ÷ ${this.formatHoursQty(hours)} hrs) does not match PO ${this.formatRatePerHour(poRate)}.`;
      }
    }

    const statusLabel =
      status === "PASS" ? "VALID" : status === "FAIL" ? "INVALID" : "—";

    return {
      label: category,
      value: issue || statusLabel,
      status,
      invoicedAmount,
      hours,
      appliedRate,
      poRate,
      issue,
    };
  }

  private resolveManhourSummaryTotals(
    hdr: ExtractedHeader,
    lines: ExtractedLineItem[],
  ): { regular: number | null; overtime: number | null } {
    const headerRegular = this.parseHours(hdr.totalRegularManhour);
    const headerOvertime = this.parseHours(hdr.totalOvertimeManhour);

    let lineRegularSum = 0;
    let lineOvertimeSum = 0;
    let hasLineRegular = false;
    let hasLineOvertime = false;

    for (const line of lines) {
      const regular = this.parseHours(line.regularManhour);
      if (regular !== null && regular > 0) {
        lineRegularSum += regular;
        hasLineRegular = true;
      }
      // Sum both OT columns (Mon–Sat and Sun/PH) to match resolveLineOvertimeHours
      const weekday = this.parseHours(
        line.overtimeMondaySaturdayManhour ??
        line.overtimeMondaySaturday ??
        line["Overtime Monday-Saturday"] ??
        line["Overtime Monday - Saturday"]
      );
      const sunday = this.parseHours(
        line.overtimeSundayHolidayManhour ??
        line.overtimeSundayPublicHoliday ??
        line["Overtime Sunday & Public Holiday"]
      );
      const overtime =
        weekday !== null || sunday !== null
          ? (weekday ?? 0) + (sunday ?? 0)
          : this.parseHours(line.overtimeManhour);
      if (overtime !== null && overtime > 0) {
        lineOvertimeSum += overtime;
        hasLineOvertime = true;
      }
    }

    return {
      regular: headerRegular ?? (hasLineRegular ? lineRegularSum : null),
      overtime: headerOvertime ?? (hasLineOvertime ? lineOvertimeSum : null),
    };
  }

  private async fetchSesManhourLines(sesNo: string): Promise<SesManhourDetailRow[]> {
    try {
      const rows = (await sequelize.query(
        `SELECT "Description", "Unit", CAST("AcceptedQty" AS DOUBLE PRECISION) AS "AcceptedQty"
         FROM "AP_SES_DETAIL"
         WHERE "SESNo" = :sesNo`,
        { replacements: { sesNo }, type: QueryTypes.SELECT },
      )) as Array<{
        Description?: string | null;
        Unit?: string | null;
        AcceptedQty?: number | null;
      }>;
      return rows.map((row) => ({
        description: row.Description ?? null,
        unit: row.Unit ?? null,
        acceptedQty: this.toNumber(row.AcceptedQty),
      }));
    } catch {
      return [];
    }
  }

  private sumSesAcceptedByCategory(
    lines: SesManhourDetailRow[],
  ): { regular: number; overtime: number } {
    let regular = 0;
    let overtime = 0;
    for (const row of lines) {
      const category = this.classifySesManhourLine(row.description, row.unit);
      const qty = row.acceptedQty ?? 0;
      if (category === "regular") regular += qty;
      else if (category === "overtime") overtime += qty;
    }
    return { regular, overtime };
  }


  private async persistResults(
    keys: {
      documentId?: number;
      invoiceHeaderId?: number;
      createdBy?: number;
      triggerEvent?: ValidationTriggerEvent;
      /** Extra FAIL count from SAP mapping (not in results[]). */
      extraFailedChecks?: number;
    },
    result: InvoiceValidationResult,
  ): Promise<void> {
    let run: ApValidationRun | null = null;
    try {
      run = await ApValidationRun.create({
        InvoiceHeaderId: keys.invoiceHeaderId ?? null,
        DocumentId: keys.documentId ?? null,
        ConfigVersionId: result.configVersionId ?? null,
        TriggerEvent: keys.triggerEvent || "INITIAL_VALIDATION",
        Status: "RUNNING",
        StartedAt: new Date(),
        TriggeredBy: keys.createdBy ?? null,
        CreatedBy: keys.createdBy ?? null,
      });
      result.validationRunId = run.ValidationRunId;

      if (keys.documentId) {
        await ApValidationResult.destroy({ where: { DocumentId: keys.documentId } });
      } else if (keys.invoiceHeaderId) {
        await ApValidationResult.destroy({
          where: { InvoiceHeaderId: keys.invoiceHeaderId },
        });
      }

      await ApValidationResult.bulkCreate(
        result.results
          .filter((rule) => rule.severity !== "SKIP")
          .map((rule) => ({
            DocumentId: keys.documentId ?? null,
            InvoiceHeaderId: keys.invoiceHeaderId ?? null,
            ConfigVersionId: rule.configVersionId ?? result.configVersionId ?? null,
            MappingId: rule.mappingId ?? null,
            DocumentRuleId: rule.documentRuleId ?? null,
            ValidationRunId: run?.ValidationRunId ?? null,
            RuleCode: rule.ruleCode,
            RuleName: rule.ruleName,
            Severity: rule.severity,
            ExpectedValue: rule.expectedValue,
            ActualValue: rule.actualValue,
            VarianceValue: rule.variance,
            Message: rule.message,
            SourceTable: rule.sourceTable,
            SourceRecordId: rule.sourceRecordId,
            CreatedBy: keys.createdBy ?? null,
          })),
      );

      await run.update({
        Status: "COMPLETED",
        CompletedAt: new Date(),
        UpdatedAt: new Date(),
      });

      if (keys.documentId) {
        try {
          const essa = await EssaInvoice.findOne({
            where: { DocumentId: keys.documentId, IsDeleted: false },
          });
          const objectId = essa?.InvoiceNo || `ocr-${keys.documentId}`;
          const correlationId =
            essa?.CorrelationId || mintCorrelationId(`doc${keys.documentId}`);
          const material = result.results.filter(
            (rule) =>
              rule.severity === "FAIL" ||
              rule.severity === "WARNING" ||
              rule.severity === "BLOCKED",
          );
          await auditValidateRun({
            objectId,
            invoiceId: keys.documentId,
            correlationId,
            actorId: keys.createdBy ?? null,
            actorType: keys.createdBy ? "USER" : "SYSTEM",
            source: keys.createdBy ? "PORTAL" : "SYSTEM",
            result: result.overallStatus === "PASS" ? "PASS" : "FAIL",
            reasonRemarks: `Validation run ${run.ValidationRunId} completed (${result.overallStatus})`,
            details: {
              validationRunId: run.ValidationRunId,
              triggerEvent: keys.triggerEvent || "INITIAL_VALIDATION",
              overallStatus: result.overallStatus,
              summary: result.summary,
              materialRuleCount: material.length,
            },
          });

          for (const rule of material) {
            const base = {
              objectId,
              invoiceId: keys.documentId,
              correlationId,
              fieldCode: rule.ruleCode,
              outcomeCode: rule.outcomeCode || rule.ruleCode,
              reasonRemarks: rule.message,
              oldValue: rule.expectedValue,
              newValue: rule.actualValue,
              details: {
                ruleCode: rule.ruleCode,
                ruleName: rule.ruleName,
                severity: rule.severity,
                variance: rule.variance,
                operands: rule.details || null,
                sourceTable: rule.sourceTable,
                sourceRecordId: rule.sourceRecordId,
                validationRunId: run.ValidationRunId,
              },
            };
            if (rule.severity === "BLOCKED") {
              void auditRuleHardFail(base);
            } else if (rule.severity === "WARNING") {
              void auditRuleWarn(base);
            } else {
              void auditRuleFail(base);
            }
          }
        } catch (auditError) {
          logger.warn(
            `Failed to write validation audit for document ${keys.documentId}: ${
              auditError instanceof Error ? auditError.message : String(auditError)
            }`,
          );
        }

        const failedChecks =
          result.results.filter((rule) => rule.severity === "FAIL").length +
          (Number(keys.extraFailedChecks) > 0 ? Number(keys.extraFailedChecks) : 0);
        const blockedMissing = blockedMissingDocumentItems(result);
        await apInvoiceDocumentService.updateEssaInvoiceAfterValidation(
          keys.documentId,
          failedChecks,
          result.overallStatus,
          { workflowStage: blockedMissing.length ? "draft" : null },
        );
        if (
          blockedMissing.length &&
          keys.triggerEvent !== "DOCREQ_REVALIDATION"
        ) {
          await notifyVendorBlockedMissingDocuments(keys.documentId, blockedMissing);
        }
      }
    } catch (error) {
      if (run) {
        try {
          await run.update({
            Status: "FAILED",
            CompletedAt: new Date(),
            UpdatedAt: new Date(),
          });
        } catch (runError) {
          logger.error("Failed to mark validation run as FAILED", runError);
        }
      }
      logger.error("Failed to persist validation results", error);
    }
  }

  async validateInvoice(
    payload: ValidateInvoicePayload,
  ): Promise<InvoiceValidationResult> {
    const header = payload?.header ?? {};
    const lineItems = Array.isArray(payload?.lineItems) ? payload.lineItems : [];
    const presentDocs = this.getPresentDocTypes(payload);
    const poNumber = this.normalizePoNumber(header.poNumber);
    const subtotal = this.parseAmount(header.subtotal);
    const taxAmount = this.parseAmount(header.taxAmount);
    const totalAmount = this.parseAmount(header.totalAmount);
    const invoiceNet = subtotal ?? totalAmount;
    const invoiceTotal =
      totalAmount ??
      (subtotal !== null && taxAmount !== null ? subtotal + taxAmount : null) ??
      subtotal;

    const results: ValidationRuleResult[] = [];
    let ldPct = 0;
    let ldAmount = 0;
    let advanceRecovery = 0;
    let retentionHeld = 0;
    let activeConfig: ActiveInvoiceConfig | null = null;
    try {
      if (payload.invoiceTypeCode) {
        activeConfig = await loadActiveInvoiceConfigByTypeCode(payload.invoiceTypeCode);
      } else {
        activeConfig = await loadActiveInvoiceConfigForWorkflow(payload.workflow || "PO");
      }
    } catch (error) {
      logger.warn("Failed to load invoice config for validation; using hardcoded DOC_COMPLETENESS", error);
      tempLogDocCompleteness({
        phase: "config_load_failed",
        invoiceTypeCode: payload.invoiceTypeCode || null,
        workflow: payload.workflow || "PO",
        documentId: payload.documentId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ── 1. Document completeness (config-driven when available) ───────────
    const mandatoryRules = (activeConfig?.documentRules || []).filter((r) => r.IsMandatory);
    if (mandatoryRules.length > 0) {
      const missingRules = mandatoryRules.filter((rule) => {
        const types = runtimeDocTypesForRule(rule as any);
        if (types.length === 0) {
          // Unknown mapping: treat title presence loosely via supportingDocs keys / batch types
          const title = String(rule.DocumentTitle || "").toLowerCase();
          return ![...presentDocs].some((d) => title.includes(d.replace(/_/g, " ")));
        }
        return !types.some((t) => presentDocs.has(t));
      });
      const hasBlock = missingRules.some((r) => r.MissingAction === "BLOCK");
      const severity: ValidationSeverity = missingRules.length
        ? hasBlock
          ? "FAIL"
          : "WARNING"
        : "PASS";
      const requiredLabels = mandatoryRules.map((r) => r.DocumentTitle).join(", ");
      const presentLabels = [...presentDocs]
        .map((d) => DOC_LABELS[d] || d)
        .join(", ");
      results.push(
        this.makeRule({
          sequence: 1,
          ruleCode: "DOC_COMPLETENESS",
          ruleName: "Document completeness",
          severity,
          expectedValue: requiredLabels,
          actualValue: presentLabels,
          message: missingRules.length
            ? `Missing: ${missingRules.map((r) => r.DocumentTitle).join(", ")}`
            : `All ${mandatoryRules.length} required documents are present.`,
          details: mandatoryRules.map((rule) => {
            const types = runtimeDocTypesForRule(rule as any);
            const present =
              types.length === 0
                ? false
                : types.some((t) => presentDocs.has(t));
            const missing = !present;
            const detailSeverity: ValidationSeverity = !missing
              ? "PASS"
              : rule.MissingAction === "BLOCK"
                ? "FAIL"
                : "WARNING";
            return {
              label: rule.DocumentTitle,
              value: present ? "Present" : "Missing",
              status: detailSeverity,
            };
          }),
          outcomeCode: missingRules[0]?.OutcomeCode || "DOC_COMPLETENESS",
          configVersionId: activeConfig?.configVersionId ?? null,
          // Aggregate rule — link first missing mandatory rule when failed
          documentRuleId: missingRules[0]?.RuleId ?? mandatoryRules[0]?.RuleId ?? null,
        }),
      );
      tempLogDocCompleteness({
        phase: "doc_completeness_from_config",
        invoiceTypeCode: payload.invoiceTypeCode || activeConfig?.invoiceTypeCode || null,
        workflow: payload.workflow || "PO",
        documentId: payload.documentId ?? null,
        configVersionId: activeConfig?.configVersionId ?? null,
        versionCode: activeConfig?.versionCode ?? null,
        presentRuntimeDocTypes: [...presentDocs],
        allConfigRules: (activeConfig?.documentRules || []).map((rule) => ({
          ruleId: rule.RuleId,
          documentTitle: rule.DocumentTitle,
          ruleCode: rule.RuleCode,
          isMandatory: rule.IsMandatory,
          missingAction: rule.MissingAction,
          checkScope: rule.CheckScope,
          status: rule.Status,
          scope: rule.Scope,
          configSeverity: rule.Severity,
          outcomeCode: rule.OutcomeCode,
          mappedRuntimeTypes: runtimeDocTypesForRule(rule as any),
        })),
        mandatoryRuleCount: mandatoryRules.length,
        checks: mandatoryRules.map((rule) => {
          const types = runtimeDocTypesForRule(rule as any);
          const present =
            types.length === 0
              ? [...presentDocs].some((d) =>
                  String(rule.DocumentTitle || "")
                    .toLowerCase()
                    .includes(d.replace(/_/g, " ")),
                )
              : types.some((t) => presentDocs.has(t));
          return {
            ruleId: rule.RuleId,
            documentTitle: rule.DocumentTitle,
            mappedRuntimeTypes: types,
            present,
            missingAction: rule.MissingAction,
          };
        }),
        missingTitles: missingRules.map((r) => r.DocumentTitle),
        resultSeverity: severity,
        resultMessage: missingRules.length
          ? `Missing: ${missingRules.map((r) => r.DocumentTitle).join(", ")}`
          : `All ${mandatoryRules.length} required documents are present.`,
      });
    } else {
      const missingDocs = REQUIRED_MANPOWER_DOCS.filter((doc) => !presentDocs.has(doc));
      const requiredLabels = REQUIRED_MANPOWER_DOCS.map((d) => DOC_LABELS[d] || d).join(", ");
      const presentLabels = [...presentDocs]
        .map((d) => DOC_LABELS[d] || d)
        .join(", ");
      results.push(
        this.makeRule({
          sequence: 1,
          ruleCode: "DOC_COMPLETENESS",
          ruleName: "Document completeness",
          severity: missingDocs.length ? "FAIL" : "PASS",
          expectedValue: requiredLabels,
          actualValue: presentLabels,
          message: missingDocs.length
            ? `Missing: ${missingDocs.map((d) => DOC_LABELS[d] || d).join(", ")}`
            : `All ${REQUIRED_MANPOWER_DOCS.length} required documents are present.`,
          details: REQUIRED_MANPOWER_DOCS.map((doc) => ({
            label: DOC_LABELS[doc] || doc,
            value: presentDocs.has(doc) ? "Present" : "Missing",
            status: presentDocs.has(doc) ? "PASS" : "FAIL",
          })),
          configVersionId: activeConfig?.configVersionId ?? null,
        }),
      );
      tempLogDocCompleteness({
        phase: "doc_completeness_hardcoded_fallback",
        reason: activeConfig
          ? "active_config_has_no_mandatory_document_rules"
          : "no_active_invoice_config_loaded",
        invoiceTypeCode: payload.invoiceTypeCode || activeConfig?.invoiceTypeCode || null,
        workflow: payload.workflow || "PO",
        documentId: payload.documentId ?? null,
        configVersionId: activeConfig?.configVersionId ?? null,
        versionCode: activeConfig?.versionCode ?? null,
        presentRuntimeDocTypes: [...presentDocs],
        allConfigRules: (activeConfig?.documentRules || []).map((rule) => ({
          ruleId: rule.RuleId,
          documentTitle: rule.DocumentTitle,
          isMandatory: rule.IsMandatory,
          missingAction: rule.MissingAction,
          status: rule.Status,
        })),
        hardcodedRequired: [...REQUIRED_MANPOWER_DOCS],
        missingHardcoded: missingDocs,
        resultSeverity: missingDocs.length ? "FAIL" : "PASS",
      });
    }

    let gatekeeperBlocked =
      results[0]?.severity === "FAIL" || results[0]?.severity === "BLOCKED";

    // ── 2. PO number → PO Master ──────────────────────────────────────────
    if (!poNumber) {
      results.push(
        this.makeRule({
          sequence: 2,
          ruleCode: "PO_NUMBER_MASTER",
          ruleName: "PO number → PO Master",
          severity: "FAIL",
          expectedValue: "Valid PO number on invoice",
          actualValue: header.poNumber ?? null,
          message: "No PO number was extracted from the invoice.",
        }),
      );
      this.failRemainingRules(
        results,
        3,
        "Cannot validate — PO number was not extracted from the invoice.",
      );
      return this.finalizeAndPersist(payload, null, null, false, results, {
        ldPct,
        ldAmount,
        advanceRecovery,
        retentionHeld,
        invoiceNet,
        taxAmount,
      });
    }

    const po = await this.fetchPoMaster(poNumber);
    const poOpen = po && String(po.POStatus || "").toLowerCase() !== "closed";
    results.push(
      this.makeRule({
        sequence: 2,
        ruleCode: "PO_NUMBER_MASTER",
        ruleName: "PO number → PO Master",
        severity: po && poOpen ? "PASS" : "FAIL",
        expectedValue: `${poNumber} (open in PO Master)`,
        actualValue: po ? `${po.PONo} · ${po.POStatus || "Unknown"}` : "Not found",
        message: !po
          ? `PO ${poNumber} was not found in PO Master.`
          : poOpen
            ? `PO ${poNumber} exists and is ${po.POStatus || "valid"}.`
            : `PO ${poNumber} exists but status is ${po.POStatus}.`,
        sourceTable: "PO_HEADER",
        sourceRecordId: po?.PONo ?? null,
      }),
    );

    const ses = await this.fetchSesHeader(poNumber);
    const sesNo = ses?.SESNo ?? null;
    const sesAmount = ses?.TotalSESValueIDR ?? null;

    if (!po) {
      this.failRemainingRules(
        results,
        3,
        `Cannot validate — PO ${poNumber} was not found in PO Master.`,
      );
      return this.finalizeAndPersist(payload, poNumber, sesNo, false, results, {
        ldPct,
        ldAmount,
        advanceRecovery,
        retentionHeld,
        invoiceNet,
        taxAmount,
      });
    }

    // ── 3. Vendor name: PO → Invoice ──────────────────────────────────────
    const vendorMatch = this.namesMatch(po.VendorName, header.vendorName);
    results.push(
      this.makeRule({
        sequence: 3,
        ruleCode: "VENDOR_PO_INVOICE",
        ruleName: "Vendor name: PO → Invoice",
        severity: vendorMatch ? "PASS" : "FAIL",
        expectedValue: po.VendorName,
        actualValue: header.vendorName ?? null,
        message: vendorMatch
          ? "Invoice vendor matches the PO vendor."
          : "Invoice vendor does not match the vendor on the PO.",
        sourceTable: "PO_HEADER",
        sourceRecordId: po.PONo,
      }),
    );

    // ── 4. Bank details → Vendor Master ───────────────────────────────────
    let bankRule: ValidationRuleResult;
    if (po.VendorId) {
      const bank = await VendorBankData.findOne({
        where: { Vendor_Id: po.VendorId, Is_Deleted: false },
      });
      const invoiceBankAccount = this.resolveInvoiceBankAccount(payload);
      const invoiceAcct = this.normalizeBankAccount(invoiceBankAccount);
      const masterAcct = this.normalizeBankAccount(bank?.Bank_Account_Number);
      if (!invoiceAcct) {
        bankRule = this.makeRule({
          sequence: 4,
          ruleCode: "BANK_VENDOR_MASTER",
          ruleName: "Bank details → Vendor Master",
          severity: "FAIL",
          expectedValue: bank?.Bank_Account_Number ?? masterAcct ?? null,
          actualValue: null,
          message: "Bank account number was not detected on the invoice.",
          sourceTable: "VENDOR_BANK",
        });
      } else if (!bank || !masterAcct) {
        bankRule = this.makeRule({
          sequence: 4,
          ruleCode: "BANK_VENDOR_MASTER",
          ruleName: "Bank details → Vendor Master",
          severity: "FAIL",
          expectedValue: null,
          actualValue: invoiceBankAccount ?? null,
          message: "Vendor bank account number is not on file in Vendor Master.",
          sourceTable: "VENDOR_BANK",
        });
      } else {
        const match = bankAccountsMatch(masterAcct, invoiceAcct);
        bankRule = this.makeRule({
          sequence: 4,
          ruleCode: "BANK_VENDOR_MASTER",
          ruleName: "Bank details → Vendor Master",
          severity: match ? "PASS" : "FAIL",
          expectedValue: bank.Bank_Account_Number ?? masterAcct,
          actualValue: invoiceBankAccount ?? invoiceAcct,
          message: match
            ? "Invoice bank account number matches Vendor Master."
            : "Invoice bank account number differs from Vendor Master — review for payment diversion risk.",
          sourceTable: "VENDOR_BANK",
        });
      }
    } else {
      bankRule = this.failRule(
        4,
        "BANK_VENDOR_MASTER",
        "Bank details → Vendor Master",
        "Cannot validate — vendor is not linked on the PO.",
      );
    }
    results.push(bankRule);

    const isPkp = this.resolveIsPkpVendor(po, header, presentDocs, taxAmount);

    // ── 5. Non-PKP vendor check ───────────────────────────────────────────
    if (isPkp) {
      results.push(
        this.naRule(
          5,
          "NON_PKP_VENDOR",
          "Non-PKP vendor check",
          "Not applicable — VAT is charged (PKP vendor or tax invoice with VAT on invoice).",
        ),
      );
    } else {
      const daysFromPo = this.daysBetweenDates(po.PODate, header.invoiceDate);
      const nameOk = vendorMatch;
      let severity: ValidationSeverity = "PASS";
      let message =
        "Non-PKP vendor name matches PO and invoice date is within 365 days of PO date.";
      if (!nameOk) {
        severity = "FAIL";
        message = "Non-PKP vendor name on invoice does not match the PO vendor.";
      } else if (daysFromPo === null) {
        severity = "FAIL";
        message = "PO date or invoice date missing — cannot verify the 365-day limit from PO date.";
      } else if (daysFromPo < 0) {
        severity = "FAIL";
        message = "Invoice date is before the PO date.";
      } else if (daysFromPo > 365) {
        severity = "FAIL";
        message = `Invoice is ${daysFromPo} days after PO date (limit 365 days).`;
      }
      const vendorStatus = nameOk ? "Match" : "Mismatch";
      results.push(
        this.makeRule({
          sequence: 5,
          ruleCode: "NON_PKP_VENDOR",
          ruleName: "Non-PKP vendor check",
          severity,
          expectedValue: `${po.VendorName || "PO vendor"} · invoice ≤ 365 days after PO date`,
          actualValue:
            daysFromPo !== null
              ? `${header.vendorName || "—"} (${vendorStatus}) · ${daysFromPo} days from PO date`
              : `${header.vendorName || "—"} (${vendorStatus}) · ${header.invoiceDate ?? "no invoice date"}`,
          message,
        }),
      );
    }

    // ── 6. Vendor + VAT vs Tax Invoice ────────────────────────────────────
    const taxDoc = this.getDoc(payload, "tax_invoice");
    const taxHdr = taxDoc.header || {};
    let taxRule: ValidationRuleResult;
    if (!isPkp) {
      taxRule = this.naRule(
        6,
        "TAX_INVOICE_MATCH",
        "Vendor + VAT vs Tax Invoice",
        "Not applicable — vendor is non-PKP.",
      );
    } else if (!presentDocs.has("tax_invoice")) {
      taxRule = this.makeRule({
        sequence: 6,
        ruleCode: "TAX_INVOICE_MATCH",
        ruleName: "Vendor + VAT vs Tax Invoice",
        severity: "FAIL",
        expectedValue: "Tax Invoice attached",
        actualValue: null,
        message: gatekeeperBlocked
          ? "Tax Invoice (Faktur Pajak) was not provided — required for PKP vendors."
          : "Tax Invoice (Faktur Pajak) is required for PKP vendors.",
      });
    } else {
      const taxVendorOk =
        !taxHdr.vendorName || this.namesMatch(taxHdr.vendorName, header.vendorName);
      const taxAmt = this.parseAmount(taxHdr.taxAmount);
      const vatOk =
        taxAmt !== null && taxAmount !== null
          ? this.withinRelativeTolerance(taxAmt, taxAmount, 0.01)
          : false;
      const severity: ValidationSeverity =
        taxVendorOk && vatOk ? "PASS" : "FAIL";
      taxRule = this.makeRule({
        sequence: 6,
        ruleCode: "TAX_INVOICE_MATCH",
        ruleName: "Vendor + VAT vs Tax Invoice",
        severity,
        expectedValue: `${header.vendorName || "—"} · VAT ${this.formatIDR(taxAmount)}`,
        actualValue: `${taxHdr.vendorName || header.vendorName || "—"} · VAT ${this.formatIDR(taxAmt)}`,
        message:
          taxVendorOk && vatOk
            ? "Tax Invoice vendor and VAT amount match the commercial invoice."
            : !taxVendorOk
              ? "Tax Invoice vendor differs from the commercial invoice."
              : "Tax Invoice VAT does not match the commercial invoice VAT.",
        details: [
          {
            label: "Vendor",
            value: taxVendorOk ? "Match" : "Mismatch",
            status: taxVendorOk ? "PASS" : "FAIL",
          },
          {
            label: "VAT amount",
            value:
              taxAmt !== null && taxAmount !== null
                ? `${this.formatIDR(taxAmount)} vs ${this.formatIDR(taxAmt)}`
                : "Missing",
            status: vatOk ? "PASS" : "FAIL",
          },
        ],
      });
    }
    results.push(taxRule);

    // ── 7. Quantity reconciliation ────────────────────────────────────────
    const baDoc = this.getDoc(payload, "berita_acara");
    const baHdr = baDoc.header || {};
    // Fix 3: defensive field name lookup for BA "This Man Hours" — field name varies by OCR prompt
    const baThisManhours = this.parseHours(
      baHdr.thisManhours ??
      baHdr.thisManHours ??
      baHdr.thisManhour ??
      baHdr["This Man Hours"] ??
      baHdr["This man hours"] ??
      baHdr.currentManhours ??
      baHdr.periodManhours
    );

    const summaryDoc = this.getDoc(payload, "manhour_summary");
    const summaryHdr = summaryDoc.header || {};
    const summaryLines = summaryDoc.lineItems || [];
    const mhTotals = this.resolveManhourSummaryTotals(summaryHdr, summaryLines);
    // summaryQty removed — was computed but never used

    const sesManhourLines = sesNo ? await this.fetchSesManhourLines(sesNo) : [];
    const sesTotals = this.sumSesAcceptedByCategory(sesManhourLines);

    // Presence flags — distinguish "absent" from "mismatched"
    const baHasManhours = baThisManhours !== null && baThisManhours > 0;
    const sesHasRegularMH = sesTotals.regular > 0;
    const sesHasOvertimeMH = sesTotals.overtime > 0;
    const mhHasOvertimeMH = mhTotals.overtime !== null && mhTotals.overtime > 0;

    const baRegularAligned =
      mhTotals.regular !== null &&
      mhTotals.regular > 0 &&
      baThisManhours !== null &&
      baThisManhours > 0 &&
      this.withinRelativeTolerance(mhTotals.regular, baThisManhours, 0.01);

    const regularAligned =
      mhTotals.regular !== null &&
      mhTotals.regular > 0 &&
      sesHasRegularMH &&
      this.withinRelativeTolerance(mhTotals.regular, sesTotals.regular, 0.01);

    const overtimeAligned =
      mhHasOvertimeMH &&
      sesHasOvertimeMH &&
      this.withinRelativeTolerance(mhTotals.overtime!, sesTotals.overtime, 0.01);

    const requiresRegular =
      mhTotals.regular !== null && mhTotals.regular > 0;
    const requiresOvertime = mhHasOvertimeMH;
    const requiresBeritaAcaraRegular =
      requiresRegular && presentDocs.has("berita_acara");

    // POC N/A flag: SES has no MH-unit lines (uses Man-Month/LOT) and BA has no manhour field.
    // In these cases cross-document MH validation is not applicable for this contract type.
    const sesUsesNonMhUnits = !sesHasRegularMH && !sesHasOvertimeMH;
    const qtyNa =
      sesUsesNonMhUnits &&
      !baHasManhours &&
      requiresRegular; // manhour summary was provided — we have something to report

    const qtyDetails: ValidationRuleDetail[] = [
      {
        label: "Total Regular MH (Manhour Summary)",
        value: this.formatMhQty(mhTotals.regular),
        status: requiresRegular
          ? regularAligned && (!requiresBeritaAcaraRegular || baRegularAligned)
            ? "PASS"
            : "FAIL"
          : undefined,
      },
      {
        label: "Total OT MH (Manhour Summary)",
        value: this.formatMhQty(mhTotals.overtime ?? 0),
        status: requiresOvertime
          ? sesHasOvertimeMH && overtimeAligned
            ? "PASS"
            : "FAIL"
          : "PASS",
      },
      {
        label: "This Man Hours (Berita Acara)",
        value: this.formatMhQty(baThisManhours ?? 0),
        status: requiresBeritaAcaraRegular
          ? baRegularAligned
            ? "PASS"
            : "FAIL"
          : undefined,
      },
      {
        label: "SES Accepted Qty (Regular MH)",
        value: this.formatMhQty(sesTotals.regular || 0),
        status: requiresRegular
          ? regularAligned
            ? "PASS"
            : "FAIL"
          : undefined,
      },
      {
        label: "SES Accepted Qty (OT-HRS)",
        value: this.formatMhQty(sesTotals.overtime || 0),
        status: requiresOvertime
          ? sesHasOvertimeMH && overtimeAligned
            ? "PASS"
            : "FAIL"
          : !sesHasOvertimeMH
            ? "PASS"
            : undefined,
      },
    ];

    const hasComparableTotals = requiresRegular || requiresOvertime;

    let qtySeverity: ValidationSeverity = "FAIL";
    let qtyMessage = gatekeeperBlocked
      ? "Cannot validate — required supporting documents were not provided."
      : "Insufficient quantity data to reconcile Manhour Summary against Berita Acara and SES.";

    if (!sesNo) {
      qtyMessage = "Cannot validate — no SES found for this PO.";
    } else if (!presentDocs.has("manhour_summary") || !hasComparableTotals) {
      qtyMessage = gatekeeperBlocked
        ? "Cannot validate — Manhour Summary was not provided."
        : "Cannot validate — Manhour Summary regular/overtime totals were not extracted.";
    } else if (qtyNa) {
      qtySeverity = "FAIL";
      qtyMessage = `Cannot confirm quantity — Manhour Summary shows ${mhTotals.regular!.toFixed(1)} regular MH but SES has no MH unit lines (uses Man-Month/LOT unit) and Berita Acara does not contain "This Man Hours". Supporting documents are insufficient to cross-validate manhours for this period.`;
    } else if (
      (requiresRegular && sesTotals.regular <= 0) ||
      (requiresOvertime && sesTotals.overtime <= 0)
    ) {
      qtyMessage = gatekeeperBlocked
        ? "Cannot validate — SES manhour lines were not available."
        : "Cannot validate — SES has no MH lines matching the regular or overtime manhour categories.";
    } else if (
      requiresBeritaAcaraRegular &&
      (baThisManhours === null || baThisManhours <= 0)
    ) {
      qtyMessage = gatekeeperBlocked
        ? "Cannot validate — Berita Acara was not provided."
        : 'Cannot validate — Berita Acara "This Man Hours" was not extracted from the progress table.';
    } else {
      const failures: string[] = [];
      if (requiresBeritaAcaraRegular && !baRegularAligned) {
        failures.push(
          `regular MH (summary ${mhTotals.regular!.toFixed(1)} vs Berita Acara ${baThisManhours!.toFixed(1)})`,
        );
      }
      if (requiresRegular && !regularAligned) {
        failures.push(
          `regular MH (summary ${mhTotals.regular!.toFixed(1)} vs SES regular ${sesTotals.regular.toFixed(1)})`,
        );
      }
      if (requiresOvertime && !overtimeAligned) {
        failures.push(
          `overtime MH (summary ${mhTotals.overtime!.toFixed(1)} vs SES overtime ${sesTotals.overtime.toFixed(1)})`,
        );
      }

      if (failures.length) {
        qtySeverity = "FAIL";
        qtyMessage = `Quantity mismatch: ${failures.join("; ")}.`;
      } else {
        qtySeverity = "PASS";
        const parts: string[] = [];
        if (requiresRegular) {
          parts.push(`regular ${mhTotals.regular!.toFixed(1)} MH`);
        }
        if (requiresOvertime) {
          parts.push(`overtime ${mhTotals.overtime!.toFixed(1)} MH`);
        }
        qtyMessage = `Manhour Summary aligns with Berita Acara and SES Accepted Qty (${parts.join(" · ")}).`;
      }
    }

    results.push(
      this.makeRule({
        sequence: 7,
        ruleCode: "QTY_RECONCILIATION",
        ruleName: "Quantity reconciliation",
        severity: qtySeverity,
        expectedValue: `Summary: regular ${this.formatMhQty(mhTotals.regular)} · OT ${this.formatMhQty(mhTotals.overtime)}`,
        actualValue: `Berita Acara: ${this.formatMhQty(baThisManhours)} · SES Regular MH ${this.formatMhQty(sesTotals.regular || null)} · SES OT-HRS ${this.formatMhQty(sesTotals.overtime || null)}`,
        message: qtyMessage,
        details: qtyDetails,
        sourceTable: sesNo ? "AP_SES_DETAIL" : null,
        sourceRecordId: sesNo,
      }),
    );

    // ── 8. Rate validation (dynamic roles — not limited to Welder/Fitter) ──
    const invoiceLineItems = this.prepareInvoiceLineItemsForRateValidation(payload);
    const roleMap = this.extractRolesFromManhourLines(summaryLines);
    const knownRoles = [...roleMap.keys()];

    // Build invoice amounts per role from invoice line descriptions
    const invoiceDirectByRole = new Map<string, number | null>();
    const invoiceOtByRole = new Map<string, number | null>();
    for (const role of knownRoles) {
      invoiceDirectByRole.set(role, null);
      invoiceOtByRole.set(role, null);
    }
    for (const line of invoiceLineItems) {
      const desc = String(line.description ?? "").toUpperCase();
      if (!desc) continue;
      const isDirect = /DIRECT\s*COST/.test(desc);
      const isOvertime = /\bOVERTIME\b/.test(desc) || /(?<![A-Z])OT(?![A-Z])/.test(desc);
      if (!isDirect && !isOvertime) continue;
      const amt =
        this.parseAmount(line.amount) ??
        this.parseAmount(line.lineValue) ??
        this.parseAmount(line.totalPrice);
      if (amt == null || amt <= 0) continue;
      for (const role of knownRoles) {
        if (desc.includes(role.toUpperCase())) {
          if (isDirect && invoiceDirectByRole.get(role) == null) invoiceDirectByRole.set(role, amt);
          else if (isOvertime && invoiceOtByRole.get(role) == null) invoiceOtByRole.set(role, amt);
          break;
        }
      }
    }

    // Get appendix-level PO rates per role (overrides manhour summary rate when present)
    const appendixRates = new Map<string, number>();
    const appendixDoc = this.getDoc(payload, "po_appendix");
    for (const line of appendixDoc.lineItems || []) {
      const roleText = String(line.manpowerRole ?? line.role ?? line.description ?? "").trim();
      const rate = this.parseAmount(line.unitPrice);
      if (!roleText || !rate || rate <= 0) continue;
      const role = this.normalizeRoleKey(roleText);
      if (role && !appendixRates.has(role)) appendixRates.set(role, rate);
    }

    // Build rate rows dynamically per role
    const rateRows: ValidationRuleDetail[] = [];
    for (const [role, data] of roleMap) {
      const poRate = appendixRates.get(role) ?? data.unitPrice;
      rateRows.push(
        this.buildRateValidationRow({
          category: `${role} Regular`,
          invoicedAmount: invoiceDirectByRole.get(role) ?? null,
          hours: data.regularHours > 0 ? data.regularHours : null,
          poRate,
        }),
      );
      if (data.otHours > 0 || (invoiceOtByRole.get(role) ?? null) != null) {
        rateRows.push(
          this.buildRateValidationRow({
            category: `${role} OT`,
            invoicedAmount: invoiceOtByRole.get(role) ?? null,
            hours: data.otHours > 0 ? data.otHours : null,
            poRate,
          }),
        );
      }
    }

    const comparableRows = rateRows.filter(
      (row) => row.appliedRate !== null && row.poRate !== null,
    );
    const mismatchedRows = comparableRows.filter((row) => row.status === "FAIL");
    const failedRows = rateRows.filter((row) => row.status === "FAIL");
    const hasAnyInvoiceAmounts = knownRoles.some(
      (r) => (invoiceDirectByRole.get(r) ?? null) != null || (invoiceOtByRole.get(r) ?? null) != null,
    );

    let rateSeverity: ValidationSeverity = "FAIL";
    let rateMessage = gatekeeperBlocked
      ? "Cannot validate — required documents for rate validation were not provided."
      : "Rate could not be validated (missing invoice amounts, manhour hours, or PO rates).";

    if (!presentDocs.has("manhour_summary")) {
      rateMessage = gatekeeperBlocked
        ? rateMessage
        : "Cannot validate — Summary Calculation Manhour was not provided.";
    } else if (knownRoles.length === 0) {
      rateMessage =
        "Cannot validate — no manpower roles found in Summary Calculation Manhour.";
    } else if (!hasAnyInvoiceAmounts) {
      rateMessage =
        "Cannot validate — invoice is missing Direct Cost / Overtime line items matching any manpower role.";
    } else if (failedRows.length > 0 && comparableRows.length === 0) {
      const incomplete = failedRows.length;
      rateMessage = `${incomplete} of ${rateRows.length} categories could not be calculated (missing amount, hours, or contract rate).`;
    } else if (failedRows.length > 0) {
      const issueSummary = failedRows
        .map((row) => `${row.label}: ${row.issue || row.value}`)
        .join("; ");
      rateMessage = `FAIL: ${issueSummary}.`;
    } else if (
      comparableRows.length > 0 &&
      mismatchedRows.length === 0 &&
      failedRows.length === 0
    ) {
      rateSeverity = "PASS";
      const roleList = knownRoles.join(", ");
      rateMessage = `PASS: Applied rates (invoice amount ÷ manhour hours) match PO contract rates for all ${rateRows.length} categories (${roleList}).`;
    } else {
      rateMessage =
        "Rate validation incomplete — could not derive applied rates for all role categories.";
    }

    const rateExpected = knownRoles
      .map((r) => {
        const rate = appendixRates.get(r) ?? roleMap.get(r)?.unitPrice;
        return rate != null ? `${r} IDR ${this.formatIDR(rate)}/hr` : null;
      })
      .filter(Boolean)
      .join(" · ");

    results.push(
      this.makeRule({
        sequence: 8,
        ruleCode: "RATE_VALIDATION",
        ruleName: "Rate validation",
        severity: rateSeverity,
        expectedValue: rateExpected || "PO contract rates per role",
        actualValue:
          comparableRows.length > 0
            ? `${comparableRows.filter((row) => row.status === "PASS").length}/${comparableRows.length} categories match`
            : "—",
        message: rateMessage,
        sourceTable: "PO_DETAIL",
        sourceRecordId: po.PONo,
        details: rateRows,
      }),
    );

    // ── 9. Late delivery / LD ─────────────────────────────────────────────
    if (!po.LDApplicable) {
      results.push(
        this.naRule(
          9,
          "LATE_DELIVERY_LD",
          "Late delivery / LD",
          "Not applicable — LD is not applicable per PO terms.",
        ),
      );
    } else {
      const baDoc = this.getDoc(payload, "berita_acara");
      const actualDate =
        baDoc.header?.deliveryDate ||
        baDoc.header?.periodEnd ||
        header.invoiceDate;
      const plannedDate = po.DeliveryEndDate;
      let ldSeverity: ValidationSeverity = "FAIL";
      let ldMessage = gatekeeperBlocked
        ? "Cannot validate — Berita Acara or invoice date was not provided for LD calculation."
        : "Delivery dates not available for LD calculation.";

      if (plannedDate && actualDate) {
        const planned = new Date(String(plannedDate));
        const actual = new Date(String(actualDate));
        const daysLate = Math.ceil(
          (actual.getTime() - planned.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (daysLate <= 0) {
          ldSeverity = "PASS";
          ldMessage = "Delivered on or before the PO delivery date.";
        } else {
          const weeksLate = Math.ceil(daysLate / 7);
          const rate = po.LDRatePerWeek ?? 1;
          const cap = po.LDMaxPercentage ?? 10;
          ldPct = Math.min(weeksLate * rate, cap);
          ldAmount = invoiceNet ? (invoiceNet * ldPct) / 100 : 0;
          ldSeverity = "FAIL";
          ldMessage = `${daysLate} days late → LD ${ldPct}% (IDR ${this.formatIDR(ldAmount)}).`;
        }
      }

      results.push(
        this.makeRule({
          sequence: 9,
          ruleCode: "LATE_DELIVERY_LD",
          ruleName: "Late delivery / LD",
          severity: ldSeverity,
          expectedValue: plannedDate ? String(plannedDate).slice(0, 10) : "On time",
          actualValue: actualDate ? String(actualDate).slice(0, 10) : "—",
          message: ldMessage,
          variance: ldAmount || null,
        }),
      );
    }

    // ── 10. Total PO value — invoice must not exceed PO total ─────────────
    const extractedPoValue = this.resolvePoValueFromExtract(payload);
    const poValue = extractedPoValue ?? po.POValue ?? ses?.POValue ?? null;
    const poValueSource = extractedPoValue !== null ? "PO_EXTRACT" : "PO_HEADER";
    let poValueSeverity: ValidationSeverity = "FAIL";
    let poValueMessage = gatekeeperBlocked
      ? "Cannot validate — invoice document or amount was not provided."
      : "Invoice total is missing — cannot compare against PO value.";

    if (poValue !== null && invoiceTotal !== null) {
      const ok = invoiceTotal <= poValue;
      poValueSeverity = ok ? "PASS" : "FAIL";
      poValueMessage = ok
        ? `Invoice total (IDR ${this.formatIDR(invoiceTotal)}) is within PO value (IDR ${this.formatIDR(poValue)}).`
        : `Invoice total (IDR ${this.formatIDR(invoiceTotal)}) exceeds PO value (IDR ${this.formatIDR(poValue)}) by IDR ${this.formatIDR(invoiceTotal - poValue)}.`;
    } else if (poValue === null) {
      poValueMessage = "PO total value is not available for comparison.";
    }

    results.push(
      this.makeRule({
        sequence: 10,
        ruleCode: "PO_VALUE_ZERO_TOLERANCE",
        ruleName: "Total PO value (0% tolerance)",
        severity: poValueSeverity,
        expectedValue: poValue !== null ? `≤ IDR ${this.formatIDR(poValue)}` : "PO total value",
        actualValue:
          invoiceTotal !== null ? `IDR ${this.formatIDR(invoiceTotal)}` : "—",
        message: poValueMessage,
        variance:
          poValue !== null && invoiceTotal !== null
            ? Number((invoiceTotal - poValue).toFixed(2))
            : null,
        sourceTable: poValueSource,
        sourceRecordId: po.PONo,
        details: [
          {
            label: "PO total value",
            value:
              poValue !== null ? `IDR ${this.formatIDR(poValue)}` : "—",
          },
          {
            label: "Invoice total",
            value:
              invoiceTotal !== null
                ? `IDR ${this.formatIDR(invoiceTotal)}`
                : "—",
            status:
              poValue !== null && invoiceTotal !== null
                ? invoiceTotal <= poValue
                  ? "PASS"
                  : "FAIL"
                : undefined,
          },
        ],
      }),
    );

    // ── 11. SES deviation (0% tolerance) ──────────────────────────────────
    const invoiceAmount = subtotal ?? totalAmount;
    const maxSes = invoiceAmount;

    let sesSeverity: ValidationSeverity = "FAIL";
    let sesMessage = gatekeeperBlocked
      ? "Fail — SES document was not provided, so SES total cannot be compared to the invoice."
      : !presentDocs.has("ses")
        ? "Fail — SES document was not provided."
        : "Fail — SES total value is not available for comparison.";

    const sesDetailsBase = {
      subtotal,
      invoiceAmount,
      maxSes,
      sesAmount: null as number | null,
      sesSeverity,
    };

    if (sesAmount !== null && invoiceAmount !== null && invoiceAmount > 0) {
      const diffPct = ((sesAmount - invoiceAmount) / invoiceAmount) * 100;
      const diffIdr = sesAmount - invoiceAmount;

      if (sesAmount < invoiceAmount) {
        sesSeverity = "FAIL";
        sesMessage = `Fail — SES total (IDR ${this.formatIDR(sesAmount)}) is below the invoice amount (IDR ${this.formatIDR(invoiceAmount)}). The invoice bills more than the SES confirms.`;
      } else if (sesAmount > invoiceAmount) {
        sesSeverity = "FAIL";
        sesMessage = `Fail — SES total (IDR ${this.formatIDR(sesAmount)}) exceeds the invoice amount (IDR ${this.formatIDR(invoiceAmount)}) by IDR ${this.formatIDR(diffIdr)} (${diffPct.toFixed(1)}%).`;
      } else {
        sesSeverity = "PASS";
        sesMessage = `Pass — SES total (IDR ${this.formatIDR(sesAmount)}) matches the invoice amount (IDR ${this.formatIDR(invoiceAmount)}).`;
      }

      results.push(
        this.makeRule({
          sequence: 11,
          ruleCode: "SES_DEVIATION",
          ruleName: "SES vs invoice deviation",
          severity: sesSeverity,
          expectedValue:
            invoiceAmount != null
              ? `SES total must match the invoice amount (IDR ${this.formatIDR(invoiceAmount)}, 0% tolerance).`
              : "SES total must exactly match the invoice amount (0% tolerance).",
          actualValue: this.formatSesDifference(diffIdr, diffPct),
          message: sesMessage,
          variance: Number(diffIdr.toFixed(2)),
          details: this.buildSesDeviationDetails({
            ...sesDetailsBase,
            sesAmount,
            sesSeverity,
          }),
          sourceTable: "AP_SES_HEADER",
          sourceRecordId: sesNo,
        }),
      );
    } else {
      results.push(
        this.makeRule({
          sequence: 11,
          ruleCode: "SES_DEVIATION",
          ruleName: "SES vs invoice deviation",
          severity: sesSeverity,
          expectedValue:
            invoiceAmount != null
              ? `SES total must match the invoice amount (IDR ${this.formatIDR(invoiceAmount)}, 0% tolerance).`
              : "SES total must exactly match the invoice amount (0% tolerance).",
          actualValue: "—",
          message: sesMessage,
          variance:
            sesAmount !== null && invoiceAmount !== null
              ? Number((sesAmount - invoiceAmount).toFixed(2))
              : null,
          details: this.buildSesDeviationDetails(sesDetailsBase),
          sourceTable: "AP_SES_HEADER",
          sourceRecordId: sesNo,
        }),
      );
    }

    // ── 12. Advance recovery & retention ──────────────────────────────────
    results.push(
      this.naRule(
        12,
        "ADVANCE_RETENTION",
        "Advance recovery & retention",
        "Not applicable — no advance or retention terms configured on this PO.",
      ),
    );

    return this.finalizeAndPersist(payload, poNumber, sesNo, true, results, {
      ldPct,
      ldAmount,
      advanceRecovery,
      retentionHeld,
      invoiceNet,
      taxAmount,
    });
  }

  private async finalizeAndPersist(
    payload: ValidateInvoicePayload,
    poNumber: string | null,
    sesNo: string | null,
    matched: boolean,
    results: ValidationRuleResult[],
    commercial: {
      ldPct: number;
      ldAmount: number;
      advanceRecovery: number;
      retentionHeld: number;
      invoiceNet: number | null;
      taxAmount: number | null;
    },
  ): Promise<InvoiceValidationResult> {
    const ordered = this.orderResults(results);
    const finalResult = this.finalize(
      poNumber,
      sesNo,
      matched,
      ordered,
      commercial,
    );

    // SAP mapping mock — fold FAIL/WARNING into overallStatus before persist
    // so WorkflowStage becomes review (never draft from SAP).
    const sap = await sapFieldMappingValidationService.validateAndLog(payload);
    let sapMappingApplied = false;
    let extraFailedChecks = 0;
    if (sap?.hasFailOrWarning) {
      sapMappingApplied = true;
      extraFailedChecks = sap.failCount;
      if (sap.failCount > 0) {
        finalResult.overallStatus = "FAIL";
      } else if (finalResult.overallStatus === "PASS") {
        // Warnings alone: not PASS → updateEssaInvoiceAfterValidation → review
        finalResult.overallStatus = "WARNING";
      }
      finalResult.summary = {
        ...finalResult.summary,
        failed: finalResult.summary.failed + sap.failCount,
        warnings: finalResult.summary.warnings + sap.warningCount,
      };
    }

    if (payload.documentId || payload.invoiceHeaderId) {
      await this.persistResults(
        {
          documentId: payload.documentId,
          invoiceHeaderId: payload.invoiceHeaderId,
          createdBy: payload.createdBy,
          triggerEvent: payload.triggerEvent || "INITIAL_VALIDATION",
          extraFailedChecks,
        },
        finalResult,
      );
    }

    logger.info("[VALIDATION]", {
      documentId: payload.documentId ?? null,
      invoiceHeaderId: payload.invoiceHeaderId ?? null,
      poNumber: finalResult.poNumber,
      sesNo: finalResult.sesNo,
      overallStatus: finalResult.overallStatus,
      summary: finalResult.summary,
      validationRunId: finalResult.validationRunId ?? null,
      sapMappingApplied,
      sapMappingSummary: sap?.summary ?? null,
      rules: finalResult.results.map((r) => ({
        ruleCode: r.ruleCode,
        severity: r.severity,
        expected: r.expectedValue,
        actual: r.actualValue,
        message: r.message,
      })),
    });

    return finalResult;
  }

  private orderResults(results: ValidationRuleResult[]): ValidationRuleResult[] {
    const byCode = new Map(results.map((r) => [r.ruleCode, r]));
    return RULE_DEFINITIONS.map((def) => {
      const found = byCode.get(def.ruleCode);
      if (found) return { ...found, sequence: def.sequence };
      return this.failRule(
        def.sequence,
        def.ruleCode,
        def.ruleName,
        "Validation did not evaluate this rule.",
      );
    });
  }

  private finalize(
    poNumber: string | null,
    sesNo: string | null,
    matched: boolean,
    results: ValidationRuleResult[],
    commercial: {
      ldPct: number;
      ldAmount: number;
      advanceRecovery: number;
      retentionHeld: number;
      invoiceNet: number | null;
      taxAmount: number | null;
    },
  ): InvoiceValidationResult {
    const countsAsPass = (rule: ValidationRuleResult) =>
      rule.severity === "PASS" ||
      rule.severity === "SKIP" ||
      /not applicable/i.test(String(rule.message || ""));

    const summary = {
      total: results.length,
      passed: results.filter(countsAsPass).length,
      warnings: results.filter((r) => r.severity === "WARNING").length,
      failed: results.filter((r) => r.severity === "FAIL").length,
      blocked: results.filter((r) => r.severity === "BLOCKED").length,
      skipped: results.filter(
        (r) => r.severity === "SKIP" || /not applicable/i.test(String(r.message || "")),
      ).length,
    };

    let overallStatus: ValidationSeverity = "PASS";
    if (summary.failed > 0 || summary.blocked > 0) overallStatus = "FAIL";

    const vat = commercial.taxAmount ?? 0;
    const net =
      commercial.invoiceNet !== null
        ? Math.max(
          0,
          commercial.invoiceNet -
          commercial.ldAmount -
          commercial.advanceRecovery -
          commercial.retentionHeld +
          vat,
        )
        : null;

    const configVersionId =
      results.find((r) => r.configVersionId != null)?.configVersionId ?? null;

    return {
      poNumber,
      sesNo,
      matched,
      overallStatus,
      summary,
      results: results.map((r) => ({
        ...r,
        configVersionId: r.configVersionId ?? configVersionId,
      })),
      ld_pct: commercial.ldPct,
      ld_amount: commercial.ldAmount,
      advance_recovery: commercial.advanceRecovery,
      retention_held: commercial.retentionHeld,
      net_payable: net,
      configVersionId,
    };
  }
}

export default new ApInvoiceValidationService();
