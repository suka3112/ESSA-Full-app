import { NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import { BaseController } from "./baseController";
import employeeService from "../helpers/employee.service";
import { exportFile } from "../utils/globalFunction";
import constructMail from "../utils/constructMail";
import userService from "../helpers/user.service";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

class EmployeeController extends BaseController {
  async addEmployee(req: any, res: any, next: NextFunction) {
    try {
      const response = await employeeService.addEmployee(req?.body);
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        [],
        "employee added successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getEmployee(req: any, res: any, next: NextFunction) {
    try {
      const {
        search = "",
        status,
        role,
        endDate,
        sort,
        sort_column,
        entity_id,
        userId, //comes from middleware
      } = req?.query ?? {};

      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;

      const response = await employeeService.getEmployee({
        page,
        limit,
        search,
        status,
        role,
        endDate,
        sort,
        sort_column,
        entity_id,
        userId,
      });
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response,
        "employee fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async exportEmployee(req: any, res: any, next: NextFunction) {
    try {
      const {
        search = "",
        status,
        role,
        endDate,
        sort,
        sort_column,
        entity_id,
        userId,
        mode,
      } = req?.query ?? {};
      const email = req?.user?.email;
      const format = req?.query?.format as "csv" | "xls";
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 2000;

      const response = await employeeService.getEmployee({
        page,
        limit,
        search,
        status,
        role,
        endDate,
        sort,
        sort_column,
        entity_id,
        userId,
      });

      if ((response?.results?.length ?? 0) == 0) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No Relevant Data Found",
        );
      }

      const items = (response?.results ?? []).map((user: any) => {
        return {
          Name: user?.Name,
          Email: user?.Email,
          Role: user?.user_role ? user?.user_role?.Role_Name_EN : "-",
          Status: user?.Is_Active ? "Active" : "Inactive",
        };
      });

      const headers = [
        { header: "Name", key: "Name" },
        { header: "Email", key: "Email" },
        { header: "Role", key: "Role" },
        { header: "Status", key: "Status" },
      ];

      if (mode === "report") {
        if (!["csv", "xls"].includes(format)) {
          return await this.errors(
            req,
            res,
            this.status.HTTP_BAD_REQUEST,
            "Invalid format. Only 'csv' and 'xls' are supported.",
          );
        }

        await exportFile(format, items, headers, res, `Users`);
        return;
      }

      const fields: string[] = headers.map((h) => h.key);
      await constructMail.CSVEmailV2(
        items,
        email,
        fields,
        headers,
        "Users Details",
        "Please find the attached file which contains the users details available",
        "Users.csv",
      );
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response,
        "employee fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getEmployeeById(req: any, res: any, next: NextFunction) {
    try {
      let response;
      response = await employeeService.getEmployeeById(req?.params?.id);
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response,
        "employee fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async updateEmployee(req: any, res: any, next: NextFunction) {
    try {
      let response;
      let vendorCheck = await userService.findUsers({
        Email: req?.user?.email,
      });
      if (!vendorCheck?.data?.Primary_User) {
        throw new APIError(
          "Access denied: Only the Primary User can update this profile.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      if (req?.body?.isUser) {
        response = await employeeService.updateAdditionalUser(req?.body);
      } else {
        response = await employeeService.updateEmployee(req?.body);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response,
        "employee Updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async deleteEmployee(req: any, res: any, next: NextFunction) {
    try {
      let response;
      if (req?.body?.isUser) {
        response = await employeeService.deleteUsers(req?.params?.id);
      } else {
        response = await employeeService.deleteEmployee(req?.params?.id);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response,
        "employee deleted successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}

export default new EmployeeController();
