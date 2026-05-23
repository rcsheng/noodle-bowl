import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockReadStats = jest.fn();
const mockReadSeen = jest.fn();

jest.mock('@/lib/statsRepo', () => ({
  readStats: (...args: unknown[]) => mockReadStats(...args),
  writeStats: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/seenRepo', () => ({
  readSeen: (...args: unknown[]) => mockReadSeen(...args),
  writeSeen: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/syncQueue', () => ({
  scheduleWrite: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  onSnapshot: jest.fn(() => () => {}),
}));

jest.mock('@/lib/firebase', () => ({ db: {} }));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };

import { reducer, initialState } from '../gameReducer';
import { GameProvider, useGame } from '../GameContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function flushEffects(count = 15) {
  for (let i = 0; i < count; i++) await Promise.resolve();
}

// ── Pure reducer: MERGE_FROM_SERVER ──────────────────────────────────────────

describe('reducer: MERGE_FROM_SERVER', () => {
  const localStats = { ...initialState.stats, dailyStreak: 5, lastPlayedDate: '2026-04-20' };
  const serverStatsNewer = { ...initialState.stats, dailyStreak: 20, lastPlayedDate: '2026-04-27' };
  const serverStatsOlder = { ...initialState.stats, dailyStreak: 1, lastPlayedDate: '2026-04-10' };
  const serverStatsSameDate = { ...initialState.stats, dailyStreak: 30, lastPlayedDate: '2026-04-20' };

  function makeState(stats: typeof initialState.stats = localStats) {
    return { ...initialState, stats };
  }

  test('server wins when server.lastPlayedDate is newer than local', () => {
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverStatsNewer });
    expect(next.stats.dailyStreak).toBe(20);
    expect(next.stats.lastPlayedDate).toBe('2026-04-27');
  });

  test('local wins when local.lastPlayedDate is newer than server', () => {
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverStatsOlder });
    expect(next.stats.dailyStreak).toBe(5);
    expect(next.stats.lastPlayedDate).toBe('2026-04-20');
  });

  test('server wins when dates are equal', () => {
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverStatsSameDate });
    expect(next.stats.dailyStreak).toBe(30);
  });

  test('server wins when local.lastPlayedDate is null', () => {
    const state = makeState({ ...initialState.stats, lastPlayedDate: null });
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats: serverStatsNewer });
    expect(next.stats.dailyStreak).toBe(20);
  });

  test('local wins when server.lastPlayedDate is null', () => {
    const serverNull = { ...initialState.stats, lastPlayedDate: null };
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverNull });
    expect(next.stats.dailyStreak).toBe(5);
  });

  test('preserves higher local shield count even when server wins on date', () => {
    // Server has a stale shield count (write didn't flush before app close)
    const stateWithShields = makeState({ ...localStats, streakShieldsAvailable: 2 });
    const serverWithNoShields = { ...serverStatsNewer, streakShieldsAvailable: 0 };
    const next = reducer(stateWithShields, { type: 'MERGE_FROM_SERVER', serverStats: serverWithNoShields });
    expect(next.stats.streakShieldsAvailable).toBe(2);
  });

  test('takes server shield count when it is higher than local', () => {
    // Server has shields from another device that local hasn't seen
    const stateNoShields = makeState({ ...localStats, streakShieldsAvailable: 0 });
    const serverWithShields = { ...serverStatsNewer, streakShieldsAvailable: 3 };
    const next = reducer(stateNoShields, { type: 'MERGE_FROM_SERVER', serverStats: serverWithShields });
    expect(next.stats.streakShieldsAvailable).toBe(3);
  });

  test('seen arrays merge as deduplicated union per game', () => {
    const state = { ...initialState, seen: { ...initialState.seen, lede: [0, 1, 2] } };
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: serverStatsNewer,
      serverSeen: { lede: [1, 2, 3, 4] },
    });
    expect(next.seen.lede).toEqual([0, 1, 2, 3, 4]);
  });

  test('seen union deduplicates overlapping entries', () => {
    const state = { ...initialState, seen: { ...initialState.seen, spread: [5, 6, 7] } };
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: serverStatsNewer,
      serverSeen: { spread: [6, 7, 8] },
    });
    expect(next.seen.spread).toEqual([5, 6, 7, 8]);
  });

  test('seen games not in serverSeen stay unchanged', () => {
    const state = { ...initialState, seen: { ...initialState.seen, quip: [3] } };
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: serverStatsNewer,
    });
    expect(next.seen.quip).toEqual([3]);
  });
});

// ── GameContext integration ───────────────────────────────────────────────────

describe('GameContext: sign-in merge', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockReadStats.mockResolvedValue(null);
    mockReadSeen.mockResolvedValue(null);
  });

  test('calls readStats with uid when signed-in user mounts', async () => {
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(mockReadStats).toHaveBeenCalledWith('user1');
  });

  test('does not call readStats for anonymous users', async () => {
    useAuth.mockReturnValue({ user: { uid: 'anon1', isAnonymous: true }, isAnonymous: true });

    renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(mockReadStats).not.toHaveBeenCalled();
  });

  test('merges server stats into local state when readStats returns data', async () => {
    const serverStats = { ...initialState.stats, dailyStreak: 9, lastPlayedDate: '2026-04-27' };
    mockReadStats.mockResolvedValue(serverStats);
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    // Server date (2026-04-27) > local date (null) → server wins
    expect(result.current.state.stats.dailyStreak).toBe(9);
  });

  test('leaves state unchanged when readStats returns null', async () => {
    mockReadStats.mockResolvedValue(null);
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(result.current.state.stats.dailyStreak).toBe(0);
  });

  test('calls readSeen with uid when signed-in user mounts', async () => {
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(mockReadSeen).toHaveBeenCalledWith('user1');
  });

  test('does not call readSeen for anonymous users', async () => {
    useAuth.mockReturnValue({ user: { uid: 'anon1', isAnonymous: true }, isAnonymous: true });

    renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(mockReadSeen).not.toHaveBeenCalled();
  });

  test('merges server seen into local state when readSeen returns data', async () => {
    const serverSeen = { lede: [9, 10], spread: [], sof: [], quip: [], wave: [] };
    mockReadStats.mockResolvedValue({ ...initialState.stats, lastPlayedDate: '2026-04-27' });
    mockReadSeen.mockResolvedValue(serverSeen);
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(result.current.state.seen.lede).toEqual(expect.arrayContaining([9, 10]));
  });
});
