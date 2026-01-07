/**
 * Sync Service
 *
 * Delegates heavy lifting (Compression, Hash, Upload) to Rust backend.
 * Handles Restore logic (Download) and state updates.
 */

import { supabase } from '@/lib/supabase';
import { syncGame, restoreGame, type AuthConfig } from '@/lib/tauri-games';
import { useAuthStore } from '@/stores/authStore';
import { useGamesStore, type Game } from '@/stores/gamesStore';
import {
  ensureCloudGameId,
  upsertGamePath,
  sha256Base64,
  createSaveVersion,
  getLatestCloudChecksum,
} from '@/lib/cloudSync';
import { registerCurrentDevice } from '@/lib/devices';

export interface SyncResult {
  success: boolean;
  skipped?: boolean;
  message: string;
  fileSize?: number;
  checksum?: string;
  versionId?: string;
  durationMs?: number;
  cloudGameId?: string;
  deviceId?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  fileSize?: number;
  durationMs?: number;
  cloudGameId?: string;
  deviceId?: string;
}

/**
 * Progress callback for sync/restore operations.
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Executes the sync (upload) operation for a game.
 * Delegates to Rust 'sync_game' command.
 */
export async function executeSync(
  gameId: string,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  // const startedAt = performance.now(); // Rust handles timing now

  try {
    onProgress?.(10, 'Preparing sync...');

    // 1. Resolve User & Session
    const user = useAuthStore.getState().user;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!user || !session) {
      return { success: false, message: 'User not authenticated' };
    }

    // 2. Resolve Environment Config
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, message: 'Missing Supabase configuration' };
    }

    onProgress?.(30, 'Syncing with cloud...');

    // 3. Call Rust Backend
    const auth: AuthConfig = {
      url: supabaseUrl,
      key: supabaseAnonKey,
      token: session.access_token,
      user_id: user.id,
    };

    const result = await syncGame(gameId, auth);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    onProgress?.(100, result.message);

    // Note: Rust now handles Cloud Game ID, Device ID creation if missing.
    // It returns them if successful.

    return {
      success: true,
      skipped: result.skipped,
      message: result.message,
      fileSize: result.file_size,
      checksum: result.checksum,
      versionId: result.version_id,
      durationMs: result.duration_ms,
      cloudGameId: result.cloud_game_id,
      deviceId: result.device_id,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Sync failed' };
  }
}

/**
 * Executes the restore (download) operation for a game.
 * Downloads save files from cloud and extracts to local folder.
 */
export async function executeRestore(
  gameId: string,
  options: { filePath?: string } = {},
  onProgress?: ProgressCallback
): Promise<RestoreResult> {
  const startedAt = performance.now();

  try {
    onProgress?.(10, 'Downloading from cloud...');

    const user = useAuthStore.getState().user;
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    const game = useGamesStore.getState().games.find((g) => g.id === gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    const device = await registerCurrentDevice(user.id);
    const cloudDeviceId = device?.id ?? null;
    if (!cloudDeviceId) {
      return { success: false, message: 'Failed to resolve current device' };
    }

    const cloudGameId = await ensureCloudGameId(user.id, {
      name: game.name,
      slug: game.slug,
      cover_url: game.cover_url,
    });

    // 1. Determine download path
    const downloadPath =
      options.filePath || (await findLatestBackupPath(user.id, game, gameId));
    if (!downloadPath) {
      return { success: false, message: 'No backups found for this game' };
    }

    // 2. Download from storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from('saves')
      .download(downloadPath);

    if (downloadError) {
      return { success: false, message: downloadError.message };
    }

    onProgress?.(50, 'Extracting save...');

    // 3. Convert Blob to Base64
    const b64 = await blobToBase64(blob);

    // 4. Rust Restore
    const success = await restoreGame(gameId, b64);
    if (!success) {
      return { success: false, message: 'Restoration failed' };
    }

    onProgress?.(100, 'Restore complete!');

    const durationMs = Math.round(performance.now() - startedAt);

    return {
      success: true,
      message: 'Successfully restored from cloud',
      fileSize: blob.size,
      durationMs,
      cloudGameId,
      deviceId: cloudDeviceId,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Restore failed' };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

// Helper functions for executeRestore (Download)
// executeSync (Upload) helpers like ensureCloudGameId etc are now largely handled by Rust,
// but executeRestore still uses them in JS.

function base64ToBlob(base64Data: string): Blob {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'application/zip' });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function findLatestBackupPath(
  userId: string,
  game: Game,
  gameId: string
): Promise<string | null> {
  const listFolder = async (prefix: string) => {
    return await supabase.storage.from('saves').list(prefix, {
      limit: 1,
      sortBy: { column: 'name', order: 'desc' },
    });
  };

  // Prefer slug-based folder, fallback to legacy gameId folder
  let folderPrefix = `${userId}/${game.slug}`;
  let { data: files, error: listError } = await listFolder(folderPrefix);

  if (!listError && (!files || files.length === 0)) {
    folderPrefix = `${userId}/${gameId}`;
    ({ data: files, error: listError } = await listFolder(folderPrefix));
  }

  if (listError || !files || files.length === 0) {
    return null;
  }

  return `${folderPrefix}/${files[0].name}`;
}
