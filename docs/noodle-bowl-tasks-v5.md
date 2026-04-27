# Noodle Bowl v5 — Task List

Legend: `[P0]`=blocker, `[P1]`=needed for milestone, `[P2]`=nice to have

Phase order: **0 → (1 ∥ 2) → 3 → (4 ∥ 5)**

---

## Phase 0 — Pre-work (can land anytime)

- [ ] [P1] Add `zod` dependency (`npm i zod`)
- [ ] [P1] Add `firebase-tools` devDependency
- [ ] [P1] Create `lib/logger.ts` (console in dev, no-op in prod)
- [ ] [P2] Replace existing `console.log` in `app/`, `lib/`, `context/` with logger
- [ ] [P2] Document Maestro install in `docs/dev/e2e-setup.md`

---

## Phase 1 — Real Authentication

> Blocks Phase 4. Can run in parallel with Phase 2.

### RED — write failing tests first
- [ ] [P0] `context/__tests__/AuthContext.test.tsx`
  - anonymous sign-in on first launch
  - `isAnonymous=true` after anonymous sign-in
  - `isAnonymous=false` after email sign-in
  - `linkWithCredential` preserves uid during upgrade
  - signOut returns user to fresh anonymous session
- [ ] [P0] `lib/__tests__/authApi.test.ts`
  - zod rejects invalid email
  - zod rejects password < 8 chars
  - `linkWithCredential` called when current user is anonymous
  - `createUserWithEmailAndPassword` called when no current user
- [ ] [P1] `components/__tests__/SignUpScreen.test.tsx`
  - submit disabled while pending
  - `auth/email-already-in-use` surfaces as friendly message

### GREEN — implement
- [ ] [P0] Create `lib/authApi.ts` exporting `signUp`, `signIn`, `signOutAndGoAnonymous`, `upgradeAnonymous`, `sendPasswordReset`
- [ ] [P0] Create `context/AuthContext.tsx` with `onAuthStateChanged` + `useAuth()` hook
- [ ] [P0] Wire `<AuthProvider>` into `app/_layout.tsx`; remove inline `signInAnonymously` from RootLayout
- [ ] [P0] Create `app/auth/sign-up.tsx`
- [ ] [P0] Create `app/auth/sign-in.tsx`
- [ ] [P1] Create `app/auth/forgot-password.tsx`
- [ ] [P0] Create `app/(tabs)/profile.tsx` (display name, email, sign-in/sign-out CTA)
- [ ] [P0] Add Profile tab to `app/(tabs)/_layout.tsx`
- [ ] [P0] Add "Sign in to save your progress" banner for anonymous users on Stats screen
- [ ] [P1] Friendly error mapping for all Firebase auth error codes

### Verify
- [ ] [P0] All Phase 1 tests pass against auth emulator
- [ ] [P0] Manual: anon → sign-up → uid unchanged; sign-out → fresh anon; sign-in on new device → works

---

## Phase 2 — Game Content from Firestore

> Independent of Phase 1. Can run in parallel.

### RED — write failing tests first
- [ ] [P0] `lib/__tests__/contentRepo.test.ts`
  - `findActive` returns document where `active == true`
  - `findActive` throws when zero or >1 active versions
  - `getCached` returns null when AsyncStorage empty
  - `cache` writes `versionId + fetchedAt + banks`
  - fallback chain: network fail → cache → bundled constants
- [ ] [P0] `scripts/__tests__/seed-content.test.ts` (emulator-driven, asserts document written + active)
- [ ] [P1] Game screen smoke test: `lede.tsx` reads from `useContent()` and renders correctly with fallback bank

### GREEN — implement
- [ ] [P0] Create `packages/shared/contentTypes.ts` with `ContentVersion` + `ContentBanks` types
- [ ] [P0] Create `lib/contentRepo.ts` (Repository: `findActive`, `getCached`, `cache`, `getFallback`)
- [ ] [P0] Create `context/ContentContext.tsx` + `useContent()` hook
- [ ] [P0] Wrap app in `<ContentProvider>` inside `_layout.tsx`
- [ ] [P0] Update `app/games/lede.tsx` to read bank from `useContent()`
- [ ] [P0] Update `app/games/spread.tsx` to read bank from `useContent()`
- [ ] [P0] Update `app/games/sof.tsx` to read bank from `useContent()`
- [ ] [P0] Update `app/games/quip.tsx` to read bank from `useContent()`
- [ ] [P0] Update `app/games/wave.tsx` to read bank from `useContent()`
- [ ] [P0] Update `app/games/challenge/[token].tsx` to use `useContent()` where needed
- [ ] [P0] Create `scripts/seed-content.ts`
- [ ] [P0] Add npm scripts `seed:emulator` and `seed:prod`
- [ ] [P0] Update `firestore.rules` for `contentVersions` (auth-only read, admin-only write)
- [ ] [P1] Implement `seen`-array reset on `versionId` change in reducer

### Verify
- [ ] [P0] All Phase 2 tests pass
- [ ] [P0] `npm run seed:emulator`, start app, play all 5 games — questions render, `seen` tracking works
- [ ] [P0] Clear cache, kill network, launch app — fallback bank renders
- [ ] [P0] No regression in existing unit tests

---

## Phase 3 — E2E Framework Setup

> Blocks Phase 5. Depends on Phase 1 (sign-in screen needed for non-anon flows).

- [ ] [P0] Install Maestro CLI on dev machines and CI macOS runner
- [ ] [P0] Create `e2e/maestro/config.yaml`
- [ ] [P0] Create `e2e/maestro/flows/smoke.yaml` — launch app, assert hub renders
- [ ] [P0] Create `e2e/scripts/start-emulator.sh`
- [ ] [P0] Create `e2e/scripts/cleanup.sh`
- [ ] [P0] Create `e2e/scripts/seed-test-users.ts` — provisions `userA@test.local` + `userB@test.local`
- [ ] [P0] Create `e2e/scripts/seed-content-test.ts` — minimal deterministic content
- [ ] [P0] Create `e2e/scripts/run-e2e.sh` (single-device runner)
- [ ] [P0] Add npm script `e2e:smoke`
- [ ] [P1] Add CI step to run `e2e:smoke` on every PR

### Verify
- [ ] [P0] `npm run e2e:smoke` exits 0 locally
- [ ] [P0] `npm run e2e:smoke` exits 0 in CI

---

## Phase 4 — Stats Persistence to Firestore

> Depends on Phase 1.

### RED — write failing tests first
- [ ] [P0] `lib/__tests__/statsRepo.test.ts` (emulator-driven)
  - `write` persists to `users/{uid}/meta/stats`
  - `read` returns null for new user
  - `read` returns the last-written value
- [ ] [P0] `lib/__tests__/syncQueue.test.ts`
  - debounces multiple rapid writes into one
  - enqueues to outbox on network failure
  - drains outbox on next successful write
  - caps outbox at 50 entries
- [ ] [P0] `context/__tests__/GameContext.merge.test.tsx`
  - server stats win when `server.lastPlayedDate >= local.lastPlayedDate`
  - local stats win when `local.lastPlayedDate > server.lastPlayedDate`
  - `seen` arrays merge as deduplicated union per game

### GREEN — implement
- [ ] [P0] Create `lib/statsRepo.ts`
- [ ] [P0] Create `lib/syncQueue.ts`
- [ ] [P0] Update `GameContext` to invoke sync after each commit when `!auth.currentUser?.isAnonymous`
- [ ] [P0] Add `MERGE_FROM_SERVER` action to `gameReducer.ts` + tests
- [ ] [P0] On sign-in, dispatch `MERGE_FROM_SERVER` after reading Firestore stats
- [ ] [P0] Migrate `friendInteractions` to `users/{uid}/friendInteractions/*` subcollection
- [ ] [P0] Update `app/(tabs)/friends.tsx` to read from subcollection `onSnapshot` for permanent users
- [ ] [P0] Update `firestore.rules` for `users/{uid}/**`
- [ ] [P1] Add security-rules test suite (`@firebase/rules-unit-testing`) verifying cross-user denial
- [ ] [P1] Add `seen` sync to `users/{uid}/meta/seen`

### Verify
- [ ] [P0] All Phase 4 tests pass
- [ ] [P0] Sign in on emulator, play a game, confirm `users/{uid}/meta/stats` doc in Emulator UI
- [ ] [P0] Two-device manual test: same account on two simulators, play on A, stats appear on B after force-refresh
- [ ] [P0] Anonymous user sees "Sign in to save progress" banner; no Firestore write fires

---

## Phase 5 — Cross-device E2E Flow

> Depends on Phases 1 + 3.

- [ ] [P0] Create `e2e/maestro/flows/sender.yaml` — sign in as userA, play lede, send challenge, write token to `/tmp/noodle-e2e/token.txt`
- [ ] [P0] Create `e2e/maestro/flows/responder.yaml` — sign in as userB, open deep link, respond to challenge
- [ ] [P0] Create `e2e/maestro/flows/friends-feed-update.yaml` — re-foreground userA app, assert `challenge_accepted` row
- [ ] [P0] Create `e2e/scripts/run-cross-device.sh` — orchestrates two simulators sequentially
- [ ] [P0] Add npm script `e2e:cross-device`
- [ ] [P0] Implement filesystem token handoff under `/tmp/noodle-e2e/`
- [ ] [P0] Add `xcrun simctl openurl` deep-link step in responder flow
- [ ] [P1] Add help-link variant: `e2e/maestro/flows/help-sender.yaml` + `help-responder.yaml`
- [ ] [P1] Add nightly CI job for `e2e:cross-device` on macOS runner

### Verify
- [ ] [P0] `npm run e2e:cross-device` exits 0 locally
- [ ] [P0] Friends feed assertion confirms `challenge_accepted` row appears on sender device
- [ ] [P0] Flow is deterministic across three back-to-back runs

---

## Cross-cutting tasks

- [ ] [P1] Code review via **code-reviewer** agent after each phase
- [ ] [P1] Security review via **security-reviewer** agent before any prod deploy (covers auth screens, rules updates, content writes)
- [ ] [P1] Update `README.md` with new scripts (`seed:emulator`, `e2e:*`)
- [ ] [P2] Add `firestore.indexes.json` entries if any new compound queries are introduced
- [ ] [P2] Update architecture docs with auth + content + stats flow diagrams
