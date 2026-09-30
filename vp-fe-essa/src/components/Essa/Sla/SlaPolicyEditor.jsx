import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft, Copy, FlaskConical, GitBranch, Plus, Save, Send, Trash2, XCircle } from 'lucide-react'

import { SLA_CALENDAR, SLA_MANAGEMENT } from 'constants/url'
import {
  createSlaPolicy,
  cloneSlaPolicy,
  deleteSlaPolicy,
  markSlaPolicyTested,
  newSlaPolicyVersion,
  publishSlaPolicy,
  retireSlaPolicy,
  simulateSla,
  updateSlaPolicy
} from 'api/sla'
import SlaLayout from './SlaLayout'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Skeleton } from '../ui/Skeleton'
import { Tabs } from '../ui/Tabs'
import {
  PolicyStatusBadge,
  ProposedNote,
  Toggle,
  Tooltip,
  adminCrumbs,
  blankSlaPolicy,
  durationLabel,
  label,
  mergePauseRules,
  slaDate,
  slaEditTo,
  slaTemplateOptions,
  slaTo,
  useSlaMeta,
  useSlaPolicies
} from '../lib/sla'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'

const EDITOR_TABS = [
  { value: 'general', label: 'General' },
  { value: 'timer', label: 'Timer & Calendar' },
  { value: 'reminders', label: 'Reminder Rules' },
  { value: 'escalation', label: 'Escalation Rules' },
  { value: 'pause', label: 'Pause / Stop-Clock' },
  { value: 'test', label: 'Test / Simulation' }
]

const cloneDraft = (value) => JSON.parse(JSON.stringify(value))

function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function slaDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${slaDate(iso)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

function defaultTrigger(meta, stage) {
  const events = meta?.triggerEvents || []
  return events.find((t) => t.stages?.includes(stage))?.code || events[0]?.code || ''
}

function hydratePolicy(row, calendars) {
  const activeCal = (calendars || []).find((c) => c.status === 'ACTIVE')
  const base = blankSlaPolicy({
    timer: { calendarId: activeCal?.id }
  })
  if (!row) return base
  const mergedPause = mergePauseRules(row.pauseRules)
  return {
    ...base,
    ...row,
    timer: { ...base.timer, ...(row.timer || {}) },
    escalation: { ...base.escalation, ...(row.escalation || {}) },
    reminders: Array.isArray(row.reminders) ? cloneDraft(row.reminders) : [],
    pauseRules: mergedPause.pauseRules,
    manualPauseAllowed:
      row.manualPauseAllowed != null ? row.manualPauseAllowed : mergedPause.hadManualHold
  }
}

function statusLabel(status) {
  if (!status) return 'Draft'
  if (status === 'TEST') return 'Tested'
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function Field({ label: text, required, hint, className, children }) {
  return (
    <div className={clsx('sla-editor-field flex min-w-0 flex-col gap-1 text-xs font-normal', className)}>
      <span className="font-semibold text-ink-secondary">
        {text}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-2xs font-normal text-ink-muted">{hint}</span> : null}
    </div>
  )
}

function ToggleRow({ label: text, hint, checked, disabled, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
      <div>
        <p className="mb-0 text-xs font-semibold text-ink">{text}</p>
        <p className="mb-0 text-2xs text-ink-muted">{hint}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} label={text} onChange={onChange} />
    </div>
  )
}

function ChannelPicker({ value, onChange, disabled, meta, className }) {
  return (
    <span className={clsx('flex flex-wrap gap-1', className)}>
      {(meta?.channels || []).map((c) => {
        const on = value.includes(c.code)
        return (
          <button
            key={c.code}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== c.code) : [...value, c.code])}
            className={clsx(
              'sla-channel-chip rounded-full border px-2 py-0.5 text-2xs font-medium transition-colors disabled:cursor-not-allowed',
              on
                ? 'border-essa-600 bg-essa-50 text-essa-700'
                : 'border-line text-ink-muted hover:border-ink-faint'
            )}
          >
            {c.label}
          </button>
        )
      })}
    </span>
  )
}

function activityHint(meta, activity) {
  const a = meta?.activities?.find((x) => x.code === activity)
  if (!a) return 'Invoice / activity type from the SLA matrix.'
  if (!a.categoryIds?.length) {
    return `${a.label} is in the SLA matrix but has no invoice category configured yet — the policy applies once the category exists.`
  }
  const codes = (a.categoryCodes || []).map((c) => c.replace(/_/g, '-')).join(', ')
  return `Applies to ${a.categoryIds.length} configured invoice categor${
    a.categoryIds.length === 1 ? 'y' : 'ies'
  } (${codes}).`
}

function GeneralTab({ draft, update, editable, meta, codeLocked }) {
  const ro = !editable
  const scopeHint = meta.scopeTypes?.find((s) => s.code === draft.scopeType)?.hint
  const desc = draft.description ?? ''
  return (
    <div className="space-y-4">
      <p className="mb-0 text-xs text-ink-muted">
        Defines where the SLA applies, what starts it, and who owns it.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="SLA Code"
          required
          hint={
            codeLocked
              ? 'The SLA code cannot be changed after creation.'
              : 'Stable unique key, e.g. SERVICE_AP_VERIFICATION.'
          }
        >
          <Input
            value={draft.code}
            disabled={ro || codeLocked}
            maxLength={50}
            className="w-full font-mono uppercase"
            onChange={(e) =>
              update((p) => {
                p.code = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
              })
            }
          />
        </Field>
        <Field label="SLA Name" required>
          <Input
            value={draft.name}
            disabled={ro}
            maxLength={120}
            className="w-full"
            onChange={(e) =>
              update((p) => {
                p.name = e.target.value
              })
            }
          />
        </Field>
        <Field label="Scope Type" required hint={scopeHint}>
          <Select
            value={draft.scopeType}
            disabled={ro}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.scopeType = e.target.value
                if (p.scopeType === 'DOCUMENT_REQUEST') {
                  p.stage = 'DOCUMENT_REQUEST'
                  p.triggerEvent = defaultTrigger(meta, 'DOCUMENT_REQUEST') || 'DOCUMENT_REQUEST_SENT'
                  p.owner = 'VENDOR'
                } else if (p.stage === 'DOCUMENT_REQUEST') {
                  p.stage = 'INVOICE_CREATION'
                  p.triggerEvent = defaultTrigger(meta, 'INVOICE_CREATION') || 'INVOICE_CREATED'
                }
                if (p.scopeType === 'WORKFLOW') {
                  p.stage = 'AP_APPROVAL'
                  p.triggerEvent = defaultTrigger(meta, 'AP_APPROVAL') || 'WORKFLOW_STEP_ASSIGNED'
                  p.owner = 'APPROVER'
                }
                if (p.scopeType === 'GLOBAL' || p.scopeType === 'DOCUMENT_REQUEST') p.activity = ''
              })
            }
          >
            {(meta.scopeTypes || []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Category / Activity"
          required={draft.scopeType === 'INVOICE_CATEGORY'}
          hint={
            draft.scopeType === 'GLOBAL' || draft.scopeType === 'DOCUMENT_REQUEST'
              ? 'Not used for this scope.'
              : draft.scopeType === 'WORKFLOW'
                ? 'Leave blank to apply to every invoice type.'
                : activityHint(meta, draft.activity)
          }
        >
          <Select
            value={draft.activity ?? ''}
            disabled={ro || draft.scopeType === 'GLOBAL' || draft.scopeType === 'DOCUMENT_REQUEST'}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.activity = e.target.value
              })
            }
          >
            <option value="">
              {draft.scopeType === 'WORKFLOW' ? 'All invoice types' : 'Select an activity'}
            </option>
            {(meta.activities || []).map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stage" required>
          <Select
            value={draft.stage}
            disabled={ro || draft.scopeType === 'DOCUMENT_REQUEST' || draft.scopeType === 'WORKFLOW'}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.stage = e.target.value
                const t = (meta.triggerEvents || []).find((x) => x.stages?.includes(p.stage))
                if (t) p.triggerEvent = t.code
              })
            }
          >
            {(meta.stages || [])
              .filter((s) =>
                draft.scopeType === 'DOCUMENT_REQUEST'
                  ? s.code === 'DOCUMENT_REQUEST'
                  : s.code !== 'DOCUMENT_REQUEST'
              )
              .map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Trigger Event" required hint="The event that creates the runtime SLA instance.">
          <Select
            value={draft.triggerEvent}
            disabled={ro}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.triggerEvent = e.target.value
                const t = (meta.triggerEvents || []).find((x) => x.code === e.target.value)
                if (t?.stages?.length) p.stage = t.stages[0]
              })
            }
          >
            {(meta.triggerEvents || []).map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Owner / Responsible" hint="Team or role accountable for meeting the SLA.">
          <Select
            value={draft.owner ?? ''}
            disabled={ro}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.owner = e.target.value
              })
            }
          >
            <option value="">Not set</option>
            {(meta.owners || []).map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Effective From"
          required
          hint="Supports controlled future activation. Confirmed again at publish time."
        >
          <Input
            type="date"
            value={draft.effectiveFrom}
            disabled={ro}
            className="w-full"
            onChange={(e) =>
              update((p) => {
                p.effectiveFrom = e.target.value
              })
            }
          />
        </Field>
        <Field
          label="Effective To"
          hint="Optional. Leave blank if this version has no planned end date."
        >
          <Input
            type="date"
            value={draft.effectiveTo || ''}
            disabled={ro}
            className="w-full"
            onChange={(e) =>
              update((p) => {
                p.effectiveTo = e.target.value || ''
              })
            }
          />
        </Field>
        <Field
          label="Status"
          required
          hint="Set by the lifecycle actions (Save Draft → Test → Publish → Retire), never edited directly."
        >
          <Input value={statusLabel(draft.status)} disabled readOnly className="w-full" />
        </Field>
        <Field label="Description">
          <div className="sla-editor-textarea-wrap">
            <Textarea
              rows={3}
              maxLength={200}
              value={desc}
              disabled={ro}
              className="w-full"
              onChange={(e) =>
                update((p) => {
                  p.description = e.target.value.slice(0, 200)
                })
              }
            />
            <span className="sla-editor-charcount">{desc.length} / 200 characters</span>
          </div>
        </Field>
      </div>
      <div className="sla-provisional">
        <Toggle
          checked={Boolean(draft.provisional)}
          disabled={ro}
          label="Provisional — target still to be confirmed by ESSA"
          onChange={(v) =>
            update((p) => {
              p.provisional = v
            })
          }
        />
        <div className="sla-provisional-copy">
          <p className="sla-provisional-title">Provisional — target still to be confirmed by ESSA</p>
          <p className="sla-provisional-hint">
            A provisional policy can be saved and tested but stays Draft; it cannot be published until the
            flag is cleared.
          </p>
          {draft.provisional ? (
            <Input
              value={draft.provisionalNote ?? ''}
              disabled={ro}
              maxLength={200}
              placeholder="What is waiting for confirmation"
              className="sla-provisional-note"
              onChange={(e) =>
                update((p) => {
                  p.provisionalNote = e.target.value
                })
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function TimerTab({ draft, update, editable, meta, calendars }) {
  const ro = !editable
  const t = draft.timer || {}
  const business = t.unit === 'BUSINESS_DAYS' || t.unit === 'BUSINESS_HOURS'
  const cal = calendars.find((c) => c.id === t.calendarId)
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="space-y-4">
      <p className="mb-0 text-xs text-ink-muted">
        Defines the target duration and the calendar used to calculate the due time. The engine calculates
        start, warning and due time when the runtime instance is created.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Target Duration"
          required
          hint="Leave blank when the stage does not apply to this type — no clock runs."
        >
          <Input
            type="number"
            min={0}
            max={365}
            value={t.duration ?? ''}
            placeholder="Not applicable"
            disabled={ro}
            className="w-full"
            onChange={(e) =>
              update((p) => {
                p.timer.duration = e.target.value === '' ? null : Math.max(0, Number(e.target.value))
              })
            }
          />
        </Field>
        <Field label="Unit" required hint="Business units require a Business Calendar.">
          <Select
            value={t.unit}
            disabled={ro}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.timer.unit = e.target.value
                const b = p.timer.unit === 'BUSINESS_DAYS' || p.timer.unit === 'BUSINESS_HOURS'
                if (b && !p.timer.calendarId) {
                  p.timer.calendarId = calendars.find((c) => c.status === 'ACTIVE')?.id
                }
                if (!b) p.timer.calendarId = undefined
              })
            }
          >
            {(meta.units || []).map((u) => (
              <option key={u.code} value={u.code}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Business Calendar"
          required={business}
          hint={
            business
              ? 'Controls weekends, holidays and working hours for this policy.'
              : 'Only used for Business Days / Business Hours.'
          }
        >
          <Select
            value={t.calendarId ?? ''}
            disabled={ro || !business}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.timer.calendarId = e.target.value || undefined
              })
            }
          >
            <option value="">{business ? 'Select a calendar' : 'Not used'}</option>
            {calendars
              .filter((c) => c.status === 'ACTIVE' || c.id === t.calendarId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status.toLowerCase()})
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Timezone" required hint="Use Asia/Jakarta (WIB) consistently for business-time calculation.">
          <Select
            value={t.timezone}
            disabled={ro}
            className="dx-select w-full"
            onChange={(e) =>
              update((p) => {
                p.timer.timezone = e.target.value
              })
            }
          >
            {(meta.timezones || []).map((z) => (
              <option key={z} value={z}>
                {z === 'Asia/Jakarta' ? 'Asia/Jakarta (WIB)' : z}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Working Hours" hint="Read from the selected Business Calendar.">
          <Input
            value={
              cal
                ? `${cal.workStart} – ${cal.workEnd} · ${(cal.workingDays || [])
                    .map((d) => dayNames[d] || d)
                    .join(', ')}`
                : business
                  ? 'Select a calendar'
                  : 'Calendar time (24 hours)'
            }
            disabled
            readOnly
            className="w-full"
          />
        </Field>
        <Field
          label="Warning Before Breach"
          hint="Optional — flags the item on the workbench and dashboard when it is this close to breach."
        >
          <span className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={999}
              value={t.warningBefore?.value ?? ''}
              placeholder="None"
              disabled={ro}
              className="w-full"
              onChange={(e) =>
                update((p) => {
                  p.timer.warningBefore =
                    e.target.value === ''
                      ? null
                      : { value: Math.max(0, Number(e.target.value)), unit: p.timer.warningBefore?.unit ?? 'HOURS' }
                })
              }
            />
            <Select
              value={t.warningBefore?.unit ?? 'HOURS'}
              disabled={ro || !t.warningBefore}
              className="dx-select w-48"
              onChange={(e) =>
                update((p) => {
                  if (p.timer.warningBefore) p.timer.warningBefore.unit = e.target.value
                })
              }
            >
              {(meta.units || []).map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </Select>
          </span>
        </Field>
        <ToggleRow
          label="Countdown on Workbench"
          hint="Show the remaining time on the invoice workbench and approvals list."
          checked={Boolean(t.countdownOnWorkbench)}
          disabled={ro}
          onChange={(v) =>
            update((p) => {
              p.timer.countdownOnWorkbench = v
            })
          }
        />
        <ToggleRow
          label="Dashboard SLA Indicator"
          hint="Count this policy's instances in the dashboard SLA widgets."
          checked={Boolean(t.dashboardIndicator)}
          disabled={ro}
          onChange={(v) =>
            update((p) => {
              p.timer.dashboardIndicator = v
            })
          }
        />
        <ToggleRow
          label="Unit confirmed by ESSA"
          hint="Tick once ESSA has confirmed whether the target is measured in calendar or working time."
          checked={Boolean(t.unitConfirmed)}
          disabled={ro}
          onChange={(v) =>
            update((p) => {
              p.timer.unitConfirmed = v
            })
          }
        />
      </div>
      <p className="mb-0 text-2xs text-ink-muted">
        Runtime effect: the due time is recalculated only when a governed pause / resume rule applies or the
        policy is republished. Design note: weekends and holidays are never hardcoded — maintain them in the{' '}
        <Link to={slaTo(SLA_CALENDAR)} className="font-semibold text-essa-700 no-underline hover:underline">
          Business Calendar
        </Link>
        .
      </p>
    </div>
  )
}

function RemindersTab({ draft, update, editable, meta }) {
  const ro = !editable
  const rows = [...(draft.reminders || [])].sort((a, b) => a.seq - b.seq)
  const setRow = (id, fn) =>
    update((p) => {
      const r = p.reminders.find((x) => x.id === id)
      if (r) fn(r)
    })
  return (
    <div className="reminders-tab">
      <p className="reminders-description">
        Progressive reminders sent while the SLA is still open and no required action has been completed.
        Sending a reminder never completes, approves or rejects the underlying transaction.
      </p>
      <ProposedNote tone="info" className="mb-0">
        Approval reminders at 24 hours, 48 hours, 3 days and 5 days; missing-document follow-up every 7 days.
        Reminder intervals are configurable here without a code change.
      </ProposedNote>
      <div className="reminders-table-container">
        <table className="reminders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Trigger After</th>
              <th>Recipient</th>
              <th>Channel</th>
              <th>Template</th>
              <th className="text-center">Enabled</th>
              {!ro ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="reminders-empty">
                  No reminders configured.{!ro ? ' Add one below.' : ''}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={clsx(!r.enabled && 'disabled')}>
                  <td className="reminder-sequence">{r.seq}</td>
                  <td>
                    <span className="reminder-trigger">
                      <Input
                        type="number"
                        min={0}
                        value={r.after?.value ?? 0}
                        disabled={ro}
                        className="reminder-delay"
                        aria-label={`Reminder ${r.seq} delay`}
                        onChange={(e) =>
                          setRow(r.id, (x) => {
                            x.after = { ...x.after, value: Math.max(0, Number(e.target.value)) }
                          })
                        }
                      />
                      <Select
                        value={r.after?.unit || 'HOURS'}
                        disabled={ro}
                        className="dx-select reminder-unit"
                        aria-label={`Reminder ${r.seq} unit`}
                        onChange={(e) =>
                          setRow(r.id, (x) => {
                            x.after = { ...x.after, unit: e.target.value }
                          })
                        }
                      >
                        {(meta.units || []).map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.label}
                          </option>
                        ))}
                      </Select>
                      <Tooltip text="Repeat at this interval while the SLA is still open (vendor chase every 7 days).">
                        <label className="reminder-repeat">
                          <input
                            type="checkbox"
                            checked={Boolean(r.repeat)}
                            disabled={ro}
                            onChange={(e) =>
                              setRow(r.id, (x) => {
                                x.repeat = e.target.checked
                              })
                            }
                          />
                          repeat
                        </label>
                      </Tooltip>
                    </span>
                    {r.after?.value === 0 ? (
                      <span className="reminder-immediate">Sent immediately (initial notice)</span>
                    ) : null}
                  </td>
                  <td>
                    <Select
                      value={r.recipient}
                      disabled={ro}
                      className="dx-select reminder-recipient"
                      aria-label={`Reminder ${r.seq} recipient`}
                      onChange={(e) =>
                        setRow(r.id, (x) => {
                          x.recipient = e.target.value
                        })
                      }
                    >
                      {(meta.recipients || []).map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <ChannelPicker
                      value={r.channels || []}
                      disabled={ro}
                      meta={meta}
                      className="reminder-channels"
                      onChange={(v) =>
                        setRow(r.id, (x) => {
                          x.channels = v
                        })
                      }
                    />
                  </td>
                  <td>
                    <Select
                      value={r.templateId || r.template || ''}
                      disabled={ro}
                      className="dx-select reminder-template"
                      aria-label={`Reminder ${r.seq} template`}
                      onChange={(e) =>
                        setRow(r.id, (x) => {
                          const opts = slaTemplateOptions(meta)
                          const opt = opts.find((t) => t.id === e.target.value || t.name === e.target.value)
                          x.template = opt?.name || e.target.value
                          x.templateId = opt?.id || undefined
                        })
                      }
                    >
                      <option value="">Select a template</option>
                      {(r.templateId || r.template) &&
                      !slaTemplateOptions(meta).some(
                        (t) => (r.templateId && t.id === r.templateId) || t.name === r.template
                      ) ? (
                        <option value={r.templateId || r.template}>{r.template || r.templateId}</option>
                      ) : null}
                      {slaTemplateOptions(meta).map((tmpl) => (
                        <option key={tmpl.id || tmpl.name} value={tmpl.id || tmpl.name}>
                          {tmpl.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="text-center">
                    <Toggle
                      checked={Boolean(r.enabled)}
                      disabled={ro}
                      label={`Reminder ${r.seq} enabled`}
                      onChange={(v) =>
                        setRow(r.id, (x) => {
                          x.enabled = v
                        })
                      }
                    />
                  </td>
                  {!ro ? (
                    <td className="reminder-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove reminder ${r.seq}`}
                        onClick={() =>
                          update((p) => {
                            p.reminders = p.reminders
                              .filter((x) => x.id !== r.id)
                              .map((x, i) => ({ ...x, seq: i + 1 }))
                          })
                        }
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!ro ? (
        <Button
          variant="secondary"
          size="sm"
          className="sla-btn-outline-green reminder-add-btn"
          onClick={() =>
            update((p) => {
              const seq = p.reminders.length + 1
              const last = p.reminders[p.reminders.length - 1]
              p.reminders.push({
                id: `rem-${Date.now()}`,
                seq,
                after: {
                  value: last ? last.after.value * 2 : 24,
                  unit: last?.after?.unit ?? 'HOURS'
                },
                repeat: false,
                recipient:
                  last?.recipient ??
                  (p.owner && (meta.recipients || []).some((r) => r.code === p.owner)
                    ? p.owner
                    : 'AP_TEAM'),
                channels: ['EMAIL'],
                template: slaTemplateOptions(meta).find((t) => t.scenario === 'sla.reminder')?.name
                  || slaTemplateOptions(meta)[0]?.name
                  || '',
                templateId: slaTemplateOptions(meta).find((t) => t.scenario === 'sla.reminder')?.id
                  || slaTemplateOptions(meta)[0]?.id
                  || undefined,
                enabled: true
              })
            })
          }
        >
          <Plus size={13} /> Add reminder level
        </Button>
      ) : null}
      <p className="reminder-footer-note">
        Notification wording lives in the Notification configuration — templates are selected here, never
        edited, so text can change without a deployment.
      </p>
    </div>
  )
}

function EscalationTab({ draft, update, editable, meta }) {
  const ro = !editable
  const e = draft.escalation || {}
  const finalReminder = [...(draft.reminders || [])]
    .filter((r) => r.enabled)
    .sort((a, b) => a.seq - b.seq)
    .pop()
  const summary = [
    e.breachCondition === 'AFTER_FINAL_REMINDER'
      ? {
          condition: finalReminder
            ? `No action after reminder ${finalReminder.seq} (${durationLabel(finalReminder.after)})`
            : 'No action after the final reminder',
          action: 'Auto-escalate',
          target: label(meta.escalationTargets, e.primaryTarget)
        }
      : e.breachCondition === 'AFTER_FIRST_UNANSWERED_REMINDER' ||
          e.breachCondition === 'AFTER_FIRST_UNANSWERED'
        ? {
            condition: 'No response after the first reminder',
            action: 'Escalate',
            target: label(meta.escalationTargets, e.primaryTarget)
          }
        : {
            condition: 'Due time exceeded',
            action: 'Escalate',
            target: label(meta.escalationTargets, e.primaryTarget)
          },
    ...(e.fallbackTarget && e.fallbackTarget !== 'OFF'
      ? [
          {
            condition: 'No further level exists',
            action: 'Escalate',
            target: label(meta.escalationTargets, e.fallbackTarget)
          }
        ]
      : []),
    ...(e.createAuditEvent
      ? [{ condition: 'All escalations', action: 'Audit event', target: 'Invoice audit trail' }]
      : [])
  ]
  return (
    <div className="space-y-4">
      <p className="mb-0 text-xs text-ink-muted">
        Defines what happens after SLA breach / final reminder. Escalation changes assignment and notification
        only — it is never an automatic business approval. Every escalation is recorded against the SLA instance
        and the invoice audit trail.
      </p>
      <ProposedNote tone="info" className="mb-0">
        Approval escalates to the next approval level after the final reminder, and to the AP Manager (AP
        Supervisor persona) when no higher level exists. Missing-document chase escalates to the Head of
        Function after the first unanswered reminder.
      </ProposedNote>
      <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
        <div>
          <p className="mb-0 text-xs font-semibold text-ink">Escalation enabled</p>
          <p className="mb-0 text-2xs text-ink-muted">
            Off for stage targets that only measure turnaround (e.g. Payment); on for approval and
            vendor-response policies.
          </p>
        </div>
        <Toggle
          checked={Boolean(e.enabled)}
          disabled={ro}
          label="Escalation enabled"
          onChange={(v) =>
            update((p) => {
              p.escalation.enabled = v
            })
          }
        />
      </div>
      <div className={clsx('grid gap-4 md:grid-cols-2', !e.enabled && 'opacity-60')}>
        <Field label="Breach Condition" required>
          <Select
            value={e.breachCondition}
            disabled={ro || !e.enabled}
            className="dx-select w-full"
            onChange={(ev) =>
              update((p) => {
                p.escalation.breachCondition = ev.target.value
              })
            }
          >
            {(meta.breachConditions || []).map((b) => (
              <option key={b.code} value={b.code}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primary Escalation" required>
          <Select
            value={e.primaryTarget}
            disabled={ro || !e.enabled}
            className="dx-select w-full"
            onChange={(ev) =>
              update((p) => {
                p.escalation.primaryTarget = ev.target.value
              })
            }
          >
            {(meta.escalationTargets || [])
              .filter((t) => t.code !== 'OFF')
              .map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
          </Select>
        </Field>
        <Field
          label="Fallback if No Next Level"
          required
          hint="Used when the primary target cannot be resolved, e.g. no higher approval level exists."
        >
          <Select
            value={e.fallbackTarget}
            disabled={ro || !e.enabled}
            className="dx-select w-full"
            onChange={(ev) =>
              update((p) => {
                p.escalation.fallbackTarget = ev.target.value
              })
            }
          >
            {(meta.escalationTargets || []).map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Channels" required>
          <span className="block pt-2">
            <ChannelPicker
              value={e.channels || []}
              disabled={ro || !e.enabled}
              meta={meta}
              onChange={(v) =>
                update((p) => {
                  p.escalation.channels = v
                })
              }
            />
          </span>
        </Field>
        <Field
          label="Notification template"
          hint="Wording comes from Email Templates. Recipients stay on this SLA rule."
        >
          <Select
            value={e.templateId || e.template || ''}
            disabled={ro || !e.enabled}
            className="dx-select w-full"
            onChange={(ev) =>
              update((p) => {
                const opts = slaTemplateOptions(meta)
                const opt = opts.find((t) => t.id === ev.target.value || t.name === ev.target.value)
                p.escalation.template = opt?.name || ev.target.value
                p.escalation.templateId = opt?.id || undefined
              })
            }
          >
            <option value="">Select a template</option>
            {(e.templateId || e.template) &&
            !slaTemplateOptions(meta).some(
              (t) => (e.templateId && t.id === e.templateId) || t.name === e.template
            ) ? (
              <option value={e.templateId || e.template}>{e.template || e.templateId}</option>
            ) : null}
            {slaTemplateOptions(meta).map((tmpl) => (
              <option key={tmpl.id || tmpl.name} value={tmpl.id || tmpl.name}>
                {tmpl.name}
              </option>
            ))}
          </Select>
        </Field>
        <ToggleRow
          label="Create Audit Event"
          hint="Record every escalation in the Audit Log, correlated with the invoice."
          checked={Boolean(e.createAuditEvent)}
          disabled={ro || !e.enabled}
          onChange={(v) =>
            update((p) => {
              p.escalation.createAuditEvent = v
            })
          }
        />
        <ToggleRow
          label="Create SLA Breach Flag"
          hint="Mark the invoice / step as SLA Breached on the workbench and dashboard."
          checked={Boolean(e.createBreachFlag)}
          disabled={ro || !e.enabled}
          onChange={(v) =>
            update((p) => {
              p.escalation.createBreachFlag = v
            })
          }
        />
      </div>
      {e.enabled ? (
        <div className="email-templates-table sla-rules-table overflow-hidden rounded-lg border border-line">
          <div className="dx-table-wrap">
            <table className="dx-table">
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i}>
                    <td>{s.condition}</td>
                    <td>{s.action}</td>
                    <td className="font-medium">{s.target}</td>
                    <td>
                      {s.action === 'Audit event'
                        ? 'In-platform'
                        : (e.channels || []).map((c) => label(meta.channels, c)).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PauseTab({ draft, update, editable, meta }) {
  const ro = !editable
  const rows = mergePauseRules(draft.pauseRules).pauseRules
  const setRule = (code, patch) =>
    update((p) => {
      p.pauseRules = mergePauseRules(p.pauseRules).pauseRules
      const x = p.pauseRules.find((y) => y.code === code)
      if (x) Object.assign(x, patch)
    })
  return (
    <div className="space-y-4">
      <p className="mb-0 text-xs text-ink-muted">
        Optional stop-clock configuration for periods where the owning team cannot progress because the invoice
        is waiting on an external dependency.
      </p>
      <div className="email-templates-table sla-rules-table overflow-hidden rounded-lg border border-line">
        <div className="dx-table-wrap">
          <table className="dx-table">
            <thead>
              <tr>
                <th>Pause Condition</th>
                <th className="sla-col-center">Pause?</th>
                <th>Resume Event</th>
                <th className="sla-col-center">Reason Required?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>
                    <span className="font-medium">{r.label}</span>
                    <span className="block font-mono text-2xs text-ink-muted">{r.code}</span>
                  </td>
                  <td className="sla-col-center">
                    <input
                      type="checkbox"
                      checked={Boolean(r.pause)}
                      disabled={ro}
                      aria-label={`Pause on ${r.label}`}
                      onChange={(e) => setRule(r.code, { pause: e.target.checked })}
                    />
                  </td>
                  <td className="font-mono text-2xs">{r.resumeEvent}</td>
                  <td className="sla-col-center">
                    <input
                      type="checkbox"
                      checked={Boolean(r.reasonRequired)}
                      disabled={ro || !r.pause}
                      aria-label={`Reason required for ${r.label}`}
                      onChange={(e) => setRule(r.code, { reasonRequired: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleRow
          label="Manual Pause (permissioned)"
          hint="If allowed, a manual pause requires a reason and is fully audited."
          checked={Boolean(draft.manualPauseAllowed)}
          disabled={ro}
          onChange={(v) =>
            update((p) => {
              p.manualPauseAllowed = v
            })
          }
        />
        <Field
          label="Maximum Pause"
          hint="Optional guardrail — a paused clock resumes automatically after this long."
        >
          <span className="flex gap-2">
            <Input
              type="number"
              min={0}
              value={draft.maxPause?.value ?? ''}
              placeholder="No limit"
              disabled={ro}
              className="w-full"
              onChange={(e) =>
                update((p) => {
                  p.maxPause =
                    e.target.value === ''
                      ? null
                      : {
                          value: Math.max(0, Number(e.target.value)),
                          unit: p.maxPause?.unit ?? 'CALENDAR_DAYS'
                        }
                })
              }
            />
            <Select
              value={draft.maxPause?.unit ?? 'CALENDAR_DAYS'}
              disabled={ro || !draft.maxPause}
              className="dx-select w-48"
              onChange={(e) =>
                update((p) => {
                  if (p.maxPause) p.maxPause.unit = e.target.value
                })
              }
            >
              {(meta.units || []).map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </Select>
          </span>
        </Field>
      </div>
      <p className="mb-0 text-2xs text-ink-muted">
        Runtime effect (if confirmed): on pause EAPA records the timestamp and reason and stops the paused
        period from counting; on resume the due time is recalculated and the full pause / resume history is kept
        on the SLA instance.
      </p>
    </div>
  )
}

function TestTab({
  draft,
  simulation,
  simStart,
  setSimStart,
  pauseFrom,
  setPauseFrom,
  pauseTo,
  setPauseTo,
  dirty,
  editable,
  onRun,
  running,
  onPreview
}) {
  return (
    <div className="sla-policy-test">
      <p className="mb-0 text-xs text-ink-muted">
        Verify expected due dates, reminders and escalation before publishing. Simulation is read-only: it
        creates no operational SLA instance, sends no notification and changes no invoice.
      </p>
      <div className="sla-sim-form sla-policy-test-form">
        <Field label="Policy" className="sla-sim-field sla-sim-field--policy">
          <Input
            value={draft.version ? `${draft.code} · v${draft.version}` : draft.code}
            disabled
            readOnly
            className="w-full"
          />
        </Field>
        <Field label="Start Date/Time" required className="sla-sim-field sla-sim-field--start">
          <Input
            type="datetime-local"
            value={simStart}
            className="w-full"
            onChange={(e) => setSimStart(e.target.value)}
          />
        </Field>
        <Field label="Pause from" className="sla-sim-field sla-sim-field--start">
          <Input
            type="datetime-local"
            value={pauseFrom}
            className="w-full"
            onChange={(e) => setPauseFrom(e.target.value)}
          />
        </Field>
        <Field label="Pause to" className="sla-sim-field sla-sim-field--start">
          <Input
            type="datetime-local"
            value={pauseTo}
            className="w-full"
            onChange={(e) => setPauseTo(e.target.value)}
          />
        </Field>
        <Button type="button" variant="secondary" className="sla-btn-outline" onClick={onPreview}>
          Preview timeline
        </Button>
        {editable ? (
          <Button
            type="button"
            disabled={dirty || running}
            title={dirty ? 'Save first' : 'Run the test and mark this policy as tested'}
            onClick={onRun}
          >
            <FlaskConical size={14} /> {running ? 'Running…' : 'Run Test'}
          </Button>
        ) : null}
      </div>
      {draft.lastTestedAt ? (
        <p className="mb-0 text-2xs text-ink-muted">
          Last tested {slaDateTime(draft.lastTestedAt)}. Any edit clears the test.
        </p>
      ) : null}
      {simulation ? (
        <SimulationTable result={simulation} />
      ) : (
        <div className="sla-sim-preview-empty">Run a preview to see the calculated timeline.</div>
      )}
    </div>
  )
}

function SimulationTable({ result }) {
  return (
    <div className="email-templates-table sla-rules-table sla-sim-preview-table mt-1 overflow-hidden rounded-lg border border-line">
      <div className="dx-table-wrap">
        <table className="dx-table">
          <thead>
            <tr>
              <th>Calculated Event</th>
              <th>Result</th>
              <th>Detail</th>
              <th>Recipient</th>
              <th>Channels</th>
              <th>Template</th>
              <th>Template ID</th>
            </tr>
          </thead>
          <tbody>
            {(result.rows || []).map((row, i) => (
              <tr key={`${row.event}-${i}`}>
                <td className="font-medium">{row.event}</td>
                <td className="whitespace-nowrap">
                  {row.at ? slaDateTime(row.at) : <span className="text-ink-muted">{row.detail || '—'}</span>}
                </td>
                <td>{row.at ? row.detail : row.event === 'Target Duration' ? '' : row.detail}</td>
                <td>{row.recipient || '—'}</td>
                <td>{Array.isArray(row.channels) && row.channels.length ? row.channels.join(', ') : '—'}</td>
                <td>{row.template || '—'}</td>
                <td className="font-mono text-2xs">{row.templateId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-0 border-t border-line-soft px-3 py-2 text-2xs text-ink-muted">
        Calculated for {result.policy?.code || 'this policy'}
        {result.policy?.version ? ` v${result.policy.version}` : ''}
        {result.calendarName ? ` on ${result.calendarName}` : ''}, from {slaDateTime(result.startAt)}. Times are
        shown in your local timezone.
      </p>
    </div>
  )
}

export default function SlaPolicyEditor() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: rawId } = useParams()
  const id = rawId ? decodeURIComponent(rawId) : undefined
  const [searchParams, setSearchParams] = useSearchParams()
  const isCreate = !id
  const { data: meta, isLoading: metaLoading } = useSlaMeta()
  const { data, isLoading } = useSlaPolicies()
  const policies = data?.policies
  const calendars = data?.calendars

  const [draft, setDraft] = useState(null)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [simulation, setSimulation] = useState(null)
  const [simStart, setSimStart] = useState(() => toLocalInput(new Date().toISOString()))
  const [pauseFrom, setPauseFrom] = useState('')
  const [pauseTo, setPauseTo] = useState('')
  const [publishing, setPublishing] = useState(null)
  const [retiring, setRetiring] = useState(false)
  const [retireReason, setRetireReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [cloneCode, setCloneCode] = useState('')
  const [saveProblems, setSaveProblems] = useState([])

  const visibleTabs = EDITOR_TABS.filter((t) => (isCreate ? t.value !== 'test' : true)).map((t) =>
    t.value === 'reminders' && draft?.reminders?.length
      ? { ...t, badge: draft.reminders.length }
      : t
  )
  const tabParam = searchParams.get('tab')
  const tab = visibleTabs.some((t) => t.value === tabParam) ? tabParam : 'general'
  const setTab = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'general') next.delete('tab')
    else next.set('tab', value)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    setDraft(null)
    setMissing(false)
    setDirty(false)
    setSimulation(null)
    setPublishing(null)
    setRetiring(false)
    setRetireReason('')
    setDeleting(false)
    setCloning(false)
    setCloneCode('')
    setSaveProblems([])
    setPauseFrom('')
    setPauseTo('')
  }, [id])

  useEffect(() => {
    if (draft) return
    if (isCreate) {
      if (metaLoading || isLoading) return
      setDraft(hydratePolicy(null, calendars))
      return
    }
    if (isLoading) return
    const row = (policies || []).find((p) => p.id === id)
    if (!row) {
      setMissing(true)
      return
    }
    setDraft(hydratePolicy(row, calendars))
  }, [draft, isCreate, isLoading, metaLoading, policies, calendars, id])

  const update = (fn) => {
    setDraft((prev) => {
      const next = cloneDraft(prev)
      if (!next.timer) next.timer = {}
      if (!next.escalation) next.escalation = {}
      if (!Array.isArray(next.reminders)) next.reminders = []
      if (!Array.isArray(next.pauseRules)) next.pauseRules = []
      fn(next)
      if (next.status === 'TEST') {
        next.status = 'DRAFT'
        next.lastTestedAt = undefined
      }
      return next
    })
    setDirty(true)
    setSimulation(null)
    setSaveProblems([])
  }

  const backTo = slaTo(SLA_MANAGEMENT)
  const goBack = () => navigate(backTo)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sla-policies'] })

  const validate = () => {
    if (!draft.code?.trim()) return { tab: 'general', message: 'SLA code is required.' }
    if (!draft.name?.trim()) return { tab: 'general', message: 'SLA name is required.' }
    if (draft.scopeType === 'INVOICE_CATEGORY' && !draft.activity) {
      return { tab: 'general', message: 'Select a category / activity.' }
    }
    if (!draft.effectiveFrom) return { tab: 'general', message: 'Effective from is required.' }
    if (draft.effectiveTo && draft.effectiveFrom && draft.effectiveTo < draft.effectiveFrom) {
      return { tab: 'general', message: 'Effective to cannot be before effective from.' }
    }
    const business = draft.timer?.unit === 'BUSINESS_DAYS' || draft.timer?.unit === 'BUSINESS_HOURS'
    if (business && !draft.timer?.calendarId) {
      return { tab: 'timer', message: 'Select a business calendar.' }
    }
    return null
  }

  const save = async () => {
    const error = validate()
    if (error) {
      setTab(error.tab)
      showEssaErrorToast('Could not save', error.message)
      return
    }
    setSaving(true)
    setSaveProblems([])
    try {
      if (isCreate) {
        const created = await createSlaPolicy({
          ...draft,
          effectiveTo: draft.effectiveTo || undefined,
          pauseRules: mergePauseRules(draft.pauseRules).pauseRules
        })
        showEssaSuccessToast('Saved', `${draft.code} saved.`)
        await invalidate()
        navigate(slaEditTo(created.id, 'timer'), { replace: true })
        return
      }
      const saved = await updateSlaPolicy(id, {
        name: draft.name,
        scopeType: draft.scopeType,
        activity: draft.activity || undefined,
        stage: draft.stage,
        triggerEvent: draft.triggerEvent,
        owner: draft.owner,
        description: draft.description,
        provisional: draft.provisional,
        provisionalNote: draft.provisionalNote,
        effectiveFrom: draft.effectiveFrom,
        effectiveTo: draft.effectiveTo || undefined,
        timer: draft.timer,
        reminders: draft.reminders,
        escalation: draft.escalation,
        pauseRules: mergePauseRules(draft.pauseRules).pauseRules,
        manualPauseAllowed: draft.manualPauseAllowed,
        maxPause: draft.maxPause
      })
      showEssaSuccessToast('Saved', `${draft.code} saved.`)
      await invalidate()
      setDraft(hydratePolicy(saved, calendars))
      setDirty(false)
    } catch (e) {
      setSaveProblems(e.problems || [])
      showEssaErrorToast('Could not save', e.message)
    } finally {
      setSaving(false)
    }
  }

  const simPausePayload = () => {
    const from = pauseFrom ? new Date(pauseFrom).toISOString() : undefined
    const to = pauseTo ? new Date(pauseTo).toISOString() : undefined
    return from && to ? { pauseFrom: from, pauseTo: to } : {}
  }

  const runTest = async () => {
    if (!draft?.id || dirty) return
    setTesting(true)
    setSaveProblems([])
    try {
      const result = await markSlaPolicyTested(draft.id, {
        startAt: new Date(simStart).toISOString(),
        calendarId: draft.timer?.calendarId,
        ...simPausePayload()
      })
      const policy = result.policy || result
      setSimulation({
        policy,
        startAt: new Date(simStart).toISOString(),
        rows: result.simulation?.rows || result.rows || [],
        calendarName: result.simulation?.calendarName ?? result.calendarName ?? null
      })
      setDraft(hydratePolicy(policy, calendars))
      setDirty(false)
      showEssaSuccessToast(
        'Test completed',
        'The timeline below was calculated from this policy. It can now be published.'
      )
      await invalidate()
      setTab('test')
    } catch (e) {
      setSaveProblems(e.problems || [])
      showEssaErrorToast('Test failed', e.message)
    } finally {
      setTesting(false)
    }
  }

  const previewTimeline = async () => {
    if (!draft?.id) return
    try {
      const result = await simulateSla({
        policyId: draft.id,
        startAt: new Date(simStart).toISOString(),
        calendarId: draft.timer?.calendarId,
        ...simPausePayload()
      })
      setSimulation(result)
    } catch (e) {
      setSaveProblems(e.problems || [])
      showEssaErrorToast('Simulation failed', e.message)
    }
  }

  const publish = async () => {
    if (!draft?.id || !publishing) return
    setSaving(true)
    setSaveProblems([])
    try {
      const saved = await publishSlaPolicy(draft.id, publishing)
      showEssaSuccessToast(`${draft.code} published`, 'Running SLA clocks were recalculated.')
      setPublishing(null)
      await invalidate()
      setDraft(hydratePolicy(saved, calendars))
      setDirty(false)
    } catch (e) {
      setSaveProblems(e.problems || [])
      showEssaErrorToast('Could not publish', e.message)
    } finally {
      setSaving(false)
    }
  }

  const retire = async () => {
    if (!draft?.id) return
    setSaving(true)
    try {
      const saved = await retireSlaPolicy(draft.id, { reason: retireReason })
      showEssaSuccessToast(
        'Policy retired',
        'No new SLA instances will be created; existing clocks keep their history.'
      )
      setRetiring(false)
      setRetireReason('')
      await invalidate()
      setDraft(hydratePolicy(saved, calendars))
      setDirty(false)
    } catch (e) {
      showEssaErrorToast('Could not retire', e.message)
    } finally {
      setSaving(false)
    }
  }

  const discard = async () => {
    if (!draft?.id) return
    setSaving(true)
    try {
      await deleteSlaPolicy(draft.id)
      showEssaSuccessToast('Draft discarded')
      await invalidate()
      navigate(backTo)
    } catch (e) {
      setSaveProblems(e.problems || [])
      showEssaErrorToast('Could not discard', e.message)
    } finally {
      setSaving(false)
    }
  }

  const createVersion = async () => {
    if (!draft?.id) return
    setSaving(true)
    try {
      const created = await newSlaPolicyVersion(draft.id)
      showEssaSuccessToast('New version created', `${created.code} v${created.version} is a draft.`)
      await invalidate()
      navigate(slaEditTo(created.id), { replace: true })
    } catch (e) {
      showEssaErrorToast('Could not create version', e.message)
    } finally {
      setSaving(false)
    }
  }

  const clonePolicy = async () => {
    const code = cloneCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    if (!draft?.id || !code) return
    setSaving(true)
    try {
      const created = await cloneSlaPolicy(draft.id, { code })
      showEssaSuccessToast('Policy cloned', `${created.code} created as a draft.`)
      setCloning(false)
      setCloneCode('')
      await invalidate()
      navigate(slaEditTo(created.id))
    } catch (e) {
      showEssaErrorToast('Could not clone', e.message)
    } finally {
      setSaving(false)
    }
  }

  const loading = !draft && !missing
  const readyMeta = meta || {}
  const editable = Boolean(draft) && (draft.status === 'DRAFT' || draft.status === 'TEST' || isCreate)
  const readOnlyReason =
    draft?.status === 'ACTIVE'
      ? 'This policy is active and read-only. Create a new version to change it.'
      : draft?.status === 'RETIRED'
        ? 'This policy is retired.'
        : null
  const title = isCreate ? (
    'Create SLA Policy'
  ) : (
    <span className="sla-editor-heading">
      {draft?.code || 'SLA Policy'}
      {draft?.version ? <span className="text-sm font-normal text-ink-muted">v{draft.version}</span> : null}
      {draft?.status ? <PolicyStatusBadge status={draft.status} /> : null}
      {draft?.provisional ? (
        <Tooltip text={draft.provisionalNote || 'Value to be confirmed by ESSA'}>
          <Badge tone="warning" dot={false}>
            Provisional
          </Badge>
        </Tooltip>
      ) : null}
    </span>
  )
  const description = isCreate
    ? 'Define where the SLA applies, what starts it and who owns it, then configure the timer, reminders and escalation. Save as Draft, test, then publish.'
    : draft?.name || ''

  const tabBody =
    !draft ? null : tab === 'timer' ? (
      <TimerTab draft={draft} update={update} editable={editable} meta={readyMeta} calendars={calendars || []} />
    ) : tab === 'reminders' ? (
      <RemindersTab draft={draft} update={update} editable={editable} meta={readyMeta} />
    ) : tab === 'escalation' ? (
      <EscalationTab draft={draft} update={update} editable={editable} meta={readyMeta} />
    ) : tab === 'pause' ? (
      <PauseTab draft={draft} update={update} editable={editable} meta={readyMeta} />
    ) : tab === 'test' && !isCreate ? (
      <TestTab
        draft={draft}
        simulation={simulation}
        simStart={simStart}
        setSimStart={setSimStart}
        pauseFrom={pauseFrom}
        setPauseFrom={setPauseFrom}
        pauseTo={pauseTo}
        setPauseTo={setPauseTo}
        dirty={dirty}
        editable={editable}
        onRun={runTest}
        running={testing}
        onPreview={previewTimeline}
      />
    ) : (
      <GeneralTab draft={draft} update={update} editable={editable} meta={readyMeta} codeLocked={!isCreate} />
    )

  return (
    <SlaLayout
      active="policies"
      className="sla-policy-editor-page"
      showSectionNav={false}
      title={title}
      description={description}
      breadcrumb={adminCrumbs(
        { label: 'SLA Management', to: slaTo(SLA_MANAGEMENT) },
        { label: isCreate ? 'Create SLA' : draft?.code || 'SLA Policy' }
      )}
      actions={
        <>
          <Button variant="ghost" type="button" onClick={goBack}>
            <ArrowLeft size={14} /> Back
          </Button>
          {editable ? (
            <Button
              type="button"
              variant="secondary"
              onClick={save}
              disabled={saving || loading || missing || !draft || (!dirty && !isCreate)}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
          {editable && !isCreate ? (
            <Button
              type="button"
              variant="secondary"
              className="sla-btn-outline-green"
              disabled={dirty || testing || loading}
              title={dirty ? 'Save first' : 'Run the simulation and mark this policy as tested'}
              onClick={runTest}
            >
              <FlaskConical size={14} /> {testing ? 'Testing…' : 'Test'}
            </Button>
          ) : null}
          {!isCreate && (draft?.status === 'DRAFT' || draft?.status === 'TEST') ? (
            <Button
              type="button"
              disabled={dirty || draft.status !== 'TEST' || saving}
              title={
                draft.status !== 'TEST' ? 'Run Test before publishing' : dirty ? 'Save first' : 'Publish this policy'
              }
              onClick={() =>
                setPublishing({
                  effectiveFrom: draft.effectiveFrom,
                  effectiveTo: draft.effectiveTo || '',
                  changeSummary: draft.changeSummary ?? ''
                })
              }
            >
              <Send size={14} /> Publish
            </Button>
          ) : null}
          {!isCreate && draft?.status === 'ACTIVE' ? (
            <Button type="button" variant="secondary" disabled={saving} onClick={createVersion}>
              <GitBranch size={14} /> New version
            </Button>
          ) : null}
          {!isCreate && (draft?.status === 'ACTIVE' || draft?.status === 'RETIRED') ? (
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setCloneCode(`${draft.code}_COPY`)
                setCloning(true)
              }}
            >
              <Copy size={14} /> Clone
            </Button>
          ) : null}
          {!isCreate && draft?.status === 'ACTIVE' ? (
            <Button
              type="button"
              variant="outline"
              className="sla-btn-warning"
              disabled={saving}
              onClick={() => setRetiring(true)}
            >
              <XCircle size={14} /> Retire
            </Button>
          ) : null}
          {!isCreate && editable && (draft?.status === 'DRAFT' || draft?.status === 'TEST') ? (
            <Button
              type="button"
              variant="ghost"
              title="Discard this draft"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={14} />
            </Button>
          ) : null}
        </>
      }
    >
      {readOnlyReason ? <ProposedNote tone="info">{readOnlyReason}</ProposedNote> : null}
      {saveProblems.length > 0 ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <ul className="mb-0 list-disc space-y-0.5 pl-4 text-xs text-red-700">
            {saveProblems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missing ? (
        <Card>
          <p className="mb-3 text-sm text-ink-secondary">This SLA policy could not be found.</p>
          <Button type="button" onClick={goBack}>
            Return to SLA Management
          </Button>
        </Card>
      ) : (
        <Card pad={false} className="sla-editor-card overflow-hidden">
          <Tabs className="sla-editor-tabs px-4" tabs={visibleTabs} value={tab} onChange={setTab} />
          <div className="sla-editor-body p-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              tabBody
            )}
          </div>
        </Card>
      )}
      <Dialog
        open={Boolean(publishing)}
        onClose={() => setPublishing(null)}
        title={`Publish ${draft?.code || 'SLA'}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishing(null)}>
              Cancel
            </Button>
            <Button onClick={publish} disabled={saving}>
              {saving ? 'Publishing…' : 'Publish'}
            </Button>
          </>
        }
      >
        {publishing ? (
          <div className="space-y-3 text-sm">
            <p className="mb-0 text-xs text-ink-secondary">
              Publishing puts this policy in force from the effective date. Running SLA clocks are recalculated
              against the new rules.
            </p>
            <Field label="Effective From" required>
              <Input
                type="date"
                value={publishing.effectiveFrom}
                className="w-44"
                onChange={(e) => setPublishing((p) => p && { ...p, effectiveFrom: e.target.value })}
              />
            </Field>
            <Field label="Effective To" hint="Optional">
              <Input
                type="date"
                value={publishing.effectiveTo || ''}
                className="w-44"
                onChange={(e) => setPublishing((p) => p && { ...p, effectiveTo: e.target.value })}
              />
            </Field>
            <Field label="Change Summary" hint="Shown in the audit log">
              <Textarea
                rows={2}
                value={publishing.changeSummary}
                onChange={(e) => setPublishing((p) => p && { ...p, changeSummary: e.target.value })}
              />
            </Field>
            <p className="mb-0 text-2xs text-ink-muted">
              Published by you, {slaDate(new Date().toISOString())}. Recorded in the Audit Log.
            </p>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        open={retiring}
        onClose={() => setRetiring(false)}
        title={`Retire ${draft?.code || 'SLA'}?`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRetiring(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={retire} disabled={saving || !retireReason.trim()}>
              Retire policy
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-ink-secondary">
          No new SLA instances will be created from this policy. Existing runtime clocks keep their history.
        </p>
        <Field label="Reason for retiring" required>
          <Textarea
            rows={2}
            value={retireReason}
            onChange={(e) => setRetireReason(e.target.value)}
          />
        </Field>
      </Dialog>
      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Discard this draft?"
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={discard} disabled={saving}>
              Discard draft
            </Button>
          </>
        }
      >
        <p className="mb-0 text-xs text-ink-secondary">Draft {draft?.code} is deleted.</p>
      </Dialog>
      <Dialog
        open={cloning}
        onClose={() => setCloning(false)}
        title={`Clone ${draft?.code || 'SLA'}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloning(false)}>
              Cancel
            </Button>
            <Button onClick={clonePolicy} disabled={saving || !cloneCode.trim()}>
              {saving ? 'Cloning…' : 'Clone'}
            </Button>
          </>
        }
      >
        <Field label="New SLA code" required hint="Must be unique. Uppercase letters, numbers and underscores.">
          <Input
            value={cloneCode}
            className="w-full font-mono uppercase"
            onChange={(e) => setCloneCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
          />
        </Field>
      </Dialog>
    </SlaLayout>
  )
}
