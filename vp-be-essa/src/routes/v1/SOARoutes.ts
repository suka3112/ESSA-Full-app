import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import soaController from "../../controllers/soaController";
import upload from "../../middleware/fileUpload";
import { UserRole } from "../../utils/enums/role.enum";
import { checkEntityId } from "../../middleware/customCheck.middleware";

const SOARoutes = Router();

SOARoutes.post(
  "/uploadSOA",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  upload.single("file"),
  (req, res, next) => soaController.ValidateSOA(req, res, next),
);
SOARoutes.post(
  "/soaListing",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.saoListing(req, res, next),
);

SOARoutes.post(
  "/soaListingByMonth",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.soaListingByMonth(req, res, next),
);

SOARoutes.put(
  "/editSOA",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.editSOA(req, res, next),
);

SOARoutes.put(
  "/updateInvType",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.updateInvType(req, res, next),
);

SOARoutes.get(
  "/soaHistory",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => soaController.saoHistory(req, res, next),
);

SOARoutes.get(
  "/getOneSOA",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.getOneSOA(req, res, next),
);

SOARoutes.get(
  "/soaListing/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => soaController.soaExport(req, res, next),
);
SOARoutes.post(
  "/soaListing/emailReport",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.mailsoa(req, res, next),
);

SOARoutes.post(
  "/soaListingDashboard",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.saoListingDashboard(req, res, next),
);

SOARoutes.post(
  "/saoDashboardPendingReconcilation",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    soaController.saoDashboardPendingReconcilation(req, res, next),
);

SOARoutes.post(
  "/saoListingPayableMonth",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.saoListingPayableMonth(req, res, next),
);

SOARoutes.get(
  "/soalist/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => soaController.StatementOfAccountExport(req, res, next),
);

SOARoutes.post("/clearSOA", (req, res, next) =>
  soaController.clearSOA(req, res, next),
);

SOARoutes.post("/clearlogisInvoice", (req, res, next) =>
  soaController.clearlogisInvoice(req, res, next),
);

export default SOARoutes;
