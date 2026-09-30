import express from "express";
import upload from "../../middleware/fileUploadCloudinary";
import cloudinary from "../../config/cloudinary";
import streamifier from "streamifier";
import logger from "../../utils/logger";

const uploadFile = express.Router();

uploadFile.post(
  "/upload",
  (req, res, next) => {
    upload.array("files", 8)(req, res, function (err) {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "Each file must be 5MB or smaller." });
        }
        return res
          .status(400)
          .json({ error: err.message || "File upload error." });
      }
      next();
    });
  },
  async (req: any, res: any) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: "No files uploaded. Please select at least one file.",
        });
      }

      const uploadedFiles: { url: string; fileName: string }[] = [];
      const failedFiles: { fileName: string; reason: string }[] = [];

      await Promise.all(
        req.files.map(async (file: Express.Multer.File) => {
          try {
            const fileNameWithoutExt = file.originalname.replace(
              /\.[^/.]+$/,
              "",
            );
            const fileExt = file.originalname.match(/\.[^/.]+$/)?.[0] || "";
            const publicId = `uploads/${fileNameWithoutExt}-${Date.now()}${fileExt}`;

            const result = await new Promise<{ url: string }>(
              (resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  {
                    resource_type: "auto",
                    folder: "uploads",
                    public_id: publicId,
                  },
                  (error, result) => {
                    if (error) {
                      logger.error(
                        `Cloudinary upload error for ${file.originalname}:`,
                        error,
                      );
                      reject(
                        new Error(`Failed to upload ${file.originalname}`),
                      );
                    } else {
                      resolve({ url: result?.secure_url! });
                    }
                  },
                );
                streamifier.createReadStream(file.buffer).pipe(stream);
              },
            );

            uploadedFiles.push({
              url: result.url,
              fileName: file.originalname,
            });
          } catch (uploadError: any) {
            failedFiles.push({
              fileName: file.originalname,
              reason: uploadError.message,
            });
          }
        }),
      );

      if (uploadedFiles.length === 0) {
        return res
          .status(500)
          .json({ error: "All file uploads failed.", details: failedFiles });
      }

      return res.status(200).json({
        message: "File upload process completed",
        uploadedFiles,
        failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      });
    } catch (error: any) {
      logger.error("Server error:", error);
      return res
        .status(500)
        .json({ error: "Server error", details: error.message });
    }
  },
);

export default uploadFile;
