/**
 * WHT configuration (rule matrix, Tax Rate document, vendor SKB/PP23; SBUJK disabled)
 * Mounted at: /vendor-portal/wht-config
 */
import { Router } from "express";
import multer from "multer";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import whtConfigController from "../../controllers/whtConfig.controller";
import { TAX_RATE_MAX_BYTES } from "../../helpers/whtTaxRateDocument.service";

const whtConfigRoutes = Router();

const auth = Authenticate.isValidateUser([
  UserRole.FINANCE,
  UserRole.ADMIN,
  UserRole.BUSINESS,
]);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAX_RATE_MAX_BYTES, files: 1 } }).single("file");
const uploadFile = (req: any, res: any, next: any) =>
  upload(req, res, (err: any) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE"
      ? `The file is larger than ${TAX_RATE_MAX_BYTES / 1024 / 1024} MB.`
      : "The upload could not be read. Choose one Excel file and try again.";
    return res.status(400).json({ type: "E", status: 400, message });
  });

whtConfigRoutes.get("/", auth, (req, res, next) => whtConfigController.list(req, res, next));
whtConfigRoutes.post("/evaluate", auth, (req, res, next) => whtConfigController.evaluate(req, res, next));

whtConfigRoutes.get("/tax-rate-documents", auth, (req, res, next) => whtConfigController.listTaxRateVersions(req, res, next));
whtConfigRoutes.post("/tax-rate-documents", auth, uploadFile, (req, res, next) => whtConfigController.uploadTaxRateDocument(req, res, next));
whtConfigRoutes.get("/tax-rate-documents/:id", auth, (req, res, next) => whtConfigController.getTaxRateVersion(req, res, next));
whtConfigRoutes.get("/tax-rate-documents/:id/file", auth, (req, res, next) => whtConfigController.downloadTaxRateVersion(req, res, next));
whtConfigRoutes.post("/tax-rate-documents/:id/activate", auth, (req, res, next) => whtConfigController.activateTaxRateVersion(req, res, next));
whtConfigRoutes.delete("/tax-rate-documents/:id", auth, (req, res, next) => whtConfigController.deleteTaxRateVersion(req, res, next));

whtConfigRoutes.post("/:entity", auth, (req, res, next) => whtConfigController.create(req, res, next));
whtConfigRoutes.patch("/:entity/:id", auth, (req, res, next) => whtConfigController.update(req, res, next));
whtConfigRoutes.delete("/:entity/:id", auth, (req, res, next) => whtConfigController.remove(req, res, next));

export default whtConfigRoutes;
