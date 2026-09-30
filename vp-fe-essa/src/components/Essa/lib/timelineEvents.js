import { buildPoTimeline } from '../../../api/essaPoSeed'
import { buildNonPoTimeline } from '../../../api/essaNonPoSeed'

export function parseTimelineDate(value) {
  if (value == null || value === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function normalizeTimelineEvent(event = {}, index = 0, fallbackAt) {
  if (!event || typeof event !== 'object') return null

  const event_type = event.event_type || event.eventType || event.event || null
  const rawCreatedAt =
    event.created_at ||
    event.createdAt ||
    event.at ||
    event.timestamp ||
    fallbackAt ||
    null
  const parsed = parseTimelineDate(rawCreatedAt)

  if (!event_type || !parsed) return null

  return {
    ...event,
    id: event.id || `timeline-${index}-${event_type}`,
    event_type,
    created_at: parsed.toISOString(),
    actor_name: event.actor_name || event.actorName || event.actor || null,
    actor_role: event.actor_role || event.actorRole || 'system',
    message: event.message || event.note || event.description || null
  }
}

export function normalizeTimelineEvents(events = [], fallbackAt) {
  const fallback = fallbackAt || new Date().toISOString()
  return (Array.isArray(events) ? events : [])
    .map((event, index) => normalizeTimelineEvent(event, index, fallback))
    .filter(Boolean)
    .sort((a, b) => parseTimelineDate(a.created_at) - parseTimelineDate(b.created_at))
}

export function ensureInvoiceTimeline(inv = {}) {
  if (!inv || typeof inv !== 'object') return inv

  const fallbackAt = inv.uploaded_at || new Date().toISOString()
  const normalized = normalizeTimelineEvents(inv.timeline, fallbackAt)
  if (normalized.length) {
    return { ...inv, timeline: normalized }
  }

  const row = {
    id: inv.id,
    invoice_no: inv.invoice_no,
    status: inv.status || 'extracted',
    uploaded_at: fallbackAt,
    uploaded_by_name: inv.uploaded_by_name || 'Putri Maharani',
    validation: inv.validation,
    scenario: inv.scenario || inv.demo_scenario
  }
  const isPo = inv.invoice_workflow === 'PO' || Boolean(inv.po_number)
  const timeline = isPo ? buildPoTimeline(row) : buildNonPoTimeline(row)

  return { ...inv, timeline }
}
