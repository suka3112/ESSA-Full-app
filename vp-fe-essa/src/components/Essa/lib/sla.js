/**
 * Administration → SLA Management — shared helpers and small components.
 *
 * Screens follow the ESSA EAPA SLA Administration UI Specification:
 *   SLA Policies, Reminder Rules, Escalation Rules,
 *   Business Calendar, Simulation / Test, SLA Instances / Monitor.
 */
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '../ui/Badge'
import {
  INVOICE_DASHBOARD,
  SLA_MANAGEMENT,
  SLA_CREATE,
  slaEditPath,
  SLA_REMINDERS,
  SLA_ESCALATIONS,
  SLA_CALENDAR,
  SLA_SIMULATION,
  SLA_MONITOR
} from 'constants/url'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { getSlaMeta, getSlaPolicies, getSlaInstances, getSlaInstancesSummary } from 'api/sla'
import { blankSlaPolicy, mergePauseRules } from './slaStore'

export { blankSlaPolicy, mergePauseRules }

export const slaTo = (path) => `/${ADMIN_USER_TYPE}${path}`

export const slaCreateTo = slaTo(SLA_CREATE)

export const slaEditTo = (id, tab) => {
  const to = slaTo(slaEditPath(id))
  return tab ? `${to}?tab=${encodeURIComponent(tab)}` : to
}

/** Home > Administration > … for ESSA admin pages that render crumbs in PageHeader. */
export function adminCrumbs(...trail) {
  return [
    { label: 'Home', to: slaTo(INVOICE_DASHBOARD) },
    { label: 'Administration', to: slaTo(SLA_MANAGEMENT) },
    ...trail
  ]
}

export function useSlaMeta() {
  return useQuery({ queryKey: ['sla-meta'], queryFn: getSlaMeta, staleTime: 5 * 60_000 })
}

export function useSlaPolicies() {
  return useQuery({ queryKey: ['sla-policies'], queryFn: getSlaPolicies })
}

/** One row per SLA code: the version in force, else the latest draft. */
export function useEffectivePolicies() {
  const q = useSlaPolicies()
  const effective = useMemo(() => {
    const byCode = new Map()
    for (const p of q.data?.policies ?? []) {
      byCode.set(p.code, [...(byCode.get(p.code) ?? []), p])
    }
    return [...byCode.values()].map((versions) => {
      const active = versions.find((v) => v.status === 'ACTIVE')
      if (active) return active
      const sorted = [...versions].sort((a, b) => b.version - a.version)
      return sorted.find((v) => v.status !== 'RETIRED') ?? sorted[0]
    })
  }, [q.data])
  return { ...q, effective }
}

export function useSlaInstances(query = {}, options = {}) {
  const q = query.q || ''
  const status = query.status || ''
  const stage = query.stage || ''
  const owner = query.owner || ''
  const policyId = query.policyId || ''
  const dueFrom = query.dueFrom || ''
  const dueTo = query.dueTo || ''
  const includeClosed = query.includeClosed
  return useQuery({
    queryKey: ['sla-instances', q, status, stage, owner, policyId, dueFrom, dueTo, includeClosed],
    queryFn: () =>
      getSlaInstances({
        q: q || undefined,
        status: status || undefined,
        stage: stage || undefined,
        owner: owner || undefined,
        policyId: policyId || undefined,
        dueFrom: dueFrom || undefined,
        dueTo: dueTo || undefined,
        includeClosed
      }),
    enabled: options.enabled !== false
  })
}

export function useSlaInstanceSummary() {
  return useQuery({ queryKey: ['sla-instances-summary'], queryFn: getSlaInstancesSummary })
}

export function slaTemplateOptions(meta) {
  const raw = meta?.templates
  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
    return raw
      .filter((t) => t && (t.id || t.name))
      .map((t) => ({
        id: String(t.id || ''),
        name: t.name || t.id,
        scenario: t.scenario || ''
      }))
  }
  return []
}

export function slaTemplateLabel(row, meta) {
  if (row?.template) return row.template
  const id = row?.templateId
  if (!id) return '—'
  const match = slaTemplateOptions(meta).find((t) => t.id === id)
  return match?.name || id
}

export const label = (list, code) =>
  code ? (list?.find((x) => x.code === code)?.label ?? String(code).replace(/_/g, ' ')) : '—'

export function durationLabel(d) {
  if (!d) return '—'
  const names = {
    HOURS: ['Hour', 'Hours'],
    CALENDAR_DAYS: ['Calendar Day', 'Calendar Days'],
    BUSINESS_HOURS: ['Business Hour', 'Business Hours'],
    BUSINESS_DAYS: ['Business Day', 'Business Days']
  }
  const [one, many] = names[d.unit] ?? [d.unit, d.unit]
  return `${d.value} ${d.value === 1 ? one : many}`
}

export function targetLabel(p) {
  if (p?.timer?.duration == null) return 'Not applicable'
  return durationLabel({ value: p.timer.duration, unit: p.timer.unit })
}

export function scopeLabel(p, meta) {
  if (!p) return '—'
  if (p.scopeType === 'INVOICE_CATEGORY') return label(meta?.activities, p.activity)
  if (p.scopeType === 'WORKFLOW')
    return p.activity ? `Workflow / ${label(meta?.activities, p.activity)}` : 'Workflow / all types'
  if (p.scopeType === 'DOCUMENT_REQUEST') return 'All / Document Request'
  return 'All types'
}

export function remainingLabel(ms) {
  if (ms == null) return '—'
  const abs = Math.abs(ms)
  const d = Math.floor(abs / 86_400_000)
  const h = Math.floor((abs % 86_400_000) / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  return ms < 0 ? `+${body}` : body
}

export const POLICY_STATUS_TIP = {
  DRAFT: 'Being edited. Not used at runtime.',
  TEST: 'Simulated successfully; ready to be published.',
  ACTIVE: 'Published and in force. Immutable — create a new version to change it.',
  RETIRED: 'Replaced by a newer version or withdrawn. Existing runtime clocks keep their history.'
}

export function Tooltip({ text, children }) {
  if (!text) return children
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-2xs text-white shadow-pop group-hover/tooltip:block">
        {text}
      </span>
    </span>
  )
}

export function PolicyStatusBadge({ status }) {
  const tone = {
    DRAFT: 'sla-status--draft',
    TEST: 'sla-status--test',
    ACTIVE: 'sla-status--active',
    RETIRED: 'sla-status--retired'
  }
  return (
    <Tooltip text={POLICY_STATUS_TIP[status]}>
      <span className={clsx('sla-status', tone[status] || 'sla-status--draft')}>
        {status === 'TEST' ? 'TESTED' : status}
      </span>
    </Tooltip>
  )
}

export const RUNTIME_TONE = {
  PENDING: 'draft',
  RUNNING: 'info',
  WARNING: 'warn',
  PAUSED: 'neutral',
  COMPLETED: 'success',
  BREACHED: 'danger',
  CANCELLED: 'neutral'
}

export function RuntimeStatusBadge({ status, meta }) {
  const info = meta?.runtimeStatuses?.find((s) => s.code === status)
  return (
    <Tooltip text={info?.hint ?? status}>
      <Badge
        tone={RUNTIME_TONE[status] ?? 'neutral'}
        className="uppercase tracking-wide [&::before]:hidden">
        {info?.label ?? status}
      </Badge>
    </Tooltip>
  )
}

export function YesNoBadge({ value }) {
  const on = Boolean(value)
  return (
    <span className={clsx('sla-status', on ? 'sla-status--active' : 'sla-status--draft')}>
      {on ? 'YES' : 'NO'}
    </span>
  )
}

export function ProposedNote({ children, tone = 'warning', className }) {
  return (
    <div
      className={clsx(
        'mb-3 rounded-lg border px-3 py-2 text-xs',
        tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-line bg-canvas text-ink-secondary',
        className
      )}>
      {children}
    </div>
  )
}

export function Toggle({ checked, onChange, disabled, label: aria }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="sla-toggle">
      <span className="sla-toggle-knob" />
    </button>
  )
}

export const SLA_SECTIONS = [
  { key: 'policies', label: 'SLA Policies', to: slaTo(SLA_MANAGEMENT) },
  { key: 'reminders', label: 'Reminder Rules', to: slaTo(SLA_REMINDERS) },
  { key: 'escalations', label: 'Escalation Rules', to: slaTo(SLA_ESCALATIONS) },
  { key: 'calendar', label: 'Business Calendar', to: slaTo(SLA_CALENDAR) },
  { key: 'simulation', label: 'Simulation / Test', to: slaTo(SLA_SIMULATION) },
  { key: 'monitor', label: 'SLA Instances / Monitor', to: slaTo(SLA_MONITOR) }
]

export function SlaSectionNav({ active }) {
  return (
    <nav aria-label="SLA Management sections" className="dx-tabs sla-section-nav mb-3">
      {SLA_SECTIONS.map((s) => (
        <NavLink key={s.key} to={s.to} end className={clsx('dx-tab', active === s.key && 'active')}>
          {s.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function PolicyCodeLink({ code, to, className, onClick }) {
  return (
    <NavLink
      to={to || slaTo(SLA_MANAGEMENT)}
      className={clsx('sla-code-link text-xs font-semibold', className)}
      onClick={(e) => {
        if (!onClick) return
        e.preventDefault()
        onClick()
      }}>
      {code}
    </NavLink>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function slaDate(value) {
  if (!value) return '—'
  const iso = String(value).slice(0, 10)
  const parts = iso.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    const month = MONTHS[Number(parts[1]) - 1]
    if (month) return `${parts[2]} ${month} ${parts[0]}`
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
