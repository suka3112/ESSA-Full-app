import { Router } from "express";
import essaPurchaseOrderController from "../../controllers/essaPurchaseOrder.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const essaPurchaseOrderRoutes = Router();

const auth = Authenticate.isValidateUser([
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.BUSINESS,
  UserRole.VENDOR,
]);

essaPurchaseOrderRoutes.get("/", auth, (req, res, next) =>
  essaPurchaseOrderController.list(req, res, next),
);

export default essaPurchaseOrderRoutes;
