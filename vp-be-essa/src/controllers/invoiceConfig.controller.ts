import { NextFunction } from "express";
import { BaseController } from "./baseController";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import * as invoiceConfigAdmin from "../helpers/invoiceConfigAdmin.service";
import * as matchRules from "../helpers/matchRules.service";

class InvoiceConfigController extends BaseController {
  private userId(req: any): number | null {
    const id = Number(req?.user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  async getConfig(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeCode = String(req?.query?.invoiceTypeCode || "").trim();
      if (!invoiceTypeCode) {
        throw new APIError("invoiceTypeCode is required", StatusCodeEnum.HTTP_BAD_REQUEST);
      }
      const configVersionId = req?.query?.configVersionId
        ? Number(req.query.configVersionId)
        : null;
      const data = await invoiceConfigAdmin.getInvoiceConfig({
        invoiceTypeCode,
        configVersionId: configVersionId && !Number.isNaN(configVersionId) ? configVersionId : null,
      });
      return this.success(req, res, this.status.HTTP_OK, data, "Invoice config retrieved");
    } catch (error) {
      logger.error("Error getInvoiceConfig:", error);
      next(error);
    }
  }

  async createSapMapping(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceConfigAdmin.createSapMapping(req?.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "SAP field mapping created");
    } catch (error) {
      logger.error("Error createSapMapping:", error);
      next(error);
    }
  }

  async updateSapMapping(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceConfigAdmin.updateSapMapping(
        req?.params?.mappingId,
        req?.body || {},
        this.userId(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "SAP field mapping updated");
    } catch (error) {
      logger.error("Error updateSapMapping:", error);
      next(error);
    }
  }

  async createValidationRule(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceConfigAdmin.createValidationRule(req?.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "Validation rule created");
    } catch (error) {
      logger.error("Error createValidationRule:", error);
      next(error);
    }
  }

  async updateValidationRule(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceConfigAdmin.updateValidationRule(
        req?.params?.ruleId,
        req?.body || {},
        this.userId(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Validation rule updated");
    } catch (error) {
      logger.error("Error updateValidationRule:", error);
      next(error);
    }
  }
  /* ── N-way match rules (check A against B) ───────────────────────── */

  async listMatchRules(req: any, res: any, next: NextFunction) {
    try {
      const data = await matchRules.listMatchRules(this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Match rules retrieved");
    } catch (error) {
      logger.error("Error listMatchRules:", error);
      next(error);
    }
  }

  async createMatchRule(req: any, res: any, next: NextFunction) {
    try {
      const data = await matchRules.createMatchRule(req?.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "Match rule created");
    } catch (error) {
      logger.error("Error createMatchRule:", error);
      next(error);
    }
  }

  async updateMatchRule(req: any, res: any, next: NextFunction) {
    try {
      const data = await matchRules.updateMatchRule(req?.params?.ruleId, req?.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Match rule updated");
    } catch (error) {
      logger.error("Error updateMatchRule:", error);
      next(error);
    }
  }

  async deleteMatchRule(req: any, res: any, next: NextFunction) {
    try {
      const data = await matchRules.deleteMatchRule(req?.params?.ruleId, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Match rule deleted");
    } catch (error) {
      logger.error("Error deleteMatchRule:", error);
      next(error);
    }
  }

  async restoreDefaultMatchRules(req: any, res: any, next: NextFunction) {
    try {
      const data = await matchRules.restoreDefaultMatchRules(this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Default match rules restored");
    } catch (error) {
      logger.error("Error restoreDefaultMatchRules:", error);
      next(error);
    }
  }
}

export default new InvoiceConfigController();
