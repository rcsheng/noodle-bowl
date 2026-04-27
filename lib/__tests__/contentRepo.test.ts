import { LEDE_BANK, QUIP_PROMPTS, SOF_BANK, SPREAD_BANK, WAVE_BANK } from '@/constants/data';
import type { ContentVersion } from '@/packages/shared/contentTypes';

const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

jest.mock('../firebase', () => ({ db: {} }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

// Static import after mocks are hoisted
import { cache, findActive, getCached, getFallback } from '../contentRepo';

const mockVersion: ContentVersion = {
  id: 'v1',
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  banks: {
    lede: [{ partialHeadline: 'test', sourceHint: 'src', panelists: [], explanation: 'exp' }],
    spread: [{ question: 'q', answer: 42, unit: 'km', others: [1, 2, 3], explanation: 'e' }],
    sof: [{ topic: 't', intro: 'i', weirdAndTrue: false, claims: [] }],
    quip: [{ setup: 's', sourceHint: 'sh' }],
    wave: [{ leftLabel: 'L', rightLabel: 'R', story: 'st', truthPosition: 50, explanation: 'e' }],
  },
};

describe('contentRepo.findActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue('colRef');
    mockWhere.mockReturnValue('whereRef');
    mockLimit.mockReturnValue('limitRef');
    mockQuery.mockReturnValue('queryRef');
  });

  it('returns the active ContentVersion from Firestore', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'v1', data: () => ({ active: true, createdAt: '2024-01-01T00:00:00Z', banks: mockVersion.banks }) }],
    });

    const result = await findActive();

    expect(result).not.toBeNull();
    expect(result?.id).toBe('v1');
    expect(result?.banks.lede).toHaveLength(1);
  });

  it('returns null when no active version exists', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    const result = await findActive();

    expect(result).toBeNull();
  });

  it('queries for active: true with limit 1', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    await findActive();

    expect(mockWhere).toHaveBeenCalledWith('active', '==', true);
    expect(mockLimit).toHaveBeenCalledWith(1);
  });
});

describe('contentRepo.getCached', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns parsed ContentVersion from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(mockVersion));

    const result = await getCached();

    expect(result).toEqual(mockVersion);
  });

  it('returns null when nothing is cached', async () => {
    mockGetItem.mockResolvedValue(null);

    const result = await getCached();

    expect(result).toBeNull();
  });

  it('returns null when cached JSON is malformed', async () => {
    mockGetItem.mockResolvedValue('not-valid-json{{{');

    const result = await getCached();

    expect(result).toBeNull();
  });
});

describe('contentRepo.cache', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serializes and stores ContentVersion in AsyncStorage', async () => {
    mockSetItem.mockResolvedValue(undefined);

    await cache(mockVersion);

    expect(mockSetItem).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(mockVersion)
    );
  });
});

describe('contentRepo.getFallback', () => {
  it('returns bundled constants as ContentVersion', () => {
    const result = getFallback();

    expect(result.banks.lede).toBe(LEDE_BANK);
    expect(result.banks.spread).toBe(SPREAD_BANK);
    expect(result.banks.sof).toBe(SOF_BANK);
    expect(result.banks.quip).toBe(QUIP_PROMPTS);
    expect(result.banks.wave).toBe(WAVE_BANK);
    expect(result.id).toBe('bundled');
    expect(result.active).toBe(true);
  });
});
