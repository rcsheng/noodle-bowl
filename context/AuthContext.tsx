import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, signInAnonymously, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { registerPushToken } from '@/lib/pushTokens';

interface AuthContextType {
  user: User | null;
  isAnonymous: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAnonymous: true,
  isLoading: true,
});

interface AuthState {
  user: User | null;
  isAnonymous: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAnonymous: true });
  const [isLoading, setIsLoading] = useState(true);
  const hasSeenUserRef = useRef(false);

  useEffect(() => {
    // onIdTokenChanged fires for sign-in, sign-out, AND linkWithCredential.
    // We wrap into a new state object every time so React always re-renders,
    // even when Firebase reuses the same User reference (linkWithCredential
    // and updateProfile mutate fields like isAnonymous and displayName in place).
    const unsub = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        hasSeenUserRef.current = true;
        setAuthState({ user: firebaseUser, isAnonymous: firebaseUser.isAnonymous });
        setIsLoading(false);
        registerPushToken(firebaseUser.uid).catch(() => {});
      } else {
        setAuthState({ user: null, isAnonymous: true });
        if (!hasSeenUserRef.current) {
          // First launch with no persisted user — sign in anonymously.
          try {
            await signInAnonymously(auth);
          } catch {
            setIsLoading(false);
          }
        }
        // If hasSeenUserRef is true, this null is a transition:
        // - signOutAndGoAnonymous calls signInAnonymously explicitly
        // - signInWithEmailAndPassword fires the real user next
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{
      user: authState.user,
      isAnonymous: authState.isAnonymous,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
