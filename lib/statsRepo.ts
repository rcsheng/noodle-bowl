import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppState } from '@/context/gameReducer';
import { db } from './firebase';

export type StatsSnapshot = AppState['stats'];

export async function writeStats(uid: string, stats: StatsSnapshot): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'meta', 'stats'),
    { ...stats, updatedAt: serverTimestamp() },
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
