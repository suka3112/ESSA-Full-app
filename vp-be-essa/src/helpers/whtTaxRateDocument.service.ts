/**
 * Tax Rate (treaty) document — read-only, version-controlled Excel (migration 044).
 *
 * The uploaded file is the source of truth: the app parses its treaty-rate sheet into
 * rows for display and for WHT evaluation, and never edits it. Every upload is a new
 * version; exactly one version is current. Deleting the current version makes the most
 * recent remaining version current; any earlier version can be made current again.
 */
import * as XLSX from "xlsx";
import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

type Json = Record<string, any>;

export const TAX_RATE_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = [".xlsx", ".xls", ".csv"];
const MIME_BY_EXT: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
};

const bad = (message: string) => new APIError(message, StatusCodeEnum.HTTP_BAD_REQUEST);

async function q<T = Json>(sql: string, replacements?: Json, transaction?: Transaction): Promise<T[]> {
  return sequelize.query(sql, { replacements, transaction, type: QueryTypes.SELECT }) as Promise<T[]>;
}

const cellText = (v: any) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

/**
 * Find the treaty-rate table: the first sheet (preferring one named like "Tax Treaty Rates")
 * with a "Country" header in its first 15 rows. Columns run from the header row's first
 * non-empty cell to the first empty header cell, so side notes beside the table are ignored.
 */
export function parseTaxRateWorkbook(buffer: Buffer) {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    throw bad("The file could not be read as a spreadsheet.");
  }
  const order = [...wb.SheetNames].sort((a, b) => {
    const score = (n: string) => (/treaty|tax\s*rate/i.test(n) ? 0 : 1);
    return score(a) - score(b);
  });
  for (const sheetName of order) {
    const grid: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: "" });
    for (let h = 0; h < Math.min(grid.length, 15); h++) {
      const header = (grid[h] || []).map(cellText);
      const countryIdx = header.findIndex((c) => /^country$/i.test(c));
      if (countryIdx < 0) continue;
      let start = header.findIndex((c) => c !== "");
      let end = start;
      while (end < header.length && header[end] !== "") end++;
      if (countryIdx < start || countryIdx >= end) start = countryIdx;
      const columns = header.slice(start, end);
      const ci = countryIdx - start;
      const rows: string[][] = [];
      for (let r = h + 1; r < grid.length; r++) {
        const row = (grid[r] || []).slice(start, end).map(cellText);
        while (row.length < columns.length) row.push("");
        if (!row[ci]) {
          if (rows.length) break; // first blank country after data ends the table
          continue;
        }
        rows.push(row);
      }
      if (!rows.length) throw bad(`Sheet "${sheetName}" has a Country column but no rows below it.`);
      if (columns.length < 2) throw bad(`Sheet "${sheetName}" has no rate columns next to Country.`);
      return { sheetName, columns, rows, countryColumn: ci };
    }
  }
  throw bad('No sheet with a "Country" column was found. Upload the Tax Treaty Rates sheet (Country, Dividend, Interest, Royalties, Service / FTS Rate …).');
}

function summary(row: Json) {
  return {
    id: row.wht_tax_rate_document_id,
    versionNo: row.version_no,
    fileName: row.file_name,
    fileSize: row.file_size,
    sheetName: row.sheet_name,
    rowCount: row.row_count,
    notes: row.notes,
    isCurrent: row.is_current,
    isDeleted: row.is_deleted,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by_name || (row.uploaded_by ? `User ${row.uploaded_by}` : null),
    deletedAt: row.deleted_at,
  };
}

async function logChange(id: number, action: string, before: Json | null, after: Json | null, userId: number | null | undefined, t: Transaction) {
  await sequelize.query(
    `INSERT INTO cfg."CONFIG_CHANGE_LOG" (entity_name, entity_id, action, before_json, after_json, changed_by)
     VALUES ('WHT_TAX_RATE_DOCUMENT', :id, :action, CAST(:before AS jsonb), CAST(:after AS jsonb), :by)`,
    { replacements: { id, action, before: JSON.stringify(before), after: JSON.stringify(after), by: userId ? String(userId) : "portal" }, transaction: t },
  );
}

const SUMMARY_COLS = `wht_tax_rate_document_id, version_no, file_name, file_size, sheet_name, row_count, notes,
  is_current, is_deleted, uploaded_at, uploaded_by, uploaded_by_name, deleted_at`;

export async function listTaxRateVersions() {
  const rows = await q(`SELECT ${SUMMARY_COLS} FROM cfg."WHT_TAX_RATE_DOCUMENT" ORDER BY version_no DESC`);
  return rows.map(summary);
}

export async function getTaxRateVersion(rawId?: any) {
  const rows = rawId == null || rawId === "current"
    ? await q(`SELECT ${SUMMARY_COLS}, columns_json, rows_json FROM cfg."WHT_TAX_RATE_DOCUMENT" WHERE is_current AND NOT is_deleted LIMIT 1`)
    : await q(`SELECT ${SUMMARY_COLS}, columns_json, rows_json FROM cfg."WHT_TAX_RATE_DOCUMENT" WHERE wht_tax_rate_document_id = :id`, { id: parseId(rawId) });
  if (!rows.length) {
    if (rawId == null || rawId === "current") return null;
    throw new APIError("Version not found", StatusCodeEnum.HTTP_NOT_FOUND);
  }
  return { ...summary(rows[0]), columns: rows[0].columns_json, rows: rows[0].rows_json };
}

export async function getTaxRateFile(rawId: any) {
  const rows = await q(`SELECT file_name, mime_type, file_data FROM cfg."WHT_TAX_RATE_DOCUMENT" WHERE wht_tax_rate_document_id = :id`, { id: parseId(rawId) });
  if (!rows.length) throw new APIError("Version not found", StatusCodeEnum.HTTP_NOT_FOUND);
  return { fileName: rows[0].file_name, mimeType: rows[0].mime_type || "application/octet-stream", data: rows[0].file_data as Buffer };
}

function parseId(raw: any) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw bad("Invalid version id");
  return id;
}

export async function uploadTaxRateDocument(
  file: { originalname: string; mimetype?: string; buffer: Buffer; size: number } | undefined,
  notes: string | undefined,
  user: { id?: number | null; name?: string | null },
) {
  if (!file?.buffer?.length) throw bad("Choose an Excel file to upload.");
  const name = String(file.originalname || "tax-rates.xlsx");
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) throw bad(`Unsupported file type "${ext}". Upload an Excel file (.xlsx or .xls) or a CSV.`);
  if (file.size > TAX_RATE_MAX_BYTES) throw bad(`The file is larger than ${TAX_RATE_MAX_BYTES / 1024 / 1024} MB.`);
  const parsed = parseTaxRateWorkbook(file.buffer);
  try {
    return await sequelize.transaction(async (t) => {
      const [{ next }] = await q<{ next: number }>(`SELECT COALESCE(MAX(version_no), 0) + 1 AS next FROM cfg."WHT_TAX_RATE_DOCUMENT"`, {}, t);
      const before = await q(`SELECT ${SUMMARY_COLS} FROM cfg."WHT_TAX_RATE_DOCUMENT" WHERE is_current AND NOT is_deleted`, {}, t);
      await sequelize.query(`UPDATE cfg."WHT_TAX_RATE_DOCUMENT" SET is_current = FALSE WHERE is_current`, { transaction: t });
      const rows = await q(
        `INSERT INTO cfg."WHT_TAX_RATE_DOCUMENT"
           (version_no, file_name, mime_type, file_size, file_data, sheet_name, columns_json, rows_json, row_count, notes,
            is_current, uploaded_by, uploaded_by_name)
         VALUES (:v, :name, :mime, :size, :data, :sheet, CAST(:cols AS jsonb), CAST(:rows AS jsonb), :count, :notes, TRUE, :by, :byName)
         RETURNING ${SUMMARY_COLS}`,
        {
          v: next, name, mime: MIME_BY_EXT[ext] || file.mimetype || null, size: file.size, data: file.buffer, sheet: parsed.sheetName,
          cols: JSON.stringify(parsed.columns), rows: JSON.stringify(parsed.rows), count: parsed.rows.length,
          notes: notes?.trim() || null, by: user.id || null, byName: user.name || null,
        },
        t,
      );
      const created = summary(rows[0]);
      await logChange(created.id, "INSERT", before[0] ? summary(before[0]) : null, created, user.id, t);
      return created;
    });
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error("Tax rate upload failed", error);
    throw new APIError("Could not save the uploaded file", 500);
  }
}

/** Make a (previous) version the current one. */
export async function activateTaxRateVersion(rawId: any, userId?: number | null) {
  const id = parseId(rawId);
  return sequelize.transaction(async (t) => {
    const rows = await q(`SELECT ${SUMMARY_COLS} FROM cfg."WHT_TAX_RATE_DOCUMENT" WHERE wht_tax_rate_document_id = :id`, { id }, t);
    if (!rows.length) throw new APIError("Version not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (rows[0].is_deleted) throw bad("A deleted version cannot be made current.");
    if (rows[0].is_current) return summary(rows[0]);
    await sequelize.query(`UPDATE cfg."WHT_TAX_RATE_DOCUMENT" SET is_current = FALSE WHERE is_current`, { transaction: t });
    await sequelize.query(`UPDATE cfg."WHT_TAX_RATE_DOCUMENT" SET is_current = TRUE WHERE wht_tax_rate_document_id = :id`, { replacements: { id }, transaction: t });
    const after = { ...summary(rows[0]), isCurrent: true };
    await logChange(id, "UPDATE", summary(rows[0]), after, userId, t);
    return after;
  });
}

/** Delete a version (kept in history as deleted). Deleting the current one promotes the latest remaining version. */
export async function deleteTaxRateVersion(rawId: any, userId?: number | null) {
  const id = parseId(rawId);
  return sequelize.transaction(async (t) => {
    const rows = await q(`SELECT ${SUMMARY_COLS} FROM cfg."WHT_TAX_RATE_DOCUMENT" WHERE wht_tax_rate_document_id = :id`, { id }, t);
    if (!rows.length) throw new APIError("Version not found", StatusCodeEnum.HTTP_NOT_FOUND);
    if (rows[0].is_deleted) throw bad("This version is already deleted.");
    await sequelize.query(
      `UPDATE cfg."WHT_TAX_RATE_DOCUMENT" SET is_deleted = TRUE, is_current = FALSE, deleted_at = now(), deleted_by = :by
        WHERE wht_tax_rate_document_id = :id`,
      { replacements: { id, by: userId || null }, transaction: t },
    );
    let promoted: Json | null = null;
    if (rows[0].is_current) {
      const next = await q(
        `UPDATE cfg."WHT_TAX_RATE_DOCUMENT" SET is_current = TRUE
          WHERE wht_tax_rate_document_id = (SELECT wht_tax_rate_document_id FROM cfg."WHT_TAX_RATE_DOCUMENT"
                                             WHERE NOT is_deleted ORDER BY version_no DESC LIMIT 1)
          RETURNING ${SUMMARY_COLS}`, {}, t);
      promoted = next[0] ? summary(next[0]) : null;
    }
    await logChange(id, "DELETE", summary(rows[0]), null, userId, t);
    return { id, deleted: true, current: promoted };
  });
}

/** Treaty row for a country in the current version, keyed by column header. */
export async function currentTreatyRow(country: string) {
  const doc = await getTaxRateVersion("current");
  if (!doc) return null;
  const ci = (doc.columns as string[]).findIndex((c) => /^country$/i.test(c));
  const needle = String(country || "").trim().toLowerCase();
  const row = (doc.rows as string[][]).find((r) => String(r[ci] || "").trim().toLowerCase() === needle);
  if (!row) return { versionNo: doc.versionNo, row: null };
  const values: Json = {};
  (doc.columns as string[]).forEach((c, i) => { values[c] = row[i]; });
  return { versionNo: doc.versionNo, row: values };
}
