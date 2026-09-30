import { NextFunction } from "express";
import { BaseController } from "./baseController";
import apInvoiceDocumentService from "../helpers/apInvoiceDocument.service";
import * as invoiceActions from "../helpers/essaInvoiceActions.service";
import essaInvoiceDetailService from "../helpers/essaInvoiceDetail.service";
import logger from "../utils/logger";

class EssaInvoiceController extends BaseController {
  private actor(req: any) {
    const userId = Number(req?.user?.id);
    return {
      userId: Number.isFinite(userId) && userId > 0 ? userId : null,
      name: req?.user?.name || req?.user?.Name || null,
      role: null as string | null,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
    };
  }

  async list(req: any, res: any, next: NextFunction) {
    try {
      const data = await apInvoiceDocumentService.listEssaInvoices(req.query || {});
      return this.success(req, res, this.status.HTTP_OK, data, "Invoices retrieved");
    } catch (error) {
      logger.error("Failed to list ESSA invoices:", error);
      next(error);
    }
  }

  async getDetails(req: any, res: any, next: NextFunction) {
    try {
      const data = await essaInvoiceDetailService.getInvoiceDetails(req.params.id);
      return this.success(req, res, this.status.HTTP_OK, data, "Invoice details retrieved");
    } catch (error) {
      logger.error("Failed to get ESSA invoice details:", error);
      next(error);
    }
  }

  async correctFields(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceActions.correctExtractedFields(
        req.params.id,
        req.body || {},
        this.actor(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Fields corrected");
    } catch (error) {
      logger.error("Failed to correct ESSA invoice fields:", error);
      next(error);
    }
  }

  async verifyFields(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceActions.verifyExtractedFields(
        req.params.id,
        req.body || {},
        this.actor(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Fields verified");
    } catch (error) {
      logger.error("Failed to verify ESSA invoice fields:", error);
      next(error);
    }
  }

  async approve(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceActions.approveOrRejectInvoice(
        req.params.id,
        req.body || {},
        this.actor(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Decision recorded");
    } catch (error) {
      logger.error("Failed to approve/reject ESSA invoice:", error);
      next(error);
    }
  }

  async override(req: any, res: any, next: NextFunction) {
    try {
      const data = await invoiceActions.overrideValidation(
        req.params.id,
        req.body || {},
        this.actor(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Validation overridden");
    } catch (error) {
      logger.error("Failed to override ESSA validation:", error);
      next(error);
    }
  }
}

export default new EssaInvoiceController();
