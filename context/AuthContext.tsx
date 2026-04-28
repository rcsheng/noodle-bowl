import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, signInAnonymously, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { registerPushToken } from '@/lib/pushTokens';

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
  const hasSeenUserRef = useRef(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        hasSeenUserRef.current = true;
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
        registerPushToken(firebaseUser.uid).catch(() => {});
      } else {
        setAuthState({ user: null, isAnonymous: true, displayName: null });
        if (!hasSeenUserRef.current) {
          try {
            await signInAnonymously(auth);
          } catch {
            setIsLoading(false);
          }
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
