const mockDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockServerTimestamp = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('../firebase', () => ({ db: {} }));

import { readStats, writeStats } from '../statsRepo';
import { initialState } from '@/context/gameReducer';

const sampleStats = initialState.stats;

describe('statsRepo.writeStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue('docRef');
    mockSetDoc.mockResolvedValue(undefined);
    mockServerTimestamp.mockReturnValue('SERVER_TS');
  });

  test('calls setDoc with correct Firestore path users/{uid}/meta/stats', async () => {
    await writeStats('uid1', sampleStats);
    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'uid1', 'meta', 'stats');
    expect(mockSetDoc).toHaveBeenCalledWith(
      'docRef',
      { ...sampleStats, updatedAt: 'SERVER_TS' },
      { merge: true },
    );
  });

  test('uses serverTimestamp for updatedAt', async () => {
    await writeStats('uid1', sampleStats);
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.updatedAt).toBe('SERVER_TS');
  });
});

describe('statsRepo.readStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue('docRef');
  });

  test('returns null when document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await readStats('uid1');
    expect(result).toBeNull();
  });

  test('returns stats without updatedAt when document exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...sampleStats, updatedAt: { seconds: 123, nanoseconds: 0 } }),
    });
    const result = await readStats('uid1');
    expect(result).toEqual(sampleStats);
    expect(result).not.toHaveProperty('updatedAt');
  });

  test('calls getDoc with correct path users/{uid}/meta/stats', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await readStats('uid2');
    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'uid2', 'meta', 'stats');
  });
});
