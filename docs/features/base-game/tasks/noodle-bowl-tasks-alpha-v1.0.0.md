# Noodle Bowl — Task List alpha-v1.0.0

**PRD ref:** `noodle-bowl-prd-alpha-v1.0.0.md`
**App Store version:** 1.1.0
**Last updated:** 2026-05-29

---

## 1. Streak & Shield Onboarding ✅

All items shipped in alpha-v0.3.0. Full task history in `docs/archive/features/base-game/tasks/noodle-bowl-tasks-alpha-v0.3.0.md`.

- [x] Data model — `OnboardingFlags`, `MAX_SHIELDS`, `recentPlayedWeeks`, `shieldSaveWeeks`, reducer cases, Firestore write clamping
- [x] ShieldIcon SVG component — filled / outline / gold variants
- [x] Streak ignition modal (§1a)
- [x] Shield primer modal (§1b) — all five game screens
- [x] First shield earned modal (§1c) — all five game screens
- [x] Shield saved modal, first time (§1d)
- [x] Streak at-risk banner (§1e)
- [x] Stats tab — shield slot row + week chain (§1f)
- [x] Friends tab — slot UI + how-it-works (§1g)
- [x] Tappable masthead chip + tooltip (§1h)

---

## 2. Landing Screen Privacy ✅

- [x] `app/games/challenge/[token].tsx` — `They challenged you to answer a question.`
- [x] `app/games/help/[token].tsx` — `They're stuck and need your help.`

---

## 3. Push Notifications ✅

TDD approach: RED tests first → GREEN implementation → security review fixes.

### §3a — Permission request (client) ✅

- [x] `lib/__tests__/pushTokens.test.ts` — 7 tests: permissions granted/denied, token error, empty uid, Expo Go guard, idempotency, cache reset
- [x] `lib/pushTokens.ts` — `registerPushToken` with in-memory cache guard; `clearCachedPushToken`; Expo Go guard inside function body for testability; JSDoc warning for test isolation
- [x] `context/AuthContext.tsx` — registration kept OUT of auth flow ✅
- [x] `app/games/lede.tsx` — `registerPushToken` called contextually before challenge/help creation
- [x] `app/games/spread.tsx` — same
- [x] `app/games/sof.tsx` — same
- [x] `app/games/quip.tsx` — same
- [x] `app/games/wave.tsx` — same

### §3b — Notification handler (client) ✅

- [x] `app/_layout.tsx` — `setNotificationHandler` (foreground display) + `addNotificationResponseReceivedListener` routing taps via `routeNotification`
- [x] `lib/notificationRouter.ts` — `routeNotification` maps `data.screen` → Expo Router href; 6 tests (home, friends, stats, unknown, null data, missing screen)
- [x] `jest.setup.ts` — `setNotificationHandler` and `addNotificationResponseReceivedListener` mocked

> `app/__tests__/_layout.test.tsx` not written — layout requires heavy mocking for limited signal; notification routing covered by `notificationRouter.test.ts`

### §3c — Challenge responded notification (Cloud Function) ✅

- [x] `functions/src/__tests__/challengeRespond.test.ts` — tests: push sent when token present (server-side lookup), skipped when no token, write succeeds on push failure, payload includes token
- [x] `functions/src/challengeRespond.ts` — looks up `pushTokens/{senderId}` via Admin SDK at respond time; try/catch so push failure is non-fatal; title: `"Someone responded to your X challenge"` (no responder name stored)

### §3d — Help received notification (Cloud Function) ✅

- [x] `functions/src/__tests__/helpRespond.test.ts` — same pattern as §3c for `askerId`
- [x] `functions/src/helpRespond.ts` — looks up `pushTokens/{askerId}` server-side; non-fatal push

### §3e — New week notification (scheduled Cloud Function) ✅

- [x] `functions/src/__tests__/sendWeeklyNotification.test.ts` — 5 tests: empty collection, <100 tokens, >100 tokens (multi-batch), correct payload, skips docs with missing token
- [x] `functions/src/sendWeeklyNotification.ts` — `onSchedule` Mon 10 AM ET; fetches `pushTokens` collection, batches ≤100 tokens/request; non-fatal per-batch error
- [x] `functions/src/index.ts` — exports `sendWeeklyNotification`

### §3f — Shared Expo push helper ✅

- [x] `functions/src/utils/push.ts` — `sendExpoPush(token | token[], data, title?, body?)`; throws on non-2xx HTTP response so callers' catch blocks fire

### Security fixes (from review) ✅

- [x] Push token **not** stored in challenge/help documents — removes token exposure to any authenticated link recipient
- [x] `challengeRespond` / `helpRespond` look up `pushTokens/{uid}` via Admin SDK instead of reading from challenge doc
- [x] `senderName` / `askerName` capped at 100 chars server-side in both create handlers
- [x] Push token fields removed from `packages/shared/types.ts` and all game screen call sites

---

## 4. Code quality gates ✅

- [x] `npm test` — 480 tests passing (37 suites)
- [x] `cd functions && npm test` — 74 tests passing (6 suites)
- [x] `npx tsc --noEmit` — no TypeScript errors
- [x] **code-reviewer** agent — reviewed; HIGH items resolved
- [x] **security-reviewer** agent — reviewed; all HIGH items resolved (token exposure, API response check, name length)

---

## 5. Smoke tests (→ PRR §2)

Formal QA blocks (start:qa) skipped for this release — verified directly on the production build.

- [x] Block 0 — Q2 Redesign (home, Lede, Spread, SoF)
- [x] Block 1 — App launch / anonymous auth
- [x] Block 2 — Account creation
- [x] Block 3 — Sign in
- [x] Block 4 — Auth gate on sharing
- [x] Block 5 — Cross-device challenge flow
- [x] Block 6 — Cross-device help flow
- [x] Block 7 — Content & offline resilience
- [x] Block 8 — Sign-out behaviour
- [x] Block 9 — Stats persistence
- [x] Block 10 — Self-challenge guard
- [x] Block 11 — Universal link deep linking
- [x] Block 12 — Live content
- [x] Block 13 — Weekly streak & shields
- [x] Block 14 — Landing screen privacy
- [x] Block 15 — Streak & shield onboarding
- [ ] Production smoke — manual test on production build (see PRR §2)

---

## 6. App Store Connect (→ PRR §3)

Reference: `docs/releases/alpha-v1.0.0/app-store-listing.md`

- [ ] Privacy policy live at `https://noodlebowl.app/privacy`
- [ ] App listing complete (name, subtitle, description, keywords, URLs, category, age rating) 🔄
- [ ] Screenshots uploaded — iPhone 6.9" minimum 🔄 *(in progress — separate thread)*
- [ ] App preview video *(optional — skip if not ready)*
- [ ] Status set to **Ready for Review**

---

## 7. Production environment (→ PRR §4)

- [ ] `contentVersions` has a doc for the active ISO week at release time
- [ ] Firestore security rules deployed and verified
- [ ] Cloud Functions deployed and verified (including `sendWeeklyNotification`)
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] `eas.json` — `appleId`, `ascAppId`, `appleTeamId` verified
- [ ] `eas whoami` — EAS CLI logged in

---

## 8. Build & submit

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard
- [ ] Submission completed — no errors
- [ ] Build appears in App Store Connect → App Store tab
- [ ] Status changes to **Waiting for Review**

---

## 9. Post-release

- [ ] Git tag: `git tag -a alpha-v1.0.0 -m "feat: App Store public release — push notifications"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`
- [ ] PRR sign-off complete (`docs/releases/alpha-v1.0.0/prr-alpha-v1.0.0.md`)

---

## Deferred (not in this release)

- [ ] [P2] Streak at-risk push notification (requires queryable per-user stats in Firestore)
- [ ] [P2] "Friend challenged you" / "Friend asked for help" notifications (requires known recipient UID at link creation)
- [ ] [P2] Notification preferences screen
- [ ] [P2] Friend name in challenge-responded notification (requires storing responder display name on update)
- [ ] [P2] Streak milestones (4 / 12 / 26 / 52 weeks)
- [ ] [P2] Engraved-monogram shield variant
- [ ] [P2] Shield primer re-promptable
- [ ] [P3] Cursor-based pagination for weekly notification scan (scale: 10k+ tokens)
- [ ] [P3] `EXPO_ACCESS_TOKEN` set in Cloud Function environment (higher Expo push rate limits)
- [ ] [P3] Batch error isolation test for `sendWeeklyNotification` (continue remaining batches on one failure)
- [ ] [P3] Cross-device dismissal race (simultaneous open on two devices)
- [ ] [P3] Garbage-collect orphaned `received_help` interactions
- [ ] [P3] Animated entry/exit on Help Result / Challenge Reply cards
- [ ] [P3] Shield-fill animation
- [ ] [P3] Architecture docs
