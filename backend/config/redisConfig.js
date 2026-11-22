/**
 * StudyMate AI - Redis Configuration & Connection Factory
 *
 * Provides connection parameters, client instantiation, and production safeguards
 * for Redis and BullMQ distributed queues.
 * Fully compatible with Render, Upstash, AWS, and local Redis deployments.
 */

import Redis from "ioredis";

/**
 * Parses a redis:// or rediss:// connection URL into structured ioredis/BullMQ options.
 * Handles hostname, port, username, password, database index, and TLS flags.
 */
export function parseRedisUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    const parsed = new URL(urlStr);
    const isTls = parsed.protocol === "rediss:";
    const host = parsed.hostname || "127.0.0.1";
    const port = parsed.port ? parseInt(parsed.port, 10) : (isTls ? 6380 : 6379);
    const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
    const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

    // Parse database index from pathname (e.g. "/0" -> 0, "/2" -> 2)
    let db = 0;
    const pathSegment = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "";
    if (pathSegment) {
      const parsedDb = parseInt(pathSegment, 10);
      if (!isNaN(parsedDb)) db = parsedDb;
    } else if (parsed.searchParams.has("db")) {
      const paramDb = parseInt(parsed.searchParams.get("db"), 10);
      if (!isNaN(paramDb)) db = paramDb;
    }

    return {
      host,
      port,
      username,
      password,
      db,
      tls: isTls,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Returns normalized Redis configuration parameters.
 * Never exposes credentials in logs.
 */
export function getRedisConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const redisUrl = process.env.REDIS_URL || undefined;

  let host = process.env.REDIS_HOST || "127.0.0.1";
  let port = parseInt(process.env.REDIS_PORT, 10) || 6379;
  let username = process.env.REDIS_USERNAME || undefined;
  let password = process.env.REDIS_PASSWORD || undefined;
  let db = parseInt(process.env.REDIS_DB, 10) || 0;
  let tls = process.env.REDIS_TLS === "true";

  if (redisUrl) {
    const parsed = parseRedisUrl(redisUrl);
    if (parsed) {
      host = parsed.host;
      port = parsed.port;
      if (parsed.username) username = parsed.username;
      if (parsed.password) password = parsed.password;
      if (parsed.db !== undefined) db = parsed.db;
      if (parsed.tls) tls = true;
    }
  }

  const isExplicitlyConfigured = Boolean(
    process.env.REDIS_URL ||
    process.env.REDIS_HOST ||
    process.env.REDIS_PASSWORD
  );

  return {
    isProduction,
    redisUrl,
    host,
    port,
    username,
    password,
    db,
    tls,
    isExplicitlyConfigured,
  };
}

/**
 * Returns options object compatible with ioredis and BullMQ.
 * BullMQ strictly requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`.
 * Explicitly structures connection as { host, port, username, password, db, tls }
 * so BullMQ and ioredis properly connect to remote Redis instances (e.g. Render, Upstash).
 */
export function getRedisConnectionOptions(overrides = {}) {
  const config = getRedisConfig();

  let host = config.host;
  let port = config.port;
  let username = config.username;
  let password = config.password;
  let db = config.db;
  let tls = config.tls;

  // Support explicit URL override if passed in overrides
  if (overrides.url) {
    const parsedOverride = parseRedisUrl(overrides.url);
    if (parsedOverride) {
      host = parsedOverride.host;
      port = parsedOverride.port;
      if (parsedOverride.username) username = parsedOverride.username;
      if (parsedOverride.password) password = parsedOverride.password;
      if (parsedOverride.db !== undefined) db = parsedOverride.db;
      if (parsedOverride.tls) tls = true;
    }
  }

  // Allow explicit host, port, credentials overrides
  if (overrides.host) host = overrides.host;
  if (overrides.port) port = parseInt(overrides.port, 10);
  if (overrides.username !== undefined) username = overrides.username;
  if (overrides.password !== undefined) password = overrides.password;
  if (overrides.db !== undefined) db = overrides.db;
  if (overrides.tls !== undefined) tls = Boolean(overrides.tls);

  // Retry strategy with exponential backoff up to 10 seconds
  const retryStrategy = (times) => {
    const delay = Math.min(times * 200, 10000);
    return delay;
  };

  const tlsConfig = tls
    ? (typeof overrides.tls === "object"
        ? overrides.tls
        : process.env.REDIS_TLS_REJECT_UNAUTHORIZED === "false"
        ? { rejectUnauthorized: false }
        : {})
    : undefined;

  // Remove url from overrides so ioredis does not ignore host/port
  const cleanOverrides = { ...overrides };
  delete cleanOverrides.url;

  return {
    host,
    port,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(db ? { db } : {}),
    ...(tlsConfig ? { tls: tlsConfig } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    retryStrategy,
    connectTimeout: 10000,
    lazyConnect: false,
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err && err.message && err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    ...cleanOverrides,
  };
}

/**
 * Creates a new configured ioredis client instance.
 */
export function createRedisClient(overrides = {}) {
  const options = getRedisConnectionOptions(overrides);
  const client = new Redis(options);

  client.on("error", (err) => {
    // Avoid logging passwords or tokens or spamming ECONNREFUSED in offline dev/test
    if (process.env.NODE_ENV === "test" || (err && err.message && err.message.includes("ECONNREFUSED"))) {
      return;
    }
    const safeMsg = (err?.message || "").replace(/:[^:@]+@/, ":[REDACTED]@");
    console.warn(`[Redis] Connection warning: ${safeMsg}`);
  });

  return client;
}

/**
 * Returns sanitized Redis metadata for health and monitoring endpoints.
 * Never logs or exposes credentials.
 */
export function getSanitizedRedisInfo() {
  const config = getRedisConfig();

  return {
    host: config.host,
    port: config.port,
    db: config.db || 0,
    tls: Boolean(config.tls),
    hasAuth: Boolean(config.password || config.username),
    isConfigured: config.isExplicitlyConfigured,
  };
}

export default {
  parseRedisUrl,
  getRedisConfig,
  getRedisConnectionOptions,
  createRedisClient,
  getSanitizedRedisInfo,
};
