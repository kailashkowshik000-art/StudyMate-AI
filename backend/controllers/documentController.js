import fs from "fs";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import Summary from "../models/Summary.js";
import Quiz from "../models/Quiz.js";
import Flashcard from "../models/Flashcard.js";
import Exam from "../models/Exam.js";
import StudyActivity from "../models/StudyActivity.js";
import ChatSession from "../models/ChatSession.js";
import LearningProfile from "../models/LearningProfile.js";
import {
  removeFileFromDisk,
  validateUploadedFile,
  validateUploadedPdf,
  getSafeUploadPath,
} from "../services/fileService.js";
import { getDocumentFormat } from "../services/documentExtractorService.js";
import {
  enqueueDocument,
  executeDocumentProcessing,
  retryDocument as retryJob,
  cancelDocumentJob,
  getQueueHealth,
} from "../services/documentQueueService.js";
import {
  uploadDocumentFile,
  getSecureDownloadUrl,
  deleteDocumentFromStorage,
  resolveDocumentMimeType,
  getStorageProviderName,
} from "../services/storage/storageService.js";

const getDocumentQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ documentId: id }, { _id: id }] }
    : { documentId: id };
};

/**
 * Standardize document payload for API responses ensuring backward and forward compatibility
 */
export const formatDocument = (doc) => {
  const isCompleted =
    doc.processingStatus === "completed" || doc.status === "ready";
  const isProcessing =
    doc.processingStatus === "processing" || doc.status === "processing";
  const isFailed =
    doc.processingStatus === "failed" || doc.status === "failed";

  const displayStatus = isCompleted
    ? "Ready"
    : isProcessing
    ? "Processing"
    : isFailed
    ? "Failed"
    : "Uploaded";

  const format = (doc.format || getDocumentFormat(doc.fileName) || "pdf").toLowerCase();
  const displayType = format.toUpperCase();

  return {
    id: doc.documentId,
    documentId: doc.documentId,
    name: doc.fileName,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    size: `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`,
    fileSize: doc.fileSize,
    type: displayType,
    format,
    pageCount: doc.pageCount || 0,
    slideCount: doc.slideCount || 0,
    wordCount: doc.wordCount || 0,
    subject: doc.subject,
    status: displayStatus,
    rawStatus: doc.status,
    processingStatus:
      doc.processingStatus ||
      (isCompleted
        ? "completed"
        : isProcessing
        ? "processing"
        : isFailed
        ? "failed"
        : "pending"),
    processingStage:
      doc.processingStage ||
      (isCompleted
        ? "completed"
        : isProcessing
        ? "processing"
        : isFailed
        ? "failed"
        : "queued"),
    jobId: doc.jobId || null,
    processingProgress:
      typeof doc.processingProgress === "number"
        ? doc.processingProgress
        : isCompleted
        ? 100
        : 0,
    processingError: doc.processingError || doc.errorMessage || null,
    errorMessage: doc.errorMessage || doc.processingError || null,
    chunkCount: doc.chunkCount || 0,
    storageProvider: doc.storageProvider || "local",
    storageKey: doc.storageKey || null,
    downloadUrl: `/api/documents/${doc.documentId}/download`,
    processedAt: doc.processedAt || null,
    uploadedAt: doc.uploadedAt,
    retryCount: doc.retryCount || 0,
  };
};

/**
 * Legacy pipeline wrapper preserving backward compatibility
 */
export async function processDocumentPipeline(document) {
  return executeDocumentProcessing(document.documentId, document.userId);
}

// @desc    Upload a new document (PDF, DOCX, PPTX, TXT) & queue for asynchronous processing
// @route   POST /api/documents
// @access  Private
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded or file was invalid. Supported formats: .pdf, .docx, .pptx, .txt",
      });
    }

    // Validate uploaded file integrity (MIME, extension, size, and package/magic byte integrity)
    try {
      await validateUploadedFile({
        filePath: req.file.path,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: valErr.message,
      });
    }

    const { subject } = req.body;
    const documentId = `doc_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    const fileUrl = `/uploads/${req.file.filename}`;
    const detectedFormat = getDocumentFormat(req.file.originalname) || "pdf";
    const detectedMime = resolveDocumentMimeType(req.file.originalname, req.file.mimetype);

    // 1. Upload to storage provider (R2 in production, Local in dev)
    let storageInfo = {
      storageProvider: getStorageProviderName(),
      storageKey: null,
    };

    try {
      storageInfo = await uploadDocumentFile({
        userId: req.user.userId,
        documentId,
        originalFilename: req.file.originalname,
        filePath: req.file.path,
        mimeType: detectedMime,
      });
    } catch (storageErr) {
      console.warn(`[DocumentController] Cloud storage upload warning:`, storageErr.message);
      if (process.env.NODE_ENV === "production" && getStorageProviderName() === "r2") {
        throw storageErr;
      }
    }

    // 2. Create document record with "pending" asynchronous status
    const document = await Document.create({
      documentId,
      userId: req.user.userId,
      fileName: req.file.originalname,
      originalFilename: req.file.originalname,
      fileUrl,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: detectedMime,
      format: detectedFormat,
      mimeType: detectedMime,
      storageProvider: storageInfo.storageProvider || "local",
      storageKey: storageInfo.storageKey || null,
      uploadStatus: "uploaded",
      pageCount: 0,
      slideCount: 0,
      wordCount: 0,
      subject: subject ? String(subject).slice(0, 100).trim() : "General Studies",
      processingStatus: "pending",
      status: "uploaded",
      processingProgress: 0,
      processingError: null,
      errorMessage: null,
    });

    // 3. Dispatch background processing job outside the HTTP request loop
    enqueueDocument(document.documentId, req.user.userId);

    // 4. Immediately respond with HTTP 202 Accepted
    res.status(202).json({
      success: true,
      message: "Document uploaded successfully and queued for asynchronous processing",
      data: {
        document: formatDocument(document),
        statusUrl: `/api/documents/${document.documentId}/status`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get document processing status and progress
// @route   GET /api/documents/:id/status
// @access  Private
export const getDocumentStatus = async (req, res, next) => {
  try {
    const document = await Document.findOne(getDocumentQuery(req.params.id));

    // Return 404 for missing or unauthorized documents to prevent resource enumeration
    if (!document || document.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: document.documentId,
        documentId: document.documentId,
        fileName: document.fileName,
        processingStatus:
          document.processingStatus ||
          (document.status === "ready" ? "completed" : document.status),
        processingStage:
          document.processingStage ||
          (document.status === "ready"
            ? "completed"
            : document.status === "processing"
            ? "processing"
            : document.status === "failed"
            ? "failed"
            : "queued"),
        jobId: document.jobId || null,
        queueAttempts: document.queueAttempts || 0,
        processingProgress:
          typeof document.processingProgress === "number"
            ? document.processingProgress
            : document.status === "ready"
            ? 100
            : 0,
        processingError: document.processingError || document.errorMessage || null,
        status:
          document.status === "ready"
            ? "Ready"
            : document.status === "processing"
            ? "Processing"
            : document.status === "failed"
            ? "Failed"
            : "Uploaded",
        chunkCount: document.chunkCount || 0,
        processedAt: document.processedAt || null,
        uploadedAt: document.uploadedAt,
        retryCount: document.retryCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents for the authenticated user
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
  try {
    const docs = await Document.find({ userId: req.user.userId }).sort({
      uploadedAt: -1,
    });

    const formatted = docs.map(formatDocument);

    res.status(200).json({
      success: true,
      data: {
        documents: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findOne(getDocumentQuery(req.params.id));

    // Return 404 for missing OR unauthorized documents to avoid revealing existence
    if (!document || document.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        document: formatDocument(document),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Securely download/view an authenticated user's document
// @route   GET /api/documents/:id/download
// @access  Private
export const downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne(getDocumentQuery(req.params.id));

    // Return 404 for missing or unauthorized documents to prevent resource enumeration
    if (!document || document.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const mimeType = resolveDocumentMimeType(document.fileName, document.mimeType);

    // If document is stored in Cloudflare R2, generate secure presigned URL
    if (document.storageProvider === "r2" && document.storageKey) {
      const presignedUrl = await getSecureDownloadUrl(document, 3600);
      if (req.query.json === "true" || req.headers.accept?.includes("application/json")) {
        return res.status(200).json({
          success: true,
          downloadUrl: presignedUrl,
          expiresIn: 3600,
        });
      }
      return res.redirect(presignedUrl);
    }

    // Local filesystem storage
    const safePath = getSafeUploadPath(document.filePath);
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({
        success: false,
        message: "Document file not found on disk",
      });
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.fileName)}"`
    );
    res.sendFile(safePath);
  } catch (error) {
    next(error);
  }
};

// @desc    Retry/reprocess a failed or completed document
// @route   POST /api/documents/:id/reprocess OR POST /api/documents/:id/retry
// @access  Private
export const reprocessDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne(getDocumentQuery(req.params.id));

    if (!document || document.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.processingStatus === "processing") {
      return res.status(409).json({
        success: false,
        message: "Document is already processing. Please wait for the current job to finish.",
      });
    }

    const updatedDoc = await retryJob(document.documentId, req.user.userId);

    res.status(202).json({
      success: true,
      message: "Document re-queued for asynchronous processing",
      data: {
        document: formatDocument(updatedDoc),
        statusUrl: `/api/documents/${updatedDoc.documentId}/status`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper to safely execute model operations in connected or mock environments without buffering hang
const canExecuteQuery = (model, method) => {
  return mongoose.connection.readyState === 1 || Object.prototype.hasOwnProperty.call(model, method);
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne(getDocumentQuery(req.params.id));

    if (!document || document.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // 1. Cancel in-flight background processing job if running
    cancelDocumentJob(document.documentId);

    // 2. Remove file from cloud storage and local disk safely
    try {
      await deleteDocumentFromStorage(document);
    } catch (storageDelErr) {
      console.warn(`[DocumentController] Storage delete warning for ${document.documentId}:`, storageDelErr.message);
      removeFileFromDisk(document.filePath);
    }

    // 3. Cascade cleanup of document-bound content while preserving user-wide learning history
    const cascadeTasks = [];

    // Delete text chunks
    if (canExecuteQuery(TextChunk, "deleteMany")) {
      cascadeTasks.push(
        TextChunk.deleteMany({
          documentId: document.documentId,
          userId: req.user.userId,
        })
      );
    }
    // Delete document summaries
    if (canExecuteQuery(Summary, "deleteMany")) {
      cascadeTasks.push(
        Summary.deleteMany({
          documentId: document.documentId,
          userId: req.user.userId,
        })
      );
    }
    // Delete document-specific flashcards
    if (canExecuteQuery(Flashcard, "deleteMany")) {
      cascadeTasks.push(
        Flashcard.deleteMany({
          documentId: document.documentId,
          userId: req.user.userId,
        })
      );
    }
    // Delete document-specific quizzes
    if (canExecuteQuery(Quiz, "deleteMany")) {
      cascadeTasks.push(
        Quiz.deleteMany({
          documentId: document.documentId,
          userId: req.user.userId,
        })
      );
    }
    // Dissociate exams while preserving scores & exam performance records
    if (canExecuteQuery(Exam, "updateMany")) {
      cascadeTasks.push(
        Exam.updateMany(
          { documentId: document.documentId, userId: req.user.userId },
          { $set: { documentId: null } }
        )
      );
    }
    // Dissociate study activities while preserving user-wide study hours, streaks & history
    if (canExecuteQuery(StudyActivity, "updateMany")) {
      cascadeTasks.push(
        StudyActivity.updateMany(
          { documentId: document.documentId, userId: req.user.userId },
          { $set: { documentId: null } }
        )
      );
    }
    // Dissociate chat sessions while preserving message history
    if (canExecuteQuery(ChatSession, "updateMany")) {
      cascadeTasks.push(
        ChatSession.updateMany(
          { documentId: document.documentId, userId: req.user.userId },
          { $set: { documentId: null } }
        )
      );
    }
    // Dissociate weak topic references in learning profile
    if (canExecuteQuery(LearningProfile, "updateOne")) {
      cascadeTasks.push(
        LearningProfile.updateOne(
          { userId: req.user.userId },
          { $set: { "weakTopics.$[elem].documentId": null } },
          { arrayFilters: [{ "elem.documentId": document.documentId }] }
        ).catch(() => {})
      );
    }

    if (cascadeTasks.length > 0) {
      await Promise.allSettled(cascadeTasks);
    }

    // 4. Delete document record from database
    if (canExecuteQuery(Document, "deleteOne")) {
      await Document.deleteOne({ _id: document._id });
    }

    res.status(200).json({
      success: true,
      message: "Document and associated chunks deleted successfully",
      data: {
        documentId: document.documentId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retrieve queue health & operational metrics
// @route   GET /api/documents/queue/health
// @access  Private
export const getQueueHealthStatus = async (req, res, next) => {
  try {
    const health = await getQueueHealth();
    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  uploadDocument,
  getDocumentStatus,
  getDocuments,
  getDocumentById,
  downloadDocument,
  reprocessDocument,
  deleteDocument,
  processDocumentPipeline,
  formatDocument,
  getQueueHealthStatus,
};
