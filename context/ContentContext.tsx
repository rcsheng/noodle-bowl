import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { ContentBanks, ContentVersion } from '@/packages/shared/contentTypes';

import { useAuth } from '@/context/AuthContext';
import { cache, findActive, getCached, getFallback } from '../lib/contentRepo';
import { logger } from '../lib/logger';

interface ContentContextValue {
  banks: ContentBanks;
  versionId: string;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

function isCachedToday(version: ContentVersion): boolean {
  const d = new Date(version.createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
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
        // Only mark loaded immediately if the cache is already from today —
        // otherwise keep isLoading=true so game screens wait for Firestore to
        // deliver today's content before picking questions.
        if (isCachedToday(cached)) {
          setIsLoading(false);
        }
      }

      // Firestore read requires auth. Skip until a user is present.
      if (authLoading || !isAuthed) {
        if (!cached && !cancelled) setIsLoading(false);
        return;
      }

      try {
        const active = await findActive();
        if (active && !cancelled) {
          setVersion(active);
          setIsLoading(false);
          await cache(active);
        } else if (!cached && !cancelled) {
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
    try {
      const active = await findActive();
      if (active) {
        setVersion(active);
        await cache(active);
      }
    } catch (err) {
      logger.warn('ContentContext: reload failed', err);
    }
  }, [isAuthed]);

  return (
    <ContentContext.Provider value={{ banks: version.banks, versionId: version.id, isLoading, reload }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}
