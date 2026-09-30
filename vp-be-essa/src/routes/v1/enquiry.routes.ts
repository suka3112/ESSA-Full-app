import { Router } from "express";
import EnquiryController from "../../controllers/enquiry.controller";
import { Authenticate } from "../../middleware/authentication";
import { RequestValidator } from "../../middleware/requestValidator";
import enquiryValidations from "../../validations/enquiry.validations";
import { UserRole } from "../../utils/enums/role.enum";
import { checkEntityId } from "../../middleware/customCheck.middleware";

const enquiryRoutes = Router();

enquiryRoutes.post(
  "/createEnquiry",
  Authenticate.isValidateUser([UserRole.VENDOR, UserRole.ADMIN]),
  (req, res, next) => EnquiryController.createEnquiry(req, res, next),
);

enquiryRoutes.get(
  "/getEnquiry",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.ADMIN,
    UserRole.BUSINESS,
  ]),
  checkEntityId,
  (req, res, next) => EnquiryController.getEnquiries(req, res, next),
);

enquiryRoutes.get(
  "/getEnquiry/:id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => EnquiryController.getEnquiriesById(req, res, next),
);

enquiryRoutes.get(
  "/downloadEnquiry",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => EnquiryController.downloadEnquiriesCSV(req, res, next),
);

enquiryRoutes.get("/getEnquiriesFinance", (req, res) =>
  EnquiryController.getEnquiriesFinance(req, res),
);

enquiryRoutes.get(
  "/downloadEnquiryFinance",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  RequestValidator.checkValidate(enquiryValidations.downloadEnquirySchema),
  (req, res) => EnquiryController.downloadEnquiriesFinanceCSV(req, res),
);

enquiryRoutes.get(
  "/sendEnquiryFinace",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  RequestValidator.checkValidate(enquiryValidations.sendEnquirySchema),
  (req, res) => EnquiryController.sendEnquiryFinanceReport(req, res),
);

enquiryRoutes.get(
  "/sendEnquiry",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res) => EnquiryController.sendEnquiryReport(req, res),
);

enquiryRoutes.patch(
  "/editEnquiry/:id",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.ADMIN,
    UserRole.BUSINESS,
  ]),
  checkEntityId,
  (req, res, next) => EnquiryController.editEnquiry(req, res, next),
);

enquiryRoutes.patch(
  "/approve-reject/:id",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.ADMIN,
    UserRole.BUSINESS,
  ]),
  (req, res, next) => EnquiryController.updateEnquiryStatus(req, res, next),
);

enquiryRoutes.post(
  "/updateAssignedPerson",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.ADMIN,
    UserRole.BUSINESS,
  ]),
  (req, res, next) => EnquiryController.updateAssignedPerson(req, res, next),
);

enquiryRoutes.get(
  "/getEnquiryDashboard",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.ADMIN,
    UserRole.BUSINESS,
  ]),
  checkEntityId,
  (req, res, next) => EnquiryController.getEnquiriesDashboard(req, res, next),
);

export default enquiryRoutes;
