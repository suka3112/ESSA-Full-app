import { useCallback, useEffect, useMemo, useState } from 'react'
import { connect } from 'react-redux'
import { ChevronLeft, ChevronRight, Copy, FlaskConical, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { Dialog } from '../ui/Dialog'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'
import { deleteWhtRecord, fetchWhtConfig, saveWhtRecord } from 'api/whtConfig'
import { getEssaVendors } from 'api/essaVendors'
import { DASHBOARD } from 'constants/url'
import { FacilityDrawer, RuleDrawer, SbujkDrawer, TreatyDrawer } from './forms'
import TestRuleDrawer from './TestRuleDrawer'
import { BUSINESS_SCOPES, QUALIFICATIONS, REFERENCE_MASTERS, fmtDate, optionLabel, pct, referenceLabel } from './options'
import '../../../assets/scss/essa/dashboard.scss'
import '../../../assets/scss/essa/wht-config.scss'

const TABS = [
  { value: 'rules', label: 'WHT Rule Matrix', noun: 'rule', add: 'Add rule' },
  { value: 'treaties', label: 'Tax Treaty Rates', noun: 'treaty rate', add: 'Add treaty rate' },
  { value: 'facilities', label: 'Vendor Tax Facilities (SKB / PP23)', noun: 'facility', add: 'Add facility' },
  { value: 'sbujk', label: 'SBUJK / Construction Classification', noun: 'SBUJK', add: 'Add SBUJK' }
]

const PAGE_SIZES = [10, 25, 50]

/** Status as shown: masters past their valid-to date read "Expired". */
const shownStatus = (row) => (row.isExpired && row.status === 'ACTIVE' ? 'EXPIRED' : row.status)
const STATUS_TONE = { ACTIVE: 'success', DRAFT: 'warn', INACTIVE: 'neutral', EXPIRED: 'danger' }
const StatusBadge = ({ row }) => {
  const s = shownStatus(row)
  return <Badge tone={STATUS_TONE[s] || 'neutral'}>{s.charAt(0) + s.slice(1).toLowerCase()}</Badge>
}

const STATUS_FILTERS = {
  rules: [['ACTIVE', 'Active rules'], ['DRAFT', 'Draft'], ['INACTIVE', 'Inactive'], ['', 'All rules']],
  treaties: [['', 'All countries'], ['ACTIVE', 'Active'], ['DRAFT', 'Draft'], ['INACTIVE', 'Inactive']],
  facilities: [['', 'All facilities'], ['ACTIVE', 'Active'], ['EXPIRED', 'Expired'], ['INACTIVE', 'Inactive']],
  sbujk: [['', 'All records'], ['ACTIVE', 'Active'], ['EXPIRED', 'Expired'], ['INACTIVE', 'Inactive']]
}

const SEARCH_FIELDS = {
  rules: (r) => [r.category, r.condition, r.subCondition, r.whtArticle, r.sapWhtCode, r.rateText, referenceLabel(r.referenceMaster)],
  treaties: (r) => [r.country, r.serviceTreatment],
  facilities: (r) => [r.vendorCode, r.vendorName, r.facilityType, r.certificateNo],
  sbujk: (r) => [r.vendorCode, r.vendorName, r.sbujkNo, r.businessScopeText, optionLabel(BUSINESS_SCOPES, r.businessScope)]
}

function RefLink({ value, onOpen }) {
  const ref = REFERENCE_MASTERS.find((r) => r.value === value)
  if (!ref || !ref.value) return '—'
  return ref.tab ? (
    <button type="button" className="wht-link" onClick={() => onOpen(ref.tab)}>{ref.label}</button>
  ) : (
    <span>{ref.label}</span>
  )
}

function RowActions({ onEdit, onCopy, onDelete, noun }) {
  return (
    <span className="wht-actions">
      <button type="button" className="wht-icon-btn" onClick={onEdit} title={`Edit ${noun}`} aria-label={`Edit ${noun}`}><Pencil size={14} /></button>
      {onCopy ? (
        <button type="button" className="wht-icon-btn" onClick={onCopy} title={`Duplicate ${noun}`} aria-label={`Duplicate ${noun}`}><Copy size={14} /></button>
      ) : null}
      <button type="button" className="wht-icon-btn is-danger" onClick={onDelete} title={`Delete ${noun}`} aria-label={`Delete ${noun}`}><Trash2 size={14} /></button>
    </span>
  )
}

function columnsFor(tab, openTab) {
  switch (tab) {
    case 'rules':
      return [
        ['Step', (r) => <span className={`wht-step wht-step--${r.step}`}>{r.step}</span>, 'is-narrow'],
        ['Category', (r) => r.category],
        ['Condition', (r) => r.condition],
        ['Sub-condition', (r) => r.subCondition || '—'],
        ['WHT Article', (r) => r.whtArticle, 'is-nowrap'],
        ['Rate', (r) => (
          <span className="wht-rate">
            {r.rateText}
            {r.rateType === 'TREATY' ? <small className="wht-rate__tag">treaty</small> : null}
          </span>
        ), 'is-nowrap'],
        ['SAP WHT Code', (r) => <span className="wht-mono">{r.sapWhtCode}</span>, 'is-nowrap'],
        ['Reference Master', (r) => <RefLink value={r.referenceMaster} onOpen={openTab} />],
        ['Effective From', (r) => fmtDate(r.effectiveFrom), 'is-nowrap'],
        ['Effective To', (r) => fmtDate(r.effectiveTo), 'is-nowrap'],
        ['Status', (r) => <StatusBadge row={r} />]
      ]
    case 'treaties':
      return [
        ['Country', (r) => <span className="wht-strong">{r.country}</span>],
        ['Dividend (Portfolio)', (r) => pct(r.dividendPortfolioPct), 'is-num'],
        ['Dividend (Substantial)', (r) => pct(r.dividendSubstantialPct), 'is-num'],
        ['Interest', (r) => pct(r.interestPct), 'is-num'],
        ['Royalties', (r) => pct(r.royaltyPct), 'is-num'],
        ['Service / FTS Rate', (r) => pct(r.servicePct), 'is-num'],
        ['Service Treatment', (r) => r.serviceTreatment || '—'],
        ['Effective From', (r) => fmtDate(r.effectiveFrom), 'is-nowrap'],
        ['Status', (r) => <StatusBadge row={r} />]
      ]
    case 'facilities':
      return [
        ['Vendor Code', (r) => <span className="wht-mono">{r.vendorCode}</span>],
        ['Vendor Name', (r) => <span className="wht-strong">{r.vendorName}</span>],
        ['Facility Type', (r) => <span className={`wht-chip wht-chip--${r.facilityType}`}>{r.facilityType}</span>],
        ['Certificate No.', (r) => r.certificateNo],
        ['Valid From', (r) => fmtDate(r.validFrom), 'is-nowrap'],
        ['Valid To', (r) => fmtDate(r.validTo), 'is-nowrap'],
        ['Status', (r) => <StatusBadge row={r} />]
      ]
    default:
      return [
        ['Vendor Code', (r) => <span className="wht-mono">{r.vendorCode}</span>],
        ['Vendor Name', (r) => <span className="wht-strong">{r.vendorName}</span>],
        ['SBUJK No.', (r) => r.sbujkNo],
        ['Business Scope', (r) => (
          <span className="wht-stack">
            {optionLabel(BUSINESS_SCOPES, r.businessScope)}
            {r.businessScopeText ? <small>{r.businessScopeText}</small> : null}
          </span>
        )],
        ['Qualification', (r) => optionLabel(QUALIFICATIONS, r.qualification)],
        ['Valid To', (r) => fmtDate(r.validTo), 'is-nowrap'],
        ['Status', (r) => <StatusBadge row={r} />]
      ]
  }
}

function Pager({ page, pages, total, from, to, pageSize, onPage, onPageSize }) {
  return (
    <div className="wht-pager">
      <span>{total ? `Showing ${from}–${to} of ${total}` : 'Nothing to show'}</span>
      <span className="wht-pager__nav">
        <button type="button" className="wht-icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={`wht-page${n === page ? ' is-on' : ''}`} onClick={() => onPage(n)}>{n}</button>
        ))}
        <button type="button" className="wht-icon-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
        <select className="wht-select wht-select--sm" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page">
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </span>
    </div>
  )
}

function EssaWhtConfig({ userInfo: { userType = 'admin' } = {} }) {
  const [data, setData] = useState({ rules: [], treaties: [], facilities: [], sbujk: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('rules')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState(null) // { list, record }
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [vendors, setVendors] = useState([])

  const load = useCallback(async () => {
    try {
      setData(await fetchWhtConfig())
      setLoadError('')
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Could not load the WHT configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    getEssaVendors({ pageSize: 500 }).then((res) => setVendors((res?.items || []).map((v) => ({ code: v.code, name: v.name }))))
  }, [load])

  const changeTab = (next) => {
    setTab(next)
    setSearch('')
    setStatus(STATUS_FILTERS[next][0][0])
    setPage(1)
  }

  const meta = TABS.find((t) => t.value === tab)
  const rows = data[tab] || []
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (status && shownStatus(r) !== status) return false
      if (!needle) return true
      return SEARCH_FIELDS[tab](r).some((v) => String(v || '').toLowerCase().includes(needle))
    })
  }, [rows, search, status, tab])

  const pages = Math.max(1, Math.ceil(visible.length / pageSize))
  const current = Math.min(page, pages)
  const slice = visible.slice((current - 1) * pageSize, current * pageSize)
  const columns = columnsFor(tab, changeTab)

  const save = async (record) => {
    const saved = await saveWhtRecord(editing.list, record)
    showEssaSuccessToast('Saved', `${TABS.find((t) => t.value === editing.list).noun} saved${saved?.status === 'DRAFT' ? ' as draft' : ''}.`)
    setEditing(null)
    await load()
  }

  const confirmDelete = async () => {
    setDeletingBusy(true)
    try {
      await deleteWhtRecord(deleting.list, deleting.record.id)
      showEssaSuccessToast('Deleted', `${TABS.find((t) => t.value === deleting.list).noun} removed.`)
      setDeleting(null)
      await load()
    } catch (err) {
      showEssaErrorToast('Could not delete', err.message)
    } finally {
      setDeletingBusy(false)
    }
  }

  const duplicate = (record) => {
    const { id, updatedAt, isExpired, ...rest } = record
    setEditing({ list: tab, record: { ...rest, status: 'DRAFT', ...(tab === 'rules' ? { displayOrder: (record.displayOrder || 0) + 1 } : {}) } })
  }

  const deleteLabel = (list, r) =>
    list === 'rules' ? `step ${r.step} · ${r.category} · ${[r.condition, r.subCondition].filter(Boolean).join(' · ')}`
      : list === 'treaties' ? r.country
        : `${r.vendorName} (${list === 'facilities' ? r.certificateNo : r.sbujkNo})`

  return (
    <LeftPageContainer>
      <div className="essa-dashboard wht-page">
        <PageHeader
          breadcrumb={[
            { label: 'Home', to: `/${userType}${DASHBOARD}` },
            { label: 'Administration' },
            { label: 'WHT Configuration' }
          ]}
          title="WHT Configuration"
          description="Maintain WHT rules, tax treaty rates and vendor tax facilities for automatic tax determination."
        />

        <Tabs
          className="wht-tabs"
          tabs={TABS.map((t) => ({ value: t.value, label: t.label, badge: data[t.value]?.length ?? null }))}
          value={tab}
          onChange={changeTab}
        />

        <Card pad={false}>
          <div className="wht-toolbar">
            <h2 className="wht-toolbar__title">{meta.label}</h2>
            <span className="wht-search">
              <Search size={14} />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder={tab === 'rules' ? 'Search rule, condition, article…' : tab === 'treaties' ? 'Search country…' : 'Search vendor…'}
                aria-label={`Search ${meta.label}`} />
            </span>
            <select className="wht-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status filter">
              {STATUS_FILTERS[tab].map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
            </select>
            <span className="wht-toolbar__spacer" />
            {tab === 'rules' ? (
              <Button variant="secondary" onClick={() => setTestOpen(true)}>
                <FlaskConical size={14} /> Test WHT rule
              </Button>
            ) : null}
            <Button onClick={() => setEditing({ list: tab, record: null })}>
              <Plus size={14} /> {meta.add}
            </Button>
          </div>

          {tab === 'treaties' && rows.some((r) => r.status === 'DRAFT') ? (
            <p className="wht-banner">
              Draft rates are not used for determination. Confirm each country against the current tax treaty, then activate it.
            </p>
          ) : null}

          <div className="wht-table-wrap">
            <table className="wht-table">
              <thead>
                <tr>
                  {columns.map(([label, , cls]) => <th key={label} className={cls}>{label}</th>)}
                  <th className="is-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length + 1}><div className="wht-state"><Loader2 size={18} className="wht-spin" /> Loading…</div></td></tr>
                ) : loadError ? (
                  <tr><td colSpan={columns.length + 1}><div className="wht-state">{loadError}</div></td></tr>
                ) : slice.length === 0 ? (
                  <tr><td colSpan={columns.length + 1}>
                    <div className="wht-state">
                      {rows.length ? 'Nothing matches these filters.' : `No ${meta.noun} records yet. Use “${meta.add}” to create one.`}
                    </div>
                  </td></tr>
                ) : (
                  slice.map((r) => (
                    <tr key={r.id}>
                      {columns.map(([label, render, cls]) => <td key={label} className={cls}>{render(r)}</td>)}
                      <td className="is-actions">
                        <RowActions
                          noun={meta.noun}
                          onEdit={() => setEditing({ list: tab, record: r })}
                          onCopy={tab === 'rules' || tab === 'treaties' ? () => duplicate(r) : null}
                          onDelete={() => setDeleting({ list: tab, record: r })}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && !loadError ? (
            <Pager page={current} pages={pages} total={visible.length} pageSize={pageSize}
              from={visible.length ? (current - 1) * pageSize + 1 : 0} to={Math.min(current * pageSize, visible.length)}
              onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} />
          ) : null}
        </Card>
      </div>

      <RuleDrawer open={editing?.list === 'rules'} rule={editing?.record} onClose={() => setEditing(null)} onSave={save} />
      <TreatyDrawer open={editing?.list === 'treaties'} treaty={editing?.record} onClose={() => setEditing(null)} onSave={save} />
      <FacilityDrawer open={editing?.list === 'facilities'} facility={editing?.record} vendors={vendors} onClose={() => setEditing(null)} onSave={save} />
      <SbujkDrawer open={editing?.list === 'sbujk'} record={editing?.record} vendors={vendors} onClose={() => setEditing(null)} onSave={save} />
      <TestRuleDrawer open={testOpen} onClose={() => setTestOpen(false)} vendors={vendors} />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title={`Delete ${deleting ? TABS.find((t) => t.value === deleting.list).noun : ''}?`}
        description={deleting ? `${deleteLabel(deleting.list, deleting.record)} will be removed. The change is kept in the configuration change log.` : ''}
        width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deletingBusy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deletingBusy}>{deletingBusy ? 'Deleting…' : 'Delete'}</Button>
          </>
        }
      />
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || state.userInfo || {}
})

export default connect(mapStateToProps)(EssaWhtConfig)
