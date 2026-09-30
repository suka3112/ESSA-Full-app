/**
 * Extraction prompt config API
 * Mounted at: /vendor-portal/extraction-prompt-config
 */
import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import extractionPromptConfigController from "../../controllers/extractionPromptConfig.controller";

const extractionPromptConfigRoutes = Router();

const auth = Authenticate.isValidateUser([
  UserRole.FINANCE,
  UserRole.ADMIN,
  UserRole.BUSINESS,
]);
// FINANCE expands to ESSA_PORTAL_ROLES (AP + DoA) via expandAllowedRoles.

extractionPromptConfigRoutes.get("/prompt-config", auth, (req, res, next) =>
  extractionPromptConfigController.getPromptConfig(req, res, next),
);

extractionPromptConfigRoutes.post("/prompt-config/categories", auth, (req, res, next) =>
  extractionPromptConfigController.createCategory(req, res, next),
);

extractionPromptConfigRoutes.delete(
  "/prompt-config/categories/:categoryId",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.deleteCategory(req, res, next),
);

extractionPromptConfigRoutes.post(
  "/prompt-config/categories/:categoryId/invoice-types",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.createInvoiceType(req, res, next),
);

extractionPromptConfigRoutes.get(
  "/prompt-config/invoice-types/:invoiceTypeId",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.getInvoiceType(req, res, next),
);

extractionPromptConfigRoutes.patch(
  "/prompt-config/invoice-types/:invoiceTypeId",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.updateInvoiceType(req, res, next),
);

extractionPromptConfigRoutes.put(
  "/prompt-config/invoice-types/:invoiceTypeId/documents",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.upsertDocuments(req, res, next),
);

extractionPromptConfigRoutes.post(
  "/prompt-config/invoice-types/:invoiceTypeId/documents",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.createDocument(req, res, next),
);

extractionPromptConfigRoutes.delete(
  "/prompt-config/invoice-types/:invoiceTypeId/documents/:typeDocumentId",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.deleteDocument(req, res, next),
);

extractionPromptConfigRoutes.patch(
  "/prompt-config/invoice-types/:invoiceTypeId/documents/:typeDocumentId",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.renameDocument(req, res, next),
);

extractionPromptConfigRoutes.put(
  "/prompt-config/invoice-types/:invoiceTypeId/prompt",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.savePrompt(req, res, next),
);

extractionPromptConfigRoutes.post(
  "/prompt-config/invoice-types/:invoiceTypeId/prompt/regenerate",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.regeneratePrompt(req, res, next),
);

extractionPromptConfigRoutes.delete(
  "/prompt-config/invoice-types/:invoiceTypeId",
  auth,
  (req, res, next) =>
    extractionPromptConfigController.softDeleteInvoiceType(req, res, next),
);

export default extractionPromptConfigRoutes;
