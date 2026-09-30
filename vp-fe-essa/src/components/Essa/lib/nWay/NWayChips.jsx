import { ArrowRight } from 'lucide-react'
import { FAIL_ACTIONS, RULE_TYPES, sourceChannel, sourceLabel } from './catalog'

export function TypeChip({ type, className = '' }) {
  const meta = RULE_TYPES[type] || { label: type, tone: 'slate' }
  return <span className={`nw-chip nw-chip--${meta.tone} ${className}`}>{meta.label}</span>
}

export function FailChip({ action, className = '' }) {
  const meta = FAIL_ACTIONS[action] || FAIL_ACTIONS.REVIEW
  return <span className={`nw-chip nw-fail nw-fail--${meta.tone} ${className}`}>{meta.label}</span>
}

export function ChannelChip({ code }) {
  const ch = sourceChannel(code)
  return <span className={`nw-channel nw-channel--${ch.tone}`}>{ch.label}</span>
}

/** Matrix marker: A (source) · ● must match · ○ if present · ◐ partial */
export function Marker({ role, title }) {
  if (role === 'SOURCE') {
    return (
      <span className="nw-mark nw-mark--a" title={title || 'Anchor (A) — source of truth, value read here first'}>
        A
      </span>
    )
  }
  if (role === 'IF_PRESENT') {
    return <span className="nw-mark nw-mark--o" title={title || 'Only if present'} aria-label="Only if present" />
  }
  if (role === 'EXTRACT') {
    return (
      <span className="nw-mark nw-mark--e" title={title || 'Extract only — context, not compared'}>
        E
      </span>
    )
  }
  if (role === 'PARTIAL') {
    return <span className="nw-mark nw-mark--p" title={title || 'Partial'} aria-label="Partial" />
  }
  return <span className="nw-mark nw-mark--x" title={title || 'Must match'} aria-label="Must match" />
}

export function DocChip({ code, role }) {
  const cls =
    role === 'SOURCE'
      ? 'nw-doc nw-doc--src'
      : role === 'IF_PRESENT' || role === 'EXTRACT'
        ? 'nw-doc nw-doc--opt'
        : 'nw-doc nw-doc--req'
  return (
    <span className={cls} title={sourceChannel(code).long}>
      {role !== 'SOURCE' ? <Marker role={role} /> : null}
      {sourceLabel(code)}
    </span>
  )
}

/** Source A → targets, as a compact chip chain. */
export function RuleChain({ rule, max = 5 }) {
  const targets = rule.targets || []
  const shown = targets.slice(0, max)
  const more = targets.length - shown.length
  return (
    <span className="nw-chain">
      <DocChip code={rule.source} role="SOURCE" />
      {targets.length ? <ArrowRight size={13} className="nw-chain__arrow" aria-hidden /> : null}
      {shown.map((t, i) => (
        <DocChip key={`${t.doc}-${i}`} code={t.doc} role={t.requirement} />
      ))}
      {more > 0 ? <span className="nw-chain__more">+{more}</span> : null}
    </span>
  )
}

export const STATUS_META = {
  pass: { label: 'Matched', tone: 'pass' },
  fail: { label: 'Mismatch', tone: 'fail' },
  incomplete: { label: 'Not captured', tone: 'warn' },
  pending: { label: 'Awaiting source', tone: 'info' },
  na: { label: 'Not applicable', tone: 'neutral' }
}

export const COMPARISON_META = {
  extract: { label: 'Extract only', tone: 'neutral' },
  match: { label: 'Match', tone: 'pass' },
  mismatch: { label: 'Differs', tone: 'fail' },
  missing: { label: 'Missing', tone: 'fail' },
  not_found: { label: 'Not captured', tone: 'warn' },
  unavailable: { label: 'Not connected', tone: 'info' },
  skipped: { label: 'Skipped', tone: 'neutral' }
}

export function StatusPill({ status, meta = STATUS_META, children }) {
  const m = meta[status] || { label: status, tone: 'neutral' }
  return <span className={`nw-status nw-status--${m.tone}`}>{children || m.label}</span>
}
