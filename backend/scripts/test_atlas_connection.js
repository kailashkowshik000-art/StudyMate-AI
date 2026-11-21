/**
 * StudyMate AI - Non-destructive MongoDB Atlas Diagnostic Script
 *
 * Verifies:
 * 1. Environment variable resolution
 * 2. URI format and parameter validation (targets studymate_db, retryWrites=true&w=majority)
 * 3. Sanitized logging (zero credentials printed)
 * 4. DNS resolution of Atlas cluster host
 * 5. Direct TCP connectivity / Atlas handshake
 */

import "../config/dns.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { getDNSServers } from "../config/dns.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first, then root .env as fallback
const backendEnvPath = path.resolve(__dirname, "../.env");
const rootEnvPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Redact credentials for safe logging
function maskUri(uri) {
  if (!uri || typeof uri !== "string") return "[NOT SET]";
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//[CREDENTIALS_REDACTED]@");
}

async function runDiagnostics() {
  console.log("=".repeat(70));
  console.log("  STUDYMATE AI - MONGODB ATLAS CONNECTIVITY DIAGNOSTIC");
  console.log("=".repeat(70) + "\n");

  const rawUri = process.env.MONGODB_URI;
  const useMemory = process.env.USE_MEMORY_DB;
  const nodeEnv = process.env.NODE_ENV;

  console.log(`[CONFIG AUDIT]`);
  console.log(`  NODE_ENV:      ${nodeEnv || "not set"}`);
  console.log(`  USE_MEMORY_DB: ${useMemory || "not set"}`);
  console.log(`  DNS_SERVERS:   ${process.env.DNS_SERVERS || "default (auto-configured)"}`);
  console.log(`  Active DNS:    ${getDNSServers().join(", ")}`);
  console.log(`  MONGODB_URI:   ${maskUri(rawUri)}`);

  if (!rawUri) {
    console.error("\n[DIAGNOSTIC FAILURE]: MONGODB_URI is not set in environment or .env files.");
    process.exit(1);
  }

  // Parse URI components safely
  const isSrv = rawUri.startsWith("mongodb+srv://");
  const isStandard = rawUri.startsWith("mongodb://");
  console.log(`\n[URI FORMAT AUDIT]`);
  console.log(`  Uses mongodb+srv:// protocol: ${isSrv}`);
  console.log(`  Uses standard mongodb:// protocol: ${isStandard}`);

  // Extract host safely without regex exposing password
  let clusterHost = "";
  let databaseName = "";
  try {
    const atIndex = rawUri.indexOf("@");
    if (atIndex !== -1) {
      const postAt = rawUri.slice(atIndex + 1);
      const slashIndex = postAt.indexOf("/");
      if (slashIndex !== -1) {
        clusterHost = postAt.slice(0, slashIndex);
        const postSlash = postAt.slice(slashIndex + 1);
        const queryIndex = postSlash.indexOf("?");
        databaseName = queryIndex !== -1 ? postSlash.slice(0, queryIndex) : postSlash;
      } else {
        clusterHost = postAt;
      }
    }
  } catch (e) {
    console.error("  Error parsing URI components:", e.message);
  }

  console.log(`  Cluster Host:  ${clusterHost || "unable to extract"}`);
  console.log(`  Database Name: ${databaseName || "NOT SPECIFIED (defaults to 'test')"}`);
  console.log(`  Has retryWrites: ${rawUri.includes("retryWrites=true")}`);
  console.log(`  Has w=majority:  ${rawUri.includes("w=majority")}`);

  // Check DNS resolution of cluster host
  console.log(`\n[DNS AUDIT] Resolving host: ${clusterHost}...`);
  try {
    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${clusterHost}`);
    console.log(`  ✓ SRV DNS Lookup Success! Found ${srvRecords.length} host instances:`);
    srvRecords.forEach((r) => console.log(`    - ${r.name}:${r.port} (priority: ${r.priority}, weight: ${r.weight})`));
  } catch (dnsErr) {
    console.warn(`  ! SRV DNS Lookup returned: ${dnsErr.code || dnsErr.message}`);
    // Try standard A record lookup
    try {
      const aRecords = await dns.promises.resolve(clusterHost);
      console.log(`  ✓ Standard DNS A record found: ${aRecords.join(", ")}`);
    } catch (aErr) {
      console.warn(`  ! Standard DNS A Lookup returned: ${aErr.code || aErr.message}`);
    }
  }

  // Attempt Mongoose Connection
  console.log(`\n[CONNECTION AUDIT] Attempting connection to Atlas cluster...`);
  try {
    const conn = await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    console.log(`  ✓ Connection Successful!`);
    console.log(`  Host connected: ${conn.connection.host}`);
    console.log(`  Database connected: ${conn.connection.name}`);
    console.log(`  ReadyState: ${conn.connection.readyState} (1 = connected)`);

    // Perform non-destructive read test (ping / listCollections)
    console.log(`\n[NON-DESTRUCTIVE PING AUDIT]`);
    const pingResult = await conn.connection.db.command({ ping: 1 });
    console.log(`  ✓ Database Ping Response:`, pingResult);

    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`  ✓ Existing Collections in ${conn.connection.name}: ${collections.map((c) => c.name).join(", ") || "(empty database)"}`);

    await mongoose.disconnect();
    console.log("\n[DIAGNOSTIC COMPLETED]: All Atlas connectivity checks passed successfully.");
  } catch (connErr) {
    console.error(`\n[CONNECTION FAILURE]: ${connErr.message}`);
    if (connErr.message.includes("bad auth") || connErr.message.includes("Authentication failed")) {
      console.error("  -> Issue: Invalid database username or password in MONGODB_URI.");
    } else if (connErr.message.includes("IP") || connErr.message.includes("whitelist") || connErr.message.includes("ETIMEDOUT") || connErr.message.includes("querySrv")) {
      console.error("  -> Issue: IP Address not whitelisted on MongoDB Atlas Network Access OR sandbox blocking external network.");
    }
    process.exit(1);
  }
}

runDiagnostics().catch((err) => {
  console.error("Diagnostic execution error:", err.message);
  process.exit(1);
});
