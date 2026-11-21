# StudyMate AI — Phase 6.2: MongoDB Atlas Connection & Diagnostics Report

**Date:** November 17, 2026  
**Active Workspace:** `C:\Users\kowshik kailas\OneDrive\Desktop\StudyMate-AI`  
**Status:** **CODE & ARCHITECTURE RESOLVED / PENDING ATLAS IP ACCESS LIST UPDATE**

---

## 1. Executive Summary

During Phase 6 validation, the StudyMate AI backend was observed falling back to an ephemeral in-memory MongoDB instance (`mongodb-memory-server`) instead of connecting to the configured production MongoDB Atlas cluster (`StudyMateCluster`).

A systematic audit across all configuration layers, database initialization modules, and network pathways uncovered four distinct technical root causes. All code and configuration defects have been repaired, validated with regression suites (36/36 passing), and hardened against silent failures. The remaining blocker is network-level IP authorization on the MongoDB Atlas cluster (`SSL alert number 80`).

---

## 2. Root Cause Analysis

### Root Cause 1: Dual `.env` Configuration Drift
- **Issue:** The repository contains two `.env` files: root (`.env`) and `backend/.env`. The user had placed the Atlas connection string inside the root `.env`, but `backend/.env` still contained:
  ```env
  MONGODB_URI=mongodb://localhost:27017/studymate
  USE_MEMORY_DB=true
  ```
- **Consequence:** Whenever commands or scripts ran inside the `backend/` directory, `backend/.env` was loaded, forcing the backend to attempt connecting to a non-existent local MongoDB on `127.0.0.1:27017` before falling back to memory DB.

### Root Cause 2: Working Directory Dependent `dotenv.config()`
- **Issue:** `backend/server.js` previously called bare `dotenv.config()`, which defaults to `path.resolve(process.cwd(), '.env')`.
- **Consequence:** If launched from project root, it loaded the root `.env`; if launched from `backend/`, it loaded `backend/.env`.

### Root Cause 3: Incomplete Atlas URI in Root `.env`
- **Issue:** The root `.env` contained:
  ```env
  mongodb+srv://studymate_app:[REDACTED]@studymatecluster.etg1wxd.mongodb.net/
  ```
- **Consequence:** The target database `studymate_db` and standard connection parameters `?retryWrites=true&w=majority` were omitted, defaulting writes to the administrative `test` namespace.

### Root Cause 4: Silent Fallback to Memory Database
- **Issue:** In `backend/config/db.js`, when a database connection failed in development, the application caught the error and either spawned `mongodb-memory-server` or returned `null`, allowing the HTTP server to bind to port 5000 without persistent storage.
- **Consequence:** Data persistence failures were concealed from developers and operators.

### Root Cause 5: Boolean Coercion Bug in `vectorSearchService.js`
- **Issue:** The condition `if (!process.env.USE_MEMORY_DB)` evaluated to `false` when `USE_MEMORY_DB="false"` because non-empty strings are truthy in JavaScript.
- **Consequence:** Vector search was permanently disabled even when the user intended to use Atlas.

### Root Cause 6: Atlas Network Access Firewall (`SSL alert number 80`)
- **Issue:** When connecting to `ac-3fpb2u9-shard-00-*.etg1wxd.mongodb.net:27017`, the TCP socket opens successfully, but the TLS handshake is terminated by Atlas with `tlsv1 alert internal error (SSL alert number 80)`.
- **Consequence:** In MongoDB Atlas, an incoming connection from an IP address not present in the cluster's **Network Access** IP Access List is dropped at the TLS gateway with SSL alert 80.

---

## 3. Files Inspected and Modified

| File | Status | Description of Changes |
| :--- | :--- | :--- |
| `backend/.env` | **Modified** | Updated `MONGODB_URI` to target `studymate_db`, set `USE_MEMORY_DB=false`, `PORT=5000`, `NODE_ENV=development`. |
| `.env` (root) | **Modified** | Synchronized with valid `studymate_db?retryWrites=true&w=majority` URI. |
| `backend/server.js` | **Modified** | Implemented deterministic path resolution for `.env`, added exit code 1 on fatal database failure. |
| `backend/config/db.js` | **Modified** | Removed silent fallback when `USE_MEMORY_DB=false`. Added exponential backoff retry (1s, 2s, 4s). Sanitized error messages. Fast-path memory DB only when `USE_MEMORY_DB=true`. |
| `backend/services/vectorSearchService.js` | **Modified** | Fixed string boolean comparison (`process.env.USE_MEMORY_DB !== 'true'`). |
| `backend/scripts/migrate_database.js` | **Modified** | Fixed dotenv path resolution to load root or backend `.env` reliably. |
| `backend/scripts/test_atlas_connection.js` | **Created** | Comprehensive diagnostic tool verifying DNS SRV records, TCP port 27017 reachability, and Atlas authentication with sanitized credential logging. |

---

## 4. Diagnostics & Network Verification

### DNS SRV Resolution
Executed using public DNS resolvers (`8.8.8.8`, `1.1.1.1`):
```text
✓ SRV DNS Lookup Success! Found 3 replica set shards:
  - ac-3fpb2u9-shard-00-00.etg1wxd.mongodb.net:27017
  - ac-3fpb2u9-shard-00-01.etg1wxd.mongodb.net:27017
  - ac-3fpb2u9-shard-00-02.etg1wxd.mongodb.net:27017
```

### TCP Layer Reachability
- **Host:** `ac-3fpb2u9-shard-00-00.etg1wxd.mongodb.net`
- **Port:** `27017`
- **Result:** `TcpTestSucceeded: True` (Outbound TCP communication over port 27017 is unobstructed by local firewall or ISP).

### TLS & Authorization Layer
- **Error:** `SSL routines:ssl3_read_bytes:tlsv1 alert internal error: SSL alert number 80`
- **Root Cause:** MongoDB Atlas Network Access access-control termination. Client dynamic IP address (`157.50.203.85` or IPv6) is not in the whitelist.

---

## 5. Security & Data Integrity Verification

- **Uploaded PDFs:** All 15 original documents in `backend/uploads/` were verified intact and untouched.
- **Secondary Workspace:** `C:\Projects\StudyMate-AI` was left completely untouched.
- **Credentials:** Passwords and full connection strings are strictly redacted as `[CREDENTIALS_REDACTED]` in all scripts, logs, and documentation.
- **Git Safety:** Neither `.env` nor `backend/.env` is tracked in version control.

---

## 6. Regression Testing

| Test Suite | Commands | Tests Passed | Status |
| :--- | :--- | :--- | :--- |
| **Phase 5.4 Database Persistence** | `npm run test:phase5.4` | 12 / 12 | **PASS** |
| **Phase 6 Master Release Suite** | `npm run test:phase6` | 24 / 24 | **PASS** |
| **Total Automated Tests** | | **36 / 36** | **PASS** |

---

## 7. Action Required: MongoDB Atlas IP Whitelist

To enable direct connection to MongoDB Atlas from your workstation, follow these steps:

1. Open your browser and go to the [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. In the left navigation menu under **Security**, click **Network Access**.
3. Click the green **+ Add IP Address** button.
4. Choose one of two options:
   - **Recommended for development:** Click **Allow Access from Anywhere** (`0.0.0.0/0`) with a temporary expiration (e.g., 6 hours or 24 hours).
   - **Specific IP:** Click **Add Current IP Address** (ensure both IPv4 `157.50.203.85` and any active IPv6 are included).
5. Click **Confirm** and wait 60 seconds for the Atlas firewall rule to deploy.
6. Run the diagnostic script to verify connection:
   ```powershell
   node backend/scripts/test_atlas_connection.js
   ```

---

## 8. Clarification on Terminal Errors (Screenshot Diagnosis)

In the user's terminal screenshot, three commands were executed:

### Command 1: `docker compose up -d --build`
- **Terminal Error:** `docker : The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.`
- **Explanation:** 
  1. Docker Desktop is installed at `C:\Users\kowshik kailas\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`, but the application **Docker Desktop is not running** on Windows, and this terminal session did not inherit Docker's path.
  2. To run with Docker, launch the **Docker Desktop** application from the Windows Start menu first, wait for the engine to initialize, and restart the terminal.

### Command 2: `curl http://localhost:3000/healthz/live`
- **Terminal Warning:** `Security Warning: Script Execution Risk... Invoke-WebRequest...`
- **Explanation:** In Windows PowerShell, `curl` is a built-in alias for `Invoke-WebRequest`. To execute real curl in PowerShell without warnings, run:
  ```powershell
  curl.exe http://localhost:3000/healthz/live
  ```
  *(Note: Port 3000 will only respond once the application is started).*

### Recommended Execution Path: Local Node.js (Option B)
While Docker Desktop is stopped, you can immediately run StudyMate AI locally using Option B from the guide:

**Terminal 1 (Backend API):**
```powershell
cd backend
npm run dev
```

**Terminal 2 (Frontend Web App):**
```powershell
cd frontend
npm run dev
```
Access the application at `http://localhost:5173` (or `http://localhost:3000` when running through Nginx/Docker).
