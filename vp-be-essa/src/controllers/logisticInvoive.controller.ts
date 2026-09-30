import { BaseController } from "./baseController";
import LogisticsInvoiceService from "../helpers/logisticInvoice.services";
import multer from "multer";
import * as Papa from "papaparse";
import * as xlsx from "xlsx";
import logger from "../utils/logger";

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");

class LogisticInvoiceController extends BaseController {
  async createInvoice(req: any, res: any) {
    try {
      const userId = req?.user?.id;

      upload(req, res, async (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "File upload failed", error: err?.message });
        }

        if (!req?.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const fileBuffer = req?.file?.buffer;
        const fileName = req?.file?.originalname;
        let parsedData: any[] = [];

        try {
          if (fileName.endsWith(".csv")) {
            const csvString = fileBuffer.toString("utf8");
            parsedData = Papa.parse(csvString, { header: true }).data;
          } else if (fileName.endsWith(".xlsx")) {
            const workbook = xlsx.read(fileBuffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              return res
                .status(400)
                .json({ message: "Excel file does not contain sheets" });
            }
            parsedData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else {
            return res.status(400).json({
              message: "Invalid file format. Only CSV and XLSX allowed",
            });
          }

          if (!parsedData.length) {
            return res
              .status(400)
              .json({ message: "No valid data found in file" });
          }
          parsedData = parsedData.map((row) => ({
            ...row,
            etd:
              typeof row.etd === "number"
                ? new Date((row.etd - 25569) * 86400 * 1000).toISOString()
                : row.etd,

            eta:
              typeof row.eta === "number"
                ? new Date((row.eta - 25569) * 86400 * 1000).toISOString()
                : row.eta,

            invoice_date:
              row.invoice_date && typeof row.invoice_date === "string"
                ? new Date(
                  `${row.invoice_date.split("-")[2]}-${row.invoice_date.split("-")[1]
                  }-${row.invoice_date.split("-")[0]}`,
                ).toISOString()
                : row.invoice_date,
          }));

          const invoiceFiles =
            typeof req?.body?.invoice_files === "string"
              ? JSON.parse(req?.body?.invoice_files)
              : req?.body?.invoice_files || [];

          const invoice = await LogisticsInvoiceService.createInvoice(
            req?.body,
            userId,
            parsedData,
            invoiceFiles,
          );

          if (!invoice?.status) {
            return await this.errors(
              req,
              res,
              this.status.HTTP_BAD_REQUEST,
              "Failed to create invoice",
            );
          }

          return await this.success(
            req,
            res,
            this.status.HTTP_OK,
            invoice?.data,
            "Invoices imported successfully",
          );
        } catch (parseError) {
          return res.status(500).json({
            message: "Error parsing file data",
            error: parseError?.message,
          });
        }
      });
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

  async submitLogisticsInvoice(req: any, res: any) {
    try {
      const invoiceId = req?.params?.id;
      const userId = req?.user?.id;

      const LogisticsInvoice =
        await LogisticsInvoiceService.submitLogisticsInvoice(invoiceId, userId);

      if (!LogisticsInvoice?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to Update",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        LogisticsInvoice?.data,
        "LogisticsInvoice created successfully",
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

  async getLogisticInvoices(req: any, res: any) {
    try {
      const { month, year, sort, sort_column } = req?.query ?? {};
      const page = Number(req?.query?.page) || 1;
      const limit = Number(req?.query?.limit) || 15;
      const userId = req?.user?.id;
      const invoices = await LogisticsInvoiceService.getLogisticInvoices({
        page,
        limit,
        month,
        year,
        sort,
        sort_column,
        userId,
      });

      if (!invoices?.status || !invoices?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to get LogisticInvoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoices?.data,
        "Logistic invoices retrieved successfully",
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

  async getLogisticInvoicesById(req: any, res: any) {
    try {
      const {
        month,
        year,
        page,
        limit,
        sort,
        sort_column,
        search,
        startDate,
        endDate,
        filterByCurrency,
        filterByStatus,
      } = req?.query ?? {};
      const userId = req?.user?.id;

      const invoiceData = await LogisticsInvoiceService.getLogisticInvoicesById(
        {
          page: Number(page) || 1,
          limit: Number(limit) || 15,
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
        },
      );

      if (!invoiceData?.status || !invoiceData?.data) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to retrieve invoices",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoiceData?.data,
        "Logistic invoices retrieved successfully",
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

  async downloadLogisticInvoicesCSV(req: any, res: any) {
    try {
      const { startDate, endDate } = req?.query ?? {};
      if (!startDate || !endDate) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Start date and end date are required",
        );
      }

      const invoices = await LogisticsInvoiceService.getLogisticInvoicesForCSV(
        startDate,
        endDate,
      );
      if (!invoices?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to fetch logistic invoices",
        );
      }

      const csv = LogisticsInvoiceService.generateLogisticInvoicesCSV(
        invoices?.data,
      );
      res.header("Content-Type", "text/csv");
      res.attachment("logistic_invoices.csv");
      return res.send(csv);
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

  async sendLogisticInvoiceReport(req: any, res: any) {
    try {
      const email = req?.user?.email;
      if (!email) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_UNAUTHORIZED,
          "UNAUTHORIZED Email Not found",
        );
      }

      const { startDate, endDate } = req?.query ?? {};
      if (!startDate || !endDate) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Start date, end date, and email are required",
        );
      }

      const response = await LogisticsInvoiceService.sendLogisticInvoiceReport(
        startDate,
        endDate,
        email,
      );
      if (!response?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          response?.data,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Logistic invoice report sent successfully",
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

  async downloadMonthlyLogisticInvoicesCSV(req: any, res: any) {
    try {
      const { month, year } = req?.query ?? {};

      const invoices =
        await LogisticsInvoiceService.getMonthlyLogisticInvoicesForCSV(
          month,
          year,
        );
      if (!invoices?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to fetch monthly logistic invoices",
        );
      }

      const csv = LogisticsInvoiceService.generateMonthlyLogisticInvoicesCSV(
        invoices?.data,
      );
      res.header("Content-Type", "text/csv");
      res.attachment("monthly_logistic_invoices.csv");
      return res.send(csv);
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

  async sendMonthlyLogisticInvoiceReport(req: any, res: any) {
    try {
      const email = req?.user?.email;
      if (!email) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_UNAUTHORIZED,
          "UNAUTHORIZED Email Not found",
        );
      }

      const { month, year } = req?.query ?? {};

      const response =
        await LogisticsInvoiceService.sendMonthlyLogisticInvoiceReport(
          month,
          year,
          email,
        );
      if (!response?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Failed to send monthly logistic invoice report",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        response?.data,
        "Monthly logistic invoice report sent successfully",
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

  async getLogisticInvoiceById(req: any, res: any) {
    try {
      const { id } = req?.params ?? {};
      if (!id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invoice ID is required",
        );
      }

      const invoice = await LogisticsInvoiceService.getLogisticInvoiceById(id);
      if (!invoice?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_NOT_FOUND,
          "Logistic invoice not found or an error occurred",
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoice?.data,
        "Logistic invoice retrieved successfully",
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

  async editLogisticInvoice(req: any, res: any) {
    try {
      const { id } = req?.params ?? {};
      if (!id) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          "Invoice ID is required",
        );
      }

      const updateData = req?.body;
      const userId = req?.user?.id;
      const invoice = await LogisticsInvoiceService.editLogisticInvoice(
        id,
        updateData,
        userId,
      );
      if (!invoice?.status) {
        return await this.errors(
          req,
          res,
          this.status.HTTP_BAD_REQUEST,
          invoice?.data,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        invoice?.data,
        "Logistic invoice updated successfully",
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
}

export default new LogisticInvoiceController();
