import { Op } from "sequelize";
import { Authenticate } from "../middleware/authentication";
import userService from "./user.service";
import { User } from "../models/user";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";

export type PortalSessionUser = {
  id: number;
  vendor_id: number | null;
  CoCd: string | null;
  emp_id: number | null;
  email: string;
  vendorCode: string | null;
  role_id: number;
  Employee_Id: number | null;
  name: string | null;
  Is_PO_Inline: boolean | null;
};

export type PortalLoginPayload = PortalSessionUser & {
  token?: string;
  Is_Supplier: boolean | null;
  New_Login: boolean | null;
  Non_PO_Access: boolean | null;
  Vendor_Role: string | null;
  auth_provider: string;
  entra_roles?: string[];
};

const findActiveUserByEmail = async (email: string) => {
  return userService.getUserService({
    Email: { [Op.iLike]: email },
    Is_Active: true,
  });
};

export const resolvePortalUserByEmail = async (
  email: string,
  providerLabel: string,
) => {
  const portalEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!portalEmail) {
    throw new APIError(
      `${providerLabel} profile did not include an email`,
      StatusCodeEnum.HTTP_BAD_REQUEST,
    );
  }

  const userExist: any = await findActiveUserByEmail(portalEmail);
  if (!userExist) {
    throw new APIError(
      `No active portal user found for ${providerLabel} email: ${portalEmail}`,
      StatusCodeEnum.HTTP_BAD_REQUEST,
    );
  }

  await User.update(
    { Last_Login: new Date() },
    { where: { ID: userExist.ID } },
  );

  return userExist;
};

export const toPortalSessionUser = (userExist: any): PortalSessionUser => ({
  id: userExist?.ID,
  vendor_id: userExist?.Vendor_Id ?? null,
  CoCd: userExist?.CoCd ?? null,
  emp_id: userExist?.Employee_Id ?? null,
  email: userExist?.Email,
  vendorCode: userExist?.vendor?.Vendor_SAP_Code ?? null,
  role_id: userExist?.Role_id,
  Employee_Id: userExist?.Employee_Id ?? null,
  name: userExist?.Name ?? null,
  Is_PO_Inline: userExist?.vendor?.Is_PO_Inline ?? null,
});

export const toPortalLoginPayload = (
  userExist: any,
  authProvider: string,
  options: { includeToken?: boolean; rememberMe?: boolean; entraRoles?: string[] } = {},
): PortalLoginPayload => {
  const sessionUser = toPortalSessionUser(userExist);
  const data: PortalLoginPayload = {
    ...sessionUser,
    Is_Supplier: userExist?.Is_Supplier ?? null,
    New_Login: userExist?.New_Login ?? null,
    Non_PO_Access: userExist?.vendor?.Non_PO_Access ?? null,
    Vendor_Role: userExist?.Vendor_Role ?? null,
    auth_provider: authProvider,
  };

  if (options.entraRoles?.length) {
    data.entra_roles = options.entraRoles;
  }

  if (options.includeToken) {
    data.token =
      "Bearer " + Authenticate.generateToken(sessionUser, Boolean(options.rememberMe));
  }

  return data;
};
