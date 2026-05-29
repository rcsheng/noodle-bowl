import Constants from 'expo-constants';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

let cachedToken: string | null = null;

export function getCachedPushToken(): string | null {
  return cachedToken;
}

/** Reset the in-memory token cache. Call after sign-out or in tests. */
export function clearCachedPushToken(): void {
  cachedToken = null;
}

/**
 * Register the device push token for the given user and persist it to Firestore.
 * Idempotent: returns the cached token on subsequent calls without re-requesting
 * permissions or writing to Firestore again.
 *
 * @note Tests must call `clearCachedPushToken()` in `beforeEach` to prevent
 * cross-test token leakage from the module-level cache.
 */
export async function registerPushToken(uid: string): Promise<string | null> {
  // Re-evaluated on each call so tests can control it via mock
  const isExpoGo = Constants.appOwnership === 'expo';
  if (!uid || isExpoGo) return null;

  // Idempotent: return the cached token without re-requesting permissions
  if (cachedToken) return cachedToken;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    cachedToken = token;

    await setDoc(
      doc(db, 'pushTokens', uid),
      { expoPushToken: token, updatedAt: serverTimestamp() },
      { merge: true },
    );

    return token;
  } catch {
    return null;
  }
}
