/**
 * ISO 8601 calendar-week utilities.
 *
 * Content is served by the previous complete ISO week (Mon–Sun, UTC).
 * Example: on Sat 2026-05-23 (week 21), users see week 20 content (May 11–17).
 *          on Mon 2026-05-25 (week 22 starts), users see week 21 content (May 18–24).
 */

/**
 * Returns the ISO 8601 year and week number for a given UTC date.
 * Week 1 is the week containing the first Thursday of the year.
 * Weeks start on Monday.
 */
export function getISOWeekYear(date: Date): { year: number; week: number } {
  // Work in UTC to avoid local-timezone boundary drift.
  // Shift the date to Thursday of its ISO week — Thursday is the pivot day that
  // determines the ISO year (the year that "owns" the week).
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Formats a year + week number as an ISO week string, e.g. "2026-W20". */
export function formatWeekId(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Returns the ISO week string for the given date (defaults to now). */
export function computeCurrentWeek(date: Date = new Date()): string {
  const { year, week } = getISOWeekYear(date);
  return formatWeekId(year, week);
}

/**
 * Returns the active content week for users on the given date (defaults to now).
 * This is always the previous ISO week: users see last week's content, not this week's.
 *
 * Subtracting 7 days always lands in the previous ISO week and handles year-end
 * boundaries correctly (e.g. week 1 → last week of the previous year).
 */
export function computeActiveWeek(date: Date = new Date()): string {
  const prevWeekDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - 7,
  ));
  const { year, week } = getISOWeekYear(prevWeekDate);
  return formatWeekId(year, week);
}

/**
 * Returns a human-readable date range for the Mon–Sun span of a given ISO week.
 * Same-month weeks: "May 11–17". Cross-month weeks: "May 31 – Jun 6".
 * Returns an empty string if weekId is not a valid ISO week string.
 */
export function getWeekDateRange(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return '';
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // Jan 4 of the ISO year is always in week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
  const week1Mon = new Date(jan4.getTime() - (dow - 1) * 86_400_000);
  const weekMon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86_400_000);
  const weekSun = new Date(weekMon.getTime() + 6 * 86_400_000);

  const monMonth = weekMon.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const sunMonth = weekSun.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const monDay = weekMon.getUTCDate();
  const sunDay = weekSun.getUTCDate();

  if (monMonth === sunMonth) {
    return `${monMonth} ${monDay}–${sunDay}`;
  }
  return `${monMonth} ${monDay} – ${sunMonth} ${sunDay}`;
}
