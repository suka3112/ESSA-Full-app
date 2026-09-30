import dayjs from 'dayjs'
import axiosInstance from '../services/axiosSetup'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {
  fetchPersistedUploadDetail,
  fetchPersistedUploadListRows,
  isPersistedOcrUploadId,
  parseAmount
} from './apInvoiceOcr'
import { approveEssaInvoiceBackend } from './essaAudit'
import { resolveInvoiceTypeLabel } from './essaInvoiceType'
import {
  ESSA_NON_PO_LIST_SEED,
  buildNonPoDetailFromRow,
  filterNonPoSeedList,
  getNonPoSeedInvoice,
  getNonPoSeedInvoiceByInvoiceNo
} from './essaNonPoSeed'
import {
  ESSA_PO_LIST_SEED,
  buildPoDetailFromRow,
  filterPoSeedList,
  getPoSeedInvoice,
  getPoSeedInvoiceByInvoiceNo
} from './essaPoSeed'
import {
  filterUploadedList,
  getUploadedInvoice,
  getUploadedInvoiceByInvoiceNo,
  getSeedListPatch,
  mergeDemoOverrides
} from './essaUploadedInvoices'
import { getWorkflowStageKey } from '../components/Essa/lib/invoiceWorkflowStatus'
import { ensureInvoiceTimeline } from '../components/Essa/lib/timelineEvents'

dayjs.extend(customParseFormat)

const INVOICE_DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DD HH:mm:ss',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'DD-MM-YYYY',
  'DD.MM.YYYY',
  'D MMM YYYY',
  'DD MMM YYYY',
  'MMM D, YYYY'
]

/** Parse portal / OCR date strings (incl. DD/MM/YYYY) without yielding Invalid Date. */
export function parseFlexibleDate(input) {
  if (input == null || input === '') return null
  if (dayjs.isDayjs(input)) return input.isValid() ? input : null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : dayjs(input)

  const s = String(input).trim()
  if (!s || s === '—' || s.toLowerCase() === 'invalid date') return null

  let parsed = dayjs(s)
  if (parsed.isValid()) return parsed

  for (const fmt of INVOICE_DATE_FORMATS) {
    parsed = dayjs(s, fmt, true)
    if (parsed.isValid()) return parsed
  }

  return null
}

export function formatInvoiceDate(input, { withTime = false } = {}) {
  const d = parseFlexibleDate(input)
  if (!d) return null
  const date = d.toDate()
  return withTime
    ? date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : date.toLocaleDateString('en-GB', { dateStyle: 'medium' })
}

/** PO delivery date — supports single dates and ranges like `01 Jun 2025 - 31 May 2026`. */
export function formatPoDeliveryDateDisplay(input) {
  const text = String(input ?? '').trim()
  if (!text) return null

  const rangeMatch = text.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (rangeMatch) {
    const start = formatInvoiceDate(rangeMatch[1].trim(), { withTime: false }) || rangeMatch[1].trim()
    const end = formatInvoiceDate(rangeMatch[2].trim(), { withTime: false }) || rangeMatch[2].trim()
    return `${start} – ${end}`
  }

  return formatInvoiceDate(text, { withTime: false }) || text
}

/**
 * ESSA portal APIs live on vp-be-essa (`/vendor-portal/essa/*`).
 * Demo seeds + browser uploads are used locally until REACT_APP_ESSA_USE_BACKEND=true.
 */
const ESSA_API = '/essa'

export const essaBackendEnabled = () => process.env.REACT_APP_ESSA_USE_BACKEND === 'true'

export const INVOICE_TYPES = [
  'Manpower',
  'Civil Contractor',
  'Non-PO',
  'Material Import',
  'Camp Service and Catering'
]

/** Display label when an invoice has no PO reference. */
export const NON_PO_LABEL = 'Non-PO'

/** Display label for dashboard / list tables. */
export function resolveInvoiceType(row = {}) {
  return resolveInvoiceTypeLabel(row)
}

/** Display label for invoice category badges (e.g. "Manpower Invoice"). */
export function formatInvoiceCategoryLabel(row = {}) {
  return `${resolveInvoiceType(row)} Invoice`
}

export const EMPTY_DASHBOARD_DATA = {
  counts: {
    total: 0,
    drafted: 0,
    parked: 0,
    posted: 0,
    approved: 0,
    auto_approved: 0,
    review: 0,
    rejected: 0,
    pending: 0
  },
  byVendor: [],
  recent: [],
  bottlenecks: []
}

export const DUMMY_DASHBOARD_DATA = {
  counts: {
    total: 11,
    validated: 7,
    drafted: 7,
    parked: 3,
    posted: 0,
    paid: 1,
    approved: 10,
    auto_approved: 10,
    review: 0,
    rejected: 0,
    pending: 0
  },
  byVendor: [
    { vendor_name: 'PT AMANAH LESTARI ENERGY', vendor_code: 'V-ALE-001', n: 2, amount: 89_337_000 },
    { vendor_name: 'PT BUMI ENERGI FORTUNA', vendor_code: 'V-BEF-002', n: 2, amount: 24_960_000 },
    { vendor_name: 'PT SINAR MAKMUR JAYA', vendor_code: 'V-SMJ-003', n: 1, amount: 18_450_000 },
    { vendor_name: 'PT GARUDA LOGISTIK', vendor_code: 'V-GL-004', n: 2, amount: 12_800_000 },
    { vendor_name: 'PT NUSANTARA TEKNIK', vendor_code: 'V-NTK-005', n: 1, amount: 6_200_000 }
  ],
  /** Filled at runtime from openable local non-PO rows — see buildLocalDashboardData(). */
  recent: [],
  bottlenecks: [
    { role: 'hos', approver_name: 'Budi Hartono', waiting: 3 },
    { role: 'hod', approver_name: 'Made Wirawan', waiting: 5 },
    { role: 'hof', approver_name: 'Anastasia Putri', waiting: 1 },
    { role: 'sth', approver_name: 'Robinson Selvaraj', waiting: 1 }
  ]
}

const MY_WORK_TILE_DEFS = [
  { key: 'total', label: 'Total invoices (last 30 days)', tone: 'info', filter: '' },
  { key: 'validated', label: 'Validated', tone: 'warn', filter: 'filter=validated' },
  { key: 'parked', label: 'Parked', tone: 'info', filter: 'filter=parked' },
  { key: 'posted', label: 'Posted', tone: 'success', filter: 'filter=posted' },
  { key: 'paid', label: 'Paid', tone: 'success', filter: 'filter=paid' }
]

const DOA_APPROVER_NAMES = {
  hos: 'Budi Hartono',
  hod: 'Made Wirawan',
  hof: 'Anastasia Putri',
  sth: 'Robinson Selvaraj',
  gfd: 'Anas Reksoatmodjo'
}

export function computeWorkflowCounts(invoices = []) {
  const counts = {
    total: invoices.length,
    validated: 0,
    parked: 0,
    posted: 0,
    paid: 0,
    rejected: 0,
    review: 0,
    drafted: 0,
    pending: 0,
    approved: 0,
    auto_approved: 0
  }

  for (const inv of invoices) {
    const stage = getWorkflowStageKey(inv)
    if (stage === 'validated') counts.validated += 1
    else if (stage === 'parked') counts.parked += 1
    else if (stage === 'posted') counts.posted += 1
    else if (stage === 'paid') counts.paid += 1
    else if (stage === 'rejected') counts.rejected += 1
    else if (stage === 'draft') {
      counts.drafted += 1
    }
    else if (stage === 'review') {
      counts.review += 1
      counts.pending += 1
    }
  }

  return counts
}

function buildMyWorkTiles(counts = {}) {
  return MY_WORK_TILE_DEFS.map((def) => ({
    ...def,
    value: def.key === 'total' ? counts.total || 0 : counts[def.key] || 0
  }))
}

function computeByVendor(invoices = []) {
  const map = new Map()

  for (const inv of invoices) {
    const code = inv.vendor_code || inv.vendor_name || 'unknown'
    const name = inv.vendor_name || code
    const cur = map.get(code) || { vendor_name: name, vendor_code: code, n: 0, amount: 0 }
    cur.n += 1
    cur.amount += Number(inv.total_amount) || 0
    map.set(code, cur)
  }

  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

function isNonPoListRow(inv = {}) {
  return inv.invoice_workflow === 'NON_PO' || inv.invoice_type === 'Non-PO' || !inv.po_number
}

function computeBottlenecks(invoices = []) {
  const waiting = new Map()

  for (const inv of invoices) {
    if (!isNonPoListRow(inv) || !inv.next_pending_role) continue
    const role = String(inv.next_pending_role).toLowerCase()
    waiting.set(role, (waiting.get(role) || 0) + 1)
  }

  return ['hos', 'hod', 'hof', 'sth', 'gfd']
    .filter((role) => waiting.has(role))
    .map((role) => ({
      role,
      approver_name: DOA_APPROVER_NAMES[role] || role.toUpperCase(),
      waiting: waiting.get(role)
    }))
}

export const DUMMY_MY_WORK = {
  role: 'ap_team',
  tiles: buildMyWorkTiles(DUMMY_DASHBOARD_DATA.counts)
}

export const DUMMY_ACTION_ITEMS = [
  {
    id: 'demo-npo-hotel',
    invoice_no: 'INV/TD/000602/2026',
    invoice_type: 'Non-PO',
    vendor_name: 'PT Nusantara Express Hotel',
    po_number: null,
    invoice_date: '2026-06-05',
    total_amount: 1_850_000,
    currency: 'IDR',
    overall: 'review',
    status: 'extracted'
  },
  {
    id: 'demo-npo-doa-5m',
    invoice_no: 'INV/TD/DOA/003141/2026',
    invoice_type: 'Non-PO',
    vendor_name: 'PT Wisata Kawan Abadi',
    po_number: null,
    invoice_date: '2026-06-08',
    total_amount: 3_144_210,
    currency: 'IDR',
    overall: 'review',
    status: 'extracted'
  },
  {
    id: 'demo-npo-doa-15m',
    invoice_no: 'INV/TD/DOA/008500/2026',
    invoice_type: 'Non-PO',
    vendor_name: 'PT NUSANTARA TEKNIK',
    po_number: null,
    invoice_date: '2026-06-04',
    total_amount: 8_500_000,
    currency: 'IDR',
    overall: 'review',
    status: 'extracted'
  },
  {
    id: 'demo-npo-doa-50m',
    invoice_no: 'INV/TD/DOA/028000/2026',
    invoice_type: 'Non-PO',
    vendor_name: 'PT Garuda Aviation Charter',
    po_number: null,
    invoice_date: '2026-05-28',
    total_amount: 28_000_000,
    currency: 'IDR',
    overall: 'review',
    status: 'extracted'
  }
]

export function mergeActionItemRows(apiRows = []) {
  const byKey = new Map()
  for (const row of apiRows || []) {
    const key = row.id || row.invoice_no
    if (key) byKey.set(key, row)
  }
  for (const item of DUMMY_ACTION_ITEMS) {
    const key = item.id || item.invoice_no
    if (key && !byKey.has(key)) {
      byKey.set(key, { ...item, overall: 'review' })
    }
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
    const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
    return bTime - aTime
  })
}

export const fmtMoney = (n, cur = 'IDR') => {
  if (n == null || n === '') return '—'

  let num = Number(n)
  if (!Number.isFinite(num)) {
    num = parseAmount(n)
  }
  if (num == null || !Number.isFinite(num)) return String(n)

  const hasCurrency = Boolean(cur)
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: hasCurrency && Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2
  })

  return hasCurrency ? `${formatted} ${cur}` : formatted
}

/** IDR with comma thousands — prefix form used in validation messages. */
export const formatIdrPrefix = (n) => {
  if (n == null || n === '') return '—'

  let num = Number(n)
  if (!Number.isFinite(num)) {
    num = parseAmount(n)
  }
  if (num == null || !Number.isFinite(num)) return String(n)

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2
  })

  return `IDR ${formatted}`
}

/** Manhour quantities — period decimal separator (e.g. 758.50, not 758,50). */
export const formatManhourDisplay = (value) => {
  if (value == null || value === '') return null

  let num = typeof value === 'number' ? value : parseAmount(value)
  if (num == null || !Number.isFinite(num)) {
    const raw = String(value).trim()
    if (/^\d+,\d+$/.test(raw)) return raw.replace(',', '.')
    return raw || null
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** Comma thousands, no currency — used in validation checklist amount rows. */
export const formatIdrDisplay = (n) => {
  if (n == null || n === '') return null

  let num = Number(n)
  if (!Number.isFinite(num)) {
    num = parseAmount(n)
  }
  if (num == null || !Number.isFinite(num)) return null

  return Math.round(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

/** Normalize "6.053.245 vs 6.053.245" → "6,053,245 vs 6,053,245". */
export const formatVatComparisonDisplay = (value) => {
  if (value == null || value === '' || value === 'Missing') return value

  const parts = String(value).split(/\s+vs\s+/i)
  if (parts.length !== 2) return value

  const left = formatIdrDisplay(parts[0].trim()) ?? parts[0].trim()
  const right = formatIdrDisplay(parts[1].trim()) ?? parts[1].trim()
  return `${left} vs ${right}`
}

/** Plain-language Reference text for SES vs invoice rule (incl. legacy persisted checks). */
export const formatSesDeviationReference = (expected, details = []) => {
  const rows = Array.isArray(details) ? details : []
  const exVatDetail = rows.find((d) =>
    /total amount excluding vat/i.test(d?.label || '')
  )
  const toleranceDetail = rows.find((d) =>
    /maximum ses amount|ses 2% tolerance/i.test(d?.label || '')
  )
  const legacyInvoiceDetail = rows.find((d) =>
    /invoice subtotal|invoice grand total/i.test(d?.label || '')
  )
  const legacyMaxDetail = rows.find((d) => /maximum ses/i.test(d?.label || ''))

  const invoiceValue = exVatDetail?.value || legacyInvoiceDetail?.value
  const maxValue = toleranceDetail?.value || legacyMaxDetail?.value

  if (invoiceValue && maxValue) {
    return `SES total must match ${invoiceValue} (0% tolerance).`
  }

  const legacy = String(expected || '')
  const legacyMatch = legacy.match(
    /≤\s*IDR\s*([\d,]+)\s*[·•]\s*≥\s*IDR\s*([\d,]+)/i
  )
  if (legacyMatch) {
    const minIdr = legacyMatch[2]
    return `SES total must match IDR ${minIdr} (0% tolerance).`
  }

  if (expected && !legacy.includes('≤')) return expected

  return 'SES total must exactly match the invoice amount (0% tolerance).'
}

/** Format the VAT amount segment in checklist Reference / Captured strings. */
export const formatChecklistVatField = (value) => {
  if (value == null || !String(value).includes('VAT')) return value

  return String(value).replace(/VAT\s+(.+)$/i, (_, amountPart) => {
    const formatted = formatIdrDisplay(amountPart.trim())
    return formatted ? `VAT ${formatted}` : `VAT ${amountPart.trim()}`
  })
}

export const fmtDate = (s) => {
  if (!s) return '—'
  return formatInvoiceDate(s, { withTime: true }) ?? '—'
}

export const fmtDateOnly = (s) => {
  if (!s) return '—'
  return formatInvoiceDate(s, { withTime: false }) ?? '—'
}

export const getEssaInvoiceExportUrl = (id) => {
  if (!essaBackendEnabled()) return null
  const base = (process.env.REACT_APP_DEFAULT_API_BASE_URL || '').replace(/\/$/, '')
  return `${base}${ESSA_API}/invoices/${encodeURIComponent(id)}/export`
}

export const getEssaInvoiceFileUrl = (id) => {
  if (!essaBackendEnabled()) return null
  const base = (process.env.REACT_APP_DEFAULT_API_BASE_URL || '').replace(/\/$/, '')
  return `${base}${ESSA_API}/invoices/${encodeURIComponent(id)}/file`
}

const defaultEssaUserId = () => {
  const stored = localStorage.getItem('essa_user_id')
  if (stored) return stored
  const role = localStorage.getItem('essa_role')
  if (role === 'ap_team') return 'u-ap-team'
  if (role === 'ap_supervisor') return 'u-ap-supervisor'
  if (role === 'ap_lead') return 'u-ap-lead'
  if (role === 'finance_manager') return 'u-finance-mgr'
  if (role === 'hos') return 'E005'
  if (role === 'hod') return 'E006'
  if (role === 'hof') return 'E007'
  if (role === 'sth') return 'E008'
  if (role === 'gfd') return 'E009'
  return 'u-ap-team'
}

const essaHeaders = () => ({
  'x-user-id': defaultEssaUserId()
})

/** Ensure list rows expose invoice_date for dashboard / invoice tables. */
export function normalizeInvoiceListRow(row = {}) {
  if (!row || typeof row !== 'object') return row
  const invoice_date = row.invoice_date || row.invoiceDate || row.date || null
  return invoice_date ? { ...row, invoice_date } : row
}

const mergeWithLocalSeeds = async (apiRows = [], params = {}) => {
  const apiIds = new Set((apiRows || []).map((r) => r.id))
  const nonPoSeedExtras = filterNonPoSeedList(params)
    .map((r) => ({ ...r, ...getSeedListPatch(r.id) }))
    .filter((r) => !apiIds.has(r.id))
  const poSeedExtras = filterPoSeedList(params)
    .map((r) => ({ ...r, ...getSeedListPatch(r.id) }))
    .filter((r) => !apiIds.has(r.id))
  const uploadedExtras = filterUploadedList(params).filter((r) => !apiIds.has(r.id))
  const persistedUploads = (await fetchPersistedUploadListRows()).filter((r) => !apiIds.has(r.id))
  const persistedInvoiceNos = new Set(
    persistedUploads.map((r) => String(r.invoice_no || '').trim()).filter(Boolean)
  )
  const localUploads = uploadedExtras.filter((r) => {
    const invoiceNo = String(r.invoice_no || '').trim()
    return !invoiceNo || !persistedInvoiceNos.has(invoiceNo)
  })
  return [...apiRows, ...poSeedExtras, ...nonPoSeedExtras, ...localUploads, ...persistedUploads]
    .map(normalizeInvoiceListRow)
    .sort(
    (a, b) => {
      const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
      const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
      return bTime - aTime
    }
  )
}

/** PO + non-PO demo rows + browser uploads + persisted OCR uploads. */
const listLocalInvoices = async (params = {}) => mergeWithLocalSeeds([], params)

async function buildLocalDashboardData() {
  const recent = await listLocalInvoices()
  const counts = computeWorkflowCounts(recent)

  return {
    ...DUMMY_DASHBOARD_DATA,
    counts,
    recent,
    byVendor: computeByVendor(recent),
    bottlenecks: computeBottlenecks(recent)
  }
}

async function buildLocalMyWork() {
  const rows = await listLocalInvoices()
  return {
    role: 'ap_team',
    tiles: buildMyWorkTiles(computeWorkflowCounts(rows))
  }
}

function resolveLocalEssaInvoice(id) {
  const decodedId = decodeURIComponent(String(id || '')).trim()
  if (!decodedId) return null

  const uploaded = getUploadedInvoice(decodedId)
  if (uploaded) return uploaded

  const poSeed = mergeDemoOverrides(decodedId, getPoSeedInvoice(decodedId))
  if (poSeed) return poSeed

  const seed = mergeDemoOverrides(decodedId, getNonPoSeedInvoice(decodedId))
  if (seed) return seed

  const uploadedByNo = getUploadedInvoiceByInvoiceNo(decodedId)
  if (uploadedByNo) return uploadedByNo

  const poSeedByNo = getPoSeedInvoiceByInvoiceNo(decodedId)
  if (poSeedByNo) {
    return mergeDemoOverrides(poSeedByNo.id, poSeedByNo)
  }

  const seedByNo = getNonPoSeedInvoiceByInvoiceNo(decodedId)
  if (seedByNo) {
    return mergeDemoOverrides(seedByNo.id, seedByNo)
  }

  const poListRow = ESSA_PO_LIST_SEED.find((row) => row.id === decodedId)
  if (poListRow) {
    return mergeDemoOverrides(decodedId, buildPoDetailFromRow(poListRow))
  }

  const listRow = ESSA_NON_PO_LIST_SEED.find((row) => row.id === decodedId)
  if (listRow) {
    return mergeDemoOverrides(decodedId, buildNonPoDetailFromRow(listRow))
  }

  return null
}

async function resolvePersistedEssaInvoice(id) {
  if (!isPersistedOcrUploadId(id)) return null
  return fetchPersistedUploadDetail(id)
}

export const getEssaDashboardData = async () => {
  if (essaBackendEnabled()) {
    try {
      const response = await axiosInstance.get(`${ESSA_API}/dashboard`, {
        headers: essaHeaders()
      })
      return response.data
    } catch {
      // fall through to local demo
    }
  }
  return buildLocalDashboardData()
}

export const getEssaMyWork = async () => {
  if (essaBackendEnabled()) {
    try {
      const response = await axiosInstance.get(`${ESSA_API}/invoices/me/my-work`, {
        headers: essaHeaders()
      })
      return response.data
    } catch {
      // fall through to local demo
    }
  }
  return buildLocalMyWork()
}

function unwrapInvoiceList(body) {
  const inner = body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body
  if (Array.isArray(inner)) return { data: inner, total: inner.length, counts: null }
  if (inner && Array.isArray(inner.data)) {
    return {
      data: inner.data,
      total: inner.total ?? inner.data.length,
      page: inner.page,
      pageSize: inner.pageSize,
      counts: inner.counts || null
    }
  }
  return { data: [], total: 0, counts: null }
}

const INVOICE_LIST_FETCH_SIZE = 100

async function fetchEssaInvoicePage(params) {
  const response = await axiosInstance.get(`${ESSA_API}/invoices`, {
    params,
    headers: essaHeaders()
  })
  const payload = unwrapInvoiceList(response.data)
  const rows = (payload.data || []).map(normalizeInvoiceListRow)
  return {
    data: rows,
    total: payload.total ?? rows.length,
    page: payload.page ?? params.page ?? 1,
    pageSize: payload.pageSize ?? params.pageSize,
    counts: payload.counts || null
  }
}

async function fetchAllEssaInvoicePages(params) {
  const { page: _page, pageSize: _pageSize, ...filters } = params
  const first = await fetchEssaInvoicePage(filters)
  const reportedTotal = first.total ?? first.data.length
  if (first.data.length >= reportedTotal) {
    return { ...first, total: reportedTotal, page: 1, pageSize: first.data.length }
  }

  const pages = []
  let loaded = 0
  let page = 1
  let counts = first.counts
  while (loaded < reportedTotal) {
    const next = await fetchEssaInvoicePage({
      ...filters,
      page,
      pageSize: INVOICE_LIST_FETCH_SIZE
    })
    counts = next.counts || counts
    if (!next.data.length) break
    pages.push(next.data)
    loaded += next.data.length
    if (next.data.length < INVOICE_LIST_FETCH_SIZE) break
    page += 1
  }

  const data = pages.flat()
  return {
    data,
    total: reportedTotal,
    page: 1,
    pageSize: data.length,
    counts
  }
}

export const getEssaInvoices = async (params = {}) => {
  if (essaBackendEnabled()) {
    try {
      const paged = params.page != null && params.pageSize != null
      return paged ? await fetchEssaInvoicePage(params) : await fetchAllEssaInvoicePages(params)
    } catch {
      // fall through to local demo
    }
  }
  const rows = await listLocalInvoices(params)
  return { data: rows, total: rows.length, page: 1, pageSize: rows.length, counts: null }
}

export const getEssaPOs = async (params = {}) => {
  if (!essaBackendEnabled()) return []
  const response = await axiosInstance.get(`${ESSA_API}/pos`, {
    params,
    headers: essaHeaders()
  })
  return response.data
}

export const getEssaPOMatch = async (po, invId) => {
  if (!essaBackendEnabled()) {
    throw new Error('PO match is available for PO-based invoices from the vendor portal.')
  }
  const response = await axiosInstance.get(
    `${ESSA_API}/pos/${encodeURIComponent(po)}/match/${encodeURIComponent(invId)}`,
    { headers: essaHeaders() }
  )
  return response.data
}

export const getEssaInvoice = async (id) => {
  const decodedId = decodeURIComponent(String(id || '')).trim()
  const local = resolveLocalEssaInvoice(decodedId)
  if (local) return ensureInvoiceTimeline(local)

  const persisted = await resolvePersistedEssaInvoice(decodedId)
  if (persisted) return ensureInvoiceTimeline(persisted)

  if (essaBackendEnabled()) {
    try {
      const response = await axiosInstance.get(
        `${ESSA_API}/invoices/${encodeURIComponent(decodedId)}`,
        { headers: essaHeaders() }
      )
      const data = response.data
      if (data && (data.id || data.invoice_no || data.InvNo)) {
        return ensureInvoiceTimeline(data)
      }
    } catch {
      // no backend row
    }
  }

  return null
}

export { ESSA_NON_PO_LIST_SEED, ESSA_PO_LIST_SEED }

export const uploadEssaInvoice = async (formData) => {
  if (!essaBackendEnabled()) {
    throw new Error('Use Upload Invoice — files are sent to vp-be-essa OCR extraction.')
  }
  const response = await axiosInstance.post(`${ESSA_API}/invoices/upload`, formData, {
    headers: essaHeaders()
  })
  return response.data
}

export const uploadEssaInvoiceSample = async () => {
  throw new Error('Sample upload is not available — use Upload Invoice with a PDF from your machine.')
}

export const getEssaInvoiceSamples = async () => {
  if (!essaBackendEnabled()) return []
  try {
    const response = await axiosInstance.get(`${ESSA_API}/invoices/samples`, {
      headers: essaHeaders()
    })
    return response.data
  } catch {
    return []
  }
}

async function assertPdfBlob(blob) {
  if (!blob || blob.size < 5) {
    throw new Error('Invoice file is empty')
  }
  const header = await blob.slice(0, 5).text()
  if (!header.startsWith('%PDF')) {
    throw new Error('Invoice file is not a PDF')
  }
  return blob
}

export const getEssaInvoiceFile = async (id) => {
  if (!essaBackendEnabled()) {
    throw new Error('Invoice PDF is not stored on the server for demo invoices.')
  }
  const response = await axiosInstance.get(
    `${ESSA_API}/invoices/${encodeURIComponent(id)}/file`,
    {
      headers: essaHeaders(),
      responseType: 'blob',
      validateStatus: (status) => status === 200
    }
  )
  return assertPdfBlob(response.data)
}

export const patchEssaInvoice = async (id, body) => {
  if (!essaBackendEnabled()) {
    throw new Error('Invoice updates are handled in the demo UI for local invoices.')
  }
  const response = await axiosInstance.patch(`${ESSA_API}/invoices/${id}`, body, {
    headers: essaHeaders()
  })
  return response.data
}

export const approveEssaInvoice = async (id, body) => {
  if (isPersistedOcrUploadId(id)) {
    return approveEssaInvoiceBackend(id, {
      decision: body?.decision,
      note: body?.note,
      reason: body?.reason || body?.note,
      reasonRemarks: body?.reasonRemarks || body?.reason || body?.note,
      source: 'PORTAL'
    })
  }
  if (!essaBackendEnabled()) {
    throw new Error('Use the invoice detail Approval tab for demo invoices.')
  }
  const response = await axiosInstance.post(`${ESSA_API}/invoices/${id}/approve`, body, {
    headers: essaHeaders()
  })
  return response.data
}

export const revalidateEssaInvoice = async (id) => {
  if (!essaBackendEnabled()) {
    throw new Error('Revalidate is available on the invoice Extract & Validate tab.')
  }
  const response = await axiosInstance.post(`${ESSA_API}/invoices/${id}/revalidate`, {}, {
    headers: essaHeaders()
  })
  return response.data
}

export const escalateEssaInvoice = async (id, body) => {
  if (!essaBackendEnabled()) {
    throw new Error('Escalation is not configured for local demo invoices.')
  }
  const response = await axiosInstance.post(`${ESSA_API}/invoices/${id}/escalate`, body, {
    headers: essaHeaders()
  })
  return response.data
}
