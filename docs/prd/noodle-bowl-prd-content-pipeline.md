# Noodle Bowl — Content Generation Pipeline PRD

**Status:** Draft  
**Last updated:** April 2026  
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

A partial news headline is shown. Three fictional panelists each offer a different completion; only one is real.

| Field | Description |
|---|---|
| `partialHeadline` | The beginning of the real headline, cut before the reveal |
| `sourceHint` | Publication and approximate date |
| `panelists[3]` | Each has `name`, `role`, `completion`, `pitch`, `isCorrect` |
| `explanation` | One paragraph confirming the answer |

**Content requirement:** Real, specific, ideally surprising news headlines. The partial must be ambiguous enough that all three completions feel plausible. Best sources: weird science, strange laws, odd geopolitical moves, quirky human-interest.

### 2. The Spread (`SpreadItem`)

A real news story involving a specific number. Players pick the closest estimate from a set of options.

| Field | Description |
|---|---|
| `question` | "How many X did Y do / have / take?" |
| `answer` | The real number |
| `unit` | e.g. "days", "miles per hour", "kilograms" |
| `others` | 5 distractor numbers (spread wide — some too low, some absurd) |
| `explanation` | Why that number, and comparative context |

**Content requirement:** Stories where a specific, verifiable number is the surprising fact. Best sources: speed records, historical firsts, counterintuitive statistics, viral science findings.

### 3. Science or Fiction (`SofItem`)

Three claims in a thematic cluster; two are real (cited), one is fabricated. There are two flavors:
- **Standard**: Two real science/research findings + one plausible-but-false claim in the same domain.
- **Weird & True**: Two bizarre-but-real news stories + one fabricated story in the Onion/McSweeney's style.

| Field | Description |
|---|---|
| `topic` | The thematic cluster label (e.g. "Space & Astronomy") |
| `intro` | One sentence framing the round |
| `weirdAndTrue` | `true` for Weird & True flavor, `false` for standard |
| `claims[3]` | Each has `text`, `isScience`, `explanation`, `source` (name + url, or null for fake) |

**Content requirement:** Clusters of 3 thematically related claims. The fake claim must be adjacent enough to fool a reasonably informed player. The real claims must have citable peer-reviewed or mainstream-news sources.

### 4. The Quip (`QuipPrompt`) — Derivative

An open-ended writing prompt built from a real weird news story. Players write the funniest one-liner.

| Field | Description |
|---|---|
| `setup` | A sentence framing the story as an open prompt: "Scientists confirmed X. Their new motto is..." |
| `sourceHint` | Brief citation note |

**Content requirement:** Can be derived entirely from stories already sourced for Lede or SoF. No independent sourcing step needed.

### 5. The Pulse / Wave (`WaveItem`) — Derivative

A real story presented as a left/right sentiment dial. Players place where they think public opinion lands.

| Field | Description |
|---|---|
| `leftLabel` / `rightLabel` | The two poles of the dial |
| `story` | One sentence summary of the story |
| `truthPosition` | 0–100 integer representing where actual public sentiment sits |
| `explanation` | Why the number is what it is |

**Content requirement:** Same stories as Lede/SoF, with a sentiment dial framing. `truthPosition` is editorial judgment (not scraped data) — it represents where a reasonably informed observer would place the needle, not a scientifically measured value.

---

## Content Sources

Ranked by effort and cost:

### Source A — Email Newsletters (Primary)

**Examples:** Morning Brew, The Browser, Axios Science, WIRED, MIT Technology Review, Numlock News (number-focused), Stat News, The Dispatch.

**Why it works:** Curated by humans already. Items are fresh, news-worthy, and pre-filtered for interestingness. The pipeline consumes them as raw story leads — it does not republish the newsletter text.

**Access method:** Cowork email scraping. Newsletters arrive in the user's Gmail inbox and can be scraped automatically via the Gmail MCP. The pipeline reads subjects and body text, extracts story candidates, and passes them to the generation step.

**Cost:** Free. Already part of the user's inbox.

**Cadence:** Daily ingest, weekly or bi-weekly batch generation.

### Source B — Web Search (Verification + Supplemental)

Used for two purposes:
1. **Fact verification**: Confirm that a story candidate is real and find citable source URLs before including it in SoF.
2. **Gap filling**: If a weekly newsletter batch yields too few spread-suitable (numeric) stories, a targeted web search (e.g. "surprising science statistic 2025 site:nature.com OR site:reuters.com") can supplement.

**Access method:** Claude's built-in web search tool during the generation phase.

**Cost:** Minimal — only run for verification or gap-fill, not as the primary ingest loop.

### Source C — Podcast Transcripts (Supplemental)

Podcasts like _Radiolab_, _Science Friday_, _Freakonomics_, _99% Invisible_, or _Planet Money_ regularly surface deep-dive stories with specific numbers and surprising facts.

**Access method:** Two options:
1. **YouTube auto-captions**: `yt-dlp --write-auto-subs` to pull transcripts. Free.
2. **Podcast RSS + Whisper transcription**: Feed the audio URL to a local Whisper model. One-time setup, then free per episode.

**When to use:** When the newsletter batch is thin (holiday weeks, slow news periods) or when a specific domain (economics, environment) needs more depth.

**Cost:** Free (local Whisper) or near-zero (yt-dlp captions). The operational cost is the time to identify which episodes to pull — this should remain optional and manual.

### Source ranking in practice

For a solo builder, the **default weekly run** should rely entirely on Source A (newsletters). Sources B and C are fallbacks invoked manually or on a quarterly basis to beef up thin batches.

---

## Pipeline Architecture

```
[Ingest]  →  [Story Selection]  →  [Content Generation]  →  [Human Review]  →  [Publish]
```

### Step 1: Ingest

**Trigger:** Manual (run `npm run pipeline:ingest`) or scheduled (weekly cron via GitHub Actions or a local cron).

**What it does:**
- Reads the last N days of newsletters from Gmail via the Gmail MCP (or a script using the Gmail API).
- Extracts story candidates: headline, one-paragraph summary, URL, source publication.
- Deduplicates against previously ingested stories (keyed by URL or headline hash).
- Writes candidates to a local JSON file: `pipeline/candidates/YYYY-MM-DD.json`.

**Output schema:**
```json
{
  "candidates": [
    {
      "id": "sha256-of-url",
      "headline": "...",
      "summary": "...",
      "url": "...",
      "source": "Morning Brew",
      "ingestedAt": "2025-04-29T...",
      "hasNumber": true,
      "domain": "science"
    }
  ]
}
```

`hasNumber` and `domain` are cheap heuristics (regex + keyword matching) run during ingest to pre-classify candidates before the generation step.

### Step 2: Story Selection

**Trigger:** Automatic, runs after ingest.

**What it does:**
- Scores each candidate on three axes:
  - **Interestingness** (heuristic: presence of superlatives, extremes, records, surprises)
  - **Spread suitability** (`hasNumber === true` + number is within a graspable range — not "3.7 trillion")
  - **SoF suitability** (science/research domain, citable source)
- Groups candidates into clusters by domain (for SoF thematic grouping).
- Selects a target set: 30 stories for Lede, 30 for Spread, 30 SoF clusters (each needs 2 real + 1 fabricated story in the same domain). Some stories can serve double duty (Lede + SoF or Lede + Spread).
- Writes selected set to `pipeline/selected/YYYY-MM-DD.json`.

**This step is the cheapest place to throw away bad candidates.** A quick Claude Haiku call (~$0.002 per 100 candidates) can score interestingness more reliably than regex.

### Step 3: Content Generation

**Trigger:** Manual (`npm run pipeline:generate`) — runs after selection, before human review.

**What it does:**
For each selected story, calls Claude Sonnet to generate structured JSON matching the game's schema. Separate system prompts per game type.

**Per-game generation calls:**

| Game | Input | Output | Model |
|---|---|---|---|
| Lede | headline + summary + URL | `LedeItem` JSON | Sonnet |
| Spread | headline + summary + number hint | `SpreadItem` JSON | Sonnet |
| SoF | cluster of 2-3 real stories | `SofItem` JSON (with fabricated 3rd claim) | Sonnet |
| Quip | Any Lede/SoF story | `QuipPrompt` JSON | Haiku |
| Wave | Any Lede/SoF story | `WaveItem` JSON | Haiku |

**Why Quip and Wave use Haiku:** They are derivative — just reformatting existing story material. The creative work happened in sourcing and Lede/SoF generation.

**Prompting strategy:**
- System prompt includes the exact TypeScript interface as a schema contract.
- Ask for JSON output only — no prose.
- For SoF: explicitly instruct the model to fabricate one claim that is adjacent and plausible, and to include a `source: null` field on the fake one.
- For Lede: instruct the model to make all three panelist pitches sound equally confident. The incorrect pitches should be wrong but not obviously ridiculous.
- Temperature: low (0.3–0.5) for structured accuracy; higher (0.8) for Quip/SoF-fabrication where creativity matters.

**Estimated cost per full batch (30 items per game):**
- Lede (30 × ~800 tokens): ~$0.07
- Spread (30 × ~500 tokens): ~$0.04
- SoF (30 × ~1200 tokens): ~$0.11
- Quip + Wave (60 × ~300 tokens Haiku): ~$0.01
- **Total per batch: ~$0.23**

At bi-weekly batches: **~$0.50/month**. Well within the G2 goal.

**Output:** `pipeline/generated/YYYY-MM-DD.json` — a complete `ContentBanks` object ready for Firebase.

### Step 4: Human Review

**What it is:** A 15–30 minute spot-check by the builder before publishing. Not a line-by-line review — a sample check.

**Review checklist:**
- [ ] 5 random Lede items: do the wrong completions feel genuinely plausible? Is the partial headline a fair cut?
- [ ] 5 random Spread items: is the number real and citable? Are the distractors spread wide enough?
- [ ] 5 random SoF items: is the fake claim convincingly wrong (not obviously silly)? Do the real claims have non-null sources?
- [ ] 3 random Quip prompts: is the setup funny/interesting as an open-ended prompt?
- [ ] 3 random Wave items: does the `truthPosition` feel right? Are the pole labels clean opposites?
- [ ] No duplicate stories across the batch.
- [ ] No items re-used from the previous content version (check by headline hash).

**Tool:** A simple local script (`npm run pipeline:review`) that prints a random sample to the terminal in readable format. No UI needed.

**Remediation:** If a bad item is found, the reviewer either:
1. Deletes the item from the JSON and re-runs generation for that story only, or
2. Manually edits the JSON (it's just a text file).

### Step 5: Publish

**Trigger:** Manual (`npm run pipeline:publish`).

**What it does:**
- Calls the existing seed script logic, but instead of reading from `constants/data.ts`, reads from the reviewed `pipeline/generated/YYYY-MM-DD.json`.
- Writes a new `contentVersions` doc to Firestore with `active: true`.
- Marks the previous active version `active: false` in the same transaction (existing seed behavior).
- Prints the new `versionId` for the commit log.

**Safety:** Requires explicit confirmation prompt before touching production. Supports `--emulator` flag for dry-run against the local Firebase emulator first.

---

## Implementation Phases

### Phase 1 — Manual Pipeline (foundation)

Build the pipeline as a set of scripts that a human runs step by step. Validate the content quality end-to-end before automating anything.

**Deliverables:**
- `pipeline/ingest.ts` — Gmail → candidates JSON (uses Gmail MCP or a simple `googleapis` call)
- `pipeline/select.ts` — Candidates → selected JSON (heuristic scoring, no Claude call yet)
- `pipeline/generate.ts` — Selected → generated JSON (Claude API, one call per item)
- `pipeline/review.ts` — Print sample to terminal
- `pipeline/publish.ts` — Generated JSON → Firestore (wraps existing seed logic)
- System prompts for each game in `pipeline/prompts/`

**Acceptance criteria:**
- Running the 5 scripts in sequence produces a valid `ContentBanks` object that passes the existing Zod schemas.
- The published content version appears in the Firebase Emulator and the app loads it without errors.
- Total time to run the full pipeline: < 30 minutes of compute, < 15 minutes of human attention.

### Phase 2 — Quality Improvement

After the first 2-3 manual runs, tune prompts based on what actually made it through human review.

**Deliverables:**
- Prompt revisions based on observed failure modes.
- Automated validation step after generation: run each generated item through a Zod parse + a lightweight Claude Haiku "plausibility check" that flags items where all three Lede completions sound equally likely (too hard) or where one is obviously correct (too easy).
- Duplicate detection: hash-based check against all prior `contentVersions` in Firestore.

### Phase 3 — Scheduled Ingestion (optional)

If manual ingestion becomes a bottleneck, automate it.

**Option A (preferred for solo builder):** GitHub Actions cron job runs `pipeline:ingest` weekly and commits the candidates JSON to the repo. The builder still manually triggers generation and publish.

**Option B:** Full automation end-to-end with email notification when a new batch is ready for human review. Only worth doing if the manual pipeline is running smoothly for several weeks first.

---

## Tooling Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Newsletter scraping | Gmail MCP (cowork) | Already connected; zero setup |
| Story selection | Haiku API call | Cheap; regex heuristics alone miss edge cases |
| Content generation | Sonnet API | Best cost/quality for structured JSON from prose |
| Quip / Wave generation | Haiku API | Derivative task; simpler reformatting |
| Output format | Raw JSON files in `pipeline/` | Simple; no database needed for the pipeline itself |
| Publish step | Wraps existing `seed:prod` logic | No new Firestore code; proven path |
| Scheduling (Phase 3) | GitHub Actions cron | Free tier sufficient; no infra to manage |

### Why not a dedicated content CMS?

A CMS (Contentful, Sanity, Notion) would add:
- Monthly cost ($0–$50/month depending on tier)
- Another credential/API to maintain
- An auth system for a team that doesn't exist yet

The pipeline's output is JSON files committed to the repo. That is the CMS. If a second editor ever joins, revisit.

### Why not fine-tuning?

Fine-tuning a model on existing Noodle Bowl content would improve output quality marginally, but:
- Requires ~100+ quality examples to matter
- Costs $8–$30 per fine-tune run
- The quality bar from Sonnet + good prompts is already high

Revisit if prompt engineering hits a ceiling.

---

## Content Freshness Strategy

**Target bank size per content version:** 30–60 items per game. At one item played per day, this gives 30–60 days of fresh content per version.

**Target publish cadence:** Monthly. One batch per month keeps the pipeline light and gives enough lead time to review and fix quality issues.

**Seen-item tracking:** Already implemented in v5 via `users/{uid}/meta/seen`. When a new `versionId` is published, seen arrays are cleared so all players get a fresh start.

**Overlap policy:** No story may appear in two consecutive content versions. The publish script checks the outgoing version's headline hashes against the incoming one.

---

## Risk & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Claude generates plausible-but-wrong real citations (hallucinated sources) | Medium | Generation prompt instructs model to only cite sources it found via web search; verification step checks URL reachability |
| Newsletter batch too thin some weeks (holidays, slow news) | Low-Medium | Source C (podcasts) as fallback; also: a generous bank size means one thin week doesn't require an emergency batch |
| Generated SoF fake claim is too obviously wrong | Medium | Haiku plausibility check flags items where the fake is rated < 40% believable by a second Claude call |
| Generated Lede partial headline gives away the answer | Medium | Review checklist; also: generation prompt instructs model to cut at a point where all three completions are syntactically plausible |
| Firestore 1 MB document limit exceeded | Low | Bank size of 60 items × 5 games is ~300–400 KB. Monitor with `pipeline:publish --dry-run` which prints estimated doc size before writing |
| Gmail MCP authentication expires | Low | Store refresh token in `.env.local`; pipeline:ingest exits with a clear error message if auth fails |

---

## Acceptance Criteria (Phase 1 complete)

- [ ] `npm run pipeline:ingest` reads last 14 days of newsletters from Gmail and writes ≥ 20 story candidates to `pipeline/candidates/`.
- [ ] `npm run pipeline:select` produces a selected set with ≥ 30 Lede candidates, ≥ 30 Spread candidates, ≥ 10 SoF clusters (each with 2 real stories in the same domain).
- [ ] `npm run pipeline:generate` produces valid JSON that passes all Zod schemas in `packages/shared/`.
- [ ] `npm run pipeline:publish --emulator` seeds the emulator and the app loads the new content version without errors or console warnings.
- [ ] `npm run pipeline:publish` (prod) requires a `y/n` confirmation prompt and prints the new `versionId`.
- [ ] Total Claude API cost for a 30-item-per-game batch is logged at the end of `pipeline:generate` and is < $1.
- [ ] No item in the generated batch duplicates any item from the current active content version (checked by headline hash).

---

## Open Questions

1. **Cowork newsletter scraping scope:** Should ingest grab the full email body or just the subject + first 500 characters? Full body gives better story summaries but costs more tokens in the selection step.

2. **SoF fabricated claim authorship:** Should the pipeline generate the fake claim, or should the human pick which real claim to include and write the fake manually? Manual fake-writing is higher quality but defeats the automation goal. Recommend: generate, then flag for human review if the plausibility check score is low.

3. **`truthPosition` for Wave:** Is editorial judgment (Claude estimating public sentiment) acceptable, or does this field need to be grounded in real poll data? For now, editorial is fine — but a note in the game UI saying "based on editorial estimate" may be appropriate.

4. **Content version rollback:** If a published version has a bad item that gets player complaints, what's the path to fix? Currently would require a new seed (new `versionId`). A `patch` mode in `pipeline:publish` that updates individual items without a full version bump might be worth adding in Phase 2.
