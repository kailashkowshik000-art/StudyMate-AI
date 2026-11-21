import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getSessions,
  revokeSession,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getCsrfToken,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// Public Authentication Endpoints
router.post("/register", authLimiter, validateRegisterInput, register);
router.post("/login", authLimiter, validateLoginInput, login);
router.post("/refresh", authLimiter, refresh);
router.get("/csrf", getCsrfToken);
router.post("/logout", logout);

// Account Recovery & Lifecycle Endpoints (Phase 8.3)
router.post("/verify-email", authLimiter, verifyEmail);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Authenticated Session & Account Security Endpoints
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAll);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.post("/change-password", protect, changePassword);

export default router;
