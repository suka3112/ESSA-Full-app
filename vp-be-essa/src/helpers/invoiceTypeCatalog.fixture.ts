/**
 * Overlay defaults for the invoice-type catalog posted to ocr-demo.
 *
 * Document lists, slugify, and split defaults come from
 * ocr-demo/prompt-builder-mockup.html (Document Types + Invoice Category tabs).
 * Canonical categoryId slugs for existing ESSA types match
 * CLASSIFICATION_CATEGORIES in documentFieldSchemas.js.
 */

export const INVOICE_TYPE_CATALOG_GLOBALS = {
  confidenceThreshold: 0.7,
  lowConfidenceAction: "manual_review" as const,
};

export type CatalogSplitBehavior = "contiguous" | "scattered";

export type InvoiceTypeResolutionDefaults = {
  poSeries: string[];
  contentSignals: string;
};

export type DocumentClassificationDefaults = {
  categoryId: string;
  splitBehavior: CatalogSplitBehavior;
  classificationHints: string;
};

/**
 * prompt-builder-mockup.html CATEGORIES — document names per invoice type.
 * Keys are invoice type codes used across the extract contract.
 */
export const MOCKUP_DOCUMENTS_BY_TYPE: Record<string, string[]> = {
  MANPOWER_SERVICES: [
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
  CIVIL_CONTRACTOR: [
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
  MATERIAL_IMPORT: [
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
  CAMP_SERVICE_AND_CATERING: [
    "Invoice",
    "Tax Invoice (VAT)",
    "Work Progress Certificate (Berita Acara)",
    "Proforma Invoice",
    "Attendance Statistics Table",
    "Monthly Meal Summary (PoB Report)",
    "PO",
    "PO Appendix",
  ],
  NON_PO: [
    "Invoice",
    "Listing Invoices (If any)",
    "Tax Invoice",
    "Underlying Contract",
    "Guarantee Letter (If any)",
    "Room Reservation Form (If any)",
    "Work Progress Certificate (Berita Acara)",
  ],
};

export const INVOICE_TYPE_RESOLUTION_DEFAULTS: Record<
  string,
  InvoiceTypeResolutionDefaults
> = {
  MANPOWER_SERVICES: {
    poSeries: ["4203"],
    contentSignals:
      "Manpower supply, welding/fabrication activity, headcount-based billing, manpower roles referenced (Welder, Fitter, Helper), manhour/timesheet language.",
  },
  CIVIL_CONTRACTOR: {
    poSeries: ["4203"],
    contentSignals:
      "Construction/civil work progress claim (not manpower timesheets). WBS stages such as Infrastructure, Sport Hall, Shared Block; Contract Value / Retention / Advance Payment Recovery; Work Progress Certificate with Work Package STR/ARS/MEP; Sertifikat Badan Usaha or Izin Usaha Jasa Konstruksi; vendors such as PT Berca Buana Sakti.",
  },
  MATERIAL_IMPORT: {
    poSeries: ["4201", "4202"],
    contentSignals: "",
  },
  CAMP_SERVICE_AND_CATERING: {
    poSeries: ["4203"],
    contentSignals:
      "Catering/meal service language, meal counts by type (breakfast, lunch, dinner, supper), attendance/headcount at a camp or site facility.",
  },
  NON_PO: {
    poSeries: [],
    contentSignals: "",
  },
};

const HINTS = {
  invoice:
    "Commercial invoice titled INVOICE (large heading), Inv No like 568/PT.ALE-PAU/04/2026, Date, Payment Terms, claim line-item table, VAT, Grand Total, bank details. One page near the start. NOT a Kwitansi and NOT a Faktur Pajak.",
  notice:
    "Payment receipt titled KWITANSI / Receipt with Sudah Terima Dari, Untuk Pembayaran, amount in words, and a received stamp. Usually page 1. Do NOT classify as invoice even when it shows the same PO and amount.",
  fakturPajak:
    "Indonesian Faktur Pajak / e-Faktur with DJP logo, QR code, Kode dan Nomor Seri Faktur Pajak, DPP and PPN. Not the commercial invoice even when that invoice shows VAT/PPN, and not a kwitansi.",
  beritaAcara:
    "Page titled Berita Acara / Work Progress Certificate / BAP, or a 4-block approval grid (Prepared, Reviewed, Acknowledged, Approved). A PO number, period, or manhours on an invoice or manhour summary is NOT Berita Acara.",
  transmittal:
    "Cover page titled TRANSMITTAL NOTE listing enclosed documents (Inv No, Progress N). Sender/To/Attention/From, 'This is sent for' checkboxes, document table with Remarks (Original). Usually page 1. Not an invoice.",
  noticeLetter:
    "Formal letter titled RECEIPT (Kwitansi-style with Received From and amount in words) OR 'Notice of Total Value for … Progress Claim' with Payment Details (Contract Value, Progress %, DP, Retention, WHT, VAT, Payable Amount). Not the commercial invoice and not a Faktur Pajak.",
  monthlyProgress:
    "Landscape MONTHLY PROGRESS REPORT spreadsheet: PO Line No, Description, WBS No, Original Contract Unit Price / Weight Factor, Previous/Current/Cumulative %, billing columns. Construction stages (Preliminaries, Infrastructure, Sport Hall, Shared Block). Not a Berita Acara and not an invoice.",
  sbu:
    "Indonesian Sertifikat Badan Usaha (SBU) Konstruksi / PB-UMKU with Garuda emblem, NIB, KBLI code, LPJK. Government certificate, not a commercial invoice and not IUJK.",
  iujk:
    "Izin Usaha Jasa Konstruksi Nasional with Nomor IUJK, Nama Perusahaan, NPWP, Klasifikasi Bidang. Issued by PTSP / local government. Not SBU.",
  summaryManhour:
    "Summary of Claim / Summary Calculation Manhour / Nth Claim tables after Berita Acara: Regular/Overtime hours, worker names, contract value, previous vs this-period claim. NOT an invoice.",
  dailyTimesheet:
    "Landscape DAILY TIME SHEET grid with Date, IN/OUT, Sign Workers, Daily Activity, Approved by. A PO number in the header does NOT make this a purchase order. Most middle pages of a manpower bundle are this type.",
  dailyAttendance:
    "Biometric log: Face Finger / Fabrication Report / authentication screenshot with Date, Username, Event (check-in/out). Interleaved with timesheets. NOT a daily time sheet.",
  purchaseOrder:
    "Formal PURCHASE ORDER cover page (title PURCHASE ORDER, PO Number, PO Date, vendor). Requisition No is optional. Usually one scanned page immediately before Appendix - 1. NOT a timesheet and NOT a PO appendix.",
  poAppendix:
    "Pages headed Appendix - 1/2/3, PRICE BREAKDOWN AND DESCRIPTION OF PURCHASE ORDER, SPECIFIC/SPECIAL TERMS, or GENERAL TERMS & CONDITIONS. Often the last 8–12 pages. Repeating PO Number/PO Date still means purchase_order_appendix.",
};

/** Keyed by AP_EXTRACTION_DOCUMENT.Code */
export const DOCUMENT_CLASSIFICATION_DEFAULTS: Record<
  string,
  DocumentClassificationDefaults
> = {
  INVOICE: {
    categoryId: "invoice",
    splitBehavior: "contiguous",
    classificationHints: HINTS.invoice,
  },
  NOTICE: {
    categoryId: "notice",
    splitBehavior: "contiguous",
    classificationHints: HINTS.notice,
  },
  KWITANSI: {
    categoryId: "notice",
    splitBehavior: "contiguous",
    classificationHints: HINTS.notice,
  },
  TAX_INVOICE_VAT: {
    categoryId: "faktur_pajak",
    splitBehavior: "contiguous",
    classificationHints: HINTS.fakturPajak,
  },
  TAX_INVOICE: {
    categoryId: "faktur_pajak",
    splitBehavior: "contiguous",
    classificationHints: HINTS.fakturPajak,
  },
  BERITA_ACARA: {
    categoryId: "berita_acara",
    splitBehavior: "contiguous",
    classificationHints: HINTS.beritaAcara,
  },
  SUMMARY_CALCULATION_MANHOUR: {
    categoryId: "summary_calculation_manhour",
    splitBehavior: "scattered",
    classificationHints: HINTS.summaryManhour,
  },
  DAILY_TIME_SHEET: {
    categoryId: "daily_timesheet",
    splitBehavior: "scattered",
    classificationHints: HINTS.dailyTimesheet,
  },
  DAILY_ATTENDANCE: {
    categoryId: "daily_attendance",
    splitBehavior: "scattered",
    classificationHints: HINTS.dailyAttendance,
  },
  PO: {
    categoryId: "purchase_order",
    splitBehavior: "contiguous",
    classificationHints: HINTS.purchaseOrder,
  },
  PURCHASE_ORDER: {
    categoryId: "purchase_order",
    splitBehavior: "contiguous",
    classificationHints: HINTS.purchaseOrder,
  },
  PO_APPENDIX: {
    categoryId: "purchase_order_appendix",
    splitBehavior: "scattered",
    classificationHints: HINTS.poAppendix,
  },
  SES: {
    categoryId: "service_entry_sheet",
    splitBehavior: "contiguous",
    classificationHints: "Service Entry Sheet (SES) with header info and quantity",
  },
  NOTICE_LETTER: {
    categoryId: "notice_letter",
    splitBehavior: "contiguous",
    classificationHints: HINTS.noticeLetter,
  },
  TRANSMITTAL: {
    categoryId: "transmittal",
    splitBehavior: "contiguous",
    classificationHints: HINTS.transmittal,
  },
  MONTHLY_PROGRESS_REPORT: {
    categoryId: "monthly_progress_report",
    splitBehavior: "contiguous",
    classificationHints: HINTS.monthlyProgress,
  },
  SERTIFIKAT_BADAN_USAHA: {
    categoryId: "sertifikat_badan_usaha",
    splitBehavior: "scattered",
    classificationHints: HINTS.sbu,
  },
  IZIN_USAHA_JASA_KONSTRUKSI: {
    categoryId: "izin_usaha_jasa_konstruksi",
    splitBehavior: "contiguous",
    classificationHints: HINTS.iujk,
  },
  LOGISTICS_INVOICE: {
    categoryId: "logistics_invoice",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  COMMERCIAL_INVOICE: {
    categoryId: "commercial_invoice",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  PACKING_SLIP: {
    categoryId: "packing_slip",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  EMAIL_NOTIFICATION: {
    categoryId: "email_notification",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  BILL_OF_LADING_AWB: {
    categoryId: "bill_of_lading_awb",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  PACKING_LIST: {
    categoryId: "packing_list",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  PROFORMA_INVOICE: {
    categoryId: "proforma_invoice",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  ATTENDANCE_STATISTICS_TABLE: {
    categoryId: "attendance_statistics_table",
    splitBehavior: "scattered",
    classificationHints: "",
  },
  MONTHLY_MEAL_SUMMARY: {
    categoryId: "monthly_meal_summary",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  LISTING_INVOICES: {
    categoryId: "listing_invoices",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  UNDERLYING_CONTRACT: {
    categoryId: "underlying_contract",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  GUARANTEE_LETTER: {
    categoryId: "guarantee_letter",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
  ROOM_RESERVATION_FORM: {
    categoryId: "room_reservation_form",
    splitBehavior: "contiguous",
    classificationHints: "",
  },
};

/** Same as prompt-builder-mockup.html slugify — strips parentheticals first. */
export function mockupSlugify(docName: string): string {
  return (
    String(docName || "")
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unclassified"
  );
}

const SCATTERED_HINTS = [
  "daily time sheet",
  "daily attendance",
  "summary calculation manhour",
  "po appendix",
  "sertifikat badan usaha",
];

export function mockupSplitBehavior(docName: string): CatalogSplitBehavior {
  const lower = String(docName || "").toLowerCase();
  return SCATTERED_HINTS.some((hint) => lower.includes(hint))
    ? "scattered"
    : "contiguous";
}

export function slugifyCategoryId(value: string): string {
  return mockupSlugify(value);
}

const DISPLAY_NAME_TO_CODE: Record<string, string> = {
  invoice: "INVOICE",
  "notice (kwitansi)": "NOTICE",
  kwitansi: "KWITANSI",
  notice: "NOTICE",
  "tax invoice (vat)": "TAX_INVOICE_VAT",
  "tax invoice": "TAX_INVOICE",
  "work progress certificate (berita acara)": "BERITA_ACARA",
  "summary calculation manhour (monthly man-days summary)":
    "SUMMARY_CALCULATION_MANHOUR",
  "daily time sheet": "DAILY_TIME_SHEET",
  "daily attendance (biometrics)": "DAILY_ATTENDANCE",
  po: "PO",
  "po appendix": "PO_APPENDIX",
  transmittal: "TRANSMITTAL",
  "notice letter": "NOTICE_LETTER",
  "monthly progress report": "MONTHLY_PROGRESS_REPORT",
  "sertifikat badan usaha": "SERTIFIKAT_BADAN_USAHA",
  "izin usaha jasa konstruksi": "IZIN_USAHA_JASA_KONSTRUKSI",
  "logistics invoice": "LOGISTICS_INVOICE",
  "commercial invoice": "COMMERCIAL_INVOICE",
  "packing slip": "PACKING_SLIP",
  "email notification": "EMAIL_NOTIFICATION",
  "bill of lading / awb": "BILL_OF_LADING_AWB",
  "packing list": "PACKING_LIST",
  "proforma invoice": "PROFORMA_INVOICE",
  "attendance statistics table": "ATTENDANCE_STATISTICS_TABLE",
  "monthly meal summary (pob report)": "MONTHLY_MEAL_SUMMARY",
  "listing invoices (if any)": "LISTING_INVOICES",
  "underlying contract": "UNDERLYING_CONTRACT",
  "guarantee letter (if any)": "GUARANTEE_LETTER",
  "room reservation form (if any)": "ROOM_RESERVATION_FORM",
};

export function resolveDocumentClassificationDefaults(
  documentCode: string,
  documentName: string,
): DocumentClassificationDefaults {
  const code = String(documentCode || "").trim().toUpperCase();
  if (code && DOCUMENT_CLASSIFICATION_DEFAULTS[code]) {
    return DOCUMENT_CLASSIFICATION_DEFAULTS[code];
  }
  const name = String(documentName || documentCode || "").trim();
  const mappedCode = DISPLAY_NAME_TO_CODE[name.toLowerCase()];
  if (mappedCode && DOCUMENT_CLASSIFICATION_DEFAULTS[mappedCode]) {
    return DOCUMENT_CLASSIFICATION_DEFAULTS[mappedCode];
  }
  return {
    categoryId: mockupSlugify(name),
    splitBehavior: mockupSplitBehavior(name),
    classificationHints: "",
  };
}

export function buildMockupDocumentsForType(invoiceTypeId: string): Array<{
  categoryId: string;
  categoryLabel: string;
  enabled: boolean;
  mandatory: boolean;
  splitBehavior: CatalogSplitBehavior;
  classificationHints: string;
}> {
  const names = MOCKUP_DOCUMENTS_BY_TYPE[invoiceTypeId] || [];
  return names.map((name) => {
    const defaults = resolveDocumentClassificationDefaults("", name);
    return {
      categoryId: defaults.categoryId,
      categoryLabel: name,
      enabled: true,
      // Extract hard-stop is owned by Invoice Config (mandatory + BLOCK).
      mandatory: false,
      splitBehavior: defaults.splitBehavior,
      classificationHints: defaults.classificationHints,
    };
  });
}
