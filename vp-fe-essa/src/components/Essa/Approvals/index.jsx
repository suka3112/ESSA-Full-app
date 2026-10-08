import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, ChevronsUpDown, Loader2 } from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Textarea } from '../ui/Textarea'
import { useEssaInvoices } from 'hooks/useEssaInvoices'
import { useEssaMyWork } from 'hooks/useEssaMyWork'
import { approveEssaInvoice, resolveInvoiceType } from 'api/essaDashboard'
import { showInvoiceApprovedToast, showInvoiceRejectedToast } from '../lib/essaToast'
import { DASHBOARD, INVOICE_DETAIL } from 'constants/url'
import { getNextPendingRole, resolvePoApprovals } from '../lib/poApprovalChain'
import { isNonPoInvoice } from '../lib/nonPoInvoiceDetail'
import '../../../assets/scss/essa/dashboard.scss'

const DISMISSED_STORAGE_KEY = 'essa_demo_dismissed_approvals'

function loadDismissedIds() {
  try {
    const raw = sessionStorage.getItem(DISMISSED_STORAGE_KEY)
    return new Set(JSON.parse(raw || '[]'))
  } catch {
    return new Set()
  }
}

function persistDismissedIds(ids) {
  sessionStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...ids]))
}

const TERMINAL_STATUSES = ['rejected', 'posted', 'paid', 'archived']

function resolveNextRole(row) {
  if (row.next_pending_role) return row.next_pending_role
  return getNextPendingRole(resolvePoApprovals(row))
}

function needsApproval(row) {
  if (TERMINAL_STATUSES.includes(row.status)) return false
  return Boolean(resolveNextRole(row))
}

function isMyTurn(row, role) {
  if (role === 'admin') return true
  return resolveNextRole(row) === role
}

function fmtMoney(amount, currency = 'IDR') {
  const num = Number(amount)
  if (amount == null || amount === '' || Number.isNaN(num)) return '—'
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

function fmtDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

function slaOf(row) {
  return row.due_date || row.invoice_due_date || row.sla_due || ''
}

function isOverdue(value) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

function nextSort(current, key) {
  if (current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return { key: '', dir: '' }
}

function compareValues(a, b, dir) {
  const result = String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'desc' ? -result : result
}

function SortTh({ label, column, sort, onSort, align }) {
  const active = sort.key === column
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={align === 'right' ? 'is-right' : undefined}>
      <button type="button" className={`ap-sort${active ? '' : ' ap-sort-idle'}`} onClick={() => onSort(column)}>
        {label}
        <Icon size={12} />
      </button>
    </th>
  )
}

function EssaApprovals({ userInfo: { userType = 'admin' } = {} }) {
  const navigate = useNavigate()
  const { data: myWork } = useEssaMyWork()
  const role = myWork?.role || 'admin'
  const [dismissedIds, setDismissedIds] = useState(loadDismissedIds)
  const [scope, setScope] = useState('mine')
  const [sort, setSort] = useState({ key: '', dir: '' })
  const [action, setAction] = useState(null)
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  const { data: essaRows = [], isLoading } = useEssaInvoices({})

  const dismissApproval = useCallback((id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      persistDismissedIds(next)
      return next
    })
  }, [])

  const queue = useMemo(() => {
    const rows = (essaRows || [])
      .filter(isNonPoInvoice)
      .filter((row) => !dismissedIds.has(row.id))
      .filter(needsApproval)
      .map((row) => ({ ...row, mine: isMyTurn(row, role) }))
    const visible = scope === 'mine' ? rows.filter((row) => row.mine) : rows
    if (!sort.key) return visible
    const valueOf = (row) => {
      if (sort.key === 'invoiceNumber') return row.invoice_no
      if (sort.key === 'vendorName') return row.vendor_name
      if (sort.key === 'categoryName') return resolveInvoiceType(row)
      if (sort.key === 'amount') return Number(row.total_amount) || 0
      if (sort.key === 'status') return 'Approval Pending'
      if (sort.key === 'due') return slaOf(row)
      return ''
    }
    return [...visible].sort((a, b) => compareValues(valueOf(a), valueOf(b), sort.dir))
  }, [essaRows, dismissedIds, role, scope, sort])

  const invoicePath = (item) => {
    if (item.source === 'po') {
      return `/${userType}/invoice-processing/po-based-invoice/view?id=${encodeURIComponent(item.rawId || item.id)}`
    }
    const id = item.rawId || item.id
    return `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(id))}`
  }

  const openInvoice = (item) => navigate(invoicePath(item))

  const closeAction = () => {
    if (acting) return
    setAction(null)
    setComment('')
  }

  const submitAction = async () => {
    if (!action) return
    const rejecting = action.kind === 'REJECT'
    if (rejecting && !comment.trim()) return
    const item = action.row
    const invNo = item.invoice_no || item.id
    setActing(true)
    try {
      await approveEssaInvoice(item.rawId || item.id, {
        decision: rejecting ? 'rejected' : 'approved',
        note: rejecting ? comment.trim() : comment.trim() || 'Approved'
      })
    } catch {
      // Demo mode — no live approval API required; still confirm in UI
    }
    dismissApproval(item.id)
    if (rejecting) showInvoiceRejectedToast(invNo)
    else showInvoiceApprovedToast(invNo)
    setActing(false)
    setAction(null)
    setComment('')
  }

  const rejecting = action?.kind === 'REJECT'

  return (
    <LeftPageContainer>
      <div className="essa-dashboard ap-page">
        <style>{pageCss}</style>
        <div className="ap-stack">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${DASHBOARD}` },
              { label: 'Invoice Processing' },
              { label: 'Approvals' }
            ]}
            title="Approvals"
            description="Invoices waiting for an approval decision. Approvals can also be given from Microsoft Teams or email."
            actions={
              <select className="ap-scope" value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Approval scope">
                <option value="mine">My approvals</option>
                <option value="all">All approvals</option>
              </select>
            }
          />

          <Card pad={false}>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <SortTh label="Invoice Number" column="invoiceNumber" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
                    <SortTh label="Vendor Name" column="vendorName" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
                    <SortTh label="Category" column="categoryName" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
                    <SortTh label="Amount" column="amount" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} align="right" />
                    <SortTh label="Approval Status" column="status" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
                    <SortTh label="SLA Due" column="due" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
                    <th className="ap-sticky">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="ap-state-row">
                      <td colSpan={7}>
                        <div className="ap-state">
                          <Loader2 size={18} className="ap-spin" />
                          <p>Loading approvals…</p>
                        </div>
                      </td>
                    </tr>
                  ) : queue.length === 0 ? (
                    <tr className="ap-state-row">
                      <td colSpan={7}>
                        <div className="ap-state">
                          <p className="ap-state-title">No approvals waiting</p>
                          <p>
                            {scope === 'mine'
                              ? 'Nothing is waiting for you. Switch to "All approvals" to see the full queue.'
                              : 'The approval queue is clear.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    queue.map((item, index) => {
                      const due = slaOf(item)
                      const overdue = isOverdue(due)
                      return (
                        <tr key={item.id} className={index % 2 === 1 ? 'is-zebra' : undefined} onClick={() => openInvoice(item)}>
                          <td>
                            <button type="button" className="ap-link" onClick={(event) => { event.stopPropagation(); openInvoice(item) }}>
                              {item.invoice_no || '—'}
                            </button>
                          </td>
                          <td><span className="ap-vendor">{item.vendor_name || '—'}</span></td>
                          <td><span className="ap-small">{resolveInvoiceType(item) || '—'}</span></td>
                          <td className="is-right"><span className="ap-money">{fmtMoney(item.total_amount, item.currency)}</span></td>
                          <td><span className="ap-badge ap-badge-warning">Approval Pending</span></td>
                          <td>
                            {overdue ? (
                              <span className="ap-badge ap-badge-error">SLA Breached</span>
                            ) : (
                              <span className="ap-time">{due ? fmtDateTime(due) : '—'}</span>
                            )}
                          </td>
                          <td className="ap-sticky" onClick={(event) => event.stopPropagation()}>
                            <span className="ap-actions">
                              <Button size="sm" className="ap-approve" onClick={() => { setComment(''); setAction({ row: item, kind: 'APPROVE' }) }}>
                                Approve
                              </Button>
                              <Button size="sm" variant="danger" className="ap-reject" onClick={() => { setComment(''); setAction({ row: item, kind: 'REJECT' }) }}>
                                Reject
                              </Button>
                              <button
                                type="button"
                                className="ap-open"
                                aria-label={`Open ${item.invoice_no || 'invoice'}`}
                                title="Open the invoice"
                                onClick={() => openInvoice(item)}
                              >
                                <ArrowRight size={14} />
                              </button>
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Dialog
          open={Boolean(action)}
          onClose={closeAction}
          width={520}
          title={`${rejecting ? 'Reject' : 'Approve'} — ${action?.row?.invoice_no || ''}`}
          footer={
            <>
              <Button variant="ghost" className="ap-dialog-btn" onClick={closeAction} disabled={acting}>Cancel</Button>
              <Button
                variant={rejecting ? 'danger' : 'primary'}
                className={`ap-dialog-btn ${rejecting ? '' : 'ap-dialog-primary'}`}
                disabled={acting || (rejecting && !comment.trim())}
                onClick={submitAction}
              >
                {acting ? (rejecting ? 'Rejecting…' : 'Approving…') : rejecting ? 'Reject invoice' : 'Approve invoice'}
              </Button>
            </>
          }
        >
          {action && (
            <div className="ap-form">
              <p className="ap-summary">
                {action.row.vendor_name || '—'} · <span>{fmtMoney(action.row.total_amount, action.row.currency)}</span>
              </p>
              <label className="ap-field">
                <span>
                  {rejecting ? 'Reason for rejection (required)' : 'Comment (optional)'}
                  {rejecting ? <span className="ap-req"> *</span> : null}
                </span>
                <Textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
            </div>
          )}
        </Dialog>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.ap-page .ap-stack{display:flex;flex-direction:column;gap:12px;}
.ap-page .ap-scope{height:36px;min-width:160px;border-radius:6px;border:1px solid #e5e7eb;background-color:#fff;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:16px;padding:6px 36px 6px 10px;appearance:none;-webkit-appearance:none;font-size:14px;color:#1f2937;}
.ap-page .ap-scope:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.ap-page .ap-table-wrap{overflow:auto;max-height:68vh;}
.ap-page .ap-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;color:#1f2937;}
.ap-page .ap-table thead th{position:sticky;top:0;z-index:2;background:#2C9842;color:#fff;font-size:14px;font-weight:700;text-transform:none;letter-spacing:0;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.ap-page .ap-table thead th.is-right,.ap-page .ap-table tbody td.is-right{text-align:right;}
.ap-page .ap-sort{display:inline-flex;align-items:center;gap:4px;background:transparent;border:none;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0;}
.ap-page .ap-sort:hover{text-decoration:underline;}
.ap-page .ap-sort-idle{opacity:.75;}
.ap-page .ap-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;}
.ap-page .ap-table tbody tr.is-zebra td{background:#f6f8f7;}
.ap-page .ap-table tbody tr:not(.ap-state-row){cursor:pointer;}
.ap-page .ap-table tbody tr:not(.ap-state-row):hover td{background:#eef8f0;}
.ap-page .ap-table th.ap-sticky,.ap-page .ap-table td.ap-sticky{position:sticky;right:0;z-index:1;}
.ap-page .ap-table th.ap-sticky{z-index:3;background:#2C9842;box-shadow:-6px 0 6px -6px rgba(16,24,40,.25);}
.ap-page .ap-table td.ap-sticky{box-shadow:-6px 0 6px -6px rgba(16,24,40,.18);}
.ap-page .ap-link{border:none;background:transparent;padding:0;font:inherit;font-weight:500;color:#247a35;cursor:pointer;}
.ap-page .ap-link:hover{text-decoration:underline;}
.ap-page .ap-vendor{display:block;max-width:11rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;}
.ap-page .ap-small{font-size:12px;}
.ap-page .ap-money{white-space:nowrap;font-weight:500;}
.ap-page .ap-time{white-space:nowrap;font-size:10px;color:#4b5563;}
.ap-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.ap-badge-warning{background:#fef5e7;color:#b45309;}
.ap-badge-error{background:#fdecec;color:#b91c1c;}
.ap-page .ap-actions{display:inline-flex;align-items:center;gap:4px;}
.ap-page .ap-approve.dx-btn,.ap-page .ap-reject.dx-btn{height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:500;}
.ap-page .ap-approve.dx-btn{background:#2C9842;border-color:#2C9842;color:#fff;}
.ap-page .ap-approve.dx-btn:hover{background:#247a35;filter:none;box-shadow:none;}
.ap-page .ap-reject.dx-btn{background:#b91c1c;border-color:#b91c1c;color:#fff;}
.ap-page .ap-open{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;cursor:pointer;}
.ap-page .ap-open:hover{border-color:#3aaa55;color:#247a35;}
.ap-page .ap-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.ap-page .ap-state-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.ap-page .ap-state p{margin:0;max-width:28rem;font-size:12px;}
.ap-page .ap-state-row{cursor:default;}
.ap-page .ap-state-row:hover td{background:#fff;}
.ap-page .ap-spin{color:#2C9842;animation:ap-spin 1s linear infinite;}
@keyframes ap-spin{to{transform:rotate(360deg);}}
.essa-dialog-root .ap-form{display:flex;flex-direction:column;gap:12px;font-size:12px;color:#4b5563;}
.essa-dialog-root .ap-summary{margin:0;}
.essa-dialog-root .ap-summary span{font-weight:600;color:#1f2937;}
.essa-dialog-root .ap-field{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#1f2937;}
.essa-dialog-root .ap-req{color:#b91c1c;}
.essa-dialog-root .ap-field textarea{width:100%;border-radius:6px;border:1px solid #e5e7eb;padding:8px 10px;font-size:14px;font-weight:400;color:#1f2937;}
.essa-dialog-root .ap-field textarea:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.essa-dialog-root .ap-dialog-btn.dx-btn{height:36px;padding:0 14px;border-radius:6px;font-size:14px;font-weight:500;}
.essa-dialog-root .ap-dialog-btn.dx-btn-ghost{border-color:transparent;background:transparent;color:#374151;}
.essa-dialog-root .ap-dialog-primary.dx-btn{background:#2C9842;border-color:#2C9842;color:#fff;}
.essa-dialog-root .ap-dialog-primary.dx-btn:hover:not(:disabled){background:#247a35;filter:none;}
.essa-dialog-root .ap-dialog-btn.dx-btn-danger{background:#b91c1c;border-color:#b91c1c;color:#fff;}
`

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || state.userInfo || {}
})

export default connect(mapStateToProps)(EssaApprovals)
