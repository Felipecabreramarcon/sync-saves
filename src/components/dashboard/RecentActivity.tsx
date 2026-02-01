import {
  dedupeConsecutiveActivities,
  filterUserVisibleActivities,
} from '@/lib/cloudSync';
import { cn } from '@/lib/utils';
import { SyncActivity, useGamesStore } from '@/stores/gamesStore';
import { Accordion, Button, Card, Chip, Tooltip } from '@heroui/react';
import { format, isToday, isYesterday } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function RecentActivity() {
  const navigate = useNavigate();
  // Optimization: Select only 'activities' to prevent re-renders on unrelated store updates
  const activities = useGamesStore((state) => state.activities);

  const { groups, hasActivities } = useMemo(() => {
    const processed = dedupeConsecutiveActivities(
      filterUserVisibleActivities(activities)
        .slice()
        .sort((a, b) => {
          // Optimization: String comparison is faster than new Date() for ISO strings
          if (b.created_at > a.created_at) return 1;
          if (b.created_at < a.created_at) return -1;
          return 0;
        })
    ).slice(0, 10);

    // Group by date
    const grouped = processed.reduce((groups, activity) => {
      const date = new Date(activity.created_at);
      let key = format(date, 'yyyy-MM-dd');

      if (isToday(date)) key = 'Today';
      else if (isYesterday(date)) key = 'Yesterday';
      else key = format(date, 'MMMM d, yyyy');

      if (!groups[key]) groups[key] = [];
      groups[key].push(activity);
      return groups;
    }, {} as Record<string, SyncActivity[]>);

    return {
      groups: Object.entries(grouped).map(([date, items]) => ({
        date,
        items,
      })),
      hasActivities: processed.length > 0,
    };
  }, [activities]);

  if (!hasActivities) {
    return (
      <Card className='p-8 bg-white/5 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-3 backdrop-blur-sm shadow-none'>
        <div className='w-12 h-12 rounded-full bg-white/5 flex items-center justify-center'>
          <ChevronRight className='w-6 h-6 text-white/20' />
        </div>
        <div>
          <h3 className='text-sm font-semibold text-white'>No activity yet</h3>
          <p className='text-xs text-gray-500 max-w-[200px] mt-1'>
            Sync your games to see your history here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-white'>Recent Activity</h2>
        <Button
          className='text-primary-400 hover:text-primary-300 font-medium px-3 h-8 rounded-lg bg-transparent hover:bg-primary-500/10 flex items-center gap-2 transition-colors'
          onPress={() => navigate('/logs')}
        >
          View All
          <ChevronRight className='w-4 h-4' />
        </Button>
      </div>

      <Accordion
        defaultExpandedKeys={['Today', 'Yesterday']}
        className='flex flex-col gap-2 relative'
      >
        {groups.map((group) => (
          <Accordion.Item
            key={group.date}
            aria-label={group.date}
            className='bg-bg-elevated/40 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden transition-all'
          >
            <Accordion.Heading>
              <Accordion.Trigger className='w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer text-left'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-semibold text-gray-300 group-hover:text-white transition-colors'>
                    {group.date}
                  </span>
                  <span className='px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 font-mono'>
                    {group.items.length}
                  </span>
                </div>
                <div className='text-gray-500 group-hover:text-white transition-colors'>
                  <ChevronDown className='w-4 h-4 transition-transform group-data-[expanded=true]:rotate-180' />
                </div>
              </Accordion.Trigger>
            </Accordion.Heading>

            <Accordion.Panel className='px-2 pb-2 pt-0'>
              <div className='space-y-1'>
                <AnimatePresence mode='popLayout'>
                  {group.items.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: idx * 0.05,
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    >
                      <ActivityCard activity={activity} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
}

function ActivityCard({ activity }: { activity: SyncActivity }) {
  const isUpload = activity.action === 'upload';
  const isSuccess = activity.status === 'success';

  return (
    <div className='group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default'>
      <div className='flex items-center gap-3 min-w-0'>
        {/* Icon Status Indicator */}
        {/* Icon Status Indicator OR Cover */}
        <div className='relative shrink-0'>
          {activity.game_cover ? (
            <div className='w-10 h-10 rounded-lg overflow-hidden border border-white/10 shadow-sm relative group-hover:scale-105 transition-transform duration-300'>
              <img
                src={activity.game_cover}
                alt={activity.game_name}
                className='w-full h-full object-cover'
              />
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]',
                  isSuccess ? 'text-success-400' : 'text-danger-400'
                )}
              >
                {isUpload ? (
                  <Upload className='w-4 h-4 drop-shadow-md' />
                ) : (
                  <Download className='w-4 h-4 drop-shadow-md' />
                )}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner',
                isSuccess
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              )}
            >
              {isUpload ? (
                <Upload className='w-5 h-5' />
              ) : (
                <Download className='w-5 h-5' />
              )}
            </div>
          )}
        </div>

        {/* Game Info using HeroUI User */}
        <div className='flex flex-col min-w-0'>
          <span className='text-sm font-semibold text-white truncate leading-tight'>
            {activity.game_name}
          </span>
          <div className='flex items-center gap-1.5 mt-0.5'>
            <span
              className={cn(
                'text-[10px] uppercase font-bold tracking-wider',
                isUpload ? 'text-primary-400' : 'text-secondary-400'
              )}
            >
              {isUpload ? 'Cloud Save' : 'Restore'}
            </span>
            <span className='text-[10px] text-gray-500'>•</span>
            <span className='text-[10px] text-gray-500 flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {format(new Date(activity.created_at), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Status or Actions */}
      <div className='flex items-center gap-3 shrink-0'>
        {activity.status === 'error' && (
          <Tooltip>
            <Tooltip.Trigger>
              <div tabIndex={0} className='outline-none'>
                <Chip size='sm' color='danger' className='h-6 cursor-help'>
                  Error
                </Chip>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className='bg-danger text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xl max-w-xs'>
              {activity.message || 'Sync failed'}
            </Tooltip.Content>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
