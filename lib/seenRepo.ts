import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { GameId } from '@/constants/data';
import type { AppState } from '@/context/gameReducer';
import { db } from './firebase';

export type SeenSnapshot = AppState['seen'];

const GAMES: GameId[] = ['lede', 'spread', 'sof', 'quip', 'wave'];

const EMPTY_SEEN: SeenSnapshot = {
  lede: [],
  spread: [],
  sof: [],
  quip: [],
  wave: [],
};

export async function writeSeen(uid: string, seen: SeenSnapshot): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'meta', 'seen'),
    { ...seen, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function readSeen(uid: string): Promise<SeenSnapshot | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'meta', 'seen'));
  if (!snap.exists()) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt: _, ...raw } = snap.data() as Partial<SeenSnapshot> & { updatedAt?: unknown };
  const merged: SeenSnapshot = { ...EMPTY_SEEN };
  GAMES.forEach(g => {
    const arr = raw[g];
    if (Array.isArray(arr)) merged[g] = arr;
  });
  return merged;
}
