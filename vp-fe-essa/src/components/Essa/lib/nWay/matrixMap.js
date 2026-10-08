/**
 * Data Point × Doc Matrix (V2 tab) ↔ N-Way sources.
 *
 * MATRIX_DOCUMENTS — every document column of the Excel (row 3 title, row 4 “Source”),
 *   with the N-Way source it maps to (null = no source yet) and how many rows mark it (X / P / o).
 * MATRIX_ROWS — column D “Document Title (Source document)” per matrix row (Sl. #).
 *
 * Generated from “8. Data Point x Doc Matrix.xlsx”. Regenerate when the Excel changes.
 */

export const MATRIX_DOCUMENTS = [
  {"column": "I", "title": "Invoice", "origin": "Vendor", "source": "INVOICE", "marks": 71},
  {"column": "J", "title": "PO", "origin": "PO Master", "source": "PO", "marks": 39},
  {"column": "K", "title": "GRN", "origin": "GRIR - Ledger", "source": "GRN_SES", "marks": 6},
  {"column": "L", "title": "Faktur Pajak", "origin": "Vendor", "source": "FAKTUR_PAJAK", "marks": 16},
  {"column": "M", "title": "Coretax validation (DJP portal)", "origin": "DJP Coretax - e-Faktur validity check", "source": "CORETAX", "marks": 4},
  {"column": "N", "title": "Vendor Master Data", "origin": "SAP - Vendor Master (LFA1 / LFBK), incl. negative-list / block indicator and AP ledger balance", "source": "VENDOR_MASTER", "marks": 12},
  {"column": "O", "title": "Processed Invoice History", "origin": "SAP - posted vendor invoices (BKPF / RBKP) & Faktur Pajak register", "source": "INVOICE_HISTORY", "marks": 4},
  {"column": "P", "title": "Delivery Note", "origin": "Vendor", "source": "DELIVERY_NOTE", "marks": 4},
  {"column": "Q", "title": "Packing List", "origin": "Vendor", "source": "PACKING_LIST", "marks": 8},
  {"column": "R", "title": "Airway Bill", "origin": "Vendor", "source": "AIRWAY_BILL", "marks": 9},
  {"column": "S", "title": "Shipping Bill", "origin": "Vendor", "source": "SHIPPING_BILL", "marks": 9},
  {"column": "T", "title": "Bank Guarantee/Bond/Warranty Letter", "origin": "Vendor", "source": "BANK_GUARANTEE", "marks": 4},
  {"column": "U", "title": "Quality Certificate", "origin": "Vendor", "source": null, "marks": 2},
  {"column": "V", "title": "Factory Acceptance Test (FAT)", "origin": "Vendor", "source": null, "marks": 1},
  {"column": "W", "title": "Contract", "origin": "User Dept.", "source": "CONTRACT", "marks": 24},
  {"column": "X", "title": "Work Progress Certificate / BAST", "origin": "Vendor", "source": "BAST", "marks": 7},
  {"column": "Y", "title": "Timesheet/ Equipment Timesheet", "origin": "Vendor", "source": "TIMESHEET", "marks": 11},
  {"column": "Z", "title": "Manpower Summary/ Progress Summary", "origin": "Vendor", "source": "MANPOWER_SUMMARY", "marks": 11},
  {"column": "AA", "title": "Service Entry Sheet", "origin": "GRIR - Ledger", "source": "GRN_SES", "marks": 2},
  {"column": "AB", "title": "Overtime approval", "origin": "Vendor", "source": "OVERTIME_APPROVAL", "marks": 4},
  {"column": "AC", "title": "Meal Attendance at Canteen (all meal types)", "origin": "Vendor", "source": "MEAL_ATTENDANCE", "marks": 5},
  {"column": "AD", "title": "Recapitulation Back charge (snacks, special lunch & dinner)", "origin": "Vendor", "source": "BACK_CHARGE", "marks": 4},
  {"column": "AE", "title": "Attendence - Face ID", "origin": "Biometric Machine - ESSA", "source": "FACE_ID", "marks": 8},
  {"column": "AF", "title": "Other Reimbursement Catering", "origin": "Vendor", "source": null, "marks": 2},
  {"column": "AG", "title": "Monthly Camp POB, Monthly Porta Camp POB", "origin": "Vendor", "source": null, "marks": 1},
  {"column": "AH", "title": "Measurements/Bill of Quantity/Monthly Progress Report", "origin": "Vendor", "source": "BOQ", "marks": 5},
  {"column": "AI", "title": "Inspection report / certificate (incl. quantity certification)/ Certificate of Qty", "origin": "Vendor", "source": "INSPECTION_REPORT", "marks": 5},
  {"column": "AJ", "title": "Photo Evidence", "origin": "Vendor", "source": "PHOTO_EVIDENCE", "marks": 4},
  {"column": "AK", "title": "Test Report", "origin": "Vendor", "source": null, "marks": 1},
  {"column": "AL", "title": "SIUJK - Permit", "origin": "Vendor", "source": "SIUJK", "marks": 3},
  {"column": "AM", "title": "Billing Summary", "origin": "Vendor", "source": "BILLING_SUMMARY", "marks": 13},
  {"column": "AN", "title": "HCIS Clearing Account", "origin": "SAP GL", "source": "HCIS", "marks": 5},
  {"column": "AO", "title": "Guarantee Letter", "origin": "Vendor", "source": null, "marks": 6},
  {"column": "AP", "title": "Room Reservation Form", "origin": "Vendor", "source": null, "marks": 4},
  {"column": "AQ", "title": "PO for material being imported", "origin": "User Dept.", "source": null, "marks": 6},
  {"column": "AR", "title": "Pemberitahuan Impor Barang (PIB)", "origin": "User Dept.", "source": null, "marks": 5},
  {"column": "AS", "title": "Surat Persetujuan Pengeluaran Barang (SPPB)", "origin": "User Dept.", "source": null, "marks": 6},
  {"column": "AT", "title": "Delivery Order / Surat Jalan", "origin": "Vendor", "source": "DELIVERY_NOTE", "marks": 8},
  {"column": "AU", "title": "Material Lists", "origin": "Vendor", "source": null, "marks": 6},
  {"column": "AV", "title": "Deliverable as per Contract", "origin": "Vendor", "source": null, "marks": 5},
  {"column": "AW", "title": "Certification and proof of completion of milestones", "origin": "Vendor", "source": null, "marks": 6},
  {"column": "AX", "title": "SLA confirmation report/ Certificate of Quality", "origin": "Vendor", "source": null, "marks": 2},
  {"column": "AY", "title": "Billing Statements", "origin": "Vendor", "source": null, "marks": 3},
  {"column": "AZ", "title": "Approved Settlement form as per DOA", "origin": "User Dept.", "source": null, "marks": 26},
  {"column": "BA", "title": "Bank transfer proof / cash advance recon.", "origin": "User Dept.", "source": null, "marks": 3},
  {"column": "BB", "title": "Refund slip for unused advance", "origin": "User Dept.", "source": null, "marks": 1},
  {"column": "BC", "title": "Guest List (if applicable)", "origin": "User Dept.", "source": null, "marks": 2},
  {"column": "BD", "title": "Copy of Agenda or MOU", "origin": "User Dept.", "source": null, "marks": 2},
  {"column": "BE", "title": "Internal Order", "origin": "IO Matrix", "source": null, "marks": 4},
  {"column": "BF", "title": "Expense Report & Advance Settlement Form", "origin": "User Dept.", "source": null, "marks": 8},
  {"column": "BG", "title": "Valid invoices, receipts & tax documents for Settlement", "origin": "User Dept.", "source": null, "marks": 18},
  {"column": "BH", "title": "Booking confirmation", "origin": "User Dept.", "source": null, "marks": 9},
  {"column": "BI", "title": "Management or functional approval (as per DOA)", "origin": "User Dept.", "source": "DOA_APPROVAL", "marks": 2}
]

export const MATRIX_ROWS = {
  "1.01": {"title": "Invoice", "category": "Common", "dataPoint": "Vendor name"},
  "1.02": {"title": "Invoice", "category": "Common", "dataPoint": "Vendor bank account number"},
  "1.03": {"title": "Invoice", "category": "Common", "dataPoint": "Invoice date"},
  "1.04": {"title": "Invoice", "category": "Common", "dataPoint": "PO number"},
  "1.05": {"title": "Invoice", "category": "Common", "dataPoint": "Invoice number"},
  "1.06": {"title": "Invoice", "category": "Common", "dataPoint": "Unit rate"},
  "1.07": {"title": "Invoice", "category": "Common", "dataPoint": "Payment terms"},
  "1.08": {"title": "Invoice", "category": "Common", "dataPoint": "Invoice Amount"},
  "1.09": {"title": "Invoice", "category": "Common", "dataPoint": "Item description"},
  "1.10": {"title": "Invoice", "category": "Common", "dataPoint": "Quantity"},
  "1.11": {"title": "Invoice", "category": "Common", "dataPoint": "ESSA Company Name"},
  "1.12": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Vendor NPWP number"},
  "1.13": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Faktur Pajak value"},
  "1.14": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Faktur Pajak date"},
  "1.15": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Faktur Pajak vendor name"},
  "1.16": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Faktur Pajak number"},
  "1.17": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Faktur Pajak Bar Code"},
  "1.18": {"title": null, "category": "Common", "dataPoint": "Negative Vendor List"},
  "1.19": {"title": null, "category": "Common", "dataPoint": "Vendor debit balance"},
  "1.20": {"title": "PO", "category": "Common", "dataPoint": "Liquidated Clause"},
  "1.21": {"title": "PO", "category": "Common", "dataPoint": "Retention Clause"},
  "1.22": {"title": "PO", "category": "Common", "dataPoint": "Advance recovery Clause"},
  "1.23": {"title": "1. BAST 2. Invoice", "category": "Common", "dataPoint": "Percentage Completion (BAST & SES)"},
  "1.24": {"title": "Invoice", "category": "Common", "dataPoint": "Duplicate invoice check (vendor + invoice no. + amount + date)"},
  "1.25": {"title": "Faktur Pajak", "category": "Common", "dataPoint": "Duplicate Faktur Pajak check (FP number)"},
  "1.26": {"title": "Invoice", "category": "Common", "dataPoint": "Currency"},
  "1.27": {"title": "Invoice", "category": "Common", "dataPoint": "Exchange rate applied"},
  "1.28": {"title": "Invoice, faktur Pajak", "category": "Common", "dataPoint": "PPN rate and DPP (taxable base)"},
  "1.29": {"title": "PO", "category": "Common", "dataPoint": "WHT type and rate (PPh 21 / 23 / 4(2))"},
  "1.30": {"title": null, "category": "Common", "dataPoint": "Payment baseline date and due date"},
  "1.31": {"title": "BAST", "category": "Common", "dataPoint": "Date sequence (service period - GRN - invoice - FP)"},
  "1.32": {"title": "Invoice", "category": "Common", "dataPoint": "PO remaining balance (quantity and value)"},
  "1.33": {"title": "Invoice", "category": "Common", "dataPoint": "Vendor bank account changed"},
  "2.01": {"title": "Invoice", "category": "Material", "dataPoint": "Airway Bill / Shipping Bill Date"},
  "2.02": {"title": "Airway bill", "category": "Material", "dataPoint": "Airway Bill / Shipping Bill Name"},
  "2.03": {"title": null, "category": "Material", "dataPoint": "Bank Guarantee / Performance Bond Expiry Date"},
  "2.04": {"title": null, "category": "Material", "dataPoint": "Bank Guarantee / Performance Bond Amt."},
  "3.01": {"title": "Invoice, Manpower summary, PO", "category": "Manpower Outsourcing", "dataPoint": "Man-hours Qty."},
  "3.02": {"title": "Invoice, Manpower summary, PO", "category": "Manpower Outsourcing", "dataPoint": "Man-hours Unit Rate"},
  "3.03": {"title": "Invoice, Manpower summary, PO", "category": "Manpower Outsourcing", "dataPoint": "Overtime Qty."},
  "3.04": {"title": "Invoice, Manpower summary, PO", "category": "Manpower Outsourcing", "dataPoint": "Overtime unit rate"},
  "4.01": {"title": "Biometric", "category": "Catering", "dataPoint": "Daily POB count"},
  "4.02": {"title": "Invoice", "category": "Catering", "dataPoint": "Meal Sheet - Attendance"},
  "4.03": {"title": "Invoice", "category": "Catering", "dataPoint": "Packed Meal Sheet - Attendance"},
  "4.04": {"title": "Invoice", "category": "Catering", "dataPoint": "Snack back-charge Qty."},
  "4.05": {"title": "Invoice", "category": "Catering", "dataPoint": "Special-meal back-charge Qty."},
  "4.06": {"title": "Invoice", "category": "Catering", "dataPoint": "Special dinners Qty."},
  "4.07": {"title": "Invoice", "category": "Catering", "dataPoint": "Special lunches Qty."},
  "4.08": {"title": "Biometric", "category": "Catering", "dataPoint": "Employee Name"},
  "4.09": {"title": "Biometric", "category": "Catering", "dataPoint": "Date"},
  "4.10": {"title": "Biometric", "category": "Catering", "dataPoint": "Employee ID"},
  "4.11": {"title": "timesheet", "category": "Catering", "dataPoint": "Indian Cook - Attendance"},
  "4.12": {"title": "Invoice", "category": "Catering", "dataPoint": "Flight ticket - Employee Name"},
  "4.13": {"title": "Invoice", "category": "Catering", "dataPoint": "ITAS - Employee Name"},
  "5.01": {"title": "Invoice", "category": "Housekeeping", "dataPoint": "Number of Rooms"},
  "6.01": {"title": "Invoice", "category": "Rental Equipment", "dataPoint": "Equipment Hours/ month"},
  "6.02": {"title": "Invoice", "category": "Rental Equipment", "dataPoint": "Equipment overtime"},
  "6.03": {"title": "Invoice", "category": "Rental Equipment", "dataPoint": "Equipment unit rate"},
  "6.04": {"title": "Invoice", "category": "Rental Equipment", "dataPoint": "Operator Manhours"},
  "7.01": {"title": "Invoice", "category": "Civil Works (Construction)", "dataPoint": "Quantity - BOQ/Prev.%, Curr.%, Cumu%"},
  "7.02": {"title": null, "category": "Civil Works (Construction)", "dataPoint": "Completion Proof"},
  "7.03": {"title": "SBU/SIUJK", "category": "Civil Works (Construction)", "dataPoint": "SIUJK expiry date"},
  "7.04": {"title": "SBU/SIUJK", "category": "Civil Works (Construction)", "dataPoint": "SIUJK WHT rate"},
  "8.01": {"title": null, "category": "PIB", "dataPoint": "ESSA Company Name"},
  "8.02": {"title": null, "category": "PIB", "dataPoint": "PIB Amount"},
  "8.03": {"title": null, "category": "PIB", "dataPoint": "Item Description"},
  "9.01": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "Trip ID"},
  "9.02": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "Airline"},
  "9.03": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "Route"},
  "9.04": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "Travel dates"},
  "9.05": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "Passenger name"},
  "9.06": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "Travel class"},
  "9.07": {"title": "Invoice", "category": "Travel - Non PO", "dataPoint": "HCIS Ledger amount"},
  "10.01": {"title": "Invoice, Guarantee Letter", "category": "Hotel - Non PO", "dataPoint": "Hotel Trip ID"},
  "10.02": {"title": "Invoice", "category": "Hotel - Non PO", "dataPoint": "Hotel dates"},
  "10.03": {"title": "Invoice", "category": "Hotel - Non PO", "dataPoint": "Guest name"},
  "10.04": {"title": "Invoice", "category": "Hotel - Non PO", "dataPoint": "HCIS Ledger amount"},
  "11.01": {"title": null, "category": "Import Logistics", "dataPoint": "Item Description"},
  "11.02": {"title": null, "category": "Import Logistics", "dataPoint": "Airway / Shipping Bill - Vendor name"},
  "11.03": {"title": null, "category": "Import Logistics", "dataPoint": "Consignee Name"},
  "11.04": {"title": null, "category": "Import Logistics", "dataPoint": "PIB"},
  "11.05": {"title": null, "category": "Import Logistics", "dataPoint": "Forwarder Name"},
  "12.01": {"title": null, "category": "Domestic Logistic", "dataPoint": "Delivery Date"},
  "12.02": {"title": null, "category": "Domestic Logistic", "dataPoint": "Delivery confirmation"},
  "12.03": {"title": null, "category": "Domestic Logistic", "dataPoint": "Item description"},
  "12.04": {"title": null, "category": "Domestic Logistic", "dataPoint": "PO number - Transported Goods"},
  "13.01": {"title": null, "category": "Consultants (Time Based)", "dataPoint": "Man-hours / Man-months"},
  "13.02": {"title": null, "category": "Consultants (Time Based)", "dataPoint": "Unit Price"},
  "13.03": {"title": null, "category": "Consultants (Time Based)", "dataPoint": "Terms & Conditions"},
  "13.04": {"title": null, "category": "Consultants (Time Based)", "dataPoint": "Contract deliverables"},
  "14.01": {"title": "Invoice", "category": "Consultants (Milestone)", "dataPoint": "Milestones"},
  "15.01": {"title": "Invoice", "category": "Medical Services", "dataPoint": "Man-hours / Man-months"},
  "15.02": {"title": "Invoice", "category": "Medical Services", "dataPoint": "Unit Price"},
  "15.03": {"title": "Invoice", "category": "Medical Services", "dataPoint": "Equipment Hours / Months"},
  "15.04": {"title": "Invoice", "category": "Medical Services", "dataPoint": "Equipment Unit Price"},
  "16.01": {"title": "Invoice", "category": "Surveillance and Inspection", "dataPoint": "Inspection Report quantity/Qty"},
  "16.02": {"title": "Certificate Quality", "category": "Surveillance and Inspection", "dataPoint": "SLA confirmation"},
  "17.01": {"title": null, "category": "Telecom and Internet Services", "dataPoint": "DOA approval"},
  "17.02": {"title": null, "category": "Telecom and Internet Services", "dataPoint": "SLA confirmation"},
  "18.01": {"title": null, "category": "CSR / External Relation", "dataPoint": "Settlement Amount"},
  "18.02": {"title": null, "category": "CSR / External Relation", "dataPoint": "Beneficiary Name"},
  "18.03": {"title": null, "category": "CSR / External Relation", "dataPoint": "Payment Amount"},
  "18.04": {"title": null, "category": "CSR / External Relation", "dataPoint": "Guest Name"},
  "18.05": {"title": null, "category": "CSR / External Relation", "dataPoint": "WHT Amount (if applicable)"},
  "18.06": {"title": null, "category": "CSR / External Relation", "dataPoint": "MOU"},
  "19.01": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "Settlement Amount"},
  "19.02": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "Payment Amount"},
  "19.03": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "Card Holder Name"},
  "19.04": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "Merchant Name"},
  "19.05": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "Internal Order Number"},
  "19.06": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "WHT Amount (if applicable)"},
  "19.07": {"title": "Paper ID (No Invoice)", "category": "Corporate Credit Card", "dataPoint": "PO Number (If applicable)"},
  "20.01": {"title": null, "category": "Misc. Business Expenses", "dataPoint": "Settlement Amount"},
  "20.02": {"title": null, "category": "Misc. Business Expenses", "dataPoint": "Payment Amount"},
  "20.03": {"title": null, "category": "Misc. Business Expenses", "dataPoint": "Internal Order Number"},
  "20.04": {"title": null, "category": "Misc. Business Expenses", "dataPoint": "Vendor Name"},
  "20.05": {"title": null, "category": "Misc. Business Expenses", "dataPoint": "WHT Amount (if applicable)"},
  "21.01": {"title": null, "category": "Events and Celebrations", "dataPoint": "Settlement Amount"},
  "21.02": {"title": null, "category": "Events and Celebrations", "dataPoint": "Payment Amount"},
  "21.03": {"title": null, "category": "Events and Celebrations", "dataPoint": "Internal Order Number"},
  "21.04": {"title": null, "category": "Events and Celebrations", "dataPoint": "Guest Name"},
  "21.05": {"title": null, "category": "Events and Celebrations", "dataPoint": "Vendor Name"},
  "21.06": {"title": null, "category": "Events and Celebrations", "dataPoint": "PO Number (If applicable)"},
  "21.07": {"title": null, "category": "Events and Celebrations", "dataPoint": "WHT Amount (if applicable)"},
  "22.01": {"title": null, "category": "Employee Settlements", "dataPoint": "Settlement Amount"},
  "22.02": {"title": null, "category": "Employee Settlements", "dataPoint": "Payment Amount"},
  "22.03": {"title": null, "category": "Employee Settlements", "dataPoint": "Vendor Name"},
  "22.04": {"title": null, "category": "Employee Settlements", "dataPoint": "Internal Order Number"},
  "22.05": {"title": null, "category": "Employee Settlements", "dataPoint": "WHT Amount (if applicable)"}
}

/** How the Excel marks translate to cell roles on the N-Way matrix. */
export const MATRIX_MARK_LEGEND = [
  { excel: 'Document Title', role: 'SOURCE', text: 'Anchor' },
  { excel: 'X', role: 'REQUIRED', text: 'Mandatory' },
  { excel: 'P', role: 'PARTIAL', text: 'Partial' },
  { excel: 'o', role: 'EXTRACT', text: 'Available' }
]

/** Names used in column D that are not column headers. */
const TITLE_ALIASES = {
  invoice: 'INVOICE',
  po: 'PO',
  'faktur pajak': 'FAKTUR_PAJAK',
  'manpower summary': 'MANPOWER_SUMMARY',
  biometric: 'FACE_ID',
  bast: 'BAST',
  timesheet: 'TIMESHEET',
  'airway bill': 'AIRWAY_BILL',
  'sbu/siujk': 'SIUJK'
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Excel document columns that feed one N-Way source. */
export const matrixDocsForSource = (code) => MATRIX_DOCUMENTS.filter((d) => d.source === code)

/** Excel column titles for a source, joined for display (e.g. “GRN · Service Entry Sheet”). */
export const matrixTitleFor = (code) => matrixDocsForSource(code).map((d) => d.title).join(' · ')

export const UNMAPPED_MATRIX_DOCUMENTS = MATRIX_DOCUMENTS.filter((d) => !d.source)

/**
 * Split a column D value into names and resolve each to a source code (null when unknown).
 * “Invoice, Manpower summary, PO” → [INVOICE, MANPOWER_SUMMARY, PO]; “1. BAST\n2. Invoice” → [BAST, INVOICE].
 */
export const resolveMatrixTitle = (title) =>
  String(title || '')
    .split(/,|\n|\s(?=\d+\.\s)/)
    .map((part) => part.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean)
    .map((name) => {
      const n = norm(name)
      const byColumn = MATRIX_DOCUMENTS.find((d) => norm(d.title) === n)
      return { name, code: TITLE_ALIASES[n] || byColumn?.source || null }
    })

/**
 * Compare a rule's anchor with the matrix row it traces to.
 * status: NOT_IN_MATRIX | BLANK (column D empty) | MATCH | DIFFERS
 */
export const matrixAnchorCheck = (rule) => {
  const row = MATRIX_ROWS[String(rule?.ruleKey || '').trim()]
  if (!row) return { status: 'NOT_IN_MATRIX', row: null, names: [] }
  if (!row.title) return { status: 'BLANK', row, names: [] }
  const names = resolveMatrixTitle(row.title)
  const match = names.some((n) => n.code && n.code === rule.source)
  return { status: match ? 'MATCH' : 'DIFFERS', row, names }
}
