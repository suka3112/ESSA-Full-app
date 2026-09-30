import { BaseController } from "./baseController";
import AdvancePaymentService from "../helpers/advancePayment.service";
import { exportFile } from "../utils/globalFunction";
import constructMail from "../utils/constructMail";
import { NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import VendorService from "../helpers/vendor.service";
import userService from "../helpers/user.service";
import logger from "../utils/logger";

class AdvancePaymentController extends BaseController {
  async createAdvancePayment(req: any, res: any, next: NextFunction) {
    try {
      const userId = req.user?.id;
      let vendorId;
      if (req?.user?.role_id == 1) {
        vendorId = req?.user?.vendor_id;
      } else {
        vendorId = req?.body?.Vendor_id;
      }
      const entity_id = req?.query?.entity_id;

      let duplicateCheck = await AdvancePaymentService.checkDuplicatePerformaNo(
        req?.body?.Performa_Invoice_Number,
      );
      if (duplicateCheck?.exists) {
        throw new APIError(
          "Proforma Invoice Number already exists. Please create different Proforma Invoice Number.",
          StatusCodeEnum?.HTTP_BAD_REQUEST,
        );
      }
      const payment = await AdvancePaymentService.createAdvancePayment(
        req?.body,
        userId,
        entity_id,
        vendorId,
      );

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        payment?.data,
        "Advance Payment created successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async submitAdvancePayment(req: any, res: any, next: NextFunction) {
    try {
      const paymentId = req?.params?.id;
      const userId = req?.user?.id;
      const vendorId = req?.user?.vendor_id;
      const entity_id = req?.query?.entity_id;

      const payment = await AdvancePaymentService.submitAdvancePayment(
        paymentId,
        userId,
        req?.body,
        vendorId,
        entity_id,
      );

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        [],
        payment?.message,
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getAdvancePayments(req: any, res: any, next: NextFunction) {
    try {
      let { search, status, startDate, endDate, sort, sort_column, entity_id } =
        req?.query;
      const userId = req?.user?.id;
      const vendorId = req?.user?.vendor_id;

      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      let payments;

      if (req?.user?.role_id == 1) {
        payments = await AdvancePaymentService.getVendorAdvancePayments({
          page,
          limit,
          search,
          status,
          startDate,
          endDate,
          sort,
          sort_column,
          entity_id,
          userId,
          vendorId,
        });
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entity_id,
        );
        payments = await AdvancePaymentService.getAdvancePayments({
          page,
          limit,
          search,
          status,
          startDate,
          endDate,
          sort,
          sort_column,
          entity_id,
          userId,
          vendorIds,
        });
      } else {
        payments = await AdvancePaymentService.getAdvancePayments({
          page,
          limit,
          search,
          status,
          startDate,
          endDate,
          sort,
          sort_column,
          entity_id,
          userId,
        });
      }

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        payments?.data,
        "Advance payments retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getAdvancePaymentsOfEntity(req: any, res: any) {
    try {
      const {
        search = "",
        status,
        startDate,
        endDate,
        sort,
        sort_column,
        entity_id,
      } = req?.query;
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;

      const payments = await AdvancePaymentService.getAdvancePaymentsOfEntity({
        page,
        limit,
        search,
        status,
        startDate,
        endDate,
        sort,
        sort_column,
        entity_id,
      });

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        payments?.data,
        "Advance payments retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status?.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions?.internalServerErr(req, error),
      );
    }
  }

  async AdvancePaymentsExport(req: any, res: any) {
    try {
      const {
        search = "",
        status,
        startDate,
        endDate,
        sort,
        sort_column,
        entity_id,
      } = req?.query;
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;
      const format = req?.query?.format as "csv" | "xls"; // 'csv' or 'xls'
      const mode = req?.query?.mode;

      const email = req.user?.email;

      if (!req?.query?.entity_id) {
        return await this.errors(
          req,
          res,
          this.status?.HTTP_BAD_REQUEST,
          "Invalid Entity Id",
        );
      }

      const links: any = await userService.socialLinks(entity_id);

      const result = await AdvancePaymentService.getAdvancePaymentsOfEntity({
        page,
        limit,
        search,
        status,
        startDate,
        endDate,
        sort,
        sort_column,
        entity_id,
      });
      if (!result || !result?.status) {
        return await this.success(
          req,
          res,
          this.status?.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }

      const items = result.data.results.map((item: any) => ({
        invoice_no: item?.po_based_invoice
          ? item?.po_based_invoice
          : item?.non_po_based_invoice,
        vendor_id: item["vendorInfo?.id"],
        vendor_name: item["vendorInfo?.vendor_name"],
        ref_no: item["poInvoiceInf?.id"]
          ? item["poInvoiceInfo?.id"]
          : item["nonPoInvoiceInfo?.id"],
        inv_type: item?.type_of_invoice,
        value: item?.value_of_advance_payment,
        date: item?.createdAt,
        status: item.status,
      }));

      const headers = [
        { header: "Invoice number", key: "invoice_no" },
        { header: "Vendor Id", key: "vendor_id" },
        { header: "Vendor name", key: "vendor_name" },
        { header: "Reference No", key: "ref_no" },
        { header: "Invoice Type", key: "inv_type" },
        { header: "Value of Adv Payment", key: "value" },
        { header: "Date", key: "date" },
        { header: "status", key: "status" },
      ];

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          return await this.errors(
            req,
            res,
            this.status?.HTTP_BAD_REQUEST,
            "Invalid format. Only 'csv' and 'xls' are supported.",
          );
        }

        await exportFile(format, items, headers, res, `advPayments`);
        return;
      }

      const fields: string[] = Object.keys(headers);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Advance Payments Details",
        "Please find the attached file which contains the advance payment details available",
        req?.user?.name || "User",
        "AdvancePaymentReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        result?.data?.results,
        "advance payments exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return await this.errors(
        req,
        res,
        this.status?.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions?.internalServerErr(req, error),
      );
    }
  }

  async getInvoice(req: any, res: any, next: NextFunction) {
    try {
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const { typeOfInvoice } = req?.query;
      let userId = null;
      if (req?.user?.role_id === 1 && req?.user?.vendor_register_id) {
        userId = req?.user?.vendor_register_id;
      }
      const invoices = await AdvancePaymentService.getInvoice({
        page,
        limit,
        typeOfInvoice,
        userId,
      });

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        invoices?.data,
        "Invoices retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getAdvancePaymentById(req: any, res: any, next: NextFunction) {
    try {
      let userId = null;
      if (req?.user?.role_id === 1 && req?.user?.vendor_id) {
        userId = req?.user?.id;
      }
      const id = req?.params?.id;
      let emp_id = req?.user?.emp_id;
      let role = req?.user?.role_id;

      const payments = await AdvancePaymentService.getAdvancePaymentById(
        userId,
        id,
        emp_id,
        role,
      );

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        payments?.data,
        "Advance payments retrieved successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async editAdvancePayment(req: any, res: any, next: NextFunction) {
    try {
      const paymentId = req?.params?.id;
      const updateData = req?.body;
      const userId = req?.user?.id;

      if (!paymentId) {
        throw new APIError(
          "Payment ID is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const updatedPayment = await AdvancePaymentService.editAdvancePayment(
        paymentId,
        userId,
        updateData,
      );

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        updatedPayment?.data,
        "Advance payment updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async downloadAdvancePaymentsCSV(req: any, res: any, next: NextFunction) {
    try {
      const { startDate, endDate, entity_id, status } = req?.query;
      const limit = Number(req?.query?.limit) || 1000;
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      const vendorId = req?.user?.vendor_id;

      const payments = await AdvancePaymentService.getAdvancePaymentsForCSV(
        startDate,
        endDate,
        entity_id,
        limit,
        status,
        req?.user?.role_id,
        vendorId,
      );

      let csv = AdvancePaymentService.generateAdvancePaymentsCSV(
        payments?.data,
        isArabic,
        req?.user?.role_id,
      );

      csv = "\uFEFF" + csv;

      res?.header("Content-Type", "text/csv; charset=utf-8");
      res?.attachment("advance_payments.csv");
      return res?.send(csv);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async sendAdvancePaymentReport(req: any, res: any, next: NextFunction) {
    try {
      const email = req?.user?.email;
      const userId = req?.user?.id;
      if (!email) {
        throw new APIError(
          "UNAUTHORIZED Email Not found",
          StatusCodeEnum.HTTP_UNAUTHORIZED,
        );
      }

      const { startDate, endDate, entity_id, status } = req?.query;
      if (!email) {
        throw new APIError(
          "Email is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      let response;

      if (req?.user?.role_id == 1) {
        response = await AdvancePaymentService.sendVendorAdvancePaymentReport(
          startDate,
          endDate,
          email,
          entity_id,
          isArabic,
          req?.user?.vendor_id,
          status,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          entity_id,
        );
        response = await AdvancePaymentService.sendBusinessAdvancePaymentReport(
          startDate,
          endDate,
          email,
          entity_id,
          isArabic,
          vendorIds,
          status,
        );
      } else {
        response = await AdvancePaymentService.sendAdvancePaymentReport(
          startDate,
          endDate,
          email,
          entity_id,
          isArabic,
          userId,
          status,
        );
      }

      return await this.success(
        req,
        res,
        this.status?.HTTP_OK,
        response?.data,
        "Advance payment report sent successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async advancePaymentApproval(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved, rejectionReason } = req?.body;
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await AdvancePaymentService.advancePaymentApproval(
        req?.user?.emp_id,
        updatedId,
        isApproved,
        rejectionReason,
        { id: req?.user?.id, vendor_id: req?.user?.vendor_id },
      );

      if (!result.status) {
        return await this.success(req, res, this.status?.HTTP_OK, result?.data);
      }
      return await this.success(req, res, this.status?.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async deleteAdvancePayment(req: any, res: any, next: NextFunction) {
    try {
      const { advancePaymentIds } = req?.body;
      const userId = req?.user?.id;

      const result = await AdvancePaymentService.deleteAdvancePayment(
        advancePaymentIds,
        userId,
      );

      if (!result.status) {
        return await this.success(
          req,
          res,
          this.status?.HTTP_BAD_REQUEST,
          result,
        );
      }

      return await this.success(req, res, this.status?.HTTP_OK, result);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new AdvancePaymentController();
