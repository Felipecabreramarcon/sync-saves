import { useState } from 'react';
import { Tooltip, Button, Chip, Label } from '@heroui/react';
import { Monitor, Copy, Check } from 'lucide-react';
import { SaveInput } from '@/components/common/SaveInput';
import type { SystemInfo } from '@/lib/tauri';

interface DeviceInfoCardProps {
  sysInfo: SystemInfo | null;
  localDeviceName: string;
  onDeviceNameChange: (value: string) => void;
}

/**
 * Card component showing current device information.
 */
export function DeviceInfoCard({
  sysInfo,
  localDeviceName,
  onDeviceNameChange,
}: DeviceInfoCardProps) {
  const [copied, setCopied] = useState(false);

  const copyMachineId = () => {
    const id = sysInfo?.device_id || 'unknown';
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/20'>
      <div className='p-4 sm:p-6 lg:p-8'>
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20 shadow-inner shadow-primary-500/10'>
              <Monitor className='w-6 h-6 text-primary-400' />
            </div>
            <h3 className='text-xl font-bold text-white tracking-tight'>
              This Device
            </h3>
          </div>
          <Chip
            variant='soft'
            color='accent'
            className='bg-primary-900/30 text-primary-400 border border-primary-500/20 font-medium h-7'
          >
            <Check className='w-3 h-3 mr-1' />
            {sysInfo?.os_name || 'Windows 11'}
          </Chip>
        </div>

        <div className='space-y-6'>
          <div className='space-y-2 flex flex-col'>
            <Label className='text-sm text-gray-400 font-medium'>
              Device Name
            </Label>
            <SaveInput
              placeholder='Enter device name...'
              value={localDeviceName}
              onChange={(e) => onDeviceNameChange(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-sm text-gray-400 font-medium'>
              Machine ID
            </Label>
            <div className='flex items-center gap-2'>
              <SaveInput
                readOnly
                value={sysInfo?.device_id || 'Loading...'}
                className='flex-1'
              />
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    size='sm'
                    variant='ghost'
                    className='text-primary-400 min-w-8 w-8 h-8 hover:bg-primary-400/10'
                    onPress={copyMachineId}
                  >
                    {copied ? (
                      <Check className='w-4 h-4' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {copied ? 'Copied!' : 'Copy Machine ID'}
                </Tooltip.Content>
              </Tooltip>
            </div>
            <p className='text-[10px] text-gray-500'>
              Unique hardware identifier used for conflict resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
