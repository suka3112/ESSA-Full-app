import { NextFunction } from "express";
import { BaseController } from "./baseController";
import * as auditEventService from "../helpers/auditEvent.service";
import logger from "../utils/logger";

class EssaAuditController extends BaseController {
  async list(req: any, res: any, next: NextFunction) {
    try {
      const data = await auditEventService.listAuditEvents(req.query || {});
      return this.success(req, res, this.status.HTTP_OK, data, "Audit events retrieved");
    } catch (error) {
      logger.error("Failed to list ESSA audit events:", error);
      next(error);
    }
  }
}

export default new EssaAuditController();
