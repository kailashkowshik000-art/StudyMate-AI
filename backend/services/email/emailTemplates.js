/**
 * StudyMate AI — Branded Transactional Email Templates (Phase 8.3)
 * Mobile-responsive, accessible HTML templates with StudyMate AI branding
 */

const BASE_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f8fafc;
    color: #1e293b;
    margin: 0;
    padding: 0;
    line-height: 1.6;
  }
  .container {
    max-width: 580px;
    margin: 30px auto;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    border: 1px solid #e2e8f0;
  }
  .header {
    background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
    padding: 32px 36px;
    text-align: left;
  }
  .brand-logo {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .brand-logo span {
    color: #818cf8;
  }
  .brand-sub {
    font-size: 11px;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
    display: block;
  }
  .body {
    padding: 36px;
  }
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 0;
    margin-bottom: 16px;
  }
  p {
    font-size: 14px;
    color: #475569;
    margin-bottom: 20px;
  }
  .button-wrapper {
    margin: 28px 0;
    text-align: center;
  }
  .button {
    display: inline-block;
    padding: 13px 28px;
    background-color: #4f46e5;
    color: #ffffff !important;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.25);
  }
  .info-box {
    background-color: #f1f5f9;
    border-radius: 10px;
    padding: 16px;
    margin: 20px 0;
    border-left: 4px solid #4f46e5;
  }
  .info-box p {
    margin: 0;
    font-size: 12px;
    color: #334155;
  }
  .url-text {
    word-break: break-all;
    font-size: 12px;
    color: #64748b;
    background: #f8fafc;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
  .footer {
    padding: 24px 36px;
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
  }
  .footer p {
    margin: 4px 0;
    font-size: 11px;
    color: #94a3b8;
  }
`;

/**
 * 1. Email Verification Template
 */
export function getVerificationEmailTemplate({ name, verificationUrl, expiresHours = 24 }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your StudyMate AI email</title>
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand-logo">StudyMate <span>AI</span></h1>
            <span class="brand-sub">Personalized Learning Intelligence</span>
          </div>
          <div class="body">
            <h2>Verify Your Email Address</h2>
            <p>${greeting}</p>
            <p>Welcome to StudyMate AI! To activate your full learning dashboard, upload study documents, and generate comprehensive AI study notes, please verify your email address.</p>
            <div class="button-wrapper">
              <a href="${verificationUrl}" class="button" target="_blank">Verify Email Address</a>
            </div>
            <div class="info-box">
              <p>⏱️ This verification link expires in <strong>${expiresHours} hours</strong>. If you did not create a StudyMate AI account, no further action is needed.</p>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Button not working? Copy and paste this link into your browser:</p>
            <div class="url-text">${verificationUrl}</div>
          </div>
          <div class="footer">
            <p>© 2026 StudyMate AI. All rights reserved.</p>
            <p>This is an automated operational notification regarding your account security.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to StudyMate AI!
${greeting}

Please verify your email address to activate your full learning dashboard:
${verificationUrl}

This link expires in ${expiresHours} hours. If you did not create this account, please disregard this email.
  `.trim();

  return { html, text };
}

/**
 * 2. Password Reset Template
 */
export function getPasswordResetEmailTemplate({ name, resetUrl, expiresMinutes = 30 }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your StudyMate AI password</title>
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand-logo">StudyMate <span>AI</span></h1>
            <span class="brand-sub">Personalized Learning Intelligence</span>
          </div>
          <div class="body">
            <h2>Password Reset Request</h2>
            <p>${greeting}</p>
            <p>We received a request to reset the password for your StudyMate AI account. Click the button below to choose a new password:</p>
            <div class="button-wrapper">
              <a href="${resetUrl}" class="button" target="_blank">Reset My Password</a>
            </div>
            <div class="info-box">
              <p>⏱️ This link is single-use and will expire in <strong>${expiresMinutes} minutes</strong>.</p>
              <p style="margin-top: 6px;">🔒 If you did not request this password reset, please ignore this email. Your password will remain completely secure.</p>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Button not working? Copy and paste this URL into your browser:</p>
            <div class="url-text">${resetUrl}</div>
          </div>
          <div class="footer">
            <p>© 2026 StudyMate AI. All rights reserved.</p>
            <p>Security Notice: StudyMate AI will never ask for your password via email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
StudyMate AI Password Reset Request
${greeting}

A password reset was requested for your StudyMate AI account. Use the link below to choose a new password:
${resetUrl}

This single-use link expires in ${expiresMinutes} minutes. If you did not request this change, please ignore this email.
  `.trim();

  return { html, text };
}

/**
 * 3. Password Changed Confirmation Template
 */
export function getPasswordChangedEmailTemplate({ name, timestamp = new Date(), userAgent, ipAddress }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const formattedTime = new Date(timestamp).toUTCString();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your StudyMate AI password has been changed</title>
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand-logo">StudyMate <span>AI</span></h1>
            <span class="brand-sub">Personalized Learning Intelligence</span>
          </div>
          <div class="body">
            <h2>Your Password Has Been Updated</h2>
            <p>${greeting}</p>
            <p>The password for your StudyMate AI account was successfully changed on <strong>${formattedTime}</strong>.</p>
            <div class="info-box">
              <p><strong>Device:</strong> ${userAgent || "Unknown Device"}</p>
              <p><strong>IP Address:</strong> ${ipAddress || "Unknown IP"}</p>
              <p style="margin-top: 6px;">All active sessions across other devices have been automatically revoked for your security.</p>
            </div>
            <p style="color: #b91c1c; font-size: 13px; font-weight: 600;">
              ⚠️ If you did not make this change, your account may be compromised. Please reset your password immediately or contact our support team.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 StudyMate AI. All rights reserved.</p>
            <p>Automated account security alert.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
StudyMate AI — Password Changed
${greeting}

Your account password was successfully updated on ${formattedTime}.
Device: ${userAgent || "Unknown"}
IP Address: ${ipAddress || "Unknown"}

All other device sessions have been revoked. If you did not perform this change, please reset your password immediately.
  `.trim();

  return { html, text };
}

/**
 * 4. New Login Alert Template
 */
export function getNewLoginAlertEmailTemplate({ name, timestamp = new Date(), userAgent, ipAddress }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const formattedTime = new Date(timestamp).toUTCString();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New login to your StudyMate AI account</title>
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand-logo">StudyMate <span>AI</span></h1>
            <span class="brand-sub">Personalized Learning Intelligence</span>
          </div>
          <div class="body">
            <h2>New Login Detected</h2>
            <p>${greeting}</p>
            <p>Your StudyMate AI account was just accessed from a new device or browser:</p>
            <div class="info-box">
              <p><strong>Time:</strong> ${formattedTime}</p>
              <p><strong>Device / Browser:</strong> ${userAgent || "Unknown"}</p>
              <p><strong>IP Address:</strong> ${ipAddress || "Unknown"}</p>
            </div>
            <p>If this was you, you can safely ignore this notification. If you do not recognize this activity, please sign out of all devices in your Account Settings and change your password.</p>
          </div>
          <div class="footer">
            <p>© 2026 StudyMate AI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
StudyMate AI — New Login Detected
${greeting}

A new login was recorded for your account:
Time: ${formattedTime}
Device: ${userAgent || "Unknown"}
IP: ${ipAddress || "Unknown"}

If this was not you, please sign out of all sessions immediately.
  `.trim();

  return { html, text };
}

/**
 * 5. Account Security Alert Template
 */
export function getSecurityAlertEmailTemplate({ name, alertMessage, timestamp = new Date() }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const formattedTime = new Date(timestamp).toUTCString();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StudyMate AI Security Alert</title>
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);">
            <h1 class="brand-logo">StudyMate <span>AI</span></h1>
            <span class="brand-sub">Security Operations Alert</span>
          </div>
          <div class="body">
            <h2>Security Notification</h2>
            <p>${greeting}</p>
            <div class="info-box" style="border-left-color: #ef4444; background-color: #fef2f2;">
              <p style="color: #991b1b; font-weight: 600;">${alertMessage}</p>
              <p style="color: #7f1d1d; margin-top: 4px; font-size: 11px;">Timestamp: ${formattedTime}</p>
            </div>
            <p>As a precaution, automated safeguards have been activated. Please review your active login sessions and verify your credentials.</p>
          </div>
          <div class="footer">
            <p>© 2026 StudyMate AI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
StudyMate AI Security Alert
${greeting}

${alertMessage}
Timestamp: ${formattedTime}

Please review your account security settings.
  `.trim();

  return { html, text };
}

export default {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangedEmailTemplate,
  getNewLoginAlertEmailTemplate,
  getSecurityAlertEmailTemplate,
};
