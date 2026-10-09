import { GitBranch, User2 } from 'lucide-react'
import { normalizeTimelineEvents } from '../lib/timelineEvents'

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

const STATUS_BY_TYPE = {
  uploaded: 'SUCCESS',
  ocr_completed: 'SUCCESS',
  validation_done: 'SUCCESS',
  matching_done: 'SUCCESS',
  approved: 'SUCCESS',
  posted: 'SUCCESS',
  paid: 'SUCCESS',
  parked_to_sap: 'INFO',
  pending_approval: 'INFO',
  approval_requested: 'INFO',
  manual_correction: 'WARNING',
  rejected: 'ERROR',
  exception: 'ERROR'
}

function formatEventLabel(eventType) {
  if (LABELS[eventType]) return LABELS[eventType]
  return String(eventType || 'Event')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function eventStatus(event) {
  const explicit = String(event.status || '').toUpperCase()
  if (explicit === 'SUCCESS' || explicit === 'ERROR' || explicit === 'WARNING' || explicit === 'INFO') {
    return explicit.toLowerCase()
  }
  return (STATUS_BY_TYPE[event.event_type] || 'INFO').toLowerCase()
}

function actorKind(event) {
  const explicit = String(event.actorType || event.actor_type || '').toUpperCase()
  if (explicit === 'USER') return 'user'
  if (explicit === 'SYSTEM') return 'system'
  const role = String(event.actor_role || '').toLowerCase()
  return role && role !== 'system' ? 'user' : 'system'
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

export default function InvoiceTimeline({ events = [], uploadedAt }) {
  const normalized = normalizeTimelineEvents(events, uploadedAt)

  return (
    <section className="dx-inv-timeline" aria-label="Invoice timeline">
      <header className="dx-inv-timeline-head">
        <h2>Invoice timeline</h2>
      </header>
      <div className="dx-inv-timeline-body">
        {!normalized.length ? (
          <p className="dx-inv-timeline-empty">No timeline events yet.</p>
        ) : (
          <ol className="dx-inv-timeline-list">
            {normalized.map((event) => {
              const status = eventStatus(event)
              const title = event.title || formatEventLabel(event.event_type)
              const badge = String(event.event || event.event_type || 'event').replace(/_/g, ' ')
              const detail = event.detail || event.message
              const actor = event.actorName || event.actor_name || 'System'
              const ActorIcon = actorKind(event) === 'user' ? User2 : GitBranch
              return (
                <li key={event.id} className="dx-inv-timeline-item">
                  <span className={`dx-inv-timeline-dot dx-inv-timeline-dot--${status}`}>
                    <span />
                  </span>
                  <div className="dx-inv-timeline-row">
                    <p className="dx-inv-timeline-title">{title}</p>
                    <span className="dx-inv-timeline-badge">{badge}</span>
                  </div>
                  {detail ? <p className="dx-inv-timeline-detail">{detail}</p> : null}
                  <p className="dx-inv-timeline-meta">
                    <ActorIcon size={11} aria-hidden />
                    <span>
                      {actor} · {fmtDateTime(event.at || event.created_at)}
                    </span>
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
