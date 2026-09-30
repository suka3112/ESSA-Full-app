import { Request, Response } from "express";

import { BaseController } from "./baseController";

class HealthCheck extends BaseController {
  /**
   * @description This is healthcheck Api
   * @param req
   * @param res
   * @returns
   */
  async healthCheck(req: any, res: any) {
    try {
      return res?.send({ message: "Health check working" });
    } catch (e) {
      return res?.send({ message: "Health check faile" });
    }
  }

  /**
   *
   * @param req
   * @param res
   * @returns
   */
  async healthCheckData(req: Request, res: Response) {
    try {
      return res?.send({ message: "Health check data working" });
    } catch (e) {
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, e),
      );
    }
  }

  /**
   *
   * @param req
   * @param res
   * @returns
   */
  async healthCheckMiddleware(req: any, res: Response) {
    try {
    } catch (e) {
      return await this.errors(
        req,
        res,
        this.status.HTTP_INTERNAL_SERVER_ERROR,
        this.exceptions.internalServerErr(req, e),
      );
    }
  }
}
export default new HealthCheck();
