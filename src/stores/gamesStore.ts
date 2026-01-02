import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAllGames, addGame as tauriAddGame } from '@/lib/tauri-games'

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
  
  // Actions
  setGames: (games: Game[]) => void
  updateGame: (id: string, updates: Partial<Game>) => void
  removeGame: (id: string) => void
  setActivities: (activities: SyncActivity[]) => void
  addActivity: (activity: SyncActivity) => void
  setLoading: (loading: boolean) => void
  setStats: (stats: { totalGames: number; totalSaves: number; activeDevices: number }) => void
  
  setSearchQuery: (query: string) => void
  addGame: (game: Omit<Game, 'id' | 'slug' | 'last_synced_at' | 'last_synced_version' | 'status'>) => Promise<void>
  loadGames: () => Promise<void>
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

      setGames: (games) => set({ games, totalGames: games.length }),
      
      updateGame: (id, updates) => set((state) => ({
        games: state.games.map((g) => (g.id === id ? { ...g, ...updates } : g))
      })),
      
      removeGame: (id) => set((state) => ({
        games: state.games.filter((g) => g.id !== id),
        totalGames: state.totalGames - 1
      })),
      
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
          // Check if running in Tauri environment
          const isTauri = window.__TAURI_INTERNALS__ !== undefined || !!import.meta.env.VITE_TAURI_ENV;
          
          if (isTauri) {
            const localGames = await getAllGames()
            const games: Game[] = localGames.map(g => ({
              ...g,
              platform: g.platform as any,
              status: g.status as any,
              last_synced_at: undefined, // Setup real date later
              last_synced_version: 0
            }))
            set({ games, totalGames: games.length })
          } else {
             // Mock data if web only & empty
             if (get().games.length === 0) {
                 // Keep existing or init specific mocks
             }
          }
        } catch (e) {
          console.error("Failed to load games", e)
        } finally {
            set({ isLoading: false })
        }
      },

      addGame: async (newGame) => {
        try {
            const isTauri = window.__TAURI_INTERNALS__ !== undefined || !!import.meta.env.VITE_TAURI_ENV;
            
            if (isTauri) {
                const added = await tauriAddGame(newGame.name, newGame.local_path, newGame.platform)
                const game: Game = {
                    ...added,
                    platform: added.platform as any,
                    status: 'idle',
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
        }
      },
    }),
    {
      name: 'games-storage',
    }
  )
)
