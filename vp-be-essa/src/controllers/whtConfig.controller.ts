import { NextFunction } from "express";
import { BaseController } from "./baseController";
import logger from "../utils/logger";
import * as wht from "../helpers/whtConfig.service";
import * as taxRates from "../helpers/whtTaxRateDocument.service";

/** WHT Configuration screen: rule matrix, Tax Rate document, vendor SKB/PP23 (SBUJK disabled). */
class WhtConfigController extends BaseController {
  private userId(req: any): number | null {
    const id = Number(req?.user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  async list(req: any, res: any, next: NextFunction) {
    try {
      const data = await wht.listWhtConfig();
      return this.success(req, res, this.status.HTTP_OK, data, "WHT configuration retrieved");
    } catch (error) {
      logger.error("Error listing WHT configuration:", error);
      next(error);
    }
  }

  async create(req: any, res: any, next: NextFunction) {
    try {
      const data = await wht.createWhtRecord(req.params.entity, req?.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "Saved");
    } catch (error) {
      next(error);
    }
  }

  async update(req: any, res: any, next: NextFunction) {
    try {
      const data = await wht.updateWhtRecord(req.params.entity, req.params.id, req?.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Updated");
    } catch (error) {
      next(error);
    }
  }

  async remove(req: any, res: any, next: NextFunction) {
    try {
      const data = await wht.deleteWhtRecord(req.params.entity, req.params.id, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Deleted");
    } catch (error) {
      next(error);
    }
  }

  async evaluate(req: any, res: any, next: NextFunction) {
    try {
      const data = await wht.evaluateWht(req?.body || {});
      return this.success(req, res, this.status.HTTP_OK, data, "WHT evaluated");
    } catch (error) {
      logger.error("Error evaluating WHT:", error);
      next(error);
    }
  }

  // ---- Tax Rate document (read-only, versioned) ----

  async listTaxRateVersions(req: any, res: any, next: NextFunction) {
    try {
      const data = await taxRates.listTaxRateVersions();
      return this.success(req, res, this.status.HTTP_OK, data, "Tax Rate document versions");
    } catch (error) {
      next(error);
    }
  }

  async getTaxRateVersion(req: any, res: any, next: NextFunction) {
    try {
      const data = await taxRates.getTaxRateVersion(req.params.id);
      return this.success(req, res, this.status.HTTP_OK, data, "Tax Rate document");
    } catch (error) {
      next(error);
    }
  }

  async downloadTaxRateVersion(req: any, res: any, next: NextFunction) {
    try {
      const file = await taxRates.getTaxRateFile(req.params.id);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.fileName)}"`);
      return res.send(file.data);
    } catch (error) {
      next(error);
    }
  }

  async uploadTaxRateDocument(req: any, res: any, next: NextFunction) {
    try {
      const data = await taxRates.uploadTaxRateDocument(req.file, req.body?.notes, {
        id: this.userId(req),
        name: req?.user?.name || req?.user?.email || null,
      });
      return this.success(req, res, this.status.HTTP_CREATED, data, `Version ${data.versionNo} uploaded and set as current`);
    } catch (error) {
      next(error);
    }
  }

  async activateTaxRateVersion(req: any, res: any, next: NextFunction) {
    try {
      const data = await taxRates.activateTaxRateVersion(req.params.id, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, `Version ${data.versionNo} is now current`);
    } catch (error) {
      next(error);
    }
  }

  async deleteTaxRateVersion(req: any, res: any, next: NextFunction) {
    try {
      const data = await taxRates.deleteTaxRateVersion(req.params.id, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Version deleted");
    } catch (error) {
      next(error);
    }
  }
}

export default new WhtConfigController();
