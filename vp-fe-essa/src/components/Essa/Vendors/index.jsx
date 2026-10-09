import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { connect } from 'react-redux'
import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2, RotateCcw, Search, SearchX } from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { DASHBOARD } from 'constants/url'
import { getEssaVendors } from '../../../api/essaVendors'
import '../../../assets/scss/essa/dashboard.scss'

function fmtMoney(amount, currency = 'IDR') {
  if (amount == null || Number.isNaN(Number(amount))) return 'â€”'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'IDR',
    currencyDisplay: 'code',
    maximumFractionDigits: 0
  }).format(Number(amount))
}

function Badge({ tone = 'neutral', children }) {
  return <span className={`vm-badge vm-badge-${tone}`}>{children}</span>
}

function StatusBadge({ value }) {
  const key = String(value || '').toUpperCase()
  const tone = key === 'ACTIVE' ? 'success' : key === 'INACTIVE' ? 'neutral' : 'neutral'
  return <Badge tone={tone}>{value || 'â€”'}</Badge>
}

function FilterField({ label, children }) {
  return (
    <span className="vm-field">
      <span className="vm-field-label">{label}</span>
      {children}
    </span>
  )
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

function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = pageWindow(page, Math.max(1, totalPages))
  return (
    <div className="vm-pager">
      <span>
        Showing {from} to {to} of {total.toLocaleString('en-US')} vendors
      </span>
      <div className="vm-pager-controls">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="vm-pager-gap">
              â€¦
            </span>
          ) : (
            <button
              key={n}
              type="button"
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
        {onPageSize ? (
          <span className="vm-pager-size">
            <span>Rows per page</span>
            <Select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page" className="vm-page-size">
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </span>
        ) : null}
      </div>
    </div>
  )
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronsUpDown size={12} className="vm-sort-idle" aria-hidden />
  return dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />
}

function VendorMasterList({ userInfo: { userType = 'finance' } }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const search = params.get('search') || ''
  const [searchDraft, setSearchDraft] = useState(search)
  const taxStatus = params.get('taxStatus') || ''
  const sapStatus = params.get('sapStatus') || ''
  const controlState = params.get('controlState') || ''
  const sortBy = params.get('sortBy') || ''
  const sortDir = params.get('sortDir') || 'asc'
  const page = parseInt(params.get('page') || '1', 10)
  const pageSize = parseInt(params.get('pageSize') || '25', 10)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const [data, setData] = useState({
    items: [],
    total: 0,
    totalPages: 1,
    facets: { sapStatuses: [], taxStatuses: [] }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEssaVendors({
      search,
      taxStatus: taxStatus || undefined,
      sapStatus: sapStatus || undefined,
      controlState: controlState || undefined,
      sortBy: sortBy || undefined,
      sortDir: sortBy ? sortDir : undefined,
      page,
      pageSize
    }).then((res) => {
      if (!cancelled && res) {
        setData(res)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [search, taxStatus, sapStatus, controlState, sortBy, sortDir, page, pageSize])

  const { items, total, totalPages, facets } = data

  const onSort = (columnKey) => {
    const next = new URLSearchParams(params)
    if (sortBy !== columnKey) {
      next.set('sortBy', columnKey)
      next.set('sortDir', 'asc')
    } else if (sortDir === 'asc') {
      next.set('sortDir', 'desc')
    } else {
      next.delete('sortBy')
      next.delete('sortDir')
    }
    next.delete('page')
    setParams(next, { replace: true })
  }

  const resetFilters = () => {
    setSearchDraft('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const activeFilterCount = [search, taxStatus, sapStatus, controlState].filter(Boolean).length

  const columns = [
    { key: 'code', header: 'Vendor Code' },
    { key: 'name', header: 'Vendor Name' },
    { key: 'location', header: 'Location' },
    { key: 'gstin', header: 'Tax Number' },
    { key: 'sapStatus', header: 'SAP Status' },
    { key: 'invoiceCount', header: 'Invoices', align: 'center' },
    { key: 'totalBilled', header: 'Total Billed', align: 'right' }
  ]

  const openVendor = (code) => navigate(`/${userType}/vendors/${code}`)

  return (
    <LeftPageContainer>
      <div className="essa-dashboard vm-page">
        <style>{pageCss}</style>
        <div className="vm-stack">
          <PageHeader
            breadcrumb={[{ label: 'Home', to: `/${userType}${DASHBOARD}` }, { label: 'Vendors' }]}
            title="Vendor Master"
            description="Read-only vendor snapshot synchronized from SAP (the vendor master source of truth) with the portal AP-control overlay. Master data changes are made in SAP, never here."
          />

          <Card pad={false}>
            <div className="vm-filters">
              <FilterField label="Search">
                <form
                  className="vm-search"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setParam('search', searchDraft.trim() || undefined)
                  }}
                >
                  <Search size={14} />
                  <Input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onBlur={() => setParam('search', searchDraft.trim() || undefined)}
                    placeholder="Search code, name or tax number…"
                    aria-label="Search vendors"
                  />
                </form>
              </FilterField>

              {(facets?.taxStatuses?.length ?? 0) > 1 && (
                <FilterField label="Tax Status">
                  <Select value={taxStatus} onChange={(e) => setParam('taxStatus', e.target.value || undefined)} aria-label="Tax status filter" className="vm-select">
                    <option value="">All (PKP & Non-PKP)</option>
                    {facets.taxStatuses.map((t) => (
                      <option key={t} value={t}>
                        {t === 'PKP' ? 'PKP · Domestic (tax-registered)' : 'Non-PKP · International'}
                      </option>
                    ))}
                  </Select>
                </FilterField>
              )}

              {(facets?.controlStates?.length ?? 0) > 1 && (
                <FilterField label="AP Control">
                  <Select value={controlState} onChange={(e) => setParam('controlState', e.target.value || undefined)} aria-label="AP control filter" className="vm-select">
                    <option value="">Any</option>
                    {facets.controlStates.map((s) => (
                      <option key={s} value={s}>
                        {s === 'Negative' ? 'Negative list' : s === 'Disabled' ? 'AP disabled' : 'Enabled'}
                      </option>
                    ))}
                  </Select>
                </FilterField>
              )}

              {(facets?.sapStatuses?.length ?? 0) > 1 && (
                <FilterField label="SAP Status">
                  <Select value={sapStatus} onChange={(e) => setParam('sapStatus', e.target.value || undefined)} aria-label="SAP status filter" className="vm-select">
                    <option value="">Any</option>
                    {facets.sapStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </FilterField>
              )}

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" type="button" className="vm-reset" onClick={resetFilters}>
                  <RotateCcw size={13} /> Reset
                </Button>
              )}

              <span className="vm-count">{total} vendors · SAP snapshot</span>
            </div>

            <div className="vm-table-wrap">
              <table className="vm-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className={column.align === 'right' ? 'is-right' : column.align === 'center' ? 'is-center' : undefined}>
                        <button type="button" className="vm-sort" onClick={() => onSort(column.key)}>
                          {column.header}
                          <SortIcon active={sortBy === column.key} dir={sortDir} />
                        </button>
                      </th>
                    ))}
                    <th className="vm-sticky is-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="vm-state-row">
                      <td colSpan={columns.length + 1}>
                        <div className="vm-state">
                          <Loader2 size={22} className="vm-spin" />
                          <span>Loading…</span>
                        </div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr className="vm-state-row">
                      <td colSpan={columns.length + 1}>
                        <div className="vm-state">
                          <SearchX size={28} />
                          <p className="vm-state-title">No matching results</p>
                          <p>
                            {search
                              ? `Nothing matched "${search}". Try adjusting the filters or search terms.`
                              : 'Try adjusting the filters or search terms.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((v, index) => (
                      <tr key={v.code} className={index % 2 === 1 ? 'is-zebra' : undefined} onClick={() => openVendor(v.code)}>
                        <td>
                          <span className="vm-code">{v.code}</span>
                        </td>
                        <td>
                          <span className="vm-name">{v.name || '—'}</span>
                        </td>
                        <td>
                          <span className="vm-location">{v.location || '—'}</span>
                        </td>
                        <td>
                          <span className="vm-tax">{v.gstin || '—'}</span>
                        </td>
                        <td>
                          <StatusBadge value={v.sapStatus} />
                        </td>
                        <td className="is-center">
                          <span className="vm-location">
                            {v.invoiceCount} <span className="vm-faint">({v.openInvoiceCount} open)</span>
                          </span>
                        </td>
                        <td className="is-right">
                          <span className="vm-money">{fmtMoney(v.totalBilled, v.currency)}</span>
                        </td>
                        <td className="vm-sticky is-center" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="vm-open" title={`Open vendor ${v.code}`} onClick={() => openVendor(v.code)}>
                            Open <ArrowRight size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={Math.max(1, totalPages)}
              total={total}
              pageSize={pageSize}
              onPage={(p) => setParam('page', String(p))}
              onPageSize={(size) => setParam('pageSize', String(size))}
            />
          </Card>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.vm-page .vm-stack{display:flex;flex-direction:column;gap:12px;}
.vm-page .vm-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;border-bottom:1px solid #eef0f2;padding:12px;}
.vm-page .vm-field{display:flex;flex-direction:column;gap:2px;min-width:0;}
.vm-page .vm-field-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4b5563;}
.vm-page .vm-search{position:relative;display:block;width:240px;}
.vm-page .vm-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;z-index:1;}
.vm-page .vm-search .dx-input,.vm-page .vm-select{height:36px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1f2937;}
.vm-page .vm-search .dx-input{width:100%;padding:6px 10px 6px 32px;}
.vm-page .vm-select{padding:6px 8px;}
.vm-page .vm-search .dx-input:focus,.vm-page .vm-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.vm-page .vm-reset.dx-btn{height:28px;padding:0 10px;border-radius:6px;border-color:transparent;background:transparent;color:#374151;font-size:12px;font-weight:500;gap:6px;}
.vm-page .vm-reset.dx-btn:hover{background:#eef0f2;border-color:transparent;filter:none;box-shadow:none;}
.vm-page .vm-count{margin-left:auto;align-self:center;font-size:12px;color:#4b5563;}
.vm-page .vm-table-wrap{overflow:auto;max-height:58vh;}
.vm-page .vm-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;color:#1f2937;}
.vm-page .vm-table thead th{position:sticky;top:0;z-index:2;background:#2C9842;color:#fff;font-size:14px;font-weight:700;letter-spacing:0;text-transform:none;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.vm-page .vm-table thead th.is-right,.vm-page .vm-table tbody td.is-right{text-align:right;}
.vm-page .vm-table thead th.is-center,.vm-page .vm-table tbody td.is-center{text-align:center;}
.vm-page .vm-sort{display:inline-flex;align-items:center;gap:4px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.vm-page .vm-sort:hover{text-decoration:underline;}
.vm-page .vm-sort-idle{opacity:.75;}
.vm-page .vm-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;font-size:14px;}
.vm-page .vm-table tbody tr.is-zebra td{background:#f6f8f7;}
.vm-page .vm-table tbody tr:not(.vm-state-row){cursor:pointer;}
.vm-page .vm-table tbody tr:not(.vm-state-row):hover td{background:#eef8f0;}
.vm-page .vm-table th.vm-sticky,.vm-page .vm-table td.vm-sticky{position:sticky;right:0;z-index:1;}
.vm-page .vm-table th.vm-sticky{z-index:3;background:#2C9842;box-shadow:-6px 0 6px -6px rgba(16,24,40,.25);}
.vm-page .vm-table td.vm-sticky{box-shadow:-6px 0 6px -6px rgba(16,24,40,.18);}
.vm-page .vm-code{font-weight:500;color:#247a35;}
.vm-page .vm-name{display:block;max-width:13rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;}
.vm-page .vm-location{font-size:12px;}
.vm-page .vm-faint{color:#9ca3af;}
.vm-page .vm-tax{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;}
.vm-page .vm-money{white-space:nowrap;font-weight:500;}
.vm-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.vm-badge-neutral{background:#eef0f2;color:#374151;}
.vm-badge-success{background:#e6f5ea;color:#2d9a47;}
.vm-badge-warning{background:#fef5e7;color:#b45309;}
.vm-badge-error{background:#fdecec;color:#b91c1c;}
.vm-page .vm-open.dx-btn{height:28px;padding:0 8px;border-radius:6px;border-color:transparent;background:transparent;color:#374151;font-size:12px;font-weight:500;gap:4px;}
.vm-page .vm-open.dx-btn:hover{background:#eef0f2;border-color:transparent;filter:none;box-shadow:none;color:#247a35;}
.vm-page .vm-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.vm-page .vm-state-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.vm-page .vm-state p{margin:0;max-width:28rem;font-size:12px;}
.vm-page .vm-state-row{cursor:default;}
.vm-page .vm-spin{color:#2C9842;animation:vm-spin 1s linear infinite;}
@keyframes vm-spin{to{transform:rotate(360deg);}}
.vm-page .vm-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #eef0f2;padding:8px 12px;font-size:12px;color:#4b5563;}
.vm-page .vm-pager-controls{display:flex;align-items:center;gap:4px;}
.vm-page .vm-pager-controls>button{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:500;cursor:pointer;padding:0 6px;}
.vm-page .vm-pager-controls>button:hover:not(:disabled){background:#eef0f2;}
.vm-page .vm-pager-controls>button:disabled{opacity:.4;cursor:not-allowed;}
.vm-page .vm-pager-controls>button.is-current{border-color:#2C9842;background:#2C9842;color:#fff;}
.vm-page .vm-pager-gap{padding:0 4px;color:#9ca3af;}
.vm-page .vm-pager-size{display:flex;align-items:center;gap:6px;margin-left:12px;white-space:nowrap;}
.vm-page .vm-page-size{height:28px !important;width:64px !important;font-size:12px !important;border-radius:6px;border:1px solid #e5e7eb;background:#fff;padding:2px 6px;}
`

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {}
})

export default connect(mapStateToProps)(VendorMasterList)

