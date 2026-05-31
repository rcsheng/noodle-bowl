# Production Release Readiness — Alpha v1.2.0

Historical content packs + pipeline historical ingest.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v1.2.0` |
| App Store version | `1.2.0` |
| Target platform | iOS |
| Distribution channel | App Store public release |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Historical weekly content packs (browse + play past weeks); pipeline quarterly ingests (2025-Q1 → 2026-Q2); SoF volume boost for historical weeks |

---

## Feature flags

| Flag | Production build value | Notes |
|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | Not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | unset | Production collections |

---

## 1. Analytics gates review

Before submitting for review, confirm the following PostHog signals have been live for ≥ 2 weeks post-v1.1.0 launch (or explicitly waive with written note):

| Metric | Target | Actual | Pass? |
|---|---|---|---|
| Week-1 retention | ≥ 40% | | |
| Week-4 streak rate | ≥ 20% | | |
| Challenge/help sent per MAU | ≥ 15% | | |
| Push opt-in rate | ≥ 50% | | |
| Game completion rate | ≥ 80% | | |
| SoF correct answer rate | 40–65% | | |

> If targets are not met: document the gap and decide whether to fix the underlying issue or waive and ship anyway. Do not skip this review.

---

## 2. Code quality

- [ ] All tests passing — `npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent) — new Firestore reads (`contentPacks`, `packCatalog`)

---

## 3. Pipeline — historical content

- [ ] All quarterly ingests complete (2025-Q1 → 2026-Q2 partial)
- [ ] `npm run pipeline:status` — no gap weeks; each pack ≥ 5 items per game, ≥ 8 SoF
- [ ] Backlog quality spot-check complete (§2c of task list)
- [ ] `contentPacks` collection visible in Firebase console with docs spanning 2025-Q1 to present

---

## 4. Smoke test

### Block A — Current week (regression)

- [ ] Home tab loads this week's content correctly
- [ ] All 3 visible games play end-to-end (Lede, Spread, SoF)
- [ ] Streak and stats update after game completion
- [ ] Challenge and help flows work (share link, cross-device respond, push notification received)

### Block B — Historical packs

- [ ] Explore tab shows archive section with reverse-chronological pack list
- [ ] Gap weeks show greyed "No content this week" (no crash)
- [ ] Tap a past pack → pack detail → play Lede from archive → confirm streak unchanged after
- [ ] `Archive — Week of X` banner visible during archive play
- [ ] Back navigation returns to pack list, not Home

### Block C — Analytics events (verify in PostHog)

- [ ] `game_complete` fires for Lede, Spread, SoF
- [ ] `archive_pack_opened` fires when opening a historical pack
- [ ] `push_opt_in` / `push_opt_out` fire correctly

---

## 5. App Store Connect

- [ ] Version set to `1.2.0` in App Store Connect
- [ ] What's New copy written (archive feature highlight)
- [ ] Screenshots updated if archive UI is visible on home/explore

---

## 6. Build & submit

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

- [ ] Build completed without errors
- [ ] Installed via TestFlight; smoke test blocks A–C pass
- [ ] Submitted to App Store Review

---

## 7. Post-release

- [ ] Git tag: `git tag -a alpha-v1.2.0 -m "feat: historical content packs + pipeline historical ingest"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row updated in `docs/RELEASES.md`
- [ ] PRR sign-off

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Analytics gates reviewed | | |
| Code quality | | |
| Pipeline ingests complete | | |
| Build (EAS production) | | |
| Smoke test (TestFlight) | | |
| App Store submit | | |
