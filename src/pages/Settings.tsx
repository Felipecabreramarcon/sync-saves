import { useEffect, useState } from 'react'
import { Card, CardBody, Input, Select, SelectItem, Switch, Button, Progress, Avatar, Chip } from '@heroui/react'
import { Monitor, Clock, Power, Minimize2, LogOut, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { getSystemInfo, type SystemInfo } from '@/lib/tauri'

const syncIntervals = [
    { key: '1', label: '1 minute' },
    { key: '5', label: '5 minutes' },
    { key: '10', label: '10 minutes' },
    { key: '15', label: '15 minutes' },
    { key: '30', label: '30 minutes' },
]

const mockDevices = [
    { id: '1', name: 'Desktop PC', os: 'Windows 11', lastSeen: '2 hours ago', isCurrent: true },
    { id: '2', name: 'Gaming Laptop', os: 'Windows 10', lastSeen: '3 days ago', isCurrent: false },
]

export default function Settings() {
    const { user, logout } = useAuthStore()
    const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)

    useEffect(() => {
        getSystemInfo().then(setSysInfo)
    }, [])

    const handleLogout = () => {
        logout()
    }

    return (
        <div className="min-h-screen">
            <PageHeader
                title="Settings"
                showSyncButton={false}
            />

            <div className="p-8 max-w-4xl space-y-6">
                {/* This Device */}
                <Card className="glass-card">
                    <CardBody className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-primary-400" />
                            This Device
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-gray-400">Device Name</label>
                                <Input
                                    placeholder="Enter device name..."
                                    defaultValue={sysInfo?.hostname || "Desktop PC"}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Machine Info</label>
                                    <p className="text-sm text-gray-300 font-mono bg-bg-elevated p-3 rounded-lg border border-white/5">
                                        {sysInfo ? `${(sysInfo.total_memory / (1024 * 1024 * 1024)).toFixed(1)} GB RAM` : 'Loading...'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Operating System</label>
                                    <div className="flex items-center gap-2 bg-bg-elevated p-3 rounded-lg border border-white/5">
                                        <Chip size="sm" variant="flat" color="primary">
                                            {sysInfo ? `${sysInfo.os_name} ${sysInfo.os_version}` : 'Loading...'}
                                        </Chip>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Sync Settings */}
                <Card className="glass-card">
                    <CardBody className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary-400" />
                            Sync Settings
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-gray-400">Sync Interval</label>
                                <Select
                                    placeholder="Select interval"
                                    defaultSelectedKeys={['5']}
                                    variant="bordered"
                                >
                                    {syncIntervals.map((interval) => (
                                        <SelectItem key={interval.key}>{interval.label}</SelectItem>
                                    ))}
                                </Select>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Power className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-300">Start with Windows</span>
                                </div>
                                <Switch defaultSelected color="primary" />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Minimize2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-300">Minimize to system tray</span>
                                </div>
                                <Switch defaultSelected color="primary" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Account */}
                <Card className="glass-card">
                    <CardBody className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar
                                    src={user?.avatar_url}
                                    name={user?.name || 'User'}
                                    size="lg"
                                    classNames={{
                                        base: "ring-2 ring-primary-600/50",
                                    }}
                                />
                                <div>
                                    <p className="text-white font-medium">{user?.name || 'Alex Gamer'}</p>
                                    <p className="text-sm text-gray-400">{user?.email || 'alex@example.com'}</p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Storage Used</span>
                                    <span className="text-sm text-gray-300">45 MB / 1 GB</span>
                                </div>
                                <Progress
                                    value={4.5}
                                    classNames={{
                                        base: "h-2",
                                        track: "bg-gray-700",
                                        indicator: "bg-gradient-to-r from-primary-600 to-primary-400",
                                    }}
                                />
                            </div>

                            <Button
                                color="danger"
                                variant="flat"
                                className="flex flex-row items-center gap-2"
                                startContent={<LogOut className="w-4 h-4" />}
                                onPress={handleLogout}
                            >
                                Logout
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {/* Your Devices */}
                <Card className="glass-card">
                    <CardBody className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Your Devices</h3>
                        <div className="space-y-3">
                            {mockDevices.map((device) => (
                                <div
                                    key={device.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-bg-elevated/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Monitor className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">{device.name}</span>
                                                {device.isCurrent && (
                                                    <Chip size="sm" color="primary" variant="flat">Current</Chip>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{device.os} • Last seen: {device.lastSeen}</p>
                                        </div>
                                    </div>
                                    {!device.isCurrent && (
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}
