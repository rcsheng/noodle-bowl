import * as tokenUtils from '../utils/token';
import { createHelpHandler, HelpCreateInput } from '../helpCreate';

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

const validInput: HelpCreateInput = {
  gameId: 'lede',
  questionIndex: 3,
  contentWeek: '2026-W20',
  askerName: 'Alex',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createHelpHandler', () => {
  beforeEach(() => {
    jest.spyOn(tokenUtils, 'generateToken').mockReturnValue('HELPTKN1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validation', () => {
    test('throws invalid-argument for unknown gameId', async () => {
      const { db } = makeDb();
      await expect(
        createHelpHandler(db as any, 'uid-1', { ...validInput, gameId: 'wacky' }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('throws invalid-argument for negative questionIndex', async () => {
      const { db } = makeDb();
      await expect(
        createHelpHandler(db as any, 'uid-1', { ...validInput, questionIndex: -1 }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('throws invalid-argument for non-integer questionIndex', async () => {
      const { db } = makeDb();
      await expect(
        createHelpHandler(db as any, 'uid-1', { ...validInput, questionIndex: 1.5 }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('accepts null askerName', async () => {
      const { db } = makeDb();
      const result = await createHelpHandler(db as any, 'uid-1', { ...validInput, askerName: null });
      expect(result.token).toBeDefined();
    });

    test('throws invalid-argument when askerName exceeds 100 characters', async () => {
      const { db } = makeDb();
      await expect(
        createHelpHandler(db as any, 'uid-1', { ...validInput, askerName: 'A'.repeat(101) }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('accepts askerName exactly 100 characters', async () => {
      const { db } = makeDb();
      const result = await createHelpHandler(db as any, 'uid-1', { ...validInput, askerName: 'A'.repeat(100) });
      expect(result.token).toBeDefined();
    });
  });

  describe('idempotency', () => {
    test('returns existing token when help request already exists for same (gameId, questionIndex) today', async () => {
      const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const { db } = makeDb([], { id: 'EXSTHP1', expiresAt: futureDate });

      const result = await createHelpHandler(db as any, 'uid-1', validInput);

      expect(result.token).toBe('EXSTHP1');
      expect(result.url).toBe('https://noodlebowl.app/h/EXSTHP1');
      expect(result.expiresAt).toBe(futureDate.toISOString());
    });

    test('does not write to Firestore when returning an existing help request', async () => {
      const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const { db, setCalls } = makeDb([], { id: 'EXSTHP1', expiresAt: futureDate });

      await createHelpHandler(db as any, 'uid-1', validInput);

      expect(setCalls.find(c => c.coll === 'helpRequests')).toBeUndefined();
    });

    test('creates a new help request when no duplicate exists for this questionIndex', async () => {
      const { db } = makeDb([], null);
      const result = await createHelpHandler(db as any, 'uid-1', validInput);
      expect(result.token).toBe('HELPTKN1');
    });
  });

  describe('return value', () => {
    test('returns the generated token', async () => {
      const { db } = makeDb();
      const result = await createHelpHandler(db as any, 'uid-1', validInput);
      expect(result.token).toBe('HELPTKN1');
    });

    test('returns url with token at the /h/ path', async () => {
      const { db } = makeDb();
      const result = await createHelpHandler(db as any, 'uid-1', validInput);
      expect(result.url).toBe('https://noodlebowl.app/h/HELPTKN1');
    });

    test('expiresAt is approximately 24 hours from now', async () => {
      const { db } = makeDb();
      const before = Date.now();
      const result = await createHelpHandler(db as any, 'uid-1', validInput);
      const after = Date.now();
      const expiresMs = new Date(result.expiresAt).getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
    });
  });

  describe('Firestore writes', () => {
    test('writes to helpRequests/{token} with all required fields', async () => {
      const { db, setCalls } = makeDb();
      await createHelpHandler(db as any, 'uid-asker', validInput);

      const write = setCalls.find(c => c.coll === 'helpRequests');
      expect(write).toBeDefined();
      expect(write!.id).toBe('HELPTKN1');
      expect(write!.data).toMatchObject({
        token: 'HELPTKN1',
        gameId: 'lede',
        questionIndex: 3,
        contentWeek: '2026-W20',
        askerId: 'uid-asker',
        askerName: 'Alex',
        helperAnswer: null,
        resolvedAt: null,
      });
      // push token is never stored on the help document (security: token exposure prevention)
      expect((write!.data as any).askerPushToken).toBeUndefined();
    });

    test('throws invalid-argument for malformed contentWeek', async () => {
      const { db } = makeDb();
      await expect(
        createHelpHandler(db as any, 'uid-1', { ...validInput, contentWeek: 'not-a-week' }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    test('does NOT write to pushTokens (token lookup happens server-side at respond time)', async () => {
      const { db, setCalls } = makeDb();
      await createHelpHandler(db as any, 'uid-1', validInput);
      expect(setCalls.find(c => c.coll === 'pushTokens')).toBeUndefined();
    });
  });

  describe('token collision', () => {
    test('retries when the first generated token already exists', async () => {
      jest.spyOn(tokenUtils, 'generateToken')
        .mockReturnValueOnce('EXISTING')
        .mockReturnValue('FRESHONE');

      const { db } = makeDb(['EXISTING']);
      const result = await createHelpHandler(db as any, 'uid-1', validInput);
      expect(result.token).toBe('FRESHONE');
    });

    test('throws internal error after 10 consecutive collisions', async () => {
      jest.spyOn(tokenUtils, 'generateToken').mockReturnValue('COLLIDE1');
      const { db } = makeDb(['COLLIDE1']);
      await expect(
        createHelpHandler(db as any, 'uid-1', validInput),
      ).rejects.toMatchObject({ code: 'internal' });
    });
  });
});
