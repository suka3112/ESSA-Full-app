import { Router } from "express";
import EntraSsoController from "../../controllers/entraSso.controller";

const entraSsoRoutes = Router();

entraSsoRoutes.get("/entra/login", (req, res, next) =>
  EntraSsoController.login(req, res, next),
);

entraSsoRoutes.get("/entra/callback", (req, res, next) =>
  EntraSsoController.callback(req, res, next),
);

entraSsoRoutes.get("/entra/session", (req, res, next) =>
  EntraSsoController.sessionUser(req, res, next),
);

entraSsoRoutes.get("/entra/logout", (req, res, next) =>
  EntraSsoController.logout(req, res, next),
);
entraSsoRoutes.post("/entra/logout", (req, res, next) =>
  EntraSsoController.logout(req, res, next),
);

export default entraSsoRoutes;
