import { BaseController } from "../controllers/baseController";
import { LogisticsInvoice } from "../models/logisticInvoice";
import { sequelize } from "../config/sequelize";
import { UploadFiles } from "../models/uploadFiles";
import pagination from "../utils/pagination";
import { Op } from "sequelize";
import fs from "fs";
import path from "path";
import constructMail from "../utils/constructMail";
import { Parser } from "json2csv";
import { User } from "../models/user";
import logger from "../utils/logger";

const STATUS_MAPPING: any = {
  1: "Submitted",
  2: "Under Review",
  3: "Awaiting Approval",
  4: "Approved",
  5: "Rejected",
  6: "Paid",
};

class LogisticsInvoiceService extends BaseController {
  async createInvoice(
    body: any,
    userId: number,
    parsedData: any[],
    invoiceFiles: any[],
  ) {
    const transaction = await sequelize.transaction();

    try {
      if (!parsedData || parsedData.length === 0) {
        throw new Error("Parsed data is empty or invalid.");
      }

      const invoices: LogisticsInvoice[] = [];
      function excelSerialToDate(serial: number): string | null {
        if (!serial || typeof serial !== "number") return null;
        const utcDays = Math.floor(serial - 25569);
        const date = new Date(utcDays * 86400000);
        return date.toISOString().split("T")[0];
      }

      for (const row of parsedData) {
        const invoiceDate =
          typeof row?.invoice_date === "number"
            ? excelSerialToDate(row?.invoice_date)
            : row?.invoice_date;

        const newInvoice = await LogisticsInvoice.create(
          {
            imported_data: JSON.stringify(row ?? {}),
            cost_responsible: body?.costResponsible,
            user_id: userId,
            country_origin: row?.country_origin || null,
            month_name: row?.month || null,
            month_number: invoiceDate
              ? new Date(invoiceDate).getMonth() + 1
              : null,
            year: invoiceDate ? new Date(invoiceDate).getFullYear() : null,
            factory_warehouse: row?.factory_warehouse || null,
            port_airport_origin: row?.port_airport_origin || null,
            destination_port_airport: row?.destination_port_airport || null,
            country_final_destination: row?.country_final_destination || null,
            inco_terms: row?.inco_terms || null,
            shipping_line: row?.shipping_line || null,
            container_type: row?.container_type || null,
            etd: row?.etd || null,
            eta: row?.eta || null,
            rate_related: row?.rate_related || null,
            quantity_ctn: row?.quantity_ctn || null,
            rate_per_unit: row?.rate_per_unit || null,
            total_rate: row?.total_rate || null,
            extra_charges: row?.extras_charges || null,
            reason_extra_charges: row?.reason_for_extras_charges || null,
            invoice_currency: row?.invoice_currency || null,
            vat: row?.vat || null,
            final_invoice_amount: row?.final_invoice_amount || null,
            invoice_number: row?.invoice_number || null,
            invoice_date: invoiceDate || null,
            daikin_reference_sor: row?.daikin_reference_sor || null,
            daikin_reference_po: row?.daikin_reference_po || null,
            daikin_requestor_name: row?.daikin_requestor_name || null,
            daikin_entity: row?.daikin_entity || null,
            daikin_comment: row?.daikin_comment || null,
            vendor_comment: row?.vendor_comment || null,
            spot_rate_number: row?.spot_rate_number || null,
            status: body?.status ?? 1,
          },
          { transaction },
        );

        invoices.push(newInvoice);
      }

      if (invoiceFiles && invoiceFiles?.length > 0) {
        const filesData: {
          category_id: number;
          upload_files: any;
        }[] = [];

        (invoices ?? []).forEach((_invoice) => {
          (invoiceFiles ?? []).forEach((file) => {
            filesData.push({
              category_id: 8,
              upload_files: file,
            });
          });
        });

        await UploadFiles.bulkCreate(filesData, { transaction });
      }

      await transaction.commit();
      return { status: true, data: invoices };
    } catch (error) {
      logger.error("Error:", error);
      await transaction.rollback();
      return { status: false, data: error?.message };
    }
  }

  async submitLogisticsInvoice(invoiceId: number, userId: number) {
    try {
      const updatedPayment = await LogisticsInvoice.update(
        { status: 1 },
        { where: { id: invoiceId, user_id: userId } },
      );

      if (updatedPayment?.[0] === 0) {
        return {
          status: false,
          message: "Payment not found or already submitted.",
        };
      }

      return {
        status: true,
        message: "Advance payment submitted successfully.",
      };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getLogisticInvoices({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    userId,
  }: any) {
    let pageNumber = page ? parseInt(page) : 1;
    let limitNumber = limit ? parseInt(limit) : 15;
    let offset = (pageNumber - 1) * limitNumber;

    let sortField = sort_column || "month_number";
    let sortDirection = sort || "DESC";

    const order: any = [];

    switch (sortField) {
      case "month_number":
        order.push(["month_number", sortDirection]);
        break;
      case "year":
        order.push(["year", sortDirection]);
        break;
      case "totalAmount":
        order.push(["totalAmount", sortDirection]);
        break;
      case "invoiceCreated":
        order.push(["invoiceCreated", sortDirection]);
        break;
      case "invoiceApproved":
        order.push(["invoiceApproved", sortDirection]);
        break;
      case "invoiceRejected":
        order.push(["invoiceRejected", sortDirection]);
        break;
      default:
        order.push([sortField, sortDirection]);
        break;
    }

    let where: any = {
      is_deleted: false,
      user_id: userId,
    };

    if (month) {
      where.month_number = month;
    }

    if (year) {
      where.year = year;
    }

    try {
      const invoices = await LogisticsInvoice.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: [
          "month_name",
          "year",
          "month_number",
          [
            sequelize.fn("SUM", sequelize.col("final_invoice_amount")),
            "totalAmount",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "invoiceCreated"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 2 THEN 1 END"),
            ),
            "invoiceApproved",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 3 THEN 1 END"),
            ),
            "invoiceRejected",
          ],
        ],
        group: ["month_name", "year", "month_number"],
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

  async getLogisticInvoicesById({
    page,
    limit,
    month,
    year,
    sort,
    sort_column,
    search,
    startDate,
    endDate,
    filterByCurrency,
    filterByStatus,
    userId,
  }: any) {
    let pageNumber = page ? parseInt(page) : 1;
    let limitNumber = limit ? parseInt(limit) : 15;
    let offset = (pageNumber - 1) * limitNumber;

    let sortField = sort_column || "invoice_date";
    let sortDirection = sort || "DESC";

    const order: any = [];

    switch (sortField) {
      case "invoice_number":
        order.push(["invoice_number", sortDirection]);
        break;
      case "invoice_date":
        order.push(["invoice_date", sortDirection]);
        break;
      case "invoice_currency":
        order.push(["invoice_currency", sortDirection]);
        break;
      case "final_invoice_amount":
        order.push(["final_invoice_amount", sortDirection]);
        break;
      case "paymentDueDate":
        order.push(["paymentDueDate", sortDirection]);
        break;
      case "status":
        order.push(["status", sortDirection]);
        break;
      default:
        order.push([sortField, sortDirection]);
        break;
    }

    let where: any = {
      is_deleted: false,
      user_id: userId,
    };

    if (month) where.month_number = month;
    if (year) where.year = year;
    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { id: isNaN(search) ? { [Op.like]: `%${search}%` } : Number(search) },
      ];
    }
    if (filterByCurrency) where.invoice_currency = filterByCurrency;
    if (filterByStatus) where.status = filterByStatus;

    if (startDate && endDate) {
      where.invoice_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.invoice_date = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.invoice_date = { [Op.lte]: new Date(endDate) };
    }

    try {
      const invoices = await LogisticsInvoice.findAndCountAll({
        where,
        limit: limitNumber,
        offset: offset,
        order: order,
        attributes: [
          "invoice_number",
          "invoice_date",
          ["id", "referenceNo"],
          "invoice_currency",
          "final_invoice_amount",
          "paymentDueDate",
          "status",
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

  async getLogisticInvoicesForCSV(startDate: any, endDate: any) {
    try {
      if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required");
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        throw new Error("Invalid startDate or endDate");
      }

      const data = await LogisticsInvoice.findAll({
        where: {
          invoice_date: {
            [Op.between]: [parsedStartDate, parsedEndDate],
          },
          is_deleted: false,
        },
        attributes: [
          "id",
          "invoice_number",
          "invoice_date",
          "invoice_currency",
          "final_invoice_amount",
          "status",
        ],
        // Log SQL query for debugging
      });

      const transformedData = (data ?? []).map((invoice: any) => ({
        id: invoice?.id,
        invoice_number: invoice?.invoice_number,
        invoice_date: invoice?.invoice_date
          ? new Date(invoice?.invoice_date)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")
          : "",
        invoice_currency: invoice?.invoice_currency,
        final_invoice_amount: invoice?.final_invoice_amount,
        status: STATUS_MAPPING[invoice?.status] || "Unknown",
      }));

      return { status: true, data: transformedData };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  generateLogisticInvoicesCSV(data: any) {
    const fields = [
      { label: "ID", value: "id" },
      { label: "Invoice Number", value: "invoice_number" },
      { label: "Invoice Date", value: "invoice_date" },
      { label: "Currency", value: "invoice_currency" },
      { label: "Final Invoice Amount", value: "final_invoice_amount" },
      { label: "Status", value: "status" },
    ];
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  }

  async sendLogisticInvoiceReport(startDate: any, endDate: any, email: any) {
    try {
      if (!startDate || !endDate || !email) {
        return {
          status: false,
          data: "Invalid input: startDate, endDate, and email are required",
        };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          status: false,
          data: "Invalid date format for startDate or endDate",
        };
      }

      if (start > end) {
        return { status: false, data: "startDate cannot be after endDate" };
      }

      const invoices = await LogisticsInvoice.findAll({
        where: {
          invoice_date: { [Op.between]: [start, end] },
          is_deleted: false,
        },
        attributes: [
          "id",
          "invoice_number",
          "invoice_date",
          "invoice_currency",
          "final_invoice_amount",
          "status",
        ],
      });

      if (!invoices || invoices?.length === 0) {
        return {
          status: false,
          data: "No logistic invoices found for the given date range",
        };
      }

      const transformedInvoices = (invoices ?? []).map((invoice: any) => ({
        id: invoice?.id,
        invoice_number: invoice?.invoice_number,
        invoice_date: invoice?.invoice_date
          ? new Date(invoice?.invoice_date)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")
          : "",
        invoice_currency: invoice?.invoice_currency,
        final_invoice_amount: invoice?.final_invoice_amount,
        status: STATUS_MAPPING[invoice?.status] || "Unknown",
      }));

      const fields = [
        { label: "ID", value: "id" },
        { label: "Invoice Number", value: "invoice_number" },
        { label: "Invoice Date", value: "invoice_date" },
        { label: "Currency", value: "invoice_currency" },
        { label: "Final Invoice Amount", value: "final_invoice_amount" },
        { label: "Status", value: "status" },
      ];

      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(transformedInvoices);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `logistic_invoice_report_${Date.now()}.csv`,
      );

      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }

      fs.writeFileSync(csvFilePath, csvData);

      const user = await User.findOne({ where: { Email: email } });

      await constructMail.sendLogisticInvoicesEmail({
        email,
        csvFilePath,
        user: user?.Name || "User",
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      return {
        status: false,
        data: "Failed to send logistic invoice report: " + error?.message,
      };
    }
  }

  async getMonthlyLogisticInvoicesForCSV(month: any, year: any) {
    try {
      let where: any = { is_deleted: false };
      if (month && year) {
        where.month_number = month;
        where.year = year;
      } else if (year) {
        where.year = year;
      } else if (month) {
        where.month_number = month;
      }
      const data = await LogisticsInvoice.findAndCountAll({
        where,
        attributes: [
          "month_name",
          "year",
          "month_number",
          [
            sequelize.fn("SUM", sequelize.col("final_invoice_amount")),
            "totalAmount",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "invoiceCreated"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 2 THEN 1 END"),
            ),
            "invoiceApproved",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 3 THEN 1 END"),
            ),
            "invoiceRejected",
          ],
        ],
        group: ["month_name", "year", "month_number"],
        raw: true,
      });
      const invoiceData = data.rows;
      if (!invoiceData || invoiceData.length === 0) {
      }

      return { status: true, data: invoiceData };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  generateMonthlyLogisticInvoicesCSV(data: any) {
    const fields = [
      "month_name",
      "year",
      "month_number",
      "totalAmount",
      "invoiceCreated",
      "invoiceApproved",
      "invoiceRejected",
    ];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    return csv;
  }

  async sendMonthlyLogisticInvoiceReport(month: any, year: any, email: any) {
    try {
      let where: any = { is_deleted: false };
      if (month && year) {
        where.month_number = month;
        where.year = year;
      } else if (year) {
        where.year = year;
      } else if (month) {
        where.month_number = month;
      }

      const invoices = await LogisticsInvoice.findAndCountAll({
        where,
        attributes: [
          "month_name",
          "year",
          "month_number",
          [
            sequelize.fn("SUM", sequelize.col("final_invoice_amount")),
            "totalAmount",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "invoiceCreated"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 2 THEN 1 END"),
            ),
            "invoiceApproved",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 3 THEN 1 END"),
            ),
            "invoiceRejected",
          ],
        ],
        group: ["month_name", "year", "month_number"],
        raw: true,
      });

      const invoiceData = invoices.rows;

      if (!invoiceData?.length) {
        return {
          status: false,
          data: "No monthly logistic invoices found for the given filters",
        };
      }

      const fields = [
        "month_name",
        "year",
        "month_number",
        "totalAmount",
        "invoiceCreated",
        "invoiceApproved",
        "invoiceRejected",
      ];
      const json2csvParser = new Parser({ fields });
      const csvData = json2csvParser.parse(invoiceData);

      const csvFilePath = path.join(
        __dirname,
        "..",
        "reports",
        `monthly_logistic_invoice_report_${Date.now()}.csv`,
      );

      if (!fs.existsSync(path.dirname(csvFilePath))) {
        fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
      }

      fs.writeFileSync(csvFilePath, csvData);

      const user = await User.findOne({ where: { Email: email } });

      await constructMail.sendLogisticInvoicesEmail({
        email,
        csvFilePath,
        user: user?.Name || "User",
      });

      fs.unlinkSync(csvFilePath);

      return { status: true, data: "Email sent successfully" };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async getLogisticInvoiceById(id: any) {
    try {
      const invoice = await LogisticsInvoice.findOne({
        where: {
          id: Number(id),
          is_deleted: false,
        },
        attributes: [
          "id",
          "invoice_number",
          "invoice_currency",
          "final_invoice_amount",
          "invoice_date",
          "paymentDueDate",
          "status",
          ["invoice_number", "invoiceRefNumber"],
          ["final_invoice_amount", "invoiceValue"],
          ["status", "paymentStatus"],
          "month_name",
          "year",
          "daikin_reference_sor",
          "vendor_comment",
          "daikin_comment",
        ],
        include: [
          {
            model: UploadFiles,
            as: "invoice_files",
            where: {
              category_id: 8,
              is_deleted: false,
            },
            attributes: ["upload_files", "File_name"],
            required: false,
          },
          {
            model: User,
            as: "CR",
            attributes: ["name"],
            required: false,
          },
        ],
      });

      if (!invoice) {
        return { status: false, data: "Logistic invoice not found" };
      }

      return { status: true, data: invoice };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }

  async editLogisticInvoice(id: any, updateData: any, userId: any) {
    try {
      const mappedData: any = {};

      if (updateData?.invoiceDate) {
        mappedData.invoice_date = new Date(updateData?.invoiceDate);
      }
      if (updateData?.invoiceValue) {
        mappedData.final_invoice_amount = Number(updateData?.invoiceValue);
      }
      if (updateData?.currency) {
        mappedData.invoice_currency = updateData?.currency;
      }

      if (updateData?.invoiceFileUpload) {
        const attachments = [];

        if (updateData?.invoiceFileUpload) {
          attachments.push({
            upload_files: updateData?.invoiceFileUpload,
            category_id: 8,
            is_deleted: false,
          });
        }

        await UploadFiles.destroy({
          where: {
            category_id: 8,
          },
        });
        if (attachments.length) await UploadFiles.bulkCreate(attachments);
      }

      const updatedRows = await LogisticsInvoice.update(mappedData, {
        where: { id: Number(id), is_deleted: false, userId: userId },
      });

      if (updatedRows?.[0] === 0) {
        return {
          status: false,
          data: "Logistic invoice not found or no changes made",
        };
      }

      const updatedInvoice = await LogisticsInvoice.findOne({
        where: { id: Number(id), is_deleted: false, userId: userId },
      });

      if (!updatedInvoice) {
        return {
          status: false,
          data: "Logistic invoice not found after update",
        };
      }

      return { status: true, data: updatedInvoice };
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, data: error?.message };
    }
  }
}

export default new LogisticsInvoiceService();
