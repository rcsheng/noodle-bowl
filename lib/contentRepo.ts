import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';

import { LEDE_BANK, QUIP_PROMPTS, SOF_BANK, SPREAD_BANK, WAVE_BANK } from '@/constants/data';
import type { ContentVersion } from '@/packages/shared/contentTypes';

import { db } from './firebase';

const CACHE_KEY = 'content_version_cache';

/**
 * Fetches the ContentVersion document for the given ISO week ID
 * (e.g. "2026-W20") directly by document ID. Returns null if not found.
 */
export async function findForWeek(weekId: string): Promise<ContentVersion | null> {
  const snap = await getDoc(doc(db, 'contentVersions', weekId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ContentVersion;
}

export async function getCached(): Promise<ContentVersion | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ContentVersion;
  } catch {
    return null;
  }
}

export async function cache(version: ContentVersion): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(version));
}

export function getFallback(): ContentVersion {
  return {
    id: 'bundled',
    contentWeek: '',
    createdAt: new Date(0).toISOString(),
    banks: {
      lede: LEDE_BANK,
      spread: SPREAD_BANK,
      sof: SOF_BANK,
      quip: QUIP_PROMPTS,
      wave: WAVE_BANK,
    },
  };
}

/**
 * Fills any empty game bank in `version` with the corresponding bundled-constants
 * bank. Applied per-bank so a partially-populated Firestore version keeps its
 * live content for populated games while falling back gracefully for others.
 * Does not mutate the input.
 */
export function mergeWithFallback(version: ContentVersion): ContentVersion {
  const fallback = getFallback();
  const b = version.banks;
  return {
    ...version,
    banks: {
      lede:   b.lede.length   > 0 ? b.lede   : fallback.banks.lede,
      spread: b.spread.length > 0 ? b.spread : fallback.banks.spread,
      sof:    b.sof.length    > 0 ? b.sof    : fallback.banks.sof,
      quip:   b.quip.length   > 0 ? b.quip   : fallback.banks.quip,
      wave:   b.wave.length   > 0 ? b.wave   : fallback.banks.wave,
    },
  };
}
