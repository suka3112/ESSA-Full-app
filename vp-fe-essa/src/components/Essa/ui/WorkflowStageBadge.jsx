import {
  AlertCircle,
  Archive,
  BadgeCheck,
  CircleDollarSign,
  FileText,
  Loader2,
  Send,
  XCircle
} from 'lucide-react'
import { cn } from '../lib/cn'
import { resolveWorkflowStage } from '../lib/invoiceWorkflowStatus'

const STAGE_ICONS = {
  draft: FileText,
  processing: Loader2,
  failed: XCircle,
  validated: BadgeCheck,
  parked: Archive,
  posted: Send,
  paid: CircleDollarSign,
  rejected: XCircle,
  review: AlertCircle
}

export function WorkflowStageBadge({ inv, compact = true, className, label, title }) {
  const meta = resolveWorkflowStage(inv)
  const Icon = STAGE_ICONS[meta.key] || BadgeCheck
  const text = label ?? (compact ? meta.shortLabel || meta.label : meta.label)

  return (
    <span
      className={cn('dx-stage-badge', `dx-stage-badge--${meta.key}`, className)}
      title={title || meta.label}
    >
      <span className="dx-stage-badge__icon" aria-hidden>
        <Icon size={13} strokeWidth={2.25} />
      </span>
      <span className="dx-stage-badge__text">{text}</span>
    </span>
  )
}
