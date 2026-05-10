# Noodle Bowl — Game Backlog

Ideas for future games. None of these are in scope for the base game (v6). Add to this list freely; promote to a full PRD when a game is ready to spec.

---

## Game Ideas from News + History APIs

These ideas emerged from the content pipeline API research (May 2026). They rely on TheNewsAPI and hand-researched content already flowing through the pipeline.

---

### The Year

**One-line pitch:** A historical event summary is shown. Guess the year it happened.

**Source:** Wikipedia "On This Day" API — `GET /feed/onthisday/events/{MM}/{DD}` returns a list of historical events for today's date going back centuries.

**Mechanic:** Show a one-sentence event summary (e.g., "The Eiffel Tower was officially opened to the public"). Present four year choices: the real year + three plausible alternatives spread across the same era. Single tap to lock in.

**Why it works:** Wikipedia "On This Day" produces one fresh batch of high-quality historical events every day with zero manual curation. The pipeline already plans to use this source for SoF — a Year game is a near-free byproduct.

**Scoring:** Points scaled by proximity (exact = +10, off by ≤5 years = +7, off by ≤20 years = +4, else 0).

**Variants:**
- "Order these 3 events from earliest to latest" (sequence game)
- "How many years ago did this happen?" (Spread-style estimation)

---

### Real or Onion?

**One-line pitch:** Three headlines — some real (from TheNewsAPI), some AI-generated in the style of satirical outlets. Tap the fake(s).

**Source:** TheNewsAPI for real headlines; Claude to generate convincing satirical fakes in the style of The Onion, McSweeney's, or The Beaverton.

**Mechanic:** Structurally identical to SoF — tap the fake — but the content is headlines rather than science claims. The game tests media literacy and awareness of how real news can sound stranger than satire.

**Why it's different from SoF:** SoF is domain-specific (science clusters). Real or Onion is purely about headline tone and plausibility — broader appeal, faster to play (no explanations needed for wrong guesses).

**Pipeline note:** Claude already generates SoF fabricated claims. Generating satirical fake headlines is a cheaper, simpler version of that task (Haiku-tier).

---

### Where in the World?

**One-line pitch:** A news headline and snippet is shown. Pick which country or region it's from.

**Source:** TheNewsAPI supports filtering by `locale` — the pipeline can tag each candidate with its origin locale during ingest.

**Mechanic:** Show headline + one-sentence snippet (source name hidden). Four multiple-choice regions or countries. Single tap to lock in.

**Why it works:** TheNewsAPI already returns `source` and implicitly locale data. The pipeline can bucket stories by region during selection. Tests geographic news awareness in a way the current games don't.

**Content challenge:** Many top headlines are US-centric. Need intentional locale diversity in the ingest query — fetch from `locale=us,gb,au,ca,in,za` in separate calls to ensure global coverage.

---

## Historical Content Packs

Infrastructure for selling past daily content as purchasable packs. The pipeline-side foundation (local SQLite DB + `contentPacks/{date}` Firestore writes) is already implemented. What remains is the app-side unlock and delivery system.

### Deferred app-side work

**Pack catalog**
- A `contentPackCatalog` Firestore collection (or aggregated query over `contentPacks`) that the app can list — one doc per available date with metadata: `{ date, ledeCount, spreadCount, sofCount, publishedAt, price, isFree }`.
- Home or Explore tab entry point showing browsable past packs.

**Entitlements**
- `users/{uid}/unlockedPacks: string[]` in Firestore — list of dates the user has purchased.
- Firestore rules: user can read own entitlements; write only via Cloud Function (purchase flow).

**Pack content delivery**
- App fetches `contentPacks/{date}` (already written by publish.ts) when a user opens a historical pack.
- `ContentContext` needs a second fetch path: `getPackContent(date)` → reads `contentPacks/{date}`, caches in AsyncStorage under a date-keyed key.
- Gate: if `date` not in `unlockedPacks` and not today's free pack, show paywall.

**Purchase / unlock flow**
- In-app purchase (StoreKit / Google Play Billing) or one-time code redemption.
- On success, Cloud Function writes date to `users/{uid}/unlockedPacks` and returns the pack content (or the app re-fetches).

**Shared types needed**
- `PackCatalogEntry` — what the catalog list displays per row.
- `UnlockStatus` — `'free' | 'unlocked' | 'locked'` derived from today's date + user entitlements.

---

## Other Ideas (Not API-Dependent)

### The Correction

A headline is shown. Players pick which word or phrase in the headline is factually wrong (like a news corrections column). Requires careful human authorship; not pipeline-friendly.

### The Dateline

Hybrid of The Lede and The Year. A partial headline with the date redacted — players guess the decade. "Scientists announced a breakthrough in ___. The year: 1950s / 1980s / 2010s / 2020s."
