import { invoke } from '@tauri-apps/api/core'

export interface LocalGameDto {
  id: string
  name: string
  slug: string
  cover_url?: string
  platform: string
  local_path: string
  sync_enabled: boolean
  status: string
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
}

export async function updateGame(gameId: string, updates: UpdateGameParams): Promise<LocalGameDto> {
  try {
    return await invoke<LocalGameDto>('update_game', { gameId, updates })
  } catch (error) {
    console.error('Failed to update game:', error)
    throw error
  }
}
