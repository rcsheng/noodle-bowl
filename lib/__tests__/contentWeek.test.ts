import { computeActiveWeek, computeCurrentWeek, formatWeekId, getISOWeekYear } from '../contentWeek';

// ---------------------------------------------------------------------------
// getISOWeekYear
// ---------------------------------------------------------------------------
describe('getISOWeekYear', () => {
  it('returns week 21 for Saturday May 23 2026', () => {
    expect(getISOWeekYear(new Date('2026-05-23T12:00:00Z'))).toEqual({ year: 2026, week: 21 });
  });

  it('returns week 21 for Monday May 18 2026 (first day of week)', () => {
    expect(getISOWeekYear(new Date('2026-05-18T00:00:00Z'))).toEqual({ year: 2026, week: 21 });
  });

  it('returns week 21 for Sunday May 24 2026 (last day of week)', () => {
    expect(getISOWeekYear(new Date('2026-05-24T23:59:59Z'))).toEqual({ year: 2026, week: 21 });
  });

  it('returns week 22 for Monday May 25 2026 (first day of next week)', () => {
    expect(getISOWeekYear(new Date('2026-05-25T00:00:00Z'))).toEqual({ year: 2026, week: 22 });
  });

  it('returns week 1 of 2026 for Dec 29 2025 (Monday, first day of ISO week 1 2026)', () => {
    expect(getISOWeekYear(new Date('2025-12-29T00:00:00Z'))).toEqual({ year: 2026, week: 1 });
  });

  it('returns week 52 of 2025 for Dec 22 2025', () => {
    expect(getISOWeekYear(new Date('2025-12-22T00:00:00Z'))).toEqual({ year: 2025, week: 52 });
  });
});

// ---------------------------------------------------------------------------
// formatWeekId
// ---------------------------------------------------------------------------
describe('formatWeekId', () => {
  it('pads single-digit week numbers to 2 digits', () => {
    expect(formatWeekId(2026, 1)).toBe('2026-W01');
  });

  it('does not pad two-digit week numbers', () => {
    expect(formatWeekId(2026, 20)).toBe('2026-W20');
  });

  it('handles week 53', () => {
    expect(formatWeekId(2020, 53)).toBe('2020-W53');
  });
});

// ---------------------------------------------------------------------------
// computeCurrentWeek
// ---------------------------------------------------------------------------
describe('computeCurrentWeek', () => {
  it('returns 2026-W21 for May 23 2026', () => {
    expect(computeCurrentWeek(new Date('2026-05-23T12:00:00Z'))).toBe('2026-W21');
  });

  it('returns 2026-W22 for Monday May 25 2026', () => {
    expect(computeCurrentWeek(new Date('2026-05-25T00:00:00Z'))).toBe('2026-W22');
  });
});

// ---------------------------------------------------------------------------
// computeActiveWeek
// ---------------------------------------------------------------------------
describe('computeActiveWeek', () => {
  it('returns the previous week: 2026-W20 when current is week 21 (May 23)', () => {
    expect(computeActiveWeek(new Date('2026-05-23T12:00:00Z'))).toBe('2026-W20');
  });

  it('returns 2026-W21 on Monday May 25 2026 (week 22 starts, active = week 21)', () => {
    expect(computeActiveWeek(new Date('2026-05-25T00:00:00Z'))).toBe('2026-W21');
  });

  it('returns 2026-W01 when current week is 2026-W02 (Jan 5)', () => {
    expect(computeActiveWeek(new Date('2026-01-05T12:00:00Z'))).toBe('2026-W01');
  });

  it('wraps to 2025-W52 when current week is 2026-W01 (Jan 1 2026)', () => {
    expect(computeActiveWeek(new Date('2026-01-01T12:00:00Z'))).toBe('2025-W52');
  });
});
