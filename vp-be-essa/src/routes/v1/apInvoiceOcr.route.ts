import { Router } from "express";
import apInvoiceOcrController from "../../controllers/apInvoiceOcr.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import apDocumentUpload, {
  getApDocumentMaxSizeMb,
} from "../../middleware/apDocumentUpload";

const apInvoiceOcrRoutes = Router();

apInvoiceOcrRoutes.get(
  "/ocr-health",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => apInvoiceOcrController.ocrServiceHealth(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/email-intake/simulate",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) => {
    apDocumentUpload.single("document")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum upload size is ${getApDocumentMaxSizeMb()} MB.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
      }
      next();
    });
  },
  (req, res, next) => apInvoiceOcrController.simulateEmailIntake(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/email-intake/inbound",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
      (req, res, next) => apInvoiceOcrController.listInboundEmails(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/email-intake/inbound/:inboundEmailId/ignore",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) => apInvoiceOcrController.ignoreInboundEmail(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/email-intake/poll",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) => apInvoiceOcrController.pollEmailIntake(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/sharepoint-intake/simulate",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) => {
    apDocumentUpload.single("document")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum upload size is ${getApDocumentMaxSizeMb()} MB.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
      }
      next();
    });
  },
  (req, res, next) =>
    apInvoiceOcrController.simulateSharePointIntake(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/sharepoint-intake/inbound",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.listInboundSharePoint(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/sharepoint-intake/poll",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) =>
    apInvoiceOcrController.pollSharePointIntake(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/extract",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => {
    apDocumentUpload.single("document")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum upload size is ${getApDocumentMaxSizeMb()} MB.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
      }
      next();
    });
  },
  (req, res, next) => apInvoiceOcrController.extractInvoice(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/extract/mock",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => {
    apDocumentUpload.single("document")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum upload size is ${getApDocumentMaxSizeMb()} MB.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
      }
      next();
    });
  },
  (req, res, next) => apInvoiceOcrController.extractInvoiceMock(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/validate",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => apInvoiceOcrController.validateInvoice(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/invoice-number/exists",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.checkInvoiceNumberExists(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/ses-documents/resolve",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.resolveSesDocument(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/ses-documents/:sesNo/file",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.getSesDocumentFile(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/ocr-uploads/:uploadId/:fileName",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.getOcrSectionFile(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/uploads",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => apInvoiceOcrController.listUploadedInvoices(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/uploads/:documentId",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => apInvoiceOcrController.getUploadedInvoice(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/document-requests",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.createDocumentRequest(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/document-requests",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.listDocumentRequests(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/document-requests/:id/cancel",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.cancelDocumentRequest(req, res, next),
);

apInvoiceOcrRoutes.post(
  "/document-requests/:id/send",
  Authenticate.isValidateUser([
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) =>
    apInvoiceOcrController.sendDocumentRequest(req, res, next),
);

apInvoiceOcrRoutes.get(
  "/:documentId/validate",
  Authenticate.isValidateUser([
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
    UserRole.ADMIN,
  ]),
  (req, res, next) => apInvoiceOcrController.validateDocument(req, res, next),
);

export default apInvoiceOcrRoutes;
