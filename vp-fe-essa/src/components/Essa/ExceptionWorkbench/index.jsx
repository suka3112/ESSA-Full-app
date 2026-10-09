import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, ChevronsUpDown, Loader2, Search } from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { getEssaExceptionCodes } from 'api/essaDashboard'
import { useEssaInvoices } from 'hooks/useEssaInvoices'
import { DASHBOARD, INVOICE_DETAIL } from 'constants/url'
import '../../../assets/scss/essa/dashboard.scss'

function titleCase(value) {
  if (!value) return '—'
  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\b(Sap|Po|Grn|Ses|Ap|Sla|Doa|Id)\b/g, (word) => word.toUpperCase())
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return String(iso)
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

function pageWindow(current, total, maxVisible = 7) {
  if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) pages.push('gap')
  for (let page = left; page <= right; page += 1) pages.push(page)
  if (right < total - 1) pages.push('gap')
  pages.push(total)
  return pages
}

function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const safeTotal = Number(total) || 0
  const from = safeTotal === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(safeTotal, page * pageSize)
  const pages = pageWindow(page, Math.max(1, totalPages))

  return (
    <div className="ew-pager">
      <span>
        {from}–{to} of {safeTotal.toLocaleString('en-US')} exceptions
      </span>
      <div className="ew-pager-controls">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
        {pages.map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="ew-pager-gap">…</span>
          ) : (
            <button key={item} type="button" className={item === page ? 'is-current' : undefined} onClick={() => onPage(item)}>
              {item}
            </button>
          )
        )}
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>›</button>
        <label className="ew-pager-size">
          Rows
          <select className="ew-page-size" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page">
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

function nextSort(current, key) {
  if (current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return { key: '', dir: '' }
}

function SortTh({ label, column, sortBy, sortDir, onSort }) {
  const active = sortBy === column
  const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th>
      <button type="button" className={`ew-sort${active ? '' : ' ew-sort-idle'}`} onClick={() => onSort(column)}>
        {label}
        <Icon size={12} />
      </button>
    </th>
  )
}

function formatExceptionCodes(codes) {
  if (!codes.length) return '—'
  if (codes.length <= 2) return codes.join(', ')
  return `${codes[0]} +${codes.length - 1}`
}

function catalogueHits(rules) {
  const codes = []
  const types = []
  const names = []
  rules.forEach((rule) => {
    const hits = Array.isArray(rule.exceptionCodes) ? rule.exceptionCodes : []
    if (hits.length) {
      hits.forEach((hit) => {
        if (hit.code && !codes.includes(hit.code)) codes.push(hit.code)
        if (hit.exceptionType && !types.includes(hit.exceptionType)) types.push(hit.exceptionType)
        if (hit.name && !names.includes(hit.name)) names.push(hit.name)
      })
      return
    }
    if (rule.ruleCode && !codes.includes(rule.ruleCode)) codes.push(rule.ruleCode)
  })
  return { codes, types, names }
}

function toException(row) {
  const rules = Array.isArray(row.failed_rules) ? row.failed_rules : []
  const { codes, types, names } = catalogueHits(rules)
  const raisedTimes = rules.map((rule) => rule.raisedAt).filter(Boolean).sort()
  const raisedAt = raisedTimes.length ? raisedTimes[raisedTimes.length - 1] : ''
  const documentId = row.documentId || String(row.id || '').replace(/^ocr-/, '')
  return {
    id: row.id,
    code: `EX-${documentId}`,
    invoiceId: row.id,
    invoiceNumber: row.invoice_no || '',
    vendorName: row.vendor_name || '',
    type: types.join(', ') || '—',
    exceptionTypes: types,
    title: names.join(', ') || rules.map((rule) => rule.ruleName).filter(Boolean).join(', ') || 'Validation failure',
    detail: rules.map((rule) => rule.message).filter(Boolean).join(' · '),
    exceptionCode: codes.join(', ') || '—',
    exceptionCodes: codes,
    createdAt: raisedAt || row.uploaded_at || '',
    slaDueAt: row.sla_due || row.slaDue || '',
    slaBreached: Boolean(row.sla_breached || row.slaBreached)
  }
}

function EssaExceptionWorkbench({ userInfo: { userType = 'admin' } = {} }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: extractedInvoices = [], isLoading } = useEssaInvoices({ attention: 'exc' })
  const [catalogue, setCatalogue] = useState([])
  const [searchDraft, setSearchDraft] = useState(params.get('search') || '')

  useEffect(() => {
    let cancelled = false
    getEssaExceptionCodes().then((rows) => {
      if (!cancelled) setCatalogue(Array.isArray(rows) ? rows : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const pageSize = parseInt(params.get('pageSize') || '25', 10) || 25
  const search = params.get('search') || ''
  const typeFilter = params.get('type') || ''
  const codeFilter = params.get('exceptionCode') || ''
  const sortBy = params.get('sortBy') || ''
  const sortDir = params.get('sortDir') === 'desc' ? 'desc' : params.get('sortBy') ? 'asc' : ''

  const typeOptions = useMemo(() => {
    const seen = []
    catalogue.forEach((row) => {
      if (row.exceptionType && !seen.includes(row.exceptionType)) seen.push(row.exceptionType)
    })
    return seen
  }, [catalogue])

  const codeOptions = useMemo(() => {
    if (catalogue.length) {
      return catalogue.map((row) => ({
        code: row.code,
        label: row.name ? `${row.code} · ${row.name}` : row.code
      }))
    }
    const codes = new Set()
    extractedInvoices.forEach((row) => {
      const rules = Array.isArray(row.failed_rules) ? row.failed_rules : []
      rules.forEach((rule) => {
        const hits = Array.isArray(rule.exceptionCodes) ? rule.exceptionCodes : []
        hits.forEach((hit) => {
          if (hit.code) codes.add(hit.code)
        })
      })
    })
    return [...codes].sort().map((code) => ({ code, label: code }))
  }, [catalogue, extractedInvoices])

  const rows = useMemo(() => {
    const open = extractedInvoices
      .filter((row) => Number(row.failed_checks) > 0 || Number(row.openExceptions) > 0)
      .map(toException)
    const needle = search.trim().toLowerCase()
    const filtered = open.filter((row) => {
      if (typeFilter && !row.exceptionTypes.includes(typeFilter)) return false
      if (codeFilter && !row.exceptionCodes.includes(codeFilter)) return false
      if (!needle) return true
      return [row.code, row.invoiceNumber, row.vendorName, row.exceptionCode].some((value) =>
        String(value).toLowerCase().includes(needle)
      )
    })
    if (!sortBy) return filtered
    const valueOf = (row) => {
      if (sortBy === 'code') return row.code
      if (sortBy === 'invoiceNumber') return row.invoiceNumber
      if (sortBy === 'vendorName') return row.vendorName
      if (sortBy === 'type') return titleCase(row.type)
      if (sortBy === 'exceptionCode') return row.exceptionCode
      if (sortBy === 'createdAt') return row.createdAt
      if (sortBy === 'slaDueAt') return row.slaDueAt
      return ''
    }
    return [...filtered].sort((a, b) => {
      const result = String(valueOf(a) ?? '').localeCompare(String(valueOf(b) ?? ''), undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'desc' ? -result : result
    })
  }, [extractedInvoices, search, typeFilter, codeFilter, sortBy, sortDir])

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const activeFilters = [search, typeFilter, codeFilter].filter(Boolean).length

  const onSort = (column) => {
    const next = nextSort({ key: sortBy, dir: sortDir }, column)
    const paramsNext = new URLSearchParams(params)
    if (next.key) {
      paramsNext.set('sortBy', next.key)
      paramsNext.set('sortDir', next.dir)
    } else {
      paramsNext.delete('sortBy')
      paramsNext.delete('sortDir')
    }
    paramsNext.delete('page')
    setParams(paramsNext, { replace: true })
  }

  const openInvoice = (row) => {
    if (!row?.invoiceId) return
    navigate(`/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(row.invoiceId))}`)
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard ew-page">
        <style>{pageCss}</style>
        <div className="ew-stack">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${DASHBOARD}` },
              { label: 'Invoice Processing' },
              { label: 'Exception Workbench' }
            ]}
            title="Exception Workbench"
            description="Extracted invoices with failed validation checks. Open an invoice to correct the failed fields and revalidate."
          />

          <Card pad={false}>
            <div className="ew-filters">
              <span className="ew-field">
                <span className="ew-field-label">Search</span>
                <form
                  className="ew-search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    setParam('search', searchDraft.trim() || undefined)
                  }}
                >
                  <Search size={14} />
                  <Input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onBlur={() => setParam('search', searchDraft.trim() || undefined)}
                    placeholder="Exception ID, invoice or vendor…"
                    aria-label="Search exceptions"
                  />
                </form>
              </span>
              <span className="ew-field">
                <span className="ew-field-label">Exception Type</span>
                <select className="ew-select" value={typeFilter} onChange={(event) => setParam('type', event.target.value || undefined)} aria-label="Exception type filter">
                  <option value="">Any type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </span>
              <span className="ew-field">
                <span className="ew-field-label">Exception Code</span>
                <select className="ew-select" value={codeFilter} onChange={(event) => setParam('exceptionCode', event.target.value || undefined)} aria-label="Exception code filter">
                  <option value="">Any code</option>
                  {codeOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
              </span>
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ew-reset"
                  onClick={() => {
                    setSearchDraft('')
                    setParams(new URLSearchParams(), { replace: true })
                  }}
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="ew-table-wrap">
              <table className="ew-table">
                <thead>
                  <tr>
                    <SortTh label="Exception ID" column="code" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Invoice Number" column="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Vendor Name" column="vendorName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Exception Type" column="type" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Exception Code" column="exceptionCode" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Raised On" column="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="SLA Due" column="slaDueAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                    <th className="is-center ew-sticky">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="ew-state-row">
                      <td colSpan={8}>
                        <div className="ew-state">
                          <Loader2 size={18} className="ew-spin" />
                          <p>Loading exceptions…</p>
                        </div>
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr className="ew-state-row">
                      <td colSpan={8}>
                        <div className="ew-state">
                          <p className="ew-state-title">No matching results</p>
                          <p>{search ? `Nothing matches “${search}”.` : 'No open exceptions to show.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, index) => (
                      <tr key={row.id} className={index % 2 === 1 ? 'is-zebra' : undefined} onClick={() => openInvoice(row)}>
                        <td>
                          <span className="ew-id" title="Case reference for this exception. Use it when discussing the case with the team.">
                            {row.code}
                          </span>
                        </td>
                        <td><span className="ew-strong">{row.invoiceNumber || '—'}</span></td>
                        <td><span className="ew-vendor">{row.vendorName || '—'}</span></td>
                        <td>
                          <span className="ew-type" title={row.exceptionTypes.join(', ') || row.detail || row.title}>{formatExceptionCodes(row.exceptionTypes)}</span>
                        </td>
                        <td>
                          <span className="ew-code" title={row.title || row.detail}>
                            {formatExceptionCodes(row.exceptionCodes)}
                          </span>
                        </td>
                        <td><span className="ew-time">{fmtDateTime(row.createdAt)}</span></td>
                        <td>
                          {row.slaBreached ? (
                            <span className="ew-badge ew-badge-error" title={`SLA was due ${fmtDateTime(row.slaDueAt)}`}>SLA Breached</span>
                          ) : (
                            <span className="ew-time ew-muted">{row.slaDueAt ? fmtDateTime(row.slaDueAt) : '—'}</span>
                          )}
                        </td>
                        <td className="is-center ew-sticky">
                          <button
                            type="button"
                            className="ew-open"
                            aria-label={`Open invoice ${row.invoiceNumber}`}
                            title="Open the invoice to see and correct the failed fields"
                            onClick={(event) => {
                              event.stopPropagation()
                              openInvoice(row)
                            }}
                          >
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPage={(nextPage) => setParam('page', String(nextPage))}
                onPageSize={(size) => setParam('pageSize', String(size))}
              />
            )}
          </Card>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.ew-page .ew-stack{display:flex;flex-direction:column;gap:12px;}
.ew-page .ew-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;border-bottom:1px solid #eef0f2;padding:12px;}
.ew-page .ew-field{display:flex;flex-direction:column;gap:2px;}
.ew-page .ew-field-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4b5563;}
.ew-page .ew-search{position:relative;display:block;width:256px;}
.ew-page .ew-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;z-index:1;}
.ew-page .ew-search .dx-input,.ew-page .ew-select{height:36px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1f2937;}
.ew-page .ew-search .dx-input{width:100%;padding:6px 10px 6px 32px;}
.ew-page .ew-select{min-width:160px;padding:6px 8px;}
.ew-page .ew-search .dx-input:focus,.ew-page .ew-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.ew-page .ew-reset.dx-btn{height:28px;padding:0 10px;border-radius:6px;border-color:transparent;background:transparent;color:#374151;font-size:12px;font-weight:500;}
.ew-page .ew-reset.dx-btn:hover{background:#eef0f2;border-color:transparent;filter:none;box-shadow:none;}
.ew-page .ew-table-wrap{overflow:auto;max-height:62vh;}
.ew-page .ew-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;color:#1f2937;}
.ew-page .ew-table thead th{position:sticky;top:0;z-index:2;background:#2C9842;color:#fff;font-size:14px;font-weight:700;text-transform:none;letter-spacing:0;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.ew-page .ew-table thead th.is-center,.ew-page .ew-table tbody td.is-center{text-align:center;}
.ew-page .ew-sort{display:inline-flex;align-items:center;gap:4px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.ew-page .ew-sort:hover{text-decoration:underline;}
.ew-page .ew-sort-idle{opacity:.75;}
.ew-page .ew-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;}
.ew-page .ew-table tbody tr.is-zebra td{background:#f6f8f7;}
.ew-page .ew-table tbody tr:not(.ew-state-row){cursor:pointer;}
.ew-page .ew-table tbody tr:not(.ew-state-row):hover td{background:#eef8f0;}
.ew-page .ew-table th.ew-sticky,.ew-page .ew-table td.ew-sticky{position:sticky;right:0;z-index:1;}
.ew-page .ew-table th.ew-sticky{z-index:3;background:#2C9842;box-shadow:-6px 0 6px -6px rgba(16,24,40,.25);}
.ew-page .ew-table td.ew-sticky{box-shadow:-6px 0 6px -6px rgba(16,24,40,.18);}
.ew-page .ew-id{font-weight:500;color:#247a35;}
.ew-page .ew-strong{font-weight:500;}
.ew-page .ew-vendor{display:block;max-width:11rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;}
.ew-page .ew-type{font-size:12px;font-weight:500;}
.ew-page .ew-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:600;color:#4b5563;}
.ew-page .ew-time{white-space:nowrap;font-size:10px;}
.ew-page .ew-muted{color:#4b5563;}
.ew-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.ew-badge-error{background:#fdecec;color:#b91c1c;}
.ew-page .ew-open{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0 auto;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;cursor:pointer;}
.ew-page .ew-open:hover{border-color:#3aaa55;color:#247a35;}
.ew-page .ew-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.ew-page .ew-state-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.ew-page .ew-state p{margin:0;font-size:12px;}
.ew-page .ew-state-row{cursor:default;}
.ew-page .ew-state-row:hover td{background:#fff;}
.ew-page .ew-spin{color:#2C9842;animation:ew-spin 1s linear infinite;}
@keyframes ew-spin{to{transform:rotate(360deg);}}
.ew-page .ew-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #eef0f2;padding:8px 12px;font-size:12px;color:#4b5563;}
.ew-page .ew-pager-controls{display:flex;align-items:center;gap:4px;}
.ew-page .ew-pager-controls>button{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:500;cursor:pointer;padding:0 6px;}
.ew-page .ew-pager-controls>button:hover:not(:disabled){background:#eef0f2;}
.ew-page .ew-pager-controls>button:disabled{opacity:.4;cursor:not-allowed;}
.ew-page .ew-pager-controls>button.is-current{border-color:#2C9842;background:#2C9842;color:#fff;}
.ew-page .ew-pager-gap{padding:0 4px;color:#9ca3af;}
.ew-page .ew-pager-size{display:flex;align-items:center;gap:6px;margin-left:12px;white-space:nowrap;}
.ew-page .ew-page-size{height:28px !important;width:64px !important;font-size:12px !important;border-radius:6px;border:1px solid #e5e7eb;background:#fff;padding:2px 6px;}
`

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || state.userInfo || {}
})

export default connect(mapStateToProps)(EssaExceptionWorkbench)
