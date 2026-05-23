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
- `pipeline/select.ts` — Cross-game deduplication: each story is now assigned to exactly one game. Selection order is Lede → Spread → SoF; each game draws from the stories not yet claimed by the previous game. Weird/high-score stories flow to Lede as intended.
- `pipeline/select.ts` — Cross-day deduplication: on each run, story IDs from all previous `selected/*.json` files are collected and excluded from the current pool, preventing the same story from appearing in multiple days' content banks.
- `pipeline/generate.ts` — Removed the hardcoded `slice(0, 20)` cap on quip/wave source so they scale with lede automatically.
- `context/ContentContext.tsx` — `reload()` now sets `isLoading = true` before fetching Firestore. Game screens already gate question selection on `contentLoading`, so tapping PLAY while a home-tab background refresh is in flight will wait for fresh content instead of using a stale cached version.

### Bulk vs incremental mode

| Mode | Commands | When to use |
|---|---|---|
| **Bulk** | `pipeline:ingest:bulk` + `pipeline:select:bulk` | First run — pre-fills 60-day bank |
| **Incremental** | `pipeline:ingest` + `pipeline:select` | Daily run — refreshes with today's news |

`pipeline:ingest:bulk` = `--days=60` (fetches 60 dates of Wikipedia)
`pipeline:select:bulk` = `--scale=2` (2× targets: 60 lede, 60 spread, 120 SoF)

SoF now picks **one question per session** from the full bank (standard and weird/wacky mixed). `BASE_SOF_CLUSTERS=60` targets ~60 sessions at scale=1. The in-game mode toggle has been removed; "Weird & True" questions show a category label instead.

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

## 4. Points Removal & Streak Celebration

### Background

Points are confusing and distract from the two things that make the game sticky: daily streak and streak shields. Removing them simplifies the UI and lets streak take center stage.

A Duolingo-style streak celebration modal fires once per day, on the first game that moves the streak forward (i.e. a genuine day-over-day continuation). It does not fire on streak resets or when a shield is used.

### What changed in this release

**State shape (storage key bumped to `daily_state_v10`):**
- Removed `totalPoints` from `AppState.stats`
- Removed `bestScore` and `lastPoints` from `GameStats`
- Added `showStreakCelebration: boolean` to `AppState.stats` (transient, never persisted)

**Home screen (`app/(tabs)/index.tsx`):**
- Removed stats summary card (Points / Day Streak / Assists)
- Game row trailing indicator simplified: `✓` instead of `✓ +N pts`

**Game screens (all five: lede, spread, sof, wave, quip):**
- Removed points from result/reveal cards
- Added `<StreakCelebrationModal />` — fires at most once per day, only when `dailyStreak` increments

**Stats tab (`app/(tabs)/explore.tsx`):**
- Removed "Lifetime Points" section
- Removed "Best" column from per-game breakdown (now 3-column: Played / Correct / Accuracy)
- Updated AuthGateTab body copy to remove points mention

**Analytics (`lib/analytics.ts`):**
- `gameComplete(gameId, correct)` — removed `points` parameter

**Cloud functions:**
- `functions/src/helpRespond.ts` — writes `helperId: uid` to `helpRequests` doc on respond
- `functions/src/challengeRespond.ts` — writes `recipientId: uid` to `challenges` doc on respond

**New component:**
- `components/StreakCelebrationModal.tsx` — modal with streak number, "days in a row" copy, and dismiss button

### Acceptance criteria

- [ ] No points appear anywhere in the app (home, games, stats)
- [ ] Streak celebration fires after the first game of the day when streak increments
- [ ] Streak celebration does NOT fire on streak reset (gap of >1 day) or shield use
- [ ] Playing a second game after streak fires does NOT show celebration again
- [ ] Stats tab shows Played / Correct / Accuracy (no Best column)
- [ ] `helpRequests` docs include `helperId` after helper responds
- [ ] `challenges` docs include `recipientId` after recipient responds
- [ ] `npm test` all passing, `npx tsc --noEmit` clean

---

## 5. Bank Safety & Question Exhaustion

### Background

Two related crashes exist in the current content system:

**Empty-bank crash:** When the pipeline publishes a `ContentVersion` whose bank for a game is an empty array (e.g. `quip: []`, `wave: []`), the app receives that empty array from Firestore. `pickFromBank([],…)` returns `{ item: undefined }`, and game screens crash when they try to access properties on `undefined`. The bundled-constants fallback in `ContentContext` is never reached in this case because Firestore *did* return an active version — the per-version fallback only triggers when Firestore returns *nothing*.

**Play-again wraparound crash / bad UX:** `pickFromBank` currently resets the seen list when all items have been shown (`seen.length >= bank.length ? [] : seen`), causing the same questions to repeat silently. When the bank is very small this can also produce an undefined item.

### What changed in this release

#### Per-bank fallback (`lib/contentRepo.ts` + `context/ContentContext.tsx`)

A new `mergeWithFallback(version)` function fills any empty game bank in the active Firestore `ContentVersion` with the corresponding bundled-constants bank before the version is committed to state. This means:

- A version published with `quip: []` will serve `QUIP_PROMPTS` from `constants/data.ts` instead of crashing.
- The fallback is applied per-bank, so a version with a populated `lede` bank still uses live lede content.
- Applied on every Firestore fetch (initial load and `reload()`), never on the bundled fallback itself.

#### Question exhaustion UX (`constants/utils.ts`, all five game screens, `components/BankExhaustedModal.tsx`)

`pickFromBank` and `pickFromSof` now return a discriminated union:

```
{ exhausted: false; idx; item; newSeen }   — normal pick
{ exhausted: true }                        — all questions seen
```

The seen-list reset is removed; once all questions in a bank have been shown, the function returns `{ exhausted: true }` rather than cycling.

`pickFromSof` is extracted from `app/games/sof.tsx` into `constants/utils.ts` so it can be unit-tested alongside `pickFromBank`.

A new `BankExhaustedModal` component (matching the `StreakCelebrationModal` visual style) is shown when either path returns `{ exhausted: true }`. Copy: **"All done today"** / "You've played every [Game] question available. New questions arrive tomorrow." / **"Back to Home"** button → `router.replace('/')`. The modal fires on initial-open exhaustion (user tapped Play but already seen everything) and on Play Again exhaustion alike.

The component reserves a commented placeholder slot for a future upsell CTA ("Unlock the full question bank") — not built in this release.

### Acceptance criteria

- [ ] App does not crash when active Firestore `ContentVersion` has `quip: []` or `wave: []`
- [ ] After exhausting all questions in any game, tapping Play Again shows the exhausted modal (not a repeated question)
- [ ] Tapping "Back to Home" in the exhausted modal navigates to the home tab
- [ ] Tapping the overlay also dismisses to home
- [ ] Exhaustion is detected on initial game-screen open if all questions already seen
- [ ] `pickFromBank` and `pickFromSof` unit tests cover the exhausted path
- [ ] `mergeWithFallback` unit tests cover all-empty, partial-empty, and fully-populated versions

---

## 6. Weekly Content Windows

### Background

News content is sporadic — there is no guarantee the pipeline will produce content every single day. Publishing a new `ContentVersion` daily and immediately deactivating the previous one means a missed pipeline run leaves the app with stale or empty content. Users also see questions reset to zero each day, even though they may not have exhausted the full day's bank.

The weekly model accumulates daily pipeline output into a rolling seven-day window and releases it one complete week at a time, giving the pipeline seven days of buffer while giving users a stable, deep question bank for the whole week.

### Model

- **Calendar week:** ISO 8601, Monday–Sunday, UTC.
- **Active content:** always the **previous** complete ISO week (`currentWeek − 1`).
  - Sat 2026-05-23 (week 21) → users see week 20 content (May 11–17). ✓
  - Mon 2026-05-25 (week 22 starts) → users see week 21 content (May 18–24). ✓
- **Firestore document:** one doc per week, named `contentVersions/YYYY-Www` (e.g. `contentVersions/2026-W20`). No more `active: boolean` field — the doc ID is the lookup key.
- **Pipeline publish:** each daily run reads `contentVersions/YYYY-Www`, appends today's generated banks, and writes back. A `publishedDates: string[]` field tracks which YYYY-MM-DD runs are already included (idempotent re-runs skip duplicates).
- **Historical packs (future):** each week doc is one purchasable unit.

### Content week utilities (`lib/contentWeek.ts`)

| Function | Returns |
|---|---|
| `getISOWeekYear(date)` | `{ year, week }` — ISO week number (Mon=start, Thu=pivot) |
| `formatWeekId(year, week)` | `"2026-W20"` — zero-padded |
| `computeCurrentWeek(date?)` | ISO week string for the given date |
| `computeActiveWeek(date?)` | Previous ISO week — the week served to users |

### Data model changes

**`ContentVersion`** (shared type):
- `active: boolean` → **removed**
- `contentWeek: string` → **added** (ISO week ID, e.g. `"2026-W20"`)

**`HelpCreateInput` / `HelpGetResponse`** (shared types):
- `contentWeek: string` → **added** to both; stored in `helpRequests` doc when asker creates the request

**`FriendInteraction`** (client state):
- `contentWeek?: string` → **added** (propagated from `helpRequests` doc via Firestore snapshot)

### Seen-state reset

`AppState` gains a `seenWeek: string` field. When the app loads from AsyncStorage and `seenWeek !== computeActiveWeek()`, all `seen` arrays are reset to `[]` and `seenWeek` is updated to the current active week. Storage key bumped to `daily_state_v11`.

### Help request staleness ("Try this question" fix)

**Root cause:** `questionIndex` stored in Firestore is an index into the `ContentVersion` bank at the time of creation. If the content changes (new week), the index may point to a different question or nothing.

**Fix:**
- `helpCreate` stores `contentWeek` in the help request doc.
- Helper landing screen (`app/games/help/[token].tsx`) checks `contentWeek` from `helpGet` response — if non-empty and doesn't match `computeActiveWeek()`, shows "This question is from a previous week and is no longer available."
- Hint mode in `lede.tsx` and `sof.tsx`: if `hintContentWeek !== contentWeek` (from `useContent`), sets `hintUnavailable = true` and renders an inline "no longer available" state instead of silently redirecting.

### `BankExhaustedModal` copy update

Body: "You've played every {Game} question available. New questions arrive **next Monday**."

### Acceptance criteria

- [ ] `computeActiveWeek` returns the correct ISO week for all edge cases (Mon boundary, year boundary)
- [ ] `contentVersions/2026-W20` is the doc fetched when active week is week 20
- [ ] Pipeline publish accumulates into the week doc; running twice for the same date is idempotent
- [ ] Client reads week doc by ID (no `active` query); stale cache triggers re-fetch correctly
- [ ] `seen` arrays reset when opening the app at the start of a new week
- [ ] Stale help request shows "no longer available" in helper landing screen (non-empty `contentWeek`, mismatch)
- [ ] Stale hint mode shows "no longer available" inline state in lede/sof game screens
- [ ] Missing `contentWeek` (old requests, backward compat) does not block helper flow
- [ ] `npm test` all passing; `npx tsc --noEmit` clean

---

## Out of scope (carried forward)

- Garbage-collect orphaned `received_help` interactions
- Animated entry/exit on Help Result Card and Challenge Reply Card
- Persist `homeCardDismissed` to Firestore across devices
- Shield-fill animation
- Architecture docs
- Push notifications (permanently deferred)
- Upsell CTA in `BankExhaustedModal` ("Unlock the full question bank")
