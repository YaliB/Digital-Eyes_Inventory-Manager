# DevOps & CI/CD Guide

## Overview

Every push or pull request to `main` triggers the GitHub Actions pipeline defined in `.github/workflows/main.yml`. The pipeline has two CI jobs that run in parallel, followed by two deploy jobs that only run on a direct push to `main` (not on PRs).

```
push to main
     │
     ├── backend-ci  ──────────────┐
     │   • pip install             │
     │   • docker build            ├── (both pass) ──► deploy-backend  → Railway
     │                             │                   deploy-frontend → Vercel
     └── frontend-ci ──────────────┘
         • npm ci
         • tsc --noEmit
         • npm run build
         • docker build
```

---

## Jobs

### `backend-ci`
| Step | What it does |
|------|--------------|
| Setup Python 3.12 | Matches the version used in `backend/Dockerfile` |
| `pip install` | Installs `backend/requirements.txt` (cached between runs) |
| Docker build | Builds the backend image using `backend/Dockerfile` with the project root as context |

### `frontend-ci`
| Step | What it does |
|------|--------------|
| Setup Node 20 | Matches the version used in `frontend/Dockerfile` |
| `npm ci` | Clean install from `package-lock.json` (cached) |
| `tsc --noEmit` | Full TypeScript type check — fails the pipeline on type errors |
| `npm run build` | Vite production build |
| Docker build | Builds the frontend image using `frontend/Dockerfile` |

### `deploy-backend` (main only)
Uses the [Railway CLI](https://docs.railway.app/reference/cli-api) (`railway up`) to push the latest code to your Railway backend service.

### `deploy-frontend` (main only)
Uses the [`amondnet/vercel-action`](https://github.com/amondnet/vercel-action) to deploy the `frontend/` directory to Vercel with `--prod`.

---

## Secrets to add in GitHub

Go to **Settings → Secrets and variables → Actions → New repository secret** and add each of the following:

| Secret name | Where to get it | Required |
|-------------|-----------------|----------|
| `RAILWAY_TOKEN` | Railway dashboard → Account Settings → Tokens | Yes (deploy) |
| `VERCEL_TOKEN` | Vercel dashboard → Account Settings → Tokens | Yes (deploy) |
| `VERCEL_ORG_ID` | Run `vercel whoami` locally or check `.vercel/project.json` after `vercel link` | Yes (deploy) |
| `VERCEL_PROJECT_ID` | Run `vercel link` in `frontend/`, then copy from `.vercel/project.json` | Yes (deploy) |
| `VITE_API_URL` | Your Railway backend public URL, e.g. `https://your-app.railway.app/api` | Recommended |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Yes (runtime) |
| `JWT_SECRET_KEY` | Any long random string — generate with `openssl rand -hex 32` | Yes (runtime) |

> **Runtime secrets** (`OPENAI_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`) are set directly in the Railway service environment, not in GitHub Actions. GitHub only needs them if you run integration tests in CI.

---

## Railway setup

1. Create a new project at [railway.app](https://railway.app)
2. Add a **PostgreSQL** service — Railway will inject `DATABASE_URL` automatically
3. Add a **Web Service**, point it at this repo, set the root directory to `.` and Dockerfile path to `backend/Dockerfile`
4. In the service's **Variables** tab, add:
   - `OPENAI_API_KEY`
   - `JWT_SECRET_KEY`
   - `LOG_LEVEL=INFO`
   - `MAX_IMAGE_SIZE_MB=10`
   - (Railway injects `DATABASE_URL` from the linked PostgreSQL service)

---

## Vercel setup

```bash
# From inside frontend/
npm i -g vercel
vercel login
vercel link          # creates .vercel/project.json — copy orgId and projectId
```

Set the following in Vercel project **Settings → Environment Variables**:
- `VITE_API_URL` = your Railway backend URL

---

## Local development (no Docker)

```bash
# Backend
cd Digital-Eyes_Inventory-Manager
.venv\Scripts\activate          # Windows
uvicorn backend.main:app --reload

# Frontend (separate terminal)
cd frontend
npm run dev
```

## Local development (Docker Compose)

```bash
# Copy the example env and fill in your OpenAI key
cp .env .env.local
# edit .env.local

docker compose up --build
# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
```
