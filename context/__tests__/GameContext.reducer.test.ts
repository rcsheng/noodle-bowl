import { Action, AppState, FriendInteraction, initialState, reducer } from '../gameReducer';

// Helper: build a state from partial overrides
function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...initialState,
    ...overrides,
    stats: {
      ...initialState.stats,
      ...(overrides.stats ?? {}),
      lede: { ...initialState.stats.lede, ...(overrides.stats?.lede ?? {}) },
      spread: { ...initialState.stats.spread, ...(overrides.stats?.spread ?? {}) },
      sof: { ...initialState.stats.sof, ...(overrides.stats?.sof ?? {}) },
      quip: { ...initialState.stats.quip, ...(overrides.stats?.quip ?? {}) },
      wave: { ...initialState.stats.wave, ...(overrides.stats?.wave ?? {}) },
    },
    seen: {
      ...initialState.seen,
      ...(overrides.seen ?? {}),
    },
    friendInteractions: overrides.friendInteractions ?? [],
  };
}

// ---------------------------------------------------------------------------
// LOAD
// ---------------------------------------------------------------------------
describe('reducer: LOAD', () => {
  test('empty payload returns initialState shape', () => {
    const next = reducer(makeState(), { type: 'LOAD', payload: {} });
    expect(next).toEqual(initialState);
  });

  test('restores per-game stats merged with defaults', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { stats: { lede: { played: 5, correct: 3, streak: 2, bestStreak: 4 } } },
    });
    expect(next.stats.lede.played).toBe(5);
    expect(next.stats.lede.bestStreak).toBe(4);
    expect(next.stats.spread).toEqual({ played: 0, correct: 0, streak: 0, bestStreak: 0 });
  });

  test('per-game stats with partial fields fill missing from defaults', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { stats: { lede: { played: 7 } as any } },
    });
    expect(next.stats.lede.played).toBe(7);
    expect(next.stats.lede.bestStreak).toBe(0);
  });

  test('restores seen arrays per game', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { seen: { lede: [0, 1, 2] } },
    });
    expect(next.seen.lede).toEqual([0, 1, 2]);
    expect(next.seen.spread).toEqual([]); // untouched game resets to empty
  });

  test('restores friendInteractions from payload', () => {
    const interaction: FriendInteraction = {
      id: 'abc',
      type: 'sent_challenge',
      friendName: 'Bob',
      gameId: 'lede',
      questionIndex: 0,
      date: '2026-04-26',
      shieldEarned: false,
    };
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { friendInteractions: [interaction] },
    });
    expect(next.friendInteractions).toHaveLength(1);
    expect(next.friendInteractions[0].id).toBe('abc');
  });

  test('friendInteractions defaults to empty array when absent', () => {
    const next = reducer(makeState(), { type: 'LOAD', payload: {} });
    expect(next.friendInteractions).toEqual([]);
  });

  test('restores streakShieldsAvailable', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { stats: { streakShieldsAvailable: 2 } },
    });
    expect(next.stats.streakShieldsAvailable).toBe(2);
  });

  // Weekly seen-state reset
  test('resets seen arrays when stored seenWeek differs from activeWeek', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { seen: { lede: [0, 1, 2], sof: [5], spread: [], quip: [], wave: [] }, seenWeek: '2026-W19' },
      activeWeek: '2026-W20',
    });
    expect(next.seen.lede).toEqual([]);
    expect(next.seen.sof).toEqual([]);
    expect(next.seenWeek).toBe('2026-W20');
  });

  test('preserves seen arrays when stored seenWeek matches activeWeek', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { seen: { lede: [0, 1, 2], sof: [], spread: [], quip: [], wave: [] }, seenWeek: '2026-W20' },
      activeWeek: '2026-W20',
    });
    expect(next.seen.lede).toEqual([0, 1, 2]);
    expect(next.seenWeek).toBe('2026-W20');
  });

  test('does not reset seen when activeWeek is absent (no week semantics)', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { seen: { lede: [3, 4], sof: [], spread: [], quip: [], wave: [] } },
    });
    expect(next.seen.lede).toEqual([3, 4]);
  });

  test('sets seenWeek to activeWeek after reset', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { seenWeek: '2026-W18' },
      activeWeek: '2026-W20',
    });
    expect(next.seenWeek).toBe('2026-W20');
  });
});

// ---------------------------------------------------------------------------
// UPDATE_STATS
// ---------------------------------------------------------------------------
describe('reducer: UPDATE_STATS', () => {
  const action = (game: string, correct: boolean): Action =>
    ({ type: 'UPDATE_STATS', game: game as any, correct, today: '2026-04-26' });

  test('increments played count for the targeted game', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true));
    expect(next.stats.lede.played).toBe(1);
  });

  test('increments correct count only when correct=true', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true));
    expect(next.stats.lede.correct).toBe(1);
  });

  test('does not increment correct count when correct=false', () => {
    const state = makeState();
    const next = reducer(state, action('lede', false));
    expect(next.stats.lede.correct).toBe(0);
  });

  test('resets streak to 0 when correct=false', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 5, bestStreak: 5 } } });
    const next = reducer(state, action('lede', false));
    expect(next.stats.lede.streak).toBe(0);
  });

  test('increments streak by 1 when correct=true', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 3, bestStreak: 3 } } });
    const next = reducer(state, action('lede', true));
    expect(next.stats.lede.streak).toBe(4);
  });

  test('updates bestStreak when new streak exceeds it', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 5, bestStreak: 5 } } });
    const next = reducer(state, action('lede', true));
    expect(next.stats.lede.bestStreak).toBe(6);
  });

  test('does NOT decrease bestStreak', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 3, bestStreak: 10 } } });
    const next = reducer(state, action('lede', false));
    expect(next.stats.lede.bestStreak).toBe(10);
  });

  test('sets lastPlayed to today on the targeted game', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true));
    expect(next.stats.lede.lastPlayed).toBe('2026-04-26');
  });

  test('only modifies the targeted game stats (other games unchanged)', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true));
    expect(next.stats.spread).toEqual(state.stats.spread);
    expect(next.stats.sof).toEqual(state.stats.sof);
    expect(next.stats.quip).toEqual(state.stats.quip);
    expect(next.stats.wave).toEqual(state.stats.wave);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_WEEKLY_STREAK
// ---------------------------------------------------------------------------
describe('reducer: UPDATE_WEEKLY_STREAK', () => {
  const action = (weekId: string): Action => ({ type: 'UPDATE_WEEKLY_STREAK', weekId });

  test('is a no-op when lastPlayedWeek equals current week', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W17', weeklyStreak: 5 } });
    const next = reducer(state, action('2026-W17'));
    expect(next).toBe(state); // same reference
  });

  test('increments weeklyStreak when lastPlayedWeek was the previous week', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W16', weeklyStreak: 3 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.weeklyStreak).toBe(4);
  });

  test('sets weeklyStreak to 1 on first ever play (null lastPlayedWeek)', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: null, weeklyStreak: 0 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.weeklyStreak).toBe(1);
  });

  test('resets weeklyStreak to 1 when gap > 1 week and no shields', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W10', weeklyStreak: 7, streakShieldsAvailable: 0 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.weeklyStreak).toBe(1);
  });

  test('uses a shield when gap > 1 week and shields available', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W10',
        weeklyStreak: 7,
        streakShieldsAvailable: 2,
        streakShieldUsedThisWeek: false,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.streakShieldsAvailable).toBe(1);
    expect(next.stats.streakShieldUsedThisWeek).toBe(true);
    // weeklyStreak is NOT incremented when using shield (kept same)
    expect(next.stats.weeklyStreak).toBe(7);
  });

  test('uses shield even if streakShieldUsedThisWeek is stale-true from a previous week', () => {
    // Regression: a shield earned on the same week a previous shield was used would
    // leave streakShieldUsedThisWeek=true in storage. Returning after multiple weeks
    // must still consume the available shield — the lastPlayedWeek===weekId guard
    // already ensures UPDATE_WEEKLY_STREAK only runs once per week, so the stale
    // flag must not block the shield.
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W10',
        weeklyStreak: 7,
        streakShieldsAvailable: 2,
        streakShieldUsedThisWeek: true,
      },
    });
    const next = reducer(state, action('2026-W17'));
    // Shield IS used; streak is preserved
    expect(next.stats.streakShieldsAvailable).toBe(1);
    expect(next.stats.weeklyStreak).toBe(7);
    expect(next.stats.streakShieldUsedThisWeek).toBe(true);
  });

  test('updates bestWeeklyStreak when current exceeds it', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W16', weeklyStreak: 5, bestWeeklyStreak: 5 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.bestWeeklyStreak).toBe(6);
  });

  test('increments totalWeeksPlayed', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W16', totalWeeksPlayed: 10 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.totalWeeksPlayed).toBe(11);
  });

  test('streakShieldUsedThisWeek resets to false on a normal consecutive-week continuation', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W16',
        weeklyStreak: 7,
        streakShieldsAvailable: 1,
        streakShieldUsedThisWeek: true,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.streakShieldUsedThisWeek).toBe(false);
    expect(next.stats.weeklyStreak).toBe(8);
  });

  test('streakShieldUsedThisWeek resets to false when streak resets', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W10',
        weeklyStreak: 7,
        streakShieldsAvailable: 0,
        streakShieldUsedThisWeek: true,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.streakShieldUsedThisWeek).toBe(false);
    expect(next.stats.weeklyStreak).toBe(1);
  });

  test('streakSavedBannerSeen flips to false when a shield is consumed', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W10',
        weeklyStreak: 7,
        streakShieldsAvailable: 2,
        streakShieldUsedThisWeek: false,
        streakSavedBannerSeen: true,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.streakShieldUsedThisWeek).toBe(true);
    expect(next.stats.streakSavedBannerSeen).toBe(false);
  });

  test('streakSavedBannerSeen stays true on normal continuation', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W16',
        weeklyStreak: 3,
        streakSavedBannerSeen: true,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.streakSavedBannerSeen).toBe(true);
  });

  test('sets showStreakCelebration to true when weekly streak increments', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W16', weeklyStreak: 3 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.showStreakCelebration).toBe(true);
  });

  test('does NOT set showStreakCelebration when streak resets to 1', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2026-W10', weeklyStreak: 7, streakShieldsAvailable: 0 } });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.showStreakCelebration).toBe(false);
  });

  test('does NOT set showStreakCelebration when a shield is used', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W10',
        weeklyStreak: 7,
        streakShieldsAvailable: 1,
        streakShieldUsedThisWeek: false,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.showStreakCelebration).toBe(false);
  });

  test('handles year-boundary: W01 of new year follows W52 of previous year', () => {
    // 2025 has 52 ISO weeks; W52 2025 → W01 2026 is consecutive
    const state = makeState({ stats: { ...initialState.stats, lastPlayedWeek: '2025-W52', weeklyStreak: 4 } });
    const next = reducer(state, action('2026-W01'));
    expect(next.stats.weeklyStreak).toBe(5);
  });

  // NaN self-heal regression
  test('self-heals when lastPlayedWeek matches but weeklyStreak is 0 (NaN corruption)', () => {
    // Simulates state written by the old NaN bug: lastPlayedWeek is set to the
    // current week but weeklyStreak was corrupted to 0. The idempotency guard
    // must allow one more run so the streak is repaired to 1.
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedWeek: '2026-W17',
        weeklyStreak: 0,
        totalWeeksPlayed: 0,
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(next.stats.weeklyStreak).toBe(1);
    expect(next.stats.totalWeeksPlayed).toBe(1);
  });

  test('produces finite numbers even when input fields are NaN', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        weeklyStreak: NaN as any,
        bestWeeklyStreak: NaN as any,
        totalWeeksPlayed: NaN as any,
        lastPlayedWeek: '2026-W16',
      },
    });
    const next = reducer(state, action('2026-W17'));
    expect(Number.isFinite(next.stats.weeklyStreak)).toBe(true);
    expect(Number.isFinite(next.stats.bestWeeklyStreak)).toBe(true);
    expect(Number.isFinite(next.stats.totalWeeksPlayed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DISMISS_STREAK_CELEBRATION
// ---------------------------------------------------------------------------
describe('reducer: DISMISS_STREAK_CELEBRATION', () => {
  test('sets showStreakCelebration to false', () => {
    const state = makeState({
      stats: { ...initialState.stats, showStreakCelebration: true },
    });
    const next = reducer(state, { type: 'DISMISS_STREAK_CELEBRATION' });
    expect(next.stats.showStreakCelebration).toBe(false);
  });

  test('is a no-op when showStreakCelebration is already false', () => {
    const state = makeState({
      stats: { ...initialState.stats, showStreakCelebration: false },
    });
    const next = reducer(state, { type: 'DISMISS_STREAK_CELEBRATION' });
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// DISMISS_STREAK_SAVED_BANNER
// ---------------------------------------------------------------------------
describe('reducer: DISMISS_STREAK_SAVED_BANNER', () => {
  test('sets streakSavedBannerSeen to true', () => {
    const state = makeState({
      stats: { ...initialState.stats, streakSavedBannerSeen: false },
    });
    const next = reducer(state, { type: 'DISMISS_STREAK_SAVED_BANNER' });
    expect(next.stats.streakSavedBannerSeen).toBe(true);
  });

  test('is a no-op when already seen', () => {
    const state = makeState({
      stats: { ...initialState.stats, streakSavedBannerSeen: true },
    });
    const next = reducer(state, { type: 'DISMISS_STREAK_SAVED_BANNER' });
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// MERGE_FROM_SERVER — covers seen sync from users/{uid}/meta/seen
// ---------------------------------------------------------------------------
describe('reducer: MERGE_FROM_SERVER (seen sync)', () => {
  // seenWeek in makeState() defaults to '' (initialState.seenWeek).
  // Pass serverSeenWeek: '' to match and enable the merge.

  test('unions local and remote seen per game when weeks match', () => {
    const state = makeState({
      seen: { ...initialState.seen, lede: [0, 1], spread: [5] },
    });
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: state.stats,
      serverSeen: { lede: [1, 2, 3], sof: [7] },
      serverSeenWeek: '',
    });
    expect(next.seen.lede.sort()).toEqual([0, 1, 2, 3]);
    expect(next.seen.spread).toEqual([5]);
    expect(next.seen.sof).toEqual([7]);
  });

  test('result equals remote when local seen is empty and weeks match', () => {
    const state = makeState();
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: state.stats,
      serverSeen: { lede: [10, 11], wave: [4] },
      serverSeenWeek: '',
    });
    expect(next.seen.lede).toEqual([10, 11]);
    expect(next.seen.wave).toEqual([4]);
  });

  test('result equals local when serverSeen is undefined', () => {
    const state = makeState({
      seen: { ...initialState.seen, quip: [9] },
    });
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats: state.stats });
    expect(next.seen.quip).toEqual([9]);
  });

  test('union dedupes overlapping ids', () => {
    const state = makeState({ seen: { ...initialState.seen, lede: [1, 2, 3] } });
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: state.stats,
      serverSeen: { lede: [2, 3, 4] },
      serverSeenWeek: '',
    });
    expect(next.seen.lede.sort()).toEqual([1, 2, 3, 4]);
  });

  test('skips seen merge when serverSeenWeek is absent (legacy data)', () => {
    const state = makeState({ seen: { ...initialState.seen, lede: [0] } });
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: state.stats,
      serverSeen: { lede: [1, 2, 3] },
      // serverSeenWeek intentionally absent
    });
    // Local seen preserved unchanged — stale server data discarded
    expect(next.seen.lede).toEqual([0]);
  });

  test('skips seen merge when serverSeenWeek mismatches local seenWeek', () => {
    const state = { ...makeState(), seenWeek: '2026-W20' };
    const next = reducer(state, {
      type: 'MERGE_FROM_SERVER',
      serverStats: state.stats,
      serverSeen: { spread: [0, 1, 2, 3, 4] },
      serverSeenWeek: '2026-W19', // stale week
    });
    // spread stays empty — old indices rejected
    expect(next.seen.spread).toEqual([]);
  });

  test('server stats win when server lastPlayedWeek is newer', () => {
    const state = makeState({
      stats: { ...initialState.stats, lastPlayedWeek: '2026-W10', weeklyStreak: 3 },
    });
    const serverStats: AppState['stats'] = {
      ...state.stats,
      lastPlayedWeek: '2026-W17',
      weeklyStreak: 7,
    };
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats });
    expect(next.stats.weeklyStreak).toBe(7);
    expect(next.stats.lastPlayedWeek).toBe('2026-W17');
  });

  test('local stats kept when local lastPlayedWeek is newer', () => {
    const state = makeState({
      stats: { ...initialState.stats, lastPlayedWeek: '2026-W17', weeklyStreak: 7 },
    });
    const serverStats: AppState['stats'] = {
      ...state.stats,
      lastPlayedWeek: '2026-W10',
      weeklyStreak: 3,
    };
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats });
    expect(next.stats.weeklyStreak).toBe(7);
    expect(next.stats.lastPlayedWeek).toBe('2026-W17');
  });

  // NaN normalization regression
  test('normalises NaN streak fields from old Firestore documents to 0', () => {
    const state = makeState();
    const serverStats: AppState['stats'] = {
      ...initialState.stats,
      lastPlayedWeek: '2026-W17',
      weeklyStreak: NaN as any,
      bestWeeklyStreak: NaN as any,
      totalWeeksPlayed: NaN as any,
    };
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats });
    expect(Number.isFinite(next.stats.weeklyStreak)).toBe(true);
    expect(Number.isFinite(next.stats.bestWeeklyStreak)).toBe(true);
    expect(Number.isFinite(next.stats.totalWeeksPlayed)).toBe(true);
  });

  test('takes Math.max of server and local streak values', () => {
    // Local has a valid streak earned this session; server still has old NaN data.
    // MERGE_FROM_SERVER must not downgrade the local value.
    const state = makeState({
      stats: { ...initialState.stats, lastPlayedWeek: '2026-W17', weeklyStreak: 1, totalWeeksPlayed: 1 },
    });
    const serverStats: AppState['stats'] = {
      ...initialState.stats,
      lastPlayedWeek: '2026-W17',
      weeklyStreak: NaN as any,
      totalWeeksPlayed: NaN as any,
    };
    const next = reducer(state, { type: 'MERGE_FROM_SERVER', serverStats });
    expect(next.stats.weeklyStreak).toBe(1);
    expect(next.stats.totalWeeksPlayed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SET_SEEN
// ---------------------------------------------------------------------------
describe('reducer: SET_SEEN', () => {
  const action = (game: string, seen: number[]): Action =>
    ({ type: 'SET_SEEN', game: game as any, seen });

  test('replaces seen for the targeted game', () => {
    const state = makeState();
    const next = reducer(state, action('lede', [1, 2, 3]));
    expect(next.seen.lede).toEqual([1, 2, 3]);
  });

  test('preserves seen for other games', () => {
    const state = makeState({ seen: { ...initialState.seen, spread: [0, 1] } });
    const next = reducer(state, action('lede', [5]));
    expect(next.seen.spread).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// EARN_SHIELD
// ---------------------------------------------------------------------------
describe('reducer: EARN_SHIELD', () => {
  const action: Action = { type: 'EARN_SHIELD' };

  test('increments streakShieldsAvailable by 1', () => {
    const state = makeState({ stats: { ...initialState.stats, streakShieldsAvailable: 1 } });
    const next = reducer(state, action);
    expect(next.stats.streakShieldsAvailable).toBe(2);
  });

  test('has no cap — increments past 3', () => {
    const state = makeState({ stats: { ...initialState.stats, streakShieldsAvailable: 3 } });
    const next = reducer(state, action);
    expect(next.stats.streakShieldsAvailable).toBe(4);
  });

  test('keeps incrementing on repeated dispatches (e.g., reaches 12)', () => {
    let state: AppState = makeState({ stats: { ...initialState.stats, streakShieldsAvailable: 0 } });
    for (let i = 0; i < 12; i++) state = reducer(state, action);
    expect(state.stats.streakShieldsAvailable).toBe(12);
  });

  test('reducer is auth-agnostic — same increment regardless of any external auth state', () => {
    // Reducer takes no auth context; regression guard against re-introducing
    // a "skip earn for anonymous" gate inside the reducer itself.
    const state = makeState({ stats: { ...initialState.stats, streakShieldsAvailable: 5 } });
    const next = reducer(state, action);
    expect(next.stats.streakShieldsAvailable).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// ADD_FRIEND_INTERACTION
// ---------------------------------------------------------------------------
describe('reducer: ADD_FRIEND_INTERACTION', () => {
  const makeInteraction = (id: string): FriendInteraction => ({
    id,
    type: 'sent_challenge',
    friendName: 'Alice',
    gameId: 'lede',
    questionIndex: 0,
    date: '2026-04-26',
    shieldEarned: false,
  });

  const action = (interaction: FriendInteraction): Action =>
    ({ type: 'ADD_FRIEND_INTERACTION', interaction });

  test('adds the interaction to friendInteractions', () => {
    const state = makeState();
    const next = reducer(state, action(makeInteraction('1')));
    expect(next.friendInteractions).toHaveLength(1);
    expect(next.friendInteractions[0].id).toBe('1');
  });

  test('preserves existing interactions', () => {
    const existing = makeInteraction('old');
    const state = makeState({ friendInteractions: [existing] });
    const next = reducer(state, action(makeInteraction('new')));
    expect(next.friendInteractions).toHaveLength(2);
    // New interaction is prepended
    expect(next.friendInteractions[0].id).toBe('new');
    expect(next.friendInteractions[1].id).toBe('old');
  });
});

// ---------------------------------------------------------------------------
// SET_FRIEND_INTERACTIONS
// ---------------------------------------------------------------------------
describe('reducer: SET_FRIEND_INTERACTIONS', () => {
  const makeInteraction = (id: string): FriendInteraction => ({
    id,
    type: 'sent_challenge',
    friendName: 'Alice',
    gameId: 'lede',
    questionIndex: 0,
    date: '2026-04-26',
    shieldEarned: false,
  });

  test('replaces the current interactions array', () => {
    const existing = makeInteraction('old');
    const state = makeState({ friendInteractions: [existing] });
    const next = reducer(state, {
      type: 'SET_FRIEND_INTERACTIONS',
      interactions: [makeInteraction('a'), makeInteraction('b')],
    } as Action);
    expect(next.friendInteractions).toHaveLength(2);
    expect(next.friendInteractions[0].id).toBe('a');
    expect(next.friendInteractions[1].id).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// DISMISS_HELP_CARD
// ---------------------------------------------------------------------------
describe('reducer: DISMISS_HELP_CARD', () => {
  const makeReceivedHelp = (id: string, token: string): FriendInteraction => ({
    id,
    type: 'received_help',
    friendName: 'Alice',
    gameId: 'lede',
    questionIndex: 0,
    date: '2026-04-27',
    shieldEarned: false,
    token,
    friendAnswer: 'Bea',
  });

  test('flags the matching received_help interaction as homeCardDismissed', () => {
    const interaction = makeReceivedHelp('1', 'TOKEN1');
    const state = makeState({ friendInteractions: [interaction] });
    const next = reducer(state, { type: 'DISMISS_HELP_CARD', token: 'TOKEN1' } as Action);
    expect(next.friendInteractions[0].homeCardDismissed).toBe(true);
  });

  test('also flags challenge_accepted interactions matching the token', () => {
    const challenge: FriendInteraction = {
      id: 'c1',
      type: 'challenge_accepted',
      friendName: 'Bob',
      gameId: 'lede',
      questionIndex: 0,
      date: '2026-04-28',
      shieldEarned: false,
      token: 'CTOKEN',
      senderPrediction: 'Alex',
      friendAnswer: 'Bea',
    };
    const state = makeState({ friendInteractions: [challenge] });
    const next = reducer(state, { type: 'DISMISS_HELP_CARD', token: 'CTOKEN' } as Action);
    expect(next.friendInteractions[0].homeCardDismissed).toBe(true);
  });

  test('does NOT flag sent_challenge interactions even with matching token', () => {
    const sent: FriendInteraction = {
      id: 's1',
      type: 'sent_challenge',
      friendName: 'Bob',
      gameId: 'lede',
      questionIndex: 0,
      date: '2026-04-28',
      shieldEarned: false,
      token: 'CTOKEN',
      senderPrediction: 'Alex',
    };
    const state = makeState({ friendInteractions: [sent] });
    const next = reducer(state, { type: 'DISMISS_HELP_CARD', token: 'CTOKEN' } as Action);
    expect(next.friendInteractions[0].homeCardDismissed).toBeUndefined();
  });

  test('leaves other interactions alone', () => {
    const a = makeReceivedHelp('1', 'TOKEN1');
    const b = makeReceivedHelp('2', 'TOKEN2');
    const state = makeState({ friendInteractions: [a, b] });
    const next = reducer(state, { type: 'DISMISS_HELP_CARD', token: 'TOKEN1' } as Action);
    expect(next.friendInteractions[0].homeCardDismissed).toBe(true);
    expect(next.friendInteractions[1].homeCardDismissed).toBeUndefined();
  });

  test('no-op when token does not match', () => {
    const interaction = makeReceivedHelp('1', 'TOKEN1');
    const state = makeState({ friendInteractions: [interaction] });
    const next = reducer(state, { type: 'DISMISS_HELP_CARD', token: 'NOPE' } as Action);
    expect(next.friendInteractions[0].homeCardDismissed).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SET_ASKER_ANSWER
// ---------------------------------------------------------------------------
describe('reducer: SET_ASKER_ANSWER', () => {
  const makeReceivedHelp = (id: string, token: string): FriendInteraction => ({
    id,
    type: 'received_help',
    friendName: 'Alice',
    gameId: 'lede',
    questionIndex: 0,
    date: '2026-05-11',
    shieldEarned: false,
    token,
    friendAnswer: '1',
  });

  test('sets askerAnswer on the matching received_help interaction', () => {
    const state = makeState({ friendInteractions: [makeReceivedHelp('1', 'TOK')] });
    const next = reducer(state, { type: 'SET_ASKER_ANSWER', token: 'TOK', askerAnswer: '0' } as Action);
    expect(next.friendInteractions[0].askerAnswer).toBe('0');
  });

  test('leaves other interactions unchanged', () => {
    const a = makeReceivedHelp('1', 'TOK1');
    const b = makeReceivedHelp('2', 'TOK2');
    const state = makeState({ friendInteractions: [a, b] });
    const next = reducer(state, { type: 'SET_ASKER_ANSWER', token: 'TOK1', askerAnswer: '2' } as Action);
    expect(next.friendInteractions[0].askerAnswer).toBe('2');
    expect(next.friendInteractions[1].askerAnswer).toBeUndefined();
  });

  test('no-op when token does not match', () => {
    const state = makeState({ friendInteractions: [makeReceivedHelp('1', 'TOK')] });
    const next = reducer(state, { type: 'SET_ASKER_ANSWER', token: 'NOPE', askerAnswer: '1' } as Action);
    expect(next.friendInteractions[0].askerAnswer).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// REMOVE_FRIEND_INTERACTION
// ---------------------------------------------------------------------------
describe('reducer: REMOVE_FRIEND_INTERACTION', () => {
  const make = (id: string, type: FriendInteraction['type'] = 'received_help'): FriendInteraction => ({
    id,
    type,
    friendName: 'Alice',
    gameId: 'lede',
    questionIndex: 0,
    date: '2026-04-27',
    shieldEarned: false,
  });

  test('removes interaction with matching id', () => {
    const state = makeState({ friendInteractions: [make('1'), make('2')] });
    const next = reducer(state, { type: 'REMOVE_FRIEND_INTERACTION', id: '1' } as Action);
    expect(next.friendInteractions).toHaveLength(1);
    expect(next.friendInteractions[0].id).toBe('2');
  });

  test('no-op when id does not match', () => {
    const state = makeState({ friendInteractions: [make('1')] });
    const next = reducer(state, { type: 'REMOVE_FRIEND_INTERACTION', id: 'nope' } as Action);
    expect(next.friendInteractions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------
describe('reducer: immutability', () => {
  test('returned state is a new object reference', () => {
    const state = makeState();
    const next = reducer(state, { type: 'UPDATE_STATS', game: 'lede', correct: true, today: '2026-04-26' });
    expect(next).not.toBe(state);
  });

  test('returned state.stats is a new object reference when stats changed', () => {
    const state = makeState();
    const next = reducer(state, { type: 'UPDATE_STATS', game: 'lede', correct: true, today: '2026-04-26' });
    expect(next.stats).not.toBe(state.stats);
  });
});
