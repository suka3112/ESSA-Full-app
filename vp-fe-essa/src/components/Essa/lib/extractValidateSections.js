import { fmtMoney, formatInvoiceDate, formatManhourDisplay, formatPoDeliveryDateDisplay } from 'api/essaDashboard'
import {
  parseAmount,
  coerceEssaPoNumber,
  resolveTaxInvoiceSectionData,
  resolveTimesheetManpowerSheets,
  collectManpowerRolesFromSheets,
  collectManpowerRolesFromRows,
  collectManpowerRolesFromManpower,
  enrichTimesheetSheetsWithManhourSummaryRoles,
  resolveTimesheetManpowerRoles,
  VALIDATION_SECTION_LABELS,
  OCR_LINE_ITEM_COLUMNS,
  computeLineItemAmount,
  computeSesLineTotal,
  resolveInvoiceExtractedTotals,
  resolveInvoiceReferenceNumber,
  resolveInvoiceBankDetails,
  resolveBatchPoNumber,
  resolvePurchaseOrderHeaderForTab,
  resolvePurchaseOrderPoNumber,
  resolvePoHeaderFieldLabel,
  detectInvoiceWorkflow,
  enrichOcrPayload,
  formatOcrDisplayValue,
  countManhourSummaryWorkers
} from 'api/apInvoiceOcr'
import { isNonPoInvoice, resolveNonPoTravelFields } from './nonPoInvoiceDetail'
import { attachSectionExtractTables } from './extractTables'

/** Extraction tabs shown for non-PO invoices (invoice only — no PO / appendix / SES). */
export const NON_PO_EXTRACT_SECTION_KEYS = new Set(['A_nonPoTravel', 'A_invoice'])

const STATUS_META = {
  fail: {
    label: 'Failed',
    color: 'var(--dx-error-700)',
    bg: 'var(--dx-error-50)',
    dot: 'var(--dx-error-500)',
    order: 0
  },
  warn: {
    label: 'Warning',
    color: 'var(--dx-warn-700)',
    bg: 'var(--dx-warn-50)',
    dot: 'var(--dx-warn-500)',
    order: 1
  },
  pass: {
    label: 'Passed',
    color: 'var(--dx-success-700)',
    bg: 'var(--dx-success-50)',
    dot: 'var(--dx-success-500)',
    order: 2
  },
  skip: {
    label: 'Skipped',
    color: 'var(--dx-text-mute)',
    bg: 'var(--dx-g-50)',
    dot: 'var(--dx-g-400)',
    order: 3
  }
}

export { STATUS_META }

/** Empty required field — expected on the document but not captured by OCR. */
export const EXTRACT_FIELD_EMPTY_REQUIRED = 'Not extracted'

/** Empty optional field — not present on this document type. */
export const EXTRACT_FIELD_EMPTY_OPTIONAL = 'Not found on document'

export function resolveExtractFieldCell({ value, optional = false, missingMessage } = {}) {
  const display = formatOcrDisplayValue(value)
  const hasValue = display != null && display !== '' && display !== '—'
  if (hasValue) {
    return { text: display, variant: 'value' }
  }
  if (optional) {
    return {
      text: missingMessage || EXTRACT_FIELD_EMPTY_OPTIONAL,
      variant: 'optional'
    }
  }
  return {
    text: missingMessage || EXTRACT_FIELD_EMPTY_REQUIRED,
    variant: 'missing'
  }
}

const fmtDateField = (raw) => formatInvoiceDate(raw, { withTime: false })

const fmtBank = (bank, inv) => {
  const resolved = bank?.bankName || bank?.bankAccount ? bank : resolveInvoiceBankDetails(inv)
  const name = resolved?.bankName ?? inv?.bank_name
  const acct = resolved?.bankAccount ?? inv?.bank_account
  const branch = resolved?.bankBranch
  const holder = resolved?.accountHolder
  const parts = [name, branch, acct, holder].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

const fmtRoles = (roles) => {
  if (!roles) return null
  const list = (Array.isArray(roles)
    ? roles
    : String(roles)
        .split(',')
        .map((part) => part.trim())
  )
    .map((entry) => {
      if (entry == null || entry === '') return null
      if (typeof entry === 'string') return entry
      if (typeof entry === 'object') return entry.role ?? entry.name ?? null
      return String(entry)
    })
    .filter(Boolean)
  const unique = [...new Set(list)]
  return unique.length ? unique.join(', ') : null
}

const fmtApproval = (ac) => {
  if (!ac || typeof ac !== 'object') return null
  const flags = [
    ac.prepared && 'Prepared',
    ac.reviewed && 'Reviewed',
    ac.acknowledged && 'Acknowledged',
    ac.approved && 'Approved'
  ].filter(Boolean)
  return flags.length ? flags.join(', ') : 'Not signed'
}

const fmtManpowerNames = (rows) => {
  if (!rows?.length) return null
  return (
    rows
      .map((r) => r.name)
      .filter(Boolean)
      .join(', ') || null
  )
}

const fmtMoneyVal = (val, currency = 'IDR') => {
  if (val == null || val === '') return null
  const n = typeof val === 'number' ? val : parseAmount(val)
  if (n == null || !Number.isFinite(n)) return null
  return fmtMoney(n, currency)
}

const isEmpty = (v) => v == null || v === '' || v === '—'

const statusFromValue = (value, optional = false) => {
  if (isEmpty(value)) return optional ? 'skip' : 'warn'
  return 'pass'
}

const CHECK_HINTS = {
  invoiceNo: ['invoice no', 'inv no', 'invoice number'],
  date: ['invoice date', 'date'],
  paymentTerms: ['payment term'],
  manhourUnitRateCalculation: ['manhour unit rate', 'unit rate calculation'],
  totalAmount: ['total amount', 'subtotal', 'line total'],
  vatAmount: ['invoice vat', 'invoice tax amount'],
  taxVatAmount: ['tax invoice vat', 'faktur pajak vat', 'jumlah ppn', 'tax inv vat'],
  grandTotal: ['grand total'],
  bankDetails: ['bank'],
  serviceName: ['service name', 'activity'],
  manpowerRoles: ['manpower role', 'role'],
  taxInvoiceNumber: ['tax invoice number', 'tax inv no', 'faktur pajak no'],
  poNumber: ['po number', 'po no'],
  periodStart: ['period start'],
  periodEnd: ['period end'],
  manhourPercentageCompletion: ['completion', 'percentage'],
  thisManhours: ['this man hours', 'this period manhour', 'man hours'],
  approvalCheck: ['approval'],
  manpowerNames: ['manpower name', 'name of manpower'],
  manpowerCount: ['manpower count'],
  totalRegularManhour: ['regular manhour', 'regular mh'],
  totalOvertimeManhour: ['overtime manhour', 'overtime mh'],
  welderUnitRate: ['welder unit rate', 'welder rate'],
  fitterUnitRate: ['fitter unit rate', 'pipe fitter rate'],
  sesNo: ['ses no', 'ses number'],
  poDate: ['po date'],
  vendorCode: ['vendor code'],
  sesDescription: ['ses description']
}

const SECTION_DOC_TYPES = {
  A_invoice: 'invoice',
  B_taxInvoice: 'tax_invoice',
  C_notice: 'notice',
  D_beritaAcara: 'berita_acara',
  E_manhourSummary: 'manhour_summary',
  F_timesheet: 'timesheet',
  G_attendance: 'attendance',
  H_po: 'po',
  I_poAppendix: 'po_appendix',
  K_ses: 'ses'
}

const HOUR_LINE_KEYS = new Set(['regularManhour', 'overtimeManhour'])
const MH_HEADER_FIELD_KEYS = new Set([
  'totalRegularManhour',
  'totalOvertimeManhour',
  'welderUnitRate',
  'fitterUnitRate',
  'manhourUnitRateCalculation'
])
const DATE_LINE_KEYS = new Set(['date', 'deliveryDate'])

const mapDetailLineToOcr = (line = {}) => ({
  description: line.description,
  quantity: line.quantity,
  unit: line.unit,
  unitPrice: line.unit_price ?? line.unitPrice,
  lineValue: line.line_value ?? line.lineValue ?? line.total ?? line.amount,
  amount: line.total ?? line.amount,
  role: line.role,
  manpowerName: line.manpower_name ?? line.manpowerName,
  manpowerRole: line.manpower_role ?? line.manpowerRole,
  date: line.date,
  username: line.username,
  regularManhour: line.regular_manhour ?? line.regularManhour,
  overtimeManhour: line.overtime_manhour ?? line.overtimeManhour,
  deliveryDate: line.delivery_date ?? line.deliveryDate,
  serviceName: line.serviceName
})

const getOcrForDocType = (inv, docType) => {
  const byType = inv?.ocr_by_type?.[docType]
  if (byType) return byType
  if ((inv?.document_type || inv?.ocr?.documentType) === docType) return inv?.ocr
  return null
}

const sectionHasContent = (fields = [], lineItems = [], extractTables = []) => {
  const hasFields = fields.some((f) => f.value != null && f.value !== '')
  return hasFields || lineItems.length > 0 || extractTables.length > 0
}

const shouldShowSection = (sectionKey, inv, fields, lineItems, extractTables = []) => {
  const batchTypes = inv?.batch_document_types || []
  const docType = SECTION_DOC_TYPES[sectionKey]
  if (batchTypes.length && docType) {
    return batchTypes.includes(docType) || sectionHasContent(fields, lineItems, extractTables)
  }
  if (docType && (inv?.document_type || inv?.ocr?.documentType) === docType) {
    return true
  }
  return sectionHasContent(fields, lineItems, extractTables)
}

export function formatExtractLineCell(col, item, currency = 'IDR') {
  const raw = item?.[col.key]
  if (col.key === 'lineTotal' || col.key === 'lineValue') {
    const value = computeSesLineTotal(item)
    return value != null ? fmtMoney(value, currency) : '—'
  }
  if (raw == null || raw === '') {
    if (col.key === 'amount') {
      const value = computeLineItemAmount(item)
      return value != null ? fmtMoney(value, currency) : '—'
    }
    return '—'
  }
  if (col.key === 'amount') {
    const value = computeLineItemAmount(item) ?? parseAmount(raw)
    return value != null ? fmtMoney(value, currency) : String(raw)
  }
  if (col.key === 'unitPrice' || col.key === 'manhourUnitRate' || col.key === 'unitPriceHourIDR') {
    const value = parseAmount(raw ?? item?.unitPrice ?? item?.unitPriceHourIDR)
    return value != null ? fmtMoney(value, currency) : String(raw)
  }
  if (HOUR_LINE_KEYS.has(col.key)) {
    return formatManhourDisplay(raw) ?? '—'
  }
  if (DATE_LINE_KEYS.has(col.key)) return formatInvoiceDate(raw, { withTime: false }) || formatOcrDisplayValue(raw) || '—'
  return formatOcrDisplayValue(raw) || '—'
}

function findCheck(checks, fieldKey, label) {
  const hints = [label.toLowerCase(), ...(CHECK_HINTS[fieldKey] || [])]
  return checks.find((c) => {
    const name = String(c.name || '').toLowerCase()
    return hints.some((h) => name.includes(h))
  })
}

function preferCapturedHeader(...sources) {
  const merged = {}
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue
    for (const [key, value] of Object.entries(src)) {
      if (key in merged && !isEmpty(merged[key])) continue
      if (!isEmpty(value) || !(key in merged)) merged[key] = value
    }
  }
  return merged
}

function buildField(
  { fieldKey, label, captured, optional = false, preferCaptured = false },
  checks
) {
  const check = findCheck(checks, fieldKey, label)
  const rawValue = preferCaptured ? (captured ?? check?.actual) : check?.actual || captured
  const hasValue = !isEmpty(rawValue)
  const status =
    check?.status === 'fail' ? 'fail' : check?.status || statusFromValue(rawValue, optional)

  return {
    fieldKey,
    label,
    status,
    optional,
    value: hasValue ? rawValue : null,
    missingMessage:
      check?.status === 'fail'
        ? check.message || EXTRACT_FIELD_EMPTY_REQUIRED
        : optional
          ? EXTRACT_FIELD_EMPTY_OPTIONAL
          : EXTRACT_FIELD_EMPTY_REQUIRED
  }
}

export function getExtractedCellDisplay(field) {
  let value = field.value
  if (value != null && value !== '' && MH_HEADER_FIELD_KEYS.has(field.fieldKey)) {
    value = formatManhourDisplay(value) ?? value
  }

  return resolveExtractFieldCell({
    value,
    optional: field.optional,
    missingMessage: field.missingMessage
  })
}

export function countSectionFields(fields) {
  const filled = fields.filter((f) => f.value != null && f.value !== '').length
  return { filled, missing: fields.length - filled, total: fields.length }
}

export function sectionHasPresentableContent(section = {}) {
  const hasExtractTables = section.extractTables?.length > 0
  const hasHeaderTable = section.fields?.length > 0 && !section.hideHeaderFields
  const hasTimesheetTable = section.manpowerSheets?.length > 0
  const hasLineTable =
    !section.manpowerSheets?.length &&
    !hasExtractTables &&
    section.lineItems?.length > 0 &&
    section.lineColumns?.length > 0
  return hasHeaderTable || hasExtractTables || hasTimesheetTable || hasLineTable
}

export function fieldToEditableString(field) {
  const value = field?.value
  if (value == null || value === '') return ''
  if (typeof value === 'object') {
    if (value.bankName || value.bankAccount) {
      return [value.bankName, value.bankAccount].filter(Boolean).join(' / ')
    }
    return JSON.stringify(value)
  }
  return String(value)
}

export function lineItemCellToEditableString(item, colKey) {
  const raw = item?.[colKey]
  if (raw == null || raw === '') return ''
  return String(raw)
}

export function extractCellPlaceholder(label, { optional = false } = {}) {
  const text = String(label || '').trim()
  if (!text) return optional ? 'Optional' : 'Enter value'
  return optional ? `Enter ${text} (optional)` : `Enter ${text}`
}

function normalizeCorrectionRow(row = {}) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === '' ? null : value])
  )
}

function applySectionCorrections(section, corrections = {}) {
  const corr = corrections[section.key]
  if (!corr) return section

  let fields = section.fields
  if (corr.fields) {
    fields = section.fields.map((field) => {
      if (!(field.fieldKey in corr.fields)) return field
      const value = corr.fields[field.fieldKey] === '' ? null : corr.fields[field.fieldKey]
      const hasValue = value != null && value !== ''
      return {
        ...field,
        value,
        status: hasValue
          ? field.status === 'fail'
            ? 'warn'
            : 'pass'
          : field.optional
            ? 'skip'
            : 'warn'
      }
    })
  }

  const lineItems = corr.lineItems?.length
    ? corr.lineItems.map(normalizeCorrectionRow)
    : section.lineItems

  const manpowerSheets = corr.manpowerSheets?.length
    ? corr.manpowerSheets.map((sheet) => ({
        ...sheet,
        entries: (sheet.entries || []).map(normalizeCorrectionRow)
      }))
    : section.manpowerSheets

  return { ...section, fields, lineItems, manpowerSheets }
}

function buildNonPoTravelExtractSection(inv, checks = []) {
  const travel = resolveNonPoTravelFields(inv)

  const fields = [
    buildField({ fieldKey: 'invoiceNo', label: 'Inv No', captured: travel.invoiceNo }, checks),
    buildField(
      { fieldKey: 'invoiceDate', label: 'Inv Date', captured: travel.invoiceDate },
      checks
    ),
    buildField(
      { fieldKey: 'invoiceDueDate', label: 'Inv Due Date', captured: travel.invoiceDueDate },
      checks
    ),
    buildField(
      { fieldKey: 'passengerName', label: 'Name', captured: travel.passengerName },
      checks
    ),
    buildField(
      { fieldKey: 'ticketClass', label: 'Ticket Class', captured: travel.ticketClass },
      checks
    ),
    buildField({ fieldKey: 'routeFrom', label: 'From', captured: travel.routeFrom }, checks),
    buildField({ fieldKey: 'routeTo', label: 'To', captured: travel.routeTo }, checks),
    buildField({ fieldKey: 'confirmNo', label: 'Confirm No', captured: travel.confirmNo }, checks),
    buildField({ fieldKey: 'ticketNo', label: 'Ticket No', captured: travel.ticketNo }, checks),
    buildField({ fieldKey: 'airline', label: 'Airline', captured: travel.airline }, checks),
    buildField({ fieldKey: 'flightNo', label: 'Flight No', captured: travel.flightNo }, checks),
    buildField(
      { fieldKey: 'routeCodeFrom', label: 'Route Code From', captured: travel.routeCodeFrom },
      checks
    ),
    buildField(
      { fieldKey: 'routeCodeTo', label: 'Route Code To', captured: travel.routeCodeTo },
      checks
    ),
    buildField(
      { fieldKey: 'amount', label: 'Amount', captured: travel.amount, preferCaptured: true },
      checks
    ),
    buildField(
      { fieldKey: 'vatAmount', label: 'VAT', captured: travel.vatAmount, preferCaptured: true },
      checks
    ),
    buildField(
      {
        fieldKey: 'totalAmount',
        label: 'Total Amount',
        captured: travel.totalAmount,
        preferCaptured: true
      },
      checks
    )
  ]

  return {
    key: 'A_nonPoTravel',
    label: 'A. Invoice',
    fields,
    lineItems: [],
    lineColumns: []
  }
}

export function buildExtractValidateSections(inv, checks = [], corrections = {}) {
  const isNonPoContext =
    inv?.invoice_workflow === 'NON_PO' ||
    inv?.invoice_type === 'Non-PO' ||
    inv?.po_category === 'Non-PO' ||
    isNonPoInvoice(inv)

  if (isNonPoContext) {
    const section = buildNonPoTravelExtractSection(inv, checks)
    return [applySectionCorrections(section, corrections[section.key] || {})]
  }

  const ve = inv?.validation_extraction || inv?.ocr?.validationExtraction
  const sections = ve?.sections || {}
  const ocrDocType = inv?.document_type || inv?.ocr?.documentType
  const invoiceOcrDoc =
    getOcrForDocType(inv, 'invoice') || (ocrDocType === 'invoice' ? inv?.ocr : null)
  const enrichedInvoiceHdr = invoiceOcrDoc
    ? enrichOcrPayload({ ...invoiceOcrDoc, documentType: 'invoice' })?.header || {}
    : {}
  const hdr = { ...(inv?.ocr?.header || {}), ...enrichedInvoiceHdr }
  const isTaxInvoiceOcr = ocrDocType === 'tax_invoice'
  const isBeritaAcaraOcr = ocrDocType === 'berita_acara'
  const taxSectionData = resolveTaxInvoiceSectionData(inv)
  const invoiceTotals = resolveInvoiceExtractedTotals(inv)
  const currency = invoiceTotals.currency
  const resolvedPoNumber = resolveBatchPoNumber(inv)
  const ocrLines = inv?.ocr?.lineItems || []

  const resolvedBank = resolveInvoiceBankDetails(inv)
  const resolvedInvoiceNo = resolveInvoiceReferenceNumber(inv)

  const aBase =
    sections.A_invoice ||
    (isTaxInvoiceOcr || isBeritaAcaraOcr
      ? {}
      : {
          invoiceNo: resolvedInvoiceNo ?? inv?.invoice_no ?? hdr.invoiceNumber,
          poNumber: coerceEssaPoNumber(inv?.po_number ?? hdr.poNumber),
          vendorName: inv?.vendor_name ?? hdr.vendorName,
          invoiceWorkflow:
            inv?.invoice_workflow ?? hdr.invoiceWorkflow ?? detectInvoiceWorkflow(hdr),
          date: inv?.invoice_date ?? hdr.invoiceDate,
          paymentTerms: hdr.paymentTerms,
          manhourUnitRateCalculation: hdr.manhourUnitRate,
          totalAmount: invoiceTotals.subtotal,
          vatAmount: invoiceTotals.vatAmount,
          grandTotal: invoiceTotals.grandTotal,
          bankDetails: {
            bankName: resolvedBank.bankName ?? inv?.bank_name ?? hdr.bankName,
            bankAccount: resolvedBank.bankAccount ?? inv?.bank_account ?? hdr.bankAccount,
            bankBranch: resolvedBank.bankBranch ?? hdr.bankBranch,
            accountHolder: resolvedBank.accountHolder ?? hdr.accountHolder
          },
          serviceName: hdr.serviceName,
          manpowerRoles: collectManpowerRolesFromRows(inv?.lines || [])
        })

  const a =
    isTaxInvoiceOcr || isBeritaAcaraOcr
      ? aBase
      : {
          ...aBase,
          invoiceNo: resolvedInvoiceNo ?? aBase.invoiceNo,
          date: aBase.date ?? hdr.invoiceDate ?? inv?.invoice_date,
          paymentTerms: aBase.paymentTerms ?? hdr.paymentTerms,
          manhourUnitRateCalculation:
            aBase.manhourUnitRateCalculation ??
            hdr.manhourUnitRateCalculation ??
            hdr.manhourUnitRate,
          serviceName: aBase.serviceName ?? hdr.serviceName,
          manpowerRoles: aBase.manpowerRoles ?? hdr.manpowerRoles,
          totalAmount: invoiceTotals.subtotal ?? aBase.totalAmount,
          vatAmount: invoiceTotals.vatAmount ?? aBase.vatAmount,
          grandTotal: invoiceTotals.grandTotal ?? aBase.grandTotal,
          bankDetails: {
            bankName: resolvedBank.bankName ?? aBase.bankDetails?.bankName,
            bankAccount: resolvedBank.bankAccount ?? aBase.bankDetails?.bankAccount,
            bankBranch: resolvedBank.bankBranch ?? aBase.bankDetails?.bankBranch,
            accountHolder: resolvedBank.accountHolder ?? aBase.bankDetails?.accountHolder
          },
          totals: {
            ...(aBase.totals || {}),
            subtotal: invoiceTotals.subtotal ?? aBase.totals?.subtotal ?? aBase.totalAmount,
            vatAmount: invoiceTotals.vatAmount ?? aBase.totals?.vatAmount,
            grandTotal: invoiceTotals.grandTotal ?? aBase.totals?.grandTotal,
            currency
          }
        }

  const b = taxSectionData
  const dOcr = getOcrForDocType(inv, 'berita_acara')
  const dHdr = dOcr?.header || {}
  const dLines = dOcr?.lineItems || []
  const dApproval =
    dHdr.preparedBy || dHdr.reviewedBy || dHdr.acknowledgedBy || dHdr.approvedBy
      ? {
          prepared: Boolean(dHdr.preparedBy),
          reviewed: Boolean(dHdr.reviewedBy),
          acknowledged: Boolean(dHdr.acknowledgedBy),
          approved: Boolean(dHdr.approvedBy)
        }
      : null
  const d =
    sections.D_beritaAcara ||
    (isBeritaAcaraOcr || dOcr || dHdr.poNumber
      ? {
          poNumber: dHdr.poNumber ?? inv?.po_number,
          periodStart: dHdr.periodStart,
          periodEnd: dHdr.periodEnd,
          manhourPercentageCompletion: dHdr.manhourCompletionPct,
          thisManhours: dHdr.thisManhours ?? sections.D_beritaAcara?.thisManhours,
          serviceName: dHdr.serviceName,
          manpowerRoles:
            dHdr.manpowerRoles ||
            [...new Set(dLines.map((l) => l.role).filter(Boolean))].join(', ') ||
            null,
          manpower: dLines
            .map((l) => ({ name: l.manpowerName, role: l.role }))
            .filter((row) => row.name),
          approvalCheck: sections.D_beritaAcara?.approvalCheck ?? dApproval
        }
      : {
          poNumber: inv?.po_number ?? hdr.poNumber
        })
  const dTableLines =
    dLines.length > 0
      ? dLines.map((line) => ({
          ...line,
          serviceName: line.serviceName ?? d.serviceName ?? dHdr.serviceName ?? null
        }))
      : (d.manpower || []).map((row) => ({
          manpowerName: row.name ?? row.manpowerName,
          role: row.role,
          serviceName: d.serviceName ?? dHdr.serviceName ?? null
        }))

  const sectionA = [
    buildField(
      {
        fieldKey: 'invoiceNo',
        label: 'Inv No',
        captured: a.invoiceNo ?? resolvedInvoiceNo ?? inv?.invoice_no
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'poNumber',
        label: 'PO No',
        captured: coerceEssaPoNumber(
          a.poNumber ?? resolvedPoNumber ?? inv?.po_number ?? hdr.poNumber
        ),
        optional: (a.invoiceWorkflow ?? detectInvoiceWorkflow(hdr)) === 'NON_PO'
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'vendorName',
        label: 'Vendor Name',
        captured: a.vendorName ?? inv?.vendor_name ?? hdr.vendorName
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'date',
        label: 'Date',
        captured: fmtDateField(a.date ?? inv?.invoice_date)
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'paymentTerms',
        label: 'Payment Terms',
        captured: a.paymentTerms,
        optional: true
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manhourUnitRateCalculation',
        label: 'MH Unit Rate',
        captured: a.manhourUnitRateCalculation,
        optional: true
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'totalAmount',
        label: 'Total Amount',
        captured: fmtMoneyVal(invoiceTotals.subtotal, currency),
        preferCaptured: true
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'vatAmount',
        label: 'Invoice VAT Amount',
        captured: fmtMoneyVal(invoiceTotals.vatAmount, currency),
        preferCaptured: true
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'grandTotal',
        label: 'Grand Total',
        captured: fmtMoneyVal(invoiceTotals.grandTotal, currency),
        preferCaptured: true
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'bankDetails',
        label: 'Bank Details',
        captured: fmtBank(a.bankDetails, inv),
        optional: true
      },
      checks
    ),
    buildField(
      { fieldKey: 'serviceName', label: 'Service Name', captured: a.serviceName, optional: true },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerRoles',
        label: 'Manpower Roles',
        captured: fmtRoles(
          sections.F_timesheet?.manpowerSheets?.length
            ? collectManpowerRolesFromSheets(sections.F_timesheet.manpowerSheets)
            : sections.E_manhourSummary?.manpower?.length
              ? collectManpowerRolesFromManpower(sections.E_manhourSummary.manpower)
              : inv?.lines?.length
                ? collectManpowerRolesFromRows(inv.lines)
                : a.manpowerRoles
        ),
        optional: true
      },
      checks
    )
  ]

  const taxVatRaw = b.vatAmount

  const taxSectionRequired =
    isTaxInvoiceOcr ||
    inv?.batch_document_types?.includes('tax_invoice') ||
    Boolean(b.taxInvoiceNumber || b.date || taxVatRaw != null)

  const taxVatDisplay = fmtMoneyVal(taxVatRaw, currency)

  const sectionB = [
    buildField(
      {
        fieldKey: 'taxInvoiceNumber',
        label: 'Tax Inv No',
        captured: b.taxInvoiceNumber,
        optional: !taxSectionRequired,
        preferCaptured: true
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'date',
        label: 'Tax Inv Date',
        captured: fmtDateField(b.date),
        optional: !taxSectionRequired,
        preferCaptured: true
      },
      checks
    ),
    {
      fieldKey: 'taxVatAmount',
      label: 'VAT Amount',
      status: taxVatDisplay ? 'pass' : !taxSectionRequired ? 'skip' : 'warn',
      optional: !taxSectionRequired,
      value: taxVatDisplay,
      missingMessage: !taxSectionRequired
        ? EXTRACT_FIELD_EMPTY_OPTIONAL
        : EXTRACT_FIELD_EMPTY_REQUIRED
    }
  ]

  const baSectionRequired =
    isBeritaAcaraOcr ||
    Boolean(
      d.poNumber ||
      d.periodStart ||
      d.periodEnd ||
      d.manhourPercentageCompletion ||
      d.thisManhours ||
      d.serviceName ||
      d.manpowerRoles ||
      d.manpower?.length
    )

  const sectionD = [
    buildField(
      {
        fieldKey: 'poNumber',
        label: 'PO Number',
        captured: d.poNumber ?? inv?.po_number,
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodStart',
        label: 'Period Start',
        captured: fmtDateField(d.periodStart),
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodEnd',
        label: 'Period End',
        captured: fmtDateField(d.periodEnd),
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manhourPercentageCompletion',
        label: 'MH % Complete',
        captured: d.manhourPercentageCompletion,
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'thisManhours',
        label: 'This Man Hours',
        captured:
          d.thisManhours != null && d.thisManhours !== ''
            ? formatManhourDisplay(d.thisManhours) ?? d.thisManhours
            : null,
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'serviceName',
        label: 'Service Name',
        captured: d.serviceName,
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerRoles',
        label: 'Manpower Roles',
        captured: fmtRoles(d.manpowerRoles),
        optional: !baSectionRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerNames',
        label: 'Manpower Names',
        captured: fmtManpowerNames(d.manpower),
        optional: !baSectionRequired
      },
      checks
    ),
    ...(d.approvalCheck
      ? [
          buildField(
            {
              fieldKey: 'approvalCheck',
              label: 'Approval Check',
              captured: fmtApproval(d.approvalCheck),
              optional: true
            },
            checks
          )
        ]
      : [])
  ]

  const e = sections.E_manhourSummary || {}
  const eOcrRaw = getOcrForDocType(inv, 'manhour_summary')
  const eOcr = eOcrRaw
    ? enrichOcrPayload({
        ...eOcrRaw,
        documentType: 'manhour_summary',
        tables: eOcrRaw.tables || []
      })
    : null
  const eHdr = eOcr?.header || {}
  const eLines =
    e.manpower?.length > 0
      ? e.manpower.map((row) => ({
          manpowerName: row.name ?? row.manpowerName,
          role: row.role,
          regularManhour: row.regularManhour,
          overtimeManhour: row.overtimeManhour,
          unitPrice: row.unitPrice ?? row.unit_price
        }))
      : eOcr?.lineItems || []
  const eRequired =
    inv?.batch_document_types?.includes('manhour_summary') ||
    ocrDocType === 'manhour_summary' ||
    Boolean(
      e.poNumber ||
      e.periodStart ||
      e.periodEnd ||
      e.totalRegularManhour ||
      e.totalOvertimeManhour ||
      e.manpowerCount ||
      eLines.length
    )
  const eManpowerCount =
    e.manpowerCount ??
    eOcr?.header?.manpowerCount ??
    (eLines.length ? String(countManhourSummaryWorkers(eLines)) : null)
  const sectionE = [
    buildField(
      {
        fieldKey: 'poNumber',
        label: 'PO Number',
        captured: e.poNumber ?? eOcr?.header?.poNumber,
        optional: !eRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodStart',
        label: 'Period Start',
        captured: fmtDateField(e.periodStart ?? eOcr?.header?.periodStart),
        optional: !eRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodEnd',
        label: 'Period End',
        captured: fmtDateField(e.periodEnd ?? eOcr?.header?.periodEnd),
        optional: !eRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'totalRegularManhour',
        label: 'Total Regular MH',
        captured: e.totalRegularManhour ?? eOcr?.header?.totalRegularManhour,
        optional: !eRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'totalOvertimeManhour',
        label: 'Total Overtime MH',
        captured: e.totalOvertimeManhour ?? eHdr.totalOvertimeManhour ?? eOcr?.header?.totalOvertimeManhour,
        optional: !eRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerRoles',
        label: 'Manpower Roles',
        captured: fmtRoles(
          e.manpower?.length > 0
            ? collectManpowerRolesFromManpower(e.manpower)
            : eLines.length > 0
              ? collectManpowerRolesFromRows(eLines)
              : e.manpowerRoles
        ),
        optional: !eRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerCount',
        label: 'Manpower count',
        captured: eManpowerCount ? `${eManpowerCount} manpower` : null,
        optional: !eRequired
      },
      checks
    )
  ]

  const g = sections.G_attendance || {}
  const gOcr = getOcrForDocType(inv, 'attendance')
  const gHdr = { ...(gOcr?.header || {}), ...g }
  const gLines =
    g.lineItems?.length > 0
      ? g.lineItems
      : gOcr?.lineItems?.length
        ? gOcr.lineItems
        : gOcr?.attendanceEntries || []
  const gRequired =
    inv?.batch_document_types?.includes('attendance') ||
    ocrDocType === 'attendance' ||
    Boolean(gHdr.site || gHdr.periodStart || gHdr.periodEnd || gHdr.vendorName || gLines.length)
  const sectionG = [
    buildField(
      { fieldKey: 'site', label: 'Site', captured: gHdr.site, optional: !gRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodStart',
        label: 'Period Start',
        captured: fmtDateField(gHdr.periodStart),
        optional: !gRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodEnd',
        label: 'Period End',
        captured: fmtDateField(gHdr.periodEnd),
        optional: !gRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'vendorName', label: 'Vendor', captured: gHdr.vendorName, optional: !gRequired },
      checks
    )
  ]

  const f = sections.F_timesheet || {}
  const fOcr = getOcrForDocType(inv, 'timesheet')
  const fHdr = fOcr?.header || {}
  const fManpowerSheetsRaw =
    f.manpowerSheets?.length > 0
      ? f.manpowerSheets
      : resolveTimesheetManpowerSheets(fOcr, f.entries || fOcr?.lineItems || [], {
          ...fHdr,
          periodStart: f.periodStart ?? fHdr.periodStart,
          periodEnd: f.periodEnd ?? fHdr.periodEnd
        })
  const fManpowerSheets = enrichTimesheetSheetsWithManhourSummaryRoles(fManpowerSheetsRaw, inv)
  const fTimesheetRoles = resolveTimesheetManpowerRoles(inv, fManpowerSheets)
  const eManhourForCount = sections.E_manhourSummary || {}
  const eManhourOcrForCount = getOcrForDocType(inv, 'manhour_summary')
  const manhourWorkerCount =
    eManhourForCount.manpowerCount ??
    eManhourOcrForCount?.header?.manpowerCount ??
    (eManhourOcrForCount?.lineItems?.length
      ? String(countManhourSummaryWorkers(eManhourOcrForCount.lineItems))
      : null)
  const fLines = f.entries?.length > 0 ? f.entries : fOcr?.lineItems || []
  const fRequired =
    inv?.batch_document_types?.includes('timesheet') ||
    ocrDocType === 'timesheet' ||
    Boolean(
      f.poNumber ||
      f.periodStart ||
      f.periodEnd ||
      f.manpowerRoles ||
      f.manpowerNames ||
      fManpowerSheets.length ||
      fLines.length
    )
  const sectionF = [
    buildField(
      {
        fieldKey: 'poNumber',
        label: 'PO Number',
        captured: f.poNumber ?? fOcr?.header?.poNumber,
        optional: !fRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodStart',
        label: 'Period Start',
        captured: fmtDateField(f.periodStart ?? fOcr?.header?.periodStart),
        optional: !fRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'periodEnd',
        label: 'Period End',
        captured: fmtDateField(f.periodEnd ?? fOcr?.header?.periodEnd),
        optional: !fRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerRoles',
        label: 'Manpower Roles',
        captured: fmtRoles(fTimesheetRoles.length > 0 ? fTimesheetRoles : f.manpowerRoles),
        optional: !fRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'manpowerNames',
        label: 'Manpower count',
        captured: fManpowerSheets.length
          ? `${fManpowerSheets.length} manpower`
          : manhourWorkerCount
            ? `${manhourWorkerCount} manpower`
            : Array.isArray(f.manpowerNames)
              ? f.manpowerNames.join(', ')
              : f.manpowerNames,
        optional: !fRequired
      },
      checks
    )
  ]

  const h = sections.H_po || {}
  const hOcr = getOcrForDocType(inv, 'po')
  const hEnrichedHdr = hOcr
    ? enrichOcrPayload({ ...hOcr, documentType: 'po' })?.header || {}
    : {}
  const poTabHeader = resolvePurchaseOrderHeaderForTab(inv)
  const poNumberForTab = resolvePurchaseOrderPoNumber(inv) ?? resolvedPoNumber ?? inv?.po_number
  const hHdr = preferCapturedHeader(
    poTabHeader,
    { poNumber: poNumberForTab },
    hEnrichedHdr,
    h
  )
  const fieldSchemas = inv?.extract_field_schemas || null
  const hLines = h.lineItems?.length > 0 ? h.lineItems : hOcr?.lineItems || []
  const hRequired =
    Boolean(inv?.po_number) ||
    inv?.batch_document_types?.includes('po') ||
    ocrDocType === 'po' ||
    Boolean(
      hHdr.poHeaderInformation ||
      hHdr.description ||
      hHdr.poNumber ||
      hHdr.poDate ||
      hHdr.vendorName ||
      hHdr.buyerName ||
      hHdr.requisitionNo ||
      hHdr.deliveryDate ||
      hHdr.serviceStartDate ||
      hHdr.serviceEndDate ||
      hHdr.paymentTerms ||
      hHdr.incoterms ||
      hHdr.totalAmount ||
      hLines.length
    )
  const sectionH = [
    buildField(
      {
        fieldKey: 'poNumber',
        label: resolvePoHeaderFieldLabel('poNumber', fieldSchemas),
        captured: hHdr.poNumber,
        preferCaptured: true,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'description',
        label: resolvePoHeaderFieldLabel('description', fieldSchemas),
        captured: hHdr.description,
        preferCaptured: true,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'deliveryDate',
        label: resolvePoHeaderFieldLabel('deliveryDate', fieldSchemas),
        captured:
          formatPoDeliveryDateDisplay(hHdr.deliveryDate) ??
          formatPoDeliveryDateDisplay(hOcr?.header?.deliveryDate),
        preferCaptured: true,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'poDate',
        label: 'PO Date',
        captured: fmtDateField(hHdr.poDate),
        optional: !hRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'requisitionNo',
        label: 'Requisition No',
        captured: hHdr.requisitionNo,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'vendorName', label: 'Vendor', captured: hHdr.vendorName, optional: !hRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'vendorCode',
        label: 'Vendor Code',
        captured: hHdr.vendorCode,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'buyerName', label: 'Buyer', captured: hHdr.buyerName, optional: !hRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'projectName',
        label: 'Project',
        captured: hHdr.projectName,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'serviceStartDate',
        label: 'Service Start',
        captured: fmtDateField(hHdr.serviceStartDate),
        optional: !hRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'serviceEndDate',
        label: 'Service End',
        captured: fmtDateField(hHdr.serviceEndDate),
        optional: !hRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'currency', label: 'Currency', captured: hHdr.currency, optional: !hRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'paymentTerms',
        label: 'Payment Terms',
        captured: hHdr.paymentTerms,
        optional: !hRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'incoterms', label: 'Incoterms', captured: hHdr.incoterms, optional: !hRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'totalAmount',
        label: 'PO Value',
        captured: fmtMoneyVal(hHdr.totalAmount, hHdr.currency || currency),
        optional: !hRequired
      },
      checks
    )
  ]

  const i = sections.I_poAppendix || {}
  const iOcr = getOcrForDocType(inv, 'po_appendix')
  const iEnrichedHdr = iOcr
    ? enrichOcrPayload({ ...iOcr, documentType: 'po_appendix' })?.header || {}
    : {}
  const iHdr = {
    poNumber: resolvedPoNumber ?? iEnrichedHdr.poNumber,
    ...iEnrichedHdr,
    ...i
  }
  const iLines =
    i.lineItems?.length > 0
      ? i.lineItems
      : iOcr?.lineItems?.length
        ? iOcr.lineItems
        : iOcr?.appendixItems || []
  const iRequired =
    inv?.batch_document_types?.includes('po_appendix') ||
    ocrDocType === 'po_appendix' ||
    Boolean(
      iHdr.poHeaderInformation || iHdr.poNumber || iHdr.poDate || iHdr.vendorName || iLines.length
    )
  const sectionI = [
    buildField(
      { fieldKey: 'poNumber', label: 'PO Number', captured: iHdr.poNumber, optional: !iRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'poDate',
        label: 'PO Date',
        captured: fmtDateField(iHdr.poDate),
        optional: !iRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'vendorName', label: 'Vendor', captured: iHdr.vendorName, optional: !iRequired },
      checks
    ),
    buildField(
      { fieldKey: 'currency', label: 'Currency', captured: iHdr.currency, optional: !iRequired },
      checks
    )
  ]

  const k = sections.K_ses || {}
  const kOcr = getOcrForDocType(inv, 'ses')
  const kHdr = preferCapturedHeader(kOcr?.header || {}, k)
  const kLines =
    k.lineItems?.length > 0
      ? k.lineItems
      : kOcr?.lineItems?.length
        ? kOcr.lineItems
        : []
  const kRequired =
    Boolean(inv?.backend_ses?.sesNo) ||
    inv?.batch_document_types?.includes('ses') ||
    ocrDocType === 'ses' ||
    Boolean(
      kHdr.sesNo ||
        kHdr.poNumber ||
        kHdr.vendorName ||
        kHdr.totalSesValue ||
        kHdr.projectName ||
        kLines.length
    )
  const sectionK = [
    buildField(
      { fieldKey: 'sesNo', label: 'SES Number', captured: kHdr.sesNo, optional: !kRequired },
      checks
    ),
    buildField(
      { fieldKey: 'poNumber', label: 'PO Number', captured: kHdr.poNumber ?? resolvedPoNumber, optional: !kRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'transactionDate',
        label: 'Transaction Date',
        captured: fmtDateField(kHdr.transactionDate),
        optional: !kRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'vendorName', label: 'Vendor', captured: kHdr.vendorName, optional: !kRequired },
      checks
    ),
    buildField(
      { fieldKey: 'site', label: 'Site', captured: kHdr.site, optional: !kRequired },
      checks
    ),
    buildField(
      {
        fieldKey: 'projectName',
        label: 'Project / Description',
        captured: kHdr.projectName ?? kHdr.sesDescription,
        optional: !kRequired
      },
      checks
    ),
    buildField(
      {
        fieldKey: 'totalSesValue',
        label: 'Total SES Value',
        captured: fmtMoneyVal(kHdr.totalSesValue, kHdr.currency || currency),
        optional: !kRequired
      },
      checks
    ),
    buildField(
      { fieldKey: 'currency', label: 'Currency', captured: kHdr.currency, optional: !kRequired },
      checks
    )
  ]

  const invoiceOcr = getOcrForDocType(inv, 'invoice')
  const enrichedInvoiceOcr = invoiceOcr
    ? enrichOcrPayload({
        ...invoiceOcr,
        documentType: 'invoice',
        tables: invoiceOcr.tables || []
      })
    : null
  const invoiceLines =
    enrichedInvoiceOcr?.lineItems?.length
      ? enrichedInvoiceOcr.lineItems
      : (ocrDocType === 'invoice' || inv?.batch_document_types?.includes('invoice')) &&
          inv?.lines?.length
        ? inv.lines.map(mapDetailLineToOcr)
        : invoiceOcr?.lineItems || (ocrDocType === 'invoice' ? ocrLines : [])

  const sectionDefs = [
    {
      key: 'A_invoice',
      label: VALIDATION_SECTION_LABELS.A_invoice,
      fields: sectionA,
      lineItems: invoiceLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.invoice
    },
    {
      key: 'B_taxInvoice',
      label: VALIDATION_SECTION_LABELS.B_taxInvoice,
      fields: sectionB,
      visible: taxSectionRequired
    },
    {
      key: 'D_beritaAcara',
      label: VALIDATION_SECTION_LABELS.D_beritaAcara,
      fields: sectionD,
      lineItems: dTableLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.berita_acara,
      visible: baSectionRequired
    },
    {
      key: 'E_manhourSummary',
      label: VALIDATION_SECTION_LABELS.E_manhourSummary,
      fields: sectionE,
      lineItems: eLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.manhour_summary,
      visible: eRequired
    },
    {
      key: 'F_timesheet',
      label: VALIDATION_SECTION_LABELS.F_timesheet,
      fields: sectionF,
      manpowerSheets: fManpowerSheets,
      lineItems: fManpowerSheets.length ? [] : fLines,
      lineColumns: fManpowerSheets.length
        ? OCR_LINE_ITEM_COLUMNS.timesheet_display
        : OCR_LINE_ITEM_COLUMNS.timesheet,
      hideHeaderFields: fManpowerSheets.length > 0,
      visible: fRequired
    },
    {
      key: 'G_attendance',
      label: VALIDATION_SECTION_LABELS.G_attendance,
      fields: sectionG,
      lineItems: gLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.attendance,
      hideHeaderFields: true,
      visible: gRequired
    },
    {
      key: 'H_po',
      label: VALIDATION_SECTION_LABELS.H_po,
      fields: sectionH,
      lineItems: hLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.po,
      visible: hRequired
    },
    {
      key: 'I_poAppendix',
      label: VALIDATION_SECTION_LABELS.I_poAppendix,
      fields: sectionI,
      lineItems: iLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.po_appendix,
      visible: iRequired
    },
    {
      key: 'K_ses',
      label: VALIDATION_SECTION_LABELS.K_ses,
      fields: sectionK,
      lineItems: kLines,
      lineColumns: OCR_LINE_ITEM_COLUMNS.ses,
      visible: kRequired
    }
  ]

  return sectionDefs
    .map(({ visible, ...section }) =>
      attachSectionExtractTables(applySectionCorrections(section, corrections), inv)
    )
    .filter(
      (section) =>
        section.visible ??
        shouldShowSection(
          section.key,
          inv,
          section.fields,
          section.lineItems || [],
          section.extractTables || []
        )
    )
}
