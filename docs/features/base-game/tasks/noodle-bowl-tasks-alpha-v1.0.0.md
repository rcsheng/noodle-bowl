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

## 3. Push Notifications 🔲

TDD approach: write RED tests first, then implement GREEN, then refactor.

### §3a — Permission request (client)

- [ ] `lib/__tests__/pushTokens.test.ts` — RED: add tests for contextual permission trigger:
  - `requestPermissionsAsync` not called on module import
  - `registerPushToken` returns null when permission denied
  - `registerPushToken` writes token to Firestore when granted
  - idempotent: returns cached token on second call (no double-register)
  - no-op in Expo Go (`isExpoGo === true`)
- [ ] `lib/pushTokens.ts` — GREEN: update `registerPushToken` to use cached token guard; ensure `isExpoGo` guard still in place
- [ ] `context/AuthContext.tsx` — keep notification registration OUT of auth flow; registration is triggered contextually (see §3b)
- [ ] `app/games/lede.tsx` — call `registerPushToken` after first shield primer interaction (primary CTA tap); same pattern on all five game screens
- [ ] `app/games/spread.tsx` — same
- [ ] `app/games/sof.tsx` — same
- [ ] `app/games/quip.tsx` — same
- [ ] `app/games/wave.tsx` — same

### §3b — Notification handler (client)

- [ ] `app/__tests__/_layout.test.tsx` — RED: test that `setNotificationHandler` is called on mount; test that notification tap listener is registered
- [ ] `app/_layout.tsx` — GREEN: `Notifications.setNotificationHandler(...)` on mount; `addNotificationResponseReceivedListener` that routes via `data.screen` to correct tab
- [ ] `jest.setup.ts` — add `addNotificationResponseReceivedListener` and `setNotificationHandler` to `expo-notifications` mock

### §3c — Challenge responded notification (Cloud Function)

- [ ] `functions/src/__tests__/challengeRespond.test.ts` — RED: add tests:
  - sends push to `senderPushToken` when present on challenge doc
  - skips gracefully (no throw) when `senderPushToken` is null or missing
  - challenge write succeeds regardless of notification outcome
  - correct payload: `title`, `body`, `data.screen === 'home'`
- [ ] `functions/src/challengeRespond.ts` — GREEN: after successful response write, look up `senderPushToken` from challenge doc, POST to Expo push API; wrap in try/catch

### §3d — Help received notification (Cloud Function)

- [ ] `functions/src/__tests__/helpRespond.test.ts` — RED: same pattern as §3c for `askerPushToken`
- [ ] `functions/src/helpRespond.ts` — GREEN: after successful response write, look up `askerPushToken`, POST to Expo push API; wrap in try/catch

> `helpRespond.ts` may not exist yet — check; create if needed following `challengeRespond.ts` pattern.

### §3e — New week notification (scheduled Cloud Function)

- [ ] `functions/src/__tests__/sendWeeklyNotification.test.ts` — RED:
  - fetches all documents from `pushTokens` collection
  - sends batches of ≤ 100 tokens
  - handles empty collection without error
  - correct payload: title, body, `data.screen === 'home'`
- [ ] `functions/src/sendWeeklyNotification.ts` — GREEN: scheduled function (`pubsub.schedule('0 15 * * 1').timeZone('America/New_York')`); fetch `pushTokens`, chunk into 100s, POST to Expo API
- [ ] `functions/src/index.ts` — export `sendWeeklyNotification`

### §3f — Shared Expo push helper

- [ ] `functions/src/lib/expoPush.ts` — extract the Expo API POST logic into a shared helper used by §3c, §3d, §3e; include retry on 429 / transient errors

---

## 4. Code quality gates

- [ ] `npm test` — all tests passing
- [ ] `cd functions && npm test` — functions tests passing
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] **code-reviewer** agent — full diff since alpha-v0.2.0
- [ ] **security-reviewer** agent — push token storage, Expo API call from functions

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
- [ ] [P2] Friend name in notification copy (requires Firestore read in function)
- [ ] [P2] Streak milestones (4 / 12 / 26 / 52 weeks)
- [ ] [P2] Engraved-monogram shield variant
- [ ] [P2] Shield primer re-promptable
- [ ] [P3] Cross-device dismissal race (simultaneous open on two devices)
- [ ] [P3] Garbage-collect orphaned `received_help` interactions
- [ ] [P3] Animated entry/exit on Help Result / Challenge Reply cards
- [ ] [P3] Shield-fill animation
- [ ] [P3] Architecture docs
