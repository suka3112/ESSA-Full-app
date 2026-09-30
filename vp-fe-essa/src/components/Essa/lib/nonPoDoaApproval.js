/**
 * Non-PO invoice approval per Delegation of Authority (DoA) matrix.
 * Amount bands match ApprovalMatrix / ESSA DoA for invoices without PO.
 */

export const NON_PO_DOA_RULES = [
  { amount_min: 0, amount_max: 2_000_000, level: 1, role: 'hos', description: 'HOS sign-off' },
  { amount_min: 2_000_000, amount_max: 5_000_000, level: 1, role: 'hos', description: 'HOS reviews' },
  { amount_min: 2_000_000, amount_max: 5_000_000, level: 2, role: 'hod', description: 'HOD final approval' },
  { amount_min: 5_000_000, amount_max: 15_000_000, level: 1, role: 'hod', description: 'HOD reviews' },
  { amount_min: 5_000_000, amount_max: 15_000_000, level: 2, role: 'hof', description: 'HOF final approval' },
  { amount_min: 15_000_000, amount_max: 50_000_000, level: 1, role: 'hod', description: 'HOD reviews' },
  { amount_min: 15_000_000, amount_max: 50_000_000, level: 2, role: 'hof', description: 'HOF reviews' },
  { amount_min: 15_000_000, amount_max: 50_000_000, level: 3, role: 'sth', description: 'Site Head final approval' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 1, role: 'hod', description: 'HOD reviews' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 2, role: 'hof', description: 'HOF reviews' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 3, role: 'sth', description: 'Site Head reviews' },
  { amount_min: 50_000_000, amount_max: 100_000_000, level: 4, role: 'gfd', description: 'GFD final approval' },
  { amount_min: 100_000_000, amount_max: null, level: 1, role: 'hod', description: 'HOD reviews (>100M IDR)' },
  { amount_min: 100_000_000, amount_max: null, level: 2, role: 'hof', description: 'HOF reviews' },
  { amount_min: 100_000_000, amount_max: null, level: 3, role: 'sth', description: 'Site Head reviews' },
  { amount_min: 100_000_000, amount_max: null, level: 4, role: 'gfd', description: 'GFD final approval' }
]

const ROLE_META = {
  hos: { label: 'HOS', title: 'Head of Section', action: 'Approver' },
  hod: { label: 'HOD', title: 'Head of Department', action: 'Approver' },
  hof: { label: 'HOF', title: 'Head of Function', action: 'Approver' },
  sth: { label: 'STH', title: 'Operations & Site Head', action: 'Approver' },
  gfd: { label: 'GFD', title: 'Group Functional Director', action: 'Approver' }
}

export const ESSA_DOA_ACTORS = {
  hos: {
    approver_id: 'E005',
    approver_name: 'Budi Hartono',
    approver_email: 'hos@essa.com'
  },
  hod: {
    approver_id: 'E006',
    approver_name: 'Made Wirawan',
    approver_email: 'hod@essa.com'
  },
  hof: {
    approver_id: 'E007',
    approver_name: 'Anastasia Putri',
    approver_email: 'hof@essa.com'
  },
  sth: {
    approver_id: 'E008',
    approver_name: 'Robinson Selvaraj',
    approver_email: 'sth@essa.com'
  },
  gfd: {
    approver_id: 'E009',
    approver_name: 'Anas Reksoatmodjo',
    approver_email: 'gfd@essa.com'
  }
}

function normalizeAmount(amount) {
  const n = Number(amount)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Resolve DoA approver roles for a non-PO invoice amount (IDR). */
export function chainRolesForAmount(amount) {
  const amt = normalizeAmount(amount)
  if (amt <= 2_000_000) return ['hos']
  if (amt <= 5_000_000) return ['hos', 'hod']
  if (amt <= 15_000_000) return ['hod', 'hof']
  if (amt <= 50_000_000) return ['hod', 'hof', 'sth']
  return ['hod', 'hof', 'sth', 'gfd']
}

function rulesForAmount(amount) {
  const amt = normalizeAmount(amount)
  let bandMin = 0
  let bandMax = 2_000_000
  if (amt <= 2_000_000) {
    bandMin = 0
    bandMax = 2_000_000
  } else if (amt <= 5_000_000) {
    bandMin = 2_000_000
    bandMax = 5_000_000
  } else if (amt <= 15_000_000) {
    bandMin = 5_000_000
    bandMax = 15_000_000
  } else if (amt <= 50_000_000) {
    bandMin = 15_000_000
    bandMax = 50_000_000
  } else if (amt <= 100_000_000) {
    bandMin = 50_000_000
    bandMax = 100_000_000
  } else {
    bandMin = 100_000_000
    bandMax = null
  }

  return NON_PO_DOA_RULES.filter(
    (r) => r.amount_min === bandMin && (r.amount_max ?? null) === (bandMax ?? null)
  ).sort((a, b) => a.level - b.level)
}

export function formatNonPoDoaFlow(amount) {
  return chainRolesForAmount(amount)
    .map((role) => ROLE_META[role]?.label || role.toUpperCase())
    .join(' → ')
}

/**
 * @param {object} opts
 * @param {number} opts.amount
 * @param {number[]} [opts.approvedLevels]
 * @param {number|null} [opts.rejectedLevel]
 * @param {Record<number, string>} [opts.notes]
 * @param {Record<number, string>} [opts.actedAt]
 */
export function buildNonPoDoaChain({
  amount,
  approvedLevels = [],
  rejectedLevel = null,
  notes = {},
  actedAt = {}
} = {}) {
  const rules = rulesForAmount(amount)

  return rules.map((rule) => {
    const meta = ROLE_META[rule.role] || { label: rule.role.toUpperCase(), title: rule.role, action: 'Approver' }
    const actor = ESSA_DOA_ACTORS[rule.role] || {
      approver_id: rule.role,
      approver_name: meta.label,
      approver_email: null
    }

    let status = 'pending'
    if (rejectedLevel === rule.level) {
      status = 'rejected'
    } else if (approvedLevels.includes(rule.level)) {
      status = 'approved'
    }

    return {
      id: `npo-doa-${rule.level}`,
      level: rule.level,
      role: rule.role,
      role_label: `${meta.action} · ${meta.title}`,
      approver_id: actor.approver_id,
      approver_name: actor.approver_name,
      approver_email: actor.approver_email,
      description: rule.description,
      status,
      note: notes[rule.level] || null,
      acted_at:
        status === 'approved' || status === 'rejected' ? actedAt[rule.level] || null : null
    }
  })
}

export function buildNonPoDoaChainForStatus(invoice = {}) {
  const amount = invoice.total_amount ?? invoice.subtotal ?? 0
  const status = String(invoice?.status || '').toLowerCase()

  if (status === 'posted' || status === 'paid' || status === 'approved') {
    const levels = chainRolesForAmount(amount).map((_, i) => i + 1)
    return buildNonPoDoaChain({
      amount,
      approvedLevels: levels,
      notes: { [levels.length]: 'Posting approved' }
    })
  }

  if (status === 'rejected') {
    return buildNonPoDoaChain({
      amount,
      rejectedLevel: 1,
      notes: { 1: 'Returned for correction' }
    })
  }

  if (status === 'parked' || status === 'pending_approval') {
    return buildNonPoDoaChain({
      amount,
      approvedLevels: [1],
      notes: { 1: 'Invoice parked — awaiting next approver' }
    })
  }

  return buildNonPoDoaChain({ amount, approvedLevels: [] })
}

export function advanceNonPoDoaChain(chain, level, decision, note, amount) {
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
    return buildNonPoDoaChain({
      amount,
      approvedLevels: approved,
      rejectedLevel: level,
      notes,
      actedAt
    })
  }

  return buildNonPoDoaChain({
    amount,
    approvedLevels: [...new Set([...approved, level])],
    notes,
    actedAt
  })
}

const DOA_ROLES = new Set(['hos', 'hod', 'hof', 'sth', 'gfd'])

export function isDoaApprovalChain(chain = []) {
  return chain.some((s) => DOA_ROLES.has(s.role))
}

const AP_POSTING_ROLES = new Set(['ap_team', 'ap_supervisor', 'ap_lead', 'finance_manager'])

export function resolveNonPoApprovals(invoice) {
  const amount = invoice?.total_amount ?? invoice?.subtotal ?? 0
  const existing = invoice?.approvals || []

  if (existing.some((a) => AP_POSTING_ROLES.has(a.role))) {
    return buildNonPoDoaChainForStatus(invoice)
  }

  if (existing.length && isDoaApprovalChain(existing)) {
    const expectedLen = chainRolesForAmount(amount).length
    if (existing.length === expectedLen) return existing
  }

  return buildNonPoDoaChainForStatus(invoice)
}
