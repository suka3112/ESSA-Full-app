import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { connect } from 'react-redux'
import { Download, RotateCcw, Search } from 'lucide-react'
import dayjs from 'dayjs'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { getPOList } from '../../../api/PurchaseOrder'
import { getEntityId } from '../../../services/utilities'
import { INVOICES } from '../../../constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, #008744)'

function fmtMoney(amount, currency = 'AED') {
  if (amount == null) return '—'
  const num = Number(amount)
  if (isNaN(num)) return '—'
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = dayjs(dateStr)
  return d.isValid() ? d.format('DD/MM/YYYY') : dateStr
}

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

function POStatusBadge({ status }) {
  const norm = String(status || 'OPEN').toUpperCase().replace(/\s+/g, '_')
  const tone = PO_STATUS_TONE[norm] || 'neutral'

  if (tone === 'success') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          background: '#E6F5EA',
          color: '#2D9A47',
          border: '1px solid #B5E3C4'
        }}
      >
        {status || 'OPEN'}
      </span>
    )
  }
  if (tone === 'error') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          background: '#FEE2E2',
          color: '#DC2626',
          border: '1px solid #FECACA'
        }}
      >
        {status || 'BLOCKED'}
      </span>
    )
  }
  if (tone === 'warning') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          background: '#FEF3C7',
          color: '#D97706',
          border: '1px solid #FDE68A'
        }}
      >
        {status || 'EXPIRED'}
      </span>
    )
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        background: '#F3F4F6',
        color: '#6B7280',
        border: '1px solid #E5E7EB'
      }}
    >
      {status || 'CLOSED'}
    </span>
  )
}

function FilterField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
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

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
  unit = 'purchase orders'
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = pageWindow(page, Math.max(1, totalPages))

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 18px',
        borderTop: '1px solid #EEF0F2',
        background: '#FFFFFF',
        fontSize: 12,
        color: '#6B7280'
      }}
    >
      <span>
        Showing {from} to {to} of {total.toLocaleString('en-US')} {unit}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            color: page <= 1 ? '#9CA3AF' : '#374151',
            opacity: page <= 1 ? 0.5 : 1
          }}
        >
          ‹
        </button>
        {pages.map((p, idx) =>
          p === 'gap' ? (
            <span key={`gap-${idx}`} style={{ padding: '0 4px', color: '#9CA3AF' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 28,
                height: 28,
                padding: '0 6px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                borderColor: p === page ? BRAND : '#E5E7EB',
                background: p === page ? BRAND : '#FFFFFF',
                color: p === page ? '#FFFFFF' : '#374151',
                cursor: 'pointer'
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            color: page >= totalPages ? '#9CA3AF' : '#374151',
            opacity: page >= totalPages ? 0.5 : 1
          }}
        >
          ›
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize && onPageSize(Number(e.target.value))}
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 4,
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            fontSize: 12,
            color: '#374151'
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  )
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
  const sortBy = searchParams.get('sortBy') || 'PO_date'
  const sortDir = searchParams.get('sortDir') || 'DESC'

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

  const handleSort = (columnKey) => {
    let nextDir = 'ASC'
    if (sortBy === columnKey) {
      if (sortDir === 'ASC') nextDir = 'DESC'
      else nextDir = 'ASC'
    }
    const next = new URLSearchParams(searchParams)
    next.set('sortBy', columnKey)
    next.set('sortDir', nextDir)
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
        sort_column: sortBy,
        sort: sortDir,
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
  }, [page, pageSize, searchQuery, statusFilter, openOnlyFilter, sortBy, sortDir])

  useEffect(() => {
    fetchPOs()
  }, [fetchPOs])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setParam('search', searchDraft.trim() || undefined)
  }

  const handleReset = () => {
    setSearchDraft('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const hasActiveFilters = Boolean(
    searchQuery || statusFilter || poTypeFilter || openOnlyFilter
  )

  const handleRowClick = (poNo) => {
    // Exactly like ESSA-: navigates to invoices workbench filtered by this specific PO Number
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
        sort_column: sortBy,
        sort: sortDir,
        ...(statusFilter ? { poStatus: statusFilter } : {})
      })
      const items = res?.data?.data?.results || []
      const header = 'PO Number,Vendor Code,Vendor,Type,Total Amount,Open Amount,Currency,Valid To,Status'
      const rows = items.map((p) => {
        const total = Number(p.POValue || p.totalAmount || 0)
        const inv = Number(p.InvValue || 0)
        const open = Math.max(0, total - inv)
        return [
          p.PONo,
          p.Vendor_SAP_Code || p.Vendor_id || '',
          p.vendor?.Vendor_Name_EN || p.Vendor_Name_EN || '',
          p.poType || 'Standard PO',
          total,
          open,
          p.PO_currency || 'AED',
          fmtDate(p.PO_date),
          p.POStatus || 'OPEN'
        ]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      })
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eapa-purchase-orders-${dayjs().format('YYYYMMDD-HHmmss')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <LeftPageContainer style={{ padding: '16px 20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <PageHeader
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Purchase Orders' }]}
        title="Purchase Orders"
        description="All purchase orders from the SAP reference data, with open value against each. PO invoices match against these — no approval workflow applies to PO invoices."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} /> {exporting ? 'Preparing…' : 'Export'}
          </Button>
        }
      />

      <Card
        pad={false}
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ESSA- Style Filter Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 12,
            padding: '12px 18px',
            borderBottom: '1px solid #EEF0F2',
            background: '#FAFAFA'
          }}
        >
          <FilterField label="Search">
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Search PO number or vendor…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onBlur={() => setParam('search', searchDraft.trim() || undefined)}
                style={{
                  width: 240,
                  height: 34,
                  padding: '0 10px 0 32px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </form>
          </FilterField>

          <FilterField label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setParam('status', e.target.value || undefined)}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                fontSize: 13,
                minWidth: 110,
                outline: 'none'
              }}
            >
              <option value="">Any</option>
              <option value="Open">OPEN</option>
              <option value="Closed">CLOSED</option>
              <option value="Completed">COMPLETED</option>
              <option value="Blocked">BLOCKED</option>
            </select>
          </FilterField>

          <FilterField label="PO Type">
            <select
              value={poTypeFilter}
              onChange={(e) => setParam('poType', e.target.value || undefined)}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                fontSize: 13,
                minWidth: 130,
                outline: 'none'
              }}
            >
              <option value="">Any</option>
              <option value="Standard PO">Standard PO</option>
              <option value="Service PO">Service PO</option>
              <option value="Asset PO">Asset PO</option>
            </select>
          </FilterField>

          <FilterField label="Open Value">
            <select
              value={openOnlyFilter}
              onChange={(e) => setParam('openOnly', e.target.value || undefined)}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                fontSize: 13,
                minWidth: 120,
                outline: 'none'
              }}
            >
              <option value="">Any</option>
              <option value="true">Still open</option>
              <option value="false">Fully invoiced</option>
            </select>
          </FilterField>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 34,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                color: '#4B5563',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}

          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
            {totalCount.toLocaleString('en-US')} purchase orders · SAP reference data
          </span>
        </div>

        {/* Scrollable Table Viewport with ESSA- Columns */}
        <div
          className="dx-table-wrap-scroll"
          style={{
            maxHeight: 'calc(100vh - 315px)',
            minHeight: 200,
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          <table
            className="dx-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              textAlign: 'left'
            }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
              <tr
                style={{
                  background: BRAND,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderBottom: '1px solid #E5E7EB'
                }}
              >
                <th
                  onClick={() => handleSort('PONo')}
                  style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '13%', cursor: 'pointer', userSelect: 'none' }}
                >
                  PO NUMBER {sortBy === 'PONo' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th
                  onClick={() => handleSort('Vendor_Name_EN')}
                  style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '25%', cursor: 'pointer', userSelect: 'none' }}
                >
                  VENDOR {sortBy === 'Vendor_Name_EN' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th
                  style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '11%', whiteSpace: 'nowrap' }}
                >
                  TYPE
                </th>
                <th
                  onClick={() => handleSort('POValue')}
                  style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '14%', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                >
                  TOTAL VALUE {sortBy === 'POValue' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th
                  style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '14%', textAlign: 'right' }}
                >
                  OPEN VALUE
                </th>
                <th
                  onClick={() => handleSort('PO_date')}
                  style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '11%', cursor: 'pointer', userSelect: 'none' }}
                >
                  VALID TO {sortBy === 'PO_date' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, color: '#FFFFFF', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', width: '10%', textAlign: 'center' }}>
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
                    Loading purchase orders from database…
                  </td>
                </tr>
              ) : poList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48 }}>
                    <EmptyState
                      title="No purchase orders found"
                      description={hasActiveFilters ? 'Try adjusting your search query or filters.' : 'No purchase orders are currently registered.'}
                    />
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
                    <tr
                      key={poNo || idx}
                      onClick={() => handleRowClick(poNo)}
                      title={`Click to view invoices for PO ${poNo}`}
                      style={{
                        borderBottom: '1px solid #EEF0F2',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F9F3')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA')}
                    >
                      {/* 1. PO Number */}
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#008744' }}>
                        {poNo}
                      </td>

                      {/* 2. Vendor */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {vendorName}
                        </div>
                        {vendorCode && (
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{vendorCode}</div>
                        )}
                      </td>

                      {/* 3. Type */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#F3F4F6',
                            color: '#4B5563',
                            border: '1px solid #E5E7EB',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {poType}
                        </span>
                      </td>

                      {/* 4. Total Value */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                        {fmtMoney(totalAmount, currency)}
                      </td>

                      {/* 5. Open Value */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {openAmount > 0 ? (
                          <span style={{ fontWeight: 600, color: '#008744' }}>
                            {fmtMoney(openAmount, currency)}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 600,
                              background: '#F3F4F6',
                              color: '#6B7280',
                              border: '1px solid #E5E7EB'
                            }}
                          >
                            Fully invoiced
                          </span>
                        )}
                      </td>

                      {/* 6. Valid To */}
                      <td style={{ padding: '10px 14px', color: '#4B5563', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {fmtDate(validTo)}
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <POStatusBadge status={status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pinned Bottom Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={totalCount}
          pageSize={pageSize}
          unit="purchase orders"
          onPage={(p) => setParam('page', String(p))}
          onPageSize={(s) => setParam('pageSize', String(s))}
        />
      </Card>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || {}
})

export default connect(mapStateToProps)(PurchaseOrdersComp)
