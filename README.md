# Rice Pest Identifier — v2

A full rewrite of the rice-pest thesis app as a modern, installable
**API + SPA PWA**: a Flask REST API serving a Keras classifier and a
recommendation engine, with a React single-page frontend that works in your
browser, installs to your phone's home screen, and identifies pests **even
when offline**.

```
ricepest-app/
├── backend/          Flask API (blueprints, SQLAlchemy, tests)
│   ├── app/          application factory, models, ml predictor, seed data
│   ├── migrations/   database migrations (Flask-Migrate)
│   └── tests/        53 pytest tests
├── frontend/         React 19 + Vite + Tailwind v4 PWA
├── models/           model weights (.keras, gitignored) + metadata
├── scripts/          training, TF.js export, icons, seed assets
├── deploy/           gunicorn config + Windows production script
├── data/             runtime SQLite db + uploads (gitignored)
└── Dockerfile        production container (builds frontend, runs gunicorn)
```

## Features

- **Identify** — live rear-camera scan with viewfinder/scan-line animation, or
  pick from gallery. The server model returns the pest plus top-3
  probabilities; results animate in with a confidence ring.
- **Works offline** — the PWA shell is cached by a service worker, and a
  3.8 MB MobileNetV3-Small model runs **on-device** via TensorFlow.js
  (toggle "On-device AI" on the Identify screen). Scans taken offline are
  queued and synced automatically.
- **Pest library** — seeded catalog with photos, scientific names, and
  damage signs (English + Tagalog).
- **Treatment recommendation** — the original 32-row expert decision tree
  (pest → season → density → eradication technique) with structured Tagalog
  steps, materials, and precautions.
- **Scan history** — every identification saved per device; timeline grouped
  by day.
- **Admin dashboard** — session-authenticated SPA with scans-per-day chart,
  pest-mix donut, KPIs, catalog CRUD with image upload, and user management.

## Quick start (development)

Requirements: Python 3.10 (with TensorFlow 2.18), Node 22.

```bash
# 1. Backend
cd backend
python -m pip install -r requirements-dev.txt
export FLASK_ENV=development SECRET_KEY=dev-secret
python -m flask --app wsgi db upgrade        # create tables
export ADMIN_PASSWORD=admin123               # dev only!
python -m flask --app wsgi seed              # admin user + pest catalog

# 2. Frontend (separate terminal)
cd ../frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to :5000)
```

The backend dev server is `python run.py` from `backend/` (port 5000).

## Production

### Windows (waitress)

```bat
:: 1. Put SECRET_KEY and ADMIN_PASSWORD in ricepest-app\.env (see .env.example)
deploy\run-windows-prod.bat        :: migrations + seed + waitress on :8000
```

### Linux / Docker (gunicorn)

```bash
docker compose up --build          # after filling .env with SECRET_KEY + ADMIN_PASSWORD
# app on http://localhost:8000
```

The Flask app serves the built frontend from `frontend/dist`, so one origin
serves everything (no CORS, camera works, session cookies just work).
**Camera access requires HTTPS** in production — put the app behind a reverse
proxy with TLS (or use an ngrok/self-signed tunnel for demos).

### Switching the server model

The API uses the original thesis model by default:

| env var | default | compact alternative |
|---|---|---|
| `MODEL_PATH` | `models/my_trained_model6.keras` | `models/compact.keras` |
| `MODEL_META_PATH` | `models/model_meta.json` | `models/model_meta_compact.json` |

The compact MobileNetV3-Small (4.4 MB, val acc ≈ 96.8% on the 4-class
dataset) is faster to load and matches the on-device model.

## Machine-learning pipeline

```bash
python scripts/train_compact_model.py --data-dir ../Dataset --epochs 12
python scripts/export_tfjs.py            # -> frontend/public/models/compact
python scripts/generate_icons.py         # PWA icons from the legacy logo
```

`export_tfjs.py` rebuilds the model without augmentation layers, saves legacy
H5 (the only format the tfjs converter reads), converts to a tfjs layers
model, and writes `manifest.json` consumed by the frontend. After exporting,
`npm run build` in `frontend/` to ship the model with the PWA.

## Security notes

- `SECRET_KEY` is **required** in production (the app refuses to boot without it).
- Passwords are hashed (scrypt); sessions are HttpOnly + SameSite=Lax cookies.
- Uploads are validated (extension whitelist, image decode check, 8 MB cap),
  stored under random UUID names, and EXIF-stripped.
- Rate limiting on `/api/predict`; admin routes all require a session;
  deletes are POST-only.
- The legacy app's committed credentials in `users.json` are **not migrated**;
  set a fresh `ADMIN_PASSWORD` when seeding.
- In-memory rate limiting is per-worker; add Redis (`StorageURI`) if you scale
  beyond one worker.

## Commands

| where | command | what |
|---|---|---|
| `backend/` | `python -m pytest -q` | 53 API/model tests |
| `backend/` | `python -m ruff check .` | lint |
| `frontend/` | `npm run lint` / `npm run build` | ESLint / production build |
| `backend/` | `python -m flask --app wsgi seed` | create admin + catalog |

## Legacy app

The original multi-page Flask app (templates, STATIC, pysondb) is untouched
at the repository root; everything in `ricepest-app/` is independent of it.
`video.py` (the old webcam experiment) is superseded by the in-app camera.
