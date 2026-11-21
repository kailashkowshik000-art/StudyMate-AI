import rateLimit from "express-rate-limit";

/**
 * Rate Limiter for Authentication endpoints (Login & Registration)
 * Max 10 requests per 15 minutes per IP address
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many authentication attempts from this IP address. Please try again after 15 minutes.",
    });
  },
});

/**
 * Rate Limiter for AI Generation & Tutor endpoints
 * Max 30 requests per minute per authenticated user
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each authenticated user to 30 AI calls per minute
  validate: {
    keyGeneratorIpFallback: false,
  },
  keyGenerator: (req) => {
    // Group by authenticated userId if available, otherwise by IP
    return req.user?.userId || req.ip || "unknown";
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "AI request rate limit exceeded (maximum 30 requests per minute). Please slow down.",
    });
  },
});

export default {
  authLimiter,
  aiLimiter,
};
