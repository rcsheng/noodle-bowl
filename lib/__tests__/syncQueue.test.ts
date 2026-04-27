const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

import { scheduleWrite } from '../syncQueue';

async function flushPromises(count = 10) {
  for (let i = 0; i < count; i++) await Promise.resolve();
}

describe('syncQueue.scheduleWrite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('debounces multiple rapid writes into one', async () => {
    const writeFn = jest.fn().mockResolvedValue(undefined);

    scheduleWrite('debounce', 'p1', writeFn, 1500);
    scheduleWrite('debounce', 'p2', writeFn, 1500);
    scheduleWrite('debounce', 'p3', writeFn, 1500);

    jest.runAllTimers();
    await flushPromises();

    expect(writeFn).toHaveBeenCalledTimes(1);
    expect(writeFn).toHaveBeenCalledWith('p3');
  });

  test('enqueues payload to AsyncStorage outbox when writeFn throws', async () => {
    const writeFn = jest.fn().mockRejectedValue(new Error('network'));

    scheduleWrite('enqueue', 'payload', writeFn, 1500);
    jest.runAllTimers();
    await flushPromises();

    const call = mockSetItem.mock.calls.find(c => (c[0] as string).includes('enqueue'));
    expect(call).toBeDefined();
    const stored: string[] = JSON.parse(call![1] as string);
    expect(stored).toContain('payload');
  });

  test('drains outbox entries before new write when writeFn succeeds', async () => {
    mockGetItem.mockImplementation((key: string) =>
      key === 'sync_outbox_drain'
        ? Promise.resolve(JSON.stringify(['stale']))
        : Promise.resolve(null),
    );
    const writeFn = jest.fn().mockResolvedValue(undefined);

    scheduleWrite('drain', 'fresh', writeFn, 1500);
    jest.runAllTimers();
    await flushPromises();

    expect(writeFn).toHaveBeenCalledWith('stale');
    expect(writeFn).toHaveBeenCalledWith('fresh');
    expect(mockRemoveItem).toHaveBeenCalledWith('sync_outbox_drain');
  });

  test('caps outbox at 50 entries when overflow occurs', async () => {
    const existing = Array.from({ length: 50 }, (_, i) => `entry${i}`);
    mockGetItem.mockImplementation((key: string) =>
      key === 'sync_outbox_cap'
        ? Promise.resolve(JSON.stringify(existing))
        : Promise.resolve(null),
    );
    const writeFn = jest.fn().mockRejectedValue(new Error('network'));

    scheduleWrite('cap', 'overflow', writeFn, 1500);
    jest.runAllTimers();
    await flushPromises();

    const call = mockSetItem.mock.calls.find(c => (c[0] as string).includes('cap'));
    const stored: string[] = JSON.parse(call![1] as string);
    expect(stored).toHaveLength(50);
    expect(stored[stored.length - 1]).toBe('overflow');
    expect(stored).not.toContain('entry0');
  });
});
