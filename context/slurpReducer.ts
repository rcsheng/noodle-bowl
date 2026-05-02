import type { SlurpRunState, SlurpAction, LetterTile, WordPattern, ChefsChallengeModifier } from '@/packages/shared/slurp';
import { BROTH_BASE_DISTRIBUTIONS, generateTiles } from '@/constants/slurp/brothBases';
import { BROTH_QUOTAS, COIN_REWARDS, DEFAULT_BOWL_SIZE, DEFAULT_SLURPS, DEFAULT_SPITOUTS } from '@/constants/slurp/quotas';
import { createRng } from '@/lib/slurp/rng';
import { detectWordPattern, scoreSlurp } from '@/lib/slurp/scoring';

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
        slurpCountThisTasting: 0,
        consecutiveNoSpitoutSlurps: 0,
        lastWordLetters: [],
        pendingChipBonus: 0,
        togarashiLetter: null,
        coursesCompleted: 0,
      };
    }

    case 'BEGIN_TASTING': {
      if (!state || state.phase !== 'reveal') return state;
      const drawn = drawToFill(state.pot, state.bowl, state.discard, state.bowlSize, state.rngState);
      return {
        ...state,
        pot: drawn.pot,
        bowl: drawn.bowl,
        discard: drawn.discard,
        rngState: drawn.rngState,
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

      const word = playedTiles.map(t => t.letter).join('');

      // theHealthInspector: reject words < 5 letters without consuming a slurp
      if (state.modifier === 'theHealthInspector' && word.length < 5) return state;

      const pattern = detectWordPattern(word);
      const { chips, seasoning, score: rawScore } = scoreSlurp(
        playedTiles,
        pattern,
        state.noodleLevels,
      );

      // thePickyEater: words containing E score 0
      let score = rawScore;
      if (state.modifier === 'thePickyEater' && word.toUpperCase().includes('E')) {
        score = 0;
      }

      const slurpNumber = state.slurpCountThisTasting + 1;

      // theFoodCritic: first 2 slurps must each score ≥ 80
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
          phase: 'over',
          finalScore: null,
        };
      }

      const remainingBowl = state.bowl.filter(t => !tileIds.includes(t.id));
      const drawn = drawToFill(
        state.pot,
        remainingBowl,
        [...state.discard, ...playedTiles],
        state.bowlSize,
        state.rngState,
      );

      const newBrothScored = state.brothScored + score;
      const newSlurpsRemaining = state.slurpsRemaining - 1;
      const won = newBrothScored >= state.brothQuota;
      const lost = !won && newSlurpsRemaining === 0;

      return {
        ...state,
        pot: drawn.pot,
        bowl: drawn.bowl,
        discard: drawn.discard,
        rngState: drawn.rngState,
        brothScored: newBrothScored,
        slurpsRemaining: newSlurpsRemaining,
        phase: won ? 'result' : lost ? 'over' : 'play',
        finalScore: lost ? null : state.finalScore,
        slurpCountThisTasting: slurpNumber,
        consecutiveNoSpitoutSlurps: state.consecutiveNoSpitoutSlurps + 1,
        lastWordLetters: [...new Set(word.toUpperCase().split(''))],
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

      const remainingBowl = state.bowl.filter(t => !tileIds.includes(t.id));
      const drawn = drawToFill(
        state.pot,
        remainingBowl,
        [...state.discard, ...spitTiles],
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
      };
    }

    case 'OPEN_MARKET': {
      if (!state || state.phase !== 'result') return state;
      if (state.brothScored < state.brothQuota) return state;

      const baseReward = COIN_REWARDS[state.tasting] ?? 3;
      const slurpBonus = state.slurpsRemaining;
      const interest = calcInterest(state.coins);
      const newCoins = state.coins + baseReward + slurpBonus + interest;

      return {
        ...state,
        coins: newCoins,
        totalBrothScored: state.totalBrothScored + state.brothScored,
        phase: 'market',
      };
    }

    case 'ADVANCE': {
      if (!state || state.phase !== 'market') return state;

      // Run complete after Dessert Chef's Challenge
      if (state.course === 3 && state.tasting === 3) {
        return { ...state, phase: 'over', finalScore: state.totalBrothScored };
      }

      const nextTasting = state.tasting === 3 ? 1 : ((state.tasting + 1) as 1 | 2 | 3);
      const nextCourse = state.tasting === 3 ? state.course + 1 : state.course;

      // Determine modifier for Chef's Challenge tasting
      let modifier: ChefsChallengeModifier | null = null;
      let newRngState = state.rngState;
      if (nextTasting === 3) {
        const picked = pickModifier(state.modifiersUsed, state.rngState);
        modifier = picked.modifier;
        newRngState = picked.rngState;
      }

      // theRushHour sets slurpsRemaining to 2; theClosingHour sets spitoutsRemaining to 1
      const slurpsRemaining = modifier === 'theRushHour' ? 2 : DEFAULT_SLURPS;
      const spitoutsRemaining = modifier === 'theClosingHour' ? 1 : DEFAULT_SPITOUTS;

      return {
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
        coursesCompleted: state.tasting === 3 ? state.coursesCompleted + 1 : state.coursesCompleted,
      };
    }

    case 'ABANDON_RUN': {
      if (!state) return null;
      return { ...state, phase: 'over', finalScore: null };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}
