# StudyMate AI — Phase 6.2: Node.js DNS Resolution & Atlas SRV Fix Report

**Date:** November 17, 2026  
**Active Workspace:** `C:\Users\kowshik kailas\OneDrive\Desktop\StudyMate-AI`  
**Status:** **RESOLVED & VERIFIED (DNS Subsystem Repaired / Pending Atlas IP Access List)**

---

## 1. Root Cause

When the backend attempts to connect to MongoDB Atlas using an SRV connection string (`mongodb+srv://`), the MongoDB driver invokes Node.js's internal DNS resolver (`dns.resolveSrv`) to resolve the cluster SRV record (`_mongodb._tcp.studymatecluster.etg1wxd.mongodb.net`).

On Windows workstations, Node.js uses the `c-ares` asynchronous DNS library. In many standard Windows networking environments, `c-ares` relies on the operating system adapter's default DNS server over UDP. In typical domestic, Wi-Fi, or office networks, these local gateways or ISP resolvers reject, drop, or fail UDP SRV queries, causing Node.js to return:

```text
querySrv ECONNREFUSED _mongodb._tcp.studymatecluster.etg1wxd.mongodb.net
```

### Key Technical Observations:
1. **Windows System DNS vs. Node.js `c-ares`**: Windows `Resolve-DnsName` or `nslookup` can resolve SRV records when directed to public DNS (`8.8.8.8`), but Node.js's default resolver does not automatically fallback to public DNS unless explicitly told via `dns.setServers()`.
2. **ES Module Hoisting**: In ECMAScript Modules (`"type": "module"`), static `import` declarations are evaluated before the module body executes. If DNS servers are set in application logic after Mongoose or route modules are imported, models and drivers may initialize with stale or unconfigured resolvers.
3. **Reproduced Evidence**:
   - Default Node.js query:
     ```text
     node -e "require('dns').promises.resolveSrv('_mongodb._tcp.studymatecluster.etg1wxd.mongodb.net').catch(e => console.error(e.code))"
     -> ECONNREFUSED
     ```
   - Node.js query with `dns.setServers(['8.8.8.8', '8.8.4.4'])`:
     ```text
     -> Successfully resolved all 3 SRV records in 180ms.
     ```

---

## 2. Files Inspected and Modified

| File | Status | Description of Changes |
| :--- | :--- | :--- |
| `backend/config/dns.js` | **Created** | Dedicated DNS resolution manager. Handles environment parsing, safe array/string conversion, production safeguards, and automatic execution. |
| `backend/server.js` | **Modified** | Imported `./config/dns.js` as line 1 before any other modules, guaranteeing execution before Mongoose or HTTP server initialization. |
| `backend/app.js` | **Modified** | Imported `./config/dns.js` as line 1 to ensure automated test suites importing `app.js` benefit from configured DNS. |
| `backend/config/db.js` | **Modified** | Imported `configureDNS` and called it prior to `mongoose.connect()`. |
| `backend/scripts/migrate_database.js` | **Modified** | Added `import "../config/dns.js";` before Mongoose models are imported. |
| `backend/scripts/test_atlas_connection.js` | **Modified** | Integrated `../config/dns.js` and added active DNS resolvers to the diagnostic audit output. |
| `backend/.env` | **Modified** | Added `DNS_SERVERS=8.8.8.8,8.8.4.4`. |
| `.env` (root) | **Modified** | Added documented optional `DNS_SERVERS` setting. |
| `backend/tests/verify_dns_resolver.js` | **Created** | 10-test automated verification suite for the DNS subsystem. |
| `backend/package.json` | **Modified** | Added `test:dns` script and linked it to `test:all`. |

---

## 3. DNS Configuration Implemented

The DNS configuration logic is centralized in [`backend/config/dns.js`](file:///C:/Users/kowshik%20kailas/OneDrive/Desktop/StudyMate-AI/backend/config/dns.js):

### Configuration Rules & Behavior:
1. **Development & Test Defaults (`NODE_ENV !== "production"`):**
   - Automatically sets Node.js DNS resolvers to Google Public DNS: `['8.8.8.8', '8.8.4.4']`.
   - Prevents `ECONNREFUSED` on Windows during Atlas SRV lookups.
2. **Environment Variable Override (`DNS_SERVERS`):**
   - Allows operators to configure custom resolvers via `DNS_SERVERS` (e.g., `DNS_SERVERS=8.8.8.8,8.8.4.4` or `DNS_SERVERS=1.1.1.1,1.0.0.1`).
   - Supports comma-separated, space-separated, or array formats.
3. **Production Guard (`NODE_ENV === "production"`):**
   - In production, Node.js DNS configuration is **NEVER** overridden unless the hosting platform explicitly defines the `DNS_SERVERS` environment variable. Container networking (e.g. Docker embedded DNS `127.0.0.11`) and cloud VPC DNS are strictly preserved by default.
4. **Bypass Flag:**
   - Setting `DNS_SERVERS=system` or `none` disables custom DNS configuration in any environment.
5. **Execution Order Guarantee:**
   - Evaluated as the very first import in `server.js`, `app.js`, `db.js`, and migration scripts, running before any Mongoose model or network call.

---

## 4. DNS Resolution Test Results

Tested with `backend/tests/verify_dns_resolver.js`:

```text
======================================================================
  STUDYMATE AI - DNS RESOLVER VERIFICATION SUITE
======================================================================

--- 1. PARSER VALIDATION ---
  [PASS] Test 1: Comma-separated DNS servers string parses correctly
         Result: ["8.8.8.8","8.8.4.4"]
  [PASS] Test 2: Space-separated DNS servers string parses correctly
         Result: ["1.1.1.1","1.0.0.1"]
  [PASS] Test 3: Array of DNS servers parses correctly
         Result: ["9.9.9.9","149.112.112.112"]

--- 2. DEVELOPMENT & ENVIRONMENT BEHAVIOR ---
[DNS Config] Node.js DNS servers configured: 8.8.8.8, 8.8.4.4
  [PASS] Test 4: In development, defaults to Google Public DNS ['8.8.8.8', '8.8.4.4']
         Active servers: 8.8.8.8, 8.8.4.4
[DNS Config] Node.js DNS servers configured: 1.1.1.1, 1.0.0.1
  [PASS] Test 5: Explicit DNS_SERVERS environment variable overrides default resolvers
         Active servers: 1.1.1.1, 1.0.0.1
  [PASS] Test 6: DNS_SERVERS='system' bypasses override without throwing error
         Active servers: 1.1.1.1, 1.0.0.1

--- 3. PRODUCTION ENVIRONMENT SAFEGUARDS ---
  [PASS] Test 7: In production, DNS configuration is NEVER overridden unless DNS_SERVERS is explicitly configured
         Prod active servers unchanged: 127.0.0.1
[DNS Config] Node.js DNS servers configured: 8.8.8.8, 8.8.4.4
  [PASS] Test 8: In production, DNS_SERVERS override is permitted when explicitly configured by deployment environment
         Prod configured servers: 8.8.8.8, 8.8.4.4

--- 4. LIVE MONGODB ATLAS SRV RESOLUTION ---
[DNS Config] Node.js DNS servers configured: 8.8.8.8, 8.8.4.4
Resolving SRV records for: _mongodb._tcp.studymatecluster.etg1wxd.mongodb.net
  [PASS] Test 9: Successfully resolved all three MongoDB Atlas SRV shard records
         Resolved shards:
         - ac-3fpb2u9-shard-00-02.etg1wxd.mongodb.net:27017 (priority: 0, weight: 0)
         - ac-3fpb2u9-shard-00-00.etg1wxd.mongodb.net:27017 (priority: 0, weight: 0)
         - ac-3fpb2u9-shard-00-01.etg1wxd.mongodb.net:27017 (priority: 0, weight: 0)
  [PASS] Test 10: All three replica set shards (shard-00-00, shard-00-01, shard-00-02) identified
         All shards present in SRV response.

======================================================================
DNS RESOLVER TEST RESULTS: Passed: 10 / 10, Failed: 0 / 10
======================================================================
```

---

## 5. MongoDB Atlas Connection Test Results

Using [`backend/scripts/test_atlas_connection.js`](file:///C:/Users/kowshik%20kailas/OneDrive/Desktop/StudyMate-AI/backend/scripts/test_atlas_connection.js):

| Stage | Status | Observation |
| :--- | :--- | :--- |
| **URI Format Audit** | **PASS** | Valid `mongodb+srv://`, targets `studymate_db`, includes `retryWrites=true&w=majority`. |
| **Credential Redaction** | **PASS** | Passwords strictly masked as `[CREDENTIALS_REDACTED]` in all logs. |
| **DNS Resolution** | **PASS** | `_mongodb._tcp.studymatecluster.etg1wxd.mongodb.net` resolves all 3 replica shards instantly. |
| **TCP Port 27017 Socket** | **PASS** | Outbound TCP communication is unobstructed by host firewall or ISP. |
| **Atlas TLS Handshake** | **BLOCKED BY ATLAS FIREWALL** | `SSL routines:ssl3_read_bytes:tlsv1 alert internal error: SSL alert number 80`. In MongoDB Atlas, incoming requests from IPs not in the **Network Access** IP Access List receive an SSL Alert 80 rejection at the TLS layer. |

---

## 6. Backend Health Test Results

Verified via direct Express dispatch against `/healthz/live` and `/healthz/ready`:

- **Liveness Probe (`GET /healthz/live`):**
  - **HTTP Status:** `200 OK`
  - **Payload:** `{"status":"ok","service":"studymate-ai-backend","uptime":4}`
- **Readiness Probe (`GET /healthz/ready`):**
  - **HTTP Status:** `503 Service Unavailable`
  - **Payload:** `{"status":"not_ready","service":"studymate-ai-backend","database":{"status":"disconnected","readyState":0,"message":"Database connection is not ready"}}`
  - **Security Audit:** Zero database credentials, passwords, or host connection strings leaked.

---

## 7. Full Regression Test Results

All test suites were executed sequentially via `npm run test:all`:

| Test Suite | File | Tests Run | Tests Passed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DNS Subsystem** | `verify_dns_resolver.js` | 10 | 10 | **PASS** |
| **Security Hardening** | `verify_security.js` | 12 | 12 | **PASS** |
| **Async Upload & Queue** | `verify_phase5_3.js` | 12 | 12 | **PASS** |
| **Database Persistence** | `verify_phase5_4.js` | 12 | 12 | **PASS** |
| **Phase 6 Master Suite** | `verify_phase6_master.js` | 24 | 24 | **PASS** |
| **Total Test Suite** | | **70** | **70** | **100% PASS** |

### Frontend Compatibility:
- **Build Status:** Verified via `npm run build` in `frontend/`.
- **Result:** Successfully compiled 1,606 modules in 5.08s (`dist/index.html`, 245.5 kB JS, 42.4 kB CSS).

### File & Data Safety:
- **Preserved Uploads:** All 17 user PDF documents in `backend/uploads/` remain intact and untouched.
- **Secondary Workspace:** `C:\Projects\StudyMate-AI` was left completely untouched.

---

## 8. Remaining Issues & Action Item

The DNS resolution problem is **100% resolved**. The backend now reliably discovers and contacts the Atlas cluster nodes.

The final step to complete database connection to your Atlas cluster is:

1. Log in to [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Under **Security** in the left sidebar, click **Network Access**.
3. Click the green **+ Add IP Address** button.
4. Select **Allow Access from Anywhere** (`0.0.0.0/0`) or enter your current IP (`157.50.203.85`).
5. Click **Confirm** and wait ~1 minute for Atlas to update.
6. Verify connection by running:
   ```powershell
   node backend/scripts/test_atlas_connection.js
   ```
