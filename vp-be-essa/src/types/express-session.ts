import "express-session";

declare module "express-session" {
  interface SessionData {
    oidc?: {
      state: string;
      nonce: string;
      code_verifier: string;
      returnUrl?: string;
    };
    authProvider?: "sap_ias" | "entra";
    /** Mapped portal user after BFF SSO — used as the API credential. */
    portalUser?: {
      id: number;
      vendor_id: number | null;
      CoCd: string | null;
      emp_id: number | null;
      email: string;
      vendorCode: string | null;
      role_id: number;
      Employee_Id: number | null;
      name: string | null;
      Is_PO_Inline: boolean | null;
    };
    /** Raw IAS claims after a successful BE-handled callback */
    iasUser?: Record<string, unknown>;
    /** Token endpoint response fields needed for logout */
    iasTokenSet?: {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
    /** Raw Entra ID claims — never sent to the browser */
    entraUser?: Record<string, unknown>;
    /** Entra tokens stay server-side in the HttpOnly session */
    entraTokenSet?: {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }
}

export {};
