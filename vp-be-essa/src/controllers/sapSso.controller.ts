import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import "../types/express-session";
import { BaseController } from "./baseController";
import sapSsoService from "../helpers/sapSso.service";
import userService from "../helpers/user.service";
import { Authenticate } from "../middleware/authentication";
import { User } from "../models/user";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { auditSessionEvent } from "../helpers/auditSession.service";

class SapSsoController extends BaseController {
  private async issuePortalToken(
    sapUser: {
      email: string;
      name?: string;
      claims: Record<string, any>;
    },
    rememberMe: boolean,
  ) {
    const portalEmail = sapUser.email;

    const userExist: any = await userService.getUserService({
      Email: { [Op.iLike]: portalEmail },
      Is_Active: true,
    });

    if (!userExist) {
      throw new APIError(
        `No active portal user found for SAP email: ${sapUser.email}`,
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    await User.update(
      { Last_Login: new Date() },
      { where: { ID: userExist.ID } },
    );

    const token = Authenticate.generateToken(
      {
        id: userExist?.ID,
        vendor_id: userExist?.Vendor_Id,
        CoCd: userExist?.CoCd,
        emp_id: userExist?.Employee_Id,
        email: userExist?.Email,
        vendorCode: userExist?.vendor?.Vendor_SAP_Code,
        role_id: userExist?.Role_id,
        Employee_Id: userExist?.Employee_Id,
        name: userExist?.Name,
        Is_PO_Inline: userExist?.vendor?.Is_PO_Inline,
      },
      rememberMe,
    );

    const data: any = {
      id: userExist?.ID,
      token: "Bearer " + token,
      vendor_id: userExist?.Vendor_Id,
      vendorCode: userExist?.vendor?.Vendor_SAP_Code,
      role_id: userExist?.Role_id,
      Is_Supplier: userExist.Is_Supplier,
      New_Login: userExist?.New_Login,
      Is_PO_Inline: userExist?.vendor?.Is_PO_Inline,
      Non_PO_Access: userExist?.vendor?.Non_PO_Access,
      Vendor_Role: userExist?.Vendor_Role,
      auth_provider: "sap_ias",
      ias_claims: sapUser.claims,
    };

    if (!userExist?.Primary_User) {
      data.name = userExist?.Name;
    }

    return data;
  }

  /**
   * Starts SAP IAS Authorization Code + PKCE flow.
   * Browser should navigate here (full page), not via XHR.
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorizationUrl = await sapSsoService.buildAuthorizationUrl(req);

      if (req.query.format === "json") {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          { authorizationUrl },
          "SAP SSO authorization URL generated",
        );
      }

      return res.redirect(authorizationUrl);
    } catch (error) {
      logger.error("SAP SSO login error:", error);
      next(error);
    }
  };

  /**
   * FE /auth/callback posts { code, state } after IAS redirects back.
   * Returns the same app JWT shape as /users/login.
   */
  callback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = String(req.body?.code || "").trim();
      const state = String(req.body?.state || "").trim();
      const iss = String(req.body?.iss || req.query?.iss || "").trim();
      const rememberMe = Boolean(req.body?.remember_me);

      const sapUser = await sapSsoService.exchangeCode({ code, state, iss });
      const data = await this.issuePortalToken(sapUser, rememberMe);

      if (req.session) {
        req.session.iasUser = sapUser.claims;
        req.session.iasTokenSet = sapUser.tokenSet;
      }

      await auditSessionEvent({
        action: "LOGIN",
        result: "SUCCESS",
        req,
        actorId: data?.id,
        actorName: sapUser.name,
        email: sapUser.email,
        reasonRemarks: "SAP SSO login succeeded",
        source: "PORTAL",
      });

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        data,
        "Logged in successfully via SAP SSO",
      );
    } catch (error) {
      logger.error("SAP SSO callback error:", error);
      await auditSessionEvent({
        action: "LOGIN",
        result: "FAIL",
        req,
        email: req.body?.email,
        reasonRemarks:
          error instanceof Error ? error.message : "SAP SSO login failed",
        source: "PORTAL",
      });
      next(error);
    }
  };

  /**
   * BE-handled OIDC callback when IAS_REDIRECT_URI points at this API
   * (e.g. http://localhost:8000/vendor-portal/auth/sso/callback).
   */
  browserCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sapUser = await sapSsoService.handleBrowserCallback(req);
      const data = await this.issuePortalToken(sapUser, false);

      await auditSessionEvent({
        action: "LOGIN",
        result: "SUCCESS",
        req,
        actorId: data?.id,
        actorName: sapUser.name,
        email: sapUser.email,
        reasonRemarks: "SAP SSO browser login succeeded",
        source: "PORTAL",
      });

      if (req.query.format === "json") {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          data,
          "Logged in successfully via SAP SSO",
        );
      }

      const feBase = (process.env.FE_URL || "http://localhost:3000").replace(
        /\/$/,
        "",
      );
      // Hand token to FE via fragment so it never hits server logs as a query param.
      return res.redirect(
        `${feBase}/auth/sso-complete#token=${encodeURIComponent(data.token)}`,
      );
    } catch (error) {
      logger.error("SAP SSO browser callback error:", error);
      await auditSessionEvent({
        action: "LOGIN",
        result: "FAIL",
        req,
        reasonRemarks:
          error instanceof Error ? error.message : "SAP SSO browser login failed",
        source: "PORTAL",
      });
      const feBase = (process.env.FE_URL || "http://localhost:3000").replace(
        /\/$/,
        "",
      );
      return res.redirect(`${feBase}/auth/login?error=sso`);
    }
  };

  /**
   * Dev/helper: dump IAS claims stored in the server session after SSO.
   */
  sessionUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session?.iasUser) {
        throw new APIError(
          "Not authenticated via SAP SSO session",
          StatusCodeEnum.HTTP_UNAUTHORIZED,
        );
      }

      return await this.success(
        req,
        res,
        this.status.HTTP_OK,
        { message: "Welcome", user: req.session.iasUser },
        "SSO session user",
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Destroys local session and redirects to IAS end_session_endpoint.
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idToken = req.session?.iasTokenSet?.id_token;
      const endSessionUrl = sapSsoService.buildLogoutUrl(idToken);
      const iasUser = req.session?.iasUser as Record<string, unknown> | undefined;

      await auditSessionEvent({
        action: "LOGOUT",
        result: "SUCCESS",
        req,
        actorName: (iasUser?.name as string) || null,
        email: (iasUser?.email as string) || null,
        reasonRemarks: "SAP SSO logout",
        source: "PORTAL",
      });

      await new Promise<void>((resolve) => {
        if (!req.session) {
          resolve();
          return;
        }
        req.session.destroy(() => resolve());
      });

      if (req.query.format === "json") {
        return await this.success(
          req,
          res,
          this.status.HTTP_OK,
          { endSessionUrl },
          "SAP SSO logout URL generated",
        );
      }

      return res.redirect(endSessionUrl);
    } catch (error) {
      logger.error("SAP SSO logout error:", error);
      next(error);
    }
  };
}

export default new SapSsoController();
