import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertOctagon,
  Clock,
  FileText,
  Hourglass,
  RotateCcw
} from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts'

import { getSlaInstance } from 'api/sla'
import SlaLayout from './SlaLayout'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Drawer } from '../ui/Drawer'
import { FilterBar, FilterField, FilterSearch, SortTh } from '../ui/listPage'
import {
  PolicyCodeLink,
  RuntimeStatusBadge,
  label,
  remainingLabel,
  slaDate,
  slaEditTo,
  useSlaInstanceSummary,
  useSlaInstances,
  useSlaMeta,
  useSlaPolicies
} from '../lib/sla'

function NativeSelect({ className, ...props }) {
  return <select className={`dx-select ${className || ''}`} {...props} />
}

function Widget({ icon: Icon, label: title, value, hint, tone }) {
  const colors = {
    success: 'text-essa-700 bg-essa-50',
    info: 'text-blue-700 bg-blue-50',
    warn: 'text-amber-700 bg-amber-50',
    danger: 'text-red-700 bg-red-50',
    muted: 'text-ink-muted bg-line-soft'
  }
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5 shadow-card">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${colors[tone] || colors.muted}`}>
          <Icon size={16} />
        </span>
        <div>
          <div className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">{title}</div>
          <div className="text-lg font-semibold leading-tight text-ink">{value}</div>
          <div className="text-2xs text-ink-muted">{hint}</div>
        </div>
      </div>
    </div>
  )
}

function MiniBars({ title, data }) {
  return (
    <Card title={title} className="min-h-[180px]">
      {data.length === 0 ? (
        <p className="text-xs text-ink-muted">No open clocks.</p>
      ) : (
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11 }} />
              <ReTooltip />
              <Bar dataKey="count" fill="#2C9842" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function countBy(rows, keyFn) {
  const map = new Map()
  rows.forEach((row) => {
    const name = keyFn(row) || '—'
    map.set(name, (map.get(name) || 0) + 1)
  })
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

function slaDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${slaDate(iso)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

export default function SlaMonitor() {
  const { data: meta } = useSlaMeta()
  const { data: policyData } = useSlaPolicies()
  const { data: summary } = useSlaInstanceSummary()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [stage, setStage] = useState('')
  const [owner, setOwner] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [includeClosed, setIncludeClosed] = useState(false)
  const [applied, setApplied] = useState({
    q: '',
    status: '',
    stage: '',
    owner: '',
    policyId: '',
    dueFrom: '',
    dueTo: '',
    includeClosed: false
  })
  const [sortKey, setSortKey] = useState('dueAt')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedId, setSelectedId] = useState(null)

  const query = useMemo(
    () => ({
      q: applied.q || undefined,
      status: applied.status || undefined,
      stage: applied.stage || undefined,
      owner: applied.owner || undefined,
      policyId: applied.policyId || undefined,
      dueFrom: applied.dueFrom || undefined,
      dueTo: applied.dueTo || undefined,
      includeClosed: applied.includeClosed
    }),
    [applied]
  )

  const { data: instances = [], isLoading } = useSlaInstances(query)
  const { data: selected, isLoading: detailLoading } = useQuery({
    queryKey: ['sla-instance', selectedId],
    queryFn: () => getSlaInstance(selectedId),
    enabled: Boolean(selectedId)
  })

  const widgets = summary || { open: 0, dueToday: 0, atRisk: 0, breached: 0, paused: 0 }

  const charts = useMemo(
    () => ({
      stage: countBy(instances, (i) => label(meta?.stages, i.stage)),
      category: countBy(instances, (i) => i.categoryName),
      policy: countBy(instances, (i) => i.policyCode)
    }),
    [instances, meta]
  )

  const filtered = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const valueOf = (row) => {
      if (sortKey === 'remaining') return row.remainingMs ?? 0
      if (sortKey === 'startedAt') return row.startedAt || ''
      if (sortKey === 'dueAt') return row.dueAt || ''
      if (sortKey === 'status') return row.status
      if (sortKey === 'owner') return row.owner
      if (sortKey === 'policy') return row.policyCode
      if (sortKey === 'version') return row.policyVersion ?? 0
      return row.reference
    }
    return [...instances].sort((a, b) => {
      const va = valueOf(a)
      const vb = valueOf(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [instances, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const apply = () => {
    setApplied({
      q: search.trim(),
      status,
      stage,
      owner,
      policyId,
      dueFrom: from,
      dueTo: to,
      includeClosed
    })
  }

  const reset = () => {
    setSearch('')
    setStatus('')
    setStage('')
    setOwner('')
    setPolicyId('')
    setFrom('')
    setTo('')
    setIncludeClosed(false)
    setApplied({
      q: '',
      status: '',
      stage: '',
      owner: '',
      policyId: '',
      dueFrom: '',
      dueTo: '',
      includeClosed: false
    })
  }

  const events = selected?.events || []

  return (
    <SlaLayout
      active="monitor"
      title="SLA Runtime Monitor"
      description="Operational view of the SLA instances created for invoices, approvals and document requests. Reads runtime data only — it does not change any policy."
    >
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <Widget icon={Clock} label="Open SLA" value={widgets.open} hint="active timers" tone="success" />
        <Widget icon={Clock} label="Due today" value={widgets.dueToday} hint="" tone="info" />
        <Widget icon={Hourglass} label="At risk" value={widgets.atRisk} hint="inside warning threshold" tone="warn" />
        <Widget icon={AlertOctagon} label="Breached" value={widgets.breached} hint="immediate action required" tone="danger" />
        <Widget icon={FileText} label="Paused" value={widgets.paused} hint="clock stopped" tone="muted" />
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-3">
        <MiniBars title="By stage" data={charts.stage} />
        <MiniBars title="By invoice category" data={charts.category} />
        <MiniBars title="By SLA policy" data={charts.policy} />
      </div>

      <Card className="overflow-hidden p-0">
        <FilterBar className="gap-x-3 gap-y-2 px-3 py-2.5">
          <FilterField label="Search" className="min-w-[200px] flex-1">
            <FilterSearch
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice, reference, vendor..."
              className="dx-et-search-input"
            />
          </FilterField>
          <FilterField label="Status">
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-[130px]">
              <option value="">Any status</option>
              {(meta?.runtimeStatuses || []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Stage">
            <NativeSelect value={stage} onChange={(e) => setStage(e.target.value)} className="w-[150px]">
              <option value="">Any stage</option>
              {(meta?.stages || []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Owner / Team">
            <NativeSelect value={owner} onChange={(e) => setOwner(e.target.value)} className="w-[150px]">
              <option value="">Any owner</option>
              {(meta?.owners || []).map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Policy">
            <NativeSelect value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="w-[180px]">
              <option value="">Any policy</option>
              {(policyData?.policies || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}{p.version ? ` v${p.version}` : ''}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Due from">
            <input type="date" className="dx-input h-9" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FilterField>
          <FilterField label="Due to">
            <input type="date" className="dx-input h-9" value={to} onChange={(e) => setTo(e.target.value)} />
          </FilterField>
          <label className="mb-1 flex items-center gap-1.5 text-xs text-ink-secondary">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
            />
            Closed clocks
          </label>
          <button
            type="button"
            className="mb-0.5 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
            onClick={reset}
          >
            <RotateCcw size={12} /> Reset
          </button>
          <Button size="sm" className="mb-0.5" type="button" onClick={apply}>
            Apply Filters
          </Button>
        </FilterBar>

        <div className="email-templates-table">
          <div className="dx-table-wrap dx-table-wrap-scroll">
            <table className="dx-table">
              <thead>
                <tr>
                  <SortTh col="reference" sortKey={sortKey} onSort={toggleSort}>
                    Invoice / Ref
                  </SortTh>
                  <SortTh col="policy" sortKey={sortKey} onSort={toggleSort}>
                    SLA Policy
                  </SortTh>
                  <SortTh col="version" sortKey={sortKey} onSort={toggleSort}>
                    Version
                  </SortTh>
                  <SortTh col="owner" sortKey={sortKey} onSort={toggleSort}>
                    Owner
                  </SortTh>
                  <SortTh col="startedAt" sortKey={sortKey} onSort={toggleSort}>
                    Started
                  </SortTh>
                  <SortTh col="dueAt" sortKey={sortKey} onSort={toggleSort}>
                    Due
                  </SortTh>
                  <SortTh col="status" sortKey={sortKey} onSort={toggleSort}>
                    Status
                  </SortTh>
                  <SortTh col="remaining" sortKey={sortKey} onSort={toggleSort}>
                    Remaining / Breach
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-ink-muted">
                      Loading instances…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <p className="py-8 text-center text-xs text-ink-muted">
                        No SLA instances yet. Clocks appear here after a policy is published and an invoice starts that SLA.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td>
                        <div className="font-medium text-ink">{row.reference}</div>
                        <div className="text-2xs text-ink-muted">{row.vendorName}</div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <PolicyCodeLink code={row.policyCode} to={slaEditTo(row.policyId)} />
                      </td>
                      <td>{row.policyVersion != null ? `v${row.policyVersion}` : '—'}</td>
                      <td>{row.owner}</td>
                      <td>{slaDate(row.startedAt)}</td>
                      <td>{slaDate(row.dueAt)}</td>
                      <td>
                        <RuntimeStatusBadge status={row.status} meta={meta} />
                      </td>
                      <td className={row.remainingMs < 0 ? 'font-semibold text-red-600' : ''}>
                        {remainingLabel(row.remainingMs)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={selected?.reference || selected?.invoiceNumber || 'SLA instance'}
        width="max-w-lg"
      >
        {detailLoading && !selected ? (
          <p className="text-xs text-ink-muted">Loading instance…</p>
        ) : selected ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <RuntimeStatusBadge status={selected.status} meta={meta} />
              <span className="text-xs text-ink-muted">
                {selected.policyCode}
                {selected.policyVersion != null ? ` · v${selected.policyVersion}` : ''}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-ink-muted">Owner</dt>
                <dd className="mb-0 font-medium">{selected.owner || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Stage</dt>
                <dd className="mb-0 font-medium">{label(meta?.stages, selected.stage)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Started</dt>
                <dd className="mb-0">{slaDateTime(selected.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Due</dt>
                <dd className="mb-0">{slaDateTime(selected.dueAt)}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-muted">Events</p>
              {events.length === 0 ? (
                <p className="mb-0 text-xs text-ink-muted">No events recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line-soft rounded-md border border-line">
                  {events.map((event, i) => (
                    <li key={`${event.at}-${i}`} className="px-3 py-2">
                      <p className="mb-0 text-xs font-medium text-ink">{event.type}</p>
                      <p className="mb-0 text-2xs text-ink-muted">{slaDateTime(event.at)}</p>
                      {event.detail ? <p className="mb-0 text-2xs text-ink-secondary">{event.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Instance could not be loaded.</p>
        )}
      </Drawer>
    </SlaLayout>
  )
}
