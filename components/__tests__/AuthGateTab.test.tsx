import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AuthGateTab } from '../AuthGateTab';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/components/Masthead', () => ({ Masthead: () => null }));

jest.mock('@/constants/theme', () => ({
  C: {
    paper: '#e8eef3',
    paperDark: '#d8e1ea',
    ink: '#1a2030',
    muted: '#5a6878',
    rule: '#2a3548',
    onDark: '#e8eef3',
  },
  F: {
    mono: 'JetBrainsMono_400Regular',
    monoBold: 'JetBrainsMono_700Bold',
    fraunces: 'Fraunces_400Regular',
    frauncesBoldItalic: 'Fraunces_700Bold_Italic',
  },
  cardShadow: {},
}));

describe('AuthGateTab', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test('renders title and body text', () => {
    const { getByText } = render(
      <AuthGateTab
        title="Sign in to see your stats"
        body="body text"
      />
    );
    expect(getByText('Sign in to see your stats')).toBeTruthy();
    expect(getByText('body text')).toBeTruthy();
  });

  test('Sign In button calls router.push with sign-in path', () => {
    const { getByTestId } = render(
      <AuthGateTab title="Title" body="Body" />
    );
    fireEvent.press(getByTestId('auth-gate-tab-signin-btn'));
    expect(mockPush).toHaveBeenCalledWith('/auth/sign-in');
  });

  test('Create Account button calls router.push with sign-up path', () => {
    const { getByTestId } = render(
      <AuthGateTab title="Title" body="Body" />
    );
    fireEvent.press(getByTestId('auth-gate-tab-create-btn'));
    expect(mockPush).toHaveBeenCalledWith('/auth/sign-up');
  });
});
