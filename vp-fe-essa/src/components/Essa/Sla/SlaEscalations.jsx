import { useMemo, useState } from 'react'

import SlaLayout from './SlaLayout'
import { Card } from '../ui/Card'
import { SortTh } from '../ui/listPage'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'
import {
  PolicyCodeLink,
  PolicyStatusBadge,
  ProposedNote,
  YesNoBadge,
  label,
  scopeLabel,
  slaEditTo,
  slaTemplateLabel,
  useEffectivePolicies,
  useSlaMeta
} from '../lib/sla'

export default function SlaEscalations() {
  const { data: meta, isLoading: metaLoading } = useSlaMeta()
  const { effective, isLoading } = useEffectivePolicies()
  const [sortKey, setSortKey] = useState('code')
  const [sortDir, setSortDir] = useState('asc')

  const rows = useMemo(() => {
    const list = (effective || [])
      .filter(
        (p) => p.escalation?.enabled || (p.scopeType !== 'INVOICE_CATEGORY' && p.stage !== 'PAYMENT')
      )
      .map((p) => ({
        id: p.id,
        code: p.code,
        status: p.status,
        enabled: Boolean(p.escalation?.enabled),
        scope: scopeLabel(p, meta),
        condition: p.escalation?.enabled
          ? label(meta?.breachConditions, p.escalation.breachCondition)
          : '',
        primary: p.escalation?.enabled ? label(meta?.escalationTargets, p.escalation.primaryTarget) : '—',
        fallback: p.escalation?.enabled ? label(meta?.escalationTargets, p.escalation.fallbackTarget) : '—',
        channels: p.escalation?.enabled
          ? (p.escalation.channels || []).map((c) => label(meta?.channels, c)).join(', ') || '—'
          : '—',
        template: p.escalation?.enabled ? slaTemplateLabel(p.escalation, meta) : '—',
        audit: p.escalation?.createAuditEvent,
        breach: p.escalation?.createBreachFlag
      }))
    const dir = sortDir === 'asc' ? 1 : -1
    const valueOf = (row) => row[sortKey] || row.code
    return list.sort((a, b) => String(valueOf(a)).localeCompare(String(valueOf(b))) * dir)
  }, [effective, meta, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <SlaLayout
      active="escalations"
      title="Escalation Rules"
      description="What EAPA does when an SLA threshold is breached or a reminder sequence is exhausted. Edit a rule from its policy's Escalation Rules tab."
    >
      <ProposedNote tone="info">
        Approval escalates to the next approval level after the final reminder, and to the AP Supervisor when no
        higher level exists; missing-document chase escalates to the Head of Function after the first unanswered
        reminder. Escalation is never an automatic approval.
      </ProposedNote>
      <Card className="overflow-hidden p-0">
        {isLoading || metaLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="email-templates-table sla-rules-table">
            <div className="dx-table-wrap dx-table-wrap-scroll">
              <table className="dx-table">
                <thead>
                  <tr>
                    <SortTh col="code" sortKey={sortKey} onSort={toggleSort}>
                      SLA Policy
                    </SortTh>
                    <SortTh col="scope" sortKey={sortKey} onSort={toggleSort}>
                      Scope
                    </SortTh>
                    <th>Breach Condition</th>
                    <SortTh col="primary" sortKey={sortKey} onSort={toggleSort}>
                      Primary Escalation
                    </SortTh>
                    <SortTh col="fallback" sortKey={sortKey} onSort={toggleSort}>
                      Fallback If No Next Level
                    </SortTh>
                    <th>Channels</th>
                    <th>Notification template</th>
                    <th className="sla-col-center">Audit Event</th>
                    <th className="sla-col-center">Breach Flag</th>
                    <SortTh col="status" sortKey={sortKey} onSort={toggleSort} className="sla-col-center">
                      Policy Status
                    </SortTh>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState title="No escalation rules" description="Open a policy to enable escalation." />
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <PolicyCodeLink
                            code={row.code}
                            to={slaEditTo(row.id, 'escalation')}
                          />
                        </td>
                        <td>
                          <span className="text-xs">{row.scope}</span>
                        </td>
                        <td>
                          <span className="text-xs">
                            {row.enabled ? (
                              row.condition
                            ) : (
                              <span className="text-ink-faint">Escalation off</span>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs font-medium">{row.primary}</span>
                        </td>
                        <td>
                          <span className="text-xs">{row.fallback}</span>
                        </td>
                        <td>
                          <span className="text-xs">{row.channels}</span>
                        </td>
                        <td>
                          <span className="text-xs text-ink-secondary">{row.template}</span>
                        </td>
                        <td className="sla-col-center">
                          <YesNoBadge value={row.audit} />
                        </td>
                        <td className="sla-col-center">
                          <YesNoBadge value={row.breach} />
                        </td>
                        <td className="sla-col-center">
                          <PolicyStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
      <p className="mt-2 mb-0 text-xs text-ink-muted">
        Stage-turnaround policies with escalation switched off (e.g. Payment) are not listed. Open any policy to
        enable it.
      </p>
    </SlaLayout>
  )
}
