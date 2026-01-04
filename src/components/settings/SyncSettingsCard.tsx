import { Switch } from '@heroui/react';
import { Clock } from 'lucide-react';
import type { SystemInfo, AppSettings } from '@/lib/tauri';

interface SyncSettingsCardProps {
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
  sysInfo: SystemInfo | null;
}

/**
 * Reusable component for sync preference toggle rows.
 */
interface SettingToggleRowProps {
  title: string;
  description: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}

export function SettingToggleRow({
  title,
  description,
  isSelected,
  onChange,
}: SettingToggleRowProps) {
  return (
    <div className='flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group'>
      <div className='space-y-0.5 text-left min-w-0 flex-1 pr-4'>
        <p className='text-sm font-semibold text-white group-hover:text-primary-300 transition-colors'>
          {title}
        </p>
        <p className='text-xs text-gray-500'>{description}</p>
      </div>
      <Switch isSelected={isSelected} onChange={onChange}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </div>
  );
}

/**
 * Card component for sync/behavior settings.
 */
export function SyncSettingsCard({
  settings,
  onUpdateSetting,
}: SyncSettingsCardProps) {
  return (
    <div className='bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/20'>
      <div className='p-4 sm:p-6 lg:p-8 text-center sm:text-left'>
        <div className='flex items-center gap-4 mb-8'>
          <div className='w-12 h-12 rounded-xl bg-secondary-900/30 flex items-center justify-center border border-secondary-500/20 shadow-inner shadow-secondary-500/10'>
            <Clock className='w-6 h-6 text-secondary-400' />
          </div>
          <h3 className='text-xl font-bold text-white tracking-tight'>
            Sync Settings
          </h3>
        </div>

        <div className='space-y-6'>
          <SettingToggleRow
            title='Launch on Startup'
            description='Start syncing automatically when Windows boots'
            isSelected={settings.launch_on_startup}
            onChange={(isSelected) =>
              onUpdateSetting('launch_on_startup', isSelected)
            }
          />

          <SettingToggleRow
            title='Desktop Notifications'
            description='Show toast when saves are uploaded or downloaded'
            isSelected={settings.desktop_notifications}
            onChange={(isSelected) =>
              onUpdateSetting('desktop_notifications', isSelected)
            }
          />

          <SettingToggleRow
            title='Auto-Sync on File Change'
            description='Automatically sync when save files are modified'
            isSelected={settings.auto_sync_enabled}
            onChange={(isSelected) =>
              onUpdateSetting('auto_sync_enabled', isSelected)
            }
          />
        </div>
      </div>
    </div>
  );
}
