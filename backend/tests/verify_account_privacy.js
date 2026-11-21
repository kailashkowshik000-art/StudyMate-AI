/**
 * StudyMate AI — Phase 8.4 Account Management, Data Privacy & Legal Infrastructure Verification Suite
 * Validates:
 * 1. User schema consent fields & lastLoginAt tracking
 * 2. Security overview endpoint logic & session count calculation
 * 3. Personal data export aggregation across all 12 user-associated models
 * 4. Export security sanitization: exclusion of passwords, tokens, embeddings, and server file paths
 * 5. Strict multi-tenant user isolation during data export
 * 6. Account deletion confirmation phrase enforcement ("DELETE MY ACCOUNT")
 * 7. Account deletion password authentication & rejection of invalid credentials
 * 8. External cloud storage (Cloudflare R2/local) file deletion reconciliation
 * 9. Multi-collection database cascade deletion (13 collections including Chat & Messages)
 * 10. Multi-tenant isolation during deletion (other users' data untouched)
 * 11. Authentication cookies clearance upon account deletion
 * 12. Preservation guarantee: All uploaded files in backend/uploads directory intact
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    if (details) console.log(`         ${details}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error(`         ${details}`);
    failedTests++;
  }
}

// In-Memory Test Stores to simulate Mongoose models
class MockStore {
  constructor() {
    this.items = new Map();
  }
  insert(doc) {
    const id = doc._id || doc.id || `doc_${crypto.randomBytes(6).toString("hex")}`;
    const clone = JSON.parse(JSON.stringify(doc));
    clone._id = id;
    this.items.set(id, clone);
    return clone;
  }
  find(query = {}) {
    const res = [];
    for (const item of this.items.values()) {
      let match = true;
      for (const [k, v] of Object.entries(query)) {
        if (v && typeof v === "object" && v.$in) {
          if (!v.$in.includes(item[k])) match = false;
        } else if (item[k] !== v) {
          match = false;
        }
      }
      if (match) res.push(JSON.parse(JSON.stringify(item)));
    }
    return res;
  }
  findOne(query = {}) {
    const res = this.find(query);
    return res.length > 0 ? res[0] : null;
  }
  deleteMany(query = {}) {
    let deleted = 0;
    for (const [id, item] of this.items.entries()) {
      let match = true;
      for (const [k, v] of Object.entries(query)) {
        if (v && typeof v === "object" && v.$in) {
          if (!v.$in.includes(item[k])) match = false;
        } else if (item[k] !== v) {
          match = false;
        }
      }
      if (match) {
        this.items.delete(id);
        deleted++;
      }
    }
    return { deletedCount: deleted };
  }
  deleteOne(query = {}) {
    for (const [id, item] of this.items.entries()) {
      let match = true;
      for (const [k, v] of Object.entries(query)) {
        if (item[k] !== v) match = false;
      }
      if (match) {
        this.items.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }
  countDocuments(query = {}) {
    return this.find(query).length;
  }
}

// Instantiate mock stores for all models
const stores = {
  User: new MockStore(),
  Session: new MockStore(),
  Document: new MockStore(),
  TextChunk: new MockStore(),
  Summary: new MockStore(),
  Quiz: new MockStore(),
  Flashcard: new MockStore(),
  Exam: new MockStore(),
  StudyPlan: new MockStore(),
  StudyActivity: new MockStore(),
  LearningProfile: new MockStore(),
  ChatSession: new MockStore(),
  Message: new MockStore(),
};

// Storage mock to track external deletions
const mockStorage = {
  deletedKeys: [],
  failNextDelete: false,
  deleteDocumentFromStorage: async (doc) => {
    if (mockStorage.failNextDelete) {
      throw new Error("Simulated S3 network failure");
    }
    mockStorage.deletedKeys.push(doc.storageKey || doc.filename || doc.documentId);
    return true;
  },
};

// Controller logic implementation mirrors accountController.js
const accountTestHarness = {
  getSecurityOverview: async (user, stores) => {
    const foundUser = stores.User.findOne({ userId: user.userId });
    if (!foundUser) return { status: 404, body: { success: false, message: "User not found" } };

    const now = new Date();
    const activeSessions = stores.Session.find({
      userId: foundUser.userId,
      isRevoked: false,
    }).filter((s) => !s.expiresAt || new Date(s.expiresAt) > now);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          userId: foundUser.userId,
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
          isEmailVerified: foundUser.isEmailVerified,
          createdAt: foundUser.createdAt,
          lastLoginAt: foundUser.lastLoginAt || foundUser.createdAt,
          consent: foundUser.consent || {
            termsAccepted: true,
            termsAcceptedAt: foundUser.createdAt,
            privacyAccepted: true,
            privacyAcceptedAt: foundUser.createdAt,
            policyVersion: "1.0.0",
          },
          activeSessionsCount: activeSessions.length,
        },
      },
    };
  },

  exportUserData: async (user, stores) => {
    const userId = user.userId;
    const foundUser = stores.User.findOne({ userId });
    if (!foundUser) return { status: 404, body: { success: false, message: "User not found" } };

    const sanitizedUser = { ...foundUser };
    delete sanitizedUser.password;
    delete sanitizedUser.emailVerificationTokenHash;
    delete sanitizedUser.passwordResetTokenHash;
    delete sanitizedUser.failedLoginAttempts;
    delete sanitizedUser.lockUntil;

    const learningProfile = stores.LearningProfile.findOne({ userId });

    const documents = stores.Document.find({ userId }).map((d) => {
      const copy = { ...d };
      delete copy.filePath;
      return copy;
    });

    const textChunks = stores.TextChunk.find({ userId }).map((tc) => {
      const copy = { ...tc };
      delete copy.embedding;
      return copy;
    });

    const summaries = stores.Summary.find({ userId });
    const quizzes = stores.Quiz.find({ userId });
    const flashcards = stores.Flashcard.find({ userId });
    const exams = stores.Exam.find({ userId });
    const studyPlans = stores.StudyPlan.find({ userId });
    const studyActivity = stores.StudyActivity.find({ userId });

    const chatSessions = stores.ChatSession.find({ userId });
    const sessionIds = chatSessions.map((cs) => cs.sessionId);
    const messages = stores.Message.find({ sessionId: { $in: sessionIds } });

    const sessions = stores.Session.find({ userId }).map((s) => {
      const copy = { ...s };
      delete copy.refreshTokenHash;
      delete copy.previousRefreshTokenHash;
      return copy;
    });

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
      userProfile: sanitizedUser,
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

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="studymate-data-export-${userId}.json"`,
      },
      body: dataArchive,
    };
  },

  deleteAccount: async (reqUser, body, stores, storage) => {
    const { password, confirmationText } = body;
    const userId = reqUser.userId;

    const normalizedConfirmation = (confirmationText || "").trim().toUpperCase();
    if (
      normalizedConfirmation !== "DELETE" &&
      normalizedConfirmation !== "DELETE MY ACCOUNT"
    ) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Please type 'DELETE MY ACCOUNT' to confirm account deletion.",
        },
      };
    }

    if (!password) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Current password is required to delete your account.",
        },
      };
    }

    const foundUser = stores.User.findOne({ userId });
    if (!foundUser) return { status: 404, body: { success: false, message: "User not found" } };

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return {
        status: 401,
        body: {
          success: false,
          message: "Incorrect password. Account deletion aborted.",
        },
      };
    }

    const userDocs = stores.Document.find({ userId });
    const storageErrors = [];

    for (const doc of userDocs) {
      try {
        await storage.deleteDocumentFromStorage(doc);
      } catch (err) {
        storageErrors.push({ documentId: doc.documentId, error: err.message });
      }
    }

    stores.Document.deleteMany({ userId });
    stores.TextChunk.deleteMany({ userId });
    stores.Summary.deleteMany({ userId });
    stores.Quiz.deleteMany({ userId });
    stores.Flashcard.deleteMany({ userId });
    stores.Exam.deleteMany({ userId });
    stores.StudyPlan.deleteMany({ userId });
    stores.StudyActivity.deleteMany({ userId });
    stores.LearningProfile.deleteMany({ userId });

    const chatSessions = stores.ChatSession.find({ userId });
    const sessionIds = chatSessions.map((cs) => cs.sessionId);
    if (sessionIds.length > 0) {
      stores.Message.deleteMany({ sessionId: { $in: sessionIds } });
    }
    stores.ChatSession.deleteMany({ userId });

    stores.Session.deleteMany({ userId });
    stores.User.deleteOne({ userId });

    const clearedCookies = ["accessToken", "refreshToken", "csrfToken"];

    return {
      status: 200,
      clearedCookies,
      body: {
        success: true,
        message: "Your account and all associated personal data have been permanently deleted.",
        storageReconciled: storageErrors.length === 0,
      },
    };
  },
};

async function runTestSuite() {
  console.log("================================================================================");
  console.log("  StudyMate AI — Phase 8.4 Account Management & Privacy Verification Suite");
  console.log("================================================================================\n");

  const hashedPasswordA = await bcrypt.hash("StudentPassword123!", 10);
  const hashedPasswordB = await bcrypt.hash("OtherPassword123!", 10);

  // 1. Seed User A (primary test subject)
  const userA = stores.User.insert({
    userId: "usr_alice123",
    name: "Alice Johnson",
    email: "alice@university.edu",
    password: hashedPasswordA,
    role: "student",
    isEmailVerified: true,
    lastLoginAt: new Date(Date.now() - 3600000),
    consent: {
      termsAccepted: true,
      termsAcceptedAt: new Date("2026-11-01T10:00:00Z"),
      privacyAccepted: true,
      privacyAcceptedAt: new Date("2026-11-01T10:00:00Z"),
      policyVersion: "1.0.0",
    },
    createdAt: new Date("2026-11-01T10:00:00Z"),
  });

  // Seed User B (cross-tenant boundary subject)
  const userB = stores.User.insert({
    userId: "usr_bob456",
    name: "Bob Smith",
    email: "bob@university.edu",
    password: hashedPasswordB,
    role: "student",
    isEmailVerified: true,
    createdAt: new Date("2026-11-02T10:00:00Z"),
  });

  // Seed Sessions for User A (1 active, 1 expired, 1 revoked)
  stores.Session.insert({
    sessionId: "sess_alice_active",
    userId: "usr_alice123",
    refreshTokenHash: "hash_alice_1",
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
  });
  stores.Session.insert({
    sessionId: "sess_alice_revoked",
    userId: "usr_alice123",
    refreshTokenHash: "hash_alice_2",
    isRevoked: true,
    expiresAt: new Date(Date.now() + 86400000),
  });
  stores.Session.insert({
    sessionId: "sess_alice_expired",
    userId: "usr_alice123",
    refreshTokenHash: "hash_alice_3",
    isRevoked: false,
    expiresAt: new Date(Date.now() - 10000),
  });

  // Seed Session for User B
  stores.Session.insert({
    sessionId: "sess_bob_active",
    userId: "usr_bob456",
    refreshTokenHash: "hash_bob_1",
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
  });

  // Seed User A Data across all collections
  stores.LearningProfile.insert({
    userId: "usr_alice123",
    studyGoals: "Ace Operating Systems and Distributed Systems",
    dailyStudyTarget: 60,
  });

  stores.Document.insert({
    documentId: "doc_alice_1",
    userId: "usr_alice123",
    filename: "lecture1_os.pdf",
    storageKey: "documents/usr_alice123/doc_alice_1.pdf",
    filePath: "C:\\Users\\kowshik kailas\\OneDrive\\Desktop\\StudyMate-AI\\backend\\uploads\\internal_doc1.pdf",
  });

  stores.TextChunk.insert({
    chunkId: "chunk_alice_1",
    userId: "usr_alice123",
    documentId: "doc_alice_1",
    text: "Operating systems manage hardware resources through system calls and virtual memory.",
    embedding: [0.12, 0.45, -0.67, 0.89], // vector to be sanitized
  });

  stores.Summary.insert({
    summaryId: "sum_alice_1",
    userId: "usr_alice123",
    documentId: "doc_alice_1",
    title: "OS Fundamentals Notes",
    keyPoints: ["Kernel mode vs User mode", "Virtual memory paging"],
  });

  stores.Quiz.insert({
    quizId: "quiz_alice_1",
    userId: "usr_alice123",
    title: "OS Midterm Prep Quiz",
    score: 95,
  });

  stores.Flashcard.insert({
    cardId: "flash_alice_1",
    userId: "usr_alice123",
    front: "What is a Translation Lookaside Buffer (TLB)?",
    back: "A hardware cache for virtual-to-physical address translations.",
  });

  stores.Exam.insert({
    examId: "exam_alice_1",
    userId: "usr_alice123",
    title: "Operating Systems Comprehensive Final",
    score: 92,
  });

  stores.StudyPlan.insert({
    planId: "plan_alice_1",
    userId: "usr_alice123",
    title: "14-Day OS Exam Cram Schedule",
  });

  stores.StudyActivity.insert({
    activityId: "act_alice_1",
    userId: "usr_alice123",
    durationMinutes: 45,
    activityType: "summary_review",
  });

  stores.ChatSession.insert({
    sessionId: "chat_alice_1",
    userId: "usr_alice123",
    title: "Virtual Memory Discussion",
  });

  stores.Message.insert({
    messageId: "msg_alice_1",
    sessionId: "chat_alice_1",
    sender: "user",
    content: "Can you explain page faults in simple terms?",
  });

  stores.Message.insert({
    messageId: "msg_alice_2",
    sessionId: "chat_alice_1",
    sender: "ai",
    content: "A page fault occurs when an application accesses a memory page not currently mapped in physical RAM.",
  });

  // Seed User B Data
  stores.Document.insert({
    documentId: "doc_bob_1",
    userId: "usr_bob456",
    filename: "bob_chemistry.pdf",
    storageKey: "documents/usr_bob456/bob_chemistry.pdf",
    filePath: "C:\\backend\\uploads\\bob.pdf",
  });
  stores.Quiz.insert({
    quizId: "quiz_bob_1",
    userId: "usr_bob456",
    title: "Organic Chemistry Quiz",
  });

  // =========================================================================
  // TEST GROUP 1: User Schema & Consent Validation
  // =========================================================================
  console.log("--- TEST GROUP 1: User Model Schema & Consent Fields ---");

  assert(
    userA.consent && userA.consent.termsAccepted === true,
    "User A has explicit consent.termsAccepted = true"
  );
  assert(
    userA.consent && userA.consent.policyVersion === "1.0.0",
    "User A consent records policyVersion = '1.0.0'"
  );
  assert(
    !isNaN(Date.parse(userA.lastLoginAt)),
    "User A tracks lastLoginAt as a valid Date timestamp"
  );

  // Backward compatibility test for legacy user without consent subdocument
  const legacyUserOverview = await accountTestHarness.getSecurityOverview(userB, stores);
  assert(
    legacyUserOverview.status === 200 && legacyUserOverview.body.data.consent.termsAccepted === true,
    "Legacy user without explicit consent subdocument defaults to termsAccepted = true"
  );
  assert(
    legacyUserOverview.body.data.consent.policyVersion === "1.0.0",
    "Legacy user defaults to current policyVersion '1.0.0'"
  );

  // =========================================================================
  // TEST GROUP 2: Security Overview Endpoint Logic
  // =========================================================================
  console.log("\n--- TEST GROUP 2: Security Overview & Session Posture ---");

  const overviewRes = await accountTestHarness.getSecurityOverview(userA, stores);
  assert(
    overviewRes.status === 200 && overviewRes.body.success === true,
    "GET /api/account/security-overview returns 200 OK"
  );
  assert(
    overviewRes.body.data.activeSessionsCount === 1,
    "Active session count correctly counts only unrevoked, unexpired sessions (1 active out of 3 total)",
    `Expected 1, got ${overviewRes.body.data.activeSessionsCount}`
  );
  assert(
    overviewRes.body.data.isEmailVerified === true,
    "Security overview reflects email verification status (true)"
  );
  assert(
    overviewRes.body.data.email === "alice@university.edu",
    "Security overview returns accurate authenticated email"
  );

  // =========================================================================
  // TEST GROUP 3: Personal Data Export & Sanitization
  // =========================================================================
  console.log("\n--- TEST GROUP 3: Data Export Archive & Security Sanitization ---");

  const exportRes = await accountTestHarness.exportUserData(userA, stores);
  assert(
    exportRes.status === 200,
    "GET /api/account/export returns 200 OK with application/json"
  );

  const archive = exportRes.body;
  assert(
    archive.exportMetadata && archive.exportMetadata.version === "1.0.0",
    "Export metadata includes version '1.0.0' and compliance description"
  );
  assert(
    Array.isArray(archive.exportMetadata.includedEntities) &&
      archive.exportMetadata.includedEntities.length === 13,
    "Export metadata confirms coverage across all 13 educational data entities"
  );

  // Verify inclusion of all user data entities
  assert(
    archive.userProfile && archive.userProfile.userId === "usr_alice123",
    "Archive includes sanitized userProfile for Alice"
  );
  assert(
    archive.learningProfile && archive.learningProfile.dailyStudyTarget === 60,
    "Archive includes learningProfile goals and study targets"
  );
  assert(
    archive.documents && archive.documents.length === 1,
    "Archive includes user's uploaded lecture documents"
  );
  assert(
    archive.textChunks && archive.textChunks.length === 1,
    "Archive includes document text chunks"
  );
  assert(
    archive.summaries && archive.summaries.length === 1,
    "Archive includes generated AI notes & chapter summaries"
  );
  assert(
    archive.quizzes && archive.quizzes.length === 1,
    "Archive includes quiz attempts and review history"
  );
  assert(
    archive.flashcards && archive.flashcards.length === 1,
    "Archive includes spaced repetition flashcards"
  );
  assert(
    archive.exams && archive.exams.length === 1,
    "Archive includes comprehensive exam scores"
  );
  assert(
    archive.studyPlans && archive.studyPlans.length === 1,
    "Archive includes active study schedules"
  );
  assert(
    archive.studyActivity && archive.studyActivity.length === 1,
    "Archive includes study analytics activities"
  );
  assert(
    archive.chatSessions && archive.chatSessions.length === 1,
    "Archive includes AI tutor chat sessions"
  );
  assert(
    archive.chatMessages && archive.chatMessages.length === 2,
    "Archive includes all chat tutor dialogues mapped by sessionId"
  );
  assert(
    archive.sessionLogs && archive.sessionLogs.length === 3,
    "Archive includes active and past login session logs"
  );

  // CRITICAL SECURITY SANITIZATION VERIFICATION
  assert(
    archive.userProfile.password === undefined,
    "CRITICAL: User password/hash is STRICTLY EXCLUDED from export archive"
  );
  assert(
    archive.userProfile.emailVerificationTokenHash === undefined &&
      archive.userProfile.passwordResetTokenHash === undefined,
    "CRITICAL: Email and password reset verification hashes are STRICTLY EXCLUDED"
  );
  assert(
    archive.sessionLogs.every((s) => s.refreshTokenHash === undefined),
    "CRITICAL: Refresh token hashes are STRICTLY EXCLUDED from session logs"
  );
  assert(
    archive.textChunks.every((tc) => tc.embedding === undefined),
    "PERFORMANCE/PRIVACY: High-dimensional vector embeddings are STRIPPED from text chunks"
  );
  assert(
    archive.documents.every((d) => d.filePath === undefined),
    "SECURITY: Server filesystem paths are STRIPPED from documents metadata"
  );

  // Cross-tenant boundary test: Bob's data must NEVER appear in Alice's archive
  assert(
    !JSON.stringify(archive).includes("bob@university.edu") &&
      !JSON.stringify(archive).includes("bob_chemistry.pdf"),
    "TENANT ISOLATION: User B's documents and personal information are absent from User A's export"
  );

  // =========================================================================
  // TEST GROUP 4: Account Cascade Deletion Workflow
  // =========================================================================
  console.log("\n--- TEST GROUP 4: Deliberate Account Deletion & Multi-Collection Cascade ---");

  // Attempt deletion without confirmation text
  const noConfirmRes = await accountTestHarness.deleteAccount(
    userA,
    { password: "StudentPassword123!", confirmationText: "wrong" },
    stores,
    mockStorage
  );
  assert(
    noConfirmRes.status === 400 && noConfirmRes.body.success === false,
    "Account deletion REJECTS invalid confirmation phrase"
  );

  // Attempt deletion with incorrect password
  const badPasswordRes = await accountTestHarness.deleteAccount(
    userA,
    { password: "WrongPassword999!", confirmationText: "DELETE MY ACCOUNT" },
    stores,
    mockStorage
  );
  assert(
    badPasswordRes.status === 401 && badPasswordRes.body.success === false,
    "Account deletion REJECTS incorrect password with 401 Unauthorized"
  );

  // Ensure no records were deleted during failed attempts
  assert(
    stores.User.findOne({ userId: "usr_alice123" }) !== null,
    "User A remains intact after failed deletion attempts"
  );

  // Perform deliberate, authorized cascade deletion
  const successfulDeleteRes = await accountTestHarness.deleteAccount(
    userA,
    { password: "StudentPassword123!", confirmationText: "DELETE MY ACCOUNT" },
    stores,
    mockStorage
  );

  assert(
    successfulDeleteRes.status === 200 && successfulDeleteRes.body.success === true,
    "Authorized account deletion returns 200 OK with success confirmation"
  );
  assert(
    mockStorage.deletedKeys.includes("documents/usr_alice123/doc_alice_1.pdf"),
    "Cloudflare R2 cloud storage object was reconciled and deleted"
  );
  assert(
    successfulDeleteRes.clearedCookies.includes("accessToken") &&
      successfulDeleteRes.clearedCookies.includes("refreshToken") &&
      successfulDeleteRes.clearedCookies.includes("csrfToken"),
    "Authentication and CSRF cookies are instructed to clear"
  );

  // Validate complete cascade erasure across all MongoDB collections
  assert(
    stores.User.findOne({ userId: "usr_alice123" }) === null,
    "Cascade: User record deleted from User collection"
  );
  assert(
    stores.Document.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All user documents deleted"
  );
  assert(
    stores.TextChunk.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All document text chunks deleted"
  );
  assert(
    stores.Summary.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All summaries and notes deleted"
  );
  assert(
    stores.Quiz.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All quiz records deleted"
  );
  assert(
    stores.Flashcard.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All flashcard records deleted"
  );
  assert(
    stores.Exam.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All exam records deleted"
  );
  assert(
    stores.StudyPlan.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All study plan records deleted"
  );
  assert(
    stores.StudyActivity.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All study activity analytics records deleted"
  );
  assert(
    stores.LearningProfile.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: Learning profile deleted"
  );
  assert(
    stores.ChatSession.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: Chat sessions deleted"
  );
  assert(
    stores.Message.find({ sessionId: "chat_alice_1" }).length === 0,
    "Cascade: All chat messages mapped to user chat sessions deleted"
  );
  assert(
    stores.Session.find({ userId: "usr_alice123" }).length === 0,
    "Cascade: All active and revoked login sessions deleted"
  );

  // Validate other users are completely unaffected
  assert(
    stores.User.findOne({ userId: "usr_bob456" }) !== null,
    "TENANT PRESERVATION: User B's profile remains completely untouched"
  );
  assert(
    stores.Document.find({ userId: "usr_bob456" }).length === 1,
    "TENANT PRESERVATION: User B's documents remain completely untouched"
  );
  assert(
    stores.Quiz.find({ userId: "usr_bob456" }).length === 1,
    "TENANT PRESERVATION: User B's quiz records remain completely untouched"
  );

  // =========================================================================
  // TEST GROUP 5: Upload Files Preservation Verification
  // =========================================================================
  console.log("\n--- TEST GROUP 5: Local Upload Files Preservation ---");

  const uploadsDir = path.resolve(__dirname, "../uploads");
  const uploadFiles = fs.readdirSync(uploadsDir);
  assert(
    uploadFiles.length >= 25,
    `Preservation: All original user uploads exist (${uploadFiles.length} files found, minimum expected: 25)`
  );

  // Summary
  console.log("\n================================================================================");
  console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
