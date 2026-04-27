import * as tokenUtils from '../utils/token';
import { createChallengeHandler, ChallengeCreateInput } from '../challengeCreate';

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

interface ExistingDoc {
  id: string;
  expiresAt: Date;
}

function makeDb(existingTokenIds: string[] = [], existingDoc: ExistingDoc | null = null) {
  const existingSet = new Set(existingTokenIds);
  const setCalls: Array<{ coll: string; id: string; data: unknown; opts?: unknown }> = [];

  const makeQuery = (): any => ({
    where: () => makeQuery(),
    get: jest.fn().mockResolvedValue({
      size: existingDoc ? 1 : 0,
      docs: existingDoc ? [{
        id: existingDoc.id,
        data: () => ({
          expiresAt: { toDate: () => existingDoc.expiresAt },
        }),
      }] : [],
    }),
  });

  const db = {
    collection: (coll: string) => ({
      doc: (id: string) => ({
        get: jest.fn().mockResolvedValue({ exists: existingSet.has(id) }),
        set: jest.fn().mockImplementation((data: unknown, opts?: unknown) => {
          setCalls.push({ coll, id, data, opts });
          return Promise.resolve();
        }),
      }),
      where: () => makeQuery(),
    }),
  };

  return { db, setCalls };
}

const validInput: ChallengeCreateInput = {
  gameId: 'lede',
  questionIndex: 2,
  senderPrediction: 'Pip',
  senderAnswer: 'Dex',
  senderName: 'Alex',
  senderPushToken: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createChallengeHandler', () => {
  beforeEach(() => {
    jest.spyOn(tokenUtils, 'generateToken').mockReturnValue('TESTTKN1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  describe('validation', () => {
    test('throws invalid-argument for unknown gameId', async () => {
      const { db } = makeDb();
      await expect(
        createChallengeHandler(db as any, 'uid-1', { ...validInput, gameId: 'wacky' }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('throws invalid-argument for negative questionIndex', async () => {
      const { db } = makeDb();
      await expect(
        createChallengeHandler(db as any, 'uid-1', { ...validInput, questionIndex: -1 }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('throws invalid-argument for non-integer questionIndex', async () => {
      const { db } = makeDb();
      await expect(
        createChallengeHandler(db as any, 'uid-1', { ...validInput, questionIndex: 1.5 }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('accepts every valid gameId', async () => {
      for (const gameId of ['lede', 'spread', 'sof', 'wave', 'quip']) {
        const { db } = makeDb();
        const result = await createChallengeHandler(db as any, 'uid-1', { ...validInput, gameId });
        expect(result.token).toBeDefined();
      }
    });

    test('accepts questionIndex of 0', async () => {
      const { db } = makeDb();
      const result = await createChallengeHandler(db as any, 'uid-1', { ...validInput, questionIndex: 0 });
      expect(result.token).toBeDefined();
    });
  });

  // ── Return value ──────────────────────────────────────────────────────────

  describe('return value', () => {
    test('returns the generated token', async () => {
      const { db } = makeDb();
      const result = await createChallengeHandler(db as any, 'uid-1', validInput);
      expect(result.token).toBe('TESTTKN1');
    });

    test('returns url with token at the /c/ path', async () => {
      const { db } = makeDb();
      const result = await createChallengeHandler(db as any, 'uid-1', validInput);
      expect(result.url).toBe('https://noodlebowl.app/c/TESTTKN1');
    });

    test('expiresAt is approximately 24 hours from now', async () => {
      const { db } = makeDb();
      const before = Date.now();
      const result = await createChallengeHandler(db as any, 'uid-1', validInput);
      const after = Date.now();
      const expiresMs = new Date(result.expiresAt).getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
    });

    test('expiresAt is a valid ISO datetime string', async () => {
      const { db } = makeDb();
      const result = await createChallengeHandler(db as any, 'uid-1', validInput);
      expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ── Firestore writes ──────────────────────────────────────────────────────

  describe('Firestore writes', () => {
    test('writes to challenges/{token} with all required fields', async () => {
      const { db, setCalls } = makeDb();
      await createChallengeHandler(db as any, 'uid-sender', validInput);

      const write = setCalls.find(c => c.coll === 'challenges');
      expect(write).toBeDefined();
      expect(write!.id).toBe('TESTTKN1');
      expect(write!.data).toMatchObject({
        token: 'TESTTKN1',
        gameId: 'lede',
        questionIndex: 2,
        senderId: 'uid-sender',
        senderName: 'Alex',
        senderPrediction: 'Pip',
        senderAnswer: 'Dex',
        friendAnswer: null,
        resolvedAt: null,
        senderPushToken: null,
      });
    });

    test('challenge document includes issuedAt and expiresAt timestamps', async () => {
      const { db, setCalls } = makeDb();
      await createChallengeHandler(db as any, 'uid-1', validInput);

      const write = setCalls.find(c => c.coll === 'challenges');
      expect((write!.data as any).issuedAt).toBeDefined();
      expect((write!.data as any).expiresAt).toBeDefined();
    });

    test('does NOT write to pushTokens when senderPushToken is null', async () => {
      const { db, setCalls } = makeDb();
      await createChallengeHandler(db as any, 'uid-1', validInput);

      const pushWrite = setCalls.find(c => c.coll === 'pushTokens');
      expect(pushWrite).toBeUndefined();
    });

    test('upserts pushTokens/{uid} when senderPushToken is present', async () => {
      const { db, setCalls } = makeDb();
      await createChallengeHandler(db as any, 'uid-sender', {
        ...validInput,
        senderPushToken: 'ExponentPushToken[abc123]',
      });

      const pushWrite = setCalls.find(c => c.coll === 'pushTokens');
      expect(pushWrite).toBeDefined();
      expect(pushWrite!.id).toBe('uid-sender');
      expect(pushWrite!.data).toMatchObject({ expoPushToken: 'ExponentPushToken[abc123]' });
      expect(pushWrite!.opts).toEqual({ merge: true });
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  describe('idempotency', () => {
    test('returns existing token when challenge already exists for same (gameId, questionIndex) today', async () => {
      const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const { db } = makeDb([], { id: 'EXISTNG1', expiresAt: futureDate });

      const result = await createChallengeHandler(db as any, 'uid-1', validInput);

      expect(result.token).toBe('EXISTNG1');
      expect(result.url).toBe('https://noodlebowl.app/c/EXISTNG1');
      expect(result.expiresAt).toBe(futureDate.toISOString());
    });

    test('does not write to Firestore when returning an existing challenge', async () => {
      const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const { db, setCalls } = makeDb([], { id: 'EXISTNG1', expiresAt: futureDate });

      await createChallengeHandler(db as any, 'uid-1', validInput);

      expect(setCalls.find(c => c.coll === 'challenges')).toBeUndefined();
    });

    test('creates a new challenge when no duplicate exists for this questionIndex', async () => {
      const { db } = makeDb([], null);
      const result = await createChallengeHandler(db as any, 'uid-1', validInput);
      expect(result.token).toBe('TESTTKN1');
    });
  });

  // ── Token collision ───────────────────────────────────────────────────────

  describe('token collision', () => {
    test('retries when the first generated token already exists', async () => {
      jest.spyOn(tokenUtils, 'generateToken')
        .mockReturnValueOnce('EXISTING')
        .mockReturnValue('FRESHONE');

      const { db } = makeDb(['EXISTING']);
      const result = await createChallengeHandler(db as any, 'uid-1', validInput);
      expect(result.token).toBe('FRESHONE');
    });

    test('throws internal error after 10 consecutive collisions', async () => {
      jest.spyOn(tokenUtils, 'generateToken').mockReturnValue('COLLIDE1');
      const { db } = makeDb(['COLLIDE1']);
      await expect(
        createChallengeHandler(db as any, 'uid-1', validInput),
      ).rejects.toMatchObject({ code: 'internal' });
    });
  });
});
