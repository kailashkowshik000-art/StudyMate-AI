# StudyMate AI — Phase 6.4: MongoDB Atlas Backend Direct Connection Report

**Date:** November 20, 2026  
**Active Workspace:** `C:\Users\kowshik kailas\OneDrive\Desktop\StudyMate-AI`  
**Status:** **INVESTIGATION COMPLETED / MCP OPERATIONAL / BACKEND BLOCKED ON ATLAS IP ACCESS LIST**

---

## 1. Executive Summary

This investigation analyzed the direct connection between the StudyMate AI Node.js backend (using Mongoose) and the MongoDB Atlas cluster (`StudyMateCluster`). 

While the **MongoDB Atlas Managed MCP Plugin** is connected, authenticated, and capable of reading database metadata, the **direct Node.js/Mongoose runtime connection from the workstation currently fails**.

The root cause has been conclusively identified through network-layer probing:
- The MCP plugin operates through MongoDB's management API / cloud gateway.
- The local Node.js application initiates outbound TCP/TLS connections directly from the developer's laptop.
- The laptop's current public IP address is **`152.57.14.212`**.
- The Atlas Network Access list only permits `157.50.203.85/32` and `152.57.30.72/32`.
- Consequently, while TCP port 27017 opens, the Atlas firewall drops the TLS handshake with `SSL alert number 80 (tlsv1 alert internal error)`.

---

## 2. Distinction: MCP Connection vs. Direct Backend Runtime

| Dimension | MongoDB Atlas Managed MCP Plugin | Direct Node.js / Mongoose Backend |
| :--- | :--- | :--- |
| **Connection Protocol** | Atlas Administration & Data API Gateway | Native MongoDB Wire Protocol (`mongodb+srv://`) |
| **Originating IP** | MCP Cloud Infrastructure Gateway | Local Workstation Dynamic IP (`152.57.14.212`) |
| **Authentication** | OAuth2 / Managed MCP Credentials | Database User (`studymate_app`) via SCRAM-SHA-256 |
| **Status** | **Connected & Authenticated** | **Blocked at TLS Firewall (SSL Alert 80)** |
| **Operations Verified** | Project listing, cluster inspection, `db-stats`, access list audit | Blocked before completing TLS handshake |

---

## 3. Configuration Audit

### A. Environment Configuration (`backend/.env`)
Inspected locally with strict credential redaction:
- `NODE_ENV`: `development`
- `USE_MEMORY_DB`: `false` (Strictly persistent; no memory fallback)
- `DNS_SERVERS`: `8.8.8.8,8.8.4.4`
- `MONGODB_URI`: `mongodb+srv://[CREDENTIALS_REDACTED]@studymatecluster.etg1wxd.mongodb.net/studymate_db?retryWrites=true&w=majority`

### B. Connection String Component Validation
- **Protocol:** `mongodb+srv://` (Valid SRV format)
- **Cluster Host:** `studymatecluster.etg1wxd.mongodb.net` (Exact match with Atlas cluster)
- **Database Name:** `studymate_db` (Exact match with target database)
- **Database User:** `studymate_app` (Confirmed in Atlas DB Users with `readWrite` on `studymate_db`)
- **Password Encoding:** Checked character distribution. Contains only alphanumeric characters and an unreserved underscore (`_`). No URL encoding or percent-escape corruption is present.
- **Connection Options:** `retryWrites=true&w=majority` (Atlas best-practice options present)

---

## 4. Network & DNS Diagnostics

Diagnostics were executed step-by-step to isolate the failure layer:

### Layer 1: DNS SRV Resolution
- **System DNS (`127.0.0.1` on Windows):** Fails with `querySrv ECONNREFUSED _mongodb._tcp.studymatecluster.etg1wxd.mongodb.net`.
- **Configured Resolvers (`8.8.8.8, 8.8.4.4`):** **SUCCESS**. Resolves all 3 cluster shards in 180ms:
  - `ac-3fpb2u9-shard-00-00.etg1wxd.mongodb.net:27017`
  - `ac-3fpb2u9-shard-00-01.etg1wxd.mongodb.net:27017`
  - `ac-3fpb2u9-shard-00-02.etg1wxd.mongodb.net:27017`

### Layer 2: Outbound TCP Socket Connectivity
- **Target:** `ac-3fpb2u9-shard-00-00.etg1wxd.mongodb.net` on port `27017`
- **Result:** `TCP connect success`. Outbound traffic on port 27017 is unobstructed by local Windows Defender or ISP firewall.

### Layer 3: Atlas TLS Handshake & IP Whitelist Verification
- **Current Public IPv4 of Workstation:** `152.57.14.212`
- **Current Dual-Stack IPv6 of Workstation:** `2409:40f2:1020:45af:cd2d:4ea4:b488:2fb3`
- **Atlas Network Access List (Queried via MCP):**
  ```json
  [
    {"ipAddress": "152.57.30.72", "cidrBlock": "152.57.30.72/32", "comment": "Created as part of the Auto Setup process"},
    {"ipAddress": "157.50.203.85", "cidrBlock": "157.50.203.85/32", "comment": "My Laptop"}
  ]
  ```
- **Discrepancy:** The developer's dynamic ISP IP rotated from `157.50.203.85` to **`152.57.14.212`**.
- **Handshake Result:**
  ```text
  TLS Handshake Error: SSL routines:ssl3_read_bytes:tlsv1 alert internal error: SSL alert number 80
  ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR
  ```
- **Atlas Firewall Mechanism:** In MongoDB Atlas, when an unwhitelisted client attempts a TLS connection, the Atlas gateway terminates the handshake with TLS internal error alert 80 rather than an application-level HTTP/wire packet.

---

## 5. Standalone Mongoose Connection Test

Executed via `node backend/scripts/test_atlas_connection.js`:

```text
[CONFIG AUDIT]
  NODE_ENV:      development
  USE_MEMORY_DB: false
  DNS_SERVERS:   8.8.8.8,8.8.4.4
  Active DNS:    8.8.8.8, 8.8.4.4
  MONGODB_URI:   mongodb+srv://[CREDENTIALS_REDACTED]@studymatecluster.etg1wxd.mongodb.net/studymate_db?retryWrites=true&w=majority

[URI FORMAT AUDIT]
  Uses mongodb+srv:// protocol: true
  Uses standard mongodb:// protocol: false
  Cluster Host:  studymatecluster.etg1wxd.mongodb.net
  Database Name: studymate_db
  Has retryWrites: true
  Has w=majority:  true

[DNS AUDIT] Resolving host: studymatecluster.etg1wxd.mongodb.net...
  ✓ SRV DNS Lookup Success! Found 3 host instances:
    - ac-3fpb2u9-shard-00-00.etg1wxd.mongodb.net:27017 (priority: 0, weight: 0)
    - ac-3fpb2u9-shard-00-01.etg1wxd.mongodb.net:27017 (priority: 0, weight: 0)
    - ac-3fpb2u9-shard-00-02.etg1wxd.mongodb.net:27017 (priority: 0, weight: 0)

[CONNECTION AUDIT] Attempting connection to Atlas cluster...
[CONNECTION FAILURE]: Could not connect to any servers in your MongoDB Atlas cluster.
  -> Issue: IP Address not whitelisted on MongoDB Atlas Network Access.
```

---

## 6. Safety & Data Preservation Verification

- **Preserved Uploads:** All 18 uploaded PDF files in `backend/uploads/` remain intact.
- **Secondary Workspace:** `C:\Projects\StudyMate-AI` was left completely untouched.
- **Security Check:** Zero credentials, keys, or passwords were logged or exposed.
- **Integrity Check:** No in-memory database fallback was introduced.

---

## 7. Action Required to Enable Backend Direct Connection

Because you requested not to weaken Atlas network security or change configurations automatically, here is the exact step needed to authorize your current connection:

1. Open the [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. In the left navigation sidebar under **Security**, click **Network Access**.
3. Locate the entry `"My Laptop"` (`157.50.203.85/32`) and click **Edit** (or click **+ Add IP Address**).
4. Update the IP address to your current IP:
   ```text
   152.57.14.212/32
   ```
   *(Alternatively, select **Allow Access from Anywhere** (`0.0.0.0/0`) with a 6-hour or 24-hour expiration to avoid interruptions whenever your ISP dynamically rotates your IP).*
5. Click **Confirm**.
6. Once Atlas finishes deploying the rule (~30–60 seconds), verify the direct connection from your terminal:
   ```powershell
   node backend/scripts/test_atlas_connection.js
   ```
   *Expected outcome: Mongoose connects, confirms `studymate_db`, and returns database ping `{ ok: 1 }`.*
