import { NextFunction } from "express";
import { BaseController } from "./baseController";
import { listActiveExceptionCodes } from "../helpers/exceptionCode.service";
import logger from "../utils/logger";

class EssaExceptionCodeController extends BaseController {
  async list(req: any, res: any, next: NextFunction) {
    try {
      const data = await listActiveExceptionCodes();
      return this.success(req, res, this.status.HTTP_OK, data, "Exception codes retrieved");
    } catch (error) {
      logger.error("Failed to list exception codes:", error);
      next(error);
    }
  }
}

export default new EssaExceptionCodeController();
