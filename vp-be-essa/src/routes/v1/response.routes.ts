import { Router } from "express";
import responseController from "../../controllers/response.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const responseRoutes = Router();

responseRoutes.post(
  "/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => responseController.addResponse(req, res, next),
);
responseRoutes.get(
  "/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => responseController.getResponsesByEnquiry(req, res, next),
);

export default responseRoutes;
