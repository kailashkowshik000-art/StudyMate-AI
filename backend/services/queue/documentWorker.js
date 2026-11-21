/**
 * StudyMate AI - BullMQ Distributed Document Worker
 *
 * Consumes document processing jobs from Redis, executing multi-format text extraction,
 * semantic chunking, vector embedding generation, and atomic indexing.
 */

import fs from "fs";
import { Worker } from "bullmq";
import { getRedisConnectionOptions } from "../../config/redisConfig.js";
import { DOCUMENT_QUEUE_NAME, DEFAULT_QUEUE_OPTIONS, PROCESSING_STAGES, PROCESSING_STATUSES } from "./queueConfig.js";
import Document from "../../models/Document.js";
import TextChunk from "../../models/TextChunk.js";
import { extractDocumentContent } from "../documentExtractorService.js";
import { createChunks } from "../chunkService.js";
import { generateEmbeddings } from "../embeddingService.js";
import { recordActivity } from "../learningAnalyticsService.js";
import { stageDocumentForProcessing } from "../storage/storageService.js";

let workerInstance = null;
const activeLocalWorkers = new Set();
const cancelledJobIds = new Set();

/**
 * Redacts credentials and server filesystem paths from worker logs and document records.
 */
export function sanitizeProcessingError(msg) {
  if (!msg || typeof msg !== "string") {
    return "Failed to process document text and vector embeddings";
  }
  return msg
    .replace(/AIza[0-9A-Za-z-_]{30,45}/g, "[REDACTED_API_KEY]")
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URI]")
    .replace(/redis(?:\+tls)?:\/\/[^\s"']+/gi, "[REDACTED_REDIS_URI]")
    .replace(/[A-Za-z]:\\[^"'\n\r]+/g, "[REDACTED_PATH]")
    .replace(/(?:\/[a-zA-Z0-9._-]+){3,}/g, "[REDACTED_PATH]");
}

/**
 * Core document processing logic executed by both BullMQ Worker and local fallback runner.
 */
export async function processDocumentPipelineExecution(documentId, userId, jobContext = null) {
  if (activeLocalWorkers.has(documentId)) {
    console.log(`[DocumentWorker] Document ${documentId} is already in-flight locally. Skipping duplicate.`);
    return null;
  }

  activeLocalWorkers.add(documentId);
  cancelledJobIds.delete(documentId);

  // Atomic state acquisition in MongoDB
  const document = await Document.findOneAndUpdate(
    {
      documentId,
      processingStatus: { $in: ["pending", "queued", "processing", "failed"] },
    },
    {
      $set: {
        processingStatus: PROCESSING_STATUSES.PROCESSING,
        processingStage: PROCESSING_STAGES.PROCESSING,
        status: "processing",
        processingProgress: 10,
        processingStartedAt: new Date(),
        processingError: null,
        errorMessage: null,
      },
    },
    { new: true }
  );

  if (!document) {
    console.log(`[DocumentWorker] Document ${documentId} not eligible or already completed. Skipping.`);
    activeLocalWorkers.delete(documentId);
    return null;
  }

  let staged = null;

  try {
    if (cancelledJobIds.has(documentId)) {
      throw new Error("Job was cancelled before execution completed");
    }

    // Step 1: File Retrieval & Staging (Local disk or Cloudflare R2 download)
    staged = await stageDocumentForProcessing(document);
    const safePath = staged.filePath;
    if (!fs.existsSync(safePath)) {
      throw new Error("Document file could not be found or retrieved for processing");
    }

    // Step 2: Format-specific Text Extraction
    if (jobContext?.updateProgress) await jobContext.updateProgress(25);
    await Document.updateOne(
      { documentId },
      {
        $set: {
          processingStage: PROCESSING_STAGES.EXTRACTING,
          processingProgress: 25,
        },
      }
    );

    const extraction = await extractDocumentContent(safePath, document.format);
    const { fullText, pages, format, pageCount, slideCount, wordCount, metadata } = extraction;

    if (cancelledJobIds.has(documentId)) {
      throw new Error("Job was cancelled during text extraction");
    }

    // Step 3: Semantic Chunking
    if (jobContext?.updateProgress) await jobContext.updateProgress(50);
    await Document.updateOne(
      { documentId },
      {
        $set: {
          processingStage: PROCESSING_STAGES.CHUNKING,
          processingProgress: 50,
        },
      }
    );

    const chunks = createChunks({
      pages,
      fullText,
      documentId: document.documentId,
      userId: document.userId,
    });

    if (!chunks || chunks.length === 0) {
      throw new Error(
        `Could not extract any readable text chunks from this ${(format || document.format || "document").toUpperCase()} document`
      );
    }

    if (cancelledJobIds.has(documentId)) {
      throw new Error("Job was cancelled during chunking");
    }

    // Step 4: Vector Embeddings Generation
    if (jobContext?.updateProgress) await jobContext.updateProgress(75);
    await Document.updateOne(
      { documentId },
      {
        $set: {
          processingStage: PROCESSING_STAGES.EMBEDDINGS,
          processingProgress: 75,
        },
      }
    );

    const chunksWithEmbeddings = await generateEmbeddings(chunks);

    if (cancelledJobIds.has(documentId)) {
      throw new Error("Job was cancelled during embedding generation");
    }

    // Step 5: Atomic Vector Storage & Indexing (Purge previous chunks to prevent duplicate vectors)
    if (jobContext?.updateProgress) await jobContext.updateProgress(90);
    await Document.updateOne(
      { documentId },
      {
        $set: {
          processingStage: PROCESSING_STAGES.INDEXING,
          processingProgress: 90,
        },
      }
    );

    await TextChunk.deleteMany({
      documentId: document.documentId,
      userId: document.userId,
    });

    await TextChunk.insertMany(chunksWithEmbeddings);

    // Step 6: Mark Successfully Completed
    document.processingStatus = PROCESSING_STATUSES.COMPLETED;
    document.processingStage = PROCESSING_STAGES.COMPLETED;
    document.status = "ready";
    document.processingProgress = 100;
    document.chunkCount = chunksWithEmbeddings.length;
    document.processedAt = new Date();
    document.processingCompletedAt = new Date();
    document.processingError = null;
    document.errorMessage = null;
    document.format = format || document.format || "pdf";
    if (typeof pageCount === "number") document.pageCount = pageCount;
    if (typeof slideCount === "number") document.slideCount = slideCount;
    if (typeof wordCount === "number") document.wordCount = wordCount;
    if (metadata) document.extractionMetadata = metadata;
    document.extractionStatus = "completed";
    await document.save();

    if (jobContext?.updateProgress) await jobContext.updateProgress(100);

    console.log(
      `[DocumentWorker] Successfully completed "${document.fileName}" (${chunksWithEmbeddings.length} chunks generated)`
    );

    // Step 7: Record Learning Analytics Activity (non-blocking)
    recordActivity({
      userId: document.userId,
      documentId: document.documentId,
      activityType: "document_read",
      topic: document.subject || document.fileName,
      duration: 10,
      metadata: { chunkCount: document.chunkCount },
    }).catch((actErr) => {
      console.warn(`[DocumentWorker] Failed to record study activity:`, actErr.message);
    });

    return document;
  } catch (err) {
    console.error(`[DocumentWorker] Processing failed for ${documentId}:`, err.message);

    // Clean up partial chunks on failure to maintain vector store integrity
    try {
      await TextChunk.deleteMany({
        documentId: document.documentId,
        userId: document.userId,
      });
    } catch (cleanupErr) {
      console.warn(`[DocumentWorker] Failed to cleanup chunks after failure:`, cleanupErr.message);
    }

    const safeError = sanitizeProcessingError(err.message);
    const isCancelled = cancelledJobIds.has(documentId);

    document.processingStatus = isCancelled ? PROCESSING_STATUSES.CANCELLED : PROCESSING_STATUSES.FAILED;
    document.processingStage = isCancelled ? PROCESSING_STAGES.CANCELLED : PROCESSING_STAGES.FAILED;
    document.status = isCancelled ? "uploaded" : "failed";
    document.processingError = safeError;
    document.errorMessage = safeError;
    document.chunkCount = 0;
    await document.save();

    throw err;
  } finally {
    if (staged && typeof staged.cleanup === "function") {
      try {
        await staged.cleanup();
      } catch {}
    }
    activeLocalWorkers.delete(documentId);
    cancelledJobIds.delete(documentId);
  }
}

/**
 * Initializes and starts the BullMQ Worker.
 */
export function startDocumentWorker() {
  if (workerInstance) {
    return workerInstance;
  }

  const connection = getRedisConnectionOptions();

  workerInstance = new Worker(
    DOCUMENT_QUEUE_NAME,
    async (job) => {
      console.log(`[DocumentWorker] Processing job ${job.id} for document ${job.data.documentId}`);
      return await processDocumentPipelineExecution(job.data.documentId, job.data.userId, job);
    },
    {
      connection,
      concurrency: DEFAULT_QUEUE_OPTIONS.concurrency,
      stalledInterval: 30000,
      maxStalledCount: 2,
    }
  );

  workerInstance.on("completed", (job) => {
    console.log(`[DocumentWorker] Job ${job.id} successfully completed`);
  });

  workerInstance.on("failed", (job, err) => {
    const attemptsMade = job?.attemptsMade || 0;
    const maxAttempts = job?.opts?.attempts || 3;
    console.warn(
      `[DocumentWorker] Job ${job?.id} failed (attempt ${attemptsMade}/${maxAttempts}): ${err.message}`
    );
  });

  workerInstance.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[DocumentWorker] Worker error: ${err.message}`);
    }
  });

  return workerInstance;
}

/**
 * Flags an in-flight job for immediate cancellation.
 */
export function cancelDocumentWorkerJob(documentId) {
  cancelledJobIds.add(documentId);
}

/**
 * Returns worker active status and concurrency info.
 */
export function getWorkerStatus() {
  return {
    isRunning: Boolean(workerInstance && !workerInstance.isPaused()),
    concurrency: DEFAULT_QUEUE_OPTIONS.concurrency,
    activeLocalWorkersCount: activeLocalWorkers.size,
  };
}

/**
 * Gracefully terminates the BullMQ Worker.
 */
export async function closeDocumentWorker() {
  if (workerInstance) {
    try {
      await workerInstance.close();
    } catch {}
    workerInstance = null;
  }
}

export default {
  startDocumentWorker,
  processDocumentPipelineExecution,
  cancelDocumentWorkerJob,
  getWorkerStatus,
  closeDocumentWorker,
  sanitizeProcessingError,
};
