import { BaseController } from "./baseController";
import responseService from "../helpers/response.service";
import { NextFunction } from "express";
import logger from '../utils/logger';

class ResponseController extends BaseController {
  async addResponse(req: any, res: any, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const id = req?.params?.id;
      const vendorId = req.user?.vendor_id;

      const newResponse = await responseService.createResponse(
        req?.body,
        userId,
        id,
        vendorId
      );

      if (!newResponse || !newResponse.data) {
        return this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to create response"
        );
      }

      return this.success(
        req,
        res,
        this.status.HTTP_CREATED,
        newResponse?.data,
        "Response added successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getResponsesByEnquiry(req: any, res: any, next: NextFunction) {
    try {
      const { id } = req?.params ?? {};
      const { search } = req?.query ?? {};
      const responses = await responseService.getResponsesByEnquiry(id, search);

      if (!responses || !responses.data) {
        return this.errors(
          req,
          res,
          this.status.HTTP_NOT_FOUND,
          "No responses found"
        );
      }

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        responses?.data,
        "Responses retrieved successfully"
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new ResponseController();
