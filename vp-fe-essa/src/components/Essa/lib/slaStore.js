const STORAGE_KEY = 'essa_sla_admin_v5'

const actor = 'Admin'

export const SLA_META = {
  scopeTypes: [
    { code: 'INVOICE_CATEGORY', label: 'Invoice category', hint: 'Applies to one invoice type.' },
    { code: 'WORKFLOW', label: 'Workflow', hint: 'Applies while an approval step is open.' },
    {
      code: 'DOCUMENT_REQUEST',
      label: 'Document request',
      hint: 'Applies while waiting for a document.'
    },
    { code: 'GLOBAL', label: 'All types', hint: 'Applies to every invoice category.' }
  ],
  stages: [
    {
      code: 'INVOICE_CREATION',
      label: 'AP Verification',
      hint: 'From invoice receipt to AP validation complete.'
    },
    { code: 'TAX_REVIEW', label: 'Tax Review', hint: 'Tax reviewer turnaround.' },
    { code: 'AP_APPROVAL', label: 'Approval', hint: 'Each approval step response.' },
    { code: 'PAYMENT', label: 'Payment', hint: 'Payment processing turnaround.' },
    { code: 'DOCUMENT_REQUEST', label: 'Document Request', hint: 'Vendor document chase.' }
  ],
  activities: [
    { code: 'NON_PO', label: 'Non-PO', categoryCodes: ['NON_PO'], categoryIds: ['non-po'] },
    { code: 'MATERIAL', label: 'Material', categoryCodes: ['MATERIAL'], categoryIds: ['material'] },
    { code: 'SERVICE', label: 'Services', categoryCodes: ['SERVICE'], categoryIds: ['service'] },
    { code: 'CATERING', label: 'Catering', categoryCodes: ['CATERING'], categoryIds: ['catering'] },
    { code: 'MANPOWER', label: 'Manpower', categoryCodes: ['MANPOWER'], categoryIds: ['manpower'] }
  ],
  triggerEvents: [
    { code: 'INVOICE_CREATED', label: 'Invoice created', stages: ['INVOICE_CREATION'] },
    { code: 'VALIDATION_COMPLETED', label: 'Validation completed', stages: ['INVOICE_CREATION'] },
    { code: 'TAX_REVIEW_ASSIGNED', label: 'Tax review assigned', stages: ['TAX_REVIEW'] },
    { code: 'WORKFLOW_STEP_ASSIGNED', label: 'Workflow step assigned', stages: ['AP_APPROVAL'] },
    { code: 'INVOICE_APPROVED', label: 'Invoice approved', stages: ['PAYMENT'] },
    { code: 'DOCUMENT_REQUEST_SENT', label: 'Document request sent', stages: ['DOCUMENT_REQUEST'] }
  ],
  owners: [
    { code: 'AP_TEAM', label: 'AP Team' },
    { code: 'TAX_TEAM', label: 'Tax Team' },
    { code: 'APPROVER', label: 'Current Approver' },
    { code: 'TREASURY', label: 'Treasury' },
    { code: 'VENDOR', label: 'Vendor' }
  ],
  recipients: [
    { code: 'CURRENT_APPROVER', label: 'Current Approver' },
    { code: 'APPROVER_AP_SUPERVISOR', label: 'Approver, AP Supervisor' },
    { code: 'AP_PROCESSOR', label: 'AP Processor' },
    { code: 'AP_SUPERVISOR', label: 'AP Supervisor' },
    { code: 'VENDOR', label: 'Vendor' },
    { code: 'HEAD_OF_FUNCTION', label: 'Head of Function' }
  ],
  escalationTargets: [
    { code: 'NEXT_APPROVAL_LEVEL', label: 'Next Approval Level' },
    { code: 'AP_SUPERVISOR', label: 'AP Supervisor' },
    { code: 'HEAD_OF_FUNCTION', label: 'Head of Function' },
    { code: 'OFF', label: '—' }
  ],
  units: [
    { code: 'HOURS', label: 'Hours' },
    { code: 'CALENDAR_DAYS', label: 'Calendar Days' },
    { code: 'BUSINESS_HOURS', label: 'Business Hours' },
    { code: 'BUSINESS_DAYS', label: 'Business Days' }
  ],
  channels: [
    { code: 'EMAIL', label: 'Email' },
    { code: 'TEAMS', label: 'Microsoft Teams' },
    { code: 'PORTAL', label: 'Portal' }
  ],
  breachConditions: [
    { code: 'AFTER_FINAL_REMINDER', label: 'After the final reminder' },
    { code: 'AFTER_FIRST_UNANSWERED_REMINDER', label: 'After the first unanswered reminder' },
    { code: 'ON_DUE_TIME', label: 'When the SLA due time is reached' }
  ],
  templates: [
    { id: 'tpl-sla-reminder', name: 'SLA reminder', scenario: 'sla.reminder' },
    { id: 'tpl-sla-warning', name: 'SLA warning', scenario: 'sla.warning' },
    { id: 'tpl-sla-breached', name: 'SLA breached', scenario: 'sla.breached' },
    { id: 'tpl-sla-escalated', name: 'SLA escalated', scenario: 'sla.escalated' },
    { id: 'tpl-sla-missing-document', name: 'SLA missing document', scenario: 'sla.missing_document' }
  ],
  templateNames: [
    'Approval Reminder 1',
    'Approval Reminder 2',
    'Final Approval Reminder',
    'Missing Document Reminder',
    'AP Verification Reminder'
  ],
  timezones: ['Asia/Jakarta', 'Asia/Singapore', 'UTC'],
  pauseConditions: [
    {
      code: 'WAITING_VENDOR_DOCUMENT',
      label: 'Waiting for Vendor Document',
      resumeEvent: 'DOCUMENT_RECEIVED'
    },
    {
      code: 'WAITING_SAP_REFERENCE',
      label: 'Waiting for SAP GRN / SES',
      resumeEvent: 'SAP_REFERENCE_AVAILABLE'
    },
    {
      code: 'SAP_INTEGRATION_UNAVAILABLE',
      label: 'SAP Integration Unavailable',
      resumeEvent: 'INTEGRATION_RECOVERED'
    },
    {
      code: 'APPROVED_SYSTEM_MAINTENANCE',
      label: 'Approved System Maintenance',
      resumeEvent: 'MAINTENANCE_ENDED'
    },
    {
      code: 'WAITING_INTERNAL_AP_ACTION',
      label: 'Waiting for Internal AP Action',
      resumeEvent: 'AP_ACTION_COMPLETED'
    }
  ],
  statuses: ['DRAFT', 'TEST', 'ACTIVE', 'RETIRED'],
  runtimeStatuses: [
    { code: 'PENDING', label: 'Pending', hint: 'Clock created, not yet started.' },
    { code: 'RUNNING', label: 'Open', hint: 'Timer is running.' },
    { code: 'WARNING', label: 'At risk', hint: 'Inside the warning threshold.' },
    { code: 'PAUSED', label: 'Paused', hint: 'Clock stopped while waiting on an external party.' },
    { code: 'COMPLETED', label: 'Completed', hint: 'Stage finished within the target.' },
    { code: 'BREACHED', label: 'Breached', hint: 'Target elapsed before the stage completed.' },
    {
      code: 'CANCELLED',
      label: 'Cancelled',
      hint: 'Clock cancelled because the stage was skipped.'
    }
  ]
}

const pauseRules = [
  {
    code: 'WAITING_VENDOR_DOCUMENT',
    label: 'Waiting for Vendor Document',
    pause: false,
    resumeEvent: 'DOCUMENT_RECEIVED',
    reasonRequired: false
  },
  {
    code: 'WAITING_SAP_REFERENCE',
    label: 'Waiting for SAP GRN / SES',
    pause: false,
    resumeEvent: 'SAP_REFERENCE_AVAILABLE',
    reasonRequired: false
  },
  {
    code: 'SAP_INTEGRATION_UNAVAILABLE',
    label: 'SAP Integration Unavailable',
    pause: false,
    resumeEvent: 'INTEGRATION_RECOVERED',
    reasonRequired: false
  },
  {
    code: 'APPROVED_SYSTEM_MAINTENANCE',
    label: 'Approved System Maintenance',
    pause: false,
    resumeEvent: 'MAINTENANCE_ENDED',
    reasonRequired: false
  },
  {
    code: 'WAITING_INTERNAL_AP_ACTION',
    label: 'Waiting for Internal AP Action',
    pause: false,
    resumeEvent: 'AP_ACTION_COMPLETED',
    reasonRequired: false
  }
]

const PAUSE_ALIASES = {
  WAITING_VENDOR: 'WAITING_VENDOR_DOCUMENT'
}

export function mergePauseRules(existing) {
  const byCode = new Map()
  let hadManualHold = false
  for (const r of existing || []) {
    if (r.code === 'ON_HOLD') {
      hadManualHold = Boolean(r.pause)
      continue
    }
    const code = PAUSE_ALIASES[r.code] || r.code
    byCode.set(code, { ...r, code })
  }
  return {
    pauseRules: pauseRules.map((def) => ({
      ...def,
      ...(byCode.get(def.code) || {}),
      code: def.code,
      label: def.label,
      resumeEvent: def.resumeEvent
    })),
    hadManualHold
  }
}

const escalation = (partial = {}) => ({
  enabled: false,
  breachCondition: 'AFTER_FINAL_REMINDER',
  primaryTarget: 'NEXT_APPROVAL_LEVEL',
  fallbackTarget: 'AP_SUPERVISOR',
  channels: [],
  createAuditEvent: true,
  createBreachFlag: true,
  ...partial
})

function defaultTimer(partial = {}) {
  return {
    duration: 1,
    unit: 'BUSINESS_DAYS',
    unitConfirmed: true,
    calendarId: '',
    timezone: 'Asia/Jakarta',
    warningBefore: { value: 4, unit: 'HOURS' },
    countdownOnWorkbench: true,
    dashboardIndicator: true,
    ...partial
  }
}

function policy(row) {
  return {
    description: '',
    activity: undefined,
    owner: 'AP_TEAM',
    provisional: false,
    version: 1,
    status: 'DRAFT',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    changedBy: undefined,
    changedAt: undefined,
    publishedBy: undefined,
    publishedAt: undefined,
    retiredAt: undefined,
    lastTestedAt: undefined,
    changeSummary: undefined,
    reminders: [],
    escalation: escalation(),
    pauseRules,
    manualPauseAllowed: false,
    maxPause: null,
    ...row,
    timer: defaultTimer(row.timer)
  }
}

export function blankSlaPolicy(partial = {}) {
  return policy({
    id: '',
    code: '',
    name: '',
    scopeType: 'INVOICE_CATEGORY',
    activity: '',
    stage: 'INVOICE_CREATION',
    triggerEvent: 'INVOICE_CREATED',
    owner: 'AP_TEAM',
    status: 'DRAFT',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    publishedBy: undefined,
    publishedAt: undefined,
    provisional: false,
    provisionalNote: '',
    reminders: [],
    ...partial
  })
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.policies || !parsed?.calendars) return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}

const stored = readStorage()
let state = {
  policies: (stored?.policies || []).map((p) => {
    const merged = mergePauseRules(p.pauseRules)
    return {
      ...p,
      pauseRules: merged.pauseRules,
      manualPauseAllowed: p.manualPauseAllowed != null ? p.manualPauseAllowed : merged.hadManualHold
    }
  }),
  calendars: stored?.calendars || [],
  instances: []
}

function persist() {
  writeStorage({ policies: state.policies, calendars: state.calendars })
}

export function getSlaMeta() {
  return clone(SLA_META)
}

export function getSlaPolicies() {
  return { policies: clone(state.policies), calendars: clone(state.calendars) }
}

export function getSlaInstances(query = {}) {
  const now = Date.now()
  const rows = clone(state.instances).map((row) => {
    const due = row.dueAt ? new Date(row.dueAt).getTime() : null
    const remainingMs =
      row.status === 'PAUSED' ||
      row.status === 'COMPLETED' ||
      row.status === 'CANCELLED' ||
      due == null
        ? (row.remainingMs ?? null)
        : due - now
    return { ...row, remainingMs }
  })
  return filterSlaInstances(rows, query)
}

const CLOSED_INSTANCE_STATUSES = ['COMPLETED', 'CANCELLED']

function filterSlaInstances(rows, query = {}) {
  const status = String(query.status || '').trim().toUpperCase()
  const includeClosedRaw = query.includeClosed
  const includeClosed =
    includeClosedRaw === undefined || includeClosedRaw === ''
      ? true
      : includeClosedRaw === true || ['true', '1', 'yes'].includes(String(includeClosedRaw).toLowerCase())
  const stage = String(query.stage || '').trim().toUpperCase()
  const owner = String(query.owner || '').trim().toLowerCase()
  const policyId = String(query.policyId || '').trim()
  const q = String(query.q || '').trim().toLowerCase()
  const dueFrom = query.dueFrom ? String(query.dueFrom).slice(0, 10) : ''
  const dueTo = query.dueTo ? String(query.dueTo).slice(0, 10) : ''

  return rows.filter((row) => {
    if (status) {
      if (row.status !== status) return false
    } else if (!includeClosed && CLOSED_INSTANCE_STATUSES.includes(row.status)) {
      return false
    }
    if (stage && row.stage !== stage) return false
    if (owner && !String(row.owner || '').toLowerCase().includes(owner)) return false
    if (policyId && row.policyId !== policyId) return false
    const dueDay = row.dueAt ? String(row.dueAt).slice(0, 10) : ''
    if (dueFrom && (!dueDay || dueDay < dueFrom)) return false
    if (dueTo && (!dueDay || dueDay > dueTo)) return false
    if (q) {
      const hay = [row.invoiceNumber, row.reference, row.vendorName, row.policyCode, row.policyName]
      if (!hay.some((v) => String(v || '').toLowerCase().includes(q))) return false
    }
    return true
  })
}

export function getSlaInstance(id) {
  return getSlaInstances({ includeClosed: true }).find((row) => row.id === id) || null
}

export function summarizeSlaInstances() {
  const rows = getSlaInstances({ includeClosed: true })
  const inFlight = new Set(['PENDING', 'RUNNING', 'WARNING', 'PAUSED'])
  const today = new Date().toISOString().slice(0, 10)
  let open = 0
  let dueToday = 0
  let atRisk = 0
  let breached = 0
  let paused = 0
  rows.forEach((row) => {
    if (inFlight.has(row.status)) open += 1
    if (row.status === 'WARNING') atRisk += 1
    if (row.status === 'BREACHED') breached += 1
    if (row.status === 'PAUSED') paused += 1
    if (row.dueAt && inFlight.has(row.status) && String(row.dueAt).slice(0, 10) === today) dueToday += 1
  })
  return { open, dueToday, atRisk, breached, paused }
}

function appendInstanceEvent(row, type, detail) {
  const events = Array.isArray(row.events) ? row.events : []
  events.push({ type, at: new Date().toISOString(), detail: detail || '' })
  row.events = events
}

export function pauseSlaInstance(id, payload = {}) {
  const idx = state.instances.findIndex((row) => row.id === id)
  if (idx < 0) throw new Error('Instance not found.')
  const current = state.instances[idx]
  if (!['PENDING', 'RUNNING', 'WARNING'].includes(current.status)) {
    throw new Error('Instance cannot be paused')
  }
  const next = {
    ...current,
    status: 'PAUSED',
    note: payload.reason || current.note,
    remainingMs: current.remainingMs
  }
  appendInstanceEvent(next, 'PAUSED', payload.code || 'ON_HOLD')
  state.instances = state.instances.map((row, i) => (i === idx ? next : row))
  persist()
  return clone(next)
}

export function resumeSlaInstance(id, payload = {}) {
  const idx = state.instances.findIndex((row) => row.id === id)
  if (idx < 0) throw new Error('Instance not found.')
  const current = state.instances[idx]
  if (current.status !== 'PAUSED') throw new Error('Instance is not paused')
  const next = { ...current, status: 'RUNNING' }
  appendInstanceEvent(next, 'RESUMED', payload.event || 'RESUME')
  state.instances = state.instances.map((row, i) => (i === idx ? next : row))
  persist()
  return clone(next)
}

export function createSlaPolicy(payload, changedBy = actor) {
  const code = String(payload.code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '_')
  if (!code) throw new Error('SLA code is required.')
  if (state.policies.some((p) => p.code === code)) throw new Error(`Policy ${code} already exists.`)
  const timerSrc = payload.timer || {}
  const duration =
    timerSrc.duration !== undefined
      ? timerSrc.duration
      : payload.duration === '' || payload.duration == null
        ? null
        : Number(payload.duration)
  const created = policy({
    id: `p-${Date.now()}`,
    code,
    name: payload.name?.trim() || code,
    scopeType: payload.scopeType || 'INVOICE_CATEGORY',
    activity: payload.activity || undefined,
    stage: payload.stage || 'INVOICE_CREATION',
    triggerEvent: payload.triggerEvent || 'INVOICE_CREATED',
    owner: payload.owner || 'AP_TEAM',
    description: payload.description || '',
    provisional: Boolean(payload.provisional),
    provisionalNote: payload.provisionalNote || '',
    status: 'DRAFT',
    effectiveFrom: payload.effectiveFrom || new Date().toISOString().slice(0, 10),
    effectiveTo: payload.effectiveTo || '',
    changedBy,
    changedAt: new Date().toISOString(),
    publishedBy: undefined,
    publishedAt: undefined,
    reminders: Array.isArray(payload.reminders) ? clone(payload.reminders) : [],
    escalation: { ...escalation(), ...(payload.escalation || {}) },
    pauseRules: mergePauseRules(payload.pauseRules).pauseRules,
    manualPauseAllowed: payload.manualPauseAllowed ?? false,
    maxPause: payload.maxPause === undefined ? null : payload.maxPause,
    timer: {
      duration,
      unit: timerSrc.unit || payload.unit || 'BUSINESS_DAYS',
      unitConfirmed: timerSrc.unitConfirmed ?? false,
      calendarId: timerSrc.calendarId,
      timezone: timerSrc.timezone || 'Asia/Jakarta',
      warningBefore: timerSrc.warningBefore ?? { value: 4, unit: 'HOURS' },
      countdownOnWorkbench: timerSrc.countdownOnWorkbench ?? true,
      dashboardIndicator: timerSrc.dashboardIndicator ?? true
    }
  })
  state.policies = [created, ...state.policies]
  persist()
  return clone(created)
}

export function updateSlaPolicy(id, payload, changedBy = actor) {
  const idx = state.policies.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error('Policy not found.')
  const current = state.policies[idx]
  const next = {
    ...current,
    ...payload,
    id: current.id,
    code: current.code,
    timer: { ...current.timer, ...(payload.timer || {}) },
    escalation: payload.escalation
      ? { ...current.escalation, ...payload.escalation }
      : current.escalation,
    reminders: Array.isArray(payload.reminders) ? clone(payload.reminders) : current.reminders,
    pauseRules: mergePauseRules(
      Array.isArray(payload.pauseRules) ? payload.pauseRules : current.pauseRules
    ).pauseRules,
    changedBy,
    changedAt: new Date().toISOString(),
    status: payload.status || (current.status === 'TEST' ? 'DRAFT' : current.status),
    lastTestedAt:
      payload.lastTestedAt !== undefined
        ? payload.lastTestedAt
        : current.status === 'TEST'
          ? undefined
          : current.lastTestedAt
  }
  state.policies = state.policies.map((p, i) => (i === idx ? next : p))
  persist()
  return clone(next)
}

export function deleteSlaPolicy(id) {
  const found = state.policies.find((p) => p.id === id)
  if (!found) throw new Error('Policy not found.')
  if (found.status === 'ACTIVE' || found.status === 'RETIRED') {
    throw new Error('ACTIVE and RETIRED policies cannot be deleted. Retire an ACTIVE policy instead.')
  }
  state.policies = state.policies.filter((p) => p.id !== id)
  persist()
  return { id }
}

export function retireSlaPolicy(id, payload = {}, changedBy = actor) {
  if (typeof payload === 'string') {
    changedBy = payload
    payload = {}
  }
  const idx = state.policies.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error('Policy not found.')
  const current = state.policies[idx]
  if (current.status !== 'ACTIVE') throw new Error('Only an active policy can be retired.')
  const next = {
    ...current,
    status: 'RETIRED',
    retiredAt: new Date().toISOString(),
    changeSummary: payload.reason || current.changeSummary,
    changedBy,
    changedAt: new Date().toISOString()
  }
  state.policies = state.policies.map((p, i) => (i === idx ? next : p))
  persist()
  return clone(next)
}

export function newSlaPolicyVersion(id, changedBy = actor) {
  const current = state.policies.find((p) => p.id === id)
  if (!current) throw new Error('Policy not found.')
  if (current.status !== 'ACTIVE') throw new Error('Only an active policy can be versioned.')
  const maxVersion = state.policies
    .filter((p) => p.code === current.code)
    .reduce((max, p) => Math.max(max, Number(p.version) || 1), current.version || 1)
  const created = clone(current)
  created.id = `p-${Date.now()}`
  created.version = maxVersion + 1
  created.status = 'DRAFT'
  created.publishedBy = undefined
  created.publishedAt = undefined
  created.retiredAt = undefined
  created.lastTestedAt = undefined
  created.changedBy = changedBy
  created.changedAt = new Date().toISOString()
  state.policies = [created, ...state.policies]
  persist()
  return clone(created)
}

export function cloneSlaPolicy(id, payload = {}, changedBy = actor) {
  if (typeof payload === 'string') {
    changedBy = payload
    payload = {}
  }
  const current = state.policies.find((p) => p.id === id)
  if (!current) throw new Error('Policy not found.')
  const code = String(payload.code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '_')
  if (!code) throw new Error('Code is required.')
  if (state.policies.some((p) => p.code === code)) throw new Error(`Policy ${code} already exists.`)
  const created = clone(current)
  created.id = `p-${Date.now()}`
  created.code = code
  created.version = 1
  created.status = 'DRAFT'
  created.publishedBy = undefined
  created.publishedAt = undefined
  created.retiredAt = undefined
  created.lastTestedAt = undefined
  created.changedBy = changedBy
  created.changedAt = new Date().toISOString()
  state.policies = [created, ...state.policies]
  persist()
  return clone(created)
}

export function markSlaPolicyTested(id, payload = {}, changedBy = actor) {
  if (typeof payload === 'string') {
    changedBy = payload
    payload = {}
  }
  const idx = state.policies.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error('Policy not found.')
  const current = state.policies[idx]
  if (current.status === 'RETIRED') throw new Error('Retired policies cannot be tested.')
  const next = {
    ...current,
    status: current.status === 'ACTIVE' ? 'ACTIVE' : 'TEST',
    lastTestedAt: new Date().toISOString(),
    changedBy,
    changedAt: new Date().toISOString()
  }
  state.policies = state.policies.map((p, i) => (i === idx ? next : p))
  persist()
  const startAt = payload.startAt || new Date().toISOString()
  const simulation = simulateSla({
    policyId: id,
    startAt,
    calendarId: payload.calendarId || current.timer?.calendarId,
    pauseFrom: payload.pauseFrom,
    pauseTo: payload.pauseTo
  })
  return {
    policy: clone(next),
    simulation: { rows: simulation.rows, calendarName: simulation.calendarName }
  }
}

export function publishSlaPolicy(id, payload = {}, changedBy = actor) {
  if (typeof payload === 'string') {
    changedBy = payload
    payload = {}
  }
  const idx = state.policies.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error('Policy not found.')
  const current = state.policies[idx]
  if (current.provisional) throw new Error('Clear the provisional flag before publishing.')
  if (current.status !== 'TEST') throw new Error('Run Test before publishing.')
  const now = new Date().toISOString()
  const next = {
    ...current,
    status: 'ACTIVE',
    effectiveFrom: payload.effectiveFrom || current.effectiveFrom,
    changeSummary: payload.changeSummary || current.changeSummary,
    publishedBy: changedBy,
    publishedAt: now,
    changedBy,
    changedAt: now
  }
  state.policies = state.policies.map((p, i) => {
    if (i === idx) return next
    if (p.code === current.code && p.status === 'ACTIVE') {
      return { ...p, status: 'RETIRED', retiredAt: now, changedBy, changedAt: now }
    }
    return p
  })
  persist()
  return clone(next)
}

export function saveBusinessCalendar(calendar, changedBy = actor) {
  const idx = state.calendars.findIndex((c) => c.id === calendar.id)
  const current = idx >= 0 ? state.calendars[idx] : null
  const bumpVersion = current?.status === 'ACTIVE'
  const next = {
    ...calendar,
    workingDays: Array.isArray(calendar.workingDays) ? calendar.workingDays : [1, 2, 3, 4, 5],
    exceptions: Array.isArray(calendar.exceptions) ? calendar.exceptions : [],
    version: bumpVersion ? (current?.version || calendar.version || 1) + 1 : calendar.version || 1,
    changedBy,
    changedAt: new Date().toISOString()
  }
  if (idx < 0) state.calendars = [...state.calendars, next]
  else state.calendars = state.calendars.map((c, i) => (i === idx ? next : c))
  persist()
  return clone(next)
}

export function createBusinessCalendar(payload = {}, changedBy = actor) {
  if (typeof payload === 'string') {
    changedBy = payload
    payload = {}
  }
  const code = String(payload.code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '_')
  if (!code) throw new Error('Calendar code is required.')
  if (state.calendars.some((c) => c.code === code)) throw new Error(`Calendar ${code} already exists.`)
  const created = {
    id: `cal-${Date.now()}`,
    code,
    name: payload.name?.trim() || code,
    timezone: payload.timezone || 'Asia/Jakarta',
    workingDays: [1, 2, 3, 4, 5],
    workStart: '08:00',
    workEnd: '17:00',
    status: 'DRAFT',
    version: 1,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    changedBy,
    changedAt: new Date().toISOString(),
    exceptions: []
  }
  state.calendars = [...state.calendars, created]
  persist()
  return clone(created)
}

export function publishBusinessCalendar(id, changedBy = actor) {
  const found = state.calendars.find((c) => c.id === id)
  if (!found) throw new Error('Calendar not found.')
  if (found.status === 'RETIRED') throw new Error('Cannot publish a retired calendar.')
  const now = new Date().toISOString()
  const next = {
    ...found,
    status: 'ACTIVE',
    publishedBy: changedBy,
    publishedAt: now,
    changedBy,
    changedAt: now
  }
  state.calendars = state.calendars.map((c) => (c.id === id ? next : c))
  persist()
  return clone(next)
}

export function retireBusinessCalendar(id, changedBy = actor) {
  const found = state.calendars.find((c) => c.id === id)
  if (!found) throw new Error('Calendar not found.')
  const inUse = state.policies.some((p) => p.status === 'ACTIVE' && p.timer?.calendarId === id)
  if (inUse) {
    throw new Error(
      'Retiring is refused while an active policy still uses this calendar. Point those policies at another calendar first.'
    )
  }
  const next = { ...found, status: 'RETIRED', changedBy, changedAt: new Date().toISOString() }
  state.calendars = state.calendars.map((c) => (c.id === id ? next : c))
  persist()
  return clone(next)
}

function isHoliday(calendar, date) {
  const key = date.toISOString().slice(0, 10)
  return calendar.exceptions?.some((e) => e.date === key && !e.working)
}

function isoWeekday(date) {
  const js = date.getDay()
  return js === 0 ? 7 : js
}

function isWorkingDay(calendar, date) {
  const key = date.toISOString().slice(0, 10)
  const exception = calendar.exceptions?.find((e) => e.date === key)
  if (exception) return exception.working
  return (calendar.workingDays || [1, 2, 3, 4, 5]).includes(isoWeekday(date))
}

function addDuration(start, duration, calendar) {
  if (!duration || duration.value == null) return null
  const d = new Date(start)
  if (duration.unit === 'HOURS' || duration.unit === 'BUSINESS_HOURS') {
    if (duration.unit === 'HOURS' || !calendar) {
      d.setHours(d.getHours() + duration.value)
      return d.toISOString()
    }
    let hours = duration.value
    while (hours > 0) {
      d.setHours(d.getHours() + 1)
      if (isWorkingDay(calendar, d) && !isHoliday(calendar, d)) hours -= 1
    }
    return d.toISOString()
  }
  const days = duration.value
  if (duration.unit === 'CALENDAR_DAYS') {
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }
  let left = days
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    if (isWorkingDay(calendar, d)) left -= 1
  }
  return d.toISOString()
}

export function simulateSla({ policyId, startAt, calendarId, pauseFrom, pauseTo }) {
  const policyRow = state.policies.find((p) => p.id === policyId)
  if (!policyRow) throw new Error('Policy not found.')
  const calendar = state.calendars.find((c) => c.id === (calendarId || policyRow.timer.calendarId))
  const policySummary = {
    id: policyRow.id,
    code: policyRow.code,
    name: policyRow.name,
    version: policyRow.version,
    status: policyRow.status
  }
  const rows = [{ event: 'SLA started', at: startAt, detail: `Clock opened for ${policyRow.code}` }]

  let pauseMs = 0
  let from = pauseFrom ? new Date(pauseFrom) : null
  let to = pauseTo ? new Date(pauseTo) : null
  if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to > from) {
    pauseMs = to.getTime() - from.getTime()
    rows.push({ event: 'Paused', at: from.toISOString(), detail: 'Simulated pause' })
    rows.push({ event: 'Resumed', at: to.toISOString(), detail: 'Simulated resume' })
  } else {
    from = null
  }
  const shiftIfPaused = (iso) => {
    if (!iso || !from || !pauseMs) return iso
    const at = new Date(iso)
    if (Number.isNaN(at.getTime()) || at.getTime() < from.getTime()) return iso
    return new Date(at.getTime() + pauseMs).toISOString()
  }

  ;(policyRow.reminders || [])
    .filter((r) => r.enabled)
    .forEach((r) => {
      const immediately = !r.after || r.after.value === 0
      const at = immediately ? startAt : addDuration(startAt, r.after, calendar)
      rows.push({
        event: `Reminder ${r.seq}`,
        at: shiftIfPaused(at),
        detail: `${r.template || r.templateId || 'template'} → ${(r.recipient || '').replace(/_/g, ' ')}`,
        recipient: r.recipient,
        channels: r.channels || [],
        template: r.template || '',
        templateId: r.templateId
      })
    })
  if (policyRow.timer.duration != null) {
    const dueAt = shiftIfPaused(
      addDuration(startAt, { value: policyRow.timer.duration, unit: policyRow.timer.unit }, calendar)
    )
    rows.push({ event: 'SLA due', at: dueAt, detail: 'Target elapsed' })
    if (policyRow.escalation?.enabled) {
      rows.push({
        event: 'Escalation',
        at: dueAt,
        detail: `Escalate to ${(policyRow.escalation.primaryTarget || '').replace(/_/g, ' ')}`,
        recipient: policyRow.escalation.primaryTarget || policyRow.escalation.fallbackTarget,
        channels: policyRow.escalation.channels || [],
        template: policyRow.escalation.template || '',
        templateId: policyRow.escalation.templateId
      })
    }
  } else {
    rows.push({ event: 'No target', at: null, detail: 'Timer is not applicable for this policy' })
  }
  rows.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))
  return {
    policy: policySummary,
    startAt,
    rows,
    calendarName: calendar?.name || null
  }
}
