import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { generateToken } from './utils/token';

export interface HelpCreateInput {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  askerPushToken: string | null;
}

export interface HelpCreateOutput {
  token: string;
  url: string;
  expiresAt: string;
}

const VALID_GAME_IDS = new Set(['lede', 'spread', 'sof', 'wave', 'quip']);
const MAX_TOKEN_RETRIES = 10;

export async function createHelpHandler(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  data: HelpCreateInput,
): Promise<HelpCreateOutput> {
  if (!VALID_GAME_IDS.has(data.gameId)) {
    throw new HttpsError('invalid-argument', `Invalid gameId: ${data.gameId}`);
  }
  if (!Number.isInteger(data.questionIndex) || data.questionIndex < 0) {
    throw new HttpsError('invalid-argument', 'questionIndex must be a non-negative integer');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const existing = await (db.collection('helpRequests') as any)
    .where('askerId', '==', uid)
    .where('gameId', '==', data.gameId)
    .where('questionIndex', '==', data.questionIndex)
    .where('issuedAt', '>=', Timestamp.fromDate(startOfToday))
    .get();

  if (existing.size > 0) {
    const existingDoc = existing.docs[0];
    const existingData = existingDoc.data();
    return {
      token: existingDoc.id,
      url: `https://noodlebowl.app/h/${existingDoc.id}`,
      expiresAt: existingData.expiresAt.toDate().toISOString(),
    };
  }

  let token: string | undefined;
  for (let i = 0; i < MAX_TOKEN_RETRIES; i++) {
    const candidate = generateToken();
    const snap = await db.collection('helpRequests').doc(candidate).get();
    if (!snap.exists) {
      token = candidate;
      break;
    }
  }
  if (!token) {
    throw new HttpsError('internal', 'Failed to generate a unique help token');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.collection('helpRequests').doc(token).set({
    token,
    gameId: data.gameId,
    questionIndex: data.questionIndex,
    askerId: uid,
    askerName: data.askerName,
    issuedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    helperAnswer: null,
    resolvedAt: null,
    askerPushToken: data.askerPushToken,
  });

  if (data.askerPushToken) {
    await db.collection('pushTokens').doc(uid).set(
      { expoPushToken: data.askerPushToken, updatedAt: Timestamp.fromDate(now) },
      { merge: true },
    );
  }

  return {
    token,
    url: `https://noodlebowl.app/h/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export const helpCreate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to create a help request');
  }
  return createHelpHandler(
    getFirestore(),
    request.auth.uid,
    request.data as HelpCreateInput,
  );
});
