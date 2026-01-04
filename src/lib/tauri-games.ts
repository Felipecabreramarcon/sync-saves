import { invoke } from '@tauri-apps/api/core'

export interface LocalGameDto {
  id: string
  name: string
  slug: string
  cover_url?: string
  platform: string
  local_path: string
  sync_enabled: boolean
  last_synced_id?: string
  status: string
  custom_script_path?: string
  analysis_config?: { target_path: string; tracked_keys: string[] }
}

export async function getAllGames(): Promise<LocalGameDto[]> {
  try {
    return await invoke<LocalGameDto[]>('get_all_games')
  } catch (error) {
    console.error('Failed to get games:', error)
    throw error
  }
}

export async function addGame(name: string, localPath: string, platform: string): Promise<LocalGameDto> {
   try {
     return await invoke<LocalGameDto>('add_game', { name, localPath, platform })
   } catch (error) {
     console.error('Failed to add game:', error)
     throw error
   }
}

export interface SyncResultDto {
  success: boolean
  file_name: string
  base64_data: string
  message: string
  file_modified_at: string
}

export async function syncGame(gameId: string): Promise<SyncResultDto> {
  try {
    return await invoke<SyncResultDto>('sync_game', { gameId })
  } catch (error) {
    console.error('Failed to sync game:', error)
    throw error
  }
}

export async function restoreGame(gameId: string, base64Data: string): Promise<boolean> {
  try {
    return await invoke<boolean>('restore_game', { gameId, base64Data })
  } catch (error) {
    console.error('Failed to restore game:', error)
    throw error
  }
}

export async function deleteGame(gameId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_game', { gameId })
  } catch (error) {
    console.error('Failed to delete game:', error)
    throw error
  }
}

export interface UpdateGameParams {
  name?: string
  local_path?: string
  platform?: string
  sync_enabled?: boolean
  cover_url?: string
  custom_script_path?: string
  analysis_config?: { target_path: string; tracked_keys: string[] }
}

export async function updateGame(gameId: string, updates: UpdateGameParams): Promise<LocalGameDto> {
  try {
    return await invoke<LocalGameDto>('update_game', { gameId, updates })
  } catch (error) {
    console.error('Failed to update game:', error)
    throw error
  }
}

export interface SilksongProgressDto {
  save_date?: string | null
  play_time_seconds?: number | null
  respawn_scene?: string | null
  map_zone?: number | null

  health?: number | null
  max_health?: number | null
  geo?: number | null
  silk?: number | null
  silk_max?: number | null
}

export interface SilksongStatsDto {
  user_dat_files: number
  restore_point_files: number
  decoded_json_files: number
  newest_save_mtime_ms?: number | null
  progress?: SilksongProgressDto | null
}

export interface GameSaveStatsDto {
  path: string
  exists: boolean
  is_dir: boolean
  file_count: number
  total_bytes: number
  newest_mtime_ms?: number | null
  silksong?: SilksongStatsDto | null
}

export async function getGameSaveStats(gameId: string): Promise<GameSaveStatsDto> {
  try {
    return await invoke<GameSaveStatsDto>('get_game_save_stats', { gameId })
  } catch (error) {
    console.error('Failed to get game save stats:', error)
    throw error
  }
}

export async function getVersionAnalysis(versionId: string): Promise<any | null> {
  try {
    const raw = await invoke<string | null>('get_version_analysis', { versionId })
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to get version analysis:', error)
    return null
  }
}

export async function saveVersionAnalysis(versionId: string, data: any): Promise<void> {
  try {
    const analysisData = JSON.stringify(data)
    await invoke('save_version_analysis', { versionId, analysisData })
  } catch (error) {
    console.error('Failed to save version analysis:', error)
  }
}
