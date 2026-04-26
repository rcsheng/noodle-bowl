# Noodle Bowl — Product Requirements Document

**Status:** Working prototype (single-file HTML)
**Author:** Product team
**Last updated:** April 2026
**Document version:** 1.0

---

## 1. Product Overview

### 1.1 Vision

Noodle Bowl is a daily mobile/web brain game app that mixes news, comedy, science literacy, and intuition into short, replayable challenges. It pairs the daily-ritual habit pattern of Wordle and the NYT Games suite with a more varied flavor — trading single-puzzle monotony for cognitive variety.

### 1.2 Tagline

> **Noodle Bowl** — A Daily Mix Of Brain Games
>
> *Stretch your noodle. Daily.*

### 1.3 Positioning

**Existing solutions and their limitations:**
- **NYT Games (Wordle, Connections, Strands):** Excellent ritual mechanics, but limited topical relevance. Same word puzzle every day.
- **Daily News Quiz (NYT, BBC):** Topical, but pure trivia format with limited replay value or shareability.
- **Trivia Crack / QuizUp:** Heavy gamification, but feels mass-market and lacks editorial taste.
- **Jackbox Party Pack games:** Excellent social play, but designed for gathered friend groups, not individual daily ritual.

**Noodle Bowl's wedge:** It owns the intersection of *current news + multiple game formats + editorial wit + daily streak ritual* that no single competitor occupies. It treats news as raw material for play — not a quiz to memorize.

### 1.4 Target audience

- **Primary:** Adults 25–45 who already play Wordle, Connections, or NPR-style daily quizzes. They read the news but don't want their entertainment to feel like homework.
- **Secondary:** Trivia game enthusiasts looking for daily content beyond static apps. Podcast listeners who enjoy panel-format wit (Wait Wait Don't Tell Me, The Skeptics' Guide).

### 1.5 Core value proposition

A short daily session (5–10 minutes total) that flexes multiple cognitive muscles — pattern recognition, numerical estimation, lateral thinking, scientific literacy — using a curated bank of real news stories. Each game produces a shareable result grid for social sharing, and friends can be invited to help via shareable hint links.

---

## 2. Brand and Visual Identity

### 2.1 Visual concept

The design uses an editorial aesthetic — newspaper-coded but warm. Big italic serif typography (Fraunces) paired with monospaced labels (JetBrains Mono) creates a "smart fun" register: not childish, not stuffy.

### 2.2 Color palette

The palette uses a pale blue-gray base with a brick-red accent:

- **Paper (background):** `#e8eef3` — pale blue-gray, calm and neutral
- **Ink (text/borders):** `#1a2030` — deep navy that reads cleanly as black on the cool background
- **Accent (interactive elements):** `#b84a35` — brick red for highlights and CTAs
- **Accent warm (secondary highlights):** `#d97a3c` — warm orange for contrast on dark surfaces
- **Green (correct answers):** `#4a7a3e`
- **Muted text:** `#5a6878`

### 2.3 Typography

- **Headers and prominent text:** Fraunces (italic variant heavily used) — gives the app character and a distinctive editorial feel
- **Labels, metadata, technical text:** JetBrains Mono — used for issue numbers, scoring rules, and small UI chrome

### 2.4 Forced light mode

The app explicitly sets `color-scheme: light only` and uses meta tags to prevent iOS in-app browsers from auto-applying dark mode (which previously broke the design by inverting backgrounds while leaving text colors intact).

---

## 3. Core Mechanics

### 3.1 Game structure

Each game is built around the same shape:

1. **Setup card:** Today's prompt or question, with a streak indicator if active
2. **Play interaction:** Game-specific input (vote, slider, text, multiple choice)
3. **Lock-in confirmation:** Explicit submit step — no accidental submissions
4. **Reveal:** Truth shown, scoring breakdown visible, source citations where applicable
5. **Result and stats:** Shareable result grid (Wordle-style emoji blocks), updated streak, accuracy, and best streak
6. **Next round option:** Try another or return to hub

### 3.2 Scoring

Most games use this base structure:
- **Base points:** Awarded for getting the answer right (typically 10–25 depending on game)
- **Streak bonus:** +2 per consecutive correct day, capped at +20
- **Wrong answers:** Reset streak to zero

Specific games use tiered scoring (closer = more points) or all-or-nothing depending on game format.

### 3.3 Streaks

Per-game streak tracking creates micro-loyalty across each game type. A user can be on a 12-day Wacky News streak and a 3-day Spread streak simultaneously. The hub displays each game's current streak with a flame indicator.

### 3.4 Sharing

Each game produces a Wordle-style result grid: green/red/yellow blocks summarizing the round, the issue number, and the streak status. Designed for copy-paste into iMessage or Twitter without revealing answers to friends who haven't played yet.

---

## 4. Games (Currently Active)

The app currently surfaces four games on the hub. Two additional games (The Quip, The Pulse) are fully built but commented out in the hub for now — they can be re-enabled with a one-line uncomment.

### 4.1 N° 01 — Wacky News (Real or Satire)

**Section header:** "Real or Satire"
**Time to play:** ~1 minute
**Mechanic:** Single yes/no decision

**Description:** A bizarre headline appears in a centered "BREAKING" card. The user decides whether it's real news (📰 Real) or satire (🎭 Satire) — the kind of thing The Onion or Reductress might publish.

**Question bank:** 15 headlines mixing real verifiable stories (Tampa dish-washing burglar, Tuvalu in the metaverse, octopuses punching fish, Switzerland's nuclear shelter law, Italian €1 homes) with fabricated headlines written in the style of major satirical publications.

**Reveal:** Shows the source (e.g., "Tampa Bay Times, 2023" for real ones, "Satire — written in the style of The Onion" for fakes), a green or red verdict stamp on the headline, and a paragraph explaining either why the story is real or what specific Onion-style construction patterns make the satire identifiable.

**Scoring:** +10 base · streak bonus up to +20 · wrong = streak reset

**Why it works:** Tests media literacy. Teaches the user to recognize the *patterns* of satire, which is a transferable skill. Faster than the original "Fact or Fabrication" approach (which compared four options) and distinct from Science or Fiction (which tests scientific literacy with three claims).

### 4.2 N° 02 — The Spread (Numerical Estimation)

**Section header:** "The Number Hunt"
**Time to play:** ~2 minutes
**Mechanic:** Numerical guess with percentage-based scoring

**Description:** A real news question is posed with a hidden number ("How many days did it take ChatGPT to reach 1 million users?"). The user submits their guess.

**Reveal:** A clean two-row comparison shows "Your Guess" vs "The Truth," followed by a large percentage-deviation card displaying how far off the user was, plus a contextual paragraph explaining the real story behind the number.

**Scoring (tiered by percentage off):**
- Within 5% → +25 ("Spot on")
- Within 15% → +15 ("Very close")
- Within 30% → +8 ("In the ballpark")
- Beyond 30% → 0 ("Way off" or "Overshot by a lot")
- Streak bonus on top

**Design note:** This game previously used a simulated "5 fake players to compete against" mechanic, which we removed in favor of pure self-vs-truth scoring. Percentage-based scoring is more honest, easier to understand, and avoids the artifice of competing against fake bots.

### 4.3 N° 03 — The Lede (Bluff Round)

**Section header:** "Finish The Headline"
**Time to play:** ~2 minutes
**Mechanic:** Pick which of three reporters is telling the truth

**Description:** A partial headline appears with the punchline blacked out (e.g., "Scientists Confirm Octopuses Are ___"). Three reporters with distinct personalities each pitch a different completion of the headline:

- **Iris Bellamy — The Naturalist:** Focused on biology, ecology, animals
- **Dex Holloway — The Skeptic:** Pragmatic, dry, fact-checker
- **Pip Calderone — The Optimist:** Hopeful, finds the warm angle

Each reporter card shows their proposed completion in large italic accent-red text, then a thin divider, then their name, role, and a small italic pitch explaining why they think their version is the real one ("I read this in Ecology — they actually punch the fish hunting partners. Full slap. It's wild but documented.").

**Reveal:** The correct completion fills in the blank in the original headline. The truthful reporter's card turns green, the user's wrong pick (if applicable) turns red. An explanation paragraph contextualizes the real story.

**Scoring:** +10 base · streak bonus up to +20 · wrong = streak reset

**Design evolution:** The Lede was originally a Codenames-style word grid puzzle that proved too cryptic. Then a "find three words from the news story among nine" version that was still confusing. The current "guess which reporter is telling the truth" format works because it's a clean three-way bluff with personality. The reporter pitches add the same panel-banter flavor as Wait Wait Don't Tell Me — a confident-sounding wrong answer can feel more convincing than a hesitant right one, which is exactly the cognitive hook that makes bluffing fun.

### 4.4 N° 04 — Science or Fiction (Two Truths, One Lie)

**Section header:** "Two Truths, One Lie"
**Time to play:** ~3 minutes
**Mechanic:** Vote Science or Fiction on three claims independently

**Description:** A topic appears (Animal Behavior, Space & Astronomy, Medicine & Health, Earth & Environment, or Technology & AI). Three claims follow — two are real, one is fabricated. The user votes on each independently as Science (real) or Fiction (fake). A progress indicator at the top shows how many claims have been voted on.

**Reveal:** Each claim is marked as Science or Fiction with a colored tag, the user's pick is shown as right or wrong, an explanation paragraph contextualizes the truth, and **for real claims, a citation block displays the source name as a clickable link with an external-link arrow** (e.g., "NEJM ↗", "NASA ↗", "Nature ↗").

**Citation design:** Citations are displayed compactly with the source name itself as the clickable link — full URLs are hidden behind the link text to avoid line-wrap issues. Sources include peer-reviewed journals (Nature, NEJM, PLOS Biology), agency announcements (NASA, FDA), and news outlets where appropriate (Reuters).

**Scoring:**
- Each correct vote: +10
- All three correct: +20 perfect bonus
- Streak bonus on top

**Inspiration:** Modeled directly after the "Science or Fiction" segment of The Skeptics' Guide to the Universe podcast. The educational angle is meaningful — fabricated claims are often constructed by inverting real findings or inventing plausible numbers, and the explanations teach users how to spot those patterns.

---

## 5. Games (Hidden / Available For Future Activation)

These games are fully built and tested but currently commented out on the hub. They can be re-enabled with a one-line uncomment.

### 5.1 The Quip (Open-Ended Wit)

**Mechanic:** User writes a funny answer to a strange news prompt. A panel of three AI judges with distinct personalities rates it (Like / Meh / Bombed). Win at least 2 of 3 judges to score.

**Panelists:**
- **Margot Vance — The Cynic:** Likes dry, dark, deadpan humor
- **Sunny Park — The Dad Joke Guy:** Likes wholesome, punny, groan-inducing humor
- **Felix Crane — The Chaos Agent:** Likes absurd, weird, nonsensical humor

The panel uses heuristic word matching (dark/wholesome/weird keyword detection) to simulate judging since this prototype runs entirely client-side without an LLM call. Each panelist has 9 reaction lines (3 per scoring tier) for variety.

**Why hidden for now:** Open-ended creative input is harder to build daily content for, and the heuristic judging is more brittle than the structured games. Worth revisiting once the core four games are validated.

### 5.2 The Pulse (Public Sentiment Dial)

**Mechanic:** A news story is presented. The user places a slider on a 0–100 scale between two opposing labels (e.g., "Wholesome ↔ Cursed", "Boring number ↔ Mind-blowing number") to estimate where the public landed on the story. Score is based on distance from the truth position.

**Design note:** This game was originally called "The Wavelength" but was renamed because of the existing Wavelength board game. Other names considered included The Read, The Tilt, and The Mood — The Pulse won for its concision and "reading the public's heartbeat" connotation.

**Why hidden for now:** Sentiment estimation is genuinely hard to source data for (truth positions are necessarily approximate), and the game might benefit from real polling data once we have it. Worth revisiting.

---

## 6. Hub and Navigation

### 6.1 Masthead

The masthead appears at the top of every screen. It shows:

- A monospace date strip ("No. 0115 · Saturday, April 25, 2026") that gives the daily-edition feel
- The title "Noodle **Bowl**" — italic Fraunces, with "Bowl" in accent red
- A small tagline: "A Daily Mix Of Brain Games · Solo Edition"
- Borders above and below using the editorial 4px double-rule treatment

### 6.2 Hub screen

After the masthead, the hub shows:

1. **Hub intro:** "A daily bowl of brain games drawn from the news. Each tests a different muscle. Build streaks across all of them."
2. **Standing card:** Three stats — total points, accuracy percent, total rounds played
3. **"Today's Games" label:** A monospace label introducing the game list
4. **Game cards:** One per active game, with the section number, header, title, tagline, metadata pills (categories, time estimate), and per-game streak indicator if active

### 6.3 Game cards

Each game card uses a distinctive layout:

- **Dark header strip:** Section number ("N° 01"), section name ("Real or Satire"), and a "Play" tag in accent red
- **Body:** Game title in large italic Fraunces, italic tagline below, then a thin border and a metadata row with bullet-separated tags
- **Hover state:** Card lifts on translate, with a colored shadow appearing behind it
- **Streak indicator:** Flame emoji + number appears in the metadata row when the user has an active streak

### 6.4 Footer

The footer reads: "— Stretch your noodle. Daily. —" in small monospace caps. This replaces the previous "Daily games. One newspaper. Played daily." line and plays on the "use your noodle" idiom that fits the new brand naturally.

---

## 7. Phone-A-Friend Sharing Feature

### 7.1 Purpose

Lets users share an unsolved question with anyone — even people without the app — to get help. Built as a UI layer with mock backend; production hooks are clearly marked.

### 7.2 User flow

1. **In-game CTA:** Below the main "Lock In" button on every play screen, a dashed-border button reads: 🔗 **"Get Help — Share A Link With A Friend"**
2. **Modal opens:** Title is "Share This Question." A consent notice prominently warns: 🔗 *"Anyone with this link can view the question. They don't need an account or the app to help."*
3. **Preview card:** Shows exactly what the friend will see when they open the link — the game name, the prompt phrasing, and the question text. Critically, **no answers, no spoilers, no scoring information.**
4. **Share link:** A monospace code shows the URL (`https://noodlebowl.app/help/[token]`) with a copy-to-clipboard button and a "Send via Messages" button (uses `navigator.share()` on mobile, falls back to `sms:` deep link)
5. **Waiting state:** "Waiting for someone to respond..." with a pulsing dot. A "Simulate Response (Demo)" button shows what an incoming hint looks like.
6. **Hint received:** A dark inset card appears in the modal showing the friend's name and message. The in-game button changes to a green checkmark with text "View The Hint You Got Back." Friend hints persist for the round but clear on next round.

### 7.3 Backend hooks needed

The current implementation has every backend call clearly marked with `// TODO:` comments. Production needs:

- `POST /api/share` — creates a share token, returns shareable URL
- `GET /api/share/:token` — friend opens link, receives the question (no answer)
- `POST /api/share/:token/respond` — friend submits their suggestion
- WebSocket or polling to notify the original player of the response

Mock functions (`generateShareToken`, `buildShareUrl`, `getQuestionPreviewForFriend`, `generateMockFriendResponse`) are structured as drop-in replacements — backend integration should be straightforward.

### 7.4 Privacy and safety considerations

The "anyone with the link can view" framing is intentional. Production should consider:

- **Token expiry:** Links should expire after some duration (24 hours is reasonable) to prevent indefinite question circulation
- **Rate limiting:** Prevent abuse via mass-link generation
- **Question privacy:** Don't expose any user identity in the friend-facing question view
- **Optional:** Add light auth (Apple/Google sign-in) on the answering side if abuse becomes a concern

---

## 8. Technical Implementation

### 8.1 Current state

The prototype is a single HTML file (~3,500 lines) at `/mnt/user-data/outputs/the-daily.html`:

- Pure HTML, CSS, vanilla JavaScript — no frameworks
- All game data hardcoded in JS arrays (question banks)
- Self-contained — runs offline in any browser
- Uses `localStorage` for stat and streak persistence (key: `daily_state_v7`)

### 8.2 State management

State is held in a single global `state` object containing:

- Current screen, game, question, selection
- Question bank "seen" tracking per game (avoids repeats until cycle)
- Per-game stats: played, correct, streak, bestStreak
- Total points across all games
- Game-specific input state (text, dial position, votes)

A separate `shareState` object tracks the active share session and stored friend responses by game.

### 8.3 Routing

Screens are managed via a simple state-machine: `state.screen` is checked in the `render()` function and dispatched to the appropriate screen-builder function. Scroll position is preserved on in-screen interactions and reset to top on screen changes.

### 8.4 Production migration path

**For a real app, the migration path is:**

1. **Backend for daily content:** Question banks should be served from an API so content can be updated daily without redeploying. A CMS would let editors add new questions (especially Wacky News headlines and Spread questions) on a regular cadence.
2. **User accounts:** Replace `localStorage` with authenticated user accounts. This enables cross-device sync, leaderboards, and the friend-help backend.
3. **React or Svelte conversion:** The state-machine pattern translates cleanly to a modern framework — each screen becomes a component, the global state object becomes a context or store.
4. **Friend-help backend:** Build the four endpoints described in section 7.3 plus a notification system.
5. **Mobile apps:** React Native or native iOS/Android wrappers for proper push notifications, daily reminders, and home-screen widget support.

---

## 9. Out of Scope for V1

- Group / multiplayer mode (was prototyped and rejected — felt hollow with simulated friends, needs real multiplayer infrastructure to feel alive)
- Push notifications and daily reminders
- Cross-device sync
- Social leaderboards (friends-of-friends rankings)
- In-app premium subscription / paid tiers
- Themed weekly content packs (e.g., "Election Week," "Olympics Edition")
- Editorial CMS for content management

---

## 10. Open Questions and Decisions Needed

### 10.1 Content cadence

**Question:** How many new questions should be added daily, weekly, or monthly to keep the bank fresh?

**Recommendation:** A small editorial team adding ~10 new questions per week per game would create a content runway of several months without users repeating questions. Wacky News and Spread are the most time-sensitive (tied to current news cycles).

### 10.2 Question difficulty progression

**Question:** Should question difficulty escalate based on user history, or stay flat?

**Recommendation:** Stay flat for daily-game psychology. Wordle's lesson is that consistent difficulty matters more than personalization — users want to compare scores fairly across friends. Progressive difficulty would undermine the social-share angle.

### 10.3 Monetization

**Options to consider:**
- Free with daily limit (1 round per game per day, like Wordle), premium for unlimited
- Free with ads, premium ad-free
- Free with weekly themed packs as paid expansions

**Recommendation:** Start free with no monetization to validate retention. Once daily-active-user numbers stabilize, the most natural monetization is themed weekly packs (small one-time purchases) — they fit the editorial brand and don't break free-to-play habit formation.

### 10.4 Re-enabling The Quip and The Pulse

**Question:** When and whether to bring back the two hidden games.

**Recommendation:** Validate the four-game version first. If retention is strong and users ask for more variety, bring back The Pulse (lower complexity, easier to source data for). The Quip's heuristic judging needs an LLM rewrite to feel polished; revisit only if a clear demand emerges.

### 10.5 Group/social play

**Question:** Whether to invest in real multiplayer down the road.

**Recommendation:** The Phone-A-Friend feature is the right v1 social hook — async, lightweight, requires no group coordination. True synchronous multiplayer (Jackbox-style) would be a large engineering investment and a different product entirely. Hold off until daily-solo numbers prove the core loop works.

---

## 11. Success Metrics

### 11.1 Primary metrics (engagement)

- **DAU / MAU ratio:** Target >40% (Wordle hit ~50% at peak)
- **7-day retention:** Target >35%
- **Average daily games played per active user:** Target 2.5+ (out of 4 currently active)
- **Streak length distribution:** % of users on 7+ day streaks, 30+ day streaks

### 11.2 Secondary metrics (virality)

- **Share grid sends per user per week:** Indicates how often users are sharing results
- **Phone-A-Friend usage rate:** % of users tapping the share-with-friend feature
- **Phone-A-Friend response rate:** % of shared links that result in a hint coming back

### 11.3 Quality metrics

- **Per-game completion rate:** % of users who finish a started round (drop-off in The Quip would suggest writer's block; drop-off in Science or Fiction would suggest claims feel too hard)
- **Session length:** Target 5–10 minutes (long enough to feel substantial, short enough to fit in a coffee break)

---

## 12. Appendix — Design Decisions Log

This appendix documents key design decisions made during prototyping, useful for future contributors who might revisit them.

### A.1 Why we removed "Fact or Fabrication"

The original first game asked users to pick the truth among four options, three of which were fabricated. We replaced it with Wacky News (Real or Satire) for two reasons:
1. **Redundancy with Science or Fiction:** Both games tested "real vs. fake" detection. Wacky News tests cultural/satire literacy; Science or Fiction tests scientific literacy. Splitting them reduced overlap.
2. **Speed:** Yes/no decisions are faster than four-way comparisons, which fits the daily-quick-game pattern better.

### A.2 Why The Lede went through three formats

We tried:
1. **Codenames-style word grid:** Too cryptic for daily-game players. Required too much pattern-matching to feel like fun.
2. **Find three words from the story among nine:** Better, but still confusing — users couldn't tell if a word was thematically related or literally from the story.
3. **Pick which reporter is telling the truth (current):** The cleanest version. Three personalities, three pitches, one truth. The bluffing-confidence dynamic is genuinely fun.

### A.3 Why The Spread no longer has fake players

Original version had 5 simulated rivals submitting fake guesses, ranked closest-without-going-over. We removed it because:
1. **It felt artificial.** Players knew the rivals weren't real.
2. **Closest-without-over is hard to teach.** Percentage deviation is intuitive: "you were 12% off."
3. **Honesty.** The score now reflects the user's accuracy, not a fictional competition.

### A.4 Why we forced light color scheme

iOS in-app browsers (especially Instagram, X, Reddit's WebView) aggressively apply dark mode by inverting the page's background. This broke the design — pale backgrounds became black while dark text stayed dark. The fix is a combination of `<meta name="color-scheme" content="light only">`, `color-scheme: light only` in CSS, and `!important` on the body's background and color. Real production should consider building a deliberate dark mode rather than continuing to fight forced inversion.

### A.5 Why we rejected group play (for now)

We prototyped a full group-play mode with simulated friends, room codes, and a unified lobby flow. The feedback was: it felt hollow because the friends were fake. The prototype's effort showed the format works structurally — leaderboards, voting rounds for The Quip, percentage-based scoring for The Spread — but it needs real friends to feel social. The Phone-A-Friend feature is a better v1 social mechanic because it uses real friends (via shared link) without requiring synchronous coordination.

---

*End of document.*
