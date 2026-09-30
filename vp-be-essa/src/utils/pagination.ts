import { BaseController } from "../controllers/baseController";
import logger from "./logger";

class Pagination extends BaseController {
  //module.exports = {
  paginationData(limit: any, page: any, data: any) {
    try {
      return {
        results: data?.rows,
        total: data?.count,
        pageMeta: {
          page: page,
          pageCount: Math.ceil(data?.count / limit),
          nextPage: page >= Math.ceil(data?.count / limit) ? null : page + 1,
          pageSize: limit,
          total: data?.count,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
    }
  }

  paginationRawData(limit: any, page: any, data: any, metadata: any) {
    try {
      return {
        results: data,
        total: metadata,
        pageMeta: {
          page: page,
          pageCount: Math?.ceil(data?.count / limit),
          nextPage: page >= Math?.ceil(data?.count / limit) ? null : page + 1,
          pageSize: limit,
          total: data?.count,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
    }
  }
}

export default new Pagination();
