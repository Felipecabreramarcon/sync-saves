import { useEffect, useState, useMemo } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { useGamesStore } from "@/stores/gamesStore";
import { useAuthStore } from "@/stores/authStore";
import { Timeline } from "@/components/features/Timeline";
import { RefreshCw, Filter, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { Button, Dropdown } from "@heroui/react";

export default function Logs() {
  const { activities, loadActivities, games } = useGamesStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [filterGame, setFilterGame] = useState<string>("all");

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadActivities()
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadActivities();
    } finally {
      setLoading(false);
    }
  };

  // Filter activities by game
  const filteredActivities = useMemo(() => {
    if (filterGame === "all") return activities;
    return activities.filter(a =>
      a.game_id === filterGame ||
      games.find(g => g.id === filterGame)?.slug === a.game_name?.toLowerCase().replace(/\s+/g, '-')
    );
  }, [activities, filterGame, games]);

  // Stats
  const stats = useMemo(() => {
    const uploads = activities.filter(a => a.action === 'upload' && a.status === 'success').length;
    const downloads = activities.filter(a => a.action === 'download' && a.status === 'success').length;
    const errors = activities.filter(a => a.status === 'error').length;
    return { uploads, downloads, errors };
  }, [activities]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Activity Log"
        subtitle="Timeline of sync events and restore points"
        showSyncButton={false}
        rightContent={
          <div className="flex items-center gap-2">
            {/* Game Filter */}
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant="ghost" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  {filterGame === "all" ? "All Games" : games.find(g => g.id === filterGame)?.name || "Filter"}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Filter by game"
                  onAction={(key) => setFilterGame(key as string)}
                >
                  <Dropdown.Item id="all" textValue="All Games">All Games</Dropdown.Item>
                  {games.map(game => (
                    <Dropdown.Item key={game.id} id={game.id} textValue={game.name}>
                      {game.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            <Button variant="ghost" size="sm" onPress={handleRefresh} isDisabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Stats Summary */}
        {user && activities.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-bg-elevated/30 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-success mb-1">
                <ArrowUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Uploads</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.uploads}</p>
            </div>
            <div className="bg-bg-elevated/30 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-info mb-1">
                <ArrowDown className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Restores</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.downloads}</p>
            </div>
            <div className="bg-bg-elevated/30 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-danger mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Errors</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.errors}</p>
            </div>
          </div>
        )}

        {!user ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text-gray-500">Sign in to view your activity history.</p>
          </div>
        ) : (
          <Timeline activities={filteredActivities} />
        )}
      </div>
    </div>
  );
}

