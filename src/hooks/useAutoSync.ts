import { useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { toast } from '@/stores/toastStore';

/**
 * Hook that handles automatic sync when file changes are detected.
 * Listens for 'sync-required' events from Tauri backend and triggers sync.
 */
export function useAutoSync() {
  const performSync = useSyncStore((state) => state.performSync);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupAutoSyncListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      unlisten = await listen('sync-required', async (event) => {
        const gameId = event.payload as string;
        console.log(`Automatic sync triggered for game: ${gameId}`);

        try {
          await performSync(gameId);
          await sendDesktopNotification();
          
          toast.success(
            'Auto-Sync Complete',
            'Your save has been backed up to the cloud'
          );
        } catch (err: any) {
          console.error('Auto sync failed:', err);
          toast.error(
            'Auto-Sync Failed',
            err.message || 'Failed to backup save files'
          );
        }
      });
    };

    setupAutoSyncListener();

    return () => {
      unlisten?.();
    };
  }, [performSync]);
}

/**
 * Sends a desktop notification if enabled in settings and permission is granted.
 */
async function sendDesktopNotification(): Promise<void> {
  try {
    const { getAppSettings } = await import('@/lib/tauri');
    const settings = await getAppSettings();

    if (!settings.desktop_notifications) return;

    const { isPermissionGranted, requestPermission, sendNotification } = 
      await import('@tauri-apps/plugin-notification');
    
    let permission = await isPermissionGranted();
    if (!permission) {
      permission = (await requestPermission()) === 'granted';
    }

    if (permission) {
      sendNotification({
        title: 'Sync Saves: Auto-Backup',
        body: 'Your save for this game has been successfully backed up to the cloud!',
        icon: 'cloud',
      });
    }
  } catch (e) {
    // Silently fail - notifications are non-critical
    console.warn('Failed to send desktop notification:', e);
  }
}
