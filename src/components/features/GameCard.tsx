import { memo, useCallback, useEffect, useState } from "react";
import { Button, Tooltip, Dropdown, Card } from "@heroui/react";
import {
  Folder,
  RefreshCw,
  Settings,
  CloudDownload,
  Trash2,
  MoreVertical,
  FolderOpen,
} from "lucide-react";
import {
  type Game,
  type GamePlatform,
  useGamesStore,
} from "@/stores/gamesStore";
import { useSyncStore } from "@/stores/syncStore";
import { toast } from "@/stores/toastStore";
import GameSettingsModal from "./GameSettingsModal";
import { getGameSaveStats, type GameSaveStatsDto } from "@/lib/tauri-games";
import { formatBytes, isTauriRuntime, timeAgo } from "@/lib/utils";

const platformConfig: Record<GamePlatform, { label: string; color: string }> = {
  steam: { label: "STEAM", color: "bg-blue-600" },
  epic: { label: "EPIC", color: "bg-gray-700" },
  gog: { label: "GOG", color: "bg-indigo-600" },
  other: { label: "OTHER", color: "bg-gray-600" },
};

const statusColorMap: Record<string, string> = {
  synced: "bg-success",
  syncing: "bg-warning animate-pulse",
  error: "bg-danger",
  pending: "bg-gray-400",
  idle: "bg-gray-500",
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
  maxHealth?: number | null
): string | null {
  if (health == null || maxHealth == null) return null;
  if (!Number.isFinite(health) || !Number.isFinite(maxHealth)) return null;
  if (maxHealth <= 0) return null;
  return `HP ${health}/${maxHealth}`;
}

function formatResource(
  label: string,
  current?: number | null,
  max?: number | null
): string | null {
  if (current == null) return null;
  if (!Number.isFinite(current)) return null;
  if (max != null && Number.isFinite(max) && max > 0) {
    return `${label} ${current}/${max}`;
  }
  return `${label} ${current}`;
}

async function openFolder(path: string): Promise<void> {
  const { open } = await import("@tauri-apps/plugin-shell");
  await open(path);
}

function GameCard({ game }: { game: Game }) {
  const performSync = useSyncStore((state) => state.performSync);
  const performRestore = useSyncStore((state) => state.performRestore);
  const removeGame = useGamesStore((state) => state.removeGame);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveStats, setSaveStats] = useState<
    GameSaveStatsDto | null | undefined
  >(undefined);

  const isTauri = isTauriRuntime();

  const isSyncing = game.status === "syncing";
  const platform = platformConfig[game.platform];
  const statusColor = statusColorMap[game.status] ?? "bg-gray-400";

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
      console.error("Sync failed:", error);
      toast.error(
        "Sync Failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }, [game.id, performSync]);

  const handleRestore = useCallback(async () => {
    const confirmed = window.confirm(
      `Do you want to restore the latest cloud backup for ${game.name}? This will overwrite your current local saves.`
    );
    if (!confirmed) return;

    try {
      await performRestore(game.id);
      toast.success(
        "Restore Complete",
        `${game.name} saves restored from cloud`
      );
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error(
        "Restore Failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }, [game.id, game.name, performRestore]);

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${game.name}" from tracking? This will NOT delete your save files.`
    );
    if (!confirmed) return;

    try {
      await removeGame(game.id);
      toast.success("Game Removed", `${game.name} is no longer being tracked`);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(
        "Remove Failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }, [game.id, game.name, removeGame]);

  const handleOpenFolder = useCallback(async () => {
    try {
      await openFolder(game.local_path);
    } catch (error) {
      console.error("Failed to open folder:", error);
      toast.error(
        "Could not open folder",
        "Make sure the path exists and is accessible"
      );
    }
  }, [game.local_path]);

  const handleDropdownAction = useCallback(
    (key: React.Key) => {
      switch (key) {
        case "open":
          handleOpenFolder();
          break;
        case "settings":
          setIsSettingsOpen(true);
          break;
        case "delete":
          handleDelete();
          break;
      }
    },
    [handleOpenFolder, handleDelete]
  );

  return (
    <Card className="bg-bg-elevated/40 backdrop-blur-xl pt-0 px-0 border border-white/5 rounded-2xl border-primary-600/20 flex flex-col hover:border-primary-500/50 transition-all duration-300 overflow-hidden group">
      {/* Cover Image */}
      <div className="relative h-36 overflow-hidden shrink-0">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-primary-600/20 to-primary-800/20 flex items-center justify-center p-4">
            <span className="text-white/20 font-bold text-xl uppercase tracking-widest">
              {game.name.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Platform badge */}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${platform.color} shadow-lg shadow-black/20`}
        >
          {platform.label}
        </span>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-bg-card via-transparent to-transparent opacity-80" />
      </div>

      <Card.Content className="p-4 pt-2 overflow-hidden">
        {/* Title and status */}
        <div className="mb-1 min-w-0">
          <h3 className="font-bold text-white text-lg leading-tight truncate drop-shadow-md">
            {game.name}
          </h3>
        </div>

        <div className=" min-w-0">
          {/* Path */}
          <div className="flex items-center gap-2 mb-4 group/path min-w-0">
            <Folder className="w-3 h-3 text-gray-500 shrink-0 group-hover/path:text-primary-400 transition-colors" />
            <span className="text-xs text-gray-500 font-mono truncate group-hover/path:text-gray-300 transition-colors min-w-0">
              {game.local_path}
            </span>
          </div>

          {/* Local save stats (validated via Tauri) */}
          {isTauri ? (
            <div className="-mt-1 mb-4 min-w-0 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
              <p className="text-[10px] font-bold text-gray-500 tracking-wider whitespace-nowrap">
                LOCAL
              </p>

              {saveStats === undefined ? (
                <p className="text-xs text-gray-500 leading-snug">
                  Checking save folder…
                </p>
              ) : saveStats === null ? (
                <p className="text-xs text-gray-500 leading-snug">
                  Save stats unavailable
                </p>
              ) : !saveStats.exists || !saveStats.is_dir ? (
                <p className="text-xs text-gray-500 leading-snug">
                  Path not found / not a folder
                </p>
              ) : (
                <p className="text-xs text-gray-400 leading-snug wrap-break-word">
                  <span>{saveStats.file_count} files</span>
                  <span className="text-gray-600 mx-1">•</span>
                  <span>
                    {formatBytes(saveStats.total_bytes, { empty: "0 B" })}
                  </span>
                  {saveStats.newest_mtime_ms ? (
                    <>
                      <span className="text-gray-600 mx-1">•</span>
                      <span>
                        updated{" "}
                        {timeAgo(saveStats.newest_mtime_ms, {
                          empty: "Unknown",
                        })}
                      </span>
                    </>
                  ) : null}
                </p>
              )}

              {saveStats && saveStats.silksong ? (
                <>
                  <p className="mt-2 text-[10px] font-bold text-gray-500 tracking-wider whitespace-nowrap">
                    SILKSONG
                  </p>
                  <p className="text-xs text-gray-400 leading-snug wrap-break-word">
                    <span>{saveStats.silksong.user_dat_files} slots</span>
                    <span className="text-gray-600 mx-1">•</span>
                    <span>
                      {saveStats.silksong.restore_point_files} restore files
                    </span>
                    {saveStats.silksong.progress ? (
                      (() => {
                        const p = saveStats.silksong?.progress;
                        const play = formatPlayTime(p?.play_time_seconds);
                        const date = p?.save_date ?? null;
                        const scene = p?.respawn_scene ?? null;
                        const hp = formatHp(p?.health, p?.max_health);
                        const silk = formatResource(
                          "Silk",
                          p?.silk,
                          p?.silk_max
                        );
                        const geo = formatResource("Geo", p?.geo, null);
                        const bits = [play, date, scene, hp, silk, geo].filter(
                          Boolean
                        );
                        return bits.length ? (
                          <>
                            <span className="text-gray-600 mx-1">•</span>
                            <span>{bits.join(" • ")}</span>
                          </>
                        ) : null;
                      })()
                    ) : saveStats.silksong.decoded_json_files > 0 ? (
                      <>
                        <span className="text-gray-600 mx-1">•</span>
                        <span>decoded JSON found</span>
                      </>
                    ) : null}
                  </p>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Sync info and actions */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3 gap-2">
            <div className="flex items-center gap-2 min-w-0 shrink">
              <span
                className={`w-2 h-2 rounded-full ${statusColor} shrink-0`}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-500 tracking-wider whitespace-nowrap">
                  SYNC
                </p>
                <p className="text-xs text-gray-300 font-medium whitespace-nowrap">
                  {timeAgo(game.last_synced_at, { empty: "Never" })}
                  <span className="text-gray-600 mx-1">•</span>
                  <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-400">
                    v{game.last_synced_version}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip closeDelay={0}>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    size="sm"
                    onPress={handleSync}
                    isDisabled={isSyncing}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isSyncing ? "animate-spin text-primary-400" : ""
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
                    size="sm"
                    onPress={handleRestore}
                    isDisabled={isSyncing}
                  >
                    <CloudDownload className="w-4 h-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Restore from Cloud</Tooltip.Content>
              </Tooltip>
              <Dropdown>
                <Dropdown.Trigger>
                  <Button isIconOnly size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu
                    aria-label="Game actions"
                    onAction={handleDropdownAction}
                  >
                    <Dropdown.Item id="open" textValue="Open Folder">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        <span>Open Folder</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id="settings" textValue="Settings">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="delete"
                      textValue="Remove Game"
                      className="text-danger"
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        <span>Remove Game</span>
                      </div>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>
        </div>
      </Card.Content>

      {/* Game Settings Modal */}
      <GameSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        game={game}
      />
    </Card>
  );
}

export default memo(GameCard);
