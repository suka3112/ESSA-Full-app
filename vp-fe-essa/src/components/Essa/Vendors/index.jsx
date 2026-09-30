import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { connect } from 'react-redux'
import { ArrowRight, RotateCcw } from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import {
  FilterBar,
  FilterField,
  FilterSearch,
  ListWorkbench,
  SortTh,
  TablePagination
} from '../ui/listPage'
import { getEssaVendors } from '../../../api/essaVendors'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, #2C9842)'

function fmtMoney(amount, currency = 'IDR') {
  if (amount == null) return '—'
  const num = Number(amount)
  if (isNaN(num)) return '—'
  if (currency === 'USD') {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  return `IDR ${num.toLocaleString('id-ID')}`
}

function StatusBadge({ value }) {
  const isOk = String(value).toUpperCase() === 'ACTIVE'
  return (
    <span className={`sla-status ${isOk ? 'sla-status--active' : 'sla-status--draft'}`}>
      {value || 'ACTIVE'}
    </span>
  )
}

function ControlBadge({ state }) {
  const tone =
    state === 'Negative'
      ? 'sla-status--negative'
      : state === 'Disabled'
        ? 'sla-status--draft'
        : 'sla-status--active'
  return <span className={`sla-status ${tone}`}>{state || 'Enabled'}</span>
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
      sortDir,
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

  return (
    <LeftPageContainer className="essa-invoices-shell">
      <div className="essa-dashboard essa-invoices-page essa-vendors-page">
        <div className="dx-page dx-page--invoices-fit">
          <PageHeader
            breadcrumb={[{ label: 'Home', to: `/${userType}` }, { label: 'Vendors' }]}
            title="Vendor Master"
            description="Read-only vendor snapshot synchronized from SAP (the vendor master source of truth) with the portal AP-control overlay. Master data changes are made in SAP, never here."
          />

          <ListWorkbench>
            <FilterBar className="dx-invoices-filters border-b border-line-soft">
              <FilterField label="Search">
                <form
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setParam('search', searchDraft.trim() || undefined)
                  }}
                  style={{ position: 'relative', width: 260 }}
                >
                  <FilterSearch
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onBlur={() => setParam('search', searchDraft.trim() || undefined)}
                    placeholder="Search code, name or tax number"
                    className="dx-vendors-search-input"
                    aria-label="Search vendors"
                  />
                </form>
              </FilterField>
              <FilterField label="Tax Status">
                <span className="block w-[200px]">
                  <select
                    className="dx-select"
                    value={taxStatus}
                    onChange={(e) => setParam('taxStatus', e.target.value || undefined)}
                    aria-label="Tax status filter"
                  >
                    <option value="">All (PKP & Non-PKP)</option>
                    {(facets?.taxStatuses || ['PKP', 'Non-PKP']).map((t) => (
                      <option key={t} value={t}>
                        {t === 'PKP' ? 'PKP · Domestic (tax-registered)' : 'Non-PKP · International'}
                      </option>
                    ))}
                  </select>
                </span>
              </FilterField>
              <FilterField label="AP Control">
                <span className="block w-[150px]">
                  <select
                    className="dx-select"
                    value={controlState}
                    onChange={(e) => setParam('controlState', e.target.value || undefined)}
                    aria-label="AP control filter"
                  >
                    <option value="">Any</option>
                    {(facets?.controlStates || ['Enabled', 'Disabled', 'Negative']).map((s) => (
                      <option key={s} value={s}>
                        {s === 'Disabled' ? 'AP disabled' : s === 'Negative' ? 'Negative list' : s}
                      </option>
                    ))}
                  </select>
                </span>
              </FilterField>
              <FilterField label="SAP Status">
                <span className="block w-[140px]">
                  <select
                    className="dx-select"
                    value={sapStatus}
                    onChange={(e) => setParam('sapStatus', e.target.value || undefined)}
                    aria-label="SAP status filter"
                  >
                    <option value="">Any</option>
                    {(facets?.sapStatuses || ['ACTIVE', 'INACTIVE']).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </span>
              </FilterField>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" type="button" onClick={resetFilters}>
                  <RotateCcw size={13} /> Reset
                </Button>
              )}

              <span className="ml-auto self-center text-xs text-ink-muted">
                {total} vendors · SAP snapshot
              </span>
            </FilterBar>

            {/* Vendors Table */}
            <div className="dx-table-wrap dx-table-wrap-scroll dx-invoices-table-wrap">
              <table className="dx-table dx-invoices-table">
                <thead>
                  <tr>
                    {[
                      ['code', 'Vendor Code'],
                      ['name', 'Vendor Name'],
                      ['location', 'Location'],
                      ['gstin', 'Tax Number'],
                      ['sapStatus', 'SAP Status'],
                      ['controlState', 'AP Control'],
                      ['invoiceCount', 'Invoices'],
                      ['totalBilled', 'Total Billed']
                    ].map(([key, label]) => (
                      <SortTh key={key} col={key} sortKey={sortBy} onSort={onSort}>
                        {label}
                      </SortTh>
                    ))}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--dx-text-mute)', fontSize: 13 }}>
                        Loading vendors from database…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState
                          icon="search"
                          title="No vendors found"
                          description={
                            search
                              ? `No vendors match "${search}". Try adjusting your filters.`
                              : 'No vendors available.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    items.map((v) => (
                      <tr
                        key={v.code}
                        onClick={() => navigate(`/${userType}/vendors/${v.code}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className="font-medium" style={{ color: BRAND }}>
                            {v.code}
                          </span>
                        </td>
                        <td>
                          <span className="block max-w-52 truncate font-medium">{v.name || '—'}</span>
                          {v.classification ? (
                            <span className="text-[11px] text-ink-faint">{v.classification}</span>
                          ) : null}
                        </td>
                        <td>
                          <span className="text-xs">{v.location || '—'}</span>
                        </td>
                        <td>
                          <span className="font-mono text-[11px]">{v.gstin || '—'}</span>
                        </td>
                        <td>
                          <StatusBadge value={v.sapStatus} />
                        </td>
                        <td>
                          <ControlBadge state={v.controlState} />
                        </td>
                        <td>
                          <span className="text-xs">
                            {v.invoiceCount}{' '}
                            <span className="text-ink-faint">({v.openInvoiceCount} open)</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap font-medium">{fmtMoney(v.totalBilled, v.currency)}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="ghost"
                            title={`Open vendor ${v.code}`}
                            onClick={(ev) => {
                              ev.stopPropagation()
                              navigate(`/${userType}/vendors/${v.code}`)
                            }}
                          >
                            Open <ArrowRight size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page}
              totalPages={Math.max(1, totalPages)}
              total={total}
              pageSize={pageSize}
              onPage={(p) => setParam('page', String(p))}
              onPageSize={(size) => setParam('pageSize', String(size))}
              noun="vendors"
            />
          </ListWorkbench>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {}
})

export default connect(mapStateToProps)(VendorMasterList)