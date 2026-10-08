import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, List, Maximize2, Minimize2, MoreHorizontal, Plus, RotateCcw, Search, Table2 } from 'lucide-react'

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
import { CATEGORIES, CATEGORY_BY_CODE, COMMON, RULE_TYPE_LIST, sourceLabel } from '../../lib/nWay/catalog'
import { rulesToCsv } from '../../lib/nWay/ruleText'
import { RuleChain, TypeChip } from '../../lib/nWay/NWayChips'
import RuleEditor, { emptyMatchRule } from './RuleEditor'
import RuleMatrix, { matrixColumns, setCellRole } from './RuleMatrix'
import RuleDetails from './RuleDetails'
import '../../../../assets/scss/essa/n-way-rules.scss'

const apiError = (err) => err?.response?.data?.message || err?.message || 'Please try again.'

const toPayload = (rule) => {
  const { id, ruleId, updatedAt, ...rest } = rule
  return rest
}

const byOrder = (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || String(a.ruleKey).localeCompare(String(b.ruleKey), undefined, { numeric: true })

/** Small “⋯” menu for secondary page actions. */
function MoreMenu({ open, onToggle, onClose, items }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) onClose()
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return (
    <div className="nw-more" ref={ref}>
      <button type="button" className="nw-iconbtn" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div className="nw-more__menu" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                onClose()
                it.onClick()
              }}>
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function MatchRules() {
  const [rules, setRules] = useState([])
  const [origin, setOrigin] = useState('server')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cat, setCat] = useState(COMMON)
  const [view, setView] = useState('matrix')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [catQuery, setCatQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState(null) // { rule } | null
  const [fullView, setFullView] = useState(false)

  // Esc leaves full view (the open drawer handles Esc itself first).
  useEffect(() => {
    if (!fullView) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !editing && !detailId) setFullView(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('nw-fullview-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('nw-fullview-open')
    }
  }, [fullView, editing, detailId])
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
      if (!q) return true
      const hay = [r.ruleKey, r.dataPoint, sourceLabel(r.source), ...(r.targets || []).map((t) => sourceLabel(t.doc))]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [categoryRules, typeFilter, query])

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

  const detailRule = useMemo(() => rules.find((r) => r.id === detailId) || null, [rules, detailId])



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
        showEssaErrorToast('The anchor stays until replaced', 'Set another document as Anchor (A) — this one then becomes “Mandatory”.')
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
      setDetailId(null)
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

  const visibleCats = CATEGORIES.filter((c) => !catQuery.trim() || c.label.toLowerCase().includes(catQuery.trim().toLowerCase()))

  const openDetails = (id) => {
    setSelectedId(id)
    setDetailId(id)
  }
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const ruleCount = (n) => `${n} ${n === 1 ? 'rule' : 'rules'}`

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="nw-screen nw-screen--clean">
      <div className="nw-screen__head">
        <div>
          <h2>N-Way Matching</h2>
          <p>Each rule reads a data point from its source document and checks it against other documents or SAP.</p>
        </div>
        <div className="nw-screen__actions">
          <MoreMenu
            open={moreOpen}
            onToggle={() => setMoreOpen((v) => !v)}
            onClose={closeMore}
            items={[
              { label: 'Export CSV', icon: <Download size={14} />, onClick: exportCsv, disabled: loading },
              { label: 'Restore defaults', icon: <RotateCcw size={14} />, onClick: () => setConfirmRestore(true), disabled: loading || readOnly }
            ]}
          />
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

      <div className={`nw-layout nw-layout--two${fullView ? ' is-full' : ''}`} aria-label={fullView ? 'Rules — full view' : undefined}>
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
            </button>
            {['PO', 'NON_PO'].map((group) => (
              <div key={group}>
                <div className="nw-rail__group">{group === 'PO' ? 'PO invoices' : 'Non-PO invoices'}</div>
                {visibleCats
                  .filter((c) => c.group === group)
                  .map((c) => (
                    <button key={c.code} type="button" className={`nw-rail__item${cat === c.code ? ' is-active' : ''}`} onClick={() => setCat(c.code)}>
                      <span>{c.label}</span>
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
              <span>{filtered.length === categoryRules.length ? ruleCount(categoryRules.length) : `${filtered.length} of ${ruleCount(categoryRules.length)}`}</span>
            </div>
            <div className="nw-main__actions">
              <div className="nw-view" role="tablist" aria-label="View">
                <button type="button" role="tab" aria-selected={view === 'matrix'} className={view === 'matrix' ? 'is-on' : ''} onClick={() => setView('matrix')}>
                  <Table2 size={14} /> Matrix
                </button>
                <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}>
                  <List size={14} /> List
                </button>
              </div>
              <button
                type="button"
                className={`nw-view__full${fullView ? ' is-on' : ''}`}
                aria-pressed={fullView}
                title={fullView ? 'Exit full view (Esc)' : 'Open the table in full view'}
                onClick={() => setFullView((v) => !v)}>
                {fullView ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {fullView ? 'Exit full view' : 'Full view'}
              </button>
            </div>
          </div>

          <div className="nw-toolbar nw-toolbar--clean">
              <label className="nw-searchbox">
                <Search size={14} aria-hidden />
                <input type="search" value={query} placeholder="Search data point, rule or document" aria-label="Search rules" onChange={(e) => setQuery(e.target.value)} />
              </label>
              <label className="nw-typefilter">
                <span>Type</span>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by validation type">
                  <option value="ALL">All types</option>
                  {RULE_TYPE_LIST.map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
              </label>
              {typeFilter !== 'ALL' || query ? (
                <button type="button" className="nw-link" onClick={() => { setTypeFilter('ALL'); setQuery('') }}>
                  Clear filters
                </button>
              ) : null}
          </div>

          {loading ? (
            <div className="nw-empty">Loading validation rules…</div>
          ) : view === 'matrix' ? (
            <RuleMatrix
              rules={filtered}
              categoryCode={cat === COMMON ? null : cat}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpen={(r) => openDetails(r.id)}
              onSetRole={setRole}
              editable
              readOnlyReason={readOnly ? 'Editing is off until the rules service is running — restart the backend (Run App.command).' : ''}
            />
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
                    const isSel = selectedId === r.id
                    return (
                      <button key={r.id} type="button" className={`nw-row${isSel ? ' is-selected' : ''}${off ? ' is-off' : ''}`} onClick={() => openDetails(r.id)}>
                        <div className="nw-row__main">
                          <div className="nw-row__top">
                            <span className="nw-mono nw-row__id">{r.ruleKey}</span>
                            <span className="nw-row__name">{r.dataPoint}</span>
                            <TypeChip type={r.ruleType} />
                            {r.status === 'INACTIVE' || off ? <span className="nw-status nw-status--neutral nw-status--xs">{off ? 'Off here' : 'Inactive'}</span> : null}
                          </div>
                          <div className="nw-row__chain">
                            <RuleChain rule={r} />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <RuleDetails
        rule={editing ? null : detailRule}
        categoryCode={cat === COMMON ? null : cat}
        readOnly={readOnly}
        saving={saving}
        onClose={() => setDetailId(null)}
        onEdit={(r) => setEditing({ rule: r })}
        onToggleOff={toggleOffHere}
        onDelete={(r) => setPendingDelete(r)}
      />

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
