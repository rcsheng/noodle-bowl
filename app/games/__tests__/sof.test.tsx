/**
 * Science or Fiction — game screen tests.
 *
 * Replaces sof.toggle.test.tsx.  The mode toggle has been removed; SoF now
 * plays one question per session picked from the full bank.  Weird questions
 * are identified by a "WEIRD & TRUE" category label rather than a toggle.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('@/constants/utils', () => {
  const actual = jest.requireActual('@/constants/utils');
  return { ...actual, shuffleIndices: jest.fn((n: number) => Array.from({ length: n }, (_, i) => i)) };
});
const { shuffleIndices } = require('@/constants/utils') as { shuffleIndices: jest.Mock };

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

// ── module refs ────────────────────────────────────────────────────────────
const { useAuth } = require('@/context/AuthContext') as { useAuth: jest.Mock };
const { useContent } = require('@/context/ContentContext') as { useContent: jest.Mock };
const { useGame } = require('@/context/GameContext') as { useGame: jest.Mock };
const { useLocalSearchParams } = require('expo-router') as { useLocalSearchParams: jest.Mock };

import { SofItem } from '@/constants/data';
import { initialState } from '@/context/gameReducer';
import SofScreen from '../sof';

// ── test data ──────────────────────────────────────────────────────────────

const makeQuestion = (weirdAndTrue: boolean, index = 0): SofItem => ({
  topic: weirdAndTrue ? `Weird Topic ${index}` : `Standard Topic ${index}`,
  intro: 'Test intro',
  weirdAndTrue,
  claims: [
    { text: `Claim A${index}`, isScience: true, explanation: `Exp A${index}`, source: null },
    { text: `Claim B${index}`, isScience: false, explanation: `Exp B${index}`, source: null },
  ],
});

// Mixed bank: standard first, weird second (indices 0 and 1)
const SOF_BANK: SofItem[] = [makeQuestion(false, 0), makeQuestion(true, 1)];

function defaultGameState() {
  return {
    state: initialState,
    isLoaded: true,
    updateGameStats: jest.fn(),
    setSeen: jest.fn(),
    addFriendInteraction: jest.fn(),
    earnStreakShield: jest.fn(),
    setAskerAnswer: jest.fn(),
    removeFriendInteraction: jest.fn(),
    dismissHelpCard: jest.fn(),
    dismissStreakSavedBanner: jest.fn(),
    dismissStreakCelebration: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useLocalSearchParams.mockReturnValue({});
  useAuth.mockReturnValue({ user: null, isAnonymous: true, displayName: null });
  useContent.mockReturnValue({
    banks: { sof: SOF_BANK, lede: [], spread: [], wave: [], quip: [] },
    contentWeek: '2026-W20',
    isLoading: false,
  });
  useGame.mockReturnValue(defaultGameState());
});

// ── no toggle ─────────────────────────────────────────────────────────────

describe('SoF — no mode toggle', () => {
  it('does not render the Standard toggle button', async () => {
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-standard')).toBeNull();
  });

  it('does not render the Weird & True toggle button', async () => {
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-weird')).toBeNull();
  });

  it('does not render the "Select mode" label', async () => {
    const { queryByText } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByText(/select mode/i)).toBeNull();
  });
});

// ── category label ────────────────────────────────────────────────────────

describe('SoF category label', () => {
  it('shows WEIRD & TRUE label when question is weirdAndTrue', async () => {
    // Force bank to contain only a weird question so the picker lands on it
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(true, 0)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(getByTestId('sof-category-label').props.children).toMatch(/weird.*true/i);
  });

  it('shows no WEIRD & TRUE label for a standard question', async () => {
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(false, 0)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-category-label')).toBeNull();
  });
});

// ── single-question mount ─────────────────────────────────────────────────

describe('SoF single-question mount', () => {
  let setSeen: jest.Mock;

  beforeEach(() => {
    setSeen = jest.fn();
    useGame.mockReturnValue({ ...defaultGameState(), setSeen });
  });

  it('calls setSeen exactly once on mount', async () => {
    render(<SofScreen />);
    await act(async () => {});
    expect(setSeen).toHaveBeenCalledTimes(1);
  });

  it('records exactly one question index in setSeen', async () => {
    render(<SofScreen />);
    await act(async () => {});
    const [, indices] = setSeen.mock.calls[0] as ['sof', number[]];
    expect(indices).toHaveLength(1);
  });

  it('shows the topic of the picked question', async () => {
    // bank has only a standard question
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(false, 0)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    expect(getByText('Standard Topic 0')).toBeTruthy();
  });
});

// ── Play Again picks from the full bank ───────────────────────────────────

describe('SoF Play Again', () => {
  let setSeen: jest.Mock;

  beforeEach(() => {
    setSeen = jest.fn();
    useGame.mockReturnValue({ ...defaultGameState(), setSeen });
    // Bank has two questions; first pick will be index 0 (Math.random returns 0 in first call)
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(false, 0), makeQuestion(true, 1)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
  });

  it('calls setSeen again after Play Again', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    setSeen.mockClear();

    // Reach reveal
    fireEvent.press(screen.getByText(/Claim A0/));
    await act(async () => {});
    fireEvent.press(screen.getByText(/LOCK IN CLAIM/i));
    await act(async () => {});

    fireEvent.press(screen.getByText('Play Again'));
    await act(async () => {});

    expect(setSeen).toHaveBeenCalledWith('sof', expect.any(Array));
  });
});

// ── challenge / help / hint modes load question by index ─────────────────

describe('SoF challenge mode', () => {
  it('loads the question specified by challengeQuestionIndex', async () => {
    useLocalSearchParams.mockReturnValue({
      challengeToken: 'tok',
      challengeQuestionIndex: '1',
      challengeSenderName: 'Bob',
    });
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(false, 0), makeQuestion(true, 1)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    expect(getByText('Weird Topic 1')).toBeTruthy();
  });

  it('does not show the mode toggle in challenge mode', async () => {
    useLocalSearchParams.mockReturnValue({
      challengeToken: 'tok',
      challengeQuestionIndex: '0',
      challengeSenderName: 'Bob',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-standard')).toBeNull();
    expect(queryByTestId('sof-mode-weird')).toBeNull();
  });
});

describe('SoF help mode', () => {
  it('does not show the mode toggle in help mode', async () => {
    useLocalSearchParams.mockReturnValue({
      helpToken: 'help-tok',
      helpQuestionIndex: '0',
      helpAskerName: 'Alice',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('sof-mode-standard')).toBeNull();
    expect(queryByTestId('sof-mode-weird')).toBeNull();
  });
});

// ── hint mode ────────────────────────────────────────────────────────────────

describe('SoF hint mode — lock-in', () => {
  let setAskerAnswer: jest.Mock;

  beforeEach(() => {
    setAskerAnswer = jest.fn();
    useGame.mockReturnValue({ ...defaultGameState(), setAskerAnswer });
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '2',
      hintToken: 'HINT_TOK',
    });
  });

  it('calls setAskerAnswer with token and 1-based claim after lock-in', async () => {
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    fireEvent.press(getByText('Claim A0'));
    await act(async () => {});
    fireEvent.press(getByText(/LOCK IN CLAIM/i));
    await act(async () => {});
    expect(setAskerAnswer).toHaveBeenCalledWith('HINT_TOK', '1');
  });
});

describe('SoF friend hint', () => {
  it('shows a hint indicator on the hinted claim', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '2',
    });
    const { getByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(getByTestId('claim-friend-hint-1')).toBeTruthy();
  });

  it('does not show a hint indicator on the wrong claim', async () => {
    useLocalSearchParams.mockReturnValue({
      hintQuestionIndex: '0',
      friendHint: '2',
    });
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('claim-friend-hint-0')).toBeNull();
  });

  it('shows no hint indicator when friendHint is absent', async () => {
    useLocalSearchParams.mockReturnValue({});
    const { queryByTestId } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByTestId('claim-friend-hint-0')).toBeNull();
    expect(queryByTestId('claim-friend-hint-1')).toBeNull();
  });
});

// ── wager removed ──────────────────────────────────────────────────────────

describe('SoF wager removed', () => {
  it('does not render wager / confidence buttons', async () => {
    const { queryByText } = render(<SofScreen />);
    await act(async () => {});
    expect(queryByText(/1× safe/i)).toBeNull();
    expect(queryByText(/2× double down/i)).toBeNull();
    expect(queryByText(/confidence/i)).toBeNull();
  });
});

// ── reveal ─────────────────────────────────────────────────────────────────────

async function reachReveal(screen: ReturnType<typeof render>, claimText: string) {
  fireEvent.press(screen.getByText(claimText));
  await act(async () => {});
  fireEvent.press(screen.getByText(/LOCK IN CLAIM/i));
  await act(async () => {});
}

describe('SoF reveal', () => {
  beforeEach(() => {
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(false, 0)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
  });

  it('shows both claims in reveal', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen, 'Claim A0');
    expect(screen.queryByText('Claim A0')).toBeTruthy();
    expect(screen.queryByText('Claim B0')).toBeTruthy();
  });

  it('shows explanations for both claims in reveal', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen, 'Claim A0');
    expect(screen.queryByText('Exp A0')).toBeTruthy();
    expect(screen.queryByText('Exp B0')).toBeTruthy();
  });

  it('shows Correct when science claim is picked', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen, 'Claim A0');
    expect(screen.queryByText('Correct')).toBeTruthy();
  });

  it('shows Incorrect when fiction claim is picked', async () => {
    const screen = render(<SofScreen />);
    await act(async () => {});
    await reachReveal(screen, 'Claim B0');
    expect(screen.queryByText('Incorrect')).toBeTruthy();
    expect(screen.queryByText('Claim A0')).toBeTruthy();
  });
});

// ── claim shuffle ──────────────────────────────────────────────────────────

describe('SoF claim shuffle', () => {
  beforeEach(() => {
    useContent.mockReturnValue({
      banks: { sof: [makeQuestion(false, 0)], lede: [], spread: [], wave: [], quip: [] },
      contentWeek: '2026-W20',
      isLoading: false,
    });
  });

  it('renders claims in the order returned by shuffleIndices', async () => {
    shuffleIndices.mockReturnValue([1, 0]);
    const { getAllByText } = render(<SofScreen />);
    await act(async () => {});
    const texts = getAllByText(/^Claim [AB]0$/).map(el => el.props.children as string);
    expect(texts[0]).toBe('Claim B0');
    expect(texts[1]).toBe('Claim A0');
  });

  it('selecting a claim uses the original index for correctness check', async () => {
    shuffleIndices.mockReturnValue([1, 0]);
    const { getByText } = render(<SofScreen />);
    await act(async () => {});
    fireEvent.press(getByText('Claim B0'));
    await act(async () => {});
    expect(getByText('LOCK IN CLAIM 1')).toBeTruthy();
  });
});
