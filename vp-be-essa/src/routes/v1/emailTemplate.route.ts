import { Router } from "express";
import emailTemplateController from "../../controllers/emailTemplate.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const emailTemplateRoutes = Router();

const readRoles = [UserRole.ADMIN, UserRole.FINANCE];
const writeRoles = [UserRole.ADMIN];

emailTemplateRoutes.get(
  "/",
  Authenticate.isValidateUser(readRoles),
  (req, res, next) => emailTemplateController.list(req, res, next),
);

emailTemplateRoutes.post(
  "/preview",
  Authenticate.isValidateUser(readRoles),
  (req, res, next) => emailTemplateController.preview(req, res, next),
);

emailTemplateRoutes.post(
  "/",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.create(req, res, next),
);

emailTemplateRoutes.get(
  "/:id",
  Authenticate.isValidateUser(readRoles),
  (req, res, next) => emailTemplateController.getById(req, res, next),
);

emailTemplateRoutes.put(
  "/:id",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.update(req, res, next),
);

emailTemplateRoutes.post(
  "/:id/duplicate",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.duplicate(req, res, next),
);

emailTemplateRoutes.post(
  "/:id/status",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.setStatus(req, res, next),
);

emailTemplateRoutes.post(
  "/:id/restore",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.restore(req, res, next),
);

emailTemplateRoutes.post(
  "/:id/test",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.testSend(req, res, next),
);

emailTemplateRoutes.delete(
  "/:id",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => emailTemplateController.remove(req, res, next),
);

export default emailTemplateRoutes;
