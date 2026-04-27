import * as Notifications from 'expo-notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

let cachedToken: string | null = null;

export function getCachedPushToken(): string | null {
  return cachedToken;
}

export async function registerPushToken(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
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
