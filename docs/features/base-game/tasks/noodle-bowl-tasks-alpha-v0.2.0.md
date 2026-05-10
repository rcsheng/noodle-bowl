# Noodle Bowl — Task List alpha-v0.2.0

**PRD ref:** `noodle-bowl-prd-alpha-v0.2.0.md`
**Last updated:** 2026-05-10
**Note:** Absorbs all open alpha-v0.1.2 items — no standalone v0.1.2 build was ever cut.

---

## Content pipeline (PRD §1)

- [x] Fix `pipeline/publish.ts` — auto-deactivate active docs before publishing new version
- [x] Add `--days=N` to `ingest.ts` for bulk historical Wikipedia ingestion
- [x] Add `--scale=N` to `select.ts` to scale selection targets
- [x] Remove hardcoded `slice(0, 20)` cap in `generate.ts` so quip/wave scale with lede
- [ ] Bulk pipeline run — emulator dry run (see runbook below)
- [ ] Bulk pipeline run — production publish (60-day bank)
- [ ] Verify app reads live content (no bundled fallback triggered)
- [ ] Verify subsequent daily run correctly deactivates previous version

---

## App Store prep (PRD §2) — MANUAL

- [ ] Write and publish privacy policy to `https://noodlebowl.app/privacy`
- [ ] Fill in App Store Connect listing (name, subtitle, description, keywords, URLs, category, age rating)
- [ ] Capture and upload screenshots — iPhone 6.9" minimum
- [ ] Verify `app.json` version for public release

---

## Cross-cutting quality (PRD §3)

- [ ] Run code-reviewer agent — all changes since alpha-v0.1.1 (deep link routing + pipeline fix)
- [ ] Run security-reviewer agent
- [ ] Update `README.md` — add `seed:emulator`, `seed:prod`, `start:dev`, `start:qa` to quick-start _(carried from v0.1.2)_
- [ ] `npm test` — all passing
- [ ] `npx tsc --noEmit` — clean

---

## Release

- [ ] Cut EAS build: `eas build --platform ios --profile production`
- [ ] Submit to App Store: `eas submit --platform ios --profile production --latest` (select App Store, not TestFlight)
- [ ] Tag: `git tag -a alpha-v0.2.0 -m "feat: live content pipeline, App Store submission"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`

---

## Pipeline runbook

### Prerequisites

Confirm these are set in `.env.local`:

```
THENEWSAPI_TOKEN=<your token>      # from thenewsapi.com
ANTHROPIC_API_KEY=<your key>       # from console.anthropic.com
FIREBASE_PROJECT_ID=noodle-bowl    # or leave unset — defaults to 'noodle-bowl'
```

For the production publish step you also need:
```
GOOGLE_APPLICATION_CREDENTIALS=<path to service account JSON>
```

---

### Bulk run (first time — 60-day bank)

Do this once before launch to pre-fill the content bank.

```bash
# 1. Start the Firebase emulator for the dry run (separate terminal)
npm run emulator

# 2. Bulk ingest — fetches today's news + Wikipedia "On This Day" for 60 dates
npm run pipeline:ingest:bulk
# → ~800–1000 unique candidates in pipeline/data/candidates/YYYY-MM-DD.json

# 3. Bulk select — 2× targets: 60 lede, 60 spread, 30 SoF clusters
npm run pipeline:select:bulk
# → pipeline/data/selected/YYYY-MM-DD.json

# 4. Generate — calls Claude API for each selected item
npm run pipeline:generate
# Takes ~15–20 minutes. Calls Sonnet (lede, spread, sof) + Haiku (quip, wave).
# → pipeline/data/generated/YYYY-MM-DD.json

# 5. Review output in terminal (human gate)
npm run pipeline:review
# Shows 5 random samples of each game type. Re-run step 4 if quality looks off.

# 6. Dry run — publish to emulator first
npm run pipeline:publish:emulator
# Confirm 'y'. Check http://localhost:4000 for contentVersions with active: true.

# 7. Production publish
npm run pipeline:publish
# Target: PRODUCTION (project: noodle-bowl). Confirm 'y'.
```

**Expected output counts after bulk generate:**
- lede: ~55–60 items
- spread: ~50–60 items (depends on number candidates available)
- sof: ~25–30 items
- quip: ~55–60 items
- wave: ~55–60 items

---

### Daily incremental run (ongoing)

Run this daily (or as needed) to keep content fresh. Use the standard scripts — no bulk flags.

```bash
npm run pipeline:ingest      # today's news + today's Wikipedia "On This Day"
npm run pipeline:select      # 30 lede, 30 spread, 15 SoF (daily targets)
npm run pipeline:generate    # ~2–3 minutes
npm run pipeline:review      # spot-check output
npm run pipeline:publish     # deactivates previous version, publishes new one
```

---

### Verifying the app reads live content

After any production publish:

1. Run `npm run start:qa` (prod Firebase, QA collections)
2. Open the Firestore console — confirm `contentVersions` has exactly one `active: true` doc
3. Launch app, play a game — content should reflect what was published (spot-check a headline)
4. Force-quit and relaunch — content loads instantly from AsyncStorage cache

---

## Deferred (not in this release)

- [ ] [P2] Garbage-collect orphaned `received_help` interactions after N days
- [ ] [P2] Animated entry/exit on Help Result Card and Challenge Reply Card
- [ ] [P2] Persist `homeCardDismissed` to Firestore across devices
- [ ] [P2] Shield-fill animation
- [ ] [P2] Architecture docs — auth + content + stats flow diagrams
- [ ] [P3] Push notifications (permanently deferred)
