/**
 * Per-document extraction hints appended to the dynamic extraction prompt.
 * Keys match DOCUMENT_SCHEMAS ids in documentFieldSchemas.js.
 */

const INVOICE_HINTS = `
Invoice OCR extraction rules:

General:
- Use OCR, embedded text layer, and layout analysis on the ENTIRE page (header, footer,
  side notes, signature block, stamps, and tables).
- Support multilingual documents (e.g. Indonesian: "Kwitansi", "Rp", "Bank", "No. Rekening").
- Scan the whole page for every field. Match labels by meaning, not exact text
  (Bahasa Indonesia equivalents count). Only set null after checking the full page.
- Never hallucinate values. Preserve exact printed values including thousand separators
  (e.g. "21.990.000"), currency symbols, dates, and account numbers.
- Do not guess invoice numbers, tax IDs, or dates.

Header field mapping (use these exact JSON keys in "header"):
- invNo — value beside "INVOICE NO" / "Invoice No" / "Nomor Invoice" in the header
  (e.g. INV/TD/000591/2026, 568/PT.ALE-PAU/04/2026). PT. Amanah Lestari Energy uses
  NNN/PT.ALE-PAU/MM/YYYY with 3 digits first — not INV/. Read the leading digits
  character-by-character (568 is not SER). DATE is on the next line; do not merge it
  into invNo. NEVER use the Faktur Pajak e-Faktur serial (15–17 digits) or a PO number
  (4203…) as invNo.
- date — invoice date (not due date).
- dueDate — payment due date ("Due Date", "Jatuh Tempo", "Tanggal Jatuh Tempo", "Payment Due").
- vendorName, vendorAddress, vendorTaxId — seller / issuer (letterhead block).
- buyerName — buyer / bill-to party.
- poNumber — SAP / contract PO only when THIS invoice prints a labeled "Contract Order No",
  "PO Number", or "PO No" field (exactly 10 digits starting with 4203, e.g. 4203000546).
  For Non-PO invoices (travel, ticket, standalone invoices with no contract reference on
  the page) set poNumber to null. NEVER copy Ticket No, Confirm No, e-ticket, PNR, booking
  reference, passenger ticket numbers, or any 10-digit number that does not start with 4203
  into poNumber. Do not invent a PO. Do not copy from timesheets, notice, or other documents.
- serviceName — work/service title (heading above line items or "Untuk Pembayaran" block).
- currency — e.g. IDR.
- manhourUnitRate — per-manhour rate when priced by man-hour ("Rate", "Unit Rate",
  "Rate/MH", "Harga Satuan" column or inline in a line). null when absent.
- subtotal — amount BEFORE tax (sum of line items / "Subtotal").
- totalAmount — document "Total" before or excluding separate tax row when shown.
- vatAmount — VAT / PPN / tax amount (e.g. "VAT 11%").
- grandTotal — total INCLUDING tax.
- paymentTerms — full terms of payment text ("Payment Terms", "Syarat Pembayaran", "Terms of Payment",
  "Due in N days…"). Extract the complete sentence or clause, not just the number of days.
- projectName — project title or name when printed ("Project", "Project Name", "Nama Proyek"). null if absent.
- incoterms — delivery or trade terms ("Delivery Terms", "Syarat Pengiriman", "Incoterms"). null if absent.
- bankName — bank institution ("Bank", "Bank Name"). e.g. "PT. Bank Mandiri (Persero) Tbk."
- bankBranch — branch ("Cabang", "Branch"), often on the line after bank name.
- bankAccountNumber — account digits EXACTLY as printed ("No. Rekening", "Account No.",
  "Bank Account", "A/C No"). Never confuse with bankAccountName.
- bankAccountName — beneficiary / account holder ("Account Name", "Atas Nama", "Beneficiary").
- authorizedSignatory — signatory name from signature block.
- rolesOfManpower — comma-separated unique manpower roles from line items when present.
- calculation — calculation notes when printed.

Travel / ticket agency invoices (e.g. Wisata Kawan):
- vendorName = issuing travel agency (letterhead / "Issued by").
- serviceName = ticket or service line (e.g. "Ticket Domestic").
- PPN may appear inline near totals; bank may read "Bank BCA : 6970747999" on one line.
- Put ticket/passenger details in header AND in invoiceLineItems[0] using these keys:
  passengerName (Name), ticketClass, routeFrom (From), routeTo (To), confirmNo, ticketNo,
  airline, flightNo, routeCodeFrom, routeCodeTo. Ticket No / Confirm No belong in ticketNo
  and confirmNo — never in poNumber.
- Scan the ticket detail block / passenger table on the page — these labels are often printed
  as rows (e.g. "Name", "Ticket Class", "From", "To", "Confirm No", "Ticket No", "Airline",
  "Flight No", "Route Code From", "Route Code To"). Copy each value exactly.
- Route codes are 3-letter IATA codes (e.g. CGK, BPN). Routing may read "Jakarta - Balikpapan".
- Do not collapse the ticket table into a single "Ticket Domestic" description row when the
  passenger detail table is visible — populate all travel keys above.

LINE ITEMS — critical (populate "invoiceLineItems" AND mirror the same rows in "lineItems"):
- Extract EVERY row under the description/amount table, including each "Claim" row and
  each cost component, in EXACT top-to-bottom printed order.
- Do NOT reorder, sort, group, deduplicate, merge, or collapse rows — output row count
  must equal printed table row count.
- Copy description text EXACTLY as written (character for character).
- Valid row even if only description + amount; set quantity / unitPrice to null — do NOT drop.
- Include zero, blank, or "-" amounts (amount = null, keep the row).
- Transcribe amounts DIGIT BY DIGIT; preserve thousand separators (e.g. "4.456.500").
- Do NOT include Total / VAT / Subtotal / Grand Total summary rows as line items.
- NEVER return empty invoiceLineItems when the body has a description/amount table or
  "Claim for … Direct Cost / Overtime" rows.

Each line item keys: description, passengerName, ticketClass, routeFrom, routeTo, routing,
confirmNo, ticketNo, airline, flightNo, routeCodeFrom, routeCodeTo, role, quantity, unit,
unitPrice, amount
- role — manpower role ("Welder", "Fitter"; "Position", "Jabatan", "Trade") or null.
- unit — EA, LOT, PR, manhour, etc. or null when no UOM column.

Also set "pages" to the 1-based PDF page numbers you read (do not invent page 1 if the
invoice is on another page of the bundle).
`.trim();

const FAKTUR_PAJAK_HINTS = `
Faktur Pajak / Indonesian tax invoice:
- taxInvoiceNumber — "Kode dan Nomor Seri Faktur Pajak" exactly as printed (15–17 digit
  e-Faktur serial). Do not confuse with commercial invoice number.
- date — REQUIRED tax invoice date. Use the signing / issuance date on this Faktur Pajak page.
  Primary source: "Tempat dan Tanggal Ditandatangani" (place + date, e.g. "JAKARTA, 18 Desember 2025").
  If that block is unclear, use the date printed beside the QR code at the bottom of the page
  ("Tanggal Faktur" / e-Faktur stamp date) — this is the same tax invoice date for VAT purposes.
  Put the date portion only in header.date (e.g. "18 December 2025"), not the place name.
  Also add fields[] row: { "fieldName": "Tempat dan Tanggal Ditandatangani", "fieldValue": "<full line>" }.
- vatAmount — "Jumlah PPN (Pajak Pertambahan Nilai)" / PPN amount exactly as printed.
- Read seller and buyer blocks, DPP, and tax base if visible; keep header scalars only.
`.trim();

const NOTICE_HINTS = `
Payment notice / Kwitansi:
- taxInvoiceNumber — referenced Faktur Pajak or tax invoice number from "Untuk Pembayaran"
  or payment-for block (not the notice's own receipt number unless it is the tax serial).
- date — notice or payment date.
- vatAmount — Extract from the line explicitly labelled:
  "Jumlah PPN (Pajak Pertambahan Nilai)".
  The value is a Rp amount with period-separated thousands and comma decimal
  (e.g. "6.053.245,00"). Return as a numeric value without currency symbols or separators
  (e.g. 6053245.00).
  Do NOT use "Dasar Pengenaan Pajak" (DPP / tax base) or "Jumlah PPnBM" — these are
  different fields. If the PPN line is present but reads 0,00 return 0.
- Scan full page for bank details and payment references in any language.
`.trim();

const BERITA_ACARA_HINTS = `
Berita Acara / Work Progress Certificate (English and/or Bahasa Indonesia).
Common titles: "Berita Acara", "Berita Acara Serah Terima Pekerjaan", "Work Progress Certificate".

HEADER fields:
- poNumber — PO / Contract Order number (e.g. "4203000546").
  Labels: "PO No", "Nomor PO", "Contract Order No", "Purchase Order".
  Must be a 10-digit number starting with 420x. NEVER use an invoice number as poNumber.
  Only extract from THIS Berita Acara page — never from other documents in the bundle.
- periodStart — start of the work / claim period.
  Labels: "Period From", "Periode Mulai", "From", "Start Date".
- periodEnd — end of the work / claim period.
  Labels: "Period To", "Periode Akhir", "To", "End Date".
- serviceName — service / activity / project title for the work covered.
  Labels: "Service Name", "Activity", "Nama Pekerjaan", "Scope of Work".

WORK PROGRESS SUMMARY — read this block carefully and completely:
- manhourPercentageCompletion — completion percentage for THIS PERIOD ONLY.
  Find the row labelled "This Period" / "Periode Ini" in the progress block.
  Example: Previous Period 67,201% | This Period 6,920% | Cumulative 74,121%
  → return "6,920%" or "6.920". NEVER use the Cumulative or Previous Period value.
- thisManhours — man-hours for THIS PERIOD ONLY.
  Find "This man hours", "This Man Hours", or the "This Period" column of the manhour row.
  Example: "758,50 Hours" → "758.50". Do NOT use Previous man hours or Cumulative MH.
- tables — include the full progress summary table when present:
  tables[].headers = column headers as printed (e.g. ["Description", "Previous Period", "This Period", "Cumulative"])
  tables[].rows = one row per metric in table order (completion %, manhours, etc.)

APPROVAL — names from the sign-off block:
- preparedBy — "Prepared By", "Dibuat Oleh", "Disiapkan Oleh".
- reviewedBy — "Reviewed By", "Diperiksa Oleh", "Diteliti Oleh".
- acknowledgedBy — "Acknowledged By", "Diketahui Oleh", "Mengetahui".
- approvedBy — "Approved By", "Disetujui Oleh", "Menyetujui".

LINE ITEMS — one row per manpower person listed in the certificate table:
- manpowerName — worker's full name.
- role — job role / position (e.g. "Welder", "Fitter", "Pipe Fitter").
  Labels: "Position", "Jabatan", "Posisi", "Trade".
- serviceName — per-row service / activity name if shown; otherwise null.
- completionPct — per-person completion % if shown; otherwise null.
Extract every manpower row in table order; do not skip duplicate roles.

Rules:
- Do NOT extract invoice numbers, tax amounts, or bank details.
- Return null for any field not found on this document. Never guess.
- Preserve exact dates and percentages as printed.
- Set documentType to "Berita Acara" or "Work Progress Certificate".
- Output: valid JSON with "header", "lineItems", "tables", "documentType", "invoicePages".
`.trim();

const SUMMARY_MANHOUR_HINTS = `
Summary Calculation Manhour (also titled "Rekap Manhour", "Manhour Summary", or similar):

HEADER fields (extract when present):
- poNumber — PO / Contract Order number (10 digits, often starting with 420x).
  Labels: "PO No", "Nomor PO", "Contract Order No".
- periodStart / periodEnd — work period covered by the summary.
- vendorName — contractor / vendor name.
- projectName — project / site / location name.
- totalRegularManhour — grand total of ALL regular man-hours from the footer/summary row.
- totalOvertimeManhour — grand total of ALL overtime man-hours = sum of (C) + sum of (D)
  from the footer row. Do NOT use only the weekday OT footer total.

LINE ITEMS — one row per manpower person (populate "manhourSummary"):
- manpowerName — worker's full name. Column may be "Name", "Namer", "Nama", "Manpower".
  Copy character-for-character.
- role — job role / trade (e.g. "Welder", "Fitter", "Skilled Chemical", "Supervisor").
  Copy character-for-character.

CRITICAL — column identification (read every column header before assigning values):
- regularManhour — the TOTAL HOURS worked column. This is column (B) "Basic Manhour" / "Basic MH" /
  "Actual Mhr" / "Regular MH". Values are typically 150–250 hours per month per person.
  NEVER use the "Basic Day" / "Basic Day (A)" column as regularManhour — that column counts
  DAYS worked (e.g. 22, 23, 24), not hours. If you see a column labelled "Basic Day" alongside
  "Basic Manhour", use ONLY the "Basic Manhour" column for regularManhour.
- overtimeMondaySaturdayManhour — column (C) "Overtime Monday - Saturday" / "OT Mon-Sat".
  ONLY populate if this column header exists in the table. Otherwise set to 0.
- overtimeSundayHolidayManhour — column (D) "Overtime Sunday & Public Holiday" / "OT Sun/PH".
  ONLY populate if this column header exists in the table. Otherwise set to 0.
- overtimeManhour — total overtime hours. ONLY populate from a column explicitly labelled
  "Overtime", "OT", or similar. If NO overtime column exists in the table, set to 0 (not null).
  Never derive overtime by subtracting or inferring from other columns.
- totalActualManhour — optional cross-check total column (G) where G = B + C + D.
- unitPrice — the IDR/hr rate per hour for this manpower. Must be a per-hour rate, NOT a total
  amount. Labels: "Unit Price / Hour", "Rate/Hr", "Unit Rate", "Harga per jam". Typically a
  round number (e.g. 40,000 / 60,000 / 39,000). null if no per-hour rate column exists.
  IMPORTANT: "Amount Mhr (IDR)" or "Total Amount" columns are TOTAL amounts (hours × rate),
  NOT unit prices — do not use them as unitPrice.
- regularAmount — total payment for regular hours for this person. Labels: "Amount Mhr (IDR)",
  "Amount", "Jumlah". This is the full period payment, not per-hour. Preserve exact value.
- overtimeAmount — total payment for overtime hours. Use 0 when no overtime was worked.
  null only if no overtime amount column exists in the document at all.

NO OVERTIME RULE: If the document has no column labelled "Overtime", "OT", or similar,
set overtimeManhour = 0, overtimeMondaySaturdayManhour = 0,
overtimeSundayHolidayManhour = 0, and overtimeAmount = 0 for every row.

ROLE AGGREGATION — populate "roleSummary" after extracting all line items:
- Group all workers by role, normalizing similar names:
  "Pipe Fitter" and "Fitter" → normalize to "Fitter"; "Welder" stays "Welder".
- For each unique normalized role output:
  - roleName — normalized role name.
  - totalRegularManhour — sum of regularManhour across all workers with this role.
  - totalOvertimeManhour — sum of overtimeManhour across all workers with this role.
  - totalRegularAmount — sum of regularAmount (IDR).
  - totalOvertimeAmount — sum of overtimeAmount (IDR).
  - unitPrice — representative unit price per hour for the role (most common or first encountered
    if multiple prices exist within the role).
  - workerCount — number of distinct workers assigned to this role.
- roleSummary order: by first appearance in the table.

Rules:
- Extract EVERY manpower row in exact printed table order; never skip, merge, or drop rows
  including those with zero hours.
- When columns (C) and (D) exist, populate both AND set overtimeManhour to their numeric sum.
- Skip printed "Total" / footer summary rows from lineItems; capture their values in header fields.
- Do NOT extract invoice numbers, tax amounts, or bank details.
- Return null for any field absent on this document. Never guess.
- Set documentType to "Summary Calculation Manhour" or "Manhour Summary".
- Output: valid JSON with "header", "lineItems", "roleSummary", "documentType", "invoicePages".
`.trim();

const DAILY_TIMESHEET_HINTS = `
Daily Time Sheet (ALE / Amanah format — landscape, one worker per page):

CRITICAL — one timesheet object per worker. Never mix daily rows from different workers.
Output a "timesheets" array (one element per worker), NOT a flat lineItems list.
Leave "lineItems" as an empty array [].

DOCUMENT HEADER (shared when shown once at file level):
- poNumber — PO / Contract Order number.
- periodStart / periodEnd — overall period covered by the file.
- vendorName — contractor name.
- projectName — project / site name.

TOP-LEFT METADATA BLOCK (read for EACH individual timesheet form):
- manpowerName — value after "Name :" label in the top-left block. Read letter-by-letter
  (e.g. "Purwanto", "Lukman Umpel"). NEVER use Prepared By / Proposed By / Approved By
  footer names — those are signatories, not the worker.
- username — value after "No. ID :" label (8-digit employee badge number).
- role — value after "Position :" label for THAT worker only (e.g. "Welder", "Fitter",
  "Pipe Fitter", "Supervisor").
- periodStart / periodEnd — per-worker period if shown; else use document header.
- sheetPages — PDF page number(s) where this worker's timesheet appears.

DAILY ENTRIES (inside each timesheet object — one row per calendar date for THAT worker):
- date — from "Date" column (e.g. "7-Mar-26"). Extract EVERY row including Day Off / Public Holiday.
- basicTime — "Basic Time" column ONLY. Comma decimals preserved (e.g. "9,00").
- otActual — "OT Actual" column ONLY. Use null when cell shows "–" or is blank.
- regularManhour — same value as basicTime.
- overtimeManhour — same value as otActual.

FOOTER / ATTENDANCE SUMMARY (sheet-level totals for each timesheet):
- totalRegularManhour — footer total under "Basic Time" column (e.g. "178,00").
- totalOvertimeManhour — footer total under "OT Actual" column (e.g. "21,00").

Layout rules:
- One page = one worker on Amanah timesheets. Do NOT merge pages into a single timesheet.
- Each timesheet object's entries belong ONLY to that object's manpowerName.
- Preserve comma decimals exactly (7,30 / 9,00) — do not convert.
- Do NOT calculate overtime from Work Hours minus Basic Time — read the OT Actual column directly.
- Extract all 31 possible date rows per worker in printed table order.
- Return null for any field absent. Never guess.
- Set documentType to "Daily Time Sheet" or "Timesheet".
- Output: valid JSON with "header", "timesheets", "lineItems": [], "documentType", "invoicePages".
`.trim();

const DAILY_ATTENDANCE_HINTS = `
Daily Attendance (biometrics):
- attendanceEntries: date, username (employee id/name), event (check-in/out, remarks).
- Extract every log row in order; do not collapse duplicate timestamps.
`.trim();

const PURCHASE_ORDER_HINTS = `
Purchase Order extraction rules:

CRITICAL — PO Number:
- poNumber — REQUIRED in header.poNumber. Locate the labeled "PO Number" / "Nomor PO" box
  in the document header. Transcribe digit-by-digit (10 digits, starts with 420x, e.g. 4203000472).
  Never omit. Never use invoice number, BA number, or any other reference.
- Also include a fields[] row: { fieldName: "PO Number", fieldValue: "<same digits>" }.

HEADER fields (put ALL of these in header.*):
- poNumber — as above.
- poDate — date printed beside "PO Date" / "Tanggal PO" / "Date" in the PO header block.
- vendorName — the "To" / "Kepada" block (the vendor / seller / supplier receiving this PO).
- vendorCode — the numeric supplier/vendor code printed beside "Vendor Code" / "Kode Vendor" /
  "Kode Pemasok" in the PO header block (e.g. "30000956"). NOT the PO number.
- buyerName — the issuing company shown in the TOP-RIGHT letterhead block or "From" / "Issued by"
  field. This is PT PANCA AMARA UTAMA (or whichever company is at the top-right). NOT the "To" vendor.
- projectName — value beside "Project" / "Nama Proyek" / "Project Name" / "Project Code" in the
  header block (e.g. "Banggai Ammonia Plant [BAP]").
- description — scope / item description from the header or first line item.
- deliveryDate — delivery or completion date ("Delivery Date", "Tanggal Pengiriman").
- paymentTerms — FULL payment terms text beside "Payment Terms" / "Syarat Pembayaran" /
  "Terms of Payment" (e.g. "Due in 30 days from Invoice Receipt Date"). Do NOT omit.
- incoterms — delivery condition beside "Delivery Terms" / "Syarat Pengiriman" / "Incoterms"
  (e.g. "DAP", "FOB", "CIF"). Set to null if not present.
- currency — currency of the PO (e.g. "IDR").
- totalAmount — REQUIRED. The grand total value of THIS PO document only. Read the "Total" /
  "Total Amount (IDR)" / "Total Jumlah" / "Jumlah" cell at the bottom of the PO line items table,
  or the "Grand Total" field printed on this PO page. For a single-LOT PO it equals the one line
  item's "Total Amount (IDR)" / "Jumlah" column value.
  CRITICAL: NEVER copy this value from the commercial invoice, manhour summary, kwitansi, SES,
  or any other document in the bundle. The PO total will be a different (typically much larger)
  number than the invoice being processed for this period.
- poValue — same value as totalAmount (copy it).

LINE ITEMS (poLineItems array):
- Extract every row from the line items / price schedule table in printed order.
- Keys per row: no (line number), description, qty, uom, unitPrice, amount.
- Include the "Total" summary row if present; mark description as "Total".

ANTI-CONFUSION:
- Do NOT use any number from the invoice, manhour summary, kwitansi, or other bundle documents.
- Do NOT import buyer/vendor details from other pages — only from THIS PO page.
- If paymentTerms spans multiple lines, join them into one string.
`.trim();

const PO_APPENDIX_HINTS = `
PO Appendix / rate schedule:
- poHeaderInformation — PO number and header context.
- appendixItems — unitPrice, qty, roleOfManpower per rate row in table order.
`.trim();

const SES_HINTS = `
Service Entry Sheet (SES):
- sesHeaderInfo — SES number, PO reference, vendor, period from header block.
- qty — header quantity when shown.
- sesLineItems — description and qty per service line in printed order.
`.trim();

const TRANSMITTAL_HINTS = `
Civil contractor TRANSMITTAL NOTE:
- date, vendorName (From company), buyerName (To), attention, fromName, purpose.
- invNo and progressDescription from the enclosed-document table.
- transmittalItems: description + remarks (Original / Copy).
- Not an invoice. Do not copy bank totals from later pages.
`.trim();

const NOTICE_LETTER_HINTS = `
Civil contractor Notice Letter / Receipt:
- RECEIPT pages: receiptNo, receivedFrom/buyerName, grandTotal, amountInWords, bank*, progressDescription.
- Notice of Progress Claim letters: ourRef, subject, previousProgressPct, thisPeriodProgressPct,
  contractValue, payableAmount, DP/retention/WHT/VAT from Payment Details.
- Not the commercial invoice progress-claim table.
`.trim();

const MONTHLY_PROGRESS_HINTS = `
MONTHLY PROGRESS REPORT (landscape WBS):
- Header: projectName, periodStart/periodEnd, vendorName, buyerName, contractValue, TOTAL % and bill columns.
- progressLineItems: poLineNo, description, wbsNo, unitPrice, weightFactor,
  previousPct, currentPct, cumulativePct, previousBill, currentBill, cumulativeAmount.
- Extract every WBS row. TOTAL footer goes to header, not a line.
`.trim();

const SBU_HINTS = `
Sertifikat Badan Usaha (SBU) Konstruksi / PB-UMKU:
- certificateNumber, nib, vendorName, kbliCode, npwp, lpjkRegistrationNumber, qualification.
- classifications from lampiran: kodeSubklas, sifat, kbliCode, subclassificationName.
`.trim();

const IUJK_HINTS = `
Izin Usaha Jasa Konstruksi Nasional:
- licenseNumber, vendorName, vendorAddress, responsiblePerson, npwp, businessCategory, issueDate.
- classifications from lampiran klasifikasi bidang.
`.trim();

/** @type {Record<string, string>} */
export const DOCUMENT_EXTRACTION_HINTS = {
  invoice: INVOICE_HINTS,
  faktur_pajak: FAKTUR_PAJAK_HINTS,
  notice: NOTICE_HINTS,
  berita_acara: BERITA_ACARA_HINTS,
  summary_calculation_manhour: SUMMARY_MANHOUR_HINTS,
  daily_timesheet: DAILY_TIMESHEET_HINTS,
  daily_attendance: DAILY_ATTENDANCE_HINTS,
  purchase_order: PURCHASE_ORDER_HINTS,
  purchase_order_appendix: PO_APPENDIX_HINTS,
  service_entry_sheet: SES_HINTS,
  transmittal: TRANSMITTAL_HINTS,
  notice_letter: NOTICE_LETTER_HINTS,
  monthly_progress_report: MONTHLY_PROGRESS_HINTS,
  sertifikat_badan_usaha: SBU_HINTS,
  izin_usaha_jasa_konstruksi: IUJK_HINTS,
};

/**
 * @param {string} schemaId
 * @returns {string}
 */
export function getDocumentExtractionHints(schemaId) {
  return DOCUMENT_EXTRACTION_HINTS[schemaId] || "";
}
