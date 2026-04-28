import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { HelpSentModal } from '../HelpSentModal';

describe('HelpSentModal', () => {
  test('renders title and body when visible', () => {
    const { getByText } = render(
      <HelpSentModal visible={true} onDismiss={jest.fn()} />,
    );
    expect(getByText('Link sent')).toBeTruthy();
    expect(getByText("We'll let you know when your friend answers.")).toBeTruthy();
  });

  test('"Got it" button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <HelpSentModal visible={true} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByTestId('help-sent-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
