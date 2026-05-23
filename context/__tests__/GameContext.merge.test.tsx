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
  const localStats = { ...initialState.stats, weeklyStreak: 5, lastPlayedWeek: '2026-W16' };
  const serverStatsNewer = { ...initialState.stats, weeklyStreak: 20, lastPlayedWeek: '2026-W17' };
  const serverStatsOlder = { ...initialState.stats, weeklyStreak: 1, lastPlayedWeek: '2026-W10' };
  const serverStatsSameWeek = { ...initialState.stats, weeklyStreak: 30, lastPlayedWeek: '2026-W16' };

  function makeState(stats: typeof initialState.stats = localStats) {
    return { ...initialState, stats };
  }

  test('server wins when server.lastPlayedWeek is newer than local', () => {
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverStatsNewer });
    expect(next.stats.weeklyStreak).toBe(20);
    expect(next.stats.lastPlayedWeek).toBe('2026-W17');
  });

  test('local wins when local.lastPlayedWeek is newer than server', () => {
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverStatsOlder });
    expect(next.stats.weeklyStreak).toBe(5);
    expect(next.stats.lastPlayedWeek).toBe('2026-W16');
  });

  test('server wins when weeks are equal', () => {
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverStatsSameWeek });
    expect(next.stats.weeklyStreak).toBe(30);
  });

  test('server wins when local.lastPlayedWeek is null', () => {
    const state = makeState({ ...initialState.stats, lastPlayedWeek: null });
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats: serverStatsNewer });
    expect(next.stats.weeklyStreak).toBe(20);
  });

  test('local wins when server.lastPlayedWeek is null', () => {
    const serverNull = { ...initialState.stats, lastPlayedWeek: null };
    const next = reducer(makeState(), { type: 'MERGE_FROM_SERVER', serverStats: serverNull });
    expect(next.stats.weeklyStreak).toBe(5);
  });

  test('preserves higher local shield count even when server wins on week', () => {
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

  test('seen arrays merge as deduplicated union per game when weeks match', () => {
    // initialState.seenWeek is '' — pass serverSeenWeek: '' to enable the merge
    const state = { ...initialState, seen: { ...initialState.seen, lede: [0, 1, 2] } };
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: serverStatsNewer,
      serverSeen: { lede: [1, 2, 3, 4] },
      serverSeenWeek: '',
    });
    expect(next.seen.lede).toEqual([0, 1, 2, 3, 4]);
  });

  test('seen union deduplicates overlapping entries', () => {
    const state = { ...initialState, seen: { ...initialState.seen, spread: [5, 6, 7] } };
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: serverStatsNewer,
      serverSeen: { spread: [6, 7, 8] },
      serverSeenWeek: '',
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
    const serverStats = { ...initialState.stats, weeklyStreak: 9, lastPlayedWeek: '2026-W17' };
    mockReadStats.mockResolvedValue(serverStats);
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    // Server week (2026-W17) > local week (null) → server wins
    expect(result.current.state.stats.weeklyStreak).toBe(9);
  });

  test('leaves state unchanged when readStats returns null', async () => {
    mockReadStats.mockResolvedValue(null);
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(result.current.state.stats.weeklyStreak).toBe(0);
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
    mockReadStats.mockResolvedValue({ ...initialState.stats, lastPlayedWeek: '2026-W17' });
    // readSeen now returns { seen, seenWeek }; seenWeek must match state.seenWeek ('' for initialState)
    mockReadSeen.mockResolvedValue({ seen: serverSeen, seenWeek: '' });
    useAuth.mockReturnValue({ user: { uid: 'user1', isAnonymous: false }, isAnonymous: false });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => { await flushEffects(); });

    expect(result.current.state.seen.lede).toEqual(expect.arrayContaining([9, 10]));
  });
});
