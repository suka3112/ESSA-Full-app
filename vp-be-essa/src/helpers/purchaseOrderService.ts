import { literal, Op, Sequelize } from "sequelize";
import { BaseController } from "../controllers/baseController";
import { User } from "../models/user";
import pagination from "../utils/pagination";
import { GoodsReceipt } from "../models/goodsReceipt";
import { sequelize } from "../config/sequelize";
import { Vendor } from "../models/vendor";
import { POHeader } from "../models/purchaseOrderHeader";
import { PODetail } from "../models/purchaseOrderDetails";
import { PODeliverySchedule } from "../models/purchaseOrderDelivery";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { MasterCodes } from "../models/mastercodes";
import logger from "../utils/logger";

class purchaseOrderService extends BaseController {
  async poHeaderDetails(query: any) {
    try {
      let data: any = await POHeader.findOne({
        where: { PONo: query?.PONo },
        include: [
          {
            model: User,
            as: "created_person",
          },
          {
            model: Vendor,
            as: "vendor",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
      });

      if (data) {
        let findPaymentTerms = await MasterCodes.findOne({
          where: { Type: "Payment_Terms", Code: data?.Payment_Terms },
        });
        let findMOT = await MasterCodes.findOne({
          where: { Type: "MODE_OF_TRANSPORT", Code: data?.Mode_of_transport },
        });

        data.Mode_of_transport = findMOT?.Description_En || "";
        data.Payment_Terms = findPaymentTerms?.Description_En;
        return { status: true, data: data };
      } else {
        return { status: false, data: [] };
      }
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async listLineItem(
    limit: any,
    page: any,
    PONo: any,
    dateTimeRange: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column;
      let sortDirection = query?.sort || "ASC";
      const order: any = [];

      switch (sortField) {
        case "po_number":
          order.push(["po_number", sortDirection]);
          break;
        case "po_date":
          order.push(["po_date", sortDirection]);
          break;
        case "reference_number":
          order.push(["reference_number", sortDirection]);
          break;
        case "po_value":
          order.push(["po_value", sortDirection]);
          break;
        case "po_currency":
          order.push(["po_currency", sortDirection]);
          break;
        case "POLnNo":
          order.push([
            sequelize.cast(sequelize.col("POLnNo"), "INT"),
            sortDirection,
          ]);
          break;
        case "created_by":
          order.push(["created_person", "name", sortDirection]);
          break;
        default:
          if (sortField) {
            order.push([sortField, sortDirection]);
          } else {
            // No explicit sort: latest modified first, fall back to created date
            order.push([
              sequelize.literal("COALESCE(ModifiedDt, CreatedDt)"),
              "DESC",
            ]);
          }
          break;
      }

      let payload: any = { PONo: PONo };

      const whereCondition = { ...payload };

      let data: any = await PODetail.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
      });

      let result = pagination.paginationData(limit, page, data);

      if (data) {
        return { status: true, data: result };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async multiplelistLineItem(
    limit: any,
    page: any,
    PONo: any,
    dateTimeRange: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column;
      let sortDirection = query?.sort || "ASC";
      const order: any = [];

      switch (sortField) {
        case "PONo":
          order.push(["PONo", sortDirection]);
          break;
        case "POLnNo":
          order.push([
            sequelize.cast(sequelize.col("POLnNo"), "INT"),
            sortDirection,
          ]);
          break;
        case "Material_Code":
          order.push(["Material_Code", sortDirection]);
          break;
        case "Material_Description":
          order.push(["Material_Description", sortDirection]);
          break;
        case "Unit_of_measure":
          order.push(["Unit_of_measure", sortDirection]);
          break;
        case "Qty":
          order.push(["Qty", sortDirection]);
          break;
        case "GR_Qty":
          order.push(["GR_Qty", sortDirection]);
          break;
        case "Inv_Qty":
          order.push(["Inv_Qty", sortDirection]);
          break;
        case "UnitPrice":
          order.push(["UnitPrice", sortDirection]);
          break;
        case "created_by":
          order.push(["CreatedBy", sortDirection]);
          break;
        default:
          if (sortField) {
            order.push([sortField, sortDirection]);
          } else {
            // No explicit sort: latest modified first, fall back to created date
            order.push([
              sequelize.literal("COALESCE(ModifiedDt, CreatedDt)"),
              "DESC",
            ]);
          }
          break;
      }

      let payload: any = {
        PONo: {
          [Op.in]: PONo, // PONo should be an array like ['PO123', 'PO456']
        },
      };

      const whereCondition = { ...payload };

      let data: any = await PODetail.findAll({
        where: {
          ...whereCondition,
        },
        order: order,
        attributes: {
          exclude: ["CreatedDt", "ModifiedDt", "Is_Deleted", "Delivery_date"],
        },
      });

      if (data) {
        return { status: true, data: data };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async sumNetValue(
    limit: any,
    page: any,
    PONo: any,
    dateTimeRange: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let payload: any = {
        PONo: {
          [Op.in]: PONo, // PONo should be an array like ['PO123', 'PO456']
        },
      };

      const whereCondition = { ...payload };

      const result: any = await PODetail.findAll({
        attributes: [
          [
            Sequelize.fn("SUM", Sequelize.literal('"UnitPrice" * "GR_Qty"')),
            "totalNetAmount",
          ],
        ],
        where: {
          ...payload,
          [Op.and]: [
            { GR_Qty: { [Op.ne]: 0 } },
            { GR_Qty: { [Op.ne]: Sequelize.col("Inv_Qty") } },
          ],
        },
        raw: true,
      });

      const totalNetAmount = result?.[0]?.totalNetAmount ?? 0;

      if (totalNetAmount) {
        return { status: true, data: totalNetAmount };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async listPoDelivery(
    limit: any,
    page: any,
    POLnNo: any,
    dateTimeRange: any,
    searchQuery: any,
    query: any,
    PONo: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "CreatedDt";
      let sortDirection = query?.sort || "DESC";
      const order: any = [];

      switch (sortField) {
        case "Material_Code":
          order.push(["po_detail", "Material_Code", sortDirection]);
          break;
        case "Material_Description":
          order.push(["po_detail", "Material_Description", sortDirection]);
          break;
        case "Qty":
          order.push(["Qty", sortDirection]);
          break;
        case "Plant":
          order.push(["po_detail", "Plant", sortDirection]);
          break;
        case "Scheduled_date":
          order.push(["Scheduled_date", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let payload: any = { POLnNo: POLnNo, PONo: PONo };

      const whereCondition = { ...payload };

      let data: any = await PODeliverySchedule.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        include: [
          {
            model: PODetail,
            as: "po_detail",
            where: { PONo: PONo },
          },
        ],
      });
      let result = pagination.paginationData(limit, page, data);

      if (data) {
        return { status: true, data: result };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async poListOld(
    limit: any,
    page: any,
    id: any,
    startDate: any,
    endDate: any,
    searchQuery: any,
    query: any,
    payload: any,
  ) {
    try {
      limit = limit || 1000;
      page = page || 1;

      let sortField = query?.sort_column || "PO_date";
      let sortDirection = query?.sort || "DESC";
      const order: any = [];

      switch (sortField) {
        case "PONo":
          order.push(["PONo", sortDirection]);
          break;
        case "Vendor_Name_EN":
          order.push(["vendor", "Vendor_Name_EN", sortDirection]);
          break;
        case "PO_date":
          order.push(["PO_date", sortDirection]);
          break;
        case "OurRef":
          order.push(["OurRef", sortDirection]);
          break;
        case "POValue":
          order.push(["POValue", sortDirection]);
          break;
        case "PO_currency":
          order.push(["PO_currency", sortDirection]);
          break;
        case "CreatedBy":
          order.push(["created_person", "Name", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (startDate && endDate) {
        payload.PO_date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        payload.PO_date = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        payload.PO_date = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      if (query?.currency) {
        payload.PO_currency = query?.currency;
      }

      if (query?.created_by) {
        const ids = query?.created_by
          .split(",")
          .map((id: string) => id.trim())
          .filter((id: string) => id !== "");

        if (ids.length > 0) {
          payload.CreatedBy = { [Op.in]: ids };
        }
      }

      let searchCondition = {};
      if (searchQuery) {
        searchCondition = {
          [Op.or]: [
            { PONo: { [Op.like]: `%${searchQuery}%` } },
            { OurRef: { [Op.like]: `%${searchQuery}%` } },
            { "$vendor.Vendor_Name_EN$": { [Op.like]: `%${searchQuery}%` } },
            { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          ],
        };
      }

      const whereCondition = { ...payload };
      if (searchQuery) {
        Object.assign(whereCondition, searchCondition);
      }

      let data: any = await POHeader.findAndCountAll({
        where: {
          ...whereCondition,
          [Op.and]: [
            ...(whereCondition ? [whereCondition] : []),
            literal("Total_IR_Qty < Total_PO_Qty"),
          ],
        },
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        distinct: true,
        subQuery: false,
        include: [
          {
            model: User,
            as: "created_person",
          },
          {
            model: Vendor,
            as: "vendor",
            on: literal(`
        "vendor"."Vendor_SAP_Code" = "POHeader"."Vendor_SAP_Code" AND
        "vendor"."ID" = (
          SELECT v2."ID" FROM "VENDOR" v2
          WHERE v2."Vendor_SAP_Code" = "POHeader"."Vendor_SAP_Code"
          ORDER BY v2."ID" ASC
          LIMIT 1
        )
      `),
            attributes: ["ID", "Vendor_Name_EN"],
          },
        ],
      });

      let result = pagination.paginationData(limit, page, data);

      if (data) {
        return { status: true, data: result };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async poList(
    limit: any,
    page: any,
    id: any,
    startDate: any,
    endDate: any,
    searchQuery: any,
    query: any,
    payload: any,
  ) {
    try {
      // Set defaults
      const limitNumber = limit || 1000;
      const pageNumber = page || 1;
      const sortField = query?.sort_column || "PO_date";
      const sortDirection = query?.sort || "DESC";

      // Build sort order using mapping
      const sortFieldMap: Record<string, any[]> = {
        PONo: ["PONo", sortDirection],
        Vendor_Name_EN: ["vendor", "Vendor_Name_EN", sortDirection],
        PO_date: ["PO_date", sortDirection],
        OurRef: ["OurRef", sortDirection],
        POValue: ["POValue", sortDirection],
        PO_currency: ["PO_currency", sortDirection],
        CreatedBy: ["created_person", "Name", sortDirection],
      };

      const order: any = [
        sortFieldMap[sortField] || [sortField, sortDirection],
      ];

      // Build date conditions
      if (startDate && endDate) {
        payload.PO_date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        payload.PO_date = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        payload.PO_date = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      // Add currency filter
      if (query?.currency) {
        payload.PO_currency = query?.currency;
      }

      if (query?.outstandingPo === "true") {
        payload.POStatus = "Open";
      }

      if (query?.poStatus) {
        payload.POStatus = query?.poStatus;
      }

      // Process created_by filter
      if (query?.created_by) {
        const ids = query?.created_by
          .split(",")
          .map((id: string) => id.trim())
          .filter((id: string) => id !== "");

        if (ids.length > 0) {
          payload.CreatedBy = { [Op.in]: ids };
        }
      }

      // Build search condition
      const searchCondition = searchQuery
        ? {
          [Op.or]: [
            { PONo: { [Op.like]: `%${searchQuery}%` } },
            { OurRef: { [Op.like]: `%${searchQuery}%` } },
            { "$vendor.Vendor_Name_EN$": { [Op.like]: `%${searchQuery}%` } },
            { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          ],
        }
        : {};

      // Build final where condition
      const whereCondition = {
        ...payload,
        ...searchCondition,
      };

      const data: any = await POHeader.findAndCountAll({
        where: {
          ...whereCondition,
        },
        attributes: [
          "PONo",
          "Vendor_id",
          "Vendor_SAP_Code",
          "PO_date",
          "PO_currency",
          "POValue",
          "OurRef",
          "YourRef",
          "CreatedBy",
          "POStatus",
        ],
        order,
        offset: limitNumber * (pageNumber - 1),
        limit: limitNumber,
        distinct: true,
        subQuery: false,
        include: [
          {
            model: User,
            as: "created_person",
            required: false,
            attributes: ["ID", "Name"],
          },
          {
            model: Vendor,
            as: "vendor",
            required: false,
            attributes: ["ID", "Vendor_Name_EN"],
          },
        ],
      });

      const result = pagination.paginationData(limitNumber, pageNumber, data);

      return data
        ? { status: true, data: result }
        : { status: false, data: "" };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        message: "Error fetching purchase orders",
        error: error,
      };
    }
  }

  async goodsReceivedList(
    limit: any,
    page: any,
    id: any,
    startDate: any,
    endDate: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField =
        query?.sort_column ||
        sequelize.cast(sequelize.col("GoodsReceipt.POLnNo"), "INT");
      let sortDirection = query?.sort || "ASC";
      const order: any = [];

      switch (sortField) {
        case "PONo":
          order.push(["PONo", sortDirection]);
          break;
        case "GR_number":
          order.push(["GR_number", sortDirection]);
          break;
        case "GR_Ln_No":
          order.push(["GR_Ln_No", sortDirection]);
          break;
        case "POLnNo":
          order.push([
            sequelize.cast(sequelize.col("GoodsReceipt.POLnNo"), "INT"),
            sortDirection,
          ]);
          break;
        case "Material_Code":
          order.push(["po_detail", "Material_Code", sortDirection]);
          break;
        case "Material_Description":
          order.push(["po_detail", "Material_Description", sortDirection]);
          break;
        case "Unit_of_measure":
          order.push(["po_detail", "Unit_of_measure", sortDirection]);
          break;
        case "GR_quantity":
          order.push(["GR_quantity", sortDirection]);
          break;
        case "GR_value":
          order.push(["GR_value", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let payload: any = { PONo: id };

      if (startDate && endDate) {
        payload.GR_Document_date = {
          [Op.between]: [
            convertToSequalizeDate(startDate),
            convertToSequalizeDate(endDate),
          ],
        };
      } else if (startDate) {
        payload.GR_Document_date = {
          [Op.gte]: convertToSequalizeDate(startDate),
        };
      } else if (endDate) {
        payload.GR_Document_date = {
          [Op.lte]: convertToSequalizeDate(endDate),
        };
      }

      if (query?.gr_number) {
        payload.GR_number = query?.gr_number;
      }
      const whereCondition = { ...payload };

      let searchCondition = {};
      if (searchQuery) {
        searchCondition = {
          [Op.or]: [{ GR_number: { [Op.like]: `%${searchQuery}%` } }],
        };
      }

      if (searchQuery) {
        Object.assign(whereCondition, searchCondition);
      }

      let data: any = await GoodsReceipt.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        include: [
          {
            model: PODetail,
            as: "po_detail",
            where: { PONo: id },
          },
        ],
      });

      if (!data)
        throw new APIError("No purchase Order found", StatusCodeEnum.HTTP_OK);

      let result = pagination.paginationData(limit, page, data);

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async grDropdown(id: any) {
    try {
      let payload: any = { PONo: id };

      const whereCondition = { ...payload };

      let data: any = await GoodsReceipt.findAll({
        where: whereCondition,
        attributes: ["GR_number"],
      });

      if (!data)
        throw new APIError("No purchase Order found", StatusCodeEnum.HTTP_OK);

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async poDropdown(id: any, entityId: any) {
    try {
      let payload: any = { Vendor_id: id, POStatus: "Open" };

      if (entityId) {
        payload.CoCd = entityId;
      }

      const whereCondition = { ...payload };

      let data: any = await POHeader.findAll({
        where: whereCondition,
        attributes: ["PONo"],
      });
      if (!data)
        throw new APIError("No purchase Order found", StatusCodeEnum.HTTP_OK);

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }
}

export default new purchaseOrderService();
