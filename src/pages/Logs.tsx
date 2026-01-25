import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
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

  console.log(activities, games);

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
    return activities.filter(
      (a) =>
        a.game_id === filterGame ||
        games.find((g) => g.id === filterGame)?.slug ===
          a.game_name?.toLowerCase().replace(/\s+/g, '-'),
    );
  }, [activities, filterGame, games]);

  // Stats
  const stats = useMemo(() => {
    const sourceActivities =
      filterGame === 'all' ? activities : filteredActivities;
    const uploads = sourceActivities.filter(
      (a) => a.action === 'upload' && a.status === 'success',
    ).length;
    const downloads = sourceActivities.filter(
      (a) => a.action === 'download' && a.status === 'success',
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
          <div className='flex items-center gap-3'>
            {/* View Mode Toggle (only when game selected) */}
            {selectedGame && (
              <div className='flex bg-[var(--color-bg-card)] rounded-lg p-1 border border-white/5'>
                <Button
                  size='sm'
                  variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
                  onPress={() => setViewMode('timeline')}
                  className={cn(
                    'h-8 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-all font-display',
                    viewMode === 'timeline'
                      ? 'shadow-[0_0_10px_rgba(124,58,237,0.4)]'
                      : 'text-[var(--color-text-muted)] hover:text-white bg-transparent',
                  )}
                >
                  <Clock className='w-3.5 h-3.5 mr-1.5' />
                  Activity
                </Button>
                <Button
                  size='sm'
                  variant={viewMode === 'versions' ? 'primary' : 'ghost'}
                  onPress={() => setViewMode('versions')}
                  className={cn(
                    'h-8 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-all font-display',
                    viewMode === 'versions'
                      ? 'shadow-[0_0_10px_rgba(124,58,237,0.4)]'
                      : 'text-[var(--color-text-muted)] hover:text-white bg-transparent',
                  )}
                >
                  <FileCode className='w-3.5 h-3.5 mr-1.5' />
                  Versions
                </Button>
              </div>
            )}

            {/* Game Filter */}
            <Dropdown>
              <Dropdown.Trigger>
                <Button
                  variant='ghost'
                  size='sm'
                  className='border-white/10 hover:border-[var(--color-primary)]/50 text-[var(--color-text-muted)] hover:text-white hover:shadow-[0_0_10px_rgba(124,58,237,0.2)] transition-all font-display uppercase tracking-wider text-xs h-9 bg-transparent'
                >
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
                  className='bg-[var(--color-bg-card)] border border-white/10'
                >
                  <Dropdown.Item
                    id='all'
                    textValue='All Games'
                    className='font-display'
                  >
                    All Games
                  </Dropdown.Item>
                  {games.map((game) => (
                    <Dropdown.Item
                      key={game.id}
                      id={game.id}
                      textValue={game.name}
                      className='font-display'
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
              className='text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 bg-transparent'
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
          <div className='grid grid-cols-3 gap-6 mb-12'>
            {/* Uploads Card */}
            <div className='relative overflow-hidden group bg-[var(--color-bg-card)] border border-white/5 rounded-2xl p-6 transition-all hover:border-success/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]'>
              <div className='absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity'>
                <ArrowUp className='w-16 h-16 text-success' />
              </div>
              <div className='flex items-center gap-3 text-success mb-2'>
                <div className='p-2 rounded-lg bg-success/10 border border-success/20'>
                  <ArrowUp className='w-4 h-4' />
                </div>
                <span className='text-xs font-bold uppercase tracking-widest font-display text-white'>
                  Uploads
                </span>
              </div>
              <p className='text-4xl font-bold text-white font-display text-neon tracking-wide'>
                {stats.uploads}
              </p>
              <div className='w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden'>
                <div className='h-full bg-success/50 w-3/4 rounded-full shadow-[0_0_10px_var(--success)]'></div>
              </div>
            </div>

            {/* Restores Card */}
            <div className='relative overflow-hidden group bg-[var(--color-bg-card)] border border-white/5 rounded-2xl p-6 transition-all hover:border-[var(--color-secondary)]/30 hover:shadow-[0_0_20px_rgba(167,139,250,0.1)]'>
              <div className='absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity'>
                <ArrowDown className='w-16 h-16 text-[var(--color-secondary)]' />
              </div>
              <div className='flex items-center gap-3 text-[var(--color-secondary)] mb-2'>
                <div className='p-2 rounded-lg bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/20'>
                  <ArrowDown className='w-4 h-4' />
                </div>
                <span className='text-xs font-bold uppercase tracking-widest font-display text-white'>
                  Restores
                </span>
              </div>
              <p className='text-4xl font-bold text-white font-display text-neon tracking-wide'>
                {stats.downloads}
              </p>
              <div className='w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden'>
                <div className='h-full bg-[var(--color-secondary)]/50 w-1/2 rounded-full shadow-[0_0_10px_var(--color-secondary)]'></div>
              </div>
            </div>

            {/* Errors Card */}
            <div className='relative overflow-hidden group bg-[var(--color-bg-card)] border border-white/5 rounded-2xl p-6 transition-all hover:border-danger/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]'>
              <div className='absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity'>
                <AlertCircle className='w-16 h-16 text-danger' />
              </div>
              <div className='flex items-center gap-3 text-danger mb-2'>
                <div className='p-2 rounded-lg bg-danger/10 border border-danger/20'>
                  <AlertCircle className='w-4 h-4' />
                </div>
                <span className='text-xs font-bold uppercase tracking-widest font-display text-white'>
                  Errors
                </span>
              </div>
              <p className='text-4xl font-bold text-white font-display text-neon tracking-wide'>
                {stats.errors}
              </p>
              <div className='w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden'>
                <div className='h-full bg-danger/50 w-1/4 rounded-full shadow-[0_0_10px_var(--danger)]'></div>
              </div>
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
