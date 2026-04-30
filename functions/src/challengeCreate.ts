import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { generateToken } from './utils/token';
import { validateCollectionPrefix } from './utils/collectionPrefix';

export interface ChallengeCreateInput {
  gameId: string;
  questionIndex: number;
  senderPrediction: string;
  senderAnswer: string;
  senderName: string;
  senderPushToken: string | null;
  collectionPrefix?: string;
}

export interface ChallengeCreateOutput {
  token: string;
  url: string;
  expiresAt: string;
}

const VALID_GAME_IDS = new Set(['lede', 'spread', 'sof', 'wave', 'quip']);
const MAX_TOKEN_RETRIES = 10;

export async function createChallengeHandler(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  data: ChallengeCreateInput,
): Promise<ChallengeCreateOutput> {
  if (!VALID_GAME_IDS.has(data.gameId)) {
    throw new HttpsError('invalid-argument', `Invalid gameId: ${data.gameId}`);
  }
  if (!Number.isInteger(data.questionIndex) || data.questionIndex < 0) {
    throw new HttpsError('invalid-argument', 'questionIndex must be a non-negative integer');
  }

  const prefix = validateCollectionPrefix(data.collectionPrefix);
  const col = `${prefix}challenges`;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const existing = await (db.collection(col) as any)
    .where('senderId', '==', uid)
    .where('gameId', '==', data.gameId)
    .where('questionIndex', '==', data.questionIndex)
    .where('issuedAt', '>=', Timestamp.fromDate(startOfToday))
    .get();

  if (existing.size > 0) {
    const existingDoc = existing.docs[0];
    const existingData = existingDoc.data();
    return {
      token: existingDoc.id,
      url: `https://noodlebowl.app/c/${existingDoc.id}`,
      expiresAt: existingData.expiresAt.toDate().toISOString(),
    };
  }

  let token: string | undefined;
  for (let i = 0; i < MAX_TOKEN_RETRIES; i++) {
    const candidate = generateToken();
    const snap = await db.collection(col).doc(candidate).get();
    if (!snap.exists) {
      token = candidate;
      break;
    }
  }
  if (!token) {
    throw new HttpsError('internal', 'Failed to generate a unique challenge token');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.collection(col).doc(token).set({
    token,
    gameId: data.gameId,
    questionIndex: data.questionIndex,
    senderId: uid,
    senderName: data.senderName,
    senderPrediction: data.senderPrediction,
    senderAnswer: data.senderAnswer,
    issuedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    friendAnswer: null,
    resolvedAt: null,
    senderPushToken: data.senderPushToken,
  });

  if (data.senderPushToken) {
    await db.collection('pushTokens').doc(uid).set(
      { expoPushToken: data.senderPushToken, updatedAt: Timestamp.fromDate(now) },
      { merge: true },
    );
  }

  return {
    token,
    url: `https://noodlebowl.app/c/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export const challengeCreate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to create a challenge');
  }
  return createChallengeHandler(
    getFirestore(),
    request.auth.uid,
    request.data as ChallengeCreateInput,
  );
});
