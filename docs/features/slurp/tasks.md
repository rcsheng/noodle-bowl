# Slurp — Tasks

**Last updated:** 2026-05-02

---

## Phase 1 — Engine ✅ Done

| Task | File(s) | Status |
|---|---|---|
| SlurpRunState types | `packages/shared/slurp.ts` | ✅ |
| slurpReducer (full game logic) | `context/slurpReducer.ts` | ✅ |
| Seedable PRNG | `lib/slurp/rng.ts` | ✅ |
| Scoring engine (chips × seasoning) | `lib/slurp/scoring.ts` | ✅ |
| Word pattern detection | `lib/slurp/scoring.ts` | ✅ |
| Broth base distributions | `constants/slurp/brothBases.ts` | ✅ |
| Letter chip values | `constants/slurp/letterChips.ts` | ✅ |
| Broth quotas + defaults | `constants/slurp/quotas.ts` | ✅ |
| Word pattern definitions | `constants/slurp/wordPatterns.ts` | ✅ |
| Dictionary module (interface) | `lib/slurp/dictionary.ts` | ✅ |
| Reducer unit tests (101 tests) | `context/__tests__/slurpReducer.test.ts` | ✅ |
| Scoring unit tests | `lib/slurp/__tests__/scoring.test.ts` | ✅ |
| RNG unit tests | `lib/slurp/__tests__/rng.test.ts` | ✅ |

---

## Phase 2 — Core UI Loop ✅ Done (known gaps below)

| Task | File(s) | Status |
|---|---|---|
| Riso Broth design tokens | `constants/slurp/riso.ts` | ✅ |
| RisoMisreg, RisoBorder, RisoTile, RisoButton, RisoMeter, RisoBadge components | `components/slurp/` | ✅ |
| SlurpContext + AsyncStorage persistence | `context/SlurpContext.tsx` | ✅ |
| Feature flag (EXPO_PUBLIC_ENABLE_SLURP) | `constants/featureFlags.ts` | ✅ |
| Tab landing screen | `app/(tabs)/slurp.tsx` | ✅ |
| Broth select screen | `app/slurp/broth-select.tsx` | ✅ |
| Tasting screen — reveal / play / score readout phases | `app/slurp/tasting.tsx` | ✅ |
| Market screen (display only) | `app/slurp/market.tsx` | ✅ |
| Run summary screen | `app/slurp/run-summary.tsx` | ✅ |
| Slurp tab wired + hidden behind feature flag | `app/(tabs)/_layout.tsx` | ✅ |
| slurp stack added to root layout | `app/_layout.tsx` | ✅ |

### Phase 2 Known Gaps (carry into Phase 3)

| Gap | Notes |
|---|---|
| ownerUid always null | `SlurpContext` passes `ownerUid: null`; should pass `uid` from `useAuth()` |
| Word validation skipped | All 2+ letter combos accepted; `loadWords()` never called |
| Market buy not functional | BUY tap shows "coming soon" alert; no reducer action |
| Spice button disabled | "spice" button always disabled placeholder |
| Abandon run not wired | Landing shows resume but no abandon option |
| Score debounce not implemented | Writes are immediate; PRD says 1500ms debounce |

---

## Phase 3 — Market Economy ✅ Done (known gaps below)

| Task | Notes | Status |
|---|---|---|
| ownerUid fix | Pass real uid from auth into `START_RUN` | ✅ |
| BUY reducer action | `BUY_ITEM` action; deduct coins, add to toppings/consumables/pantry | ✅ |
| Market item generation | RNG-based generation in `OPEN_MARKET`; stored in `state.marketItems` | ✅ |
| Flavor Pack "choose 1 of N" flow | Modal picker via `pendingFlavorPack` state + `CHOOSE_FLAVOR` action | ✅ |
| Topping effects in scoring | All 22 in-slurp toppings wired via `applyToppingEffectsOnSlurp` | ✅ |
| Pantry effects | Mise en Place (+bowl), Double Broth (+slurp), Fermented, Aged Stock, Larder, Recipe Book tracked | ✅ |
| Skip Market (+5 coins) | `SKIP_MARKET` action: +5 coins + advance | ✅ |
| Reroll escalating cost | `REROLL` action; costs 5→7→10→15→25 per visit | ✅ |
| Sell topping | Sell buttons on equipped toppings; sell-to-make-room modal on buy at cap | ✅ |
| Debounced AsyncStorage write | 1500ms debounce in SlurpContext | ✅ |
| Togarashi tasting start | `BEGIN_TASTING` picks random bowl letter | ✅ |
| Pork Belly coin | `OPEN_MARKET` grants coins per 200 broth above quota | ✅ |
| Kombu new course | `ADVANCE` boosts all pot/bowl/discard tiles +1 chip on course change | ✅ |
| Ingredient Shortage | `BEGIN_TASTING` removes 6 random tiles; `OPEN_MARKET` restores them | ✅ |

### Phase 3 Known Gaps (carry into Phase 4)

| Gap | Notes |
|---|---|
| Word validation | All 2+ letter combos still accepted; dictionary not bundled |
| Spice card use | "spice" button still disabled; `USE_CONSUMABLE` not implemented |
| Abandon run dialog | Landing shows resume but no confirm dialog for abandon |
| Score readout doesn't show topping bonuses | UI shows base score only; topping breakdowns are Phase 4 |
| Broth Pack picks 1 letter (not 2) | Simplified from PRD's "choose 2 of 4"; Phase 4 to fix |

---

## Phase 4 — Polish & Completeness ✅ Done (deferred items below)

| Task | Notes | Status |
|---|---|---|
| Haptics | Light on tile tap, medium on slurp, success/error on tasting end | ✅ |
| Spice card system (`USE_CONSUMABLE`) | All 12 consumables wired; letter/value/tile picker modals | ✅ |
| Broth Pack choose-2 fix | `picksRemaining` added; two-pick flow in `CHOOSE_FLAVOR` | ✅ |
| Abandon run dialog | Landing screen shows confirm alert before abandoning | ✅ |
| Topping expanded view | Tap topping chip → detail modal with trigger/effect/sell | ✅ |
| Score readout topping breakdown | Receipt rows for topping chips, topping seasoning, five spice ×5 | ✅ |
| "Recipe Book" peek UI | Next 4 pot letters shown at tasting reveal if pantry owned | ✅ |
| Endless mode | `ENDLESS_CONTINUE` scales quota ×2.5; run-summary re-navigates to tasting | ✅ |
| Word validation hook | No-op when dictionary not bundled; safe to ship | ✅ |
| Yuzu two-phase skip | `yuzuActive` → ADVANCE sets `yuzuSkipTasting` → RevealScreen skip UI → `YUZU_SKIP` | ✅ |
| Active spice flags display | fiveSpiceActive / bonitoFlakesActive / wildcard count shown in tasting | ✅ |

### Phase 4 Deferred

| Gap | Notes |
|---|---|
| Tile animations | Reanimated lift/slide/flash; deferred |
| Score readout count-up animation | Chip values count up tile-by-tile; deferred |
| Broth meter animation | Fill with slight overshoot settle; deferred |
| Topping tray drag to reorder | Deferred |
| Market item persistence across reroll | Track seen items; prevent immediate re-offer; deferred |
| Word validation dictionary bundle | `loadWords()` not yet called; all words accepted silently |

---

## Phase 5 — Nice-to-Have 🔲 Stretch

| Task | Notes |
|---|---|
| Custom bowl illustration | Replace emoji placeholder in hero with riso-style ink illustration |
| Broth base icons | Replace emoji in broth select with custom 36px monoline icons |
| Tab bar custom glyph | Replace fork.knife SF Symbol with custom riso bowl glyph |
| Halftone tile asset | Pre-baked tileable PNG for authentic riso feel on tiles |
| Score seed sharing | Let players share a run seed for comparison (NG1 deferred; fun experiment) |
| Noodle Upgrade level display | Show current level per word pattern somewhere in tasting screen |
