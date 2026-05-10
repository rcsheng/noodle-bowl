# Noodle Bowl — PRD alpha-v0.2.0

**Status:** In progress
**Last updated:** 2026-05-10
**What's new:** Live content pipeline — first production content batch, App Store prep

---

## Overview

alpha-v0.2.0 absorbs all open alpha-v0.1.2 work (deep link routing fix, AASA infrastructure — both already on `main`) and is the first release to ship AI-generated content through the content pipeline. It also closes the remaining gaps needed to submit to the App Store (public distribution).

No standalone v0.1.2 build was ever cut, so v0.2.0 is the next build.

Three parallel tracks:

| Track | Goal |
|---|---|
| **v0.1.2 carry-forward** | Deep link routing (`app/c/` + `app/h/`), AASA — code on `main`, never shipped in a build |
| **Content** | Run the pipeline end-to-end; publish first production `ContentVersion` to Firestore |
| **App Store** | Complete the App Store Connect listing, privacy policy, and first public submission |

No new games in this release.

---

## 1. Content Pipeline

### Background

A five-stage CLI pipeline lives in `pipeline/`. It was written and code-reviewed but never run end-to-end. The `publish` step had a bug (it never deactivated previous active docs), which is now fixed.

The pipeline produces a `ContentVersion` document in Firestore, which the app reads via `ContentProvider` (stale-while-revalidate). Once a `ContentVersion` is live, the bundled `constants/data.ts` fallback is never reached in normal operation.

### Stages

| Stage | Command | Input | Output |
|---|---|---|---|
| Ingest | `npm run pipeline:ingest` | TheNewsAPI + Wikipedia | `pipeline/data/candidates/YYYY-MM-DD.json` |
| Select | `npm run pipeline:select` | latest candidates file | `pipeline/data/selected/YYYY-MM-DD.json` |
| Generate | `npm run pipeline:generate` | latest selected file | `pipeline/data/generated/YYYY-MM-DD.json` |
| Review | `npm run pipeline:review` | latest generated file | terminal output (human review) |
| Publish | `npm run pipeline:publish` | latest generated file | `contentVersions/{docId}` in Firestore |

### What changed in this release

- `pipeline/publish.ts` — Before writing the new `ContentVersion`, the pipeline now queries Firestore for any docs where `active: true` and patches them to `active: false`. Previously the operator had to manually deactivate old versions in the Firebase console.
- `pipeline/ingest.ts` — Added `--days=N` flag. When N > 1, loops through N calendar dates and fetches Wikipedia "On This Day" for each unique MM/DD. TheNewsAPI is called once (free tier is current-only). Combined candidates are deduplicated.
- `pipeline/select.ts` — Added `--scale=N` flag. Multiplies all selection targets by N: 30→30N lede, 30→30N spread, 15→15N SoF clusters.
- `pipeline/generate.ts` — Removed the hardcoded `slice(0, 20)` cap on quip/wave source so they scale with lede automatically.

### Bulk vs incremental mode

| Mode | Commands | When to use |
|---|---|---|
| **Bulk** | `pipeline:ingest:bulk` + `pipeline:select:bulk` | First run — pre-fills 60-day bank |
| **Incremental** | `pipeline:ingest` + `pipeline:select` | Daily run — refreshes with today's news |

`pipeline:ingest:bulk` = `--days=60` (fetches 60 dates of Wikipedia)
`pipeline:select:bulk` = `--scale=2` (2× targets: 60 lede, 60 spread, 120 SoF)

SoF needs 2× as many items as other games because each session consumes 2 items (one standard, one weird/wacky). `BASE_SOF_CLUSTERS=60` accounts for this: at scale=1, 60 items → ~30 sessions; at scale=2, 120 items → ~60 sessions.

### Acceptance criteria

- [ ] Pipeline runs end-to-end without errors against the emulator (dry run)
- [ ] Pipeline runs end-to-end against production Firestore
- [ ] After publish, exactly one `contentVersions` doc has `active: true`
- [ ] App reads live content on a fresh install (no bundled fallback triggered)
- [ ] Subsequent publish correctly deactivates the previous version

---

## 2. App Store Preparation

### What needs to be done outside the app

#### 2a. Privacy policy

A public privacy policy URL is required by Apple before App Store Review will approve the app.

Minimum content:
- What data is collected (anonymous auth UID, email if upgraded, gameplay stats in Firestore)
- How data is used (personalized stats, no third-party sale)
- Contact info for privacy requests

Host at a stable public URL (e.g. `https://noodlebowl.app/privacy`).

#### 2b. App Store Connect listing

In App Store Connect → My Apps → Noodle Bowl → App Store tab:

| Field | Notes |
|---|---|
| Name | Noodle Bowl |
| Subtitle | ≤ 30 chars — e.g. "Daily news brain games" |
| Description | ≤ 4000 chars |
| Keywords | ≤ 100 chars total, comma-separated |
| Support URL | `https://noodlebowl.app` |
| Privacy Policy URL | from §2a above |
| Category | Primary: Games → Trivia; Secondary: News |
| Age rating | questionnaire — expected result: 4+ |
| Screenshots | at least iPhone 6.9" (required) + iPad 13" if iPad-eligible |

#### 2c. Screenshots

Required: at least one iPhone 6.9" (iPhone 16 Pro Max) screenshot per supported locale.

Capture on Simulator (iPhone 16 Pro Max) or real device. Suggested screens: home, Lede game, Spread game, result/reveal, profile/stats.

#### 2d. `app.json` version bump

Before submitting to App Store (not TestFlight), bump `version` in `app.json` to `1.0.0` if still at `1.0.0`, and confirm `ios.buildNumber` policy in `eas.json`.

### Acceptance criteria

- [ ] Privacy policy is live at a public URL
- [ ] All required App Store Connect fields are filled in
- [ ] Screenshots uploaded for at least iPhone 6.9"
- [ ] App Store Connect status moves to "Ready for Review" before submission
- [ ] `app.json` version is correct for public release

---

## 3. Cross-cutting

- [ ] **Code review** — all changes since alpha-v0.1.1 (deep link routing + pipeline fix)
- [ ] **Security review** — security-reviewer agent
- [ ] **README update** — add `seed:emulator`, `seed:prod`, `start:dev`, `start:qa` to the quick-start section _(carried from v0.1.2)_
- [ ] `npm test` — all passing
- [ ] `npx tsc --noEmit` — clean

---

## Out of scope (carried forward)

- Garbage-collect orphaned `received_help` interactions
- Animated entry/exit on Help Result Card and Challenge Reply Card
- Persist `homeCardDismissed` to Firestore across devices
- Shield-fill animation
- Architecture docs
- Push notifications (permanently deferred)
