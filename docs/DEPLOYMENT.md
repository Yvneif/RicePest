# Production Deployment Plan — 100% Free Tiers

How to put RicePest online at zero cost, from a quick demo to a stable
deployment. Related: [BRD](BRD.md) · [Roadmap](ROADMAP.md).

**The one constraint that shapes everything:** TensorFlow is memory-hungry.
The original 91 MB ResNet50 needs > 1 GB RAM loaded, which no meaningful free
tier offers. **Deploy with the compact model** (4.4 MB MobileNetV3-Small,
~96.8% accuracy — `models/compact.keras`) and the CPU-only TensorFlow package.
The free tiers below comfortably fit that.

---

## Option A — Quick demo from your own PC (5 minutes, zero accounts)

Best for: presenting on a phone today, thesis defense on the same network.

```bash
# 1. Windows Firewall (once, Administrator terminal):
netsh advfirewall firewall add rule name="RicePest App (port 8000)" dir=in action=allow protocol=TCP localport=8000 profile=private

# 2. Serve the built app (from ricepest-app\backend):
set FLASK_ENV=production & set SECRET_KEY=<random-hex> & set ADMIN_PASSWORD=<strong-password>
python -m waitress --listen=0.0.0.0:8000 --threads=8 wsgi:app

# 3. HTTPS tunnel so the phone camera works (either tool):
npx cloudflared tunnel --url http://localhost:8000     # Cloudflare quick tunnel, no account
ngrok http 8000                                        # free account required
```

You get an `https://…` URL — full experience on any phone: live camera,
install prompt, everything. The URL changes each run (fine for demos).
`data/` stays on your PC, so scan history persists.

## Option B — Recommended free hosting: Hugging Face Spaces (Docker)

Best for: an always-on public URL for the thesis/demo period. Free tier gives
2 vCPUs and 16 GB RAM — the most generous free compute of any host — with
HTTPS included (camera and PWA install just work).

1. Create an account at huggingface.co → **New Space** → SDK: **Docker** (CPU basic, free).
2. Push the app to the Space's git repo (Space git works like GitHub):
   ```bash
   git clone https://huggingface.co/spaces/<your-name>/ricepest
   # copy ricepest-app/* into the clone, then:
   git add . && git commit -m "feat: deploy RicePest" && git push
   ```
3. In the Space **Settings → Variables and secrets**, add:
   - Secret `SECRET_KEY` (long random hex)
   - Secret `ADMIN_PASSWORD`
   - Variable `FLASK_ENV=production`
4. Make the Dockerfile listen on the port HF provides — add to the Dockerfile
   CMD/environment: `PORT=7860` and change gunicorn's bind to
   `0.0.0.0:${PORT}` (HF routes public HTTPS to 7860).
5. Ship **only the compact model** in the image (`models/compact.keras`, 4.4 MB —
   well within the repo limit; the 91 MB ResNet50 is not worth pushing).
6. Visit `https://<your-name>-ricepest.hf.space` — done.

**Free-tier caveats (accept for demo use):**
- Space sleeps after ~48 h of zero traffic; the first request after a sleep
  takes ~1–2 min (model reload). Ping it with UptimeRobot (free monitor every
  30 min) to keep it warm.
- **Disk is ephemeral:** uploaded scan photos and the SQLite DB reset on
  restart. Demo-acceptable; for persistence see "Database" below.

## Option C — Render.com free web service

Free tier: 512 MB RAM, sleeps after 15 min idle, ephemeral disk.
Only viable with the compact model + `tensorflow-cpu` (the Dockerfile already
swaps this via the `sed` line — verify the image RAM stays under ~450 MB).
Deploy = connect the GitHub repo, Render builds the Dockerfile. Use a
UptimeRobot ping to reduce spin-downs. Stricter memory than HF Spaces; treat
as fallback, not primary.

## Option D — Oracle Cloud "Always Free" VM (most control, most setup)

A permanently-free small VM (ARM, 24 GB RAM) runs anything, including the big
ResNet50 model, a real persistent disk, and your own domain with Let's
Encrypt. Requires account setup (card for identity check) and basic Linux
admin. Choose this when graduating from demo to a real pilot deployment.

---

## Database (persistence on free tiers)

The app reads `DATABASE_URL`, so moving off SQLite needs **no code changes**:

| Provider | Free tier | Notes |
|---|---|---|
| **Neon** | Postgres, 0.5 GB, autosuspend | Set `DATABASE_URL=postgresql://…`; run `flask db upgrade` once at deploy |
| **Supabase** | Postgres, 500 MB | Same as above |
| Turso | Managed SQLite, 9 GB | Closest to the dev database; needs the libsql SQLAlchemy dialect |
| SQLite on disk | — | Fine for Option A; resets on redeploy for B/C |

Catalog content is re-seedable (`flask seed`, idempotent); **scan history is
the only data that needs a real database** if you want it to survive redeploys.

## Production checklist (any option)

- [ ] `SECRET_KEY` set to a long random value (never committed)
- [ ] `ADMIN_PASSWORD` set strong; log in once and verify
- [ ] `COOKIE_SECURE=true` (HTTPS is live on Options B/C/D)
- [ ] `FLASK_ENV=production` (debug off, production validation active)
- [ ] `flask --app wsgi db upgrade && flask --app wsgi seed` ran
- [ ] Compact model shipped (`models/compact.keras` + `model_meta_compact.json`);
      switch via `MODEL_PATH` / `MODEL_META_PATH` if you want the original model
- [ ] `POST /api/health` returns `200` and you bookmarked it as the uptime check
- [ ] Phone test: camera opens over HTTPS, PWA installs, offline scan queues
- [ ] TF.js offline model verified once with airplane mode on

## Suggested CI (free — GitHub Actions)

Add `.github/workflows/ci.yml` to the RicePest repo:

```yaml
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.10" }
      - run: pip install -r backend/requirements-dev.txt -r /dev/null || true
      - run: pip install ruff && pip install -r backend/requirements.txt
      - working-directory: backend
        run: ruff check . && python -m pytest -q
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - working-directory: frontend
        run: npm run lint && npm run build
```

(Backend tests that need the model weights should be guarded or given a stub
`MODEL_PATH`; the suite already runs without weights via the stub predictor.)

## Cost summary

| Item | Service | Cost |
|---|---|---|
| Code hosting | GitHub | Free |
| App hosting | HF Spaces (or Render) | Free |
| Database (optional) | Neon / Supabase | Free |
| HTTPS | Included (or Let's Encrypt on Oracle) | Free |
| Uptime keep-alive | UptimeRobot | Free |
| CI | GitHub Actions | Free |
| **Total** | | **₱0 / $0** |
