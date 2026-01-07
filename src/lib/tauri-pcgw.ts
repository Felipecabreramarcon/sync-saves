import { invoke } from '@tauri-apps/api/core';

export interface PcgwSearchResultDto {
  title: string;
  pageid: number;
}

export interface PcgwSavePathDto {
  os: string;
  raw: string;
  expanded?: string | null;
}

export interface PcgwSaveLocationsDto {
  title: string;
  paths: PcgwSavePathDto[];
  cover_url?: string;
}

export async function pcgwSearchGames(
  query: string,
  limit = 8
): Promise<PcgwSearchResultDto[]> {
  return await invoke<PcgwSearchResultDto[]>('pcgw_search_games', {
    query,
    limit,
  });
}

export async function pcgwGetSaveLocations(
  title: string
): Promise<PcgwSaveLocationsDto> {
  return await invoke<PcgwSaveLocationsDto>('pcgw_get_save_locations', {
    title,
  });
}
