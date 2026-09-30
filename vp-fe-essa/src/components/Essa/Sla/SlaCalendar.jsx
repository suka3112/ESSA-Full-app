import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Send, Trash2, XCircle } from 'lucide-react'
import clsx from 'clsx'

import SlaLayout from './SlaLayout'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Skeleton } from '../ui/Skeleton'
import {
  PolicyStatusBadge,
  ProposedNote,
  YesNoBadge,
  slaDate,
  useSlaMeta,
  useSlaPolicies
} from '../lib/sla'
import {
  createBusinessCalendar,
  publishBusinessCalendar,
  retireBusinessCalendar,
  saveBusinessCalendar
} from 'api/sla'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'

const WEEK_DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 7, label: 'Sun' }
]

const HOLIDAY_TYPES = [
  { code: 'PUBLIC_HOLIDAY', label: 'Public Holiday' },
  { code: 'COMPANY_HOLIDAY', label: 'Company Holiday' },
  { code: 'WORKING_DAY_EXCEPTION', label: 'Working Day (exception)' }
]

function unwrapCalendar(body) {
  return body?.calendar || body
}

function normalizeTime(value) {
  if (!value) return ''
  const match = String(value).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return String(value)
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`
}

function normalizeDate(value) {
  if (!value) return ''
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : String(value).trim()
}

function hydrateException(row = {}) {
  const type = String(row.type || 'PUBLIC_HOLIDAY').toUpperCase()
  return {
    ...row,
    date: normalizeDate(row.date),
    name: row.name || '',
    type,
    working: type === 'WORKING_DAY_EXCEPTION'
  }
}

function hydrateCalendar(row) {
  if (!row) return row
  const clone = JSON.parse(JSON.stringify(row))
  clone.name = clone.name || ''
  clone.timezone = clone.timezone || ''
  clone.workingDays = (Array.isArray(clone.workingDays) ? clone.workingDays : [1, 2, 3, 4, 5]).map(Number)
  clone.exceptions = (Array.isArray(clone.exceptions) ? clone.exceptions : []).map(hydrateException)
  clone.workStart = normalizeTime(clone.workStart)
  clone.workEnd = normalizeTime(clone.workEnd)
  clone.effectiveFrom = normalizeDate(clone.effectiveFrom)
  return clone
}

function mergeCalendar(current, incoming) {
  if (!incoming) return hydrateCalendar(current || {})
  const merged = { ...(current || {}), ...incoming }
  if (!Array.isArray(incoming.exceptions)) merged.exceptions = current?.exceptions
  if (!Array.isArray(incoming.workingDays) || !incoming.workingDays.length) {
    merged.workingDays = current?.workingDays
  }
  return hydrateCalendar(merged)
}

function editableSnapshot(c) {
  if (!c) return ''
  const h = hydrateCalendar(c)
  return JSON.stringify({
    name: (h.name || '').trim(),
    timezone: (h.timezone || '').trim(),
    workingDays: [...(h.workingDays || [])].sort((a, b) => a - b),
    workStart: h.workStart,
    workEnd: h.workEnd,
    effectiveFrom: h.effectiveFrom,
    exceptions: [...(h.exceptions || [])]
      .map((e) => ({
        date: e.date,
        name: (e.name || '').trim(),
        type: e.type,
        working: Boolean(e.working)
      }))
      .sort((a, b) => `${a.date}\0${a.name}`.localeCompare(`${b.date}\0${b.name}`))
  })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${slaDate(iso)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

function Field({ label, required, hint, className, children }) {
  return (
    <div className={clsx('sla-cal-field', className)}>
      <span>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-2xs font-normal text-ink-muted">{hint}</span> : null}
    </div>
  )
}

function ExceptionRow({ row, editable, onChange, onRemove }) {
  const typeLabel = HOLIDAY_TYPES.find((t) => t.code === row.type)?.label || row.type
  return (
    <tr>
      <td className="whitespace-nowrap">
        {editable ? (
          <Input
            type="date"
            value={row.date}
            className="w-36"
            aria-label="Holiday date"
            onChange={(e) => onChange((x) => { x.date = normalizeDate(e.target.value) })}
          />
        ) : (
          slaDate(row.date)
        )}
      </td>
      <td>
        {editable ? (
          <Input
            value={row.name}
            className="w-full"
            maxLength={80}
            placeholder="Name"
            aria-label="Holiday name"
            onChange={(e) => onChange((x) => { x.name = e.target.value })}
          />
        ) : (
          row.name || '—'
        )}
      </td>
      <td>
        {editable ? (
          <Select
            className="dx-select"
            value={row.type}
            aria-label="Exception type"
            onChange={(e) =>
              onChange((x) => {
                x.type = e.target.value
                x.working = e.target.value === 'WORKING_DAY_EXCEPTION'
              })
            }
          >
            {HOLIDAY_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </Select>
        ) : (
          typeLabel
        )}
      </td>
      <td className="sla-col-center">
        <YesNoBadge value={row.working} />
      </td>
      {editable ? (
        <td className="text-right">
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${row.name || row.date}`}
            className="text-red-600"
            onClick={onRemove}
          >
            <Trash2 size={13} />
          </Button>
        </td>
      ) : null}
    </tr>
  )
}

export default function SlaCalendar() {
  const queryClient = useQueryClient()
  const { data: meta, isLoading: metaLoading } = useSlaMeta()
  const { data, isLoading } = useSlaPolicies()
  const calendars = data?.calendars ?? []
  const [selectedId, setSelectedId] = useState(null)
  const selected = useMemo(
    () =>
      calendars.find((c) => c.id === selectedId) ??
      calendars.find((c) => c.status === 'ACTIVE') ??
      calendars[0],
    [calendars, selectedId]
  )
  const [draft, setDraft] = useState(null)
  const baselineRef = useRef('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(null)
  const [creatingBusy, setCreatingBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [retiring, setRetiring] = useState(false)
  const [retireBusy, setRetireBusy] = useState(false)

  const applyClean = (calendar) => {
    if (!calendar) {
      baselineRef.current = ''
      setDraft(null)
      setDirty(false)
      return
    }
    const hydrated = hydrateCalendar(calendar)
    baselineRef.current = editableSnapshot(hydrated)
    setDraft(hydrated)
    setDirty(false)
  }

  useEffect(() => {
    applyClean(selected || null)
  }, [selected?.id, selected?.status, selected?.version, selected?.changedAt])

  useEffect(() => {
    if (!draft) {
      setDirty(false)
      return
    }
    setDirty(editableSnapshot(draft) !== baselineRef.current)
  }, [draft])

  const usedBy = useMemo(
    () => (data?.policies ?? []).filter((p) => p.status === 'ACTIVE' && p.timer?.calendarId === selected?.id),
    [data?.policies, selected]
  )

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] }),
      queryClient.invalidateQueries({ queryKey: ['sla-instances'] })
    ])

  const editable = Boolean(draft && draft.status !== 'RETIRED')
  const exceptions = [...(draft?.exceptions || [])].sort((a, b) =>
    (a.date || '9999').localeCompare(b.date || '9999')
  )
  const timezones = meta?.timezones || ['Asia/Jakarta', 'Asia/Singapore', 'UTC']
  const busy = saving || creatingBusy || publishing || retireBusy

  const update = (fn) => {
    setDraft((c) => {
      if (!c) return c
      const next = hydrateCalendar(c)
      fn(next)
      return hydrateCalendar(next)
    })
  }

  const save = async () => {
    if (!draft) return
    if (!draft.name?.trim()) {
      showEssaErrorToast('Could not save', 'Calendar name is required.')
      return
    }
    if (!draft.workingDays?.length) {
      showEssaErrorToast('Could not save', 'Select at least one working day.')
      return
    }
    if (!draft.workStart || !draft.workEnd) {
      showEssaErrorToast('Could not save', 'Working hours are required.')
      return
    }
    if (!draft.effectiveFrom) {
      showEssaErrorToast('Could not save', 'Effective from is required.')
      return
    }
    setSaving(true)
    try {
      const saved = unwrapCalendar(await saveBusinessCalendar(draft))
      applyClean(mergeCalendar(draft, saved))
      await invalidate()
      showEssaSuccessToast(
        'Calendar saved',
        saved.status === 'ACTIVE'
          ? `Now v${saved.version}. Running business-day SLA clocks were recalculated.`
          : 'Draft calendar saved.'
      )
    } catch (e) {
      showEssaErrorToast('Could not save', e.message)
    } finally {
      setSaving(false)
    }
  }

  const createDraft = async () => {
    if (!creating?.code || !creating?.name) return
    setCreatingBusy(true)
    try {
      const created = unwrapCalendar(
        await createBusinessCalendar({
          code: creating.code,
          name: creating.name,
          timezone: timezones[0]
        })
      )
      await invalidate()
      setCreating(null)
      setSelectedId(created.id)
      showEssaSuccessToast(
        'Calendar created',
        'Saved as Draft. Publish it to make it selectable by policies at runtime.'
      )
    } catch (e) {
      showEssaErrorToast('Could not create', e.message)
    } finally {
      setCreatingBusy(false)
    }
  }

  const publish = async () => {
    if (!draft) return
    setPublishing(true)
    try {
      const published = unwrapCalendar(await publishBusinessCalendar(draft.id))
      applyClean(mergeCalendar(draft, published || { ...draft, status: 'ACTIVE' }))
      await invalidate()
      showEssaSuccessToast('Calendar published')
    } catch (e) {
      showEssaErrorToast('Could not publish', e.message)
    } finally {
      setPublishing(false)
    }
  }

  const retire = async () => {
    if (!draft) return
    if (usedBy.length) {
      showEssaErrorToast(
        'Could not retire',
        'Retiring is refused while an active policy still uses this calendar. Point those policies at another calendar first.'
      )
      return
    }
    setRetireBusy(true)
    try {
      await retireBusinessCalendar(draft.id)
      await invalidate()
      setRetiring(false)
      showEssaSuccessToast('Calendar retired', draft.name)
    } catch (e) {
      showEssaErrorToast('Could not retire', e.message)
    } finally {
      setRetireBusy(false)
    }
  }

  const loading = isLoading || metaLoading

  return (
    <SlaLayout
      active="calendar"
      title="Business Calendar"
      description="Maintains working days, hours and holidays used by Business Day / Business Hour SLA policies. Associate policies with a calendar rather than embedding calendar logic in each policy."
      actions={
        <>
          {calendars.length > 1 ? (
            <Select
              className="dx-select w-56"
              value={draft?.id || selected?.id || ''}
              aria-label="Select calendar"
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status.toLowerCase()})
                </option>
              ))}
            </Select>
          ) : null}
          <Button
            variant="outline"
            className="sla-btn-outline-green"
            onClick={() => setCreating({ code: '', name: '' })}
          >
            <Plus size={14} /> New calendar
          </Button>
          {editable ? (
            <Button
              type="button"
              onClick={save}
              disabled={!dirty || busy}
              title={dirty ? 'Save changes' : 'No unsaved changes'}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
          {draft?.status === 'DRAFT' ? (
            <Button
              variant="outline"
              className="sla-btn-outline-green"
              disabled={dirty || busy}
              title={dirty ? 'Save first' : 'Publish this calendar'}
              onClick={publish}
            >
              <Send size={14} /> {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          ) : null}
          {draft?.status === 'ACTIVE' ? (
            <Button variant="outline" className="sla-btn-warning" disabled={busy} onClick={() => setRetiring(true)}>
              <XCircle size={14} /> Retire
            </Button>
          ) : null}
        </>
      }
    >
      <ProposedNote>
        <span className="font-semibold">
          PROPOSED — technical design required only if ESSA confirms SLA is calculated using working days or working
          hours.
        </span>{' '}
        Calendar changes affect new calculations from their effective date; existing runtime instances keep their
        calculated history unless a controlled recalculation is explicitly required.
      </ProposedNote>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !draft ? (
        <Card>
          <p className="mb-0 py-10 text-center text-sm text-ink-muted">
            No business calendar yet. Create one to use working days and hours on SLA timers.
          </p>
        </Card>
      ) : (
        <div className="sla-cal-grid">
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                Calendar <PolicyStatusBadge status={draft.status} />
                <span className="text-2xs font-normal text-ink-muted">v{draft.version}</span>
              </span>
            }
          >
            <div className="space-y-3">
              <Field label="Calendar Code" required>
                <Input value={draft.code} disabled readOnly className="w-full font-mono" />
              </Field>
              <Field label="Calendar Name" required>
                <Input
                  value={draft.name}
                  disabled={!editable}
                  maxLength={80}
                  className="w-full"
                  onChange={(e) => update((c) => { c.name = e.target.value })}
                />
              </Field>
              <Field label="Timezone" required>
                <Select
                  className="dx-select w-full"
                  value={draft.timezone}
                  disabled={!editable}
                  onChange={(e) => update((c) => { c.timezone = e.target.value })}
                >
                  {timezones.map((z) => (
                    <option key={z} value={z}>
                      {z === 'Asia/Jakarta' ? 'Asia/Jakarta (WIB)' : z}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Working Days" required>
                <span className="sla-cal-days">
                  {WEEK_DAYS.map((d) => {
                    const on = draft.workingDays.includes(d.n)
                    return (
                      <button
                        key={d.n}
                        type="button"
                        disabled={!editable}
                        aria-pressed={on}
                        onClick={() =>
                          update((c) => {
                            c.workingDays = on
                              ? c.workingDays.filter((x) => x !== d.n)
                              : [...c.workingDays, d.n].sort()
                          })
                        }
                        className={clsx('sla-cal-day', on && 'is-on')}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </span>
              </Field>
              <Field label="Working Hours" required>
                <span className="sla-cal-hours">
                  <Input
                    type="time"
                    value={draft.workStart}
                    disabled={!editable}
                    onChange={(e) => update((c) => { c.workStart = normalizeTime(e.target.value) })}
                  />
                  <span className="text-xs text-ink-muted">to</span>
                  <Input
                    type="time"
                    value={draft.workEnd}
                    disabled={!editable}
                    onChange={(e) => update((c) => { c.workEnd = normalizeTime(e.target.value) })}
                  />
                </span>
              </Field>
              <Field label="Effective From" required>
                <Input
                  type="date"
                  value={draft.effectiveFrom}
                  disabled={!editable}
                  className="w-full"
                  onChange={(e) => update((c) => { c.effectiveFrom = e.target.value })}
                />
              </Field>
              <dl className="sla-cal-audit">
                <div>
                  Last changed by {draft.changedBy}, {fmtDateTime(draft.changedAt)}
                </div>
                <div className="mt-1" title={usedBy.map((p) => p.code).join(', ')}>
                  Used by {usedBy.length} active polic{usedBy.length === 1 ? 'y' : 'ies'}
                  {usedBy.length
                    ? ` — ${usedBy
                      .slice(0, 4)
                      .map((p) => p.code)
                      .join(', ')}${usedBy.length > 4 ? ` and ${usedBy.length - 4} more` : ''}`
                    : ''}
                  .
                </div>
              </dl>
            </div>
          </Card>

          <Card
            title="Holidays & exceptions"
            pad={false}
            className="min-w-0"
            actions={
              editable ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="sla-btn-outline-green"
                  onClick={() =>
                    update((c) => {
                      c.exceptions.push({
                        id: `hol-${Date.now()}`,
                        date: '',
                        name: '',
                        type: 'PUBLIC_HOLIDAY',
                        working: false
                      })
                    })
                  }
                >
                  <Plus size={13} /> Add date
                </Button>
              ) : null
            }
          >
            <div className="email-templates-table sla-cal-holidays">
              <div className="dx-table-wrap">
                <table className="dx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Holiday / Exception</th>
                      <th>Type</th>
                      <th className="sla-col-center">Working?</th>
                      {editable ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.length === 0 ? (
                      <tr>
                        <td colSpan={editable ? 5 : 4} className="text-center text-ink-muted">
                          No non-working dates configured — only weekends are skipped.
                        </td>
                      </tr>
                    ) : (
                      exceptions.map((row) => (
                        <ExceptionRow
                          key={row.id}
                          row={row}
                          editable={editable}
                          onChange={(fn) =>
                            update((c) => {
                              const x = c.exceptions.find((y) => y.id === row.id)
                              if (x) fn(x)
                            })
                          }
                          onRemove={() =>
                            update((c) => {
                              c.exceptions = c.exceptions.filter((y) => y.id !== row.id)
                            })
                          }
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mb-0 border-t border-line-soft px-3 py-2 text-2xs text-ink-muted">
              A <span className="font-medium">Working Day (exception)</span> makes a weekend date count as working
              time. Dates are in the calendar's timezone.
            </p>
          </Card>
        </div>
      )}

      <Dialog
        open={Boolean(creating)}
        onClose={() => !creatingBusy && setCreating(null)}
        title="New business calendar"
        width={480}
        footer={
          <>
            <Button variant="ghost" disabled={creatingBusy} onClick={() => setCreating(null)}>
              Cancel
            </Button>
            <Button disabled={!creating?.code || !creating?.name || creatingBusy} onClick={createDraft}>
              {creatingBusy ? 'Creating…' : 'Create draft'}
            </Button>
          </>
        }
      >
        {creating ? (
          <div className="space-y-3">
            <Field label="Calendar Code" required hint="Upper-case letters, digits and underscores.">
              <Input
                value={creating.code}
                className="w-full font-mono"
                maxLength={50}
                onChange={(e) =>
                  setCreating((c) =>
                    c && { ...c, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }
                  )
                }
              />
            </Field>
            <Field label="Calendar Name" required>
              <Input
                value={creating.name}
                className="w-full"
                maxLength={80}
                onChange={(e) => setCreating((c) => c && { ...c, name: e.target.value })}
              />
            </Field>
            <p className="mb-0 text-2xs text-ink-muted">
              Starts as Mon–Fri, 08:00–17:00, {timezones[0]}. Adjust and publish.
            </p>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={retiring}
        onClose={() => !retireBusy && setRetiring(false)}
        title={`Retire ${draft?.name || ''}?`}
        width={480}
        footer={
          <>
            <Button variant="ghost" disabled={retireBusy} onClick={() => setRetiring(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={retireBusy} onClick={retire}>
              {retireBusy ? 'Retiring…' : 'Retire calendar'}
            </Button>
          </>
        }
      >
        <p className="mb-0 text-xs text-ink-secondary">
          Retiring is refused while an active policy still uses this calendar. Point those policies at another
          calendar first.
        </p>
      </Dialog>
    </SlaLayout>
  )
}
