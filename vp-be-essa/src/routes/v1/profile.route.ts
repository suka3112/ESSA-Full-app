import { Router } from "express";
import profileController from "../../controllers/profile.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import { checkEntityId } from "../../middleware/customCheck.middleware";

const profileRoutes = Router();

profileRoutes.get(
  "/getVendor",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
    UserRole.VENDOR,
  ]),
  (req, res, next) => profileController.getVendorV1(req, res, next),
);

profileRoutes.get("/getOnboardVendor", (req, res, next) =>
  profileController.getOnboardVendorV1(req, res, next),
);

profileRoutes.get(
  "/getVendorV1",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => profileController.getVendorV1(req, res, next),
);

profileRoutes.put(
  "/editVendor",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.ADMIN,
    UserRole.BUSINESS,
  ]),
  (req, res, next) => profileController.editVendor(req, res, next),
);

profileRoutes.post(
  "/vendor/addSubUser",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.VENDOR]),
  (req, res, next) => profileController.addSubUser(req, res, next),
);

profileRoutes.post(
  "/vendor/approve",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.VENDOR]),
  (req, res, next) => profileController.approveSubUser(req, res, next),
);

profileRoutes.get(
  "/vendor/listSubUser",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => profileController.listSubUser(req, res),
);

profileRoutes.post(
  "/vendor/addExtension",
  Authenticate.isValidateUser([UserRole.VENDOR]),
  (req, res, next) => profileController.addEntity(req, res, next),
);

profileRoutes.get(
  "/vendor/listExtension",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => profileController.listExtension(req, res, next),
);

profileRoutes.post(
  "/vendor/extension/approve",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  checkEntityId,
  (req, res, next) => profileController.approveExtension(req, res, next),
);

profileRoutes.patch(
  "/image",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => profileController.UpdateProfileImage(req, res, next),
);

profileRoutes.get(
  "/image",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => profileController.getProfileImage(req, res, next),
);

profileRoutes.delete(
  "/deleteProfileImage",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => profileController.deleteProfileImage(req, res, next),
);

profileRoutes.post("/update/status", Authenticate.loginAccess, (req, res) =>
  profileController.trackUpdates(req, res),
);

export default profileRoutes;
