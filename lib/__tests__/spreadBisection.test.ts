import { planBisection, applyAnswer, niceRound, BisectionPlan } from '../spreadBisection';
import { SpreadItem } from '@/constants/data';

function makeItem(answer: number): SpreadItem {
  return { question: 'Test question?', answer, unit: 'units', others: [], explanation: '' };
}

function finalBracket(plan: BisectionPlan) {
  return plan.rounds[2].bracketAfter;
}

describe('planBisection convergence', () => {
  test('truth=16 converges to bracket width ≤ 6 containing truth', () => {
    const plan = planBisection(makeItem(16));
    const b = finalBracket(plan);
    expect(b.lo).toBeLessThanOrEqual(16);
    expect(b.hi).toBeGreaterThanOrEqual(16);
    expect(b.hi - b.lo).toBeLessThanOrEqual(6);
  });

  test('truth=847 converges to bracket width ≤ 215 containing truth', () => {
    const plan = planBisection(makeItem(847));
    const b = finalBracket(plan);
    expect(b.lo).toBeLessThanOrEqual(847);
    expect(b.hi).toBeGreaterThanOrEqual(847);
    expect(b.hi - b.lo).toBeLessThanOrEqual(215);
  });

  test('truth=12400 converges to bracket width ≤ 3100 containing truth', () => {
    const plan = planBisection(makeItem(12400));
    const b = finalBracket(plan);
    expect(b.lo).toBeLessThanOrEqual(12400);
    expect(b.hi).toBeGreaterThanOrEqual(12400);
    expect(b.hi - b.lo).toBeLessThanOrEqual(3100);
  });

  test('truth=3 converges to bracket width ≤ 4 containing truth (small-truth carve-out)', () => {
    const plan = planBisection(makeItem(3));
    const b = finalBracket(plan);
    expect(b.lo).toBeLessThanOrEqual(3);
    expect(b.hi).toBeGreaterThanOrEqual(3);
    expect(b.hi - b.lo).toBeLessThanOrEqual(4);
  });

  test('produces exactly 3 rounds', () => {
    [3, 16, 847, 12400].forEach(truth => {
      expect(planBisection(makeItem(truth)).rounds).toHaveLength(3);
    });
  });
});

describe('planBisection nice numbers', () => {
  test('all thresholds are nice numbers (niceRound is idempotent)', () => {
    [3, 16, 847, 12400, 100, 1000, 50, 500].forEach(truth => {
      const plan = planBisection(makeItem(truth));
      plan.rounds.forEach((round, i) => {
        expect(niceRound(round.threshold)).toBe(round.threshold);
      });
    });
  });
});

describe('applyAnswer monotonicity', () => {
  test('more answer never widens the bracket', () => {
    const bracket = { lo: 100, hi: 1000 };
    const result = applyAnswer(bracket, 500, 'more');
    expect(result.lo).toBeGreaterThanOrEqual(bracket.lo);
    expect(result.hi).toBeLessThanOrEqual(bracket.hi);
  });

  test('fewer answer never widens the bracket', () => {
    const bracket = { lo: 100, hi: 1000 };
    const result = applyAnswer(bracket, 500, 'fewer');
    expect(result.lo).toBeGreaterThanOrEqual(bracket.lo);
    expect(result.hi).toBeLessThanOrEqual(bracket.hi);
  });

  test('more with threshold below lo leaves lo unchanged', () => {
    const bracket = { lo: 200, hi: 1000 };
    const result = applyAnswer(bracket, 50, 'more');
    expect(result.lo).toBe(200);
    expect(result.hi).toBe(1000);
  });

  test('fewer with threshold above hi leaves hi unchanged', () => {
    const bracket = { lo: 100, hi: 800 };
    const result = applyAnswer(bracket, 2000, 'fewer');
    expect(result.lo).toBe(100);
    expect(result.hi).toBe(800);
  });
});
