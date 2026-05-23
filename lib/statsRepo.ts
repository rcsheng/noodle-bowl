import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppState } from '@/context/gameReducer';
import { db } from './firebase';

export type StatsSnapshot = AppState['stats'];

/** Replaces NaN with 0 for a numeric field — Firestore can store NaN as a float,
 *  which breaks arithmetic on the next read. */
function sanitizeNum(val: number | undefined | null): number {
  return typeof val === 'number' && isFinite(val) ? val : 0;
}

export async function writeStats(uid: string, stats: StatsSnapshot): Promise<void> {
  // Exclude transient display flags that must never be persisted to Firestore.
  // showStreakCelebration is session-only; if persisted it would re-trigger the
  // modal on the next session via MERGE_FROM_SERVER.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { showStreakCelebration: _transient, ...persistable } = stats;
  // Sanitize numeric streak fields: Firestore stores NaN as a valid IEEE 754 float,
  // so a NaN that gets written here survives reads and corrupts future arithmetic.
  const sanitized = {
    ...persistable,
    weeklyStreak: sanitizeNum(persistable.weeklyStreak),
    bestWeeklyStreak: sanitizeNum(persistable.bestWeeklyStreak),
    totalWeeksPlayed: sanitizeNum(persistable.totalWeeksPlayed),
    streakShieldsAvailable: sanitizeNum(persistable.streakShieldsAvailable),
  };
  await setDoc(
    doc(db, 'users', uid, 'meta', 'stats'),
    { ...sanitized, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function readStats(uid: string): Promise<StatsSnapshot | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'meta', 'stats'));
  if (!snap.exists()) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt: _, ...stats } = snap.data() as StatsSnapshot & { updatedAt?: unknown };
  return stats;
}
