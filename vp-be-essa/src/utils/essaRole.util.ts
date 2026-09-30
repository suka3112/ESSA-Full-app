import { UserRole } from "./enums/role.enum";

const ROLE_ID_TO_ESSA_SLUG: Record<number, string> = {
  [UserRole.AP_TEAM]: "ap_team",
  [UserRole.AP_SUPERVISOR]: "ap_supervisor",
  [UserRole.AP_LEAD]: "ap_lead",
  [UserRole.FINANCE_MANAGER]: "finance_manager",
  [UserRole.HOS]: "hos",
  [UserRole.HOD]: "hod",
  [UserRole.HOF]: "hof",
  [UserRole.STH]: "sth",
  [UserRole.GFD]: "gfd",
};

export function essaRoleSlug(roleId?: number | null): string | null {
  if (!roleId) return null;
  return ROLE_ID_TO_ESSA_SLUG[roleId] ?? null;
}

export function isEssaFinanceRole(roleId?: number | null): boolean {
  return roleId != null && roleId in ROLE_ID_TO_ESSA_SLUG;
}
