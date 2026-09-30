import { BaseController } from "./baseController";
import profileService from "../helpers/profile.service";
import userService from "../helpers/user.service";
import constructMail from "../utils/constructMail";
import crypto from "crypto";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum, StatusEnum } from "../utils/enums/status.enum";
import { NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "../utils/enums/role.enum";
import employeeService from "../helpers/employee.service";
import notificationService from "../helpers/notiticationService";
import { Vendor_onboard } from "../models/vendorOnboard";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import path from "path";
import fs from "fs";
import logger from "../utils/logger";

class ProfileController extends BaseController {
  /**
   * @description This is register vendor Api
   * @param req
   * @param res
   * @returns
   */
  async getVendor(req: any, res: any, next: NextFunction) {
    try {
      const payload = {
        id: req?.user?.id,
      };

      const vendorCheck = await profileService.getUserService(payload);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorCheck?.data,
        "Vendor fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getVendorV1(req: any, res: any, next: NextFunction) {
    try {
      let vendorCheck;

      if (req?.user?.role_id == 1) {
        const payload = {
          id: req?.user?.vendor_id,
        };
        vendorCheck = await profileService.getUserServiceV1(
          payload,
          req?.query?.entity_id,
        );
      } else if (req?.query?.vendor_id) {
        const payload = {
          id: req?.query?.vendor_id,
        };
        vendorCheck = await profileService.getUserServiceV1(
          payload,
          req?.query?.entity_id,
        );
      } else {
        const payload = {
          id: req?.user?.id,
        };
        vendorCheck = await profileService.getUser(payload);
      }

      if (req?.query?.vendor_id) {
        const payload = {
          id: req?.query?.vendor_id,
        };
        vendorCheck = await profileService.getUserServiceV1(
          payload,
          req?.query?.entity_id,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorCheck?.data,
        "Vendor fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getOnboardVendorV1(req: any, res: any, next: NextFunction) {
    try {
      const payload = {
        id: req?.query?.id,
      };

      const vendorCheck = await profileService.getOnbaordUserServiceV1(payload);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorCheck?.data,
        "Vendor fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async editVendor(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let vendorData: any, addUpdatedVendor;
      let body = req?.body || {};

      if (req?.user?.role_id == 1) {
        // Parallel execution with timeout handling
        const [vendorDataResult, draftRecord] = await Promise.all([
          profileService.fetchVendor(req?.user?.vendor_id),
          req?.user?.role_id !== 3
            ? Vendor_onboard.findOne({
              where: { ID: req?.user?.vendor_id },
              attributes: ["Status"],
            })
            : Promise.resolve(null),
        ]);

        vendorData = vendorDataResult;

        if (req?.user?.role_id !== 3 && draftRecord) {
          const allowedStatusesToEdit = [
            StatusEnum.Approved,
            StatusEnum.Rejected,
          ];
          if (!allowedStatusesToEdit.includes(draftRecord.Status)) {
            await transaction.rollback();
            return await this.errors(
              req,
              res,
              this.status.HTTP_BAD_REQUEST,
              "You have a pending update under approval. Please wait until it is approved or rejected before making further changes.",
            );
          }
        }

        // Update vendor data with timeout handling
        try {
          addUpdatedVendor = await Promise.race([
            profileService.updateUser(
              vendorData.ID,
              vendorData.Vendor_Onboard_Id,
              req?.body,
              transaction,
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Update operation timeout")),
                45000,
              ),
            ),
          ]);
        } catch (error) {
          logger.error("Error:", error);
          if (error?.message === "Update operation timeout") {
            await transaction.rollback();
            return await this.errors(
              req,
              res,
              this.status.HTTP_REQUEST_TIMEOUT,
              "The update operation is taking longer than expected. Please try again later.",
            );
          }
          throw error;
        }

        // Batch file processing - prepare all file operations
        const fileOperations = [];
        const newAttachmentUrls: string[] = [];
        const fileCategories = [
          { files: body.license_file, category: FileCategories.LicenceFile },
          { files: body.payment_file, category: FileCategories.PaymentFile },
          {
            files: body.national_file,
            category: FileCategories.NationalLicenceFile,
          },
          { files: body.vat_file, category: FileCategories.VatFile },
          { files: body.NDA_file, category: FileCategories.NDAFILE },
          { files: body.bank_file, category: FileCategories.BANKFILE },
        ];

        // Process all file categories in parallel
        for (const { files, category } of fileCategories) {
          const fileArray = Array.isArray(files) ? files : files ? [files] : [];
          if (fileArray.length > 0) {
            const fileDataArray = fileArray.map((file: any) => ({
              Main_Id: vendorData.Vendor_Onboard_Id,
              Category_id: category,
              Upload_files: file,
            }));
            newAttachmentUrls.push(...fileArray);
            fileOperations.push(
              userService.addlicenseImage(fileDataArray, transaction),
            );
          }
        }

        if (fileOperations.length > 0) {
          await Promise.all(fileOperations);
        }

        const attachmentUrls = newAttachmentUrls;
        const [uploadedFiles, CR_person] = await Promise.all([
          profileService.getUploadedFilesByMainId(
            vendorData.Vendor_Onboard_Id,
            transaction,
          ),
          employeeService.getEmployeeByIdV2(vendorData.CR_Person_Id),
        ]);

        const links: any = await userService.socialLinks(vendorData?.CoCd);

        const currentDate = new Date().toDateString();
        const messageTemplate = `Dear {{USER_NAME}}, vendor information for {{VENDOR_NAME}} has been updated on {{UPDATE_DATE}}.Please review and take appropriate action.`;
        const finalMessage = messageTemplate
          .replace("{{USER_NAME}}", CR_person?.Name)
          .replace("{{VENDOR_NAME}}", vendorData?.Vendor_Name_EN)
          .replace("{{UPDATE_DATE}}", currentDate);

        const communicationPromises = [
          constructMail.sendVendorUpdateEmail({
            email: CR_person?.Email,
            user: CR_person?.Name,
            subject: "Update on Vendor Information in the Vendor Portal",
            vendorName: vendorData?.Vendor_Name_EN,
            updateDate: currentDate,
            contactInfo: vendorData?.Daikin_Contact_Name,
            attachmentUrls,
            linkedIn: links?.LinkedIn_Link,
            facebook: links?.Facebook_Link,
            instagram: links?.Instagram_Link,
            twitter: links?.Twitter_Link,
            youtube: links?.YouTube_Link,
          }),
          notificationService.createNotification({
            User_Id: CR_person?.ID,
            Vendor_Id: req?.user?.vendor_id,
            Entity_Id: req?.body?.CoCd,
            Message: finalMessage,
            Module_Category_Id: NotificationCategory.Vendor_Update,
            Redirect_Id: vendorData?.Vendor_Onboard_Id,
            CreatedBy: req?.user?.id,
          }),
        ];

        Promise.all(communicationPromises).catch((error) => { });
      } else {
        // Handle non-role 1 users
        await profileService.updateStatus(req?.body);
      }

      await transaction.commit();

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        (addUpdatedVendor as { data?: any })?.data || [],
        "Vendor edited successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      if (transaction) {
        await transaction.rollback();
      }

      if (
        error?.message?.includes("Timeout") ||
        error?.name === "SequelizeDatabaseError"
      ) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_REQUEST_TIMEOUT,
          "Database operation timed out. Please try again later.",
        );
      }
      next(error);
    }
  }

  async addSubUser(req: any, res: any, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      let body = req?.body || {};
      if (body.Primary_User === false) {
        throw new APIError(
          "You cannot add a sub-user",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      body.Primary_User = false;

      let checkEmail = await userService.checkuserEmail(body.Email);
      if (checkEmail) {
        throw new APIError(
          "An account with this email already exists. Please invite using different email",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const password = crypto
        .randomBytes(10)
        .toString("base64")
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 10);

      const hashPassword = await bcrypt.hash(password, 10);
      body.Password = hashPassword;
      body.Vendor_Id =
        req?.user?.role_id == UserRole.VENDOR
          ? req?.user?.vendor_id
          : body.Vendor_Id;

      if (!body.Vendor_Id) throw new APIError("Vendor_Id is required");
      await userService.addUser(body, transaction);

      const link: any = userService.socialLinks(body.CoCd);

      await constructMail.NewApplicationApproval(
        body.Email,
        password,
        body.Name,
        link.Instagram_Link,
        link.Facebook_Link,
        link.LinkedIn_Link,
        link.Twitter_Link,
        link.YouTube_Link,
      );

      await transaction.commit();
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        [],
        "User Added Succesfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      next(error);
    }
  }

  async approveSubUser(req: any, res: any, next: NextFunction) {
    try {
      const { id, isApproved } = req?.body || {};
      const user = await profileService.approveSubUser(
        req?.user?.id,
        id,
        isApproved,
      );
      return await this.success(req, res, this.status.HTTP_OK, [], user?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async listSubUser(req: any, res: any) {
    try {
      const payload = req?.query;

      const vendorCheck: any = await profileService.listSubUser(payload);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorCheck?.data,
        "Vendor fetched successfully",
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

  async addEntity(req: any, res: any, next: NextFunction) {
    try {
      let findVendor = await userService.findUsers({ Email: req?.user?.email });
      if (!findVendor?.data?.Primary_User) {
        throw new APIError(
          "Access denied: Only the Primary User can update this profile.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const { entityId, crId, reason } = req?.body || {};

      let checkExtn = await profileService.checkEntity(req?.user?.vendor_id);

      if (checkExtn?.status) {
        throw new APIError(
          "Your previous extension request is still under review. Please wait until it is approved or rejected before submitting a new one.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const vendorCheck = await profileService.addEntity(
        entityId,
        crId,
        reason,
        req?.user?.id,
      );

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorCheck?.data,
        "Extension request added successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async listExtension(req: any, res: any, next: NextFunction) {
    try {
      const payload = req?.query;
      if (req?.user?.role_id === UserRole.ADMIN) {
        if (!req?.query?.Vendor_id) {
          throw new APIError(
            "vendorId is required for admin",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );
        }
      }

      if (req?.user?.role_id === UserRole.VENDOR) {
        payload.Vendor_id = req?.user?.vendor_id;
      }

      const vendorCheck: any = await profileService.listExtension(payload);

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorCheck?.data,
        "Vendor fetched successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async approveExtension(req: any, res: any, next: NextFunction) {
    try {
      const { id, isApproved, reason } = req?.body || {};
      if (!isApproved && !reason)
        throw new APIError("reason for rejection is required");
      const user = await profileService.approveExtension(
        req?.user?.id,
        id,
        isApproved,
        reason,
      );
      return await this.success(req, res, this.status.HTTP_OK, [], user?.data);
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async UpdateProfileImage(req: any, res: any, next: NextFunction) {
    try {
      let result;
      if (req?.user?.role_id == 1) {
        const { imageUrl } = req?.body || {};
        const { vendor_id } = req?.user || {};
        result = await profileService.UpdateProfileImage(vendor_id, imageUrl);
      } else {
        const imageUrl = req?.body?.imageUrl;
        const user_id = req?.user?.id;
        result = await profileService.UpdateUserProfileImage(user_id, imageUrl);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "vendor image updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async getProfileImage(req: any, res: any, next: NextFunction) {
    try {
      let result;

      if (req?.user?.role_id == 1) {
        const { vendor_id } = req?.user || {};
        result = await profileService.getProfileImage(vendor_id);
      } else {
        const user_id = req?.user?.id;
        result = await profileService.getUserProfileImage(user_id);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "vendor image updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async deleteProfileImage(req: any, res: any, next: NextFunction) {
    try {
      let result;

      if (req?.user?.role_id == 1) {
        const { vendor_id } = req?.user || {};

        result = await profileService.deleteProfileImage(vendor_id);

        const folderName = path.join(req?.user?.vendorCode, "PROFILE PICTURE");

        const targetFolderPath = path.join(
          process.env.VENDOR_FOLDER_PATH as string,
          folderName,
        );

        if (fs.existsSync(targetFolderPath)) {
          fs.rmSync(targetFolderPath, { recursive: true, force: true });
        } else {
        }
      } else {
        const user_id = req?.user?.id;
        result = await profileService.deleteUserProfileImage(user_id);
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result,
        "vendor image updated successfully",
      );
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  }

  async trackUpdates(req: any, res: any) {
    try {
      const { application_number, is_extension } = req?.body || {};
      const vendorUpdates: any = await profileService.trackUpdates(
        application_number,
        is_extension,
        req?.user?.vendor_id,
        req?.query?.entity_id,
      );
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        vendorUpdates?.data,
        is_extension
          ? "Extension status fetched successfully"
          : "Vendor updates status fetched successfully",
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
}
export default new ProfileController();
