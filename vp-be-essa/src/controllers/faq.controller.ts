import { BaseController } from "./baseController";
import { FAQHeader } from "../models/faqHeader";
import faqService from "../helpers/faq.service";
import { NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

class FAQController extends BaseController {
  async addFaqHeader(req: any, res: any, next: NextFunction) {
    try {
      const userId = req?.user?.id;
      const newHeader = await faqService.createHeader(req?.body, userId);
      return this.success(
        req,
        res,
        this.status.HTTP_CREATED,
        newHeader?.data,
        "Header created successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async addFaqQuestion(req: any, res: any, next: NextFunction) {
    try {
      const userId = req?.user?.id;
      const headerId = Number(req?.params?.header_id);
      if (isNaN(headerId)) {
        throw new APIError(
          "Invalid header ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const headerExists = await FAQHeader.findOne({ where: { id: headerId } });
      if (!headerExists) {
        throw new APIError(
          "FAQ Header not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const data = { ...(req?.body ?? {}), faq_header_id: headerId };
      const newQuestion = await faqService.createQuestion(data, userId);

      return this.success(
        req,
        res,
        this.status.HTTP_CREATED,
        newQuestion?.data,
        "FAQ Q&A added successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getFAQHeaders(req: any, res: any, next: NextFunction) {
    try {
      const response = await faqService.getFAQHeaders();
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Headers retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getFAQQuestions(req: any, res: any, next: NextFunction) {
    try {
      const headerId = Number(req?.params?.header_id);
      if (isNaN(headerId)) {
        throw new APIError(
          "Invalid header ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const response = await faqService.getFAQQuestion(headerId);
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Questions retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateFAQHeader(req: any, res: any, next: NextFunction) {
    try {
      const headerId = Number(req?.params?.header_id);
      if (isNaN(headerId)) {
        throw new APIError(
          "Invalid header ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const response = await faqService.updateFAQHeader(headerId, req?.body);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Header updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateFAQQuestion(req: any, res: any, next: NextFunction) {
    try {
      const questionId = Number(req?.params?.id);
      if (isNaN(questionId)) {
        throw new APIError(
          "Invalid question ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const response = await faqService.updateFAQQuestion(
        questionId,
        req?.body,
      );

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Q&A updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async deleteFAQHeader(req: any, res: any, next: NextFunction) {
    try {
      const headerId = Number(req?.params?.id);
      if (isNaN(headerId)) {
        throw new APIError(
          "Invalid question ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const response = await faqService.deleteFAQHeader(headerId);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Header deleted successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async deleteFaqQuestion(req: any, res: any, next: NextFunction) {
    try {
      const questionId = Number(req?.params?.id);
      if (isNaN(questionId)) {
        throw new APIError(
          "Invalid question ID",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const response = await faqService.deleteFaqQuestion(questionId);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Question deleted successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new FAQController();
