# Digital-Eyes — Inventory Manager (ShelfGuard)

An AI-powered retail shelf monitoring system that uses GPT-4o vision to detect out-of-stock products, low inventory, and shelf gaps from a single photo — no barcode scanner or planogram required.

> **The problem:** Supermarkets lose ~5% of revenue to out-of-stock products. Manual shelf checks are slow and miss problems for hours.
> **Our solution:** Phone photo + GPT-4o = instant gap detection, urgency-ranked restock list, and substitute suggestions. **30 seconds per shelf.**

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Demo Accounts](#demo-accounts)
- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [How the AI Works](#how-the-ai-works)
- [API Endpoints](#api-endpoints)
- [Team](#team)

---

## Overview

ShelfGuard lets store workers photograph a shelf with their phone. The AI instantly identifies which products are missing or running low, assigns urgency levels, and surfaces restocking alerts to managers — all in real time.

The system supports two scan modes:
- **Single-image analysis** — one photo is enough for immediate gap detection using GPT-4o's retail auditing prompt
- **Baseline comparison** — a morning "fully stocked" photo is compared against a later photo for higher-confidence, change-detection analysis

---

## Key Features

- **AI gap detection** from a single shelf photo — no barcodes, no planograms
- **Confidence-gated dual approach**: single-image first (HIGH/MEDIUM confidence → done), baseline comparison fallback (LOW confidence)
- **Real-time alerts** with urgency levels: CRITICAL / HIGH / MEDIUM / LOW
- **Role-based dashboards**: managers see analytics, workers see task lists, suppliers see read-only shelf status
- **Scan history** with expandable detail — products to restock, AI reasoning, recommended actions
- **Mark as restocked** — workers delete completed tasks, keeping dashboards clean
- **AI recommendations** — prioritized restock actions from the most recent scan
- **Substitute suggestions** — when a product is out, the AI suggests alternatives from the inventory database

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                        │
│         React 18 + TypeScript + Tailwind            │
│   Manager Dashboard │ Scanner │ Task List │ Viewer  │
└───────────────────┬─────────────────────────────────┘
                    │ REST API (JWT Bearer)
┌───────────────────▼─────────────────────────────────┐
│                     Backend                         │
│              FastAPI + SQLAlchemy                   │
│                                                     │
│  /auth   /analyze   /baseline   /history   /users   │
│                                                     │
│   AnalyzeService ──► AI Provider (GPT-4o / Ollama)  │
│   HealthScore    ──► SubstituteService               │
└───────────────────┬─────────────────────────────────┘
                    │ asyncpg / aiosqlite
┌───────────────────▼─────────────────────────────────┐
│            Database (PostgreSQL / SQLite)            │
│      users │ scans │ baselines │ images │ products   │
└─────────────────────────────────────────────────────┘
```

### Scan Flow

```
Worker takes photo
       │
       ▼
POST /analyze
       │
       ▼
Step 1: Single-image analysis (GPT-4o)
       │
       ├─► confidence HIGH or MEDIUM ──► Return result, save to DB
       │
       └─► confidence LOW
                   │
                   ▼
           Step 2: Baseline comparison (if baseline exists)
                   │
                   ├─► Success ──► Return enriched result
                   │
                   └─► No baseline ──► Return single-image result anyway
                                       (labeled "fallback")
```

---

## User Roles

| Role | Access |
|---|---|
| **manager** | Full dashboard, alerts, AI recommendations, scan history, start scans |
| **worker** | Scan shelves, view task list, mark tasks as restocked |
| **supplier** | Read-only shelf status, health score, scan history |

JWT tokens are valid for 8 hours (a full shift).

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.136 | REST API framework |
| SQLAlchemy | 2.0 | Async ORM |
| asyncpg | 0.29 | PostgreSQL async driver |
| aiosqlite | 0.22 | SQLite fallback driver |
| OpenAI SDK | 2.33 | GPT-4o vision + embeddings |
| python-jose | 3.5 | JWT auth |
| Pydantic | 2.13 | Request/response schemas |
| uvicorn | 0.46 | ASGI server |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| TypeScript | 5.3 | Type safety |
| Vite | 5.0 | Build tool |
| Tailwind CSS | 3.3 | Utility-first styling |
| Framer Motion | 10.16 | Animations |
| React Router | 6.20 | Client-side routing |
| lucide-react | 0.292 | Icons |

---

## Project Structure

```
Digital-Eyes---Inventory-Manager/
├── backend/
│   ├── ai/
│   │   ├── prompts.py          # GPT-4o prompt templates (single-image + baseline)
│   │   ├── vision.py           # Vision service dispatcher
│   │   ├── embeddings.py       # Text embedding service
│   │   └── providers/
│   │       ├── openai_provider.py   # GPT-4o implementation (detail: high, temp: 0)
│   │       └── ollama_provider.py   # Local Ollama fallback
│   ├── api_routers/
│   │   ├── analyze.py          # POST /analyze
│   │   ├── auth.py             # POST /auth/login, /auth/register
│   │   ├── baseline.py         # POST /baseline, GET /baseline/status
│   │   ├── history.py          # GET /history, DELETE /history/{id}
│   │   └── database/           # Admin DB management routes
│   ├── auth/
│   │   ├── jwt.py              # Token create/decode (8h expiry)
│   │   └── dependencies.py     # FastAPI role guard (require_roles)
│   ├── db/
│   │   ├── db_core.py          # Engine + session factory + init_db
│   │   └── db_models.py        # SQLAlchemy table definitions
│   ├── schemas/                # Pydantic request/response models
│   ├── services/
│   │   ├── analyze_service.py  # Confidence-gated scan orchestration
│   │   ├── health_score.py     # Gap severity → 0-100 score
│   │   └── substitute_service.py  # Find alternative products
│   ├── .env.example
│   ├── main.py                 # FastAPI app + CORS + lifespan
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ManagerDashboard.tsx   # Alerts, health score, AI recommendations
│   │   │   ├── ScannerDashboard.tsx   # Task list with expand/collapse detail
│   │   │   ├── ScannerPage.tsx        # Photo upload + live analysis results
│   │   │   └── ViewerPage.tsx         # Read-only shelf status (supplier role)
│   │   ├── components/
│   │   │   ├── DashboardComponents.tsx  # HealthScore, AlertItem
│   │   │   ├── RecentScansWidget.tsx    # Expandable scan history (shared)
│   │   │   ├── Layout.tsx
│   │   │   ├── Button.tsx
│   │   │   └── LoadingState.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Typed API client (fetch + JWT headers)
│   │   └── context/
│   │       └── AuthContext.tsx  # Login state + role routing
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- An **OpenAI API key** with GPT-4o access
- **Docker + Docker Compose** (for the quick start path)
- **Python 3.11+** and **Node.js 18+** (for the manual path)
- **PostgreSQL 14+** (optional — falls back to SQLite automatically)

---

### Quick Start with Docker

The fastest way to run the full stack locally.

```bash
# 1. Clone the repo
git clone https://github.com/your-org/Digital-Eyes---Inventory-Manager.git
cd Digital-Eyes---Inventory-Manager

# 2. Create and configure the backend environment file
cp backend/.env.example backend/.env
# Open backend/.env and set your OPENAI_API_KEY

# 3. Build and start all services
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

To stop: `docker compose down`

---

### Backend Setup

Manual setup without Docker.

```bash
# 1. Clone the repo
git clone https://github.com/your-org/Digital-Eyes---Inventory-Manager.git
cd Digital-Eyes---Inventory-Manager

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — set OPENAI_API_KEY and DATABASE_URL (see below)

# 5. Start the backend
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# From the repo root
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Default: VITE_API_URL=http://localhost:8000

# 3. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173` (dev server).

---

## Demo Accounts

These accounts are pre-seeded for testing and presentations:

| Username | Password | Role | What you can do |
|---|---|---|---|
| `manager1` | `manager123` | Manager | Full dashboard, alerts, all analytics |
| `worker1` | `worker123` | Worker | Scan shelves, manage task list |
| `supplier1` | `supplier123` | Supplier | Read-only shelf status view |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key |
| `OPENAI_VISION_MODEL` | No | `gpt-4o` | Vision model to use |
| `OPENAI_EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model |
| `AI_PROVIDER` | No | `openai` | `openai` or `ollama` |
| `JWT_SECRET_KEY` | Yes | insecure default | Random secret for signing tokens |
| `DATABASE_URL` | No | SQLite | Full asyncpg connection string |
| `LOG_LEVEL` | No | `INFO` | Logging verbosity |
| `MAX_IMAGE_SIZE_MB` | No | `10` | Max upload size |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend base URL |

---

## Database Configuration

The backend prefers PostgreSQL and automatically falls back to SQLite if PostgreSQL is not configured or unavailable.

**Option A — PostgreSQL (recommended for production):**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/shelfguard
```

**Option B — Individual variables (if DATABASE_URL is not set):**
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=shelfguard
POSTGRES_USER=shelfguard
POSTGRES_PASSWORD=shelfguard
```

**Option C — SQLite (zero config, development only):**
Leave all database variables unset. The backend creates `backend/inventory.db` automatically.

Database tables are created automatically on first startup via `init_db()`.

---

## How the AI Works

### Single-Image Mode
A single shelf photo is sent to GPT-4o with `detail: high` and `temperature: 0`. The model returns a structured JSON with:
- Overall fill percentage and status (FULL / PARTIAL / EMPTY)
- Per-section analysis (left → right scan)
- Restocking list with urgency per item (HIGH / MEDIUM / LOW)

### Baseline Comparison Mode
A "morning baseline" photo (fully stocked) is stored in the database. During analysis, both the baseline and current photo are sent to GPT-4o simultaneously. The model identifies what changed — missing facings, depleted rows, empty slots — using the baseline as ground truth.

### Confidence-Gated Routing
```
Single-image result confidence == HIGH or MEDIUM  →  Use it directly
Single-image result confidence == LOW             →  Fall back to baseline comparison
No baseline stored + LOW confidence               →  Return single-image result (labeled "fallback")
```

### Priority Mapping
Each restocking item's urgency (from the AI) maps to a dashboard alert priority:

| AI Urgency | Gap Severity | Dashboard Priority |
|---|---|---|
| HIGH | fully_out | CRITICAL |
| MEDIUM | low_stock | MEDIUM |
| LOW | low_stock | LOW |

---

## API Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | public | Get JWT token |
| `POST` | `/auth/register` | public | Create account |
| `POST` | `/analyze` | worker, manager | Analyze shelf photo |
| `POST` | `/baseline` | worker, manager | Upload baseline photo |
| `GET` | `/baseline/status` | worker, manager | Check if baseline exists for shelf |
| `GET` | `/history` | manager, supplier, worker | Paginated scan history |
| `DELETE` | `/history/{id}` | manager, worker | Delete scan (mark restocked) |

---

## Team

Built at the **ELAD Software Hackathon — CyberPro AI Developer Bootcamp**, April 2026.

| Name | Role |
|---|---|
| **Idan** | AI & Backend Lead |
| **Yali** | Database & Infrastructure |
| **Tamer** | Frontend |
| **Yosef** | Testing & QA |
