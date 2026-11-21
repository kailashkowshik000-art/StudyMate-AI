# StudyMate AI 🎓🤖

**Version:** 1.0.0 (Production Release)  
**Architecture:** React 18 (Vite SPA) + Node.js 20 LTS (Express REST API) + MongoDB Atlas (Vector Search) + Google Gemini AI  
**Deployment:** Production Docker Compose (Isolated Internal Bridge + Nginx Reverse Proxy)

---

## 🌟 Executive Summary

**StudyMate AI** is an intelligent, privacy-first academic study companion and RAG (Retrieval-Augmented Generation) document tutor. It transforms static lecture notes, textbooks, course slides, and syllabus files into interactive, pedagogically sound learning workflows:
- **Asynchronous Multi-Format Document Ingestion:** Non-blocking text extraction for PDF (`.pdf`), Word (`.docx`), PowerPoint (`.pptx`), and Plain Text (`.txt`), semantic chunking, and 768-dimensional vector embedding.
- **Grounded AI Tutor:** Real-time conversational tutoring powered by Google Gemini (`gemini-1.5-flash` / `gemini-1.5-pro`) and `text-embedding-004`, strictly grounded in course materials with verifiable citations (`Page X`, `Slide Y`, or `Section Z`).
- **Structured Study Summaries:** Comprehensive overviews, key takeaways, core concepts, definitions, and high-yield exam tips across all document types.
- **Adaptive Quizzing & Diagnostics:** Dynamic multiple-choice questions with answer keys, explanations, and automatic weak-topic identification.
- **Spaced Repetition Flashcards:** SuperMemo-2 (SM-2) algorithm scheduling based on active recall difficulty ratings.
- **Timed Exam Simulations:** Exam mode with countdown timers and automated performance grading.
- **Dynamic Study Planner & Streak Tracking:** Daily task tracking, weekly hours, and consecutive study streak analytics.
- **Enterprise-Grade Security:** Multi-tenant tenancy isolation, PK/magic-byte package verification, Helmet security headers, granular rate limiting, Winston structured logging with automated PII/credential redaction, and non-root Docker containerization.

---

## 📌 Complete System Architecture & Ingestion Pipeline

```
                     ┌─────────────────────────────────────────────────────────┐
                     │            User Browser / React 18 SPA                  │
                     │  (Vite Build, Route Code-Splitting, Nginx Port 3000/80) │
                     └────────────────────────────┬────────────────────────────┘
                                                  │ HTTPS / Reverse Proxy
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │            Nginx 1.27 Alpine Reverse Proxy              │
                     │  - Gzip Compression     - Security Headers              │
                     │  - SPA Routing Fallback - Immutable Asset Cache         │
                     └───────────────┬─────────────────────────┬───────────────┘
                        /api/*       │                         │ /uploads/*
                                     ▼                         ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │             StudyMate AI Express Backend API            │
                     │   (Node.js 20 Alpine, Non-Root 'node', Port 5000 Int)   │
                     │   - Decoupled app.js / server.js Architecture           │
                     │   - Helmet + Rate Limiters + Request Correlation ID     │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                ┌─────────────────────────────────┼────────────────────────────────┐
                ▼                                 ▼                                ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Async Document Pipeline     │  │   Vector Search & RAG        │  │   Learning Workflows         │
│  1. Multipart Upload         │  │   1. text-embedding-004 (768d│  │   1. Structured Summaries    │
│  2. Validation (%PDF- magic) │  │   2. Cosine / Atlas Vector   │  │   2. Adaptive Quizzes        │
│  3. HTTP 202 Accepted        │  │   3. Grounded Prompt Context │  │   3. Spaced Repetition (SM-2)│
│  4. Background Worker Queue  │  │   4. Gemini 1.5 Flash Output │  │   4. Timed Exam Simulations  │
│  5. 800c/150c Chunks & Embed │  │   5. 'Page X • Section Y' Ref│  │   5. Study Plans & Analytics │
└───────────────┬──────────────┘  └───────────────┬──────────────┘  └───────────────┬──────────────┘
                │                                 │                                 │
                └─────────────────────────────────┼─────────────────────────────────┘
                                                  │ Mongoose 8 (Connection Pool & Exponential Retry)
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │               Managed MongoDB Atlas Cluster             │
                     │   - 12 Production Models with Compound Indexes          │
                     │   - Multi-tenant Tenant Isolation (userId Scoping)      │
                     │   - Cascade Deletion preserving User Learning History   │
                     │   - Atlas Vector Search ($vectorSearch) Index           │
                     └─────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Directory Structure

```
StudyMate-AI/
├── docker-compose.yml            # Production container orchestration (internal network + Nginx)
├── .env.example                  # Environment template for container & local deployments
├── README.md                     # Complete project documentation & deployment guide
├── docs/                         # Architecture guides, MongoDB Atlas setup, production manual
│   ├── MONGODB_ATLAS_SETUP.md    # Step-by-step Atlas cluster & vector index configuration
│   └── PRODUCTION_DEPLOYMENT.md  # Production hardening, SSL, and rollout instructions
│
├── frontend/                     # React 18 + Vite client application
│   ├── Dockerfile                # Multi-stage build (Node 20 build -> Nginx 1.27 Alpine runtime)
│   ├── nginx.conf                # Nginx configuration (reverse proxy, SPA fallback, caching)
│   ├── .dockerignore             # Excludes node_modules, dist, git
│   ├── package.json              # Frontend scripts and production dependencies
│   ├── vite.config.js            # Vite build configuration with rollup code-splitting
│   ├── tailwind.config.js        # Tailwind CSS theme and typography configuration
│   └── src/
│       ├── components/           # Reusable UI & common components
│       │   ├── common/           # Button, Card, Badge, Modal, Toast, ProtectedRoute
│       │   ├── documents/        # DocumentUploadModal (with async polling), PreviewModal
│       │   └── layout/           # Sidebar (with streak counter), Header
│       ├── pages/                # Route pages (lazy-loaded via React.lazy)
│       │   ├── Login.jsx         # Authentication login page
│       │   ├── Register.jsx      # Student registration page
│       │   ├── Dashboard.jsx     # Overview, stats, recent documents, streak
│       │   ├── Documents.jsx     # Document management, async status polling & retry
│       │   ├── Chat.jsx          # AI Tutor with citation badges ('Page X • Section Y')
│       │   ├── Summary.jsx       # Structured study summary viewer & generator
│       │   ├── Quiz.jsx          # MCQ assessment, instant grading, weak-topic review
│       │   ├── Flashcards.jsx    # SM-2 spaced repetition active recall cards
│       │   ├── Progress.jsx      # Learning analytics, study time, accuracy graphs
│       │   └── Settings.jsx      # Account and application settings
│       ├── services/             # Axios API services with 401 automatic logout handling
│       ├── context/              # AuthContext and ThemeContext
│       ├── router.jsx            # React Router 6 configuration with route code-splitting
│       └── App.jsx               # Application root
│
└── backend/                      # Node.js 20 Express REST API (ES Modules)
    ├── Dockerfile                # Production multi-stage build running as non-root 'node'
    ├── .dockerignore             # Excludes node_modules, uploads, test logs
    ├── app.js                    # Decoupled Express app configuration, middleware & routes
    ├── server.js                 # HTTP server entrypoint, database initialization & signals
    ├── package.json              # Scripts, dependencies, and test commands
    ├── config/
    │   └── db.js                 # MongoDB connection manager (Atlas support, retries, pooling)
    ├── controllers/              # REST API controllers
    │   ├── authController.js     # User registration, login, profile
    │   ├── documentController.js # Async PDF upload, status polling, retry, cascade delete
    │   ├── chatController.js     # RAG conversational tutoring sessions and messaging
    │   ├── summaryController.js  # AI document summary generation & retrieval
    │   ├── quizController.js     # Multiple-choice quiz generation and evaluation
    │   ├── flashcardController.js# SM-2 flashcard review and scheduling
    │   ├── examController.js     # Timed exam generation and grading
    │   ├── studyPlanController.js# Personalized study plan generation and task toggles
    │   └── analyticsController.js# Learning activity tracking, streaks, and analytics
    ├── middleware/
    │   ├── authMiddleware.js     # JWT verification and user tenancy resolution
    │   ├── correlationMiddleware.js# Request correlation ID (X-Request-Id) and scoped logging
    │   ├── errorMiddleware.js    # Production error handler (redacts stack traces in prod)
    │   └── rateLimitMiddleware.js# express-rate-limit (auth: 10/15min, AI: 30/min)
    ├── models/                   # 12 Mongoose Schemas with compound production indexes
    │   ├── User.js               # User accounts & bcrypt hashed passwords
    │   ├── Document.js           # PDF metadata, processing status, error tracking
    │   ├── TextChunk.js          # Extracted chunks, 768d embeddings, page metadata
    │   ├── Summary.js            # Structured summaries (overview, keyPoints, tips)
    │   ├── Quiz.js               # MCQs, choices, explanations, scores, weak topics
    │   ├── Exam.js               # Timed exam mode configurations and submissions
    │   ├── Flashcard.js          # Flashcards with SM-2 spaced repetition intervals
    │   ├── LearningProfile.js    # Student mastery profile and weak topics
    │   ├── StudyActivity.js      # Granular learning activity telemetry
    │   ├── StudyPlan.js          # Generated study plans and daily milestones
    │   ├── ChatSession.js        # Tutor conversation threads
    │   └── Message.js            # Grounded chat messages with source citations
    ├── routes/                   # Express routes mounted under /api/*
    ├── services/                 # Business logic and external service integrations
    │   ├── documentQueueService.js# Background asynchronous worker queue with atomic locks
    │   ├── pdfService.js         # PDF text extraction and whitespace cleaning
    │   ├── chunkService.js       # Semantic boundary text chunking (800c / 150c overlap)
    │   ├── embeddingService.js   # text-embedding-004 generator & L2-normalized fallback
    │   ├── vectorSearchService.js# Atlas $vectorSearch and in-memory cosine fallback
    │   ├── geminiService.js      # Google Gemini AI tutor, summary, and quiz generator
    │   ├── fileService.js        # Secure disk upload storage & PDF magic byte validation
    │   └── learningAnalyticsService.js# Study stats, streak days, and recommendation engine
    ├── utils/
    │   ├── logger.js             # Winston structured logger with automatic PII redaction
    │   └── token.js              # Cryptographic JWT signing and secret enforcement
    ├── scripts/
    │   └── migrate_database.js   # Production schema and compound index migration runner
    ├── tests/                    # Automated integration & verification test suites
    │   ├── verify_security.js    # Phase 5.2 security audit (12 tests)
    │   ├── verify_phase5_3.js    # Phase 5.3 async upload pipeline audit (12 tests)
    │   ├── verify_phase5_4.js    # Phase 5.4 database persistence & integrity (12 tests)
    │   └── verify_phase6_master.js# Phase 6 master production & release suite (24 tests)
    └── uploads/                  # Persistent PDF storage (mounted as Docker volume)
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the root (for Docker Compose) or in `backend/.env` (for local development):

```env
# ==============================================================================
# StudyMate AI - Production Environment Variables
# ==============================================================================

# Server Environment
NODE_ENV=production
PORT=5000
BACKEND_PORT=5000
FRONTEND_PORT=3000
CLIENT_URL=http://localhost:3000

# MongoDB Atlas Persistent Database Connection
# Replace with your managed MongoDB Atlas connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/studymate_db?retryWrites=true&w=majority

# Enforce Persistent Storage (Strictly prohibited in production)
USE_MEMORY_DB=false

# JSON Web Token Secret (Must be at least 32 cryptographically random characters)
JWT_SECRET=replace_with_a_secure_random_64_char_string_generated_by_openssl
JWT_EXPIRE=7d

# Google Gemini AI Configuration
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSION=768

# Vector Search Configuration
ATLAS_VECTOR_INDEX=vector_index
TOP_K=5

# Text Chunking Settings (Character counts)
CHUNK_SIZE=800
CHUNK_OVERLAP=150

# Maximum PDF File Upload Size (25MB = 26214400 bytes)
MAX_FILE_SIZE=26214400
```

> [!SECURITY]
> `GEMINI_API_KEY`, `MONGODB_URI`, and `JWT_SECRET` are **backend-only** secrets. They are never exposed to browser clients, frontend bundles, or unauthenticated health probes.

---

## 🐳 Docker Deployment & Container Orchestration

StudyMate AI includes a production-hardened `docker-compose.yml` orchestrating the frontend and backend services:
- **Internal Network Isolation:** The backend API (port `5000`) is **not** exposed to the public host interface; it communicates exclusively over the isolated `studymate-network` bridge.
- **Nginx Ingress:** All public HTTP traffic enters through Nginx on port `3000` (or `80`), which proxies `/api/`, `/uploads/`, and `/healthz/` to the backend while serving static React assets with gzip compression.
- **Persistent PDF Storage:** Uploaded documents are saved in a dedicated Docker named volume (`studymate_uploads`) mounted at `/app/uploads`.

### 1. Build and Start Containers

```bash
# Build production images and start in background (Requires Docker Desktop)
docker compose up -d --build

# Inspect running container status
docker compose ps

# View container logs
docker compose logs -f backend
docker compose logs -f frontend
```

> **Note for Windows Users without Docker Desktop:** If `docker` is not installed or not in your PATH, use **Option B (Local Development)** below to run directly on Windows with Node.js.

### 2. Verify Health Probes

```powershell
# On Windows PowerShell (use curl.exe or Invoke-RestMethod to avoid PowerShell parser warnings):
curl.exe http://localhost:5000/healthz/live
# or
Invoke-RestMethod http://localhost:5000/healthz/live
```

---

## 💻 Local Development Setup (Windows / macOS / Linux)

Run StudyMate AI locally without Docker using two terminal sessions:

### 1. Backend Service (Terminal 1)

```bash
cd backend
npm install

# Start development server with file watching
npm run dev
```

- **Backend API:** `http://localhost:5000`
- **Liveness Probe:** `http://localhost:5000/healthz/live`
- **Readiness Probe:** `http://localhost:5000/healthz/ready`

### 2. Frontend Application (Terminal 2)

```bash
cd frontend
npm install

# Start Vite hot-reload development server
npm run dev
```

- **Frontend App:** `http://localhost:5173`
- **Production Build:** `npm run build` (Outputs optimized assets to `dist/`)

---

## 📄 Multi-Format Document Ingestion (.pdf, .docx, .pptx, .txt)

StudyMate AI supports seamless ingestion of multiple educational file formats into the unified RAG vector pipeline:

| Format | Extension | Extractor | Structural Preservation | Grounded Citation |
|---|---|---|---|---|
| **PDF** | `.pdf` | `pdfService.js` (`pdf-parse`) | Page numbering, table and text extraction | `[Document, Page X, Chunk Y]` |
| **Microsoft Word** | `.docx` | `docxExtractor.js` (`mammoth` + XML) | Heading 1-6 hierarchy, tables, paragraphs | `[Document, Section "Heading", Chunk Y]` |
| **PowerPoint** | `.pptx` | `pptxExtractor.js` (`adm-zip` OpenXML) | Slide numbers, slide titles, bullets, notes | `[Document, Slide X, Chunk Y]` |
| **Plain Text** | `.txt` | `txtExtractor.js` (UTF-8 stream) | Paragraphs, headers, null byte rejection | `[Document, Section Z, Chunk Y]` |

> ⚠️ **Legacy Formats Notice:** Legacy binary `.doc` and `.ppt` formats are unsupported. When students upload `.doc` or `.ppt`, the application provides a clear, helpful notification prompting them to save/export their document as modern `.docx` or `.pptx`.

---

## 🧪 Comprehensive Automated Testing Suites

StudyMate AI features a multi-layered verification test suite with **100% pass rate (100/100 passing automated tests)**:

```bash
cd backend

# 1. Run Comprehensive AI Notes & Module Guide Tests (15 tests)
npm run test:notes

# 2. Run Multi-Format Ingestion & Citation Tests (15 tests)
npm run test:multiformat

# 3. Run Master Production & Release Validation Suite (24 tests)
npm run test:phase6

# 4. Run Security Hardening & Rate Limiting Audit (12 tests)
npm run test:security

# 5. Run Asynchronous Document Ingestion & Queue Tests (12 tests)
npm run test:phase5.3

# 6. Run Database Persistence, Atlas & Logging Tests (12 tests)
npm run test:phase5.4

# 7. Run DNS Resolver & SRV Verification Suite (10 tests)
npm run test:dns

# 8. Run Complete Automated Test Suite (All 100 tests)
npm run test:all
```

### Test Coverage Summary:
| Test Suite | Purpose | Tests | Status |
|---|---|:---:|:---:|
| `test:notes` | Comprehensive AI Notes, topic principles, architecture, comparison tables, exam Qs | 15 | **100% PASS** |
| `test:multiformat` | Multi-format upload, magic bytes, DOCX/PPTX/TXT extraction, citations | 15 | **100% PASS** |
| `test:phase6` | Master end-to-end audit: AI grounding, SM-2 flashcards, bundle budgets | 24 | **100% PASS** |
| `test:security` | Helmet headers, rate limiters, JWT secrets, CORS, PII sanitization | 12 | **100% PASS** |
| `test:phase5.3` | Async upload queue, 202 Accepted, status polling, atomic locks, magic bytes | 12 | **100% PASS** |
| `test:phase5.4` | Atlas persistence, liveness/readiness, 12 Mongoose models, cascade cleanup | 12 | **100% PASS** |
| `test:dns` | Google Public DNS fallback, SRV resolution, environment overrides | 10 | **100% PASS** |
| **Total Automated Tests** | **All core subsystems, security boundaries, multi-format & notes workflows** | **100 / 100** | **100% PASS** |

---

## 📖 Complete REST API Reference

All protected endpoints require the HTTP header:
`Authorization: Bearer <jwt_token>`

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register new student account (bcrypt hashed) | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT session token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & preferences | **Yes** |

### 2. Document Management & Ingestion (`/api/documents`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/documents` | Upload PDF (returns HTTP 202 Accepted & statusUrl) | **Yes** |
| `GET` | `/api/documents` | List user's documents with status and chunk count | **Yes** |
| `GET` | `/api/documents/:id` | Get document details and metadata | **Yes** |
| `GET` | `/api/documents/:id/status`| Poll asynchronous processing status & progress | **Yes** |
| `POST` | `/api/documents/:id/retry` | Re-queue a failed document for processing (HTTP 202) | **Yes** |
| `DELETE`| `/api/documents/:id` | Cascade delete document, disk file, chunks & summaries| **Yes** |

### 3. Conversational AI Tutor & RAG (`/api/chat`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/chat/sessions` | Create a new study chat session | **Yes** |
| `GET` | `/api/chat/sessions` | List user's study chat sessions | **Yes** |
| `GET` | `/api/chat/sessions/:id/messages` | Retrieve conversation history with cited sources | **Yes** |
| `POST` | `/api/chat/sessions/:id/messages` | Submit question -> vector search -> Gemini answer with citations | **Yes** |
| `DELETE`| `/api/chat/sessions/:id` | Delete conversation session | **Yes** |

### 4. Structured Study Summaries (`/api/summaries`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/summaries` | Generate structured summary (overview, key points, tips)| **Yes** |
| `GET` | `/api/summaries/:documentId` | Retrieve latest study summary for document | **Yes** |

### 5. Adaptive Quizzes (`/api/quizzes`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/quizzes` | Generate multiple-choice quiz from document chunks | **Yes** |
| `GET` | `/api/quizzes` | List user's quiz assessments and past scores | **Yes** |
| `GET` | `/api/quizzes/:id` | Fetch quiz questions and choices | **Yes** |
| `POST` | `/api/quizzes/:id/submit` | Submit answers, calculate score & identify weak topics | **Yes** |

### 6. Spaced Repetition Flashcards (`/api/flashcards`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/flashcards/generate` | Generate flashcards from document | **Yes** |
| `GET` | `/api/flashcards` | List flashcards (filter by document or due for review) | **Yes** |
| `POST` | `/api/flashcards/:id/review`| Review flashcard using SM-2 algorithm ('easy', 'hard') | **Yes** |

### 7. Timed Exam Simulations (`/api/exams`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/exams/generate` | Create a timed assessment with custom duration | **Yes** |
| `GET` | `/api/exams/:id` | Retrieve active exam questions | **Yes** |
| `POST` | `/api/exams/:id/submit` | Submit exam answers and receive evaluation | **Yes** |

### 8. Study Plans & Learning Analytics (`/api/study-plans` & `/api/analytics`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/api/study-plans/generate` | Generate milestone-driven study schedule | **Yes** |
| `PUT` | `/api/study-plans/:id/tasks/:taskId` | Toggle task completion status | **Yes** |
| `GET` | `/api/analytics` | Retrieve study hours, streak days, accuracy, and profile | **Yes** |
| `POST` | `/api/analytics/log` | Record learning activity telemetry | **Yes** |

### 9. Health & Monitoring (`/healthz`)
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | `/healthz/live` | Application liveness probe (HTTP 200) | No |
| `GET` | `/healthz/ready`| Database readiness probe (HTTP 200 ready, 503 error) | No |

---

## 🔒 Security & Privacy Guarantees

1. **Multi-Tenant User Isolation:** Every query on documents, text chunks, summaries, flashcards, exams, chat sessions, and study activities enforces a mandatory `userId` filter. Users cannot read, enumerate, or mutate another user's content.
2. **Cryptographic Protection:** Passwords are salted and hashed using `bcryptjs` (10 rounds). JWT secrets are enforced to be at least 32 characters long in production; known defaults are rejected.
3. **Hardened Ingestion:** Uploads require `.pdf` extension, `application/pdf` MIME type, and valid `%PDF-` file magic numbers. Files exceeding 25MB are rejected before disk buffering.
4. **Rate Limiting:** Authentication routes are capped at 10 requests per 15 minutes per IP; generative AI endpoints are limited to 30 requests per minute per authenticated user to prevent resource exhaustion.
5. **PII and Credential Redaction:** The Winston structured logger automatically strips passwords, API keys, database connection strings, JWT tokens, and internal filesystem paths before logging.
6. **Non-Root Execution:** The production container runs under the unprivileged `node` user (UID 1000) with restricted system privileges.

---

## 📜 License

MIT License. Copyright (c) 2026 StudyMate AI Contributors.
