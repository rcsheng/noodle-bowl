import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
// @ts-ignore getReactNativePersistence is exported by the RN bundle (resolved by Metro/Expo) but absent from browser TS types
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

// Capture before initializeApp so we know whether this is the first load
const isFirstLoad = getApps().length === 0;
const app = isFirstLoad ? initializeApp(firebaseConfig) : getApps()[0];
export { app };

// initializeAuth (with persistence) must only be called once per app instance.
// On hot-reloads the app already exists, so fall back to getAuth.
export const auth = isFirstLoad
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getFirestore(app);
export const fns = getFunctions(app);

// Connect to local emulators in dev — only runs once per module load.
// Android emulators can't reach `localhost`; they use 10.0.2.2 for the host machine.
// Override with EXPO_PUBLIC_EMULATOR_HOST when testing on a physical device (use LAN IP).
// Set EXPO_PUBLIC_USE_EMULATOR=false to point a dev build at production Firebase.
if (__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATOR !== 'false') {
  const { Platform } = require('react-native') as typeof import('react-native');
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? defaultHost;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(fns, host, 5001);
}
