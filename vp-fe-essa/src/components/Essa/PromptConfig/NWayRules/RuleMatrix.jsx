import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { RULE_GROUP_LIST, SOURCES, groupForRule, sourceChannel, sourceLabel } from '../../lib/nWay/catalog'
import { Marker, TypeChip } from '../../lib/nWay/NWayChips'
import { scopeLabel } from '../../lib/nWay/ruleText'
import CellRoleMenu, { roleFromKey } from './CellRoleMenu'
import { MATRIX_MARK_LEGEND, matrixDocsForSource } from '../../lib/nWay/matrixMap'

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

const ROLE_WORD = { REQUIRED: 'mandatory', IF_PRESENT: 'optional', PARTIAL: 'partial', EXTRACT: 'available' }

/** Compare roles in reading order, with the Excel mark each one comes from. */
const COMPARE_LEGEND = [
  { role: 'REQUIRED', text: 'Mandatory', excel: MATRIX_MARK_LEGEND.find((m) => m.role === 'REQUIRED')?.excel },
  { role: 'IF_PRESENT', text: 'Optional', excel: null },
  { role: 'EXTRACT', text: 'Available', excel: MATRIX_MARK_LEGEND.find((m) => m.role === 'EXTRACT')?.excel }
]

const CHANNEL_SHORT = { VENDOR_PDF: 'PDF', USER: 'User', ESSA_SYSTEM: 'ESSA', EXTERNAL: 'Portal', SAP: 'SAP' }

const warningFor = (rule) => {
  if (rule.ruleType === 'AVAILABILITY') return null
  const compares = (rule.targets || []).filter((t) => t.requirement !== 'EXTRACT')
  if (!compares.length && ['EXACT', 'TOLERANCE', 'EXACT_UNIQUENESS'].includes(rule.ruleType)) return 'Nothing to compare'
  return null
}

const columnTip = (c) => {
  const ch = sourceChannel(c.code)
  const excel = matrixDocsForSource(c.code)
  return [
    `${c.label} · ${ch.long}`,
    excel.length ? `Excel column: ${excel.map((d) => `${d.title} (${d.column})`).join(' · ')}` : 'Not a column in the Excel matrix',
    excel.length ? `Excel “Source”: ${[...new Set(excel.map((d) => d.origin))].join(' · ')}` : null,
    c.ocrTypes.length ? `Read from pages classified as: ${c.ocrTypes.join(', ')}` : 'Looked up — no document needed'
  ]
    .filter(Boolean)
    .join('\n')
}

export default function RuleMatrix({ rules, categoryCode, selectedId, onSelect, onOpen, onSetRole, editable = true, readOnlyReason = '' }) {
  const [menu, setMenu] = useState(null) // { rule, code, el }
  const closeMenu = useCallback(() => setMenu(null), [])
  const cols = useMemo(() => matrixColumns(rules), [rules])
  // One continuous table, no topic sections. Rules keep their usual order (by topic, then rule);
  // in a category view the category's own rules come first, then the common rules it inherits.
  const ordered = useMemo(() => {
    const flat = RULE_GROUP_LIST.flatMap((g) => rules.filter((r) => groupForRule(r) === g.code))
    if (!categoryCode) return flat
    return [...flat.filter((r) => r.scope === 'CATEGORY'), ...flat.filter((r) => r.scope !== 'CATEGORY')]
  }, [rules, categoryCode])

  if (!rules.length) {
    return <div className="nw-empty">No rules match the current filters.</div>
  }

  return (
    <div className="nw-matrix-wrap">
      <div className="nw-matrix-legend nw-matrix-legend--clean">
        {COMPARE_LEGEND.map((m) => (
          <span key={m.role}>
            <Marker role={m.role} /> {m.text}
          </span>
        ))}
        <span
          className="nw-matrix-legend__info"
          tabIndex={0}
          title={[
            'Source = the document the value is read from first. Change it in the rule editor.',
            `Excel marks: ${COMPARE_LEGEND.filter((m) => m.excel).map((m) => `${m.excel} = ${m.text}`).join(', ')}.`,
            editable ? 'Click a cell, or focus it and press M, O, A or Del.' : ''
          ]
            .filter(Boolean)
            .join('\n')}>
          <Info size={13} aria-hidden /> How to read
        </span>
      </div>
      <table className="nw-matrix nw-matrix--split">
        <thead>
          <tr>
            <th className="nw-matrix__dp nw-sticky nw-sticky--dp">Data point</th>
            {cols.map((c, i) => {
              const ch = sourceChannel(c.code)
              return (
                <th key={c.code} className={`nw-matrix__col${i === 0 ? ' is-first' : ''}`} title={columnTip(c)}>
                  <span>{c.label}</span>
                  <em className={`nw-channel nw-channel--${ch.tone} nw-channel--xs`}>{CHANNEL_SHORT[ch.code]}</em>
                </th>
              )
            })}
            <th>Match type</th>
          </tr>
        </thead>
        <tbody>
            {ordered.map((r) => {
              const off = categoryCode && (r.disabledCategories || []).includes(categoryCode)
              const warn = warningFor(r)
              return (
                <tr
                  key={r.id}
                  className={`${selectedId === r.id ? 'is-selected' : ''}${off ? ' is-off' : ''}`}
                  onClick={() => onOpen?.(r)}>
                  <td className="nw-matrix__dp nw-sticky nw-sticky--dp">
                    <button type="button" className="nw-matrix__name" onClick={(e) => { e.stopPropagation(); onOpen?.(r) }}>
                      {r.dataPoint}
                    </button>
                    <span className="nw-matrix__sub">
                      {categoryCode && r.scope !== 'CATEGORY' ? <span className="nw-status nw-status--neutral nw-status--xs" title="Inherited from Common rules">Common</span> : null}
                      {off ? <span className="nw-status nw-status--neutral nw-status--xs">Off here</span> : null}
                      {r.scope === 'CATEGORY' && !categoryCode ? <span>{scopeLabel(r)}</span> : null}
                      {warn ? <span className="nw-matrix__warn"><AlertTriangle size={11} aria-hidden /> {warn}</span> : null}
                    </span>
                  </td>
                  {cols.map((c) => {
                    if (r.source === c.code) {
                      return (
                        <td
                          key={c.code}
                          className="nw-matrix__cell nw-matrix__cell--source"
                          title={`${sourceLabel(c.code)} is the source document for this rule`}
                          aria-label={`${r.dataPoint}: ${sourceLabel(c.code)} is the source document`}
                        />
                      )
                    }
                    const role = roleFor(r, c.code)
                    const label = `${r.dataPoint} on ${sourceLabel(c.code)}: ${role ? ROLE_WORD[role] : 'not compared'}`
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
                </tr>
              )
            })}
        </tbody>
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
