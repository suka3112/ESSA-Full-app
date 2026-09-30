import { BaseController } from "../controllers/baseController";
import { Enquiry } from "../models/enquiry";
import { Op, Sequelize } from "sequelize";
import { Vendor } from "../models/vendor";
import { InvoiceHeader } from "../models/invoices";
import { POHeader } from "../models/purchaseOrderHeader";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import { Employee } from "../models/employee";
import { EntityMapping } from "../models/entityMapping";
import { APIError } from "../utils/apiError.utils";
import { MasterCodes } from "../models/mastercodes";
import { VendorStatement } from "../models/vendorStatement";
import { convertToSequalizeDate } from "../utils/globalFunction";
import logger from "../utils/logger";

class DashboardService extends BaseController {
  async getUser(body: any, userId: string, entityId: any) {
    try {
      let getUser: any = await Vendor.findOne({
        where: { ID: userId },
        include: {
          model: MasterCodes,
          as: "payment_terms_details",
          required: false,
          where: { Type: "REGISTRATION_PAYMENT_TERMS" },
          attributes: {
            exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
          },
        },
      });
      if (!getUser) {
        throw new APIError("Vendor not found", StatusCodeEnum.HTTP_BAD_REQUEST);
      }

      let finddetails = await EntityMapping.findOne({
        where: { Vendor_id: userId, CoCd: entityId },
      });
      if (!finddetails) {
        throw new APIError(
          "EntityMapping not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let findCrDetails = await Employee.findOne({
        where: { ID: finddetails?.CR_id },
      });
      if (!findCrDetails) {
        throw new APIError(
          "CR Employee not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      //data.contactV1 = findCrDetails;

      getUser.Email = findCrDetails?.Email;
      getUser.Phone = findCrDetails?.Phone_Number;
      getUser.Daikin_Contact_Name = findCrDetails?.Employee_Name;

      return { status: true, data: getUser };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getUserForDashboard(body: any, userId: string, entityId: any) {
    try {
      let getUser: any = await Vendor.findOne({
        where: { ID: userId },
        include: {
          model: MasterCodes,
          as: "payment_terms_details",
          required: false,
          where: { Type: "REGISTRATION_PAYMENT_TERMS" },
          attributes: {
            exclude: ["ModifiedDt", "Is_Deleted", "Password", "ID"],
          },
        },
      });
      if (!getUser) {
        throw new APIError("Vendor not found", StatusCodeEnum.HTTP_BAD_REQUEST);
      }

      let finddetails = await EntityMapping.findOne({
        where: { Vendor_id: userId, CoCd: entityId },
      });
      if (!finddetails) {
        throw new APIError(
          "EntityMapping not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      let findCrDetails = await Employee.findOne({
        where: { ID: finddetails?.CR_id },
      });
      if (!findCrDetails) {
        throw new APIError(
          "CR Employee not found",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      getUser.Email = findCrDetails?.Email;
      getUser.Phone = findCrDetails?.Phone_Number;
      getUser.Daikin_Contact_Name = findCrDetails?.Employee_Name;
      getUser.Payment_Terms =
        getUser?.payment_terms_details?.Description_En || null;

      return { status: true, data: getUser };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getPO(userId: any, entityId: any) {
    try {
      // 1. Get total outstanding PO count
      const totalCount = await POHeader.count({
        where: { Vendor_id: userId, CoCd: entityId, POStatus: "Open" },
      });

      const currencyTotals = await POHeader.findAll({
        where: { Vendor_id: userId, CoCd: entityId, POStatus: "Open" },
        attributes: [
          "PO_currency",
          [
            Sequelize.fn("SUM", Sequelize.literal("POValue - InvValue")),
            "POValue",
          ],
        ],
        group: ["PO_currency"],
        order: [[Sequelize.literal("SUM(POValue - InvValue)"), "DESC"]],
        limit: 3,
        raw: true,
      });

      let data = {
        outstandCount: totalCount,
        currency: currencyTotals,
      };

      return { status: true, data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingInvoice(userId: string | null, entityId: any) {
    try {
      const whereCondition: any = {
        Invoice_Status_Id: { [Op.notIn]: [10, 13, 16, 17, 12, 15, 101, 999] },
        CoCd: entityId,
      };

      if (userId) {
        whereCondition.Vendor_id = userId;
      }

      const totalCount = await InvoiceHeader.count({
        where: whereCondition,
      });

      const currencyTotals = await InvoiceHeader.findAll({
        where: {
          ...whereCondition,
          InvAmt: { [Op.ne]: null },
        },
        attributes: [
          "InvCurr",
          [Sequelize.fn("SUM", Sequelize.col("InvAmt")), "InvAmt"],
        ],
        group: ["InvCurr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("InvAmt")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingReconsilation(vendorCode: any, entityId: any) {
    try {
      // Count total records
      const totalCount = await VendorStatement.count({
        where: {
          Vendor_SAP_Code: vendorCode,
          CoCd: entityId,
        },
      });

      // Sum of Amount by currency
      const currencyTotals = await VendorStatement.findAll({
        where: {
          Vendor_SAP_Code: vendorCode,
          CoCd: entityId,
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async payableThisMonth(vendorCode: any, entityId: any) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
      ).padStart(2, "0")}`;

      // Count total for the month
      const totalCount = await VendorStatement.count({
        where: {
          Vendor_SAP_Code: vendorCode,
          CoCd: entityId,
          Reconciliation_status: "RECONCILED",
          DueDate: {
            [Op.lte]: convertToSequalizeDate(endDateStr),
          },
        },
      });

      // Sum of Amount grouped by currency for the month
      const currencyTotals = await VendorStatement.findAll({
        where: {
          Vendor_SAP_Code: vendorCode,
          CoCd: entityId,
          Reconciliation_status: "RECONCILED",
          DueDate: {
            [Op.lte]: convertToSequalizeDate(endDateStr),
          },
          Amount: { [Op.ne]: null },
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async mismatchedSOA(vendorCode: any, entityId: any) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      // Count total for the month
      const totalCount = await VendorStatement.count({
        where: {
          Vendor_SAP_Code: vendorCode,
          CoCd: entityId,
          Reconciliation_status: "Pending for Reconciliation",
        },
      });

      // Sum of Amount grouped by currency for the month
      const currencyTotals = await VendorStatement.findAll({
        where: {
          Vendor_SAP_Code: vendorCode,
          CoCd: entityId,
          Reconciliation_status: "Pending for Reconciliation",
          Amount: { [Op.ne]: null },
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingTicket(userId: string, entityId: any) {
    try {
      // Total ticket count
      const totalCount = await Enquiry.count({
        where: {
          Vendor_Id: userId,
          CoCd: entityId,
          Is_Deleted: false,
          Enquiry_Status: { [Op.ne]: 3 },
        },
      });

      // Count of Enquiry_Type grouped
      const ticketCounts = await Enquiry.findAll({
        where: {
          Vendor_Id: userId,
          CoCd: entityId,
          Is_Deleted: false,
          Enquiry_Status: { [Op.ne]: 3 },
        },
        attributes: [
          "Enquiry_Type",
          [Sequelize.fn("COUNT", Sequelize.col("Enquiry_Type")), "total"],
        ],
        group: ["Enquiry_Type"],
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          data: ticketCounts,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingTicketForBusiness(userId: string, entityId: any, empId: any) {
    try {
      // Total ticket count
      const totalCount = await Enquiry.count({
        where: {
          CoCd: entityId,
          Is_Deleted: false,
          Enquiry_Status: { [Op.ne]: 3 },
          Assigned_contact_person: empId,
        },
      });

      // Count of Enquiry_Type grouped
      const ticketCounts = await Enquiry.findAll({
        where: {
          CoCd: entityId,
          Is_Deleted: false,
          Enquiry_Status: { [Op.ne]: 3 },
          Assigned_contact_person: empId,
        },
        attributes: [
          "Enquiry_Type",
          [Sequelize.fn("COUNT", Sequelize.col("Enquiry_Type")), "total"],
        ],
        group: ["Enquiry_Type"],
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          data: ticketCounts,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pieChart(vendorCode: string, entityId: any) {
    try {
      const rows = await VendorStatement.findAll({
        where: { Vendor_SAP_Code: vendorCode, CoCd: entityId },
        attributes: [
          "Reconciliation_status",
          [Sequelize.fn("COUNT", Sequelize.col("ID")), "count"],
        ],
        group: ["Reconciliation_status"],
        raw: true,
      });

      const counters: Record<string, number> = {
        RECONCILED: 0,
        MISMATCH: 0,
        "PENDING FOR RECONCILIATION": 0,
      };

      for (let r of (rows ?? []) as any[]) {
        const key = String(r?.Reconciliation_status || "").toUpperCase();
        if (key in counters) counters[key] += Number(r?.count || 0);
      }

      const total = Object.values(counters).reduce((a, b) => a + b, 0);
      const pct = (n: number) => (total ? (n / total) * 100 : 0);

      const series = [
        Number(pct(counters.RECONCILED).toFixed(2)), // Reconciled
        Number(pct(counters.MISMATCH).toFixed(2)), // Mismatch
        Number(pct(counters["PENDING FOR RECONCILIATION"]).toFixed(2)), // Pending
      ];

      return {
        status: true,
        data: {
          series,
          labels: ["Reconciled", "Mismatch", "Pending for Reconciliation"],
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async bargraph(userId: string, entityId: any) {
    try {
      // Status sets
      const APPROVED = [12, 15];
      const PAID = [999];
      const NOT_APPROVED = [
        100, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52, 53, 54,
        55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87, 88, 89, 90,
      ];

      // Common fragments
      const monthExpr = Sequelize.literal(
        `TO_CHAR("InvoiceHeader"."InvDt", 'YYYY-MM')`,
      );

      const commonAttrs: any = [
        [monthExpr, "month"],
        [Sequelize.fn("COUNT", Sequelize.col("ID")), "invoiceCount"],
      ];

      const commonGroup: any = [monthExpr];
      const commonOrder: any = [[monthExpr, "DESC"]];

      // Calculate date range for past 12 months (including current month)
      const today = new Date();
      const past12Months = new Date(
        today.getFullYear(),
        today.getMonth() - 11,
        1,
      ); // start of month, 12 months ago

      const [approvedRows, paidRows, pendingRows] = await Promise.all([
        InvoiceHeader.findAll({
          raw: true,
          where: {
            Vendor_id: userId,
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: APPROVED },
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
        InvoiceHeader.findAll({
          raw: true,
          where: {
            Vendor_id: userId,
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: PAID },
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
        InvoiceHeader.findAll({
          raw: true,
          where: {
            Vendor_id: userId,
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: NOT_APPROVED },
            Payment_Status: "Pending",
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
      ]);

      // Month name map
      const monthsMap: any = {
        "01": "Jan",
        "02": "Feb",
        "03": "Mar",
        "04": "Apr",
        "05": "May",
        "06": "Jun",
        "07": "Jul",
        "08": "Aug",
        "09": "Sep",
        "10": "Oct",
        "11": "Nov",
        "12": "Dec",
      };

      // Collect unique months in chronological order by yyyy-MM
      const allMonths = new Set<string>();
      [approvedRows, paidRows, pendingRows].forEach((rows) => {
        (rows ?? []).forEach((r: any) => {
          if (r?.month && r?.month !== null) {
            allMonths.add(r?.month);
          }
        });
      });
      const sortedYearMonths = Array.from(allMonths).sort(); // asc by yyyy-MM
      const xCategories = sortedYearMonths.map((m) => {
        if (m && m.includes("-")) {
          const monthPart = m.split("-")[1];
          return monthsMap[monthPart] || m;
        }
        return m;
      });

      // Helper to map rows to month -> count
      const toMap = (rows: any[]) =>
        (rows ?? []).reduce((acc: any, r: any) => {
          if (r?.month && r?.month !== null) {
            acc[r?.month] = Number(r?.invoiceCount || 0);
          }
          return acc;
        }, {});

      const approvedMap = toMap(approvedRows);
      const paidMap = toMap(paidRows);
      const pendingMap = toMap(pendingRows);

      const series = [
        {
          name: "getApprovedInvoices",
          data: sortedYearMonths.map((m) => approvedMap[m] || 0),
        },
        {
          name: "getPaidInvoices",
          data: sortedYearMonths.map((m) => paidMap[m] || 0),
        },
        {
          name: "getNotApprovedInvoices",
          data: sortedYearMonths.map((m) => pendingMap[m] || 0),
        },
      ];

      return {
        status: true,
        data: { series, xaxis: { categories: xCategories } },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getPOforAdmin(userId: any, entityId: any) {
    try {
      // 1. Get total outstanding PO count
      const totalCount = await POHeader.count({
        where: {
          [Op.and]: [{ CoCd: entityId, POStatus: "Open" }],
        },
      });

      const currencyTotals = await POHeader.findAll({
        where: { CoCd: entityId, POStatus: "Open" },
        attributes: [
          "PO_currency",
          [
            Sequelize.fn("SUM", Sequelize.literal("POValue - InvValue")),
            "POValue",
          ],
        ],
        group: ["PO_currency"],
        order: [[Sequelize.literal("SUM(POValue - InvValue)"), "DESC"]],
        limit: 3,
        raw: true,
      });

      let data = {
        outstandCount: totalCount,
        currency: currencyTotals,
      };

      return { status: true, data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingInvoiceforAdmin(userId: string | null, entityId: any) {
    try {
      let whereCondition: any = {
        Invoice_Status_Id: { [Op.notIn]: [10, 13, 16, 17, 12, 15, 101, 999] },
        CoCd: entityId,
      };

      const totalCount = await InvoiceHeader.count({
        where: whereCondition,
      });

      const currencyTotals = await InvoiceHeader.findAll({
        where: {
          ...whereCondition,
          InvAmt: { [Op.ne]: null },
        },
        attributes: [
          "InvCurr",
          [Sequelize.fn("SUM", Sequelize.col("InvAmt")), "InvAmt"],
        ],
        group: ["InvCurr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("InvAmt")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingReconsilationforAdmin(vendorCode: any, entityId: any) {
    try {
      // Count total records
      const totalCount = await VendorStatement.count({
        where: {
          CoCd: entityId,
          // Reconciliation_status: "RECONCILED",
        },
      });

      // Sum of Amount by currency
      const currencyTotals = await VendorStatement.findAll({
        where: {
          CoCd: entityId,
          // Reconciliation_status: "RECONCILED",
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async payableThisMonthforAdmin(vendorCode: any, entityId: any) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
      ).padStart(2, "0")}`;

      // Count total for the month
      const totalCount = await VendorStatement.count({
        where: {
          CoCd: entityId,
          Reconciliation_status: "RECONCILED",
          DueDate: {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          },
        },
      });

      // Sum of Amount grouped by currency for the month
      const currencyTotals = await VendorStatement.findAll({
        where: {
          CoCd: entityId,
          Reconciliation_status: "RECONCILED",
          DueDate: {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          },
          Amount: { [Op.ne]: null },
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async mismatchedSOAforAdmin(vendorCode: any, entityId: any) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      // Count total for the month
      const totalCount = await VendorStatement.count({
        where: {
          CoCd: entityId,
          Reconciliation_status: "Pending for Reconciliation",
        },
      });

      // Sum of Amount grouped by currency for the month
      const currencyTotals = await VendorStatement.findAll({
        where: {
          CoCd: entityId,
          Reconciliation_status: "Pending for Reconciliation",
          Amount: { [Op.ne]: null },
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingTicketforAdmin(userId: string, entityId: any) {
    try {
      // Total ticket count
      const totalCount = await Enquiry.count({
        where: {
          CoCd: entityId,
          Is_Deleted: false,
          Enquiry_Status: { [Op.ne]: 3 },
        },
      });

      // Count of Enquiry_Type grouped
      const ticketCounts = await Enquiry.findAll({
        where: {
          CoCd: entityId,
          Is_Deleted: false,
          Enquiry_Status: { [Op.ne]: 3 },
        },
        attributes: [
          "Enquiry_Type",
          [Sequelize.fn("COUNT", Sequelize.col("Enquiry_Type")), "total"],
        ],
        group: ["Enquiry_Type"],
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          data: ticketCounts,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pieChartforAdmin(vendorCode: string, entityId: any) {
    try {
      const rows = await VendorStatement.findAll({
        where: { CoCd: entityId },
        attributes: [
          "Reconciliation_status",
          [Sequelize.fn("COUNT", Sequelize.col("ID")), "count"],
        ],
        group: ["Reconciliation_status"],
        raw: true,
      });

      const counters: Record<string, number> = {
        RECONCILED: 0,
        MISMATCH: 0,
        "PENDING FOR RECONCILIATION": 0,
      };
      for (let r of (rows ?? []) as any[]) {
        const key = String(r?.Reconciliation_status || "").toUpperCase();
        if (key in counters) counters[key] += Number(r?.count || 0);
      }

      const total = Object.values(counters).reduce((a, b) => a + b, 0);
      const pct = (n: number) => (total ? (n / total) * 100 : 0);

      const series = [
        Number(pct(counters.RECONCILED).toFixed(2)), // Reconcilled
        Number(pct(counters.MISMATCH).toFixed(2)), // Mismatch
        Number(pct(counters["PENDING FOR RECONCILIATION"]).toFixed(2)), // Pending // Pending
      ];

      return {
        status: true,
        data: {
          series,
          labels: ["Reconciled", "Mismatch", "Pending for Reconciliation"],
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async bargraphforAdmin(userId: string, entityId: any) {
    try {
      // Status sets
      const PAID = [999];
      const APPROVED = [12, 15];
      const NOT_APPROVED = [
        100, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52, 53, 54,
        55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87, 88, 89, 90,
      ];

      // Common fragments
      const monthExpr = Sequelize.literal(
        `TO_CHAR("InvoiceHeader"."InvDt", 'YYYY-MM')`,
      );

      const commonAttrs: any = [
        [monthExpr, "month"],
        [Sequelize.fn("COUNT", Sequelize.col("ID")), "invoiceCount"],
      ];

      const commonGroup: any = [monthExpr];
      const commonOrder: any = [[monthExpr, "DESC"]];

      // Calculate date range for past 12 months (including current month)
      const today = new Date();
      const past12Months = new Date(
        today.getFullYear(),
        today.getMonth() - 11,
        1,
      ); // start of month, 12 months ago

      const [approvedRows, paidRows, pendingRows] = await Promise.all([
        InvoiceHeader.findAll({
          raw: true,
          where: {
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: APPROVED },
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
        InvoiceHeader.findAll({
          raw: true,
          where: {
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: PAID },
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
        InvoiceHeader.findAll({
          raw: true,
          where: {
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: NOT_APPROVED },
            Payment_Status: "Pending",
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
      ]);

      // Month name map
      const monthsMap: any = {
        "01": "Jan",
        "02": "Feb",
        "03": "Mar",
        "04": "Apr",
        "05": "May",
        "06": "Jun",
        "07": "Jul",
        "08": "Aug",
        "09": "Sep",
        "10": "Oct",
        "11": "Nov",
        "12": "Dec",
      };

      // Collect unique months in chronological order by yyyy-MM
      const allMonths = new Set<string>();
      [approvedRows, paidRows, pendingRows].forEach((rows) => {
        (rows ?? []).forEach((r: any) => {
          if (r?.month && r?.month !== null) {
            allMonths.add(r?.month);
          }
        });
      });
      const sortedYearMonths = Array.from(allMonths).sort(); // asc by yyyy-MM
      const xCategories = sortedYearMonths.map((m) => {
        if (m && m.includes("-")) {
          const monthPart = m.split("-")[1];
          return monthsMap[monthPart] || m;
        }
        return m;
      });

      // Helper to map rows to month -> count
      const toMap = (rows: any[]) =>
        (rows ?? []).reduce((acc: any, r: any) => {
          if (r?.month && r?.month !== null) {
            acc[r?.month] = Number(r?.invoiceCount || 0);
          }
          return acc;
        }, {});

      const approvedMap = toMap(approvedRows);
      const paidMap = toMap(paidRows);
      const pendingMap = toMap(pendingRows);

      const series = [
        {
          name: "getApprovedInvoices",
          data: sortedYearMonths.map((m) => approvedMap[m] || 0),
        },
        {
          name: "getPaidInvoices",
          data: sortedYearMonths.map((m) => paidMap[m] || 0),
        },
        {
          name: "getNotApprovedInvoices",
          data: sortedYearMonths.map((m) => pendingMap[m] || 0),
        },
      ];

      return {
        status: true,
        data: { series, xaxis: { categories: xCategories } },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getPOBusiness(vendorIds: number[], entityId: any) {
    try {
      if (!vendorIds || vendorIds.length === 0) {
        return { status: true, data: { outstandCount: 0, currency: [] } };
      }
      // 1. Get total outstanding PO count
      const totalCount = await POHeader.count({
        where: {
          [Op.and]: [
            {
              Vendor_id: { [Op.in]: vendorIds },
              CoCd: entityId,
              POStatus: "Open",
            },
            // literal("Total_IR_Qty < Total_PO_Qty"),
          ],
        },
      });

      const currencyTotals = await POHeader.findAll({
        where: {
          [Op.and]: [
            {
              Vendor_id: { [Op.in]: vendorIds },
              CoCd: entityId,
              POStatus: "Open",
            },
          ],
        },
        attributes: [
          "PO_currency",
          [
            Sequelize.fn("SUM", Sequelize.literal("POValue - InvValue")),
            "POValue",
          ],
        ],
        group: ["PO_currency"],
        order: [[Sequelize.literal("SUM(POValue - InvValue)"), "DESC"]],
        limit: 3,
        raw: true,
      });

      let data = {
        outstandCount: totalCount,
        currency: currencyTotals,
      };

      return { status: true, data };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingInvoiceBusiness(vendorIds: number[], entityId: any) {
    try {
      const whereCondition: any = {
        Invoice_Status_Id: { [Op.notIn]: [10, 13, 16, 17, 12, 15, 101, 999] },
        CoCd: entityId,
      };

      if (vendorIds && vendorIds.length > 0) {
        whereCondition.Vendor_id = { [Op.in]: vendorIds };
      }

      const totalCount = await InvoiceHeader.count({
        where: whereCondition,
      });

      const currencyTotals = await InvoiceHeader.findAll({
        where: {
          ...whereCondition,
          InvAmt: { [Op.ne]: null },
        },
        attributes: [
          "InvCurr",
          [Sequelize.fn("SUM", Sequelize.col("InvAmt")), "InvAmt"],
        ],
        group: ["InvCurr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("InvAmt")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pendingReconsilationBusiness(vendorIds: number[], entityId: any) {
    try {
      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: vendorIds } },
        attributes: ["Vendor_SAP_Code"],
        raw: true,
      });

      const vendorSAPCodes = (vendors ?? []).map(
        (v: any) => v?.Vendor_SAP_Code,
      );

      // Count total records

      const totalCount = await VendorStatement.count({
        where: {
          Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
          CoCd: entityId,
        },
      });

      // Sum of Amount by currency
      const currencyTotals = await VendorStatement.findAll({
        where: {
          Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
          CoCd: entityId,
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async payableThisMonthBusiness(vendorIds: number[], entityId: any) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
      ).padStart(2, "0")}`;

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: vendorIds } },
        attributes: ["Vendor_SAP_Code"],
        raw: true,
      });

      const vendorSAPCodes = (vendors ?? []).map(
        (v: any) => v?.Vendor_SAP_Code,
      );

      // Count total for the month
      const totalCount = await VendorStatement.count({
        where: {
          Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
          CoCd: entityId,
          Reconciliation_status: "RECONCILED",
          DueDate: {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          },
        },
      });

      // Sum of Amount grouped by currency for the month
      const currencyTotals = await VendorStatement.findAll({
        where: {
          Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
          CoCd: entityId,
          Reconciliation_status: "RECONCILED",
          DueDate: {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          },
          Amount: { [Op.ne]: null },
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async bargraphBusiness(vendorIds: number[], entityId: any) {
    try {
      // Status sets
      const APPROVED = [12, 15];
      const PAID = [999];
      const NOT_APPROVED = [
        100, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 44, 45, 50, 51, 52, 53, 54,
        55, 63, 64, 65, 72, 73, 74, 75, 76, 77, 84, 85, 86, 87, 88, 89, 90,
      ];

      // Common fragments
      const monthExpr = Sequelize.literal(
        `TO_CHAR("InvoiceHeader"."InvDt", 'YYYY-MM')`,
      );

      const commonAttrs: any = [
        [monthExpr, "month"],
        [Sequelize.fn("COUNT", Sequelize.col("ID")), "invoiceCount"],
      ];

      const commonGroup: any = [monthExpr];
      const commonOrder: any = [[monthExpr, "DESC"]];

      // Calculate date range for past 12 months (including current month)
      const today = new Date();
      const past12Months = new Date(
        today.getFullYear(),
        today.getMonth() - 11,
        1,
      ); // start of month, 12 months ago

      const [approvedRows, paidRows, pendingRows] = await Promise.all([
        InvoiceHeader.findAll({
          raw: true,
          where: {
            Vendor_id: { [Op.in]: vendorIds },
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: APPROVED },
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
        InvoiceHeader.findAll({
          raw: true,
          where: {
            Vendor_id: { [Op.in]: vendorIds },
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: PAID },
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
        InvoiceHeader.findAll({
          raw: true,
          where: {
            Vendor_id: { [Op.in]: vendorIds },
            CoCd: entityId,
            Invoice_Status_Id: { [Op.in]: NOT_APPROVED },
            Payment_Status: "Pending",
            [Op.and]: [
              { InvDt: { [Op.ne]: null } },
              { InvDt: { [Op.between]: [past12Months, today] } },
            ],
          },
          attributes: commonAttrs,
          group: commonGroup,
          order: commonOrder,
        }),
      ]);

      // Month name map
      const monthsMap: any = {
        "01": "Jan",
        "02": "Feb",
        "03": "Mar",
        "04": "Apr",
        "05": "May",
        "06": "Jun",
        "07": "Jul",
        "08": "Aug",
        "09": "Sep",
        "10": "Oct",
        "11": "Nov",
        "12": "Dec",
      };

      // Collect unique months in chronological order by yyyy-MM
      const allMonths = new Set<string>();
      [approvedRows, paidRows, pendingRows].forEach((rows) => {
        (rows ?? []).forEach((r: any) => {
          if (r?.month && r?.month !== null) {
            allMonths.add(r?.month);
          }
        });
      });
      const sortedYearMonths = Array.from(allMonths).sort(); // asc by yyyy-MM
      const xCategories = sortedYearMonths.map((m) => {
        if (m && m.includes("-")) {
          const monthPart = m.split("-")[1];
          return monthsMap[monthPart] || m;
        }
        return m;
      });

      // Helper to map rows to month -> count
      const toMap = (rows: any[]) =>
        (rows ?? []).reduce((acc: any, r: any) => {
          if (r?.month && r?.month !== null) {
            acc[r?.month] = Number(r?.invoiceCount || 0);
          }
          return acc;
        }, {});

      const approvedMap = toMap(approvedRows);
      const paidMap = toMap(paidRows);
      const pendingMap = toMap(pendingRows);

      const series = [
        {
          name: "getApprovedInvoices",
          data: sortedYearMonths.map((m) => approvedMap[m] || 0),
        },
        {
          name: "getPaidInvoices",
          data: sortedYearMonths.map((m) => paidMap[m] || 0),
        },
        {
          name: "getNotApprovedInvoices",
          data: sortedYearMonths.map((m) => pendingMap[m] || 0),
        },
      ];

      return {
        status: true,
        data: { series, xaxis: { categories: xCategories } },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async mismatchedSOABusiness(vendorIds: number[], entityId: any) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: vendorIds } },
        attributes: ["Vendor_SAP_Code"],
        raw: true,
      });

      const vendorSAPCodes = (vendors ?? []).map(
        (v: any) => v?.Vendor_SAP_Code,
      );

      // Count total for the month
      const totalCount = await VendorStatement.count({
        where: {
          Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
          CoCd: entityId,
          Reconciliation_status: "Pending for Reconciliation",
        },
      });

      // Sum of Amount grouped by currency for the month
      const currencyTotals = await VendorStatement.findAll({
        where: {
          Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
          CoCd: entityId,
          Reconciliation_status: "Pending for Reconciliation",
          Amount: { [Op.ne]: null },
        },
        attributes: [
          "Curr",
          [Sequelize.fn("SUM", Sequelize.col("Amount")), "Amount"],
        ],
        group: ["Curr"],
        order: [[Sequelize.fn("SUM", Sequelize.col("Amount")), "DESC"]],
        limit: 3,
        raw: true,
      });

      return {
        status: true,
        data: {
          outstandCount: totalCount,
          currency: currencyTotals,
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async pieChartBusiness(vendorIds: number[], entityId: any) {
    try {
      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: vendorIds } },
        attributes: ["Vendor_SAP_Code"],
        raw: true,
      });

      const vendorSAPCodes = (vendors ?? []).map(
        (v: any) => v?.Vendor_SAP_Code,
      );

      const rows = await VendorStatement.findAll({
        where: { Vendor_SAP_Code: { [Op.in]: vendorSAPCodes }, CoCd: entityId },
        attributes: [
          "Reconciliation_status",
          [Sequelize.fn("COUNT", Sequelize.col("ID")), "count"],
        ],
        group: ["Reconciliation_status"],
        raw: true,
      });

      const counters: Record<string, number> = {
        RECONCILED: 0,
        MISMATCH: 0,
        "PENDING FOR RECONCILIATION": 0,
      };
      for (let r of (rows ?? []) as any[]) {
        const key = String(r?.Reconciliation_status || "").toUpperCase();
        if (key in counters) counters[key] += Number(r?.count || 0);
      }

      const total = Object.values(counters).reduce((a, b) => a + b, 0);
      const pct = (n: number) => (total ? (n / total) * 100 : 0);

      const series = [
        Number(pct(counters.RECONCILED).toFixed(2)), // Reconcilled
        Number(pct(counters.MISMATCH).toFixed(2)), // Mismatch
        Number(pct(counters["PENDING FOR RECONCILIATION"]).toFixed(2)), // Pending
      ];

      return {
        status: true,
        data: {
          series,
          labels: ["Reconciled", "Mismatch", "Pending for Reconciliation"],
        },
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }
}

export default new DashboardService();
