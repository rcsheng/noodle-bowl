import { respondToHelpHandler } from '../helpRespond';
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

interface HelpDocData {
  gameId: string;
  questionIndex: number;
  askerId: string;
  askerName: string | null;
  expiresAt: MockTimestamp;
  resolvedAt: MockTimestamp | null;
  askerPushToken: string | null;
}

function makeHelpDoc(overrides: Partial<HelpDocData> = {}): HelpDocData {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  return {
    gameId: 'spread',
    questionIndex: 5,
    askerId: 'uid-asker',
    askerName: 'Jordan',
    expiresAt: { toDate: () => future },
    resolvedAt: null,
    askerPushToken: null,
    ...overrides,
  };
}

function makeDb(docData: HelpDocData | null) {
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

describe('respondToHelpHandler', () => {
  beforeEach(() => {
    jest.spyOn(pushUtils, 'sendExpoPush').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('error cases', () => {
    test('throws not-found when the token does not exist', async () => {
      const { db } = makeDb(null);
      await expect(
        respondToHelpHandler(db as any, { token: 'NOTOKEN', helperAnswer: '42' }, 'uid-helper'),
      ).rejects.toMatchObject({ code: 'not-found' });
    });

    test('throws deadline-exceeded when the help request is expired', async () => {
      const past = new Date(Date.now() - 1000);
      const { db } = makeDb(makeHelpDoc({ expiresAt: { toDate: () => past } }));
      await expect(
        respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper'),
      ).rejects.toMatchObject({ code: 'deadline-exceeded' });
    });

    test('throws already-exists when the help request is already resolved', async () => {
      const { db } = makeDb(makeHelpDoc({ resolvedAt: { toDate: () => new Date() } }));
      await expect(
        respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper'),
      ).rejects.toMatchObject({ code: 'already-exists' });
    });
  });

  describe('Firestore update', () => {
    test('writes helperAnswer and resolvedAt to the help document', async () => {
      const { db, updateCalls } = makeDb(makeHelpDoc());
      await respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper');

      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].data).toMatchObject({ helperAnswer: '42' });
      expect((updateCalls[0].data as any).resolvedAt).toBeDefined();
    });

    test('writes helperId to the help document', async () => {
      const { db, updateCalls } = makeDb(makeHelpDoc());
      await respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper');

      expect(updateCalls[0].data).toMatchObject({ helperId: 'uid-helper' });
    });
  });

  describe('return value', () => {
    test('returns gameId, questionIndex, askerName, and helperAnswer', async () => {
      const { db } = makeDb(makeHelpDoc());
      const result = await respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper');

      expect(result).toMatchObject({
        gameId: 'spread',
        questionIndex: 5,
        askerName: 'Jordan',
        helperAnswer: '42',
      });
    });

    test('returns null askerName when not set', async () => {
      const { db } = makeDb(makeHelpDoc({ askerName: null }));
      const result = await respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper');
      expect(result.askerName).toBeNull();
    });
  });

  describe('push notifications', () => {
    test('does NOT send push when askerPushToken is null', async () => {
      const { db } = makeDb(makeHelpDoc({ askerPushToken: null }));
      await respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper');
      expect(pushUtils.sendExpoPush).not.toHaveBeenCalled();
    });

    test('sends push to asker when askerPushToken is present', async () => {
      const { db } = makeDb(makeHelpDoc({ askerPushToken: 'ExponentPushToken[xyz]' }));
      await respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper');
      expect(pushUtils.sendExpoPush).toHaveBeenCalledWith(
        'ExponentPushToken[xyz]',
        expect.objectContaining({ type: 'received_help', token: 'HELPTKN1' }),
        expect.any(String),
        expect.any(String),
      );
    });

    test('help response write succeeds even when push notification throws', async () => {
      jest.spyOn(pushUtils, 'sendExpoPush').mockRejectedValue(new Error('network error'));
      const { db, updateCalls } = makeDb(makeHelpDoc({ askerPushToken: 'ExponentPushToken[xyz]' }));

      await expect(
        respondToHelpHandler(db as any, { token: 'HELPTKN1', helperAnswer: '42' }, 'uid-helper'),
      ).resolves.toMatchObject({ helperAnswer: '42' });

      expect(updateCalls).toHaveLength(1); // Firestore write still happened
    });
  });
});
