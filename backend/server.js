// 1. DNS configuration MUST execute before importing Mongoose or triggering any SRV lookup
import "./config/dns.js";

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded reliably, with root .env as fallback
const backendEnvPath = path.resolve(__dirname, ".env");
const rootEnvPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

import app from "./app.js";
import connectDB from "./config/db.js";
import { recoverPendingJobs } from "./services/documentQueueService.js";
import { initializeQueue, shutdownQueue } from "./services/queue/queueManager.js";

const PORT = process.env.PORT || 5000;

// Initialize database connection (skipped in test mode to allow test harnesses to control DB lifecycle)
let connection = null;
if (process.env.NODE_ENV !== "test") {
  try {
    connection = await connectDB();
    if (!connection) {
      throw new Error("Persistent database connection could not be established.");
    }
    // Initialize Redis + BullMQ distributed document processing infrastructure
    await initializeQueue();
    // Recover any pending/interrupted background document processing jobs after DB is ready
    await recoverPendingJobs();
  } catch (dbErr) {
    console.error(`[FATAL DATABASE ERROR] ${dbErr.message}`);
    process.exit(1);
  }
}

// Start HTTP Server if not running in test mode
let server = null;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`[StudyMate AI Backend] Server running on http://localhost:${PORT}`);
    console.log(`[StudyMate AI Backend] Health check: http://localhost:${PORT}/api/health`);
  });

  const handleGracefulShutdown = async (signal) => {
    console.log(`[StudyMate AI Backend] Received ${signal}. Initiating graceful shutdown...`);
    if (server) {
      server.close();
    }
    await shutdownQueue();
    process.exit(0);
  };

  process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
}

export { app, server, connection };
export default app;
