import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChallengeReplyCard } from '../ChallengeReplyCard';

describe('ChallengeReplyCard', () => {
  const baseProps = {
    friendName: 'Bob',
    gameTitle: 'The Lede',
    questionText: 'Cat Burglar Caught',
    friendAnswerLabel: 'Bea',
    correctLabel: 'Bea',
    friendCorrect: true as boolean | null,
    predictionLabel: 'Alex',
    predictionCorrect: false,
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('renders friend name, game title, and question', () => {
    const { getByText } = render(<ChallengeReplyCard {...baseProps} />);
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('The Lede')).toBeTruthy();
    expect(getByText('Cat Burglar Caught')).toBeTruthy();
  });

  test('renders friend pick + correct answer rows', () => {
    const { getByText, getAllByText } = render(<ChallengeReplyCard {...baseProps} />);
    expect(getByText('They picked')).toBeTruthy();
    expect(getAllByText('Bea').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Correct answer')).toBeTruthy();
  });

  test('renders friend ✓ Correct tag when friendCorrect=true', () => {
    const { getByText } = render(<ChallengeReplyCard {...baseProps} friendCorrect={true} />);
    expect(getByText('✓ Friend got it right')).toBeTruthy();
  });

  test('renders friend ✗ Wrong tag when friendCorrect=false', () => {
    const { getByText } = render(<ChallengeReplyCard {...baseProps} friendCorrect={false} />);
    expect(getByText('✗ Friend was off')).toBeTruthy();
  });

  test('omits friend correctness tag when friendCorrect=null (e.g., quip)', () => {
    const { queryByText } = render(
      <ChallengeReplyCard {...baseProps} friendCorrect={null} correctLabel={null} />,
    );
    expect(queryByText('✓ Friend got it right')).toBeNull();
    expect(queryByText('✗ Friend was off')).toBeNull();
  });

  test('renders prediction row with ✓ You called it when predictionCorrect=true', () => {
    const { getByText } = render(
      <ChallengeReplyCard {...baseProps} predictionLabel="Bea" predictionCorrect={true} />,
    );
    expect(getByText('Your prediction')).toBeTruthy();
    expect(getByText('✓ You called it')).toBeTruthy();
  });

  test('renders prediction row with ✗ Off this time when predictionCorrect=false', () => {
    const { getByText } = render(<ChallengeReplyCard {...baseProps} predictionCorrect={false} />);
    expect(getByText('✗ Off this time')).toBeTruthy();
  });

  test('dismiss button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ChallengeReplyCard {...baseProps} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('challenge-reply-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
