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

- AC1.10 After successful account creation, a verification email is automatically sent to the user's address. The sign-up screen transitions to a themed confirmation state showing: preheader "One more step", title "Check your inbox", the destination email address, and instructions to tap the link then sign in. The confirmation provides:
  - **"Back to Home"** (always shown) → navigates to the home tab via `router.replace('/')`. Predictable destination that does not depend on stack history.
  - **"Back to Answers"** (only when sign-up was entered with `from=reveal`) → calls `router.back()` to return the user to the help/challenge reveal panel they came from. The originating screen's local state (phase='reveal', helpRespondResult, challengeComparison) is preserved by the navigation stack.
  - **"Resend email"** (always shown).

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

## 6. Help Flow UX (post-share confirmation, home result card, friend feed enrichment)

### 6.1 User stories
- As an asker, after I copy or share the help link and dismiss the share sheet, I want a clear confirmation that I'll be notified when my friend answers — not a silent return to the game.
- As an asker, I want to land back on the home screen after acknowledging the confirmation, not on the game I was playing.
- As an asker, when my friend has answered, I want to see a card on the home screen showing what they picked and whether they got it right — and I want to dismiss it when I'm done.
- As an asker, I want my Friends feed to show the same enriched detail (friend's pick + right/wrong) for the help interactions, not just "[Friend] helped you with The Lede".

### 6.2 Acceptance criteria
- AC6.1 The "Ask a Friend for Help" share modal's **Close** button dismisses the share modal and immediately opens a themed **Help Sent** confirmation modal. Title: "Link sent". Body: "We'll let you know when your friend answers." Single primary action: "Got it".
- AC6.2 Tapping **Got it** on the Help Sent modal calls `router.replace('/')`, returning the asker to the home tab. The originating game screen is unmounted.
- AC6.3 The Help Sent modal also appears after the **Share with a Friend** flow returns control to the app, immediately after the share sheet is dismissed (sender does not have to also tap Close). _Out of scope for v5 if not trivial — minimum bar is AC6.1/AC6.2._
- AC6.4 When a `received_help` friend interaction is in state and `homeCardDismissed` is not true, the home screen renders one **Help Result Card** per interaction directly above "Today's Games", newest first. Each card shows: friend name, game title, the answer the friend picked (formatted per-game, e.g., panelist name for Lede, "Claim 2" for SoF, "37%" for Wave), and a ✓ Correct / ✗ Wrong tag (omitted for Quip).
- AC6.5 The Help Result Card has a small **×** button in the top-right that dispatches `DISMISS_HELP_CARD` for that token, which sets `homeCardDismissed = true` on the matching interaction. Dismissed cards do not reappear after reload.
- AC6.6 The Friends tab `received_help` row is enriched to show the friend's pick and the same ✓/✗ tag, so the activity log matches what was on the home card before dismissal.
- AC6.7 The Firestore `helpRequests/{token}` and `challenges/{token}` `onSnapshot` subscriptions live in `GameProvider` (not in the Friends tab). Help and challenge resolutions are recorded as friend interactions whether or not the user has opened the Friends tab in the current session.
- AC6.8 Right/wrong evaluation runs locally on the asker's device using the cached `banks` from `ContentContext`. The pure helper `evaluateHelperAnswer(gameId, questionIndex, helperAnswer, banks)` returns `{ correct: boolean | null, label: string, questionText: string, correctLabel: string | null }` where `correct === null` for Quip or when the bank entry is missing, and `correctLabel === null` for Quip (no objective answer).
- AC6.9 The Help Result Card displays the question prompt the friend saw (lede partial headline, spread question, sof topic, wave story, quip setup) and a "**Correct answer**" row alongside "**They picked**". The Correct answer row is hidden for Quip.
- AC6.10 The home screen validates each non-dismissed `received_help` interaction against Firestore by reading `helpRequests/{token}` once on mount. A card only renders when the doc exists and has `resolvedAt` set. Orphaned local interactions (e.g., from a wiped emulator) are removed from state via `REMOVE_FRIEND_INTERACTION`.

- AC6.11 The same "Friend Replies" surface on the home screen also renders a card per non-dismissed `challenge_accepted` interaction. The card shows: friend name, game title, question prompt, the answer the friend picked + a ✓ Correct / ✗ Wrong tag (where determinable from the bank), the correct answer, and the asker's original prediction with a ✓ "You called it" / ✗ "Off this time" tag based on `senderPrediction === friendAnswer`. The × dismiss flag uses the same `homeCardDismissed` mechanism as help cards.
- AC6.12 The home screen validates each non-dismissed `challenge_accepted` interaction against Firestore by reading `challenges/{token}` once on mount. A card only renders when the doc exists and has `resolvedAt` set. Orphans are removed from state via `REMOVE_FRIEND_INTERACTION`.
- AC6.13 The single `DISMISS_HELP_CARD` reducer action (kept under that name for compatibility) flags `homeCardDismissed = true` on any matching interaction whose `type` is either `received_help` OR `challenge_accepted` and whose `token` matches. The exposed `useGame()` method `dismissHelpCard(token)` works for both card types.

### 6.3 Out of scope (v5)
- Push notification when the friend's answer arrives (existing push pipeline already handles this for challenge responses; reusing it for help is a separate task).
- Animated entry/exit for the Help Result Card.
- Persisting `homeCardDismissed` to Firestore for signed-in users (local-only is sufficient — last-write-wins per device matches the existing friendInteraction sync model).
- Garbage-collecting orphaned `received_help` interactions from local state (AC6.10 hides the card; the underlying interaction is left untouched).

---

## 7. Streak Shields

### 7.1 User stories
- As a player, I want to earn streak shields by helping my friends — so being helpful directly protects my own progress.
- As a player who's been on a streak, I don't want one missed day to wipe out a long streak as long as I have a shield.
- As a new user, I want the rules to be obvious from the UI — not "you both earn a shield" copy that doesn't reflect reality.

### 7.2 Rules
- A user has 0 or more shields available — there is **no cap**. Each qualifying action earns one shield, and the counter grows indefinitely. Shields are only spent on missed-day streak protection (one shield per missed day).
- Shields are earned in local state by **any** user (signed-in or anonymous) on a qualifying action. The `EARN_SHIELD` reducer action dispatches identically regardless of auth.
- An **anonymous** earner is shown an upsell banner ("Sign up to keep your shield") because their shield only persists if they upgrade to a permanent account via `linkWithCredential` (which preserves the uid and therefore local state). If they instead sign **in** to a different existing account, the local anonymous shield is lost when `MERGE_FROM_SERVER` chooses server stats over local.
- A shield is earned when the signed-in user successfully:
  - **Answers another user's help request** (`respondToHelp` resolves), OR
  - **Answers a challenge sent by another user** (`respondToChallenge` resolves).
- Opening a help or challenge link without answering does NOT earn a shield (and does NOT record an interaction).
- If the user misses a day AND has at least 1 shield available AND a shield hasn't already been used today, the system consumes 1 shield and preserves the streak. The streak does NOT increment for the missed day.
- If the user misses a day with no shields available, the streak resets to 1 on the next play.

### 7.3 Acceptance criteria
- AC7.1 On successful `respondToHelp` resolution (any user — signed-in or anonymous), the app dispatches `EARN_SHIELD` (incrementing `streakShieldsAvailable` with no upper bound) and records a `gave_help` `FriendInteraction` with `shieldEarned: true`. Both happen fire-and-forget; failures do not block the "Help Sent" UI.
- AC7.2 The `gave_help` `FriendInteraction` is recorded **only** when `respondToHelp` succeeds — not when the helper merely opens the help link. (The pre-existing add in `app/games/help/[token].tsx` is removed.)
- AC7.3 The Friends tab shows a "🛡 Shield earned" badge on every `gave_help` or `received_challenge` row where `shieldEarned === true`.
- AC7.4 The Friends tab shield explainer reads: **"Help a friend or take their challenge to earn a shield. Each shield protects your streak for one missed day."**
- AC7.5 The Friends tab empty state reads: **"Tap _Ask a Friend for Help_ the next time you're stuck — they'll see just the question, no answers. Help a friend back, or take a challenge they send, to earn yourself a streak shield."**
- AC7.6 Immediately after a shield-earning event (`respondToHelp` or `respondToChallenge` success — any user) and before the helper navigates back, a brief themed toast appears with the text **"🛡 Shield earned"**. Auto-dismisses after ~2s. Does not block the back-to-games CTA.
- AC7.7 The home screen stats card labels the streak counter **"Day Streak"** (not "Streak") so the unit is unambiguous to new users.
- AC7.8 On successful `respondToChallenge` resolution (any user), the app dispatches `EARN_SHIELD` and records a `received_challenge` `FriendInteraction` with `shieldEarned: true`. The pre-existing `received_challenge` add in `app/games/challenge/[token].tsx` (which fired on link open) is removed; the interaction is recorded only on successful answer.
- AC7.9 In addition to the toast, an **anonymous** earner sees a themed **Shield Sign-Up Banner** on the result screen with: heading "🛡 Sign up to keep your shield", body explaining the shield was earned but won't survive sign-out or signing in to a different account, and three actions — "Create Account" (→ `/auth/sign-up`, which uses `linkWithCredential` to **preserve the uid and the earned shield**), "Sign In" (→ `/auth/sign-in`, which **may discard the shield** if a different account's server stats win the merge), and "Maybe Later" (dismisses the banner). The banner is independent of the existing `ChallengeSignUpBanner` ("Challenge them back") which continues to render in challenge mode for anonymous responders.
- AC7.10 The Friends tab shield card replaces the previous fixed three-slot grid with a single counter that scales: large "🛡 N" value with a "shield" / "shields" label below (singular when N=1). When N=0, it reads "No shields yet" with the explainer text underneath. Counter is unbounded.
- AC7.11 The `Masthead` (page header) displays "🛡 N" alongside the existing "🔥 streak" when `streakShieldsAvailable > 0`. The bare 🛡 icon (no count) is replaced with the actual count.
- AC7.12 When `isAnonymous` transitions from `true` → `false` (anon → permanent via `linkWithCredential`, uid preserved), any `friendInteractions` already in local state that are NOT yet in `users/{uid}/friendInteractions` are written to Firestore (one `setDoc` per item, fire-and-forget). The signed-in load merges local + server interactions by `id` (server wins on collision) instead of wholesale-replacing local with server. This guarantees that a `gave_help` (or `received_challenge`) earned during the anon session survives the upgrade and is visible on the Friends tab and persisted across devices.
- AC7.13 **Navigation semantics for "Back to Home" / "Back to Answers".** Two distinct CTAs with predictable destinations:
  - **"Back to Home"** = `router.replace('/')`. Always-visible primary CTA at the bottom of every reveal-state screen (challenge reveal, help reveal, regular reveal). Replaces the previous "Back to Games" labels.
  - **"Back to Answers"** = `router.back()`. Conditional CTA shown only on auth screens (sign-up verify state, sign-in) when those screens were entered with `from=reveal`. Returns the user to the reveal panel they came from with its preserved local state.
  - All entry points from a reveal panel that navigate to auth (`ChallengeSignUpBanner`, `ShieldSignUpBanner`) MUST thread `params: { from: 'reveal' }` so the auth screen renders both CTAs. Auth flows entered from anywhere else (Profile, AuthGate modal) render only "Back to Home".

### 7.4 Out of scope (v5)
- Migrating an anonymous user's local shields into a different existing account on sign-in. If the user signs in (rather than signs up), `MERGE_FROM_SERVER` may discard the locally-earned shield in favor of server stats. The banner makes this trade-off explicit by preferring "Create Account" first.
- "Streak saved!" celebration banner on home when a shield was just consumed (separate phase — also requires fixing the `streakShieldUsedToday` flag persistence bug in `UPDATE_DAILY_STREAK`).
- Daily push reminders to play.
- Animated counters or shield-fill animation.
- Earning shields via any path other than answering a help request or a challenge (e.g., perfect-streak bonus, weekly play).

---

## 7.5 Hardening & maintenance

### 7.5.1 User stories
- As a user signing into prod, my brand-new account starts with 0 streak and 0 friend activity — never anything from a previous emulator session on the same device.
- As a user opening the app on a cold start, I do not see a "permission denied" warning while Firebase auth is still resolving.

### 7.5.2 Acceptance criteria

- AC8.1 The local AsyncStorage cache (`daily_state_v9`) is tagged with `ownerUid`. On load, cache is applied only when `ownerUid === auth.currentUser.uid`. Untagged legacy cache and mismatched-uid cache are discarded. Mid-session uid changes (sign-out → sign-in as a different account) reset in-memory state.
- AC8.2 `ContentProvider` does not invoke `findActive()` (Firestore read) until `useAuth()` returns a non-null `user`. While auth is pending, the app serves cached or bundled fallback content. Once auth resolves, the background refresh runs as before. No `Missing or insufficient permissions` warning is logged on cold start under normal sign-in.
- AC8.3 `signUp` derives the post-mutation user from the resolved `UserCredential.user` returned by `linkWithCredential` and `createUserWithEmailAndPassword`. It does not re-read `auth.currentUser` between the await boundary and `updateProfile`/`sendEmailVerification`.
- AC8.4 The Profile tab exposes a debug "Clear local data" button only when `__DEV__ === true`. The button calls `AsyncStorage.clear()` then `signOutAndGoAnonymous()`. Metro tree-shakes the conditional in production bundles, so the button does not ship in release builds (TestFlight, App Store, EAS prod profile).
- AC8.5 The Cloud Functions runtime targets Node 22 (`functions/package.json` `engines.node === "22"`). The deployed runtime matches local declaration; the Node 20 deprecation warning is gone from `firebase deploy` output.
- AC8.6 The Cloud Functions devDeps stay current within the v6 line: `@types/node ^22`, `firebase-functions ^6` (latest minor). Major bumps (`firebase-functions` v7) are tracked separately because they introduce breaking API changes.

### 7.5.3 Out of scope (v5)
- `firebase-functions` v7 (major upgrade) — own session
- Migrating away from `daily_state_v9` global key to per-uid storage keys (the uid-tag approach is sufficient for v5 isolation; per-uid keys are a v6 concern if multi-account-on-device becomes a real use case)
- Retiring the debug "Clear local data" button — currently strips from release builds via `__DEV__`

---

## 8. Architecture Decisions Summary

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

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `linkWithCredential` fails mid-upgrade | Wrap in try/catch; retain anonymous session and show retry CTA |
| Content document exceeds 1 MB Firestore limit | Monitor doc size in seed script; split per-game at 700 KB |
| Stats outbox grows unbounded (extended offline) | Cap at 50 entries; drop oldest on overflow |
| Maestro flaky on simulator boot | Add `retry: 2` in CI; use `extendedWaitUntil` in flows |
| Two-device E2E port/simulator conflicts | Use unique simulator UDIDs; verify both healthy before flow start |
| Local cache from prior identity leaks into a new sign-in on the same device | Cache tagged with `ownerUid`; load discards mismatched or untagged blobs (§7.5.2 AC8.1) |
| Cold-start Firestore read fires before auth resolves → permission-denied noise | `ContentProvider` gates `findActive()` on `useAuth()` (§7.5.2 AC8.2) |
| Node 20 runtime deprecation 2026-04-30 / decommission 2026-10-30 | Functions on Node 22; `@types/node`+`firebase-functions` kept current within v6 (§7.5.2 AC8.5–8.6) |

---

## 10. Success Criteria

- [ ] Anonymous user can upgrade to permanent without losing stats
- [ ] Stats survive uninstall on a permanent account
- [ ] Game content updates without an app release
- [ ] Single-device E2E smoke runs in CI on every PR
- [ ] Cross-device E2E runs nightly and passes
- [ ] All five interaction types verified end-to-end
- [ ] No regression in 100 existing app unit tests + 56 function tests
- [ ] Coverage maintained: 80%+ lines/branches for new code
- [x] Identity-boundary regression covered by tests: cross-uid cache leak, untagged cache, ContentContext auth race (271 app tests + 59 function tests, 0 failing)
