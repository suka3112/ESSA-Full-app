import { Issuer, generators, Client, TokenSet } from "openid-client";
import { Request } from "express";
import "../types/express-session";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

type PkceSession = {
  codeVerifier: string;
  nonce: string;
  createdAt: number;
};

const PKCE_TTL_MS = 10 * 60 * 1000;
/** Fallback when FE handles redirect and posts code/state (no shared BE session). */
const pkceStore = new Map<string, PkceSession>();

const cleanupExpiredPkce = () => {
  const now = Date.now();
  for (const [state, session] of pkceStore.entries()) {
    if (now - session.createdAt > PKCE_TTL_MS) {
      pkceStore.delete(state);
    }
  }
};

class SapSsoService {
  private client: Client | null = null;

  isEnabled(): boolean {
    const flag = String(process.env.IAS_SSO_ENABLED ?? "")
      .trim()
      .toLowerCase();
    if (["0", "false", "no", "off"].includes(flag)) {
      return false;
    }
    return true;
  }

  isConfigured(): boolean {
    const issuer = (process.env.IAS_ISSUER_URL || "").trim();
    const clientId = (process.env.IAS_CLIENT_ID || "").trim();
    const clientSecret = (process.env.IAS_CLIENT_SECRET || "").trim();
    const redirectUri = (process.env.IAS_REDIRECT_URI || "").trim();
    return Boolean(issuer && clientId && clientSecret && redirectUri);
  }

  private readEnvConfig() {
    const issuer = (process.env.IAS_ISSUER_URL || "")
      .trim()
      .replace(/\/admin\/?$/, "")
      .replace(/\/$/, "");
    const clientId = (process.env.IAS_CLIENT_ID || "").trim();
    const clientSecret = (process.env.IAS_CLIENT_SECRET || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    const redirectUri = (process.env.IAS_REDIRECT_URI || "").trim();
    const scopes = process.env.IAS_SCOPES?.trim() || "openid email profile";
    const postLogoutRedirectUri = (
      process.env.IAS_POST_LOGOUT_REDIRECT_URI ||
      process.env.FE_URL ||
      redirectUri.replace(/\/auth\/callback\/?$/, "/") ||
      ""
    ).trim();

    if (!issuer || !clientId || !clientSecret || !redirectUri) {
      throw new APIError(
        "IAS SSO is not configured. Set IAS_ISSUER_URL, IAS_CLIENT_ID, IAS_CLIENT_SECRET, IAS_REDIRECT_URI",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    return {
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      postLogoutRedirectUri,
    };
  }

  /**
   * Discover IAS metadata once at startup (not per login request).
   * Returns null when SSO is disabled or the IdP is unreachable so the API can still boot.
   */
  async initOidcClient(): Promise<Client | null> {
    if (!this.isEnabled()) {
      logger.warn(
        "SAP IAS SSO is disabled (IAS_SSO_ENABLED=false); skipping OIDC discovery",
      );
      return null;
    }
    if (!this.isConfigured()) {
      logger.warn("SAP IAS SSO is not configured; skipping OIDC discovery");
      return null;
    }

    const { issuer, clientId, clientSecret, redirectUri } =
      this.readEnvConfig();

    try {
      const iasIssuer = await Issuer.discover(issuer);
      this.client = new iasIssuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        response_types: ["code"],
      });
      logger.info(`OIDC client initialized with issuer: ${iasIssuer.issuer}`);
      return this.client;
    } catch (error: any) {
      logger.error("SAP IAS discovery failed", {
        issuer,
        discoveryUrl: `${issuer}/.well-known/openid-configuration`,
        message: error?.message || String(error),
        statusCode: error?.statusCode || error?.response?.statusCode,
      });
      logger.warn(
        "Continuing without SAP IAS SSO. Set a reachable IAS_ISSUER_URL or IAS_SSO_ENABLED=false",
      );
      return null;
    }
  }

  getClient(): Client {
    if (!this.client) {
      throw new APIError(
        this.isEnabled()
          ? "SAP IAS SSO is unavailable (OIDC discovery failed or not initialized)"
          : "SAP IAS SSO is disabled (IAS_SSO_ENABLED=false)",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
    return this.client;
  }

  /**
   * Starts Authorization Code + PKCE (+ state/nonce).
   * Stores verifier in express-session when available, and in an in-memory
   * state map so the existing FE POST /sso/callback flow still works.
   */
  async buildAuthorizationUrl(req?: Request): Promise<string> {
    cleanupExpiredPkce();

    const oidcClient = this.getClient();
    const { scopes } = this.readEnvConfig();

    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    pkceStore.set(state, {
      codeVerifier,
      nonce,
      createdAt: Date.now(),
    });

    if (req?.session) {
      req.session.oidc = {
        state,
        nonce,
        code_verifier: codeVerifier,
      };
    }

    return oidcClient.authorizationUrl({
      scope: scopes,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
  }

  private async tokensToUser(tokenSet: TokenSet): Promise<{
    email: string;
    name?: string;
    claims: Record<string, any>;
    tokenSet: {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }> {
    const oidcClient = this.getClient();
    const idClaims = tokenSet.claims();
    const accessToken = tokenSet.access_token;

    if (!accessToken) {
      throw new APIError(
        "SAP token response did not include access_token",
        StatusCodeEnum.HTTP_UNAUTHORIZED,
      );
    }

    let userInfo: Record<string, any> = { ...(idClaims || {}) };

    try {
      const profile = await oidcClient.userinfo(accessToken);
      userInfo = { ...userInfo, ...profile };
    } catch (error: any) {
      logger.error(
        "SAP IAS userinfo failed:",
        error?.message || error,
      );
      // ID token claims alone are enough if userinfo is unavailable
    }

    const email = String(
      userInfo.email || userInfo.preferred_username || "",
    )
      .trim()
      .toLowerCase();

    if (!email) {
      throw new APIError(
        "SAP user profile did not include an email",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    return {
      email,
      name: userInfo.name || userInfo.given_name,
      claims: userInfo,
      tokenSet: {
        id_token: tokenSet.id_token,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at,
      },
    };
  }

  /**
   * FE posts { code, state, iss? } after IAS redirects to the SPA callback route.
   * IAS sets authorization_response_iss_parameter_supported=true, so openid-client
   * requires `iss` in the callback params (FE often omits it — we default to config).
   */
  async exchangeCode(params: {
    code: string;
    state: string;
    iss?: string;
  }): Promise<{
    email: string;
    name?: string;
    claims: Record<string, any>;
    tokenSet: {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }> {
    cleanupExpiredPkce();

    const { code, state } = params;
    if (!code || !state) {
      throw new APIError(
        "Missing authorization code or state",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const session = pkceStore.get(state);
    if (!session) {
      throw new APIError(
        "Invalid or expired SSO state. Please start login again",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }
    pkceStore.delete(state);

    const oidcClient = this.getClient();
    const { redirectUri, issuer } = this.readEnvConfig();
    const iss = (params.iss || issuer).trim();

    try {
      const tokenSet = await oidcClient.callback(
        redirectUri,
        { code, state, iss },
        {
          state,
          nonce: session.nonce,
          code_verifier: session.codeVerifier,
        },
      );
      return await this.tokensToUser(tokenSet);
    } catch (error: any) {
      logger.error(
        "SAP IAS token exchange failed:",
        error?.message || String(error),
      );
      throw new APIError(
        "Failed to exchange SAP authorization code",
        StatusCodeEnum.HTTP_UNAUTHORIZED,
      );
    }
  }

  /**
   * BE-handled GET /callback when IAS_REDIRECT_URI points at this API.
   * Uses express-session for state / nonce / PKCE verifier.
   */
  async handleBrowserCallback(req: Request): Promise<{
    email: string;
    name?: string;
    claims: Record<string, any>;
    tokenSet: {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }> {
    const oidcSession = req.session?.oidc;
    if (!oidcSession?.code_verifier || !oidcSession?.state) {
      throw new APIError(
        "SSO session missing. Please start login again",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const oidcClient = this.getClient();
    const { redirectUri } = this.readEnvConfig();
    const params = oidcClient.callbackParams(req);

    try {
      const tokenSet = await oidcClient.callback(redirectUri, params, {
        state: oidcSession.state,
        nonce: oidcSession.nonce,
        code_verifier: oidcSession.code_verifier,
      });

      delete req.session.oidc;
      pkceStore.delete(oidcSession.state);

      const user = await this.tokensToUser(tokenSet);
      req.session.iasUser = user.claims;
      req.session.iasTokenSet = user.tokenSet;
      return user;
    } catch (error: any) {
      logger.error(
        "SAP IAS browser callback failed:",
        error?.message || error,
      );
      throw new APIError(
        "Failed to complete SAP SSO callback",
        StatusCodeEnum.HTTP_UNAUTHORIZED,
      );
    }
  }

  buildLogoutUrl(idTokenHint?: string): string {
    const oidcClient = this.getClient();
    const { postLogoutRedirectUri } = this.readEnvConfig();

    return oidcClient.endSessionUrl({
      id_token_hint: idTokenHint,
      post_logout_redirect_uri: postLogoutRedirectUri,
    });
  }
}

export default new SapSsoService();
