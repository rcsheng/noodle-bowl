# Noodle Bowl — Task List alpha-v0.2.0

**PRD ref:** `noodle-bowl-prd-alpha-v0.2.0.md`
**Last updated:** 2026-05-10
**Note:** Absorbs all open alpha-v0.1.2 items — no standalone v0.1.2 build was ever cut.

---

## Content pipeline (PRD §1)

- [x] Fix `pipeline/publish.ts` — auto-deactivate active docs before publishing new version
- [ ] First pipeline run — emulator dry run (see runbook below)
- [ ] First pipeline run — production publish
- [ ] Verify app reads live content (no bundled fallback triggered)
- [ ] Verify second pipeline run correctly deactivates first version

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

## Pipeline first-run runbook

### Prerequisites

Confirm these are set in `.env.local`:

```
THENEWSAPI_TOKEN=<your token>      # from thenewsapi.com
ANTHROPIC_API_KEY=<your key>       # from console.anthropic.com
FIREBASE_PROJECT_ID=noodle-bowl    # or leave unset — defaults to 'noodle-bowl'
```

`FIREBASE_PROJECT_ID` defaults to `noodle-bowl` if unset. The pipeline reads `.env.local` from `process.cwd()`, so run all commands from the project root.

For the production publish step you also need:
```
GOOGLE_APPLICATION_CREDENTIALS=<path to service account JSON>
```

### Dry run against emulator (recommended first)

Run these in order. Each step reads the output file from the previous step.

```bash
# 1. Start the Firebase emulator (separate terminal)
npm run emulator

# 2. Ingest news stories
npm run pipeline:ingest
# → writes pipeline/data/candidates/YYYY-MM-DD.json

# 3. Select + score candidates
npm run pipeline:select
# → writes pipeline/data/selected/YYYY-MM-DD.json

# 4. Generate game content via Claude API
npm run pipeline:generate
# Takes ~2-3 minutes. Calls Sonnet + Haiku for each game type.
# → writes pipeline/data/generated/YYYY-MM-DD.json

# 5. Review output in terminal (human gate)
npm run pipeline:review
# Prints 5 random samples of each game type. Read through them.
# If anything looks wrong, delete the generated file and rerun step 4.

# 6. Publish to emulator
npm run pipeline:publish:emulator
# Deactivates any existing active versions, writes new ContentVersion.
# Confirm 'y' at the prompt.
```

Verify in the emulator UI (http://localhost:4000) that a `contentVersions` document exists with `active: true`.

### Production publish

After the emulator dry run passes:

```bash
npm run pipeline:publish
# Target: PRODUCTION (project: noodle-bowl)
# Confirm 'y' at the prompt.
```

Requires `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account with Firestore write access.

### Verifying the app reads live content

After publishing:

1. Run `npm run start:qa` (prod Firebase, QA collections)
2. Launch app — open the Firestore console and check that `contentVersions` has exactly one `active: true` doc
3. Force-quit and relaunch the app — content should load without errors
4. Check `AsyncStorage` isn't serving the stale bundled fallback by confirming the `contentVersions` doc matches what you published (e.g., spot-check a Lede headline)

---

## Deferred (not in this release)

- [ ] [P2] Garbage-collect orphaned `received_help` interactions after N days
- [ ] [P2] Animated entry/exit on Help Result Card and Challenge Reply Card
- [ ] [P2] Persist `homeCardDismissed` to Firestore across devices
- [ ] [P2] Shield-fill animation
- [ ] [P2] Architecture docs — auth + content + stats flow diagrams
- [ ] [P3] Push notifications (permanently deferred)
