# Business Requirements Document — Rice Pest Identifier v2

**Product:** Rice Pest Identifier ("RicePest") — installable mobile-first web application
**Version:** 2.0 (full-stack rewrite of the v1 multi-page thesis prototype)
**Status:** Implemented and verified (see Acceptance Criteria, §12)
**Related documents:** [README](../README.md) · [Future Improvements](ROADMAP.md) · [Deployment Plan](DEPLOYMENT.md)

---

## 1. Introduction

### 1.1 Purpose
This document defines the business requirements for RicePest v2, a web-based
rice-pest identification and advisory tool. It is the single reference for what
the product must do, for whom, and how success is measured.

### 1.2 Definitions
| Term | Meaning |
|---|---|
| Scan | One photo submitted for identification, with its result |
| Density class | Filipino pest-count category: *Maritak* (<5), *Marakal* (5–60), *Sobra Karakal* (61–150), *Ali na Abilang* (>150) |
| On-device model | The 3.8 MB TensorFlow.js model that runs in the browser without a server |
| PWA | Progressive Web App — installable, service-worker-cached web application |

## 2. Problem statement

Rice farmers and agriculture students in the Philippines face three recurring
problems when dealing with insect pests:

1. **Late identification.** Stem borers, rice bugs, green leafhoppers, and leaf
   folders cause the most damage before they are noticed; damage at flowering
   (e.g., rice bug pecky grain) is irreversible.
2. **Limited access to experts.** Crop-protection advice is concentrated in
   municipal agriculture offices; turnaround is slow and often text-only.
3. **Poor connectivity.** Field advice tools that require a stable internet
   connection fail exactly where they are needed most.

The v1 prototype proved the concept (photo → CNN → recommended technique) but
was desktop-only, required constant connectivity, and had no data collection.

## 3. Objectives and success metrics

| # | Objective | Metric | Target |
|---|---|---|---|
| O1 | Identify the four priority pests from a single photo | Server-model accuracy on validation data | ≥ 95% (achieved: 96.8% compact / verified live) |
| O2 | Recommend the correct eradication technique | Match against the 32-row expert table | 100% (deterministic decision tree) |
| O3 | Work in the field with no signal | Successful identification with zero connectivity | Identification completes on-device; scans queue and sync |
| O4 | Zero-setup access for users | Install to home screen without an app store | PWA install prompt on Android/desktop |
| O5 | Give administrators operational insight | Scans/day, pest mix, avg confidence visible | Admin dashboard with charts |
| O6 | Stay free to host for thesis/demo purposes | Hosting cost | ₱0 (see Deployment Plan) |

## 4. Stakeholders and target users

| User | Needs | How the product serves them |
|---|---|---|
| **Farmer / field technician** (primary) | Quick, offline-capable pest ID and action advice in Filipino | Camera scan, on-device model, Tagalog treatment steps |
| **Agriculture student / researcher** (primary) | Study tool for pest recognition; data for thesis analysis | Pest library with scientific names and damage signs; scan history |
| **Extension worker / system admin** | Monitor usage; maintain the pest catalog; manage access | Admin dashboard, catalog CRUD, user management |
| **Thesis author** | Defensible, demonstrable system with real data | Scan records with confidence values; documented architecture and tests |

## 5. Scope

**In scope (v2 — delivered)**
- Identification of 4 classes: Green Leafhopper, Leaf Folders, Rice Bug, Stem Borer, plus an *Unrecognized* outcome.
- Rear-camera capture in-app with capture/retake; gallery upload fallback.
- On-device offline identification and automatic sync of offline scans.
- Curated pest library with images, scientific names, damage signs (English/Tagalog).
- Rule-based eradication recommendation (pest × season × density) with structured Tagalog steps, materials, and precautions.
- Per-device scan history.
- Admin: session login, usage dashboard (scans/day, pest mix, avg confidence), catalog CRUD with image upload, user management.
- Installable PWA with offline app shell.

**Out of scope (v2)**
- Native app-store distribution (planned via Capacitor — see Roadmap).
- User accounts for farmers; scans are anonymous and device-scoped.
- Disease (non-insect) detection, severity/yield-loss estimation, pesticide dosage computation.
- Payments, advertising, multi-tenant deployment.

## 6. Functional requirements

### FR-1 Pest identification (server)
- FR-1.1 Accept a JPG/PNG/WebP photo ≤ 8 MB via camera capture or file picker.
- FR-1.2 Return the predicted class, confidence, and top-3 probabilities.
- FR-1.3 Return *Unrecognized* for low-confidence predictions rather than a forced guess.
- FR-1.4 Persist every scan (image, label, confidence, device id, timestamp).
- FR-1.5 Reject invalid files (wrong type, undecodable, oversized) with clear error codes.

### FR-2 Offline identification
- FR-2.1 Offer an opt-in on-device model; download once, cache for later offline use.
- FR-2.2 When offline: identify on-device if the model is cached; otherwise queue the scan.
- FR-2.3 Automatically sync queued scans when connectivity returns, without user action.

### FR-3 Pest library
- FR-3.1 List catalog entries with photo, name, scientific name, description, damage signs, availability status.
- FR-3.2 Search by name/scientific name/description.
- FR-3.3 Detail view with a shortcut to identification.

### FR-4 Treatment recommendation
- FR-4.1 Accept pest type, season (sunny/rainy), and pest count.
- FR-4.2 Map count to the Filipino density classes (§1) exactly as the expert table defines.
- FR-4.3 Return the technique (e.g., *Chemical 1*, *Cultural 4*, *None*) with numbered steps, materials, and precautions in Tagalog.
- FR-4.4 Validate all inputs; unknown pest/season or malformed count is a client error, never a server crash.

### FR-5 Scan history
- FR-5.1 Show the device's past scans, newest first, grouped by day, with thumbnails and confidence.
- FR-5.2 Show pending (queued) offline scans and their sync state.

### FR-6 Administration
- FR-6.1 Username/password login with hashed credentials and server-side sessions; logout.
- FR-6.2 Dashboard: total scans, catalog items, users, scans-per-day (14 days), pest mix, average confidence, recent scans.
- FR-6.3 Catalog CRUD with image upload/replacement and availability status.
- FR-6.4 User management: create users (min 8-char passwords), list, delete (excluding one's own account).
- FR-6.5 All admin endpoints reject unauthenticated requests.

### FR-7 Progressive Web App
- FR-7.1 Installable to the home screen with branded icons and standalone display.
- FR-7.2 App shell loads offline; media and the on-device model are cached.
- FR-7.3 Updates apply automatically via the service worker.

## 7. Non-functional requirements

| Category | Requirement |
|---|---|
| **Performance** | Server inference ≤ ~2 s on CPU for one image; on-device inference ≤ ~2 s on a mid-range phone; app shell interactive in < 3 s on 3G (code-split routes, cached shell) |
| **Reliability** | No single missing component (model file, DB) crashes the process; model absence yields HTTP 503 with a clear message |
| **Security** | Env-based `SECRET_KEY` (required in production); scrypt-hashed passwords; HttpOnly + SameSite cookies; upload whitelist + decode validation + UUID storage names; rate-limited prediction; JSON error handling without stack leaks; security headers (CSP, nosniff, frame-deny, referrer policy) |
| **Privacy** | No farmer accounts; scans tied to a random device id; uploaded photos re-encoded (EXIF/location stripped); photos stored server-side only after identification |
| **Usability** | Mobile-first UI, bottom tab navigation, ≥ 44 px touch targets, Filipino-language advisory content, dark mode |
| **Maintainability** | 53 automated backend tests; Ruff/ESLint/Prettier enforced; SQL migrations; conventional commits |
| **Portability** | Runs on Windows (waitress) and Linux/Docker (gunicorn); model swappable via environment variables |

## 8. System overview

```
Phone / Desktop (installed PWA)
│  React 19 + Vite + Tailwind · service worker · TensorFlow.js (offline)
▼  same origin (JSON over HTTPS)
Flask REST API (blueprints: api · auth · admin · media)
│  SQLAlchemy · SQLite (or Postgres via DATABASE_URL)
│  lazy-loaded Keras model (ResNet50 v1 or MobileNetV3-Small compact)
└── Recommendation engine (sklearn decision tree on the 32-row expert table)
```

Endpoints: `POST /api/predict`, `POST /api/recommend`, `GET /api/catalog`,
`GET /api/model/info`, `GET /api/scans`, `POST /api/auth/login|logout`,
`GET /api/auth/me`, `/api/admin/*` (catalog CRUD, users, stats), `/media/*`.

## 9. Data requirements

- **Training data:** 4,083 labelled images in 4 classes (existing thesis dataset).
- **Models:** `my_trained_model6.keras` (91 MB ResNet50, original) and
  `compact.keras` (4.4 MB MobileNetV3-Small, 96.8% val. accuracy) — both stored
  out of git; the compact model additionally exported to TensorFlow.js.
- **Database:** `users`, `catalog_items`, `scans` tables (see
  `backend/app/models.py`); catalog seeded with 4 reference entries and photos.

## 10. Constraints and assumptions
- Android-first (target users); iOS Safari PWA quirks accepted for v2.
- Tagalog advisory text is the authoritative domain content and must not be reworded.
- Hosting must be possible at zero cost for thesis/demo purposes.
- One deployment = one farmer community/demo scope; multi-tenancy is not assumed.

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Lighting/angle produces false identifications | Wrong advice | Confidence ring + top-3 shown; *Unrecognized* under threshold; capture guidance on screen; Roadmap: photo-quality checks |
| On-device model too large for low-end phones | Offline feature unused | 3.8 MB bundle, opt-in toggle; server fallback |
| Free hosting limits (RAM, spin-down, ephemeral disk) | Unavailable demo | Deployment plan sized to free tiers (compact model, ping keep-alive, Postgres for persistence) |
| Camera blocked without HTTPS | Feature unavailable in LAN demos | Deployment plan uses HTTPS tunnels/hosts; gallery upload always works |

## 12. Acceptance criteria — verified

| Criterion | Evidence |
|---|---|
| FR-1 identification works end-to-end | Live scans: Stem Borer 76.4%, Rice Bug 98.4% with real model |
| FR-1.3 *Unrecognized* outcome | Synthetic noise image → Unrecognized 96.9% |
| FR-4 recommendation parity | Wizard returned *Chemical 1* for Rice Bug/sunny/100, matching the expert table; 17 parameterized backend tests |
| FR-2 offline capability | TF.js export pipeline verified; model bundle served and cached (see Deployment Plan §5) |
| FR-6 admin functions | Login → dashboard with live stats exercised in browser E2E |
| NFR test suite | `pytest`: 53 passed; `ruff check` clean; `npm run lint` clean; production build passes; waitress production smoke test on :8000 |

## 13. Future enhancements
See [ROADMAP.md](ROADMAP.md) for the prioritized improvement backlog and
[DEPLOYMENT.md](DEPLOYMENT.md) for the zero-cost production hosting plan.
