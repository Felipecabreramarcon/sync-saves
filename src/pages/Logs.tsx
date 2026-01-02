import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@heroui/react";
import PageHeader from "@/components/layout/PageHeader";
import { useGamesStore } from "@/stores/gamesStore";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";
import {
  fetchBackupsByGame,
  formatBytes,
  type CloudGameBackups,
} from "@/lib/cloudSync";
import { format } from "date-fns";

export default function Logs() {
  const { games } = useGamesStore();
  const { user } = useAuthStore();
  const performRestore = useSyncStore((s) => s.performRestore);

  const [isLoading, setIsLoading] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudGameBackups[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const data = await fetchBackupsByGame({
          userId: user.id,
          versionsPerGame: 5,
        });
        if (!cancelled) setCloudBackups(data);
      } catch (e) {
        console.warn("Failed to load backups:", e);
        if (!cancelled) setCloudBackups([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const localGameBySlug = useMemo(() => {
    const map = new Map<string, (typeof games)[number]>();
    for (const g of games) map.set(g.slug, g);
    return map;
  }, [games]);

  const handleRestore = async (slug: string, filePath?: string) => {
    const localGame = localGameBySlug.get(slug);
    if (!localGame) return;

    const label = filePath ? "this backup version" : "the latest cloud backup";
    const confirmed = window.confirm(
      `Do you want to restore ${label} for ${localGame.name}? This will overwrite your current local saves.`
    );
    if (!confirmed) return;

    await performRestore(localGame.id, filePath ? { filePath } : undefined);
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Backups"
        subtitle="Restore points saved in the cloud"
        showSyncButton={false}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
        {!user ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text-gray-500">Sign in to view your cloud backups.</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-gray-500">Loading backups…</p>
          </div>
        ) : cloudBackups.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text-gray-500">
              No cloud backups found yet. Sync a game to create restore points.
            </p>
          </div>
        ) : (
          cloudBackups.map((b) => {
            const localGame = localGameBySlug.get(b.slug);
            const isExpanded = !!expanded[b.cloud_game_id];
            const latest = b.latest;
            return (
              <Card
                key={b.cloud_game_id}
                className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl"
              >
                <Card.Content className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {b.name}
                      </h3>
                      {latest ? (
                        <p className="text-xs text-gray-500 mt-1">
                          Latest: v{latest.version} •{" "}
                          {format(new Date(latest.created_at), "PPpp")} •{" "}
                          {latest.device_name ?? "Unknown device"} •{" "}
                          {formatBytes(latest.file_size)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          No versions found yet.
                        </p>
                      )}

                      {b.last_error ? (
                        <p className="text-xs text-danger mt-2">
                          Last error{" "}
                          {format(new Date(b.last_error.created_at), "PPpp")}
                          {b.last_error.device_name
                            ? ` • ${b.last_error.device_name}`
                            : ""}
                          {b.last_error.message
                            ? ` • ${b.last_error.message}`
                            : ""}
                        </p>
                      ) : null}

                      {!localGame ? (
                        <p className="text-[11px] text-warning mt-2">
                          This game is not configured locally on this device.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        isDisabled={!localGame || !latest}
                        onPress={() => handleRestore(b.slug)}
                      >
                        Restore latest
                      </Button>
                      <Button
                        variant="ghost"
                        onPress={() =>
                          setExpanded((s) => ({
                            ...s,
                            [b.cloud_game_id]: !isExpanded,
                          }))
                        }
                        isDisabled={b.versions.length === 0}
                      >
                        {isExpanded ? "Hide versions" : "View versions"}
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-white/5 pt-4 space-y-2">
                      {b.versions.map((v) => (
                        <div
                          key={`${b.cloud_game_id}:${v.version}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-bg-elevated/30 border border-white/5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-white font-semibold">
                              v{v.version}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {format(new Date(v.created_at), "PPpp")} •{" "}
                              {v.device_name ?? "Unknown device"} •{" "}
                              {formatBytes(v.file_size)}
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            isDisabled={!localGame}
                            onPress={() => handleRestore(b.slug, v.file_path)}
                          >
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card.Content>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
