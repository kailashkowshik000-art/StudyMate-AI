import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "jwt",
  "secret",
  "jwt_secret",
  "authorization",
  "cookie",
  "gemini_api_key",
  "apikey",
  "key",
]);

/**
 * Recursively sanitize strings and objects to prevent credential leakage
 */
export function sanitizeLogData(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value
      .replace(/AIza[0-9A-Za-z-_]{30,45}/g, "[REDACTED_API_KEY]")
      .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URI]")
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
      .replace(/[A-Za-z]:\\[^"'\n\r]+/g, "[REDACTED_PATH]")
      .replace(/(?:\/[a-zA-Z0-9._-]+){3,}/g, "[REDACTED_PATH]");
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeLogData);
  }

  if (typeof value === "object") {
    // If it's an Error instance
    if (value instanceof Error) {
      return {
        message: sanitizeLogData(value.message),
        name: value.name,
        code: value.code,
        ...(isProduction ? {} : { stack: sanitizeLogData(value.stack) }),
      };
    }

    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        cleaned[k] = "[REDACTED]";
      } else {
        cleaned[k] = sanitizeLogData(v);
      }
    }
    return cleaned;
  }

  return value;
}

// Custom Winston Sanitization Format (preserves Winston symbols)
const sanitizeFormat = winston.format((info) => {
  if (info.message) {
    info.message = sanitizeLogData(info.message);
  }
  for (const [k, v] of Object.entries(info)) {
    if (k === "level" || k === "timestamp") continue;
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      info[k] = "[REDACTED]";
    } else {
      info[k] = sanitizeLogData(v);
    }
  }
  return info;
});

// Production JSON Format
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  sanitizeFormat(),
  winston.format.json()
);

// Development Human-Readable Format
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  sanitizeFormat(),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, correlationId, documentId, ...meta }) => {
    let prefix = `[${timestamp}] [${level}]`;
    if (correlationId) prefix += ` [req:${correlationId}]`;
    if (documentId) prefix += ` [doc:${documentId}]`;

    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${prefix}: ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  format: isProduction ? productionFormat : developmentFormat,
  defaultMeta: { service: "studymate-backend" },
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === "test" && !process.env.TEST_LOGS,
    }),
  ],
});

export default logger;
