# Production Release Readiness — Template

Copy this file and rename it to match the release (e.g. `prr-alpha-v0.1.1.md`).

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-vX.Y.Z` |
| Target platform | iOS / Android / Both |
| Distribution channel | TestFlight (internal) / TestFlight (external) |
| Target date | YYYY-MM-DD |
| Release owner | |
| What's new | One-line summary |

---

## Feature flags

List every flag and its required state for this build. Verify before running smoke tests and before the production build.

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | `true` / `false` / unset | `true` / `false` / unset | Slurp game tab |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | Must be unset in prod; `qa_` during smoke only |

> Set flags in `.env.local` for local smoke runs. Production EAS builds read from `eas.json` env block or Expo secrets.

---

## 1. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] Security-rules tests passing — `npm run test:rules` (requires emulator)
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 2. Smoke test

Run against **production Firebase with QA collections** using `npm run start:qa`.

### Setup

```bash
# Terminal 1 — start the app pointed at prod Firebase + QA collections
npm run start:qa
```

Confirm `.env.local` has the flags from the Feature flags table above set to their **smoke test** values, then scan QR or press `i`/`a`.

For cross-device blocks, connect both devices to the same Metro server.

### New in this release

_(Copy the step tables for features new to this release. Replace this placeholder.)_

| # | Step | Expected |
|---|---|---|
| N.1 | … | … |

### Regression

Blocks below should pass unchanged from the prior release. Run on one device unless the block calls out two.

- [ ] Block 1 — App launch / anonymous auth
- [ ] Block 2 — Account creation (Device A)
- [ ] Block 3 — Sign in (Device B)
- [ ] Block 4 — Auth gate on sharing
- [ ] Block 5 — Cross-device challenge flow
- [ ] Block 6 — Cross-device help flow
- [ ] Block 7 — Content & offline resilience
- [ ] Block 8 — Sign-out behaviour
- [ ] Block 9 — Stats persistence to Firestore
- [ ] Block 10 — Self-challenge guard & post-answer sign-up prompt

Regression block step details are embedded in `docs/releases/alpha-v0.1.1/prr-alpha-v0.1.1.md` §2 Regression blocks.

---

## 3. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — feature flags set to **production** values (see Feature flags table)
- [ ] `EXPO_PUBLIC_COLLECTION_PREFIX` is unset (or absent from `.env.local`)
- [ ] Production Firestore has at least one active `contentVersions` doc — `npm run seed:prod`
- [ ] Firestore security rules deployed — `firebase deploy --only firestore:rules`
- [ ] Cloud Functions deployed — `firebase deploy --only functions`
- [ ] Functions build is clean — `cd functions && npm run build`

---

## 4. App configuration

- [ ] `app.json` version and build number are correct
- [ ] `eas.json` — `appleId` and `ascAppId` filled in (no `REPLACE_WITH_*` placeholders)
- [ ] EAS CLI logged in — `eas whoami`

---

## 5. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors (check https://expo.dev — takes ~15 min)
- [ ] `.ipa` artifact visible in EAS dashboard

---

## 6. Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest
```

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → TestFlight
- [ ] Apple processing complete (status changes from "Processing" to "Ready to Test")

---

## 7. TestFlight tester management

- [ ] Internal testers added in App Store Connect → TestFlight → Internal Testing
- [ ] Invite emails sent / TestFlight links distributed

---

## 8. Post-release

- [ ] Git tag created — `git tag -a alpha-vX.Y.Z -m "description"`
- [ ] Tag pushed — `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR doc updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Smoke tests | | |
| Build | | |
| TestFlight submit | | |
| Testers notified | | |
