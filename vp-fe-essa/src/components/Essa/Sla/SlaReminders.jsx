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
  durationLabel,
  label,
  scopeLabel,
  slaEditTo,
  slaTemplateLabel,
  useEffectivePolicies,
  useSlaMeta
} from '../lib/sla'

export default function SlaReminders() {
  const { data: meta, isLoading: metaLoading } = useSlaMeta()
  const { effective, isLoading } = useEffectivePolicies()
  const [sortKey, setSortKey] = useState('code')
  const [sortDir, setSortDir] = useState('asc')

  const rows = useMemo(() => {
    const list = []
      ; (effective || []).forEach((p) => {
        ; (p.reminders || []).forEach((r) => {
          const afterHours =
            !r.after || r.after.value === 0
              ? 0
              : r.after.value * (String(r.after.unit).includes('HOUR') ? 1 : 24)
          list.push({
            ...r,
            policyId: p.id,
            policyCode: p.code,
            policyStatus: p.status,
            scope: scopeLabel(p, meta),
            trigger: !r.after || r.after.value === 0 ? 'Immediately' : durationLabel(r.after),
            triggerHours: afterHours,
            recipientLabel: label(meta?.recipients, r.recipient),
            channelLabel: (r.channels || []).map((c) => label(meta?.channels, c)).join(', ')
          })
        })
      })
    const dir = sortDir === 'asc' ? 1 : -1
    const valueOf = (row) => {
      if (sortKey === 'scope') return row.scope
      if (sortKey === 'seq') return String(row.seq).padStart(3, '0')
      if (sortKey === 'trigger') return String(row.triggerHours).padStart(6, '0')
      if (sortKey === 'recipient') return row.recipientLabel
      if (sortKey === 'enabled') return row.enabled ? 'Yes' : 'No'
      if (sortKey === 'status') return row.policyStatus
      if (sortKey === 'template') return row.template
      return row.policyCode
    }
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
      active="reminders"
      title="Reminder Rules"
      description="Every reminder the scheduler will send while an SLA is open, across all policies. Edit a rule from its policy's Reminder Rules tab."
    >
      <ProposedNote tone="info">
        Approval reminders at 24h, 48h, 3 days and 5 days; missing-document follow-up every 7 days. Intervals
        are configurable here without a code change.
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
                    <SortTh col="seq" sortKey={sortKey} onSort={toggleSort} className="sla-col-center">
                      #
                    </SortTh>
                    <SortTh col="trigger" sortKey={sortKey} onSort={toggleSort}>
                      Trigger After
                    </SortTh>
                    <SortTh col="recipient" sortKey={sortKey} onSort={toggleSort}>
                      Recipient
                    </SortTh>
                    <th>Channel</th>
                    <SortTh col="template" sortKey={sortKey} onSort={toggleSort}>
                      Template
                    </SortTh>
                    <SortTh col="enabled" sortKey={sortKey} onSort={toggleSort} className="sla-col-center">
                      Enabled
                    </SortTh>
                    <SortTh col="status" sortKey={sortKey} onSort={toggleSort} className="sla-col-center">
                      Policy Status
                    </SortTh>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState
                          title="No reminder rules"
                          description="Open a policy to add reminder steps."
                        />
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={`${row.policyId}-${row.id}`}>
                        <td>
                          <PolicyCodeLink
                            code={row.policyCode}
                            to={slaEditTo(row.policyId, 'reminders')}
                          />
                        </td>
                        <td>
                          <span className="text-xs">{row.scope}</span>
                        </td>
                        <td className="sla-col-center">
                          <span className="text-xs font-semibold">{row.seq}</span>
                        </td>
                        <td>
                          <span className="whitespace-nowrap text-xs">
                            {row.trigger}
                            {row.repeat ? (
                              <span className="ml-1 text-xs text-ink-muted">(repeats)</span>
                            ) : null}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs">{row.recipientLabel}</span>
                        </td>
                        <td>
                          <span className="text-xs">{row.channelLabel}</span>
                        </td>
                        <td>
                          <span className="text-xs text-ink-secondary">{slaTemplateLabel(row, meta)}</span>
                        </td>
                        <td className="sla-col-center">
                          <YesNoBadge value={row.enabled} />
                        </td>
                        <td className="sla-col-center">
                          <PolicyStatusBadge status={row.policyStatus} />
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
    </SlaLayout>
  )
}
