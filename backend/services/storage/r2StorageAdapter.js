/**
 * StudyMate AI - Cloudflare R2 / S3-Compatible Storage Adapter
 *
 * Implements persistent cloud object storage using @aws-sdk/client-s3 and
 * @aws-sdk/s3-request-presigner. Configured for Cloudflare R2 endpoints with
 * private bucket enforcement and short-lived presigned URLs.
 */

import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class R2StorageAdapter {
  constructor(config = {}) {
    this.bucketName = config.bucketName || process.env.R2_BUCKET_NAME || "studymate-documents";
    this.publicUrl = config.publicUrl || process.env.R2_PUBLIC_URL || "";
    this.endpoint =
      config.endpoint ||
      process.env.R2_ENDPOINT ||
      (config.accountId
        ? `https://${config.accountId}.r2.cloudflarestorage.com`
        : process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : "");

    const accessKeyId = config.accessKeyId || process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || "";

    // Allow mock/injected client for testing or instantiate live AWS S3 client
    if (config.s3Client) {
      this.client = config.s3Client;
    } else {
      this.client = new S3Client({
        region: "auto",
        endpoint: this.endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  /**
   * Upload an object to Cloudflare R2 bucket
   */
  async uploadObject({ key, buffer, stream, filePath, mimeType, metadata = {} }) {
    if (!key || typeof key !== "string") {
      throw new Error("Storage key is required for R2 upload");
    }

    let body;
    let contentLength;

    if (buffer) {
      body = buffer;
      contentLength = buffer.length;
    } else if (filePath && fs.existsSync(filePath)) {
      body = fs.createReadStream(filePath);
      const stat = await fs.promises.stat(filePath);
      contentLength = stat.size;
    } else if (stream) {
      body = stream;
    } else {
      throw new Error("No data payload provided (expected buffer, stream, or valid filePath)");
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: mimeType || "application/octet-stream",
      ContentLength: contentLength,
      Metadata: Object.entries(metadata).reduce((acc, [k, v]) => {
        acc[k.toLowerCase()] = String(v);
        return acc;
      }, {}),
    });

    const response = await this.client.send(command);

    return {
      provider: "r2",
      bucket: this.bucketName,
      key,
      size: contentLength,
      eTag: response.ETag,
      mimeType: mimeType || "application/octet-stream",
      metadata,
    };
  }

  /**
   * Check if object exists in R2 bucket
   */
  async objectExists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (
        err.name === "NotFound" ||
        err.$metadata?.httpStatusCode === 404 ||
        err.code === "NoSuchKey" ||
        err.code === "NotFound"
      ) {
        return false;
      }
      // If error is network or authorization, log and bubble or return false
      console.warn(`[R2StorageAdapter] Error checking existence for ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Retrieve object stream from R2
   */
  async getObjectStream(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);
    return response.Body;
  }

  /**
   * Retrieve full object buffer and metadata
   */
  async getObject(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);

    // Collect stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      Body: buffer,
      ContentLength: response.ContentLength || buffer.length,
      ContentType: response.ContentType,
      LastModified: response.LastModified,
      Metadata: response.Metadata,
      eTag: response.ETag,
    };
  }

  /**
   * Retrieve object metadata (HEAD) without fetching content body
   */
  async getObjectMetadata(key) {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);

    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      eTag: response.ETag,
      metadata: response.Metadata || {},
    };
  }

  /**
   * Delete object from R2 bucket
   */
  async deleteObject(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.client.send(command);
    return true;
  }

  /**
   * Generate short-lived presigned download URL for authenticated access
   * Default expiration: 3600 seconds (1 hour)
   */
  async getPresignedDownloadUrl({
    key,
    originalFilename,
    mimeType = "application/octet-stream",
    expiresIn = 3600,
  }) {
    const filename = originalFilename || key.split("/").pop();
    const contentDisposition = `inline; filename="${encodeURIComponent(filename)}"`;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentType: mimeType,
      ResponseContentDisposition: contentDisposition,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }
}

export default R2StorageAdapter;
