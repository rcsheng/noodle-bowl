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
  bonusPointsEarned?: number;
  homeCardDismissed?: boolean;
}

interface GameStats {
  played: number;
  correct: number;
  streak: number;
  bestStreak: number;
  bestScore: number;
  lastPlayed?: string;
  lastPoints?: number;
}

interface AppState {
  stats: {
    totalPoints: number;
    dailyStreak: number;
    bestDailyStreak: number;
    lastPlayedDate: string | null;
    totalDaysPlayed: number;
    streakShieldsAvailable: number;
    streakShieldUsedToday: boolean;
    lede: GameStats;
    spread: GameStats;
    sof: GameStats;
    quip: GameStats;
    wave: GameStats;
  };
  seen: Record<GameId, number[]>;
  friendInteractions: FriendInteraction[];
}

export type { AppState, GameStats };

const defaultGameStats: GameStats = { played: 0, correct: 0, streak: 0, bestStreak: 0, bestScore: 0 };

export const initialState: AppState = {
  stats: {
    totalPoints: 0,
    dailyStreak: 0,
    bestDailyStreak: 0,
    lastPlayedDate: null,
    totalDaysPlayed: 0,
    streakShieldsAvailable: 0,
    streakShieldUsedToday: false,
    lede: { ...defaultGameStats },
    spread: { ...defaultGameStats },
    sof: { ...defaultGameStats },
    quip: { ...defaultGameStats },
    wave: { ...defaultGameStats },
  },
  seen: { quip: [], spread: [], lede: [], wave: [], sof: [] },
  friendInteractions: [],
};

export function getPreviousDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type Action =
  | { type: 'LOAD'; payload: { stats?: Partial<AppState['stats']>; seen?: Partial<AppState['seen']>; friendInteractions?: FriendInteraction[] } }
  | { type: 'UPDATE_STATS'; game: GameId; correct: boolean; points: number; today: string }
  | { type: 'UPDATE_DAILY_STREAK'; today: string }
  | { type: 'SET_SEEN'; game: GameId; seen: number[] }
  | { type: 'EARN_SHIELD' }
  | { type: 'ADD_FRIEND_INTERACTION'; interaction: FriendInteraction }
  | { type: 'SET_FRIEND_INTERACTIONS'; interactions: FriendInteraction[] }
  | { type: 'DISMISS_HELP_CARD'; token: string }
  | { type: 'MERGE_FROM_SERVER'; serverStats: AppState['stats']; serverSeen?: Partial<AppState['seen']> };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD': {
      const { stats, seen, friendInteractions } = action.payload;
      const mergedStats = { ...initialState.stats };
      if (stats) {
        mergedStats.totalPoints = stats.totalPoints ?? 0;
        mergedStats.dailyStreak = stats.dailyStreak ?? 0;
        mergedStats.bestDailyStreak = stats.bestDailyStreak ?? 0;
        mergedStats.lastPlayedDate = stats.lastPlayedDate ?? null;
        mergedStats.totalDaysPlayed = stats.totalDaysPlayed ?? 0;
        mergedStats.streakShieldsAvailable = stats.streakShieldsAvailable ?? 0;
        mergedStats.streakShieldUsedToday = stats.streakShieldUsedToday ?? false;
        (['lede', 'spread', 'sof', 'quip', 'wave'] as GameId[]).forEach(g => {
          const saved = stats[g];
          if (saved) mergedStats[g] = { ...defaultGameStats, ...(saved as GameStats) };
        });
      }
      const mergedSeen = { ...initialState.seen };
      if (seen) {
        (['quip', 'spread', 'lede', 'wave', 'sof'] as GameId[]).forEach(g => {
          if (seen[g]) mergedSeen[g] = seen[g]!;
        });
      }
      return {
        stats: mergedStats,
        seen: mergedSeen,
        friendInteractions: friendInteractions ?? [],
      };
    }
    case 'UPDATE_STATS': {
      const { game, correct, points, today } = action;
      const prev = state.stats[game];
      const newStreak = correct ? prev.streak + 1 : 0;
      return {
        ...state,
        stats: {
          ...state.stats,
          totalPoints: state.stats.totalPoints + points,
          [game]: {
            played: prev.played + 1,
            correct: prev.correct + (correct ? 1 : 0),
            streak: newStreak,
            bestStreak: Math.max(prev.bestStreak, newStreak),
            bestScore: Math.max(prev.bestScore, points),
            lastPlayed: today,
            lastPoints: points,
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
      let newShieldUsedToday = stats.streakShieldUsedToday;
      if (stats.lastPlayedDate === yesterday) {
        newDailyStreak = stats.dailyStreak + 1;
      } else if (stats.streakShieldsAvailable > 0 && !stats.streakShieldUsedToday) {
        newShields = stats.streakShieldsAvailable - 1;
        newShieldUsedToday = true;
      } else {
        newDailyStreak = stats.lastPlayedDate === null ? 1 : 1;
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
          streakShieldsAvailable: Math.min(state.stats.streakShieldsAvailable + 1, 3),
        },
      };
    case 'ADD_FRIEND_INTERACTION':
      return { ...state, friendInteractions: [action.interaction, ...state.friendInteractions] };
    case 'SET_FRIEND_INTERACTIONS':
      return { ...state, friendInteractions: action.interactions };
    case 'DISMISS_HELP_CARD':
      return {
        ...state,
        friendInteractions: state.friendInteractions.map(i =>
          i.token === action.token && i.type === 'received_help'
            ? { ...i, homeCardDismissed: true }
            : i,
        ),
      };
    case 'MERGE_FROM_SERVER': {
      const { serverStats, serverSeen = {} } = action;
      const serverDate = serverStats.lastPlayedDate;
      const localDate = state.stats.lastPlayedDate;
      const serverWins = serverDate !== null && (localDate === null || serverDate >= localDate);
      const mergedStats = serverWins ? serverStats : state.stats;
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
