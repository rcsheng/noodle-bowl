# Noodle Bowl — Slurp PRD (working title)

**Status:** Draft
**Last updated:** 2026-05-02
**Document version:** 1.0
**Author:** rcsheng

---

## Overview

Slurp is a longer-form, single-player **roguelike deck-builder** added to Noodle Bowl as a dedicated bottom-tab destination, sitting alongside the existing five quick-play games (Lede, Spread, SoF, Wave, Quip). Where the existing games are 30–90 second daily bites, Slurp is a 20–60 minute run that the player can pause and resume.

Mechanically Slurp is a **word-finding** game wrapped in a **noodle-soup-themed Balatro-style economy**: the player draws **letters** (instead of cards), forms **words** (instead of poker hands), scores **Broth Points × Seasoning** (instead of Chips × Mult), buys **Toppings / Spice Cards / Pantry upgrades** (instead of Jokers / Tarots / Vouchers) at **The Market** (the shop) between rounds, and progresses through **3 Courses** of escalating **Broth Quotas** culminating in a final **Chef's Challenge**.

---

## Goals

- **G1** — Ship a complete, replayable v1 roguelike run loop that a player can finish in 20–60 minutes, with a clear win state (beat Dessert Chef's Challenge) and a clear lose state (fail a Broth Quota).
- **G2** — Achieve genuine run-to-run variety through a Balatro-style synergy ecosystem: Toppings, Pantry, Spice Cards, and Broth Bases combine into emergent strategies.
- **G3** — Make every word the player plays feel like a small "I built this" moment — score readouts must clearly show how letter chips, word-pattern bonuses, Toppings, and Seasoning combined.
- **G4** — Fit cleanly into the existing Expo Router tab structure, AsyncStorage persistence model, and shared theme system. No new backend services in v1.
- **G5** — Reuse the existing dictionary/word-validation infrastructure where possible; if none exists, ship a self-contained validator small enough to bundle (target < 1 MB compressed).
- **G6** — Maintain code quality: 80%+ unit-test coverage on pure scoring/state-reducer logic; full TDD for the scoring engine.

---

## Non-Goals

- **NG1** — Multiplayer, async challenge links, or shareable runs.
- **NG2** — Daily/weekly time-limited content. Slurp is freeplay — every run draws from the same content pool.
- **NG3** — IAP, monetization, subscriptions, or cosmetic store.
- **NG4** — Cross-device cloud save in v1. State is local-only via AsyncStorage.
- **NG5** — Real-time multiplayer leaderboards.
- **NG6** — Localization beyond English.
- **NG7** — Animated 3D flourishes. Use the existing paper/ink visual language.
- **NG8** — Push notifications of any kind (permanently dropped per project decision).
- **NG9** — Meta-progression unlocking content across runs. All content is available from the first run.

---

## Vocabulary / Naming Map

This is the canonical naming used everywhere in code, copy, and UI. Use Slurp terminology in identifiers — never the underlying Balatro term.

| Balatro concept | Slurp name | Description |
|---|---|---|
| Cards | Letters | Single uppercase A–Z tiles with a chip value |
| Deck | The Pot (Letter Pool) | The full bag of letters available this run |
| Hand | The Bowl | Letters currently drawn into play |
| Poker hand type | Word Pattern | Category of word played (Broth, Noodle, Ramen, Udon, Pho, Tonkotsu, Dashi, Miso) |
| Chips | Broth Points | Flat additive score component |
| Multiplier | Seasoning | Multiplicative score component |
| Ante | Course | Top-level progression unit (3 per run) |
| Small Blind | Sip | First Tasting in a Course |
| Big Blind | Bowl Tasting | Second Tasting in a Course |
| Boss Blind | Chef's Challenge | Third Tasting in a Course; carries a special modifier |
| Jokers | Toppings | Persistent run-long passive effects (max 5 equipped) |
| Booster Pack | Flavor Pack | Mini-pack purchased in Market; choose 1 of N inside |
| Planet cards | Noodle Upgrades | Permanently level up a Word Pattern's chip/seasoning bonus |
| Tarot cards | Spice Cards | One-time consumable effects |
| Spectral cards | Secret Ingredient cards | Rare, more powerful one-time effects with trade-offs |
| Vouchers | Pantry | Permanent run-long upgrades, each purchasable once |
| Shop | The Market | Between-round shop screen |
| Money | Coins | Currency earned from beating Tastings |
| Plays per round | Slurps | Number of words playable per Tasting (default 4) |
| Discards per round | Spit-outs | Number of letters discardable per Tasting (default 3) |
| Blind score target | Broth Quota | Minimum Broth Points × Seasoning to win the Tasting |
| Deck types | Broth Bases | Starting letter-pool configurations |
| Joker slots | Topping slots | Number of Toppings equippable simultaneously (default 5) |

---

## Game Mechanics

### Turn Structure (Per Tasting)

1. **Reveal Tasting** — Player sees the round type (Sip / Bowl Tasting / Chef's Challenge), the Broth Quota, Slurps remaining (default 4), Spit-outs remaining (default 3), and any active Chef's Challenge modifier.
2. **Draw to bowl** — Letters are drawn from The Pot to fill the Bowl up to bowl size (default 7). If The Pot is empty, the discard pile reshuffles into The Pot first.
3. **Player turn loop** — On each turn the player chooses one of:
   - **Slurp (play a word)** — Select 2+ letters from the Bowl that form a valid English word. The word is scored, Broth Points accumulate, played letters move to the discard pile, new letters refill the Bowl. Slurps remaining decrements by 1.
   - **Spit-out (discard letters)** — Select 1 to (bowl size) letters from the Bowl to discard; new letters refill the Bowl. Spit-outs remaining decrements by 1. Does NOT score.
   - **Use a Spice Card / Secret Ingredient** — Effect applied immediately, card consumed. Does NOT consume a Slurp.
   - **Reorder bowl** — Free action; some Toppings interact with letter position.
4. **Tasting ends** when:
   - Cumulative Broth Points ≥ Broth Quota → **win**, OR
   - Slurps remaining = 0 AND Broth Points < Broth Quota → **lose → run ends**.

### Bowl, Pot, and Discard Mechanics

- **The Pot** starts each run with the chosen Broth Base's letter distribution (~52 tiles). It mutates during the run as letters are added (Broth Packs) or removed (Ginger Spice Cards).
- **The Bowl** holds up to `bowlSize` letters (default 7; raised by Mise en Place Pantry and Wontons Topping).
- **Discard pile** — letters from Slurps or Spit-outs go here. When The Pot is empty at draw time, the discard pile reshuffles into The Pot.
- The Pot and discard pile do **not** reset between Tastings or Courses. State carries through the whole run.

### Word Validation

- Word must be ≥ 2 letters long.
- Word must exist in the bundled English dictionary.
- Letters must be selected from the current Bowl (each tile is consumed).
- Wildcards (from Sesame Oil) may stand in for any letter; the player chooses which letter at play time.
- Invalid word attempts are rejected without consuming a Slurp; light shake animation + error haptic.

### Failure State

If a Tasting's Broth Quota is not met when Slurps reach 0: the run ends. The player sees a **Run Summary** screen (best Word Pattern, biggest single-Slurp score, total Coins earned, Toppings collected, Tastings cleared, failed Tasting's quota vs. actual score). Options: **Start New Run** or return to the Slurp tab landing.

### Win State

If the player beats the **Dessert Chef's Challenge**: a **Run Complete** screen shows the same Run Summary stats plus a **Final Score** (cumulative Broth Points across the entire run). Options: **Endless Mode**, **Start New Run**, or return to the Slurp tab landing.

---

## Scoring System

### Letter Chip Values

| Value | Letters |
|---|---|
| 1 | E, A, I, O, U, N, S, T, R, L |
| 2 | D, G |
| 3 | B, C, M, P |
| 4 | F, H, V, W, Y |
| 5 | K |
| 8 | J, X |
| 10 | Q, Z |

A letter's chip value can be permanently boosted during a run by certain Toppings (Nori) or Spice Cards (Garlic Confit). The boost is stored on the individual letter tile; two A's in The Pot may have different chip values.

### Word Patterns

A played word matches **one** Word Pattern — highest-tier match wins. Each pattern has a base **chip bonus** and a base **seasoning bonus**. Both increase by +10 chips / +0.5 seasoning per Noodle Upgrade level (cap: +10 levels per pattern).

| Word Pattern | Trigger | Base chips | Base seasoning |
|---|---|---|---|
| **Broth** | 3–4 letter word | +5 | +1 |
| **Noodle** | 5 letter word | +10 | +1.5 |
| **Ramen** | 6 letter word | +20 | +2 |
| **Udon** | 7 letter word | +35 | +3 |
| **Pho** | 8+ letter word | +60 | +4 |
| **Tonkotsu** | All letters in the word are rare (Q/Z/X/J/K) — at least 2 | +80 | +4 |
| **Dashi** | Palindrome (≥ 3 letters) | +50 | +3 |
| **Miso** | All 5 vowels (A/E/I/O/U) appear in the word, no rare letters | +40 | +2.5 |

### Score Formula

```
basePoints   = sum(letterChip[i]) for each letter in word
patternChips = wordPattern.baseChips + wordPattern.level × 10
patternMult  = wordPattern.baseSeasoning + wordPattern.level × 0.5

chips        = basePoints + patternChips + (Topping/Spice flat-chip contributions)
seasoning    = 1 + patternMult + (Topping/Spice seasoning contributions)

score        = chips × seasoning
```

Toppings fire **left-to-right** in tray order. Order is deterministic and visible. Player may drag to reorder Toppings at any time outside of a Slurp animation.

### Score Readout UI

1. Show base letter chip values popping up tile-by-tile.
2. Show Word Pattern bonus (+chips, +seasoning) sliding in.
3. Show each active Topping's contribution in tray order.
4. Show the final `chips × seasoning = score`.
5. Tally into the running Broth Points total for the Tasting.

Animation duration target: ≤ 2.5s typical, ≤ 4s for a full 5-Topping synergy. Player may **tap to fast-forward** at any time.

---

## Run Structure

A complete run is **3 Courses × 3 Tastings = 9 Tastings**, with The Market opening between every Tasting (8 Market visits per run).

### Broth Quotas (first-pass; subject to tuning)

| Course | Sip | Bowl Tasting | Chef's Challenge |
|---|---|---|---|
| **Appetizer** | 300 | 450 | 700 |
| **Main Course** | 1,200 | 2,000 | 3,500 |
| **Dessert** | 6,000 | 11,000 | 22,000 |

All tuning numbers live in `constants/slurp/quotas.ts`.

### Coin Economy

| Tasting | Base reward | Bonus per unspent Slurp | Interest (per 5 Coins held, cap +5) |
|---|---|---|---|
| Sip | +3 | +1 | +1 |
| Bowl Tasting | +5 | +1 | +1 |
| Chef's Challenge | +8 | +1 | +1 |

### Endless Mode

After winning the Dessert Chef's Challenge, players may continue. Quotas scale: `quota = previousQuota × 2.5` per Tasting. Local-only high score tracking in v1.

---

## The Market (Shop)

Opens after every successful Tasting. Contents:

- **2 Topping slots** — purchasable; re-rollable.
- **2 Flavor Pack slots** — choose 1 of N inside on purchase.
- **1 Pantry slot** — once-per-run; stays empty after purchase.
- **1 Spice Card slot** — one-time consumable; goes to consumables tray.
- **Reroll button** — shuffles entire shop. Escalating cost: 5 → 7 → 10 → 15 → 25 per reroll within one Market visit.
- **Skip Market** — proceed to next Tasting; awards +5 Coins.

Buying a Topping when at the cap (default 5) requires selling an existing Topping first (sell value = half purchase price, rounded down).

---

## Toppings Catalog (v1 — complete catalog, 24 Toppings)

All Toppings: base price 4 Coins, sell value 2 Coins.

**Design constraints:** single-sentence trigger, fits a 2-line card description, must not break core word-finding game.

| # | Name | Trigger | Effect |
|---|---|---|---|
| 1 | **Chili Oil** | Word contains a vowel cluster (2+ consecutive vowels) | +4 Seasoning |
| 2 | **Soft-Boiled Egg** | First Slurp of each Tasting | Letter chips count double for that Slurp |
| 3 | **Crispy Shallots** | Word contains double letters (e.g., BUBBLE) | ×3 Seasoning |
| 4 | **Fish Cake** | Word is a palindrome (Dashi pattern) | +100 flat Broth Points (before seasoning) |
| 5 | **Nori** | Any Slurp | Most-used letter in the word gains +1 chip value permanently in The Pot |
| 6 | **Wontons** | Player plays a Udon (7-letter) or Pho (8+ letter) word | +1 bowl size permanently for the run (max 11) |
| 7 | **Scallions** | Any Slurp | +1 Seasoning per vowel in the played word |
| 8 | **Char Siu** | Player uses their LAST Slurp of a Tasting | Score for that Slurp is doubled (after all other bonuses) |
| 9 | **Pork Belly** | End of each Tasting won | Gain 1 Coin per 200 Broth Points scored above the Quota |
| 10 | **Tea Egg** | Any Slurp | +5 chips × number of Slurps completed this Tasting (1st=+5, 2nd=+10, 3rd=+15, 4th=+20); resets each Tasting |
| 11 | **Menma** | Any Slurp without a preceding Spit-out this Tasting | +5 chips per consecutive no-Spit-out Slurp streak; resets on Spit-out |
| 12 | **Narutomaki** | Any Slurp | +2 chips for each Topping currently equipped (including this one) |
| 13 | **Corn** | Word contains 3+ distinct vowels | +4 Seasoning |
| 14 | **Sesame Seeds** | Any Slurp | +1 chip for each letter in the word that also appears elsewhere in the current Bowl |
| 15 | **Yuzu Kosho** | Any Slurp | +1 Seasoning per Course completed so far this run (Appetizer=+0, Main=+1, Dessert=+2) |
| 16 | **Mirin** | Word contains no repeated letters | +3 Seasoning |
| 17 | **Abura-age** | After each Slurp | The leftmost letter remaining in the Bowl permanently gains +1 chip value |
| 18 | **Shiitake** | Spit-out includes a letter with chip value ≥ 5 | +15 chips on your next Slurp |
| 19 | **Doubanjiang** | Word contains 2+ rare letters (J/K/Q/X/Z) | ×2 Seasoning |
| 20 | **Gochujang** | Word starts and ends with the same letter | +25 chips |
| 21 | **Togarashi** | Start of each Tasting | One random Bowl letter is chosen; words containing it give +7 Seasoning this Tasting |
| 22 | **Lard** | Any Slurp scoring 500+ Broth Points | Gain +1 Coin |
| 23 | **Kombu** | Start of each new Course | All letters currently in The Pot permanently gain +1 chip value |
| 24 | **Natto** | Word shares a letter with the previous word played | +10 chips per overlapping distinct letter |

---

## Chef's Challenge Modifiers

| Modifier | Effect |
|---|---|
| **The Picky Eater** | Words containing the letter E score zero (still consume a Slurp) |
| **The Health Inspector** | All words must be 5+ letters; shorter words rejected without consuming a Slurp |
| **The Rush Hour** | Only 2 Slurps available this Tasting |
| **The Ingredient Shortage** | 6 random letters removed from The Pot for this Tasting (returned at end) |
| **The Food Critic** | First 2 Slurps must each score ≥ 80 Broth Points independently; fail either = Tasting fails immediately |
| **The Closing Hour** | Spit-outs reduced to 1 |

No modifier repeats within a single run.

---

## Flavor Packs

| Pack | Cost | Contents | Player chooses |
|---|---|---|---|
| **Broth Pack** | 4 | 4 random letters | Choose 2 to permanently add to The Pot |
| **Spice Pack** | 4 | 3 random Spice Cards | Choose 1 (added to consumables tray) |
| **Umami Pack** | 6 | 2 random Toppings | Choose 1 (equipped; sells cheapest existing Topping if at cap) |
| **Noodle Pack** | 4 | 3 random Noodle Upgrades | Choose 1 (levels up the corresponding Word Pattern) |

---

## Broth Bases

| Broth Base | Distribution | Strategic Identity |
|---|---|---|
| **Classic Chicken** | Standard English Scrabble distribution | Balanced default; new players |
| **Tonkotsu** | Reduced vowels, extra consonants, 2× rare letters (Q/Z/X/J) | High variance; favors Tonkotsu pattern and big plays |
| **Clear Dashi** | Heavy on E, A, S, T, R, I; almost no rare letters | Easier word finding, consistent mid-range; favors Noodle Upgrade builds |
| **Miso** | Standard + extra D, G, B, M (2–3 pt letters) | Consistent mid-range; favors Crispy Shallots and Scallions builds |

All Bases: 52 total tiles. Exact distributions live in `constants/slurp/brothBases.ts`.

---

## Spice Cards (Tarot equivalents)

One-time consumables. Live in a 2-slot tray (expandable to 4 via Larder Pantry).

| Spice Card | Effect |
|---|---|
| **Sichuan Pepper** | Add 3 copies of a chosen letter to The Pot |
| **MSG** | Gain +30 Coins |
| **Sesame Oil** | Choose 2 letters in current Bowl; they become wildcards for the next Slurp only |
| **Ginger** | Permanently remove 1 chosen letter from The Pot |
| **Five Spice** | The next Slurp scores 5× (chips and seasoning both ×5) |
| **Star Anise** | Discard all letters in the Bowl and draw a fresh one; does not consume a Slurp or Spit-out |
| **Garlic Confit** | All copies of a chosen letter in The Pot gain +2 chip value permanently |
| **Bonito Flakes** | The next Word Pattern triggered is leveled up by +1 just for that Slurp |

### Secret Ingredient Cards (Spectral equivalents, ~10% drop rate in Spice Packs)

| Secret Ingredient | Effect |
|---|---|
| **Truffle Shavings** | Double the chip value of every letter currently in The Pot (one-time, permanent for the run) |
| **Saffron** | Sell all currently equipped Toppings for 2× their sell price; clears the tray |
| **Black Garlic** | Convert all letters of one chosen value (e.g., all 1-pt letters) into a chosen new letter |
| **Yuzu** | Skip the next Tasting entirely (auto-passes; no Coins awarded) |

---

## Pantry (Voucher equivalents)

Each Pantry item is purchasable once per run. One Pantry slot appears in The Market; once bought, the slot stays empty.

| Pantry | Cost | Effect |
|---|---|---|
| **Mise en Place** | 10 | +1 bowl size permanently |
| **Double Broth** | 10 | +1 Slurp per Tasting permanently |
| **Fermented** | 10 | Letters Spit-out gain +2 chip value when they cycle back into The Pot |
| **Aged Stock** | 10 | Every 3rd Slurp of a Tasting awards +20 flat Broth Points (counter resets per Tasting) |
| **Larder** | 8 | Consumables tray expands from 2 to 4 slots |
| **Recipe Book** | 12 | At Tasting start, peek at the next 4 letters at the top of The Pot |

---

## UI / UX Notes

### Tab placement

```
Home  |  Stats  |  Slurp  |  Friends  |  Profile
```

Tab icon: `bowl.fill` SF Symbol or custom paper-themed bowl glyph added to `components/ui/icon-symbol.tsx`.

### Slurp tab landing screen

**No run in progress:** Hero card, **Start a Run** CTA, "How to Play" expandable, local stats (best Final Score, total runs, total completions, best Course reached).

**Run in progress:** Hero card showing current Course/Tasting, **Continue** CTA, **Abandon Run** (confirm dialog).

### Run flow screens (`app/slurp/`)

| Screen | Path | Purpose |
|---|---|---|
| Tab landing | `app/(tabs)/slurp.tsx` | Start or Continue |
| Broth Base select | `app/slurp/broth-select.tsx` | Choose 1 of 4 at run start |
| Tasting reveal | `app/slurp/tasting.tsx` (phase=reveal) | Show type, quota, modifiers |
| Play | `app/slurp/tasting.tsx` (phase=play) | Main play loop |
| Tasting result | `app/slurp/tasting.tsx` (phase=result) | Win/lose, score readout, Coins |
| Market | `app/slurp/market.tsx` | Buy Toppings/Packs/Pantry |
| Run summary | `app/slurp/run-summary.tsx` | End-of-run stats |

### Play screen layout (top → bottom)

1. **Header strip** — Course/Tasting label, modifier text (Chef's Challenge only), Slurps remaining, Spit-outs remaining.
2. **Quota bar** — Broth Quota target with a progress fill.
3. **Toppings tray** — Up to 5 Topping cards; tap to expand description; drag to reorder.
4. **Score readout area** — Empty until a Slurp animation is playing.
5. **Bowl** — Up to 7+ letter tiles. Tap to select; selected tiles reorder into word line.
6. **Word being built** — Selected letters in order + running chip total + current Word Pattern. "Clear" button.
7. **Action bar** — **Slurp**, **Spit-out**, **Use Spice**.

### Visual language

- Design direction to be confirmed from `docs/features/slurp/designs/` variants.
- Typography and tile style per chosen design variant.
- Letter tiles: letterform + subscript chip value. Boosted-chip tiles get a gold border.
- Toppings: small paper-stamp cards. Active triggers flash during the Slurp animation.
- Animations: subtle translation + opacity. Never bouncy. Tap to fast-forward always available.

### Haptics

- Selecting a letter: light.
- Slurp confirmed (valid word): medium.
- Slurp rejected (invalid word): error + small shake; Slurp counter does NOT decrement.
- Tasting won: success.
- Run lost: error.

---

## Tech Notes

### State management

New **`SlurpContext`** mirrors the `GameContext` pattern:

- `context/slurpReducer.ts` — pure, fully unit-testable. Owns all game logic.
- `context/SlurpContext.tsx` — wraps reducer, debounced AsyncStorage persistence.
- `useSlurp()` consumer hook.

### Run state persistence

- AsyncStorage key: `slurp_run_v1`.
- Tagged with `ownerUid` (per CLAUDE.md §7.5.2 AC8.1). Mismatched-uid blobs discarded.
- Writes debounced at 1500 ms (matching `gameReducer` pattern).
- On corrupt JSON load: fall back to "no run in progress" + one-time toast.

### State shape (high-level)

```typescript
interface SlurpRunState {
  ownerUid: string | null;
  brothBase: BrothBaseId;
  pot: LetterTile[];
  bowl: LetterTile[];
  discard: LetterTile[];
  toppings: Topping[];
  consumables: SpiceCard[];
  pantryOwned: PantryId[];
  noodleLevels: Record<WordPattern, number>;
  course: number;
  tasting: 1 | 2 | 3;
  brothQuota: number;
  brothScored: number;
  slurpsRemaining: number;
  spitoutsRemaining: number;
  bowlSize: number;
  coins: number;
  modifier: ChefsChallengeModifier | null;
  phase: 'reveal' | 'play' | 'result' | 'market' | 'over';
  runStartedAt: number;
  rngSeed: number;
  finalScore: number | null;
}

interface LetterTile {
  id: string;
  letter: string; // 'A'–'Z' or '*' for wildcard
  chipValue: number; // mutable during run
}
```

All types in `packages/shared/slurp.ts`.

### Random number generation

Use a seedable PRNG (`mulberry32` or `seedrandom`) seeded once per run from `Math.random()` and stored in run state. Enables reproducible debugging and future seed-sharing.

### Word validation

Bundle a compact permissively-licensed English word list (target < 800 KB compressed). Recommended source: [dwyl/english-words](https://github.com/dwyl/english-words) (MIT). Load into a `Set<string>` lazily on first Slurp tab open. Validation is O(1) `Set.has()`.

### File layout

```
app/
  (tabs)/
    slurp.tsx
    _layout.tsx              # add Slurp tab entry
  slurp/
    broth-select.tsx
    tasting.tsx
    market.tsx
    run-summary.tsx
    __tests__/
context/
  SlurpContext.tsx
  slurpReducer.ts
  __tests__/
    slurpReducer.test.ts
constants/
  slurp/
    brothBases.ts
    toppings.ts
    spiceCards.ts
    pantry.ts
    wordPatterns.ts
    quotas.ts
    chefsModifiers.ts
lib/
  slurp/
    dictionary.ts
    scoring.ts
    rng.ts
packages/shared/
  slurp.ts
assets/
  slurp/
    wordlist.json.gz
docs/
  features/
    slurp/
      prd.md
      prr.md
      designs/
        variant-a.tsx
        variant-b.tsx
        variant-c.tsx
        chosen.tsx
        screenshots/
```

### Analytics events

Reuse `lib/analytics.ts` (PostHog wrapper):

| Event | Trigger | Params |
|---|---|---|
| `slurp_run_started` | Player taps Start a Run | `broth_base` |
| `slurp_tasting_won` | Broth Quota met | `course`, `tasting`, `score`, `slurps_used`, `spitouts_used` |
| `slurp_tasting_lost` | Tasting failed | `course`, `tasting`, `score`, `quota` |
| `slurp_run_completed` | Beat Dessert Chef's Challenge | `final_score`, `total_coins_earned`, `topping_count`, `pantry_count` |
| `slurp_run_abandoned` | Player tapped Abandon Run | `course`, `tasting` |
| `slurp_market_purchase` | Bought from The Market | `item_type`, `item_id`, `cost` |
| `slurp_endless_course` | Cleared an Endless-mode Course | `course`, `final_score_so_far` |

### Testing strategy

- **Unit tests** — `context/__tests__/slurpReducer.test.ts`. Target: 90%+ coverage on the reducer.
- **Component tests (RTL)** — Smoke tests for each Slurp screen under `app/slurp/__tests__/`.
- **Manual smoke** — Full run from Start to Dessert win, Abandon Run mid-Tasting, app close/reopen mid-Slurp.
- **Overall coverage target:** 80%+ (matching project minimum). Reducer: 90%+.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Wordlist licensing issue | Pin `dwyl/english-words` (MIT). Document license in `assets/slurp/LICENSE`. |
| Bundle size exceeds Expo limits | Lazy-load wordlist on first Slurp tab open. Gzip compress. Monitor with `expo bundle-size`. |
| Scoring engine bugs (player feels cheated) | 90%+ reducer coverage. Score readout shows exact math; users can self-verify. |
| Run-state corruption on crash | Reducer transitions are atomic; full state written on each mutation. Corrupt JSON → fall back to "no run in progress". |
| Letter-draw RNG feels unfair | Seedable PRNG; verify draw distribution in tests. Show seed on Run Summary. |
| Quotas wrong (too easy or too hard) | First-pass quotas in `constants/slurp/quotas.ts`. Plan tuning pass after 10 internal playtests. |
| Player cannot form any valid word | Spit-outs (default 3) + Star Anise Spice + Pot reshuffle make stalls very unlikely. If playtest reveals stalls, add a 1-Coin "Need a hint?" affordance (shows one valid word from current Bowl). |
| Slurp competes with daily-game retention | Slurp is opt-in via its own tab. Track time-in-Slurp vs. daily games via PostHog. |
| Remaining 16 Toppings turn into scope creep | PRD freezes Topping count at 24 for v1. Adding a 25th requires a v2 PRD amendment. |

---

## Open Questions

1. **Tab icon and order.** Is `bowl.fill` the right glyph? Final tab position?
2. **Dictionary source.** Confirm `dwyl/english-words` or choose an alternative before build.
3. **Seed sharing.** "Share Run Seed" button on Run Summary — v1 or v2?
4. **Hint affordance.** Ship the 1-Coin "Need a hint?" helper or wait for playtest data?
5. **Endless Mode leaderboards.** Local-only top-10 for v1; global leaderboard deferred.
6. **Sign-up upsell.** Show a sign-up prompt on Run Complete ("sign up to save high scores across devices"), modeled on the existing `ChallengeSignUpBanner` pattern?
7. **Tuning playtest.** At least 10 full runs by 3+ testers before launch.
8. **Card art.** v1 ships text-only paper-stamp cards. Illustrated art is v2 polish.
9. **Topping firing order UX.** Always drag-enabled, or an explicit "Edit Tray" mode?
10. **Final name.** "Slurp" is the working title. Lock the name before building UI strings.

---

## Success Criteria

- [ ] A player can complete a full run (Appetizer → Dessert win) end-to-end without crashes on iOS and Android.
- [ ] All 24 Toppings are implemented, unit-tested, and visually distinct in The Market.
- [ ] All 8 Spice Cards + 4 Secret Ingredient cards work as specified.
- [ ] All 6 Pantry items are purchasable, persistent for the run, and apply effects correctly.
- [ ] All 6 Chef's Challenge modifiers apply correctly and surface in the play UI.
- [ ] All 4 Broth Bases produce distinct letter pools, verifiable by a draw-distribution unit test.
- [ ] AsyncStorage persistence: closing and reopening mid-Tasting restores exact state.
- [ ] Cross-uid isolation: signing in as a different user does not leak prior run state.
- [ ] Reducer unit-test coverage ≥ 90%; overall Slurp module coverage ≥ 80%.
- [ ] Slurp tab does not regress startup time by more than 200 ms (lazy-load wordlist).
- [ ] No regression in existing 313+ app tests or 59+ function tests.
- [ ] PostHog events fire with the expected schema (verified against PostHog dashboard during smoke testing).
- [ ] A player who abandons a run loses no data outside that run; daily-game stats and challenge/help state are untouched.

---

## Implementation Phasing

### Phase 1 — Scoring engine + reducer foundation (no UI)
Letter chip values, Word Pattern detection, score formula, `slurpReducer.ts` with core actions, 4 Broth Bases, unit tests (90%+ coverage), bundled wordlist + dictionary lookup. All verification via tests.

### Phase 2 — Minimal playable UI
Slurp tab + landing screen, Broth Base select, Tasting reveal/play/result (1 Course × 1 Tasting), simple score readout animation, AsyncStorage persistence, one Topping wired end-to-end (Soft-Boiled Egg).

### Phase 3 — Full run loop
3 Courses × 3 Tastings, all 6 Chef's Challenge modifiers, The Market (Toppings / Pantry / Spice / Flavor Packs / reroll / skip), all 6 Pantry items, all 8 Spice Cards + 4 Secret Ingredients, Run Summary (win + lose), Endless Mode.

### Phase 4 — Full Topping catalog + tuning
All 24 Toppings implemented and tested, tuning pass on quotas/Coin rewards/prices, score readout animation polish, PostHog analytics wired, sign-up upsell on Run Complete (if approved).

### Phase 5 — Polish & ship
Bundle size verification, accessibility audit, manual smoke checklist on iOS + Android, final coverage check, resolve remaining Open Questions.
