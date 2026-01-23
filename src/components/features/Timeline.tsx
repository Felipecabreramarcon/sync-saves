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

const TimelineItem = memo(function TimelineItem({ activity }: { activity: SyncActivity }) {
  const statusColor =
    activity.status === 'success'
      ? 'text-success'
      : activity.status === 'error'
      ? 'text-danger'
      : 'text-warning';

  const actionMap: Record<string, { icon: any; label: string; color: string }> =
    {
      upload: {
        icon: ArrowUpCircle,
        label: 'Pushed to cloud',
        color: 'text-success',
      },
      download: {
        icon: ArrowDownCircle,
        label: 'Pulled from cloud',
        color: 'text-info',
      },
      conflict: {
        icon: GitMerge,
        label: 'Merge conflict',
        color: 'text-warning',
      },
      skip: {
        icon: GitPullRequest,
        label: 'Skipped sync',
        color: 'text-gray-400',
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
          g.id === activity.game_id
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
          'MMM d, HH:mm'
        )}`
      );
    } catch (error) {
      console.error('Restore failed:', error);
      const { toast } = await import('@/stores/toastStore');
      toast.error(
        'Restore Failed',
        error instanceof Error ? error.message : 'Unknown error'
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
        '_'
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
        error instanceof Error ? error.message : 'Unknown error'
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
          'absolute -left-[26px] top-3 w-4 h-4 rounded-full border-2 border-bg-main flex items-center justify-center transition-all bg-bg-elevated/50 z-10',
          statusColor
        )}
      >
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            activity.status === 'success'
              ? 'bg-success'
              : activity.status === 'error'
              ? 'bg-danger'
              : 'bg-warning'
          )}
        />
      </div>

      <div className='ml-4 p-4 rounded-xl bg-bg-elevated/20 border border-white/5 hover:bg-bg-elevated/30 hover:border-white/10 transition-all'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-3 min-w-0 flex-1'>
            <Avatar className='w-10 h-10 rounded-lg ring-1 ring-white/10 shrink-0'>
              <AvatarImage src={activity.game_cover} />
              <AvatarFallback className='rounded-lg'>
                {activity.game_name[0]}
              </AvatarFallback>
            </Avatar>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h4 className='font-bold text-white text-sm truncate max-w-[180px]'>
                  {activity.game_name}
                </h4>
                <span
                  className={cn(
                    'text-xs font-medium flex items-center gap-1 shrink-0',
                    actionInfo.color
                  )}
                >
                  <ActionIcon className='w-3 h-3' />
                  {actionInfo.label}
                </span>
              </div>

              <div className='mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap'>
                <span className='font-mono'>
                  {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                </span>
                {activity.save_version_id && (
                  <span className='px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] font-mono'>
                    {activity.save_version_id.slice(0, 8)}
                  </span>
                )}
                {activity.device_name && (
                  <span className='text-gray-600'>
                    via {activity.device_name}
                  </span>
                )}
              </div>

              {activity.message && (
                <p className='mt-2 text-xs text-gray-400 leading-relaxed break-words'>
                  {activity.message}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {canRestore && (
            <div className='flex items-center gap-2'>
              <button
                onClick={handleDownload}
                className='shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all'
                title='Download ZIP'
              >
                <Download className='w-3.5 h-3.5' />
              </button>

              <button
                onClick={handleRestore}
                className='shrink-0 px-3 py-1.5 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-xs font-medium flex items-center gap-1.5 transition-all border border-primary-500/20 hover:border-primary-500/40'
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
    const sorted = [...activities].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
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
      <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
        <GitCommit className='w-12 h-12 mb-4 opacity-20' />
        <p>No activity history found.</p>
      </div>
    );
  }

  return (
    <div className='relative pl-8 space-y-8'>
      {/* Vertical Line */}
      <div className='absolute left-[11px] top-2 bottom-2 w-px bg-white/10' />

      {groups.map((group) => (
        <div key={group.date} className='relative'>
          {/* Date Header */}
          <div className='flex items-center gap-3 mb-6'>
            <div className='absolute -left-[29px] w-2.5 h-2.5 rounded-full bg-primary-500 ring-4 ring-bg-main' />
            <h3 className='text-sm font-bold text-gray-400 uppercase tracking-wider'>
              {group.date}
            </h3>
          </div>

          <div className='space-y-6'>
            {group.items.map((item) => (
              <TimelineItem key={item.id} activity={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
