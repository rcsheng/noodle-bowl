import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { validateCollectionPrefix } from './utils/collectionPrefix';

export interface HelpGetResponse {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  expiresAt: string;
}

export async function getHelpHandler(
  db: ReturnType<typeof getFirestore>,
  token: string,
  collectionPrefix: string,
): Promise<HelpGetResponse | { error: string }> {
  if (!token) return { error: 'missing-token' };

  const col = `${collectionPrefix}helpRequests`;
  const snap = await db.collection(col).doc(token).get();
  if (!snap.exists) return { error: 'not-found' };

  const data = snap.data()!;
  if (data.expiresAt.toDate().getTime() < Date.now()) return { error: 'expired' };

  return {
    gameId: data.gameId as string,
    questionIndex: data.questionIndex as number,
    askerName: (data.askerName as string | null) ?? null,
    expiresAt: (data.expiresAt.toDate() as Date).toISOString(),
  };
}

export const helpGet = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://noodlebowl.app');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const token = req.query.token as string | undefined;

  let prefix: string;
  try {
    prefix = validateCollectionPrefix(req.query['env'] as string | undefined);
  } catch {
    res.status(400).json({ error: 'invalid_env' });
    return;
  }

  const result = await getHelpHandler(getFirestore(), token ?? '', prefix);
  res.json(result);
});
