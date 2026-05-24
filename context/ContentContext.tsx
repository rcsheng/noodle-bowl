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
 * Used to decide whether the cache can unblock game screens while auth is still
 * loading (before we can reach Firestore). When auth is already resolved, we
 * always wait for a Firestore fetch to confirm the banks are complete.
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
        // Always update the displayed version from cache (fast, good UX), but do NOT
        // set isLoading=false from cache alone when auth is resolved — we're about
        // to do a Firestore fetch that may have more-complete data than the cache
        // (e.g. incremental weekly seeding). Game screens must wait for Firestore
        // confirmation so that challenge/help indices are always valid.
        //
        // The one exception: if auth is still loading we cannot reach Firestore yet,
        // and a current-week cache is good enough to unblock game screens immediately.
        // The second effect run (after auth resolves) will always do a Firestore fetch
        // and update the version in the background.
        setVersion(cached);
        if (authLoading && isCachedForActiveWeek(cached)) {
          setIsLoading(false);
        }
      }

      // Firestore read requires auth. If auth is still resolving, wait — do not
      // mark loading as done yet. Setting isLoading=false too early (with only
      // bundled fallback content) causes help/challenge game screens to fail
      // because question indices from the live bank are out of range in the
      // tiny bundled bank.
      if (authLoading) return;

      // Auth resolved but no user (e.g. sign-out) — can't read Firestore.
      // Fall back to cache or bundled content and unblock game screens.
      if (!isAuthed) {
        if (!cancelled) setIsLoading(false);
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
