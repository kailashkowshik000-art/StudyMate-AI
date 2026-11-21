# StudyMate AI — Frontend Foundation (Phase 1)

StudyMate AI is a modern, student-centric AI study companion designed to ingest lecture slides, textbook notes, and course handouts, allowing students to generate comprehensive chapter summaries, practice interactive knowledge quizzes, and engage with a contextual study assistant.

This repository contains the **Phase 1: Frontend Foundation** built with React, Vite, and Tailwind CSS.

---

## 🚀 Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite (ES Modules)
- **Routing**: React Router DOM (Data Router with `createBrowserRouter`)
- **Styling**: Tailwind CSS & PostCSS
- **Icons**: Lucide React
- **Architecture**: Service-oriented with isolated mock data layer ready for Phase 2 API integration

---

## 📂 Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/             # Reusable UI primitives (Button, Modal, Card, Input, Badge, Toast)
│   │   ├── layout/             # Responsive Sidebar and Header navigation
│   │   └── documents/          # Document upload & preview modals
│   ├── data/                   # Realistic academic mock datasets
│   │   ├── mockDocuments.js    # Preloaded sample PDFs (DBMS, OS, Data Structures, Networks)
│   │   ├── mockChat.js         # Conversation prompts, suggested queries, and topic responses
│   │   ├── mockSummary.js      # Structured summaries with key points, concepts, and exam tips
│   │   ├── mockQuiz.js         # Multi-topic question bank categorized by Easy, Medium, Hard
│   │   └── mockProgress.js     # Analytics, study streaks, and subject mastery data
│   ├── hooks/                  # Custom React hooks (useAuth)
│   ├── layouts/                # DashboardLayout with sticky/drawer sidebar & Outlet
│   ├── pages/                  # Route views
│   │   ├── Login.jsx           # Sign in with password toggle and demo student login
│   │   ├── Register.jsx        # Account registration with password match validation
│   │   ├── Dashboard.jsx       # Student analytics, recent documents, quick actions
│   │   ├── Documents.jsx       # Document repository with search, filter, and drag & drop upload
│   │   ├── Chat.jsx            # ChatGPT-style contextual study assistant
│   │   ├── Summary.jsx         # Automated multi-section study summary generator
│   │   ├── Quiz.jsx            # Interactive quiz engine with question-by-question review
│   │   ├── Progress.jsx        # Habit streak tracker, weekly chart, and syllabus mastery
│   │   └── Settings.jsx        # Profile management, AI tuning, and notifications
│   ├── services/               # Mock API service layer (swappable for Phase 2)
│   │   ├── api.js              # Network client simulator with latency delays
│   │   ├── documentService.js  # Document retrieval, upload, and deletion
│   │   ├── chatService.js      # AI conversation handler
│   │   ├── summaryService.js   # Document summarization
│   │   ├── quizService.js      # Quiz generation and grading engine
│   │   └── authService.js      # Session management and student preferences
│   ├── utils/                  # Formatter and helper utilities
│   ├── App.jsx                 # Top-level application provider
│   ├── index.css               # Tailwind CSS directives & scrollbar styles
│   ├── main.jsx                # React root bootstrap
│   └── router.jsx              # React Router definition
├── package.json
├── vite.config.js
└── README.md
```

---

## 🌐 Implemented Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Redirect | Redirects automatically to `/dashboard` |
| `/login` | Login | Authentication screen with demo credentials shortcut |
| `/register` | Register | Student account creation with validation |
| `/dashboard` | Dashboard | Overview of study streaks, quick actions, documents, and scores |
| `/documents` | My Documents | PDF repository with drag-and-drop upload and grid/table views |
| `/chat` | AI Chat | Contextual chat with suggested university exam prompts |
| `/summary` | Summary | Executive summary, key points, concepts, and exam tips |
| `/quiz` | Quiz | Interactive practice tests across Easy, Medium, and Hard tiers |
| `/progress` | Progress | Weekly study hours, habit streak, and subject-wise breakdown |
| `/settings` | Settings | Profile customization, AI response tuning, and session logout |

---

## 🛠️ Verification & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build for Production**:
   ```bash
   npm run build
   ```

3. **Launch Development Server**:
   ```bash
   npm run dev
   ```

---

## 🔒 Phase 1 Boundary Note

In accordance with Phase 1 specifications, **no backend, MongoDB, Gemini API, RAG, embeddings, or vector databases** are implemented yet. All interactions are handled via decoupled asynchronous services returning realistic academic mock data. The application is completely architected to seamlessly plug into the Node.js / Express backend in Phase 2.
