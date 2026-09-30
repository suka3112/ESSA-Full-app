import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertOctagon,
  ArrowRight,
  Calendar,
  CheckCircle2 as CheckIcon,
  Clock,
  Download,
  Filter,
  Search,
  ShieldAlert,
  TrendingUp,
  Workflow as WorkflowIcon
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Skeleton, SkeletonCard } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { useEssaDashboard } from 'hooks/useEssaDashboard'
import { useEssaMyWork } from 'hooks/useEssaMyWork'
import { useEssaInvoices } from 'hooks/useEssaInvoices'
import {
  mergeActionItemRows,
  fmtMoney,
  fmtDate,
  fmtDateOnly,
  NON_PO_LABEL,
  resolveInvoiceType
} from 'api/essaDashboard'
import { WorkflowStageBadge } from '../ui/WorkflowStageBadge'
import {
  INVOICES,
  INVOICE_DETAIL,
  EXCEPTION_WORKBENCH
} from 'constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, var(--dx-primary-600))'
const BRAND_DARK = 'var(--brand-secondary-color, var(--dx-primary-700))'
const BRAND_LIGHT = 'var(--brand-primary-color-light, rgba(13, 166, 234, 0.1))'
const BRAND_LIGHT_FILL = 'var(--brand-primary-color-light, rgba(13, 166, 234, 0.06))'

function invoicesPath(userType, query = '') {
  return `/${userType}${INVOICES}${query ? `?${query}` : ''}`
}

function getInvoiceStateSegments(counts, userType) {
  return [
    {
      label: 'Validated',
      value: counts.validated ?? counts.drafted ?? counts.pending ?? 0,
      color: BRAND,
      href: invoicesPath(userType, 'filter=validated')
    },
    {
      label: 'Parked',
      value: counts.parked ?? 0,
      color: 'var(--dx-warn-500)',
      href: invoicesPath(userType, 'filter=parked')
    },
    {
      label: 'Posted',
      value: counts.posted ?? 0,
      color: 'var(--dx-info-500, var(--dx-primary-500))',
      href: invoicesPath(userType, 'filter=posted')
    },
    {
      label: 'Paid',
      value: counts.paid ?? 0,
      color: 'var(--dx-success-500)',
      href: invoicesPath(userType, 'filter=paid')
    }
  ]
}

function EssaDashboard({ userInfo: { userType } }) {
  const { data: d, isLoading } = useEssaDashboard()
  const { data: myWork, isLoading: myWorkLoading } = useEssaMyWork()
  const counts = d?.counts || {}

  return (
    <LeftPageContainer className="essa-dashboard-shell">
      <div className="essa-dashboard essa-dashboard-page">
        <div className="dx-page dx-page--dashboard-fit">
          <MyWork myWork={myWork} loading={myWorkLoading} userType={userType} />

          <div className="dx-dashboard-action-items">
            <ActionItems userType={userType} />
          </div>

          <div className="dx-dashboard-filter">
            <FilterBar />
          </div>

          <div className="dx-grid-3 dx-dashboard-metrics">
            <InvoiceOverviewCard loading={isLoading} counts={counts} userType={userType} />
            <SpendingCard loading={isLoading} byVendor={d?.byVendor || []} userType={userType} />
            <Bottlenecks loading={isLoading} rows={d?.bottlenecks || []} userType={userType} />
          </div>

          <div className="dx-dashboard-recent">
            <RecentInvoices loading={isLoading} rows={d?.recent || []} userType={userType} />
          </div>
        </div>
      </div>
    </LeftPageContainer>
  )
}

function ActionItems({ userType }) {
  const navigate = useNavigate()
  const { data: apiItems = [], isLoading } = useEssaInvoices({ overall: 'review' })
  const items = mergeActionItemRows(apiItems)
  const top5 = items.slice(0, 5)

  const title = 'Your action items'
  const cta = {
    label: 'Open Exception Workbench',
    href: `/${userType}${EXCEPTION_WORKBENCH}`
  }

  return (
    <Card className="dx-dashboard-action-card" pad={false}>
      <CardHeader>
        <AlertOctagon size={18} style={{ color: 'var(--dx-warn-600)' }} />
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-muted" style={{ marginLeft: 4 }}>
          {!isLoading && `· ${items.length} total`}
        </span>
        <Link
          to={cta.href}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: BRAND,
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          {cta.label} →
        </Link>
      </CardHeader>
      <div className="dx-table-wrap dx-dashboard-action-table-wrap">
        <table className="dx-table dx-table-compact dx-dash-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Invoice Type</th>
              <th>Invoice date</th>
              <th>Vendor</th>
              <th>PO number</th>
              <th className="dx-col-amount">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <Skeleton style={{ height: 12, margin: '6px 0' }} />
                  </td>
                </tr>
              ))
            ) : top5.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="check-circle"
                    title="You're caught up"
                    description="No invoices need your input right now."
                  />
                </td>
              </tr>
            ) : (
              top5.map((r) => (
                <tr
                  key={r.id}
                  onClick={() =>
                    navigate(
                      `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(r.id))}`
                    )
                  }
                >
                  <td className="dx-dash-cell-nowrap">{r.invoice_no || '—'}</td>
                  <td className="dx-dash-cell-nowrap">{resolveInvoiceType(r)}</td>
                  <td className="dx-dash-cell-nowrap">
                    {fmtDateOnly(r.invoice_date) || '—'}
                  </td>
                  <td>
                    <div className="dx-dash-vendor" title={r.vendor_name || ''}>
                      {r.vendor_name || '—'}
                    </div>
                  </td>
                  <td className="dx-dash-cell-nowrap">
                    {r.po_number || NON_PO_LABEL}
                  </td>
                  <td className="dx-col-amount dx-dash-cell-nowrap">
                    {fmtMoney(r.total_amount, r.currency)}
                  </td>
                  <td>
                    <WorkflowStageBadge inv={r} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function formatWorkTileLabel(label) {
  return String(label || '').replace(/\s*·\s*30d\b/i, ' (last 30 days)')
}

function MyWork({ myWork, loading, userType }) {
  return (
    <div className="dx-dashboard-hero">
      <header className="dx-dashboard-header">
        <h1 className="dx-dashboard-title">Invoice Processing Monitor</h1>
      </header>
      {loading || !myWork ? (
        <div className="dx-grid-work-tiles">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ height: 72, borderRadius: 18 }} />
          ))}
        </div>
      ) : (
        <div className="dx-grid-work-tiles">
          {(myWork.tiles || []).map((t, i) => (
            <MyWorkTile key={t.key} tile={t} index={i} userType={userType} />
          ))}
        </div>
      )}
    </div>
  )
}

function MyWorkTile({ tile, index, userType }) {
  const tones = {
    warn: { fg: 'var(--dx-warn-700)', bg: 'var(--dx-warn-50)', icon: AlertOctagon },
    danger: { fg: 'var(--dx-error-700)', bg: 'var(--dx-error-50)', icon: ShieldAlert },
    info: { fg: BRAND_DARK, bg: BRAND_LIGHT, icon: WorkflowIcon },
    success: { fg: 'var(--dx-success-700)', bg: 'var(--dx-success-50)', icon: CheckIcon }
  }
  const tone = tones[tile.tone] || tones.info
  const Icon = tone.icon
  const href = invoicesPath(userType, tile.filter)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link to={href} style={{ textDecoration: 'none' }}>
        <div className="dx-card dx-work-tile">
          <div className="dx-work-tile-header">
            <span className="dx-work-tile-label">{formatWorkTileLabel(tile.label)}</span>
            <div
              className="dx-work-tile-icon"
              style={{ background: tone.bg, color: tone.fg }}
            >
              <Icon size={12} />
            </div>
          </div>
          <div className="dx-work-tile-footer">
            <div className="dx-work-tile-value">{tile.value}</div>
            <span className="dx-work-tile-link">
              View <ArrowRight size={11} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function FilterBar() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <PillButton icon={Filter} label="Filter" />
        <PillButton icon={Calendar} label="Last 30 days" />
        <PillButton icon={Download} label="Export" />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 999,
          background: 'var(--dx-card)',
          border: '1px solid var(--dx-border)',
          minWidth: 280
        }}
      >
        <Search size={14} style={{ color: 'var(--dx-text-mute)' }} />
        <input
          placeholder="Search invoices, vendors, POs…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--dx-text)',
            fontFamily: 'inherit'
          }}
        />
      </div>
    </div>
  )
}

function PillButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'var(--dx-card)',
        border: '1px solid var(--dx-border)',
        color: 'var(--dx-text)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        font: 'inherit',
        fontFamily: 'inherit',
        transition: 'all .15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--dx-bg)'
        e.currentTarget.style.borderColor = 'var(--dx-primary-300)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--dx-card)'
        e.currentTarget.style.borderColor = 'var(--dx-border)'
      }}
    >
      <Icon size={13} style={{ color: 'var(--dx-text-soft)' }} />
      <span>{label}</span>
    </button>
  )
}

function InvoiceOverviewCard({ loading, counts, userType }) {
  if (loading) return <SkeletonCard />

  const total = counts.total || 0
  const segments = getInvoiceStateSegments(counts, userType)

  return (
    <div className="dx-card dx-stat-card dx-invoice-overview-card">
      <div className="dx-row-between" style={{ marginBottom: 4 }}>
        <div
          className="text-xs text-muted"
          style={{ letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}
        >
          Total invoices
        </div>
        <TrendingUp size={16} style={{ color: 'var(--dx-text-mute)' }} />
      </div>
      <div
        className="dx-invoice-overview-total"
        style={{
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: '-1px',
          color: 'var(--dx-text)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {total}
      </div>
      <div className="dx-invoice-overview-sub" style={{ fontSize: 12, color: 'var(--dx-text-soft)' }}>
        across <strong style={{ color: 'var(--dx-text)' }}>{segments.length}</strong> states
      </div>
      <div
        className="dx-invoice-overview-bar"
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--dx-g-100)'
        }}
      >
        {segments.map((s, i) => {
          const pct = total ? (s.value / total) * 100 : 0
          return pct > 0 ? (
            <div
              key={i}
              style={{ background: s.color, width: `${pct}%`, transition: 'width 0.4s ease' }}
              title={`${s.label}: ${s.value}`}
            />
          ) : null
        })}
      </div>
      <div className="dx-invoice-overview-segments">
        {segments.map((s) => (
          <Link key={s.label} to={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="dx-row-between dx-invoice-overview-segment">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--dx-text-soft)'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                {s.label}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--dx-text)',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {s.value}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SpendingCard({ loading, byVendor, userType }) {
  const navigate = useNavigate()
  if (loading) return <SkeletonCard />

  const data = (byVendor || []).slice(0, 5).map((v) => ({
    name: (v.vendor_name || '').replace(/^PT\s+/, '').slice(0, 12),
    full: v.vendor_name,
    vendor_code: v.vendor_code,
    amount: v.amount || 0
  }))
  const total = data.reduce((s, d) => s + d.amount, 0)

  const onBarClick = (entry) => {
    if (entry?.payload?.vendor_code) {
      navigate(invoicesPath(userType, `vendor=${encodeURIComponent(entry.payload.vendor_code)}`))
    }
  }

  return (
    <div className="dx-card dx-stat-card dx-spending-card">
      <div
        className="text-xs text-muted"
        style={{ letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}
      >
        Vendor spend
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--dx-text)',
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {fmtMoney(total, 'IDR')}
      </div>
      <div className="text-sm text-muted" style={{ marginTop: 2 }}>
        top 5 vendors
      </div>
      <div className="dx-spending-chart">
        {data.length === 0 ? (
          <div className="dx-spending-empty">No vendor data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dx-border-soft)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--dx-text-mute)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid var(--dx-border)',
                  fontSize: 12,
                  padding: '8px 10px'
                }}
                formatter={(v) => fmtMoney(v, 'IDR')}
                labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
                cursor={{ fill: BRAND_LIGHT_FILL }}
              />
              <Bar
                dataKey="amount"
                fill={BRAND}
                radius={[8, 8, 0, 0]}
                cursor="pointer"
                onClick={onBarClick}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function RecentInvoices({ loading, rows, userType }) {
  const navigate = useNavigate()
  const listPath = `/${userType}${INVOICES}`
  const recentRows = rows.slice(0, 5)

  return (
    <Card className="dx-dashboard-recent-card" pad={false}>
      <CardHeader>
        <CardTitle>Recent 5 Invoices</CardTitle>
        <Link
          to={listPath}
          style={{ marginLeft: 'auto', fontSize: 12, color: BRAND, fontWeight: 500 }}
        >
          View all →
        </Link>
      </CardHeader>
      <div className="dx-table-wrap dx-dashboard-recent-table-wrap">
        <table className="dx-table dx-table-compact dx-dash-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Invoice Type</th>
              <th>Vendor</th>
              <th>PO number</th>
              <th className="dx-col-amount">Amount</th>
              <th>Status</th>
              <th>Uploaded on</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <Skeleton style={{ height: 12, width: '100%', margin: '6px 0' }} />
                  </td>
                </tr>
              ))
            ) : recentRows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="inbox"
                    title="No invoices yet"
                    description="Drag a PDF onto the upload page to get started."
                  />
                </td>
              </tr>
            ) : (
              recentRows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() =>
                    navigate(
                      `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(r.id))}`
                    )
                  }
                >
                  <td className="dx-dash-cell-nowrap">{r.invoice_no || '—'}</td>
                  <td className="dx-dash-cell-nowrap">{resolveInvoiceType(r)}</td>
                  <td>
                    <div className="dx-dash-vendor dx-dash-vendor--wide" title={r.vendor_name || ''}>
                      {r.vendor_name || '—'}
                    </div>
                  </td>
                  <td className="dx-dash-cell-nowrap">
                    {r.po_number || NON_PO_LABEL}
                  </td>
                  <td className="dx-col-amount dx-dash-cell-nowrap">
                    {fmtMoney(r.total_amount, r.currency)}
                  </td>
                  <td>
                    <WorkflowStageBadge inv={r} />
                  </td>
                  <td className="dx-dash-cell-nowrap">{fmtDate(r.uploaded_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Bottlenecks({ loading, rows, userType }) {
  return (
    <Card className="dx-dashboard-bottlenecks-card" pad={false}>
      <CardHeader className="dx-card-head" style={{ flexShrink: 0 }}>
        <Clock size={18} style={{ color: 'var(--dx-warn-600)' }} />
        <CardTitle>
          Pending Approvals
          <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 6 }}>
            (Non-PO Invoices)
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody
        className={
          !loading && rows.length === 0
            ? 'dx-card-body dx-dashboard-bottlenecks-empty'
            : 'dx-card-body'
        }
        style={{
          padding: 12,
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          ...((!loading && rows.length === 0)
            ? { alignItems: 'center', justifyContent: 'center' }
            : { flexDirection: 'column', overflow: 'auto' })
        }}
      >
        {loading && <ActivitySkel />}
        {!loading && rows.length === 0 && (
          <EmptyState
            icon="check-circle"
            title="All caught up"
            description="Nothing waiting on a specific approver."
          />
        )}
        {!loading &&
          rows.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={invoicesPath(userType, 'filter=parked')}
                title={`Show all invoices pending at ${(b.role || '').toUpperCase()}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className={`dx-row-between dx-bottleneck-row${i > 0 ? ' dx-bottleneck-row--bordered' : ''}`}>
                  <div className="dx-row">
                    <div className="dx-bottleneck-avatar">
                      {initials(b.approver_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dx-text)' }}>
                        {b.approver_name || '— unassigned —'}
                      </div>
                      <div className="text-xs text-muted">{(b.role || '').toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="dx-row" style={{ gap: 4 }}>
                    <Badge tone="warn">{b.waiting} pending</Badge>
                    <ArrowRight size={12} style={{ color: 'var(--dx-text-mute)' }} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
      </CardBody>
    </Card>
  )
}

function ActivitySkel() {
  return (
    <div className="dx-stack-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="dx-row">
          <Skeleton style={{ width: 30, height: 30, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ height: 12, width: '33%', marginBottom: 6 }} />
            <Skeleton style={{ height: 12, width: '66%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function initials(name = '') {
  return (
    name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('') || '?'
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaDashboard)
