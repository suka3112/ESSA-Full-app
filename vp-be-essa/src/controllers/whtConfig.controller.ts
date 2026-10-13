import { NextFunction } from "express";
import { BaseController } from "./baseController";
import logger from "../utils/logger";
import * as wht from "../helpers/whtConfig.service";

/** WHT Configuration screen: rule matrix, tax treaty rates, vendor SKB/PP23 and SBUJK. */
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
}

export default new WhtConfigController();
