import { Issuer, generators, Client, TokenSet } from "openid-client";
import { Request } from "express";
import "../types/express-session";
import { APIError } from "../utils/apiError.utils";
import { StatusCodeEnum } from "../utils/enums/status.enum";
import logger from "../utils/logger";

const DEFAULT_ISSUER = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/v2.0`;

class EntraSsoService {
  private client: Client | null = null;
  private initPromise: Promise<Client> | null = null;

  missingConfigKeys(): string[] {
    const required: Array<[string, string]> = [
      ["ENTRA_TENANT_ID", process.env.ENTRA_TENANT_ID || ""],
      ["ENTRA_CLIENT_ID", process.env.ENTRA_CLIENT_ID || ""],
      ["ENTRA_CLIENT_SECRET", process.env.ENTRA_CLIENT_SECRET || ""],
      ["ENTRA_REDIRECT_URI", process.env.ENTRA_REDIRECT_URI || ""],
    ];
    return required
      .filter(([, value]) => !value.trim())
      .map(([key]) => key);
  }

  isConfigured(): boolean {
    return this.missingConfigKeys().length === 0;
  }

  private readEnvConfig() {
    const tenantId = (process.env.ENTRA_TENANT_ID || "").trim();
    const clientId = (process.env.ENTRA_CLIENT_ID || "").trim();
    const clientSecret = (process.env.ENTRA_CLIENT_SECRET || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    const redirectUri = (process.env.ENTRA_REDIRECT_URI || "").trim();
    const scopes = process.env.ENTRA_SCOPES?.trim() || "openid profile email";
    const issuer = (
      process.env.ENTRA_ISSUER_URL || DEFAULT_ISSUER(tenantId)
    )
      .trim()
      .replace(/\/$/, "");
    const postLogoutRedirectUri = (
      process.env.ENTRA_POST_LOGOUT_REDIRECT_URI ||
      process.env.FE_URL ||
      "http://localhost:3000/auth/login"
    ).trim();

    if (!tenantId || !clientId || !clientSecret || !redirectUri) {
      throw new APIError(
        `Entra ID SSO is not configured. Set ${this.missingConfigKeys().join(", ")} in .env.dev and restart the server.`,
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    return {
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      issuer,
      postLogoutRedirectUri,
    };
  }

  async initOidcClient(): Promise<Client | null> {
    if (!this.isConfigured()) {
      logger.warn(
        `Entra ID SSO is not configured; skipping OIDC discovery. Missing: ${this.missingConfigKeys().join(", ")}`,
      );
      return null;
    }

    if (this.client) {
      return this.client;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.discoverClient();
    try {
      return await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  private async discoverClient(): Promise<Client> {
    const { issuer, clientId, clientSecret, redirectUri } = this.readEnvConfig();

    try {
      const entraIssuer = await Issuer.discover(issuer);
      this.client = new entraIssuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_post",
      });
      logger.info(`Entra ID OIDC client initialized with issuer: ${entraIssuer.issuer}`);
      return this.client;
    } catch (error: any) {
      logger.error("Entra ID discovery failed:", error?.message || error);
      throw new APIError(
        "Failed to reach Microsoft Entra ID OpenID discovery endpoint",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async requireClient(): Promise<Client> {
    const missing = this.missingConfigKeys();
    if (missing.length) {
      throw new APIError(
        `Entra ID SSO is not configured. Set ${missing.join(", ")} in .env.dev and restart the server.`,
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    const client = this.client || (await this.initOidcClient());
    if (!client) {
      throw new APIError(
        "Entra ID OIDC client not initialized yet",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }
    return client;
  }

  /**
   * Confidential-client Authorization Code + PKCE.
   * Entra tokens stay on the server; PKCE verifier is stored in the HttpOnly session.
   */
  async buildAuthorizationUrl(
    req: Request,
    options: { prompt?: string; loginHint?: string } = {},
  ): Promise<string> {
    const oidcClient = await this.requireClient();
    const { scopes } = this.readEnvConfig();

    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    if (!req.session) {
      throw new APIError(
        "Server session is required for Entra ID SSO",
        StatusCodeEnum.HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    req.session.oidc = {
      state,
      nonce,
      code_verifier: codeVerifier,
    };

    const params: Record<string, string> = {
      scope: scopes,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      response_mode: "query",
    };

    if (options.prompt) params.prompt = options.prompt;
    if (options.loginHint) params.login_hint = options.loginHint;

    return oidcClient.authorizationUrl(params);
  }

  private tokensToProfile(tokenSet: TokenSet): {
    email: string;
    name?: string;
    oid?: string;
    roles: string[];
    claims: Record<string, any>;
    tokenSet: {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  } {
    const claims = (tokenSet.claims() || {}) as Record<string, any>;
    const email = String(
      claims.email || claims.preferred_username || claims.upn || "",
    )
      .trim()
      .toLowerCase();

    if (!email) {
      throw new APIError(
        "Entra ID token did not include an email claim",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const roles = Array.isArray(claims.roles)
      ? claims.roles.map(String)
      : [];

    return {
      email,
      name: claims.name || claims.given_name,
      oid: claims.oid,
      roles,
      claims,
      tokenSet: {
        id_token: tokenSet.id_token,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at,
      },
    };
  }

  async handleBrowserCallback(req: Request) {
    const oidcSession = req.session?.oidc;
    if (!oidcSession?.code_verifier || !oidcSession?.state) {
      throw new APIError(
        "SSO session missing. Please start login again",
        StatusCodeEnum.HTTP_BAD_REQUEST,
      );
    }

    const oidcClient = await this.requireClient();
    const { redirectUri } = this.readEnvConfig();
    const params = oidcClient.callbackParams(req);

    if (params.error) {
      throw new APIError(
        `Entra ID login failed: ${params.error_description || params.error}`,
        StatusCodeEnum.HTTP_UNAUTHORIZED,
      );
    }

    try {
      const tokenSet = await oidcClient.callback(redirectUri, params, {
        state: oidcSession.state,
        nonce: oidcSession.nonce,
        code_verifier: oidcSession.code_verifier,
      });

      delete req.session.oidc;
      return this.tokensToProfile(tokenSet);
    } catch (error: any) {
      logger.error("Entra ID callback failed:", error?.message || error);
      throw new APIError(
        "Failed to complete Microsoft Entra ID sign-in",
        StatusCodeEnum.HTTP_UNAUTHORIZED,
      );
    }
  }

  async buildLogoutUrl(idTokenHint?: string): Promise<string> {
    const oidcClient = await this.requireClient();
    const { postLogoutRedirectUri } = this.readEnvConfig();

    return oidcClient.endSessionUrl({
      id_token_hint: idTokenHint,
      post_logout_redirect_uri: postLogoutRedirectUri,
    });
  }
}

export default new EntraSsoService();
