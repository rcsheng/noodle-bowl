# Noodle Bowl — Product Requirements Document

**Status:** In active development (Claude Code)
**Author:** Product team
**Last updated:** April 2026
**Document version:** 3.0
**Changes from v2:** Split social CTA into two distinct flows (Ask for Help / Challenge a Friend), web-first challenge experience for friend-side play, smart deep linking, "You vs. [Friend]" comparison screen, predict-your-friend meta-game, challenge bonus points reward

---

## Changelog from v2

| Section | Change |
|---------|--------|
| §7 | Social growth loop split into two entry points: pre-answer (Ask for Help) and post-answer (Challenge a Friend) |
| §7 | "Ask for Help" copy sharpened: "Stuck? Ask a Friend" |
| §7 | New: Challenge a Friend flow — post-reveal primary CTA |
| §7 | New: Predict-your-friend meta-game before sending a challenge |
| §7 | New: Friend-facing web experience (no login, web-first, smart deep link) |
| §7 | New: "You vs. [Friend]" comparison screen |
| §7 | New: Challenge reward — +10 bonus points when friend completes |
| §10 | Technical: smart deep linking, web challenge view, share token v2 |
| §12 | Updated success metrics for challenge flow |
| Appendix | New decision log entries A.7–A.9 |

---

## 1. Product Overview

*(Unchanged from v2 — see v2 §1)*

---

## 2. Navigation and Information Architecture

*(Unchanged from v2 — see v2 §2)*

---

## 3. Brand and Visual Identity

*(Unchanged from v2 — see v2 §3)*

---

## 4. Retention Mechanics

*(Unchanged from v2 — see v2 §4)*

---

## 5. Games (Active — 3 Total)

*(Unchanged from v2 — see v2 §5)*

---

## 6. Games (Hidden — Available For Future Activation)

*(Unchanged from v2 — see v2 §6)*

---

## 7. Social Growth Loop (v3 — Two Entry Points)

The social mechanic now has two distinct entry points aligned to the player's emotional state at each moment of the game. They are never presented simultaneously and never compete for attention.

---

### 7.1 The Two-CTA Model

| Moment | Emotion | CTA | Purpose |
|--------|---------|-----|---------|
| Before answering | Uncertainty, stuck | "Stuck? Ask a Friend" | Get a hint; genuine help |
| After answering | Confident, curious | "Challenge a Friend" | Viral growth; social competition |

These are not variants of the same action. They are different psychological moments requiring different language, different flows, and different rewards. Conflating them into a single "share" button destroys the intent signal.

---

### 7.2 Entry Point A — "Stuck? Ask a Friend" (Pre-Answer)

**Placement:** Below the primary Lock In button on every game's play screen, during the play phase only. Hidden on reveal/result screens.

**Button states:**
- **Default:** 🔗 "Stuck? Ask a Friend"
- **After sharing (waiting):** 🔗 "Waiting for a response…" (disabled, pulsing indicator)
- **After hint received:** ✓ "A hint came back — tap to view" (active, green border)

**Flow:**
1. Player taps the button → modal opens titled **"Get Help From a Friend"**
2. Consent notice: *"Anyone with this link can see the question. They don't need the app to help."*
3. Preview card shows exactly what the friend will see (question only — no answers, no options revealed)
4. Share options: **Copy Link** · **Send via Messages**
5. Waiting state with pulsing dot: *"Waiting to see if someone responds…"*
6. When hint arrives: dark inset card shows friend's name and message

**Reward:** Both the asker and the helper earn **one Streak Shield** when the friend responds. See §7.5 for shield mechanics.

**Copy principles:**
- Never use the word "share"
- Low pressure — "Stuck?" is permission-giving, not obligating
- The friend is framed as helping, not as a growth target

---

### 7.3 Entry Point B — "Challenge a Friend" (Post-Answer)

**Placement:** Primary CTA on the reveal/result screen, after the answer is shown. This is the dominant action on that screen. Replaces what was previously "Play Again" as the primary button. "Play Again" becomes secondary.

**Button label:** "Challenge a Friend to This One"

**This entry point does not exist during the play phase.** It only appears after the player has locked in their answer and seen the result.

#### 7.3.1 Predict-Your-Friend Step

Before the challenge link is generated, the player is shown a single-question interstitial:

```
Before you send it —
Who do you think they'll pick?

  [Reporter A]   [Reporter B]   [Reporter C]
  (or equivalent options for each game)
```

- The prediction is recorded locally and attached to the challenge token
- It is **not shown to the friend** before they answer — only revealed in the comparison screen after they lock in
- This transforms a passive share into an active bet, creating anticipation and a reason to care about the outcome
- For The Spread: "What do you think they'll guess?" with a slider or text input (rough range, not exact)
- For Science or Fiction: "Which claim do you think will fool them?" (pick one)

#### 7.3.2 Challenge Share Flow

After the prediction step:

1. Challenge link is generated with the prediction embedded in the token
2. Player sees: **"Sent. Waiting to see what they pick…"**
3. Share options: **Copy Link** · **Send via Messages**
4. Framing copy: *"[Player name] thought this one would trick you."* — this is what the friend will see when they open the link

**Reward:** When the friend completes the challenge, the original player receives **+10 bonus points** added to their lifetime total. No shield earned (challenges are viral/casual; shields are reserved for the help flow which requires genuine effort from the helper).

---

### 7.4 Friend-Facing Experience (Web-First, No Login)

**Core principle:** The fun happens before the download ask. Never gate the experience behind an account or install.

#### 7.4.1 Smart deep linking

The challenge URL behaves differently depending on the friend's device state:

- **App installed:** URL is a universal/app link that opens directly into the challenge inside the app
- **App not installed:** URL opens a mobile-optimized web page with the full challenge playable in browser

Implementation: Branch.io or equivalent smart link service. Single URL handles both cases.

#### 7.4.2 Friend-facing web challenge page

The web page is a stripped-down version of the game screen. No bottom nav, no hub, no stats. Just:

```
[Noodle Bowl wordmark — top]

[Sender name] thought this one would trick you.

[Game: The Lede]
[Question rendered exactly as in-app]

[Answer options]

[Lock In button]
```

- Uses the same visual identity (Fraunces, JetBrains Mono, paper/ink palette)
- Fully playable without account or login
- Works as a PWA-compatible page (installable if the friend wants)
- The friend's answer, name (optional — they can play anonymously as "A Friend"), and timestamp are submitted to the backend

#### 7.4.3 Post-answer: comparison screen (web)

After the friend answers, the web page shows the **"You vs. [Sender]" comparison screen**:

```
You picked Pip Calderone.
Ric picked Dex Holloway.  ← Ric's prediction revealed here

The correct answer was Pip Calderone.  ✓ You got it right.

[Correct answer explanation]

---

Play Noodle Bowl daily →
[App Store button]  [Play Store button]
```

Key details:
- The sender's original prediction is revealed here for the first time
- If the friend got it right and the sender got it wrong, acknowledge that too ("You got it — Ric didn't")
- The comparison is the emotional payoff; the download CTA follows at peak engagement
- If friend already has the app (opened via deep link), the comparison screen shows in-app and no download CTA appears

#### 7.4.4 Friend's play counts toward their stats

If the friend has the app and opens via deep link, completing the challenge counts as a normal game round: streak, points, per-game stats all update. The challenge is not a side-channel experience — it's a full round.

If the friend plays on web (no account), their result is submitted to the backend tied to the challenge token but not to any user account. If they subsequently install the app, there is no stat backfill (acceptable for v1).

---

### 7.5 Streak Shield Mechanics (unchanged from v2)

Shields are earned exclusively through the **Ask for Help** flow (Entry Point A), not through challenges.

- Both the asker and the helper earn one shield when the helper responds
- Maximum 3 shields at any time
- One shield consumed automatically when a player misses a day
- Displayed in Friends tab and as a subtle indicator in the masthead

---

### 7.6 Post-Challenge Notification (Original Player)

When the friend completes the challenge, the original player is notified:

**In-app notification (on next open, if push not available):**
> "Alex played your challenge. They picked Pip — you predicted Dex."
> *+10 pts added to your score.*

**Push notification (if permission granted):**
> "Alex finished your Noodle Bowl challenge — see how they did."

The notification surfaces the comparison outcome and the bonus points, giving the original player a reason to open the app.

---

### 7.7 Friends Tab Updates

The Friends tab interaction feed is extended to include challenge entries alongside help entries:

**Entry types:**

| Icon | Entry | Type |
|------|-------|------|
| 📩 | Alex helped you with The Lede | received_help |
| 📤 | You helped Jordan with The Spread | gave_help |
| ⚔️ | You challenged Sam to Science or Fiction | sent_challenge |
| ⚔️ | Alex accepted your challenge to The Lede | challenge_accepted |
| 🏆 | Sam challenged you to The Spread | received_challenge |

**Challenge outcome in feed:**
```
⚔️  You challenged Alex to The Lede           2 days ago   +10 pts
     You picked Dex · Alex picked Pip · Correct: Pip
```

**Weekly summary card** updated to include challenges:
```
THIS WEEK
3 friends helped you  ·  You helped 1 friend
2 challenges sent     ·  1 challenge accepted
🛡 2 shields earned   ·  +20 pts from challenges
```

---

### 7.8 Return-the-Favor Nudges (unchanged from v2)

If a user has received help but hasn't helped anyone back recently, a nudge appears at the top of the Friends feed. See v2 §7 for full copy.

---

## 8. Stats Tab

*(Unchanged from v2 — see v2 §8)*

---

## 9. Hub Screen

*(Unchanged from v2 — see v2 §9, noting that "Days Played" in the standing card has been replaced with "Assists" in the implementation — see implementation notes)*

---

## 10. Technical Considerations

### 10.1 State structure additions (v3)

New `FriendInteraction` types added to `friendInteractions[]`:

```typescript
type FriendInteractionType =
  | 'received_help'     // existing
  | 'gave_help'         // existing
  | 'sent_challenge'    // new: player sent a challenge
  | 'challenge_accepted' // new: friend completed player's challenge
  | 'received_challenge' // new: player was challenged by a friend
```

New fields on challenge interactions:
```typescript
interface ChallengeInteraction extends FriendInteraction {
  type: 'sent_challenge' | 'challenge_accepted' | 'received_challenge';
  senderPrediction?: string;   // what sender predicted friend would pick
  friendAnswer?: string;       // what friend actually picked
  correctAnswer?: string;      // the real answer
  bonusPointsEarned?: number;  // +10 when friend completes
}
```

### 10.2 Share token v2

The challenge share token needs to carry:

- Game ID
- Question index (to serve the same question to the friend)
- Sender name (display only, no auth)
- Sender's prediction (revealed post-answer to friend)
- Sender's own answer (for comparison screen)
- Expiry (24 hours recommended — question is time-sensitive; daily game logic)

### 10.3 Smart deep linking

Use Branch.io (or equivalent) for universal links:
- iOS: Associated Domains entitlement
- Android: App Links (Digital Asset Links JSON)
- Web fallback: served at `noodlebowl.app/c/:token`

The web fallback page must be a responsive, standalone challenge view using the same design system. It does not require a full React Native web port — a lightweight HTML page matching the visual identity is sufficient for v1.

### 10.4 Backend priorities (updated from v2)

In priority order:

1. **Share token API (help flow)** — POST /api/share, GET /api/share/:token, POST /api/share/:token/respond
2. **Challenge token API** — POST /api/challenge (creates token with question + prediction), GET /api/challenge/:token (friend-facing), POST /api/challenge/:token/answer (friend submits)
3. **Shield award logic** — server-side, triggered on help response. Awards shields to both parties.
4. **Challenge bonus points** — server-side, +10 credited to sender when friend submits answer
5. **Notification system** — notifies original player when friend completes challenge. Push preferred; polling fallback.
6. **Smart deep links** — Branch.io or equivalent, universal link handling
7. **Return-the-favor link** — GET /api/user/:id/open-question
8. **Friend interaction log** — server-side persistence

### 10.5 Web challenge page

The friend-facing web page at `noodlebowl.app/c/:token` must:

- Load the question data from the challenge token
- Render the game UI matching the app's visual identity
- Accept the friend's answer and submit to backend
- Show the comparison screen with sender's prediction revealed
- Show the app download CTA after completion
- Handle expiry gracefully: "This challenge has expired — download Noodle Bowl to play today's games"
- Work without JavaScript disabled (basic accessible fallback)

---

## 11. Content Roadmap

*(Unchanged from v2 — see v2 §11)*

---

## 12. Success Metrics

### 12.1 Primary retention

*(Unchanged from v2)*

### 12.2 Social growth loop (updated)

| Metric | Target | Notes |
|--------|--------|-------|
| Ask for Help usage | >15% of sessions | Button tapped during play phase |
| Help response rate | >40% | Shared links that receive a response |
| Challenge send rate | >25% of sessions | Button tapped after reveal |
| Challenge accept rate | >50% | Challenge links that get played |
| Web → app conversion | >20% | Friends who play on web then install |
| Shield-driven installs | >20% of new users | Acquired via help links |
| Challenge-driven installs | >15% of new users | Acquired via challenge links |
| Return-the-favor click rate | >25% | Nudges that lead to a response |

### 12.3 Quality

*(Unchanged from v2)*

---

## 13. Open Questions

### 13.1 Shield cap
*(Unchanged from v2)*

### 13.2 Streak shield notification
*(Unchanged from v2)*

### 13.3 Challenge expiry UX
What does the friend see if they open a challenge link after 24 hours? Options:
- Hard block: "This challenge has expired. Download Noodle Bowl to play today's edition."
- Soft redirect: Show today's hub (if web version exists) rather than a dead end.
Recommend: hard block with warm copy and a strong download CTA. A expired game result is confusing; a clear redirect to the app is more useful.

### 13.4 Anonymous challenge responses
If the friend plays on web without entering a name, how are they identified in the comparison screen and in the sender's notification? Options:
- "A Friend picked Pip" (anonymous)
- Prompt for a first name before locking in (low friction, single field)
Recommend: single first-name prompt before Lock In. Increases emotional payoff of the comparison screen significantly.

### 13.5 Challenge from a wrong answer
If the player got the question wrong, is the "Challenge a Friend" CTA appropriate? They may not want to highlight that they got it wrong. Options:
- Always show it (the comparison is interesting regardless — being wrong and your friend being right is also a good story)
- Adjust copy: "Think your friend would do better?" when player was wrong vs. "Think they'd get this right?" when correct
Recommend: show always, adjust copy to match outcome. Being wrong is also a valid reason to challenge — you want to know if it was hard for everyone or just you.

### 13.6 Weird & True claim difficulty
*(Unchanged from v2)*

### 13.7 Empty Friends tab onboarding
*(Unchanged from v2)*

---

## 14. Appendix — Design Decision Log

*(All entries from v2 Appendix A.1–A.6 unchanged)*

### A.7 Why the social CTA was split into two entry points

A single "share" button tries to serve two incompatible user states: someone who is stuck and needs help, and someone who has just won and wants to brag or compete. These are different people in different emotional moments. Trying to satisfy both with one button produces copy that's vague ("Share this question"), placement that's awkward (when exactly?), and intent that's muddled. Splitting into "Stuck? Ask a Friend" (pre-answer) and "Challenge a Friend" (post-answer) aligns each CTA with its natural moment, produces sharper copy, and lets each flow be optimized independently.

### A.8 Why "Challenge" earns points, not shields

Shields are earned by the **help flow** because help requires genuine effort from the helper — they read the question, form an opinion, write a message. That effort deserves a durable reward (streak protection). Challenges are lighter — the friend just plays a round. Points are the right reward for challenges because they're additive and match the casual/competitive tone of the mechanic. Giving shields for challenges would devalue shields as a meaningful reward and create an easy farming loop (challenge 10 friends, get 10 shields, never worry about your streak again).

### A.9 Why the friend-facing experience is web-first

Requiring app install before a friend can play a challenge is the fastest way to kill the mechanic's conversion rate. The friend receives the challenge link with zero context, zero prior relationship with the app, and no existing motivation to install before they see what it is. Web-first inverts this: the friend plays the full challenge (fun, low-friction), then sees the comparison screen (emotional payoff), then sees the download CTA at the moment they are most likely to want more. This is structurally identical to how Wordle spread — you shared results, friends played without account, then downloaded. Smart deep linking ensures existing users get the in-app experience without degradation.

---

*End of document — Version 3.0*
