import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';
import { db } from '@/lib/firebase';
import { readStats, writeStats } from '@/lib/statsRepo';
import { scheduleWrite } from '@/lib/syncQueue';
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
  dismissHelpCard: (token: string) => void;
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
    scheduleWrite('stats', state.stats, (s) => writeStats(uid, s), 1500);
  }, [state.stats, isLoaded, isAnonymous, uid]);

  useEffect(() => {
    if (!isLoaded || isAnonymous || !uid) return;
    readStats(uid)
      .then(serverStats => {
        if (serverStats) dispatch({ type: 'MERGE_FROM_SERVER', serverStats });
      })
      .catch(() => {});
  }, [uid, isAnonymous, isLoaded]);

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

  const dismissHelpCard = useCallback((token: string) => {
    dispatch({ type: 'DISMISS_HELP_CARD', token });
    if (!isAnonymous && uid) {
      const target = state.friendInteractions.find(i => i.token === token && i.type === 'received_help');
      if (target) {
        setDoc(
          doc(db, 'users', uid, 'friendInteractions', target.id),
          { ...target, homeCardDismissed: true },
        ).catch(() => {});
      }
    }
  }, [isAnonymous, uid, state.friendInteractions]);

  // Always-on subscription to outstanding sent_help / sent_challenge tokens so
  // the home card and Friends feed stay in sync regardless of which tab is open.
  const unsubRefs = useRef<Map<string, () => void>>(new Map());
  useEffect(() => {
    if (!isLoaded || isAnonymous) return;

    const interactions = state.friendInteractions;
    const resolvedChallenge = new Set(
      interactions.filter(i => i.type === 'challenge_accepted' && i.token).map(i => i.token!),
    );
    const resolvedHelp = new Set(
      interactions.filter(i => i.type === 'received_help' && i.token).map(i => i.token!),
    );

    interactions
      .filter(i => i.type === 'sent_challenge' && i.token)
      .forEach(sent => {
        const token = sent.token!;
        if (resolvedChallenge.has(token) || unsubRefs.current.has(token)) return;
        const unsub = onSnapshot(doc(db, 'challenges', token), snap => {
          const data = snap.data();
          if (!data?.resolvedAt) return;
          addFriendInteraction({
            type: 'challenge_accepted',
            friendName: sent.friendName,
            gameId: data.gameId as GameId,
            questionIndex: data.questionIndex as number,
            shieldEarned: false,
            token,
            senderPrediction: sent.senderPrediction,
            friendAnswer: data.friendAnswer as string,
          });
          unsubRefs.current.get(token)?.();
          unsubRefs.current.delete(token);
        });
        unsubRefs.current.set(token, unsub);
      });

    interactions
      .filter(i => i.type === 'sent_help' && i.token)
      .forEach(sent => {
        const token = sent.token!;
        if (resolvedHelp.has(token) || unsubRefs.current.has(token)) return;
        const unsub = onSnapshot(doc(db, 'helpRequests', token), snap => {
          const data = snap.data();
          if (!data?.resolvedAt) return;
          addFriendInteraction({
            type: 'received_help',
            friendName: 'A Friend',
            gameId: data.gameId as GameId,
            questionIndex: data.questionIndex as number,
            shieldEarned: false,
            token,
            friendAnswer: data.helperAnswer as string,
          });
          unsubRefs.current.get(token)?.();
          unsubRefs.current.delete(token);
        });
        unsubRefs.current.set(token, unsub);
      });
  }, [state.friendInteractions, isAnonymous, isLoaded, addFriendInteraction]);

  // Cleanup on unmount or auth change.
  useEffect(() => {
    return () => {
      unsubRefs.current.forEach(unsub => unsub());
      unsubRefs.current.clear();
    };
  }, [uid]);

  return (
    <GameContext.Provider value={{ state, isLoaded, updateGameStats, setSeen, earnStreakShield, addFriendInteraction, dismissHelpCard }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
