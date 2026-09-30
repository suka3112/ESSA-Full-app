export enum UserRole {
    VENDOR = 1,
    FINANCE = 2,
    BUSINESS = 3,
    ADMIN = 4,
    AP_TEAM = 5,
    AP_SUPERVISOR = 6,
    /** IDs 7–13 are occupied by legacy DC/procurement roles in some DBs */
    AP_LEAD = 14,
    FINANCE_MANAGER = 15,
    HOS = 16,
    HOD = 17,
    HOF = 18,
    STH = 19,
    GFD = 20,
}

/** ESSA internal AP posting chain */
export const ESSA_AP_ROLES = [
    UserRole.AP_TEAM,
    UserRole.AP_SUPERVISOR,
    UserRole.AP_LEAD,
    UserRole.FINANCE_MANAGER,
] as const;

/** Non-PO DoA approvers (ESSA portal) */
export const ESSA_DOA_ROLES = [
    UserRole.HOS,
    UserRole.HOD,
    UserRole.HOF,
    UserRole.STH,
    UserRole.GFD,
] as const;

export const ESSA_PORTAL_ROLES = [...ESSA_AP_ROLES, ...ESSA_DOA_ROLES] as const;

export const FINANCE_PORTAL_ROLES = [
    UserRole.FINANCE,
    ...ESSA_PORTAL_ROLES,
] as const;

export function isFinancePortalRole(roleId?: number | null): boolean {
    if (roleId == null) return false;
    return (FINANCE_PORTAL_ROLES as readonly number[]).includes(roleId);
}

export function expandAllowedRoles(allowedRoles: UserRole[]): number[] {
    const expanded: number[] = [...allowedRoles];
    if (allowedRoles.includes(UserRole.FINANCE)) {
        expanded.push(...ESSA_PORTAL_ROLES);
    }
    return [...new Set(expanded)];
}
