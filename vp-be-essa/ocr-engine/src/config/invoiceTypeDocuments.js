/**
 * Document Types tab config, copied from prompt-builder-mockup.html
 * (CATEGORIES, typeConfigs, slugify, SCATTERED_HINTS).
 *
 * categoryId for documents that already exist in CLASSIFICATION_CATEGORIES
 * uses those canonical slugs (daily_timesheet, purchase_order, …) so
 * DOCUMENT_SCHEMAS / resolveSchemaId keep working. New mockup documents
 * use the mockup slugify (parentheticals stripped).
 */
import { CLASSIFICATION_CATEGORIES } from "../constants/documentFieldSchemas.js";

/** @type {Record<string, Record<string, string[]>>} */
export const MOCKUP_CATEGORIES = {
  PO: {
    "Manpower Services": [
      "Invoice",
      "Notice (Kwitansi)",
      "Tax Invoice (VAT)",
      "Work Progress Certificate (Berita Acara)",
      "Summary Calculation Manhour (Monthly Man-days Summary)",
      "Daily Time Sheet",
      "Daily Attendance (biometrics)",
      "PO",
      "PO Appendix",
    ],
    "Civil Contractor": [
      "Transmittal",
      "Invoice",
      "Notice Letter",
      "Tax Invoice",
      "Work Progress Certificate (Berita Acara)",
      "Monthly Progress Report",
      "Sertifikat Badan Usaha",
      "Izin Usaha Jasa Konstruksi",
      "PO",
      "PO Appendix",
    ],
    "Material Import": [
      "PO",
      "PO Appendix",
      "Invoice",
      "Logistics Invoice",
      "Commercial Invoice",
      "Packing Slip",
      "Email Notification",
      "Bill of Lading / AWB",
      "Packing List",
    ],
    "Camp Service and Catering": [
      "Invoice",
      "Tax Invoice (VAT)",
      "Work Progress Certificate (Berita Acara)",
      "Proforma Invoice",
      "Attendance Statistics Table",
      "Monthly Meal Summary (PoB Report)",
      "PO",
      "PO Appendix",
    ],
  },
  "Non-PO": {
    "Non-PO": [
      "Invoice",
      "Listing Invoices (If any)",
      "Tax Invoice",
      "Underlying Contract",
      "Guarantee Letter (If any)",
      "Room Reservation Form (If any)",
      "Work Progress Certificate (Berita Acara)",
    ],
  },
};

export const MOCKUP_TYPE_CONFIGS = {
  "Manpower Services": {
    invoiceTypeId: "MANPOWER_SERVICES",
    poSeries: ["4203"],
    contentSignals:
      "Manpower supply, welding/fabrication activity, headcount-based billing, manpower roles referenced (Welder, Fitter, Helper), manhour/timesheet language.",
  },
  "Civil Contractor": {
    invoiceTypeId: "CIVIL_CONTRACTOR",
    poSeries: ["4203"],
    contentSignals:
      "Construction/civil work progress claim (not manpower timesheets). WBS stages such as Infrastructure, Sport Hall, Shared Block; Contract Value / Retention / Advance Payment Recovery; Work Progress Certificate with Work Package STR/ARS/MEP; Sertifikat Badan Usaha or Izin Usaha Jasa Konstruksi; vendors such as PT Berca Buana Sakti.",
  },
  "Material Import": {
    invoiceTypeId: "MATERIAL_IMPORT",
    poSeries: ["4201", "4202"],
    contentSignals: "",
  },
  "Camp Service and Catering": {
    invoiceTypeId: "CAMP_SERVICE_AND_CATERING",
    poSeries: ["4203"],
    contentSignals:
      "Catering/meal service language, meal counts by type (breakfast, lunch, dinner, supper), attendance/headcount at a camp or site facility.",
  },
  "Non-PO": {
    invoiceTypeId: "NON_PO",
    poSeries: [],
    contentSignals: "",
  },
};

/** Same as prompt-builder-mockup.html SCATTERED_HINTS. */
const SCATTERED_HINTS = [
  "daily time sheet",
  "daily attendance",
  "summary calculation manhour",
  "po appendix",
  "sertifikat badan usaha",
];

/**
 * Same as prompt-builder-mockup.html slugify — strips parentheticals first.
 * Used only for documents that are not in CLASSIFICATION_CATEGORIES.
 */
export function mockupSlugify(docName) {
  return String(docName || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function mockupSplitBehavior(docName) {
  const lower = String(docName || "").toLowerCase();
  return SCATTERED_HINTS.some((hint) => lower.includes(hint))
    ? "scattered"
    : "contiguous";
}

/** Display name from the mockup Document Types tab → existing ocr-demo slug. */
const DISPLAY_NAME_TO_CANONICAL_SLUG = {
  Invoice: "invoice",
  "Notice (Kwitansi)": "notice",
  Kwitansi: "notice",
  "Tax Invoice (VAT)": "faktur_pajak",
  "Tax Invoice": "faktur_pajak",
  "Work Progress Certificate (Berita Acara)": "berita_acara",
  "Daily Time Sheet": "daily_timesheet",
  "Daily Attendance (biometrics)": "daily_attendance",
  "Summary Calculation Manhour (Monthly Man-days Summary)":
    "summary_calculation_manhour",
  PO: "purchase_order",
  "PO Appendix": "purchase_order_appendix",
  Transmittal: "transmittal",
  "Notice Letter": "notice_letter",
  "Monthly Progress Report": "monthly_progress_report",
  "Sertifikat Badan Usaha": "sertifikat_badan_usaha",
  "Izin Usaha Jasa Konstruksi": "izin_usaha_jasa_konstruksi",
};

const IDENTIFIERS_BY_SLUG = Object.fromEntries(
  CLASSIFICATION_CATEGORIES.map((entry) => [entry.categoryId, entry.identifiers]),
);

const CIVIL_IDENTIFIERS = {
  transmittal:
    "Cover page titled TRANSMITTAL NOTE listing enclosed documents (Inv No, Progress N). Sender/To/Attention/From, document table with Remarks (Original). Not an invoice.",
  notice_letter:
    "RECEIPT / Kwitansi-style page with Received From and amount in words, OR 'Notice of Total Value for … Progress Claim' with Payment Details. Not the commercial invoice and not a Faktur Pajak.",
  monthly_progress_report:
    "Landscape MONTHLY PROGRESS REPORT spreadsheet: PO Line No, Description, WBS No, Weight Factor, Previous/Current/Cumulative %. Not a Berita Acara.",
  sertifikat_badan_usaha:
    "Indonesian Sertifikat Badan Usaha (SBU) Konstruksi / PB-UMKU with Garuda emblem, NIB, KBLI. Not IUJK.",
  izin_usaha_jasa_konstruksi:
    "Izin Usaha Jasa Konstruksi Nasional with Nomor IUJK, Nama Perusahaan, NPWP. Not SBU.",
};

export function resolveMockupDocumentConfig(docName) {
  const categoryId =
    DISPLAY_NAME_TO_CANONICAL_SLUG[docName] || mockupSlugify(docName) || "unclassified";
  return {
    categoryId,
    categoryLabel: docName,
    enabled: true,
    // Fallback catalog only. Posted invoiceTypeCatalog from Invoice Config
    // is the source of extract hard-stop (mandatory + BLOCK).
    mandatory: false,
    splitBehavior: mockupSplitBehavior(docName),
    classificationHints:
      IDENTIFIERS_BY_SLUG[categoryId] || CIVIL_IDENTIFIERS[categoryId] || "",
  };
}

/**
 * Full invoice-type catalog from the mockup Document Types + Invoice Category tabs.
 */
export function buildMockupInvoiceTypeCatalog() {
  const invoiceTypes = [];

  for (const [categoryName, subtypes] of Object.entries(MOCKUP_CATEGORIES)) {
    for (const [subtype, documents] of Object.entries(subtypes)) {
      const typeConfig = MOCKUP_TYPE_CONFIGS[subtype];
      if (!typeConfig) continue;
      invoiceTypes.push({
        invoiceTypeId: typeConfig.invoiceTypeId,
        name: subtype,
        category: categoryName,
        poSeries: [...typeConfig.poSeries],
        contentSignals: typeConfig.contentSignals,
        documents: documents.map((docName) => resolveMockupDocumentConfig(docName)),
      });
    }
  }

  return {
    confidenceThreshold: 0.7,
    lowConfidenceAction: "manual_review",
    invoiceTypes,
  };
}
