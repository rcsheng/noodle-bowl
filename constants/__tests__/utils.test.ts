import {
  calculatePoints,
  decodeChallengeToken,
  formatRelativeDate,
  genChallengeUrl,
  getTodayISODate,
  pickFromBank,
  pickFromSof,
  scoreSpread,
  shuffleIndices,
} from '../utils';
import type { SofItem } from '../data';

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
  const payload = {
    gameId: 'lede',
    questionIndex: 2,
    senderPrediction: 'Iris',
    senderAnswer: 'Dex',
    senderName: 'Alex',
    issuedAt: '2026-04-26T12:00:00.000Z',
  };

  test('returns string starting with "https://noodlebowl.app/c/"', () => {
    const url = genChallengeUrl(payload);
    expect(url.startsWith('https://noodlebowl.app/c/')).toBe(true);
  });

  test('suffix after "/c/" is non-empty base64url string', () => {
    const url = genChallengeUrl(payload);
    const suffix = url.replace('https://noodlebowl.app/c/', '');
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('two different payloads produce different URLs', () => {
    const url1 = genChallengeUrl({ ...payload, questionIndex: 1 });
    const url2 = genChallengeUrl({ ...payload, questionIndex: 2 });
    expect(url1).not.toBe(url2);
  });

  test('decodeChallengeToken round-trips the payload', () => {
    const url = genChallengeUrl(payload);
    const token = url.replace('https://noodlebowl.app/c/', '');
    const decoded = decodeChallengeToken(token);
    expect(decoded).toEqual(payload);
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

  test('returns exhausted:false with item from the bank at a valid index', () => {
    const result = pickFromBank(bank, []);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    expect(result.idx).toBeGreaterThanOrEqual(0);
    expect(result.idx).toBeLessThan(bank.length);
    expect(result.item).toBe(bank[result.idx]);
  });

  test('newSeen includes the picked index', () => {
    const result = pickFromBank(bank, []);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    expect(result.newSeen).toContain(result.idx);
  });

  test('picks only from unseen indices when seen is partial', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const seen = [0, 1, 2]; // indices 3 and 4 are available
    const result = pickFromBank(bank, seen);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    // available = [3, 4]; Math.floor(0 * 2) = 0 → picks available[0] = 3
    expect(result.idx).toBe(3);
  });

  test('returns exhausted:true when all items have been seen (no wraparound)', () => {
    const fullSeen = [0, 1, 2, 3, 4];
    const result = pickFromBank(bank, fullSeen);
    expect(result.exhausted).toBe(true);
  });

  test('returns exhausted:true when bank is empty', () => {
    const result = pickFromBank([], []);
    expect(result.exhausted).toBe(true);
  });

  test('does not mutate the original seen array', () => {
    const seen = [1, 2];
    const original = [...seen];
    pickFromBank(bank, seen);
    expect(seen).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// pickFromSof
// ---------------------------------------------------------------------------
describe('pickFromSof', () => {
  const standard: SofItem = {
    topic: 'std', intro: 'i', weirdAndTrue: false,
    claims: [{ text: 'c1', isScience: true, explanation: 'e', source: null }],
  };
  const weird: SofItem = {
    topic: 'wrd', intro: 'i', weirdAndTrue: true,
    claims: [{ text: 'c1', isScience: true, explanation: 'e', source: null }],
  };
  const sofBank: SofItem[] = [standard, weird, standard, weird]; // indices 0,2 std; 1,3 weird

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns exhausted:false with a standard item when weirdMode=false', () => {
    const result = pickFromSof(sofBank, false, []);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    expect(result.item.weirdAndTrue).toBe(false);
  });

  test('returns exhausted:false with a weird item when weirdMode=true', () => {
    const result = pickFromSof(sofBank, true, []);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    expect(result.item.weirdAndTrue).toBe(true);
  });

  test('does not pick an already-seen index in the same mode', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    // Standard items are at indices 0 and 2. Seen = [0] → must pick 2.
    const result = pickFromSof(sofBank, false, [0]);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    expect(result.idx).toBe(2);
  });

  test('newSeen includes the picked index', () => {
    const result = pickFromSof(sofBank, false, []);
    expect(result.exhausted).toBe(false);
    if (result.exhausted) return;
    expect(result.newSeen).toContain(result.idx);
  });

  test('returns exhausted:true when all items in the requested mode have been seen', () => {
    // All standard items (indices 0, 2) are in seen
    const result = pickFromSof(sofBank, false, [0, 2]);
    expect(result.exhausted).toBe(true);
  });

  test('returns exhausted:true when bank has no items in the requested mode', () => {
    const standardOnlyBank: SofItem[] = [standard, standard];
    const result = pickFromSof(standardOnlyBank, true, []); // no weird items
    expect(result.exhausted).toBe(true);
  });

  test('returns exhausted:true when bank is empty', () => {
    const result = pickFromSof([], false, []);
    expect(result.exhausted).toBe(true);
  });

  test('does not mutate the original seen array', () => {
    const seen = [0];
    const original = [...seen];
    pickFromSof(sofBank, false, seen);
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
