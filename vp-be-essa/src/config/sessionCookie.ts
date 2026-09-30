import { CookieOptions } from "express";

export const SESSION_COOKIE_NAME = "vp.sid";
export const SESSION_COOKIE_PATH = "/";

export function isSessionCookieSecure(): boolean {
  return process.env.NODE_ENV === "Prod" || process.env.COOKIE_SECURE === "true";
}

export function sessionCookieSameSite(): "lax" | "none" | "strict" {
  const configured = (process.env.COOKIE_SAMESITE || "").toLowerCase();
  if (configured === "lax" || configured === "none" || configured === "strict") {
    return configured;
  }
  return isSessionCookieSecure() ? "none" : "lax";
}

export function sessionCookieOptions(): CookieOptions {
  return {
    path: SESSION_COOKIE_PATH,
    httpOnly: true,
    secure: isSessionCookieSecure(),
    sameSite: sessionCookieSameSite(),
  };
}

/** Matches login cookie Path / SameSite / Secure so the browser actually drops it. */
export function sessionClearCookieOptions(): CookieOptions {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev-session-secret";
}
