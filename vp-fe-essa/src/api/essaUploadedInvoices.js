/**
 * Persist non-PO invoices uploaded via the Upload page so they appear in
 * Invoices / Timeline / Approvals like seeded demo rows. Stored in localStorage
 * for easy delete-and-retest cycles.
 */

import { buildNonPoDetailFromRow, buildNonPoTimeline } from './essaNonPoSeed'
import { resolvePoApprovals, getNextPendingRole } from '../components/Essa/lib/poApprovalChain'
import { DEMO_INVOICES_CHANGED } from './demoInvoiceEvents'

const STORAGE_KEY = 'essa_demo_uploaded_non_po'
const SEED_OVERRIDE_KEY = 'essa_demo_npo_overrides'

export { DEMO_INVOICES_CHANGED }

export function isDemoUploadId(id) {
  const value = String(id || '')
  return value.startsWith('upload-npo-') || value.startsWith('upload-ocr-')
}

export function isDemoSeedId(id) {
  const value = String(id || '')
  return value.startsWith('demo-npo-') || value.startsWith('demo-po-')
}

export function isDemoInvoiceId(id) {
  return isDemoUploadId(id) || isDemoSeedId(id)
}

function loadSeedOverrides() {
  try {
    const raw = sessionStorage.getItem(SEED_OVERRIDE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveSeedOverrides(store) {
  sessionStorage.setItem(SEED_OVERRIDE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent(DEMO_INVOICES_CHANGED))
}

function deriveStatusAfterApproval(inv, chain, level, decision) {
  if (decision === 'rejected') {
    return { status: 'rejected', next_pending_role: null, overall: 'review' }
  }

  const nextRole = getNextPendingRole(chain)
  const approvedLevels = chain.filter((s) => s.status === 'approved').map((s) => s.level)
  const isNonPo = inv?.invoice_workflow === 'NON_PO' || !inv?.po_number

  if (isNonPo) {
    const totalLevels = chain.length
    if (approvedLevels.length >= totalLevels) {
      return { status: 'posted', next_pending_role: null }
    }
    if (level === 1 && decision !== 'rejected') {
      return { status: 'parked', next_pending_role: nextRole }
    }
    return { status: 'parked', next_pending_role: nextRole }
  }

  if (approvedLevels.length >= 4) {
    return { status: 'posted', next_pending_role: null }
  }
  return { status: 'pending_approval', next_pending_role: nextRole }
}

function withResolvedApprovals(invoice) {
  if (!invoice) return invoice
  const approvals = resolvePoApprovals(invoice)
  return {
    ...invoice,
    approvals,
    next_pending_role: getNextPendingRole(approvals)
  }
}

export function mergeDemoOverrides(id, invoice) {
  if (!invoice) return invoice
  if (isDemoUploadId(id)) return getUploadedInvoice(id) || withResolvedApprovals(invoice)
  if (isDemoSeedId(id)) {
    const override = loadSeedOverrides()[id]
    return withResolvedApprovals(override ? { ...invoice, ...override } : invoice)
  }
  return invoice
}

export function getSeedListPatch(id) {
  const override = loadSeedOverrides()[id]
  if (!override) return {}
  return {
    status: override.status,
    next_pending_role: override.next_pending_role,
    overall: override.overall
  }
}

export function updateUploadedInvoice(id, patch) {
  const store = loadStore()
  const entry = store[id]
  if (!entry) return false

  const listRow = {
    ...entry.listRow,
    status: patch.status ?? entry.listRow.status,
    next_pending_role:
      patch.next_pending_role !== undefined
        ? patch.next_pending_role
        : entry.listRow.next_pending_role,
    overall: patch.overall ?? entry.listRow.overall
  }

  const detail = {
    ...entry.detail,
    ...patch,
    id,
    status: listRow.status,
    next_pending_role: listRow.next_pending_role,
    overall: listRow.overall
  }

  store[id] = { listRow, detail }
  saveStore(store)
  return true
}

export function applyDemoInvoiceApproval(id, inv, chain, { level, decision }) {
  if (!isDemoInvoiceId(id) || !inv) return false

  const statusPatch = deriveStatusAfterApproval(inv, chain, level, decision)
  const row = { ...inv, ...statusPatch }
  const detailPatch = {
    ...statusPatch,
    approvals: chain,
    timeline: buildNonPoTimeline(row)
  }

  if (isDemoUploadId(id)) {
    return updateUploadedInvoice(id, detailPatch)
  }

  const overrides = loadSeedOverrides()
  overrides[id] = { ...(overrides[id] || {}), ...detailPatch }
  saveSeedOverrides(overrides)
  return true
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent(DEMO_INVOICES_CHANGED))
}

function normalizeUploadId(rawId) {
  if (isDemoUploadId(rawId)) return rawId
  const suffix = rawId
    ? String(rawId).replace(/^ocr-batch-/, '').replace(/^ocr-/, '')
    : Date.now().toString(36)
  return `upload-ocr-${suffix}`
}

function pickInvoiceFields(ocrDetail) {
  const extracted = ocrDetail?.extracted || {}
  return {
    invoice_no: ocrDetail.invoice_no || extracted.invoice_no || '—',
    vendor_name: ocrDetail.vendor_name || extracted.vendor_name || '—',
    total_amount: ocrDetail.total_amount ?? extracted.total_amount ?? 0,
    currency: ocrDetail.currency || extracted.currency || 'IDR',
    invoice_date: ocrDetail.invoice_date || extracted.invoice_date
  }
}

function resolveUploadedWorkflow(detail) {
  if (detail?.invoice_workflow === 'PO') return 'PO'
  if (detail?.invoice_workflow === 'NON_PO') return 'NON_PO'
  if (detail?.po_number) return 'PO'
  return 'NON_PO'
}

function buildUploadedDetail(listRow, ocrDetail, meta = {}) {
  const merged = {
    ...ocrDetail,
    ...listRow,
    id: listRow.id,
    file_name: meta.fileName || ocrDetail.file_name || ocrDetail.fileName || null,
    source: 'essa',
    is_demo_upload: true
  }

  if (listRow.invoice_workflow === 'NON_PO') {
    return buildNonPoDetailFromRow(listRow, {
      ...merged,
      subtotal: ocrDetail.subtotal ?? listRow.total_amount
    })
  }

  return {
    ...merged,
    approvals: ocrDetail.approvals || resolvePoApprovals(merged),
    next_pending_role:
      ocrDetail.next_pending_role ?? getNextPendingRole(resolvePoApprovals(merged))
  }
}

function buildUploadedListRow(id, detail, fields) {
  const workflow = resolveUploadedWorkflow(detail)
  const isPo = workflow === 'PO'
  const overall =
    detail.overall ||
    detail.validation?.overall ||
    (detail.validation?.overallStatus === 'PASS' ? 'pass' : 'review')

  return {
    id,
    ...fields,
    invoice_type: isPo ? 'Manpower' : 'Non-PO',
    invoice_workflow: workflow,
    po_number: isPo ? detail.po_number || null : null,
    status: detail.status || 'extracted',
    overall,
    uploaded_at: detail.uploaded_at || new Date().toISOString(),
    uploaded_by: 'u-ap-team',
    uploaded_by_name: 'Putri Maharani',
    is_demo_upload: true,
    next_pending_role:
      detail.next_pending_role ??
      (overall === 'pass' || overall === 'approved' ? null : 'ap_team'),
    failed_checks: detail.failed_checks ?? detail.validation?.summary?.failed ?? 0
  }
}

/** Persist any OCR upload so it appears in Invoices / Dashboard immediately. */
export function persistUploadedInvoice(ocrDetail, meta = {}) {
  const id = normalizeUploadId(ocrDetail?.id)
  const fields = pickInvoiceFields(ocrDetail)
  const listRow = buildUploadedListRow(id, ocrDetail, fields)
  const detail = buildUploadedDetail(listRow, ocrDetail, meta)

  listRow.next_pending_role = detail.next_pending_role ?? listRow.next_pending_role

  const store = loadStore()
  store[id] = { listRow, detail }
  saveStore(store)

  return { id, listRow, detail }
}

export function persistUploadedNonPoInvoice(ocrDetail, meta = {}) {
  const prepared = {
    ...ocrDetail,
    invoice_workflow: 'NON_PO',
    po_number: null,
    overall: ocrDetail.overall || 'approved'
  }
  return persistUploadedInvoice(prepared, meta)
}

export function getUploadedInvoice(id) {
  const entry = loadStore()[id]
  if (!entry?.detail) return null

  const detail = withResolvedApprovals(entry.detail)
  const listRow = {
    ...entry.listRow,
    next_pending_role: detail.next_pending_role,
    status: detail.status ?? entry.listRow.status
  }

  if (
    detail.approvals !== entry.detail.approvals ||
    listRow.next_pending_role !== entry.listRow.next_pending_role
  ) {
    const store = loadStore()
    store[id] = { listRow, detail }
    saveStore(store)
  }

  return detail
}

export function getUploadedInvoiceByInvoiceNo(invoiceNo) {
  const needle = String(invoiceNo || '').trim()
  if (!needle) return null

  for (const entry of Object.values(loadStore())) {
    const no = entry?.detail?.invoice_no || entry?.listRow?.invoice_no
    if (no === needle) {
      return getUploadedInvoice(entry.detail?.id || entry.listRow?.id)
    }
  }

  return null
}

export function getUploadedListRows() {
  return Object.values(loadStore()).map((entry) => entry.listRow)
}

export function filterUploadedList(params = {}) {
  let rows = getUploadedListRows()

  if (params.overall) rows = rows.filter((r) => r.overall === params.overall)
  if (params.status) rows = rows.filter((r) => r.status === params.status)
  if (params.mine === '1' || params.mine === 'true') {
    rows = rows.filter((r) => r.uploaded_by === 'u-ap-team')
  }
  if (params.pending_my_action === '1' || params.pending_my_action === 'true') {
    rows = rows.filter((r) => r.next_pending_role === 'ap_team')
  }
  if (params.q) {
    const needle = String(params.q).toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.invoice_no || '').toLowerCase().includes(needle) ||
        (r.vendor_name || '').toLowerCase().includes(needle)
    )
  }

  return rows
}

export function deleteUploadedInvoice(id) {
  if (!isDemoUploadId(id)) return false
  const store = loadStore()
  if (!store[id]) return false
  delete store[id]
  saveStore(store)
  return true
}
