import { CheckCircle2, XCircle, Send, RefreshCw, Download, ArrowRight } from 'lucide-react'

const APPROVER_ROLES = ['hos', 'hod', 'hof', 'sth', 'gfd', 'finance_manager', 'admin']
const REVIEWER_ROLES = ['ap_reviewer', 'business_reviewer', 'ap_supervisor', 'ap_lead', 'admin']
export const UPLOAD_ROLES = ['ap_user', 'ap_team', 'ap_supervisor', 'admin']
const TERMINAL_STATUS = ['posted', 'paid', 'rejected', 'archived']

export const isApprover = (role) => APPROVER_ROLES.includes(role)
export const isReviewer = (role) => REVIEWER_ROLES.includes(role)

export const ACTIONS = {
  approve: { key: 'approve', label: 'Approve', tone: 'primary', icon: CheckCircle2, inline: true },
  reject: {
    key: 'reject',
    label: 'Reject',
    tone: 'primary',
    icon: XCircle,
    inline: true,
    needsReason: true
  },
  review: {
    key: 'review',
    label: 'Send to review',
    tone: 'primary',
    icon: Send,
    inline: true,
    needsReason: true
  },
  revalidate: { key: 'revalidate', label: 'Re-validate', tone: 'primary', icon: RefreshCw, inline: false },
  export: { key: 'export', label: 'Export', tone: 'primary', icon: Download, inline: false },
  open: { key: 'open', label: 'Open', tone: 'primary', icon: ArrowRight, inline: false }
}

const dedupe = (keys) => [...new Set(keys)].map((k) => ACTIONS[k]).filter(Boolean)

export function rowActionsFor(role, inv) {
  const status = inv?.status
  const overall = inv?.overall
  const terminal = TERMINAL_STATUS.includes(status)
  const keys = []

  const myTurn = role === 'admin' || inv?.next_pending_role === role
  if (isApprover(role) && status === 'pending_approval' && myTurn) {
    keys.push('approve', 'reject')
  }
  if (isReviewer(role) && !terminal && (overall === 'review' || overall === 'rejected')) {
    keys.push('review', 'revalidate')
  }
  keys.push('export', 'open')
  return dedupe(keys)
}

export function bulkActionsFor(role) {
  const keys = []
  if (isApprover(role)) keys.push('approve', 'reject')
  if (isReviewer(role)) keys.push('review', 'revalidate')
  keys.push('export')
  return dedupe(keys)
}
