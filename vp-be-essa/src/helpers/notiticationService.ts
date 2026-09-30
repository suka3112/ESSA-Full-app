import { BaseController } from "../controllers/baseController";
import { Notifications } from "../models/notification";
import SocketService from "../helpers/socketService";
import logger from "../utils/logger";

class NotificationService extends BaseController {
  async listNotification(limit: any, page: any, user_id: any) {
    try {
      limit = limit || 10;
      page = page || 1;

      let data: any = await Notifications.findAll({
        where: { User_Id: user_id, Is_Clear: false },
        order: [["CreatedDt", "DESC"]],
        attributes: [
          "ID",
          "User_Id",
          "Vendor_Id",
          "Entity_Id",
          "Redirect_Id",
          "Module_Category_Id",
          "Message",
          "Is_Read",
          "Is_Deleted",
          "CreatedBy",
          "CreatedDt",
          "ModifiedBy",
          "ModifiedDt",
          "Is_Clear",
        ],
      });

      if (data) {
        const countRead = (data ?? []).filter(
          (item: { Is_Read: boolean }) => item?.Is_Read === false,
        ).length;

        let result = {
          data: data,
          readCount: countRead,
        };
        return { status: true, data: result };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Error fetching SOA", error: error };
    }
  }

  async updateNotificationStatus(body: any) {
    try {
      let data: any = await Notifications.update(
        { Is_Read: body?.Is_Read },
        { where: { ID: body?.ID } },
      );

      if (data) {
        return { status: true, data: data };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Error fetching SOA", error: error };
    }
  }

  async clearNotification(body: any) {
    try {
      let data: any = await Notifications.update(
        { Is_Read: true },
        { where: { User_Id: body } },
      );

      if (data) {
        return { status: true, data: data };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Error fetching SOA", error: error };
    }
  }

  async createNotification(body: any) {
    try {
      let result: any = await Notifications.create(body);

      if (result) {
        if (body?.User_Id) {
          SocketService.sendNotificationToUser(
            body?.User_Id?.toString(),
            result,
          );
        }
        return { status: true, data: result };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Error fetching SOA", error: error };
    }
  }
}

export default new NotificationService();
