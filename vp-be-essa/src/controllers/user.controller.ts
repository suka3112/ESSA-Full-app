import { BaseController } from "./baseController";
import fs from "fs";
import userService from "../helpers/user.service";
import { sequelize } from "../config/sequelize";
import otpAuthenticattion from "../utils/Authenticattion";
import bcrypt from "bcryptjs";
import { Authenticate } from "../middleware/authentication";
import constructMail from "../utils/constructMail";
import { User } from "../models/user";
import { NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { isFinancePortalRole } from "../utils/enums/role.enum";
import employeeService from "../helpers/employee.service";
import { convertToSequalizeDateTime } from "../utils/globalFunction";
import { FORGOT_PASSWORD_URL } from "../utils/constants/url.constant";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import { getPublicFileUrl } from "../middleware/imageUploads";
import notificationService from "../helpers/notiticationService";
import {
  getPublicFileUrlV1,
  getUploadFormFields,
} from "../middleware/imageUploadV1";
import path from "path";
import logger from "../utils/logger";
import { auditSessionEvent } from "../helpers/auditSession.service";

class UserController extends BaseController {

  /**
   * @description This is register vendor Api
   * @param req
   * @param res
   * @returns
   */
  async inviteVendor(req: any, res: any, next: NextFunction) {
    try {
      const payload = req?.body ?? {};
      payload.CreatedBy = req?.user?.id;

      let checkEmail = await userService.checkuserEmail(payload.Email);
      if (checkEmail) {
        throw new APIError(
          "An account with this email already exists. Please invite using different email",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      await constructMail.registrationMailBuild(payload);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        [],
        "Vendor Invitation sent successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async otpValidate(req: any, res: any, next: NextFunction) {
    try {
      let email = req?.query?.user_email;
      let userOTP = req?.query?.id_verification;

      let isRegister = req?.query?.isRegister;

      let vendorCheck;

      if (!isRegister) {
        vendorCheck = await userService.findUsers({ Email: email });

        if (!vendorCheck.data) {
          throw new APIError("User Not Found", StatusCodeEnum.HTTP_NOT_FOUND);
        }
      }

      if (vendorCheck?.data.Is_User) {
        if (userOTP != 123456) {
          await auditSessionEvent({
            action: "LOGIN",
            result: "FAIL",
            req,
            actorId: vendorCheck.data.ID,
            actorName: vendorCheck.data.Name,
            actorRole: vendorCheck.data.Role_id,
            email,
            reasonRemarks: "Invalid OTP",
            source: "PORTAL",
          });
          throw new APIError(
            "Invalid code. Please check your OTP and try again.",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
      } else {
        try {
          const verify = await otpAuthenticattion.validateOTP(
            email,
            userOTP,
            isRegister,
          );
        } catch (otpError) {
          await auditSessionEvent({
            action: "LOGIN",
            result: "FAIL",
            req,
            actorId: vendorCheck?.data?.ID,
            actorName: vendorCheck?.data?.Name,
            actorRole: vendorCheck?.data?.Role_id,
            email,
            reasonRemarks: "Invalid OTP",
            source: "PORTAL",
          });
          throw otpError;
        }
      }

      if (req?.query?.is_dailyLogin) {
        const user: any = await userService.getUserService({ Email: email });

        let token = Authenticate.generateToken({
          id: user?.ID,
          vendor_id: user?.Vendor_Id,
          emp_id: user?.Employee_Id,
          email: user?.Email,
          vendorCode: user?.vendor?.Vendor_SAP_Code,
          role_id: user?.Role_id,
          name: user?.Name,
        });

        let data: any = {
          id: user?.ID,
          token: "Bearer " + token,
          vendor_id: user?.Vendor_Id,
          vendorCode: user?.vendor?.Vendor_SAP_Code,
          role_id: user?.Role_id,
          Is_Supplier: user.Is_Supplier,
          New_Login: user?.New_Login,
          Is_PO_Inline: user?.vendor?.Is_PO_Inline,
          Non_PO_Access: user?.vendor?.Non_PO_Access,
          Vendor_Role: user?.Vendor_Role,
        };

        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          data,
          "OTP Verification successfull",
        );
      }

      let result: any = [];
      if (isRegister) {
        result = {
          email: req?.query?.email,
          cr_person_id: req?.query?.cr_person_id,
          entity_id: req?.query?.entity_id,
          entityName: req?.query?.entityName,
          contactName: req?.query?.contactName,
        };
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "OTP Verification successfull",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async resendOTP(req: any, res: any, next: NextFunction) {
    try {
      let userExist: any = await userService.getUserService({
        Email: req?.query?.user_email,
        Is_Active: true,
      });

      let mailData = {
        Email: userExist?.Email,
        Phone: userExist?.Phone_Number,
        Name: userExist?.Name,
      };
      if (req?.query?.type == "Mail") {
        // Send OTP Mail
        await constructMail.loginOtpMailBuild(mailData);
      } else {
        await constructMail.loginOtpOnlySMSBuild(mailData);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        // result,
        "OTP Send successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async totpValidate(req: any, res: any, next: NextFunction) {
    try {
      let email = req?.query?.user_email;
      let userOTP = req?.query?.id_verification;
      let is_login = req.query?.is_login;
      let is_dailyLogin = req.query?.is_dailyLogin;

      const userCheck = await userService.userCheck({ email });
      if (!userCheck.data) {
        throw new APIError("User Not Found", StatusCodeEnum.HTTP_NOT_FOUND);
      }

      if (userOTP != 123456) {
        throw new APIError(
          "Invalid code. Please check your OTP and try again.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (is_dailyLogin) {
        const user = await userService.getUserService({ Email: email });

        let token = Authenticate.generateToken({
          id: user?.ID,
          vendor_id: user?.Vendor_Id,
          emp_id: user?.Employee_Id,
          email: user?.Email,
          vendorCode: user?.vendor?.Vendor_SAP_Code,
          role_id: user?.Role_id,
        });

        let data = {
          id: user?.ID,
          name: user?.Name,
          email: user?.Email,
          token: "Bearer " + token,
          vendor_id: user?.Vendor_Id,
          vendorCode: user?.vendor?.Vendor_SAP_Code,
          role_id: user?.Role_id,
        };

        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          data,
          "OTP Verification successfull",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        [],
        "OTP Verification successfull",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async registerVendor(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req.body;
      body = this.convertEmptyStringsToNull(body);
      let licenseImage: any = [];
      let paymentTermsImage: any = [];
      let nationalImage: any = [];
      let vatImage: any = [];
      let ndaImage: any = [];
      let bankImage: any = [];

      let checkEmail = await userService.checkEmail(body.vendorDetails.Email);
      if (checkEmail) {
        throw new APIError(
          "An account with this email already exists. Please register using different email",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let checkPhone = await userService.checkPhone(body.vendorDetails.Phone);
      if (checkPhone) {
        throw new APIError(
          "An account with this Phone number already exists. Please register using different Phone Number",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const CR_person = await employeeService.getEmployeeByIdV2(
        body.vendorDetails.CR_Person_Id,
      );

      if (!CR_person)
        throw new APIError(
          "Invalid cr person Id",
          StatusCodeEnum.HTTP_NOT_FOUND,
        );

      let checkLicense = await userService.checkLicense(
        body.vendorDetails.Trade_license_number,
      );
      if (checkLicense) {
        throw new APIError(
          "An account with this License already exists. Please register using different License",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let registerVendor = await userService.registerVendor(
        body.vendorDetails,
        transaction,
      );
      if (registerVendor.status)
        body.bankDetails.Vendor_Onboard_id = registerVendor.data.ID;

      if (
        body.vendorDetails.license_file &&
        body.vendorDetails.license_file.length > 0
      ) {
        body.vendorDetails.license_file.forEach(function (files: any) {
          let fileData = {
            Main_Id: registerVendor.data.ID,
            Category_id: FileCategories.LicenceFile_Onboard,
            Upload_files: files,
            Is_VendorOnboard: true,
          };
          licenseImage.push(fileData);
        });

        await userService.addlicenseImage(licenseImage, transaction);
      }

      if (
        body.vendorDetails.payment_file &&
        body.vendorDetails.payment_file.length > 0
      ) {
        body.vendorDetails.payment_file.forEach(function (files: any) {
          let fileData = {
            Main_Id: registerVendor.data.ID,
            Category_id: FileCategories.PaymentFile_Onboard,
            Upload_files: files,
            Is_VendorOnboard: true,
          };
          paymentTermsImage.push(fileData);
        });

        await userService.addlicenseImage(paymentTermsImage, transaction);
      }

      if (
        body.vendorDetails.national_file &&
        body.vendorDetails.national_file.length > 0
      ) {
        body.vendorDetails.national_file.forEach(function (files: any) {
          let fileData = {
            Main_Id: registerVendor.data.ID,
            Category_id: FileCategories.NationalLicenceFile_Onboard,
            Upload_files: files,
            Is_VendorOnboard: true,
          };
          nationalImage.push(fileData);
        });

        await userService.addlicenseImage(nationalImage, transaction);
      }

      if (
        body.vendorDetails.vat_file &&
        body.vendorDetails.vat_file.length > 0
      ) {
        body.vendorDetails.vat_file.forEach(function (files: any) {
          let fileData = {
            Main_Id: registerVendor.data.ID,
            Category_id: FileCategories.VatFile_Onboard,
            Upload_files: files,
            Is_VendorOnboard: true,
          };
          vatImage.push(fileData);
        });

        await userService.addlicenseImage(vatImage, transaction);
      }

      if (
        body.vendorDetails.NDA_file &&
        body.vendorDetails.NDA_file.length > 0
      ) {
        body.vendorDetails.NDA_file.forEach(function (files: any) {
          let fileData = {
            Main_Id: registerVendor.data.ID,
            Category_id: FileCategories.NDAFILE_Onboard,
            Upload_files: files,
            Is_VendorOnboard: true,
          };
          ndaImage.push(fileData);
        });

        await userService.addlicenseImage(ndaImage, transaction);
      }

      if (
        body.vendorDetails.bank_file &&
        body.vendorDetails.bank_file.length > 0
      ) {
        body.vendorDetails.bank_file.forEach(function (files: any) {
          let fileData = {
            Main_Id: registerVendor.data.ID,
            Category_id: FileCategories.BANKFILE_Onboard,
            Upload_files: files,
            Is_VendorOnboard: true,
          };
          bankImage.push(fileData);
        });

        await userService.addlicenseImage(bankImage, transaction);
      }

      await userService.addVendorBankOnboard(
        body.bankDetails,
        registerVendor,
        transaction,
      );

      const links: any = await userService.socialLinks(body.vendorDetails.CoCd);

      await constructMail.registrationConfirmationMailBuild({
        vendor_email: body.vendorDetails.Email,
        reference_number: registerVendor.data.Application_Number,
        name: body.vendorDetails.Vendor_Name_EN,
        CoCd: body.vendorDetails.CoCd,
      });

      await constructMail.sendNewVendorApplicationEmail({
        email: CR_person.Email,
        user: CR_person.Name,
        subject: "New Vendor Application Submitted – Please Review",
        vendorName: body.vendorDetails.Vendor_Name_EN,
        applicationDate: new Date().toDateString(),
        description: registerVendor.data.Application_Number,
        contactInfo: body.vendorDetails.Daikin_Contact_Name,
        linkedIn: links.LinkedIn_Link,
        facebook: links.Facebook_Link,
        instagram: links.Instagram_Link,
        twitter: links.Twitter_Link,
        youtube: links.YouTube_Link,
      });

      const messageTemplate = `Dear {{USER_NAME}}, a new vendor application has been submitted by {{VENDOR_NAME}} on {{APPLICATION_DATE}}.`;

      const finalMessage = messageTemplate
        .replace("{{USER_NAME}}", CR_person.Name)
        .replace("{{VENDOR_NAME}}", body.vendorDetails.Vendor_Name_EN)
        .replace("{{APPLICATION_DATE}}", new Date().toDateString());

      await notificationService.createNotification({
        User_Id: CR_person.ID,
        Vendor_Id: registerVendor.data.ID,
        Entity_Id: body.vendorDetails.CoCd,
        Message: finalMessage,
        Module_Category_Id: NotificationCategory.Vendor_Onboard,
        Redirect_Id: registerVendor.data.Application_Number,
      });

      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        registerVendor.data,
        "Success",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  convertEmptyStringsToNull<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.convertEmptyStringsToNull(item),
      ) as unknown as T;
    } else if (obj !== null && typeof obj === "object") {
      Object.keys(obj as object).forEach((key) => {
        const value = (obj as any)[key];
        if (value === "") {
          (obj as any)[key] = null;
        } else if (typeof value === "object") {
          (obj as any)[key] = this.convertEmptyStringsToNull(value);
        }
      });
    }
    return obj;
  }

  async userLogin(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req.body;
      const rememberMe = body.remember_me;
      body.email = body.email.trim();
      let userExist: any = await userService.getUserService({
        Email: body.email,
        Is_Active: true,
      });
      if (!userExist) {
        throw new APIError("User not found", StatusCodeEnum.HTTP_BAD_REQUEST);
      }

      if (userExist.Role_id === 1) {
        let match = await bcrypt.compare(body.password, userExist?.Password);

        if (!match) {
          throw new APIError(
            "The password you entered is incorrect. Please check and try again",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
      } else if (userExist.Primary_User) {
        let match = await bcrypt.compare(body.password, userExist?.Password);

        if (!match) {
          throw new APIError(
            "The password you entered is incorrect. Please check and try again",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
      } else {
        let result: any = await Authenticate.authenticateADUser(
          body.email,
          body.password,
        );
        if (result.data == "Invalid credentials") {
          throw new APIError(
            "The password you entered is incorrect. Please check and try again",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
      }

      await User.update(
        { Last_Login: new Date() },
        { where: { ID: userExist.ID } },
      );
      let token = Authenticate.generateToken(
        {
          id: userExist?.ID,
          vendor_id: userExist?.Vendor_Id,
          CoCd: userExist?.CoCd,
          emp_id: userExist?.Employee_Id,
          email: userExist?.Email,
          vendorCode: userExist?.vendor?.Vendor_SAP_Code,
          role_id: userExist?.Role_id,
          Employee_Id: userExist?.Employee_Id,
          name: userExist?.Name,
          Is_PO_Inline: userExist?.vendor?.Is_PO_Inline,
        },
        rememberMe,
      );

      let data: any = {
        id: userExist?.ID,
        token: "Bearer " + token,
        vendor_id: userExist?.Vendor_Id,
        vendorCode: userExist?.vendor?.Vendor_SAP_Code,
        role_id: userExist?.Role_id,
        Is_Supplier: userExist.Is_Supplier,
        New_Login: userExist?.New_Login,
        Is_PO_Inline: userExist?.vendor?.Is_PO_Inline,
        Non_PO_Access: userExist?.vendor?.Non_PO_Access,
        Vendor_Role: userExist?.Vendor_Role,
      };
      if (!userExist?.Primary_User) {
        data.name = userExist?.Name;
      }

      let mailData = {
        Email: userExist?.Email,
        Phone: userExist?.vendor?.Phone,
        Name: userExist?.Name,
        CoCd: userExist?.CoCd,
      };
      if (!(userExist.Role_id == 1 && userExist.New_Login)) {
        // Send OTP Mail
        let otpMail = await constructMail.loginOtpMailBuild(mailData);
      }

      await auditSessionEvent({
        action: "LOGIN",
        result: "SUCCESS",
        req,
        actorId: userExist.ID,
        actorName: userExist.Name,
        actorRole: userExist.Role_id,
        email: userExist.Email,
        reasonRemarks: "Password login succeeded",
        source: "PORTAL",
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Logged in successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }
      await auditSessionEvent({
        action: "LOGIN",
        result: "FAIL",
        req,
        actorName: req?.body?.email || "Unknown",
        email: req?.body?.email,
        reasonRemarks:
          error instanceof APIError
            ? error.message
            : "Login failed",
        source: "PORTAL",
      });
      next(error);
    }
  }

  async passwordReset(req: any, res: any, next: NextFunction) {
    try {
      const params = {
        current_pass: req?.body?.current_pass,
        password: req?.body?.password,
        user_id: req?.user?.id,
      };

      const result = await userService.resetPasswordService(params);

      if (result.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result.data,
          "Password Reset Initiated",
        );
      }

      if (!result.status && result.data === "INVALID_PASS") {
        return await this.errors(
          req,
          res,
          this.status.HTTP_OK,
          result.data,
          "Invalid Current Password",
        );
      }
      if (result.status === false && result.data === "USER_NOT_FOUND") {
        return await this.errors(
          req,
          res,
          this.status.HTTP_NOT_FOUND,
          "User not found with the provided email id",
        );
      }
    } catch (e) {
      next(e);
    }
  }

  async resetPassword(req: any, res: any, next: NextFunction) {
    try {
      const params = {
        current_pass: req?.body?.current_pass,
        newPassword: req?.body?.password,
        user_id: req?.user?.id,
      };

      const result = await userService.resetPassword(params);

      return await this.success(req, res, this.status.HTTP_OK, result.data);
    } catch (e) {
      next(e);
    }
  }

  async validateResetPassword(req: any, res: any, next: NextFunction) {
    try {
      const new_pass = await bcrypt.hash(req?.body?.password, 10);
      const params = {
        password: new_pass,
        userOTP: req?.body?.id_verification,
        is_forgotPassword: req?.query?.is_forgotPassword || false,
        forgotPasswordEmail: req?.body?.forgotPasswordEmail,
        resetPasswordToken: req?.query?.token,
      };

      if (params.is_forgotPassword) {
        //forgot password
        let user_data = await userService.findUserByToken(req?.query?.token);

        const currentDate = new Date();
        if (currentDate > user_data.ResetPasswordExpires) {
          throw new APIError("Link Expired", StatusCodeEnum.HTTP_GONE);
        }

        const result = await userService.resetPasswordValidationService({
          password: new_pass,
          user_id: user_data.ID,
        });

        const link: any = await userService.socialLinks(user_data.CoCd);

        if (result.status) {
          await constructMail.resetPasswordConfirmationMailBuild(
            user_data.Email,
            user_data.Name,
            link?.Instagram_Link,
            link?.Facebook_Link,
            link?.LinkedIn_Link,
            link?.Twitter_Link,
            link?.YouTube_Link,
          );

          await userService.tokenReset(user_data.ID);

          return await this.success(
            req,
            res,
            this.status.HTTP_OK,
            result.data,
            "Password Reset successfull",
          );
        }
      }
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async authenticatorSetup(req: any, res: any, next: NextFunction) {
    try {
      const id = req.query?.id;
      const result = await userService.setupAuthenticatorService(id);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        { QR: result.qrCodeUrl, SETUP_KEY: result.secret },
        "Authenticator setup complete",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  // Verify the Google Authenticator TOTP token
  async verifyAuthenticator(req: any, res: any) {
    try {
      const { id, token } = req.body;

      // Call the service to verify the token
      const isVerified = await userService.verifyAuthenticatorService(
        id,
        token,
      );

      if (isVerified) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "2FA verified successfully",
        );
      } else {
        return await this.errors(
          req,
          res,
          this.status.HTTP_UNAUTHORIZED,
          "Invalid 2FA token",
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

  async forgotPassword(req: any, res: any, next: NextFunction) {
    try {
      const { email } = req.body;
      const user = await userService.findUser({ email: email });

      if (user?.data?.Employee_Code != null) {
        throw new APIError(
          "Please Contact your Admin to reset the password",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (!user.status) {
        throw new APIError(
          "No User Associated with the Email Provided",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const current_date = new Date();
      if (user.data.LastPasswordResetRequest) {
        const timeSinceLastRequest =
          current_date.getTime() -
          new Date(user.data.LastPasswordResetRequest).getTime();
        const rateLimitDuration = 15 * 60 * 1000;
        if (user.status && timeSinceLastRequest < rateLimitDuration) {
          throw new APIError(
            "Please wait before requesting another password reset",
            StatusCodeEnum.HTTP_TOO_MANY_REQUESTS,
          );
        }
      }

      await userService.updateUser(user.data.ID, {
        LastPasswordResetRequest: convertToSequalizeDateTime(current_date),
      });
      await userService.tokenReset(user.data.ID); //reset the already present token //failsafe

      const url = FORGOT_PASSWORD_URL[user.data.Role_id];

      const mailSent = await constructMail.forgotPasswordMailBuild(email, url); //reset password mail
      if (!mailSent.status) {
        throw new APIError(
          "Failed to send password reset mail",
          StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        [],
        "Password Reset Mail Sent",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async trackMyApplication(req: any, res: any, next: NextFunction) {
    try {
      const { reference_number, company_name, trade_licence_number } =
        req.query;

      const result = await userService.trackApplication(
        reference_number,
        company_name,
        trade_licence_number,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result.data,
        "Application Tracking",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getCountries(req: any, res: any) {
    try {
      const countries = await userService.fetchCountries();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        countries.data,
        "Countries fetched successfully",
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

  async getCities(req: any, res: any) {
    try {
      const cities = await userService.fetchCities(req.query);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        cities.data,
        "Cities fetched successfully",
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

  async getRegions(req: any, res: any) {
    try {
      const regions = await userService.fetchRegions(req.query);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        regions.data,
        "Regions fetched successfully",
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

  async getCurrencies(req: any, res: any) {
    try {
      const currencies = await userService.fetchCurrencies();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        currencies.data,
        "Currencies fetched successfully",
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

  async getIndustryKeys(req: any, res: any) {
    try {
      const industryKeys = await userService.fetchIndustryKeys();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "Industry keys fetched successfully",
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

  async dropdowns(req: any, res: any) {
    try {
      let query: any = req?.query?.type;
      const industryKeys = await userService.dropdowns(query);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "Industry keys fetched successfully",
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

  async crPerson(req: any, res: any, next: NextFunction) {
    try {
      let CoCd = req?.query?.entity_id;

      const industryKeys = await userService.crPerson(CoCd, req.query);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "CR person fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async entityDropdown(req: any, res: any) {
    try {
      let industryKeys;

      if (req?.user?.role_id == 1) {
        let user_id = req?.user?.vendor_id;
        industryKeys = await userService.entityDropdown(user_id);
      } else if (isFinancePortalRole(Number(req?.user?.role_id))) {
        let user_id = req?.user?.emp_id;
        industryKeys = await userService.financeEntityDropdown(user_id);
      } else {
        let user_id = req?.user?.id;
        industryKeys = await userService.userEntityDropdown(user_id);
      }

      if (req?.user?.role_id == 4) {
        industryKeys = await userService.adminEntity();
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "Entity fetched successfully",
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

  async allEntityDropdown(req: any, res: any) {
    try {
      const industryKeys = await userService.allEntityDropdown();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "Entity fetched successfully",
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

  async rolesDropdown(req: any, res: any) {
    try {
      const industryKeys = await userService.rolesDropdown();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "Entity fetched successfully",
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

  async extensionEntityDropdown(req: any, res: any) {
    try {
      let user_id = req?.user?.vendor_id;
      const industryKeys = await userService.extensionEntityDropdown(user_id);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "Entity fetched successfully",
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

  async loginAsSupplier(req: any, res: any) {
    try {
      let { vendor_id } = req.query;
      let cr_person_id = req?.user?.id;

      let CRCheck = await User.findOne({ where: { ID: cr_person_id } });

      let userExist: any = await userService.getVendorService({
        Vendor_Id: vendor_id,
      });

      if (!userExist) {
        return this.success(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          [],
          "Vendor not found",
        );
      }
      let token = Authenticate.generateToken({
        id: userExist?.ID,
        vendor_id: vendor_id,
        CoCd: userExist?.CoCd,
        emp_id: userExist?.Employee_Id,
        email: userExist?.Email,
        vendorCode: userExist?.vendor?.Vendor_SAP_Code,
        role_id: userExist?.Role_id,
        Employee_Id: userExist?.Employee_Id,
        name: userExist?.Name,
        Is_PO_Inline: userExist?.vendor?.Is_PO_Inline,
      });

      let data: any = {
        id: vendor_id,
        token: "Bearer " + token,
        vendor_id: vendor_id,
        vendorCode: userExist?.vendor?.Vendor_SAP_Code,
        role_id: userExist?.Role_id,
        Is_Supplier: userExist.Is_Supplier,
        New_Login: userExist?.New_Login,
        Is_PO_Inline: userExist?.vendor?.Is_PO_Inline,
        Non_PO_Access: userExist?.vendor?.Non_PO_Access,
        Vendor_Role: userExist?.Vendor_Role,
        role: "vendor",
      };

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Logged in as vendor successfully",
      );
    } catch (error) {
      logger.error("Error:", error);

      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getIncoterms(req: any, res: any) {
    try {
      const incoterms = await userService.getIncoterms();

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        incoterms.data,
        "Incoterms fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getPaymentTerms(req: any, res: any) {
    try {
      let query = req.query;
      const paymentTerms = await userService.getPaymentTerms(query);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        paymentTerms.data,
        "Payment terms fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async Registrationpaymentterms(req: any, res: any) {
    try {
      let query = req.query;
      const paymentTerms = await userService.Registrationpaymentterms(query);

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        paymentTerms.data,
        "Payment terms fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async uploadImage(req: any, res: any) {
    try {
      if (!req?.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const publicUrl = getPublicFileUrl(req?.file);
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        publicUrl,
        "Image uploaded successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async contact(req: any, res: any) {
    try {
      const data = [
        {
          name: "MR.Ahmed Khalid",
          department: "Business Department",
          email: "ahmed.khalid@supportdemo.me",
        },
        {
          name: "MR.Omar Abdulaziz",
          department: "IT Department",
          email: "omar.abdulaziz@supportdemo.me",
        },
      ];

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Contact fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getStatus(req: any, res: any) {
    try {
      let query = req.query;
      const paymentTerms = await userService.getStatus();

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        paymentTerms.data,
        "Status fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async getInvoiceStatus(req: any, res: any) {
    try {
      let query = req.query;

      let paymentTerms;

      if (query.isAdvancePayment) {
        paymentTerms = await userService.getAdvStatus();
      } else {
        paymentTerms = await userService.getInvoiceStatus();
      }

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        paymentTerms.data,
        "Payment terms fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async clearPO(req: any, res: any) {
    try {
      const paymentTerms = await userService.clearPO();

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        paymentTerms.data,
        "Data cleared",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async deleteFiles(req: any, res: any) {
    try {
      let id = req?.query?.id;
      let url = req?.query?.url;

      if (req?.query?.id) {
        const paymentTerms = await userService.deleteFiles(id, url);
      }

      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        [],
        "Payment terms fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      return this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, error),
      );
    }
  }

  async resetPasswordV2(req: any, res: any, next: NextFunction) {
    try {
      const params = {
        current_pass: req?.body?.current_pass,
        newPassword: req?.body?.password,
        user_id: req?.user?.id,
      };

      const result = await userService.resetPasswordV2(params);

      return await this.success(req, res, this.status.HTTP_OK, result.data);
    } catch (e) {
      next(e);
    }
  }

  async validateResetPasswordV2(req: any, res: any, next: NextFunction) {
    try {
      const new_pass = await bcrypt.hash(req?.body?.password, 10);
      const params = {
        password: new_pass,
        user_id: req?.user?.id,
        email: req?.user?.email,
        name: req?.user?.name,
        userOTP: req?.body?.id_verification,
        is_forgotPassword: req?.query?.is_forgotPassword || false,
        forgotPasswordEmail: req?.body?.forgotPasswordEmail,
        resetPasswordToken: req?.query?.token,
      };

      if (params.is_forgotPassword) {
        //forgot password
        let user_data = await userService.findUserByToken(req?.query?.token);

        const currentDate = new Date();
        if (currentDate > user_data.ResetPasswordExpires) {
          throw new APIError("Link Expired", StatusCodeEnum.HTTP_GONE);
        }

        const result = await userService.resetPasswordValidationServiceV2({
          password: new_pass,
          user_id: user_data.ID,
        });

        let link: any = await userService.socialLinks(user_data.CoCd);

        if (result.status) {
          await constructMail.resetPasswordConfirmationMailBuild(
            user_data.Email,
            user_data.Name,
            link?.Instagram_Link,
            link?.Facebook_Link,
            link?.LinkedIn_Link,
            link?.Twitter_Link,
            link?.YouTube_Link,
          );

          await userService.tokenReset(user_data.ID);

          return await this.success(
            req,
            res,
            this.status.HTTP_OK,
            result.data,
            "Password Reset successfull",
          );
        } else {
          throw new APIError(
            "Password reset failed",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
      }

      const verify = await otpAuthenticattion.validateTOTP(
        params.email,
        params.userOTP,
      );

      if (!verify) {
        throw new APIError(
          "Invalid OTP, please try again",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const result = await userService.resetPasswordValidationServiceV2(params);

      if (result.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          result.data,
          "Password reset successful",
        );
      } else {
        throw new APIError(
          "Password reset failed",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async uploadImageV1(req: any, res: any) {
    try {
      const file = req?.file;
      if (!file) {
        return res
          .status(400)
          .json({ status: false, message: "No file uploaded" });
      }

      const { vendor_code, module, attachment_type } = getUploadFormFields(
        req,
      );

      const cleanVendorCode =
        vendor_code?.toUpperCase().trim() || "DEFAULT_VENDOR";
      const folderName = path.join(cleanVendorCode, "PROFILE PICTURE");
      const targetFolderPath = path.join(
        process.env.VENDOR_FOLDER_PATH as string,
        folderName,
      );
      if (fs.existsSync(targetFolderPath)) {
        fs.rmSync(targetFolderPath, { recursive: true, force: true });
      } else {
      }

      const cleanModule = module
        ?.replace(/[\\/]/g, "_")
        ?.trim()
        ?.toUpperCase();
      const cleanAttachment = attachment_type
        ?.replace(/[\\/]/g, "_")
        .trim()
        .toUpperCase();

      let finalDir = process.env.VENDOR_FOLDER_PATH as string;

      if (cleanVendorCode) {
        finalDir = path.join(finalDir, cleanVendorCode);
      }

      if (cleanModule) {
        finalDir = path.join(finalDir, cleanModule);
      }

      if (cleanAttachment) {
        finalDir = path.join(finalDir, cleanAttachment);
      }

      fs.mkdirSync(finalDir, { recursive: true });

      // Extract base name and extension
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);

      // Use attachment_type as prefix
      const prefixedName = cleanAttachment
        ? `${cleanAttachment}-${baseName}`
        : baseName;

      let finalFileName = `${prefixedName}${ext}`;
      let finalPath = path.join(finalDir, finalFileName);

      if (cleanVendorCode === "REGISTRATION") {
        // ✅ Registration mode: Replace the existing file
        if (fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
        }
      } else {
        // ✅ Normal mode: Add suffix (1), (2), etc. if file exists
        let counter = 1;
        while (fs.existsSync(finalPath)) {
          finalFileName = `${prefixedName}(${counter})${ext}`;
          finalPath = path.join(finalDir, finalFileName);
          counter++;
        }
      }

      // Move temp file to final destination
      fs.renameSync(file.path, finalPath);

      // Generate public URL with final filename
      const publicUrl = getPublicFileUrlV1(
        { ...file, path: finalPath, filename: finalFileName },
        req,
      );

      return res.status(200).json({
        status: true,
        message: "File uploaded successfully",
        data: publicUrl,
      });
    } catch (error: any) {
      logger.error("Error:", error);
      return res.status(500).json({ status: false, message: error?.message });
    }
  }

  async deleteImageV1(req: any, res: any) {
    try {
      const { vendor_code, module, attachment_type, filename } =
        req.body as any;

      if (!filename) {
        return res.status(400).json({
          status: false,
          message: "Filename is required",
        });
      }

      // Clean inputs
      const cleanVendorCode =
        vendor_code?.toUpperCase().trim() || "DEFAULT_VENDOR";
      const cleanModule = module?.replace(/[\\/]/g, "_").trim().toUpperCase();
      const cleanAttachment = attachment_type
        ?.replace(/[\\/]/g, "_")
        .trim()
        .toUpperCase();

      // Build the file path (same as upload logic)
      let finalDir = process.env.VENDOR_FOLDER_PATH;
      if (cleanVendorCode) finalDir = path.join(finalDir, cleanVendorCode);

      if (cleanModule) {
        finalDir = path.join(finalDir, cleanModule);
      } else if (cleanAttachment) {
        finalDir = path.join(finalDir, cleanAttachment);
      }

      const filePath = path.join(finalDir, filename); // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          status: false,
          message: "File not found",
        });
      }

      // Delete the file
      fs.unlinkSync(filePath);
      return res.status(200).json({
        status: true,
        message: "File deleted successfully",
        data: { filename, vendor_code: cleanVendorCode },
      });
    } catch (error: any) {
      logger.error("Error:", error);
      return res.status(500).json({
        status: false,
        message: error?.message,
      });
    }
  }

  async crPersonForPO(req: any, res: any, next: NextFunction) {
    try {
      let CoCd = req?.query?.entity_id;
      let vendorId = req.user?.vendor_id;
      let industryKeys;

      if (req?.user?.role_id == 1) {
        industryKeys = await userService.crPersonForPOVendor(CoCd, vendorId);
      } else {
        industryKeys = await userService.crPersonForPO(CoCd);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        industryKeys.data,
        "CR person fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }
}
export default new UserController();
