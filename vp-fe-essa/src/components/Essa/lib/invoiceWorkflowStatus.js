/** SAP lifecycle labels shown in invoice list / dashboard tables. */
export const WORKFLOW_STAGE = {
  draft: { label: 'Draft', shortLabel: 'Draft', tone: 'draft' },
  validated: { label: 'Resubmit invoice', shortLabel: 'Resubmit invoice', tone: 'validated' },
  parked: { label: 'Invoice parked to SAP', shortLabel: 'Parked', tone: 'parked' },
  posted: { label: 'Invoice posted to SAP', shortLabel: 'Posted to SAP', tone: 'posted' },
  paid: { label: 'Invoice paid', shortLabel: 'Paid', tone: 'paid' },
  rejected: { label: 'Rejected', shortLabel: 'Rejected', tone: 'rejected' },
  review: { label: 'Complete validation', shortLabel: 'Complete validation', tone: 'review' }
}

/** Invoice list filter tabs — aligned with workflow status column. */
export const INVOICE_STATUS_PILLS = [
  { key: 'all', label: 'All', params: {} },
  { key: 'draft', label: 'Draft', params: { workflow_stage: 'draft' } },
  { key: 'validated', label: 'Validated', params: { workflow_stage: 'validated' } },
  { key: 'parked', label: 'Parked', params: { workflow_stage: 'parked' } },
  { key: 'posted', label: 'Posted', params: { workflow_stage: 'posted' } },
  { key: 'paid', label: 'Paid', params: { workflow_stage: 'paid' } },
  { key: 'rejected', label: 'Rejected', params: { workflow_stage: 'rejected' } }
]

function stage(key) {
  return { key, ...WORKFLOW_STAGE[key] }
}

function normalizeStatus(inv = {}) {
  const raw = inv.workflow_stage || inv.status_label || inv.status || ''
  return String(raw).toLowerCase().replace(/\s+/g, '_')
}

/** Five-step SAP lifecycle shown on Timeline process stepper + milestone events. */
export const SAP_TIMELINE_STEPS = [
  { key: 'validated', label: 'Validated', eventType: 'validation_done' },
  { key: 'approved', label: 'Approved', eventType: 'approved' },
  { key: 'parked', label: 'Invoice parked to SAP', eventType: 'parked_to_sap' },
  { key: 'posted', label: 'Invoice posted to SAP', eventType: 'posted' },
  { key: 'paid', label: 'Invoice paid', eventType: 'paid' }
]

/** Last completed step index (0–4) for the SAP timeline stepper. */
export function getSapWorkflowCompletedStepIndex(inv = {}) {
  const status = normalizeStatus(inv)
  const overall = String(inv.overall || '').toLowerCase()

  if (overall === 'rejected' || status === 'rejected') return -1
  if (status === 'paid') return 4
  if (status === 'posted') return 3
  if (status === 'parked') return 2
  if (status === 'approved' || status === 'pending_approval') return 1
  if (
    status === 'extracted' ||
    status === 'validated' ||
    overall === 'approved' ||
    overall === 'pass'
  ) {
    return 0
  }
  return -1
}

/** Map row status → Validated / Parked / Posted / Paid badge. */
export function resolveWorkflowStage(inv = {}) {
  const status = normalizeStatus(inv)
  const overall = String(inv.overall || '').toLowerCase()

  if (status === 'paid') return stage('paid')
  if (status === 'rejected') return stage('rejected')
  if (status === 'draft') return stage('draft')

  if (status === 'posted' || status === 'approved') {
    return stage('posted')
  }

  if (status === 'parked' || status === 'pending_approval') {
    return stage('parked')
  }

  if (
    overall === 'review' ||
    overall === 'rejected' ||
    status === 'submitted_for_review' ||
    status === 'under_review' ||
    status === 'pending'
  ) {
    if (overall === 'approved' || overall === 'pass') {
      return stage('validated')
    }
    return stage('review')
  }

  if (status === 'extracted' || status === 'validated') {
    return stage('validated')
  }

  return stage('validated')
}

export function getWorkflowStageKey(inv = {}) {
  return resolveWorkflowStage(inv).key
}

/** Map legacy ?status= / ?overall= query params to workflow stage keys. */
export function resolveLegacyFilterStage(params = {}) {
  if (params.workflow_stage) return params.workflow_stage

  const status = String(params.status || '').toLowerCase()
  const overall = String(params.overall || '').toLowerCase()

  if (overall === 'rejected') return 'rejected'
  if (overall === 'review') return 'review'
  if (status === 'paid') return 'paid'
  if (status === 'posted') return 'posted'
  if (status === 'parked' || status === 'pending_approval') return 'parked'
  if (status === 'draft') return 'draft'
  if (status === 'extracted' || status === 'validated') return 'validated'

  return null
}

const NO_ACTION_REQUIRED = {
  label: 'No action required',
  tone: 'idle'
}

/** Next action text for the list table (replaces inline action buttons). */
export function resolveNextAction(inv = {}) {
  const status = normalizeStatus(inv)
  const overall = String(inv.overall || '').toLowerCase()
  const stageKey = getWorkflowStageKey(inv)

  if (status === 'paid' || status === 'archived' || stageKey === 'paid') {
    return NO_ACTION_REQUIRED
  }

  if (stageKey === 'rejected' || status === 'rejected' || overall === 'rejected') {
    return {
      label: 'Return for Correction',
      tone: 'danger'
    }
  }

  if (stageKey === 'draft' || status === 'draft') {
    return {
      label: 'Awaiting Docs',
      tone: 'review'
    }
  }

  if (stageKey === 'review' || stageKey === 'validated') {
    return {
      label: 'Awaiting Approval',
      tone: 'approval'
    }
  }

  if (stageKey === 'parked' || status === 'parked' || status === 'pending_approval') {
    return {
      label: 'To be Posted',
      tone: 'post'
    }
  }

  if (stageKey === 'posted' || status === 'posted' || status === 'approved') {
    return {
      label: 'Awaiting Payment',
      tone: 'post'
    }
  }

  return { label: 'Review Invoice', tone: 'review' }
}
