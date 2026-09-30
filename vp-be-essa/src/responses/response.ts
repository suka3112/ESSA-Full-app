import { ResponseStatus } from "../responses/code";
import logger from "../utils/logger";

class Response {
  async success(
    req: any,
    res: any,
    status: any,
    data: any,
    message = "success",
  ) {
    try {
      if (status == ResponseStatus.HTTP_OK) {
      } else {
      }
      if (
        req?.protocol != null ||
        req?.path != null ||
        req?.originalUrl != null
      ) {
        logger.info(
          `URL : ${req?.protocol} ${req?.path ?? req?.originalUrl} success`,
        );
      }
      if (req?.value != null) {
        logger.info(`URL 3 : ${JSON.stringify(req?.value)} success`);
      }
      return res?.status(status).json({
        status,
        message,
        data,
      });
    } catch (error) {
      logger.error("Error:", error);
      return res?.status(status).json({
        status,
        message,
      });
    }
  }

  async errors(req: any, res: any, status: any, message: any) {
    try {
      return res?.status(status).json({
        status,
        message,
      });
    } catch (error) {
      logger.error("Error:", error);
      return res?.status(status).json({
        status,
        message,
      });
    }
  }

  joierrors(req: any, res: any, err: any) {
    let error = (err?.details ?? []).reduce((prev: any, curr: any) => {
      prev[curr?.path?.[0]] = curr?.message?.replace(/"/g, "");
      return prev;
    }, {});
    let message = "Bad Request";
    let status = ResponseStatus.HTTP_BAD_REQUEST;
    return res?.status(status).json({
      status,
      message,
      error,
    });
  }
}

export default new Response();
