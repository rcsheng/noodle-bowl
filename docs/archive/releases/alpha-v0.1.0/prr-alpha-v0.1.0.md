# Production Release Readiness — Alpha v0.1.0

First alpha to trusted testers via TestFlight. 5 games, anonymous → email auth, Firestore stats + seen sync, challenge/help links, streak shields, friend reply cards.

---

## Release metadata

| Field | Value |
|---|---|
| Version | `v0.1.0-alpha.1` |
| Target platform | iOS |
| Distribution channel | TestFlight (internal testers) |
| Target date | 2026-04-30 |
| Release owner | rcsheng |

---

## 1. Code quality ✅ Complete

- [x] All tests passing — 313 app tests + 59 function tests + 34 rules tests
- [x] Code review complete
- [x] Security review complete

---

## 2. Manual smoke test ✅ Complete

All blocks verified 2026-04-30 against **production Firebase** (QA collections via `start:qa`) on iPhone Expo Go.

- Auth (sign-in, guest play, account upgrade) ✅
- Challenge link generation + cross-device receive + respond ✅
- Help request round-trip ✅
- Friend reply card on home screen ✅
- Stats tab shield display ✅

Earlier emulator pass (2026-04-28) covered games, streaks, and seen-sync.

---

## 3. Production environment

- [x] Production Firebase project live (`feat: prod firebase` — commit `3dc5f13`)
- [x] Firestore security rules deployed
- [x] Cloud Functions deployed (Node 22, firebase-functions 6.6.0) — all 6 functions (challengeCreate/Get/Respond, helpCreate/Get/Respond) with `collectionPrefix` QA isolation support
- [x] `challengeCreate` Cloud Run IAM fix applied 2026-04-30 — `allUsers run.invoker` grant was missing (Firebase does not re-apply on updates); fixed via GCP REST API. If redeployed from scratch, re-grant:
  ```bash
  gcloud run services add-iam-policy-binding challengecreate --region=us-central1 --member="allUsers" --role="roles/run.invoker" --project=noodle-bowl
  ```
- [ ] **Seed production content** — run once before the build:
  ```bash
  npm run seed:prod
  ```
  Verify a `contentVersions` doc with `active: true` exists in the prod Firestore console.

- [ ] **Confirm `.env.local`** has `EXPO_PUBLIC_USE_EMULATOR=false` (or the var is unset — the app defaults to prod when the emulator flag is absent)

---

## 4. App configuration

`app.json` is set:
- Version: `1.0.0`
- Bundle ID: `app.noodlebowl.noodlebowl`
- Associated domain: `applinks:noodlebowl.app`
- EAS project ID: `aa495a95-789c-40b5-ad12-3a107223d6ec`
- Apple team ID: `BKVD6WM3XV`

**Two placeholders still need filling in `eas.json`:**

- [ ] Replace `REPLACE_WITH_YOUR_APPLE_ID_EMAIL` with your Apple ID email (the one you use to log in to App Store Connect)
- [ ] Replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` with the numeric App ID from App Store Connect → App → General → App Information → Apple ID (looks like `123456789`)

  > If you haven't created the app in App Store Connect yet: log in at [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → **+** → New App → fill in name, bundle ID (`app.noodlebowl.noodlebowl`), SKU (e.g. `noodle-bowl`). The numeric App ID is generated on save.

- [ ] Confirm EAS CLI is logged in:
  ```bash
  eas whoami
  ```
  If not logged in: `eas login`

---

## 5. Build

```bash
eas build --platform ios --profile production
```

- [ ] Command submitted — EAS queues the build in the cloud (~15 min)
- [ ] Build completed with no errors — check https://expo.dev/accounts/rcsheng/projects/noodle-bowl/builds
- [ ] `.ipa` artifact visible in dashboard

> The `production` profile uses `distribution: store` and `autoIncrement: true`, so EAS handles the build number automatically.

---

## 6. Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest
```

- [ ] Submit completed with no errors
- [ ] Build appears in App Store Connect → TestFlight (status: "Processing")
- [ ] Status changes to "Ready to Test" (usually < 30 min)

---

## 7. TestFlight tester management

- [ ] Open App Store Connect → your app → TestFlight → **Internal Testing**
- [ ] Add yourself and any trusted testers (must be members of your Apple Developer team)
- [ ] Testers get an email invite → they install TestFlight app → install Noodle Bowl

> For external testers (people outside your Apple team): create a group under External Testing, add them by email, and submit the group for Beta App Review. This usually takes < 1 day. Skip this for the initial tight alpha.

---

## 8. Post-release

- [ ] Create git tag:
  ```bash
  git tag -a v0.1.0-alpha.1 -m "First alpha: 5 games, auth, stats, challenge/help links, streak shields"
  git push origin --tags
  ```
- [ ] Add row to `docs/RELEASES.md`:
  ```
  | v0.1.0-alpha.1 | 2026-04-29 | First alpha to trusted testers. 5 games, anon→email auth, Firestore stats, challenge/help links, streak shields. | Push notifications (dropped). Cross-device E2E (manual smoke only). | PRD v5 §1–8 |
  ```

---

## Sign-off

| Step | Done by | Date |
|---|---|---|
| Smoke tests | rcsheng | 2026-04-30 (prod Firebase QA) |
| Code + security review | rcsheng | prior session |
| Seed prod content | | |
| Build | | |
| TestFlight submit | | |
| Testers notified | | |
