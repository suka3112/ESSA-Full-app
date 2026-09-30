import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import logisticInvoiveController from "../../controllers/logisticInvoive.controller";
import { UserRole } from "../../utils/enums/role.enum";

const logisticInvoiceRoutes = Router();

logisticInvoiceRoutes.post(
  "/createInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.createInvoice(req, res),
);

logisticInvoiceRoutes.patch(
  "/submitLogisticsInvoice/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.submitLogisticsInvoice(req, res),
);

logisticInvoiceRoutes.get(
  "/getInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.getLogisticInvoices(req, res),
);

logisticInvoiceRoutes.get(
  "/getInvoicesById",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.getLogisticInvoicesById(req, res),
);

logisticInvoiceRoutes.get(
  "/downloadInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.downloadLogisticInvoicesCSV(req, res),
);

logisticInvoiceRoutes.get(
  "/sendInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.sendLogisticInvoiceReport(req, res),
);

logisticInvoiceRoutes.get(
  "/downloadMonthlyInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) =>
    logisticInvoiveController.downloadMonthlyLogisticInvoicesCSV(req, res),
);

logisticInvoiceRoutes.get(
  "/sendMonthlyInvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) =>
    logisticInvoiveController.sendMonthlyLogisticInvoiceReport(req, res),
);

logisticInvoiceRoutes.get(
  "/getInvoiceById/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.getLogisticInvoiceById(req, res),
);

logisticInvoiceRoutes.put(
  "/editInvoiceById/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => logisticInvoiveController.editLogisticInvoice(req, res),
);

export default logisticInvoiceRoutes;
