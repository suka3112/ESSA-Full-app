import multer from "multer";
import path from "path";
import dotenv from "dotenv";
import { Request } from "express";

dotenv.config();

const BASE_URL = process.env.BASE_URL; // Adjust as needed

export const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path?.join(__dirname, "../../uploads"));
  },
  filename(req, file, cb) {
    cb(null, `${Date?.now()}${path?.extname(file?.originalname)}`);
  },
});

const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  const allowedMimeTypes = [
    "image/",
    "video/", // Add video MIME types
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
    // Special case for .xls
    cb(null, true); // Allow the file
  } else {
    cb(
      new Error(
        "Only images, videos, PDFs, Excel files, text files, and zip files are allowed",
      ),
      false,
    );
  }
};

export const upload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// 🚀 Helper to build the public URL
export const getPublicFileUrl = (file: Express.Multer.File) => {
  return {
    type: file?.mimetype,
    url: `${process.env.BASE_URL}/uploads/${file?.filename}`,
    originalName: file?.originalname,
  };
};

export const getProdPublicFileUrl = (file: Express.Multer.File) => {
  return {
    type: file?.mimetype,
    url: `${process.env.BASE_URL}/vendor-portal/uploads/${file?.filename}`,
    originalName: file?.originalname,
  };
};
