import { BaseController } from "./baseController";
import notificationService from "../helpers/notiticationService";
import logger from "../utils/logger";
class NotificationController extends BaseController {
  async notifications(req: any, res: any) {
    try {
      let limit = req?.query?.limit ? parseInt(req?.query?.limit) : 10;
      let page = req?.query?.page ? parseInt(req?.query?.page) : 1;
      let user_id = req?.user?.id;

      const result: any = await notificationService.listNotification(
        limit,
        page,
        user_id,
      );
      if (!result) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No relevant data found",
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Notfication Fetched Successfully",
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

  async notificationsUpdate(req: any, res: any) {
    try {
      let body = req?.body;
      const result: any =
        await notificationService.updateNotificationStatus(body);
      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No updates were made",
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Notfication Status Changes Successfully",
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

  async clearNotification(req: any, res: any) {
    try {
      let body = req?.user?.id;
      const result: any = await notificationService.clearNotification(body);
      if (!result?.status) {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          [],
          "No updates were made",
        );
      }
      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        result?.data,
        "Notfication Status Changes Successfully",
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

  async createNotification(req: any, res: any) {
    try {
      const result = await notificationService.createNotification(req?.body);

      if (result?.status) {
        return this.success(
          req,
          res,
          this.status.HTTP_OK,
          result?.data,
          "Notification created successfully",
        );
      } else {
        return this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to create notification",
        );
      }
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
}

export default new NotificationController();
