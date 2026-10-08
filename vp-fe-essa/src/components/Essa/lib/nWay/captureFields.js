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
