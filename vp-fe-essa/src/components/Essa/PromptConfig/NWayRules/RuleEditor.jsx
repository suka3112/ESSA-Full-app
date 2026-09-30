import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Plus, Sparkles, X } from 'lucide-react'

import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import {
  CATEGORIES,
  CHANNELS,
  COMPARE_MODES,
  DATA_POINTS,
  DATA_POINT_OPTIONS,
  FAIL_ACTION_LIST,
  MATCH_LEVELS,
  MEASURED_ON,
  REQUIREMENT_LIST,
  RULE_GROUP_LIST,
  RULE_STATUSES,
  RULE_TYPE_LIST,
  RULE_TYPES,
  RUN_CONDITIONS,
  SERVICE_CATEGORY_CODES,
  SOURCES,
  TOLERANCE_APPLY,
  sourceChannel,
  sourceLabel
} from '../../lib/nWay/catalog'
import { VALIDATION_RULE_CATALOG } from '../../lib/validationRuleCatalog'
import { describeRule } from '../../lib/nWay/ruleText'

export const emptyMatchRule = (categoryCode) => ({
  id: null,
  ruleKey: '',
  dataPoint: '',
  dataKey: 'invoice_amount',
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
  status: 'DRAFT',
  businessNote: '',
  noteBy: '',
  confirmWith: '',
  linkedCheck: null,
  serverSide: false,
  refs: ''
})

const clone = (v) => JSON.parse(JSON.stringify(v))

/** Documents first, then SAP master (DB), then other systems — mirrors the “check against – origin” choice. */
const SOURCE_GROUPS = [
  { label: 'Documents (invoice package / user upload)', channels: ['VENDOR_PDF', 'USER'] },
  { label: 'DB — SAP master on the AP platform', channels: ['SAP'] },
  { label: 'Other systems', channels: ['EXTERNAL', 'ESSA_SYSTEM'] }
]

function SourceSelect({ value, onChange, exclude = [], ariaLabel }) {
  return (
    <select aria-label={ariaLabel} className="dx-select nw-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {SOURCE_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {SOURCES.filter((s) => g.channels.includes(s.channel)).map((s) => (
            <option key={s.code} value={s.code} disabled={exclude.includes(s.code) && s.code !== value}>
              {s.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export const validateMatchRule = (draft, allRules = []) => {
  const errors = {}
  const availability = draft.ruleType === 'AVAILABILITY'
  if (!String(draft.ruleKey || '').trim()) errors.ruleKey = 'Give the rule an ID, e.g. 1.34'
  else if (allRules.some((r) => r.ruleKey === draft.ruleKey.trim() && r.id !== draft.id)) {
    errors.ruleKey = `Rule ${draft.ruleKey.trim()} already exists`
  }
  if (!availability && !String(draft.dataPoint || '').trim()) errors.dataPoint = 'Name the data point'
  if (!draft.source) errors.source = 'Pick the anchor document'
  if (!availability) {
    const docs = (draft.targets || []).map((t) => t.doc)
    const compares = (draft.targets || []).filter((t) => t.requirement !== 'EXTRACT')
    if (docs.includes(draft.source)) errors.targets = 'A document cannot be both anchor and compare'
    else if (new Set(docs).size !== docs.length) errors.targets = 'Each document can appear once'
    else if (!compares.length && !['UNIQUENESS', 'AUTHENTICITY', 'CALCULATION', 'LOGICAL'].includes(draft.ruleType)) {
      errors.targets = 'Add at least one document to compare against'
    }
  }
  if (draft.scope === 'CATEGORY' && !(draft.categories || []).length) {
    errors.categories = 'Pick at least one category, or make the rule Common'
  }
  if (draft.ruleType === 'TOLERANCE') {
    const c = draft.criteria || {}
    if (!c.tolerancePct && !c.toleranceAmount) errors.criteria = 'Set a tolerance % or amount'
    else if (c.combine === 'PCT' && !c.tolerancePct) errors.criteria = 'Set the tolerance %'
    else if (c.combine === 'AMOUNT' && !c.toleranceAmount) errors.criteria = 'Set the tolerance amount'
  }
  if (draft.ruleType === 'LOGICAL' && draft.criteria?.similarity != null && draft.criteria.similarity !== '') {
    const s = Number(draft.criteria.similarity)
    if (!(s > 0 && s <= 100)) errors.criteria = 'Confidence must be between 1 and 100'
  }
  if (draft.runCondition?.type !== 'ALWAYS' && !String(draft.runCondition?.text || '').trim()) {
    errors.runCondition = 'Describe when the rule applies'
  }
  return errors
}

export default function RuleEditor({ open, rule, allRules, saving, readOnly, onClose, onSave }) {
  const [draft, setDraft] = useState(() => clone(rule || emptyMatchRule()))
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      const base = clone(rule || emptyMatchRule())
      base.targets = (base.targets || []).map((t) => ({ field: '', ...t }))
      base.criteria = { ...emptyMatchRule().criteria, ...(base.criteria || {}) }
      if (base.criteria.combine === 'EITHER') base.criteria.combine = 'HIGHER'
      if (base.criteria.combine === 'BOTH') base.criteria.combine = 'LOWER'
      setDraft(base)
      setTouched(false)
    }
  }, [open, rule])

  const errors = useMemo(() => validateMatchRule(draft, allRules), [draft, allRules])
  const hasErrors = Object.keys(errors).length > 0
  const availability = draft.ruleType === 'AVAILABILITY'
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setCriteria = (patch) => setDraft((d) => ({ ...d, criteria: { ...(d.criteria || {}), ...patch } }))
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
  const toggleCategory = (code) =>
    setDraft((d) => {
      const cats = new Set(d.categories || [])
      if (cats.has(code)) cats.delete(code)
      else cats.add(code)
      return { ...d, categories: Array.from(cats) }
    })
  const setOrigin = (origin) => {
    if (origin === 'AVAILABILITY') set({ ruleType: 'AVAILABILITY', dataKey: draft.dataKey || 'calc_amount', group: 'DOCUMENTS' })
    else if (availability) set({ ruleType: 'EXACT', group: null })
  }

  const submit = () => {
    setTouched(true)
    if (hasErrors) return
    const dataPoint = availability && !draft.dataPoint.trim() ? `${sourceLabel(draft.source)} present` : draft.dataPoint.trim()
    onSave?.({
      ...draft,
      ruleKey: draft.ruleKey.trim(),
      dataPoint,
      targets: availability ? [] : draft.targets,
      categories: draft.scope === 'CATEGORY' ? draft.categories : [],
      runCondition: draft.runCondition?.type === 'ALWAYS' ? { type: 'ALWAYS', text: '' } : draft.runCondition
    })
  }

  const err = (key) => (touched && errors[key] ? <p className="nw-err">{errors[key]}</p> : null)
  const typeMeta = RULE_TYPES[draft.ruleType]
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
            {saving ? 'Saving…' : draft.status === 'CONFIRM' ? 'Save & send for confirmation' : 'Save rule'}
          </Button>
        </>
      }>
      <div className="nw-editor">
        <div className="nw-reads-as" aria-live="polite">
          <span className="nw-label">Reads as</span>
          <p>{draft.dataPoint || availability ? describeRule({ ...draft, dataPoint: draft.dataPoint || 'value' }) : 'Pick the anchor document and name the data point to see the rule in plain English.'}</p>
        </div>

        {/* 1 · Source */}
        <section className="nw-sec">
          <h3 className="nw-sec__title"><span className="nw-num">1</span>Source<small>Where the value is extracted from — the anchor (source of truth)</small></h3>
          <div className="nw-seg" role="radiogroup" aria-label="Scope">
            <button type="button" role="radio" aria-checked={draft.scope === 'COMMON'} className={`nw-seg__btn${draft.scope === 'COMMON' ? ' is-on' : ''}`} onClick={() => set({ scope: 'COMMON' })}>
              Common — every category
            </button>
            <button type="button" role="radio" aria-checked={draft.scope === 'CATEGORY'} className={`nw-seg__btn${draft.scope === 'CATEGORY' ? ' is-on' : ''}`} onClick={() => set({ scope: 'CATEGORY' })}>
              Selected invoice categories
            </button>
          </div>
          {draft.scope === 'CATEGORY' ? (
            <div className="nw-cats">
              <div className="nw-cats__head">
                <span className="nw-label">Invoice categories</span>
                <button type="button" className="nw-link" onClick={() => set({ categories: SERVICE_CATEGORY_CODES.slice() })}>All service categories</button>
              </div>
              {['PO', 'NON_PO'].map((grp) => (
                <div key={grp} className="nw-cats__group">
                  <span className="nw-cats__glabel">{grp === 'PO' ? 'PO invoices' : 'Non-PO invoices'}</span>
                  <div className="nw-cats__chips">
                    {CATEGORIES.filter((c) => c.group === grp).map((c) => {
                      const on = (draft.categories || []).includes(c.code)
                      return (
                        <button key={c.code} type="button" aria-pressed={on} className={`nw-pill${on ? ' is-on' : ''}`} onClick={() => toggleCategory(c.code)}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {err('categories')}
            </div>
          ) : null}
          <div className="nw-grid nw-grid--3">
            <label className="nw-field">
              <span>Source document (anchor)</span>
              <SourceSelect value={draft.source} onChange={(v) => set({ source: v })} exclude={(draft.targets || []).map((t) => t.doc)} ariaLabel="Source document (anchor)" />
              {err('source')}
            </label>
            <label className="nw-field">
              <span>Data point</span>
              <input className="dx-input nw-input" value={draft.dataPoint} placeholder={availability ? 'Optional' : 'e.g. Claim value vs SES'} onChange={(e) => set({ dataPoint: e.target.value })} />
              {err('dataPoint')}
            </label>
            <label className="nw-field">
              <span>Field on {sourceLabel(draft.source)}</span>
              <input className="dx-input nw-input" value={draft.sourceField || ''} placeholder="e.g. #214 SES value" onChange={(e) => set({ sourceField: e.target.value })} />
            </label>
          </div>
          <div className="nw-grid nw-grid--3">
            <label className="nw-field">
              <span>Extraction key</span>
              <select className="dx-select nw-select" value={draft.dataKey} onChange={(e) => set({ dataKey: e.target.value, dataPoint: draft.dataPoint || DATA_POINTS[e.target.value]?.label || '' })}>
                {DATA_POINT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="nw-field">
              <span>Rule ID</span>
              <input className="dx-input nw-input" value={draft.ruleKey} placeholder="e.g. 3.13" onChange={(e) => set({ ruleKey: e.target.value })} />
              {err('ruleKey')}
            </label>
            <label className="nw-field">
              <span>Matrix rows</span>
              <input className="dx-input nw-input" value={draft.refs || ''} placeholder="e.g. #14 · #177 · #214" onChange={(e) => set({ refs: e.target.value })} />
            </label>
          </div>
          <p className="nw-help">Matrix rows point at the Data Point × Doc Matrix, so the business can trace each rule back to the Excel.</p>
        </section>

        {/* 2 · Check against */}
        <section className="nw-sec">
          <h3 className="nw-sec__title"><span className="nw-num">2</span>Check against</h3>
          <div className="nw-sec__row">
            <div className="nw-seg" role="radiogroup" aria-label="Check against origin">
              <button type="button" role="radio" aria-checked={!availability} className={`nw-seg__btn${!availability ? ' is-on' : ''}`} onClick={() => setOrigin('COMPARE')}>
                Documents / DB (SAP master)
              </button>
              <button type="button" role="radio" aria-checked={availability} className={`nw-seg__btn${availability ? ' is-on' : ''}`} onClick={() => setOrigin('AVAILABILITY')}>
                Availability only
              </button>
            </div>
            {!availability ? (
              <div className="nw-seg nw-seg--sm" role="radiogroup" aria-label="Compare mode">
                {Object.values(COMPARE_MODES).map((m) => (
                  <button key={m.code} type="button" role="radio" aria-checked={draft.compareMode === m.code} className={`nw-seg__btn${draft.compareMode === m.code ? ' is-on' : ''}`} onClick={() => set({ compareMode: m.code })}>
                    {m.code === 'ONE_TO_ALL' ? 'Anchor → each' : 'Step by step'}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {availability ? (
            <div className="nw-ok-note">
              Only checks that <b>{sourceLabel(draft.source)}</b> is present in the invoice package. Data point, target and validation type are not needed.
            </div>
          ) : (
            <>
              <p className="nw-help">{COMPARE_MODES[draft.compareMode]?.help}</p>
              <div className="nw-targets">
                <div className="nw-targets__row nw-targets__row--src">
                  <span className="nw-mark nw-mark--a" aria-hidden>A</span>
                  <span className="nw-targets__anchor">
                    <b>{sourceLabel(draft.source)}</b>
                    <small>{draft.sourceField || 'field not set'} · {sourceChannel(draft.source).long}</small>
                  </span>
                </div>
                <div className="nw-targets__head" aria-hidden>
                  <span />
                  <span>Check against</span>
                  <span>Field on that document</span>
                  <span>Role</span>
                  <span />
                </div>
                {(draft.targets || []).map((t, i) => {
                  const isCompare = t.requirement !== 'EXTRACT'
                  if (isCompare) stepNo += 1
                  return (
                    <div key={`${t.doc}-${i}`} className="nw-targets__row nw-targets__row--grid">
                      <span className="nw-targets__step">
                        {isCompare ? (stepwise ? `Step ${stepNo}` : `C${stepNo}`) : 'E'}
                        {stepwise && isCompare ? (
                          <small title="Compared with">
                            {sourceLabel(chainDocs[stepNo - 1])} <ArrowRight size={11} aria-hidden />
                          </small>
                        ) : null}
                      </span>
                      <SourceSelect value={t.doc} onChange={(v) => setTarget(i, { doc: v })} exclude={[draft.source, ...draft.targets.map((x) => x.doc)]} ariaLabel={`Check against document ${i + 1}`} />
                      <input className="dx-input nw-input" aria-label={`Field on ${sourceLabel(t.doc)}`} value={t.field || ''} placeholder="Select / type field…" onChange={(e) => setTarget(i, { field: e.target.value })} />
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
              <p className="nw-help">{typeMeta?.help}</p>
            </div>

            {draft.ruleType === 'LOGICAL' ? (
              <div className="nw-ai">
                <div className="nw-ai__head"><Sparkles size={14} aria-hidden /> AI prompt is preset in the backend</div>
                <p>
                  Prompt template <code>logical_match.{draft.dataKey}</code>. Admins can’t edit the prompt here; changes go through a backend release.
                </p>
                <label className="nw-field nw-field--narrow">
                  <span>Minimum AI confidence to pass</span>
                  <div className="nw-affix">
                    <input type="number" min="1" max="100" className="dx-input nw-input" value={draft.criteria?.similarity ?? ''} placeholder="65" onChange={(e) => setCriteria({ similarity: e.target.value === '' ? null : Number(e.target.value) })} />
                    <span>%</span>
                  </div>
                </label>
              </div>
            ) : null}

            {draft.ruleType === 'TOLERANCE' ? (
              <div className="nw-tol">
                <label className="nw-field">
                  <span>Tolerance %</span>
                  <div className="nw-affix">
                    <input type="number" min="0" step="0.01" className="dx-input nw-input" value={draft.criteria?.tolerancePct ?? ''} placeholder="2" onChange={(e) => setCriteria({ tolerancePct: e.target.value === '' ? null : Number(e.target.value) })} />
                    <span>%</span>
                  </div>
                </label>
                <label className="nw-field">
                  <span>Tolerance amount</span>
                  <div className="nw-affix">
                    <input type="number" min="0" className="dx-input nw-input" value={draft.criteria?.toleranceAmount ?? ''} placeholder="100000" onChange={(e) => setCriteria({ toleranceAmount: e.target.value === '' ? null : Number(e.target.value) })} />
                    <span>IDR</span>
                  </div>
                </label>
                <label className="nw-field">
                  <span>Apply</span>
                  <select className="dx-select nw-select" value={draft.criteria?.combine || 'LOWER'} onChange={(e) => setCriteria({ combine: e.target.value })}>
                    {Object.values(TOLERANCE_APPLY).map((o) => (
                      <option key={o.code} value={o.code}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="nw-field">
                  <span>% measured on</span>
                  <select className="dx-select nw-select" value={draft.criteria?.measuredOn || 'TARGET'} onChange={(e) => setCriteria({ measuredOn: e.target.value })}>
                    {Object.values(MEASURED_ON).map((o) => (
                      <option key={o.code} value={o.code}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {draft.ruleType === 'UNIQUENESS' ? (
              <div className="nw-field">
                <span>Unique key (must be new in history)</span>
                <div className="nw-cats__chips">
                  {DATA_POINT_OPTIONS.map((o) => {
                    const on = (draft.criteria?.uniqueKey || []).includes(o.value)
                    return (
                      <button key={o.value} type="button" aria-pressed={on} className={`nw-pill${on ? ' is-on' : ''}`} onClick={() => setCriteria({ uniqueKey: on ? draft.criteria.uniqueKey.filter((k) => k !== o.value) : [...(draft.criteria?.uniqueKey || []), o.value] })}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
            {err('criteria')}

            <div className="nw-grid nw-grid--level">
              <label className="nw-field">
                <span>Match level</span>
                <select className="dx-select nw-select" value={draft.matchLevel || 'HEADER'} onChange={(e) => set({ matchLevel: e.target.value })}>
                  {Object.values(MATCH_LEVELS).map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </label>
              <label className="nw-field">
                <span>Applies when</span>
                <select className="dx-select nw-select" value={draft.runCondition?.type || 'ALWAYS'} onChange={(e) => set({ runCondition: { ...(draft.runCondition || {}), type: e.target.value } })}>
                  {Object.values(RUN_CONDITIONS).map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </label>
              <label className="nw-field">
                <span>Group</span>
                <select className="dx-select nw-select" value={draft.group || ''} onChange={(e) => set({ group: e.target.value || null })}>
                  <option value="">Automatic</option>
                  {RULE_GROUP_LIST.map((g) => (
                    <option key={g.code} value={g.code}>{g.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {draft.runCondition?.type && draft.runCondition.type !== 'ALWAYS' ? (
              <label className="nw-field">
                <span>Condition</span>
                <input className="dx-input nw-input" value={draft.runCondition.text || ''} placeholder="e.g. Invoice claims OT hours > 0" onChange={(e) => set({ runCondition: { ...draft.runCondition, text: e.target.value } })} />
                {err('runCondition')}
              </label>
            ) : null}
            <label className="nw-field">
              <span>Rule description shown to AP reviewers</span>
              <textarea className="dx-input nw-textarea" rows={2} value={draft.criteriaText || ''} placeholder="e.g. 2% or IDR 100,000, whichever is lower." onChange={(e) => set({ criteriaText: e.target.value })} />
            </label>
            {['CALCULATION', 'UNIQUENESS', 'AUTHENTICITY'].includes(draft.ruleType) ? (
              <p className="nw-help">This type is evaluated by the server integration (SAP, history or portal). Link it to a 12-point check under Outcome to show its live result.</p>
            ) : null}
          </section>
        ) : null}

        {/* 4 · Outcome */}
        <section className="nw-sec">
          <h3 className="nw-sec__title"><span className="nw-num">{availability ? 3 : 4}</span>Outcome</h3>
          <div className="nw-grid nw-grid--outcome">
            <div className="nw-field">
              <span>Requirement</span>
              <div className="nw-seg" role="radiogroup" aria-label="Requirement">
                <button type="button" role="radio" aria-checked={draft.mandatory !== false} className={`nw-seg__btn${draft.mandatory !== false ? ' is-on' : ''}`} onClick={() => set({ mandatory: true })}>Mandatory</button>
                <button type="button" role="radio" aria-checked={draft.mandatory === false} className={`nw-seg__btn${draft.mandatory === false ? ' is-on' : ''}`} onClick={() => set({ mandatory: false })}>Optional</button>
              </div>
            </div>
            <label className="nw-field">
              <span>Status</span>
              <select className="dx-select nw-select" value={draft.status} onChange={(e) => set({ status: e.target.value })}>
                {Object.values(RULE_STATUSES).map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="nw-field">
            <span>Impact on workflow when the check fails</span>
            <div className="nw-options" role="radiogroup" aria-label="Impact on workflow">
              {FAIL_ACTION_LIST.map((a) => (
                <button key={a.code} type="button" role="radio" aria-checked={draft.onFail === a.code} className={`nw-option${draft.onFail === a.code ? ' is-on' : ''}`} onClick={() => set({ onFail: a.code })}>
                  <span className="nw-radio" aria-hidden />
                  <span className="nw-option__text">
                    <b>{a.label}</b>
                    <span>{a.help}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="nw-grid nw-grid--2">
            <label className="nw-field">
              <span>Confirm with (business)</span>
              <input className="dx-input nw-input" value={draft.confirmWith || ''} placeholder="e.g. Nitish Sharma" onChange={(e) => set({ confirmWith: e.target.value })} />
            </label>
            <label className="nw-field">
              <span>Also reported as 12-point check</span>
              <select className="dx-select nw-select" value={draft.linkedCheck || ''} onChange={(e) => set({ linkedCheck: e.target.value || null })}>
                <option value="">— None —</option>
                {VALIDATION_RULE_CATALOG.map((c) => (
                  <option key={c.ruleCode} value={c.ruleCode}>{c.sequence}. {c.title}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="nw-field">
            <span>Business note</span>
            <textarea className="dx-input nw-textarea" rows={3} value={draft.businessNote || ''} placeholder="Why the rule exists, examples, decisions (e.g. Q-035)." onChange={(e) => set({ businessNote: e.target.value })} />
          </label>
          <label className="nw-field nw-field--narrow">
            <span>Note by</span>
            <input className="dx-input nw-input" value={draft.noteBy || ''} placeholder="Name · date" onChange={(e) => set({ noteBy: e.target.value })} />
          </label>
        </section>
        <p className="nw-help nw-help--center">Channel legend: {Object.values(CHANNELS).map((c) => c.long).join(' · ')}</p>
      </div>
    </Drawer>
  )
}
