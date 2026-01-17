import { Avatar, AvatarImage, AvatarFallback, Chip, Button, Tooltip } from "@heroui/react";
import { ArrowUp, ArrowDown, RefreshCw, ChevronRight, Download } from "lucide-react";
import { type SyncActivity } from "@/stores/gamesStore";
import { cn, timeAgo } from "@/lib/utils";
import { memo } from "react";

const ActivityItem = memo(function ActivityItem({ activity }: { activity: SyncActivity }) {
  const actionConfig = {
    upload: { icon: ArrowUp, text: "Uploaded to Cloud", color: "text-success" },
    download: {
      icon: ArrowDown,
      text: "Downloaded from Cloud",
      color: "text-info",
    },
    skip: { icon: RefreshCw, text: "Skipped", color: "text-gray-400" },
    conflict: { icon: RefreshCw, text: "Conflict", color: "text-warning" },
  };

  const statusConfig = {
    success: {
      label: "SUCCESS",
      color: "success" as const,
      variant: "flat" as const,
    },
    error: {
      label: "ERROR",
      color: "danger" as const,
      variant: "flat" as const,
    },
    pending: {
      label: "IN PROGRESS",
      color: "warning" as const,
      variant: "flat" as const,
    },
  };

  const action = actionConfig[activity.action];
  const status = statusConfig[activity.status];
  const ActionIcon = action.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-bg-elevated/30 border border-transparent hover:border-white/5 hover:bg-bg-elevated/50 transition-all duration-200 group cursor-pointer">
      {/* Game cover */}
      <div className="relative shrink-0">
        <Avatar className="w-12 h-12 ring-2 ring-white/5 group-hover:ring-white/10 transition-all">
          -
          <AvatarImage src={activity.game_cover} alt={activity.game_name} />
          <AvatarFallback>
            {activity.game_name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-bg-elevated",
            status.color === "success"
              ? "bg-success/20 text-success"
              : status.color === "danger"
                ? "bg-danger/20 text-danger"
                : "bg-warning/20 text-warning"
          )}
        >
          <ActionIcon className="w-3 h-3" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className="font-semibold text-white truncate pr-2">
            {activity.game_name}
          </h4>
          <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
            {timeAgo(activity.created_at, { empty: "Now" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", action.color)}>
            {action.text}
          </span>
          <span className="text-gray-700 mx-1">•</span>
          <Chip
            size="sm"
            color={status.color}
            className="h-4 text-[9px] font-bold px-1.5 min-w-0"
          >
            {status.label}
          </Chip>
        </div>
      </div>

      {/* Download button (for upload activities with version) */}
      {activity.action === 'upload' && activity.save_version_id && activity.status === 'success' && (
        <Tooltip closeDelay={0}>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className="text-gray-500 hover:text-primary-400"
              onPress={async () => {
                try {
                  const { getVersionFilePath } = await import('@/lib/cloudSync')
                  const { useSyncStore } = await import('@/stores/syncStore')
                  const { useGamesStore } = await import('@/stores/gamesStore')
                  const { toast } = await import('@/stores/toastStore')

                  const versionInfo = await getVersionFilePath(activity.save_version_id!)
                  if (!versionInfo) {
                    toast.error('Download Failed', 'Could not find save version')
                    return
                  }

                  // Find the game by matching game_id
                  const games = useGamesStore.getState().games
                  const game = games.find(g => g.slug === versionInfo.gameSlug || g.cloud_game_id === activity.game_id || g.id === activity.game_id)

                  if (!game) {
                    toast.error('Download Failed', 'Game not configured on this device')
                    return
                  }

                  // Call restore with the specific file path
                  await useSyncStore.getState().performRestore(game.id, { filePath: versionInfo.filePath })
                  toast.success('Save Restored', `Downloaded save from ${new Date(activity.created_at).toLocaleString()}`)
                } catch (error) {
                  console.error('Download failed:', error)
                  const { toast } = await import('@/stores/toastStore')
                  toast.error('Download Failed', error instanceof Error ? error.message : 'Unknown error')
                }
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Restore this save</Tooltip.Content>
        </Tooltip>
      )}

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
    </div>
  );
});

export default ActivityItem;
