# Production Release Readiness — Template

Copy this file and rename it to match the release (e.g. `alpha-v0.1.0.md`).

---

## Release metadata

| Field | Value |
|---|---|
| Version | `vX.Y.Z-CHANNEL.N` |
| Target platform | iOS / Android / Both |
| Distribution channel | TestFlight / Play Internal / Public |
| Target date | YYYY-MM-DD |
| Release owner | |

---

## 1. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] Security-rules tests passing — `npm run test:rules` (requires emulator)
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 2. Manual smoke test

Run through `docs/smoke-test/smoke-test-plan.md` blocks 1–10 against the local emulator.

- [ ] Block 1 — App launch / anonymous auth
- [ ] Block 2 — Game content loads from Firestore
- [ ] Block 3 — All 5 games playable
- [ ] Block 4 — Sign up / sign in / sign out
- [ ] Block 5 — Stats persist across sessions
- [ ] Block 6 — Challenge link send + receive
- [ ] Block 7 — Help link send + receive
- [ ] Block 8 — Streak + shields
- [ ] Block 9 — Friend replies on home screen
- [ ] Block 10 — Edge cases (anon limits, self-challenge guard, etc.)

---

## 3. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_USE_EMULATOR=false`
- [ ] Production Firestore has at least one active `contentVersions` doc — `npm run seed:prod`
- [ ] Firestore security rules deployed — `firebase deploy --only firestore:rules`
- [ ] Cloud Functions deployed — `firebase deploy --only functions`
- [ ] Functions build is clean — `cd functions && npm run build`

---

## 4. App configuration

- [ ] `app.json` version is correct
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
- [ ] Apple processing complete (usually < 30 min; status changes from "Processing" to "Ready to Test")

---

## 7. TestFlight tester management

- [ ] Internal testers (Apple Developer team members) added in App Store Connect → TestFlight → Internal Testing
- [ ] External testers (if applicable) added to a group and group submitted for Beta App Review
- [ ] Invite emails sent / TestFlight links distributed

---

## 8. Post-release

- [ ] Git tag created — `git tag -a vX.Y.Z-CHANNEL.N -m "description"`
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
