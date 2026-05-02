import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import type { SlurpRunState, SlurpAction } from '@/packages/shared/slurp';

const DEBOUNCE_MS = 1500;
import { useAuth } from '@/context/AuthContext';
import { slurpReducer } from '@/context/slurpReducer';

const RUN_KEY = 'slurp_run_v1';
const META_KEY = 'slurp_meta_v1';

export interface SlurpMeta {
  bestScore: number;
  totalRuns: number;
  wins: number;
}

const defaultMeta: SlurpMeta = { bestScore: 0, totalRuns: 0, wins: 0 };

interface SlurpContextType {
  runState: SlurpRunState | null;
  meta: SlurpMeta;
  isLoaded: boolean;
  dispatch: React.Dispatch<SlurpAction>;
  recordRunEnd: (finalScore: number | null, won: boolean) => void;
}

const SlurpContext = createContext<SlurpContextType | null>(null);

export function SlurpProvider({ children }: { children: React.ReactNode }) {
  const [runState, dispatch] = useReducer(slurpReducer, null);
  const [meta, setMeta] = useState<SlurpMeta>(defaultMeta);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const loadedForUidRef = useRef<string | null>(null);

  // Load persisted run state and meta on uid change
  useEffect(() => {
    if (!uid) return;

    if (loadedForUidRef.current === null) {
      loadedForUidRef.current = uid;

      Promise.all([
        AsyncStorage.getItem(RUN_KEY).catch(() => null),
        AsyncStorage.getItem(META_KEY).catch(() => null),
      ]).then(([savedRun, savedMeta]) => {
        if (savedRun) {
          try {
            const parsed = JSON.parse(savedRun) as SlurpRunState;
            if (parsed.ownerUid === uid && parsed.phase !== 'over') {
              dispatch({ type: 'LOAD_STATE', state: parsed });
            }
          } catch {}
        }
        if (savedMeta) {
          try {
            setMeta(JSON.parse(savedMeta) as SlurpMeta);
          } catch {}
        }
      }).finally(() => setIsLoaded(true));
      return;
    }

    if (loadedForUidRef.current !== uid) {
      loadedForUidRef.current = uid;
      dispatch({ type: 'ABANDON_RUN' });
    }
  }, [uid]);

  // Persist run state on every change, debounced 1500ms
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoaded || !uid) return;
    if (!runState || runState.phase === 'over') {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      AsyncStorage.removeItem(RUN_KEY).catch(() => {});
      return;
    }
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(RUN_KEY, JSON.stringify(runState)).catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [runState, isLoaded, uid]);

  const recordRunEnd = useCallback((finalScore: number | null, won: boolean) => {
    setMeta(prev => {
      const next: SlurpMeta = {
        bestScore: finalScore != null ? Math.max(prev.bestScore, finalScore) : prev.bestScore,
        totalRuns: prev.totalRuns + 1,
        wins: won ? prev.wins + 1 : prev.wins,
      };
      AsyncStorage.setItem(META_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SlurpContext.Provider value={{ runState, meta, isLoaded, dispatch, recordRunEnd }}>
      {children}
    </SlurpContext.Provider>
  );
}

export function useSlurp(): SlurpContextType {
  const ctx = useContext(SlurpContext);
  if (!ctx) throw new Error('useSlurp must be used inside SlurpProvider');
  return ctx;
}
