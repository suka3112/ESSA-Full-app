import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Save,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { ADMIN_USER_TYPE } from 'constants/userType'
import '../../../assets/scss/essa/dashboard.scss'

const ROLES = [
  { value: 'hos', label: 'HOS — Head of Section' },
  { value: 'hod', label: 'HOD — Head of Department' },
  { value: 'hof', label: 'HOF — Head of Function' },
  { value: 'sth', label: 'STH — Operations & Site Head' },
  { value: 'gfd', label: 'GFD — Group Functional Director' }
]

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))
const roleShort = (v) => (v ? v.toUpperCase() : '—')
const roleName = (v) => (ROLE_LABEL[v]?.split('—')[1] || '').trim() || v

const DUMMY_MATRIX_RULES = [
  { amount_min: 0, amount_max: 2_000_000, level: 1, role: 'hos', description: 'HOS sign-off for petty invoices' },
  { amount_min: 2_000_000, amount_max: 5_000_000, level: 1, role: 'hos', description: 'HOS reviews mid-band invoice' },
  { amount_min: 2_000_000, amount_max: 5_000_000, level: 2, role: 'hod', description: 'HOD final approval' },
  { amount_min: 5_000_000, amount_max: 15_000_000, level: 1, role: 'hod', description: 'HOD reviews' },
  { amount_min: 5_000_000, amount_max: 15_000_000, level: 2, role: 'hof', description: 'HOF final approval' },
  { amount_min: 15_000_000, amount_max: 50_000_000, level: 1, role: 'hod', description: 'HOD reviews' },
  { amount_min: 15_000_000, amount_max: 50_000_000, level: 2, role: 'hof', description: 'HOF reviews' },
  { amount_min: 15_000_000, amount_max: 50_000_000, level: 3, role: 'sth', description: 'Site Head final approval' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 1, role: 'hod', description: 'HOD reviews' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 2, role: 'hof', description: 'HOF reviews' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 3, role: 'sth', description: 'Site Head reviews' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 4, role: 'gfd', description: 'GFD final approval' },
  { amount_min: 100_000_000, amount_max: null, level: 1, role: 'hod', description: 'HOD reviews (>100M IDR)' },
  { amount_min: 100_000_000, amount_max: null, level: 2, role: 'hof', description: 'HOF reviews' },
  { amount_min: 100_000_000, amount_max: null, level: 3, role: 'sth', description: 'Site Head reviews' },
  { amount_min: 100_000_000, amount_max: null, level: 4, role: 'gfd', description: 'GFD final approval' }
]

let _uid = 0
const uid = () => `b${++_uid}`

function fmtCompact(n) {
  if (n == null) return '∞'
  const a = Math.abs(n)
  const f = (v) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  if (a >= 1_000_000_000) return `${f(n / 1_000_000_000)} M`
  if (a >= 1_000_000) return `${f(n / 1_000_000)} jt`
  if (a >= 1_000) return `${f(n / 1_000)} rb`
  return f(n)
}

function bandLabel(min, max) {
  if (max == null) return `${fmtCompact(min)} and above`
  if (min === 0) return `up to ${fmtCompact(max)}`
  return `${fmtCompact(min)} – ${fmtCompact(max)}`
}

function toBands(rules) {
  const map = new Map()
  for (const r of rules) {
    const key = `${r.amount_min}|${r.amount_max ?? 'INF'}`
    if (!map.has(key)) {
      map.set(key, { id: uid(), min: r.amount_min, max: r.amount_max, levels: [] })
    }
    map.get(key).levels.push({
      id: uid(),
      level: r.level,
      role: r.role,
      description: r.description || ''
    })
  }
  return [...map.values()]
    .sort((a, b) => (a.min ?? 0) - (b.min ?? 0))
    .map((b) => ({ ...b, levels: b.levels.sort((x, y) => x.level - y.level) }))
}

function fromBands(bands) {
  const out = []
  for (const b of bands) {
    b.levels.forEach((lv, i) => {
      out.push({
        amount_min: b.min ?? 0,
        amount_max: b.max ?? null,
        level: i + 1,
        role: lv.role,
        description: lv.description || null
      })
    })
  }
  return out
}

function analyze(bands) {
  const sorted = [...bands].sort((a, b) => (a.min ?? 0) - (b.min ?? 0))
  const issues = {}
  const rail = []
  const add = (id, msg) => {
    issues[id] = issues[id] || []
    issues[id].push(msg)
  }

  if (sorted.length && (sorted[0].min ?? 0) > 0) {
    rail.push({ kind: 'gap', from: 0, to: sorted[0].min })
  }

  sorted.forEach((b, i) => {
    if (!b.levels.length) add(b.id, 'No approvers yet — invoices in this band cannot be routed.')
    if (b.max != null && b.max <= (b.min ?? 0)) add(b.id, '“To” must be greater than “From”.')

    rail.push({ kind: 'band', band: b })

    const next = sorted[i + 1]
    if (next) {
      if (b.max == null) {
        add(b.id, 'This band is open-ended but isn’t the highest — bands above it can never be reached.')
      } else if ((next.min ?? 0) > b.max) {
        rail.push({ kind: 'gap', from: b.max, to: next.min })
        add(
          b.id,
          `Gap before the next band — amounts ${fmtCompact(b.max)}–${fmtCompact(next.min)} aren’t covered.`
        )
      } else if ((next.min ?? 0) < b.max) {
        rail.push({ kind: 'overlap', from: next.min, to: b.max })
        add(b.id, 'Overlaps the next band — an invoice could match two rules.')
        add(next.id, 'Overlaps the previous band.')
      }
    } else if (b.max != null) {
      rail.push({ kind: 'gap', from: b.max, to: null })
      add(
        b.id,
        `Highest band has an upper limit — invoices above ${fmtCompact(b.max)} won’t route. Remove the upper limit to catch them.`
      )
    }
  })

  const problems = Object.values(issues).reduce((n, a) => n + a.length, 0)
  return { sorted, issues, rail, problems }
}

function MoneyInput({ value, onChange, disabled, placeholder }) {
  const display = value == null || value === '' ? '' : Number(value).toLocaleString('id-ID')
  return (
    <input
      className="dx-input dx-money"
      inputMode="numeric"
      disabled={disabled}
      placeholder={placeholder}
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '')
        onChange(digits === '' ? null : Number(digits))
      }}
    />
  )
}

function EssaApprovalMatrix({ userInfo: { userType } }) {
  const { t } = useTranslation('sidebar')
  const editable = userType === ADMIN_USER_TYPE

  const [bands, setBands] = useState([])
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [saving, setSaving] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    setBands(toBands(DUMMY_MATRIX_RULES))
    loaded.current = true
  }, [])

  const { issues, rail, problems } = useMemo(() => analyze(bands), [bands])

  const mutate = (fn) => {
    setBands((prev) => fn(structuredClone(prev)))
    setDirty(true)
  }
  const updateBand = (id, patch) => mutate((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  const removeBand = (id) => mutate((bs) => bs.filter((b) => b.id !== id))
  const updateLevel = (bid, lid, patch) =>
    mutate((bs) =>
      bs.map((b) =>
        b.id === bid ? { ...b, levels: b.levels.map((l) => (l.id === lid ? { ...l, ...patch } : l)) } : b
      )
    )
  const addLevel = (bid) =>
    mutate((bs) =>
      bs.map((b) =>
        b.id === bid ? { ...b, levels: [...b.levels, { id: uid(), role: 'hod', description: '' }] } : b
      )
    )
  const removeLevel = (bid, lid) =>
    mutate((bs) =>
      bs.map((b) => (b.id === bid ? { ...b, levels: b.levels.filter((l) => l.id !== lid) } : b))
    )
  const moveLevel = (bid, lid, dir) =>
    mutate((bs) =>
      bs.map((b) => {
        if (b.id !== bid) return b
        const i = b.levels.findIndex((l) => l.id === lid)
        const j = i + dir
        if (j < 0 || j >= b.levels.length) return b
        const lv = [...b.levels]
        ;[lv[i], lv[j]] = [lv[j], lv[i]]
        return { ...b, levels: lv }
      })
    )
  const addBand = () => {
    setBands((prev) => {
      const sorted = [...prev].sort((a, b) => (a.min ?? 0) - (b.min ?? 0))
      const last = sorted[sorted.length - 1]
      const start = last && last.max != null ? last.max : last ? (last.min ?? 0) + 1 : 0
      return [
        ...prev,
        { id: uid(), min: start, max: null, levels: [{ id: uid(), role: 'hos', description: '' }] }
      ]
    })
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      fromBands(bands)
      setDirty(false)
      setSavedAt(new Date())
      toast.success('Approval matrix saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <HeaderBar title="Approval Matrix" slug={t('approvalMatrix')} showBackArrow={false} />

        <style>{stepperCss}</style>

        <div className="dx-page dx-stack">
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            Which roles approve an invoice — and in what order — based on its amount.
          </p>

          {!editable && (
            <div className="dx-note dx-note-warn">
              <ShieldCheck size={14} /> Read-only — only an Administrator can change the approval matrix.
            </div>
          )}

          <div className="dx-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Layers size={15} style={{ color: 'var(--brand-primary-color, var(--dx-primary-600))' }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Amount coverage</span>
              <span style={{ flex: 1 }} />
              {problems === 0 ? (
                <span className="dx-pill dx-pill-ok">
                  <Check size={12} /> No gaps or overlaps
                </span>
              ) : (
                <span className="dx-pill dx-pill-warn">
                  <AlertTriangle size={12} /> {problems} issue{problems > 1 ? 's' : ''} to fix
                </span>
              )}
            </div>

            <div className="dx-rail">
              {rail.map((seg, i) =>
                seg.kind === 'band' ? (
                  <div key={i} className="dx-rail-seg" title={bandLabel(seg.band.min, seg.band.max)}>
                    <div className="dx-rail-bar" />
                    <div className="dx-rail-cap">{bandLabel(seg.band.min, seg.band.max)}</div>
                    <div className="dx-rail-sub">
                      {seg.band.levels.length} approver{seg.band.levels.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`dx-rail-seg dx-rail-${seg.kind}`}
                    title={seg.kind === 'gap' ? 'Uncovered amounts' : 'Overlapping bands'}
                  >
                    <div className="dx-rail-bar" />
                    <div className="dx-rail-cap">{seg.kind === 'gap' ? 'Gap' : 'Overlap'}</div>
                    <div className="dx-rail-sub">
                      {seg.kind === 'gap'
                        ? seg.to == null
                          ? `above ${fmtCompact(seg.from)}`
                          : `${fmtCompact(seg.from)}–${fmtCompact(seg.to)}`
                        : `${fmtCompact(seg.from)}–${fmtCompact(seg.to)}`}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {editable && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="dx-btn dx-btn-ghost dx-btn-sm" onClick={addBand}>
                <Plus size={13} /> Add amount band
              </button>
              <button
                type="button"
                className="dx-btn dx-btn-primary dx-btn-sm"
                disabled={!dirty || saving}
                onClick={save}
              >
                <Save size={13} /> {saving ? 'Saving…' : dirty ? 'Save changes' : savedAt ? 'Saved' : 'No changes'}
              </button>
            </div>
          )}

          <div className="dx-stack-sm">
            {bands.map((b) => {
              const bandIssues = issues[b.id] || []
              const isOpen = !collapsed[b.id]
              const hasIssue = bandIssues.length > 0
              return (
                <div key={b.id} className="dx-card dx-band" data-issue={hasIssue ? 1 : 0}>
                  <div className="dx-band-head">
                    <button
                      type="button"
                      className="dx-band-toggle"
                      onClick={() => setCollapsed((c) => ({ ...c, [b.id]: isOpen }))}
                      title={isOpen ? 'Collapse' : 'Expand'}
                    >
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dx-band-title">{bandLabel(b.min, b.max)}</div>
                      <div className="dx-band-meta">
                        {b.levels.length ? (
                          <>
                            Approval chain:&nbsp;
                            {b.levels.map((l, i) => (
                              <span key={l.id}>
                                <span className="dx-chip-mini">{roleShort(l.role)}</span>
                                {i < b.levels.length - 1 && <span className="dx-arrow-mini">→</span>}
                              </span>
                            ))}
                          </>
                        ) : (
                          <span className="text-warning">No approvers set</span>
                        )}
                      </div>
                    </div>

                    <span className={`dx-pill ${hasIssue ? 'dx-pill-warn' : 'dx-pill-soft'}`}>
                      {b.levels.length} level{b.levels.length !== 1 ? 's' : ''}
                    </span>

                    {editable && (
                      <button
                        type="button"
                        className="dx-icon-btn"
                        title="Remove band"
                        onClick={() => {
                          if (window.confirm(`Remove the ${bandLabel(b.min, b.max)} band?`)) removeBand(b.id)
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="dx-band-body">
                      <div className="dx-range">
                        <label className="dx-range-field">
                          <span className="dx-range-lbl">From (IDR)</span>
                          <MoneyInput
                            value={b.min}
                            disabled={!editable}
                            onChange={(v) => updateBand(b.id, { min: v ?? 0 })}
                            placeholder="0"
                          />
                          <span className="dx-range-hint">{fmtCompact(b.min ?? 0)}</span>
                        </label>

                        <span className="dx-range-dash">→</span>

                        <label className="dx-range-field">
                          <span className="dx-range-lbl">To (IDR)</span>
                          {b.max == null ? (
                            <div className="dx-input dx-input-static">
                              No upper limit · catches everything above
                            </div>
                          ) : (
                            <MoneyInput
                              value={b.max}
                              disabled={!editable}
                              onChange={(v) => updateBand(b.id, { max: v })}
                              placeholder="e.g. 5.000.000"
                            />
                          )}
                          <span className="dx-range-hint">{b.max == null ? '∞' : fmtCompact(b.max)}</span>
                        </label>

                        {editable && (
                          <label className="dx-range-toggle">
                            <input
                              type="checkbox"
                              checked={b.max == null}
                              onChange={(e) =>
                                updateBand(b.id, { max: e.target.checked ? null : (b.min ?? 0) + 1_000_000 })
                              }
                            />
                            No upper limit
                          </label>
                        )}
                      </div>

                      {bandIssues.map((msg, i) => (
                        <div key={i} className="dx-note dx-note-warn dx-note-inline">
                          <AlertTriangle size={13} /> {msg}
                        </div>
                      ))}

                      <div className="dx-stepper">
                        {b.levels.map((l, i) => (
                          <div key={l.id} className="dx-stepper-row">
                            <div className="dx-stepper-node">
                              <span className="dx-stepper-num">{i + 1}</span>
                            </div>
                            <div className="dx-stepper-card">
                              <div className="dx-stepper-main">
                                <select
                                  className="dx-select"
                                  disabled={!editable}
                                  value={l.role}
                                  onChange={(e) => updateLevel(b.id, l.id, { role: e.target.value })}
                                >
                                  {ROLES.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="dx-input"
                                  disabled={!editable}
                                  value={l.description}
                                  placeholder={`What does ${roleName(l.role)} do at this step?`}
                                  onChange={(e) => updateLevel(b.id, l.id, { description: e.target.value })}
                                />
                              </div>
                              {editable && (
                                <div className="dx-stepper-actions">
                                  <button
                                    type="button"
                                    className="dx-icon-btn"
                                    disabled={i === 0}
                                    title="Move earlier"
                                    onClick={() => moveLevel(b.id, l.id, -1)}
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="dx-icon-btn"
                                    disabled={i === b.levels.length - 1}
                                    title="Move later"
                                    onClick={() => moveLevel(b.id, l.id, 1)}
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="dx-icon-btn dx-icon-danger"
                                    title="Remove approver"
                                    onClick={() => removeLevel(b.id, l.id)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {editable && (
                          <div className="dx-stepper-row dx-stepper-add">
                            <div className="dx-stepper-node dx-stepper-node-add">
                              <Plus size={14} />
                            </div>
                            <button type="button" className="dx-add-step" onClick={() => addLevel(b.id)}>
                              Add approver to this band
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {bands.length === 0 && loaded.current && (
            <div className="dx-card" style={{ padding: 44, textAlign: 'center' }}>
              <ShieldCheck size={28} style={{ color: 'var(--dx-text-mute)' }} />
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>No amount bands yet</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                Add your first band to start routing invoices for approval.
              </div>
              {editable && (
                <button
                  type="button"
                  className="dx-btn dx-btn-primary dx-btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={addBand}
                >
                  <Plus size={13} /> Add amount band
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </LeftPageContainer>
  )
}

const stepperCss = `
.dx-note{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;font-size:13px;border:1px solid transparent;}
.dx-note-warn{background:var(--dx-warn-50);border-color:var(--dx-warn-100);color:var(--dx-warn-700);}
.dx-note-inline{padding:8px 12px;font-size:12px;margin-top:2px;}

.dx-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.2px;}
.dx-pill-ok{background:var(--dx-success-50);color:var(--dx-success-700);}
.dx-pill-warn{background:var(--dx-warn-50);color:var(--dx-warn-700);}
.dx-pill-soft{background:var(--brand-primary-color-light, var(--dx-primary-50));color:var(--brand-primary-color, var(--dx-primary-700));}

.dx-rail{display:flex;gap:6px;align-items:stretch;}
.dx-rail-seg{flex:1 1 0;min-width:0;text-align:center;}
.dx-rail-bar{height:8px;border-radius:6px;background:var(--brand-primary-color, var(--dx-primary-600));}
.dx-rail-cap{margin-top:7px;font-size:11.5px;font-weight:600;color:var(--dx-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dx-rail-sub{font-size:10.5px;color:var(--dx-text-mute);}
.dx-rail-gap{flex:0 0 86px;}
.dx-rail-gap .dx-rail-bar{background:repeating-linear-gradient(45deg,var(--dx-error-100),var(--dx-error-100) 5px,#fff 5px,#fff 10px);border:1px solid var(--dx-error-500);}
.dx-rail-gap .dx-rail-cap{color:var(--dx-error-600);}
.dx-rail-overlap{flex:0 0 86px;}
.dx-rail-overlap .dx-rail-bar{background:var(--dx-warn-500);}
.dx-rail-overlap .dx-rail-cap{color:var(--dx-warn-700);}

.dx-band{overflow:hidden;}
.dx-band[data-issue="1"]{border-color:var(--dx-warn-100);box-shadow:inset 3px 0 0 var(--dx-warn-500);}
.dx-band-head{display:flex;align-items:center;gap:12px;padding:14px 18px;background:var(--dx-g-25);border-bottom:1px solid var(--dx-border-soft);}
.dx-band-toggle{display:grid;place-items:center;width:28px;height:28px;border:none;background:transparent;border-radius:8px;cursor:pointer;color:var(--dx-text-soft);}
.dx-band-toggle:hover{background:var(--dx-g-100);}
.dx-band-title{font-size:14.5px;font-weight:700;color:var(--dx-text);}
.dx-band-meta{margin-top:3px;font-size:11.5px;color:var(--dx-text-mute);display:flex;align-items:center;flex-wrap:wrap;}
.dx-chip-mini{display:inline-block;padding:2px 8px;border-radius:6px;background:var(--brand-primary-color, var(--dx-primary-600));color:#fff;font-weight:700;font-size:10.5px;}
.dx-arrow-mini{margin:0 5px;color:var(--brand-primary-color, var(--dx-primary-400));}
.dx-band-body{padding:18px;}

.dx-range{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px dashed var(--dx-border);margin-bottom:18px;}
.dx-range-field{display:flex;flex-direction:column;gap:4px;}
.dx-range-lbl{font-size:10.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--dx-text-mute);}
.dx-range-hint{font-size:11px;color:var(--brand-primary-color, var(--dx-primary-600));font-weight:600;}
.dx-range-dash{padding-bottom:24px;color:var(--dx-g-400);font-size:16px;}
.dx-money{width:170px;text-align:right;font-variant-numeric:tabular-nums;}
.dx-input-static{display:flex;align-items:center;color:var(--dx-text-mute);font-size:12.5px;background:var(--dx-g-50);width:300px;}
.dx-range-toggle{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dx-text-soft);padding-bottom:9px;cursor:pointer;}

.dx-stepper{position:relative;}
.dx-stepper-row{display:flex;gap:14px;align-items:stretch;position:relative;}
.dx-stepper-row:not(:last-child){padding-bottom:12px;}
.dx-stepper-node{position:relative;flex:0 0 30px;display:flex;justify-content:center;}
.dx-stepper-node::before{content:"";position:absolute;top:30px;bottom:-12px;width:2px;background:var(--brand-primary-color-light, var(--dx-primary-200));}
.dx-stepper-row:last-child .dx-stepper-node::before{display:none;}
.dx-stepper-num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--brand-primary-color, var(--dx-primary-600));color:#fff;font-weight:700;font-size:13px;z-index:1;box-shadow:0 0 0 3px var(--brand-primary-color-light, rgba(13,166,234,.12));}
.dx-stepper-node-add{align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;color:#fff;background:var(--brand-primary-color, var(--dx-primary-600));box-shadow:0 0 0 3px var(--brand-primary-color-light, rgba(13,166,234,.12));}
.dx-stepper-card{flex:1;display:flex;gap:10px;align-items:center;background:var(--dx-card);border:1px solid var(--dx-border);border-radius:12px;padding:10px;}
.dx-stepper-main{flex:1;display:flex;gap:10px;align-items:center;min-width:0;}
.dx-stepper-main .dx-select{flex:0 0 250px;}
.dx-stepper-main .dx-input{flex:1;min-width:0;}
.dx-stepper-actions{display:flex;gap:2px;}
.dx-add-step{flex:1;border:1.5px dashed var(--brand-primary-color, var(--dx-primary-400));background:var(--brand-primary-color-light, var(--dx-primary-25));border-radius:12px;padding:11px;color:var(--brand-primary-color, var(--dx-primary-700));font-weight:600;font-size:13px;cursor:pointer;text-align:left;padding-left:14px;}
.dx-add-step:hover{border-color:var(--brand-primary-color, var(--dx-primary-600));background:var(--brand-primary-color-light, var(--dx-primary-50));color:var(--brand-primary-color, var(--dx-primary-800));}
.dx-stepper-add .dx-stepper-num{display:none;}

.dx-icon-btn{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dx-text-mute);cursor:pointer;}
.dx-icon-btn:hover:not(:disabled){background:var(--brand-primary-color-light, var(--dx-primary-50));color:var(--brand-primary-color, var(--dx-primary-700));}
.dx-icon-btn:disabled{opacity:.35;cursor:not-allowed;}
.dx-icon-danger:hover:not(:disabled){background:var(--dx-error-50);color:var(--dx-error-600);}

@media (max-width:720px){
  .dx-stepper-card{flex-direction:column;align-items:stretch;}
  .dx-stepper-main{flex-direction:column;align-items:stretch;}
  .dx-stepper-main .dx-select{flex:1;}
}
`

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaApprovalMatrix)
