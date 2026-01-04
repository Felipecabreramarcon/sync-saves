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
  performRestore: (gameId: string, options?: { filePath?: string }) => Promise<void>
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
      const {
        ensureCloudGameId,
        upsertGamePath,
        getNextVersion,
        createSaveVersion,
        sha256Base64,
      } = await import('@/lib/cloudSync')
      const { registerCurrentDevice } = await import('@/lib/devices')

      // 0. Cooldown Check (e.g., 30 seconds to avoid spam)
      const lastSync = get().syncCooldowns[gameId] || 0
      const nowTs = Date.now()
      if (!options.force && (nowTs - lastSync < 30000)) {
        console.log(`Sync for ${gameId} skipped (cooldown active)`)
        return
      }

      set({ status: 'syncing', progress: 10, message: 'Compressing files...' })

      try {
        const startedAt = performance.now()

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

        const game = useGamesStore.getState().games.find(g => g.id === gameId)
        if (!game) throw new Error('Game not found')

        // Ensure cloud device + game exist (needed for FK + RLS)
        const device = await registerCurrentDevice(user.id)
        const cloudDeviceId = device?.id ?? null
        if (!cloudDeviceId) throw new Error('Failed to resolve current device')

        const cloudGameId = await ensureCloudGameId(user.id, {
          name: game.name,
          slug: game.slug,
          cover_url: game.cover_url,
        })

        await upsertGamePath({
          cloudGameId,
          deviceId: cloudDeviceId,
          localPath: game.local_path,
          syncEnabled: game.sync_enabled,
        })

        const version = await getNextVersion(cloudGameId)
        const timestamp = Date.now()
        const filePath = `${user.id}/${game.slug}/v${version}_${timestamp}.zip`

        const { error: uploadError } = await supabase.storage
          .from('saves')
          .upload(filePath, blob, {
            upsert: false
          })

        if (uploadError) throw uploadError

        // Update cooldown
        set(state => ({
          syncCooldowns: { ...state.syncCooldowns, [gameId]: Date.now() }
        }))

        set({ progress: 100, message: 'Sync complete!' })

        // 4. Persist cloud metadata
        const checksum = await sha256Base64(await blob.arrayBuffer())
        await createSaveVersion({
          cloudGameId,
          deviceId: cloudDeviceId,
          version,
          filePath,
          fileSize: blob.size,
          checksum,
          file_modified_at: result.file_modified_at, // Pass captured timestamp
        })

        const durationMs = Math.round(performance.now() - startedAt)

        // 5. Update Game State
        const now = new Date().toISOString()
        useGamesStore.getState().updateGame(gameId, {
          status: 'synced',
          last_synced_at: now
        })

        // 6. Centralized Logging
        await useGamesStore.getState().logActivity({
            gameId,
            cloudGameId,
            deviceId: cloudDeviceId,
            action: 'upload',
            status: 'success',
            version,
            message: 'Sync successful',
            durationMs,
            fileSize: blob.size
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

        // Always try to log error
        const user = useAuthStore.getState().user
        if (user && game) {
             const { ensureCloudGameId } = await import('@/lib/cloudSync')
             // Make best effort to resolve cloudGameId if possible, else skip or rely on optimistic
             try {
                const cloudGameId = await ensureCloudGameId(user.id, {
                    name: game.name,
                    slug: game.slug,
                    cover_url: game.cover_url,
                })
                await useGamesStore.getState().logActivity({
                    gameId,
                    cloudGameId,
                    action: 'upload',
                    status: 'error',
                    message: error.message || 'Sync failed',
                })
             } catch (ignored) {
                 // Fallback local only log if we can't get cloud ID
                 useGamesStore.getState().logActivity({
                    gameId,
                    action: 'upload',
                    status: 'error',
                    message: error.message || 'Sync failed',
                })
             }
        }
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

  performRestore: async (gameId: string, options = {}) => {
    const { restoreGame } = await import('@/lib/tauri-games')
    const { supabase } = await import('@/lib/supabase')
    const { useGamesStore } = await import('@/stores/gamesStore')
    const { useAuthStore } = await import('@/stores/authStore')
    const { ensureCloudGameId } = await import('@/lib/cloudSync')
    const { registerCurrentDevice } = await import('@/lib/devices')

    set({ status: 'syncing', progress: 10, message: 'Downloading from cloud...' })

    try {
      const startedAt = performance.now()
      const user = useAuthStore.getState().user
      if (!user) throw new Error('User not authenticated')

      const game = useGamesStore.getState().games.find(g => g.id === gameId)
      if (!game) throw new Error('Game not found')

      const device = await registerCurrentDevice(user.id)
      const cloudDeviceId = device?.id ?? null
      if (!cloudDeviceId) throw new Error('Failed to resolve current device')

      const cloudGameId = await ensureCloudGameId(user.id, {
        name: game.name,
        slug: game.slug,
        cover_url: game.cover_url,
      })

      // 1. Get file from storage
      let downloadPath: string
      if (options.filePath) {
        downloadPath = options.filePath
      } else {
        // Default behavior: latest file from storage.
        // Prefer slug-based folder, fallback to legacy gameId folder.
        const listFolder = async (prefix: string) => {
          return await supabase.storage
            .from('saves')
            .list(prefix, {
              limit: 1,
              sortBy: { column: 'name', order: 'desc' },
            })
        }

        let folderPrefix = `${user.id}/${game.slug}`
        let { data: files, error: listError } = await listFolder(folderPrefix)
        if (!listError && (!files || files.length === 0)) {
          folderPrefix = `${user.id}/${gameId}`
          ;({ data: files, error: listError } = await listFolder(folderPrefix))
        }

        if (listError) throw listError
        if (!files || files.length === 0) throw new Error('No backups found for this game')

        const latestFile = files[0]
        downloadPath = `${folderPrefix}/${latestFile.name}`
      }

      const { data: blob, error: downloadError } = await supabase.storage
        .from('saves')
        .download(downloadPath)

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

      const durationMs = Math.round(performance.now() - startedAt)

      // 4. Update Game State
      useGamesStore.getState().updateGame(gameId, {
        status: 'synced'
      })

      // 5. Centralized Logging
      await useGamesStore.getState().logActivity({
            gameId,
            cloudGameId,
            deviceId: cloudDeviceId,
            action: 'download',
            status: 'success',
            message: 'Successfully restored from cloud',
            durationMs,
            fileSize: blob.size
      })

      set({ status: 'success' })
      toast.success('Restore Complete', `${game.name} has been restored from the cloud`)
      setTimeout(() => set({ status: 'idle', progress: 0, message: '' }), 3000)

    } catch (error: any) {
      console.error('Restore failed:', error)
      set({ status: 'error', message: error.message || 'Restore failed' })
      
      const game = useGamesStore.getState().games.find(g => g.id === gameId)
      toast.error('Restore Failed', error.message || `Failed to restore ${game?.name || 'game'}`)

      // Error logging
      const user = useAuthStore.getState().user
      if (user && game) {
         try {
            const { ensureCloudGameId } = await import('@/lib/cloudSync')
            const cloudGameId = await ensureCloudGameId(user.id, {
                name: game.name,
                slug: game.slug,
                cover_url: game.cover_url,
            })
            await useGamesStore.getState().logActivity({
                    gameId,
                    cloudGameId,
                    action: 'download',
                    status: 'error',
                    message: error.message || 'Restore failed',
            })
         } catch (ignored) {
            useGamesStore.getState().logActivity({
                gameId,
                action: 'download',
                status: 'error',
                message: error.message || 'Restore failed',
            })
         }
      }
    }
  }
}))
