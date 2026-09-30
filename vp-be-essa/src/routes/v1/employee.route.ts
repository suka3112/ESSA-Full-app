import { Router } from "express";
const employeeRoutes = Router();

import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";
import employeeController from "../../controllers/employee.controller";

employeeRoutes.post(
  "/",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => employeeController.addEmployee(req, res, next),
);

employeeRoutes.get(
  "/",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => employeeController.getEmployee(req, res, next),
);

employeeRoutes.get(
  "/export",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => employeeController.exportEmployee(req, res, next),
);

employeeRoutes.get(
  "/:id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => employeeController.getEmployeeById(req, res, next),
);

employeeRoutes.patch(
  "/",
  Authenticate.isValidateUser([
    UserRole.ADMIN,
    UserRole.VENDOR,
    UserRole.FINANCE,
    UserRole.BUSINESS,
  ]),
  (req, res, next) => employeeController.updateEmployee(req, res, next),
);

employeeRoutes.delete(
  "/:id",
  Authenticate.isValidateUser([UserRole.ADMIN]),
  (req, res, next) => employeeController.deleteEmployee(req, res, next),
);

export default employeeRoutes;
