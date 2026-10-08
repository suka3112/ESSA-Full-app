import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { connect } from 'react-redux'
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Loader2, RotateCcw, Search } from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { getPOList } from '../../../api/PurchaseOrder'
import { getEntityId } from '../../../services/utilities'
import { DASHBOARD, INVOICES } from '../../../constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const PO_STATUS_TONE = {
  OPEN: 'success',
  ACTIVE: 'success',
  APPROVED: 'success',
  CLOSED: 'neutral',
  COMPLETED: 'neutral',
  BLOCKED: 'error',
  DELETED: 'error',
  EXPIRED: 'warning'
}

const SORT_COLUMNS = {
  poNumber: 'PONo',
  vendorName: 'Vendor_Name_EN',
  totalAmount: 'POValue',
  validTo: 'PO_date'
}

const API_TO_SORT = Object.fromEntries(Object.entries(SORT_COLUMNS).map(([ui, api]) => [api, ui]))

function fmtMoney(amount, currency = 'AED') {
  const num = Number(amount)
  if (amount == null || Number.isNaN(num)) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      maximumFractionDigits: 0
    }).format(num)
  } catch {
    return `${currency} ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function pageWindow(current, total, maxVisible = 7) {
  if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  pages.push(1)
  if (left > 2) pages.push('gap')
  for (let p = left; p <= right; p++) pages.push(p)
  if (right < total - 1) pages.push('gap')
  pages.push(total)
  return pages
}

function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize, unit = 'purchase orders' }) {
  const safeTotal = Number(total) || 0
  const from = safeTotal === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(safeTotal, page * pageSize)
  const pages = pageWindow(page, Math.max(1, totalPages))

  return (
    <div className="po-pager">
      <span>
        {from}–{to} of {safeTotal.toLocaleString('en-US')} {unit}
      </span>
      <div className="po-pager-controls">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹
        </button>
        {pages.map((p, idx) =>
          p === 'gap' ? (
            <span key={`gap-${idx}`} className="po-pager-gap">…</span>
          ) : (
            <button key={p} type="button" className={p === page ? 'is-current' : undefined} onClick={() => onPage(p)}>
              {p}
            </button>
          )
        )}
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          ›
        </button>
        {onPageSize && (
          <label className="po-pager-size">
            Rows
            <select className="po-page-size" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page">
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}

function SortTh({ label, column, sortBy, sortDir, onSort, align }) {
  const active = sortBy === column
  const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={align === 'right' ? 'is-right' : undefined}>
      <button type="button" className={`po-sort${active ? '' : ' po-sort-idle'}`} onClick={() => onSort(column)}>
        {label}
        <Icon size={12} />
      </button>
    </th>
  )
}

function StatusBadge({ status }) {
  const raw = String(status || 'OPEN')
  const norm = raw.toUpperCase().replace(/\s+/g, '_')
  const tone = PO_STATUS_TONE[norm] || 'neutral'
  return <span className={`po-badge po-badge-${tone}`}>{raw.replace(/_/g, ' ')}</span>
}

const PurchaseOrdersComp = ({ userInfo }) => {
  const navigate = useNavigate()
  const userType = userInfo?.userType || 'admin'
  const [searchParams, setSearchParams] = useSearchParams()

  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '')
  const [poList, setPoList] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10)
  const statusFilter = searchParams.get('status') || ''
  const poTypeFilter = searchParams.get('poType') || ''
  const openOnlyFilter = searchParams.get('openOnly') || ''
  const searchQuery = searchParams.get('search') || ''
  const sortKey = searchParams.get('sortBy') || ''
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : searchParams.get('sortBy') ? 'asc' : ''
  const apiSort = SORT_COLUMNS[sortKey] || (API_TO_SORT[sortKey] ? sortKey : '')
  const uiSort = API_TO_SORT[apiSort] || ''

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const onSort = (column) => {
    const next = new URLSearchParams(searchParams)
    if (uiSort !== column) {
      next.set('sortBy', column)
      next.set('sortDir', 'asc')
    } else if (sortDir === 'asc') {
      next.set('sortBy', column)
      next.set('sortDir', 'desc')
    } else {
      next.delete('sortBy')
      next.delete('sortDir')
    }
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const fetchPOs = useCallback(async () => {
    setLoading(true)
    try {
      const entityId = getEntityId()
      const query = {
        entity_id: entityId,
        page,
        limit: pageSize,
        search: searchQuery.trim(),
        ...(apiSort ? { sort_column: apiSort, sort: sortDir === 'desc' ? 'DESC' : 'ASC' } : {}),
        ...(statusFilter ? { poStatus: statusFilter } : {}),
        ...(openOnlyFilter === 'true' ? { outstandingPo: true } : {})
      }

      const res = await getPOList(query)
      const data = res?.data?.data
      if (data) {
        setPoList(data.results || [])
        const total = data.pageMeta?.total || data.results?.length || 0
        setTotalCount(total)
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)))
      } else {
        setPoList([])
        setTotalCount(0)
        setTotalPages(1)
      }
    } catch (err) {
      console.error('Error fetching PO list:', err)
      setPoList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, statusFilter, openOnlyFilter, apiSort, sortDir])

  useEffect(() => {
    fetchPOs()
  }, [fetchPOs])

  const activeFilterCount = [searchQuery, statusFilter, poTypeFilter, openOnlyFilter].filter(Boolean).length

  const handleReset = () => {
    setSearchDraft('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const handleRowClick = (poNo) => {
    navigate(`/${userType}${INVOICES}?search=${encodeURIComponent(poNo)}`)
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const entityId = getEntityId()
      const res = await getPOList({
        entity_id: entityId,
        page: 1,
        limit: 1000,
        search: searchQuery.trim(),
        ...(apiSort ? { sort_column: apiSort, sort: sortDir === 'desc' ? 'DESC' : 'ASC' } : {}),
        ...(statusFilter ? { poStatus: statusFilter } : {}),
        ...(openOnlyFilter === 'true' ? { outstandingPo: true } : {})
      })
      const items = res?.data?.data?.results || []
      const header = 'PO Number,Vendor Code,Vendor,Type,Total Amount,Open Amount,Currency,Valid To,Status'
      const rows = items.map((p) => {
        const total = Number(p.POValue || p.totalAmount || 0)
        const inv = Number(p.InvValue || 0)
        const open = Math.max(0, total - inv)
        const poType = p.poType || (p.OurRef?.startsWith('SRV') ? 'Service PO' : 'Standard PO')
        return [
          p.PONo,
          p.Vendor_SAP_Code || p.Vendor_id || '',
          p.vendor?.Vendor_Name_EN || p.Vendor_Name_EN || '',
          poType,
          total,
          open,
          p.PO_currency || 'AED',
          p.PO_date || '',
          p.POStatus || 'OPEN'
        ]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      })
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'eapa-purchase-orders.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard po-page">
        <style>{pageCss}</style>
        <div className="po-stack">
          <PageHeader
            breadcrumb={[{ label: 'Home', to: `/${userType}${DASHBOARD}` }, { label: 'Purchase Orders' }]}
            title="Purchase Orders"
            description="All purchase orders from the SAP reference data, with open value against each. PO invoices match against these — no approval workflow applies to PO invoices."
            actions={
              <Button
                variant="secondary"
                size="sm"
                className="po-export"
                onClick={exportCsv}
                disabled={exporting}
                title="Downloads exactly what is filtered on screen, not only this page"
              >
                <Download size={14} /> {exporting ? 'Preparing…' : 'Export'}
              </Button>
            }
          />

          <Card pad={false}>
            <div className="po-filters">
              <span className="po-field">
                <span className="po-field-label">Search</span>
                <form
                  className="po-search"
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
                    placeholder="Search PO number or vendor…"
                    aria-label="Search purchase orders"
                  />
                </form>
              </span>

              <span className="po-field">
                <span className="po-field-label">Status</span>
                <select className="po-select" value={statusFilter} onChange={(e) => setParam('status', e.target.value || undefined)} aria-label="PO status filter">
                  <option value="">Any</option>
                  <option value="Open">OPEN</option>
                  <option value="Closed">CLOSED</option>
                  <option value="Completed">COMPLETED</option>
                  <option value="Blocked">BLOCKED</option>
                </select>
              </span>

              <span className="po-field">
                <span className="po-field-label">PO Type</span>
                <select className="po-select" value={poTypeFilter} onChange={(e) => setParam('poType', e.target.value || undefined)} aria-label="PO type filter">
                  <option value="">Any</option>
                  <option value="Standard PO">Standard PO</option>
                  <option value="Service PO">Service PO</option>
                  <option value="Asset PO">Asset PO</option>
                </select>
              </span>

              <span className="po-field">
                <span className="po-field-label">Open Value</span>
                <select className="po-select" value={openOnlyFilter} onChange={(e) => setParam('openOnly', e.target.value || undefined)} aria-label="Open value filter">
                  <option value="">Any</option>
                  <option value="true">Still open</option>
                  <option value="false">Fully invoiced</option>
                </select>
              </span>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="po-reset" onClick={handleReset}>
                  <RotateCcw size={13} /> Reset
                </Button>
              )}
              <span className="po-count">{totalCount.toLocaleString('en-US')} purchase orders · SAP reference data</span>
            </div>

            <div className="po-table-wrap">
              <table className="po-table">
                <thead>
                  <tr>
                    <SortTh label="PO Number" column="poNumber" sortBy={uiSort} sortDir={sortDir} onSort={onSort} />
                    <SortTh label="Vendor" column="vendorName" sortBy={uiSort} sortDir={sortDir} onSort={onSort} />
                    <th>Type</th>
                    <SortTh label="Total Value" column="totalAmount" sortBy={uiSort} sortDir={sortDir} onSort={onSort} align="right" />
                    <th className="is-right">Open Value</th>
                    <SortTh label="Valid To" column="validTo" sortBy={uiSort} sortDir={sortDir} onSort={onSort} />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="po-state-row">
                      <td colSpan={7}>
                        <div className="po-state">
                          <Loader2 size={18} className="po-spin" />
                          <p>Loading purchase orders…</p>
                        </div>
                      </td>
                    </tr>
                  ) : poList.length === 0 ? (
                    <tr className="po-state-row">
                      <td colSpan={7}>
                        <div className="po-state">
                          <p className="po-state-title">No matching results</p>
                          <p>
                            {searchQuery
                              ? `Nothing matches “${searchQuery}”. Try a different search or clear the filters.`
                              : 'No purchase orders to show.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    poList.map((po, idx) => {
                      const poNo = po.PONo || po.poNumber
                      const vendorCode = po.Vendor_SAP_Code || po.Vendor_id || po.vendorCode || ''
                      const vendorName = po.vendor?.Vendor_Name_EN || po.Vendor_Name_EN || (vendorCode ? `Vendor ${vendorCode}` : '—')
                      const poType = po.poType || (po.OurRef?.startsWith('SRV') ? 'Service PO' : 'Standard PO')
                      const totalAmount = Number(po.POValue || po.totalAmount || 0)
                      const invAmount = Number(po.InvValue || 0)
                      const openAmount = Math.max(0, totalAmount - invAmount)
                      const currency = po.PO_currency || po.currency || 'AED'
                      const validTo = po.PO_date || po.validTo
                      const status = po.POStatus || po.status || 'OPEN'

                      return (
                        <tr key={poNo || idx} className={idx % 2 === 1 ? 'is-zebra' : undefined} onClick={() => handleRowClick(poNo)} title={`Click to view invoices for PO ${poNo}`}>
                          <td><span className="po-code">{poNo}</span></td>
                          <td>
                            <span className="po-name">{vendorName}</span>
                            {vendorCode ? <span className="po-sub">{vendorCode}</span> : null}
                          </td>
                          <td><span className="po-badge po-badge-neutral">{poType}</span></td>
                          <td className="is-right"><span className="po-money">{fmtMoney(totalAmount, currency)}</span></td>
                          <td className="is-right">
                            {openAmount > 0
                              ? <span className="po-money po-open">{fmtMoney(openAmount, currency)}</span>
                              : <span className="po-badge po-badge-neutral">Fully invoiced</span>}
                          </td>
                          <td><span className="po-date">{fmtDate(validTo)}</span></td>
                          <td><StatusBadge status={status} /></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={totalCount}
                pageSize={pageSize}
                onPage={(p) => setParam('page', String(p))}
                onPageSize={(s) => setParam('pageSize', String(s))}
              />
            )}
          </Card>
        </div>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.po-page .po-stack{display:flex;flex-direction:column;gap:12px;}
.po-page .po-export.dx-btn{height:28px;padding:0 10px;border-radius:6px;border:1px solid #2C9842;background:#fff;color:#247a35;font-size:12px;font-weight:500;gap:6px;}
.po-page .po-export.dx-btn:hover:not(:disabled){background:#eef8f0;filter:none;box-shadow:none;}
.po-page .po-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;border-bottom:1px solid #eef0f2;padding:12px;}
.po-page .po-field{display:flex;flex-direction:column;gap:2px;min-width:0;}
.po-page .po-field-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4b5563;}
.po-page .po-search{position:relative;display:block;width:240px;}
.po-page .po-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;z-index:1;}
.po-page .po-search .dx-input,.po-page .po-select{height:36px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1f2937;}
.po-page .po-search .dx-input{width:100%;padding:6px 10px 6px 32px;}
.po-page .po-select{padding:6px 8px;min-width:120px;}
.po-page .po-search .dx-input:focus,.po-page .po-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.po-page .po-reset.dx-btn{height:28px;padding:0 10px;border-radius:6px;border-color:transparent;background:transparent;color:#374151;font-size:12px;font-weight:500;gap:6px;}
.po-page .po-reset.dx-btn:hover{background:#eef0f2;border-color:transparent;filter:none;box-shadow:none;}
.po-page .po-count{margin-left:auto;align-self:center;font-size:12px;color:#4b5563;}
.po-page .po-table-wrap{overflow:auto;max-height:58vh;}
.po-page .po-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;color:#1f2937;}
.po-page .po-table thead th{position:sticky;top:0;z-index:2;background:#2C9842;color:#fff;font-size:14px;font-weight:700;letter-spacing:0;text-transform:none;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.po-page .po-table thead th.is-right,.po-page .po-table tbody td.is-right{text-align:right;}
.po-page .po-sort{display:inline-flex;align-items:center;gap:4px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.po-page .po-sort:hover{text-decoration:underline;}
.po-page .po-sort-idle{opacity:.75;}
.po-page .po-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;font-size:14px;}
.po-page .po-table tbody tr.is-zebra td{background:#f6f8f7;}
.po-page .po-table tbody tr:not(.po-state-row){cursor:pointer;}
.po-page .po-table tbody tr:not(.po-state-row):hover td{background:#eef8f0;}
.po-page .po-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:500;color:#247a35;}
.po-page .po-name{display:block;max-width:13rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;}
.po-page .po-sub{display:block;font-size:10px;color:#9ca3af;}
.po-page .po-money{white-space:nowrap;font-weight:500;}
.po-page .po-open{color:#247a35;}
.po-page .po-date{white-space:nowrap;font-size:12px;}
.po-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.po-badge-neutral{background:#eef0f2;color:#374151;}
.po-badge-success{background:#e6f5ea;color:#2d9a47;}
.po-badge-warning{background:#fef5e7;color:#b45309;}
.po-badge-error{background:#fdecec;color:#b91c1c;}
.po-page .po-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.po-page .po-state-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.po-page .po-state p{margin:0;max-width:28rem;font-size:12px;}
.po-page .po-state-row{cursor:default;}
.po-page .po-spin{color:#2C9842;animation:po-spin 1s linear infinite;}
@keyframes po-spin{to{transform:rotate(360deg);}}
.po-page .po-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #eef0f2;padding:8px 12px;font-size:12px;color:#4b5563;}
.po-page .po-pager-controls{display:flex;align-items:center;gap:4px;}
.po-page .po-pager-controls>button{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:500;cursor:pointer;padding:0 6px;}
.po-page .po-pager-controls>button:hover:not(:disabled){background:#eef0f2;}
.po-page .po-pager-controls>button:disabled{opacity:.4;cursor:not-allowed;}
.po-page .po-pager-controls>button.is-current{border-color:#2C9842;background:#2C9842;color:#fff;}
.po-page .po-pager-gap{padding:0 4px;color:#9ca3af;}
.po-page .po-pager-size{display:flex;align-items:center;gap:6px;margin-left:12px;white-space:nowrap;}
.po-page .po-page-size{height:28px !important;width:64px !important;font-size:12px !important;border-radius:6px;border:1px solid #e5e7eb;background:#fff;padding:2px 6px;}
`

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || {}
})

export default connect(mapStateToProps)(PurchaseOrdersComp)
