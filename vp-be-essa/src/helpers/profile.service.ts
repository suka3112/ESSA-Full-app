import { Vendor } from "../models/vendor";
import { BaseController } from "../controllers/baseController";
import { User } from "../models/user";
import { Entity } from "../models/entity";
import { UploadFiles } from "../models/uploadFiles";
import { Vendor_onboard } from "../models/vendorOnboard";
import { Op, Sequelize, Transaction } from "sequelize";
import pagination from "../utils/pagination";
import { SubVendorOnboard } from "../models/subVendorOnboard";
import { EntityMapping } from "../models/entityMapping";
import { VendorUpdate } from "../models/vendor_update";
import { Status } from "../models/status";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum, StatusEnum } from "../utils/enums/status.enum";
import { Employee } from "../models/employee";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { sequelize } from "../config/sequelize";
import constructMail from "../utils/constructMail";
import { VendorBankData } from "../models/vendorBank";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import { Country, State } from "country-state-city";
import { MasterCodes } from "../models/mastercodes";
import { VendorBankOnboard } from "../models/vendorBankOnboard";
import employeeService from "./employee.service";
import notificationService from "./notiticationService";
import userService from "./user.service";
import logger from "../utils/logger";

class ProfileService extends BaseController {
  async getUserService(body: any) {
    try {
      let data: any = await User.findOne({
        where: body,
        attributes: { exclude: ["ModifiedDt", "Is_Deleted", "Password"] },
        include: [
          {
            model: Vendor,
            as: "vendor",
            include: [
              {
                model: VendorBankData,
                as: "bankDetails",
              },
              {
                model: UploadFiles,
                as: "licence_image",
                required: false,
                where: {
                  Category_id: FileCategories.LicenceFile,
                  Is_deleted: false,
                },
              },
              {
                model: UploadFiles,
                as: "national_id_image",
                required: false,
                where: {
                  Category_id: FileCategories.NationalLicenceFile,
                  Is_deleted: false,
                },
              },
              {
                model: UploadFiles,
                as: "vat_image",
                required: false,
                where: {
                  Category_id: FileCategories.VatFile,
                  Is_deleted: false,
                },
              },
            ],
          },
        ],
      });

      if (!data) {
        throw new APIError("User not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }
      data = data.get({ plain: true });
      const Country_description = Country.getCountryByCode(
        data?.vendor?.Country,
      );
      if (data?.vendor) {
        data.vendor.countryName = Country_description?.name;
      }
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getUserServiceV1(body: any, entity_id: any) {
    try {
      let data: any = await Vendor.findOne({
        where: body,
        attributes: [
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
          "Image",
          "Non_PO_Access",
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
            model: VendorBankData,
            as: "bankDetails",
            required: false,
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
              Category_id: FileCategories.LicenceFile,
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "profile_picture",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: FileCategories.vendorProfile,
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
              Category_id: FileCategories.NDAFILE,
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
              Category_id: FileCategories.BANKFILE,
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
              Category_id: FileCategories.NationalLicenceFile,
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
              Category_id: FileCategories.PaymentFile,
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
              Category_id: FileCategories.VatFile,
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

      if (!data) {
        throw new APIError("Vendor not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      data = data.get({ plain: true });

      const countryCode = data.Country ? data.Country.trim().toUpperCase() : "";
      const Country_description = Country.getCountryByCode(countryCode);
      data.countryName = Country_description
        ? Country_description.name
        : "Unknown Country";

      if (data.Region && data.Country) {
        const regionCode = data.Region.trim();
        const stateDescription = State.getStateByCodeAndCountry(
          regionCode,
          countryCode,
        );
        data.Region = stateDescription
          ? stateDescription.name
          : "Unknown Region";
      } else {
        data.Region = "Unknown Region";
      }

      if (data.Incoterms && data.Incoterms_details) {
        data.Incoterms_details.Description_En = `${data?.Incoterms_details?.Code} - ${data?.Incoterms_details?.Description_En}`;
      }

      if (data.bankDetails && data.bankDetails.Bank_Country) {
        const bankCountryCode =
          data.bankDetails.Bank_Country.trim().toUpperCase();
        let bankCountry_description = Country.getCountryByCode(bankCountryCode);
        data.bankDetails.Bank_Country = bankCountry_description
          ? bankCountry_description.name
          : "Unknown Country";
      } else if (data.bankDetails) {
        data.bankDetails.Bank_Country = "Unknown Country";
      } else {
        data.bankDetails = { Bank_Country: "Unknown Country" };
      }

      let finddetails = await EntityMapping.findOne({
        where: { Vendor_id: body.id, CoCd: entity_id },
      });
      if (!finddetails) {
        throw new APIError(
          "EntityMapping not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let findCrDetails = await Employee.findOne({
        where: { ID: finddetails.CR_id },
      });
      if (!findCrDetails) {
        throw new APIError(
          "CR Employee not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      data.contact = [
        {
          name: findCrDetails.Employee_Name,
          department: findCrDetails.Department,
          email: findCrDetails.Email,
        },
      ];
      let getStatus = await Vendor_onboard.findOne({
        where: { Vendor_SAP_Code: data.Vendor_SAP_Code },
      });

      if (getStatus?.Status === 4 || getStatus?.Status === 5) {
        data.Edit_Button = true;
        data.Track_Button = false;
      } else {
        data.Edit_Button = false;
        data.Track_Button = true;
      }

      data.Status = 4;
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getUser(body: any) {
    try {
      let data: any = await User.findOne({
        where: body,
        attributes: {
          exclude: [
            "Password",
            "LastPasswordResetRequest",
            "ResetPasswordExpires",
          ],
        },
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["Employee_Code", "Department", "Designation"],
          },
        ],
      });

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getOnbaordUserServiceV1(body: any) {
    try {
      let data: any = await Vendor_onboard.findOne({
        where: body,
        attributes: [
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
        include: [
          {
            model: MasterCodes,
            as: "payment_terms_details",
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
              Category_id: FileCategories.LicenceFile,
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
              Category_id: FileCategories.NationalLicenceFile,
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "profile_picture",
            required: false,
            attributes: {
              exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
            },
            where: {
              Category_id: FileCategories.vendorProfile,
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
              Category_id: FileCategories.VatFile,
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
              Category_id: FileCategories.NDAFILE,
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
              Category_id: FileCategories.BANKFILE,
              Is_deleted: false,
            },
          },
          {
            model: MasterCodes,
            as: "creditnote_payment_terms_details",
            where: { Type: "CREDIT_NOTE_PAYMENT" },
          },
          {
            model: MasterCodes,
            as: "Incoterms_details",
            where: { Type: "INCO_TERMS" },
          },
          {
            model: MasterCodes,
            as: "Industry_Type_details",
            where: { Type: "Industry_type" },
          },
          {
            model: MasterCodes,
            as: "Industry_Key_details",
            where: { Type: "INDUSTRY_KEY" },
          },
        ],
      });

      if (!data) {
        throw new APIError("Vendor not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }
      data = data.get({ plain: true });

      const Country_description = Country.getCountryByCode(data?.Country);
      data.countryName = Country_description?.name;

      const bankCountry_description = Country.getCountryByCode(
        data?.bankDetails?.Bank_Country,
      );
      if (data?.bankDetails) {
        data.bankDetails.Bank_Country = bankCountry_description?.name;
      }

      let findCrDetails = await Employee.findOne({
        where: { ID: data.CR_Person_Id },
      });
      if (!findCrDetails) {
        throw new APIError(
          "CR Employee not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
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

  async updateUser(
    vendorId: number,
    vendor_onboard_id: number,
    details: any,
    transaction: Transaction,
  ) {
    try {
      // Prepare update data
      const updateData = {
        ...details,
        Action: "EDIT",
        Status: StatusEnum["Submitted for Review"],
        Is_CR_Approved: false,
        CR_Approved_date: null,
        Is_Manager_Approved: false,
        Manager_Approved_Dt: null,
        ModifiedDt: convertToSequalizeDate(),
        ModifiedBy: vendorId,
        Vendor_Id: vendorId,
      };

      // Handle date conversions only if dates exist
      if (details.License_Expiry_Date) {
        updateData.License_Expiry_Date = convertToSequalizeDate(
          details.License_Expiry_Date,
        );
      }
      if (details.Valid_From) {
        updateData.Valid_From = convertToSequalizeDate(details.Valid_From);
      }
      if (details.National_Id_Expiry_Dt) {
        updateData.National_Id_Expiry_Dt = convertToSequalizeDate(
          details.National_Id_Expiry_Dt,
        );
      }

      const data = await Vendor_onboard.update(updateData, {
        where: { ID: vendor_onboard_id },
        transaction,
      });

      if (data[0] === 0) {
        return { status: false, message: "No changes detected" };
      }
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async fetchVendor(id: any) {
    try {
      let data = await Vendor.findOne({
        where: { ID: id },
        include: [
          {
            model: UploadFiles,
            as: "licence_image",
            required: false,
            where: {
              Category_id: FileCategories.LicenceFile,
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "national_id_image",
            required: false,
            where: {
              Category_id: FileCategories.NationalLicenceFile,
              Is_deleted: false,
            },
          },
          {
            model: VendorBankData,
            as: "bankDetails",
            required: false,
          },
          {
            model: UploadFiles,
            as: "profile_picture",
            required: false,
          },
          {
            model: UploadFiles,
            as: "vat_image",
            required: false,
            where: {
              Category_id: FileCategories.VatFile,
              Is_deleted: false,
            },
          },
          {
            model: UploadFiles,
            as: "payment_image",
            required: false,
            where: {
              Category_id: FileCategories.PaymentFile,
              Is_deleted: false,
            },
          },
        ],
      });

      if (!data) {
        throw new APIError("Vendor Not Found", StatusCodeEnum.HTTP_NOT_FOUND);
      }
      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateStatus(body: any) {
    try {
      let data = await Vendor.update(
        { Is_Active: body.Is_Active },
        { where: { ID: body.ID } },
      );

      if (!data) {
        throw new APIError("Vendor Not Found", StatusCodeEnum.HTTP_NOT_FOUND);
      }
      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async approveSubUser(curUserId: number, Id: number, isApproved: boolean) {
    const transaction = await sequelize.transaction();
    try {
      const user = await User.findOne({
        where: {
          ID: Id,
        },
        include: [
          {
            model: Vendor,
            as: "vendor", // alias used in User.belongsTo
            include: [
              {
                model: Employee,
                as: "cr_person", // alias used in Vendor.belongsTo
              },
            ],
          },
        ],
      });

      if (!user)
        throw new APIError(
          "user id is invalid",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      const vendorDetails = user.vendor;

      if (!vendorDetails)
        throw new APIError(
          "Invalid vendor Id",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      if (
        ![
          vendorDetails.CR_Person_Id,
          vendorDetails?.cr_person?.Reporting_Manager,
        ].includes(curUserId)
      ) {
        throw new APIError(
          "Not authorised for this action",
          StatusCodeEnum.HTTP_UNAUTHORIZED,
        );
      }

      if (vendorDetails.CR_Person_Id == curUserId) {
        //if user is CR but the application is already approved...
        if (user.Is_CR_Approved)
          throw new APIError(
            "Already approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        await user.update(
          {
            Is_CR_Approved: isApproved,
            CR_Approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
          },
          {
            transaction,
          },
        );
      }

      //if user is manager
      if (vendorDetails?.cr_person?.Reporting_Manager == curUserId) {
        //if the application is not approved by manager yet
        if (!user.Is_CR_Approved)
          throw new APIError(
            "Not approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        //already approved by manager
        if (user.Is_Manager_Approved)
          throw new APIError(
            "Already approved by manager",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await user.update(
          {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: convertToSequalizeDate(),
            Is_Active: isApproved,
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

  async updateVendor(
    body: any,
    previousData: any,
    vendor_id: number,
    user_id: number,
    transaction: any,
  ) {
    try {
      const data: any = await VendorUpdate.create(
        {
          vendor_id: vendor_id,
          data: body,
          status: 0,
          edited_by: user_id,
          previousData: previousData,
        },
        { transaction: transaction },
      );

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [] };
    }
  }

  async addSubUser(body: any, transaction: any) {
    try {
      const data = await SubVendorOnboard.create(
        {
          vendor_register_id: body.vendor_register_id
            ? body.vendor_register_id
            : null,
          name: body.name ? body.name : null,
          email: body.email ? body.email : null,
          role: body.role ? body.role : null,
          status: 2, // submitted
        },
        { transaction: transaction },
      );

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, error: error };
    }
  }

  async listSubUser(query: any) {
    try {
      let page = query.page ? parseInt(query.page) : 1;
      let limit = query.limit ? parseInt(query.limit) : 10;
      let start = (page - 1) * limit;
      let searchCondition = {};
      let sortField, sortOrder;

      // sorting variable declaration
      sortField = query.sort_column || "CreatedDt";
      sortOrder = query.sort || "DESC";
      const order: any = [];

      // switch condition to handle the sort query
      switch (sortField) {
        case "title":
          order.push(["Name", sortOrder]);
          break;
        case "email":
          order.push(["Email", sortOrder]);
          break;
        case "role":
          order.push(["Role_id", sortOrder]);
          break;
        case "is_active":
          order.push(["Is_Active", sortOrder]);
          break;
        default:
          order.push([sortField, sortOrder]);
          break;
      }

      // search query
      if (query.search) {
        searchCondition = {
          [Op.or]: [
            { Name: { [Op.like]: `%${query.search}%` } },
            { Email: { [Op.like]: `%${query.search}%` } },
          ],
        };
      }

      // handle payload
      let payload: any = {
        ...searchCondition,
        Is_Deleted: false,
        Vendor_Id: query.vendor_id,
      };

      let data: any = await User.findAndCountAll({
        where: payload,
        limit: limit,
        offset: start,
        order: order,
        attributes: [
          "ID",
          "Name",
          "Email",
          "Role_id",
          "Is_Active",
          "Status",
          "Vendor_Role",
        ],
        include: [
          {
            model: Status,
            as: "statusus",
          },
        ],
      });

      const result = pagination.paginationData(limit, page, data);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addEntity(
    CoCd: any,
    CR_id: any,
    Reason_for_extension: any,
    userId: any,
  ) {
    try {
      const user = await User.findOne({
        where: {
          ID: userId,
        },
        include: {
          model: Vendor,
          as: "vendor",
        },
      });
      if (!user)
        throw new APIError(
          "user not found",
          StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
        );

      const crPerson = await User.findOne({
        where: {
          Employee_Id: CR_id,
        },
        include: {
          model: Employee,
          as: "employee",
        },
      });

      if (!crPerson || !crPerson.employee)
        throw new APIError(
          "Invalid CR Id. CR person should be an employee",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      const data = await EntityMapping.create({
        CR_id: CR_id,
        CoCd: CoCd,
        Vendor_id: user.Vendor_Id,
        Vendor_onboard_id: user?.vendor?.Vendor_Onboard_Id,
        Reason_for_extension: Reason_for_extension,
        Manager1_code: crPerson?.employee?.Reporting_Manager,
        CreatedBy: user.ID,
      });

      const findEntity = await Entity.findOne({
        where: {
          CoCd: CoCd,
        },
        attributes: ["ID", "Entity_Name", "CoCd"],
      });

      const CR_person = await employeeService.getEmployeeByIdV2(CR_id);

      const findVendor = await User.findOne({
        where: {
          Vendor_Id: user.Vendor_Id,
        },
      });
      const links: any = await userService.socialLinks(user.CoCd);
      await constructMail.sendNewEntityRequestEmail({
        email: CR_person?.Email,
        user: CR_person?.Name,
        subject: "New Entity Request for Vendor in the Vendor Portal",
        vendorName: findVendor?.Name,
        updateDate: new Date().toDateString(),
        entityRequested: findEntity?.Entity_Name, // <-- You can dynamically insert actual request info here
        contactInfo: CR_person?.Email, // Prefer email or phone here, instead of just name
        linkedIn: links?.LinkedIn_Link,
        facebook: links?.Facebook_Link,
        instagram: links?.Instagram_Link,
        twitter: links?.Twitter_Link,
        youtube: links?.YouTube_Link,
      });

      await notificationService.createNotification({
        User_Id: crPerson.ID,
        // Vendor_Id: checkUserCR.ID,
        Entity_Id: findEntity?.CoCd,
        Message: `New Entity request for vendor ${findVendor?.Name
          } submitted on ${new Date().toDateString()}. Entity Requested: ${findEntity?.Entity_Name
          }. Please review and take appropriate action.`,
        Module_Category_Id: NotificationCategory.Vendor_Entity,
        Redirect_Id: data.ID,
        Vendor_Id: user.Vendor_Id,
      });

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkEntity(userId: any) {
    try {
      const user = await EntityMapping.findOne({
        where: {
          Vendor_id: userId,
          Status: { [Op.notIn]: [4, 5] },
        },
      });
      if (!user) {
        return { status: false, data: user };
      }
      return { status: true, data: user };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async listExtension(query: any) {
    try {
      let page = query.page ? parseInt(query.page) : 1;
      let limit = query.limit ? parseInt(query.limit) : 10;
      let start = (page - 1) * limit;
      let sortField, sortOrder;

      // sorting variable declaration
      sortField = query.sort_column || "CreatedDt";
      sortOrder = query.sort || "DESC";
      const order: any = [];

      // switch condition to handle the sort query
      switch (sortField) {
        case "entity":
          order.push(["CoCd", sortOrder]);
          break;
        case "cr_id":
          order.push(["CR_id", sortOrder]);
          break;
        case "submitted_date":
          order.push(["Extension_request_date", sortOrder]);
          break;
        case "approved_date":
          order.push(["Extension_granted_date", sortOrder]);
          break;
        case "status":
          order.push(["Status", sortOrder]);
          break;
        default:
          order.push([sortField, sortOrder]);
          break;
      }

      // handle payload
      let payload: any = {
        Is_deleted: false,
        Vendor_id: query.Vendor_id,
      };

      let data: any = await EntityMapping.findAndCountAll({
        where: payload,
        limit: limit,
        offset: start,
        order: order,
        attributes: [
          "ID",
          "CoCd",
          "CR_id",
          "Extension_request_date",
          "Extension_granted_date",
          "Status",
        ],
        include: [
          {
            model: Status,
            as: "statusus",
            required: false,
          },
          {
            model: Entity,
            as: "entity_details",
            attributes: ["CoCd", "Entity_Name"],
            required: false,
          },
          {
            model: User,
            as: "approvedByEmployee",
            where: { Role_id: { [Op.ne]: 1 } },
            attributes: ["Name", "ID"],
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

      const result = pagination.paginationData(limit, page, data);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async approveExtension(
    curUserId: number,
    Id: number,
    isApproved: boolean,
    reason: string,
  ) {
    const transaction = await sequelize.transaction();
    try {
      const entity = await EntityMapping.findOne({
        where: {
          ID: Id,
        },
      });

      if (!entity)
        throw new APIError("id is invalid", StatusCodeEnum.HTTP_BAD_REQUEST);

      const vendorDetails = await Vendor.findOne({
        where: {
          ID: entity.Vendor_id,
        },
        include: [
          {
            model: Employee,
            as: "cr_person", // alias used in Vendor.belongsTo
          },
        ],
      });
      if (!vendorDetails) {
        throw new APIError(
          "Invalid vendor Id",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (
        ![
          vendorDetails.CR_Person_Id,
          vendorDetails?.cr_person?.Reporting_Manager,
        ].includes(curUserId)
      ) {
        throw new APIError(
          "Not authorised for this action",
          StatusCodeEnum.HTTP_UNAUTHORIZED,
        );
      }

      if (vendorDetails.CR_Person_Id == curUserId) {
        //if user is CR but the application is already approved...
        if (entity.Is_CR_approved)
          throw new APIError(
            "Already approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        await entity.update(
          {
            Is_CR_approved: isApproved,
            CR_approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
            Status: isApproved
              ? StatusEnum["Under Approval"]
              : StatusEnum.Rejected,
          },
          {
            transaction,
          },
        );
      }

      //if user is manager
      if (vendorDetails?.cr_person?.Reporting_Manager == curUserId) {
        //if the application is not approved by manager yet
        if (!entity.Is_CR_approved)
          throw new APIError(
            "Not approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        //already approved by manager
        if (entity.Is_manager_approved)
          throw new APIError(
            "Already approved by manager",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await entity.update(
          {
            Is_manager_approved: isApproved,
            Manager_approved_date: Sequelize.literal("NOW()"),
            Is_active: isApproved,
            Reason_for_rejection: isApproved ? reason : null,
            Status: isApproved ? StatusEnum.Approved : StatusEnum.Rejected,
          },
          {
            transaction,
          },
        );

        //if approving...
        if (isApproved) {
          await constructMail.sendGeneralEmail({
            email: vendorDetails.Email,
            user: vendorDetails.Vendor_Name_EN,
            subject: "extension is approved",
            body: "your extension is approved",
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

  async UpdateProfileImage(vendorID: number, imageUrl: string) {
    try {
      const vendor = await Vendor.findByPk(vendorID);
      if (!vendor)
        throw new APIError(
          "Invalid vendorId. Vendor not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      const result = await vendor.update({
        Image: imageUrl,
      });
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async UpdateUserProfileImage(user_id: number, imageUrl: string) {
    try {
      const result = await User.update(
        {
          Image: imageUrl,
        },
        { where: { ID: user_id } },
      );
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getProfileImage(vendorId: number) {
    try {
      const result = await Vendor.findByPk(vendorId, {
        attributes: ["Image", "ID"],
      });
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getUserProfileImage(user_id: number) {
    try {
      const result = await User.findByPk(user_id, {
        attributes: ["Image", "ID"],
      });
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteProfileImage(vendorId: number) {
    try {
      let result = await Vendor.update(
        { Image: null },
        { where: { ID: vendorId } },
      );
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteUserProfileImage(user_id: number) {
    try {
      let result = await User.update(
        { Image: null },
        { where: { ID: user_id } },
      );

      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async trackUpdates(
    applicationNo: number,
    is_extension: boolean,
    vendorId: number,
    CoCd: number,
  ) {
    try {
      if (is_extension) {
        if (!CoCd)
          throw new APIError(
            "CoCd is required for extension tracking",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        const extensionStatus: any = await EntityMapping.findOne({
          where: {
            Is_deleted: false,
            Vendor_id: vendorId,
            CoCd: CoCd,
          },
          attributes: ["ID", "Status"],
          include: [
            {
              model: Status,
              as: "statusus",
              attributes: [
                "ID",
                "Status_classification",
                "Status_description",
                "Status_description_arabic",
              ],
              required: true,
            },
          ],
        });
        if (!extensionStatus) {
          throw new APIError(
            "Extension not found",
            StatusCodeEnum.HTTP_NOT_FOUND,
          );
        }
        return {
          status: true,
          data: extensionStatus,
        };
      }
      const data: any = await Vendor_onboard.findOne({
        where: {
          ID: applicationNo,
        },
        attributes: ["ID", "Application_Number", "Status"],
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

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getUploadedFilesByMainId(mainId: number, transaction: any) {
    try {
      const result = await UploadFiles.findAll({
        where: {
          Main_Id: mainId,
          Is_deleted: false,
        },
        transaction: transaction,
      });
      return result;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }
}

export default new ProfileService();
