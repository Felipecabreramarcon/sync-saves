import { Button, Tooltip, Chip } from '@heroui/react';
import { Monitor, Laptop, Apple, Trash2 } from 'lucide-react';
import { getRelativeTime, type Device } from '@/lib/devices';

const osIcons: Record<string, typeof Laptop> = {
  windows: Monitor,
  linux: Laptop,
  macos: Apple,
};

interface DevicesListCardProps {
  devices: Device[];
  loadingDevices: boolean;
  onRemoveDevice: (deviceId: string) => void;
}

/**
 * Card component showing all user devices.
 */
export function DevicesListCard({
  devices,
  loadingDevices,
  onRemoveDevice,
}: DevicesListCardProps) {
  return (
    <div className='bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/20'>
      <div className='p-8'>
        <div className='flex items-center justify-between mb-8'>
          <h3 className='text-xl font-bold text-white tracking-tight'>
            Your Devices
          </h3>
          <Chip
            size='sm'
            variant='soft'
            className='bg-primary-900/30 text-primary-400 border border-primary-500/20'
          >
            {devices.length} device{devices.length !== 1 ? 's' : ''}
          </Chip>
        </div>

        <div className='space-y-4'>
          {loadingDevices ? (
            <div className='text-center py-8 text-gray-500'>
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              No devices registered yet
            </div>
          ) : (
            devices.map((device) => (
              <DeviceListItem
                key={device.id}
                device={device}
                onRemove={onRemoveDevice}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface DeviceListItemProps {
  device: Device;
  onRemove: (deviceId: string) => void;
}

function DeviceListItem({ device, onRemove }: DeviceListItemProps) {
  const DeviceIcon = (device.os && osIcons[device.os]) || Monitor;
  const isOnline =
    device.is_current ||
    Date.now() - new Date(device.last_seen_at).getTime() < 300000; // 5 min

  return (
    <div className='group flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 hover:bg-bg-elevated/50 transition-all'>
      <div className='flex items-center gap-4 min-w-0'>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 bg-bg-elevated/50 transition-colors ${
            isOnline
              ? 'text-primary-400 shadow-lg shadow-primary-500/10'
              : 'text-gray-600'
          }`}
        >
          <DeviceIcon className='w-5 h-5' />
        </div>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-bold text-white group-hover:text-primary-300 transition-colors truncate'>
              {device.name}
            </span>
            {device.is_current && (
              <Chip
                size='sm'
                variant='soft'
                className='bg-primary-900/30 text-primary-400 text-[9px] h-5'
              >
                This device
              </Chip>
            )}
            <Chip
              size='sm'
              variant='tertiary'
              color={isOnline ? 'success' : 'default'}
              className={`bg-transparent text-[10px] font-bold uppercase tracking-widest ${
                isOnline ? 'text-green-500' : 'text-gray-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isOnline ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
              {isOnline ? 'online' : 'offline'}
            </Chip>
          </div>
          <p className='text-[11px] text-gray-500 font-medium mt-0.5 truncate'>
            {device.os
              ? device.os.charAt(0).toUpperCase() + device.os.slice(1)
              : 'Unknown OS'}{' '}
            • Last seen {getRelativeTime(device.last_seen_at)}
          </p>
        </div>
      </div>
      {!device.is_current && (
        <Tooltip>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size='sm'
              variant='ghost'
              className='text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity'
              onPress={() => onRemove(device.id)}
            >
              <Trash2 className='w-4 h-4' />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Remove device</Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}
