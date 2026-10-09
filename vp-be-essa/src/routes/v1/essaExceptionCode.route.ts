import { Router } from "express";
import essaExceptionCodeController from "../../controllers/essaExceptionCode.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const essaExceptionCodeRoutes = Router();

const auth = Authenticate.isValidateUser([UserRole.ADMIN, UserRole.FINANCE]);

essaExceptionCodeRoutes.get("/", auth, (req, res, next) =>
  essaExceptionCodeController.list(req, res, next),
);

export default essaExceptionCodeRoutes;
