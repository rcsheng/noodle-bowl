# Pipeline Progress Tracker

Last updated: 2026-05-31

## Status

Paused intentionally — historical content packs are not ready to launch.
Cost visibility was missing (ingest step was untallied); now fixed.
Estimated full-year cost ~$2/week all-in (ingest + generate).

## What's done (published to Firestore PRODUCTION)

### 2025-Q4 — ✅ Complete
Weeks W40–W52 (2025-09-29 → 2025-12-22).
- Originally run with old Spread-first selection logic.
- **Migrated** with `--skip-ingest` after SoF-first fix — new content published with `--force`.

### 2026-W01–W21 — ✅ Complete
Weeks 2026-W01 (2025-12-29) → 2026-W21 (2026-05-18).
- All weeks had existing candidates files; migrated with `--skip-ingest`.

### 2025-Q1 — ⚠️ Partial (W01 failed, W02–W08 done, W09–W13 not started)
| Week | Status | Notes |
|------|--------|-------|
| W01 (2024-12-30) | ❌ Failed | Transient JSON parse error on web ingest — needs re-run |
| W02 (2025-01-06) | ✅ Published | lede:17 spread:28 sof:15 |
| W03 (2025-01-13) | ✅ Published | lede:17 spread:23 sof:22 |
| W04 (2025-01-20) | ✅ Published | lede:14 spread:20 sof:17 |
| W05 (2025-01-27) | ✅ Published | lede:24 spread:22 sof:15 |
| W06 (2025-02-03) | ✅ Published | lede:18 spread:22 sof:16 |
| W07 (2025-02-10) | ✅ Published | lede:21 spread:23 sof:15 |
| W08 (2025-02-17) | ❌ Stopped mid-ingest | Candidates file may be partial — re-run from here |
| W09–W13 | ❌ Not started | |

### 2025-Q2 — ❌ Not started
### 2025-Q3 — ❌ Not started

---

## How to resume

### Retry W01 (failed):
```bash
npm run pipeline:historical -- --week=2025-W01
```

### Resume Q1 from W08:
```bash
npm run pipeline:historical -- --week-range=2025-W08:2025-W13
```

### Run Q2 and Q3:
```bash
npm run pipeline:historical:2025-q2
npm run pipeline:historical:2025-q3
```

### Full remaining 2025 in one shot:
```bash
npm run pipeline:historical -- --week-range=2025-W08:2025-W39
# Then separately:
npm run pipeline:historical -- --week=2025-W01
```

---

## Key fixes made (2026-05-31)

### 1. SoF-first selection (`pipeline/select.ts`)
Old order: Spread → SoF → Lede
New order: **SoF → Spread → Lede**

Spread was eating science/health/nature/technology stories before SoF could pick them.
SoF yield improved from 3–13/week → 15–22/week.
All published weeks (Q4 2025 + 2026-W01–W21 + Q1 partial) already migrated.

### 2. Ingest cost visibility (`pipeline/ingest-web-historical.ts`)
Token usage now tracked and logged per week.
Ingest costs ~$1.65/week (5× the generate step of ~$0.30/week).
Total per week: ~$2.00 all-in.

### 3. `--skip-ingest` flag (`pipeline/historical.ts`)
Skips Step 1 when candidates file already exists.
Used for re-select/re-generate migrations without re-fetching articles.

---

## Cost estimates

| Scope | Weeks | Est. cost |
|-------|-------|-----------|
| Full 2025 (52 weeks) | 52 | ~$104 |
| Remaining 2025 (W08–W39 + W01 retry) | 33 | ~$66 |
| Already spent (this session + prior) | — | ~$50 |
