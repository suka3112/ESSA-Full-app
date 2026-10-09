import { useEffect, useState } from 'react'
import { fetchPromptConfig } from 'api/extractionPromptConfig'
import { CATEGORY_BY_CODE, DATA_POINTS, SOURCES } from './catalog'

/**
 * Links Invoice Configuration › Fields to Capture to the N-Way rule editor:
 * which source documents an invoice category has, and which data points
 * (configured fields) each source document captures.
 */

/** Fields to Capture document code → N-Way source document code(s). */
const DOC_TO_SOURCES = {
  INVOICE: ['INVOICE'],
  COMMERCIAL_INVOICE: ['INVOICE'],
  LOGISTICS_INVOICE: ['INVOICE'],
  PROFORMA_INVOICE: ['INVOICE'],
  TAX_INVOICE: ['FAKTUR_PAJAK'],
  TAX_INVOICE_VAT: ['FAKTUR_PAJAK'],
  BERITA_ACARA: ['BAST'],
  DAILY_TIME_SHEET: ['TIMESHEET'],
  SUMMARY_CALCULATION_MANHOUR: ['MANPOWER_SUMMARY'],
  DAILY_ATTENDANCE: ['FACE_ID'],
  PO: ['PO'],
  PO_APPENDIX: ['PO'],
  PACKING_LIST: ['PACKING_LIST'],
  PACKING_SLIP: ['PACKING_LIST'],
  BILL_OF_LADING_AWB: ['SHIPPING_BILL', 'AIRWAY_BILL'],
  MONTHLY_MEAL_SUMMARY: ['MEAL_ATTENDANCE'],
  ATTENDANCE_STATISTICS_TABLE: ['MEAL_ATTENDANCE'],
  IZIN_USAHA_JASA_KONSTRUKSI: ['SIUJK']
}

const sourcesForDoc = (code) => DOC_TO_SOURCES[String(code || '').toUpperCase()] || []

const normKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')

let cache = null
let inflight = null

const loadTypes = async () => {
  if (cache) return cache
  if (!inflight) {
    inflight = fetchPromptConfig()
      .then((tree) => {
        cache = (tree?.categories || []).flatMap((c) => c.invoiceTypes || [])
        return cache
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Invoice types from Fields to Capture, loaded once per session. */
export const useCaptureTypes = () => {
  const [state, setState] = useState({ types: cache || [], loading: !cache, error: null })
  useEffect(() => {
    if (cache) return undefined
    let alive = true
    loadTypes()
      .then((types) => alive && setState({ types, loading: false, error: null }))
      .catch((error) => alive && setState({ types: [], loading: false, error }))
    return () => {
      alive = false
    }
  }, [])
  return state
}

/**
 * Invoice types that apply to the chosen scope. Common rules, and categories with no
 * Fields to Capture setup yet, use every invoice type.
 */
export const typesForScope = (types, scope, categories = []) => {
  if (scope !== 'CATEGORY' || !categories.length) return types
  const codes = new Set(categories.flatMap((c) => CATEGORY_BY_CODE[c]?.invoiceTypeCodes || []))
  const picked = types.filter((t) => codes.has(String(t.code || '').toUpperCase()))
  return picked.length ? picked : types
}

/** Source documents for the scope: documents enabled in Fields to Capture, plus SAP / system sources. */
export const sourceOptionsForScope = (types, scope, categories) => {
  const fromDocs = new Set(
    typesForScope(types, scope, categories)
      .flatMap((t) => t.documents || [])
      .filter((d) => d.isEnabled)
      .flatMap((d) => sourcesForDoc(d.code))
  )
  return SOURCES.filter((s) => fromDocs.has(s.code) || s.channel !== 'VENDOR_PDF')
}

/** Catalog key the matching engine understands for a captured field, or the field name itself. */
export const dataKeyForField = (fieldName, label = '') => {
  const key = normKey(fieldName)
  const hay = `${fieldName} ${label}`.toLowerCase()
  const hit = Object.entries(DATA_POINTS).find(([, dp]) => dp.keys.includes(key)) ||
    Object.entries(DATA_POINTS).find(([, dp]) => dp.match.test(hay))
  return hit ? hit[0] : fieldName
}

/** Data points (configured fields) captured on a source document within the scope. */
export const fieldOptionsForSource = (types, scope, categories, sourceCode) => {
  const seen = new Map()
  typesForScope(types, scope, categories).forEach((t) => {
    ;(t.documents || [])
      .filter((d) => d.isEnabled && sourcesForDoc(d.code).includes(sourceCode))
      .forEach((d) => {
        ;(d.fields || []).forEach((f) => {
          const name = String(f.fieldName || '').trim()
          if (!name) return
          const entry = seen.get(name) || { fieldName: name, label: f.displayName || name, docs: new Set(), types: new Set() }
          entry.docs.add(d.name)
          entry.types.add(t.name)
          seen.set(name, entry)
        })
      })
  })
  return Array.from(seen.values())
    .map((e) => ({ ...e, docs: Array.from(e.docs), types: Array.from(e.types), dataKey: dataKeyForField(e.fieldName, e.label) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Fields SAP / ESSA systems / external portals expose for a check-against document.
 * These sources have no Fields to Capture setup, so their fields are listed here.
 * value = DATA_POINTS key the matching engine reads; label = what the business calls it on that source.
 */
const SYSTEM_FIELDS = {
  PO: [
    ['po_number', 'PO number'],
    ['vendor_name', 'Vendor name'],
    ['company_name', 'ESSA company (buyer)'],
    ['currency', 'Currency'],
    ['payment_terms', 'Payment terms'],
    ['item_description', 'Item / service description'],
    ['quantity', 'Ordered quantity'],
    ['uom', 'Unit of measure'],
    ['unit_rate', 'Unit price'],
    ['invoice_amount', 'PO value'],
    ['service_period', 'Service period'],
    ['wht_code', 'Withholding tax code']
  ],
  GRN_SES: [
    ['ses_reference', 'GRN / SES number'],
    ['po_number', 'PO number'],
    ['item_description', 'Item / service description'],
    ['quantity', 'Received quantity'],
    ['uom', 'Unit of measure'],
    ['claim_value', 'GRN / SES value'],
    ['service_period', 'Service period']
  ],
  VENDOR_MASTER: [
    ['vendor_name', 'Vendor name'],
    ['npwp', 'Vendor NPWP'],
    ['bank_account', 'Bank account'],
    ['currency', 'Order currency'],
    ['payment_terms', 'Payment terms'],
    ['wht_code', 'Withholding tax code'],
    ['vendor_status', 'Block indicator'],
    ['debit_balance', 'Debit balance']
  ],
  INVOICE_HISTORY: [
    ['invoice_number', 'Invoice number'],
    ['fp_number', 'Faktur Pajak number'],
    ['vendor_name', 'Vendor name'],
    ['invoice_date', 'Invoice date'],
    ['invoice_amount', 'Invoice amount']
  ],
  CORETAX: [
    ['fp_number', 'Faktur Pajak number'],
    ['fp_date', 'Faktur Pajak date'],
    ['npwp', 'Seller NPWP'],
    ['vendor_name', 'Seller name'],
    ['dpp', 'DPP (taxable base)'],
    ['fp_value', 'PPN (VAT) amount']
  ],
  FACE_ID: [
    ['worker_id', 'Worker name & ID'],
    ['man_days', 'Days present'],
    ['manhours', 'Hours on site'],
    ['overtime_hours', 'Overtime hours']
  ],
  HCIS: [
    ['worker_id', 'Employee name & ID'],
    ['invoice_amount', 'Cleared amount']
  ],
  DOA_APPROVAL: [
    ['invoice_amount', 'Approved amount'],
    ['vendor_name', 'Vendor name']
  ]
}

/**
 * A target field is either a field reference (captured field name or catalog key, e.g. “poNumber”, “vendor_name”)
 * or, on rules seeded from the Data Point × Doc matrix, the matrix's free-text note (e.g. “#52 Seller NPWP”).
 */
export const isFieldRef = (field) => Boolean(field) && !/[\s#(&+]/.test(field)

/** Engine data key for a check-against field: catalog keys stay as they are, captured field names are mapped. */
export const targetDataKey = (field) => (DATA_POINTS[field] ? field : dataKeyForField(field))

/**
 * Field dropdown for one “Check against” document, as option groups:
 * fields captured from that document (Fields to Capture), then the fields its system exposes.
 * Documents with neither fall back to the standard data points.
 */
export const fieldGroupsForTarget = (types, scope, categories, docCode) => {
  const label = SOURCES.find((s) => s.code === docCode)?.label || docCode
  const groups = []
  const captured = fieldOptionsForSource(types, scope, categories, docCode)
  if (captured.length) {
    groups.push({
      label: `Captured from ${label}`,
      options: captured.map((f) => ({ value: f.fieldName, label: f.label, dataKey: f.dataKey }))
    })
  }
  const system = SYSTEM_FIELDS[docCode]
  if (system) {
    const taken = new Set(captured.map((f) => f.dataKey))
    const options = system.filter(([key]) => !taken.has(key)).map(([key, text]) => ({ value: key, label: text, dataKey: key }))
    const channel = SOURCES.find((s) => s.code === docCode)?.channel
    if (options.length) groups.push({ label: channel === 'SAP' ? `SAP · ${label}` : label, options })
  }
  if (!groups.length) {
    groups.push({
      label: `${label} has no Fields to Capture — standard data points`,
      options: Object.entries(DATA_POINTS).map(([key, dp]) => ({ value: key, label: dp.label, dataKey: key }))
    })
  }
  return groups
}

/** Option in the target's field list that holds the same data point as the rule, if any. */
export const suggestTargetField = (groups, dataKey) =>
  (dataKey && groups.flatMap((g) => g.options).find((o) => o.dataKey === dataKey)?.value) || ''
