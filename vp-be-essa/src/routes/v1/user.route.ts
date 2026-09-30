import { Router } from "express";
import UserController from "../../controllers/user.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import { upload } from "../../middleware/imageUploads";
import { uploadV1 } from "../../middleware/imageUploadV1";

const userRoutes = Router();

userRoutes.post(
  "/inviteVendor",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.inviteVendor(req, res, next),
);

userRoutes.post("/registerVendor", (req, res, next) =>
  UserController.registerVendor(req, res, next),
);

userRoutes.get("/trackMyApplication", (req, res, next) =>
  UserController.trackMyApplication(req, res, next),
);

userRoutes.post("/login", (req, res, next) =>
  UserController.userLogin(req, res, next),
);

userRoutes.post("/setupAuthenticator", (req, res, next) =>
  UserController.authenticatorSetup(req, res, next),
);

userRoutes.get("/validateTOtp", (req, res, next) =>
  UserController.otpValidate(req, res, next),
);

userRoutes.get("/resendOTP", (req, res, next) =>
  UserController.resendOTP(req, res, next),
);

userRoutes.get(
  "/validateOtp",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.otpValidate(req, res, next),
);

userRoutes.post(
  "/resetPassword",
  Authenticate.isValidateUser([
    //second Api
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.resetPassword(req, res, next),
);
userRoutes.post("/forgotPassword", (req, res, next) =>
  UserController.forgotPassword(req, res, next),
);

userRoutes.post(
  "/passwordResetValidation",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.passwordReset(req, res, next),
);

userRoutes.post(
  "/resetPasswordValidation",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.validateResetPassword(req, res, next),
);
userRoutes.post("/forgotPasswordValidation", (req, res, next) =>
  UserController.validateResetPassword(req, res, next),
);

userRoutes.get("/countries", (req, res) =>
  UserController.getCountries(req, res),
);
userRoutes.get("/cities", (req, res) => UserController.getCities(req, res));
userRoutes.get("/regions", (req, res) => UserController.getRegions(req, res));
userRoutes.get("/currencies", (req, res) =>
  UserController.getCurrencies(req, res),
);
userRoutes.get("/industryKeys", (req, res) =>
  UserController.getIndustryKeys(req, res),
);

userRoutes.get("/dropdowns", (req, res) => UserController.dropdowns(req, res));

userRoutes.get(
  "/crPerson",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.crPerson(req, res, next),
);
userRoutes.get(
  "/entityDropdown",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => UserController.entityDropdown(req, res),
);

userRoutes.get(
  "/allEntityDropdown",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => UserController.allEntityDropdown(req, res),
);

userRoutes.get(
  "/rolesDropdown",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => UserController.rolesDropdown(req, res),
);

userRoutes.get(
  "/extensionEntityDropdown",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => UserController.extensionEntityDropdown(req, res),
);

userRoutes.get(
  "/loginAsSupplier",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res) => UserController.loginAsSupplier(req, res),
);

userRoutes.get("/incoterms", (req, res) =>
  UserController.getIncoterms(req, res),
);

userRoutes.get("/paymentterms", (req, res) =>
  UserController.getPaymentTerms(req, res),
);

userRoutes.get("/Registrationpaymentterms", (req, res) =>
  UserController.Registrationpaymentterms(req, res),
);

userRoutes.post("/uploadImage", upload.single("image"), (req, res) =>
  UserController.uploadImage(req, res),
);

userRoutes.post("/uploadImageV1", uploadV1.single("image"), (req, res) =>
  UserController.uploadImageV1(req, res),
);

userRoutes.delete("/deleteImageV1", (req, res) =>
  UserController.deleteImageV1(req, res),
);

userRoutes.get("/contact", (req, res) => UserController.contact(req, res));

userRoutes.get("/status", (req, res) => UserController.getStatus(req, res));

userRoutes.get("/getInvoiceStatus", (req, res) =>
  UserController.getInvoiceStatus(req, res),
);

userRoutes.post("/clearPO", (req, res) => UserController.clearPO(req, res));

userRoutes.post(
  "/resetPasswordV2",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.resetPasswordV2(req, res, next),
);

userRoutes.post(
  "/resetPasswordValidationV2",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.validateResetPasswordV2(req, res, next),
);

userRoutes.delete("/deleteFiles", (req, res) =>
  UserController.deleteFiles(req, res),
);

userRoutes.get(
  "/crPersonForPO",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => UserController.crPerson(req, res, next),
);

export default userRoutes;
