import { memo, useCallback, useEffect, useState } from 'react';
import { Button, Tooltip, Dropdown } from '@heroui/react';
import {
  Folder,
  RefreshCw,
  Settings,
  CloudDownload,
  Trash2,
  MoreVertical,
  FolderOpen,
  FolderSearch,
  Clock,
  HardDrive,
  FileText,
  Cloud,
  Zap,
} from 'lucide-react';
import {
  type Game,
  type GamePlatform,
  useGamesStore,
} from '@/stores/gamesStore';
import { useSyncStore } from '@/stores/syncStore';
import { toast } from '@/stores/toastStore';
import GameSettingsModal from './GameSettingsModal';
import { getGameSaveStats, type GameSaveStatsDto } from '@/lib/tauri-games';
import { formatBytes, isTauriRuntime, timeAgo } from '@/lib/utils';
import { confirmRestore, confirmRemove } from '@/lib/confirm';

const platformConfig: Record<
  GamePlatform,
  { label: string; color: string; glow: string }
> = {
  steam: { label: 'STEAM', color: 'bg-blue-500', glow: 'shadow-blue-500/50' },
  epic: { label: 'EPIC', color: 'bg-slate-600', glow: 'shadow-slate-500/50' },
  gog: { label: 'GOG', color: 'bg-purple-600', glow: 'shadow-purple-500/50' },
  other: { label: 'OTHER', color: 'bg-gray-600', glow: 'shadow-gray-500/50' },
};

const statusConfig: Record<
  string,
  { color: string; glow: string; label: string; pulse?: boolean }
> = {
  synced: {
    color: 'bg-emerald-500',
    glow: 'shadow-emerald-500/60',
    label: 'Synced',
  },
  syncing: {
    color: 'bg-amber-500',
    glow: 'shadow-amber-500/60',
    label: 'Syncing',
    pulse: true,
  },
  error: { color: 'bg-rose-500', glow: 'shadow-rose-500/60', label: 'Error' },
  pending: {
    color: 'bg-gray-400',
    glow: 'shadow-gray-400/40',
    label: 'Pending',
  },
  idle: { color: 'bg-gray-500', glow: 'shadow-gray-500/40', label: 'Idle' },
  not_configured: {
    color: 'bg-amber-400',
    glow: 'shadow-amber-400/60',
    label: 'Setup Required',
  },
};

function formatPlayTime(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatHp(
  health?: number | null,
  maxHealth?: number | null,
): string | null {
  if (health == null || maxHealth == null) return null;
  if (!Number.isFinite(health) || !Number.isFinite(maxHealth)) return null;
  if (maxHealth <= 0) return null;
  return `HP ${health}/${maxHealth}`;
}

function formatResource(
  label: string,
  current?: number | null,
  max?: number | null,
): string | null {
  if (current == null) return null;
  if (!Number.isFinite(current)) return null;
  if (max != null && Number.isFinite(max) && max > 0) {
    return `${label} ${current}/${max}`;
  }
  return `${label} ${current}`;
}

async function openFolder(path: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_folder', { path });
}

function GameCard({ game }: { game: Game }) {
  const performSync = useSyncStore((state) => state.performSync);
  const performRestore = useSyncStore((state) => state.performRestore);
  const removeGame = useGamesStore((state) => state.removeGame);
  const configureGamePath = useGamesStore((state) => state.configureGamePath);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfiguringPath, setIsConfiguringPath] = useState(false);
  const [saveStats, setSaveStats] = useState<
    GameSaveStatsDto | null | undefined
  >(undefined);

  const isTauri = isTauriRuntime();

  const isSyncing = game.status === 'syncing';
  const isNotConfigured = game.status === 'not_configured';
  const platform = platformConfig[game.platform];
  const status = statusConfig[game.status] ?? statusConfig.idle;

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    setSaveStats(undefined);

    (async () => {
      try {
        const stats = await getGameSaveStats(game.id);
        if (!cancelled) setSaveStats(stats);
      } catch {
        if (!cancelled) setSaveStats(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [game.id, game.local_path]);

  const handleSync = useCallback(async () => {
    try {
      await performSync(game.id);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }, [game.id, performSync]);

  const handleRestore = useCallback(async () => {
    const confirmed = await confirmRestore(game.name);
    if (!confirmed) return;

    try {
      await performRestore(game.id);
      toast.success(
        'Restore Complete',
        `${game.name} saves restored from cloud`,
      );
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(
        'Restore Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }, [game.id, game.name, performRestore]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmRemove(game.name);
    if (!confirmed) return;

    try {
      await removeGame(game.id);
      toast.success('Game Removed', `${game.name} is no longer being tracked`);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(
        'Remove Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }, [game.id, game.name, removeGame]);

  const handleOpenFolder = useCallback(async () => {
    try {
      await openFolder(game.local_path);
    } catch (error) {
      console.error('Failed to open folder:', error);
      toast.error(
        'Could not open folder',
        'Make sure the path exists and is accessible',
      );
    }
  }, [game.local_path]);

  const handleConfigurePath = useCallback(async () => {
    if (!isTauri) {
      toast.error(
        'Configuration Error',
        'Path selection only available in desktop app',
      );
      return;
    }

    setIsConfiguringPath(true);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: `Select save folder for ${game.name}`,
      });

      if (selected && typeof selected === 'string') {
        const cloudId = game.cloud_game_id || game.id;
        await configureGamePath(cloudId, selected);
        toast.success('Path Configured', `${game.name} is now ready to sync`);
      }
    } catch (error) {
      console.error('Failed to configure path:', error);
      toast.error(
        'Configuration Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsConfiguringPath(false);
    }
  }, [game.id, game.cloud_game_id, game.name, isTauri, configureGamePath]);

  const handleDropdownAction = useCallback(
    (key: React.Key) => {
      switch (key) {
        case 'open':
          handleOpenFolder();
          break;
        case 'settings':
          setIsSettingsOpen(true);
          break;
        case 'delete':
          handleDelete();
          break;
      }
    },
    [handleOpenFolder, handleDelete],
  );

  return (
    <>
      <div className='relative bg-bg-card border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden group cursor-pointer transition-all duration-300 hover:border-primary-500/40 hover:shadow-xl hover:shadow-primary-500/10'>
        {/* Cover Image */}
        <div className='relative h-36 overflow-hidden'>
          {game.cover_url ? (
            <img
              src={game.cover_url}
              alt={game.name}
              className='w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105'
            />
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-primary-900/30 via-bg-elevated to-primary-800/20 flex items-center justify-center'>
              <span className='text-white/10 font-display text-3xl uppercase tracking-[0.15em] select-none'>
                {game.name.slice(0, 3)}
              </span>
            </div>
          )}

          {/* Gradient overlays */}
          <div className='absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent pointer-events-none' />
          <div className='absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg-card to-transparent pointer-events-none' />

          {/* Platform badge */}
          <span
            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider ${platform.color} shadow-lg`}
          >
            {platform.label}
          </span>

          {/* Status indicator */}
          <div className='absolute top-2.5 left-2.5 flex items-center gap-1.5'>
            <span className='relative flex h-2 w-2'>
              {status.pulse && (
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.color} opacity-75`}
                />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${status.color}`}
              />
            </span>
            <span className='text-[10px] font-semibold text-white/80 uppercase tracking-wide drop-shadow-md'>
              {status.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className='flex flex-col flex-1 p-4'>
          {/* Title */}
          <h3 className='font-bold text-white text-base leading-tight truncate mb-1'>
            {game.name}
          </h3>

          {/* Path */}
          <button
            onClick={handleOpenFolder}
            type='button'
            className='flex items-center gap-1.5 mb-3 group/path cursor-pointer text-left'
          >
            <Folder className='w-3 h-3 text-gray-500 shrink-0 group-hover/path:text-primary-400 transition-colors' />
            <span className='text-[11px] text-gray-500 font-mono truncate group-hover/path:text-gray-300 transition-colors'>
              {game.local_path}
            </span>
          </button>

          {/* Stats Section */}
          {isTauri && (
            <div className='rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 mb-3'>
              <div className='flex items-center gap-1.5 mb-1.5'>
                <HardDrive className='w-3 h-3 text-primary-400' />
                <span className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
                  Local
                </span>
              </div>

              {saveStats === undefined ? (
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 border border-primary-500 border-t-transparent rounded-full animate-spin' />
                  <span className='text-[11px] text-gray-500'>Scanning...</span>
                </div>
              ) : saveStats === null ? (
                <p className='text-[11px] text-gray-500'>Stats unavailable</p>
              ) : !saveStats.exists || !saveStats.is_dir ? (
                <p className='text-[11px] text-amber-400/80'>
                  Folder not found
                </p>
              ) : (
                <div className='flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-gray-400'>
                  <span className='flex items-center gap-1'>
                    <FileText className='w-3 h-3 text-gray-500' />
                    {saveStats.file_count} files
                  </span>
                  <span className='text-gray-600'>•</span>
                  <span>
                    {formatBytes(saveStats.total_bytes, { empty: '0 B' })}
                  </span>
                  {saveStats.newest_mtime_ms && (
                    <>
                      <span className='text-gray-600'>•</span>
                      <span className='flex items-center gap-1'>
                        <Clock className='w-3 h-3 text-gray-500' />
                        {timeAgo(saveStats.newest_mtime_ms, {
                          empty: 'Unknown',
                        })}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Silksong special */}
              {saveStats && saveStats.silksong && (
                <div className='mt-2 pt-2 border-t border-white/5'>
                  <div className='flex items-center gap-1.5 mb-1'>
                    <Zap className='w-3 h-3 text-amber-400' />
                    <span className='text-[10px] font-bold text-amber-400/80 uppercase tracking-wider'>
                      Silksong
                    </span>
                  </div>
                  <p className='text-[11px] text-gray-400'>
                    {saveStats.silksong.user_dat_files} slots •{' '}
                    {saveStats.silksong.restore_point_files} restore files
                    {saveStats.silksong.progress &&
                      (() => {
                        const p = saveStats.silksong?.progress;
                        const play = formatPlayTime(p?.play_time_seconds);
                        const hp = formatHp(p?.health, p?.max_health);
                        const geo = formatResource('Geo', p?.geo, null);
                        const bits = [play, hp, geo].filter(Boolean);
                        return bits.length ? ` • ${bits.join(' • ')}` : '';
                      })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className='flex-1' />

          {/* Footer: Sync info + actions */}
          <div className='flex items-center justify-between border-t border-white/5 pt-3 gap-2'>
            <div className='flex items-center gap-2 min-w-0'>
              <Cloud className='w-4 h-4 text-primary-400 shrink-0' />
              <div className='min-w-0'>
                <p className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>
                  Last Sync
                </p>
                <p className='text-[11px] text-gray-300 font-medium truncate'>
                  {timeAgo(game.last_synced_at, { empty: 'Never' })}
                  {game.last_synced_id && (
                    <span className='ml-1.5 bg-white/5 px-1 py-0.5 rounded text-[9px] text-gray-500 font-mono'>
                      {game.last_synced_id.slice(0, 8)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className='flex items-center gap-1 shrink-0'>
              {isNotConfigured ? (
                <Button
                  size='sm'
                  variant='primary'
                  className='shadow-lg shadow-primary-500/20'
                  onPress={handleConfigurePath}
                  isDisabled={isConfiguringPath}
                >
                  <FolderSearch className='w-4 h-4' />
                  Configure
                </Button>
              ) : (
                <>
                  <Tooltip closeDelay={0}>
                    <Tooltip.Trigger>
                      <Button
                        isIconOnly
                        size='sm'
                        variant='ghost'
                        onPress={handleSync}
                        isDisabled={isSyncing}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            isSyncing ? 'animate-spin text-primary-400' : ''
                          }`}
                        />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Sync Now</Tooltip.Content>
                  </Tooltip>
                  <Tooltip closeDelay={0}>
                    <Tooltip.Trigger>
                      <Button
                        isIconOnly
                        size='sm'
                        variant='ghost'
                        onPress={handleRestore}
                        isDisabled={isSyncing}
                      >
                        <CloudDownload className='w-4 h-4' />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Restore from Cloud</Tooltip.Content>
                  </Tooltip>
                </>
              )}
              <Dropdown>
                <Dropdown.Trigger>
                  <div
                    role='button'
                    className='flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-gray-400 hover:text-white'
                  >
                    <MoreVertical className='w-4 h-4' />
                  </div>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu
                    aria-label='Game actions'
                    onAction={handleDropdownAction}
                  >
                    <Dropdown.Item id='open' textValue='Open Folder'>
                      <div className='flex items-center gap-2'>
                        <FolderOpen className='w-4 h-4' />
                        <span>Open Folder</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id='settings' textValue='Settings'>
                      <div className='flex items-center gap-2'>
                        <Settings className='w-4 h-4' />
                        <span>Settings</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id='delete'
                      textValue='Remove Game'
                      className='text-danger'
                    >
                      <div className='flex items-center gap-2'>
                        <Trash2 className='w-4 h-4' />
                        <span>Remove Game</span>
                      </div>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      {/* Game Settings Modal */}
      <GameSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        game={game}
      />
    </>
  );
}

export default memo(GameCard);
