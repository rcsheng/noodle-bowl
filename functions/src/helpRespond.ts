import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendExpoPush } from './utils/push';
import { GAME_TITLES } from './utils/gameMeta';
import { validateCollectionPrefix } from './utils/collectionPrefix';

export interface HelpRespondInput {
  token: string;
  helperAnswer: string;
  collectionPrefix?: string;
}

export interface HelpRespondOutput {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  helperAnswer: string;
}

export async function respondToHelpHandler(
  db: ReturnType<typeof getFirestore>,
  input: HelpRespondInput,
  uid: string,
): Promise<HelpRespondOutput> {
  const prefix = validateCollectionPrefix(input.collectionPrefix);
  const col = `${prefix}helpRequests`;

  const snap = await db.collection(col).doc(input.token).get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Help request not found');
  }

  const data = snap.data()!;

  if (data.expiresAt.toDate().getTime() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Help request has expired');
  }

  if (data.resolvedAt !== null) {
    throw new HttpsError('already-exists', 'Help request has already been answered');
  }

  await db.collection(col).doc(input.token).update({
    helperAnswer: input.helperAnswer,
    helperId: uid,
    resolvedAt: Timestamp.fromDate(new Date()),
  });

  if (data.askerPushToken) {
    const gameTitle = GAME_TITLES[data.gameId as string] ?? (data.gameId as string);
    await sendExpoPush(
      data.askerPushToken as string,
      { type: 'received_help', token: input.token },
      `Your friend answered your ${gameTitle} question`,
      'See what they picked',
    );
  }

  return {
    gameId: data.gameId as string,
    questionIndex: data.questionIndex as number,
    askerName: (data.askerName as string | null) ?? null,
    helperAnswer: input.helperAnswer,
  };
}

export const helpRespond = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to respond to a help request');
  }
  return respondToHelpHandler(getFirestore(), request.data as HelpRespondInput, request.auth.uid);
});
