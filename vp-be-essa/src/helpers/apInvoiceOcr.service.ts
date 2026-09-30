import { DOMMatrix, DOMPoint, DOMRect, ImageData, Path2D, loadImage, createCanvas } from "@napi-rs/canvas";
const g = globalThis as any;
if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = DOMMatrix;
if (typeof g.DOMPoint === "undefined") g.DOMPoint = DOMPoint;
if (typeof g.DOMRect === "undefined") g.DOMRect = DOMRect;
if (typeof g.ImageData === "undefined") g.ImageData = ImageData;
if (typeof g.Path2D === "undefined") g.Path2D = Path2D;

// pdfjs (used for PDF rendering) relies on `process.getBuiltinModule`,
// which only exists on Node >= 20.16 / >= 22.3. Polyfill it for older runtimes.
if (g.process && typeof g.process.getBuiltinModule !== "function") {
  g.process.getBuiltinModule = (id: string) =>
    require(id.startsWith("node:") ? id.slice(5) : id);
}

import path from "path";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import {
  buildTextCorpus,
  reconcileInvoiceHeader,
  reconcileInvoiceLineItems,
} from "./apInvoiceOcr.normalize";

export type DocumentType =
  | "invoice"
  | "tax_invoice"
  | "notice"
  | "berita_acara"
  | "manhour_summary"
  | "timesheet"
  | "attendance"
  | "po"
  | "po_appendix"
  | "ses";

// User-facing labels for each supported document type. These match the
// document-type list the frontend used to show in its dropdown, and are now
// used as the tab labels in the Extraction Details section.
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "A. Invoice",
  tax_invoice: "B. Tax Invoice (VAT)",
  notice: "C. Notice",
  berita_acara: "D. Work Progress Certificate (Berita Acara)",
  manhour_summary: "E. Summary Calculation Manhour",
  timesheet: "F. Daily Time Sheet",
  attendance: "G. Daily Attendance (Biometrics)",
  po: "H. PO",
  po_appendix: "I. PO Appendix",
  ses: "K. Service Entry Sheet (SES)",
};

export interface ExtractedInvoiceField {
  fieldName: string;
  fieldValue: string;
  confidence: number;
}

export interface ExtractedLineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  amount: string;
  serviceName?: string;
  role?: string;
  manpowerName?: string;
  completionPct?: string;
  [key: string]: string | null | undefined;
}

export interface TimesheetEntry {
  date: string | null;
  regularManhour: string | null;
  overtimeManhour: string | null;
}

export interface TimesheetManpowerSheet {
  manpowerName: string | null;
  username: string | null;
  role: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalRegularManhour: string | null;
  totalOvertimeManhour: string | null;
  sheetPages: Array<number | string>;
  entries: TimesheetEntry[];
}

export type ExtractionStatus = "extracted" | "no_invoice_found";

export interface InvoiceExtractionResult {
  documentType: DocumentType;
  documentTypeLabel: string;
  fileName: string;
  fileType: string;
  status: ExtractionStatus;
  detectedDocumentType: string | null;
  invoicePages: Array<number | string>;
  header: Record<string, string | null>;
  lineItems: ExtractedLineItem[];
  fields: ExtractedInvoiceField[];
  /** One object per manpower when documentType is timesheet. */
  timesheets?: TimesheetManpowerSheet[];
  invoices?: Array<{
    detectedDocumentType: string | null;
    invoicePages: Array<number | string>;
    header: Record<string, string | null>;
    lineItems: ExtractedLineItem[];
    fields: ExtractedInvoiceField[];
  }>;
}

const BERITA_ACARA_SCHEMA = `{
  "header": {
    "poNumber": "",
    "periodStart": "",
    "periodEnd": "",
    "manhourCompletionPct": "",
    "thisManhours": "",
    "serviceName": "",
    "preparedBy": "",
    "reviewedBy": "",
    "acknowledgedBy": "",
    "approvedBy": ""
  },
  "lineItems": [
    {
      "serviceName": "",
      "manpowerName": "",
      "role": "",
      "completionPct": ""
    }
  ],
  "fields": []
}`;

const TAX_INVOICE_SCHEMA = `{
  "header": {
    "taxInvoiceNumber": "",
    "invoiceDate": "",
    "taxAmount": "",
    "grandTotal": "",
    "serviceName": "",
    "vendorName": "",
    "vendorTaxId": "",
    "buyerName": "",
    "currency": ""
  },
  "lineItems": [],
  "fields": []
}`;

const NOTICE_SCHEMA = `{
  "header": {
    "taxInvoiceNumber": "",
    "invoiceDate": "",
    "taxAmount": ""
  },
  "lineItems": [],
  "fields": []
}`;

const MANHOUR_SUMMARY_SCHEMA = `{
  "header": {
    "poNumber": "",
    "periodStart": "",
    "periodEnd": "",
    "vendorName": "",
    "projectName": "",
    "totalRegularManhour": "",
    "totalOvertimeManhour": ""
  },
  "lineItems": [
    {
      "manpowerName": "",
      "role": "",
      "regularManhour": "",
      "overtimeMondaySaturdayManhour": "",
      "overtimeSundayHolidayManhour": "",
      "overtimeManhour": "",
      "totalActualManhour": ""
    }
  ],
  "fields": []
}`;

const TIMESHEET_APPROVER_NAME_BLOCKLIST = new Set([
  "linda kenda",
  "meirwin h babo",
  "melwin h babo",
  "achmad firdaus",
  "ruhiyat d",
  "kuswara hendrayana",
]);

const BERITA_ACARA_PROGRESS_SYSTEM = `You are a Berita Acara WORK PROGRESS SUMMARY extraction specialist.

Your ONLY job is to read the progress metrics block — the table or paragraph that shows work
completion for Previous Period, This Period, and Cumulative.

Common section titles:
- "The work has been performed with the progress as follows"
- "Progress as follow"
- "Kemajuan pekerjaan"

Typical layout (columns: Previous Period | This Period | Cumulative):
  Row 1: Manhour completion % / Progress % — e.g. 67,201% | 6,920% | 74,121%
  Row 2: This man hours / Manhours (Hours) — e.g. 7.234,50 Hours | 758,50 Hours | 7.993,00 Hours

Return JSON only:
{
  "thisManhours": "<This Period man-hours ONLY, e.g. 758.50 — no unit suffix>",
  "manhourCompletionPct": "<This Period completion % ONLY, e.g. 6.920>",
  "previousManhours": "<Previous Period man-hours or null>",
  "cumulativeManhours": "<Cumulative man-hours or null>",
  "previousPeriodPct": "<Previous Period completion % or null>",
  "cumulativePct": "<Cumulative completion % or null>",
  "tables": [
    {
      "headers": ["Description", "Previous Period", "This Period", "Cumulative"],
      "rows": [
        ["Manhour completion %", "67,201%", "6,920%", "74,121%"],
        ["This man hours", "7.234,50 Hours", "758,50 Hours", "7.993,00 Hours"]
      ]
    }
  ]
}

Rules:
- Read slowly and carefully — small print and comma decimals are common (758,50 = 758.50).
- NEVER return Cumulative or Previous Period values in thisManhours or manhourCompletionPct.
- Transcribe the progress table into "tables" even when you also populate header fields.
- Return null for fields you cannot read. Never guess.
- Ignore manpower name tables, signatures, and invoice amounts.`;

const TIMESHEET_IDENTITY_SYSTEM = `You read the employee metadata block from an ALE / Amanah Lestari Energy daily timesheet.

Layout (top-left of page, below title "TIME SHEET - Daily Labour and Overtime Calculation"):
  No. ID : <8-digit employee ID>
  Name : <worker full name>
  Position : <job title, e.g. Welder, Fitter, Pipe Fitter>
  Date of Hired : ...
  Class : NON STAFF

Return JSON only:
{ "username": "<No. ID value>", "manpowerName": "<Name value>", "role": "<Position value>" }

Rules:
- Read ONLY the top-left labelled block — NOT the daily table, NOT signature/approval footer.
- NEVER use: Linda Kenda, Meirwin H Babo, Achmad Firdaus, Ruhiyat D, Kuswara Hendrayana.
- Transcribe manpowerName character-by-character exactly as printed — do not guess or autocorrect.`;

const TIMESHEET_SCHEMA = `{
  "header": {
    "poNumber": "",
    "periodStart": "",
    "periodEnd": "",
    "vendorName": "",
    "projectName": ""
  },
  "timesheets": [
    {
      "manpowerName": "",
      "username": "",
      "role": "",
      "periodStart": "",
      "periodEnd": "",
      "totalRegularManhour": "",
      "totalOvertimeManhour": "",
      "sheetPages": [],
      "entries": [
        {
          "date": "",
          "basicTime": "",
          "otActual": "",
          "regularManhour": "",
          "overtimeManhour": ""
        }
      ]
    }
  ],
  "lineItems": [],
  "fields": []
}`;

const PO_SCHEMA = `{
  "header": {
    "poNumber": "",
    "poDate": "",
    "vendorName": "",
    "vendorCode": "",
    "buyerName": "",
    "projectName": "",
    "requisitionNo": "",
    "deliveryDate": "",
    "serviceStartDate": "",
    "serviceEndDate": "",
    "currency": "",
    "subtotal": "",
    "taxAmount": "",
    "totalAmount": "",
    "paymentTerms": "",
    "incoterms": ""
  },
  "lineItems": [
    {
      "description": "",
      "deliveryDate": "",
      "quantity": "",
      "unitPrice": "",
      "amount": ""
    }
  ],
  "fields": []
}`;

const PO_APPENDIX_SCHEMA = `{
  "header": {
    "poNumber": "",
    "poDate": "",
    "vendorName": "",
    "vendorCode": "",
    "buyerName": "",
    "projectName": "",
    "currency": ""
  },
  "lineItems": [
    {
      "description": "",
      "manpowerRole": "",
      "role": "",
      "unitPrice": "",
      "quantity": "",
      "amount": ""
    }
  ],
  "fields": []
}`;

const SES_SCHEMA = `{
  "header": {
    "sesNo": "",
    "poNumber": "",
    "prNo": "",
    "transactionDate": "",
    "vendorName": "",
    "site": "",
    "projectName": "",
    "serviceStartDate": "",
    "serviceEndDate": "",
    "sesDescription": "",
    "poValue": "",
    "totalSesValue": "",
    "totalSesValueUsd": "",
    "remainingPoBalance": "",
    "currency": ""
  },
  "lineItems": [
    {
      "description": "",
      "quantity": "",
      "lineValue": ""
    }
  ],
  "fields": []
}`;

const BASE_SCHEMA = `{
  "header": {
    "invoiceNumber": "",
    "invoiceDate": "",
    "dueDate": "",
    "vendorName": "",
    "vendorAddress": "",
    "vendorTaxId": "",
    "buyerName": "",
    "poNumber": "",
    "serviceName": "",
    "currency": "",
    "manhourUnitRate": "",
    "subtotal": "",
    "taxAmount": "",
    "totalAmount": "",
    "grandTotal": "",
    "paymentTerms": "",
    "bankName": "",
    "bankBranch": "",
    "bankAccount": "",
    "accountHolder": ""
  },
  "lineItems": [
    {
      "description": "",
      "role": "",
      "quantity": "",
      "unit": "",
      "unitPrice": "",
      "amount": ""
    }
  ],
  "fields": [
    {
      "fieldName": "",
      "fieldValue": "",
      "confidence": 0.0
    }
  ]
}`;

const HEADER_KEYS: Record<DocumentType, string[]> = {
  invoice: [
    "invoiceNumber",
    "invoiceDate",
    "dueDate",
    "vendorName",
    "vendorAddress",
    "vendorTaxId",
    "buyerName",
    "poNumber",
    "serviceName",
    "currency",
    "manhourUnitRate",
    "subtotal",
    "taxAmount",
    "totalAmount",
    "grandTotal",
    "paymentTerms",
    "bankName",
    "bankBranch",
    "bankAccount",
    "accountHolder",
    "invoiceWorkflow",
  ],
  tax_invoice: [
    "taxInvoiceNumber",
    "invoiceDate",
    "taxAmount",
    "grandTotal",
    "bankName",
    "bankAccount",
    "bankBranch",
    "serviceName",
    "vendorName",
    "vendorTaxId",
    "buyerName",
    "currency",
  ],
  notice: ["taxInvoiceNumber", "invoiceDate", "taxAmount"],
  berita_acara: [
    "poNumber",
    "periodStart",
    "periodEnd",
    "manhourCompletionPct",
    "thisManhours",
    "serviceName",
    "preparedBy",
    "reviewedBy",
    "acknowledgedBy",
    "approvedBy",
    "vendorName",
    "projectName",
  ],
  manhour_summary: [
    "poNumber",
    "periodStart",
    "periodEnd",
    "vendorName",
    "projectName",
    "totalRegularManhour",
    "totalOvertimeManhour",
    "currency",
  ],
  timesheet: [
    "poNumber",
    "periodStart",
    "periodEnd",
    "vendorName",
    "projectName",
  ],
  attendance: ["site", "periodStart", "periodEnd", "vendorName"],
  po: [
    "poNumber",
    "poDate",
    "vendorName",
    "vendorCode",
    "buyerName",
    "projectName",
    "requisitionNo",
    "deliveryDate",
    "serviceStartDate",
    "serviceEndDate",
    "currency",
    "subtotal",
    "taxAmount",
    "totalAmount",
    "paymentTerms",
    "incoterms",
  ],
  po_appendix: [
    "poNumber",
    "poDate",
    "vendorName",
    "vendorCode",
    "buyerName",
    "projectName",
    "currency",
  ],
  ses: [
    "sesNo",
    "poNumber",
    "prNo",
    "transactionDate",
    "vendorName",
    "site",
    "projectName",
    "serviceStartDate",
    "serviceEndDate",
    "sesDescription",
    "poValue",
    "totalSesValue",
    "totalSesValueUsd",
    "remainingPoBalance",
    "currency",
  ],
};

const LINE_ITEM_KEYS: Record<DocumentType, string[]> = {
  invoice: ["description", "role", "quantity", "unit", "unitPrice", "amount"],
  tax_invoice: [
    "serviceName",
    "role",
    "description",
    "quantity",
    "unitPrice",
    "amount",
  ],
  notice: [],
  berita_acara: [
    "serviceName",
    "role",
    "manpowerName",
    "completionPct",
    "quantity",
    "amount",
  ],
  manhour_summary: [
    "role",
    "manpowerName",
    "regularManhour",
    "overtimeMondaySaturdayManhour",
    "overtimeSundayHolidayManhour",
    "overtimeManhour",
    "totalActualManhour",
    "description",
  ],
  timesheet: [
    "date",
    "username",
    "role",
    "manpowerName",
    "basicTime",
    "otActual",
    "regularManhour",
    "overtimeManhour",
  ],
  attendance: ["date", "username", "event"],
  po: ["description", "deliveryDate", "quantity", "unitPrice", "amount"],
  po_appendix: [
    "description",
    "manpowerRole",
    "role",
    "unitPrice",
    "quantity",
    "amount",
  ],
  ses: ["description", "quantity", "lineValue"],
};

const FIELD_HINTS: Record<string, string> = {
  taxInvoiceNumber: 'the tax / "Faktur Pajak" invoice number',
  invoiceDate: "the document date",
  dueDate: 'the payment due date (labels: "Due Date", "Jatuh Tempo", "Payment Due")',
  noticeDate: "the notice date",
  noticeNumber: "the notice reference number",
  taxAmount: "the VAT / PPN tax amount",
  grandTotal: "the grand total including tax",
  poNumber: "the Purchase Order number",
  poDate: "the Purchase Order date",
  vendorCode: "the vendor / supplier code",
  projectName:
    'the project / location name (labels: "Project", "Proyek", "Location", "Lokasi", "Site")',
  requisitionNo: "the purchase requisition number",
  deliveryDate: "the delivery date",
  serviceStartDate: "service period start date",
  serviceEndDate: "service period end date",
  periodStart: "the start of the work/claim period",
  periodEnd: "the end of the work/claim period",
  manhourCompletionPct: "the manhour percentage completion",
  thisManhours:
    'man-hours for THIS period from the progress table row labelled "Man hours", "Manhours (Hours)", or similar — value under the "This Period" / "Periode Ini" column only (not Previous or Cumulative)',
  preparedBy: "name of the person who prepared the document",
  reviewedBy: "name of the reviewer",
  acknowledgedBy: "name of the acknowledger",
  approvedBy: "name of the approver",
  totalRegularManhour: "total regular man-hours",
  totalOvertimeManhour: "total overtime man-hours",
  site: "the site / location",
  sesNo: "the Service Entry Sheet number",
  prNo: "the Purchase Requisition number",
  transactionDate: "the SES transaction/posting date",
  sesDescription: "the SES short description",
  poValue: "the total PO value",
  totalSesValue: "the total SES value",
  totalSesValueUsd: "the total SES value in USD",
  remainingPoBalance: "the remaining PO balance after this SES",
  incoterms: "the incoterms",
  serviceName: "the service / activity name",
  manhourUnitRate:
    'the per-manhour unit rate / rate calculation, if shown (labels: "Rate", "Unit Rate", "Rate/MH", "Rate per Manhour", "Harga Satuan", "Unit Rate Calculation")',
  vendorName:
    'the vendor / supplier / contractor name (labels: "Supplier", "Contractor", "Penjual", "Pemasok")',
  buyerName:
    'the buyer / customer / client company name (labels: "Customer", "Client", "Pembeli", "Bill To")',
  currency: "the currency code (e.g. IDR, USD)",
  subtotal: "the total amount before tax",
  totalAmount: "the total amount",
  paymentTerms:
    'the payment terms (labels: "Payment Terms", "Terms of payment", due-date bullets)',
  invoiceWorkflow:
    'workflow classification: "PO" when a PO number is present, otherwise "NON_PO"',
  description: "the line description",
  unit: "the unit of measure (e.g. EA, LOT, manhour)",
  amount: "the line amount / total",
  date: "the date of this row / entry",
  username: "the worker's user ID / login / employee or biometric ID",
  completionPct: "the completion percentage for this row",
  event: 'the attendance event (e.g. "Check In", "Check Out", "IN", "OUT")',
  regularManhour:
    "regular / normal man-hours (NOT overtime). Labels: Regular MH, Regular Manhour, Jam Normal, Normal Hours",
  overtimeManhour:
    "TOTAL overtime man-hours for that person — sum of weekday OT + Sunday/holiday OT. Do NOT return only one OT column.",
  manpowerName: "worker's full name as printed in the table",
  role: "job role / trade (e.g. Welder, Fitter, Pipe Fitter, Supervisor)",
  manpowerRole: "manpower role on a PO appendix price breakdown (same as role when only one column)",
  quantity: "quantity / qty / volume accepted",
  unitPrice: "unit price per manhour or service unit",
  lineValue: "the line value / amount for the service line",
};

const COMMON_RULES = `Rules:
    - Use OCR, text layer and layout analysis.
    - Support multilingual documents (English & Indonesian, e.g. "Rp", "No.", "Tanggal").
    - Scan the ENTIRE page (headers, sub-headers, footers, signature blocks, stamps,
      side notes and tables) for every requested field before deciding it is absent.
    - A field may be printed under a DIFFERENT but equivalent label, and often in
      Bahasa Indonesia. Match by meaning, not by an exact label. For example:
      role/position = "Position", "Jabatan", "Posisi", "Trade";
      dueDate = "Due Date", "Jatuh Tempo", "Tanggal Jatuh Tempo";
      vendorName = "Supplier", "Contractor", "Penjual", "Pemasok";
      buyerName = "Customer", "Client", "Pembeli", "Bill To";
      projectName = "Project", "Proyek", "Location", "Lokasi", "Site";
      periodStart/periodEnd = "Period", "Periode", "From/To", "Dari/Sampai".
    - Only set a field to null after genuinely checking the whole page for any of its
      equivalent labels. Never hallucinate; still preserve EXACT values, including
      thousand separators (e.g. "21.990.000"), currency symbols, dates and ID/account
      numbers.
    - Transcribe every digit exactly; never round, transpose or alter a value.
    - If multiple matching documents exist in the file, return an array of objects.

    LINE ITEM RULES (when a line-item / table section exists):
    - Extract EVERY row, in the EXACT same top-to-bottom order as printed.
    - Keep ALL rows even if two rows are identical or look like duplicates.
      NEVER deduplicate, merge, combine, reorder or rename rows. The number of output
      rows MUST equal the number of rows printed in the table.
    - Copy text character-for-character. Set missing cells to null but keep the row.`;

const buildSchema = (documentType: DocumentType): string => {
  const header: Record<string, string> = {};
  for (const key of HEADER_KEYS[documentType]) header[key] = "";
  const lineItemKeys = LINE_ITEM_KEYS[documentType];
  const schema: Record<string, unknown> = {
    documentType: "",
    invoicePages: [],
    header,
    lineItems: lineItemKeys.length
      ? [Object.fromEntries(lineItemKeys.map((k) => [k, ""]))]
      : [],
    fields: [{ fieldName: "", fieldValue: "", confidence: 0.0 }],
  };
  return JSON.stringify(schema, null, 2);
};

const fieldList = (keys: string[]): string =>
  keys
    .map((k) => (FIELD_HINTS[k] ? `    ${k}  (${FIELD_HINTS[k]})` : `    ${k}`))
    .join("\n");

const buildDocPrompt = (
  documentType: DocumentType,
  meta: {
    engine: string;
    docName: string;
    properName: string;
    synonyms: string;
    lineItemNote?: string;
  },
): string => {
  const headerList = fieldList(HEADER_KEYS[documentType]);
  const liKeys = LINE_ITEM_KEYS[documentType];
  const lineSection = liKeys.length
    ? `Line items — extract every row; each row has these columns (null when absent):\n${fieldList(
      liKeys,
    )}${meta.lineItemNote ? `\n    ${meta.lineItemNote}` : ""}`
    : `This document type has no line-item table; always return "lineItems": [].`;

  return `You are ${meta.engine}.

    Task:
    1. Classify each page.
    2. Identify ${meta.docName} pages.
    3. Merge pages belonging to the same ${meta.docName}.
    4. Extract data only from ${meta.docName} pages.
    5. Ignore all unrelated pages.

    Treat the following as a ${meta.docName}: ${meta.synonyms}.

    ${COMMON_RULES}

    If no ${meta.docName} exists in the document, return:
    {"documentType":"No ${meta.properName} Found"}

    Header fields to extract (use null when absent):
${headerList}

    ${lineSection}

    Output:
    Return valid JSON only with "documentType", an "invoicePages" array of the page
    numbers used, "header", "lineItems" and "fields".
    ${buildSchema(documentType)}`;
};

const PROMPTS: Record<DocumentType, { system: string; user: string }> = {
  invoice: {
    system: `You are an Invoice OCR Extraction Engine.

    Task:
    1. Classify each page.
    2. Identify invoice pages.
    3. Merge pages belonging to the same invoice.
    4. Extract invoice data only from invoice pages.
    5. Ignore non-invoice pages.

    Possible document types:
    Invoice, Credit Note, Debit Note, Statement, Purchase Order,
    Delivery Order, Packing List, Receipt, Other.

    Rules:
    - Use OCR, text layer and layout analysis.
    - Support multilingual documents (e.g. Indonesian: "Kwitansi", "Rp", "Bank", "No. Rekening").
    - Scan the ENTIRE page (header, footer, side notes, signature block, stamps and
      tables) for every requested field. A field may appear under a different but
      equivalent label, often in Bahasa Indonesia — match by meaning, not exact text.
      Only set a field to null after checking the whole page for its equivalents.
    - Never hallucinate values. Preserve exact values, including thousand separators
      (e.g. "21.990.000"), currency symbols, dates, and account numbers.
    - Return null if a field is not found.
    - Do not guess invoice numbers, tax IDs or dates.
    - invoiceNumber is the value beside "INVOICE NO" / "Invoice No" / "Nomor Invoice" in the
      header (e.g. INV/TD/000591/2026, 568/PT.ALE-PAU/04/2026). Copy it exactly as printed.
      PT. Amanah Lestari Energy uses NNN/PT.ALE-PAU/MM/YYYY with 3 digits first — not INV/.
      DATE is on the next line; do not merge it into invoiceNumber. NEVER use the Faktur Pajak
      e-Faktur serial (15–17 digits) or a PO number (4203…) as invoiceNumber.
    - poNumber is the SAP / contract purchase order (typically a 10-digit number starting
      with 4203). Return null when no PO is printed — travel, ticket and non-PO invoices
      often have no PO reference.
    - Travel / ticket agency invoices (e.g. Wisata Kawan): vendorName is the issuing
      travel agency (letterhead / "Issued by" block). serviceName is the ticket or
      service line (e.g. "Ticket Domestic"). PPN may appear inline as "PPN 34,210.00"
      near the totals. Bank details may read "Bank BCA : 6970747999" on one line.
      paymentTerms may be bullet points under "Terms of payment" including the due date.
    - subtotal is the amount BEFORE tax (sum of line items). grandTotal includes PPN/VAT.
    - If multiple invoices exist, return an array.
    - If no invoice exists, return:
      {"documentType":"No Invoice Found"}

    Required header fields:

    invoiceNumber
    invoiceDate
    dueDate            (the payment due date; labels: "Due Date", "Jatuh Tempo",
                        "Tanggal Jatuh Tempo", "Payment Due")
    vendorName
    vendorAddress
    vendorTaxId
    buyerName
    poNumber
    serviceName        (the work/service title, e.g. the heading above the line items)
    currency           (e.g. IDR)
    manhourUnitRate    (the per-manhour unit rate, when manpower is priced by man-hour.
                        Look for a "Rate", "Unit Rate", "Rate/MH", "Rate per Manhour" or
                        "Harga Satuan" column, or a rate stated within a line description.
                        Copy the exact amount. null when the invoice has no manhour rate)
    subtotal           (the "Total" / "Subtotal" amount before tax)
    taxAmount          (the VAT / PPN / tax amount, e.g. "VAT 11%")
    totalAmount        (the "Total" amount; may equal subtotal when tax is separate)
    grandTotal         (the "Grand Total" amount including tax)
    paymentTerms

    Bank details (look under "Please remit to the following bank" or any bank block).
    Labels vary — map them as follows:
    bankName           the bank itself. Labels: "Bank", "Bank Name", "Bank Address".
                       e.g. "PT. Bank Mandiri (Persero) Tbk."
    bankBranch         the branch. Labels: "Cabang", "Branch". e.g. "Cabang Luwuk".
                       (often on the line right after the bank name)
    bankAccount        the account number, copied EXACTLY including dashes.
                       Labels: "Bank Account", "Account Number", "Account No.",
                       "No. Rekening", "Rekening", "A/C No". e.g. "1510010173695".
    accountHolder      the beneficiary name. Labels: "Account Name", "Account Holder",
                       "Atas Nama", "Beneficiary". e.g. "PT. Amanah Lestari Energy".

    Note: "Account Name" is the accountHolder (a name), while "Bank Account" /
    "Bank Account No." is the bankAccount (digits). Never confuse the two, and
    never leave bankAccount null if a numeric account value is present anywhere
    in the bank block.

    LINE ITEMS — this is critical, reproduce the table EXACTLY:
    - Extract EVERY row listed under the line-item / description table,
      including each "Claim" row and each cost component.
    - Output the rows in the EXACT same top-to-bottom order as they appear.
      Do NOT reorder, sort, or group them.
    - Keep ALL rows even if two or more rows are identical or look like duplicates
      (e.g. "MCU" and "PPE" may legitimately appear more than once). NEVER deduplicate,
      merge, combine, or collapse rows. The number of output rows MUST equal the number
      of rows printed in the table.
    - Copy the description text EXACTLY as written, character for character
      (e.g. "MCU" must stay "MCU", not "MUC").
    - A line item is valid even if it ONLY has a description and an amount.
      If quantity or unitPrice are not present in the table, set them to null —
      DO NOT drop the row.
    - Include rows whose amount is zero, blank, or shown as "-" (set amount to null,
      but keep the row and its description).
    - Transcribe every amount DIGIT BY DIGIT, preserving the exact thousand separators
      (e.g. "4.456.500" — do not transpose, round, or alter any digit).
    - Do NOT include the "Total", "VAT", "Subtotal" or "Grand Total" summary rows as
      line items — those belong in the header fields above.
    - NEVER return an empty "lineItems" array when the invoice body contains a
      description/amount table or any "Claim for … Direct Cost / Overtime" rows.
      At minimum extract every claim row (Direct Cost Welder, Direct Cost Fitter,
      Overtime Welder, Overtime Fitter, and other billed components) with its amount.

    Each line item:
    description
    role         (the manpower role / position for this line, e.g. "Welder", "Fitter";
                  may be labeled "Position", "Jabatan", "Posisi" or "Trade";
                  null if the row is not tied to a specific manpower role)
    quantity     (null if not present)
    unit         (unit of measure such as EA, LOT, PR, manhour, etc.;
                  null if the table has no unit-of-measure column)
    unitPrice    (null if not present)
    amount

    Output:
    Return valid JSON only. Place the header fields inside "header",
    the line items inside "lineItems", and include a "documentType"
    string plus an "invoicePages" array of the page numbers used.
    ${BASE_SCHEMA}`,
    user: "Extract invoice data from this document.",
  },
  tax_invoice: {
    system: `You are an Indonesian Tax Invoice (Faktur Pajak) OCR Extraction Engine.

    This is an official Indonesian "Faktur Pajak" (e-Faktur / Coretax). Labels are in
    Bahasa Indonesia. Read Indonesian text carefully.

    Extract these CORE fields (the three below are mandatory; never guess them):

    1. taxInvoiceNumber
       Source: "Kode dan Nomor Seri Faktur Pajak" / "Nomor Seri Faktur Pajak".
       This is the long numeric e-Faktur serial (typically 15–17 digits).
       Example: "04002600142842732"
       CRITICAL: This is NOT a commercial invoice number (e.g. INV/ALE/2026/04/0312).
       NEVER put this value in "invoiceNumber". Use "taxInvoiceNumber" only.

    2. invoiceDate
       Source: date near the signature block, e.g. "KAB. BANGGAI, 22 April 2026".
       Return the exact date string as printed.

    3. taxAmount
       Source: "Jumlah PPN" row in the totals section (the VAT amount).
       Example: "6.053.245,00"
       Copy the amount EXACTLY with Indonesian formatting (dot thousands, comma decimals).
       Do NOT use DPP, Harga Jual, or PPnBM values for this field.

    ALSO extract these identity fields WHEN they are printed on the Faktur Pajak
    (return null if a field is genuinely absent — do not guess):

    4. vendorName    the seller. Labels: "Pengusaha Kena Pajak", "Penjual", "Nama".
    5. vendorTaxId   the seller NPWP. Labels: "NPWP" (in the seller / Penjual block).
    6. buyerName     the buyer. Labels: "Pembeli Barang Kena Pajak", "Pembeli", "Nama".
    7. currency      the currency code (e.g. IDR) if shown.
    8. grandTotal    the total payable including PPN, if a total row is shown
                     (e.g. "Jumlah", "Total"). Copy exactly.

    Rules:
    - Do NOT extract invoiceNumber — commercial invoices use a different number format.
    - Do NOT extract PO numbers, line items, or bank details.
    - Return lineItems as an empty array [].
    - Return null for any field not found. Never guess.
    - Set documentType to "Tax Invoice" or "Faktur Pajak".

    Output: valid JSON only with "header", empty "lineItems", "documentType", "invoicePages".
    ${TAX_INVOICE_SCHEMA}`,
    user: "Extract the Faktur Pajak serial number, date, Jumlah PPN, and any seller/buyer/total details printed on this document.",
  },
  notice: {
    system: `You are an Indonesian Notice (Surat Pemberitahuan) OCR Extraction Engine.

    This is a tax-related "Notice" / "Surat Pemberitahuan" letter that accompanies or
    references a Faktur Pajak. Labels may be in Bahasa Indonesia or English.
    Read the document carefully.

    Extract these CORE fields (the three below are mandatory; never guess them):

    1. taxInvoiceNumber
       Source: the Faktur Pajak / tax invoice serial referenced on the notice.
       Labels: "Nomor Seri Faktur Pajak", "Kode dan Nomor Seri Faktur Pajak",
       "Tax Invoice Number", "No. Faktur Pajak", "Nomor Faktur Pajak".
       This is the long numeric e-Faktur serial (typically 15–17 digits).
       Example: "04002600142842732"
       CRITICAL: This is NOT a commercial invoice number (e.g. INV/ALE/2026/04/0312).
       NEVER put this value in "invoiceNumber". Use "taxInvoiceNumber" only.

    2. invoiceDate
       Source: the date printed on the notice.
       Labels: "Date", "Tanggal", "Tgl", date near the letterhead or signature block.
       Return the exact date string as printed (e.g. "22 April 2026", "22/04/2026").

    3. taxAmount
       Source: the VAT / PPN amount stated on the notice.
       Labels: "VAT Amount", "Jumlah PPN", "PPN", "VAT", "Pajak Pertambahan Nilai".
       Example: "6.053.245,00"
       Copy the amount EXACTLY with Indonesian formatting (dot thousands, comma decimals).
       Do NOT use DPP, Harga Jual, or PPnBM values for this field.

    Rules:
    - Do NOT extract invoiceNumber — commercial invoices use a different number format.
    - Do NOT extract PO numbers, line items, bank details, or vendor/buyer identity fields.
    - Return lineItems as an empty array [].
    - Return null for any field not found. Never guess.
    - Set documentType to "Notice" or "Surat Pemberitahuan".

    Output: valid JSON only with "header", empty "lineItems", "documentType", "invoicePages".
    ${NOTICE_SCHEMA}`,
    user: "Extract the tax invoice number, date, and VAT amount from this Notice (Surat Pemberitahuan) document.",
  },
  berita_acara: {
    system: `You are a Berita Acara (Work Progress Certificate / BAP) OCR Extraction Engine.

    Documents may be in English and/or Bahasa Indonesia. Common titles:
    "Berita Acara", "Berita Acara Serah Terima Pekerjaan", "Work Progress Certificate".

    Extract ONLY these fields:

    HEADER
    poNumber              PO / Contract Order number (e.g. "4203000546", "PO 4203000546").
                          Labels: "PO No", "Nomor PO", "Contract Order No", "Purchase Order".
    periodStart           Start of the work period / claim period.
                          Labels: "Period From", "Periode Mulai", "From", "Start Date".
    periodEnd             End of the work period / claim period.
                          Labels: "Period To", "Periode Akhir", "To", "End Date".
    WORK PROGRESS SUMMARY (highest priority — read this block slowly and completely):
    manhourCompletionPct  Manhour / work completion percentage for THIS period only.
                          In the progress block, find the percentage row labelled
                          "This Period" / "Periode Ini" (NOT Previous Period or Cumulative).
                          Example: Previous Period 67,201% | This Period 6,920% | Cumulative 74,121%
                          → return "6.920" or "6,920%". Never use Cumulative.
    thisManhours          Man-hours for THIS period from the progress metrics block.
                          Find the row labelled "This man hours", "This Man Hours",
                          "Manhours (Hours)" with a "This Period" column, or similar.
                          Read ONLY the This Period value — e.g. "758,50 Hours" → "758.50".
                          Do NOT use Previous man hours or Cumulative MH values.

    Also return a "tables" array with the full progress summary table when present:
    tables[].headers = ["Description", "Previous Period", "This Period", "Cumulative"] (or as printed)
    tables[].rows = one row per metric (completion %, man-hours, etc.)
    serviceName           Service / activity / project title for the work covered.
                          Labels: "Service Name", "Activity", "Nama Pekerjaan", "Scope of Work".

    APPROVAL CHECK — names (or signatures) from the sign-off / approval block:
    preparedBy            Name of the person who Prepared the document.
                          Labels: "Prepared By", "Dibuat Oleh", "Disiapkan Oleh".
    reviewedBy            Name of the person who Reviewed the document.
                          Labels: "Reviewed By", "Diperiksa Oleh", "Diteliti Oleh".
    acknowledgedBy        Name of the person who Acknowledged the document.
                          Labels: "Acknowledged By", "Diketahui Oleh", "Mengetahui".
    approvedBy            Name of the person who Approved the document.
                          Labels: "Approved By", "Disetujui Oleh", "Menyetujui".

    LINE ITEMS — one row per manpower person listed in the certificate table:
    serviceName           Service / activity name for this row, if shown per row; otherwise null.
    manpowerName          Worker's full name / Namer.
    role                  Job role / position (e.g. "Welder", "Fitter", "Pipe Fitter");
                          may be labeled "Position", "Jabatan", "Posisi" or "Trade".
    completionPct         Per-person completion % if shown; otherwise null.

    Rules:
    - Do NOT extract invoice numbers, tax amounts, or bank details.
    - NEVER use invoiceNumber for PO — PO is a 10-digit number starting with 420x.
    - Extract every manpower row in table order; do not skip duplicate roles.
    - Preserve exact dates and percentages as printed.
    - Return null when a field is not found. Never guess.
    - Set documentType to "Berita Acara" or "Work Progress Certificate".

    Output: valid JSON with "header", "lineItems", "documentType", "invoicePages".
    ${BERITA_ACARA_SCHEMA}`,
    user: "Extract Berita Acara (work progress certificate) data from this document.",
  },
  manhour_summary: {
    system: `You are a Summary Calculation Manhour OCR Extraction Engine.

    Documents may be titled "Summary Calculation Manhour", "Rekap Manhour",
    "Manhour Summary", or similar. Common for contractor manpower billing (e.g. PT. Amanah Lestari Energy).

    HEADER — extract when present on the sheet:
    poNumber               PO / Contract Order number (10 digits, often starting with 420x).
                           Labels: "PO No", "Nomor PO", "Contract Order No".
    periodStart / periodEnd  Work period covered by the summary.
    vendorName             Contractor / vendor name.
    projectName            Project / site / location name.
    totalRegularManhour    Grand total of ALL regular man-hours on the document (footer/summary row).
    totalOvertimeManhour   Grand total of ALL overtime man-hours on the document (footer/summary row).

    LINE ITEMS — one row per manpower person in the calculation table:
    manpowerName           Worker's full name (column may be "Name", "Nama", "Manpower", "Namer").
    role                   Job role / trade (e.g. "Welder", "Fitter", "Pipe Fitter", "Supervisor").
    regularManhour         Regular / actual man-hours (NOT overtime).
                           Labels: "Actual Mhr", "Regular MH", column (B).
    overtimeMondaySaturdayManhour
                           Overtime on Monday–Saturday only, column (C).
                           Labels: "Overtime Monday - Saturday", "OT Mon-Sat".
    overtimeSundayHolidayManhour
                           Overtime on Sunday & public holidays, column (D).
                           Labels: "Overtime Sunday & Public Holiday", "OT Sun/PH".
    overtimeManhour        REQUIRED — total overtime for that person = column (C) + column (D).
                           Never return only the weekday OT column; always add Sunday/holiday OT.
    totalActualManhour     Optional cross-check: total man-hours column (G) where G = B + C + D.

    FOOTER / TOTAL row (header fields when present):
    totalRegularManhour    Sum of column (B) across all workers.
    totalOvertimeManhour   Sum of ALL overtime = sum of (C) + sum of (D) across all workers.
                           Do NOT use only the weekday OT footer total.

    Rules:
    - Extract EVERY manpower row in exact table order; never skip or merge rows.
    - Copy names and roles character-for-character.
    - Man-hour values may use comma decimals (e.g. "178,00") — transcribe exactly per field.
    - When columns (C) and (D) exist, populate both AND set overtimeManhour to their numeric sum.
    - Do NOT extract invoice numbers, tax amounts, or bank details.
    - Return null when a field is absent. Never guess.
    - Set documentType to "Summary Calculation Manhour" or "Manhour Summary".

    Output: valid JSON with "header", "lineItems", "documentType", "invoicePages".
    ${MANHOUR_SUMMARY_SCHEMA}`,
    user: "Extract Summary Calculation Manhour data: regular manhour, weekday + Sunday/holiday overtime (sum both OT columns), roles, and manpower names.",
  },
  timesheet: {
    system: `You are a Daily Timesheet OCR Extraction Engine.

    ALE / AMANAH TIMESHEET FORM (landscape, one worker per page):
    Top-left metadata block (below title):
      No. ID : <id>           → username (8-digit employee ID)
      Name : <full name>      → manpowerName — exact text after "Name :"
      Position : <title>      → role (Welder, Fitter, Pipe Fitter, etc.)
    Daily table below with columns: Date, In, Out, Work Hours, Basic Time, OT Actual, ...
    Signature footer at bottom — IGNORE those names entirely.

    Contractor timesheet PDFs often contain MULTIPLE separate timesheet forms —
    one per manpower (worker). Each form may be on its own page OR stacked vertically
    with a header block (name, role, ID) followed by that person's daily hours table.

    CRITICAL: Return a "timesheets" array with ONE object per individual manpower.
    Never mix daily rows from different workers into the same timesheet object.

    DOCUMENT HEADER (shared across the file when shown once):
    poNumber, periodStart, periodEnd, vendorName, projectName.

    TIMESHEETS ARRAY — one element per manpower / per separate timesheet form:
    manpowerName           Value on the "Name :" row in the TOP-LEFT metadata block only.
                           Read letter-by-letter — e.g. "Purwanto", "Lukman Umpel".
                           NEVER use Prepared By / Proposed by / Approved By footer names.
    username               Value on the "No. ID :" row (employee badge number).
    role                   Value on the "Position :" row for THAT worker only.
    periodStart / periodEnd  Period on that form if shown per-person; else use document header.
    totalRegularManhour    Footer "Attendance" row under Basic Time column.
    totalOvertimeManhour   Footer "Attendance" row under OT Actual column.
    sheetPages             PDF page number(s) where this worker's timesheet appears.

    ENTRIES (inside each timesheet) — one row per calendar date row for THAT worker only:
    date                   From "Date" column (e.g. "7-Mar-26").
    basicTime              "Basic Time" column ONLY (comma decimals e.g. "9,00" allowed).
    otActual               "OT Actual" column ONLY — use "0" or null when cell shows "-".
    regularManhour         Same value as basicTime.
    overtimeManhour        Same value as otActual.

    FOOTER / Attendance summary row on each timesheet (sheet-level totals):
    totalRegularManhour    Footer total under "Basic Time" (e.g. 178,00).
    totalOvertimeManhour   Footer total under "OT Actual" (e.g. 21,00).

    Layout rules:
    - One page = one worker on Amanah timesheets — do not merge pages.
    - Each timesheet object's entries must belong to ONLY that object's manpowerName.
    - Extract EVERY date row (31 days); preserve table order including Day Off / Public Holiday.
    - Times use comma decimals (7,30 / 9,00) — preserve in extraction.
    - Do NOT calculate overtime from Work Hours minus Basic Time.
    - Leave "lineItems" as an empty array []; use "timesheets" only.
    - Return null when a field is absent. Never guess.
    - Set documentType to "Daily Time Sheet" or "Timesheet".

    Output: valid JSON with "header", "timesheets", "lineItems": [], "documentType", "invoicePages".
    ${TIMESHEET_SCHEMA}`,
    user: "Extract this worker's timesheet: Name/No. ID/Position from top-left block; every date row with Basic Time and OT Actual.",
  },
  attendance: {
    system: buildDocPrompt("attendance", {
      engine: "a Daily Attendance (Biometrics) OCR Extraction Engine",
      docName: "attendance record",
      properName: "Attendance",
      synonyms: 'a "Daily Attendance" or biometric attendance log',
      lineItemNote: "Each row is a dated check-in/check-out event per person.",
    }),
    user: "Extract daily attendance (biometrics) data from this document.",
  },
  po: {
    system: `You are a Purchase Order (PO) OCR Extraction Engine.

    Extract SAP-style or standard Purchase Order documents.
    Common labels in English and Bahasa Indonesia.

    HEADER — PO header information:
    poNumber               PO number (10 digits, often starting with 420x).
                           Labels: "PO No", "Purchase Order", "Nomor PO".
    poDate                 PO issue date.
    vendorName / vendorCode  Supplier name and SAP vendor code.
    buyerName              Company placing the order (e.g. Amanah Lestari Energy).
    projectName            Project / location / plant.
    requisitionNo          PR / requisition reference if shown.
    deliveryDate           Overall delivery date if in header block.
    serviceStartDate / serviceEndDate  Service period if shown.
    currency, subtotal, taxAmount, totalAmount, paymentTerms, incoterms.

    LINE ITEMS — one row per PO line / service line:
    description            Service / material description text.
    deliveryDate           Per-line delivery date if shown in the line table
                           (Labels: "Delivery Date", "Tanggal Pengiriman").
                           Use header deliveryDate only if no per-line date exists.
    quantity, unitPrice, amount  Copy exactly when present; null when absent.

    Rules:
    - Extract EVERY PO line in exact table order.
    - Never calculate missing amounts — copy printed values only.
    - PO number is NOT an invoice number.
    - Return null when a field is absent. Never guess.
    - Set documentType to "Purchase Order" or "PO".

    Output: valid JSON with "header", "lineItems", "documentType", "invoicePages".
    ${PO_SCHEMA}`,
    user: "Extract Purchase Order header information, line descriptions, and delivery dates.",
  },
  po_appendix: {
    system: `You are a PO Appendix OCR Extraction Engine.

    A PO Appendix is the price breakdown / rate schedule attached to a Purchase Order.
    It lists manpower roles with unit rates and quantities — NOT the main PO header page alone.

    HEADER — PO header information repeated on the appendix:
    poNumber, poDate, vendorName, vendorCode, buyerName, projectName, currency.

    LINE ITEMS — one row per rate / role line in the appendix table:
    description            Service line or appendix row description if shown.
    manpowerRole           Manpower role / trade from the role column
                           (e.g. "Welder", "Fitter", "Pipe Fitter").
                           Labels: "Role", "Manpower Role", "Jabatan", "Position".
    role                   Same value as manpowerRole when only one role column exists.
    unitPrice              Unit rate / price per manhour or per unit.
                           Labels: "Unit Price", "Rate", "Harga Satuan".
    quantity               Quantity / manhours / qty for that role.
                           Labels: "Qty", "Quantity", "Volume", "Manhour".
    amount                 Line total if shown; null otherwise.

    Rules:
    - This is a PO APPENDIX (rate breakdown), not a commercial invoice.
    - Extract EVERY appendix row in exact table order.
    - Copy rates and quantities digit-for-digit.
    - Return null when a field is absent. Never guess.
    - Set documentType to "PO Appendix".

    Output: valid JSON with "header", "lineItems", "documentType", "invoicePages".
    ${PO_APPENDIX_SCHEMA}`,
    user: "Extract PO appendix header information, unit price, quantity, and manpower roles.",
  },
  ses: {
    system: `You are a SAP Service Entry Sheet (SES) OCR Extraction Engine.

    Extract SAP SES printouts used to confirm accepted service quantities against a PO.

    HEADER — SES header information:
    sesNo                  Service Entry Sheet number.
                           Labels: "SES No", "Sheet No", "Entry Sheet".
    poNumber               Linked Purchase Order number.
    prNo                   Purchase Requisition number if shown.
    transactionDate        SES posting / transaction date.
    vendorName             Service provider / vendor name.
    site                   Site / plant code if shown separately from project.
    projectName            REQUIRED — copy the "SES Description" header text exactly.
                           On SAP SES printouts this field is the project name.
    serviceStartDate / serviceEndDate  Service period covered.
    sesDescription         Same text as projectName when only one description field exists.
    poValue                Total PO value referenced (IDR — transcribe exactly).
    totalSesValue          Total accepted SES value in IDR (footer/header total).
    totalSesValueUsd       Total SES value in USD — transcribe EXACTLY, including "0.00"
                           when the document shows zero. Labels: "Total SES Value (USD)",
                           "SES Value USD", "Value (USD)". Never omit when printed as 0.00.
    remainingPoBalance     Remaining PO balance after this SES.
    currency               e.g. IDR.

    LINE ITEMS — one row per accepted service line:
    description            Service line description.
    quantity               PO Qty — transcribe from the "PO Qty" column exactly.
                           Do NOT use "Accepted Qty", "Qty", or "Vol." when PO Qty is shown.
    lineValue              Line value in IDR — transcribe from the "Line Value" / "Value"
                           column exactly. Do NOT use unit price or compute qty × rate.
    amount                 Leave null — use lineValue instead.

    Rules:
    - Extract EVERY SES line in exact table order.
    - Quantity must come from PO Qty, not Accepted Qty.
    - Line value must come from the printed line value column, not unit price.
    - Zero amounts (0.00) are valid — extract them; do not return null for printed zeros.
    - Return null only when a field is truly absent from the document. Never guess.
    - Set documentType to "Service Entry Sheet" or "SES".

    Output: valid JSON with "header", "lineItems", "documentType", "invoicePages".
    ${SES_SCHEMA}`,
    user: "Extract Service Entry Sheet header information and line quantities.",
  },
};

const CLASSIFY_SYSTEM = `You are a document page classifier.
You will receive page images from a (possibly multi-page) document. Each image is
preceded by its page number. A single file may contain several different document
types mixed together — classify each page independently from that page's title.

Classify EACH page into exactly ONE of these document type CODES:
- invoice          A. Invoice — commercial/billing invoice (VAT on this form is still invoice)
- tax_invoice      B. Tax Invoice (VAT) — Indonesian Faktur Pajak / e-Faktur / Coretax only
- notice           C. Notice — surat pemberitahuan / reminder / kwitansi
- berita_acara     D. Work Progress Certificate — page titled Berita Acara / BAP only
- manhour_summary  E. Summary Calculation Manhour — manhour recap / summary sheet
- timesheet        F. Daily Time Sheet
- attendance       G. Daily Attendance (Biometrics) log
- po               H. Purchase Order (PO)
- po_appendix      I. PO Appendix — price breakdown attached to a Purchase Order
- ses              K. Service Entry Sheet (SES)
- other            anything that does not fit any of the above

Rules:
- Classify every page from its own heading; do not copy the previous page's type.
- A manpower bundle is mixed. Never label every page as invoice, tax_invoice, or berita_acara.
- tax_invoice requires Faktur Pajak / e-Faktur / Coretax — not a commercial invoice with PPN.
- berita_acara requires a Berita Acara / Work Progress Certificate title (or Prepared/Reviewed/Acknowledged/Approved grid). PO + manhours on an invoice is not BA.
- Use the exact page numbers shown in the labels.
- Return "documentType" as one of the CODES above (e.g. "invoice", "tax_invoice").
- Do not extract field values, only classify.

Return ONLY valid JSON:
{ "pages": [ { "page": 1, "documentType": "invoice" } ] }`;

const TARGET_TYPES: Record<DocumentType, string[]> = {
  invoice: [
    "invoice",
    "commercial invoice",
    "billing",
    "receipt",
    "kwitansi",
    "credit note",
    "debit note",
  ],
  tax_invoice: ["tax invoice", "faktur pajak", "faktur"],
  notice: [
    "notice",
    "surat pemberitahuan",
    "pemberitahuan",
    "tax notice",
    "vat notice",
  ],
  berita_acara: [
    "berita acara",
    "work progress certificate",
    "progress certificate",
    "bap",
  ],
  manhour_summary: ["manhour", "man hour", "man-hour", "summary calculation"],
  timesheet: ["timesheet", "time sheet", "daily time", "Daily Time Sheet", "unit rate calculation", "rate per manhour", "manhour rate", "man-hour rate"],
  attendance: ["attendance", "biometric", "Daily Attendance (Biometrics) log"],
  po: ["purchase order"],
  po_appendix: [
    "po appendix",
    "appendix",
    "price breakdown",
    "rate schedule",
    "rate breakdown",
  ],
  ses: ["service entry sheet", "ses"],
};

// Header fields that identify the overall submission (the vendor, the buyer, the
// PO, the bank, the project and the claim period). When a file is split into
// several classified documents, a value printed on one section (e.g. the vendor
// or bank block on the Invoice) is valid for the other sections of the SAME file
// too. These are back-filled across tabs so a value found anywhere in the file is
// not lost just because the page that carried it was classified as another type.
const SHARED_HEADER_FIELDS = [
  "vendorName",
  "vendorAddress",
  "vendorTaxId",
  "buyerName",
  "poNumber",
  "currency",
  "bankName",
  "bankBranch",
  "bankAccount",
  "accountHolder",
  "projectName",
  "site",
  "serviceName",
  "periodStart",
  "periodEnd",
] as const;

class ApInvoiceOcrService {
  private getClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new APIError(
        "OPENAI_API_KEY is not configured on the server",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
    return new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 180000,
      maxRetries: 1,
    });
  }

  private getModel(preferVision: boolean) {
    return (
      process.env.OPENAI_MODEL ||
      (preferVision ? "gpt-4o" : "gpt-4o-mini")
    );
  }

  private parseDocumentType(value?: string): DocumentType {
    if (value && Object.prototype.hasOwnProperty.call(HEADER_KEYS, value)) {
      return value as DocumentType;
    }
    return "invoice";
  }

  /**
   * Maps a raw classifier label (a type code such as "tax_invoice", a proper
   * name like "Tax Invoice", or a free-form description) to one of our
   * supported DocumentType values. Returns null when the page does not match a
   * supported type (e.g. "other").
   */
  private resolveDocumentType(label?: string): DocumentType | null {
    if (!label) return null;
    const normalized = label.trim().toLowerCase();
    const code = normalized.replace(/[\s.\-/]+/g, "_");
    if (Object.prototype.hasOwnProperty.call(HEADER_KEYS, code)) {
      return code as DocumentType;
    }
    // Fall back to fuzzy matching against the known synonyms per type. More
    // specific types are checked before the generic Purchase Order so that a
    // "PO Appendix" page is not mislabelled as a plain "po".
    const order: DocumentType[] = [
      "tax_invoice",
      "notice",
      "berita_acara",
      "manhour_summary",
      "timesheet",
      "attendance",
      "po_appendix",
      "ses",
      "po",
      "invoice",
    ];
    for (const type of order) {
      if (TARGET_TYPES[type].some((target) => normalized.includes(target))) {
        return type;
      }
    }
    return null;
  }

  /**
   * Groups classified pages by their resolved document type, preserving the
   * order in which each type first appears. Pages that do not map to a
   * supported type (e.g. "other") are dropped.
   */
  private groupPagesByType(
    classification: Array<{ page: number; documentType: string }>,
  ): Map<DocumentType, number[]> {
    const groups = new Map<DocumentType, number[]>();
    for (const entry of classification) {
      const type = this.resolveDocumentType(entry.documentType);
      if (!type) continue;
      const pages = groups.get(type) ?? [];
      pages.push(entry.page);
      groups.set(type, pages);
    }
    return groups;
  }

  private isBlank(value: unknown): boolean {
    return value === null || value === undefined || String(value).trim() === "";
  }

  /**
   * Back-fills shared identity/commercial header fields across the classified
   * documents extracted from the SAME file. A value found on one section (e.g.
   * the vendor or bank details on the Invoice) fills the same null field on the
   * other sections, so cross-page values are not lost after the split. Only keys
   * that already belong to a section's schema and are currently blank are filled;
   * existing values are never overwritten.
   */
  private enrichSharedHeaderFields(documents: InvoiceExtractionResult[]): void {
    if (documents.length < 2) return;

    const shared: Record<string, string> = {};
    for (const field of SHARED_HEADER_FIELDS) {
      for (const doc of documents) {
        const value = doc.header?.[field];
        if (!this.isBlank(value)) {
          shared[field] = String(value);
          break;
        }
      }
    }

    const apply = (header: Record<string, string | null> | undefined) => {
      if (!header) return;
      for (const field of SHARED_HEADER_FIELDS) {
        if (
          field in header &&
          this.isBlank(header[field]) &&
          shared[field] !== undefined
        ) {
          header[field] = shared[field];
        }
      }
    };

    for (const doc of documents) {
      apply(doc.header);
      for (const sub of doc.invoices ?? []) apply(sub.header);
    }
  }

  private parseJsonResponse(content: string) {
    const trimmed = content.trim();
    const jsonText = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      logger.error("Failed to parse OpenAI JSON response", { content });
      throw new APIError(
        "Unable to parse document extraction response",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getMaxVisionPages() {
    const parsed = Number(process.env.OCR_MAX_PAGES);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
  }

  private getRenderScale() {
    const parsed = Number(process.env.OCR_RENDER_SCALE);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
  }

  private getExtractScale() {
    const parsed = Number(process.env.OCR_EXTRACT_SCALE);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }

  private getExtractScaleForType(documentType: DocumentType) {
    if (documentType === "berita_acara") {
      const parsed = Number(process.env.OCR_BERITA_ACARA_EXTRACT_SCALE);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 3.5;
    }
    if (documentType === "invoice") {
      const parsed = Number(process.env.OCR_INVOICE_EXTRACT_SCALE);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 3.5;
    }
    return this.getExtractScale();
  }

  private getModelCompletionOptions(documentType: DocumentType) {
    if (documentType === "berita_acara") {
      const parsed = Number(process.env.OCR_BERITA_MAX_TOKENS);
      return {
        max_completion_tokens:
          Number.isFinite(parsed) && parsed > 0 ? parsed : 8192,
      };
    }
    return {};
  }

  private isSpreadsheetFile(file: Express.Multer.File) {
    const ext = path.extname(file.originalname).toLowerCase();
    return (
      ext === ".csv" ||
      ext === ".xls" ||
      ext === ".xlsx" ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  private spreadsheetToText(file: Express.Multer.File) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".csv" || file.mimetype === "text/csv" || file.mimetype === "application/csv") {
      return file.buffer.toString("utf8");
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return `--- Sheet: ${name} ---\n${csv}`;
    }).join("\n\n");
  }

  private async renderPdfPagesToImages(
    buffer: Buffer,
    opts?: { scale?: number; partial?: number[] },
  ): Promise<Array<{ pageNumber: number; dataUrl: string }>> {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const screenshot = await parser.getScreenshot({
        scale: opts?.scale ?? this.getRenderScale(),
        ...(opts?.partial && opts.partial.length
          ? { partial: opts.partial }
          : {}),
        imageDataUrl: true,
        imageBuffer: false,
      });
      return (screenshot.pages || [])
        .filter((page) => Boolean(page?.dataUrl))
        .map((page) => ({
          pageNumber: page.pageNumber,
          dataUrl: page.dataUrl,
        }));
    } finally {
      await parser.destroy();
    }
  }

  private buildPageImageContent(
    pages: Array<{ pageNumber: number; dataUrl: string }>,
    detail: "low" | "high",
  ) {
    return pages.flatMap((page) => [
      { type: "text" as const, text: `--- Page ${page.pageNumber} ---` },
      {
        type: "image_url" as const,
        image_url: { url: page.dataUrl, detail },
      },
    ]);
  }

  private normalizeTimesheetPersonName(value: unknown): string | null {
    const raw = this.strOrNull(value);
    if (!raw) return null;
    return raw.replace(/\s+/g, " ").trim();
  }

  private isBlocklistedTimesheetName(value: unknown): boolean {
    const name = this.normalizeTimesheetPersonName(value)?.toLowerCase();
    return !!name && TIMESHEET_APPROVER_NAME_BLOCKLIST.has(name);
  }

  /** Crop top portion of page where Amanah timesheets print No. ID / Name / Position. */
  private async cropPageHeaderDataUrl(
    dataUrl: string,
    topRatio = 0.34,
  ): Promise<string> {
    const img = await loadImage(dataUrl);
    const cropH = Math.max(1, Math.round(img.height * topRatio));
    const canvas = createCanvas(img.width, cropH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, cropH, 0, 0, img.width, cropH);
    return canvas.toDataURL("image/png");
  }

  /**
   * Second vision pass focused only on the Berita Acara work-progress summary block.
   * Runs after the main extraction so the model can spend more time on small print /
   * Previous | This Period | Cumulative columns without rushing the full document.
   */
  private async extractBeritaAcaraProgressFromPages(
    client: OpenAI,
    pages: Array<{ pageNumber: number; dataUrl: string }>,
  ): Promise<Record<string, unknown> | null> {
    if (!pages.length) return null;

    logger.info(
      `[OCR] Berita Acara progress pass on ${pages.length} page(s)...`,
    );
    const aiStart = Date.now();
    const completion = await client.chat.completions.create({
      model: this.getModel(true),
      temperature: 0,
      ...this.getModelCompletionOptions("berita_acara"),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BERITA_ACARA_PROGRESS_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Locate the work progress summary block (Previous Period / This Period / Cumulative). " +
                "Read every cell carefully before responding. Return the This Period man-hours and completion %.",
            },
            ...this.buildPageImageContent(pages, "high"),
          ],
        },
      ],
    });
    logger.info(
      `[OCR] Berita Acara progress pass completed in ${Date.now() - aiStart}ms`,
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    try {
      return this.parseJsonResponse(content) as Record<string, unknown>;
    } catch (error) {
      logger.warn(
        `[OCR] Berita Acara progress pass parse failed: ${(error as Error)?.message}`,
      );
      return null;
    }
  }

  private mergeBeritaAcaraProgress(
    parsed: Record<string, unknown>,
    progress: Record<string, unknown> | null,
  ): void {
    if (!progress) return;

    const header =
      parsed.header && typeof parsed.header === "object"
        ? (parsed.header as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const progressSource =
      progress.header && typeof progress.header === "object"
        ? (progress.header as Record<string, unknown>)
        : progress;

    const mergeKeys = [
      "thisManhours",
      "thisPeriodManhours",
      "manhourCompletionPct",
      "manhourPercentageCompletion",
      "previousManhours",
      "cumulativeManhours",
      "previousPeriodPct",
      "cumulativePct",
    ] as const;

    for (const key of mergeKeys) {
      const incoming = this.strOrNull(progressSource[key]);
      if (!incoming) continue;
      const existing = this.strOrNull(header[key]);
      if (!existing) {
        header[key] = incoming;
      }
    }

    if (!this.strOrNull(header.thisManhours)) {
      const mh = this.strOrNull(
        progressSource.thisManhours ?? progressSource.thisPeriodManhours,
      );
      if (mh) header.thisManhours = mh;
    }

    if (!this.strOrNull(header.manhourCompletionPct)) {
      const pct = this.strOrNull(
        progressSource.manhourCompletionPct ??
          progressSource.manhourPercentageCompletion,
      );
      if (pct) header.manhourCompletionPct = pct;
    }

    parsed.header = header;

    const existingTables = Array.isArray(parsed.tables) ? parsed.tables : [];
    const progressTables = Array.isArray(progress.tables) ? progress.tables : [];
    if (progressTables.length) {
      parsed.tables = [...existingTables, ...progressTables];
    }
  }

  private async enrichBeritaAcaraWithProgressPass(
    client: OpenAI,
    parsed: Record<string, unknown>,
    pages: Array<{ pageNumber: number; dataUrl: string }>,
  ): Promise<void> {
    try {
      const progress = await this.extractBeritaAcaraProgressFromPages(
        client,
        pages,
      );
      this.mergeBeritaAcaraProgress(parsed, progress);
    } catch (error) {
      logger.warn(
        `[OCR] Berita Acara progress enrichment skipped: ${(error as Error)?.message}`,
      );
    }
  }

  private async extractTimesheetIdentityFromHeader(
    client: OpenAI,
    headerDataUrl: string,
    pageNumber: number,
  ): Promise<{
    username: string | null;
    manpowerName: string | null;
    role: string | null;
  }> {
    const completion = await client.chat.completions.create({
      model: this.getModel(true),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TIMESHEET_IDENTITY_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Read the employee metadata block on page ${pageNumber}. Return username (No. ID), manpowerName (Name), and role (Position).`,
            },
            {
              type: "image_url",
              image_url: { url: headerDataUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { username: null, manpowerName: null, role: null };
    }

    const parsed = this.parseJsonResponse(content);
    const manpowerName = this.normalizeTimesheetPersonName(
      parsed?.manpowerName ?? parsed?.name ?? parsed?.employeeName,
    );
    const username = this.strOrNull(
      parsed?.username ?? parsed?.employeeId ?? parsed?.noId ?? parsed?.badge,
    );
    const role = this.strOrNull(parsed?.role ?? parsed?.position);

    return {
      username,
      manpowerName: this.isBlocklistedTimesheetName(manpowerName)
        ? null
        : manpowerName,
      role,
    };
  }

  private applyTimesheetIdentity(
    sheet: TimesheetManpowerSheet,
    identity: {
      username: string | null;
      manpowerName: string | null;
      role: string | null;
    },
  ): TimesheetManpowerSheet {
    const sheetName = this.normalizeTimesheetPersonName(sheet.manpowerName);
    const identityName = identity.manpowerName;
    const sheetNameBlocked = this.isBlocklistedTimesheetName(sheetName);

    let manpowerName = sheetName;
    if (identityName) {
      manpowerName = identityName;
    } else if (sheetNameBlocked) {
      manpowerName = null;
    }

    return {
      ...sheet,
      manpowerName,
      username: identity.username ?? sheet.username,
      role: identity.role ?? sheet.role,
    };
  }

  /** One vision call per page — avoids mixing workers when a PDF has many timesheets. */
  private async extractTimesheetFromPages(
    client: OpenAI,
    pages: Array<{ pageNumber: number; dataUrl: string }>,
  ) {
    const prompts = PROMPTS.timesheet;
    const mergedSheets: TimesheetManpowerSheet[] = [];
    let mergedHeader: Record<string, unknown> = {};
    const invoicePages: number[] = [];

    for (const page of pages) {
      logger.info(`[OCR] Extracting timesheet page ${page.pageNumber}...`);
      const headerCrop = await this.cropPageHeaderDataUrl(page.dataUrl);
      const identity = await this.extractTimesheetIdentityFromHeader(
        client,
        headerCrop,
        page.pageNumber,
      );
      logger.info(
        `[OCR] Page ${page.pageNumber} identity: ${JSON.stringify(identity)}`,
      );

      const aiStart = Date.now();
      const completion = await client.chat.completions.create({
        model: this.getModel(true),
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompts.system },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${prompts.user}\n\nThis image is page ${page.pageNumber} only. Extract worker name(s) and daily rows visible on THIS page. If multiple stacked forms appear on this page, return one timesheets object per worker on this page. Do not include workers from other pages.`,
              },
              ...this.buildPageImageContent([page], "high"),
            ],
          },
        ],
      });
      logger.info(
        `[OCR] Timesheet page ${page.pageNumber} responded in ${Date.now() - aiStart}ms`,
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = this.parseJsonResponse(content);
      invoicePages.push(page.pageNumber);

      if (parsed?.header && Object.keys(mergedHeader).length === 0) {
        mergedHeader = parsed.header;
      }

      const reconciled = this.reconcileTimesheetRaw(parsed);
      for (const sheet of reconciled.timesheets) {
        mergedSheets.push({
          ...this.applyTimesheetIdentity(sheet, identity),
          sheetPages: [page.pageNumber],
        });
      }

      if (!reconciled.timesheets.length && identity.manpowerName) {
        mergedSheets.push({
          manpowerName: identity.manpowerName,
          username: identity.username,
          role: identity.role,
          periodStart: null,
          periodEnd: null,
          totalRegularManhour: null,
          totalOvertimeManhour: null,
          sheetPages: [page.pageNumber],
          entries: [],
        });
      }
    }

    return {
      documentType: "Daily Time Sheet",
      header: mergedHeader,
      timesheets: mergedSheets,
      lineItems: [] as ExtractedLineItem[],
      invoicePages,
    };
  }

  private async classifyPages(
    client: OpenAI,
    pages: Array<{ pageNumber: number; dataUrl: string }>,
  ): Promise<Array<{ page: number; documentType: string }>> {
    const completion = await client.chat.completions.create({
      model: this.getModel(true),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Classify each of the following pages. Use the page number labels.",
            },
            ...this.buildPageImageContent(pages, "low"),
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];
    const parsed = this.parseJsonResponse(content);
    const list = Array.isArray(parsed?.pages) ? parsed.pages : [];
    return list
      .map((entry: any) => ({
        page: Number(entry?.page),
        documentType: String(entry?.documentType ?? ""),
      }))
      .filter((entry: { page: number }) => Number.isFinite(entry.page));
  }

  private selectTargetPages(
    classification: Array<{ page: number; documentType: string }>,
    documentType: DocumentType,
  ): number[] {
    const targets = TARGET_TYPES[documentType];
    return classification
      .filter((entry) =>
        targets.some((target) =>
          entry.documentType.toLowerCase().includes(target),
        ),
      )
      .map((entry) => entry.page);
  }

  private isTaxInvoiceSerial(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    const digits = String(value).replace(/\s/g, "");
    return /^\d{15,17}$/.test(digits);
  }

  private reconcilePoNumber(rawHeader: Record<string, unknown>) {
    const next = { ...rawHeader };
    const poDigits = String(next.poNumber ?? next.invoiceNumber ?? "")
      .replace(/\D/g, "");
    if (/^420\d{7}$/.test(poDigits)) {
      next.poNumber = poDigits;
    }
    if (next.invoiceNumber != null) {
      delete next.invoiceNumber;
    }
    return next;
  }

  private parseBeritaAcaraMetric(value: unknown): string | null {
    const raw = String(value ?? "")
      .replace(/\s*hours?\s*$/i, "")
      .replace(/%/g, "")
      .trim();
    if (!raw) return null;

    const commaMatch = raw.match(/^(\d+),(\d{1,3})$/);
    if (commaMatch) return `${commaMatch[1]}.${commaMatch[2]}`;

    return this.strOrNull(value);
  }

  private extractBeritaAcaraProgressFromCorpus(
    corpus: string,
    header: Record<string, unknown> = {},
  ): { manhourCompletionPct: string | null; thisManhours: string | null } {
    const result = {
      manhourCompletionPct: null as string | null,
      thisManhours: null as string | null,
    };

    const directPct =
      header.manhourCompletionPct ?? header.manhourPercentageCompletion;
    if (directPct != null && directPct !== "") {
      result.manhourCompletionPct = this.parseBeritaAcaraMetric(directPct);
    }

    const directMh = header.thisManhours ?? header.thisPeriodManhours;
    if (directMh != null && directMh !== "") {
      result.thisManhours = this.parseBeritaAcaraMetric(directMh);
    }

    const text = String(corpus || "");
    const progressStart = text.search(
      /progress\s+as\s+follow|performed\s+the\s+work\s+with\s+the\s+progress|kemajuan\s+pekerjaan/i,
    );
    const slice =
      progressStart >= 0 ? text.slice(progressStart, progressStart + 1400) : text;

    if (!result.manhourCompletionPct) {
      const pctMatch = slice.match(/this\s*period\s*[:\s]*([0-9][0-9.,]+)\s*%/i);
      if (pctMatch?.[1]) {
        result.manhourCompletionPct = this.parseBeritaAcaraMetric(pctMatch[1]);
      }
    }

    if (!result.thisManhours) {
      const mhMatch = slice.match(/this\s*man\s*hours?\s*[:\s]*([0-9][0-9.,]+)/i);
      if (mhMatch?.[1]) {
        result.thisManhours = this.parseBeritaAcaraMetric(mhMatch[1]);
      }
    }

    return result;
  }

  private extractBeritaAcaraThisManhours(
    header: Record<string, unknown>,
    tables: unknown[] = [],
    corpus = "",
  ): string | null {
    const fromCorpus = this.extractBeritaAcaraProgressFromCorpus(corpus, header);
    if (fromCorpus.thisManhours) return fromCorpus.thisManhours;

    const existing = this.strOrNull(header.thisManhours);
    if (existing) return existing;

    for (const table of tables) {
      if (!table || typeof table !== "object") continue;
      const entry = table as { headers?: unknown[]; rows?: unknown[][] };
      const headers = (entry.headers || []).map((cell) => String(cell ?? "").toLowerCase());
      const thisPeriodIdx = headers.findIndex((label) =>
        /this\s*period|periode\s*ini|period\s*ini/i.test(label),
      );
      const valueIdx = thisPeriodIdx >= 0 ? thisPeriodIdx : 2;

      for (const row of entry.rows || []) {
        if (!Array.isArray(row) || !row.length) continue;
        const description = String(row[0] ?? "").toLowerCase();
        if (!/man\s*hours?|manhour|jam\s*kerja/i.test(description)) continue;
        const cell = row[valueIdx] ?? row[2];
        const hours = this.parseBeritaAcaraMetric(cell);
        if (hours !== null) return hours;
      }
    }

    return null;
  }

  private reconcileBeritaAcaraHeader(
    rawHeader: Record<string, unknown>,
    tables: unknown[] = [],
    corpus = "",
  ): Record<string, unknown> {
    const next = this.reconcilePoNumber(rawHeader);
    const progress = this.extractBeritaAcaraProgressFromCorpus(corpus, next);
    const extracted = this.extractBeritaAcaraThisManhours(next, tables, corpus);
    if (extracted) next.thisManhours = extracted;
    else if (progress.thisManhours) next.thisManhours = progress.thisManhours;
    if (progress.manhourCompletionPct) {
      next.manhourCompletionPct = progress.manhourCompletionPct;
    }
    return next;
  }

  private reconcileSesHeader(
    rawHeader: Record<string, unknown>,
  ): Record<string, unknown> {
    const next = this.reconcilePoNumber(rawHeader);
    const sesDescription = this.strOrNull(next.sesDescription);
    const projectName = this.strOrNull(next.projectName);
    if (sesDescription) {
      next.projectName = sesDescription;
    } else if (projectName) {
      next.sesDescription = projectName;
    }

    const usdCandidates = [
      next.totalSesValueUsd,
      next.totalSESValueUSD,
      next.sesValueUsd,
      next.totalValueUsd,
      next.totalSesValueInUsd,
    ];
    for (const candidate of usdCandidates) {
      if (candidate === 0 || candidate === "0" || candidate === "0.00") {
        next.totalSesValueUsd = "0.00";
        break;
      }
      const value = this.strOrNull(candidate);
      if (value !== null) {
        next.totalSesValueUsd = value;
        break;
      }
    }

    return next;
  }

  private reconcileTaxInvoiceHeader(
    rawHeader: Record<string, unknown>,
  ): Record<string, unknown> {
    const next = { ...rawHeader };
    const mistakenInvoiceNo = next.invoiceNumber;
    if (
      this.isTaxInvoiceSerial(mistakenInvoiceNo) &&
      (next.taxInvoiceNumber == null || next.taxInvoiceNumber === "")
    ) {
      next.taxInvoiceNumber = mistakenInvoiceNo;
    }
    delete next.invoiceNumber;
    return next;
  }

  private reconcileNoticeHeader(
    rawHeader: Record<string, unknown>,
  ): Record<string, unknown> {
    const next = { ...rawHeader };
    if (
      (next.invoiceDate == null || next.invoiceDate === "") &&
      next.noticeDate != null &&
      next.noticeDate !== ""
    ) {
      next.invoiceDate = next.noticeDate;
    }
    delete next.noticeDate;
    delete next.noticeNumber;
    return this.reconcileTaxInvoiceHeader(next);
  }

  private normalizeHeader(
    rawHeader: Record<string, unknown>,
    documentType: DocumentType,
  ) {
    const poLinkedTypes: DocumentType[] = [
      "berita_acara",
      "manhour_summary",
      "timesheet",
      "po",
      "po_appendix",
      "ses",
    ];
    const source =
      documentType === "tax_invoice"
        ? this.reconcileTaxInvoiceHeader(rawHeader)
        : documentType === "notice"
          ? this.reconcileNoticeHeader(rawHeader)
          : documentType === "ses"
            ? this.reconcileSesHeader(rawHeader)
            : poLinkedTypes.includes(documentType)
              ? documentType === "berita_acara"
                ? rawHeader
                : this.reconcilePoNumber(rawHeader)
              : rawHeader;

    const header: Record<string, string | null> = {};
    for (const key of HEADER_KEYS[documentType]) {
      const value = source?.[key];
      header[key] =
        value === undefined || value === null ? null : String(value);
    }

    if (
      documentType !== "tax_invoice" &&
      documentType !== "notice" &&
      documentType !== "berita_acara"
    ) {
      for (const [key, value] of Object.entries(source || {})) {
        if (header[key] === undefined && value != null && value !== "") {
          header[key] = String(value);
        }
      }
    }

    return header;
  }

  private isNoInvoiceFound(raw: any): boolean {
    const docType = String(raw?.documentType ?? "").toLowerCase();
    return /\bno\b/.test(docType) && /\bfound\b/.test(docType);
  }

  private normalizeLineItem(
    item: any,
    documentType: DocumentType,
  ): ExtractedLineItem {
    const li: ExtractedLineItem = {
      description: "",
      quantity: "",
      unit: "",
      unitPrice: "",
      amount: "",
    };
    for (const key of LINE_ITEM_KEYS[documentType] || []) {
      const value = item?.[key];
      li[key] = value === undefined || value === null ? null : String(value);
    }
    for (const [key, value] of Object.entries(item || {})) {
      if (!(key in li) && value != null && value !== "") {
        li[key] = String(value);
      }
    }

    if (documentType === "ses") {
      const poQty = this.strOrNull(item?.poQty ?? item?.poQuantity ?? item?.po_qty);
      if (poQty) {
        li.quantity = poQty;
      }

      const lineVal = this.strOrNull(
        item?.lineValue ?? item?.line_value ?? item?.amount ?? item?.unitPrice,
      );
      li.lineValue = lineVal;
      li.amount = lineVal;
    }

    return li;
  }

  private normalizeInvoicePages(raw: any): Array<number | string> {
    if (!Array.isArray(raw?.invoicePages)) return [];
    return raw.invoicePages
      .map((page: any) => {
        const num = Number(page);
        return Number.isFinite(num) ? num : String(page);
      })
      .filter((page: number | string) => page !== "" && page !== null);
  }

  private strOrNull(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s.length ? s : null;
  }

  private parseManhourNumeric(raw: unknown): number | null {
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

  private formatManhourNumeric(value: number): string {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  private firstManhourField(item: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = this.strOrNull(item[key]);
      if (value) return value;
    }
    return null;
  }

  /** Sum weekday + Sunday/holiday OT, or derive from total actual − regular when needed. */
  private reconcileManhourSummaryOvertime(item: Record<string, unknown>): string | null {
    const weekdayRaw = this.firstManhourField(item, [
      "overtimeMondaySaturdayManhour",
      "overtimeWeekdayManhour",
      "overtimeMonSatManhour",
    ]);
    const sundayRaw = this.firstManhourField(item, [
      "overtimeSundayHolidayManhour",
      "overtimeSundayPublicHolidayManhour",
      "overtimeSunPhManhour",
    ]);
    const existingRaw = this.strOrNull(item.overtimeManhour);
    const regular = this.parseManhourNumeric(item.regularManhour);
    const totalActual = this.parseManhourNumeric(
      this.firstManhourField(item, [
        "totalActualManhour",
        "totalManhour",
        "actualTotalManhour",
      ]),
    );

    const weekday = this.parseManhourNumeric(weekdayRaw);
    const sunday = this.parseManhourNumeric(sundayRaw);
    const existing = this.parseManhourNumeric(existingRaw);

    let combined: number | null = null;
    if (weekday !== null || sunday !== null) {
      combined = (weekday ?? 0) + (sunday ?? 0);
    } else if (existing !== null) {
      combined = existing;
    }

    if (regular !== null && totalActual !== null) {
      const derived = totalActual - regular;
      if (derived >= 0 && (combined === null || derived > combined + 0.01)) {
        combined = derived;
      }
    }

    if (combined === null) return existingRaw;
    return this.formatManhourNumeric(combined);
  }

  private finalizeManhourSummaryLineItem(item: ExtractedLineItem): ExtractedLineItem {
    const overtimeManhour = this.reconcileManhourSummaryOvertime(item);
    const next: ExtractedLineItem = { ...item, overtimeManhour };
    delete next.overtimeMondaySaturdayManhour;
    delete next.overtimeSundayHolidayManhour;
    delete next.totalActualManhour;
    return next;
  }

  private reconcileManhourSummaryHeader(
    header: Record<string, string | null>,
    lineItems: ExtractedLineItem[],
  ): Record<string, string | null> {
    const next = { ...header };
    const lineOtSum = lineItems.reduce((sum, item) => {
      const n = this.parseManhourNumeric(item.overtimeManhour);
      return sum + (n ?? 0);
    }, 0);

    if (lineOtSum > 0) {
      next.totalOvertimeManhour = this.formatManhourNumeric(lineOtSum);
      return next;
    }

    const weekday = this.parseManhourNumeric(
      this.firstManhourField(next, [
        "totalOvertimeMondaySaturdayManhour",
        "totalOvertimeWeekdayManhour",
      ]),
    );
    const sunday = this.parseManhourNumeric(
      this.firstManhourField(next, [
        "totalOvertimeSundayHolidayManhour",
        "totalOvertimeSundayPublicHolidayManhour",
      ]),
    );
    const existing = this.parseManhourNumeric(next.totalOvertimeManhour);

    if (weekday !== null || sunday !== null) {
      next.totalOvertimeManhour = this.formatManhourNumeric((weekday ?? 0) + (sunday ?? 0));
    } else if (existing !== null) {
      next.totalOvertimeManhour = this.formatManhourNumeric(existing);
    }

    return next;
  }

  private formatManhourField(raw: string | null): string | null {
    if (!raw) return null;
    const n = this.parseManhourNumeric(raw);
    return n !== null ? this.formatManhourNumeric(n) : raw;
  }

  /** Timesheet daily row: Basic Time → regular, OT Actual → overtime (no Work Hours inference). */
  private reconcileTimesheetEntryHours(raw: any): {
    regularManhour: string | null;
    overtimeManhour: string | null;
  } {
    const basicTime = this.firstManhourField(raw, [
      "basicTime",
      "basic_time",
      "basicTimeHours",
    ]);
    const otActual = this.firstManhourField(raw, [
      "otActual",
      "ot_actual",
      "otActualHours",
    ]);

    const regularRaw = basicTime ?? this.strOrNull(raw?.regularManhour);
    const overtimeRaw = otActual ?? this.strOrNull(raw?.overtimeManhour);

    return {
      regularManhour: this.formatManhourField(regularRaw),
      overtimeManhour: this.formatManhourField(overtimeRaw),
    };
  }

  private finalizeTimesheetSheet(sheet: TimesheetManpowerSheet): TimesheetManpowerSheet {
    const entries = sheet.entries.map((entry) => {
      const hours = this.reconcileTimesheetEntryHours(entry);
      return { ...entry, ...hours };
    });

    const entryRegularSum = entries.reduce(
      (sum, entry) => sum + (this.parseManhourNumeric(entry.regularManhour) ?? 0),
      0,
    );
    const entryOtSum = entries.reduce(
      (sum, entry) => sum + (this.parseManhourNumeric(entry.overtimeManhour) ?? 0),
      0,
    );

    let totalRegularManhour = this.firstManhourField(sheet as unknown as Record<string, unknown>, [
      "totalBasicTime",
      "totalRegularManhour",
    ]);
    let totalOvertimeManhour = this.firstManhourField(sheet as unknown as Record<string, unknown>, [
      "totalOtActual",
      "totalOvertimeManhour",
    ]);

    if (entryRegularSum > 0) {
      totalRegularManhour = this.formatManhourNumeric(entryRegularSum);
    } else {
      totalRegularManhour = this.formatManhourField(totalRegularManhour);
    }

    if (entryOtSum > 0) {
      totalOvertimeManhour = this.formatManhourNumeric(entryOtSum);
    } else {
      totalOvertimeManhour = this.formatManhourField(totalOvertimeManhour);
    }

    return {
      ...sheet,
      entries,
      totalRegularManhour,
      totalOvertimeManhour,
    };
  }

  private normalizeTimesheetEntry(raw: any): TimesheetEntry {
    const hours = this.reconcileTimesheetEntryHours(raw);
    return {
      date: this.strOrNull(raw?.date),
      regularManhour: hours.regularManhour,
      overtimeManhour: hours.overtimeManhour,
    };
  }

  private normalizeTimesheetSheet(
    raw: any,
    docHeader: Record<string, unknown>,
  ): TimesheetManpowerSheet {
    const entries = (Array.isArray(raw?.entries) ? raw.entries : [])
      .map((entry: any) => this.normalizeTimesheetEntry(entry))
      .filter(
        (entry: TimesheetEntry) =>
          entry.date || entry.regularManhour || entry.overtimeManhour,
      );

    return {
      manpowerName: this.isBlocklistedTimesheetName(raw?.manpowerName)
        ? null
        : this.normalizeTimesheetPersonName(raw?.manpowerName),
      username: this.strOrNull(raw?.username),
      role: this.strOrNull(raw?.role),
      periodStart:
        this.strOrNull(raw?.periodStart) ??
        this.strOrNull(docHeader.periodStart),
      periodEnd:
        this.strOrNull(raw?.periodEnd) ?? this.strOrNull(docHeader.periodEnd),
      totalRegularManhour: this.strOrNull(raw?.totalRegularManhour),
      totalOvertimeManhour: this.strOrNull(raw?.totalOvertimeManhour),
      sheetPages: this.normalizeInvoicePages({ invoicePages: raw?.sheetPages }),
      entries,
    };
  }

  private groupTimesheetRowsIntoSheets(
    rows: any[],
    docHeader: Record<string, unknown>,
  ): TimesheetManpowerSheet[] {
    const groups: TimesheetManpowerSheet[] = [];
    let currentSheet: TimesheetManpowerSheet | null = null;

    for (const row of rows) {
      const entry = this.normalizeTimesheetEntry(row);
      if (!entry.date && !entry.regularManhour && !entry.overtimeManhour) {
        continue;
      }

      const name = this.strOrNull(row?.manpowerName);
      const role = this.strOrNull(row?.role);
      const username = this.strOrNull(row?.username);

      if (name) {
        const key = `${name}|${role ?? ""}|${username ?? ""}`;
        let sheet = groups.find(
          (g) =>
            `${g.manpowerName ?? ""}|${g.role ?? ""}|${g.username ?? ""}` === key,
        );
        if (!sheet) {
          sheet = {
            manpowerName: name,
            username,
            role,
            periodStart: this.strOrNull(docHeader.periodStart),
            periodEnd: this.strOrNull(docHeader.periodEnd),
            totalRegularManhour: null,
            totalOvertimeManhour: null,
            sheetPages: [],
            entries: [],
          };
          groups.push(sheet);
        }
        currentSheet = sheet;
      }

      if (!currentSheet) continue;
      currentSheet.entries.push(entry);
    }

    return groups;
  }

  private flattenTimesheetSheets(
    sheets: TimesheetManpowerSheet[],
  ): ExtractedLineItem[] {
    return sheets.flatMap((sheet) =>
      sheet.entries.map((entry) => ({
        description: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        amount: "",
        date: entry.date,
        regularManhour: entry.regularManhour,
        overtimeManhour: entry.overtimeManhour,
        manpowerName: sheet.manpowerName,
        username: sheet.username,
        role: sheet.role,
      })),
    );
  }

  private reconcileTimesheetRaw(raw: any): {
    timesheets: TimesheetManpowerSheet[];
    lineItems: ExtractedLineItem[];
  } {
    const docHeader = raw?.header || {};
    let sheets: TimesheetManpowerSheet[] = [];

    if (Array.isArray(raw?.timesheets) && raw.timesheets.length) {
      sheets = raw.timesheets
        .map((sheet: any) => this.normalizeTimesheetSheet(sheet, docHeader))
        .filter((sheet: TimesheetManpowerSheet) => sheet.entries.length > 0)
        .map((sheet: TimesheetManpowerSheet) => this.finalizeTimesheetSheet(sheet));
    }

    if (!sheets.length && Array.isArray(raw?.lineItems) && raw.lineItems.length) {
      sheets = this.groupTimesheetRowsIntoSheets(raw.lineItems, docHeader).map((sheet) =>
        this.finalizeTimesheetSheet(sheet),
      );
    }

    return {
      timesheets: sheets,
      lineItems: this.flattenTimesheetSheets(sheets),
    };
  }

  private normalizeInvoice(raw: any, documentType: DocumentType) {
    const header = raw?.header || {};
    const fields = Array.isArray(raw?.fields) ? raw.fields : [];

    let rawLineItems = Array.isArray(raw?.lineItems) ? raw.lineItems : [];
    let timesheets: TimesheetManpowerSheet[] | undefined;

    if (documentType === "timesheet") {
      const reconciled = this.reconcileTimesheetRaw(raw);
      timesheets = reconciled.timesheets;
      rawLineItems = reconciled.lineItems;
    }

    const lineItems =
      documentType === "tax_invoice" || documentType === "notice"
        ? []
        : rawLineItems;

    let normalizedLineItems = lineItems.map((item: any) =>
      this.normalizeLineItem(item, documentType),
    );
    let normalizedHeader = this.normalizeHeader(header, documentType);

    if (documentType === "manhour_summary") {
      normalizedLineItems = normalizedLineItems.map((item: ExtractedLineItem) =>
        this.finalizeManhourSummaryLineItem(item),
      );
      normalizedHeader = this.reconcileManhourSummaryHeader(
        normalizedHeader,
        normalizedLineItems,
      );
    }

    if (documentType === "berita_acara") {
      const tables = Array.isArray(raw?.tables) ? raw.tables : [];
      const corpus = buildTextCorpus(
        normalizedHeader,
        fields.map((field: ExtractedInvoiceField) => ({
          fieldName: field.fieldName,
          fieldValue: field.fieldValue,
        })),
        normalizedLineItems,
        { tables },
      );
      const reconciled = this.reconcileBeritaAcaraHeader(header, tables, corpus);
      const thisManhours = this.strOrNull(reconciled.thisManhours);
      if (thisManhours) {
        normalizedHeader.thisManhours = thisManhours;
      }
      const completionPct = this.strOrNull(reconciled.manhourCompletionPct);
      if (completionPct) {
        normalizedHeader.manhourCompletionPct = completionPct;
      }
    }

    if (documentType === "invoice") {
      const tables = Array.isArray(raw?.tables) ? raw.tables : [];
      const corpus = buildTextCorpus(
        normalizedHeader,
        fields.map((field: ExtractedInvoiceField) => ({
          fieldName: field.fieldName,
          fieldValue: field.fieldValue,
        })),
        normalizedLineItems,
        {
          tables,
          summary:
            raw?.summary != null
              ? String(raw.summary)
              : raw?.data?.summary != null
                ? String(raw.data.summary)
                : null,
        },
      );
      const reconciledLines = reconcileInvoiceLineItems(
        normalizedLineItems,
        tables,
        corpus,
      );
      if (reconciledLines.length) {
        normalizedLineItems = reconciledLines.map((item) => ({
          description: item.description,
          amount: item.amount,
          quantity: null as string | null,
          unit: null as string | null,
          unitPrice: null as string | null,
          role: null as string | null,
        }));
      }
      normalizedHeader = reconcileInvoiceHeader(
        normalizedHeader,
        corpus,
        normalizedLineItems,
      );
    }

    return {
      detectedDocumentType:
        raw?.documentType != null ? String(raw.documentType) : null,
      invoicePages: this.normalizeInvoicePages(raw),
      header: normalizedHeader,
      lineItems: normalizedLineItems,
      fields:
        documentType === "tax_invoice" ||
          documentType === "notice" ||
          documentType === "berita_acara"
          ? []
          : fields.map((field: any) => ({
            fieldName: String(field?.fieldName ?? ""),
            fieldValue: String(field?.fieldValue ?? ""),
            confidence: Number(field?.confidence ?? 0),
          })),
      ...(timesheets?.length ? { timesheets } : {}),
    };
  }

  private normalizeResult(
    raw: any,
    file: Express.Multer.File,
    documentType: DocumentType,
  ): InvoiceExtractionResult {
    const base = {
      documentType,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType],
      fileName: file.originalname,
      fileType: file.mimetype,
    };

    const invoiceList: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.invoices)
        ? raw.invoices
        : [raw];

    const meaningfulInvoices = invoiceList.filter(
      (item) => item && !this.isNoInvoiceFound(item),
    );

    if (this.isNoInvoiceFound(raw) || meaningfulInvoices.length === 0) {
      return {
        ...base,
        status: "no_invoice_found",
        detectedDocumentType:
          raw?.documentType != null ? String(raw.documentType) : null,
        invoicePages: [],
        header: this.normalizeHeader({}, documentType),
        lineItems: [],
        fields: [],
      };
    }

    const normalized = meaningfulInvoices.map((item) =>
      this.normalizeInvoice(item, documentType),
    );
    const [primary] = normalized;

    return {
      ...base,
      status: "extracted",
      detectedDocumentType: primary.detectedDocumentType,
      invoicePages: primary.invoicePages,
      header: primary.header,
      lineItems: primary.lineItems,
      fields: primary.fields,
      ...(primary.timesheets?.length ? { timesheets: primary.timesheets } : {}),
      ...(normalized.length > 1 ? { invoices: normalized } : {}),
    };
  }

  async extractFromDocument(
    file: Express.Multer.File,
    documentTypeInput?: string,
  ): Promise<InvoiceExtractionResult> {
    const documentType = this.parseDocumentType(documentTypeInput);
    const prompts = PROMPTS[documentType];
    const client = this.getClient();
    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";
    const isSpreadsheet = this.isSpreadsheetFile(file);

    if (!isImage && !isPdf && !isSpreadsheet) {
      throw new APIError(
        "Unsupported file type. Upload PDF, PNG, JPG, JPEG, XLSX, XLS, or CSV.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    let completion;
    let progressVisionPages: Array<{ pageNumber: number; dataUrl: string }> | null =
      null;

    if (isSpreadsheet) {
      const tableText = this.spreadsheetToText(file);
      logger.info(
        `[OCR] Extracting from spreadsheet "${file.originalname}" (${file.size} bytes)...`,
      );
      completion = await client.chat.completions.create({
        model: this.getModel(false),
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompts.system },
          {
            role: "user",
            content: `${prompts.user}\n\nSpreadsheet contents:\n${tableText}`,
          },
        ],
      });
    } else if (isImage) {
      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${file.mimetype};base64,${base64}`;
      progressVisionPages = [{ pageNumber: 1, dataUrl }];

      completion = await client.chat.completions.create({
        model: this.getModel(true),
        temperature: 0,
        ...this.getModelCompletionOptions(documentType),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompts.system },
          {
            role: "user",
            content: [
              { type: "text", text: prompts.user },
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "high" },
              },
            ],
          },
        ],
      });
    } else {
      logger.info(
        `[OCR] Rendering PDF "${file.originalname}" (${file.size} bytes) to images...`,
      );
      const renderStart = Date.now();
      let pages = await this.renderPdfPagesToImages(file.buffer);
      logger.info(
        `[OCR] Rendered ${pages.length} page(s) in ${Date.now() - renderStart}ms`,
      );

      if (pages.length === 0) {
        throw new APIError(
          "Could not render any pages from this PDF. The file may be corrupted.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const maxPages = this.getMaxVisionPages();
      if (pages.length > maxPages) {
        logger.warn(
          `[OCR] PDF has ${pages.length} pages; limiting OCR to first ${maxPages}.`,
        );
        pages = pages.slice(0, maxPages);
      }

      // Pass 1: cheap low-detail classification to locate the relevant pages.
      let selectedPages = pages;
      let narrowed = false;
      if (pages.length > 1) {
        try {
          const classifyStart = Date.now();
          const classification = await this.classifyPages(client, pages);
          logger.info(
            `[OCR] Classified ${classification.length} page(s) in ${Date.now() - classifyStart}ms: ${JSON.stringify(classification)}`,
          );
          const targetPageNums = this.selectTargetPages(
            classification,
            documentType,
          );
          const matched = pages.filter((p) =>
            targetPageNums.includes(p.pageNumber),
          );
          if (matched.length > 0) {
            selectedPages = matched;
            narrowed = true;
            logger.info(
              `[OCR] Extracting from page(s): ${targetPageNums.join(", ")}`,
            );
          } else {
            logger.warn(
              `[OCR] No ${documentType} pages matched; falling back to all pages.`,
            );
          }
        } catch (error) {
          logger.warn(
            `[OCR] Page classification failed; falling back to all pages. ${(error as Error)?.message}`,
          );
        }
      }

      // Re-render at higher resolution for sharper OCR on scanned docs (e.g. Faktur Pajak).
      const needsHiRes =
        narrowed ||
        documentType === "tax_invoice" ||
        documentType === "notice" ||
        documentType === "berita_acara" ||
        documentType === "manhour_summary" ||
        documentType === "timesheet" ||
        documentType === "po" ||
        documentType === "po_appendix" ||
        documentType === "ses" ||
        pages.length === 1;
      if (needsHiRes) {
        try {
          const hiResStart = Date.now();
          const targetNums = selectedPages.map((p) => p.pageNumber);
          const hiRes = await this.renderPdfPagesToImages(file.buffer, {
            scale: this.getExtractScaleForType(documentType),
            partial: targetNums,
          });
          if (hiRes.length > 0) {
            selectedPages = hiRes;
            logger.info(
              `[OCR] Re-rendered ${hiRes.length} page(s) at scale ${this.getExtractScale()} in ${Date.now() - hiResStart}ms`,
            );
          }
        } catch (error) {
          logger.warn(
            `[OCR] High-res re-render failed; using standard resolution. ${(error as Error)?.message}`,
          );
        }
      }

      // Pass 2: high-detail extraction on the selected pages only.
      if (documentType === "timesheet" && selectedPages.length >= 1) {
        logger.info(
          `[OCR] Per-page timesheet extraction on ${selectedPages.length} page(s)...`,
        );
        const parsed = await this.extractTimesheetFromPages(
          client,
          selectedPages,
        );
        return this.normalizeResult(parsed, file, documentType);
      }

      logger.info(
        `[OCR] Sending ${selectedPages.length} page image(s) to ${this.getModel(true)}...`,
      );
      const aiStart = Date.now();
      completion = await client.chat.completions.create({
        model: this.getModel(true),
        temperature: 0,
        ...this.getModelCompletionOptions(documentType),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompts.system },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${prompts.user}\n\nThe following ${selectedPages.length} page image(s) are from a larger document. Each image is preceded by its original page number. Use those page numbers for "invoicePages".`,
              },
              ...this.buildPageImageContent(selectedPages, "high"),
            ],
          },
        ],
      });
      logger.info(`[OCR] Model responded in ${Date.now() - aiStart}ms`);
      progressVisionPages = selectedPages;
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new APIError(
        "Empty response from document extraction service",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const parsed = this.parseJsonResponse(content) as Record<string, unknown>;
    if (documentType === "berita_acara" && progressVisionPages?.length) {
      await this.enrichBeritaAcaraWithProgressPass(
        client,
        parsed,
        progressVisionPages,
      );
    }
    return this.normalizeResult(parsed, file, documentType);
  }

  /**
   * Entry point used by the upload flow. The caller no longer chooses a document
   * type — instead the whole file is classified, split by detected document type
   * and extracted once per type, returning one result per classified document so
   * the UI can render a tab for each.
   */
  async extractDocuments(
    file: Express.Multer.File,
  ): Promise<InvoiceExtractionResult[]> {
    const client = this.getClient();
    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";
    const isSpreadsheet = this.isSpreadsheetFile(file);

    if (!isImage && !isPdf && !isSpreadsheet) {
      throw new APIError(
        "Unsupported file type. Upload PDF, PNG, JPG, JPEG, XLSX, XLS, or CSV.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    if (isSpreadsheet) {
      const tableText = this.spreadsheetToText(file);
      const documentType = await this.classifyText(client, tableText);
      return [
        await this.runSpreadsheetExtraction(
          client,
          file,
          documentType,
          tableText,
        ),
      ];
    }

    if (isImage) {
      const documentType = await this.detectImageType(client, file);
      return [await this.runImageExtraction(client, file, documentType)];
    }

    return this.extractPdfDocuments(client, file);
  }

  private async extractPdfDocuments(
    client: OpenAI,
    file: Express.Multer.File,
  ): Promise<InvoiceExtractionResult[]> {
    logger.info(
      `[OCR] Rendering PDF "${file.originalname}" (${file.size} bytes) for classification...`,
    );
    let pages = await this.renderPdfPagesToImages(file.buffer);
    if (pages.length === 0) {
      throw new APIError(
        "Could not render any pages from this PDF. The file may be corrupted.",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const maxPages = this.getMaxVisionPages();
    if (pages.length > maxPages) {
      logger.warn(
        `[OCR] PDF has ${pages.length} pages; limiting OCR to first ${maxPages}.`,
      );
      pages = pages.slice(0, maxPages);
    }

    let groups = new Map<DocumentType, number[]>();
    try {
      const classifyStart = Date.now();
      const classification = await this.classifyPages(client, pages);
      logger.info(
        `[OCR] Classified ${classification.length} page(s) in ${Date.now() - classifyStart}ms: ${JSON.stringify(classification)}`,
      );
      groups = this.groupPagesByType(classification);
    } catch (error) {
      logger.warn(
        `[OCR] Page classification failed; treating the whole file as a single invoice. ${(error as Error)?.message}`,
      );
    }

    if (groups.size === 0) {
      logger.warn(
        "[OCR] No supported document types detected; falling back to invoice over all pages.",
      );
      groups = new Map([["invoice", pages.map((p) => p.pageNumber)]]);
    }

    logger.info(
      `[OCR] Detected ${groups.size} document type(s): ${[...groups.entries()]
        .map(([type, nums]) => `${type}[${nums.join(",")}]`)
        .join(", ")}`,
    );

    const results: InvoiceExtractionResult[] = [];
    for (const [documentType, pageNums] of groups) {
      try {
        results.push(
          await this.extractPdfForType(client, file, documentType, pageNums),
        );
      } catch (error) {
        logger.error(
          `[OCR] Extraction failed for ${documentType} on page(s) ${pageNums.join(", ")}:`,
          error,
        );
      }
    }

    this.enrichSharedHeaderFields(results);

    return results;
  }

  private async extractPdfForType(
    client: OpenAI,
    file: Express.Multer.File,
    documentType: DocumentType,
    pageNums: number[],
  ): Promise<InvoiceExtractionResult> {
    const prompts = PROMPTS[documentType];

    let selectedPages = await this.renderPdfPagesToImages(file.buffer, {
      scale: this.getExtractScaleForType(documentType),
      partial: pageNums,
    });
    if (selectedPages.length === 0) {
      selectedPages = await this.renderPdfPagesToImages(file.buffer, {
        partial: pageNums,
      });
    }

    logger.info(
      `[OCR] Extracting ${documentType} from ${selectedPages.length} page(s) ${pageNums.join(", ")}...`,
    );
    const aiStart = Date.now();
    const completion = await client.chat.completions.create({
      model: this.getModel(true),
      temperature: 0,
      ...this.getModelCompletionOptions(documentType),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompts.system },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${prompts.user}\n\nThe following ${selectedPages.length} page image(s) are from a larger document. Each image is preceded by its original page number. Use those page numbers for "invoicePages".`,
            },
            ...this.buildPageImageContent(selectedPages, "high"),
          ],
        },
      ],
    });
    logger.info(
      `[OCR] Model responded for ${documentType} in ${Date.now() - aiStart}ms`,
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new APIError(
        "Empty response from document extraction service",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const parsed = this.parseJsonResponse(content) as Record<string, unknown>;
    if (documentType === "berita_acara" && selectedPages.length > 0) {
      await this.enrichBeritaAcaraWithProgressPass(
        client,
        parsed,
        selectedPages,
      );
    }
    return this.normalizeResult(parsed, file, documentType);
  }

  private async detectImageType(
    client: OpenAI,
    file: Express.Multer.File,
  ): Promise<DocumentType> {
    try {
      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${file.mimetype};base64,${base64}`;
      const classification = await this.classifyPages(client, [
        { pageNumber: 1, dataUrl },
      ]);
      const type = this.resolveDocumentType(classification[0]?.documentType);
      if (type) return type;
    } catch (error) {
      logger.warn(
        `[OCR] Image classification failed; defaulting to invoice. ${(error as Error)?.message}`,
      );
    }
    return "invoice";
  }

  private async runImageExtraction(
    client: OpenAI,
    file: Express.Multer.File,
    documentType: DocumentType,
  ): Promise<InvoiceExtractionResult> {
    const prompts = PROMPTS[documentType];
    const base64 = file.buffer.toString("base64");
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    const completion = await client.chat.completions.create({
      model: this.getModel(true),
      temperature: 0,
      ...this.getModelCompletionOptions(documentType),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompts.system },
        {
          role: "user",
          content: [
            { type: "text", text: prompts.user },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new APIError(
        "Empty response from document extraction service",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const parsed = this.parseJsonResponse(content) as Record<string, unknown>;
    if (documentType === "berita_acara") {
      await this.enrichBeritaAcaraWithProgressPass(client, parsed, [
        { pageNumber: 1, dataUrl },
      ]);
    }
    return this.normalizeResult(parsed, file, documentType);
  }

  private async classifyText(
    client: OpenAI,
    text: string,
  ): Promise<DocumentType> {
    try {
      const completion = await client.chat.completions.create({
        model: this.getModel(false),
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLASSIFY_SYSTEM },
          {
            role: "user",
            content: `Classify the following document into a single type code. Treat it as page 1.\n\n${text.slice(
              0,
              8000,
            )}`,
          },
        ],
      });
      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = this.parseJsonResponse(content);
        const first = Array.isArray(parsed?.pages) ? parsed.pages[0] : parsed;
        const type = this.resolveDocumentType(first?.documentType);
        if (type) return type;
      }
    } catch (error) {
      logger.warn(
        `[OCR] Spreadsheet classification failed; defaulting to invoice. ${(error as Error)?.message}`,
      );
    }
    return "invoice";
  }

  private async runSpreadsheetExtraction(
    client: OpenAI,
    file: Express.Multer.File,
    documentType: DocumentType,
    tableText: string,
  ): Promise<InvoiceExtractionResult> {
    const prompts = PROMPTS[documentType];
    logger.info(
      `[OCR] Extracting ${documentType} from spreadsheet "${file.originalname}" (${file.size} bytes)...`,
    );
    const completion = await client.chat.completions.create({
      model: this.getModel(false),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompts.system },
        {
          role: "user",
          content: `${prompts.user}\n\nSpreadsheet contents:\n${tableText}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new APIError(
        "Empty response from document extraction service",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const parsed = this.parseJsonResponse(content);
    return this.normalizeResult(parsed, file, documentType);
  }
}

export default new ApInvoiceOcrService();