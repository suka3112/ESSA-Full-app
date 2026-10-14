import { useCallback, useEffect, useMemo, useState } from 'react'
import { connect } from 'react-redux'
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, FlaskConical, Loader2, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react'

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
import { FacilityDrawer, RuleDrawer } from './forms'
import TestRuleDrawer from './TestRuleDrawer'
import TaxRateDocument from './TaxRateDocument'
import { REFERENCE_MASTERS, fmtDate, rateTypeLabel } from './options'
import '../../../assets/scss/essa/dashboard.scss'
import '../../../assets/scss/essa/wht-config.scss'

const PAGE_SIZES = [10, 25, 50]

/** Status as shown: masters past their valid-to date read "Expired". */
const shownStatus = (row) => (row.isExpired && row.status === 'ACTIVE' ? 'EXPIRED' : row.status)
const STATUS_TONE = { ACTIVE: 'success', DRAFT: 'warn', INACTIVE: 'neutral', EXPIRED: 'danger' }
const StatusBadge = ({ row }) => {
  const s = shownStatus(row)
  return <Badge tone={STATUS_TONE[s] || 'neutral'}>{s.charAt(0) + s.slice(1).toLowerCase()}</Badge>
}

const STATUS_FILTERS = {
  rules: [['', 'All rules'], ['ACTIVE', 'Active'], ['DRAFT', 'Draft'], ['INACTIVE', 'Inactive'], ['REVIEW', 'To confirm']],
  facilities: [['', 'All facilities'], ['ACTIVE', 'Active'], ['EXPIRED', 'Expired'], ['INACTIVE', 'Inactive']]
}

const SEARCH_FIELDS = {
  rules: (r) => [r.category, r.condition, r.subCondition, r.whtArticle, r.sapWhtCode, r.rateText],
  facilities: (r) => [r.vendorCode, r.vendorName, r.facilityType, r.certificateNo]
}

function ReferenceCell({ article, reference, onOpen }) {
  const ref = REFERENCE_MASTERS.find((r) => r.value === reference)
  return (
    <span className="wht-stack">
      <span>{article}</span>
      {ref ? (
        ref.tab ? (
          <button type="button" className="wht-link wht-link--sm" onClick={() => onOpen(ref.tab)}>{ref.label}</button>
        ) : (
          <small>{ref.label}</small>
        )
      ) : null}
    </span>
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

function ruleColumns(rateTypes, openTab) {
  return [
    ['#', (r, i) => <span className="wht-num">{i}</span>, 'is-narrow'],
    ['Category', (r) => r.category],
    ['Condition', (r) => r.condition],
    ['Sub-condition', (r) => r.subCondition || '—'],
    ['Article / Reference', (r) => <ReferenceCell article={r.whtArticle} reference={r.referenceMaster} onOpen={openTab} />, 'is-nowrap'],
    ['Rate Type', (r) => rateTypeLabel(rateTypes, r.rateType), 'is-nowrap'],
    ['Rate', (r) => <span className="wht-rate">{r.rateText}</span>, 'is-num'],
    ['SAP WH Code', (r) => (
      <span className="wht-code-cell">
        <span className="wht-mono">{r.sapWhtCode}</span>
        {r.needsReview ? (
          <span className="wht-review" title={r.reviewNote}>
            <AlertTriangle size={12} aria-hidden /> To confirm
            <span className="sr-only">: {r.reviewNote}</span>
          </span>
        ) : null}
      </span>
    ), 'is-nowrap'],
    ['Effective From', (r) => fmtDate(r.effectiveFrom), 'is-nowrap'],
    ['Effective To', (r) => fmtDate(r.effectiveTo), 'is-nowrap'],
    ['Status', (r) => <StatusBadge row={r} />]
  ]
}

const FACILITY_COLUMNS = [
  ['Vendor Code', (r) => <span className="wht-mono">{r.vendorCode}</span>],
  ['Vendor Name', (r) => <span className="wht-strong">{r.vendorName}</span>],
  ['Facility Type', (r) => r.facilityType],
  ['Certificate No.', (r) => r.certificateNo],
  ['Valid From', (r) => fmtDate(r.validFrom), 'is-nowrap'],
  ['Valid To', (r) => fmtDate(r.validTo), 'is-nowrap'],
  ['Status', (r) => <StatusBadge row={r} />]
]

function Pager({ page, pages, total, from, to, pageSize, onPage, onPageSize }) {
  return (
    <div className="wht-pager">
      <span>{total ? `Showing ${from}–${to} of ${total}` : 'Nothing to show'}</span>
      <span className="wht-pager__nav">
        <button type="button" className="wht-icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={`wht-page${n === page ? ' is-on' : ''}`} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>
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
  const [data, setData] = useState({ rules: [], facilities: [], taxonomy: [], sapCodes: [], rateTypes: [], sbujkEnabled: false, taxRateDocument: null })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('rules')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
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
      setLoadError(err.message)
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
    setStatus('')
    setPage(1)
  }

  const reviewCount = data.rules.filter((r) => r.needsReview).length
  const tabs = [
    { value: 'rules', label: 'WHT Rule Matrix', badge: data.rules.length },
    { value: 'taxRates', label: 'Tax Rate Document', badge: data.taxRateDocument ? `v${data.taxRateDocument.versionNo}` : null },
    { value: 'facilities', label: 'Vendor Tax Facilities (SKB / PP23)', badge: data.facilities.length },
    {
      value: 'sbujk',
      label: 'SBUJK',
      icon: Lock,
      disabled: !data.sbujkEnabled,
      title: 'SBUJK configuration is disabled until its business purpose and requirements are confirmed.'
    }
  ]

  const isList = tab === 'rules' || tab === 'facilities'
  const rows = isList ? data[tab] || [] : []
  const visible = useMemo(() => {
    if (!isList) return []
    const needle = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (status === 'REVIEW' ? !r.needsReview : status && shownStatus(r) !== status) return false
      if (!needle) return true
      return SEARCH_FIELDS[tab](r).some((v) => String(v || '').toLowerCase().includes(needle))
    })
  }, [rows, search, status, tab, isList])

  const pages = Math.max(1, Math.ceil(visible.length / pageSize))
  const current = Math.min(page, pages)
  const offset = (current - 1) * pageSize
  const slice = visible.slice(offset, offset + pageSize)
  const columns = tab === 'rules' ? ruleColumns(data.rateTypes, changeTab) : FACILITY_COLUMNS
  const noun = tab === 'rules' ? 'rule' : 'facility'

  const save = async (record) => {
    const saved = await saveWhtRecord(editing.list, record)
    showEssaSuccessToast('Saved', editing.list === 'rules'
      ? `${saved.category} · ${saved.condition}${saved.subCondition ? ` · ${saved.subCondition}` : ''} → ${saved.sapWhtCode} saved${saved.status === 'DRAFT' ? ' as draft' : ''}.`
      : `${saved.facilityType} ${saved.certificateNo} saved.`)
    setEditing(null)
    await load()
  }

  const confirmDelete = async () => {
    setDeletingBusy(true)
    try {
      await deleteWhtRecord(deleting.list, deleting.record.id)
      showEssaSuccessToast('Deleted', `${deleting.list === 'rules' ? 'Rule' : 'Facility'} removed.`)
      setDeleting(null)
      await load()
    } catch (err) {
      showEssaErrorToast('Could not delete', err.message)
    } finally {
      setDeletingBusy(false)
    }
  }

  /** Duplicate = same combination as a draft; the SAP code must be chosen again (one code per rule). */
  const duplicate = (record) => {
    const { id, updatedAt, isExpired, needsReview, reviewNote, sapWhtCode, ...rest } = record
    setEditing({ list: tab, record: { ...rest, sapWhtCode: '', status: 'DRAFT' } })
  }

  const deleteLabel = (list, r) =>
    list === 'rules'
      ? `${[r.category, r.condition, r.subCondition].filter(Boolean).join(' · ')} → ${r.sapWhtCode} (${r.rateText})`
      : `${r.vendorName} (${r.certificateNo})`

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
          description="Maintain WHT rules, the Tax Rate document and vendor tax facilities for automatic tax determination."
        />

        <Tabs className="wht-tabs" tabs={tabs} value={tab} onChange={changeTab} />

        <Card pad={false}>
          {tab === 'taxRates' ? (
            <TaxRateDocument onChanged={load} />
          ) : (
            <>
              <div className="wht-toolbar">
                <h2 className="wht-toolbar__title">{tab === 'rules' ? 'WHT Rule Matrix' : 'Vendor Tax Facilities (SKB / PP23)'}</h2>
                <span className="wht-search">
                  <Search size={14} />
                  <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    placeholder={tab === 'rules' ? 'Search category, condition, code…' : 'Search vendor or certificate…'}
                    aria-label={`Search ${tab === 'rules' ? 'rules' : 'facilities'}`} />
                </span>
                <select className="wht-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status filter">
                  {STATUS_FILTERS[tab].map(([v, l]) => <option key={v || 'all'} value={v}>{v === 'REVIEW' ? `${l} (${reviewCount})` : l}</option>)}
                </select>
                <span className="wht-toolbar__spacer" />
                {tab === 'rules' ? (
                  <Button variant="secondary" onClick={() => setTestOpen(true)}>
                    <FlaskConical size={14} /> Test WHT rule
                  </Button>
                ) : null}
                <Button onClick={() => setEditing({ list: tab, record: null })} disabled={loading || !!loadError}>
                  <Plus size={14} /> {tab === 'rules' ? 'Add rule' : 'Add facility'}
                </Button>
              </div>

              {tab === 'rules' && reviewCount ? (
                <p className="wht-banner" role="status">
                  <AlertTriangle size={14} aria-hidden /> {reviewCount} SAP code mappings are marked <b>To confirm</b>: the WHT Matrix lists several codes for them
                  without saying which applies when. Open a row to see the question; tick “Confirmed” once the tax team agrees.
                </p>
              ) : null}

              <div className="wht-table-wrap">
                <table className="wht-table">
                  <thead>
                    <tr>
                      {columns.map(([label, , cls]) => <th key={label} className={cls} scope="col">{label}</th>)}
                      <th className="is-actions" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={columns.length + 1}><div className="wht-state"><Loader2 size={18} className="wht-spin" /> Loading…</div></td></tr>
                    ) : loadError ? (
                      <tr><td colSpan={columns.length + 1}>
                        <div className="wht-state" role="alert">{loadError}<Button size="sm" variant="secondary" onClick={() => { setLoading(true); load() }}>Retry</Button></div>
                      </td></tr>
                    ) : slice.length === 0 ? (
                      <tr><td colSpan={columns.length + 1}>
                        <div className="wht-state">
                          {rows.length ? 'Nothing matches these filters.' : `No ${noun} records yet. Use “${tab === 'rules' ? 'Add rule' : 'Add facility'}” to create one.`}
                        </div>
                      </td></tr>
                    ) : (
                      slice.map((r, i) => (
                        <tr key={r.id} className={r.needsReview ? 'is-review' : undefined}>
                          {columns.map(([label, render, cls]) => <td key={label} className={cls}>{render(r, offset + i + 1)}</td>)}
                          <td className="is-actions">
                            <RowActions
                              noun={noun}
                              onEdit={() => setEditing({ list: tab, record: r })}
                              onCopy={tab === 'rules' ? () => duplicate(r) : null}
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
                  from={visible.length ? offset + 1 : 0} to={Math.min(offset + pageSize, visible.length)}
                  onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} />
              ) : null}
            </>
          )}
        </Card>
      </div>

      <RuleDrawer open={editing?.list === 'rules'} rule={editing?.record} rules={data.rules} taxonomy={data.taxonomy}
        sapCodes={data.sapCodes} rateTypes={data.rateTypes} onClose={() => setEditing(null)} onSave={save} />
      <FacilityDrawer open={editing?.list === 'facilities'} facility={editing?.record} vendors={vendors} onClose={() => setEditing(null)} onSave={save} />
      <TestRuleDrawer open={testOpen} onClose={() => setTestOpen(false)} vendors={vendors} hasTaxRateDocument={!!data.taxRateDocument} />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title={`Delete ${deleting?.list === 'rules' ? 'rule' : 'facility'}?`}
        description={deleting ? `${deleteLabel(deleting.list, deleting.record)} will be removed. The change is kept in the configuration change log.` : ''}
        width={460}
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
