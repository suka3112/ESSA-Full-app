import { useEffect, useState } from 'react'
import { fetchCfgInvoiceConfig } from 'api/extractionPromptConfig'
import { CATEGORY_BY_CODE, DATA_POINTS, SOURCES, SOURCE_BY_CODE, registerInvoiceCategoryLabels, registerSourceLabels, sourceLabel } from './catalog'

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
  FAKTUR_PAJAK: ['FAKTUR_PAJAK'],
  BERITA_ACARA: ['BAST'],
  WORK_PROGRESS_CERTIFICATE_BAST: ['BAST'],
  DAILY_TIME_SHEET: ['TIMESHEET'],
  TIMESHEET: ['TIMESHEET'],
  SUMMARY_CALCULATION_MANHOUR: ['MANPOWER_SUMMARY'],
  MANPOWER_SUMMARY: ['MANPOWER_SUMMARY'],
  DAILY_ATTENDANCE: ['FACE_ID'],
  FACE_ID: ['FACE_ID'],
  CONTRACT_ENGAGEMENT_LETTER: ['CONTRACT'],
  OVERTIME_APPROVAL: ['OVERTIME_APPROVAL'],
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

/**
 * N-Way source codes that mean this extract tab (section key, OCR type, and document code).
 * A live document code and its catalog source both count, so Invoice matches INVOICE
 * and Daily Timesheet matches TIMESHEET.
 */
export const sourceCodesForSection = (section) => {
  if (!section) return []
  const codes = new Set()
  const key = section.key
  const ocr = normKey(section.ocrDocumentType)
  const docCode = String(section.documentCode || '').toUpperCase()
  SOURCES.forEach((source) => {
    if (key && (source.sectionKeys || []).includes(key)) codes.add(source.code)
    if (ocr && (source.ocrTypes || []).some((type) => normKey(type) === ocr)) codes.add(source.code)
  })
  if (docCode) {
    codes.add(docCode)
    sourcesForDoc(docCode).forEach((code) => codes.add(code))
    const docNorm = normKey(docCode)
    SOURCES.forEach((source) => {
      if ((source.ocrTypes || []).some((type) => normKey(type) === docNorm)) codes.add(source.code)
    })
  }
  return [...codes]
}

/** A rule belongs on a document tab when that document is the source or a check-against target. */
export const ruleUsesDocument = (rule, codes = []) => {
  if (!codes.length) return false
  const wanted = new Set(codes.map((code) => String(code || '').toUpperCase()))
  const used = [rule?.source, ...(rule?.targets || []).map((target) => target.doc)]
  return used.some((code) => wanted.has(String(code || '').toUpperCase()))
}

const normKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')

let cache = null
let inflight = null

const loadTypes = async () => {
  if (cache) return cache
  if (!inflight) {
    inflight = fetchCfgInvoiceConfig()
      .then((tree) => {
        cache = (tree?.categories || []).flatMap((c) =>
          (c.invoiceTypes || []).map((t) => ({
            ...t,
            categoryCode: c.code,
            categoryName: c.name
          }))
        )
        registerInvoiceCategoryLabels(
          cache.map((t) => ({ code: t.code, label: t.name || t.code }))
        )
        registerSourceLabels(
          cache.flatMap((t) => (t.documents || []).map((d) => ({ code: d.code, label: d.name || d.code })))
        )
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

const isNonPoInvoiceType = (type) => {
  const categoryCode = String(type?.categoryCode || '').toUpperCase()
  const categoryName = String(type?.categoryName || type?.category || '')
  const subtype = String(type?.name || type?.subtype || '')
  const code = String(type?.code || '').toUpperCase()
  return categoryCode === 'NON_PO' || code === 'NON_PO' || subtype.toLowerCase() === 'non-po' || /non[-\s]?po/i.test(categoryName)
}

/** PO / Non-PO invoice types from Invoice Category, in the shape the N-Way rail uses. */
export const invoiceCategoryOptions = (types = []) =>
  types
    .map((t) => ({
      code: String(t.code || '').toUpperCase(),
      label: t.name || t.subtype || t.code,
      group: isNonPoInvoiceType(t) ? 'NON_PO' : 'PO'
    }))
    .filter((t) => t.code)

/**
 * Invoice types that apply to the chosen scope. Common rules, and categories with no
 * Fields to Capture setup yet, use every invoice type.
 * A catalog code (MANPOWER) expands to its invoice types; a live type code matches itself.
 */
export const typesForScope = (types, scope, categories = []) => {
  if (scope !== 'CATEGORY' || !categories.length) return types
  const codes = new Set(
    categories.flatMap((c) => {
      const mapped = CATEGORY_BY_CODE[c]?.invoiceTypeCodes
      if (mapped?.length) return mapped.map((code) => String(code).toUpperCase())
      return [String(c).toUpperCase()]
    })
  )
  const picked = types.filter((t) => codes.has(String(t.code || '').toUpperCase()))
  return picked.length ? picked : types
}

/**
 * A configured document matches the dropdown value when the value is that document's
 * own code. Older rules store a catalog source (INVOICE, BAST, …); those still match
 * the document types that feed that source.
 */
const docMatchesSource = (doc, sourceCode) => {
  const code = String(doc?.code || '').toUpperCase()
  const source = String(sourceCode || '').toUpperCase()
  if (!code || !source) return false
  if (code === source) return true
  return Boolean(SOURCE_BY_CODE[source]) && sourcesForDoc(code).includes(source)
}

/**
 * Source documents for the invoice categories in scope.
 * Each option is a document type from Document Types (its own code, so two documents
 * that share a display name stay separate). SAP and other systems stay available
 * because they are not document types.
 */
export const sourceOptionsForScope = (types, scope, categories) => {
  const byCode = new Map()
  typesForScope(types, scope, categories).forEach((t) => {
    ;(t.documents || [])
      .filter((d) => d.code)
      .forEach((d) => {
        const code = String(d.code).toUpperCase()
        const entry = byCode.get(code) || {
          code,
          names: new Set(),
          types: new Set(),
          order: d.displayOrder ?? 0
        }
        if (d.name) entry.names.add(d.name)
        if (t.name) entry.types.add(t.name)
        entry.order = Math.min(entry.order, d.displayOrder ?? entry.order)
        byCode.set(code, entry)
      })
  })
  const documents = Array.from(byCode.values())
    .map((entry) => {
      const names = Array.from(entry.names)
      return {
        code: entry.code,
        label: names.length ? names.join(' / ') : entry.code,
        channel: 'VENDOR_PDF',
        fromCapture: true,
        types: Array.from(entry.types),
        order: entry.order
      }
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
  const labelCount = {}
  documents.forEach((doc) => {
    labelCount[doc.label] = (labelCount[doc.label] || 0) + 1
  })
  documents.forEach((doc) => {
    if (labelCount[doc.label] > 1 && doc.types.length) doc.label = `${doc.label} · ${doc.types.join(', ')}`
  })
  const taken = new Set(documents.map((doc) => doc.code))
  const systems = SOURCES.filter((s) => (s.channel === 'SAP' || s.channel === 'EXTERNAL' || s.channel === 'ESSA_SYSTEM') && !taken.has(s.code))
  return [...documents, ...systems]
}

const isConfiguredDocument = (types, scope, categories, sourceCode) => {
  const source = String(sourceCode || '').toUpperCase()
  return typesForScope(types, scope, categories).some((t) =>
    (t.documents || []).some((d) => String(d.code || '').toUpperCase() === source)
  )
}

/** Where the engine should read a source. Catalog sources stay as they are; a document-type code is looked up by its OCR type. */
export const sourceMeta = (code) => {
  const upper = String(code || '').toUpperCase()
  if (SOURCE_BY_CODE[upper]) return SOURCE_BY_CODE[upper]
  const mapped = (DOC_TO_SOURCES[upper] || []).map((c) => SOURCE_BY_CODE[c]).filter(Boolean)
  const ocrTypes = new Set([upper.toLowerCase()])
  const sectionKeys = []
  mapped.forEach((src) => {
    src.ocrTypes.forEach((t) => ocrTypes.add(t))
    src.sectionKeys.forEach((key) => {
      if (!sectionKeys.includes(key)) sectionKeys.push(key)
    })
  })
  return {
    code: upper,
    channel: mapped[0]?.channel || 'VENDOR_PDF',
    sectionKeys,
    ocrTypes: Array.from(ocrTypes)
  }
}

/** Catalog key the matching engine understands for a captured field, or the field name itself. */
export const dataKeyForField = (fieldName, label = '') => {
  const key = normKey(fieldName)
  const hay = `${fieldName} ${label}`.toLowerCase()
  const hit = Object.entries(DATA_POINTS).find(([, dp]) => dp.keys.includes(key)) ||
    Object.entries(DATA_POINTS).find(([, dp]) => dp.match.test(hay))
  return hit ? hit[0] : fieldName
}

/** Data points captured on this document for the invoice categories in scope. */
export const fieldOptionsForSource = (types, scope, categories, sourceCode) => {
  const seen = new Map()
  typesForScope(types, scope, categories).forEach((t) => {
    ;(t.documents || [])
      .filter((d) => docMatchesSource(d, sourceCode))
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

/** Data-point list for a source: that document's fields, or the system fields when it is not a captured document. */
export const dataPointOptionsForSource = (types, scope, categories, sourceCode) => {
  const captured = fieldOptionsForSource(types, scope, categories, sourceCode)
  if (captured.length) return captured
  if (isConfiguredDocument(types, scope, categories, sourceCode)) return []
  const system = SYSTEM_FIELDS[String(sourceCode || '').toUpperCase()]
  if (!system) return []
  return system.map(([key, label]) => ({ fieldName: key, label, docs: [], types: [], dataKey: key }))
}

/**
 * Field dropdown for one “Check against” document:
 * fields captured on that document for this invoice category, otherwise the system's own fields.
 */
export const fieldGroupsForTarget = (types, scope, categories, docCode) => {
  const label = sourceLabel(docCode)
  const captured = fieldOptionsForSource(types, scope, categories, docCode)
  if (captured.length) {
    return [{
      label: `Fields to capture · ${label}`,
      options: captured.map((f) => ({ value: f.fieldName, label: f.label, dataKey: f.dataKey }))
    }]
  }
  if (isConfiguredDocument(types, scope, categories, docCode)) {
    return [{ label: `${label} has no fields to capture for this invoice category`, options: [] }]
  }
  const system = SYSTEM_FIELDS[String(docCode || '').toUpperCase()]
  if (system?.length) {
    const channel = SOURCE_BY_CODE[docCode]?.channel
    return [{
      label: channel === 'SAP' ? `SAP · ${label}` : label,
      options: system.map(([key, text]) => ({ value: key, label: text, dataKey: key }))
    }]
  }
  return [{ label: `${label} has no fields to capture for this invoice category`, options: [] }]
}

/** Option in the target's field list that holds the same data point as the rule, if any. */
export const suggestTargetField = (groups, dataKey) =>
  (dataKey && groups.flatMap((g) => g.options).find((o) => o.dataKey === dataKey)?.value) || ''
