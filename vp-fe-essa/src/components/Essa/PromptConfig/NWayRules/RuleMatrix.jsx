import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { MATCH_LEVELS, RULE_GROUPS, RULE_GROUP_LIST, SOURCES, groupForRule, sourceChannel, sourceLabel } from '../../lib/nWay/catalog'
import { FailChip, Marker, TypeChip } from '../../lib/nWay/NWayChips'
import { criteriaSummary, scopeLabel } from '../../lib/nWay/ruleText'
import CellRoleMenu, { roleFromKey } from './CellRoleMenu'

/** Sources actually used by the visible rules (matrix columns). */
export const matrixColumns = (rules) => {
  const used = new Set()
  rules.forEach((r) => {
    used.add(r.source)
    ;(r.targets || []).forEach((t) => used.add(t.doc))
  })
  return SOURCES.filter((s) => used.has(s.code))
}

export const roleFor = (rule, code) => {
  if (rule.source === code) return 'SOURCE'
  const t = (rule.targets || []).find((x) => x.doc === code)
  return t ? t.requirement : null
}

/**
 * Set a cell's role directly (in-table editing).
 * role: 'SOURCE' | 'REQUIRED' | 'IF_PRESENT' | 'PARTIAL' | 'EXTRACT' | null (not used)
 * Returns the patched rule, or null when the change is not allowed
 * (the anchor can only move by making another cell the anchor).
 */
export const setCellRole = (rule, code, role) => {
  const current = roleFor(rule, code)
  if (current === (role ?? null)) return null
  if (current === 'SOURCE') return null
  const targets = (rule.targets || []).map((t) => ({ ...t }))
  if (role === 'SOURCE') {
    const cell = targets.find((t) => t.doc === code)
    const rest = targets.filter((t) => t.doc !== code)
    return {
      ...rule,
      source: code,
      sourceField: cell?.field || '',
      targets: [{ doc: rule.source, requirement: 'REQUIRED', field: rule.sourceField || '' }, ...rest]
    }
  }
  if (role == null) return { ...rule, targets: targets.filter((t) => t.doc !== code) }
  if (!current) return { ...rule, targets: [...targets, { doc: code, requirement: role, field: '' }] }
  return { ...rule, targets: targets.map((t) => (t.doc === code ? { ...t, requirement: role } : t)) }
}

const ROLE_WORD = { SOURCE: 'anchor', REQUIRED: 'compare · must match', IF_PRESENT: 'compare · if present', PARTIAL: 'partial', EXTRACT: 'extract only' }

const warningFor = (rule) => {
  if (rule.ruleType === 'AVAILABILITY') return null
  const compares = (rule.targets || []).filter((t) => t.requirement !== 'EXTRACT')
  if (!compares.length && ['EXACT', 'TOLERANCE'].includes(rule.ruleType)) return 'Nothing to compare'
  return null
}

export default function RuleMatrix({ rules, categoryCode, selectedId, onSelect, onEdit, onSetRole, editable = true, readOnlyReason = '' }) {
  const [menu, setMenu] = useState(null) // { rule, code, el }
  const closeMenu = useCallback(() => setMenu(null), [])
  const cols = useMemo(() => matrixColumns(rules), [rules])
  const grouped = useMemo(
    () =>
      RULE_GROUP_LIST.map((g) => ({ ...g, rules: rules.filter((r) => groupForRule(r) === g.code) })).filter(
        (g) => g.rules.length
      ),
    [rules]
  )

  if (!rules.length) {
    return <div className="nw-empty">No rules match the current filters.</div>
  }

  const colSpan = cols.length + 6

  return (
    <div className="nw-matrix-wrap">
      <div className="nw-matrix-legend">
        <span className="nw-label">Cell role</span>
        <span><Marker role="SOURCE" /> Anchor — source of truth (exactly one)</span>
        <span><Marker role="REQUIRED" /> Compare · must match</span>
        <span><Marker role="IF_PRESENT" /> Compare · if present</span>
        <span><Marker role="EXTRACT" /> Extract only (context)</span>
        {editable ? (
          <span className="nw-matrix-legend__hint">
            Click any cell to set its role (or focus it and press <kbd>A</kbd> <kbd>C</kbd> <kbd>O</kbd> <kbd>P</kbd> <kbd>E</kbd> <kbd>Del</kbd>) · click a data point to edit the whole rule
          </span>
        ) : null}
      </div>
      <table className="nw-matrix">
        <thead>
          <tr>
            <th className="nw-matrix__id">#</th>
            <th className="nw-matrix__dp">Data point</th>
            {cols.map((c) => {
              const ch = sourceChannel(c.code)
              return (
                <th key={c.code} className="nw-matrix__col" title={`${c.label} · ${ch.long}`}>
                  <span>{c.label}</span>
                  <em className={`nw-channel nw-channel--${ch.tone} nw-channel--xs`}>{ch.code === 'VENDOR_PDF' ? 'PDF' : ch.code === 'USER' ? 'User' : ch.code === 'ESSA_SYSTEM' ? 'ESSA' : ch.code === 'EXTERNAL' ? 'Portal' : 'SAP'}</em>
                </th>
              )
            })}
            <th>Match type</th>
            <th>Tolerance / rule</th>
            <th>Level</th>
            <th>On fail</th>
          </tr>
        </thead>
        {grouped.map((g) => (
          <tbody key={g.code}>
            <tr className="nw-matrix__grouprow">
              <td colSpan={colSpan}>
                {RULE_GROUPS[g.code].label} <span>{g.rules.length} rules</span>
              </td>
            </tr>
            {g.rules.map((r) => {
              const off = categoryCode && (r.disabledCategories || []).includes(categoryCode)
              const warn = warningFor(r)
              return (
                <tr
                  key={r.id}
                  className={`${selectedId === r.id ? 'is-selected' : ''}${off ? ' is-off' : ''}`}
                  onClick={() => onSelect?.(r.id)}>
                  <td className="nw-mono">{r.ruleKey}</td>
                  <td className="nw-matrix__dp">
                    <button type="button" className="nw-matrix__name" onClick={(e) => { e.stopPropagation(); onEdit?.(r) }}>
                      {r.dataPoint}
                    </button>
                    <span className="nw-matrix__sub">
                      {r.refs ? <span>{r.refs}</span> : null}
                      {r.status === 'CONFIRM' ? <span className="nw-status nw-status--warn nw-status--xs">Confirm</span> : null}
                      {off ? <span className="nw-status nw-status--neutral nw-status--xs">Off here</span> : null}
                      {r.scope === 'CATEGORY' && !categoryCode ? <span>{scopeLabel(r)}</span> : null}
                      {warn ? <span className="nw-matrix__warn"><AlertTriangle size={11} aria-hidden /> {warn}</span> : null}
                    </span>
                  </td>
                  {cols.map((c) => {
                    const role = roleFor(r, c.code)
                    const label = `${r.dataPoint} on ${sourceLabel(c.code)}: ${role ? ROLE_WORD[role] : 'not used'}`
                    const isOpen = menu && menu.rule.id === r.id && menu.code === c.code
                    return (
                      <td key={c.code} className="nw-matrix__cell">
                        {editable && r.ruleType !== 'AVAILABILITY' ? (
                          <button
                            type="button"
                            className={`nw-cellbtn${role ? '' : ' is-empty'}${isOpen ? ' is-open' : ''}`}
                            aria-label={`${label}. Press Enter to change.`}
                            aria-haspopup="menu"
                            aria-expanded={Boolean(isOpen)}
                            title={`${label} — click to change`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect?.(r.id)
                              setMenu(isOpen ? null : { rule: r, code: c.code, el: e.currentTarget })
                            }}
                            onKeyDown={(e) => {
                              const next = roleFromKey(e.key)
                              if (next === undefined || e.metaKey || e.ctrlKey || e.altKey) return
                              e.preventDefault()
                              e.stopPropagation()
                              if (readOnlyReason) return
                              onSetRole?.(r, c.code, next)
                            }}>
                            {role ? <Marker role={role} title={label} /> : <span className="nw-cellbtn__plus" aria-hidden>+</span>}
                          </button>
                        ) : role ? (
                          <Marker role={role} title={label} />
                        ) : null}
                      </td>
                    )
                  })}
                  <td><TypeChip type={r.ruleType} /></td>
                  <td className="nw-matrix__tol">{r.criteriaText || criteriaSummary(r)}</td>
                  <td className="nw-matrix__scope">{MATCH_LEVELS[r.matchLevel]?.label || 'Header'}</td>
                  <td><FailChip action={r.onFail} /></td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
      {menu ? (
        <CellRoleMenu
          anchorEl={menu.el}
          current={roleFor(rules.find((x) => x.id === menu.rule.id) || menu.rule, menu.code)}
          title={`${menu.rule.dataPoint} · ${sourceLabel(menu.code)}`}
          disabledReason={readOnlyReason}
          onClose={closeMenu}
          onPick={(role) => {
            const rule = rules.find((x) => x.id === menu.rule.id) || menu.rule
            setMenu(null)
            onSetRole?.(rule, menu.code, role)
            menu.el?.focus()
          }}
        />
      ) : null}
    </div>
  )
}
