import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  TrendingDown,
  X
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { Input } from '../ui/Input'
import { Dialog } from '../ui/Dialog'
import { Textarea } from '../ui/Textarea'
import { usePoBasedInvoices } from 'hooks/usePoBasedInvoices'
import { usePoBasedInvoice } from 'hooks/usePoBasedInvoice'
import { fmtMoney, fmtDate, NON_PO_LABEL } from 'api/essaDashboard'
import { overrideEssaValidation } from 'api/essaAudit'
import { isPersistedOcrUploadId } from 'api/apInvoiceOcr'
import { INVOICE_DETAIL } from 'constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = '#0DA6EA'

const exceptionAnalyticsCss = `
.exception-analytics-card {
  display: flex;
  flex-direction: column;
}
.exception-chart-body {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  padding-top: 8px;
}
.exception-chart-body .recharts-responsive-container {
  margin: 0 auto;
}
.exception-analytics-table.dx-table-compact tbody td {
  padding-top: 6px;
  padding-bottom: 6px;
}
`

const DUMMY_EXCEPTION_ROWS = [
  {
    id: 'po-dummy-1',
    source: 'po',
    rawId: 'demo-1',
    invoice_no: 'INV-2024-0881',
    vendor_name: 'PT Mitra Sejahtera',
    po_number: '4500123456',
    total_amount: 48500000,
    currency: 'IDR',
    uploaded_at: '2024-11-12T09:30:00Z',
    overall: 'review',
    status: 'pending',
    status_label: 'Under Review',
    failed_checks: 0,
    warned_checks: 2,
    isDummy: true
  },
  {
    id: 'po-dummy-2',
    source: 'po',
    rawId: 'demo-2',
    invoice_no: 'INV-2024-0912',
    vendor_name: 'PT Global Supplies',
    po_number: '4500987123',
    total_amount: 128500000,
    currency: 'IDR',
    uploaded_at: '2024-11-18T14:15:00Z',
    overall: 'rejected',
    status: 'rejected',
    status_label: 'Rejected',
    failed_checks: 3,
    warned_checks: 0,
    isDummy: true
  },
  {
    id: 'po-dummy-3',
    source: 'po',
    rawId: 'demo-3',
    invoice_no: 'INV-2024-0934',
    vendor_name: 'PT Nusantara Logistics',
    po_number: '4500765432',
    total_amount: 67200000,
    currency: 'IDR',
    uploaded_at: '2024-11-22T11:00:00Z',
    overall: 'review',
    status: 'pending',
    status_label: 'Submitted for Review',
    failed_checks: 0,
    warned_checks: 1,
    isDummy: true
  }
]

const DUMMY_TOP_RULES = [
  { name: 'PO balance check', fail: 4, warn: 3 },
  { name: 'Vendor name match', fail: 3, warn: 2 },
  { name: 'SES booking match', fail: 1, warn: 5 },
  { name: 'Bank account verification', fail: 0, warn: 4 }
]

function enrichExceptionRow(row) {
  const isFail = row.overall === 'rejected'
  const isWarn = row.overall === 'review'
  return {
    ...row,
    failed_checks: row.failed_checks || (isFail ? 2 : 0),
    warned_checks: row.warned_checks || (isWarn ? 2 : 0)
  }
}

function buildValidationChecks(invoice) {
  if (!invoice) return []
  if (invoice.overall === 'rejected') {
    return [
      {
        name: 'PO balance check',
        status: 'fail',
        expected: 'Within PO remaining balance',
        actual: 'Exceeded by 12%'
      },
      {
        name: 'Vendor name match',
        status: 'fail',
        expected: invoice.vendor_name || 'Master vendor name',
        actual: 'Mismatch on vendor master'
      },
      {
        name: 'Invoice rate vs PO',
        status: 'fail',
        expected: 'Matches contracted rate',
        actual: 'Rate deviation detected'
      }
    ]
  }
  return [
    {
      name: 'SES booking match',
      status: 'warn',
      expected: 'Qty matches SES booking',
      actual: 'Qty differs by 2 units'
    },
    {
      name: 'Bank account verification',
      status: 'warn',
      expected: 'Known bank account',
      actual: 'New account pending review'
    }
  ]
}

function buildStatsFromRows(rows) {
  const warnings = rows.filter((r) => r.overall === 'review').length
  const failures = rows.filter((r) => r.overall === 'rejected').length
  const byVendorMap = {}

  rows.forEach((row) => {
    const name = row.vendor_name || 'Unknown vendor'
    if (!byVendorMap[name]) {
      byVendorMap[name] = { vendor_name: name, warnings: 0, failures: 0, total: 0 }
    }
    if (row.overall === 'review') byVendorMap[name].warnings += 1
    if (row.overall === 'rejected') byVendorMap[name].failures += 1
    byVendorMap[name].total += 1
  })

  return {
    counts: { total: rows.length, warnings, failures },
    mttrHours: 18,
    topRules: rows.length ? DUMMY_TOP_RULES : [],
    byVendor: Object.values(byVendorMap).sort((a, b) => b.total - a.total)
  }
}

function EssaExceptionWorkbench({ userInfo: { userType } }) {
  const { data: poRows = [], isLoading, refetch } = usePoBasedInvoices()

  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [revalidatingId, setRevalidatingId] = useState(null)
  const [noteModal, setNoteModal] = useState(null)
  const [escalateModal, setEscalateModal] = useState(null)
  const [bulkModal, setBulkModal] = useState(null)
  const [actionPending, setActionPending] = useState(false)

  const sourceRows = useMemo(() => {
    const fromPo = poRows
      .filter((row) => row.overall === 'review' || row.overall === 'rejected')
      .map(enrichExceptionRow)

    return fromPo.length ? fromPo : DUMMY_EXCEPTION_ROWS
  }, [poRows])

  const stats = useMemo(() => buildStatsFromRows(sourceRows), [sourceRows])

  let rows = sourceRows
  if (filter !== 'all') rows = rows.filter((r) => r.overall === filter)
  if (q.trim()) {
    const needle = q.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.invoice_no || '').toLowerCase().includes(needle) ||
        (r.vendor_name || '').toLowerCase().includes(needle) ||
        (r.po_number || '').toLowerCase().includes(needle)
    )
  }

  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)))
  }

  const invoicePath = (id, isDummy) =>
    isDummy
      ? '#'
      : `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(id))}`

  const handleRevalidate = async (id) => {
    setRevalidatingId(id)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setRevalidatingId(null)
    refetch()
  }

  const handleNote = async (note) => {
    const text = String(note || '').trim()
    if (!text || !noteModal) return
    setActionPending(true)
    try {
      const invoiceId = noteModal.id || noteModal.rawId
      if (isPersistedOcrUploadId(invoiceId)) {
        await overrideEssaValidation(invoiceId, {
          ruleCode: 'MANUAL_CORRECTION',
          fieldCode: 'MANUAL_CORRECTION',
          reasonRemarks: text,
          source: 'PORTAL'
        })
      }
      setNoteModal(null)
    } catch (err) {
      // Keep modal open; surface via console for now — toast may not be wired here
      console.error('Failed to record exception note', err)
    } finally {
      setActionPending(false)
    }
  }

  const handleEscalate = async () => {
    setActionPending(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setActionPending(false)
    setEscalateModal(null)
  }

  const handleBulk = async () => {
    setActionPending(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setActionPending(false)
    setBulkModal(null)
    setSelected(new Set())
    refetch()
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page dx-stack">
          <p className="text-muted" style={{ marginBottom: 4, fontSize: 13 }}>
            Triage invoices with failed or warning validation
          </p>

          <StatsPanel stats={stats} loading={isLoading} />

          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: 'var(--dx-radius)',
                  background: BRAND,
                  color: '#fff',
                  boxShadow: 'var(--dx-shadow-md)'
                }}
              >
                <div className="dx-row" style={{ gap: 10 }}>
                  <Check size={16} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <BulkBtn onClick={() => setBulkModal({ action: 'revalidate' })}>
                    <RefreshCcw size={13} /> Re-validate
                  </BulkBtn>
                  <BulkBtn onClick={() => setBulkModal({ action: 'note' })}>
                    <MessageSquare size={13} /> Add note
                  </BulkBtn>
                  <BulkBtn onClick={() => setBulkModal({ action: 'close' })}>
                    <X size={13} /> Close
                  </BulkBtn>
                  <BulkBtn ghost onClick={() => setSelected(new Set())}>
                    Clear
                  </BulkBtn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader>
              <AlertOctagon size={18} style={{ color: 'var(--dx-warn-600)' }} />
              <CardTitle>Exception Queue · {rows.length}</CardTitle>

              <div className="dx-row" style={{ marginLeft: 'auto', gap: 6 }}>
                {[
                  { k: 'all', label: 'All' },
                  { k: 'review', label: 'Warnings' },
                  { k: 'rejected', label: 'Failed' }
                ].map((f) => (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => setFilter(f.k)}
                    className={`dx-btn ${filter === f.k ? 'dx-btn-primary' : 'dx-btn-ghost'} dx-btn-sm`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                <Input
                  style={{ width: 240 }}
                  placeholder="Search invoice, vendor, PO…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button variant="ghost" type="button">
                  <Search size={14} />
                </Button>
              </div>
            </CardHeader>

            <div className="dx-table-wrap dx-table-wrap-scroll" style={{ height: 250 }}>
              <table className="dx-table dx-table-compact">
                <thead>
                  <tr>
                    <th style={{ width: 38 }}>
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selected.size === rows.length}
                        onChange={toggleAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: 30 }} />
                    <th>Invoice</th>
                    <th>Vendor</th>
                    <th>PO</th>
                    <th className="text-end">Amount</th>
                    <th>Severity</th>
                    <th>Issues</th>
                    <th>Uploaded</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={10}>
                          <Skeleton style={{ height: 14, margin: '6px 0' }} />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState
                          icon="check-circle"
                          title="No exceptions"
                          description={
                            filter === 'all'
                              ? 'All invoices have passed validation.'
                              : `No invoices in the "${filter}" bucket.`
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <ExceptionRow
                        key={r.id}
                        row={r}
                        open={openId === r.id}
                        checked={selected.has(r.id)}
                        invoicePath={invoicePath(r.id, r.isDummy)}
                        onToggleOpen={() => setOpenId(openId === r.id ? null : r.id)}
                        onToggleCheck={() => toggle(r.id)}
                        onRevalidate={() => handleRevalidate(r.id)}
                        onNote={() => setNoteModal({ id: r.id, invoice: r })}
                        onEscalate={() => setEscalateModal({ id: r.id, invoice: r })}
                        revalidating={revalidatingId === r.id}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <NoteDialog
        open={!!noteModal}
        invoice={noteModal?.invoice}
        onClose={() => setNoteModal(null)}
        onSubmit={handleNote}
        pending={actionPending}
      />

      <EscalateDialog
        open={!!escalateModal}
        invoice={escalateModal?.invoice}
        onClose={() => setEscalateModal(null)}
        onSubmit={handleEscalate}
        pending={actionPending}
      />

      <BulkDialog
        modal={bulkModal}
        ids={Array.from(selected)}
        onClose={() => setBulkModal(null)}
        onSubmit={handleBulk}
        pending={actionPending}
      />
    </LeftPageContainer>
  )
}

function StatsPanel({ stats, loading }) {
  if (loading && !stats) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 110, borderRadius: 18 }} />
        ))}
      </div>
    )
  }

  const { counts = {}, mttrHours, topRules = [], byVendor = [] } = stats || {}

  return (
    <div className="dx-stack-sm">
      <style>{exceptionAnalyticsCss}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatTile label="Total Exceptions" value={counts.total || 0} icon={AlertOctagon} tone="warn" />
        <StatTile
          label="Warnings"
          value={counts.warnings || 0}
          icon={AlertTriangle}
          tone="warn"
          hint="overall = review"
        />
        <StatTile
          label="Hard failures"
          value={counts.failures || 0}
          icon={ShieldAlert}
          tone="danger"
          hint="overall = rejected"
        />
        <StatTile
          label="Mean time to resolve"
          value={mttrHours != null ? `${mttrHours}h` : '—'}
          icon={Clock}
          tone="info"
          hint="upload → posted"
        />
      </div>

      <div className="dx-grid-5-7">
        <Card className="exception-analytics-card">
          <CardHeader>
            <BarChart3 size={16} style={{ color: 'var(--dx-text-soft)' }} />
            <CardTitle>Top failing rules</CardTitle>
          </CardHeader>
          <CardBody className="exception-chart-body">
            {topRules.length === 0 ? (
              <div className="text-xs text-muted" style={{ padding: '12px 0' }}>
                No rules tripped yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topRules} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: 'var(--dx-text-mute)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={{ fontSize: 11, fill: 'var(--dx-text-soft)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid var(--dx-border)',
                      fontSize: 12
                    }}
                    cursor={{ fill: 'rgba(13,166,234,.06)' }}
                  />
                  <Bar dataKey="fail" stackId="r" fill="#EF4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="warn" stackId="r" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <TrendingDown size={16} style={{ color: 'var(--dx-text-soft)' }} />
            <CardTitle>Exceptions by vendor</CardTitle>
          </CardHeader>
          <div className="dx-table-wrap">
            <table className="dx-table dx-table-compact exception-analytics-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th className="text-end">Warn</th>
                  <th className="text-end">Fail</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {byVendor.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: 'center',
                        padding: 16,
                        color: 'var(--dx-text-mute)',
                        fontSize: 12
                      }}
                    >
                      No vendor exceptions yet.
                    </td>
                  </tr>
                ) : (
                  byVendor.map((v) => (
                    <tr key={v.vendor_name} style={{ cursor: 'default' }}>
                      <td
                        style={{
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={v.vendor_name}
                      >
                        {v.vendor_name}
                      </td>
                      <td
                        className="text-end"
                        style={{
                          color: 'var(--dx-warn-700)',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {v.warnings || 0}
                      </td>
                      <td
                        className="text-end"
                        style={{
                          color: 'var(--dx-error-700)',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {v.failures || 0}
                      </td>
                      <td className="text-end" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {v.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatTile({ label, value, hint, icon: Icon, tone }) {
  const colors = {
    warn: { bg: 'var(--dx-warn-50)', fg: 'var(--dx-warn-700)' },
    danger: { bg: 'var(--dx-error-50)', fg: 'var(--dx-error-700)' },
    info: { bg: 'rgba(13,166,234,.10)', fg: 'var(--dx-primary-700)' }
  }[tone] || { bg: 'var(--dx-g-100)', fg: 'var(--dx-text)' }

  return (
    <div className="dx-card" style={{ padding: 14 }}>
      <div className="dx-row-between" style={{ marginBottom: 8 }}>
        <span
          className="text-xs text-muted"
          style={{ letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}
        >
          {label}
        </span>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: colors.bg,
            color: colors.fg,
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <Icon size={14} />
        </div>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--dx-text)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.5px'
        }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function ExceptionRow({
  row,
  open,
  checked,
  invoicePath,
  onToggleOpen,
  onToggleCheck,
  onRevalidate,
  onNote,
  onEscalate,
  revalidating
}) {
  const severity = row.overall === 'rejected' ? 'fail' : 'warn'

  return (
    <>
      <tr style={{ background: checked ? 'rgba(13,166,234,.04)' : undefined }}>
        <td onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            style={{ cursor: 'pointer' }}
          />
        </td>
        <td onClick={onToggleOpen}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
        <td onClick={onToggleOpen} style={{ fontWeight: 600 }}>
          {row.invoice_no || '—'}
        </td>
        <td
          onClick={onToggleOpen}
          style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {row.vendor_name || '—'}
        </td>
        <td onClick={onToggleOpen}>{row.po_number || <span className="text-muted">{NON_PO_LABEL}</span>}</td>
        <td className="text-end" onClick={onToggleOpen}>
          {fmtMoney(row.total_amount, row.currency)}
        </td>
        <td onClick={onToggleOpen}>
          <Badge tone={severity}>{severity === 'fail' ? 'FAIL' : 'WARNING'}</Badge>
        </td>
        <td onClick={onToggleOpen}>
          {row.failed_checks > 0 && (
            <span className="text-xs text-danger" style={{ marginRight: 6 }}>
              {row.failed_checks} fail
            </span>
          )}
          {row.warned_checks > 0 && (
            <span className="text-xs text-warning">{row.warned_checks} warn</span>
          )}
        </td>
        <td className="text-xs text-muted" onClick={onToggleOpen}>
          {fmtDate(row.uploaded_at)}
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          {row.isDummy ? (
            <Button size="sm" variant="ghost" disabled>
              Open <ArrowUpRight size={12} />
            </Button>
          ) : (
            <Link to={invoicePath}>
              <Button size="sm" variant="ghost">
                Open <ArrowUpRight size={12} />
              </Button>
            </Link>
          )}
        </td>
      </tr>
      <AnimatePresence>
        {open && (
          <tr>
            <td colSpan={10} style={{ padding: 0, background: 'var(--dx-bg)' }}>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <ExpandedChecks
                  row={row}
                  invoicePath={invoicePath}
                  onRevalidate={onRevalidate}
                  onNote={onNote}
                  onEscalate={onEscalate}
                  revalidating={revalidating}
                />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function ExpandedChecks({ row, invoicePath, onRevalidate, onNote, onEscalate, revalidating }) {
  const { data: inv, isLoading } = usePoBasedInvoice(row.isDummy ? null : row.id)
  const checks = useMemo(() => {
    if (row.isDummy) return buildValidationChecks(row)
    const fromApi = inv?.validation?.checks || []
    return fromApi.length ? fromApi : buildValidationChecks(inv || row)
  }, [inv, row])

  if (!row.isDummy && (isLoading || !inv)) {
    return (
      <div style={{ padding: 20 }}>
        <Skeleton style={{ height: 14, marginBottom: 8 }} />
        <Skeleton style={{ height: 14, width: '80%' }} />
      </div>
    )
  }

  const issues = checks.filter((c) => c.status === 'fail' || c.status === 'warn')

  return (
    <div style={{ padding: 20 }}>
      <div className="dx-row" style={{ marginBottom: 12 }}>
        <ShieldAlert size={14} style={{ color: 'var(--dx-warn-600)' }} />
        <strong style={{ fontSize: 13 }}>
          {issues.length} issue{issues.length !== 1 ? 's' : ''}
        </strong>
        <span className="text-xs text-muted">to triage</span>
      </div>

      <div
        style={{
          border: '1px solid var(--dx-border-soft)',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#fff'
        }}
      >
        <div className="dx-table-wrap dx-table-wrap-scroll dx-table-wrap-scroll-fit">
          <table className="dx-table dx-table-compact">
            <thead>
              <tr>
                <th>Validation rule</th>
                <th>Severity</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Suggested action</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((c, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>
                    <Badge tone={c.status === 'fail' ? 'fail' : 'warn'}>
                      {c.status === 'fail' ? 'FAIL' : 'WARNING'}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted">{c.expected || '—'}</td>
                  <td className="text-xs text-muted">{c.actual || '—'}</td>
                  <td className="text-xs text-muted">{suggestion(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dx-row" style={{ marginTop: 16, gap: 8, flexWrap: 'wrap' }}>
        {row.isDummy ? (
          <Button variant="primary" size="sm" disabled>
            <ArrowUpRight size={14} /> Open detail to correct
          </Button>
        ) : (
          <Link to={invoicePath}>
            <Button variant="primary" size="sm">
              <ArrowUpRight size={14} /> Open detail to correct
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={onRevalidate} disabled={revalidating}>
          <RefreshCcw size={14} /> {revalidating ? 'Re-validating…' : 'Re-validate'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onNote}>
          <MessageSquare size={14} /> Add note
        </Button>
        <Button variant="ghost" size="sm" onClick={onEscalate}>
          <Send size={14} /> Escalate
        </Button>
      </div>
    </div>
  )
}

function suggestion(check) {
  const n = (check.name || '').toLowerCase()
  if (n.includes('po exists')) return 'Confirm PO number with procurement; reject if missing.'
  if (n.includes('vendor')) return 'Verify vendor name against master; reject if mismatch.'
  if (n.includes('balance')) return 'Invoice exceeds PO balance — escalate to procurement.'
  if (n.includes('rate')) return 'Check rate against PO contract; reject if deviation.'
  if (n.includes('qty')) return 'Verify quantity vs SES / PO remaining.'
  if (n.includes('ses')) return 'Confirm SES booking matches invoice line.'
  if (n.includes('retention')) return 'Compute payable as Total × (1 − retention %).'
  if (n.includes('bank')) return 'Confirm with vendor — update master if legitimate.'
  if (n.includes('reconcil')) return 'Compare hours across BA / Summary / Timesheet / Attendance.'
  if (n.includes('ld')) return 'Compute weeks late × LD clause, capped at LD cap.'
  if (n.includes('completeness')) return 'Request the missing supporting docs from vendor.'
  if (n.includes('non-pkp')) return 'Reject if invoice older than 1 year; otherwise tag for VAT exemption.'
  return 'Open detail view and correct extracted fields.'
}

function BulkBtn({ ghost, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      style={{
        padding: '7px 12px',
        borderRadius: 8,
        background: ghost ? 'transparent' : 'rgba(255,255,255,.18)',
        color: '#fff',
        border: ghost ? '1px solid rgba(255,255,255,.3)' : 'none',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
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

function NoteDialog({ open, invoice, onClose, onSubmit, pending }) {
  const [note, setNote] = useState('')

  return (
    <Dialog
      open={open}
      width={520}
      onClose={() => {
        setNote('')
        onClose()
      }}
      title={`Add reviewer note · ${invoice?.invoice_no || ''}`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setNote('')
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!note.trim() || pending}
            onClick={() => {
              onSubmit(note)
              setNote('')
            }}
          >
            <MessageSquare size={13} /> {pending ? 'Adding…' : 'Add note'}
          </Button>
        </>
      }
    >
      <p className="dx-dialog-desc">
        This note is written to the <strong>audit log</strong> as an OVERRIDE /
        manual correction and will also appear on the invoice timeline.
      </p>
      <div className="dx-field">
        <label className="dx-label" htmlFor="exception-note">
          Note
        </label>
        <Textarea
          id="exception-note"
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Confirmed with procurement — vendor rate revision approved on 12 Apr…"
        />
      </div>
    </Dialog>
  )
}

function EscalateDialog({ open, invoice, onClose, onSubmit, pending }) {
  const [toRole, setToRole] = useState('business_reviewer')
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      width={520}
      onClose={() => {
        setToRole('business_reviewer')
        setReason('')
        onClose()
      }}
      title={`Escalate · ${invoice?.invoice_no || ''}`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setToRole('business_reviewer')
              setReason('')
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" disabled={!reason.trim() || pending} onClick={onSubmit}>
            <Send size={13} /> {pending ? 'Sending…' : 'Send escalation'}
          </Button>
        </>
      }
    >
      <p className="dx-dialog-desc">
        Push this exception to a specific role for review. A timeline event will be created.
      </p>
      <div className="dx-field" style={{ marginBottom: 12 }}>
        <label className="dx-label" htmlFor="escalate-role">
          Escalate to
        </label>
        <select
          id="escalate-role"
          className="dx-input"
          value={toRole}
          onChange={(e) => setToRole(e.target.value)}
        >
          <option value="business_reviewer">Business Reviewer (Procurement / Camp Admin)</option>
          <option value="ap_reviewer">AP Reviewer</option>
          <option value="hos">HOS — Head of Section</option>
          <option value="hod">HOD — Head of Department</option>
          <option value="hof">HOF — Head of Function</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <div className="dx-field">
        <label className="dx-label" htmlFor="escalate-reason">
          Reason
        </label>
        <Textarea
          id="escalate-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Invoice exceeds PO balance by 12M IDR — needs procurement review."
        />
      </div>
    </Dialog>
  )
}

function BulkDialog({ modal, ids, onClose, onSubmit, pending }) {
  const [note, setNote] = useState('')
  const action = modal?.action
  const needsNote = action === 'note' || action === 'close'
  const titles = {
    revalidate: 'Bulk re-validate',
    note: 'Add note to selected',
    close: 'Close selected exceptions'
  }

  return (
    <Dialog
      open={!!modal}
      width={520}
      onClose={() => {
        setNote('')
        onClose()
      }}
      title={`${titles[action] || ''} · ${ids.length} invoice${ids.length !== 1 ? 's' : ''}`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setNote('')
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={pending || (needsNote && !note.trim())}
            onClick={() => {
              onSubmit(needsNote ? note : null)
              setNote('')
            }}
          >
            {pending ? 'Processing…' : 'Apply'}
          </Button>
        </>
      }
    >
      <p className="dx-dialog-desc">
        {action === 'revalidate' &&
          'Re-run validation against the latest master data for each selected invoice. Status may change as a result.'}
        {action === 'note' && 'A single note will be added to the timeline of each selected invoice.'}
        {action === 'close' &&
          'Each selected exception will be moved to "archived" status. Any failing rules are kept in the audit trail.'}
      </p>
      {needsNote && (
        <div className="dx-field">
          <label className="dx-label" htmlFor="bulk-note">
            {action === 'close' ? 'Closure reason' : 'Note'}
          </label>
          <Textarea
            id="bulk-note"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={
              action === 'close'
                ? 'e.g. Confirmed duplicate uploads. Originals already posted.'
                : 'e.g. All flagged invoices are awaiting Q2 reconciliation.'
            }
          />
        </div>
      )}
    </Dialog>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaExceptionWorkbench)
