/**
 * StudyMate AI - Distributed Queue Configuration
 */

export const DOCUMENT_QUEUE_NAME = "studymate-document-processing";

export const PROCESSING_STAGES = {
  QUEUED: "queued",
  PROCESSING: "processing",
  EXTRACTING: "extracting",
  CHUNKING: "chunking",
  EMBEDDINGS: "generating_embeddings",
  INDEXING: "indexing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const PROCESSING_STATUSES = {
  PENDING: "pending",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const DEFAULT_QUEUE_OPTIONS = {
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 2,
  maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES, 10) || 3,
  backoffDelay: parseInt(process.env.QUEUE_BACKOFF_DELAY, 10) || 5000,
  defaultJobOptions: {
    attempts: parseInt(process.env.QUEUE_MAX_RETRIES, 10) || 3,
    backoff: {
      type: "exponential",
      delay: parseInt(process.env.QUEUE_BACKOFF_DELAY, 10) || 5000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // keep for 24h
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // keep for 7 days
    },
  },
};

export default {
  DOCUMENT_QUEUE_NAME,
  PROCESSING_STAGES,
  PROCESSING_STATUSES,
  DEFAULT_QUEUE_OPTIONS,
};
