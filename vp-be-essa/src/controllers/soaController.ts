import { BaseController } from "./baseController";
import soaService from "../helpers/soaService";
import { sequelize } from "../config/sequelize";
import { dateRange, exportFile } from "../utils/globalFunction";
import constructMail from "../utils/constructMail";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { NextFunction } from "express";
import VendorService from "../helpers/vendor.service";
import userService from "../helpers/user.service";
import logger from "../utils/logger";

class SOAController extends BaseController {
  async ValidateSOA(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req?.file?.path) {
        throw new APIError(
          "No file data has been provided",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }
      let validateXLS = await soaService.validateData(
        req?.file?.path,
        transaction,
        req?.user?.vendor_id,
        req?.user?.vendorCode,
        req?.query?.entity_id,
      );

      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        validateXLS?.data,
      );
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      next(error);
    }
  }

  async saoListing(req: any, res: any, next: NextFunction) {
    try {
      const { due_start_date, due_end_date, date } = req?.query ?? {};
      const start_date = due_start_date;
      const end_date = due_end_date;
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {},
        vendor_id;
      let result: any;
      if (req?.user?.role_id == 1) {
        vendor_id = req?.user?.vendor_id;
        result = await soaService.statementOfAccountListing(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id,
        );
        result = await soaService.statementOfAccountListingForBusiness(
          limit,
          page,
          start_date,
          end_date,
          searchQuery,
          query,
          vendorIds,
        );
      } else {
        result = await soaService.statementOfAccountListingForAdmin(
          limit,
          page,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data ? result?.data : [],
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async soaListingByMonth(req: any, res: any, next: NextFunction) {
    try {
      const { startDate, endDate } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {},
        vendor_id;
      let result: any;

      if (req?.user?.role_id == 1) {
        vendor_id = req?.user?.vendor_id;
        result = await soaService.soaListingByMonth(
          limit,
          page,
          vendor_id,
          startDate,
          endDate,
          searchQuery,
          query,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id,
        );
        result = await soaService.soaListingByMonthForBusiness(
          limit,
          page,
          vendorIds,
          startDate,
          endDate,
          searchQuery,
          query,
        );
      } else {
        result = await soaService.soaListingByMonthForAdmin(
          limit,
          page,
          vendor_id,
          startDate,
          endDate,
          searchQuery,
          query,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data ? result?.data : [],
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async saoHistory(req: any, res: any, next: NextFunction) {
    try {
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let { ...query } = req?.query || {};
      let result: any;

      if (req?.user?.role_id == 1) {
        let vendorId = req?.user?.vendor_id;
        result = await soaService.soaHistoryListing(
          limit,
          page,
          query.vendor_id,
          query,
          vendorId,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id,
        );

        result = await soaService.soaHistoryListingForBusiness(
          limit,
          page,
          vendorIds,
          query,
        );
      } else {
        result = await soaService.soaHistoryListingForAdmin(
          limit,
          page,
          query.vendor_id,
          query,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data ? result?.data : [],
        "Statement of Account History Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getOneSOA(req: any, res: any, next: NextFunction) {
    try {
      let query = req?.query;

      const result: any = await soaService.getOneSOA(query);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Statement of Account History Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async saoAllListing(req: any, res: any) {
    try {
      const entity_id = req.query?.entity_id;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      if (!entity_id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          [],
          "Entity id is needed",
        );
      }
      const result: any = await soaService.allStatementOfAccountListing(
        limit,
        page,
        entity_id,
        dateTimeRange,
        searchQuery,
        query,
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Statement of Account Fetched successfully",
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

  async saoAllHistory(req: any, res: any) {
    try {
      const id = req?.user?.vendor_register_id;
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let { ...query } = req?.query || {};

      const result: any = await soaService.allSOAHistoryListing(
        limit,
        page,
        id,
        query,
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Statement of Account History Fetched successfully",
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

  async soaExport(req: any, res: any, next: NextFunction) {
    try {
      const { startDate, endDate } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 1000;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const result = await soaService.soaListingByMonth(
        limit,
        page,
        query.vendor_id,
        startDate,
        endDate,
        searchQuery,
        query,
      );

      const format = req?.query?.format as "csv" | "xls";

      const soaItems = (result?.data?.result?.results ?? []).map(
        (item: any) => ({
          type: item?.Category,
          reference: item?.Document_Number,
          currency_type: item?.Curr,
          accounted_date: item?.Document_Date,
          amount: item?.Amount,
          due_date: item?.Due_Date,
          reconciliation_status: item?.ReconStatus,
          reconciliation_comments: item?.ReconDetails,
        }),
      );

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      const headers = isArabic
        ? [
          { header: "النوع", key: "type" },
          { header: "رقم الفاتورة/إشعار دائن", key: "reference" },
          { header: "العملة", key: "currency_type" },
          { header: "تاريخ الفاتورة/الإشعار", key: "accounted_date" },
          { header: "المبلغ حسب العملة", key: "amount" },
          { header: "تاريخ الاستحقاق", key: "due_date" },
          { header: "حالة التسوية", key: "reconciliation_status" },
          { header: "ملاحظات التسوية", key: "reconciliation_comments" },
        ]
        : [
          { header: "Type", key: "type" },
          { header: "Invoice/Credit Note No", key: "reference" },
          { header: "Currency", key: "currency_type" },
          { header: "Invoice/Credit Date", key: "accounted_date" },
          { header: "Amount per Currency", key: "amount" },
          { header: "Due Date", key: "due_date" },
          { header: "Reconcilliation Status", key: "reconciliation_status" },
          {
            header: "Reconciliation Comments",
            key: "reconciliation_comments",
          },
        ];

      if (!["csv", "xls"].includes(format)) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invalid format. Only 'csv' and 'xls' are supported.",
        );
      }
      if (["csv", "xls"].includes(format)) {
        await exportFile(
          format,
          soaItems,
          headers,
          res,
          `Statement Of Account`,
        );
      } else {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          soaItems,
          "SOA List exported successfully",
        );
      }
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async mailsoa(req: any, res: any, next: NextFunction) {
    try {
      const email = req?.user?.email;
      const { startDate, endDate } = req?.body ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 1000;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.body || {};

      const result: any = await soaService.soaListingByMonthforMail(
        limit,
        page,
        query.vendor_id,
        startDate,
        endDate,
        searchQuery,
        query,
      );

      const soaItems = (result?.data?.result?.results ?? []).map(
        (item: any) => ({
          type: item.Category || "NA",
          reference: item.Document_Number,
          currency_type: item.Curr,
          accounted_date: item.Document_Date,
          amount: item.Amount,
          due_date: item.Due_Date,
          reconciliation_status: item.ReconStatus,
          reconciliation_comments: item.ReconDetails,
        }),
      );

      const isArabic = String(req?.query?.isArabic) || "true";

      const headersEn: any = {
        type: "Type",
        reference: "Invoice/Credit Note No",
        currency_type: "Currency",
        accounted_date: "Invoice/Credit Date",
        amount: "Amount per Currency",
        due_date: "Due Date",
        reconciliation_status: "Reconcilliation Status",
        reconciliation_comments: "Reconciliation Comments",
      };

      const headersAr: any = {
        type: "النوع",
        reference: "رقم الفاتورة / إشعار دائن",
        currency_type: "العملة",
        accounted_date: "تاريخ الفاتورة / الإشعار الدائن",
        amount: "المبلغ حسب العملة",
        due_date: "تاريخ الاستحقاق",
        reconciliation_status: "حالة التسوية",
        reconciliation_comments: "ملاحظات التسوية",
      };
      const headers = isArabic ? headersAr : headersEn;

      const fields: string[] = Object.keys(headers);
      await constructMail.CSVEmailForSOA(
        soaItems,
        email,
        fields,
        headers,
        "Statement of Account",
        `Please find the attached file which contains the Statement of Account`,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        soaItems,
        "SOA List exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async allSOAExport(req: any, res: any) {
    try {
      const entity_id = req?.query?.entity_id;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const result: any = await soaService.allStatementOfAccountListing(
        limit,
        page,
        entity_id,
        dateTimeRange,
        searchQuery,
        query,
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }
      const format = req?.query?.format as "csv" | "xls";

      const soaItems = (result?.data?.result?.results ?? []).map(
        (item: any) => ({
          type: item?.type,
          reference: item?.reference,
          vendor_name: item?.vendorSOAData?.vendor_name,
          vendor_code: item?.vendorSOAData?.id,
          currency_type: item?.currency_type,
          accounted_date: item?.accounted_date,
          currency: item?.currency,
          due_date: item?.due_date,
          reconciliation_status: item?.reconciliation_status,
          reconciliation_comments: item?.reconciliation_comments,
        }),
      );

      const headers = [
        { header: "Type", key: "type" },
        { header: "Invoice/Credit Note No", key: "reference" },
        { header: "Currency", key: "currency_type" },
        { header: "Vendor Name", key: "vendor_name" },
        { header: "Vendor Code", key: "vendor_code" },
        { header: "Invoice/Credit Date", key: "accounted_date" },
        { header: "Amount per Currency", key: "currency" },
        { header: "Due Date", key: "due_date" },
        { header: "Reconcilliation Status", key: "reconciliation_status" },
        { header: "Reconciliation Comments", key: "reconciliation_comments" },
      ];

      if (!["csv", "xls"].includes(format)) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invalid format. Only 'csv' and 'xls' are supported.",
        );
      }
      if (["csv", "xls"].includes(format)) {
        await exportFile(
          format,
          soaItems,
          headers,
          res,
          `Statement Of Account`,
        );
      } else {
        // PDF
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          soaItems,
          "SOA List exported successfully",
        );
      }
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

  async mailAllSOA(req: any, res: any) {
    try {
      const entity_id = req?.query?.entity_id;
      const email = req?.user?.email;
      const { time_interval, start_date, end_date } = req?.query ?? {};
      const dateTimeRange: any = dateRange(time_interval, start_date, end_date);
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};

      const links: any = await userService.socialLinks(query.entity_id);

      const result: any = await soaService.allStatementOfAccountListing(
        limit,
        page,
        entity_id,
        dateTimeRange,
        searchQuery,
        query,
      );

      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }

      const soaItems = (result?.data?.result?.results ?? []).map(
        (item: any) => ({
          type: item?.type,
          reference: item?.reference,
          currency_type: item?.currency_type,
          vendor_name: item?.vendorSOAData?.vendor_name,
          vendor_code: item?.vendorSOAData?.id,
          accounted_date: item?.accounted_date,
          currency: item?.currency,
          due_date: item?.due_date,
          reconciliation_status: item?.reconciliation_status,
          reconciliation_comments: item?.reconciliation_comments,
        }),
      );

      const headers: any = {
        type: "Type",
        reference: "Invoice/Credit Note No",
        currency_type: "Currency",
        vendor_name: "Vendor Name",
        vendor_code: "Vendor Code",
        accounted_date: "Invoice/Credit Date",
        currency: "Amount per Currency",
        due_date: "Due Date",
        reconciliation_status: "Reconcilliation Status",
        reconciliation_comments: "Reconciliation Comments",
      };
      const fields: string[] = Object.keys(headers);
      await constructMail.CSVEmail(
        soaItems,
        email,
        fields,
        headers,
        "Statement of Account",
        `Please find the attached file which contains the Statement of Account`,
        req?.user?.name || "User",
        "SOAReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        soaItems,
        "SOA List exported and emailed successfully",
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

  async editSOA(req: any, res: any, next: NextFunction) {
    try {
      let body = req.body;

      const result: any = await soaService.editSOA(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result.data,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateInvType(req: any, res: any, next: NextFunction) {
    try {
      let body = req.body;

      const result: any = await soaService.updateInvType(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result.data,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async saoListingDashboard(req: any, res: any, next: NextFunction) {
    try {
      // const id = req.user?.vendor_register_id; this will come from req.query.vendor_id
      const { time_interval, start_date, end_date } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {},
        vendor_id;
      let result: any;

      if (req?.user?.role_id == 1) {
        vendor_id = req?.user?.vendor_id;
        result = await soaService.statementOfAccountListingDashboard(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id,
        );
        result = await soaService.statementOfAccountListingForBusinessDashboard(
          limit,
          page,
          vendorIds,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      } else {
        result = await soaService.statementOfAccountListingForAdminDashboard(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async saoDashboardPendingReconcilation(
    req: any,
    res: any,
    next: NextFunction,
  ) {
    try {
      // const id = req.user?.vendor_register_id; this will come from req.query.vendor_id
      const { time_interval, start_date, end_date } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {},
        vendor_id;
      let result: any;

      if (req?.user?.role_id == 1) {
        vendor_id = req?.user?.vendor_id;
        result = await soaService.statementOfAccountListingDashboardPR(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id,
        );
        result =
          await soaService.statementOfAccountListingForBusinessDashboardPR(
            limit,
            page,
            vendorIds,
            start_date,
            end_date,
            searchQuery,
            query,
          );
      } else {
        result = await soaService.statementOfAccountListingForAdminDashboardPR(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async saoListingPayableMonth(req: any, res: any, next: NextFunction) {
    try {
      // const id = req.user?.vendor_register_id; this will come from req.query.vendor_id
      const { time_interval, start_date, end_date } = req?.query ?? {};
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {},
        vendor_id;
      let result: any;

      if (req?.user?.role_id == 1) {
        vendor_id = req?.user?.vendor_id;
        result = await soaService.statementOfAccountListingPayable(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      } else if (req?.user?.role_id == 3) {
        const vendorIds = await VendorService.getVendorsId(
          req?.user?.emp_id,
          query.entity_id,
        );
        result = await soaService.statementOfAccountListingForBusinessPayable(
          limit,
          page,
          vendorIds,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      } else {
        result = await soaService.statementOfAccountListingForAdminPayable(
          limit,
          page,
          vendor_id,
          start_date,
          end_date,
          searchQuery,
          query,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async StatementOfAccountExport(req: any, res: any, next: NextFunction) {
    try {
      const { format, mode, search, start_date, end_date } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 10000;
      const roleId = req?.user?.role_id;
      const vendorId = req?.user?.vendor_id;
      const email = req?.user?.email;

      // Get data, always pass arguments individually
      let result: any;
      if (roleId === 1) {
        result = await soaService.statementOfAccountListing(
          limit,
          page,
          vendorId,
          start_date,
          end_date,
          search,
          req?.query,
        );
      } else if ([3].includes(roleId)) {
        result = await soaService.statementOfAccountListingForBusiness(
          limit,
          page,
          start_date,
          end_date,
          search,
          req?.query,
        );
      } else if ([2, 4].includes(roleId)) {
        result = await soaService.statementOfAccountListingForAdmin(
          limit,
          page,
          start_date,
          end_date,
          search,
          req?.query,
        );
      } else {
        throw new APIError("Unauthorized role", StatusCodeEnum.HTTP_FORBIDDEN);
      }

      if (!result || !result.status) {
        throw new APIError(
          "No Relevant Data Found",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );
      }

      // Use .results for main data array
      const rows: any[] = result?.data?.result?.results ?? [];

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      const isAdmin = [2, 3, 4].includes(roleId);

      let headers = isArabic
        ? [
          { header: "النوع", key: "InvType" },
          { header: "رقم الفاتورة", key: "Reference" },
          { header: "التاريخ", key: "DocDate" },
          { header: "العملة", key: "Curr" },
          { header: "المبلغ", key: "Amount" },
          { header: "تاريخ الاستحقاق", key: "DueDate" },
          { header: "حالة التسوية", key: "Reconciliation_status" },
          { header: "ملاحظات التسوية", key: "Reconciliation_comments" },
        ]
        : [
          { header: "Type", key: "InvType" },
          { header: "Invoice No", key: "Reference" },
          { header: "Date", key: "DocDate" },
          { header: "Currency", key: "Curr" },
          { header: "Amount", key: "Amount" },
          { header: "Due Date", key: "DueDate" },
          { header: "Reconciliation Status", key: "Reconciliation_status" },
          {
            header: "Reconciliation Comments",
            key: "Reconciliation_comments",
          },
        ];

      if (isAdmin) {
        if (isArabic) {
          headers.push({ header: "رمز المورد", key: "Vendor_SAP_Code" });
          headers.push({ header: "اسم المورد", key: "Vendor_Name_EN" });
        } else {
          headers.push({ header: "Vendor Code", key: "Vendor_SAP_Code" });
          headers.push({ header: "Vendor Name", key: "Vendor_Name_EN" });
        }
      }

      // Format items
      const items = rows.map((item: any) => {
        const baseRow: {
          InvType: any;
          Reference: any;
          Curr: any;
          DocDate: string;
          DueDate: string;
          Amount: any;
          Reconciliation_status: any;
          Reconciliation_comments: any;
          Vendor_SAP_Code?: any;
          Vendor_Name_EN?: any;
        } = {
          InvType: item.InvType,
          Reference: item.Reference,
          Curr: item.Curr,
          DocDate: item.DocDate
            ? new Date(item.DocDate).toLocaleDateString("en-GB")
            : "",
          DueDate: item.DueDate
            ? new Date(item.DueDate).toLocaleDateString("en-GB")
            : "",
          Amount: item.Amount,
          Reconciliation_status: item.Reconciliation_status,
          Reconciliation_comments: item.Reconciliation_comments,
        };

        if (isAdmin) {
          baseRow["Vendor_SAP_Code"] =
            item.Vendor_SAP_Code || item?.Vendor?.Vendor_SAP_Code;
          baseRow["Vendor_Name_EN"] =
            item?.Vendor?.Vendor_Name_EN || item.Vendor_Name_EN;
        }
        return baseRow;
      });

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
        await exportFile(format, items, headers, res, `soa_export`);
        return;
      }

      // For email: only visible fields

      const links: any = await userService.socialLinks(req?.query?.entity_id);
      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmailV3(
        items,
        email,
        fields,
        headers,
        "Statement of Account Details",
        "Please find attached your Statement of Account data",
        req?.user?.name,
        links,
        "SOA_export.csv",
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        rows,
        "SOA details exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async clearSOA(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.body;

      let result = await soaService.clearSOA(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async clearlogisInvoice(req: any, res: any, next: NextFunction) {
    try {
      let body = req?.body;

      let result = await soaService.clearlogisInvoice(body);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Statement of Account Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new SOAController();
