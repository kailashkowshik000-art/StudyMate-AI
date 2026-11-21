import dns from "dns";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded if dns.js is imported before dotenv.config() in server.js
const backendEnvPath = path.resolve(__dirname, "../.env");
const rootEnvPath = path.resolve(__dirname, "../../.env");

if (!process.env.DNS_SERVERS && !process.env.NODE_ENV) {
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  }
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }
}

/**
 * Validates and parses DNS server addresses from a string or array.
 * Supports comma, semicolon, or whitespace separated IP addresses.
 *
 * @param {string|string[]} input
 * @returns {string[]} Array of clean IP strings
 */
export function parseDNSServers(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Configures Node.js DNS resolvers before any network/SRV lookups occur.
 *
 * Rules:
 * - If DNS_SERVERS is 'system', 'off', 'none', or 'false': system DNS is kept.
 * - In production (NODE_ENV === 'production'): DNS configuration is NEVER overridden
 *   unless explicitly configured via the DNS_SERVERS environment variable.
 * - In development / test: Uses DNS_SERVERS if specified; defaults to Google Public DNS
 *   ['8.8.8.8', '8.8.4.4'] to resolve MongoDB Atlas SRV records on Windows.
 *
 * @param {string|string[]} [customServers] Optional custom servers to override environment
 * @returns {string[]} Currently active DNS servers in Node.js
 */
export function configureDNS(customServers = null) {
  const isProduction = process.env.NODE_ENV === "production";
  const envDns = process.env.DNS_SERVERS;

  // Check if system DNS was explicitly requested
  if (
    (typeof customServers === "string" &&
      ["system", "off", "false", "none"].includes(customServers.toLowerCase())) ||
    (typeof envDns === "string" &&
      ["system", "off", "false", "none"].includes(envDns.toLowerCase()))
  ) {
    return dns.getServers();
  }

  let serversToSet = null;

  if (customServers) {
    serversToSet = parseDNSServers(customServers);
  } else if (envDns) {
    serversToSet = parseDNSServers(envDns);
  } else if (!isProduction) {
    // Default development resolvers: Google Public DNS
    serversToSet = ["8.8.8.8", "8.8.4.4"];
  }

  if (serversToSet && serversToSet.length > 0) {
    try {
      dns.setServers(serversToSet);
      if (process.env.NODE_ENV !== "test") {
        console.log(`[DNS Config] Node.js DNS servers configured: ${serversToSet.join(", ")}`);
      }
    } catch (err) {
      console.warn(
        `[DNS Config] Warning: Failed to set custom DNS servers (${serversToSet.join(", ")}): ${err.message}`
      );
    }
  }

  return dns.getServers();
}

/**
 * Returns currently active DNS servers in Node.js
 */
export function getDNSServers() {
  return dns.getServers();
}

// Automatically configure DNS upon module import
configureDNS();

export default configureDNS;
