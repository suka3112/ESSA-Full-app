/**
 * Civil Contractor (PO) seed payload mapped from the Berca Buana Sakti
 * progress-claim bundle:
 * "Civil Contractor_PT BERCA BUANA SAKTI.pdf"
 *
 * Typical order: Transmittal → cover letter → Invoice (progress claim) →
 * Receipt → Faktur Pajak → Notice of Progress Claim + Payment Details →
 * Work Progress Certificate → Monthly Progress Report (WBS) → IUJK / SBU →
 * PO cover + PO Appendix (GTC).
 */
import { enrichPromptWithDocumentRules } from "./nonPoOcrDemoHints";

export type CivilFieldSeed = {
  fieldName: string;
  displayName: string;
  hint: string;
};

export type CivilDocumentSeed = {
  documentCode: string;
  documentName: string;
  isEnabled: boolean;
  ocrCategoryId: string;
  splitBehavior: "contiguous" | "scattered";
  classificationHints: string;
  fields: CivilFieldSeed[];
  documentRules?: string;
};

const TRANSMITTAL_HINTS =
  "Cover page titled TRANSMITTAL NOTE listing enclosed documents (Inv No, Progress N End <date>). Sender / To / Attention / From, 'This is sent for' checkboxes (Your File, Approval, …), document table with Remarks (Original). Usually page 1. Not an invoice and not a receipt.";

const INVOICE_HINTS =
  "Progress-claim commercial invoice (not a manpower timesheet invoice). Inv No like 052/20304G/V/2026, Contract Value, Work to carried out this period %, Less previously payment, Advance Payment Recovery, Retention, VAT, Total Payment, bank details. Often follows a cover letter with Our Ref. NOT a transmittal, NOT a Faktur Pajak, NOT the landscape MONTHLY PROGRESS REPORT spreadsheet.";

const NOTICE_LETTER_HINTS =
  "Either (1) RECEIPT / Kwitansi-style page with Received From, amount in words, bank details, and a meterai; or (2) formal letter 'Notice of Total Value for … Progress Claim' plus a Payment Details table (Contract Value, Progress %, DP, Retention, WHT, VAT, Payable Amount). Not the commercial invoice progress-claim table and not a Faktur Pajak.";

const TAX_INVOICE_HINTS =
  "Indonesian Faktur Pajak / e-Faktur with DJP logo, QR code, Kode dan Nomor Seri Faktur Pajak, DPP, PPN, and Referensi Invoice No. Not the commercial invoice and not a receipt.";

const BERITA_ACARA_HINTS =
  "Work Progress Certificate / Berita Acara Kemajuan Pekerjaan with Certificate No (e.g. BNF1-PMT-GEN-BA-1002), Contract Number (e.g. 0032/AG/PAU-EXT/2025), Work Package (STR, ARS, MEP), reporting period, Previous / This Period / Cumulative % table, and a multi-block approval grid. Not the landscape monthly progress spreadsheet.";

const MONTHLY_PROGRESS_HINTS =
  "Landscape MONTHLY PROGRESS REPORT spreadsheet: PO Line No, Description, WBS No, Original Contract Unit Price / Weight Factor, Previous/Current/Cumulative %, Previous/Current/Cumulative bill. Construction stages (Preliminaries, Infrastructure, Sport Hall, Shared Block). Not a Berita Acara certificate and not an invoice.";

const SBU_HINTS =
  "Indonesian Sertifikat Badan Usaha (SBU) Konstruksi / PB-UMKU with Garuda emblem, NIB, KBLI code, LPJK registration. Multi-page government certificates plus lampiran. Not a commercial invoice and not IUJK.";

const IUJK_HINTS =
  "Izin Usaha Jasa Konstruksi Nasional with Nomor IUJK, Nama Perusahaan, NPWP, Klasifikasi Bidang. Issued by PTSP / local government. Usually 2 pages (license + klasifikasi lampiran). Not SBU.";

const TRANSMITTAL_RULES = `
Civil contractor TRANSMITTAL NOTE (PT. Berca Buana Sakti style):

- date — transmittal Date (e.g. 5-May-26).
- vendorName — sender company letterhead (PT. Berca Buana Sakti).
- buyerName — To company (PT. PANCA AMARA UTAMA).
- attention — Attention line (e.g. Bapak Teguh Yudakusumah).
- fromName — From line (e.g. Dwi Wardoyo).
- purpose — checked "This is sent for" box (Your File / Approval / Information / Other).
- invNo — invoice number listed in the Document table (e.g. 052/20304G/V/2026).
- progressDescription — claim label under the invoice (e.g. Progress 2 End 8 March 2026).
- receivedBy / receivedDate — handwritten receipt block at the bottom.

transmittalItems — one row per Document/Remarks line (description, remarks e.g. Original).
`.trim();

const INVOICE_RULES = `
Civil contractor progress-claim INVOICE (Berca / BAP New Facility Phase-1):

General:
- Scan letterhead, bill-to, description/amount table, totals, bank, signature.
- This is a PO/contract progress claim — extract contractNumber AND poNumber when printed.
- Preserve thousand separators (e.g. "4.427.221.460"). Never invent values.
- A cover letter may precede this page (Our Ref, subject "Invoice for Progress N", amount in words) — use it only if THIS invoice page is missing a field.

Header:
- invNo — Invoice / Claim No (e.g. 052/20304G/V/2026). Never the Faktur Pajak serial.
- date — invoice DATE (e.g. 4-May-26).
- ourRef — "Our Ref" (e.g. BBS/PAU/Com/V/2026/003).
- vendorName / vendorAddress / vendorTaxId — contractor letterhead / NPWP.
- buyerName — bill-to / Attention company (PT. Panca Amara Utama).
- poNumber — SAP PO (10 digits starting 4203) when a labeled PO Number is printed; else null.
- contractNumber — construction contract no (e.g. 0032/AG/PAU-EXT/2025). Do NOT copy this into poNumber unless it is a 4203 SAP PO.
- projectName — e.g. New Facility Construction Work Phase - 1 / BAP New Facilities Phase 1.
- progressDescription — "Progress 2 End 8 March 2026".
- serviceName — work title (construction / civil scope).
- currency — IDR.
- contractValue — Original contract value excl. VAT (e.g. 102.500.000.000).
- thisPeriodWorkValue — "Work to carried out" / current claim gross (before DP/retention).
- thisPeriodProgressPct — current period % (e.g. 9.456% cumulative vs 5.188% this period — use the % printed on the current-claim row).
- previousPayment — "Less Sums previously Payment".
- previousProgressPct — previous % printed on that row.
- advancePaymentRecovery — DP recovery amount (often 15% of this-period work).
- retention / retentionPct — retention amount and % (often 10%).
- totalValueOfWorksDue — "Total Value of Works due this Claim" (before VAT).
- subtotal / vatAmount / grandTotal — VAT 11% and Total Payment (incl. VAT).
- amountInWords — amount in words.
- paymentTerms — when printed.
- bankName, bankAccountNumber, bankAccountName — remittance block
  (e.g. BANK RAKYAT INDONESIA / 037601001206303 / PT. BERCA BUANA SAKTI).
- authorizedSignatory — e.g. Petrus Rudy Nilayanto.

LINE ITEMS (invoiceLineItems + mirror lineItems):
- One row per printed description/amount line in top-to-bottom order.
- Typical rows: Contract Value, Work to carried out, Less previously payment,
  Advance Payment Recovery, Retention, Total Value of Works due this Claim.
- Keys: description, quantity (or percentage), unit, unitPrice, amount.
- Do NOT include VAT / Total Payment / Grand Total as line items — those are header totals.
`.trim();

const NOTICE_LETTER_RULES = `
Civil contractor Notice Letter covers TWO page styles in Berca bundles:

A) RECEIPT (Kwitansi-style):
- receiptNo / invNo — "No :" (often same as invoice no 052/20304G/V/2026).
- vendorTaxId — NPWP on the receipt.
- receivedFrom / buyerName — PT. Panca Amara Utama.
- grandTotal / amountInWords — Rp amount received.
- progressDescription, projectName, bank* fields, authorizedSignatory.

B) Notice of Total Value for Nth Progress Claim + Payment Details table:
- ourRef — e.g. 0018/LT/BBS-BAP/2026.
- date, vendorName, buyerName, attention, projectName, subject.
- previousProgressPct / previousProgressValue / settledAmount.
- thisPeriodProgressPct.
- payableAmount / amountInWords (e.g. Rp 3.886.011.207).
- contractValue, downPaymentPct, downPaymentAmount, retentionPct, retention,
  totalValueOfWorksDue, whtPct, whtAmount, netPayment, vatAmount, totalPayment,
  adjustmentAmount (Progress 1 difference).
- authorizedSignatory — Project Manager (e.g. Syarifuddin Ahmadi).

Do not treat this as the commercial invoice even when amounts overlap.
`.trim();

const TAX_INVOICE_RULES = `
Faktur Pajak in civil progress-claim bundles:
- taxInvoiceNumber — Kode dan Nomor Seri Faktur Pajak (15–17 digit e-Faktur). Not invNo.
- date — Tempat dan Tanggal Ditandatangani (date portion), e.g. 04 Mei 2026.
- vendorName / vendorAddress / vendorTaxId — Pengusaha Kena Pajak.
- buyerName / buyerTaxId — Pembeli.
- description — Nama Barang/Jasa (Progress N … project).
- dppAmount — Dasar Pengenaan Pajak (NOT the full contract value).
- advancePaymentReceived — Uang Muka yang telah diterima when printed.
- vatAmount — Jumlah PPN.
- referensiInvoiceNo — Referensi: Invoice No. …
`.trim();

const BERITA_ACARA_RULES = `
Work Progress Certificate / Berita Acara Kemajuan Pekerjaan (civil, not manpower):

- certificateNumber — Certificate No (e.g. BNF1-PMT-GEN-BA-1002). Never use as poNumber.
- date — Certificate Date (e.g. 15-Apr-26).
- projectName — e.g. BAP New Facilities Phase 1.
- contractNumber — Contract Number (e.g. 0032/AG/PAU-EXT/2025).
- poNumber — SAP 4203 PO only if a labeled PO Number is printed; else null.
  Do NOT copy contractNumber into poNumber.
- workPackage — STR, ARS, MEP (or as printed).
- contractDate — Contract Date.
- workLocation — e.g. BANGGAI - SULAWESI TENGAH.
- periodStart / periodEnd — Reporting Period (e.g. 9 Februari - 8 March 2026).
- vendorName — Contractor (PT Berca Buana Sakti).
- buyerName — Client (PT PANCA AMARA UTAMA).
- previousPeriodProgress — Previous Period % (e.g. 4,267 %).
- thisPeriodProgress — This Period % (e.g. 5,188 %). Also copy to manhourPercentageCompletion.
- cumulativeProgress — Cumulative % (e.g. 9,456 %).
- approvalPrepared / approvalReviewed / approvalAcknowledged / approvalApproved —
  names from the approval grid (may list several names per block; join with "; ").

Do NOT extract WBS line-item rows here — those belong on Monthly Progress Report.
`.trim();

const MONTHLY_PROGRESS_RULES = `
MONTHLY PROGRESS REPORT (landscape WBS spreadsheet):

HEADER:
- projectName, periodStart, periodEnd, vendorName, buyerName.
- contractValue — TOTAL Original Contract Unit Price (e.g. 102.500.000.000).
- previousProgressPct / thisPeriodProgressPct / cumulativeProgressPct — TOTAL row %.
- previousBill / currentBill / cumulativeBill — TOTAL billing columns.

progressLineItems — one row per printed WBS line (including parent stages and children):
- poLineNo (1, 2.1, 3.1, …)
- description (Preliminaries & Preparation Work, Road & Drain, Sport Hall Structure Work, …)
- wbsNo (WBS-01, WBS-02-01, …)
- unitPrice (Original Contract)
- weightFactor
- previousPct, currentPct, cumulativePct
- previousBill, currentBill, cumulativeAmount

Extract every row in printed order. Skip nothing. TOTAL footer → header totals, not a line.
`.trim();

const SBU_RULES = `
Sertifikat Badan Usaha (SBU) Konstruksi / PB-UMKU:

- certificateNumber / pbUmku — NOMOR / PB-UMKU.
- vendorName — Nama Pelaku Usaha.
- nib — Nomor Induk Berusaha.
- officeAddress, investmentStatus (PMDN/PMA).
- kbliCode / kbliDescription — Kode KBLI and title.
- businessLocation, issueDate, validUntil.
- npwp, lpjkRegistrationNumber, qualification (Besar / …).
- responsiblePerson (PJBU), technicalPerson (PJTBU).

classifications — one row per kualifikasi/subklasifikasi lampiran line:
kodeSubklas, sifat, kbliCode, subclassificationName, pjskbuName.
`.trim();

const IUJK_RULES = `
Izin Usaha Jasa Konstruksi Nasional (IUJK):

- licenseNumber — NOMOR IUJK.
- vendorName, vendorAddress, phone, responsiblePerson, netWorth, npwp.
- businessCategory — e.g. PELAKSANA KONSTRUKSI (KONTRAKTOR).
- issueDate, validUntil (or "selama SBU berlaku").
- issuingAuthority.

classifications — lampiran rows: bidang, subKlasifikasi, kode, kualifikasi.
`.trim();

const PO_RULES = `
Purchase Order in the civil bundle:
- poNumber REQUIRED when this page is a SAP PURCHASE ORDER cover (420x…).
  Never use invoice no, BA certificate no, IUJK no, or contract 0032/AG/… as poNumber.
- poDate, vendorName (To), vendorCode, buyerName (issuer), projectName,
  description, deliveryDate, paymentTerms, incoterms, currency,
  totalAmount / poValue from THIS PO only.
- poLineItems: no, description, qty, uom, unitPrice, amount.
`.trim();

const PO_APPENDIX_RULES = `
PO Appendix in civil bundles (price breakdown / special terms / GTC):
- poHeaderInformation — PO context / number.
- appendixItems — description, qty, uom, unitPrice, amount per schedule row.
  Civil appendices are construction BoQ / terms, NOT manpower role rates.
`.trim();

function field(
  fieldName: string,
  label: string,
  aliases: string[] = [],
): CivilFieldSeed {
  const aliasNote = aliases.length ? `Aliases: ${aliases.join(", ")}` : "";
  return {
    fieldName,
    displayName: label,
    hint: aliasNote,
  };
}

/** Documents under Civil Contractor (code CIVIL_CONTRACTOR). */
export const CIVIL_CONTRACTOR_OCR_DEMO_DOCUMENTS: CivilDocumentSeed[] = [
  {
    documentCode: "TRANSMITTAL",
    documentName: "Transmittal",
    isEnabled: true,
    ocrCategoryId: "transmittal",
    splitBehavior: "contiguous",
    classificationHints: TRANSMITTAL_HINTS,
    documentRules: TRANSMITTAL_RULES,
    fields: [
      field("date", "Transmittal Date"),
      field("vendorName", "From company", ["PT. Berca Buana Sakti"]),
      field("buyerName", "To company", ["PT. PANCA AMARA UTAMA"]),
      field("attention", "Attention"),
      field("fromName", "From person"),
      field("purpose", "Sent for", ["Your File", "Approval"]),
      field("invNo", "Enclosed invoice no", ["052/20304G"]),
      field("progressDescription", "Progress label", ["Progress 2 End"]),
      field("receivedBy", "Received by"),
      field("receivedDate", "Received date"),
      field("transmittalItems", "Enclosed documents", ["document", "remarks", "Original"]),
    ],
  },
  {
    documentCode: "INVOICE",
    documentName: "Invoice",
    isEnabled: true,
    ocrCategoryId: "invoice",
    splitBehavior: "contiguous",
    classificationHints: INVOICE_HINTS,
    documentRules: INVOICE_RULES,
    fields: [
      field("invNo", "Invoice / Claim No", ["052/20304G/V/2026"]),
      field("date", "Invoice Date"),
      field("ourRef", "Our Ref", ["BBS/PAU/Com"]),
      field("vendorName", "Vendor Name", ["PT Berca Buana Sakti"]),
      field("vendorAddress", "Vendor Address"),
      field("vendorTaxId", "Vendor Tax ID", ["npwp"]),
      field("buyerName", "Buyer Name", ["PT. Panca Amara Utama", "MESSRS"]),
      field("poNumber", "SAP PO Number", ["4203 — only if labeled PO Number"]),
      field("contractNumber", "Contract Number", ["0032/AG/PAU-EXT"]),
      field("projectName", "Project Name", ["New Facility Construction", "BAP"]),
      field("progressDescription", "Progress / claim label", ["Progress 2 End 8 March 2026"]),
      field("serviceName", "Service / work title"),
      field("currency", "Currency", ["IDR", "Rp"]),
      field("contractValue", "Contract Value (excl. VAT)"),
      field("thisPeriodWorkValue", "Work to carried out this period"),
      field("thisPeriodProgressPct", "This period / current claim %"),
      field("previousPayment", "Less sums previously paid"),
      field("previousProgressPct", "Previous progress %"),
      field("advancePaymentRecovery", "Advance payment / DP recovery"),
      field("retention", "Retention amount"),
      field("retentionPct", "Retention %", ["10%"]),
      field("totalValueOfWorksDue", "Total value of works due this claim"),
      field("subtotal", "Subtotal (before VAT)"),
      field("vatAmount", "VAT Amount", ["ppn", "vat 11%"]),
      field("grandTotal", "Total Payment / Grand Total"),
      field("amountInWords", "Amount in words"),
      field("paymentTerms", "Payment Terms"),
      field("bankName", "Bank Name", ["BANK RAKYAT INDONESIA"]),
      field("bankAccountNumber", "Bank Account Number"),
      field("bankAccountName", "Bank Account Name", ["atas nama"]),
      field("authorizedSignatory", "Authorized Signatory"),
      field("invoiceLineItems", "Progress-claim lines", [
        "description",
        "quantity",
        "percentage",
        "amount",
        "Contract Value",
        "Retention",
        "Advance Payment Recovery",
      ]),
    ],
  },
  {
    documentCode: "NOTICE_LETTER",
    documentName: "Notice Letter",
    isEnabled: true,
    ocrCategoryId: "notice_letter",
    splitBehavior: "contiguous",
    classificationHints: NOTICE_LETTER_HINTS,
    documentRules: NOTICE_LETTER_RULES,
    fields: [
      field("ourRef", "Our Ref / letter no", ["0018/LT/BBS-BAP"]),
      field("receiptNo", "Receipt No", ["same as inv no when RECEIPT"]),
      field("invNo", "Related invoice no"),
      field("date", "Letter / receipt date"),
      field("vendorName", "Vendor Name"),
      field("vendorTaxId", "Vendor Tax ID", ["npwp"]),
      field("buyerName", "Buyer / Received From"),
      field("attention", "Attention"),
      field("projectName", "Project Name"),
      field("subject", "Subject", ["Notice of Total Value"]),
      field("progressDescription", "Progress label"),
      field("previousProgressPct", "Previous progress %"),
      field("previousProgressValue", "Previous progress value"),
      field("thisPeriodProgressPct", "This period progress %"),
      field("contractValue", "Contract Value"),
      field("downPaymentPct", "DP %", ["15%"]),
      field("downPaymentAmount", "DP / advance recovery amount"),
      field("retentionPct", "Retention %"),
      field("retention", "Retention amount"),
      field("totalValueOfWorksDue", "Total value of works"),
      field("whtPct", "WHT %", ["2,65%"]),
      field("whtAmount", "WHT amount"),
      field("netPayment", "Net payment"),
      field("vatAmount", "VAT Amount"),
      field("totalPayment", "Total payment (incl. VAT)"),
      field("adjustmentAmount", "Prior-progress adjustment"),
      field("payableAmount", "Payable amount"),
      field("grandTotal", "Receipt amount"),
      field("amountInWords", "Amount in words"),
      field("bankName", "Bank Name"),
      field("bankAccountNumber", "Bank Account Number"),
      field("bankAccountName", "Bank Account Name"),
      field("authorizedSignatory", "Authorized Signatory"),
    ],
  },
  {
    documentCode: "TAX_INVOICE",
    documentName: "Tax Invoice",
    isEnabled: true,
    ocrCategoryId: "faktur_pajak",
    splitBehavior: "contiguous",
    classificationHints: TAX_INVOICE_HINTS,
    documentRules: TAX_INVOICE_RULES,
    fields: [
      field("taxInvoiceNumber", "Tax Invoice Number", [
        "kode dan nomor seri faktur pajak",
      ]),
      field("date", "Tax Invoice Date", ["tempat dan tanggal ditandatangani"]),
      field("vendorName", "Seller name"),
      field("vendorAddress", "Seller address"),
      field("vendorTaxId", "Seller NPWP"),
      field("buyerName", "Buyer name"),
      field("buyerTaxId", "Buyer NPWP"),
      field("dppAmount", "DPP / tax base", ["dasar pengenaan pajak"]),
      field("advancePaymentReceived", "Uang muka yang telah diterima"),
      field("vatAmount", "VAT Amount", ["jumlah ppn"]),
      field("referensiInvoiceNo", "Referensi Invoice No"),
    ],
  },
  {
    documentCode: "BERITA_ACARA",
    documentName: "Work Progress Certificate (Berita Acara)",
    isEnabled: true,
    ocrCategoryId: "berita_acara",
    splitBehavior: "contiguous",
    classificationHints: BERITA_ACARA_HINTS,
    documentRules: BERITA_ACARA_RULES,
    fields: [
      field("certificateNumber", "Certificate No", ["BNF1-PMT-GEN-BA"]),
      field("date", "Certificate Date"),
      field("projectName", "Project Name", ["BAP New Facilities"]),
      field("contractNumber", "Contract Number", ["0032/AG/PAU-EXT"]),
      field("poNumber", "SAP PO Number — null unless labeled 4203"),
      field("workPackage", "Work Package", ["STR", "ARS", "MEP"]),
      field("contractDate", "Contract Date"),
      field("workLocation", "Work Location", ["Banggai"]),
      field("periodStart", "Period Start"),
      field("periodEnd", "Period End"),
      field("vendorName", "Contractor"),
      field("buyerName", "Client"),
      field("previousPeriodProgress", "Previous Period %"),
      field("thisPeriodProgress", "This Period %"),
      field("manhourPercentageCompletion", "This Period % (same as thisPeriodProgress)"),
      field("cumulativeProgress", "Cumulative %"),
      field("approvalPrepared", "Approval - Prepared"),
      field("approvalReviewed", "Approval - Reviewed"),
      field("approvalAcknowledged", "Approval - Acknowledged"),
      field("approvalApproved", "Approval - Approved"),
    ],
  },
  {
    documentCode: "MONTHLY_PROGRESS_REPORT",
    documentName: "Monthly Progress Report",
    isEnabled: true,
    ocrCategoryId: "monthly_progress_report",
    splitBehavior: "contiguous",
    classificationHints: MONTHLY_PROGRESS_HINTS,
    documentRules: MONTHLY_PROGRESS_RULES,
    fields: [
      field("projectName", "Project Name"),
      field("periodStart", "Period Start"),
      field("periodEnd", "Period End"),
      field("vendorName", "Contractor", ["PT BERCA BUANA SAKTI"]),
      field("buyerName", "Client", ["PT PANCA AMARA UTAMA"]),
      field("contractValue", "Original contract total"),
      field("previousProgressPct", "TOTAL previous %"),
      field("thisPeriodProgressPct", "TOTAL current %"),
      field("cumulativeProgressPct", "TOTAL cumulative %"),
      field("previousBill", "TOTAL previous bill"),
      field("currentBill", "TOTAL current bill"),
      field("cumulativeBill", "TOTAL cumulative bill"),
      field("progressLineItems", "WBS progress rows", [
        "poLineNo",
        "description",
        "wbsNo",
        "unitPrice",
        "weightFactor",
        "previousPct",
        "currentPct",
        "cumulativePct",
        "previousBill",
        "currentBill",
        "cumulativeAmount",
      ]),
    ],
  },
  {
    documentCode: "SERTIFIKAT_BADAN_USAHA",
    documentName: "Sertifikat Badan Usaha",
    isEnabled: true,
    ocrCategoryId: "sertifikat_badan_usaha",
    splitBehavior: "scattered",
    classificationHints: SBU_HINTS,
    documentRules: SBU_RULES,
    fields: [
      field("certificateNumber", "SBU / certificate number"),
      field("pbUmku", "PB-UMKU number"),
      field("vendorName", "Nama Pelaku Usaha"),
      field("nib", "NIB"),
      field("officeAddress", "Alamat Kantor"),
      field("investmentStatus", "Status Penanaman Modal", ["PMDN"]),
      field("kbliCode", "Kode KBLI"),
      field("kbliDescription", "KBLI description"),
      field("businessLocation", "Lokasi Usaha"),
      field("issueDate", "Diterbitkan tanggal"),
      field("validUntil", "Masa berlaku"),
      field("npwp", "NPWP"),
      field("lpjkRegistrationNumber", "Nomor Registrasi LPJK"),
      field("qualification", "Kualifikasi", ["Besar"]),
      field("responsiblePerson", "PJBU"),
      field("technicalPerson", "PJTBU"),
      field("classifications", "Subklasifikasi rows", [
        "kodeSubklas",
        "sifat",
        "kbliCode",
        "subclassificationName",
        "pjskbuName",
      ]),
    ],
  },
  {
    documentCode: "IZIN_USAHA_JASA_KONSTRUKSI",
    documentName: "Izin Usaha Jasa Konstruksi",
    isEnabled: true,
    ocrCategoryId: "izin_usaha_jasa_konstruksi",
    splitBehavior: "contiguous",
    classificationHints: IUJK_HINTS,
    documentRules: IUJK_RULES,
    fields: [
      field("licenseNumber", "Nomor IUJK"),
      field("vendorName", "Nama Perusahaan"),
      field("vendorAddress", "Alamat Perusahaan"),
      field("phone", "Telepon / Fax"),
      field("responsiblePerson", "Penanggungjawab"),
      field("netWorth", "Kekayaan Bersih"),
      field("npwp", "NPWP"),
      field("businessCategory", "Kegiatan usaha", ["kontraktor"]),
      field("issueDate", "Tanggal terbit"),
      field("validUntil", "Berlaku sampai dengan"),
      field("issuingAuthority", "Penerbit"),
      field("classifications", "Klasifikasi bidang rows", [
        "bidang",
        "subKlasifikasi",
        "kode",
        "kualifikasi",
      ]),
    ],
  },
  {
    documentCode: "PO",
    documentName: "PO",
    isEnabled: true,
    ocrCategoryId: "purchase_order",
    splitBehavior: "contiguous",
    classificationHints:
      "Formal PURCHASE ORDER cover page (title PURCHASE ORDER, PO Number, PO Date, vendor). Not a transmittal, not a progress invoice, and not Appendix GTC pages.",
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
    ocrCategoryId: "purchase_order_appendix",
    splitBehavior: "scattered",
    classificationHints:
      "Pages headed Appendix - 1/2/3, PRICE BREAKDOWN AND DESCRIPTION OF PURCHASE ORDER, SPECIFIC/SPECIAL TERMS, or GENERAL TERMS & CONDITIONS. Repeating PO Number still means appendix.",
    documentRules: PO_APPENDIX_RULES,
    fields: [
      field("poHeaderInformation", "PO Header Information"),
      field("appendixItems", "Appendix schedule rows", [
        "description",
        "qty",
        "uom",
        "unitPrice",
        "amount",
      ]),
    ],
  },
];

export { enrichPromptWithDocumentRules };
