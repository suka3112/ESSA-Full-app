import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, GitBranch, Pencil, Plus, RotateCcw, Search, Trash2, XCircle } from 'lucide-react'

import SlaLayout from './SlaLayout'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { SortTh } from '../ui/listPage'
import { Skeleton } from '../ui/Skeleton'
import {
  PolicyCodeLink,
  PolicyStatusBadge,
  ProposedNote,
  SLA_SECTIONS,
  label,
  scopeLabel,
  slaCreateTo,
  slaDate,
  slaEditTo,
  targetLabel,
  useSlaMeta,
  useSlaPolicies
} from '../lib/sla'
import { cloneSlaPolicy, deleteSlaPolicy, newSlaPolicyVersion, retireSlaPolicy } from 'api/sla'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'

function NativeSelect({ className, ...props }) {
  return <select className={`dx-select ${className || ''}`} {...props} />
}

function SlaFilterField({ label, className, children }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className || ''}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export default function SlaPolicies() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: meta, isLoading: metaLoading } = useSlaMeta()
  const { data, isLoading } = useSlaPolicies()
  const policies = data?.policies || []

  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('code')
  const [sortDir, setSortDir] = useState('asc')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmRetire, setConfirmRetire] = useState(null)
  const [retireReason, setRetireReason] = useState('')
  const [confirmClone, setConfirmClone] = useState(null)
  const [cloneCode, setCloneCode] = useState('')
  const [busy, setBusy] = useState(false)

  const loading = isLoading || metaLoading

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = policies.filter((p) => {
      if (scopeFilter && p.scopeType !== scopeFilter) return false
      if (stageFilter && p.stage !== stageFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (!q) return true
      return [p.code, p.name, p.description].some((v) => (v || '').toLowerCase().includes(q))
    })
    const dir = sortDir === 'asc' ? 1 : -1
    const valueOf = (p) => {
      if (sortKey === 'scope') return scopeLabel(p, meta)
      if (sortKey === 'stage') return label(meta?.stages, p.stage)
      if (sortKey === 'target') return targetLabel(p)
      if (sortKey === 'effectiveFrom') return p.effectiveFrom
      if (sortKey === 'effectiveTo') return p.effectiveTo || ''
      if (sortKey === 'version') return String(p.version ?? '')
      if (sortKey === 'status') return p.status
      if (sortKey === 'name') return p.name
      return p.code
    }
    return [...rows].sort((a, b) => String(valueOf(a)).localeCompare(String(valueOf(b))) * dir)
  }, [policies, meta, search, scopeFilter, stageFilter, statusFilter, sortKey, sortDir])

  const resetFilters = () => {
    setSearch('')
    setScopeFilter('')
    setStageFilter('')
    setStatusFilter('')
  }

  const remove = async () => {
    try {
      await deleteSlaPolicy(confirmDelete.id)
      await queryClient.invalidateQueries({ queryKey: ['sla-policies'] })
      showEssaSuccessToast('SLA deleted', confirmDelete.code)
      setConfirmDelete(null)
    } catch (e) {
      showEssaErrorToast('Could not delete', e.message)
    }
  }

  const retire = async () => {
    if (!confirmRetire) return
    setBusy(true)
    try {
      await retireSlaPolicy(confirmRetire.id, { reason: retireReason })
      await queryClient.invalidateQueries({ queryKey: ['sla-policies'] })
      showEssaSuccessToast('Policy retired', confirmRetire.code)
      setConfirmRetire(null)
      setRetireReason('')
    } catch (e) {
      showEssaErrorToast('Could not retire', e.message)
    } finally {
      setBusy(false)
    }
  }

  const clonePolicy = async () => {
    const code = cloneCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    if (!confirmClone || !code) return
    setBusy(true)
    try {
      const created = await cloneSlaPolicy(confirmClone.id, { code })
      await queryClient.invalidateQueries({ queryKey: ['sla-policies'] })
      showEssaSuccessToast('Policy cloned', created.code)
      setConfirmClone(null)
      setCloneCode('')
      navigate(slaEditTo(created.id))
    } catch (e) {
      showEssaErrorToast('Could not clone', e.message)
    } finally {
      setBusy(false)
    }
  }

  const createVersion = async (row) => {
    setBusy(true)
    try {
      const created = await newSlaPolicyVersion(row.id)
      await queryClient.invalidateQueries({ queryKey: ['sla-policies'] })
      showEssaSuccessToast('New version created', `${created.code} v${created.version}`)
      navigate(slaEditTo(created.id))
    } catch (e) {
      showEssaErrorToast('Could not create version', e.message)
    } finally {
      setBusy(false)
    }
  }

  const hasFilters = Boolean(search || scopeFilter || stageFilter || statusFilter)

  return (
    <SlaLayout
      active="policies"
      title="SLA Management"
      description="Search, filter, create, clone, activate and retire SLA policies. Policies define the rule; runtime clocks are created when a qualifying invoice, approval or document event occurs."
      actions={
        <Button onClick={() => navigate(slaCreateTo)}>
          <Plus size={14} /> Create SLA
        </Button>
      }
    >
      <Card className="overflow-hidden p-0" pad={false}>
        <form className="sla-filter-bar flex items-end gap-4 px-4 py-3" onSubmit={(e) => e.preventDefault()}>
          <SlaFilterField label="Search" className="min-w-0 flex-[3]">
            <span className="sla-search-wrap relative block w-full">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SLA code or name"
                className="h-10 w-full rounded-md pl-10 text-sm"
                aria-label="Search SLA policies"
              />
            </span>
          </SlaFilterField>
          <SlaFilterField label="Type / Scope" className="w-40 shrink-0">
            <NativeSelect
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              aria-label="Scope filter"
              className="h-10 w-full"
            >
              <option value="">Any scope</option>
              {(meta?.scopeTypes || []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </SlaFilterField>
          <SlaFilterField label="Stage" className="w-40 shrink-0">
            <NativeSelect
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              aria-label="Stage filter"
              className="h-10 w-full"
            >
              <option value="">Any stage</option>
              {(meta?.stages || []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </SlaFilterField>
          <SlaFilterField label="Status" className="w-40 shrink-0">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Status filter"
              className="h-10 w-full"
            >
              <option value="">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="TEST">Tested</option>
              <option value="ACTIVE">Active</option>
              <option value="RETIRED">Retired</option>
            </NativeSelect>
          </SlaFilterField>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={resetFilters}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 bg-transparent px-1 text-sm text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </form>

        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="email-templates-table sla-policies-table">
            <div className="dx-table-wrap">
              <table className="dx-table">
                <thead>
                  <tr>
                    <SortTh col="code" sortKey={sortKey} onSort={toggleSort}>
                      SLA Code
                    </SortTh>
                    <SortTh col="name" sortKey={sortKey} onSort={toggleSort}>
                      SLA Name
                    </SortTh>
                    <SortTh col="scope" sortKey={sortKey} onSort={toggleSort}>
                      Scope
                    </SortTh>
                    <SortTh col="stage" sortKey={sortKey} onSort={toggleSort}>
                      Stage
                    </SortTh>
                    <SortTh col="target" sortKey={sortKey} onSort={toggleSort}>
                      Target
                    </SortTh>
                    <SortTh col="version" sortKey={sortKey} onSort={toggleSort} className="sla-col-fit">
                      Version
                    </SortTh>
                    <SortTh col="effectiveFrom" sortKey={sortKey} onSort={toggleSort}>
                      Effective From
                    </SortTh>
                    <SortTh col="effectiveTo" sortKey={sortKey} onSort={toggleSort}>
                      Effective To
                    </SortTh>
                    <SortTh col="status" sortKey={sortKey} onSort={toggleSort} className="sla-col-fit">
                      Status
                    </SortTh>
                    <th className="sla-col-fit sla-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <p className="py-8 text-center text-xs text-ink-muted">
                          {hasFilters
                            ? 'No SLA policies match these filters.'
                            : 'No SLA policies yet. Create a policy to get started.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <PolicyCodeLink code={row.code} to={slaEditTo(row.id)} />
                        </td>
                        <td>
                          <span className="text-xs font-medium" title={row.description}>
                            {row.name}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs">{scopeLabel(row, meta)}</span>
                        </td>
                        <td>
                          <span className="text-xs">{label(meta?.stages, row.stage)}</span>
                        </td>
                        <td>
                          <span className="inline-flex flex-wrap items-center gap-1 whitespace-nowrap text-xs">
                            {row.timer?.duration == null ? (
                              <span className="text-2xs text-ink-faint">Not applicable</span>
                            ) : (
                              <span className="font-medium">{targetLabel(row)}</span>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="whitespace-nowrap text-xs">{row.version ? `v${row.version}` : '—'}</span>
                        </td>
                        <td>
                          <span className="whitespace-nowrap text-xs">{slaDate(row.effectiveFrom)}</span>
                        </td>
                        <td>
                          <span className="whitespace-nowrap text-xs">{slaDate(row.effectiveTo)}</span>
                        </td>
                        <td className="sla-col-fit">
                          <PolicyStatusBadge status={row.status} />
                        </td>
                        <td className="sla-col-fit sla-col-actions">
                          <div className="flex justify-end gap-0.5">
                            {row.status === 'DRAFT' || row.status === 'TEST' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Edit ${row.code}`}
                                  title="Edit"
                                  onClick={() => navigate(slaEditTo(row.id))}
                                >
                                  <Pencil size={13} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Delete ${row.code}`}
                                  title="Delete"
                                  className="text-red-600"
                                  onClick={() => setConfirmDelete(row)}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            ) : null}
                            {row.status === 'ACTIVE' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Create new version of ${row.code}`}
                                  title="Create new version"
                                  disabled={busy}
                                  onClick={() => createVersion(row)}
                                >
                                  <GitBranch size={13} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Clone ${row.code}`}
                                  title="Clone"
                                  disabled={busy}
                                  onClick={() => {
                                    setCloneCode(`${row.code}_COPY`)
                                    setConfirmClone(row)
                                  }}
                                >
                                  <Copy size={13} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Retire ${row.code}`}
                                  title="Retire"
                                  disabled={busy}
                                  onClick={() => setConfirmRetire(row)}
                                >
                                  <XCircle size={13} />
                                </Button>
                              </>
                            ) : null}
                            {row.status === 'RETIRED' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Clone ${row.code}`}
                                title="Clone"
                                disabled={busy}
                                onClick={() => {
                                  setCloneCode(`${row.code}_COPY`)
                                  setConfirmClone(row)
                                }}
                              >
                                <Copy size={13} />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!loading ? (
          <div className="border-t border-line-soft px-3 py-2 text-2xs text-ink-muted">
            Showing {filtered.length} of {policies.length} policies
          </div>
        ) : null}
      </Card>

      <ProposedNote tone="info" className="mt-3 mb-0">
        <span className="font-semibold">Runtime effect.</span> When the configured trigger event occurs, EAPA
        resolves the active policy for the invoice's category and stage and creates one runtime SLA instance for
        it. See{' '}
        <NavLink
          to={SLA_SECTIONS.find((s) => s.key === 'monitor').to}
          className="font-semibold text-essa-700 no-underline hover:underline"
        >
          SLA Instances/Monitor
        </NavLink>{' '}
        for the clocks running right now.
      </ProposedNote>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.code ?? ''}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete policy
            </Button>
          </>
        }
      >
        <p className="text-xs text-ink-secondary">
          The SLA policy <span className="font-mono font-semibold">{confirmDelete?.code}</span> is removed and no
          new SLA clocks will be created from it. Existing runtime clocks keep their history. This action is
          recorded in the Audit Log.
        </p>
      </Dialog>
      <Dialog
        open={Boolean(confirmClone)}
        onClose={() => setConfirmClone(null)}
        title={`Clone ${confirmClone?.code ?? ''}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClone(null)}>
              Cancel
            </Button>
            <Button onClick={clonePolicy} disabled={busy || !cloneCode.trim()}>
              {busy ? 'Cloning…' : 'Clone'}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-ink-secondary">Creates a new draft with a new SLA code.</p>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">
            New SLA code <span className="text-red-600">*</span>
          </span>
          <Input
            value={cloneCode}
            className="w-full font-mono uppercase"
            onChange={(e) => setCloneCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
          />
        </label>
      </Dialog>
      <Dialog
        open={Boolean(confirmRetire)}
        onClose={() => setConfirmRetire(null)}
        title={`Retire ${confirmRetire?.code ?? ''}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRetire(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={retire} disabled={busy || !retireReason.trim()}>
              Retire policy
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-ink-secondary">
          No new SLA instances will be created from this policy. Existing runtime clocks keep their history.
        </p>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">
            Reason for retiring <span className="text-red-600">*</span>
          </span>
          <Textarea rows={2} value={retireReason} onChange={(e) => setRetireReason(e.target.value)} />
        </label>
      </Dialog>
    </SlaLayout>
  )
}
