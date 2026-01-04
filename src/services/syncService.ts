/**
 * Sync Service
 * 
 * Extracts business logic from syncStore for better separation of concerns.
 * Handles file compression, upload, download, and restore operations.
 */

import { supabase } from '@/lib/supabase';
import { syncGame, restoreGame } from '@/lib/tauri-games';
import { useAuthStore } from '@/stores/authStore';
import { useGamesStore, type Game } from '@/stores/gamesStore';
import {
  ensureCloudGameId,
  upsertGamePath,
  createSaveVersion,
  sha256Base64,
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
 * Compresses local save files and uploads to cloud storage.
 */
export async function executeSync(
  gameId: string,
  onProgress?: ProgressCallback
): Promise<SyncResult> {
  const startedAt = performance.now();

  try {
    onProgress?.(10, 'Compressing files...');

    // 1. Rust Compression
    const result = await syncGame(gameId);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    onProgress?.(50, 'Uploading to cloud...');

    // 2. Decode Base64 to Blob
    const blob = base64ToBlob(result.base64_data);

    // 3. Resolve user and game
    const user = useAuthStore.getState().user;
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    const game = useGamesStore.getState().games.find((g) => g.id === gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    // 4. Ensure cloud device + game exist
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

    await upsertGamePath({
      cloudGameId,
      deviceId: cloudDeviceId,
      localPath: game.local_path,
      syncEnabled: game.sync_enabled,
    });

    // 5. Compute checksum and check if upload needed
    const checksum = await sha256Base64(await blob.arrayBuffer());
    const latestCloudChecksum = await getLatestCloudChecksum(cloudGameId);

    if (latestCloudChecksum && latestCloudChecksum === checksum) {
      const durationMs = Math.round(performance.now() - startedAt);
      return {
        success: true,
        skipped: true,
        message: 'Content unchanged, sync skipped',
        durationMs,
        cloudGameId,
        deviceId: cloudDeviceId,
      };
    }

    // 6. Upload to Supabase Storage
    const versionId = crypto.randomUUID();
    const filePath = `${user.id}/${game.slug}/${versionId}.zip`;

    const { error: uploadError } = await supabase.storage
      .from('saves')
      .upload(filePath, blob, { upsert: false });

    if (uploadError) {
      return { success: false, message: uploadError.message };
    }

    onProgress?.(100, 'Sync complete!');

    // 7. Persist cloud metadata
    await createSaveVersion({
      id: versionId,
      cloudGameId,
      deviceId: cloudDeviceId,
      filePath,
      fileSize: blob.size,
      checksum,
      file_modified_at: result.file_modified_at,
    });

    const durationMs = Math.round(performance.now() - startedAt);

    return {
      success: true,
      message: 'Sync successful',
      fileSize: blob.size,
      checksum,
      versionId,
      durationMs,
      cloudGameId,
      deviceId: cloudDeviceId,
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
    const downloadPath = options.filePath || await findLatestBackupPath(user.id, game, gameId);
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
