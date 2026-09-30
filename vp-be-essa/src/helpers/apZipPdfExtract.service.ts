import JSZip from "jszip";
import logger from "../utils/logger";
import type { GraphMailAttachment } from "./microsoftGraphMail.client";
import { downloadFileAttachment } from "./microsoftGraphMail.client";

const PDF_MAGIC = Buffer.from("%PDF");

export type ZipExtractedPdf = {
  fileName: string;
  buffer: Buffer;
  entryPath: string;
};

export type ExpandableMailAttachment = GraphMailAttachment & {
  /** Set when this PDF was expanded from a ZIP attachment. */
  preloadedBuffer?: Buffer;
  parentZipName?: string;
};

const envInt = (key: string, fallback: number): number => {
  const parsed = parseInt(process.env[key] || String(fallback), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_ZIP_FILES = () => envInt("INTAKE_ZIP_MAX_FILES", 50);
const MAX_ZIP_TOTAL_BYTES = () =>
  envInt("INTAKE_ZIP_MAX_TOTAL_BYTES", 100 * 1024 * 1024);
const MAX_ZIP_FILE_BYTES = () =>
  envInt("INTAKE_ZIP_MAX_FILE_BYTES", 25 * 1024 * 1024);

export const isPdfMimeOrName = (
  mime?: string | null,
  name?: string | null,
): boolean => {
  const mimeLower = String(mime || "")
    .trim()
    .toLowerCase();
  const nameLower = String(name || "")
    .trim()
    .toLowerCase();
  return mimeLower === "application/pdf" || nameLower.endsWith(".pdf");
};

export const isZipMimeOrName = (
  mime?: string | null,
  name?: string | null,
): boolean => {
  const mimeLower = String(mime || "")
    .trim()
    .toLowerCase();
  const nameLower = String(name || "")
    .trim()
    .toLowerCase();
  return (
    mimeLower === "application/zip" ||
    mimeLower === "application/x-zip-compressed" ||
    nameLower.endsWith(".zip")
  );
};

const isPdfBuffer = (buffer: Buffer): boolean =>
  buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC);

const isSafeZipEntryPath = (entryPath: string): boolean => {
  const normalized = String(entryPath || "").replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/")) return false;
  return !normalized.split("/").some((part) => part === "..");
};

const shouldSkipZipEntry = (entryPath: string, baseName: string): boolean => {
  if (!baseName || baseName.startsWith("._")) return true;
  if (entryPath.includes("__MACOSX/")) return true;
  return false;
};

const sanitizeVirtualIdPart = (value: string): string =>
  String(value || "file")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80) || "file";

/**
 * Securely expand a ZIP buffer and return only entries that are valid PDFs
 * (by .pdf extension and %PDF magic bytes). Non-PDF entries are skipped.
 */
export async function extractPdfsFromZip(
  zipBuffer: Buffer,
  zipFileName?: string,
): Promise<ZipExtractedPdf[]> {
  if (!zipBuffer?.length) {
    throw new Error("ZIP file is empty");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid or corrupted ZIP (${zipFileName || "archive.zip"}): ${message}`);
  }

  const entryPaths = Object.keys(zip.files).filter((key) => !zip.files[key].dir);
  if (entryPaths.length > MAX_ZIP_FILES()) {
    throw new Error(
      `ZIP contains too many files (max ${MAX_ZIP_FILES()}). Split into smaller archives.`,
    );
  }

  const pdfs: ZipExtractedPdf[] = [];
  let totalUncompressed = 0;

  for (const entryPath of entryPaths) {
    if (!isSafeZipEntryPath(entryPath)) {
      logger.warn(`[ZipExtract] Skipping unsafe ZIP path: ${entryPath}`);
      continue;
    }

    const baseName = entryPath.split("/").pop() || entryPath;
    if (shouldSkipZipEntry(entryPath, baseName)) continue;

    if (!baseName.toLowerCase().endsWith(".pdf")) continue;

    const entry = zip.files[entryPath];
    const buffer = Buffer.from(await entry.async("nodebuffer"));

    if (buffer.length > MAX_ZIP_FILE_BYTES()) {
      logger.warn(
        `[ZipExtract] Skipping oversized PDF in ZIP (${baseName}, ${buffer.length} bytes)`,
      );
      continue;
    }

    totalUncompressed += buffer.length;
    if (totalUncompressed > MAX_ZIP_TOTAL_BYTES()) {
      throw new Error(
        `ZIP uncompressed content exceeds limit (${MAX_ZIP_TOTAL_BYTES()} bytes)`,
      );
    }

    if (!isPdfBuffer(buffer)) {
      logger.warn(
        `[ZipExtract] Skipping non-PDF content with .pdf extension: ${entryPath}`,
      );
      continue;
    }

    pdfs.push({
      fileName: baseName,
      buffer,
      entryPath,
    });
  }

  return pdfs;
}

/**
 * Flatten email attachments into processable PDFs (direct PDFs + PDFs inside ZIPs).
 */
export async function flattenEmailAttachmentsToPdfs(
  messageId: string,
  attachments: GraphMailAttachment[],
): Promise<ExpandableMailAttachment[]> {
  const result: ExpandableMailAttachment[] = [];

  for (const att of attachments) {
    if (att.isInline) continue;

    if (isPdfMimeOrName(att.contentType, att.name)) {
      result.push(att);
      continue;
    }

    if (!isZipMimeOrName(att.contentType, att.name)) continue;

    const downloaded = await downloadFileAttachment(messageId, att.id);
    if (!downloaded?.contentBytes) {
      logger.warn(
        `[EmailIntake] ZIP attachment missing content: ${att.name || att.id}`,
      );
      continue;
    }

    const zipBuffer = Buffer.from(downloaded.contentBytes, "base64");
    try {
      const pdfs = await extractPdfsFromZip(
        zipBuffer,
        att.name || downloaded.name || "archive.zip",
      );
      if (!pdfs.length) {
        logger.warn(
          `[EmailIntake] ZIP contains no PDF files: ${att.name || att.id}`,
        );
        continue;
      }

      for (let i = 0; i < pdfs.length; i++) {
        const pdf = pdfs[i];
        const safeKey = sanitizeVirtualIdPart(pdf.fileName);
        result.push({
          id: `${att.id}::pdf::${i}::${safeKey}`,
          name: pdf.fileName,
          contentType: "application/pdf",
          size: pdf.buffer.length,
          isInline: false,
          preloadedBuffer: pdf.buffer,
          parentZipName: att.name || downloaded.name || undefined,
        });
      }
    } catch (error) {
      logger.warn(
        `[EmailIntake] Failed expanding ZIP ${att.name || att.id}`,
        error,
      );
    }
  }

  return result;
}

/**
 * Resolve an uploaded file to a single PDF buffer (pass-through PDF or first PDF in ZIP).
 * Portal upload: ZIP must contain exactly one PDF.
 */
export async function resolveUploadToSinglePdf(
  file: Express.Multer.File,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  if (isPdfMimeOrName(file.mimetype, file.originalname)) {
    if (!isPdfBuffer(file.buffer)) {
      throw new Error("File is not a valid PDF (content check failed).");
    }
    return {
      buffer: file.buffer,
      fileName: file.originalname || "invoice.pdf",
      mimeType: file.mimetype || "application/pdf",
    };
  }

  if (!isZipMimeOrName(file.mimetype, file.originalname)) {
    throw new Error("Unsupported file type. Upload PDF or ZIP containing PDFs.");
  }

  const pdfs = await extractPdfsFromZip(
    file.buffer,
    file.originalname || "archive.zip",
  );
  if (!pdfs.length) {
    throw new Error("ZIP archive contains no PDF files.");
  }
  if (pdfs.length > 1) {
    throw new Error(
      `ZIP contains ${pdfs.length} PDFs. Upload one invoice PDF per file, or send multiple PDFs via email intake.`,
    );
  }

  const pdf = pdfs[0];
  return {
    buffer: pdf.buffer,
    fileName: pdf.fileName,
    mimeType: "application/pdf",
  };
}
