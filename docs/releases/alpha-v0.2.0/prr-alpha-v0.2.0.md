# Production Release Readiness — Alpha v0.2.0

Live content pipeline + App Store submission.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `alpha-v0.2.0` |
| Target platform | iOS |
| Distribution channel | App Store (public) |
| Target date | TBD |
| Release owner | rcsheng |
| What's new | Content pipeline (auto-deactivation fix), first production content batch, App Store listing |

---

## Feature flags

| Flag | Smoke test value | Production build value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_ENABLE_SLURP` | unset | unset | Slurp not in this release |
| `EXPO_PUBLIC_COLLECTION_PREFIX` | `qa_` | unset | `qa_` during smoke only |

---

## 1. Content pipeline

- [ ] Emulator dry run complete (all 5 stages pass)
- [ ] Production publish complete — one `contentVersions` doc with `active: true`
- [ ] App reads live content on fresh install (no fallback triggered)

---

## 2. Code quality

- [ ] All tests passing — `npm test`
- [ ] Functions tests passing — `cd functions && npm test`
- [ ] No TypeScript errors — `npx tsc --noEmit`
- [ ] Code review complete (code-reviewer agent)
- [ ] Security review complete (security-reviewer agent)

---

## 3. Smoke test

Run against **production Firebase with QA collections** using `npm run start:qa`.

### Block 12 — Live content

| # | Step | Expected |
|---|---|---|
| 12.1 | Launch app fresh (no cache) | Home screen loads with today's content — no "content unavailable" error |
| 12.2 | Play Lede game to result screen | Question and answer match a real news story (not bundled test data) |
| 12.3 | Force-quit and relaunch | Content loads instantly from AsyncStorage cache |
| 12.4 | Run `pipeline:publish` again with new content | Old version deactivated, new version active; app picks up new content on next cold launch |

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
- [ ] Block 11 — Universal link deep linking

Step details for Blocks 0–11: `docs/releases/alpha-v0.1.2/prr-alpha-v0.1.2.md` §2.

---

## 4. App Store Connect

- [ ] Privacy policy live at public URL
- [ ] App listing complete (name, subtitle, description, keywords, URLs, category, age rating)
- [ ] Screenshots uploaded — iPhone 6.9" minimum
- [ ] App Store Connect status: "Ready for Review"

---

## 5. Production environment

- [ ] Production Firebase project is the target (not emulator)
- [ ] `.env.local` — `EXPO_PUBLIC_COLLECTION_PREFIX` absent or unset for prod build
- [ ] Production `contentVersions` has exactly one doc with `active: true`
- [ ] Firestore security rules deployed (no changes in this release — verify current)
- [ ] Cloud Functions deployed (no changes in this release — verify current)
- [ ] AASA file live: `https://noodlebowl.app/.well-known/apple-app-site-association`

---

## 6. App configuration

- [ ] `app.json` version correct for public release
- [ ] `eas.json` — submit config unchanged (`appleId`, `ascAppId`, `appleTeamId` set)
- [ ] EAS CLI logged in — `eas whoami`

---

## 7. Build

```bash
eas build --platform ios --profile production
```

- [ ] Build submitted to EAS cloud
- [ ] Build completed without errors
- [ ] `.ipa` artifact visible in EAS dashboard

---

## 8. Submit to App Store

```bash
eas submit --platform ios --profile production --latest
```

Choose **App Store** (not TestFlight) in the submission flow.

- [ ] Submit completed — no errors
- [ ] Build appears in App Store Connect → App Store tab
- [ ] Status changes to "Waiting for Review"

---

## 9. Post-release

- [ ] Git tag: `git tag -a alpha-v0.2.0 -m "feat: live content pipeline, App Store submission"`
- [ ] Push tag: `git push origin --tags`
- [ ] Row added to `docs/RELEASES.md`
- [ ] This PRR updated with actual dates and outcomes

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Content pipeline | | |
| Smoke tests | | |
| App Store listing | | |
| Build | | |
| App Store submit | | |
