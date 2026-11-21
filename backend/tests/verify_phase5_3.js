/**
 * StudyMate AI - Phase 5.3 Verification Test Suite
 *
 * Verifies Secure Uploads & Asynchronous Document Processing:
 * 1. Successful PDF upload returns HTTP 202 Accepted.
 * 2. Background processing executes asynchronously.
 * 3. Processing status transitions: pending -> processing -> completed.
 * 4. Progress updates across pipeline stages (0 -> 100).
 * 5. Document status endpoint (GET /api/documents/:id/status) returns progress & metadata.
 * 6. Invalid PDF upload rejected with HTTP 400.
 * 7. Processing failure handling (sets failed status, safe error message, cleans partial chunks).
 * 8. Retry behavior (POST /api/documents/:id/retry) re-queues and resets progress.
 * 9. Duplicate job prevention (atomic locking rejects duplicate processing of in-flight document).
 * 10. Document deletion during/after processing cancels jobs, purges chunks, and unlinks file.
 * 11. User ownership isolation enforced on status, retry, and download endpoints.
 * 12. Compatibility with existing document workflows and RAG question-answering.
 */

import http from "http";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";

import { app } from "../app.js";
import { generateToken } from "../utils/token.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import User from "../models/User.js";
import { uploadDir } from "../services/fileService.js";
import {
  executeDocumentProcessing,
  enqueueDocument,
  retryDocument,
  cancelDocumentJob,
} from "../services/documentQueueService.js";
import geminiService from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Sample valid minimal PDF content with valid %PDF-1.4 header
const MINIMAL_PDF_CONTENT = Buffer.from(
  "%PDF-1.4\n" +
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n" +
    "4 0 obj\n<< /Length 55 >>\nstream\n" +
    "BT\n/F1 12 Tf\n100 700 Td\n(StudyMate AI test lecture content) Tj\nET\n" +
    "endstream\nendobj\n" +
    "xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\n" +
    "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n320\n%%EOF"
);

async function runPhase53Tests() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  STUDYMATE AI - PHASE 5.3 ASYNCHRONOUS PROCESSING TESTS        ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  const userAId = "60d5ec49f1b2c82b8c8a1111";
  const userBId = "60d5ec49f1b2c82b8c8a2222";
  const tokenUserA = generateToken({ userId: userAId, email: "user_a@test.com" });
  const tokenUserB = generateToken({ userId: userBId, email: "user_b@test.com" });

  // Stub User.findOne to authenticate userA and userB seamlessly
  const origUserFindOne = User.findOne;
  User.findOne = (query) => {
    const targetId = query.$or?.[0]?.userId || query._id;
    return {
      select: () =>
        Promise.resolve({
          _id: targetId,
          userId: targetId,
          email: `${targetId}@test.com`,
          name: `User ${targetId}`,
        }),
    };
  };

  // Create temporary test PDF files
  const testPdfFilename = `test_upload_${Date.now()}.pdf`;
  const testPdfPath = path.join(uploadDir, testPdfFilename);
  fs.writeFileSync(testPdfPath, MINIMAL_PDF_CONTENT);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Successful PDF upload returns HTTP 202 Accepted & statusUrl
    // -------------------------------------------------------------------------
    {
      const docRecord = {
        documentId: "doc_test_async_001",
        userId: userAId,
        fileName: "distributed_systems.pdf",
        filePath: testPdfPath,
        fileUrl: `/uploads/${testPdfFilename}`,
        fileSize: MINIMAL_PDF_CONTENT.length,
        fileType: "application/pdf",
        subject: "Computer Science",
        processingStatus: "pending",
        status: "uploaded",
        processingProgress: 0,
        processingError: null,
      };

      const origDocCreate = Document.create;
      Document.create = async () => docRecord;

      // Prepare multipart body simulation with boundary
      const boundary = "----WebKitFormBoundaryPhase53Test";
      const payload =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="subject"\r\n\r\nComputer Science\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${testPdfFilename}"\r\n` +
        `Content-Type: application/pdf\r\n\r\n` +
        MINIMAL_PDF_CONTENT.toString("binary") +
        `\r\n--${boundary}--\r\n`;

      const uploadRes = await dispatch(app, {
        method: "POST",
        url: "/api/documents",
        headers: {
          authorization: `Bearer ${tokenUserA}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        body: Buffer.from(payload, "binary"),
      });

      Document.create = origDocCreate;

      const is202 = uploadRes.statusCode === 202;
      const hasStatusUrl = !!uploadRes.json?.data?.statusUrl;
      const isPending = uploadRes.json?.data?.document?.processingStatus === "pending";

      recordResult(
        1,
        "PDF upload endpoint immediately returns HTTP 202 Accepted with statusUrl",
        is202 && hasStatusUrl && isPending,
        `Status: ${uploadRes.statusCode}, StatusUrl: ${uploadRes.json?.data?.statusUrl}, processingStatus: ${uploadRes.json?.data?.document?.processingStatus}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2 & 3: Background processing execution and status transitions
    // -------------------------------------------------------------------------
    {
      const docState = {
        documentId: "doc_worker_transition_002",
        userId: userAId,
        fileName: "test_doc.pdf",
        filePath: testPdfPath,
        fileUrl: `/uploads/${testPdfFilename}`,
        fileSize: MINIMAL_PDF_CONTENT.length,
        subject: "Biology",
        processingStatus: "pending",
        status: "uploaded",
        processingProgress: 0,
        processingError: null,
        save: async function () {
          return this;
        },
      };

      const transitions = [docState.processingStatus];

      const origFindOneAndUpdate = Document.findOneAndUpdate;
      Document.findOneAndUpdate = async (filter, update) => {
        if (filter.processingStatus?.$in?.includes(docState.processingStatus)) {
          Object.assign(docState, update.$set);
          transitions.push(docState.processingStatus);
          return docState;
        }
        return null;
      };

      const origUpdateOne = Document.updateOne;
      Document.updateOne = async (filter, update) => {
        Object.assign(docState, update.$set);
        return { modifiedCount: 1 };
      };

      const origChunkDelete = TextChunk.deleteMany;
      TextChunk.deleteMany = async () => ({ deletedCount: 0 });

      const origChunkInsert = TextChunk.insertMany;
      TextChunk.insertMany = async (chunks) => chunks;

      // Execute worker
      const finishedDoc = await executeDocumentProcessing(docState.documentId, docState.userId);
      transitions.push(docState.processingStatus);

      // Restore stubs
      Document.findOneAndUpdate = origFindOneAndUpdate;
      Document.updateOne = origUpdateOne;
      TextChunk.deleteMany = origChunkDelete;
      TextChunk.insertMany = origChunkInsert;

      const completed = finishedDoc && finishedDoc.processingStatus === "completed";
      const hasAllTransitions = transitions.includes("pending") && transitions.includes("processing") && transitions.includes("completed");

      recordResult(
        2,
        "Background worker executes processing pipeline asynchronously",
        completed,
        `Final Status: ${finishedDoc?.processingStatus}, Chunks generated: ${finishedDoc?.chunkCount || 0}`
      );

      recordResult(
        3,
        "Status transitions follow: pending -> processing -> completed",
        hasAllTransitions,
        `Observed transitions: ${transitions.join(" -> ")}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Progress updates from 0 -> 100
    // -------------------------------------------------------------------------
    {
      const progressLog = [];
      const docState = {
        documentId: "doc_progress_003",
        userId: userAId,
        fileName: "sample.pdf",
        filePath: testPdfPath,
        fileUrl: `/uploads/${testPdfFilename}`,
        processingStatus: "pending",
        processingProgress: 0,
        save: async function () {
          progressLog.push(this.processingProgress);
          return this;
        },
      };

      const origFindOneAndUpdate = Document.findOneAndUpdate;
      Document.findOneAndUpdate = async (filter, update) => {
        Object.assign(docState, update.$set);
        progressLog.push(docState.processingProgress);
        return docState;
      };

      const origUpdateOne = Document.updateOne;
      Document.updateOne = async (filter, update) => {
        Object.assign(docState, update.$set);
        progressLog.push(docState.processingProgress);
        return { modifiedCount: 1 };
      };

      const origChunkDelete = TextChunk.deleteMany;
      TextChunk.deleteMany = async () => ({ deletedCount: 0 });

      const origChunkInsert = TextChunk.insertMany;
      TextChunk.insertMany = async (chunks) => chunks;

      await executeDocumentProcessing(docState.documentId, docState.userId);

      Document.findOneAndUpdate = origFindOneAndUpdate;
      Document.updateOne = origUpdateOne;
      TextChunk.deleteMany = origChunkDelete;
      TextChunk.insertMany = origChunkInsert;

      const reached100 = progressLog.includes(100);
      const progressedProperly = progressLog.length >= 3 && reached100;

      recordResult(
        4,
        "Processing progress increments across pipeline stages and completes at 100%",
        progressedProperly,
        `Observed progress increments: ${progressLog.join("%, ")}%`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: Status endpoint (GET /api/documents/:id/status)
    // -------------------------------------------------------------------------
    {
      const docRecord = {
        documentId: "doc_status_query_004",
        userId: userAId,
        fileName: "quantum_physics.pdf",
        processingStatus: "processing",
        processingProgress: 65,
        processingError: null,
        status: "processing",
        chunkCount: 12,
        uploadedAt: new Date(),
        retryCount: 0,
      };

      const origFindOne = Document.findOne;
      Document.findOne = (query) => {
        if (
          query.documentId === docRecord.documentId ||
          query.$or?.[0]?.documentId === docRecord.documentId ||
          query.userId === userAId
        ) {
          return Promise.resolve(docRecord);
        }
        return Promise.resolve(null);
      };

      const res = await dispatch(app, {
        method: "GET",
        url: `/api/documents/${docRecord.documentId}/status`,
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      Document.findOne = origFindOne;

      const hasFields =
        res.statusCode === 200 &&
        res.json?.data?.processingStatus === "processing" &&
        res.json?.data?.processingProgress === 65 &&
        res.json?.data?.chunkCount === 12;

      recordResult(
        5,
        "Status API (GET /api/documents/:id/status) returns processingStatus, progress, and metadata",
        hasFields,
        `Status: ${res.statusCode}, Data: ${JSON.stringify(res.json?.data)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Invalid PDF upload rejected with HTTP 400
    // -------------------------------------------------------------------------
    {
      const boundary = "----WebKitFormBoundaryInvalidTest";
      const payload =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="malicious.exe"\r\n` +
        `Content-Type: application/x-msdownload\r\n\r\n` +
        `MZ_not_a_pdf_file\r\n` +
        `--${boundary}--\r\n`;

      const res = await dispatch(app, {
        method: "POST",
        url: "/api/documents",
        headers: {
          authorization: `Bearer ${tokenUserA}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        body: Buffer.from(payload),
      });

      const rejected = res.statusCode === 400 && res.json?.success === false;

      recordResult(
        6,
        "Invalid file upload (non-PDF) is rejected immediately with HTTP 400",
        rejected,
        `Response status: ${res.statusCode}, Message: "${res.json?.message}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: Processing failure handling & chunk cleanup
    // -------------------------------------------------------------------------
    {
      let chunkCleanupCalled = false;
      const failingDoc = {
        documentId: "doc_fail_006",
        userId: userAId,
        fileName: "corrupt.pdf",
        filePath: path.join(uploadDir, "non_existent_file_path.pdf"), // missing file triggers failure
        processingStatus: "pending",
        processingProgress: 0,
        save: async function () {
          return this;
        },
      };

      const origFindOneAndUpdate = Document.findOneAndUpdate;
      Document.findOneAndUpdate = async (filter, update) => {
        Object.assign(failingDoc, update.$set);
        return failingDoc;
      };

      const origChunkDelete = TextChunk.deleteMany;
      TextChunk.deleteMany = async (filter) => {
        if (filter.documentId === failingDoc.documentId) {
          chunkCleanupCalled = true;
        }
        return { deletedCount: 0 };
      };

      await executeDocumentProcessing(failingDoc.documentId, failingDoc.userId);

      Document.findOneAndUpdate = origFindOneAndUpdate;
      TextChunk.deleteMany = origChunkDelete;

      const failedProperly =
        failingDoc.processingStatus === "failed" &&
        failingDoc.status === "failed" &&
        typeof failingDoc.processingError === "string" &&
        chunkCleanupCalled;

      recordResult(
        7,
        "Pipeline failure updates status to 'failed', cleans up chunks, and provides safe error message",
        failedProperly,
        `Status: ${failingDoc.processingStatus}, Cleaned chunks: ${chunkCleanupCalled}, Error: "${failingDoc.processingError}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 8: Retry behavior (POST /api/documents/:id/retry)
    // -------------------------------------------------------------------------
    {
      const retryDocRecord = {
        documentId: "doc_retry_007",
        userId: userAId,
        fileName: "chapter1.pdf",
        processingStatus: "failed",
        status: "failed",
        processingProgress: 25,
        processingError: "Previous transient timeout",
        retryCount: 0,
        save: async function () {
          return this;
        },
      };

      const origFindOne = Document.findOne;
      Document.findOne = (query) => {
        if (query.documentId === retryDocRecord.documentId || query.$or?.[0]?.documentId === retryDocRecord.documentId) {
          return Promise.resolve(retryDocRecord);
        }
        return Promise.resolve(null);
      };

      const origChunkDelete = TextChunk.deleteMany;
      TextChunk.deleteMany = async () => ({ deletedCount: 0 });

      const res = await dispatch(app, {
        method: "POST",
        url: `/api/documents/${retryDocRecord.documentId}/retry`,
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      Document.findOne = origFindOne;
      TextChunk.deleteMany = origChunkDelete;

      const retryAccepted =
        res.statusCode === 202 &&
        res.json?.data?.document?.processingStatus === "pending" &&
        res.json?.data?.document?.retryCount === 1 &&
        res.json?.data?.document?.processingProgress === 0;

      recordResult(
        8,
        "Retry endpoint (POST /api/documents/:id/retry) resets progress and re-queues job (HTTP 202)",
        retryAccepted,
        `Status: ${res.statusCode}, processingStatus: ${res.json?.data?.document?.processingStatus}, retryCount: ${res.json?.data?.document?.retryCount}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 9: Duplicate job prevention via atomic locking
    // -------------------------------------------------------------------------
    {
      const activeDoc = {
        documentId: "doc_duplicate_lock_008",
        userId: userAId,
        fileName: "in_flight.pdf",
        processingStatus: "processing", // already in-flight!
      };

      // When Document.findOneAndUpdate checks { processingStatus: { $in: ["pending", "failed"] } }, it fails to match
      const origFindOneAndUpdate = Document.findOneAndUpdate;
      Document.findOneAndUpdate = async (filter) => {
        // Since doc is already "processing", atomic lock query fails
        if (filter.processingStatus?.$in?.includes("processing")) {
          return activeDoc;
        }
        return null; // Locked!
      };

      const result = await executeDocumentProcessing(activeDoc.documentId, activeDoc.userId);
      Document.findOneAndUpdate = origFindOneAndUpdate;

      const duplicatePrevented = result === null;

      recordResult(
        9,
        "Atomic locking prevents duplicate background processing for in-flight documents",
        duplicatePrevented,
        `Attempting duplicate execution returned: ${result}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Document deletion cleans up chunks, files, and cancels job
    // -------------------------------------------------------------------------
    {
      const toDeleteDoc = {
        _id: "60d5ec49f1b2c82b8c8a7777",
        documentId: "doc_delete_009",
        userId: userAId,
        fileName: "temp_to_delete.pdf",
        filePath: path.join(uploadDir, "temp_deleteme.pdf"),
      };

      fs.writeFileSync(toDeleteDoc.filePath, "temporary content");

      let chunksPurged = false;
      let docRecordDeleted = false;

      const origFindOne = Document.findOne;
      Document.findOne = () => Promise.resolve(toDeleteDoc);

      const origDeleteMany = TextChunk.deleteMany;
      TextChunk.deleteMany = async (filter) => {
        if (filter.documentId === toDeleteDoc.documentId) chunksPurged = true;
        return { deletedCount: 5 };
      };

      const origDeleteOne = Document.deleteOne;
      Document.deleteOne = async () => {
        docRecordDeleted = true;
        return { deletedCount: 1 };
      };

      const res = await dispatch(app, {
        method: "DELETE",
        url: `/api/documents/${toDeleteDoc.documentId}`,
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      Document.findOne = origFindOne;
      TextChunk.deleteMany = origDeleteMany;
      Document.deleteOne = origDeleteOne;

      const fileRemoved = !fs.existsSync(toDeleteDoc.filePath);

      recordResult(
        10,
        "Document deletion safely cancels active jobs, deletes chunks, and unlinks file",
        res.statusCode === 200 && chunksPurged && docRecordDeleted && fileRemoved,
        `Status: ${res.statusCode}, Chunks purged: ${chunksPurged}, File deleted: ${fileRemoved}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: User ownership isolation enforced
    // -------------------------------------------------------------------------
    {
      const userBDoc = {
        documentId: "doc_user_b_private_010",
        userId: userBId,
        fileName: "user_b_secret.pdf",
        processingStatus: "completed",
        status: "ready",
      };

      const origFindOne = Document.findOne;
      Document.findOne = () => Promise.resolve(userBDoc);

      // User A attempts to view status of User B's document
      const statusRes = await dispatch(app, {
        method: "GET",
        url: `/api/documents/${userBDoc.documentId}/status`,
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      // User A attempts to retry User B's document
      const retryRes = await dispatch(app, {
        method: "POST",
        url: `/api/documents/${userBDoc.documentId}/retry`,
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      Document.findOne = origFindOne;

      const ownershipGuarded = statusRes.statusCode === 404 && retryRes.statusCode === 404;

      recordResult(
        11,
        "User ownership isolation strictly enforced on status and retry endpoints (HTTP 404)",
        ownershipGuarded,
        `Status check: ${statusRes.statusCode}, Retry attempt: ${retryRes.statusCode}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: Existing RAG and document workflows remain compatible
    // -------------------------------------------------------------------------
    {
      const completedDoc = {
        documentId: "doc_compat_011",
        userId: userAId,
        fileName: "cell_biology.pdf",
        subject: "Biology",
        fileSize: 1048576,
        status: "ready",
        processingStatus: "completed",
        chunkCount: 8,
      };

      const origFind = Document.find;
      Document.find = () => ({
        sort: () => Promise.resolve([completedDoc]),
      });

      const listRes = await dispatch(app, {
        method: "GET",
        url: "/api/documents",
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      Document.find = origFind;

      const docItem = listRes.json?.data?.documents?.[0];
      const hasBothStatuses =
        docItem?.status === "Ready" &&
        docItem?.processingStatus === "completed" &&
        docItem?.processingProgress === 100;

      // Also verify RAG response generation compatibility
      const ragResponse = await geminiService.generateAnswer({
        question: "What is the cell nucleus?",
        contextChunks: [{ text: "The nucleus contains genetic material.", fileName: "cell_biology.pdf", chunkIndex: 0 }],
      });

      const ragValid = !!(ragResponse && ragResponse.answer);

      recordResult(
        12,
        "Existing document listing APIs and RAG Q&A pipelines remain 100% compatible",
        listRes.statusCode === 200 && hasBothStatuses && ragValid,
        `List status: ${listRes.statusCode}, Legacy status: ${docItem?.status}, RAG Answer present: ${ragValid}`
      );
    }
  } catch (fatalErr) {
    console.error(`\n${RED}[FATAL ERROR in Phase 5.3 test runner]:${RESET}`, fatalErr);
  } finally {
    // Restore User.findOne
    User.findOne = origUserFindOne;

    // Clean up temporary test file
    if (fs.existsSync(testPdfPath)) {
      try {
        fs.unlinkSync(testPdfPath);
      } catch (_) {}
    }
  }

  // Summary
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}PHASE 5.3 TEST RESULTS SUMMARY:${RESET}`);
  console.log(`  ${GREEN}Passed:${RESET} ${passedCount} / ${passedCount + failedCount}`);
  console.log(`  ${RED}Failed:${RESET} ${failedCount} / ${passedCount + failedCount}`);
  console.log(`${BOLD}================================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase53Tests();
