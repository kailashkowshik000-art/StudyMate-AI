# StudyMate AI — MongoDB Atlas Persistent Storage Setup Guide

This guide walks through configuring MongoDB Atlas for production-grade persistent data storage in StudyMate AI.

---

## 1. Create a MongoDB Atlas Cluster

1. Sign in to your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
2. In the organization or project dashboard, click **Create**.
3. Choose your configuration:
   - **Cluster Type:** **M0 (Free)** for development/staging, or **M10+** for production workloads.
   - **Cloud Provider & Region:** Select the region closest to your deployment server (e.g., AWS `us-east-1` or `ap-south-1`).
   - **Cluster Name:** `studymate-production` (or default `Cluster0`).
4. Click **Create Deployment**.

---

## 2. Configure Database Access (User Credentials)

1. In the Atlas navigation sidebar under **Security**, select **Database Access**.
2. Click **Add New Database User**.
3. Configure the user:
   - **Authentication Method:** Password
   - **Username:** `studymate_admin` (or your chosen username)
   - **Password:** Autogenerate a secure password or specify a strong 24+ character password.
     *(Save this password securely; do NOT commit it to Git.)*
   - **Database User Privileges:** **Read and write to any database** (or restrict to `studymate_ai`).
4. Click **Add User**.

---

## 3. Configure Network Access (IP Whitelist)

1. Under **Security** in the sidebar, select **Network Access**.
2. Click **Add IP Address**.
3. Choose an access rule based on your deployment architecture:
   - **For Cloud Container / Serverless Deployments (Render, Railway, Fly.io, Vercel, ECS):**
     - Select **Allow Access From Anywhere** (`0.0.0.0/0`).
     - *Security Note:* Atlas requires both valid username/password credentials AND TLS/SSL encryption for all connections.
   - **For Fixed-IP Servers (Dedicated VPS, AWS EC2, GCP Compute Engine):**
     - Add the specific public IP address of your production backend server.
4. Click **Confirm**.

---

## 4. Obtain the Connection String

1. In the sidebar under **Deployment**, select **Database**.
2. Locate your cluster and click **Connect**.
3. Choose **Drivers** under "Connect to your application".
   - **Driver:** Node.js
   - **Version:** 5.5 or later
4. Copy the connection string format:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Specify the target database name `studymate_ai` in the URI path:
   ```
   mongodb+srv://studymate_admin:<password>@cluster0.abcde.mongodb.net/studymate_ai?retryWrites=true&w=majority
   ```

---

## 5. Configure the Backend Environment

In your production environment variables (or local `backend/.env` file):

```ini
# Production Persistent Database Configuration
MONGODB_URI=mongodb+srv://studymate_admin:YOUR_ACTUAL_PASSWORD@cluster0.abcde.mongodb.net/studymate_ai?retryWrites=true&w=majority

# Disable In-Memory Database Fallback in Production
USE_MEMORY_DB=false

# Node Environment
NODE_ENV=production

# Database Connection Pool Settings
MONGO_MAX_POOL_SIZE=20
MONGO_MIN_POOL_SIZE=5
```

> [!IMPORTANT]
> - Never set `USE_MEMORY_DB=true` in production. StudyMate AI's database validation will automatically prevent startup if `USE_MEMORY_DB=true` is detected with `NODE_ENV=production`.
> - If `MONGODB_URI` contains `localhost` or is omitted in production, the server will intentionally fail to start to protect data durability.

---

## 6. Run Database Migrations & Indexing

To synchronize compound indexes and verify schema compatibility on Atlas:

```bash
cd backend
node scripts/migrate_database.js
```

---

## 7. Verify Persistent Storage

Once configured and the server is running:

1. **Verify Readiness Probe:**
   ```bash
   curl http://localhost:5000/healthz/ready
   ```
   Expected response:
   ```json
   {
     "status": "ready",
     "service": "studymate-ai-backend",
     "database": {
       "status": "connected",
       "readyState": 1,
       "host": "cluster0.abcde.mongodb.net",
       "name": "studymate_ai",
       "isMemoryDB": false,
       "isAtlas": true
     }
   }
   ```

2. **Verify Persistence Across Restarts:**
   - Upload a test PDF document via the StudyMate AI frontend.
   - Verify the document reaches `completed` status.
   - Stop and restart the backend server.
   - Reload the Documents page: all documents, text chunks, and vector embeddings remain intact and fully queryable.
