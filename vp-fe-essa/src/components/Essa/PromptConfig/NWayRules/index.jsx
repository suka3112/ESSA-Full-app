import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, List, Pencil, Plus, RotateCcw, Search, Table2, Trash2 } from 'lucide-react'

import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { showEssaErrorToast, showEssaSuccessToast } from '../../lib/essaToast'
import {
  createMatchRule,
  deleteMatchRule,
  fetchMatchRules,
  invalidateMatchRulesCache,
  restoreDefaultMatchRules,
  updateMatchRule
} from '../../../../api/matchRules'
import {
  CATEGORIES,
  CATEGORY_BY_CODE,
  COMMON,
  FAIL_ACTIONS,
  MATCH_LEVELS,
  RULE_STATUSES,
  RULE_TYPE_LIST,
  sourceChannel,
  sourceLabel
} from '../../lib/nWay/catalog'
import { ruleAppliesToCategory } from '../../lib/nWay/engine'
import { criteriaSummary, describeRule, requirementLabel, rulesToCsv, scopeLabel } from '../../lib/nWay/ruleText'
import { FailChip, RuleChain, TypeChip } from '../../lib/nWay/NWayChips'
import { VALIDATION_RULE_CATALOG } from '../../lib/validationRuleCatalog'
import RuleEditor, { emptyMatchRule } from './RuleEditor'
import RuleMatrix, { matrixColumns, setCellRole } from './RuleMatrix'
import '../../../../assets/scss/essa/n-way-rules.scss'

const apiError = (err) => err?.response?.data?.message || err?.message || 'Please try again.'

const toPayload = (rule) => {
  const { id, ruleId, updatedAt, ...rest } = rule
  return rest
}

const byOrder = (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || String(a.ruleKey).localeCompare(String(b.ruleKey), undefined, { numeric: true })

export default function MatchRules() {
  const [rules, setRules] = useState([])
  const [origin, setOrigin] = useState('server')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cat, setCat] = useState(COMMON)
  const [view, setView] = useState('matrix')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [onlyConfirm, setOnlyConfirm] = useState(false)
  const [query, setQuery] = useState('')
  const [catQuery, setCatQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null) // { rule } | null
  const [pendingDelete, setPendingDelete] = useState(null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  const readOnly = origin !== 'server'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchMatchRules()
    setRules(res.rules.slice().sort(byOrder))
    setOrigin(res.origin)
    setLoadError(res.error || '')
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ── Derived ───────────────────────────────────────────────────────── */
  const categoryRules = useMemo(() => {
    if (cat === COMMON) return rules.filter((r) => r.scope !== 'CATEGORY')
    return rules.filter((r) => r.scope !== 'CATEGORY' || (r.categories || []).includes(cat))
  }, [rules, cat])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return categoryRules.filter((r) => {
      if (typeFilter !== 'ALL' && r.ruleType !== typeFilter) return false
      if (onlyConfirm && r.status !== 'CONFIRM') return false
      if (!q) return true
      const hay = [r.ruleKey, r.dataPoint, sourceLabel(r.source), ...(r.targets || []).map((t) => sourceLabel(t.doc)), r.businessNote]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [categoryRules, typeFilter, onlyConfirm, query])

  const groups = useMemo(() => {
    if (cat === COMMON) {
      return [{ key: 'common', title: 'Common rules', hint: 'Edits here apply to every category', rules: filtered }]
    }
    const specific = filtered.filter((r) => r.scope === 'CATEGORY')
    const inherited = filtered.filter((r) => r.scope !== 'CATEGORY')
    return [
      { key: 'specific', title: `${CATEGORY_BY_CODE[cat]?.label} only`, hint: 'Specific to this category', rules: specific, emptyText: categoryRules.some((r) => r.scope === 'CATEGORY') ? 'No category rules match the filters.' : 'No category-specific rules yet. Common rules already apply.' },
      { key: 'inherited', title: 'Inherited from Common', hint: 'Edit in Common rules · switch off per category', rules: inherited }
    ]
  }, [filtered, cat, categoryRules])

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  )

  const counts = useMemo(() => {
    const out = { [COMMON]: rules.filter((r) => r.scope !== 'CATEGORY' && r.status !== 'INACTIVE').length }
    CATEGORIES.forEach((c) => {
      out[c.code] = rules.filter((r) => ruleAppliesToCategory(r, c.code)).length
    })
    return out
  }, [rules])

  const confirmCount = useMemo(() => rules.filter((r) => r.status === 'CONFIRM').length, [rules])
  const specificCount = useMemo(() => {
    const out = {}
    CATEGORIES.forEach((c) => {
      out[c.code] = rules.filter((r) => r.scope === 'CATEGORY' && (r.categories || []).includes(c.code)).length
    })
    return out
  }, [rules])

  /* ── Actions ───────────────────────────────────────────────────────── */
  const guard = () => {
    if (!readOnly) return true
    showEssaErrorToast('Rules service not reachable', 'Run migration 030 and restart the API to save changes.')
    return false
  }

  const replaceRule = (saved) =>
    setRules((prev) => {
      const exists = prev.some((r) => r.id === saved.id)
      const next = exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]
      return next.sort(byOrder)
    })

  const saveRule = async (draft) => {
    if (!guard()) return
    setSaving(true)
    try {
      const saved = draft.id
        ? await updateMatchRule(draft.id, toPayload(draft))
        : await createMatchRule(toPayload(draft))
      if (saved) {
        replaceRule({ ...saved, id: saved.id ?? saved.ruleId })
        setSelectedId(saved.id ?? saved.ruleId)
      }
      invalidateMatchRulesCache()
      setEditing(null)
      showEssaSuccessToast(draft.id ? 'Rule updated' : 'Rule created', `${draft.ruleKey} · ${draft.dataPoint}`)
    } catch (err) {
      showEssaErrorToast('Could not save rule', apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleOffHere = async (rule) => {
    if (!guard() || cat === COMMON) return
    const off = (rule.disabledCategories || []).includes(cat)
    const disabledCategories = off
      ? rule.disabledCategories.filter((c) => c !== cat)
      : [...(rule.disabledCategories || []), cat]
    setSaving(true)
    try {
      const saved = await updateMatchRule(rule.id, { disabledCategories })
      if (saved) replaceRule({ ...saved, id: saved.id ?? saved.ruleId })
      invalidateMatchRulesCache()
      showEssaSuccessToast(off ? 'Rule switched on' : 'Rule switched off', `${rule.ruleKey} for ${CATEGORY_BY_CODE[cat]?.label}`)
    } catch (err) {
      showEssaErrorToast('Could not update rule', apiError(err))
    } finally {
      setSaving(false)
    }
  }

  /** In-table edit: set one cell's role and save straight away (optimistic, rolls back on error). */
  const setRole = async (rule, code, role) => {
    if (!guard()) return
    const next = setCellRole(rule, code, role)
    if (!next) {
      if (rule.source === code && role !== 'SOURCE') {
        showEssaErrorToast('The anchor stays until replaced', 'Set another document as Anchor (A) — this one then becomes “must match”.')
      }
      return
    }
    replaceRule(next)
    setSelectedId(rule.id)
    try {
      const saved = await updateMatchRule(rule.id, { source: next.source, sourceField: next.sourceField, targets: next.targets })
      if (saved) replaceRule({ ...saved, id: saved.id ?? saved.ruleId })
      invalidateMatchRulesCache()
    } catch (err) {
      replaceRule(rule)
      showEssaErrorToast('Could not update the matrix', apiError(err))
    }
  }

  const removeRule = async () => {
    if (!pendingDelete || !guard()) return
    setSaving(true)
    try {
      await deleteMatchRule(pendingDelete.id)
      setRules((prev) => prev.filter((r) => r.id !== pendingDelete.id))
      invalidateMatchRulesCache()
      showEssaSuccessToast('Rule deleted', `${pendingDelete.ruleKey} · ${pendingDelete.dataPoint}`)
      setPendingDelete(null)
    } catch (err) {
      showEssaErrorToast('Could not delete rule', apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const restore = async () => {
    if (!guard()) return
    setSaving(true)
    try {
      const next = await restoreDefaultMatchRules()
      setRules(next.sort(byOrder))
      invalidateMatchRulesCache()
      showEssaSuccessToast('Defaults restored', `${next.length} rules from the agreed matrix`)
      setConfirmRestore(false)
    } catch (err) {
      showEssaErrorToast('Could not restore defaults', apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    const list = filtered.length ? filtered : categoryRules
    const csv = rulesToCsv(list, matrixColumns(list).map((c) => c.code))
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation-rules-${cat === COMMON ? 'common' : cat.toLowerCase()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const catName = cat === COMMON ? 'Common rules' : CATEGORY_BY_CODE[cat]?.label
  const catMeta =
    cat === COMMON
      ? 'Rules every invoice runs, whatever the category'
      : [
          CATEGORY_BY_CODE[cat]?.poSeries ? `PO series ${CATEGORY_BY_CODE[cat].poSeries}` : null,
          CATEGORY_BY_CODE[cat]?.receipt ? `Receipt: ${CATEGORY_BY_CODE[cat].receipt}` : CATEGORY_BY_CODE[cat]?.group === 'NON_PO' ? 'Non-PO' : null
        ]
          .filter(Boolean)
          .join(' · ')

  const visibleCats = CATEGORIES.filter((c) => !catQuery.trim() || c.label.toLowerCase().includes(catQuery.trim().toLowerCase()))

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="nw-screen">
      <div className="nw-screen__head">
        <div>
          <h2>N-Way Matching</h2>
          <p>Each rule takes a data point from one anchor document (A) and checks it against other documents or SAP master data (C). Rows trace back to the Data Point × Doc Matrix.</p>
        </div>
        <div className="nw-screen__actions">
          {confirmCount ? (
            <button type="button" className={`nw-status nw-status--warn nw-status--btn${onlyConfirm ? ' is-on' : ''}`} onClick={() => setOnlyConfirm((v) => !v)} aria-pressed={onlyConfirm}>
              {confirmCount} need business confirmation
            </button>
          ) : null}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading}>
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmRestore(true)} disabled={loading || readOnly}>
            <RotateCcw size={14} /> Restore defaults
          </Button>
          <Button variant="primary" size="sm" onClick={() => setEditing({ rule: emptyMatchRule(cat) })} disabled={loading}>
            <Plus size={14} /> Add data point
          </Button>
        </div>
      </div>

      {readOnly && !loading ? (
        <div className="nw-banner" role="status">
          <AlertTriangle size={16} aria-hidden />
          <div>
            <b>Showing the default rule set — changes can’t be saved yet.</b>
            <span>
              The rules service did not respond ({loadError}). Restart the backend (double-click <code>Run App.command</code>) — it creates the rules table and loads these defaults, then the matrix becomes editable.
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={load}>Retry</Button>
        </div>
      ) : null}

      <div className="nw-layout">
        {/* Category rail */}
        <aside className="nw-rail" aria-label="Invoice categories">
          <label className="nw-rail__search">
            <Search size={14} aria-hidden />
            <input type="search" placeholder="Find a category" aria-label="Find a category" value={catQuery} onChange={(e) => setCatQuery(e.target.value)} />
          </label>
          <div className="nw-rail__list">
            <button type="button" className={`nw-rail__item nw-rail__item--common${cat === COMMON ? ' is-active' : ''}`} onClick={() => setCat(COMMON)}>
              <span>
                <b>Common rules</b>
                <small>Apply to every category</small>
              </span>
              <span className="nw-count">{counts[COMMON]}</span>
            </button>
            {['PO', 'NON_PO'].map((group) => (
              <div key={group}>
                <div className="nw-rail__group">{group === 'PO' ? 'PO invoices' : 'Non-PO invoices'}</div>
                {visibleCats
                  .filter((c) => c.group === group)
                  .map((c) => (
                    <button key={c.code} type="button" className={`nw-rail__item${cat === c.code ? ' is-active' : ''}`} onClick={() => setCat(c.code)}>
                      <span>{c.label}</span>
                      <span className="nw-count" title={`${counts[c.code]} rules apply · ${specificCount[c.code]} category-specific`}>
                        {counts[c.code]}
                        {specificCount[c.code] ? <i>+{specificCount[c.code]}</i> : null}
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <section className="nw-main">
          <div className="nw-main__head">
            <div className="nw-main__title">
              <h3>{catName}</h3>
              <span>{catMeta}</span>
            </div>
            <div className="nw-view" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}>
                <List size={14} /> List
              </button>
              <button type="button" role="tab" aria-selected={view === 'matrix'} className={view === 'matrix' ? 'is-on' : ''} onClick={() => setView('matrix')}>
                <Table2 size={14} /> Matrix
              </button>
            </div>
          </div>
          <div className="nw-toolbar">
            <div className="nw-filters" role="group" aria-label="Filter by type">
              {[{ code: 'ALL', label: 'All' }, ...RULE_TYPE_LIST].map((t) => (
                <button key={t.code} type="button" aria-pressed={typeFilter === t.code} className={`nw-filter${typeFilter === t.code ? ' is-on' : ''}`} onClick={() => setTypeFilter(t.code)}>
                  {t.label}
                </button>
              ))}
            </div>
            <label className="ic-search nw-search">
              <Search size={14} />
              <input type="search" value={query} placeholder="Search data point, rule or document" onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>

          {loading ? (
            <div className="nw-empty">Loading validation rules…</div>
          ) : view === 'matrix' ? (
            <RuleMatrix rules={filtered} categoryCode={cat === COMMON ? null : cat} selectedId={selected?.id} onSelect={setSelectedId} onEdit={(r) => setEditing({ rule: r })} onSetRole={setRole} editable readOnlyReason={readOnly ? 'Editing is off until the rules service is running — restart the backend (Run App.command).' : ''} />
          ) : (
            <div className="nw-list">
              {groups.map((g) => (
                <div key={g.key} className="nw-group">
                  <div className="nw-group__head">
                    <span>
                      {g.title} <em>{g.rules.length}</em>
                    </span>
                    <small>{g.hint}</small>
                  </div>
                  {!g.rules.length ? <div className="nw-group__empty">{g.emptyText || 'No rules match the filters.'}</div> : null}
                  {g.rules.map((r) => {
                    const off = cat !== COMMON && (r.disabledCategories || []).includes(cat)
                    const isSel = selected?.id === r.id
                    return (
                      <button key={r.id} type="button" className={`nw-row${isSel ? ' is-selected' : ''}${off ? ' is-off' : ''}`} onClick={() => setSelectedId(r.id)} aria-pressed={isSel}>
                        <div className="nw-row__main">
                          <div className="nw-row__top">
                            <span className="nw-mono nw-row__id">{r.ruleKey}</span>
                            <span className="nw-row__name">{r.dataPoint}</span>
                            <TypeChip type={r.ruleType} />
                            {r.status === 'CONFIRM' ? <span className="nw-status nw-status--warn nw-status--xs">Needs confirmation</span> : null}
                            {r.status === 'DRAFT' ? <span className="nw-status nw-status--neutral nw-status--xs">Draft</span> : null}
                            {r.status === 'INACTIVE' || off ? <span className="nw-status nw-status--neutral nw-status--xs">{off ? 'Off here' : 'Inactive'}</span> : null}
                          </div>
                          <div className="nw-row__chain">
                            <RuleChain rule={r} />
                          </div>
                        </div>
                        <FailChip action={r.onFail} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Inspector */}
        <aside className="nw-inspector" aria-label="Selected rule">
          {selected ? (
            <>
              <div className="nw-inspector__head">
                <div className="nw-inspector__meta">
                  <span className="nw-mono">Rule {selected.ruleKey}</span>
                  <TypeChip type={selected.ruleType} />
                  <span className={`nw-status nw-status--${RULE_STATUSES[selected.status]?.tone || 'neutral'} nw-status--xs`}>{RULE_STATUSES[selected.status]?.label}</span>
                </div>
                <h3>{selected.dataPoint}</h3>
                <span className="nw-inspector__scope">
                  {scopeLabel(selected)} · {MATCH_LEVELS[selected.matchLevel]?.label || 'Header'} level · {selected.mandatory === false ? 'Optional' : 'Mandatory'}
                  {selected.refs ? ` · Matrix ${selected.refs}` : ''}
                </span>
              </div>
              <div className="nw-inspector__body">
                <p className="nw-sentence">{describeRule(selected)}</p>

                <div className="nw-block">
                  <span className="nw-label">Pairs evaluated · {selected.compareMode === 'STEPWISE' ? 'step by step' : 'anchor → each compare document'}</span>
                  <div className="nw-check">
                    <div className="nw-check__row nw-check__row--src">
                      <span className="nw-mark nw-mark--a" aria-hidden>A</span>
                      <span className="nw-check__doc">
                        <b>{sourceLabel(selected.source)}</b>
                        <small>{selected.sourceField ? `${selected.sourceField} · ` : ''}Anchor · {sourceChannel(selected.source).long}</small>
                      </span>
                    </div>
                    {(selected.targets || []).map((t, i) => (
                      <div key={`${t.doc}-${i}`} className="nw-check__row">
                        <span className="nw-check__marker">
                          {t.requirement === 'EXTRACT' ? (
                            <span className="nw-mark nw-mark--e" aria-hidden>E</span>
                          ) : (
                            <span className={`nw-mark ${t.requirement === 'IF_PRESENT' ? 'nw-mark--o' : t.requirement === 'PARTIAL' ? 'nw-mark--p' : 'nw-mark--x'}`} aria-hidden />
                          )}
                        </span>
                        <span className="nw-check__doc">
                          <b>{selected.compareMode === 'STEPWISE' && t.requirement !== 'EXTRACT' ? `${i + 1}. ` : ''}{sourceLabel(t.doc)}</b>
                          <small>{t.field ? `${t.field} · ` : ''}{sourceChannel(t.doc).long}</small>
                        </span>
                        <span className={`nw-check__req${t.requirement === 'IF_PRESENT' ? ' is-soft' : ''}`}>{requirementLabel(t.requirement)}</span>
                      </div>
                    ))}
                    {!(selected.targets || []).length ? (
                      <div className="nw-check__row nw-check__row--note">
                        {selected.ruleType === 'AVAILABILITY' ? 'Availability only — checks the document is in the invoice package.' : 'Single-source rule — evaluated on the value itself.'}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="nw-block">
                  <span className="nw-label">Passes when</span>
                  <p>{selected.criteriaText || criteriaSummary(selected)}</p>
                </div>
                <div className="nw-block">
                  <span className="nw-label">Runs</span>
                  <p>{selected.runCondition?.type && selected.runCondition.type !== 'ALWAYS' ? selected.runCondition.text : 'Always'}</p>
                </div>
                <div className="nw-block">
                  <span className="nw-label">Impact on workflow</span>
                  <div className="nw-inline">
                    <FailChip action={selected.onFail} />
                    <span>{FAIL_ACTIONS[selected.onFail]?.help}</span>
                  </div>
                </div>
                {selected.linkedCheck ? (
                  <div className="nw-block">
                    <span className="nw-label">12-point checklist</span>
                    <p>Result shown with “{VALIDATION_RULE_CATALOG.find((c) => c.ruleCode === selected.linkedCheck)?.title || selected.linkedCheck}”.</p>
                  </div>
                ) : null}
                {selected.businessNote ? (
                  <div className="nw-note">
                    <span className="nw-label">Business note</span>
                    <p>{selected.businessNote}</p>
                    {selected.noteBy ? <small>{selected.noteBy}</small> : null}
                  </div>
                ) : null}
                {selected.status === 'CONFIRM' && selected.confirmWith ? (
                  <div className="nw-confirm">
                    <span className="nw-avatar" aria-hidden>
                      {selected.confirmWith.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </span>
                    <span>Confirm with {selected.confirmWith}</span>
                    <b>Pending</b>
                  </div>
                ) : null}
              </div>
              <div className="nw-inspector__foot">
                <Button variant="primary" onClick={() => setEditing({ rule: selected })}>
                  <Pencil size={14} /> Edit rule
                </Button>
                {cat !== COMMON && selected.scope !== 'CATEGORY' ? (
                  <Button variant="outline" onClick={() => toggleOffHere(selected)} disabled={saving || readOnly}>
                    {(selected.disabledCategories || []).includes(cat) ? 'Switch on here' : 'Switch off here'}
                  </Button>
                ) : null}
                <button type="button" className="ic-icon-btn is-danger" aria-label={`Delete rule ${selected.ruleKey}`} title="Delete rule" onClick={() => setPendingDelete(selected)} disabled={readOnly}>
                  <Trash2 size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="nw-empty">Select a rule to see how it is checked.</div>
          )}
        </aside>
      </div>

      <RuleEditor
        open={Boolean(editing)}
        rule={editing?.rule}
        allRules={rules}
        saving={saving}
        readOnly={readOnly}
        onClose={() => setEditing(null)}
        onSave={saveRule}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => !saving && setPendingDelete(null)}
        width={460}
        title="Delete rule?"
        description={pendingDelete ? `${pendingDelete.ruleKey} · ${pendingDelete.dataPoint} stops running on new invoices. Past validation results are kept.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={saving}>Cancel</Button>
            <Button variant="danger" onClick={removeRule} disabled={saving}>{saving ? 'Deleting…' : 'Delete rule'}</Button>
          </>
        }
      />

      <Dialog
        open={confirmRestore}
        onClose={() => !saving && setConfirmRestore(false)}
        width={480}
        title="Restore the default rule set?"
        description="Replaces every rule with the set agreed on the 25 Sep requirement call (Data Point × Doc Matrix V2). Your edits are archived, not lost."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRestore(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={restore} disabled={saving}>{saving ? 'Restoring…' : 'Restore defaults'}</Button>
          </>
        }
      />
    </div>
  )
}
