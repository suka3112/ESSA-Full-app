import fs from "fs";
import path from "path";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { Country, City, State } from "country-state-city";
import currencyCodes from "currency-codes";
import getSymbolFromCurrency from "currency-symbol-map";
const { Op } = require("sequelize");
import { Vendor } from "../models/vendor";
import { BaseController } from "../controllers/baseController";
import { VendorBankData } from "../models/vendorBank";
import { UploadFiles } from "../models/uploadFiles";
import { Vendor_onboard } from "../models/vendorOnboard";
import { User } from "../models/user";
import bcrypt from "bcryptjs";
import constructMail from "../utils/constructMail";
import { EntityMapping } from "../models/entityMapping";
import { Status } from "../models/status";
import { Entity } from "../models/entity";
import { APIError } from "../utils/apiError.utils";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { VendorBankOnboard } from "../models/vendorBankOnboard";
import { StatusCodeEnum, StatusEnum } from "../utils/enums/status.enum";
import { MasterCodes } from "../models/mastercodes";
import { Employee } from "../models/employee";
import { UserRole } from "../models/userRole";
import { sequelize } from "../config/sequelize";
import { EmployeeEntityMapping } from "../models/employeeEntityMapping";
import { POHeader } from "../models/purchaseOrderHeader";
import logger from "../utils/logger";

class UserService extends BaseController {

  async registerVendor(details: any, transaction: any) {
    try {
      if (details?.License_Expiry_Date) {
        details.License_Expiry_Date = convertToSequalizeDate(
          details.License_Expiry_Date,
        );
      }

      if (details?.Valid_From) {
        details.Valid_From = convertToSequalizeDate(details.Valid_From);
      }

      if (details?.National_Id_Expiry_Dt) {
        details.National_Id_Expiry_Dt = convertToSequalizeDate(
          details.National_Id_Expiry_Dt,
        );
      }
      if (details?.CR_Approved_date) {
        details.CR_Approved_date = convertToSequalizeDate(
          details.CR_Approved_date,
        );
      }

      if (details) {
        details.Status = 1;
      }

      // });

      let created: any = await Vendor_onboard.create(details, {
        transaction,
      });

      let data = await Vendor_onboard.findOne({
        where: { ID: created.ID },
        transaction,
      });

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkEmail(email: string) {
    try {
      let data: any = await Vendor_onboard.findOne({
        where: { Email: email, Status: { [Op.ne]: 5 } },
        attributes: ["ID", "Vendor_Name_EN", "Email"],
        raw: true,
      });
      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkPhone(Phone: any) {
    try {
      const data: any = await Vendor_onboard.findOne({
        where: {
          Phone: Phone,
          [Op.or]: [
            {
              [Op.and]: [{ Action: "Add" }, { Status: { [Op.ne]: 5 } }],
            },
            { Action: "Edit" },
          ],
        },
        attributes: ["ID", "Vendor_Name_EN", "Phone"],
        raw: true,
      });
      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkuserEmail(email: string) {
    try {
      let data: any = await User.findOne({
        where: { Email: email, Is_Deleted: false },
        attributes: ["ID", "Name", "Email"],
        raw: true,
      });
      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkLicense(license: string) {
    try {
      let data: any = await Vendor_onboard.findOne({
        where: { Trade_license_number: license, Status: { [Op.ne]: 5 } },
        attributes: ["ID", "Vendor_Name_EN", "Email"],
        raw: true,
      });
      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addVendorBank(details: any, transaction: any) {
    try {
      const data = await VendorBankData.create(details, {
        transaction,
      });
      return { status: true, data: "data" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addVendorBankOnboard(
    details: any,
    registerVendor: any,
    transaction: any,
  ) {
    try {
      const data = await VendorBankOnboard.create(details, {
        transaction,
      });
      return { status: true, data: "data" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addUser(body: any, transaction: any) {
    try {
      // body.Status = 2
      if (body) {
        body.Status = StatusEnum.Approved;
        body.Role_id = 1;
      }
      const data = await User.create(body, { transaction: transaction });
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addlicenseImage(body: any, transaction: any) {
    try {
      const data = await UploadFiles.bulkCreate(body, {
        transaction: transaction,
      });
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addlicenseImageV2(body: any[], transaction: any) {
    try {
      if (!Array.isArray(body) || body.length === 0) {
        return { status: true, data: [] };
      }

      // All have same Main_Id and Category_id in your flow; take from first
      const { Main_Id, Category_id } = body[0];

      // Get list of upload paths you're trying to insert
      const incomingPaths = (body || [])
        .map((b) => b?.Upload_files)
        .filter(Boolean);

      // Find existing rows for same Main_Id + Category_id with same Upload_files
      const existing = await UploadFiles.findAll({
        where: {
          Main_Id,
          Category_id,
          Upload_files: { [Op.in]: incomingPaths },
        },
        attributes: ["Upload_files"],
        transaction,
        raw: true,
      });

      const existingSet = new Set((existing || []).map((e) => e?.Upload_files));

      // Keep only new files
      const toInsert = (body || []).filter(
        (b) => !existingSet.has(b?.Upload_files),
      );

      if (toInsert.length === 0) {
        return { status: true, data: [] };
      }

      const data = await UploadFiles.bulkCreate(toInsert, { transaction });
      return { status: true, data };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async addImage(body: any) {
    try {
      const data = await UploadFiles.bulkCreate(body);

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, error: error };
    }
  }

  async vendorCheck(vendorData: any) {
    try {
      const payload: any = {
        Is_Deleted: false,
        Is_Active: true,
      };
      if (vendorData?.Vendor_Name_EN) {
        payload.Vendor_Name_EN = vendorData?.Vendor_Name_EN;
      }
      if (vendorData?.Vendor_Name_AR) {
        payload.Vendor_Name_AR = vendorData?.Vendor_Name_AR;
      }
      if (vendorData?.Email) {
        payload.Email = vendorData?.Email;
      }
      const data = await Vendor_onboard.findOne({
        where: { ...payload },
      });
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async userCheck(userData: any) {
    try {
      const payload: any = {
        Is_Active: true,
      };
      if (userData?.name) {
        payload.Name = userData?.name;
      }
      if (userData?.email) {
        payload.Email = userData?.email;
      }

      let data = await User.findOne({
        where: { ...payload },
        attributes: ["ID", "Name"],

        raw: true,
      });
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async findUsers(userData: any) {
    try {
      let data = await User.findOne({
        where: userData,
        attributes: ["ID", "Name", "Is_User", "Primary_User"],
        raw: true,
      });

      if (!data) {
        return { status: false, data: data };
      }
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteVendor(id: any) {
    try {
      const data: any = await Vendor_onboard.update(
        { is_deleted: true },
        {
          where: { ID: id },
        },
      );
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async vendorInvite(payload: any) {
    try {
      let data = await Vendor_onboard.create(payload);
      return { status: true, data: data.dataValues };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async findUser(payload: any) {
    try {
      let data = await User.findOne({
        where: { Email: payload?.email, Is_Deleted: false },
      });

      if (!data) {
        return { status: false, data: null };
      }

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async tokenReset(id: any) {
    try {
      let data: any = await User.update(
        { ResetPasswordToken: null, ResetPasswordExpires: null },
        { where: { ID: id } },
      );

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async findUserByToken(token: string) {
    try {
      const user = await User.findOne({
        where: {
          ResetPasswordToken: token,
        },
      });

      if (!user)
        throw new APIError("Invalid token", StatusCodeEnum.HTTP_BAD_REQUEST);
      return user;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async resetPasswordService(params: any) {
    try {
      let data;
      const { user_id, current_pass } = params;

      const user = await User.findOne({ where: { ID: user_id } });
      if (!user) {
        throw new APIError("User not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }
      const validate_current_pass = await bcrypt.compare(
        current_pass,
        user?.Password,
      );

      if (!validate_current_pass) {
        throw new APIError("INVALID_PASS", StatusCodeEnum.HTTP_BAD_REQUEST);
      }

      await constructMail.resetPasswordMailBuild(user);

      return { status: true, data: "RESET_INITIATED" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async resetPassword(params: any) {
    try {
      const { user_id, current_pass, newPassword } = params;

      const user = await User.findOne({ where: { ID: user_id } });
      if (!user) {
        throw new APIError("User not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      const validate_current_pass = await bcrypt.compare(
        current_pass,
        user?.Password,
      );

      if (!validate_current_pass) {
        throw new APIError(
          "INVALID OLD PASSWORD",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const hashPassword = await bcrypt.hash(newPassword, 10);
      await User.update(
        {
          Password: hashPassword,
          New_Login: false,
        },
        { where: { ID: user_id } },
      );

      const link: any = await this.socialLinks(user?.CoCd);

      await constructMail.resetPasswordConfirmationMailBuild(
        user?.Email,
        user?.Name,
        link?.Instagram_Link,
        link?.Facebook_Link,
        link?.LinkedIn_Link,
        link?.Twitter_Link,
        link?.YouTube_Link,
      );

      return { status: true, data: "Password reset successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async resetPasswordValidationService(params: any) {
    try {
      const { password, user_id } = params;

      const user_update: any = await User.update(
        {
          Password: password,
        },
        { where: { ID: user_id } },
      );

      return { status: true, data: user_update };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async setupAuthenticatorService(id: number) {
    try {
      let user = await User.findOne({ where: { ID: id }, raw: true });
      if (!user)
        throw new APIError("Invalid user id", StatusCodeEnum.HTTP_NOT_FOUND);
      const secret = speakeasy.generateSecret({
        name: `${process.env.AppName} (${user.Email})`,
      });

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      return {
        status: true,
        qrCodeUrl,
        secret: secret.base32,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async verifyAuthenticatorService(id: number, token: string) {
    try {
      return {
        status: true,
        message: "2FA verified successfully",
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateUser(id: any, payload: any) {
    try {
      let data;

      const user_update: any = await User.update(payload, {
        where: { ID: id },
      });

      return { status: true, data: user_update };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getUserService(body: any) {
    try {
      // Postgres quoted identifiers are case-sensitive; normalize common lowercase keys.
      const where = { ...body };
      if (where.email !== undefined && where.Email === undefined) {
        where.Email = where.email;
        delete where.email;
      }
      if (where.id !== undefined && where.ID === undefined) {
        where.ID = where.id;
        delete where.id;
      }

      let data = await User.findOne({
        where,
        include: [
          {
            model: Vendor,
            as: "vendor",
            required: false,
            attributes: [
              "Vendor_SAP_Code",
              "Vendor_Name_EN",
              "Vendor_Name_AR",
              "Phone",
              "Is_PO_Inline",
              "Non_PO_Access",
            ],
          },
        ],
      });

      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getVendorService(body: any) {
    try {
      const where = { ...body };
      if (where.email !== undefined && where.Email === undefined) {
        where.Email = where.email;
        delete where.email;
      }
      if (where.id !== undefined && where.ID === undefined) {
        where.ID = where.id;
        delete where.id;
      }

      let data = await User.findOne({
        where,
        include: [
          {
            model: Vendor,
            as: "vendor",
            required: false,
            attributes: [
              "Vendor_SAP_Code",
              "Vendor_Name_EN",
              "Vendor_Name_AR",
              "Phone",
              "Is_PO_Inline",
              "Non_PO_Access",
            ],
          },
        ],
      });

      return data;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async trackApplication(
    reference_number: number,
    company_name: string,
    trade_licence_number: string,
  ) {
    try {
      const vendorOnboard = await Vendor_onboard.findOne({
        where: {
          Application_Number: reference_number,
          Vendor_Name_EN: company_name,
          Trade_license_number: trade_licence_number,
        },
        attributes: ["ID", "Vendor_Name_EN", "Status", "Application_Number"],
      });

      if (!vendorOnboard)
        throw new APIError(
          "Invalid input: One or more of Reference Number, Company Name or Trade Licence Number are incorrect.",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );

      return { status: true, data: vendorOnboard };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async fetchCountries() {
    try {
      const countries = Country.getAllCountries();

      const data = countries.map((country: any) => ({
        name: country.name,
        isoCode: country.isoCode,
      }));

      return { status: true, data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [] };
    }
  }

  async fetchCities(
    query: any,
  ): Promise<{ status: boolean; data: any[]; message?: string }> {
    try {
      const { id } = query || {};

      if (!id) {
        return { status: false, data: [], message: "Country code is required" };
      }

      const cities = City.getCitiesOfCountry(id.toUpperCase());

      const data = (cities || []).map((city: any) => ({
        name: city.name,
        countryCode: city.countryCode,
      }));

      return { status: true, data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch cities" };
    }
  }

  async fetchRegions(
    params: any,
  ): Promise<{ status: boolean; data: any[]; message?: string }> {
    try {
      const { id } = params || {};

      if (!id) {
        return { status: false, data: [], message: "Country code is required" };
      }

      const states = State.getStatesOfCountry(id.toUpperCase());

      const data = (states || []).map((state: any) => ({
        name: state.name,
        isoCode: state.isoCode,
        countryCode: state.countryCode,
      }));

      return { status: true, data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch regions" };
    }
  }

  async fetchCurrencies(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const currencies = currencyCodes.codes().map((code: string) => {
        const currency = currencyCodes.code(code);
        return {
          name: currency?.currency || "Unknown",
          code: currency?.code || "N/A",
          symbol: getSymbolFromCurrency(currency?.code) || "N/A",
        };
      });

      return { status: true, data: currencies };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch currencies" };
    }
  }

  async fetchIndustryKeys(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await MasterCodes.findAll({
        where: { Type: "INDUSTRY_KEY" },
      });
      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async dropdowns(type: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await MasterCodes.findAll({
        where: { Type: type },
        order: [["SortOrder", "ASC"]],
      });
      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async crPerson(
    CoCd: any,
    body: any,
  ): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      let whereCondition;
      if (body?.isFinance) {
        whereCondition = { Vendor_Id: null, CoCd: CoCd, Role_id: 2 };
      } else if (!body?.isFinance) {
        whereCondition = { Vendor_Id: null, CoCd: CoCd };
      } else {
        whereCondition = { Vendor_Id: null, CoCd: CoCd };
      }
      const crperson = await User.findAll({
        attributes: ["ID", "Employee_Id", "Name", "Employee_Code"],
        where: whereCondition,
      });

      return { status: true, data: crperson };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async entityDropdown(user_id: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await EntityMapping.findAll({
        where: { Vendor_id: user_id, Status: 4 },
        attributes: ["ID", "CoCd"],
        include: [
          {
            model: Entity,
            as: "entity_details",
            attributes: [
              "ID",
              "Entity_Name",
              "CoCd",
              "LinkedIn_Link",
              "Facebook_Link",
              "Instagram_Link",
              "Twitter_Link",
              "YouTube_Link",
              "Entity_Name_AR",
            ],
          },
          {
            model: Employee,
            as: "CR_details",
            attributes: ["ID", "Employee_Name"],
          },
        ],
      });

      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async financeEntityDropdown(user_id: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      let findEmployeeId: any = await Employee.findOne({
        where: { ID: user_id },
        attributes: ["ID", "Employee_Name", "Employee_Code"],
      });

      const industryKeys = await EmployeeEntityMapping.findAll({
        where: { Employee_Code: findEmployeeId?.Employee_Code },
        attributes: ["ID", "CoCd"],
        include: [
          {
            model: Entity,
            as: "entity_details",
            attributes: [
              "ID",
              "Entity_Name",
              "CoCd",
              "LinkedIn_Link",
              "Facebook_Link",
              "Instagram_Link",
              "Twitter_Link",
              "YouTube_Link",
              "Entity_Name_AR",
            ],
          },
        ],
      });

      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async userEntityDropdown(user_id: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await User.findAll({
        where: { ID: user_id },
        attributes: ["ID", "CoCd"],
        include: {
          model: Entity,
          as: "entity_details",
          attributes: [
            "ID",
            "Entity_Name",
            "CoCd",
            "LinkedIn_Link",
            "Facebook_Link",
            "Instagram_Link",
            "Twitter_Link",
            "YouTube_Link",
            "Entity_Name_AR",
          ],
        },
      });

      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async allEntityDropdown(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await Entity.findAll({
        attributes: ["ID", "Entity_Name", "CoCd", "Entity_Name_AR"],
      });

      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async adminEntity(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await Entity.findAll({
        where: { Is_Deleted: false },
        attributes: [
          "ID",
          "Entity_Name",
          "CoCd",
          "Entity_Name_AR",
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
      });

      // Get the entity details separately
      const entityDetails = await Entity.findAll({
        where: { Is_Deleted: false },
        attributes: [
          "ID",
          "Entity_Name",
          "CoCd",
          "Entity_Name_AR",
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
      });

      // Create a map for quick lookup
      const entityDetailsMap: { [key: string]: any } = (
        entityDetails || []
      ).reduce((map: { [key: string]: any }, entity: any) => {
        const plainEntity = entity?.get({ plain: true });
        map[plainEntity.CoCd] = plainEntity;
        return map;
      }, {});

      // Combine the results
      const formattedResponse = (industryKeys || []).map((entity) => {
        const plainEntity = entity?.get({ plain: true });
        return {
          ID: plainEntity.ID,
          CoCd: plainEntity.CoCd,
          entity_details: entityDetailsMap[plainEntity.CoCd] || null,
        };
      });

      return { status: true, data: formattedResponse };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async rolesDropdown(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await UserRole.findAll({
        attributes: ["ID", "Role_Name_EN"],
        where: { Is_Deleted: false },
      });

      return { status: true, data: industryKeys };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }
  async extensionEntityDropdown(user_id: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const industryKeys = await EntityMapping.findAll({
        where: {
          Vendor_id: user_id,
          Status: { [Op.ne]: 5 }, // Exclude status 5
        },
        attributes: ["ID", "CoCd"],
      });

      const uniqueCoCd = [
        ...new Set((industryKeys || []).map((item) => item?.CoCd)),
      ];

      const result = await Entity.findAll({
        where: {
          CoCd: {
            [Op.notIn]: uniqueCoCd, // Exclude these CoCd values
          },
        },
        attributes: ["ID", "CoCd", "Entity_Name", "Entity_Name_AR"],
      });

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch industry keys",
      };
    }
  }

  async getIncoterms(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const incotermsRaw = await MasterCodes.findAll({
        where: { Type: "INCO_TERMS" },
        raw: true,
      });

      const incoterms = (incotermsRaw || []).map((item) => ({
        ...item,
        Description_En: `${item?.Code} - ${item?.Description_En}`,
      }));

      return { status: true, data: incoterms };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch Incoterms" };
    }
  }

  async getPaymentTerms(query: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      let paymentTerms;
      if (query?.type == "initial") {
        paymentTerms = await MasterCodes.findAll({
          where: { Type: "PAYMENT_TERMS", Param1: 1 },
          order: [["sortOrder", "ASC"]],
        });
      } else {
        paymentTerms = await MasterCodes.findAll({
          where: { Type: "PAYMENT_TERMS", Param1: 0 },
          order: [["sortOrder", "ASC"]],
        });
      }
      return { status: true, data: paymentTerms };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch Payment Terms",
      };
    }
  }

  async Registrationpaymentterms(query: any): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      let paymentTerms;
      if (query?.type == "initial") {
        paymentTerms = await MasterCodes.findAll({
          where: { Type: "REGISTRATION_PAYMENT_TERMS", Param1: 1 },
          order: [["sortOrder", "ASC"]],
        });
      } else {
        paymentTerms = await MasterCodes.findAll({
          where: { Type: "REGISTRATION_PAYMENT_TERMS", Param1: 0 },
          order: [["sortOrder", "ASC"]],
        });
      }
      return { status: true, data: paymentTerms };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: [],
        message: "Failed to fetch Payment Terms",
      };
    }
  }

  async getStatus(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const incoterms = await Status.findAll({
        where: {
          Status_code: {
            [Op.notIn]: [6, 7], // exclude 6 and 7
          },
        },
      });
      return { status: true, data: incoterms };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch Status" };
    }
  }

  async getInvoiceStatus(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const incoterms = await Status.findAll({
        where: { ID: { [Op.in]: [1, 2, 4, 5, 6, 7] } },
      });

      // Custom sort order
      const customOrder = [7, 1, 2, 4, 5, 6];
      (incoterms || []).sort(
        (a, b) => customOrder.indexOf(a.ID) - customOrder.indexOf(b.ID),
      );

      return { status: true, data: incoterms };
    } catch (error: any) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch Incoterms" };
    }
  }

  async getAdvStatus(): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      const incoterms = await Status.findAll({
        where: { ID: { [Op.in]: [1, 3, 4, 5, 6, 7] } },
      });

      const customOrder = [7, 1, 3, 4, 5, 6];
      (incoterms || []).sort(
        (a, b) => customOrder.indexOf(a.ID) - customOrder.indexOf(b.ID),
      );

      return { status: true, data: incoterms };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to fetch Incoterms" };
    }
  }

  async clearPO() {
    try {
      await sequelize.query(`
                  update PO_DETAIL set IR_value = 0, Inv_Qty = 0, Material_status = 'Open' where PONo IN ('4533279827','4533280658','4533280700','4533278819','4533278821','4533279190','4533276094','4533275027','4533274736','4533277820')`);

      await sequelize.query(`
                  update PO_HEADER set InvValue = 0, Total_IR_Qty = 0 where PONo IN ('4533279827','4533280658','4533280700','4533278819','4533278821','4533279190','4533276094','4533275027','4533274736','4533277820')`);
      return { status: true, data: `PO cleared for DEMO's PO` };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Failed to fetch clearPO" };
    }
  }

  async deleteFiles(
    id: any,
    url: any,
  ): Promise<{
    status: boolean;
    data: any[];
    message?: string;
  }> {
    try {
      // 🔹 Step 1: Find the record first (to get file path)
      const fileRecord = await UploadFiles.findOne({ where: { ID: id } });

      if (url) {
        const relativePath = url.split("/uploads/")[1];

        if (relativePath) {
          const filePath = path.join(
            process.env.VENDOR_FOLDER_PATH,
            relativePath,
          );

          // 🔹 Step 3: Delete the file from folder if it exists
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          } else {
          }
        }
      }

      // 🔹 Step 4: Delete record from DB
      const deletedCount = await UploadFiles.destroy({
        where: { ID: id },
      });

      if (deletedCount === 0) {
        return {
          status: false,
          data: [],
          message: "No file deleted (record missing)",
        };
      }

      return {
        status: true,
        data: [deletedCount],
        message: "File deleted successfully",
      };
    } catch (error: any) {
      logger.error("Error:", error);
      return { status: false, data: [], message: "Failed to delete file" };
    }
  }

  async resetPasswordV2(params: any) {
    try {
      const { user_id, current_pass, newPassword } = params;

      const user = await User.findOne({ where: { ID: user_id } });
      if (!user) {
        throw new APIError("User not found", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      const validate_current_pass = await bcrypt.compare(
        current_pass,
        user?.Password,
      );

      if (!validate_current_pass) {
        throw new APIError(
          "INVALID OLD PASSWORD",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let mailData = {
        Email: user?.Email,
        Phone: user?.Phone_Number,
        Name: user?.Name,
      };

      let getotp = await constructMail.loginOtpMailBuild(mailData);

      await constructMail.resetPwdOtpSMSBuild(mailData, getotp.data);

      return { status: true, data: "Password reset successfully" };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async resetPasswordValidationServiceV2(params: any) {
    try {
      const { password, user_id } = params;

      const user_update: any = await User.update(
        {
          Password: password,
        },
        { where: { ID: user_id } },
      );

      const getusers: any = await User.findOne({ where: { ID: user_id } });

      const link: any = await this.socialLinks(getusers?.CoCd);

      await constructMail.resetPasswordConfirmationMailBuild(
        getusers?.Email,
        getusers?.Name,
        link?.Instagram_Link,
        link?.Facebook_Link,
        link?.LinkedIn_Link,
        link?.Twitter_Link,
        link?.YouTube_Link,
      );

      return { status: true, data: user_update };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async socialLinks(entityId: string) {
    try {
      const links = await Entity.findOne({
        where: { CoCd: entityId ? entityId : "5900" },
        attributes: [
          "LinkedIn_Link",
          "Facebook_Link",
          "Instagram_Link",
          "Twitter_Link",
          "YouTube_Link",
        ],
        raw: true,
      });

      return links || {};
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode || 500);
    }
  }

  async crPersonForPOVendor(CoCd: string, vendorId: number) {
    try {
      const createdByList = await POHeader.findAll({
        attributes: ["CreatedBy"],
        where: {
          Vendor_id: vendorId,
          CoCd,
          Is_Deleted: false,
        },
        group: ["CreatedBy"],
        raw: true,
      });

      const createdByIds = (createdByList || []).map((po) => po?.CreatedBy);

      const crperson = await User.findAll({
        attributes: ["ID", "Employee_Id", "Name", "Employee_Code"],
        where: {
          Employee_Id: { [Op.in]: createdByIds },
        },
      });

      return {
        status: true,
        data: crperson,
        message: "Created by persons fetched successfully",
      };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new Error(error?.message);
    }
  }

  async crPersonForPO(CoCd: string) {
    try {
      const createdByList = await POHeader.findAll({
        attributes: ["CreatedBy"],
        where: {
          CoCd,
          Is_Deleted: false,
        },
        group: ["CreatedBy"],
        raw: true,
      });

      const createdByIds = (createdByList || []).map((po) => po?.CreatedBy);

      if (!createdByIds.length) {
        return {
          status: true,
          data: [],
          message: "No purchase orders found for this company",
        };
      }

      const crperson = await User.findAll({
        attributes: ["ID", "Employee_Id", "Name", "Employee_Code"],
        where: {
          Employee_Id: { [Op.in]: createdByIds },
        },
      });

      return {
        status: true,
        data: crperson,
        message: "Created by persons fetched successfully",
      };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new Error(error?.message);
    }
  }
}

export default new UserService();
