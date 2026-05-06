# Noodle Bowl — Content Generation Pipeline PRD

**Status:** Draft  
**Last updated:** May 2026  
**Author:** rcsheng  

---

## Overview

Noodle Bowl needs a steady supply of fresh game content to remain worth opening daily. This PRD defines a **low-cost, mostly-automated pipeline** that ingests curated news and science stories, generates structured game content via Claude, and publishes new content versions to Firestore — without requiring a dedicated editorial team.

The design principle is: **one good story feeds multiple games**. A single interesting news item can simultaneously become a Lede question, a Spread number, a SoF claim, a Quip prompt, and a Wave dial. The pipeline's job is to find those stories, structure them per-game, and get them into Firebase.

---

## Goals

- **G1** — Generate enough content for 30+ days of play per content drop, without manual per-item authoring.
- **G2** — Keep total pipeline cost under ~$5/month at solo-builder scale.
- **G3** — Run the full pipeline (ingest → generate → review → publish) in under 2 hours of calendar time per batch.
- **G4** — Minimize operational toil: the happy path should be a single command or script with a brief human spot-check at the end.
- **G5** — Produce content that passes a basic fact-check (real sources cited, numbers verifiable) — not just plausible-sounding fakes.

## Non-Goals

- **NG1** — A real-time or per-user personalized feed. Content is batched and shared across all players.
- **NG2** — An admin UI for editing or scheduling content drops. CLI/scripts only for now.
- **NG3** — Automated deployment to production without human approval. Human always triggers the final publish step.
- **NG4** — Image or multimedia content. Text only.
- **NG5** — Community-submitted content. Solo builder, solo pipeline.

---

## Background: Games That Need Content

Three of the five games require a regularly replenished content bank. Quip and Wave reuse stories that were already sourced for the other games, so they do not require independent sourcing.

### 1. The Lede (`LedeItem`)

A partial news headline is shown with a blank (`...`). Three completion options are displayed as a plain tappable list below the headline; only one is real. (v6 redesign: reporter personas, names, and pitch quotes are no longer displayed.)

| Field | Description |
|---|---|
| `partialHeadline` | The headline text up to the blank, where the unknown portion is replaced with `___` |
| `sourceHint` | Publication and approximate date |
| `panelists[3]` | Each has `completion` (the key field) and `isCorrect`; `name`, `role`, `pitch` are schema artifacts from a prior design — still present in the type but not rendered. Populate with stub values (`""`) or omit from generation prompts. |
| `explanation` | One paragraph confirming the answer |

**Effective pipeline requirement:** Generate `partialHeadline`, `sourceHint`, three `completion` strings (one marked `isCorrect: true`), and `explanation`. The panelist persona fields (`name`, `role`, `pitch`) are vestigial and may be set to empty strings. A future schema cleanup may remove them.

**Best content:** Real, specific, ideally surprising news headlines. The partial must be ambiguous enough that all three completions feel plausible. Weird science, strange laws, odd geopolitical moves, quirky human-interest.

**Wrong completions:** The two fake completions should be funny — absurd but not implausible, in the register of a headline you could almost believe. They should never be numerical (e.g. "47 million", "3 days", "12%") — numerical guessing belongs to the Spread. Keep completions descriptive and qualitative.

### 2. The Spread (`SpreadItem`)

A real news story involving a specific number. Players pick the closest estimate from four multiple-choice options.

| Field | Description |
|---|---|
| `question` | "How many X did Y do / have / take?" |
| `answer` | The real number |
| `unit` | e.g. "days", "miles per hour", "kilograms" |
| `others` | Legacy field — still present in the type but **not used at runtime**. `lib/spreadChoices.ts` generates 3 distractors programmatically from `answer` using seeded random multipliers. Set to `[]` in generated content. |
| `explanation` | Why that number, and comparative context |

**Effective pipeline requirement:** Generate `question`, `answer`, `unit`, and `explanation` only. The four multiple-choice options players see are computed at game time by `spreadChoices.ts`; the pipeline does not need to produce them.

**Best content:** Stories where a specific, verifiable number is the surprising fact — speed records, historical firsts, counterintuitive statistics, viral science findings.

### 3. Science or Fiction (`SofItem`)

Three claims in a thematic cluster; two are real (cited), one is fabricated. Two flavors:
- **Standard**: Two real science/research findings + one plausible-but-false claim in the same domain.
- **Weird & True**: Two bizarre-but-real news stories + one fabricated story in the Onion/McSweeney's style.

| Field | Description |
|---|---|
| `topic` | The thematic cluster label (e.g. "Space & Astronomy") — **this is the dominant 22pt headline in v6 UI** |
| `intro` | One sentence framing the round — **generated but no longer rendered in v6 play phase**; keep for potential future use |
| `weirdAndTrue` | `true` for Weird & True flavor, `false` for standard |
| `claims[3]` | Each has `text`, `isScience`, `explanation`, `source` (name + url, or null for the fabricated claim). Fiction claim is always at index 2 in the data array; the UI shuffles display order. |

**Best content:** Clusters of 3 thematically related claims. The fake claim must be adjacent enough to fool a reasonably informed player. Real claims must have citable peer-reviewed or mainstream-news sources.

### 4. The Quip (`QuipPrompt`) — Derivative

An open-ended writing prompt built from a real weird news story.

| Field | Description |
|---|---|
| `setup` | A sentence framing the story as an open prompt: "Scientists confirmed X. Their new motto is..." |
| `sourceHint` | Brief citation note |

**Content requirement:** Derived entirely from stories already sourced for Lede or SoF. No independent sourcing step.

### 5. The Wave (`WaveItem`) — Derivative

A real story presented as a left/right sentiment dial.

| Field | Description |
|---|---|
| `leftLabel` / `rightLabel` | The two poles of the dial |
| `story` | One sentence summary |
| `truthPosition` | 0–100 integer representing where actual public sentiment sits |
| `explanation` | Why the number is what it is |

**Content requirement:** Same stories as Lede/SoF, with a sentiment dial framing. `truthPosition` is editorial judgment.

---

## Content Sources

Ranked by effort and cost:

### Source A — Email Newsletters (Primary)

**Examples:** Morning Brew, The Browser, Axios Science, WIRED, MIT Technology Review, Numlock News (number-focused), Stat News, The Dispatch.

**Why it works:** Curated by humans already. Items are fresh, news-worthy, and pre-filtered for interestingness. The pipeline consumes them as raw story leads — it does not republish newsletter text.

**Access method:** Gmail MCP. Newsletters arrive in the user's Gmail inbox and can be scraped automatically. The pipeline reads subjects and body text, extracts story candidates, and passes them to the generation step.

**Cost:** Free. Already part of the user's inbox.

**Cadence:** Daily ingest, weekly or bi-weekly batch generation.

### Source B — External News APIs (Daily Automated Ingest)

Three APIs provide machine-readable story candidates without newsletter scraping. These are most useful for an automated daily pipeline that generates content continuously rather than in weekly batches.

#### TheNewsAPI (`thenewsapi.com`)

**Best for:** The Lede (surprising headlines), The Spread (numeric news stories)

- Free plan, no credit card required
- `GET https://api.thenewsapi.com/v1/news/top?api_token=XXX&locale=us&categories=general,science,politics`
- Returns: `title`, `description` (snippet), `source`, `published_at`
- **Important:** Use `title + description` as Claude input only — never display full article text. Copyright protection applies to article prose, not the underlying facts.

#### Wikipedia "On This Day" API

**Best for:** Science or Fiction (historical/science facts), reliable dated sourcing

- Zero auth, no API key required
- `GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{MM}/{DD}` — returns historical events for today's date with summaries
- `GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}` — for any topic page
- Clean source with zero legal ambiguity: all content is CC-BY-SA licensed
- Ideal for SoF Standard rounds: Wikipedia event summaries provide citable science/history facts

#### The Guardian API (`open-platform.theguardian.com`)

**Best for:** Higher-quality science/world content as a TheNewsAPI upgrade

- Free developer key required
- `GET https://content.guardianapis.com/search?q=science&api-key=XXX`
- Full article text permitted with attribution (per developer terms)
- More reliable editorial quality than aggregators

**Legal note on API-sourced content:** The pipeline extracts facts from news (not article text). Trivia questions derived from public facts ("Which country did X sanction?") are not subject to copyright — courts protect original expression, not underlying facts. The design rule is: `title + snippet` as Claude input, never reproduce article prose in game content.

### Source C — Web Search (Verification + Supplemental)

Used for:
1. **Fact verification**: Confirm a story candidate is real and find citable source URLs before including in SoF.
2. **Gap filling**: If a weekly newsletter batch yields too few spread-suitable (numeric) stories, a targeted web search can supplement.

**Cost:** Minimal — only for verification or gap-fill, not as primary ingest.

### Source D — Podcast Transcripts (Supplemental)

Podcasts like _Radiolab_, _Science Friday_, _Freakonomics_, _99% Invisible_, or _Planet Money_ surface deep-dive stories with specific numbers and surprising facts.

**Access method:** `yt-dlp --write-auto-subs` for YouTube auto-captions, or podcast RSS + local Whisper transcription.

**When to use:** When newsletter and API batches are thin (holidays, slow news). Optional and manual.

---

## Pipeline Architecture

### Option 1: Weekly Newsletter Batch (Current Primary Path)

```
[Gmail Ingest]  →  [Story Selection]  →  [Content Generation]  →  [Human Review]  →  [Publish]
```

Run manually, once a week or bi-weekly. Relies on Source A (newsletters) with Source C for verification.

### Option 2: Daily API Pipeline (Recommended for Steady Content)

```
[API Ingest: TheNewsAPI + Wikipedia]  →  [Story Selection]  →  [Content Generation]  →  [Queue]
                                                                                           ↓
                                                                               [Weekly Human Review]  →  [Publish]
```

A daily cron (midnight UTC) fetches from TheNewsAPI and Wikipedia "On This Day", generates content for that day's stories, and accumulates items in a review queue. Once a week, the builder spot-checks the queue and publishes a new content version. This decouples content freshness from manual ingest cadence.

---

## Step-by-Step Pipeline

### Step 1: Ingest

**Trigger:** Manual (`npm run pipeline:ingest`) or daily cron (Option 2).

**What it does:**
- **Source A path:** Reads last N days of newsletters from Gmail via the Gmail MCP.
- **Source B path:** Calls TheNewsAPI top headlines + Wikipedia "On This Day" for today's date.
- Extracts story candidates: headline, one-paragraph summary, URL, source publication.
- Deduplicates against previously ingested stories (keyed by URL or headline hash).
- Classifies candidates: `hasNumber` (regex), `domain` (keyword matching).
- Writes to `pipeline/candidates/YYYY-MM-DD.json`.

**Output schema:**
```json
{
  "candidates": [
    {
      "id": "sha256-of-url",
      "headline": "...",
      "summary": "...",
      "url": "...",
      "source": "TheNewsAPI / Morning Brew / Wikipedia",
      "ingestedAt": "2026-05-05T00:00:00Z",
      "hasNumber": true,
      "domain": "science",
      "ingestSource": "thenewsapi | wikipedia | newsletter"
    }
  ]
}
```

### Step 2: Story Selection

**Trigger:** Automatic, runs after ingest.

**What it does:**
- Scores each candidate: interestingness, Spread suitability (`hasNumber`), SoF suitability (science domain, citable source).
- Groups SoF candidates into thematic clusters by domain.
- Selects target set: 30 Lede, 30 Spread, 30 SoF clusters (2 real + 1 fabricated per cluster).
- Writes to `pipeline/selected/YYYY-MM-DD.json`.

A quick Claude Haiku call (~$0.002 per 100 candidates) scores interestingness more reliably than regex alone.

### Step 3: Content Generation

**Trigger:** Manual (`npm run pipeline:generate`) or automated (Option 2 daily cron).

**Per-game generation:**

| Game | Input | Output | Model |
|---|---|---|---|
| Lede | `title + description` from API or newsletter | `LedeItem` JSON (3 completions, no panelist personas) | Sonnet |
| Spread | `title + description` containing a specific number | `SpreadItem` JSON (`question`, `answer`, `unit`, `explanation`, `others: []`) | Sonnet |
| SoF | Cluster of 2-3 real stories (Wikipedia summaries preferred) | `SofItem` JSON (with fabricated 3rd claim at index 2) | Sonnet |
| Quip | Any Lede/SoF story | `QuipPrompt` JSON | Haiku |
| Wave | Any Lede/SoF story | `WaveItem` JSON | Haiku |

**Claude prompt template (API-sourced content):**

```
System:
You are a trivia question writer for a daily news game called Noodle Bowl.
Generate factual questions only. Never reproduce article text verbatim.
Return only valid JSON matching the schema provided. No prose, no markdown.

User (Lede example):
Headline: "{title}"
Context: "{description}"
Source: {source_name}

Generate one Lede item. The partial headline should cut at a point where all three
completions are syntactically plausible. The two wrong completions should be funny —
absurd enough to entertain but not so ridiculous they're obvious. Do NOT use numbers
or statistics in any completion (e.g. "47 million", "3 days", "12%") — numerical
guessing is the Spread game's domain. The correct completion is the real headline ending.

Return JSON:
{
  "partialHeadline": "...",
  "sourceHint": "{source_name}, {year}",
  "panelists": [
    {"name": "", "role": "", "completion": "...", "pitch": "", "isCorrect": false},
    {"name": "", "role": "", "completion": "...", "pitch": "", "isCorrect": true},
    {"name": "", "role": "", "completion": "...", "pitch": "", "isCorrect": false}
  ],
  "explanation": "..."
}
```

```
User (Spread example):
Headline: "{title}"
Context: "{description}"
Source: {source_name}

Extract the most surprising specific number from this story. Generate one Spread item.
The number must be real and verifiable from the story context. The unit should be concise.

Return JSON:
{
  "question": "...",
  "answer": <number>,
  "unit": "...",
  "others": [],
  "explanation": "..."
}
```

```
User (SoF example — Wikipedia "On This Day" path):
Real events (from Wikipedia):
1. "{summary_1}" (source: Wikipedia, {year})
2. "{summary_2}" (source: Wikipedia, {year})

Topic cluster: {domain}

Generate one SoF Standard item. Claims 0 and 1 are real (use summaries above as source material).
Claim 2 is fabricated — plausible but false, in the same domain. It should fool a reasonably
informed player. Set source to null for the fake claim.

Return JSON:
{
  "topic": "...",
  "intro": "Three claims about {domain}. Two are real; one is fabricated.",
  "weirdAndTrue": false,
  "claims": [
    {"text": "...", "isScience": true, "explanation": "...", "source": {"name": "Wikipedia", "url": "..."}},
    {"text": "...", "isScience": true, "explanation": "...", "source": {"name": "Wikipedia", "url": "..."}},
    {"text": "...", "isScience": false, "explanation": "...", "source": null}
  ]
}
```

**Temperature settings:** 0.3–0.5 for Lede/Spread (accuracy); 0.7–0.8 for SoF fabricated claims and Quip (creativity).

**Estimated cost per full batch (30 items per game):**
- Lede (30 × ~500 tokens Sonnet): ~$0.05
- Spread (30 × ~400 tokens Sonnet): ~$0.04
- SoF (30 × ~900 tokens Sonnet): ~$0.08
- Quip + Wave (60 × ~300 tokens Haiku): ~$0.01
- **Total per batch: ~$0.18**

At weekly batches: **~$0.72/month**. Within G2 goal.

### Step 4: Human Review

**What it is:** A 15–30 minute spot-check before publishing. Not a line-by-line review — a sample check.

**Review checklist:**
- [ ] 5 random Lede items: do the wrong completions feel genuinely plausible? Is the partial a fair cut?
- [ ] 5 random Spread items: is the number real and citable? (API-sourced items may need source URL verification)
- [ ] 5 random SoF items: is the fake claim convincingly wrong? Do real claims have non-null sources with reachable URLs?
- [ ] 3 random Quip prompts: is the setup interesting as an open-ended prompt?
- [ ] 3 random Wave items: does `truthPosition` feel right? Are pole labels clean opposites?
- [ ] No duplicate stories across the batch.
- [ ] No items re-used from the previous content version.

**Tool:** `npm run pipeline:review` prints a random sample to the terminal.

**Remediation:** Delete the item and re-run generation for that story only, or manually edit the JSON.

### Step 5: Publish

**Trigger:** Manual (`npm run pipeline:publish`).

**What it does:**
- Reads the reviewed `pipeline/generated/YYYY-MM-DD.json`.
- Writes a new `contentVersions` doc to Firestore with `active: true`.
- Marks the previous active version `active: false` in the same transaction.
- Prints the new `versionId` for the commit log.

**Safety:** Requires explicit confirmation prompt before touching production. Supports `--emulator` flag for dry-run.

---

## Implementation Phases

### Phase 1 — Manual Pipeline (foundation)

Build the pipeline as a set of scripts run step by step. Validate content quality end-to-end before automating.

**Deliverables:**
- `pipeline/ingest.ts` — Source A (Gmail) + Source B (TheNewsAPI, Wikipedia) → candidates JSON
- `pipeline/select.ts` — Candidates → selected JSON
- `pipeline/generate.ts` — Selected → generated JSON (Claude API)
- `pipeline/review.ts` — Print sample to terminal
- `pipeline/publish.ts` — Generated JSON → Firestore
- System prompts per game in `pipeline/prompts/`
- `.env.local` keys: `THENEWSAPI_TOKEN`, `GUARDIAN_API_KEY` (optional), `ANTHROPIC_API_KEY`

**Acceptance criteria:**
- Running the 5 scripts in sequence produces a valid `ContentBanks` object passing all Zod schemas.
- The published content version appears in the Firebase Emulator and the app loads it without errors.
- Total pipeline time: < 30 minutes compute, < 15 minutes human attention.
- API keys are read from `.env.local` — never committed to the repo.

### Phase 2 — Quality Improvement

After 2-3 manual runs, tune prompts based on observed failure modes.

**Deliverables:**
- Prompt revisions based on what failed human review.
- Automated Zod validation after generation.
- Lightweight Claude Haiku "plausibility check" that flags Lede items where one completion is too obviously correct.
- Duplicate detection against all prior `contentVersions` (headline hash comparison).
- Source URL reachability check for SoF real claims.

### Phase 3 — Daily API Pipeline (optional)

Automate ingestion from TheNewsAPI and Wikipedia to accumulate items continuously.

**Option A (recommended):** GitHub Actions cron runs `pipeline:ingest` + `pipeline:generate` daily at midnight UTC. Accumulates items in `pipeline/queue/`. Builder reviews + publishes weekly.

**Option B:** Full end-to-end automation with email notification when a batch is ready for review. Only worth doing if Phase 1 is running smoothly for several weeks first.

---

## Tooling Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Newsletter scraping | Gmail MCP | Already connected; zero setup |
| Daily news ingest | TheNewsAPI free tier | No credit card; good US coverage; JSON API |
| Historical / science ingest | Wikipedia REST API | Zero auth; CC-BY-SA; reliable for SoF |
| Upgrade path | The Guardian API | Full text allowed; better editorial quality |
| Story selection | Haiku API call | Cheap; regex heuristics miss edge cases |
| Content generation | Sonnet API | Best cost/quality for structured JSON from prose |
| Quip / Wave generation | Haiku API | Derivative task; simpler reformatting |
| Output format | Raw JSON files in `pipeline/` | Simple; no database needed for the pipeline itself |
| Publish step | Wraps existing `seed:prod` logic | No new Firestore code; proven path |
| Scheduling (Phase 3) | GitHub Actions cron | Free tier sufficient; no infra to manage |

---

## Content Freshness Strategy

**Target bank size per content version:** 30–60 items per game. At one item per day, this gives 30–60 days of fresh content per version.

**Target publish cadence:** Monthly (newsletter batch) or weekly (API pipeline with accumulated queue).

**Seen-item tracking:** Already implemented in v5 via `users/{uid}/meta/seen`. When a new `versionId` is published, seen arrays are cleared so all players get a fresh start.

**Overlap policy:** No story may appear in two consecutive content versions. The publish script checks outgoing version headline hashes against the incoming one.

---

## Risk & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Claude generates plausible-but-wrong real citations | Medium | Generation prompt instructs model to only cite sources from the provided input; verification step checks URL reachability |
| TheNewsAPI free tier rate limits | Low | 100 requests/day free; daily pipeline needs ~5 calls |
| Wikipedia API returns sparse results for obscure dates | Low | Fall back to `page/summary/{title}` for specific topics; newsletter source as backup |
| Generated SoF fake claim too obviously wrong | Medium | Haiku plausibility check flags items where fake is rated < 40% believable by a second Claude call |
| Generated Lede partial headline gives away the answer | Medium | Review checklist; generation prompt instructs cut at syntactically ambiguous point |
| Firestore 1 MB document limit exceeded | Low | 60 items × 5 games ≈ 300–400 KB; monitor with `pipeline:publish --dry-run` |
| API keys committed to repo | Medium | Keys in `.env.local` only; `.gitignore` entry; pipeline:ingest exits with clear error if env vars missing |
| `others[]` field populated causes stale distractor data | Low | `spreadChoices.ts` generates choices from `answer` at runtime; `others` value is ignored by the game |

---

## Acceptance Criteria (Phase 1 complete)

- [ ] `npm run pipeline:ingest` reads from Gmail (last 14 days) AND TheNewsAPI + Wikipedia (today), merges and deduplicates, writes ≥ 20 story candidates to `pipeline/candidates/`.
- [ ] `npm run pipeline:select` produces a selected set with ≥ 30 Lede candidates, ≥ 30 Spread candidates, ≥ 10 SoF clusters.
- [ ] `npm run pipeline:generate` produces valid JSON passing all Zod schemas in `packages/shared/`. Lede `panelists` have non-null `completion` and correct `isCorrect` flags; `name`/`role`/`pitch` may be empty strings. Spread `others` is `[]`.
- [ ] `npm run pipeline:publish --emulator` seeds the emulator and the app loads the new content version without errors.
- [ ] `npm run pipeline:publish` (prod) requires a `y/n` confirmation prompt and prints the new `versionId`.
- [ ] Total Claude API cost for a 30-item-per-game batch is logged at the end of `pipeline:generate` and is < $1.
- [ ] No item in the generated batch duplicates any item from the current active content version.
- [ ] API keys are never logged or written to any file outside `.env.local`.

---

## Open Questions

1. **Panelist schema cleanup:** The `LedePanelist` type still carries `name`, `role`, `pitch` fields that the v6 UI no longer renders. Should the schema be simplified to `{ completion: string; isCorrect: boolean }[]` before building the pipeline, or should the pipeline stub those fields and leave the type cleanup for a future PR?

2. **`others[]` field removal from `SpreadItem`:** `spreadChoices.ts` generates distractors at runtime; the `others` field is vestigial. The pipeline should always set `others: []`. A future schema cleanup can remove the field — but this requires a migration of any existing `contentVersions` docs that have real values in `others`.

3. **Cowork newsletter scraping scope:** Full email body or just subject + first 500 characters? Full body gives better story summaries but costs more tokens in the selection step.

4. **`truthPosition` for Wave:** Is editorial judgment (Claude estimating public sentiment) acceptable, or does this need real poll data? For now, editorial is fine — but a UI note saying "based on editorial estimate" may be appropriate.

5. **Content version rollback:** If a published version has a bad item that gets complaints, what's the patch path? A `patch` mode in `pipeline:publish` that updates individual items without a full version bump may be worth adding in Phase 2.
