import multer from "multer";
import path from "path";

var storage = multer.diskStorage({
  filename: function (req: any, file: any, callback: any) {
    let ext = path.extname(file?.originalname);
    callback(null, Date?.now() + ext);
  },
});

let upload = multer({
  storage: storage,
  fileFilter: function (req: any, file: any, callback: any) {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "text/csv" ||
      file.mimetype ==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      callback(null, true);
    } else {
      callback(new Error("File format is not supported"));
    }
  },
  limits: { fileSize: 1024 * 1024 * 2 },
});

export default upload;
