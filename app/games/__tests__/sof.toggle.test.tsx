import React from 'react';
import { act, render } from '@testing-library/react-native';

// ── mock context hooks and side-effect libs ────────────────────────────────
jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/context/ContentContext', () => ({ useContent: jest.fn() }));
jest.mock('@/context/GameContext', () => ({ useGame: jest.fn() }));
jest.mock('@/lib/authGuard', () => ({
  useAuthGate: () => ({
    requireAuth: (f: () => void) => f(),
    authGateVisible: false,
    dismissAuthGate: jest.fn(),
  }),
}));
jest.mock('@/lib/challengeApi', () => ({
  createChallenge: jest.fn(),
  respondToChallenge: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/helpApi', () => ({
  createHelp: jest.fn(),
  respondToHelp: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/pushTokens', () => ({ getCachedPushToken: jest.fn().mockReturnValue(null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
}));

// ── module refs (resolved after hoisting) ─────────────────────────────────
const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { useContent } = require('@/context/ContentContext') as { useContent: jest.Mock };
const { useGame } = require('@/context/GameContext') as { useGame: jest.Mock };
// useLocalSearchParams is jest.fn() from jest.setup.ts (not a plain function)
const { useLocalSearchParams } = require('expo-router') as { useLocalSearchParams: jest.Mock };

import { SofItem } from '@/constants/data';
import { initialState } from '@/context/gameReducer';
import SofScreen from '../sof';

// ── test data ──────────────────────────────────────────────────────────────

const makeQuestion = (weirdAndTrue: boolean): SofItem => ({
  topic: weirdAndTrue ? 'Weird Topic' : 'Standard Topic',
  intro: 'Test intro',
  weirdAndTrue,
  claims: [
    { text: 'Claim A', isScience: true, explanation: 'Exp A', source: null },
    { text: 'Claim B', isScience: false, explanation: 'Exp B', source: null },
    { text: 'Claim C', isScience: true, explanation: 'Exp C', source: null },
  ],
});

// bank[0] = standard, bank[1] = weird
const SOF_BANK: SofItem[] = [makeQuestion(false), makeQuestion(true)];

function defaultGameState() {
  return {
    state: initialState,
    isLoaded: true,
    updateGameStats: jest.fn(),
    setSeen: jest.fn(),
    addFriendInteraction: jest.fn(),
    earnStreakShield: jest.fn(),
    removeFriendInteraction: jest.fn(),
    dismissHelpCard: jest.fn(),
    dismissStreakSavedBanner: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useLocalSearchParams.mockReturnValue({});
  useAuth.mockReturnValue({ user: null, isAnonymous: true, displayName: null });
  useContent.mockReturnValue({
    banks: { sof: SOF_BANK, lede: [], spread: [], wave: [], quip: [] },
    isLoaded: true,
  });
  useGame.mockReturnValue(defaultGameState());
});

// ── helpers ────────────────────────────────────────────────────────────────

function flatStyle(styleArray: unknown): Record<string, unknown> {
  if (!Array.isArray(styleArray)) return (styleArray as Record<string, unknown>) ?? {};
  return styleArray.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...(s ?? {}) }), {});
}

// ── toggle reflects weirdAndTrue ───────────────────────────────────────────

describe('SoF toggle — weirdMode synced to question', () => {
  it('Standard button is active by default in normal play mode', async () => {
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});

    const standardStyle = flatStyle(getByTestId('sof-toggle-standard').props.style);
    const weirdStyle = flatStyle(getByTestId('sof-toggle-weird').props.style);

    // Active button has ink background; inactive has paper background
    expect(standardStyle.backgroundColor).not.toBe(weirdStyle.backgroundColor);
    // Specifically: standard is active (darker bg), weird is inactive (lighter bg)
    expect(standardStyle.backgroundColor).toBeTruthy();
    expect(weirdStyle.backgroundColor).toBeTruthy();
    // Standard should have the active (ink) color, weird the inactive (paper) color
    expect(standardStyle.backgroundColor).not.toBe('#e8eef3'); // C.paper = inactive
  });

  it('Weird & True button is active when challenge question has weirdAndTrue=true', async () => {
    useLocalSearchParams.mockReturnValue({
      challengeToken: 'tok',
      challengeQuestionIndex: '1', // index 1 = weirdAndTrue
      challengeSenderName: 'Bob',
    });

    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});

    const standardStyle = flatStyle(getByTestId('sof-toggle-standard').props.style);
    const weirdStyle = flatStyle(getByTestId('sof-toggle-weird').props.style);

    // Weird should now have the active (ink) background; standard the inactive (paper) background
    expect(weirdStyle.backgroundColor).not.toBe('#e8eef3'); // not inactive paper
    expect(standardStyle.backgroundColor).toBe('#e8eef3');  // inactive paper
  });

  it('Weird & True button is active when help question has weirdAndTrue=true', async () => {
    useLocalSearchParams.mockReturnValue({
      helpToken: 'help-tok',
      helpQuestionIndex: '1',
      helpAskerName: 'Alice',
    });

    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});

    const standardStyle = flatStyle(getByTestId('sof-toggle-standard').props.style);
    const weirdStyle = flatStyle(getByTestId('sof-toggle-weird').props.style);

    expect(weirdStyle.backgroundColor).not.toBe('#e8eef3');
    expect(standardStyle.backgroundColor).toBe('#e8eef3');
  });
});

// ── toggle disabled in challenge / help mode ───────────────────────────────

describe('SoF toggle — disabled in challenge/help mode', () => {
  it('disables both toggle buttons in challenge mode', async () => {
    useLocalSearchParams.mockReturnValue({
      challengeToken: 'tok',
      challengeQuestionIndex: '0',
      challengeSenderName: 'Bob',
    });

    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});

    expect(getByTestId('sof-toggle-standard')).toBeDisabled();
    expect(getByTestId('sof-toggle-weird')).toBeDisabled();
  });

  it('disables both toggle buttons in help mode', async () => {
    useLocalSearchParams.mockReturnValue({
      helpToken: 'help-tok',
      helpQuestionIndex: '0',
      helpAskerName: 'Alice',
    });

    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});

    expect(getByTestId('sof-toggle-standard')).toBeDisabled();
    expect(getByTestId('sof-toggle-weird')).toBeDisabled();
  });

  it('does not disable toggle buttons in normal play mode', async () => {
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});

    expect(getByTestId('sof-toggle-standard')).not.toBeDisabled();
    expect(getByTestId('sof-toggle-weird')).not.toBeDisabled();
  });
});
