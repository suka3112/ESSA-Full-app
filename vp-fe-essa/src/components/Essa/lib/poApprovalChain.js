/**
 * Internal AP approval chain for PO-based invoices (ESSA Roles Matrix).
 * Non-PO invoices use DoA approvers — see nonPoDoaApproval.js.
 */
import {
  advanceNonPoDoaChain,
  resolveNonPoApprovals
} from './nonPoDoaApproval'
import { hasPoWorkflowSignals } from 'api/apInvoiceOcr'

export const ESSA_AP_ACTORS = {
  ap_team: {
    approver_id: 'E001',
    approver_name: 'Putri Maharani',
    approver_email: 'ap.team@essa.com',
    role_label: 'AP Team'
  },
  ap_supervisor: {
    approver_id: 'E002',
    approver_name: 'Siti Rahmawati',
    approver_email: 'ap.supervisor@essa.com',
    role_label: 'AP Supervisor'
  },
  ap_lead: {
    approver_id: 'E003',
    approver_name: 'Dewi Lestari',
    approver_email: 'ap.lead@essa.com',
    role_label: 'AP Lead'
  },
  finance_manager: {
    approver_id: 'E004',
    approver_name: 'Rini Maharani',
    approver_email: 'finance.manager@essa.com',
    role_label: 'Finance Manager'
  }
}

/** Posting workflow per Internal AP matrix */
export const PO_AP_CHAIN_STEPS = [
  {
    level: 1,
    role: 'ap_team',
    action: 'Preparer',
    description: 'Draft, upload & park invoice'
  },
  {
    level: 2,
    role: 'ap_supervisor',
    action: 'Reviewer',
    description: 'Review extraction & discrepancies'
  },
  {
    level: 3,
    role: 'ap_lead',
    action: 'Reviewer',
    description: 'Posting review'
  },
  {
    level: 4,
    role: 'finance_manager',
    action: 'Approver',
    description: 'Posting approval'
  }
]

/**
 * @param {object} opts
 * @param {number[]} [opts.approvedLevels] — completed step levels (default: [1] upload done)
 * @param {number|null} [opts.rejectedLevel]
 * @param {Record<number, string>} [opts.notes]
 * @param {Record<number, string>} [opts.actedAt]
 */
export function buildPoApprovalChain({
  approvedLevels = [1],
  rejectedLevel = null,
  notes = {},
  actedAt = {}
} = {}) {
  return PO_AP_CHAIN_STEPS.map((step) => {
    const actor = ESSA_AP_ACTORS[step.role]
    let status = 'pending'
    if (rejectedLevel === step.level) {
      status = 'rejected'
    } else if (approvedLevels.includes(step.level)) {
      status = 'approved'
    }

    return {
      id: `po-ap-${step.level}`,
      level: step.level,
      role: step.role,
      role_label: `${step.action} · ${actor.role_label}`,
      approver_id: actor.approver_id,
      approver_name: actor.approver_name,
      approver_email: actor.approver_email,
      description: step.description,
      status,
      note: notes[step.level] || null,
      acted_at:
        status === 'approved' || status === 'rejected'
          ? actedAt[step.level] || null
          : null
    }
  })
}

export function getNextPendingRole(chain = []) {
  const next = chain.find((s) => s.status === 'pending')
  return next?.role || null
}

export function advanceApprovalChain(chain, level, decision, note, invoice) {
  if (invoice && isNonPoInvoiceWorkflow(invoice)) {
    const amount = invoice.total_amount ?? invoice.subtotal ?? 0
    return advanceNonPoDoaChain(chain, level, decision, note, amount)
  }

  const approved = chain.filter((s) => s.status === 'approved').map((s) => s.level)
  const notes = {}
  const actedAt = {}
  chain.forEach((s) => {
    if (s.note) notes[s.level] = s.note
    if (s.acted_at) actedAt[s.level] = s.acted_at
  })
  if (note) notes[level] = note
  actedAt[level] = new Date().toISOString()

  if (decision === 'rejected') {
    return buildPoApprovalChain({ approvedLevels: approved, rejectedLevel: level, notes, actedAt })
  }
  return buildPoApprovalChain({
    approvedLevels: [...new Set([...approved, level])],
    notes,
    actedAt
  })
}

/** Fresh PO upload — AP Team preparer step auto-completed */
export function buildFreshPoUploadChain(uploadNote = 'Invoice uploaded & OCR extracted') {
  return buildPoApprovalChain({
    approvedLevels: [1],
    notes: { 1: uploadNote },
    actedAt: { 1: new Date().toISOString() }
  })
}

/** Non-PO upload — preparer (L1) reviews & parks; downstream steps wait */
export function buildNonPoPostingChain() {
  return buildPoApprovalChain({
    approvedLevels: [],
    notes: {},
    actedAt: {}
  })
}

export function isNonPoInvoiceWorkflow(invoice) {
  const fileName = invoice?.file_name || invoice?.fileName || ''
  if (
    hasPoWorkflowSignals({
      header: invoice?.ocr?.header,
      poNumber: invoice?.po_number,
      batchDocumentTypes: invoice?.batch_document_types,
      ocrByType: invoice?.ocr_by_type,
      classification: invoice?.classification,
      fileName
    })
  ) {
    return false
  }
  if (invoice?.invoice_workflow === 'PO') return false
  if (invoice?.invoice_workflow === 'NON_PO') return true
  return !invoice?.po_number
}

/** Map portal invoice status to how far the PO chain has progressed */
export function buildPoApprovalChainForStatus(status = '') {
  const s = String(status).toLowerCase()
  if (s === 'posted' || s === 'paid' || s === 'approved') {
    return buildPoApprovalChain({
      approvedLevels: [1, 2, 3, 4],
      notes: { 4: 'Posting approved' },
      actedAt: { 1: null, 2: null, 3: null, 4: null }
    })
  }
  if (s === 'rejected') {
    return buildPoApprovalChain({
      approvedLevels: [1],
      rejectedLevel: 2,
      notes: { 2: 'Rejected during review' }
    })
  }
  if (s === 'pending_approval' || s === 'pending') {
    return buildPoApprovalChain({
      approvedLevels: [1, 2],
      notes: { 2: 'Extraction reviewed' }
    })
  }
  return buildFreshPoUploadChain()
}

export function resolvePoApprovals(invoice) {
  if (isNonPoInvoiceWorkflow(invoice)) {
    return resolveNonPoApprovals(invoice)
  }

  if (invoice?.approvals?.length) {
    const usesPoRoles = invoice.approvals.some((a) =>
      ['ap_team', 'ap_supervisor', 'ap_lead', 'finance_manager'].includes(a.role)
    )
    if (usesPoRoles) return invoice.approvals
  }

  return buildPoApprovalChainForStatus(invoice?.status)
}
