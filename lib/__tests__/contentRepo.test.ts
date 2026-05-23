import { LEDE_BANK, QUIP_PROMPTS, SOF_BANK, SPREAD_BANK, WAVE_BANK } from '@/constants/data';
import type { ContentVersion } from '@/packages/shared/contentTypes';

const mockGetDoc = jest.fn();
const mockDoc = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

jest.mock('../firebase', () => ({ db: {} }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

// Static import after mocks are hoisted
import { cache, findForWeek, getCached, getFallback, mergeWithFallback } from '../contentRepo';

const mockVersion: ContentVersion = {
  id: '2026-W20',
  contentWeek: '2026-W20',
  createdAt: '2026-05-11T00:00:00Z',
  banks: {
    lede: [{ partialHeadline: 'test', sourceHint: 'src', panelists: [], explanation: 'exp' }],
    spread: [{ question: 'q', answer: 42, unit: 'km', others: [1, 2, 3], explanation: 'e' }],
    sof: [{ topic: 't', intro: 'i', weirdAndTrue: false, claims: [] }],
    quip: [{ setup: 's', sourceHint: 'sh' }],
    wave: [{ leftLabel: 'L', rightLabel: 'R', story: 'st', truthPosition: 50, explanation: 'e' }],
  },
};

describe('contentRepo.findForWeek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue('docRef');
  });

  it('returns the ContentVersion for the given week', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: '2026-W20',
      data: () => ({ contentWeek: '2026-W20', createdAt: '2026-05-11T00:00:00Z', banks: mockVersion.banks }),
    });

    const result = await findForWeek('2026-W20');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('2026-W20');
    expect(result?.contentWeek).toBe('2026-W20');
    expect(result?.banks.lede).toHaveLength(1);
  });

  it('returns null when the week doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await findForWeek('2026-W20');

    expect(result).toBeNull();
  });

  it('fetches from the contentVersions collection using the weekId as doc ID', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await findForWeek('2026-W20');

    expect(mockDoc).toHaveBeenCalledWith({}, 'contentVersions', '2026-W20');
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
    expect(result.contentWeek).toBe('');
  });
});

describe('contentRepo.mergeWithFallback', () => {
  it('returns the version unchanged when all banks are populated', () => {
    const result = mergeWithFallback(mockVersion);

    expect(result.banks.lede).toBe(mockVersion.banks.lede);
    expect(result.banks.spread).toBe(mockVersion.banks.spread);
    expect(result.banks.sof).toBe(mockVersion.banks.sof);
    expect(result.banks.quip).toBe(mockVersion.banks.quip);
    expect(result.banks.wave).toBe(mockVersion.banks.wave);
  });

  it('fills an empty quip bank with the bundled fallback', () => {
    const version: ContentVersion = { ...mockVersion, banks: { ...mockVersion.banks, quip: [] } };

    const result = mergeWithFallback(version);

    expect(result.banks.quip).toBe(QUIP_PROMPTS);
    expect(result.banks.lede).toBe(version.banks.lede); // untouched
  });

  it('fills an empty wave bank with the bundled fallback', () => {
    const version: ContentVersion = { ...mockVersion, banks: { ...mockVersion.banks, wave: [] } };

    const result = mergeWithFallback(version);

    expect(result.banks.wave).toBe(WAVE_BANK);
    expect(result.banks.lede).toBe(version.banks.lede); // untouched
  });

  it('fills all empty banks simultaneously', () => {
    const version: ContentVersion = {
      ...mockVersion,
      banks: { lede: [], spread: [], sof: [], quip: [], wave: [] },
    };

    const result = mergeWithFallback(version);

    expect(result.banks.lede).toBe(LEDE_BANK);
    expect(result.banks.spread).toBe(SPREAD_BANK);
    expect(result.banks.sof).toBe(SOF_BANK);
    expect(result.banks.quip).toBe(QUIP_PROMPTS);
    expect(result.banks.wave).toBe(WAVE_BANK);
  });

  it('preserves version metadata (id, contentWeek, createdAt)', () => {
    const version: ContentVersion = { ...mockVersion, banks: { ...mockVersion.banks, quip: [] } };

    const result = mergeWithFallback(version);

    expect(result.id).toBe(mockVersion.id);
    expect(result.contentWeek).toBe(mockVersion.contentWeek);
    expect(result.createdAt).toBe(mockVersion.createdAt);
  });

  it('does not mutate the input version', () => {
    const version: ContentVersion = { ...mockVersion, banks: { ...mockVersion.banks, wave: [] } };
    const originalWave = version.banks.wave;

    mergeWithFallback(version);

    expect(version.banks.wave).toBe(originalWave); // still []
  });
});
