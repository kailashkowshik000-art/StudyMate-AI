import jwt from "jsonwebtoken";
import crypto from "crypto";

export const KNOWN_DEFAULT_SECRETS = [
  "fallback_dev_secret_studymate_phase2",
  "studymate_dev_jwt_secret_phase2_secure_token",
  "secret",
  "changeme",
  "your_jwt_secret",
  "your_super_secure_jwt_secret_key_here",
  "default_secret",
  "123456",
];

const DEV_FALLBACK_ACCESS_SECRET =
  "dev_only_local_fallback_access_secret_studymate_do_not_use_in_prod";
const DEV_FALLBACK_REFRESH_SECRET =
  "dev_only_local_fallback_refresh_secret_studymate_do_not_use_in_prod";

/**
 * Validates and retrieves the Access Token Secret
 */
export function getAccessTokenSecret() {
  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!secret || typeof secret !== "string" || secret.trim() === "") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: ACCESS_TOKEN_SECRET or JWT_SECRET environment variable is required in production."
      );
    }
    if (KNOWN_DEFAULT_SECRETS.includes(secret.trim())) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: Insecure default ACCESS_TOKEN_SECRET detected in production. Please set a unique, cryptographically secure secret."
      );
    }
    if (secret.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: ACCESS_TOKEN_SECRET must be at least 32 characters in production."
      );
    }
    return secret;
  }

  // Development / test fallback
  if (!secret || secret.trim() === "") {
    return DEV_FALLBACK_ACCESS_SECRET;
  }

  return secret;
}

/**
 * Validates and retrieves the Refresh Token Secret
 */
export function getRefreshTokenSecret() {
  const secret =
    process.env.REFRESH_TOKEN_SECRET ||
    (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_refresh_secure_key" : null);
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!secret || typeof secret !== "string" || secret.trim() === "") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: REFRESH_TOKEN_SECRET environment variable is required in production."
      );
    }
    if (KNOWN_DEFAULT_SECRETS.includes(secret.trim())) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: Insecure default REFRESH_TOKEN_SECRET detected in production. Please set a unique, cryptographically secure secret."
      );
    }
    if (secret.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: REFRESH_TOKEN_SECRET must be at least 32 characters in production."
      );
    }
    return secret;
  }

  // Development / test fallback
  if (!secret || secret.trim() === "") {
    return DEV_FALLBACK_REFRESH_SECRET;
  }

  return secret;
}

/**
 * Legacy compatibility helper for getJwtSecret
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!secret || typeof secret !== "string" || secret.trim() === "") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable is required in production."
      );
    }
    if (KNOWN_DEFAULT_SECRETS.includes(secret.trim())) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: Insecure default JWT_SECRET detected in production. Please set a unique, cryptographically secure secret."
      );
    }
    if (secret.length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: JWT_SECRET must be at least 32 characters in production."
      );
    }
    return secret;
  }

  if (!secret || secret.trim() === "") {
    return DEV_FALLBACK_ACCESS_SECRET;
  }
  return secret;
}

/**
 * Signs a short-lived access token (~15 minutes)
 */
export const generateAccessToken = (payload) => {
  const secret = getAccessTokenSecret();
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Signs a longer-lived refresh token (~7 days)
 */
export const generateRefreshToken = (payload) => {
  const secret = getRefreshTokenSecret();
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
  const jwtid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  return jwt.sign(payload, secret, { expiresIn, jwtid });
};

/**
 * Verifies an access token
 */
export const verifyAccessToken = (token) => {
  const secret = getAccessTokenSecret();
  return jwt.verify(token, secret);
};

/**
 * Verifies a refresh token
 */
export const verifyRefreshToken = (token) => {
  const secret = getRefreshTokenSecret();
  return jwt.verify(token, secret);
};

/**
 * Generates a SHA-256 hash of a refresh token to safely store in MongoDB
 */
export function hashToken(token) {
  if (!token || typeof token !== "string") return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Backward compatibility helpers for existing test suites & controllers
 */
export const generateToken = (payload) => {
  return generateAccessToken(payload);
};

export const verifyToken = (token) => {
  return verifyAccessToken(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateToken,
  verifyToken,
  getAccessTokenSecret,
  getRefreshTokenSecret,
  getJwtSecret,
  KNOWN_DEFAULT_SECRETS,
};
