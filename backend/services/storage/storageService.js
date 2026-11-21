/**
 * StudyMate AI - Unified Storage Service
 *
 * Facade orchestrating Cloudflare R2 and Local Storage adapters.
 * Manages document uploads, presigned download URLs, temporary pipeline staging,
 * and automated deletion with full tenancy isolation.
 */

import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { getStorageConfig } from "./storageConfig.js";
import { LocalStorageAdapter } from "./localStorageAdapter.js";
import { R2StorageAdapter } from "./r2StorageAdapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultUploadDir = path.resolve(__dirname, "../../uploads");

let storageAdapterInstance = null;
let currentProviderName = null;

/**
 * MIME type resolver for supported educational document formats
 */
export function resolveDocumentMimeType(fileNameOrPath, fallbackMime = null) {
  if (fallbackMime && fallbackMime !== "application/octet-stream") {
    return fallbackMime;
  }
  const ext = path.extname(fileNameOrPath || "").toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return fallbackMime || "application/octet-stream";
  }
}

/**
 * Standardized storage key generator ensuring multi-tenant isolation
 * Format: users/{userId}/documents/{documentId}/{sanitizedFilename}
 */
export function generateStorageKey(userId, documentId, originalFilename) {
  const safeUserId = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDocId = String(documentId || "doc").replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseName = path.basename(originalFilename || "document");
  const safeFilename = baseName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `users/${safeUserId}/documents/${safeDocId}/${safeFilename}`;
}

/**
 * Retrieves the initialized storage adapter based on configuration
 */
export function getStorageAdapter(overrideConfig = null) {
  if (overrideConfig) {
    if (overrideConfig.provider === "r2") {
      return new R2StorageAdapter(overrideConfig.r2 || overrideConfig);
    }
    return new LocalStorageAdapter(overrideConfig.baseDir || defaultUploadDir);
  }

  const config = getStorageConfig();

  // Return cached singleton if provider hasn't changed
  if (storageAdapterInstance && currentProviderName === config.provider) {
    return storageAdapterInstance;
  }

  if (config.provider === "r2") {
    console.log(`[StorageService] Initializing Cloudflare R2 Storage Adapter (Bucket: ${config.r2.bucketName})`);
    storageAdapterInstance = new R2StorageAdapter(config.r2);
    currentProviderName = "r2";
  } else {
    console.log(`[StorageService] Initializing Local Storage Adapter (Directory: ${defaultUploadDir})`);
    storageAdapterInstance = new LocalStorageAdapter(defaultUploadDir);
    currentProviderName = "local";
  }

  return storageAdapterInstance;
}

/**
 * Get active storage provider name ("r2" | "local")
 */
export function getStorageProviderName() {
  const config = getStorageConfig();
  return config.provider;
}

/**
 * Upload a document to the active storage provider
 */
export async function uploadDocumentFile({
  userId,
  documentId,
  originalFilename,
  filePath,
  buffer,
  stream,
  mimeType,
}) {
  const adapter = getStorageAdapter();
  const provider = getStorageProviderName();
  const resolvedMime = resolveDocumentMimeType(originalFilename || filePath, mimeType);
  const storageKey = generateStorageKey(userId, documentId, originalFilename);

  console.log(`[StorageService] Uploading document to [${provider}]: ${storageKey}`);

  const result = await adapter.uploadObject({
    key: storageKey,
    filePath,
    buffer,
    stream,
    mimeType: resolvedMime,
    metadata: {
      userId,
      documentId,
      originalFilename,
    },
  });

  return {
    storageProvider: provider,
    storageKey,
    fileSize: result.size,
    originalFilename,
    mimeType: resolvedMime,
    eTag: result.eTag,
  };
}

/**
 * Generate a short-lived presigned download URL for an authenticated user
 */
export async function getSecureDownloadUrl(document, expiresIn = 3600) {
  if (!document) {
    throw new Error("Document object is required to generate download URL");
  }

  const provider = document.storageProvider || getStorageProviderName();
  const adapter = provider === "r2" ? getStorageAdapter({ provider: "r2" }) : getStorageAdapter({ provider: "local" });

  const storageKey = document.storageKey || path.basename(document.filePath || document.fileUrl);
  const originalFilename = document.originalFilename || document.fileName || path.basename(storageKey);
  const mimeType = resolveDocumentMimeType(originalFilename, document.mimeType);

  return await adapter.getPresignedDownloadUrl({
    key: storageKey,
    originalFilename,
    mimeType,
    expiresIn,
  });
}

/**
 * Retrieve document stream or download remote object to temporary local file
 * for pipeline processing (PDF/DOCX/PPTX/TXT extraction)
 *
 * Guarantees that workers can process files regardless of whether the file
 * was freshly uploaded locally or retrieved from remote cloud storage.
 */
export async function stageDocumentForProcessing(document) {
  // If local file exists, use directly
  if (document.filePath && fs.existsSync(document.filePath)) {
    return {
      filePath: document.filePath,
      cleanup: async () => {}, // No-op: do not delete original local upload
      isTemporary: false,
    };
  }

  // If stored in cloud (or local file missing), retrieve from storage adapter
  const provider = document.storageProvider || getStorageProviderName();
  const adapter = provider === "r2" ? getStorageAdapter({ provider: "r2" }) : getStorageAdapter({ provider: "local" });
  const storageKey = document.storageKey || path.basename(document.filePath || document.fileUrl);

  const stagingDir = path.join(os.tmpdir(), "studymate_processing");
  if (!fs.existsSync(stagingDir)) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  const safeFilename = path.basename(document.fileName || storageKey);
  const tempPath = path.join(stagingDir, `stage_${Date.now()}_${safeFilename}`);

  console.log(`[StorageService] Staging remote document ${storageKey} to temporary path: ${tempPath}`);

  const obj = await adapter.getObject(storageKey);
  await fs.promises.writeFile(tempPath, obj.Body);

  return {
    filePath: tempPath,
    cleanup: async () => {
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (err) {
        console.warn(`[StorageService] Failed to clean up temp staging file ${tempPath}:`, err.message);
      }
    },
    isTemporary: true,
  };
}

/**
 * Delete a document from storage
 */
export async function deleteDocumentFromStorage(document) {
  if (!document) return;

  const provider = document.storageProvider || getStorageProviderName();
  const adapter = provider === "r2" ? getStorageAdapter({ provider: "r2" }) : getStorageAdapter({ provider: "local" });
  const storageKey = document.storageKey || path.basename(document.filePath || document.fileUrl);

  try {
    if (storageKey) {
      await adapter.deleteObject(storageKey);
    }
  } catch (err) {
    console.warn(`[StorageService] Failed to delete storage object ${storageKey}:`, err.message);
  }

  // Also clean up local file if present
  if (document.filePath && fs.existsSync(document.filePath)) {
    try {
      await fs.promises.unlink(document.filePath);
    } catch {}
  }
}

export default {
  getStorageConfig,
  getStorageAdapter,
  getStorageProviderName,
  generateStorageKey,
  resolveDocumentMimeType,
  uploadDocumentFile,
  getSecureDownloadUrl,
  stageDocumentForProcessing,
  deleteDocumentFromStorage,
};
