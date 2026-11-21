/**
 * StudyMate AI - BullMQ Document Processing Producer
 *
 * Dispatches document parsing, chunking, and vector embedding jobs
 * to Redis with idempotent job IDs and exponential backoff.
 */

import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "../../config/redisConfig.js";
import { DOCUMENT_QUEUE_NAME, DEFAULT_QUEUE_OPTIONS, PROCESSING_STAGES, PROCESSING_STATUSES } from "./queueConfig.js";
import Document from "../../models/Document.js";

let queueInstance = null;

/**
 * Returns the singleton BullMQ Queue instance.
 */
export function getDocumentQueue() {
  if (!queueInstance) {
    const connection = getRedisConnectionOptions();
    queueInstance = new Queue(DOCUMENT_QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_QUEUE_OPTIONS.defaultJobOptions,
    });

    queueInstance.on("error", (err) => {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[BullMQ DocumentQueue] Redis error:`, err.message);
      }
    });
  }
  return queueInstance;
}

/**
 * Dispatches a document processing job to the distributed queue.
 * Strictly avoids placing file buffers or credentials into the payload.
 */
export async function addDocumentJob(documentId, userId, options = {}) {
  const queue = getDocumentQueue();
  const retryCount = options.retryCount || 0;

  // Stable, deterministic job ID prevents duplicate concurrent jobs for the same document
  const jobId = `job_${documentId}_r${retryCount}`;

  // Check if job already active or waiting in BullMQ
  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "active" || state === "waiting" || state === "delayed") {
      console.log(`[DocumentQueue] Job ${jobId} is already in state "${state}". Skipping enqueue.`);
      return existingJob;
    }
  }

  // Sanitized payload: ONLY metadata references, NO raw file contents or secrets
  const jobPayload = {
    jobId,
    documentId,
    userId,
    format: options.format || "pdf",
    fileName: options.fileName || "document",
    processingStage: PROCESSING_STAGES.QUEUED,
    retryCount,
    enqueuedAt: new Date().toISOString(),
  };

  const job = await queue.add("process-document", jobPayload, {
    jobId,
    attempts: DEFAULT_QUEUE_OPTIONS.defaultJobOptions.attempts,
    backoff: DEFAULT_QUEUE_OPTIONS.defaultJobOptions.backoff,
  });

  // Update Document state in MongoDB
  try {
    await Document.updateOne(
      { documentId },
      {
        $set: {
          jobId,
          processingStatus: PROCESSING_STATUSES.QUEUED,
          processingStage: PROCESSING_STAGES.QUEUED,
          processingProgress: 5,
          processingError: null,
          errorMessage: null,
        },
      }
    );
  } catch (dbErr) {
    console.warn(`[DocumentQueue] Failed to update Document ${documentId} with jobId:`, dbErr.message);
  }

  return job;
}

/**
 * Retrieve queue health metrics for operational monitoring.
 */
export async function getQueueMetrics() {
  const queue = getDocumentQueue();
  try {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
    return {
      name: DOCUMENT_QUEUE_NAME,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    };
  } catch (err) {
    return {
      name: DOCUMENT_QUEUE_NAME,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      error: err.message,
    };
  }
}

/**
 * Cancel a job if in-flight or waiting in BullMQ.
 */
export async function cancelDocumentJobInQueue(documentId) {
  const queue = getDocumentQueue();
  try {
    // Check pending/active jobs
    const jobs = await queue.getJobs(["waiting", "delayed", "active"]);
    for (const job of jobs) {
      if (job.data && job.data.documentId === documentId) {
        await job.remove();
        console.log(`[DocumentQueue] Removed job ${job.id} for document ${documentId}`);
      }
    }
  } catch (err) {
    console.warn(`[DocumentQueue] Could not remove BullMQ job for ${documentId}:`, err.message);
  }
}

/**
 * Gracefully closes the BullMQ Queue and releases connections.
 */
export async function closeDocumentQueue() {
  if (queueInstance) {
    try {
      await queueInstance.close();
    } catch {}
    queueInstance = null;
  }
}

export default {
  getDocumentQueue,
  addDocumentJob,
  getQueueMetrics,
  cancelDocumentJobInQueue,
  closeDocumentQueue,
};
