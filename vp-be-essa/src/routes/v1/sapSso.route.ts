import { Router } from "express";
import SapSsoController from "../../controllers/sapSso.controller";

const sapSsoRoutes = Router();

sapSsoRoutes.get("/sso/login", (req, res, next) =>
  SapSsoController.login(req, res, next),
);

/** FE SPA posts { code, state } after IAS redirects to the frontend callback. */
sapSsoRoutes.post("/sso/callback", (req, res, next) =>
  SapSsoController.callback(req, res, next),
);

/**
 * Direct BE callback for when IAS_REDIRECT_URI is registered as this API route
 * (Authorization Code + session PKCE flow).
 */
sapSsoRoutes.get("/sso/callback", (req, res, next) =>
  SapSsoController.browserCallback(req, res, next),
);

sapSsoRoutes.get("/sso/session", (req, res, next) =>
  SapSsoController.sessionUser(req, res, next),
);

sapSsoRoutes.get("/sso/logout", (req, res, next) =>
  SapSsoController.logout(req, res, next),
);

export default sapSsoRoutes;
