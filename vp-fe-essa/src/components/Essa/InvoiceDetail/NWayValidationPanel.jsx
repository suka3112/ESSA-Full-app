import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Clock3, List, MinusCircle, Settings2, Table2, XCircle } from 'lucide-react'

import { getMatchRulesCached } from 'api/matchRules'
import { evaluateInvoice } from '../lib/nWay/engine'
import { sourceChannel, sourceLabel } from '../lib/nWay/catalog'
import { COMPARISON_META, FailChip, STATUS_META, StatusPill, TypeChip } from '../lib/nWay/NWayChips'
import { criteriaSummary, requirementLabel } from '../lib/nWay/ruleText'
import { mergeNonPoValidationChecklist, mergeValidationChecklist } from '../lib/validationRuleCatalog'
import '../../../assets/scss/essa/n-way-rules.scss'

const STATUS_ICON = {
  pass: CheckCircle2,
  fail: XCircle,
  incomplete: CircleDashed,
  pending: Clock3,
  na: MinusCircle
}

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'fail', label: 'Mismatch' },
  { key: 'incomplete', label: 'Not captured' },
  { key: 'pending', label: 'Awaiting source' },
  { key: 'pass', label: 'Matched' },
  { key: 'na', label: 'Not applicable' }
]

const truncate = (v, n = 42) => {
  if (v == null || v === '') return null
  const s = String(v)
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

/** Per-source status for one result (used by the matrix view). */
const cellStatus = (result, code) => {
  if (code === result.rule.source) return 'source'
  if (result.sources.find((s) => s.code === code)?.role === 'EXTRACT') return 'extract'
  const c = result.comparisons.find((x) => x.to === code)
  return c ? c.status : result.sources.find((s) => s.code === code)?.present ? 'info' : 'none'
}

function ValueCell({ value, status }) {
  const text = truncate(value)
  return (
    <span className={`nw-val nw-val--${status}`} title={value || undefined}>
      {text || <em>{status === 'unavailable' ? 'Not connected' : status === 'skipped' ? 'Not attached' : status === 'missing' ? 'Missing' : 'Not captured'}</em>}
    </span>
  )
}

function ResultRow({ result, open, onToggle }) {
  const Icon = STATUS_ICON[result.status] || MinusCircle
  const { rule } = result
  const fieldOf = (code) => result.sources.find((s) => s.code === code)?.field || ''
  const extracts = result.sources.filter((s) => s.role === 'EXTRACT')
  return (
    <div className={`nw-res nw-res--${result.status}${open ? ' is-open' : ''}`}>
      <button type="button" className="nw-res__head" onClick={onToggle} aria-expanded={open}>
        <Icon size={17} className="nw-res__icon" aria-hidden />
        <span className="nw-res__main">
          <span className="nw-res__top">
            <span className="nw-mono nw-res__id">{rule.ruleKey}</span>
            <span className="nw-res__name">{rule.dataPoint}</span>
            <TypeChip type={rule.ruleType} />
            {rule.mandatory === false ? <span className="nw-status nw-status--neutral nw-status--xs">Optional</span> : null}
          </span>
          <span className="nw-res__headline">{result.headline}</span>
        </span>
        <span className="nw-res__docs" aria-label="Sources compared">
          {result.sources.map((s) => {
            const st = cellStatus(result, s.code)
            return (
              <span key={s.code} className={`nw-dotdoc nw-dotdoc--${st}`} title={`${s.label}: ${st === 'source' ? 'source (A)' : COMPARISON_META[st]?.label || 'not compared'}`}>
                {s.code === rule.source ? <b>A</b> : s.role === 'EXTRACT' ? <b className="is-e">E</b> : null}
                {s.label}
              </span>
            )
          })}
        </span>
        <span className="nw-res__right">
          {result.status === 'fail' ? <FailChip action={rule.onFail} /> : <StatusPill status={result.status} />}
          {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
        </span>
      </button>
      {open ? (
        <div className="nw-res__body">
          {result.comparisons.length ? (
            <table className="nw-cmp">
              <thead>
                <tr>
                  <th>{rule.compareMode === 'STEPWISE' ? 'Step' : ''}</th>
                  <th>From</th>
                  <th aria-hidden />
                  <th>Compared with</th>
                  <th>Requirement</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {result.comparisons.map((c, i) => (
                  <tr key={`${c.from}-${c.to}-${i}`}>
                    <td className="nw-mono">{rule.compareMode === 'STEPWISE' ? i + 1 : ''}</td>
                    <td>
                      <span className="nw-cmp__doc">{sourceLabel(c.from)}{c.from === rule.source ? <b className="nw-mark nw-mark--a nw-mark--xs">A</b> : null}</span>
                      {fieldOf(c.from) ? <small className="nw-cmp__field">{fieldOf(c.from)}</small> : null}
                      <ValueCell value={c.fromValue} status={c.fromValue ? 'value' : 'not_found'} />
                    </td>
                    <td><ArrowRight size={14} aria-hidden className="nw-cmp__arrow" /></td>
                    <td>
                      <span className="nw-cmp__doc">{sourceLabel(c.to)} <small>{sourceChannel(c.to).label}</small></span>
                      {fieldOf(c.to) ? <small className="nw-cmp__field">{fieldOf(c.to)}</small> : null}
                      <ValueCell value={c.toValue} status={c.toValue ? 'value' : c.status} />
                    </td>
                    <td className="nw-cmp__req">{requirementLabel(c.requirement)}</td>
                    <td>
                      <StatusPill status={c.status} meta={COMPARISON_META} />
                      <small className="nw-cmp__detail">{c.detail}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="nw-res__note">
              {result.rule.ruleType === 'CALCULATION' || result.rule.ruleType === 'UNIQUENESS' || result.rule.ruleType === 'AUTHENTICITY'
                ? 'This rule is calculated by the server integration; its values are not compared field-by-field here.'
                : 'No document comparisons for this rule on this invoice.'}
            </p>
          )}
          {extracts.length ? (
            <p className="nw-res__note">
              Extract only (context): {extracts.map((s) => `${s.label}${s.value ? ` — ${truncate(s.value, 60)}` : ''}`).join(' · ')}
            </p>
          ) : null}
          <dl className="nw-res__facts">
            <div>
              <dt>Passes when</dt>
              <dd>{rule.criteriaText || criteriaSummary(rule)}</dd>
            </div>
            {rule.runCondition?.type && rule.runCondition.type !== 'ALWAYS' ? (
              <div>
                <dt>Runs</dt>
                <dd>{rule.runCondition.text}</dd>
              </div>
            ) : null}
            {result.linkedCheck ? (
              <div>
                <dt>12-point result</dt>
                <dd>
                  {result.linkedCheck.title || result.linkedCheck.ruleCode} — {STATUS_META[result.linkedCheck.status]?.label || result.linkedCheck.status}
                  {result.linkedCheck.message ? ` · ${result.linkedCheck.message}` : ''}
                </dd>
              </div>
            ) : null}
            {rule.refs ? (
              <div>
                <dt>Data Point × Doc Matrix</dt>
                <dd>{rule.refs}</dd>
              </div>
            ) : null}
            <div>
              <dt>Impact on workflow</dt>
              <dd><FailChip action={rule.onFail} /></dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  )
}

function ResultMatrix({ results }) {
  const cols = useMemo(() => {
    const seen = []
    results.forEach((r) =>
      r.sources.forEach((s) => {
        if (!seen.includes(s.code)) seen.push(s.code)
      })
    )
    const order = ['INVOICE', 'FAKTUR_PAJAK', 'PO', 'GRN_SES', 'VENDOR_MASTER']
    return seen.sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [results])

  return (
    <div className="nw-matrix-wrap">
      <table className="nw-matrix nw-matrix--values">
        <thead>
          <tr>
            <th className="nw-matrix__dp">Data point</th>
            <th>Result</th>
            {cols.map((c) => (
              <th key={c} className="nw-matrix__col nw-matrix__col--wide">
                <span>{sourceLabel(c)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.rule.id || r.rule.ruleKey}>
              <td className="nw-matrix__dp">
                <span className="nw-mono">{r.rule.ruleKey}</span> {r.rule.dataPoint}
              </td>
              <td><StatusPill status={r.status} /></td>
              {cols.map((c) => {
                const src = r.sources.find((s) => s.code === c)
                if (!src) return <td key={c} className="nw-matrix__cell nw-matrix__cell--empty" />
                const st = cellStatus(r, c)
                return (
                  <td key={c} className={`nw-matrix__cell nw-matrix__cell--val nw-cell--${st}`}>
                    <ValueCell value={src.value} status={st === 'source' ? (src.value ? 'value' : 'not_found') : src.value ? 'value' : st} />
                  </td>
                )
              })}
            </tr>
          ))}
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
export default function NWayValidationPanel({ inv, sections, checks = [], validation = {}, isNonPo = false, invoiceTypeCode, configHref, view, onSummary }) {
  const [rulesState, setRulesState] = useState({ rules: null, origin: null })
  const [filter, setFilter] = useState('ALL')
  const [openKey, setOpenKey] = useState(null)

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

  const { summary, results } = evaluation
  const shown = filter === 'ALL' ? results : results.filter((r) => r.status === filter)

  return (
    <div className="nw-panel">
      <div className="nw-panel__bar">
        <div className="nw-filters" role="group" aria-label="Filter results">
          {FILTERS.map((f) => {
            const count = f.key === 'ALL' ? summary.total : summary[f.key] || 0
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

      {view === 'matrix' ? (
        <ResultMatrix results={shown} />
      ) : (
        <div className="nw-results">
          {shown.length ? (
            shown.map((r) => {
              const key = r.rule.id || r.rule.ruleKey
              return <ResultRow key={key} result={r} open={openKey === key} onToggle={() => setOpenKey(openKey === key ? null : key)} />
            })
          ) : (
            <div className="nw-empty">No rules in this group.</div>
          )}
        </div>
      )}

      <div className="nw-panel__foot">
        <span className="nw-legend-dots">
          <span className="nw-dotdoc nw-dotdoc--source"><b>A</b>Anchor</span>
          <span className="nw-dotdoc nw-dotdoc--match">Match</span>
          <span className="nw-dotdoc nw-dotdoc--mismatch">Differs / missing</span>
          <span className="nw-dotdoc nw-dotdoc--not_found">Not captured</span>
          <span className="nw-dotdoc nw-dotdoc--unavailable">Not connected</span>
          <span className="nw-dotdoc nw-dotdoc--extract">Extract only</span>
        </span>
        {configHref ? (
          <Link to={configHref} className="nw-link">
            <Settings2 size={13} aria-hidden /> Manage rules
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function NWayViewToggle({ view, onChange }) {
  return (
    <div className="nw-view nw-view--sm" role="tablist" aria-label="N-way view">
      <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'is-on' : ''} onClick={() => onChange('list')}>
        <List size={13} /> By rule
      </button>
      <button type="button" role="tab" aria-selected={view === 'matrix'} className={view === 'matrix' ? 'is-on' : ''} onClick={() => onChange('matrix')}>
        <Table2 size={13} /> Matrix
      </button>
    </div>
  )
}
