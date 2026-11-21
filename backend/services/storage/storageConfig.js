/**
 * StudyMate AI - Storage Configuration
 *
 * Configures storage adapters (Local Filesystem vs Cloudflare R2 / S3-compatible).
 * Enforces production security guarantees while preserving seamless local development.
 */

export function getStorageConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase().trim();

  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucketName = process.env.R2_BUCKET_NAME || "studymate-documents";
  const publicUrl = process.env.R2_PUBLIC_URL ? process.env.R2_PUBLIC_URL.replace(/\/+$/, "") : "";

  // Derive endpoint from accountId if not explicitly provided
  let endpoint = process.env.R2_ENDPOINT || "";
  if (!endpoint && accountId) {
    endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }

  const isConfigured = Boolean(
    accessKeyId &&
    secretAccessKey &&
    bucketName &&
    (endpoint || accountId)
  );

  // Production validation rules:
  // If STORAGE_PROVIDER=r2 in production, fail fast if credentials are not configured.
  // Never silently fall back to local storage in production!
  if (isProduction && provider === "r2") {
    if (!accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error(
        "FATAL STORAGE CONFIGURATION: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are required when STORAGE_PROVIDER=r2 in production."
      );
    }
    if (!endpoint) {
      throw new Error(
        "FATAL STORAGE CONFIGURATION: R2_ENDPOINT or R2_ACCOUNT_ID is required to resolve Cloudflare R2 API endpoint."
      );
    }
  }

  // If STORAGE_PROVIDER is local in production, log advisory for stateless container environments
  if (isProduction && provider === "local") {
    console.warn(
      "[StorageConfig] ADVISORY: STORAGE_PROVIDER is 'local' in production. Uploaded documents will be stored on local disk. For stateless cloud deployments (Render, Railway, AWS ECS), set STORAGE_PROVIDER=r2 with Cloudflare R2 credentials."
    );
  }

  return {
    provider,
    isProduction,
    isR2Configured: isConfigured,
    r2: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      endpoint,
      publicUrl,
    },
  };
}

export default {
  getStorageConfig,
};
