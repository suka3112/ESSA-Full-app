import { Op, Order, Sequelize, WhereOptions, Transaction } from "sequelize";
import { BaseController } from "../controllers/baseController";
import { Vendor } from "../models/vendor";
import { Vendor_onboard } from "../models/vendorOnboard";
import { VendorHistory } from "../models/vendorHistory";
import pagination from "../utils/pagination";
import { VendorBankData } from "../models/vendorBank";
import { APIError } from "../utils/apiError.utils";
import { StatusEnum, StatusCodeEnum } from "../utils/enums/status.enum";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { Employee } from "../models/employee";
import { EntityMapping } from "../models/entityMapping";
import { User } from "../models/user";
import bcrypt from "bcryptjs";
import constructMail from "../utils/constructMail";
import { UploadFiles } from "../models/uploadFiles";
import userService from "./user.service";
import { sequelize } from "../config/sequelize";
import { VendorBankOnboard } from "../models/vendorBankOnboard";
import { Status } from "../models/status";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import { Entity } from "../models/entity";
import { MasterCodes } from "../models/mastercodes";
import { Country, State } from "country-state-city";
import employeeService from "./employee.service";
import notificationService from "./notiticationService";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import fsExtra from "fs-extra";
import logger from "../utils/logger";

dotenv.config();

class VendorService extends BaseController {
  async getVendors(
    page: number,
    limit: number,
    searchString: string,
    entity_id: number,
    query: any,
    status: string,
    vendor_code: string,
    role: any,
    emp_id: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = query?.sort_column || "CreatedDt";
      let sortDirection = query?.sort || "DESC";
      const order: Order = [];

      switch (sortField) {
        case "vendorCode":
          order.push(["Vendor_SAP_Code", sortDirection]);
          break;
        case "vendorName":
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
        case "status":
          order.push(["Is_Active", sortDirection]);
          break;
        case "email":
          order.push(["Email", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let whereCondition: WhereOptions;

      if (role == 4 || role == 2) {
        whereCondition = {
          CoCd: entity_id,
          ...(searchString && {
            [Op.or]: [
              { ID: { [Op.like]: `%${searchString}%` } },
              { Vendor_Name_EN: { [Op.like]: `%${searchString}%` } },
              { Vendor_Name_AR: { [Op.like]: `%${searchString}%` } },
              { Email: { [Op.like]: `%${searchString}%` } },
              { Vendor_SAP_Code: { [Op.like]: `%${searchString}%` } },
            ],
          }),
        };
      } else {
        let getMyCR = await Employee.findAll({
          where: { Reporting_Manager: emp_id },
        });
        let emp_ids = (getMyCR ?? []).map((emp) => emp.ID);
        emp_ids.push(emp_id);

        let findVendor = await EntityMapping.findAll({
          where: { CR_id: { [Op.in]: emp_ids }, CoCd: entity_id },
          attributes: ["Vendor_id", "ID"],
        });

        // Extract Vendor_id values from findVendor response
        const vendorIds = (findVendor ?? []).map((vendor) => vendor.Vendor_id);

        whereCondition = {
          ID: {
            [Op.in]: vendorIds,
          },
          ...(searchString && {
            [Op.or]: [
              { Vendor_SAP_Code: { [Op.like]: `%${searchString}%` } },
              { Vendor_Name_EN: { [Op.like]: `%${searchString}%` } },
              { Vendor_Name_AR: { [Op.like]: `%${searchString}%` } },
              { Email: { [Op.like]: `%${searchString}%` } },
              { Vendor_SAP_Code: { [Op.like]: `%${searchString}%` } },
            ],
          }),
        };
      }

      if (status != "All" && status) {
        whereCondition.Is_Active = status == "active" ? true : false;
      }

      if (vendor_code) {
        const codes = String(vendor_code)
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c !== "");

        if (codes.length > 0) {
          if (codes.length === 1) {
            whereCondition.Vendor_SAP_Code = codes[0];
          } else {
            whereCondition.Vendor_SAP_Code = { [Op.in]: codes };
          }
        }
      }

      const data = await Vendor.findAndCountAll({
        where: whereCondition,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: [
          "ID",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "Email",
          "Country",
          "Is_Active",
          "Vendor_SAP_Code",
        ],
      });

      let resultWithCountryName: any = (data?.rows ?? []).map((vendor) => ({
        ...(vendor?.get?.() ?? {}),
        Country:
          Country.getCountryByCode(vendor?.Country)?.name || vendor?.Country,
        Status: 4,
      }));

      if (sortField === "country") {
        resultWithCountryName = resultWithCountryName.sort(
          (a: { CountryName: string }, b: { CountryName: string }) => {
            if (sortDirection === "ASC") {
              return a.CountryName.localeCompare(b.CountryName);
            } else {
              return b.CountryName.localeCompare(a.CountryName);
            }
          },
        );
      }

      let finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        finalResult,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getVendorApplication(
    page: number,
    limit: number,
    searchString: string,
    entity_id: number,
    sort_column: string,
    sort: string,
    status: any,
    vendor_code: string,
    Employee_Id: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "ID";
      let sortDirection = sort || "DESC";
      const order: Order = [];

      switch (sortField) {
        case "Vendor_Name_EN":
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
        case "status":
          order.push(["Status", sortDirection]);
          break;
        case "Email":
          order.push(["Email", sortDirection]);
          break;
        case "Application_Number":
          order.push(["Application_Number", sortDirection]);
          break;
        default:
          order.push([
            Sequelize.literal(`
        CASE
          WHEN "Vendor_onboard"."Is_Added_To_Vendor" = 1 THEN 4
          WHEN "onboard_status"."Status_classification" = 'Submitted for Review' THEN 1
          WHEN "onboard_status"."Status_classification" = 'Under Review' THEN 2
          WHEN "onboard_status"."Status_classification" = 'Under Approval' THEN 3
          ELSE 5
        END
      `),
            "ASC",
          ]);
          order.push([sortField, sortDirection]);
          break;
      }

      let checkCR = await Employee.findAll({
        where: { Reporting_Manager: Employee_Id },
        attributes: ["ID", "Reporting_Manager"],
      });

      const orConditions: any[] = [
        { CR_Person_Id: Employee_Id }, // always include this
      ];

      // If CR employees exist, add their IDs to OR conditions
      if (checkCR && checkCR.length > 0) {
        const crIds = (checkCR ?? []).map((emp) => emp.ID);

        orConditions.unshift({
          CR_Person_Id: crIds,
          Is_CR_Approved: true,
        });
      }

      const whereCondition: WhereOptions = {
        CoCd: entity_id,
        Action: { [Op.in]: ["ADD", "EDIT"] },
        [Op.or]: orConditions,
      };

      if (status) {
        whereCondition.Status = parseInt(status);
      }

      if (vendor_code) {
        const vendorCodes = Array.isArray(vendor_code)
          ? vendor_code
          : vendor_code
            .toString()
            .split(",")
            .map((code) => code.trim())
            .filter((code) => code);

        if (vendorCodes.length === 1) {
          whereCondition.ID = vendorCodes[0];
        } else if (vendorCodes.length > 1) {
          whereCondition.ID = { [Op.in]: vendorCodes };
        }
      }

      let searchCondition = {};
      if (searchString) {
        searchCondition = {
          [Op.or]: [
            { Vendor_Name_EN: { [Op.like]: `%${searchString}%` } },
            { Email: { [Op.like]: `%${searchString}%` } },
          ],
        };
      }

      if (searchCondition) {
        Object.assign(whereCondition, searchCondition);
      }

      const data = await Vendor_onboard.findAndCountAll({
        where: whereCondition,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: [
          "ID",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "Email",
          "Country",
          "Status",
          "Application_Number",
          "Is_Added_To_Vendor",
        ],
        include: [
          {
            model: Status,
            as: "onboard_status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
        ],
      });

      let resultWithCountryName = (data?.rows ?? []).map((vendor) => {
        let vendorData = {
          ...(vendor?.get?.() ?? {}),
          Country:
            Country.getCountryByCode(vendor?.Country)?.name || vendor?.Country,
        };

        if (vendor?.Is_Added_To_Vendor && vendorData?.onboard_status) {
          vendorData.onboard_status.Status_classification = "Approved";
        }

        return vendorData;
      });

      if (sortField === "Country") {
        resultWithCountryName = resultWithCountryName.sort((a, b) => {
          if (sortDirection === "ASC") {
            return a.CountryName.localeCompare(b.CountryName);
          } else {
            return b.CountryName.localeCompare(a.CountryName);
          }
        });
      }

      let finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };
      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        finalResult,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getVendorApplicationForAdmin(
    page: number,
    limit: number,
    searchString: string,
    entity_id: number,
    sort_column: string,
    sort: string,
    status: any,
    vendor_code: string,
    Employee_Id: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "ID";
      let sortDirection = sort || "DESC";
      const order: Order = [];

      switch (sortField) {
        case "Vendor_Name_EN":
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
        case "status":
          order.push(["Status", sortDirection]);
          break;
        case "Email":
          order.push(["Email", sortDirection]);
          break;
        case "Application_Number":
          order.push(["Application_Number", sortDirection]);
          break;
        default:
          order.push([
            Sequelize.literal(`
        CASE
          WHEN "Vendor_onboard"."Is_Added_To_Vendor" = 1 THEN 4
          WHEN "onboard_status"."Status_classification" = 'Submitted for Review' THEN 1
          WHEN "onboard_status"."Status_classification" = 'Under Review' THEN 2
          WHEN "onboard_status"."Status_classification" = 'Under Approval' THEN 3
          ELSE 5
        END
      `),
            "ASC",
          ]);
          order.push([sortField, sortDirection]);
          break;
      }

      let checkCR = await Employee.findOne({
        where: { Reporting_Manager: Employee_Id },
        attributes: ["ID", "Reporting_Manager"],
      });

      const orConditions: any[] = [
        { CR_Person_Id: Employee_Id }, // always include this
      ];

      // Conditionally include CR person check if checkCR has data
      if (checkCR?.ID) {
        orConditions.unshift({
          CR_Person_Id: checkCR?.ID,
          Is_CR_Approved: true,
        });
      }

      const whereCondition: WhereOptions = {
        CoCd: entity_id,
      };

      if (status) {
        whereCondition.Status = parseInt(status);
      }

      if (vendor_code) {
        const vendorCodes = Array.isArray(vendor_code)
          ? vendor_code
          : vendor_code
            .toString()
            .split(",")
            .map((code) => code.trim())
            .filter((code) => code);

        if (vendorCodes.length === 1) {
          whereCondition.Vendor_SAP_Code = vendorCodes[0];
        } else if (vendorCodes.length > 1) {
          whereCondition.Vendor_SAP_Code = { [Op.in]: vendorCodes };
        }
      }

      let searchCondition = {};
      if (searchString) {
        searchCondition = {
          [Op.or]: [
            { Vendor_Name_EN: { [Op.like]: `%${searchString}%` } },
            { Email: { [Op.like]: `%${searchString}%` } },
          ],
        };
      }

      if (searchCondition) {
        Object.assign(whereCondition, searchCondition);
      }

      const data = await Vendor_onboard.findAndCountAll({
        where: whereCondition,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: [
          "ID",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "Email",
          "Country",
          "Status",
          "Application_Number",
          "Is_Added_To_Vendor",
        ],
        include: [
          {
            model: Status,
            as: "onboard_status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
        ],
      });

      let resultWithCountryName = (data?.rows ?? []).map((vendor) => {
        let vendorData = {
          ...(vendor?.get?.() ?? {}),
          Country:
            Country.getCountryByCode(vendor?.Country)?.name || vendor?.Country,
        };

        if (vendor?.Is_Added_To_Vendor && vendorData?.onboard_status) {
          vendorData.onboard_status.Status_classification = "Approved";
        }

        return vendorData;
      });

      if (sortField === "Country") {
        resultWithCountryName = resultWithCountryName.sort((a, b) => {
          if (sortDirection === "ASC") {
            return a.CountryName.localeCompare(b.CountryName);
          } else {
            return b.CountryName.localeCompare(a.CountryName);
          }
        });
      }
      let finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };
      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        finalResult,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getVendorApplicationDetails(ref_no: string, emp_id: any, roleId: any) {
    try {
      let data: any = await Vendor_onboard.findOne({
        where: {
          Application_Number: ref_no,
        },
        attributes: [
          "ID",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "CoCd",
          "Vendor_SAP_Code",
          "City",
          "Country",
          "Region",
          "Email",
          "Phone",
          "Fax",
          "Postal_Code",
          "Street_House_No",
          "Payment_Terms",
          "Creditnote_Payment_Terms",
          "Daikin_Contact_Name",
          "Incoterms",
          "Incoterms_Location",
          "Is_VAT",
          "Taxble_Basis",
          "Wht_Applicable",
          "Wht_Rate",
          "Trade_license_number",
          "License_Expiry_Date",
          "Issuing_Authority",
          "Valid_From",
          "VAT_Number",
          "Vendor_Id",
          "VAT_Group_Name",
          "Payment_Method_Supplement",
          "ABC_Indicator",
          "National_Id_Expiry_Dt",
          "National_Id_No",
          "CR_Person_Id",
          "Industry_Type",
          "Industry_Key",
          "CreatedDt",
          "CreatedBy",
          "Is_Active",
          "Is_Deleted",
          "Short_Payment_Reason",
          "ModifiedBy",
          "ModifiedDt",
          "Is_Manager_Approved",
          "Is_CR_Approved",
          "Is_Added_To_Vendor",
          "Status",
        ],
        include: [
          {
            model: MasterCodes,
            as: "payment_terms_details",
            required: false,
            where: { Type: "REGISTRATION_PAYMENT_TERMS" },
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
          },
          {
            model: VendorBankOnboard,
            as: "bankDetails",
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
          },
          {
            model: Entity,
            as: "entity_details",
            required: false,
            attributes: ["CoCd", "Entity_Name"],
          },
          {
            model: UploadFiles,
            as: "licence_image",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: [
                FileCategories.LicenceFile,
                FileCategories.LicenceFile_Onboard,
              ],
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "national_id_image",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: [
                FileCategories.NationalLicenceFile,
                FileCategories.NationalLicenceFile_Onboard,
              ],
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "payment_image",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: [
                FileCategories.PaymentFile,
                FileCategories.PaymentFile_Onboard,
              ],
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "vat_image",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: [
                FileCategories.VatFile,
                FileCategories.VatFile_Onboard,
              ],
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "NDA_image",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: [
                FileCategories.NDAFILE,
                FileCategories.NDAFILE_Onboard,
              ],
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "bank_image",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: [
                FileCategories.BANKFILE,
                FileCategories.BANKFILE_Onboard,
              ],
              Is_deleted: false,
            },
          },
          {
            model: MasterCodes,
            as: "Incoterms_details",
            required: false,
            where: { Type: "INCO_TERMS" },
          },
          {
            model: MasterCodes,
            as: "Industry_Type_details",
            required: false,
            where: { Type: "Industry_type" },
          },
          {
            model: MasterCodes,
            as: "Industry_Key_details",
            required: false,
            where: { Type: "INDUSTRY_KEY" },
          },
        ],
      });

      if (!data)
        throw new APIError("Invalid ref no", StatusCodeEnum.HTTP_NOT_FOUND);

      data = data?.get?.({ plain: true }) ?? data;

      let Country_description = Country.getCountryByCode(data.Country);
      data.countryName = Country_description.name;

      let stateDescription = State.getStateByCodeAndCountry(
        data.Region,
        data.Country,
      );
      if (stateDescription) {
        data.Region = stateDescription.name;
      } else {
        data.Region = "Unknown Region"; // fallback if not found
      }
      let bankCountry_description = Country.getCountryByCode(
        data.bankDetails.Bank_Country,
      );
      data.bankDetails.Bank_Country = bankCountry_description.name;
      if (data.Status === 4) {
        let vendorRecord = await Vendor.findOne({
          where: { Vendor_Onboard_Id: data.ID },
          attributes: ["ID"],
        });

        if (vendorRecord) {
          let vendorId = vendorRecord.ID;

          // Override upload file associations
          data.licence_image = await UploadFiles.findAll({
            where: {
              Main_Id: vendorId,
              Category_id: FileCategories.LicenceFile,
              Is_deleted: false,
            },
          });

          data.national_id_image = await UploadFiles.findAll({
            where: {
              Main_Id: vendorId,
              Category_id: FileCategories.NationalLicenceFile,
              Is_deleted: false,
            },
          });

          data.payment_image = await UploadFiles.findAll({
            where: {
              Main_Id: vendorId,
              Category_id: FileCategories.PaymentFile,
              Is_deleted: false,
            },
          });

          data.vat_image = await UploadFiles.findAll({
            where: {
              Main_Id: vendorId,
              Category_id: FileCategories.VatFile,
              Is_deleted: false,
            },
          });

          data.NDA_image = await UploadFiles.findAll({
            where: {
              Main_Id: vendorId,
              Category_id: FileCategories.NDAFILE,
              Is_deleted: false,
            },
          });

          data.bank_image = await UploadFiles.findAll({
            where: {
              Main_Id: vendorId,
              Category_id: FileCategories.BANKFILE,
              Is_deleted: false,
            },
          });
        }
      }
      let findCrDetails = await Employee.findOne({
        where: { ID: data?.CR_Person_Id },
      });
      if (emp_id == data.CR_Person_Id) {
        if (data.Is_CR_Approved == null && data.Is_Manager_Approved == null) {
          data.Approve_Button = true;
          data.Reject_Button = true;
        } else if (
          data.Is_CR_Approved == true &&
          data.Is_Manager_Approved == true &&
          data.Is_Added_To_Vendor == true
        ) {
          data.Approve_Button = false;
          data.Reject_Button = false;
        } else if (
          data.Is_CR_Approved == true &&
          data.Is_Manager_Approved == true
        ) {
          data.Approve_Button = false;
          data.Reject_Button = true;
        } else if (
          data.Is_CR_Approved == true &&
          data.Is_Manager_Approved == null
        ) {
          data.Approve_Button = false;
          data.Reject_Button = false;
        }
      } else {
        if (
          data.Is_CR_Approved == true &&
          data.Is_Manager_Approved == null &&
          findCrDetails?.Reporting_Manager == emp_id
        ) {
          data.Approve_Button = true;
          data.Reject_Button = true;
        } else if (data.Is_Manager_Approved == true) {
          data.Approve_Button = false;
          data.Reject_Button = false;
        }
      }

      if (roleId == 4 && data.Status == 5) {
        data.Approve_Button = false;
        data.Reject_Button = false;
      } else if (roleId == 4 && data.Status == 3) {
        data.Approve_Button = false;
        data.Reject_Button = false;
      } else if (roleId == 4 && data.Status == 4) {
        data.Approve_Button = false;
        data.Reject_Button = false;
      } else if (roleId == 4 && data.Status != 3) {
        data.Approve_Button = true;
        data.Reject_Button = true;
      }

      data.contact = [
        {
          name: findCrDetails.Employee_Name,
          department: findCrDetails.Department,
          email: findCrDetails.Email,
        },
      ];

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorDropdown() {
    try {
      const vendor = await Vendor.findAll({
        where: {
          Is_Deleted: false,
        },
        attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
        include: {
          model: MasterCodes,
          as: "payment_terms_details",
          required: false,
          where: { Type: "REGISTRATION_PAYMENT_TERMS" },
          attributes: {
            exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
          },
        },
      });

      return { status: true, data: vendor };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorDropdownByEntity(entity: any) {
    try {
      const getVendor = await EntityMapping.findAll({
        where: { CoCd: entity },
        attributes: ["Vendor_id"],
        raw: true,
      });

      const vendorIds = getVendor
        .map((v) => v.Vendor_id)
        .filter((id) => id !== null && id !== undefined);

      if (vendorIds.length === 0) {
        return { status: true, data: [] };
      }

      const vendor = await Vendor.findAll({
        where: {
          Is_Deleted: false,
          ID: { [Op.in]: vendorIds },
        },
        attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
        include: {
          model: MasterCodes,
          as: "payment_terms_details",
          required: false,
          where: { Type: "REGISTRATION_PAYMENT_TERMS" },
          attributes: {
            exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
          },
        },
      });

      return { status: true, data: vendor };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorDropdownApplication() {
    try {
      const distinctVendors = await Vendor_onboard.findAll({
        where: {
          Is_Deleted: false,
          Vendor_SAP_Code: { [Op.ne]: null },
        },
        attributes: [
          "Vendor_SAP_Code",
          [Sequelize.fn("MIN", Sequelize.col("ID")), "ID"],
          [
            Sequelize.fn("MIN", Sequelize.col("Vendor_Name_EN")),
            "Vendor_Name_EN",
          ],
        ],
        group: ["Vendor_SAP_Code"],
        raw: true,
      });

      const nullVendors = await Vendor_onboard.findAll({
        where: {
          Is_Deleted: false,
          Vendor_SAP_Code: null,
        },
        attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
        raw: true,
      });

      const vendors = [...distinctVendors, ...nullVendors];

      return { status: true, data: vendors };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async listVendorUpdates(
    limit: any,
    page: any,
    entity_id: any,
    searchQuery: any,
    query: any,
    Employee_Id: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "ModifiedDt";
      let sortDirection = query?.sort || "desc";
      const order: any = [];

      switch (sortField) {
        case "Vendor_SAP_Code":
          order.push(["Vendor_SAP_Code", sortDirection]);
          break;
        case "Vendor_Name_EN":
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
        case "Email":
          order.push(["Email", sortDirection]);
          break;
        case "Status":
          order.push(["Status", sortDirection]);
          break;
        default:
          order.push([
            Sequelize.literal(`
        CASE
          WHEN "onboard_status"."Status_classification" = 'Submitted for Review' THEN 1
          WHEN "onboard_status"."Status_classification" = 'Under Review' THEN 2
          WHEN "onboard_status"."Status_classification" = 'Under Approval' THEN 3
          ELSE 4
        END
      `),
            "ASC",
          ]);
          order.push([sortField, sortDirection]);
          break;
      }

      let checkCR = await Employee.findOne({
        where: { Reporting_Manager: Employee_Id },
        attributes: ["ID", "Reporting_Manager"],
      });

      const orConditions: any[] = [
        { CR_Person_Id: Employee_Id }, // always include this
      ];

      // Conditionally include CR person check if checkCR has data
      if (checkCR?.ID) {
        orConditions.unshift({
          CR_Person_Id: checkCR?.ID,
          Is_CR_Approved: true,
        });
      }

      const payload: WhereOptions = {
        CoCd: entity_id,
        Action: "EDIT",
        [Op.or]: orConditions,
      };

      if (query?.status) {
        payload.Status = query?.status;
      }
      if (query?.vendor_code) {
        const vendorCodes = Array.isArray(query?.vendor_code)
          ? query?.vendor_code
          : query?.vendor_code
            .toString()
            .split(",")
            .map((code: string) => code.trim())
            .filter((code: any) => code);

        if (vendorCodes.length === 1) {
          payload.Vendor_SAP_Code = vendorCodes[0];
        } else if (vendorCodes.length > 1) {
          payload.Vendor_SAP_Code = { [Op.in]: vendorCodes };
        }
      }

      let searchCondition = {};
      if (searchQuery) {
        searchCondition = {
          [Op.or]: [
            { Vendor_Name_EN: { [Op.like]: `%${searchQuery}%` } },
            { Email: { [Op.like]: `%${searchQuery}%` } },
            { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          ],
        };
      }

      const whereCondition = { ...payload };
      if (searchCondition) {
        Object.assign(whereCondition, searchCondition);
      }

      let data = await Vendor_onboard.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        attributes: [
          "ID",
          "Vendor_SAP_Code",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "Country",
          "Email",
          "Status",
          "Vendor_Id",
        ],
        include: [
          {
            model: Status,
            as: "onboard_status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
        ],
      });

      let resultWithCountryName = (data?.rows ?? []).map((vendor) => ({
        ...(vendor?.get?.() ?? {}),
        Country:
          Country.getCountryByCode(vendor?.Country)?.name || vendor?.Country,
      }));

      if (sortField === "country") {
        resultWithCountryName = resultWithCountryName.sort(
          (a: { CountryName: string }, b: { CountryName: string }) => {
            if (sortDirection === "ASC") {
              return a.CountryName.localeCompare(b.CountryName);
            } else {
              return b.CountryName.localeCompare(a.CountryName);
            }
          },
        );
      }
      let finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };

      let result = pagination.paginationData(limit, page, finalResult);
      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async listVendorUpdatesForAdmin(
    limit: any,
    page: any,
    entity_id: any,
    searchQuery: any,
    query: any,
    Employee_Id: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "ModifiedDt";
      let sortDirection = query?.sort || "desc";
      const order: any = [];

      switch (sortField) {
        case "Vendor_SAP_Code":
          order.push(["Vendor_SAP_Code", sortDirection]);
          break;
        case "Vendor_Name_EN":
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
        case "Email":
          order.push(["Email", sortDirection]);
          break;
        case "Status":
          order.push(["Status", sortDirection]);
          break;
        default:
          order.push([
            Sequelize.literal(`
        CASE
          WHEN "onboard_status"."Status_classification" = 'Submitted for Review' THEN 1
          WHEN "onboard_status"."Status_classification" = 'Under Review' THEN 2
          WHEN "onboard_status"."Status_classification" = 'Under Approval' THEN 3
          ELSE 4
        END
      `),
            "ASC",
          ]);
          order.push([sortField, sortDirection]);
          break;
      }

      // Conditions for filtering vendors
      const orConditions: any[] = [
        { CR_Person_Id: Employee_Id }, // employee is CR person
        { "$cr_person.Reporting_Manager$": Employee_Id }, // employee is manager of CR person
      ];

      const payload: WhereOptions = {
        CoCd: entity_id,
        Action: "EDIT",
      };

      if (query?.status) {
        payload.Status = query?.status;
      }
      if (query?.vendor_id) {
        payload.Vendor_Id = query?.vendor_id;
      }

      // Search filter
      let searchCondition = {};
      if (searchQuery) {
        searchCondition = {
          [Op.or]: [
            { Vendor_Name_EN: { [Op.like]: `%${searchQuery}%` } },
            { Email: { [Op.like]: `%${searchQuery}%` } },
            { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          ],
        };
      }

      if (query?.vendor_code) {
        const vendorCodes = Array.isArray(query?.vendor_code)
          ? query?.vendor_code
          : query?.vendor_code
            .toString()
            .split(",")
            .map((code: string) => code.trim())
            .filter((code: any) => code);

        if (vendorCodes.length === 1) {
          payload.Vendor_SAP_Code = vendorCodes[0];
        } else if (vendorCodes.length > 1) {
          payload.Vendor_SAP_Code = { [Op.in]: vendorCodes };
        }
      }

      const whereCondition = { ...payload, ...searchCondition };

      // Main query with CR person join
      let data = await Vendor_onboard.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        attributes: [
          "ID",
          "Vendor_SAP_Code",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "Country",
          "Email",
          "Status",
          "Vendor_Id",
        ],
        include: [
          {
            model: Status,
            as: "onboard_status",
            attributes: [
              "ID",
              "Status_classification",
              "Status_description",
              "Status_description_arabic",
            ],
          },
          {
            model: Employee,
            as: "cr_person", // ensure relation Vendor_onboard.belongsTo(Employee, { as: "crPerson", foreignKey: "CR_Person_Id" })
            attributes: ["ID", "Reporting_Manager"],
          },
        ],
      });

      // Replace country code with full country name if available
      let resultWithCountryName = (data?.rows ?? []).map((vendor) => ({
        ...(vendor?.get?.() ?? {}),
        Country:
          Country.getCountryByCode(vendor?.Country)?.name || vendor?.Country,
      }));

      if (sortField === "country") {
        resultWithCountryName = resultWithCountryName.sort(
          (a: { CountryName: string }, b: { CountryName: string }) => {
            if (sortDirection === "ASC") {
              return a.CountryName.localeCompare(b.CountryName);
            } else {
              return b.CountryName.localeCompare(a.CountryName);
            }
          },
        );
      }

      let finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };

      let result = pagination.paginationData(limit, page, finalResult);
      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async entityUpdates(
    limit: any,
    page: any,
    entity_id: any,
    searchQuery: any,
    query: any,
    Employee_Id: any,
  ) {
    try {
      limit = limit || 1000;
      page = page || 1;

      let sortField = query?.sort_column || "ModifiedDt";
      let sortDirection = query?.sort || "DESC";
      const order: any = [];

      switch (sortField) {
        case "Vendor_SAP_Code":
          order.push([
            { model: Vendor, as: "vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "Email":
          order.push([{ model: Vendor, as: "vendor" }, "Email", sortDirection]);
          break;
        case "Status":
          order.push(["Status", sortDirection]);
          break;
        default:
          // order.push(["ID", sortDirection]);
          order.push([
            Sequelize.literal(`
        CASE
          WHEN "statusus"."Status_classification" = 'Submitted for Review' THEN 1
          WHEN "statusus"."Status_classification" = 'Under Review' THEN 2
          WHEN "statusus"."Status_classification" = 'Under Approval' THEN 3
          ELSE 4
        END
      `),
            "ASC",
          ]);
          order.push(["ID", sortDirection]);
          break;
      }

      let checkCR = await Employee.findOne({
        where: { Reporting_Manager: Employee_Id },
        attributes: ["ID", "Reporting_Manager"],
      });

      const orConditions: any[] = [
        { CR_id: Employee_Id }, // always include this
      ];

      // Conditionally include CR person check if checkCR has data
      if (checkCR?.ID) {
        orConditions.unshift({
          CR_id: checkCR?.ID,
          Is_CR_Approved: true,
        });
      }

      const payload: WhereOptions = {
        [Op.or]: orConditions,
        Is_Default_Entity: false,
      };

      let searchCondition: any = {};
      if (searchQuery) {
        searchCondition[Op.or] = [
          { Vendor_Name_EN: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Email: { [Op.like]: `%${searchQuery}%` } },
        ];
      }

      if (query?.vendor_code) {
        const vendorCodes = Array.isArray(query?.vendor_code)
          ? query?.vendor_code
          : query?.vendor_code
            .toString()
            .split(",")
            .map((code: string) => code.trim())
            .filter((code: any) => code);

        if (vendorCodes.length === 1) {
          searchCondition.Vendor_SAP_Code = vendorCodes[0];
        } else if (vendorCodes.length > 1) {
          searchCondition.Vendor_SAP_Code = { [Op.in]: vendorCodes };
        }
      }

      if (query?.status) {
        payload.Status = query?.status;
      }

      const whereCondition = { ...payload };

      let data = await EntityMapping.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        attributes: ["ID", "CR_id", "CoCd", "Status"],
        include: [
          {
            model: Vendor,
            as: "vendor",
            where: searchCondition,
            required: true,
            attributes: [
              "ID",
              "Vendor_Name_EN",
              "Vendor_SAP_Code",
              "Country",
              "Email",
            ],
          },
          {
            model: Entity,
            as: "entity_details",
            required: false,
            attributes: ["ID", "Entity_Name"],
          },
          {
            model: Status,
            as: "statusus",
            required: false,
          },
        ],
      });

      let resultWithCountryName = (data?.rows ?? []).map((entityMapping) => {
        const obj = entityMapping?.get?.({ plain: true }) ?? {}; // get plain object

        // If vendor is included, add Country_Name to vendor
        if (obj.vendor && obj.vendor.Country) {
          obj.vendor.Country =
            Country.getCountryByCode(obj.vendor.Country)?.name ||
            obj.vendor.Country;
        }

        return obj;
      });

      if (sortField === "country") {
        resultWithCountryName.sort((a, b) => {
          const aCountry = a.vendor?.Country || "";
          const bCountry = b.vendor?.Country || "";
          return sortDirection === "ASC"
            ? aCountry.localeCompare(bCountry)
            : bCountry.localeCompare(aCountry);
        });
      }

      const finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };

      let result = pagination.paginationData(limit, page, data);
      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async entityUpdatesForAdmin(
    limit: any,
    page: any,
    entity_id: any,
    searchQuery: any,
    query: any,
    Employee_Id: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "ModifiedDt";
      let sortDirection = query?.sort || "desc";
      const order: any = [];

      switch (sortField) {
        case "Vendor_SAP_Code":
          order.push([
            { model: Vendor, as: "vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "Email":
          order.push([{ model: Vendor, as: "vendor" }, "Email", sortDirection]);
          break;
        case "Status":
          order.push(["Status", sortDirection]);
          break;
        default:
          order.push([
            Sequelize.literal(`
        CASE
          WHEN "statusus"."Status_classification" = 'Submitted for Review' THEN 1
          WHEN "statusus"."Status_classification" = 'Under Review' THEN 2
          WHEN "statusus"."Status_classification" = 'Under Approval' THEN 3
          ELSE 4
        END
      `),
            "ASC",
          ]);
          order.push(["ID", sortDirection]);
      }

      let checkCR = await Employee.findOne({
        where: { Reporting_Manager: Employee_Id },
        attributes: ["ID", "Reporting_Manager"],
      });

      const orConditions: any[] = [
        { CR_id: Employee_Id }, // always include this
      ];

      // Conditionally include CR person check if checkCR has data
      if (checkCR?.ID) {
        orConditions.unshift({
          CR_id: checkCR?.ID,
          Is_CR_Approved: true,
        });
      }

      const payload: WhereOptions = {
        CoCd: entity_id,
      };

      let searchCondition: any = {};
      if (searchQuery) {
        searchCondition[Op.or] = [
          { Vendor_Name_EN: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Email: { [Op.like]: `%${searchQuery}%` } },
        ];
      }

      if (query?.vendor_code) {
        const vendorCodes = Array.isArray(query?.vendor_code)
          ? query?.vendor_code
          : query?.vendor_code
            .toString()
            .split(",")
            .map((code: string) => code.trim())
            .filter((code: any) => code);

        if (vendorCodes.length === 1) {
          searchCondition.Vendor_SAP_Code = vendorCodes[0];
        } else if (vendorCodes.length > 1) {
          searchCondition.Vendor_SAP_Code = { [Op.in]: vendorCodes };
        }
      }
      if (query?.status) {
        payload.Status = query?.status;
      }

      const whereCondition = { ...payload };

      let data = await EntityMapping.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        attributes: ["ID", "CR_id", "CoCd", "Status"],
        include: [
          {
            model: Vendor,
            as: "vendor",
            where: searchCondition,
            required: true,
            attributes: [
              "ID",
              "Vendor_Name_EN",
              "Vendor_SAP_Code",
              "Country",
              "Email",
            ],
          },
          {
            model: Entity,
            as: "entity_details",
            required: false,
            attributes: ["ID", "Entity_Name"],
          },
          {
            model: Status,
            as: "statusus",
            required: false,
          },
        ],
      });

      let resultWithCountryName = (data?.rows ?? []).map((entityMapping) => {
        const obj = entityMapping?.get?.({ plain: true }) ?? {}; // get plain object

        // If vendor is included, add Country_Name to vendor
        if (obj.vendor && obj.vendor.Country) {
          obj.vendor.Country =
            Country.getCountryByCode(obj.vendor.Country)?.name ||
            obj.vendor.Country;
        }

        return obj;
      });

      if (sortField === "country") {
        resultWithCountryName = resultWithCountryName.sort((a, b) => {
          if (sortDirection === "ASC") {
            return (
              a.vendor?.CountryName?.localeCompare(b.vendor?.CountryName) || 0
            );
          } else {
            return (
              b.vendor?.CountryName?.localeCompare(a.vendor?.CountryName) || 0
            );
          }
        });
      }

      const finalResult = {
        count: data.count,
        rows: resultWithCountryName,
      };

      let result = pagination.paginationData(limit, page, data);
      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async listEntityUpdates(
    limit: any,
    page: any,
    entity_id: any,
    searchQuery: any,
    query: any,
    Employee_Id: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "ID";
      let sortDirection = query?.sort || "desc";
      const order: any = [];

      switch (sortField) {
        case "vendor_code":
          order.push(["Vendor_SAP_Code", sortDirection]);
          break;
        case "vendor_name":
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
        case "country":
          order.push(["Country", sortDirection]);
          break;
        case "email":
          order.push(["Email", sortDirection]);
          break;
        case "status":
          order.push(["Status", sortDirection]);
          break;
        default:
          order.push(["Vendor_Name_EN", sortDirection]);
          break;
      }

      let checkCR = await Employee.findOne({
        where: { Reporting_Manager: Employee_Id },
        attributes: ["ID", "Reporting_Manager"],
      });

      let payload: any = {};

      let entityPayload: WhereOptions = {
        [Op.or]: [
          // Case 1: CR person with approved status
          {
            CR_Person_Id: checkCR?.ID,
            Is_CR_Approved: true,
          },
          { CR_Person_Id: Employee_Id },
        ],
      };

      if (query?.status) {
        payload.Status = query?.status;
      }
      if (query?.vendor_id) {
        payload.Vendor_Id = query?.vendor_id;
      }
      let searchCondition = {};
      if (searchQuery) {
        searchCondition = {
          [Op.or]: [
            { Vendor_Name_EN: { [Op.like]: `%${searchQuery}%` } },
            { Email: { [Op.like]: `%${searchQuery}%` } },
            { ID: { [Op.like]: `%${searchQuery}%` } },
          ],
        };
      }

      const whereCondition = { ...payload };

      const entityWhereCondition = { ...entityPayload };

      if (searchCondition) {
        Object.assign(whereCondition, searchCondition);
      }

      let data = await Vendor_onboard.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        attributes: [
          "ID",
          "Vendor_SAP_Code",
          "Vendor_Name_EN",
          "Vendor_Name_AR",
          "Country",
          "Email",
          "Status",
          "Vendor_Id",
        ],
        include: {
          model: Entity,
          as: "entity_details",
          where: entityWhereCondition,
          required: true,
          attributes: ["CoCd", "Entity_Name"],
        },
      });

      let result = pagination.paginationData(limit, page, data);
      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorUpdateDetail(vendor_onboardId: any, emp_id: any, roleId: any) {
    try {
      let reqData = await Vendor_onboard.findOne({
        where: { ID: vendor_onboardId },
      });

      if (!reqData)
        throw new APIError("Invalid onboard Id", StatusCodeEnum.HTTP_NOT_FOUND);

      let curData: any = await Vendor.findOne({
        where: { Vendor_Onboard_Id: vendor_onboardId },
      });

      const changedFields: { field: string; date: any; old: any; new: any }[] =
        [];

      const updatedData = reqData.toJSON();
      const currentData = curData.toJSON();

      const removeFields = ["ID", "CreatedDt", "ModifiedBy", "ModifiedDt"];
      const fieldLabelMapping: Record<string, string> = {
        Vendor_Name_EN: "Vendor Name (English)",
        Vendor_Name_AR: "Vendor Name (Arabic)",
        Vendor_SAP_Code: "Vendor SAP Code",
        City: "City",
        Country: "Country",
        Region: "Region",
        Email: "Email",
        Phone: "Phone",
        Fax: "Fax",
        Postal_Code: "Postal Code",
        Street_House_No: "Street / House Number",
        Payment_Terms: "Payment Terms",
        Creditnote_Payment_Terms: "Credit Note Payment Terms",
        Daikin_Contact_Name: "Daikin Contact Name",
        Incoterms: "Incoterms",
        Incoterms_Location: "Incoterms Location",
        Is_VAT: "Is VAT Applicable",
        Taxble_Basis: "Taxable Basis",
        Wht_Applicable: "Withholding Tax Applicable",
        Wht_Rate: "Withholding Tax Rate (%)",
        Trade_license_number: "Trade License Number",
        License_Expiry_Date: "License Expiry Date",
        Issuing_Authority: "Issuing Authority",
        Valid_From: "Valid From",
        VAT_Number: "VAT Number",
        VAT_Group_Name: "VAT Group Name",
        Payment_Method_Supplement: "Payment Method Supplement",
        ABC_Indicator: "ABC Indicator",
        National_Id_Expiry_Dt: "National ID Expiry Date",
        National_Id_No: "National ID Number",
        CR_Person_Id: "CR Person ID",
        Industry_Type: "Industry Type",
        Industry_Key: "Industry Key",
        Status: "Status",
        Short_Payment_Reason: "Short Payment Reason",
      };

      // Only compare fields that are in the label mapping
      for (const key of Object.keys(fieldLabelMapping)) {
        if (key in updatedData && key in currentData) {
          if (removeFields.includes(key)) continue;

          const oldVal = currentData[key];
          const newVal = updatedData[key];

          const isDate = oldVal instanceof Date || newVal instanceof Date;

          const normalizedOld =
            isDate && oldVal
              ? new Date(oldVal).toISOString().split("T")[0]
              : oldVal;
          const normalizedNew =
            isDate && newVal
              ? new Date(newVal).toISOString().split("T")[0]
              : newVal;

          if (normalizedOld !== normalizedNew) {
            changedFields.push({
              field: key,
              date: reqData.ModifiedDt || reqData.CreatedDt,
              old: oldVal,
              new: newVal,
            });
          }
        }
      }

      // Fetch upload files for onboard and current vendor
      // Step 1: Get current vendor files
      const currentFiles = await UploadFiles.findAll({
        where: {
          Main_Id: curData.ID,
          Is_deleted: false,
          Category_id: {
            [Op.in]: [1, 2, 3, 9, 11],
          },
        },
      });

      // Step 2: Get onboarded files
      let onboardFiles = await UploadFiles.findAll({
        where: {
          Main_Id: curData.Vendor_Onboard_Id,
          Is_deleted: false,
          Category_id: {
            [Op.in]: [1, 2, 3, 9, 11],
          },
        },
      });

      // Helper to group files by category id and collect upload paths
      const groupByCategory = (files: any[]) =>
        files.reduce(
          (acc, file) => {
            if (!file.Category_id) return acc;
            acc[file.Category_id] = acc[file.Category_id] || [];
            acc[file.Category_id].push(file.Upload_files);
            return acc;
          },
          {} as Record<number, string[]>,
        );

      const onboardGrouped = groupByCategory(onboardFiles);
      const currentGrouped = groupByCategory(currentFiles);

      // Category labels for readability
      const fileCategoryNames: Record<number, string> = {
        [FileCategories.LicenceFile]: "License Files",
        [FileCategories.PaymentFile]: "Payment Files",
        [FileCategories.NationalLicenceFile]: "National ID Files",
        [FileCategories.VatFile]: "VAT Files",
        [FileCategories.NDAFILE]: "NDA Files",
      };

      for (const categoryIdStr in onboardGrouped) {
        const categoryId = parseInt(categoryIdStr);

        const onboardList = onboardGrouped[categoryId] || [];
        const currentList = currentGrouped[categoryId] || [];

        const onboardSet = new Set(onboardList);
        const currentSet = new Set(currentList);

        const removed = [...currentSet].filter((x) => !onboardSet.has(x));
        const added = [...onboardSet].filter((x) => !currentSet.has(x));

        const onboardCount = onboardList.length;
        const currentCount = currentList.length;

        // 🧠 Case 1: onboard has fewer files than current → files removed
        if (onboardCount < currentCount) {
          changedFields.push({
            field:
              fileCategoryNames[categoryId] || `Category ${categoryId} Files`,
            date: reqData.ModifiedDt || reqData.CreatedDt,
            old: currentList, // show all current files
            new: onboardList, // show all onboard files
          });
        }
        // 🧠 Case 2: current has fewer files than onboard → new files added
        else if (currentCount < onboardCount) {
          changedFields.push({
            field:
              fileCategoryNames[categoryId] || `Category ${categoryId} Files`,
            date: reqData.ModifiedDt || reqData.CreatedDt,
            old: currentList, // show all current files
            new: onboardList, // show all onboard files
          });
        }
        // 🧠 Case 3: normal diff based on added/removed files
        else if (added.length > 0 || removed.length > 0) {
          changedFields.push({
            field:
              fileCategoryNames[categoryId] || `Category ${categoryId} Files`,
            date: reqData.ModifiedDt || reqData.CreatedDt,
            old: removed,
            new: added,
          });
        }
      }

      const changedFieldsWithLabels: any = await Promise.all(
        changedFields.map(async (change) => {
          let oldValue = change.old;
          let newValue = change.new;

          // Convert Region codes to names
          if (change.field === "Region" || change.field.includes("Region")) {
            const convertRegion = (code: any) => {
              const stateDescription = State.getStateByCode(code);
              return stateDescription ? stateDescription.name : code;
            };
            oldValue = Array.isArray(oldValue)
              ? oldValue.map(convertRegion)
              : oldValue
                ? convertRegion(oldValue)
                : oldValue;
            newValue = Array.isArray(newValue)
              ? newValue.map(convertRegion)
              : newValue
                ? convertRegion(newValue)
                : newValue;
          }

          // Convert Country codes to names
          if (change.field === "Country" || change.field.includes("Country")) {
            const convertCountry = (code: any) => {
              const countryDescription = Country.getCountryByCode(code);
              return countryDescription ? countryDescription.name : code;
            };
            oldValue = Array.isArray(oldValue)
              ? oldValue.map(convertCountry)
              : oldValue
                ? convertCountry(oldValue)
                : oldValue;
            newValue = Array.isArray(newValue)
              ? newValue.map(convertCountry)
              : newValue
                ? convertCountry(newValue)
                : newValue;
          }

          // Convert Industry Key to description
          if (change.field === "Industry_Key") {
            if (oldValue) {
              const oldIndustryKey = await MasterCodes.findOne({
                where: { Code: oldValue, Type: "INDUSTRY_KEY" },
                attributes: ["Description_En"],
              });
              oldValue = oldIndustryKey?.Description_En || oldValue;
            }
            if (newValue) {
              const newIndustryKey = await MasterCodes.findOne({
                where: { Code: newValue, Type: "INDUSTRY_KEY" },
                attributes: ["Description_En"],
              });
              newValue = newIndustryKey?.Description_En || newValue;
            }
          }

          if (change.field === "Incoterms") {
            if (oldValue) {
              const oldIncoterm = await MasterCodes.findOne({
                where: { Code: oldValue, Type: "INCO_TERMS" },
                attributes: ["Description_En"],
              });
              oldValue = oldIncoterm?.Description_En || oldValue;
            }
            if (newValue) {
              const newIncoterm = await MasterCodes.findOne({
                where: { Code: newValue, Type: "INCO_TERMS" },
                attributes: ["Description_En"],
              });
              newValue = newIncoterm?.Description_En || newValue;
            }
          }

          if (change.field === "Payment_Terms") {
            if (oldValue) {
              const oldPaymentTerm = await MasterCodes.findOne({
                where: { Code: oldValue, Type: "REGISTRATION_PAYMENT_TERMS" },
                attributes: ["Description_En"],
              });
              oldValue = oldPaymentTerm?.Description_En || oldValue;
            }
            if (newValue) {
              const newPaymentTerm = await MasterCodes.findOne({
                where: { Code: newValue, Type: "REGISTRATION_PAYMENT_TERMS" },
                attributes: ["Description_En"],
              });
              newValue = newPaymentTerm?.Description_En || newValue;
            }
          }

          // Return the transformed change object
          return {
            field: fieldLabelMapping[change.field] || change.field,
            date: change.date,
            old: oldValue,
            new: newValue,
          };
        }),
      );

      let buttons: any = {};
      if (emp_id == reqData.CR_Person_Id) {
        if (
          reqData.Is_CR_Approved == false &&
          reqData.Is_Manager_Approved == false
        ) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
          buttons.Final_Approval = false;
        } else if (
          reqData.Is_CR_Approved == true &&
          reqData.Is_Manager_Approved == false
        ) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
          buttons.Final_Approval = false;
        } else if (
          reqData.Is_CR_Approved == true &&
          reqData.Is_Manager_Approved == true &&
          reqData.Status != 4
        ) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
          buttons.Final_Approval = true;
        } else if (
          reqData.Is_CR_Approved == true &&
          reqData.Is_Manager_Approved == true &&
          reqData.Status == 4
        ) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
          buttons.Final_Approval = false;
        }
      } else {
        if (
          reqData.Is_CR_Approved == true &&
          reqData.Is_Manager_Approved == false
        ) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        }
        if (reqData.Is_Manager_Approved == true) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
      }

      if (reqData.Status == 5) {
        buttons.Approve_Button = false;
        buttons.Reject_Button = false;
      }

      if (roleId == 2) {
        const costResponsibleId =
          curData?.CR_Person_Id ?? reqData?.CR_Person_Id ?? null;
        const financeIsCostResponsible =
          costResponsibleId !== null && emp_id == costResponsibleId;
        const isBlockedStatus = reqData.Status == 4 || reqData.Status == 5;
        if (financeIsCostResponsible && !isBlockedStatus) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        } else {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
      }

      if (curData) {
        // Convert to plain object if needed
        curData = curData?.get ? curData?.get?.({ plain: true }) : curData;

        // Add Country_Name property
        curData.Country =
          Country.getCountryByCode(curData.Country)?.name || curData.Country;

        // Keep vendor master status separately and expose update request status
        // as Status so detail page can show the workflow state.
        curData.Vendor_Master_Status = curData.Status;
        curData.Status = reqData.Status;
      }

      let result = {
        headers_data: curData,
        changedFields: changedFieldsWithLabels,
        status: reqData.Status,
        buttons_logic: buttons,
      };
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async entityUpdateDetail(
    entityId: any,
    emp_id: any,
    vendor_id: any,
    roleId: any,
  ) {
    try {
      let curData: any = await Vendor.findOne({
        where: { ID: vendor_id },
      });

      const changedFields: { field: string; date: any; new: any }[] = [];

      // Check if there's any mapping for the given vendor_onboardId
      const entityMapping: any = await EntityMapping.findOne({
        where: { ID: entityId },
        include: [
          {
            model: Entity,
            as: "entity_details",
            attributes: ["CoCd", "Entity_Name"],
            required: false,
          },
          {
            model: Employee,
            as: "CR_details",
            attributes: ["ID", "Employee_Name"],
            required: false,
          },
        ],
      });

      changedFields.push({
        field: "New Entity",
        date: entityMapping.CreatedDt,
        new: entityMapping?.entity_details?.Entity_Name || null,
      });

      let buttons: any = {};

      if (entityMapping.Status == StatusEnum.Rejected) {
        // rejected by anyone -> no buttons
        buttons.Approve_Button = false;
        buttons.Reject_Button = false;
        buttons.Final_Approval = false;
      } else if (emp_id == entityMapping.CR_details?.ID) {
        // CR side
        if (
          !entityMapping.Is_CR_approved &&
          !entityMapping.Is_manager_approved
        ) {
          // first CR approval
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
          buttons.Final_Approval = false;
        } else if (
          entityMapping.Is_CR_approved &&
          entityMapping.Is_manager_approved &&
          entityMapping.Status == StatusEnum["Under Approval"]
        ) {
          // final CR approval
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
          buttons.Final_Approval = true;
        } else {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
          buttons.Final_Approval = false;
        }
      } else if (emp_id == entityMapping.Manager1_code) {
        // Manager side
        if (
          entityMapping.Is_CR_approved &&
          !entityMapping.Is_manager_approved
        ) {
          // only show if not yet approved by manager
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        } else {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
        buttons.Final_Approval = false;
      }

      if (roleId == 2) {
        const costResponsibleId =
          entityMapping?.CR_details?.ID ?? entityMapping?.CR_Person_Id;
        const financeIsCostResponsible = emp_id == costResponsibleId;
        const isBlockedStatus =
          entityMapping.Status == 4 || entityMapping.Status == 5;
        if (financeIsCostResponsible && !isBlockedStatus) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        } else {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
      }

      let result = {
        headers_data: curData,
        changedFields: entityMapping,
        buttons_logic: buttons,
      };
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorUpdatesApproveReject(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    rejectionReason: string,
    Final_Approval: any,
    userData: { id: number; vendor_id: number },
    roleId: any,
  ) {
    let transaction;
    try {
      transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        type: Transaction.TYPES.DEFERRED,
      });

      if (!transaction) {
        throw new APIError(
          "Transaction initialization failed",
          StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
        );
      }

      // Optimized: Single query with all necessary data and includes
      const vendorUpdate = await Vendor_onboard.findOne({
        where: {
          ID: updateId,
          Action: "EDIT",
          Status: {
            [Op.or]: [
              StatusEnum.Draft,
              StatusEnum["Submitted for Review"],
              StatusEnum["Under Review"],
              StatusEnum["Under Approval"],
            ],
          },
        },
        attributes: [
          "ID",
          "Vendor_Id",
          "CR_Person_Id",
          "Status",
          "Is_CR_Approved",
          "Is_Manager_Approved",
          "Vendor_Name_EN",
          "Email",
          "CoCd",
          "Daikin_Contact_Name",
          "Vendor_SAP_Code",
          "Short_Payment_Reason",
        ],
        include: [
          {
            model: Employee,
            as: "cr_person",
            attributes: ["ID", "Reporting_Manager", "Email", "Employee_Name"],
          },
        ],
        transaction,
      });

      if (!vendorUpdate) {
        throw new APIError("Invalid id", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      const [
        findManager,
        entityUpdates,
        uploadedFiles,
        oldVendorData,
        historyRecord,
      ] = await Promise.all([
        Employee.findOne({
          where: { ID: vendorUpdate?.cr_person?.Reporting_Manager },
          attributes: ["ID", "Email", "Employee_Name"],
          transaction,
        }),
        EntityMapping.findAll({
          where: {
            Vendor_id: vendorUpdate.Vendor_Id,
            Status: {
              [Op.or]: [
                StatusEnum.Draft,
                StatusEnum["Under Review"],
                StatusEnum["Under Approval"],
              ],
            },
          },
          attributes: ["ID", "Vendor_id", "Status"],
          transaction,
        }),
        Final_Approval
          ? UploadFiles.findAll({
            where: {
              Main_Id: updateId,
              Is_deleted: false,
            },
            attributes: ["Upload_files"],
            transaction,
          })
          : Promise.resolve([]),
        Vendor.findByPk(vendorUpdate.Vendor_Id, {
          transaction,
          raw: true,
        }),
        VendorHistory.findOne({
          where: { Vendor_Id: vendorUpdate.Vendor_Id },
          transaction,
        }),
      ]);

      // Optimized: Single history record operation
      const newVendorOnboardData = await Vendor_onboard.findOne({
        where: { ID: updateId },
        transaction,
        raw: true,
      });

      const FILE_CATEGORIES = [1, 2, 3, 9, 11]; // License, National, VAT , VAT

      // A. Fetch old state files by main Vendor ID
      const oldFilesAll = await UploadFiles.findAll({
        where: {
          Main_Id: vendorUpdate.Vendor_Id,
          Is_deleted: false,
          Category_id: { [Op.in]: FILE_CATEGORIES },
        },
        attributes: ["Category_id", "Upload_files"],
        transaction,
        raw: true,
      });

      // B. Fetch new state files by onboard/update ID
      const newFilesAll = await UploadFiles.findAll({
        where: {
          Main_Id: updateId,
          Is_deleted: false,
          Category_id: { [Op.in]: FILE_CATEGORIES },
        },
        attributes: ["Category_id", "Upload_files"],
        transaction,
        raw: true,
      });

      // C. Utility to group file arrays by business label
      function groupFiles(filesArr: any[]): {
        LicenceFile: string[];
        NationalLicenceFile: string[];
        PaymentFile: string[];
        VatFile: string[];
        NDAFile: string[];
      } {
        const result: {
          LicenceFile: string[];
          NationalLicenceFile: string[];
          PaymentFile: string[];
          VatFile: string[];
          NDAFile: string[];
        } = {
          LicenceFile: [],
          NationalLicenceFile: [],
          PaymentFile: [],
          VatFile: [],
          NDAFile: [],
        };
        (filesArr ?? []).forEach((file) => {
          switch (file.Category_id) {
            case 1: // LicenceFile
              result.LicenceFile.push(file.Upload_files);
              break;
            case 2: // NationalLicenceFile
              result.NationalLicenceFile.push(file.Upload_files);
              break;
            case 3: // VatFile
              result.VatFile.push(file.Upload_files);
              break;
            case 9: // PaymentFile
              result.PaymentFile.push(file.Upload_files);
              break;
            case 11: // NDAFile
              result.NDAFile.push(file.Upload_files);
              break;
            default:
              break;
          }
        });
        return result;
      }

      const oldFileFields = groupFiles(oldFilesAll);
      const newFileFields = groupFiles(newFilesAll);

      // Prepare history JSON blobs (without files)
      const oldVendorDataWithoutFiles = { ...oldVendorData };
      const newVendorOnboardDataWithoutFiles = { ...newVendorOnboardData };

      if ("LicenceFile" in oldVendorDataWithoutFiles)
        delete (oldVendorDataWithoutFiles as any).LicenceFile;
      if ("NationalLicenceFile" in oldVendorDataWithoutFiles)
        delete (oldVendorDataWithoutFiles as any).NationalLicenceFile;
      if ("PaymentFile" in oldVendorDataWithoutFiles)
        delete (oldVendorDataWithoutFiles as any).PaymentFile;
      if ("VatFile" in oldVendorDataWithoutFiles)
        delete (oldVendorDataWithoutFiles as any).VatFile;
      if ("NDAFile" in oldVendorDataWithoutFiles)
        delete (oldVendorDataWithoutFiles as any).NDAFile;

      if ("LicenceFile" in newVendorOnboardDataWithoutFiles)
        delete (newVendorOnboardDataWithoutFiles as any).LicenceFile;
      if ("NationalLicenceFile" in newVendorOnboardDataWithoutFiles)
        delete (newVendorOnboardDataWithoutFiles as any).NationalLicenceFile;
      if ("PaymentFile" in newVendorOnboardDataWithoutFiles)
        delete (newVendorOnboardDataWithoutFiles as any).PaymentFile;
      if ("VatFile" in newVendorOnboardDataWithoutFiles)
        delete (newVendorOnboardDataWithoutFiles as any).VatFile;
      if ("NDAFile" in newVendorOnboardDataWithoutFiles)
        delete (newVendorOnboardDataWithoutFiles as any).NDAFile;

      // Delete existing history if exists, then create new one
      if (historyRecord) {
        await historyRecord.destroy({ transaction });
      }

      const newHistoryRecord = await VendorHistory.create(
        {
          Vendor_Id: vendorUpdate.Vendor_Id,
          Action: "PENDING",
          Old_Data: JSON.stringify(oldVendorDataWithoutFiles),
          New_Data: JSON.stringify(newVendorOnboardDataWithoutFiles),
          Old_Files_Data: JSON.stringify(oldFileFields),
          New_Files_Data: JSON.stringify(newFileFields),
          Is_CR_Approved: vendorUpdate.Is_CR_Approved || false,
          Is_Manager_Approved: vendorUpdate.Is_Manager_Approved || false,
          Is_Final_Approved: false,
        },
        { transaction },
      );

      const links: any = await userService.socialLinks(vendorUpdate.CoCd);

      // Optimized: Prepare all update operations
      const updateOperations: Promise<any>[] = [];
      const notificationOperations: Promise<any>[] = [];
      const attachmentUrls = (uploadedFiles ?? []).map(
        (file) => file?.Upload_files,
      );

      // ========================= Admin Approval =========================
      if (roleId == 4) {
        const vendorUser = await User.findOne({
          where: { Vendor_Id: vendorUpdate.Vendor_Id },
          attributes: ["ID"],
          transaction,
        });

        if (isApproved) {
          updateOperations.push(
            this.handleFinalApproval(
              updateId,
              vendorUpdate,
              vendorUser,
              userData,
              transaction,
              attachmentUrls,
            ),
          );
        } else {
          updateOperations.push(
            this.handleFinalRejection(
              vendorUpdate,
              rejectionReason,
              vendorUser,
              userData,
              transaction,
            ),
          );
        }

        updateOperations.push(
          newHistoryRecord.update(
            {
              Is_Final_Approved: isApproved,
              Action: isApproved ? "APPROVED" : "REJECTED",
            },
            { transaction },
          ),
        );

        if (entityUpdates.length > 0) {
          updateOperations.push(
            EntityMapping.update(
              {
                Status: isApproved ? StatusEnum.Approved : StatusEnum,
              },
              {
                where: {
                  Vendor_id: vendorUpdate.Vendor_Id,
                  Status: StatusEnum["Under Approval"],
                },
                transaction,
              },
            ),
          );
        }
      } else {
        if (vendorUpdate.CR_Person_Id === curUserId) {
          const crUpdateData = {
            Is_CR_Approved: isApproved,
            CR_Approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
            Status: isApproved
              ? StatusEnum["Under Review"]
              : StatusEnum.Rejected,
          };

          updateOperations.push(
            vendorUpdate.update(crUpdateData, { transaction }),
          );

          if (!isApproved) {
            updateOperations.push(
              this.handleRejectionCleanup(
                vendorUpdate,
                transaction,
                userData,
                rejectionReason,
              ),
            );
          }

          updateOperations.push(
            newHistoryRecord.update(
              {
                Is_CR_Approved: isApproved,
                Action: isApproved ? "PENDING" : "REJECTED",
              },
              { transaction },
            ),
          );

          if (!Final_Approval) {
            const crPersonUser = await User.findOne({
              where: { Employee_Id: findManager?.ID },
              attributes: ["ID"],
              transaction,
            });

            // Prepare notification operations (fire and forget)
            if (isApproved) {
              notificationOperations.push(
                constructMail.sendVendorUpdateEmail({
                  email: findManager?.Email,
                  user: findManager?.Employee_Name,
                  subject: "Update on Vendor Information in the Vendor Portal",
                  vendorName: vendorUpdate.Vendor_Name_EN,
                  updateDate: new Date().toDateString(),
                  contactInfo: vendorUpdate.Daikin_Contact_Name,
                  attachmentUrls,
                  linkedIn: links.LinkedIn_Link,
                  facebook: links.Facebook_Link,
                  instagram: links.Instagram_Link,
                  twitter: links.Twitter_Link,
                  youtube: links.YouTube_Link,
                }),
              );
            } else {
              notificationOperations.push(
                constructMail.sendVendorRejectEmail({
                  email: vendorUpdate?.Email,
                  subject: "Your Vendor Update Has Been Rejected – Daikin",
                  vendorName: vendorUpdate.Vendor_Name_EN,
                  rejectionReason: rejectionReason,
                  linkedIn: links.LinkedIn_Link,
                  facebook: links.Facebook_Link,
                  instagram: links.Instagram_Link,
                  twitter: links.Twitter_Link,
                  youtube: links.YouTube_Link,
                }),
              );
            }

            notificationOperations.push(
              notificationService.createNotification({
                User_Id: crPersonUser?.ID,
                Vendor_Id: vendorUpdate.Vendor_Id,
                Entity_Id: vendorUpdate.CoCd,
                Message: `Vendor ${vendorUpdate.Vendor_Name_EN} details were ${isApproved ? "approved" : "rejected"
                  } by CR on ${new Date().toDateString()}.${isApproved
                    ? "Please review and take appropriate action."
                    : `Reason of rejection: ${rejectionReason}`
                  }`,
                Module_Category_Id: NotificationCategory.Vendor_Update,
                Redirect_Id: vendorUpdate.ID,
                CreatedBy: userData?.id,
              }),
            );
          }
        }

        // ========================= Manager Approval =========================
        if (vendorUpdate?.cr_person?.Reporting_Manager === curUserId) {
          if (!vendorUpdate.Is_CR_Approved) {
            throw new APIError(
              "Not approved by CR",
              StatusCodeEnum.HTTP_BAD_REQUEST,
            );
          }

          if (vendorUpdate.Is_Manager_Approved) {
            throw new APIError(
              "Already approved by manager",
              StatusCodeEnum.HTTP_BAD_REQUEST,
            );
          }

          const managerUpdateData = {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: Sequelize.literal("NOW()"),
            Status: isApproved
              ? StatusEnum["Under Approval"]
              : StatusEnum.Rejected,
            //Is_Added_To_Vendor: isApproved,
          };

          updateOperations.push(
            vendorUpdate.update(managerUpdateData, { transaction }),
          );

          if (!isApproved) {
            updateOperations.push(
              this.handleRejectionCleanup(
                vendorUpdate,
                transaction,
                userData,
                rejectionReason,
              ),
            );
          }

          updateOperations.push(
            newHistoryRecord.update(
              {
                Is_Manager_Approved: isApproved,
                Action: isApproved ? "PENDING" : "REJECTED",
              },
              { transaction },
            ),
          );

          const crPersonUser = await User.findOne({
            where: { Employee_Id: vendorUpdate.CR_Person_Id },
            attributes: ["ID"],
            transaction,
          });

          // Prepare notification operations
          if (isApproved) {
            notificationOperations.push(
              constructMail.sendVendorUpdateManagerEmail({
                email: vendorUpdate?.cr_person?.Email,
                user: vendorUpdate.Daikin_Contact_Name,
                subject:
                  "Update on Vendor Information in the Vendor Portal - Manager Approved",
                vendorName: vendorUpdate.Vendor_Name_EN,
                attachmentUrls,
                managerName: findManager?.Employee_Name,
                updateDate: new Date().toDateString(),
                contactInfo: vendorUpdate.Daikin_Contact_Name,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              }),
            );
          } else {
            notificationOperations.push(
              constructMail.sendVendorRejectEmail({
                email: vendorUpdate?.Email,
                subject: "Your Vendor Update Has Been Rejected – Daikin",
                vendorName: vendorUpdate.Vendor_Name_EN,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              }),
            );
          }

          notificationOperations.push(
            notificationService.createNotification({
              User_Id: crPersonUser?.ID,
              Vendor_Id: vendorUpdate.Vendor_Id,
              Entity_Id: vendorUpdate.CoCd,
              Message: `Vendor ${vendorUpdate.Vendor_Name_EN} details were ${isApproved ? "approved" : "rejected"
                } by Manager on ${new Date().toDateString()}.${isApproved
                  ? "Please review and take appropriate action"
                  : `Reason of rejection: ${rejectionReason}`
                }`,
              Module_Category_Id: NotificationCategory.Vendor_Update,
              Redirect_Id: vendorUpdate.ID,
              CreatedBy: userData?.id,
            }),
          );
        }

        // ========================= Final Approval =========================
        if (Final_Approval) {
          const vendorUser = await User.findOne({
            where: { Vendor_Id: vendorUpdate.Vendor_Id },
            attributes: ["ID"],
            transaction,
          });

          if (isApproved) {
            updateOperations.push(
              this.handleFinalApproval(
                updateId,
                vendorUpdate,
                vendorUser,
                userData,
                transaction,
                attachmentUrls,
              ),
            );
          } else {
            updateOperations.push(
              this.handleFinalRejection(
                vendorUpdate,
                rejectionReason,
                vendorUser,
                userData,
                transaction,
              ),
            );
          }

          updateOperations.push(
            newHistoryRecord.update(
              {
                Is_Final_Approved: isApproved,
                Action: isApproved ? "APPROVED" : "REJECTED",
              },
              { transaction },
            ),
          );

          if (entityUpdates.length > 0) {
            updateOperations.push(
              EntityMapping.update(
                {
                  Status: isApproved ? StatusEnum.Approved : StatusEnum,
                },
                {
                  where: {
                    Vendor_id: vendorUpdate.Vendor_Id,
                    Status: StatusEnum["Under Approval"],
                  },
                  transaction,
                },
              ),
            );
          }
        }
      }

      // ========================= CR Person Approval =========================

      // Optimized: Execute all database operations in parallel
      await Promise.all(updateOperations);

      // Commit transaction first
      await transaction.commit();
      transaction = null;

      // Process notifications after transaction commit (fire and forget)
      if (notificationOperations.length > 0) {
        setImmediate(() => {
          Promise.all(notificationOperations).catch((error) => { });
        });
      }

      return {
        status: true,
        data: `Vendor update ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);

      if (transaction) {
        try {
          await transaction.rollback();
        } catch (error) {
          logger.error("Error:", error);
        }
      }

      throw new APIError(
        error?.message || "An error occurred during vendor update approval",
        error?.statusCode || StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleRejectionCleanup(
    vendorUpdate: any,
    transaction: any,
    userData: any,
    rejectionReason: string,
  ) {
    try {
      // 1. Get the original approved vendor data from the main Vendor table
      const originalVendorData = await Vendor.findOne({
        where: { ID: vendorUpdate.Vendor_Id },
        transaction,
      });

      if (!originalVendorData) {
        return;
      }

      const originalData = originalVendorData.toJSON();

      // 2. Define fields to reset
      const fieldsToReset = [
        "Vendor_Name_EN",
        "Vendor_Name_AR",
        "Vendor_SAP_Code",
        "City",
        "Country",
        "Region",
        "Email",
        "Phone",
        "Fax",
        "Postal_Code",
        "Street_House_No",
        "Payment_Terms",
        "Creditnote_Payment_Terms",
        "Daikin_Contact_Name",
        "Incoterms",
        "Incoterms_Location",
        "Is_VAT",
        "Taxble_Basis",
        "Wht_Applicable",
        "Wht_Rate",
        "Trade_license_number",
        "License_Expiry_Date",
        "Issuing_Authority",
        "Valid_From",
        "VAT_Number",
        "VAT_Group_Name",
        "Payment_Method_Supplement",
        "ABC_Indicator",
        "National_Id_Expiry_Dt",
        "National_Id_No",
        "CR_Person_Id",
        "Industry_Type",
        "Industry_Key",
        "Status",
        "Short_Payment_Reason",
      ];

      // 3. Normalize date fields helper
      const normalizeDate = (dateVal: any) => {
        if (!dateVal) return null;
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? null : convertToSequalizeDate(d);
      };

      // 4. Build reset object with original values
      const resetData: any = {};
      fieldsToReset.forEach((field) => {
        if (originalData[field] !== undefined) {
          if (
            [
              "License_Expiry_Date",
              "Valid_From",
              "National_Id_Expiry_Dt",
            ].includes(field)
          ) {
            resetData[field] = normalizeDate(originalData[field]);
          } else {
            resetData[field] = originalData[field];
          }
        }
      });

      // Always set Status to REJECTED
      resetData.Status = StatusEnum.Rejected;

      // 5. Reset vendor_onboard record
      await vendorUpdate.update(resetData, { transaction });

      // 🔍 Get both file sets
      const newFiles = await UploadFiles.findAll({
        where: {
          Main_Id: vendorUpdate?.ID,
          Is_deleted: false,
        },
        transaction,
      });

      const oldFiles = await UploadFiles.findAll({
        where: {
          Main_Id: vendorUpdate.Vendor_Id,
          Is_deleted: false,
        },
        transaction,
      });

      // 🧠 Group old files by category and name for quick lookup
      const oldFileMap = oldFiles.reduce(
        (acc, file) => {
          const category = file.Category_id;
          const name = path.basename(file.Upload_files);
          if (!acc[category]) acc[category] = new Set();
          acc[category].add(name);
          return acc;
        },
        {} as Record<number, Set<string>>,
      );

      // 🧹 Clean up new files, but only delete if not same as old vendor’s file
      for (const file of newFiles) {
        const category = file.Category_id;
        const filename = path.basename(file.Upload_files);

        const isSameAsOld =
          oldFileMap[category] && oldFileMap[category].has(filename);

        // ✅ Skip deletion if same file already exists in main Vendor
        if (isSameAsOld) {
          continue;
        }

        const relativePath = file.Upload_files.split("/uploads/")[1];
        if (relativePath) {
          const filePath = path.join(
            process.env.VENDOR_FOLDER_PATH,
            relativePath,
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }

      // 6. Mark all uploaded files for this onboard request as deleted (logical cleanup)
      await UploadFiles.update(
        { Is_deleted: true },
        {
          where: {
            Main_Id: vendorUpdate.ID,
            Is_deleted: false,
          },
          transaction,
        },
      );
    } catch (error) {
      logger.error("Error:", error);
      throw error;
    }
  }

  async handleFinalApproval(
    updateId: number,
    vendorUpdate: any,
    vendorUser: any,
    userData: any,
    transaction: any,
    attachmentUrls: string[],
  ) {
    const [cleanVendorUpdate, curData] = await Promise.all([
      this.getVendorUpdateDetails(updateId, transaction),
      this.getCurrentVendorData(updateId, transaction),
    ]);

    const updatedData = cleanVendorUpdate.toJSON();
    const currentData = curData.toJSON();

    const updatedFields: any = this.getChangedFields(updatedData, currentData);
    updatedFields["Status"] = StatusEnum.Approved;
    await this.deleteOldFiles(curData.ID, updateId, transaction);

    // Update Vendor table
    delete updatedFields.ModifiedDt;
    await Vendor.update(updatedFields, {
      where: { Vendor_Onboard_Id: updateId },
      transaction,
    });

    // Update statuses
    await cleanVendorUpdate.update(
      { Status: StatusEnum.Approved },
      { transaction },
    );

    const links: any = await userService.socialLinks(vendorUpdate.CoCd);

    // Send notifications
    await Promise.all([
      constructMail.sendVendorApproveEmail({
        email: vendorUpdate?.Email,
        subject: "Your Vendor Update Has Been Approved – Daikin",
        vendorName: vendorUpdate.Vendor_Name_EN,
        vendorId: vendorUpdate.Vendor_SAP_Code,
        updateDate: new Date().toDateString(),
        attachmentUrls,
        linkedIn: links.LinkedIn_Link,
        facebook: links.Facebook_Link,
        instagram: links.Instagram_Link,
        twitter: links.Twitter_Link,
        youtube: links.YouTube_Link,
      }),
      notificationService.createNotification({
        User_Id: vendorUser.ID,
        Vendor_Id: vendorUpdate.Vendor_Id,
        Entity_Id: vendorUpdate.CoCd,
        Message: `Your recent request for updates has been approved successfully. You can now view your updated profile.`,
        Module_Category_Id: NotificationCategory.Vendor_Update,
        Redirect_Id: vendorUpdate.ID,
        CreatedBy: userData?.id,
      }),
    ]);
  }

  async deleteOldFiles(vendorId: number, updateId: number, transaction: any) {
    const FILE_CATEGORIES = [1, 2, 3, 9, 11];

    const newFiles = await UploadFiles.findAll({
      where: {
        Main_Id: updateId,
        Category_id: { [Op.in]: FILE_CATEGORIES },
        Is_deleted: false,
      },
      transaction,
    });

    const oldFiles = await UploadFiles.findAll({
      where: {
        Main_Id: vendorId,
        Category_id: { [Op.in]: FILE_CATEGORIES },
        Is_deleted: false,
      },
      transaction,
    });

    // Group by category
    const groupByCategory = (files: any[]) =>
      files.reduce(
        (acc, file) => {
          const cat = file.Category_id;
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(path.basename(file.Upload_files));
          return acc;
        },
        {} as Record<number, string[]>,
      );

    const newGrouped = groupByCategory(newFiles);
    const oldGrouped = groupByCategory(oldFiles);

    // ✅ Delete old files only for categories present in new uploads
    for (const oldFile of oldFiles) {
      const { Category_id } = oldFile;

      // ❌ Skip if category not in new upload
      if (!newGrouped[Category_id]) {
        continue;
      }

      const newFileNames = newGrouped[Category_id] || [];
      const oldFileName = path.basename(oldFile.Upload_files);

      // ✅ Only delete if old file not found in new list (same category)
      if (!newFileNames.includes(oldFileName)) {
        const relativePath = oldFile.Upload_files.split("/uploads/")[1];
        if (relativePath) {
          const filePath = path.join(
            process.env.VENDOR_FOLDER_PATH,
            relativePath,
          );
          if (fs.existsSync(filePath)) {
            // ✅ Delete from folder only if category exists in new files
            fs.unlinkSync(filePath);
          }
        }

        await UploadFiles.update(
          { Is_deleted: true },
          { where: { ID: oldFile.ID }, transaction },
        );
      }
    }

    // ✅ Check identical per category
    let allCategoriesSame = true;

    for (const categoryId of FILE_CATEGORIES) {
      const oldList = oldGrouped[categoryId] || [];
      const newList = newGrouped[categoryId] || [];

      const same =
        oldList.length === newList.length &&
        oldList.every((f: any) => newList.includes(f));

      if (!same) {
        allCategoriesSame = false;
        break;
      }
    }
    if (allCategoriesSame) {
      const newIds = newFiles.map((f) => f.ID);
      await UploadFiles.destroy({
        where: { ID: { [Op.in]: newIds } },
        transaction,
      });
    } else {
      for (const newFile of newFiles) {
        const { Category_id } = newFile;
        const oldFileNames = oldGrouped[Category_id] || [];
        const newFileName = path.basename(newFile.Upload_files);

        // ✅ Only move file if it doesn’t already exist under vendor
        if (!oldFileNames.includes(newFileName)) {
          await UploadFiles.update(
            { Main_Id: vendorId },
            { where: { ID: newFile.ID }, transaction },
          );
        } else {
          // ✅ Duplicate found → remove new file safely
          await UploadFiles.destroy({
            where: { ID: newFile.ID },
            transaction,
          });
        }
      }
    }
  }

  async handleFinalRejection(
    vendorUpdate: any,
    rejectionReason: string,
    vendorUser: any,
    userData: any,
    transaction: any,
  ) {
    await vendorUpdate.update({ Status: StatusEnum.Rejected }, { transaction });

    const crPersonUser = await User.findOne({
      where: { Employee_Id: vendorUpdate.CR_Person_Id },
      attributes: ["ID"],
      transaction,
    });

    const links: any = await userService.socialLinks(vendorUpdate.CoCd);

    await Promise.all([
      constructMail.sendVendorRejectEmail({
        email: vendorUpdate?.Email,
        subject: "Your Vendor Update Has Been Rejected – Daikin",
        vendorName: vendorUpdate.Vendor_Name_EN,
        rejectionReason: rejectionReason,
        linkedIn: links.LinkedIn_Link,
        facebook: links.Facebook_Link,
        instagram: links.Instagram_Link,
        twitter: links.Twitter_Link,
        youtube: links.YouTube_Link,
      }),
      notificationService.createNotification({
        User_Id: vendorUser.ID,
        Vendor_Id: vendorUpdate.Vendor_Id,
        Entity_Id: vendorUpdate.CoCd,
        Message: `Your recent request for update has been rejected. Reason of rejection: ${rejectionReason}`,
        Module_Category_Id: NotificationCategory.Vendor_Update,
        Redirect_Id: vendorUpdate.ID,
        CreatedBy: userData?.id,
      }),
      notificationService.createNotification({
        User_Id: crPersonUser.ID,
        Vendor_Id: vendorUpdate.Vendor_Id,
        Entity_Id: vendorUpdate.CoCd,
        Message: `Vendor ${vendorUpdate.Vendor_Name_EN
          } details were rejected by CR on ${new Date().toDateString()}.Reason of rejection: ${rejectionReason}`,
        Module_Category_Id: NotificationCategory.Vendor_Update,
        Redirect_Id: vendorUpdate.ID,
        CreatedBy: userData?.id,
      }),
    ]);
  }

  // Helper methods for cleaner code
  getChangedFields(updatedData: any, currentData: any) {
    const updatedFields: any = {};

    for (const key in updatedData) {
      if (key in currentData && !key.includes("_image")) {
        const oldVal = currentData[key];
        const newVal = updatedData[key];

        const normalizedOld =
          oldVal instanceof Date && oldVal
            ? new Date(oldVal).toISOString().split("T")[0]
            : oldVal;
        const normalizedNew =
          newVal instanceof Date && newVal
            ? new Date(newVal).toISOString().split("T")[0]
            : newVal;

        if (normalizedOld !== normalizedNew) {
          updatedFields[key] = newVal;
        }
      }
    }

    return updatedFields;
  }

  async handleImageUpdates(
    updatedData: any,
    currentData: any,
    vendorId: number,
    transaction: any,
  ) {
    const imageFields = [
      { field: "licence_image", category: FileCategories.LicenceFile },
      { field: "profile_picture", category: FileCategories.vendorProfile },
      {
        field: "national_id_image",
        category: FileCategories.NationalLicenceFile,
      },
      { field: "payment_image", category: FileCategories.PaymentFile },
      { field: "vat_image", category: FileCategories.VatFile },
      { field: "NDA_image", category: FileCategories.NDAFILE },
    ];

    const imageUpdatePromises = imageFields.map(async ({ field, category }) => {
      const newImages = updatedData[field] || [];
      const currentImages = currentData[field] || [];

      const hasChanges =
        newImages.length !== currentImages.length ||
        newImages.some((newImg: any, index: any) => {
          const currentImg = currentImages[index];
          return !currentImg || newImg.Upload_files !== currentImg.Upload_files;
        });

      if (hasChanges && newImages.length > 0) {
        // Delete and create operations
        await UploadFiles.destroy({
          where: {
            Main_Id: vendorId,
            Category_id: category,
            Is_deleted: false,
          },
          transaction,
        });

        const createPromises = newImages.map((newImage: any) =>
          UploadFiles.create(
            {
              Main_Id: vendorId ?? 1,
              Category_id: newImage.Category_id,
              Upload_files: newImage.Upload_files,
              Attachment_type: newImage.Attachment_type,
              Is_deleted: false,
              CreatedDt: convertToSequalizeDate(),
              CreatedBy: currentData?.CreatedBy ?? 1,
            },
            { transaction },
          ),
        );

        await Promise.all(createPromises);
      }
    });

    await Promise.all(imageUpdatePromises);
  }

  async getVendorUpdateDetails(updateId: number, transaction: any) {
    return await Vendor_onboard.findOne({
      where: { ID: updateId },
      attributes: [
        "ID",
        "Vendor_Name_EN",
        "Vendor_Name_AR",
        "CoCd",
        "Vendor_SAP_Code",
        "City",
        "Country",
        "Region",
        "Email",
        "Phone",
        "Fax",
        "Postal_Code",
        "Street_House_No",
        "Payment_Terms",
        "Creditnote_Payment_Terms",
        "Daikin_Contact_Name",
        "Incoterms",
        "Incoterms_Location",
        "Is_VAT",
        "Taxble_Basis",
        "Wht_Applicable",
        "Wht_Rate",
        "Trade_license_number",
        "License_Expiry_Date",
        "Issuing_Authority",
        "Valid_From",
        "VAT_Number",
        "VAT_Group_Name",
        "Payment_Method_Supplement",
        "ABC_Indicator",
        "National_Id_Expiry_Dt",
        "National_Id_No",
        "CR_Person_Id",
        "Industry_Type",
        "Industry_Key",
        "CreatedDt",
        "CreatedBy",
        "Is_Active",
        "Is_Deleted",
        "Short_Payment_Reason",
        "ModifiedBy",
        "ModifiedDt",
      ],
      include: this.getImageIncludes(),
      transaction,
    });
  }

  async getCurrentVendorData(updateId: number, transaction: any) {
    return await Vendor.findOne({
      where: { Vendor_Onboard_Id: updateId },
      attributes: [
        "ID",
        "Vendor_Name_EN",
        "Vendor_Name_AR",
        "CoCd",
        "Vendor_SAP_Code",
        "City",
        "Country",
        "Region",
        "Email",
        "Phone",
        "Fax",
        "Postal_Code",
        "Street_House_No",
        "Payment_Terms",
        "Creditnote_Payment_Terms",
        "Daikin_Contact_Name",
        "Incoterms",
        "Incoterms_Location",
        "Is_VAT",
        "Taxble_Basis",
        "Wht_Applicable",
        "Wht_Rate",
        "Trade_license_number",
        "License_Expiry_Date",
        "Issuing_Authority",
        "Valid_From",
        "VAT_Number",
        "VAT_Group_Name",
        "Payment_Method_Supplement",
        "ABC_Indicator",
        "National_Id_Expiry_Dt",
        "National_Id_No",
        "CR_Person_Id",
        "Industry_Type",
        "Industry_Key",
        "CreatedDt",
        "CreatedBy",
        "Is_Active",
        "Is_Deleted",
        "Vendor_Onboard_Id",
        "Short_Payment_Reason",
        "ModifiedBy",
        "ModifiedDt",
      ],
      include: this.getImageIncludes(),
      transaction,
    });
  }

  getImageIncludes() {
    const baseAttributes = {
      exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
    };

    return [
      {
        model: UploadFiles,
        as: "licence_image",
        required: false,
        attributes: baseAttributes,
        where: { Category_id: FileCategories.LicenceFile, Is_deleted: false },
      },
      {
        model: UploadFiles,
        as: "profile_picture",
        required: false,
        attributes: baseAttributes,
        where: { Category_id: FileCategories.vendorProfile, Is_deleted: false },
      },
      {
        model: UploadFiles,
        as: "national_id_image",
        required: false,
        attributes: baseAttributes,
        where: {
          Category_id: FileCategories.NationalLicenceFile,
          Is_deleted: false,
        },
      },
      {
        model: UploadFiles,
        as: "payment_image",
        required: false,
        attributes: baseAttributes,
        where: { Category_id: FileCategories.PaymentFile, Is_deleted: false },
      },
      {
        model: UploadFiles,
        as: "vat_image",
        required: false,
        attributes: baseAttributes,
        where: { Category_id: FileCategories.VatFile, Is_deleted: false },
      },
      {
        model: UploadFiles,
        as: "NDA_image",
        required: false,
        attributes: baseAttributes,
        where: { Category_id: FileCategories.NDAFILE, Is_deleted: false },
      },
    ];
  }
  async vendorEntityApproveReject(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    rejectionReason: string,
    Final_Approval: any,
    userData: { id: number; vendor_id: number },
    roleId: any,
  ) {
    const transaction = await sequelize.transaction();
    try {
      const entityUpdates: any = await EntityMapping.findOne({
        where: {
          ID: updateId,
        },
        include: [
          {
            model: Vendor,
            as: "vendor",
            required: false,
          },
        ],
      });

      let checkCR = await Employee.findOne({
        where: { ID: entityUpdates.CR_id },
        attributes: ["ID", "Reporting_Manager", "Employee_Name"],
      });

      let checkUserCR = await User.findOne({
        where: { Employee_Id: entityUpdates.CR_id, Role_ID: { [Op.ne]: 1 } },
        attributes: ["ID", "Name"],
      });

      let findManager = await Employee.findOne({
        where: { ID: checkCR?.Reporting_Manager },
      });

      let checkUserManager = await User.findOne({
        where: {
          Employee_Id: checkCR?.Reporting_Manager,
          Role_ID: { [Op.ne]: 1 },
        },
        attributes: ["ID", "Name"],
      });

      const findVendor = await User.findOne({
        where: {
          Vendor_Id: entityUpdates.Vendor_id,
          //CoCd: CoCd,
        },
      });

      const links: any = await userService.socialLinks(entityUpdates.CoCd);

      if (roleId == 4) {
        await EntityMapping.update(
          {
            Status: StatusEnum.Approved,
            Extension_granted_date: Sequelize.literal("NOW()"),
          },
          {
            where: {
              ID: updateId,
            },
            transaction,
          },
        );

        const findEntity = await Entity.findOne({
          where: {
            CoCd: entityUpdates.CoCd,
          },
          attributes: ["ID", "Entity_Name", "CoCd"],
        });

        await constructMail.sendVendorEntityApproveEmail({
          email: entityUpdates.vendor.Email,
          subject: "Vendor Extension Request Approved",
          vendorName: entityUpdates.vendor.Vendor_Name_EN,
          vendorId: entityUpdates.vendor.ID,
          extensionDate: entityUpdates.Extension_request_date,
          approvedExtensions: findEntity.Entity_Name,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });

        await notificationService.createNotification({
          User_Id: findVendor?.ID,
          Vendor_Id: entityUpdates.Vendor_id,
          Entity_Id: entityUpdates.CoCd,
          Message: `Your Entity request for ${findEntity.Entity_Name} has been approved Succesfully.`,
          Module_Category_Id: NotificationCategory.Vendor_Entity,
          Redirect_Id: entityUpdates.ID,
          CreatedBy: userData?.id,
        });
      } else {
        if (curUserId == entityUpdates.CR_id) {
          await EntityMapping.update(
            {
              Is_CR_approved: isApproved,
              CR_approved_date: Sequelize.literal("NOW()"),
              Status: isApproved
                ? StatusEnum["Under Review"]
                : StatusEnum.Rejected,
            },
            {
              where: {
                ID: updateId,
              },
              transaction,
            },
          );

          if (!Final_Approval) {
            if (isApproved) {
              const findEntity = await Entity.findOne({
                where: {
                  CoCd: entityUpdates.CoCd,
                },
                attributes: ["ID", "Entity_Name", "CoCd"],
              });

              await constructMail.sendNewEntityRequestEmail({
                email: findManager?.Email,
                user: findManager?.Employee_Name,
                subject: "New Entity Request for Vendor in the Vendor Portal",
                vendorName: findVendor?.Name,
                updateDate: new Date().toDateString(),
                entityRequested: findEntity?.Entity_Name, // <-- You can dynamically insert actual request info here
                contactInfo: findManager?.Employee_Name, // Prefer email or phone here, instead of just name
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });

              const vendorName = findVendor?.Name;
              const entityName = findEntity?.Entity_Name;
              const updateDate = new Date().toDateString();

              await notificationService.createNotification({
                User_Id: checkUserManager?.ID,
                Vendor_Id: entityUpdates.Vendor_id,
                Entity_Id: findEntity?.CoCd,
                Message: `Entity request for vendor ${vendorName} has been approved by ${checkCR?.Employee_Name} on ${updateDate}. Requested Entity: ${entityName}. Please review and take appropriate action.`,
                Module_Category_Id: NotificationCategory.Vendor_Entity,
                Redirect_Id: entityUpdates.ID,
                CreatedBy: userData?.id,
              });
            }
            if (!isApproved) {
              await constructMail.sendVendorEntityRejectEmail({
                email: entityUpdates.vendor?.Email,
                subject: "Your Vendor Extension Has Been Rejected – Daikin",
                vendorName: entityUpdates.vendor.Vendor_Name_EN,
                vendorId: entityUpdates.vendor.Vendor_SAP_Code,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });

              await notificationService.createNotification({
                User_Id: findVendor?.ID,
                Vendor_Id: entityUpdates.Vendor_id,
                Entity_Id: entityUpdates.CoCd,
                Message: `Your recent request for extension has been rejected. Reason: ${rejectionReason}`,
                Module_Category_Id: NotificationCategory.Vendor_Entity,
                Redirect_Id: entityUpdates.ID,
                CreatedBy: userData?.id,
              });
            }
          }
        }

        if (findManager?.ID == curUserId) {
          await EntityMapping.update(
            {
              Is_manager_approved: isApproved,
              Manager_approved_date: Sequelize.literal("NOW()"),
              Status: isApproved
                ? StatusEnum["Under Approval"]
                : StatusEnum.Rejected,
            },
            {
              where: {
                ID: updateId,
              },
              transaction,
            },
          );

          const findEntity = await Entity.findOne({
            where: {
              CoCd: entityUpdates.CoCd,
            },
            attributes: ["ID", "Entity_Name", "CoCd"],
          });

          const findVendor = await User.findOne({
            where: {
              Vendor_Id: entityUpdates.Vendor_id,
              //CoCd: CoCd,
            },
          });

          const CR_person = await employeeService.getEmployeeByIdV2(
            entityUpdates.CR_id,
          );

          if (isApproved) {
            await constructMail.sendNewEntityRequestManagerToCrEmail({
              email: CR_person.Email,
              user: CR_person.Name,
              subject: "New Entity Request for Vendor in the Vendor Portal",
              vendorName: findVendor?.Name,
              updateDate: new Date().toDateString(),
              entityRequested: findEntity?.Entity_Name, // <-- You can dynamically insert actual request info here
              contactInfo: CR_person.Name, // Prefer email or phone here, instead of just name
              managerName: findManager?.Employee_Name,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });

            const vendorName = findVendor?.Name;
            const entityName = findEntity?.Entity_Name;
            const updateDate = new Date().toDateString();

            await notificationService.createNotification({
              User_Id: CR_person.ID,
              Vendor_Id: entityUpdates.Vendor_id,
              Entity_Id: findEntity?.ID || null,
              Message: `Entity request for vendor ${vendorName} has been approved by ${findManager?.Employee_Name} on ${updateDate}. Requested Entity: ${entityName}.`,
              Module_Category_Id: NotificationCategory.Vendor_Entity,
              Redirect_Id: entityUpdates.ID,
              CreatedBy: userData?.id,
            });
          }
          if (!isApproved) {
            await constructMail.sendVendorEntityRejectEmail({
              email: entityUpdates.vendor?.Email,
              subject: "Your Vendor Extension Has Been Rejected – Daikin",
              vendorName: entityUpdates.vendor.Vendor_Name_EN,
              vendorId: entityUpdates.vendor.Vendor_SAP_Code,
              rejectionReason: rejectionReason,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });

            await notificationService.createNotification({
              User_Id: findVendor?.ID,
              Vendor_Id: entityUpdates.Vendor_id,
              Entity_Id: entityUpdates.CoCd,
              Message: `Your recent request for extension has been rejected. Reason: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Vendor_Entity,
              Redirect_Id: entityUpdates.ID,
              CreatedBy: userData?.id,
            });

            await notificationService.createNotification({
              User_Id: CR_person.ID,
              Vendor_Id: entityUpdates.Vendor_id,
              Entity_Id: findEntity?.ID || null,
              Message: `Entity request for vendor ${findVendor?.Name
                } has been rejected by ${findManager?.Employee_Name
                } on ${new Date().toDateString()}. Requested Entity: ${findEntity?.Entity_Name
                }.Reason of rejection: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Vendor_Entity,
              Redirect_Id: entityUpdates.ID,
              CreatedBy: userData?.id,
            });

            await constructMail.sendNewEntityRejectManagerToCrEmail({
              email: CR_person?.Email,
              user: CR_person?.Name,
              subject: "Vendor Extension Rejected Mail",
              vendorName: findVendor?.Name,
              entityRequested: findEntity?.Entity_Name,
              contactInfo: CR_person?.Name,
              managerName: findManager?.Employee_Name,
              rejectionReason: rejectionReason,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });
          }
        }

        if (Final_Approval && isApproved) {
          await EntityMapping.update(
            {
              Status: StatusEnum.Approved,
              Extension_granted_date: Sequelize.literal("NOW()"),
            },
            {
              where: {
                ID: updateId,
              },
              transaction,
            },
          );

          const findEntity = await Entity.findOne({
            where: {
              CoCd: entityUpdates.CoCd,
            },
            attributes: ["ID", "Entity_Name", "CoCd"],
          });

          await constructMail.sendVendorEntityApproveEmail({
            email: entityUpdates?.vendor?.Email,
            subject: "Vendor Extension Request Approved",
            vendorName: entityUpdates?.vendor?.Vendor_Name_EN,
            vendorId: entityUpdates?.vendor?.ID,
            extensionDate: entityUpdates.Extension_request_date,
            approvedExtensions: findEntity?.Entity_Name,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findVendor?.ID,
            Vendor_Id: entityUpdates.Vendor_id,
            Entity_Id: entityUpdates.CoCd,
            Message: `Your Entity request for ${findEntity?.Entity_Name} has been approved Succesfully.`,
            Module_Category_Id: NotificationCategory.Vendor_Entity,
            Redirect_Id: entityUpdates.ID,
            CreatedBy: userData?.id,
          });
        } else if (Final_Approval && !isApproved) {
          await EntityMapping.update(
            {
              Status: StatusEnum.Rejected,
            },
            {
              where: {
                ID: updateId,
              },
              transaction,
            },
          );
          await constructMail.sendVendorEntityRejectEmail({
            email: entityUpdates.vendor?.Email,
            subject: "Your Vendor Extension Has Been Rejected – Daikin",
            vendorName: entityUpdates.vendor.Vendor_Name_EN,
            vendorId: entityUpdates.vendor.Vendor_SAP_Code,
            rejectionReason: rejectionReason,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findVendor?.ID,
            Vendor_Id: entityUpdates.Vendor_id,
            Entity_Id: entityUpdates.CoCd,
            Message: `Your recent request for extension has been rejected. Reason: ${rejectionReason}`,
            Module_Category_Id: NotificationCategory.Vendor_Entity,
            Redirect_Id: entityUpdates.ID,
            CreatedBy: userData?.id,
          });

          const findEntity = await Entity.findOne({
            where: {
              CoCd: entityUpdates.CoCd,
            },
            attributes: ["ID", "Entity_Name", "CoCd"],
          });

          await constructMail.sendNewEntityRejectEmail({
            email: findManager?.Email,
            user: findManager?.Employee_Name,
            subject: "Vendor Extension Rejected Mail",
            vendorName: findVendor?.Name,
            crName: checkCR?.Employee_Name,
            updateDate: new Date().toDateString(),
            entityRequested: findEntity?.Entity_Name,
            rejectionReason: rejectionReason,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: checkUserManager?.ID,
            Vendor_Id: entityUpdates.Vendor_id,
            Entity_Id: findEntity?.CoCd,
            Message: `Entity request for vendor ${findVendor?.Name
              } has been rejected by ${checkCR?.Employee_Name
              } on ${new Date().toDateString()}. Requested Entity: ${findEntity?.Entity_Name
              }. Reason of rejection: ${rejectionReason}`,
            Module_Category_Id: NotificationCategory.Vendor_Entity,
            Redirect_Id: entityUpdates.ID,
            CreatedBy: userData?.id,
          });
        }
      }

      await transaction.commit();
      return {
        status: true,
        data: `Vendor update ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async inlineUpdate(body: any) {
    try {
      let result = await Vendor.update(
        {
          Is_PO_Inline: body?.Is_PO_Inline,
        },
        {
          where: {
            ID: body?.ID,
          },
        },
        // transaction,
      );

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async nonPOAccess(body: any) {
    try {
      let result = await Vendor.update(
        {
          Non_PO_Access: body?.Non_PO_Access,
        },
        {
          where: {
            ID: body?.ID,
          },
        },
      );

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorApplicationApproval(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
  ) {
    const transaction = await sequelize.transaction();
    try {
      const vendorUpdate = await Vendor_onboard.findOne({
        where: {
          ID: updateId,
          Action: "ADD",
        },
        include: {
          model: Employee,
          as: "cr_person",
        },
      });

      if (!vendorUpdate)
        throw new APIError(
          "application not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      if (
        vendorUpdate.Status === StatusEnum.Approved ||
        vendorUpdate.Is_Added_To_Vendor
      )
        throw new APIError(
          "Application already approved",
          StatusCodeEnum.HTTP_OK,
        );

      if (
        ![
          vendorUpdate.CR_Person_Id,
          vendorUpdate?.cr_person?.Reporting_Manager,
        ].includes(curUserId)
      ) {
        throw new APIError(
          "Not authorised for this action",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      //if the user is CR person...
      if (vendorUpdate.CR_Person_Id == curUserId) {
        if (vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Already approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        await vendorUpdate.update(
          {
            Is_CR_Approved: isApproved,
            CR_Approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
            Status: isApproved
              ? StatusEnum["Under Review"]
              : StatusEnum.Rejected,
          },
          {
            transaction,
          },
        );
      }

      //if user is manager
      if (vendorUpdate?.cr_person?.Reporting_Manager == curUserId) {
        if (!vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Not approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        //already approved by manager
        if (vendorUpdate.Is_Manager_Approved)
          throw new APIError(
            "Already approved by manager",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await vendorUpdate.update(
          {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: Sequelize.literal("NOW()"),
            Status: isApproved
              ? StatusEnum["Under Approval"]
              : StatusEnum.Rejected,
          },
          {
            transaction,
          },
        );
      }

      await transaction.commit();
      return {
        status: true,
        data: `Vendor update ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorApproval(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    userData: { id: number; vendor_id: number },
  ) {
    const transaction = await sequelize.transaction();
    try {
      const vendorUpdate = await Vendor_onboard.findOne({
        where: {
          Application_Number: updateId,
          Action: "ADD",
        },
        include: [
          {
            model: Employee,
            as: "cr_person",
          },
          {
            model: Status,
            as: "onboard_status",
          },
          {
            model: UploadFiles,
            as: "licence_image",
          },
          {
            model: UploadFiles,
            as: "national_id_image",
          },
          {
            model: VendorBankOnboard,
            as: "bankDetails",
          },
          {
            model: UploadFiles,
            as: "profile_picture",
          },
          {
            model: UploadFiles,
            as: "vat_image",
          },
        ],
      });

      const uploadedFiles = await UploadFiles.findAll({
        where: {
          Main_Id: vendorUpdate.ID,
          Is_deleted: false,
        },
      });

      const attachmentUrls = uploadedFiles
        .map((file) => file?.Upload_files)
        .filter((url) => !!url);

      let findManager = await Employee.findOne({
        where: { ID: vendorUpdate?.cr_person?.Reporting_Manager },
      });

      let findName = await User.findOne({
        where: { Employee_Id: findManager?.ID },
      });

      let findCr = await User.findOne({
        where: {
          Employee_Id: vendorUpdate.CR_Person_Id,
          Role_id: { [Op.ne]: 1 },
        },
      });

      const links: any = await userService.socialLinks(vendorUpdate.CoCd);

      if (!vendorUpdate)
        throw new APIError(
          "application not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      if (
        vendorUpdate.Status === StatusEnum.Approved ||
        vendorUpdate.Is_Added_To_Vendor
      )
        throw new APIError(
          "Application already approved",
          StatusCodeEnum.HTTP_OK,
        );

      if (
        ![
          vendorUpdate.CR_Person_Id,
          vendorUpdate?.cr_person?.Reporting_Manager,
        ].includes(curUserId)
      ) {
        throw new APIError(
          "Not authorised for this action",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (vendorUpdate.CR_Person_Id == curUserId) {
        if (vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Already approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        await vendorUpdate.update(
          {
            Is_CR_Approved: isApproved,
            CR_Approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
            Status: isApproved
              ? StatusEnum["Under Review"]
              : StatusEnum.Rejected,
          },
          {
            transaction,
          },
        );

        if (isApproved) {
          await constructMail.sendManagerApprovalRequestEmail({
            email: findManager?.Email,
            user: findName?.Name,
            subject: `Request for Approval/Rejection of Vendor Registration`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            applicationDate: vendorUpdate.CreatedDt.toDateString(),
            description: vendorUpdate.Application_Number,
            contactInfo: vendorUpdate.Daikin_Contact_Name,
            attachmentUrls,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findName?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor registration request from ${vendorUpdate.Vendor_Name_EN
              } has been submitted on ${vendorUpdate.CreatedDt.toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }, is approved By CR person.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });
        }
      }

      if (vendorUpdate?.cr_person?.Reporting_Manager == curUserId) {
        if (!vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Not approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        if (vendorUpdate.Is_Manager_Approved)
          throw new APIError(
            "Already approved by manager",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await vendorUpdate.update(
          {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: Sequelize.literal("NOW()"),
            Status: isApproved
              ? StatusEnum["Under Approval"]
              : StatusEnum.Rejected,
            Is_Added_To_Vendor: false,
          },
          {
            transaction,
          },
        );

        if (isApproved) {
          await constructMail.sendManagerToCrApprovalEmail({
            email: vendorUpdate?.cr_person?.Email,
            user: vendorUpdate.Daikin_Contact_Name,
            subject: `Request for Approval/Rejection of Vendor Registration`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            approvalDate: new Date().toDateString(),
            description: vendorUpdate.Application_Number,
            contactInfo: vendorUpdate.Daikin_Contact_Name,
            managerName: findManager?.Employee_Name,
            attachmentUrls,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findCr?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor application for ${vendorUpdate.Vendor_Name_EN
              } was approved by ${findManager?.Employee_Name
              } on ${new Date().toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });
        }

        if (!isApproved) {
          await notificationService.createNotification({
            User_Id: findCr?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor application for ${vendorUpdate.Vendor_Name_EN
              } was rejected by ${findManager?.Employee_Name
              } on ${new Date().toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });
        }
      }

      await transaction.commit();
      return {
        status: true,
        data: `Vendor update ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  // ...existing code...
  async vendorApprovalV2(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    rejectionReason: string,
    userData: { id: number; vendor_id: number },
    role_id: any,
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch vendorUpdate and related data in one go
      const vendorUpdate = await Vendor_onboard.findOne({
        where: {
          Application_Number: updateId,
          Action: "ADD",
        },
        include: [
          { model: Employee, as: "cr_person" },
          { model: Status, as: "onboard_status" },
          { model: UploadFiles, as: "licence_image" },
          { model: UploadFiles, as: "national_id_image" },
          { model: VendorBankOnboard, as: "bankDetails" },
          { model: UploadFiles, as: "profile_picture" },
          { model: UploadFiles, as: "vat_image" },
        ],
      });

      if (!vendorUpdate)
        throw new APIError(
          "application not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      if (
        vendorUpdate.Status === StatusEnum.Approved ||
        vendorUpdate.Is_Added_To_Vendor
      )
        throw new APIError(
          "Application already approved",
          StatusCodeEnum.HTTP_OK,
        );

      // Pre-fetch related users and links in parallel
      const [uploadedFiles, findManager, findName, findCr, links]: any =
        await Promise.all([
          UploadFiles.findAll({
            where: { Main_Id: vendorUpdate.ID, Is_deleted: false },
          }),
          Employee.findOne({
            where: { ID: vendorUpdate?.cr_person?.Reporting_Manager },
          }),
          User.findOne({
            where: { Employee_Id: vendorUpdate?.cr_person?.Reporting_Manager },
          }),
          User.findOne({
            where: {
              Employee_Id: vendorUpdate.CR_Person_Id,
              Role_id: { [Op.ne]: 1 },
            },
          }),
          userService.socialLinks(vendorUpdate.CoCd),
        ]);

      const attachmentUrls = uploadedFiles
        .map((file: any) => file.Upload_files)
        .filter(Boolean);

      if (role_id == 4) {
        await vendorUpdate.update(
          {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: Sequelize.literal("NOW()"),
            Status: isApproved
              ? StatusEnum["Under Approval"]
              : StatusEnum.Rejected,
            Is_Added_To_Vendor: false,
          },
          { transaction },
        );

        if (isApproved) {
          await constructMail.sendManagerToCrApprovalEmail({
            email: vendorUpdate?.cr_person?.Email,
            user: vendorUpdate.Daikin_Contact_Name,
            subject: `Request for Approval/Rejection of Vendor Registration`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            approvalDate: new Date().toDateString(),
            description: vendorUpdate.Application_Number,
            contactInfo: vendorUpdate.Daikin_Contact_Name,
            managerName: findManager?.Employee_Name,
            attachmentUrls,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findCr?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor application for ${vendorUpdate.Vendor_Name_EN
              } was approved by ${findManager?.Employee_Name
              } on ${new Date().toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });
        } else {
          await notificationService.createNotification({
            User_Id: findCr?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor application for ${vendorUpdate.Vendor_Name_EN
              } was rejected by ${findManager?.Employee_Name
              } on ${new Date().toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }. Reason of Rejection: ${rejectionReason}.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });

          await constructMail.sendRegistrationRejectEmail({
            email: vendorUpdate?.Email,
            subject: `Rejected - Vendor Registration Rejected`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            referenceNumber: vendorUpdate.Application_Number,
            applicationDate: vendorUpdate.CreatedDt?.toDateString(),
            rejectionReason: rejectionReason,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }
      }
      // CR person approval
      if (vendorUpdate.CR_Person_Id === curUserId) {
        if (vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Already approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await vendorUpdate.update(
          {
            Is_CR_Approved: isApproved,
            CR_Approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
            Status: isApproved
              ? StatusEnum["Under Review"]
              : StatusEnum.Rejected,
          },
          { transaction },
        );

        if (isApproved) {
          await constructMail.sendManagerApprovalRequestEmail({
            email: findManager?.Email,
            user: findName?.Name,
            subject: `Request for Approval/Rejection of Vendor Registration`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            applicationDate: vendorUpdate.CreatedDt?.toDateString(),
            description: vendorUpdate.Application_Number,
            contactInfo: vendorUpdate.Daikin_Contact_Name,
            attachmentUrls,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findName?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor registration request from ${vendorUpdate.Vendor_Name_EN
              } has been submitted on ${vendorUpdate.CreatedDt?.toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }, is approved By CR person.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });
        } else {
          await constructMail.sendRegistrationRejectEmail({
            email: vendorUpdate?.Email,
            subject: `Rejected - Vendor Registration Rejected`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            referenceNumber: vendorUpdate.Application_Number,
            applicationDate: vendorUpdate.CreatedDt?.toDateString(),
            rejectionReason: rejectionReason,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }
      }

      // Manager approval
      if (vendorUpdate?.cr_person?.Reporting_Manager === curUserId) {
        if (!vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Not approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        if (vendorUpdate.Is_Manager_Approved)
          throw new APIError(
            "Already approved by manager",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await vendorUpdate.update(
          {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: Sequelize.literal("NOW()"),
            Status: isApproved
              ? StatusEnum["Under Approval"]
              : StatusEnum.Rejected,
            Is_Added_To_Vendor: false,
          },
          { transaction },
        );

        if (isApproved) {
          await constructMail.sendManagerToCrApprovalEmail({
            email: vendorUpdate?.cr_person?.Email,
            user: vendorUpdate.Daikin_Contact_Name,
            subject: `Request for Approval/Rejection of Vendor Registration`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            approvalDate: new Date().toDateString(),
            description: vendorUpdate.Application_Number,
            contactInfo: vendorUpdate.Daikin_Contact_Name,
            managerName: findManager?.Employee_Name,
            attachmentUrls,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });

          await notificationService.createNotification({
            User_Id: findCr?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor application for ${vendorUpdate.Vendor_Name_EN
              } was approved by ${findManager?.Employee_Name
              } on ${new Date().toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });
        } else {
          await notificationService.createNotification({
            User_Id: findCr?.ID,
            Vendor_Id: vendorUpdate.Vendor_Id,
            Entity_Id: vendorUpdate.CoCd,
            Message: `Vendor application for ${vendorUpdate.Vendor_Name_EN
              } was rejected by ${findManager?.Employee_Name
              } on ${new Date().toDateString()}. Application Number: ${vendorUpdate.Application_Number
              }. Reason of Rejection: ${rejectionReason}.`,
            Module_Category_Id: NotificationCategory.Vendor_Application,
            Redirect_Id: vendorUpdate.Application_Number,
            CreatedBy: userData?.id,
          });

          await constructMail.sendRegistrationRejectEmail({
            email: vendorUpdate?.Email,
            subject: `Rejected - Vendor Registration Rejected`,
            vendorName: vendorUpdate.Vendor_Name_EN,
            referenceNumber: vendorUpdate.Application_Number,
            applicationDate: vendorUpdate.CreatedDt?.toDateString(),
            rejectionReason: rejectionReason,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }
      }

      await transaction.commit();
      return {
        status: true,
        data: `Vendor update ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }
  // ...existing code...

  async getVendorCR(vendorId: number) {
    try {
      const vendor = await Vendor.findOne({
        where: {
          ID: vendorId,
        },
        include: {
          model: Employee,
          as: "cr_person",
        },
      });
      if (!vendor)
        throw new APIError("vendor not found", StatusCodeEnum.HTTP_NOT_FOUND);
      return vendor;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getApprovedVendor() {
    try {
      let data: any = await Vendor_onboard.findAll({
        where: {
          Vendor_SAP_Code: {
            [Op.ne]: null,
          },
          Is_Added_To_Vendor: false,
        },
        raw: false,
        include: [
          {
            model: VendorBankOnboard,
            as: "bankDetails",
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
          },
        ],
      });
      if (!data)
        throw new APIError("vendor not found", StatusCodeEnum.HTTP_NOT_FOUND);

      const cleanedVendors = (data ?? []).map(
        (vendor: any) => vendor?.get?.({ plain: true }) ?? vendor,
      );
      return cleanedVendors;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getApprovedVendorV1() {
    try {
      let data: any = await Vendor_onboard.findAll({
        where: {
          Vendor_SAP_Code: {
            [Op.ne]: null,
          },
          Is_Added_To_Vendor: false,
        },
        raw: false,
        limit: 25,
        include: [
          {
            model: VendorBankOnboard,
            as: "bankDetails",
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
          },
        ],
      });
      if (!data)
        throw new APIError("vendor not found", StatusCodeEnum.HTTP_NOT_FOUND);

      const cleanedVendors = (data ?? []).map(
        (vendor: any) => vendor?.get?.({ plain: true }) ?? vendor,
      );
      return cleanedVendors;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  generateRandomPassword(length = 13): string {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const signs = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    // Ensure first character is uppercase
    let password = upper.charAt(Math.floor(Math.random() * upper.length));

    // Ensure at least one number and one sign
    let num = numbers.charAt(Math.floor(Math.random() * numbers.length));
    let sign = signs.charAt(Math.floor(Math.random() * signs.length));

    // Fill the rest with random characters
    const all = upper + lower + numbers + signs;
    for (let i = 0; i < length - 3; i++) {
      password += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Insert number and sign at random positions (not first)
    let arr = password.split("");
    let numPos = Math.floor(Math.random() * (arr.length - 1)) + 1;
    arr.splice(numPos, 0, num);

    let signPos;
    do {
      signPos = Math.floor(Math.random() * (arr.length - 1)) + 1;
    } while (signPos === numPos);
    arr.splice(signPos, 0, sign);

    return arr.join("").slice(0, length); // Ensure length is exactly 13
  }

  async UpdateDatas(data: any) {
    const t = await sequelize.transaction();
    try {
      const vendorData = (data ?? []).map(
        ({ bankDetails, ID, ...vendor }: any) => {
          vendor.Vendor_Onboard_Id = ID;
          vendor.Status = 4;
          return vendor;
        },
      );

      vendorData.forEach((vendor: any) => {
        if (vendor.License_Expiry_Date)
          vendor.License_Expiry_Date = convertToSequalizeDate(
            vendor.License_Expiry_Date,
          );

        if (vendor.Valid_From)
          vendor.Valid_From = convertToSequalizeDate(vendor.Valid_From);

        if (vendor.CR_Approved_date)
          vendor.CR_Approved_date = convertToSequalizeDate(
            vendor.CR_Approved_date,
          );

        if (vendor.Manager_Approved_Dt)
          vendor.Manager_Approved_Dt = convertToSequalizeDate(
            vendor.Manager_Approved_Dt,
          );

        if (vendor.CreatedDt)
          vendor.CreatedDt = convertToSequalizeDate(vendor.CreatedDt);

        if (vendor.ModifiedDt)
          vendor.ModifiedDt = convertToSequalizeDate(vendor.ModifiedDt);

        if (vendor.National_Id_Expiry_Dt)
          vendor.National_Id_Expiry_Dt = convertToSequalizeDate(
            vendor.National_Id_Expiry_Dt,
          );
      });

      const insertedVendors = await Vendor.bulkCreate(vendorData, {
        transaction: t,
        returning: true,
      });
      // Prepare EntityMapping data
      // Prepare EntityMapping records
      const entityMappingData = insertedVendors.map(
        (vendor: any, i: number) => {
          return {
            CR_id: data[i]?.CR_Person_Id,
            CoCd: vendor.CoCd,
            Status: 4,
            Vendor_id: vendor.id,
            Approved_by: data[i]?.CR_Person_Id,
            Extension_granted_date: Sequelize.literal("NOW()"),
            Is_Default_Entity: true,
          };
        },
      );

      // Insert into EntityMapping table
      await EntityMapping.bulkCreate(entityMappingData, {
        transaction: t,
      });

      // 2. Prepare bank details with inserted Vendor IDs
      const vendorBankData = insertedVendors.map((vendor: any, i: number) => {
        const bankDetail = data[i].bankDetails;
        return {
          ...bankDetail,
          Vendor_Id: vendor.id,
          CreatedDt: bankDetail.CreatedDt || convertToSequalizeDate(),
        };
      });

      vendorBankData.forEach((vendorBank: any) => {
        if (vendorBank.CreatedDt)
          vendorBank.CreatedDt = convertToSequalizeDate(vendorBank.CreatedDt);

        if (vendorBank.ModifiedDt)
          vendorBank.ModifiedDt = convertToSequalizeDate(vendorBank.ModifiedDt);
      });
      await VendorBankData.bulkCreate(vendorBankData, { transaction: t }); // 3. Update Upload_files: match Vendor_Onboard_id to Vendor.id
      const updatePromises = data.map((item: any, i: number) => {
        const vendorId = insertedVendors[i].ID;
        const onboardId = item.bankDetails.Vendor_Onboard_id;

        return UploadFiles.update(
          { Main_Id: vendorId },
          {
            where: {
              Category_id: [1, 2, 3, 9, 11, 12],
              Main_Id: onboardId,
            },
            transaction: t,
          },
        );
      });

      await Promise.all(updatePromises);
      const userInsertPromises = insertedVendors.map(
        async (vendor: any, i: number) => {
          const plainPassword = this.generateRandomPassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);

          const userData = {
            Email: vendor.Email,
            Name: vendor.Vendor_Name_EN,
            Vendor_Id: vendor.id,
            Employee_Id: vendor.CR_Person_Id,
            Password: hashedPassword,
            CreatedDt: convertToSequalizeDate(),
            Phone_Number: vendor.phone,
            Role_id: 1,
            Vendor_Role: "Admin",
            New_Login: true,
            Primary_User: true,
          };

          await User.create(userData, { transaction: t });

          const link: any = userService.socialLinks(vendorData.CoCd);

          // Send mail with password
          await constructMail.ApplicationApproval(
            vendor.Email,
            plainPassword,
            vendor.Vendor_Name_EN,
            link.Instagram_Link,
            link.Facebook_Link,
            link.LinkedIn_Link,
            link.Twitter_Link,
            link.YouTube_Link,
          );
        },
      );

      await Promise.all(userInsertPromises);
      await Promise.all(
        data.map((item: any, i: number) => {
          return Vendor_onboard.update(
            {
              Status: 4,
              Is_Added_To_Vendor: true,
              Vendor_Id: insertedVendors[i].ID, // auto-generated ID from Vendor table
            },
            {
              where: {
                ID: item.ID,
              },
              transaction: t,
            },
          );
        }),
      );

      await t.commit();
      return data;
    } catch (error) {
      logger.error("Error:", error);
      if (t) {
        t.rollback();
      }

      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async UpdateDatasV1(data: any) {
    try {
      const vendorData = (data ?? []).map(
        ({ bankDetails, ID, ...vendor }: any) => {
          vendor.Vendor_Onboard_Id = ID;
          vendor.Status = 4;
          return vendor;
        },
      );

      // Convert dates
      vendorData.forEach((vendor: any) => {
        if (vendor.License_Expiry_Date)
          vendor.License_Expiry_Date = convertToSequalizeDate(
            vendor.License_Expiry_Date,
          );
        if (vendor.Valid_From)
          vendor.Valid_From = convertToSequalizeDate(vendor.Valid_From);
        if (vendor.CR_Approved_date)
          vendor.CR_Approved_date = convertToSequalizeDate(
            vendor.CR_Approved_date,
          );
        if (vendor.Manager_Approved_Dt)
          vendor.Manager_Approved_Dt = convertToSequalizeDate(
            vendor.Manager_Approved_Dt,
          );
        if (vendor.CreatedDt)
          vendor.CreatedDt = convertToSequalizeDate(vendor.CreatedDt);
        if (vendor.ModifiedDt)
          vendor.ModifiedDt = convertToSequalizeDate(vendor.ModifiedDt);
        if (vendor.National_Id_Expiry_Dt)
          vendor.National_Id_Expiry_Dt = convertToSequalizeDate(
            vendor.National_Id_Expiry_Dt,
          );
      });

      // ✅ 1. Insert vendors (short transaction — avoid holding locks through I/O)
      let insertedVendors: any[];
      {
        const tVendor = await sequelize.transaction();
        try {
          insertedVendors = await Vendor.bulkCreate(vendorData, {
            transaction: tVendor,
            returning: true,
          });
          await tVendor.commit();
        } catch (error) {
          await tVendor.rollback();
          throw error;
        }
      }

      const pendingUploadFileDbOps: Array<{
        createPayload: {
          Main_Id: number;
          Category_id: number;
          Upload_files: string;
          Is_VendorOnboard: boolean;
          CreatedBy: number | null;
        };
        sourceFileRecId: number;
        newUrl: string;
      }> = [];

      // ✅ 2. Create folder structure for each vendor
      const vendorPortalPath =
        process.env.VENDOR_FOLDER_PATH ||
        path.join(os.homedir(), "Desktop", "vendor_portal");

      const ensureDir = (dirPath: string) => {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      };

      // Ensure base path exists
      ensureDir(vendorPortalPath);

      const folderStructure: Record<string, string[]> = {
        "TRADE LICENSE": [],
        "NATIONAL ID": [],
        VAT: [],
        NDA: [],
        "PAYMENT TERMS": [],
        "BANK FILE": [],
        "PO BASED": [
          "INVOICE",
          "DELIVERY NOTE",
          "SHIPPING DOCUMENTS",
          "OTHERS",
        ],
        "NON PO BASED": [
          "INVOICE",
          "DELIVERY NOTE",
          "SHIPPING DOCUMENTS",
          "OTHERS",
        ],
        "LOGISTICS INVOICE": [],
        "CREDIT NOTE": [
          "CREDIT NOTE",
          "DELIVERY NOTE",
          "SHIPPING DOCUMENTS",
          "OTHERS",
        ],
        "ADVANCE PAYMENT": [
          "PROFORMA INVOICE",
          "DELIVERY NOTE",
          "SHIPPING DOCUMENTS",
          "OTHERS",
        ],
        ENQUIRIES: ["INVOICE", "BANK DATA", "EMAIL", "OTHERS"],
      };

      for (const vendor of insertedVendors) {
        const sapCode = vendor.Vendor_SAP_Code;
        if (!sapCode) continue;

        const vendorFolderPath = path.join(
          vendorPortalPath,
          sapCode.toUpperCase(),
        );
        ensureDir(vendorFolderPath);

        // Create each main and subfolder
        for (const [main, subs] of Object.entries(folderStructure)) {
          const mainPath = path.join(vendorFolderPath, main);
          ensureDir(mainPath);

          for (const sub of subs) {
            const subPath = path.join(mainPath, sub);
            ensureDir(subPath);
          }
        } // ✅ Move uploaded files from VENDOR_ONBOARDING → SAP code folder

        try {
          const onboardId = (data ?? []).find(
            (d: any) => d.ID === vendor.Vendor_Onboard_Id,
          )?.ID;

          if (!onboardId) {
          } else {
            const uploadedFiles = await UploadFiles.findAll({
              where: { Main_Id: onboardId, Is_VendorOnboard: true },
            }); // ✅ Onboard → Vendor category mapping
            const onboardToVendorCategory: Record<number, number> = {
              [FileCategories.LicenceFile_Onboard]: FileCategories.LicenceFile,
              [FileCategories.NationalLicenceFile_Onboard]:
                FileCategories.NationalLicenceFile,
              [FileCategories.VatFile_Onboard]: FileCategories.VatFile,
              [FileCategories.PaymentFile_Onboard]: FileCategories.PaymentFile,
              [FileCategories.NDAFILE_Onboard]: FileCategories.NDAFILE,
              [FileCategories.BANKFILE_Onboard]: FileCategories.BANKFILE,
            };

            // ✅ Category → Folder mapping (support both vendor + onboard IDs)
            const categoryToFolder: Record<number, string> = {
              [FileCategories.LicenceFile]: "TRADE LICENSE",
              [FileCategories.LicenceFile_Onboard]: "TRADE LICENSE",

              [FileCategories.NationalLicenceFile]: "NATIONAL ID",
              [FileCategories.NationalLicenceFile_Onboard]: "NATIONAL ID",

              [FileCategories.VatFile]: "VAT",
              [FileCategories.VatFile_Onboard]: "VAT",

              [FileCategories.PaymentFile]: "PAYMENT TERMS",
              [FileCategories.PaymentFile_Onboard]: "PAYMENT TERMS",

              [FileCategories.NDAFILE]: "NDA",
              [FileCategories.NDAFILE_Onboard]: "NDA",

              [FileCategories.BANKFILE]: "BANK FILE",
              [FileCategories.BANKFILE_Onboard]: "BANK FILE",
            };

            for (const fileRec of uploadedFiles) {
              const fileUrl = fileRec.Upload_files;
              if (!fileUrl) {
                continue;
              }

              // Extract file name
              const relativePart = fileUrl.split("/uploads/")[1];
              if (!relativePart) {
                continue;
              }

              // Build correct source path
              const srcPath = path.join(
                process.env.VENDOR_FOLDER_PATH,
                relativePart,
              );
              if (!fs.existsSync(srcPath)) {
                continue;
              }

              // Determine VENDOR category (not onboard)
              const newCategory = onboardToVendorCategory[fileRec.Category_id];
              if (!newCategory) {
                continue;
              }

              // Determine subfolder from FINAL category
              const subFolder = categoryToFolder[newCategory] || "OTHERS";

              // Destination path
              const destDir = path.join(
                process.env.VENDOR_FOLDER_PATH as string,
                sapCode,
                subFolder,
              );
              const destPath = path.join(destDir, path.basename(relativePart)); // Ensure destination folder exists
              fsExtra.ensureDirSync(destDir);

              // Move file safely
              try {
                await fsExtra.move(srcPath, destPath, { overwrite: true });
              } catch (error) {
                logger.error("Error:", error);
                continue;
              }

              // Construct new public URL
              const newRelative = `${sapCode}/${subFolder}/${path.basename(
                relativePart,
              )}`;

              let newUrl;

              if (process.env.NODE_ENV == "Prod") {
                newUrl = `${process.env.BASE_URL}/vendor-portal/uploads/${newRelative}`;
              } else {
                newUrl = `${process.env.BASE_URL}/uploads/${newRelative}`;
              }

              pendingUploadFileDbOps.push({
                createPayload: {
                  Main_Id: vendor.ID,
                  Category_id: newCategory,
                  Upload_files: newUrl,
                  Is_VendorOnboard: false,
                  CreatedBy: fileRec.CreatedBy || null,
                },
                sourceFileRecId: fileRec.ID,
                newUrl,
              });
            }
          }

          const folderName = path.join("registration", vendor.Vendor_Name_EN);
          const targetFolderPath = path.join(
            process.env.VENDOR_FOLDER_PATH as string,
            folderName,
          );

          if (fs.existsSync(targetFolderPath)) {
            fs.rmSync(targetFolderPath, { recursive: true, force: true });
          } else {
          }
        } catch (error) {
          logger.error("Error:", error);
        }
      }

      if (pendingUploadFileDbOps.length > 0) {
        const tUpload = await sequelize.transaction();
        try {
          for (const op of pendingUploadFileDbOps) {
            await UploadFiles.create(op.createPayload, {
              transaction: tUpload,
            });
            await UploadFiles.update(
              { Upload_files: op.newUrl },
              {
                where: { ID: op.sourceFileRecId },
                transaction: tUpload,
              },
            );
          }
          await tUpload.commit();
        } catch (error) {
          await tUpload.rollback();
          throw error;
        }
      }

      // ✅ 3. EntityMapping logic (unchanged)
      const entityMappingData = (insertedVendors ?? []).map(
        (vendor: any, i: number) => ({
          CR_id: data[i]?.CR_Person_Id,
          CoCd: vendor.CoCd,
          Status: 4,
          Vendor_id: vendor.id,
          Approved_by: data[i]?.CR_Person_Id,
          Extension_granted_date: Sequelize.literal("NOW()"),
          Is_Default_Entity: true,
        }),
      );

      // ✅ 4. Vendor bank details
      const vendorBankData = (insertedVendors ?? []).map(
        (vendor: any, i: number) => {
          const bankDetail = data?.[i]?.bankDetails ?? {};
          return {
            ...bankDetail,
            Vendor_Id: vendor.id,
            CreatedDt: bankDetail.CreatedDt || convertToSequalizeDate(),
          };
        },
      );

      vendorBankData.forEach((vendorBank: any) => {
        if (vendorBank.CreatedDt)
          vendorBank.CreatedDt = convertToSequalizeDate(vendorBank.CreatedDt);
        if (vendorBank.ModifiedDt)
          vendorBank.ModifiedDt = convertToSequalizeDate(vendorBank.ModifiedDt);
      });

      // Short transaction: mapping + bank + users (emails sent only after commit)
      const approvalMails: Array<{
        email: string;
        plainPassword: string;
        name: string;
        link: any;
      }> = [];

      const tCore = await sequelize.transaction();
      try {
        await EntityMapping.bulkCreate(entityMappingData, {
          transaction: tCore,
        });

        await VendorBankData.bulkCreate(vendorBankData, {
          transaction: tCore,
        });

        const userInsertPromises = (insertedVendors ?? []).map(
          async (vendor: any, i: number) => {
            const plainPassword = this.generateRandomPassword();
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            const userData = {
              Email: vendor.Email,
              Name: vendor.Vendor_Name_EN,
              Vendor_Id: vendor.id,
              Employee_Id: vendor.CR_Person_Id,
              Password: hashedPassword,
              CreatedDt: convertToSequalizeDate(),
              Phone_Number: vendor.phone,
              Role_id: 1,
              Vendor_Role: "Admin",
              New_Login: true,
              Primary_User: true,
            };

            await User.create(userData, { transaction: tCore });

            approvalMails.push({
              email: vendor.Email,
              plainPassword,
              name: vendor.Vendor_Name_EN,
              link: userService.socialLinks(vendorData?.[i]?.CoCd),
            });
          },
        );

        await Promise.all(userInsertPromises);
        await tCore.commit();
      } catch (error) {
        await tCore.rollback();
        throw error;
      }

      await Promise.all(
        approvalMails.map((m) =>
          constructMail.ApplicationApproval(
            m.email,
            m.plainPassword,
            m.name,
            m.link.Instagram_Link,
            m.link.Facebook_Link,
            m.link.LinkedIn_Link,
            m.link.Twitter_Link,
            m.link.YouTube_Link,
          ),
        ),
      );

      // ✅ 7. Vendor_onboard — dedicated short transaction (minimizes lock time on VENDOR_ONBOARD)
      const tOnboard = await sequelize.transaction();
      try {
        await Promise.all(
          (data ?? []).map((item: any, i: number) =>
            Vendor_onboard.update(
              {
                Status: 4,
                Is_Added_To_Vendor: true,
                Vendor_Id: insertedVendors[i].ID,
              },
              { where: { ID: item.ID }, transaction: tOnboard },
            ),
          ),
        );
        await tOnboard.commit();
      } catch (error) {
        await tOnboard.rollback();
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getVendorHistory(vendorId: number) {
    const historyRecords = await VendorHistory.findAll({
      where: { Vendor_Id: vendorId },
      order: [["Changed_At", "DESC"]],
      raw: true,
    });

    if (!historyRecords || historyRecords.length === 0) {
      return [];
    }

    const fieldLabelMapping: Record<string, string> = {
      Vendor_Name_EN: "Vendor Name (English)",
      Vendor_Name_AR: "Vendor Name (Arabic)",
      Vendor_SAP_Code: "Vendor SAP Code",
      City: "City",
      Country: "Country",
      Region: "Region",
      Email: "Email",
      Phone: "Phone",
      Fax: "Fax",
      Postal_Code: "Postal Code",
      Street_House_No: "Street / House Number",
      Payment_Terms: "Payment Terms",
      Creditnote_Payment_Terms: "Credit Note Payment Terms",
      Daikin_Contact_Name: "Daikin Contact Name",
      Incoterms: "Incoterms",
      Incoterms_Location: "Incoterms Location",
      Is_VAT: "Is VAT Applicable",
      Taxble_Basis: "Taxable Basis",
      Wht_Applicable: "Withholding Tax Applicable",
      Wht_Rate: "Withholding Tax Rate (%)",
      Trade_license_number: "Trade License Number",
      License_Expiry_Date: "License Expiry Date",
      Issuing_Authority: "Issuing Authority",
      Valid_From: "Valid From",
      VAT_Number: "VAT Number",
      VAT_Group_Name: "VAT Group Name",
      Payment_Method_Supplement: "Payment Method Supplement",
      ABC_Indicator: "ABC Indicator",
      National_Id_Expiry_Dt: "National ID Expiry Date",
      National_Id_No: "National ID Number",
      CR_Person_Id: "CR Person ID",
      Industry_Type: "Industry Type",
      Industry_Key: "Industry Key",
      Short_Payment_Reason: "Short Payment Reason",
      LicenceFile: "License Files",
      NationalLicenceFile: "National ID Files",
      PaymentFile: "Payment Files",
      VatFile: "VAT Files",
      NDAFile: "NDA Files",
    };

    const fileFields = [
      "LicenceFile",
      "NationalLicenceFile",
      "PaymentFile",
      "VatFile",
      "NDAFile",
    ];

    // Helper function to safely parse double-encoded JSON
    const safeJsonParse = (data: any): Record<string, any> => {
      if (!data) return {};
      if (typeof data === "object") return data;
      if (typeof data === "string") {
        try {
          // First parse to get the JSON string
          const firstParse = JSON.parse(data);
          if (typeof firstParse === "string") {
            return JSON.parse(firstParse);
          }
          return firstParse;
        } catch (error) {
          logger.error("Error:", error);
          return {};
        }
      }
      return {};
    };

    const results: any[] = [];

    for (const record of historyRecords) {
      // Parse JSON data safely (handling double-encoding)
      const oldData = safeJsonParse(record.Old_Data);
      const newData = safeJsonParse(record.New_Data);
      const oldFiles = safeJsonParse(record.Old_Files_Data);
      const newFiles = safeJsonParse(record.New_Files_Data);

      const changedFields: any[] = [];

      // Handle normal data fields
      const allDataKeys = new Set([
        ...Object.keys(oldData),
        ...Object.keys(newData),
      ]);

      for (const key of allDataKeys) {
        // Only handle if key is in your label mapping and not a file field
        if (!fieldLabelMapping[key] || fileFields.includes(key)) continue;

        const oldVal = oldData[key] ?? null;
        const newVal = newData[key] ?? null;

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push({
            field: fieldLabelMapping[key],
            date: new Date(record.Changed_At).toISOString().split("T")[0],
            old: oldVal,
            new: newVal,
          });
        }
      }

      // Handle file fields - only check fields that have actual content in newFiles
      // If newFiles[key] is empty array, it means user didn't change that field
      for (const key of Object.keys(newFiles)) {
        // Only handle if key is in your label mapping and is a file field
        if (!fieldLabelMapping[key] || !fileFields.includes(key)) continue;

        const oldVal = Array.isArray(oldFiles[key]) ? oldFiles[key] : [];
        const newVal = Array.isArray(newFiles[key]) ? newFiles[key] : [];

        // Skip if new value is empty array (user didn't change this field)
        if (newVal.length === 0) continue;

        // Compare arrays
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push({
            field: key,
            date: new Date(record.Changed_At).toISOString().split("T")[0],
            old: oldVal,
            new: newVal,
          });
        }
      }

      if (changedFields.length > 0) {
        const changedFieldsWithLabels: any = await Promise.all(
          changedFields.map(async (change) => {
            let oldValue = change.old;
            let newValue = change.new;

            // Region
            if (change.field === "Region" || change.field.includes("Region")) {
              const convertRegion = (code: any) => {
                const stateDescription = State.getStateByCode(code);
                return stateDescription ? stateDescription.name : code;
              };
              oldValue = oldValue ? convertRegion(oldValue) : oldValue;
              newValue = newValue ? convertRegion(newValue) : newValue;
            }

            // Country
            if (
              change.field === "Country" ||
              change.field.includes("Country")
            ) {
              const convertCountry = (code: any) => {
                const countryDescription = Country.getCountryByCode(code);
                return countryDescription ? countryDescription.name : code;
              };
              oldValue = oldValue ? convertCountry(oldValue) : oldValue;
              newValue = newValue ? convertCountry(newValue) : newValue;
            }

            // Industry Key
            if (change.field === "Industry_Key") {
              if (oldValue) {
                const oldIndustryKey = await MasterCodes.findOne({
                  where: { Code: oldValue, Type: "INDUSTRY_KEY" },
                  attributes: ["Description_En"],
                });
                oldValue = oldIndustryKey?.Description_En || oldValue;
              }
              if (newValue) {
                const newIndustryKey = await MasterCodes.findOne({
                  where: { Code: newValue, Type: "INDUSTRY_KEY" },
                  attributes: ["Description_En"],
                });
                newValue = newIndustryKey?.Description_En || newValue;
              }
            }

            // Incoterms
            if (change.field === "Incoterms") {
              if (oldValue) {
                const oldIncoterm = await MasterCodes.findOne({
                  where: { Code: oldValue, Type: "INCO_TERMS" },
                  attributes: ["Description_En"],
                });
                oldValue = oldIncoterm?.Description_En || oldValue;
              }
              if (newValue) {
                const newIncoterm = await MasterCodes.findOne({
                  where: { Code: newValue, Type: "INCO_TERMS" },
                  attributes: ["Description_En"],
                });
                newValue = newIncoterm?.Description_En || newValue;
              }
            }

            if (
              change.field === "Payment Terms" ||
              change.field === "Payment_Terms"
            ) {
              if (oldValue) {
                const oldPaymentTerm = await MasterCodes.findOne({
                  where: { Code: oldValue, Type: "REGISTRATION_PAYMENT_TERMS" },
                  attributes: ["Description_En"],
                });
                oldValue = oldPaymentTerm?.Description_En || oldValue;
              }
              if (newValue) {
                const newPaymentTerm = await MasterCodes.findOne({
                  where: { Code: newValue, Type: "REGISTRATION_PAYMENT_TERMS" },
                  attributes: ["Description_En"],
                });
                newValue = newPaymentTerm?.Description_En || newValue;
              }
            }

            return {
              field: fieldLabelMapping[change.field] || change.field,
              date: change.date,
              old: oldValue,
              new: newValue,
            };
          }),
        );

        results.push({
          id: record.ID,
          action: record.Action,
          changedFields: changedFieldsWithLabels,
        });
      }
    }

    return results;
  }

  async getVendorsId(emp_id: number, entity_id: any) {
    try {
      // Start with the main emp_id
      let emp_ids: number[] = [emp_id];
      let toProcess: number[] = [emp_id]; // queue for employees whose reports we need to check

      // Loop until no more subordinates
      while (toProcess.length > 0) {
        const currentBatch = await Employee.findAll({
          where: { Reporting_Manager: { [Op.in]: toProcess } },
          attributes: ["ID"],
        });

        const newIds = currentBatch.map((emp) => emp.ID);

        // Add only unique IDs
        const uniqueNewIds = newIds.filter((id) => !emp_ids.includes(id));

        // Push them to emp_ids and queue
        emp_ids.push(...uniqueNewIds);
        toProcess = uniqueNewIds;
      }

      // Now find vendors mapped to these employees
      const findVendor = await EntityMapping.findAll({
        where: { CR_id: { [Op.in]: emp_ids }, CoCd: entity_id },
        attributes: ["Vendor_id", "ID"],
      });

      const vendorIds = (findVendor ?? []).map(
        (vendor: { Vendor_id: number }) => vendor.Vendor_id,
      );

      return vendorIds.length ? vendorIds : [0];
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateVendor(body: any, userId: number, transaction?: Transaction) {
    try {
      const { Id, Is_Active } = body;

      if (!Id) {
        throw new APIError("Vendor Id is required", 400);
      }

      // Prepare update data
      const updateData: any = {
        Is_Active,
        ModifiedBy: userId,
      };

      const [affectedRows] = await User.update(updateData, {
        where: { Vendor_Id: Id },
        transaction,
      });

      const [vendorAffectedRows] = await Vendor.update(updateData, {
        where: { ID: Id },
        transaction,
      });

      if (affectedRows === 0 && vendorAffectedRows === 0) {
        return {
          status: false,
          message: "No vendor found or no changes detected",
        };
      }

      return { status: true, data: affectedRows };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(
        error?.message || "Failed to update vendor",
        error?.statusCode || 500,
      );
    }
  }
}

export default new VendorService();
