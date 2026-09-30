import React, { useEffect, useState } from "react";
import "./style.scss";
import { useLocation, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { useBrand } from "../../../contexts/BrandContext";
import { SSO_LOGIN, ENTRA_LOGIN } from "constants/api/Login";
import {
  SILENT_SSO_STORAGE_KEY,
  clearLocalLogout,
  isLocalLogout,
} from "utils/authStorage";

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

const getSsoProvider = () =>
  (process.env.REACT_APP_SSO_PROVIDER || "entra").toLowerCase();

const getSsoLoginUrl = (silent = false, returnUrl) => {
  const apiBase = (process.env.REACT_APP_DEFAULT_API_BASE_URL || "").replace(
    /\/$/,
    ""
  );
  const provider = getSsoProvider();
  const loginPath = provider === "ias" ? SSO_LOGIN : ENTRA_LOGIN;
  const url = `${apiBase}${loginPath}`;
  const params = new URLSearchParams();
  if (silent && provider !== "ias") params.set("prompt", "none");
  if (returnUrl) params.set("returnUrl", returnUrl);
  const query = params.toString();
  return query ? `${url}?${query}` : url;
};

const shouldSkipSilentSso = () => {
  if (getSsoProvider() === "ias") return true;
  if (isLocalLogout()) return true;
  if (sessionStorage.getItem(SILENT_SSO_STORAGE_KEY) === "attempted") {
    return true;
  }
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("sso") || params.get("error"));
};

function LoginComp({ completing = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { brandConfig } = useBrand();
  const [ssoRedirectMode, setSsoRedirectMode] = useState(() =>
    completing || shouldSkipSilentSso() ? null : "silent"
  );
  const isSsoRedirecting = completing || Boolean(ssoRedirectMode);

  const handleSsoLogin = () => {
    clearLocalLogout();
    setSsoRedirectMode("interactive");
  };

  useEffect(() => {
    const result = searchParams.get("sso") || searchParams.get("error");
    if (!result) return;
    sessionStorage.setItem(SILENT_SSO_STORAGE_KEY, "attempted");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("sso");
    nextParams.delete("error");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (completing || !ssoRedirectMode) return;
    const from = location.state?.from;
    if (
      typeof from === "string" &&
      from.startsWith("/") &&
      !sessionStorage.getItem("essaReturnUrl")
    ) {
      sessionStorage.setItem("essaReturnUrl", from);
    }
    if (ssoRedirectMode === "silent") {
      sessionStorage.setItem(SILENT_SSO_STORAGE_KEY, "attempted");
    }
    window.location.href = getSsoLoginUrl(
      ssoRedirectMode === "silent",
      sessionStorage.getItem("essaReturnUrl")
    );
  }, [completing, ssoRedirectMode, location.state]);

  return (
    <div className="login-container login-container--entra">
      <div className="login-entra-brand">
        <img
          src={brandConfig.logos.auth}
          alt={`${brandConfig.displayName} logo`}
          className="login-entra-brand__logo"
        />
        <p className="login-entra-brand__subtitle">
          EAPA [ACCOUNTS PAYABLE AUTOMATION]
        </p>
      </div>
      {isSsoRedirecting ? (
        <div className="ms-redirecting" aria-live="polite">
          <span className="ms-redirecting__status">
            <MicrosoftMark />{" "}
            {completing
              ? "Completing Microsoft sign-in…"
              : "Redirecting to Microsoft sign-in…"}
          </span>
          <Loader2 size={18} className="ms-redirecting__spinner" />
          <p className="ms-redirecting__hint">
            Authentication is handled by your corporate Microsoft account.
            After sign-in you&apos;ll continue to the page you were opening.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="ms-signin-button"
          onClick={handleSsoLogin}
        >
          <MicrosoftMark /> Sign in with Microsoft
        </button>
      )}
      <p className="login-entra-footer">
        <ShieldCheck size={12} aria-hidden />
        Microsoft Entra ID · corporate identity policies apply · no local
        passwords
      </p>
    </div>
  );
}

export default LoginComp;
