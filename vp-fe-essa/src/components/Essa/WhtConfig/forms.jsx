import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { MASTER_STATUSES, RULE_STATUSES, rangesOverlap, todayIso } from './options'

function Field({ label, required, hint, error, children, wide, htmlFor }) {
  return (
    <div className={`wht-field${wide ? ' is-wide' : ''}${error ? ' has-error' : ''}`}>
      <label className="wht-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <em aria-hidden> *</em> : null}
      </label>
      {children}
      {error ? <span className="wht-field__error" role="alert">{error}</span> : hint ? <span className="wht-field__hint">{hint}</span> : null}
    </div>
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
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      setForm(initial)
      setErrors({})
      setError('')
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const set = (key) => (e) => {
    const value = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
  }
  return { form, setForm, set, errors, setErrors, error, setError, saving, setSaving }
}

async function run(state, payload, onSave) {
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
// WHT rule
// ---------------------------------------------------------------------------

const EMPTY_RULE = {
  categoryCode: '',
  conditionCode: '',
  subConditionCode: '',
  rateType: 'FIXED',
  ratePct: '',
  sapWhtCode: '',
  effectiveFrom: todayIso(),
  effectiveTo: '',
  status: 'ACTIVE',
  remarks: '',
  confirmReview: false
}

/** Codes used by another live rule whose dates overlap → not selectable. */
function codesInUse(rules, form, editingId) {
  const used = new Map()
  rules.forEach((r) => {
    if (r.id === editingId || r.status === 'INACTIVE') return
    if (!rangesOverlap(r.effectiveFrom, r.effectiveTo, form.effectiveFrom, form.effectiveTo || null)) return
    used.set(r.sapWhtCode, r)
  })
  return used
}

export function RuleDrawer({ open, rule, rules, taxonomy, sapCodes, rateTypes, onClose, onSave }) {
  const initial = useMemo(
    () =>
      rule
        ? {
            ...EMPTY_RULE,
            id: rule.id,
            categoryCode: rule.categoryCode || '',
            conditionCode: rule.conditionCode || '',
            subConditionCode: rule.subConditionCode || '',
            rateType: rule.rateType || 'FIXED',
            ratePct: rule.ratePct ?? '',
            sapWhtCode: rule.sapWhtCode || '',
            effectiveFrom: rule.effectiveFrom || todayIso(),
            effectiveTo: rule.effectiveTo || '',
            status: rule.status || 'ACTIVE',
            remarks: rule.remarks || ''
          }
        : EMPTY_RULE,
    [rule]
  )
  const state = useForm(initial, open)
  const { form, setForm, set, errors, setErrors } = state
  const isNew = !rule?.id

  const category = taxonomy.find((c) => c.code === form.categoryCode)
  const conditions = category?.conditions || []
  const condition = conditions.find((c) => c.code === form.conditionCode)
  const subConditions = condition?.subConditions || []
  const used = codesInUse(rules, form, rule?.id)
  const progressive = form.rateType === 'PROGRESSIVE'

  // Changing a parent clears what no longer fits underneath it.
  const pickCategory = (e) => {
    const code = e.target.value
    setForm((f) => ({ ...f, categoryCode: code, conditionCode: '', subConditionCode: '' }))
    setErrors({})
  }
  const pickCondition = (e) => {
    const code = e.target.value
    setForm((f) => ({ ...f, conditionCode: code, subConditionCode: '' }))
    setErrors((x) => ({ ...x, conditionCode: undefined, subConditionCode: undefined }))
  }

  const validate = () => {
    const x = {}
    if (!form.categoryCode) x.categoryCode = 'Select a category'
    if (!form.conditionCode) x.conditionCode = 'Select a condition'
    if (subConditions.length && !form.subConditionCode) x.subConditionCode = 'Select a sub-condition'
    if (!form.rateType) x.rateType = 'Select a rate type'
    if (!progressive) {
      const n = Number(form.ratePct)
      if (form.ratePct === '' || form.ratePct == null) x.ratePct = 'Enter the rate'
      else if (!Number.isFinite(n) || n < 0 || n > 100) x.ratePct = 'Between 0 and 100'
    }
    if (!form.sapWhtCode) x.sapWhtCode = 'Select a SAP WH code'
    else if (used.has(form.sapWhtCode)) {
      const r = used.get(form.sapWhtCode)
      x.sapWhtCode = `Already mapped to ${[r.category, r.condition, r.subCondition].filter(Boolean).join(' · ')}`
    }
    if (!form.effectiveFrom) x.effectiveFrom = 'Required'
    if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) x.effectiveTo = 'Before the start date'
    setErrors(x)
    return !Object.keys(x).length
  }

  const save = (status) => {
    if (!validate()) {
      state.setError('Check the highlighted fields.')
      return
    }
    run(state, {
      id: form.id,
      categoryCode: form.categoryCode,
      conditionCode: form.conditionCode,
      subConditionCode: subConditions.length ? form.subConditionCode : null,
      rateType: form.rateType,
      ratePct: progressive ? null : Number(form.ratePct),
      sapWhtCode: form.sapWhtCode,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      status: status || form.status,
      remarks: form.remarks,
      confirmReview: form.confirmReview
    }, onSave)
  }

  const groups = useMemo(() => {
    const g = new Map()
    sapCodes.forEach((c) => g.set(c.group, [...(g.get(c.group) || []), c.code]))
    return [...g.entries()]
  }, [sapCodes])

  return (
    <FormDrawer open={open} title={isNew ? 'Add WHT rule' : 'Edit WHT rule'} onClose={onClose} draftable
      error={state.error} saving={state.saving} onSave={save}>
      {rule?.needsReview ? (
        <div className="wht-callout" role="note">
          <AlertTriangle size={16} aria-hidden />
          <div>
            <b>To confirm with the tax team</b>
            <p>{rule.reviewNote}</p>
            <label className="wht-check">
              <input type="checkbox" checked={!!form.confirmReview} onChange={set('confirmReview')} />
              Confirmed — this code and rate are correct
            </label>
          </div>
        </div>
      ) : null}

      <Section title="Rule">
        <Field label="Category" required error={errors.categoryCode} htmlFor="wht-category">
          <Select id="wht-category" value={form.categoryCode} onChange={pickCategory} aria-invalid={!!errors.categoryCode}>
            <option value="">Select category</option>
            {taxonomy.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Condition" required error={errors.conditionCode} htmlFor="wht-condition"
          hint={!category ? 'Select a category first' : null}>
          <Select id="wht-condition" value={form.conditionCode} onChange={pickCondition} disabled={!category} aria-invalid={!!errors.conditionCode}>
            <option value="">{category ? 'Select condition' : '—'}</option>
            {conditions.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Sub-condition" required={subConditions.length > 0} error={errors.subConditionCode} htmlFor="wht-sub"
          hint={condition && !subConditions.length ? `${condition.label} has no sub-conditions` : !condition ? 'Select a condition first' : null}>
          <Select id="wht-sub" value={form.subConditionCode} onChange={set('subConditionCode')} disabled={!subConditions.length} aria-invalid={!!errors.subConditionCode}>
            <option value="">{subConditions.length ? 'Select sub-condition' : '—'}</option>
            {subConditions.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Rate">
        <Field label="Rate type" required error={errors.rateType} htmlFor="wht-rate-type">
          <Select id="wht-rate-type" value={form.rateType} onChange={set('rateType')}>
            {rateTypes.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Rate (%)" required={!progressive} error={errors.ratePct} htmlFor="wht-rate"
          hint={progressive ? 'Progressive rates follow the PPh 21 table' : form.rateType === 'TREATY' ? 'The treaty rate this SAP code stands for' : null}>
          <Input id="wht-rate" type="number" inputMode="decimal" step="0.01" min="0" max="100" value={progressive ? '' : form.ratePct ?? ''}
            onChange={set('ratePct')} disabled={progressive} placeholder={progressive ? '—' : 'e.g. 20'} aria-invalid={!!errors.ratePct} />
        </Field>
        <Field label="SAP WH code" required error={errors.sapWhtCode} htmlFor="wht-code"
          hint="Each code can belong to only one active or draft rule at a time">
          <Select id="wht-code" value={form.sapWhtCode} onChange={set('sapWhtCode')} aria-invalid={!!errors.sapWhtCode}>
            <option value="">Select SAP WH code</option>
            {groups.map(([group, codes]) => (
              <optgroup key={group} label={group}>
                {codes.map((code) => {
                  const r = used.get(code)
                  return (
                    <option key={code} value={code} disabled={!!r && code !== initial.sapWhtCode}>
                      {code}{r ? ` — in use (${[r.category, r.condition, r.subCondition].filter(Boolean).join(' · ')})` : ''}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Validity">
        <Field label="Effective from" required error={errors.effectiveFrom} htmlFor="wht-from">
          <Input id="wht-from" type="date" value={form.effectiveFrom || ''} onChange={set('effectiveFrom')} />
        </Field>
        <Field label="Effective to" error={errors.effectiveTo} htmlFor="wht-to" hint="Leave empty if the rule has no end date">
          <Input id="wht-to" type="date" value={form.effectiveTo || ''} onChange={set('effectiveTo')} />
        </Field>
        {!isNew ? (
          <Field label="Status" htmlFor="wht-status">
            <Select id="wht-status" value={form.status} onChange={set('status')}>
              {RULE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Remarks" wide htmlFor="wht-remarks">
          <Textarea id="wht-remarks" rows={2} value={form.remarks || ''} onChange={set('remarks')} />
        </Field>
      </Section>
    </FormDrawer>
  )
}

// ---------------------------------------------------------------------------
// Vendor tax facility (SKB / PP23)
// ---------------------------------------------------------------------------

function VendorFields({ form, setForm, vendors, errors }) {
  const pick = (e) => {
    const code = e.target.value
    const vendor = vendors.find((v) => v.code === code)
    setForm((f) => ({ ...f, vendorCode: code, vendorName: vendor ? vendor.name : f.vendorName }))
  }
  return (
    <>
      <Field label="Vendor code" required error={errors.vendorCode} htmlFor="wht-vcode">
        <Input id="wht-vcode" value={form.vendorCode} onChange={pick} list="wht-vendor-codes" placeholder="SAP vendor code" />
        <datalist id="wht-vendor-codes">
          {vendors.map((v) => (
            <option key={v.code} value={v.code}>{v.name}</option>
          ))}
        </datalist>
      </Field>
      <Field label="Vendor name" required error={errors.vendorName} htmlFor="wht-vname">
        <Input id="wht-vname" value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} />
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
  const { form, set, setForm, errors, setErrors } = state
  const save = () => {
    const x = {}
    ;[['vendorCode', 'Required'], ['vendorName', 'Required'], ['certificateNo', 'Required'], ['validFrom', 'Required'], ['validTo', 'Required']]
      .forEach(([k, m]) => { if (!String(form[k] || '').trim()) x[k] = m })
    if (form.validFrom && form.validTo && form.validTo < form.validFrom) x.validTo = 'Before valid from'
    setErrors(x)
    if (Object.keys(x).length) {
      state.setError('Check the highlighted fields.')
      return
    }
    run(state, form, onSave)
  }
  return (
    <FormDrawer open={open} title={facility?.id ? 'Edit vendor tax facility' : 'Add vendor tax facility'} onClose={onClose}
      error={state.error} saving={state.saving} onSave={save}>
      <Section title="Vendor">
        <VendorFields form={form} setForm={setForm} vendors={vendors} errors={errors} />
      </Section>
      <Section title="Facility">
        <Field label="Facility type" required htmlFor="wht-ftype"
          hint={form.facilityType === 'SKB' ? 'SKB: WHT Art. 23 at 0%' : 'PP23: final WHT Art. 4(2) at 0.5%'}>
          <Select id="wht-ftype" value={form.facilityType} onChange={set('facilityType')}>
            <option value="SKB">SKB</option>
            <option value="PP23">PP23</option>
          </Select>
        </Field>
        <Field label="Certificate no." required error={errors.certificateNo} htmlFor="wht-cert">
          <Input id="wht-cert" value={form.certificateNo} onChange={set('certificateNo')} placeholder="e.g. SKB-001/2026" />
        </Field>
        <Field label="Valid from" required error={errors.validFrom} htmlFor="wht-vfrom">
          <Input id="wht-vfrom" type="date" value={form.validFrom || ''} onChange={set('validFrom')} />
        </Field>
        <Field label="Valid to" required error={errors.validTo} htmlFor="wht-vto">
          <Input id="wht-vto" type="date" value={form.validTo || ''} onChange={set('validTo')} />
        </Field>
        <Field label="Status" htmlFor="wht-fstatus">
          <Select id="wht-fstatus" value={form.status} onChange={set('status')}>
            {MASTER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" wide htmlFor="wht-fnotes">
          <Textarea id="wht-fnotes" rows={2} value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </Section>
    </FormDrawer>
  )
}
