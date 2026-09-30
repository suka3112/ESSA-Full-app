import { BaseController } from "../controllers/baseController";
import { User } from "../models/user";
import { Response } from "../models/response";
import { Enquiry } from "../models/enquiry";
import { Op } from "sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { UploadFiles } from "../models/uploadFiles";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import notificationService from "../helpers/notiticationService";
import constructMail from "../utils/constructMail";
import { Entity } from "../models/entity";
import userService from "./user.service";
import logger from "../utils/logger";

class ResponseService extends BaseController {
  async createResponse(data: any, userId: any, id: any, vendorId: any) {
    try {
      const enquiry = await Enquiry.findByPk(id);
      if (!enquiry) {
        throw new APIError(
          "Enquiry not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      if (!data?.message) {
        throw new APIError(
          "message is required",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const response = await Response.create({
        Enquiry_Id: id,
        Message: data?.message?.trim(),
        CreatedBy: userId,
        ModifiedBy: userId,
      });

      if (data?.Upload_files && data?.Upload_files?.length > 0) {
        const filesData = (data?.Upload_files ?? []).map((fileObj: any) => ({
          Main_Id: response?.ID,
          Category_id: FileCategories.Response,
          Attachment_type: fileObj?.Attachment_type,
          Upload_files: fileObj?.Upload_files,
        }));
        await UploadFiles.bulkCreate(filesData);
      }

      const crPersonUser = await User.findOne({
        where: { Employee_Id: enquiry?.Assigned_contact_person },
        attributes: ["ID", "Name", "Email"],
      });

      const vendorUser = await User.findOne({
        where: { Vendor_Id: enquiry?.Vendor_id },
        attributes: ["ID", "Name", "Email"],
      });

      const getEntity = await Entity.findOne({
        where: { CoCd: enquiry?.CoCd },
        attributes: ["Entity_Name", "ID", "CoCd"],
      });

      const links: any = await userService.socialLinks(enquiry?.CoCd);
      const statusMap: Record<number, string> = {
        1: "Submitted",
        2: "Under Review",
        3: "Resolved",
      };

      const statusText = statusMap[enquiry?.Enquiry_status] || "Unknown";
      if (vendorId) {
        await notificationService.createNotification({
          User_Id: crPersonUser?.ID,
          Vendor_Id: enquiry?.Vendor_id,
          Entity_Id: enquiry?.CoCd,
          Message: `Vendor has replied to Enquiry ${enquiry?.Enquiry_code}`,
          Module_Category_Id: NotificationCategory.Enquiry,
          Redirect_Id: enquiry?.ID,
          CreatedBy: userId,
        });

        await constructMail.sendResponseToCr({
          email: crPersonUser?.Email,
          user: crPersonUser?.Name,
          subject: `Vendor has replied to Enquiry`,
          enquiryRef: enquiry?.Enquiry_code,
          vendorCode: enquiry?.CoCd,
          vendorName: vendorUser?.Name,
          entityCode: getEntity?.CoCd,
          entityName: getEntity?.Entity_Name,
          linkedIn: links?.LinkedIn_Link,
          facebook: links?.Facebook_Link,
          instagram: links?.Instagram_Link,
          twitter: links?.Twitter_Link,
          youtube: links?.YouTube_Link,
        });
      } else {
        await notificationService.createNotification({
          User_Id: vendorUser?.ID,
          Vendor_Id: enquiry?.Vendor_id,
          Entity_Id: enquiry?.CoCd,
          Message: `Daikin has replied to Enquiry ${enquiry?.Enquiry_code}`,
          Module_Category_Id: NotificationCategory.Enquiry,
          Redirect_Id: enquiry?.ID,
          CreatedBy: userId,
        });

        await constructMail.sendResponseToVendor({
          email: vendorUser?.Email,
          user: vendorUser?.Name,
          subject: `Daikin has replied to Enquiry`,
          enquiryRef: enquiry?.Enquiry_code,
          vendorName: vendorUser?.Name,
          crName: crPersonUser?.Name,
          entityCode: getEntity?.CoCd,
          status: statusText,
          entityName: getEntity?.Entity_Name,
          linkedIn: links?.LinkedIn_Link,
          facebook: links?.Facebook_Link,
          instagram: links?.Instagram_Link,
          twitter: links?.Twitter_Link,
          youtube: links?.YouTube_Link,
        });
      }

      return { status: true, data: response };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getResponsesByEnquiry(enquiry_id: number, search: string = "") {
    try {
      const whereCondition: any = { enquiry_id };

      if (search?.trim()) {
        whereCondition.Message = { [Op.like]: `%${search?.trim()}%` };
      }

      const responses = await Response.findAll({
        where: whereCondition,
        include: [{ model: User, as: "responder", attributes: ["ID", "Name"] }],
        order: [["Response_Date", "DESC"]],
      });

      return { status: true, data: responses };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }
}

export default new ResponseService();
