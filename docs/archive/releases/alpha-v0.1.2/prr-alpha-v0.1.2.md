# Production Release Readiness — Alpha v0.1.2

> **Archived — not shipped as a standalone release.**
> The deep link routing fix and AASA infrastructure were merged to `main` but no EAS build was ever cut.
> All open items were absorbed into alpha-v0.2.0.

Deep link routing fix: `/c/:token` and `/h/:token` redirect screens, AASA infrastructure, cross-cutting quality pass.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.1.2` |
| Target platform | iOS |
| Distribution channel | TestFlight (internal testers) |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Deep link routing fix, AASA setup, code/security review |

---

## Feature flags

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | unset | Slurp not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | `qa_` during smoke only |

---

## 1. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 2. Smoke test

Run against **production Firebase with QA collections** using `npm run start:qa`.

```bash
npm run start:qa
```

### Block 11 — Universal link deep linking _(requires native build — TestFlight or dev build)_

> Expo Go **cannot** test universal links. This block must run against a build installed via TestFlight or `eas build --profile development`. Use `start:qa` config in the build.

**Pre-check before Block 11:**
- AASA file is live: `https://noodlebowl.app/.well-known/apple-app-site-association` returns JSON (no redirect)
- Apple CDN has picked it up: `https://app-site-association.cdn-apple.com/a/v1/noodlebowl.app` returns the AASA JSON

**Simulator shortcut (no physical device needed for basic check):**

```bash
# Install a dev build on the simulator first, then:
xcrun simctl openurl booted "https://noodlebowl.app/c/REAL_TOKEN_HERE"
xcrun simctl openurl booted "https://noodlebowl.app/h/REAL_TOKEN_HERE"
```

Get a real token by running `npm run start:qa`, playing a game, and tapping "Challenge a friend" or "Ask a friend for help" to generate a link.

| # | Step | Expected |
|---|---|---|
| 11.1 | Device A (signed in): play any game to result screen, tap "Challenge a friend", copy the link | URL is `https://noodlebowl.app/c/{token}` |
| 11.2 | Send the URL to Device B via iMessage or Notes | — |
| 11.3 | Device B: tap the link | App opens **directly** to the correct game screen with the challenge question — Safari does not open |
| 11.4 | Verify no header flash | The `/c/` screen does not show a header or blank frame before landing on the game |
| 11.5 | Device A: play a game, tap "Ask a friend for help", copy the URL | URL is `https://noodlebowl.app/h/{token}` |
| 11.6 | Device B: tap the help link | App opens directly to the game screen showing the help question |
| 11.7 | Test custom scheme (simulator): `xcrun simctl openurl booted "noodlebowl://c/{token}"` | App opens to the challenge game screen |
| 11.8 | Test custom scheme (simulator): `xcrun simctl openurl booted "noodlebowl://h/{token}"` | App opens to the help game screen |

### Regression

- [ ] Block 0 — Q2 Redesign (home, Lede, Spread, SoF)
- [ ] Block 1 — App launch / anonymous auth
- [ ] Block 2 — Account creation
- [ ] Block 3 — Sign in
- [ ] Block 4 — Auth gate on sharing
- [ ] Block 5 — Cross-device challenge flow
- [ ] Block 6 — Cross-device help flow
- [ ] Block 7 — Content & offline resilience
- [ ] Block 8 — Sign-out behaviour
- [ ] Block 9 — Stats persistence
- [ ] Block 10 — Self-challenge guard

Step details for Blocks 0–10: `docs/releases/alpha-v0.1.1/prr-alpha-v0.1.1.md` §2.

---

## 3. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_COLLECTION_PREFIX` absent or unset for prod build
- [ ] Production Firestore has at least one active `contentVersions` doc
- [ ] Firestore security rules deployed (no changes in this release — verify current)
- [ ] Cloud Functions deployed (no changes in this release — verify current)
- [ ] **AASA file live** at `https://noodlebowl.app/.well-known/apple-app-site-association`
- [ ] **Apple CDN confirmed** — `https://app-site-association.cdn-apple.com/a/v1/noodlebowl.app`

---

## 4. App configuration

- [ ] `app.json` version unchanged (`1.0.0` — EAS auto-increments build number)
- [ ] `eas.json` — submit config unchanged (`appleId`, `ascAppId`, `appleTeamId` set)
- [ ] EAS CLI logged in — `eas whoami`

---

## 5. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard

---

## 6. Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest
```

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → TestFlight
- [ ] Status changes to "Ready to Test"

---

## 7. TestFlight tester management

- [ ] Internal testers notified

---

## 8. Post-release

- [ ] Git tag: `git tag -a alpha-v0.1.2 -m "fix: deep link routing for /c/ and /h/ universal links"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Smoke tests | | |
| Build | | |
| TestFlight submit | | |
| Testers notified | | |
