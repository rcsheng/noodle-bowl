import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';

export interface FriendInteraction {
  id: string;
  type: 'received_help' | 'gave_help' | 'sent_challenge' | 'challenge_accepted' | 'received_challenge';
  friendName: string;
  gameId: GameId;
  date: string; // YYYY-MM-DD
  shieldEarned: boolean;
  senderPrediction?: string;
  friendAnswer?: string;
}

interface GameStats {
  played: number;
  correct: number;
  streak: number;
  bestStreak: number;
  bestScore: number;
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
    wacky: GameStats;
    quip: GameStats;
    wave: GameStats;
  };
  seen: Record<GameId, number[]>;
  friendInteractions: FriendInteraction[];
}

interface GameContextType {
  state: AppState;
  isLoaded: boolean;
  updateGameStats: (game: GameId, correct: boolean, points: number) => void;
  setSeen: (game: GameId, seen: number[]) => void;
  earnStreakShield: () => void;
  addFriendInteraction: (interaction: Omit<FriendInteraction, 'id' | 'date'>) => void;
}

const defaultGameStats: GameStats = { played: 0, correct: 0, streak: 0, bestStreak: 0, bestScore: 0 };

const initialState: AppState = {
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
    wacky: { ...defaultGameStats },
    quip: { ...defaultGameStats },
    wave: { ...defaultGameStats },
  },
  seen: { wacky: [], quip: [], spread: [], lede: [], wave: [], sof: [] },
  friendInteractions: [],
};

function getPreviousDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Action =
  | { type: 'LOAD'; payload: { stats?: Partial<AppState['stats']>; seen?: Partial<AppState['seen']>; friendInteractions?: FriendInteraction[] } }
  | { type: 'UPDATE_STATS'; game: GameId; correct: boolean; points: number }
  | { type: 'UPDATE_DAILY_STREAK'; today: string }
  | { type: 'SET_SEEN'; game: GameId; seen: number[] }
  | { type: 'EARN_SHIELD' }
  | { type: 'ADD_FRIEND_INTERACTION'; interaction: FriendInteraction };

function reducer(state: AppState, action: Action): AppState {
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
        (['lede', 'spread', 'sof', 'wacky', 'quip', 'wave'] as GameId[]).forEach(g => {
          const saved = stats[g];
          if (saved) mergedStats[g] = { ...defaultGameStats, ...(saved as GameStats) };
        });
      }
      const mergedSeen = { ...initialState.seen };
      if (seen) {
        (['wacky', 'quip', 'spread', 'lede', 'wave', 'sof'] as GameId[]).forEach(g => {
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
      const { game, correct, points } = action;
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
    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'daily_state_v8';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved) {
          const parsed = JSON.parse(saved);
          dispatch({ type: 'LOAD', payload: parsed });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stats: state.stats, seen: state.seen, friendInteractions: state.friendInteractions })
    ).catch(() => {});
  }, [state, isLoaded]);

  const updateGameStats = useCallback((game: GameId, correct: boolean, points: number) => {
    dispatch({ type: 'UPDATE_STATS', game, correct, points });
    dispatch({ type: 'UPDATE_DAILY_STREAK', today: getTodayISODate() });
  }, []);

  const setSeen = useCallback((game: GameId, seen: number[]) => {
    dispatch({ type: 'SET_SEEN', game, seen });
  }, []);

  const earnStreakShield = useCallback(() => {
    dispatch({ type: 'EARN_SHIELD' });
  }, []);

  const addFriendInteraction = useCallback((interaction: Omit<FriendInteraction, 'id' | 'date'>) => {
    dispatch({
      type: 'ADD_FRIEND_INTERACTION',
      interaction: { ...interaction, id: Date.now().toString(), date: getTodayISODate() },
    });
  }, []);

  return (
    <GameContext.Provider value={{ state, isLoaded, updateGameStats, setSeen, earnStreakShield, addFriendInteraction }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
