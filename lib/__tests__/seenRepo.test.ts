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

import { readSeen, writeSeen } from '../seenRepo';

const sampleSeen = {
  lede: [0, 1, 2],
  spread: [],
  sof: [3],
  quip: [],
  wave: [4, 5],
};

describe('seenRepo.writeSeen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue('docRef');
    mockSetDoc.mockResolvedValue(undefined);
    mockServerTimestamp.mockReturnValue('SERVER_TS');
  });

  test('calls setDoc with path users/{uid}/meta/seen and merge', async () => {
    await writeSeen('uid1', sampleSeen, '2026-W20');
    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'uid1', 'meta', 'seen');
    expect(mockSetDoc).toHaveBeenCalledWith(
      'docRef',
      { ...sampleSeen, seenWeek: '2026-W20', updatedAt: 'SERVER_TS' },
      { merge: true },
    );
  });

  test('uses serverTimestamp for updatedAt', async () => {
    await writeSeen('uid1', sampleSeen, '2026-W20');
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.updatedAt).toBe('SERVER_TS');
  });

  test('writes seenWeek alongside seen arrays', async () => {
    await writeSeen('uid1', sampleSeen, '2026-W21');
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.seenWeek).toBe('2026-W21');
  });
});

describe('seenRepo.readSeen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue('docRef');
  });

  test('returns null when document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await readSeen('uid1');
    expect(result).toBeNull();
  });

  test('returns { seen, seenWeek } when document exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...sampleSeen, seenWeek: '2026-W20', updatedAt: { seconds: 123, nanoseconds: 0 } }),
    });
    const result = await readSeen('uid1');
    expect(result).toEqual({ seen: sampleSeen, seenWeek: '2026-W20' });
    expect(result).not.toHaveProperty('updatedAt');
  });

  test('seenWeek defaults to empty string for legacy docs without the field', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...sampleSeen, updatedAt: 'ts' }),
    });
    const result = await readSeen('uid1');
    expect(result?.seenWeek).toBe('');
  });

  test('calls getDoc with path users/{uid}/meta/seen', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await readSeen('uid2');
    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'uid2', 'meta', 'seen');
  });

  test('returns partial seen with missing keys defaulting to empty arrays', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ lede: [1, 2], seenWeek: '2026-W20', updatedAt: 'ts' }),
    });
    const result = await readSeen('uid1');
    expect(result?.seen).toEqual({
      lede: [1, 2],
      spread: [],
      sof: [],
      quip: [],
      wave: [],
    });
  });
});
