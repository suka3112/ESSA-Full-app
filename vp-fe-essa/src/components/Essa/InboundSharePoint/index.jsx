import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, RefreshCw, Search, AlertTriangle, Loader2 } from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { fetchInboundSharePoint, pollSharePointIntake } from 'api/apInvoiceOcr'
import { INVOICE_DETAIL } from 'constants/url'
import { fmtDate } from 'api/essaDashboard'
import '../../../assets/scss/essa/dashboard.scss'

const STATUS_TONES = {
  PROCESSED: 'success',
  QUEUED: 'neutral',
  PENDING: 'info',
  NO_DOCUMENT: 'danger',
  FAILED: 'danger',
  IGNORED: 'neutral',
  INVALID_NAME: 'danger'
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'QUEUED', label: 'Queued' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'INVALID_NAME', label: 'Invalid name' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'PROCESSED', label: 'Processed' },
  { key: 'IGNORED', label: 'Ignored' }
]

const STATUS_LEGEND = [
  { key: 'QUEUED', label: 'Queued', tone: 'neutral', description: 'Waiting — OCR not started' },
  { key: 'PENDING', label: 'Pending', tone: 'info', description: 'OCR / save in progress (shows age)' },
  { key: 'PROCESSED', label: 'Processed', tone: 'success', description: 'Saved after OCR' },
  { key: 'FAILED', label: 'Failed', tone: 'danger', description: 'OCR error or stalled (>15m) — poll to retry' },
  { key: 'INVALID_NAME', label: 'Invalid name', tone: 'danger', description: 'Bad [EAPA] file name' }
]

const PIPELINE_TYPE_LABELS = {
  MANPOWER_SERVICES: 'Manpower services',
  CAMP_SERVICE_AND_CATERING: 'Camp / catering',
  CIVIL_CONTRACTOR: 'Civil contractor',
  MATERIAL_IMPORT: 'Material import',
  NON_PO: 'Non-PO',
  AUTO: 'Auto (OCR classifies)',
  TRAVEL_INVOICE: 'Travel'
}

function formatStatusAge(ageMs) {
  if (ageMs == null || !Number.isFinite(ageMs) || ageMs < 0) return null
  const sec = Math.floor(ageMs / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

function computeStatusAgeMs(row) {
  if (typeof row.statusAgeMs === 'number' && Number.isFinite(row.statusAgeMs)) {
    return row.statusAgeMs
  }
  const stamp = row.updatedAt || row.createdAt || row.lastModifiedAt
  if (!stamp) return null
  const t = new Date(stamp).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Date.now() - t)
}

function isRowStale(row, displayStatus) {
  if (row.stale) return true
  const status = String(displayStatus || row.status || '').toUpperCase()
  if (status !== 'PENDING') return false
  const age = computeStatusAgeMs(row)
  return age != null && age >= 15 * 60 * 1000
}

function statusTone(status) {
  return STATUS_TONES[String(status || '').toUpperCase()] || 'neutral'
}

function formatStatus(status) {
  return String(status || '—')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCategory(row) {
  const parse = row?.subjectParse
  if (!parse?.category) return null
  const type = String(parse.type || '').toUpperCase()
  const category = String(parse.category).replace(/_/g, ' ')
  if (type === 'NON_PO') return `NONPO · ${category}`
  return category
}

function formatPipelineType(row) {
  const id = String(row?.subjectParse?.invoiceTypeId || row?.subjectParse?.invoiceWorkflow || '')
    .trim()
    .toUpperCase()
  if (!id) return null
  return PIPELINE_TYPE_LABELS[id] || id.replace(/_/g, ' ')
}

function formatErrorMessage(raw, status) {
  const text = String(raw || '').trim()
  if (!text) {
    const key = String(status || '').toUpperCase()
    if (key === 'INVALID_NAME') return 'File name does not match [EAPA] format.'
    if (key === 'FAILED') return 'Processing failed. Retry poll or check OCR service.'
    return null
  }

  const lower = text.toLowerCase()
  if (lower.includes('empty_subject') || lower.startsWith('subject is empty')) {
    return 'File name is empty. Use [EAPA][…] Vendor - Invoice.pdf.'
  }
  if (lower.includes('malformed_po_subject') || lower.includes('po subject format invalid')) {
    return 'PO file name invalid. Expected [EAPA][CATEGORY][PO:…] Vendor - Invoice.pdf.'
  }
  if (lower.includes('malformed_non_po_subject') || lower.includes('non-po subject format invalid')) {
    return 'Non-PO file name invalid. Expected [EAPA][NONPO][CATEGORY] Vendor - Invoice.pdf.'
  }
  if (lower.includes('no_recognized_prefix') || lower.includes('must start with [eapa]')) {
    return 'File name must start with [EAPA].'
  }
  const cleaned = text
    .replace(/^invalid_name:\s*/i, '')
    .replace(/^invalid_subject:\s*/i, '')
    .replace(/^[a-z0-9_]+\s*[—–-]\s*/i, '')
    .trim()
  return cleaned || text
}

function formatRowError(row, displayStatus) {
  const status = displayStatus || row.status
  const raw = String(row.errorMessage || '')
  if (isRowStale(row, status)) {
    return 'Stalled — processing was interrupted. Poll SharePoint to retry.'
  }
  if (/stuck in Pending/i.test(raw)) {
    return 'Previous run was interrupted before OCR finished. Poll SharePoint to retry.'
  }
  return formatErrorMessage(row.errorMessage, status)
}

function countByStatus(rows) {
  const counts = {
    ALL: rows.length,
    QUEUED: 0,
    FAILED: 0,
    PROCESSED: 0,
    PENDING: 0,
    IGNORED: 0,
    INVALID_NAME: 0,
    NO_DOCUMENT: 0
  }
  for (const row of rows) {
    const key = String(row.status || '').toUpperCase()
    if (key in counts) counts[key] += 1
  }
  return counts
}

function EssaInboundSharePoint({ userInfo: { userType } }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [pollNote, setPollNote] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const data = await fetchInboundSharePoint()
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load inbound SharePoint files')
      if (!silent) setRows([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const hasInFlight = useMemo(
    () =>
      rows.some((row) => {
        const s = String(row.status || '').toUpperCase()
        return s === 'QUEUED' || s === 'PENDING'
      }),
    [rows]
  )

  useEffect(() => {
    if (!hasInFlight || loading || polling) return undefined
    const id = setInterval(() => {
      load({ silent: true })
    }, 20000)
    return () => clearInterval(id)
  }, [hasInFlight, loading, polling, load])

  const counts = useMemo(() => countByStatus(rows), [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((row) => {
      const displayStatus = String(row.status || '').toUpperCase()
      if (statusFilter !== 'ALL' && displayStatus !== statusFilter) {
        return false
      }
      if (!needle) return true
      const hay = [
        row.fileName,
        row.folderPath,
        row.status,
        row.errorMessage,
        formatCategory(row),
        formatPipelineType(row),
        row.subjectParse?.category,
        row.subjectParse?.invoiceTypeId
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, statusFilter, q])

  const handlePoll = async () => {
    if (polling) return
    setPolling(true)
    setError('')
    setPollNote(
      'Scanning SharePoint folder… matching [EAPA] PDFs are queued, then OCR runs one by one.'
    )
    try {
      const result = await pollSharePointIntake()
      const scanned = result?.scanned
      const enqueued = result?.enqueued
      const idle = Boolean(result?.idle)
      const newQueued = result?.newQueued
      const retryQueued = result?.retryQueued
      const ocrRan = result?.ocrRan
      const summaryParts = []
      if (idle) {
        summaryParts.push('no new invoices — OCR did not run')
      }
      if (typeof scanned === 'number') summaryParts.push(`scanned ${scanned}`)
      if (typeof newQueued === 'number' && newQueued > 0) {
        summaryParts.push(`${newQueued} new`)
      }
      if (typeof retryQueued === 'number' && retryQueued > 0) {
        summaryParts.push(`${retryQueued} retried (not new)`)
      }
      if (typeof ocrRan === 'number' && !idle) {
        summaryParts.push(`OCR ran on ${ocrRan}`)
      }
      if (typeof enqueued === 'number' && newQueued == null) {
        summaryParts.push(`queued/processed ${enqueued}`)
      }
      setPollNote(
        summaryParts.length
          ? `Poll finished (${summaryParts.join(', ')}). Refreshing list…`
          : 'Poll finished. Refreshing list…'
      )
      await load({ silent: true })
      setPollNote(
        summaryParts.length
          ? `Poll completed (${summaryParts.join(', ')}).`
          : 'Poll completed.'
      )
    } catch (err) {
      setPollNote('')
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'SharePoint poll failed (check SHAREPOINT_INTAKE_ENABLED and Graph / site env)'
      )
    } finally {
      setPolling(false)
      setTimeout(() => {
        setPollNote((prev) => (prev.startsWith('Poll completed') ? '' : prev))
      }, 6000)
    }
  }

  const invoicePath = (documentId) =>
    `/${userType}${INVOICE_DETAIL.replace(':id', `ocr-${documentId}`)}`

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page dx-stack">
          <header className="dx-topbar">
            <div className="dx-topbar-left">
              <div>
                <div className="dx-topbar-title">Inbound SharePoint</div>
                <div className="dx-topbar-sub">
                  Only [EAPA] PO / Non-PO PDF file names are processed. Files are left in the
                  folder after intake.
                </div>
              </div>
            </div>
            <div className="dx-topbar-right" style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => load()}
                disabled={loading || polling}
              >
                <RefreshCw size={14} className={loading && !polling ? 'dx-spin' : undefined} />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePoll}
                disabled={polling || loading}
                aria-busy={polling}
                title={
                  polling
                    ? 'Polling and OCR in progress — please wait'
                    : 'Scan the SharePoint folder and process matching invoices'
                }
                style={
                  polling
                    ? { opacity: 0.75, cursor: 'wait', minWidth: 148 }
                    : { minWidth: 148 }
                }
              >
                {polling ? (
                  <Loader2 size={14} className="dx-spin" aria-hidden />
                ) : (
                  <FolderOpen size={14} aria-hidden />
                )}
                {polling ? 'Polling…' : 'Poll folder'}
              </Button>
            </div>
          </header>

          {polling || pollNote ? (
            <div
              role="status"
              className="dx-row"
              style={{
                gap: 10,
                padding: '12px 16px',
                borderRadius: 'var(--dx-radius, 12px)',
                background: polling
                  ? 'var(--dx-primary-50, #E7F6EB)'
                  : 'var(--dx-g-50, #f8fafc)',
                border: '1px solid var(--dx-border)',
                color: 'var(--dx-text)',
                fontSize: 13,
                alignItems: 'center'
              }}
            >
              {polling ? <Loader2 size={16} className="dx-spin" style={{ flexShrink: 0 }} /> : null}
              <span style={{ flex: 1, minWidth: 0 }}>
                {pollNote ||
                  'Polling SharePoint… OCR runs one invoice at a time and can take several minutes.'}
              </span>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="dx-row"
              style={{
                gap: 10,
                padding: '12px 16px',
                borderRadius: 'var(--dx-radius, 12px)',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: 'var(--dx-danger-700, #b91c1c)',
                fontSize: 13
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError('')}>
                Dismiss
              </Button>
            </div>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12
            }}
          >
            {[
              { key: 'ALL', label: 'Total', tone: 'neutral' },
              { key: 'QUEUED', label: 'Queued', tone: 'neutral' },
              { key: 'PENDING', label: 'Pending', tone: 'info' },
              { key: 'FAILED', label: 'Failed', tone: 'danger' },
              { key: 'PROCESSED', label: 'Processed', tone: 'success' }
            ].map((stat) => (
              <button
                key={stat.key}
                type="button"
                onClick={() => setStatusFilter(stat.key)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border:
                    statusFilter === stat.key
                      ? '1px solid var(--dx-primary-400, #4ade80)'
                      : '1px solid var(--dx-border)',
                  background:
                    statusFilter === stat.key
                      ? 'var(--dx-primary-50, #E7F6EB)'
                      : 'var(--dx-card, #fff)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: statusFilter === stat.key ? 'var(--dx-shadow-xs)' : 'none'
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: 'var(--dx-text-mute)',
                    marginBottom: 6
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--dx-text)',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {loading ? '—' : counts[stat.key] ?? 0}
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 4px',
              fontSize: 12,
              color: 'var(--dx-text-mute)',
              lineHeight: 1.4
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--dx-text)', marginRight: 4 }}>
              Status
            </span>
            {STATUS_LEGEND.map((item, index) => (
              <span
                key={item.key}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {index > 0 ? (
                  <span aria-hidden="true" style={{ opacity: 0.35, margin: '0 2px' }}>
                    ·
                  </span>
                ) : null}
                <Badge tone={item.tone} dot={false}>
                  {item.label}
                </Badge>
                <span>{item.description}</span>
              </span>
            ))}
          </div>

          <Card>
            <CardHeader style={{ flexWrap: 'wrap', gap: 12 }}>
              <FolderOpen size={18} style={{ color: 'var(--dx-primary-600)' }} />
              <CardTitle>SharePoint intake log · {filtered.length}</CardTitle>

              <div
                className="dx-row"
                style={{
                  marginLeft: 'auto',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    padding: 4,
                    borderRadius: 999,
                    background: 'var(--dx-g-100)',
                    border: '1px solid var(--dx-border)'
                  }}
                >
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: 'none',
                        cursor: 'pointer',
                        font: 'inherit',
                        fontSize: 12,
                        fontWeight: 500,
                        background: statusFilter === f.key ? 'var(--dx-card)' : 'transparent',
                        color:
                          statusFilter === f.key ? 'var(--dx-text)' : 'var(--dx-text-mute)',
                        boxShadow: statusFilter === f.key ? 'var(--dx-shadow-xs)' : 'none',
                        transition: 'all .15s ease'
                      }}
                    >
                      {f.label}
                      {!loading && f.key !== 'ALL' && counts[f.key] > 0
                        ? ` (${counts[f.key]})`
                        : ''}
                    </button>
                  ))}
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
                    width: 280,
                    maxWidth: '100%'
                  }}
                >
                  <Search size={14} style={{ color: 'var(--dx-text-mute)', flexShrink: 0 }} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search file name, category…"
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: 13,
                      color: 'var(--dx-text)',
                      fontFamily: 'inherit',
                      minWidth: 0
                    }}
                  />
                </div>
              </div>
            </CardHeader>

            <div
              className="dx-table-wrap dx-table-wrap-scroll"
              style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 320 }}
            >
              <table className="dx-table dx-table-compact">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Modified</th>
                    <th style={{ minWidth: 120 }}>Category</th>
                    <th style={{ minWidth: 140 }}>Pipeline type</th>
                    <th style={{ minWidth: 220 }}>File name</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ minWidth: 140 }}>Document</th>
                    <th style={{ minWidth: 220 }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7}>
                          <Skeleton style={{ height: 14, margin: '8px 0' }} />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon="inbox"
                          title="No inbound SharePoint files"
                          description={
                            statusFilter === 'ALL' && !q.trim()
                              ? 'Poll the folder or simulate intake to populate this list.'
                              : 'No rows match the current filter or search.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const category = formatCategory(row)
                      const pipeline = formatPipelineType(row)
                      const displayStatus = String(row.status || '').toUpperCase()
                      const stale = isRowStale(row, displayStatus)
                      const ageLabel = formatStatusAge(computeStatusAgeMs(row))
                      const errorText = formatRowError(row, displayStatus)
                      const statusLabel =
                        (displayStatus === 'PENDING' || displayStatus === 'QUEUED') && ageLabel
                          ? `${formatStatus(stale ? 'STALLED' : displayStatus)} · ${ageLabel}`
                          : formatStatus(displayStatus)
                      return (
                        <tr key={row.inboundSharePointId}>
                          <td className="dx-table-muted" style={{ whiteSpace: 'nowrap' }}>
                            {fmtDate(row.lastModifiedAt || row.createdAt)}
                          </td>
                          <td>
                            {category ? (
                              <Badge tone="neutral" dot={false}>
                                {category}
                              </Badge>
                            ) : (
                              <span className="dx-table-muted">—</span>
                            )}
                          </td>
                          <td>
                            {pipeline ? (
                              <span style={{ fontSize: 12, fontWeight: 500 }}>{pipeline}</span>
                            ) : (
                              <span className="dx-table-muted">—</span>
                            )}
                          </td>
                          <td>
                            <div
                              title={row.fileName || ''}
                              style={{
                                maxWidth: 280,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {row.fileName || '—'}
                            </div>
                            {row.folderPath ? (
                              <div className="dx-table-muted" style={{ fontSize: 11 }}>
                                {row.folderPath}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <Badge
                                tone={stale ? 'danger' : statusTone(displayStatus)}
                                dot={false}
                              >
                                {statusLabel}
                              </Badge>
                              {row.updatedAt ? (
                                <span
                                  className="dx-table-muted"
                                  style={{ fontSize: 11 }}
                                  title="Last status update"
                                >
                                  Updated {fmtDate(row.updatedAt)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            {row.documentId ? (
                              <Link
                                to={invoicePath(row.documentId)}
                                className="dx-po-link"
                                title={`Document ${row.documentId}`}
                              >
                                Doc {row.documentId}
                              </Link>
                            ) : (
                              <span className="dx-table-muted">—</span>
                            )}
                          </td>
                          <td>
                            {errorText ? (
                              <div
                                title={row.errorMessage || errorText}
                                style={{
                                  maxWidth: 280,
                                  fontSize: 12,
                                  lineHeight: 1.45,
                                  color: 'var(--dx-danger-700, #b91c1c)',
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {errorText}
                              </div>
                            ) : (
                              <span className="dx-table-muted">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaInboundSharePoint)
