import { useEffect, useState, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useGamesStore } from '@/stores/gamesStore';
import { useAuthStore } from '@/stores/authStore';
import { Timeline } from '@/components/features/Timeline';
import VersionHistory from '@/components/features/VersionHistory';
import {
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Clock,
  FileCode,
} from 'lucide-react';
import { Button, Dropdown } from '@heroui/react';

type ViewMode = 'timeline' | 'versions';

export default function Logs() {
  const { activities, loadActivities, games } = useGamesStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [filterGame, setFilterGame] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // Get selected game details
  const selectedGame = useMemo(() => {
    if (filterGame === 'all') return null;
    return games.find((g) => g.id === filterGame) || null;
  }, [filterGame, games]);

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
    if (filterGame === 'all') return activities;

    // Optimization: Find target game once instead of inside the loop O(N*M) -> O(N)
    const targetGame = games.find((g) => g.id === filterGame);
    const targetSlug = targetGame?.slug;

    return activities.filter(
      (a) =>
        a.game_id === filterGame ||
        (targetSlug &&
          targetSlug === a.game_name?.toLowerCase().replace(/\s+/g, '-'))
    );
  }, [activities, filterGame, games]);

  // Stats
  const stats = useMemo(() => {
    const sourceActivities =
      filterGame === 'all' ? activities : filteredActivities;
    const uploads = sourceActivities.filter(
      (a) => a.action === 'upload' && a.status === 'success'
    ).length;
    const downloads = sourceActivities.filter(
      (a) => a.action === 'download' && a.status === 'success'
    ).length;
    const errors = sourceActivities.filter((a) => a.status === 'error').length;
    return { uploads, downloads, errors };
  }, [activities, filteredActivities, filterGame]);

  return (
    <div className='min-h-screen'>
      <PageHeader
        title='Activity Log'
        subtitle={
          selectedGame
            ? `${selectedGame.name} - Version history & analysis`
            : 'Timeline of sync events and restore points'
        }
        showSyncButton={false}
        rightContent={
          <div className='flex items-center gap-2'>
            {/* View Mode Toggle (only when game selected) */}
            {selectedGame && (
              <div className='flex bg-white/5 rounded-lg p-0.5 border border-white/10'>
                <Button
                  size='sm'
                  variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
                  onPress={() => setViewMode('timeline')}
                  className={`h-7 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Clock className='w-3.5 h-3.5 mr-1.5' />
                  Activity
                </Button>
                <Button
                  size='sm'
                  variant={viewMode === 'versions' ? 'primary' : 'ghost'}
                  onPress={() => setViewMode('versions')}
                  className={`h-7 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'versions'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileCode className='w-3.5 h-3.5 mr-1.5' />
                  Versions
                </Button>
              </div>
            )}

            {/* Game Filter */}
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant='ghost' size='sm'>
                  <Filter className='w-4 h-4 mr-2' />
                  {filterGame === 'all'
                    ? 'All Games'
                    : games.find((g) => g.id === filterGame)?.name || 'Filter'}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label='Filter by game'
                  onAction={(key) => {
                    setFilterGame(key as string);
                    if (key === 'all') setViewMode('timeline');
                  }}
                >
                  <Dropdown.Item id='all' textValue='All Games'>
                    All Games
                  </Dropdown.Item>
                  {games.map((game) => (
                    <Dropdown.Item
                      key={game.id}
                      id={game.id}
                      textValue={game.name}
                    >
                      {game.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            <Button
              variant='ghost'
              size='sm'
              onPress={handleRefresh}
              isDisabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <div className='p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto'>
        {/* Stats Summary */}
        {user && activities.length > 0 && (
          <div className='grid grid-cols-3 gap-4 mb-6'>
            <div className='bg-bg-elevated/30 rounded-xl p-4 border border-white/5'>
              <div className='flex items-center gap-2 text-success mb-1'>
                <ArrowUp className='w-4 h-4' />
                <span className='text-xs font-medium uppercase tracking-wider'>
                  Uploads
                </span>
              </div>
              <p className='text-2xl font-bold text-white'>{stats.uploads}</p>
            </div>
            <div className='bg-bg-elevated/30 rounded-xl p-4 border border-white/5'>
              <div className='flex items-center gap-2 text-info mb-1'>
                <ArrowDown className='w-4 h-4' />
                <span className='text-xs font-medium uppercase tracking-wider'>
                  Restores
                </span>
              </div>
              <p className='text-2xl font-bold text-white'>{stats.downloads}</p>
            </div>
            <div className='bg-bg-elevated/30 rounded-xl p-4 border border-white/5'>
              <div className='flex items-center gap-2 text-danger mb-1'>
                <AlertCircle className='w-4 h-4' />
                <span className='text-xs font-medium uppercase tracking-wider'>
                  Errors
                </span>
              </div>
              <p className='text-2xl font-bold text-white'>{stats.errors}</p>
            </div>
          </div>
        )}

        {!user ? (
          <div className='text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10'>
            <p className='text-gray-500'>
              Sign in to view your activity history.
            </p>
          </div>
        ) : selectedGame && viewMode === 'versions' ? (
          /* Version History & Analysis View */
          <div className='bg-bg-elevated/30 rounded-2xl border border-white/5 overflow-hidden'>
            <VersionHistory
              cloudGameId={selectedGame.cloud_game_id}
              gameId={selectedGame.id}
            />
          </div>
        ) : (
          /* Timeline View */
          <Timeline activities={filteredActivities} />
        )}
      </div>
    </div>
  );
}
