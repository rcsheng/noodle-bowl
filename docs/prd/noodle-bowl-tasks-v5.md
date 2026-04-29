# Noodle Bowl v5 — Task List

Legend: `[P0]`=blocker, `[P1]`=needed for milestone, `[P2]`=nice to have

Phase order: **0 → (1 ∥ 2) → 3 → (4 ∥ 5) → 6**

---

## What's Next (snapshot — 2026-04-28)

**Phases shipped:** 1, 2, 4, 6, 7, 8. **All P0 manual smokes verified 2026-04-28** (Device A iPhone Expo Go + Device B Android emulator Pixel_9 against local Firebase emulator). See `docs/smoke-test/smoke-test-plan.md` for the canonical block-1–10 plan; Phase 6/7 ACs were verified ad hoc and are listed there as "Future blocks to add".
**Phases deferred:** 3 + 5 (Maestro / cross-device E2E — replaced by manual smoke per PRD §4.1).

### ~~Immediate (P0) — manual smoke before declaring Phase 6 done~~ ✅ ALL PASSED 2026-04-28
- [x] Sign in on iOS device → ask for help → Close share modal → confirm "Link sent" modal opens, "Got it" returns to home.
- [x] Have friend (or 2nd device) open the link, answer → asker's home shows enriched card with question, friend pick, correct answer, ✓/✗.
- [x] × dismiss the card → reload app → card stays dismissed.
- [x] Friends tab `received_help` row shows enriched detail (friend pick + ✓/✗).
- [x] AC6.10 sanity: wipe `helpRequests` collection in emulator UI → reload home → card disappears.

### Next sprint candidates (pick one)
- **A. Phase 0 hygiene** — small, low-risk, unblocks logging and CI plumbing:
  - `lib/logger.ts` + replace `console.log` (P2)
  - Add `firebase-tools` as devDependency (P1)
  - Already done: `zod` is installed and used in `lib/authApi.ts`
- **B. Phase 4 P1 finish-up** — closes Phase 4 fully:
  - `seen` sync to `users/{uid}/meta/seen` (P1)
  - ~~`@firebase/rules-unit-testing` security-rules suite (P1)~~ ✅ done 2026-04-28 (`npm run test:rules`)
- **C. Phase 6 follow-ups** — listed in §Phase 6 below.
- **D. Help-flow push notifications** — currently only challenge responses push. Hooking help responses into the same pipeline gives parity with challenges and removes the need for the user to open the app to see the home card.

### Permanently deferred unless re-prioritized
- Phase 3 (Maestro E2E framework) — see PRD §4.1
- Phase 5 (cross-device E2E flows) — see PRD §4.1
- AC6.3 (auto-open Help Sent modal on share-sheet dismiss) — needs platform-specific Share return handling

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

## Phase 3 — E2E Framework Setup ⏸ DEFERRED

> Replaced by manual two-device smoke testing per PRD §4.1. Re-open if/when a native dev build is available and a CI macOS runner is justified.

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

## Phase 4 — Stats Persistence to Firestore ✅ COMPLETE

> Depends on Phase 1.

### RED — write failing tests first
- [x] [P0] `lib/__tests__/statsRepo.test.ts` (emulator-driven)
- [x] [P0] `lib/__tests__/syncQueue.test.ts`
- [x] [P0] `context/__tests__/GameContext.merge.test.tsx`

### GREEN — implement
- [x] [P0] Create `lib/statsRepo.ts`
- [x] [P0] Create `lib/syncQueue.ts`
- [x] [P0] Update `GameContext` to invoke sync after each commit when `!auth.currentUser?.isAnonymous`
- [x] [P0] Add `MERGE_FROM_SERVER` action to `gameReducer.ts` + tests
- [x] [P0] On sign-in, dispatch `MERGE_FROM_SERVER` after reading Firestore stats
- [x] [P0] Migrate `friendInteractions` to `users/{uid}/friendInteractions/*` subcollection
- [x] [P0] Update `app/(tabs)/friends.tsx` to read from subcollection `onSnapshot` for permanent users
- [x] [P0] Update `firestore.rules` for `users/{uid}/**`
- [x] [P1] Add security-rules test suite (`@firebase/rules-unit-testing`) verifying cross-user denial — `__tests__/firestore-rules.test.ts` (34 tests, run via `npm run test:rules`)
- [ ] [P1] Add `seen` sync to `users/{uid}/meta/seen`

### Phase 4 bug fixes & additions (post-implementation)
- [x] Fix `senderName` bug: all 5 game screens now pass `user?.displayName ?? 'A Friend'` instead of `friendName` to `createChallenge()` (AC5.8)
- [x] Add self-challenge guard in `app/games/challenge/[token].tsx` — detects sender via `sent_challenge` token match, shows guard screen with Sign Out CTA, skips `received_challenge` interaction (AC5.7)
- [x] Add `ChallengeSignUpBanner` component — shown after anonymous user answers a challenge, prompts account creation with "Challenge [sender] back" CTA (AC1.11)
- [x] Add `ChallengeSignUpBanner` to all 5 game screens in the challenge comparison section

---

## Phase 5 — Cross-device E2E Flow ⏸ DEFERRED

> Replaced by manual two-device smoke testing per PRD §4.1. The acceptance criteria from the original §5 are validated by hand against `firebase emulators:start` + iPhone Expo Go + Android emulator.

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

## Phase 6 — Help Flow UX ✅ COMPLETE

> Independent of other phases. Implements PRD §6 (post-share confirmation, home result card, Friends feed enrichment).

### RED — write failing tests first
- [x] [P0] `lib/__tests__/helpAnswerEvaluator.test.ts` — 13 tests covering correctness for lede/spread/sof/wave/quip + missing-bank fallback
- [x] [P0] `context/__tests__/GameContext.reducer.test.ts` — 3 tests for `DISMISS_HELP_CARD` (matches token, leaves others alone, no-op on miss)
- [x] [P0] `components/__tests__/HelpSentModal.test.tsx` — renders title/body, dismiss callback fires
- [x] [P0] `components/__tests__/HelpResultCard.test.tsx` — renders fields, ✓/✗ tag visibility per `correct` value, dismiss callback fires

### GREEN — implement
- [x] [P0] `lib/helpAnswerEvaluator.ts` — `evaluateHelperAnswer(gameId, questionIndex, helperAnswer, banks): { correct: boolean | null, label: string }` (Quip + missing bank → null)
- [x] [P0] Extend `FriendInteraction` with optional `homeCardDismissed` flag
- [x] [P0] Add `DISMISS_HELP_CARD` action to `gameReducer.ts`
- [x] [P0] `components/HelpSentModal.tsx` — "Link sent / We'll let you know when your friend answers / Got it" (AC6.1)
- [x] [P0] `components/HelpResultCard.tsx` — friend name, game title, answer label, ✓/✗ tag, × dismiss (AC6.4, AC6.5)
- [x] [P0] Hoist `helpRequests`/`challenges` `onSnapshot` listeners from `app/(tabs)/friends.tsx` into `context/GameContext.tsx` `GameProvider` (AC6.7)
- [x] [P0] Expose `dismissHelpCard(token)` from `useGame()`; signed-in users mirror dismiss to Firestore
- [x] [P0] Wire `HelpSentModal` into all 5 game screens — share modal "Close" → confirmation modal → `Got it` → `router.replace('/')` (AC6.1, AC6.2)
- [x] [P0] Render "Friend Replies" section above Today's Games on `app/(tabs)/index.tsx` for non-dismissed `received_help` interactions
- [x] [P0] Update `received_help` row in `app/(tabs)/friends.tsx` to show friend's pick + ✓/✗ via `evaluateHelperAnswer` (AC6.6)
- [ ] [P1] AC6.3 — auto-open `HelpSentModal` on share-sheet dismiss (not just on Close tap). Deferred — needs platform-specific Share return handling.

### Phase 6 enrichment (post-feedback, AC6.9 + AC6.10)
- [x] [P0] Extend `evaluateHelperAnswer` to return `questionText` and `correctLabel`; update tests
- [x] [P0] `HelpResultCard` renders the question prompt + "Correct answer" row; ✓/✗ tag positioned below (AC6.9)
- [x] [P0] Home screen validates each candidate card against `helpRequests/{token}` via `getDoc`; orphans render no card (AC6.10)

### Phase 6 challenge replies on home (AC6.11–AC6.13)
- [x] [P0] Generalize `DISMISS_HELP_CARD` reducer to flag `homeCardDismissed` for `received_help` OR `challenge_accepted`; update tests
- [x] [P0] `dismissHelpCard()` finds + Firestore-mirrors either type
- [x] [P0] New `components/ChallengeReplyCard.tsx` with friend pick + correct answer + your prediction + dual ✓/✗ tags + × dismiss
- [x] [P0] Home screen validates `challenge_accepted` candidates against `challenges/{token}` via `getDoc`; orphans GC'd via `removeFriendInteraction`
- [x] [P0] Home screen renders challenge reply cards above help reply cards in the "Friend Replies" section
- [x] [P0] Manual smoke (AC6.11): friend answers a challenge → asker's home shows challenge reply card with their pick, correct answer, and prediction comparison; × dismisses; reload → stays dismissed

### Verify
- [x] [P0] All Phase 6 tests pass (+24 new tests across evaluator, reducer, modal, card)
- [x] [P0] Full suite: 214 passing (4 pre-existing `authApi` failures unrelated)
- [x] [P0] No new TypeScript errors in changed files
- [x] [P0] Manual smoke: anon user blocked at "Stuck? Ask a Friend" → AuthGate (existing); signed-in user shares link → Close → "Link sent" modal → Got it → home screen
- [x] [P0] Manual smoke: friend answers help → home shows result card with question, their pick, correct answer, ✓/✗; × dismisses; reload → stays dismissed
- [x] [P0] Manual smoke: Friends tab shows enriched `received_help` row
- [x] [P0] Manual smoke (AC6.10): wipe `helpRequests` in Emulator UI → reload home → orphan card disappears

### Phase 6 follow-ups (open work)
- [ ] [P1] Push notification on help response (parity with challenge response push) — would let the home card appear without manual app reopen
- [ ] [P1] Garbage-collect orphaned local `received_help` interactions after N days when AC6.10 validation fails
- [ ] [P2] Animated entry/exit for the Help Result Card
- [ ] [P2] Persist `homeCardDismissed` to Firestore so dismissals survive across devices for signed-in users

---

## Phase 7 — Streak Shields ✅ COMPLETE

> Implements PRD §7. Helper earns +1 shield on successful `respondToHelp`; streak-saving shield consumption already wired in reducer.

### RED — write failing tests first
- [x] [P0] `context/__tests__/GameContext.reducer.test.ts` — confirm existing `EARN_SHIELD` action increments capped at 3 (already covered, re-verified)
- [x] [P0] `components/__tests__/ShieldEarnedToast.test.tsx` — renders text, calls onHide after timeout

### GREEN — implement
- [x] [P0] Remove early `addFriendInteraction({ type: 'gave_help', shieldEarned: false })` from `app/games/help/[token].tsx` (AC7.2)
- [x] [P0] In each game's `handleLockIn`, after `respondToHelp` resolves: dispatch `addFriendInteraction({ type: 'gave_help', shieldEarned: true, ... })` and call `earnStreakShield()` (AC7.1, AC7.3)
- [x] [P0] `components/ShieldEarnedToast.tsx` — themed mini-toast, auto-dismiss after ~2s (AC7.6)
- [x] [P0] Wire `ShieldEarnedToast` into all 5 game screens; show briefly after `respondToHelp` succeeds in help mode
- [x] [P0] Friends tab shield explainer copy → "Help a friend to earn a shield. Each shield protects your streak for one missed day." (AC7.4)
- [x] [P0] Friends tab empty state copy → drops "you both earn"; uses single-sided "Help a friend back to earn yourself a streak shield." (AC7.5)
- [x] [P0] Home stats label → "Day Streak" instead of "Streak" (AC7.7)

### Verify
- [x] [P0] All Phase 7 tests pass; full suite green (4 pre-existing `authApi` failures unrelated)
- [x] [P0] Manual smoke (AC7.1–AC7.3, AC7.6): from a second device, open a help link the asker sent → answer the question on the helper side → confirm the helper sees the "🛡 Shield earned" toast → navigate to Friends tab → shield slot count increased by 1 (capped at 3) → `gave_help` row shows "🛡 Shield earned" badge.
- [x] [P0] Manual smoke (AC7.2): open a help link, then back out without answering → no `gave_help` interaction recorded, no shield earned.
- [x] [P0] Manual smoke (AC7.4–AC7.5, AC7.7): home Stats label reads "Day Streak"; Friends shield explainer + empty state read the new copy.

### Phase 7.5 — Sign-in gating + challenge earning + anon banner (post-feedback)
- [x] [P0] Revise PRD AC7.1 to gate shield earn on `!isAnonymous`; add AC7.8 (challenge response earns) and AC7.9 (anon banner)
- [x] [P0] New `components/ShieldSignUpBanner.tsx` + tests — "🛡 Sign up to keep your shield" with Create Account / Sign In / Maybe Later
- [x] [P0] Remove early `received_challenge` add from `app/games/challenge/[token].tsx`; move to post-respond in each game (AC7.8)
- [x] [P0] In each game's `handleLockIn`, gate `addFriendInteraction({shieldEarned: ...})` + `earnStreakShield()` + toast on `!isAnonymous` for both help and challenge response paths
- [x] [P0] Render `ShieldSignUpBanner` for anonymous responders in help reveal AND challenge reveal (alongside existing `ChallengeSignUpBanner` in challenge mode per AC1.11)
- [x] [P0] Friends tab shield explainer copy → "Help a friend or take their challenge to earn a shield..." (AC7.4)
- [x] [P0] Friends tab empty state copy → adds "or take a challenge they send" (AC7.5)
- [x] [P0] Manual smoke (AC7.1, AC7.6): signed-in helper answers help → "🛡 Shield earned" toast → shield count increments
- [x] [P0] Manual smoke (AC7.8): signed-in user answers a challenge they received → toast → shield count increments → Friends feed shows `received_challenge` row with shield badge
- [x] [P0] Manual smoke (AC7.9): anonymous user answers help OR challenge → no toast, no shield grant, ShieldSignUpBanner appears with three CTAs

### Phase 7.6 — Remove shield cap, switch Friends UI to counter (AC7.1 revised + AC7.10)
- [x] [P0] PRD §7.2 + AC7.1: shields no longer capped at 3
- [x] [P0] Replace `Math.min(..., 3)` in `EARN_SHIELD` reducer with simple increment
- [x] [P0] Update reducer test "caps at 3" → "no cap, increments past 3"
- [x] [P0] Friends tab: replace fixed 3-slot grid with a single counter "🛡 N" (singular/plural label, "No shields yet" at zero) per AC7.10

### Phase 7.8 — Shield count in header + anon→signup interactions migration (AC7.11, AC7.12)
- [x] [P0] Update `components/Masthead.tsx` to render "🛡 N" instead of bare "🛡" (AC7.11)
- [x] [P0] Replace `SET_FRIEND_INTERACTIONS` wholesale-replace with merge + Firestore write for local-only items (AC7.12)
- [x] [P0] RED: test in `GameContext.test.tsx` that local-only interactions are setDoc'd on first signed-in load AND retained in merged state
- [x] [P0] Manual smoke (AC7.11): home screen with 0 shields → no 🛡 in masthead; with N>0 shields → "🛡 N" appears
- [x] [P0] Manual smoke (AC7.12): anonymous user answers a help link → ShieldSignUpBanner → Create Account → Friends tab now shows the `gave_help` row that was earned during the anon session (and persists after reload — it was synced to Firestore)

### Phase 7.9 — Navigation semantics: "Back to Home" vs "Back to Answers" (AC7.13, AC1.10 revised)
- [x] [P0] PRD: AC1.10 revised; AC7.13 (new) defines the two CTA labels + destinations
- [x] [P0] All 5 game screens — challenge/help reveal `Back to Games` → `Back to Home` with `router.replace('/')`
- [x] [P0] All 5 game screens — regular reveal `← Back to Games` link → `← Back to Home` with `router.replace('/')`
- [x] [P0] `ChallengeSignUpBanner` + `ShieldSignUpBanner` — when invoked from a reveal panel, callbacks navigate with `params: { from: 'reveal' }`
- [x] [P0] `app/auth/sign-up.tsx` verify screen — read `from` param; render `Back to Answers` (router.back) only when `from=reveal`; always render `Back to Home` (router.replace('/'))
- [x] [P0] `app/auth/sign-in.tsx` — same conditional pattern after successful sign-in
- [x] [P0] Tests: verify-screen renders correct CTAs under both `from=reveal` and `from=undefined`
- [x] [P0] Manual smoke (verify screen): anon user answers help → ShieldSignUpBanner → Create Account → fill form → success → see BOTH "Back to Answers" and "Back to Home" CTAs. Tap each and confirm destinations.
- [x] [P0] Manual smoke (Profile entry): tap Profile → Create Account → fill form → success → see ONLY "Back to Home" CTA.

### Phase 7.7 — Anonymous DOES earn shield locally (AC7.1 / AC7.6 / AC7.9 revised)
- [x] [P0] Drop `if (!isAnonymous)` gate in all 5 game screens — `earnStreakShield()` + toast + `shieldEarned: true` fire for any user
- [x] [P0] PRD §7 revised: anon earns locally; ShieldSignUpBanner reframed as "save your progress"; sign-in (vs sign-up) caveat documented
- [x] [P0] Manual smoke (anon → sign-up): anonymous user answers help → sees toast → ShieldSignUpBanner → taps Create Account → completes sign-up → Friends tab now shows the shield count carried over (`linkWithCredential` preserved local state)
- [x] [P0] Manual smoke (anon → sign-in to existing): same flow but tap Sign In and authenticate to a different account → existing account's stats win the merge; the just-earned anon shield is lost (acceptable per §7.4)

### Phase 7 follow-ups (future work)
- [ ] [P1] "Streak saved!" celebration banner on home when a shield was consumed (requires fixing `streakShieldUsedToday` flag persistence in `UPDATE_DAILY_STREAK` — currently it doesn't reset on normal continuation)
- [ ] [P2] Daily push reminder before streak rolls over
- [ ] [P2] Shield-fill animation when a shield is earned
- [ ] [P2] Retroactive shield credit when an anonymous user signs up shortly after seeing the ShieldSignUpBanner (currently out of scope per AC7.9)

---

## Phase 8 — Hardening & maintenance ✅ COMPLETE

> Post-prod-deploy cleanup. Identity-boundary safety, auth-race fix, dependency hygiene, and bringing the test suite to fully green.

### RED — write failing tests first
- [x] [P0] `context/__tests__/GameContext.test.tsx` — add 2 tests asserting cache from a different uid is discarded, and untagged legacy cache is discarded (AC8.1)
- [x] [P0] `context/__tests__/ContentContext.test.tsx` — new file. Assert `findActive` is NOT called while auth is loading or when no user is signed in; IS called once auth resolves with a user (AC8.2)
- [x] [P0] Re-confirm 4 pre-existing `authApi` test failures express the desired behavior (resolved `UserCredential.user` should drive `updateProfile` / `sendEmailVerification`); fix impl rather than tests (AC8.3)

### GREEN — implement
- [x] [P0] `context/GameContext.tsx` — uid-tagged cache (`ownerUid`) + `loadedForUidRef`; mismatched/untagged cache is discarded; mid-session uid change resets state (AC8.1)
- [x] [P0] `app/(tabs)/profile.tsx` — `__DEV__`-gated "Clear local data" debug button (AsyncStorage.clear + signOut). Metro tree-shakes from release bundles (AC8.4)
- [x] [P0] `lib/firebase.ts` — `EXPO_PUBLIC_USE_EMULATOR=false` opt-out so dev builds can target prod Firebase
- [x] [P0] `app/(tabs)/index.tsx` — streak displays `0` instead of `—` when zero (visual consistency)
- [x] [P0] `context/ContentContext.tsx` — gate Firestore `findActive()` on `useAuth()` resolution; falls through to cached/bundled while auth pending (AC8.2)
- [x] [P0] `lib/authApi.ts` — `signUp` reads from resolved `linkWithCredential` / `createUserWithEmailAndPassword` `UserCredential.user` instead of `auth.currentUser` (AC8.3)
- [x] [P0] `functions/package.json` — Node engine 20 → 22 (matches deprecation deadline 2026-04-30); deployed (AC8.5)
- [x] [P0] `functions/package.json` — `@types/node` 20 → 22, `firebase-functions` 6.5 → 6.6.0 (latest within v6); build clean, all 59 functions tests pass (AC8.6)

### Verify
- [x] [P0] Full suite: 271/271 passing (4 pre-existing `authApi` failures resolved + 3 new `ContentContext` tests added)
- [x] [P0] `cd functions && npm run build` clean
- [x] [P0] `cd functions && npm test` — 59/59 functions tests pass on new dep versions
- [x] [P0] Manual smoke: prod sign-up creates user with 0/0 streak (no leak from prior emulator session)
- [x] [P0] Manual smoke: cold start no longer logs `Missing or insufficient permissions` from ContentContext

### Phase 8 follow-ups (open work)
- [ ] [P1] `firebase-functions` v6 → v7 (major) — own session, breaking changes
- [ ] [P2] Remove debug "Clear local data" button before first TestFlight cut (or leave; it's already release-stripped via `__DEV__`)

---

## Cross-cutting tasks

- [ ] [P1] Code review via **code-reviewer** agent after each phase
- [ ] [P1] Security review via **security-reviewer** agent before any prod deploy (covers auth screens, rules updates, content writes)
- [ ] [P1] Update `README.md` with new scripts (`seed:emulator`, `e2e:*`)
- [ ] [P2] Add `firestore.indexes.json` entries if any new compound queries are introduced
- [ ] [P2] Update architecture docs with auth + content + stats flow diagrams
