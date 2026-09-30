import { Router } from "express";
import essaInvoiceController from "../../controllers/essaInvoice.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const essaInvoiceRoutes = Router();

const auth = Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]);

essaInvoiceRoutes.get("/", auth, (req, res, next) =>
  essaInvoiceController.list(req, res, next),
);

essaInvoiceRoutes.get("/:id", auth, (req, res, next) =>
  essaInvoiceController.getDetails(req, res, next),
);

essaInvoiceRoutes.patch("/:id/fields", auth, (req, res, next) =>
  essaInvoiceController.correctFields(req, res, next),
);

essaInvoiceRoutes.post("/:id/verify", auth, (req, res, next) =>
  essaInvoiceController.verifyFields(req, res, next),
);

essaInvoiceRoutes.post("/:id/approve", auth, (req, res, next) =>
  essaInvoiceController.approve(req, res, next),
);

essaInvoiceRoutes.post("/:id/override", auth, (req, res, next) =>
  essaInvoiceController.override(req, res, next),
);

export default essaInvoiceRoutes;
