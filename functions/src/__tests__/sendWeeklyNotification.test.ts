import { sendWeeklyNotificationHandler } from '../sendWeeklyNotification';
import * as pushUtils from '../utils/push';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTokenDocs(tokens: string[]) {
  return tokens.map((t) => ({ data: () => ({ expoPushToken: t }) }));
}

function makeDb(tokenDocs: ReturnType<typeof makeTokenDocs>) {
  return {
    collection: () => ({
      get: jest.fn().mockResolvedValue({ docs: tokenDocs }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendWeeklyNotificationHandler', () => {
  beforeEach(() => {
    jest.spyOn(pushUtils, 'sendExpoPush').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sends nothing and does not throw when pushTokens collection is empty', async () => {
    const db = makeDb([]);
    await expect(sendWeeklyNotificationHandler(db as any)).resolves.not.toThrow();
    expect(pushUtils.sendExpoPush).not.toHaveBeenCalled();
  });

  test('sends one batch when there are fewer than 100 tokens', async () => {
    const tokens = Array.from({ length: 5 }, (_, i) => `ExponentPushToken[tok${i}]`);
    const db = makeDb(makeTokenDocs(tokens));

    await sendWeeklyNotificationHandler(db as any);

    expect(pushUtils.sendExpoPush).toHaveBeenCalledTimes(1);
    expect(pushUtils.sendExpoPush).toHaveBeenCalledWith(
      tokens,
      expect.objectContaining({ type: 'weekly_content' }),
      expect.any(String),
      expect.any(String),
    );
  });

  test('sends multiple batches when there are more than 100 tokens', async () => {
    const tokens = Array.from({ length: 250 }, (_, i) => `ExponentPushToken[tok${i}]`);
    const db = makeDb(makeTokenDocs(tokens));

    await sendWeeklyNotificationHandler(db as any);

    // 250 tokens → 3 batches (100, 100, 50)
    expect(pushUtils.sendExpoPush).toHaveBeenCalledTimes(3);
  });

  test('sends exactly 100 tokens in each full batch', async () => {
    const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[tok${i}]`);
    const db = makeDb(makeTokenDocs(tokens));

    await sendWeeklyNotificationHandler(db as any);

    const firstCall = (pushUtils.sendExpoPush as jest.Mock).mock.calls[0][0] as string[];
    const secondCall = (pushUtils.sendExpoPush as jest.Mock).mock.calls[1][0] as string[];
    expect(firstCall).toHaveLength(100);
    expect(secondCall).toHaveLength(50);
  });

  test('notification payload has correct type and screen fields', async () => {
    const db = makeDb(makeTokenDocs(['ExponentPushToken[abc]']));

    await sendWeeklyNotificationHandler(db as any);

    expect(pushUtils.sendExpoPush).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: 'weekly_content', screen: 'home' }),
      expect.any(String),
      expect.any(String),
    );
  });

  test('skips documents missing an expoPushToken field', async () => {
    const db = {
      collection: () => ({
        get: jest.fn().mockResolvedValue({
          docs: [
            { data: () => ({ expoPushToken: 'ExponentPushToken[valid]' }) },
            { data: () => ({}) }, // missing token
            { data: () => ({ expoPushToken: '' }) }, // empty string
          ],
        }),
      }),
    };

    await sendWeeklyNotificationHandler(db as any);

    const sentTokens = (pushUtils.sendExpoPush as jest.Mock).mock.calls[0][0] as string[];
    expect(sentTokens).toEqual(['ExponentPushToken[valid]']);
  });
});
