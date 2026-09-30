import { Router } from "express";
const dashboardRoutes = Router();

import DashboardController from "../../controllers/dashboard.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

dashboardRoutes.get(
  "/vendorDashboard",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => DashboardController.getVendorDashboard(req, res),
);

export default dashboardRoutes;
