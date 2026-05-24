import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ContentProvider, useContent } from '../ContentContext';

jest.mock('@/lib/contentRepo', () => ({
  findForWeek: jest.fn(),
  getCached: jest.fn(),
  cache: jest.fn(),
  getFallback: jest.fn(() => ({
    id: 'bundled',
    contentWeek: '',
    createdAt: new Date(0).toISOString(),
    banks: { lede: [], spread: [], sof: [], quip: [], wave: [] },
  })),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock computeActiveWeek so we can test the "cached for active week" path.
jest.mock('@/lib/contentWeek', () => ({
  computeActiveWeek: jest.fn(() => '2026-W20'),
}));

const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { findForWeek, getCached, cache } = require('@/lib/contentRepo') as {
  findForWeek: jest.Mock;
  getCached: jest.Mock;
  cache: jest.Mock;
};

function Probe() {
  const { versionId } = useContent();
  return <Text testID="version">{versionId}</Text>;
}

// Minimal ContentVersion for the current active week (used in multiple tests).
const ACTIVE_WEEK_CACHE = {
  id: 'cached-w20',
  contentWeek: '2026-W20',
  createdAt: new Date(0).toISOString(),
  banks: { lede: [], spread: [], sof: [], quip: [], wave: [] },
};

describe('ContentContext auth gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCached.mockResolvedValue(null);
    findForWeek.mockResolvedValue(null);
    cache.mockResolvedValue(undefined);
  });

  test('does NOT call findForWeek while auth is still loading', async () => {
    useAuth.mockReturnValue({ user: null, isLoading: true });

    render(
      <ContentProvider>
        <Probe />
      </ContentProvider>,
    );

    // Flush microtasks so any synchronous-effect-fired fetch would have started.
    await waitFor(() => {
      expect(getCached).toHaveBeenCalled();
    });

    expect(findForWeek).not.toHaveBeenCalled();
  });

  test('calls findForWeek once auth resolves with a user', async () => {
    useAuth.mockReturnValue({ user: { uid: 'u1' }, isLoading: false });

    render(
      <ContentProvider>
        <Probe />
      </ContentProvider>,
    );

    await waitFor(() => {
      expect(findForWeek).toHaveBeenCalledTimes(1);
    });
  });

  test('does NOT call findForWeek when auth resolves with no user (sign-in failure)', async () => {
    useAuth.mockReturnValue({ user: null, isLoading: false });

    render(
      <ContentProvider>
        <Probe />
      </ContentProvider>,
    );

    await waitFor(() => {
      expect(getCached).toHaveBeenCalled();
    });

    expect(findForWeek).not.toHaveBeenCalled();
  });
});

describe('ContentContext — stale-cache safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.mockResolvedValue(undefined);
  });

  test('still calls findForWeek when a current-week cache exists and auth is resolved', async () => {
    // Cache has W20 data but auth is already resolved — Firestore must still be
    // queried so that a stale partial cache (e.g. fewer items than current Firestore)
    // does not permanently block challenge/help question indices.
    getCached.mockResolvedValue(ACTIVE_WEEK_CACHE);
    findForWeek.mockResolvedValue(null);
    useAuth.mockReturnValue({ user: { uid: 'u1' }, isLoading: false });

    render(
      <ContentProvider>
        <Probe />
      </ContentProvider>,
    );

    await waitFor(() => {
      expect(findForWeek).toHaveBeenCalledTimes(1);
    });
  });

  test('does NOT call findForWeek when current-week cache exists but auth is still loading', async () => {
    // Auth is still loading — we cannot reach Firestore yet. The cache is used to
    // unblock game screens immediately; Firestore will be fetched on the next run.
    getCached.mockResolvedValue(ACTIVE_WEEK_CACHE);
    findForWeek.mockResolvedValue(null);
    useAuth.mockReturnValue({ user: null, isLoading: true });

    render(
      <ContentProvider>
        <Probe />
      </ContentProvider>,
    );

    await waitFor(() => {
      expect(getCached).toHaveBeenCalled();
    });

    expect(findForWeek).not.toHaveBeenCalled();
  });

  test('isLoading becomes false after Firestore fetch completes even with cached data', async () => {
    const fireFetch = { resolve: (_: unknown) => {} } as { resolve: (v: unknown) => void };
    const pendingFirestore = new Promise((res) => { fireFetch.resolve = res; });

    getCached.mockResolvedValue(ACTIVE_WEEK_CACHE);
    findForWeek.mockReturnValue(pendingFirestore);
    useAuth.mockReturnValue({ user: { uid: 'u1' }, isLoading: false });

    let isLoading = true;
    function LoadProbe() {
      const ctx = useContent();
      isLoading = ctx.isLoading;
      return <Text testID="loading">{String(ctx.isLoading)}</Text>;
    }

    render(
      <ContentProvider>
        <LoadProbe />
      </ContentProvider>,
    );

    // Wait for getCached to be called (cache loaded, Firestore still pending).
    await waitFor(() => expect(getCached).toHaveBeenCalled());
    // isLoading should still be true — Firestore hasn't finished.
    expect(isLoading).toBe(true);

    // Firestore resolves.
    await act(async () => { fireFetch.resolve(null); });
    // isLoading should now be false.
    expect(isLoading).toBe(false);
  });
});
