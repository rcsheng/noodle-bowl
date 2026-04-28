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

  test('restores totalPoints from payload', () => {
    const next = reducer(makeState(), { type: 'LOAD', payload: { stats: { totalPoints: 99 } } });
    expect(next.stats.totalPoints).toBe(99);
    expect(next.stats.dailyStreak).toBe(0); // unspecified field stays at default
  });

  test('restores per-game stats merged with defaults', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { stats: { lede: { played: 5, correct: 3, streak: 2, bestStreak: 4, bestScore: 30 } } },
    });
    expect(next.stats.lede.played).toBe(5);
    expect(next.stats.lede.bestScore).toBe(30);
    expect(next.stats.spread).toEqual({ played: 0, correct: 0, streak: 0, bestStreak: 0, bestScore: 0 });
  });

  test('per-game stats with partial fields fill missing from defaults', () => {
    const next = reducer(makeState(), {
      type: 'LOAD',
      payload: { stats: { lede: { played: 7 } as any } },
    });
    expect(next.stats.lede.played).toBe(7);
    expect(next.stats.lede.bestScore).toBe(0);
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
});

// ---------------------------------------------------------------------------
// UPDATE_STATS
// ---------------------------------------------------------------------------
describe('reducer: UPDATE_STATS', () => {
  const action = (game: string, correct: boolean, points: number): Action =>
    ({ type: 'UPDATE_STATS', game: game as any, correct, points, today: '2026-04-26' });

  test('increments played count for the targeted game', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true, 10));
    expect(next.stats.lede.played).toBe(1);
  });

  test('increments correct count only when correct=true', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true, 10));
    expect(next.stats.lede.correct).toBe(1);
  });

  test('does not increment correct count when correct=false', () => {
    const state = makeState();
    const next = reducer(state, action('lede', false, 0));
    expect(next.stats.lede.correct).toBe(0);
  });

  test('increments totalPoints by the points value', () => {
    const state = makeState({ stats: { ...initialState.stats, totalPoints: 50 } });
    const next = reducer(state, action('lede', true, 15));
    expect(next.stats.totalPoints).toBe(65);
  });

  test('resets streak to 0 when correct=false', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 5, bestStreak: 5, bestScore: 0 } } });
    const next = reducer(state, action('lede', false, 0));
    expect(next.stats.lede.streak).toBe(0);
  });

  test('increments streak by 1 when correct=true', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 3, bestStreak: 3, bestScore: 0 } } });
    const next = reducer(state, action('lede', true, 10));
    expect(next.stats.lede.streak).toBe(4);
  });

  test('updates bestStreak when new streak exceeds it', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 5, bestStreak: 5, bestScore: 0 } } });
    const next = reducer(state, action('lede', true, 10));
    expect(next.stats.lede.bestStreak).toBe(6);
  });

  test('does NOT decrease bestStreak', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 3, bestStreak: 10, bestScore: 0 } } });
    const next = reducer(state, action('lede', false, 0));
    expect(next.stats.lede.bestStreak).toBe(10);
  });

  test('sets lastPlayed to today on the targeted game', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true, 10));
    expect(next.stats.lede.lastPlayed).toBe('2026-04-26');
  });

  test('sets lastPoints to the points earned on the targeted game', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true, 25));
    expect(next.stats.lede.lastPoints).toBe(25);
  });

  test('updates bestScore with Math.max', () => {
    const state = makeState({ stats: { ...initialState.stats, lede: { played: 0, correct: 0, streak: 0, bestStreak: 0, bestScore: 20 } } });
    const higher = reducer(state, action('lede', true, 30));
    expect(higher.stats.lede.bestScore).toBe(30);

    const lower = reducer(state, action('lede', true, 10));
    expect(lower.stats.lede.bestScore).toBe(20);
  });

  test('only modifies the targeted game stats (other games unchanged)', () => {
    const state = makeState();
    const next = reducer(state, action('lede', true, 10));
    expect(next.stats.spread).toEqual(state.stats.spread);
    expect(next.stats.sof).toEqual(state.stats.sof);
    expect(next.stats.quip).toEqual(state.stats.quip);
    expect(next.stats.wave).toEqual(state.stats.wave);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_DAILY_STREAK
// ---------------------------------------------------------------------------
describe('reducer: UPDATE_DAILY_STREAK', () => {
  const action = (today: string): Action => ({ type: 'UPDATE_DAILY_STREAK', today });

  test('is a no-op when lastPlayedDate equals today', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedDate: '2026-04-26', dailyStreak: 5 } });
    const next = reducer(state, action('2026-04-26'));
    expect(next).toBe(state); // same reference
  });

  test('increments dailyStreak when lastPlayedDate was yesterday', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedDate: '2026-04-25', dailyStreak: 3 } });
    const next = reducer(state, action('2026-04-26'));
    expect(next.stats.dailyStreak).toBe(4);
  });

  test('sets dailyStreak to 1 on first ever play (null lastPlayedDate)', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedDate: null, dailyStreak: 0 } });
    const next = reducer(state, action('2026-04-26'));
    expect(next.stats.dailyStreak).toBe(1);
  });

  test('resets dailyStreak to 1 when gap > 1 day and no shields', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedDate: '2026-04-20', dailyStreak: 7, streakShieldsAvailable: 0 } });
    const next = reducer(state, action('2026-04-26'));
    expect(next.stats.dailyStreak).toBe(1);
  });

  test('uses a shield when gap > 1 day and shields available', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedDate: '2026-04-20',
        dailyStreak: 7,
        streakShieldsAvailable: 2,
        streakShieldUsedToday: false,
      },
    });
    const next = reducer(state, action('2026-04-26'));
    expect(next.stats.streakShieldsAvailable).toBe(1);
    expect(next.stats.streakShieldUsedToday).toBe(true);
    // dailyStreak is NOT incremented when using shield (kept same)
    expect(next.stats.dailyStreak).toBe(7);
  });

  test('does NOT use a shield if streakShieldUsedToday is already true', () => {
    const state = makeState({
      stats: {
        ...initialState.stats,
        lastPlayedDate: '2026-04-20',
        dailyStreak: 7,
        streakShieldsAvailable: 2,
        streakShieldUsedToday: true,
      },
    });
    const next = reducer(state, action('2026-04-26'));
    // Shield not used; streak resets to 1
    expect(next.stats.streakShieldsAvailable).toBe(2);
    expect(next.stats.dailyStreak).toBe(1);
  });

  test('updates bestDailyStreak when current exceeds it', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedDate: '2026-04-25', dailyStreak: 5, bestDailyStreak: 5 } });
    const next = reducer(state, action('2026-04-26'));
    expect(next.stats.bestDailyStreak).toBe(6);
  });

  test('increments totalDaysPlayed', () => {
    const state = makeState({ stats: { ...initialState.stats, lastPlayedDate: '2026-04-25', totalDaysPlayed: 10 } });
    const next = reducer(state, action('2026-04-26'));
    expect(next.stats.totalDaysPlayed).toBe(11);
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

  test('caps at 3 (EARN_SHIELD when already at 3 stays at 3)', () => {
    const state = makeState({ stats: { ...initialState.stats, streakShieldsAvailable: 3 } });
    const next = reducer(state, action);
    expect(next.stats.streakShieldsAvailable).toBe(3);
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
    const next = reducer(state, { type: 'UPDATE_STATS', game: 'lede', correct: true, points: 10, today: '2026-04-26' });
    expect(next).not.toBe(state);
  });

  test('returned state.stats is a new object reference when stats changed', () => {
    const state = makeState();
    const next = reducer(state, { type: 'UPDATE_STATS', game: 'lede', correct: true, points: 10, today: '2026-04-26' });
    expect(next.stats).not.toBe(state.stats);
  });
});
