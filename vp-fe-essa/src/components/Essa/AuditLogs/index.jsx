import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  ListFilter,
  RotateCcw,
  Search,
  ShieldCheck
} from 'lucide-react'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Button } from '../ui/Button'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { INVOICE_DETAIL } from 'constants/url'
import { fmtDate } from 'api/essaDashboard'
import { fetchEssaAuditLogs } from 'api/essaAudit'
import '../../../assets/scss/essa/dashboard.scss'

const auditLogsCss = `
.audit-logs-table .dx-table-wrap-scroll .dx-table thead th {
  background: var(--brand-primary-color, var(--dx-primary-600));
  z-index: 2;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}
.audit-expand-panel {
  background: var(--dx-card-muted, #f8fafc);
  border-top: 1px solid var(--dx-border);
}
.audit-expand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 900px) {
  .audit-expand-grid { grid-template-columns: 1fr; }
}
.audit-pair {
  display: flex;
  gap: 10px;
  padding: 2px 0;
  font-size: 12px;
}
.audit-pair dt {
  width: 120px;
  flex-shrink: 0;
  color: var(--dx-text-mute);
}
.audit-pair dd {
  margin: 0;
  font-weight: 600;
  word-break: break-word;
}
`

const FILTER_KEYS = ['search', 'objectType', 'action', 'source', 'result', 'dateFrom', 'dateTo']
const EMPTY_DRAFT = {
  search: '',
  objectType: '',
  action: '',
  source: '',
  result: '',
  dateFrom: '',
  dateTo: ''
}

const RESULT_TONE = {
  SUCCESS: 'pass',
  PASS: 'pass',
  FAIL: 'fail',
  DENIED: 'fail',
  OVERRIDDEN: 'warn',
  REJECTED: 'warn'
}

const RESULT_PHRASE = {
  SUCCESS: 'the action was successful',
  PASS: 'every check passed',
  FAIL: 'the check did not pass',
  OVERRIDDEN: 'the result was overridden',
  REJECTED: 'the decision was recorded',
  DENIED: 'the action was refused'
}

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

function fieldLabel(key) {
  if (!key) return 'Value'
  if (/\s/.test(key)) return key
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

function fmtValue(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return v.toLocaleString('en-US')
  if (Array.isArray(v)) return v.length ? v.map(fmtValue).join(', ') : '—'
  if (isPlainObject(v)) {
    return Object.entries(v)
      .map(([k, val]) => `${fieldLabel(k)}: ${fmtValue(val)}`)
      .join(' · ')
  }
  return String(v)
}

function changesOf(row) {
  const { field_code, old_value, new_value } = row
  if (old_value == null && new_value == null) return []
  if (field_code) {
    return [
      {
        field: fieldLabel(field_code),
        before: fmtValue(old_value),
        after: fmtValue(new_value)
      }
    ]
  }
  const wrap = (v) => (isPlainObject(v) ? v : v == null ? {} : { Value: v })
  const before = wrap(old_value)
  const after = wrap(new_value)
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .map((k) => ({ field: fieldLabel(k), before: fmtValue(before[k]), after: fmtValue(after[k]) }))
    .filter((c) => c.before !== c.after)
}

function leftPairs(row) {
  const changes = changesOf(row)
  const pairs = []
  if (changes.length === 1) {
    pairs.push(
      { label: 'Field', value: changes[0].field },
      { label: 'Before', value: changes[0].before },
      { label: 'After', value: changes[0].after }
    )
  } else if (changes.length > 1) {
    changes.forEach((c) => pairs.push({ label: c.field, value: `${c.before}  →  ${c.after}` }))
  }
  return pairs
}

function fmtExactTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || '—'
  const date = d
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-')
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return `${date} ${time}`
}

function summaryOf(row) {
  const who = row.actor_type === 'USER' || !row.actor_type ? row.actor_name : `the ${row.actor_name}`
  const sourceName = String(row.source || 'PORTAL')
  const where =
    sourceName === 'SYSTEM'
      ? 'automatically through the system'
      : `through the ${sourceName.charAt(0) + sourceName.slice(1).toLowerCase()}`
  const outcome = RESULT_PHRASE[row.result] || 'the action was recorded'
  const ref = row.object_id
  const changes = changesOf(row)
  const code = row.outcome_code ? ` (${row.outcome_code})` : ''

  if (row.action === 'CORRECT' && changes.length === 1) {
    const c = changes[0]
    return `This record shows that ${who} corrected the ${c.field} for invoice ${ref} from ${c.before} to ${c.after} ${where}, and the change was successful.`
  }
  if (row.action === 'MANUAL_ENTER' && changes.length === 1) {
    const c = changes[0]
    return `This record shows that ${who} manually entered the ${c.field} for invoice ${ref} as ${c.after} ${where}.`
  }
  if (row.action === 'VERIFY' && changes.length === 1) {
    const c = changes[0]
    return `This record shows that ${who} verified the ${c.field} for invoice ${ref} (${c.after}) without changing it ${where}.`
  }
  if (row.action === 'LOGIN' && row.result === 'SUCCESS') {
    return `This record shows that ${who} signed in ${where}, and the action was successful.`
  }
  if (row.action === 'LOGIN' && row.result === 'FAIL') {
    return `This record shows that ${who} tried to sign in ${where}, and the attempt failed${row.reason_remarks ? ` (${row.reason_remarks})` : ''}.`
  }
  if (row.action === 'LOGOUT') {
    return `This record shows that ${who} signed out ${where}.`
  }
  if (row.action === 'AUTHORIZE' && row.result === 'DENIED') {
    return `This record shows that ${who} was refused access ${where}${row.reason_remarks ? ` — ${row.reason_remarks}` : ''}.`
  }
  if ((row.action === 'EXTRACT' || row.action === 'EXTRACT_FAILED') && row.result === 'FAIL') {
    return `This record shows that intake failed to extract invoice ${ref} ${where}${row.reason_remarks ? ` — ${row.reason_remarks}` : ''}.`
  }
  if (row.action === 'RECEIVE') {
    return `This record shows that invoice package ${ref} was received ${where}.`
  }
  if (row.action === 'REGISTER') {
    return `This record shows that invoice ${ref} was registered as a Draft ${where}.`
  }
  if (row.action === 'CLASSIFY') {
    return `This record shows that invoice ${ref} was classified${row.new_value ? ` as ${row.new_value}` : ''} ${where}.`
  }
  if (row.action === 'SUPERSEDE') {
    return `This record shows that the system superseded a prior Draft for invoice ${ref}${row.reason_remarks ? ` — ${row.reason_remarks}` : ''}.`
  }
  if (row.action === 'DUPLICATE_DETECTED' || row.action === 'REJECT_INTAKE') {
    return `This record shows that intake rejected package ${ref}${code}${row.reason_remarks ? ` — ${row.reason_remarks}` : ''}.`
  }
  if (row.action === 'DOC_REQUEST_ISSUED') {
    return `This record shows that a vendor document request was issued for invoice ${ref}${code}${row.reason_remarks ? ` — ${row.reason_remarks}` : ''}.`
  }
  if (row.action === 'DOC_RECEIVED' || row.action === 'DOC_ASSOCIATED' || row.action === 'DOC_REPLACED') {
    return `This record shows that ${who} recorded ${String(row.action).toLowerCase().replace(/_/g, ' ')} for invoice ${ref}${code}.`
  }
  if (row.action === 'DOC_REQUEST_ESCALATED') {
    return `This record shows that ${who} escalated the vendor document chase for invoice ${ref}${code}.`
  }
  if (row.action === 'HITL_ASSIGN') {
    return `This record shows that low-confidence fields on invoice ${ref} were assigned for HITL review.`
  }
  if (row.action === 'VALIDATE_RUN') {
    return `This record shows that validation ran for invoice ${ref} ${where}, and ${outcome}.`
  }
  if (row.action === 'RULE_FAIL' || row.action === 'RULE_WARN' || row.action === 'RULE_HARD_FAIL') {
    const rule = row.field_code || row.outcome_code || 'rule'
    return `This record shows that rule ${rule}${code} ${
      row.action === 'RULE_WARN' ? 'warned' : 'failed'
    } on invoice ${ref}${row.reason_remarks ? ` — ${row.reason_remarks}` : ''}.`
  }
  const verb = String(row.action || 'UPDATE').toLowerCase().replace(/_/g, ' ')
  return `This record shows that ${who} performed ${verb} on ${String(row.object_type || 'object').toLowerCase()} ${ref} ${where}, and ${outcome}.`
}

function FilterField({ label, children, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...style }}>
      <span className="text-xs" style={{ fontWeight: 600, color: 'var(--dx-text-mute)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Pair({ label, value }) {
  return (
    <div className="audit-pair">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function EssaAuditLogs({ userInfo: { userType } }) {
  const { t } = useTranslation('sidebar')
  const canView = userType === ADMIN_USER_TYPE

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [applied, setApplied] = useState(EMPTY_DRAFT)
  const [page, setPage] = useState(1)
  const [sortDir, setSortDir] = useState('desc')
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    facets: { objectTypes: [], actions: [], sources: [], results: [], users: [] }
  })

  const setDraftValue = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchEssaAuditLogs({
        ...applied,
        page,
        pageSize: 25,
        sortBy: 'eventTime',
        sortDir
      })
      setData({
        items: result.items || [],
        total: result.total || 0,
        page: result.page || page,
        pageSize: result.pageSize || 25,
        totalPages: result.totalPages || 1,
        facets: result.facets || {}
      })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load audit logs')
      setData((prev) => ({ ...prev, items: [], total: 0 }))
    } finally {
      setLoading(false)
    }
  }, [applied, page, sortDir])

  useEffect(() => {
    if (canView) load()
  }, [canView, load])

  const apply = (e) => {
    e?.preventDefault?.()
    setPage(1)
    setApplied({ ...draft })
  }

  const reset = () => {
    setDraft(EMPTY_DRAFT)
    setApplied(EMPTY_DRAFT)
    setPage(1)
    setSortDir('desc')
    setExpanded(null)
  }

  const dirty = FILTER_KEYS.some((k) => draft[k] !== applied[k])
  const hasFilters = FILTER_KEYS.some((k) => applied[k]) || dirty

  const exportCsv = () => {
    const headers = [
      'Event ID',
      'When',
      'Object Type',
      'Object ID',
      'Action',
      'Field',
      'Old Value',
      'New Value',
      'Actor ID',
      'Actor',
      'Role',
      'Reason',
      'Source',
      'Correlation ID',
      'Result'
    ]
    const rows = (data.items || []).map((l) => [
      l.event_id,
      l.event_time,
      l.object_type,
      l.object_id,
      l.action,
      l.field_code || '',
      l.old_value || '',
      l.new_value || '',
      l.actor_id || '',
      l.actor_name || '',
      l.actor_role || '',
      l.reason_remarks || '',
      l.source || '',
      l.correlation_id || '',
      l.result || ''
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleSort = () => {
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    setPage(1)
  }

  const facets = data.facets || {}
  const invoiceHref = (objectId) =>
    `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(objectId))}`

  if (!canView) {
    return (
      <LeftPageContainer>
        <div className="essa-dashboard">
          <HeaderBar title="Audit Logs" slug={t('auditLogs')} showBackArrow={false} />
          <div className="dx-page">
            <div className="dx-empty-state">
              <ShieldCheck size={28} style={{ color: 'var(--dx-text-mute)' }} />
              <h3>Restricted</h3>
              <p>Audit logs are visible to Admin, Auditor, and Head-of-Finance roles only (AUDIT_VIEW).</p>
            </div>
          </div>
        </div>
      </LeftPageContainer>
    )
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page dx-stack">
          <style>{auditLogsCss}</style>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              Every transaction on the platform — who did what, when. Records cannot be edited or
              deleted.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportCsv}
              disabled={!data.items?.length}
            >
              <Download size={13} /> Export CSV
            </Button>
          </div>

          <form className="dx-card" style={{ padding: 14 }} onSubmit={apply}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
              <FilterField label="Search" style={{ flex: '1 1 200px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'var(--dx-card)',
                    border: '1px solid var(--dx-border)'
                  }}
                >
                  <Search size={12} style={{ color: 'var(--dx-text-mute)' }} />
                  <input
                    className="dx-input"
                    placeholder="Keyword, ID, user…"
                    value={draft.search}
                    onChange={(e) => setDraftValue('search', e.target.value)}
                    style={{ border: 'none', padding: 0, width: '100%', fontSize: 12 }}
                    aria-label="Search the audit log"
                  />
                </div>
              </FilterField>

              <FilterField label="Object Type">
                <select
                  className="dx-select"
                  style={{ width: 140 }}
                  value={draft.objectType}
                  onChange={(e) => setDraftValue('objectType', e.target.value)}
                >
                  <option value="">All</option>
                  {(facets.objectTypes || []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Action">
                <select
                  className="dx-select"
                  style={{ width: 140 }}
                  value={draft.action}
                  onChange={(e) => setDraftValue('action', e.target.value)}
                >
                  <option value="">All</option>
                  {(facets.actions || []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Source">
                <select
                  className="dx-select"
                  style={{ width: 120 }}
                  value={draft.source}
                  onChange={(e) => setDraftValue('source', e.target.value)}
                >
                  <option value="">All</option>
                  {(facets.sources || []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Result">
                <select
                  className="dx-select"
                  style={{ width: 120 }}
                  value={draft.result}
                  onChange={(e) => setDraftValue('result', e.target.value)}
                >
                  <option value="">All</option>
                  {(facets.results || []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Date Range">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="date"
                    className="dx-input"
                    style={{ width: 140, fontSize: 12 }}
                    value={draft.dateFrom}
                    onChange={(e) => setDraftValue('dateFrom', e.target.value)}
                  />
                  –
                  <input
                    type="date"
                    className="dx-input"
                    style={{ width: 140, fontSize: 12 }}
                    value={draft.dateTo}
                    onChange={(e) => setDraftValue('dateTo', e.target.value)}
                  />
                </span>
              </FilterField>

              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={!hasFilters}>
                  <RotateCcw size={13} /> Reset
                </Button>
                <Button type="submit" size="sm">
                  <ListFilter size={13} /> Apply Filters
                </Button>
              </span>
            </div>
          </form>

          {error && (
            <div className="dx-card" style={{ padding: 12, color: 'var(--dx-danger, #b91c1c)' }}>
              {error}
            </div>
          )}

          <div className="dx-card audit-logs-table">
            <div className="dx-table-wrap dx-table-wrap-scroll" style={{ height: 520 }}>
              <table className="dx-table dx-table-compact">
                <thead>
                  <tr>
                    <th style={{ width: 28 }} aria-label="Expand" />
                    <th>
                      <button
                        type="button"
                        onClick={toggleSort}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          font: 'inherit',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
                      >
                        Timestamp
                        {sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                      </button>
                    </th>
                    <th>Object Type</th>
                    <th>Object ID</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Source</th>
                    <th>Result</th>
                    <th>Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 32 }}>
                        Loading audit events…
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    (data.items || []).map((row) => {
                      const open = expanded === row.event_id
                      const pairs = leftPairs(row)
                      return (
                        <Fragment key={row.event_id}>
                          <tr
                            style={{ cursor: 'pointer' }}
                            onClick={() => setExpanded(open ? null : row.event_id)}
                          >
                            <td>
                              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td className="text-xs">{fmtDate(row.event_time)}</td>
                            <td className="text-xs fw-600">{row.object_type}</td>
                            <td className="text-xs">
                              {row.object_type === 'INVOICE' ? (
                                <Link
                                  to={invoiceHref(
                                    row.invoice_id != null
                                      ? `ocr-${row.invoice_id}`
                                      : row.object_id
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontFamily: 'SF Mono, Menlo, monospace' }}
                                >
                                  {row.object_id}
                                </Link>
                              ) : (
                                <span style={{ fontFamily: 'SF Mono, Menlo, monospace' }}>
                                  {row.object_id}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="dx-badge skip">{row.action}</span>
                            </td>
                            <td className="fw-600 text-sm">{row.actor_name || '—'}</td>
                            <td className="text-xs">{row.source || '—'}</td>
                            <td>
                              <span className={`dx-badge ${RESULT_TONE[row.result] || 'skip'}`}>
                                {row.result}
                              </span>
                            </td>
                            <td
                              className="text-xs text-muted"
                              style={{ fontFamily: 'SF Mono, Menlo, monospace' }}
                            >
                              {row.correlation_id || '—'}
                            </td>
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={9} style={{ padding: 0 }}>
                                <div className="audit-expand-panel" style={{ padding: '14px 18px' }}>
                                  <div className="audit-expand-grid">
                                    <div>
                                      <div
                                        className="text-xs"
                                        style={{
                                          fontWeight: 700,
                                          marginBottom: 8,
                                          color: 'var(--dx-text-soft)',
                                          textTransform: 'uppercase',
                                          letterSpacing: 0.4
                                        }}
                                      >
                                        What changed
                                      </div>
                                      {pairs.length ? (
                                        pairs.map((p) => (
                                          <Pair key={p.label + p.value} label={p.label} value={p.value} />
                                        ))
                                      ) : (
                                        <p className="text-xs text-muted" style={{ margin: 0 }}>
                                          No field-level before/after for this action.
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <div
                                        className="text-xs"
                                        style={{
                                          fontWeight: 700,
                                          marginBottom: 8,
                                          color: 'var(--dx-text-soft)',
                                          textTransform: 'uppercase',
                                          letterSpacing: 0.4
                                        }}
                                      >
                                        Who / why / when
                                      </div>
                                      <Pair label="Event ID" value={row.event_id} />
                                      <Pair label="Actor ID" value={row.actor_id} />
                                      <Pair label="Role" value={row.actor_role} />
                                      <Pair label="Outcome code" value={row.outcome_code} />
                                      <Pair label="Reason" value={row.reason_remarks} />
                                      <Pair
                                        label="Details"
                                        value={
                                          row.details
                                            ? typeof row.details === 'string'
                                              ? row.details
                                              : JSON.stringify(row.details, null, 2)
                                            : null
                                        }
                                      />
                                      <Pair label="Exact time" value={fmtExactTime(row.event_time)} />
                                    </div>
                                  </div>
                                  <p
                                    className="text-xs"
                                    style={{
                                      margin: '12px 0 0',
                                      display: 'flex',
                                      gap: 8,
                                      alignItems: 'flex-start',
                                      color: 'var(--dx-text-soft)'
                                    }}
                                  >
                                    <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    {summaryOf(row)}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  {!loading && !data.items?.length && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ textAlign: 'center', padding: 32, color: 'var(--dx-text-mute)' }}
                      >
                        No events match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderTop: '1px solid var(--dx-border)',
                fontSize: 12,
                color: 'var(--dx-text-soft)'
              }}
            >
              <span>
                {data.total} event{data.total === 1 ? '' : 's'}
                {data.totalPages > 1 ? ` · page ${data.page} of ${data.totalPages}` : ''}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={page >= (data.totalPages || 1) || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaAuditLogs)
