/**
 * ESSA platform audit log (append-only).
 * Mounted at: /vendor-portal/essa/audit-logs
 * Read gated for Admin / Finance (AUDIT_VIEW capability in permission catalog).
 */
import { Router } from "express";
import essaAuditController from "../../controllers/essaAudit.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const essaAuditRoutes = Router();

essaAuditRoutes.get(
  "/",
  Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]),
  (req, res, next) => essaAuditController.list(req, res, next),
);

export default essaAuditRoutes;
