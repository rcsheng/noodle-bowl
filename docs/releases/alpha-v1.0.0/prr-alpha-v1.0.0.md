# Production Release Readiness — Alpha v1.0.0

App Store public release.

> **Version note:** Internal name is `alpha-v1.0.0` to align with App Store versioning (1.x.x). The `app.json` version is `1.1.0` because `1.0.0` was already consumed by EAS build 12 (uploaded 2026-05-24). The git tag will be `alpha-v1.0.0`.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v1.0.0` |
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

## 1. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent) — push token storage, Expo API call from functions

---

## 2. Smoke test

Formal QA blocks (start:qa) are skipped for this release. Testing is done directly on the **production build** installed via TestFlight or direct install.

Key flows to manually verify on the production build:

- [ ] Cold launch — anonymous auth, home screen loads
- [ ] Play a game end-to-end (Lede, Spread, or SoF)
- [ ] Challenge a friend (share link, friend opens and plays, verify notification received) ← new
- [ ] Ask a friend for help (share link, friend answers, verify notification received) ← new
- [ ] Weekly notification fires Monday 10 AM ET ← scheduled (verify in Cloud Function logs)
- [ ] Streak ignition modal fires on first-ever game completion
- [ ] Tappable masthead chip opens tooltip
- [ ] Stats tab shows shield slots + week chain
- [ ] Help/challenge landing screen shows no question number

> Cross-device flows (challenge, help) require two devices and throwaway accounts writing to prod `challenges` / `helpRequests` collections.

---

## 3. App Store Connect

Reference: `docs/releases/alpha-v1.0.0/app-store-listing.md`

- [ ] Privacy policy live at `https://noodlebowl.app/privacy`
- [ ] App listing complete (name, subtitle, description, keywords, promotional text, URLs, category, age rating)
- [ ] Screenshots uploaded — iPhone 6.9" minimum (5–6 images)
- [ ] App preview video *(optional)*
- [ ] App Store Connect status: **Ready for Review**

---

## 4. Production environment

- [ ] Production Firebase project is the target
- [ ] Production `contentVersions` has a doc for the current active ISO week
- [ ] Firestore security rules deployed and verified
- [ ] Cloud Functions deployed and verified — including `sendWeeklyNotification`
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] `eas.json` — `appleId`, `ascAppId`, `appleTeamId` verified
- [ ] `eas whoami` — EAS CLI logged in

---

## 5. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard

---

## 6. Submit to App Store

```bash
eas submit --platform ios --profile production --latest
```

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → App Store tab
- [ ] Status changes to **Waiting for Review**

---

## 7. Post-release

- [ ] Git tag: `git tag -a alpha-v1.0.0 -m "feat: App Store public release — push notifications"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Code quality | | |
| Smoke test (production build) | | |
| App Store listing | | |
| Build | | |
| App Store submit | | |
