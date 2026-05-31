# Noodle Bowl — PRD alpha-v1.2.0

**Status:** Planning
**Last updated:** 2026-05-30
**App Store version:** 1.2.0
**What's new:** Historical weekly content packs; pipeline historical ingest; analytics gates.

---

## Overview

v1.2.0 is a **content depth and analytics** release. v1.1.0 shipped the core social loop and the first public App Store release — now the priority is (1) gathering real user data to inform what to build next, and (2) making past weekly content accessible so new users have something to play while the live week accumulates.

**This release does not ship new games.** The right call is to launch as-is, watch the numbers, and build what the data asks for rather than what feels like the next obvious feature.

| Track | Goal |
|---|---|
| **Analytics gates** | Define measurable targets; do not start v1.3.0 until they are met or deliberately waived |
| **Historical content packs** | Let users browse and play past weekly content packs in-app |
| **Pipeline: historical ingest** | Run quarterly ingests (2025-Q1 through 2026-Q2) to build the historical back-catalogue; increase SoF volume |

---

## 1. Analytics Gates

Before cutting v1.3.0, the following signals must be reviewed and either hit or explicitly waived with a written rationale. These are not launch blockers for v1.2.0 — they are the decision criteria for what comes after it.

### 1a. Retention

| Metric | Target | Why |
|---|---|---|
| Week-1 retention (played ≥ 1 game in week after first session) | ≥ 40% | Below this, any feature investment is premature — fix the core loop first |
| Week-4 streak rate (streak ≥ 4 at 4 weeks in) | ≥ 20% | Streak is the retention mechanic; this validates it's working |

### 1b. Social loop

| Metric | Target | Why |
|---|---|---|
| Challenge or help sent per MAU | ≥ 15% | The social loop is the main differentiator; if nobody uses it, rethink the UX |
| Push opt-in rate (of users who trigger the contextual prompt) | ≥ 50% | Low opt-in = the contextual prompt timing or copy needs work |

### 1c. Content quality

| Metric | Target | Why |
|---|---|---|
| Game completion rate per session (started → reveal) | ≥ 80% | Below 80% signals a game is confusing or unengaging mid-play |
| SoF correct answer rate | 40–65% | Outside this range = too easy or too hard; recalibrate fabricated claim difficulty |

### 1d. Volume gate

Minimum active users before investing in paid features (historical packs monetisation, new games):

| Threshold | Action |
|---|---|
| < 100 MAU | Focus on acquisition and retention only; do not build monetisation |
| 100–500 MAU | Historical packs free to all; monetisation design only |
| > 500 MAU | Consider in-app purchase unlock for historical packs |

---

## 2. Historical Content Packs (in-app)

### Background

The pipeline already writes `contentPacks/{date}` to Firestore for every published week. The app currently only reads the current active week. Historical packs are sitting in Firestore unused.

This feature makes past weekly content browsable and playable — giving new users a backlog to explore and returning users a reason to open the app mid-week.

### 2a. Pack catalogue UI

An "Archive" entry point (Explore tab or new Home section) lists available past packs in reverse-chronological order.

Each row shows:
- Week label: `Week of May 5, 2026`
- Game count badge: `Lede · Spread · SoF`
- Status chip: `FREE` (all packs are free in v1.2.0; monetisation deferred per §1d)

**Firestore source:** Query `contentPacks` ordered by `publishedAt` descending. The app already has read access; no new rules needed.

**Shared type needed:**
```ts
interface PackCatalogEntry {
  date: string;          // ISO date key, e.g. "2026-05-05"
  weekLabel: string;     // "Week of May 5, 2026"
  ledeCount: number;
  spreadCount: number;
  sofCount: number;
  publishedAt: string;   // ISO timestamp
  isFree: boolean;       // always true in v1.2.0
}
```

### 2b. Pack content delivery

When a user taps a past pack, the app fetches `contentPacks/{date}` and loads it as a read-only content session.

**`ContentContext` changes:**
- Add `getPackContent(date: string): Promise<ContentBanks>` — fetches `contentPacks/{date}` from Firestore, caches in AsyncStorage under `pack:{date}`.
- Historical pack sessions do not affect streak or stats — they are clearly labelled as archive play.

**Game screen changes:**
- All five game screens accept an optional `packDate` param that bypasses the current-week content and loads from the pack.
- Streak/stats update calls are skipped when `packDate` is set.
- A visible "Archive — Week of X" banner replaces the CompactMasthead week display.

### 2c. Scope limits for v1.2.0

- **No paywall.** All packs are free. Monetisation design is post-analytics-gate.
- **No progress tracking per pack.** Seen-item tracking works the same as live content; no separate "pack completion" state.
- **No search or filtering.** Reverse-chronological list only.
- **No cross-device sync of archive plays.** Archive plays are ephemeral — they don't write to Firestore stats.

---

## 3. Pipeline: Historical Ingest

### 3a. Quarterly batch ingests

Run the historical pipeline for all quarters not yet ingested. Target: a full back-catalogue from 2025-Q1 through the current quarter before v1.2.0 ships.

```bash
npm run pipeline:historical:2025-q1
npm run pipeline:historical:2025-q2
npm run pipeline:historical:2025-q3
npm run pipeline:historical:2025-q4
npm run pipeline:historical:2026-q1
npm run pipeline:historical:2026-q2   # partial — up to current week
```

Each command ingests, generates, and publishes a batch of content for that quarter's ISO weeks, writing `contentPacks/{date}` docs to Firestore.

**Acceptance criteria:**
- All quarters from 2025-Q1 to current have at least one `contentPacks` doc per ISO week.
- `npm run pipeline:status` shows no gap weeks between 2025-W01 and current week.
- Each pack has ≥ 5 Lede, ≥ 5 Spread, ≥ 5 SoF items.

### 3b. SoF volume boost

Historical packs currently have fewer SoF items than Lede or Spread because the science/health domain filter is strict and the historical ingest sources yield fewer qualifying stories.

**Fixes:**
1. **Loosen domain filter for historical ingest** — allow `technology` and `environment` domains into the SoF pool in addition to `science`, `health`, `nature`.
2. **Wikipedia "On This Day" as supplemental SoF source** — historical events for the target date provide citable facts with zero sourcing friction. The historical pipeline should call the Wikipedia events endpoint for each target date and route qualifying items to SoF.
3. **Minimum SoF target: 8 items per week** — if a week's ingest yields fewer than 8 SoF items, the pipeline logs a warning and the operator can manually supplement before publish.

**Why 8:** The current bundled `SOF_BANK` in `constants/data.ts` has 8 items, which was the empirical floor that made the game feel non-repetitive week-to-week. Match that for historical packs.

### 3c. Backlog quality review

After all quarterly ingests complete, run `npm run pipeline:ui` and spot-check 5 random items per game per quarter for:
- [ ] SoF real claims have reachable source URLs
- [ ] Spread answers are verifiable (not hallucinated numbers)
- [ ] Lede wrong completions are plausible, not numerical
- [ ] No cross-quarter duplicate headlines

---

## 4. Out of scope (deferred to v1.3.0+)

The following are explicitly deferred. Do not scope-creep into v1.2.0.

- **In-app purchase unlock for historical packs** — wait for analytics gate §1d (MAU threshold)
- **New games** (The Year, Real or Onion?, Where in the World?) — wait for retention gate §1a
- **Streak at-risk push notification** — requires queryable per-user stats in Firestore
- **Friend challenged/helped you notification** — requires known recipient UID at link creation
- **Notification preferences screen**
- **Streak milestone celebrations** (4 / 12 / 26 / 52 weeks)
- **Pack completion tracking** (seen-per-pack, pack progress indicators)
- **Monetisation** (StoreKit, Google Play Billing)
- **Architecture docs**
- **Schema cleanup** (`LedePanelist` vestigial fields, `SpreadItem.others`)

---

## Open questions

| Q | Status |
|---|---|
| Should archive plays be completely invisible to streak/stats, or should they contribute to a separate "archive games played" counter? | Leaning no counter for v1.2.0 — simplest path |
| Should the pack catalogue live in the Explore tab or as a new section on the Home tab? | Explore tab preferred — keeps Home focused on the live week |
| What happens if a historical pack was never published (gap week)? | Show greyed-out row with "No content for this week"; do not crash |
