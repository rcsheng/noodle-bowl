import { registerPushToken, getCachedPushToken, clearCachedPushToken } from '../pushTokens';

// Factory creates the object inline so it's never in TDZ when the factory runs.
// Tests mutate it via mockConstants() which uses require to get the live reference.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null as string | null },
}));

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

/** Returns the live mocked Constants.default object so tests can mutate appOwnership. */
function mockConstants(): { appOwnership: string | null } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('expo-constants') as { default: { appOwnership: string | null } }).default;
}

beforeEach(() => {
  jest.clearAllMocks();
  clearCachedPushToken();
  mockConstants().appOwnership = null;
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

  it('returns null in Expo Go without requesting permissions', async () => {
    mockConstants().appOwnership = 'expo';
    const result = await registerPushToken('test-uid');
    expect(result).toBeNull();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('returns cached token on second call without re-requesting permissions', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: EXPO_TOKEN });
    mockSetDoc.mockResolvedValue(undefined);

    const first = await registerPushToken('test-uid');
    expect(first).toBe(EXPO_TOKEN);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    const second = await registerPushToken('test-uid');
    expect(second).toBe(EXPO_TOKEN);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1); // not 2
    expect(mockSetDoc).toHaveBeenCalledTimes(1); // not 2
  });

  it('clearCachedPushToken resets the cache so next call re-registers', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetToken.mockResolvedValue({ data: EXPO_TOKEN });
    mockSetDoc.mockResolvedValue(undefined);

    await registerPushToken('test-uid');
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);

    clearCachedPushToken();
    await registerPushToken('test-uid');
    expect(mockRequestPermissions).toHaveBeenCalledTimes(2); // re-registers after clear
  });
});
