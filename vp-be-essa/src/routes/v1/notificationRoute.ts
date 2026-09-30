import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import notificationController from "../../controllers/notificationController";
import { UserRole } from "../../utils/enums/role.enum";

const notificationRoutes = Router();

notificationRoutes.get(
  "/pullNotification",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => notificationController.notifications(req, res),
);
notificationRoutes.put(
  "/",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => notificationController.notificationsUpdate(req, res),
);

notificationRoutes.post(
  "/create",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => notificationController.createNotification(req, res),
);

notificationRoutes.put(
  "/clearNotification",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => notificationController.clearNotification(req, res),
);

export default notificationRoutes;
