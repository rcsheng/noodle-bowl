# Noodle Bowl — Task List alpha-v1.1.0

**PRD ref:** `noodle-bowl-prd-alpha-v1.1.0.md`
**App Store version:** 1.1.0
**Last updated:** 2026-05-30

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

- [x] `npm test` — 492 tests passing (37 suites)
- [x] `cd functions && npm test` — 74 tests passing (6 suites)
- [x] `npx tsc --noEmit` — no TypeScript errors
- [x] **code-reviewer** agent — reviewed; HIGH items resolved
- [x] **security-reviewer** agent — reviewed; all HIGH items resolved (token exposure, API response check, name length)

---

## 4b. Post-build bug fixes ✅

Found and fixed during Android Expo Go smoke testing (2026-05-30). All committed; require next EAS build to reach device.

---

## 4c. Pre-submission fixes ✅

Implemented before App Store submission (2026-05-30). Require next EAS build.

- [x] Sign-up: replace email verification step with welcome screen — `081b34a`
- [x] Profile: add Delete Account (required by App Store guideline for apps with account creation) — `deleteAccount()` in `lib/authApi.ts`; button in profile screen below Sign Out; confirmation Alert; handles `auth/requires-recent-login` gracefully
- [x] `npm test` — 502 tests passing (37 suites)

- [x] App display name `"noodle-bowl"` → `"Noodle Bowl"` (`app.json`) — `a8d1296`
- [x] Auth redirect: after signing in via auth gate modal, return to game screen instead of home — `from=game` param propagated through sign-in and sign-up screens — `99d1f70`
- [x] Home screen: replace day-scoped `PLAY AGAIN` with week-scoped `COMPLETED` label — `isPlayedThisWeek` utility added with full test coverage — `939db35`
- [x] Help result card (Bug 1): correct answer and ✓/✗ tag were always shown — removed entirely; the card is a hint, not a grade report — `e301a0a`
- [x] Help result card (Bug 2): "Try this question →" opened a random question in Spread, Wave, and Quip — hint mode (`hintQuestionIndex` param) added to all three games to match the existing Lede/SoF implementation — `3942392`, `8c90e1e`
- [x] `isGameCompleted` check on home card updated to week-scoped (`isPlayedThisWeek`) — `939db35`

---

## 5. Smoke tests (→ PRR §2)

Formal QA blocks (start:qa) skipped for this release — verified directly on the **production TestFlight build**.

Blocks 0–15 carry forward from alpha-v0.1.1 (last verified on `start:qa`). Block 16 (push notifications) is new and **must be verified on the production build** — Expo Go does not support push notifications.

Help/challenge flow re-verified on Android Expo Go 2026-05-30 after §4b bug fixes — confirmed passing.

- [x] Block 0 — Q2 Redesign (home, Lede, Spread, SoF)
- [x] Block 1 — App launch / anonymous auth
- [x] Block 2 — Account creation
- [x] Block 3 — Sign in
- [x] Block 4 — Auth gate on sharing
- [x] Block 5 — Cross-device challenge flow
- [x] Block 6 — Cross-device help flow *(re-verified 2026-05-30 after §4b fixes)*
- [x] Block 7 — Content & offline resilience
- [x] Block 8 — Sign-out behaviour
- [x] Block 9 — Stats persistence
- [x] Block 10 — Self-challenge guard
- [x] Block 11 — Universal link deep linking
- [x] Block 12 — Live content
- [x] Block 13 — Weekly streak & shields
- [x] Block 14 — Landing screen privacy
- [x] Block 15 — Streak & shield onboarding
- [ ] Block 16 — Push notifications (production build, PRR §2 Blocks A–D)
  - [ ] A: Cold launch, basic game, streak modal
  - [ ] B: Challenge push — Device 1 sends, Device 2 responds, Device 1 gets notification + tap routes correctly
  - [ ] C: Help push — same pattern
  - [ ] D: Carry-forward regression (landing screen text, deep links, sign-out)

---

## 6. App Store Connect (→ PRR §3)

Reference: `docs/releases/alpha-v1.1.0/app-store-listing.md`

- [ ] Privacy policy live at `https://noodlebowl.app/privacy`
- [ ] App listing complete (name, subtitle, description, keywords, URLs, category, age rating) 🔄
- [ ] Screenshots uploaded — iPhone 6.9" minimum 🔄 *(in progress — separate thread)*
- [ ] App preview video *(optional — skip if not ready)*
- [ ] Status set to **Ready for Review**

---

## 7. Production environment (→ PRR §4)

- [ ] Functions rebuilt: `cd functions && npm run build` ⚠️ build is stale — source changed in b384299
- [ ] Cloud Functions deployed: `firebase deploy --only functions`
- [ ] Firestore security rules deployed: `firebase deploy --only firestore:rules`
- [ ] `contentVersions` has a doc for the active ISO week at release time
- [ ] All 7 functions visible in Firebase console: `challengeCreate`, `challengeGet`, `challengeRespond`, `helpCreate`, `helpGet`, `helpRespond`, `sendWeeklyNotification`
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] `eas.json` — `appleId`, `ascAppId`, `appleTeamId` verified
- [ ] `eas whoami` — EAS CLI logged in

---

## 8. Build & submit

```bash
# Step 1: build
eas build --platform ios --profile production

# Step 2: submit to App Store Connect (makes it available in TestFlight)
eas submit --platform ios --profile production --latest
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard
- [ ] Submission completed — no errors
- [ ] Build visible in TestFlight → Internal Testing
- [ ] Installed on device via TestFlight app
- [ ] Block 16 smoke test passed (→ §5)
- [ ] App Store Connect → set version to **Ready for Review**
- [ ] Status changes to **Waiting for Review**

---

## 9. Post-release

- [ ] Git tag: `git tag -a alpha-v1.1.0 -m "feat: App Store public release — push notifications"`
- [ ] Push tag: `git push origin --tags`
- [ ] Add row to `docs/RELEASES.md`
- [ ] PRR sign-off complete (`docs/releases/alpha-v1.1.0/prr-alpha-v1.1.0.md`)

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
