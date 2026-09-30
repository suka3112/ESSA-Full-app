/**
 * Map OCR invoice-type codes / stored labels onto dashboard display labels.
 * Civil Contractor shares the 4203 PO series with Manpower, so a missing or
 * defaulted "Manpower" label must not win over civil documents / vendors.
 */

export const INVOICE_TYPE_CODE_TO_LABEL = {
  MANPOWER_SERVICES: 'Manpower',
  CIVIL_CONTRACTOR: 'Civil Contractor',
  MATERIAL_IMPORT: 'Material Import',
  CAMP_SERVICE_AND_CATERING: 'Camp Service and Catering',
  NON_PO: 'Non-PO'
}

export const INVOICE_TYPE_LABEL_TO_CODE = {
  Manpower: 'MANPOWER_SERVICES',
  'Civil Contractor': 'CIVIL_CONTRACTOR',
  'Material Import': 'MATERIAL_IMPORT',
  'Camp Service and Catering': 'CAMP_SERVICE_AND_CATERING',
  'Non-PO': 'NON_PO'
}

const CIVIL_DOC_TYPES = [
  'transmittal',
  'monthly_progress_report',
  'sertifikat_badan_usaha',
  'izin_usaha_jasa_konstruksi',
  'notice_letter'
]

const MANPOWER_DOC_TYPES = [
  'timesheet',
  'daily_timesheet',
  'attendance',
  'daily_attendance',
  'manhour_summary',
  'summary_calculation_manhour'
]

const MATERIAL_DOC_TYPES = [
  'packing_list',
  'bill_of_lading',
  'awb',
  'commercial_invoice',
  'logistics_invoice'
]

const CATERING_DOC_TYPES = ['attendance_statistics', 'monthly_meal_summary', 'pob_report']

const toCodeKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

export function normalizeInvoiceTypeLabel(value) {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null
  const fromCode = INVOICE_TYPE_CODE_TO_LABEL[toCodeKey(raw)]
  if (fromCode) return fromCode
  const lower = raw.toLowerCase()
  if (lower === 'civil' || lower.includes('civil contractor') || lower.includes('konstruksi')) {
    return 'Civil Contractor'
  }
  if (lower === 'manpower' || lower.includes('manpower')) return 'Manpower'
  if (lower.includes('material import') || lower === 'import') return 'Material Import'
  if (lower.includes('catering') || lower.includes('camp service')) {
    return 'Camp Service and Catering'
  }
  if (lower === 'non-po' || lower === 'non_po' || lower === 'nonpo') return 'Non-PO'
  if (INVOICE_TYPE_LABEL_TO_CODE[raw]) return raw
  return null
}

export function invoiceTypeCodeFromLabel(label) {
  const normalized = normalizeInvoiceTypeLabel(label)
  return normalized ? INVOICE_TYPE_LABEL_TO_CODE[normalized] || null : null
}

const collectDocTypeTokens = (row = {}) => {
  const tokens = []
  const push = (value) => {
    const token = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
    if (token) tokens.push(token)
  }

  for (const type of row.batch_document_types || []) push(type)
  for (const key of Object.keys(row.ocr_by_type || {})) push(key)

  const classification = row.classification || {}
  for (const page of classification.pages || []) {
    push(page.categoryId || page.category || page.documentType || page.type)
  }
  for (const group of classification.categoryGroups || classification.groups || []) {
    push(group.categoryId || group.id || group.type)
  }

  return tokens
}

const collectSearchBlob = (row = {}) => {
  const header = row.ocr?.header || {}
  return [
    row.vendor_name,
    row.file_name,
    row.fileName,
    header.vendorName,
    header.serviceName,
    header.description,
    header.invoiceDescription,
    header.natureOfExpense,
    header.workPackage,
    header.certificateNumber
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function inferInvoiceTypeLabel(row = {}) {
  const blob = collectSearchBlob(row)
  const docs = collectDocTypeTokens(row)

  const hasCivilDoc = CIVIL_DOC_TYPES.some((type) => docs.includes(type))
  const hasManpowerDoc = MANPOWER_DOC_TYPES.some((type) => docs.includes(type))
  const hasMaterialDoc = MATERIAL_DOC_TYPES.some((type) => docs.includes(type))
  const hasCateringDoc = CATERING_DOC_TYPES.some((type) => docs.includes(type))

  if (
    hasCivilDoc ||
    /\bcivil\b|kontraktor|konstruksi|berca|buana\s+sakti|bbs-bap|progress\s+claim|sertifikat\s+badan\s+usaha|izin\s+usaha\s+jasa/.test(
      blob
    )
  ) {
    return 'Civil Contractor'
  }

  if (
    hasMaterialDoc ||
    /garuda|logistik|material\s*import|packing\s+list|bill\s+of\s+lading/.test(blob)
  ) {
    return 'Material Import'
  }

  if (hasCateringDoc || /catering|camp\s+service/.test(blob)) {
    return 'Camp Service and Catering'
  }

  if (
    hasManpowerDoc ||
    /amanah|sinar makmur|\bmanpower\b|timesheet|manhour/.test(blob)
  ) {
    return 'Manpower'
  }

  if (/\bbumi\b|\benergi\b|\bfortuna\b/.test(blob)) return 'Civil Contractor'

  return null
}

const storedTypeSources = (row = {}) => [
  row.invoice_type_code,
  row.invoiceTypeId,
  row.invoice_type,
  row.meta?.invoiceTypeId,
  row.classification?.invoiceTypeId
]

/**
 * Display label for list / detail / dashboard. Civil signals override a
 * generic stored "Manpower" default (shared 4203 PO series).
 */
export function resolveInvoiceTypeLabel(row = {}) {
  const inferred = inferInvoiceTypeLabel(row)
  const stored = storedTypeSources(row)
    .map((value) => normalizeInvoiceTypeLabel(value))
    .find(Boolean)

  const poDigits = String(row.po_number || row.ocr?.header?.poNumber || '').replace(/\D/g, '')
  const hasEssaPo = /^4203\d{6}$/.test(poDigits)

  // Civil / material / catering signals override a generic Manpower or Non-PO label.
  if (
    inferred &&
    inferred !== 'Manpower' &&
    inferred !== 'Non-PO' &&
    (!stored || stored === 'Manpower' || stored === 'Non-PO')
  ) {
    return inferred
  }
  if (stored && stored !== 'Manpower' && stored !== 'Non-PO') return stored
  if (inferred && inferred !== 'Non-PO') return inferred
  if (stored && stored !== 'Non-PO') return stored
  if (hasEssaPo) return stored || inferred || 'Manpower'

  const markedNonPo =
    stored === 'Non-PO' ||
    toCodeKey(row.invoice_type_code || row.invoiceTypeId) === 'NON_PO' ||
    row.po_category === 'Non-PO' ||
    (row.invoice_workflow === 'NON_PO' && !inferred && !stored)

  if (markedNonPo) return 'Non-PO'
  return stored || inferred || 'Non-PO'
}

export function resolveInvoiceTypeCode(row = {}) {
  return invoiceTypeCodeFromLabel(resolveInvoiceTypeLabel(row)) || 'NON_PO'
}
