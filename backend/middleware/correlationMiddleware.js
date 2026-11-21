import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

/**
 * Middleware that attaches a unique correlation ID to every incoming request
 * and propagates it in headers and scoped child loggers.
 */
export const correlationMiddleware = (req, res, next) => {
  const correlationId =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    `req_${uuidv4().replace(/-/g, "").slice(0, 16)}`;

  req.correlationId = correlationId;
  res.setHeader("X-Request-Id", correlationId);

  // Attach a scoped child logger to the request
  req.log = logger.child({ correlationId });

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    req.log[logLevel](`${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userId: req.user?.userId || null,
    });
  });

  next();
};

export default correlationMiddleware;
