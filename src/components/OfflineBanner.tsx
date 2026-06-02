import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getSession } from '../services/session';
import { processSyncQueue } from '../services/syncService';

export default function OfflineBanner() {
  const { isOnline, justCameOnline } = useNetworkStatus();
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const shouldShow = !isOnline || justCameOnline;

  // Trigger sync when connection is restored
  useEffect(() => {
    if (justCameOnline) {
      try {
        const session = getSession();
        processSyncQueue(session).catch(() => {});
      } catch {
        // Session not available yet (e.g. on login screen)
      }
    }
  }, [justCameOnline]);

  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [shouldShow]);

  if (!mounted) return null;

  const isRestored = justCameOnline && isOnline;

  return (
    <Animated.View
      style={[styles.banner, isRestored ? styles.online : styles.offline, { opacity }]}
    >
      <Ionicons
        name={isRestored ? 'wifi' : 'wifi-outline'}
        size={14}
        color={isRestored ? '#155724' : '#7c5300'}
      />
      <Text style={[styles.texto, isRestored ? styles.textoOnline : styles.textoOffline]}>
        {isRestored
          ? 'Conexão restaurada — sincronizando dados...'
          : 'Você está offline — dados salvos localmente'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offline: { backgroundColor: '#fff3cd' },
  online: { backgroundColor: '#d4edda' },
  texto: { flex: 1, fontSize: 12, fontWeight: '600' },
  textoOffline: { color: '#7c5300' },
  textoOnline: { color: '#155724' },
});
