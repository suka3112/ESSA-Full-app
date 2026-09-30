import { Router } from "express";
const advancePaymentRoutes = Router();
import { Authenticate } from "../../middleware/authentication";
import AdvancePaymentController from "../../controllers/advancePayment.controller";
import { RequestValidator } from "../../middleware/requestValidator";
import advancePaymentValidations from "../../validations/advancePayment.validations";
import { UserRole } from "../../utils/enums/role.enum";
import { checkEntityId } from "../../middleware/customCheck.middleware";

advancePaymentRoutes.post(
  "/createAdvancePayment",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    AdvancePaymentController.createAdvancePayment(req, res, next),
);

advancePaymentRoutes.post(
  "/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    AdvancePaymentController.advancePaymentApproval(req, res, next),
);

advancePaymentRoutes.patch(
  "/submitAdvancePayment/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    AdvancePaymentController.submitAdvancePayment(req, res, next),
);

advancePaymentRoutes.get(
  "/getAdvancePayment",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  checkEntityId,
  RequestValidator.checkValidate(
    advancePaymentValidations.getAdvancePaymentsSchema,
  ),
  (req, res, next) =>
    AdvancePaymentController.getAdvancePayments(req, res, next),
);

advancePaymentRoutes.get(
  "/getinvoice",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => AdvancePaymentController.getInvoice(req, res, next),
);

advancePaymentRoutes.get(
  "/getAdvancePayment/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    AdvancePaymentController.getAdvancePaymentById(req, res, next),
);

advancePaymentRoutes.get(
  "/downloadAdvancePayment",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  RequestValidator.checkValidate(
    advancePaymentValidations.getAdvancePaymentsForCSVSchema,
  ),
  (req, res, next) =>
    AdvancePaymentController.downloadAdvancePaymentsCSV(req, res, next),
);

advancePaymentRoutes.get(
  "/sendAdvancePayment",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) =>
    AdvancePaymentController.sendAdvancePaymentReport(req, res, next),
);

advancePaymentRoutes.delete(
  "/deleteAdvancePayment",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    AdvancePaymentController.deleteAdvancePayment(req, res, next),
);

export default advancePaymentRoutes;
