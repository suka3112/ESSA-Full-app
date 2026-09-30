import { NextFunction } from "express";
import { BaseController } from "./baseController";
import extractionPromptConfigService from "../helpers/extractionPromptConfig.service";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

class ExtractionPromptConfigController extends BaseController {
  private parseCategoryId(raw: unknown): number {
    const categoryId = Number(raw);
    if (!categoryId || Number.isNaN(categoryId)) {
      throw new APIError("Invalid category ID", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    return categoryId;
  }

  private parseInvoiceTypeId(raw: unknown): number {
    const invoiceTypeId = Number(raw);
    if (!invoiceTypeId || Number.isNaN(invoiceTypeId)) {
      throw new APIError("Invalid invoice type ID", StatusCodeEnum.HTTP_BAD_REQUEST);
    }
    return invoiceTypeId;
  }

  async getPromptConfig(req: any, res: any, next: NextFunction) {
    try {
      const data = await extractionPromptConfigService.getPromptConfigTree();
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Prompt config retrieved successfully",
      );
    } catch (error) {
      logger.error("Error getPromptConfig:", error);
      next(error);
    }
  }

  async getInvoiceType(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const data =
        await extractionPromptConfigService.getInvoiceTypeDetail(invoiceTypeId);
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Invoice type retrieved successfully",
      );
    } catch (error) {
      logger.error("Error getInvoiceType:", error);
      next(error);
    }
  }

  async upsertDocuments(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const documents = req?.body?.documents;
      if (!Array.isArray(documents)) {
        throw new APIError(
          "Body must include a documents array",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const data = await extractionPromptConfigService.upsertDocuments(
        invoiceTypeId,
        documents,
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Documents updated successfully",
      );
    } catch (error) {
      logger.error("Error upsertDocuments:", error);
      next(error);
    }
  }

  async createDocument(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const data = await extractionPromptConfigService.createDocumentForInvoiceType(
        invoiceTypeId,
        {
          name: req?.body?.name,
          isEnabled: req?.body?.isEnabled,
          isMandatory: req?.body?.isMandatory,
        },
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_CREATED,
        data,
        "Document created successfully",
      );
    } catch (error) {
      logger.error("Error createDocument:", error);
      next(error);
    }
  }

  async deleteDocument(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const typeDocumentId = Number(req?.params?.typeDocumentId);
      if (!typeDocumentId || Number.isNaN(typeDocumentId)) {
        throw new APIError("Invalid type document ID", StatusCodeEnum.HTTP_BAD_REQUEST);
      }
      const data = await extractionPromptConfigService.softDeleteDocumentForInvoiceType(
        invoiceTypeId,
        typeDocumentId,
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Document removed successfully",
      );
    } catch (error) {
      logger.error("Error deleteDocument:", error);
      next(error);
    }
  }

  async renameDocument(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const typeDocumentId = Number(req?.params?.typeDocumentId);
      if (!typeDocumentId || Number.isNaN(typeDocumentId)) {
        throw new APIError("Invalid type document ID", StatusCodeEnum.HTTP_BAD_REQUEST);
      }
      const data = await extractionPromptConfigService.renameDocumentForInvoiceType(
        invoiceTypeId,
        typeDocumentId,
        { name: req?.body?.name },
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Document renamed successfully",
      );
    } catch (error) {
      logger.error("Error renameDocument:", error);
      next(error);
    }
  }

  async savePrompt(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const data = await extractionPromptConfigService.savePrompt(
        invoiceTypeId,
        {
          promptText: req?.body?.promptText,
          isManuallyEdited: req?.body?.isManuallyEdited,
        },
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Prompt saved successfully",
      );
    } catch (error) {
      logger.error("Error savePrompt:", error);
      next(error);
    }
  }

  async regeneratePrompt(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const data = await extractionPromptConfigService.regeneratePrompt(
        invoiceTypeId,
        { force: Boolean(req?.body?.force) },
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Prompt regenerated successfully",
      );
    } catch (error) {
      logger.error("Error regeneratePrompt:", error);
      next(error);
    }
  }

  async createCategory(req: any, res: any, next: NextFunction) {
    try {
      const data = await extractionPromptConfigService.createCategory(
        { name: req?.body?.name, code: req?.body?.code },
        req?.user?.id,
      );
      return this.success(req, res, this.status.HTTP_CREATED, data, "Category created successfully");
    } catch (error) {
      logger.error("Error createCategory:", error);
      next(error);
    }
  }

  async createInvoiceType(req: any, res: any, next: NextFunction) {
    try {
      const categoryId = this.parseCategoryId(req?.params?.categoryId);
      const data = await extractionPromptConfigService.createInvoiceType(
        categoryId,
        { name: req?.body?.name, code: req?.body?.code },
        req?.user?.id,
      );
      return this.success(req, res, this.status.HTTP_CREATED, data, "Invoice type created successfully");
    } catch (error) {
      logger.error("Error createInvoiceType:", error);
      next(error);
    }
  }

  async updateInvoiceType(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const data = await extractionPromptConfigService.updateInvoiceType(
        invoiceTypeId,
        {
          name: req?.body?.name,
          categoryId:
            req?.body?.categoryId === undefined ? undefined : Number(req?.body?.categoryId),
        },
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Invoice type updated successfully",
      );
    } catch (error) {
      logger.error("Error updateInvoiceType:", error);
      next(error);
    }
  }

  async deleteCategory(req: any, res: any, next: NextFunction) {
    try {
      const categoryId = this.parseCategoryId(req?.params?.categoryId);
      const data = await extractionPromptConfigService.softDeleteCategory(
        categoryId,
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Category deleted successfully",
      );
    } catch (error) {
      logger.error("Error deleteCategory:", error);
      next(error);
    }
  }

  async softDeleteInvoiceType(req: any, res: any, next: NextFunction) {
    try {
      const invoiceTypeId = this.parseInvoiceTypeId(req?.params?.invoiceTypeId);
      const data = await extractionPromptConfigService.softDeleteInvoiceType(
        invoiceTypeId,
        req?.user?.id,
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Invoice type deleted successfully",
      );
    } catch (error) {
      logger.error("Error softDeleteInvoiceType:", error);
      next(error);
    }
  }
}

export default new ExtractionPromptConfigController();
