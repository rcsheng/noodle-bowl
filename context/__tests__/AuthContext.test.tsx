import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

// Capture the onIdTokenChanged callback so tests can control auth state
let authStateCallback: ((user: unknown) => void) | null = null;
const mockUnsub = jest.fn();
const mockOnIdTokenChanged = jest.fn((_auth: unknown, cb: (user: unknown) => void) => {
  authStateCallback = cb;
  return mockUnsub;
});
const mockSignInAnonymously = jest.fn();
const mockRegisterPushToken = jest.fn().mockResolvedValue(null);

jest.mock('firebase/auth', () => ({
  onIdTokenChanged: (...args: unknown[]) => mockOnIdTokenChanged(...args),
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
}));

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

jest.mock('@/lib/pushTokens', () => ({
  registerPushToken: (...args: unknown[]) => mockRegisterPushToken(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  authStateCallback = null;
  mockSignInAnonymously.mockResolvedValue({ user: { uid: 'anon-uid', isAnonymous: true } });
});

describe('AuthContext', () => {
  it('subscribes to onIdTokenChanged on mount', () => {
    renderHook(() => useAuth(), { wrapper });
    expect(mockOnIdTokenChanged).toHaveBeenCalledTimes(1);
  });

  it('calls signInAnonymously when auth state is null', async () => {
    renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!(null);
    });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('sets user to null (isAnonymous=true) immediately when auth state becomes null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authStateCallback!({ uid: 'real-uid', isAnonymous: false });
    });
    expect(result.current.isAnonymous).toBe(false);

    mockSignInAnonymously.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      authStateCallback!(null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAnonymous).toBe(true);
  });

  it('sets user and clears isLoading when auth state resolves with a user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const mockUser = { uid: 'anon-uid', isAnonymous: true };

    await act(async () => {
      authStateCallback!(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('isAnonymous=true when user.isAnonymous is true', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!({ uid: 'anon-uid', isAnonymous: true });
    });
    expect(result.current.isAnonymous).toBe(true);
  });

  it('isAnonymous=false when user has a permanent account', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!({ uid: 'real-uid', isAnonymous: false, email: 'test@example.com' });
    });
    expect(result.current.isAnonymous).toBe(false);
  });

  it('calls registerPushToken when a user resolves', async () => {
    renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!({ uid: 'some-uid', isAnonymous: true });
    });
    expect(mockRegisterPushToken).toHaveBeenCalledWith('some-uid');
  });

  it('unsubscribes from onIdTokenChanged on unmount', () => {
    mockOnIdTokenChanged.mockReturnValueOnce(mockUnsub);
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it('starts with isLoading=true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('reflects isAnonymous flip when User reference is unchanged (linkWithCredential)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Same object reference Firebase mutates in place during linkWithCredential.
    const userRef: { uid: string; isAnonymous: boolean; email?: string } = {
      uid: 'shared-uid',
      isAnonymous: true,
    };

    await act(async () => {
      authStateCallback!(userRef);
    });
    expect(result.current.isAnonymous).toBe(true);

    // linkWithCredential mutates the same object then re-fires the listener.
    userRef.isAnonymous = false;
    userRef.email = 'jay@example.com';

    await act(async () => {
      authStateCallback!(userRef);
    });
    expect(result.current.isAnonymous).toBe(false);
    expect(result.current.user).toBe(userRef);
  });

  it('does not call signInAnonymously when null fires after a user has been seen', async () => {
    renderHook(() => useAuth(), { wrapper });

    // First event: a real user (e.g. anonymous on first launch)
    await act(async () => {
      authStateCallback!({ uid: 'anon-uid', isAnonymous: true });
    });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();

    // Now null fires (transient state during signInWithEmailAndPassword)
    await act(async () => {
      authStateCallback!(null);
    });
    // Should NOT trigger a competing anonymous sign-in
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });
});
