import { UserRole } from "../enums/role.enum";

export const FORGOT_PASSWORD_URL: Record<number, string> = {
  [UserRole.VENDOR]: `${process.env.FE_URL}/auth/reset-password`,
  [UserRole.FINANCE]: `${process.env.FE_URL}/finance/reset-password`,
  [UserRole.BUSINESS]: `${process.env.FE_URL}/business/reset-password`,
  [UserRole.ADMIN]: `${process.env.FE_URL}/admin/reset-password`,
};
