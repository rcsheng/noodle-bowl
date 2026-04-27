# Noodle Bowl — Business Plan

**Prepared:** April 2026  
**Status:** Living document — updated as PRDs evolve  
**Source documents:** PRD v1–v5, Backend PRD v1.1

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Description](#2-product-description)
3. [Market Opportunity](#3-market-opportunity)
4. [Competitive Analysis](#4-competitive-analysis)
5. [Product Roadmap](#5-product-roadmap)
6. [Technical Architecture](#6-technical-architecture)
7. [Content Strategy](#7-content-strategy)
8. [Go-to-Market Strategy](#8-go-to-market-strategy)
9. [Growth & Viral Loop](#9-growth--viral-loop)
10. [Monetization Strategy](#10-monetization-strategy)
11. [Key Performance Indicators](#11-key-performance-indicators)
12. [Team & Operational Requirements](#12-team--operational-requirements)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Open Questions & Decision Backlog](#14-open-questions--decision-backlog)

---

## 1. Executive Summary

**Noodle Bowl** is a daily mobile and web brain game app built around real news. It delivers 5–10 minutes of varied cognitive play — bluffing, numerical estimation, and scientific literacy — through three focused daily games, unified under a single streak mechanic that drives daily return.

The app occupies a clear market gap: the intersection of *daily ritual habit* (Wordle, NYT Games), *current news* (NPR quizzes, daily briefings), and *multiple game formats* (Jackbox-style variety). No single competitor currently owns all three.

**Current state (PRD v5 — April 2026):** A working Expo/React Native app with three active games, a live social challenge/help loop, and a Firebase backend in active integration. Real email/password authentication and cross-device stats persistence (Phase 4) are complete. Content-from-Firestore and E2E testing are in progress.

**The core bet:** That a daily brain game app rooted in real-world news — with a social growth loop that rewards both senders and recipients — can achieve Wordle-like organic spread while building stronger retention than single-format puzzle apps.

---

## 2. Product Description

### 2.1 Vision & Tagline

> **Noodle Bowl** — A Daily Mix Of Brain Games  
> *Stretch your noodle. Daily.*

A short daily session (5–10 minutes) across three distinct games, each testing a genuinely different cognitive skill. Real news is the raw material — not a trivia source, but a springboard for play.

### 2.2 Brand & Identity

The visual identity is editorial: a "smart fun" register that feels like a newspaper you actually want to pick up.

| Element | Detail |
|---------|--------|
| Background | Pale blue-gray `#e8eef3` — calm, paper-coded |
| Text | Deep navy `#1a2030` — reads as clean black |
| Accent | Brick red `#b84a35` — CTAs and highlights |
| Display font | Fraunces (italic) — editorial personality |
| Label font | JetBrains Mono — metadata, scoring |

Forced light mode only (prevents iOS in-app browser dark mode override).

### 2.3 The Three Active Games

#### N°01 — The Lede *(Anchor Game)*
**"Finish The Headline"** · ~2 minutes

A real news headline appears with the punchline blacked out. Three reporters with distinct personalities each pitch their version of the real ending. The player picks which reporter is telling the truth. The bluffing-confidence dynamic — a wrong answer that sounds convincing — creates the same panel-show tension as *Wait Wait Don't Tell Me*.

- Three reporters: Iris Bellamy (The Naturalist), Dex Holloway (The Skeptic), Pip Calderone (The Optimist)
- Scoring: +10 base · wrong = 0
- Anchor position on hub — the most distinctive game in the market

#### N°02 — The Spread *(Numerical Estimation)*
**"The Number Hunt"** · ~2 minutes

A real news question with a hidden number is posed. The player submits their guess and is scored by percentage deviation from the truth.

| Accuracy | Points | Label |
|----------|--------|-------|
| Within 5% | +25 | Spot on |
| Within 15% | +15 | Very close |
| Within 30% | +8 | In the ballpark |
| Beyond 30% | 0 | Way off |

No simulated competitors — score reflects pure self-vs-truth accuracy.

#### N°03 — Science or Fiction *(Two Truths, One Lie)*
**"Two Truths, One Lie"** · ~3 minutes

A topic is presented. Three claims follow — two real, one fabricated. Players vote on each independently as Science or Fiction.

Six categories: Animal Behavior · Space & Astronomy · Medicine & Health · Earth & Environment · Technology & AI · **Weird & True** (bizarre real news vs. satirical fabrications — absorbs the former Wacky News game).

- Real claims: cited (NEJM ↗, NASA ↗, Nature ↗)
- Perfect round bonus: +20 on top of per-claim scoring (+10 each)

### 2.4 Hidden Games (Future Activation)

Two fully built games are commented out pending content and judging improvements:

- **The Quip** — User writes a funny answer; three AI judge personas rate it. Requires LLM rewrite of heuristic judging to feel polished.
- **The Pulse (Wave)** — Sentiment dial estimating where the public landed on a story. Requires sourced polling data (Pew, YouGov, AP-NORC, Reuters/Ipsos).

### 2.5 Core Retention Mechanic

A **single unified daily streak** (Duolingo model) — any completed game on any day counts. This replaced per-game streaks which created anxiety and competing obligations.

**Streak protection via Shields:** Players earn streak shields through the social help loop. A shield auto-consumes to preserve the streak when a day is missed. Maximum 3 shields held at any time.

---

## 3. Market Opportunity

### 3.1 Target Audience

**Primary:** Adults 25–45 who already play Wordle, Connections, or NPR-style daily quizzes. They read the news but don't want entertainment to feel like homework. Podcast listeners who enjoy panel-format wit (*Wait Wait Don't Tell Me*, *The Skeptics' Guide*).

**Secondary:** Trivia game enthusiasts seeking daily content beyond static apps. People looking for shareable daily rituals for their group chats.

### 3.2 Market Context

The daily puzzle game market is proven and large:
- Wordle at peak: ~300M+ plays/day, ~50% DAU/MAU ratio
- NYT Games crossed 1M digital subscribers via Wordle/Connections acquisition pull
- The market rewards apps with high-frequency ritual mechanics over deep single-session engagement

The gap Noodle Bowl addresses: No app combines the **daily ritual habit** of NYT Games, the **topical currency** of news quiz apps, and the **format variety** of Jackbox-style party games into one daily session. Each competitor owns one or two of these legs — not all three.

---

## 4. Competitive Analysis

| Competitor | Strength | Weakness | How NB Differs |
|------------|----------|----------|----------------|
| NYT Games (Wordle, Connections) | Ritual mechanics, massive audience | Single format per game, not topical | NB: 3 formats, news-rooted, social growth loop |
| Daily News Quiz (NYT, BBC) | Topical relevance | Pure trivia, low replay, no shareability | NB: not a quiz — news as raw material for play |
| Trivia Crack / QuizUp | Heavy gamification | Mass-market, no editorial taste | NB: editorial wit, curated content, no in-app ads |
| Jackbox Party Pack | Social play, format variety | Requires group coordination, not daily | NB: async individual daily ritual, social via share links |
| Duolingo | Streak mechanic mastery | Language-learning only | NB: same habit science applied to news literacy |

**Noodle Bowl's wedge:** Owns the intersection of *current news + multiple game formats + editorial wit + daily streak ritual*. Treats news as play, not homework.

---

## 5. Product Roadmap

### Phase 0 — Prototype Complete ✓
- Single-file HTML prototype built and validated
- Four games prototyped; two hidden
- Core mechanics, scoring, and sharing tested

### Phase 1 — Expo App Foundation ✓ Complete (PRD v1–v4)

All frontend social mechanics (challenge/help loops, streak shields, Friends feed, hub played-today states) are shipped. Backend Cloud Functions (challengeCreate/Get/Respond, helpCreate/Respond) are live.

### Phase 2 — Real Authentication *(In Progress — PRD v5 §1)*

**Goal:** Users have real accounts. Stats survive device wipes. Social links are gated behind auth.

Key deliverables:
- Firebase email/password sign-up and sign-in screens (`app/auth/`)
- Anonymous → permanent upgrade via `linkWithCredential` (preserves UID, all stats intact)
- Profile tab: display name, email, sign-out
- Auth gate on Stats and Friends tabs for anonymous users
- "Login to share with friends" modal blocks challenge/help share for anonymous users (no "Members only" language)
- "Challenge [sender] back" sign-up banner shown to anonymous users after completing a received challenge
- Verification email sent on account creation; confirmation screen shown

### Phase 3 — Content from Firestore *(In Progress — PRD v5 §2)*

**Goal:** Content updates without app releases. Stale-while-revalidate caching with bundled fallback.

Key deliverables:
- `ContentContext` / `useContent()` hook powering all 5 game screens
- `contentVersions/{versionId}` Firestore collection; only one `active: true` at a time
- AsyncStorage cache keyed by `versionId`; background revalidation
- Bundled `constants/data.ts` as final fallback
- `npm run seed:emulator` and `npm run seed:prod` scripts

### Phase 4 — Stats Persistence to Firestore ✅ Complete (PRD v5 §3)

Stats now survive uninstall for permanent accounts. Cross-device sync within seconds.

What shipped:
- `lib/statsRepo.ts` + `lib/syncQueue.ts` (outbox pattern, max 50 entries)
- `users/{uid}/meta/stats` and `users/{uid}/meta/seen` Firestore documents
- `MERGE_FROM_SERVER` reducer action with offline-first merge logic
- `friendInteractions` migrated to `users/{uid}/friendInteractions/{id}` subcollection
- `senderName` bug fixed — all 5 game screens pass `displayName` not typed friend name
- Self-challenge guard in `/games/challenge/[token]` — detects sender, shows guard screen
- `ChallengeSignUpBanner` on all 5 game screens for anonymous challenge recipients

### Phase 5 — E2E Testing Framework *(Planned — PRD v5 §4–5)*

Manual two-device smoke testing (Android emulator + iPhone via Expo Go, shared Firebase emulator). Maestro automated E2E deferred until native dev build is practical on Windows.

Smoke checklist covers: challenge flow end-to-end, help flow end-to-end, auth flows, content loading, stats survival.

### Phase 6 — Content Runway

Expand question banks to 30+ per game before public launch (see §7 Content Strategy).

### Phase 7 — Launch & Growth

- App Store and Play Store submission via EAS Build
- Smart deep links (Branch.io) for challenge/help URLs
- Soft launch to primary audience; monitor retention and social metrics

### Phase 8 — Account System Expansion (v2)

Apple/Google SSO (deferred from v5). Friend graphs, leaderboards, real-time stat sync via `onSnapshot`.

### Phase 9 — Monetization (Post-Validation)

Once daily-active-user numbers stabilize and retention is proven, introduce monetization layer (see §10).

---

## 6. Technical Architecture

### 6.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React Native via Expo SDK |
| Routing | Expo Router (file-based) |
| State | React Context + `useReducer` (GameContext) |
| Persistence | Firebase Firestore (replaces `localStorage`) |
| Deep linking | Universal Links (iOS) + App Links (Android) via Branch.io |
| Build/deploy | EAS Build + EAS Submit |
| Notifications | Expo Push Notification Service |

**Key routes:**
- `app/(tabs)/index.tsx` — Hub
- `app/(tabs)/friends.tsx` — Friends tab
- `app/games/[game].tsx` — Game screens (lede, spread, sof, wave, quip)
- `app/games/challenge/[token]` — Challenge deep link handler *(to be built)*
- `app/games/help/[token]` — Help link handler *(to be built)*

**Shared types:** `packages/shared/types.ts` — shared between Expo app and Firebase Functions.

### 6.2 Backend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Auth | Firebase Email/Password + Anonymous | Anonymous first-launch; `linkWithCredential` upgrades to permanent account preserving UID |
| Database | Firestore | Real-time `onSnapshot` for Friends feed; direct client writes for stats |
| API | Cloud Functions (TypeScript) | Serverless; `firebase deploy --only functions` |
| Real-time | Firestore `onSnapshot` | Friends feed live updates; fallback for push-denied users |
| Push | Expo Push API (via Cloud Functions) | Single endpoint for iOS + Android |
| Hosting | Firebase Hosting | Web challenge page served here |
| Validation | zod | Client-side schema validation for all auth inputs |

**Cloud Functions:**
- `challengeCreate` — creates challenge token (idempotent per uid+game+question+day), stores in Firestore
- `challengeGet` — serves question data to friend (excludes sender answer pre-submit)
- `challengeRespond` — records friend's answer, pushes notification to sender, returns comparison data
- `helpCreate` — creates help request token
- `helpRespond` — records helper's answer, pushes notification to asker

**Auth flows (v5):**
- First launch → `signInAnonymously()` → app fully playable
- Sign-up → `linkWithCredential(EmailAuthProvider)` → same UID retained, all stats preserved
- Sign-out → immediately returns to fresh anonymous session (never unauthenticated state)
- Sign-in on new device → reads `users/{uid}/meta/stats` from Firestore → merges with local

### 6.3 Firestore Schema (v5)

```
contentVersions/{versionId}
  versionId, publishedAt, active (bool), banks: { lede, spread, sof, quip, wave }

users/{uid}
  displayName, email, isAnonymous, createdAt, lastLoginAt

users/{uid}/meta/stats           ← singleton; debounced write after every game
  totalPoints, dailyStreak, bestDailyStreak, lastPlayedDate, totalDaysPlayed
  streakShieldsAvailable, streakShieldUsedToday
  lede/spread/sof/quip/wave: GameStats
  contentVersionId, updatedAt

users/{uid}/meta/seen            ← singleton; which questions user has seen
  lede/spread/sof/quip/wave: number[]

users/{uid}/friendInteractions/{id}
  type, friendName, gameId, questionIndex, date, shieldEarned
  token, senderPrediction, friendAnswer, bonusPointsEarned

challenges/{token}               ← existing; unchanged
helpRequests/{token}             ← existing; unchanged
pushTokens/{uid}                 ← existing; unchanged
```

### 6.4 Repo Structure

```
noodle-bowl/
├── app/                    ← Expo Router screens
│   ├── (tabs)/             ← home, explore, friends, profile
│   ├── games/              ← lede, spread, sof, wave, quip, challenge/[token]
│   └── auth/               ← sign-up, sign-in, forgot-password
├── components/             ← UI components (ChallengeModal, ChallengeSignUpBanner…)
├── constants/              ← Bundled game data fallback, theme, utilities
├── context/                ← AuthContext, ContentContext, GameContext, gameReducer
├── lib/                    ← authApi, contentRepo, statsRepo, syncQueue, pushTokens, firebase, logger
├── packages/shared/        ← Shared TypeScript types (app + functions)
├── functions/src/          ← Firebase Cloud Functions
├── e2e/                    ← Maestro flows + smoke scripts (Phase 5)
├── docs/prd/               ← PRDs (v1–v5, backend v1.1)
├── business/               ← Business plan, marketing, finance etc.
├── firebase.json
├── firestore.rules
└── firestore.indexes.json
```

### 6.4 Local Development

Firebase Emulator Suite (Firestore, Auth, Functions) enables full end-to-end testing of the social loop on two simulators with no cloud usage:

```bash
firebase emulators:start
```

---

## 7. Content Strategy

### 7.1 Current Bank vs. Launch Target

| Game | Current Bank | Launch Target | Gap | Priority |
|------|-------------|---------------|-----|----------|
| The Lede | 5 stories | 30 stories | 25 | Critical |
| The Spread | 6 questions | 30 questions | 24 | Critical |
| Science or Fiction | 5 topics (0 Weird & True) | 20 topics (incl. 5 Weird & True) | 15+ | Critical |

At launch-minimum banks (30/30/20), a daily user playing all three games gets ~4–6 weeks before any question repeats, assuming one new question served per game per day.

### 7.2 Sourcing by Game

**The Lede** — Requires the highest editorial effort. Each story needs: a real headline with a newsworthy punchline, three believable completions (two wrong, one right), each with a confident personality-appropriate pitch. Cannot be automated — requires a writer familiar with the source material.

**The Spread** — Numerical facts from reliable news sources. Search patterns: "survey finds X%", "costs $Y billion", "took N days". Semi-automatable with AI assistance + human accuracy review. Sources: Reuters, AP, Bloomberg, scientific papers.

**Science or Fiction (Standard)** — Peer-reviewed journals (Nature, NEJM, PLOS Biology), NASA releases, FDA announcements. Two real claims need sourcing and citation; one fictional claim is written by inverting or extrapolating from real findings. Semi-automatable with AI for fiction drafting + human review.

**Weird & True (SoF category)** — Real claims sourced from news oddities (Reuters, BBC, AP, local press). Fictional claim written in the style of The Onion, Reductress, or The Beaverton. Fully writable by an editor familiar with satirical formats. Existing 15 Wacky News headlines seed the real-claims bank.

**The Pulse / Wave (future)** — Truth positions sourced from: Pew Research Center (primary), YouGov editorial (secondary), AP-NORC, Reuters/Ipsos. Real-time sentiment APIs (NewsAPI.ai) measure article tone, not human opinion — not suitable.

### 7.3 Ongoing Content Cadence (Post-Launch)

**Target:** ~10 new questions per week per game = a rolling content runway that stays several months ahead of the most active players. Wacky News/Spread are most time-sensitive (current events); Science or Fiction topics have a longer shelf life.

**Editorial review checklist per question:**
- Accuracy verified against primary source
- Citation URL functional and accessible
- Fictional claim is plausible but not real
- Reveal explanation teaches the pattern, not just the answer
- No political bias in framing; avoids polarizing hot-button topics where possible

---

## 8. Go-to-Market Strategy

### 8.1 Launch Sequence

| Stage | Trigger | Goal |
|-------|---------|------|
| Alpha | Frontend v4 checklist complete | Internal testing, catch bugs |
| Private Beta | Backend Phases 2a–2b live | 50–200 invited users; validate social loop |
| Soft Launch | Backend Phase 2c–2d + 30+ questions/game | Small public release; App Store listing live |
| Growth Push | >35% 7-day retention confirmed | Invest in distribution |

### 8.2 Distribution Channels

**Primary (organic):**
- Wordle-style result sharing — emoji grid posted to group chats, Twitter/X, Threads
- Challenge links — friends pulled in to play specific questions without app install (web-first experience)
- Help links — friends pulled in to assist; earns both parties a streak shield

**Secondary:**
- App Store Optimization (ASO) — keywords: daily game, brain game, news quiz, word puzzle, trivia
- Product Hunt launch — editorial quality and original mechanic make for a strong PH story
- Podcast placement — natural fit for shows about media literacy, games, or news (NPR, The Vergecast, etc.)
- Press — the "news literacy as play" angle is a press-friendly narrative

**Owned channels:**
- Email list (optional) — weekly streak summary email as re-engagement tool
- Push notifications — "Today's edition is ready" daily reminder (require permission)

### 8.3 Platform Priority

1. **iOS app** — Primary audience skews Apple; App Store quality signal matters
2. **Android app** — EAS Build handles both simultaneously
3. **Web** — Friend-facing challenge/help experience is web-first; full PWA is a future option

---

## 9. Growth & Viral Loop

The social growth loop is the primary acquisition engine and a secondary retention driver. It has two entry points, intentionally separated:

### 9.1 Entry Point A — "Stuck? Ask a Friend" (Pre-Answer)

**Moment:** Player is uncertain, stuck on a question.  
**Action:** Shares a help link; friend receives the question (no answer), submits a hint.  
**Reward:** Both asker and helper earn one Streak Shield.  
**Why it works:** The shield is durable (protects something the player already cares about) rather than cosmetic. Friends who help are incentivized to install — they get a shield for doing so.

### 9.2 Entry Point B — "Challenge a Friend" (Post-Answer)

**Moment:** Player just answered, feels confident or competitive.  
**Action:** Predicts how friend will answer → shares challenge link → friend plays on web without install.  
**Reward:** +10 bonus points when friend completes challenge.  
**The hook:** The predict-your-friend step transforms a passive share into an active bet. The comparison screen ("You picked Dex · Alex picked Pip · Correct: Pip") is the emotional payoff that drives both parties back to the app.

### 9.3 Web-First Friend Experience

Friends open challenge/help links in a mobile-optimized web page — no account, no install required. The game plays fully in-browser. After completing the challenge, they see the comparison screen, then a download CTA at peak engagement. Smart deep links (Branch.io) route existing users directly into the app.

This is structurally identical to Wordle's spread mechanism: play without friction, download at moment of peak desire.

### 9.4 The Flywheel

```
Player plays daily game
    → Player gets stuck or finishes a round
        → Shares help link or challenge link
            → Friend plays on web (no install needed)
                → Friend sees comparison / earns shield
                    → Friend installs app
                        → New player plays daily game
                            → New player challenges their friends
                                → Flywheel continues
```

---

## 10. Monetization Strategy

### 10.1 Phase 1: Free, No Monetization (Validation)

During the validation phase, the app is fully free with no monetization. The goal is to build a retention baseline and prove the core loop works. Introducing monetization before retention is validated risks optimizing for the wrong signal.

**Validation threshold:** Hold on monetization until DAU/MAU >35% and 7-day retention >30%.

### 10.2 Monetization Options (Post-Validation)

| Model | Description | Fit |
|-------|-------------|-----|
| **Themed content packs** | Small one-time purchases for themed question sets ("Election Week", "Science Showdown", "Sports Edition") | High — matches editorial brand, doesn't break habit formation |
| **Premium tier (ad-free)** | Free with ads; Premium removes ads | Medium — ads can degrade editorial tone; premium feels appropriate |
| **Daily limit + premium** | Free: 1 round/game/day (like Wordle). Premium: unlimited replays, bonus questions | Medium — limits may hurt social loop (challenge mechanic needs completion) |
| **Subscription** | Monthly/annual for premium features (stats, exclusive game types) | Low for v1 — feature set not differentiated enough yet |
| **Sponsors/editorial partners** | Branded question sets from news organizations (NPR, The Atlantic) | High long-term — aligns with brand, non-interruptive |

**Recommended initial path:** Start with **themed content packs** as one-time IAP. They fit the editorial brand ("buy this week's Olympic Edition"), don't gate the daily free loop, and create natural marketing hooks. Explore **editorial sponsorships** once the brand is established.

### 10.3 Revenue Model Sketch (12 Months Post-Launch)

Rough illustrative projection — not a financial forecast:

| Scenario | MAU | DAU/MAU | Paying Users | ARPU | Monthly Revenue |
|----------|-----|---------|-------------|------|----------------|
| Conservative | 10,000 | 35% | 5% | $2 | $500/mo |
| Base | 50,000 | 40% | 8% | $3 | $4,000/mo |
| Optimistic | 200,000 | 45% | 10% | $4 | $16,000/mo |

Primary cost driver is content production (editorial labor) and Firebase usage. Infrastructure costs at sub-100k MAU are negligible on Firebase's free/Spark tier.

---

## 11. Key Performance Indicators

### 11.1 Retention (Primary)

| Metric | Target | Notes |
|--------|--------|-------|
| DAU / MAU ratio | >40% | Wordle peaked ~50% |
| 7-day retention | >35% | Benchmark for habit-forming games |
| Median streak (active users) | >7 days | Indicates habit formation |
| % users with 30+ day streak | >10% at Day 90 | Power-user indicator |

### 11.2 Engagement

| Metric | Target |
|--------|--------|
| Average games played per DAU | >2.5 (of 3 active) |
| Per-game completion rate | >85% |
| Session length | 5–10 minutes |
| Friends tab open rate | >30% of DAU |

### 11.3 Social Growth Loop

| Metric | Target | Notes |
|--------|--------|-------|
| Ask for Help usage | >15% of sessions | Pre-answer button tapped |
| Help response rate | >40% | Of shared links that get a response |
| Challenge send rate | >25% of sessions | Post-reveal button tapped |
| Challenge accept rate | >50% | Of challenge links played |
| Web → App conversion | >20% | Friends who play on web then install |
| Shield-driven installs | >20% of new users | Via help links |
| Challenge-driven installs | >15% of new users | Via challenge links |
| Return-the-favor click rate | >25% | Nudges that generate a response |

### 11.4 Content Quality

| Metric | Target |
|--------|--------|
| Weird & True completion vs. standard SoF | Within 10% — parity indicates appropriate difficulty |
| Assists counter accuracy | Actual count (not 0) — requires `gave_help` recording |
| Challenge URL decode success rate | 100% — all tokens must round-trip cleanly |

---

## 12. Team & Operational Requirements

### 12.1 Current State

Solo developer project. All product, engineering, and design work to date is done by one person.

### 12.2 Minimum Viable Team (Launch)

| Role | Commitment | Responsibility |
|------|-----------|---------------|
| **Founder / Engineer** | Full-time | Frontend (Expo/RN), Firebase backend, EAS build, deployment |
| **Content Editor** | Part-time (5–10 hrs/week) | New question writing, accuracy review, The Lede stories, Weird & True |

The content editor role is the first critical hire. The limiting factor for growth is question bank depth, not engineering. An editor with news literacy and some comedy sensibility (not necessarily a developer) is the right profile.

### 12.3 Growth-Phase Team (Post-Validation)

| Role | When Needed |
|------|------------|
| Growth / Marketing | After soft launch, when retention is proven |
| Second engineer | When backend complexity justifies (leaderboards, accounts, v2 social) |
| Designer | For the anchor game visual treatment, marketing assets, App Store graphics |
| Content operations | When question volume requires systematization (editorial CMS, AI-assisted drafting) |

### 12.4 Tools & Infrastructure

| Category | Tool | Cost |
|---------|------|------|
| App framework | Expo + EAS | Free tier / ~$99/mo EAS Production |
| Backend | Firebase | Free (Spark) up to ~50k MAU; Blaze pay-as-you-go after |
| Deep links | Branch.io | Free up to 10k MAUs |
| Push notifications | Expo Push | Included in Expo |
| Analytics | Firebase Analytics or Mixpanel | Free tier sufficient at launch |
| Crash reporting | Sentry (RN SDK) | Free tier |
| ASO | AppFollow or manual | ~$30/mo or free |
| Version control | GitHub | Free |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Content bank depleted before launch** | High | High | Begin editorial content sprint now; target 30+ per game before soft launch |
| **Social loop fails (challenge/help not used)** | Medium | High | Monitor usage in beta; if <5% usage, test copy and placement changes before assuming mechanic is wrong |
| **Streaks break and users churn** | Medium | High | Shield mechanic limits this; monitor shield earn/spend ratio; raise cap if streaks break despite shields |
| **App Store rejection** | Low | Medium | No obviously objectionable content; news-based satire is fine; review content before submission |
| **Firebase costs spike unexpectedly** | Low | Medium | Set Firebase budget alert at $50/mo; `onSnapshot` listeners are efficient; add rate limiting in hardening phase |
| **Web challenge page degraded experience** | Medium | Medium | Keep web page as stripped-down but fully styled HTML; test on iOS Safari and Android Chrome before launch |
| **Weird & True accuracy skew** | Medium | Low | If >85% accuracy, harden fictional claims; if <50%, improve reveal explanations — iteratively tunable |
| **Competitor launches similar product** | Low | High | First-mover with a distinctive format (The Lede especially) is hard to copy quickly; brand and content depth are moats |
| **Heuristic judging in The Quip feels broken** | High (already known) | Low | Game is hidden; requires LLM rewrite before re-enabling — not a launch risk |
| **`linkWithCredential` fails mid-upgrade** | Low | High | Wrapped in try/catch; retains anonymous session and shows retry CTA; stats not lost |
| **Firestore content doc exceeds 1 MB limit** | Low | Medium | Seed script monitors doc size; split per-game at 700 KB threshold |
| **Stats outbox grows unbounded (extended offline)** | Low | Low | Hard cap at 50 entries; oldest dropped on overflow; user sees no disruption |
| **Two-device E2E flakiness** | Medium | Low | Maestro `retry: 2`; unique simulator UDIDs; health check before each flow |

---

## 14. Open Questions & Decision Backlog

These are unresolved decisions from PRDs v1–v4, organized by urgency.

### Before Launch

| # | Question | Recommendation from PRDs |
|---|---------|--------------------------|
| 1 | Shield cap: how many shields max? | 3 (current); tune up if streaks break despite shields, tune down if hoarding |
| 2 | Streak shield notification: proactive or passive? | In-app proactive notification on first open after missed day (not push) |
| 3 | The Lede anchor visual treatment | Design exploration needed: gold N°01 badge, taller card, "Today's Edition" label — pick one |
| 4 | Challenge from wrong answer: show CTA? | Yes, always — adjust copy ("Think they'd do better?" vs. "Think they'd get this?") |
| 5 | Anonymous challenge responses: name prompt? | Single optional first-name prompt before Lock In — meaningful emotional payoff, low friction |
| 6 | Challenge expiry UX | Hard block with warm copy + strong download CTA; expired = redirect to current app |

### Post-Launch

| # | Question | Recommendation |
|---|---------|----------------|
| 7 | When to re-enable The Pulse | After core three games validated; requires sourced polling data (Pew, YouGov, AP-NORC) |
| 8 | When to re-enable The Quip | Only after LLM judging rewrite; heuristic judging is too brittle for production |
| 9 | Group/multiplayer | Hold off until daily-solo numbers prove the core loop; real synchronous multiplayer is a different product |
| 10 | Question difficulty progression | Stay flat — consistent difficulty enables fair friend comparisons (Wordle's lesson) |
| 11 | `questionIndex` collision in SoF Weird & True | Add `weirdMode: boolean` to `FriendInteraction` to unambiguously identify SoF question variant |
| 12 | Question freshness in challenge mode | 24-hour expiry handles staleness; hard block on expired tokens |

---

### v5 Success Criteria (from PRD v5 §8)

- [ ] Anonymous user can upgrade to permanent without losing stats
- [ ] Stats survive uninstall on a permanent account
- [ ] Game content updates without an app release
- [ ] Single-device E2E smoke runs in CI on every PR
- [ ] Cross-device E2E runs nightly and passes
- [ ] All five interaction types verified end-to-end
- [ ] No regression in existing unit tests (100 app tests + 56 function tests)
- [ ] Coverage maintained: 80%+ lines/branches for new code

---

*End of business plan — updated April 2026 (PRD v5)*  
*Next review: after Phases 2 (Auth) and 3 (Content from Firestore) ship*
