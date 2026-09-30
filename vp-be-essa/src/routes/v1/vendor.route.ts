import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import vendorController from "../../controllers/vendor.controller";
import { UserRole } from "../../utils/enums/role.enum";
import { checkEntityId } from "../../middleware/customCheck.middleware";

const vendorRoutes = Router();

vendorRoutes.use(
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
);

vendorRoutes.get("/", checkEntityId, (req, res, next) =>
  vendorController.getVendor(req, res, next),
);

vendorRoutes.get("/vendorDropdown", (req, res, next) =>
  vendorController.vendorDropdown(req, res, next),
);
vendorRoutes.get("/vendorDropdownApplication", (req, res, next) =>
  vendorController.vendorDropdownApplication(req, res, next),
);

vendorRoutes.get(
  "/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.getVendorExport(req, res, next),
);
vendorRoutes.get(
  "/applications",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.getVendorApplication(req, res, next),
);

vendorRoutes.get(
  "/applications/export",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => vendorController.vendorApplicationExport(req, res),
);

vendorRoutes.get(
  "/applications/details",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    vendorController.getVendorApplicationDetails(req, res, next),
);

vendorRoutes.post(
  "/application/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.vendorApproval(req, res, next),
);

vendorRoutes.post(
  "/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.vendorApproval(req, res, next),
);

vendorRoutes.get(
  "/vendorUpdates",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.getVendorUpdates(req, res, next),
);

vendorRoutes.get(
  "/entityUpdates",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.entityUpdates(req, res, next),
);

vendorRoutes.get(
  "/vendorUpdateDetail",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.getVendorUpdateDetails(req, res, next),
);

vendorRoutes.get(
  "/entityUpdateDetail",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => vendorController.entityUpdateDetail(req, res, next),
);

vendorRoutes.post(
  "/updates/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    vendorController.vendorUpdatesApproveReject(req, res, next),
);

vendorRoutes.post(
  "/entity/approve-reject",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) =>
    vendorController.vendorEntityApproveReject(req, res, next),
);

vendorRoutes.patch("/inlineUpdate", (req, res, next) =>
  vendorController.inlineUpdate(req, res, next),
);

vendorRoutes.patch("/nonPOAccess", (req, res, next) =>
  vendorController.nonPOAccess(req, res, next),
);

//exports
vendorRoutes.get("/vendorUpdates/export", (req, res, next) =>
  vendorController.vendorUpdatesExport(req, res, next),
);

vendorRoutes.get("/update/details/export", (req, res, next) =>
  vendorController.VendorUpdateDetailsExport(req, res, next),
);

vendorRoutes.get("/vendorExtension/export", (req, res, next) =>
  vendorController.vendorExtensionExport(req, res, next),
);

vendorRoutes.post("/cron", (req, res, next) =>
  vendorController.VendorCron(req, res, next),
);

vendorRoutes.post("/cronV1", (req, res, next) =>
  vendorController.VendorCronV1(req, res, next),
);

vendorRoutes.get("/getHistory", (req, res, next) =>
  vendorController.getVendorHistory(req, res, next),
);

vendorRoutes.patch(
  "/updateStatus",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.BUSINESS]),
  (req, res, next) => vendorController.updateVendor(req, res, next),
);
export default vendorRoutes;
