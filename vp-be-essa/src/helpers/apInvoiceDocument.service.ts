import { Op } from "sequelize";
import { ApDocument } from "../models/apDocument";
import { ApDocumentExtraction } from "../models/apDocumentExtraction";
import { ApValidationResult } from "../models/apValidationResult";
import { EssaInvoice } from "../models/essaInvoice";
import { EssaSlaInstance } from "../models/essaSlaInstance";
import type { InvoiceExtractionResult } from "./apInvoiceOcr.service";
import logger from "../utils/logger";
import slaEngine from "./slaEngine.service";
import slaService, { remainingMsOf } from "./sla.service";
import { mintCorrelationId } from "./auditEvent.service";
import { auditInvoiceCreated } from "./essaInvoiceActions.service";
import {
  auditDocAssociated,
  auditDocReplaced,
  auditSupersede,
} from "./invoiceProcessAudit.service";
import {
  canonicalDocTypeKey,
  documentTypesMatch,
  inferDocTypeFromFileName,
  normalizeDocTypeKey,
} from "./apDocumentTypeCanon";

const LINE_ITEMS_FIELD = "__lineItems__";
const PAYLOAD_FIELD = "__payload__";
const BATCH_PRIMARY_FIELD = "__batchPrimary__";
const BATCH_PRIMARY_ID_FIELD = "__batchPrimaryId__";
const BATCH_SNAPSHOT_FIELD = "__batchSnapshot__";
const DOCUMENT_TYPE_FIELD = "documentType";
const STRUCTURED_FIELDS_FIELD = "__structuredFields__";
const CONFIG_HASH_FIELD = "__configHash__";
const SOURCE_CHANNEL_FIELD = "__sourceChannel__";
const EMAIL_FROM_FIELD = "__emailFrom__";
const EMAIL_SUBJECT_FIELD = "__emailSubject__";
const EMAIL_MESSAGE_ID_FIELD = "__emailMessageId__";
const EMAIL_RECEIVED_AT_FIELD = "__emailReceivedAt__";
const EMAIL_VENDOR_ID_FIELD = "__emailVendorId__";
const EMAIL_VENDOR_MATCHED_FIELD = "__emailVendorMatched__";

const STRUCTURED_ARRAY_FIELDS: Record<string, string> = {
  timesheetEntries: "__timesheetEntries__",
  attendanceEntries: "__attendanceEntries__",
  manhourSummary: "__manhourSummary__",
  tables: "__tables__",
  poLineItems: "__poLineItems__",
  appendixItems: "__appendixItems__",
  invoiceLineItems: "__invoiceLineItems__",
};

const INVOICE_NUMBER_FIELD_NAMES = ["invoiceNumber", "invNo", "invoice_no"];

const normalizeInvoiceNumberForComparison = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const escapeLikePattern = (value: string): string =>
  value.replace(/[%_[\]\\]/g, (char) => `[${char}]`);
const RESERVED_FIELD_NAMES = new Set([
  LINE_ITEMS_FIELD,
  PAYLOAD_FIELD,
  BATCH_PRIMARY_FIELD,
  BATCH_PRIMARY_ID_FIELD,
  BATCH_SNAPSHOT_FIELD,
  DOCUMENT_TYPE_FIELD,
  STRUCTURED_FIELDS_FIELD,
  CONFIG_HASH_FIELD,
  SOURCE_CHANNEL_FIELD,
  EMAIL_FROM_FIELD,
  EMAIL_SUBJECT_FIELD,
  EMAIL_MESSAGE_ID_FIELD,
  EMAIL_RECEIVED_AT_FIELD,
  EMAIL_VENDOR_ID_FIELD,
  EMAIL_VENDOR_MATCHED_FIELD,
  ...Object.values(STRUCTURED_ARRAY_FIELDS),
]);

export {
  SOURCE_CHANNEL_FIELD,
  EMAIL_FROM_FIELD,
  EMAIL_SUBJECT_FIELD,
  EMAIL_MESSAGE_ID_FIELD,
  EMAIL_RECEIVED_AT_FIELD,
  EMAIL_VENDOR_ID_FIELD,
  EMAIL_VENDOR_MATCHED_FIELD,
};

const PRIMARY_DOC_PRIORITY = [
  "invoice",
  "receipt",
  "tax_invoice",
  "berita_acara",
  "ses",
  "po",
  "manhour_summary",
  "timesheet",
  "attendance",
  "po_appendix",
];

export class DuplicateInvoiceError extends Error {
  invoiceNumber: string;

  constructor(invoiceNumber: string) {
    super(`Invoice ${invoiceNumber} already exists and cannot be processed.`);
    this.name = "DuplicateInvoiceError";
    this.invoiceNumber = invoiceNumber;
  }
}

export interface ReconstructedExtraction {
  document: ApDocument;
  header: Record<string, string | null>;
  lineItems: Array<Record<string, string | null>>;
}

export interface NormalizedOcrDocument {
  documentType: string;
  header: Record<string, string | null>;
  lineItems: Array<Record<string, unknown>>;
  fields: Array<{ fieldName?: string; name?: string; confidence?: number }>;
  status: string;
  configHash?: string | null;
  raw: Record<string, unknown>;
}

export interface PersistedUploadListRow {
  id: string;
  documentId: number;
  invoice_no: string | null;
  invoice_date: string | null;
  vendor_name: string | null;
  po_number: string | null;
  total_amount: number | null;
  currency: string;
  invoice_type: string;
  invoice_workflow: "PO" | "NON_PO";
  status: string;
  overall: string;
  uploaded_at: string;
  uploaded_by: number | null;
  file_name: string | null;
  failed_checks: number;
  openExceptions: number;
  sla_breached: boolean;
  workflow_stage: string;
  next_pending_role: string | null;
  source_channel: "UPLOAD" | "EMAIL" | "SHAREPOINT";
  email_from: string | null;
  email_subject: string | null;
  email_received_at: string | null;
}

export type PersistExtractEmailMeta = {
  fromAddress?: string | null;
  subject?: string | null;
  messageId?: string | null;
  receivedAt?: string | null;
  vendorId?: number | null;
  vendorMatched?: boolean;
};

type PersistExtractOptions = {
  uploadedBy?: number;
  traceId?: string;
  /** OCR documentType → config hash at extract time */
  configHashesByOcrType?: Record<string, string>;
  sourceChannel?: "UPLOAD" | "EMAIL" | "SHAREPOINT";
  emailMeta?: PersistExtractEmailMeta;
  storedFilePath?: string | null;
};

const PO_NUMBER_PATTERN = /\b(4203\d{6})\b/;

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const parseAmount = (value: unknown): number | null => {
  if (value == null || value === "") return null;

  let s = String(value)
    .replace(/Rp\.?/gi, "")
    .replace(/\s/g, "")
    .trim();
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return null;

  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;

  if (dotCount > 1) {
    s = s.replace(/\./g, "");
  } else if (commaCount > 1) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  }

  if (/^\d{1,3}\.\d{3}$/.test(s)) {
    s = s.replace(".", "");
  }

  const parsed = Number(s);
  return Number.isFinite(parsed) ? parsed : null;
};

const CURRENCY_NAME_TO_CODE: Array<[RegExp, string]> = [
  [/rupiah|\bidr\b|^rp$/i, "IDR"],
  [/dollar|usd/i, "USD"],
  [/singapore|\bsgd\b/i, "SGD"],
  [/euro|\beur\b/i, "EUR"],
];

/** ESSA_INVOICE.Currency is VARCHAR(10) — OCR often returns "Indonesian Rupiah". */
const normalizeCurrencyCode = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "IDR";
  const upper = raw.toUpperCase();
  const iso = upper.match(/\b([A-Z]{3})\b/);
  if (iso && !["THE", "AND", "FOR"].includes(iso[1])) return iso[1];
  for (const [pattern, code] of CURRENCY_NAME_TO_CODE) {
    if (pattern.test(raw)) return code;
  }
  return upper.slice(0, 10);
};

const coerceEssaPoNumber = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "object") return null;
  const text = String(value);
  const digits = text.replace(/\D/g, "");
  if (/^4203\d{6}$/.test(digits)) return digits;
  return text.match(PO_NUMBER_PATTERN)?.[1] ?? null;
};

const extractPoNumber = (header: Record<string, string | null>): string | null => {
  return (
    coerceEssaPoNumber(header.poNumber) ||
    coerceEssaPoNumber(header.contractOrderNo) ||
    coerceEssaPoNumber(header.po_number) ||
    coerceEssaPoNumber(header.PONo)
  );
};

const collectPoNumberFromUnknown = (value: unknown, depth = 0): string | null => {
  if (value == null || depth > 6) return null;
  if (typeof value === "string" || typeof value === "number") {
    return coerceEssaPoNumber(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = collectPoNumberFromUnknown(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  for (const key of ["poNumber", "po_number", "PONo", "poNo", "PoNumber"]) {
    const found = coerceEssaPoNumber(rec[key]);
    if (found) return found;
  }
  for (const nested of Object.values(rec)) {
    const found = collectPoNumberFromUnknown(nested, depth + 1);
    if (found) return found;
  }
  return null;
};

const collectPoNumberFromSnapshot = (
  snapshot: Record<string, unknown>,
  invoiceHeader: Record<string, string | null>,
): string | null => {
  const fromInvoice = extractPoNumber(invoiceHeader);
  if (fromInvoice) return fromInvoice;

  const meta =
    snapshot.meta && typeof snapshot.meta === "object"
      ? (snapshot.meta as Record<string, unknown>)
      : {};
  const validation =
    snapshot.validation && typeof snapshot.validation === "object"
      ? (snapshot.validation as Record<string, unknown>)
      : {};

  return (
    coerceEssaPoNumber(snapshot.poNumber) ||
    coerceEssaPoNumber(snapshot.po_number) ||
    coerceEssaPoNumber(meta.poNumber) ||
    coerceEssaPoNumber(validation.poNumber) ||
    collectPoNumberFromUnknown(snapshot.documents) ||
    collectPoNumberFromUnknown(snapshot.ocr_by_type) ||
    collectPoNumberFromUnknown(snapshot.commercialSummary)
  );
};

const SLA_DAYS = 7;
const INVOICE_PAGE_SIZES = new Set([10, 25, 50, 100]);
const INVOICE_TYPES = new Set([
  "Manpower",
  "Civil Contractor",
  "Non-PO",
  "Material Import",
]);
const WORKFLOW_STAGES = new Set([
  "draft",
  "validated",
  "parked",
  "posted",
  "paid",
  "rejected",
  "review",
]);
const TERMINAL_STAGES = new Set(["parked", "posted", "paid", "rejected"]);

const INVOICE_TYPE_CODE_TO_LABEL: Record<string, string> = {
  MANPOWER_SERVICES: "Manpower",
  CIVIL_CONTRACTOR: "Civil Contractor",
  MATERIAL_IMPORT: "Material Import",
  CAMP_SERVICE_AND_CATERING: "Camp Service and Catering",
  NON_PO: "Non-PO",
};

const labelFromInvoiceTypeId = (invoiceTypeId?: string | null): string | null => {
  const key = String(invoiceTypeId || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return INVOICE_TYPE_CODE_TO_LABEL[key] || null;
};

const classifyEssaInvoiceType = (
  header: Record<string, string | null>,
  poNumber: string | null,
  extraText = "",
  invoiceTypeId?: string | null,
): string => {
  const blob = [
    header.vendorName,
    header.vendorCode,
    header.description,
    header.serviceName,
    header.invoiceDescription,
    header.natureOfExpense,
    extraText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const fromMeta = labelFromInvoiceTypeId(invoiceTypeId);
  const inferred = /\bcivil\b|contractor|konstruksi|berca|buana\s+sakti|bbs-bap|progress\s+claim|transmittal|sertifikat\s+badan\s+usaha|izin\s+usaha\s+jasa/.test(
    blob,
  )
    ? "Civil Contractor"
    : /\bimport\b|material import|barang impor|packing list|bill of lading/.test(blob)
      ? "Material Import"
      : /catering|camp\s+service/.test(blob)
        ? "Camp Service and Catering"
        : /amanah|sinar\s+makmur|\bmanpower\b|timesheet|manhour|daily_attendance|berita_acara|purchase_order/.test(
            blob,
          )
          ? "Manpower"
        : null;

  if (inferred) return inferred;
  if (fromMeta && fromMeta !== "Manpower" && fromMeta !== "Non-PO") return fromMeta;
  if (fromMeta === "Manpower") return "Manpower";
  if (!poNumber) return fromMeta === "Non-PO" || !fromMeta ? "Non-PO" : fromMeta;
  return fromMeta || inferred || "Manpower";
};

const parseInvoiceDate = (value: string | null): string | null => {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
};

const computeSlaDueAt = (uploadedAt: Date | string | null): Date | null => {
  const base = uploadedAt ? new Date(uploadedAt) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const due = new Date(base);
  due.setDate(due.getDate() + SLA_DAYS);
  return due;
};

const resolveDocumentType = (
  raw: Record<string, unknown>,
  nested: Record<string, unknown>,
): string => {
  const token = String(
    raw.documentType || raw.type || nested.documentType || nested.type || "invoice",
  )
    .trim()
    .toLowerCase();

  if (token.includes("faktur") || token.includes("tax_invoice")) return "tax_invoice";
  if (token.includes("timesheet")) return "timesheet";
  if (token.includes("attendance") || token.includes("face_finger")) return "attendance";
  if (token.includes("manhour") || token.includes("summary_calculation")) {
    return "manhour_summary";
  }
  if (token.includes("berita_acara") || token.includes("berita acara")) {
    return "berita_acara";
  }
  if (token.includes("purchase_order_appendix") || token.includes("po_appendix")) {
    return "po_appendix";
  }
  if (token.includes("purchase_order") || token === "po") return "po";
  if (token.includes("kwitansi") || token.includes("receipt")) return "receipt";
  if (token.includes("notice")) return "notice";
  if (token.includes("invoice") && !token.includes("tax")) return "invoice";
  if (token.includes("ses")) return "ses";

  return token.replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "") || "invoice";
};

const applyLabelValueFields = (
  target: Record<string, unknown>,
  fields: unknown,
): void => {
  if (!Array.isArray(fields)) return;

  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const row = field as Record<string, unknown>;
    const label = asString(row.fieldName || row.name || row.label);
    const value = asString(row.fieldValue ?? row.value);
    if (!label || !value) continue;

    const lower = label.toLowerCase();
    if (
      lower === "no." ||
      lower === "no" ||
      lower.includes("invoice no") ||
      lower.includes("invoice number") ||
      lower.includes("notice number")
    ) {
      if (!target.invoiceNumber && !target.invNo) target.invoiceNumber = value;
      continue;
    }
    if (lower.includes("vendor") || lower.includes("supplier")) {
      if (!target.vendorName && !target.supplierName) target.vendorName = value;
      continue;
    }
    if (lower.includes("grand total") || lower === "sebesar") {
      if (!target.grandTotal && !target.totalAmount) target.grandTotal = value;
    }
  }
};

const collectStructuredHeader = (
  raw: Record<string, unknown>,
  nested: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  if (raw.fields && typeof raw.fields === "object" && !Array.isArray(raw.fields)) {
    Object.assign(merged, raw.fields);
  }

  if (nested.header && typeof nested.header === "object") {
    Object.assign(merged, nested.header);
  }

  applyLabelValueFields(merged, raw.fields);
  applyLabelValueFields(merged, nested.fields);

  return merged;
};

const dedupeHeaderForStorage = (
  header: Record<string, string | null>,
): Record<string, string | null> => {
  const out = { ...header };
  if (out.invoiceDate && out.date && out.invoiceDate === out.date) {
    delete out.date;
  }
  if (out.taxAmount && out.vatAmount && out.taxAmount === out.vatAmount) {
    delete out.vatAmount;
  }
  if (out.invoiceNumber && out.invNo && out.invoiceNumber === out.invNo) {
    delete out.invNo;
  }
  return out;
};

const pickHeader = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
};

const buildBankDetails = (header: Record<string, unknown>): string | null => {
  const direct = asString(header.bankDetails);
  if (direct) return direct;

  const parts = [
    pickHeader(header.bankName),
    pickHeader(header.bankBranch),
    pickHeader(header.bankAccountNumber, header.bankAccount),
    pickHeader(header.bankAccountName, header.accountHolder),
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : null;
};

const buildPoHeaderInformation = (header: Record<string, unknown>): string | null => {
  const direct = asString(header.poHeaderInformation);
  if (direct) return direct;

  const parts = [
    pickHeader(header.poNumber) ? `PO Number ${pickHeader(header.poNumber)}` : null,
    pickHeader(header.poDate) ? `PO Date ${pickHeader(header.poDate)}` : null,
    pickHeader(header.buyerName) ? `PO Service Company Name ${pickHeader(header.buyerName)}` : null,
    pickHeader(header.projectName)
      ? `Location/Project Name ${pickHeader(header.projectName)}`
      : null,
    pickHeader(header.vendorName) ? `Vendor Name ${pickHeader(header.vendorName)}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join("; ") : null;
};

const splitEmbeddedPeriodEnd = (
  periodStart: string | null,
  periodEnd: string | null,
): string | null => {
  if (periodEnd) return periodEnd;
  if (!periodStart) return null;
  const match = periodStart.match(/\s+-\s+(.+)$/);
  return match?.[1]?.trim() || null;
};

const splitEmbeddedPeriodStart = (periodStart: string | null): string | null => {
  if (!periodStart) return null;
  const match = periodStart.match(/^(.+?)\s+-\s+/);
  return match ? match[1].trim() : periodStart.trim();
};

const extractManpowerNames = (raw: Record<string, unknown>): string | null => {
  const entries = raw.entries as Record<string, unknown> | undefined;
  const manpower = entries?.manpower || raw.manpower;
  if (Array.isArray(manpower)) {
    const names = manpower
      .map((row) => pickHeader((row as Record<string, unknown>).name))
      .filter(Boolean) as string[];
    if (names.length) return [...new Set(names)].join(", ");
  }

  const tables = Array.isArray(raw.tables) ? raw.tables : [];
  for (const table of tables) {
    const rows = Array.isArray((table as Record<string, unknown>).rows)
      ? ((table as Record<string, unknown>).rows as Array<Record<string, unknown>>)
      : [];
    const names = rows
      .map((row) => pickHeader(row.name, row.Name, row.manpowerName))
      .filter(Boolean) as string[];
    if (names.length) return [...new Set(names)].join(", ");
  }

  return null;
};

const trimManhourSummaryRows = (
  rows: unknown[],
): Array<Record<string, string | null>> => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const overtime =
        pickHeader(record.overtimeManhour) ||
        [
          pickHeader(record.overtimeMondaySaturdayManhour),
          pickHeader(record.overtimeSundayHolidayManhour),
        ]
          .filter(Boolean)
          .join(" + ") ||
        null;

      return {
        name: pickHeader(record.name, record.manpowerName, record.employeeName),
        role: pickHeader(record.role, record.position, record.manpowerRole),
        regularManhour: pickHeader(record.regularManhour, record.regularManHour),
        overtimeManhour: overtime,
      };
    })
    .filter((row) => Object.values(row).some(Boolean));
};

const trimTimesheetRows = (
  rows: unknown[],
): Array<Record<string, string | null>> => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        date: pickHeader(record.date),
        username: pickHeader(record.username, record.employeeID, record.employeeId),
        regularManhour: pickHeader(record.regularManhour, record.regularManHour),
        overtimeManhour: pickHeader(record.overtimeManhour, record.overtimeManHour),
        role: pickHeader(record.role, record.position),
        name: pickHeader(record.name, record.manpowerName, record.employeeName),
      };
    })
    .filter((row) => Object.values(row).some(Boolean));
};

const trimAttendanceRows = (
  rows: unknown[],
): Array<Record<string, string | null>> => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        date: pickHeader(record.date),
        username: pickHeader(record.username, record.employeeID, record.employeeId),
        event: pickHeader(record.event),
      };
    })
    .filter((row) => Object.values(row).some(Boolean));
};

const trimAppendixRows = (
  rows: unknown[],
): Array<Record<string, string | null>> => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        unitPrice: pickHeader(record.unitPrice),
        qty: pickHeader(record.qty, record.quantity),
        roleOfManpower: pickHeader(
          record.roleOfManpower,
          record.role,
          record.description,
        ),
      };
    })
    .filter((row) => Object.values(row).some(Boolean));
};

/** Keep only the business fields required per document section (A–I). */
const canonicalizeExtractionFields = (
  documentType: string,
  headerSource: Record<string, unknown>,
  raw: Record<string, unknown>,
): Record<string, string | null> => {
  const out: Record<string, string | null> = {};

  const set = (key: string, ...values: unknown[]) => {
    const value = pickHeader(...values);
    if (value) out[key] = value;
  };

  switch (documentType) {
    case "invoice":
      set("invoiceNumber", headerSource.invoiceNumber, headerSource.invNo, headerSource.invoiceNo, headerSource["No."]);
      set("invoiceDate", headerSource.invoiceDate, headerSource.date);
      set("paymentTerms", headerSource.paymentTerms, headerSource.paymentTerm);
      set(
        "manhourUnitRate",
        headerSource.manhourUnitRate,
        headerSource.manhourUnitRateCalculation,
        headerSource.calculation,
      );
      set("totalAmount", headerSource.subtotal, headerSource.totalAmount, headerSource.total);
      set("taxAmount", headerSource.taxAmount, headerSource.vatAmount, headerSource.ppn);
      set("grandTotal", headerSource.grandTotal);
      set("bankDetails", buildBankDetails(headerSource));
      set("serviceName", headerSource.serviceName);
      set("rolesOfManpower", headerSource.rolesOfManpower, headerSource.manpowerRoles);
      break;

    case "tax_invoice":
      set("taxInvoiceNumber", headerSource.taxInvoiceNumber);
      set("date", headerSource.date, headerSource.invoiceDate);
      set("taxAmount", headerSource.taxAmount, headerSource.vatAmount);
      break;

    case "notice":
      set(
        "invoiceNumber",
        headerSource.invoiceNumber,
        headerSource.invNo,
        headerSource.invoiceNo,
        headerSource["No."],
      );
      set("taxInvoiceNumber", headerSource.taxInvoiceNumber);
      set("date", headerSource.date, headerSource.invoiceDate);
      set("taxAmount", headerSource.taxAmount, headerSource.vatAmount);
      break;

    case "berita_acara": {
      const periodStart = splitEmbeddedPeriodStart(
        pickHeader(headerSource.periodStart),
      );
      const periodEnd =
        pickHeader(headerSource.periodEnd) ||
        splitEmbeddedPeriodEnd(pickHeader(headerSource.periodStart), null);

      if (periodStart) out.periodStart = periodStart;
      if (periodEnd) out.periodEnd = periodEnd;

      set("poNumber", headerSource.poNumber, headerSource.contractNo);
      set(
        "manhourPercentageCompletion",
        headerSource.manhourPercentageCompletion,
        headerSource.manhourCompletionPct,
      );
      set("serviceName", headerSource.serviceName);
      set("rolesOfManpower", headerSource.rolesOfManpower, headerSource.manpowerRoles);
      set("manpowerNames", extractManpowerNames(raw));
      break;
    }

    case "po":
      set("poHeaderInformation", buildPoHeaderInformation(headerSource));
      set("description", headerSource.description);
      set("deliveryDate", headerSource.deliveryDate);
      break;

    case "po_appendix":
      set("poHeaderInformation", buildPoHeaderInformation(headerSource));
      break;

    default:
      break;
  }

  return out;
};

const trimStructuredArrays = (
  documentType: string,
  raw: Record<string, unknown>,
): Record<string, unknown> => {
  const trimmed = { ...raw };

  if (Array.isArray(raw.manhourSummary)) {
    trimmed.manhourSummary = trimManhourSummaryRows(raw.manhourSummary);
  }
  if (Array.isArray(raw.timesheetEntries)) {
    trimmed.timesheetEntries = trimTimesheetRows(raw.timesheetEntries);
  }
  if (Array.isArray(raw.attendanceEntries)) {
    trimmed.attendanceEntries = trimAttendanceRows(raw.attendanceEntries);
  }
  if (Array.isArray(raw.appendixItems)) {
    trimmed.appendixItems = trimAppendixRows(raw.appendixItems);
  }

  if (documentType === "manhour_summary" && !Array.isArray(trimmed.manhourSummary)) {
    trimmed.manhourSummary = [];
  }
  if (documentType === "timesheet" && !Array.isArray(trimmed.timesheetEntries)) {
    trimmed.timesheetEntries = [];
  }
  if (documentType === "attendance" && !Array.isArray(trimmed.attendanceEntries)) {
    trimmed.attendanceEntries = [];
  }
  if (documentType === "po_appendix" && !Array.isArray(trimmed.appendixItems)) {
    trimmed.appendixItems = [];
  }

  return trimmed;
};

const buildSlimPayload = (result: NormalizedOcrDocument): Record<string, unknown> => {
  const raw = (result.raw || {}) as Record<string, unknown>;
  const configHash =
    result.configHash ||
    (typeof raw.configHash === "string" ? raw.configHash : null);
  return {
    documentType: result.documentType,
    status: result.status,
    type: raw.type,
    pdfPath: raw.pdfPath,
    pdfUrl: raw.pdfUrl,
    pages: raw.pages,
    header: result.header,
    extractionMethod: raw.extractionMethod,
    detectedDocumentType: raw.detectedDocumentType,
    documentTypeLabel: raw.documentTypeLabel,
    fileName: raw.fileName,
    configHash: configHash || null,
  };
};

const normalizeFieldList = (
  fields: Array<{ fieldName?: string; name?: string; confidence?: number }> = [],
) =>
  fields.map((field) => ({
    fieldName: field.fieldName || field.name || "",
    confidence: field.confidence,
  }));

/** Map remote OCR header keys to validation-friendly camelCase fields. */
const normalizeHeaderForStorage = (
  header: Record<string, unknown> = {},
  documentType: string,
): Record<string, string | null> => {
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(header)) {
    const text = asString(value);
    if (text) out[key] = text;
  }

  const invoiceNo =
    asString(header.invoiceNumber) ||
    asString(header.invNo) ||
    asString(header["No."]) ||
    asString(header.invoice_no);
  if (invoiceNo) out.invoiceNumber = invoiceNo;

  const vendorName =
    asString(header.vendorName) ||
    asString(header.supplierName) ||
    asString(header.vendor_name) ||
    asString(header.buyerName);
  if (vendorName && !out.vendorName) out.vendorName = vendorName;

  const invoiceDate =
    asString(header.invoiceDate) ||
    asString(header.date) ||
    asString(header.dueDate) ||
    asString(header["Tanggal/Tempat"]);
  if (invoiceDate) out.invoiceDate = invoiceDate;

  const totalAmount =
    asString(header.totalAmount) ||
    asString(header.grandTotal) ||
    asString(header.total) ||
    asString(header["Grand Total"]);
  if (totalAmount) out.totalAmount = totalAmount;

  const subtotal =
    asString(header.subtotal) || asString(header.totalAmount) || asString(header.total);
  if (subtotal) out.subtotal = subtotal;

  const taxAmount =
    asString(header.taxAmount) ||
    asString(header.vatAmount) ||
    asString(header["vat11%"]);
  if (taxAmount) out.taxAmount = taxAmount;

  const currency = asString(header.currency) || asString(header.InvCurr);
  if (currency) out.currency = currency;

  const poNumber = extractPoNumber(out);
  if (poNumber) out.poNumber = poNumber;

  if (documentType === "invoice" && !out.invoiceWorkflow) {
    out.invoiceWorkflow = poNumber ? "PO" : "NON_PO";
  }

  return dedupeHeaderForStorage(out);
};

const extractInvoiceNumberFromHeader = (
  header: Record<string, unknown> = {},
): string | null => {
  const normalized = normalizeHeaderForStorage(header, "invoice");
  return normalized.invoiceNumber ?? null;
};

const extractInvoiceNumberFromRawDoc = (
  raw: Record<string, unknown>,
): string | null => {
  const nested =
    raw?.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;
  const header = collectStructuredHeader(raw, nested);
  const fromHeader = extractInvoiceNumberFromHeader(header);
  if (fromHeader) return fromHeader;

  const docType = resolveDocumentType(raw, nested);
  if (docType === "receipt" || docType === "notice") {
    return extractInvoiceNumberFromHeader(header);
  }

  return null;
};

const extractInvoiceNumberFromBatch = (
  responseData: Record<string, unknown>,
): string | null => {
  const rawDocuments = Array.isArray(responseData.documents)
    ? (responseData.documents as Array<Record<string, unknown>>)
    : [];

  const prioritized = [
    ...rawDocuments.filter((doc) => resolveDocumentType(doc, (doc.data as Record<string, unknown>) || doc) === "invoice"),
    ...rawDocuments.filter((doc) => {
      const type = resolveDocumentType(doc, (doc.data as Record<string, unknown>) || doc);
      return type === "receipt" || type === "notice";
    }),
    ...rawDocuments,
  ];

  for (const doc of prioritized) {
    const invoiceNumber = extractInvoiceNumberFromRawDoc(doc);
    if (invoiceNumber) return invoiceNumber;
  }

  return null;
};

const clipEssaInvoiceNo = (value: unknown): string | null => {
  const text = asString(value);
  if (!text) return null;
  return text.length > 50 ? text.slice(0, 50) : text;
};

const clipEssaCurrency = (value: unknown): string => {
  const text = asString(value) || "IDR";
  const iso = text.toUpperCase().match(/\b[A-Z]{3}\b/);
  return (iso ? iso[0] : text).slice(0, 10);
};

const resolveInvoiceNoFromSnapshot = (
  snapshot: Record<string, unknown>,
  header: Record<string, string | null> = {},
): string | null => {
  const commercialSummary =
    snapshot.commercialSummary && typeof snapshot.commercialSummary === "object"
      ? (snapshot.commercialSummary as Record<string, unknown>)
      : {};
  return (
    clipEssaInvoiceNo(header.invoiceNumber) ||
    clipEssaInvoiceNo(commercialSummary.invoice_no) ||
    clipEssaInvoiceNo(commercialSummary.invoiceNumber) ||
    clipEssaInvoiceNo(commercialSummary.invoiceNo) ||
    clipEssaInvoiceNo(extractInvoiceNumberFromBatch(snapshot))
  );
};

const emptyInvoiceNoWhere = {
  [Op.or]: [{ InvoiceNo: null }, { InvoiceNo: "" }],
};

const resolveInvoiceNoFromExtraction = async (
  documentId: number,
): Promise<string | null> => {
  if (!Number.isInteger(documentId) || documentId <= 0) return null;

  const primaryLink = await ApDocumentExtraction.findOne({
    where: { DocumentId: documentId, FieldName: BATCH_PRIMARY_ID_FIELD },
    attributes: ["FieldValue"],
  });
  const primaryId = Number(primaryLink?.FieldValue) || documentId;
  const members = await ApDocumentExtraction.findAll({
    where: {
      FieldName: BATCH_PRIMARY_ID_FIELD,
      FieldValue: String(primaryId),
    },
    attributes: ["DocumentId"],
  });
  const documentIds = [
    ...new Set(
      [primaryId, documentId, ...members.map((row) => Number(row.DocumentId))].filter(
        (id) => Number.isInteger(id) && id > 0,
      ),
    ),
  ];

  const marker = await ApDocumentExtraction.findOne({
    where: {
      DocumentId: { [Op.in]: documentIds },
      FieldName: { [Op.in]: INVOICE_NUMBER_FIELD_NAMES },
      FieldValue: { [Op.ne]: "" },
    },
    order: [["ExtractionId", "DESC"]],
    attributes: ["FieldValue"],
  });
  return clipEssaInvoiceNo(marker?.FieldValue);
};

const syncSlaInvoiceNumber = async (invoiceId: number, invoiceNo: string) => {
  if (!invoiceId || !invoiceNo) return;
  await EssaSlaInstance.update(
    { InvoiceNumber: invoiceNo },
    {
      where: {
        InvoiceId: invoiceId,
        IsDeleted: false,
        [Op.or]: [{ InvoiceNumber: null }, { InvoiceNumber: "" }],
      },
    },
  );
};

const invoiceNumbersMatch = (left: unknown, right: unknown): boolean => {
  const a = normalizeInvoiceNumberForComparison(left);
  const b = normalizeInvoiceNumberForComparison(right);
  return Boolean(a && b && a === b);
};

const upsertInvoiceNumberMarker = async (
  documentId: number,
  invoiceNumber: string,
): Promise<void> => {
  const trimmed = String(invoiceNumber ?? "").trim();
  if (!Number.isInteger(documentId) || documentId <= 0 || !trimmed) return;

  const existing = await ApDocumentExtraction.findOne({
    where: {
      DocumentId: documentId,
      FieldName: { [Op.in]: INVOICE_NUMBER_FIELD_NAMES },
    },
    attributes: ["ExtractionId", "FieldName"],
  });

  if (existing) {
    await existing.update({ FieldValue: trimmed });
    return;
  }

  await ApDocumentExtraction.create({
    DocumentId: documentId,
    FieldName: "invoiceNumber",
    FieldValue: trimmed,
  });
};

const normalizeOcrDocument = (raw: Record<string, unknown>): NormalizedOcrDocument => {
  const nested =
    raw?.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;
  const documentType = resolveDocumentType(raw, nested);
  const headerSource = collectStructuredHeader(raw, nested);
  const status = asString(nested.status) || asString(raw.status) || "extracted";
  const structuredFields =
    raw.fields && typeof raw.fields === "object" && !Array.isArray(raw.fields)
      ? (raw.fields as Record<string, unknown>)
      : null;

  const rawPayload: Record<string, unknown> = {
    ...nested,
    documentType,
    status,
    type: raw.type || documentType,
    pdfPath: raw.pdfPath,
    pdfUrl: raw.pdfUrl,
    structuredFields,
    timesheetEntries:
      nested.timesheetEntries ||
      (nested.entries as Record<string, unknown> | undefined)?.timesheetEntries,
    attendanceEntries:
      nested.attendanceEntries ||
      (nested.entries as Record<string, unknown> | undefined)?.attendanceEntries,
    manhourSummary:
      nested.manhourSummary ||
      (nested.entries as Record<string, unknown> | undefined)?.manhourSummary,
    tables: nested.tables,
    poLineItems: nested.poLineItems,
    appendixItems:
      nested.appendixItems ||
      (nested.entries as Record<string, unknown> | undefined)?.appendixItems,
    invoiceLineItems:
      nested.invoiceLineItems ||
      (nested.entries as Record<string, unknown> | undefined)?.invoiceLineItems,
    entries: nested.entries,
    manpower: nested.manpower,
  };

  const trimmedRaw = trimStructuredArrays(documentType, rawPayload);
  const header = canonicalizeExtractionFields(documentType, headerSource, trimmedRaw);
  const lineItems = Array.isArray(nested.lineItems)
    ? (nested.lineItems as Array<Record<string, unknown>>)
    : Array.isArray(nested.invoiceLineItems)
      ? (nested.invoiceLineItems as Array<Record<string, unknown>>)
      : [];
  const fields = normalizeFieldList(
    (Array.isArray(nested.fields)
      ? nested.fields
      : Array.isArray(raw.fields)
        ? raw.fields
        : []) as Array<{ fieldName?: string; name?: string; confidence?: number }>,
  ).filter((field) => field.fieldName);

  const configHash =
    asString(raw.configHash) ||
    asString(nested.configHash) ||
    asString((raw.meta as Record<string, unknown> | undefined)?.configHash) ||
    null;

  return {
    documentType,
    header,
    lineItems,
    fields,
    status,
    configHash,
    raw: {
      ...trimmedRaw,
      header,
      lineItems,
      fields,
      configHash,
    },
  };
};

const pickPrimaryDocumentIndex = (documents: NormalizedOcrDocument[]): number => {
  for (const preferred of PRIMARY_DOC_PRIORITY) {
    const idx = documents.findIndex(
      (doc) => doc.documentType === preferred && doc.status === "extracted",
    );
    if (idx >= 0) return idx;
  }

  const extractedIdx = documents.findIndex((doc) => doc.status === "extracted");
  return extractedIdx >= 0 ? extractedIdx : 0;
};

const resolveListTotalAmount = (
  header: Record<string, string | null>,
): number | null =>
  parseAmount(header.grandTotal) ??
  parseAmount(header.totalAmount) ??
  parseAmount(header.subtotal);

const deriveListRowFromSnapshot = (
  primaryDocumentId: number,
  snapshot: Record<string, unknown>,
  document: ApDocument,
  sourceMeta: {
    sourceChannel?: string | null;
    emailFrom?: string | null;
    emailSubject?: string | null;
    emailReceivedAt?: string | null;
  } = {},
): PersistedUploadListRow => {
  const documents = Array.isArray(snapshot.documents)
    ? (snapshot.documents as Array<Record<string, unknown>>)
    : [];
  const invoiceDoc =
    documents.find((doc) => String(doc.type || doc.documentType) === "invoice") ||
    documents[0];
  const invoiceData =
    invoiceDoc?.data && typeof invoiceDoc.data === "object"
      ? (invoiceDoc.data as Record<string, unknown>)
      : (invoiceDoc as Record<string, unknown>);
  const header = normalizeHeaderForStorage(
    collectStructuredHeader(
      (invoiceDoc as Record<string, unknown>) || {},
      invoiceData || {},
    ),
    "invoice",
  );
  const poNumber = collectPoNumberFromSnapshot(snapshot, header);
  const validation =
    snapshot.validation && typeof snapshot.validation === "object"
      ? (snapshot.validation as Record<string, unknown>)
      : null;
  const validationResults = Array.isArray(validation?.results)
    ? validation.results
    : Array.isArray(validation?.checks)
      ? validation.checks
      : [];
  const failedChecks = validationResults.filter((row: Record<string, unknown>) => {
    const severity = String(row.severity || row.status || "").toUpperCase();
    return severity === "FAIL" || severity === "fail";
  }).length;
  const overallStatus = String(validation?.overallStatus || validation?.overall || "")
    .toUpperCase()
    .trim();
  const overall =
    overallStatus === "PASS"
      ? "pass"
      : overallStatus === "FAIL"
        ? "review"
        : "review";
  const commercialSummary =
    snapshot.commercialSummary && typeof snapshot.commercialSummary === "object"
      ? (snapshot.commercialSummary as Record<string, unknown>)
      : null;
  const invoiceDate = parseInvoiceDate(
    asString(header.invoiceDate) ||
      asString(header.date) ||
      asString(commercialSummary?.invoice_date) ||
      asString(commercialSummary?.invoiceDate) ||
      null,
  );

  const extraText = [
    asString(commercialSummary?.description),
    asString(commercialSummary?.service_name),
    asString(header.detectedDocumentType),
    asString(document.OriginalFileName),
    asString(snapshot.fileName),
    ...(Array.isArray(snapshot.documents)
      ? (snapshot.documents as Array<Record<string, unknown>>).map((doc) => {
          const nested =
            doc.data && typeof doc.data === "object"
              ? (doc.data as Record<string, unknown>)
              : {};
          return asString(
            doc.documentType ||
              doc.type ||
              nested.documentType ||
              nested.type,
          );
        })
      : []),
  ]
    .filter(Boolean)
    .join(" ");
  const snapshotMeta =
    snapshot.meta && typeof snapshot.meta === "object"
      ? (snapshot.meta as Record<string, unknown>)
      : {};
  const invoiceType = classifyEssaInvoiceType(
    header,
    poNumber,
    extraText,
    asString(snapshotMeta.invoiceTypeId),
  );
  const slaDue = computeSlaDueAt(document.UploadedAt);
  const slaBreached = !!(slaDue && slaDue.getTime() < Date.now());
  const workflowStage = overall === "pass" ? "validated" : "review";

  const rawChannel = String(
    sourceMeta.sourceChannel || snapshot.sourceChannel || "UPLOAD",
  )
    .trim()
    .toUpperCase();
  const channel: "UPLOAD" | "EMAIL" | "SHAREPOINT" =
    rawChannel === "EMAIL"
      ? "EMAIL"
      : rawChannel === "SHAREPOINT"
        ? "SHAREPOINT"
        : "UPLOAD";

  return {
    id: `ocr-${primaryDocumentId}`,
    documentId: primaryDocumentId,
    invoice_no: resolveInvoiceNoFromSnapshot(snapshot, header),
    invoice_date: invoiceDate,
    vendor_name: header.vendorName,
    po_number: poNumber,
    total_amount: resolveListTotalAmount(header),
    currency: normalizeCurrencyCode(asString(header.currency) || "IDR"),
    invoice_type: invoiceType,
    invoice_workflow:
      invoiceType === "Non-PO" && !poNumber ? "NON_PO" : "PO",
    status: workflowStage,
    workflow_stage: workflowStage,
    overall,
    uploaded_at: document.UploadedAt?.toISOString?.() || new Date().toISOString(),
    uploaded_by: document.UploadedBy ?? null,
    file_name: document.OriginalFileName,
    failed_checks: failedChecks,
    openExceptions: 0,
    sla_breached: slaBreached,
    next_pending_role: overall === "pass" ? null : "ap_team",
    source_channel: channel,
    email_from:
      asString(sourceMeta.emailFrom) ||
      asString(snapshot.emailFrom) ||
      null,
    email_subject:
      asString(sourceMeta.emailSubject) ||
      asString(snapshot.emailSubject) ||
      null,
    email_received_at:
      asString(sourceMeta.emailReceivedAt) ||
      asString(snapshot.emailReceivedAt) ||
      null,
  };
};

class ApInvoiceDocumentService {
  private computeOverallConfidence(
    result: Pick<NormalizedOcrDocument, "fields">,
  ): number | null {
    if (!result.fields?.length) return null;
    const valid = result.fields
      .map((f) => Number(f.confidence))
      .filter((n) => Number.isFinite(n));
    if (!valid.length) return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    const pct = avg <= 1 ? avg * 100 : avg;
    return Number(pct.toFixed(2));
  }

  private buildExtractionRows(
    documentId: number,
    result: NormalizedOcrDocument,
    extras: Array<{ FieldName: string; FieldValue: string }> = [],
  ): Array<Record<string, unknown>> {
    if (!Number.isFinite(documentId) || documentId <= 0) {
      throw new Error(
        `Cannot build extraction rows without a valid DocumentId (got ${documentId})`,
      );
    }

    const confidenceByField = new Map<string, number>();
    for (const field of result.fields || []) {
      const key = field.fieldName || field.name;
      if (key) confidenceByField.set(key, Number(field.confidence));
    }

    // Extras must include DocumentId — otherwise Postgres rejects NOT NULL DocumentId
    const rows: Array<Record<string, unknown>> = extras.map((extra) => ({
      DocumentId: documentId,
      FieldName: extra.FieldName,
      FieldValue: extra.FieldValue,
    }));

    rows.push({
      DocumentId: documentId,
      FieldName: DOCUMENT_TYPE_FIELD,
      FieldValue: result.documentType,
    });

    for (const [fieldName, fieldValue] of Object.entries(result.header || {})) {
      if (!fieldValue || RESERVED_FIELD_NAMES.has(fieldName)) continue;
      const conf = confidenceByField.get(fieldName);
      rows.push({
        DocumentId: documentId,
        FieldName: fieldName,
        FieldValue: String(fieldValue),
        Confidence:
          conf !== undefined && Number.isFinite(conf)
            ? conf <= 1
              ? Number((conf * 100).toFixed(2))
              : Number(conf.toFixed(2))
            : null,
      });
    }

    rows.push({
      DocumentId: documentId,
      FieldName: LINE_ITEMS_FIELD,
      FieldValue: JSON.stringify(result.lineItems || []),
    });

    const rawPayload = (result.raw || {}) as Record<string, unknown>;

    for (const [sourceKey, storageKey] of Object.entries(STRUCTURED_ARRAY_FIELDS)) {
      const value = rawPayload[sourceKey];
      if (Array.isArray(value) && value.length) {
        rows.push({
          DocumentId: documentId,
          FieldName: storageKey,
          FieldValue: JSON.stringify(value),
        });
      }
    }

    rows.push({
      DocumentId: documentId,
      FieldName: PAYLOAD_FIELD,
      FieldValue: JSON.stringify(buildSlimPayload(result)),
    });

    const configHash =
      result.configHash ||
      (typeof (result.raw || {}).configHash === "string"
        ? String((result.raw || {}).configHash)
        : null);
    if (configHash) {
      rows.push({
        DocumentId: documentId,
        FieldName: CONFIG_HASH_FIELD,
        FieldValue: configHash,
      });
    }

    return rows;
  }

  /**
   * Persists an extraction: one AP_DOCUMENT row plus AP_DOCUMENT_EXTRACTION rows.
   */
  async saveExtraction(
    file: Express.Multer.File,
    result: InvoiceExtractionResult | Record<string, unknown>,
    uploadedBy?: number,
    options: {
      batchPrimaryId?: number;
      isBatchPrimary?: boolean;
      sourceChannel?: "UPLOAD" | "EMAIL" | "SHAREPOINT";
      emailMeta?: PersistExtractEmailMeta;
      storedFilePath?: string | null;
      lifecycleStatus?: string;
      versionNo?: number;
      supersedesDocumentId?: number | null;
    } = {},
  ): Promise<number | null> {
    try {
      const normalized = normalizeOcrDocument(result as Record<string, unknown>);
      const document = await ApDocument.create({
        DocumentType: normalized.documentType.toUpperCase(),
        OriginalFileName: file.originalname,
        StoredFilePath: options.storedFilePath ?? null,
        MimeType: file.mimetype,
        FileSizeBytes: file.size,
        ExtractionStatus:
          normalized.status === "extracted" ? "EXTRACTED" : "NO_INVOICE_FOUND",
        OverallConfidence: this.computeOverallConfidence(normalized),
        UploadedBy: uploadedBy ?? null,
        LifecycleStatus: options.lifecycleStatus || "ACTIVE",
        VersionNo: options.versionNo ?? 1,
        SupersedesDocumentId: options.supersedesDocumentId ?? null,
      });

      const rawDocumentId =
        document.DocumentId ??
        (document as any).dataValues?.DocumentId ??
        (document as any).getDataValue?.("DocumentId");
      const documentId =
        typeof rawDocumentId === "bigint"
          ? Number(rawDocumentId)
          : Number(rawDocumentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        throw new Error(
          `AP_DOCUMENT was created but DocumentId was not returned (got ${String(rawDocumentId)})`,
        );
      }
      const extras: Array<{ FieldName: string; FieldValue: string }> = [];

      if (options.batchPrimaryId) {
        extras.push({
          FieldName: BATCH_PRIMARY_ID_FIELD,
          FieldValue: String(options.batchPrimaryId),
        });
      }
      if (options.isBatchPrimary) {
        extras.push({
          FieldName: BATCH_PRIMARY_FIELD,
          FieldValue: "1",
        });
      }

      const channel = options.sourceChannel || "UPLOAD";
      extras.push({
        FieldName: SOURCE_CHANNEL_FIELD,
        FieldValue: channel,
      });

      if (options.emailMeta) {
        const meta = options.emailMeta;
        if (meta.fromAddress) {
          extras.push({
            FieldName: EMAIL_FROM_FIELD,
            FieldValue: String(meta.fromAddress),
          });
        }
        if (meta.subject) {
          extras.push({
            FieldName: EMAIL_SUBJECT_FIELD,
            FieldValue: String(meta.subject),
          });
        }
        if (meta.messageId) {
          extras.push({
            FieldName: EMAIL_MESSAGE_ID_FIELD,
            FieldValue: String(meta.messageId),
          });
        }
        if (meta.receivedAt) {
          extras.push({
            FieldName: EMAIL_RECEIVED_AT_FIELD,
            FieldValue: String(meta.receivedAt),
          });
        }
        if (meta.vendorId != null) {
          extras.push({
            FieldName: EMAIL_VENDOR_ID_FIELD,
            FieldValue: String(meta.vendorId),
          });
        }
        if (meta.vendorMatched != null) {
          extras.push({
            FieldName: EMAIL_VENDOR_MATCHED_FIELD,
            FieldValue: meta.vendorMatched ? "1" : "0",
          });
        }
      }

      const rows = this.buildExtractionRows(documentId, normalized, extras);
      if (rows.length) {
        await ApDocumentExtraction.bulkCreate(rows);
      }

      return documentId;
    } catch (error) {
      const docType =
        (result as Record<string, unknown>)?.documentType ||
        (result as Record<string, unknown>)?.type ||
        "unknown";
      logger.error(`Failed to persist OCR extraction (${docType})`, {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
        fileName: file?.originalname,
        sourceChannel: options.sourceChannel || "UPLOAD",
      });
      // Re-throw so email intake / extract can report the real DB error
      // instead of a vague "persist_failed / duplicate" message.
      throw error instanceof Error
        ? error
        : new Error(`Failed to persist OCR extraction (${docType}): ${String(error)}`);
    }
  }

  /**
   * Persist a full OCR extract response (remote or mock), attach documentIds,
   * and store a batch snapshot on the primary invoice document for listing/detail.
   */
  async persistExtractResponse(
    file: Express.Multer.File,
    responseData: Record<string, unknown>,
    options: PersistExtractOptions = {},
  ): Promise<Record<string, unknown>> {
    const traceId = options.traceId || "persist";
    const persistStartedAt = Date.now();
    const logPhase = (phase: string, detail: Record<string, unknown> = {}) => {
      logger.info(
        `[OCR][${traceId}] ${phase} (+${Date.now() - persistStartedAt}ms) ${JSON.stringify(detail)}`,
      );
    };

    const rawDocuments = Array.isArray(responseData.documents)
      ? (responseData.documents as Array<Record<string, unknown>>)
      : [];
    if (!rawDocuments.length) return responseData;

    logPhase("PERSIST_BATCH_START", { sectionCount: rawDocuments.length });

    // Duplicate invoice-number auto-check disabled — allow persist even when
    // the invoice number already exists from a prior extraction.
    const invoiceNumber = extractInvoiceNumberFromBatch(responseData);
    logPhase("PERSIST_DUPLICATE_CHECK_SKIPPED", {
      invoiceNumber: invoiceNumber ?? null,
    });

    const normalizedDocs = rawDocuments.map((doc) => {
      const normalized = normalizeOcrDocument(doc);
      const hashFromOptions =
        options.configHashesByOcrType?.[normalized.documentType] || null;
      const configHash = normalized.configHash || hashFromOptions;
      if (configHash) {
        normalized.configHash = configHash;
        normalized.raw = { ...normalized.raw, configHash };
        doc.configHash = configHash;
      }
      return normalized;
    });
    const primaryIdx = pickPrimaryDocumentIndex(normalizedDocs);
    logPhase("PERSIST_SAVE_DOCUMENTS_START", { primaryIdx });

    const documentIds = await Promise.all(
      rawDocuments.map((doc) =>
        this.saveExtraction(file, doc, options.uploadedBy, {
          batchPrimaryId: undefined,
          isBatchPrimary: false,
          sourceChannel: options.sourceChannel || "UPLOAD",
          emailMeta: options.emailMeta,
          storedFilePath: options.storedFilePath ?? null,
        }),
      ),
    );

    logPhase("PERSIST_SAVE_DOCUMENTS_DONE", {
      savedCount: documentIds.filter((id) => id != null).length,
    });

    let primaryDocumentId =
      documentIds[primaryIdx] ??
      documentIds.find((id) => id != null) ??
      null;

    if (primaryDocumentId) {
      await ApDocumentExtraction.create({
        DocumentId: primaryDocumentId,
        FieldName: BATCH_PRIMARY_FIELD,
        FieldValue: "1",
      });

      const batchLinkRows = documentIds
        .filter((id): id is number => id != null)
        .map((id) => ({
          DocumentId: id,
          FieldName: BATCH_PRIMARY_ID_FIELD,
          FieldValue: String(primaryDocumentId),
        }));
      if (batchLinkRows.length) {
        await ApDocumentExtraction.bulkCreate(batchLinkRows);
      }

      if (invoiceNumber) {
        await upsertInvoiceNumberMarker(primaryDocumentId, invoiceNumber);
      }

      const invoiceDocIdx = normalizedDocs.findIndex(
        (doc) => doc.documentType === "invoice" && doc.status === "extracted",
      );
      const invoiceDocumentId =
        invoiceDocIdx >= 0 ? documentIds[invoiceDocIdx] : null;
      if (
        invoiceDocumentId &&
        invoiceDocumentId !== primaryDocumentId &&
        invoiceNumber
      ) {
        await upsertInvoiceNumberMarker(invoiceDocumentId, invoiceNumber);
      }
    }

    const enrichedDocuments = rawDocuments.map((doc, index) => {
      const nested =
        doc?.data && typeof doc.data === "object"
          ? (doc.data as Record<string, unknown>)
          : doc;
      const documentId = documentIds[index];
      if (nested !== doc) {
        return {
          ...doc,
          data: {
            ...nested,
            documentId,
          },
        };
      }
      return {
        ...doc,
        documentId,
      };
    });

    const snapshot = {
      ...responseData,
      documents: enrichedDocuments,
      primaryDocumentId,
      fileName: file.originalname,
      uploadedAt: new Date().toISOString(),
      sourceChannel: options.sourceChannel || "UPLOAD",
      emailFrom: options.emailMeta?.fromAddress || null,
      emailSubject: options.emailMeta?.subject || null,
      emailMessageId: options.emailMeta?.messageId || null,
      emailReceivedAt: options.emailMeta?.receivedAt || null,
      emailVendorId: options.emailMeta?.vendorId ?? null,
      emailVendorMatched: options.emailMeta?.vendorMatched ?? null,
    };

    if (primaryDocumentId) {
      logPhase("PERSIST_SNAPSHOT_START", { primaryDocumentId });
      await ApDocumentExtraction.create({
        DocumentId: primaryDocumentId,
        FieldName: BATCH_SNAPSHOT_FIELD,
        FieldValue: JSON.stringify(snapshot),
      });
      const primaryDocument = await ApDocument.findByPk(primaryDocumentId);
      if (primaryDocument) {
        await this.upsertEssaInvoiceFromSnapshot(
          primaryDocumentId,
          snapshot,
          primaryDocument,
        );
      }
      logPhase("PERSIST_BATCH_DONE", { primaryDocumentId });
    }

    return {
      ...responseData,
      documents: enrichedDocuments,
      primaryDocumentId,
    };
  }

  async listUploadedInvoices(): Promise<PersistedUploadListRow[]> {
    const primaryRows = await ApDocumentExtraction.findAll({
      where: { FieldName: BATCH_PRIMARY_FIELD, FieldValue: "1" },
      attributes: ["DocumentId"],
      order: [["ExtractionId", "DESC"]],
    });

    const rows: PersistedUploadListRow[] = [];
    for (const primaryRow of primaryRows) {
      const documentId = Number(primaryRow.DocumentId);
      const document = await ApDocument.findByPk(documentId);
      if (!document) continue;

      const snapshotRow = await ApDocumentExtraction.findOne({
        where: { DocumentId: documentId, FieldName: BATCH_SNAPSHOT_FIELD },
      });
      if (!snapshotRow?.FieldValue) continue;

      const metaRows = await ApDocumentExtraction.findAll({
        where: {
          DocumentId: documentId,
          FieldName: {
            [Op.in]: [
              SOURCE_CHANNEL_FIELD,
              EMAIL_FROM_FIELD,
              EMAIL_SUBJECT_FIELD,
              EMAIL_RECEIVED_AT_FIELD,
            ],
          },
        },
        attributes: ["FieldName", "FieldValue"],
      });
      const metaMap = Object.fromEntries(
        metaRows.map((row) => [row.FieldName, row.FieldValue]),
      );

      try {
        const snapshot = JSON.parse(snapshotRow.FieldValue) as Record<
          string,
          unknown
        >;
        rows.push(
          deriveListRowFromSnapshot(documentId, snapshot, document, {
            sourceChannel: metaMap[SOURCE_CHANNEL_FIELD] || null,
            emailFrom: metaMap[EMAIL_FROM_FIELD] || null,
            emailSubject: metaMap[EMAIL_SUBJECT_FIELD] || null,
            emailReceivedAt: metaMap[EMAIL_RECEIVED_AT_FIELD] || null,
          }),
        );
      } catch (error) {
        logger.warn(`Skipping corrupt upload snapshot for document ${documentId}`, error);
      }
    }

    return rows;
  }

  async getUploadedInvoiceSnapshot(
    documentId: number,
  ): Promise<Record<string, unknown> | null> {
    const snapshotRow = await ApDocumentExtraction.findOne({
      where: { DocumentId: documentId, FieldName: BATCH_SNAPSHOT_FIELD },
    });
    if (snapshotRow?.FieldValue) {
      try {
        return JSON.parse(snapshotRow.FieldValue) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    const primaryLink = await ApDocumentExtraction.findOne({
      where: { DocumentId: documentId, FieldName: BATCH_PRIMARY_ID_FIELD },
    });
    const primaryId = Number(primaryLink?.FieldValue);
    if (!Number.isInteger(primaryId) || primaryId <= 0) return null;

    const primarySnapshot = await ApDocumentExtraction.findOne({
      where: { DocumentId: primaryId, FieldName: BATCH_SNAPSHOT_FIELD },
    });
    if (!primarySnapshot?.FieldValue) return null;
    try {
      return JSON.parse(primarySnapshot.FieldValue) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /** Rebuilds the header + line items for a stored document, for re-validation. */
  async getReconstructedExtraction(
    documentId: number,
  ): Promise<ReconstructedExtraction | null> {
    const document = await ApDocument.findByPk(documentId);
    if (!document) return null;

    const extractionRows = await ApDocumentExtraction.findAll({
      where: { DocumentId: documentId },
    });

    const header: Record<string, string | null> = {};
    let lineItems: Array<Record<string, string | null>> = [];

    for (const row of extractionRows) {
      if (
        RESERVED_FIELD_NAMES.has(row.FieldName) ||
        row.FieldName === BATCH_SNAPSHOT_FIELD ||
        row.FieldName === BATCH_PRIMARY_FIELD ||
        row.FieldName === BATCH_PRIMARY_ID_FIELD
      ) {
        if (row.FieldName === LINE_ITEMS_FIELD) {
          try {
            const parsed = JSON.parse(row.FieldValue || "[]");
            if (Array.isArray(parsed)) lineItems = parsed;
          } catch {
            lineItems = [];
          }
        }
        continue;
      }
      header[row.FieldName] = row.FieldValue ?? null;
    }

    return { document, header, lineItems };
  }

  extractInvoiceNumberFromBatch(
    responseData: Record<string, unknown>,
  ): string | null {
    return extractInvoiceNumberFromBatch(responseData);
  }

  async invoiceNumberExists(
    invoiceNumber: string,
    excludeDocumentId?: number | null,
  ): Promise<boolean> {
    const trimmed = String(invoiceNumber ?? "").trim();
    if (!trimmed) return false;

    const normalizedTarget = normalizeInvoiceNumberForComparison(trimmed);
    const excludeId = Number(excludeDocumentId);
    const excludeDocument =
      Number.isInteger(excludeId) && excludeId > 0 ? excludeId : null;

    const exactWhere: Record<string, unknown> = {
      FieldName: { [Op.in]: INVOICE_NUMBER_FIELD_NAMES },
      FieldValue: trimmed,
    };
    if (excludeDocument) {
      exactWhere.DocumentId = { [Op.ne]: excludeDocument };
    }

    const exactMatch = await ApDocumentExtraction.findOne({
      where: exactWhere,
      attributes: ["ExtractionId"],
    });
    if (exactMatch) return true;

    const likeNeedle = escapeLikePattern(trimmed);
    const fuzzyFieldWhere: Record<string, unknown> = {
      FieldName: { [Op.in]: INVOICE_NUMBER_FIELD_NAMES },
      FieldValue: { [Op.like]: `%${likeNeedle}%` },
    };
    if (excludeDocument) {
      fuzzyFieldWhere.DocumentId = { [Op.ne]: excludeDocument };
    }

    const fuzzyFieldRows = await ApDocumentExtraction.findAll({
      where: fuzzyFieldWhere,
      attributes: ["ExtractionId", "DocumentId", "FieldValue"],
      limit: 20,
    });
    for (const row of fuzzyFieldRows) {
      if (invoiceNumbersMatch(row.FieldValue, trimmed)) return true;
    }

    const snapshotWhere: Record<string, unknown> = {
      FieldName: BATCH_SNAPSHOT_FIELD,
      FieldValue: { [Op.like]: `%${likeNeedle}%` },
    };
    if (excludeDocument) {
      snapshotWhere.DocumentId = { [Op.ne]: excludeDocument };
    }

    const snapshotRows = await ApDocumentExtraction.findAll({
      where: snapshotWhere,
      attributes: ["ExtractionId", "DocumentId", "FieldValue"],
      limit: 50,
    });

    for (const row of snapshotRows) {
      if (!row.FieldValue) continue;
      try {
        const snapshot = JSON.parse(row.FieldValue) as Record<string, unknown>;
        const snapshotInvoiceNumber = extractInvoiceNumberFromBatch(snapshot);
        if (invoiceNumbersMatch(snapshotInvoiceNumber, trimmed)) return true;
      } catch {
        if (normalizeInvoiceNumberForComparison(row.FieldValue).includes(normalizedTarget)) {
          return true;
        }
      }
    }

    const payloadWhere: Record<string, unknown> = {
      FieldName: PAYLOAD_FIELD,
      FieldValue: { [Op.like]: `%${likeNeedle}%` },
    };
    if (excludeDocument) {
      payloadWhere.DocumentId = { [Op.ne]: excludeDocument };
    }

    const payloadRows = await ApDocumentExtraction.findAll({
      where: payloadWhere,
      attributes: ["ExtractionId", "DocumentId", "FieldValue"],
      limit: 50,
    });

    for (const row of payloadRows) {
      if (!row.FieldValue) continue;
      try {
        const payload = JSON.parse(row.FieldValue) as Record<string, unknown>;
        const header =
          payload.header && typeof payload.header === "object"
            ? (payload.header as Record<string, unknown>)
            : {};
        const payloadInvoiceNumber = extractInvoiceNumberFromHeader(header);
        if (invoiceNumbersMatch(payloadInvoiceNumber, trimmed)) return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  /**
   * Merge OCR sections into an existing invoice package (DOCREQ path).
   * Does NOT create a new primary — only adds/replaces requested document types.
   */
  async mergeExtractIntoExistingBatch(
    file: Express.Multer.File,
    responseData: Record<string, unknown>,
    options: {
      primaryDocumentId: number;
      requestedDocumentTypes: string[];
      replacementTypes?: string[];
      uploadedBy?: number | null;
      sourceChannel?: "UPLOAD" | "EMAIL" | "SHAREPOINT";
      emailMeta?: PersistExtractEmailMeta;
      storedFilePath?: string | null;
      traceId?: string;
    },
  ): Promise<{
    primaryDocumentId: number;
    receivedByType: Record<string, number>;
    mergedDocumentTypes: string[];
    snapshot: Record<string, unknown>;
  }> {
    const primaryDocumentId = Number(options.primaryDocumentId);
    const traceId = options.traceId || `merge-${primaryDocumentId}`;

    const primary = await ApDocument.findByPk(primaryDocumentId);
    if (!primary) {
      throw new Error(`Primary document ${primaryDocumentId} not found`);
    }

    const snapshotRow = await ApDocumentExtraction.findOne({
      where: {
        DocumentId: primaryDocumentId,
        FieldName: BATCH_SNAPSHOT_FIELD,
      },
    });
    if (!snapshotRow?.FieldValue) {
      throw new Error(
        `No batch snapshot found for primary document ${primaryDocumentId}`,
      );
    }

    let existingSnapshot: Record<string, unknown>;
    try {
      existingSnapshot = JSON.parse(snapshotRow.FieldValue) as Record<
        string,
        unknown
      >;
    } catch {
      throw new Error(
        `Corrupt batch snapshot for primary document ${primaryDocumentId}`,
      );
    }

    const requestedNorm = new Set(
      (options.requestedDocumentTypes || [])
        .map((t) => canonicalDocTypeKey(t))
        .filter(Boolean),
    );
    const replacementNorm = new Set(
      (options.replacementTypes || [])
        .map((t) => canonicalDocTypeKey(t))
        .filter(Boolean),
    );

    const rawDocuments = Array.isArray(responseData.documents)
      ? (responseData.documents as Array<Record<string, unknown>>)
      : [];

    const matched: Array<{
      raw: Record<string, unknown>;
      normalized: NormalizedOcrDocument;
      typeKey: string;
    }> = [];

    const fileHint = inferDocTypeFromFileName(file.originalname);
    const classifiedTypes: string[] = [];

    for (const doc of rawDocuments) {
      const normalized = normalizeOcrDocument(doc);
      let typeKey = canonicalDocTypeKey(normalized.documentType);
      if (
        fileHint &&
        requestedNorm.has(fileHint) &&
        typeKey !== fileHint &&
        (typeKey === "invoice" || !requestedNorm.has(typeKey))
      ) {
        typeKey = fileHint;
        normalized.documentType = fileHint;
      }
      if (typeKey) classifiedTypes.push(typeKey);
      if (!typeKey) continue;
      const matchesRequest =
        requestedNorm.size === 0 ||
        [...requestedNorm].some((req) => documentTypesMatch(req, typeKey));
      if (!matchesRequest) continue;
      matched.push({ raw: doc, normalized, typeKey });
    }

    if (!matched.length) {
      throw new Error(
        `OCR did not classify any requested document types (${
          [...requestedNorm].join(", ") || "any"
        }). Classified: ${classifiedTypes.join(", ") || "none"}.`,
      );
    }

    // Resolve which batch docs currently ACTIVE for each type (by DB rows linked to primary)
    const linkedIds = await ApDocumentExtraction.findAll({
      where: {
        FieldName: BATCH_PRIMARY_ID_FIELD,
        FieldValue: String(primaryDocumentId),
      },
      attributes: ["DocumentId"],
    });
    const siblingIds = [
      ...new Set(
        linkedIds
          .map((r) => Number(r.DocumentId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    if (!siblingIds.includes(primaryDocumentId)) {
      siblingIds.push(primaryDocumentId);
    }

    const siblingDocs = siblingIds.length
      ? await ApDocument.findAll({ where: { DocumentId: { [Op.in]: siblingIds } } })
      : [];

    const receivedByType: Record<string, number> = {};
    const mergedDocumentTypes: string[] = [];

    for (const entry of matched) {
      const typeKey = entry.typeKey;
      const isReplacement =
        replacementNorm.has(typeKey) ||
        [...replacementNorm].some((r) => documentTypesMatch(r, typeKey)) ||
        siblingDocs.some(
          (d) =>
            String(d.LifecycleStatus || "ACTIVE").toUpperCase() === "ACTIVE" &&
            documentTypesMatch(normalizeDocTypeKey(d.DocumentType), typeKey),
        );

      let supersedesId: number | null = null;
      let versionNo = 1;

      if (isReplacement) {
        const activeSameType = siblingDocs.filter(
          (d) =>
            String(d.LifecycleStatus || "ACTIVE").toUpperCase() === "ACTIVE" &&
            documentTypesMatch(normalizeDocTypeKey(d.DocumentType), typeKey),
        );
        for (const old of activeSameType) {
          const oldId = Number(old.DocumentId);
          await old.update({ LifecycleStatus: "SUPERSEDED" });
          old.LifecycleStatus = "SUPERSEDED";
          supersedesId = oldId;
          versionNo = Math.max(versionNo, Number(old.VersionNo || 1) + 1);
        }
      }

      const newId = await this.saveExtraction(
        file,
        entry.raw,
        options.uploadedBy ?? undefined,
        {
          batchPrimaryId: primaryDocumentId,
          isBatchPrimary: false,
          sourceChannel: options.sourceChannel || "EMAIL",
          emailMeta: options.emailMeta,
          storedFilePath: options.storedFilePath ?? null,
          lifecycleStatus: "ACTIVE",
          versionNo,
          supersedesDocumentId: supersedesId,
        },
      );

      if (newId == null) continue;

      const essaRow = await EssaInvoice.findOne({
        where: { DocumentId: primaryDocumentId, IsDeleted: false },
      });
      const auditBase = {
        objectId: essaRow?.InvoiceNo || `ocr-${primaryDocumentId}`,
        invoiceId: primaryDocumentId,
        correlationId:
          essaRow?.CorrelationId || mintCorrelationId(`doc${primaryDocumentId}`),
        source: options.sourceChannel === "SHAREPOINT" ? "SHAREPOINT" : options.sourceChannel === "UPLOAD" ? "UPLOAD" : "EMAIL",
      };

      if (isReplacement && supersedesId) {
        void auditSupersede({
          ...auditBase,
          reasonRemarks: `Document type ${typeKey} superseded (doc ${supersedesId} → ${newId})`,
          details: {
            documentType: typeKey,
            supersededDocumentId: supersedesId,
            newDocumentId: newId,
            versionNo,
          },
        });
        void auditDocReplaced({
          ...auditBase,
          reasonRemarks: `Replacement document merged for ${typeKey}`,
          outcomeCode: "VCH-005",
          details: {
            requesterId: options.uploadedBy ?? null,
            submitterId: options.uploadedBy ?? null,
            reviewingApUserId: null,
            reason: "REPLACEMENT",
            versionFrom: supersedesId,
            versionTo: newId,
            affectedValidationResults: null,
            approvalImpact: "pending_revalidation",
            documentType: typeKey,
          },
        });
      } else {
        void auditDocAssociated({
          ...auditBase,
          reasonRemarks: `Document associated (${typeKey})`,
          outcomeCode: "VCH-004",
          details: {
            documentType: typeKey,
            receivedDocumentId: newId,
          },
        });
      }

      // Index by canonical + original request keys so markItemsReceived can match
      // both FAKTUR_PAJAK and legacy TAX_INVOICE_FAKTUR_PAJAK rows.
      receivedByType[typeKey.toUpperCase()] = newId;
      for (const requested of options.requestedDocumentTypes || []) {
        if (!documentTypesMatch(requested, typeKey)) continue;
        receivedByType[String(requested).toUpperCase()] = newId;
        const canon = canonicalDocTypeKey(requested).toUpperCase();
        if (canon) receivedByType[canon] = newId;
      }
      mergedDocumentTypes.push(entry.normalized.documentType);
      logger.info(
        `[OCR][${traceId}] MERGE_DOC primary=${primaryDocumentId} type=${entry.normalized.documentType} newId=${newId} replacement=${isReplacement}`,
      );
    }

    // Rebuild snapshot documents: keep non-superseded entries, swap/add merged types
    const priorDocs = Array.isArray(existingSnapshot.documents)
      ? (existingSnapshot.documents as Array<Record<string, unknown>>)
      : [];

    const supersededIds = new Set(
      siblingDocs
        .filter(
          (d) =>
            String(d.LifecycleStatus || "").toUpperCase() === "SUPERSEDED",
        )
        .map((d) => Number(d.DocumentId)),
    );

    const keptDocs = priorDocs.filter((doc) => {
      const nested =
        doc?.data && typeof doc.data === "object"
          ? (doc.data as Record<string, unknown>)
          : doc;
      const docId = Number(nested?.documentId ?? doc?.documentId);
      if (Number.isFinite(docId) && supersededIds.has(docId)) return false;
      const docType = normalizeDocTypeKey(
        String(
          nested?.documentType ||
            doc?.documentType ||
            doc?.type ||
            nested?.type ||
            "",
        ),
      );
      // Drop prior entry of a type we just replaced/added (by type match)
      if (
        mergedDocumentTypes.some((m) =>
          documentTypesMatch(normalizeDocTypeKey(m), docType),
        )
      ) {
        return false;
      }
      return true;
    });

    const enrichedNew = matched.map((entry) => {
      const newId =
        receivedByType[entry.typeKey.toUpperCase()] ??
        Object.values(receivedByType)[0];
      const doc = entry.raw;
      const nested =
        doc?.data && typeof doc.data === "object"
          ? (doc.data as Record<string, unknown>)
          : doc;
      if (nested !== doc) {
        return {
          ...doc,
          data: {
            ...nested,
            documentId: newId,
          },
        };
      }
      return {
        ...doc,
        documentId: newId,
      };
    });

    const nextSnapshot: Record<string, unknown> = {
      ...existingSnapshot,
      documents: [...keptDocs, ...enrichedNew],
      primaryDocumentId,
      lastDocReqMergedAt: new Date().toISOString(),
      lastDocReqMergedTypes: mergedDocumentTypes,
    };

    await ApDocumentExtraction.destroy({
      where: {
        DocumentId: primaryDocumentId,
        FieldName: BATCH_SNAPSHOT_FIELD,
      },
    });
    await ApDocumentExtraction.create({
      DocumentId: primaryDocumentId,
      FieldName: BATCH_SNAPSHOT_FIELD,
      FieldValue: JSON.stringify(nextSnapshot),
    });

    await this.upsertEssaInvoiceFromSnapshot(
      primaryDocumentId,
      nextSnapshot,
      primary,
    );

    return {
      primaryDocumentId,
      receivedByType,
      mergedDocumentTypes,
      snapshot: nextSnapshot,
    };
  }

  /** Whether any validation results already exist for this package primary. */
  async hasValidationResults(documentId: number): Promise<boolean> {
    const row = await ApValidationResult.findOne({
      where: { DocumentId: documentId },
      attributes: ["ValidationId"],
    });
    return Boolean(row);
  }

  async upsertEssaInvoiceFromSnapshot(
    documentId: number,
    snapshot: Record<string, unknown>,
    document: ApDocument,
  ): Promise<void> {
    const derived = deriveListRowFromSnapshot(documentId, snapshot, document);
    const existing = await EssaInvoice.findOne({ where: { DocumentId: documentId } });
    const invoiceNo =
      clipEssaInvoiceNo(derived.invoice_no) ||
      (await resolveInvoiceNoFromExtraction(documentId)) ||
      clipEssaInvoiceNo(existing?.InvoiceNo);
    const now = new Date();
    const slaDue = computeSlaDueAt(document.UploadedAt);
    const sourceChannel =
      (snapshot.sourceChannel as string | undefined) ||
      (snapshot.__sourceChannel__ as string | undefined) ||
      null;
    const payload = {
      DocumentId: documentId,
      InvoiceHeaderId: document.InvoiceHeaderId ?? null,
      InvoiceNo: invoiceNo,
      InvoiceDate: derived.invoice_date,
      VendorName: derived.vendor_name,
      VendorCode: null as string | null,
      PoNumber: derived.po_number,
      InvoiceWorkflow: derived.invoice_workflow,
      InvoiceType: derived.invoice_type,
      FailedChecks: derived.failed_checks,
      OpenExceptions: derived.openExceptions,
      SlaDueAt: slaDue,
      SlaBreached: derived.sla_breached,
      TotalAmount: derived.total_amount,
      Currency: normalizeCurrencyCode(derived.currency),
      IsDeleted: false,
      ModifiedDt: now,
      ModifiedBy: document.UploadedBy ?? null,
    };

    if (existing) {
      const keepStage = TERMINAL_STAGES.has(existing.WorkflowStage);
      const previousStage = existing.WorkflowStage;
      const nextStage = keepStage
        ? existing.WorkflowStage
        : existing.WorkflowStage === "draft" && derived.workflow_stage !== "validated"
          ? "draft"
          : derived.workflow_stage;
      const correlationId = existing.CorrelationId || mintCorrelationId(`inv${existing.Id || documentId}`);
      try {
        await existing.update({
          ...payload,
          WorkflowStage: nextStage,
          CorrelationId: correlationId,
        });
      } catch (error) {
        // Older DBs without CorrelationId should still update workflow fields.
        logger.warn(
          `ESSA_INVOICE update with CorrelationId failed for document ${documentId}; retrying without it: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await existing.update({
          ...payload,
          WorkflowStage: nextStage,
        });
      }
      await existing.reload();
      if (existing.InvoiceNo) {
        await syncSlaInvoiceNumber(existing.Id, existing.InvoiceNo);
      }
      try {
        await slaEngine.onInvoiceCreated(existing);
        await slaEngine.onInvoiceStageChange(existing, previousStage);
      } catch (error) {
        logger.warn(`SLA clock update failed for document ${documentId}`, error);
      }
      return;
    }

    const correlationId = mintCorrelationId(`doc${documentId}`);
    let created: EssaInvoice;
    try {
      created = await EssaInvoice.create({
        ...payload,
        WorkflowStage: derived.workflow_stage,
        CorrelationId: correlationId,
        CreatedDt: document.UploadedAt || now,
        CreatedBy: document.UploadedBy ?? null,
      });
    } catch (error) {
      logger.warn(
        `ESSA_INVOICE create with CorrelationId failed for document ${documentId}; retrying without it: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      created = await EssaInvoice.create({
        ...payload,
        WorkflowStage: derived.workflow_stage,
        CreatedDt: document.UploadedAt || now,
        CreatedBy: document.UploadedBy ?? null,
      });
    }
    try {
      await slaEngine.onInvoiceCreated(created);
    } catch (error) {
      logger.warn(`SLA clock create failed for document ${documentId}`, error);
    }
    await auditInvoiceCreated(created, {
      sourceChannel,
      actorUserId: document.UploadedBy ?? null,
    });
  }

  async updateEssaInvoiceAfterValidation(
    documentId: number,
    failedChecks: number,
    overallStatus: string,
    options: { workflowStage?: string | null } = {},
  ): Promise<void> {
    const row = await EssaInvoice.findOne({ where: { DocumentId: documentId } });
    if (!row) return;
    const pass = String(overallStatus || "").toUpperCase() === "PASS";
    const keepStage = TERMINAL_STAGES.has(row.WorkflowStage);
    const requested = String(options.workflowStage || "").trim().toLowerCase();
    const slaDue = row.SlaDueAt ? new Date(row.SlaDueAt) : null;
    const nextStage = keepStage
      ? row.WorkflowStage
      : requested === "draft"
        ? "draft"
        : pass
          ? "validated"
          : "review";
    await row.update({
      FailedChecks: failedChecks,
      WorkflowStage: nextStage,
      SlaBreached: !!(slaDue && slaDue.getTime() < Date.now()),
      ModifiedDt: new Date(),
    });
    try {
      await row.reload();
      await slaEngine.onInvoiceStageChange(row);
    } catch (error) {
      logger.warn(`SLA stage update failed for document ${documentId}`, error);
    }
  }

  private async backfillEssaInvoices(): Promise<void> {
    const primaries = await ApDocumentExtraction.findAll({
      where: { FieldName: BATCH_PRIMARY_FIELD, FieldValue: "1" },
      attributes: ["DocumentId"],
    });
    const existing = await EssaInvoice.findAll({ attributes: ["DocumentId"] });
    const have = new Set(existing.map((row) => Number(row.DocumentId)));
    for (const primary of primaries) {
      const documentId = Number(primary.DocumentId);
      if (!Number.isInteger(documentId) || have.has(documentId)) continue;
      const document = await ApDocument.findByPk(documentId);
      if (!document) continue;
      const snapshot = await this.getUploadedInvoiceSnapshot(documentId);
      if (!snapshot) continue;
      try {
        await this.upsertEssaInvoiceFromSnapshot(documentId, snapshot, document);
      } catch (error) {
        logger.warn(`Failed to backfill ESSA_INVOICE for document ${documentId}`, error);
      }
    }
    await this.backfillEssaInvoiceNumbers();
  }

  private async backfillEssaInvoiceNumbers(): Promise<void> {
    const rows = await EssaInvoice.findAll({
      where: { IsDeleted: false, ...emptyInvoiceNoWhere },
      attributes: ["Id", "DocumentId", "InvoiceNo"],
    });
    for (const row of rows) {
      const documentId = Number(row.DocumentId);
      let invoiceNo: string | null = null;
      const snapshot = await this.getUploadedInvoiceSnapshot(documentId);
      if (snapshot) {
        invoiceNo = resolveInvoiceNoFromSnapshot(snapshot);
      }
      if (!invoiceNo) {
        invoiceNo = await resolveInvoiceNoFromExtraction(documentId);
      }
      if (!invoiceNo) continue;
      try {
        await row.update({ InvoiceNo: invoiceNo, ModifiedDt: new Date() });
        await syncSlaInvoiceNumber(row.Id, invoiceNo);
      } catch (error) {
        logger.warn(`Failed to backfill InvoiceNo for ESSA_INVOICE ${row.Id}`, error);
      }
    }
  }

  private async refreshMisclassifiedListRow(row: EssaInvoice): Promise<{
    po_number: string | null;
    invoice_type: string;
    invoice_workflow: string;
  }> {
    const current = {
      po_number: row.PoNumber,
      invoice_type: row.InvoiceType,
      invoice_workflow: row.InvoiceWorkflow,
    };
    const looksWrong =
      !row.PoNumber &&
      (row.InvoiceWorkflow === "NON_PO" || row.InvoiceType === "Non-PO");
    if (!looksWrong) return current;

    try {
      const documentId = Number(row.DocumentId);
      const document = await ApDocument.findByPk(documentId);
      if (!document) return current;
      const snapshot = await this.getUploadedInvoiceSnapshot(documentId);
      if (!snapshot) return current;
      const derived = deriveListRowFromSnapshot(documentId, snapshot, document);
      if (
        derived.po_number !== row.PoNumber ||
        derived.invoice_type !== row.InvoiceType ||
        derived.invoice_workflow !== row.InvoiceWorkflow
      ) {
        await this.upsertEssaInvoiceFromSnapshot(documentId, snapshot, document);
      }
      return {
        po_number: derived.po_number,
        invoice_type: derived.invoice_type,
        invoice_workflow: derived.invoice_workflow,
      };
    } catch (error) {
      logger.warn(
        `Failed to refresh ESSA_INVOICE derived fields for document ${row.DocumentId}`,
        error,
      );
      return current;
    }
  }

  async listEssaInvoices(query: Record<string, unknown>) {
    await this.backfillEssaInvoices();
    await EssaInvoice.update(
      { SlaBreached: true },
      {
        where: {
          IsDeleted: false,
          SlaDueAt: { [Op.lt]: new Date() },
          SlaBreached: false,
        },
      },
    );

    const q = String(query.q || "").trim();
    const poType = String(query.poType || "ALL").toUpperCase();
    const stageRaw = String(query.workflow_stage || query.filter || "")
      .trim()
      .toLowerCase();
    const category = String(query.category || "").trim();
    const attention = String(query.attention || "").trim().toLowerCase();
    const dateFrom = String(query.dateFrom || "").trim();
    const dateTo = String(query.dateTo || "").trim();
    const vendor = String(query.vendor || "").trim();
    const page = Math.max(1, Number(query.page) || 1);
    const hasPageSize =
      query.pageSize !== undefined &&
      query.pageSize !== null &&
      String(query.pageSize).trim() !== "";
    const pageSizeRaw = Number(query.pageSize);
    const pageSize = hasPageSize
      ? INVOICE_PAGE_SIZES.has(pageSizeRaw)
        ? pageSizeRaw
        : 50
      : null;

    const where: any = { IsDeleted: false };
    if (poType === "PO" || poType === "NON_PO") where.InvoiceWorkflow = poType;
    if (stageRaw && stageRaw !== "all" && WORKFLOW_STAGES.has(stageRaw)) {
      where.WorkflowStage = stageRaw;
    }
    if (category && INVOICE_TYPES.has(category)) where.InvoiceType = category;
    if (attention === "sla") where.SlaBreached = true;
    if (attention === "exc") {
      where[Op.or] = [
        { FailedChecks: { [Op.gt]: 0 } },
        { OpenExceptions: { [Op.gt]: 0 } },
      ];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      where.InvoiceDate = {
        ...( /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? { [Op.gte]: dateFrom } : {}),
        ...( /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? { [Op.lte]: dateTo } : {}),
      };
    }
    if (vendor) {
      const like = { [Op.like]: `%${vendor}%` };
      where[Op.and] = [
        ...(where[Op.and] || []),
        { [Op.or]: [{ VendorName: like }, { VendorCode: like }] },
      ];
    }
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [{ InvoiceNo: like }, { VendorName: like }, { PoNumber: like }],
        },
      ];
    }

    const [total, allCount, poCount, nonPoCount, rows] = await Promise.all([
      EssaInvoice.count({ where }),
      EssaInvoice.count({ where: { IsDeleted: false } }),
      EssaInvoice.count({ where: { IsDeleted: false, InvoiceWorkflow: "PO" } }),
      EssaInvoice.count({ where: { IsDeleted: false, InvoiceWorkflow: "NON_PO" } }),
      EssaInvoice.findAll({
        where,
        order: [["CreatedDt", "DESC"], ["Id", "DESC"]],
        ...(pageSize != null
          ? { limit: pageSize, offset: (page - 1) * pageSize }
          : {}),
      }),
    ]);

    const objectIds = rows.map((row) => String(row.DocumentId));
    const instances = await slaService.openInstancesForObjects("INVOICE", objectIds);
    const instanceByObject = new Map<string, (typeof instances)[number]>();
    for (const inst of instances) {
      if (!instanceByObject.has(inst.ObjectId)) instanceByObject.set(inst.ObjectId, inst);
    }
    const now = Date.now();

    const data = await Promise.all(
      rows.map(async (row) => {
        const derived = await this.refreshMisclassifiedListRow(row);
        const inst = instanceByObject.get(String(row.DocumentId));
        const dueFromInst = inst?.DueAt ? new Date(inst.DueAt) : null;
        const slaDue = dueFromInst || (row.SlaDueAt ? new Date(row.SlaDueAt) : null);
        const remaining = inst
          ? remainingMsOf(inst.Status, dueFromInst, inst.FrozenRemainingMs, now)
          : slaDue
            ? slaDue.getTime() - now
            : null;
        const slaBreached = inst
          ? inst.Status === "BREACHED" || (remaining != null && remaining < 0)
          : !!row.SlaBreached;
        const slaDueIso = slaDue ? slaDue.toISOString() : null;
        return {
          id: `ocr-${row.DocumentId}`,
          documentId: Number(row.DocumentId),
          invoice_no: row.InvoiceNo,
          invoice_date: row.InvoiceDate,
          vendor_name: row.VendorName,
          po_number: derived.po_number,
          invoice_type: derived.invoice_type,
          invoice_workflow: derived.invoice_workflow,
          status: row.WorkflowStage,
          workflow_stage: row.WorkflowStage,
          failed_checks: Number(row.FailedChecks) || 0,
          openExceptions: Number(row.OpenExceptions) || 0,
          sla_due: slaDueIso,
          slaDue: slaDueIso,
          sla_breached: slaBreached,
          slaBreached: slaBreached,
          total_amount: row.TotalAmount != null ? Number(row.TotalAmount) : null,
          currency: row.Currency || "IDR",
          uploaded_at: row.CreatedDt?.toISOString?.() || null,
          correlation_id: row.CorrelationId || null,
        };
      }),
    );

    return {
      data,
      total,
      page: pageSize != null ? page : 1,
      pageSize: pageSize != null ? pageSize : total,
      counts: { ALL: allCount, PO: poCount, NON_PO: nonPoCount },
    };
  }
}

export default new ApInvoiceDocumentService();
