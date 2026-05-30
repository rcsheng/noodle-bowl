import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { HelpResultCard } from '../HelpResultCard';

describe('HelpResultCard', () => {
  const baseProps = {
    friendName: 'Alice',
    gameTitle: 'The Lede',
    questionText: 'Cat Burglar Caught',
    answerLabel: 'Bea',
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('renders friend name, game title, and question text', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} />);
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('The Lede')).toBeTruthy();
    expect(getByText('Cat Burglar Caught')).toBeTruthy();
  });

  test('renders "They picked" row with the friend answer label', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} answerLabel="Alex" />);
    expect(getByText('They picked')).toBeTruthy();
    expect(getByText('Alex')).toBeTruthy();
  });

  // Correct answer and correct/wrong tag are NEVER shown — it is always a spoiler
  // on a hint card. The user sees the correct answer in the game screen after playing.
  test('never shows "Correct answer" row', () => {
    const { queryByText } = render(<HelpResultCard {...baseProps} />);
    expect(queryByText('Correct answer')).toBeNull();
  });

  test('never shows ✓ Correct or ✗ Wrong tag', () => {
    const { queryByText } = render(<HelpResultCard {...baseProps} />);
    expect(queryByText('✓ Correct')).toBeNull();
    expect(queryByText('✗ Wrong')).toBeNull();
  });

  test('dismiss button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(<HelpResultCard {...baseProps} onDismiss={onDismiss} />);
    fireEvent.press(getByTestId('help-result-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
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
