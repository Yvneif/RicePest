# Future Improvements — RicePest

Prioritized backlog beyond v2. Grouped by horizon; within each group, ordered
by (user value ÷ effort). Related: [BRD](BRD.md) · [Deployment Plan](DEPLOYMENT.md).

## Next release (high value, low effort)

1. **Data flywheel: review and relabel low-confidence scans.**
   The admin dashboard already stores every scan with confidence and top-3.
   Add an admin "Review queue" that flags scans with confidence < 0.6 or
   disagreement between top-1 and the user's subsequent treatment choice.
   Export labelled corrections as a new training split — this is the single
   highest-leverage improvement because it compounds every other model gain.
2. **Photo-quality guardrails before inference.**
   Blur/brightness detection client-side (canvas heuristics are enough) with a
   "photo too dark / too blurry, retake?" prompt. Cuts the largest source of
   wrong identifications at near-zero cost.
3. **Share / export a scan result.**
   Web Share API button on the result card (image + pest + technique) so a
   technician can send advice to a farmer over Messenger/SMS — the dominant
   information flow in the target setting.
4. **English toggle for advisory content.**
   Steps/materials/precautions exist in Tagalog; add parallel English strings
   and a language switch persisted per device.
5. **Frontend tests + CI.**
   Vitest for the API client and offline queue, Playwright smoke for the
   identify flow; GitHub Actions running `pytest`, `ruff`, `eslint`, and the
   production build on every push. (Free on GitHub-hosted runners.)

## 3–6 months

6. **Fine-tune the compact model on the flywheel data; retrain pipeline as code.**
   Extend `scripts/train_compact_model.py` with a `--extra-data` option and a
   documented monthly cadence; version models in `model_meta.json` so the
   admin dashboard can display which model produced each scan (already stored).
7. **More pests and diseases.**
   The pipeline is class-agnostic. Highest-value additions for the target
   region: rice black bug, armyworm, tungro virus, blast and bacterial leaf
   blight (diseases need a separate "disease vs pest" mode in the result UI).
   Each class needs ~300+ verified images.
8. **Farmer accounts and field records (opt-in).**
   Keep anonymous scanning as the default; add lightweight accounts for
   technicians so scans attach to a field/season and history becomes
   longitudinal (per-field pest pressure over time).
9. **Severity and action-threshold guidance.**
   Density buckets already exist; add per-pest economic-threshold reference
   (e.g., "10 rice bugs per 20 hills") into the recommendation result so the
   count step teaches the threshold itself.
10. **Postgres migration path exercised.**
   `DATABASE_URL` is already supported — run one deployment on free Postgres
   (Neon/Supabase) to prove migrations and concurrent access before any real
   multi-user rollout.

## 6–12 months and beyond

11. **App-store distribution via Capacitor.**
    Wrap the existing PWA (no rewrite): adds push notifications, guaranteed
    background sync, and store presence; the server API stays unchanged.
12. **On-device model as the default.**
    Quantize the compact model (uint8, ~1.5 MB) or move to TFLite via
    `tflite-support` so offline identification is instant and the server
    becomes optional for most users.
13. **Community pest-pressure map.**
    Aggregate anonymized scans (barangay-level heat map of pest reports per
    week) — high value for municipal agriculture offices; requires opt-in
    location on scans and a public aggregation endpoint.
14. **Integration with government advisories.**
    Link each technique to PhilRice/DA publication references so recommendations
    carry institutional authority; long-term, an official content partnership.
15. **Observability.**
    Structured request logging plus a free error tracker (Sentry free tier) and
    privacy-friendly analytics (Umami self-hosted or Cloudflare Web Analytics)
    to measure the O1–O6 objectives from the BRD in production.

## Explicitly not planned
- Paid API tiers / ads — contradicts the accessibility mission.
- Multi-tenant SaaS — out of scope until a real institutional partner exists.
