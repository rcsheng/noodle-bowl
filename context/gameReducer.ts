import { GameId } from '@/constants/data';

export interface FriendInteraction {
  id: string;
  type: 'received_help' | 'gave_help' | 'sent_challenge' | 'challenge_accepted' | 'received_challenge' | 'sent_help';
  friendName: string;
  gameId: GameId;
  questionIndex: number;
  date: string; // YYYY-MM-DD
  shieldEarned: boolean;
  token?: string;
  senderPrediction?: string;
  friendAnswer?: string;
  askerAnswer?: string;
  bonusPointsEarned?: number;
  homeCardDismissed?: boolean;
  contentWeek?: string; // ISO week of the question; absent on old interactions
}

interface GameStats {
  played: number;
  correct: number;
  streak: number;
  bestStreak: number;
  lastPlayed?: string;
}

interface AppState {
  stats: {
    dailyStreak: number;
    bestDailyStreak: number;
    lastPlayedDate: string | null;
    totalDaysPlayed: number;
    streakShieldsAvailable: number;
    streakShieldUsedToday: boolean;
    streakSavedBannerSeen: boolean;
    showStreakCelebration: boolean;
    lede: GameStats;
    spread: GameStats;
    sof: GameStats;
    quip: GameStats;
    wave: GameStats;
  };
  seen: Record<GameId, number[]>;
  seenWeek: string; // ISO week string when seen arrays were last populated, e.g. "2026-W20"
  friendInteractions: FriendInteraction[];
}

export type { AppState, GameStats };

const defaultGameStats: GameStats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };

export const initialState: AppState = {
  stats: {
    dailyStreak: 0,
    bestDailyStreak: 0,
    lastPlayedDate: null,
    totalDaysPlayed: 0,
    streakShieldsAvailable: 0,
    streakShieldUsedToday: false,
    streakSavedBannerSeen: true,
    showStreakCelebration: false,
    lede: { ...defaultGameStats },
    spread: { ...defaultGameStats },
    sof: { ...defaultGameStats },
    quip: { ...defaultGameStats },
    wave: { ...defaultGameStats },
  },
  seen: { quip: [], spread: [], lede: [], wave: [], sof: [] },
  seenWeek: '',
  friendInteractions: [],
};

export function getPreviousDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type Action =
  | { type: 'LOAD'; payload: { stats?: Partial<AppState['stats']>; seen?: Partial<AppState['seen']>; seenWeek?: string; friendInteractions?: FriendInteraction[] }; activeWeek?: string }
  | { type: 'UPDATE_STATS'; game: GameId; correct: boolean; today: string }
  | { type: 'UPDATE_DAILY_STREAK'; today: string }
  | { type: 'SET_SEEN'; game: GameId; seen: number[] }
  | { type: 'EARN_SHIELD' }
  | { type: 'DISMISS_STREAK_SAVED_BANNER' }
  | { type: 'DISMISS_STREAK_CELEBRATION' }
  | { type: 'ADD_FRIEND_INTERACTION'; interaction: FriendInteraction }
  | { type: 'SET_FRIEND_INTERACTIONS'; interactions: FriendInteraction[] }
  | { type: 'REMOVE_FRIEND_INTERACTION'; id: string }
  | { type: 'DISMISS_HELP_CARD'; token: string }
  | { type: 'SET_ASKER_ANSWER'; token: string; askerAnswer: string }
  | { type: 'MERGE_FROM_SERVER'; serverStats: AppState['stats']; serverSeen?: Partial<AppState['seen']> };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD': {
      const { stats, seen, seenWeek: storedSeenWeek, friendInteractions } = action.payload;
      const activeWeek = action.activeWeek ?? '';
      // Reset seen arrays when the stored week differs from the current active week.
      // If activeWeek is absent (empty string), skip the check for backward compat.
      const weekChanged = activeWeek !== '' && (storedSeenWeek ?? '') !== activeWeek;

      const mergedStats = { ...initialState.stats };
      if (stats) {
        mergedStats.dailyStreak = stats.dailyStreak ?? 0;
        mergedStats.bestDailyStreak = stats.bestDailyStreak ?? 0;
        mergedStats.lastPlayedDate = stats.lastPlayedDate ?? null;
        mergedStats.totalDaysPlayed = stats.totalDaysPlayed ?? 0;
        mergedStats.streakShieldsAvailable = stats.streakShieldsAvailable ?? 0;
        mergedStats.streakShieldUsedToday = stats.streakShieldUsedToday ?? false;
        mergedStats.streakSavedBannerSeen = stats.streakSavedBannerSeen ?? true;
        // showStreakCelebration is a transient display flag — never restored from storage
        (['lede', 'spread', 'sof', 'quip', 'wave'] as GameId[]).forEach(g => {
          const saved = stats[g];
          if (saved) mergedStats[g] = { ...defaultGameStats, ...(saved as GameStats) };
        });
      }
      // If the week changed, discard the old seen lists so users get a fresh bank.
      const mergedSeen = { ...initialState.seen };
      if (!weekChanged && seen) {
        (['quip', 'spread', 'lede', 'wave', 'sof'] as GameId[]).forEach(g => {
          if (seen[g]) mergedSeen[g] = seen[g]!;
        });
      }
      return {
        stats: mergedStats,
        seen: mergedSeen,
        seenWeek: activeWeek || storedSeenWeek || '',
        friendInteractions: friendInteractions ?? [],
      };
    }
    case 'UPDATE_STATS': {
      const { game, correct, today } = action;
      const prev = state.stats[game];
      const newStreak = correct ? prev.streak + 1 : 0;
      return {
        ...state,
        stats: {
          ...state.stats,
          [game]: {
            played: prev.played + 1,
            correct: prev.correct + (correct ? 1 : 0),
            streak: newStreak,
            bestStreak: Math.max(prev.bestStreak, newStreak),
            lastPlayed: today,
          },
        },
      };
    }
    case 'UPDATE_DAILY_STREAK': {
      const { today } = action;
      const { stats } = state;
      if (stats.lastPlayedDate === today) return state;
      const yesterday = getPreviousDay(today);
      let newDailyStreak = stats.dailyStreak;
      let newShields = stats.streakShieldsAvailable;
      let newShieldUsedToday = false;
      let newBannerSeen = stats.streakSavedBannerSeen;
      let showStreakCelebration = false;
      if (stats.lastPlayedDate === yesterday) {
        newDailyStreak = stats.dailyStreak + 1;
        showStreakCelebration = true;
      } else if (stats.streakShieldsAvailable > 0 && !stats.streakShieldUsedToday) {
        newShields = stats.streakShieldsAvailable - 1;
        newShieldUsedToday = true;
        newBannerSeen = false;
      } else {
        newDailyStreak = 1;
      }
      return {
        ...state,
        stats: {
          ...stats,
          dailyStreak: newDailyStreak,
          bestDailyStreak: Math.max(stats.bestDailyStreak, newDailyStreak),
          lastPlayedDate: today,
          totalDaysPlayed: stats.totalDaysPlayed + 1,
          streakShieldsAvailable: newShields,
          streakShieldUsedToday: newShieldUsedToday,
          streakSavedBannerSeen: newBannerSeen,
          showStreakCelebration,
        },
      };
    }
    case 'SET_SEEN':
      return { ...state, seen: { ...state.seen, [action.game]: action.seen } };
    case 'EARN_SHIELD':
      return {
        ...state,
        stats: {
          ...state.stats,
          streakShieldsAvailable: state.stats.streakShieldsAvailable + 1,
        },
      };
    case 'DISMISS_STREAK_SAVED_BANNER':
      if (state.stats.streakSavedBannerSeen) return state;
      return {
        ...state,
        stats: { ...state.stats, streakSavedBannerSeen: true },
      };
    case 'DISMISS_STREAK_CELEBRATION':
      if (!state.stats.showStreakCelebration) return state;
      return {
        ...state,
        stats: { ...state.stats, showStreakCelebration: false },
      };
    case 'ADD_FRIEND_INTERACTION':
      return { ...state, friendInteractions: [action.interaction, ...state.friendInteractions] };
    case 'SET_FRIEND_INTERACTIONS':
      return { ...state, friendInteractions: action.interactions };
    case 'REMOVE_FRIEND_INTERACTION':
      return {
        ...state,
        friendInteractions: state.friendInteractions.filter(i => i.id !== action.id),
      };
    case 'DISMISS_HELP_CARD':
      return {
        ...state,
        friendInteractions: state.friendInteractions.map(i =>
          i.token === action.token && (i.type === 'received_help' || i.type === 'challenge_accepted')
            ? { ...i, homeCardDismissed: true }
            : i,
        ),
      };
    case 'SET_ASKER_ANSWER':
      return {
        ...state,
        friendInteractions: state.friendInteractions.map(i =>
          i.token === action.token && i.type === 'received_help'
            ? { ...i, askerAnswer: action.askerAnswer }
            : i,
        ),
      };
    case 'MERGE_FROM_SERVER': {
      const { serverStats, serverSeen = {} } = action;
      const serverDate = serverStats.lastPlayedDate;
      const localDate = state.stats.lastPlayedDate;
      const serverWins = serverDate !== null && (localDate === null || serverDate >= localDate);
      const baseStats = serverWins ? serverStats : state.stats;
      const mergedStats = {
        ...baseStats,
        streakShieldsAvailable: Math.max(
          serverStats.streakShieldsAvailable ?? 0,
          state.stats.streakShieldsAvailable ?? 0,
        ),
      };
      const mergedSeen = { ...state.seen };
      (['lede', 'spread', 'sof', 'quip', 'wave'] as GameId[]).forEach(g => {
        const local = state.seen[g] ?? [];
        const remote = serverSeen[g] ?? [];
        mergedSeen[g] = [...new Set([...local, ...remote])];
      });
      return { ...state, stats: mergedStats, seen: mergedSeen };
    }
    default:
      return state;
  }
}
