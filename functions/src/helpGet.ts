import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export interface HelpGetResponse {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  expiresAt: string;
}

export async function getHelpHandler(
  db: ReturnType<typeof getFirestore>,
  token: string,
): Promise<HelpGetResponse | { error: string }> {
  if (!token) return { error: 'missing-token' };

  const snap = await db.collection('helpRequests').doc(token).get();
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
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const token = req.query.token as string | undefined;
  const result = await getHelpHandler(getFirestore(), token ?? '');
  res.json(result);
});
