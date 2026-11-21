import { Resend } from "resend";

/**
 * StudyMate AI — Email Service Configuration (Phase 8.3)
 * Manages Resend API client, sender identities, and application URLs
 */

export function getEmailConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;

  // Resend keys typically begin with "re_"
  const isConfigured = !!(apiKey && apiKey.length > 5 && apiKey !== "your_resend_api_key_here");

  const fromEmail =
    process.env.EMAIL_FROM || "StudyMate AI <onboarding@resend.dev>";

  const frontendUrl =
    process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";

  const backendUrl =
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

  let resendClient = null;
  if (isConfigured) {
    try {
      resendClient = new Resend(apiKey);
    } catch (err) {
      console.error("[Email Config] Failed to initialize Resend client:", err.message);
    }
  }

  return {
    isProduction,
    isConfigured,
    apiKey,
    resendClient,
    fromEmail,
    frontendUrl: frontendUrl.replace(/\/$/, ""),
    backendUrl: backendUrl.replace(/\/$/, ""),
  };
}

export default getEmailConfig;
