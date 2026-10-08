import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, BellRing, ChevronsUpDown, Mail, MessageSquare, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { DASHBOARD } from 'constants/url'
import '../../../assets/scss/essa/dashboard.scss'

const LEVELS = [1, 2, 3, 4]

const DOA_ROLES = [
  { value: 'HOS', label: 'Head of Section' },
  { value: 'HOD', label: 'Head of Department' },
  { value: 'HOF', label: 'Head of Function' },
  { value: 'OSH_STH', label: 'Operations & Site Head' },
  { value: 'GFD', label: 'Group Functional Director' }
]

const ROLE_LABEL = {
  HOS: 'Head of Section',
  HOD: 'Head of Department',
  HOF: 'Head of Function',
  OSH_STH: 'Operations & Site Head',
  GFD: 'Group Functional Director',
  AP_REVIEWER: 'AP Supervisor',
  TAX_REVIEWER: 'Tax Reviewer'
}

const DOA_ROLE_LEGEND = [
  { code: 'HOS', name: 'Head of Section' },
  { code: 'HOD', name: 'Head of Department' },
  { code: 'HOF', name: 'Head of Function' },
  { code: 'OSH / STH', name: 'Operations & Site Head' },
  { code: 'GFD', name: 'Group Functional Director' }
]

const REMINDER_SCHEDULE = [
  { n: 1, label: '1st reminder', after: '24 hours', recipient: 'Approver', channel: 'Email' },
  { n: 2, label: '2nd reminder', after: '48 hours', recipient: 'Approver', channel: 'Email' },
  { n: 3, label: '3rd reminder', after: '3 days', recipient: 'Approver + AP Manager', channel: 'Email' },
  { n: 4, label: 'Final reminder', after: '5 days', recipient: 'Approver + AP Manager', channel: 'Email' }
]

const ESCALATION_LADDER = [
  { n: 1, trigger: 'No action after 5-day final reminder', action: 'Auto-escalate to next DoA level', target: 'Next approver' },
  { n: 2, trigger: 'No further DoA level exists', action: 'Escalate to AP Manager', target: 'AP Manager' },
  { n: 3, trigger: 'All escalations', action: 'Log timestamp and SLA-breach reason', target: 'Audit trail' }
]

const VENDOR_CHASE = [
  { n: 1, label: '1st notification', trigger: 'On detection of missing document', recipient: 'Vendor', drafter: 'System · AP sends' },
  { n: 2, label: '1st reminder', trigger: 'Every 7 days while document still missing', recipient: 'Vendor', drafter: 'System · AP sends' },
  { n: 3, label: 'Escalation', trigger: 'After 1st reminder with no response', recipient: 'Head of Function (HOF)', drafter: 'System' }
]

const WORKFLOW = {
  id: 'wf-nonpo',
  name: 'Non-PO Invoice Approval',
  category: 'Non-PO Invoice',
  status: 'ACTIVE',
  steps: [
    { stepNo: 1, name: 'AP Review', role: 'AP_REVIEWER', approverType: 'ROLE', slaHours: 24 },
    { stepNo: 2, name: 'Approval Hierarchy', role: 'AP_REVIEWER', approverType: 'DOA', slaHours: 48, escalationTo: 'AP_REVIEWER' },
    { stepNo: 3, name: 'Tax Review', role: 'TAX_REVIEWER', approverType: 'ROLE', taxStep: true, slaHours: 24 },
    { stepNo: 4, name: 'Final Approval', role: 'AP_REVIEWER', approverType: 'ROLE', amountThresholdMin: 100_000_000, slaHours: 24 }
  ]
}

function displayRole(role) {
  if (!role) return '—'
  return ROLE_LABEL[role] || role
}

function fmtMoney(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    currencyDisplay: 'code',
    maximumFractionDigits: 0
  }).format(amount)
}

function emptyLevels() {
  return { 1: '', 2: '', 3: '', 4: '' }
}

function initialBands() {
  const rows = [
    [0, 2_000_000, ['HOS']],
    [2_000_001, 5_000_000, ['HOS', 'HOD']],
    [5_000_001, 15_000_000, ['HOD', 'HOF']],
    [15_000_001, 50_000_000, ['HOD', 'HOF', 'OSH_STH']],
    [50_000_001, 100_000_000, ['HOD', 'HOF', 'OSH_STH', 'GFD']],
    [100_000_001, null, ['HOD', 'HOF', 'OSH_STH', 'GFD']]
  ]
  return rows.map(([minAmount, maxAmount, roles], i) => ({
    id: `band-${i + 1}`,
    minAmount,
    maxAmount,
    active: true,
    levels: { ...emptyLevels(), ...Object.fromEntries(roles.map((role, n) => [n + 1, role])) }
  }))
}

let _uid = 0
const uid = () => `band-${Date.now()}-${++_uid}`

function Tag({ tone = 'neutral', children }) {
  return <span className={`wf-tag wf-tag-${tone}`}>{children}</span>
}

function ChannelTag({ value }) {
  const teams = value.includes('Teams')
  const email = value.includes('Email')
  const platform = value.includes('platform')
  return (
    <span className="wf-channels">
      {teams && (
        <span className="wf-channel wf-channel-teams">
          <MessageSquare size={10} /> Teams
        </span>
      )}
      {email && (
        <span className="wf-channel wf-channel-email">
          <Mail size={10} /> Email
        </span>
      )}
      {platform && <span className="wf-channel wf-channel-platform">In-platform</span>}
    </span>
  )
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronsUpDown size={12} className="wf-sort-idle" aria-hidden />
  return dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />
}

function DenseTable({ columns, rows, rowKey, sort, onSort }) {
  return (
    <div className="wf-table-wrap">
      <table className="wf-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={[c.align === 'right' && 'is-right', c.align === 'center' && 'is-center', c.sticky && 'wf-sticky'].filter(Boolean).join(' ')}>
                {c.sortable ? (
                  <button type="button" className="wf-sort" onClick={() => onSort(c.key)}>
                    {c.header}
                    <SortIcon active={sort?.key === c.key} dir={sort?.dir} />
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row)} className={i % 2 === 1 ? 'is-zebra' : undefined}>
              {columns.map((c) => (
                <td key={c.key} className={[c.align === 'right' && 'is-right', c.align === 'center' && 'is-center', c.sticky && 'wf-sticky'].filter(Boolean).join(' ')}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function workflowCells(band) {
  const cells = []
  for (const step of WORKFLOW.steps) {
    if (step.approverType === 'DOA') {
      for (const level of LEVELS) {
        const role = band.levels[level]
        if (role) {
          cells.push({
            key: `s${step.stepNo}-doa${level}`,
            name: displayRole(role),
            sub: `Approval hierarchy · DoA level ${level}`,
            sla: step.slaHours,
            escalationTo: step.escalationTo
          })
        }
      }
    } else if (step.amountThresholdMin == null || (band.maxAmount ?? Number.POSITIVE_INFINITY) >= step.amountThresholdMin) {
      cells.push({
        key: `s${step.stepNo}`,
        name: step.name,
        sub: displayRole(step.role),
        sla: step.slaHours,
        tax: step.taxStep,
        escalationTo: step.escalationTo
      })
    }
  }
  return cells
}

function EssaApprovalMatrix({ userInfo: { userType } }) {
  const canEdit = userType === ADMIN_USER_TYPE
  const [bands, setBands] = useState(initialBands)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [sort, setSort] = useState(null)

  const hierarchy = useMemo(() => [...bands].sort((a, b) => a.minAmount - b.minAmount), [bands])

  const overlaps = useMemo(() => {
    if (!editing) return false
    const min = editing.minAmount
    const max = editing.maxAmount ?? Number.POSITIVE_INFINITY
    if (max <= min) return true
    return hierarchy.some((row) => {
      if (editing.id && row.id === editing.id) return false
      const rowMax = row.maxAmount ?? Number.POSITIVE_INFINITY
      return min <= rowMax && row.minAmount <= max
    })
  }, [editing, hierarchy])

  const rows = useMemo(() => {
    const list = hierarchy.map((row, i) => ({ ...row, bandNo: i + 1 }))
    if (!sort) return list
    const value = (row) => (sort.key === 'to' ? row.maxAmount ?? Number.MAX_SAFE_INTEGER : row.minAmount)
    return [...list].sort((a, b) => (sort.dir === 'asc' ? value(a) - value(b) : value(b) - value(a)))
  }, [hierarchy, sort])

  const toggleSort = (key) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: 'asc' }
      if (current.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const openEditor = (row) => {
    setEditing({
      id: row?.id ?? null,
      minAmount: row?.minAmount ?? 0,
      maxAmount: row?.maxAmount ?? null,
      levelRoles: row ? { ...row.levels } : emptyLevels()
    })
  }

  const saveBand = () => {
    if (!editing || overlaps) return
    const next = {
      id: editing.id || uid(),
      minAmount: editing.minAmount,
      maxAmount: editing.maxAmount,
      active: true,
      levels: { ...editing.levelRoles }
    }
    setBands((prev) => (editing.id ? prev.map((row) => (row.id === editing.id ? { ...row, ...next, active: row.active } : row)) : [...prev, next]))
    setEditing(null)
    toast.success('Approval configuration updated. Applies to invoices that enter approval from now on.')
  }

  const deleteBand = () => {
    if (!deleting) return
    setBands((prev) => prev.filter((row) => row.id !== deleting.id))
    setDeleting(null)
    toast.success('Approval configuration updated. Applies to invoices that enter approval from now on.')
  }

  const hierarchyColumns = [
    {
      key: 'band',
      header: 'Band',
      render: (row) => <span className="wf-strong">Band {row.bandNo}</span>
    },
    {
      key: 'from',
      header: 'From Amount',
      align: 'right',
      sortable: true,
      render: (row) => <span className="wf-nowrap">{fmtMoney(row.minAmount)}</span>
    },
    {
      key: 'to',
      header: 'To Amount',
      align: 'right',
      sortable: true,
      render: (row) => <span className="wf-nowrap">{row.maxAmount != null ? fmtMoney(row.maxAmount) : 'No limit'}</span>
    },
    ...LEVELS.map((level) => ({
      key: `level-${level}`,
      header: `Level ${level}`,
      align: 'center',
      render: (row) => (row.levels[level] ? <Tag tone="info">{displayRole(row.levels[level])}</Tag> : <span className="wf-dash">—</span>)
    })),
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Tag tone={row.active ? 'success' : 'neutral'}>{row.active ? 'Enabled' : 'Disabled'}</Tag>
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'center',
      sticky: true,
      render: (row) =>
        canEdit ? (
          <div className="wf-row-actions">
            <Button size="sm" variant="ghost" className="wf-icon-btn" aria-label="Edit amount range" title="Edit this amount range and its levels" onClick={() => openEditor(row)}>
              <Pencil size={13} />
            </Button>
            <Button size="sm" variant="ghost" className="wf-icon-btn is-danger" aria-label="Delete amount range" title="Delete this amount range" onClick={() => setDeleting(row)}>
              <Trash2 size={13} />
            </Button>
          </div>
        ) : null
    }
  ]

  return (
    <LeftPageContainer>
      <div className="essa-dashboard wf-page">
        <style>{pageCss}</style>
        <div className="wf-stack">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${DASHBOARD}` },
              { label: 'Administration' },
              { label: 'Workflows & Approval Hierarchy' }
            ]}
            title="Workflows & Approval Hierarchy"
          />

          <Card
            pad={false}
            title={
              <span>
                Approval hierarchy
                <span className="wf-card-sub">Non-PO</span>
              </span>
            }
            actions={
              canEdit ? (
                <Button variant="secondary" size="sm" className="wf-add" onClick={() => openEditor()}>
                  <Plus size={13} /> Add amount range
                </Button>
              ) : null
            }
          >
            <div className="wf-legend">
              <span className="wf-legend-label">Roles</span>
              {DOA_ROLE_LEGEND.map((role) => (
                <span key={role.code} className="wf-legend-pill">
                  <strong>{role.code}</strong> {role.name}
                </span>
              ))}
            </div>
            <DenseTable columns={hierarchyColumns} rows={rows} rowKey={(row) => row.id} sort={sort} onSort={toggleSort} />
          </Card>

          <Card
            title={
              <span>
                {WORKFLOW.name}
                <span className="wf-card-sub">{WORKFLOW.category}</span>
              </span>
            }
            actions={<Tag tone="success">{WORKFLOW.status === 'ACTIVE' ? 'Active' : WORKFLOW.status}</Tag>}
          >
            <div className="wf-flows">
              {hierarchy.map((band, index) => {
                const cells = workflowCells(band)
                return (
                  <div key={band.id}>
                    <div className="wf-flow-meta">
                      <span className="wf-band-pill">Band {index + 1}</span>
                      <span className="wf-strong">
                        {fmtMoney(band.minAmount)} — {band.maxAmount != null ? fmtMoney(band.maxAmount) : 'No limit'}
                      </span>
                      <span className="wf-muted">
                        · {cells.length} approval level{cells.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="wf-flow-scroll">
                      <div className="wf-flow">
                        <div className="wf-terminus is-start">START</div>
                        {cells.map((cell, stepIndex) => (
                          <div key={cell.key} className="wf-flow-step">
                            <span className="wf-connector" />
                            <div className="wf-step-card">
                              <p className="wf-step-title">
                                Level {stepIndex + 1} · {cell.name}
                              </p>
                              <p className="wf-step-sub">{cell.sub}</p>
                              <div className="wf-step-tags">
                                <Tag>SLA {cell.sla}h</Tag>
                                {cell.tax && <Tag tone="info">Tax review</Tag>}
                                {cell.escalationTo && <Tag tone="pending">Escalates to {displayRole(cell.escalationTo)}</Tag>}
                              </div>
                            </div>
                          </div>
                        ))}
                        <span className="wf-connector" />
                        <div className="wf-terminus is-end">SAP PARKING</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="wf-split">
            <Card
              pad={false}
              title={
                <span className="wf-card-icon-title">
                  <BellRing size={13} className="wf-green" /> Reminders
                  <span className="wf-card-sub">If approver takes no action</span>
                </span>
              }
            >
              <DenseTable
                columns={[
                  { key: 'n', header: '#', align: 'center', render: (row) => <span className="wf-num">{row.n}</span> },
                  { key: 'label', header: 'Reminder', render: (row) => <span className="wf-strong">{row.label}</span> },
                  { key: 'after', header: 'Triggered after', render: (row) => <span className="wf-nowrap">{row.after}</span> },
                  { key: 'recipient', header: 'Recipient', render: (row) => row.recipient },
                  { key: 'channel', header: 'Channel', render: (row) => <ChannelTag value={row.channel} /> }
                ]}
                rows={REMINDER_SCHEDULE}
                rowKey={(row) => String(row.n)}
              />
            </Card>

            <Card
              pad={false}
              title={
                <span className="wf-card-icon-title">
                  <ShieldAlert size={13} className="wf-danger" /> Escalation ladder
                  <span className="wf-card-sub">If SLA breached after all reminders</span>
                </span>
              }
            >
              <DenseTable
                columns={[
                  { key: 'n', header: '#', align: 'center', render: (row) => <span className="wf-num">{row.n}</span> },
                  { key: 'trigger', header: 'Trigger', render: (row) => row.trigger },
                  { key: 'action', header: 'Action', render: (row) => <span className="wf-strong">{row.action}</span> },
                  { key: 'target', header: 'Target', render: (row) => row.target }
                ]}
                rows={ESCALATION_LADDER}
                rowKey={(row) => String(row.n)}
              />
            </Card>
          </div>

          <Card
            pad={false}
            title={
              <span className="wf-card-icon-title">
                <Mail size={13} className="wf-green" /> Vendor chase
                <span className="wf-card-sub">Missing mandatory document</span>
              </span>
            }
          >
            <DenseTable
              columns={[
                { key: 'n', header: '#', align: 'center', render: (row) => <span className="wf-num">{row.n}</span> },
                { key: 'label', header: 'Notification / Reminder', render: (row) => <span className="wf-strong">{row.label}</span> },
                { key: 'trigger', header: 'Triggered', render: (row) => row.trigger },
                { key: 'recipient', header: 'Recipient', render: (row) => row.recipient },
                { key: 'channel', header: 'Channel', render: () => <ChannelTag value="Email" /> },
                { key: 'drafter', header: 'Drafted by', render: (row) => <span className="wf-muted">{row.drafter}</span> }
              ]}
              rows={VENDOR_CHASE}
              rowKey={(row) => String(row.n)}
            />
          </Card>
        </div>

        <Dialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          width={768}
          title={editing?.id ? 'Edit amount range' : 'Add amount range'}
          footer={
            <>
              <Button variant="ghost" className="wf-dialog-btn" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button className="wf-dialog-btn" disabled={!editing || !LEVELS.some((level) => editing.levelRoles[level]) || overlaps} onClick={saveBand}>
                Save
              </Button>
            </>
          }
        >
          {editing && (
            <div className="wf-editor">
              <div className="wf-editor-grid">
                <label className="wf-field">
                  <span className="wf-label">
                    From amount <span className="wf-req">*</span>
                  </span>
                  <Input type="number" min={0} value={editing.minAmount} onChange={(e) => setEditing((prev) => prev && { ...prev, minAmount: Number(e.target.value) })} />
                </label>
                <label className="wf-field">
                  <span className="wf-label">To amount</span>
                  <Input
                    type="number"
                    min={0}
                    value={editing.maxAmount ?? ''}
                    onChange={(e) => setEditing((prev) => prev && { ...prev, maxAmount: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                  <span className="wf-hint">Leave blank for no upper limit</span>
                </label>
              </div>
              {overlaps && (
                <p className="wf-overlap">
                  This amount range overlaps or touches another band. Bands must not share a boundary — set From at least 1 higher than the previous band’s To (e.g. 2,000,001, not 2,000,000) so every invoice amount falls in exactly one band.
                </p>
              )}
              <div className="wf-level-grid">
                {LEVELS.map((level) => (
                  <label key={level} className="wf-field">
                    <span className="wf-label">Level {level}</span>
                    <Select
                      value={editing.levelRoles[level] ?? ''}
                      className="wf-select"
                      onChange={(e) => setEditing((prev) => prev && { ...prev, levelRoles: { ...prev.levelRoles, [level]: e.target.value } })}
                    >
                      <option value="">Not required</option>
                      {DOA_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </Select>
                    {level === 1 && <span className="wf-hint">Whoever holds this role can approve</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Dialog>

        <Dialog
          open={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          width={480}
          title="Delete amount range"
          footer={
            <>
              <Button variant="ghost" className="wf-dialog-btn" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="wf-dialog-btn" onClick={deleteBand}>
                Delete
              </Button>
            </>
          }
        >
          <p className="wf-confirm">
            The approval levels configured for invoices between {fmtMoney(deleting?.minAmount)} and {deleting?.maxAmount != null ? fmtMoney(deleting.maxAmount) : 'no limit'} are removed. Invoices already in approval are unaffected.
          </p>
        </Dialog>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.wf-page .wf-stack{display:flex;flex-direction:column;gap:16px;}
.wf-page .wf-split{display:grid;gap:16px;grid-template-columns:1fr;}
@media (min-width:1024px){.wf-page .wf-split{grid-template-columns:1fr 1fr;}}
.wf-page .wf-card-sub{margin-left:8px;font-size:10px;line-height:14px;font-weight:400;color:#4b5563;}
.wf-page .wf-card-icon-title{display:inline-flex;align-items:center;gap:8px;}
.wf-page .wf-green{color:#2C9842;}
.wf-page .wf-danger{color:#b91c1c;}
.wf-page .wf-muted{color:#4b5563;}
.wf-page .wf-strong{font-weight:500;color:#1f2937;}
.wf-page .wf-num{font-weight:600;color:#4b5563;}
.wf-page .wf-nowrap{white-space:nowrap;}
.wf-page .wf-dash{font-size:10px;color:#d1d5db;}
.wf-page .card-header .dx-btn{flex-shrink:0;}
.wf-page .wf-add.dx-btn{height:28px;padding:0 10px;border-radius:6px;border:1px solid #2C9842;background:#fff;color:#247a35;font-size:12px;font-weight:500;box-shadow:none;}
.wf-page .wf-add.dx-btn:hover{background:#eef8f0;filter:none;box-shadow:none;}
.wf-page .wf-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px;border-bottom:1px solid #e5e7eb;background:#fff;padding:8px 16px;font-size:10px;color:#4b5563;}
.wf-page .wf-legend-label{margin-right:4px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
.wf-page .wf-legend-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;border:1px solid #e5e7eb;background:#eef0f2;padding:2px 8px;}
.wf-page .wf-legend-pill strong{color:#1f2937;font-weight:600;}
.wf-page .wf-table-wrap{overflow-x:auto;}
.wf-page .wf-table{width:100%;border-collapse:collapse;text-align:left;font-size:14px;color:#1f2937;}
.wf-page .wf-table thead th{background:#2C9842;color:#fff;font-weight:700;font-size:14px;letter-spacing:0;text-transform:none;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.wf-page .wf-table thead th.is-right,.wf-page .wf-table tbody td.is-right{text-align:right;}
.wf-page .wf-table thead th.is-center,.wf-page .wf-table tbody td.is-center{text-align:center;}
.wf-page .wf-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;font-size:14px;}
.wf-page .wf-table tbody tr.is-zebra td{background:#f6f8f7;}
.wf-page .wf-table tbody tr:last-child td{border-bottom:none;}
.wf-page .wf-sort{display:inline-flex;align-items:center;gap:4px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.wf-page .wf-sort:hover{text-decoration:underline;}
.wf-page .wf-sort-idle{opacity:.75;}
.wf-page .wf-table th.wf-sticky,.wf-page .wf-table td.wf-sticky{position:sticky;right:0;z-index:1;}
.wf-page .wf-table th.wf-sticky{background:#2C9842;box-shadow:-6px 0 6px -6px rgba(16,24,40,.25);}
.wf-page .wf-table td.wf-sticky{box-shadow:-6px 0 6px -6px rgba(16,24,40,.18);}
.wf-page .wf-row-actions{display:inline-flex;justify-content:center;gap:4px;}
.wf-page .wf-icon-btn.dx-btn{width:28px;height:28px;padding:0;border-radius:6px;border-color:transparent;background:transparent;color:#4b5563;box-shadow:none;}
.wf-page .wf-icon-btn.dx-btn:hover{background:#f3f4f6;border-color:transparent;filter:none;box-shadow:none;}
.wf-page .wf-icon-btn.is-danger.dx-btn{color:#b91c1c;}
.wf-page .wf-icon-btn.is-danger.dx-btn:hover{background:#fdecec;}
.wf-tag{display:inline-flex;align-items:center;gap:4px;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.wf-tag-neutral{background:#eef0f2;color:#374151;}
.wf-tag-success{background:#e6f5ea;color:#2d9a47;}
.wf-tag-info{background:#e5f2f9;color:#0075a9;}
.wf-tag-pending{background:#f1ecfd;color:#6d28d9;}
.wf-channels{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;}
.wf-channel{display:inline-flex;align-items:center;gap:4px;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
.wf-channel-teams{background:#f1ecfd;color:#6d28d9;}
.wf-channel-email{background:#eef0f2;color:#374151;}
.wf-channel-platform{background:#e6f5ea;color:#2d9a47;}
.wf-page .wf-flows{display:flex;flex-direction:column;gap:16px;}
.wf-page .wf-flow-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;font-size:10px;}
.wf-page .wf-band-pill{border-radius:4px;background:#eef8f0;padding:2px 8px;font-weight:600;color:#247a35;}
.wf-page .wf-flow-scroll{overflow-x:auto;}
.wf-page .wf-flow{display:flex;align-items:center;min-width:max-content;padding:4px 0;}
.wf-page .wf-flow-step{display:flex;align-items:center;}
.wf-page .wf-connector{width:24px;height:2px;background:#3aaa55;flex:0 0 24px;}
.wf-page .wf-terminus{border:2px solid #2C9842;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:700;}
.wf-page .wf-terminus.is-start{background:#2C9842;color:#fff;}
.wf-page .wf-terminus.is-end{background:#fff;color:#247a35;}
.wf-page .wf-step-card{width:176px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:10px;box-shadow:0 1px 2px rgba(15,23,42,.06),0 1px 3px rgba(15,23,42,.08);}
.wf-page .wf-step-title{margin:0;font-size:12px;font-weight:600;color:#1f2937;}
.wf-page .wf-step-sub{margin:2px 0 0;font-size:10px;color:#4b5563;}
.wf-page .wf-step-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.wf-editor{display:flex;flex-direction:column;gap:12px;}
.wf-editor-grid{display:grid;gap:12px;grid-template-columns:1fr;}
.wf-level-grid{display:grid;gap:12px;grid-template-columns:1fr;}
@media (min-width:768px){
  .wf-editor-grid{grid-template-columns:1fr 1fr;}
  .wf-level-grid{grid-template-columns:repeat(4,minmax(0,1fr));}
}
.wf-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
.wf-label{font-size:12px;font-weight:600;color:#1f2937;}
.wf-req{color:#b91c1c;}
.wf-hint{font-size:10px;color:#4b5563;}
.wf-editor .dx-input,.wf-editor .wf-select{height:36px;width:100%;padding:6px 10px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1f2937;}
.wf-editor .dx-input:focus,.wf-editor .wf-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.wf-overlap{margin:0;border-radius:6px;background:#fef5e7;padding:6px 10px;font-size:10px;line-height:14px;color:#b45309;}
.wf-confirm{margin:0;font-size:12px;line-height:18px;color:#374151;}
.essa-dialog-root .wf-dialog-btn.dx-btn{height:36px;padding:0 14px;border-radius:6px;font-size:14px;font-weight:500;}
.essa-dialog-root .wf-dialog-btn.dx-btn-ghost{border-color:transparent;background:transparent;color:#374151;}
.essa-dialog-root .wf-dialog-btn.dx-btn-ghost:hover{background:#eef0f2;}
`

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaApprovalMatrix)
