import { BaseController } from "./baseController";
import EnquiryService from "../helpers/enquiry.service";
import { NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { exportFile } from "../utils/globalFunction";
import constructMail from "../utils/constructMail";
import notificationService from "../helpers/notiticationService";
import vendorService from "../helpers/vendor.service";
import userService from "../helpers/user.service";
import { NotificationCategory } from "../utils/enums/category.enum";
import { Sequelize } from "sequelize";
import logger from "../utils/logger";

class EnquiryController extends BaseController {
  async createEnquiry(req: any, res: any, next: NextFunction) {
    try {
      const payload = req?.body ?? {};
      payload.CreatedBy = req?.user?.id;
      payload.Vendor_id = req?.user?.vendor_id;
      payload.CoCd = req?.query?.entity_id;
      payload.Datetime_submitted = Sequelize.literal("NOW()");

      const enquiry = await EnquiryService.createEnquiry(payload);

      const links: any = await userService.socialLinks(payload.CoCd);

      const vendorDetails = await vendorService.getVendorCR(payload.Vendor_id);

      await notificationService.createNotification({
        User_Id: enquiry?.crPerson?.ID,
        Vendor_Id: req?.user?.vendor_id,
        Entity_Id: payload.CoCd,
        Message: `New Enquiry Created with reference code ${enquiry?.data?.Enquiry_code}`,
        Module_Category_Id: NotificationCategory.Enquiry,
        Redirect_Id: enquiry?.data?.ID,
        CreatedBy: req?.user?.id,
      });

      await constructMail.sendEnquirySubmissionToCr({
        email: enquiry.crPerson?.Email,
        user: enquiry.crPerson?.Name,
        subject: `New Enquiry submitted by ${vendorDetails?.Vendor_Name_EN}`,
        vendorName: vendorDetails?.Vendor_Name_EN,
        entityCode: vendorDetails?.CoCd,
        vendorCode: vendorDetails?.Vendor_SAP_Code,
        enquiryRef: enquiry?.data?.Enquiry_code,
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      await constructMail.sendEnquirySubmissionToVendor({
        email: req?.user?.email,
        user: req?.user?.name,
        subject: `Your enquiry ${enquiry?.data?.Enquiry_code} has been submitted`,
        vendorName: vendorDetails?.Vendor_Name_EN,
        entityCode: vendorDetails?.CoCd,
        vendorCode: vendorDetails?.Vendor_SAP_Code,
        enquiryRef: enquiry?.data?.Enquiry_code,
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiry?.data,
        "Enquiry created successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getEnquiries(req: any, res: any, next: NextFunction) {
    try {
      const userId = req?.user?.id;
      const vendorId = req?.user?.vendor_id;
      const entity_id = req?.query?.entity_id;

      const {
        page,
        limit,
        search,
        status,
        assignedPerson,
        startDate,
        endDate,
        sort,
        sort_column,
      } = req?.query ?? {};

      let enquiries;

      if (req?.user?.role_id == 3) {
        let empId = req?.user?.emp_id;
        enquiries = await EnquiryService.getEnquiriesForBusiness({
          page,
          limit,
          search,
          status,
          assignedPerson,
          startDate,
          endDate,
          sort,
          sort_column,
          vendorId,
          entity_id,
          empId,
        });
      } else {
        enquiries = await EnquiryService.getEnquiries({
          page,
          limit,
          search,
          status,
          assignedPerson,
          startDate,
          endDate,
          sort,
          sort_column,
          vendorId,
          entity_id,
        });
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiries?.data,
        "Enquiries fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getEnquiriesById(req: any, res: any, next: NextFunction) {
    try {
      const vendorId = req?.user?.vendor_id;
      const code = Number(req?.params?.id);

      const enquiries = await EnquiryService.getEnquiriesById(vendorId, code);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiries?.data,
        "Enquiries fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async downloadEnquiriesCSV(req: any, res: any, next: NextFunction) {
    try {
      const vendorId = req?.user?.vendor_id;
      const roleId = req?.user?.role_id;
      const entity_id = req?.query?.entity_id;

      const {
        page,
        search,
        status,
        assignedPerson,
        startDate,
        endDate,
        sort,
        sort_column,
      } = req?.query ?? {};

      const limit = Number(req?.query?.limit) || 1000;
      const format = req?.query?.format as "csv" | "xls"; // 'csv' or 'xls'
      const mode = req?.query?.mode;
      const email = req?.user?.email;
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      const links: any = await userService.socialLinks(entity_id);
      let result;

      if (req?.user?.role_id == 3) {
        let empId = req?.user?.emp_id;
        result = await EnquiryService.getEnquiriesForBusiness({
          page,
          limit,
          search,
          status,
          assignedPerson,
          startDate,
          endDate,
          sort,
          sort_column,
          vendorId,
          entity_id,
          empId,
        });
      } else {
        result = await EnquiryService.getEnquiries({
          page,
          limit,
          search,
          status,
          assignedPerson,
          startDate,
          endDate,
          sort,
          sort_column,
          vendorId,
          entity_id,
        });
      }

      const statusMapping: any = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const items = (result?.data?.results ?? []).map((item: any) => {
        const baseData: any = {
          type: item?.Enquiry_type,
          enquiryId: item?.Enquiry_code,
          subject: item?.Subject,
          contactPerson: item?.assignedPerson?.Employee_Name ?? "",
          date: item?.Datetime_submitted
            ? new Date(item?.Datetime_submitted).toISOString().split("T")[0]
            : item?.CreatedDt
              ? new Date(item?.CreatedDt).toISOString().split("T")[0]
              : "",
          status: statusMapping[item?.Enquiry_status] || "Unknown Status",
        };

        if ([2, 3, 4].includes(roleId)) {
          baseData.vendor_id = item?.Vendor_id;
          baseData.vendor_name = item?.user?.Vendor_Name_EN ?? "";
        }

        return baseData;
      });

      let headers: { header: string; key: string }[];

      if ([2, 3, 4].includes(roleId)) {
        headers = isArabic
          ? [
            { header: "نوع الاستفسار", key: "type" },
            { header: "معرف البائع", key: "vendor_id" },
            { header: "اسم البائع", key: "vendor_name" },
            { header: "معرف الاستعلام", key: "enquiryId" },
            { header: "الموضوع", key: "subject" },
            { header: "جهة الاتصال المعينة", key: "contactPerson" },
            { header: "تاريخ التقديم", key: "date" },
            { header: "الحالة", key: "status" },
          ]
          : [
            { header: "Enquiry Type", key: "type" },
            { header: "Vendor Id", key: "vendor_id" },
            { header: "Vendor Name", key: "vendor_name" },
            { header: "Enquiry ID", key: "enquiryId" },
            { header: "Subject", key: "subject" },
            { header: "Assigned Contact Person", key: "contactPerson" },
            { header: "Submitted Date", key: "date" },
            { header: "Status", key: "status" },
          ];
      } else {
        headers = isArabic
          ? [
            { header: "نوع الاستفسار", key: "type" },
            { header: "معرف الاستفسار", key: "enquiryId" },
            { header: "الموضوع", key: "subject" },
            { header: "جهة الاتصال المعينة", key: "contactPerson" },
            { header: "تاريخ التقديم", key: "date" },
            { header: "الحالة", key: "status" },
          ]
          : [
            { header: "Enquiry Type", key: "type" },
            { header: "Enquiry ID", key: "enquiryId" },
            { header: "Subject", key: "subject" },
            { header: "Assigned Contact Person", key: "contactPerson" },
            { header: "Submitted Date", key: "date" },
            { header: "Status", key: "status" },
          ];
      }

      // Get field keys for CSV export
      const fields: string[] = headers.map((h) => h.key);

      // If mode is "report" → return file to user
      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `enquiries`);
        return;
      }

      // Otherwise → email the file
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Enquiries Details",
        "Please find the attached file containing available enquiries.",
        req?.user?.name || "User",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "Enquiry details exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async sendEnquiryReport(req: any, res: any) {
    try {
      const email = req?.user?.email;
      if (!email) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "UNAUTHORIZED Email Not found",
        );
      }

      const { startDate, endDate, status } = req?.query ?? {};
      if (!email) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Email is required",
        );
      }
      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      let response;

      if (req?.user?.role_id == 3) {
        let empId = req?.user?.emp_id;
        response = await EnquiryService.sendEnquiryReportBusiness(
          startDate,
          endDate,
          email,
          req?.user?.name,
          isArabic,
          status,
          empId,
        );
      } else {
        response = await EnquiryService.sendEnquiryReport(
          startDate,
          endDate,
          email,
          req?.user?.name,
          isArabic,
          status,
        );
      }

      if (!response?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to send enquiry report",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Enquiry report sent successfully",
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

  async getEnquiriesFinance(req: any, res: any) {
    try {
      const {
        page = 1,
        limit = 15,
        search = "",
        status,
        assignedPerson,
        startDate,
        endDate,
        sort,
        sort_column,
        entity_id,
      } = req?.query ?? {};
      const enquiries = await EnquiryService.getEnquiriesFinance({
        page,
        limit,
        search,
        status,
        assignedPerson,
        startDate,
        endDate,
        sort,
        sort_column,
        entity_id,
      });

      if (!enquiries?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to fetch enquiries",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiries?.data,
        "Enquiries fetched successfully",
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

  async downloadEnquiriesFinanceCSV(req: any, res: any) {
    try {
      const { startDate, endDate, entity_id } = req?.query ?? {};
      if (!startDate || !endDate || !entity_id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Start date, end date, and entity ID are required",
        );
      }

      const enquiries = await EnquiryService.getEnquiriesFinanceForCSV(
        startDate,
        endDate,
        entity_id,
      );
      if (!enquiries?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to fetch finance enquiries",
        );
      }
      const isArabic =
        String(req?.query?.isArabic || "").toLowerCase() === "true";

      const csv = EnquiryService.generateFinanceCSV(enquiries?.data, isArabic);
      res.header("Content-Type", "text/csv");
      res.attachment("finance_enquiries.csv");
      return res.send(csv);
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

  async sendEnquiryFinanceReport(req: any, res: any) {
    try {
      const email = req?.user?.email;
      if (!email) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_UNAUTHORIZED,
          "UNAUTHORIZED Email Not found",
        );
      }

      const { startDate, endDate, entity_id } = req?.query ?? {};
      if (!startDate || !endDate || !entity_id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Start date, end date, and entity ID are required",
        );
      }

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";
      const response = await EnquiryService.sendEnquiryFinanceReport(
        startDate,
        endDate,
        entity_id,
        email,
        req?.user?.name,
        isArabic,
      );

      if (!response?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          response?.data,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Finance enquiry report sent successfully",
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

  async editEnquiry(req: any, res: any, next: NextFunction) {
    try {
      const enquiryId = req?.param?.id;
      const payload = req?.body;

      const enquiry = await EnquiryService.editEnquiry(enquiryId, payload);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiry?.data,
        "Enquiry updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateEnquiryStatus(req: any, res: any, next: NextFunction) {
    try {
      const enquiryId = Number(req?.params?.id);
      const { Enquiry_status } = req?.body ?? {};
      const statusId = Enquiry_status;

      if (!enquiryId || !statusId) {
        throw new APIError(
          "Enquiry ID and Enquiry_status are required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await EnquiryService.updateEnquiryStatus(
        enquiryId,
        statusId,
      );

      await notificationService.createNotification({
        User_Id: result?.vendorId?.ID,
        Vendor_Id: req?.user?.vendor_id,
        Entity_Id: result?.data?.CoCd,
        Module_Category_Id: NotificationCategory.Enquiry,
        Redirect_Id: result?.data?.ID,
        Message: `Your Enquiry Request ${result?.data?.Enquiry_code} has been resolved.`,
        CreatedBy: req?.user?.id,
      });
      const links: any = await userService.socialLinks(result?.data?.CoCd);

      const statusMap: Record<number, string> = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const statusText = statusMap[Enquiry_status] || "Unknown";

      await constructMail.sendEnquiryUpdatesToVendor({
        email: result?.vendorId?.Email,
        user: result?.vendorId?.Name,
        subject: `Enquiry ${result?.data?.Enquiry_code} - Status Update`,
        vendorName: result?.vendorId?.Name,
        entityCode: result?.data?.CoCd,
        STATUS: statusText,
        ENQUIRY_CODE: result?.data?.Enquiry_code,
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Enquiry status updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateAssignedPerson(req: any, res: any, next: NextFunction) {
    try {
      const payload = req?.body;
      const vendorId = req?.user?.vendor_id;

      const enquiry = await EnquiryService.updateAssignedPerson(payload);

      await notificationService.createNotification({
        User_Id: payload?.Assigned_contact_person,
        Vendor_Id: vendorId,
        Entity_Id: payload?.entity_id,
        Module_Category_Id: NotificationCategory.Enquiry,
        Redirect_Id: enquiry?.ID,
        Message: `${vendorId?.vendor_name} is following up enquiry by ${payload?.Assigned_contact_person}.`,
        CreatedBy: req?.user?.id,
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiry,
        "Enquiry assigned successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getEnquiriesDashboard(req: any, res: any, next: NextFunction) {
    try {
      const userId = req?.user?.id;
      const vendorId = req?.user?.vendor_id;
      const entity_id = req?.query?.entity_id;

      const {
        page,
        limit,
        search,
        status,
        assignedPerson,
        startDate,
        endDate,
        sort,
        sort_column,
      } = req?.query ?? {};

      let enquiries;

      if (req?.user?.role_id == 3) {
        let empId = req?.user?.emp_id;
        enquiries = await EnquiryService.getEnquiriesForBusinessDashboard({
          page,
          limit,
          search,
          status,
          assignedPerson,
          startDate,
          endDate,
          sort,
          sort_column,
          vendorId,
          entity_id,
          empId,
        });
      } else {
        enquiries = await EnquiryService.getEnquiriesDashboard({
          page,
          limit,
          search,
          status,
          assignedPerson,
          startDate,
          endDate,
          sort,
          sort_column,
          vendorId,
          entity_id,
        });
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        enquiries?.data,
        "Enquiries fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new EnquiryController();
