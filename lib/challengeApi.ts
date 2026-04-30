import { httpsCallable } from 'firebase/functions';
import { fns } from './firebase';
import { collectionPrefix } from './collections';
import type {
  ChallengeCreateInput,
  ChallengeCreateOutput,
  ChallengeGetResponse,
  ChallengeRespondInput,
  ChallengeRespondOutput,
} from '@/packages/shared/types';

const createChallengeFn = httpsCallable<ChallengeCreateInput, ChallengeCreateOutput>(fns, 'challengeCreate');
const respondToChallengeFn = httpsCallable<ChallengeRespondInput, ChallengeRespondOutput>(fns, 'challengeRespond');

export async function createChallenge(input: ChallengeCreateInput): Promise<ChallengeCreateOutput> {
  const result = await createChallengeFn({ ...input, collectionPrefix });
  return result.data;
}

export async function respondToChallenge(input: ChallengeRespondInput): Promise<ChallengeRespondOutput> {
  const result = await respondToChallengeFn({ ...input, collectionPrefix });
  return result.data;
}

// challengeGet is an HTTP function, not a callable — call it directly via fetch.
export async function fetchChallenge(token: string): Promise<ChallengeGetResponse | { error: string }> {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
  const useEmulator = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATOR !== 'false';
  const baseUrl = useEmulator
    ? `http://${host}:5001/${projectId}/us-central1/challengeGet`
    : `https://us-central1-${projectId}.cloudfunctions.net/challengeGet`;

  const envParam = collectionPrefix ? `&env=${encodeURIComponent(collectionPrefix)}` : '';
  const res = await fetch(`${baseUrl}?token=${encodeURIComponent(token)}${envParam}`);
  return res.json() as Promise<ChallengeGetResponse | { error: string }>;
}
