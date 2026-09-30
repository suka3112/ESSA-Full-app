import {
  ensureFolderPath,
  getSharePointFiledRoot,
  isGraphAppConfiguredForSharePointDrive,
  uploadFileToFolderPath,
} from "./microsoftGraphSharePoint.client";
import type { EmailSubjectValidationResult } from "./apEmailSubjectValidation";
import { EssaInvoice } from "../models/essaInvoice";
import logger from "../utils/logger";

export type FileInvoiceToSharePointInput = {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  /** PO / NON_PO / DOCREQ subject parse (or filename parse for SharePoint). */
  subjectParse: Extract<EmailSubjectValidationResult, { valid: true }> | null;
  /** Prefer invoice/received date; falls back to now. */
  asOfDate?: Date | string | null;
  sourceChannel?: "EMAIL" | "SHAREPOINT" | "UPLOAD";
  documentId?: number | null;
  /** DOCREQ merge: file into the original invoice PO folder. */
  poNumber?: string | null;
  vendorName?: string | null;
};

const isFilingEnabled = (): boolean => {
  const flag = String(process.env.SHAREPOINT_FILING_ENABLED || "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  // Default on when Filed root is configured
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return Boolean(getSharePointFiledRoot());
};

/** SharePoint-safe single path segment. */
export const sanitizeSharePointSegment = (value: string): string => {
  const cleaned = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();
  return cleaned.slice(0, 120) || "Unknown";
};

const resolveAsOf = (value: Date | string | null | undefined): Date => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (value) {
    const d = new Date(value);
    if (Number.isFinite(d.getTime())) return d;
  }
  return new Date();
};

/**
 * Build Filed relative path segments (under SHAREPOINT_FILED_ROOT):
 *   PO:     Year/Month/Vendor/PO
 *   Non-PO: Year/Month/Vendor
 *   DOCREQ: Year/Month/Vendor
 */
export const buildFiledRelativeSegments = (input: {
  subjectParse: Extract<EmailSubjectValidationResult, { valid: true }> | null;
  asOfDate?: Date | string | null;
  poNumber?: string | null;
  vendorName?: string | null;
}): string[] => {
  const asOf = resolveAsOf(input.asOfDate);
  const year = String(asOf.getFullYear());
  const month = String(asOf.getMonth() + 1).padStart(2, "0");
  const vendor = sanitizeSharePointSegment(
    input.vendorName || input.subjectParse?.vendorName || "Unknown Vendor",
  );

  const segments = [year, month, vendor];

  const poNumber =
    input.poNumber ||
    (input.subjectParse?.type === "PO" ? input.subjectParse.poNumber : null);
  if (poNumber) {
    segments.push(sanitizeSharePointSegment(poNumber));
  }

  return segments;
};

export const buildFiledFolderPath = (input: {
  subjectParse: Extract<EmailSubjectValidationResult, { valid: true }> | null;
  asOfDate?: Date | string | null;
  poNumber?: string | null;
  vendorName?: string | null;
}): string | null => {
  const root = getSharePointFiledRoot();
  if (!root) return null;
  const relative = buildFiledRelativeSegments(input).join("/");
  return `${root}/${relative}`;
};

const resolveInvoiceFilingMeta = async (input: FileInvoiceToSharePointInput) => {
  let poNumber = input.poNumber || null;
  let vendorName = input.vendorName || null;
  if (input.documentId && (!poNumber || !vendorName)) {
    const essa = await EssaInvoice.findOne({
      where: { DocumentId: input.documentId, IsDeleted: false },
      attributes: ["PoNumber", "VendorName"],
    });
    if (!poNumber && essa?.PoNumber) poNumber = String(essa.PoNumber);
    if (!vendorName && essa?.VendorName) vendorName = essa.VendorName;
  }
  return { poNumber, vendorName };
};

/**
 * After successful OCR, place a copy of the PDF under Filed/{Year}/{Month}/{Vendor}[/{PO}].
 * Failures are logged only — invoice persist already succeeded.
 */
export async function fileInvoicePdfToSharePoint(
  input: FileInvoiceToSharePointInput,
): Promise<{ ok: boolean; folderPath?: string; webUrl?: string; error?: string }> {
  const logCtx = {
    fileName: input.fileName,
    documentId: input.documentId ?? null,
    sourceChannel: input.sourceChannel || null,
  };

  if (!isFilingEnabled()) {
    logger.warn(
      `[SharePointFiling] Skipped — filing disabled. Set SHAREPOINT_FILED_ROOT (e.g. ESSA AP Intake/Filed) or SHAREPOINT_FILING_ENABLED=true.`,
      logCtx,
    );
    return { ok: false, error: "filing_disabled" };
  }
  if (!isGraphAppConfiguredForSharePointDrive()) {
    logger.warn(
      `[SharePointFiling] Skipped — Graph/SharePoint drive is not configured.`,
      logCtx,
    );
    return { ok: false, error: "sharepoint_not_configured" };
  }

  const { poNumber, vendorName } = await resolveInvoiceFilingMeta(input);

  const folderPath = buildFiledFolderPath({
    subjectParse: input.subjectParse,
    asOfDate: input.asOfDate,
    poNumber,
    vendorName,
  });
  if (!folderPath) {
    logger.warn(
      `[SharePointFiling] Skipped — SHAREPOINT_FILED_ROOT is missing.`,
      logCtx,
    );
    return { ok: false, error: "filed_root_missing" };
  }

  const safeName = sanitizeSharePointSegment(
    String(input.fileName || "invoice.pdf").replace(/\.pdf$/i, ""),
  );
  const fileName = `${safeName}.pdf`;

  try {
    await ensureFolderPath(folderPath);
    const uploaded = await uploadFileToFolderPath({
      folderPath,
      fileName,
      buffer: input.buffer,
      contentType: input.contentType || "application/pdf",
    });

    logger.info(
      `[SharePointFiling] Filed ${fileName} → ${folderPath} (doc=${input.documentId ?? "n/a"} channel=${input.sourceChannel || "—"})`,
      { webUrl: uploaded.webUrl, driveItemId: uploaded.id },
    );

    return {
      ok: true,
      folderPath,
      webUrl: uploaded.webUrl || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `[SharePointFiling] Failed filing ${fileName} under ${folderPath}: ${message}`,
      error,
    );
    return { ok: false, folderPath, error: message };
  }
}

export default {
  fileInvoicePdfToSharePoint,
  buildFiledFolderPath,
  buildFiledRelativeSegments,
  sanitizeSharePointSegment,
};
