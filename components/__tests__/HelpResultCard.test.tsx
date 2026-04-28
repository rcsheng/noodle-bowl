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
});
