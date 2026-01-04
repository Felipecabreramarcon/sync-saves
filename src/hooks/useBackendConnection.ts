import { useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useGamesStore } from '@/stores/gamesStore';
import { getSystemInfo, getDeviceName } from '@/lib/tauri';

/**
 * Hook that monitors backend (Tauri) connection status.
 * Periodically checks if the Rust backend is responsive.
 */
export function useBackendConnection() {
  const setBackendConnected = useSyncStore((state) => state.setBackendConnected);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getSystemInfo();
        const deviceName = await getDeviceName();
        useGamesStore.getState().setDeviceName(deviceName);
        setBackendConnected(true);
      } catch (e) {
        setBackendConnected(false);
      }
    };

    // Initial check
    checkConnection();

    // Periodic check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [setBackendConnected]);
}
