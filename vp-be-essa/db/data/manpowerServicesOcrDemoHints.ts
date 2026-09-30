/**
 * Manpower Services (PO) seed payload mapped from ocr-demo documentFieldSchemas +
 * documentExtractionHints, tailored to PT Amanah Lestari Energy MPO claim bundles
 * (e.g. "MPO Invoice - PT Amanah Lestari Energy-correct-po.pdf" / po_match.json).
 */
import { enrichPromptWithDocumentRules } from "./nonPoOcrDemoHints";

export type ManpowerFieldSeed = {
  fieldName: string;
  displayName: string;
  hint: string;
};

export type ManpowerDocumentSeed = {
  documentCode: string;
  documentName: string;
  isEnabled: boolean;
  fields: ManpowerFieldSeed[];
  documentRules?: string;
};

const INVOICE_RULES = `
Manpower commercial invoice (PT. Amanah Lestari Energy / ALE-PAU style):

General:
- Scan the ENTIRE invoice page (letterhead, MESSRS / bill-to, description table, totals, bank, signature).
- Multilingual OK. Preserve thousand separators exactly (e.g. "21.099.000"). Never invent values.
- This is a PO-based manpower claim invoice — always extract poNumber when printed.

Header mapping:
- invNo — INVOICE NO / Invoice No. Amanah uses NNN/PT.ALE-PAU/MM/YYYY (e.g. 568/PT.ALE-PAU/04/2026).
  Read leading digits carefully (568 ≠ SER). Do NOT use Faktur Pajak serial or PO (4203…) as invNo.
- date — invoice DATE line (not due date).
- dueDate — from PAYMENT TERM when a due date is printed; otherwise null (terms alone go to paymentTerms).
- vendorName / vendorAddress / vendorTaxId — PT. AMANAH LESTARI ENERGY letterhead / seller block.
- buyerName — MESSRS / bill-to (e.g. PT. PANCA AMARA UTAMA). Ignore OCR typos like "AMADA".
- poNumber — Contract Order / PO Number on THIS invoice (10 digits starting 4203, e.g. 4203000546).
  Often appears inside the service / "Untuk Pembayaran" / claim description text.
- serviceName — heading such as "MANPOWER SUPPLY FOR PIPING FABRICATION (Welder, Fitter and Helper)".
- rolesOfManpower — unique roles mentioned (e.g. "Welder, Fitter, Pipe Fitter").
- projectName / jobNo — JOB NO or project when printed (e.g. A-509).
- paymentTerms — full PAYMENT TERM text (e.g. "30 Days From Invoice Date").
- currency — IDR when amounts are Rp.
- subtotal / totalAmount / vatAmount / grandTotal — from totals block. Never put these rows in line items.
- bankName, bankBranch, bankAccountNumber, bankAccountName — bank remittance block
  (e.g. Bank MANDIRI Cabang Luwuk / 151-00-1017369-5 / PT. Amanah Lestari Energy).
- authorizedSignatory — signatory name if printed.

LINE ITEMS (invoiceLineItems + mirror lineItems):
- One row per printed claim cost line in top-to-bottom order.
- Descriptions often look like:
  "10th Claim for 07 March - 06 April 2025 Direct Cost Welder"
  "… Stationery, Postage, Transportation" / Office / Overhead and Profit / MCU / PPE / Overtime …
- Keys: description, role (Welder/Fitter when present in description), quantity, unit, unitPrice, amount.
- Do NOT drop rows that only have description + amount.
- Do NOT include Subtotal / VAT / Grand Total as line items.
`.trim();

const TAX_INVOICE_RULES = `
Faktur Pajak / Tax Invoice (VAT) in manpower bundles:
- taxInvoiceNumber — "Kode dan Nomor Seri Faktur Pajak" (15–17 digit e-Faktur). Not the commercial invNo.
- date — Tempat dan Tanggal Ditandatangani (date portion only), or Tanggal Faktur near QR.
- vatAmount — "Jumlah PPN (Pajak Pertambahan Nilai)" exactly as printed.
`.trim();

const BERITA_ACARA_RULES = `
Work Progress Certificate / Berita Acara (manpower claim):
- poNumber — 10-digit 420x PO from THIS page only.
- periodStart / periodEnd — claim period (e.g. 07 March - 06 April 2026).
- serviceName — manpower supply / piping fabrication activity.
- manhourPercentageCompletion — THIS PERIOD % only (not Cumulative / Previous).
- thisManhours — THIS PERIOD man-hours only.
- approvalPrepared / approvalReviewed / approvalAcknowledged / approvalApproved — signatory names.
- manpower — one entry per listed worker { role, name } in table order.
`.trim();

const SUMMARY_MANHOUR_RULES = `
Summary Calculation Manhour / Rekap Manhour (manpower claim pages):
HEADER: poNumber, periodStart, periodEnd, vendorName, projectName,
totalRegularManhour, totalOvertimeManhour (from footer totals, not a line row).

manhourSummary — one row per worker (never skip). Keys:
manpowerName (or name), role, regularManhour (Basic Manhour hours — NOT Basic Day),
overtimeManhour, overtimeMondaySaturdayManhour, overtimeSundayHolidayManhour,
unitPrice (per-hour rate only), regularAmount, overtimeAmount.

If no Overtime column exists, set OT hour/amount fields to 0.
Skip printed Total/footer rows from manhourSummary (capture in header totals).
`.trim();

const TIMESHEET_RULES = `
Daily Time Sheet (Amanah / ALE landscape — usually one worker per page):
- Output timesheets[] (one object per worker). Leave lineItems as [].
- Per timesheet: manpowerName (Name :), username (No. ID :), role (Position :),
  periodStart/periodEnd, sheetPages, totalRegularManhour, totalOvertimeManhour,
  entries[] with date, basicTime, otActual, regularManhour, overtimeManhour.
- Never use Prepared/Approved footer names as manpowerName.
- Preserve comma decimals (9,00). Read OT Actual column — do not compute OT.
`.trim();

const ATTENDANCE_RULES = `
Daily Attendance (biometrics / face-finger):
- attendanceEntries: date, username, event for EVERY log row in printed order.
`.trim();

const PO_RULES = `
Purchase Order in the manpower bundle:
- poNumber REQUIRED (420x…). Never use invoice / BA numbers.
- poDate, vendorName (To), vendorCode, buyerName (issuer / top-right — e.g. PT PANCA AMARA UTAMA),
  projectName, description, deliveryDate, paymentTerms, incoterms, currency,
  totalAmount / poValue from THIS PO only (not from the claim invoice).
- poLineItems: no, description, qty, uom, unitPrice, amount.
`.trim();

const PO_APPENDIX_RULES = `
PO Appendix / rate schedule:
- poHeaderInformation — PO context / number.
- appendixItems — unitPrice, qty, roleOfManpower per rate row.
`.trim();

function field(
  fieldName: string,
  label: string,
  aliases: string[] = [],
): ManpowerFieldSeed {
  const aliasNote = aliases.length ? `Aliases: ${aliases.join(", ")}` : "";
  return {
    fieldName,
    displayName: label,
    hint: aliasNote,
  };
}

/** Documents under Manpower Services (code MANPOWER_SERVICES). */
export const MANPOWER_SERVICES_OCR_DEMO_DOCUMENTS: ManpowerDocumentSeed[] = [
  {
    documentCode: "INVOICE",
    documentName: "Invoice",
    isEnabled: true,
    documentRules: INVOICE_RULES,
    fields: [
      field("invNo", "Inv No", ["invoice no", "nomor invoice", "ALE-PAU"]),
      field("date", "Invoice Date", ["tanggal", "date"]),
      field("dueDate", "Due Date", ["jatuh tempo", "payment due"]),
      field("vendorName", "Vendor Name", ["PT. Amanah Lestari Energy", "seller", "issued by"]),
      field("vendorAddress", "Vendor Address"),
      field("vendorTaxId", "Vendor Tax ID", ["npwp"]),
      field("buyerName", "Buyer Name", ["MESSRS", "bill to", "PT. PANCA AMARA UTAMA"]),
      field("poNumber", "PO / Contract Order No", ["4203", "contract order no", "PO No"]),
      field("serviceName", "Service / Activity Name", [
        "manpower supply",
        "piping fabrication",
        "untuk pembayaran",
      ]),
      field("rolesOfManpower", "Roles of Manpower", [
        "Welder",
        "Fitter",
        "Pipe Fitter",
        "Helper",
      ]),
      field("projectName", "Project / Job No", ["JOB NO", "A-509", "project"]),
      field("currency", "Currency", ["IDR", "Rp"]),
      field("paymentTerms", "Payment Terms", ["30 Days From Invoice Date"]),
      field("manhourUnitRate", "Manhour Unit Rate", ["rate/mh", "harga satuan"]),
      field("calculation", "Calculation notes"),
      field("subtotal", "Subtotal"),
      field("totalAmount", "Total Amount"),
      field("vatAmount", "VAT Amount", ["ppn", "vat 11%"]),
      field("grandTotal", "Grand Total", ["amount due"]),
      field("bankName", "Bank Name", ["Bank MANDIRI"]),
      field("bankBranch", "Bank Branch", ["Cabang Luwuk", "cabang"]),
      field("bankAccountNumber", "Bank Account Number", ["no rekening", "151-00-"]),
      field("bankAccountName", "Bank Account Name", ["atas nama", "beneficiary"]),
      field("authorizedSignatory", "Authorized Signatory"),
      field(
        "invoiceLineItems",
        "Claim line items array",
        [
          "description",
          "role",
          "quantity",
          "unit",
          "unitPrice",
          "amount",
          "Direct Cost",
          "Overtime",
          "Overhead and Profit",
        ],
      ),
    ],
  },
  {
    documentCode: "TAX_INVOICE_VAT",
    documentName: "Tax Invoice (VAT)",
    isEnabled: true,
    documentRules: TAX_INVOICE_RULES,
    fields: [
      field("taxInvoiceNumber", "Tax Invoice Number", [
        "kode dan nomor seri faktur pajak",
      ]),
      field("date", "Tax Invoice Date", [
        "tempat dan tanggal ditandatangani",
        "tanggal faktur",
      ]),
      field("vatAmount", "VAT Amount", ["jumlah ppn", "ppn"]),
    ],
  },
  {
    documentCode: "BERITA_ACARA",
    documentName: "Work Progress Certificate (Berita Acara)",
    isEnabled: true,
    documentRules: BERITA_ACARA_RULES,
    fields: [
      field("poNumber", "PO Number"),
      field("periodStart", "Period Start", ["period from"]),
      field("periodEnd", "Period End", ["period to"]),
      field("manhourPercentageCompletion", "This Period % completion"),
      field("thisManhours", "This Period Man Hours"),
      field("approvalPrepared", "Approval - Prepared"),
      field("approvalReviewed", "Approval - Reviewed"),
      field("approvalAcknowledged", "Approval - Acknowledged"),
      field("approvalApproved", "Approval - Approved"),
      field("serviceName", "Service Name"),
      field("rolesOfManpower", "Roles of Manpower"),
      field("manpower", "Manpower rows", ["role", "name"]),
    ],
  },
  {
    documentCode: "SUMMARY_CALCULATION_MANHOUR",
    documentName: "Summary Calculation Manhour (Monthly Man-days Summary)",
    isEnabled: true,
    documentRules: SUMMARY_MANHOUR_RULES,
    fields: [
      field("poNumber", "PO Number"),
      field("periodStart", "Period Start"),
      field("periodEnd", "Period End"),
      field("vendorName", "Vendor Name"),
      field("projectName", "Project Name"),
      field("totalRegularManhour", "Total Regular Manhour (footer)"),
      field("totalOvertimeManhour", "Total Overtime Manhour (footer)"),
      field(
        "manhourSummary",
        "Per-worker manhour rows",
        [
          "manpowerName",
          "role",
          "regularManhour",
          "overtimeManhour",
          "unitPrice",
          "regularAmount",
          "overtimeAmount",
        ],
      ),
    ],
  },
  {
    documentCode: "DAILY_TIME_SHEET",
    documentName: "Daily Time Sheet",
    isEnabled: true,
    documentRules: TIMESHEET_RULES,
    fields: [
      field("poNumber", "PO Number"),
      field("periodStart", "Period Start"),
      field("periodEnd", "Period End"),
      field("vendorName", "Vendor Name"),
      field("projectName", "Project Name"),
      field(
        "timesheets",
        "One object per worker",
        [
          "manpowerName",
          "username",
          "role",
          "entries",
          "totalRegularManhour",
          "totalOvertimeManhour",
        ],
      ),
    ],
  },
  {
    documentCode: "DAILY_ATTENDANCE",
    documentName: "Daily Attendance (biometrics)",
    isEnabled: true,
    documentRules: ATTENDANCE_RULES,
    fields: [
      field("attendanceEntries", "Attendance log rows", [
        "date",
        "username",
        "event",
      ]),
    ],
  },
  {
    documentCode: "PO",
    documentName: "PO",
    isEnabled: true,
    documentRules: PO_RULES,
    fields: [
      field("poNumber", "PO Number", ["4203"]),
      field("poDate", "PO Date"),
      field("vendorName", "Vendor (To)"),
      field("vendorCode", "Vendor Code"),
      field("buyerName", "Buyer / Issuer"),
      field("projectName", "Project"),
      field("description", "Description / Scope"),
      field("deliveryDate", "Delivery Date"),
      field("paymentTerms", "Payment Terms"),
      field("incoterms", "Incoterms / Delivery Terms"),
      field("currency", "Currency"),
      field("totalAmount", "PO Total Amount"),
      field("poValue", "PO Value (same as totalAmount)"),
      field("poLineItems", "PO line items", [
        "no",
        "description",
        "qty",
        "uom",
        "unitPrice",
        "amount",
      ]),
    ],
  },
  {
    documentCode: "PO_APPENDIX",
    documentName: "PO Appendix",
    isEnabled: true,
    documentRules: PO_APPENDIX_RULES,
    fields: [
      field("poHeaderInformation", "PO Header Information"),
      field("appendixItems", "Appendix rate rows", [
        "unitPrice",
        "qty",
        "roleOfManpower",
      ]),
    ],
  },
];

export { enrichPromptWithDocumentRules };
