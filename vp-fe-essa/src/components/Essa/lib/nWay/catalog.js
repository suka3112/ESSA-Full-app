/**
 * N-way validation — shared vocabulary.
 *
 * One rule answers six questions (agreed on the 25 Sep 2026 requirement call):
 *   1. What   – the data point            (dataPoint / dataKey)
 *   2. How    – the comparison type       (ruleType)
 *   3. Where  – Common or categories + when it runs (scope, categories, runCondition)
 *   4. Compare– source A, then each target B with a requirement (source, targets, compareMode)
 *   5. Pass   – threshold / tolerance / key (criteria)
 *   6. Fail   – what happens when it fails (onFail)
 *
 * The same codes are stored by the backend (AP_MATCH_RULE) — keep them in sync.
 */

/* ── Channels: where a source comes from ─────────────────────────────── */
export const CHANNELS = {
  VENDOR_PDF: {
    code: 'VENDOR_PDF',
    label: 'Vendor PDF',
    long: 'Vendor PDF bundle',
    help: 'Split and classified from the invoice bundle the vendor sends (“Source: Vendor” in the matrix).',
    tone: 'green'
  },
  SAP: {
    code: 'SAP',
    label: 'SAP',
    long: 'SAP',
    help: 'Pulled from SAP — PO master, GR/IR ledger, vendor master, posted invoices. No document needed.',
    tone: 'blue'
  },
  USER: {
    code: 'USER',
    label: 'User upload',
    long: 'User upload · SharePoint',
    help: 'Attached by the business user in SharePoint, e.g. the contract or engagement letter.',
    tone: 'violet'
  },
  EXTERNAL: {
    code: 'EXTERNAL',
    label: 'External portal',
    long: 'External portal',
    help: 'Looked up online, e.g. DJP Coretax for Faktur Pajak authenticity.',
    tone: 'rose'
  },
  ESSA_SYSTEM: {
    code: 'ESSA_SYSTEM',
    label: 'ESSA system',
    long: 'ESSA system',
    help: 'ESSA-owned systems such as the biometric Face ID attendance or HCIS.',
    tone: 'gray'
  }
}

/* ── Sources (documents and systems a value can be read from) ────────── */
/**
 * sectionKeys / ocrTypes tell the engine where to find extracted values
 * for this source on an invoice (see configDrivenExtractSections).
 */
export const SOURCES = [
  { code: 'INVOICE', label: 'Invoice', channel: 'VENDOR_PDF', sectionKeys: ['A_invoice', 'A_nonPoTravel'], ocrTypes: ['invoice', 'commercial_invoice'] },
  { code: 'FAKTUR_PAJAK', label: 'Faktur Pajak', channel: 'VENDOR_PDF', sectionKeys: ['B_taxInvoice'], ocrTypes: ['tax_invoice', 'faktur_pajak'] },
  { code: 'DELIVERY_NOTE', label: 'Delivery note', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['delivery_note', 'delivery_order', 'surat_jalan'] },
  { code: 'PACKING_LIST', label: 'Packing list', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['packing_list'] },
  { code: 'AIRWAY_BILL', label: 'Airway bill', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['awb', 'airway_bill'] },
  { code: 'SHIPPING_BILL', label: 'Shipping bill', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['bill_of_lading', 'shipping_bill'] },
  { code: 'BANK_GUARANTEE', label: 'Bank guarantee', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['bank_guarantee', 'performance_bond'] },
  { code: 'BAST', label: 'BAST / Work progress', channel: 'VENDOR_PDF', sectionKeys: ['D_beritaAcara'], ocrTypes: ['berita_acara', 'work_progress_certificate', 'bast'] },
  { code: 'TIMESHEET', label: 'Timesheet', channel: 'VENDOR_PDF', sectionKeys: ['F_timesheet'], ocrTypes: ['timesheet', 'daily_timesheet'] },
  { code: 'MANPOWER_SUMMARY', label: 'Manpower summary', channel: 'VENDOR_PDF', sectionKeys: ['E_manhourSummary'], ocrTypes: ['manhour_summary', 'summary_calculation_manhour'] },
  { code: 'OVERTIME_APPROVAL', label: 'Overtime approval', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['overtime_approval'] },
  { code: 'MEAL_ATTENDANCE', label: 'Meal attendance', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['monthly_meal_summary', 'pob_report', 'attendance_statistics'] },
  { code: 'BACK_CHARGE', label: 'Back-charge recap', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['back_charge'] },
  { code: 'BOQ', label: 'Bill of quantity', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['boq', 'bill_of_quantity', 'monthly_progress_report'] },
  { code: 'INSPECTION_REPORT', label: 'Inspection report', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['inspection_report'] },
  { code: 'PHOTO_EVIDENCE', label: 'Photo evidence', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['photo_evidence'] },
  { code: 'SIUJK', label: 'SIUJK permit', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['izin_usaha_jasa_konstruksi', 'sertifikat_badan_usaha', 'siujk'] },
  { code: 'BILLING_SUMMARY', label: 'Billing summary', channel: 'VENDOR_PDF', sectionKeys: [], ocrTypes: ['billing_summary', 'listing_invoice'] },
  { code: 'PO', label: 'PO', channel: 'SAP', sectionKeys: ['H_po', 'I_poAppendix'], ocrTypes: ['purchase_order', 'po'] },
  { code: 'GRN_SES', label: 'GRN / SES', channel: 'SAP', sectionKeys: ['K_ses'], ocrTypes: ['ses', 'service_entry_sheet', 'grn'] },
  { code: 'VENDOR_MASTER', label: 'Vendor master', channel: 'SAP', sectionKeys: [], ocrTypes: [] },
  { code: 'INVOICE_HISTORY', label: 'Invoice history', channel: 'SAP', sectionKeys: [], ocrTypes: [] },
  { code: 'CONTRACT', label: 'Contract', channel: 'USER', sectionKeys: [], ocrTypes: ['contract', 'engagement_letter'] },
  { code: 'CORETAX', label: 'Coretax (DJP)', channel: 'EXTERNAL', sectionKeys: [], ocrTypes: [] },
  { code: 'FACE_ID', label: 'Face ID attendance', channel: 'ESSA_SYSTEM', sectionKeys: ['G_attendance'], ocrTypes: ['attendance', 'daily_attendance'] },
  { code: 'HCIS', label: 'HCIS clearing', channel: 'ESSA_SYSTEM', sectionKeys: [], ocrTypes: ['hcis_clearing_journal'] },
  { code: 'DOA_APPROVAL', label: 'DOA approval', channel: 'ESSA_SYSTEM', sectionKeys: [], ocrTypes: [] }
]

export const SOURCE_BY_CODE = Object.fromEntries(SOURCES.map((s) => [s.code, s]))

export const sourceLabel = (code) => SOURCE_BY_CODE[code]?.label || code || '—'
export const sourceChannel = (code) => CHANNELS[SOURCE_BY_CODE[code]?.channel] || CHANNELS.VENDOR_PDF

/* ── Categories ───────────────────────────────────────────────────────── */
/**
 * invoiceTypeCodes: the app's detected invoice type codes that map onto
 * this business category (see api/essaInvoiceType.js).
 */
export const CATEGORIES = [
  { code: 'MATERIAL', label: 'Material', group: 'PO', services: false, receipt: 'GRN', poSeries: '4201, 4202', invoiceTypeCodes: ['MATERIAL_IMPORT', 'MATERIAL_LOCAL'] },
  { code: 'MANPOWER', label: 'Manpower outsourcing', group: 'PO', services: true, receipt: 'SES', poSeries: '4203', invoiceTypeCodes: ['MANPOWER_SERVICES'] },
  { code: 'CATERING', label: 'Catering', group: 'PO', services: true, receipt: 'SES', poSeries: '4203', invoiceTypeCodes: ['CAMP_SERVICE_AND_CATERING'] },
  { code: 'CIVIL', label: 'Civil works', group: 'PO', services: true, receipt: 'SES', poSeries: '4203', invoiceTypeCodes: ['CIVIL_CONTRACTOR'] },
  { code: 'HOUSEKEEPING', label: 'Housekeeping', group: 'PO', services: true, receipt: 'SES', poSeries: '4203', invoiceTypeCodes: ['HOUSEKEEPING'] },
  { code: 'RENTAL_EQUIPMENT', label: 'Rental equipment', group: 'PO', services: true, receipt: 'SES', poSeries: '4203', invoiceTypeCodes: ['RENTAL_EQUIPMENT'] },
  { code: 'IMPORT_LOGISTICS', label: 'Import logistics (PIB)', group: 'PO', services: false, receipt: 'GRN', poSeries: '', invoiceTypeCodes: [] },
  { code: 'DOMESTIC_LOGISTICS', label: 'Domestic logistics', group: 'PO', services: false, receipt: 'GRN', poSeries: '', invoiceTypeCodes: ['LOGISTICS'] },
  { code: 'CONSULTANT_TIME', label: 'Consultants · time based', group: 'PO', services: true, receipt: 'SES', poSeries: '', invoiceTypeCodes: [] },
  { code: 'CONSULTANT_MILESTONE', label: 'Consultants · milestone', group: 'PO', services: true, receipt: 'SES', poSeries: '', invoiceTypeCodes: [] },
  { code: 'MEDICAL', label: 'Medical services', group: 'PO', services: true, receipt: 'SES', poSeries: '', invoiceTypeCodes: [] },
  { code: 'SURVEILLANCE', label: 'Surveillance & inspection', group: 'PO', services: true, receipt: 'SES', poSeries: '', invoiceTypeCodes: [] },
  { code: 'TRAVEL', label: 'Travel', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: ['NON_PO'] },
  { code: 'HOTEL', label: 'Hotel', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] },
  { code: 'TELECOM', label: 'Telecom & internet', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] },
  { code: 'CSR', label: 'CSR / external relations', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] },
  { code: 'CORPORATE_CARD', label: 'Corporate credit card', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] },
  { code: 'MISC_EXPENSES', label: 'Misc. business expenses', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] },
  { code: 'EVENTS', label: 'Events & celebrations', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] },
  { code: 'EMPLOYEE_SETTLEMENT', label: 'Employee settlements', group: 'NON_PO', services: false, receipt: null, poSeries: '', invoiceTypeCodes: [] }
]

export const CATEGORY_BY_CODE = Object.fromEntries(CATEGORIES.map((c) => [c.code, c]))
export const SERVICE_CATEGORY_CODES = CATEGORIES.filter((c) => c.services).map((c) => c.code)
export const COMMON = 'COMMON'

export const categoryLabel = (code) =>
  code === COMMON ? 'Common rules' : CATEGORY_BY_CODE[code]?.label || code

/** Business category for an invoice-type code detected by the app. */
export const categoryForInvoiceType = (invoiceTypeCode) => {
  const code = String(invoiceTypeCode || '').toUpperCase()
  const hit = CATEGORIES.find((c) => c.invoiceTypeCodes.includes(code))
  return hit ? hit.code : null
}

/* ── Comparison types ─────────────────────────────────────────────────── */
export const RULE_TYPES = {
  EXACT: { code: 'EXACT', label: 'Exact', help: 'Values must be identical after normalisation (case, spaces, punctuation, legal suffixes).', tone: 'slate' },
  LOGICAL: { code: 'LOGICAL', label: 'Logical', help: 'AI judges whether the values mean the same thing (e.g. “PT Maju Jaya” vs “Maju Jaya Tbk”, NALCO 7408 vs the PO description). The prompt is preset in the backend.', tone: 'violet', ai: true },
  UNIQUENESS: { code: 'UNIQUENESS', label: 'Uniqueness', help: 'Checks the value has not been used before — usually against a DB history table.', tone: 'teal' },
  AUTHENTICITY: { code: 'AUTHENTICITY', label: 'Authenticity', help: 'Verifies the document is genuine (e.g. e-Faktur QR / barcode against DJP Coretax).', tone: 'rose' },
  CALCULATION: { code: 'CALCULATION', label: 'Calculation', help: 'Deterministic arithmetic — sums, amount ÷ qty, LD, advance recovery, due date. (Proposed: kept separate from Logical so money checks stay deterministic.)', tone: 'blue' },
  CALCULATION_TOLERANCE: { code: 'CALCULATION_TOLERANCE', label: 'Calculation / Tolerance', help: 'The system calculates the value, then the difference must fall within the % / amount limits.', tone: 'blue', base: ['CALCULATION', 'TOLERANCE'] },
  EXACT_UNIQUENESS: { code: 'EXACT_UNIQUENESS', label: 'Exact / Uniqueness', help: 'Values must be identical after normalisation, and the value must not have been used before.', tone: 'teal', base: ['EXACT', 'UNIQUENESS'] },
  TOLERANCE: { code: 'TOLERANCE', label: 'Tolerance', help: 'Numeric difference must fall within the % / amount limits.', tone: 'amber' },
  AUTHENTICATE: { code: 'AUTHENTICATE', label: 'Authenticate', help: 'Confirms the document was signed off by the right person (e.g. BAST approval per DOA).', tone: 'rose', base: ['AUTHENTICITY'] },
  AVAILABILITY: { code: 'AVAILABILITY', label: 'Availability only', help: 'Only checks that the document is present in the invoice package. Data point, target and validation type are not needed.', tone: 'gray', hidden: true }
}
export const RULE_TYPE_LIST = Object.values(RULE_TYPES).filter((t) => !t.hidden)

/** True when a rule type is, or combines, the given base type (e.g. CALCULATION_TOLERANCE has TOLERANCE). */
export const hasType = (ruleType, base) => ruleType === base || Boolean(RULE_TYPES[ruleType]?.base?.includes(base))
/** Types evaluated by the server integration (SAP, history or portal), not field-by-field. */
export const isServerType = (ruleType) => ['CALCULATION', 'UNIQUENESS', 'AUTHENTICITY'].some((b) => hasType(ruleType, b))

/* ── Match level ──────────────────────────────────────────────────────── */
export const MATCH_LEVELS = {
  HEADER: { code: 'HEADER', label: 'Header' },
  LINE: { code: 'LINE', label: 'Line item' },
  WORKER: { code: 'WORKER', label: 'Per worker' }
}

/* ── Tolerance application ────────────────────────────────────────────── */
export const TOLERANCE_APPLY = {
  LOWER: { code: 'LOWER', label: 'Whichever is lower' },
  HIGHER: { code: 'HIGHER', label: 'Whichever is higher' },
  PCT: { code: 'PCT', label: '% only' },
  AMOUNT: { code: 'AMOUNT', label: 'Amount only' }
}
export const MEASURED_ON = {
  TARGET: { code: 'TARGET', label: 'Target value' },
  SOURCE: { code: 'SOURCE', label: 'Source (anchor) value' }
}

/* ── Rule groups (matrix sections) ────────────────────────────────────── */
export const RULE_GROUPS = {
  IDENTITY: { code: 'IDENTITY', label: 'Identity & references' },
  COMMERCIAL: { code: 'COMMERCIAL', label: 'Commercial terms' },
  QUANTITY: { code: 'QUANTITY', label: 'Period & quantity' },
  AMOUNTS: { code: 'AMOUNTS', label: 'Amounts & tax' },
  CONTROLS: { code: 'CONTROLS', label: 'Controls & compliance' },
  DOCUMENTS: { code: 'DOCUMENTS', label: 'Document presence' }
}
export const RULE_GROUP_LIST = Object.values(RULE_GROUPS)

const GROUP_BY_DATA_KEY = {
  vendor_name: 'IDENTITY', npwp: 'IDENTITY', po_number: 'IDENTITY', invoice_number: 'IDENTITY', company_name: 'IDENTITY', ses_reference: 'IDENTITY', fp_number: 'IDENTITY', bank_account: 'IDENTITY', worker_id: 'IDENTITY',
  currency: 'COMMERCIAL', payment_terms: 'COMMERCIAL', unit_rate: 'COMMERCIAL', uom: 'COMMERCIAL', item_description: 'COMMERCIAL', wht_code: 'COMMERCIAL',
  quantity: 'QUANTITY', manhours: 'QUANTITY', man_days: 'QUANTITY', overtime_hours: 'QUANTITY', service_period: 'QUANTITY', percent_complete: 'QUANTITY', manpower_category: 'QUANTITY', invoice_date: 'QUANTITY', fp_date: 'QUANTITY',
  invoice_amount: 'AMOUNTS', claim_value: 'AMOUNTS', dpp: 'AMOUNTS', fp_value: 'AMOUNTS', calc_amount: 'AMOUNTS', bank_guarantee: 'AMOUNTS',
  vendor_status: 'CONTROLS', debit_balance: 'CONTROLS'
}

export const groupForRule = (rule) => {
  if (rule?.group && RULE_GROUPS[rule.group]) return rule.group
  if (rule?.ruleType === 'AVAILABILITY') return 'DOCUMENTS'
  if (['UNIQUENESS', 'AUTHENTICITY', 'AUTHENTICATE'].includes(rule?.ruleType)) return 'CONTROLS'
  return GROUP_BY_DATA_KEY[rule?.dataKey] || 'CONTROLS'
}

/* ── Requirement of a target ──────────────────────────────────────────── */
export const REQUIREMENTS = {
  REQUIRED: { code: 'REQUIRED', label: 'Mandatory', short: 'M', help: 'Compare against the anchor. Missing or different fails the rule.' },
  PARTIAL: { code: 'PARTIAL', label: 'Partial', short: 'P', help: 'Only part of the value appears on this document — matched as “contains”.', hidden: true },
  IF_PRESENT: { code: 'IF_PRESENT', label: 'Optional', short: 'O', help: 'Compared only when the document is in the bundle.' },
  EXTRACT: { code: 'EXTRACT', label: 'Available', short: 'AV', help: 'Must be in the bundle; captured for context (shown to the reviewer), not compared.' }
}
export const REQUIREMENT_LIST = Object.values(REQUIREMENTS).filter((r) => !r.hidden)
export const isCompareRole = (req) => req !== 'EXTRACT'

/* ── Compare modes ────────────────────────────────────────────────────── */
export const COMPARE_MODES = {
  ONE_TO_ALL: { code: 'ONE_TO_ALL', label: 'One source vs all', help: 'Read the value once from the source, then compare it with each document.' },
  STEPWISE: { code: 'STEPWISE', label: 'Step by step', help: 'Each step compares two documents in order (A→B, B→C). Every required step must pass.' }
}

/* ── What happens on fail ─────────────────────────────────────────────── */
export const FAIL_ACTIONS = {
  BLOCK: { code: 'BLOCK', label: 'Exception + block', help: 'Raise exception (email the AP team) and block — invoice is saved as draft and cannot move to posting.', tone: 'error' },
  REVIEW: { code: 'REVIEW', label: 'Raise exception', help: 'Email the AP team; the reviewer decides. Invoice goes to the exception queue.', tone: 'warn' },
  CALCULATE: { code: 'CALCULATE', label: 'Calculate + exception', help: 'System calculates the amount (LD, advance recovery); the AP user validates it before parking.', tone: 'info' },
  APPROVAL: { code: 'APPROVAL', label: 'Trigger approval', help: 'Start the Teams approval flow (e.g. BAST per DOA), then re-check.', tone: 'violet' },
  REPORT: { code: 'REPORT', label: 'No impact', help: 'Email sent; invoice saved as ready for posting. Used for reporting (e.g. due / overdue).', tone: 'neutral' }
}
export const FAIL_ACTION_LIST = Object.values(FAIL_ACTIONS)

/* ── Rule status ──────────────────────────────────────────────────────── */
export const RULE_STATUSES = {
  ACTIVE: { code: 'ACTIVE', label: 'Active', tone: 'pass' },
  CONFIRM: { code: 'CONFIRM', label: 'Needs confirmation', tone: 'warn' },
  DRAFT: { code: 'DRAFT', label: 'Draft', tone: 'neutral' },
  INACTIVE: { code: 'INACTIVE', label: 'Inactive', tone: 'neutral' }
}

/* ── Run conditions ───────────────────────────────────────────────────── */
export const RUN_CONDITIONS = {
  ALWAYS: { code: 'ALWAYS', label: 'Always' },
  PO_CLAUSE: { code: 'PO_CLAUSE', label: 'Only when the PO has the clause' },
  DOC_PRESENT: { code: 'DOC_PRESENT', label: 'Only when the source document is present' },
  CUSTOM: { code: 'CUSTOM', label: 'Custom condition' }
}

/* ── Data points: field-name patterns used to find values ─────────────── */
/**
 * keys   – exact field keys (normalised: lower-case, non-alphanumerics removed)
 * match  – regex tested against normalised field key + label
 * kind   – value kind used for normalisation (text | number | date | id | name)
 */
export const DATA_POINTS = {
  vendor_name: { label: 'Vendor name', kind: 'name', keys: ['vendorname', 'suppliername', 'sellername', 'namapenjual', 'pengusahakenapajak'], match: /vendor.?name|supplier.?name|seller.?name|nama.?penjual|pengusaha.?kena.?pajak/ },
  bank_account: { label: 'Bank account', kind: 'id', keys: ['bankaccount', 'bankaccountnumber', 'accountnumber', 'norekening'], match: /bank.?account|account.?(no|number)|rekening/ },
  invoice_date: { label: 'Invoice date', kind: 'date', keys: ['invoicedate', 'tanggalinvoice', 'date'], match: /invoice.?date|tanggal.?(invoice|faktur)|^date$/ },
  po_number: { label: 'PO number', kind: 'id', keys: ['ponumber', 'pono', 'purchaseorder', 'purchaseordernumber'], match: /po.?(no|number)|purchase.?order/ },
  invoice_number: { label: 'Invoice number', kind: 'id', keys: ['invoicenumber', 'invoiceno', 'nomorinvoice', 'referensi'], match: /invoice.?(no|number)|nomor.?invoice|referensi/ },
  unit_rate: { label: 'Unit rate', kind: 'number', keys: ['unitrate', 'unitprice', 'rate', 'hargasatuan'], match: /unit.?(rate|price)|harga.?satuan/ },
  payment_terms: { label: 'Payment terms', kind: 'text', keys: ['paymentterms', 'termofpayment'], match: /payment.?term|term.?of.?payment/ },
  invoice_amount: { label: 'Invoice amount', kind: 'number', keys: ['totalamount', 'invoiceamount', 'grandtotal', 'amount', 'total'], match: /grand.?total|total.?amount|invoice.?amount|^amount$|^total$/ },
  item_description: { label: 'Item description', kind: 'text', keys: ['itemdescription', 'description', 'servicename', 'namabarang'], match: /description|service.?name|nama.?barang|uraian/ },
  quantity: { label: 'Quantity', kind: 'number', keys: ['quantity', 'qty', 'totalquantity'], match: /quantity|^qty/ },
  company_name: { label: 'ESSA company name', kind: 'name', keys: ['buyername', 'customername', 'billto', 'companyname', 'pembeli'], match: /buyer|customer.?name|bill.?to|pembeli|company.?name/ },
  npwp: { label: 'Vendor NPWP', kind: 'id', keys: ['npwp', 'vendornpwp', 'sellernpwp', 'taxid'], match: /npwp|tax.?id/ },
  fp_value: { label: 'Faktur Pajak value', kind: 'number', keys: ['taxamount', 'vatamount', 'ppn', 'totalppn'], match: /tax.?amount|vat.?amount|ppn/ },
  fp_date: { label: 'Faktur Pajak date', kind: 'date', keys: ['taxinvoicedate', 'fakturdate', 'tanggalfaktur'], match: /tax.?invoice.?date|faktur.?date|tanggal.?faktur/ },
  fp_number: { label: 'Faktur Pajak number', kind: 'id', keys: ['taxinvoicenumber', 'fakturnumber', 'nomorseri', 'nsfp'], match: /tax.?invoice.?(no|number)|faktur.?(no|number)|nomor.?seri|nsfp/ },
  currency: { label: 'Currency', kind: 'id', keys: ['currency', 'currencycode', 'matauang'], match: /currency|mata.?uang/ },
  dpp: { label: 'DPP (taxable base)', kind: 'number', keys: ['dpp', 'taxbase', 'subtotal'], match: /dpp|tax.?base|sub.?total/ },
  percent_complete: { label: 'Percentage completion', kind: 'number', keys: ['percentcomplete', 'progress', 'progresspercent', 'thisperiodprogress'], match: /percent|progress|%/ },
  manhours: { label: 'Man-hours', kind: 'number', keys: ['manhours', 'thismanhours', 'totalmanhours', 'regularmanhours'], match: /man.?hours?|manhour/ },
  overtime_hours: { label: 'Overtime hours', kind: 'number', keys: ['overtimehours', 'overtimemanhours', 'othours'], match: /overtime|ot.?hours/ },
  wht_code: { label: 'Withholding tax code', kind: 'id', keys: ['whtcode', 'withholdingtaxcode', 'pphcode', 'whttype'], match: /wht|withholding|pph/ },
  vendor_status: { label: 'Vendor block indicator', kind: 'id', keys: ['vendorstatus', 'blockindicator'], match: /block.?indicator|negative.?list/ },
  debit_balance: { label: 'Vendor debit balance', kind: 'number', keys: ['debitbalance', 'openbalance'], match: /debit.?balance|open.?balance/ },
  service_period: { label: 'Service period', kind: 'text', keys: ['serviceperiod', 'period', 'workperiod'], match: /service.?period|work.?period|periode/ },
  bank_guarantee: { label: 'Bank guarantee', kind: 'number', keys: ['guaranteeamount', 'bondamount'], match: /guarantee|bond/ },
  calc_amount: { label: 'Calculated amount', kind: 'number', keys: [], match: /^$/ },
  uom: { label: 'Unit of measure', kind: 'text', keys: ['uom', 'unitofmeasure', 'unit', 'satuan'], match: /\buom\b|unit.?of.?measure|satuan/ },
  ses_reference: { label: 'SES number / reference', kind: 'id', keys: ['sesnumber', 'sesno', 'sesreference', 'fmxdocnr'], match: /ses.?(no|number|ref)|service.?entry/ },
  worker_id: { label: 'Worker name & ID', kind: 'name', keys: ['workername', 'workerid', 'employeename', 'employeeid'], match: /worker|employee/ },
  manpower_category: { label: 'Manpower category', kind: 'text', keys: ['manpowercategory', 'designation', 'category', 'role'], match: /manpower.?category|designation|jabatan/ },
  man_days: { label: 'Man-days', kind: 'number', keys: ['mandays', 'totalmandays', 'totalworkingdays', 'workingdays'], match: /man.?days?|working.?days/ },
  claim_value: { label: 'Claim value', kind: 'number', keys: ['subtotal', 'totalclaimamount', 'certifiedvalue', 'sesvalue', 'dpp'], match: /sub.?total|claim|certified.?value|ses.?value/ }
}

export const DATA_POINT_OPTIONS = Object.entries(DATA_POINTS).map(([key, v]) => ({ value: key, label: v.label }))
