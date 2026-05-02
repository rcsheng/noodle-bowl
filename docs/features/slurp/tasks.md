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

## Phase 3 — Market Economy 🔲 Next

| Task | Notes |
|---|---|
| ownerUid fix | Pass real uid from auth into `dispatch({ type: 'START_RUN', ownerUid: uid })` |
| Bundle word list | Load ~170k word list into dictionary `Set`; call `loadWords()` on Slurp tab open |
| Word validation UI | Reject invalid words with a shake + haptic; don't consume a slurp |
| BUY reducer action | Add `BUY_ITEM` action to slurpReducer; deduct coins, add to toppings/consumables/pantry |
| Market item generation | Random selection from available catalog based on run state; respect topping cap |
| Flavor Pack "choose 1 of N" flow | Modal picker shown on Flavor Pack purchase |
| Topping effects in scoring | Wire toppings into `scoreSlurp`; fire each trigger in tray order |
| Spice card use | Enable "spice" button; apply consumable effect + remove from tray |
| Pantry effects on run state | Apply Mise en Place, Double Broth, etc. on purchase |
| Skip Market (+5 coins) | Replace or complement "NEXT →" with skip option |
| Reroll escalating cost | Cost track: 5 → 7 → 10 → 15 → 25 per reroll within one Market visit |
| Sell topping | Sell button per topping (half price); required when buying at cap |
| Abandon run dialog | Confirm dialog on landing screen when run is in progress |
| Debounced AsyncStorage write | 1500ms debounce matching GameContext pattern |

---

## Phase 4 — Polish & Completeness 🔲 Backlog

| Task | Notes |
|---|---|
| Haptics | Light on tile tap, medium on slurp, error on invalid word, success on tasting win |
| Tile animations | 120ms lift on tap, slide-in to word tray, flash on slurp commit |
| Score readout animation | Chip values count up tile-by-tile; tap to fast-forward |
| Broth meter animation | Fill with slight overshoot settle on score commit |
| Topping tray drag to reorder | Toppings fire in tray order; player should be able to reorder |
| Ingredient Shortage modifier | Remove 6 random letters from Pot for the Tasting; return after |
| Endless mode | Post-win continuation; quota scales ×2.5; local high score |
| Screen tests | Unit/integration tests for SlurpContext and screen components |
| Topping card expanded view | Tap topping chip to see full description |
| Market item persistence across reroll | Track what was seen; prevent immediate re-offer |
| "Recipe Book" peek UI | Show next 4 pot letters at tasting reveal if pantry owned |

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
