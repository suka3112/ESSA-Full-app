import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import "../types/express-session";
import userService from "../helpers/user.service";
import { expandAllowedRoles, UserRole } from "../utils/enums/role.enum";
import { APIError } from "../utils/apiError.utils";
const secretKey = process.env.JWT_SECRET;
const rememberMeExpiry: any = process.env.REMENBER_ME_TOKAN_EXPIRY || "7d";
const tokenExpiry: any = process.env.TOKAN_EXPIRY || "1d";
import ldap from "ldapjs";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";
import { auditSessionEvent } from "../helpers/auditSession.service";

export interface CustomRequest extends Request {
  user: string | JwtPayload;
}

export class Authenticate {
  static generateToken = (data: any, rememberMe: boolean = false) => {
    return jwt.sign(
      {
        time: Date(),
        ...data,
      },
      secretKey,
      {
        expiresIn: rememberMe ? rememberMeExpiry : tokenExpiry,
      },
    );
  };

  static tokenVerification = (token: any) => {
    try {
      let verifiedData = jwt.verify(token, secretKey);
      return verifiedData ? verifiedData : false;
    } catch (error) {
      logger.error("Error:", error);
      throw new APIError(error?.message, error?.statusCode);
    }
  };

  static getTokenFromHeaders(headers: any): string | null {
    let token = headers?.["Authorization"] || headers?.["authorization"];
    if (token?.startsWith("Bearer ")) {
      return token?.split(" ")?.[1];
    }
    return null;
  }

  static getSessionPortalUser(req: Request): Record<string, unknown> | null {
    const portalUser = req.session?.portalUser;
    if (portalUser?.id) {
      return portalUser;
    }
    return null;
  }

  static loginAccess = async (req: any, res: Response, next: any) => {
    try {
      const sessionUser = Authenticate.getSessionPortalUser(req);
      if (sessionUser) {
        const user = await userService.getUserService({ ID: sessionUser.id });
        if (user) {
          req.user = sessionUser;
          return next();
        }
      }

      let token = req?.headers?.["authorization"];
      if (!token) {
        return res.status(400).json({
          status: 400,
          message: "Please provide JWT token",
          data: [],
        });
      }
      token = token?.split(" ")?.[1];
      let data: any = Authenticate.tokenVerification(token),
        user;

      user = await userService.getUserService({ ID: data?.id });
      if (!data?.id || !user) {
        await auditSessionEvent({
          action: "AUTHORIZE",
          result: "DENIED",
          req,
          actorId: data?.id,
          actorName: data?.name || data?.email,
          email: data?.email,
          reasonRemarks: "Token invalid! Access denied",
          source: "PORTAL",
        });
        return res.status(403).json({
          status: 403,
          message: "Token invalid! Access denied",
          data: [],
        });
      }

      req.user = data;
      return next();
    } catch (error) {
      logger.error("Error:", error);
      next(error);
    }
  };

  static isValidateUser(allowedRoles: UserRole[]): any {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionUser = Authenticate.getSessionPortalUser(req);
        if (sessionUser) {
          const user = await userService.getUserService({ ID: sessionUser.id });
          if (!user) {
            return res.status(401).json({
              status: 401,
              message: "Invalid session",
              data: [],
            });
          }
          if (!expandAllowedRoles(allowedRoles).includes(user?.Role_id)) {
            await auditSessionEvent({
              action: "AUTHORIZE",
              result: "DENIED",
              req,
              actorId: user.ID,
              actorName: user.Name,
              actorRole: user.Role_id,
              email: user.Email,
              reasonRemarks: `Access denied for ${req.method} ${req.originalUrl || req.url}`,
              source: "PORTAL",
            });
            return res.status(403).json({
              status: 403,
              message: "Access denied",
              data: [],
            });
          }
          (req as CustomRequest).user = sessionUser as JwtPayload;
          return next();
        }

        const token = this.getTokenFromHeaders(req.headers);

        if (!token) {
          return res.status(401).json({
            status: 401,
            message: "Please provide JWT token",
            data: [],
          });
        }

        const data: any = this.tokenVerification(token);

        const user = await userService.getUserService({ ID: data?.id });

        if (!user) {
          return res.status(401).json({
            status: 401,
            message: "Invalid JWT token",
            data: [],
          });
        }

        if (!expandAllowedRoles(allowedRoles).includes(user?.Role_id)) {
          await auditSessionEvent({
            action: "AUTHORIZE",
            result: "DENIED",
            req,
            actorId: user.ID,
            actorName: user.Name,
            actorRole: user.Role_id,
            email: user.Email,
            reasonRemarks: `Access denied for ${req.method} ${req.originalUrl || req.url}`,
            source: "PORTAL",
          });
          return res.status(403).json({
            status: 403,
            message: "Access denied",
            data: [],
          });
        }

        (req as CustomRequest).user = data;
        return next();
      } catch (error) {
        logger.error("Error:", error);
        if (
          error?.name === "TokenExpiredError" ||
          error?.message === "jwt expired"
        ) {
          return next(
            new APIError("Token has expired", StatusCodeEnum.HTTP_UNAUTHORIZED),
          );
        }
        next(error);
      }
    };
  }

  static async authenticateADUser(
    email: string,
    password: string,
  ): Promise<any> {
    const client = ldap.createClient({
      url: "ldaps://aeazdc001.eu.daikin.corpnet:636",
      tlsOptions: {
        rejectUnauthorized: false,
      },
    });

    return new Promise((resolve, reject) => {
      client?.on("error", (err) => {
        return reject(`LDAP connection error: ${err?.message}`);
      });

      // Try direct bind with UPN
      const userPrincipalName = email; // assuming email is the UPN like john.doe@daikin.corpnet

      client?.bind(userPrincipalName, password, (err) => {
        client?.unbind(); // Clean up connection

        if (err) {
          // Instead of rejecting, resolve with a recognizable response so callers can handle gracefully
          return resolve({ status: false, data: "Invalid credentials" });
        }
        return resolve("User authenticated successfully");
      });
    });
  }
}
