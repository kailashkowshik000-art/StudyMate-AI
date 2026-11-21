/**
 * StudyMate AI - Document Queue Service (Facade)
 *
 * Bridges the legacy API and Phase 8.5 Redis + BullMQ distributed queue infrastructure.
 * Preserves 100% backward compatibility for controllers, server startup, and test suites.
 */

import {
  enqueueDocument as queueManagerEnqueue,
  retryDocument as queueManagerRetry,
  cancelDocumentJob as queueManagerCancel,
  recoverPendingJobs as queueManagerRecover,
  getQueueHealth,
} from "./queue/queueManager.js";
import {
  processDocumentPipelineExecution,
  sanitizeProcessingError,
} from "./queue/documentWorker.js";

/**
 * Enqueue a document for asynchronous processing.
 */
export function enqueueDocument(documentId, userId, options = {}) {
  return queueManagerEnqueue(documentId, userId, options);
}

/**
 * Execute document processing pipeline (synchronous / direct invocation).
 */
export async function executeDocumentProcessing(documentId, userId) {
  return await processDocumentPipelineExecution(documentId, userId);
}

/**
 * Request retry of a failed or existing document.
 */
export async function retryDocument(documentId, userId) {
  return await queueManagerRetry(documentId, userId);
}

/**
 * Cancel an in-flight background job.
 */
export function cancelDocumentJob(documentId) {
  return queueManagerCancel(documentId);
}

/**
 * Recover any documents that were pending/queued across server restart.
 */
export async function recoverPendingJobs() {
  return await queueManagerRecover();
}

export {
  getQueueHealth,
  sanitizeProcessingError,
};

export default {
  enqueueDocument,
  executeDocumentProcessing,
  retryDocument,
  cancelDocumentJob,
  recoverPendingJobs,
  getQueueHealth,
  sanitizeProcessingError,
};
