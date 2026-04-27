import { respondToChallengeHandler } from '../challengeRespond';
import * as pushUtils from '../utils/push';

jest.mock('firebase-functions/v2/https', () => ({
  onCall: (fn: unknown) => fn,
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromDate: (d: Date) => ({ _seconds: Math.floor(d.getTime() / 1000), toDate: () => d }),
  },
  getFirestore: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockTimestamp = { toDate: () => Date };

interface ChallengeDocData {
  gameId: string;
  questionIndex: number;
  senderId: string;
  senderName: string;
  senderPrediction: string;
  senderAnswer: string;
  expiresAt: MockTimestamp;
  resolvedAt: MockTimestamp | null;
  senderPushToken: string | null;
}

function makeChallengeDoc(overrides: Partial<ChallengeDocData> = {}): ChallengeDocData {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  return {
    gameId: 'lede',
    questionIndex: 3,
    senderId: 'uid-sender',
    senderName: 'Alex',
    senderPrediction: 'Pip',
    senderAnswer: 'Dex',
    expiresAt: { toDate: () => future },
    resolvedAt: null,
    senderPushToken: null,
    ...overrides,
  };
}

function makeDb(docData: ChallengeDocData | null) {
  const updateCalls: Array<{ id: string; data: unknown }> = [];
  return {
    db: {
      collection: () => ({
        doc: (id: string) => ({
          get: jest.fn().mockResolvedValue({
            exists: docData !== null,
            data: () => docData,
          }),
          update: jest.fn().mockImplementation((data: unknown) => {
            updateCalls.push({ id, data });
            return Promise.resolve();
          }),
        }),
      }),
    },
    updateCalls,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('respondToChallengeHandler', () => {
  beforeEach(() => {
    jest.spyOn(pushUtils, 'sendExpoPush').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Error cases ───────────────────────────────────────────────────────────

  test('throws not-found when the token does not exist', async () => {
    const { db } = makeDb(null);
    await expect(
      respondToChallengeHandler(db as any, { token: 'NOTOKEN', friendAnswer: 'Pip' }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  test('throws deadline-exceeded when the challenge is expired', async () => {
    const past = new Date(Date.now() - 1000);
    const { db } = makeDb(makeChallengeDoc({ expiresAt: { toDate: () => past } }));
    await expect(
      respondToChallengeHandler(db as any, { token: 'AB3X9K2M', friendAnswer: 'Pip' }),
    ).rejects.toMatchObject({ code: 'deadline-exceeded' });
  });

  test('throws already-exists when the challenge is already resolved', async () => {
    const { db } = makeDb(makeChallengeDoc({ resolvedAt: { toDate: () => new Date() } }));
    await expect(
      respondToChallengeHandler(db as any, { token: 'AB3X9K2M', friendAnswer: 'Pip' }),
    ).rejects.toMatchObject({ code: 'already-exists' });
  });

  // ── Firestore update ──────────────────────────────────────────────────────

  test('writes friendAnswer and resolvedAt to the challenge document', async () => {
    const { db, updateCalls } = makeDb(makeChallengeDoc());
    await respondToChallengeHandler(db as any, { token: 'AB3X9K2M', friendAnswer: 'Pip' });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toMatchObject({ friendAnswer: 'Pip' });
    expect((updateCalls[0].data as any).resolvedAt).toBeDefined();
  });

  // ── Return value ──────────────────────────────────────────────────────────

  test('returns full comparison data including senderAnswer', async () => {
    const { db } = makeDb(makeChallengeDoc());
    const result = await respondToChallengeHandler(db as any, { token: 'AB3X9K2M', friendAnswer: 'Pip' });

    expect(result).toMatchObject({
      gameId: 'lede',
      questionIndex: 3,
      senderName: 'Alex',
      senderAnswer: 'Dex',
      senderPrediction: 'Pip',
      friendAnswer: 'Pip',
    });
  });

  // ── Push notifications ────────────────────────────────────────────────────

  test('does NOT send push notification when senderPushToken is null', async () => {
    const { db } = makeDb(makeChallengeDoc({ senderPushToken: null }));
    await respondToChallengeHandler(db as any, { token: 'AB3X9K2M', friendAnswer: 'Pip' });
    expect(pushUtils.sendExpoPush).not.toHaveBeenCalled();
  });

  test('sends push notification when senderPushToken is present', async () => {
    const { db } = makeDb(makeChallengeDoc({ senderPushToken: 'ExponentPushToken[abc]' }));
    await respondToChallengeHandler(db as any, { token: 'AB3X9K2M', friendAnswer: 'Pip' });
    expect(pushUtils.sendExpoPush).toHaveBeenCalledWith(
      'ExponentPushToken[abc]',
      expect.objectContaining({ type: 'challenge_accepted', token: 'AB3X9K2M' }),
      expect.any(String),
      expect.any(String),
    );
  });

  test('push notification data includes the challenge token', async () => {
    const { db } = makeDb(makeChallengeDoc({ senderPushToken: 'ExponentPushToken[xyz]' }));
    await respondToChallengeHandler(db as any, { token: 'MYTOKEN1', friendAnswer: 'Pip' });
    expect(pushUtils.sendExpoPush).toHaveBeenCalledWith(
      'ExponentPushToken[xyz]',
      expect.objectContaining({ token: 'MYTOKEN1' }),
      expect.any(String),
      expect.any(String),
    );
  });
});
