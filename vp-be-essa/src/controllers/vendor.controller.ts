import { NextFunction, Request, Response } from "express";
import { BaseController } from "./baseController";
import vendorService from "../helpers/vendor.service";
import { exportFile } from "../utils/globalFunction";
import constructMail from "../utils/constructMail";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum, StatusEnum } from "../utils/enums/status.enum";
import userService from "../helpers/user.service";
import logger from "../utils/logger";
import { executeVendorSync } from "../queues/jobHandlers";

class VendorController extends BaseController {
  /**
   * @description This is vendor api
   * @param req
   * @param res
   * @returns
   */
  async getVendor(req: any, res: Response, next: NextFunction) {
    try {
      const { searchString, status, vendor_code, entity_id } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const { ...query } = req?.query ?? {};
      let role = req?.user?.role_id;
      let emp_id = req?.user?.emp_id;

      const vendors = await vendorService.getVendors(
        page,
        limit,
        searchString as string,
        Number(entity_id),
        query,
        status as string,
        vendor_code as string,
        role,
        emp_id,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendors?.data,
        "vendors fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getVendorExport(req: any, res: any, next: NextFunction) {
    try {
      const { searchString, status, vendor_code, entity_id } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;
      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;
      const { ...query } = req?.query ?? {};
      let role = req?.user?.role_id;
      let emp_id = req?.user?.emp_id;

      const email = req.user?.email;

      const links: any = await userService.socialLinks(query.entityId);

      const result = await vendorService.getVendors(
        page,
        limit,
        searchString as string,
        Number(entity_id),
        query,
        status as string,
        vendor_code as string,
        role,
        emp_id,
      );
      if ((result?.data?.results?.length ?? 0) === 0 || !result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }

      let items = (result?.data?.results ?? []).map((item: any) => ({
        ...item,
        Is_Active: item?.Is_Active ? "Active" : "Inactive",
      }));

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;

      if (isArabic) {
        headers = [
          { header: "رمز المورد", key: "Vendor_SAP_Code" },
          { header: "اسم المورد", key: "Vendor_Name_EN" },
          { header: "اسم المستخدم/البريد الإلكتروني", key: "Email" },
          { header: "الدولة", key: "Country" },
          { header: "الحالة", key: "Is_Active" },
        ];
      } else {
        headers = [
          { header: "Vendor Code", key: "Vendor_SAP_Code" },
          { header: "Vendor name", key: "Vendor_Name_EN" },
          { header: "email", key: "Email" },
          { header: "Country", key: "Country" },
          { header: "status", key: "Is_Active" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          return await this.errors(
            req,
            res,
            this.status.HTTP_BAD_REQUEST,
            "Invalid format. Only 'csv' and 'xls' are supported.",
          );
        }

        await exportFile(format, items, headers, res, `vendors`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Vendors Details",
        "Please find the attached file which contains the vendors details available",
        req?.user?.name || "User",
        "VendorDetailsReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "vendors exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getVendorApplication(req: any, res: Response, next: NextFunction) {
    try {
      const { search, status, vendor_code, entity_id, sort_column, sort } =
        req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      let emp_id = req?.user?.emp_id;
      let vendors;

      if (req?.user?.role_id == 4 || req?.user?.role_id == 2) {
        vendors = await vendorService.getVendorApplicationForAdmin(
          page,
          limit,
          search as string,
          Number(entity_id),
          sort_column as string,
          sort as string,
          status as string,
          vendor_code as string,
          emp_id,
        );
      } else {
        vendors = await vendorService.getVendorApplication(
          page,
          limit,
          search as string,
          Number(entity_id),
          sort_column as string,
          sort as string,
          status as string,
          vendor_code as string,
          emp_id,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendors?.data,
        "vendors application fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getVendorApplicationDetails(
    req: any,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { ref_no } = req?.query ?? {};
      let emp_id: any = req?.user?.emp_id;
      let roleId = req?.user?.role_id;

      const response = await vendorService.getVendorApplicationDetails(
        ref_no as string,
        emp_id,
        roleId,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "vendors application details fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorDropdown(req: Request, res: Response, next: NextFunction) {
    try {
      let response;

      if (req?.query?.entity_id) {
        response = await vendorService.vendorDropdownByEntity(
          req?.query?.entity_id,
        );
      } else {
        response = await vendorService.vendorDropdown();
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "vendors fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorDropdownApplication(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const response = await vendorService.vendorDropdownApplication();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "vendors fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorApplicationExport(req: any, res: any) {
    try {
      const {
        searchString,
        status,
        vendor_code,
        entity_id,
        sort_column,
        sort,
      } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 1000;

      const format = req?.query?.format as "csv" | "xls"; // 'csv' or 'xls'
      const mode = req?.query?.mode;

      const email = req?.user?.email;
      let emp_id = req?.user?.emp_id;

      const links: any = await userService.socialLinks(entity_id);

      const result = await vendorService.getVendorApplication(
        page,
        limit,
        searchString as string,
        Number(entity_id),
        sort_column as string,
        sort as string,
        status as string,
        vendor_code as string,
        emp_id,
      );

      if ((result?.data?.results?.length ?? 0) === 0 || !result?.status) {
        throw new APIError("No Relevant Data Found", StatusCodeEnum.HTTP_OK);
      }

      const items = (result?.data?.results ?? []).map((item: any) => {
        // Clone the item first
        const updatedItem = { ...item };

        // Apply the condition
        if (updatedItem.Is_Added_To_Vendor) {
          updatedItem.Status = 4;
        }

        // Add the derived status
        return {
          ...updatedItem,
          Status: StatusEnum[updatedItem.Status] || "UNKNOWN",
        };
      });

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;

      if (isArabic) {
        headers = [
          { header: "الرقم المرجعي", key: "ID" },
          { header: "اسم المورد", key: "Vendor_Name_EN" },
          { header: "الدولة", key: "Country" },
          { header: "اسم المستخدم/البريد الإلكتروني", key: "Email" },
          { header: "الحالة", key: "Status" },
        ];
      } else {
        headers = [
          { header: "Reference No", key: "ID" },
          { header: "Vendor name", key: "Vendor_Name_EN" },
          { header: "Country", key: "Country" },
          { header: "email", key: "Email" },
          { header: "status", key: "Status" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `vendors`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Vendors Application Details",
        "Please find the attached file which contains the vendors application details available",
        req?.user?.name || "User",
        "VendorApplicationReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "vendors exported and emailed successfully",
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

  async getVendorUpdates(req: any, res: any, next: NextFunction) {
    try {
      const entity_id = req.query?.entity_id;
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      let result;
      let emp_id = req?.user?.emp_id;

      if (req?.user?.role_id == 4 || req?.user?.role_id == 3 || req?.user?.role_id == 2) {
        result = await vendorService.listVendorUpdatesForAdmin(
          limit,
          page,
          entity_id,
          searchQuery,
          query,
          emp_id,
        );
      } else {
        result = await vendorService.listVendorUpdates(
          limit,
          page,
          entity_id,
          searchQuery,
          query,
          emp_id,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Vendor updates details fetched",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async entityUpdates(req: any, res: any, next: NextFunction) {
    try {
      const entity_id = req.query?.entity_id;
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      let result;
      let emp_id = req?.user?.emp_id;

      if (req?.user?.role_id == 4 || req?.user?.role_id == 2) {
        result = await vendorService.entityUpdatesForAdmin(
          limit,
          page,
          entity_id,
          searchQuery,
          query,
          emp_id,
        );
      } else {
        result = await vendorService.entityUpdates(
          limit,
          page,
          entity_id,
          searchQuery,
          query,
          emp_id,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Vendor updates details fetched",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getVendorUpdateDetails(req: any, res: any, next: NextFunction) {
    try {
      const vendor_onboardId = req.query?.vendor_onboardId;
      let emp_id = req?.user?.emp_id;
      let roleId = req?.user?.role_id;

      if (!vendor_onboardId) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invalid vendor onboard Id",
        );
      }

      const result = await vendorService.vendorUpdateDetail(
        vendor_onboardId,
        emp_id,
        roleId,
      );

      if (!result) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result,
          "No data found",
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Vendor updates Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async entityUpdateDetail(req: any, res: any, next: NextFunction) {
    try {
      const entity_mapping_Id = req.query?.ID;
      const vendor_id = req.query?.vendor_id;
      let emp_id = req?.user?.emp_id;
      let roleId = req?.user?.role_id;
      if (!entity_mapping_Id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invalid Entity mapping Id",
        );
      }

      const result = await vendorService.entityUpdateDetail(
        entity_mapping_Id,
        emp_id,
        vendor_id,
        roleId,
      );

      if (!result) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result,
          "No data found",
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Vendor updates Fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorUpdatesApproveReject(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved, rejectionReason, Final_Approval } =
        req?.body ?? {};
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await vendorService.vendorUpdatesApproveReject(
        req?.user?.emp_id,
        updatedId,
        isApproved,
        rejectionReason,
        Final_Approval,
        { id: req?.user?.id, vendor_id: req?.user?.vendor_id },
        req?.user?.role_id,
      );

      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorEntityApproveReject(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved, rejectionReason, Final_Approval } =
        req?.body ?? {};
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await vendorService.vendorEntityApproveReject(
        req?.user?.emp_id,
        updatedId,
        isApproved,
        rejectionReason,
        Final_Approval,
        { id: req?.user?.id, vendor_id: req?.user?.vendor_id },
        req?.user?.role_id,
      );

      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async inlineUpdate(req: any, res: any, next: NextFunction) {
    try {
      const body = req?.body;

      const result = await vendorService.inlineUpdate(body);

      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async nonPOAccess(req: any, res: any, next: NextFunction) {
    try {
      const body = req?.body;

      const result = await vendorService.nonPOAccess(body);

      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorApplicationApproval(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved } = req?.body ?? {};
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await vendorService.vendorApplicationApproval(
        req?.user?.emp_id,
        updatedId,
        isApproved,
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

  async vendorApproval(req: any, res: any, next: NextFunction) {
    try {
      const { updatedId, isApproved, rejectionReason } = req?.body ?? {};
      if (!updatedId) {
        throw new APIError(
          "Invalid updatedId",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const result = await vendorService.vendorApprovalV2(
        req?.user?.emp_id,
        updatedId,
        isApproved,
        rejectionReason,
        { id: req?.user?.id, vendor_id: req?.user?.vendor_id },
        req?.user?.role_id,
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

  async vendorUpdatesExport(req: any, res: any, next: NextFunction) {
    try {
      const entity_id = req.query?.entity_id;
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      let emp_id = req?.user?.emp_id;
      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      if (!req?.query?.entity_id) {
        throw new APIError(
          "Invalid Entity Id",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const links: any = await userService.socialLinks(entity_id);

      const result = await vendorService.listVendorUpdates(
        limit,
        page,
        entity_id,
        searchQuery,
        query,
        emp_id,
      );

      let items = (result?.data?.results ?? []).map((item: any) => ({
        ...item,
        Status: StatusEnum[item?.Status] || "UNKNOWN",
      }));

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;

      if (isArabic) {
        headers = [
          { header: "رمز المورد", key: "Vendor_SAP_Code" },
          { header: "اسم المورد", key: "Vendor_Name_EN" },
          { header: "الدولة", key: "Country" },
          { header: "اسم المستخدم/البريد الإلكتروني", key: "Email" },
          { header: "الحالة", key: "Status" },
        ];
      } else {
        headers = [
          { header: "Vendor Code", key: "Vendor_SAP_Code" },
          { header: "Vendor Name", key: "Vendor_Name_EN" },
          { header: "Country", key: "Country" },
          { header: "Email", key: "Email" },
          { header: "Status", key: "Status" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `vendors`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Vendors Update Details",
        "Please find the attached file which contains the vendors update details",
        req?.user?.name || "User",
        "VendorUpdatesReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "vendors exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async vendorExtensionExport(req: any, res: any, next: NextFunction) {
    try {
      const entity_id = req.query?.entity_id;
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 1000;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let searchQuery = req?.query?.search ? req?.query?.search : "";
      let { ...query } = req?.query || {};
      let emp_id = req?.user?.emp_id;
      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;

      const email = req?.user?.email;

      if (!entity_id) {
        throw new APIError(
          "Invalid Entity Id",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const links: any = await userService.socialLinks(entity_id);
      // Call your existing service to get data
      const result = await vendorService.entityUpdates(
        limit,
        page,
        entity_id,
        searchQuery,
        query,
        emp_id,
      );

      let items = result?.data?.results ?? [];
      items = items.map((item: any) => ({
        Vendor_SAP_Code: item.vendor?.Vendor_SAP_Code || "",
        Vendor_Name_EN: item.vendor?.Vendor_Name_EN || "",
        Country: item.vendor?.Country || "",
        Email: item.vendor?.Email || "",
        Status: StatusEnum[item?.Status] || "UNKNOWN",
      }));

      const isArabic = String(req?.query?.isArabic).toLowerCase() === "true";

      let headers;

      if (isArabic) {
        headers = [
          { header: "رمز المورد", key: "Vendor_SAP_Code" },
          { header: "اسم المورد", key: "Vendor_Name_EN" },
          { header: "الدولة", key: "Country" },
          { header: "اسم المستخدم/البريد الإلكتروني", key: "Email" },
          { header: "الحالة", key: "Status" },
        ];
      } else {
        headers = [
          { header: "Vendor Code", key: "Vendor_SAP_Code" },
          { header: "Vendor Name", key: "Vendor_Name_EN" },
          { header: "Country", key: "Country" },
          { header: "Email", key: "Email" },
          { header: "Status", key: "Status" },
        ];
      }

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        // Export file directly to response
        await exportFile(format, items, headers, res, `entity-updates`);
        return;
      }

      const fields = headers.map((h) => h.key);

      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "Entity Update Details",
        "Please find the attached file with entity update details.",
        req?.user?.name || "User",
        "VendorExtensionReport.csv",
        links,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data?.results,
        "Entity updates exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async VendorUpdateDetailsExport(req: any, res: any, next: NextFunction) {
    try {
      const vendor_onboardId = req.query?.vendor_onboardId;

      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;

      const format = req?.query?.format as "csv" | "xls";
      const mode = req?.query?.mode;

      const email = req?.user?.email;
      let emp_id = req?.user?.emp_id;
      let roleId = req?.user?.role_id;

      const result = await vendorService.vendorUpdateDetail(
        vendor_onboardId,
        emp_id,
        roleId,
      );

      const items = (result?.changedFields ?? []).map((item: any) => {
        return {
          field: item?.field,
          oldValue: item?.old,
          newValue: item?.new,
        };
      });

      const headers = [
        { header: "field", key: "field" },
        { header: "oldValue", key: "oldValue" },
        { header: "newValue", key: "newValue" },
      ];

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          throw new APIError(
            "Invalid format. Only 'csv' and 'xls' are supported.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }

        await exportFile(format, items, headers, res, `vendors`);
        return;
      }

      const fields = headers.map((h) => h.key);
      await constructMail.CSVEmail(
        items,
        email,
        fields,
        headers,
        "All Vendors Update Details",
        "Please find the attached file which contains the all vendors update details",
        req?.user?.name || "User",
        "VendorUpdateDetails.csv",
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "vendors exported and emailed successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async VendorCron(req: any, res: any, next: NextFunction) {
    try {
      let approvedVendor = await vendorService.getApprovedVendor();

      let updateData = await vendorService.UpdateDatas(approvedVendor);

      return await this.success(req, res, this.status.HTTP_OK, approvedVendor);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async VendorCronV1(req: any, res: any, next: NextFunction) {
    try {
      const approvedVendor = await executeVendorSync();

      return await this.success(req, res, this.status.HTTP_OK, approvedVendor);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getVendorHistory(req: any, res: any, next: NextFunction) {
    try {
      const vendorId = req.query?.vendorId;

      if (!vendorId) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Vendor ID is required",
        );
      }

      const result = await vendorService.getVendorHistory(Number(vendorId));

      if (!result || result.length === 0) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No history found for this vendor",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "Vendor history fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateVendor(req: any, res: any, next: NextFunction) {
    try {
      const body = req?.body;
      const result = await vendorService.updateVendor(body, req?.user?.id);

      return await this.success(req, res, this.status.HTTP_OK, result?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new VendorController();
