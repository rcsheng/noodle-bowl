import React, { createContext, useContext, useEffect, useState } from 'react';

import type { ContentBanks, ContentVersion } from '@/packages/shared/contentTypes';

import { cache, findActive, getCached, getFallback } from '../lib/contentRepo';
import { logger } from '../lib/logger';

interface ContentContextValue {
  banks: ContentBanks;
  versionId: string;
  isLoading: boolean;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const fallback = getFallback();
  const [version, setVersion] = useState<ContentVersion>(fallback);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fast start: serve cached version immediately
      const cached = await getCached();
      if (cached && !cancelled) {
        setVersion(cached);
        setIsLoading(false);
      }

      // Background refresh from Firestore
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
  }, []);

  return (
    <ContentContext.Provider value={{ banks: version.banks, versionId: version.id, isLoading }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}
