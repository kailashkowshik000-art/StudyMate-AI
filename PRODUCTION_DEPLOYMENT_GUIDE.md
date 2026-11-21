# StudyMate AI v1.0.0 — Production Deployment Guide

This guide provides step-by-step instructions for deploying **StudyMate AI v1.0.0** to production environments with high availability, enterprise-grade security, distributed background processing, and complete data integrity.

---

## 1. Architecture & System Overview

StudyMate AI v1.0.0 is an intelligent educational and document-analysis platform composed of:
1. **Frontend Client**: React 18 SPA bundled with Vite, Tailwind CSS, Lucide icons, and KaTeX mathematical rendering.
2. **Backend API**: Node.js/Express REST server providing cookie-based authentication, CSRF protection, RAG document processing, and academic verification.
3. **Database**: MongoDB Atlas (v7.0+) replica set with automated indexing, transaction support, and Mongoose ODM.
4. **Cache & Job Queue**: Redis (v7.0+) powering BullMQ distributed workers for asynchronous document extraction, embedding generation, and note synthesis.
5. **Object Storage**: Cloudflare R2 (S3-compatible) for resilient, durable storage of raw student uploads and rendered artifacts.
6. **AI Services**: Google Gemini API (`gemini-1.5-pro` / `gemini-1.5-flash`) for multi-format document analysis, mathematical verification, and RAG QA.
7. **Transactional Email**: Resend API for cryptographically signed email verification, password reset tokens, and security notices.

```
+-----------------------------------------------------------------------------------+
|                                 STUDYMATE AI v1.0.0                               |
|                                                                                   |
|  +-----------------------+                    +--------------------------------+  |
|  |  React SPA (Vite)     |  HTTP-only / CSRF  |  Express API Server (Node 20+) |  |
|  |  (Vercel / Nginx)     | <----------------> |  - Cookie Auth & CSRF Guard   |  |
|  +-----------------------+                    |  - Winston Log Redaction       |  |
|                                               +--------------------------------+  |
|                                                    |      |         |      |      |
|             +--------------------------------------+      |         |      |      |
|             |                       |                     |         |      |      |
|             v                       v                     v         v      v      |
|   +-------------------+   +--------------------+      +-------+  +----+ +------+  |
|   |   MongoDB Atlas   |   |   Redis + BullMQ   |      | Cloud |  |    | |      |  |
|   |  (Replica Set)    |   |  (Job Queue/State) |      | flare |  | AI | | Mail |  |
|   |  - Users/Sessions |   |  - Doc Processing  |      |   R2  |  |    | |      |  |
|   |  - Documents/RAG  |   |  - Retry / Backoff |      | (S3)  |  | GM | | RZND |  |
|   +-------------------+   +--------------------+      +-------+  +----+ +------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Prerequisites & Third-Party Provisioning

Before deploying, ensure you have provisioned accounts and obtained credentials for the following services:

| Component | Provider | Tier / Minimum Requirement |
| :--- | :--- | :--- |
| **Database** | MongoDB Atlas | M0 (Sandbox) or M10+ (Production replica set) |
| **Object Store** | Cloudflare R2 | Standard Bucket with S3 API Tokens (Read/Write) |
| **Redis** | Upstash / Redis Cloud | Redis 7.0+ with TLS / AUTH |
| **LLM Provider** | Google Cloud / AI Studio | Gemini API Key with `gemini-1.5-flash` access |
| **Email Service** | Resend | Verified custom domain (DKIM, SPF, DMARC passed) |
| **Hosting (API)** | Render / Railway / Fly.io / AWS | 1 vCPU, 1 GB RAM minimum (Node 20+ LTS) |
| **Hosting (Web)** | Vercel / Netlify / Cloudflare Pages | Static Edge CDN / Node 20+ |

---

## 3. Environment Configuration Checklist

Create production environment variables in your deployment dashboard or secrets manager. **Never commit `.env` files to git.**

### Backend Environment Variables (`backend/.env`)

```ini
# --- Core Environment ---
NODE_ENV=production
PORT=5000
SERVER_URL=https://api.studymateai.com
FRONTEND_URL=https://studymateai.com

# --- MongoDB Atlas Connection ---
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/studymate?retryWrites=true&w=majority&appName=StudyMateCluster
DB_NAME=studymate

# --- Security & JWT Credentials ---
# Generate high-entropy 64-character hex strings: openssl rand -hex 32
JWT_SECRET=c29mZXNlY3JldGtleWZvcmF1dGhlbnRpY2F0aW9uY2hlY2tzc3R1ZHltYXRlYmk=
JWT_REFRESH_SECRET=dHJ1c3RlZHJlZnJlc2hrZXlmb3Jsb25nbGl2ZWRzZXNzaW9uc3N0dWR5bWF0ZQ==
COOKIE_SECRET=Y29va2llc2VjcmV0Zm9yc2lnbmVkY29va2llc2lucHJvZHVjdGlvbnZlcmlmeQ==
CSRF_SECRET=Y3NyZnNlY3JldGtleWZvcmRvdWJsZXN1Ym1pdGNvb2tpZXByb3RlY3Rpb252MQ==

# --- Cloudflare R2 Storage (S3-Compatible) ---
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=studymate-documents
R2_PUBLIC_DOMAIN=https://assets.studymateai.com
R2_ENDPOINT=https://<your_cloudflare_account_id>.r2.cloudflarestorage.com

# --- Redis & BullMQ Queue ---
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_auth_password
REDIS_TLS=true
DOCUMENT_QUEUE_CONCURRENCY=3
DOCUMENT_QUEUE_MAX_ATTEMPTS=3

# --- Google Gemini AI API ---
GEMINI_API_KEY=AIzaSyYourProductionGeminiAPIKeyHere
GEMINI_MODEL=gemini-1.5-flash

# --- Resend Transactional Email (Required in Production) ---
RESEND_API_KEY=re_YourProductionResendKey_abc123
EMAIL_FROM_ADDRESS=notifications@studymateai.com
EMAIL_FROM_NAME=StudyMate AI
EMAIL_SUPPORT_ADDRESS=support@studymateai.com

# --- Monitoring & Security Policies ---
ENABLE_HELMET_CSP=true
LOG_LEVEL=info
```

### Frontend Environment Variables (`frontend/.env`)

```ini
# Production API Base URL (must match your backend domain)
VITE_API_URL=https://api.studymateai.com/api/v1
```

---

## 4. Deployment Option A: Docker Compose Deployment

For containerized deployments on a dedicated VM (AWS EC2, DigitalOcean Droplet, Hetzner, GCP Compute Engine).

### Step 1: Configure Docker Environment
Clone the repository and verify environment files:
```bash
git clone https://github.com/your-org/studymate-ai.git
cd studymate-ai
cp .env.example .env
# Edit .env with your production secrets
```

### Step 2: Build and Launch Containers
```bash
docker compose -f docker-compose.yml up -d --build
```

### Step 3: Verify Container Health
```bash
docker compose ps
docker compose logs -f backend
```

---

## 5. Deployment Option B: Cloud-Managed Platform Deployment

Recommended for production scalability with zero server management overhead.

### 5.1 Backend Deployment (e.g., Render / Railway / Fly.io)
1. **Repository Link**: Connect your GitHub repository.
2. **Root Directory**: Select `backend`.
3. **Build Command**: `npm ci`
4. **Start Command**: `npm start`
5. **Environment Variables**: Add all backend variables from Section 3.
6. **Health Check Path**: `/healthz/live`
7. **Auto-Deploy**: Enabled on branch `main` or release tag `v1.0.0`.

### 5.2 Frontend Deployment (e.g., Vercel / Netlify / Cloudflare Pages)
1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variable**: `VITE_API_URL=https://api.studymateai.com/api/v1`
6. **Rewrites / Single-Page Application Rule**:
   Add `vercel.json` or `_redirects` for client-side routing:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 6. Pre-Flight Verification & Health Checks

Once deployed, run the automated health checks to verify all system components.

### 6.1 Liveness Probe
```bash
curl -I https://api.studymateai.com/healthz/live
```
**Expected Response**: `HTTP/1.1 200 OK`

### 6.2 Readiness Probe (Database & Storage Checks)
```bash
curl -s https://api.studymateai.com/healthz/ready | jq .
```
**Expected Response**:
```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "connected", "latencyMs": 14 },
    "storage": { "provider": "r2", "status": "accessible" },
    "redis": { "status": "ready", "pingMs": 8 }
  },
  "timestamp": "2026-11-21T12:00:00.000Z"
}
```

### 6.3 BullMQ Queue Statistics
```bash
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" https://api.studymateai.com/api/v1/queue/stats | jq .
```

---

## 7. Security Hardening & Production Safeguards

StudyMate AI v1.0.0 includes built-in safeguards to protect students and prevent data leakage:

1. **Email Fail-Fast Rule**:
   If `NODE_ENV === "production"` and `RESEND_API_KEY` is missing, the backend throws a fatal exception on startup. This prevents the system from silently queueing mock emails that users will never receive.

2. **Ephemeral Disk Advisory**:
   If running on a cloud container with `STORAGE_PROVIDER=local`, a warning is logged alerting operators that uploads will be lost on container restart. Always use `STORAGE_PROVIDER=r2` in production.

3. **Log Sanitization**:
   All Winston logger outputs pass through regex redaction masks that automatically scrub:
   - Passwords and auth hashes
   - JWT tokens and session cookies
   - MongoDB connection strings and credentials
   - R2 and Gemini API keys

4. **CSRF Double-Submit Protection**:
   All mutating HTTP requests (`POST`, `PUT`, `DELETE`, `PATCH`) validate the `X-CSRF-Token` header against the encrypted HTTP-only CSRF cookie.

---

## 8. Backup, Rollback & Disaster Recovery

### MongoDB Atlas Backups
- Enable **Continuous Cloud Backups** in Atlas Project Settings (1-minute RPO point-in-time recovery).
- Retain daily snapshots for 30 days and weekly snapshots for 90 days.

### Cloudflare R2 Object Versioning
- Enable **Object Versioning** on the R2 bucket `studymate-documents` to protect against accidental file deletions.
- Configure lifecycle rules to transition soft-deleted files after 30 days.

### Zero-Downtime Rollback Procedure
If a production issue arises after deploying `v1.0.0`:
1. **Frontend**: In Vercel/Netlify dashboard, click "Instant Rollback" to the previous stable deployment hash (takes < 2 seconds).
2. **Backend**: Trigger redeploy of previous git tag (e.g., `git checkout v0.9.x`).
3. **Database Migrations**: All collections utilize additive schema models; no destructive database rollbacks are required.

---

## 9. Operational Support & Runbook Contacts

- **Security Alerts**: security@studymateai.com
- **Operations Runbook**: [docs/RUNBOOK.md](file:///c:/Users/kowshik%20kailas/OneDrive/Desktop/StudyMate-AI/docs/RUNBOOK.md)
- **API Documentation**: [docs/API_REFERENCE.md](file:///c:/Users/kowshik%20kailas/OneDrive/Desktop/StudyMate-AI/docs/API_REFERENCE.md)
