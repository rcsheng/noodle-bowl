import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ShieldSavedBanner } from '../ShieldSavedBanner';

describe('ShieldSavedBanner', () => {
  test('returns null when visible is false', () => {
    const { toJSON } = render(<ShieldSavedBanner visible={false} onDismiss={() => {}} />);
    expect(toJSON()).toBeNull();
  });

  test('renders the streak-saved label text when visible', () => {
    const { getByText } = render(<ShieldSavedBanner visible={true} onDismiss={() => {}} />);
    expect(getByText(/streak saved/i)).toBeTruthy();
  });

  test('renders the explanatory copy', () => {
    const { getByText } = render(<ShieldSavedBanner visible={true} onDismiss={() => {}} />);
    expect(getByText(/shield/i)).toBeTruthy();
  });

  test('calls onDismiss when the close affordance is pressed', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(<ShieldSavedBanner visible={true} onDismiss={onDismiss} />);
    fireEvent.press(getByLabelText('Dismiss streak saved banner'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
