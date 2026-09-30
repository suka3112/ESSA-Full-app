import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Play } from 'lucide-react'

import SlaLayout from './SlaLayout'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Skeleton } from '../ui/Skeleton'
import {
  PolicyStatusBadge,
  ProposedNote,
  label,
  scopeLabel,
  slaDate,
  slaEditTo,
  targetLabel,
  useSlaMeta,
  useSlaPolicies
} from '../lib/sla'
import { simulateSla } from 'api/sla'
import { showEssaErrorToast } from '../lib/essaToast'

function localNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatStamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${slaDate(iso)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

function Field({ label: fieldLabel, required, className, children }) {
  return (
    <div className={`sla-sim-field ${className || ''}`}>
      <span>
        {fieldLabel}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </div>
  )
}

function SimulationTable({ result }) {
  return (
    <div className="email-templates-table sla-rules-table">
      <div className="dx-table-wrap">
        <table className="dx-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>At</th>
              <th>Detail</th>
              <th>Recipient</th>
              <th>Channels</th>
              <th>Template</th>
              <th>Template ID</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={`${row.event}-${i}`}>
                <td>{row.event}</td>
                <td>{formatStamp(row.at)}</td>
                <td>{row.detail}</td>
                <td>{row.recipient || '—'}</td>
                <td>{Array.isArray(row.channels) && row.channels.length ? row.channels.join(', ') : '—'}</td>
                <td>{row.template || '—'}</td>
                <td className="font-mono text-2xs">{row.templateId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SlaSimulation() {
  const { data: meta, isLoading: metaLoading } = useSlaMeta()
  const { data, isLoading } = useSlaPolicies()
  const [policyId, setPolicyId] = useState('')
  const [startAt, setStartAt] = useState(localNow)
  const [pauseFrom, setPauseFrom] = useState('')
  const [pauseTo, setPauseTo] = useState('')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const sorted = useMemo(
    () =>
      [...(data?.policies ?? [])].sort((a, b) => a.code.localeCompare(b.code) || b.version - a.version),
    [data?.policies]
  )
  const policy = sorted.find((p) => p.id === policyId) ?? sorted.find((p) => p.status === 'ACTIVE') ?? sorted[0]
  const calendar = (data?.calendars || []).find((c) => c.id === policy?.timer?.calendarId)

  const run = async (e) => {
    e?.preventDefault()
    if (!policy) return
    setRunning(true)
    try {
      const payload = {
        policyId: policy.id,
        startAt: new Date(startAt).toISOString(),
        calendarId: policy.timer?.calendarId
      }
      if (pauseFrom && pauseTo) {
        payload.pauseFrom = new Date(pauseFrom).toISOString()
        payload.pauseTo = new Date(pauseTo).toISOString()
      }
      const next = await simulateSla(payload)
      setResult(next)
    } catch (err) {
      showEssaErrorToast('Simulation failed', err.message)
    } finally {
      setRunning(false)
    }
  }

  const loading = isLoading || metaLoading

  return (
    <SlaLayout
      active="simulation"
      title="SLA Policy Test / Simulation"
      description="Verify expected due dates, reminders and escalation before publishing. Simulation is read-only: no operational SLA instance, notification or invoice change."
    >
      <ProposedNote tone="info">
        Simulation is proposed design. It is strongly recommended because SLA calculations become difficult to
        validate once business calendars, holidays, reminders and pause logic are combined.
      </ProposedNote>

      <Card title="Simulation input">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        ) : !policy ? (
          <p className="mb-0 py-8 text-center text-sm text-ink-muted">
            No SLA policies to simulate. Create and save a policy first.
          </p>
        ) : (
          <>
            <form className="sla-sim-form" onSubmit={run}>
              <Field label="Policy" required className="sla-sim-field--policy">
                <Select
                  className="dx-select w-full"
                  value={policy.id}
                  onChange={(e) => {
                    setPolicyId(e.target.value)
                    setResult(null)
                  }}
                >
                  {sorted.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · v{p.version} ({p.status.toLowerCase()})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start Date/Time" required className="sla-sim-field--start">
                <Input
                  type="datetime-local"
                  className="w-full"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </Field>
              <Field label="Sample Category" className="sla-sim-field--category">
                <Input value={scopeLabel(policy, meta)} disabled readOnly className="w-full" />
              </Field>
              <Field label="Calendar" className="sla-sim-field--calendar">
                <Input
                  value={calendar ? calendar.name : 'Calendar time (24 hours)'}
                  disabled
                  readOnly
                  className="w-full"
                />
              </Field>
              <Field label="Pause from" className="sla-sim-field--start">
                <Input
                  type="datetime-local"
                  className="w-full"
                  value={pauseFrom}
                  onChange={(e) => setPauseFrom(e.target.value)}
                />
              </Field>
              <Field label="Pause to" className="sla-sim-field--start">
                <Input
                  type="datetime-local"
                  className="w-full"
                  value={pauseTo}
                  onChange={(e) => setPauseTo(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={running}>
                <Play size={14} /> {running ? 'Running…' : 'Run calculation'}
              </Button>
            </form>
            <dl className="sla-sim-meta">
              <div>
                <strong>Version:</strong> {policy.version ? `v${policy.version}` : '—'}
              </div>
              <div>
                <strong>Status:</strong> <PolicyStatusBadge status={policy.status} />
              </div>
              <div>
                <strong>Stage:</strong> {label(meta?.stages, policy.stage)}
              </div>
              <div>
                <strong>Target:</strong> {targetLabel(policy)}
              </div>
              <div>
                <strong>Reminders:</strong> {(policy.reminders || []).filter((r) => r.enabled).length}
                {' · '}
                <strong>Escalation:</strong>{' '}
                {policy.escalation?.enabled
                  ? label(meta?.escalationTargets, policy.escalation.primaryTarget)
                  : 'off'}
                {' · '}
                <NavLink to={slaEditTo(policy.id)} className="sla-sim-open">
                  Open policy
                </NavLink>
              </div>
            </dl>
          </>
        )}
      </Card>

      {result ? (
        <Card title="Calculated timeline" pad={false} className="mt-3">
          <SimulationTable result={result} />
        </Card>
      ) : null}
    </SlaLayout>
  )
}
