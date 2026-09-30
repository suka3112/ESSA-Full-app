import { Router } from "express";
const healthRoutes = Router();

import HealthCheck from "../../controllers/healthCheck.controller";

healthRoutes.get("/healthCheck", HealthCheck.healthCheck);
healthRoutes.post("/healthCheckData", HealthCheck.healthCheckData);

export default healthRoutes;
