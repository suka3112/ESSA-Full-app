const STORAGE_KEY = 'essa_email_templates_v2'

const SLA_SCENARIO_VARS = [
  { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-10021', required: true },
  { name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' },
  { name: 'policyCode', label: 'Policy code', sample: 'SLA_AP_VERIFY' },
  { name: 'policyName', label: 'Policy name', sample: 'AP Verification' },
  { name: 'stage', label: 'Stage', sample: 'INVOICE_CREATION' },
  { name: 'dueDate', label: 'Due date', sample: '2026-04-29T17:00:00.000Z' },
  { name: 'dueAt', label: 'Due at', sample: '2026-04-29T17:00:00.000Z' },
  { name: 'slaDueDate', label: 'SLA due date', sample: '2026-04-29' },
  { name: 'remainingTime', label: 'Remaining time', sample: '4h' },
  { name: 'owner', label: 'Owner', sample: 'AP Team' },
  { name: 'reminderSeq', label: 'Reminder sequence', sample: '1' },
  { name: 'escalationTarget', label: 'Escalation target', sample: 'AP Supervisor' }
]

const slaScenario = (key, label, description) => ({
  key,
  label,
  description,
  category: 'SLA',
  recipients: { to: '' },
  variables: SLA_SCENARIO_VARS,
  required: ['invoiceNumber']
})

export const isSlaScenario = (key) => String(key || '').startsWith('sla.')

export const EMAIL_SCENARIOS = [
  {
    key: 'invoice.received',
    label: 'Invoice received',
    description: 'Sent when a vendor invoice is uploaded and accepted into the workbench.',
    category: 'Invoice',
    recipients: { to: 'AP Processor' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' },
      { name: 'amount', label: 'Amount', sample: 'IDR 12,450,000' },
      { name: 'poNumber', label: 'PO number', sample: '4500123456' }
    ],
    required: ['invoiceNumber', 'vendorName']
  },
  {
    key: 'exception.created',
    label: 'Exception created',
    description: 'Sent when validation raises an exception that needs attention.',
    category: 'Exception',
    recipients: { to: 'Exception owner' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'exceptionCode', label: 'Exception code', sample: 'PO_MISMATCH' },
      { name: 'exceptionReason', label: 'Reason', sample: 'PO line amount differs from invoice' },
      { name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' }
    ],
    required: ['invoiceNumber', 'exceptionCode']
  },
  {
    key: 'approval.requested',
    label: 'Approval requested',
    description: 'Sent to the next approver when an invoice enters their queue.',
    category: 'Approval',
    recipients: { to: 'Current approver' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'approverName', label: 'Approver name', sample: 'Surya Nugraha' },
      { name: 'amount', label: 'Amount', sample: 'IDR 12,450,000' },
      { name: 'dueDate', label: 'Due date', sample: '15 Apr 2026' }
    ],
    required: ['invoiceNumber', 'approverName']
  },
  {
    key: 'invoice.approved',
    label: 'Invoice approved',
    description: 'Sent when an invoice is fully approved and ready to post.',
    category: 'Approval',
    recipients: { to: 'AP Processor' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' },
      { name: 'approverName', label: 'Approver name', sample: 'Surya Nugraha' }
    ],
    required: ['invoiceNumber']
  },
  {
    key: 'invoice.rejected',
    label: 'Invoice rejected',
    description: 'Sent when an invoice is rejected and returned for correction.',
    category: 'Approval',
    recipients: { to: 'Vendor contact' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' },
      { name: 'rejectReason', label: 'Rejection reason', sample: 'Supporting documents incomplete' }
    ],
    required: ['invoiceNumber', 'rejectReason']
  },
  slaScenario(
    'sla.reminder',
    'SLA reminder',
    'Sent when an SLA reminder is due. Recipients are resolved from the SLA rule at runtime.'
  ),
  slaScenario(
    'sla.warning',
    'SLA warning',
    'Sent when an SLA clock enters the warning window. Recipients are resolved from the SLA rule at runtime.'
  ),
  slaScenario(
    'sla.breached',
    'SLA breached',
    'Sent when an SLA target elapses before the stage completes. Recipients are resolved from the SLA rule at runtime.'
  ),
  slaScenario(
    'sla.escalated',
    'SLA escalated',
    'Sent when an SLA breach is escalated to the configured target. Recipients are resolved from the SLA rule at runtime.'
  ),
  slaScenario(
    'sla.missing_document',
    'SLA missing document',
    'Sent while chasing a vendor document request. Recipients are resolved from the SLA rule at runtime.'
  ),
  {
    key: 'invoice.parked',
    label: 'Invoice parked',
    description: 'Sent when an invoice is parked pending review.',
    category: 'Invoice',
    recipients: { to: 'AP Team' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' }
    ],
    required: ['invoiceNumber']
  },
  {
    key: 'invoice.posted',
    label: 'Invoice posted',
    description: 'Sent when an invoice is posted to the ERP.',
    category: 'Invoice',
    recipients: { to: 'AP Team' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'amount', label: 'Amount', sample: 'IDR 12,450,000' }
    ],
    required: ['invoiceNumber']
  },
  {
    key: 'invoice.returned',
    label: 'Invoice returned',
    description: 'Sent when an invoice is returned to AP for correction.',
    category: 'Invoice',
    recipients: { to: 'AP Processor' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'rejectReason', label: 'Reason', sample: 'Missing tax invoice' }
    ],
    required: ['invoiceNumber']
  },
  {
    key: 'approval.escalated',
    label: 'Approval escalated',
    description: 'Sent when an approval is escalated to a delegate.',
    category: 'Approval',
    recipients: { to: 'Delegate' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'approverName', label: 'Approver name', sample: 'Surya Nugraha' }
    ],
    required: ['invoiceNumber']
  },
  {
    key: 'exception.resolved',
    label: 'Exception resolved',
    description: 'Sent when an exception is cleared.',
    category: 'Exception',
    recipients: { to: 'AP Processor' },
    variables: [
      { name: 'invoiceNumber', label: 'Invoice number', sample: 'INV-2026-0142' },
      { name: 'exceptionCode', label: 'Exception code', sample: 'PO_MISMATCH' }
    ],
    required: ['invoiceNumber']
  },
  {
    key: 'vendor.created',
    label: 'Vendor created',
    description: 'Sent when a new vendor is onboarded.',
    category: 'Vendor',
    recipients: { to: 'Support' },
    variables: [{ name: 'vendorName', label: 'Vendor name', sample: 'PT Amanah Lestari Energy' }],
    required: ['vendorName']
  },
  {
    key: 'config.notice',
    label: 'Configuration notice',
    description: 'Sent when an administrator changes a platform configuration.',
    category: 'Admin',
    recipients: { to: 'Administrator' },
    variables: [{ name: 'changeSummary', label: 'Change summary', sample: 'SLA hours updated' }],
    required: ['changeSummary']
  }
]

const now = () => new Date().toISOString()
const SEED_AT = '2026-08-31T05:10:00Z'

const seedRow = (partial) => ({
  description: '',
  requiredPlaceholders: [],
  status: 'ACTIVE',
  system: true,
  version: 1,
  createdAt: SEED_AT,
  createdBy: 'System seed',
  updatedAt: SEED_AT,
  updatedBy: 'System seed',
  ...partial
})

const seedTemplates = () => [
  seedRow({
    id: 'tpl-invoice-received',
    name: 'Invoice received',
    scenario: 'invoice.received',
    subject: 'Invoice {{invoiceNumber}} received',
    bodyHtml:
      '<p>A new invoice <strong>{{invoiceNumber}}</strong> from {{vendorName}} ({{amount}}) has been received.</p>',
    recipients: { to: 'AP Team' },
    requiredPlaceholders: ['invoiceNumber', 'vendorName']
  }),
  seedRow({
    id: 'tpl-exception-created',
    name: 'Exception created',
    scenario: 'exception.created',
    subject: 'Exception {{exceptionCode}} on {{invoiceNumber}}',
    bodyHtml:
      '<p>Exception <strong>{{exceptionCode}}</strong> on invoice {{invoiceNumber}}: {{exceptionReason}}</p>',
    recipients: { to: 'Exception owner' },
    requiredPlaceholders: ['invoiceNumber', 'exceptionCode']
  }),
  seedRow({
    id: 'tpl-approval-requested',
    name: 'Approval requested',
    scenario: 'approval.requested',
    subject: 'Approval requested: {{invoiceNumber}}',
    bodyHtml:
      '<p>Hello {{approverName}}, invoice <strong>{{invoiceNumber}}</strong> for {{amount}} needs your approval.</p>',
    recipients: { to: 'Current approver' },
    requiredPlaceholders: ['invoiceNumber', 'approverName']
  }),
  seedRow({
    id: 'tpl-invoice-approved',
    name: 'Invoice approved',
    scenario: 'invoice.approved',
    subject: 'Approved: {{invoiceNumber}}',
    bodyHtml:
      '<p>Invoice <strong>{{invoiceNumber}}</strong> from {{vendorName}} has been approved.</p>',
    recipients: { to: 'AP Team' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-invoice-rejected',
    name: 'Invoice rejected',
    scenario: 'invoice.rejected',
    subject: 'Invoice {{invoiceNumber}} was rejected',
    bodyHtml:
      '<p>Invoice <strong>{{invoiceNumber}}</strong> was rejected. Reason: {{rejectReason}}</p>',
    recipients: { to: 'Vendor contact' },
    requiredPlaceholders: ['invoiceNumber', 'rejectReason']
  }),
  seedRow({
    id: 'tpl-sla-reminder',
    name: 'SLA reminder',
    scenario: 'sla.reminder',
    subject: 'SLA reminder: {{invoiceNumber}}',
    bodyHtml:
      '<p>{{ownerName}}, invoice <strong>{{invoiceNumber}}</strong> has {{slaHours}} hours remaining on SLA.</p>',
    recipients: { to: 'Current owner' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-invoice-parked',
    name: 'Invoice parked',
    scenario: 'invoice.parked',
    subject: 'Parked: {{invoiceNumber}}',
    bodyHtml:
      '<p>Invoice <strong>{{invoiceNumber}}</strong> from {{vendorName}} has been parked for review.</p>',
    recipients: { to: 'AP Team' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-invoice-posted',
    name: 'Invoice posted',
    scenario: 'invoice.posted',
    subject: 'Posted: {{invoiceNumber}}',
    bodyHtml: '<p>Invoice <strong>{{invoiceNumber}}</strong> for {{amount}} has been posted.</p>',
    recipients: { to: 'AP Team' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-invoice-returned',
    name: 'Invoice returned',
    scenario: 'invoice.returned',
    subject: 'Returned for correction: {{invoiceNumber}}',
    bodyHtml:
      '<p>Invoice <strong>{{invoiceNumber}}</strong> was returned. Reason: {{rejectReason}}</p>',
    recipients: { to: 'AP Processor' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-approval-escalated',
    name: 'Approval escalated',
    scenario: 'approval.escalated',
    subject: 'Escalated: {{invoiceNumber}}',
    bodyHtml:
      '<p>Approval for invoice <strong>{{invoiceNumber}}</strong> was escalated from {{approverName}}.</p>',
    recipients: { to: 'Delegate' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-exception-resolved',
    name: 'Exception resolved',
    scenario: 'exception.resolved',
    subject: 'Exception cleared on {{invoiceNumber}}',
    bodyHtml:
      '<p>Exception {{exceptionCode}} on invoice <strong>{{invoiceNumber}}</strong> has been resolved.</p>',
    recipients: { to: 'AP Processor' },
    requiredPlaceholders: ['invoiceNumber']
  }),
  seedRow({
    id: 'tpl-vendor-created',
    name: 'Vendor created',
    scenario: 'vendor.created',
    subject: 'New vendor: {{vendorName}}',
    bodyHtml: '<p>Vendor <strong>{{vendorName}}</strong> has been onboarded.</p>',
    recipients: { to: 'Support' },
    requiredPlaceholders: ['vendorName']
  }),
  seedRow({
    id: 'tpl-config-notice',
    name: 'Configuration notice',
    scenario: 'config.notice',
    subject: 'Configuration updated: {{changeSummary}}',
    bodyHtml: '<p>A configuration change was saved: {{changeSummary}}.</p>',
    recipients: { to: 'Administrator' },
    requiredPlaceholders: ['changeSummary']
  })
]

function defaultStore() {
  const items = seedTemplates()
  const versions = {}
  items.forEach((t) => {
    versions[t.id] = [
      {
        id: `${t.id}-v1`,
        templateId: t.id,
        version: t.version,
        action: 'CREATED',
        snapshot: snapshotOf(t),
        changedAt: t.updatedAt,
        changedBy: t.updatedBy
      }
    ]
  })
  return { items, versions }
}

function snapshotOf(t) {
  return {
    name: t.name,
    scenario: t.scenario,
    description: t.description,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    recipients: t.recipients,
    requiredPlaceholders: t.requiredPlaceholders,
    status: t.status
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.items?.length) return parsed
    }
  } catch {
    // ignore
  }
  const store = defaultStore()
  writeStore(store)
  return store
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore quota
  }
}

export function listEmailTemplates() {
  const store = readStore()
  return { items: store.items, scenarios: EMAIL_SCENARIOS }
}

export function getEmailTemplateDetail(id) {
  const store = readStore()
  return {
    template: store.items.find((t) => t.id === id) || null,
    versions: store.versions[id] || []
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmailTemplate(payload, actor = 'Admin') {
  const store = readStore()
  const row = {
    id: uid('tpl'),
    name: payload.name,
    scenario: payload.scenario,
    description: payload.description || '',
    subject: payload.subject,
    bodyHtml: payload.bodyHtml,
    recipients: payload.recipients,
    requiredPlaceholders: payload.requiredPlaceholders || [],
    status: payload.status || 'ACTIVE',
    system: false,
    version: 1,
    createdAt: now(),
    createdBy: actor,
    updatedAt: now(),
    updatedBy: actor
  }
  store.items = [row, ...store.items]
  store.versions[row.id] = [
    {
      id: uid('ver'),
      templateId: row.id,
      version: 1,
      action: 'CREATED',
      snapshot: snapshotOf(row),
      changedAt: row.updatedAt,
      changedBy: actor
    }
  ]
  writeStore(store)
  return row
}

export function updateEmailTemplate(id, payload, actor = 'Admin') {
  const store = readStore()
  const idx = store.items.findIndex((t) => t.id === id)
  if (idx < 0) throw new Error('Template not found')
  const prev = store.items[idx]
  const row = {
    ...prev,
    ...payload,
    recipients: payload.recipients || prev.recipients,
    version: prev.version + 1,
    updatedAt: now(),
    updatedBy: actor
  }
  store.items[idx] = row
  store.versions[id] = [
    {
      id: uid('ver'),
      templateId: id,
      version: row.version,
      action: 'UPDATED',
      snapshot: snapshotOf(row),
      changedAt: row.updatedAt,
      changedBy: actor
    },
    ...(store.versions[id] || [])
  ]
  writeStore(store)
  return row
}

export function duplicateEmailTemplate(id, actor = 'Admin') {
  const store = readStore()
  const src = store.items.find((t) => t.id === id)
  if (!src) throw new Error('Template not found')
  const row = {
    ...src,
    id: uid('tpl'),
    name: `${src.name} (copy)`,
    status: 'INACTIVE',
    system: false,
    version: 1,
    createdAt: now(),
    createdBy: actor,
    updatedAt: now(),
    updatedBy: actor
  }
  store.items = [row, ...store.items]
  store.versions[row.id] = [
    {
      id: uid('ver'),
      templateId: row.id,
      version: 1,
      action: 'DUPLICATED',
      snapshot: snapshotOf(row),
      changedAt: row.updatedAt,
      changedBy: actor,
      note: `Copied from ${src.name}`
    }
  ]
  writeStore(store)
  return row
}

export function deleteEmailTemplate(id) {
  const store = readStore()
  const row = store.items.find((t) => t.id === id)
  if (!row) throw new Error('Template not found')
  if (row.system) throw new Error('Built-in templates cannot be deleted')
  store.items = store.items.filter((t) => t.id !== id)
  writeStore(store)
}

export function restoreEmailTemplateVersion(templateId, versionId, actor = 'Admin') {
  const store = readStore()
  const versions = store.versions[templateId] || []
  const ver = versions.find((v) => v.id === versionId)
  if (!ver) throw new Error('Version not found')
  const idx = store.items.findIndex((t) => t.id === templateId)
  if (idx < 0) throw new Error('Template not found')
  const prev = store.items[idx]
  const row = {
    ...prev,
    ...ver.snapshot,
    version: prev.version + 1,
    updatedAt: now(),
    updatedBy: actor
  }
  store.items[idx] = row
  store.versions[templateId] = [
    {
      id: uid('ver'),
      templateId,
      version: row.version,
      action: 'RESTORED',
      snapshot: snapshotOf(row),
      changedAt: row.updatedAt,
      changedBy: actor,
      note: `Restored v${ver.version}`
    },
    ...versions
  ]
  writeStore(store)
  return row
}

export function renderString(template, ctx) {
  return (template || '').replace(
    /\{\{\s*([\w.]+)\s*\}\}/g,
    (_m, name) => ctx[name] ?? `{{${name}}}`
  )
}

export function htmlToText(html) {
  if (typeof document === 'undefined') return html || ''
  const el = document.createElement('div')
  el.innerHTML = html || ''
  return (el.textContent || '').trim()
}

export function extractPlaceholders(...parts) {
  const found = new Set()
  for (const part of parts) {
    if (!part) continue
    for (const m of part.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) found.add(m[1])
  }
  return [...found]
}

export function sampleCtx(scenario) {
  return Object.fromEntries((scenario?.variables || []).map((v) => [v.name, v.sample]))
}

/** Local preview — never overlays sampleValue; leftover {{tokens}} stay as-is. */
export function previewEmailTemplate(payload = {}) {
  return {
    subject: payload.subject || '',
    html: payload.bodyHtml || '',
    text: htmlToText(payload.bodyHtml),
    values: {}
  }
}

export function validateDraft(d, scenario) {
  const problems = []
  if (!d.name.trim()) problems.push('Template name is required.')
  if (!d.scenario) problems.push('A scenario/event is required.')
  if (!d.subject.trim()) problems.push('Subject is required.')
  if (!htmlToText(d.bodyHtml)) problems.push('Email body is required.')
  if (!isSlaScenario(d.scenario) && !d.to.trim()) problems.push('A To recipient is required.')
  if (scenario) {
    const used = extractPlaceholders(d.subject, d.bodyHtml)
    const known = new Set(scenario.variables.map((v) => v.name))
    const unknown = used.filter((u) => !known.has(u))
    if (unknown.length) {
      problems.push(
        `Unknown placeholder${unknown.length > 1 ? 's' : ''} for this scenario: ${unknown.map((m) => `{{${m}}}`).join(', ')}.`
      )
    }
  }
  return problems
}
