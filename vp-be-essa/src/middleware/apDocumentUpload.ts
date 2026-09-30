import multer from "multer";
import path from "path";
import { Request } from "express";

const DEFAULT_MAX_SIZE_MB = 25;

export const getApDocumentMaxSizeBytes = () => {
  const configuredMb = Number(process.env.AP_DOCUMENT_MAX_SIZE_MB);
  const maxMb =
    Number.isFinite(configuredMb) && configuredMb > 0
      ? configuredMb
      : DEFAULT_MAX_SIZE_MB;
  return maxMb * 1024 * 1024;
};

export const getApDocumentMaxSizeMb = () =>
  Math.round(getApDocumentMaxSizeBytes() / (1024 * 1024));

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const allowedExtensions = new Set([
  ".pdf",
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
  ".csv",
  ".xls",
  ".xlsx",
]);

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.has(ext)) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      "Invalid file type. Allowed formats: PDF, ZIP, PNG, JPG, JPEG, XLSX, XLS, CSV.",
    ),
  );
};

const apDocumentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: getApDocumentMaxSizeBytes(),
  },
});

export default apDocumentUpload;
