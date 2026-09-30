import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Download,
  Trash2,
  X,
  ArrowRight
} from 'lucide-react'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Tabs } from '../ui/Tabs'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { Dialog } from '../ui/Dialog'
import { Textarea } from '../ui/Textarea'
import { PageHeader } from '../PageShell'
import { FilterBar, FilterField, FilterSearch, ListWorkbench, SortTh, TablePagination, WorkbenchTable } from '../ui/listPage'
import { useEssaInvoices } from 'hooks/useEssaInvoices'
import { usePoBasedInvoices } from 'hooks/usePoBasedInvoices'
import { useEssaMyWork } from 'hooks/useEssaMyWork'
import {
  fmtMoney,
  fmtDate,
  NON_PO_LABEL,
  INVOICE_TYPES,
  resolveInvoiceType,
  approveEssaInvoice,
  revalidateEssaInvoice,
  escalateEssaInvoice,
  getEssaInvoiceExportUrl,
  essaBackendEnabled
} from 'api/essaDashboard'
import { INVOICES, INVOICE_DETAIL, INVOICE_DASHBOARD } from 'constants/url'
import { deleteUploadedInvoice } from 'api/essaUploadedInvoices'
import { isEssaDemoDeleteEnabled } from 'config/essaDemoConfig'
import { showEssaSuccessToast } from '../lib/essaToast'
import { ACTIONS, bulkActionsFor } from '../lib/invoiceActions'
import { NextActionBadge } from '../ui/NextActionBadge'
import { WorkflowStageBadge } from '../ui/WorkflowStageBadge'
import { INVOICE_STATUS_PILLS, getWorkflowStageKey, resolveLegacyFilterStage, resolveNextAction, resolveWorkflowStage } from '../lib/invoiceWorkflowStatus'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, var(--dx-primary-600))'
const BRAND_SHADOW = '0 12px 30px -10px color-mix(in srgb, var(--brand-primary-color, var(--dx-primary-600)) 40%, transparent)'

const PO_TYPE_TABS = [
  { value: 'ALL', label: 'All Invoices' },
  { value: 'PO', label: 'PO Invoice' },
  { value: 'NON_PO', label: 'Non-PO Invoice' }
]

const USE_ESSA_BACKEND = essaBackendEnabled()

function rowDay(r) {
  const raw = r.invoice_date || r.uploaded_at || ''
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(String(raw))) return String(raw).slice(0, 10)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function filterRows(rows, params, role, searchQ, poType, extra = {}) {
  let result = [...rows]

  const stageFilter = resolveLegacyFilterStage(params)
  if (stageFilter) {
    result = result.filter((r) => getWorkflowStageKey(r) === stageFilter)
  } else if (params.overall) {
    result = result.filter((r) => r.overall === params.overall)
  } else if (params.status) {
    result = result.filter((r) => r.status === params.status)
  }
  if (params.vendor) {
    const v = params.vendor.toLowerCase()
    result = result.filter(
      (r) =>
        (r.vendor_code || '').toLowerCase() === v ||
        (r.vendor_name || '').toLowerCase().includes(v)
    )
  }
  if (params.source) result = result.filter((r) => r.source === params.source)
  if (params.po) result = result.filter((r) => r.po_number === params.po)

  if (params.pending_my_action === '1' || params.to_approve === '1') {
    const terminal = ['rejected', 'posted', 'paid', 'archived']
    result = result.filter(
      (r) =>
        !terminal.includes(r.status) &&
        (role === 'admin' || r.next_pending_role === role)
    )
  }

  if (searchQ.trim()) {
    const needle = searchQ.trim().toLowerCase()
    result = result.filter(
      (r) =>
        (r.invoice_no || '').toLowerCase().includes(needle) ||
        (r.vendor_name || '').toLowerCase().includes(needle) ||
        (r.po_number || '').toLowerCase().includes(needle)
    )
  }

  if (poType === 'PO') result = result.filter((r) => Boolean(r.po_number))
  if (poType === 'NON_PO') result = result.filter((r) => !r.po_number)

  if (extra.category) {
    result = result.filter((r) => resolveInvoiceType(r) === extra.category)
  }
  if (extra.attention === 'exc') {
    result = result.filter((r) => Number(r.failed_checks) > 0 || Number(r.openExceptions) > 0)
  }
  if (extra.attention === 'sla') {
    result = result.filter((r) => r.sla_breached || r.slaBreached)
  }
  if (extra.dateFrom) {
    result = result.filter((r) => {
      const day = rowDay(r)
      return day && day >= extra.dateFrom
    })
  }
  if (extra.dateTo) {
    result = result.filter((r) => {
      const day = rowDay(r)
      return day && day <= extra.dateTo
    })
  }

  return result
}

function NextActionCell({ inv, role }) {
  return <NextActionBadge inv={inv} role={role} />
}

function triggerExport(id) {
  const a = document.createElement('a')
  a.href = getEssaInvoiceExportUrl(id)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function execOne(key, row, reason) {
  if (row.source === 'po') return
  const id = row.rawId || row.id

  switch (key) {
    case 'approve':
      return approveEssaInvoice(id, { decision: 'approved', note: reason || 'Approved' })
    case 'reject':
      return approveEssaInvoice(id, { decision: 'rejected', note: reason || 'Rejected' })
    case 'review':
      return escalateEssaInvoice(id, {
        to_role: 'business_reviewer',
        reason: reason || 'Sent for review'
      })
    case 'revalidate':
      return revalidateEssaInvoice(id)
    case 'export':
      triggerExport(id)
      return
    default:
      return
  }
}

function EssaInvoices({ userInfo: { userType } }) {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const { data: myWork } = useEssaMyWork()
  const role = myWork?.role || 'admin'
  const pills = INVOICE_STATUS_PILLS

  const activeKey = sp.get('filter') || pills[0]?.key
  const activePill = pills.find((p) => p.key === activeKey) || pills[0]

  const params = useMemo(() => {
    const p = { ...(activePill?.params || {}) }
    for (const k of ['vendor', 'source', 'overall', 'status', 'q', 'search', 'mine', 'po', 'workflow_stage']) {
      const v = sp.get(k)
      if (v && !p[k]) p[k] = v
    }
    if (sp.get('search') && !p.q) {
      p.q = sp.get('search')
    }
    return p
  }, [activePill, sp])

  const [q, setQ] = useState(sp.get('search') || sp.get('q') || '')
  const [category, setCategory] = useState('')
  const [attention, setAttention] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const s = sp.get('search') || sp.get('q') || ''
    setQ(s)
  }, [sp])
  const [selected, setSelected] = useState(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const poType = ['PO', 'NON_PO'].includes(sp.get('poType') || '') ? sp.get('poType') : 'ALL'

  const categoryOptions = useMemo(
    () =>
      INVOICE_TYPES.filter((c) =>
        poType === 'ALL' ? true : poType === 'PO' ? c !== 'Non-PO' : c === 'Non-PO'
      ),
    [poType]
  )

  const setPoType = (next) => {
    if (next === 'ALL') sp.delete('poType')
    else sp.set('poType', next)
    setSp(sp)
    setSelected(new Set())
    setCategory((prev) => {
      const allowed = INVOICE_TYPES.filter((c) =>
        next === 'ALL' ? true : next === 'PO' ? c !== 'Non-PO' : c === 'Non-PO'
      )
      return allowed.includes(prev) ? prev : ''
    })
  }

  const vendorFilter = sp.get('vendor')

  const queryParams = useMemo(() => {
    const stage = resolveLegacyFilterStage(params)
    if (USE_ESSA_BACKEND) {
      return {
        poType,
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(stage ? { workflow_stage: stage } : {}),
        ...(params.vendor ? { vendor: params.vendor } : {}),
        ...(category ? { category } : {}),
        ...(attention ? { attention } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      }
    }
    const { workflow_stage: _stage, ...apiParams } = params
    return { ...apiParams, ...(q.trim() ? { q: q.trim() } : {}) }
  }, [params, q, poType, category, attention, dateFrom, dateTo])

  const { data: essaRows = [], counts: essaCounts, isLoading: essaLoading, refetch: refetchEssa } =
    useEssaInvoices(queryParams)
  const { data: poRows = [], isLoading: poLoading, refetch: refetchPo } = usePoBasedInvoices()
  const isLoading = essaLoading || (!USE_ESSA_BACKEND && poLoading)

  const refresh = useCallback(() => {
    refetchEssa()
    refetchPo()
  }, [refetchEssa, refetchPo])

  const handleDeleteDemoUpload = useCallback(
    (rowId, invoiceNo) => {
      if (!deleteUploadedInvoice(rowId)) return
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(rowId)
        return next
      })
      refresh()
      showEssaSuccessToast(
        'Demo invoice removed',
        invoiceNo
          ? `${invoiceNo} was removed. You can upload the same file again.`
          : 'You can upload the same file again.'
      )
    },
    [refresh]
  )

  const allRows = useMemo(() => {
    const essaNormalized = (essaRows || []).map((row) => ({
      ...row,
      listSource: 'essa',
      rawId: row.id
    }))
    if (USE_ESSA_BACKEND) return essaNormalized
    return [...poRows, ...essaNormalized].sort((a, b) => {
      const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
      const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
      return bTime - aTime
    })
  }, [essaRows, poRows])

  const rows = useMemo(
    () =>
      USE_ESSA_BACKEND
        ? allRows
        : filterRows(allRows, params, role, q, poType, { category, attention, dateFrom, dateTo }),
    [allRows, params, role, q, poType, category, attention, dateFrom, dateTo]
  )

  const poTypeCounts = useMemo(
    () =>
      essaCounts || {
        ALL: allRows.length,
        PO: allRows.filter((r) => r.po_number).length,
        NON_PO: allRows.filter((r) => !r.po_number).length
      },
    [essaCounts, allRows]
  )

  const vendorLabel = rows.find((r) => r.vendor_name)?.vendor_name || vendorFilter
  const clearVendor = () => {
    sp.delete('vendor')
    setSp(sp)
  }

  const listTotal = rows.length
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize))
  const currentPage = Math.min(page, totalPages)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    const valueOf = (row) => {
      if (sortKey === 'category') return resolveInvoiceType(row)
      if (sortKey === 'amount') return Number(row.total_amount) || 0
      if (sortKey === 'po_number') return row.po_number || ''
      if (sortKey === 'status') return resolveWorkflowStage(row).label
      if (sortKey === 'next') return resolveNextAction(row).label
      if (sortKey === 'exceptions') return Number(row.failed_checks || row.openExceptions || 0)
      if (sortKey === 'sla') return row.due_date || row.invoice_due_date || row.sla_due || row.invoice_date || ''
      return row[sortKey] || ''
    }
    return [...rows].sort((a, b) => {
      const av = valueOf(a)
      const bv = valueOf(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir
    })
  }, [rows, sortKey, sortDir])

  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setPage(1)
  }, [q, poType, activeKey, vendorFilter, category, attention, dateFrom, dateTo])

  const onPill = (key) => {
    sp.set('filter', key)
    sp.delete('overall')
    sp.delete('status')
    sp.delete('workflow_stage')
    sp.delete('mine')
    sp.delete('to_approve')
    sp.delete('pending_my_action')
    setSp(sp)
    setSelected(new Set())
  }

  const [busy, setBusy] = useState(null)
  const [reasonFor, setReasonFor] = useState(null)
  const [reasonText, setReasonText] = useState('')

  const openInvoice = (row) => {
    navigate(`/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(row.id))}`)
  }

  const runAction = useCallback(
    async (key, ids, reason) => {
      if (!ids.length) return
      setBusy(key)
      let ok = 0
      let fail = 0
      const rowMap = new Map(allRows.map((r) => [r.id, r]))

      for (const id of ids) {
        const row = rowMap.get(id)
        if (!row) {
          fail++
          continue
        }
        if (key !== 'export' && row.source === 'po') {
          fail++
          continue
        }
        try {
          await execOne(key, row, reason)
          ok++
        } catch {
          fail++
        }
      }

      setBusy(null)
      setSelected(new Set())

      const label = ACTIONS[key]?.label || key
      if (key === 'export') {
        if (ok > 0) toast.success(`Exporting ${ok} invoice${ok === 1 ? '' : 's'}`)
      } else if (fail === 0) {
        toast.success(`${label} — ${ok} invoice${ok === 1 ? '' : 's'}`)
      } else if (ok > 0) {
        toast.warning(`${label}: ${ok} done, ${fail} skipped`)
      } else {
        toast.error(`${label} failed`)
      }

      if (key !== 'export') refresh()
    },
    [allRows, refresh]
  )

  const requestAction = useCallback(
    (key, ids) => {
      if (!ids.length) return
      if (ACTIONS[key]?.needsReason) {
        setReasonText('')
        setReasonFor({ key, ids })
      } else {
        runAction(key, ids)
      }
    },
    [runAction]
  )

  const confirmReason = () => {
    if (!reasonFor) return
    const { key, ids } = reasonFor
    setReasonFor(null)
    runAction(key, ids, reasonText.trim())
  }

  const bulkActions = useMemo(() => bulkActionsFor(role), [role])
  const selectedIds = useMemo(() => [...selected], [selected])
  const invoicesPath = `/${userType}${INVOICES}`

  const exportCsv = () => {
    const header = 'Invoice Number,Vendor,PO Number,Date,Amount,Currency,Status'
    const csvRows = rows.map((r) =>
      [
        r.invoice_no || '',
        r.vendor_name || '',
        r.po_number || '',
        r.uploaded_at || '',
        r.total_amount ?? '',
        r.currency || '',
        r.status_label || r.status || ''
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = poType === 'ALL' ? 'essa-invoices.csv' : `essa-invoices-${poType.toLowerCase().replace('_', '-')}.csv`
    a.click()
  }

  return (
    <LeftPageContainer className="essa-invoices-shell">
      <div className="essa-dashboard essa-invoices-page">
        <div className="dx-page dx-page--invoices-fit">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${INVOICE_DASHBOARD}` },
              { label: 'Invoice Processing' },
              { label: 'Invoice Workbench' }
            ]}
            title="Invoice Workbench"
            description="All invoices received through the AP mailbox, SharePoint and manual upload."
            actions={
              <Button variant="outline" size="sm" onClick={exportCsv} title="Download the invoices currently filtered on screen">
                <Download size={14} /> Export
              </Button>
            }
          />
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'sticky',
                  top: 18,
                  zIndex: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  flexShrink: 0,
                  marginBottom: 12,
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: BRAND,
                  color: '#fff',
                  boxShadow: BRAND_SHADOW
                }}
              >
                <div className="dx-row" style={{ gap: 10 }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {bulkActions.map((a) => (
                    <BulkBtn
                      key={a.key}
                      tone={a.tone}
                      disabled={!!busy}
                      onClick={() => requestAction(a.key, selectedIds)}
                    >
                      <a.icon size={13} />
                      {busy === a.key ? 'Working…' : `${a.label}${a.key === 'export' ? '' : ' all'}`}
                    </BulkBtn>
                  ))}
                  <BulkBtn ghost onClick={() => setSelected(new Set())}>
                    <X size={13} /> Clear
                  </BulkBtn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ListWorkbench>
            <Tabs
              tabs={PO_TYPE_TABS.map((t) => ({
                value: t.value,
                label: t.label,
                badge: poTypeCounts[t.value] ?? 0
              }))}
              value={poType}
              onChange={setPoType}
            />
            <FilterBar className="dx-invoices-filters border-b border-line-soft">
              <FilterField label="Search">
                <FilterSearch
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Invoice, vendor or PO number"
                  className="dx-invoices-search-input"
                  aria-label="Search invoices"
                />
              </FilterField>
              <FilterField label="Current Status">
                <span className="block w-[160px]">
                  <select
                    className="dx-select"
                    value={activeKey}
                    onChange={(e) => onPill(e.target.value)}
                    aria-label="Current status filter"
                  >
                    {pills.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.key === 'all' ? 'Any status' : p.label}
                      </option>
                    ))}
                  </select>
                </span>
              </FilterField>
              <FilterField label="Category">
                <span className="block w-[160px]">
                  <select
                    className="dx-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label="Category filter"
                  >
                    <option value="">Any category</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </span>
              </FilterField>
              <FilterField label="Needs Attention">
                <span className="block w-[160px]">
                  <select
                    className="dx-select"
                    value={attention}
                    onChange={(e) => setAttention(e.target.value)}
                    aria-label="Needs attention filter"
                  >
                    <option value="">No filter</option>
                    <option value="sla">SLA Breached</option>
                    <option value="exc">Has exceptions</option>
                  </select>
                </span>
              </FilterField>
              <FilterField label="Invoice Date">
                <span className="flex items-center gap-1.5">
                  <span className="block w-[140px]">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label="Invoice date from"
                    />
                  </span>
                  <span className="text-ink-muted">–</span>
                  <span className="block w-[140px]">
                    <Input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="Invoice date to"
                    />
                  </span>
                </span>
              </FilterField>
              {vendorFilter && (
                <div
                  className="dx-row"
                  title="Filtering by vendor — click to clear"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px 6px 12px',
                    borderRadius: 999,
                    background: 'var(--dx-primary-50, #E7F6EB)',
                    border: '1px solid var(--dx-primary-200, #A0DBAD)',
                    color: 'var(--dx-primary-700, #196B2C)',
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  <span>Vendor: {vendorLabel}</span>
                  <button
                    type="button"
                    onClick={clearVendor}
                    aria-label="Clear vendor filter"
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'rgba(25, 107, 44,.12)',
                      color: 'inherit'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </FilterBar>

            {listTotal > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                total={listTotal}
                pageSize={pageSize}
                onPage={setPage}
              />
            )}

            <WorkbenchTable>
                <thead>
                  <tr>
                    <SortTh col="invoice_no" sortKey={sortKey} onSort={toggleSort}>Invoice Number</SortTh>
                    <SortTh col="vendor_name" sortKey={sortKey} onSort={toggleSort}>Vendor Name</SortTh>
                    <SortTh col="category" sortKey={sortKey} onSort={toggleSort}>Category</SortTh>
                    <SortTh col="amount" sortKey={sortKey} onSort={toggleSort}>Amount (IDR)</SortTh>
                    <SortTh col="po_number" sortKey={sortKey} onSort={toggleSort}>PO Number</SortTh>
                    <SortTh col="status" sortKey={sortKey} onSort={toggleSort}>Current Status</SortTh>
                    <SortTh col="next" sortKey={sortKey} onSort={toggleSort}>Next Status</SortTh>
                    <SortTh col="exceptions" sortKey={sortKey} onSort={toggleSort}>Exceptions</SortTh>
                    <SortTh col="sla" sortKey={sortKey} onSort={toggleSort}>SLA Due</SortTh>
                    <th style={{ fontWeight: 700, letterSpacing: '0.5px', fontSize: '10px', textTransform: 'uppercase' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={10}>
                          <Skeleton style={{ height: 14, margin: '8px 0' }} />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState
                          icon="inbox"
                          title="Nothing here"
                          description={`No invoices match "${activePill.label}".`}
                        />
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => (
                      <Row
                        key={r.id}
                        r={r}
                        role={role}
                        invoicesPath={invoicesPath}
                        onOpen={() => openInvoice(r)}
                        onDeleteDemo={handleDeleteDemoUpload}
                      />
                    ))
                  )}
                </tbody>
            </WorkbenchTable>
            {listTotal > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                total={listTotal}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            )}
          </ListWorkbench>
        </div>
      </div>

      <Dialog
        open={!!reasonFor}
        onClose={() => setReasonFor(null)}
        title={
          reasonFor
            ? `${ACTIONS[reasonFor.key]?.label}${reasonFor.ids.length > 1 ? ` — ${reasonFor.ids.length} invoices` : ''}`
            : ''
        }
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonFor(null)}>
              Cancel
            </Button>
            <Button
              variant={reasonFor?.key === 'reject' ? 'danger' : 'primary'}
              disabled={!reasonText.trim()}
              onClick={confirmReason}
            >
              {reasonFor ? ACTIONS[reasonFor.key]?.label : 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="dx-dialog-desc">
          {reasonFor?.key === 'reject'
            ? 'Provide a clear reason so the vendor knows what to fix before resubmitting.'
            : 'This note will be visible to the next reviewer in the approval chain.'}
        </p>
        <div className="dx-field">
          <label className="dx-label" htmlFor="invoice-action-reason">
            {reasonFor?.key === 'reject' ? 'Reason for rejection' : 'Reason / note for reviewer'}
          </label>
          <Textarea
            id="invoice-action-reason"
            autoFocus
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder={
              reasonFor?.key === 'reject'
                ? 'e.g. PO mismatch, missing supporting docs…'
                : 'e.g. Please verify retention amount…'
            }
            rows={3}
          />
          <span className="dx-field-hint">Required before confirming this action.</span>
        </div>
      </Dialog>
    </LeftPageContainer>
  )
}

const STAGE_LIST_LABEL = {
  draft: 'Draft',
  validated: 'Validated',
  parked: 'Parked',
  posted: 'Posted',
  paid: 'Paid',
  rejected: 'Rejected',
  review: 'In review'
}

function Row({ r, role, invoicesPath, onOpen, onDeleteDemo }) {
  const sla = r.due_date || r.invoice_due_date || r.sla_due
  const exceptions = Number(r.failed_checks || r.openExceptions || 0)
  const stage = resolveWorkflowStage(r)
  return (
    <tr>
      <td onClick={onOpen} style={{ cursor: 'pointer' }}>
        <span className="dx-invoice-no" title={r.invoice_no || ''}>
          {r.invoice_no || '—'}
        </span>
      </td>
      <td onClick={onOpen} style={{ cursor: 'pointer' }}>
        <div className="dx-vendor-name-only" title={r.vendor_name || ''}>
          {r.vendor_name || '—'}
        </div>
      </td>
      <td onClick={onOpen} style={{ cursor: 'pointer' }}>
        {resolveInvoiceType(r)}
      </td>
      <td className="dx-amount" onClick={onOpen} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {fmtMoney(r.total_amount, r.currency)}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        {r.po_number ? (
          <Link
            to={`${invoicesPath}?po=${encodeURIComponent(r.po_number)}`}
            className="dx-po-link"
          >
            {r.po_number}
          </Link>
        ) : resolveInvoiceType(r) === NON_PO_LABEL ? (
          <span className="dx-table-muted">{NON_PO_LABEL}</span>
        ) : (
          <span className="dx-table-muted">—</span>
        )}
      </td>
      <td onClick={onOpen} style={{ cursor: 'pointer' }}>
        <WorkflowStageBadge inv={r} label={STAGE_LIST_LABEL[stage.key] || stage.shortLabel} />
      </td>
      <td onClick={onOpen} style={{ cursor: 'pointer' }}>
        <NextActionCell inv={r} role={role} />
      </td>
      <td onClick={onOpen} style={{ cursor: 'pointer' }}>
        {exceptions}
      </td>
      <td onClick={onOpen} className="dx-table-muted" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {sla ? fmtDate(sla) : '—'}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="dx-invoice-row-actions">
          <Button size="sm" variant="ghost" title={`Open invoice ${r.invoice_no || ''}`} onClick={onOpen}>
            Open <ArrowRight size={12} />
          </Button>
          {r.is_demo_upload && isEssaDemoDeleteEnabled() && (
            <button
              type="button"
              className="dx-demo-delete-btn"
              title="Remove uploaded demo invoice"
              aria-label={`Remove demo invoice ${r.invoice_no || ''}`}
              onClick={() => onDeleteDemo(r.id, r.invoice_no)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function BulkBtn({ ghost, tone, children, ...props }) {
  const bg = ghost
    ? 'transparent'
    : tone === 'success'
      ? 'rgba(255,255,255,.95)'
      : tone === 'danger'
        ? 'rgba(255,255,255,.18)'
        : 'rgba(255,255,255,.18)'
  const fg = !ghost && tone === 'success' ? 'var(--dx-success-700)' : '#fff'
  return (
    <button
      type="button"
      {...props}
      style={{
        padding: '7px 12px',
        borderRadius: 8,
        background: bg,
        color: fg,
        border: ghost ? '1px solid rgba(255,255,255,.3)' : 'none',
        fontSize: 12,
        fontWeight: 600,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }}
    >
      {children}
    </button>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaInvoices)
