# Noodle Bowl — PRD alpha-v1.0.0

**Status:** In progress
**Last updated:** 2026-05-29
**App Store version:** 1.1.0 (internal name alpha-v1.0.0; App Store uses 1.x.x to stay consistent with build history)
**What's new:** Push notifications (transactional + weekly); App Store public release.

---

## Overview

alpha-v1.0.0 completes the first public App Store release. It carries forward all shipped work from alpha-v0.3.0 and adds the one missing layer: **push notifications** that close the loop on the social flows.

| Track | Goal | Status |
|---|---|---|
| **Streak & shield onboarding** | Seven education surfaces, ShieldIcon, data model | ✅ Shipped (alpha-v0.3.0) |
| **Landing screen privacy** | Remove question number from help/challenge screens | ✅ Shipped (alpha-v0.3.0) |
| **Push notifications** | Transactional (challenge/help response) + weekly (new content) | 🔲 New in v1.0.0 |
| **App Store submission** | Listing, screenshots, review | 🔲 New in v1.0.0 |

---

## 1. Streak & Shield Onboarding ✅

Fully implemented. See archived `noodle-bowl-prd-alpha-v0.3.0.md` §1 for the full spec.

Shipped surfaces:
- **1a** Streak ignition modal — first-ever game completion
- **1b** Shield primer modal — first ask-a-friend / challenge tap
- **1c** First shield earned modal — 0→1 transition
- **1d** Shield saved your streak modal — first shield-save event
- **1e** Streak at-risk inline banner — Sat/Sun, streak ≥ 2, not played this week
- **1f** Stats tab — shield slot row + last-6-weeks chain
- **1g** Friends tab — slot UI + how-it-works
- **1h** Tappable masthead chip + tooltip
- **1i** ShieldIcon SVG component (filled / outline / gold)
- **1j** Data model — `OnboardingFlags`, `recentPlayedWeeks`, `shieldSaveWeeks`

---

## 2. Landing Screen Privacy ✅

Fully implemented. Help and challenge landing screens no longer show a question number.

---

## 3. Push Notifications 🔲

### Background

The challenge and help flows are fully async but currently have no closure signal. After sharing a link, the sender has no idea whether or when their friend responded. Notifications close that loop — they are the primary reason the social mechanic feels alive rather than transient.

The push token infrastructure is already in place (`pushTokens/{uid}` Firestore collection, `lib/pushTokens.ts`). What's missing is (a) a contextual permission request, (b) the server-side send logic in the relevant Cloud Functions, and (c) a scheduled function for the weekly drop.

### Scope

| Notification | Trigger | Sender | Feasibility |
|---|---|---|---|
| Challenge responded | Recipient answers challenge | Cloud Function `challengeRespond` → notify original sender | ✅ In scope — senderUid known at creation |
| Help received | Friend answers help request | Cloud Function `helpRespond` → notify original asker | ✅ In scope — askerUid known at creation |
| New week's games ready | Monday 8 AM (device timezone not feasible at scale — send 10 AM ET) | Scheduled Cloud Function | ✅ In scope |
| Streak at risk | Sat/Sun, streak ≥ 2, not played this week | Scheduled Cloud Function | ❌ Deferred — requires queryable per-user stats not yet in Firestore |
| Friend challenged you | Challenge link created | — | ❌ Deferred — recipientUid unknown until link tapped |
| Friend asked for help | Help link created | — | ❌ Deferred — helperUid unknown until link tapped |

### 3a. Permission request

**When:** Contextual — triggered the first time the user completes a challenge or help interaction (i.e., after they have first-hand evidence that the social loop exists), not on cold launch.

**Specifically:** After the **ShieldPrimerModal** primary CTA is tapped (the moment they've just chosen to engage socially), show a permissions rationale screen / system prompt.

**Alternatively (simpler):** Request on the first `handleShieldEarned()` call — the user just got a shield, contextually explaining "get notified when friends respond."

**Rationale copy:**
- Title: `"Stay in the loop"`
- Body: `"We'll let you know when a friend answers your question or responds to your challenge."`
- Primary: `"Allow"`
- Secondary: `"Not now"` (skippable — no re-prompt within the same session)

**Acceptance criteria:**
- [ ] Permission is NOT requested on app launch or anonymous auth resolution
- [ ] Permission is requested at most once per session if denied
- [ ] Token is registered and written to `pushTokens/{uid}` when granted
- [ ] `isExpoGo` guard preserved — no registration in Expo Go builds
- [ ] Token cached in module-level `cachedToken` for the session

### 3b. Foreground & background notification handler

**Client setup:**

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

Tapping a notification routes to the relevant screen via the `data` payload:

| `data.screen` value | Destination |
|---|---|
| `'home'` | Home tab |
| `'friends'` | Friends tab |
| `'stats'` | Stats tab |

Keep routing simple for v1.0.0 — no per-challenge deep link. Getting to the home tab is sufficient; the result will be visible there.

**Acceptance criteria:**
- [ ] Notifications display correctly when app is in foreground
- [ ] Tapping a notification from background / quit state opens the app and routes to the correct tab
- [ ] Handler set up in `app/_layout.tsx` on mount

### 3c. Challenge responded notification

**Where:** Cloud Function `challengeRespond.ts`

After a successful challenge response is written to Firestore, look up the sender's push token and send a notification.

**Payload:**

```json
{
  "to": "<senderPushToken>",
  "title": "Challenge answered",
  "body": "Someone answered your challenge. See how you compare.",
  "data": { "screen": "home" }
}
```

> Friend's name is not available in the function context without an additional Firestore read. Omit for v1.0.0 — generic copy is fine.

**Send via:** Direct POST to `https://exp.host/--/expoApi/v2/push/send` (no additional SDK needed in functions).

**Failure handling:** Wrap in try/catch. A failed notification send must never fail the challenge response write. Log the error; do not throw.

**Acceptance criteria:**
- [ ] Notification sent when `senderPushToken` is present on the challenge doc
- [ ] No error thrown when `senderPushToken` is null or absent
- [ ] Challenge response write succeeds regardless of notification outcome
- [ ] Unit test: sends correct payload when token present
- [ ] Unit test: skips gracefully when token null

### 3d. Help received notification

**Where:** Cloud Function `helpRespond.ts`

Identical pattern to §3c — look up `askerPushToken` on the help request doc and send after a successful response write.

**Payload:**

```json
{
  "to": "<askerPushToken>",
  "title": "Your friend helped you",
  "body": "Someone answered your question. See what they said.",
  "data": { "screen": "home" }
}
```

**Acceptance criteria:**
- [ ] Same criteria as §3c, applied to `helpRespond`

### 3e. New week notification (scheduled)

**Where:** New Cloud Function `sendWeeklyNotification.ts`

**Schedule:** Every Monday at 10:00 AM ET (`0 15 * * 1` in UTC).

**Logic:**
1. Fetch all documents from `pushTokens` collection
2. Batch into chunks of 100 (Expo push API limit)
3. POST each batch to `https://exp.host/--/expoApi/v2/push/send`

**Payload:**

```json
{
  "to": ["<token1>", "<token2>", ...],
  "title": "This week's games are ready",
  "body": "Three new rounds from this week's news. Don't break your streak.",
  "data": { "screen": "home" }
}
```

**Acceptance criteria:**
- [ ] Scheduled function runs every Monday 10 AM ET
- [ ] Sends to all tokens in `pushTokens` collection
- [ ] Batches correctly at 100 tokens per request
- [ ] Handles empty `pushTokens` collection gracefully (no error)
- [ ] Unit test: correct batch chunking
- [ ] Unit test: correct payload structure

---

## 4. Cross-cutting

- [ ] `npm test` — all passing (existing 461 + new notification tests)
- [ ] `cd functions && npm test` — functions tests passing
- [ ] `npx tsc --noEmit` — clean
- [ ] Code review (code-reviewer agent) — full diff
- [ ] Security review (security-reviewer agent) — push token storage, Expo API call from functions
- [ ] Smoke test — production build (see PRR §2)

---

## Open questions

| Q | Decision |
|---|---|
| Friend name in notification copy? | **Deferred.** Would require an extra Firestore read per notification send. Generic copy for v1.0.0. |
| Streak at-risk notification? | **Deferred.** Requires queryable per-user stats collection. Not in Firestore today. |
| Notification badge count? | **No.** `shouldSetBadge: false`. Keep it simple. |
| Unsubscribe / notification settings? | **No explicit settings screen v1.0.0.** iOS system settings sufficient. |
| expo-server-sdk in functions? | **No.** Direct HTTP POST to Expo API. Avoids adding a dependency for 3 API calls. |

---

## Out of scope (deferred)

- Streak at-risk notification (requires queryable per-user stats)
- Friend challenged you / friend asked for help (requires known recipient UID)
- Notification preferences screen
- Streak milestone celebrations (4 / 12 / 26 / 52 weeks)
- Engraved-monogram shield variant
- Shield primer re-promptable surface
- Cross-device dismissal race on onboarding flags
- Garbage-collect orphaned `received_help` interactions
- Animated entry/exit on Help Result / Challenge Reply cards
- Shield-fill animation
- Architecture docs
