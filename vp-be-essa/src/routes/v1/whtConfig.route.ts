/**
 * WHT configuration (rule matrix, tax treaty rates, vendor SKB/PP23, SBUJK)
 * Mounted at: /vendor-portal/wht-config
 */
import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import whtConfigController from "../../controllers/whtConfig.controller";

const whtConfigRoutes = Router();

const auth = Authenticate.isValidateUser([
  UserRole.FINANCE,
  UserRole.ADMIN,
  UserRole.BUSINESS,
]);

whtConfigRoutes.get("/", auth, (req, res, next) => whtConfigController.list(req, res, next));
whtConfigRoutes.post("/evaluate", auth, (req, res, next) => whtConfigController.evaluate(req, res, next));
whtConfigRoutes.post("/:entity", auth, (req, res, next) => whtConfigController.create(req, res, next));
whtConfigRoutes.patch("/:entity/:id", auth, (req, res, next) => whtConfigController.update(req, res, next));
whtConfigRoutes.delete("/:entity/:id", auth, (req, res, next) => whtConfigController.remove(req, res, next));

export default whtConfigRoutes;
