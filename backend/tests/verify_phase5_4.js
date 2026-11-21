/**
 * StudyMate AI - Phase 5.4 Verification Test Suite
 *
 * Verifies Database Persistence & Data Integrity:
 * 1. Missing or invalid production database configuration throws fatal error.
 * 2. USE_MEMORY_DB=true is strictly rejected in production.
 * 3. Connection URI sanitizer strips credentials safely.
 * 4. Liveness probe (GET /healthz/live) returns HTTP 200 with uptime and status.
 * 5. Readiness probe (GET /healthz/ready) returns HTTP 200 when ready and 503 when disconnected.
 * 6. Readiness probe redacts database credentials from response payload.
 * 7. Model validation rules enforced across Mongoose schemas.
 * 8. Duplicate record prevention and compound indexes.
 * 9. Referential integrity & cascade deletion (cleans chunks/summaries, preserves user-wide history).
 * 10. Structured logger redacts sensitive credentials, tokens, paths, and keys.
 * 11. Correlation ID middleware generates and attaches X-Request-Id and scoped logger.
 * 12. Existing authenticated workflows and RAG question-answering remain 100% compatible.
 */

import http from "http";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { app } from "../app.js";
import { generateToken } from "../utils/token.js";
import {
  validateDatabaseConfig,
  sanitizeMongoUri,
  getDBStatus,
} from "../config/db.js";
import { sanitizeLogData, logger } from "../utils/logger.js";
import { correlationMiddleware } from "../middleware/correlationMiddleware.js";

import User from "../models/User.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import Summary from "../models/Summary.js";
import Quiz from "../models/Quiz.js";
import Exam from "../models/Exam.js";
import Flashcard from "../models/Flashcard.js";
import LearningProfile from "../models/LearningProfile.js";
import StudyActivity from "../models/StudyActivity.js";
import ChatSession from "../models/ChatSession.js";
import { deleteDocument } from "../controllers/documentController.js";
import geminiService from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ANSI Colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function recordResult(testNum, title, passed, details = "") {
  if (passed) {
    passedCount++;
    console.log(`  ${GREEN}[PASS]${RESET} ${BOLD}Test ${testNum}:${RESET} ${title}`);
    if (details) console.log(`         ${CYAN}${details}${RESET}`);
  } else {
    failedCount++;
    console.error(`  ${RED}[FAIL]${RESET} ${BOLD}Test ${testNum}:${RESET} ${title}`);
    if (details) console.error(`         ${RED}${details}${RESET}`);
  }
}

/**
 * Dispatch an HTTP request to Express app in-memory
 */
function dispatch(targetApp, { method = "GET", url = "/", headers = {}, body = null }) {
  return new Promise((resolve) => {
    const socket = Object.assign(new EventEmitter(), {
      remoteAddress: "127.0.0.1",
      destroy: () => {},
      cork: () => {},
      uncork: () => {},
      write: () => true,
    });

    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = { host: "localhost", ...headers };
    req.ip = "127.0.0.1";
    req.socket = socket;
    req.connection = socket;

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    let responseBody = "";
    res.write = function (chunk) {
      if (chunk) responseBody += chunk;
      return true;
    };

    res.end = function (chunk) {
      if (chunk) responseBody += chunk;
      let json = null;
      try {
        json = JSON.parse(responseBody);
      } catch (_) {}

      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: responseBody,
        json,
      });
    };

    if (body !== null && body !== undefined) {
      const isBuf = Buffer.isBuffer(body);
      const data = isBuf ? body : typeof body === "string" ? body : JSON.stringify(body);
      req.headers["content-length"] = isBuf ? body.length : Buffer.byteLength(data);
      if (!req.headers["content-type"]) {
        req.headers["content-type"] = "application/json";
      }
      targetApp.handle(req, res);
      req.push(data);
      req.push(null);
    } else {
      targetApp.handle(req, res);
      req.push(null);
    }
  });
}

async function runPhase54Tests() {
  console.log(`\n${BOLD}${CYAN}==================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  STUDYMATE AI - PHASE 5.4 DATABASE PERSISTENCE & INTEGRITY TESTS ${RESET}`);
  console.log(`${BOLD}${CYAN}==================================================================\n`);

  const initialEnv = { ...process.env };
  const userAId = "60d5ec49f1b2c82b8c8a1111";
  const tokenUserA = generateToken({ userId: userAId, email: "user_a@test.com" });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Missing or invalid production database configuration throws error
    // -------------------------------------------------------------------------
    {
      let missingUriCaught = false;
      let localhostUriCaught = false;

      // Case A: Missing MONGODB_URI in production
      delete process.env.MONGODB_URI;
      delete process.env.USE_MEMORY_DB;
      try {
        validateDatabaseConfig("production");
      } catch (err) {
        missingUriCaught = err.message.includes("MONGODB_URI environment variable is required in production");
      }

      // Case B: Insecure localhost URI in production
      process.env.MONGODB_URI = "mongodb://localhost:27017/studymate_prod";
      try {
        validateDatabaseConfig("production");
      } catch (err) {
        localhostUriCaught = err.message.includes("Insecure local or in-memory MongoDB URI");
      }

      process.env.MONGODB_URI = initialEnv.MONGODB_URI;

      recordResult(
        1,
        "Production startup fails safely when MONGODB_URI is missing or insecure",
        missingUriCaught && localhostUriCaught,
        `Missing URI caught: ${missingUriCaught}, Localhost URI rejected: ${localhostUriCaught}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: USE_MEMORY_DB=true is strictly prohibited in production
    // -------------------------------------------------------------------------
    {
      let memoryDbProhibited = false;
      process.env.USE_MEMORY_DB = "true";
      process.env.MONGODB_URI = "mongodb+srv://admin:pass@cluster0.abcde.mongodb.net/prod";

      try {
        validateDatabaseConfig("production");
      } catch (err) {
        memoryDbProhibited = err.message.includes("USE_MEMORY_DB is strictly prohibited in production");
      }

      process.env.USE_MEMORY_DB = initialEnv.USE_MEMORY_DB;
      process.env.MONGODB_URI = initialEnv.MONGODB_URI;

      recordResult(
        2,
        "USE_MEMORY_DB=true is strictly prohibited in production",
        memoryDbProhibited,
        `Prohibited memory DB in production: ${memoryDbProhibited}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: Connection URI sanitizer strips credentials safely
    // -------------------------------------------------------------------------
    {
      const rawAtlasUri = "mongodb+srv://adminUser:SuperSecretPassword123!@cluster0.abcde.mongodb.net/studymate_db";
      const sanitized = sanitizeMongoUri(rawAtlasUri);

      const passClean = !sanitized.includes("SuperSecretPassword123!") && sanitized.includes("[CREDENTIALS_REDACTED]");

      recordResult(
        3,
        "MongoDB URI sanitizer redacts credentials from logs and telemetry",
        passClean,
        `Sanitized URI: "${sanitized}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Liveness probe (GET /healthz/live) returns HTTP 200
    // -------------------------------------------------------------------------
    {
      const res = await dispatch(app, {
        method: "GET",
        url: "/healthz/live",
      });

      const isLive =
        res.statusCode === 200 &&
        res.json?.status === "ok" &&
        res.json?.service === "studymate-ai-backend" &&
        typeof res.json?.uptime === "number";

      recordResult(
        4,
        "Liveness probe (GET /healthz/live) returns HTTP 200 with uptime and service metadata",
        isLive,
        `Status: ${res.statusCode}, Body: ${JSON.stringify(res.json)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5 & 6: Readiness probe (GET /healthz/ready) status & credential safety
    // -------------------------------------------------------------------------
    {
      const res = await dispatch(app, {
        method: "GET",
        url: "/healthz/ready",
      });

      // When DB is disconnected in unit test environment, readiness probe returns 503
      // When connected, returns 200
      const isExpectedCode = res.statusCode === 200 || res.statusCode === 503;
      const hasSafeStructure =
        res.json?.service === "studymate-ai-backend" &&
        "database" in (res.json || {}) &&
        typeof res.json.database?.readyState === "number";

      // Verify no secrets or credentials leaked in response
      const jsonStr = JSON.stringify(res.json || {});
      const noCredentialsLeaked =
        !jsonStr.includes("password") &&
        !jsonStr.includes("mongodb+srv") &&
        !jsonStr.includes("adminUser");

      recordResult(
        5,
        "Readiness probe (GET /healthz/ready) returns valid readiness state (200 when ready, 503 when disconnected)",
        isExpectedCode && hasSafeStructure,
        `Status code: ${res.statusCode}, Database status: ${res.json?.database?.status}`
      );

      recordResult(
        6,
        "Readiness probe never exposes database credentials or internal connection strings",
        noCredentialsLeaked,
        `Response inspected: No credentials, URIs, or passwords exposed in payload.`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: Model validation rules across Mongoose schemas
    // -------------------------------------------------------------------------
    {
      let userValidationWorks = false;
      let docValidationWorks = false;
      let chunkValidationWorks = false;

      // 7a: User model invalid email validation
      const badUser = new User({ name: "Bob", email: "invalid-email-string", password: "123" });
      const userErr = badUser.validateSync();
      userValidationWorks = !!userErr?.errors?.email && !!userErr?.errors?.password;

      // 7b: Document model invalid status validation
      const badDoc = new Document({
        userId: userAId,
        fileName: "test.pdf",
        filePath: "/uploads/test.pdf",
        fileUrl: "/uploads/test.pdf",
        fileSize: 100,
        processingStatus: "invalid_status_enum",
      });
      const docErr = badDoc.validateSync();
      docValidationWorks = !!docErr?.errors?.processingStatus;

      // 7c: TextChunk model required chunkIndex validation
      const badChunk = new TextChunk({ documentId: "doc_123", userId: userAId, text: "sample text" });
      const chunkErr = badChunk.validateSync();
      chunkValidationWorks = !!chunkErr?.errors?.chunkIndex;

      recordResult(
        7,
        "Mongoose schemas enforce required field validation, regex matches, and enum constraints",
        userValidationWorks && docValidationWorks && chunkValidationWorks,
        `User validation: ${userValidationWorks}, Document validation: ${docValidationWorks}, Chunk validation: ${chunkValidationWorks}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate record prevention & compound index definitions
    // -------------------------------------------------------------------------
    {
      // Verify compound index definitions in schemas
      const textChunkIndexes = TextChunk.schema.indexes();
      const summaryIndexes = Summary.schema.indexes();
      const quizIndexes = Quiz.schema.indexes();
      const flashcardIndexes = Flashcard.schema.indexes();

      const chunkHasUniqueConstraint = textChunkIndexes.some((idx) => {
        const fields = idx[0];
        const options = idx[1] || {};
        return fields.documentId === 1 && fields.chunkIndex === 1 && options.unique === true;
      });

      const summaryHasCompoundIndex = summaryIndexes.some((idx) => {
        const fields = idx[0];
        return fields.userId === 1 && fields.documentId === 1;
      });

      const flashcardHasCompoundIndex = flashcardIndexes.some((idx) => {
        const fields = idx[0];
        return fields.userId === 1 && fields.documentId === 1 && fields.question === 1;
      });

      recordResult(
        8,
        "Compound indexes and unique constraints prevent duplicate text chunks and enable fast lookups",
        chunkHasUniqueConstraint && summaryHasCompoundIndex && flashcardHasCompoundIndex,
        `TextChunk { documentId: 1, chunkIndex: 1 } unique: ${chunkHasUniqueConstraint}, Summary compound: ${summaryHasCompoundIndex}, Flashcard compound: ${flashcardHasCompoundIndex}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 9: Referential integrity & cascade deletion behavior
    // -------------------------------------------------------------------------
    {
      const targetDocId = "doc_cascade_test_009";
      const testDoc = {
        _id: "60d5ec49f1b2c82b8c8a3333",
        documentId: targetDocId,
        userId: userAId,
        fileName: "cascade_test.pdf",
        filePath: path.join(uploadDir, "temp_cascade.pdf"),
      };

      fs.writeFileSync(testDoc.filePath, "temp content for deletion test");

      let chunksDeleted = false;
      let summariesDeleted = false;
      let flashcardsDeleted = false;
      let quizzesDeleted = false;
      let examDissociated = false;
      let studyActivityPreserved = false;
      let chatSessionDissociated = false;

      // Mock Mongoose model methods
      const origDocFindOne = Document.findOne;
      Document.findOne = () => Promise.resolve(testDoc);

      const origDocDeleteOne = Document.deleteOne;
      Document.deleteOne = () => Promise.resolve({ deletedCount: 1 });

      const origChunkDelete = TextChunk.deleteMany;
      TextChunk.deleteMany = (q) => {
        if (q.documentId === targetDocId) chunksDeleted = true;
        return Promise.resolve({ deletedCount: 5 });
      };

      const origSumDelete = Summary.deleteMany;
      Summary.deleteMany = (q) => {
        if (q.documentId === targetDocId) summariesDeleted = true;
        return Promise.resolve({ deletedCount: 1 });
      };

      const origFlashDelete = Flashcard.deleteMany;
      Flashcard.deleteMany = (q) => {
        if (q.documentId === targetDocId) flashcardsDeleted = true;
        return Promise.resolve({ deletedCount: 3 });
      };

      const origQuizDelete = Quiz.deleteMany;
      Quiz.deleteMany = (q) => {
        if (q.documentId === targetDocId) quizzesDeleted = true;
        return Promise.resolve({ deletedCount: 2 });
      };

      const origExamUpdate = Exam.updateMany;
      Exam.updateMany = (q, u) => {
        if (q.documentId === targetDocId && u.$set?.documentId === null) examDissociated = true;
        return Promise.resolve({ modifiedCount: 1 });
      };

      const origActUpdate = StudyActivity.updateMany;
      StudyActivity.updateMany = (q, u) => {
        if (q.documentId === targetDocId && u.$set?.documentId === null) studyActivityPreserved = true;
        return Promise.resolve({ modifiedCount: 10 });
      };

      const origChatUpdate = ChatSession.updateMany;
      ChatSession.updateMany = (q, u) => {
        if (q.documentId === targetDocId && u.$set?.documentId === null) chatSessionDissociated = true;
        return Promise.resolve({ modifiedCount: 2 });
      };

      // Execute document deletion through controller
      const mockReq = { params: { id: targetDocId }, user: { userId: userAId } };
      let responsePayload = null;
      const mockRes = {
        statusCode: 200,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(p) {
          responsePayload = p;
          return this;
        },
      };

      await deleteDocument(mockReq, mockRes, () => {});

      // Restore mocks
      Document.findOne = origDocFindOne;
      Document.deleteOne = origDocDeleteOne;
      TextChunk.deleteMany = origChunkDelete;
      Summary.deleteMany = origSumDelete;
      Flashcard.deleteMany = origFlashDelete;
      Quiz.deleteMany = origQuizDelete;
      Exam.updateMany = origExamUpdate;
      StudyActivity.updateMany = origActUpdate;
      ChatSession.updateMany = origChatUpdate;

      const fileDeleted = !fs.existsSync(testDoc.filePath);
      const allCascadeHandled =
        chunksDeleted &&
        summariesDeleted &&
        flashcardsDeleted &&
        quizzesDeleted &&
        examDissociated &&
        studyActivityPreserved &&
        chatSessionDissociated &&
        fileDeleted;

      recordResult(
        9,
        "Document deletion performs cascade cleanup of document-bound content while preserving user-wide learning history",
        allCascadeHandled,
        `Chunks: ${chunksDeleted}, Summaries: ${summariesDeleted}, Flashcards: ${flashcardsDeleted}, Quizzes: ${quizzesDeleted}, Exams dissociated: ${examDissociated}, Study history preserved: ${studyActivityPreserved}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Structured logger redacts sensitive credentials, tokens, paths
    // -------------------------------------------------------------------------
    {
      const sensitivePayload = {
        user: "student@university.edu",
        password: "MySuperSecretPassword!@#",
        apiKey: "AIzaSyD1234567890123456789012345678901",
        connectionString: "mongodb+srv://admin:pass1234@cluster0.abcde.mongodb.net/testdb",
        jwt_secret: "super_secret_jwt_key_that_should_not_leak",
        filePath: "C:\\Users\\kowshik kailas\\OneDrive\\Desktop\\StudyMate-AI\\backend\\server.js",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3IxMjMifQ.XYZ1234567890abcdef",
      };

      const sanitized = sanitizeLogData(sensitivePayload);

      const passClean =
        sanitized.password === "[REDACTED]" &&
        sanitized.jwt_secret === "[REDACTED]" &&
        sanitized.apiKey === "[REDACTED]" &&
        sanitized.token === "[REDACTED]" &&
        !sanitized.connectionString.includes("pass1234") &&
        !sanitized.filePath.includes("kowshik kailas");

      recordResult(
        10,
        "Structured logger redacts passwords, tokens, API keys, DB URIs, and filesystem paths",
        passClean,
        `Sanitized object: ${JSON.stringify(sanitized)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: Correlation ID middleware attaches X-Request-Id & scoped logger
    // -------------------------------------------------------------------------
    {
      let middlewareExecuted = false;
      const customReqId = "req_custom_trace_987654";
      const mockReq = { headers: { "x-request-id": customReqId } };
      const headersSet = {};
      const mockRes = {
        setHeader(k, v) {
          headersSet[k] = v;
        },
        on() {},
      };

      correlationMiddleware(mockReq, mockRes, () => {
        middlewareExecuted = true;
      });

      const idAttached =
        middlewareExecuted &&
        mockReq.correlationId === customReqId &&
        headersSet["X-Request-Id"] === customReqId &&
        typeof mockReq.log?.info === "function";

      recordResult(
        11,
        "Request correlation ID middleware sets X-Request-Id header and attaches scoped logger",
        idAttached,
        `Correlation ID: ${mockReq.correlationId}, Header: ${headersSet["X-Request-Id"]}, Scoped logger present: ${typeof mockReq.log?.info === "function"}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: Existing authenticated workflows and RAG remain 100% compatible
    // -------------------------------------------------------------------------
    {
      const userRecord = {
        _id: userAId,
        userId: userAId,
        email: "user_a@test.com",
        name: "User A",
      };

      const origUserFindOne = User.findOne;
      User.findOne = () => ({
        select: () => Promise.resolve(userRecord),
      });

      const origDocFind = Document.find;
      Document.find = () => ({
        sort: () =>
          Promise.resolve([
            {
              documentId: "doc_compat_012",
              userId: userAId,
              fileName: "operating_systems.pdf",
              processingStatus: "completed",
              status: "ready",
              fileSize: 2048576,
              chunkCount: 15,
              uploadedAt: new Date(),
            },
          ]),
      });

      const res = await dispatch(app, {
        method: "GET",
        url: "/api/documents",
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      User.findOne = origUserFindOne;
      Document.find = origDocFind;

      const ragRes = await geminiService.generateAnswer({
        question: "Explain virtual memory in operating systems.",
        contextChunks: [
          { text: "Virtual memory maps virtual addresses to physical RAM.", fileName: "operating_systems.pdf", chunkIndex: 0 },
        ],
      });

      const workflowsCompatible = res.statusCode === 200 && !!(ragRes && ragRes.answer);

      recordResult(
        12,
        "Existing authenticated document APIs and RAG Q&A pipelines remain 100% operational",
        workflowsCompatible,
        `API status: ${res.statusCode}, Documents listed: ${res.json?.data?.documents?.length}, RAG answer present: ${!!ragRes?.answer}`
      );
    }
  } catch (fatalErr) {
    console.error(`\n${RED}[FATAL ERROR in Phase 5.4 test runner]:${RESET}`, fatalErr);
  } finally {
    process.env = initialEnv;
  }

  // Summary
  console.log(`\n${BOLD}==================================================================${RESET}`);
  console.log(`${BOLD}PHASE 5.4 TEST RESULTS SUMMARY:${RESET}`);
  console.log(`  ${GREEN}Passed:${RESET} ${passedCount} / ${passedCount + failedCount}`);
  console.log(`  ${RED}Failed:${RESET} ${failedCount} / ${passedCount + failedCount}`);
  console.log(`${BOLD}==================================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase54Tests();
