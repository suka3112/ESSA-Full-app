import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Info,
  ListFilter,
  Loader2,
  RotateCcw,
  Search,
  SearchX,
  ShieldCheck
} from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { DASHBOARD, INVOICE_DETAIL } from 'constants/url'
import { fetchEssaAuditLogs } from 'api/essaAudit'
import '../../../assets/scss/essa/dashboard.scss'

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
  SUCCESS: 'success',
  PASS: 'success',
  FAIL: 'error',
  DENIED: 'error',
  OVERRIDDEN: 'info',
  REJECTED: 'warning',
  WARNING: 'warning'
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
    changes.forEach((c) => pairs.push({ label: c.field, value: `${c.before}  â†’  ${c.after}` }))
  }
  const details = row.details
  if (Array.isArray(details)) {
    details.forEach((item) => {
      if (item && typeof item === 'object' && 'label' in item) {
        pairs.push({ label: item.label, value: fmtValue(item.value) })
      } else {
        pairs.push({ label: 'Detail', value: fmtValue(item) })
      }
    })
  } else if (isPlainObject(details)) {
    Object.entries(details).forEach(([key, value]) => {
      pairs.push({ label: fieldLabel(key), value: fmtValue(value) })
    })
  } else if (typeof details === 'string' && details) {
    pairs.push({ label: 'Details', value: details })
  }
  return pairs
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const out = [1]
  const from = Math.max(2, Math.min(page - 1, totalPages - 4))
  const to = Math.min(totalPages - 1, Math.max(page + 1, 5))
  if (from > 2) out.push('gap')
  for (let n = from; n <= to; n += 1) out.push(n)
  if (to < totalPages - 1) out.push('gap')
  out.push(totalPages)
  return out
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

function FilterField({ label, className, children }) {
  return (
    <label className={`al-field ${className || ''}`}>
      <span className="al-field-label">{label}</span>
      {children}
    </label>
  )
}

function Pair({ label, value }) {
  return (
    <div className="al-pair">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function ResultBadge({ value }) {
  const tone = RESULT_TONE[value] || 'neutral'
  return <span className={`al-badge al-badge-${tone}`}>{value || '—'}</span>
}

function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = pageWindow(page, Math.max(1, totalPages))
  return (
    <div className="al-pager">
      <span>
        Showing {from} to {to} of {total.toLocaleString('en-US')} records
      </span>
      <div className="al-pager-controls">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="al-pager-gap">
              ...
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-label={`Page ${n}`}
              aria-current={n === page ? 'page' : undefined}
              className={n === page ? 'is-current' : undefined}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          )
        )}
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={14} />
        </button>
        <span className="al-pager-size">
          <span>Rows per page</span>
          <Select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page" className="al-page-size">
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </span>
      </div>
    </div>
  )
}

function EssaAuditLogs({ userInfo: { userType } }) {
  const canView = userType === ADMIN_USER_TYPE

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [applied, setApplied] = useState(EMPTY_DRAFT)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortDir, setSortDir] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
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
        pageSize,
        sortBy: 'eventTime',
        sortDir: sortDir || 'desc'
      })
      setData({
        items: result.items || [],
        total: result.total || 0,
        page: result.page || page,
        pageSize: result.pageSize || pageSize,
        totalPages: result.totalPages || 1,
        facets: result.facets || {}
      })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load audit logs')
      setData((prev) => ({ ...prev, items: [], total: 0 }))
    } finally {
      setLoading(false)
    }
  }, [applied, page, pageSize, sortDir])

  useEffect(() => {
    if (canView) load()
  }, [canView, load])

  const apply = (e) => {
    e?.preventDefault?.()
    setPage(1)
    setExpanded(null)
    setApplied({ ...draft })
  }

  const reset = () => {
    setDraft(EMPTY_DRAFT)
    setApplied(EMPTY_DRAFT)
    setPage(1)
    setPageSize(10)
    setSortDir(null)
    setExpanded(null)
  }

  const dirty = FILTER_KEYS.some((k) => draft[k] !== applied[k])
  const hasFilters = FILTER_KEYS.some((k) => applied[k]) || dirty

  const toggleTimeSort = () => {
    setSortDir((current) => {
      if (!current) return 'asc'
      if (current === 'asc') return 'desc'
      return null
    })
    setPage(1)
  }

  const timeSortHint = !sortDir
    ? 'Sort by timestamp, oldest first'
    : sortDir === 'asc'
      ? 'Sort by timestamp, newest first'
      : 'Stop sorting by timestamp'

  const facets = data.facets || {}
  const invoiceHref = (objectId) => `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(objectId))}`

  if (!canView) {
    return (
      <LeftPageContainer>
        <div className="essa-dashboard al-page">
          <style>{pageCss}</style>
          <PageHeader
            breadcrumb={[{ label: 'Home', to: `/${userType}${DASHBOARD}` }, { label: 'Audit Log' }]}
            title="Audit Log"
            description="Every transaction on the platform is recorded for accountability and transparency. Records cannot be edited or deleted."
          />
          <Card>
            <div className="al-empty">
              <ShieldCheck size={28} />
              <p className="al-empty-title">Access denied</p>
              <p>You do not have permission to view the audit log.</p>
            </div>
          </Card>
        </div>
      </LeftPageContainer>
    )
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard al-page">
        <style>{pageCss}</style>
        <div className="al-stack">
          <PageHeader
            breadcrumb={[{ label: 'Home', to: `/${userType}${DASHBOARD}` }, { label: 'Audit Log' }]}
            title="Audit Log"
            description="Every transaction on the platform is recorded for accountability and transparency. Records cannot be edited or deleted."
          />

          <Card pad={false}>
            <form className="al-filters" onSubmit={apply}>
              <FilterField label="Search" className="al-search-field">
                <span className="al-search">
                  <Search size={14} />
                  <Input
                    value={draft.search}
                    onChange={(e) => setDraftValue('search', e.target.value)}
                    placeholder="Search by keyword, ID, user…"
                    aria-label="Search the audit log"
                  />
                </span>
              </FilterField>

              <FilterField label="Object Type">
                <Select value={draft.objectType} onChange={(e) => setDraftValue('objectType', e.target.value)} aria-label="Object type filter" className="al-select al-select-type">
                  <option value="">All</option>
                  {(facets.objectTypes || []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </FilterField>

              <FilterField label="Action">
                <Select value={draft.action} onChange={(e) => setDraftValue('action', e.target.value)} aria-label="Action filter" className="al-select al-select-action">
                  <option value="">All</option>
                  {(facets.actions || []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </FilterField>

              <FilterField label="Source">
                <Select value={draft.source} onChange={(e) => setDraftValue('source', e.target.value)} aria-label="Source filter" className="al-select al-select-short">
                  <option value="">All</option>
                  {(facets.sources || []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </FilterField>

              <FilterField label="Result">
                <Select value={draft.result} onChange={(e) => setDraftValue('result', e.target.value)} aria-label="Result filter" className="al-select al-select-short">
                  <option value="">All</option>
                  {(facets.results || []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </FilterField>

              <FilterField label="Date Range">
                <span className="al-dates">
                  <Input type="date" value={draft.dateFrom} onChange={(e) => setDraftValue('dateFrom', e.target.value)} aria-label="From date" />
                  <span>–</span>
                  <Input type="date" value={draft.dateTo} onChange={(e) => setDraftValue('dateTo', e.target.value)} aria-label="To date" />
                </span>
              </FilterField>

              <span className="al-filter-actions">
                <Button type="button" variant="ghost" size="sm" className="al-btn" onClick={reset} disabled={!hasFilters}>
                  <RotateCcw size={13} /> Reset
                </Button>
                <Button type="submit" size="sm" className="al-btn al-btn-primary">
                  <ListFilter size={13} /> Apply Filters
                </Button>
              </span>
            </form>

            {error && <p className="al-error">{error}</p>}

            {loading ? (
              <div className="al-empty">
                <Loader2 size={22} className="al-spin" />
                <p>Loading…</p>
              </div>
            ) : !data.items?.length ? (
              <div className="al-empty">
                <SearchX size={28} />
                <p className="al-empty-title">No matching results</p>
                <p>
                  {applied.search
                    ? `Nothing matched "${applied.search}". Try adjusting the filters or search terms.`
                    : 'Try adjusting the filters or search terms.'}
                </p>
              </div>
            ) : (
              <div className="al-table-wrap">
                <table className="al-table">
                  <thead>
                    <tr>
                      <th className="al-expand-col" aria-label="Expand" />
                      <th aria-sort={!sortDir ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending'}>
                        <button type="button" className="al-sort" onClick={toggleTimeSort} aria-label={timeSortHint} title={timeSortHint}>
                          Timestamp
                          {!sortDir ? (
                            <ChevronsUpDown size={13} className="al-sort-idle" aria-hidden />
                          ) : sortDir === 'asc' ? (
                            <ArrowUp size={13} aria-hidden />
                          ) : (
                            <ArrowDown size={13} aria-hidden />
                          )}
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
                    {data.items.map((row) => {
                      const open = expanded === row.event_id
                      const pairs = leftPairs(row)
                      return (
                        <Fragment key={row.event_id}>
                          <tr className={open ? 'is-open' : undefined} onClick={() => setExpanded(open ? null : row.event_id)}>
                            <td className="al-chevron">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                            <td className="al-muted al-nowrap">{fmtDateTime(row.event_time)}</td>
                            <td className="al-nowrap al-semibold">{row.object_type}</td>
                            <td className="al-nowrap">
                              {row.object_type === 'INVOICE' ? (
                                <Link
                                  to={invoiceHref(row.invoice_id != null ? `ocr-${row.invoice_id}` : row.object_id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="al-link"
                                >
                                  {row.object_id}
                                </Link>
                              ) : (
                                <span className="al-medium">{row.object_id}</span>
                              )}
                            </td>
                            <td className="al-nowrap al-medium">{row.action}</td>
                            <td className="al-nowrap">{row.actor_name || '—'}</td>
                            <td className="al-nowrap al-muted">{row.source || '—'}</td>
                            <td className="al-nowrap">
                              <ResultBadge value={row.result} />
                            </td>
                            <td className="al-nowrap al-mono">{row.correlation_id || '—'}</td>
                          </tr>
                          {open && (
                            <tr className="al-detail-row">
                              <td colSpan={9}>
                                <div className="al-detail">
                                  <dl className="al-detail-grid">
                                    <div>
                                      {pairs.length ? (
                                        pairs.map((pair) => <Pair key={pair.label + pair.value} {...pair} />)
                                      ) : (
                                        <p className="al-faint">No field values changed in this activity.</p>
                                      )}
                                    </div>
                                    <div>
                                      <Pair label="Role" value={row.actor_type && row.actor_type !== 'USER' ? 'System' : row.actor_role || '—'} />
                                      <Pair label="Reason" value={row.reason_remarks || 'Not recorded'} />
                                      <Pair label="Time" value={fmtExactTime(row.event_time)} />
                                    </div>
                                  </dl>
                                  <p className="al-summary">
                                    <Info size={13} />
                                    <span>{summaryOf(row)}</span>
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (
              <Pagination
                page={data.page || page}
                totalPages={data.totalPages || 1}
                total={data.total || 0}
                pageSize={data.pageSize || pageSize}
                onPage={setPage}
                onPageSize={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            )}
          </Card>

          <p className="al-footnote">
            <ShieldCheck size={12} />
            <span>
              Audit records are written once and can never be edited or deleted.
              {applied.dateFrom || applied.dateTo
                ? ` Showing ${applied.dateFrom ? fmtDay(applied.dateFrom) : 'the beginning'} to ${applied.dateTo ? fmtDay(applied.dateTo) : 'today'}.`
                : ''}
            </span>
          </p>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.al-page .al-stack{display:flex;flex-direction:column;gap:12px;}
.al-page .al-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;border-bottom:1px solid #eef0f2;padding:12px;}
.al-page .al-field{display:flex;min-width:0;flex-direction:column;gap:4px;}
.al-page .al-field-label{font-size:10px;font-weight:600;color:#4b5563;}
.al-page .al-search-field{flex:1 1 176px;min-width:176px;}
.al-page .al-search{position:relative;display:block;}
.al-page .al-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;}
.al-page .al-filters .dx-input,.al-page .al-select{height:36px;border-radius:6px;border:1px solid #e5e7eb;background-color:#fff;padding:6px 10px;font-size:14px;color:#1f2937;width:100%;}
.al-page .al-select{appearance:none;-webkit-appearance:none;padding-right:36px !important;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:16px;}
.al-page .al-search .dx-input{padding-left:32px;}
.al-page .al-filters .dx-input:focus,.al-page .al-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.al-page .al-select-type{width:144px;}
.al-page .al-select-action{width:176px;}
.al-page .al-select-short{width:112px;}
.al-page .al-dates{display:flex;align-items:center;gap:6px;font-size:10px;color:#4b5563;}
.al-page .al-dates .dx-input{width:128px;}
.al-page .al-filter-actions{margin-left:auto;display:flex;align-items:flex-end;gap:8px;}
.al-page .al-btn.dx-btn{height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:500;gap:6px;}
.al-page .al-btn.dx-btn-ghost{border-color:transparent;background:transparent;color:#374151;}
.al-page .al-btn.dx-btn-ghost:hover:not(:disabled){background:#eef0f2;border-color:transparent;filter:none;box-shadow:none;}
.al-page .al-btn-primary.dx-btn{background:#2C9842;color:#fff;border-color:transparent;}
.al-page .al-btn-primary.dx-btn:hover{background:#247a35;filter:none;box-shadow:none;}
.al-page .al-error{margin:0;padding:10px 12px;font-size:12px;color:#b91c1c;}
.al-page .al-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.al-page .al-empty-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.al-page .al-empty p{margin:0;max-width:28rem;font-size:12px;}
.al-page .al-spin{color:#2C9842;animation:al-spin 1s linear infinite;}
@keyframes al-spin{to{transform:rotate(360deg);}}
.al-page .al-table-wrap{overflow-x:auto;}
.al-page .al-table{width:100%;border-collapse:collapse;text-align:left;font-size:12px;color:#1f2937;}
.al-page .al-table thead th{background:#2C9842;color:#fff;font-size:12px;font-weight:700;letter-spacing:0;text-transform:none;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.al-page .al-expand-col{width:32px;padding-left:8px;padding-right:8px;}
.al-page .al-sort{display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.al-page .al-sort:hover{text-decoration:underline;}
.al-page .al-sort-idle{opacity:.75;}
.al-page .al-table tbody td{padding:8px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;font-size:12px;}
.al-page .al-table tbody tr{cursor:pointer;}
.al-page .al-table tbody tr:hover td{background:#eef8f0;}
.al-page .al-table tbody tr.is-open td{background:#eef8f0;}
.al-page .al-chevron{width:32px;padding-left:8px;padding-right:8px;color:#9ca3af;}
.al-page .al-muted{color:#374151;}
.al-page .al-semibold{font-weight:600;color:#374151;}
.al-page .al-medium{font-weight:500;}
.al-page .al-nowrap{white-space:nowrap;}
.al-page .al-link{font-weight:500;color:#247a35;text-decoration:none;}
.al-page .al-link:hover{text-decoration:underline;}
.al-page .al-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:#4b5563;}
.al-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;}
.al-badge-neutral{background:#eef0f2;color:#374151;}
.al-badge-success{background:#e6f5ea;color:#2d9a47;}
.al-badge-error{background:#fdecec;color:#b91c1c;}
.al-badge-info{background:#e5f2f9;color:#0075a9;}
.al-badge-warning{background:#fef5e7;color:#b45309;}
.al-page .al-detail-row,.al-page .al-detail-row:hover{cursor:default;}
.al-page .al-table tbody tr.al-detail-row:hover td{background:#f4fbf6;}
.al-page .al-detail-row td{background:#f4fbf6;padding:4px 20px 16px;}
.al-page .al-detail{border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:14px;}
.al-page .al-detail-grid{display:grid;gap:2px 32px;margin:0;}
@media (min-width:768px){.al-page .al-detail-grid{grid-template-columns:1fr 1fr;}}
.al-page .al-pair{display:flex;gap:12px;padding:2px 0;}
.al-page .al-pair dt{width:144px;flex-shrink:0;margin:0;font-size:10px;color:#4b5563;}
.al-page .al-pair dd{min-width:0;margin:0;font-size:10px;font-weight:500;color:#1f2937;word-break:break-word;}
.al-page .al-faint{margin:2px 0;font-size:10px;color:#9ca3af;}
.al-page .al-summary{display:flex;align-items:flex-start;gap:8px;margin:12px 0 0;border:1px solid #d8f0dd;border-radius:6px;background:#eef8f0;padding:8px 10px;font-size:10px;line-height:14px;color:#374151;}
.al-page .al-summary svg{margin-top:1px;flex-shrink:0;color:#2C9842;}
.al-page .al-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #eef0f2;padding:8px 12px;font-size:12px;color:#4b5563;}
.al-page .al-pager-controls{display:flex;align-items:center;gap:4px;}
.al-page .al-pager-controls>button{min-width:26px;height:26px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:500;cursor:pointer;padding:0 6px;}
.al-page .al-pager-controls>button:hover:not(:disabled){background:#eef0f2;}
.al-page .al-pager-controls>button:disabled{opacity:.4;cursor:not-allowed;}
.al-page .al-pager-controls>button.is-current{border-color:#2C9842;background:#2C9842;color:#fff;}
.al-page .al-pager-gap{padding:0 4px;color:#9ca3af;}
.al-page .al-pager-size{display:flex;align-items:center;gap:6px;margin-left:12px;white-space:nowrap;}
.al-page .al-page-size{height:28px !important;width:78px !important;font-size:12px !important;border-radius:6px;border:1px solid #e5e7eb;background-color:#fff;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;background-size:14px;padding:2px 28px 2px 8px !important;appearance:none;-webkit-appearance:none;}
.al-page .al-footnote{display:flex;align-items:center;gap:6px;margin:0;padding:0 4px;font-size:10px;color:#4b5563;}
.al-page .al-footnote svg{color:#2C9842;flex-shrink:0;}
`

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaAuditLogs)


