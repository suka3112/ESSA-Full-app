import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Pause, Play } from 'lucide-react'

import { pauseSlaInstance, resumeSlaInstance } from 'api/sla'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import {
  RuntimeStatusBadge,
  remainingLabel,
  slaDate,
  useSlaInstances,
  useSlaMeta,
  useSlaPolicies
} from '../lib/sla'
import { showEssaErrorToast, showEssaSuccessToast } from '../lib/essaToast'

const PAUSABLE = ['PENDING', 'RUNNING', 'WARNING']

const SEVERITY = ['BREACHED', 'WARNING', 'RUNNING', 'PAUSED', 'PENDING', 'COMPLETED', 'CANCELLED']

function identityKeys(invoice) {
  const values = [invoice?.id, invoice?.documentId, invoice?.ocrId, invoice?.ocr_id]
    .filter((value) => value != null && String(value).trim() !== '')
    .map((value) => String(value))
  const keys = new Set(values)
  values.forEach((value) => {
    const match = value.match(/(\d+)$/)
    if (match && match[1] !== value) keys.add(match[1])
  })
  return keys
}

function clockBelongsToInvoice(row, invoiceNumber, keys) {
  const idMatch = [row.invoiceId, row.objectId].some((value) => value != null && keys.has(String(value)))
  if (!idMatch) return false
  if (!invoiceNumber) return true
  return row.invoiceNumber === invoiceNumber || row.reference === invoiceNumber || !row.invoiceNumber
}

function collapseClocks(rows) {
  const grouped = new Map()
  rows.forEach((row) => {
    const dueDay = String(row.dueAt || '').slice(0, 10)
    const key = [row.policyCode, row.policyVersion, row.status, dueDay].join('|')
    const current = grouped.get(key)
    if (!current) {
      grouped.set(key, { row, count: 1 })
      return
    }
    current.count += 1
  })
  return [...grouped.values()].sort((a, b) => {
    const ai = SEVERITY.indexOf(String(a.row.status || '').toUpperCase())
    const bi = SEVERITY.indexOf(String(b.row.status || '').toUpperCase())
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
  })
}

function pauseChoices(policy, meta) {
  const rules = (policy?.pauseRules || []).filter((r) => r.pause)
  const fromPolicy = rules.map((r) => ({
    code: r.code,
    label: r.label || r.code,
    resumeEvent: r.resumeEvent,
    reasonRequired: Boolean(r.reasonRequired)
  }))
  if (policy?.manualPauseAllowed) {
    fromPolicy.push({
      code: 'ON_HOLD',
      label: 'Manual hold',
      resumeEvent: 'RESUME',
      reasonRequired: true
    })
  }
  if (fromPolicy.length) return fromPolicy
  const fromMeta = (meta?.pauseConditions || []).map((c) => ({
    code: c.code,
    label: c.label,
    resumeEvent: c.resumeEvent,
    reasonRequired: false
  }))
  if (policy?.manualPauseAllowed !== false) {
    fromMeta.push({
      code: 'ON_HOLD',
      label: 'Manual hold',
      resumeEvent: 'RESUME',
      reasonRequired: true
    })
  }
  return fromMeta
}

function SlaClockLine({ clock, meta, busy, onPause, onResume, trailing = null }) {
  const row = clock.row
  const over = row.remainingMs < 0
  return (
    <div className="dx-sla-strip-line">
      <span className="dx-sla-strip-kicker">SLA</span>
      <RuntimeStatusBadge status={row.status} meta={meta} />
      <span className="dx-sla-strip-policy" title={row.policyCode}>
        {row.policyCode}
        {row.policyVersion != null ? <span className="dx-sla-strip-version"> v{row.policyVersion}</span> : null}
      </span>
      {clock.count > 1 ? <span className="dx-sla-strip-count">{clock.count} clocks</span> : null}
      <span className="dx-sla-strip-meta">Due {slaDate(row.dueAt)}</span>
      <span className={`dx-sla-strip-remain${over ? ' is-over' : ''}`}>{remainingLabel(row.remainingMs)}</span>
      <span className="dx-sla-strip-actions">
        {PAUSABLE.includes(row.status) ? (
          <Button size="sm" variant="secondary" className="dx-id-btn" disabled={busy} onClick={onPause}>
            <Pause size={12} /> Pause
          </Button>
        ) : null}
        {row.status === 'PAUSED' ? (
          <Button size="sm" disabled={busy} onClick={onResume}>
            <Play size={12} /> Resume
          </Button>
        ) : null}
        {trailing}
      </span>
    </div>
  )
}

function resumeEventFor(instance, policy, meta) {
  const lastPause = [...(instance.events || [])]
    .reverse()
    .find((e) => String(e.type || '').toUpperCase() === 'PAUSED')
  const code = lastPause?.detail
  const match = pauseChoices(policy, meta).find((c) => c.code === code)
  return match?.resumeEvent || 'RESUME'
}

export default function SlaInvoiceClocks({ invoice }) {
  const queryClient = useQueryClient()
  const invoiceNumber = invoice?.invoice_no || invoice?.invoiceNumber || invoice?.invoiceNo || ''
  const invoiceId = invoice?.id != null ? String(invoice.id) : ''
  const { data: meta } = useSlaMeta()
  const { data: policyData } = useSlaPolicies()
  const { data: instances = [] } = useSlaInstances(
    {
      q: invoiceNumber || invoiceId || undefined,
      includeClosed: true
    },
    { enabled: Boolean(invoiceNumber || invoiceId) }
  )

  const rows = useMemo(() => {
    const keys = identityKeys(invoice)
    const owned = keys.size
      ? instances.filter((row) => clockBelongsToInvoice(row, invoiceNumber, keys))
      : []
    if (owned.length) return owned
    return instances.filter((row) => {
      if (invoiceNumber && (row.invoiceNumber === invoiceNumber || row.reference === invoiceNumber)) {
        return true
      }
      if (invoiceId && String(row.invoiceId || '') === invoiceId) return true
      return false
    })
  }, [instances, invoice, invoiceNumber, invoiceId])
  const clocks = useMemo(() => collapseClocks(rows), [rows])

  const [open, setOpen] = useState(false)
  const [pausing, setPausing] = useState(null)
  const [pauseCode, setPauseCode] = useState('')
  const [pauseReason, setPauseReason] = useState('')
  const [busy, setBusy] = useState(false)

  const policyOf = (row) => (policyData?.policies || []).find((p) => p.id === row.policyId)
  const choices = pausing ? pauseChoices(policyOf(pausing), meta) : []
  const selectedChoice = choices.find((c) => c.code === pauseCode) || choices[0]
  const reasonRequired = Boolean(selectedChoice?.reasonRequired)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sla-instances'] })
    queryClient.invalidateQueries({ queryKey: ['sla-instances-summary'] })
  }

  const submitPause = async () => {
    if (!pausing) return
    const code = selectedChoice?.code || 'ON_HOLD'
    if (reasonRequired && !pauseReason.trim()) return
    setBusy(true)
    try {
      await pauseSlaInstance(pausing.id, { code, reason: pauseReason.trim() || undefined })
      showEssaSuccessToast('SLA paused', pausing.policyCode)
      setPausing(null)
      setPauseReason('')
      await invalidate()
    } catch (e) {
      showEssaErrorToast('Could not pause SLA', e.message)
    } finally {
      setBusy(false)
    }
  }

  const resume = async (row) => {
    setBusy(true)
    try {
      await resumeSlaInstance(row.id, {
        event: resumeEventFor(row, policyOf(row), meta)
      })
      showEssaSuccessToast('SLA resumed', row.policyCode)
      await invalidate()
    } catch (e) {
      showEssaErrorToast('Could not resume SLA', e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!invoiceNumber && !invoiceId) return null
  if (!clocks.length) return null

  const lead = clocks[0]
  const rest = clocks.slice(1)

  return (
    <>
      <section className="dx-sla-strip" aria-label="SLA clocks">
        <SlaClockLine
          clock={lead}
          meta={meta}
          busy={busy}
          onPause={() => {
            const nextChoices = pauseChoices(policyOf(lead.row), meta)
            setPauseCode(nextChoices[0]?.code || 'ON_HOLD')
            setPauseReason('')
            setPausing(lead.row)
          }}
          onResume={() => resume(lead.row)}
          trailing={
            rest.length > 0 ? (
              <button
                type="button"
                className={`dx-sla-strip-more${open ? ' is-open' : ''}`}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? 'Hide' : `${rest.length} more`}
                <ChevronDown size={14} />
              </button>
            ) : null
          }
        />
        {open && rest.length > 0 ? (
          <div className="dx-sla-strip-list">
            {rest.map((clock) => (
              <SlaClockLine
                key={`${clock.row.policyCode}-${clock.row.status}-${clock.row.dueAt}`}
                clock={clock}
                meta={meta}
                busy={busy}
                onPause={() => {
                  const nextChoices = pauseChoices(policyOf(clock.row), meta)
                  setPauseCode(nextChoices[0]?.code || 'ON_HOLD')
                  setPauseReason('')
                  setPausing(clock.row)
                }}
                onResume={() => resume(clock.row)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <Dialog
        open={Boolean(pausing)}
        onClose={() => setPausing(null)}
        title={`Pause ${pausing?.policyCode || 'SLA'}`}
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPausing(null)}>
              Cancel
            </Button>
            <Button onClick={submitPause} disabled={busy || (reasonRequired && !pauseReason.trim())}>
              {busy ? 'Pausing…' : 'Pause clock'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-secondary">Pause condition</span>
            <Select
              className="dx-select w-full"
              value={pauseCode}
              onChange={(e) => setPauseCode(e.target.value)}
            >
              {choices.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-secondary">
              Reason
              {reasonRequired ? <span className="text-red-600"> *</span> : null}
            </span>
            <Textarea rows={2} value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} />
          </label>
        </div>
      </Dialog>
    </>
  )
}
