import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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

const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { findForWeek, getCached } = require('@/lib/contentRepo') as {
  findForWeek: jest.Mock;
  getCached: jest.Mock;
};

function Probe() {
  const { versionId } = useContent();
  return <Text testID="version">{versionId}</Text>;
}

describe('ContentContext auth gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCached.mockResolvedValue(null);
    findForWeek.mockResolvedValue(null);
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
