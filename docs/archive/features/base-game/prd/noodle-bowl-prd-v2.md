# Noodle Bowl — Product Requirements Document

**Status:** In active development (Claude Code)
**Author:** Product team
**Last updated:** April 2026
**Document version:** 2.0
**Changes from v1:** Anchor game, unified streak, hidden accuracy, Wacky News merged into SoF, social growth loop

---

## Changelog from v1

| Section | Change |
|---------|--------|
| Games | Reduced from 4 active games to 3. Wacky News retired as standalone; merged into Science or Fiction as the "Weird & True" category |
| Games | The Lede promoted to N°01 anchor position with more prominent hub treatment |
| Retention | Per-game streaks replaced with a single unified daily streak (Duolingo model) |
| Stats | Accuracy hidden from main hub; visible in Stats tab only |
| Navigation | Bottom nav introduced: Home \| Stats \| Friends |
| Social | "Phone a Friend" renamed to "Ask a Friend for Help"; streak shield reward introduced; Friends tab added with full social interaction history |

---

## 1. Product Overview

### 1.1 Vision

Noodle Bowl is a daily mobile/web brain game app that mixes news, bluffing, and science literacy into short, replayable challenges. It pairs the daily-ritual habit pattern of Wordle and the NYT Games suite with cognitive variety — three focused games that each test a genuinely different skill, rather than the same puzzle format every day.

### 1.2 Tagline

> **Noodle Bowl** — A Daily Mix Of Brain Games
>
> *Stretch your noodle. Daily.*

### 1.3 Core value proposition

A short daily session (5–10 minutes) across three focused games built around real news. Plays into a single unified streak — like Duolingo — so any game played counts toward keeping the streak alive. Friends can be invited to help via shareable links, and helping earns streak protection for both parties, making the social mechanic a genuine growth loop rather than a vanity feature.

---

## 2. Navigation and Information Architecture

### 2.1 Bottom navigation

The app uses a three-tab bottom nav that persists across all screens within the tab context:

| Tab | Icon | Contents |
|-----|------|----------|
| **Home** | 🏠 | Hub with game cards, daily streak indicator, daily points |
| **Stats** | 📊 | Full per-game breakdown, accuracy, best streaks, total history |
| **Friends** | 👥 | Social interaction feed, streak shields earned, return-the-favor nudges |

The nav is always visible on the hub/tab screens. It hides when a user is inside an active game round (full-screen focus mode), and reappears on result/reveal screens.

### 2.2 Screen hierarchy

```
Bottom Nav
├── Home Tab
│   ├── Hub (game cards)
│   └── Game flows (play → reveal → result)
│       ├── The Lede
│       ├── The Spread
│       └── Science or Fiction
├── Stats Tab
│   ├── Unified streak summary
│   ├── Per-game accuracy and history
│   └── Points breakdown
└── Friends Tab
    ├── Interaction feed
    ├── Shields earned/available
    └── Return-the-favor nudges
```

---

## 3. Brand and Visual Identity

*(Unchanged from v1 — see v1 §2 for full detail)*

**Summary:** Pale blue-gray background (`#e8eef3`), deep navy ink (`#1a2030`), brick-red accent (`#b84a35`). Fraunces italic for display type, JetBrains Mono for labels and metadata. Forced light color scheme to prevent iOS in-app browser dark-mode override.

---

## 4. Retention Mechanics

### 4.1 Unified daily streak (Duolingo model)

There is one streak for the entire app, displayed prominently in the masthead and hub. It increments when a user completes at least one game round on a given calendar day. It does not matter which game — any completed round counts.

**Streak rules:**
- Playing any game on day N+1 after playing on day N → streak increments
- Missing a day without a shield → streak resets to 1
- Missing a day with a shield available → shield consumed, streak preserved (see §7.4)
- The streak counter is shown in the masthead with a flame icon, always visible

**What this replaces:** The previous model had independent per-game streaks (e.g., a Spread streak and a Lede streak). These created too many competing obligations and diluted the habit signal. The unified streak is simpler, more motivating, and creates flexibility — users can play whichever game they're in the mood for without penalty.

**Per-game streaks:** Still tracked in the background for the Stats tab. Not displayed on the hub or in-game.

### 4.2 Scoring

Points remain per-game and per-round, displayed on result screens. Total lifetime points are shown on the hub. Scoring details per game are unchanged from v1.

### 4.3 Daily streak display

The masthead shows the unified streak:

```
No. 0115 · Saturday, April 25, 2026
       Noodle Bowl
   A Daily Mix Of Brain Games
        🔥 14   [streak counter]
```

The hub card shows:

```
YOUR STANDING
[Total Points]    [Day Streak]    [Days Played]
```

Accuracy is absent from this view intentionally. It's available in the Stats tab for users who want it, but removing it from the primary hub reduces anxiety and focuses attention on the streak habit and points.

---

## 5. Games (Active — 3 Total)

### 5.1 N°01 — The Lede (Anchor Game)

**Position:** First game on hub, largest card, most prominent visual treatment
**Section header:** "Finish The Headline"
**Time to play:** ~2 minutes
**Mechanic:** Pick which of three reporters is telling the truth about a real news headline

**Why it's the anchor:**
The Lede is the most distinctively Noodle Bowl game — it doesn't exist anywhere else in the games market, and it captures the editorial/newsroom personality of the app better than any other game. It's also the most social: a good pitch from a wrong reporter is genuinely funny and shareable. It warrants the anchor position because it's the game most likely to make a user think "what *is* this app — I love it."

**Hub card treatment:** Slightly taller card with a distinct header treatment to signal anchor status. Could use a different accent color or a "Today's Edition" subheading. The game number reads N°01 and sits above the others in the list.

**Gameplay (unchanged from v1):**
A partial headline appears with the punchline blacked out. Three reporters pitch their version of the ending, each in character:

- **Iris Bellamy — The Naturalist:** Ecology, biology, animals
- **Dex Holloway — The Skeptic:** Dry, pragmatic, fact-checker energy
- **Pip Calderone — The Optimist:** Finds the warm or hopeful angle

Each card shows the proposed completion in large italic type first, then a divider, then the reporter's name, role, and a short confident pitch explaining why their version is the real one. The player picks one and locks in.

**Reveal:** The real headline fills in. Correct reporter's card turns green, wrong pick turns red. An explanation paragraph provides context and sources.

**Scoring:** +10 base · streak bonus (per-game, not displayed on hub) · wrong = 0

**Question bank:** 5 headlines currently. Needs editorial expansion to ~30+ for meaningful daily variety without repeats.

---

### 5.2 N°02 — The Spread (Numerical Estimation)

**Position:** Second game on hub
**Section header:** "The Number Hunt"
**Time to play:** ~2 minutes
**Mechanic:** Submit a numerical guess; scored by percentage deviation from the real answer

**Gameplay (unchanged from v1):**
A real news question with a hidden number is posed ("How fast does the Parker Solar Probe travel at its closest approach to the Sun?"). The user submits their guess.

**Reveal:** A two-row comparison shows "Your Guess" vs "The Truth," followed by a large percentage-deviation card.

**Scoring tiers:**
- Within 5% → +25 ("Spot on")
- Within 15% → +15 ("Very close")
- Within 30% → +8 ("In the ballpark")
- Beyond 30% → 0

No fake competing players. Score reflects accuracy against the real answer only.

**Question bank:** 6 questions currently. Needs expansion to ~30.

---

### 5.3 N°03 — Science or Fiction (Two Truths, One Lie — Now With Weird & True)

**Position:** Third game on hub
**Section header:** "Two Truths, One Lie"
**Time to play:** ~3 minutes
**Mechanic:** Three claims. Two are real. One is fabricated. Vote on each independently.

**The Wacky News merge:**
"Weird & True" is now a sixth category within Science or Fiction, sitting alongside Animal Behavior, Space & Astronomy, Medicine & Health, Earth & Environment, and Technology & AI. When a player draws a Weird & True round, the three claims come from the former Wacky News bank — bizarre-but-real stories mixed with plausible-but-fabricated satirical claims. The Fiction claim in a Weird & True round is a made-up satirical headline; the two Science claims are genuinely weird real stories sourced and cited.

This is a better home for the Wacky material because:
1. It doesn't need to sustain a full solo game — three weird claims per round is the right serving size
2. The "two real, one fake" format makes the satirical claim *harder* to spot than a simple yes/no (you have to commit to two science calls and one fiction call per round, which forces more careful thinking)
3. It gives SoF tonal variety — players who get five Animal Behavior rounds in a row now get a periodic palette cleanser

**Categories (6 total):**

| # | Category | Description |
|---|----------|-------------|
| 1 | Animal Behavior | Surprising research about how creatures act |
| 2 | Space & Astronomy | Recent discoveries beyond Earth |
| 3 | Medicine & Health | Clinical research, FDA approvals, health findings |
| 4 | Earth & Environment | Ecology, climate, geology |
| 5 | Technology & AI | Software, AI, engineering feats |
| 6 | Weird & True | Bizarre real news mixed with satirical fabrications |

**Weird & True claim construction rules:**
- Two claims must be real, verifiable, and cited (same standard as all SoF claims)
- One claim is fabricated in the style of The Onion, Reductress, or The Beaverton
- The fiction claim should be adjacent to real events (not pure absurdism) — it should sound like something that *could* plausibly have happened
- The reveal for the fiction claim explains what Onion-style construction technique makes it identifiable (e.g., "Classic Onion format: oversized civic response to a trivially small personal behavior")

**Gameplay:**
Same as before — the intro card names the topic, three claims listed, user votes on each as Science or Fiction. In-place DOM updates on vote (no scroll jump). Progress pips at top.

**Scoring:**
- Each correct vote: +10
- All three correct: +20 perfect bonus
- Streak bonus on top

**Citations:**
Real claims show a compact citation block: `SOURCE NAME ↗` as a clickable external link. Fiction claims show the explanation only, no citation.

---

## 6. Games (Hidden — Available For Future Activation)

Two games remain fully built but commented out of the hub. One-line uncomment to re-enable.

### 6.1 The Quip

Open-ended wit game. User writes a funny answer to a strange news prompt. Panel of three AI judges rates it. Paused because heuristic judging is brittle and requires an LLM rewrite to feel polished.

### 6.2 The Pulse

Sentiment dial game. Paused because truth positions require survey data sourcing that hasn't been systematized yet. See v1 §10 and the separate sentiment data sourcing memo for recommended data sources (Pew Research, YouGov editorial, AP-NORC, Reuters/Ipsos).

---

## 7. Ask a Friend for Help (Social Growth Loop)

This is the app's primary growth mechanic. It is designed to feel like genuine help, not forced sharing — and to reward both the asker and the helper.

### 7.1 Rename

"Phone a Friend" → **"Ask a Friend for Help"**

The new name is more explicit about the mechanic: you're asking for help, not just calling. The link icon (🔗) replaces the phone icon (📞) to signal that this is a link-sharing action, not a phone call.

### 7.2 In-game placement

The "Ask a Friend for Help" button appears below the main Lock In button on every game's play screen. It uses a dashed border when unused, a green solid border when a hint has been received. Button states:

- **Default:** 🔗 "Ask a Friend for Help"
- **After sharing (waiting):** 🔗 "Waiting for a response..."
- **After hint received:** ✓ "A hint came back — tap to view"

### 7.3 Share flow (unchanged from v1 functionally, updated copy)

1. User taps the button → modal opens titled **"Get Help From a Friend"**
2. A prominent consent notice: *"Anyone with this link can see the question. They don't need an account or the app."*
3. Preview card shows exactly what the friend sees (no answers, just the question)
4. Share options: Copy Link · Send via Messages
5. Waiting state with a pulsing dot
6. When hint arrives: dark inset card with friend's name and message

**Backend needed:** Share token endpoint, friend-facing question view, response submission, WebSocket/polling for notification.

### 7.4 Streak Shield reward

When a friend responds to a help request, **both the asker and the helper earn one Streak Shield**.

A Streak Shield protects the unified daily streak from breaking once. If a player misses a day, one shield is automatically consumed to maintain the streak. The player is notified: *"Your streak was protected by a shield you earned from Alex's help."*

**Shield mechanics:**
- Shields are earned by: (a) a friend responding to your help request, (b) you responding to a friend's help request
- Shields accumulate (you can hold multiple)
- Maximum of 3 shields at one time (to prevent indefinite streak protection)
- Shields are displayed in the Friends tab and as a subtle indicator in the masthead when available (a small shield icon next to the streak flame)

**Why this works as a growth loop:**
- The asker benefits: they get help on a hard question *and* earn a shield
- The helper benefits: they don't need the app installed to help, but they see the question and earn a reward if they do have it — incentivizing install
- The loop is symmetric: helping someone makes you want to be helped back, and vice versa
- The shield is a durable reward (protects something valuable) rather than a transient one (points, badges), which means users will seek it out deliberately

### 7.5 Friends tab

The Friends tab is the third item in the bottom nav. It contains:

**Streak Shields section:**
```
STREAK SHIELDS
🛡 🛡 ___     You have 2 shields available
               Shields protect your streak if you miss a day.
```
Filled shields are solid; empty slots are outlined. Max 3 shown.

**Interaction feed:**
A reverse-chronological list of social interactions. Each entry has:
- A type icon (📩 helped you / 📤 you helped)
- Friend's name
- Which game they helped with
- When it happened (relative: "2 days ago")
- Whether a shield was earned from this interaction

Example entries:
```
📩  Alex helped you with The Lede      2 days ago   🛡 Shield earned
📤  You helped Jordan with The Spread  4 days ago   🛡 Shield earned
📩  Riley helped you with Science or Fiction  1 week ago
```

**Return the favor nudges:**
If a user has received help but hasn't helped anyone back recently, a subtle nudge appears at the top of the feed:

> *"Alex helped you 3 days ago. Got 30 seconds? Return the favor — they have a question open."*

This uses a direct link back to Alex's open question (if one exists and hasn't expired). If no open question exists, the nudge instead reads:

> *"Alex helped you 3 days ago. They might need your brain next time — keep an eye out."*

**Weekly summary:**
At the top of the tab, a small card shows the week's social activity:

```
THIS WEEK
3 friends helped you    ·    You helped 1 friend
🛡 2 shields earned     ·    🛡 1 shield spent
```

**Empty state:**
If no interactions yet:

> *"No friend activity yet. Tap 'Ask a Friend for Help' the next time you're stuck — they'll see just the question, no answers. You both earn a streak shield when they respond."*

---

## 8. Stats Tab

The Stats tab surfaces the data that was previously crammed into the hub or result screens, but makes it opt-in — only users who care about their accuracy will seek it out.

### 8.1 Layout

**Top section: Streak and history**
```
STREAK & HISTORY
🔥 14          📅 47          🏆 22
Daily Streak   Days Played    Best Streak
```

**Shields available:**
```
🛡 🛡 ___   2 shields available
```

**Points summary:**
```
LIFETIME POINTS   1,240 pts
```

**Per-game breakdown:**
A simple table for each active game showing:
- Rounds played
- Correct / total
- Accuracy %
- Best score in a single round

```
THE LEDE
Played: 23    Correct: 18    Accuracy: 78%    Best: +30

THE SPREAD
Played: 19    Correct: 12    Accuracy: 63%    Best: +45

SCIENCE OR FICTION
Played: 21    Correct: 15    Accuracy: 71%    Best: +50
```

**Note on accuracy display:** Accuracy appears here because users navigating to the Stats tab are specifically seeking this information. On the main hub, accuracy was removed because it creates anxiety for casual players and distracts from the streak habit that drives daily retention.

---

## 9. Hub Screen

### 9.1 Masthead

```
No. 0115 · Saturday, April 25, 2026
         Noodle Bowl
    A Daily Mix Of Brain Games
```

The unified streak is displayed below or integrated into the masthead — a flame icon with the streak count. If shields are available, a small shield icon appears next to the flame.

### 9.2 Standing card

```
YOUR STANDING
[Total Points]    [🔥 Daily Streak]    [Days Played]
```

Accuracy removed. Three clean stats. Days Played replaces Accuracy as the third stat — it's a positive frame (how engaged you are) vs. a potentially discouraging one (how often you're wrong).

### 9.3 Game cards

Three game cards, in order:

**N°01 — The Lede (anchor)**
- Slightly taller card with anchor treatment
- Could use a "Today's Edition" subheader or gold accent on the N°01 badge
- The card text emphasizes it's the signature game

**N°02 — The Spread**
**N°03 — Science or Fiction**

Each card shows: section number, section name, game title, tagline, metadata (time estimate, type tag). No per-game streak shown — the unified streak replaces all of them.

---

## 10. Technical Considerations

### 10.1 State structure changes from v1

The state object is simplified significantly:

**Removed:** Per-game streak trackers (`wacky.streak`, `lede.streak`, etc.)
**Removed:** `wacky` as a standalone game in state
**Added:** `dailyStreak`, `bestDailyStreak`, `lastPlayedDate`, `totalDaysPlayed`
**Added:** `streakShieldsAvailable`, `streakShieldUsedToday`
**Added:** `friendInteractions[]` array
**Added:** `activeTab` ('home' | 'stats' | 'friends')

localStorage key should be bumped to `daily_state_v8` to avoid conflicts with existing v7 data.

### 10.2 Daily streak update logic

The streak should be updated when the user completes any game round. The logic:

```
function updateDailyStreak():
  today = getTodayString()  // 'YYYY-MM-DD'
  last = state.stats.lastPlayedDate

  if last == today: return  // already counted today

  if last == yesterday:
    increment streak
  else:
    if shields > 0 and not shieldUsedToday:
      consume shield, preserve streak, mark shieldUsedToday
    else:
      reset streak to 1

  update bestDailyStreak if needed
  set lastPlayedDate = today
  increment totalDaysPlayed
  save state
```

This runs once per calendar day, on the first game completion of the day.

### 10.3 SoF category expansion

The Wacky News bank (`WACKY_BANK` — 15 headlines) needs to be restructured into SoF-compatible claim sets. Each Weird & True topic needs:
- 3 claims total
- 2 real (weird-but-true, sourced and citable)
- 1 fictional (satire-style fabrication with a clear construction note for the reveal)

The existing Wacky News headlines can serve as the real claims. New satirical claims need to be written to complete each set. Estimated work: 5 new Weird & True topic sets using existing real headlines as the real claims.

### 10.4 Backend priorities for growth loop

In priority order:

1. **Share token API** — POST /api/share, GET /api/share/:token (friend sees question), POST /api/share/:token/respond
2. **Shield award logic** — server-side, triggered when a friend submits a response. Awards shields to both parties.
3. **Notification system** — notifies the asker when their friend has responded. Push notification preferred; polling fallback for web.
4. **Return-the-favor link** — GET /api/user/:id/open-question — returns whether the user who helped you has an open unanswered question to reciprocate on
5. **Friend interaction log** — persisted server-side so it survives device changes and app reinstalls

---

## 11. Content Roadmap

### 11.1 Immediate need (for launch)

| Game | Current bank | Target for launch | Priority |
|------|-------------|-------------------|----------|
| The Lede | 5 stories | 30 stories | Critical |
| The Spread | 6 questions | 30 questions | Critical |
| Science or Fiction | 5 topics (+ 0 Weird & True) | 20 topics (incl. 5 Weird & True) | Critical |

### 11.2 Content sourcing

**The Lede:** Requires editorial judgment — each story needs three plausible reporter pitches, one of which is the real ending. Sourced from real news, requires writer time. Cannot be fully automated.

**The Spread:** Numerical facts from news. Can be partly systematized with a search for "survey finds X%" or "costs Y dollars" in reliable sources. Semi-automatable.

**Science or Fiction (standard categories):** Peer-reviewed journals, NASA releases, FDA announcements, NEJM papers. Requires a researcher to verify and write the fictional claim. Semi-automatable with AI assist for fiction generation + human review.

**Weird & True:** The Onion, Reductress, The Beaverton for construction patterns. Real claims sourced from Reuters, BBC, AP, local news oddities. Fully writable by an editor familiar with satirical formats.

### 11.3 Sentiment data for The Pulse (when re-enabled)

When The Pulse game is re-enabled, truth positions should be sourced from:
- **Primary:** Pew Research Center published reports (free, downloadable, topically relevant)
- **Secondary:** YouGov editorial (today.yougov.com) — publishes weekly survey results on current events
- **Secondary:** AP-NORC Center — polls tied directly to news cycles, published as AP stories
- **Tertiary:** Reuters/Ipsos polling, Gallup published reports

Real-time sentiment APIs (World News API, NewsAPI.ai) measure article tone, not human opinion — not suitable as truth-position sources.

---

## 12. Success Metrics

### 12.1 Primary (retention)

- **DAU / MAU ratio:** Target >40%
- **7-day retention:** Target >35%
- **Median streak length (active users):** Target >7 days
- **% users with streak >30 days:** Target >10% at 90 days post-launch

### 12.2 Social growth loop

- **Ask a Friend usage rate:** % of sessions where the button is tapped (target >15% of sessions)
- **Friend response rate:** % of shared links that get a response (target >40%)
- **Shield-driven installs:** New users acquired via friend help links (target >20% of new user acquisition)
- **Return-the-favor click rate:** % of nudges that lead to a help response (target >25%)

### 12.3 Quality

- **Per-game completion rate:** % of started rounds that reach the result screen
- **SoF Weird & True completion vs standard:** Whether the category performs differently (lower completion = confusion, higher = delight)
- **Friend tab open rate:** % of DAU who open the Friends tab (target >30%)

---

## 13. Open Questions

### 13.1 Shield cap

Currently proposed at 3 shields maximum. This prevents indefinite streak protection while still rewarding consistent social activity. Should be tuned based on early retention data — if streaks are breaking despite shields, raise the cap; if shield hoarding becomes common, lower it.

### 13.2 Streak shield notification

When a shield is consumed automatically (user missed a day), should we notify proactively ("Your shield protected your streak!") or let the user discover it passively when they open the app? Proactive notification is more satisfying but requires push permission. Passive discovery via the Friends tab is lower friction. Recommend proactive in-app notification (not push) on first open of the day after a missed day.

### 13.3 The Lede anchor visual treatment

The exact visual differentiation for the anchor game needs design exploration. Options:
- Gold accent on the N°01 badge
- Larger card with a horizontal image or masthead-style header
- A "FEATURED" or "TODAY'S EDITION" label
- Subtle background texture or border treatment

This is a design decision that should be explored in the prototype before committing.

### 13.4 Weird & True claim difficulty

Satirical claims in a Weird & True round may be easier to spot than fabricated science claims (people are more calibrated to Onion-style writing patterns). If early playtest data shows Weird & True accuracy skewing high (>85%), make the satirical claims more adjacent to real events. If it skews low (<50%), give more structural tells in the reveal explanation.

### 13.5 Empty Friends tab onboarding

New users will see an empty Friends tab with no interaction history. The empty state should be inviting rather than hollow. The current proposed copy ("No friend activity yet. Tap 'Ask a Friend for Help' the next time you're stuck...") is functional but could be warmer. Consider a short illustrated explainer of the shield mechanic on first open.

---

## 14. Appendix — Design Decision Log

*(Cumulative — includes decisions from v1)*

### A.1 Why The Lede became the anchor game

The Lede is the most distinctive game in the app. It doesn't exist elsewhere in the market, it captures the editorial personality of Noodle Bowl better than any other game, and it's the most likely to generate "what *is* this — I love it" moments. Wacky News (which previously held the N°01 position) was more of a warmup game — binary, fast, low stakes. The Lede asks more of the player and rewards them more richly. Anchoring on it sets the right expectations for the whole app.

### A.2 Why per-game streaks were replaced with a unified streak

Per-game streaks created multiple competing obligations. A user with a 14-day Lede streak and a 3-day Spread streak is anxious about two things simultaneously, has to play both games to satisfy both streaks, and feels bad about the lower number anyway. Duolingo's insight is that the streak is the product — everything else is just the vehicle for maintaining it. One streak, any game, any day. This also reduces guilt about skipping a game you're not feeling that day, which improves the experience without hurting the retention signal.

### A.3 Why accuracy was removed from the hub

Accuracy is a punishing stat for casual players. A user who's 40% accurate on Science or Fiction is still enjoying the game — they're learning, they're surprised, they're coming back. Showing them a 40% on the hub screen introduces a sense of failure that's antithetical to the app's tone. The Stats tab makes accuracy opt-in for people who find it motivating (competitive players, accuracy-focused learners) without inflicting it on users who just want to play.

### A.4 Why Wacky News merged into Science or Fiction

Wacky News as a standalone binary yes/no game (Real or Satire?) was:
1. Too similar in spirit to Science or Fiction (both test real-vs-fake detection)
2. Too thin as a solo game — a yes/no decision doesn't sustain a game card
3. Better as a *flavor* than a *game*

As the Weird & True category within SoF, the wacky material gets a better frame: instead of "is this real or not?", the question is "which of these three bizarre claims is the fabricated one?" — harder, more interesting, and more in keeping with the Two Truths One Lie format that makes SoF work.

### A.5 Why the social mechanic uses streak shields specifically

The original "Phone a Friend" mechanic had no reward for either party. The share link helped the asker marginally (they got a hint), but the helper got nothing. Streak shields solve this symmetrically:
- The asker gets a hint AND a shield (social interaction = durable reward)
- The helper gets a shield (their help has tangible value even if they don't have the app)

We chose shields over points or badges because shields protect something the user already cares about (the streak), making them feel meaningful rather than cosmetic. Points feel additive and easy; shields feel protective and scarce.

### A.6 Why group/multiplayer was rejected again

See v1 Appendix A.5. The decision stands. The Ask a Friend mechanic is the right v1 social hook. Real synchronous multiplayer is a different product.

---

*End of document — Version 2.0*
