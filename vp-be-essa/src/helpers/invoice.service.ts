import { BaseController } from "../controllers/baseController";
import { convertToSequalizeDate } from "../utils/globalFunction";
import { APIError } from "../utils/apiError.utils";
import { PODetail } from "../models/purchaseOrderDetails";
import { InvoiceDetail } from "../models/invoicePoMapping";
import { InvoiceHeader } from "../models/invoices";
import { Op, Sequelize, QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import pagination from "../utils/pagination";
import { UploadFiles } from "../models/uploadFiles";
import {
  FileCategories,
  NotificationCategory,
} from "../utils/enums/category.enum";
import { User } from "../models/user";
import { Vendor } from "../models/vendor";
import { InvoiceCategory } from "../models/invoicesCategory";
import constructMail from "../utils/constructMail";
import { Entity } from "../models/entity";
import { StatusCodeEnum, StatusEnum } from "../utils/enums/status.enum";
import { Employee } from "../models/employee";
import notiticationService from "./notiticationService";
import _ from "lodash";
import { MasterCodes } from "../models/mastercodes";
import { VimStatus } from "../models/vimStatus";
import path from "path";
import fs from "fs";
import { literal } from "sequelize";
import userService from "./user.service";
import { GoodsReceiptInvoice } from "../models/GoodsReceiptInvoice";
import logger from "../utils/logger";

class InvoiceService extends BaseController {
  async LineDetails(body: any) {
    try {
      const data = await PODetail.findAll({
        where: { PONo: body.PONo },
        raw: true,
      });
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getPoInvoice(body: any) {
    try {
      const pageNumber = Number(body.page) || 1;
      const limitNumber = Number(body.limit) || 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = body.sort_column || "CreatedDt";
      let sortDirection = body.sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "Invoice_Header_Id":
          order.push(["Invoice_Header_Id", sortDirection]);
          break;
        case "PONo":
          order.push(["PONo", sortDirection]);
          break;
        case "POLnNo":
          order.push(["POLnNo", sortDirection]);
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
        case "PO_Qty":
          order.push(["PO_Qty", sortDirection]);
          break;
        case "Inv_Qty":
          order.push(["Inv_Qty", sortDirection]);
          break;
        case "IR_value":
          order.push(["IR_value", sortDirection]);
          break;
        case "Tax_Amt":
          order.push(["IR_value", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      // Get all invoice details for the PO number
      let findInvId = await InvoiceDetail.findAll({
        where: { PONo: body.PONo },
      });

      // Filter Invoice_Header_Id based on Invoice_Status_Id from InvoiceHeader table
      const filteredInvoiceHeaderIds = [];
      for (const invoiceDetail of findInvId) {
        const invoiceHeader = await InvoiceHeader.findOne({
          where: { ID: invoiceDetail.Invoice_Header_Id },
          attributes: ["ID", "Invoice_Status_Id"],
        });

        if (
          invoiceHeader &&
          (invoiceHeader.Invoice_Status_Id == 12 ||
            invoiceHeader.Invoice_Status_Id == 15)
        ) {
          filteredInvoiceHeaderIds.push(invoiceDetail.Invoice_Header_Id);
        }
      }

      // Use filtered Invoice_Header_Id in the main query
      const data = await InvoiceDetail.findAndCountAll({
        where: {
          Invoice_Header_Id: { [Op.in]: filteredInvoiceHeaderIds },
        },
        limit: limitNumber,
        offset: offset,
        order: order,
      });

      // Loop through results and fetch InvNo from InvoiceHeader
      const resultsWithInvNo = await Promise.all(
        (data.rows ?? []).map(async (invoiceDetail) => {
          const invoiceHeader = await InvoiceHeader.findOne({
            where: { ID: invoiceDetail.Invoice_Header_Id },
          });

          return {
            ...invoiceDetail?.get?.({ plain: true }),
            InvNo: invoiceHeader ? invoiceHeader.InvNo : null,
          };
        }),
      );

      // Create the final response
      const finalData = {
        count: data.count,
        rows: resultsWithInvNo,
      };

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        finalData,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getPoInvoiceV1(body: any) {
    try {
      const pageNumber = Number(body.page) || 1;
      const limitNumber = Number(body.limit) || 10000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField =
        body.sort_column ||
        sequelize.cast(sequelize.col("GoodsReceiptInvoice.POLnNo"), "INT");
      let sortDirection = body.sort || "ASC";

      const order: any = [];

      switch (sortField) {
        case "Invoice_Header_Id":
          order.push(["InvoiceNo", sortDirection]);
          break;
        case "PONo":
          order.push(["PONo", sortDirection]);
          break;
        case "POLnNo":
          order.push([
            sequelize.cast(sequelize.col("GoodsReceiptInvoice.POLnNo"), "INT"),
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
          order.push(["Unit_of_measure", sortDirection]);
          break;
        case "PO_Qty":
          order.push(["PO_Qty", sortDirection]);
          break;
        case "Inv_Qty":
          order.push(["InvQuantity", sortDirection]);
          break;
        case "IR_value":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Tax_Amt":
          order.push(["IR_value", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      const data = await GoodsReceiptInvoice.findAndCountAll({
        where: {
          PONo: body.PONo,
        },
        include: [
          {
            model: PODetail,
            as: "po_detail",
            where: {
              PONo: body.PONo,
            },
          },
        ],
        limit: limitNumber,
        offset: offset,
        order: order,
      });

      // Transform each invoice row and its po_detail
      const resultsWithInvNo: any[] = [];

      (data.rows ?? []).forEach((invoice: any) => {
        // If po_detail is an array (one-to-many relation), loop through each
        const poDetails = Array.isArray(invoice.po_detail)
          ? invoice.po_detail
          : [invoice.po_detail];

        (poDetails ?? []).forEach((po: any, index: number) => {
          resultsWithInvNo.push({
            id: resultsWithInvNo.length + 1, // incremental id
            Invoice_Header_Id: invoice.uniqno || null,
            PONo: invoice.PONo,
            POLnNo: invoice.POLnNo,
            Inv_Line_No: null,
            Material_Code: po?.Material_Code || null,
            Material_Description: po?.Material_Description || null,
            NetAmount: invoice.InvAmt,
            GR_Qty: invoice?.InvQuantity || 0,
            Enter_Qty: invoice?.InvQuantity || 0,
            Inv_Qty: invoice?.InvQuantity || 0,
            IR_value: invoice.InvAmt || 0,
            // Plant: po?.Plant || null,
            Tax_Amt: 0,
            Trading_Partner: null,
            Item_Text: null,
            Clearing_Doc: null,
            Clearing_Dt: null,
            Clearing_Entry_Dt: null,
            InvNo: invoice.InvoiceNo || null,
          });
        });
      });

      // Prepare final data
      const finalData = {
        rows: resultsWithInvNo,
        count: data.count,
      };

      // Use pagination function
      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        finalData,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getInvoices({
    page,
    limit,
    sort,
    sort_column,
    userId,
    startDate,
    endDate,
    currency,
    status,
    category,
    search,
    entityId,
    vendorIds,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column;
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
          order.push(["InvNo", sortDirection]);
          break;
        case "InvDt":
          order.push(["InvDt", sortDirection]);
          break;
        case "InvCurr":
          order.push(["InvCurr", sortDirection]);
          break;
        case "InvAmt":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Invoice_Due_Date":
          order.push(["Invoice_Due_Date", sortDirection]);
          break;
        case "Invoice_Status_Id":
          order.push(["Invoice_Status_Id", sortDirection]);
          break;
        default:
          if (sortField) {
            order.push([sortField, sortDirection]);
          } else {
            // No explicit sort: latest uploaded/updated invoice on top
            // (sort by ModifiedDt, fall back to CreatedDt when never modified)
            order.push([
              literal(
                `COALESCE("InvoiceHeader"."ModifiedDt", "InvoiceHeader"."CreatedDt")`,
              ),
              "DESC",
            ]);
          }
          break;
      }

      // Tie-breaker: keep the latest uploaded/updated invoice on top
      if (sortField) {
        order.push([
          literal(
            `COALESCE("InvoiceHeader"."ModifiedDt", "InvoiceHeader"."CreatedDt")`,
          ),
          "DESC",
        ]);
      }

      let where: any = {
        Is_Deleted: false,
        Invoice_Category_id: category,
        CoCd: entityId,
        [Op.or]: [
          // Case 1: Created by the current user — allow all statuses including 7
          { CreatedBy: userId },

          // Case 2: Not status 7 — applies to everyone else
          {
            Invoice_Status_Id: { [Op.ne]: 101 },
          },
        ],
      };

      if (vendorIds?.length) {
        where.Vendor_id = { [Op.in]: vendorIds };
      }

      if (startDate && endDate) {
        const start = convertToSequalizeDate(`${startDate}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${endDate}T23:59:59.999Z`);
        if (category == 4 || category == 3) {
          where.InvDt = {
            [Op.between]: [start, end],
          };
        } else {
          where.Invoice_Due_Date = {
            [Op.between]: [start, end],
          };
        }
      }

      if (currency) {
        where.InvCurr = currency;
      }

      if (status) {
        if (status == 1) {
          where.Invoice_Status_Id = 100;
        }

        if (status == 7) {
          where.Invoice_Status_Id = 101;
        }

        if (status == 6) {
          where.Invoice_Status_Id = 999;
        }

        if (status == 4) {
          where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        }

        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }

        if (status == 5) {
          where.Invoice_Status_Id = {
            [Op.in]: [10, 13, 16, 17],
          };
        }
      }

      if (search) {
        where[Op.and] = [
          {
            [Op.or]: [
              { InvNo: { [Op.like]: `%${search}%` } },
              sequelize.where(sequelize.col("vendorDetails.Vendor_Name_EN"), {
                [Op.like]: `%${search}%`,
              }),
              sequelize.where(sequelize.col("vendorDetails.Vendor_SAP_Code"), {
                [Op.like]: `%${search}%`,
              }),
            ],
          },
        ];
      }

      let invoices;

      if (category == 2) {
        invoices = await InvoiceHeader.findAndCountAll({
          where,
          limit: limitNumber,
          offset: offset,
          order,
          attributes: {
            exclude: ["InvAmt"],
            include: [
              [
                literal(
                  `COALESCE("InvoiceHeader"."InvAmt",0) + COALESCE("InvoiceHeader"."Tax_amount",0)`,
                ),
                "InvAmt",
              ],
            ],
          },
          include: [
            {
              model: VimStatus,
              as: "status",
              attributes: ["ID", "Status_classification", "Status_description"],
            },
            {
              model: Vendor,
              as: "vendorDetails",
              attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
            },
            { model: User, as: "cr_person", attributes: ["ID", "Name"] },
          ],
        });
      } else {
        invoices = await InvoiceHeader.findAndCountAll({
          where,
          limit: limitNumber,
          offset: offset,
          order: order,
          include: [
            {
              model: VimStatus,
              as: "status",
              attributes: ["ID", "Status_classification", "Status_description"],
            },
            {
              model: Vendor,
              as: "vendorDetails",
              attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
            },
            {
              model: User,
              as: "cr_person",
              attributes: ["ID", "Name"],
            },
          ],
        });
      }

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getPendingInvoices({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    start_date,
    end_date,
    currency,
    status,
    category,
    search,
    entity_id,
    vendorIds,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
          order.push(["InvNo", sortDirection]);
          break;
        case "InvDt":
          order.push(["InvDt", sortDirection]);
          break;
        case "InvCurr":
          order.push(["InvCurr", sortDirection]);
          break;
        case "InvAmt":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Invoice_Due_Date":
          order.push(["Invoice_Due_Date", sortDirection]);
          break;
        case "Invoice_Status_Id":
          order.push(["Invoice_Status_Id", sortDirection]);
          break;
        case "Name_En":
          order.push(["category", "Name_En", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let where: any = {
        Is_Deleted: false,
        CoCd: entity_id,
      };

      if (vendorIds && vendorIds.length > 0) {
        where.Vendor_id = { [Op.in]: vendorIds };
      }

      if (start_date && end_date) {
        const start = convertToSequalizeDate(`${start_date}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${end_date}T23:59:59.999Z`);
        where.InvDt = {
          [Op.between]: [start, end],
        };
      }

      if (currency) {
        where.InvCurr = currency;
      }

      where.Invoice_Status_Id = {
        [Op.notIn]: [10, 13, 16, 17, 12, 15, 101, 999],
      };

      if (status) {
        if (status == 1) {
          where.Invoice_Status_Id = 100;
        }

        if (status == 7) {
          where.Invoice_Status_Id = 101;
        }

        if (status == 4) {
          where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        }

        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }

        if (status == 5) {
          where.Invoice_Status_Id = {
            [Op.in]: [10, 13, 16, 17],
          };
        }
      }

      if (search) {
        where.InvNo = { [Op.like]: `%${search}%` };
      }

      const invoices = await InvoiceHeader.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        include: [
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
          {
            model: InvoiceCategory,
            as: "category",
            attributes: ["ID", "Name_En"],
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getPendingInvoicesForAdmin({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    start_date,
    end_date,
    currency,
    status,
    category,
    search,
    entity_id,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
          order.push(["InvNo", sortDirection]);
          break;
        case "InvDt":
          order.push(["InvDt", sortDirection]);
          break;
        case "InvCurr":
          order.push(["InvCurr", sortDirection]);
          break;
        case "InvAmt":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Invoice_Due_Date":
          order.push(["Invoice_Due_Date", sortDirection]);
          break;
        case "Invoice_Status_Id":
          order.push(["Invoice_Status_Id", sortDirection]);
          break;
        case "Name_En":
          order.push(["category", "Name_En", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let where: any = {
        Is_Deleted: false,
        CoCd: entity_id,
      };

      if (start_date && end_date) {
        const start = convertToSequalizeDate(`${start_date}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${end_date}T23:59:59.999Z`);
        where.InvDt = {
          [Op.between]: [start, end],
        };
      }

      if (currency) {
        where.InvCurr = currency;
      }

      where.Invoice_Status_Id = { [Op.notIn]: [10, 13, 16, 17, 12, 15, 101] };

      if (status) {
        if (status == 1) {
          where.Invoice_Status_Id = 100;
        }

        if (status == 7) {
          where.Invoice_Status_Id = 101;
        }

        if (status == 4) {
          where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        }

        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }

        if (status == 5) {
          where.Invoice_Status_Id = {
            [Op.in]: [10, 13, 16, 17],
          };
        }
      }

      if (search) {
        where.InvNo = { [Op.like]: `%${search}%` };
      }

      const invoices = await InvoiceHeader.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        include: [
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
          {
            model: InvoiceCategory,
            as: "category",
            attributes: ["ID", "Name_En"],
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getVendorInvoices({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    startDate,
    endDate,
    currency,
    status,
    category,
    search,
    vendorId,
    entityId,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column;
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
          order.push(["InvNo", sortDirection]);
          break;
        case "InvDt":
          order.push(["InvDt", sortDirection]);
          break;
        case "InvCurr":
          order.push(["InvCurr", sortDirection]);
          break;
        case "InvAmt":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Invoice_Due_Date":
          order.push(["Invoice_Due_Date", sortDirection]);
          break;
        case "Invoice_Status_Id":
          order.push(["Invoice_Status_Id", sortDirection]);
          break;
        default:
          if (sortField) {
            order.push([sortField, sortDirection]);
          } else {
            // No explicit sort: latest uploaded/updated invoice on top
            // (sort by ModifiedDt, fall back to CreatedDt when never modified)
            order.push([
              literal(
                `COALESCE("InvoiceHeader"."ModifiedDt", "InvoiceHeader"."CreatedDt")`,
              ),
              "DESC",
            ]);
          }
          break;
      }

      // Tie-breaker: keep the latest uploaded/updated invoice on top
      if (sortField) {
        order.push([
          literal(
            `COALESCE("InvoiceHeader"."ModifiedDt", "InvoiceHeader"."CreatedDt")`,
          ),
          "DESC",
        ]);
      }

      let where: any = {
        Is_Deleted: false,
        Invoice_Category_id: category,
        Vendor_id: vendorId,
        CoCd: entityId,
        [Op.or]: [
          // Case 1: Created by the current user — allow all statuses including 7
          { CreatedBy: userId },

          // Case 2: Not status 7 — applies to everyone else
          {
            Invoice_Status_Id: { [Op.ne]: 101 },
          },
        ],
      };

      if (startDate && endDate) {
        const start = convertToSequalizeDate(`${startDate}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${endDate}T23:59:59.999Z`);
        if (category == 1 || category == 4 || category == 2 || category == 3) {
          where.InvDt = {
            [Op.between]: [start, end],
          };
        } else {
          where.Invoice_Due_Date = {
            [Op.between]: [start, end],
          };
        }
      }

      if (currency) {
        where.InvCurr = currency;
      }

      if (status) {
        if (status == 1) {
          where.Invoice_Status_Id = 100;
        }

        if (status == 7) {
          where.Invoice_Status_Id = 101;
        }

        if (status == 6) {
          where.Invoice_Status_Id = 999;
        }

        if (status == 4) {
          where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        }

        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }

        if (status == 5) {
          where.Invoice_Status_Id = {
            [Op.in]: [10, 13, 16, 17],
          };
        }
      }

      if (search) {
        where.InvNo = { [Op.like]: `%${search}%` };
      }
      let invoices;

      if (category == 2) {
        invoices = await InvoiceHeader.findAndCountAll({
          where,
          limit: limitNumber,
          offset: offset,
          order,
          attributes: {
            exclude: ["InvAmt"],
            include: [
              [
                literal(
                  `COALESCE("InvoiceHeader"."InvAmt",0) + COALESCE("InvoiceHeader"."Tax_amount",0)`,
                ),
                "InvAmt",
              ],
            ],
          },
          include: [
            {
              model: VimStatus,
              as: "status",
              attributes: ["ID", "Status_classification", "Status_description"],
            },
            {
              model: Vendor,
              as: "vendorDetails",
              attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
            },
            { model: User, as: "cr_person", attributes: ["ID", "Name"] },
          ],
        });
      } else {
        invoices = await InvoiceHeader.findAndCountAll({
          where,
          limit: limitNumber,
          offset: offset,
          order: order,
          include: [
            {
              model: VimStatus,
              as: "status",
              attributes: ["ID", "Status_classification", "Status_description"],
            },
            {
              model: Vendor,
              as: "vendorDetails",
              attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
            },
            {
              model: User,
              as: "cr_person",
              attributes: ["ID", "Name"],
            },
          ],
        });
      }

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getVendorPendingInvoices({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    start_date,
    end_date,
    currency,
    status,
    category,
    search,
    vendorId,
    entity_id,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "CreatedDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
          order.push(["InvNo", sortDirection]);
          break;
        case "InvDt":
          order.push(["InvDt", sortDirection]);
          break;
        case "InvCurr":
          order.push(["InvCurr", sortDirection]);
          break;
        case "InvAmt":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Invoice_Due_Date":
          order.push(["Invoice_Due_Date", sortDirection]);
          break;
        case "Invoice_Status_Id":
          order.push(["Invoice_Status_Id", sortDirection]);
          break;
        case "Name_En":
          order.push(["category", "Name_En", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let where: any = {
        Is_Deleted: false,
        Invoice_Status_Id: { [Op.notIn]: [10, 13, 16, 17, 12, 15, 101, 999] },
        Vendor_id: vendorId,
        CoCd: entity_id,
      };

      if (start_date && end_date) {
        const start = convertToSequalizeDate(`${start_date}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${end_date}T23:59:59.999Z`);
        where.InvDt = {
          [Op.between]: [start, end],
        };
      }

      if (currency) {
        where.InvCurr = currency;
      }

      if (status) {
        if (status == 1) {
          where.Invoice_Status_Id = 100;
        }

        if (status == 7) {
          where.Invoice_Status_Id = 101;
        }

        if (status == 4) {
          where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        }

        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }

        if (status == 5) {
          where.Invoice_Status_Id = {
            [Op.in]: [10, 13, 16, 17],
          };
        }
      }

      if (search) {
        where.InvNo = { [Op.like]: `%${search}%` };
      }
      const invoices = await InvoiceHeader.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        include: [
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
          {
            model: InvoiceCategory,
            as: "category",
            attributes: ["ID", "Name_En"],
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getInvoicesByID({ id, emp_id }: { id: number; emp_id: number }) {
    try {
      let where: any = { ID: id };

      let invoices: any = await InvoiceHeader.findOne({
        where,
        include: [
          {
            model: UploadFiles,
            as: "upload_files",
            required: false,
            where: {
              Category_id: FileCategories.Invoice,
              Is_deleted: false,
            },
          },
          {
            model: InvoiceDetail,
            as: "invoicedetails",
            required: false,
          },
          {
            model: User,
            as: "cr_person",
            required: false,
          },
          {
            model: Employee,
            as: "cr_person_data",
            required: false,
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
          {
            model: User,
            as: "created_person",
            attributes: ["ID", "Name"],
          },
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
          {
            model: MasterCodes,
            as: "natureOfExpenses",
            attributes: ["ID", "Code", "Description_En", "Description_Ar"],
            required: false,
          },
        ],
      });

      if (!invoices) {
        return { status: false, data: "Invoice not found" };
      }

      invoices = invoices?.get?.({ plain: true });

      let getPaymentTerms: any = await this.findPaymentTermsDescByCode(
        invoices.Payment_Terms,
      );

      if (invoices.Invoice_Status_Id == 999) {
        invoices.Payment_Status = "Paid";
      } else {
        invoices.Payment_Status = null;
      }

      // invoices.Payment_Terms = getPaymentTerms.data.Description_En;
      if (getPaymentTerms?.data?.Description_En) {
        invoices.Payment_Terms = getPaymentTerms.data.Description_En;
      } else {
        invoices.Payment_Terms = null;
      }

      let findManager = null;
      if (invoices.cr_person_data && invoices.cr_person_data?.Reporting_Manager)
        findManager = await Employee.findOne({
          where: { ID: invoices.cr_person_data.Reporting_Manager },
        });

      // status values for logic
      const APPROVED_STATUS = 4;
      const REJECTED_STATUS = 10;

      // Capture role IDs
      const CR_ID = invoices.Business_contact;
      const MANAGER_ID = invoices.cr_person_data?.Reporting_Manager;
      const MANAGER1_ID = findManager?.Reporting_Manager;

      let buttons = {
        Approve_Button: false,
        Reject_Button: false,
        Final_Approval: false,
      };

      // Already completed? Disable all buttons
      if (
        invoices.Invoice_Status_Id === APPROVED_STATUS ||
        invoices.Invoice_Status_Id === REJECTED_STATUS
      ) {
        // All false by default, nothing to do
      } else if (emp_id === CR_ID) {
        // CR can approve/reject BEFORE CR approval
        if (!invoices.Is_CR_Approved) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        }

        if (invoices.Invoice_Status_Id == REJECTED_STATUS) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
      } else if (emp_id === MANAGER_ID) {
        // Manager can approve/reject AFTER CR approval, BEFORE Manager approval
        if (invoices.Is_CR_Approved && !invoices.Is_Manager_Approved) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        }

        if (invoices.Invoice_Status_Id == REJECTED_STATUS) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
      } else if (emp_id === MANAGER1_ID) {
        // Manager1 (2nd-level) can approve/reject after both previous approvals
        if (
          invoices.Is_CR_Approved &&
          invoices.Is_Manager_Approved &&
          !invoices.Is_Manager1_Approved
        ) {
          buttons.Approve_Button = true;
          buttons.Reject_Button = true;
        } else if (
          // Show final approval, if desired, after all approved and not status==approved
          invoices.Is_CR_Approved &&
          invoices.Is_Manager_Approved &&
          invoices.Is_Manager1_Approved &&
          invoices.Invoice_Status_Id !== APPROVED_STATUS
        ) {
          buttons.Final_Approval = false;
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }

        if (invoices.Invoice_Status_Id == REJECTED_STATUS) {
          buttons.Approve_Button = false;
          buttons.Reject_Button = false;
        }
      }

      invoices.buttons_logic = buttons;

      return { status: true, data: invoices };
    } catch (error: any) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getCreditInvoicesByID({ id }: any) {
    try {
      let where: any = {
        ID: id,
      };

      let invoices: any = await InvoiceHeader.findOne({
        where,
        include: [
          {
            model: UploadFiles,
            as: "upload_files",
            required: false,
            where: {
              Category_id: FileCategories.Invoice,
              Is_deleted: false,
            },
          },
          {
            model: InvoiceDetail,
            as: "invoicedetails",
            required: false,
          },
          {
            model: User,
            as: "cr_person",
            required: false,
          },
          {
            model: User,
            as: "created_person",
            required: false,
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
        ],
      });
      invoices = invoices?.get?.({ plain: true });

      let getPaymentTerms: any = await this.findPaymentTermsDescByCode(
        invoices.Payment_Terms,
      );

      if (invoices.Invoice_Status_Id == 999) {
        invoices.Payment_Status = "Paid";
      }

      if (getPaymentTerms?.data?.Description_En) {
        invoices.Payment_Terms = getPaymentTerms.data.Description_En;
      } else {
        invoices.Payment_Terms = null;
      }

      if (invoices.invoicedetails?.length > 0) {
        const uniquePOs = [
          ...new Set(invoices.invoicedetails.map((d: any) => d.PONo)),
        ];
        invoices.totalPoNo = uniquePOs; // If you want list of POs
        // invoices.totalPoNo = uniquePOs.length; // If you want count instead
      } else {
        invoices.totalPoNo = [];
      }

      return { status: true, data: invoices };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async invoiceListById({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    startDate,
    endDate,
    currency,
    status,
    category,
    InvNo,
  }: any) {
    try {
      let pageNumber = page ? parseInt(page) : 1;
      let limitNumber = limit ? parseInt(limit) : 15;
      let offset = (pageNumber - 1) * limitNumber;

      let sortField = sort_column || "InvDt";
      let sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
          order.push(["InvNo", sortDirection]);
          break;
        case "InvDt":
          order.push(["InvDt", sortDirection]);
          break;
        case "InvCurr":
          order.push(["InvCurr", sortDirection]);
          break;
        case "InvAmt":
          order.push(["InvAmt", sortDirection]);
          break;
        case "Invoice_Status_Id":
          order.push(["Invoice_Status_Id", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let where: any = {
        Is_Deleted: false,
        Invoice_Category_id: category,
        InvNo: {
          [Op.in]: InvNo, // PONo should be an array like ['PO123', 'PO456']
        },
      };

      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (startDate && endDate) {
        where.InvDt = {
          [Op.between]: [start, end],
        };
      }

      if (currency) {
        where.InvCurr = currency;
      }

      if (status) {
        where.Invoice_Status_Id = status;
      }

      const invoices = await InvoiceHeader.findAndCountAll({
        where,
        include: {
          model: VimStatus,
          as: "status",
          attributes: ["ID", "Status_classification", "Status_description"],
        },
        limit: limitNumber,
        offset: offset,
        order: order,
      });

      const totalNetAmount = await InvoiceHeader.sum("InvAmt", {
        where,
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      let finalresult = {
        result: result,
        totalAmount: totalNetAmount,
      };

      return { status: true, data: finalresult };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async mainLogisticsList({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    vendorId,
    role_id,
    startDate,
    endDate,
    currency,
    status,
    category,
    entityId,
    vendorIds,
  }: any) {
    try {
      const pageNumber = page ? parseInt(page) : 1;
      const limitNumber = limit ? parseInt(limit) : 15;
      const offset = (pageNumber - 1) * limitNumber;

      const sortFieldMap: Record<string, string> = {
        month: `EXTRACT(MONTH FROM ih."InvDt")`,
        year: `EXTRACT(YEAR FROM ih."InvDt")`,
        totalAmount: `SUM(CAST(ih."InvAmt" AS DOUBLE PRECISION))`,
        invoiceCreated: "COUNT(*)",
        invoiceApproved:
          `SUM(CASE WHEN ih."Invoice_Status_Id" IN (12, 15, 999) THEN 1 ELSE 0 END)`,
        invoicePending:
          `SUM(CASE WHEN ih."Invoice_Status_Id" IN (0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52, 53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87, 88, 89, 90, 101, 100 ) THEN 1 ELSE 0 END)`,
        invoiceRejected:
          `SUM(CASE WHEN ih."Invoice_Status_Id" IN (10, 13, 16, 17) THEN 1 ELSE 0 END)`,
      };

      let orderByClause = "";

      if (!sort_column) {
        // Default: show latest year, latest month first
        orderByClause = `EXTRACT(YEAR FROM ih."InvDt") DESC, EXTRACT(MONTH FROM ih."InvDt") DESC`;
      } else {
        const sortField = sort_column;
        const sortDirection = (sort || "DESC").toUpperCase();
        const dbSortField = sortFieldMap[sortField] || `EXTRACT(YEAR FROM ih."InvDt")`;
        const dbSortDirection = ["ASC", "DESC"].includes(sortDirection)
          ? sortDirection
          : "DESC";
        orderByClause = `${dbSortField} ${dbSortDirection}`;
      }

      let whereClause = `ih."InvDt" IS NOT NULL`;
      whereClause += ` AND ih."CoCd" = :entityId`;

      if (vendorIds && vendorIds.length > 0) {
        whereClause += ` AND ih."Vendor_id" IN (:vendorIds)`;
      }

      if (category) {
        whereClause += ` AND ih."Invoice_Category_id" = ${category}`;
      } else {
        whereClause += ` AND ih."Invoice_Category_id" = 3`;
      }

      if (month) {
        whereClause += ` AND EXTRACT(MONTH FROM ih."InvDt") = ${month}`;
      }

      if (year) {
        whereClause += ` AND EXTRACT(YEAR FROM ih."InvDt") = ${year}`;
      }

      if (currency) {
        whereClause += ` AND ih."InvCurr" = '${currency}'`;
      }

      if (status) {
        if (status == 1) {
          whereClause += ` AND ih."Invoice_Status_Id" = 100`;
        } else if (status == 7) {
          whereClause += ` AND ih."Invoice_Status_Id" = 101`;
        } else if (status == 4) {
          whereClause += ` AND ih."Invoice_Status_Id" IN (12, 15)`;
        } else if (status == 2) {
          whereClause += ` AND ih."Invoice_Status_Id" IN (0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52, 53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87, 88, 89, 90)`;
        } else if (status == 5) {
          whereClause += ` AND ih."Invoice_Status_Id" IN (10, 13, 16, 17)`;
        } else if (status == 6) {
          whereClause += ` AND ih."Invoice_Status_Id" IN (999)`;
        } else {
          whereClause += ` AND ih."Invoice_Status_Id" = ${status}`;
        }
      }

      if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`).toISOString();
        const end = new Date(`${endDate}T23:59:59.999Z`).toISOString();
        whereClause += ` AND ih."InvDt" BETWEEN '${start}' AND '${end}'`;
      }

      const query = `
  SELECT
    TRIM(TO_CHAR(ih."InvDt", 'Month')) AS month,
    EXTRACT(YEAR FROM ih."InvDt")::int AS year,
    SUM(CAST(ih."InvAmt" AS DOUBLE PRECISION)) AS "totalAmount",
    COUNT(*) AS "invoiceCreated",
    SUM(CASE WHEN ih."Invoice_Status_Id" IN (12, 15, 999) THEN 1 ELSE 0 END) AS "invoiceApproved",
    SUM(CASE WHEN ih."Invoice_Status_Id" IN (0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52, 53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87, 88, 89, 90, 101, 100  ) THEN 1 ELSE 0 END) AS "invoicePending",
    SUM(CASE WHEN ih."Invoice_Status_Id" IN (10, 13, 16, 17) THEN 1 ELSE 0 END) AS "invoiceRejected"
  FROM "INVOICE_HEADER" ih
  WHERE ${whereClause}
AND (
  (:role_id = 4 AND (ih."Invoice_Status_Id" != 101 OR ih."CreatedBy" = :userId))
  OR (:role_id IN (2, 3) AND ih."Invoice_Status_Id" != 101)
  OR (:role_id = 1 AND (
    (ih."CreatedBy" = :userId OR ih."Vendor_id" = :vendorId)
    AND (ih."Invoice_Status_Id" != 101 OR ih."CreatedBy" = :userId)
  ))
)
  GROUP BY TRIM(TO_CHAR(ih."InvDt", 'Month')), EXTRACT(YEAR FROM ih."InvDt"), EXTRACT(MONTH FROM ih."InvDt")
  ORDER BY ${orderByClause}
  LIMIT ${limitNumber} OFFSET ${offset};
`;

      const countQuery = `
      SELECT COUNT(*) as "totalGroups" FROM (
        SELECT 1 AS dummy
        FROM "INVOICE_HEADER" ih
        WHERE ${whereClause}
        AND (
          (:role_id = 4 AND (ih."Invoice_Status_Id" != 101 OR ih."CreatedBy" = :userId))
          OR (:role_id IN (2, 3) AND ih."Invoice_Status_Id" != 101)
          OR (:role_id = 1 AND (
            (ih."CreatedBy" = :userId OR ih."Vendor_id" = :vendorId)
            AND (ih."Invoice_Status_Id" != 101 OR ih."CreatedBy" = :userId)
          ))
        )
        GROUP BY TRIM(TO_CHAR(ih."InvDt", 'Month')), EXTRACT(YEAR FROM ih."InvDt"), EXTRACT(MONTH FROM ih."InvDt")
      ) AS groupedInvoices;
    `;

      const replacements = { role_id, vendorId, userId, entityId, vendorIds };

      const results = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });

      const countResult: any = await sequelize.query(countQuery, {
        replacements,
        type: QueryTypes.SELECT,
      });

      const total = countResult[0]?.totalGroups ?? results.length;
      const pageCount = Math.ceil(total / limitNumber);
      const nextPage = pageNumber < pageCount ? pageNumber + 1 : null;

      return {
        status: true,
        message: "Invoices retrieved successfully",
        data: {
          results,
          total,
          pageMeta: {
            page: pageNumber,
            pageCount,
            nextPage,
            pageSize: limitNumber,
            total,
          },
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async logisticsListByMonth({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    role_id,
    vendorId,
    startDate,
    endDate,
    currency,
    status,
    category,
    search,
    entityId,
  }: any) {
    try {
      const pageNumber = page ? parseInt(page) : 1;
      const limitNumber = limit ? parseInt(limit) : 15;
      const offset = (pageNumber - 1) * limitNumber;

      const sortField = sort_column || "CreatedDt";
      const sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
        case "InvDt":
        case "InvCurr":
        case "InvAmt":
        case "Invoice_Status_Id":
          order.push([sortField, sortDirection]);
          break;
        default:
          order.push(["CreatedDt", sortDirection]);
          break;
      }

      if (sortField !== "ID") {
        order.push(["ID", "DESC"]);
      }

      const defaultStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const defaultEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      defaultEnd.setUTCDate(defaultEnd.getUTCDate() - 1);
      defaultEnd.setUTCHours(23, 59, 59, 999);

      const start = startDate
        ? convertToSequalizeDate(`${startDate}T00:00:00.000Z`)
        : defaultStart;
      const end = endDate
        ? convertToSequalizeDate(`${endDate}T23:59:59.999Z`)
        : defaultEnd;

      let where: any = {
        [Op.and]: [
          { Is_Deleted: false },
          { Invoice_Category_id: 3 },
          { Vendor_id: vendorId },
          { CoCd: entityId },
          {
            InvDt: {
              [Op.gte]: start,
              [Op.lt]: end,
            },
          },
          {
            [Op.or]: [
              { CreatedBy: userId },
              { Invoice_Status_Id: { [Op.ne]: 101 } },
            ],
          },
        ],
      };

      if (currency) {
        where.InvCurr = currency;
      }

      if (search) {
        where.InvNo = { [Op.like]: `%${search}%` };
      }

      if (status) {
        if (status == 1) {
          where.Invoice_Status_Id = 100;
        }

        if (status == 7) {
          where.Invoice_Status_Id = 101;
        }

        if (status == 6) {
          where.Invoice_Status_Id = 999;
        }

        if (status == 4) {
          where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        }

        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }

        if (status == 5) {
          where.Invoice_Status_Id = {
            [Op.in]: [10, 13, 16, 17],
          };
        }
      }

      const createdPersonInclude = {
        model: User,
        as: "created_person",
        attributes: ["ID", "Name", "role_id"],
      };

      const invoices = await InvoiceHeader.findAndCountAll({
        where,
        limit: limitNumber,
        offset,
        order,
        include: [
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
      });

      const result = pagination.paginationData(
        limitNumber,
        pageNumber,
        invoices,
      );

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async logisticsListByMonthForAdmin({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
    emp_id,
    role_id,
    vendorId,
    startDate,
    endDate,
    currency,
    status,
    category,
    search,
    entityId,
    vendorIds,
  }: any) {
    try {
      const pageNumber = page ? parseInt(page) : 1;
      const limitNumber = limit ? parseInt(limit) : 15;
      const offset = (pageNumber - 1) * limitNumber;

      const sortField = sort_column || "CreatedDt";
      const sortDirection = sort || "DESC";

      const order: any = [];

      switch (sortField) {
        case "InvNo":
        case "InvDt":
        case "InvCurr":
        case "InvAmt":
        case "Invoice_Status_Id":
          order.push([sortField, sortDirection]);
          break;
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "vendorDetails" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "Vendor_SAP_Code":
          order.push([
            { model: Vendor, as: "vendorDetails" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push(["CreatedDt", sortDirection]);
          break;
      }

      if (sortField !== "ID") {
        order.push(["ID", "DESC"]);
      }

      const defaultStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const defaultEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const filterStart = startDate
        ? convertToSequalizeDate(`${startDate}T00:00:00.000Z`)
        : defaultStart;

      const filterEnd = endDate
        ? convertToSequalizeDate(`${endDate}T23:59:59.999Z`)
        : defaultEnd;

      let where: any = {
        Is_Deleted: false,
        Invoice_Category_id: 3,
        InvDt: {
          [Op.between]: [filterStart, filterEnd],
        },
        CoCd: entityId,
        [Op.or]: [
          { CreatedBy: userId }, // allow own drafts
          { Invoice_Status_Id: { [Op.ne]: 101 } },
        ],
      };

      if (vendorIds && vendorIds.length > 0) {
        where.Vendor_id = { [Op.in]: vendorIds };
      }

      if (currency) {
        where.InvCurr = currency;
      }

      if (search) {
        where[Op.and] = [
          {
            [Op.or]: [
              { InvNo: { [Op.like]: `%${search}%` } },
              sequelize.where(sequelize.col("vendorDetails.Vendor_Name_EN"), {
                [Op.like]: `%${search}%`,
              }),
              sequelize.where(sequelize.col("vendorDetails.Vendor_SAP_Code"), {
                [Op.like]: `%${search}%`,
              }),
            ],
          },
        ];
      }

      if (status) {
        if (status == 1) where.Invoice_Status_Id = 100;
        if (status == 7) where.Invoice_Status_Id = 101;
        if (status == 6) where.Invoice_Status_Id = 999;
        if (status == 4) where.Invoice_Status_Id = { [Op.in]: [12, 15] };
        if (status == 2) {
          where.Invoice_Status_Id = {
            [Op.in]: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
              26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52,
              53, 54, 55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87,
              88, 89, 90,
            ],
          };
        }
        if (status == 5) {
          where.Invoice_Status_Id = { [Op.in]: [10, 13, 16, 17] };
        }
      }

      const invoices = await InvoiceHeader.findAndCountAll({
        where,
        limit: limitNumber,
        offset,
        order,
        include: [
          {
            model: VimStatus,
            as: "status",
            attributes: ["ID", "Status_classification", "Status_description"],
          },
          {
            model: Vendor,
            as: "vendorDetails",
            attributes: ["ID", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
      });

      // ===== Add Checkbox Logic =====
      const updatedRows = await Promise.all(
        (invoices.rows ?? []).map(async (inv: any) => {
          let checkBox = false; // default false

          if (role_id === 1 || role_id === 2) {
            checkBox = false;
          } else {
            const crPerson = await Employee.findOne({
              where: { ID: inv.Business_contact },
            });

            const manager = crPerson
              ? await Employee.findOne({
                where: { ID: crPerson.Reporting_Manager },
              })
              : null;

            const manager1 = manager
              ? await Employee.findOne({
                where: { ID: manager.Reporting_Manager },
              })
              : null;

            if (inv.Is_CR_Approved === null) {
              // Only CR can approve
              if (crPerson && emp_id === crPerson.ID) {
                checkBox = true;
              }
            } else if (
              inv.Is_CR_Approved === true &&
              inv.Is_Manager_Approved === null
            ) {
              // Only Manager can approve
              if (manager && emp_id === manager.ID) {
                checkBox = true;
              }
            } else if (
              inv.Is_Manager_Approved === true &&
              inv.Is_Manager1_Approved === null
            ) {
              // Only Manager1 can approve
              if (manager1 && emp_id === manager1.ID) {
                checkBox = true;
              }
            }
          }

          return {
            ...inv.toJSON(),
            checkBox,
          };
        }),
      );

      const result = pagination.paginationData(limitNumber, pageNumber, {
        ...invoices,
        rows: updatedRows,
      });

      return { status: true, data: result };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async AddPoInvoice(body: any, transaction: any) {
    try {
      body.Invoice_Category_id = 1;

      const data = await InvoiceHeader.create(body, { transaction });

      // Group PO Details
      let count = 0;
      const groupedByPONo: any = {};
      const invoiceDetails = [];
      const podetailUpdates = [];

      for (let item of body.PO_Details) {
        item.Invoice_Header_Id = data.ID;
        item.PO_Qty = item.Qty;
        item.Tax_Amt = parseFloat((item.Tax_Amt || 0).toFixed(2));
        invoiceDetails.push(item);
      }

      // Bulk create InvoiceDetails
      if (invoiceDetails.length > 0) {
        await InvoiceDetail.bulkCreate(invoiceDetails, { transaction });
      }

      // Fetch vendor and entity in parallel
      const [vendor, entity] = await Promise.all([
        Vendor.findOne({ where: { ID: body.Vendor_id } }),
        Entity.findOne({
          where: { CoCd: body.CoCd },
          attributes: ["Entity_Name", "CoCd", "Vim_Email"],
        }),
      ]);

      const attachments = body.upload_file?.map(
        (file: {
          attachment_type: any;
          upload_files: any;
          originalName: any;
        }) => ({
          filename: file.originalName, // or a custom name
          path: file.upload_files, // or use 'content' if you have the buffer
          // You can add 'contentType' if needed
        }),
      );

      let totalPoNo: any;

      if (body.PO_Details?.length > 0) {
        const uniquePOs = [...new Set(body.PO_Details.map((d: any) => d.PONo))];
        totalPoNo = uniquePOs; // If you want list of POs
      } else {
        totalPoNo = [];
      }

      if (body.Invoice_Status_Id != 101) {
        const links: any = await userService.socialLinks(data.CoCd);

        await constructMail.sendPOInvoiceSubmissionToVIM({
          email: entity?.Vim_Email,
          user: "VIM",
          subject: `Invoice Submission Notification from ${vendor?.Vendor_Name_EN}`,
          vendorName: vendor?.Vendor_Name_EN,
          entityCode: entity?.CoCd,
          entityName: entity?.Entity_Name,
          vendorCode: vendor?.Vendor_SAP_Code,
          invoiceRef: body.InvNo,
          poCode: totalPoNo || "NON PO",
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async editPoInvoice(body: any, transaction: any) {
    try {
      body.Invoice_Category_id = 1;

      let count = 0;
      const groupedByPONo: any = {};
      const invoiceDetails = [];
      const podetailUpdates: any = [];

      const updateInvoice = await InvoiceHeader.update(
        {
          InvNo: body.InvNo,
          InvDt: convertToSequalizeDate(body.InvDt),
          Payment_Terms: body.Payment_Terms,
          InvCurr: body.InvCurr,
          Invoice_Due_Date: body.Invoice_Due_Date,
          Tax_percentage: body.Tax_percentage,
          InvAmt: body.InvAmt.toFixed(2),
          Tax_amount: body.Tax_amount,
          Invoice_Status_Id: body.Invoice_Status_Id,
        },
        {
          where: { ID: body.ID },
          transaction: transaction,
        },
      );
      let totalPoNo: any;

      if (body.PO_Details?.length > 0) {
        const uniquePOs = [...new Set(body.PO_Details.map((d: any) => d.PONo))];
        totalPoNo = uniquePOs; // If you want list of POs
      } else {
        totalPoNo = [];
      }

      const attachments = body.upload_file?.map(
        (file: {
          attachment_type: any;
          upload_files: any;
          originalName: any;
        }) => ({
          filename: file.originalName, // or a custom name
          path: file.upload_files, // or use 'content' if you have the buffer
          // You can add 'contentType' if needed
        }),
      );

      const [vendor, entity] = await Promise.all([
        Vendor.findOne({ where: { ID: body.Vendor_id } }),
        Entity.findOne({
          where: { CoCd: body.CoCd },
          attributes: ["Entity_Name", "CoCd", "Vim_Email"],
        }),
      ]);

      if (body.Invoice_Status_Id == 100) {
        const links: any = await userService.socialLinks(body.CoCd);

        await constructMail.sendPOInvoiceSubmissionToVIM({
          email: entity?.Vim_Email,
          user: "VIM",
          subject: `Invoice Submission Notification from ${vendor?.Vendor_Name_EN}`,
          vendorName: vendor?.Vendor_Name_EN,
          entityCode: entity?.CoCd,
          entityName: entity?.Entity_Name,
          vendorCode: vendor?.Vendor_SAP_Code,
          invoiceRef: body.InvNo,
          poCode: totalPoNo || "NON PO",
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      return { status: true, data: updateInvoice };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async editNonPoInvoice(body: any, transaction: any) {
    try {
      body.Invoice_Category_id = 2;

      const data = await InvoiceHeader.update(body, {
        where: { ID: body.ID },
        transaction: transaction,
      });
      let findData = await InvoiceHeader.findOne({ where: { ID: body.ID } });

      let vendor = await Vendor.findOne({ where: { ID: body.Vendor_id } });

      let entity = await Entity.findOne({
        where: { CoCd: body.CoCd },
        attributes: ["Entity_Name", "CoCd", "Vim_Email"],
      });

      const attachments = body.upload_file?.map(
        (file: {
          attachment_type: any;
          upload_files: any;
          originalName: any;
        }) => ({
          filename: file.originalName, // or a custom name
          path: file.upload_files, // or use 'content' if you have the buffer
          // You can add 'contentType' if needed
        }),
      );

      const crPerson = await Employee.findOne({
        where: { ID: body.Business_contact },
        attributes: ["Employee_Name"],
      });

      if (body.Invoice_Status_Id == 100) {
        const links: any = await userService.socialLinks(findData?.CoCd);

        await constructMail.sendNonPoInvoiceSubmissionToVIM({
          email: entity?.Vim_Email,
          user: "VIM",
          subject: `Invoice Submission Notification from ${vendor?.Vendor_Name_EN}`,
          vendorName: vendor?.Vendor_Name_EN,
          entityCode: entity?.CoCd,
          entityName: entity?.Entity_Name,
          vendorCode: vendor?.Vendor_SAP_Code,
          invoiceRef: body.InvNo,
          poCode: "NON PO",
          crName: crPerson?.Employee_Name,
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async editCreditInvoices(body: any, transaction: any) {
    try {
      body.Invoice_Category_id = 4;

      const data = await InvoiceHeader.update(body, {
        where: { ID: body.ID },
        transaction: transaction,
      });
      const attachments = body.upload_files?.map(
        (file: {
          attachment_type: any;
          upload_files: any;
          originalName: any;
        }) => ({
          filename: file.originalName, // or a custom name
          path: file.upload_files, // or use 'content' if you have the buffer
          // You can add 'contentType' if needed
        }),
      );

      let findVendor = await Vendor.findOne({ where: { ID: body.Vendor_id } });

      const getEntity = await Entity.findOne({
        where: { CoCd: body.CoCd },
        attributes: ["Entity_Name", "ID", "Vim_Email", "CoCd"],
      });

      if (body.Invoice_Status_Id == 100) {
        const links: any = await userService.socialLinks(body.CoCd);

        await constructMail.sendInvoiceSubmissionToVIM({
          email: getEntity?.Vim_Email,
          user: "VIM",
          subject: `Credit Note Submission Notification from ${findVendor?.Vendor_Name_EN}`,
          vendorName: findVendor?.Vendor_Name_EN,
          entityCode: getEntity?.CoCd,
          entityName: getEntity?.Entity_Name,
          vendorCode: findVendor?.Vendor_SAP_Code,
          invoiceRef: body.InvNo,
          poCode: "-",
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async AddNonPoInvoice(body: any, transaction: any) {
    try {
      body.Invoice_Category_id = 2;

      const data = await InvoiceHeader.create(body, {
        transaction: transaction,
      });

      let vendor = await Vendor.findOne({ where: { ID: body.Vendor_id } });

      let entity = await Entity.findOne({
        where: { CoCd: body.CoCd },
        attributes: ["Entity_Name", "CoCd", "Vim_Email"],
      });

      const attachments = body.upload_file?.map(
        (file: {
          attachment_type: any;
          upload_files: any;
          originalName: any;
        }) => ({
          filename: file.originalName, // or a custom name
          path: file.upload_files, // or use 'content' if you have the buffer
          // You can add 'contentType' if needed
        }),
      );

      const crPerson = await Employee.findOne({
        where: { ID: body.Business_contact },
        attributes: ["Employee_Name"],
      });

      if (body.Invoice_Status_Id != 101) {
        const links: any = await userService.socialLinks(data.CoCd);

        await constructMail.sendNonPoInvoiceSubmissionToVIM({
          email: entity?.Vim_Email,
          user: "VIM",
          subject: `Invoice Submission Notification from ${vendor?.Vendor_Name_EN}`,
          vendorName: vendor?.Vendor_Name_EN,
          entityCode: entity?.CoCd,
          entityName: entity?.Entity_Name,
          vendorCode: vendor?.Vendor_SAP_Code,
          invoiceRef: body.InvNo,
          poCode: "NON PO",
          crName: crPerson?.Employee_Name,
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }
      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async AddCreditNote(body: any, transaction: any) {
    try {
      body.Invoice_Category_id = 4;
      if (body.Invoice_Status_Id == null) {
        body.Invoice_Status_Id = 1;
      }

      const data = await InvoiceHeader.create(body, {
        transaction: transaction,
      });

      const attachments = body.upload_files?.map(
        (file: {
          attachment_type: any;
          upload_files: any;
          originalName: any;
        }) => ({
          filename: file.originalName, // or a custom name
          path: file.upload_files, // or use 'content' if you have the buffer
          // You can add 'contentType' if needed
        }),
      );

      let findVendor = await Vendor.findOne({ where: { ID: body.Vendor_id } });

      const getEntity = await Entity.findOne({
        where: { CoCd: body.CoCd },
        attributes: ["Entity_Name", "ID", "Vim_Email", "CoCd"],
      });

      const links: any = await userService.socialLinks(data.CoCd);

      await constructMail.sendInvoiceSubmissionToVIM({
        email: getEntity.Vim_Email,
        user: "VIM",
        subject: `Credit Note Submission Notification from ${findVendor.Vendor_Name_EN}`,
        vendorName: findVendor.Vendor_Name_EN,
        entityCode: getEntity.CoCd,
        entityName: getEntity.Entity_Name,
        vendorCode: findVendor.Vendor_SAP_Code,
        invoiceRef: body.InvNo,
        poCode: data.Inv_id_List ? data.Inv_id_List : "-",
        attachments,
        linkedIn: links.LinkedIn_Link,
        facebook: links.Facebook_Link,
        instagram: links.Instagram_Link,
        twitter: links.Twitter_Link,
        youtube: links.YouTube_Link,
      });

      if (body.Invoice_Status_Id != 101) {
        const links: any = await userService.socialLinks(data.CoCd);

        await constructMail.sendInvoiceSubmissionToVIM({
          email: getEntity.Vim_Email,
          user: "VIM",
          subject: `Credit Note Submission Notification from ${findVendor.Vendor_Name_EN}`,
          vendorName: findVendor.Vendor_Name_EN,
          entityCode: getEntity.CoCd,
          entityName: getEntity.Entity_Name,
          vendorCode: findVendor.Vendor_SAP_Code,
          invoiceRef: body.InvNo,
          poCode: data.Inv_id_List ? data.Inv_id_List : "-",
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      return { status: true, data: data };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async AddLogisticsInvoice(
    body: any,
    vendor_id: number,
    parsedData: any[],
    invoiceFiles: any,
    user_id: any,
    fileName: any,
  ) {
    const transaction = await sequelize.transaction();
    let Category_id = 3;

    try {
      if (!parsedData || parsedData.length === 0) {
        throw new Error("Parsed data is empty or invalid.");
      }

      if (body.Invoice_Status_Id == null) {
        body.Invoice_Status_Id = 1;
      }

      const invoices: InvoiceHeader[] = [];
      const invoiceList: {
        number: string;
        date: string | null;
        amount: number | null;
      }[] = [];

      function excelSerialToDate(serial: number): string | null {
        if (!serial || typeof serial !== "number") return null;
        const utcDays = Math.floor(serial - 25569);
        const date = new Date(utcDays * 86400000);
        return date.toISOString().split("T")[0];
      }

      function parseDate(input: any): string | null {
        if (!input) return null;
        if (typeof input === "number") return excelSerialToDate(input);

        if (typeof input === "string") {
          const isoDate = new Date(input);
          if (!isNaN(isoDate.getTime())) {
            return isoDate.toISOString().split("T")[0];
          }

          const ddmmyyyyMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (ddmmyyyyMatch) {
            const [_, day, month, year] = ddmmyyyyMatch;
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }

          const mmddyyyyMatch = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (mmddyyyyMatch) {
            const [_, month, day, year] = mmddyyyyMatch;
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }

          const parsed = Date.parse(input);
          if (!isNaN(parsed)) {
            return new Date(parsed).toISOString().split("T")[0];
          }
        }
        return null;
      }

      function excelDateToJSDate(input: any) {
        if (!input) return null;

        //  Excel serial date
        if (!isNaN(input)) {
          const date = new Date(Math.round((input - 25569) * 86400 * 1000));
          // return in UTC to avoid timezone shift
          return new Date(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
          )
            .toISOString()
            .substring(0, 10);
        }

        //  String format (DD-MM-YYYY or DD/MM/YYYY)
        if (typeof input === "string") {
          const parts = input.includes("-")
            ? input.split("-")
            : input.split("/");
          if (parts.length === 3) {
            const [day, month, year] = parts.map((p) => parseInt(p, 10));
            // Use UTC constructor to avoid timezone offset issues
            const date = new Date(Date.UTC(year, month - 1, day));
            return date.toISOString().substring(0, 10);
          }
        }

        return null;
      }

      // process invoices
      for (const row of parsedData) {
        let invoiceDate: string | null = null;
        try {
          const invDateRaw =
            row["Inv Date"] ||
            row["Inv Date(DD-MM-YYYY)"] ||
            row["Invoice Date"];

          invoiceDate = excelDateToJSDate(invDateRaw);
          const parsedInvoiceDate = new Date(invoiceDate);
          if (isNaN(parsedInvoiceDate.getTime())) {
            throw new Error(`Invalid invoice date format: ${invDateRaw}`);
          }

          const invoiceDateOnly = new Date(parsedInvoiceDate);
          invoiceDateOnly.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (invoiceDateOnly.getTime() > today.getTime()) {
            throw new Error(
              "Invalid invoice date: Future dates are not allowed.",
            );
          }
        } catch (dateError) {
          logger.error("Error:", dateError);
          throw dateError;
        }

        const invoiceNumber = row["Inv Number"] || null;
        if (!invoiceNumber) {
          throw new Error("Inv Number is required in each row.");
        }

        const currency = row["Inv Curr"]?.trim();
        if (currency && !/^[A-Z]{3}$/.test(currency)) {
          throw new Error(
            `Invalid currency format: '${currency}'. Please use the 3-letter ISO currency code.`,
          );
        }

        const amountRaw = row["Final Inv Amount"];
        if (
          amountRaw !== null &&
          amountRaw !== undefined &&
          (typeof amountRaw === "string" || isNaN(Number(amountRaw)))
        ) {
          throw new Error(
            `Invalid amount format: '${amountRaw}'. Please provide a valid number.`,
          );
        }

        const existingInvoice = await InvoiceHeader.findOne({
          where: {
            InvNo: String(invoiceNumber),
            CoCd: body.CoCd,
            Is_Deleted: false,
          },

          transaction,
        });
        if (existingInvoice) {
          throw new Error(`Invoice Number ${invoiceNumber} already exists.`);
        }
        const newInvoice = await InvoiceHeader.create(
          {
            Employee_Code: body.costResponsible,
            Vendor_id: vendor_id,
            Invoice_Category_id: 3,
            Business_contact: body.cost_responsible,
            Payment_Status: "Pending",
            InvCurr: row["Inv Curr"] || null,
            InvAmt: row["Final Inv Amount"] || null,
            InvNo: row["Inv Number"] || null,
            InvDt: invoiceDate ? invoiceDate.substring(0, 10) : null,
            CoCd: body.CoCd || null,
            Invoice_Status_Id: body.Invoice_Status_Id,
            CreatedBy: user_id,
            Logistics_XLS: body.excel_file,
            Original_FileName: fileName.originalName,
          },
          { transaction },
        );

        invoices.push(newInvoice);

        // store for email list
        invoiceList.push({
          number: invoiceNumber,
          date: invoiceDate || null,
          amount: row["Final Inv Amount"] || null,
        });
      }
      const findVendor = await Vendor.findOne({ where: { ID: vendor_id } });

      let changedFile: any;
      if (Array.isArray(invoiceFiles)) {
        changedFile = invoiceFiles;
      } else if (typeof invoiceFiles === "string") {
        try {
          changedFile = JSON.parse(invoiceFiles);
          if (typeof changedFile === "string") changedFile = [changedFile];
        } catch {
          changedFile = invoiceFiles.split(",").map((f) => f.trim());
        }
      } else {
        changedFile = [];
      }

      if (changedFile && changedFile.length > 0) {
        const filesData: any[] = [];
        let totalPDFCount = 0;
        const unmatchedFiles: string[] = [];
        const unmatchedInvoices: string[] = [];

        for (const zipFileUrl of changedFile) {
          try {
            // 🔹 Extract relative path after `/uploads/`
            const zipFileRelativePath = zipFileUrl.replace(
              /^.*\/uploads\//,
              "",
            );

            // 🔹 Build full local file path using VENDOR_FOLDER_PATH
            const fullZipPath = path.join(
              process.env.VENDOR_FOLDER_PATH!,
              zipFileRelativePath,
            );

            // 🔹 Prepare extract directory
            const extractPath = path.join(
              __dirname,
              "../../temp_extract",
              Date.now().toString(),
            );
            fs.mkdirSync(extractPath, { recursive: true });

            // 🔹 Extract ZIP
            const extract = require("extract-zip");
            await extract(fullZipPath, { dir: extractPath });

            // 🔹 Recursive helper to fetch all extracted files
            function getAllFiles(dirPath: string): string[] {
              const files: string[] = [];
              const items = fs.readdirSync(dirPath);
              for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                  files.push(...getAllFiles(fullPath));
                } else {
                  files.push(path.relative(extractPath, fullPath));
                }
              }
              return files;
            }

            const extractedFiles = getAllFiles(extractPath);
            totalPDFCount += extractedFiles.length;

            for (const filePath of extractedFiles) {
              const fileName = path.basename(filePath);
              const fileNameWithoutExt = path.parse(fileName).name;

              const matchingInvoice = invoices.find((invoice) => {
                const invoiceNumber = invoice.InvNo;
                return (
                  fileNameWithoutExt.includes(invoiceNumber) ||
                  invoiceNumber.includes(fileNameWithoutExt)
                );
              });

              if (matchingInvoice) {
                const sourcePath = path.join(extractPath, filePath);
                const fileBuffer = fs.readFileSync(sourcePath);
                const fileExtension = path.extname(fileName);

                // ✅ Determine vendor folder dynamically
                const vendorCode = (
                  findVendor?.Vendor_SAP_Code || "DEFAULT_VENDOR"
                ).toUpperCase();
                const baseVendorDir = path.join(
                  process.env.VENDOR_FOLDER_PATH!,
                  vendorCode,
                  "LOGISTICS INVOICE",
                );

                // Ensure folder exists
                fs.mkdirSync(baseVendorDir, { recursive: true });

                // ✅ Keep exact filename from ZIP (no sanitization)
                let finalFileName = fileName;
                let counter = 1;

                // ✅ Handle duplicates → filename(1).pdf, filename(2).pdf, etc.
                while (fs.existsSync(path.join(baseVendorDir, finalFileName))) {
                  const base = path.parse(fileName).name;
                  const ext = path.extname(fileName);
                  finalFileName = `${base}(${counter})${ext}`;
                  counter++;
                }

                // ✅ Final upload path
                const uploadPath = path.join(baseVendorDir, finalFileName);

                // Write file with exact name (or duplicate-handled name)
                fs.writeFileSync(uploadPath, fileBuffer);

                // Construct public URL
                const relativePath = path
                  .join(vendorCode, "LOGISTICS INVOICE", finalFileName)
                  .replace(/\\/g, "/");

                const publicUrl = `${process.env.BASE_URL || "http://localhost:8000"
                  }/vendor-portal/uploads/${relativePath}`;

                filesData.push({
                  Main_Id: matchingInvoice.ID,
                  Category_id: 4,
                  Upload_files: publicUrl,
                  Attachment_type: fileExtension.substring(1) || "unknown",
                  File_name: finalFileName, // ✅ exact filename
                });
              } else {
                unmatchedFiles.push(fileName);
              }
            }

            // Cleanup extracted files
            fs.rmSync(extractPath, { recursive: true, force: true });
          } catch (error) {
            logger.error("Error:", error);
          }
        }

        if (totalPDFCount !== parsedData.length) {
          throw new Error(
            `File count mismatch: Excel has ${parsedData.length} invoices but ZIP contains ${totalPDFCount} files. Please ensure the number of files in the ZIP matches the number of invoices in the Excel.`,
          );
        }

        const matchedInvoiceIds = filesData.map((f: any) => f.Main_Id);
        invoices.forEach((invoice) => {
          if (!matchedInvoiceIds.includes(invoice.ID)) {
            unmatchedInvoices.push(invoice.InvNo);
          }
        });

        if (unmatchedFiles.length > 0 || unmatchedInvoices.length > 0) {
          let errorMsg = "Invoice and file mismatch detected. ";
          if (unmatchedFiles.length > 0) {
            errorMsg += `Files without matching invoices: ${unmatchedFiles.join(
              ", ",
            )}. `;
          }
          if (unmatchedInvoices.length > 0) {
            errorMsg += `Invoices without matching files: ${unmatchedInvoices.join(
              ", ",
            )}.`;
          }
          throw new Error(errorMsg);
        }

        if (filesData.length > 0) {
          await UploadFiles.bulkCreate(filesData, { transaction });
        }
      }

      const crPerson = await User.findOne({
        where: { Employee_Id: body.cost_responsible },
        attributes: ["ID", "Email", "Name"],
      });

      const attachments = body.upload_file?.map(
        (file: { attachment_type: any; upload_files: any }) => ({
          filename: file.attachment_type,
          path: file.upload_files,
        }),
      );

      const links: any = await userService.socialLinks(body.CoCd);
      if (body.Invoice_Status_Id == 100) {
        await constructMail.sendLogisticsToCR({
          email: crPerson.Email,
          user: crPerson.Name,
          subject: `Logistics Invoice Submission Notification from ${findVendor.Vendor_Name_EN}`,
          vendorName: findVendor.Vendor_Name_EN,
          vendorCode: findVendor.Vendor_SAP_Code,
          invoiceList,
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      await transaction.commit();
      return {
        status: true,
        data: invoices,
        crPersonId: crPerson.ID,
        vendor: findVendor,
      };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      return { status: false, data: error?.message };
    }
  }

  async invoiceDropdown({ vendor_id, category }: any) {
    try {
      let where: any = {
        Is_Deleted: false,
        Vendor_id: vendor_id,
        Invoice_Category_id: category,
        Invoice_Status_Id: { [Op.in]: [12, 15] },
      };

      const invoices = await InvoiceHeader.findAll({
        where,
        attributes: ["ID", "InvNo"],
      });

      return { status: true, data: invoices };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async editLogisticsInvoice(body: any, vendor_id: any, transaction: any) {
    try {
      body.Invoice_Category_id = 3;
      body.InvDt = convertToSequalizeDate(body.InvDt);

      // Update the invoice header
      await InvoiceHeader.update(body, {
        where: { ID: body.ID },
        transaction: transaction,
      }); // Fetch vendor_id from InvoiceHeader if not provided
      let invoice: any;
      if (!vendor_id) {
        invoice = await InvoiceHeader.findOne({
          where: { ID: body.ID },
          attributes: [
            "ID",
            "Vendor_id",
            "InvNo",
            "InvDt",
            "InvAmt",
            "Logistics_XLS",
          ],
          transaction,
        });
        if (invoice && invoice.Vendor_id) vendor_id = invoice.Vendor_id;
        else throw new APIError("Vendor not found in InvoiceHeader", 404);
      } else {
        invoice = await InvoiceHeader.findOne({
          where: { ID: body.ID },
          attributes: [
            "ID",
            "Vendor_id",
            "InvNo",
            "InvDt",
            "InvAmt",
            "Logistics_XLS",
          ],
          transaction,
        });
      }

      if (!invoice) {
        throw new APIError("Invoice not found in InvoiceHeader", 404);
      }

      const invoiceList = [
        {
          number: invoice?.InvNo,
          date: invoice?.InvDt,
          amount: invoice?.InvAmt,
        },
      ];

      const uploadedFiles = await UploadFiles.findAll({
        where: { Main_Id: invoice?.ID, Category_id: 4 },
        attributes: ["Upload_files", "Attachment_type"],
        transaction,
      });

      const attachments = (uploadedFiles ?? []).map((f: any) => ({
        filename: f.Attachment_type,
        path: f.Upload_files,
      }));

      const crPerson = await User.findOne({
        where: { Employee_Id: body.cost_responsible },
        attributes: ["ID", "Email", "Name"],
      });

      const findVendor = await Vendor.findOne({ where: { ID: vendor_id } });
      const links: any = await userService.socialLinks(body.CoCd);

      if (body.Invoice_Status_Id == 100) {
        await constructMail.sendLogisticsToCR({
          email: crPerson?.Email,
          user: crPerson?.Name,
          subject: `Logistics Invoice Submission Notification from ${findVendor?.Vendor_Name_EN}`,
          vendorName: findVendor?.Vendor_Name_EN,
          vendorCode: findVendor?.Vendor_SAP_Code,
          invoiceList,
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      return {
        status: true,
        data: invoice,
        crPersonId: crPerson?.ID,
        vendor: findVendor,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async checkDuplicateInvNo(invNo: string) {
    try {
      const invExists = await InvoiceHeader.findOne({
        where: {
          InvNo: invNo,
          Is_Deleted: false,
        },
      });

      if (invExists) {
        return { exists: true, invoice: invExists };
      } else {
        return { exists: false };
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async findPaymentTerms(Payment_Terms: string) {
    try {
      let invExists = await MasterCodes.findOne({
        where: {
          Description_En: Payment_Terms,
          Type: "REGISTRATION_PAYMENT_TERMS",
        },
        attributes: ["Code"],
      });

      invExists = invExists?.get?.({ plain: true });

      if (invExists) {
        return { exists: true, data: invExists };
      } else {
        return { exists: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async findPaymentTermsForPO(Payment_Terms: string) {
    try {
      let invExists = await MasterCodes.findOne({
        where: {
          Description_En: Payment_Terms,
          Type: "PAYMENT_TERMS",
        },
        attributes: ["Code"],
      });

      invExists = invExists?.get?.({ plain: true });

      if (invExists) {
        return { exists: true, data: invExists };
      } else {
        return { exists: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async findPaymentTermsDescByCode(Payment_Terms: string) {
    try {
      let invExists = await MasterCodes.findOne({
        where: {
          Code: Payment_Terms,
          Type: "PAYMENT_TERMS",
        },
        attributes: ["Description_En", "Code"],
      });

      if (invExists) {
        invExists = invExists?.get?.({ plain: true });
        return { exists: true, data: invExists };
      } else {
        return { exists: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async logisticsApproval(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    rejectionReason: string,
    userData: { id: number; vendor_id: number },
    skipEmail: boolean = false,
  ) {
    const transaction = await sequelize.transaction();
    try {
      const vendorUpdate: any = await InvoiceHeader.findOne({
        where: { ID: updateId },
        include: [
          {
            model: Employee,
            as: "cr_person_data",
            required: false,
          },
          {
            model: Vendor,
            as: "vendorDetails",
            required: false,
          },
          {
            model: UploadFiles,
            as: "upload_files",
            required: false,
          },
        ],
      });

      const uploadedFiles = await UploadFiles.findAll({
        where: {
          Main_Id: updateId,
          Is_deleted: false,
        },
      });

      const attachmentUrls = uploadedFiles
        .map((file) => file?.Upload_files)
        .filter((url) => !!url);

      let findManager = await Employee.findOne({
        where: { ID: vendorUpdate.cr_person_data.Reporting_Manager },
      });

      let findManager2 = await Employee.findOne({
        where: { ID: findManager.Reporting_Manager },
      });

      let findManager3 = await Employee.findOne({
        where: { ID: findManager2.Reporting_Manager },
      });

      let findName = await User.findOne({
        where: { Employee_Id: findManager.ID },
      });

      const crPersonUser = await User.findOne({
        where: { Employee_Id: vendorUpdate.Business_contact },
      });

      const vendorUser = await User.findOne({
        where: { Vendor_Id: vendorUpdate.Vendor_id },
      });

      let findName2 = await User.findOne({
        where: { Employee_Id: findManager2.ID },
      });

      const links: any = await userService.socialLinks(vendorUpdate.CoCd);

      if (!vendorUpdate)
        throw new APIError(
          "application not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );

      if (
        vendorUpdate.Status === StatusEnum.Approved ||
        vendorUpdate.Is_Added_To_Vendor
      )
        throw new APIError(
          "Application already approved",
          StatusCodeEnum.HTTP_OK,
        );

      // ========================================
      // CR PERSON APPROVAL/REJECTION
      // ========================================
      if (vendorUpdate.Business_contact == curUserId) {
        if (vendorUpdate.Is_CR_Approved)
          throw new APIError(
            "Already approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await InvoiceHeader.update(
          {
            Is_CR_Approved: isApproved,
            CR_Approved_date: isApproved
              ? Sequelize.literal("NOW()")
              : null,
            Invoice_Status_Id: isApproved ? StatusEnum["Under Review"] : 10,
          },
          { where: { ID: updateId }, transaction },
        );

        //  APPROVAL FLOW
        if (isApproved) {
          //  Email (skip in bulk mode)
          if (!skipEmail) {
            await constructMail.sendCrToManager1RequestEmail({
              email: findManager.Email,
              user: findManager.Employee_Name,
              subject: `Request for Approval/Rejection of Logistics Invoice`,
              vendorName: vendorUpdate.vendorDetails.Vendor_Name_EN,
              invoiceNumber: vendorUpdate.InvNo,
              amount: vendorUpdate.InvAmt,
              managerName: findManager.Employee_Name,
              attachmentUrls,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });
          }

          //  Notification (always send)
          if (crPersonUser) {
            await notiticationService.createNotification({
              User_Id: findName.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `New Logistic invoice request for ${vendorUpdate?.vendorDetails?.Vendor_Name_EN} has been approved by the Cr. Please review and take appropriate action.`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate?.ID,
              CreatedBy: userData?.id,
            });
          }
        }

        //  REJECTION FLOW
        if (!isApproved) {
          //  Email (skip in bulk mode)
          if (!skipEmail) {
            await constructMail.sendVendorRejectLogisticsEmail({
              email: vendorUpdate.vendorDetails.Email,
              subject: `Your logistics invoice has been rejected.`,
              vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
              invoiceNumber: vendorUpdate?.InvNo,
              rejectionReason: rejectionReason,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });
          }

          //  Notification (always send)
          if (vendorUser) {
            await notiticationService.createNotification({
              User_Id: vendorUser?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `Your logistic invoice request ${vendorUpdate?.InvNo} has been rejected. Reason of rejection: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate?.ID,
              CreatedBy: userData?.id,
            });
          }
        }
      }

      // ========================================
      // MANAGER 1 APPROVAL/REJECTION
      // ========================================
      if (vendorUpdate.cr_person_data.Reporting_Manager === curUserId) {
        if (!vendorUpdate?.Is_CR_Approved)
          throw new APIError(
            "Not approved by CR",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        if (vendorUpdate.Is_Manager_Approved)
          throw new APIError(
            "Already approved by manager",
            StatusCodeEnum.HTTP_BAD_REQUEST,
          );

        await InvoiceHeader.update(
          {
            Is_Manager_Approved: isApproved,
            Manager_Approved_Dt: Sequelize.literal("NOW()"),
            Invoice_Status_Id: isApproved ? StatusEnum["Under Review"] : 10,
          },
          { where: { ID: updateId }, transaction },
        );

        //  APPROVAL FLOW
        if (isApproved) {
          // Email (skip in bulk mode)
          if (!skipEmail) {
            await constructMail.sendManager1ToManager2RequestEmail({
              email: findManager2?.Email,
              user: findManager2?.Employee_Name,
              subject: `Request for Approval/Rejection of Logistics Invoice`,
              vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
              invoiceNumber: vendorUpdate?.InvNo,
              amount: vendorUpdate?.InvAmt,
              managerName: findManager?.Employee_Name,
              attachmentUrls,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });
          }

          //  Notification (always send)
          if (findName2) {
            await notiticationService.createNotification({
              User_Id: findName2?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `New Logistic invoice request for ${vendorUpdate?.vendorDetails?.Vendor_Name_EN} has been approved by ${findManager?.Employee_Name}.`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate?.ID,
              CreatedBy: userData?.id,
            });
          }
        }

        //  REJECTION FLOW
        if (!isApproved) {
          //  Emails (skip in bulk mode)
          if (!skipEmail) {
            if (crPersonUser) {
              await constructMail.sendRejectLogisticsToCrEmail({
                email: vendorUpdate?.cr_person_data?.Email,
                user: vendorUpdate?.cr_person_data?.Employee_Name,
                subject: `Vendor logistics invoice has been rejected`,
                vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
                invoiceNumber: vendorUpdate?.InvNo,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });
            }

            if (vendorUser) {
              await constructMail.sendVendorRejectLogisticsEmail({
                email: vendorUpdate?.vendorDetails?.Email,
                subject: `Your logistics invoice has been rejected.`,
                vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
                invoiceNumber: vendorUpdate?.InvNo,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });
            }
          }

          //  Notifications (always send)
          if (crPersonUser) {
            await notiticationService.createNotification({
              User_Id: crPersonUser?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `Logistics invoice submitted by ${vendorUpdate?.vendorDetails?.Vendor_Name_EN
                } with Invoice Number ${vendorUpdate.InvNo
                } has been rejected by the Manager on ${new Date().toDateString()}. Reason of rejection: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate?.ID,
              CreatedBy: userData?.id,
            });
          }

          if (vendorUser) {
            await notiticationService.createNotification({
              User_Id: vendorUser?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `Your logistic invoice request ${vendorUpdate?.InvNo
                } has been rejected on ${new Date().toDateString()}. Reason of rejection: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate?.ID,
              CreatedBy: userData?.id,
            });
          }
        }
      }

      // ========================================
      // MANAGER 2 APPROVAL/REJECTION
      // ========================================

      if (findManager2.ID == curUserId) {
        await InvoiceHeader.update(
          {
            Is_Manager1_Approved: isApproved,
            Manager1_Approved_Dt: Sequelize.literal("NOW()"),
            Invoice_Status_Id: isApproved ? StatusEnum["Under Review"] : 10,
          },
          { where: { ID: updateId }, transaction },
        );

        //  APPROVAL FLOW
        if (isApproved) {
          //  Email to VIM (skip in bulk mode)

          const entity = await Entity.findOne({
            where: { CoCd: vendorUpdate?.CoCd },
          });

          if (entity) {
            await constructMail.sendManager2ToVimRequestEmail({
              email: entity?.Vim_Email,
              entity_code: entity?.CoCd,
              entity_name: entity?.Entity_Name,
              subject: `Invoice Submission Notification from ${vendorUpdate?.vendorDetails?.Vendor_Name_EN}`,
              vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
              invoiceNumber: vendorUpdate?.InvNo,
              vendor_code: vendorUpdate?.vendorDetails?.Vendor_SAP_Code,
              attachmentUrls,
              linkedIn: links.LinkedIn_Link,
              facebook: links.Facebook_Link,
              instagram: links.Instagram_Link,
              twitter: links.Twitter_Link,
              youtube: links.YouTube_Link,
            });
          }
        }

        //  REJECTION FLOW
        if (!isApproved) {
          //  Emails (skip in bulk mode)
          if (!skipEmail) {
            if (crPersonUser) {
              await constructMail.sendRejectLogisticsToCrEmail({
                email: vendorUpdate?.cr_person_data?.Email,
                user: vendorUpdate?.cr_person_data?.Employee_Name,
                subject: `Vendor logistics invoice has been rejected`,
                vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
                invoiceNumber: vendorUpdate?.InvNo,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });
            }

            if (vendorUser) {
              await constructMail.sendVendorRejectLogisticsEmail({
                email: vendorUpdate?.vendorDetails?.Email,
                subject: `Your logistics invoice has been rejected`,
                vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
                invoiceNumber: vendorUpdate?.InvNo,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });
            }

            if (findManager) {
              await constructMail.sendRejectLogisticsToCrEmail({
                email: findManager?.Email,
                user: findManager?.Employee_Name,
                subject: `Vendor logistics invoice has been rejected`,
                vendorName: vendorUpdate?.vendorDetails?.Vendor_Name_EN,
                invoiceNumber: vendorUpdate?.InvNo,
                rejectionReason: rejectionReason,
                linkedIn: links.LinkedIn_Link,
                facebook: links.Facebook_Link,
                instagram: links.Instagram_Link,
                twitter: links.Twitter_Link,
                youtube: links.YouTube_Link,
              });
            }
          }

          //  Notifications (always send)
          if (crPersonUser) {
            await notiticationService.createNotification({
              User_Id: crPersonUser?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `Logistics invoice submitted by ${vendorUpdate?.vendorDetails?.Vendor_Name_EN
                } with Invoice Number ${vendorUpdate?.InvNo
                } has been rejected by ${findManager2?.Employee_Name
                } on ${new Date().toDateString()}. Reason of Reject: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate.ID,
              CreatedBy: userData?.id,
            });
          }

          if (vendorUser) {
            await notiticationService.createNotification({
              User_Id: vendorUser?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `Your logistic invoice request ${vendorUpdate?.InvNo
                } has been rejected on ${new Date().toDateString()}. Reason of rejection: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate.ID,
              CreatedBy: userData?.id,
            });
          }

          if (findManager) {
            await notiticationService.createNotification({
              User_Id: findName?.ID,
              Vendor_Id: vendorUpdate?.Vendor_Id,
              Entity_Id: vendorUpdate?.CoCd,
              Message: `Logistics invoice submitted by ${vendorUpdate?.vendorDetails?.Vendor_Name_EN
                } with Invoice Number ${vendorUpdate?.InvNo
                } has been rejected by ${findManager2?.Employee_Name
                } on ${new Date().toDateString()}. Reason of rejection: ${rejectionReason}`,
              Module_Category_Id: NotificationCategory.Logistics_Invoice,
              Redirect_Id: vendorUpdate.ID,
              CreatedBy: userData?.id,
            });
          }
        }
      }

      await transaction.commit();
      return {
        status: true,
        data: `Logistic Invoice Is ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      await transaction?.rollback();
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async logisticsApprovalBulk(
    curUserId: number,
    updateId: any,
    isApproved: boolean,
    rejectionReason: string,
    userData: { id: number; vendor_id: number },
  ) {
    if (!Array.isArray(updateId)) {
      return await this.logisticsApproval(
        curUserId,
        updateId,
        isApproved,
        rejectionReason,
        userData,
        false,
      );
    }

    try {
      const results = [];

      // Fetch first invoice to check user role
      const firstInvoice = await InvoiceHeader.findOne({
        where: { ID: updateId[0] },
        include: [{ model: Employee, as: "cr_person_data", required: false }],
      });

      if (!firstInvoice) {
        throw new APIError(
          "Invoice not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const findManager = await Employee.findOne({
        where: { ID: firstInvoice.cr_person_data?.Reporting_Manager },
      });

      const findManager2 = await Employee.findOne({
        where: { ID: findManager?.Reporting_Manager },
      });

      const isManager2 = findManager2?.ID === curUserId;

      // Process each invoice
      for (const id of updateId) {
        const result = await this.logisticsApproval(
          curUserId,
          id,
          isApproved,
          rejectionReason,
          userData,
          !isManager2 || !isApproved, // skipEmail: false only for Manager2 approval
        );
        results.push(result);
      }

      // Send consolidated emails (except Manager 2 approval - already sent individually)
      if (!isManager2 || !isApproved) {
        await this.sendBulkApprovalEmails(
          curUserId,
          updateId,
          isApproved,
          rejectionReason,
          userData,
        );
      }

      return {
        status: true,
        data: `Logistic Invoices ${isApproved ? "approved" : "rejected"}`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async reqCreditNote(
    body: any,
    userId: number,
    vendorId: number,
    entityId: number,
  ) {
    try {
      let data = "Request send succesfully";
      let vendor = await Vendor.findOne({
        where: { ID: body.Vendor_Ids[0] },
        attributes: [
          "ID",
          "Vendor_Name_EN",
          "Email",
          "Vendor_SAP_Code",
          "Cocd",
        ],
      });

      const InvNo = body?.Invoice_List_ids.join(", ");

      const vendorUser = await User.findOne({
        where: { Vendor_Id: vendor?.ID },
      });

      const links: any = await userService.socialLinks(vendor?.CoCd);

      await constructMail.sendCreditNoteRequestToVendor({
        email: vendor?.Email,
        user: vendor?.Vendor_Name_EN,
        subject: `Request for Credit Note - Invoice`,
        vendorName: vendor?.Vendor_Name_EN,
        vendorCode: vendor?.Vendor_SAP_Code,
        invoiceRef: InvNo,
        poCode: InvNo,
        linkedIn: links.LinkedIn_Link,
        facebook: links.Facebook_Link,
        instagram: links.Instagram_Link,
        twitter: links.Twitter_Link,
        youtube: links.YouTube_Link,
      });

      const message = `Credit Note request initiated for Invoice Ref No: ${InvNo}. Please submit the credit note at your earliest convenience.`;

      await notiticationService.createNotification({
        User_Id: vendorUser?.ID,
        Vendor_Id: vendor?.ID,
        Entity_Id: vendor?.CoCd,
        Message: message,
        CreatedBy: userId,
        Module_Category_Id: NotificationCategory.Credit_Note,
        Redirect_Id: null,
      });
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async invoiceApprove(
    vendorId: any,
    isApproved: boolean,
    userId: number,
    rejectionReason: string,
  ) {
    const transaction = await sequelize.transaction();
    try {
      const data: any = await InvoiceHeader.findOne({
        where: { Vendor_id: vendorId },
        include: {
          model: Vendor,
          as: "vendorDetails",
          required: false,
        },
      });

      const vendor = await User.findOne({
        where: { Vendor_Id: data?.Vendor_id },
      });

      const links: any = await userService.socialLinks(data?.CoCd);

      let moduleCategoryId: number;
      switch (data?.Invoice_Category_id) {
        case 1:
          moduleCategoryId = NotificationCategory.PO_Invoice;
          break;
        case 2:
          moduleCategoryId = NotificationCategory.Non_PO_Invoice;
          break;
        case 3:
          moduleCategoryId = NotificationCategory.Logistics_Invoice;
          break;
        default:
          moduleCategoryId = null;
      }

      if (isApproved) {
        await constructMail.sendInvoiceApprovedMailToVendor({
          email: vendor?.Email,
          subject: `Invoice Approval Mail to Vendor`,
          vendorName: data?.vendorDetails?.Vendor_Name_EN,
          invoiceNo: data?.InvNo,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });

        await notiticationService.createNotification({
          User_Id: vendor?.ID,
          Vendor_Id: vendor?.ID,
          Entity_Id: data?.CoCd,
          Message: `Your invoice ${data?.InvNo} has been approved successfully`,
          Module_Category_Id: moduleCategoryId,
          Redirect_Id: data?.ID,
          CreatedBy: userId,
          CreatedDt: new Date(),
        });
      }

      if (!isApproved) {
        await constructMail.sendInvoiceRejectionMailToVendor({
          email: vendor?.Email,
          subject: `Invoice Reject Mail to Vendor`,
          vendorName: data?.vendorDetails?.Vendor_Name_EN,
          invoiceNo: data?.InvNo,
          rejectionReason: rejectionReason,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });

        await notiticationService.createNotification({
          User_Id: vendor?.ID,
          Vendor_Id: vendor?.ID,
          Entity_Id: data?.CoCd,
          Message: `Your invoice ${data?.InvNo} has been rejected.`,
          Module_Category_Id: moduleCategoryId,
          Redirect_Id: data?.ID,
          CreatedBy: userId,
          CreatedDt: new Date(),
        });
      }

      await transaction.commit();
      return {
        status: true,
        data: `Your Invoice Is Approved`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async deleteInvoice(invoiceIds: number[], userId: number) {
    try {
      const invoices = await InvoiceHeader.findAll({
        where: {
          ID: { [Op.in]: invoiceIds },
          Is_Deleted: false,
        },
      });

      if (invoices.length === 0) {
        return {
          status: false,
          message: "No valid invoices found or all are already deleted.",
        };
      }

      const nonDrafts = invoices.filter((inv) => inv.Invoice_Status_Id !== 101);
      if (nonDrafts.length > 0) {
        return {
          status: false,
          message: `Only draft invoices can be deleted.`,
        };
      }

      await InvoiceHeader.update(
        {
          Is_Deleted: true,
          ModifiedBy: userId,
          ModifiedDt: Sequelize.literal("NOW()"),
        },
        {
          where: { ID: { [Op.in]: invoiceIds } },
        },
      );

      return {
        status: true,
        message: `${invoices.length} invoice(s) deleted successfully.`,
        data: invoices.map((inv) => inv.InvNo),
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendBulkApprovalEmails(
    curUserId: number,
    invoiceIds: number[],
    isApproved: boolean,
    rejectionReason: string,
    userData: { id: number; vendor_id: number },
  ) {
    try {
      // Fetch all invoice data
      const invoices = await InvoiceHeader.findAll({
        where: { ID: invoiceIds },
        include: [
          { model: Employee, as: "cr_person_data", required: false },
          { model: Vendor, as: "vendorDetails", required: false },
          { model: UploadFiles, as: "upload_files", required: false },
        ],
      });

      if (!invoices.length) return { status: true };

      const firstInvoice = invoices[0];
      if (!firstInvoice.CoCd) throw new Error("Entity not found");

      const links = (await userService.socialLinks(firstInvoice.CoCd)) as {
        LinkedIn_Link: string;
        Facebook_Link: string;
        Instagram_Link: string;
        Twitter_Link: string;
        YouTube_Link: string;
      };

      const reportingManagerId = firstInvoice.cr_person_data?.Reporting_Manager;
      if (!reportingManagerId)
        throw new Error("CR Reporting Manager not found");

      const findManager = await Employee.findOne({
        where: { ID: reportingManagerId },
      });
      if (!findManager) throw new Error("Manager 1 not found");

      const manager2Id = findManager.Reporting_Manager;
      if (!manager2Id) throw new Error("Manager 2 ID not found");

      const findManager2 = await Employee.findOne({
        where: { ID: manager2Id },
      });
      if (!findManager2) throw new Error("Manager 2 not found");

      const crPersonUser = await User.findOne({
        where: { Employee_Id: firstInvoice.Business_contact },
      });

      const findName = await User.findOne({
        where: { Employee_Id: findManager.ID },
      });
      const findName2 = await User.findOne({
        where: { Employee_Id: findManager2.ID },
      });

      //  Convert number to string
      const invoiceList = invoices.map((inv) => ({
        vendorName: inv.vendorDetails?.Vendor_Name_EN ?? "Unknown Vendor",
        invoiceNumber: inv.InvNo,
        amount: String(inv.InvAmt),
      }));

      type VendorInvoices = {
        vendorName: string;
        invoices: { invoiceNumber: string; amount: string }[];
      };

      const invoicesByVendor: Record<string, VendorInvoices> = invoices.reduce(
        (acc, inv) => {
          const vendorEmail = inv.vendorDetails?.Email;
          if (!vendorEmail) return acc;
          if (!acc[vendorEmail]) {
            acc[vendorEmail] = {
              vendorName: inv.vendorDetails?.Vendor_Name_EN ?? "Unknown Vendor",
              invoices: [],
            };
          }
          acc[vendorEmail].invoices.push({
            invoiceNumber: inv.InvNo,
            amount: String(inv.InvAmt),
          });
          return acc;
        },
        {} as Record<string, VendorInvoices>,
      );

      // ========================================
      // CR Approved - Send to Manager 1
      // ========================================
      if (firstInvoice.Business_contact === curUserId && isApproved) {
        await constructMail.sendBulkApprovalEmail({
          email: findManager.Email,
          user: findManager.Employee_Name,
          subject: `Request for Bulk Approval of ${invoiceList.length} Logistics Invoices`,
          body: `I hope this email finds you well.\n\nI am writing to seek your approval for ${invoiceList.length} vendor logistic invoices.`,
          invoices: invoiceList,
          footer: `Thank you for your prompt attention to this matter.`,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      // CR Rejected - Send to Vendors
      if (firstInvoice.Business_contact === curUserId && !isApproved) {
        for (const [email, data] of Object.entries(invoicesByVendor)) {
          await constructMail.sendBulkRejectionEmail({
            email,
            user: data.vendorName,
            subject: `Your ${data.invoices.length} Logistics Invoice(s) Have Been Rejected`,
            body: `We regret to inform you that your logistics invoice(s) have been rejected.\n\nReason: ${rejectionReason}`,
            invoices: data.invoices,
            footer: `If you have any questions or need clarification, please contact us.`,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }
      }

      // Manager 1 Approved - Send to Manager 2
      if (
        firstInvoice.cr_person_data?.Reporting_Manager === curUserId &&
        isApproved
      ) {
        await constructMail.sendBulkApprovalEmail({
          email: findManager2.Email,
          user: findManager2.Employee_Name,
          subject: `Request for Bulk Approval of ${invoiceList.length} Logistics Invoices`,
          body: `${findManager.Employee_Name} has approved ${invoiceList.length} vendor logistic invoices. Please review the invoice details below and provide your final approval.`,
          invoices: invoiceList,
          footer: `Thank you for your prompt attention to this matter.`,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      // Manager 1 Rejected - Send to CR and Vendors
      if (
        firstInvoice.cr_person_data?.Reporting_Manager === curUserId &&
        !isApproved
      ) {
        if (crPersonUser) {
          await constructMail.sendBulkRejectionEmail({
            email: firstInvoice.cr_person_data.Email,
            user: firstInvoice.cr_person_data.Employee_Name,
            subject: `${invoiceList.length} Logistics Invoices Have Been Rejected`,
            body: `The Manager has rejected ${invoiceList.length} logistics invoice(s).\n\nReason: ${rejectionReason}`,
            invoices: invoiceList,
            footer: `Please review and take appropriate action.`,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }

        for (const [email, data] of Object.entries(invoicesByVendor)) {
          await constructMail.sendBulkRejectionEmail({
            email,
            user: data.vendorName,
            subject: `Your ${data.invoices.length} Logistics Invoice(s) Have Been Rejected`,
            body: `We regret to inform you that your logistics invoice(s) have been rejected by the Manager.\n\nReason: ${rejectionReason}`,
            invoices: data.invoices,
            footer: `If you have any questions or need clarification, please contact us.`,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }
      }

      // Manager 2 Approved - Send to CR
      if (findManager2.ID === curUserId && isApproved && crPersonUser) {
        await constructMail.sendBulkApprovalEmail({
          email: firstInvoice.cr_person_data?.Email ?? "",
          user: firstInvoice.cr_person_data?.Employee_Name ?? "CR",
          subject: `${invoiceList.length} Logistics Invoices Approved by ${findManager2.Employee_Name}`,
          body: `${findManager2.Employee_Name} has approved ${invoiceList.length} logistics invoice(s). Please proceed with the next steps.`,
          invoices: invoiceList,
          footer: `Thank you.`,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });
      }

      // Manager 2 Rejected - Send to CR, Manager1 and Vendors
      if (findManager2.ID === curUserId && !isApproved) {
        if (crPersonUser) {
          await constructMail.sendBulkRejectionEmail({
            email: firstInvoice.cr_person_data?.Email ?? "",
            user: firstInvoice.cr_person_data?.Employee_Name ?? "CR",
            subject: `${invoiceList.length} Logistics Invoices Have Been Rejected`,
            body: `${findManager2.Employee_Name} has rejected ${invoiceList.length} logistics invoice(s).\n\nReason: ${rejectionReason}`,
            invoices: invoiceList,
            footer: `Please review and take appropriate action.`,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }

        if (findManager) {
          await constructMail.sendBulkRejectionEmail({
            email: findManager.Email,
            user: findManager.Employee_Name,
            subject: `${invoiceList.length} Logistics Invoices Have Been Rejected`,
            body: `${findManager2.Employee_Name} has rejected ${invoiceList.length} logistics invoice(s).\n\nReason: ${rejectionReason}`,
            invoices: invoiceList,
            footer: `Please review and take appropriate action.`,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }

        for (const [email, data] of Object.entries(invoicesByVendor)) {
          await constructMail.sendBulkRejectionEmail({
            email,
            user: data.vendorName,
            subject: `Your ${data.invoices.length} Logistics Invoice(s) Have Been Rejected`,
            body: `We regret to inform you that your logistics invoice(s) have been rejected by ${findManager2.Employee_Name}.\n\nReason: ${rejectionReason}`,
            invoices: data.invoices,
            footer: `If you have any questions or need clarification, please contact us.`,
            linkedIn: links.LinkedIn_Link,
            facebook: links.Facebook_Link,
            instagram: links.Instagram_Link,
            twitter: links.Twitter_Link,
            youtube: links.YouTube_Link,
          });
        }
      }

      return { status: true };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendApprovalMail() {
    try {
      const invoice: any = await InvoiceHeader.findAll({
        where: {
          Invoice_Status_Id: { [Op.in]: [12, 15] },
          Is_Final_Mail_Triggered: false,
        },
      });
      (invoice ?? []).forEach(async (inv: any) => {
        let findVendor = await Vendor.findOne({
          where: { ID: inv.Vendor_id },
        });
        let findEntity = await Entity.findOne({
          where: { CoCd: inv.CoCd },
        });

        await constructMail.sendInvoiceApprovalToVendor({
          email: findVendor?.Email,
          user: findVendor?.Vendor_Name_EN,
          subject: `Invoice Approved in Daikin - ${inv.InvNo}`,
          VENDOR_NAME: findVendor?.Vendor_Name_EN,
          ENTITY_CODE: inv.CoCd,
          ENTITY_NAME: findEntity?.Entity_Name,
          VENDOR_CODE: findVendor?.Vendor_SAP_Code,
          INVOICE_REF: inv.InvNo,
          INVOICE_TYPE:
            inv.Invoice_Category_id == 1
              ? "PO Invoice"
              : inv.Invoice_Category_id == 2
                ? "Non PO Invoice"
                : inv.Invoice_Category_id == 3
                  ? "Logistics Invoice"
                  : inv.Invoice_Category_id == 4
                    ? "Credit Note"
                    : "",
          IS_PO_BASED: inv.Invoice_Category_id == 1 ? true : false,
          IS_LOGISTICS: inv.Invoice_Category_id == 3 ? true : false,
          IS_CREDIT_NOTE: inv.Invoice_Category_id == 4 ? true : false,
          FACEBOOK: findEntity?.Facebook_Link,
          TWITTER: findEntity?.Twitter_Link,
          LINKEDIN: findEntity?.LinkedIn_Link,
          YOUTUBE: findEntity?.YouTube_Link,
          INSTAGRAM: findEntity?.Instagram_Link,
        });
        inv.Is_Final_Mail_Triggered = true;
        await inv.save();
      });

      return {
        status: true,
        message: `Invoice approval mail sent successfully`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async sendRejectionMail() {
    try {
      const invoice: any = await InvoiceHeader.findAll({
        where: {
          Invoice_Status_Id: { [Op.in]: [10, 13, 16, 17] },
          Is_Final_Mail_Triggered: false,
        },
      });
      (invoice ?? []).forEach(async (inv: any) => {
        let findVendor = await Vendor.findOne({
          where: { ID: inv.Vendor_id },
        });
        let findEntity = await Entity.findOne({
          where: { CoCd: inv.CoCd },
        });

        await constructMail.sendInvoiceRejectionToVendor({
          email: findVendor?.Email,
          user: findVendor?.Vendor_Name_EN,
          subject: `Invoice Rejected in Daikin - ${inv.InvNo}`,
          VENDOR_NAME: findVendor?.Vendor_Name_EN,
          ENTITY_CODE: inv.CoCd,
          ENTITY_NAME: findEntity?.Entity_Name,
          VENDOR_CODE: findVendor?.Vendor_SAP_Code,
          INVOICE_REF: inv.InvNo,
          INVOICE_TYPE:
            inv.Invoice_Category_id == 1
              ? "PO Invoice"
              : inv.Invoice_Category_id == 2
                ? "Non PO Invoice"
                : inv.Invoice_Category_id == 3
                  ? "Logistics Invoice"
                  : inv.Invoice_Category_id == 4
                    ? "Credit Note"
                    : "",
          IS_PO_BASED: inv.Invoice_Category_id == 1 ? true : false,
          IS_LOGISTICS: inv.Invoice_Category_id == 3 ? true : false,
          IS_CREDIT_NOTE: inv.Invoice_Category_id == 4 ? true : false,
          FACEBOOK: findEntity?.Facebook_Link,
          TWITTER: findEntity?.Twitter_Link,
          LINKEDIN: findEntity?.LinkedIn_Link,
          YOUTUBE: findEntity?.YouTube_Link,
          INSTAGRAM: findEntity?.Instagram_Link,
        });
        inv.Is_Final_Mail_Triggered = true;
        await inv.save();
      });

      return {
        status: true,
        message: `Invoice approval mail sent successfully`,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async bulkSubmitLogisticsInvoices(
    invoiceIds: number[],
    vendor_id: number,
    userId: number,
    transaction: any,
  ) {
    try {
      const invoices = await InvoiceHeader.findAll({
        where: {
          ID: { [Op.in]: invoiceIds },
          Is_Deleted: false,
          Invoice_Status_Id: 101,
        },
        attributes: [
          "ID",
          "InvNo",
          "InvDt",
          "InvAmt",
          "Vendor_id",
          "CoCd",
          "Business_contact",
        ],
        transaction,
      });

      if (invoices.length === 0) {
        return { status: false, message: "No draft logistics invoices found." };
      }

      // Bulk update draft invoices to submitted (status 100)
      await InvoiceHeader.update(
        {
          Invoice_Status_Id: 100,
          ModifiedBy: userId,
          ModifiedDt: Sequelize.literal("NOW()"),
        },
        {
          where: { ID: { [Op.in]: invoiceIds } },
          transaction,
        },
      );

      // Handle notifications & emails
      for (const inv of invoices) {
        const crPerson = await User.findOne({
          where: { Employee_Id: inv.Business_contact },
          attributes: ["ID", "Email", "Name"],
        });

        const vendor = await Vendor.findOne({
          where: { ID: vendor_id || inv.Vendor_id },
          attributes: ["Vendor_Name_EN", "Vendor_SAP_Code"],
        });

        const invoiceList = [
          {
            number: inv.InvNo,
            date: inv.InvDt
              ? new Date(inv.InvDt).toISOString().split("T")[0]
              : null,
            amount: inv.InvAmt,
          },
        ];

        const uploadedFiles = await UploadFiles.findAll({
          where: { Main_Id: inv.ID, Category_id: 4 },
          attributes: ["Upload_files", "Attachment_type"],
          transaction,
        });

        const attachments = (uploadedFiles ?? []).map((f: any) => ({
          filename: f.Attachment_type,
          path: f.Upload_files,
        }));

        const links: any = await userService.socialLinks(inv.CoCd);

        // Send email
        await constructMail.sendLogisticsToCR({
          email: crPerson?.Email,
          user: crPerson?.Name,
          subject: `Logistics Invoice Submission Notification from ${vendor?.Vendor_Name_EN}`,
          vendorName: vendor?.Vendor_Name_EN,
          vendorCode: vendor?.Vendor_SAP_Code,
          invoiceList,
          attachments,
          linkedIn: links.LinkedIn_Link,
          facebook: links.Facebook_Link,
          instagram: links.Instagram_Link,
          twitter: links.Twitter_Link,
          youtube: links.YouTube_Link,
        });

        // Create notification
        await notiticationService.createNotification({
          User_Id: crPerson?.ID,
          Vendor_Id: vendor_id,
          Entity_Id: inv.CoCd,
          Message: `New Logistics invoice ${inv.InvNo} submitted by vendor ${vendor?.Vendor_Name_EN
            } on ${new Date().toDateString()}. Please review and take appropriate action.`,
          Module_Category_Id: NotificationCategory.Logistics_Invoice,
          Redirect_Id: inv.ID,
          CreatedBy: userId,
        });
      }

      return {
        status: true,
        message: `${invoices.length} logistics invoice(s) submitted successfully.`,
        data: invoices.map((inv) => inv.InvNo),
      };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(
        error?.message || "Failed to submit logistics invoices",
        error?.statusCode,
      );
    }
  }
}

export default new InvoiceService();
