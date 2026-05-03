import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
  }, []);

  // null = not yet determined; treat as connected to avoid false-positive banner on cold start
  return { isOffline: isConnected === false };
}
