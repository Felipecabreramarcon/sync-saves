import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAllGames, addGame as tauriAddGame, deleteGame as tauriDeleteGame } from '@/lib/tauri-games'

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'pending' | 'idle'
export type SyncAction = 'upload' | 'download' | 'skip' | 'conflict'
export type GamePlatform = 'steam' | 'epic' | 'gog' | 'other'

export interface Game {
  id: string
  name: string
  slug: string
  cover_url?: string
  platform: GamePlatform
  local_path: string
  sync_enabled: boolean
  last_synced_at?: string
  last_synced_version?: number
  status: SyncStatus
}

export interface SyncActivity {
  id: string
  game_id: string
  game_name: string
  game_cover?: string
  action: SyncAction
  status: 'success' | 'error' | 'pending'
  version?: number
  message?: string
  created_at: string
  device_name?: string
}

interface GamesState {
  games: Game[]
  activities: SyncActivity[]
  isLoading: boolean
  searchQuery: string
  
  // Stats
  totalGames: number
  totalSaves: number
  activeDevices: number
  storageUsage: number // In bytes
  
  // Actions
  setGames: (games: Game[]) => void
  updateGame: (id: string, updates: Partial<Game>) => void
  removeGame: (id: string) => Promise<void>
  setActivities: (activities: SyncActivity[]) => void
  addActivity: (activity: SyncActivity) => void
  setLoading: (loading: boolean) => void
  setStats: (stats: { totalGames: number; totalSaves: number; activeDevices: number }) => void
  
  setSearchQuery: (query: string) => void
  addGame: (game: Omit<Game, 'id' | 'slug' | 'last_synced_at' | 'last_synced_version' | 'status'>) => Promise<void>
  loadGames: () => Promise<void>
  refreshMetrics: () => Promise<void>
  deviceName: string
  setDeviceName: (name: string) => void
}

export const useGamesStore = create<GamesState>()(
  persist(
    (set, get) => ({
      games: [],
      activities: [],
      isLoading: false,
      searchQuery: '',
      totalGames: 0,
      totalSaves: 0,
      activeDevices: 1,
      storageUsage: 0,
      deviceName: 'My Device',

      setDeviceName: (name) => set({ deviceName: name }),

      setGames: (games) => set({ games, totalGames: games.length }),
      
      updateGame: (id, updates) => set((state) => ({
        games: state.games.map((g) => (g.id === id ? { ...g, ...updates } : g))
      })),
      
      removeGame: async (id) => {
        const isTauri = window.__TAURI_INTERNALS__ !== undefined
        if (isTauri) {
          try {
            await tauriDeleteGame(id)
          } catch (e) {
            console.error('Failed to delete game from DB:', e)
          }
        }
        set((state) => ({
          games: state.games.filter((g) => g.id !== id),
          totalGames: state.totalGames - 1
        }))
      },
      
      setActivities: (activities) => set({ activities }),
      
      addActivity: (activity) => set((state) => ({
        activities: [activity, ...state.activities].slice(0, 50)
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setStats: (stats) => set(stats),
      
      setSearchQuery: (query) => set({ searchQuery: query }),

      loadGames: async () => {
        set({ isLoading: true })
        try {
          const isTauri = window.__TAURI_INTERNALS__ !== undefined;
          
          if (isTauri) {
            const localGames = await getAllGames()
            const games: Game[] = localGames.map(g => ({
              id: g.id,
              name: g.name,
              slug: g.slug,
              cover_url: g.cover_url,
              platform: g.platform as GamePlatform,
              local_path: g.local_path,
              sync_enabled: g.sync_enabled,
              status: g.status as SyncStatus,
              last_synced_at: undefined,
              last_synced_version: 0
            }))
            set({ games, totalGames: games.length })
          }
        } catch (e) {
          console.error("Failed to load games", e)
        } finally {
            set({ isLoading: false })
        }
      },

      refreshMetrics: async () => {
        const { supabase } = await import('@/lib/supabase')
        const { useAuthStore } = await import('@/stores/authStore')
        const user = useAuthStore.getState().user
        if (!user) return

        try {
          const { data: userFolders, error: foldersError } = await supabase.storage
            .from('saves')
            .list(user.id)

          if (foldersError) throw foldersError
          if (!userFolders) return

          let totalSize = 0
          let totalFiles = 0

          for (const folder of userFolders) {
            const { data: files, error: filesError } = await supabase.storage
              .from('saves')
              .list(`${user.id}/${folder.name}`)

            if (filesError) continue
            if (files) {
              totalFiles += files.length
              totalSize += files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0)
            }
          }

          set({ 
            storageUsage: totalSize, 
            totalSaves: totalFiles,
            totalGames: get().games.length 
          })
        } catch (e) {
          console.error("Failed to refresh metrics", e)
        }
      },

      addGame: async (newGame) => {
        try {
            const isTauri = window.__TAURI_INTERNALS__ !== undefined;
            if (isTauri) {
                const added = await tauriAddGame(newGame.name, newGame.local_path, newGame.platform)
                const game: Game = {
                    id: added.id,
                    name: added.name,
                    slug: added.slug,
                    cover_url: added.cover_url,
                    platform: added.platform as GamePlatform,
                    local_path: added.local_path,
                    sync_enabled: added.sync_enabled,
                    status: added.status as SyncStatus,
                    last_synced_version: 0
                }
                set(state => ({
                    games: [...state.games, game],
                    totalGames: state.totalGames + 1
                }))
            } else {
                const game: Game = {
                    ...newGame,
                    id: Math.random().toString(36).substr(2, 9),
                    slug: newGame.name.toLowerCase().replace(/\s+/g, '-'),
                    status: 'idle',
                    last_synced_version: 0,
                    sync_enabled: true
                }
                set((state) => ({
                    games: [...state.games, game],
                    totalGames: state.totalGames + 1,
                }))
            }
        } catch (e) {
            console.error(e)
            throw e
        }
      },
    }),
    {
      name: 'games-storage',
    }
  )
)
