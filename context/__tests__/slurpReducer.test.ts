import { slurpReducer } from '../slurpReducer';
import {
  BROTH_BASE_DISTRIBUTIONS,
  distributionTotal,
} from '@/constants/slurp/brothBases';
import { LETTER_CHIPS } from '@/constants/slurp/letterChips';
import { DEFAULT_BOWL_SIZE, DEFAULT_SLURPS, DEFAULT_SPITOUTS, BROTH_QUOTAS } from '@/constants/slurp/quotas';
import type { SlurpRunState, LetterTile, WordPattern } from '@/packages/shared/slurp';

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
    slurpCountThisTasting: 0,
    consecutiveNoSpitoutSlurps: 0,
    lastWordLetters: [],
    pendingChipBonus: 0,
    togarashiLetter: null,
    coursesCompleted: 0,
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
