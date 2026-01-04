import { Switch, Label, Button, Tooltip, Select, ListBox } from '@heroui/react';
import { FolderOpen, Info, AlertTriangle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { SaveInput } from '@/components/common/SaveInput';
import { isProtectedPath } from '@/lib/utils';
import type { GamePlatform } from '@/stores/gamesStore';

const platforms: { value: GamePlatform; label: string }[] = [
  { value: 'steam', label: 'Steam' },
  { value: 'epic', label: 'Epic Games' },
  { value: 'gog', label: 'GOG' },
  { value: 'other', label: 'Other' },
];

interface GeneralTabProps {
  name: string;
  localPath: string;
  platform: GamePlatform;
  syncEnabled: boolean;
  onNameChange: (value: string) => void;
  onLocalPathChange: (value: string) => void;
  onPlatformChange: (value: GamePlatform) => void;
  onSyncEnabledChange: (value: boolean) => void;
}

/**
 * General settings tab for game configuration.
 */
export function GeneralTab({
  name,
  localPath,
  platform,
  syncEnabled,
  onNameChange,
  onLocalPathChange,
  onPlatformChange,
  onSyncEnabledChange,
}: GeneralTabProps) {
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Game Save Folder',
        defaultPath: localPath || undefined,
      });

      if (selected) {
        onLocalPathChange(selected as string);
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
    }
  };

  return (
    <div className='p-6 overflow-y-auto'>
      <div className='space-y-6'>
        {/* Game Name */}
        <div className='space-y-1.5 flex flex-col'>
          <Label className='text-sm text-gray-400 font-medium ml-1'>
            Game Title
          </Label>
          <SaveInput
            placeholder='e.g. Elden Ring'
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>

        {/* Save Folder */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm text-gray-400 font-medium'>
              Save Folder Location
            </Label>
            <Tooltip>
              <Tooltip.Trigger>
                <Info className='w-3.5 h-3.5 text-gray-600 cursor-help' />
              </Tooltip.Trigger>
              <Tooltip.Content>
                The directory where the game stores its save files
              </Tooltip.Content>
            </Tooltip>
          </div>
          <div className='flex gap-2'>
            <SaveInput
              placeholder='C:\Users\...\Saved Games'
              value={localPath}
              onChange={(e) => onLocalPathChange(e.target.value)}
              readOnly
              className='flex-1'
            />
            <Button
              onPress={handleSelectFolder}
              className='bg-primary-900/30 text-primary-400 border border-primary-500/20 h-12 w-12 min-w-12 rounded-xl hover:bg-primary-900/50 transition-colors flex flex-row items-center justify-center'
            >
              <FolderOpen className='w-5 h-5' />
            </Button>
          </div>
          {localPath && isProtectedPath(localPath) && (
            <div className='mt-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20 flex items-start gap-3'>
              <AlertTriangle className='w-4 h-4 text-warning-500 shrink-0 mt-0.5' />
              <p className='text-[11px] text-warning-200 leading-relaxed'>
                This path appears to be a protected system folder. Syncing might
                fail due to permission restrictions.
              </p>
            </div>
          )}
        </div>

        {/* Platform */}
        <div className='space-y-1.5'>
          <Label className='text-sm text-gray-400 font-medium ml-1'>
            Platform
          </Label>
          <Select
            aria-label='Platform Source'
            selectedKey={platform}
            onSelectionChange={(key) => onPlatformChange(key as GamePlatform)}
          >
            <Select.Trigger className='w-full bg-bg-elevated border border-white/10 rounded-xl px-4 text-white hover:border-primary-500/50 transition-colors'>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {platforms.map((p) => (
                  <ListBox.Item key={p.value} id={p.value} textValue={p.label}>
                    {p.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Auto-Sync Toggle */}
        <div className='p-4 rounded-xl bg-bg-elevated/30 border border-white/5 flex items-center justify-between'>
          <div className='space-y-0.5'>
            <p className='text-sm font-semibold text-white'>
              Auto-Sync Enabled
            </p>
            <p className='text-[11px] text-gray-500 font-medium'>
              Automatically backup saves when changes are detected
            </p>
          </div>
          <Switch
            aria-label='Toggle Auto-Sync'
            isSelected={syncEnabled}
            onChange={onSyncEnabledChange}
            size='sm'
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>
      </div>
    </div>
  );
}
