import { getChallengeHandler } from '../challengeGet';

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (fn: unknown) => fn,
}));

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
  getFirestore: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockTimestamp = { toDate: () => Date };

interface ChallengeDocData {
  token: string;
  gameId: string;
  questionIndex: number;
  senderId: string;
  senderName: string;
  senderPrediction: string;
  senderAnswer: string;
  issuedAt: MockTimestamp;
  expiresAt: MockTimestamp;
  friendAnswer: string | null;
  resolvedAt: MockTimestamp | null;
  senderPushToken: string | null;
}

function makeChallengeDoc(overrides: Partial<ChallengeDocData> = {}): ChallengeDocData {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  return {
    token: 'AB3X9K2M',
    gameId: 'lede',
    questionIndex: 3,
    senderId: 'uid-sender',
    senderName: 'Alex',
    senderPrediction: 'Pip',
    senderAnswer: 'Dex',
    issuedAt: { toDate: () => new Date() },
    expiresAt: { toDate: () => future },
    friendAnswer: null,
    resolvedAt: null,
    senderPushToken: null,
    ...overrides,
  };
}

function makeDb(docData: ChallengeDocData | null) {
  return {
    collection: () => ({
      doc: () => ({
        get: jest.fn().mockResolvedValue({
          exists: docData !== null,
          data: () => docData,
        }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getChallengeHandler', () => {
  test('returns not_found error when token does not exist', async () => {
    const db = makeDb(null);
    const result = await getChallengeHandler(db as any, 'NOTOKEN1');
    expect(result).toEqual({ error: 'not_found' });
  });

  test('returns expired error when expiresAt is in the past', async () => {
    const past = new Date(Date.now() - 1000);
    const db = makeDb(makeChallengeDoc({ expiresAt: { toDate: () => past } }));
    const result = await getChallengeHandler(db as any, 'EXPIRED1');
    expect(result).toEqual({ error: 'expired' });
  });

  test('returns challenge data for a valid unexpired token', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).toMatchObject({
      gameId: 'lede',
      questionIndex: 3,
      senderName: 'Alex',
    });
  });

  test('does NOT include senderPrediction in the response', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).not.toHaveProperty('senderPrediction');
  });

  test('does NOT include senderAnswer in the response', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).not.toHaveProperty('senderAnswer');
  });

  test('does NOT include senderId in the response', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).not.toHaveProperty('senderId');
  });

  test('does NOT include senderPushToken in the response', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).not.toHaveProperty('senderPushToken');
  });

  test('expiresAt in the response is an ISO datetime string', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M') as any;
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('does not include an error field on success', async () => {
    const db = makeDb(makeChallengeDoc());
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).not.toHaveProperty('error');
  });

  test('a challenge expiring in exactly one second is still valid', async () => {
    const almostExpired = new Date(Date.now() + 1000);
    const db = makeDb(makeChallengeDoc({ expiresAt: { toDate: () => almostExpired } }));
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).not.toHaveProperty('error');
  });

  test('returns already_answered error when challenge has already been answered', async () => {
    const past = new Date(Date.now() - 1000);
    const db = makeDb(makeChallengeDoc({ resolvedAt: { toDate: () => past } }));
    const result = await getChallengeHandler(db as any, 'AB3X9K2M');
    expect(result).toEqual({ error: 'already_answered' });
  });
});
