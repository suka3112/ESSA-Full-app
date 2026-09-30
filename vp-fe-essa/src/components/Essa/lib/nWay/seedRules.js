/**
 * Default N-Way matching rule set.
 *
 * Sources
 *  - "8. Data Point x Doc Matrix" (V2 tab) — rule keys 1.xx / 2.xx … follow its row numbers
 *  - 25 Sep 2026 requirement call (Nitish Sharma, Vishweshwar, Robinson, Pranay):
 *      every rule names its anchor (A) and what it is compared with; biometric → Manpower,
 *      BOQ → Civil, date sequence / % completion / BAST approval → service categories;
 *      bank guarantee required; NPWP / FP value / FP date anchored on the Faktur Pajak;
 *      WHT anchored on the PO; debit balance > 0 → exception; due date never holds;
 *      1.33 “bank account changed” merged into 1.02
 *  - N-Way design (Sabrina): Anchor / Compare / Extract roles, per-document field refs
 *    (#nn = Data Point x Doc Matrix row), match level, tolerance “whichever is lower”,
 *    Manpower rule set (3.xx) and Q-register decisions (Q-029, Q-035, Q-053)
 *
 * The backend seeds AP_MATCH_RULE from the same list
 * (vp-be-essa/src/json/matchRulesSeed.json) — regenerate that file when this changes.
 */
import { SERVICE_CATEGORY_CODES } from './catalog'

const NITISH = 'Nitish Sharma · 25 Sep 2026'
const VISH = 'Vishweshwar · 25 Sep 2026'
const SABRINA = 'N-Way design (Sabrina)'

/** Operand: document + role + the field it is read from on that document. */
const t = (doc, requirement = 'REQUIRED', field = '') => ({ doc, requirement, field })

const rule = (ruleKey, dataPoint, dataKey, ruleType, source, targets, extra = {}) => ({
  ruleKey,
  dataPoint,
  dataKey,
  ruleType,
  group: extra.group || null,
  scope: extra.categories ? 'CATEGORY' : 'COMMON',
  categories: extra.categories || [],
  disabledCategories: [],
  source,
  sourceField: extra.sourceField || '',
  targets,
  compareMode: extra.compareMode || 'ONE_TO_ALL',
  matchLevel: extra.level || 'HEADER',
  mandatory: extra.mandatory !== false,
  criteria: {
    similarity: null,
    aiConfidence: null,
    tolerancePct: null,
    toleranceAmount: null,
    combine: 'HIGHER',
    measuredOn: 'TARGET',
    uniqueKey: [],
    ...(extra.criteria || {})
  },
  criteriaText: extra.criteriaText || '',
  runCondition: extra.runCondition || { type: 'ALWAYS', text: '' },
  onFail: extra.onFail || 'REVIEW',
  status: extra.status || 'ACTIVE',
  businessNote: extra.note || '',
  noteBy: extra.by || '',
  confirmWith: extra.confirmWith || '',
  linkedCheck: extra.linkedCheck || null,
  serverSide: Boolean(extra.serverSide),
  refs: extra.refs || '',
  displayOrder: 0
})

const clause = (text) => ({ type: 'PO_CLAUSE', text })
const when = (text) => ({ type: 'CUSTOM', text })

export const SEED_MATCH_RULES = [
  /* ── Common · identity & references ─────────────────────────────────── */
  rule('1.01', 'Vendor name', 'vendor_name', 'EXACT', 'INVOICE', [t('FAKTUR_PAJAK', 'REQUIRED', '#52 Seller name & NPWP'), t('PO', 'REQUIRED', '#25 Vendor code & name'), t('VENDOR_MASTER', 'REQUIRED', 'vendor_name (LFA1)')], {
    sourceField: '#1 Vendor name',
    refs: '#1 · #25 · #52',
    criteriaText: 'Same name after normalising case, spacing and legal suffix (PT, CV, Tbk).',
    note: 'Invoice vendor name must match the Faktur Pajak vendor and the SAP vendor master.',
    by: NITISH,
    linkedCheck: 'VENDOR_PO_INVOICE',
    onFail: 'BLOCK'
  }),
  rule('1.02', 'Vendor bank account', 'bank_account', 'EXACT', 'INVOICE', [t('VENDOR_MASTER', 'REQUIRED', 'bank_account (LFBK)')], {
    onFail: 'BLOCK',
    criteriaText: 'Account number equals the account on file in SAP (LFBK), ignoring spaces and dashes.',
    note: 'SAP would still allow posting — the platform must stop it. Vendor master is enough; no payment-history lookup. (Replaces 1.33 “bank account changed since last payment”.)',
    by: NITISH,
    linkedCheck: 'BANK_VENDOR_MASTER'
  }),
  rule('1.04', 'PO number', 'po_number', 'EXACT', 'PO', [
    t('INVOICE', 'REQUIRED', '#7 PO number'),
    t('GRN_SES', 'REQUIRED', '#41 PO number & line item'),
    t('BAST', 'IF_PRESENT', '#41 PO number & line item'),
    t('TIMESHEET', 'IF_PRESENT', '#7 PO number'),
    t('MANPOWER_SUMMARY', 'IF_PRESENT', '#41 PO number & line item'),
    t('CONTRACT', 'IF_PRESENT')
  ], {
    sourceField: '#7 PO number',
    refs: '#7 · #41',
    onFail: 'BLOCK',
    criteriaText: 'PO exists and is open in PO master; every document cites the same PO. Single PO per invoice (Q-029).',
    linkedCheck: 'PO_NUMBER_MASTER'
  }),
  rule('1.05', 'Invoice number on Faktur Pajak', 'invoice_number', 'EXACT', 'INVOICE', [t('FAKTUR_PAJAK', 'REQUIRED', '#56 Referenced invoice number')], {
    sourceField: '#5 Invoice number',
    refs: '#5 · #56',
    onFail: 'BLOCK',
    criteriaText: 'Case / space insensitive.',
    by: SABRINA
  }),
  rule('1.11', 'ESSA legal entity & NPWP', 'company_name', 'EXACT', 'PO', [t('INVOICE', 'REQUIRED', '#19 ESSA legal entity name & NPWP'), t('FAKTUR_PAJAK', 'REQUIRED', '#53 Buyer name & NPWP'), t('CONTRACT', 'IF_PRESENT', '#24 ESSA legal entity')], {
    sourceField: '#24 ESSA legal entity',
    refs: '#19 · #24 · #53',
    onFail: 'BLOCK',
    criteriaText: 'Entity code + NPWP match.',
    by: SABRINA
  }),
  rule('1.12', 'Vendor NPWP', 'npwp', 'EXACT', 'FAKTUR_PAJAK', [t('VENDOR_MASTER', 'REQUIRED', 'vendor_npwp'), t('INVOICE', 'IF_PRESENT', '#3 Vendor NPWP')], {
    sourceField: '#52 Seller NPWP',
    refs: '#3 · #52',
    onFail: 'BLOCK',
    criteriaText: 'Digits only, zero difference.',
    note: 'NPWP is only guaranteed on the Faktur Pajak, so the Faktur Pajak is the anchor. No portal check needed.',
    by: NITISH
  }),
  rule('1.15', 'Faktur Pajak vendor name', 'vendor_name', 'EXACT', 'FAKTUR_PAJAK', [t('INVOICE', 'REQUIRED', '#1 Vendor name'), t('VENDOR_MASTER', 'REQUIRED', 'vendor_name')], {
    sourceField: '#52 Seller name',
    criteriaText: 'Seller name on the Faktur Pajak matches the invoice vendor and vendor master.',
    by: NITISH
  }),

  /* ── Common · commercial terms ──────────────────────────────────────── */
  rule('1.26', 'Currency', 'currency', 'EXACT', 'PO', [t('INVOICE', 'REQUIRED', '#8 Currency')], {
    sourceField: '#8 Currency',
    refs: '#8',
    onFail: 'BLOCK',
    criteriaText: 'ISO code.'
  }),
  rule('1.07', 'Payment terms', 'payment_terms', 'LOGICAL', 'PO', [t('INVOICE', 'REQUIRED', '#18 Payment terms'), t('CONTRACT', 'IF_PRESENT', '#18 Payment terms')], {
    sourceField: '#18 Payment terms',
    refs: '#18',
    criteriaText: 'Map invoice text to the SAP baseline code (DAIM…DZ20).'
  }),
  rule('1.06', 'Unit rate', 'unit_rate', 'EXACT', 'INVOICE', [t('PO', 'REQUIRED', '#12 Unit rate'), t('CONTRACT', 'IF_PRESENT', 'Unit rates')], {
    sourceField: '#12 Unit rate',
    refs: '#12',
    level: 'LINE',
    criteriaText: 'Invoice unit rate equals the PO net price. When a pack size is shown, the rate applies to quantity × pack size.',
    runCondition: when('Lines with a quantity and a rate. Lump-sum lines with neither go straight to exception.'),
    note: 'Example: 240 packs × 25 kg × IDR 14,000 = IDR 84,000,000 (Ecolab). Quantity 1 means the amount is the unit rate.',
    by: NITISH,
    linkedCheck: 'RATE_VALIDATION'
  }),
  rule('1.09', 'Item description', 'item_description', 'LOGICAL', 'INVOICE', [t('PO'), t('GRN_SES'), t('FAKTUR_PAJAK'), t('DELIVERY_NOTE', 'IF_PRESENT'), t('PACKING_LIST', 'IF_PRESENT')], {
    level: 'LINE',
    criteria: { similarity: 65 },
    criteriaText: 'AI judges the invoice line describes the PO line — any words from the PO description may appear. Treat 60–70% as a match.',
    note: 'Vendor and ESSA naming differ (“NALCO 7408” vs “Chemical industrial sodium metabisulfite”). Fewer than 5% of invoices should fall to exception. The GRN check picks the right line when two lines share price and quantity.',
    by: NITISH
  }),
  rule('1.29', 'Withholding tax type & rate', 'wht_code', 'EXACT', 'PO', [t('VENDOR_MASTER', 'REQUIRED', 'WHT code + SKB'), t('CONTRACT', 'IF_PRESENT')], {
    onFail: 'BLOCK',
    status: 'CONFIRM',
    confirmWith: 'Nitish Sharma',
    criteriaText: 'WHT code on the PO maps (via the WHT matrix) to the vendor-master WHT setting.',
    note: 'The PO is the anchor, not the invoice. Contract marked optional — to be confirmed.',
    by: NITISH
  }),

  /* ── Common · period & quantity ─────────────────────────────────────── */
  rule('1.03', 'Invoice date', 'invoice_date', 'EXACT', 'INVOICE', [t('FAKTUR_PAJAK')], {
    criteriaText: 'Invoice date equals the Faktur Pajak date.'
  }),
  rule('1.14', 'Faktur Pajak date', 'fp_date', 'EXACT', 'FAKTUR_PAJAK', [t('INVOICE')], {
    criteriaText: 'Faktur Pajak date equals the invoice date. Not checked on the portal.',
    by: NITISH
  }),
  rule('1.10', 'Quantity', 'quantity', 'EXACT', 'INVOICE', [t('PO'), t('GRN_SES'), t('DELIVERY_NOTE', 'IF_PRESENT'), t('PACKING_LIST', 'IF_PRESENT')], {
    sourceField: '#10 Quantity',
    level: 'LINE',
    criteriaText: 'Invoice quantity equals the received quantity (GRN for goods, SES for services) and is within PO open quantity.',
    linkedCheck: 'QTY_RECONCILIATION'
  }),

  /* ── Common · amounts & tax ─────────────────────────────────────────── */
  rule('1.08', 'Invoice amount', 'invoice_amount', 'CALCULATION', 'INVOICE', [t('PO'), t('FAKTUR_PAJAK')], {
    onFail: 'BLOCK',
    criteriaText: 'Quantity × unit rate equals the invoice amount and does not exceed the PO open value (0% tolerance).',
    note: 'Vendor master does not hold invoice amounts — removed from the vendor master column.',
    by: NITISH,
    linkedCheck: 'PO_VALUE_ZERO_TOLERANCE'
  }),
  rule('1.13', 'Faktur Pajak value', 'fp_value', 'EXACT', 'FAKTUR_PAJAK', [t('INVOICE', 'REQUIRED', '#15 PPN amount')], {
    sourceField: '#15 PPN amount',
    refs: '#15',
    onFail: 'BLOCK',
    runCondition: when('Vendor is PKP.'),
    criteriaText: '2 decimals, no tolerance (Q-035).',
    note: 'Validated against the invoice only — the portal is not needed for the value.',
    by: NITISH,
    linkedCheck: 'TAX_INVOICE_MATCH'
  }),
  rule('1.28', 'DPP (tax base)', 'dpp', 'EXACT', 'INVOICE', [t('FAKTUR_PAJAK', 'REQUIRED', '#54 DPP (tax base)'), t('CORETAX', 'IF_PRESENT')], {
    sourceField: '#14 Sub-total (DPP)',
    refs: '#14 · #54',
    onFail: 'BLOCK',
    runCondition: when('Vendor is PKP.'),
    criteriaText: '2 decimals, no tolerance (Q-035). DPP × PPN rate must equal the Faktur Pajak PPN.',
    by: SABRINA
  }),
  rule('1.20', 'Liquidated damages', 'calc_amount', 'CALCULATION', 'PO', [t('BAST', 'IF_PRESENT'), t('CONTRACT', 'IF_PRESENT')], {
    onFail: 'CALCULATE',
    runCondition: clause('Only when the PO has an LD clause. If the PO says “refer to contract”, the contract is read instead.'),
    criteriaText: 'Delay = actual completion or delivery date − baseline date; penalty from the LD matrix.',
    note: 'LD must be validated by the AP user before the invoice is parked.',
    by: NITISH,
    linkedCheck: 'LATE_DELIVERY_LD'
  }),
  rule('1.21', 'Retention', 'calc_amount', 'CALCULATION', 'PO', [t('INVOICE'), t('CONTRACT', 'IF_PRESENT')], {
    onFail: 'CALCULATE',
    runCondition: clause('Only when the PO has a retention clause.'),
    criteriaText: 'Retention % from the PO is held on every invoice until the defect liability period ends.',
    by: NITISH,
    linkedCheck: 'ADVANCE_RETENTION'
  }),
  rule('1.22', 'Advance recovery', 'calc_amount', 'CALCULATION', 'PO', [t('INVOICE'), t('CONTRACT', 'IF_PRESENT')], {
    onFail: 'CALCULATE',
    runCondition: clause('Only when the PO has an advance-recovery clause.'),
    criteriaText: 'Recovery is spread equally across milestones and the invoice shows the deduction.',
    note: 'If the vendor did not deduct it, calculate the amount and raise an exception.',
    by: NITISH,
    linkedCheck: 'ADVANCE_RETENTION'
  }),
  rule('1.27', 'Exchange rate applied', 'calc_amount', 'TOLERANCE', 'INVOICE', [], {
    status: 'CONFIRM',
    confirmWith: 'Nitish Sharma',
    criteria: { tolerancePct: 1, combine: 'PCT' },
    runCondition: when('Invoice currency is not IDR.'),
    criteriaText: 'Rate within 1% of the BI middle rate for the posting date (placeholder tolerance).',
    note: 'Exchange rate appears on the invoice only, not on the Faktur Pajak.',
    by: NITISH,
    serverSide: true
  }),
  rule('1.30', 'Baseline & due date', 'calc_amount', 'CALCULATION', 'PO', [t('GRN_SES'), t('INVOICE')], {
    onFail: 'REPORT',
    criteriaText: 'Due date from the payment-terms matrix, e.g. GRN date + 30 days.',
    note: 'Even if the baseline date is not reached, the invoice is processed and sent to SAP. Used for due / overdue reports.',
    by: NITISH
  }),
  rule('1.32', 'PO remaining balance', 'calc_amount', 'CALCULATION', 'INVOICE', [t('PO'), t('GRN_SES')], {
    onFail: 'REPORT',
    criteriaText: 'Remaining PO quantity and value after this invoice; reported for long-term POs.',
    by: NITISH
  }),

  /* ── Common · controls ──────────────────────────────────────────────── */
  rule('1.17', 'Faktur Pajak authenticity', 'fp_number', 'AUTHENTICITY', 'FAKTUR_PAJAK', [t('CORETAX')], {
    onFail: 'BLOCK',
    status: 'CONFIRM',
    confirmWith: 'Pranay Patadiya',
    criteriaText: 'Barcode / QR lookup on Coretax returns the same Faktur Pajak number, vendor name and NPWP.',
    note: 'Done manually today by scanning the barcode into the SAP draft invoice. Confirm the portal integration is in the original scope.',
    by: VISH
  }),
  rule('1.18', 'Negative vendor list', 'vendor_status', 'EXACT', 'VENDOR_MASTER', [], {
    onFail: 'BLOCK',
    criteriaText: 'Vendor must not carry the negative-list / block indicator in vendor master.'
  }),
  rule('1.19', 'Vendor debit balance', 'debit_balance', 'LOGICAL', 'VENDOR_MASTER', [], {
    criteriaText: 'Open debit balance in the vendor ledger (FBL1N) greater than 0 raises an exception.',
    note: 'Advances, deposits, or VAT to recover from a negative-list vendor.',
    by: NITISH,
    serverSide: true
  }),
  rule('1.24', 'Duplicate invoice', 'invoice_number', 'UNIQUENESS', 'INVOICE', [t('INVOICE_HISTORY')], {
    onFail: 'BLOCK',
    criteria: { uniqueKey: ['vendor_name', 'invoice_number', 'invoice_amount', 'invoice_date'] },
    criteriaText: 'Vendor + invoice number + amount + date must not exist among posted invoices.'
  }),
  rule('1.25', 'Duplicate Faktur Pajak', 'fp_number', 'UNIQUENESS', 'FAKTUR_PAJAK', [t('INVOICE_HISTORY')], {
    onFail: 'BLOCK',
    criteria: { uniqueKey: ['fp_number'] },
    criteriaText: 'Faktur Pajak number is not already booked in SAP (also covers 1.16 FP number uniqueness).'
  }),

  /* ── Services (moved out of Common on 25 Sep) ───────────────────────── */
  rule('1.23', 'Percentage completion', 'percent_complete', 'TOLERANCE', 'BAST', [t('GRN_SES'), t('INVOICE')], {
    categories: SERVICE_CATEGORY_CODES,
    compareMode: 'STEPWISE',
    criteria: { tolerancePct: 5, toleranceAmount: 200000, combine: 'HIGHER' },
    runCondition: when('Only when the PO is progress-billed.'),
    criteriaText: 'Step 1: BAST vs service entry sheet. Step 2: service entry sheet vs invoice. Within 5% or IDR 200,000.',
    note: '“Validation is BAST vs service entry sheet, then service entry sheet vs invoice. If it is within the tolerance we can create the park document.”',
    by: NITISH,
    linkedCheck: 'SES_DEVIATION'
  }),
  rule('1.31', 'Date sequence', 'service_period', 'LOGICAL', 'BAST', [t('GRN_SES'), t('INVOICE'), t('FAKTUR_PAJAK')], {
    categories: SERVICE_CATEGORY_CODES,
    compareMode: 'STEPWISE',
    criteriaText: 'Service period ≤ SES date ≤ invoice date, and the Faktur Pajak is within its 3-month validity.',
    note: 'Needed to make sure the Faktur Pajak has not expired (valid 3 months from the month issued).',
    by: NITISH,
    serverSide: true
  }),
  rule('S.01', 'BAST management approval', 'calc_amount', 'AUTHENTICITY', 'BAST', [t('DOA_APPROVAL')], {
    categories: SERVICE_CATEGORY_CODES,
    onFail: 'APPROVAL',
    criteriaText: 'Management / functional approval of the BAST is received (per DOA).',
    note: 'BAST is sent through Teams for approval via Avensys; we validate the approvals are received.',
    by: NITISH
  }),

  /* ── Material ───────────────────────────────────────────────────────── */
  rule('2.02', 'Airway / shipping bill date', 'invoice_date', 'EXACT', 'AIRWAY_BILL', [t('SHIPPING_BILL', 'IF_PRESENT')], {
    categories: ['MATERIAL'],
    runCondition: { type: 'DOC_PRESENT', text: 'Imported material only.' },
    criteriaText: 'Dates on the airway bill and shipping bill match.'
  }),
  rule('2.03', 'Airway / shipping bill name', 'vendor_name', 'EXACT', 'AIRWAY_BILL', [t('INVOICE'), t('PO'), t('SHIPPING_BILL', 'IF_PRESENT')], {
    categories: ['MATERIAL'],
    runCondition: { type: 'DOC_PRESENT', text: 'Imported material only.' },
    criteriaText: 'Shipper / consignee name matches the invoice and PO.'
  }),
  rule('2.04', 'Bank guarantee expiry', 'bank_guarantee', 'EXACT', 'PO', [t('BANK_GUARANTEE'), t('CONTRACT', 'IF_PRESENT')], {
    categories: ['MATERIAL'],
    runCondition: clause('When the PO requires a guarantee.'),
    criteriaText: 'Guarantee is valid until at least the date the PO requires.',
    note: 'Bank guarantee is required, not optional — exact match.',
    by: NITISH
  }),
  rule('2.05', 'Bank guarantee amount', 'bank_guarantee', 'EXACT', 'PO', [t('BANK_GUARANTEE'), t('CONTRACT', 'IF_PRESENT')], {
    categories: ['MATERIAL'],
    runCondition: clause('When the PO requires a guarantee.'),
    criteriaText: 'Guarantee amount equals the amount the PO requires.',
    by: NITISH
  }),

  /* ── Manpower outsourcing (N-Way design · Sabrina) ──────────────────── */
  rule('3.06', 'SES ↔ BAST reference', 'ses_reference', 'EXACT', 'GRN_SES', [t('BAST', 'REQUIRED', '#178 SES reference')], {
    categories: ['MANPOWER'],
    sourceField: '#209 SES number (FMXDOCNR)',
    refs: '#178 · #209 · #218',
    onFail: 'BLOCK',
    criteriaText: 'BAST must cite the SES used.',
    by: SABRINA
  }),
  rule('3.07', 'Unit of measure', 'uom', 'LOGICAL', 'PO', [t('INVOICE', 'REQUIRED', '#11 UoM'), t('GRN_SES', 'REQUIRED', '#11 UoM')], {
    categories: ['MANPOWER'],
    sourceField: '#11 UoM',
    refs: '#11',
    level: 'LINE',
    criteriaText: 'UoM synonym table (MD / man-day / HARI).',
    by: SABRINA
  }),
  rule('3.02', 'Unit rate per manpower category', 'unit_rate', 'EXACT', 'PO', [
    t('INVOICE', 'REQUIRED', '#12 Unit rate'),
    t('GRN_SES', 'REQUIRED', '#12 Unit rate'),
    t('MANPOWER_SUMMARY', 'REQUIRED', '#201 Unit rate per category (PO rate)'),
    t('CONTRACT', 'EXTRACT', '#164 Unit rates per category')
  ], {
    categories: ['MANPOWER'],
    sourceField: '#12 Unit rate',
    refs: '#12 · #164 · #201',
    level: 'LINE',
    onFail: 'BLOCK',
    runCondition: when('Per manpower category line.'),
    criteriaText: '0% — per category line.',
    by: SABRINA,
    linkedCheck: 'RATE_VALIDATION'
  }),
  rule('3.08', 'Derived rate vs PO rate', 'unit_rate', 'CALCULATION', 'PO', [t('MANPOWER_SUMMARY', 'REQUIRED', '#207 Derived unit rate (amount ÷ qty)')], {
    categories: ['MANPOWER'],
    sourceField: '#12 Unit rate',
    refs: '#207 · #208',
    level: 'LINE',
    onFail: 'BLOCK',
    runCondition: when('Per manpower category line.'),
    criteriaText: 'Recompute amount ÷ qty, 0% variance.',
    by: SABRINA
  }),
  rule('3.09', 'Service period', 'service_period', 'LOGICAL', 'GRN_SES', [
    t('BAST', 'REQUIRED', '#171 Service period'),
    t('TIMESHEET', 'REQUIRED', '#181 Timesheet period'),
    t('MANPOWER_SUMMARY', 'REQUIRED', '#196 Summary period'),
    t('OVERTIME_APPROVAL', 'IF_PRESENT', '#220 Period covered')
  ], {
    categories: ['MANPOWER'],
    sourceField: '#211 Service period',
    refs: '#171 · #181 · #196 · #211 · #220',
    onFail: 'BLOCK',
    criteriaText: 'Same billing month; OT period within it.',
    by: SABRINA
  }),
  rule('3.01', 'Man-days per category', 'man_days', 'CALCULATION', 'TIMESHEET', [
    t('MANPOWER_SUMMARY', 'REQUIRED', '#199 Total man-days'),
    t('INVOICE', 'REQUIRED', '#10 Quantity'),
    t('CONTRACT', 'EXTRACT', '#163 Manpower categories & headcount')
  ], {
    categories: ['MANPOWER'],
    sourceField: '#191 Total working days (Σ by #184)',
    refs: '#10 · #191 · #199',
    level: 'LINE',
    onFail: 'BLOCK',
    runCondition: when('Per manpower category line.'),
    criteriaText: 'Σ timesheet = summary = invoice qty, 0%.',
    by: SABRINA,
    linkedCheck: 'QTY_RECONCILIATION'
  }),
  rule('3.03', 'Overtime hours per worker', 'overtime_hours', 'EXACT', 'OVERTIME_APPROVAL', [
    t('TIMESHEET', 'REQUIRED', '#193 Total overtime hours'),
    t('MANPOWER_SUMMARY', 'REQUIRED', '#203 Overtime hours & OT rate')
  ], {
    categories: ['MANPOWER'],
    sourceField: '#222 OT hours approved per worker',
    refs: '#193 · #203 · #222',
    level: 'WORKER',
    onFail: 'BLOCK',
    runCondition: when('Invoice claims OT hours > 0.'),
    criteriaText: 'Zero tolerance (Q-053).',
    by: SABRINA
  }),
  rule('3.10', 'Worker name & ID', 'worker_id', 'EXACT', 'TIMESHEET', [t('OVERTIME_APPROVAL', 'REQUIRED', '#221 Worker name & ID')], {
    categories: ['MANPOWER'],
    sourceField: '#182 / #183 Worker name, ID',
    refs: '#182 · #183 · #221',
    level: 'WORKER',
    runCondition: when('Invoice claims OT hours > 0.'),
    criteriaText: 'ID exact; name fuzzy as tiebreak.',
    by: SABRINA
  }),
  rule('3.11', 'Manpower category', 'manpower_category', 'LOGICAL', 'CONTRACT', [
    t('TIMESHEET', 'REQUIRED', '#184 Designation / category'),
    t('MANPOWER_SUMMARY', 'REQUIRED', '#197 Manpower category')
  ], {
    categories: ['MANPOWER'],
    sourceField: '#163 Manpower categories',
    refs: '#163 · #184 · #197',
    level: 'LINE',
    criteriaText: 'Mapped to the contract category list.',
    by: SABRINA
  }),
  rule('3.12', 'Claim value vs SES', 'claim_value', 'TOLERANCE', 'GRN_SES', [
    t('INVOICE', 'REQUIRED', '#14 Sub-total (DPP)'),
    t('MANPOWER_SUMMARY', 'REQUIRED', '#206 Total claim amount'),
    t('BAST', 'REQUIRED', '#177 Certified value'),
    t('PO', 'EXTRACT', '#30 Total PO value')
  ], {
    categories: ['MANPOWER'],
    sourceField: '#214 SES value',
    refs: '#14 · #177 · #206 · #214',
    onFail: 'BLOCK',
    criteria: { tolerancePct: 2, toleranceAmount: 100000, combine: 'LOWER', measuredOn: 'TARGET' },
    criteriaText: '2% or IDR 100,000, whichever is lower.',
    by: SABRINA,
    linkedCheck: 'SES_DEVIATION'
  }),
  rule('3.05', 'Attendance (Face ID)', 'man_days', 'EXACT', 'INVOICE', [t('FACE_ID')], {
    categories: ['MANPOWER'],
    level: 'WORKER',
    criteriaText: 'Days billed match biometric Face ID attendance.',
    note: 'Moved from Common — biometric attendance applies to manpower invoices only.',
    by: NITISH
  }),

  /* ── Catering ───────────────────────────────────────────────────────── */
  rule('4.01', 'Daily POB count', 'quantity', 'EXACT', 'INVOICE', [t('MEAL_ATTENDANCE'), t('FACE_ID')], {
    categories: ['CATERING'],
    criteriaText: 'Persons on board billed equal the meal attendance and Face ID count.'
  }),
  rule('4.04', 'Back-charge quantity', 'quantity', 'EXACT', 'INVOICE', [t('BACK_CHARGE')], {
    categories: ['CATERING'],
    criteriaText: 'Snack, special-lunch and special-dinner back-charges equal the recap sheet.'
  }),

  /* ── Civil works ────────────────────────────────────────────────────── */
  rule('7.01', 'Quantity — BOQ', 'quantity', 'TOLERANCE', 'INVOICE', [t('PO'), t('BOQ'), t('INSPECTION_REPORT', 'IF_PRESENT')], {
    categories: ['CIVIL'],
    level: 'LINE',
    criteria: { tolerancePct: 5, toleranceAmount: 200000, combine: 'HIGHER' },
    criteriaText: 'Measured quantity within 5% or IDR 200,000 of the BOQ.',
    note: 'BOQ applies to civil contracts only — moved from Common.',
    by: NITISH
  }),
  rule('7.03', 'SIUJK expiry date', 'invoice_date', 'EXACT', 'SIUJK', [t('INVOICE')], {
    categories: ['CIVIL'],
    criteriaText: 'Construction permit is valid on the invoice date.'
  }),

  /* ── Travel & hotel (Non-PO) ────────────────────────────────────────── */
  rule('9.01', 'Trip / request ID', 'invoice_number', 'EXACT', 'INVOICE', [t('BILLING_SUMMARY'), t('HCIS')], {
    categories: ['TRAVEL', 'HOTEL'],
    level: 'LINE',
    criteriaText: 'Name + travel date + airline + route + amount + VAT resolve one HCIS clearing entry; zero tolerance on amount.'
  }),
  rule('9.07', 'HCIS ledger amount', 'invoice_amount', 'EXACT', 'INVOICE', [t('BILLING_SUMMARY'), t('HCIS')], {
    categories: ['TRAVEL', 'HOTEL'],
    level: 'LINE',
    criteriaText: 'Invoice amount equals the HCIS clearing amount.'
  })
].map((r, index) => ({ ...r, displayOrder: index + 1 }))

export default SEED_MATCH_RULES
