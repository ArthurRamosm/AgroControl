import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type NetworkStatus = {
  isOnline: boolean;
  justCameOnline: boolean;
};

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const prevOnlineRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Resolve initial state immediately
    NetInfo.fetch().then(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      prevOnlineRef.current = online;
      setIsOnline(online);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;

      if (online && !prevOnlineRef.current) {
        setJustCameOnline(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setJustCameOnline(false), 3000);
      }

      prevOnlineRef.current = online;
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isOnline, justCameOnline };
}
