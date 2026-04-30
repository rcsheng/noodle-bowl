import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { validateCollectionPrefix } from './utils/collectionPrefix';

export interface ChallengeGetResponse {
  gameId: string;
  questionIndex: number;
  senderName: string;
  expiresAt: string;
}

export type ChallengeGetResult = ChallengeGetResponse | { error: 'not_found' | 'expired' | 'already_answered' };

export async function getChallengeHandler(
  db: ReturnType<typeof getFirestore>,
  token: string,
  collectionPrefix: string,
): Promise<ChallengeGetResult> {
  const col = `${collectionPrefix}challenges`;
  const snap = await db.collection(col).doc(token).get();
  if (!snap.exists) {
    return { error: 'not_found' };
  }

  const data = snap.data()!;
  const expiresAt: Date = data.expiresAt.toDate();

  if (expiresAt.getTime() < Date.now()) {
    return { error: 'expired' };
  }

  if (data.resolvedAt !== null) {
    return { error: 'already_answered' };
  }

  return {
    gameId: data.gameId as string,
    questionIndex: data.questionIndex as number,
    senderName: data.senderName as string,
    expiresAt: expiresAt.toISOString(),
  };
}

export const challengeGet = onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const token = req.query['token'] as string | undefined;
  if (!token) {
    res.status(400).json({ error: 'missing_token' });
    return;
  }

  let prefix: string;
  try {
    prefix = validateCollectionPrefix(req.query['env'] as string | undefined);
  } catch {
    res.status(400).json({ error: 'invalid_env' });
    return;
  }

  const result = await getChallengeHandler(getFirestore(), token, prefix);

  if ('error' in result) {
    const statusMap: Record<string, number> = { not_found: 404, expired: 410, already_answered: 409 };
    res.status(statusMap[result.error] ?? 404).json(result);
    return;
  }

  res.json(result);
});
