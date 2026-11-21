import getEmailConfig from "./emailConfig.js";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangedEmailTemplate,
  getNewLoginAlertEmailTemplate,
  getSecurityAlertEmailTemplate,
} from "./emailTemplates.js";

// In-memory capture log for test verification and local dev inspection
const mockDeliveryLog = [];

export function getMockDeliveryLog() {
  return [...mockDeliveryLog];
}

export function clearMockDeliveryLog() {
  mockDeliveryLog.length = 0;
}

/**
 * Low-level dispatch function using official Resend SDK
 */
async function dispatchEmail({ to, subject, html, text }) {
  const config = getEmailConfig();

  // In production, strictly enforce that a valid Resend API client is configured
  if (process.env.NODE_ENV === "production" && (!config.isConfigured || !config.resendClient)) {
    const errorMsg =
      "FATAL EMAIL CONFIGURATION: RESEND_API_KEY is required for transactional email delivery in production. Cannot silently fall back to mock delivery.";
    console.error(`[Email Service] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // If Resend client is configured and NOT in simulated unit test mode
  if (config.isConfigured && config.resendClient && process.env.NODE_ENV !== "test") {
    try {
      const response = await config.resendClient.emails.send({
        from: config.fromEmail,
        to,
        subject,
        html,
        text,
      });

      if (response.error) {
        throw new Error(`Resend provider rejected email: ${response.error.message}`);
      }

      return {
        success: true,
        messageId: response.data?.id,
        deliveryMode: "resend",
        recipient: to,
        subject,
      };
    } catch (err) {
      console.error(`[Email Service] Failed to send email via Resend to ${to}:`, err.message);
      throw err;
    }
  }

  // Fallback / Mock delivery mode for test and development without live API key
  const mockRecord = {
    messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from: config.fromEmail,
    to,
    subject,
    html,
    text,
    timestamp: new Date(),
    deliveryMode: "mock",
  };

  mockDeliveryLog.push(mockRecord);

  // In test environment, keep quiet; in dev, log a helpful notification
  if (process.env.NODE_ENV !== "test") {
    console.log(`[Email Service] (Dev Mock) Email to ${to} captured. Subject: "${subject}"`);
  }

  return {
    success: true,
    messageId: mockRecord.messageId,
    deliveryMode: "mock",
    recipient: to,
    subject,
  };
}

/**
 * 1. Send Email Verification
 */
export async function sendVerificationEmail({ to, name, token }) {
  const { frontendUrl } = getEmailConfig();
  const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const { html, text } = getVerificationEmailTemplate({
    name,
    verificationUrl,
    expiresHours: 24,
  });

  return await dispatchEmail({
    to,
    subject: "Verify your email address — StudyMate AI",
    html,
    text,
  });
}

/**
 * 2. Send Password Reset Email
 */
export async function sendPasswordResetEmail({ to, name, token }) {
  const { frontendUrl } = getEmailConfig();
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const { html, text } = getPasswordResetEmailTemplate({
    name,
    resetUrl,
    expiresMinutes: 30,
  });

  return await dispatchEmail({
    to,
    subject: "Reset your StudyMate AI password",
    html,
    text,
  });
}

/**
 * 3. Send Password Changed Notification
 */
export async function sendPasswordChangedEmail({ to, name, userAgent, ipAddress }) {
  const { html, text } = getPasswordChangedEmailTemplate({
    name,
    timestamp: new Date(),
    userAgent,
    ipAddress,
  });

  return await dispatchEmail({
    to,
    subject: "Security Alert: StudyMate AI password changed",
    html,
    text,
  });
}

/**
 * 4. Send New Login Alert
 */
export async function sendNewLoginAlertEmail({ to, name, userAgent, ipAddress }) {
  const { html, text } = getNewLoginAlertEmailTemplate({
    name,
    timestamp: new Date(),
    userAgent,
    ipAddress,
  });

  return await dispatchEmail({
    to,
    subject: "New login to your StudyMate AI account",
    html,
    text,
  });
}

/**
 * 5. Send Account Security Alert
 */
export async function sendSecurityAlertEmail({ to, name, message }) {
  const { html, text } = getSecurityAlertEmailTemplate({
    name,
    alertMessage: message,
    timestamp: new Date(),
  });

  return await dispatchEmail({
    to,
    subject: "Security Alert — StudyMate AI Account Notice",
    html,
    text,
  });
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewLoginAlertEmail,
  sendSecurityAlertEmail,
  getMockDeliveryLog,
  clearMockDeliveryLog,
};
