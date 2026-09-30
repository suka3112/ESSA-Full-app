import { getPromptsConfig } from "./loadConfig.js";
import {
  getAllowedCategoryIds,
  getClassificationCatalogText,
} from "../constants/documentFieldSchemas.js";
import {
  catalogHasTypes,
  findInvoiceType,
  getAllowedCategoryIdsForType,
  getClassificationCatalogTextForType,
} from "./invoiceTypeCatalog.js";

const CATEGORY_SYNONYMS = [
  ["tax_invoice", "faktur_pajak"],
  ["kwitansi", "notice"],
  ["receipt", "notice"],
  ["payment_notice", "notice"],
  ["work_progress_certificate", "berita_acara"],
  ["berita_acara variants", "berita_acara"],
  ["summary_calculation", "summary_calculation_manhour"],
  ["summary_of_claim", "summary_calculation_manhour"],
  ["daily_time_sheet", "daily_timesheet"],
  ["timesheet", "daily_timesheet"],
  ["face_finger", "daily_attendance"],
  ["fabrication_report", "daily_attendance"],
  ["attendance_sheet", "daily_attendance"],
  ["biometrics", "daily_attendance"],
  ["po", "purchase_order"],
  ["purchase_order_terms", "purchase_order_appendix"],
  ["po_appendix", "purchase_order_appendix"],
  ["ses", "service_entry_sheet"],
  ["transmittal_note", "transmittal"],
  ["receipt", "notice_letter"],
  ["kwitansi", "notice_letter"],
  ["progress_report", "monthly_progress_report"],
  ["sbu", "sertifikat_badan_usaha"],
  ["iujk", "izin_usaha_jasa_konstruksi"],
];

function warnUnresolvedType(invoiceTypeId) {
  console.warn(
    "[classificationPrompt] invoiceTypeId not resolved — falling back to global classification catalog",
    { invoiceTypeId: invoiceTypeId || null },
  );
}

function resolveCatalogContext(invoiceTypeId, catalog) {
  const resolved = Boolean(
    invoiceTypeId && catalogHasTypes(catalog) && findInvoiceType(catalog, invoiceTypeId),
  );
  if (!resolved) {
    warnUnresolvedType(invoiceTypeId);
  }

  const allowed = resolved
    ? getAllowedCategoryIdsForType(catalog, invoiceTypeId)
    : getAllowedCategoryIds();
  const catalogText = resolved
    ? getClassificationCatalogTextForType(catalog, invoiceTypeId)
    : getClassificationCatalogText();

  return { allowed, catalogText, resolved };
}

function buildSynonymLines(allowed) {
  const allowedSet = new Set(allowed);
  return CATEGORY_SYNONYMS.filter(([, canonical]) => allowedSet.has(canonical)).map(
    ([alias, canonical]) => `- ${alias} → ${canonical}`,
  );
}

function buildTimesheetPoDisambiguation(allowed) {
  const allowedSet = new Set(allowed);
  const lines = [];
  if (allowedSet.has("notice") && allowedSet.has("invoice")) {
    lines.push(
      "- notice — title KWITANSI / Receipt with Sudah Terima Dari and Untuk Pembayaran. Never merge this page into invoice.",
    );
    lines.push(
      "- invoice — title INVOICE with a description/amount claim table, Inv No, Payment Terms, VAT, Grand Total.",
    );
  }
  if (allowedSet.has("berita_acara")) {
    lines.push(
      "- berita_acara — ONLY a page titled Berita Acara / Work Progress Certificate / BAP, or a Prepared/Reviewed/Acknowledged/Approved grid. Do not invent this type. A PO number, period, or manhours on an invoice or summary is NOT Berita Acara.",
    );
  }
  if (allowedSet.has("faktur_pajak")) {
    lines.push(
      "- faktur_pajak — ONLY Faktur Pajak / e-Faktur / Coretax with Kode dan Nomor Seri Faktur Pajak (DJP, DPP+PPN, QR). Never invent this type. A commercial invoice with VAT/PPN is still invoice.",
    );
  }
  if (allowedSet.has("summary_calculation_manhour")) {
    lines.push(
      "- summary_calculation_manhour — includes Summary of Claim / Summary Calculation Manhour / Nth Claim tables. Not an invoice.",
    );
  }
  if (allowedSet.has("daily_timesheet")) {
    lines.push(
      "- daily_timesheet — handwritten/printed DAILY TIME SHEET with IN, OUT, Sign Workers, Daily Activity, Approved by. Classify as daily_timesheet even when a PO number is written in the header.",
    );
  }
  if (allowedSet.has("daily_attendance")) {
    lines.push(
      "- daily_attendance — Face Finger, Fabrication Report, or biometric authentication log. Not a timesheet.",
    );
  }
  if (allowedSet.has("purchase_order")) {
    lines.push(
      "- purchase_order — the SAP/PAU PURCHASE ORDER cover page (large title PURCHASE ORDER or Purchase Order, PO Number, PO Date, vendor/Kepada). Requisition No is optional. On fully scanned bundles this is often a photo of the printed PO form near the end, immediately before Appendix - 1. A PO number written on a timesheet/invoice header is NOT this type.",
    );
  }
  if (allowedSet.has("purchase_order_appendix")) {
    lines.push(
      "- purchase_order_appendix — pages headed Appendix - 1/2/3, PRICE BREAKDOWN AND DESCRIPTION OF PURCHASE ORDER, or GENERAL TERMS & CONDITIONS. Even if PO Number/PO Date repeat, this is not purchase_order.",
    );
  }
  if (allowedSet.has("transmittal")) {
    lines.push(
      "- transmittal — title TRANSMITTAL NOTE with enclosed-document table. Never merge into invoice.",
    );
  }
  if (allowedSet.has("notice_letter")) {
    lines.push(
      "- notice_letter — RECEIPT / Kwitansi-style page OR 'Notice of Total Value for … Progress Claim' with Payment Details. Not the commercial invoice.",
    );
  }
  if (allowedSet.has("monthly_progress_report")) {
    lines.push(
      "- monthly_progress_report — landscape MONTHLY PROGRESS REPORT with WBS No, Weight Factor, Previous/Current/Cumulative %. Not a Berita Acara certificate.",
    );
  }
  if (allowedSet.has("sertifikat_badan_usaha")) {
    lines.push(
      "- sertifikat_badan_usaha — government SBU / PB-UMKU certificate with NIB and KBLI. Not IUJK.",
    );
  }
  if (allowedSet.has("izin_usaha_jasa_konstruksi")) {
    lines.push(
      "- izin_usaha_jasa_konstruksi — Izin Usaha Jasa Konstruksi Nasional with Nomor IUJK. Not SBU.",
    );
  }
  if (allowedSet.has("invoice") && allowedSet.has("monthly_progress_report")) {
    lines.push(
      "- Typical civil bundle order: Transmittal, cover letter, Invoice (progress claim), Receipt, Faktur Pajak, Notice of Progress Claim, Berita Acara, Monthly Progress Report, IUJK/SBU, then PO cover and appendix.",
    );
    lines.push(
      "- The landscape WBS spreadsheet is ALWAYS monthly_progress_report — even if it shows contract value and progress % also printed on the invoice or BA.",
    );
  }
  if (allowedSet.has("invoice") && allowedSet.has("daily_timesheet")) {
    lines.push(
      "- Typical manpower bundle order WHEN THOSE DOCUMENTS ARE PRESENT: Kwitansi, Invoice, Faktur Pajak, Berita Acara near the start, then Summary of Claim / manhour, then timesheets and attendance, then PO / appendix.",
    );
    lines.push(
      "- If a type is missing from the pack, do NOT assign it. Classify each page from its own title. After a true invoice / faktur_pajak / berita_acara page, later pages of a different form are NEVER those types.",
    );
  }
  return lines;
}

function buildClassificationAppendix(invoiceTypeId, catalog) {
  const { allowed, catalogText } = resolveCatalogContext(invoiceTypeId, catalog);
  const synonymLines = buildSynonymLines(allowed);
  const disambiguation = buildTimesheetPoDisambiguation(allowed);

  return [
    "",
    "ALLOWED categoryId values (use exactly one of these; do NOT invent new slugs):",
    [...allowed, "unclassified"].join(", "),
    "",
    "Document type catalog:",
    catalogText,
    "",
    synonymLines.length
      ? [
          "Synonym mapping — always output the canonical categoryId on the right:",
          ...synonymLines,
        ].join("\n")
      : null,
    disambiguation.length
      ? ["", "Critical disambiguation:", ...disambiguation].join("\n")
      : null,
    "",
    'Use categoryLabel exactly as shown in the catalog.',
    "Classify EACH page from its own title. Do not copy the previous page's type across the rest of the PDF.",
    "Never label every page as invoice, faktur_pajak, or berita_acara.",
    "Use unclassified when the page has no matching title/layout — do not invent a missing bundle type.",
  ]
    .filter((line) => line != null)
    .join("\n");
}

function buildCategoryGroupingAppendix(invoiceTypeId, catalog) {
  const { allowed, catalogText } = resolveCatalogContext(invoiceTypeId, catalog);
  const allowedSet = new Set(allowed);
  const synonymMerges = [
    allowedSet.has("faktur_pajak")
      ? "- tax_invoice with faktur_pajak → faktur_pajak"
      : null,
    allowedSet.has("notice")
      ? "- kwitansi / receipt / payment_notice with notice → notice"
      : null,
    allowedSet.has("daily_attendance")
      ? "- face_finger / fabrication_report / attendance_sheet with daily_attendance → daily_attendance"
      : null,
    allowedSet.has("daily_timesheet")
      ? "- daily_time_sheet / timesheet with daily_timesheet → daily_timesheet"
      : null,
    allowedSet.has("purchase_order_appendix")
      ? "- purchase_order_terms / po_appendix with purchase_order_appendix → purchase_order_appendix"
      : null,
    allowedSet.has("service_entry_sheet")
      ? "- ses with service_entry_sheet → service_entry_sheet"
      : null,
  ].filter(Boolean);

  return [
    "",
    "Each catalog row below is a DISTINCT document type. Never merge two different rows into one PDF.",
    catalogText,
    "",
    synonymMerges.length
      ? ["Common synonym merges only:", ...synonymMerges].join("\n")
      : null,
    "",
    "Do NOT merge invoice with faktur_pajak, berita_acara with timesheets/attendance/manhour, or PO with anything else.",
    "Never fold the whole bundle into faktur_pajak or berita_acara.",
  ]
    .filter((line) => line != null)
    .join("\n");
}

export function getClassificationPrompts(invoiceTypeId, catalog) {
  const prompts = getPromptsConfig().classification;
  return {
    system: `${prompts.system}${buildClassificationAppendix(invoiceTypeId, catalog)}`,
    user: prompts.user,
  };
}

export function getVisionClassificationPrompts(invoiceTypeId, catalog) {
  const prompts = getPromptsConfig().visionClassification;
  return {
    system: `${prompts.system}${buildClassificationAppendix(invoiceTypeId, catalog)}`,
    user: prompts.user,
  };
}

export function getCategoryGroupingPrompts(invoiceTypeId, catalog) {
  const prompts = getPromptsConfig().categoryGrouping;
  return {
    system: `${prompts.system}${buildCategoryGroupingAppendix(invoiceTypeId, catalog)}`,
    user: prompts.user,
  };
}

export const PER_PAGE_CLASSIFY_CONTEXT = [
  "Classify EACH page independently from its own title, heading, and layout.",
  "Do not copy the previous page's categoryId unless this page is clearly a continuation of the same form (same title and same document number).",
  "A manpower bundle usually contains several document types. It is wrong to label every page as invoice, faktur_pajak, or berita_acara.",
  "If a document type is absent from the file, do not invent it.",
].join(" ");

