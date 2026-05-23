import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendExpoPush } from './utils/push';
import { GAME_TITLES } from './utils/gameMeta';
import { validateCollectionPrefix } from './utils/collectionPrefix';

export interface ChallengeRespondInput {
  token: string;
  friendAnswer: string;
  collectionPrefix?: string;
}

export interface ChallengeRespondOutput {
  gameId: string;
  questionIndex: number;
  senderName: string;
  senderAnswer: string;
  senderPrediction: string;
  friendAnswer: string;
}

export async function respondToChallengeHandler(
  db: ReturnType<typeof getFirestore>,
  input: ChallengeRespondInput,
  uid: string,
): Promise<ChallengeRespondOutput> {
  const prefix = validateCollectionPrefix(input.collectionPrefix);
  const col = `${prefix}challenges`;

  const snap = await db.collection(col).doc(input.token).get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Challenge not found');
  }

  const data = snap.data()!;

  if (uid === data.senderId) {
    throw new HttpsError('permission-denied', 'You cannot respond to your own challenge');
  }

  if (data.expiresAt.toDate().getTime() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Challenge has expired');
  }

  if (data.resolvedAt !== null) {
    throw new HttpsError('already-exists', 'Challenge has already been answered');
  }

  await db.collection(col).doc(input.token).update({
    friendAnswer: input.friendAnswer,
    recipientId: uid,
    resolvedAt: Timestamp.fromDate(new Date()),
  });

  if (data.senderPushToken) {
    const gameTitle = GAME_TITLES[data.gameId as string] ?? (data.gameId as string);
    await sendExpoPush(
      data.senderPushToken as string,
      { type: 'challenge_accepted', token: input.token },
      `${data.senderName} responded to your ${gameTitle} challenge`,
      'See how they did',
    );
  }

  return {
    gameId: data.gameId as string,
    questionIndex: data.questionIndex as number,
    senderName: data.senderName as string,
    senderAnswer: data.senderAnswer as string,
    senderPrediction: data.senderPrediction as string,
    friendAnswer: input.friendAnswer,
  };
}

export const challengeRespond = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to respond to a challenge');
  }
  return respondToChallengeHandler(getFirestore(), request.data as ChallengeRespondInput, request.auth.uid);
});
