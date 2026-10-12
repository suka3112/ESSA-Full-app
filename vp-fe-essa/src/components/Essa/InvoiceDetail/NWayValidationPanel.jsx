import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings2 } from 'lucide-react'

import { getMatchRulesCached } from 'api/matchRules'
import { evaluateInvoice } from '../lib/nWay/engine'
import { sourceChannel, sourceLabel } from '../lib/nWay/catalog'
import { COMPARISON_META, STATUS_META, StatusPill } from '../lib/nWay/NWayChips'
import { mergeNonPoValidationChecklist, mergeValidationChecklist } from '../lib/validationRuleCatalog'
import '../../../assets/scss/essa/n-way-rules.scss'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'fail', label: 'Mismatch' },
  { key: 'incomplete', label: 'Not captured' },
  { key: 'pending', label: 'Awaiting source' }
]

/** Only open items are listed — matched and not-applicable rules are hidden. */
const OPEN_STATUSES = ['fail', 'incomplete', 'pending']

const truncate = (v, n = 42) => {
  if (v == null || v === '') return null
  const s = String(v)
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

/** How each source reaches the portal, shown next to its name: “Invoice (extracted)”. */
const CHANNEL_TAG = { VENDOR_PDF: 'extracted', SAP: 'DB-SAP', USER: 'uploaded', EXTERNAL: 'external', ESSA_SYSTEM: 'ESSA system' }

/** Comparisons that are fine are hidden — only open gaps are listed. */
const HIDDEN_COMPARISONS = ['match', 'skipped', 'extract']

function DocName({ code }) {
  if (!code) return '—'
  const tag = CHANNEL_TAG[sourceChannel(code).code]
  return (
    <>
      <span className="nw-flat__docname">{sourceLabel(code)}</span>
      {tag ? <small className="nw-flat__tag">{tag}</small> : null}
    </>
  )
}

// Rule fields carry the matrix reference (“#7 PO number”) — show just the field name.
const cleanField = (f) => String(f || '').replace(/^#\d+\s*/, '')

/** Flatten one rule result into “source → check with” rows. */
const rowsFor = (result) => {
  const { rule } = result
  const fieldOf = (code) => {
    const src = result.sources.find((s) => s.code === code)
    return cleanField(src?.field) || src?.fieldLabel || rule.dataPoint
  }
  const rows = result.comparisons
    .filter((c) => !HIDDEN_COMPARISONS.includes(c.status))
    .map((c) => ({
      from: c.from,
      to: c.to,
      fromField: fieldOf(c.from),
      toField: fieldOf(c.to),
      fromValue: c.fromValue,
      toValue: c.toValue,
      status: c.status,
      meta: COMPARISON_META,
      detail: c.detail
    }))
  if (rows.length) return rows
  // No field-level comparison (server-side rule, or decided by the 12-point check): one row per target.
  const targets = result.sources.filter((s) => s.role !== 'SOURCE' && s.role !== 'EXTRACT')
  return (targets.length ? targets : [null]).map((t) => ({
    from: rule.source,
    to: t?.code,
    fromField: fieldOf(rule.source),
    toField: t ? fieldOf(t.code) : '',
    status: result.status,
    meta: STATUS_META,
    detail: result.headline
  }))
}

function Field({ name, value }) {
  return (
    <>
      <span>{name || '—'}</span>
      {value != null && value !== '' ? <small className="nw-flat__val" title={String(value)}>{truncate(value)}</small> : null}
    </>
  )
}

function ResultTable({ results }) {
  return (
    <div className="nw-flat-wrap">
      <table className="nw-flat">
        <thead>
          <tr>
            <th>Data point</th>
            <th>Source (extracted from)</th>
            <th>To check with</th>
            <th>Source field</th>
            <th>To check field</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const rows = rowsFor(r)
            return rows.map((row, i) => (
              <tr key={`${r.rule.id || r.rule.ruleKey}-${i}`} className={`nw-flat__row nw-flat__row--${r.status}${i === 0 ? ' is-first' : ''}`}>
                {i === 0 ? (
                  <td rowSpan={rows.length} className="nw-flat__dp">
                    <span className="nw-mono nw-flat__id">{r.rule.ruleKey}</span>
                    <span className="nw-flat__dpname">{r.rule.dataPoint}</span>
                  </td>
                ) : null}
                <td className="nw-flat__doc"><DocName code={row.from} /></td>
                <td className="nw-flat__doc"><DocName code={row.to} /></td>
                <td><Field name={row.fromField} value={row.fromValue} /></td>
                <td><Field name={row.toField} value={row.toValue} /></td>
                <td className="nw-flat__result" title={row.detail || undefined}>
                  <StatusPill status={row.status} meta={row.meta} />
                </td>
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * N-way validation results for one invoice.
 * Uses `validation.nWay` from the API when present, otherwise evaluates the
 * configured match rules against the extracted documents in the browser.
 */
export default function NWayValidationPanel({ inv, sections, checks = [], validation = {}, isNonPo = false, invoiceTypeCode, configHref, onSummary }) {
  const [rulesState, setRulesState] = useState({ rules: null, origin: null })
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    let cancelled = false
    getMatchRulesCached().then((res) => {
      if (!cancelled) setRulesState(res)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Only checks the server actually returned — the 12-point merge pads missing rules
  // with “did not evaluate”, which must not override the n-way comparison.
  const checklist = useMemo(() => {
    const merged = isNonPo ? mergeNonPoValidationChecklist(checks, validation) : mergeValidationChecklist(checks, validation)
    const evaluated = new Set((checks || []).map((c) => c?.ruleCode).filter(Boolean))
    return merged.filter((c) => evaluated.has(c.ruleCode))
  }, [checks, validation, isNonPo])

  const evaluation = useMemo(() => {
    if (validation?.nWay?.results) return validation.nWay
    if (!rulesState.rules) return null
    return evaluateInvoice({ rules: rulesState.rules, inv, sections, checklist, invoiceTypeCode })
  }, [validation, rulesState.rules, inv, sections, checklist, invoiceTypeCode])

  useEffect(() => {
    if (evaluation) onSummary?.(evaluation.summary)
  }, [evaluation, onSummary])

  if (!evaluation) {
    return <div className="nw-empty">Loading validation rules…</div>
  }

  const { summary } = evaluation
  const results = evaluation.results.filter((r) => OPEN_STATUSES.includes(r.status))
  const shown = filter === 'ALL' ? results : results.filter((r) => r.status === filter)

  return (
    <div className="nw-panel">
      <div className="nw-panel__bar">
        <div className="nw-filters" role="group" aria-label="Filter results">
          {FILTERS.map((f) => {
            const count = f.key === 'ALL' ? results.length : summary[f.key] || 0
            if (f.key !== 'ALL' && !count) return null
            return (
              <button key={f.key} type="button" aria-pressed={filter === f.key} className={`nw-filter nw-filter--${f.key}${filter === f.key ? ' is-on' : ''}`} onClick={() => setFilter(f.key)}>
                {f.label} <em>{count}</em>
              </button>
            )
          })}
        </div>
        <span className="nw-panel__cat">
          {evaluation.categoryLabel}
          {rulesState.origin === 'default' ? ' · default rule set' : ''}
        </span>
      </div>

      {shown.length ? (
        <ResultTable results={shown} />
      ) : (
        <div className="nw-empty">{results.length ? 'No rules in this group.' : 'No open items — every applicable data point matched.'}</div>
      )}

      <div className="nw-panel__foot">
        <span />
        {configHref ? (
          <Link to={configHref} className="nw-link">
            <Settings2 size={13} aria-hidden /> Manage rules
          </Link>
        ) : null}
      </div>
    </div>
  )
}

