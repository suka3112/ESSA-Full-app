import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  RotateCcw,
  AlertTriangle,
  UserCheck
} from 'lucide-react'
import { cn } from '../lib/cn'
import { resolveNextAction } from '../lib/invoiceWorkflowStatus'

const TONE_ICONS = {
  park: Clock3,
  post: ArrowRight,
  idle: CheckCircle2,
  approval: UserCheck,
  validation: AlertTriangle,
  danger: RotateCcw,
  review: FileSearch
}

export function NextActionBadge({ inv, role, className }) {
  const action = resolveNextAction(inv, role)
  const tone = action.tone || 'review'
  const Icon = TONE_ICONS[tone] || FileSearch

  return (
    <span
      className={cn('dx-next-action-badge', `dx-next-action-badge--${tone}`, className)}
      title={action.label}
    >
      <span className="dx-next-action-badge__icon" aria-hidden>
        <Icon size={13} strokeWidth={2.25} />
      </span>
      <span className="dx-next-action-badge__text">{action.label}</span>
    </span>
  )
}
