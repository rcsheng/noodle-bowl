import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { ContentBanks, ContentVersion } from '@/packages/shared/contentTypes';

import { useAuth } from '@/context/AuthContext';
import { cache, findForWeek, getCached, getFallback, mergeWithFallback } from '../lib/contentRepo';
import { computeActiveWeek } from '../lib/contentWeek';
import { logger } from '../lib/logger';

interface ContentContextValue {
  banks: ContentBanks;
  versionId: string;
  contentWeek: string; // active ISO week being served, e.g. "2026-W20"
  isLoading: boolean;
  reload: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

/**
 * Returns true when the cached version is for the current active content week.
 * If it is, we can immediately mark loading as done without waiting for Firestore.
 */
function isCachedForActiveWeek(version: ContentVersion): boolean {
  return version.contentWeek !== '' && version.contentWeek === computeActiveWeek();
}

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const fallback = getFallback();
  const [version, setVersion] = useState<ContentVersion>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const isAuthed = !!user;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = await getCached();

      if (cached && !cancelled) {
        setVersion(cached);
        // Only mark loaded immediately if the cache is already for the active week —
        // otherwise keep isLoading=true so game screens wait for Firestore to
        // deliver current content before picking questions.
        if (isCachedForActiveWeek(cached)) {
          setIsLoading(false);
        }
      }

      // Firestore read requires auth. Skip until a user is present.
      if (authLoading || !isAuthed) {
        if (!cached && !cancelled) setIsLoading(false);
        return;
      }

      try {
        const activeWeek = computeActiveWeek();
        const active = await findForWeek(activeWeek);
        if (active && !cancelled) {
          const merged = mergeWithFallback(active);
          setVersion(merged);
          setIsLoading(false);
          await cache(merged);
        } else if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        logger.warn('ContentContext: Firestore fetch failed, using cached/fallback', err);
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [authLoading, isAuthed]);

  const reload = useCallback(async () => {
    if (!isAuthed) return;
    setIsLoading(true);
    try {
      const activeWeek = computeActiveWeek();
      const active = await findForWeek(activeWeek);
      if (active) {
        const merged = mergeWithFallback(active);
        setVersion(merged);
        await cache(merged);
      }
    } catch (err) {
      logger.warn('ContentContext: reload failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthed]);

  return (
    <ContentContext.Provider value={{
      banks: version.banks,
      versionId: version.id,
      contentWeek: version.contentWeek,
      isLoading,
      reload,
    }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}
