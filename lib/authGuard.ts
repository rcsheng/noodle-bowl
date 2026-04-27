import { useCallback, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

export function useAuthGate() {
  const { isAnonymous } = useAuth();
  const [authGateVisible, setAuthGateVisible] = useState(false);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!isAnonymous) {
        action();
        return;
      }
      setAuthGateVisible(true);
    },
    [isAnonymous],
  );

  const dismissAuthGate = useCallback(() => setAuthGateVisible(false), []);

  return { requireAuth, authGateVisible, dismissAuthGate };
}
