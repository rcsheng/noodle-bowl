import { applyToppingEffectsOnSlurp, ToppingSlurpInput } from '../toppingEffects';
import type { LetterTile, ToppingId } from '@/packages/shared/slurp';

// ── Helpers ───────────────────────────────────────────────────────────────────

function t(letter: string, chipValue: number, id?: string): LetterTile {
  return { id: id ?? letter, letter, chipValue };
}

function makeInput(overrides: Partial<ToppingSlurpInput> = {}): ToppingSlurpInput {
  // Default: word "CAT", broth pattern (3 letters)
  const tiles = [t('C', 3, 'C0'), t('A', 1, 'A0'), t('T', 1, 'T0')];
  return {
    toppings: [],
    word: 'CAT',
    tiles,
    pattern: 'broth',
    baseLetterChips: 5,
    patternChips: 5,
    patternSeasoning: 1.0,
    pendingChipBonus: 0,
    slurpCountThisTasting: 1,
    consecutiveNoSpitoutSlurps: 0,
    lastWordLetters: [],
    slurpsRemaining: 4,
    togarashiLetter: null,
    coursesCompleted: 0,
    bowl: [...tiles, t('D', 2, 'D0'), t('O', 1, 'O0')],
    pot: [],
    discard: [],
    ...overrides,
  };
}

// No-topping baseline: chips=10, seasoning=2, score=20
const BASE_CHIPS = 10;    // 5 letter + 5 pattern
const BASE_SEASON = 2.0;  // 1 + 1.0 pattern
const BASE_SCORE = BASE_CHIPS * BASE_SEASON; // 20

// ── Individual topping tests ──────────────────────────────────────────────────

describe('chiliOil', () => {
  const topping: ToppingId[] = ['chiliOil'];

  it('no trigger: word without vowel cluster gives no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: topping, word: 'CAT' }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });

  it('triggers on vowel cluster: adds +4 seasoning', () => {
    const tiles = [t('O', 1), t('A', 1), t('T', 1)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: topping,
      word: 'OAT',
      tiles,
      baseLetterChips: 3,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 4);
  });
});

describe('softBoiledEgg', () => {
  const topping: ToppingId[] = ['softBoiledEgg'];

  it('first slurp (count=0): letter chips doubled', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: topping,
      slurpCountThisTasting: 0,
    }));
    expect(result.chips).toBe(5 * 2 + 5); // doubled letter chips + pattern
  });

  it('second slurp (count=1): no doubling', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: topping,
      slurpCountThisTasting: 1,
    }));
    expect(result.chips).toBe(BASE_CHIPS);
  });
});

describe('crispyShallots', () => {
  const topping: ToppingId[] = ['crispyShallots'];

  it('no double letters: no multiplier', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: topping, word: 'CAT' }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });

  it('double letters: ×3 seasoning', () => {
    const tiles = [t('A', 1), t('D', 2), t('D', 2)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: topping,
      word: 'ADD',
      tiles,
      baseLetterChips: 5,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON * 3);
  });
});

describe('fishCake', () => {
  const topping: ToppingId[] = ['fishCake'];

  it('no trigger: non-dashi word gets no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: topping, pattern: 'broth' }));
    expect(result.chips).toBe(BASE_CHIPS);
  });

  it('dashi pattern: +100 flat chips', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: topping, pattern: 'dashi' }));
    expect(result.chips).toBe(BASE_CHIPS + 100);
  });
});

describe('nori', () => {
  it('returns noriLetter = most-used letter among played tiles', () => {
    const tiles = [t('A', 1, 'A0'), t('A', 1, 'A1'), t('T', 1, 'T0')];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['nori'],
      word: 'AAT',
      tiles,
    }));
    expect(result.noriLetter).toBe('A');
  });

  it('returns some letter even with single-letter tiles', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['nori'] }));
    expect(result.noriLetter).not.toBeNull();
  });

  it('no nori: noriLetter is null', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: [] }));
    expect(result.noriLetter).toBeNull();
  });
});

describe('wontons', () => {
  it('no trigger: non-udon/pho pattern gives no bowl increase', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['wontons'], pattern: 'broth' }));
    expect(result.bowlSizeIncrease).toBe(0);
  });

  it('udon pattern: +1 bowl size', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['wontons'], pattern: 'udon' }));
    expect(result.bowlSizeIncrease).toBe(1);
  });

  it('pho pattern: +1 bowl size', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['wontons'], pattern: 'pho' }));
    expect(result.bowlSizeIncrease).toBe(1);
  });
});

describe('scallions', () => {
  it('adds +1 seasoning per vowel in the word', () => {
    const tiles = [t('O', 1), t('A', 1), t('T', 1)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['scallions'],
      word: 'OAT',
      tiles,
      baseLetterChips: 3,
    }));
    // OAT has 2 vowels (O, A)
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 2);
  });

  it('no vowels: no bonus', () => {
    const tiles = [t('B', 3), t('C', 3), t('D', 2)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['scallions'],
      word: 'BCD',
      tiles,
      baseLetterChips: 8,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });
});

describe('charSiu', () => {
  it('last slurp (slurpsRemaining=1): doubles score', () => {
    const base = applyToppingEffectsOnSlurp(makeInput({ toppings: [], slurpsRemaining: 1 }));
    const withChar = applyToppingEffectsOnSlurp(makeInput({ toppings: ['charSiu'], slurpsRemaining: 1 }));
    expect(withChar.score).toBeCloseTo(base.score * 2);
  });

  it('not last slurp: no bonus', () => {
    const base = applyToppingEffectsOnSlurp(makeInput({ toppings: [], slurpsRemaining: 3 }));
    const withChar = applyToppingEffectsOnSlurp(makeInput({ toppings: ['charSiu'], slurpsRemaining: 3 }));
    expect(withChar.score).toBeCloseTo(base.score);
  });
});

describe('teaEgg', () => {
  it('adds +5 chips × (slurpCount + 1)', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['teaEgg'],
      slurpCountThisTasting: 2,
    }));
    expect(result.chips).toBe(BASE_CHIPS + 5 * 3);
  });
});

describe('menma', () => {
  it('adds +5 chips × (consecutiveNoSpitout + 1)', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['menma'],
      consecutiveNoSpitoutSlurps: 3,
    }));
    expect(result.chips).toBe(BASE_CHIPS + 5 * 4);
  });
});

describe('narutomaki', () => {
  it('adds +2 chips per equipped topping (including self)', () => {
    const toppings: ToppingId[] = ['narutomaki', 'chiliOil'];
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings }));
    // 2 toppings × +2 = +4 chips
    expect(result.chips).toBe(BASE_CHIPS + 4);
  });
});

describe('corn', () => {
  it('no trigger: < 3 distinct vowels', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['corn'], word: 'CAT' }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });

  it('3+ distinct vowels: +4 seasoning', () => {
    const tiles = [t('A', 1), t('E', 1), t('I', 1), t('O', 1)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['corn'],
      word: 'AEIO',
      tiles,
      baseLetterChips: 4,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 4);
  });
});

describe('sesameSeeds', () => {
  it('adds +1 chip per played letter also in remaining bowl', () => {
    const playedTiles = [t('A', 1, 'PA0'), t('C', 3, 'PC0')];
    // Bowl has an unplayed A and D
    const bowl = [...playedTiles, t('A', 1, 'BA0'), t('D', 2, 'BD0')];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['sesameSeeds'],
      word: 'AC',
      tiles: playedTiles,
      bowl,
    }));
    // 'A' from the word is also in bowl (unplayed BA0) → +1
    expect(result.chips).toBe(BASE_CHIPS + 1);
  });
});

describe('yuzuKosho', () => {
  it('adds +1 seasoning per course completed', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['yuzuKosho'],
      coursesCompleted: 2,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 2);
  });

  it('0 courses completed: no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['yuzuKosho'],
      coursesCompleted: 0,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });
});

describe('mirin', () => {
  it('no repeated letters: +3 seasoning', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['mirin'], word: 'CAT' }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 3);
  });

  it('repeated letters: no bonus', () => {
    const tiles = [t('A', 1), t('A', 1), t('T', 1)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['mirin'],
      word: 'AAT',
      tiles,
      baseLetterChips: 3,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });
});

describe('aburaAge', () => {
  it('sets needsAburaAge = true when equipped', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['aburaAge'] }));
    expect(result.needsAburaAge).toBe(true);
  });

  it('needsAburaAge = false when not equipped', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: [] }));
    expect(result.needsAburaAge).toBe(false);
  });
});

describe('shiitake', () => {
  it('pendingChipBonus is included in chips', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['shiitake'],
      pendingChipBonus: 15,
    }));
    expect(result.chips).toBe(BASE_CHIPS + 15);
  });
});

describe('doubanjiang', () => {
  it('no trigger: < 2 rare letters', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['doubanjiang'], word: 'CAT' }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });

  it('2+ rare letters (J, X): ×2 seasoning', () => {
    const tiles = [t('J', 8), t('X', 8), t('A', 1)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['doubanjiang'],
      word: 'JXA',
      tiles,
      baseLetterChips: 17,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON * 2);
  });
});

describe('gochujang', () => {
  it('word starts and ends with same letter: +25 chips', () => {
    const tiles = [t('R', 4), t('A', 1), t('D', 2), t('A', 1), t('R', 4)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['gochujang'],
      word: 'RADAR',
      tiles,
    }));
    expect(result.chips).toBe(BASE_CHIPS + 25);
  });

  it('starts and ends with different letters: no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['gochujang'], word: 'CAT' }));
    expect(result.chips).toBe(BASE_CHIPS);
  });
});

describe('togarashi', () => {
  it('word contains togarashi letter: +7 seasoning', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['togarashi'],
      word: 'CAT',
      togarashiLetter: 'A',
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 7);
  });

  it('word does not contain togarashi letter: no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['togarashi'],
      word: 'CAT',
      togarashiLetter: 'Z',
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });

  it('togarashiLetter null: no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['togarashi'],
      togarashiLetter: null,
    }));
    expect(result.seasoning).toBeCloseTo(BASE_SEASON);
  });
});

describe('lard', () => {
  it('score < 500: no bonus coin', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({ toppings: ['lard'] }));
    expect(result.bonusCoins).toBe(0);
  });

  it('score ≥ 500: +1 bonus coin', () => {
    // Make chips=100, seasoning=10 → score=1000
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['lard'],
      baseLetterChips: 100,
      patternChips: 0,
      patternSeasoning: 9.0,
    }));
    expect(result.score).toBeGreaterThanOrEqual(500);
    expect(result.bonusCoins).toBe(1);
  });
});

describe('natto', () => {
  it('no overlap with last word: no bonus', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['natto'],
      word: 'CAT',
      lastWordLetters: ['D', 'O', 'G'],
    }));
    expect(result.chips).toBe(BASE_CHIPS);
  });

  it('overlapping letters: +10 per distinct overlap', () => {
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['natto'],
      word: 'CAT',
      lastWordLetters: ['C', 'A', 'R'],
    }));
    // C and A overlap → +20 chips
    expect(result.chips).toBe(BASE_CHIPS + 20);
  });
});

describe('multiple toppings', () => {
  it('multiple toppings stack correctly', () => {
    const tiles = [t('A', 1), t('E', 1), t('I', 1), t('O', 1)];
    const result = applyToppingEffectsOnSlurp(makeInput({
      toppings: ['corn', 'mirin', 'yuzuKosho'],
      word: 'AEIO',
      tiles,
      baseLetterChips: 4,
      coursesCompleted: 1,
    }));
    // corn: AEIO has 4 distinct vowels → +4 seasoning
    // mirin: no repeated letters → +3 seasoning
    // yuzuKosho: 1 course completed → +1 seasoning
    expect(result.seasoning).toBeCloseTo(BASE_SEASON + 4 + 3 + 1);
  });
});
