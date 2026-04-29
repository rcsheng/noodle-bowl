import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { GameId } from '@/constants/data';
import { getTodayISODate } from '@/constants/utils';
import { db } from '@/lib/firebase';
import { readSeen, writeSeen } from '@/lib/seenRepo';
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
  removeFriendInteraction: (id: string) => void;
  dismissHelpCard: (token: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'daily_state_v9';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, isAnonymous } = useAuth();
  const uid = user?.uid ?? null;

  // Track which identity owns the current in-memory state so we can detect
  // mid-session uid changes (sign-out → sign-in as a different account) and
  // reset. The cache on disk is also tagged with ownerUid; mismatches are
  // discarded on load.
  const loadedForUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    if (loadedForUidRef.current === null) {
      loadedForUidRef.current = uid;
      AsyncStorage.getItem(STORAGE_KEY)
        .then(saved => {
          if (!saved) return;
          try {
            const parsed = JSON.parse(saved);
            if (parsed.ownerUid && parsed.ownerUid === uid) {
              dispatch({ type: 'LOAD', payload: parsed });
            }
            // Else: cache belongs to a different identity (or untagged legacy
            // blob) — discard. The Firestore merge effects below will populate
            // from server if this user has any data.
          } catch {}
        })
        .catch(() => {})
        .finally(() => setIsLoaded(true));
      return;
    }

    if (loadedForUidRef.current !== uid) {
      loadedForUidRef.current = uid;
      dispatch({ type: 'LOAD', payload: {} });
    }
  }, [uid]);

  useEffect(() => {
    if (!isLoaded || !uid) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ownerUid: uid,
        stats: state.stats,
        seen: state.seen,
        friendInteractions: state.friendInteractions,
      }),
    ).catch(() => {});
  }, [state, isLoaded, uid]);

  useEffect(() => {
    if (!isLoaded || isAnonymous || !uid) return;
    scheduleWrite('stats', state.stats, (s) => writeStats(uid, s), 1500);
  }, [state.stats, isLoaded, isAnonymous, uid]);

  useEffect(() => {
    if (!isLoaded || isAnonymous || !uid) return;
    scheduleWrite('seen', state.seen, (s) => writeSeen(uid, s), 1500);
  }, [state.seen, isLoaded, isAnonymous, uid]);

  useEffect(() => {
    if (!isLoaded || isAnonymous || !uid) return;
    Promise.all([readStats(uid).catch(() => null), readSeen(uid).catch(() => null)])
      .then(([serverStats, serverSeen]) => {
        if (serverStats || serverSeen) {
          dispatch({
            type: 'MERGE_FROM_SERVER',
            serverStats: serverStats ?? state.stats,
            serverSeen: serverSeen ?? undefined,
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isAnonymous, isLoaded]);

  // Keep a live ref to the latest interactions so the signed-in load effect
  // can read them without re-firing on every interaction change. Used to push
  // local-only interactions to Firestore when an anon user signs up.
  const interactionsRef = useRef<FriendInteraction[]>(state.friendInteractions);
  useEffect(() => {
    interactionsRef.current = state.friendInteractions;
  }, [state.friendInteractions]);

  useEffect(() => {
    if (!isLoaded || isAnonymous || !uid) return;
    getDocs(collection(db, 'users', uid, 'friendInteractions'))
      .then(snap => {
        const serverInteractions = snap.docs.map(d => d.data() as FriendInteraction);
        const serverIds = new Set(serverInteractions.map(i => i.id));

        // Anon→signup migration (AC7.12): any local interaction not yet in
        // Firestore (because the anon session never wrote there) is pushed up.
        const localOnly = interactionsRef.current.filter(i => !serverIds.has(i.id));
        localOnly.forEach(i => {
          setDoc(doc(db, 'users', uid, 'friendInteractions', i.id), i).catch(() => {});
        });

        // Merge: server wins on id collision, then sort newest-first.
        const merged = [...serverInteractions, ...localOnly].sort(
          (a, b) => Number(b.id) - Number(a.id),
        );
        dispatch({ type: 'SET_FRIEND_INTERACTIONS', interactions: merged });
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

  const removeFriendInteraction = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FRIEND_INTERACTION', id });
    if (!isAnonymous && uid) {
      deleteDoc(doc(db, 'users', uid, 'friendInteractions', id)).catch(() => {});
    }
  }, [isAnonymous, uid]);

  const dismissHelpCard = useCallback((token: string) => {
    dispatch({ type: 'DISMISS_HELP_CARD', token });
    if (!isAnonymous && uid) {
      const target = state.friendInteractions.find(
        i => i.token === token && (i.type === 'received_help' || i.type === 'challenge_accepted'),
      );
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
    <GameContext.Provider value={{ state, isLoaded, updateGameStats, setSeen, earnStreakShield, addFriendInteraction, removeFriendInteraction, dismissHelpCard }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
