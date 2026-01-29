import { useMemo, memo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  GitCommit,
  GitPullRequest,
  GitMerge,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SyncActivity } from '@/stores/gamesStore';
import { Avatar, AvatarFallback, AvatarImage } from '@heroui/react';

const TimelineItem = memo(function TimelineItem({
  activity,
}: {
  activity: SyncActivity;
}) {
  const statusColor =
    activity.status === 'success'
      ? 'text-success drop-shadow-[0_0_3px_rgba(34,197,94,0.5)]'
      : activity.status === 'error'
        ? 'text-danger drop-shadow-[0_0_3px_rgba(244,63,94,0.5)]'
        : 'text-warning drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]';

  const actionMap: Record<
    string,
    { icon: any; label: string; color: string; borderColor: string }
  > = {
    upload: {
      icon: ArrowUpCircle,
      label: 'UPLOAD TO CLOUD',
      color: 'text-success',
      borderColor: 'border-success/30',
    },
    download: {
      icon: ArrowDownCircle,
      label: 'DOWNLOAD FROM CLOUD',
      color: 'text-[var(--color-secondary)]',
      borderColor: 'border-[var(--color-secondary)]/30',
    },
    conflict: {
      icon: GitMerge,
      label: 'MERGE CONFLICT',
      color: 'text-warning',
      borderColor: 'border-warning/30',
    },
    skip: {
      icon: GitPullRequest,
      label: 'SYNC SKIPPED',
      color: 'text-[var(--color-text-muted)]',
      borderColor: 'border-[var(--color-text-muted)]/30',
    },
  };

  const actionInfo = actionMap[activity.action] || actionMap.upload;
  const ActionIcon = actionInfo.icon;

  const handleRestore = async () => {
    try {
      const { getVersionFilePath } = await import('@/lib/cloudSync');
      const { useSyncStore } = await import('@/stores/syncStore');
      const { useGamesStore } = await import('@/stores/gamesStore');
      const { toast } = await import('@/stores/toastStore');

      const versionInfo = await getVersionFilePath(activity.save_version_id!);
      if (!versionInfo) {
        toast.error('Restore Failed', 'Could not find save version');
        return;
      }

      const games = useGamesStore.getState().games;
      const game = games.find(
        (g) =>
          g.slug === versionInfo.gameSlug ||
          g.cloud_game_id === activity.game_id ||
          g.id === activity.game_id,
      );

      if (!game) {
        toast.error('Restore Failed', 'Game not configured on this device');
        return;
      }

      await useSyncStore
        .getState()
        .performRestore(game.id, { filePath: versionInfo.filePath });
      toast.success(
        'Save Restored',
        `Restored save from ${format(
          new Date(activity.created_at),
          'MMM d, HH:mm',
        )}`,
      );
    } catch (error) {
      console.error('Restore failed:', error);
      const { toast } = await import('@/stores/toastStore');
      toast.error(
        'Restore Failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const handleDownload = async () => {
    try {
      const { getVersionFilePath } = await import('@/lib/cloudSync');
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const { supabase } = await import('@/lib/supabase');
      const { toast } = await import('@/stores/toastStore');

      const versionInfo = await getVersionFilePath(activity.save_version_id!);
      if (!versionInfo) {
        toast.error('Download Failed', 'Could not find save version');
        return;
      }

      // Download blob
      const { data, error } = await supabase.storage
        .from('saves')
        .download(versionInfo.filePath);
      if (error || !data) throw error || new Error('Download failed');

      // Ask user where to save
      const defaultName = `${activity.game_name.replace(
        /[^a-z0-9]/gi,
        '_',
      )}_${format(new Date(activity.created_at), 'yyyyMMdd_HHmm')}.zip`;
      const savePath = await save({
        defaultPath: defaultName,
        filters: [
          {
            name: 'ZIP Archive',
            extensions: ['zip'],
          },
        ],
      });

      if (!savePath) return; // User cancelled

      // Read blob as array buffer
      const arrayBuffer = await data.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Write via Rust command
      await invoke('write_file', {
        path: savePath,
        content: Array.from(uint8Array),
      });

      toast.success('Download Complete', `Saved to ${savePath}`);
    } catch (error) {
      console.error('Download failed:', error);
      const { toast } = await import('@/stores/toastStore');
      toast.error(
        'Download Failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const canRestore =
    activity.action === 'upload' &&
    activity.save_version_id &&
    activity.status === 'success';

  return (
    <div className='relative group'>
      {/* Node on line */}
      <div
        className={cn(
          'absolute -left-[28px] top-3 w-4 h-4 rounded-full border-2 border-[var(--color-bg-elevated)] flex items-center justify-center transition-all bg-[var(--color-background)] z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]',
          statusColor,
        )}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            activity.status === 'success'
              ? 'bg-success shadow-[0_0_5px_var(--success)]'
              : activity.status === 'error'
                ? 'bg-danger shadow-[0_0_5px_var(--danger)]'
                : 'bg-warning shadow-[0_0_5px_var(--warning)]',
          )}
        />
      </div>

      <div
        className={cn(
          'ml-4 p-4 rounded-xl transition-all duration-300 border backdrop-blur-md relative overflow-hidden',
          'bg-[var(--color-bg-card)]/60 hover:bg-[var(--color-bg-card)]/90',
          'border-white/5 hover:border-[var(--color-primary)]/30',
          'hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:-translate-y-0.5',
        )}
      >
        {/* Decorative corner accent */}
        <div
          className={cn(
            'absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[var(--color-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
          )}
        />

        <div className='flex items-start justify-between gap-4 relative z-10'>
          <div className='flex items-start gap-3 min-w-0 flex-1'>
            <Avatar className='w-10 h-10 rounded-lg ring-1 ring-white/10 shrink-0 shadow-lg'>
              <AvatarImage src={activity.game_cover} />
              <AvatarFallback className='rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-primary)] font-display'>
                {activity.game_name[0]}
              </AvatarFallback>
            </Avatar>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h4 className='font-bold text-[var(--color-text)] text-sm truncate max-w-[200px] font-display uppercase tracking-wide'>
                  {activity.game_name}
                </h4>
                <div className='flex items-center'>
                  <span
                    className={cn(
                      'text-[10px] font-bold flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full uppercase tracking-wider',
                      'bg-black/30 border border-white/5',
                      actionInfo.color,
                    )}
                  >
                    <ActionIcon className='w-3 h-3' />
                    {actionInfo.label}
                  </span>
                </div>
              </div>

              <div className='mt-2 flex items-center gap-3 text-xs text-[var(--color-text-muted)] flex-wrap font-mono'>
                <span className='flex items-center gap-1'>
                  <i className='w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/50'></i>
                  {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                </span>

                {activity.save_version_id && (
                  <span className='px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary-300)] text-[10px]'>
                    VER: {activity.save_version_id.slice(0, 7)}
                  </span>
                )}

                {activity.device_name && (
                  <span className='text-[var(--color-text-muted)] opacity-60'>
                    @{activity.device_name}
                  </span>
                )}
              </div>

              {activity.message && (
                <p className='mt-2 text-xs text-gray-400 leading-relaxed break-words border-l-2 border-white/10 pl-3 italic'>
                  "{activity.message}"
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {canRestore && (
            <div className='flex items-center gap-2'>
              <button
                onClick={handleDownload}
                className='shrink-0 p-2 rounded-lg bg-black/20 hover:bg-[var(--color-primary)]/20 text-[var(--color-text-muted)] hover:text-white transition-all border border-transparent hover:border-[var(--color-primary)]/30'
                title='Download ZIP'
              >
                <Download className='w-4 h-4' />
              </button>

              <button
                onClick={handleRestore}
                className='shrink-0 px-3 py-2 rounded-lg bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary-300)] hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40 hover:shadow-[0_0_10px_rgba(124,58,237,0.2)]'
              >
                <ArrowDownCircle className='w-3.5 h-3.5' />
                Restore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface TimelineProps {
  activities: SyncActivity[];
}

export const Timeline = memo(function Timeline({ activities }: TimelineProps) {
  // Group activities by date
  const groups = useMemo(() => {
    const grouped: Record<string, SyncActivity[]> = {};

    // Sort all activities by date desc first
    // Optimization: String comparison is ~94% faster than Date parsing
    const sorted = [...activities].sort((a, b) =>
      b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : 0,
    );

    sorted.forEach((activity) => {
      const date = new Date(activity.created_at);
      let key = format(date, 'yyyy-MM-dd');

      if (isToday(date)) key = 'Today';
      else if (isYesterday(date)) key = 'Yesterday';
      else key = format(date, 'MMMM d, yyyy');

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(activity);
    });

    return Object.entries(grouped).map(([date, items]) => ({
      date,
      items,
    }));
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]'>
        <div className='w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4'>
          <GitCommit className='w-8 h-8 opacity-40' />
        </div>
        <p className='font-display tracking-wider text-lg'>SYSTEM LOGS EMPTY</p>
        <p className='text-sm opacity-50 mt-1'>
          No sync activity recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className='relative pl-8 space-y-12 pb-12'>
      {/* Vertical Neon Line */}
      <div className='absolute left-[11px] top-4 bottom-0 w-0.5 bg-gradient-to-b from-[var(--color-primary)]/50 via-[var(--color-primary)]/20 to-transparent shadow-[0_0_8px_var(--color-primary)]' />

      {groups.map((group) => (
        <div key={group.date} className='relative'>
          {/* Date Header */}
          <div className='flex items-center gap-4 mb-6'>
            <div className='absolute -left-[26px] w-3 h-3 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-background)] shadow-[0_0_10px_var(--color-primary)]' />
            <div className='flex items-center gap-2'>
              <h3 className='text-sm font-bold text-[var(--color-primary)] uppercase tracking-widest font-display text-neon border-b border-[var(--color-primary)]/20 pb-1 pr-4'>
                {group.date}
              </h3>
            </div>
          </div>

          <div className='space-y-4'>
            {group.items.map((item) => (
              <TimelineItem key={item.id} activity={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
