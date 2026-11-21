/**
 * StudyMate AI - Local Filesystem Storage Adapter
 *
 * Provides a local filesystem implementation conforming to the object storage interface.
 * Used for development and test environments without requiring external cloud accounts.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultUploadDir = path.resolve(__dirname, "../../uploads");

export class LocalStorageAdapter {
  constructor(baseDir = defaultUploadDir) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Resolves a storage key to an absolute local filesystem path safely
   */
  resolvePath(key) {
    if (!key || typeof key !== "string") {
      throw new Error("Storage key must be a non-empty string");
    }
    // Prevent directory traversal attacks
    const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (normalizedKey.includes("..")) {
      throw new Error(`Invalid storage key: directory traversal prohibited in "${key}"`);
    }
    return path.join(this.baseDir, normalizedKey);
  }

  /**
   * Upload an object to local storage
   */
  async uploadObject({ key, buffer, stream, filePath, mimeType, metadata = {} }) {
    const targetPath = this.resolvePath(key);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (buffer) {
      await fs.promises.writeFile(targetPath, buffer);
    } else if (filePath && fs.existsSync(filePath)) {
      if (path.resolve(filePath) !== path.resolve(targetPath)) {
        await fs.promises.copyFile(filePath, targetPath);
      }
    } else if (stream) {
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(targetPath);
        stream.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } else {
      throw new Error("No data provided to uploadObject (expected buffer, stream, or filePath)");
    }

    const stats = await fs.promises.stat(targetPath);
    const hash = crypto.createHash("md5").update(key).digest("hex");

    return {
      provider: "local",
      key,
      size: stats.size,
      eTag: `"${hash}"`,
      localPath: targetPath,
      mimeType: mimeType || "application/octet-stream",
      metadata,
    };
  }

  /**
   * Check if object exists in local storage
   */
  async objectExists(key) {
    try {
      const targetPath = this.resolvePath(key);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }

  /**
   * Retrieve object buffer and metadata
   */
  async getObject(key) {
    const targetPath = this.resolvePath(key);
    if (!fs.existsSync(targetPath)) {
      const error = new Error(`Object not found in local storage: ${key}`);
      error.code = "NoSuchKey";
      error.status = 404;
      throw error;
    }

    const buffer = await fs.promises.readFile(targetPath);
    const stats = await fs.promises.stat(targetPath);

    return {
      Body: buffer,
      ContentLength: stats.size,
      LastModified: stats.mtime,
      ContentType: "application/octet-stream",
      localPath: targetPath,
    };
  }

  /**
   * Get readable stream for object
   */
  async getObjectStream(key) {
    const targetPath = this.resolvePath(key);
    if (!fs.existsSync(targetPath)) {
      const error = new Error(`Object not found in local storage: ${key}`);
      error.code = "NoSuchKey";
      error.status = 404;
      throw error;
    }

    return fs.createReadStream(targetPath);
  }

  /**
   * Retrieve object metadata without loading full content
   */
  async getObjectMetadata(key) {
    const targetPath = this.resolvePath(key);
    if (!fs.existsSync(targetPath)) {
      const error = new Error(`Object not found in local storage: ${key}`);
      error.code = "NoSuchKey";
      error.status = 404;
      throw error;
    }

    const stats = await fs.promises.stat(targetPath);
    return {
      contentLength: stats.size,
      lastModified: stats.mtime,
      localPath: targetPath,
      metadata: {},
    };
  }

  /**
   * Delete object from local storage
   */
  async deleteObject(key) {
    try {
      const targetPath = this.resolvePath(key);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[LocalStorage] Failed to delete object ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Generate download URL for local development
   */
  async getPresignedDownloadUrl({ key, originalFilename, mimeType, expiresIn = 3600 }) {
    const safeKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    const baseName = path.basename(safeKey);
    // In local development, return local authenticated download path
    return `/uploads/${encodeURIComponent(baseName)}`;
  }
}

export default LocalStorageAdapter;
