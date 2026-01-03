// Database types matching Supabase schema

export interface DeviceRow {
  id: string
  user_id: string
  name: string
  os: 'windows' | 'linux' | 'macos' | null
  machine_id: string | null
  last_seen_at: string
  created_at: string
}
export interface DeviceInsert {
  user_id: string
  name: string
  os?: 'windows' | 'linux' | 'macos' | null
  machine_id?: string | null
  last_seen_at?: string
}
export interface DeviceUpdate {
  name?: string
  os?: 'windows' | 'linux' | 'macos' | null
  machine_id?: string | null
  last_seen_at?: string
}

export interface GameRow {
  id: string
  user_id: string
  name: string
  slug: string
  cover_url: string | null
  created_at: string
  updated_at: string
}
export interface GameInsert {
  user_id: string
  name: string
  slug: string
  cover_url?: string | null
}
export interface GameUpdate {
  name?: string
  slug?: string
  cover_url?: string | null
}

export interface GamePathRow {
  id: string
  game_id: string
  device_id: string
  local_path: string
  sync_enabled: boolean
  last_synced_at: string | null
  last_synced_version: number | null
  created_at: string
  updated_at?: string
}
export interface GamePathInsert {
  game_id: string
  device_id: string
  local_path: string
  sync_enabled: boolean
  last_synced_at?: string | null
  last_synced_version?: number | null
  updated_at?: string
}
export interface GamePathUpdate {
  local_path?: string
  sync_enabled?: boolean
  last_synced_at?: string | null
  last_synced_version?: number | null
  updated_at?: string
}

export interface SaveVersionRow {
  id: string
  game_id: string
  device_id: string | null
  version: number
  file_path: string
  file_size: number
  checksum: string
  is_latest: boolean
  created_at: string
}
export interface SaveVersionInsert {
  game_id: string
  device_id: string | null
  version: number
  file_path: string
  file_size: number
  checksum: string
  is_latest: boolean
}
export interface SaveVersionUpdate {
  is_latest?: boolean
}

export interface SyncLogRow {
  id: string
  game_id: string
  device_id: string | null
  action: 'upload' | 'download' | 'conflict' | 'skip'
  version: number | null
  status: 'success' | 'error' | 'pending'
  message: string | null
  file_size?: number | null
  duration_ms: number | null
  created_at: string
}
export interface SyncLogInsert {
  game_id: string
  device_id: string | null
  action: 'upload' | 'download' | 'conflict' | 'skip'
  version: number | null
  status: 'success' | 'error' | 'pending'
  message: string | null
  file_size?: number | null
  duration_ms: number | null
}
export interface SyncLogUpdate {
  status?: 'success' | 'error' | 'pending'
  message?: string | null
}

export interface Database {
  public: {
    Tables: {
      devices: {
        Row: DeviceRow
        Insert: DeviceInsert
        Update: DeviceUpdate
      }
      games: {
        Row: GameRow
        Insert: GameInsert
        Update: GameUpdate
      }
      game_paths: {
        Row: GamePathRow
        Insert: GamePathInsert
        Update: GamePathUpdate
      }
      save_versions: {
        Row: SaveVersionRow
        Insert: SaveVersionInsert
        Update: SaveVersionUpdate
      }
      sync_logs: {
        Row: SyncLogRow
        Insert: SyncLogInsert
        Update: SyncLogUpdate
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility types
export type Device = DeviceRow
export type Game = GameRow
export type GamePath = GamePathRow
export type SaveVersion = SaveVersionRow
export type SyncLog = SyncLogRow
