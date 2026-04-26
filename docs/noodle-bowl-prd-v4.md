# Noodle Bowl — Product Requirements Document

**Status:** Pre-backend readiness sprint
**Author:** Product team
**Last updated:** April 2026
**Document version:** 4.0
**Changes from v3:** Addresses frontend gaps identified before backend implementation — challenge URL encoding, missing interaction recording, friend identification, prediction reveal UI, game feature parity, hub played-today states, and data model hardening

---

## Changelog from v3

| Section | Change |
|---------|--------|
| §7 | Challenge URL must encode game, question, and prediction data — random stubs removed |
| §7 | All five interaction types must be recorded; only `sent_challenge` currently works |
| §7 | Friend name must be captured before sending a challenge — "A Friend" hardcode removed |
| §7 | Prediction reveal UI added to Friends feed — outcome of sent challenges now visible |
| §7 | `questionId` added to `FriendInteraction` — required for backend answer validation |
| §7 | `gave_help` interaction must be recorded when user shares a help link |
| §5 | Challenge feature added to Quip and Wave — parity with Lede, Spread, SoF |
| §9 | Hub cards must show "played today" state — currently all cards look identical regardless |
| §5 | Wacky game removed from active GameId union until screen is implemented |
| §10 | Data model additions required before backend sync is possible |

---

## 1–6. Unchanged from v3

*(See v3 for Product Overview, Navigation, Brand, Retention, Games, Hidden Games)*

---

## 7. Social Growth Loop (v4 — Frontend Hardening)

v3 defined the full social loop concept. v4 resolves the frontend gaps that prevent that loop from working end-to-end and that would block backend integration.

---

### 7.1 Challenge URL Encoding

**Current state:** `genChallengeUrl()` produces a random 8-character stub (`noodlebowl.app/c/ABCD1234`) with no embedded data. When a friend opens this URL, there is no way to know which game, which question, or what the sender predicted.

**Required change:** The challenge URL must encode the minimum payload needed to reconstruct the challenge on the friend's side without a backend roundtrip, and to tie the challenge back to a specific interaction when the backend is live.

**URL payload (embedded as base64 or short query params):**

| Field | Purpose |
|-------|---------|
| `gameId` | Which game to render (lede, spread, sof, wave, quip) |
| `questionIndex` | Index into the game's question bank — serves the same question to the friend |
| `senderPrediction` | What the sender predicted (revealed post-answer to friend) |
| `senderAnswer` | What the sender actually answered (for comparison screen) |
| `senderName` | Display name of the sender (entered in step 7.3 below) |
| `issuedAt` | ISO timestamp — backend uses this to enforce expiry |

**URL format (v1, pre-backend):**
```
noodlebowl.app/c/{base64(payload)}
```

**URL format (v2, post-backend):**
```
noodlebowl.app/c/{serverToken}
```

In v1 the payload is self-contained in the URL. In v2 the server issues a short token and stores the payload. The app must be written to support both forms — detect by token length.

**Deep link handler:** A route at `/games/challenge/[token]` must be created in the app to handle incoming challenge links. When opened on a device with the app installed, this route decodes the token, loads the correct game screen in challenge mode, and marks the resulting play as a challenge response.

---

### 7.2 Friend Name Capture Before Sending

**Current state:** All calls to `addFriendInteraction()` hardcode `friendName: 'A Friend'`. This means the Friends feed always says "You challenged A Friend" and the backend can never build a real friend graph.

**Required change:** Before the predict step in ChallengeModal, add a single first-name prompt:

```
Who are you challenging?

[First name]  ← single text input, not required for sending

[Skip →]  [Next →]
```

- Name is optional — if skipped, defaults to "A Friend" (acceptable for v1)
- Name is stored in the `FriendInteraction` record and embedded in the challenge URL payload as `senderFriendName` (so the comparison screen can say "You vs. Alex")
- Name is not persisted as a contact — it is per-challenge metadata only
- Keyboard must push the modal up (same `KeyboardAvoidingView` pattern already in `ChallengeModal`)

**Step order in ChallengeModal (updated):**

| Step | Content |
|------|---------|
| 0 (new) | Who are you challenging? (name input — skippable) |
| 1 | Before you send it — predict step (existing) |
| 2 | Share step with encoded URL (existing, now with real data) |
| 3 | Sent confirmation (existing) |

---

### 7.3 Recording Missing Interaction Types

**Current state:** Five interaction types are defined in `FriendInteraction`. Only `sent_challenge` is ever written. The other four exist in the type union but are never created anywhere in the codebase. The hub's "Assists" counter reads `gave_help` events but none are ever written, making it permanently zero.

**Required changes per interaction type:**

#### `gave_help`
**Trigger:** When the player taps "Share with a Friend" in the "Ask a Friend for Help" modal.
**Record:** At the moment of sharing — not when the friend responds (that confirmation requires the backend).
**Fields:** `gameId`, `date`, `shieldEarned: false` (shield is awarded server-side when friend responds).
**Impact:** Fixes the Assists counter on the hub immediately, without needing backend.

#### `received_help`
**Trigger:** When a friend opens a help link and responds. Requires backend (friend's response must be submitted server-side).
**Frontend:** Polling endpoint or push notification triggers recording in-app. The record is written when the app receives the response, not when the link is shared.
**Fields:** `gameId`, `friendName` (from URL param or "A Friend"), `date`, `shieldEarned: true`.
**Shield:** Both the asker (this record) and the helper receive a shield when this event fires.

#### `sent_challenge`
**Current:** Already recorded. Add `questionIndex` field before backend integration.

#### `challenge_accepted`
**Trigger:** When a friend opens a challenge link, plays, and submits their answer. Backend fires this event.
**Frontend:** Written via the same polling/push mechanism as `received_help`.
**Fields:** `gameId`, `friendName`, `questionIndex`, `senderPrediction`, `friendAnswer`, `date`, `bonusPointsEarned: 10`.
**Points:** +10 credited to the sender when this record is written.

#### `received_challenge`
**Trigger:** When the player opens a challenge link sent by someone else.
**Frontend only:** Written locally as soon as the challenge route `/games/challenge/[token]` is opened. No backend required.
**Fields:** `gameId`, `friendName` (from token payload), `questionIndex`, `date`.

**Summary — which types need backend vs. are frontend-only:**

| Type | Requires Backend | When to Implement |
|------|-----------------|-------------------|
| `gave_help` | No | Now (fix Assists counter) |
| `received_help` | Yes | After backend |
| `sent_challenge` | No (update fields) | Now |
| `challenge_accepted` | Yes | After backend |
| `received_challenge` | No | When deep link handler is built |

---

### 7.4 `questionIndex` on All Interactions

**Current state:** `FriendInteraction` stores `senderPrediction` and `friendAnswer` but not which question the interaction refers to.

**Required change:** Add `questionIndex: number` to the `FriendInteraction` interface. All calls to `addFriendInteraction()` across all game screens must pass the index of the question currently in play.

```typescript
interface FriendInteraction {
  id: string;
  type: FriendInteractionType;
  friendName: string;
  gameId: GameId;
  questionIndex: number;       // NEW — index into game's question bank
  date: string;
  shieldEarned: boolean;
  senderPrediction?: string;
  friendAnswer?: string;
}
```

This field is required for the backend to:
- Serve the same question to the friend (challenge flow)
- Validate the friend's answer against the correct answer
- Attribute the correct comparison data to the feed entry

---

### 7.5 Prediction Reveal in Friends Feed

**Current state:** A `sent_challenge` feed entry shows "Waiting for them to play…" indefinitely. There is no state for a resolved challenge and no UI to show whether the sender's prediction was correct.

**Required change:** When a `challenge_accepted` interaction exists for a previously sent challenge (matched by `questionIndex` + `gameId` + `date`), the feed entry for the original `sent_challenge` updates to show the outcome.

**Feed entry — pending state:**
```
⚔️  You challenged A Friend to The Lede        2 days ago
     Waiting for them to play…
```

**Feed entry — resolved state:**
```
⚔️  You challenged Alex to The Lede            2 days ago   +10 pts
     You picked Dex · Alex picked Pip
     Correct answer: Pip  ✓ Your prediction was right
```

**Prediction outcome language:**

| Scenario | Copy |
|----------|------|
| Prediction correct, friend got it right | "Your prediction was right — Alex got it too." |
| Prediction correct, friend got it wrong | "Your prediction was right — Alex got it wrong." |
| Prediction wrong, friend got it right | "Alex surprised you — they got it right." |
| Prediction wrong, friend got it wrong | "Neither of you got this one." |

**Implementation note:** In v1 (pre-backend), this outcome can only be shown when both events live in local state on the same device. Full resolution requires the backend to push the `challenge_accepted` event to the sender.

---

### 7.6 Challenge Feature Parity — Quip and Wave

**Current state:** ChallengeModal is integrated into Lede, Spread, and SoF. Quip and Wave have the "Ask a Friend for Help" modal but no post-reveal challenge flow.

#### Wave (The Pulse)
**Predict step options:** "Where do you think they'll land?" with position options:
- Under (bottom third)
- Middle (centre third)
- Over (top third)

These map to the dial position ranges, not exact values. Coarse prediction, easy to answer.

#### Quip (The Quip)
**Predict step options:** "How many judges do you think will like it?" with options:
- None
- 1 out of 3
- 2 out of 3
- All 3

**Integration pattern:** Identical to Lede, Spread, SoF — add `showChallenge` state, wire `ChallengeModal` in the reveal phase, call `addFriendInteraction` with `type: 'sent_challenge'` on send.

---

## 8. Stats Tab

*(Unchanged from v3)*

---

## 9. Hub Screen — Played Today States

**Current state:** All game cards on the hub screen appear identical regardless of whether the player has already played that game today. There is no visual distinction between a game that is fresh and one that has already been completed.

**Required change:** Hub cards must reflect one of three states:

| State | Visual treatment |
|-------|-----------------|
| Available | Full opacity, primary "Play" button |
| Played today | Slightly muted (85% opacity), result pill showing score, secondary "Play Again" button |
| Coming soon | Locked appearance (future games not yet activated) |

**"Played today" detection:** A game is considered played today when `state.stats[gameId].lastPlayed === getTodayISODate()`. This field already exists in the stats structure.

**Played today card display:**
```
THE LEDE                          Played ✓
Complete the headline

                              +20 pts · Correct

                              [Play Again]
```

- Score shown is the points earned in the most recent play today
- "Play Again" leads to a new question (existing behavior — `pickFromBank` already cycles)
- Streak shield indicator on cards where a shield was earned today

---

## 10. Technical Considerations

### 10.1 Updated `FriendInteraction` interface

```typescript
export interface FriendInteraction {
  id: string;
  type: 'received_help' | 'gave_help' | 'sent_challenge' | 'challenge_accepted' | 'received_challenge';
  friendName: string;              // no longer hardcoded — captured in step 7.2
  gameId: GameId;
  questionIndex: number;           // NEW — required for backend correlation
  date: string;                    // ISO date (YYYY-MM-DD)
  shieldEarned: boolean;
  senderPrediction?: string;
  friendAnswer?: string;
  bonusPointsEarned?: number;      // +10 for challenge_accepted
}
```

### 10.2 Updated `genChallengeUrl` signature

```typescript
interface ChallengePayload {
  gameId: GameId;
  questionIndex: number;
  senderPrediction: string;
  senderAnswer: string;
  senderName: string;
  issuedAt: string;              // ISO datetime
}

function genChallengeUrl(payload: ChallengePayload): string
```

The function base64-encodes the payload and appends it to the base URL. This is the v1 self-contained format. When the backend is live, the function will POST the payload and return a short server token instead.

### 10.3 New route: `/games/challenge/[token]`

A new Expo Router route that:
1. Decodes the token (base64 in v1, server lookup in v2)
2. Validates the payload (gameId exists, questionIndex in range, not expired)
3. Loads the game screen in challenge mode — the question at `questionIndex` is shown, no random pick
4. On lock-in, records `received_challenge` locally and submits the answer to the backend
5. Shows the comparison screen after submitting

### 10.4 Wacky game — status change

The `wacky` GameId currently exists in the union type and initial state but has no screen. Until the screen is implemented it must be removed from:
- The `GameId` union in `constants/data.ts`
- The initial `seen` state in `GameContext.tsx`
- `GAME_META` (or marked `hidden: true` and excluded from all rendering logic)

This prevents TypeScript from accepting phantom interaction records for a game that can't be played.

### 10.5 Backend sync readiness checklist

Before the backend is wired up, the frontend must:

- [ ] `FriendInteraction.questionIndex` field added and populated on all `addFriendInteraction()` calls
- [ ] `genChallengeUrl()` encodes full payload (not random stub)
- [ ] `/games/challenge/[token]` route created
- [ ] `received_challenge` recorded when challenge route opens
- [ ] `gave_help` recorded when help link is shared
- [ ] `sent_challenge` includes `questionIndex`
- [ ] Friend name captured before challenge send
- [ ] Hub cards reflect `lastPlayed` state
- [ ] `wacky` removed from active GameId union
- [ ] ChallengeModal integrated into Quip and Wave

---

## 11. Content Roadmap

*(Unchanged from v3)*

---

## 12. Success Metrics

### 12.1 Primary retention

*(Unchanged from v3)*

### 12.2 Social growth loop

*(Unchanged from v3 — targets remain the same; v4 enables measurement of these metrics by actually recording the events)*

### 12.3 v4-specific readiness metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Assists counter accuracy | Shows real count | Requires `gave_help` recording |
| Challenge URL decode success rate | 100% | All tokens must round-trip cleanly |
| Interaction type coverage | All 5 types appear in feed | Before: only 1 did |
| Hub played-today accuracy | Correct on all games | Reads existing `lastPlayed` field |

---

## 13. Open Questions

*(All entries from v3 §13 unchanged)*

### 13.7 Challenge mode question freshness

If the player sends a challenge and the friend opens it two days later, the question at `questionIndex` may have already been seen by the friend in their own daily rotation. Options:
- Allow it — the challenge context is different from solo play; seeing it again is fine
- Flag it — show "You may have seen this one already" before the friend plays
- Expire it — 24-hour expiry (already in v3 §13.3) prevents most staleness

Recommend: 24-hour expiry with the hard block experience (see v3 §13.3). Keeps challenges fresh and avoids the replay problem entirely.

### 13.8 `questionIndex` collision across game modes (SoF)

SoF has two modes: Standard and Weird & True. A `questionIndex` of 3 means different questions depending on `weirdMode`. The interaction record must also store `weirdMode: boolean` to unambiguously identify the question.

---

## 14. Appendix — Design Decision Log

*(All entries from v3 Appendix A.1–A.9 unchanged)*

### A.10 Why `questionIndex` instead of `questionId`

The question banks are currently arrays in `constants/data.ts` with no explicit ID field. Adding a `questionId` string to every bank entry would require touching all question data across 5 games. Using `questionIndex` (the array index) is a zero-migration approach — the index is stable as long as items are only appended, never reordered or deleted. When the backend is live and questions are served from a database, question IDs will be introduced there, and `questionIndex` becomes a legacy lookup key. The two-phase approach avoids unnecessary upfront data migration.

### A.11 Why friend name capture is optional (skippable)

Making the name field required before sending a challenge creates friction at the moment of highest intent. A player who just got a question right and wants to challenge a friend should not be blocked by a mandatory form field. Making it optional preserves momentum. The "A Friend" default is a genuine fallback for anonymous challenges, not a failure state. When the backend introduces contacts or a friends list, the prompt can become pre-filled from that list, making it feel helpful rather than friction.

### A.12 Why Wacky is removed from the active GameId union

Keeping a GameId in the type union that has no corresponding screen means TypeScript silently accepts invalid state — `addFriendInteraction({ gameId: 'wacky', ... })` will compile but lead to broken feed entries. The type union should reflect what is playable, not what is planned. When the Wacky screen is implemented, `wacky` is added back to the union. Until then, it lives only in comments and the content roadmap.

---

*End of document — Version 4.0*
