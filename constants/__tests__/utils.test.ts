import {
  calculatePoints,
  formatRelativeDate,
  genChallengeUrl,
  getTodayISODate,
  pickFromBank,
  scoreSpread,
  shuffleIndices,
} from '../utils';

// ---------------------------------------------------------------------------
// calculatePoints
// ---------------------------------------------------------------------------
describe('calculatePoints', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 0 when correct is false regardless of streak', () => {
    expect(calculatePoints(false, 5)).toBe(0);
    expect(calculatePoints(false, 0)).toBe(0);
    expect(calculatePoints(false, 100)).toBe(0);
  });

  test('returns base amount (10) when streak is 0 and correct is true', () => {
    expect(calculatePoints(true, 0)).toBe(10);
  });

  test('adds streak bonus (streak * 2) to base points', () => {
    expect(calculatePoints(true, 3)).toBe(10 + 3 * 2); // 16
    expect(calculatePoints(true, 5)).toBe(10 + 5 * 2); // 20
  });

  test('caps streak bonus at 20 points', () => {
    expect(calculatePoints(true, 10)).toBe(10 + 20); // 30
    expect(calculatePoints(true, 50)).toBe(10 + 20); // 30
  });

  test('respects custom baseAmount parameter', () => {
    expect(calculatePoints(true, 0, 25)).toBe(25);
    expect(calculatePoints(true, 3, 25)).toBe(25 + 6); // 31
  });

  test('handles boundary: streak = 10 gives exactly base + 20', () => {
    expect(calculatePoints(true, 10)).toBe(30);
  });

  test('handles streak just below cap (streak = 9)', () => {
    expect(calculatePoints(true, 9)).toBe(10 + 18); // 28
  });
});

// ---------------------------------------------------------------------------
// getTodayISODate
// ---------------------------------------------------------------------------
describe('getTodayISODate', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns YYYY-MM-DD format', () => {
    jest.useFakeTimers({ now: new Date('2026-04-26T12:00:00').getTime() });
    const result = getTodayISODate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('pads single-digit month correctly (January = "01")', () => {
    jest.useFakeTimers({ now: new Date('2026-01-05T12:00:00').getTime() });
    const result = getTodayISODate();
    expect(result).toBe('2026-01-05');
  });

  test('pads single-digit day correctly', () => {
    jest.useFakeTimers({ now: new Date('2026-04-05T12:00:00').getTime() });
    const result = getTodayISODate();
    expect(result).toBe('2026-04-05');
  });

  test('returns correct date for 2026-04-26', () => {
    jest.useFakeTimers({ now: new Date('2026-04-26T12:00:00').getTime() });
    expect(getTodayISODate()).toBe('2026-04-26');
  });

  test('returns correct date for 2026-12-31', () => {
    jest.useFakeTimers({ now: new Date('2026-12-31T12:00:00').getTime() });
    expect(getTodayISODate()).toBe('2026-12-31');
  });
});

// ---------------------------------------------------------------------------
// formatRelativeDate  (mock "today" to 2026-04-26)
// ---------------------------------------------------------------------------
describe('formatRelativeDate', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-04-26T12:00:00').getTime() });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('same day returns "Today"', () => {
    expect(formatRelativeDate('2026-04-26')).toBe('Today');
  });

  test('1 day ago returns "Yesterday"', () => {
    expect(formatRelativeDate('2026-04-25')).toBe('Yesterday');
  });

  test('4 days ago returns "4 days ago"', () => {
    expect(formatRelativeDate('2026-04-22')).toBe('4 days ago');
  });

  test('exactly 7 days ago returns "1 week ago"', () => {
    expect(formatRelativeDate('2026-04-19')).toBe('1 week ago');
  });

  test('14 days ago returns "2 weeks ago"', () => {
    expect(formatRelativeDate('2026-04-12')).toBe('2 weeks ago');
  });
});

// ---------------------------------------------------------------------------
// shuffleIndices
// ---------------------------------------------------------------------------
describe('shuffleIndices', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns array of correct length', () => {
    expect(shuffleIndices(5)).toHaveLength(5);
    expect(shuffleIndices(10)).toHaveLength(10);
  });

  test('contains each index 0..length-1 exactly once', () => {
    const result = shuffleIndices(6);
    expect(result.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('handles length 0 returns empty array', () => {
    expect(shuffleIndices(0)).toEqual([]);
  });

  test('handles length 1 returns [0]', () => {
    expect(shuffleIndices(1)).toEqual([0]);
  });

  test('is deterministic when Math.random is mocked to 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const first = shuffleIndices(5);
    const second = shuffleIndices(5);
    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// genChallengeUrl
// ---------------------------------------------------------------------------
describe('genChallengeUrl', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns string starting with "https://noodlebowl.app/c/"', () => {
    const url = genChallengeUrl();
    expect(url.startsWith('https://noodlebowl.app/c/')).toBe(true);
  });

  test('suffix after "/c/" is exactly 8 characters', () => {
    const url = genChallengeUrl();
    const suffix = url.replace('https://noodlebowl.app/c/', '');
    expect(suffix).toHaveLength(8);
  });

  test('suffix only contains [A-Z0-9] characters', () => {
    const url = genChallengeUrl();
    const suffix = url.replace('https://noodlebowl.app/c/', '');
    expect(suffix).toMatch(/^[A-Z0-9]+$/);
  });

  test('two successive calls return different URLs (with real Math.random)', () => {
    const url1 = genChallengeUrl();
    const url2 = genChallengeUrl();
    // With 36^8 ≈ 2.8 trillion possibilities the collision probability is negligible
    expect(url1).not.toBe(url2);
  });
});

// ---------------------------------------------------------------------------
// pickFromBank
// ---------------------------------------------------------------------------
describe('pickFromBank', () => {
  const bank = ['a', 'b', 'c', 'd', 'e'];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns item from the bank at a valid index', () => {
    const { idx, item } = pickFromBank(bank, []);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(bank.length);
    expect(item).toBe(bank[idx]);
  });

  test('newSeen includes the picked index', () => {
    const { idx, newSeen } = pickFromBank(bank, []);
    expect(newSeen).toContain(idx);
  });

  test('picks only from unseen indices when seen is partial', () => {
    // Mock random to always pick index 0 of the available array
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const seen = [0, 1, 2]; // indices 3 and 4 are available
    const { idx } = pickFromBank(bank, seen);
    // available = [3, 4]; Math.floor(0 * 2) = 0 → picks available[0] = 3
    expect(idx).toBe(3);
  });

  test('when all items are seen, resets and picks from full bank', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    // seen covers all indices → resets to []
    const fullSeen = [0, 1, 2, 3, 4];
    const { idx, newSeen } = pickFromBank(bank, fullSeen);
    // After reset, available = [0,1,2,3,4]; Math.floor(0*5)=0 → picks 0
    expect(idx).toBe(0);
    // newSeen should only contain the newly picked index (reset occurred)
    expect(newSeen).toEqual([0]);
  });

  test('does not mutate the original seen array', () => {
    const seen = [1, 2];
    const original = [...seen];
    pickFromBank(bank, seen);
    expect(seen).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// scoreSpread
// ---------------------------------------------------------------------------
describe('scoreSpread', () => {
  test('exact answer gives correct=true, full points (25), deviation=0', () => {
    const result = scoreSpread(100, 100);
    expect(result.correct).toBe(true);
    expect(result.points).toBe(25);
    expect(result.deviation).toBe(0);
  });

  test('within 5% gives correct=true, points=25', () => {
    // 104 is 4% above 100
    const result = scoreSpread(104, 100);
    expect(result.correct).toBe(true);
    expect(result.points).toBe(25);
  });

  test('within 15% gives correct=true, points=15', () => {
    // 110 is 10% above 100 (between 5% and 15%)
    const result = scoreSpread(110, 100);
    expect(result.correct).toBe(true);
    expect(result.points).toBe(15);
  });

  test('within 30% gives correct=true, points=8', () => {
    // 120 is 20% above 100 (between 15% and 30%)
    const result = scoreSpread(120, 100);
    expect(result.correct).toBe(true);
    expect(result.points).toBe(8);
  });

  test('outside 30% gives correct=false, points=0', () => {
    // 150 is 50% above 100
    const result = scoreSpread(150, 100);
    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
  });

  test('works symmetrically for guesses below the answer', () => {
    // 90 is 10% below 100 → within 15%, points=15
    const result = scoreSpread(90, 100);
    expect(result.correct).toBe(true);
    expect(result.points).toBe(15);
  });
});
