/**
 * Derive Extract & Validate tabs/fields from live Prompt Config.
 * Enabled documents → tabs (config display order). Fields → displayName + value by name.
 * Per-document configHash comparison marks stale tabs (no auto re-extract).
 */

import {
  buildExtractValidateSections,
  NON_PO_EXTRACT_SECTION_KEYS
} from './extractValidateSections'
import {
  coerceEssaPoNumber,
  enrichOcrPayload,
  formatOcrDisplayValue,
  normalizeValidationDocumentType
} from 'api/apInvoiceOcr'
import { resolveInvoiceTypeCode } from 'api/essaInvoiceType'

const ENTRY_FIELD_RE =
  /^(invoiceLineItems|lineItems|manpower|manhourSummary|timesheets|timesheetEntries|attendanceEntries|poLineItems|appendixItems|sesLineItems)$/i

/** Prompt Config / OCR documentType → legacy Extract & Validate section key. */
export const OCR_TYPE_TO_SECTION_KEY = {
  invoice: 'A_invoice',
  tax_invoice: 'B_taxInvoice',
  faktur_pajak: 'B_taxInvoice',
  notice: 'C_notice',
  notice_letter: 'C_notice',
  receipt: 'C_notice',
  berita_acara: 'D_beritaAcara',
  manhour_summary: 'E_manhourSummary',
  summary_calculation_manhour: 'E_manhourSummary',
  timesheet: 'F_timesheet',
  daily_timesheet: 'F_timesheet',
  attendance: 'G_attendance',
  daily_attendance: 'G_attendance',
  po: 'H_po',
  purchase_order: 'H_po',
  po_appendix: 'I_poAppendix',
  purchase_order_appendix: 'I_poAppendix',
  ses: 'K_ses',
  service_entry_sheet: 'K_ses'
}

/** Prompt Config fieldName → OCR header keys after enrich/canonicalize. */
const FIELD_LOOKUP_ALIASES = {
  invNo: ['invoiceNumber', 'invoiceNo', 'invNo'],
  date: ['invoiceDate', 'date'],
  vatAmount: ['taxAmount', 'vatAmount'],
  thisManhours: ['thisManHours', 'thisManhours', 'thisManhour'],
  rolesOfManpower: ['manpowerRoles', 'rolesOfManpower'],
  bankAccountNumber: ['bankAccount', 'bankAccountNumber']
}

const isEntryField = (name) => ENTRY_FIELD_RE.test(String(name || '').trim())

const isEmpty = (v) => v == null || v === '' || v === '—'

const fieldLookupKeys = (name) => {
  const key = String(name || '').trim()
  if (!key) return []
  const aliases = FIELD_LOOKUP_ALIASES[key] || []
  return [...new Set([key, ...aliases])]
}

const readOcrValueByKey = (ocr, key) => {
  if (!key) return null

  const header = ocr?.header || {}
  if (!isEmpty(header[key])) return header[key]
  const headerMatch = Object.entries(header).find(
    ([k, v]) => k.toLowerCase() === key.toLowerCase() && !isEmpty(v)
  )
  if (headerMatch) return headerMatch[1]

  const structured = ocr?.structuredFields
  if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
    if (!isEmpty(structured[key])) return structured[key]
  }

  if (ocr?.fields && typeof ocr.fields === 'object' && !Array.isArray(ocr.fields)) {
    if (!isEmpty(ocr.fields[key])) return ocr.fields[key]
  }

  if (Array.isArray(ocr?.fields)) {
    const row = ocr.fields.find(
      (f) =>
        (f.fieldName || f.name) === key ||
        f.fieldKey === key ||
        String(f.fieldName || f.name || '').toLowerCase() === key.toLowerCase()
    )
    const val = row?.fieldValue ?? row?.value
    if (!isEmpty(val)) return val
  }

  return null
}

const lookupExtractedValue = (name, ocr, legacyFields = []) => {
  const keys = fieldLookupKeys(name)
  if (!keys.length) return null

  const fromLegacy = legacyFields.find(
    (f) => keys.includes(f.fieldKey) && !isEmpty(f.value)
  )
  if (fromLegacy) {
    if (isPoNumberFieldName(name) || isPoNumberFieldName(fromLegacy.fieldKey)) {
      return coerceEssaPoNumber(fromLegacy.value)
    }
    return fromLegacy.value
  }

  for (const key of keys) {
    const value = readOcrValueByKey(ocr, key)
    if (!isEmpty(value)) {
      if (isPoNumberFieldName(name) || isPoNumberFieldName(key)) {
        return coerceEssaPoNumber(value)
      }
      return value
    }
  }

  return null
}

const isPoNumberFieldName = (name) => {
  const token = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return (
    token === 'ponumber' ||
    token === 'pono' ||
    token === 'contractorderno' ||
    token === 'contractno' ||
    token === 'purchaseorderno'
  )
}

/** OCR payload for a Prompt Config document type (classifier slug or canonical). */
const lookupOcrByType = (ocrByType, ocrType) => {
  if (!ocrByType || !ocrType) return null
  if (ocrByType[ocrType]) return ocrByType[ocrType]

  const canon = normalizeValidationDocumentType(ocrType)
  if (canon && ocrByType[canon]) return ocrByType[canon]

  for (const [key, value] of Object.entries(ocrByType)) {
    if (!value) continue
    if (normalizeValidationDocumentType(key) === (canon || ocrType)) return value
  }

  return null
}

const buildConfigField = (fieldDef, captured) => {
  const display = formatOcrDisplayValue(captured)
  const hasValue = display != null && display !== '' && display !== '—'
  return {
    fieldKey: fieldDef.fieldName,
    label: fieldDef.displayName || fieldDef.fieldName,
    status: hasValue ? 'pass' : 'warn',
    optional: false,
    value: hasValue ? captured : null,
    missingMessage: 'Not yet extracted'
  }
}

/**
 * Resolve which Prompt Config invoice-type code to load for an invoice.
 */
export function resolvePromptConfigTypeCode(inv) {
  return resolveInvoiceTypeCode(inv)
}

/**
 * Build extract sections from Prompt Config enabled documents.
 * Falls back to hardcoded builders when config is missing / has no enabled docs.
 */
export function buildConfigDrivenExtractSections(
  inv,
  promptTypeDetail,
  checks = [],
  corrections = {},
  { isNonPo = false } = {}
) {
  const legacyBuilt = buildExtractValidateSections(inv, checks, corrections)
  const enabledDocs = (promptTypeDetail?.documents || [])
    .filter((d) => d.isEnabled)
    .slice()
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  if (!enabledDocs.length) {
    if (!isNonPo) return legacyBuilt
    const invoiceOnly = legacyBuilt.filter((section) =>
      NON_PO_EXTRACT_SECTION_KEYS.has(section.key)
    )
    return invoiceOnly.length ? invoiceOnly : legacyBuilt.slice(0, 1)
  }

  const legacyByKey = Object.fromEntries(legacyBuilt.map((s) => [s.key, s]))
  const ocrByType = inv?.ocr_by_type || {}

  return enabledDocs.map((doc) => {
    const ocrType = String(doc.ocrDocumentType || '').trim().toLowerCase()
    const canonType = normalizeValidationDocumentType(ocrType) || ocrType
    let sectionKey =
      OCR_TYPE_TO_SECTION_KEY[canonType] ||
      OCR_TYPE_TO_SECTION_KEY[ocrType] ||
      `cfg_${doc.code || ocrType}`

    let legacy = legacyByKey[sectionKey]
    if (!legacy && isNonPo && canonType === 'invoice') {
      legacy = legacyByKey.A_nonPoTravel || legacyByKey.A_invoice
      if (legacy) sectionKey = legacy.key
    }

    const rawOcr = lookupOcrByType(ocrByType, ocrType)
    const ocr = rawOcr
      ? enrichOcrPayload({ ...rawOcr, documentType: canonType }) || rawOcr
      : null

    const scalarDefs = (doc.fields || []).filter((f) => !isEntryField(f.fieldName))
    const fields = scalarDefs.map((f) =>
      buildConfigField(f, lookupExtractedValue(f.fieldName, ocr, legacy?.fields || []))
    )

    const storedHash = ocr?.configHash || rawOcr?.configHash || null
    const currentHash = doc.configHash || null
    const hasExtractedSignal =
      fields.some((f) => f.value != null) ||
      Boolean(legacy?.lineItems?.length) ||
      Boolean(legacy?.extractTables?.length) ||
      Boolean(legacy?.manpowerSheets?.length) ||
      Boolean(ocr)

    // Stale only when we have both fingerprints and they differ.
    // Legacy extracts without a stored hash are not flagged.
    const configStale = Boolean(
      hasExtractedSignal && storedHash && currentHash && storedHash !== currentHash
    )

    return {
      key: sectionKey,
      label: doc.name || legacy?.label || doc.code || sectionKey,
      documentCode: doc.code,
      ocrDocumentType: ocrType,
      configHash: currentHash,
      extractedConfigHash: storedHash,
      configStale,
      fields,
      lineItems: legacy?.lineItems || [],
      lineColumns: legacy?.lineColumns,
      extractTables: legacy?.extractTables || [],
      manpowerSheets: legacy?.manpowerSheets || [],
      hideHeaderFields: legacy?.hideHeaderFields && fields.length === 0,
      visible: true
    }
  })
}
