import { configureDNS } from "./dns.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";

let memoryServerInstance = null;

/**
 * Validates and sanitizes a MongoDB URI to remove credentials for safe logging and status reporting
 */
export function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== "string") return null;
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//[CREDENTIALS_REDACTED]@");
}

/**
 * Validates MongoDB configuration for the current environment
 */
export function validateDatabaseConfig(env = process.env.NODE_ENV) {
  const isProd = env === "production";
  const uri = process.env.MONGODB_URI;
  const useMemory = process.env.USE_MEMORY_DB === "true";

  if (isProd) {
    if (useMemory) {
      throw new Error(
        "FATAL DATABASE CONFIGURATION: USE_MEMORY_DB is strictly prohibited in production. Persistent MongoDB Atlas storage is required."
      );
    }

    if (!uri || typeof uri !== "string" || uri.trim() === "") {
      throw new Error(
        "FATAL DATABASE CONFIGURATION: MONGODB_URI environment variable is required in production."
      );
    }

    if (
      uri.includes("localhost") ||
      uri.includes("127.0.0.1") ||
      uri.includes("memory")
    ) {
      throw new Error(
        "FATAL DATABASE CONFIGURATION: Insecure local or in-memory MongoDB URI configured in production. Please set a valid MongoDB Atlas connection string."
      );
    }
  }

  return true;
}

/**
 * Connect to MongoDB with singleton protection, Atlas support, connection pooling, and retry logic.
 *
 * @param {string} [customUri] - Optional custom connection string (used by test harnesses)
 * @param {number} [maxRetries=3] - Number of connection attempts before failing or falling back
 * @returns {Promise<mongoose.Connection|null>}
 */
export const connectDB = async (customUri = null, maxRetries = 3) => {
  const isProduction = process.env.NODE_ENV === "production";

  // Enforce production validation rules
  if (!customUri) {
    validateDatabaseConfig(process.env.NODE_ENV);
  }

  // 1. Singleton check: If already connected and ready, return existing connection
  if (mongoose.connection.readyState === 1) {
    if (!customUri || mongoose.connection.client?.s?.url === customUri) {
      return mongoose.connection;
    }
    await mongoose.disconnect().catch(() => {});
  }

  // 2. If currently connecting, wait for existing promise
  if (mongoose.connection.readyState === 2) {
    try {
      await mongoose.connection.asPromise();
      return mongoose.connection;
    } catch {
      await mongoose.disconnect().catch(() => {});
    }
  }

  // 3. In development, if USE_MEMORY_DB=true is explicitly configured, launch in-memory engine directly
  const useMemoryExplicit = !isProduction && !customUri && process.env.USE_MEMORY_DB === "true";
  if (useMemoryExplicit) {
    try {
      logger.info(
        "USE_MEMORY_DB=true is configured. Launching in-memory MongoDB engine for local testing..."
      );

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }

      if (!memoryServerInstance) {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        memoryServerInstance = await MongoMemoryServer.create();
      }

      const memUri = memoryServerInstance.getUri();
      const memConn = await mongoose.connect(memUri);
      logger.info("Connected to In-Memory MongoDB engine successfully", {
        uri: memUri,
        isMemoryDB: true,
      });
      return memConn.connection;
    } catch (memErr) {
      logger.error(`Failed to launch in-memory MongoDB engine: ${memErr.message}`);
      throw memErr;
    }
  }

  // 4. Persistent MongoDB Connection (Atlas or configured URI)
  const uri = customUri || process.env.MONGODB_URI;

  if (!uri || typeof uri !== "string" || uri.trim() === "") {
    const errorMsg = "DATABASE CONFIGURATION ERROR: MONGODB_URI is required when USE_MEMORY_DB is false.";
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Ensure Node.js DNS resolvers are set before attempting Atlas SRV lookup
  configureDNS();

  const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 10,
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2,
  };

  let attempt = 0;
  let lastError = null;

  while (attempt < (customUri ? 1 : maxRetries)) {
    attempt++;
    try {
      logger.info(`Connecting to MongoDB... (attempt ${attempt}/${customUri ? 1 : maxRetries})`, {
        uri: sanitizeMongoUri(uri),
      });

      const conn = await mongoose.connect(uri, mongooseOptions);

      logger.info(`MongoDB connected successfully`, {
        host: conn.connection.host,
        name: conn.connection.name,
        readyState: conn.connection.readyState,
        isAtlas: conn.connection.host.includes(".mongodb.net"),
      });

      // Bind connection event listeners once
      if (!mongoose.connection._hasStudyMateListeners) {
        mongoose.connection.on("error", (err) => {
          logger.error(`MongoDB connection error: ${err.message}`);
        });

        mongoose.connection.on("disconnected", () => {
          logger.warn(`MongoDB connection disconnected`);
        });

        mongoose.connection.on("reconnected", () => {
          logger.info(`MongoDB connection re-established`);
        });

        mongoose.connection._hasStudyMateListeners = true;
      }

      return conn.connection;
    } catch (error) {
      lastError = error;
      logger.warn(
        `MongoDB connection attempt ${attempt} failed: ${error.message}`,
        { uri: sanitizeMongoUri(uri) }
      );

      // If caller passed a customUri (e.g. unit tests), throw immediately
      if (customUri) {
        throw error;
      }

      // If retries remain, wait with exponential backoff (1s, 2s, 4s)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed: Never silently fallback to in-memory database
  logger.error(
    `FATAL: Failed to connect to persistent database after ${maxRetries} attempts: ${lastError?.message}`,
    { uri: sanitizeMongoUri(uri) }
  );
  throw new Error(
    `Failed to connect to MongoDB (${sanitizeMongoUri(uri)}): ${lastError?.message}`
  );
};

/**
 * Disconnect from MongoDB and terminate in-memory server if active
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
      logger.info("MongoDB disconnected successfully");
    }
    if (memoryServerInstance) {
      await memoryServerInstance.stop().catch(() => {});
      memoryServerInstance = null;
      logger.info("In-memory MongoDB engine stopped");
    }
  } catch (err) {
    logger.error(`Error disconnecting MongoDB: ${err.message}`);
  }
};

/**
 * Get current database connection status (redacts credentials)
 */
export const getDBStatus = () => {
  const isConnected = mongoose.connection.readyState === 1;
  const host = mongoose.connection.host || null;
  const isAtlas = host ? host.includes(".mongodb.net") : false;

  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    host: host ? host.replace(/[^a-zA-Z0-9.-]/g, "") : null,
    name: mongoose.connection.name || null,
    isMemoryDB: !!memoryServerInstance,
    isAtlas,
  };
};

export default connectDB;
