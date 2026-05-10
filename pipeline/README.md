# Content Pipeline

Fetches news and generates daily game content for Noodle Bowl. Runs as a series of
sequential stages — each stage reads the previous stage's output from `pipeline/data/`.

## Stages

```
ingest → select → generate → review → publish
```

| Stage | Script | Output |
|---|---|---|
| ingest | `ingest.ts` + `ingest-weird.ts` | `data/candidates/YYYY-MM-DD.json` + `…-weird.json` |
| select | `select.ts` | `data/selected/YYYY-MM-DD.json` |
| generate | `generate.ts` | `data/generated/YYYY-MM-DD.json` |
| review | `review.ts` | stdout only (human gate) |
| publish | `publish.ts` | Firestore `contentVersions` |

## Commands

### Daily run

```bash
npm run pipeline:ingest        # fetch today's news, Wikipedia, and oddities
npm run pipeline:select        # select candidates for each game
npm run pipeline:generate      # call Claude to generate game content (~2–3 min)
npm run pipeline:review        # spot-check 5 random samples per game type
npm run pipeline:publish       # publish to Firestore (deactivates previous version)
```

### First-time bulk run (60-day bank)

Run once before launch to pre-populate the content bank.

```bash
npm run pipeline:ingest:bulk          # 60-day news + Wikipedia + today's oddities
npm run pipeline:select -- --scale=2  # 2× targets: 60 lede, 60 spread, 120 SoF clusters
npm run pipeline:generate             # ~15–20 min
npm run pipeline:review
npm run pipeline:publish:emulator     # dry run — check http://localhost:4000 first
npm run pipeline:publish              # production publish
```

## Environment variables

Set in `.env.local` (project root):

| Variable | Required | Description |
|---|---|---|
| `THENEWSAPI_TOKEN` | Always | API key from thenewsapi.com |
| `ANTHROPIC_API_KEY` | generate | API key from console.anthropic.com |
| `FIREBASE_PROJECT_ID` | publish | Defaults to `noodle-bowl` if unset |
| `GOOGLE_APPLICATION_CREDENTIALS` | publish (prod) | Path to service account JSON |

## Stage details

### ingest

Writes two files for the same date:

- `YYYY-MM-DD.json` — stories from TheNewsAPI (top/historical news) and Wikipedia "On This Day"
- `YYYY-MM-DD-weird.json` — oddities sourced by scraping AP News, NPR, Sky News, and UPI,
  then resolving each headline to a real article via TheNewsAPI keyword search

**Flags:**

| Flag | Default | Description |
|---|---|---|
| `--days=N` | `1` | Fetch N days of historical data (bulk only; uses N TheNewsAPI calls) |

**API cost:** 1 TheNewsAPI call per day of news + up to 15 for oddities resolution.
Free tier allows 100 calls/day, so `--days=60` uses ~75 of them.

### select

Merges the regular and weird candidate files for the same date, scores every candidate,
and selects targets for each game.

**Scoring weights:**

| Signal | Points |
|---|---|
| Headline under 100 chars | +2 |
| Domain is science / nature / technology | +2 |
| Source is Wikipedia | +2 |
| Summary over 80 chars | +1 |
| Contains a number | +1 |
| Tagged `weird` | +5 |

**Selection targets (daily / bulk):**

| Game | Daily | Bulk (`--scale=2`) |
|---|---|---|
| Lede | 30 | 60 |
| Spread | 30 | 60 |
| SoF clusters | 60 | 120 |

**Flags:**

| Flag | Default | Description |
|---|---|---|
| `--scale=N` | `1` | Multiply all targets by N |

### generate

Calls Claude (Sonnet) to generate game content for every selected candidate.
Skips Lede items that Claude judges as too dry to make a good puzzle (returns `{"skip": true}`).

Quip and Wave are not yet generated — published as empty arrays so the app falls back
to bundled content.

**Requires:** `ANTHROPIC_API_KEY`

### review

Prints 5 random samples of each game type to stdout. Re-run `pipeline:generate` if quality
looks off — there is no automatic retry.

### publish

Reads the latest generated file and writes a new `contentVersions` document to Firestore,
then marks all previous versions inactive.

**Flags:**

| Flag | Description |
|---|---|
| `--emulator` | Publish to the local Firebase emulator instead of production |

**Requires:** `GOOGLE_APPLICATION_CREDENTIALS` for production.

## Data directory

```
pipeline/data/
├── candidates/
│   ├── YYYY-MM-DD.json        # regular ingest output
│   └── YYYY-MM-DD-weird.json  # oddities ingest output
├── selected/
│   └── YYYY-MM-DD.json
└── generated/
    └── YYYY-MM-DD.json
```

Each stage reads the **most recently modified** file from its input directory,
so running ingest and select on the same day will automatically chain correctly.

## StoryCandidate schema

Key fields on every candidate. Full type definition in `types.ts`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | SHA-256 of the article URL (16 hex chars) |
| `headline` | `string` | Article title |
| `summary` | `string` | Article description (truncated to 500 chars for Wikipedia) |
| `url` | `string` | Canonical article URL |
| `source` | `string` | Publisher domain |
| `ingestSource` | `thenewsapi \| wikipedia` | Which pipeline produced this candidate |
| `tags` | `string[]` | Pipeline signals — currently `["weird"]` or `[]` |
| `hasNumber` | `boolean` | Headline or summary contains a numeric value |
| `domain` | `string` | Classified topic: `science`, `nature`, `politics`, `business`, `technology`, `culture`, `general` |
| `sourceArticle` | `TheNewsAPIArticle?` | Full raw TheNewsAPI response (includes `published_at`, `snippet`, `image_url`, etc.) |
| `sourceEvent` | `WikipediaOnThisDayEvent?` | Full raw Wikipedia On This Day event |

## Adding a new ingest source

1. Create `pipeline/ingest-<name>.ts` that writes a `CandidatesFile` to
   `pipeline/data/candidates/YYYY-MM-DD-<name>.json`.
2. Set appropriate `tags` on each `StoryCandidate` (e.g. `['breaking']`).
3. In `select.ts`, add a merge block (pattern: copy the weird merge block and adjust the filename suffix).
4. Add scoring rules for the new tag if the candidates should be prioritised for a particular game.
5. Chain the new script into `pipeline:ingest` in `package.json`.
