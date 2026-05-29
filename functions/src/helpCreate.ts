import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { generateToken } from './utils/token';
import { validateCollectionPrefix } from './utils/collectionPrefix';

export interface HelpCreateInput {
  gameId: string;
  questionIndex: number;
  contentWeek: string; // ISO week of the question, e.g. "2026-W20"
  askerName: string | null;
  collectionPrefix?: string;
}

const CONTENT_WEEK_RE = /^\d{4}-W\d{2}$/;

export interface HelpCreateOutput {
  token: string;
  url: string;
  expiresAt: string;
}

const VALID_GAME_IDS = new Set(['lede', 'spread', 'sof', 'wave', 'quip']);
const MAX_TOKEN_RETRIES = 10;
const MAX_NAME_LENGTH = 100;

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
  if (!CONTENT_WEEK_RE.test(data.contentWeek)) {
    throw new HttpsError('invalid-argument', `Invalid contentWeek: ${data.contentWeek}`);
  }
  if (typeof data.askerName === 'string' && data.askerName.length > MAX_NAME_LENGTH) {
    throw new HttpsError('invalid-argument', 'askerName exceeds maximum length');
  }

  const prefix = validateCollectionPrefix(data.collectionPrefix);
  const col = `${prefix}helpRequests`;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const existing = await (db.collection(col) as any)
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
    const snap = await db.collection(col).doc(candidate).get();
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

  await db.collection(col).doc(token).set({
    token,
    gameId: data.gameId,
    questionIndex: data.questionIndex,
    contentWeek: data.contentWeek,
    askerId: uid,
    askerName: data.askerName,
    issuedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    helperAnswer: null,
    resolvedAt: null,
  });

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
