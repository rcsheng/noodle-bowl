# Noodle Bowl — Task List alpha-v0.2.0

**PRD ref:** `noodle-bowl-prd-alpha-v0.2.0.md`
**Last updated:** 2026-05-24
**Note:** Absorbs all open alpha-v0.1.2 items — no standalone v0.1.2 build was ever cut.

---

## Content pipeline (PRD §1)

- [x] Fix `pipeline/publish.ts` — auto-deactivate active docs before publishing new version
- [x] Add `--days=N` to `ingest.ts` for bulk historical Wikipedia ingestion
- [x] Add `--scale=N` to `select.ts` to scale selection targets
- [x] Remove hardcoded `slice(0, 20)` cap in `generate.ts` so quip/wave scale with lede
- [x] Cross-game dedup in `select.ts` — each story assigned to exactly one game (Lede → Spread → SoF priority)
- [x] Cross-day dedup in `select.ts` — exclude story IDs already used in previous `selected/*.json` runs
- [x] `context/ContentContext.tsx` — `reload()` sets `isLoading=true` so game screens wait for fresh content when tapped during a background refresh
- [ ] Bulk pipeline run — emulator dry run (see runbook below)
- [ ] Bulk pipeline run — production publish (8-week bank, one `pipeline:publish` per date)
- [ ] Verify app reads live content (no bundled fallback triggered)
- [ ] Verify subsequent daily run accumulates into the week doc (does not replace)

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

# 2. Bulk ingest — fetches news + Wikipedia "On This Day" for 60 dates, then scrapes oddities
npm run pipeline:ingest:bulk
# Uses ~75 of your 100 daily TheNewsAPI requests (60 news + up to 15 oddities).
# → pipeline/data/candidates/YYYY-MM-DD.json + YYYY-MM-DD-weird.json

# 3. Bulk select — 2× targets: 60 lede, 60 spread, 120 SoF clusters
npm run pipeline:select -- --scale=2
# → pipeline/data/selected/YYYY-MM-DD.json

# 4. Generate — calls Claude API for each selected item
npm run pipeline:generate
# Takes ~15–20 minutes. Calls Sonnet (lede, spread, sof). Quip and wave are not yet generated.
# → pipeline/data/generated/YYYY-MM-DD.json

# 5. Review output in terminal (human gate)
npm run pipeline:review
# Shows 5 random samples of each game type. Re-run step 4 if quality looks off.

# 6. Dry run — publish to emulator first
npm run pipeline:publish:emulator
# Confirm 'y'. Check http://localhost:4000 for contentVersions — doc ID = ISO week (e.g. "2026-W21").

# 7. Production publish
npm run pipeline:publish
# Target: PRODUCTION (project: noodle-bowl). Confirm 'y'.
```

**Expected output counts after bulk generate (`--scale=2`):**
- lede: ~35–50 items → ~40–50 sessions (quality gate skips dry headlines)
- spread: ~50–60 items → ~60 sessions (fewer if low-number candidates)
- sof: ~60 items → ~60 sessions (1 item per session; standard and weird mixed in the same bank)
- quip: not yet generated (empty — app falls back to bundled content)
- wave: not yet generated (empty — app falls back to bundled content)

---

### Daily incremental run (ongoing)

Run this daily (or as needed) to keep content fresh. Use the standard scripts — no bulk flags.

```bash
npm run pipeline:ingest        # today's news + Wikipedia "On This Day" + oddities scrape
npm run pipeline:select        # 30 lede, 30 spread, 60 SoF (daily targets)
                               # automatically merges weird candidates; they sort first for Lede
npm run pipeline:generate      # ~2–3 minutes
npm run pipeline:review        # spot-check output
npm run pipeline:publish       # accumulates today's items into the current week doc (idempotent)
```

---

### Verifying the app reads live content

After any production publish:

1. Run `npm run start:qa` (prod Firebase, QA collections)
2. Open the Firestore console — confirm `contentVersions` has a doc for the previous ISO week (e.g. `2026-W20`)
3. Launch app, play a game — content should reflect what was published (spot-check a headline)
4. Force-quit and relaunch — content loads instantly from AsyncStorage cache

---

## Points removal & streak celebration (2026-05-14)

### Cloud functions (data gap fix)

- [x] `functions/src/helpRespond.ts` — write `helperId: uid` to `helpRequests` doc on respond
- [x] `functions/src/challengeRespond.ts` — write `recipientId: uid` to `challenges` doc on respond
- [x] Functions tests updated and passing

### State & context

- [x] `context/gameReducer.ts` — remove `totalPoints`, `bestScore`, `lastPoints` from state; add `showStreakCelebration`; bump storage key to `daily_state_v10`
- [x] `context/GameContext.tsx` — remove `points` from `updateGameStats`; add `dismissStreakCelebration`
- [x] `lib/analytics.ts` — remove `points` from `gameComplete`

### UI

- [x] `components/StreakCelebrationModal.tsx` — new modal: fires once per day when streak increments
- [x] `app/(tabs)/index.tsx` — remove stats summary card; simplify game row to show `✓` (no pts)
- [x] `app/(tabs)/explore.tsx` — remove Lifetime Points section; remove Best column from per-game grid; update AuthGateTab copy
- [x] `app/games/lede.tsx` — remove points from result card; add `<StreakCelebrationModal />`
- [x] `app/games/sof.tsx` — remove points from result card; add `<StreakCelebrationModal />`
- [x] `app/games/spread.tsx` — remove points from result card; add `<StreakCelebrationModal />`
- [x] `app/games/wave.tsx` — remove points from result card; add `<StreakCelebrationModal />`
- [x] `app/games/quip.tsx` — remove points from result card; add `<StreakCelebrationModal />`

### Tests

- [x] `context/__tests__/GameContext.reducer.test.ts` — new tests for `showStreakCelebration` + `DISMISS_STREAK_CELEBRATION`; remove all `points` references
- [x] `context/__tests__/GameContext.merge.test.tsx` — replace `totalPoints` discriminator with `dailyStreak`
- [x] `context/__tests__/GameContext.test.tsx` — bump storage key to v10; remove `totalPoints` assertions
- [x] `lib/__tests__/analytics.test.ts` — update `gameComplete` tests to new signature
- [x] All 388 tests passing, `npx tsc --noEmit` clean

### To test on device (`npm run start:dev`)

- [ ] Play a game for the first time today — streak celebration modal appears when streak increments
- [ ] Tap "Keep it up!" or outside the card — modal dismisses
- [ ] Play a second game the same day — streak celebration does NOT reappear
- [ ] Check home screen — no summary stats card
- [ ] Check game result cards — no points shown (just Correct / Wrong verdict)
- [ ] Check Stats tab — no Lifetime Points section; per-game grid has 3 columns (Played / Correct / Accuracy)

---

## Help card — play with friend's hint (2026-05-11)

Feature: when a friend answers a help request and the asker hasn't played that game yet,
the home card shows a "Try this question →" button. Tapping launches the game pre-loaded to
that specific question with the friend's answer subtly highlighted on the matching option.
Already-played state shows the card as informational only (no button).

- [x] `lib/friendHint.ts` — `isFriendHintMatch(gameId, optionIndex, friendHint)` utility
- [x] `HelpResultCard` — `isGameCompleted` + `onPlay` props; "Try this question →" button
- [x] `app/(tabs)/index.tsx` — compute `isGameCompleted`, pass `onPlay` with `hintQuestionIndex` + `friendHint` params
- [x] `app/games/lede.tsx` — read `hintQuestionIndex`/`friendHint`; highlight hinted panelist option
- [x] `app/games/sof.tsx` — read `hintQuestionIndex`/`friendHint`; highlight hinted claim; hide mode toggle
- [x] Tests — 15 new tests across `friendHint`, `HelpResultCard`, `lede`, `sof` (all passing)
- [ ] Smoke test on device — tap Play from home card, confirm hint visible on correct option

---

## Bank safety & question exhaustion (PRD §5)

### Per-bank fallback

- [x] `lib/__tests__/contentRepo.test.ts` — RED: tests for `mergeWithFallback` (all-empty, partial-empty, fully-populated, does not mutate original)
- [x] `lib/contentRepo.ts` — add `mergeWithFallback(version: ContentVersion): ContentVersion`
- [x] `context/ContentContext.tsx` — apply `mergeWithFallback` when setting version from Firestore (initial load + `reload()`)
- [x] Run tests → GREEN

### Question exhaustion

- [x] `constants/__tests__/utils.test.ts` — RED: `pickFromBank` exhaustion tests (empty bank → exhausted, all-seen → exhausted, partial-seen → normal pick, no wraparound)
- ~~[x] `constants/__tests__/utils.test.ts` — RED: `pickFromSof` exhaustion tests~~ _(superseded by SoF toggle removal)_
- [x] `constants/utils.ts` — update `pickFromBank` to return `BankPickResult<T>` discriminated union; remove seen-list reset; export `BankPickResult`
- ~~[x] `constants/utils.ts` — add `pickFromSof`~~ _(removed — SoF now uses `pickFromBank` directly)_
- [x] Run tests → GREEN
- [x] `components/BankExhaustedModal.tsx` — new component: `visible`, `gameName`, `onDismiss` props; matches `StreakCelebrationModal` style; overlay tap also dismisses; upsell CTA slot is a commented `TODO`
- [x] `app/games/lede.tsx` — add `exhausted` state; handle `BankPickResult.exhausted` in `useEffect` + `handlePlayAgain`; render `<BankExhaustedModal>`
- [x] `app/games/spread.tsx` — same pattern
- [x] `app/games/sof.tsx` — rewritten: single slot from `pickFromBank`; removed mode toggle + `pickFromSof`; Weird & True shown as category label; `<BankExhaustedModal>` on exhaustion
- [x] `app/games/wave.tsx` — same pattern as lede/spread
- [x] `app/games/quip.tsx` — same pattern as lede/spread

### Device smoke test

- [ ] Play all questions in a small bank (or clear all but one from seen state) → last question plays normally
- [ ] Tap "Play Again" after last question → exhausted modal appears with correct game name
- [ ] Tap "Back to Home" → navigates to home tab
- [ ] Tap the overlay → same navigation
- [ ] Cold-open a game screen after all questions seen → exhausted modal appears immediately

---

---

## Weekly content windows (PRD §6)

### Utilities & shared types

- [x] `lib/__tests__/contentWeek.test.ts` — RED: `getISOWeekYear`, `formatWeekId`, `computeCurrentWeek`, `computeActiveWeek` (edge cases: Mon boundary, year rollover)
- [x] `lib/contentWeek.ts` — implement; tests GREEN
- [x] `packages/shared/contentTypes.ts` — remove `active: boolean`; add `contentWeek: string`
- [x] `packages/shared/types.ts` — add `contentWeek: string` to `HelpCreateInput` and `HelpGetResponse`

### Content repo & context

- [x] `lib/__tests__/contentRepo.test.ts` — update RED: `findForWeek` replaces `findActive`; `getFallback` has no `active` field
- [x] `lib/contentRepo.ts` — implement `findForWeek(weekId)`; update `getFallback()`
- [x] `context/ContentContext.tsx` — use `computeActiveWeek()` + `findForWeek`; replace `isCachedToday` with `isCachedForActiveWeek`; expose `contentWeek` in context value

### Game state

- [x] `context/__tests__/GameContext.reducer.test.ts` — RED: LOAD with stale `seenWeek` resets `seen` arrays; LOAD with current `seenWeek` preserves them
- [x] `context/gameReducer.ts` — add `seenWeek: string` to `AppState` + `initialState`; add `seenWeek?: string` to LOAD payload; add `activeWeek?: string` to LOAD action; reset `seen` when week changed; add `contentWeek?: string` to `FriendInteraction`
- [x] `context/GameContext.tsx` — bump storage key to `daily_state_v11`; persist `seenWeek`; pass `activeWeek: computeActiveWeek()` to LOAD dispatch; propagate `contentWeek` from Firestore snapshot to `received_help` interaction

### Help request staleness fix

- [x] `functions/src/__tests__/helpCreate.test.ts` — RED: `contentWeek` stored in Firestore; invalid format rejected
- [x] `functions/src/helpCreate.ts` — store `contentWeek` in help request doc; validate ISO week format
- [x] `functions/src/helpGet.ts` — return `contentWeek` in response (default `''` for missing)
- [x] `lib/helpApi.ts` — pass `contentWeek: contentWeek` (from `useContent`) in `createHelp` call
- [x] `app/games/help/[token].tsx` — check `contentWeek` after `fetchHelp`; show "no longer available" error if non-empty and stale

### Hint mode fix (lede + sof)

- [x] `app/(tabs)/index.tsx` — pass `hintContentWeek: interaction.contentWeek ?? ''` as navigation param
- [x] `app/games/lede.tsx` — read `hintContentWeek` param; set `hintUnavailable = true` when `!item` or week mismatch; render unavailable inline state; pass `contentWeek` to `createHelp`
- [x] `app/games/sof.tsx` — same pattern as lede
- [x] `app/games/spread.tsx`, `wave.tsx`, `quip.tsx` — pass `contentWeek` to `createHelp` calls

### Pipeline

- [x] `pipeline/publish.ts` — remove `active` flag and deactivation logic; add `getISOWeekId(dateStr)`; add `firestoreGet`/`fromFirestoreValue` helpers; accumulate into `contentVersions/YYYY-Www`; idempotent by `publishedDates`
- [x] `pipeline/db.ts` — rename `versionId` → `weekId` in `ContentPackRow`; update SQL aliases

### Polish & copy

- [x] `components/BankExhaustedModal.tsx` — update body copy: "New questions arrive next Monday."

### Verification

- [x] `npm test` — 422 tests passing
- [x] `npx tsc --noEmit` — clean

### Device smoke tests (weekly model)

- [ ] Active content is from the previous ISO week (check Firestore doc ID loaded)
- [ ] On simulated Monday: seen arrays reset; new week's content appears
- [ ] Stale help link shows "no longer available" in helper landing screen
- [ ] Stale hint tapping "Try this question" shows unavailable state (not blank redirect)
- [ ] Pipeline publish for same date twice is idempotent (no duplicate questions)

---

## SoF mode toggle removal

**Goal:** Simplify SoF to one question per session from the full bank (standard + weird mixed). Replace the in-game mode toggle with a "Weird & True" category label on weird questions.

### Implementation (done)

- [x] pp/games/__tests__/sof.test.tsx — RED tests: no toggle buttons, category label for weird, single setSeen call, challenge/hint/reveal flow
- [x] pp/games/sof.tsx — rewritten: single `slot` state; `pickFromBank(banks.sof, ...)` on mount; Weird & True label; mode toggle UI removed
- [x] constants/utils.ts — removed `pickFromSof` and `SofPickResult` (no longer used)
- [x] constants/__tests__/utils.test.ts — removed `pickFromSof` describe block
- [x] Deleted `app/games/__tests__/sof.toggle.test.tsx` (superseded)
- [x] `npm test` — 423 tests passing (36 suites)

### Notes

- `SofItem.weirdAndTrue` field is preserved in the data schema; it drives the category label only.
- No database schema change needed — existing `weirdAndTrue: boolean` on each SofItem is unchanged.
- `pipeline/select.ts` `BASE_SOF_CLUSTERS=60` now targets ~60 sessions (was 60 → ~30 sessions with 2 slots). PRD §1 updated.

---
## Deferred (not in this release)

- [ ] [P2] Garbage-collect orphaned `received_help` interactions after N days
- [ ] [P2] Animated entry/exit on Help Result Card and Challenge Reply Card
- [ ] [P2] Persist `homeCardDismissed` to Firestore across devices
- [ ] [P2] Shield-fill animation
- [ ] [P2] Architecture docs — auth + content + stats flow diagrams
- [ ] [P3] Push notifications (permanently deferred)
