import { Router } from "express";
const faqRoutes = Router();
import faqController from "../../controllers/faq.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

faqRoutes.post(
  "/createheader",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => faqController.addFaqHeader(req, res, next),
);

faqRoutes.post(
  "/addQuestion/:header_id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => faqController.addFaqQuestion(req, res, next),
);

faqRoutes.get(
  "/faqHeaders",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => faqController.getFAQHeaders(req, res, next),
);
faqRoutes.get(
  "/faqquestions/:header_id",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.BUSINESS,
    UserRole.FINANCE,
    UserRole.VENDOR,
  ]),
  (req, res, next) => faqController.getFAQQuestions(req, res, next),
);

faqRoutes.put(
  "/faqHeaders/:header_id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => faqController.updateFAQHeader(req, res, next),
);

faqRoutes.put(
  "/faqquestions/:id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => faqController.updateFAQQuestion(req, res, next),
);

faqRoutes.delete(
  "/faqHeaders/:id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => faqController.deleteFAQHeader(req, res, next),
);
faqRoutes.delete(
  "/faqquestions/:id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => faqController.deleteFaqQuestion(req, res, next),
);

export default faqRoutes;
