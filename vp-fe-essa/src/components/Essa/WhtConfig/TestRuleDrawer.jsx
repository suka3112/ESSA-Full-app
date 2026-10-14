import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleSlash, Loader2 } from 'lucide-react'

import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { evaluateWht } from 'api/whtConfig'
import {
  OFFSHORE_INCOME,
  RENTAL_TYPES,
  SBUJK_OPTIONS,
  SERVICE_TYPES,
  VENDOR_TYPES,
  BUSINESS_SCOPES,
  todayIso
} from './options'

const EMPTY = {
  vendorCode: '',
  vendorType: 'DOMESTIC_COMPANY',
  country: '',
  hasDgtForm: 'NO',
  offshoreIncome: 'SERVICES',
  isRental: 'NO',
  rentalType: 'LAND_BUILDING',
  hasSkb: 'NO',
  pp23Eligible: 'NO',
  isConstruction: 'NO',
  constructionType: 'EXECUTION',
  sbujk: 'NONE',
  serviceType: 'OTHER_SERVICES',
  date: todayIso()
}

const yes = (v) => v === 'YES'

function Q({ label, children, hint }) {
  return (
    <label className="wht-field">
      <span className="wht-field__label">{label}</span>
      {children}
      {hint ? <span className="wht-field__hint">{hint}</span> : null}
    </label>
  )
}

function YesNo({ value, onChange, disabled }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="NO">No</option>
      <option value="YES">Yes</option>
    </Select>
  )
}

function Pick({ value, onChange, options, disabled }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )
}

/** "Test WHT Rule": answer the step questions and see which rule the engine picks. */
export default function TestRuleDrawer({ open, onClose, vendors, hasTaxRateDocument }) {
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setResult(null)
      setError('')
    }
  }, [open])

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setResult(null)
  }

  const offshore = form.vendorType === 'OFFSHORE'
  const individual = form.vendorType === 'INDIVIDUAL'
  const domestic = form.vendorType === 'DOMESTIC_COMPANY'

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const data = await evaluateWht({
        vendorCode: form.vendorCode || undefined,
        vendorType: form.vendorType,
        country: offshore ? form.country : undefined,
        hasDgtForm: yes(form.hasDgtForm),
        offshoreIncome: form.offshoreIncome,
        isRental: yes(form.isRental),
        rentalType: form.rentalType,
        hasSkb: yes(form.hasSkb),
        pp23Eligible: yes(form.pp23Eligible),
        isConstruction: yes(form.isConstruction),
        constructionType: form.constructionType,
        sbujk: form.sbujk,
        serviceType: form.serviceType,
        date: form.date
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const rule = result?.rule
  const candidates = result?.candidates || []
  const treaty = result?.treaty
  const tone = !result ? '' : result.result === 'WHT_APPLICABLE' ? ' is-match' : result.result === 'NEEDS_REVIEW' ? ' is-review' : ' is-none'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Test WHT rule"
      width="max-w-3xl"
      footer={
        <div className="wht-drawer-footer">
          {error ? <span className="wht-form-error" role="alert">{error}</span> : <span />}
          <div className="wht-drawer-footer__actions">
            <Button variant="secondary" onClick={() => { setForm(EMPTY); setResult(null) }}>Reset</Button>
            <Button onClick={run} disabled={busy}>
              {busy ? <Loader2 size={14} className="wht-spin" /> : null} Evaluate
            </Button>
          </div>
        </div>
      }
    >
      <div className="wht-test">
        <div className="wht-form">
          <section className="wht-form-section">
            <h3>Vendor</h3>
            <div className="wht-form-grid">
              <Q label="Vendor (optional)" hint="A known vendor’s SKB / PP23 certificates are used automatically">
                <Input value={form.vendorCode} onChange={(e) => set('vendorCode')(e.target.value)} list="wht-test-vendors" placeholder="Vendor code" />
                <datalist id="wht-test-vendors">
                  {vendors.map((v) => (
                    <option key={v.code} value={v.code}>{v.name}</option>
                  ))}
                </datalist>
              </Q>
              <Q label="Vendor type">
                <Pick value={form.vendorType} onChange={set('vendorType')} options={VENDOR_TYPES} />
              </Q>
              <Q label="Invoice date">
                <Input type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} />
              </Q>
            </div>
          </section>

          {offshore ? (
            <section className="wht-form-section">
              <h3>Step 1 · Offshore</h3>
              <div className="wht-form-grid">
                <Q label="Country">
                  <Input value={form.country} onChange={(e) => set('country')(e.target.value)} placeholder="e.g. Singapore" />
                </Q>
                <Q label="DGT form provided?">
                  <YesNo value={form.hasDgtForm} onChange={set('hasDgtForm')} />
                </Q>
                <Q label="Income type">
                  <Pick value={form.offshoreIncome} onChange={set('offshoreIncome')} options={OFFSHORE_INCOME} disabled={!yes(form.hasDgtForm)} />
                </Q>
              </div>
            </section>
          ) : (
            <section className="wht-form-section">
              <h3>Steps 2–7 · Transaction</h3>
              <div className="wht-form-grid">
                <Q label="Rental transaction?">
                  <YesNo value={form.isRental} onChange={set('isRental')} />
                </Q>
                <Q label="Rental of">
                  <Pick value={form.rentalType} onChange={set('rentalType')} options={RENTAL_TYPES} disabled={!yes(form.isRental)} />
                </Q>
                {domestic ? (
                  <>
                    <Q label="Has SKB?">
                      <YesNo value={form.hasSkb} onChange={set('hasSkb')} />
                    </Q>
                    <Q label="PP23 eligible?">
                      <YesNo value={form.pp23Eligible} onChange={set('pp23Eligible')} />
                    </Q>
                    <Q label="Construction?">
                      <YesNo value={form.isConstruction} onChange={set('isConstruction')} />
                    </Q>
                    <Q label="Construction work">
                      <Pick value={form.constructionType} onChange={set('constructionType')} options={BUSINESS_SCOPES} disabled={!yes(form.isConstruction)} />
                    </Q>
                    <Q label="SBUJK (as stated)" hint="SBUJK master data is disabled; answer for this invoice">
                      <Pick value={form.sbujk} onChange={set('sbujk')} options={SBUJK_OPTIONS} disabled={!yes(form.isConstruction)} />
                    </Q>
                    <Q label="Service type">
                      <Pick value={form.serviceType} onChange={set('serviceType')} options={SERVICE_TYPES} />
                    </Q>
                  </>
                ) : null}
              </div>
              {individual ? <p className="wht-note">Individual vendors use step 2 unless it is a rental.</p> : null}
            </section>
          )}
        </div>

        <aside className={`wht-result${tone}`} aria-live="polite">
          <h3>Matched WHT rule</h3>
          {!result ? (
            <p className="wht-note">Answer the questions and press Evaluate.</p>
          ) : !candidates.length ? (
            <p className="wht-result__none">No active rule matches. Check that the step {result.step} rule is active and in date.</p>
          ) : (
            <>
              <dl>
                <dt>Step</dt><dd>{result.step}</dd>
                <dt>Category</dt><dd>{candidates[0].category}</dd>
                <dt>Condition</dt><dd>{[candidates[0].condition, candidates[0].subCondition].filter(Boolean).join(' · ')}</dd>
                <dt>WHT article</dt><dd>{candidates[0].whtArticle}</dd>
                {rule ? (
                  <>
                    <dt>Rate</dt><dd>{rule.rateText}</dd>
                    <dt>SAP WH code</dt><dd className="wht-mono">{rule.sapWhtCode}</dd>
                  </>
                ) : (
                  <>
                    <dt>SAP WH code</dt>
                    <dd>
                      <span className="wht-candidates">
                        {candidates.map((c) => <span key={c.id} className="wht-candidate"><b className="wht-mono">{c.sapWhtCode}</b> {c.rateText}</span>)}
                      </span>
                    </dd>
                  </>
                )}
                {treaty ? (
                  <>
                    <dt>Treaty ({treaty.country})</dt>
                    <dd>
                      {Object.keys(treaty.values || {}).length
                        ? Object.entries(treaty.values).map(([k, v]) => <span key={k} className="wht-treaty-line">{k}: <b>{v || '—'}</b></span>)
                        : treaty.message}
                      {treaty.versionNo ? <small className="wht-treaty-src">Tax Rate document v{treaty.versionNo}</small> : null}
                    </dd>
                  </>
                ) : null}
                <dt>Result</dt>
                <dd className={result.result === 'WHT_APPLICABLE' ? 'wht-result__ok' : 'wht-result__warn'}>
                  {result.result === 'WHT_APPLICABLE' ? 'WHT applicable' : 'Needs tax review'}
                </dd>
              </dl>
              {result.reviewNote ? (
                <p className="wht-review-note"><AlertTriangle size={13} aria-hidden /> {result.reviewNote}</p>
              ) : null}
              {form.vendorType === 'OFFSHORE' && yes(form.hasDgtForm) && !form.country ? (
                <p className="wht-note">Enter the vendor’s country to read its treaty rate{hasTaxRateDocument ? '' : ' (no Tax Rate document is uploaded yet)'}.</p>
              ) : null}
            </>
          )}
          {result?.trace?.length ? (
            <ol className="wht-trace">
              {result.trace.map((t) => (
                <li key={t.step} className={t.applies ? 'is-applied' : undefined}>
                  {t.applies ? <CheckCircle2 size={14} /> : <CircleSlash size={14} />}
                  <span><b>{t.step} · {t.label}</b> {t.reason}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </aside>
      </div>
    </Drawer>
  )
}
