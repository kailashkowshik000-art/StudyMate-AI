/**
 * StudyMate AI - Distributed Queue Manager & Lifecycle Orchestrator
 *
 * Provides a unified facade for BullMQ dispatch, worker execution,
 * failure recovery, queue metrics, and seamless backward-compatibility.
 */

import { getRedisConfig, createRedisClient, getSanitizedRedisInfo } from "../../config/redisConfig.js";
import { addDocumentJob, getQueueMetrics, cancelDocumentJobInQueue, closeDocumentQueue } from "./documentQueue.js";
import {
  startDocumentWorker,
  processDocumentPipelineExecution,
  cancelDocumentWorkerJob,
  getWorkerStatus,
  closeDocumentWorker,
} from "./documentWorker.js";
import Document from "../../models/Document.js";
import TextChunk from "../../models/TextChunk.js";
import { PROCESSING_STAGES, PROCESSING_STATUSES } from "./queueConfig.js";

let redisAvailable = false;
let redisClientCheck = null;
let isInitialized = false;

/**
 * Probes whether the Redis server is responsive.
 */
export async function checkRedisHealth() {
  if (process.env.NODE_ENV === "test" && !process.env.REDIS_TEST_LIVE) {
    return {
      connected: false,
      status: "test_environment",
      message: "Live Redis socket probe bypassed in unit test execution environment",
    };
  }

  try {
    if (!redisClientCheck) {
      redisClientCheck = createRedisClient({
        connectTimeout: 1000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
      });
    }
    const pong = await Promise.race([
      redisClientCheck.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timeout")), 1500)),
    ]);
    redisAvailable = pong === "PONG";
    return {
      connected: redisAvailable,
      status: "connected",
      message: "Redis is healthy and responding",
    };
  } catch (err) {
    redisAvailable = false;
    return {
      connected: false,
      status: "disconnected",
      message: err.message,
    };
  }
}

/**
 * Initializes Redis + BullMQ Queue and Worker.
 * Enforces production safeguards: in production, Redis MUST be operational.
 */
export async function initializeQueue() {
  if (isInitialized) return;

  const config = getRedisConfig();

  if (config.isProduction) {
    console.log("[QueueManager] Production environment detected. Verifying Redis requirement...");
    const health = await checkRedisHealth();
    if (!health.connected) {
      const fatalMsg =
        "FATAL CONFIGURATION ERROR: Redis is required for production distributed document processing, but connection failed: " +
        health.message;
      console.error(`[QueueManager] ${fatalMsg}`);
      throw new Error(fatalMsg);
    }
    startDocumentWorker();
    isInitialized = true;
    console.log("[QueueManager] BullMQ Document Worker successfully started in production mode.");
    return;
  }

  // Development / Test mode: probe Redis availability
  if (process.env.NODE_ENV !== "test") {
    const health = await checkRedisHealth();
    if (health.connected) {
      startDocumentWorker();
      console.log("[QueueManager] Connected to Redis. BullMQ distributed worker active.");
    } else {
      console.log(
        "[QueueManager] Redis not connected. Operating in local asynchronous runner mode."
      );
    }
  }

  isInitialized = true;
}

/**
 * Enqueue a document for asynchronous processing.
 * Dispatches via BullMQ when Redis is available, or executes via local async runner.
 */
export async function enqueueDocument(documentId, userId, options = {}) {
  // If Redis is active and connected, dispatch to BullMQ
  if (redisAvailable) {
    try {
      return await addDocumentJob(documentId, userId, options);
    } catch (err) {
      console.warn(`[QueueManager] BullMQ dispatch failed, falling back to local runner:`, err.message);
    }
  }

  // Local asynchronous runner (development / offline fallback)
  // Ensures state is set to queued/processing immediately
  try {
    await Document.updateOne(
      { documentId },
      {
        $set: {
          processingStatus: PROCESSING_STATUSES.QUEUED,
          processingStage: PROCESSING_STAGES.QUEUED,
          processingProgress: 5,
        },
      }
    );
  } catch {}

  setImmediate(async () => {
    try {
      await processDocumentPipelineExecution(documentId, userId);
    } catch (err) {
      console.error(`[QueueManager] Local runner execution failed for ${documentId}:`, err.message);
    }
  });
}

/**
 * Request retry of a failed or completed document.
 */
export async function retryDocument(documentId, userId) {
  const document = await Document.findOne({ documentId, userId });
  if (!document) {
    return null;
  }

  if (document.processingStatus === "processing") {
    const error = new Error("Document is already processing. Please wait for the current job to finish.");
    error.status = 409;
    throw error;
  }

  const newRetryCount = (document.retryCount || 0) + 1;

  document.processingStatus = PROCESSING_STATUSES.QUEUED;
  document.processingStage = PROCESSING_STAGES.QUEUED;
  document.status = "uploaded";
  document.processingProgress = 0;
  document.processingError = null;
  document.errorMessage = null;
  document.retryCount = newRetryCount;
  document.jobId = `job_${documentId}_r${newRetryCount}`;
  await document.save();

  // Purge any residual chunks to ensure idempotency
  await TextChunk.deleteMany({ documentId, userId });

  await enqueueDocument(documentId, userId, {
    retryCount: newRetryCount,
    format: document.format,
    fileName: document.fileName,
  });

  return document;
}

/**
 * Cancels an in-flight background job.
 */
export async function cancelDocumentJob(documentId) {
  cancelDocumentWorkerJob(documentId);
  if (redisAvailable) {
    await cancelDocumentJobInQueue(documentId);
  }
}

/**
 * Recovers pending or interrupted jobs across server restarts.
 */
export async function recoverPendingJobs() {
  try {
    const interruptedDocs = await Document.find({
      processingStatus: { $in: ["pending", "queued", "processing"] },
    });

    if (interruptedDocs.length > 0) {
      console.log(`[QueueManager] Recovering ${interruptedDocs.length} pending/interrupted document jobs...`);
      for (const doc of interruptedDocs) {
        doc.processingStatus = PROCESSING_STATUSES.QUEUED;
        doc.processingStage = PROCESSING_STAGES.QUEUED;
        doc.processingProgress = 0;
        await doc.save();
        await enqueueDocument(doc.documentId, doc.userId, {
          retryCount: doc.retryCount || 0,
          format: doc.format,
          fileName: doc.fileName,
        });
      }
    }
  } catch (err) {
    console.warn(`[QueueManager] Failed to recover pending jobs on startup:`, err.message);
  }
}

/**
 * Aggregates complete operational queue health metrics for monitoring and readiness probes.
 * Never exposes credentials.
 */
export async function getQueueHealth() {
  const redisInfo = getSanitizedRedisInfo();
  let redisCheck;
  try {
    redisCheck = await checkRedisHealth();
  } catch (err) {
    redisCheck = { connected: false, status: "disconnected", message: err.message };
  }

  let queueMetrics = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  };

  if (redisCheck.connected) {
    try {
      queueMetrics = await getQueueMetrics();
    } catch {}
  }

  const workerStatus = getWorkerStatus();

  return {
    status: redisCheck.connected ? "healthy" : "degraded",
    redis: {
      connected: redisCheck.connected,
      host: redisInfo.host,
      port: redisInfo.port,
      tls: redisInfo.tls,
      isConfigured: redisInfo.isConfigured,
    },
    queue: {
      name: "studymate-document-processing",
      ...queueMetrics,
    },
    worker: {
      active: workerStatus.isRunning,
      concurrency: workerStatus.concurrency,
      activeLocalWorkers: workerStatus.activeLocalWorkersCount,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Gracefully shuts down all workers, queue producers, and Redis connections.
 */
export async function shutdownQueue() {
  try {
    await closeDocumentWorker();
    await closeDocumentQueue();
    if (redisClientCheck) {
      await redisClientCheck.quit().catch(() => {});
      redisClientCheck = null;
    }
  } catch {}
  isInitialized = false;
  redisAvailable = false;
}

export default {
  initializeQueue,
  enqueueDocument,
  retryDocument,
  cancelDocumentJob,
  recoverPendingJobs,
  getQueueHealth,
  shutdownQueue,
  checkRedisHealth,
};
