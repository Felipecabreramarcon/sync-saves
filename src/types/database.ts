// Database types matching Supabase schema
export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string
          user_id: string
          name: string
          os: 'windows' | 'linux' | 'macos' | null
          machine_id: string | null
          last_seen_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
          os?: 'windows' | 'linux' | 'macos' | null
          machine_id?: string | null
          last_seen_at?: string
        }
        Update: {
          name?: string
          os?: 'windows' | 'linux' | 'macos' | null
          machine_id?: string | null
          last_seen_at?: string
        }
      }
      games: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          cover_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['games']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['games']['Insert']>
      }
      game_paths: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['game_paths']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['game_paths']['Insert']>
      }
      save_versions: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['save_versions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['save_versions']['Insert']>
      }
      sync_logs: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['sync_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sync_logs']['Insert']>
      }
    }
  }
}

// Utility types
export type Device = Database['public']['Tables']['devices']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type GamePath = Database['public']['Tables']['game_paths']['Row']
export type SaveVersion = Database['public']['Tables']['save_versions']['Row']
export type SyncLog = Database['public']['Tables']['sync_logs']['Row']
