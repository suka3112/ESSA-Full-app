import { FINANCE_USER_TYPE } from './userType'

/** Portal role_id → ESSA workflow slug (Phase 1 internal AP) */
export const ROLE_ID_TO_ESSA_SLUG = {
  5: 'ap_team',
  6: 'ap_supervisor',
  14: 'ap_lead',
  15: 'finance_manager',
  16: 'hos',
  17: 'hod',
  18: 'hof',
  19: 'sth',
  20: 'gfd'
}

/** Portal role_id → sidebar userType */
export const ROLE_ID_TO_USER_TYPE = {
  5: FINANCE_USER_TYPE,
  6: FINANCE_USER_TYPE,
  14: FINANCE_USER_TYPE,
  15: FINANCE_USER_TYPE,
  16: FINANCE_USER_TYPE,
  17: FINANCE_USER_TYPE,
  18: FINANCE_USER_TYPE,
  19: FINANCE_USER_TYPE,
  20: FINANCE_USER_TYPE
}

export function essaSlugFromRoleId(roleId) {
  return ROLE_ID_TO_ESSA_SLUG[roleId] || null
}

export function persistEssaRole(roleId) {
  const slug = essaSlugFromRoleId(roleId)
  if (slug) {
    localStorage.setItem('essa_role', slug)
  } else {
    localStorage.removeItem('essa_role')
  }
}

export function getStoredEssaRole() {
  return localStorage.getItem('essa_role')
}
