# Production Release Readiness — Alpha v0.2.0

First release with Slurp (Riso Broth design system). All five base games carry over from v0.1.1.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.2.0` |
| Target platform | iOS |
| Distribution channel | TestFlight (internal testers) |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Slurp game (feature-flagged in v0.1.1, fully enabled here) |

---

## Feature flags

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | `true` | `true` | Must be on for Slurp tab to appear |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | `qa_` during smoke only |

**`.env.local` for smoke testing** (keep Firebase config vars, replace feature flag section):
```
EXPO_PUBLIC_COLLECTION_PREFIX=qa_
EXPO_PUBLIC_ENABLE_SLURP=true
```

**`.env.local` for production build** (keep Firebase config vars, replace feature flag section):
```
EXPO_PUBLIC_ENABLE_SLURP=true
# EXPO_PUBLIC_COLLECTION_PREFIX — must be absent or commented out
```

---

## 1. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 2. Smoke test

Run against **production Firebase with QA collections** using `npm run start:qa` with `EXPO_PUBLIC_ENABLE_SLURP=true`.

### Setup

```bash
# .env.local must have:
# EXPO_PUBLIC_COLLECTION_PREFIX=qa_
# EXPO_PUBLIC_ENABLE_SLURP=true

npm run start:qa
```

---

### Block S — Slurp _(new in this release)_

> Step tables to be written when Slurp implementation is complete.
> Pull AC list from `docs/features/slurp/tasks.md` and `docs/features/slurp/prd.md`.

- [ ] Slurp tab visible in home list
- [ ] Slurp game launches and plays through to result
- [ ] Scoring correct
- [ ] Challenge / help flows work from Slurp result screen
- [ ] _(add detailed step table here before cutting the build)_

---

### Regression — Block 0 (Q2 redesign sanity)

Verify the base-game redesign from v0.1.1 is unaffected.

- [ ] Block 0a — Home tab: PLAY button on unplayed, PLAY AGAIN after played
- [ ] Block 0b — Lede: headline-first, no reporter names, pill `...`, combined reveal box
- [ ] Block 0c — Spread: four multiple-choice options, correct/wrong reveal
- [ ] Block 0d — SoF: segmented STANDARD/WEIRD toggle, no wager, +10/0 scoring

Full step tables for Block 0 are in `docs/releases/alpha-v0.1.1/prr-alpha-v0.1.1.md` §2 Block 0.

---

### Regression — Blocks 1–10

Steps unchanged from alpha-v0.1.1. Full step tables in `docs/releases/alpha-v0.1.1/prr-alpha-v0.1.1.md` §2 Regression blocks.

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

---

## 3. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_COLLECTION_PREFIX` removed or unset
- [ ] `.env.local` — `EXPO_PUBLIC_ENABLE_SLURP=true`
- [ ] Production Firestore has at least one active `contentVersions` doc — `npm run seed:prod`
- [ ] Firestore security rules deployed — `firebase deploy --only firestore:rules`
- [ ] Cloud Functions deployed — `firebase deploy --only functions`
- [ ] Functions build is clean — `cd functions && npm run build`

> **Infra note:** if `challengeCreate` was redeployed from scratch, re-grant the IAM binding:
> ```bash
> gcloud run services add-iam-policy-binding challengecreate --region=us-central1 --member="allUsers" --role="roles/run.invoker" --project=noodle-bowl
> ```

---

## 4. App configuration

- [ ] `app.json` version bumped to `1.1.0` (or matching EAS auto-increment)
- [ ] `eas.json` — `appleId` and `ascAppId` filled in
- [ ] EAS CLI logged in — `eas whoami`

---

## 5. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors (https://expo.dev/accounts/rcsheng/projects/noodle-bowl/builds)
- [ ] `.ipa` artifact visible in dashboard

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
- [ ] Invite emails sent / TestFlight links distributed

---

## 8. Post-release

- [ ] Git tag created — `git tag -a alpha-v0.2.0 -m "Add Slurp game"`
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
