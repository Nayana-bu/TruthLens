# TruthLens Verify — Full-Stack Fact-Checking & News Verification Platform

TruthLens Verify is a multilingual civic fact-checking, RAG (Retrieval-Augmented Generation) news investigation, and Natural Language Inference (NLI) platform supporting **English (`en`)**, **Kannada (`kn`)**, and **Hindi (`hi`)**.

The codebase is organized into a clean full-stack workspace with strictly separated **`frontend/`** and **`backend/`** packages, independent build/run scripts, server-side secret isolation, and shared verification test suites under `scripts/`.

---

## 1. Repository Architecture

```text
truthlens-verify/
├── frontend/                     # Independent React + Vite + Tailwind CSS client
│   ├── index.html                # SPA HTML entry point
│   ├── package.json              # Frontend-only dependencies & scripts
│   ├── tsconfig.json             # Frontend TypeScript configuration
│   ├── vite.config.ts            # Vite bundler + /api dev proxy (port 5173 -> 4000)
│   ├── .env.example              # Public client-side environment variables
│   └── src/
│       ├── main.tsx              # React DOM bootstrap
│       ├── App.tsx               # Root application shell & tab orchestration
│       ├── index.css             # Tailwind CSS v4 styles
│       ├── types.ts              # Shared TypeScript interfaces
│       ├── data/                 # Client translations, authority directory, UI seed helpers
│       ├── services/             # HTTP communication layer (no server secrets)
│       │   ├── apiClient.ts      # Base fetch wrapper with Vite env URL + Bearer auth
│       │   ├── authService.ts    # /api/auth/* requests & session persistence
│       │   ├── investigationService.ts # /api/investigate, /api/investigations, /api/statistics
│       │   ├── reportService.ts  # /api/report cybercrime escalation requests
│       │   └── ttsService.ts     # /api/tts neural voice synthesis requests
│       ├── utils/                # Client-only pure utilities (compare view, Web Speech API)
│       │   ├── claimComparator.ts# Split-view claim vs archive NLI comparator
│       │   ├── semanticNliEngine.ts # Deterministic NLI utilities for local comparison
│       │   ├── sourceTranslator.ts  # Localized source badge/snippet translation helpers
│       │   └── speechEngine.ts   # Backend Gemini TTS player + browser SpeechSynthesis fallback
│       └── components/           # Modular UI views, modals, and investigation tabs
│           ├── DashboardView.tsx # Main investigation workspace, evidence grid & trending cards
│           ├── VerificationTimeline.tsx # Interactive step-by-step audit timeline for active dossier
│           ├── InvestigationTab.tsx # Archive history view & split-view claim comparison launcher
│           ├── ClaimSplitCompareView.tsx # Side-by-side NLI comparator against archived claims
│           └── DossierModal.tsx  # Full localized forensic dossier modal & WhatsApp counter-note
│
├── backend/                      # Independent Node.js + Express + Gemini RAG API server
│   ├── package.json              # Backend-only dependencies & scripts
│   ├── tsconfig.json             # Backend TypeScript configuration
│   ├── .env.example              # Server-side secrets & runtime configuration
│   ├── data/                     # Persistent file-based JSON & Vector databases
│   │   ├── investigations.json   # Atomic-write investigation dossier archive & statistics source
│   │   ├── vector_index.json     # 256-dim projection + dense embedding semantic vector store
│   │   └── users.json            # Registered user accounts & scrypt password hashes (auto-created)
│   └── src/
│       ├── server.ts             # Express app initialization, health check, optional Vite mount
│       ├── config/env.ts         # Centralized server env loader (dotenv, paths, CORS, secrets)
│       ├── middleware/cors.ts    # Configurable CORS middleware for cross-origin frontend dev
│       ├── types.ts              # Backend domain types
│       ├── routes/               # Express route definitions
│       │   ├── investigationRoutes.ts
│       │   ├── authRoutes.ts
│       │   ├── ttsRoutes.ts
│       │   └── reportRoutes.ts
│       ├── controllers/          # HTTP request validation & response formatting
│       │   ├── investigationController.ts
│       │   ├── authController.ts
│       │   ├── ttsController.ts
│       │   └── reportController.ts
│       ├── services/             # Core business logic, AI, RAG, NLI & external integrations
│       │   ├── investigationPipelineService.ts # Multi-stage CRAG + NLI + Gemini dossier builder
│       │   ├── ragEngine.ts      # Query normalization, entity extraction, multi-source retrieval & reranking
│       │   ├── semanticNliEngine.ts # Semantic event frames + NLI (ENTAILMENT / CONTRADICTION / NEUTRAL)
│       │   ├── claimAnalyzer.ts  # Claim scoring, truthfulness rubric, localized summaries
│       │   ├── geminiService.ts  # Google Gemini (@google/genai) SDK wrapper (backend-only)
│       │   ├── urlExtractorService.ts # URL HTML article parser + PDF/media extraction
│       │   ├── ttsService.ts     # Gemini neural TTS audio generation
│       │   ├── authService.ts    # scrypt password hashing + HMAC-SHA256 bearer session tokens
│       │   └── reportService.ts  # Cybercrime / PIB escalation ticket creation
│       └── db/                   # Persistence & vector storage modules
│           ├── investigationsDb.ts # Atomic temp-file + rename JSON CRUD & statistics aggregation
│           ├── vectorStore.ts    # Hybrid dense + projection vector index persistence & similarity search
│           └── authDb.ts         # Atomic user account persistence (users.json)
│
├── scripts/                      # Verification, regression, NLI, DB, and RAG benchmark test suites
├── package.json                  # Workspace helper scripts & unified runtime entry point
├── .env.example                  # Root unified-mode environment template
└── metadata.json                 # Application metadata & capabilities
```

---

## 2. Database & Persistence Technology

TruthLens Verify currently uses **file-based atomic JSON storage and a local hybrid semantic vector index** stored on disk in `backend/data/`:

- **`backend/data/investigations.json`** (managed by `backend/src/db/investigationsDb.ts`): Stores complete `InvestigationRecord` objects (input text, extracted claims, verdict classification, confidence score, localized explanations, sources, and timestamps). Writes use atomic `writeFileSync(temp) -> renameSync()` so partial writes cannot corrupt records. Dashboard statistics (`GET /api/statistics`) are computed directly from completed records in this store.
- **`backend/data/vector_index.json`** (managed by `backend/src/db/vectorStore.ts`): Stores indexed evidence snippets alongside 256-dimensional hybrid projection vectors and optional Gemini dense embeddings (`text-embedding-004` / `gemini-embedding-001`) for fast semantic cache retrieval across investigations.
- **`backend/data/users.json`** (managed by `backend/src/db/authDb.ts`): Created automatically on first authentication write; stores user profiles, `crypto.scryptSync` per-user salted password hashes, and auth provider metadata.
- **In-memory report log** (`backend/src/services/reportService.ts`): Records submitted fake-news escalation tickets (`POST /api/report`) during server runtime and returns generated ticket IDs.

*(No external SQL database, Firebase, Firestore, or MongoDB instance is required or provisioned.)*

---

## 3. Technologies & Dependencies

### Frontend (`frontend/package.json`)
- **Framework**: `react` (`^19.0.1`), `react-dom` (`^19.0.1`)
- **Bundler & Dev Server**: `vite` (`^8.3.0`), `@vitejs/plugin-react` (`^6.1.1`)
- **Styling**: `tailwindcss` (`^4.3.3`), `@tailwindcss/vite` (`^4.3.3`), `autoprefixer` (`^10.4.21`)
- **UI & Motion**: `lucide-react` (`^0.546.0`), `motion` (`^12.23.24`)
- **Type Checking**: `typescript` (`^7.0.2`), `@types/react` (`^19.3.0`), `@types/react-dom` (`^19.3.0`)

### Backend (`backend/package.json`)
- **Runtime & HTTP Server**: Node.js (`>=20` / `22+`), `express` (`^4.21.2`), `tsx` (`^4.21.0`)
- **AI & Embeddings SDK**: `@google/genai` (`^2.4.0`) — server-side Gemini inference, vision OCR, embeddings, Google Search grounding, and neural TTS
- **Environment Management**: `dotenv` (`^17.2.3`)
- **Cryptography**: Built-in Node `crypto` (`scryptSync`, `timingSafeEqual`, HMAC-SHA256 bearer session tokens)
- **Type Checking**: `typescript` (`^7.0.2`), `@types/express` (`^4.17.21`), `@types/node` (`^22.14.0`)

---

## 4. Environment Variables

All sensitive API keys and session secrets remain **exclusively on the backend**.

1. **Backend (`backend/.env` from `backend/.env.example`)**:
   - `PORT` — API server port (defaults to `4000` when `SERVE_FRONTEND=false`, or `3000` in unified dev mode).
   - `NODE_ENV` — `development` or `production`.
   - `SERVE_FRONTEND` — Set to `false` when running frontend and backend on separate ports (`5173` + `4000`); set to `true` for unified single-port mode.
   - `GEMINI_API_KEY` — Google Gemini API key (backend-only).
   - `CORS_ORIGIN` — Comma-separated allowed origins (e.g., `http://localhost:5173,http://localhost:3000`).
   - `AUTH_SECRET` — Secret key for signing bearer session tokens.
   - `APP_URL` — Optional public URL.

2. **Frontend (`frontend/.env` from `frontend/.env.example`)**:
   - `VITE_API_BASE_URL` — Leave empty (`""`) when using Vite's `/api` dev proxy or unified hosting; set to `http://localhost:4000` for direct cross-origin requests.
   - `VITE_API_PROXY_TARGET` — Vite dev proxy destination for `/api/*` (defaults to `http://localhost:4000`).

---

## 5. Installation & Running

### Option A: Run Backend and Frontend Independently (Recommended for Local Development)

Install dependencies in both packages (or run `npm run install:all` from root):

```bash
# 1. Install backend dependencies & configure env
cd backend
npm install
cp .env.example .env   # Add your GEMINI_API_KEY
npm run dev            # Starts API server on http://localhost:4000 (SERVE_FRONTEND=false)

# 2. In a second terminal, install frontend dependencies & start Vite dev server
cd frontend
npm install
cp .env.example .env
npm run dev            # Starts React app on http://localhost:5173 (proxies /api -> http://localhost:4000)
```

### Option B: Run in Unified Preview / Production Mode (Single Port 3000)

```bash
npm install
npm run lint           # Typecheck both frontend and backend
npm run build          # Build frontend production bundle into frontend/dist
npm run dev            # Runs Express backend + Vite middleware on http://localhost:3000
# or production:
NODE_ENV=production npm start
```

### Verification & RAG Evaluation Test Suites

Run from the repository root:

```bash
npx tsx scripts/test-semantic-nli.ts
npx tsx scripts/test-claim-comparison.ts
npx tsx scripts/test-rag-regression.ts
npx tsx scripts/test-rag-improvements.ts
npx tsx scripts/test-engine.ts
npx tsx scripts/test-history-and-stats.ts
npx tsx scripts/test-trending-edit-delete.ts
```

---

## 6. Complete End-to-End Request–Response Flow

### Claim Verification Flow (`POST /api/investigate`)
1. **Frontend UI (`VerifyTab.tsx` / `App.tsx`)** captures text, URL, or base64 image/PDF input and invokes `investigateClaim()` in `frontend/src/services/investigationService.ts`.
2. **`apiClient.ts`** sends an HTTP `POST` request to `/api/investigate` (attaching the optional `Authorization: Bearer <token>` header from `localStorage`).
3. **Express Router (`backend/src/routes/investigationRoutes.ts`)** dispatches the request to **`investigationController.ts`**.
4. **Input Extraction (`urlExtractorService.ts` / `geminiService.ts`)** extracts readable text from submitted URLs or performs Gemini multimodal OCR on images/PDFs when `GEMINI_API_KEY` is configured.
5. **RAG & NLI Pipeline (`investigationPipelineService.ts` + `ragEngine.ts` + `semanticNliEngine.ts` + `vectorStore.ts`)**:
   - Normalizes multilingual spelling/typos (`en`/`kn`/`hi`), extracts named entities and sub-claims, and detects semantic frames (event type, tense/modality, cardinality, negation).
   - Queries persistent `backend/data/vector_index.json` plus live authoritative web sources (Wikipedia REST, DuckDuckGo Instant Answer API via `fetchDuckDuckGoInstant`, PIB Fact Check / Google News RSS, and Gemini Search grounding).
   - Reranks retrieved snippets using semantic similarity + deterministic/Gemini NLI (`ENTAILMENT`, `CONTRADICTION`, `NEUTRAL`).
   - Upserts newly retrieved documents back into `backend/data/vector_index.json`.
6. **Dossier Synthesis & Persistence (`claimAnalyzer.ts` + `geminiService.ts` + `investigationsDb.ts`)**:
   - Produces the structured `ClaimDossier` (`REAL` / `FAKE` / `UNVERIFIED`, calibrated confidence score, multilingual summaries, and evidence citations).
   - Atomically saves completed investigations into `backend/data/investigations.json`.
7. **HTTP Response & UI Rendering**: Backend returns JSON `{ success, record, dossier, pipelineMeta }`; frontend prepends the dossier to live archive/trending views and triggers `GET /api/statistics` so dashboard counts stay synchronized.

### Other Core API Endpoints
- **`GET /api/health`** — Service readiness, serving mode, and Gemini configuration check.
- **`GET /api/investigations`**, **`GET /api/investigations/:id`**, **`PUT /api/investigations/:id`**, **`DELETE /api/investigations/:id`** — Persistent investigation CRUD backed by `backend/data/investigations.json` (with `PUT` automatically re-running live verification on edited claims).
- **`GET /api/statistics`** — Real-time verdict distribution computed from `backend/data/investigations.json`.
- **`POST /api/auth/login`**, **`POST /api/auth/register`**, **`POST /api/auth/google`**, **`POST /api/auth/reset-password`**, **`GET /api/auth/session`** — Account authentication backed by `backend/data/users.json` + HMAC tokens.
- **`POST /api/tts`** — Backend neural audio synthesis via Gemini TTS (`gemini-2.5-flash-preview-tts`), with client Web Speech API fallback.
- **`POST /api/report`** — Cybercrime / PIB fact-check escalation ticket submission.

---

## 7. Interactive Verification Timeline (`DashboardView` + `VerificationTimeline`)

Inside **`DashboardView.tsx`** (directly beneath *Official Evidences & Sources*), **`VerificationTimeline.tsx`** renders a chronological, interactive audit trail of the exact verification steps executed for the currently selected `ClaimDossier`—strictly derived from persisted dossier fields without fabricated timestamps or mock data:

1. **Stage Milestone Strip & Vertical Stepper**: Displays each pipeline checkpoint (`Query Preprocessor` → `RAG Evidence Retriever` → `Semantic NLI & Evidence Cross-Check` → `Verification Engine`) with color-coded status nodes matching the claim's real outcome (`REAL`, `FAKE`, `MISLEADING`, `PARTLY_TRUE`, `CONTEXT_MISSING`, or `UNVERIFIED`).
2. **Claim Ingestion & Semantic Extraction**: Surfaces the submission mode (`text`, `ocr`, `url`), `originVector`, extracted sub-claims (`extractedClaims`), named entities (`people`, `organizations`, `locations`, `dates`, `amounts`), and `semanticFrame` attributes (`eventType`, `modality`, `polarity`, `tense`).
3. **CRAG & Multi-Source Retrieval Trace**: Exposes query counts (`searchQueryCount`), Corrective RAG pass count (`cragIterations`), full `cragTrace` logs, deduplication/noise-filtering metrics, and `groundingInfo.queries`.
4. **Semantic NLI Cross-Check & Final Assessment**: Summarizes supporting (`ENTAILMENT`), contradicting (`CONTRADICTION`), and neutral source counts with publication/retrieval dates and validated external links (`http`/`https`), alongside `officialRefId`, `confidenceScore`, `evidenceStrengthLabel`, and `verifiedAt` in **English (`en`)**, **Kannada (`kn`)**, and **Hindi (`hi`)**. Users can inspect steps individually or toggle **Inspect All** / **Collapse**.
