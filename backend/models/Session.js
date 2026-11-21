import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      index: true,
      default: () => `sess_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
    },
    userId: {
      type: String,
      required: [true, "userId is required for session"],
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: [true, "refreshTokenHash is required"],
      index: true,
    },
    previousRefreshTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      default: "Unknown Device",
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "Unknown IP",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      enum: [
        null,
        "user_logout",
        "user_logout_all",
        "session_revoked",
        "password_change",
        "reuse_detected",
        "expired",
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify if session is currently active and valid
sessionSchema.methods.isActive = function () {
  if (this.isRevoked) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

// Revoke session helper
sessionSchema.methods.revoke = async function (reason = "user_logout") {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return await this.save();
};

export const Session = mongoose.model("Session", sessionSchema);
export default Session;
