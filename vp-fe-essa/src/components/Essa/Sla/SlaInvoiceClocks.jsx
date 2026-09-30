import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pause, Play } from 'lucide-react'

import { pauseSlaInstance, resumeSlaInstance } from 'api/sla'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
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
    return instances.filter((row) => {
      if (invoiceNumber && (row.invoiceNumber === invoiceNumber || row.reference === invoiceNumber)) {
        return true
      }
      if (invoiceId && String(row.invoiceId || '') === invoiceId) return true
      return false
    })
  }, [instances, invoiceNumber, invoiceId])

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
  if (!rows.length) return null

  return (
    <>
      <Card className="mt-3 overflow-hidden p-0">
        <div className="border-b border-line-soft px-4 py-2.5">
          <p className="mb-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">SLA clocks</p>
        </div>
        <div className="email-templates-table">
          <div className="dx-table-wrap">
            <table className="dx-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Remaining</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="text-xs font-semibold">{row.policyCode}</span>
                      {row.policyVersion != null ? (
                        <span className="ml-1 text-2xs text-ink-muted">v{row.policyVersion}</span>
                      ) : null}
                    </td>
                    <td>
                      <RuntimeStatusBadge status={row.status} meta={meta} />
                    </td>
                    <td className="whitespace-nowrap text-xs">{slaDate(row.dueAt)}</td>
                    <td className={row.remainingMs < 0 ? 'font-semibold text-red-600' : ''}>
                      {remainingLabel(row.remainingMs)}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {PAUSABLE.includes(row.status) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                              const nextChoices = pauseChoices(policyOf(row), meta)
                              setPauseCode(nextChoices[0]?.code || 'ON_HOLD')
                              setPauseReason('')
                              setPausing(row)
                            }}
                          >
                            <Pause size={12} /> Pause
                          </Button>
                        ) : null}
                        {row.status === 'PAUSED' ? (
                          <Button size="sm" disabled={busy} onClick={() => resume(row)}>
                            <Play size={12} /> Resume
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

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
