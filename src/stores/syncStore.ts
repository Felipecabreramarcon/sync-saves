import { create } from 'zustand'
import { toast } from './toastStore'

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'success'
  progress: number
  message: string
  isBackendConnected: boolean
  syncCooldowns: Record<string, number> // gameId -> lastSyncTimestamp
  
  setStatus: (status: SyncState['status']) => void
  setProgress: (progress: number) => void
  setMessage: (message: string) => void
  setBackendConnected: (connected: boolean) => void
  performSync: (gameId: string, options?: { force?: boolean }) => Promise<void>
  performRestore: (gameId: string) => Promise<void>
}

// Map to store timeout IDs for debouncing per game
const syncDebounceTimers: Record<string, any> = {}

export const useSyncStore = create<SyncState>()((set, get) => ({
  status: 'idle',
  progress: 0,
  message: '',
  isBackendConnected: false,
  syncCooldowns: {},

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setMessage: (message) => set({ message }),
  setBackendConnected: (isBackendConnected) => set({ isBackendConnected }),

  performSync: async (gameId: string, options = {}) => {
    // Clear any existing debounce timer for this game
    if (syncDebounceTimers[gameId]) {
      clearTimeout(syncDebounceTimers[gameId])
      delete syncDebounceTimers[gameId]
    }

    // Wrap the actual sync logic to be called after debounce
    const executeSync = async () => {
      const { syncGame } = await import('@/lib/tauri-games')
      const { supabase } = await import('@/lib/supabase')
      const { useGamesStore } = await import('@/stores/gamesStore')
      const { useAuthStore } = await import('@/stores/authStore')

      // 0. Cooldown Check (e.g., 30 seconds to avoid spam)
      const lastSync = get().syncCooldowns[gameId] || 0
      const nowTs = Date.now()
      if (!options.force && (nowTs - lastSync < 30000)) {
        console.log(`Sync for ${gameId} skipped (cooldown active)`)
        return
      }

      set({ status: 'syncing', progress: 10, message: 'Compressing files...' })

      try {
        // 1. Rust Compression
        const result = await syncGame(gameId)
        if (!result.success) throw new Error(result.message)

        set({ progress: 50, message: 'Uploading to cloud...' })

        // 2. Decode Base64 to Blob
        const byteCharacters = atob(result.base64_data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/zip' })

        // 3. Upload to Supabase
        const user = useAuthStore.getState().user
        if (!user) throw new Error('User not authenticated')

        const filePath = `${user.id}/${gameId}/${result.file_name}`
        const { error: uploadError } = await supabase.storage
          .from('saves')
          .upload(filePath, blob, {
            upsert: true
          })

        if (uploadError) throw uploadError

        // Update cooldown
        set(state => ({
          syncCooldowns: { ...state.syncCooldowns, [gameId]: Date.now() }
        }))

        set({ progress: 100, message: 'Sync complete!' })

        // 4. Update Game State
        const now = new Date().toISOString()
        useGamesStore.getState().updateGame(gameId, {
          status: 'synced',
          last_synced_at: now
        })

        // 5. Add Activity
        const game = useGamesStore.getState().games.find(g => g.id === gameId)
        useGamesStore.getState().addActivity({
          id: Math.random().toString(36).substr(2, 9),
          game_id: gameId,
          game_name: game?.name || 'Unknown Game',
          game_cover: game?.cover_url,
          action: 'upload',
          status: 'success',
          created_at: now,
          device_name: useGamesStore.getState().deviceName,
          message: 'Sync successful'
        })

        set({ status: 'success' })
        toast.success('Sync Complete', `${game?.name || 'Game'} has been backed up to the cloud`)
        setTimeout(() => set({ status: 'idle', progress: 0, message: '' }), 3000)

      } catch (error: any) {
        console.error('Sync failed:', error)
        set({ status: 'error', message: error.message || 'Sync failed' })
        
        const game = useGamesStore.getState().games.find(g => g.id === gameId)
        toast.error('Sync Failed', error.message || `Failed to sync ${game?.name || 'game'}`)
        
        useGamesStore.getState().updateGame(gameId, { status: 'error' })
        useGamesStore.getState().addActivity({
          id: Math.random().toString(36).substr(2, 9),
          game_id: gameId,
          game_name: game?.name || 'Unknown Game',
          game_cover: game?.cover_url,
          action: 'upload',
          status: 'error',
          created_at: new Date().toISOString(),
          device_name: useGamesStore.getState().deviceName,
          message: error.message || 'Sync failed'
        })
      }
    }

    if (options.force) {
      await executeSync()
    } else {
      // Debounce: Wait 5 seconds of inactivity before syncing
      set({ message: 'Sync scheduled...' })
      syncDebounceTimers[gameId] = setTimeout(executeSync, 5000)
    }
  },

  performRestore: async (gameId: string) => {
    const { restoreGame } = await import('@/lib/tauri-games')
    const { supabase } = await import('@/lib/supabase')
    const { useGamesStore } = await import('@/stores/gamesStore')
    const { useAuthStore } = await import('@/stores/authStore')

    set({ status: 'syncing', progress: 10, message: 'Downloading from cloud...' })

    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('User not authenticated')

      const game = useGamesStore.getState().games.find(g => g.id === gameId)
      if (!game) throw new Error('Game not found')

      // 1. Get latest file from storage
      const { data: files, error: listError } = await supabase.storage
        .from('saves')
        .list(`${user.id}/${gameId}`, {
          limit: 1,
          sortBy: { column: 'name', order: 'desc' },
        })

      if (listError) throw listError
      if (!files || files.length === 0) throw new Error('No backups found for this game')

      const latestFile = files[0]
      const { data: blob, error: downloadError } = await supabase.storage
        .from('saves')
        .download(`${user.id}/${gameId}/${latestFile.name}`)

      if (downloadError) throw downloadError

      set({ progress: 50, message: 'Extracting save...' })

      // 2. Convert Blob to Base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1]
          resolve(base64data)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(blob)
      const b64 = await base64Promise

      // 3. Rust Restore
      const success = await restoreGame(gameId, b64)
      if (!success) throw new Error('Restoration failed')

      set({ progress: 100, message: 'Restore complete!' })

      // 4. Update Game State
      useGamesStore.getState().updateGame(gameId, {
        status: 'synced'
      })

      // 5. Add Activity
      useGamesStore.getState().addActivity({
        id: Math.random().toString(36).substr(2, 9),
        game_id: gameId,
        game_name: game.name,
        game_cover: game.cover_url,
        action: 'download',
        status: 'success',
        created_at: new Date().toISOString(),
        device_name: useGamesStore.getState().deviceName,
        message: 'Successfully restored from cloud'
      })

      set({ status: 'success' })
      toast.success('Restore Complete', `${game.name} has been restored from the cloud`)
      setTimeout(() => set({ status: 'idle', progress: 0, message: '' }), 3000)

    } catch (error: any) {
      console.error('Restore failed:', error)
      set({ status: 'error', message: error.message || 'Restore failed' })
      
      const game = useGamesStore.getState().games.find(g => g.id === gameId)
      toast.error('Restore Failed', error.message || `Failed to restore ${game?.name || 'game'}`)
      
      useGamesStore.getState().addActivity({
        id: Math.random().toString(36).substr(2, 9),
        game_id: gameId,
        game_name: game?.name || 'Unknown Game',
        game_cover: game?.cover_url,
        action: 'download',
        status: 'error',
        created_at: new Date().toISOString(),
        device_name: useGamesStore.getState().deviceName,
        message: error.message || 'Restore failed'
      })
    }
  }
}))
