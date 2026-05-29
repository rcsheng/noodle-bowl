# Production Release Readiness — Alpha v1.1.0

App Store public release.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v1.1.0` |
| App Store version | `1.1.0` |
| Target platform | iOS |
| Distribution channel | App Store public release |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Push notifications (challenge/help response + weekly); streak & shield onboarding (carry-forward); landing screen privacy (carry-forward) |

---

## Feature flags

| Flag | Production build value | Notes |
|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | Slurp not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | unset | Production collections |

---

## 1. Code quality ✅

- [x] All tests passing — `npm test` (480 tests, 37 suites)
- [x] Functions tests passing — `cd functions && npm test` (74 tests, 6 suites)
- [x] No TypeScript errors — `npx tsc --noEmit`
- [x] Code review complete (code-reviewer agent) — HIGH items resolved
- [x] Security review complete (security-reviewer agent) — all HIGH items resolved

---

## 2. Smoke test

Formal QA blocks (start:qa) are skipped for this release. Testing is done directly on the **production build** installed via TestFlight internal testing. Install the build from TestFlight after Step 5 below, then run the blocks below.

> Cross-device blocks (B, C) require two devices and throwaway accounts. Writes go to prod `challenges` / `helpRequests` (real collections, no prefix).

### Block A — Cold launch & basic game

- [ ] Cold launch — anonymous auth, home screen loads with today's content
- [ ] Play a game end-to-end (Lede, Spread, or SoF) — score saves, stats update
- [ ] Tappable masthead chip opens streak tooltip
- [ ] Stats tab shows shield slots + week chain
- [ ] Streak ignition modal fires on first-ever game completion (use a fresh account if needed)

### Block B — Push notifications: challenge flow ← new

- [ ] Launch app on Device 1 — play any game to trigger `registerPushToken` — verify `pushTokens/{uid}` written in Firestore console
- [ ] Send a challenge from Device 1 — share link to Device 2
- [ ] Device 2 opens link, plays the game, submits response
- [ ] Device 1 receives push notification: `"Someone responded to your [game] challenge"`
- [ ] Tapping the notification routes to the correct screen (home or friends tab)

### Block C — Push notifications: help flow ← new

- [ ] Send a help request from Device 1 — share link to Device 2
- [ ] Device 2 opens link, submits an answer
- [ ] Device 1 receives push notification: `"Someone answered your [game] question"`
- [ ] Tapping the notification routes correctly

### Block D — Carry-forward regression

- [ ] Challenge landing screen shows no question number (`"They challenged you to answer a question."`)
- [ ] Help landing screen shows no question number (`"They're stuck and need your help."`)
- [ ] Sign out and sign back in — progress preserved
- [ ] Help/challenge deep links work (universal links: `noodlebowl.app/c/TOKEN`, `/h/TOKEN`)

### Block E — Weekly notification (async — verify in logs)

- [ ] Cloud Function `sendWeeklyNotification` appears in Firebase Functions logs for next Monday 10 AM ET run *(do not block release on this — verify post-release or trigger manually)*

---

## 3. App Store Connect

Reference: `docs/releases/alpha-v1.1.0/app-store-listing.md`

- [ ] Privacy policy live at `https://noodlebowl.app/privacy`
- [ ] App listing complete (name, subtitle, description, keywords, promotional text, URLs, category, age rating)
- [ ] Screenshots uploaded — iPhone 6.9" minimum (5–6 images)
- [ ] App preview video *(optional)*
- [ ] App Store Connect status: **Ready for Review**

---

## 4. Production environment

- [ ] Rebuild functions (source changed since last build): `cd functions && npm run build`
- [ ] Deploy Cloud Functions to production: `firebase deploy --only functions`
- [ ] Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- [ ] Production `contentVersions` has a doc for the current active ISO week
- [ ] Cloud Functions verified in Firebase console — all 6 deployed: `challengeCreate`, `challengeGet`, `challengeRespond`, `helpCreate`, `helpGet`, `helpRespond`, `sendWeeklyNotification`
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] `eas.json` — `appleId`, `ascAppId`, `appleTeamId` verified
- [ ] `eas whoami` — EAS CLI logged in

---

## 5. Build & TestFlight install

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard
- [ ] Submitted to App Store Connect — no errors
- [ ] Build visible in App Store Connect → TestFlight → Internal Testing
- [ ] Build installed on device via TestFlight app

> After installing, run smoke test blocks A–D from §2 above before proceeding to §6.

---

## 6. Submit to App Store Review

*Complete only after §2 smoke test passes.*

- [ ] §2 smoke test passed (Blocks A–D)
- [ ] App Store Connect → App Store tab — set version to **Ready for Review**
- [ ] Status changes to **Waiting for Review**

---

## 7. Post-release

- [ ] Git tag: `git tag -a alpha-v1.1.0 -m "feat: App Store public release — push notifications"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Code quality | rcsheng | 2026-05-29 |
| Functions rebuilt + deployed | | |
| Build (EAS production) | | |
| Smoke test (TestFlight, Blocks A–D) | | |
| App Store listing | | |
| App Store submit | | |
