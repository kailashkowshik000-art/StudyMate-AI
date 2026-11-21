# StudyMate AI — Production Deployment & Containerization Guide

This guide details the steps to deploy StudyMate AI to production using Docker Compose, containerized multi-stage builds, MongoDB Atlas managed database, and modern cloud hosting environments.

---

## 1. Production Architecture Overview

StudyMate AI is organized into two production-hardened microservices:

```
                  ┌──────────────────────────────────────────────┐
                  │               Internet Traffic               │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTP (Port 80 / 3000)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           Frontend (Nginx 1.27)              │
                  │  - Serves static React/Vite SPA bundle       │
                  │  - Gzip compression & asset caching          │
                  │  - SPA client route fallback (/index.html)   │
                  │  - Reverse proxies /api/ -> backend:5000     │
                  │  - Reverse proxies /uploads/ -> backend:5000 │
                  └──────────────────────┬───────────────────────┘
                                         │ Internal Docker Bridge
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           Backend (Node.js 20 LTS)           │
                  │  - Express REST API (Non-root 'node' user)   │
                  │  - Helmet security headers & rate limits     │
                  │  - JWT authentication & request tracing      │
                  │  - Asynchronous background PDF worker queue  │
                  │  - Winston structured logging (auto-redact)  │
                  └──────────────┬───────────────────┬───────────┘
                                 │                   │
               Persistent Volume │                   │ TLS / Internet
                                 ▼                   ▼
     ┌───────────────────────────────┐   ┌───────────────────────────────┐
     │ Docker Volume:                │   │ External Managed Services:    │
     │ studymate_uploads             │   │ • MongoDB Atlas (Database)    │
     │ (/app/uploads)                │   │ • Google Gemini 1.5 (AI Engine│
     └───────────────────────────────┘   └───────────────────────────────┘
```

---

## 2. Prerequisites & System Requirements

### Host Requirements
- **Docker Engine**: Version 24.0+ (or Docker Desktop on Windows/macOS).
- **Docker Compose**: Version 2.20+ (`docker compose`).
- **RAM**: Minimum 2 GB (4 GB recommended for production workloads).
- **Disk**: Minimum 10 GB free space for images and persistent PDF uploads.

### External Service Credentials
1. **MongoDB Atlas Account**: M0 Free Tier or M10+ dedicated cluster (see [`docs/MONGODB_ATLAS_SETUP.md`](./MONGODB_ATLAS_SETUP.md)).
2. **Google Gemini API Key**: Acquired from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 3. Environment Variable Configuration

Create a `.env` file in the project root by copying the template:

```bash
cp .env.example .env
```

Populate the following variables with your production values:

```bash
# Environment Mode
NODE_ENV=production

# Network Ports
PORT=5000
BACKEND_PORT=5000
FRONTEND_PORT=3000

# Client URL (Must match your domain or IP)
CLIENT_URL=http://localhost:3000

# Persistent MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@<cluster-address>.mongodb.net/studymate_db?retryWrites=true&w=majority&appName=StudyMateAI

# Strict Database Flag (Must be false in production)
USE_MEMORY_DB=false

# JWT Secret (Generate a strong 64-character random hex string)
# Command: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
JWT_SECRET=c8f58b73a5a782b460d6a2f32f059cb65063071bb21cb34e9e0487d2ef1495c0

# Google Gemini API Key
GEMINI_API_KEY=AIzaSy...your_gemini_key

# Gemini Model
GEMINI_MODEL=gemini-1.5-flash
```

> [!CAUTION]
> Never commit `.env` or paste live API keys into git repositories. `.env` is ignored by both `.gitignore` and `.dockerignore`.

---

## 4. Building & Running with Docker Compose

### 1. Build Production Images
```bash
docker compose build --no-cache
```

### 2. Run Database Index Migration
Before launching the service for user traffic, run the database migration container to build indexes:
```bash
docker compose run --rm backend node scripts/migrate_database.js
```

### 3. Start Services in Detached Mode
```bash
docker compose up -d
```

### 4. Verify Running Containers
```bash
docker compose ps
```
Both `studymate-backend` and `studymate-frontend` should report status `Up (healthy)`.

### 5. Inspect Logs
```bash
# Stream backend logs
docker compose logs -f backend

# Stream frontend logs
docker compose logs -f frontend
```

### 6. Stop Services
```bash
docker compose down
```

---

## 5. Health Checks & Verification

Verify each endpoint using `curl` or a web browser:

### 1. Process Liveness Check (Kubernetes / Load Balancer)
```bash
curl -i http://localhost:5000/healthz/live
```
**Expected Response**: `HTTP/1.1 200 OK`
```json
{
  "status": "ok",
  "service": "studymate-ai-backend",
  "uptime": 45,
  "timestamp": "2026-11-17T06:30:00.000Z"
}
```

### 2. Database Readiness Check
```bash
curl -i http://localhost:5000/healthz/ready
```
**Expected Response**: `HTTP/1.1 200 OK`
```json
{
  "status": "ready",
  "database": {
    "status": "connected",
    "isAtlas": true,
    "host": "cluster0.abcde.mongodb.net",
    "name": "studymate_db"
  },
  "timestamp": "2026-11-17T06:30:00.000Z"
}
```

### 3. Frontend Web Application Check
```bash
curl -I http://localhost:3000/
```
**Expected Response**: `HTTP/1.1 200 OK` with `Content-Type: text/html`

---

## 6. Persistent Storage & Object Storage Migration Path

### Current Storage Architecture (Docker Volume)
Uploaded PDF files are stored on a persistent Docker volume named `studymate_uploads` mounted to `/app/uploads` in the backend container:

```yaml
volumes:
  studymate_uploads:
    name: studymate_uploads
    driver: local
```

- When containers are stopped, removed, or upgraded via `docker compose down && docker compose up -d`, the volume remains intact and files persist.
- Volume location on host: `/var/lib/docker/volumes/studymate_uploads/_data`.

### Future Migration Path: AWS S3 / Cloudflare R2
For multi-instance horizontal scaling (e.g. across Kubernetes pods or multi-container serverless instances), migrate local filesystem storage to AWS S3 or Cloudflare R2:

1. **Install SDK**:
   ```bash
   npm --prefix backend install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```
2. **Update `fileService.js`**:
   - Ingest PDF streams directly to `s3Client.send(new PutObjectCommand({ ... }))`.
   - Store object `Key` and bucket name in `Document.filePath` / `Document.storageKey`.
3. **Download Endpoint (`downloadDocument`)**:
   - Issue temporary signed URLs via `getSignedUrl(s3Client, new GetObjectCommand({ ... }), { expiresIn: 300 })` rather than piping local filesystem disk streams.
4. **Worker Pipeline (`documentProcessingWorker.js`)**:
   - Worker fetches byte buffer from S3 bucket directly for chunking and text extraction.

---

## 7. Cloud Deployment Options

### Option A: Virtual Private Server (VPS) / Ubuntu + Docker Compose
*Recommended for low-cost, self-contained single-host production deployments (DigitalOcean Droplet, Linode, AWS EC2, Hetzner).*

1. Provision an Ubuntu 22.04 LTS server (minimum 2 vCPU, 4GB RAM).
2. Install Docker & Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo systemctl enable --now docker
   ```
3. Clone repository and set up `.env`:
   ```bash
   git clone <repo-url> /opt/studymate-ai
   cd /opt/studymate-ai
   cp .env.example .env
   nano .env
   ```
4. Configure HTTPS with Certbot / Caddy reverse proxy on port 443 pointing to `http://localhost:3000`.
5. Launch services:
   ```bash
   docker compose up -d
   ```

### Option B: Render.com (PaaS)
1. **Backend Service**:
   - Create a **Web Service** on Render.
   - Root directory: `backend`.
   - Environment: `Docker`.
   - Add persistent disk: mount path `/app/uploads`, size 5GB.
   - Configure Environment Variables (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `NODE_ENV=production`, `CLIENT_URL=https://<your-frontend>.onrender.com`).
2. **Frontend Service**:
   - Create a **Static Site** on Render.
   - Root directory: `frontend`.
   - Build Command: `npm install && npm run build`.
   - Publish Directory: `dist`.
   - Environment Variables: `VITE_API_URL=https://<your-backend>.onrender.com/api`.
   - Add Rewrite Rule: `/* -> /index.html` (Rewrite, 200).

### Option C: Railway.app
1. Create a new Project from GitHub repository.
2. Railway detects `docker-compose.yml` automatically or builds individual services:
   - For backend: Set environment variables and attach a persistent volume to `/app/uploads`.
   - For frontend: Deploy using `frontend/Dockerfile`.

### Option D: AWS (ECS Fargate + EFS)
- Push container images to AWS Elastic Container Registry (ECR).
- Deploy tasks using AWS ECS Fargate with an Amazon EFS mount on `/app/uploads` to allow multiple task replicas to access shared PDF uploads.
- Route traffic through an Application Load Balancer (ALB) with SSL/TLS termination.

---

## 8. Backup & Disaster Recovery

### 1. MongoDB Atlas Automated Backups
- Enable continuous cloud backups in MongoDB Atlas under **Backup** settings (Point-in-Time Restore with RPO < 1 minute).
- Export periodic logical dumps:
  ```bash
  mongodump --uri="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/studymate_db" --out=/backups/$(date +%F)
  ```

### 2. Uploaded Document Volume Backups
Backup the persistent Docker volume using an ephemeral utility container:
```bash
# Export volume to tar.gz
docker run --rm -v studymate_uploads:/volume -v $(pwd):/backup alpine \
  tar -czf /backup/studymate_uploads_backup_$(date +%F).tar.gz -C /volume .

# Restore volume from tar.gz
docker run --rm -v studymate_uploads:/volume -v $(pwd):/backup alpine \
  tar -xzf /backup/studymate_uploads_backup_<date>.tar.gz -C /volume
```

---

## 9. Troubleshooting & FAQ

| Symptom | Cause | Solution |
|---|---|---|
| **Backend container fails at startup** | Missing or invalid `MONGODB_URI` or `JWT_SECRET`. | Inspect logs via `docker compose logs backend`. Verify that `MONGODB_URI` targets an Atlas cluster and `USE_MEMORY_DB=false`. |
| **Readiness probe returns HTTP 503** | MongoDB Atlas IP access list blocked container host. | Add server IP (or `0.0.0.0/0`) in Atlas Network Access -> IP Access List. |
| **PDF upload returns HTTP 400** | File exceeds 25MB or is not valid PDF (%PDF- header missing). | Verify file type and size. Ensure Nginx `client_max_body_size` is 30M. |
| **Frontend routes return 404 on refresh** | Nginx missing SPA fallback rule. | Verify `frontend/nginx.conf` contains `try_files $uri $uri/ /index.html;`. |
| **CORS error on API requests** | `CLIENT_URL` does not match frontend origin. | Set `CLIENT_URL` in `.env` to match the exact protocol and host of the frontend (e.g., `https://study.mydomain.com`). |
