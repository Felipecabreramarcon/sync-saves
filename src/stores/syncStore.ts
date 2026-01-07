import { create } from 'zustand';
import { toast } from './toastStore';
import {
  executeSync,
  executeRestore,
  type SyncResult,
  type RestoreResult,
} from '@/services/syncService';
import { useGamesStore } from './gamesStore';

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'success';
  progress: number;
  message: string;
  isBackendConnected: boolean;
  syncCooldowns: Record<string, number>; // gameId -> lastSyncTimestamp

  setStatus: (status: SyncState['status']) => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
  setBackendConnected: (connected: boolean) => void;
  performSync: (gameId: string, options?: { force?: boolean }) => Promise<void>;
  performRestore: (
    gameId: string,
    options?: { filePath?: string }
  ) => Promise<void>;
}

// Map to store timeout IDs for debouncing per game
const syncDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Constants
const SYNC_COOLDOWN_MS = 30000; // 30 seconds
const SYNC_DEBOUNCE_MS = 5000; // 5 seconds

export const useSyncStore = create<SyncState>()((set, get) => ({
  status: 'idle',
  progress: 0,
  message: '',
  isBackendConnected: false,
  syncCooldowns: {},

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setMessage: (message) => set({ message }),
  setBackendConnected: (isBackendConnected) => set({ isBackendConnected }),

  performSync: async (gameId: string, options = {}) => {
    // Clear any existing debounce timer for this game
    if (syncDebounceTimers[gameId]) {
      clearTimeout(syncDebounceTimers[gameId]);
      delete syncDebounceTimers[gameId];
    }

    const executeSyncWithState = async () => {
      // Cooldown Check
      const lastSync = get().syncCooldowns[gameId] || 0;
      const nowTs = Date.now();
      if (!options.force && nowTs - lastSync < SYNC_COOLDOWN_MS) {
        console.log(`Sync for ${gameId} skipped (cooldown active)`);
        return;
      }

      set({ status: 'syncing', progress: 0, message: 'Starting sync...' });

      const result = await executeSync(gameId, (progress, message) => {
        set({ progress, message });
      });

      await handleSyncResult(gameId, result, set);
    };

    if (options.force) {
      await executeSyncWithState();
    } else {
      // Debounce: Wait before syncing
      set({ message: 'Sync scheduled...' });
      syncDebounceTimers[gameId] = setTimeout(
        executeSyncWithState,
        SYNC_DEBOUNCE_MS
      );
    }
  },

  performRestore: async (gameId: string, options = {}) => {
    set({ status: 'syncing', progress: 0, message: 'Starting restore...' });

    const result = await executeRestore(
      gameId,
      options,
      (progress, message) => {
        set({ progress, message });
      }
    );

    await handleRestoreResult(gameId, result, set);
  },
}));

// ============================================================================
// Result Handlers (Orchestrates state updates, logging, and notifications)
// ============================================================================

async function handleSyncResult(
  gameId: string,
  result: SyncResult,
  set: (partial: Partial<SyncState>) => void
): Promise<void> {
  const game = useGamesStore.getState().games.find((g) => g.id === gameId);

  if (result.success) {
    if (result.skipped) {
      set({ status: 'idle', progress: 0, message: result.message });

      // Log skip action
      await useGamesStore.getState().logActivity({
        gameId,
        action: 'skip',
        status: 'success',
        message: result.message,
        durationMs: result.durationMs,
        cloudGameId: result.cloudGameId,
        deviceId: result.deviceId,
      });
    } else {
      // Update cooldown - use useSyncStore directly for callback syntax
      useSyncStore.setState((state) => ({
        syncCooldowns: { ...state.syncCooldowns, [gameId]: Date.now() },
      }));
      set({
        status: 'success',
        progress: 100,
        message: 'Sync complete!',
      });

      // Update game state
      useGamesStore.getState().updateGame(gameId, {
        status: 'synced',
        last_synced_at: new Date().toISOString(),
        cloud_game_id: result.cloudGameId, // Ensure cloud ID is linked
      });

      // Log success
      await useGamesStore.getState().logActivity({
        gameId,
        cloudGameId: result.cloudGameId,
        deviceId: result.deviceId,
        action: 'upload',
        status: 'success',
        save_version_id: result.versionId,
        message: result.message,
        durationMs: result.durationMs,
        fileSize: result.fileSize,
      });

      toast.success(
        'Sync Complete',
        `${game?.name || 'Game'} has been backed up to the cloud`
      );
      setTimeout(() => set({ status: 'idle', progress: 0, message: '' }), 3000);
    }
  } else {
    set({ status: 'error', message: result.message });
    toast.error('Sync Failed', result.message);

    useGamesStore.getState().updateGame(gameId, { status: 'error' });

    // Log error
    if (result.cloudGameId) {
      await useGamesStore.getState().logActivity({
        gameId,
        cloudGameId: result.cloudGameId,
        action: 'upload',
        status: 'error',
        message: result.message,
      });
    } else {
      await useGamesStore.getState().logActivity({
        gameId,
        action: 'upload',
        status: 'error',
        message: result.message,
      });
    }
  }
}

async function handleRestoreResult(
  gameId: string,
  result: RestoreResult,
  set: (partial: Partial<SyncState>) => void
): Promise<void> {
  const game = useGamesStore.getState().games.find((g) => g.id === gameId);

  if (result.success) {
    set({ status: 'success', progress: 100, message: 'Restore complete!' });

    useGamesStore.getState().updateGame(gameId, {
      status: 'synced',
      cloud_game_id: result.cloudGameId, // Ensure cloud ID is linked
    });

    await useGamesStore.getState().logActivity({
      gameId,
      cloudGameId: result.cloudGameId,
      deviceId: result.deviceId,
      action: 'download',
      status: 'success',
      message: result.message,
      durationMs: result.durationMs,
      fileSize: result.fileSize,
    });

    toast.success(
      'Restore Complete',
      `${game?.name || 'Game'} has been restored from the cloud`
    );
    setTimeout(() => set({ status: 'idle', progress: 0, message: '' }), 3000);
  } else {
    set({ status: 'error', message: result.message });
    toast.error('Restore Failed', result.message);

    if (result.cloudGameId) {
      await useGamesStore.getState().logActivity({
        gameId,
        cloudGameId: result.cloudGameId,
        action: 'download',
        status: 'error',
        message: result.message,
      });
    } else {
      await useGamesStore.getState().logActivity({
        gameId,
        action: 'download',
        status: 'error',
        message: result.message,
      });
    }
  }
}
