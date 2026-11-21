import { CSRF_COOKIE_NAME } from "../config/cookieConfig.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Paths exempt from CSRF checks (unauthenticated entrypoints or token establishment)
const EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/csrf",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/healthz/live",
  "/healthz/ready",
  "/api/health",
];

/**
 * CSRF Protection Middleware for Cookie-Authenticated Requests (Double Submit Cookie)
 */
export const csrfProtection = (req, res, next) => {
  // 1. Safe HTTP methods require no CSRF protection
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // 2. Exempt public auth entrypoints
  const path = req.path || req.originalUrl || "";
  if (EXEMPT_PATHS.some((exempt) => path.startsWith(exempt))) {
    return next();
  }

  // 3. Authorization: Bearer requests are immune to browser ambient CSRF attacks
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return next();
  }

  // 4. If request is cookie-authenticated, enforce CSRF token match
  const cookies = req.cookies || {};
  const hasAuthCookie = !!(cookies.accessToken || cookies.refreshToken);

  if (hasAuthCookie) {
    const clientToken =
      req.headers["x-csrf-token"] ||
      req.headers["x-xsrf-token"] ||
      (req.body && req.body._csrf);
    const cookieToken = cookies[CSRF_COOKIE_NAME];

    if (!cookieToken || !clientToken || clientToken !== cookieToken) {
      return res.status(403).json({
        success: false,
        message:
          "CSRF token validation failed. State-changing request rejected for security.",
      });
    }
  }

  next();
};

export default csrfProtection;
