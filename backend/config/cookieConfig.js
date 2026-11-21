/**
 * StudyMate AI — Secure Cookie Configuration (Phase 8.2)
 * Manages HTTP-only, SameSite, and Secure attributes for access and refresh tokens
 */

export const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const CSRF_COOKIE_NAME = "XSRF-TOKEN";

// Defaults in milliseconds
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCookieConfig() {
  const isProduction = process.env.NODE_ENV === "production";

  // In production, secure cookies over HTTPS are mandatory unless explicitly disabled for staging
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : isProduction;

  // SameSite: Lax allows top-level navigations while preventing cross-origin CSRF;
  // Strict is strongest when frontend and backend share origins.
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? "lax" : "lax");

  return {
    isProduction,
    secure,
    sameSite,
  };
}

/**
 * Cookie options for the short-lived access token
 */
export function getAccessTokenCookieOptions() {
  const { secure, sameSite } = getCookieConfig();
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: "/",
  };
}

/**
 * Cookie options for the rotated refresh token
 */
export function getRefreshTokenCookieOptions() {
  const { secure, sameSite } = getCookieConfig();
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/",
  };
}

/**
 * Cookie options for the CSRF double-submit token (must be readable by client JS)
 */
export function getCsrfCookieOptions() {
  const { secure, sameSite } = getCookieConfig();
  return {
    httpOnly: false, // Accessible by frontend JS to copy into X-CSRF-Token header
    secure,
    sameSite,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/",
  };
}

/**
 * Cookie options for clearing/invalidating cookies upon logout
 */
export function getClearCookieOptions() {
  const { secure, sameSite } = getCookieConfig();
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };
}

export default {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getCookieConfig,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCsrfCookieOptions,
  getClearCookieOptions,
};
