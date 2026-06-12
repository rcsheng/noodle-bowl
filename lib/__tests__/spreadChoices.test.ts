import { generateChoices, buildChoicesForItem } from '../spreadChoices';

// Deterministic RNG for reproducible tests
function makeRng(seed: number[]): () => number {
  let i = 0;
  return () => seed[i++ % seed.length];
}

const rng = makeRng([0.1, 0.5, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6]);

describe('generateChoices', () => {
  it('returns exactly 4 choices', () => {
    expect(generateChoices(100, rng)).toHaveLength(4);
  });

  it('always includes the truth value', () => {
    [12, 47, 500, 3200, 150000, 1_200_000].forEach(truth => {
      expect(generateChoices(truth, makeRng([0.3, 0.6, 0.1, 0.8]))).toContain(truth);
    });
  });

  it('all choices are positive integers', () => {
    const choices = generateChoices(47, rng);
    choices.forEach(c => {
      expect(c).toBeGreaterThan(0);
      expect(Number.isInteger(c)).toBe(true);
    });
  });

  it('all choices are distinct', () => {
    [12, 100, 500, 5000, 1_000_000].forEach(truth => {
      const choices = generateChoices(truth, makeRng([0.2, 0.7, 0.4, 0.9, 0.1, 0.6]));
      const unique = new Set(choices);
      expect(unique.size).toBe(4);
    });
  });

  it('distractors are within 0.1x–10x of truth', () => {
    const truth = 500;
    const choices = generateChoices(truth, rng);
    const distractors = choices.filter(c => c !== truth);
    distractors.forEach(d => {
      expect(d).toBeGreaterThanOrEqual(truth * 0.1);
      expect(d).toBeLessThanOrEqual(truth * 10);
    });
  });

  it('produces nicely rounded numbers (no raw decimals)', () => {
    const truth = 473;
    const choices = generateChoices(truth, rng);
    choices.forEach(c => expect(Number.isInteger(c)).toBe(true));
  });

  it('works for large values (millions)', () => {
    const truth = 1_200_000;
    const choices = generateChoices(truth, makeRng([0.4, 0.1, 0.8, 0.3, 0.6]));
    expect(choices).toHaveLength(4);
    expect(choices).toContain(truth);
    const unique = new Set(choices);
    expect(unique.size).toBe(4);
  });

  it('works for small values (< 20)', () => {
    const truth = 7;
    const choices = generateChoices(truth, makeRng([0.3, 0.7, 0.1, 0.9, 0.5]));
    expect(choices).toHaveLength(4);
    expect(choices).toContain(truth);
    const unique = new Set(choices);
    expect(unique.size).toBe(4);
  });
});

describe('generateChoices — percent / maxValue (§percent)', () => {
  const rngFixed = makeRng([0.3, 0.7, 0.1, 0.9, 0.5, 0.2, 0.8, 0.4, 0.6]);

  it('no choice exceeds maxValue=100 for a mid-range percent truth', () => {
    const choices = generateChoices(75, rngFixed, { maxValue: 100 });
    choices.forEach(c => expect(c).toBeLessThanOrEqual(100));
  });

  it('no choice exceeds maxValue=100 for a high percent truth (95)', () => {
    [5, 25, 50, 75, 85, 95].forEach(truth => {
      const choices = generateChoices(truth, makeRng([0.2, 0.7, 0.4, 0.9, 0.1, 0.6]), { maxValue: 100 });
      choices.forEach(c => expect(c).toBeLessThanOrEqual(100));
    });
  });

  it('all choices are positive', () => {
    const choices = generateChoices(5, rngFixed, { maxValue: 100 });
    choices.forEach(c => expect(c).toBeGreaterThan(0));
  });

  it('returns exactly 4 distinct choices', () => {
    [5, 25, 50, 75, 95].forEach(truth => {
      const choices = generateChoices(truth, makeRng([0.2, 0.7, 0.4, 0.9, 0.1, 0.6]), { maxValue: 100 });
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
    });
  });

  it('always includes the truth value', () => {
    [5, 42, 75, 95].forEach(truth => {
      const choices = generateChoices(truth, makeRng([0.3, 0.6, 0.1, 0.8]), { maxValue: 100 });
      expect(choices).toContain(truth);
    });
  });
});

describe('buildChoicesForItem — percent unit detection', () => {
  const makeItem = (answer: number, unit: string) => ({
    question: 'Test?', answer, unit, others: [] as number[], explanation: 'Test.',
  });

  it('clamps choices to ≤100 for unit "percent"', () => {
    buildChoicesForItem(makeItem(75, 'percent')).forEach(c => expect(c).toBeLessThanOrEqual(100));
  });

  it('clamps choices to ≤100 for unit "%"', () => {
    buildChoicesForItem(makeItem(75, '%')).forEach(c => expect(c).toBeLessThanOrEqual(100));
  });

  it('clamps choices to ≤100 for unit "percentage"', () => {
    buildChoicesForItem(makeItem(75, 'percentage')).forEach(c => expect(c).toBeLessThanOrEqual(100));
  });

  it('does NOT clamp for non-percent units (choices may exceed 100)', () => {
    // 75 * 1.5 = 112 — multiplicative path should produce values over 100
    const allUnder100 = buildChoicesForItem(makeItem(75, 'kilometer')).every(c => c <= 100);
    expect(allUnder100).toBe(false);
  });
});

describe('generateChoices — decimal precision (§15.3)', () => {
  it('distractors are not all integers when truth has 1 decimal place', () => {
    const truth = 4.7;
    const choices = generateChoices(truth, makeRng([0.1, 0.5, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6]));
    const distractors = choices.filter(c => c !== truth);
    expect(distractors.every(d => Number.isInteger(d))).toBe(false);
  });

  it('all choices have at most 1 decimal place when truth has 1 decimal place', () => {
    const truth = 4.7;
    const choices = generateChoices(truth, makeRng([0.1, 0.5, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6]));
    choices.forEach(c => {
      expect(c).toBe(parseFloat(c.toFixed(1)));
    });
  });

  it('all choices have at most 2 decimal places when truth has 2 decimal places', () => {
    const truth = 3.14;
    const choices = generateChoices(truth, makeRng([0.2, 0.8, 0.4, 0.6, 0.1, 0.9, 0.3, 0.7, 0.5]));
    choices.forEach(c => {
      expect(c).toBe(parseFloat(c.toFixed(2)));
    });
  });

  it('integer truth still produces integer choices (no regression)', () => {
    const choices = generateChoices(500, makeRng([0.1, 0.5, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6]));
    choices.forEach(c => expect(Number.isInteger(c)).toBe(true));
  });
});
