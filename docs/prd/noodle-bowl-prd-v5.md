# Noodle Bowl — PRD v5

**Status:** Backend integration sprint
**Last updated:** April 2026
**Document version:** 5.0
**Changes from v4:** Real auth, server-backed game content, server-backed stats, cross-device E2E coverage.

---

## Overview

v4 hardened the frontend social loop. v5 makes Noodle Bowl a real multi-device product:
users have accounts, content updates without app releases, stats survive device wipes,
and challenge/help links are proven to work across devices via automated E2E tests.

---

## 1. Real Authentication

### 1.1 User stories
- As a new user, I open the app and start playing immediately without signing up.
- As a returning anonymous user, I see a "Save your progress" prompt that opens the sign-up screen.
- As a player who has been playing anonymously, I sign up with email and keep all my stats and streaks.
- As a returning user on a new device, I sign in with email and see my stats restored.
- As a signed-in user, I tap Profile → Sign Out and return to a fresh anonymous session.
- As a forgetful user, I tap "Forgot password" and receive a reset email.

### 1.2 Acceptance criteria
- AC1.1 First app launch creates an anonymous Firebase user; the app is fully playable.
- AC1.2 The Profile tab shows email + display name when signed in, "Anonymous" otherwise.
- AC1.3 Sign-up requires: email (RFC valid), password (>= 8 chars), display name (1–30 chars). All client-side validated via zod.
- AC1.4 Sign-up while anonymous calls `linkWithCredential` and preserves the uid. After sign-up, the user has the same uid and all prior stats are preserved.
- AC1.5 Sign-in screen authenticates an existing user and merges their stored stats with any local progress (see §3).
- AC1.6 Sign-out returns the user to a fresh anonymous session — never an empty unauth state.
- AC1.7 Failed auth surfaces a friendly message ("Email already in use", "Invalid password", etc.). Never leak Firebase error codes to UI.
- AC1.8 Auth state is available app-wide via `useAuth()`.

- AC1.9 Attempting to share a challenge or help link while anonymous (including after sign-out) shows an in-app themed modal (matching paper/ink aesthetic) with the title "Login to share with friends". The modal has three actions — "Sign In" (navigates to sign-in), "Create Account" (navigates to sign-up), and "Not Now" (dismisses). The challenge modal does NOT open. There is no "Members only" label or any language implying paid access. `isAnonymous` must be `true` immediately upon sign-out — not deferred to anonymous sign-in completion.

- AC1.10 After successful account creation, a verification email is automatically sent to the user's address. The sign-up screen transitions to a themed confirmation state showing: preheader "One more step", title "Check your inbox", the destination email address, and instructions to tap the link then sign in. The confirmation provides three actions: "Back to Games" (returns to game), "Sign in after verifying" (navigates to sign-in), and "Resend email" (resends the verification email).

- AC1.11 After an anonymous user answers a challenge sent by another player, the result screen shows a "Challenge [sender] back" sign-up banner below the comparison panel. The banner has a "Create Account" CTA (navigates to `/auth/sign-up`) and a "Maybe Later" option (dismisses the banner, leaving the "Back to Games" button visible). The banner does not appear for signed-in users.

### 1.3 Out of scope (v5)
- Apple/Google/Phone SSO
- Multi-factor auth
- Account deletion UI (Firebase admin only)
- Enforced email-verification gate (users can use the app without verifying)

---

## 2. Game Content from Firestore

### 2.1 User stories
- As a player, I get fresh questions when the team publishes a new content drop without updating the app.
- As an offline player, I can still play with the last cached content version.
- As a first-launch offline player, I can still play with the bundled fallback bank.

### 2.2 Acceptance criteria
- AC2.1 The active content version is fetched from `contentVersions` where `active == true` on app launch.
- AC2.2 Content is cached in AsyncStorage keyed by `versionId`. App reads cache instantly and revalidates in the background.
- AC2.3 If both cache and network fail, the app falls back to bundled `constants/data.ts`.
- AC2.4 When a new `versionId` is fetched, the user's `seen` arrays are cleared so they get fresh questions.
- AC2.5 The seed script `npm run seed:emulator` and `npm run seed:prod` write the current bundled banks to a new active version.
- AC2.6 Only one document in `contentVersions` may have `active == true` at any time (enforced by a transaction in the seed script).

### 2.3 Out of scope
- Admin UI for editing content
- A/B testing different content per user
- Per-user dynamic curation

---

## 3. User Stats Persisted to Firestore

### 3.1 User stories
- As a signed-in player, my stats survive an uninstall.
- As a signed-in player who plays on two devices, my points and streaks stay in sync within a few seconds.
- As an anonymous player opening the Stats or Friends tab, I see a themed sign-in prompt instead of empty data.
- As a signed-in player, my friend interactions (challenges sent/received, help sent/received) persist across devices and app reinstalls.

### 3.2 Acceptance criteria
- AC3.1 The Stats tab and Friends tab each render a full-screen themed auth gate ("Members only" / "Sign in to…") when `isAnonymous === true`. The gate offers "Sign In" and "Create Account" actions. Anonymous users cannot access these tabs' content.
- AC3.2 Permanent users: every reducer commit triggers a 1500ms-debounced fire-and-forget write to `users/{uid}/meta/stats`.
- AC3.3 No loading states block gameplay. Sync failures are queued in an outbox (max 50 entries) and retried on next successful write.
- AC3.4 On sign-in, the app reads server stats and merges:
  - Server wins when `server.lastPlayedDate >= local.lastPlayedDate`.
  - Local wins when `local.lastPlayedDate > server.lastPlayedDate` (offline-first).
  - `seen` arrays merge as a deduplicated union per game.
- AC3.5 Sign-out flushes any pending outbox writes before clearing local state.
- AC3.6 Firestore rules deny cross-user reads/writes (verified by emulator-driven security-rules tests).
- AC3.7 `friendInteractions` are persisted to `users/{uid}/friendInteractions/{id}` in Firestore for signed-in users. Each `addFriendInteraction` call triggers a fire-and-forget `setDoc` write. On sign-in, interactions are loaded from Firestore and replace local state (Firestore is authoritative for signed-in users).
- AC3.8 Firestore security rules for `users/{uid}`, `users/{uid}/friendInteractions/{id}`, and `users/{uid}/meta/{docId}` allow read/write only for the matching authenticated uid.

### 3.3 Out of scope
- Real-time stat sync via `onSnapshot` (polling on session start is sufficient)
- Conflict resolution UI ("two devices have different streaks") — last-write-wins per field
- friendInteractions deduplication across devices (last-write-wins per id)

---

## 4. Cross-device Smoke Testing

### 4.1 Decision

Automated Maestro E2E deferred. The Windows + Expo Go setup makes reliable cross-device automation impractical without a native dev build. Manual two-device smoke testing (Android emulator + iPhone via Expo Go, both hitting the local Firebase emulator) provides equivalent coverage at this stage.

### 4.2 Manual smoke checklist

Run after any change touching challenge, help, auth, or content flows:

- [ ] Both devices connected to the same `npx expo start` dev server
- [ ] Firebase emulator running (`npm run emulator`) and seeded (`npm run seed:emulator`)
- [ ] **Device A (iPhone):** sign in, play a game, tap Challenge → share link
- [ ] **Device B (Android):** open the deep link → correct game + question loads
- [ ] **Device B:** submit answer → challenge resolves
- [ ] **Device A:** Friends feed shows `challenge_accepted` row with Device B's answer
- [ ] Repeat above with Ask for Help flow

### 4.3 Out of scope (v5)
- Automated Maestro flows
- Cloud-hosted device farm (BrowserStack / Sauce / Firebase Test Lab)
- CI gating on E2E results

---

## 5. Cross-device Challenge/Help Link Acceptance (production behavior)

### 5.1 User stories
- As a user, I share a challenge link to a friend on a different phone, and the link opens the game directly in the Noodle Bowl app.
- As the sender, my Friends feed updates within seconds when my friend responds.
- As a sender who already generated a link for a question, tapping "Challenge" or "Ask for Help" again shows the same link instantly without an API call.
- As a receiver, I cannot replay a challenge I have already answered.

### 5.2 Acceptance criteria
- AC5.1 Universal links / app links resolve `https://noodlebowl.app/c/{token}` to the app on iOS and Android. (Wiring already in place; v5 verifies it via E2E.)
- AC5.2 The `challengeRespond` push notification fires within 2 seconds of the friend's response (already implemented; covered by E2E assertion).
- AC5.3 Anonymous responders can respond to challenges (auth required, but `signInAnonymously` is acceptable).
- AC5.4 Challenge and help link creation is idempotent per `(uid, gameId, questionIndex, day)`. If a link already exists for that tuple, the server returns the existing token and URL instead of an error. The client caches the URL locally and skips the API call on repeat opens within the same play session.
- AC5.5 Each help link is scoped to a specific question (`questionIndex`). A user may generate distinct links for different questions played in the same game on the same day.
- AC5.6 When a challenge has already been answered (`resolvedAt` is set), the `/c/{token}` screen shows a clear message ("This challenge has already been answered") rather than allowing re-play.

- AC5.7 When the challenge sender opens their own challenge link (same UID as the creator), a guard screen is shown: "You Created This Challenge" with a Sign Out CTA and a "Back to Games" link. The `received_challenge` interaction is not recorded. This is detected client-side by checking if the challenge token appears in the user's `sent_challenge` friend interactions.
- AC5.8 The `senderName` field stored in Firestore reflects the sender's Firebase Auth `displayName`, not the recipient's name typed in the challenge modal. The recipient's name is stored separately as `friendName` in the sender's friend interaction record.

### 5.3 Out of scope
- SMS / direct-share integrations
- Group challenges (>1 friend per challenge)

---

## 6. Architecture Decisions Summary

| Area | Decision |
|---|---|
| Auth | Firebase email/password + `linkWithCredential` for anon→permanent |
| E2E framework | Manual two-device smoke (Android emulator + iPhone Expo Go); Maestro deferred |
| Content shape | Single document per version, all banks inline, version pointer pattern |
| Stats sync | Direct client writes, debounced + outbox; AsyncStorage is UI source of truth |
| Cross-device test | Android emulator + iPhone Expo Go, shared local Firebase emulator |

### Auth detail
`signInAnonymously` stays as the default first-launch behavior. Upgrade calls `linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password))` which **preserves the same uid** — no migration needed for stats, challenges, or push tokens.

### Firestore schema

```
contentVersions/{versionId}
  versionId: string
  publishedAt: Timestamp
  active: boolean                     // exactly one active version at a time
  banks: { lede, spread, sof, quip, wave }   // arrays of items per §2

users/{uid}
  displayName: string
  email: string | null                // null for anonymous
  isAnonymous: boolean
  createdAt: Timestamp
  lastLoginAt: Timestamp

users/{uid}/meta/stats                // singleton document
  totalPoints, dailyStreak, bestDailyStreak, lastPlayedDate, totalDaysPlayed
  streakShieldsAvailable, streakShieldUsedToday
  lede, spread, sof, quip, wave: GameStats
  contentVersionId: string
  updatedAt: Timestamp

users/{uid}/meta/seen                 // singleton document
  lede, spread, sof, quip, wave: number[]
  updatedAt: Timestamp

users/{uid}/friendInteractions/{interactionId}
  type, friendName, gameId, questionIndex, date, shieldEarned
  token, senderPrediction, friendAnswer, bonusPointsEarned, createdAt

challenges/{token}                    // existing — unchanged
helpRequests/{token}                  // existing — unchanged
pushTokens/{uid}                      // existing — unchanged
```

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `linkWithCredential` fails mid-upgrade | Wrap in try/catch; retain anonymous session and show retry CTA |
| Content document exceeds 1 MB Firestore limit | Monitor doc size in seed script; split per-game at 700 KB |
| Stats outbox grows unbounded (extended offline) | Cap at 50 entries; drop oldest on overflow |
| Maestro flaky on simulator boot | Add `retry: 2` in CI; use `extendedWaitUntil` in flows |
| Two-device E2E port/simulator conflicts | Use unique simulator UDIDs; verify both healthy before flow start |

---

## 8. Success Criteria

- [ ] Anonymous user can upgrade to permanent without losing stats
- [ ] Stats survive uninstall on a permanent account
- [ ] Game content updates without an app release
- [ ] Single-device E2E smoke runs in CI on every PR
- [ ] Cross-device E2E runs nightly and passes
- [ ] All five interaction types verified end-to-end
- [ ] No regression in 100 existing app unit tests + 56 function tests
- [ ] Coverage maintained: 80%+ lines/branches for new code
