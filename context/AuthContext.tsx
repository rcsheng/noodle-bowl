import React, { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  isAnonymous: boolean;
  displayName: string | null;
  isLoading: boolean;
  reloadUser: (overrideDisplayName?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAnonymous: true,
  displayName: null,
  isLoading: true,
  reloadUser: () => {},
});

interface AuthState {
  user: User | null;
  isAnonymous: boolean;
  displayName: string | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAnonymous: true,
    displayName: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Validate the stored token is live for the current environment.
        // Catches stale tokens from any environment switch — emulator→prod or
        // prod→emulator — before they cause silent "unauthenticated" errors.
        try {
          await firebaseUser.getIdToken(/* forceRefresh= */ true);
        } catch (err) {
          // Only sign out for genuine token invalidity. Transient network errors
          // must NOT sign the user out — that would create a null auth window
          // that races with in-flight callables and produces spurious errors.
          const code = (err as { code?: string }).code ?? '';
          if (code !== 'auth/network-request-failed') {
            await signOut(auth);
            return; // listener fires again with null → signInAnonymously branch
          }
        }
        // Preserve a previously known displayName when Firebase passes a
        // stale snapshot with displayName=null right after sign-up. Once we've
        // captured the real name (via reloadUser or a fresh sign-in), don't
        // let a later listener event clobber it back to null.
        setAuthState((prev) => ({
          user: firebaseUser,
          isAnonymous: firebaseUser.isAnonymous,
          displayName:
            firebaseUser.displayName ??
            (prev.user?.uid === firebaseUser.uid ? prev.displayName : null),
        }));
        setIsLoading(false);
      } else {
        setAuthState({ user: null, isAnonymous: true, displayName: null });
        try {
          await signInAnonymously(auth);
        } catch {
          setIsLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  function reloadUser(overrideDisplayName?: string) {
    const u = auth.currentUser;
    if (!u) return;
    setAuthState((prev) => ({
      user: u,
      isAnonymous: u.isAnonymous,
      displayName: overrideDisplayName ?? u.displayName ?? prev.displayName,
    }));
  }

  return (
    <AuthContext.Provider value={{
      user: authState.user,
      isAnonymous: authState.isAnonymous,
      displayName: authState.displayName,
      isLoading,
      reloadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
