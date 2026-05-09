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
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockRegisterPushToken = jest.fn().mockResolvedValue(null);

jest.mock('firebase/auth', () => ({
  onIdTokenChanged: (auth: unknown, cb: (user: unknown) => void) => mockOnIdTokenChanged(auth, cb),
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

jest.mock('@/lib/pushTokens', () => ({
  registerPushToken: (...args: unknown[]) => mockRegisterPushToken(...args),
}));

// All mock users need getIdToken so the prod-token-validation path doesn't throw.
function makeUser(fields: Record<string, unknown>) {
  return { getIdToken: jest.fn().mockResolvedValue('mock-token'), ...fields };
}

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
      authStateCallback!(makeUser({ uid: 'real-uid', isAnonymous: false }));
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
    const mockUser = makeUser({ uid: 'anon-uid', isAnonymous: true });

    await act(async () => {
      authStateCallback!(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('isAnonymous=true when user.isAnonymous is true', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!(makeUser({ uid: 'anon-uid', isAnonymous: true }));
    });
    expect(result.current.isAnonymous).toBe(true);
  });

  it('isAnonymous=false when user has a permanent account', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!(makeUser({ uid: 'real-uid', isAnonymous: false, email: 'test@example.com' }));
    });
    expect(result.current.isAnonymous).toBe(false);
  });

  it('calls registerPushToken when a user resolves', async () => {
    renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      authStateCallback!(makeUser({ uid: 'some-uid', isAnonymous: true }));
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
    const userRef: Record<string, unknown> = {
      uid: 'shared-uid',
      isAnonymous: true,
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
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

  it('calls signInAnonymously when null fires to re-establish anonymous session', async () => {
    renderHook(() => useAuth(), { wrapper });

    // First event: a real user (e.g. anonymous on first launch)
    await act(async () => {
      authStateCallback!(makeUser({ uid: 'anon-uid', isAnonymous: true }));
    });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();

    // Now null fires (e.g. after sign-out)
    await act(async () => {
      authStateCallback!(null);
    });
    // Always re-establish anonymous session so Firebase callables stay authenticated
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('signs out and re-establishes anonymous session when token refresh fails with a token error', async () => {
    renderHook(() => useAuth(), { wrapper });

    const tokenError = Object.assign(new Error('Token expired'), { code: 'auth/user-token-expired' });
    const badUser = {
      uid: 'stale-uid',
      isAnonymous: false,
      getIdToken: jest.fn().mockRejectedValue(tokenError),
    };

    await act(async () => {
      authStateCallback!(badUser);
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    // After signOut the listener fires with null → signInAnonymously
    await act(async () => {
      authStateCallback!(null);
    });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('does NOT sign out when token refresh fails with a network error', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const networkError = Object.assign(new Error('Network error'), { code: 'auth/network-request-failed' });
    const user = {
      uid: 'real-uid',
      isAnonymous: false,
      getIdToken: jest.fn().mockRejectedValue(networkError),
    };

    await act(async () => {
      authStateCallback!(user);
    });

    // Network errors must not sign out — transient failure should not interrupt the session
    expect(mockSignOut).not.toHaveBeenCalled();
    // The user IS still set (we fell through to setAuthState despite the error)
    expect(result.current.user).toEqual(user);
    expect(result.current.isAnonymous).toBe(false);
  });
});
