import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLoading(false);
        registerPushToken(firebaseUser.uid).catch(() => {});
      } else {
        setUser(null);
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged fires again with the new anonymous user
        } catch {
          setIsLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAnonymous: user?.isAnonymous ?? true,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
