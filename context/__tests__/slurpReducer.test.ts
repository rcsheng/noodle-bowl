import { slurpReducer } from '../slurpReducer';
import {
  BROTH_BASE_DISTRIBUTIONS,
  distributionTotal,
} from '@/constants/slurp/brothBases';
import { LETTER_CHIPS } from '@/constants/slurp/letterChips';
import { DEFAULT_BOWL_SIZE, DEFAULT_SLURPS, DEFAULT_SPITOUTS, BROTH_QUOTAS } from '@/constants/slurp/quotas';
import { REROLL_COSTS } from '@/constants/slurp/flavorPacks';
import type { SlurpRunState, LetterTile, MarketOffer, WordPattern } from '@/packages/shared/slurp';

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultLevels(): Record<WordPattern, number> {
  return { broth: 0, noodle: 0, ramen: 0, udon: 0, pho: 0, tonkotsu: 0, dashi: 0, miso: 0 };
}

function tile(letter: string, id?: string): LetterTile {
  return { id: id ?? letter, letter, chipValue: LETTER_CHIPS[letter] ?? 1 };
}

function makePlayState(overrides: Partial<SlurpRunState> = {}): SlurpRunState {
  return {
    ownerUid: null,
    brothBase: 'classicChicken',
    pot: [tile('H', 'H0'), tile('N', 'N0'), tile('M', 'M0')],
    bowl: [
      tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0'),
      tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('S', 'S0'),
    ],
    discard: [],
    toppings: [],
    consumables: [],
    pantryOwned: [],
    noodleLevels: defaultLevels(),
    course: 1,
    tasting: 1,
    brothQuota: 300,
    brothScored: 0,
    totalBrothScored: 0,
    slurpsRemaining: DEFAULT_SLURPS,
    spitoutsRemaining: DEFAULT_SPITOUTS,
    bowlSize: DEFAULT_BOWL_SIZE,
    coins: 0,
    modifier: null,
    modifiersUsed: [],
    phase: 'play',
    runStartedAt: 0,
    rngSeed: 42,
    rngState: 42,
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
    ...overrides,
  };
}

// ── START_RUN ─────────────────────────────────────────────────────────────────

describe('START_RUN', () => {
  it('creates initial run state with correct tile count', () => {
    const state = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'classicChicken',
      ownerUid: null,
      seed: 42,
    });
    expect(state).not.toBeNull();
    const expected = distributionTotal(BROTH_BASE_DISTRIBUTIONS.classicChicken);
    expect(state!.pot.length + state!.bowl.length + state!.discard.length).toBe(expected);
  });

  it('starts in reveal phase with bowl empty', () => {
    const state = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'classicChicken',
      ownerUid: null,
      seed: 42,
    });
    expect(state!.phase).toBe('reveal');
    expect(state!.bowl).toHaveLength(0);
  });

  it('sets initial values correctly', () => {
    const state = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'classicChicken',
      ownerUid: null,
      seed: 42,
    });
    expect(state!.course).toBe(1);
    expect(state!.tasting).toBe(1);
    expect(state!.brothQuota).toBe(BROTH_QUOTAS[1][1]);
    expect(state!.brothScored).toBe(0);
    expect(state!.slurpsRemaining).toBe(DEFAULT_SLURPS);
    expect(state!.spitoutsRemaining).toBe(DEFAULT_SPITOUTS);
    expect(state!.bowlSize).toBe(DEFAULT_BOWL_SIZE);
    expect(state!.coins).toBe(0);
    expect(state!.modifier).toBeNull();
    expect(state!.rngSeed).toBe(42);
  });

  it('produces different pot orderings for different seeds', () => {
    const s1 = slurpReducer(null, { type: 'START_RUN', brothBase: 'classicChicken', ownerUid: null, seed: 1 });
    const s2 = slurpReducer(null, { type: 'START_RUN', brothBase: 'classicChicken', ownerUid: null, seed: 2 });
    const ids1 = s1!.pot.map(t => t.id).join(',');
    const ids2 = s2!.pot.map(t => t.id).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('produces same pot ordering for the same seed', () => {
    const s1 = slurpReducer(null, { type: 'START_RUN', brothBase: 'classicChicken', ownerUid: null, seed: 42 });
    const s2 = slurpReducer(null, { type: 'START_RUN', brothBase: 'classicChicken', ownerUid: null, seed: 42 });
    expect(s1!.pot.map(t => t.id)).toEqual(s2!.pot.map(t => t.id));
  });

  it('all tiles have correct chip values', () => {
    const state = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'classicChicken',
      ownerUid: null,
      seed: 42,
    });
    for (const t of state!.pot) {
      expect(t.chipValue).toBe(LETTER_CHIPS[t.letter]);
    }
  });

  it('works with tonkotsu broth base', () => {
    const state = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'tonkotsu',
      ownerUid: null,
      seed: 1,
    });
    const expected = distributionTotal(BROTH_BASE_DISTRIBUTIONS.tonkotsu);
    expect(state!.pot.length).toBe(expected);
  });
});

// ── BEGIN_TASTING ─────────────────────────────────────────────────────────────

describe('BEGIN_TASTING', () => {
  it('fills the bowl to bowlSize when starting from empty', () => {
    const initial = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'classicChicken',
      ownerUid: null,
      seed: 42,
    });
    const state = slurpReducer(initial, { type: 'BEGIN_TASTING' });
    expect(state!.bowl).toHaveLength(DEFAULT_BOWL_SIZE);
    expect(state!.phase).toBe('play');
  });

  it('draws from the pot to the bowl', () => {
    const initial = slurpReducer(null, {
      type: 'START_RUN',
      brothBase: 'classicChicken',
      ownerUid: null,
      seed: 42,
    });
    const state = slurpReducer(initial, { type: 'BEGIN_TASTING' });
    const totalTiles = distributionTotal(BROTH_BASE_DISTRIBUTIONS.classicChicken);
    expect(state!.pot.length).toBe(totalTiles - DEFAULT_BOWL_SIZE);
    expect(state!.discard).toHaveLength(0);
  });

  it('tops up bowl to bowlSize when bowl already has some tiles', () => {
    const initial = makePlayState({
      phase: 'reveal',
      bowl: [tile('A', 'A0'), tile('B', 'B0')], // 2 tiles already in bowl
      pot: [tile('C', 'C0'), tile('D', 'D0'), tile('E', 'E0'), tile('F', 'F0'), tile('G', 'G0')],
    });
    const state = slurpReducer(initial, { type: 'BEGIN_TASTING' });
    expect(state!.bowl).toHaveLength(DEFAULT_BOWL_SIZE);
    expect(state!.pot).toHaveLength(0); // drew 5 from pot of 5
  });

  it('does nothing if already in play phase', () => {
    const initial = makePlayState({ phase: 'play' });
    const state = slurpReducer(initial, { type: 'BEGIN_TASTING' });
    expect(state).toBe(initial);
  });
});

// ── SLURP ─────────────────────────────────────────────────────────────────────

describe('SLURP', () => {
  it('removes played tiles from bowl and puts them in discard', () => {
    const initial = makePlayState();
    // Play 'CAT'
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    const bowlIds = state!.bowl.map(t => t.id);
    expect(bowlIds).not.toContain('C0');
    expect(bowlIds).not.toContain('A0');
    expect(bowlIds).not.toContain('T0');
    const discardIds = state!.discard.map(t => t.id);
    expect(discardIds).toContain('C0');
    expect(discardIds).toContain('A0');
    expect(discardIds).toContain('T0');
  });

  it('accumulates brothScored', () => {
    const initial = makePlayState();
    // C(3)+A(1)+T(1)=5 base chips, broth: +5 pattern, seasoning=2 → score=20
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.brothScored).toBe(20);
  });

  it('decrements slurpsRemaining', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.slurpsRemaining).toBe(DEFAULT_SLURPS - 1);
  });

  it('draws new tiles to refill the bowl', () => {
    const initial = makePlayState({
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0')],
      pot: [tile('X', 'X0'), tile('Y', 'Y0'), tile('Z', 'Z0')],
      bowlSize: 3,
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.bowl).toHaveLength(3);
    expect(state!.pot).toHaveLength(0);
  });

  it('increments slurpCountThisTasting', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.slurpCountThisTasting).toBe(1);
  });

  it('records lastWordLetters', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.lastWordLetters.sort()).toEqual(['A', 'C', 'T']);
  });

  it('transitions to result phase when brothScored >= brothQuota', () => {
    // Set quota to 1 so any word wins
    const initial = makePlayState({ brothQuota: 1 });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.phase).toBe('result');
  });

  it('transitions to over when last slurp does not meet quota', () => {
    const initial = makePlayState({ slurpsRemaining: 1, brothQuota: 99999 });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.phase).toBe('over');
    expect(state!.finalScore).toBeNull(); // lost, no final score
  });

  it('rejects SLURP when fewer than 2 tiles selected', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0'] });
    expect(state).toBe(initial);
  });

  it('rejects SLURP when a tile ID is not in the bowl', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'NOTEXIST'] });
    expect(state).toBe(initial);
  });

  it('rejects SLURP when no slurps remaining', () => {
    const initial = makePlayState({ slurpsRemaining: 0 });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state).toBe(initial);
  });

  it('rejects SLURP in non-play phase', () => {
    const initial = makePlayState({ phase: 'reveal' });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state).toBe(initial);
  });
});

// ── SLURP with Chef's Challenge modifiers ─────────────────────────────────────

describe('SLURP with modifiers', () => {
  it('thePickyEater: word containing E scores 0', () => {
    const initial = makePlayState({
      modifier: 'thePickyEater',
      bowl: [tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('E', 'E0'), tile('S', 'S0'), tile('A', 'A0'), tile('T', 'T0')],
    });
    // 'DOG' has no E → normal score
    const stateNoE = slurpReducer(initial, { type: 'SLURP', tileIds: ['D0', 'O0', 'G0'] });
    expect(stateNoE!.brothScored).toBeGreaterThan(0);

    // 'GET' contains E → scores 0
    const stateWithE = slurpReducer(initial, { type: 'SLURP', tileIds: ['G0', 'E0', 'T0'] });
    expect(stateWithE!.brothScored).toBe(0);
  });

  it('theHealthInspector: word < 5 letters is rejected without consuming a slurp', () => {
    const initial = makePlayState({ modifier: 'theHealthInspector' });
    const before = initial.slurpsRemaining;
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.slurpsRemaining).toBe(before); // not consumed
    expect(state).toBe(initial);
  });

  it('theHealthInspector: word ≥ 5 letters is accepted', () => {
    const initial = makePlayState({
      modifier: 'theHealthInspector',
      bowl: [
        tile('B', 'B0'), tile('E', 'E0'), tile('A', 'A0'), tile('C', 'C0'), tile('H', 'H0'),
        tile('Y', 'Y0'), tile('S', 'S0'),
      ],
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['B0', 'E0', 'A0', 'C0', 'H0'] });
    expect(state!.slurpsRemaining).toBe(DEFAULT_SLURPS - 1);
    expect(state!.brothScored).toBeGreaterThan(0);
  });

  it('theFoodCritic: first slurp below 80 triggers immediate run loss', () => {
    const initial = makePlayState({ modifier: 'theFoodCritic', brothQuota: 9999 });
    // 'CAT' scores only 20, which is < 80
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.phase).toBe('over');
    expect(state!.finalScore).toBeNull();
  });

  it('theFoodCritic: second slurp below 80 triggers immediate run loss', () => {
    const initial = makePlayState({
      modifier: 'theFoodCritic',
      slurpCountThisTasting: 1, // this is the 2nd slurp
      brothQuota: 9999,
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.phase).toBe('over');
  });

  it('theFoodCritic: third slurp below 80 does NOT trigger run loss', () => {
    const initial = makePlayState({
      modifier: 'theFoodCritic',
      slurpCountThisTasting: 2, // this is the 3rd slurp
      brothQuota: 9999,
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.phase).toBe('play');
  });
});

// ── SPIT_OUT ──────────────────────────────────────────────────────────────────

describe('SPIT_OUT', () => {
  it('removes selected tiles from bowl', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0', 'A0'] });
    const bowlIds = state!.bowl.map(t => t.id);
    expect(bowlIds).not.toContain('C0');
    expect(bowlIds).not.toContain('A0');
  });

  it('moves discarded tiles to discard pile', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0', 'A0'] });
    const discardIds = state!.discard.map(t => t.id);
    expect(discardIds).toContain('C0');
    expect(discardIds).toContain('A0');
  });

  it('decrements spitoutsRemaining', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0'] });
    expect(state!.spitoutsRemaining).toBe(DEFAULT_SPITOUTS - 1);
  });

  it('draws tiles to refill bowl after spitout', () => {
    const initial = makePlayState({
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0')],
      pot: [tile('X', 'X0'), tile('Y', 'Y0')],
      bowlSize: 3,
    });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0'] });
    expect(state!.bowl).toHaveLength(3);
  });

  it('does not score', () => {
    const initial = makePlayState();
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0', 'A0'] });
    expect(state!.brothScored).toBe(0);
  });

  it('resets consecutiveNoSpitoutSlurps to 0', () => {
    const initial = makePlayState({ consecutiveNoSpitoutSlurps: 3 });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0'] });
    expect(state!.consecutiveNoSpitoutSlurps).toBe(0);
  });

  it('rejects SPIT_OUT when no spitouts remaining', () => {
    const initial = makePlayState({ spitoutsRemaining: 0 });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0'] });
    expect(state).toBe(initial);
  });

  it('rejects SPIT_OUT in non-play phase', () => {
    const initial = makePlayState({ phase: 'result' });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['C0'] });
    expect(state).toBe(initial);
  });
});

// ── Pot reshuffle ─────────────────────────────────────────────────────────────

describe('pot reshuffle', () => {
  it('reshuffles discard into pot when pot is empty during draw', () => {
    const initial = makePlayState({
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0')],
      pot: [],
      discard: [tile('X', 'X0'), tile('Y', 'Y0'), tile('Z', 'Z0')],
      bowlSize: 3,
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    // Discard should have been reshuffled into pot, and 3 drawn to refill bowl
    expect(state!.bowl).toHaveLength(3);
    // The 3 tiles played (C,A,T) plus any pre-existing discard → some become new pot+bowl
    // At minimum, bowl is refilled from old discard
    const bowlLetters = state!.bowl.map(t => t.letter).sort();
    expect(bowlLetters).toHaveLength(3);
  });

  it('discard is empty after pot reshuffle — all tiles cycle into pot/bowl', () => {
    const initial = makePlayState({
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0')],
      pot: [],
      discard: [tile('X', 'X0'), tile('Y', 'Y0'), tile('Z', 'Z0')],
      bowlSize: 3,
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    // All 6 tiles (X,Y,Z pre-existing + C,A,T just played) are reshuffled into pot,
    // then 3 are drawn to refill the bowl. Discard ends up empty.
    expect(state!.discard).toHaveLength(0);
    expect(state!.bowl).toHaveLength(3);
    expect(state!.pot).toHaveLength(3); // 6 total - 3 drawn = 3 remain in pot
  });
});

// ── OPEN_MARKET ───────────────────────────────────────────────────────────────

describe('OPEN_MARKET', () => {
  it('awards base coins for winning a Sip tasting', () => {
    const initial = makePlayState({ phase: 'result', brothScored: 400, brothQuota: 300, tasting: 1, coins: 0 });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    // Sip base = 3, slurpsRemaining = 4 (none used), interest = 0
    expect(state!.coins).toBe(3 + DEFAULT_SLURPS + 0);
    expect(state!.phase).toBe('market');
  });

  it('awards interest on coins held', () => {
    const initial = makePlayState({ phase: 'result', brothScored: 400, brothQuota: 300, tasting: 1, coins: 10, slurpsRemaining: 0 });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    // Sip base = 3, 0 slurp bonus, interest = floor(10/5) = 2
    expect(state!.coins).toBe(10 + 3 + 0 + 2);
  });

  it('caps interest at 5', () => {
    const initial = makePlayState({ phase: 'result', brothScored: 400, brothQuota: 300, tasting: 1, coins: 100, slurpsRemaining: 0 });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    // Interest capped at 5
    expect(state!.coins).toBe(100 + 3 + 0 + 5);
  });

  it('awards higher coins for Bowl Tasting', () => {
    const initial = makePlayState({ phase: 'result', brothScored: 500, brothQuota: 450, tasting: 2, coins: 0, slurpsRemaining: 0 });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    expect(state!.coins).toBe(5); // Bowl Tasting base = 5
  });

  it("awards highest coins for Chef's Challenge", () => {
    const initial = makePlayState({ phase: 'result', brothScored: 800, brothQuota: 700, tasting: 3, coins: 0, slurpsRemaining: 0 });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    expect(state!.coins).toBe(8); // Chef's base = 8
  });

  it('accumulates totalBrothScored', () => {
    const initial = makePlayState({
      phase: 'result',
      brothScored: 400,
      brothQuota: 300,
      totalBrothScored: 100,
    });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    expect(state!.totalBrothScored).toBe(500);
  });

  it('rejects OPEN_MARKET if not in result phase', () => {
    const initial = makePlayState({ phase: 'play' });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    expect(state).toBe(initial);
  });

  it('rejects OPEN_MARKET if quota was not met (tasting lost)', () => {
    const initial = makePlayState({ phase: 'result', brothScored: 100, brothQuota: 9999 });
    const state = slurpReducer(initial, { type: 'OPEN_MARKET' });
    expect(state).toBe(initial);
  });
});

// ── ADVANCE ───────────────────────────────────────────────────────────────────

describe('ADVANCE', () => {
  it('advances to next tasting within the same course', () => {
    const initial = makePlayState({ phase: 'market', course: 1, tasting: 1 });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.course).toBe(1);
    expect(state!.tasting).toBe(2);
    expect(state!.phase).toBe('reveal');
  });

  it('advances to the next course when tasting 3 is done', () => {
    const initial = makePlayState({ phase: 'market', course: 1, tasting: 3 });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.course).toBe(2);
    expect(state!.tasting).toBe(1);
  });

  it('sets the correct brothQuota for the next tasting', () => {
    const initial = makePlayState({ phase: 'market', course: 1, tasting: 1 });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.brothQuota).toBe(BROTH_QUOTAS[1][2]);
  });

  it('resets brothScored, slurps, spitouts for new tasting', () => {
    const initial = makePlayState({
      phase: 'market',
      course: 1,
      tasting: 1,
      brothScored: 500,
      slurpsRemaining: 1,
      spitoutsRemaining: 0,
    });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.brothScored).toBe(0);
    expect(state!.slurpsRemaining).toBe(DEFAULT_SLURPS);
    expect(state!.spitoutsRemaining).toBe(DEFAULT_SPITOUTS);
  });

  it('resets per-tasting tracking state', () => {
    const initial = makePlayState({
      phase: 'market',
      slurpCountThisTasting: 3,
      consecutiveNoSpitoutSlurps: 3,
      lastWordLetters: ['C', 'A', 'T'],
      pendingChipBonus: 15,
    });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.slurpCountThisTasting).toBe(0);
    expect(state!.consecutiveNoSpitoutSlurps).toBe(0);
    expect(state!.lastWordLetters).toHaveLength(0);
    expect(state!.pendingChipBonus).toBe(0);
  });

  it('completes the run when advancing past course 3 tasting 3', () => {
    const initial = makePlayState({
      phase: 'market',
      course: 3,
      tasting: 3,
      totalBrothScored: 50000,
    });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.phase).toBe('over');
    expect(state!.finalScore).toBe(50000);
  });

  it('rejects ADVANCE if not in market phase', () => {
    const initial = makePlayState({ phase: 'play' });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state).toBe(initial);
  });
});

// ── ABANDON_RUN ───────────────────────────────────────────────────────────────

describe('ABANDON_RUN', () => {
  it('sets phase to over without setting finalScore', () => {
    const initial = makePlayState({ phase: 'play' });
    const state = slurpReducer(initial, { type: 'ABANDON_RUN' });
    expect(state!.phase).toBe('over');
    expect(state!.finalScore).toBeNull();
  });

  it('can abandon from any active phase', () => {
    for (const phase of ['reveal', 'play', 'result', 'market'] as const) {
      const initial = makePlayState({ phase });
      const state = slurpReducer(initial, { type: 'ABANDON_RUN' });
      expect(state!.phase).toBe('over');
    }
  });
});

// ── LOAD_STATE ────────────────────────────────────────────────────────────────

describe('LOAD_STATE', () => {
  it('restores the exact state', () => {
    const saved = makePlayState({ brothScored: 250, coins: 7, course: 2, tasting: 3 });
    const state = slurpReducer(null, { type: 'LOAD_STATE', state: saved });
    expect(state).toEqual(saved);
  });
});

// ── USE_CONSUMABLE ────────────────────────────────────────────────────────────

describe('USE_CONSUMABLE', () => {
  it('msg: adds 30 coins immediately', () => {
    const initial = makePlayState({ consumables: ['msg'], coins: 5 });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'msg' });
    expect(state!.coins).toBe(35);
    expect(state!.consumables).not.toContain('msg');
  });

  it('fiveSpice: sets fiveSpiceActive', () => {
    const initial = makePlayState({ consumables: ['fiveSpice'] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'fiveSpice' });
    expect(state!.fiveSpiceActive).toBe(true);
    expect(state!.consumables).not.toContain('fiveSpice');
  });

  it('bonitoFlakes: sets bonitoFlakesActive', () => {
    const initial = makePlayState({ consumables: ['bonitoFlakes'] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'bonitoFlakes' });
    expect(state!.bonitoFlakesActive).toBe(true);
  });

  it('yuzu: sets yuzuActive', () => {
    const initial = makePlayState({ consumables: ['yuzu'] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'yuzu' });
    expect(state!.yuzuActive).toBe(true);
  });

  it('sichuanPepper: sets pendingConsumableInput', () => {
    const initial = makePlayState({ consumables: ['sichuanPepper'] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'sichuanPepper' });
    expect(state!.pendingConsumableInput).toMatchObject({ consumableId: 'sichuanPepper', step: 'letter' });
  });

  it('rejects if consumable not in tray', () => {
    const initial = makePlayState({ consumables: [] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'msg' });
    expect(state).toBe(initial);
  });

  it('rejects if not in play phase', () => {
    const initial = makePlayState({ consumables: ['msg'], phase: 'market' });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'msg' });
    expect(state).toBe(initial);
  });

  it('truffleShavings: doubles all pot chip values', () => {
    const initial = makePlayState({
      consumables: ['truffleShavings'],
      pot: [tile('A', 'A0'), tile('Z', 'Z0')],
    });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'truffleShavings' });
    const chipValues = state!.pot.map(t => t.chipValue);
    expect(chipValues).toEqual([2, 20]); // A=1→2, Z=10→20
  });

  it('saffron: sells all toppings at 2× sell value', () => {
    const initial = makePlayState({
      consumables: ['saffron'],
      toppings: ['chiliOil', 'corn'],
      coins: 0,
    });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'saffron' });
    expect(state!.toppings).toHaveLength(0);
    expect(state!.coins).toBe(8); // 2 toppings × sellValue 2 × 2 = 8
  });
});

// ── CHOOSE_CONSUMABLE_TARGET ──────────────────────────────────────────────────

describe('CHOOSE_CONSUMABLE_TARGET', () => {
  it('sichuanPepper: adds 3 copies of chosen letter to pot', () => {
    const initial = makePlayState({
      pendingConsumableInput: { consumableId: 'sichuanPepper', step: 'letter', context: '' },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_CONSUMABLE_TARGET', target: 'X' });
    const xTiles = state!.pot.filter(t => t.letter === 'X');
    expect(xTiles.length).toBeGreaterThanOrEqual(3);
    expect(state!.pendingConsumableInput).toBeNull();
  });

  it('ginger: removes all copies of chosen letter from pot', () => {
    const initial = makePlayState({
      pendingConsumableInput: { consumableId: 'ginger', step: 'letter', context: '' },
      pot: [tile('A', 'A0'), tile('A', 'A1'), tile('B', 'B0')],
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_CONSUMABLE_TARGET', target: 'A' });
    expect(state!.pot.filter(t => t.letter === 'A')).toHaveLength(0);
    expect(state!.pot.filter(t => t.letter === 'B')).toHaveLength(1);
  });

  it('garlicConfit: all copies of chosen letter gain +2 chip', () => {
    const initial = makePlayState({
      pendingConsumableInput: { consumableId: 'garlicConfit', step: 'letter', context: '' },
      pot: [tile('A', 'A0'), tile('A', 'A1'), tile('B', 'B0')],
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_CONSUMABLE_TARGET', target: 'A' });
    expect(state!.pot.find(t => t.id === 'A0')!.chipValue).toBe(3); // A=1+2=3
    expect(state!.pot.find(t => t.id === 'B0')!.chipValue).toBe(3); // B unchanged = 3
  });

  it('sesameOil: two-step tile selection sets wildcardTileIds', () => {
    const step1 = makePlayState({
      pendingConsumableInput: { consumableId: 'sesameOil', step: 'tile', context: '' },
    });
    const afterStep1 = slurpReducer(step1, { type: 'CHOOSE_CONSUMABLE_TARGET', target: 'C0' });
    expect(afterStep1!.pendingConsumableInput?.context).toBe('C0');
    expect(afterStep1!.wildcardTileIds).toHaveLength(0);

    const afterStep2 = slurpReducer(afterStep1!, { type: 'CHOOSE_CONSUMABLE_TARGET', target: 'A0' });
    expect(afterStep2!.wildcardTileIds).toEqual(['C0', 'A0']);
    expect(afterStep2!.pendingConsumableInput).toBeNull();
  });
});

// ── ENDLESS_CONTINUE ─────────────────────────────────────────────────────────

describe('ENDLESS_CONTINUE', () => {
  it('scales quota by ×2.5 and returns to reveal phase', () => {
    const initial = makePlayState({
      phase: 'over',
      finalScore: 50000,
      brothQuota: 22000,
      course: 3,
      tasting: 3,
    });
    const state = slurpReducer(initial, { type: 'ENDLESS_CONTINUE' });
    expect(state!.phase).toBe('reveal');
    expect(state!.brothQuota).toBe(55000);
    expect(state!.finalScore).toBeNull();
  });

  it('rejects if not in over phase or no finalScore', () => {
    const initial = makePlayState({ phase: 'play', finalScore: null });
    const state = slurpReducer(initial, { type: 'ENDLESS_CONTINUE' });
    expect(state).toBe(initial);
  });
});

// ── FIVESPICE + BONITOFLAKES ──────────────────────────────────────────────────

describe('fiveSpice + bonitoFlakes in SLURP', () => {
  it('fiveSpice multiplies score ×5 and clears flag', () => {
    const initial = makePlayState({
      fiveSpiceActive: true,
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0'), tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('S', 'S0')],
    });
    const base = slurpReducer(makePlayState({
      fiveSpiceActive: false,
      bowl: initial.bowl,
    }), { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    const withFive = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(withFive!.brothScored).toBeCloseTo(base!.brothScored * 5, 0);
    expect(withFive!.fiveSpiceActive).toBe(false);
  });

  it('bonitoFlakes clears after slurp', () => {
    const initial = makePlayState({
      bonitoFlakesActive: true,
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0'), tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('S', 'S0')],
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.bonitoFlakesActive).toBe(false);
  });
});

// ── Market helper ─────────────────────────────────────────────────────────────

function makeMarketState(overrides: Partial<SlurpRunState> = {}): SlurpRunState {
  const items: MarketOffer[] = [
    { id: 'topping_0', kind: 'topping', itemId: 'chiliOil', price: 4, sold: false },
    { id: 'topping_1', kind: 'topping', itemId: 'nori', price: 4, sold: false },
    { id: 'pantry_0', kind: 'pantry', itemId: 'miseEnPlace', price: 10, sold: false },
    { id: 'spice_0', kind: 'spice', itemId: 'msg', price: 3, sold: false },
    { id: 'flavor_0', kind: 'flavorPack', itemId: 'brothPack', price: 4, sold: false },
    { id: 'flavor_1', kind: 'flavorPack', itemId: 'noodlePack', price: 4, sold: false },
  ];
  return makePlayState({ phase: 'market', coins: 20, marketItems: items, ...overrides });
}

// ── BUY_ITEM ──────────────────────────────────────────────────────────────────

describe('BUY_ITEM', () => {
  it('adds topping to tray and deducts coins', () => {
    const state = slurpReducer(makeMarketState(), { type: 'BUY_ITEM', offerId: 'topping_0' });
    expect(state!.toppings).toContain('chiliOil');
    expect(state!.coins).toBe(16);
    expect(state!.marketItems.find(o => o.id === 'topping_0')!.sold).toBe(true);
  });

  it('adds pantry upgrade and adjusts bowlSize for miseEnPlace', () => {
    const initial = makeMarketState({ bowlSize: 7 });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'pantry_0' });
    expect(state!.pantryOwned).toContain('miseEnPlace');
    expect(state!.bowlSize).toBe(8);
    expect(state!.coins).toBe(10);
  });

  it('does not increase bowlSize for non-miseEnPlace pantry', () => {
    const items: MarketOffer[] = [
      { id: 'pantry_0', kind: 'pantry', itemId: 'larder', price: 8, sold: false },
    ];
    const initial = makeMarketState({ marketItems: items, bowlSize: 7 });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'pantry_0' });
    expect(state!.pantryOwned).toContain('larder');
    expect(state!.bowlSize).toBe(7);
  });

  it('adds spice card to consumables', () => {
    const state = slurpReducer(makeMarketState(), { type: 'BUY_ITEM', offerId: 'spice_0' });
    expect(state!.consumables).toContain('msg');
    expect(state!.coins).toBe(17);
  });

  it('buying flavorPack opens pendingFlavorPack with choices', () => {
    const state = slurpReducer(makeMarketState(), { type: 'BUY_ITEM', offerId: 'flavor_0' });
    expect(state!.pendingFlavorPack).not.toBeNull();
    expect(state!.pendingFlavorPack!.packId).toBe('brothPack');
    expect(state!.pendingFlavorPack!.choices).toHaveLength(4);
    expect(state!.pendingFlavorPack!.picksRemaining).toBe(2);
  });

  it('rejects buy when not enough coins', () => {
    const initial = makeMarketState({ coins: 3 });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'topping_0' });
    expect(state).toBe(initial);
  });

  it('rejects buy when not in market phase', () => {
    const initial = makeMarketState({ phase: 'play' });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'topping_0' });
    expect(state).toBe(initial);
  });

  it('rejects buying an already-sold item', () => {
    const items: MarketOffer[] = [
      { id: 'topping_0', kind: 'topping', itemId: 'chiliOil', price: 4, sold: true },
    ];
    const initial = makeMarketState({ marketItems: items });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'topping_0' });
    expect(state).toBe(initial);
  });

  it('rejects buying a topping when tray is full', () => {
    const initial = makeMarketState({
      toppings: ['chiliOil', 'nori', 'scallions', 'mirin', 'narutomaki'],
    });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'topping_1' });
    expect(state).toBe(initial);
  });

  it('rejects pantry item already owned', () => {
    const initial = makeMarketState({ pantryOwned: ['miseEnPlace'] });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'pantry_0' });
    expect(state).toBe(initial);
  });

  it('rejects spice card when tray is full (2-slot default)', () => {
    const initial = makeMarketState({ consumables: ['msg', 'fiveSpice'] });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'spice_0' });
    expect(state).toBe(initial);
  });

  it('allows spice card when larder expands tray to 4', () => {
    const initial = makeMarketState({
      consumables: ['msg', 'fiveSpice'],
      pantryOwned: ['larder'],
    });
    const state = slurpReducer(initial, { type: 'BUY_ITEM', offerId: 'spice_0' });
    expect(state!.consumables).toHaveLength(3);
  });
});

// ── CHOOSE_FLAVOR ─────────────────────────────────────────────────────────────

describe('CHOOSE_FLAVOR', () => {
  it('noodlePack: levels up chosen word pattern', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_1',
        packId: 'noodlePack',
        choices: ['broth', 'ramen', 'miso'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_1', choice: 'broth' });
    expect(state!.noodleLevels.broth).toBe(1);
    expect(state!.pendingFlavorPack).toBeNull();
  });

  it('noodlePack: caps level at NOODLE_UPGRADE_CAP (10)', () => {
    const initial = makeMarketState({
      noodleLevels: { broth: 10, noodle: 0, ramen: 0, udon: 0, pho: 0, tonkotsu: 0, dashi: 0, miso: 0 },
      pendingFlavorPack: {
        offerId: 'flavor_1',
        packId: 'noodlePack',
        choices: ['broth', 'ramen', 'miso'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_1', choice: 'broth' });
    expect(state!.noodleLevels.broth).toBe(10);
  });

  it('spicePack: adds chosen spice to consumables', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_0',
        packId: 'spicePack',
        choices: ['msg', 'fiveSpice', 'ginger'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_0', choice: 'fiveSpice' });
    expect(state!.consumables).toContain('fiveSpice');
    expect(state!.pendingFlavorPack).toBeNull();
  });

  it('umamiPack: adds chosen topping', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_0',
        packId: 'umamiPack',
        choices: ['corn', 'mirin'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_0', choice: 'corn' });
    expect(state!.toppings).toContain('corn');
    expect(state!.pendingFlavorPack).toBeNull();
  });

  it('brothPack: first pick keeps pack open with 1 remaining', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_0',
        packId: 'brothPack',
        choices: ['A', 'B', 'C', 'D'],
        picksRemaining: 2,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_0', choice: 'A' });
    expect(state!.pendingFlavorPack).not.toBeNull();
    expect(state!.pendingFlavorPack!.picksRemaining).toBe(1);
    expect(state!.pendingFlavorPack!.choices).not.toContain('A');
    expect(state!.pot.some(t => t.letter === 'A')).toBe(true);
  });

  it('brothPack: second pick closes pack', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_0',
        packId: 'brothPack',
        choices: ['B', 'C', 'D'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_0', choice: 'B' });
    expect(state!.pendingFlavorPack).toBeNull();
    expect(state!.pot.some(t => t.letter === 'B')).toBe(true);
  });

  it('rejects invalid offerId', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_0',
        packId: 'noodlePack',
        choices: ['broth'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'wrong', choice: 'broth' });
    expect(state).toBe(initial);
  });

  it('rejects choice not in choices list', () => {
    const initial = makeMarketState({
      pendingFlavorPack: {
        offerId: 'flavor_0',
        packId: 'noodlePack',
        choices: ['broth', 'ramen'],
        picksRemaining: 1,
      },
    });
    const state = slurpReducer(initial, { type: 'CHOOSE_FLAVOR', offerId: 'flavor_0', choice: 'udon' });
    expect(state).toBe(initial);
  });
});

// ── SELL_TOPPING ──────────────────────────────────────────────────────────────

describe('SELL_TOPPING', () => {
  it('removes topping and adds sell value to coins', () => {
    const initial = makeMarketState({ toppings: ['chiliOil', 'nori'], coins: 5 });
    const state = slurpReducer(initial, { type: 'SELL_TOPPING', toppingId: 'chiliOil' });
    expect(state!.toppings).not.toContain('chiliOil');
    expect(state!.toppings).toContain('nori');
    expect(state!.coins).toBe(7); // 5 + 2 sell value
  });

  it('rejects if not in market phase', () => {
    const initial = makeMarketState({ phase: 'play', toppings: ['chiliOil'] });
    const state = slurpReducer(initial, { type: 'SELL_TOPPING', toppingId: 'chiliOil' });
    expect(state).toBe(initial);
  });

  it('rejects if topping not equipped', () => {
    const initial = makeMarketState({ toppings: [] });
    const state = slurpReducer(initial, { type: 'SELL_TOPPING', toppingId: 'chiliOil' });
    expect(state).toBe(initial);
  });
});

// ── REROLL ────────────────────────────────────────────────────────────────────

describe('REROLL', () => {
  it('deducts cost and generates new market items', () => {
    const initial = makeMarketState({ coins: 10, marketRerollCount: 0 });
    const state = slurpReducer(initial, { type: 'REROLL' });
    expect(state!.coins).toBe(10 - REROLL_COSTS[0]);
    expect(state!.marketRerollCount).toBe(1);
    expect(state!.marketItems.length).toBeGreaterThan(0);
  });

  it('escalates cost with each reroll', () => {
    const initial = makeMarketState({ coins: 30, marketRerollCount: 1 });
    const state = slurpReducer(initial, { type: 'REROLL' });
    expect(state!.coins).toBe(30 - REROLL_COSTS[1]);
  });

  it('rejects if not enough coins', () => {
    const initial = makeMarketState({ coins: 0 });
    const state = slurpReducer(initial, { type: 'REROLL' });
    expect(state).toBe(initial);
  });

  it('rejects if not in market phase', () => {
    const initial = makeMarketState({ phase: 'play', coins: 20 });
    const state = slurpReducer(initial, { type: 'REROLL' });
    expect(state).toBe(initial);
  });
});

// ── SKIP_MARKET ───────────────────────────────────────────────────────────────

describe('SKIP_MARKET', () => {
  it('adds 5 coins and advances to next tasting', () => {
    const initial = makeMarketState({ coins: 3, course: 1, tasting: 1 });
    const state = slurpReducer(initial, { type: 'SKIP_MARKET' });
    expect(state!.coins).toBe(8);
    expect(state!.tasting).toBe(2);
    expect(state!.phase).toBe('reveal');
  });

  it('rejects if not in market phase', () => {
    const initial = makeMarketState({ phase: 'play' });
    const state = slurpReducer(initial, { type: 'SKIP_MARKET' });
    expect(state).toBe(initial);
  });
});

// ── BEGIN_TASTING extras ──────────────────────────────────────────────────────

describe('BEGIN_TASTING extras', () => {
  it('theIngredientShortage removes up to 6 tiles from pot', () => {
    const largePot = Array.from({ length: 20 }, (_, i) => tile('A', `A${i}`));
    const initial = makePlayState({
      phase: 'reveal',
      modifier: 'theIngredientShortage',
      pot: largePot,
      bowl: [],
      bowlSize: 3,
    });
    const state = slurpReducer(initial, { type: 'BEGIN_TASTING' });
    expect(state!.ingredientShortageTiles).toHaveLength(6);
    const totalTiles = state!.pot.length + state!.bowl.length + state!.discard.length + state!.ingredientShortageTiles.length;
    expect(totalTiles).toBe(20);
  });

  it('togarashi designates a letter from the drawn bowl', () => {
    const initial = makePlayState({
      phase: 'reveal',
      toppings: ['togarashi'],
      pot: Array.from({ length: 10 }, (_, i) => tile('A', `A${i}`)),
      bowl: [],
      bowlSize: 5,
    });
    const state = slurpReducer(initial, { type: 'BEGIN_TASTING' });
    expect(state!.togarashiLetter).toBe('A');
    expect(state!.phase).toBe('play');
  });
});

// ── SPIT_OUT extras ───────────────────────────────────────────────────────────

describe('SPIT_OUT extras', () => {
  it('shiitake: spitting a tile with chip ≥ 5 queues +15 bonus', () => {
    const highValueTile = { id: 'K0', letter: 'K', chipValue: 5 };
    const initial = makePlayState({
      toppings: ['shiitake'],
      bowl: [highValueTile, tile('A', 'A0'), tile('B', 'B0'), tile('C', 'C0'), tile('D', 'D0'), tile('E', 'E0'), tile('S', 'S0')],
      pendingChipBonus: 0,
    });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['K0'] });
    expect(state!.pendingChipBonus).toBe(15);
  });

  it('shiitake: spitting a low-value tile does not queue bonus', () => {
    const initial = makePlayState({
      toppings: ['shiitake'],
      bowl: [tile('A', 'A0'), tile('B', 'B0'), tile('C', 'C0'), tile('D', 'D0'), tile('E', 'E0'), tile('S', 'S0'), tile('T', 'T0')],
      pendingChipBonus: 0,
    });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['A0'] });
    expect(state!.pendingChipBonus).toBe(0);
  });

  it('fermented: spit tiles gain +2 chip value in discard', () => {
    const initial = makePlayState({
      pantryOwned: ['fermented'],
      bowl: [tile('A', 'A0'), tile('B', 'B0'), tile('C', 'C0'), tile('D', 'D0'), tile('E', 'E0'), tile('S', 'S0'), tile('T', 'T0')],
      discard: [],
    });
    const state = slurpReducer(initial, { type: 'SPIT_OUT', tileIds: ['A0'] });
    const spitTileInDiscard = state!.discard.find(t => t.id === 'A0');
    expect(spitTileInDiscard!.chipValue).toBe(LETTER_CHIPS['A'] + 2);
  });
});

// ── SLURP extras ──────────────────────────────────────────────────────────────

describe('SLURP extras', () => {
  it('nori: most-used letter in pot gains +1 chip permanently', () => {
    const aValue = LETTER_CHIPS['A'];
    // Large pot so tiles remain after drawing to refill bowl
    const bigPot = [
      tile('A', 'PA0'), tile('A', 'PA1'), tile('B', 'PB0'),
      tile('S', 'PS0'), tile('S', 'PS1'), tile('S', 'PS2'), tile('S', 'PS3'), tile('S', 'PS4'),
    ];
    const s2 = makePlayState({
      toppings: ['nori'],
      pot: bigPot,
      bowl: [
        tile('A', 'A0'), tile('A', 'A1'), tile('T', 'T0'),
        tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('N', 'N0'),
      ],
    });
    // Play "AAT" — A appears twice, most-used = A
    const state = slurpReducer(s2, { type: 'SLURP', tileIds: ['A0', 'A1', 'T0'] });
    // Find A tiles remaining in pot (not drawn into bowl)
    const allTiles = [...state!.pot, ...state!.bowl, ...state!.discard];
    const potA = allTiles.find(t => t.id === 'PA0');
    const potB = allTiles.find(t => t.id === 'PB0');
    // A tiles should gain +1
    expect(potA!.chipValue).toBe(aValue + 1);
    // B tiles unchanged
    expect(potB!.chipValue).toBe(LETTER_CHIPS['B']);
  });

  it('aburaAge: leftmost bowl tile after draw gains +1 chip', () => {
    const initial = makePlayState({
      toppings: ['aburaAge'],
      pot: [tile('X', 'X0'), tile('Y', 'Y0'), tile('Z', 'Z0')],
      bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0'), tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('S', 'S0')],
    });
    const state = slurpReducer(initial, { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] });
    expect(state!.bowl[0].chipValue).toBe(state!.bowl[0].chipValue);
    // The leftmost tile should have 1 extra chip compared to a run without aburaAge
    const baseState = slurpReducer(
      makePlayState({
        pot: [tile('X', 'X0'), tile('Y', 'Y0'), tile('Z', 'Z0')],
        bowl: [tile('C', 'C0'), tile('A', 'A0'), tile('T', 'T0'), tile('D', 'D0'), tile('O', 'O0'), tile('G', 'G0'), tile('S', 'S0')],
      }),
      { type: 'SLURP', tileIds: ['C0', 'A0', 'T0'] },
    );
    expect(state!.bowl[0].chipValue).toBe(baseState!.bowl[0].chipValue + 1);
  });
});

// ── ADVANCE extras ────────────────────────────────────────────────────────────

describe('ADVANCE extras', () => {
  it('assigns a modifier when advancing to Chef\'s Challenge (tasting 3)', () => {
    const initial = makeMarketState({ course: 1, tasting: 2 });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.tasting).toBe(3);
    expect(state!.modifier).not.toBeNull();
  });

  it('theRushHour modifier gives only 2 slurps', () => {
    // Force the modifier by seeding with a known value
    const initial = makeMarketState({
      course: 1,
      tasting: 2,
      rngState: 42,
      modifiersUsed: ['thePickyEater', 'theHealthInspector', 'theIngredientShortage', 'theFoodCritic', 'theClosingHour'],
    });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    // Only 1 modifier left: theRushHour
    expect(state!.modifier).toBe('theRushHour');
    expect(state!.slurpsRemaining).toBe(2);
  });

  it('kombu: all tiles everywhere gain +1 chip on course change', () => {
    const potTile = tile('A', 'PA0');
    const initial = makeMarketState({
      course: 1,
      tasting: 3,
      toppings: ['kombu'],
      pot: [potTile],
      bowl: [tile('B', 'B0')],
      discard: [tile('C', 'C0')],
    });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.course).toBe(2);
    const potA = state!.pot.find(t => t.id === 'PA0');
    expect(potA!.chipValue).toBe(LETTER_CHIPS['A'] + 1);
  });

  it('yuzu active: ADVANCE sets yuzuSkipTasting and clears yuzuActive', () => {
    const initial = makeMarketState({ course: 1, tasting: 1, yuzuActive: true });
    const state = slurpReducer(initial, { type: 'ADVANCE' });
    expect(state!.yuzuSkipTasting).toBe(true);
    expect(state!.yuzuActive).toBe(false);
  });
});

// ── USE_CONSUMABLE extras ─────────────────────────────────────────────────────

describe('USE_CONSUMABLE extras', () => {
  it('starAnise: discards entire bowl and draws fresh from pot', () => {
    const initial = makePlayState({
      consumables: ['starAnise'],
      bowl: [tile('A', 'A0'), tile('B', 'B0'), tile('C', 'C0'), tile('D', 'D0'), tile('E', 'E0'), tile('F', 'F0'), tile('G', 'G0')],
      pot: [tile('X', 'X0'), tile('Y', 'Y0'), tile('Z', 'Z0'), tile('Q', 'Q0'), tile('J', 'J0'), tile('K', 'K0'), tile('L', 'L0')],
      discard: [],
    });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'starAnise' });
    expect(state!.consumables).not.toContain('starAnise');
    // All original bowl tiles should be in discard
    expect(state!.discard.map(t => t.id)).toEqual(expect.arrayContaining(['A0', 'B0', 'C0']));
    // Bowl should be refilled from pot
    expect(state!.bowl).toHaveLength(initial.bowlSize);
  });

  it('sesameOil: sets pendingConsumableInput with tile step', () => {
    const initial = makePlayState({ consumables: ['sesameOil'] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'sesameOil' });
    expect(state!.pendingConsumableInput).toMatchObject({ consumableId: 'sesameOil', step: 'tile' });
    expect(state!.consumables).not.toContain('sesameOil');
  });

  it('blackGarlic: sets pendingConsumableInput with value step', () => {
    const initial = makePlayState({ consumables: ['blackGarlic'] });
    const state = slurpReducer(initial, { type: 'USE_CONSUMABLE', consumableId: 'blackGarlic' });
    expect(state!.pendingConsumableInput).toMatchObject({ consumableId: 'blackGarlic', step: 'value' });
    expect(state!.consumables).not.toContain('blackGarlic');
  });
});

// ── CHOOSE_CONSUMABLE_TARGET extras ──────────────────────────────────────────

describe('CHOOSE_CONSUMABLE_TARGET extras', () => {
  it('blackGarlic: two-step flow updates matching pot tiles', () => {
    // Step 1: pick the value to transform (e.g. '1' for A tiles)
    const step1 = makePlayState({
      pendingConsumableInput: { consumableId: 'blackGarlic', step: 'value', context: '' },
      pot: [tile('A', 'A0'), tile('A', 'A1'), tile('Z', 'Z0')],
    });
    const afterStep1 = slurpReducer(step1, { type: 'CHOOSE_CONSUMABLE_TARGET', target: '1' });
    expect(afterStep1!.pendingConsumableInput).toMatchObject({ consumableId: 'blackGarlic', step: 'letter', context: '1' });

    // Step 2: pick the new letter (e.g. 'X')
    const afterStep2 = slurpReducer(afterStep1!, { type: 'CHOOSE_CONSUMABLE_TARGET', target: 'X' });
    expect(afterStep2!.pendingConsumableInput).toBeNull();
    // A tiles (chipValue=1) should now be X tiles
    const convertedTiles = afterStep2!.pot.filter(t => t.id === 'A0' || t.id === 'A1');
    expect(convertedTiles.every(t => t.letter === 'X')).toBe(true);
    // Z tile unchanged
    expect(afterStep2!.pot.find(t => t.id === 'Z0')!.letter).toBe('Z');
  });
});

// ── YUZU_SKIP ─────────────────────────────────────────────────────────────────

describe('YUZU_SKIP', () => {
  it('skips to market phase when in reveal with yuzuSkipTasting', () => {
    const initial = makePlayState({
      phase: 'reveal',
      yuzuSkipTasting: true,
      course: 1,
      tasting: 2,
      brothScored: 400,
    });
    const state = slurpReducer(initial, { type: 'YUZU_SKIP' });
    expect(state!.phase).toBe('market');
    expect(state!.yuzuSkipTasting).toBe(false);
    expect(state!.marketItems.length).toBeGreaterThan(0);
    expect(state!.brothScored).toBe(0);
  });

  it('rejects if not in reveal phase', () => {
    const initial = makePlayState({ phase: 'play', yuzuSkipTasting: true });
    const state = slurpReducer(initial, { type: 'YUZU_SKIP' });
    expect(state).toBe(initial);
  });

  it('rejects if yuzuSkipTasting is false', () => {
    const initial = makePlayState({ phase: 'reveal', yuzuSkipTasting: false });
    const state = slurpReducer(initial, { type: 'YUZU_SKIP' });
    expect(state).toBe(initial);
  });
});
