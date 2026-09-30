import { BaseController } from "../controllers/baseController";
import xlsx from "xlsx";
import fs from "fs";
import { StatementOfAccount } from "../models/statementOfAccount";
import pagination from "../utils/pagination";
import { Op, Order, Sequelize, WhereOptions } from "sequelize";
import {
  convertToSequalizeDate,
  parseExcelOrStringDate,
} from "../utils/globalFunction";
import { sequelize } from "../config/sequelize";
import { Vendor } from "../models/vendor";
import { APIError } from "../utils/apiError.utils";
import {
  ReconcileStatusString,
  StatusCodeEnum,
} from "../utils/enums/status.enum";
import { VendorStatement } from "../models/vendorStatement";
import { InvoiceHeader } from "../models/invoices";
import { VendorReconciliation } from "../models/vendorReconciliation";
import { VendorStatementHistory } from "../models/vendorStatementHistory";
import logger from "../utils/logger";

class SOAService extends BaseController {
  async validateData(
    filePath: any,
    transaction: any,
    vendor_id: number,
    vendorCode: any,
    entity_id: number,
  ) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook?.Sheets?.[workbook?.SheetNames?.[0]];
      const headers: any = sheet
        ? xlsx.utils.sheet_to_json(sheet, { header: 1 })?.[0]
        : [];

      const entries: any[] = [];
      let invoiceType;

      if (!headers || headers.length === 0) {
        throw new APIError(
          "Sheet is completely empty. No headers found.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const allRows = sheet
        ? xlsx.utils.sheet_to_json(sheet, { header: 1 })
        : [];
      const dataRows = allRows.slice(1);

      if (!dataRows || dataRows.length === 0) {
        throw new APIError(
          "Sheet is empty. Please add data rows after the header.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const nonEmptyRows = dataRows.filter((row) => {
        return (
          row &&
          Array.isArray(row) &&
          row.some((cell) => {
            return (
              cell !== null &&
              cell !== undefined &&
              cell !== "" &&
              cell.toString().trim() !== ""
            );
          })
        );
      });

      if (nonEmptyRows.length === 0) {
        throw new APIError(
          "Sheet contains no valid data. All data rows are empty.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const requiredHeaders = [
        "Invoice / Credit Note Reference",
        "Invoice / Credit Note Date",
        "Currency",
        "Amount in Invoice Currency",
        "Net Due Date",
      ];

      const missingHeaders = requiredHeaders.filter(
        (header: any) => !headers.includes(header),
      );
      if (missingHeaders.length > 0) {
        throw new APIError(
          "Please add a valid SOA template to Reconcile",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const data = sheet
        ? xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(1)
        : [];

      const vendor = await Vendor.findByPk(vendor_id);
      let loopCount = 0;
      for (const row of data) {
        loopCount++;
        const [
          reference,
          invoiceDateSerial,
          currency,
          amount,
          dueDateSerial,
        ]: any = row;

        if (
          reference &&
          invoiceDateSerial &&
          currency &&
          amount &&
          dueDateSerial
        ) {
          const invoiceDate = parseExcelOrStringDate(invoiceDateSerial);
          const dueDate = parseExcelOrStringDate(dueDateSerial);

          let statementCheck: any = await VendorStatement.findOne({
            where: {
              Reference: reference.toString(),
              CoCd: entity_id,
              Vendor_SAP_Code: vendorCode,
            },
          });

          let status: string;
          let comments: string;

          if (statementCheck) {
            if (statementCheck.Reconciliation_status == "RECONCILED") continue;

            const mismatchChecks = [
              {
                field: "Curr",
                value: currency,
                message: "Currency is mismatch",
              },
              {
                field: "DocDate",
                value: invoiceDate,
                message: "Invoice date is mismatch",
              },
              { field: "Amount", value: amount, message: "Amount is mismatch" },
              {
                field: "DueDate",
                value: dueDate,
                message: "Due date is mismatch",
              },
            ];

            status = "RECONCILED";
            comments = "-";
            const allMismatches = [];

            for (const check of mismatchChecks) {
              const fieldValue = statementCheck[check.field];
              const expectedValue = check.value;

              let isMismatch = false;

              if (check.field === "Amount") {
                isMismatch = Number(fieldValue) !== Number(expectedValue);
              } else if (
                fieldValue instanceof Date ||
                expectedValue instanceof Date
              ) {
                isMismatch =
                  new Date(fieldValue).getTime() !==
                  new Date(expectedValue).getTime();
              } else if (!isNaN(fieldValue) && !isNaN(expectedValue)) {
                isMismatch = Number(fieldValue) !== Number(expectedValue);
              } else {
                isMismatch = fieldValue !== expectedValue;
              }

              if (isMismatch) allMismatches.push(check.message);
            }

            if (allMismatches.length > 0) {
              status = "MISMATCH";
              comments = allMismatches.join(", ");
            } else {
            }
          } else {
            status = "MISMATCH";
            comments = "Invoice not found In Daikin SOA";
          }

          let findType = await VendorStatement.findOne({
            where: { Reference: reference.toString() },
            attributes: ["Reference", "InvType"],
          });
          const uploadedReferences = entries
            .map((e) => e?.Document_Number)
            .filter((num) => num != null)
            .map((num) => num.toString());

          await VendorStatement.update(
            {
              Reconciliation_status: "MISMATCH",
              Reconciliation_comments: "Invoice not found in vendor SOA",
              Reconciliation_date: convertToSequalizeDate(),
              CreatedDt: convertToSequalizeDate(),
            },
            {
              where: {
                CoCd: entity_id,
                Vendor_SAP_Code: vendorCode,
                Reference: { [Op.notIn]: uploadedReferences },
                [Op.or]: [
                  { Reconciliation_status: null },
                  { Reconciliation_status: { [Op.ne]: "RECONCILED" } },
                ],
              },
              transaction,
            },
          );

          if (entries.length === 0) {
            throw new APIError(
              "All the data in the uploaded excel file is Reconciled already",
              StatusCodeEnum.HTTP_BAD_REQUEST,
            );
          }

          const resultsForReturn: any[] = [];
          for (const entry of entries) {
            let exist = await VendorReconciliation.findOne({
              where: { Document_Number: entry.Reference.toString() },
              transaction,
            });

            if (exist) {
              await exist.update(entry, { transaction });
            } else {
              exist = await VendorReconciliation.create(entry, { transaction });
            }

            await VendorStatementHistory.create(entry, { transaction });

            resultsForReturn.push({
              ID: exist?.ID || null,
              "Invoice / Credit Note Reference": entry.Reference,
              "Invoice / Credit Note Date": new Date(
                entry.Document_Date.args[1],
              ),
              Currency: entry.Curr,
              "Amount in Invoice Currency": entry.Amount,
              "Net Due Date": new Date(entry.Due_Date.args[1]),
              ReconStatus: entry.ReconStatus,
              ReconDetails: entry.ReconDetails,
              InvType: entry?.InvType || null,
            });
          }

          fs.unlinkSync(filePath);
          const currencyTotals: any = {};
          for (const row of resultsForReturn) {
            const currency = row["Currency"];
            const amount = Number(row["Amount in Invoice Currency"]) || 0;
            if (!currencyTotals[currency]) currencyTotals[currency] = 0;
            currencyTotals[currency] += amount;
          }

          const result = {
            list: resultsForReturn,
            calculations: currencyTotals,
          };

          return { status: true, data: result };
        }
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async validateDatav1(
    filePath: any,
    transaction: any,
    vendor_id: number,
    vendorCode: any,
    entity_id: number,
  ) {
    const startTime = Date.now();

    try {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook?.Sheets?.[workbook?.SheetNames?.[0]];
      const headers: any = sheet
        ? xlsx.utils.sheet_to_json(sheet, { header: 1 })?.[0]
        : [];
      const entries: any[] = [];
      let invoiceType;

      if (!headers || headers.length === 0) {
        throw new APIError(
          "Sheet is completely empty. No headers found.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const allRows = sheet
        ? xlsx.utils.sheet_to_json(sheet, { header: 1 })
        : [];
      const dataRows = allRows.slice(1);

      if (!dataRows || dataRows.length === 0) {
        throw new APIError(
          "Sheet is empty. Please add data rows after the header.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const nonEmptyRows = dataRows.filter(
        (row) =>
          row &&
          Array.isArray(row) &&
          row.some(
            (cell) =>
              cell !== null &&
              cell !== undefined &&
              cell !== "" &&
              cell.toString().trim() !== "",
          ),
      );

      if (nonEmptyRows.length === 0) {
        throw new APIError(
          "Sheet contains no valid data. All data rows are empty.",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }
      const requiredHeaders = [
        "Invoice / Credit Note Reference",
        "Invoice / Credit Note Date",
        "Currency",
        "Amount in Invoice Currency",
        "Net Due Date",
      ];

      const missingHeaders = requiredHeaders.filter(
        (header: any) => !headers.includes(header),
      );
      if (missingHeaders.length > 0) {
        throw new APIError(
          "Please add a valid SOA template to Reconcile",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      const data = sheet
        ? xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(1)
        : [];
      const vendor = await Vendor.findByPk(vendor_id);

      let processedCount = 0;

      for (const row of data) {
        const [
          reference,
          invoiceDateSerial,
          currency,
          amount,
          dueDateSerial,
        ]: any = row;

        if (
          reference &&
          invoiceDateSerial &&
          currency &&
          amount &&
          dueDateSerial
        ) {
          const invoiceDate = parseExcelOrStringDate(invoiceDateSerial);
          const dueDate = parseExcelOrStringDate(dueDateSerial);

          let statementCheck: any = await VendorStatement.findOne({
            where: {
              Reference: reference.toString(),
              CoCd: entity_id,
              Vendor_SAP_Code: vendorCode,
            },
            transaction,
          });

          let status: string;
          let comments: string;

          if (statementCheck) {
            if (statementCheck.Reconciliation_status === "RECONCILED") continue;

            const mismatchChecks = [
              {
                field: "Curr",
                value: currency,
                message: "Currency is mismatch",
              },
              {
                field: "DocDate",
                value: invoiceDate,
                message: "Invoice date is mismatch",
              },
              { field: "Amount", value: amount, message: "Amount is mismatch" },
              {
                field: "DueDate",
                value: dueDate,
                message: "Due date is mismatch",
              },
            ];

            status = "RECONCILED";
            comments = "-";
            const allMismatches: string[] = [];

            for (const check of mismatchChecks) {
              const fieldValue = statementCheck[check.field];
              const expectedValue = check.value;
              let isMismatch = false;

              if (check.field === "Amount") {
                const fieldNum = Number(fieldValue);
                const expectedNum = Number(expectedValue);
                isMismatch = fieldNum !== expectedNum;
              } else if (
                fieldValue instanceof Date ||
                expectedValue instanceof Date
              ) {
                isMismatch =
                  new Date(fieldValue).getTime() !==
                  new Date(expectedValue).getTime();
              } else if (!isNaN(fieldValue) && !isNaN(expectedValue)) {
                isMismatch = Number(fieldValue) !== Number(expectedValue);
              } else {
                isMismatch = fieldValue !== expectedValue;
              }

              if (isMismatch) {
                allMismatches.push(check.message);
              }
            }

            if (allMismatches.length > 0) {
              status = "MISMATCH";
              comments = allMismatches.join(", ");
            }

            await statementCheck.update(
              {
                Reconciliation_status: status,
                Reconciliation_comments: comments,
                Reconciliation_date: convertToSequalizeDate(),
                InvType: invoiceType,
                CreatedDt: convertToSequalizeDate(),
              },
              { transaction },
            );
          } else {
            status = "MISMATCH";
            comments = "Invoice not found In Daikin SOA";
          }

          let findType = await VendorStatement.findOne({
            where: { Reference: reference.toString() },
            attributes: ["Reference", "InvType"],
            transaction,
          });

          entries.push({
            Category: statementCheck ? statementCheck.InvType : null,
            Vendor_Code: vendor?.Vendor_SAP_Code,
            CoCd: entity_id.toString(),
            Document_Number: reference,
            Reference: reference,
            Document_Date: convertToSequalizeDate(invoiceDate),
            Curr: currency,
            Amount: amount,
            Due_Date: convertToSequalizeDate(dueDate),
            ReconStatus: status,
            ReconDetails: comments,
            InvType: findType?.InvType ?? null,
            CreatedDt: Sequelize.literal("NOW()"),
          });

          processedCount++;
          if (processedCount % 200 === 0) {
          }
        }
      }

      const uploadedReferences = entries
        .map((e) => e?.Document_Number)
        .filter((num) => num != null)
        .map((num) => num.toString());

      await VendorStatement.update(
        {
          Reconciliation_status: "MISMATCH",
          Reconciliation_comments: "Invoice not found in vendor SOA",
          Reconciliation_date: convertToSequalizeDate(),
          CreatedDt: convertToSequalizeDate(),
        },
        {
          where: {
            CoCd: entity_id,
            Vendor_SAP_Code: vendorCode,
            Reference: { [Op.notIn]: uploadedReferences },
            [Op.or]: [
              { Reconciliation_status: null },
              { Reconciliation_status: { [Op.ne]: "RECONCILED" } },
            ],
          },
          transaction,
        },
      );

      if (entries.length === 0) {
        throw new APIError(
          "All the data in the uploaded excel file is Reconciled already",
          StatusCodeEnum.HTTP_BAD_REQUEST,
        );
      }

      // ✅ MSSQL-safe bulk insert/update
      const existingRefs = await VendorReconciliation.findAll({
        attributes: ["Reference"],
        where: {
          Reference: {
            [Op.in]: (entries ?? []).map((e) => String(e.Reference)),
          }, // ✅ Force all to string
          CoCd: entity_id,
          Vendor_Code: vendorCode,
        },
        transaction,
        raw: true,
      });

      const existingRefsSet = new Set(
        (existingRefs ?? []).map((e) => e.Reference),
      );
      const toInsert = entries.filter((e) => !existingRefsSet.has(e.Reference));
      const toUpdate = entries.filter((e) => existingRefsSet.has(e.Reference));
      if (toInsert.length > 0) {
        await VendorReconciliation.bulkCreate(toInsert, { transaction });
      }

      const BATCH_SIZE_RECON = 200;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE_RECON) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE_RECON);
        await Promise.all(
          batch.map((record) =>
            VendorReconciliation.update(
              {
                ReconStatus: record.ReconStatus,
                ReconDetails: record.ReconDetails,
                Document_Date: record.Document_Date,
                Due_Date: record.Due_Date,
                Curr: record.Curr,
                Amount: record.Amount,
                InvType: record.InvType,
              },
              {
                where: {
                  Reference: record.Reference,
                  CoCd: entity_id,
                  Vendor_Code: vendorCode,
                },
                transaction,
              },
            ),
          ),
        );
      }
      const BATCH_SIZE_HISTORY = 300;

      for (let i = 0; i < entries.length; i += BATCH_SIZE_HISTORY) {
        const batch = entries
          .slice(i, i + BATCH_SIZE_HISTORY)
          .map((item: any) => ({
            ...item,
            // ensure all varchar fields are strings
            Document_Number: item?.Document_Number
              ? String(item?.Document_Number)
              : "",
            Reference: item?.Reference ? String(item?.Reference) : "",
            CoCd: item?.CoCd ? String(item?.CoCd) : "",
            Vendor_Code: item?.Vendor_Code ? String(item?.Vendor_Code) : "",
            Curr: item?.Curr ? String(item?.Curr) : "",
            Category: item?.Category ? String(item?.Category) : "",
            InvType: item?.InvType ? String(item?.InvType) : "",
            ReconStatus: item?.ReconStatus ? String(item?.ReconStatus) : "",
            ReconDetails: item?.ReconDetails ? String(item?.ReconDetails) : "",
          }));

        await VendorStatementHistory.bulkCreate(batch, { transaction });
      }

      fs.unlinkSync(filePath);

      const currencyTotals: any = {};
      for (const row of entries) {
        const currency = row["Curr"];
        const amount = Number(row["Amount"]) || 0;
        if (!currencyTotals[currency]) {
          currencyTotals[currency] = 0;
        }
        currencyTotals[currency] += amount;
      }

      const endTime = Date.now();
      return {
        status: true,
        data: { list: entries, calculations: currencyTotals },
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode || 500);
    }
  }

  async statementOfAccountListing(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      console.info("@SOAService @statementOfOrderListing");

      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendor = id ? await Vendor.findByPk(id) : null;

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        ...(vendor && { Vendor_SAP_Code: vendor?.Vendor_SAP_Code }),
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      if (query?.date) {
        payload.DueDate = {
          [Op.lte]: convertToSequalizeDate(query?.date),
        };
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";

        if (query?.reconciliation_status == 2) {
          payload.reconciliation_status = "Pending for Reconciliation";
        }
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      const calculateAmount = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of calculateAmount?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message?.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForAdmin(
    limit: any,
    page: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
    vendorIds?: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;
      vendorIds = vendorIds || [];

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
      };

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: vendorIds } },
        attributes: ["Vendor_SAP_Code"],
      });
      const vendorSAPCodes = (vendors ?? []).map((v) => v?.Vendor_SAP_Code);

      if (vendorSAPCodes && vendorSAPCodes.length) {
        payload.Vendor_SAP_Code = { [Op.in]: vendorSAPCodes };
      }

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      if (query?.date) {
        payload.DueDate = {
          [Op.lte]: convertToSequalizeDate(query?.date),
        };
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        if (status === 0) {
          payload.reconciliation_status = "RECONCILED";
        } else if (status === 1) {
          payload.reconciliation_status = "MISMATCH";
        } else if (status === 2) {
          payload.reconciliation_status = "Pending for Reconciliation";
        }
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      const calculateAmount = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
        order,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of calculateAmount?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message?.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForBusiness(
    limit: any,
    page: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
    vendorIds?: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;
      vendorIds = vendorIds || [];

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
      };

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: vendorIds } },
        attributes: ["Vendor_SAP_Code"],
      });
      const vendorSAPCodes = (vendors ?? []).map((v) => v?.Vendor_SAP_Code);

      payload.Vendor_SAP_Code = { [Op.in]: vendorSAPCodes };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      if (query?.date) {
        payload.DueDate = {
          [Op.lte]: convertToSequalizeDate(query?.date),
        };
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        if (status === 0) {
          payload.reconciliation_status = "RECONCILED";
        } else if (status === 1) {
          payload.reconciliation_status = "MISMATCH";
        } else if (status === 2) {
          payload.reconciliation_status = "Pending for Reconciliation";
        }
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      const calculateAmount = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN", "Vendor_SAP_Code"],
          },
        ],
        order,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of calculateAmount?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message?.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async soaListingByMonth(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = parseInt(limit) || 10;
      page = parseInt(page) || 1;

      const sortField = query?.sort_column || "CreatedDt";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "DocType":
          order.push(["Category", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["Document_Date", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "DocNo":
          order.push(["Document_Number", sortDirection]);
          break;
        case "DueDate":
          order.push(["Due_Date", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["ReconStatus", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["ReconDetails", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendor = id ? await Vendor.findByPk(id) : null;

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        ...(vendor && { Vendor_Code: vendor?.Vendor_SAP_Code }),
      };

      if (start_date && end_date) {
        const start = convertToSequalizeDate(`${start_date}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${end_date}T23:59:59.999Z`);
        payload.CreatedDt = {
          [Op.between]: [start, end],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          const start = convertToSequalizeDate(`${startDateStr}T00:00:00.000Z`);
          const end = convertToSequalizeDate(`${endDateStr}T23:59:59.999Z`);
          payload.CreatedDt = {
            [Op.between]: [start, end],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        const start = convertToSequalizeDate(
          `${query?.due_start_date}T00:00:00.000Z`,
        );
        const end = convertToSequalizeDate(
          `${query?.due_end_date}T23:59:59.999Z`,
        );
        payload.Due_Date = {
          [Op.between]: [start, end],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.ReconStatus = status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Document_Number: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_Code: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorReconciliation.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit,
        offset: (page - 1) * limit,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message?.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async soaListingByMonthForAdmin(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = parseInt(limit) || 10;
      page = parseInt(page) || 1;

      const sortField = query?.sort_column || "CreatedDt";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "DocType":
          order.push(["Category", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["Document_Date", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "DocNo":
          order.push(["Document_Number", sortDirection]);
          break;
        case "DueDate":
          order.push(["Due_Date", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["ReconStatus", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["ReconDetails", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        const start = convertToSequalizeDate(`${start_date}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${end_date}T23:59:59.999Z`);
        payload.CreatedDt = {
          [Op.between]: [start, end],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          const start = convertToSequalizeDate(`${startDateStr}T00:00:00.000Z`);
          const end = convertToSequalizeDate(`${endDateStr}T23:59:59.999Z`);
          payload.CreatedDt = {
            [Op.between]: [start, end],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        const start = convertToSequalizeDate(
          `${query?.due_start_date}T00:00:00.000Z`,
        );
        const end = convertToSequalizeDate(
          `${query?.due_end_date}T23:59:59.999Z`,
        );
        payload.Due_Date = {
          [Op.between]: [start, end],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.ReconStatus = status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Document_Number: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_Code: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorReconciliation.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit,
        offset: (page - 1) * limit,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message?.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async soaListingByMonthForBusiness(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = parseInt(limit) || 10;
      page = parseInt(page) || 1;

      const sortField = query?.sort_column || "CreatedDt";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "DocType":
          order.push(["Category", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["Document_Date", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "DocNo":
          order.push(["Document_Number", sortDirection]);
          break;
        case "DueDate":
          order.push(["Due_Date", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["ReconStatus", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["ReconDetails", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
      };
      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: id } },
        attributes: ["Vendor_SAP_Code"],
      });
      const vendorSAPCodes = (vendors ?? []).map(
        (v: any) => v?.Vendor_SAP_Code,
      );
      payload.Vendor_Code = { [Op.in]: vendorSAPCodes };

      // Date range (DocDate)
      if (start_date && end_date) {
        const start = convertToSequalizeDate(`${start_date}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${end_date}T23:59:59.999Z`);
        payload.CreatedDt = {
          [Op.between]: [start, end],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          const start = convertToSequalizeDate(`${startDateStr}T00:00:00.000Z`);
          const end = convertToSequalizeDate(`${endDateStr}T23:59:59.999Z`);
          payload.CreatedDt = {
            [Op.between]: [start, end],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        const start = convertToSequalizeDate(
          `${query?.due_start_date}T00:00:00.000Z`,
        );
        const end = convertToSequalizeDate(
          `${query?.due_end_date}T23:59:59.999Z`,
        );
        payload.Due_Date = {
          [Op.between]: [start, end],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.ReconStatus = status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Document_Number: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_Code: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorReconciliation.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit,
        offset: (page - 1) * limit,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async soaListingByMonthforMail(
    limit: any,
    page: any,
    id: any,
    startDate: any,
    endDate: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 1000;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "CreatedDt";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      const vendor = id ? await Vendor.findByPk(id) : null;

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        ...(vendor && { Vendor_Code: vendor?.Vendor_SAP_Code }),
      };

      // Date range (DocDate)
      if (startDate && endDate) {
        const start = convertToSequalizeDate(`${startDate}T00:00:00.000Z`);
        const end = convertToSequalizeDate(`${endDate}T23:59:59.999Z`);
        payload.CreatedDt = {
          [Op.between]: [start, end],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          const start = convertToSequalizeDate(`${startDateStr}T00:00:00.000Z`);
          const end = convertToSequalizeDate(`${endDateStr}T23:59:59.999Z`);
          payload.CreatedDt = {
            [Op.between]: [start, end],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        const start = convertToSequalizeDate(
          `${query?.due_start_date}T00:00:00.000Z`,
        );
        const end = convertToSequalizeDate(
          `${query?.due_end_date}T23:59:59.999Z`,
        );
        payload.Due_Date = {
          [Op.between]: [start, end],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorReconciliation.findAndCountAll({
        where: payload,
        order,
        limit: limitNumber,
        offset: offset,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async soaHistoryListing(
    limit: any,
    page: any,
    id: any,
    query: any,
    vendorId: any,
  ) {
    try {
      limit = 10000;
      page = page || 1;

      let sortField = query?.sort_column || "month";
      let sortDirection = query?.sort || "DESC";

      const vendor = vendorId ? await Vendor.findByPk(vendorId) : null;

      let payload: any = {
        CoCd: query?.entity_id,
        Vendor_Code: vendor?.Vendor_SAP_Code,
      };

      const data: any = await this.#getJoinData(payload, [], limit, page);
      type GroupedData = {
        year: number;
        month: number;
        statusList: number[];
      };

      const groupedData = (data ?? []).reduce(
        (acc: Record<string, GroupedData>, item: VendorStatement) => {
          // item = item?.get?.({ plain: true }) ?? {};
          const month = new Date(item?.CreatedDt).getMonth() + 1;
          const year = new Date(item?.CreatedDt).getFullYear();

          const key = `${year}-${month}`;

          if (!acc[key]) {
            acc[key] = {
              year,
              month,
              statusList: [],
            };
          }

          acc[key].statusList.push(item?.Reconciliation_status);
          return acc;
        },
        {},
      );

      let result = Object.values(groupedData).map((group: any) => {
        const allReconciled = group.statusList.every(
          (status: any) => status === ReconcileStatusString.RECONCILED,
        );
        const allNotReconciled = group.statusList.every(
          (status: any) => status === ReconcileStatusString.MISMATCH,
        );

        let reconciliationStatus = "Partially Reconciled";

        if (allReconciled) {
          reconciliationStatus = "Fully Reconciled";
        } else if (allNotReconciled) {
          reconciliationStatus = "Not Reconciled";
        }

        return {
          month: group.month,
          year: group.year,
          reconciliationStatus,
        };
      });

      if (query?.month) {
        result = result.filter(
          (item: any) => item?.month === parseInt(query?.month),
        );
      }

      if (query?.year) {
        result = result.filter(
          (item: any) => item?.year === parseInt(query?.year),
        );
      }

      result.sort((a: any, b: any) => {
        if (sortField === "year" || sortField === "month") {
          const fieldA = a[sortField];
          const fieldB = b[sortField];
          if (sortDirection === "ASC") {
            return fieldA - fieldB;
          } else {
            return fieldB - fieldA;
          }
        } else if (sortField === "reconciliation_status") {
          const statusPriority = (status: string) => {
            switch (status) {
              case "Fully Reconciled":
                return 1;
              case "Partially Reconciled":
                return 2;
              case "Not Reconciled":
                return 3;
              default:
                return 4;
            }
          };

          if (sortDirection === "ASC") {
            return (
              statusPriority(a.reconciliationStatus) -
              statusPriority(b.reconciliationStatus)
            );
          } else {
            return (
              statusPriority(b.reconciliationStatus) -
              statusPriority(a.reconciliationStatus)
            );
          }
        }
      });

      const startIndex = (page - 1) * limit;
      const paginatedResult = result.slice(startIndex, startIndex + limit);

      const finalResult = {
        totalRecords: result.length,
        totalPages: Math.ceil(result.length / limit),
        currentPage: page,
        data: paginatedResult,
      };

      if (result.length > 0) {
        return { status: true, data: finalResult };
      } else {
        throw new APIError(`no data found`, StatusCodeEnum.HTTP_OK);
        // return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async soaHistoryListingForAdmin(limit: any, page: any, id: any, query: any) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "month";
      let sortDirection = query?.sort || "DESC";

      // const vendor = id ? await Vendor.findByPk(vendorId) : null;

      let payload: any = {
        CoCd: query?.entity_id,
      };

      const data: any = await this.#getJoinData(payload, [], limit, page);
      type GroupedData = {
        year: number;
        month: number;
        statusList: number[];
      };

      const groupedData = (data ?? []).reduce(
        (acc: Record<string, GroupedData>, item: VendorStatement) => {
          // item = item?.get?.({ plain: true }) ?? {};
          const month = new Date(item?.CreatedDt).getMonth() + 1;
          const year = new Date(item?.CreatedDt).getFullYear();

          const key = `${year}-${month}`;

          if (!acc[key]) {
            acc[key] = {
              year,
              month,
              statusList: [],
            };
          }

          acc[key].statusList.push(item?.Reconciliation_status);
          return acc;
        },
        {},
      );

      let result = Object.values(groupedData).map((group: any) => {
        const allReconciled = group.statusList.every(
          (status: any) => status === ReconcileStatusString.RECONCILED,
        );
        const allNotReconciled = group.statusList.every(
          (status: any) => status === ReconcileStatusString.MISMATCH,
        );

        let reconciliationStatus = "Partially Reconciled";

        if (allReconciled) {
          reconciliationStatus = "Fully Reconciled";
        } else if (allNotReconciled) {
          reconciliationStatus = "Not Reconciled";
        }

        return {
          month: group.month,
          year: group.year,
          reconciliationStatus,
        };
      });

      if (query?.month) {
        result = result.filter(
          (item: any) => item?.month === parseInt(query?.month),
        );
      }

      if (query?.year) {
        result = result.filter(
          (item: any) => item?.year === parseInt(query?.year),
        );
      }

      result.sort((a: any, b: any) => {
        if (sortField === "year" || sortField === "month") {
          const fieldA = a[sortField];
          const fieldB = b[sortField];
          if (sortDirection === "ASC") {
            return fieldA - fieldB;
          } else {
            return fieldB - fieldA;
          }
        } else if (sortField === "reconciliation_status") {
          const statusPriority = (status: string) => {
            switch (status) {
              case "Fully Reconciled":
                return 1;
              case "Partially Reconciled":
                return 2;
              case "Not Reconciled":
                return 3;
              default:
                return 4;
            }
          };

          if (sortDirection === "ASC") {
            return (
              statusPriority(a.reconciliationStatus) -
              statusPriority(b.reconciliationStatus)
            );
          } else {
            return (
              statusPriority(b.reconciliationStatus) -
              statusPriority(a.reconciliationStatus)
            );
          }
        }
      });

      const startIndex = (page - 1) * limit;
      const paginatedResult = result.slice(startIndex, startIndex + limit);

      const finalResult = {
        totalRecords: result.length,
        totalPages: Math.ceil(result.length / limit),
        currentPage: page,
        data: paginatedResult,
      };

      if (result.length > 0) {
        return { status: true, data: finalResult };
      } else {
        throw new APIError(`no data found`, StatusCodeEnum.HTTP_OK);
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async soaHistoryListingForBusiness(
    limit: any,
    page: any,
    id: any,
    query: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "month";
      let sortDirection = query?.sort || "DESC";

      let payload: any = {
        CoCd: query?.entity_id,
      };

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: id } },
        attributes: ["Vendor_SAP_Code"],
      });
      const vendorSAPCodes = (vendors ?? []).map((v) => v?.Vendor_SAP_Code);

      // if (vendorSAPCodes && vendorSAPCodes.length) {
      payload.Vendor_Code = { [Op.in]: vendorSAPCodes };
      const data: any = await this.#getJoinData(payload, [], limit, page);
      type GroupedData = {
        year: number;
        month: number;
        statusList: number[];
      };

      const groupedData = (data ?? []).reduce(
        (acc: Record<string, GroupedData>, item: VendorStatement) => {
          const month = new Date(item?.CreatedDt).getMonth() + 1;
          const year = new Date(item?.CreatedDt).getFullYear();

          const key = `${year}-${month}`;

          if (!acc[key]) {
            acc[key] = {
              year,
              month,
              statusList: [],
            };
          }

          acc[key].statusList.push(item?.Reconciliation_status);
          return acc;
        },
        {},
      );

      let result = Object.values(groupedData).map((group: any) => {
        const allReconciled = group.statusList.every(
          (status: any) => status === ReconcileStatusString.RECONCILED,
        );
        const allNotReconciled = group.statusList.every(
          (status: any) => status === ReconcileStatusString.MISMATCH,
        );

        let reconciliationStatus = "Partially Reconciled";

        if (allReconciled) {
          reconciliationStatus = "Fully Reconciled";
        } else if (allNotReconciled) {
          reconciliationStatus = "Not Reconciled";
        }

        return {
          month: group.month,
          year: group.year,
          reconciliationStatus,
        };
      });

      if (query?.month) {
        result = result.filter(
          (item: any) => item?.month === parseInt(query?.month),
        );
      }

      if (query?.year) {
        result = result.filter(
          (item: any) => item?.year === parseInt(query?.year),
        );
      }

      result.sort((a: any, b: any) => {
        if (sortField === "year" || sortField === "month") {
          const fieldA = a[sortField];
          const fieldB = b[sortField];
          if (sortDirection === "ASC") {
            return fieldA - fieldB;
          } else {
            return fieldB - fieldA;
          }
        } else if (sortField === "reconciliation_status") {
          const statusPriority = (status: string) => {
            switch (status) {
              case "Fully Reconciled":
                return 1;
              case "Partially Reconciled":
                return 2;
              case "Not Reconciled":
                return 3;
              default:
                return 4;
            }
          };

          if (sortDirection === "ASC") {
            return (
              statusPriority(a.reconciliationStatus) -
              statusPriority(b.reconciliationStatus)
            );
          } else {
            return (
              statusPriority(b.reconciliationStatus) -
              statusPriority(a.reconciliationStatus)
            );
          }
        }
      });

      const startIndex = (page - 1) * limit;
      const paginatedResult = result.slice(startIndex, startIndex + limit);

      const finalResult = {
        totalRecords: result.length,
        totalPages: Math.ceil(result.length / limit),
        currentPage: page,
        data: paginatedResult,
      };

      if (result.length > 0) {
        return { status: true, data: finalResult };
      } else {
        throw new APIError(`no data found`, StatusCodeEnum.HTTP_OK);
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async getOneSOA(query: any) {
    try {
      let result = await VendorReconciliation.findOne({
        where: { Document_Number: query?.id },
      });

      return { status: true, data: result };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async allStatementOfAccountListing(
    limit: any,
    page: any,
    entity_id: any,
    dateTimeRange: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "accounted_date";
      let sortDirection = query?.sort || "DESC";
      const order: any = [];

      switch (sortField) {
        case "type":
          order.push(["type", sortDirection]);
          break;
        case "reference":
          order.push(["reference", sortDirection]);
          break;
        case "vendor_name":
          order.push(["vendorSOAData", "vendor_name", sortDirection]);
          break;
        case "vendor_code":
          order.push(["vendorSOAData", "id", sortDirection]);
          break;
        case "currency_type":
          order.push(["currency_type", sortDirection]);
          break;
        case "accounted_date":
          order.push(["DocDate", sortDirection]);
          break;
        case "currency":
          order.push(["currency", sortDirection]);
          break;
        case "due_date":
          order.push(["due_date", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["reconciliation_comments", sortDirection]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      let payload: any = { entity_id: entity_id };

      if (dateTimeRange && dateTimeRange.startDate && dateTimeRange.endDate) {
        payload.DocDate = {
          [Op.between]: [
            new Date(dateTimeRange.startDate),
            new Date(dateTimeRange.endDate),
          ],
        };
      }

      if (query?.currency) {
        payload.currency_type = query?.currency;
      }
      let searchCondition = {};
      if (searchQuery) {
        searchCondition = {
          [Op.or]: [{ reference: { [Op.like]: `%${searchQuery}%` } }],
        };
      }

      const whereCondition = { ...payload };
      if (searchCondition) {
        Object.assign(whereCondition, searchCondition);
      }

      let data: any = await StatementOfAccount.findAndCountAll({
        where: whereCondition,
        order: order,
        offset: limit * (page - 1),
        limit: limit,
        attributes: [
          "id",
          "type",
          "reference",
          "currency_type",
          "currency",
          "due_date",
          "reconciliation_status",
          "reconciliation_comments",
        ],
        include: [
          {
            model: Vendor,
            as: "vendorSOAData",
            attributes: ["id", "vendor_name"],
          },
        ],
      });

      let [overalAmount]: any = await sequelize.query(`
                SELECT
                    currency_type,
                    SUM(CASE WHEN type = 0 THEN currency ELSE 0 END) AS IR,
                    SUM(CASE WHEN type = 1 THEN currency ELSE 0 END) AS CR,
                    SUM(CASE WHEN type = 0 THEN currency ELSE 0 END) - SUM(CASE WHEN type = 1 THEN currency ELSE 0 END) AS net_total
                FROM 
                    statement_of_account;
                `),
        invoice_value = overalAmount[0];

      let result = pagination.paginationData(limit, page, data);

      if (data) {
        return { status: true, data: { result, invoice_value: invoice_value } };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Error fetching SOA", error: error };
    }
  }

  async allSOAHistoryListing(
    limit: any,
    page: any,
    entity_id: any,
    query: any,
  ) {
    try {
      limit = limit || 10;
      page = page || 1;

      let sortField = query?.sort_column || "month";
      let sortDirection = query?.sort || "DESC";

      let payload: any = { entity_id: entity_id };

      let data: any = await StatementOfAccount.findAll({
        where: payload,
        attributes: [
          "id",
          "type",
          "reference",
          "currency_type",
          "currency",
          "due_date",
          "reconciliation_status",
          "reconciliation_comments",
          "accounted_date",
        ],
      });
      const groupedData = (data ?? []).reduce((acc: any, item: any) => {
        item = item?.get?.({ plain: true }) ?? {};
        const month = new Date(item?.DocDate).getMonth() + 1;
        const year = new Date(item?.DocDate).getFullYear();

        const key = `${year}-${month}`;

        if (!acc[key]) {
          acc[key] = {
            year,
            month,
            statusList: [],
          };
        }

        acc[key].statusList.push(item?.Reconciliation_status);
        return acc;
      }, {});
      let result = Object.values(groupedData).map((group: any) => {
        const allReconciled = group.statusList.every(
          (status: boolean) => status === true,
        );
        const allNotReconciled = group.statusList.every(
          (status: boolean) => status === false,
        );

        let reconciliationStatus = "Partially Reconciled";

        if (allReconciled) {
          reconciliationStatus = "Fully Reconciled";
        } else if (allNotReconciled) {
          reconciliationStatus = "Not Reconciled";
        }

        return {
          month: group.month,
          year: group.year,
          reconciliationStatus,
        };
      });
      if (query?.month) {
        result = result.filter(
          (item: any) => item?.month === parseInt(query?.month),
        );
      }

      if (query?.year) {
        result = result.filter(
          (item: any) => item?.year === parseInt(query?.year),
        );
      }

      result.sort((a: any, b: any) => {
        if (sortField === "year" || sortField === "month") {
          const fieldA = a[sortField];
          const fieldB = b[sortField];
          if (sortDirection === "ASC") {
            return fieldA - fieldB;
          } else {
            return fieldB - fieldA;
          }
        } else if (sortField === "reconciliation_status") {
          const statusPriority = (status: string) => {
            switch (status) {
              case "Fully Reconciled":
                return 1;
              case "Partially Reconciled":
                return 2;
              case "Not Reconciled":
                return 3;
              default:
                return 4;
            }
          };

          if (sortDirection === "ASC") {
            return (
              statusPriority(a.reconciliationStatus) -
              statusPriority(b.reconciliationStatus)
            );
          } else {
            return (
              statusPriority(b.reconciliationStatus) -
              statusPriority(a.reconciliationStatus)
            );
          }
        }
      });

      const startIndex = (page - 1) * limit;
      const paginatedResult = result.slice(startIndex, startIndex + limit);

      const finalResult = {
        totalRecords: result.length,
        totalPages: Math.ceil(result.length / limit),
        currentPage: page,
        data: paginatedResult,
      };

      if (result.length > 0) {
        return { status: true, data: finalResult };
      } else {
        return { status: false, data: "" };
      }
    } catch (error) {
      logger.error("Error:", error);
      return { status: false, message: "Error fetching SOA", error: error };
    }
  }

  async #getJoinData(
    payload: WhereOptions,
    order: Order,
    limit: number,
    page: number,
  ) {
    const vendorReconciliations = await VendorReconciliation.findAll({
      where: payload,
      order: order,
      offset: limit * (page - 1),
      limit: limit,
      attributes: [
        "ID",
        "Category",
        "Reference",
        "Document_Date",
        "Curr",
        "Amount",
        "Due_Date",
        "ReconStatus",
        "ReconDetails",
        "CreatedDt",
      ],
    });

    // Map to match the old response field names
    return vendorReconciliations.map((item: any) => {
      const data = item?.get?.() ?? {};
      return {
        ID: data.ID,
        DocType: data.Category,
        Reference: data.Reference,
        DocDate: data.Document_Date,
        Curr: data.Curr,
        Amount: data.Amount,
        DueDate: data.Due_Date,
        Reconciliation_status: data.ReconStatus,
        Reconciliation_comments: data.ReconDetails,
        CreatedDt: data.CreatedDt,
      };
    });
  }

  async editSOA(body: any) {
    try {
      const { ID, Amount, Curr, DocDate, DueDate, newSOA } = body;

      // 1. Find the VendorReconciliation record by ID
      const vendorReconciliation = await VendorReconciliation.findByPk(ID);
      if (!vendorReconciliation) {
        throw new APIError("VendorReconciliation record not found", 404);
      }

      // 2. Get Document_Number from VendorReconciliation
      const documentNumber = vendorReconciliation.Reference;

      // 3. Find matching VendorStatement record by DocNo
      const vendorStatement: any = await VendorStatement.findOne({
        where: {
          Reference: documentNumber,
        },
      });

      let reconciliationStatus = "MISMATCH";
      let reconciliationComments = "Invoice not found In Daikin SOA";

      if (vendorStatement) {
        // 4. Check if all payload data matches VendorStatement
        const mismatchChecks = [
          {
            field: "Amount",
            value: Amount,
            message: "Amount is mismatch",
          },
          {
            field: "Curr",
            value: Curr,
            message: "Currency is mismatch",
          },
          {
            field: "DocDate",
            value: DocDate, // Use original date string, not converted
            message: "Invoice date is mismatch",
          },
          {
            field: "DueDate",
            value: DueDate, // Use original date string, not converted
            message: "Due date is mismatch",
          },
        ];

        let isMatch = true;
        let firstMismatch = "";

        for (const check of mismatchChecks) {
          const fieldValue = vendorStatement[check.field];
          const expectedValue = check.value;

          let isMismatch = false;

          if (check.field === "Amount") {
            // Special handling for Amount field - ignore negative signs
            const normalizedFieldValue = Math.abs(Number(fieldValue));
            const normalizedExpectedValue = Math.abs(Number(expectedValue));
            isMismatch = normalizedFieldValue !== normalizedExpectedValue;
          } else if (check.field === "DocDate" || check.field === "DueDate") {
            // Handle date comparison properly
            const vendorDate = fieldValue
              ? new Date(fieldValue).toISOString().split("T")[0]
              : null;
            const expectedDate = expectedValue
              ? new Date(expectedValue).toISOString().split("T")[0]
              : null;

            isMismatch = vendorDate !== expectedDate;
          } else if (!isNaN(fieldValue) && !isNaN(expectedValue)) {
            const vendorNum = Number(fieldValue);
            const expectedNum = Number(expectedValue);
            isMismatch = vendorNum !== expectedNum;
          } else {
            isMismatch = fieldValue !== expectedValue;
          }

          if (isMismatch) {
            isMatch = false;
            firstMismatch = check.message;

            break;
          } else {
          }
        }

        if (isMatch) {
          reconciliationStatus = "RECONCILED";
          reconciliationComments = "-";
        } else {
          reconciliationStatus = "MISMATCH";
          reconciliationComments = firstMismatch;
        }

        await vendorStatement.update({
          Reconciliation_status: reconciliationStatus,
          Reconciliation_comments: reconciliationComments,
          Reconciliation_date: convertToSequalizeDate(),
        });
      } else {
      }

      // 6. Update VendorReconciliation
      const updatePayload = {
        ReconStatus: reconciliationStatus,
        ReconDetails: reconciliationComments,
        Amount: Amount,
        Curr: Curr,
        Document_Date: convertToSequalizeDate(DocDate),
        Due_Date: convertToSequalizeDate(DueDate),
      };

      await vendorReconciliation.update(updatePayload);

      let result = "SOA updated Successfully";
      if (newSOA === true) {
        result = "New SOA updated Successfully";
      }

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async updateInvType(body: any) {
    try {
      // Get all VendorStatement records with null InvType in batches
      const batchSize = 1000;
      let offset = 0;
      let totalUpdated = 0;
      let totalProcessed = 0;

      while (true) {
        // Get batch of records
        const findNullData = await VendorStatement.findAll({
          where: { InvType: null },
          limit: batchSize,
          offset: offset,
          attributes: ["ID", "Reference"], // Only fetch needed fields
          order: [["ID", "ASC"]], // Consistent ordering for pagination
        });

        if (findNullData.length === 0) break;

        // Get all unique references from this batch
        const references = [
          ...new Set((findNullData ?? []).map((record) => record.Reference)),
        ].filter((ref) => ref);

        if (references.length > 0) {
          // Get all matching InvoiceHeaders in one query
          const invoiceHeaders = await InvoiceHeader.findAll({
            where: { InvNo: references },
            attributes: ["InvNo", "Invoice_Category_id"],
            raw: true, // Get plain objects for better performance
          });

          // Create a map for quick lookup
          const invoiceHeaderMap = (invoiceHeaders ?? []).reduce(
            (map: any, header) => {
              map[header.InvNo] = header.Invoice_Category_id;
              return map;
            },
            {},
          );

          // Prepare batch updates
          const updates = [];
          for (const vendorStatement of findNullData) {
            const reference = vendorStatement.Reference;
            const categoryId = invoiceHeaderMap[reference];

            if (categoryId) {
              let invType = null;

              if (categoryId === 1 || categoryId === 2 || categoryId === 3) {
                invType = "INV";
              } else if (categoryId === 4) {
                invType = "CN";
              }

              if (invType) {
                updates.push({
                  id: vendorStatement.ID,
                  invType: invType,
                });
              }
            }
          }

          // Batch update using bulkUpdate or individual updates in transaction
          if (updates.length > 0) {
            // Option 1: Individual updates in transaction (more reliable)
            const transaction = await sequelize.transaction();
            try {
              for (const update of updates) {
                await VendorStatement.update(
                  { InvType: update.invType },
                  {
                    where: { ID: update.id },
                    transaction,
                  },
                );
              }
              await transaction.commit();
              totalUpdated += updates.length;
            } catch (error) {
              logger.error("Error:", error);
              await transaction.rollback();
              throw error;
            }
          }
        }

        totalProcessed += findNullData.length;
        offset += batchSize;

        // Log progress}

        const result = `Updated ${totalUpdated} out of ${totalProcessed} processed records`;

        return {
          status: true,
          data: result,
        };
      }
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  }

  async statementOfAccountListingDashboard(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendor = id ? await Vendor.findByPk(id) : null;

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        Vendor_SAP_Code: vendor?.Vendor_SAP_Code,
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForAdminDashboard(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // If no date filter is provided, default to current month using CreatedDt

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForBusinessDashboard(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: id } },
        attributes: ["Vendor_SAP_Code"],
      });
      const vendorSAPCodes = (vendors ?? []).map((v) => v?.Vendor_SAP_Code);

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingDashboardPR(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendor = id ? await Vendor.findByPk(id) : null;

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        Vendor_SAP_Code: vendor?.Vendor_SAP_Code,
        reconciliation_status: "Pending for Reconciliation",
        Amount: { [Op.ne]: null },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForAdminDashboardPR(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        reconciliation_status: "Pending for Reconciliation",
        Amount: { [Op.ne]: null },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForBusinessDashboardPR(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: id } },
        attributes: ["Vendor_SAP_Code"],
      });
      const vendorSAPCodes = (vendors ?? []).map((v) => v?.Vendor_SAP_Code);

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        reconciliation_status: "Pending for Reconciliation",
        Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
        Amount: { [Op.ne]: null },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingPayable(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const vendor = id ? await Vendor.findByPk(id) : null;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
      ).padStart(2, "0")}`;

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        Reconciliation_status: "RECONCILED",
        ...(vendor && { Vendor_SAP_Code: vendor?.Vendor_SAP_Code }),
        DueDate: {
          [Op.between]: [
            convertToSequalizeDate(startDateStr),
            convertToSequalizeDate(endDateStr),
          ],
        },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
            where: { CoCd: query?.entity_id, Is_Deleted: false },
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForAdminPayable(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
      ).padStart(2, "0")}`;

      const payload: WhereOptions<any> = {
        Reconciliation_status: "RECONCILED",
        CoCd: query?.entity_id,
        DueDate: {
          [Op.between]: [
            convertToSequalizeDate(startDateStr),
            convertToSequalizeDate(endDateStr),
          ],
        },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // If no date filter is provided, default to current month using CreatedDt

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          //{ model: VendorReconciliation, as: "reconciliationStatus", required: false, },
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async statementOfAccountListingForBusinessPayable(
    limit: any,
    page: any,
    id: any,
    start_date: any,
    end_date: any,
    searchQuery: any,
    query: any,
  ) {
    try {
      let pageNumber = page ? page : 1;
      let limitNumber = limit ? limit : 15;
      let offset = (pageNumber - 1) * limitNumber;

      const sortField = query?.sort_column || "DocDate";
      const sortDirection = query?.sort || "DESC";
      const order: any[] = [];

      switch (sortField) {
        case "type":
          order.push(["DocType", sortDirection]);
          break;
        case "reference":
          order.push(["Reference", sortDirection]);
          break;
        case "currency_type":
          order.push(["Curr", sortDirection]);
          break;
        case "accounted_date":
        case "DocDate":
          order.push(["DocDate", sortDirection]);
          break;
        case "amount":
          order.push(["Amount", sortDirection]);
          break;
        case "due date":
          order.push(["DueDate", sortDirection]);
          break;
        case "reconciliation_status":
          order.push(["reconciliation_status", sortDirection]);
          break;
        case "reconciliation_comments":
          order.push(["Reconciliation_comments", sortDirection]);
          break;
        case "vendor_name":
        case "Vendor_Name_EN":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_Name_EN",
            sortDirection,
          ]);
          break;
        case "vendor_code":
          order.push([
            { model: Vendor, as: "Vendor" },
            "Vendor_SAP_Code",
            sortDirection,
          ]);
          break;
        default:
          order.push([sortField, sortDirection]);
          break;
      }

      if (!query?.entity_id) {
        throw new APIError("Missing entity_id", 400);
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
      ).padStart(2, "0")}`;

      const vendors = await Vendor.findAll({
        where: { ID: { [Op.in]: id } },
        attributes: ["Vendor_SAP_Code"],
        raw: true,
      });

      const vendorSAPCodes = (vendors ?? []).map((v) => v?.Vendor_SAP_Code);

      const payload: WhereOptions<any> = {
        CoCd: query?.entity_id,
        Vendor_SAP_Code: { [Op.in]: vendorSAPCodes },
        Reconciliation_status: "RECONCILED",
        DueDate: {
          [Op.between]: [
            convertToSequalizeDate(startDateStr),
            convertToSequalizeDate(endDateStr),
          ],
        },
      };

      // Date range (DocDate)
      if (start_date && end_date) {
        payload.DocDate = {
          [Op.between]: [
            convertToSequalizeDate(start_date),
            convertToSequalizeDate(end_date),
          ],
        };
      } else if (query?.month && query?.year) {
        const month = parseInt(query?.month);
        const year = parseInt(query?.year);
        if (!isNaN(month) && !isNaN(year)) {
          const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDateStr = `${year}-${String(month).padStart(
            2,
            "0",
          )}-${String(lastDay).padStart(2, "0")}`;
          payload.DocDate = {
            [Op.between]: [
              convertToSequalizeDate(startDateStr),
              convertToSequalizeDate(endDateStr),
            ],
          };
        }
      }

      // DueDate range
      if (query?.due_start_date && query?.due_end_date) {
        payload.DueDate = {
          [Op.between]: [
            convertToSequalizeDate(query?.due_start_date),
            convertToSequalizeDate(query?.due_end_date),
          ],
        };
      }

      // Currency
      if (query?.currency) {
        payload.Curr = query?.currency;
      }

      // Reconciliation status
      if (query?.reconciliation_status) {
        const status = Number(query?.reconciliation_status);

        payload.reconciliation_status =
          status === 0 ? "RECONCILED" : "MISMATCH";
      }

      // Search filter
      if (searchQuery) {
        (payload as any)[Op.or] = [
          { Reference: { [Op.like]: `%${searchQuery}%` } },
          { DocNo: { [Op.like]: `%${searchQuery}%` } },
          { Vendor_SAP_Code: { [Op.like]: `%${searchQuery}%` } },
          { Text: { [Op.like]: `%${searchQuery}%` } },
          sequelize.where(sequelize.col("Vendor.Vendor_Name_EN"), {
            [Op.like]: `%${searchQuery}%`,
          }),
        ];
      }

      // Get joined data
      const finalResults = await VendorStatement.findAndCountAll({
        where: payload,
        include: [
          {
            model: Vendor,
            as: "Vendor",
            required: false,
            attributes: ["id", "Vendor_Name_EN"],
          },
        ],
        order,
        limit: limitNumber,
        offset: offset,
        distinct: true,
        subQuery: false,
      });

      // Currency-wise invoice totals
      const totalsByCurrency: Record<string, number> = {};
      for (const item of finalResults?.rows ?? []) {
        const currency = item?.Curr;
        const amount = item?.Amount || 0;
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
      }

      const result = pagination.paginationData(limit, page, finalResults);

      return {
        status: true,
        data: {
          result,
          invoice_value: totalsByCurrency,
        },
      };
    } catch (error: any) {
      logger.error("Error:", error);
      if (
        error?.name === "SequelizeDatabaseError" &&
        error?.message.includes("Invalid column name")
      ) {
        throw new APIError(
          `Database error: ${error?.message}. Please verify table and column names.`,
          500,
        );
      }
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async clearSOA(body: any) {
    try {
      await sequelize.query(
        "update VENDOR_STATEMENT set Reconciliation_status = null,  Reconciliation_comments = null,  Reconciliation_date = null where Vendor_SAP_Code = :id",
        {
          replacements: {
            id: body?.vendor_sap_code,
          },
        },
      );

      return {
        status: true,
      };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }

  async clearlogisInvoice(body: any) {
    try {
      // Delete multiple InvNo values
      await sequelize.query(
        "DELETE FROM INVOICE_HEADER WHERE InvNo IN (:ids)",
        {
          replacements: {
            ids: body?.InvNo, // this should be an array
          },
        },
      );

      return {
        status: true,
      };
    } catch (error: any) {
      logger.error("Error:", error);
      throw new APIError(
        error?.message || "Internal Server Error",
        error?.statusCode || 500,
      );
    }
  }
}

export default new SOAService();
