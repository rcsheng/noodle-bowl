import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { HelpResultCard } from '../HelpResultCard';

describe('HelpResultCard', () => {
  const baseProps = {
    friendName: 'Alice',
    gameTitle: 'The Lede',
    questionText: 'Cat Burglar Caught',
    answerLabel: 'Bea',
    correctLabel: 'Bea',
    correct: true as boolean | null,
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('renders friend name, game title, and the question text', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} />);
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('The Lede')).toBeTruthy();
    expect(getByText('Cat Burglar Caught')).toBeTruthy();
  });

  test('renders friend pick and correct answer rows when isGameCompleted=true', () => {
    const { getByText } = render(
      <HelpResultCard {...baseProps} isGameCompleted={true} answerLabel="Alex" correctLabel="Bea" correct={false} />,
    );
    expect(getByText('Alex')).toBeTruthy();
    expect(getByText('Bea')).toBeTruthy();
    expect(getByText('They picked')).toBeTruthy();
    expect(getByText('Correct answer')).toBeTruthy();
  });

  test('shows ✓ Correct tag when correct=true and isGameCompleted=true', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} isGameCompleted={true} correct={true} />);
    expect(getByText('✓ Correct')).toBeTruthy();
  });

  test('shows ✗ Wrong tag when correct=false and isGameCompleted=true', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} isGameCompleted={true} correct={false} />);
    expect(getByText('✗ Wrong')).toBeTruthy();
  });

  test('omits correctness tag and "Correct answer" row when correctLabel is null', () => {
    const { queryByText } = render(
      <HelpResultCard {...baseProps} isGameCompleted={true} correct={null} correctLabel={null} />,
    );
    expect(queryByText('✓ Correct')).toBeNull();
    expect(queryByText('✗ Wrong')).toBeNull();
    expect(queryByText('Correct answer')).toBeNull();
  });

  test('dismiss button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <HelpResultCard {...baseProps} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('help-result-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Spoiler behavior — correctLabel and tag are hidden until the game is played
  // ---------------------------------------------------------------------------
  describe('Spoiler suppression', () => {
    test('hides "Correct answer" row and correct/wrong tag when isGameCompleted=false', () => {
      const { queryByText } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} correctLabel="Bea" correct={true} />,
      );
      expect(queryByText('Correct answer')).toBeNull();
      expect(queryByText('✓ Correct')).toBeNull();
    });

    test('hides "Correct answer" row and correct/wrong tag when isGameCompleted is not set', () => {
      const { queryByText } = render(
        <HelpResultCard {...baseProps} correctLabel="Bea" correct={true} />,
      );
      expect(queryByText('Correct answer')).toBeNull();
      expect(queryByText('✓ Correct')).toBeNull();
    });

    test('still shows "They picked" row regardless of completion state', () => {
      const { getByText } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} answerLabel="Alex" />,
      );
      expect(getByText('They picked')).toBeTruthy();
      expect(getByText('Alex')).toBeTruthy();
    });
  });

  describe('Played this week state', () => {
    test('shows "Played this week" label when isGameCompleted=true', () => {
      const { getByText } = render(
        <HelpResultCard {...baseProps} isGameCompleted={true} />,
      );
      expect(getByText(/played this week/i)).toBeTruthy();
    });

    test('does not show "Played this week" label when isGameCompleted=false', () => {
      const { queryByText } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} onPlay={jest.fn()} />,
      );
      expect(queryByText(/played this week/i)).toBeNull();
    });

    test('does not show "Played this week" label by default (backward compat)', () => {
      const { queryByText } = render(<HelpResultCard {...baseProps} />);
      expect(queryByText(/played this week/i)).toBeNull();
    });
  });

  describe('Your pick row', () => {
    test('shows "Your pick" row when askerAnswerLabel is provided', () => {
      const { getByText } = render(
        <HelpResultCard {...baseProps} askerAnswerLabel="sharing client data" />,
      );
      expect(getByText('Your pick')).toBeTruthy();
      expect(getByText('sharing client data')).toBeTruthy();
    });

    test('does not show "Your pick" row when askerAnswerLabel is absent', () => {
      const { queryByText } = render(<HelpResultCard {...baseProps} />);
      expect(queryByText('Your pick')).toBeNull();
    });
  });

  describe('Play button', () => {
    test('shows Play button when isGameCompleted=false and onPlay is provided', () => {
      const { getByTestId } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} onPlay={jest.fn()} />,
      );
      expect(getByTestId('help-result-play-btn')).toBeTruthy();
    });

    test('calls onPlay when Play button is pressed', () => {
      const onPlay = jest.fn();
      const { getByTestId } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} onPlay={onPlay} />,
      );
      fireEvent.press(getByTestId('help-result-play-btn'));
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    test('hides Play button when isGameCompleted=true', () => {
      const { queryByTestId } = render(
        <HelpResultCard {...baseProps} isGameCompleted={true} onPlay={jest.fn()} />,
      );
      expect(queryByTestId('help-result-play-btn')).toBeNull();
    });

    test('hides Play button when onPlay is not provided', () => {
      const { queryByTestId } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} />,
      );
      expect(queryByTestId('help-result-play-btn')).toBeNull();
    });

    test('hides Play button when neither prop is set (backward-compat default)', () => {
      const { queryByTestId } = render(<HelpResultCard {...baseProps} />);
      expect(queryByTestId('help-result-play-btn')).toBeNull();
    });
  });
});
