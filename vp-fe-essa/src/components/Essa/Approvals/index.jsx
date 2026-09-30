import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Inbox, Layers, X } from 'lucide-react'
import { connect } from 'react-redux'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Textarea } from '../ui/Textarea'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { useEssaInvoices } from 'hooks/useEssaInvoices'
import { useEssaMyWork } from 'hooks/useEssaMyWork'
import { approveEssaInvoice, fmtMoney, fmtDate, NON_PO_LABEL } from 'api/essaDashboard'
import { showInvoiceApprovedToast, showInvoiceRejectedToast } from '../lib/essaToast'
import { INVOICE_DETAIL } from 'constants/url'
import {
  ESSA_AP_ACTORS,
  PO_AP_CHAIN_STEPS,
  getNextPendingRole,
  resolvePoApprovals
} from '../lib/poApprovalChain'
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

function buildPendingStep(row) {
  const nextRole = resolveNextRole(row)
  if (!nextRole) return null

  const chain = resolvePoApprovals(row)
  const fromChain = chain.find((s) => s.role === nextRole && s.status === 'pending')
    || chain.find((s) => s.status === 'pending')
  if (fromChain) return fromChain

  const actor = ESSA_AP_ACTORS[nextRole]
  const level = PO_AP_CHAIN_STEPS.find((s) => s.role === nextRole)?.level || 1
  return {
    level,
    role: nextRole,
    role_label: actor?.role_label || nextRole.replace(/_/g, ' '),
    approver_name: actor?.approver_name || '—',
    status: 'pending'
  }
}

function needsApproval(row) {
  if (TERMINAL_STATUSES.includes(row.status)) return false
  return Boolean(resolveNextRole(row))
}

function isMyTurn(row, role) {
  if (role === 'admin') return true
  return resolveNextRole(row) === role
}

function normalizeNonPoRows(essaRows) {
  return (essaRows || [])
    .filter(isNonPoInvoice)
    .map((row) => ({
      ...row,
      source: row.source || 'essa',
      rawId: row.id,
      listSource: 'essa'
    }))
}

function buildApprovalItem(row, role) {
  const pending = buildPendingStep(row)
  const mine = needsApproval(row) && isMyTurn(row, role)
  return { ...row, pending, mine }
}

function EssaApprovals({ userInfo: { userType } }) {
  const { data: myWork } = useEssaMyWork()
  const role = myWork?.role || 'admin'
  const [dismissedIds, setDismissedIds] = useState(loadDismissedIds)

  const { data: essaRows = [], isLoading } = useEssaInvoices({})

  const dismissApproval = useCallback((id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      persistDismissedIds(next)
      return next
    })
  }, [])

  const items = useMemo(() => {
    return normalizeNonPoRows(essaRows)
      .filter((row) => !dismissedIds.has(row.id))
      .filter(needsApproval)
      .map((row) => buildApprovalItem(row, role))
  }, [essaRows, role, dismissedIds])

  const myQueue = items.filter((item) => item.mine)
  const allOthers = items.filter((item) => !item.mine)

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page">
          <p className="text-muted" style={{ fontSize: 13 }}>
            Multi-level invoice approvals routed by amount
          </p>

          <Card style={{ marginBottom: 12 }}>
            <div className="dx-card-head">
              <Inbox size={18} style={{ color: 'var(--dx-warning-500)' }} />
              <h2 className="dx-card-title">My Approvals · {myQueue.length}</h2>
            </div>
            <ApprovalTable
              items={myQueue}
              userType={userType}
              actable
              onDismiss={dismissApproval}
              isLoading={isLoading}
              emptyMsg="Nothing waiting on you."
            />
          </Card>

          <Card>
            <div className="dx-card-head">
              <Layers size={18} style={{ color: 'var(--dx-text-mute)' }} />
              <h2 className="dx-card-title">All Open · {allOthers.length}</h2>
            </div>
            <ApprovalTable
              items={allOthers}
              userType={userType}
              actable={false}
              onDismiss={dismissApproval}
              isLoading={isLoading}
              emptyMsg="No open approvals."
            />
          </Card>
        </div>
      </div>
    </LeftPageContainer>
  )
}

function ApprovalTable({ items, userType, actable, onDismiss, isLoading, emptyMsg }) {
  const [confirmFor, setConfirmFor] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState(false)

  const invoicePath = (item) => {
    if (item.source === 'po') {
      return `/${userType}/invoice-processing/po-based-invoice/view?id=${encodeURIComponent(item.rawId)}`
    }
    const id = item.rawId || item.id
    return `/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(id))}`
  }

  const resetConfirm = () => {
    setConfirmFor(null)
    setRejectReason('')
  }

  const closeConfirm = () => {
    if (acting) return
    resetConfirm()
  }

  const openConfirm = (item, decision) => {
    setRejectReason('')
    setConfirmFor({ item, decision })
  }

  const submitConfirm = async () => {
    if (!confirmFor) return
    const { item, decision } = confirmFor
    if (decision === 'rejected' && !rejectReason.trim()) return

    const invNo = item.invoice_no || item.id
    const approved = decision === 'approved'

    setActing(true)
    try {
      await approveEssaInvoice(item.rawId || item.id, {
        decision: approved ? 'approved' : 'rejected',
        note: approved ? 'Approved' : rejectReason.trim()
      })
    } catch {
      // Demo mode — no live approval API required; still confirm in UI
    }

    onDismiss(item.id)
    resetConfirm()

    if (approved) {
      showInvoiceApprovedToast(invNo)
    } else {
      showInvoiceRejectedToast(invNo)
    }
    setActing(false)
  }

  if (isLoading) {
    return (
      <div style={{ padding: '12px 16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 14, margin: '10px 0' }} />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState icon="inbox" title={emptyMsg} />
      </div>
    )
  }

  const isReject = confirmFor?.decision === 'rejected'
  const confirmInvoice = confirmFor?.item

  return (
    <>
      <div className="dx-table-wrap dx-table-wrap-scroll dx-approvals-table-wrap">
        <table className="dx-table dx-approvals-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Vendor</th>
              <th>PO</th>
              <th className="text-end">Amount</th>
              <th>Level</th>
              <th>Role</th>
              <th>Approver</th>
              <th>Uploaded</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    to={invoicePath(item)}
                    style={{ fontWeight: 600, color: 'var(--dx-text)' }}
                  >
                    {item.invoice_no || '—'}
                  </Link>
                </td>
                <td>{item.vendor_name || '—'}</td>
                <td>{item.po_number || NON_PO_LABEL}</td>
                <td className="text-end">{fmtMoney(item.total_amount, item.currency)}</td>
                <td>{item.pending ? `L${item.pending.level}` : '—'}</td>
                <td>
                  {item.pending ? (
                    item.pending.role_label
                  ) : (
                    <Badge tone={item.status}>{item.status_label || item.status}</Badge>
                  )}
                </td>
                <td className="text-muted">{item.pending?.approver_name || '—'}</td>
                <td className="text-muted">{fmtDate(item.uploaded_at)}</td>
                <td>
                  {actable && item.pending && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="dx-btn dx-btn-success dx-btn-sm"
                        onClick={() => openConfirm(item, 'approved')}
                        aria-label="Approve"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="dx-btn dx-btn-danger dx-btn-sm"
                        onClick={() => openConfirm(item, 'rejected')}
                        aria-label="Reject"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!confirmFor}
        onClose={closeConfirm}
        width={isReject ? 520 : 460}
        title={
          confirmInvoice
            ? isReject
              ? `Reject invoice · ${confirmInvoice.invoice_no || '—'}`
              : `Approve invoice · ${confirmInvoice.invoice_no || '—'}`
            : ''
        }
        description={
          confirmInvoice
            ? `${confirmInvoice.vendor_name || 'Vendor'} · ${confirmInvoice.po_number || NON_PO_LABEL} · ${fmtMoney(confirmInvoice.total_amount, confirmInvoice.currency)}`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm} disabled={acting}>
              Cancel
            </Button>
            <Button
              variant={isReject ? 'danger' : 'success'}
              disabled={acting || (isReject && !rejectReason.trim())}
              onClick={submitConfirm}
            >
              {acting
                ? isReject
                  ? 'Rejecting…'
                  : 'Approving…'
                : isReject
                  ? 'Reject invoice'
                  : 'Approve invoice'}
            </Button>
          </>
        }
      >
        {isReject ? (
          <>
            <p className="dx-dialog-desc">
              Provide a clear reason so the vendor knows what to fix before resubmitting.
            </p>
            <div className="dx-field">
              <label className="dx-label" htmlFor="approval-reject-reason">
                Reason for rejection
              </label>
              <Textarea
                id="approval-reject-reason"
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. PO mismatch, missing supporting documents, incorrect amount…"
              />
              <span className="dx-field-hint">Required before rejecting this invoice.</span>
            </div>
          </>
        ) : (
          <p className="dx-dialog-desc">
            Confirm you have reviewed this invoice and want to approve it for the next step in the
            workflow.
          </p>
        )}
      </Dialog>
    </>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaApprovals)
