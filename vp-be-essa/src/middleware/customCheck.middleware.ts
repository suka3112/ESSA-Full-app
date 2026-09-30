import { Response, NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
export const checkEntityId = (req: any, res: Response, next: NextFunction) => {
  const query = req.query as any;
  const user = req.user as any;

  // Check entity_id
  if (!query?.entity_id) {
    throw new APIError(
      "entity_id is required",
      StatusCodeEnum.HTTP_BAD_REQUEST,
    );
  }

  // Inject vendor_id for role 1
  if (user?.role_id === 1 && user?.vendor_id) {
    query.Vendor_id = user?.vendor_id;
    query.isVendor = true;
  }
  next();
};
