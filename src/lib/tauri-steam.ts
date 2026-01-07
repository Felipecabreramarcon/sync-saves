import { invoke } from '@tauri-apps/api/core';

export interface SteamSearchResultDto {
  id: number;
  name: string;
  cover_url?: string;
  price?: string;
}

export async function steamSearchGames(
  query: string
): Promise<SteamSearchResultDto[]> {
  try {
    return await invoke<SteamSearchResultDto[]>('steam_search_games', {
      query,
    });
  } catch (error) {
    console.error('Failed to search Steam games:', error);
    return [];
  }
}
