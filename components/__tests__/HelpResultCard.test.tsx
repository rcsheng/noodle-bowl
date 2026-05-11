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

  test('renders friend pick and correct answer rows', () => {
    const { getByText } = render(
      <HelpResultCard {...baseProps} answerLabel="Alex" correctLabel="Bea" correct={false} />,
    );
    expect(getByText('Alex')).toBeTruthy();
    expect(getByText('Bea')).toBeTruthy();
    expect(getByText('They picked')).toBeTruthy();
    expect(getByText('Correct answer')).toBeTruthy();
  });

  test('shows ✓ Correct tag when correct=true', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} correct={true} />);
    expect(getByText('✓ Correct')).toBeTruthy();
  });

  test('shows ✗ Wrong tag when correct=false', () => {
    const { getByText } = render(<HelpResultCard {...baseProps} correct={false} />);
    expect(getByText('✗ Wrong')).toBeTruthy();
  });

  test('omits correctness tag and "Correct answer" row when correctLabel is null', () => {
    const { queryByText } = render(
      <HelpResultCard {...baseProps} correct={null} correctLabel={null} />,
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

  describe('Played today state', () => {
    test('shows "Played today" label when isGameCompleted=true', () => {
      const { getByText } = render(
        <HelpResultCard {...baseProps} isGameCompleted={true} />,
      );
      expect(getByText(/played today/i)).toBeTruthy();
    });

    test('does not show "Played today" label when isGameCompleted=false', () => {
      const { queryByText } = render(
        <HelpResultCard {...baseProps} isGameCompleted={false} onPlay={jest.fn()} />,
      );
      expect(queryByText(/played today/i)).toBeNull();
    });

    test('does not show "Played today" label by default (backward compat)', () => {
      const { queryByText } = render(<HelpResultCard {...baseProps} />);
      expect(queryByText(/played today/i)).toBeNull();
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
