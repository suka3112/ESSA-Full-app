import path from "path";

/** List stage while OCR and validation run in the background. */
export const PROCESSING_STAGE = "processing";
/** List stage when background OCR cannot be completed. */
export const FAILED_STAGE = "failed";

export const ASYNC_STATUS_DETAIL_FIELD = "__asyncStatusDetail__";
export const ASYNC_PRIMARY_FIELD = "__asyncPrimaryDocumentId__";
export const ASYNC_HEARTBEAT_FIELD = "__asyncHeartbeat__";

/** A worker that heartbeats faster than this is still alive. */
export const ASYNC_HEARTBEAT_ALIVE_MS = 8_000;

const BUSINESS_FAIL_STATUSES = new Set([
  "duplicate_invoice",
  "missing_mandatory_documents",
  "needs_invoice_type_review",
]);

export type ExtractOutcome =
  | { action: "complete" }
  | { action: "fail"; message: string }
  | { action: "retry"; message: string };

export type ClassifiableExtractResult = {
  success: boolean;
  status?: string | null;
  primaryDocumentId?: number | null;
  message?: string | null;
};

const startsWith = (buffer: Buffer, magic: Buffer): boolean =>
  buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic);

const ZIP_MAGICS = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

/**
 * Reject a payload whose bytes do not match the extension.
 * CSV has no signature; anything that is clearly a PDF, ZIP, or image is rejected for .csv.
 */
export function assertFileSignature(buffer: Buffer, originalName: string): void {
  if (!buffer || buffer.length < 4) {
    throw new Error("The uploaded file is empty or too small to process.");
  }
  const ext = path.extname(originalName || "").toLowerCase();
  const isZip = ZIP_MAGICS.some((magic) => startsWith(buffer, magic));
  const isPdf = startsWith(buffer, Buffer.from("%PDF"));
  const isPng = startsWith(buffer, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpeg = startsWith(buffer, Buffer.from([0xff, 0xd8, 0xff]));
  const isOle = startsWith(buffer, OLE_MAGIC);

  if (ext === ".pdf" && !isPdf) {
    throw new Error("The file is not a valid PDF.");
  }
  if ((ext === ".zip" || ext === ".xlsx") && !isZip) {
    throw new Error("The file is not a valid ZIP archive.");
  }
  if (ext === ".png" && !isPng) {
    throw new Error("The file is not a valid PNG image.");
  }
  if ((ext === ".jpg" || ext === ".jpeg") && !isJpeg) {
    throw new Error("The file is not a valid JPEG image.");
  }
  if (ext === ".xls" && !isOle) {
    throw new Error("The file is not a valid Excel workbook.");
  }
  if (ext === ".csv" && (isPdf || isZip || isPng || isJpeg || isOle)) {
    throw new Error("The file content does not match a CSV upload.");
  }
  if (
    !isPdf &&
    !isZip &&
    !isPng &&
    !isJpeg &&
    !isOle &&
    ext !== ".csv"
  ) {
    throw new Error("The file content is not a supported invoice document.");
  }
}

export function uploadExtension(originalName: string): string {
  const ext = path.extname(originalName || "").toLowerCase();
  if (
    ext === ".pdf" ||
    ext === ".zip" ||
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".csv" ||
    ext === ".xls" ||
    ext === ".xlsx"
  ) {
    return ext;
  }
  return ".pdf";
}

/** File name is generated here. User input is never used as a path segment. */
export function storedFileName(documentId: number, originalName: string): string {
  if (!Number.isInteger(documentId) || documentId <= 0) {
    throw new Error("A document id is required before the file can be stored.");
  }
  return `${documentId}${uploadExtension(originalName)}`;
}

/** Reject a stored path that resolves outside the upload root. */
export function assertPathInsideRoot(root: string, storedPath: string): string {
  const rootResolved = path.resolve(root);
  const target = path.resolve(storedPath);
  const relative = path.relative(rootResolved, target);
  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Stored file path is outside the upload directory.");
  }
  return target;
}

export function placeholderInvoiceNo(fileName: string): string {
  const base = path.basename(fileName || "upload").replace(/\.[^.]+$/, "").trim();
  const text = base || "upload";
  return text.length > 50 ? text.slice(0, 50) : text;
}

/** PO / NON_PO when the operator chose them. AUTO stays unclassified until OCR. */
export function placeholderWorkflow(invoiceWorkflow: string | null | undefined): string {
  const workflow = String(invoiceWorkflow || "AUTO").trim().toUpperCase();
  if (workflow === "PO" || workflow === "NON_PO") return workflow;
  return "PENDING";
}

export function classifyExtractResult(
  result: ClassifiableExtractResult,
): ExtractOutcome {
  const message =
    String(result.message || "").trim() || "Invoice processing failed.";
  if (result.success && Number(result.primaryDocumentId) > 0) {
    return { action: "complete" };
  }
  const status = String(result.status || "").trim();
  if (BUSINESS_FAIL_STATUSES.has(status)) {
    return { action: "fail", message };
  }
  return {
    action: "retry",
    message: message || "OCR completed without a saved document.",
  };
}

export function heartbeatIsAlive(
  heartbeatMs: number | null,
  nowMs: number,
  aliveMs = ASYNC_HEARTBEAT_ALIVE_MS,
): boolean {
  if (heartbeatMs == null || !Number.isFinite(heartbeatMs)) return false;
  return nowMs - heartbeatMs < aliveMs;
}
