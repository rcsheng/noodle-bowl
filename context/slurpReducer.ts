import type {
  SlurpRunState, SlurpAction, LetterTile, WordPattern,
  ChefsChallengeModifier, ToppingId, PantryId, ConsumableId, FlavorPackId,
} from '@/packages/shared/slurp';
import { BROTH_BASE_DISTRIBUTIONS, generateTiles } from '@/constants/slurp/brothBases';
import { BROTH_QUOTAS, COIN_REWARDS, DEFAULT_BOWL_SIZE, DEFAULT_SLURPS, DEFAULT_SPITOUTS } from '@/constants/slurp/quotas';
import { LETTER_CHIPS } from '@/constants/slurp/letterChips';
import { WORD_PATTERN_DEFS, NOODLE_UPGRADE_CAP } from '@/constants/slurp/wordPatterns';
import { TOPPING_DEFS, TOPPING_IDS, MAX_TOPPINGS, MAX_BOWL_SIZE } from '@/constants/slurp/toppings';
import { SPICE_CARD_DEFS } from '@/constants/slurp/spiceCards';
import { PANTRY_DEFS } from '@/constants/slurp/pantry';
import { REROLL_COSTS } from '@/constants/slurp/flavorPacks';
import { createRng } from '@/lib/slurp/rng';
import { detectWordPattern } from '@/lib/slurp/scoring';
import { isDictionaryLoaded, isValidWord } from '@/lib/slurp/dictionary';
import { applyToppingEffectsOnSlurp } from '@/lib/slurp/toppingEffects';
import { generateMarketOffers, generateFlavorPackChoices } from '@/lib/slurp/marketGen';

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaultNoodleLevels(): Record<WordPattern, number> {
  return { broth: 0, noodle: 0, ramen: 0, udon: 0, pho: 0, tonkotsu: 0, dashi: 0, miso: 0 };
}

const ALL_MODIFIERS: ChefsChallengeModifier[] = [
  'thePickyEater',
  'theHealthInspector',
  'theRushHour',
  'theIngredientShortage',
  'theFoodCritic',
  'theClosingHour',
];

// ── Draw helper ───────────────────────────────────────────────────────────────

function drawToFill(
  pot: LetterTile[],
  bowl: LetterTile[],
  discard: LetterTile[],
  bowlSize: number,
  rngState: number,
): { pot: LetterTile[]; bowl: LetterTile[]; discard: LetterTile[]; rngState: number } {
  const needed = bowlSize - bowl.length;
  if (needed <= 0) return { pot, bowl, discard, rngState };

  const rng = createRng(rngState);
  let currentPot = [...pot];
  let currentDiscard = [...discard];
  const drawn: LetterTile[] = [];

  for (let i = 0; i < needed; i++) {
    if (currentPot.length === 0) {
      if (currentDiscard.length === 0) break;
      currentPot = rng.shuffle(currentDiscard);
      currentDiscard = [];
    }
    const [first, ...rest] = currentPot;
    drawn.push(first);
    currentPot = rest;
  }

  return {
    pot: currentPot,
    bowl: [...bowl, ...drawn],
    discard: currentDiscard,
    rngState: rng.getState(),
  };
}

// ── Modifier picker ───────────────────────────────────────────────────────────

function pickModifier(
  used: ChefsChallengeModifier[],
  rngState: number,
): { modifier: ChefsChallengeModifier; rngState: number } {
  const available = ALL_MODIFIERS.filter(m => !used.includes(m));
  const pool = available.length > 0 ? available : ALL_MODIFIERS;
  const rng = createRng(rngState);
  const modifier = pool[rng.nextInt(pool.length)];
  return { modifier, rngState: rng.getState() };
}

// ── Interest calculation ──────────────────────────────────────────────────────

function calcInterest(coins: number): number {
  return Math.min(Math.floor(coins / 5), 5);
}

// ── Reducer ───────────────────────────────────────────────────────────────────

export function slurpReducer(
  state: SlurpRunState | null,
  action: SlurpAction,
): SlurpRunState | null {
  switch (action.type) {
    case 'START_RUN': {
      const { brothBase, ownerUid, seed } = action;
      const distribution = BROTH_BASE_DISTRIBUTIONS[brothBase];
      const allTiles = generateTiles(distribution);
      const rng = createRng(seed);
      const shuffledPot = rng.shuffle(allTiles);

      return {
        ownerUid,
        brothBase,
        pot: shuffledPot,
        bowl: [],
        discard: [],
        toppings: [],
        consumables: [],
        pantryOwned: [],
        noodleLevels: defaultNoodleLevels(),
        course: 1,
        tasting: 1,
        brothQuota: BROTH_QUOTAS[1][1],
        brothScored: 0,
        totalBrothScored: 0,
        slurpsRemaining: DEFAULT_SLURPS,
        spitoutsRemaining: DEFAULT_SPITOUTS,
        bowlSize: DEFAULT_BOWL_SIZE,
        coins: 0,
        modifier: null,
        modifiersUsed: [],
        phase: 'reveal',
        runStartedAt: Date.now(),
        rngSeed: seed,
        rngState: rng.getState(),
        finalScore: null,
        marketItems: [],
        marketRerollCount: 0,
        pendingFlavorPack: null,
        slurpCountThisTasting: 0,
        consecutiveNoSpitoutSlurps: 0,
        lastWordLetters: [],
        pendingChipBonus: 0,
        togarashiLetter: null,
        coursesCompleted: 0,
        ingredientShortageTiles: [],
        pendingConsumableInput: null,
        wildcardTileIds: [],
        fiveSpiceActive: false,
        bonitoFlakesActive: false,
        yuzuActive: false,
        yuzuSkipTasting: false,
      };
    }

    case 'BEGIN_TASTING': {
      if (!state || state.phase !== 'reveal') return state;

      let rngState = state.rngState;

      // theIngredientShortage: remove 6 random letters from pot for this tasting
      let pot = state.pot;
      let ingredientShortageTiles = state.ingredientShortageTiles;
      if (state.modifier === 'theIngredientShortage' && pot.length > 0) {
        const rng = createRng(rngState);
        const shuffled = rng.shuffle(pot);
        const removeCount = Math.min(6, shuffled.length);
        ingredientShortageTiles = shuffled.slice(0, removeCount);
        pot = shuffled.slice(removeCount);
        rngState = rng.getState();
      }

      const drawn = drawToFill(pot, state.bowl, state.discard, state.bowlSize, rngState);

      // Togarashi: designate a random bowl letter for this tasting
      let togarashiLetter: string | null = state.togarashiLetter;
      let finalRngState = drawn.rngState;
      if (state.toppings.includes('togarashi') && drawn.bowl.length > 0) {
        const rng = createRng(drawn.rngState);
        const idx = rng.nextInt(drawn.bowl.length);
        togarashiLetter = drawn.bowl[idx].letter;
        finalRngState = rng.getState();
      }

      return {
        ...state,
        pot: drawn.pot,
        bowl: drawn.bowl,
        discard: drawn.discard,
        rngState: finalRngState,
        togarashiLetter,
        ingredientShortageTiles,
        wildcardTileIds: [],
        phase: 'play',
      };
    }

    case 'SLURP': {
      if (!state || state.phase !== 'play') return state;
      if (state.slurpsRemaining <= 0) return state;

      const { tileIds } = action;
      const playedTiles = tileIds
        .map(id => state.bowl.find(t => t.id === id))
        .filter((t): t is LetterTile => t !== undefined);

      if (playedTiles.length !== tileIds.length) return state;
      if (playedTiles.length < 2) return state;

      // For word detection, wildcards ('*') don't contribute to letter pattern
      const nonWildcardLetters = playedTiles
        .filter(t => !state.wildcardTileIds.includes(t.id))
        .map(t => t.letter)
        .join('');
      const word = nonWildcardLetters || playedTiles.map(t => t.letter).join('');

      // theHealthInspector: reject words < 5 letters without consuming a slurp
      if (state.modifier === 'theHealthInspector' && word.length < 5) return state;

      // Word validation (no-op until dictionary is loaded)
      if (isDictionaryLoaded() && !isValidWord(word)) return state;

      const pattern = detectWordPattern(word);
      const def = WORD_PATTERN_DEFS[pattern];
      // Bonito Flakes: pattern level +1 for this slurp only
      const bonitoBonus = state.bonitoFlakesActive ? 1 : 0;
      const level = Math.min((state.noodleLevels[pattern] ?? 0) + bonitoBonus, NOODLE_UPGRADE_CAP);
      const patternChips = def.baseChips + level * 10;
      const patternSeasoning = def.baseSeasoning + level * 0.5;
      const baseLetterChips = playedTiles.reduce((sum, t) => sum + t.chipValue, 0);

      const toppingResult = applyToppingEffectsOnSlurp({
        toppings: state.toppings,
        word,
        tiles: playedTiles,
        pattern,
        baseLetterChips,
        patternChips,
        patternSeasoning,
        pendingChipBonus: state.pendingChipBonus,
        slurpCountThisTasting: state.slurpCountThisTasting,
        consecutiveNoSpitoutSlurps: state.consecutiveNoSpitoutSlurps,
        lastWordLetters: state.lastWordLetters,
        slurpsRemaining: state.slurpsRemaining,
        togarashiLetter: state.togarashiLetter,
        coursesCompleted: state.coursesCompleted,
        bowl: state.bowl,
        pot: state.pot,
        discard: state.discard,
      });

      // thePickyEater: words containing E score 0
      let score = toppingResult.score;
      if (state.modifier === 'thePickyEater' && word.toUpperCase().includes('E')) {
        score = 0;
      }
      // Five Spice: next slurp ×5 (applies after all other bonuses)
      if (state.fiveSpiceActive) score = Math.round(score * 5);

      const slurpNumber = state.slurpCountThisTasting + 1;

      // theFoodCritic: first 2 slurps must each score ≥ 80, otherwise run ends
      if (state.modifier === 'theFoodCritic' && slurpNumber <= 2 && score < 80) {
        const remainingBowl = state.bowl.filter(t => !tileIds.includes(t.id));
        const drawn = drawToFill(
          state.pot,
          remainingBowl,
          [...state.discard, ...playedTiles],
          state.bowlSize,
          state.rngState,
        );
        return {
          ...state,
          pot: drawn.pot,
          bowl: drawn.bowl,
          discard: drawn.discard,
          rngState: drawn.rngState,
          brothScored: state.brothScored + score,
          slurpsRemaining: state.slurpsRemaining - 1,
          slurpCountThisTasting: slurpNumber,
          pendingChipBonus: 0,
          phase: 'over',
          finalScore: null,
        };
      }

      // Apply Nori: boost all tiles of noriLetter by +1 (pot, discard, and played tiles)
      let newPot = state.pot;
      let newDiscard = state.discard;
      let boostedPlayedTiles = playedTiles;
      if (toppingResult.noriLetter) {
        const letter = toppingResult.noriLetter;
        newPot = newPot.map(t => t.letter === letter ? { ...t, chipValue: t.chipValue + 1 } : t);
        newDiscard = newDiscard.map(t => t.letter === letter ? { ...t, chipValue: t.chipValue + 1 } : t);
        boostedPlayedTiles = playedTiles.map(t => t.letter === letter ? { ...t, chipValue: t.chipValue + 1 } : t);
      }

      const remainingBowl = state.bowl.filter(t => !tileIds.includes(t.id));
      const newBowlSize = Math.min(state.bowlSize + toppingResult.bowlSizeIncrease, MAX_BOWL_SIZE);
      const drawn = drawToFill(
        newPot,
        remainingBowl,
        [...newDiscard, ...boostedPlayedTiles],
        newBowlSize,
        state.rngState,
      );

      // Abura-age: leftmost bowl tile after draw gets +1 chip permanently
      let finalBowl = drawn.bowl;
      if (toppingResult.needsAburaAge && finalBowl.length > 0) {
        finalBowl = [
          { ...finalBowl[0], chipValue: finalBowl[0].chipValue + 1 },
          ...finalBowl.slice(1),
        ];
      }

      // Aged Stock: every 3rd slurp gives +20 broth
      const agedStockBonus = state.pantryOwned.includes('agedStock') && slurpNumber % 3 === 0 ? 20 : 0;

      const newBrothScored = state.brothScored + score + agedStockBonus;
      const newSlurpsRemaining = state.slurpsRemaining - 1;
      const won = newBrothScored >= state.brothQuota;
      const lost = !won && newSlurpsRemaining === 0;

      return {
        ...state,
        pot: drawn.pot,
        bowl: finalBowl,
        discard: drawn.discard,
        rngState: drawn.rngState,
        brothScored: newBrothScored,
        slurpsRemaining: newSlurpsRemaining,
        bowlSize: newBowlSize,
        coins: state.coins + toppingResult.bonusCoins,
        phase: won ? 'result' : lost ? 'over' : 'play',
        finalScore: lost ? null : state.finalScore,
        slurpCountThisTasting: slurpNumber,
        consecutiveNoSpitoutSlurps: state.consecutiveNoSpitoutSlurps + 1,
        lastWordLetters: [...new Set(word.toUpperCase().split(''))],
        pendingChipBonus: 0,
        wildcardTileIds: [],
        fiveSpiceActive: false,
        bonitoFlakesActive: false,
      };
    }

    case 'SPIT_OUT': {
      if (!state || state.phase !== 'play') return state;
      if (state.spitoutsRemaining <= 0) return state;

      const { tileIds } = action;
      const spitTiles = tileIds
        .map(id => state.bowl.find(t => t.id === id))
        .filter((t): t is LetterTile => t !== undefined);

      if (spitTiles.length === 0) return state;

      // Shiitake: if any spit tile has chip ≥ 5, queue +15 on next slurp
      let newPendingChipBonus = state.pendingChipBonus;
      if (state.toppings.includes('shiitake') && spitTiles.some(t => t.chipValue >= 5)) {
        newPendingChipBonus += 15;
      }

      // Fermented: spit tiles gain +2 chip value in the discard pile
      const processedSpitTiles = state.pantryOwned.includes('fermented')
        ? spitTiles.map(t => ({ ...t, chipValue: t.chipValue + 2 }))
        : spitTiles;

      const remainingBowl = state.bowl.filter(t => !tileIds.includes(t.id));
      const drawn = drawToFill(
        state.pot,
        remainingBowl,
        [...state.discard, ...processedSpitTiles],
        state.bowlSize,
        state.rngState,
      );

      return {
        ...state,
        pot: drawn.pot,
        bowl: drawn.bowl,
        discard: drawn.discard,
        rngState: drawn.rngState,
        spitoutsRemaining: state.spitoutsRemaining - 1,
        consecutiveNoSpitoutSlurps: 0,
        pendingChipBonus: newPendingChipBonus,
      };
    }

    case 'OPEN_MARKET': {
      if (!state || state.phase !== 'result') return state;
      if (state.brothScored < state.brothQuota) return state;

      const baseReward = COIN_REWARDS[state.tasting] ?? 3;
      const slurpBonus = state.slurpsRemaining;
      const interest = calcInterest(state.coins);

      // Pork Belly: +1 coin per 200 broth above quota
      const porkBellyCoins = state.toppings.includes('porkBelly')
        ? Math.floor(Math.max(0, state.brothScored - state.brothQuota) / 200)
        : 0;

      const newCoins = state.coins + baseReward + slurpBonus + interest + porkBellyCoins;

      // Return ingredient shortage tiles to pot
      const restoredPot = state.modifier === 'theIngredientShortage'
        ? [...state.pot, ...state.ingredientShortageTiles]
        : state.pot;

      const rng = createRng(state.rngState);
      const updatedStateForGen = { ...state, toppings: state.toppings, pantryOwned: state.pantryOwned };
      const marketItems = generateMarketOffers(updatedStateForGen, rng);

      return {
        ...state,
        pot: restoredPot,
        ingredientShortageTiles: [],
        coins: newCoins,
        totalBrothScored: state.totalBrothScored + state.brothScored,
        phase: 'market',
        marketItems,
        marketRerollCount: 0,
        pendingFlavorPack: null,
        rngState: rng.getState(),
      };
    }

    case 'BUY_ITEM': {
      if (!state || state.phase !== 'market') return state;

      const offer = state.marketItems.find(o => o.id === action.offerId);
      if (!offer || offer.sold) return state;
      if (state.coins < offer.price) return state;

      const newCoins = state.coins - offer.price;
      const updatedItems = state.marketItems.map(o =>
        o.id === action.offerId ? { ...o, sold: true } : o,
      );

      switch (offer.kind) {
        case 'topping': {
          if (state.toppings.length >= MAX_TOPPINGS) return state; // UI prevents this
          return {
            ...state,
            coins: newCoins,
            toppings: [...state.toppings, offer.itemId as ToppingId],
            marketItems: updatedItems,
          };
        }

        case 'pantry': {
          const pantryId = offer.itemId as PantryId;
          if (state.pantryOwned.includes(pantryId)) return state;
          // Mise en Place applies immediately; others tracked via pantryOwned
          const newBowlSize = pantryId === 'miseEnPlace' ? state.bowlSize + 1 : state.bowlSize;
          return {
            ...state,
            coins: newCoins,
            pantryOwned: [...state.pantryOwned, pantryId],
            bowlSize: newBowlSize,
            marketItems: updatedItems,
          };
        }

        case 'spice': {
          const maxConsumables = state.pantryOwned.includes('larder') ? 4 : 2;
          if (state.consumables.length >= maxConsumables) return state;
          return {
            ...state,
            coins: newCoins,
            consumables: [...state.consumables, offer.itemId as ConsumableId],
            marketItems: updatedItems,
          };
        }

        case 'flavorPack': {
          const packId = offer.itemId as FlavorPackId;
          const rng = createRng(state.rngState);
          const choices = generateFlavorPackChoices(packId, state, rng);
          const picksRemaining = packId === 'brothPack' ? 2 : 1;
          return {
            ...state,
            coins: newCoins,
            rngState: rng.getState(),
            marketItems: updatedItems,
            pendingFlavorPack: { offerId: action.offerId, packId, choices, picksRemaining },
          };
        }

        default:
          return state;
      }
    }

    case 'CHOOSE_FLAVOR': {
      if (!state || !state.pendingFlavorPack) return state;
      if (state.pendingFlavorPack.offerId !== action.offerId) return state;
      if (!state.pendingFlavorPack.choices.includes(action.choice)) return state;

      const { packId, picksRemaining } = state.pendingFlavorPack;
      const choice = action.choice;

      // brothPack: choose 2 of 4 — keep pack open after first pick
      if (packId === 'brothPack' && picksRemaining > 1) {
        const letter = choice.toUpperCase();
        const chipValue = LETTER_CHIPS[letter] ?? 1;
        const rng = createRng(state.rngState);
        const newTile: LetterTile = { id: `broth_${rng.nextInt(999999)}`, letter, chipValue };
        return {
          ...state,
          pot: [...state.pot, newTile],
          rngState: rng.getState(),
          pendingFlavorPack: {
            ...state.pendingFlavorPack,
            choices: state.pendingFlavorPack.choices.filter(c => c !== choice),
            picksRemaining: picksRemaining - 1,
          },
        };
      }

      const base = { ...state, pendingFlavorPack: null };

      switch (packId) {
        case 'spicePack': {
          const maxConsumables = base.pantryOwned.includes('larder') ? 4 : 2;
          if (base.consumables.length >= maxConsumables) return base;
          return { ...base, consumables: [...base.consumables, choice as ConsumableId] };
        }

        case 'umamiPack': {
          if (base.toppings.length >= MAX_TOPPINGS) return base;
          return { ...base, toppings: [...base.toppings, choice as ToppingId] };
        }

        case 'noodlePack': {
          const pattern = choice as WordPattern;
          const currentLevel = base.noodleLevels[pattern] ?? 0;
          return {
            ...base,
            noodleLevels: {
              ...base.noodleLevels,
              [pattern]: Math.min(currentLevel + 1, NOODLE_UPGRADE_CAP),
            },
          };
        }

        case 'brothPack': {
          const letter = choice.toUpperCase();
          const chipValue = LETTER_CHIPS[letter] ?? 1;
          const rng = createRng(base.rngState);
          const newTile: LetterTile = {
            id: `broth_${rng.nextInt(999999)}`,
            letter,
            chipValue,
          };
          return {
            ...base,
            pot: [...base.pot, newTile],
            rngState: rng.getState(),
          };
        }

        default:
          return base;
      }
    }

    case 'SELL_TOPPING': {
      if (!state || state.phase !== 'market') return state;
      const { toppingId } = action;
      const idx = state.toppings.indexOf(toppingId);
      if (idx === -1) return state;

      const sellValue = TOPPING_DEFS[toppingId].sellValue;
      return {
        ...state,
        toppings: state.toppings.filter((_, i) => i !== idx),
        coins: state.coins + sellValue,
      };
    }

    case 'REROLL': {
      if (!state || state.phase !== 'market') return state;

      const rerollCost = REROLL_COSTS[Math.min(state.marketRerollCount, REROLL_COSTS.length - 1)];
      if (state.coins < rerollCost) return state;

      const rng = createRng(state.rngState);
      const newItems = generateMarketOffers(state, rng);

      return {
        ...state,
        coins: state.coins - rerollCost,
        marketRerollCount: state.marketRerollCount + 1,
        marketItems: newItems,
        rngState: rng.getState(),
      };
    }

    case 'SKIP_MARKET': {
      if (!state || state.phase !== 'market') return state;
      // +5 coins then advance to next tasting
      return slurpReducer({ ...state, coins: state.coins + 5 }, { type: 'ADVANCE' });
    }

    case 'ADVANCE': {
      if (!state || state.phase !== 'market') return state;

      // Run complete after Dessert Chef's Challenge
      if (state.course === 3 && state.tasting === 3) {
        return { ...state, phase: 'over', finalScore: state.totalBrothScored };
      }

      const nextTasting = state.tasting === 3 ? 1 : ((state.tasting + 1) as 1 | 2 | 3);
      const nextCourse = state.tasting === 3 ? state.course + 1 : state.course;
      const isNewCourse = state.tasting === 3;

      // Modifier for Chef's Challenge tasting
      let modifier: ChefsChallengeModifier | null = null;
      let newRngState = state.rngState;
      if (nextTasting === 3) {
        const picked = pickModifier(state.modifiersUsed, state.rngState);
        modifier = picked.modifier;
        newRngState = picked.rngState;
      }

      // Slurps: theRushHour → 2; Double Broth pantry → +1
      const baseSlurps = modifier === 'theRushHour' ? 2 : DEFAULT_SLURPS;
      const slurpsRemaining = baseSlurps + (state.pantryOwned.includes('doubleBroth') ? 1 : 0);
      const spitoutsRemaining = modifier === 'theClosingHour' ? 1 : DEFAULT_SPITOUTS;

      let nextState: SlurpRunState = {
        ...state,
        course: nextCourse,
        tasting: nextTasting,
        brothQuota: BROTH_QUOTAS[nextCourse]?.[nextTasting] ?? state.brothQuota,
        brothScored: 0,
        slurpsRemaining,
        spitoutsRemaining,
        modifier,
        modifiersUsed: modifier ? [...state.modifiersUsed, modifier] : state.modifiersUsed,
        rngState: newRngState,
        phase: 'reveal',
        slurpCountThisTasting: 0,
        consecutiveNoSpitoutSlurps: 0,
        lastWordLetters: [],
        pendingChipBonus: 0,
        togarashiLetter: null,
        coursesCompleted: isNewCourse ? state.coursesCompleted + 1 : state.coursesCompleted,
        marketItems: [],
        pendingFlavorPack: null,
      };

      // Kombu: start of new course → all tiles everywhere gain +1 chip
      if (isNewCourse && state.toppings.includes('kombu')) {
        nextState = {
          ...nextState,
          pot: nextState.pot.map(t => ({ ...t, chipValue: t.chipValue + 1 })),
          bowl: nextState.bowl.map(t => ({ ...t, chipValue: t.chipValue + 1 })),
          discard: nextState.discard.map(t => ({ ...t, chipValue: t.chipValue + 1 })),
        };
      }

      // Yuzu: next tasting auto-skips to reveal phase with skip flag
      if (state.yuzuActive) {
        return {
          ...nextState,
          yuzuActive: false,
          yuzuSkipTasting: true,
        };
      }

      return nextState;
    }

    case 'ABANDON_RUN': {
      if (!state) return null;
      return { ...state, phase: 'over', finalScore: null };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    case 'USE_CONSUMABLE': {
      if (!state || state.phase !== 'play') return state;
      const { consumableId } = action;
      if (!state.consumables.includes(consumableId)) return state;

      const newConsumables = state.consumables.filter(c => c !== consumableId);

      switch (consumableId) {
        case 'msg':
          return { ...state, consumables: newConsumables, coins: state.coins + 30 };

        case 'starAnise': {
          const newDiscard = [...state.discard, ...state.bowl];
          const drawn = drawToFill(state.pot, [], newDiscard, state.bowlSize, state.rngState);
          return { ...state, consumables: newConsumables, bowl: drawn.bowl, discard: drawn.discard, pot: drawn.pot, rngState: drawn.rngState };
        }

        case 'fiveSpice':
          return { ...state, consumables: newConsumables, fiveSpiceActive: true };

        case 'bonitoFlakes':
          return { ...state, consumables: newConsumables, bonitoFlakesActive: true };

        case 'truffleShavings':
          return { ...state, consumables: newConsumables, pot: state.pot.map(t => ({ ...t, chipValue: t.chipValue * 2 })) };

        case 'saffron': {
          const saffronCoins = state.toppings.reduce((sum, tId) => sum + (TOPPING_DEFS[tId]?.sellValue ?? 2) * 2, 0);
          return { ...state, consumables: newConsumables, toppings: [], coins: state.coins + saffronCoins };
        }

        case 'yuzu':
          return { ...state, consumables: newConsumables, yuzuActive: true };

        case 'sichuanPepper':
        case 'ginger':
        case 'garlicConfit':
          return { ...state, consumables: newConsumables, pendingConsumableInput: { consumableId, step: 'letter', context: '' } };

        case 'sesameOil':
          return { ...state, consumables: newConsumables, pendingConsumableInput: { consumableId, step: 'tile', context: '' } };

        case 'blackGarlic':
          return { ...state, consumables: newConsumables, pendingConsumableInput: { consumableId, step: 'value', context: '' } };

        default:
          return { ...state, consumables: newConsumables };
      }
    }

    case 'CHOOSE_CONSUMABLE_TARGET': {
      if (!state || !state.pendingConsumableInput) return state;
      const { consumableId, step, context } = state.pendingConsumableInput;
      const { target } = action;

      switch (consumableId) {
        case 'sichuanPepper': {
          const letter = target.toUpperCase();
          const chipValue = LETTER_CHIPS[letter] ?? 1;
          const rng = createRng(state.rngState);
          const newTiles: LetterTile[] = [0, 1, 2].map(i => ({
            id: `sichuan_${rng.nextInt(999999)}_${i}`,
            letter,
            chipValue,
          }));
          return { ...state, pendingConsumableInput: null, pot: [...state.pot, ...newTiles], rngState: rng.getState() };
        }

        case 'ginger': {
          const letter = target.toUpperCase();
          return { ...state, pendingConsumableInput: null, pot: state.pot.filter(t => t.letter !== letter) };
        }

        case 'garlicConfit': {
          const letter = target.toUpperCase();
          return {
            ...state,
            pendingConsumableInput: null,
            pot: state.pot.map(t => t.letter === letter ? { ...t, chipValue: t.chipValue + 2 } : t),
          };
        }

        case 'sesameOil': {
          if (context === '') {
            return { ...state, pendingConsumableInput: { consumableId, step, context: target } };
          }
          return { ...state, pendingConsumableInput: null, wildcardTileIds: [context, target] };
        }

        case 'blackGarlic': {
          if (step === 'value') {
            return { ...state, pendingConsumableInput: { consumableId, step: 'letter', context: target } };
          }
          const value = parseInt(context, 10);
          const newLetter = target.toUpperCase();
          const newChipValue = LETTER_CHIPS[newLetter] ?? value;
          return {
            ...state,
            pendingConsumableInput: null,
            pot: state.pot.map(t => t.chipValue === value ? { ...t, letter: newLetter, chipValue: newChipValue } : t),
          };
        }

        default:
          return { ...state, pendingConsumableInput: null };
      }
    }

    case 'YUZU_SKIP': {
      if (!state || state.phase !== 'reveal' || !state.yuzuSkipTasting) return state;
      const rng = createRng(state.rngState);
      const marketItems = generateMarketOffers(state, rng);
      return {
        ...state,
        yuzuSkipTasting: false,
        phase: 'market',
        marketItems,
        marketRerollCount: 0,
        pendingFlavorPack: null,
        rngState: rng.getState(),
        brothScored: 0,
        slurpCountThisTasting: 0,
        consecutiveNoSpitoutSlurps: 0,
        lastWordLetters: [],
        pendingChipBonus: 0,
      };
    }

    case 'ENDLESS_CONTINUE': {
      if (!state || state.phase !== 'over' || state.finalScore === null) return state;
      const endlessQuota = Math.round(state.brothQuota * 2.5);
      const { modifier, rngState: newRngState } = pickModifier(state.modifiersUsed, state.rngState);
      const baseSlurps = modifier === 'theRushHour' ? 2 : DEFAULT_SLURPS;
      const slurpsRemaining = baseSlurps + (state.pantryOwned.includes('doubleBroth') ? 1 : 0);
      const spitoutsRemaining = modifier === 'theClosingHour' ? 1 : DEFAULT_SPITOUTS;
      return {
        ...state,
        brothQuota: endlessQuota,
        brothScored: 0,
        slurpsRemaining,
        spitoutsRemaining,
        modifier,
        modifiersUsed: [...state.modifiersUsed, modifier],
        rngState: newRngState,
        phase: 'reveal',
        finalScore: null,
        slurpCountThisTasting: 0,
        consecutiveNoSpitoutSlurps: 0,
        lastWordLetters: [],
        pendingChipBonus: 0,
        togarashiLetter: null,
        wildcardTileIds: [],
        fiveSpiceActive: false,
        bonitoFlakesActive: false,
        marketItems: [],
        pendingFlavorPack: null,
        pendingConsumableInput: null,
      };
    }

    default:
      return state;
  }
}
