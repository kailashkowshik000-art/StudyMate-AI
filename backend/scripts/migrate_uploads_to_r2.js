/**
 * StudyMate AI - Cloudflare R2 File Migration Runner
 *
 * Safely migrates existing local uploaded documents in backend/uploads/
 * to Cloudflare R2 object storage.
 *
 * Guarantees:
 * 1. 100% preservation of all existing local files (keeps them as rollback copies).
 * 2. Idempotent execution (skips files already migrated to R2).
 * 3. Size and integrity verification post-upload before updating MongoDB records.
 * 4. Unmatched files are reported safely without modification.
 * 5. Supports dry-run simulation mode when --dry-run flag is supplied.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

// Load environment variables from backend/.env
dotenv.config({ path: path.join(backendRoot, ".env") });

import { connectDB } from "../config/db.js";
import Document from "../models/Document.js";
import { uploadDir } from "../services/fileService.js";
import { getStorageConfig } from "../services/storage/storageConfig.js";
import { R2StorageAdapter } from "../services/storage/r2StorageAdapter.js";
import {
  generateStorageKey,
  resolveDocumentMimeType,
} from "../services/storage/storageService.js";

async function runMigration() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("\n========================================================================");
  console.log(` StudyMate AI — Cloudflare R2 Document Migration ${isDryRun ? "(DRY-RUN MODE)" : ""}`);
  console.log("========================================================================\n");

  const storageConfig = getStorageConfig();
  console.log(`[Config] Target Bucket: ${storageConfig.r2.bucketName}`);
  console.log(`[Config] Endpoint: ${storageConfig.r2.endpoint || "Derived from Account ID"}`);
  console.log(`[Config] R2 Configured: ${storageConfig.isR2Configured ? "YES" : "NO (Credentials not detected)"}`);

  if (!storageConfig.isR2Configured && !isDryRun) {
    console.warn("\n⚠️  WARNING: Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not set.");
    console.warn("Running in DRY-RUN mode to audit existing files and verify database mappings.\n");
  }

  // Connect to MongoDB if not already connected
  if (mongoose.connection.readyState !== 1) {
    console.log("[Database] Connecting to MongoDB...");
    try {
      await connectDB();
      console.log("[Database] Connected successfully.\n");
    } catch (connErr) {
      console.warn(`[Database] Notice: Direct connection not established (${connErr.message}).`);
      if (!isDryRun) {
        throw connErr;
      }
      console.log("[Database] Continuing in offline dry-run audit mode...\n");
    }
  }

  let r2Adapter = null;
  if (storageConfig.isR2Configured && !isDryRun) {
    r2Adapter = new R2StorageAdapter(storageConfig.r2);
  }

  if (!fs.existsSync(uploadDir)) {
    console.error(`[Error] Uploads directory does not exist: ${uploadDir}`);
    process.exit(1);
  }

  const allEntries = fs.readdirSync(uploadDir);
  const physicalFiles = allEntries.filter((f) => {
    const fullPath = path.join(uploadDir, f);
    return fs.statSync(fullPath).isFile() && !f.startsWith(".");
  });

  console.log(`[Scan] Found ${physicalFiles.length} physical file(s) in: ${uploadDir}\n`);

  const report = {
    timestamp: new Date().toISOString(),
    isDryRun: isDryRun || !storageConfig.isR2Configured,
    totalPhysicalFiles: physicalFiles.length,
    migrated: [],
    alreadyMigrated: [],
    unmatched: [],
    failed: [],
  };

  for (const filename of physicalFiles) {
    const localFilePath = path.join(uploadDir, filename);
    const fileStats = fs.statSync(localFilePath);

    // Find matching Document in MongoDB if connected
    let doc = null;
    if (mongoose.connection.readyState === 1) {
      doc = await Document.findOne({
        $or: [
          { fileUrl: `/uploads/${filename}` },
          { filePath: { $regex: filename } },
          { fileName: filename },
        ],
      });
    }

    if (!doc) {
      console.log(`  [UNMATCHED] File on disk has no DB record: ${filename} (${(fileStats.size / 1024).toFixed(1)} KB)`);
      report.unmatched.push({
        filename,
        size: fileStats.size,
        localPath: localFilePath,
      });
      continue;
    }

    const storageKey = doc.storageKey || generateStorageKey(doc.userId, doc.documentId, doc.fileName || filename);

    // Check if already migrated
    if (doc.storageProvider === "r2" && doc.storageKey) {
      let remoteExists = false;
      if (r2Adapter) {
        remoteExists = await r2Adapter.objectExists(doc.storageKey);
      } else {
        remoteExists = true;
      }

      if (remoteExists) {
        console.log(`  [SKIPPED] Already migrated: "${doc.fileName}" -> ${doc.storageKey}`);
        report.alreadyMigrated.push({
          documentId: doc.documentId,
          fileName: doc.fileName,
          storageKey: doc.storageKey,
        });
        continue;
      }
    }

    console.log(`  [MIGRATING] "${doc.fileName}" (${(fileStats.size / 1024).toFixed(1)} KB) -> ${storageKey}`);

    if (report.isDryRun) {
      console.log(`              (Dry-Run: Skipped physical upload; would update DB record)`);
      report.migrated.push({
        documentId: doc.documentId,
        fileName: doc.fileName,
        storageKey,
        size: fileStats.size,
        dryRun: true,
      });
      continue;
    }

    try {
      const mimeType = resolveDocumentMimeType(doc.fileName || filename, doc.mimeType);
      const fileBuffer = await fs.promises.readFile(localFilePath);

      // Upload to R2
      const uploadResult = await r2Adapter.uploadObject({
        key: storageKey,
        buffer: fileBuffer,
        mimeType,
        metadata: {
          documentId: doc.documentId,
          userId: doc.userId,
          originalFilename: doc.fileName,
        },
      });

      // Verify uploaded size
      const remoteMeta = await r2Adapter.getObjectMetadata(storageKey);
      if (remoteMeta.contentLength !== fileStats.size) {
        throw new Error(
          `Integrity verification failed: uploaded size (${remoteMeta.contentLength}) does not match local file size (${fileStats.size})`
        );
      }

      // Update MongoDB record
      doc.storageProvider = "r2";
      doc.storageKey = storageKey;
      doc.originalFilename = doc.fileName;
      doc.uploadStatus = "uploaded";
      await doc.save();

      console.log(`  [SUCCESS] Migrated & verified: ${storageKey} (ETag: ${uploadResult.eTag})`);
      report.migrated.push({
        documentId: doc.documentId,
        fileName: doc.fileName,
        storageKey,
        size: fileStats.size,
        eTag: uploadResult.eTag,
      });
    } catch (err) {
      console.error(`  [FAILED] Failed migrating "${doc.fileName}":`, err.message);
      report.failed.push({
        documentId: doc.documentId,
        fileName: doc.fileName,
        error: err.message,
      });
    }
  }

  console.log("\n========================================================================");
  console.log(" MIGRATION EXECUTION SUMMARY");
  console.log("========================================================================");
  console.log(` Total Local Files Scanned: ${report.totalPhysicalFiles}`);
  console.log(` Newly Migrated:           ${report.migrated.length}`);
  console.log(` Already Migrated:          ${report.alreadyMigrated.length}`);
  console.log(` Unmatched Local Files:     ${report.unmatched.length} (preserved untouched)`);
  console.log(` Failed Migrations:         ${report.failed.length}`);
  console.log("========================================================================\n");

  return report;
}

// Execute if run directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration()
    .then(() => {
      console.log("[Migration] Finished. Exiting safely.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Migration] Fatal error:", err);
      process.exit(1);
    });
}

export { runMigration };
export default runMigration;
