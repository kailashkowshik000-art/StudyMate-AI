// DNS configuration ensures resolvers are configured before Mongoose or models load
import "./config/dns.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { getDBStatus } from "./config/db.js";
import Document from "./models/Document.js";
import { protect } from "./middleware/authMiddleware.js";
import { getSafeUploadPath } from "./services/fileService.js";
import { getQueueHealth } from "./services/documentQueueService.js";
import {
  getSecureDownloadUrl,
  resolveDocumentMimeType,
} from "./services/storage/storageService.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import studyPlanRoutes from "./routes/studyPlanRoutes.js";
import flashcardRoutes from "./routes/flashcardRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { correlationMiddleware } from "./middleware/correlationMiddleware.js";
import cookieParser from "./middleware/cookieParser.js";
import csrfProtection from "./middleware/csrfMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// 1. Security Headers (Helmet) - Task 1
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", CLIENT_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    noSniff: true,
    frameguard: { action: "sameorigin" },
  })
);

// 2. Strict CORS Configuration - Task 4
app.use(
  cors({
    origin: (origin, callback) => {
      const isProd = process.env.NODE_ENV === "production";
      const allowedClientUrl = process.env.CLIENT_URL || "http://localhost:5173";

      // In production: strictly allow CLIENT_URL only
      if (isProd) {
        if (!origin || origin === allowedClientUrl) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked: Origin ${origin} is not permitted`));
        }
      } else {
        // In development / test: allow requests with no origin, localhost origins, or CLIENT_URL
        if (
          !origin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin === allowedClientUrl
        ) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked: Origin ${origin} is not permitted in development`));
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-XSRF-TOKEN",
      "x-csrf-token",
      "x-xsrf-token",
    ],
  })
);

app.use(cookieParser);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(correlationMiddleware);
app.use(csrfProtection);

// 3. Health & Readiness Monitoring - Objective 2
// Liveness Probe (process is alive and accepting connections)
app.get("/healthz/live", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "studymate-ai-backend",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness Probe (verifies database connectivity & service readiness)
app.get("/healthz/ready", async (req, res) => {
  const dbStatus = getDBStatus();
  let queueHealth = null;
  try {
    queueHealth = await getQueueHealth();
  } catch (qErr) {
    queueHealth = { status: "degraded", error: qErr.message };
  }

  const isProd = process.env.NODE_ENV === "production";
  const isReady = dbStatus.connected && (!isProd || queueHealth?.status === "healthy");

  if (isReady) {
    res.status(200).json({
      status: "ready",
      service: "studymate-ai-backend",
      database: {
        status: "connected",
        readyState: dbStatus.readyState,
        host: dbStatus.host,
        name: dbStatus.name,
        isMemoryDB: dbStatus.isMemoryDB,
        isAtlas: dbStatus.isAtlas,
      },
      queue: queueHealth,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      service: "studymate-ai-backend",
      database: {
        status: dbStatus.connected ? "connected" : "disconnected",
        readyState: dbStatus.readyState,
        message: dbStatus.connected ? "Database ready" : "Database connection is not ready",
      },
      queue: queueHealth,
      timestamp: new Date().toISOString(),
    });
  }
});

// Backward-compatible Health Check Endpoint (Requirement 25)
app.get("/api/health", async (req, res) => {
  const dbStatus = getDBStatus();
  let queueHealth = null;
  try {
    queueHealth = await getQueueHealth();
  } catch {}
  res.status(200).json({
    success: true,
    message: "StudyMate AI backend is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    queue: queueHealth,
  });
});

// 4. Authenticated Document Access (Supports Cloudflare R2 presigned URLs and dynamic MIME types)
app.get("/uploads/:filename", protect, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);

    // Verify ownership in Document model
    const doc = await Document.findOne({
      userId: req.user.userId,
      $or: [
        { fileUrl: `/uploads/${filename}` },
        { filePath: { $regex: filename } },
        { storageKey: { $regex: filename } },
      ],
    });

    // Return 404 for missing or unauthorized access to avoid revealing resource existence
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // If stored in Cloudflare R2, redirect to presigned download URL
    if (doc.storageProvider === "r2" && doc.storageKey) {
      const presignedUrl = await getSecureDownloadUrl(doc, 3600);
      return res.redirect(presignedUrl);
    }

    const safePath = getSafeUploadPath(doc.filePath || filename);
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({
        success: false,
        message: "Document not found on disk",
      });
    }

    const mimeType = resolveDocumentMimeType(doc.fileName || filename, doc.mimeType);
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.fileName || filename)}"`
    );
    res.sendFile(safePath);
  } catch (err) {
    next(err);
  }
});

// 5. Mount API Routes with Rate Limiting & Input Validation
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/study-plans", studyPlanRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/account", accountRoutes);

// 6. Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

export { app };
export default app;
