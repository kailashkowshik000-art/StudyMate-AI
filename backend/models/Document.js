import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const documentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      unique: true,
      default: () => `doc_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    },
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, "fileName is required"],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, "fileUrl is required"],
    },
    filePath: {
      type: String,
      required: [true, "filePath is required"],
    },
    fileSize: {
      type: Number,
      required: [true, "fileSize is required"],
    },
    fileType: {
      type: String,
      default: "application/pdf",
    },
    format: {
      type: String,
      enum: ["pdf", "docx", "pptx", "txt"],
      default: "pdf",
      index: true,
    },
    mimeType: {
      type: String,
      default: "application/pdf",
    },
    // Phase 8.1 Cloud Object Storage Fields (Cloudflare R2 / S3-compatible)
    storageProvider: {
      type: String,
      enum: ["local", "r2"],
      default: "local",
      index: true,
    },
    storageKey: {
      type: String,
      default: null,
      index: true,
    },
    originalFilename: {
      type: String,
      default: null,
    },
    uploadStatus: {
      type: String,
      enum: ["pending", "uploaded", "failed"],
      default: "uploaded",
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    slideCount: {
      type: Number,
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    extractionStatus: {
      type: String,
      enum: ["pending", "extracting", "completed", "failed"],
      default: "pending",
    },
    extractionMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    subject: {
      type: String,
      default: "General Studies",
    },
    // Phase 5.3 & Phase 8.5 Distributed Queue Processing Fields
    processingStatus: {
      type: String,
      enum: ["pending", "queued", "processing", "completed", "failed", "cancelled"],
      default: "queued",
      index: true,
    },
    processingStage: {
      type: String,
      enum: [
        "queued",
        "processing",
        "extracting",
        "chunking",
        "generating_embeddings",
        "indexing",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "queued",
      index: true,
    },
    jobId: {
      type: String,
      default: null,
      index: true,
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    processingError: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    queueAttempts: {
      type: Number,
      default: 0,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    processingCompletedAt: {
      type: Date,
      default: null,
    },
    // Legacy status fields for backward compatibility
    status: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed"],
      default: "uploaded",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user documents ordered by upload date
documentSchema.index({ userId: 1, uploadedAt: -1 });
// Compound index for background worker polling/recovery
documentSchema.index({ processingStatus: 1, updatedAt: 1 });

export const Document = mongoose.model("Document", documentSchema);
export default Document;
