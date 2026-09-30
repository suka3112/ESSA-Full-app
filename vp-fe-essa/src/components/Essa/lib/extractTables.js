import { fmtMoney } from 'api/essaDashboard'
import {
  parseAmount,
  formatOcrDisplayValue,
  buildBeritaAcaraProgressExtractTable
} from 'api/apInvoiceOcr'

const SECTION_DOC_TYPES = {
  A_invoice: 'invoice',
  B_taxInvoice: 'tax_invoice',
  C_notice: 'notice',
  D_beritaAcara: 'berita_acara',
  E_manhourSummary: 'manhour_summary',
  F_timesheet: 'timesheet',
  G_attendance: 'attendance',
  H_po: 'po',
  I_poAppendix: 'po_appendix'
}

const LINE_ITEM_KEY_LABELS = {
  no: 'No.',
  idNo: 'ID No.',
  description: 'Description',
  name: 'Name',
  role: 'Role',
  position: 'Position',
  date: 'Date',
  username: 'Username',
  event: 'Event',
  quantity: 'Quantity',
  qty: 'Qty',
  unit: 'Unit',
  unitPrice: 'Unit Price',
  amount: 'Amount',
  totalAmount: 'Total Amount',
  deliveryDate: 'Delivery Date',
  roleOfManpower: 'Role of Manpower',
  regularManhour: 'Regular Manhour',
  overtimeManhour: 'Overtime Manhour',
  thisManhours: 'This Man Hours',
  thisPeriod: 'This Period',
  previousPeriod: 'Previous Period',
  cumulative: 'Cumulative',
  metric: 'Metric',
  unitPriceHourIDR: 'Unit Price / Hour (IDR)',
  amountMhrIDR: 'Amount Mhr (IDR)',
  dayWork: 'Day Work',
  actualMhr: 'Actual Mhr',
  overtimeMondaySaturday: 'Overtime Mon–Sat',
  overtimeSundayPublicHoliday: 'Overtime Sun & PH',
  totalActualMhr: 'Total Actual Mhr',
  remark: 'Remark',
  currency: 'Currency'
}

const PREFERRED_LINE_ITEM_KEYS = [
  'no',
  'description',
  'name',
  'role',
  'position',
  'roleOfManpower',
  'date',
  'username',
  'event',
  'quantity',
  'qty',
  'unit',
  'dayWork',
  'actualMhr',
  'regularManhour',
  'overtimeManhour',
  'thisManhours',
  'overtimeMondaySaturday',
  'overtimeSundayPublicHoliday',
  'totalActualMhr',
  'unitPrice',
  'unitPriceHourIDR',
  'amount',
  'amountMhrIDR',
  'totalAmount',
  'deliveryDate',
  'remark',
  'currency'
]

const NUMERIC_COLUMN_KEYS = new Set([
  'amount',
  'unitPrice',
  'totalAmount',
  'qty',
  'quantity',
  'regularManhour',
  'overtimeManhour',
  'unitPriceHourIDR',
  'amountMhrIDR',
  'dayWork',
  'actualMhr',
  'overtimeMondaySaturday',
  'overtimeSundayPublicHoliday',
  'totalActualMhr',
  'thisManhours',
  'thisPeriod',
  'previousPeriod',
  'cumulative'
])

const toColumnKey = (label, index) => {
  const token = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return token || `col_${index}`
}

const formatLineItemKeyLabel = (key) =>
  LINE_ITEM_KEY_LABELS[key] ||
  String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()

const isNumericColumnLabel = (label = '') =>
  /amount|price|qty|quantity|total|mhr|manhour|hour|idr|rp\b/i.test(label)

const columnLabel = (col, index) => {
  if (typeof col === 'string') return col
  return col?.label || col?.name || col?.key || `Col ${index + 1}`
}

const columnKeyFromDefinition = (col, index) => {
  if (typeof col === 'string') return toColumnKey(col, index)
  return col?.key || toColumnKey(columnLabel(col, index), index)
}

const rowLooksLikeHeader = (row, headers = []) => {
  if (!Array.isArray(row) || !headers.length) return false
  return headers.every((header, index) => {
    const label = columnLabel(header, index)
    if (!label) return true
    return String(row[index] ?? '').trim().toLowerCase() === String(label).trim().toLowerCase()
  })
}

const objectRowsToColumns = (rows = []) => {
  if (!rows.length || !rows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    return null
  }

  if (rows.every((row) => 'description' in row || 'value' in row)) {
    return {
      columns: [
        { key: 'description', label: 'Description' },
        { key: 'value', label: 'Value', align: 'end' }
      ],
      rows: rows.map((row) => ({
        description: row.description ?? '',
        value: row.value ?? ''
      }))
    }
  }

  const keys = [
    ...new Set(rows.flatMap((row) => Object.keys(row || {}).filter((key) => !key.startsWith('_'))))
  ]
  if (!keys.length) return null

  return {
    columns: keys.map((key) => ({
      key,
      label: formatLineItemKeyLabel(key),
      align: NUMERIC_COLUMN_KEYS.has(key) ? 'end' : undefined
    })),
    rows
  }
}

const normalizeOneExtractTable = (table) => {
  if (!table || typeof table !== 'object') return null

  const title = table.title || table.name || 'Table'
  const rawRows = Array.isArray(table.rows) ? table.rows : []
  if (!rawRows.length) return null

  let columns = []
  let dataRows = rawRows

  if (Array.isArray(table.columns) && table.columns.length) {
    columns = table.columns.map((col, index) => ({
      key: columnKeyFromDefinition(col, index),
      label: columnLabel(col, index),
      align: isNumericColumnLabel(columnLabel(col, index)) ? 'end' : undefined
    }))
  } else if (Array.isArray(table.headers) && table.headers.length) {
    columns = table.headers.map((header, index) => ({
      key: toColumnKey(header, index),
      label: String(header),
      align: isNumericColumnLabel(header) ? 'end' : undefined
    }))
  } else if (rawRows[0] && typeof rawRows[0] === 'object' && !Array.isArray(rawRows[0])) {
    const objectShape = objectRowsToColumns(rawRows)
    if (!objectShape) return null
    columns = objectShape.columns
    dataRows = objectShape.rows
  } else if (Array.isArray(rawRows[0])) {
    const headerRow = rawRows[0]
    const explicitHeaders = Array.isArray(table.columns) ? table.columns : table.headers
    if (explicitHeaders?.length) {
      columns = explicitHeaders.map((header, index) => ({
        key: columnKeyFromDefinition(header, index),
        label: columnLabel(header, index),
        align: isNumericColumnLabel(columnLabel(header, index)) ? 'end' : undefined
      }))
      if (rowLooksLikeHeader(headerRow, explicitHeaders)) {
        dataRows = rawRows.slice(1)
      }
    } else {
      const looksLikeHeader = headerRow.every(
        (cell) => typeof cell === 'string' && cell.length > 0 && cell.length < 80
      )
      if (looksLikeHeader && rawRows.length > 1) {
        columns = headerRow.map((header, index) => ({
          key: toColumnKey(header, index),
          label: String(header),
          align: isNumericColumnLabel(header) ? 'end' : undefined
        }))
        dataRows = rawRows.slice(1)
      } else {
        columns = headerRow.map((_, index) => ({
          key: `col_${index}`,
          label: `Col ${index + 1}`
        }))
      }
    }
  }

  if (!columns.length) return null

  const rows = dataRows.map((row) => {
    if (Array.isArray(row)) {
      return Object.fromEntries(columns.map((col, index) => [col.key, row[index] ?? null]))
    }
    if (row && typeof row === 'object') {
      return Object.fromEntries(
        columns.map((col, index) => {
          const label = col.label
          const value =
            row[col.key] ??
            row[label] ??
            row[Object.keys(row)[index]] ??
            null
          return [col.key, value]
        })
      )
    }
    return Object.fromEntries(columns.map((col) => [col.key, null]))
  })

  return { title, columns, rows }
}

/** Normalize API `tables` arrays into UI-ready table definitions. */
export const normalizeOcrExtractTables = (tables = []) => {
  if (!Array.isArray(tables)) return []
  return tables.map(normalizeOneExtractTable).filter(Boolean)
}

/** Build a dynamic table from structured `lineItems` when no `tables` are present. */
export const normalizeLineItemsToExtractTables = (lineItems = [], title = 'Line Items') => {
  const items = (lineItems || []).filter((item) => item && typeof item === 'object')
  if (!items.length) return []

  const allKeys = [
    ...new Set(items.flatMap((item) => Object.keys(item).filter((key) => !key.startsWith('_'))))
  ]
  const orderedKeys = [
    ...PREFERRED_LINE_ITEM_KEYS.filter((key) => allKeys.includes(key)),
    ...allKeys.filter((key) => !PREFERRED_LINE_ITEM_KEYS.includes(key))
  ].filter((key) => items.some((item) => item[key] != null && item[key] !== ''))

  if (!orderedKeys.length) return []

  const columns = orderedKeys.map((key) => ({
    key,
    label: formatLineItemKeyLabel(key),
    align: NUMERIC_COLUMN_KEYS.has(key) ? 'end' : undefined
  }))

  return [
    {
      title,
      columns,
      rows: items.map((item) =>
        Object.fromEntries(columns.map((col) => [col.key, item[col.key] ?? null]))
      )
    }
  ]
}

const getOcrForDocType = (inv, docType) => {
  const byType = inv?.ocr_by_type?.[docType]
  if (byType) return byType
  if ((inv?.document_type || inv?.ocr?.documentType) === docType) return inv?.ocr
  return null
}

const resolveLineItemsForSection = (ocr, docType, lineItems = []) => {
  if (lineItems.length) return lineItems
  if (ocr?.lineItems?.length) return ocr.lineItems
  if (docType === 'attendance' && ocr?.attendanceEntries?.length) return ocr.attendanceEntries
  if (docType === 'po_appendix' && ocr?.appendixItems?.length) return ocr.appendixItems
  return []
}

/** Resolve dynamic tables for an extract tab from `tables` or `lineItems` (and entry fallbacks). */
export const resolveSectionExtractTables = (inv, sectionKey, options = {}) => {
  const docType = SECTION_DOC_TYPES[sectionKey]
  if (!docType) return []

  const ocr = getOcrForDocType(inv, docType)
  const precomputed = inv?.extract_tables_by_type?.[docType]
  if (precomputed?.length) return precomputed

  const fromTables = normalizeOcrExtractTables(ocr?.tables)
  if (fromTables.length) return fromTables

  const lineItems = resolveLineItemsForSection(ocr, docType, options.lineItems || [])
  return normalizeLineItemsToExtractTables(lineItems, options.title || 'Line Items')
}

export const formatDynamicExtractCell = (value, col, currency = 'IDR') => {
  if (value == null || value === '') return '—'
  if (col?.align === 'end' || NUMERIC_COLUMN_KEYS.has(col?.key)) {
    const parsed = parseAmount(value)
    if (parsed != null && /manhour|hour|mhr/i.test(col?.label || col?.key || '')) {
      return parsed.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
    if (parsed != null && /amount|price|total|idr|rp/i.test(col?.label || col?.key || '')) {
      return fmtMoney(parsed, currency)
    }
  }
  if (Array.isArray(value)) return value.map(formatOcrDisplayValue).filter(Boolean).join(', ')
  const display = formatOcrDisplayValue(value)
  return display ?? '—'
}

export const attachSectionExtractTables = (section, inv) => {
  if (section.key === 'F_timesheet' && section.manpowerSheets?.length) {
    return section
  }

  const docType = SECTION_DOC_TYPES[section.key]
  const ocr = docType ? getOcrForDocType(inv, docType) : null
  let extractTables = resolveSectionExtractTables(inv, section.key, {
    lineItems: section.lineItems,
    title: section.label
  })

  if (section.key === 'D_beritaAcara') {
    const progressTable = buildBeritaAcaraProgressExtractTable(ocr || {})
    if (progressTable) {
      const hasProgressTable = extractTables.some((table) => table.title === progressTable.title)
      if (!hasProgressTable) {
        extractTables = [progressTable, ...extractTables]
      }
    }

    const hasManpowerTable = extractTables.some((table) =>
      /manpower|line items/i.test(String(table.title || ''))
    )
    if (!hasManpowerTable && section.lineItems?.length) {
      extractTables = [
        ...extractTables,
        ...normalizeLineItemsToExtractTables(section.lineItems, 'Manpower')
      ]
    }
  }

  if (!extractTables.length) return section

  return {
    ...section,
    extractTables,
    lineItems: [],
    lineColumns: []
  }
}
