/**
 * Sanitize error messages to remove sensitive secrets, database URIs and filesystem paths
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return "An unexpected error occurred";

  return msg
    // Redact Gemini / Google API Keys
    .replace(/AIza[0-9A-Za-z-_]{30,45}/g, "[REDACTED_API_KEY]")
    // Redact MongoDB connection URIs
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URI]")
    // Redact JWT tokens
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]")
    // Redact Windows absolute filesystem paths
    .replace(/[A-Za-z]:\\[^"'\n\r]+/g, "[REDACTED_PATH]")
    // Redact Unix absolute filesystem paths
    .replace(/(?:\/[a-zA-Z0-9._-]+){3,}/g, "[REDACTED_PATH]");
}

export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Server-side diagnostic log (preserved for ops/debugging)
  console.error(`[SERVER_ERROR] [${req.method} ${req.originalUrl}]:`, err.message);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  // Handle Multer upload errors and invalid/unsupported file validation errors
  if (
    err.name === "MulterError" ||
    (err.message &&
      (err.message.toLowerCase().includes("invalid file") ||
        err.message.toLowerCase().includes("unsupported file") ||
        err.message.toLowerCase().includes("legacy binary formats") ||
        err.message.toLowerCase().includes("file size exceeds") ||
        err.message.toLowerCase().includes("file upload error")))
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(400).json({
      success: false,
      message: `An account with that ${field} already exists`,
    });
  }

  // Handle CORS errors
  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Cross-Origin Request Blocked",
    });
  }

  // Determine user-facing error message
  let userMessage = sanitizeErrorMessage(err.message);
  if (isProduction && statusCode === 500) {
    userMessage = "An unexpected internal server error occurred. Please try again later.";
  }

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    ...(!isProduction && { stack: err.stack }),
  });
};

export default {
  notFound,
  errorHandler,
};
