# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Fala-Texto PWA backend** — a FastAPI service that serves medical form schemas stored in MongoDB. It is the API layer for the multi-tenant PWA version of the Fala-Texto clinical documentation system at UFCG/HUAC.

## Commands

### Run locally (API + MongoDB via Docker)

```bash
# Start only MongoDB in Docker, run API locally with hot-reload
docker compose -f docker-compose.backend.yml up -d database
python -m uvicorn app.main:app --reload
```

### Run everything in Docker

```bash
docker compose -f docker-compose.backend.yml up -d
```

### Run API only (no database)

```bash
docker build -t assis-pwa-api .
docker run -d -p 8000:8000 --name pwa-backend-api assis-pwa-api
```

API docs available at: `http://127.0.0.1:8000/docs`

## Architecture

**Entry point:** `app/main.py` — single-file FastAPI app; all routes live here for now.

**Database:** MongoDB (`assis_db`). Configured via environment variables:
- `MONGO_URI` (default: `mongodb://localhost:27017`)
- `MONGO_DB_NAME` (default: `assis_db`)

**Collections and data model:**
- `forms` — top-level form schemas (e.g., "Protocolo de Cirurgia Cardíaca"), each referencing section IDs
- `sections` — form sections with `parentItem` (form ID), `subSections`, `questions` (question IDs), and `tags`
- `questions` — individual questions with `type` (e.g., `ESTIMULADA`), `options`, and `compositeFields`
- `entities` — institutions/tenants (e.g., HUAC)

**Seed data:** `scripts/init-db.js` — mounted into the MongoDB container at startup; inserts a sample cardiac surgery protocol with one section and one question.

**Docker network:** All services connect via `falatexto-network` (bridge). The API container references MongoDB as `mongo:27017` (note: the `MONGO_URI` env var in `docker-compose.backend.yml` uses `mongo` as the hostname, but the service is named `database` — fix if connectivity issues arise).

## Current API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/forms` | List all forms (returns `_id`, `name`, `metadata`) |
| GET | `/forms/{form_id}` | Get a full form by string ID |
