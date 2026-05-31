# Noodle Bowl — Task List alpha-v1.2.0

**PRD ref:** `noodle-bowl-prd-alpha-v1.2.0.md`
**App Store version:** 1.2.0
**Last updated:** 2026-05-30

---

## 0. v1.1.0 post-release ✅

- [x] Git tag: `alpha-v1.1.0`
- [x] Push tag to remote
- [x] Row added to `docs/RELEASES.md`
- [x] v1.1.0 docs archived (`prd`, `tasks`, `prr`, `app-store-listing`)
- [x] `app.json` version bumped: `1.1.0` → `1.2.0`
- [ ] PRR sign-off complete (`docs/archive/releases/alpha-v1.1.0/prr-alpha-v1.1.0.md`)
- [ ] Block 16 push notification smoke test (TestFlight build — if not done before submission)

---

## 1. Analytics instrumentation

Before the analytics gates (PRD §1) can be evaluated, confirm PostHog is capturing the right events.

- [ ] Verify `game_complete` fires for all 3 visible games (Lede, Spread, SoF) in production
- [ ] Verify `sign_up` and `login` fire on the welcome screen and sign-in screen respectively
- [ ] Verify `challenge_sent` and `help_sent` fire on social share actions
- [ ] Add `push_opt_in` event — fired when user grants push permission
- [ ] Add `push_opt_out` event — fired when user denies push permission
- [ ] Add `archive_pack_opened` event — fired when a user opens a historical pack (§2)
- [ ] Confirm PostHog dashboard has retention cohort and event funnel views set up
- [ ] Document analytics gate targets in PostHog dashboard (mirror PRD §1 table)

---

## 2. Historical content packs — pipeline

### §2a — Quarterly ingests

Run in order. Each step: ingest → generate → review → publish.

- [ ] `npm run pipeline:historical:2025-q1` — ingest + publish all ISO weeks
- [ ] `npm run pipeline:historical:2025-q2`
- [ ] `npm run pipeline:historical:2025-q3`
- [ ] `npm run pipeline:historical:2025-q4`
- [ ] `npm run pipeline:historical:2026-q1`
- [ ] `npm run pipeline:historical:2026-q2` (partial — up to current week)
- [ ] `npm run pipeline:status` — confirm no gap weeks; all packs have ≥ 5 items per game

### §2b — SoF volume boost

- [ ] Update historical ingest domain filter: add `technology`, `environment` to SoF-eligible domains
- [ ] Add Wikipedia "On This Day" as supplemental SoF source in `pipeline/historical.ts`
- [ ] Enforce minimum 8 SoF items per week — log warning and pause if below threshold
- [ ] Re-run any quarters that were below 8 SoF items after the filter update
- [ ] `npm test` — all passing after pipeline changes

### §2c — Backlog quality review

- [ ] `npm run pipeline:ui` — spot-check 5 items per game per quarter
- [ ] SoF real claim source URLs are reachable
- [ ] Spread answers are verifiable numbers (not hallucinated)
- [ ] No cross-quarter duplicate headlines
- [ ] Lede wrong completions are non-numerical and plausible

---

## 3. Historical content packs — app

### §3a — Shared types

- [ ] Add `PackCatalogEntry` to `packages/shared/types.ts`
- [ ] Add `UnlockStatus = 'free' | 'unlocked' | 'locked'` type (for future monetisation compatibility)
- [ ] `npx tsc --noEmit` — clean

### §3b — ContentContext

- [ ] Add `getPackContent(date: string): Promise<ContentBanks>` to `ContentContext`
  - Fetches `contentPacks/{date}` from Firestore
  - Caches in AsyncStorage under `pack:{date}` (stale-while-revalidate)
  - Returns `null` if document does not exist (gap week)
- [ ] Add `packCatalog: PackCatalogEntry[]` to context — fetched on Explore tab focus
- [ ] Unit tests: `getPackContent` returns cached value on second call; handles missing doc gracefully
- [ ] `npm test` — all passing

### §3c — Pack catalogue UI (Explore tab)

- [ ] Archive section on Explore tab: reverse-chronological list of `PackCatalogEntry` rows
- [ ] Each row: week label, game count badges, `FREE` chip
- [ ] Gap weeks shown as greyed-out "No content this week" rows (no crash)
- [ ] Tapping a row navigates to pack detail screen

### §3d — Pack play flow

- [ ] Add optional `packDate` param to Lede, Spread, and SoF game screens
- [ ] When `packDate` is set:
  - Load content from `getPackContent(packDate)` instead of current-week banks
  - Skip streak and stats updates
  - Show `Archive — Week of [label]` banner in place of week display
  - CompactMasthead still renders; streak chip still shows (read-only)
- [ ] Back navigation from archive game returns to pack detail / catalogue, not Home
- [ ] Unit tests: stats are not updated when `packDate` is set

### §3e — Code quality

- [ ] `npm test` — all passing (≥ 502 tests + new coverage)
- [ ] `npx tsc --noEmit` — clean
- [ ] **code-reviewer** agent — review diff
- [ ] **security-reviewer** agent — review new Firestore reads (contentPacks, packCatalog)

---

## 4. Build & release

- [ ] `eas build --platform ios --profile production`
- [ ] Build completed without errors
- [ ] Installed via TestFlight
- [ ] Smoke test: open Explore tab → browse archive → play a historical pack → verify streak unchanged
- [ ] `eas submit --platform ios --profile production --latest`
- [ ] App Store Connect → Ready for Review

---

## 5. Post-release

- [ ] Git tag: `git tag -a alpha-v1.2.0 -m "feat: historical content packs + pipeline historical ingest"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row updated in `docs/RELEASES.md`
- [ ] PRR sign-off complete

---

## Deferred (not in this release)

- [ ] [P2] In-app purchase unlock for historical packs (wait for MAU gate)
- [ ] [P2] Streak at-risk push notification
- [ ] [P2] Friend challenged/helped you notification
- [ ] [P2] New games (The Year, Real or Onion?, Where in the World?)
- [ ] [P3] Pack completion tracking (seen-per-pack progress)
- [ ] [P3] Schema cleanup (`LedePanelist` vestigial fields, `SpreadItem.others`)
- [ ] [P3] Notification preferences screen
- [ ] [P3] Architecture docs
