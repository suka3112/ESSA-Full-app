import { Router } from "express";
import slaController from "../../controllers/sla.controller";
import { Authenticate } from "../../middleware/authentication";
import { UserRole } from "../../utils/enums/role.enum";

const slaRoutes = Router();

const readRoles = [UserRole.ADMIN, UserRole.FINANCE];
const writeRoles = [UserRole.ADMIN];

slaRoutes.get("/meta", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.meta(req, res, next),
);

slaRoutes.get("/policies", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.listPolicies(req, res, next),
);

slaRoutes.post("/policies", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.createPolicy(req, res, next),
);

slaRoutes.get("/policies/:id", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.getPolicy(req, res, next),
);

slaRoutes.put("/policies/:id", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.updatePolicy(req, res, next),
);

slaRoutes.delete("/policies/:id", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.deletePolicy(req, res, next),
);

slaRoutes.post("/policies/:id/publish", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.publishPolicy(req, res, next),
);

slaRoutes.post("/policies/:id/test", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.markTested(req, res, next),
);

slaRoutes.post("/policies/:id/version", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.newVersion(req, res, next),
);

slaRoutes.post("/policies/:id/clone", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.clonePolicy(req, res, next),
);

slaRoutes.post("/policies/:id/retire", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.retirePolicy(req, res, next),
);

slaRoutes.post("/calendars", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.createCalendar(req, res, next),
);

slaRoutes.put("/calendars/:id", Authenticate.isValidateUser(writeRoles), (req, res, next) =>
  slaController.updateCalendar(req, res, next),
);

slaRoutes.post(
  "/calendars/:id/publish",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => slaController.publishCalendar(req, res, next),
);

slaRoutes.post(
  "/calendars/:id/retire",
  Authenticate.isValidateUser(writeRoles),
  (req, res, next) => slaController.retireCalendar(req, res, next),
);

slaRoutes.post("/simulate", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.simulate(req, res, next),
);

slaRoutes.get("/instances/summary", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.summarizeInstances(req, res, next),
);

slaRoutes.get("/instances", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.listInstances(req, res, next),
);

slaRoutes.get("/instances/:id", Authenticate.isValidateUser(readRoles), (req, res, next) =>
  slaController.getInstance(req, res, next),
);

slaRoutes.post(
  "/instances/:id/pause",
  Authenticate.isValidateUser(readRoles),
  (req, res, next) => slaController.pauseInstance(req, res, next),
);

slaRoutes.post(
  "/instances/:id/resume",
  Authenticate.isValidateUser(readRoles),
  (req, res, next) => slaController.resumeInstance(req, res, next),
);

export default slaRoutes;
