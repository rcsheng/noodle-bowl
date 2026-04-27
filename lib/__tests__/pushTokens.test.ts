import { registerPushToken, getCachedPushToken } from '../pushTokens';

const mockRequestPermissions = jest.fn();
const mockGetToken = jest.fn();

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetToken(...args),
}));

const mockSetDoc = jest.fn();
const mockDoc = jest.fn().mockReturnValue({ path: 'pushTokens/test-uid' });
const mockServerTimestamp = jest.fn().mockReturnValue('SERVER_TS');

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('../firebase', () => ({
  db: { _db: 'mock' },
}));

const EXPO_TOKEN = 'ExponentPushToken[abc123]';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('registerPushToken', () => {
  it('returns and caches token when permissions granted', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: EXPO_TOKEN });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await registerPushToken('test-uid');

    expect(result).toBe(EXPO_TOKEN);
    expect(getCachedPushToken()).toBe(EXPO_TOKEN);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { expoPushToken: EXPO_TOKEN, updatedAt: 'SERVER_TS' },
      { merge: true },
    );
  });

  it('returns null when permissions denied', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });

    const result = await registerPushToken('test-uid');

    expect(result).toBeNull();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('returns null and does not throw if getExpoPushTokenAsync fails', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockRejectedValue(new Error('simulator'));

    const result = await registerPushToken('test-uid');

    expect(result).toBeNull();
  });

  it('returns null when uid is empty', async () => {
    const result = await registerPushToken('');
    expect(result).toBeNull();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });
});
