import { create } from 'zustand';
import {
  getAllGames,
  addGame as tauriAddGame,
  deleteGame as tauriDeleteGame,
} from '@/lib/tauri-games';
import { isTauriRuntime } from '@/lib/utils';

export type SyncStatus =
  | 'synced'
  | 'syncing'
  | 'error'
  | 'pending'
  | 'idle'
  | 'not_configured';
export type SyncAction = 'upload' | 'download' | 'skip' | 'conflict';
export type GamePlatform = 'steam' | 'epic' | 'gog' | 'other';

export interface Game {
  id: string;
  name: string;
  slug: string;
  cover_url?: string;
  platform: GamePlatform;
  local_path: string;
  sync_enabled: boolean;
  last_synced_at?: string;
  last_synced_id?: string;
  status: SyncStatus;
  cloud_game_id?: string; // ID from cloud (Supabase games table)
  custom_script_path?: string;
  analysis_config?: {
    target_path: string; // Relative path or filename of the file to analyze within the save
    tracked_keys: string[]; // List of flattened keys to extract
  };
}

export interface SyncActivity {
  id: string;
  game_id: string;
  game_name: string;
  game_cover?: string;
  action: SyncAction;
  status: 'success' | 'error' | 'pending';
  save_version_id?: string;
  message?: string;
  created_at: string;
  device_name?: string;
}

interface GamesState {
  games: Game[];
  activities: SyncActivity[];
  isLoading: boolean;
  searchQuery: string;

  // Stats
  totalGames: number;
  totalSaves: number;
  activeDevices: number;
  storageUsage: number; // In bytes

  // Actions
  setGames: (games: Game[]) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  removeGame: (id: string) => Promise<void>;
  setActivities: (activities: SyncActivity[]) => void;
  addActivity: (activity: SyncActivity) => void;
  loadActivities: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setStats: (stats: {
    totalGames: number;
    totalSaves: number;
    activeDevices: number;
  }) => void;

  setSearchQuery: (query: string) => void;
  addGame: (
    game: Omit<
      Game,
      'id' | 'slug' | 'last_synced_at' | 'last_synced_id' | 'status'
    >
  ) => Promise<void>;
  loadGames: () => Promise<void>;
  loadCloudGames: () => Promise<void>;
  configureGamePath: (cloudGameId: string, localPath: string) => Promise<void>;
  refreshMetrics: () => Promise<void>;
  deviceName: string;
  setDeviceName: (name: string) => void;

  // Centralized Logging
  logActivity: (params: {
    gameId: string;
    action: SyncAction;
    status: 'success' | 'error' | 'pending';
    message?: string;
    save_version_id?: string;
    fileSize?: number;
    durationMs?: number;
    cloudGameId?: string;
    deviceId?: string;
  }) => Promise<void>;
}

export const useGamesStore = create<GamesState>((set, get) => ({
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

  updateGame: (id, updates) =>
    set((state) => ({
      games: state.games.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  removeGame: async (id) => {
    const game = get().games.find((g) => g.id === id);
    const cloudGameId = game?.cloud_game_id || game?.id;

    // Delete local DB records
    if (isTauriRuntime()) {
      try {
        await tauriDeleteGame(id);
      } catch (e) {
        console.error('Failed to delete game from DB:', e);
      }
    }

    // Delete cloud data if authenticated and has cloud_game_id
    const { useAuthStore } = await import('@/stores/authStore');
    const user = useAuthStore.getState().user;

    if (user && cloudGameId) {
      try {
        const { deleteGameCloudData } = await import('@/lib/cloudSync');
        await deleteGameCloudData({
          userId: user.id,
          cloudGameId: cloudGameId,
        });
      } catch (e) {
        console.error('Failed to delete cloud game data:', e);
        // Continue with local deletion even if cloud fails
      }
    }

    // Update local state
    set((state) => ({
      games: state.games.filter((g) => g.id !== id),
      totalGames: state.totalGames - 1,
      // Also filter out activities for this game
      activities: state.activities.filter(
        (a) => a.game_id !== cloudGameId && a.game_id !== id
      ),
    }));
  },

  setActivities: (activities) => set({ activities }),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 50),
    })),

  loadActivities: async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      const { fetchActivitiesFromCloud, sortAndDedupActivities } =
        await import('@/lib/cloudSync');
      const cloud = await fetchActivitiesFromCloud({
        userId: user.id,
        limit: 200,
      });
      const merged = sortAndDedupActivities([...cloud, ...get().activities]);
      set({ activities: merged.slice(0, 200) });
    } catch (e) {
      console.warn('Failed to load cloud activities:', e);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setStats: (stats) => set(stats),

  setSearchQuery: (query) => set({ searchQuery: query }),

  loadGames: async () => {
    set({ isLoading: true });
    try {
      if (isTauriRuntime()) {
        const localGames = await getAllGames();
        const games: Game[] = localGames.map((g) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          cover_url: g.cover_url,
          platform: g.platform as GamePlatform,
          local_path: g.local_path,
          sync_enabled: g.sync_enabled,
          status: g.status as SyncStatus,
          last_synced_at: undefined,
          last_synced_id: g.last_synced_id,
          custom_script_path: g.custom_script_path,
          analysis_config: g.analysis_config,
        }));
        set({ games, totalGames: games.length });
      }
    } catch (e) {
      console.error('Failed to load games', e);
    } finally {
      set({ isLoading: false });
    }
  },

  loadCloudGames: async () => {
    const { supabase } = await import('@/lib/supabase');
    const { useAuthStore } = await import('@/stores/authStore');
    const { registerCurrentDevice } = await import('@/lib/devices');

    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      // Get current device
      const device = await registerCurrentDevice(user.id);
      if (!device) return;

      // Fetch all games for user from cloud
      const { data: cloudGames, error: gamesError } = await (
        supabase.from('games') as any
      )
        .select('id, name, slug, cover_url')
        .eq('user_id', user.id);

      if (gamesError) throw gamesError;
      if (!cloudGames || cloudGames.length === 0) return;

      // Fetch game_paths for this device
      const { data: paths, error: pathsError } = await (
        supabase.from('game_paths') as any
      )
        .select('game_id, local_path, sync_enabled')
        .eq('device_id', device.id);

      if (pathsError) throw pathsError;

      const pathMap = new Map<
        string,
        { game_id: string; local_path: string; sync_enabled: boolean }
      >(paths?.map((p: any) => [p.game_id, p]) || []);
      const localGames = get().games;
      const localBySlug = new Map(localGames.map((g) => [g.slug, g]));

      // Merge: add cloud games not configured locally
      const newGames: Game[] = [];
      for (const cg of cloudGames) {
        const existingLocal = localBySlug.get(cg.slug);
        if (existingLocal) {
          // Already in local cache, update cloud_game_id if needed
          if (!existingLocal.cloud_game_id) {
            get().updateGame(existingLocal.id, { cloud_game_id: cg.id });
          }
          continue;
        }

        const pathInfo = pathMap.get(cg.id);
        if (pathInfo) {
          // Has path configured for this device, but not in local - add it
          newGames.push({
            id: cg.id, // Use cloud id for now
            cloud_game_id: cg.id,
            name: cg.name,
            slug: cg.slug,
            cover_url: cg.cover_url || undefined,
            platform: 'other' as GamePlatform,
            local_path: pathInfo.local_path,
            sync_enabled: pathInfo.sync_enabled,
            status: 'idle',
          });
        } else {
          // No path for this device - show as not_configured
          newGames.push({
            id: cg.id,
            cloud_game_id: cg.id,
            name: cg.name,
            slug: cg.slug,
            cover_url: cg.cover_url || undefined,
            platform: 'other' as GamePlatform,
            local_path: '',
            sync_enabled: true,
            status: 'not_configured',
          });
        }
      }

      if (newGames.length > 0) {
        set((state) => ({
          games: [...state.games, ...newGames],
          totalGames: state.games.length + newGames.length,
        }));
      }
    } catch (e) {
      console.error('Failed to load cloud games:', e);
    }
  },

  configureGamePath: async (cloudGameId: string, localPath: string) => {
    const { supabase } = await import('@/lib/supabase');
    const { useAuthStore } = await import('@/stores/authStore');
    const { registerCurrentDevice } = await import('@/lib/devices');
    const { addGame: tauriAddGameFn } = await import('@/lib/tauri-games');

    const user = useAuthStore.getState().user;
    if (!user) throw new Error('User not authenticated');

    const device = await registerCurrentDevice(user.id);
    if (!device) throw new Error('Failed to register device');

    const game = get().games.find(
      (g) => g.cloud_game_id === cloudGameId || g.id === cloudGameId
    );
    if (!game) throw new Error('Game not found');

    // Upsert game_path in cloud
    const { error: upsertError } = await (
      supabase.from('game_paths') as any
    ).upsert(
      {
        game_id: cloudGameId,
        device_id: device.id,
        local_path: localPath,
        sync_enabled: true,
      },
      { onConflict: 'game_id,device_id' }
    );

    if (upsertError) throw upsertError;

    // Add to local SQLite if Tauri runtime
    if (isTauriRuntime()) {
      try {
        await tauriAddGameFn(game.name, localPath, game.platform);
      } catch (e) {
        console.warn('Failed to add game to local DB:', e);
      }
    }

    // Update store
    get().updateGame(game.id, {
      local_path: localPath,
      status: 'idle',
    });
  },

  refreshMetrics: async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    const { fetchUserStorageStats } = await import('@/lib/cloudSync');
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      const { totalSaves, totalSize } = await fetchUserStorageStats(user.id);

      set({
        storageUsage: totalSize,
        totalSaves: totalSaves,
        totalGames: get().games.length,
      });
    } catch (e) {
      console.error('Failed to refresh metrics', e);
    }
  },

  addGame: async (newGame) => {
    try {
      if (isTauriRuntime()) {
        const added = await tauriAddGame(
          newGame.name,
          newGame.local_path,
          newGame.platform,
          newGame.cover_url
        );
        const game: Game = {
          id: added.id,
          name: added.name,
          slug: added.slug,
          cover_url: added.cover_url,
          platform: added.platform as GamePlatform,
          local_path: added.local_path,
          sync_enabled: added.sync_enabled,
          status: added.status as SyncStatus,
          last_synced_id: undefined,
          custom_script_path: added.custom_script_path,
          analysis_config: added.analysis_config,
        };
        set((state) => ({
          games: [...state.games, game],
          totalGames: state.totalGames + 1,
        }));
      } else {
        const game: Game = {
          ...newGame,
          id: Math.random().toString(36).substr(2, 9),
          slug: newGame.name.toLowerCase().replace(/\s+/g, '-'),
          status: 'idle',
          last_synced_id: undefined,
          sync_enabled: true,
        };
        set((state) => ({
          games: [...state.games, game],
          totalGames: state.totalGames + 1,
        }));
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  logActivity: async (params) => {
    const { createSyncLog } = await import('@/lib/cloudSync');
    const { registerCurrentDevice } = await import('@/lib/devices');
    const { useAuthStore } = await import('@/stores/authStore');

    const user = useAuthStore.getState().user;
    const game = get().games.find((g) => g.id === params.gameId);

    // Optimistic / Local activity entry
    const localId = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    get().addActivity({
      id: localId,
      game_id: params.cloudGameId || params.gameId,
      game_name: game?.name || 'Unknown Game',
      game_cover: game?.cover_url,
      action: params.action,
      status: params.status,
      save_version_id: params.save_version_id,
      message: params.message,
      created_at: now,
      device_name: get().deviceName,
    });

    // Cloud persistence (if user is logged in)
    if (user && params.cloudGameId) {
      try {
        // If deviceId not passed, try to resolve it
        let deviceId = params.deviceId;
        if (!deviceId) {
          const device = await registerCurrentDevice(user.id);
          deviceId = device?.id;
        }

        if (deviceId) {
          const insertedLog = await createSyncLog({
            cloudGameId: params.cloudGameId,
            deviceId: deviceId,
            action: params.action,
            save_version_id: params.save_version_id ?? null,
            status: params.status,
            message: params.message ?? null,
            durationMs: params.durationMs ?? null,
            fileSize: params.fileSize ?? null,
          });

          // Replace local optimistic log with authoritative one if successful
          if (insertedLog) {
            set((state) => ({
              activities: state.activities.map((a) =>
                a.id === localId
                  ? {
                      ...a,
                      id: insertedLog.id,
                      created_at: insertedLog.created_at,
                    }
                  : a
              ),
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to persist sync log to cloud:', e);
        // We keep the local one, but it won't have a real UUID.
      }
    }
  },
}));
