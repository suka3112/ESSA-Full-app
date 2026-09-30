import multer from "multer";

const storage = multer.memoryStorage(); // Store file in memory before uploading to Cloudinary

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (allowedMimeTypes.includes(file?.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed formats: jpg, jpeg, png, pdf, csv, xls,xlsx",
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
