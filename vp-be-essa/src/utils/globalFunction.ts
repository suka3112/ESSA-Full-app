import { Parser } from "json2csv";
import ExcelJS from "exceljs";
import fs from "node:fs";
import { Sequelize } from "sequelize";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import path from "path";
import fspromise from "fs/promises";
import logger from "../utils/logger";

export const dateRange = (
  time_interval: string | null,
  startDate: Date | null,
  endDate: Date | null,
) => {
  const today = new Date();

  if (startDate && endDate) {
    startDate = new Date(startDate.setHours(0, 0, 0, 0));
    endDate = new Date(endDate.setHours(23, 59, 59, 999));
  }

  if (time_interval) {
    switch (time_interval) {
      case "Today":
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
        break;

      case "Yesterday":
        startDate = new Date(today.setDate(today.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.setHours(23, 59, 59, 999));
        break;

      case "Last week":
        const lastWeekStart = new Date(
          today.setDate(today.getDate() - today.getDay() - 7),
        );
        lastWeekStart.setHours(0, 0, 0, 0);
        startDate = lastWeekStart;
        const lastWeekEnd = new Date(lastWeekStart);
        endDate = new Date(lastWeekEnd.setDate(lastWeekEnd.getDate() + 6));
        endDate.setHours(23, 59, 59, 999);
        break;

      case "Last month":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;

      case "Last quarter":
        const currentMonth = today.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const lastQuarterEndMonth = currentQuarter * 3;
        startDate = new Date(today.getFullYear(), lastQuarterEndMonth - 3, 1);
        endDate = new Date(today.getFullYear(), lastQuarterEndMonth, 0);
        break;

      default:
        throw new Error("Invalid date range option");
    }
  }

  return {
    startDate: startDate,
    endDate: endDate,
  };
};

export const exportFile = async (
  format: any,
  data: any,
  headers: any,
  res: any,
  fileName: any,
) => {
  if (format === "csv") {
    try {
      const fields = (headers ?? []).map((header: any) => ({
        label: header?.header,
        value: header?.key,
      }));
      const json2csvParser = new Parser({ fields });
      let csv = json2csvParser.parse(data);

      csv = "\uFEFF" + csv;
      res?.setHeader("Content-Type", "text/csv; charset=utf-8");
      res?.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}.csv`,
      );
      res?.send(Buffer.from("\uFEFF" + csv, "utf8"));
    } catch (error) {
      logger.error("Error:", error);
      res?.status(500).send("Error generating CSV");
    }
  } else if (format === "xls") {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");

      // Add headers
      worksheet.columns = headers ?? [];

      // Add data rows
      worksheet.addRows(data ?? []);

      res?.header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res?.attachment(`${fileName}.xlsx`);

      await workbook.xlsx.write(res);
      res?.end();
    } catch (error) {
      logger.error("Error:", error);
      res?.status(500).send("Error generating XLS");
    }
  } else {
    res?.status(400).send("Invalid format");
  }
};

export function generateCSV(
  datas: any[],
  pathName: string,
  fields: string[],
  headers: any,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!datas || datas.length === 0) {
      return reject(new Error("No data to generate CSV"));
    }

    try {
      const writeStream = fs.createWriteStream(pathName, {
        flags: "w",
        encoding: "utf8",
      });

      writeStream.write("\uFEFF");

      const headerRow =
        (headers ?? []).map((h: any) => `"${h?.header}"`).join(",") + "\n";
      writeStream.write(headerRow);

      (datas ?? []).forEach((dataItem: any) => {
        const row = (fields ?? [])
          .map((field: any) => {
            let value = dataItem?.[field];

            if (value === null || value === undefined) value = "";

            value = String(value).replace(/"/g, '""');

            return `"${value}"`;
          })
          .join(",");

        writeStream.write(row + "\n");
      });

      writeStream.on("finish", () => {
        resolve(true);
      });

      writeStream.on("error", (err) => {
        reject(err);
      });

      writeStream.end();
    } catch (error) {
      logger.error("Error:", error);
      reject(error);
    }
  });
}

export function generateCSVForSOA(
  datas: any[],
  pathName: string,
  fields: string[],
  headers: any,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!datas || datas.length === 0) {
      return reject(new Error("No data to generate CSV"));
    }

    try {
      const writeStream = fs.createWriteStream(pathName, {
        flags: "w",
        encoding: "utf8",
      });

      writeStream.write("\uFEFF");

      const headerRow =
        (fields ?? [])
          .map((field) => `"${headers?.[field] ?? field}"`)
          .join(",") + "\n";
      writeStream.write(headerRow);

      (datas ?? []).forEach((dataItem, index) => {
        let row = (fields ?? [])
          .map((field) => {
            let value = dataItem?.[field];

            if (value === null || value === undefined) {
              value = "";
            }

            value = String(value);

            value = value.replace(/"/g, '""');

            value = `"${value}"`;

            return value;
          })
          .join(",");

        if (index < (datas?.length ?? 0) - 1) {
          row += "\n";
        }

        writeStream.write(row);
      });

      writeStream.on("finish", () => {
        resolve(true);
      });

      writeStream.on("error", (err) => {
        reject(err);
      });

      writeStream.end();
    } catch (error) {
      logger.error("Error:", error);
      reject(error);
    }
  });
}

export const excelDateToJSDate = (serial: any) => {
  const startDate = new Date(1900, 0, 1);
  startDate.setDate(startDate.getDate() + serial - 2);
  const timezoneOffset = startDate.getTimezoneOffset();
  startDate.setMinutes(startDate.getMinutes() - timezoneOffset);
  return startDate;
};

export const parseExcelOrStringDate = (date: any): Date | null => {
  if (typeof date === "number") {
    return excelDateToJSDate(date);
  }

  if (typeof date === "string") {
    const parts = date?.trim()?.split("/");

    if (parts.length === 3) {
      const [day, month, year] = parts.map((v) => parseInt(v, 10));

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const parsedDate = new Date(year, month - 1, day);

        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }
  }

  return null;
};

export const convertToSequalizeDate = (date: string | Date = new Date()) => {
  // Bind as a JS Date — works on Postgres (and avoids MSSQL CONVERT).
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const convertToSequalizeDateTime = (
  date: string | Date = new Date(),
) => {
  // Bind as a JS Date — Sequelize parameterizes this for Postgres.
  return new Date(date);
};

export const validateDateField = (fieldName: string, value: any) => {
  if (typeof value === "string") {
    throw new Error(`${fieldName} must be a valid Date, not a string`);
  }
  if (value && (!(value instanceof Date) || isNaN(value.getTime()))) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
};

export const generatePassword = async (password?: string) => {
  if (!password) {
    password = crypto
      .randomBytes(10)
      .toString("base64") // Convert to base64 to get letters
      .replace(/[^a-zA-Z]/g, "") // Remove non-letter characters
      .slice(0, 10); // Trim to required length
  }

  const hashPassword = await bcrypt.hash(password, 10);
  return { password, hashPassword };
};

export const fetchEmailAttachments = async (attachmentUrls: string[] = []) => {
  const attachments = [];

  for (const url of attachmentUrls ?? []) {
    try {
      // Construct local path based on your uploads folder
      const localPath = path.join(
        process.env.VENDOR_FOLDER_PATH ||
        "E:/Source code new/Vendor-Portal/BE/uploads",
        url?.split("/uploads/")?.[1], // get relative path after "uploads/"
      );

      // Read file as buffer
      const buffer = await fspromise.readFile(localPath);

      // Keep original filename from URL
      const filename = decodeURIComponent(
        url?.split("/")?.pop() || "Attachment",
      );

      attachments.push({
        filename,
        content: buffer,
        contentType: "application/pdf", // optional, adjust if needed
      });
    } catch (error) {
      logger.error("Error:", error);
    }
  }

  return attachments;
};
