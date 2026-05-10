# Production Release Readiness — Alpha v0.2.0

Content pipeline + attribution consistency.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.2.0` |
| Target platform | iOS (TestFlight / internal) |
| Distribution channel | Internal — not App Store |
| Release date | 2026-05-10 |
| Release owner | rcsheng |
| What's new | Content pipeline (ingest → select → generate → publish), local SQLite history, contentPacks Firestore collection, recover tool, source+date attribution across all three games, Windows Task Scheduler daily automation |

---

## Feature flags

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | unset | Slurp not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | `qa_` during smoke only |

---

## 1. Content pipeline

- [x] Emulator dry run complete (all 5 stages pass)
- [x] Production publish complete — one `contentVersions` doc with `active: true`
- [x] `contentPacks/{date}` written alongside `contentVersions` on publish
- [x] Local `pipeline/data/history.db` has a row for the published date
- [x] App reads live content on fresh install (no fallback triggered)

---

## 2. Code quality

- [x] All tests passing — `npm test` (357 tests, 34 suites)
- [x] No TypeScript errors — `npx tsc --noEmit`
- [ ] Functions tests passing — `cd functions && npm test`

---

## 3. Smoke test

Run against **production Firebase with QA collections** using `npm run start:qa`.

### Block 12 — Live content

| # | Step | Expected |
|---|---|---|
| 12.1 | Launch app fresh (no cache) | Home screen loads with today's content — no "content unavailable" error |
| 12.2 | Play Lede game to result screen | Reveal shows "Source, Month Year" attribution on one line |
| 12.3 | Play Spread game to result screen | Reveal shows "Source, Month Year" attribution on one line |
| 12.4 | Play SoF game to result screen | Science claim shows "Source, Month Year" plain text (no link) |
| 12.5 | Force-quit and relaunch | Content loads instantly from AsyncStorage cache |

### Regression

- [ ] Block 0 — Q2 Redesign (home, Lede, Spread, SoF)
- [ ] Block 1 — App launch / anonymous auth
- [ ] Block 2 — Account creation
- [ ] Block 3 — Sign in
- [ ] Block 4 — Auth gate on sharing
- [ ] Block 5 — Cross-device challenge flow
- [ ] Block 6 — Cross-device help flow
- [ ] Block 7 — Content & offline resilience
- [ ] Block 8 — Sign-out behaviour
- [ ] Block 9 — Stats persistence
- [ ] Block 10 — Self-challenge guard
- [ ] Block 11 — Universal link deep linking

Step details for Blocks 0–11: `docs/releases/archive/alpha-v0.1.1/prr-alpha-v0.1.1.md` §2.

---

## 4. Production environment

- [x] Production Firebase project is the target (not emulator)
- [x] Production `contentVersions` has exactly one doc with `active: true`
- [x] `contentPacks` collection has a doc for the published date
- [ ] Firestore security rules deployed (`contentPacks` read rule added for authenticated users)
- [x] Local `pipeline/data/history.db` confirmed written
- [x] Cloud Functions unchanged — no redeploy needed

---

## 5. Post-release

- [ ] Git tag: `git tag -a alpha-v0.2.0 -m "feat: content pipeline, attribution fixes"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Content pipeline | rcsheng | 2026-05-10 |
| Attribution fixes | rcsheng | 2026-05-10 |
| Smoke tests | | |
| Tag + RELEASES.md | | |
