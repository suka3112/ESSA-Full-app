/**
 * Invoice config (SAP mappings + document validation rules)
 * Mounted at: /vendor-portal/invoice-config
 */
import { Router } from "express";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import invoiceConfigController from "../../controllers/invoiceConfig.controller";

const invoiceConfigRoutes = Router();

const auth = Authenticate.isValidateUser([
  UserRole.FINANCE,
  UserRole.ADMIN,
  UserRole.BUSINESS,
]);

invoiceConfigRoutes.get("/", auth, (req, res, next) =>
  invoiceConfigController.getConfig(req, res, next),
);

invoiceConfigRoutes.post("/sap-mappings", auth, (req, res, next) =>
  invoiceConfigController.createSapMapping(req, res, next),
);

invoiceConfigRoutes.patch("/sap-mappings/:mappingId", auth, (req, res, next) =>
  invoiceConfigController.updateSapMapping(req, res, next),
);

invoiceConfigRoutes.post("/validation-rules", auth, (req, res, next) =>
  invoiceConfigController.createValidationRule(req, res, next),
);

invoiceConfigRoutes.patch("/validation-rules/:ruleId", auth, (req, res, next) =>
  invoiceConfigController.updateValidationRule(req, res, next),
);

invoiceConfigRoutes.get("/match-rules", auth, (req, res, next) =>
  invoiceConfigController.listMatchRules(req, res, next),
);

invoiceConfigRoutes.post("/match-rules", auth, (req, res, next) =>
  invoiceConfigController.createMatchRule(req, res, next),
);

invoiceConfigRoutes.post("/match-rules/restore-defaults", auth, (req, res, next) =>
  invoiceConfigController.restoreDefaultMatchRules(req, res, next),
);

invoiceConfigRoutes.patch("/match-rules/:ruleId", auth, (req, res, next) =>
  invoiceConfigController.updateMatchRule(req, res, next),
);

invoiceConfigRoutes.delete("/match-rules/:ruleId", auth, (req, res, next) =>
  invoiceConfigController.deleteMatchRule(req, res, next),
);

export default invoiceConfigRoutes;
