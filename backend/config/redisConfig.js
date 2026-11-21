/**
 * StudyMate AI - Redis Configuration & Connection Factory
 *
 * Provides connection parameters, client instantiation, and production safeguards
 * for Redis and BullMQ distributed queues.
 */

import Redis from "ioredis";

/**
 * Parses and returns validated Redis connection options.
 * Never logs credentials.
 */
export function getRedisConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.REDIS_PORT, 10) || 6379;
  const username = process.env.REDIS_USERNAME || undefined;
  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = process.env.REDIS_TLS === "true" || (redisUrl && redisUrl.startsWith("rediss://"));

  // Check if explicit Redis configuration has been supplied
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
    tls,
    isExplicitlyConfigured,
  };
}

/**
 * Returns options object compatible with ioredis and BullMQ.
 * BullMQ strictly requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`.
 */
export function getRedisConnectionOptions(overrides = {}) {
  const config = getRedisConfig();

  // Retry strategy with exponential backoff up to 10 seconds
  const retryStrategy = (times) => {
    const delay = Math.min(times * 200, 10000);
    return delay;
  };

  const baseOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy,
    connectTimeout: 10000,
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    ...overrides,
  };

  if (config.redisUrl) {
    return {
      url: config.redisUrl,
      ...baseOptions,
      ...(config.tls ? { tls: {} } : {}),
    };
  }

  return {
    host: config.host,
    port: config.port,
    ...(config.username ? { username: config.username } : {}),
    ...(config.password ? { password: config.password } : {}),
    ...(config.tls ? { tls: {} } : {}),
    ...baseOptions,
  };
}

/**
 * Creates a new configured ioredis client instance.
 */
export function createRedisClient(overrides = {}) {
  const options = getRedisConnectionOptions(overrides);

  let client;
  if (options.url) {
    const { url, ...rest } = options;
    client = new Redis(url, rest);
  } else {
    client = new Redis(options);
  }

  client.on("error", (err) => {
    // Avoid logging passwords or tokens or spamming ECONNREFUSED in offline dev/test
    if (process.env.NODE_ENV === "test" || err.message.includes("ECONNREFUSED")) {
      return;
    }
    const safeMsg = (err.message || "").replace(/:[^:@]+@/, ":[REDACTED]@");
    console.warn(`[Redis] Connection warning: ${safeMsg}`);
  });

  return client;
}

/**
 * Returns sanitized Redis metadata for health and monitoring endpoints.
 */
export function getSanitizedRedisInfo() {
  const config = getRedisConfig();

  let hostDisplay = config.host;
  let portDisplay = config.port;

  if (config.redisUrl) {
    try {
      const parsed = new URL(config.redisUrl);
      hostDisplay = parsed.hostname;
      portDisplay = parseInt(parsed.port, 10) || (config.tls ? 6380 : 6379);
    } catch {
      hostDisplay = "remote-redis-instance";
    }
  }

  return {
    host: hostDisplay,
    port: portDisplay,
    tls: Boolean(config.tls),
    hasAuth: Boolean(config.password || (config.redisUrl && config.redisUrl.includes("@"))),
    isConfigured: config.isExplicitlyConfigured,
  };
}

export default {
  getRedisConfig,
  getRedisConnectionOptions,
  createRedisClient,
  getSanitizedRedisInfo,
};
