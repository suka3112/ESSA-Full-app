import { NextFunction, Request, Response } from "express";
import "../types/express-session";
import { BaseController } from "./baseController";
import entraSsoService from "../helpers/entraSso.service";
import userService from "../helpers/user.service";
import {
  resolvePortalUserByEmail,
  toPortalLoginPayload,
  toPortalSessionUser,
} from "../helpers/portalAuth.service";
import {
  SESSION_COOKIE_NAME,
  sessionClearCookieOptions,
} from "../config/sessionCookie";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { auditSessionEvent } from "../helpers/auditSession.service";

const AUTHENTICATED_SESSION_MS = parseInt(
  process.env.SESSION_MAX_AGE_MS || String(8 * 60 * 60 * 1000),
  10,
);

const DEFAULT_FE_ORIGIN = "http://localhost:3000";

const feBase = () =>
  (process.env.FE_URL || DEFAULT_FE_ORIGIN).replace(/\/$/, "");

/** Allowlisted SPA origin only — never redirect to Microsoft or a request-supplied URL. */
const loggedOutFrontendUrl = () => {
  const fallback = `${DEFAULT_FE_ORIGIN}/auth/login?sso=logged_out`;
  try {
    const origin = new URL(feBase()).origin;
    return `${origin}/auth/login?sso=logged_out`;
  } catch {
    return fallback;
  }
};

const isLocalLogout = (req: Request): boolean =>
  req.query.local === "1" || req.body?.local === true;

/** Same-app relative path only — blocks open redirects. */
const sanitizeReturnUrl = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return undefined;
  }
  return path;
};

const destroySession = (req: Request) =>
  new Promise<void>((resolve) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy(() => resolve());
  });

const regenerateSession = (req: Request) =>
  new Promise<void>((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

class EntraSsoController extends BaseController {
  /**
   * Full-page navigate here (Fiori tile or Sign in with Microsoft).
   * Entra ID silent-SSO: if the browser already has a corporate session,
   * the authorize redirect returns without a password prompt.
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prompt =
        typeof req.query.prompt === "string" ? req.query.prompt : undefined;
      const loginHint =
        typeof req.query.login_hint === "string"
          ? req.query.login_hint
          : undefined;

      const authorizationUrl = await entraSsoService.buildAuthorizationUrl(req, {
        prompt,
        loginHint,
      });

      const returnUrl = sanitizeReturnUrl(req.query.returnUrl);
      if (returnUrl && req.session?.oidc) {
        req.session.oidc.returnUrl = returnUrl;
      }

      if (req.query.format === "json") {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          { authorizationUrl },
          "Entra ID authorization URL generated",
        );
      }

      return res.redirect(authorizationUrl);
    } catch (error) {
      logger.error("Entra ID login error:", error);
      next(error);
    }
  };

  /**
   * Entra redirect URI. Exchanges the code server-side, stores Entra tokens
   * in the HttpOnly session, then redirects to the SPA without any token in the URL.
   */
  callback = async (req: Request, res: Response, next: NextFunction) => {
    const frontend = feBase();
    try {
      if (req.query.error) {
        const err = String(req.query.error);
        if (err === "login_required" || err === "interaction_required") {
          return res.redirect(`${req.baseUrl}/entra/login`);
        }
        await auditSessionEvent({
          action: "LOGIN",
          result: "FAIL",
          req,
          email: typeof req.query.login_hint === "string" ? req.query.login_hint : null,
          reasonRemarks: `Entra ID login failed: ${err}`,
          source: "PORTAL",
        });
        return res.redirect(`${frontend}/auth/login?error=entra`);
      }

      const returnUrl = sanitizeReturnUrl(req.session?.oidc?.returnUrl);
      const entraUser = await entraSsoService.handleBrowserCallback(req);
      const userExist = await resolvePortalUserByEmail(
        entraUser.email,
        "Microsoft Entra ID",
      );

      await regenerateSession(req);

      const portalUser = toPortalSessionUser(userExist);
      if (req.session) {
        req.session.portalUser = portalUser;
        req.session.entraUser = entraUser.claims;
        req.session.entraTokenSet = entraUser.tokenSet;
        req.session.authProvider = "entra";
        req.session.cookie.maxAge = AUTHENTICATED_SESSION_MS;
      }

      await auditSessionEvent({
        action: "LOGIN",
        result: "SUCCESS",
        req,
        actorId: userExist?.ID,
        actorName: userExist?.Name,
        actorRole: userExist?.Role_id,
        email: userExist?.Email || entraUser.email,
        reasonRemarks: "Microsoft Entra ID login succeeded",
        source: "PORTAL",
      });

      if (req.query.format === "json") {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          toPortalLoginPayload(userExist, "entra", {
            entraRoles: entraUser.roles,
          }),
          "Logged in successfully via Microsoft Entra ID",
        );
      }

      const completeUrl = returnUrl
        ? `${frontend}/auth/entra/complete?returnUrl=${encodeURIComponent(returnUrl)}`
        : `${frontend}/auth/entra/complete`;
      return res.redirect(completeUrl);
    } catch (error) {
      logger.error("Entra ID callback error:", error);
      await auditSessionEvent({
        action: "LOGIN",
        result: "FAIL",
        req,
        reasonRemarks:
          error instanceof Error ? error.message : "Entra ID callback failed",
        source: "PORTAL",
      });
      return res.redirect(`${frontend}/auth/login?error=entra`);
    }
  };

  /**
   * SPA bootstrap after the BFF callback. Returns portal user profile only —
   * Entra access/id tokens never leave the server.
   */
  sessionUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session?.portalUser?.id || req.session.authProvider !== "entra") {
        throw new APIError(
          "Not authenticated via Microsoft Entra ID",
          StatusCodeEnum.HTTP_UNAUTHORIZED,
        );
      }

      const userExist: any = await userService.getUserService({
        ID: req.session.portalUser.id,
      });

      if (!userExist) {
        throw new APIError(
          "Portal user no longer exists",
          StatusCodeEnum.HTTP_UNAUTHORIZED,
        );
      }

      const data = toPortalLoginPayload(userExist, "entra", {
        entraRoles: Array.isArray(req.session.entraUser?.roles)
          ? (req.session.entraUser.roles as string[])
          : [],
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Entra ID session user",
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Local BFF logout for the ESSA Logout button.
   * Destroys the server session and clears the HttpOnly cookie.
   * Does not call Microsoft end_session, /auth/entra/login, or /auth/entra/complete.
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const localOnly = isLocalLogout(req);
      const portalUser = req.session?.portalUser;

      await auditSessionEvent({
        action: "LOGOUT",
        result: "SUCCESS",
        req,
        actorId: portalUser?.id as string | number | undefined,
        actorName: (portalUser?.name as string) || null,
        actorRole: (portalUser?.role_id as number) || null,
        email: (portalUser?.email as string) || null,
        reasonRemarks: localOnly ? "Local portal logout" : "Entra ID logout",
        source: "PORTAL",
      });

      await destroySession(req);
      res.clearCookie(SESSION_COOKIE_NAME, sessionClearCookieOptions());

      if (localOnly) {
        return res.status(200).json({ success: true });
      }

      return res.redirect(302, loggedOutFrontendUrl());
    } catch (error) {
      logger.error("Entra ID logout error:", error);
      next(error);
    }
  };
}

export default new EntraSsoController();
