import crypto from "crypto";
import { CSRF_COOKIE_NAME, getCsrfCookieOptions } from "../config/cookieConfig.js";

/**
 * Generate a cryptographically random CSRF token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sets CSRF cookie on response
 */
export function setCsrfCookie(res, token = null) {
  const csrfToken = token || generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  return csrfToken;
}

export default {
  generateCsrfToken,
  setCsrfCookie,
  CSRF_COOKIE_NAME,
};
