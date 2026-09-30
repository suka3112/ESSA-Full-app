// src/middleware/imageUploadV1.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import dotenv from "dotenv";
import { Request } from "express";
import logger from "../utils/logger";

dotenv.config();

const BASE_URL = process.env.BASE_URL;

const resolveVendorBasePath = (): string => {
  const configured = process.env.VENDOR_FOLDER_PATH?.trim();
  const fallback = path.join(os.homedir(), "Desktop", "vendor_portal");
  const candidates = [
    configured,
    path.resolve(process.cwd(), "uploads"),
    fallback,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        fs.mkdirSync(candidate, { recursive: true });
      }
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch (error: any) {
      logger.warn(
        `VENDOR_FOLDER_PATH not usable (${candidate}): ${error?.message || error}`,
      );
    }
  }

  throw new Error(
    "No writable vendor upload folder. Set VENDOR_FOLDER_PATH to a path you can create.",
  );
};

export const VENDOR_BASE_PATH = resolveVendorBasePath();
logger.info(`Vendor upload folder: ${VENDOR_BASE_PATH}`);

/**
 * Multer parses multipart in stream order: `destination` often runs before
 * text fields after the file are on `req.body`. The upload handler moves the
 * file to the real folder using full `req.body`, so we only stage here
 * (same volume as VENDOR_FOLDER_PATH so `rename` works on Windows).
 */
const MULTER_STAGING_DIR = path.join(VENDOR_BASE_PATH, "__multer_staging");

function firstQueryValue(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === "string" && first.trim() !== ""
      ? first.trim()
      : undefined;
  }
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function pickString(
  src: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim() !== "") {
      return v[0].trim();
    }
  }
  return undefined;
}

/** Resolved after multipart parse; supports query + common alternate field names. */
export function getUploadFormFields(req: Request): {
  vendor_code?: string;
  module?: string;
  attachment_type?: string;
} {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const q = req.query ?? {};
  return {
    vendor_code:
      pickString(body, ["vendor_code", "Vendor_Code", "vendorCode"]) ??
      firstQueryValue(q.vendor_code) ??
      firstQueryValue(q.Vendor_Code),
    module:
      pickString(body, ["module", "Module"]) ??
      firstQueryValue(q.module),
    attachment_type:
      pickString(body, [
        "attachment_type",
        "attachmentType",
        "Attachment_Type",
      ]) ?? firstQueryValue(q.attachment_type),
  };
}

// Multer storage: stage first; controller renames into vendor/module path.
export const imageStorageV1 = multer.diskStorage({
  destination(_req: Request, _file: Express.Multer.File, cb) {
    try {
      if (!fs.existsSync(MULTER_STAGING_DIR)) {
        fs.mkdirSync(MULTER_STAGING_DIR, { recursive: true });
      }
      cb(null, MULTER_STAGING_DIR);
    } catch (error: any) {
      logger.error("Error:", error);
      cb(error, "");
    }
  },

  filename(req, file, cb) {
    const uniqueName = `${Date.now()}_${file?.originalname ?? ""}`;
    cb(null, uniqueName);
  },
});

// File type filter
const imageFileFilterV1 = (
  req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  const allowedMimeTypes = [
    "image/",
    "video/",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (
    allowedMimeTypes.some((type) => file?.mimetype?.startsWith(type)) ||
    file?.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only images, videos, PDFs, Excel files, text files, and zip files are allowed",
      ),
      false,
    );
  }
};

// Multer instance
export const uploadV1 = multer({
  storage: imageStorageV1,
  fileFilter: imageFileFilterV1,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Helper for public URL
export const getPublicFileUrlV1 = (file: Express.Multer.File, req: Request) => {
  const { vendor_code, module, attachment_type } = getUploadFormFields(req);

  const cleanVendorCode = vendor_code?.toUpperCase()?.trim();
  const cleanModule = module?.replace(/[\\/]/g, "_")?.trim()?.toUpperCase();
  const cleanAttachment = attachment_type
    ?.replace(/[\\/]/g, "_")
    ?.trim()
    ?.toUpperCase();

  let relativePath = cleanVendorCode ?? "";

  if (cleanModule) {
    relativePath = `${relativePath}/${cleanModule}`;
  }

  if (cleanAttachment) {
    relativePath = `${relativePath}/${cleanAttachment}`;
  }

  relativePath = `${relativePath}/${file?.filename ?? ""}`;

  if (process.env.NODE_ENV == "Prod") {
    return {
      type: file?.mimetype,
      url: `${BASE_URL}/vendor-portal/uploads/${relativePath}`,
      originalName: file?.originalname,
      relativePath,
    };
  } else {
    return {
      type: file?.mimetype,
      url: `${BASE_URL}/uploads/${relativePath}`,
      originalName: file?.originalname,
      finalFileName: file?.filename,
      relativePath,
    };
  }
};
