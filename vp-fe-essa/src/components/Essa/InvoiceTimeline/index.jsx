import {
  AlertTriangle,
  Archive,
  CheckCheck,
  CheckCircle2,
  CircleDollarSign,
  CloudUpload,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle
} from 'lucide-react'
import { fmtDate } from 'api/essaDashboard'
import { normalizeTimelineEvents, parseTimelineDate } from '../lib/timelineEvents'

const ICONS = {
  uploaded: CloudUpload,
  ocr_completed: Sparkles,
  validation_done: ShieldCheck,
  matching_done: Workflow,
  pending_approval: Users,
  approval_requested: Users,
  parked_to_sap: Archive,
  approved: CheckCircle2,
  rejected: XCircle,
  posted: Send,
  paid: CircleDollarSign,
  manual_correction: Pencil,
  exception: AlertTriangle
}

const LABELS = {
  uploaded: 'Invoice uploaded',
  ocr_completed: 'OCR extraction completed',
  validation_done: 'Validated',
  matching_done: 'PO matching completed',
  pending_approval: 'Approval workflow',
  approval_requested: 'Approval workflow',
  parked_to_sap: 'Invoice parked to SAP',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Invoice posted to SAP',
  paid: 'Invoice paid',
  manual_correction: 'Manual correction',
  exception: 'Exception raised'
}

const STEP_ORDER = [
  'uploaded',
  'ocr_completed',
  'validation_done',
  'matching_done',
  'pending_approval',
  'approval_requested',
  'approved',
  'parked_to_sap',
  'posted',
  'paid',
  'manual_correction',
  'rejected',
  'exception'
]

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const ai = STEP_ORDER.indexOf(a.event_type)
    const bi = STEP_ORDER.indexOf(b.event_type)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return (parseTimelineDate(a.created_at)?.getTime() || 0) - (parseTimelineDate(b.created_at)?.getTime() || 0)
  })
}

function formatEventLabel(eventType) {
  if (LABELS[eventType]) return LABELS[eventType]
  return String(eventType || 'Event')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatActorRole(role) {
  if (!role) return ''
  return String(role).replace(/_/g, ' ')
}

export default function InvoiceTimeline({ events = [], uploadedAt }) {
  const normalized = normalizeTimelineEvents(events, uploadedAt)
  if (!normalized.length) return <p className="text-muted text-sm">No timeline events yet.</p>

  return (
    <div className="dx-timeline">
      {sortEvents(normalized).map((e) => {
        const Icon = ICONS[e.event_type]
        const label = formatEventLabel(e.event_type)
        return (
          <div key={e.id} className={`dx-timeline-item event-${e.event_type}`}>
            <div className="ts">{fmtDate(e.created_at)}</div>
            <div className="head">
              {Icon && <Icon size={14} strokeWidth={2} className="dx-timeline-icon" />}
              {label}
            </div>
            <div className="body">
              {e.message}
              {e.actor_name && (
                <span style={{ marginLeft: 8, color: 'var(--dx-g-500)' }}>
                  · {e.actor_name}
                  {e.actor_role ? ` (${formatActorRole(e.actor_role)})` : ''}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
