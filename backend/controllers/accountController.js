import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import Summary from "../models/Summary.js";
import Quiz from "../models/Quiz.js";
import Flashcard from "../models/Flashcard.js";
import Exam from "../models/Exam.js";
import StudyPlan from "../models/StudyPlan.js";
import StudyActivity from "../models/StudyActivity.js";
import LearningProfile from "../models/LearningProfile.js";
import ChatSession from "../models/ChatSession.js";
import Message from "../models/Message.js";
import { deleteDocumentFromStorage } from "../services/storage/storageService.js";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getClearCookieOptions,
} from "../config/cookieConfig.js";

// @desc    Retrieve account security overview & privacy details
// @route   GET /api/account/security-overview
// @access  Private
export const getSecurityOverview = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const activeSessionsCount = await Session.countDocuments({
      userId: user.userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || user.createdAt,
        consent: user.consent || {
          termsAccepted: true,
          termsAcceptedAt: user.createdAt,
          privacyAccepted: true,
          privacyAcceptedAt: user.createdAt,
          policyVersion: "1.0.0",
        },
        activeSessionsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export user's personal data archive (GDPR / CCPA data portability)
// @route   GET /api/account/export
// @access  Private
export const exportUserData = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 1. Fetch user profile (sanitized)
    const user = await User.findOne({ userId }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Sanitize user: never export passwords, hashes, reset or verification tokens
    delete user.password;
    delete user.emailVerificationTokenHash;
    delete user.passwordResetTokenHash;
    delete user.failedLoginAttempts;
    delete user.lockUntil;

    // 2. Fetch learning profile
    const learningProfile = await LearningProfile.findOne({ userId }).lean();

    // 3. Fetch documents metadata
    const documents = await Document.find({ userId })
      .select("-filePath") // Omit local server filesystem paths for privacy and portability
      .lean();

    // 4. Fetch document text chunks (omit high-dimension vector embeddings to keep export lightweight)
    const textChunks = await TextChunk.find({ userId })
      .select("-embedding")
      .lean();

    // 5. Fetch generated summaries and AI notes
    const summaries = await Summary.find({ userId }).lean();

    // 6. Fetch quizzes & history
    const quizzes = await Quiz.find({ userId }).lean();

    // 7. Fetch spaced repetition flashcards
    const flashcards = await Flashcard.find({ userId }).lean();

    // 8. Fetch exam records & scores
    const exams = await Exam.find({ userId }).lean();

    // 9. Fetch study plans
    const studyPlans = await StudyPlan.find({ userId }).lean();

    // 10. Fetch study activity and analytics
    const studyActivity = await StudyActivity.find({ userId }).lean();

    // 11. Fetch chat history
    const chatSessions = await ChatSession.find({ userId }).lean();
    const sessionIds = chatSessions.map((cs) => cs.sessionId);
    const messages = await Message.find({ sessionId: { $in: sessionIds } }).lean();

    // 12. Fetch active and past session logs (sanitized)
    const sessions = await Session.find({ userId })
      .select("-refreshTokenHash -previousRefreshTokenHash")
      .lean();

    // Construct portable JSON archive
    const dataArchive = {
      exportMetadata: {
        exportId: `exp_${Date.now()}_${userId}`,
        generatedAt: new Date().toISOString(),
        version: "1.0.0",
        platform: "StudyMate AI",
        description: "StudyMate AI Personal Data Archive (GDPR / CCPA Compliant)",
        includedEntities: [
          "userProfile",
          "learningProfile",
          "documents",
          "textChunks",
          "summaries",
          "quizzes",
          "flashcards",
          "exams",
          "studyPlans",
          "studyActivity",
          "chatSessions",
          "chatMessages",
          "sessionLogs",
        ],
        excludedEntities: [
          "password",
          "passwordHash",
          "emailVerificationTokenHash",
          "passwordResetTokenHash",
          "refreshTokenHash",
          "vectorEmbeddings",
          "internalServerFilePaths",
        ],
      },
      userProfile: user,
      learningProfile: learningProfile || {},
      documents: documents || [],
      textChunks: textChunks || [],
      summaries: summaries || [],
      quizzes: quizzes || [],
      flashcards: flashcards || [],
      exams: exams || [],
      studyPlans: studyPlans || [],
      studyActivity: studyActivity || [],
      chatSessions: chatSessions || [],
      chatMessages: messages || [],
      sessionLogs: sessions || [],
    };

    const fileName = `studymate-data-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(JSON.stringify(dataArchive, null, 2));
  } catch (error) {
    next(error);
  }
};

// @desc    Deliberate and irreversible account deletion (Right to Erasure)
// @route   POST /api/account/delete
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const { password, confirmationText } = req.body;
    const userId = req.user.userId;

    // 1. Validate confirmation text
    const normalizedConfirmation = (confirmationText || "").trim().toUpperCase();
    if (
      normalizedConfirmation !== "DELETE" &&
      normalizedConfirmation !== "DELETE MY ACCOUNT"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please type 'DELETE MY ACCOUNT' to confirm account deletion.",
      });
    }

    // 2. Validate current password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Current password is required to delete your account.",
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Account deletion aborted.",
      });
    }

    console.log(`[AccountDeletion] Initiating deliberate cascade deletion for user ${userId}...`);

    // 3. Collect user documents for external storage deletion
    const userDocs = await Document.find({ userId });
    const storageErrors = [];

    // Delete external storage files (Cloudflare R2 or local uploads)
    for (const doc of userDocs) {
      try {
        await deleteDocumentFromStorage(doc);
      } catch (storageErr) {
        storageErrors.push({ documentId: doc.documentId, error: storageErr.message });
        console.warn(
          `[AccountDeletion] Storage deletion warning for doc ${doc.documentId}:`,
          storageErr.message
        );
      }
    }

    // 4. Cascade delete across all mapped MongoDB collections
    await Document.deleteMany({ userId });
    await TextChunk.deleteMany({ userId });
    await Summary.deleteMany({ userId });
    await Quiz.deleteMany({ userId });
    await Flashcard.deleteMany({ userId });
    await Exam.deleteMany({ userId });
    await StudyPlan.deleteMany({ userId });
    await StudyActivity.deleteMany({ userId });
    await LearningProfile.deleteMany({ userId });

    // Delete chat sessions & associated messages
    const chatSessions = await ChatSession.find({ userId });
    const sessionIds = chatSessions.map((cs) => cs.sessionId);
    if (sessionIds.length > 0) {
      await Message.deleteMany({ sessionId: { $in: sessionIds } });
    }
    await ChatSession.deleteMany({ userId });

    // Revoke and remove all sessions
    await Session.deleteMany({ userId });

    // Finally delete the primary user record
    await User.deleteOne({ userId });

    console.log(`[AccountDeletion] User ${userId} successfully deleted from all database collections.`);

    // 5. Clear authentication cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message: "Your account and all associated personal data have been permanently deleted.",
      storageReconciled: storageErrors.length === 0,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSecurityOverview,
  exportUserData,
  deleteAccount,
};
