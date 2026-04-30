import { httpsCallable } from 'firebase/functions';
import { fns } from './firebase';
import { collectionPrefix } from './collections';
import type {
  HelpCreateInput,
  HelpCreateOutput,
  HelpGetResponse,
  HelpRespondInput,
  HelpRespondOutput,
} from '@/packages/shared/types';

const createHelpFn = httpsCallable<HelpCreateInput, HelpCreateOutput>(fns, 'helpCreate');
const respondToHelpFn = httpsCallable<HelpRespondInput, HelpRespondOutput>(fns, 'helpRespond');

export async function createHelp(input: HelpCreateInput): Promise<HelpCreateOutput> {
  const result = await createHelpFn({ ...input, collectionPrefix });
  return result.data;
}

export async function respondToHelp(input: HelpRespondInput): Promise<HelpRespondOutput> {
  const result = await respondToHelpFn({ ...input, collectionPrefix });
  return result.data;
}

export async function fetchHelp(token: string): Promise<HelpGetResponse | { error: string }> {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
  const useEmulator = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATOR !== 'false';
  const baseUrl = useEmulator
    ? `http://${host}:5001/${projectId}/us-central1/helpGet`
    : `https://us-central1-${projectId}.cloudfunctions.net/helpGet`;

  const envParam = collectionPrefix ? `&env=${encodeURIComponent(collectionPrefix)}` : '';
  const res = await fetch(`${baseUrl}?token=${encodeURIComponent(token)}${envParam}`);
  return res.json() as Promise<HelpGetResponse | { error: string }>;
}
