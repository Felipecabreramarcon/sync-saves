import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { Check } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import {
  getSystemInfo,
  type SystemInfo,
  getDeviceName,
  setDeviceName,
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from '@/lib/tauri';
import { useGamesStore } from '@/stores/gamesStore';
import {
  getUserDevices,
  registerCurrentDevice,
  removeDevice,
  type Device,
} from '@/lib/devices';
import {
  DeviceInfoCard,
  SyncSettingsCard,
  UserProfileCard,
  DevicesListCard,
} from '@/components/settings';
import { confirmDangerousAction } from '@/lib/confirm';

export default function Settings() {
  const { user } = useAuthStore();
  const {
    deviceName,
    setDeviceName: setStoreDeviceName,
    storageUsage,
  } = useGamesStore();

  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [localDeviceName, setLocalDeviceName] = useState(deviceName);
  const [hasChanges, setHasChanges] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  // Settings state
  const [settings, setSettings] = useState<AppSettings>({
    launch_on_startup: true,
    desktop_notifications: false,
    auto_sync_enabled: true,
  });

  useEffect(() => {
    getSystemInfo().then(setSysInfo);
    getDeviceName().then((name) => {
      setLocalDeviceName(name);
      setStoreDeviceName(name);
    });
    getAppSettings().then(setSettings);
  }, [setStoreDeviceName]);

  useEffect(() => {
    if (user?.id) {
      registerCurrentDevice(user.id).then(() => {
        getUserDevices(user.id).then((d) => {
          setDevices(d);
          setLoadingDevices(false);
        });
      });
    }
  }, [user?.id]);

  const handleRemoveDevice = async (deviceId: string) => {
    const confirmed = await confirmDangerousAction(
      'Are you sure you want to remove this device?',
      'Remove Device'
    );
    if (confirmed) {
      const success = await removeDevice(deviceId);
      if (success) {
        setDevices(devices.filter((d) => d.id !== deviceId));
      }
    }
  };

  const handleDeviceNameChange = (value: string) => {
    setLocalDeviceName(value);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    await setDeviceName(localDeviceName);
    setStoreDeviceName(localDeviceName);
    await saveAppSettings(settings);
    setHasChanges(false);
  };

  const discardChanges = async () => {
    setLocalDeviceName(deviceName);
    const originalSettings = await getAppSettings();
    setSettings(originalSettings);
    setHasChanges(false);
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <div className='min-h-screen'>
      <PageHeader
        title='Settings'
        subtitle='Manage your device configuration and sync preferences'
        showSyncButton={false}
        rightContent={
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
            <Button
              variant='tertiary'
              isDisabled={!hasChanges}
              onPress={discardChanges}
            >
              Discard
            </Button>
            <Button
              variant='primary'
              isDisabled={!hasChanges}
              onPress={saveChanges}
            >
              <Check className='w-4 h-4' />
              Save Changes
            </Button>
          </div>
        }
      />

      <div className='p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl mx-auto'>
        {/* Left Column (Main Settings) */}
        <div className='lg:col-span-7 space-y-6'>
          <DeviceInfoCard
            sysInfo={sysInfo}
            localDeviceName={localDeviceName}
            onDeviceNameChange={handleDeviceNameChange}
          />
          <SyncSettingsCard
            settings={settings}
            onUpdateSetting={updateSetting}
            sysInfo={sysInfo}
          />
        </div>

        {/* Right Column (Account & Devices) */}
        <div className='lg:col-span-5 space-y-6'>
          <UserProfileCard
            email={user?.email}
            avatarUrl={user?.avatar_url}
            storageUsage={storageUsage}
          />
          <DevicesListCard
            devices={devices}
            loadingDevices={loadingDevices}
            onRemoveDevice={handleRemoveDevice}
          />
        </div>
      </div>
    </div>
  );
}
