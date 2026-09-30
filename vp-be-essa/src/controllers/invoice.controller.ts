import { BaseController } from "./baseController";
import InvoiceService from "../helpers/invoice.service";
import userService from "../helpers/user.service";
import constructMail from "../utils/constructMail";
import { sequelize } from "../config/sequelize";
import { exportFile } from "../utils/globalFunction";
import { StatusCodeEnum, StatusEnum } from "../utils/enums/status.enum";
import { NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");
import * as Papa from "papaparse";
import * as xlsx from "xlsx";
import invoiceService from "../helpers/invoice.service";
import notificationService from "../helpers/notiticationService";
import { getProdPublicFileUrl } from "../middleware/imageUploads";
import fs from "fs";
import path from "path";
import { NotificationCategory } from "../utils/enums/category.enum";
import VendorService from "../helpers/vendor.service";
import logger from "../utils/logger";
import { executeInvoiceApprovalMail } from "../queues/jobHandlers";

class InvoiceController extends BaseController {
  /**
   * @description This is register vendor Api
   * @param req
   * @param res
   * @returns
   */

  async LineDetails(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.body;
      let getLineDetails = await InvoiceService.LineDetails(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "Line Details listed Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getPoInvoice(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.query;

      let getLineDetails = await InvoiceService.getPoInvoiceV1(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "Line Details listed Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getPoInvoiceV1(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.query;

      let getLineDetails = await InvoiceService.getPoInvoiceV1(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "Line Details listed Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getPoInvoiceExport(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.query;

      const format = req?.query?.format as "csv" | "xls"; // 'csv' or 'xls'
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      let result = await InvoiceService.getPoInvoiceV1(body);

      const items = (result?.data?.results ?? []).map((item: any) => ({
        vendor_invoice_no: item?.InvNo,
        line_item_no: item?.POLnNo,
        po_no: item?.PONo,
        material_code: item?.Material_Code,
        material_desc: item?.Material_Description,
        po_quantity: item?.PO_Qty,
        ir_quantity: item?.Inv_Qty,
        amount: item?.NetAmount,
      }));

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;

      if (isArabic) {
        headers = [
          { header: "قيمة السطر", key: "line_item_no" },
          { header: "رقم فاتورة المورد", key: "vendor_invoice_no" },
          { header: "رقم أمر الشراء", key: "po_no" },
          { header: "رمز المادة", key: "material_code" },
          { header: "وصف المادة", key: "material_desc" },
          { header: "كمية الفاتورة (INV)", key: "ir_quantity" },
          { header: "المبلغ", key: "amount" },
        ];
      } else {
        headers = [
          { header: "Line Item no", key: "line_item_no" },
          { header: "Vendor Invoice number", key: "vendor_invoice_no" },
          { header: "Material Code", key: "material_code" },
          { header: "Material Description", key: "material_desc" },
          { header: "Inv Qty", key: "ir_quantity" },
          { header: "Amount", key: "amount" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(
          format,
          items,
          headers,
          res,
          `poInvoiceExport_${Date.now()}`,
        );
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmailV4(
        items,
        email,
        fields,
        headers,
        "PO Invoice Details",
        "Please find the attached file which contains the PO invoice details available",
        req?.user?.name || "User",
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "po invoice details exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getInvoices(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
        search,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const userId = req?.user?.id;
      const entityId = req?.query?.entity_id
        ? String(req?.query?.entity_id)
        : undefined;

      let invoices;

      if (req?.user?.role_id == 1) {
        let vendorId = req?.user?.vendor_id;
        invoices = await InvoiceService.getVendorInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          vendorId,
          entityId,
        });
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entityId,
        );
        invoices = await InvoiceService.getInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
          vendorIds,
        });
      } else {
        invoices = await InvoiceService.getInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
        });
      }

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getPendingInvoices(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        start_date,
        end_date,
        currency,
        status,
        category,
        search,
        entity_id,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 10000;
      const userId = req?.user?.id;
      let invoices;

      if (req?.user?.role_id == 1) {
        let vendorId = req?.user?.vendor_id;
        invoices = await InvoiceService.getVendorPendingInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          start_date,
          end_date,
          currency,
          status,
          category,
          search,
          vendorId,
          entity_id,
        });
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entity_id,
        );
        invoices = await InvoiceService.getPendingInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          start_date,
          end_date,
          currency,
          status,
          category,
          search,
          entity_id,
          vendorIds,
        });
      } else {
        invoices = await InvoiceService.getPendingInvoicesForAdmin({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          start_date,
          end_date,
          currency,
          status,
          category,
          search,
          entity_id,
        });
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getInvoicesByID(req: any, res: any, next: NextFunction) {
    try {
      const id = req?.query?.id;
      let emp_id: any = req?.user?.emp_id;
      const invoices = await InvoiceService.getInvoicesByID({
        id,
        emp_id,
      });

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          invoices?.data || "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getCreditInvoicesByID(req: any, res: any, next: NextFunction) {
    try {
      const id = req?.query?.id;

      const invoices = await InvoiceService.getCreditInvoicesByID({
        id,
      });

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async invoiceListById(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
        InvNo,
      } = req?.body ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const userId = req?.user?.id;
      const invoices = await InvoiceService.invoiceListById({
        page,
        limit,
        month,
        year,
        sort,
        sort_column,
        userId,
        startDate,
        endDate,
        currency,
        status,
        category,
        InvNo,
      });

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async AddPoInvoice(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body;
      let fileDatas: any = [];
      delete body.Document_type;
      body.Business_contact = req?.user?.emp_id;
      body.CreatedBy = req?.user?.id;

      if (body.Vendor_id == null) {
        body.Vendor_id = req?.user?.vendor_id;
      }

      let duplicateCheck = await InvoiceService.checkDuplicateInvNo(body.InvNo);
      if (duplicateCheck?.exists) {
        throw new APIError(
          "Invoice Reference Number already exists. Please create invoice with different reference number",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let getPaymentTerms: any = await InvoiceService.findPaymentTermsForPO(
        body.Payment_Terms,
      );

      body.Payment_Terms = getPaymentTerms?.data?.Code;

      let getLineDetails = await InvoiceService.AddPoInvoice(body, transaction);

      if (body?.upload_file && body?.upload_file?.length > 0) {
        body?.upload_file?.forEach(function (files: any) {
          let fileData = {
            Main_Id: getLineDetails?.data?.ID,
            Category_id: 4,
            Upload_files: files?.upload_files,
            Attachment_type: files?.attachment_type,
            File_name: files?.originalName,
          };
          fileDatas.push(fileData);
        });

        await userService.addlicenseImage(fileDatas, transaction);
      }

      await transaction.commit();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "PO - Invoice created Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  }

  getDueDate(paymentTerms: any, InvDt: any): string {
    const today = new Date(InvDt);
    today.setDate(today.getDate() + paymentTerms);

    // Format as YYYY-MM-DD
    return today.toISOString().split("T")[0];
  }

  async editPoInvoice(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body;
      let fileDatas: any = [];
      delete body.Document_type;

      if (body.Vendor_id == null) {
        body.Vendor_id = req?.user?.vendor_id;
      }

      let getPaymentTerms: any = await InvoiceService.findPaymentTermsForPO(
        body.Payment_Terms,
      );

      body.Payment_Terms = getPaymentTerms?.data?.Code;

      let getLineDetails = await InvoiceService.editPoInvoice(
        body,
        transaction,
      );

      if (body?.upload_file && body?.upload_file?.length > 0) {
        body?.upload_file?.forEach(function (files: any) {
          let fileData = {
            Main_Id: body?.ID,
            Category_id: 4,
            Upload_files: files?.upload_files,
            Attachment_type: files?.attachment_type,
          };
          fileDatas.push(fileData);
        });

        await userService.addlicenseImageV2(fileDatas, transaction);
      }

      await transaction.commit();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "PO - Invoice created Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  }

  async editNonPoInvoice(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body;
      let fileDatas: any = [];
      delete body.Document_type;

      if (body.Vendor_id == null) {
        body.Vendor_id = req?.user?.vendor_id;
      }

      let getPaymentTerms: any = await InvoiceService.findPaymentTerms(
        body.Payment_Terms,
      );

      body.Payment_Terms = getPaymentTerms?.data?.Code;

      let getLineDetails = await InvoiceService.editNonPoInvoice(
        body,
        transaction,
      );

      if (body?.upload_file && body?.upload_file?.length > 0) {
        body?.upload_file?.forEach(function (files: any) {
          let fileData = {
            Main_Id: body?.ID,
            Category_id: 4,
            Upload_files: files?.upload_files,
            Attachment_type: files?.attachment_type,
          };
          fileDatas.push(fileData);
        });

        await userService.addlicenseImageV2(fileDatas, transaction);
      }

      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "PO - Invoice created Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  }

  async editCreditInvoices(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body;
      let fileDatas: any = [];
      delete body.Document_type;

      if (body.Vendor_id == null) {
        body.Vendor_id = req?.user?.vendor_id;
      }

      let getLineDetails = await InvoiceService.editCreditInvoices(
        body,
        transaction,
      );

      if (body?.upload_files && body?.upload_files?.length > 0) {
        body?.upload_files?.forEach(function (files: any) {
          let fileData = {
            Main_Id: body?.ID,
            Category_id: 4,
            Upload_files: files?.upload_files,
            Attachment_type: files?.attachment_type,
          };
          fileDatas.push(fileData);
        });

        await userService.addlicenseImageV2(fileDatas, transaction);
      }
      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "PO - Invoice created Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  }

  async AddNonPoInvoice(req: any, res: any, next: NextFunction) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      let body = req?.body;
      const fileDatas: any = [];
      body.CreatedBy = req?.user?.id;

      if (body.Vendor_id == null) {
        body.Vendor_id = req?.user?.vendor_id;
      }

      let duplicateCheck = await InvoiceService.checkDuplicateInvNo(body.InvNo);
      if (duplicateCheck?.exists) {
        throw new APIError(
          "Invoice Reference Number already exists. Please create invoice with different reference number",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let getPaymentTerms: any = await InvoiceService.findPaymentTerms(
        body.Payment_Terms,
      );

      body.Payment_Terms = getPaymentTerms?.data?.Code;

      const getLineDetails = await InvoiceService.AddNonPoInvoice(
        body,
        transaction,
      );

      if (body?.upload_file && body?.upload_file?.length > 0) {
        body?.upload_file?.forEach((files: any) => {
          fileDatas.push({
            Main_Id: getLineDetails?.data?.ID,
            Category_id: 4,
            Upload_files: files?.upload_files,
            Attachment_type: files?.attachment_type,
            File_name: files?.originalName,
          });
        });

        await userService.addlicenseImage(fileDatas, transaction);
      }
      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "Non PO - Invoice created Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);

      if (transaction && !(transaction as any).finished) {
        await transaction.rollback();
      }

      next(error);
    }
  }

  async AddCreditNote(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body;
      let fileDatas: any = [];
      body.CreatedBy = req?.user?.id;

      let duplicateCheck = await InvoiceService.checkDuplicateInvNo(body.InvNo);
      if (duplicateCheck?.exists) {
        throw new APIError(
          "Invoice Reference Number already exists. Please create invoice with different reference number",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let getLineDetails = await InvoiceService.AddCreditNote(
        body,
        transaction,
      );

      if (body?.upload_files && body?.upload_files?.length > 0) {
        body?.upload_files?.forEach(function (files: any) {
          let fileData = {
            Main_Id: getLineDetails?.data?.ID,
            Category_id: 4,
            Upload_files: files?.upload_files,
            Attachment_type: files?.attachment_type,
            File_name: files?.document_name,
            CreatedBy: 1,
            ModifiedBy: 1,
          };
          fileDatas.push(fileData);
        });

        await userService.addlicenseImage(fileDatas, transaction);
      }
      await transaction.commit();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "PO - Invoice created Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async AddLogisticsInvoice(req: any, res: any, next: NextFunction) {
    try {
      upload(req, res, async (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "File upload failed", error: err?.message });
        }

        let vendor_id = req.user?.vendor_id;
        if (
          !vendor_id ||
          vendor_id === "" ||
          vendor_id === null ||
          vendor_id === undefined
        ) {
          vendor_id = req.body?.Vendor_id;
        }

        if (!vendor_id) {
          return res.status(400).json({ message: "Vendor ID is missing." });
        }

        const user_id = req.user?.id;

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const name = `${Date.now()}${path.extname(req.file.originalname)}`;
        const filePath = path.join(uploadDir, name);

        // Write the buffer to disk
        fs.writeFileSync(filePath, req.file.buffer);

        // Update req.file to include the path
        req.file.path = filePath;
        req.file.filename = name;

        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        let parsedData: any[] = [];

        const publicUrl = getProdPublicFileUrl(req.file);

        try {
          if (fileName.endsWith(".csv")) {
            const csvString = fileBuffer.toString("utf8");
            parsedData = Papa.parse(csvString, { header: true }).data;
          } else if (fileName.endsWith(".xlsx")) {
            const workbook = xlsx.read(fileBuffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              return res
                .status(400)
                .json({ message: "Excel file does not contain sheets" });
            }
            parsedData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const requiredKeys = [
              "Final Inv Amount",
              "Inv Curr",
              "Inv Date(DD-MM-YYYY)", // ✅ fixed from YYY → YYYY
              "Inv Number",
            ];

            const dateRegex =
              /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

            const missingInfo = parsedData
              .map((invoice, index) => {
                const missingKeys = requiredKeys.filter((key) => !invoice[key]);
                const errors = [];

                // Missing fields
                if (missingKeys.length > 0) {
                  errors.push(
                    `Row ${index + 1} missing field(s): ${missingKeys?.join(
                      ", ",
                    )}`,
                  );
                }

                // Inv Number validation - max 16 characters
                if (
                  invoice["Inv Number"] &&
                  invoice["Inv Number"].length > 16
                ) {
                  errors.push(
                    `Row ${index + 1} has Inv Number exceeding 16 characters`,
                  );
                }

                // Inv Curr validation - must be a string
                if (
                  invoice["Inv Curr"] &&
                  typeof invoice["Inv Curr"] !== "string"
                ) {
                  errors.push(
                    `Row ${index + 1} has Inv Curr which is not a string`,
                  );
                }

                // Final Inv Amount validation - must be an integer
                if (
                  invoice["Final Inv Amount"] &&
                  !Number.isInteger(Number(invoice["Final Inv Amount"]))
                ) {
                  errors.push(
                    `Row ${index + 1
                    } has Final Inv Amount which is not an integer`,
                  );
                }

                // 🧹 Clean and validate Inv Date (handles hidden characters)
                let invDate = invoice["Inv Date(DD-MM-YYYY)"];
                if (typeof invDate === "number") {
                  invDate = this.excelSerialToDate(invDate);
                }

                const cleanDate = String(invDate)
                  .trim()
                  .replace(/\u200B/g, "");

                if (/[^0-9-]/.test(cleanDate)) {
                  errors.push(
                    `Row ${index + 1} has invalid characters in Inv Date`,
                  );
                } else if (!dateRegex.test(cleanDate)) {
                  errors.push(
                    `Row ${index + 1
                    } has invalid Inv Date format (expected DD-MM-YYYY)`,
                  );
                }

                return errors.length > 0 ? errors.join("; ") : null;
              })
              .filter(Boolean);

            if (missingInfo.length > 0) {
              return res.status(400).json({
                message: `Validation failed - ${missingInfo}`,
                details: missingInfo,
              });
            }
          } else {
            return res.status(400).json({
              message: "Invalid file format. Only CSV and XLSX allowed",
            });
          }

          if (!parsedData.length) {
            return res
              .status(400)
              .json({ message: "No valid data found in file" });
          }

          parsedData = parsedData.map((row) => ({
            ...row,
            etd:
              typeof row.etd === "number"
                ? new Date((row.etd - 25569) * 86400 * 1000).toISOString()
                : row.etd,
            eta:
              typeof row.eta === "number"
                ? new Date((row.eta - 25569) * 86400 * 1000).toISOString()
                : row.eta,
            invoice_date:
              row.invoice_date && typeof row.invoice_date === "string"
                ? new Date(
                  `${row.invoice_date.split("-")[2]}-${row.invoice_date.split("-")[1]
                  }-${row.invoice_date.split("-")[0]}`,
                ).toISOString()
                : row.invoice_date,
          }));

          const invoice = await invoiceService.AddLogisticsInvoice(
            req?.body,
            vendor_id,
            parsedData,
            req?.body?.invoice_files,
            user_id,
            publicUrl,
          );

          if (!invoice?.status) {
            return await this.errors(
              req,
              res,
              this.status.HTTP_BAD_REQUEST,
              invoice?.data || "Failed to create invoice",
            );
          }

          if (req?.body?.Invoice_Status_Id == 100)
            await notificationService.createNotification({
              User_Id: invoice?.crPersonId,
              Vendor_Id: req?.user?.vendor_id,
              Entity_Id: req?.body?.CoCd,
              Message: `New Logistics invoice has been created with invoice number ${invoice?.data?.[0]?.InvNo
                } by vendor ${invoice?.vendor?.Vendor_Name_EN
                } submitted on ${new Date().toDateString()}. Please review and take appropriate action.`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: invoice?.data?.[0]?.ID,
              CreatedBy: req?.user?.id,
            });

          return await this.success(
            req,
            res,
            this.status.HTTP_OK,
            invoice?.data,
            "Invoices imported successfully",
          );
        } catch (parseError) {
          return res.status(500).json({
            message: "Error parsing file data",
            error: parseError?.message,
          });
        }
      });
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  excelSerialToDate(serial: number): string {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel starts 30 Dec 1899
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }

  async mainLogisticsList(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const userId = req?.user?.id;
      const role_id = req?.user?.role_id;
      const vendorId = req?.user?.vendor_id;
      const entityId = req?.query?.entity_id
        ? String(req?.query?.entity_id)
        : undefined;

      if (!entityId) {
        throw new APIError(
          "Entity ID is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let vendorIds: number[] = [];

      if (req?.user?.role_id === 3) {
        vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entityId,
        );
      }

      const invoices = await InvoiceService.mainLogisticsList({
        page,
        limit,
        month,
        year,
        sort,
        sort_column,
        userId,
        vendorId,
        startDate,
        endDate,
        currency,
        status,
        category,
        role_id,
        entityId,
        vendorIds,
      });

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async logisticsListByMonth(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
        search,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const userId = req?.user?.id;
      const role_id = req?.user?.role_id;
      const vendorId = req?.user?.vendor_id;
      const emp_id = req?.user?.emp_id;
      const entityId = req?.query?.entity_id
        ? String(req?.query?.entity_id)
        : undefined;
      let invoices;

      if (req?.user?.role_id == 1) {
        invoices = await InvoiceService.logisticsListByMonth({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          role_id,
          vendorId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
        });
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entityId,
        );
        invoices = await InvoiceService.logisticsListByMonthForAdmin({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          emp_id,
          role_id,
          vendorId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
          vendorIds,
        });
      } else {
        invoices = await InvoiceService.logisticsListByMonthForAdmin({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          emp_id,
          role_id,
          vendorId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
        });
      }

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async InvoiceListExport(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        search,
      } = req?.query ?? {};
      const category = req?.query?.category
        ? Number(req?.query?.category)
        : undefined;
      const entityId = req?.query?.entity_id
        ? String(req?.query?.entity_id)
        : undefined;
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;
      const userId = req?.user?.id;
      let result;

      const format = req?.query?.format as "csv" | "xls"; // 'csv' or 'xls'
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      if (req?.user?.role_id == 1) {
        let vendorId = req?.user?.vendor_id;
        result = await InvoiceService.getVendorInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          vendorId,
          entityId,
        });
      } else {
        result = await InvoiceService.getInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
        });
      }

      if (!result || !result.status) {
        throw new APIError(
          "No Relevant Data Found",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      const items = (result?.data?.results ?? []).map((item: any) => ({
        invoice_no: item?.InvNo,
        vendor_id: item?.vendorDetails?.Vendor_SAP_Code,
        vendor_name: item?.vendorDetails?.Vendor_Name_EN,
        date: new Date(item?.InvDt).toLocaleDateString("en-GB"),
        currency: item?.InvCurr,
        inv_value: item?.InvAmt,
        ReferenceNo: item?.Invoice_acc_doc_number,
        inv_due_date: item?.Invoice_Due_Date
          ? new Date(item?.Invoice_Due_Date).toLocaleDateString("en-GB")
          : "",
        status: item?.status?.Status_classification,
      }));

      let headers;

      if (isArabic) {
        if (category == 1) {
          headers = [
            { header: "رقم الفاتورة", key: "invoice_no" },
            { header: "التاريخ", key: "date" },
            { header: "العملة", key: "currency" },
            { header: "قيمة الفاتورة", key: "inv_value" },
            { header: "تاريخ استحقاق الفاتورة", key: "inv_due_date" },
            { header: "الحالة", key: "status" },
          ];

          if (req?.user?.role_id != 1) {
            headers.splice(1, 0, { header: "اسم المورد", key: "vendor_name" });
            headers.splice(2, 0, { header: "رمز المورد", key: "vendor_id" });
          }
        } else if (category == 4) {
          headers = [
            { header: "رقم الفاتورة", key: "invoice_no" },
            { header: "التاريخ", key: "date" },
            { header: "العملة", key: "currency" },
            { header: "قيمة الفاتورة", key: "inv_value" },
            { header: "الحالة", key: "status" },
          ];

          if (req?.user?.role_id != 1) {
            headers.splice(1, 0, { header: "اسم المورد", key: "vendor_name" });
            headers.splice(2, 0, { header: "رمز المورد", key: "vendor_id" });
          }
        } else {
          // category 2 and 3 keep existing Arabic headers
          headers = [
            { header: "رقم الفاتورة", key: "invoice_no" },
            { header: "التاريخ", key: "date" },
            { header: "العملة", key: "currency" },
            { header: "قيمة الفاتورة", key: "inv_value" },
            { header: "تاريخ استحقاق الفاتورة", key: "inv_due_date" },
            { header: "الحالة", key: "status" },
          ];

          if (req?.user?.role_id != 1) {
            headers.splice(1, 0, { header: "اسم المورد", key: "vendor_name" });
            headers.splice(2, 0, { header: "رمز المورد", key: "vendor_id" });
          }
        }
      } else {
        headers = [
          { header: "Invoice number", key: "invoice_no" },
          { header: "Date", key: "date" },
          { header: "Currency", key: "currency" },
          { header: "Invoice Value", key: "inv_value" },
          { header: "Due date", key: "inv_due_date" },
          { header: "Status", key: "status" },
        ];

        if (req?.user?.role_id != 1) {
          headers.splice(1, 0, { header: "Vendor Name", key: "vendor_name" });
          headers.splice(2, 0, { header: "Vendor Code", key: "vendor_id" });
        }
      }

      if (req?.user?.role_id != 1) {
        headers.splice(1, 0, { header: "Vendor Name", key: "vendor_name" });
        headers.splice(2, 0, { header: "Vendor Code", key: "vendor_id" });
      }

      if (
        result?.data?.results?.[0]?.Invoice_Category_id == 4 &&
        req?.user?.role_id != 1
      ) {
        headers.splice(6, 1);
      }

      if (
        result?.data?.results?.[0]?.Invoice_Category_id == 4 &&
        req?.user?.role_id == 1
      ) {
        headers.splice(4, 1);
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `invoices`);
        return;
      }

      const links: any = await userService.socialLinks(entityId);

      const fields: string[] = headers.map((h) => h.key);
      let subject;
      let body;
      let fileName;
      if (category == 1) {
        subject = "PO Based Invoices Details";
        body =
          "Please find the attached file which contains the PO based invoices data";
        fileName = "POReport.csv";
      } else if (category == 2) {
        subject = "NON-PO Based Invoices Details";
        body =
          "Please find the attached file which contains the NON-PO based invoices data";
        fileName = "NonPOReport.csv";
      } else if (category == 3) {
        subject = "Logistics Invoices Details";
        body =
          "Please find the attached file which contains the Logistics invoices data";
        fileName = "LogisticsReport.csv";
      } else if (category == 4) {
        subject = "Credit Note Invoices Details";
        body =
          "Please find the attached file which contains the credit note invoices data";
        fileName = "CreditNoteReport.csv";
      }
      await constructMail.CSVEmailV3(
        items,
        email,
        fields,
        headers,
        subject,
        body,
        req?.user?.name,
        links,
        fileName,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "invoice details exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async pendingInvoiceListExport(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
        search,
        entity_id,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;
      const userId = req?.user?.id;

      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      let result;
      if (req?.user?.role_id == 1) {
        let vendorId = req?.user?.vendor_id;
        result = await InvoiceService.getVendorPendingInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          vendorId,
          entity_id,
        });
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entity_id,
        );
        result = await InvoiceService.getPendingInvoices({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entity_id,
          vendorIds,
        });
      } else {
        result = await InvoiceService.getPendingInvoicesForAdmin({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entity_id,
        });
      }

      if (!result || !result.status) {
        throw new APIError(
          "No Relevant Data Found",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const items = (result?.data?.results ?? []).map((item: any) => ({
        invoice_type: item?.category?.Name_En,
        invoice_no: item?.InvNo,
        vendor_id: item?.Vendor_id,
        date: item?.Submitted_Date,
        currency: item?.InvCurr,
        inv_value: item?.InvAmt,
        inv_due_date: item?.Invoice_Due_Date,
        status: item?.Invoice_Status_Id,
      }));

      const headers = [
        { header: "Invoice Type", key: "invoice_type" },
        { header: "Invoice number", key: "invoice_no" },
        { header: "Date", key: "date" },
        { header: "Currency", key: "currency" },
        { header: "Invoice Value", key: "inv_value" },
        { header: "Due date", key: "inv_due_date" },
        { header: "Status", key: "status" },
      ];

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `invoices`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmailV4(
        items,
        email,
        fields,
        headers,
        "All Invoices Details",
        "Please find the attached file which contains the invoices data",
        req?.user?.name,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "invoice details exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async mainLogisticsListExport(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;
      const userId = req?.user?.id;

      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;
      const role_id = req?.user?.role_id;
      const vendorId = req?.user?.vendor_id;
      const email = req?.user?.email;
      const userName = req?.user?.name;
      const entityId = req?.query?.entity_id
        ? String(req?.query?.entity_id)
        : undefined;
      if (!entityId) {
        throw new APIError(
          "Entity ID is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const links: any = await userService.socialLinks(entityId);
      const result = await InvoiceService.mainLogisticsList({
        page,
        limit,
        month,
        year,
        sort,
        sort_column,
        userId,
        vendorId,
        role_id,
        startDate,
        endDate,
        currency,
        status,
        category,
        entityId,
      });

      if (!result || !result.status) {
        throw new APIError(
          "No Relevant Data Found",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      const items = (result?.data?.results ?? []).map((item: any) => ({
        month: item?.month,
        year: item?.year,
        total_amt: Number(item?.totalAmount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        inv_created: item?.invoiceCreated,
        inv_pending: item?.invoicePending,
        inv_approved: item?.invoiceApproved,
        inv_rejected: item?.invoiceRejected,
      }));
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      let headers;

      if (isArabic) {
        headers = [
          { header: "الشهر", key: "month" },
          { header: "السنة", key: "year" },
          { header: "المبلغ الإجمالي", key: "total_amt" },
          { header: "تم إنشاء الفاتورة", key: "inv_created" },
          { header: "فاتورة قيد الانتظار", key: "inv_pending" },
          { header: "تمت الموافقة على الفاتورة", key: "inv_approved" },
          { header: "تم رفض الفاتورة", key: "inv_rejected" },
        ];
      } else {
        headers = [
          { header: "Month", key: "month" },
          { header: "Year", key: "year" },
          { header: "Total amount", key: "total_amt" },
          { header: "Invoice Created", key: "inv_created" },
          { header: "Invoice Pending", key: "inv_pending" },
          { header: "Invoice Approved", key: "inv_approved" },
          { header: "Invoice Rejected", key: "inv_rejected" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `invoices`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "All Logistic Invoices Details",
        "Please find the attached file which contains the Logistic invoices available",
        userName,
        "LogisticInvoiceReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "invoice details exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async invoiceDropdown(req: any, res: any, next: NextFunction) {
    try {
      const { category, vendor_id } = req?.query ?? {};

      const invoices = await InvoiceService.invoiceDropdown({
        vendor_id,
        category,
      });

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get Invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async editLogisticsInvoice(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body;
      let fileDatas: any = [];
      delete body.Document_type;
      let vendor_id = req?.user?.vendor_id;

      let getLineDetails = await InvoiceService.editLogisticsInvoice(
        body,
        vendor_id,
        transaction,
      );

      if (req?.body?.Invoice_Status_Id == 100)
        await notificationService.createNotification({
          User_Id: getLineDetails?.crPersonId,
          Vendor_Id: req?.user?.vendor_id,
          Entity_Id: req?.body?.CoCd,
          Message: `New Logistics invoice has been created with invoice number ${getLineDetails?.data?.InvNo
            } by vendor ${getLineDetails.vendor?.Vendor_Name_EN
            } submitted on ${new Date().toDateString()}. Please review and take appropriate action.`,
          Module_Category_Id: NotificationCategory.Logistics_Invoice,
          Redirect_Id: getLineDetails?.data?.ID,
          CreatedBy: req?.user?.id,
        });

      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        getLineDetails?.data,
        "Logistics - Invoice updated Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  }

  async logisticsApproval(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved, rejectionReason } = req?.body ?? {};
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await InvoiceService.logisticsApproval(
        req?.user?.emp_id,
        updatedId,
        isApproved,
        rejectionReason,
        { id: req?.user?.id, vendor_id: req?.user?.vendor_id },
      );

      if (!result?.status) {
        return await this.success(req, res, this.status.HTTP_OK, result?.data);
      }
      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async logisticsApprovalBulk(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved, rejectionReason } = req?.body ?? {};
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await InvoiceService.logisticsApprovalBulk(
        req?.user?.emp_id,
        updatedId,
        isApproved,
        rejectionReason,
        { id: req?.user?.id, vendor_id: req?.user?.vendor_id },
      );

      if (!result?.status) {
        return await this.success(req, res, this.status.HTTP_OK, result?.data);
      }
      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      //next(error);
    }
  }

  async reqCreditNote(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.body;
      const userId = req?.user?.user_id;
      const vendorId = req?.user?.vendor_id;
      const entityId = req?.query?.entity_id;

      const result = await InvoiceService.reqCreditNote(
        body,
        userId,
        vendorId,
        entityId,
      );

      return await this.success(req, res, this.status.HTTP_OK, []);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async logisticsListByMonthExport(req: any, res: any, next: NextFunction) {
    try {
      const {
        month,
        year,
        sort,
        sort_column,
        startDate,
        endDate,
        currency,
        status,
        category,
        search,
        format,
        mode,
      } = req?.query ?? {};

      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;
      const vendorId = req?.user?.vendor_id;
      const entityId = req?.query?.entity_id
        ? String(req?.query?.entity_id)
        : undefined;
      const userId = req?.user?.id;
      const role_id = req?.user?.role_id;
      const email = req?.user?.email;
      const userName = req?.user?.name || "User";
      let emp_id = req?.user?.emp_id;

      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);

      if (isNaN(parsedMonth) || isNaN(parsedYear)) {
        throw new APIError(
          "Invalid or missing 'month' or 'year'",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const links: any = await userService.socialLinks(entityId);

      let result;

      if (req?.user?.role_id == 1) {
        result = await InvoiceService.logisticsListByMonth({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          role_id,
          vendorId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
        });
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entityId,
        );
        result = await InvoiceService.logisticsListByMonthForAdmin({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          emp_id,
          role_id,
          vendorId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
          vendorIds,
        });
      } else {
        result = await InvoiceService.logisticsListByMonthForAdmin({
          page,
          limit,
          month,
          year,
          sort,
          sort_column,
          userId,
          emp_id,
          role_id,
          vendorId,
          startDate,
          endDate,
          currency,
          status,
          category,
          search,
          entityId,
        });
      }

      if (!result || !result?.status || result?.data?.results?.length === 0) {
        throw new APIError("No Data Found", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      const rows = result?.data?.results;

      const items = rows.map((item: any) => {
        let statusVal;
        if (item.Invoice_Status_Id === 1) {
          statusVal = "Submitted for Review";
        } else {
          statusVal = StatusEnum[item.Invoice_Status_Id] || "UNKNOWN";
        }
        const formattedAmount = Number(item.InvAmt).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const base = {
          InvoiceNo: item?.InvNo,
          InvoiceDate: item.InvDt?.toISOString().split("T")[0],
          ReferenceNo: item?.Invoice_acc_doc_number || "N/A",
          Currency: item?.InvCurr,
          Amount: formattedAmount,
          Status: statusVal,
        };

        if ([2, 3, 4].includes(role_id)) {
          return {
            InvoiceNo: base.InvoiceNo,
            VendorName: item.vendorDetails?.Vendor_Name_EN || "",
            VendorCode: item.vendorDetails?.Vendor_SAP_Code || "",
            InvoiceDate: base.InvoiceDate,
            ReferenceNo: base.ReferenceNo,
            Currency: base.Currency,
            Amount: base.Amount,
            Status: base.Status,
          };
        }
        return base;
      });

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;
      if ([2, 3, 4].includes(role_id)) {
        if (isArabic) {
          headers = [
            { header: "رقم الفاتورة", key: "InvoiceNo" },
            { header: "اسم المورد", key: "VendorName" },
            { header: "رمز المورد", key: "VendorCode" },
            { header: "التاريخ", key: "InvoiceDate" },
            { header: "الرقم المرجعي", key: "ReferenceNo" },
            { header: "العملة", key: "Currency" },
            { header: "قيمة الفاتورة", key: "Amount" },
            { header: "الحالة", key: "Status" },
          ];
        } else {
          headers = [
            { header: "Invoice No", key: "InvoiceNo" },
            { header: "Vendor Name", key: "VendorName" },
            { header: "Vendor Code", key: "VendorCode" },
            { header: "Invoice Date", key: "InvoiceDate" },
            { header: "Reference No", key: "ReferenceNo" },
            { header: "Currency", key: "Currency" },
            { header: "Amount", key: "Amount" },
            { header: "Status", key: "Status" },
          ];
        }
      } else {
        if (isArabic) {
          headers = [
            { header: "رقم الفاتورة", key: "InvoiceNo" },
            { header: "التاريخ", key: "InvoiceDate" },
            { header: "الرقم المرجعي", key: "ReferenceNo" },
            { header: "العملة", key: "Currency" },
            { header: "قيمة الفاتورة", key: "Amount" },
            { header: "الحالة", key: "Status" },
          ];
        } else {
          headers = [
            { header: "Invoice No", key: "InvoiceNo" },
            { header: "Invoice Date", key: "InvoiceDate" },
            { header: "Reference No", key: "ReferenceNo" },
            { header: "Currency", key: "Currency" },
            { header: "Amount", key: "Amount" },
            { header: "Status", key: "Status" },
          ];
        }
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
        await exportFile(
          format,
          items,
          headers,
          res,
          `logistics_list_by_month`,
        );
        return;
      }

      const fields: string[] = headers.map((h) => h.key);

      const mailResult = await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Logistics Invoices List By Month",
        `Please find attached list of logistics invoices as You requested`,
        userName,
        "LogisticsListByMonth.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        mailResult.status
          ? "Invoice details exported and emailed successfully"
          : "Mail sending failed",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async invoiceApprove(req: any, res: any, next: NextFunction) {
    try {
      const { vendorId, isApproved, rejectionReason } = req?.body ?? {};
      const userId = req?.user?.id;

      const result = await InvoiceService.invoiceApprove(
        vendorId,
        isApproved,
        userId,
        rejectionReason,
      );

      if (!result?.status) {
        return await this.success(req, res, this.status.HTTP_OK, result);
      }
      return await this.success(req, res, this.status.HTTP_OK, result);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async deleteInvoice(req: any, res: any, next: NextFunction) {
    try {
      const { invoiceIds } = req?.body ?? {};
      const userId = req?.user?.id;

      const result = await InvoiceService.deleteInvoice(invoiceIds, userId);

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          result,
        );
      }

      return await this.success(req, res, this.status.HTTP_OK, result);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async sendApprovalMail(req: any, res: any, next: NextFunction) {
    try {
      const result = await executeInvoiceApprovalMail();

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          result,
        );
      }

      return await this.success(req, res, this.status.HTTP_OK, result?.message);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async bulkSubmitLogisticsInvoices(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { invoiceIds } = req?.body ?? {};
      const vendor_id = req?.user?.vendor_id;
      const userId = req?.user?.id;

      if (
        !invoiceIds ||
        !Array.isArray(invoiceIds) ||
        invoiceIds.length === 0
      ) {
        return await this.success(req, res, this.status.HTTP_BAD_REQUEST, {
          status: false,
          message: "Invoice IDs are required.",
        });
      }

      const result = await InvoiceService.bulkSubmitLogisticsInvoices(
        invoiceIds,
        vendor_id,
        userId,
        transaction,
      );

      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Logistics invoices submitted successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) await transaction.rollback();
      next(error);
    }
  }
}

export default new InvoiceController();
