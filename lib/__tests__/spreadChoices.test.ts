import { generateChoices } from '../spreadChoices';

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
