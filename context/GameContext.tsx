import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { GameId } from '@/constants/data';

interface GameStats {
  played: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

interface AppState {
  stats: {
    totalPoints: number;
    wacky: GameStats;
    quip: GameStats;
    spread: GameStats;
    lede: GameStats;
    wave: GameStats;
    sof: GameStats;
  };
  seen: Record<GameId, number[]>;
}

interface GameContextType {
  state: AppState;
  isLoaded: boolean;
  updateGameStats: (game: GameId, correct: boolean, points: number) => void;
  setSeen: (game: GameId, seen: number[]) => void;
}

const defaultStats: GameStats = { played: 0, correct: 0, streak: 0, bestStreak: 0 };

const initialState: AppState = {
  stats: {
    totalPoints: 0,
    wacky: { ...defaultStats },
    quip: { ...defaultStats },
    spread: { ...defaultStats },
    lede: { ...defaultStats },
    wave: { ...defaultStats },
    sof: { ...defaultStats },
  },
  seen: { wacky: [], quip: [], spread: [], lede: [], wave: [], sof: [] },
};

type Action =
  | { type: 'LOAD'; payload: { stats?: Partial<AppState['stats']>; seen?: Partial<AppState['seen']> } }
  | { type: 'UPDATE_STATS'; game: GameId; correct: boolean; points: number }
  | { type: 'SET_SEEN'; game: GameId; seen: number[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD': {
      const { stats, seen } = action.payload;
      const mergedStats = { ...initialState.stats };
      if (stats) {
        mergedStats.totalPoints = stats.totalPoints ?? 0;
        (['wacky', 'quip', 'spread', 'lede', 'wave', 'sof'] as GameId[]).forEach(g => {
          if (stats[g]) mergedStats[g] = { ...defaultStats, ...stats[g] };
        });
      }
      const mergedSeen = { ...initialState.seen };
      if (seen) {
        (['wacky', 'quip', 'spread', 'lede', 'wave', 'sof'] as GameId[]).forEach(g => {
          if (seen[g]) mergedSeen[g] = seen[g]!;
        });
      }
      return { stats: mergedStats, seen: mergedSeen };
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
          },
        },
      };
    }
    case 'SET_SEEN':
      return { ...state, seen: { ...state.seen, [action.game]: action.seen } };
    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'daily_state_v7';

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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ stats: state.stats, seen: state.seen })).catch(() => {});
  }, [state, isLoaded]);

  const updateGameStats = useCallback((game: GameId, correct: boolean, points: number) => {
    dispatch({ type: 'UPDATE_STATS', game, correct, points });
  }, []);

  const setSeen = useCallback((game: GameId, seen: number[]) => {
    dispatch({ type: 'SET_SEEN', game, seen });
  }, []);

  return (
    <GameContext.Provider value={{ state, isLoaded, updateGameStats, setSeen }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
