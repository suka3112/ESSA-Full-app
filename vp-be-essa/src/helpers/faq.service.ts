import { BaseController } from "../controllers/baseController";
import { FAQHeader } from "../models/faqHeader";
import { FAQQA } from "../models/faqQA";
import { sequelize } from "../config/sequelize";
import { UploadFiles } from "../models/uploadFiles";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

class FAQService extends BaseController {
  async createHeader(data: any, userId: any) {
    if (!data?.title_EN || !data?.title_AR) {
      throw new APIError("Title is required", StatusCodeEnum.HTTP_BAD_REQUEST);
    }

    try {
      const header = await FAQHeader.create({
        title_EN: data?.title_EN?.trim(),
        title_AR: data?.title_AR?.trim(),
        user_id: userId,
      });
      return { status: true, data: header };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async createQuestion(data: any, userId: any) {
    if (
      !data?.question_EN ||
      !data?.question_AR ||
      !data?.answer_EN ||
      !data?.answer_AR ||
      !data?.faq_header_id
    ) {
      throw new APIError(
        "Question, answer, and header ID are required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const transaction = await sequelize.transaction();

    try {
      const question = await FAQQA.create(
        {
          faq_header_id: data?.faq_header_id,
          question_EN: data?.question_EN?.trim(),
          question_AR: data?.question_AR?.trim(),
          answer_EN: data?.answer_EN?.trim(),
          answer_AR: data?.answer_AR?.trim(),
          user_id: userId,
        },
        { transaction },
      );

      const insertFiles = async (files: string[], categoryId: number) => {
        for (const file of files ?? []) {
          await UploadFiles.create(
            {
              category_id: categoryId,
              upload_files: file?.trim(),
            },
            { transaction },
          );
        }
      };

      if (data?.attachment_urls && Array.isArray(data?.attachment_urls)) {
        await insertFiles(data?.attachment_urls, 4);
      }

      if (data?.video_urls && Array.isArray(data?.video_urls)) {
        await insertFiles(data?.video_urls, 5);
      }

      await transaction.commit();
      return { status: true, data: question };
    } catch (error: any) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getFAQHeaders() {
    try {
      const response = await FAQHeader.findAll({
        where: {
          is_deleted: false,
        },
      });
      return { status: true, data: response };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getFAQQuestion(header_id: number) {
    if (!header_id) {
      throw new APIError(
        "Header ID is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    try {
      const response = await FAQQA.findAll({
        where: {
          faq_header_id: header_id,
          is_deleted: false,
        },
      });
      return { status: true, data: response };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateFAQHeader(id: number, data: any) {
    if (!id || !data?.title_EN || !data?.title_AR) {
      throw new APIError(
        "Header ID and title are required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    try {
      const [updated] = await FAQHeader.update(
        { title_EN: data?.title_EN?.trim(), title_AR: data?.title_AR?.trim() },
        { where: { id } },
      );

      if (updated === 0) {
        throw new APIError(
          "FAQ Header not found or no changes made",
          StatusCodeEnum.HTTP_OK,
        );
      }

      return { status: true, data: updated };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateFAQQuestion(id: number, data: any) {
    if (
      !id ||
      !data?.question_EN ||
      !data?.question_AR ||
      !data?.answer_EN ||
      !data?.answer_AR
    ) {
      throw new APIError(
        "Question ID, question, and answer are required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    try {
      const [updated] = await FAQQA.update(
        {
          question_EN: data?.question_EN?.trim(),
          question_AR: data?.question_AR?.trim(),
          answer_EN: data?.answer_EN?.trim(),
          answer_AR: data?.answer_AR?.trim(),
        },
        { where: { id } },
      );

      if (updated === 0) {
        throw new APIError(
          "FAQ Question not found or no changes made",
          StatusCodeEnum.HTTP_OK,
        );
      }

      return { status: true, data: updated };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteFAQHeader(id: number) {
    if (!id) {
      throw new APIError(
        "Header ID is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const transaction = await sequelize.transaction();
    try {
      const headerExists = await FAQHeader.findByPk(id);
      if (!headerExists) {
        throw new APIError(
          "FAQ Header not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      await FAQQA.update(
        { is_deleted: true },
        { where: { faq_header_id: id }, transaction },
      );

      const updatedHeader = await FAQHeader.update(
        { is_deleted: true },
        { where: { id }, transaction },
      );

      await transaction.commit();
      return { status: true, data: updatedHeader };
    } catch (error: any) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteFaqQuestion(id: number) {
    if (!id) {
      throw new APIError(
        "Question ID is required",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    try {
      const [affectedCount] = await FAQQA.update(
        { is_deleted: true },
        { where: { id } },
      );

      if (affectedCount === 0) {
        throw new APIError(
          "FAQ Question not found",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      return { status: true, data: affectedCount };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }
}

export default new FAQService();
