import { Router } from "express";
import essaVendorController from "../../controllers/essaVendor.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const essaVendorRoutes = Router();

essaVendorRoutes.get(
  "/",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.VENDOR
  ]),
  (req, res, next) => essaVendorController.list(req, res, next)
);

essaVendorRoutes.get(
  "/:code",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.VENDOR
  ]),
  (req, res, next) => essaVendorController.detail(req, res, next)
);

essaVendorRoutes.post(
  "/:code/control",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) => essaVendorController.updateControl(req, res, next)
);

export default essaVendorRoutes;
