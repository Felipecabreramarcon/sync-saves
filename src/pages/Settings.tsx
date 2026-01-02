import { useEffect, useState } from "react";
import {
  Switch,
  Button,
  Avatar,
  Chip,
  Tooltip,
  Card,
  Label,
} from "@heroui/react";
import {
  Monitor,
  Clock,
  Copy,
  Check,
  Laptop,
  Apple,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import {
  getSystemInfo,
  type SystemInfo,
  getDeviceName,
  setDeviceName,
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/tauri";
import { SaveInput } from "@/components/common/SaveInput";
import { useGamesStore } from "@/stores/gamesStore";
import {
  getUserDevices,
  registerCurrentDevice,
  removeDevice,
  getRelativeTime,
  type Device,
} from "@/lib/devices";

const osIcons: Record<string, typeof Laptop> = {
  windows: Monitor,
  linux: Laptop,
  macos: Apple,
};

export default function Settings() {
  const { user } = useAuthStore();
  const {
    deviceName,
    setDeviceName: setStoreDeviceName,
    storageUsage,
  } = useGamesStore();
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [copied, setCopied] = useState(false);
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
    // Load settings
    getAppSettings().then(setSettings);
  }, [setStoreDeviceName]);

  useEffect(() => {
    if (user?.id) {
      // Register current device and load all devices
      registerCurrentDevice(user.id).then(() => {
        getUserDevices(user.id).then((d) => {
          setDevices(d);
          setLoadingDevices(false);
        });
      });
    }
  }, [user?.id]);

  const handleRemoveDevice = async (deviceId: string) => {
    if (confirm("Are you sure you want to remove this device?")) {
      const success = await removeDevice(deviceId);
      if (success) {
        setDevices(devices.filter((d) => d.id !== deviceId));
      }
    }
  };

  const copyMachineId = () => {
    const id = sysInfo?.device_id || "unknown";
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const storagePercentage = Math.min(
    (storageUsage / (1024 * 1024 * 1024)) * 100,
    100
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Settings"
        subtitle="Manage your device configuration and sync preferences"
        showSyncButton={false}
        rightContent={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="tertiary"
              isDisabled={!hasChanges}
              onPress={discardChanges}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              isDisabled={!hasChanges}
              onPress={saveChanges}
            >
              <Check className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl mx-auto">
        {/* Left Column (Main Settings) */}
        <div className="lg:col-span-7 space-y-6">
          {/* This Device */}
          <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/20">
            <Card.Content className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20 shadow-inner shadow-primary-500/10">
                    <Monitor className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    This Device
                  </h3>
                </div>
                <Chip
                  variant="soft"
                  color="accent"
                  className="bg-primary-900/30 text-primary-400 border border-primary-500/20 font-medium h-7"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {sysInfo?.os_name || "Windows 11"}
                </Chip>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-400 font-medium">
                    Device Name
                  </Label>
                  <SaveInput
                    placeholder="Enter device name..."
                    value={localDeviceName}
                    onChange={(e) => handleDeviceNameChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-400 font-medium">
                    Machine ID
                  </Label>
                  <div className="flex items-center gap-2">
                    <SaveInput
                      readOnly
                      value={sysInfo?.device_id || "Loading..."}
                      className="flex-1"
                    />
                    <Tooltip>
                      <Tooltip.Trigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          className="text-primary-400 min-w-8 w-8 h-8 hover:bg-primary-400/10"
                          onPress={copyMachineId}
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        {copied ? "Copied!" : "Copy Machine ID"}
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Unique hardware identifier used for conflict resolution.
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Sync Settings */}
          <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/20">
            <Card.Content className="p-4 sm:p-6 lg:p-8 text-center sm:text-left">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-secondary-900/30 flex items-center justify-center border border-secondary-500/20 shadow-inner shadow-secondary-500/10">
                  <Clock className="w-6 h-6 text-secondary-400" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Sync Settings
                </h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
                      Launch on Startup
                    </p>
                    <p className="text-xs text-gray-500">
                      Start syncing automatically when Windows boots
                    </p>
                  </div>
                  <Switch
                    isSelected={settings.launch_on_startup}
                    onChange={(isSelected) =>
                      updateSetting("launch_on_startup", isSelected)
                    }
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
                      Desktop Notifications
                    </p>
                    <p className="text-xs text-gray-500">
                      Show toast when saves are uploaded or downloaded
                    </p>
                  </div>
                  <Switch
                    isSelected={settings.desktop_notifications}
                    onChange={(isSelected) =>
                      updateSetting("desktop_notifications", isSelected)
                    }
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
                      Auto-Sync on File Change
                    </p>
                    <p className="text-xs text-gray-500">
                      Automatically sync when save files are modified
                    </p>
                  </div>
                  <Switch
                    isSelected={settings.auto_sync_enabled}
                    onChange={(isSelected) =>
                      updateSetting("auto_sync_enabled", isSelected)
                    }
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Right Column (Account & Devices) */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Profile */}
          <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-primary-900/10 overflow-hidden relative">
            {/* Background blur effect */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/10 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none" />

            <Card.Content className="p-4 sm:p-6 lg:p-8 relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <Avatar className="w-16 h-16 text-large border-2 border-white/10">
                    <Avatar.Image
                      src={
                        user?.avatar_url ||
                        "https://i.pravatar.cc/150?u=a042581f4e29026704d"
                      }
                      alt={user?.email || "User"}
                    />
                    <Avatar.Fallback>
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-bg-card" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white truncate">
                    {user?.email || "gamer@example.com"}
                  </p>
                  <p className="text-xs font-bold text-primary-400 uppercase tracking-widest mt-0.5">
                    Pro Plan
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-bg-elevated/50 border border-white/5 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Storage Status
                  </span>
                  <span className="text-sm font-bold text-white">
                    {formatSize(storageUsage)}{" "}
                    <span className="text-gray-500 text-xs">/ 1GB</span>
                  </span>
                </div>
                {/* Custom Progress Bar */}
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-primary-500 to-primary-400 shadow-lg shadow-primary-500/50 transition-all duration-300"
                    style={{ width: `${storagePercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-widest px-2 h-8 min-w-0"
                  >
                    Upgrade Plan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest px-2 h-8 min-w-0"
                  >
                    Clear Cache
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Your Devices */}
          <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/20">
            <Card.Content className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Your Devices
                </h3>
                <Chip
                  size="sm"
                  variant="soft"
                  className="bg-primary-900/30 text-primary-400 border border-primary-500/20"
                >
                  {devices.length} device{devices.length !== 1 ? "s" : ""}
                </Chip>
              </div>

              <div className="space-y-4">
                {loadingDevices ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading devices...
                  </div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No devices registered yet
                  </div>
                ) : (
                  devices.map((device) => {
                    const DeviceIcon =
                      (device.os && osIcons[device.os]) || Monitor;
                    const isOnline =
                      device.is_current ||
                      Date.now() - new Date(device.last_seen_at).getTime() <
                        300000; // 5 min
                    return (
                      <div
                        key={device.id}
                        className="group flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 hover:bg-bg-elevated/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 bg-bg-elevated/50 transition-colors ${
                              isOnline
                                ? "text-primary-400 shadow-lg shadow-primary-500/10"
                                : "text-gray-600"
                            }`}
                          >
                            <DeviceIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors">
                                {device.name}
                              </span>
                              {device.is_current && (
                                <Chip
                                  size="sm"
                                  variant="soft"
                                  className="bg-primary-900/30 text-primary-400 text-[9px] h-5"
                                >
                                  This device
                                </Chip>
                              )}
                              <Chip
                                size="sm"
                                variant="tertiary"
                                color={isOnline ? "success" : "default"}
                                className={`bg-transparent text-[10px] font-bold uppercase tracking-widest ${
                                  isOnline ? "text-green-500" : "text-gray-500"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    isOnline ? "bg-green-500" : "bg-gray-500"
                                  }`}
                                />
                                {isOnline ? "online" : "offline"}
                              </Chip>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                              {device.os
                                ? device.os.charAt(0).toUpperCase() +
                                  device.os.slice(1)
                                : "Unknown OS"}{" "}
                              • Last seen {getRelativeTime(device.last_seen_at)}
                            </p>
                          </div>
                        </div>
                        {!device.is_current && (
                          <Tooltip>
                            <Tooltip.Trigger>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                className="text-gray-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                onPress={() => handleRemoveDevice(device.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Remove device</Tooltip.Content>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
