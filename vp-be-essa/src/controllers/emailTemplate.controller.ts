import { NextFunction } from "express";
import { BaseController } from "./baseController";
import emailTemplateService, {
  TemplateProblemsError,
} from "../helpers/emailTemplate.service";
import logger from "../utils/logger";

class EmailTemplateController extends BaseController {
  private userId(req: any): number {
    return Number(req?.user?.id) || 0;
  }

  private handle(error: any, res: any, next: NextFunction) {
    if (error instanceof TemplateProblemsError) {
      return res.status(400).json({ problems: error.problems });
    }
    logger.error("Error:", error);
    next(error);
  }

  async list(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.list(req.query || {});
      return this.success(req, res, this.status.HTTP_OK, data, "Email templates retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async getById(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.getById(req.params.id);
      return this.success(req, res, this.status.HTTP_OK, data, "Email template retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async preview(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.preview(req.body || {});
      return this.success(req, res, this.status.HTTP_OK, data, "Preview rendered");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async create(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.create(req.body || {}, this.userId(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "Email template created");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async update(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.update(
        req.params.id,
        req.body || {},
        this.userId(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Email template updated");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async duplicate(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.duplicate(req.params.id, this.userId(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "Email template duplicated");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async setStatus(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.setStatus(
        req.params.id,
        req.body?.status,
        this.userId(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Email template status updated");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async remove(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.remove(req.params.id, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Email template deleted");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async restore(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.restore(
        req.params.id,
        req.body?.versionId,
        this.userId(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "Email template restored");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async testSend(req: any, res: any, next: NextFunction) {
    try {
      const data = await emailTemplateService.testSend(req.params.id, this.userId(req));
      return this.success(req, res, this.status.HTTP_OK, data, "Test email sent");
    } catch (error) {
      this.handle(error, res, next);
    }
  }
}

export default new EmailTemplateController();
