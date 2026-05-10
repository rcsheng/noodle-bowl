# Production Release Readiness — Alpha v0.3.0

App Store public release.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.3.0` |
| Target platform | iOS |
| Distribution channel | App Store (public) |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | First public App Store release — all alpha features, live content pipeline |

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

Full regression against **production Firebase with QA collections** (`npm run start:qa`).

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
- [ ] Block 11 — Universal link deep linking
- [ ] Block 12 — Live content (from alpha-v0.2.0 PRR)

---

## 3. App Store Connect

- [ ] Privacy policy live at public URL
- [ ] App listing complete (name, subtitle, description, keywords, URLs, category, age rating)
- [ ] Screenshots uploaded — iPhone 6.9" minimum
- [ ] App preview video (optional)
- [ ] App Store Connect status: "Ready for Review"

---

## 4. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_COLLECTION_PREFIX` absent or unset for prod build
- [ ] Production `contentVersions` has exactly one doc with `active: true`
- [ ] `contentPacks` collection up to date
- [ ] Firestore security rules deployed and verified
- [ ] Cloud Functions deployed and verified
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`

---

## 5. App configuration

- [ ] `app.json` version bumped to `0.3.0`
- [ ] `eas.json` — submit config verified (`appleId`, `ascAppId`, `appleTeamId` set)
- [ ] EAS CLI logged in — `eas whoami`

---

## 6. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard

---

## 7. Submit to App Store

```bash
eas submit --platform ios --profile production --latest
```

Choose **App Store** (not TestFlight) in the submission flow.

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → App Store tab
- [ ] Status changes to "Waiting for Review"

---

## 8. Post-release

- [ ] Git tag: `git tag -a alpha-v0.3.0 -m "feat: App Store public release"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Code quality | | |
| Smoke tests | | |
| App Store listing | | |
| Build | | |
| App Store submit | | |
