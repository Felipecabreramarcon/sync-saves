import { Button, Avatar } from '@heroui/react';
import { formatBytes } from '@/lib/utils';

interface UserProfileCardProps {
  email?: string;
  avatarUrl?: string;
  storageUsage: number;
}

/**
 * Card component showing user profile and storage status.
 */
export function UserProfileCard({
  email,
  avatarUrl,
  storageUsage,
}: UserProfileCardProps) {
  const storagePercentage = Math.min(
    (storageUsage / (1024 * 1024 * 1024)) * 100,
    100
  );

  return (
    <div className='bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-primary-900/10 overflow-hidden relative'>
      {/* Background blur effect */}
      <div className='absolute top-0 right-0 w-48 h-48 bg-primary-500/10 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none' />

      <div className='p-4 sm:p-6 lg:p-8 relative'>
        <div className='flex items-center gap-4 mb-8'>
          <div className='relative'>
            <Avatar className='w-16 h-16 text-large border-2 border-white/10'>
              <Avatar.Image src={avatarUrl} alt={email || 'User'} />
              <Avatar.Fallback>
                {email?.charAt(0).toUpperCase() || 'U'}
              </Avatar.Fallback>
            </Avatar>
            <div className='absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-bg-card' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-lg font-bold text-white truncate'>
              {email || 'Not signed in'}
            </p>
          </div>
        </div>

        <div className='p-5 rounded-2xl bg-bg-elevated/50 border border-white/5 backdrop-blur-md'>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
              Storage Status
            </span>
            <span className='text-sm font-bold text-white'>
              {formatBytes(storageUsage)}{' '}
              <span className='text-gray-500 text-xs'>/ 1GB</span>
            </span>
          </div>
          {/* Custom Progress Bar */}
          <div className='h-2 bg-gray-800/50 rounded-full overflow-hidden'>
            <div
              className='h-full bg-linear-to-r from-primary-500 to-primary-400 shadow-lg shadow-primary-500/50 transition-all duration-300'
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <div className='flex items-center justify-between mt-4'>
            <Button
              variant='ghost'
              size='sm'
              className='text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-widest px-2 h-8 min-w-0'
            >
              Upgrade Plan
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest px-2 h-8 min-w-0'
            >
              Clear Cache
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
