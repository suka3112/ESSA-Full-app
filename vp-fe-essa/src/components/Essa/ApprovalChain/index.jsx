import { useState } from 'react'
import { Check, X, User } from 'lucide-react'
import { fmtDate } from 'api/essaDashboard'

const STATUS_LABELS = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  waiting: 'Waiting'
}

function splitRoleLabel(roleLabel = '') {
  const parts = String(roleLabel).split(' · ')
  if (parts.length >= 2) {
    return { action: parts[0], roleName: parts.slice(1).join(' · ') }
  }
  return { action: roleLabel, roleName: '' }
}

export default function ApprovalChain({ chain = [], onAction, canAct }) {
  if (!chain.length) return <em className="text-muted">No approvers required.</em>

  return (
    <div className="dx-approval-flow">
      <div className="dx-chain">
        {chain.map((a, i) => {
          const { action, roleName } = splitRoleLabel(a.role_label || a.role)
          const firstPendingIdx = chain.findIndex((s) => s.status === 'pending')
          const isActive = a.status === 'pending' && firstPendingIdx === i
          const isWaiting = a.status === 'pending' && !isActive
          const chipStatus = isWaiting ? 'waiting' : a.status
          const chipLabel = isWaiting ? STATUS_LABELS.waiting : STATUS_LABELS[a.status] || a.status

          return (
            <article
              key={a.id || i}
              className={[
                'dx-step',
                'dx-chain-card',
                a.status,
                isActive ? 'is-active' : '',
                isWaiting ? 'is-waiting' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="dx-step-header">
                <span className="dx-step-level">L{a.level}</span>
                <span className={`dx-step-status-chip ${chipStatus}`}>{chipLabel}</span>
              </div>

              <div className="dx-step-body">
                {action && <div className="dx-step-action">{action}</div>}
                {roleName && <div className="dx-step-role-name">{roleName}</div>}
                <div className="dx-step-name">
                  <User size={13} className="dx-step-name-icon" aria-hidden />
                  {a.approver_name}
                </div>
                {a.approver_email && <div className="dx-step-email">{a.approver_email}</div>}
                {a.description && <div className="dx-step-desc">{a.description}</div>}
              </div>

              <div className="dx-step-footer">
                {a.acted_at && <div className="dx-step-time">{fmtDate(a.acted_at)}</div>}
                {a.note && <div className="dx-step-note">&ldquo;{a.note}&rdquo;</div>}
              </div>
            </article>
          )
        })}
      </div>

      {onAction &&
        canAct &&
        (() => {
          const nextIdx = chain.findIndex((a) => a.status === 'pending')
          if (nextIdx === -1) return null
          const level = chain[nextIdx]
          return (
            <ApprovalActionPanel
              level={level}
              onAction={(decision, note) => onAction(level.level, decision, note)}
            />
          )
        })()}
    </div>
  )
}

function ApprovalActionPanel({ level, onAction }) {
  const { action, roleName } = splitRoleLabel(level.role_label || level.role)
  const isPreparer = level.level === 1 && level.role === 'ap_team'

  return (
    <div className="dx-approval-action-panel">
      <div className="dx-approval-action-panel__title">
        <span className="dx-approval-action-panel__badge">L{level.level}</span>
        <div>
          <strong>{isPreparer ? 'Your turn — park this invoice' : 'Awaiting your action'}</strong>
          <div className="dx-approval-action-panel__subtitle">
            {action}
            {roleName ? ` · ${roleName}` : ''} — {level.approver_name}
          </div>
        </div>
      </div>
      <ApprovalForm onSubmit={onAction} isPreparer={isPreparer} />
    </div>
  )
}

function ApprovalForm({ onSubmit, isPreparer = false }) {
  const [note, setNote] = useState('')

  return (
    <div className="dx-approval-form">
      <input
        className="dx-input"
        placeholder={
          isPreparer
            ? 'Note for reviewers (optional)…'
            : 'Add a note (optional)…'
        }
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="dx-approval-form__actions">
        <button
          type="button"
          className="dx-btn dx-btn-primary"
          onClick={() => onSubmit('approved', note)}
        >
          <Check size={14} /> {isPreparer ? 'Park & submit' : 'Approve'}
        </button>
        <button
          type="button"
          className="dx-btn dx-btn-danger"
          onClick={() => onSubmit('rejected', note)}
        >
          <X size={14} /> {isPreparer ? 'Return for correction' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
