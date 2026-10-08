import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Plus, X } from 'lucide-react'

import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import {
  CATEGORIES,
  CATEGORY_BY_CODE,
  DATA_POINT_OPTIONS,
  REQUIREMENT_LIST,
  RULE_TYPE_LIST,
  SOURCES,
  isServerType,
  sourceChannel,
  sourceLabel
} from '../../lib/nWay/catalog'
import { describeRule } from '../../lib/nWay/ruleText'
import { fieldOptionsForSource, sourceOptionsForScope, useCaptureTypes } from '../../lib/nWay/captureFields'

export const emptyMatchRule = (categoryCode) => ({
  id: null,
  ruleKey: '',
  dataPoint: '',
  dataKey: '',
  ruleType: 'EXACT',
  group: null,
  scope: categoryCode && categoryCode !== 'COMMON' ? 'CATEGORY' : 'COMMON',
  categories: categoryCode && categoryCode !== 'COMMON' ? [categoryCode] : [],
  disabledCategories: [],
  source: 'INVOICE',
  sourceField: '',
  targets: [{ doc: 'PO', requirement: 'REQUIRED', field: '' }],
  compareMode: 'ONE_TO_ALL',
  matchLevel: 'HEADER',
  mandatory: true,
  criteria: {
    similarity: null,
    aiConfidence: null,
    tolerancePct: null,
    toleranceAmount: null,
    combine: 'LOWER',
    measuredOn: 'TARGET',
    uniqueKey: []
  },
  criteriaText: '',
  runCondition: { type: 'ALWAYS', text: '' },
  onFail: 'REVIEW',
  status: 'ACTIVE',
  businessNote: '',
  noteBy: '',
  confirmWith: '',
  linkedCheck: null,
  serverSide: false,
  refs: ''
})

const clone = (v) => JSON.parse(JSON.stringify(v))

/** Next free rule ID: 1.xx for common rules, 2.xx for category rules. */
const nextRuleKey = (allRules, scope) => {
  const major = scope === 'CATEGORY' ? 2 : 1
  const used = allRules
    .map((r) => String(r.ruleKey || '').match(/^(\d+)\.(\d+)$/))
    .filter((m) => m && Number(m[1]) === major)
    .map((m) => Number(m[2]))
  return `${major}.${String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0')}`
}

/** Documents first, then SAP master (DB), then other systems. */
const SOURCE_GROUPS = [
  { label: 'Documents (invoice package / user upload)', channels: ['VENDOR_PDF', 'USER'] },
  { label: 'DB — SAP master on the AP platform', channels: ['SAP'] },
  { label: 'Other systems', channels: ['EXTERNAL', 'ESSA_SYSTEM'] }
]

function SourceSelect({ value, onChange, options = SOURCES, exclude = [], ariaLabel }) {
  const list = options.some((s) => s.code === value) ? options : [...options, ...SOURCES.filter((s) => s.code === value)]
  return (
    <select aria-label={ariaLabel} className="dx-select nw-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {SOURCE_GROUPS.map((g) => {
        const items = list.filter((s) => g.channels.includes(s.channel))
        return items.length ? (
          <optgroup key={g.label} label={g.label}>
            {items.map((s) => (
              <option key={s.code} value={s.code} disabled={exclude.includes(s.code) && s.code !== value}>
                {s.label}
              </option>
            ))}
          </optgroup>
        ) : null
      })}
    </select>
  )
}

/** Single dropdown, multi-select: “Common rule” or one or more invoice categories. */
function CategorySelect({ scope, categories, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const common = scope !== 'CATEGORY'
  const picked = categories || []
  const summary = common
    ? 'Common rule — all invoice categories'
    : picked.length
      ? `${picked.slice(0, 2).map((c) => CATEGORY_BY_CODE[c]?.label || c).join(', ')}${picked.length > 2 ? ` +${picked.length - 2}` : ''}`
      : 'Select categories…'
  const toggle = (code) => {
    const next = picked.includes(code) ? picked.filter((c) => c !== code) : [...picked, code]
    onChange(next.length ? { scope: 'CATEGORY', categories: next } : { scope: 'COMMON', categories: [] })
  }

  return (
    <div className="nw-multiselect" ref={ref}>
      <button type="button" className="dx-select nw-select nw-multiselect__btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{summary}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <div className="nw-multiselect__menu" role="listbox" aria-multiselectable="true" aria-label="Invoice category">
          <button type="button" role="option" aria-selected={common} className={`nw-multiselect__opt${common ? ' is-on' : ''}`} onClick={() => onChange({ scope: 'COMMON', categories: [] })}>
            <span className="nw-multiselect__box">{common ? <Check size={12} aria-hidden /> : null}</span>
            <span>
              <b>Common rule</b>
              <small>Applies to all invoice categories</small>
            </span>
          </button>
          {['PO', 'NON_PO'].map((grp) => (
            <div key={grp} className="nw-multiselect__group">
              <span className="nw-multiselect__glabel">{grp === 'PO' ? 'PO invoices' : 'Non-PO invoices'}</span>
              {CATEGORIES.filter((c) => c.group === grp).map((c) => {
                const on = !common && picked.includes(c.code)
                return (
                  <button key={c.code} type="button" role="option" aria-selected={on} className={`nw-multiselect__opt${on ? ' is-on' : ''}`} onClick={() => toggle(c.code)}>
                    <span className="nw-multiselect__box">{on ? <Check size={12} aria-hidden /> : null}</span>
                    <span>{c.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const validateMatchRule = (draft) => {
  const errors = {}
  const availability = draft.ruleType === 'AVAILABILITY'
  if (!availability && !String(draft.dataPoint || '').trim()) errors.dataPoint = 'Pick the data point'
  if (!draft.source) errors.source = 'Pick the source document'
  if (!availability) {
    const docs = (draft.targets || []).map((t) => t.doc)
    const compares = (draft.targets || []).filter((t) => t.requirement !== 'EXTRACT')
    if (docs.includes(draft.source)) errors.targets = 'A document cannot be both the source and a check'
    else if (new Set(docs).size !== docs.length) errors.targets = 'Each document can appear once'
    else if (!compares.length && !isServerType(draft.ruleType) && draft.ruleType !== 'LOGICAL') {
      errors.targets = 'Add at least one document to check against'
    }
  }
  if (draft.scope === 'CATEGORY' && !(draft.categories || []).length) {
    errors.categories = 'Pick at least one category, or choose Common rule'
  }
  return errors
}

export default function RuleEditor({ open, rule, allRules, saving, readOnly, onClose, onSave }) {
  const [draft, setDraft] = useState(() => clone(rule || emptyMatchRule()))
  const [touched, setTouched] = useState(false)
  const { types, loading: fieldsLoading } = useCaptureTypes()

  useEffect(() => {
    if (open) {
      const base = clone(rule || emptyMatchRule())
      base.targets = (base.targets || []).map((t) => ({ field: '', ...t }))
      base.criteria = { ...emptyMatchRule().criteria, ...(base.criteria || {}) }
      setDraft(base)
      setTouched(false)
    }
  }, [open, rule])

  const errors = useMemo(() => validateMatchRule(draft), [draft])
  const hasErrors = Object.keys(errors).length > 0
  const availability = draft.ruleType === 'AVAILABILITY'
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setTarget = (i, patch) =>
    setDraft((d) => ({ ...d, targets: d.targets.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }))
  const moveTarget = (i, dir) =>
    setDraft((d) => {
      const next = d.targets.slice()
      const j = i + dir
      if (j < 0 || j >= next.length) return d
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...d, targets: next }
    })
  const removeTarget = (i) => setDraft((d) => ({ ...d, targets: d.targets.filter((_, idx) => idx !== i) }))
  const addTarget = () =>
    setDraft((d) => {
      const used = new Set([d.source, ...d.targets.map((t) => t.doc)])
      const next = SOURCES.find((s) => !used.has(s.code))
      return next ? { ...d, targets: [...d.targets, { doc: next.code, requirement: 'REQUIRED', field: '' }] } : d
    })

  // Invoice Category → Source Document → Data Point
  const sourceOptions = useMemo(() => sourceOptionsForScope(types, draft.scope, draft.categories), [types, draft.scope, draft.categories])
  const fieldOptions = useMemo(
    () => fieldOptionsForSource(types, draft.scope, draft.categories, draft.source),
    [types, draft.scope, draft.categories, draft.source]
  )
  const dpValue = (() => {
    const byName = fieldOptions.find((f) => f.fieldName === draft.sourceField)
    if (byName) return `f:${byName.fieldName}`
    if (!fieldOptions.length && DATA_POINT_OPTIONS.some((o) => o.value === draft.dataKey)) return `k:${draft.dataKey}`
    return draft.dataPoint ? 'current' : ''
  })()
  const pickDataPoint = (value) => {
    if (value.startsWith('f:')) {
      const f = fieldOptions.find((x) => x.fieldName === value.slice(2))
      if (f) set({ dataPoint: f.label, sourceField: f.fieldName, dataKey: f.dataKey })
    } else if (value.startsWith('k:')) {
      const o = DATA_POINT_OPTIONS.find((x) => x.value === value.slice(2))
      if (o) set({ dataPoint: o.label, sourceField: '', dataKey: o.value })
    }
  }
  const pickSource = (code) => {
    // A new source has its own fields: clear a data point that came from the previous source's Fields to Capture.
    set({ source: code, ...(draft.sourceField ? { dataPoint: '', sourceField: '', dataKey: '' } : {}) })
  }

  const submit = () => {
    setTouched(true)
    if (hasErrors) return
    const dataPoint = availability && !draft.dataPoint.trim() ? `${sourceLabel(draft.source)} present` : draft.dataPoint.trim()
    onSave?.({
      ...draft,
      ruleKey: String(draft.ruleKey || '').trim() || nextRuleKey(allRules || [], draft.scope),
      dataPoint,
      dataKey: draft.dataKey || draft.sourceField || 'value',
      targets: availability ? [] : draft.targets,
      categories: draft.scope === 'CATEGORY' ? draft.categories : [],
      // Status is no longer set on screen: a saved rule is live (Inactive stays switched off).
      status: draft.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    })
  }

  const err = (key) => (touched && errors[key] ? <p className="nw-err">{errors[key]}</p> : null)
  const stepwise = draft.compareMode === 'STEPWISE'
  const chainDocs = [draft.source, ...(draft.targets || []).filter((t) => t.requirement !== 'EXTRACT').map((t) => t.doc)]
  let stepNo = 0

  return (
    <Drawer
      open={open}
      onClose={() => !saving && onClose?.()}
      width="max-w-3xl"
      className="nw-drawer"
      title={draft.id ? `Edit rule ${rule?.ruleKey || ''}` : 'Add data point rule'}
      footer={
        <>
          {touched && hasErrors ? <span className="nw-foot-hint">Fix the highlighted fields to save.</span> : null}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving || readOnly} title={readOnly ? 'Rules service is not reachable' : undefined}>
            {saving ? 'Saving…' : 'Save rule'}
          </Button>
        </>
      }>
      <div className="nw-editor">
        <div className="nw-reads-as" aria-live="polite">
          <span className="nw-label">Reads as</span>
          <p>{draft.dataPoint || availability ? describeRule({ ...draft, dataPoint: draft.dataPoint || 'value' }) : 'Pick the invoice category, source document and data point to see the rule in plain English.'}</p>
        </div>

        {/* 1 · Source */}
        <section className="nw-sec">
          <h3 className="nw-sec__title"><span className="nw-num">1</span>Source<small>Where the value is extracted from — the source of truth</small></h3>
          <div className="nw-grid nw-grid--3">
            <div className="nw-field">
              <span>Invoice category</span>
              <CategorySelect scope={draft.scope} categories={draft.categories} onChange={(patch) => set(patch)} />
              {err('categories')}
            </div>
            <label className="nw-field">
              <span>Source document</span>
              <SourceSelect value={draft.source} options={sourceOptions} onChange={pickSource} exclude={(draft.targets || []).map((t) => t.doc)} ariaLabel="Source document" />
              {err('source')}
            </label>
            <label className="nw-field">
              <span>Data point</span>
              <select className="dx-select nw-select" aria-label="Data point" value={dpValue} disabled={fieldsLoading} onChange={(e) => pickDataPoint(e.target.value)}>
                {fieldsLoading ? <option value={dpValue}>Loading fields…</option> : null}
                {!fieldsLoading && dpValue === '' ? <option value="" disabled>Select a data point…</option> : null}
                {!fieldsLoading && dpValue === 'current' ? <option value="current">{draft.dataPoint} (current)</option> : null}
                {!fieldsLoading && fieldOptions.length
                  ? fieldOptions.map((f) => (
                      <option key={f.fieldName} value={`f:${f.fieldName}`} title={`${f.docs.join(', ')} · ${f.types.join(', ')}`}>
                        {f.label}
                      </option>
                    ))
                  : null}
                {!fieldsLoading && !fieldOptions.length ? (
                  <optgroup label={`${sourceLabel(draft.source)} has no Fields to Capture — standard data points`}>
                    {DATA_POINT_OPTIONS.map((o) => (
                      <option key={o.value} value={`k:${o.value}`}>{o.label}</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              {err('dataPoint')}
            </label>
          </div>
        </section>

        {/* 2 · Check against */}
        <section className="nw-sec">
          <h3 className="nw-sec__title"><span className="nw-num">2</span>Check against</h3>
          {availability ? (
            <div className="nw-ok-note">
              Only checks that <b>{sourceLabel(draft.source)}</b> is present in the invoice package.
            </div>
          ) : (
            <>
              <div className="nw-targets">
                <div className="nw-targets__row nw-targets__row--src">
                  <span className="nw-mark nw-mark--a" aria-hidden>A</span>
                  <span className="nw-targets__anchor">
                    <b>{sourceLabel(draft.source)}</b>
                    <small>{draft.dataPoint || 'data point not set'} · {sourceChannel(draft.source).long}</small>
                  </span>
                </div>
                {(draft.targets || []).map((t, i) => {
                  const isCompare = t.requirement !== 'EXTRACT'
                  if (isCompare) stepNo += 1
                  return (
                    <div key={`${t.doc}-${i}`} className="nw-targets__row nw-targets__row--grid">
                      <span className="nw-targets__step">
                        {isCompare ? (stepwise ? `Step ${stepNo}` : `C${stepNo}`) : 'AV'}
                        {stepwise && isCompare ? (
                          <small title="Compared with">
                            {sourceLabel(chainDocs[stepNo - 1])} <ArrowRight size={11} aria-hidden />
                          </small>
                        ) : null}
                      </span>
                      <SourceSelect value={t.doc} onChange={(v) => setTarget(i, { doc: v })} exclude={[draft.source, ...draft.targets.map((x) => x.doc)]} ariaLabel={`Check against document ${i + 1}`} />
                      <select className="dx-select nw-select" aria-label={`Role of ${sourceLabel(t.doc)}`} value={t.requirement} onChange={(e) => setTarget(i, { requirement: e.target.value })}>
                        {REQUIREMENT_LIST.map((r) => (
                          <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                      </select>
                      <div className="nw-targets__actions">
                        <button type="button" className="ic-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => moveTarget(i, -1)}><ArrowUp size={13} /></button>
                        <button type="button" className="ic-icon-btn" aria-label="Move down" disabled={i === draft.targets.length - 1} onClick={() => moveTarget(i, 1)}><ArrowDown size={13} /></button>
                        <button type="button" className="ic-icon-btn is-danger" aria-label={`Remove ${sourceLabel(t.doc)}`} onClick={() => removeTarget(i)}><X size={13} /></button>
                      </div>
                    </div>
                  )
                })}
                <button type="button" className="nw-add" onClick={addTarget}>
                  <Plus size={13} /> Add document
                </button>
                {err('targets')}
              </div>
              <div className="nw-legend">
                {REQUIREMENT_LIST.map((r) => (
                  <span key={r.code}><b>{r.label}</b> — {r.help}</span>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 3 · Validation */}
        {!availability ? (
          <section className="nw-sec">
            <h3 className="nw-sec__title"><span className="nw-num">3</span>Validation</h3>
            <div className="nw-field">
              <span>Validation type</span>
              <div className="nw-cats__chips" role="radiogroup" aria-label="Validation type">
                {RULE_TYPE_LIST.map((tp) => (
                  <button key={tp.code} type="button" role="radio" aria-checked={draft.ruleType === tp.code} className={`nw-pill${draft.ruleType === tp.code ? ' is-on' : ''}`} onClick={() => set({ ruleType: tp.code })}>
                    {tp.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </Drawer>
  )
}
