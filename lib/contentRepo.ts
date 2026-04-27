import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { LEDE_BANK, QUIP_PROMPTS, SOF_BANK, SPREAD_BANK, WAVE_BANK } from '@/constants/data';
import type { ContentVersion } from '@/packages/shared/contentTypes';

import { db } from './firebase';

const CACHE_KEY = 'content_version_cache';

export async function findActive(): Promise<ContentVersion | null> {
  const q = query(
    collection(db, 'contentVersions'),
    where('active', '==', true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as ContentVersion;
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
    active: true,
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
