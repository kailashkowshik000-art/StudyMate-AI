import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Session from "../models/Session.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/token.js";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_MS,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from "../config/cookieConfig.js";
import { setCsrfCookie } from "../utils/csrf.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewLoginAlertEmail,
} from "../services/email/emailService.js";

/**
 * Helper to establish a session, generate tokens, and set HTTP-only cookies
 */
async function createSessionAndSetCookies(user, req, res) {
  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const ipAddress =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "Unknown IP";

  // Create session record in MongoDB
  const session = new Session({
    userId: user.userId,
    refreshTokenHash: "pending_hash",
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 250) : "Unknown",
    ipAddress: typeof ipAddress === "string" ? ipAddress.slice(0, 60) : "Unknown",
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
  });

  const refreshToken = generateRefreshToken({
    userId: user.userId,
    sessionId: session.sessionId,
  });

  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  const accessToken = generateAccessToken({
    userId: user.userId,
    id: user._id,
    role: user.role,
    sessionId: session.sessionId,
  });

  // Set HTTP-only cookies
  res.cookie(
    ACCESS_TOKEN_COOKIE_NAME,
    accessToken,
    getAccessTokenCookieOptions()
  );
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions()
  );

  // Set CSRF double-submit token
  const csrfToken = setCsrfCookie(res);

  return {
    accessToken,
    refreshToken,
    csrfToken,
    sessionId: session.sessionId,
  };
}

// @desc    Register a new user & trigger email verification
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || "student",
    });

    // Generate single-use verification token
    const verifyToken = user.createEmailVerificationToken();
    await user.save();

    // Trigger asynchronous verification email delivery
    sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verifyToken,
    }).catch((emailErr) => {
      console.warn("[Register] Verification email dispatch note:", emailErr.message);
    });

    const { accessToken, csrfToken } = await createSessionAndSetCookies(
      user,
      req,
      res
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        token: accessToken,
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & establish session
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Prevent user enumeration: generic error message if user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account lockout
    if (user.isLocked && user.isLocked()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockUntil).getTime() - Date.now()) / (60 * 1000)
      );
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${Math.max(
          1,
          remainingMinutes
        )} minute(s).`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (user.incrementFailedLogins) {
        await user.incrementFailedLogins();
      }
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Reset login lock & update last login timestamp on successful authentication
    if (user.resetLoginLock) {
      await user.resetLoginLock();
    }
    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, csrfToken } = await createSessionAndSetCookies(
      user,
      req,
      res
    );

    res.status(200).json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        token: accessToken,
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rotate refresh token and issue new access token
// @route   POST /api/auth/refresh
// @access  Public (Requires Refresh Token)
export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing. Please sign in again.",
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired or invalid. Please sign in again.",
      });
    }

    const tokenHash = hashToken(rawRefreshToken);

    // Look for active session matching this token hash
    let session = await Session.findOne({ refreshTokenHash: tokenHash });

    // REUSE DETECTION: If token does not match active refreshTokenHash
    if (!session) {
      const previousSession = await Session.findOne({
        $or: [
          { previousRefreshTokenHash: tokenHash },
          { refreshTokenHash: tokenHash, isRevoked: true },
        ],
      });

      if (previousSession) {
        // Concurrency Grace Window: Allow 20s grace period for simultaneous requests in flight
        const rotatedTime = previousSession.rotatedAt
          ? new Date(previousSession.rotatedAt).getTime()
          : 0;
        const isWithinGraceWindow =
          rotatedTime > 0 && Date.now() - rotatedTime < 20000;

        if (isWithinGraceWindow && !previousSession.isRevoked) {
          // Simultaneous refresh request: re-issue access token for current active session
          const user = await User.findOne({ userId: previousSession.userId });
          if (user) {
            const reissuedAccessToken = generateAccessToken({
              userId: user.userId,
              id: user._id,
              role: user.role,
              sessionId: previousSession.sessionId,
            });
            res.cookie(
              ACCESS_TOKEN_COOKIE_NAME,
              reissuedAccessToken,
              getAccessTokenCookieOptions()
            );
            return res.status(200).json({
              success: true,
              data: {
                token: reissuedAccessToken,
                message: "Access token reissued (concurrent refresh window)",
              },
            });
          }
        }

        // Token reuse detected outside grace window: Revoke ALL sessions for this user!
        await Session.updateMany(
          { userId: previousSession.userId, isRevoked: false },
          {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: "reuse_detected",
          }
        );

        res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
        res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());

        return res.status(401).json({
          success: false,
          message:
            "Security alert: Refresh token reuse detected. All sessions have been revoked. Please log in again.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Session not found or expired. Please sign in again.",
      });
    }

    if (session.isRevoked) {
      return res.status(401).json({
        success: false,
        message: "Session has been revoked. Please sign in again.",
      });
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      return res.status(401).json({
        success: false,
        message: "Session has expired. Please sign in again.",
      });
    }

    const user = await User.findOne({ userId: session.userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });
    }

    // Refresh Token Rotation: Issue new refresh token & new access token
    const newRefreshToken = generateRefreshToken({
      userId: user.userId,
      sessionId: session.sessionId,
    });
    const newAccessToken = generateAccessToken({
      userId: user.userId,
      id: user._id,
      role: user.role,
      sessionId: session.sessionId,
    });

    session.previousRefreshTokenHash = tokenHash;
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.rotatedAt = new Date();
    session.lastActivity = new Date();
    await session.save();

    res.cookie(
      ACCESS_TOKEN_COOKIE_NAME,
      newAccessToken,
      getAccessTokenCookieOptions()
    );
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      newRefreshToken,
      getRefreshTokenCookieOptions()
    );
    const csrfToken = setCsrfCookie(res);

    res.status(200).json({
      success: true,
      data: {
        token: newAccessToken,
        csrfToken,
        message: "Tokens successfully rotated",
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout from current session
// @route   POST /api/auth/logout
// @access  Public (or Private)
export const logout = async (req, res, next) => {
  try {
    const sessionId =
      req.sessionId ||
      req.body?.sessionId ||
      (req.cookies?.refreshToken
        ? (() => {
            try {
              return verifyRefreshToken(req.cookies.refreshToken)?.sessionId;
            } catch {
              return null;
            }
          })()
        : null);

    if (sessionId) {
      await Session.updateOne(
        { sessionId, isRevoked: false },
        {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "user_logout",
        }
      );
    }

    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout from all active sessions/devices
// @route   POST /api/auth/logout-all
// @access  Private
export const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    await Session.updateMany(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "user_logout_all",
      }
    );

    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message: "Successfully signed out of all devices",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all active sessions for current user
// @route   GET /api/auth/sessions
// @access  Private
export const getSessions = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentSessionId = req.sessionId;

    const sessions = await Session.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivity: -1 });

    const formattedSessions = sessions.map((sess) => ({
      sessionId: sess.sessionId,
      userAgent: sess.userAgent,
      ipAddress: sess.ipAddress,
      createdAt: sess.createdAt,
      lastActivity: sess.lastActivity,
      isCurrent: sess.sessionId === currentSessionId,
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions: formattedSessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke specific session by sessionId
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
export const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const session = await Session.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or already terminated",
      });
    }

    session.isRevoked = true;
    session.revokedAt = new Date();
    session.revokedReason = "session_revoked";
    await session.save();

    // If user revoked their own current session, clear their cookies
    if (sessionId === req.sessionId) {
      res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
      res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());
    }

    res.status(200).json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password with current password verification and session revocation
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current password and new password",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match",
      });
    }

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isCurrentValid = await user.matchPassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Reject reuse of the current password
    const isReused = await bcrypt.compare(newPassword, user.password);
    if (isReused) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke all existing sessions for this user
    await Session.updateMany(
      { userId: user.userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "password_change",
      }
    );

    // Send confirmation email
    sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.connection?.remoteAddress,
    }).catch((emailErr) => {
      console.warn("[ChangePassword] Confirmation email dispatch note:", emailErr.message);
    });

    // Clear cookies requiring fresh login
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully. All active sessions have been revoked. Please sign in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify user email address using single-use cryptographic token
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const rawToken = req.body?.token || req.query?.token;

    if (!rawToken || typeof rawToken !== "string" || rawToken.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Verification token is required.",
      });
    }

    const tokenHash = hashToken(rawToken.trim());
    const user = await User.findOne({ emailVerificationTokenHash: tokenHash });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid or has already been used.",
      });
    }

    if (
      user.emailVerificationExpiresAt &&
      new Date() > new Date(user.emailVerificationExpiresAt)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Verification link has expired. Please request a new verification email.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your email address has been successfully verified! You may now use all StudyMate AI features.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend email verification link
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res, next) => {
  try {
    const email = req.body?.email || req.user?.email;

    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Please provide your email address.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Anti-enumeration: return generic success even if user not found
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists and requires verification, a new link has been sent.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "This email address is already verified. You can log in directly.",
      });
    }

    const verifyToken = user.createEmailVerificationToken();
    await user.save();

    sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verifyToken,
    }).catch((emailErr) => {
      console.warn("[ResendVerification] Email dispatch note:", emailErr.message);
    });

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists and requires verification, a new link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate password reset (generic response prevents account enumeration)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Please enter your registered email address.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Strictly generic response regardless of whether account exists
    const genericSuccessResponse = {
      success: true,
      message:
        "If an account with that email address is registered with StudyMate AI, password reset instructions have been sent.",
    };

    if (!user) {
      return res.status(200).json(genericSuccessResponse);
    }

    // Generate single-use password reset token (valid for 30 minutes)
    const resetToken = user.createPasswordResetToken();
    await user.save();

    sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: resetToken,
    }).catch((emailErr) => {
      console.warn("[ForgotPassword] Email dispatch note:", emailErr.message);
    });

    res.status(200).json(genericSuccessResponse);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete password reset using single-use cryptographic token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long.",
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match.",
      });
    }

    const tokenHash = hashToken(token.trim());
    const user = await User.findOne({ passwordResetTokenHash: tokenHash });

    if (!user || user.passwordResetUsed) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has already been used.",
      });
    }

    if (
      user.passwordResetExpiresAt &&
      new Date() > new Date(user.passwordResetExpiresAt)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset link has expired. Please request a new password reset.",
      });
    }

    // Reject reuse of identical current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password.",
      });
    }

    // Update password and invalidate single-use reset token
    user.password = newPassword;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetUsed = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Revoke all active sessions across all devices
    await Session.updateMany(
      { userId: user.userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "password_change",
      }
    );

    // Send confirmation email
    sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.connection?.remoteAddress,
    }).catch((emailErr) => {
      console.warn("[ResetPassword] Confirmation email dispatch note:", emailErr.message);
    });

    // Clear cookies requiring fresh login (do NOT auto-authenticate)
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message:
        "Your password has been successfully reset. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retrieve CSRF token for state-changing requests
// @route   GET /api/auth/csrf
// @access  Public
export const getCsrfToken = (req, res) => {
  const token = setCsrfCookie(res);
  res.status(200).json({
    success: true,
    csrfToken: token,
  });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        sessionId: req.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
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
};
