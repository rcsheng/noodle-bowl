import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Action, AppState, FriendInteraction, initialState, reducer } from './gameReducer';

export type { FriendInteraction };

interface GameContextType {
  state: AppState;
  isLoaded: boolean;
  updateGameStats: (game: GameId, correct: boolean, points: number) => void;
  setSeen: (game: GameId, seen: number[]) => void;
  earnStreakShield: () => void;
  addFriendInteraction: (interaction: Omit<FriendInteraction, 'id' | 'date'>) => void;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'daily_state_v9';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, isAnonymous } = useAuth();
  const uid = user?.uid ?? null;

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

  useEffect(() => {
    if (!isLoaded || isAnonymous || !uid) return;
    getDocs(collection(db, 'users', uid, 'friendInteractions'))
      .then(snap => {
        const interactions = snap.docs
          .map(d => d.data() as FriendInteraction)
          .sort((a, b) => Number(b.id) - Number(a.id));
        dispatch({ type: 'SET_FRIEND_INTERACTIONS', interactions });
      })
      .catch(() => {});
  }, [uid, isAnonymous, isLoaded]);

  const updateGameStats = useCallback((game: GameId, correct: boolean, points: number) => {
    const today = getTodayISODate();
    dispatch({ type: 'UPDATE_STATS', game, correct, points, today });
    dispatch({ type: 'UPDATE_DAILY_STREAK', today });
  }, []);

  const setSeen = useCallback((game: GameId, seen: number[]) => {
    dispatch({ type: 'SET_SEEN', game, seen });
  }, []);

  const earnStreakShield = useCallback(() => {
    dispatch({ type: 'EARN_SHIELD' });
  }, []);

  const addFriendInteraction = useCallback((interaction: Omit<FriendInteraction, 'id' | 'date'>) => {
    const id = Date.now().toString();
    const date = getTodayISODate();
    const full: FriendInteraction = { ...interaction, id, date };
    dispatch({ type: 'ADD_FRIEND_INTERACTION', interaction: full });
    if (!isAnonymous && uid) {
      setDoc(doc(db, 'users', uid, 'friendInteractions', id), full).catch(() => {});
    }
  }, [isAnonymous, uid]);

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
