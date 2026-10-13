import { useEffect, useMemo, useState } from 'react'

import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Toggle } from '../lib/sla'
import {
  BUSINESS_SCOPES,
  CATEGORIES,
  MASTER_STATUSES,
  QUALIFICATIONS,
  RATE_TYPES,
  REFERENCE_MASTERS,
  RULE_STATUSES,
  SERVICE_TREATMENTS,
  STEP_LABELS,
  WHT_ARTICLES,
  todayIso,
  toCode
} from './options'

function Field({ label, required, hint, children, wide }) {
  return (
    <label className={`wht-field${wide ? ' is-wide' : ''}`}>
      <span className="wht-field__label">
        {label}
        {required ? <em aria-hidden> *</em> : null}
      </span>
      {children}
      {hint ? <span className="wht-field__hint">{hint}</span> : null}
    </label>
  )
}

function Section({ title, children }) {
  return (
    <section className="wht-form-section">
      <h3>{title}</h3>
      <div className="wht-form-grid">{children}</div>
    </section>
  )
}

function Options({ options, placeholder }) {
  return (
    <>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </>
  )
}

/** Shared drawer chrome: Cancel / Save draft / Save & activate (or Save). */
function FormDrawer({ open, title, onClose, error, saving, onSave, draftable, children }) {
  return (
    <Drawer
      open={open}
      onClose={() => !saving && onClose()}
      title={title}
      width="max-w-2xl"
      footer={
        <div className="wht-drawer-footer">
          {error ? <span className="wht-form-error" role="alert">{error}</span> : <span />}
          <div className="wht-drawer-footer__actions">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            {draftable ? (
              <Button variant="secondary" onClick={() => onSave('DRAFT')} disabled={saving}>Save draft</Button>
            ) : null}
            <Button onClick={() => onSave(draftable ? 'ACTIVE' : null)} disabled={saving}>
              {saving ? 'Saving…' : draftable ? 'Save & activate' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="wht-form">{children}</div>
    </Drawer>
  )
}

function useForm(initial, open) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      setForm(initial)
      setError('')
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const set = (key) => (e) => {
    const value = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setForm((f) => ({ ...f, [key]: value }))
  }
  return { form, setForm, set, error, setError, saving, setSaving }
}

const missing = (form, keys) => keys.filter((k) => form[k] == null || String(form[k]).trim() === '')

async function submit(state, payload, required, labels, onSave) {
  const gaps = missing(payload, required)
  if (gaps.length) {
    state.setError(`Fill in: ${gaps.map((k) => labels[k] || k).join(', ')}`)
    return
  }
  state.setSaving(true)
  state.setError('')
  try {
    await onSave(payload)
  } catch (err) {
    state.setError(err.message || 'Could not save')
    state.setSaving(false)
  }
}

// ---------------------------------------------------------------------------

const EMPTY_RULE = {
  step: 7,
  category: 'Default',
  condition: '',
  subCondition: '',
  conditionCode: '',
  subConditionCode: '',
  whtArticle: 'Art. 23',
  rateType: 'FIXED',
  ratePct: '',
  rateText: '',
  sapWhtCode: '',
  referenceMaster: '',
  requiresDocument: false,
  documentExamples: '',
  remarks: '',
  effectiveFrom: todayIso(),
  effectiveTo: '',
  status: 'ACTIVE'
}

export function RuleDrawer({ open, rule, onClose, onSave }) {
  const initial = useMemo(() => ({ ...EMPTY_RULE, ...(rule || {}) }), [rule])
  const state = useForm(initial, open)
  const { form, set, setForm } = state
  const isNew = !rule?.id

  const setStep = (e) => {
    const step = Number(e.target.value)
    setForm((f) => ({ ...f, step, category: STEP_LABELS[step] || f.category }))
  }

  const save = (status) => {
    const ratePct = form.rateType === 'FIXED' ? form.ratePct : form.ratePct || ''
    const payload = {
      ...form,
      status,
      step: Number(form.step),
      ratePct: ratePct === '' ? null : Number(ratePct),
      rateText:
        form.rateText?.trim() ||
        (form.rateType === 'PROGRESSIVE' ? 'Progressive' : form.rateType === 'TREATY' ? 'Treaty rate' : ratePct !== '' ? `${Number(ratePct)}%` : ''),
      conditionCode: form.conditionCode?.trim() || toCode(form.condition),
      subConditionCode: form.subConditionCode?.trim() || (form.subCondition ? toCode(form.subCondition) : null),
      subCondition: form.subCondition || null,
      referenceMaster: form.referenceMaster || null,
      effectiveTo: form.effectiveTo || null
    }
    const required = ['step', 'category', 'condition', 'whtArticle', 'rateType', 'rateText', 'sapWhtCode', 'effectiveFrom']
    if (form.rateType === 'FIXED') required.push('ratePct')
    return submit(state, payload, required, {
      condition: 'Condition', whtArticle: 'WHT article', rateText: 'Rate', ratePct: 'Rate (%)', sapWhtCode: 'SAP WHT code', effectiveFrom: 'Effective from'
    }, onSave)
  }

  return (
    <FormDrawer open={open} title={isNew ? 'Add WHT rule' : 'Edit WHT rule'} onClose={onClose} draftable
      error={state.error} saving={state.saving} onSave={save}>
      <Section title="Rule information">
        <Field label="Step / priority" required>
          <Select value={form.step} onChange={setStep}>
            {Object.entries(STEP_LABELS).map(([step, label]) => (
              <option key={step} value={step}>{step} · {label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Category" required>
          <Select value={form.category} onChange={set('category')}>
            <Options options={CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]} />
          </Select>
        </Field>
        <Field label="Condition" required>
          <Input value={form.condition} onChange={set('condition')} placeholder="e.g. Execution" />
        </Field>
        <Field label="Sub-condition">
          <Input value={form.subCondition || ''} onChange={set('subCondition')} placeholder="e.g. SBUJK + Small" />
        </Field>
      </Section>

      <Section title="Tax result">
        <Field label="WHT article" required>
          <Select value={form.whtArticle} onChange={set('whtArticle')}>
            <Options options={WHT_ARTICLES.includes(form.whtArticle) ? WHT_ARTICLES : [form.whtArticle, ...WHT_ARTICLES]} />
          </Select>
        </Field>
        <Field label="Rate type" required>
          <Select value={form.rateType} onChange={set('rateType')}>
            <Options options={RATE_TYPES} />
          </Select>
        </Field>
        <Field label="Rate (%)" required={form.rateType === 'FIXED'}
          hint={form.rateType === 'TREATY' ? 'Taken from Tax Treaty Rates for the vendor’s country' : null}>
          <Input type="number" step="0.01" min="0" max="100" value={form.ratePct ?? ''} onChange={set('ratePct')}
            disabled={form.rateType === 'PROGRESSIVE'} />
        </Field>
        <Field label="SAP WHT code" required>
          <Input value={form.sapWhtCode} onChange={set('sapWhtCode')} placeholder="e.g. I3" />
        </Field>
        <Field label="Rate shown" hint="Shown in the matrix, e.g. 0% / 10% / 15%. Leave empty to use the rate.">
          <Input value={form.rateText} onChange={set('rateText')} />
        </Field>
      </Section>

      <Section title="Reference & validation">
        <Field label="Reference master">
          <Select value={form.referenceMaster || ''} onChange={set('referenceMaster')}>
            <Options options={REFERENCE_MASTERS} />
          </Select>
        </Field>
        <Field label="Requires supporting document">
          <span className="wht-toggle-row">
            <Toggle checked={!!form.requiresDocument} onChange={(v) => setForm((f) => ({ ...f, requiresDocument: v }))} label="Requires supporting document" />
            <span>{form.requiresDocument ? 'Yes' : 'No'}</span>
          </span>
        </Field>
        <Field label="Document examples" wide>
          <Input value={form.documentExamples || ''} onChange={set('documentExamples')} placeholder="e.g. See SBUJK examples" />
        </Field>
        <Field label="Remarks" wide>
          <Textarea rows={3} value={form.remarks || ''} onChange={set('remarks')} />
        </Field>
      </Section>

      <Section title="Validity">
        <Field label="Effective from" required>
          <Input type="date" value={form.effectiveFrom || ''} onChange={set('effectiveFrom')} />
        </Field>
        <Field label="Effective to">
          <Input type="date" value={form.effectiveTo || ''} onChange={set('effectiveTo')} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <Options options={RULE_STATUSES} />
          </Select>
        </Field>
      </Section>

      <details className="wht-advanced">
        <summary>Matching keys (used by automatic determination)</summary>
        <div className="wht-form-grid">
          <Field label="Condition key" hint={`Default: ${toCode(form.condition) || '—'}`}>
            <Input value={form.conditionCode || ''} onChange={set('conditionCode')} />
          </Field>
          <Field label="Sub-condition key" hint={`Default: ${toCode(form.subCondition) || '—'}`}>
            <Input value={form.subConditionCode || ''} onChange={set('subConditionCode')} />
          </Field>
        </div>
      </details>
    </FormDrawer>
  )
}

// ---------------------------------------------------------------------------

const EMPTY_TREATY = {
  country: '', dividendPortfolioPct: '', dividendSubstantialPct: '', interestPct: '', royaltyPct: '', servicePct: '',
  serviceTreatment: 'Technical services', notes: '', effectiveFrom: todayIso(), effectiveTo: '', status: 'ACTIVE'
}
const num = (v) => (v === '' || v == null ? null : Number(v))

export function TreatyDrawer({ open, treaty, onClose, onSave }) {
  const initial = useMemo(() => ({ ...EMPTY_TREATY, ...(treaty || {}) }), [treaty])
  const state = useForm(initial, open)
  const { form, set } = state
  const save = (status) =>
    submit(state, {
      ...form,
      status,
      dividendPortfolioPct: num(form.dividendPortfolioPct),
      dividendSubstantialPct: num(form.dividendSubstantialPct),
      interestPct: num(form.interestPct),
      royaltyPct: num(form.royaltyPct),
      servicePct: num(form.servicePct),
      effectiveTo: form.effectiveTo || null
    }, ['country', 'effectiveFrom'], { country: 'Country', effectiveFrom: 'Effective from' }, onSave)

  const rate = (key, label) => (
    <Field label={`${label} (%)`}>
      <Input type="number" step="0.01" min="0" max="100" value={form[key] ?? ''} onChange={set(key)} />
    </Field>
  )

  return (
    <FormDrawer open={open} title={treaty?.id ? 'Edit treaty rate' : 'Add treaty rate'} onClose={onClose} draftable
      error={state.error} saving={state.saving} onSave={save}>
      <Section title="Country">
        <Field label="Country" required>
          <Input value={form.country} onChange={set('country')} placeholder="e.g. Singapore" />
        </Field>
        <Field label="Service treatment">
          <Select value={form.serviceTreatment || ''} onChange={set('serviceTreatment')}>
            <Options options={SERVICE_TREATMENTS} placeholder="—" />
          </Select>
        </Field>
      </Section>
      <Section title="Treaty rates">
        {rate('dividendPortfolioPct', 'Dividend - portfolio')}
        {rate('dividendSubstantialPct', 'Dividend - substantial')}
        {rate('interestPct', 'Interest')}
        {rate('royaltyPct', 'Royalties')}
        {rate('servicePct', 'Service / FTS')}
      </Section>
      <Section title="Validity">
        <Field label="Effective from" required>
          <Input type="date" value={form.effectiveFrom || ''} onChange={set('effectiveFrom')} />
        </Field>
        <Field label="Effective to">
          <Input type="date" value={form.effectiveTo || ''} onChange={set('effectiveTo')} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <Options options={RULE_STATUSES} />
          </Select>
        </Field>
        <Field label="Notes" wide>
          <Textarea rows={2} value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </Section>
    </FormDrawer>
  )
}

// ---------------------------------------------------------------------------

function VendorFields({ form, setForm, vendors }) {
  const pick = (e) => {
    const code = e.target.value
    const vendor = vendors.find((v) => v.code === code)
    setForm((f) => ({ ...f, vendorCode: code, vendorName: vendor ? vendor.name : f.vendorName }))
  }
  return (
    <>
      <Field label="Vendor code" required>
        <Input value={form.vendorCode} onChange={pick} list="wht-vendor-codes" placeholder="SAP vendor code" />
        <datalist id="wht-vendor-codes">
          {vendors.map((v) => (
            <option key={v.code} value={v.code}>{v.name}</option>
          ))}
        </datalist>
      </Field>
      <Field label="Vendor name" required>
        <Input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} />
      </Field>
    </>
  )
}

const EMPTY_FACILITY = {
  vendorCode: '', vendorName: '', facilityType: 'SKB', certificateNo: '', validFrom: todayIso(), validTo: '', notes: '', status: 'ACTIVE'
}

export function FacilityDrawer({ open, facility, vendors, onClose, onSave }) {
  const initial = useMemo(() => ({ ...EMPTY_FACILITY, ...(facility || {}) }), [facility])
  const state = useForm(initial, open)
  const { form, set, setForm } = state
  const save = () =>
    submit(state, form, ['vendorCode', 'vendorName', 'facilityType', 'certificateNo', 'validFrom', 'validTo'], {
      vendorCode: 'Vendor code', vendorName: 'Vendor name', certificateNo: 'Certificate no.', validFrom: 'Valid from', validTo: 'Valid to'
    }, onSave)
  return (
    <FormDrawer open={open} title={facility?.id ? 'Edit vendor tax facility' : 'Add vendor tax facility'} onClose={onClose}
      error={state.error} saving={state.saving} onSave={save}>
      <Section title="Vendor">
        <VendorFields form={form} setForm={setForm} vendors={vendors} />
      </Section>
      <Section title="Facility">
        <Field label="Facility type" required hint={form.facilityType === 'SKB' ? 'SKB: WHT Art. 23 at 0% (step 3)' : 'PP23: final WHT Art. 4(2) at 0.5% (step 3)'}>
          <Select value={form.facilityType} onChange={set('facilityType')}>
            <option value="SKB">SKB</option>
            <option value="PP23">PP23</option>
          </Select>
        </Field>
        <Field label="Certificate no." required>
          <Input value={form.certificateNo} onChange={set('certificateNo')} placeholder="e.g. SKB-001/2026" />
        </Field>
        <Field label="Valid from" required>
          <Input type="date" value={form.validFrom || ''} onChange={set('validFrom')} />
        </Field>
        <Field label="Valid to" required>
          <Input type="date" value={form.validTo || ''} onChange={set('validTo')} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <Options options={MASTER_STATUSES} />
          </Select>
        </Field>
        <Field label="Notes" wide>
          <Textarea rows={2} value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </Section>
    </FormDrawer>
  )
}

const EMPTY_SBUJK = {
  vendorCode: '', vendorName: '', sbujkNo: '', businessScope: 'EXECUTION', businessScopeText: '', qualification: 'SMALL',
  qualificationText: '', validTo: '', notes: '', status: 'ACTIVE'
}

export function SbujkDrawer({ open, record, vendors, onClose, onSave }) {
  const initial = useMemo(() => ({ ...EMPTY_SBUJK, ...(record || {}) }), [record])
  const state = useForm(initial, open)
  const { form, set, setForm } = state
  const save = () =>
    submit(state, form, ['vendorCode', 'vendorName', 'sbujkNo', 'businessScope', 'qualification', 'validTo'], {
      vendorCode: 'Vendor code', vendorName: 'Vendor name', sbujkNo: 'SBUJK no.', validTo: 'Valid to'
    }, onSave)
  return (
    <FormDrawer open={open} title={record?.id ? 'Edit SBUJK' : 'Add SBUJK'} onClose={onClose}
      error={state.error} saving={state.saving} onSave={save}>
      <Section title="Vendor">
        <VendorFields form={form} setForm={setForm} vendors={vendors} />
      </Section>
      <Section title="Classification">
        <Field label="SBUJK no." required>
          <Input value={form.sbujkNo} onChange={set('sbujkNo')} />
        </Field>
        <Field label="Valid to" required>
          <Input type="date" value={form.validTo || ''} onChange={set('validTo')} />
        </Field>
        <Field label="Business scope" required>
          <Select value={form.businessScope} onChange={set('businessScope')}>
            <Options options={BUSINESS_SCOPES} />
          </Select>
        </Field>
        <Field label="Scope description">
          <Input value={form.businessScopeText || ''} onChange={set('businessScopeText')} placeholder="e.g. Building construction" />
        </Field>
        <Field label="Qualification" required hint="Small → 1.75% · Non-small → 2.65% for execution (step 5)">
          <Select value={form.qualification} onChange={set('qualification')}>
            <Options options={QUALIFICATIONS} />
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <Options options={MASTER_STATUSES} />
          </Select>
        </Field>
        <Field label="Notes" wide>
          <Textarea rows={2} value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </Section>
    </FormDrawer>
  )
}
