import { useEffect, useState } from 'react'
import { Select, SelectItem, Switch, Button, Progress, Avatar, Chip, Tooltip } from '@heroui/react'
import {
    Monitor,
    Clock,
    Copy,
    Plus,
    Check,
    Laptop,
    Apple
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { getSystemInfo, type SystemInfo } from '@/lib/tauri'
import { Card, CardContent } from '@/components/common/Card'
import { SaveInput } from '@/components/common/SaveInput'
import { SaveButton } from '@/components/common/SaveButton'

const syncIntervals = [
    { key: '1', label: 'Every 1 minute' },
    { key: '5', label: 'Every 5 minutes' },
    { key: '10', label: 'Every 10 minutes' },
    { key: '15', label: 'Every 15 minutes' },
    { key: '30', label: 'Every 30 minutes' },
]

const mockDevices = [
    { id: '1', name: 'Steam Deck', os: 'Linux', lastSeen: '2m ago', status: 'online', icon: Laptop },
    { id: '2', name: 'Work Laptop', os: 'Windows 10', lastSeen: '2d ago', status: 'offline', icon: Laptop },
    { id: '3', name: 'MacBook Pro', os: 'macOS', lastSeen: '5d ago', status: 'offline', icon: Apple },
]

export default function Settings() {
    const { user } = useAuthStore()
    const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        getSystemInfo().then(setSysInfo)
    }, [])

    const copyMachineId = () => {
        const id = "8f7a-2b3c-4d5e-9f0a" // Mock ID for now
        navigator.clipboard.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="min-h-screen">
            <PageHeader
                title="Settings"
                subtitle="Manage your device configuration and sync preferences"
                showSyncButton={false}
                rightContent={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="flat"
                            radius="lg"
                            className="bg-bg-elevated text-gray-400 hover:text-white border border-white/5 font-semibold"
                        >
                            Discard
                        </Button>
                        <Button
                            color="primary"
                            radius="lg"
                            className="bg-primary-500 text-white shadow-xl shadow-primary-500/30 font-bold px-6"
                            startContent={<Check className="w-4 h-4" />}
                        >
                            Save Changes
                        </Button>
                    </div>
                }
            />

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
                {/* Left Column (Main Settings) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* This Device */}
                    <Card glass className="shadow-2xl shadow-black/20">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-900/30 flex items-center justify-center border border-primary-500/20 shadow-inner shadow-primary-500/10">
                                        <Monitor className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">This Device</h3>
                                </div>
                                <Chip
                                    variant="flat"
                                    color="primary"
                                    startContent={<Check className="w-3 h-3 ml-1" />}
                                    className="bg-primary-900/30 text-primary-400 border border-primary-500/20 font-medium h-7"
                                >
                                    {sysInfo?.os_name || "Windows 11"}
                                </Chip>
                            </div>

                            <div className="space-y-6">
                                <SaveInput
                                    label="Device Name"
                                    placeholder="Enter device name..."
                                    defaultValue={sysInfo?.hostname || "Gaming Rig 01"}
                                    labelPlacement="outside"
                                />

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400 font-medium">Machine ID</label>
                                    <div className="flex items-center gap-2">
                                        <SaveInput
                                            isReadOnly
                                            value="8f7a-2b3c-4d5e-9f0a"
                                            classNames={{
                                                inputWrapper: "bg-bg-elevated/50 border-white/10 h-10 rounded-xl",
                                                input: "text-gray-400 font-mono text-xs"
                                            }}
                                            endContent={
                                                <Tooltip content={copied ? "Copied!" : "Copy Machine ID"}>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        radius="md"
                                                        className="text-primary-400 min-w-8 w-8 h-8 hover:bg-primary-400/10"
                                                        onPress={copyMachineId}
                                                    >
                                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    </Button>
                                                </Tooltip>
                                            }
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500">Unique hardware identifier used for conflict resolution.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sync Settings */}
                    <Card glass className="shadow-2xl shadow-black/20">
                        <CardContent className="p-8 text-center sm:text-left">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-secondary-900/30 flex items-center justify-center border border-secondary-500/20 shadow-inner shadow-secondary-500/10">
                                    <Clock className="w-6 h-6 text-secondary-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Sync Settings</h3>
                            </div>

                            <div className="space-y-8">
                                <Select
                                    label="Sync Frequency"
                                    placeholder="Select frequency"
                                    defaultSelectedKeys={['5']}
                                    labelPlacement="outside"
                                    classNames={{
                                        label: "text-gray-400 font-medium mb-1.5",
                                        trigger: "bg-bg-elevated border-white/10 h-12 rounded-xl hover:border-primary-500/30 transition-colors data-[open=true]:border-primary-500/50",
                                        value: "text-gray-200",
                                        popoverContent: "bg-bg-elevated border-white/10"
                                    }}
                                >
                                    {syncIntervals.map((interval) => (
                                        <SelectItem key={interval.key} className="text-gray-300 data-[hover=true]:bg-white/5 data-[hover=true]:text-white">
                                            {interval.label}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                                        <div className="space-y-0.5 text-left">
                                            <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">Launch on Startup</p>
                                            <p className="text-xs text-gray-500">Start syncing automatically when Windows boots</p>
                                        </div>
                                        <Switch defaultSelected color="primary" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                                        <div className="space-y-0.5 text-left">
                                            <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">Desktop Notifications</p>
                                            <p className="text-xs text-gray-500">Show toast when saves are uploaded or downloaded</p>
                                        </div>
                                        <Switch color="primary" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (Account & Devices) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* User Profile */}
                    <Card glass className="shadow-2xl shadow-primary-900/10 overflow-hidden relative">
                        {/* Background blur effect */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/10 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none" />

                        <CardContent className="p-8 relative">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="relative">
                                    <Avatar
                                        src={user?.avatar_url || "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                                        className="w-16 h-16 text-large border-2 border-white/10"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-bg-card" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white truncate">{user?.email || 'gamer@example.com'}</p>
                                    <p className="text-xs font-bold text-primary-400 uppercase tracking-widest mt-0.5">Pro Plan</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-bg-elevated/50 border border-white/5 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Storage Status</span>
                                    <span className="text-sm font-bold text-white">45MB <span className="text-gray-500 text-xs">/ 1GB</span></span>
                                </div>
                                <Progress
                                    value={45}
                                    classNames={{
                                        base: "h-2",
                                        track: "bg-gray-800/50",
                                        indicator: "bg-gradient-to-r from-primary-500 to-primary-400 shadow-lg shadow-primary-500/50",
                                    }}
                                />
                                <div className="flex items-center justify-between mt-4">
                                    <Button
                                        variant="light"
                                        size="sm"
                                        radius="md"
                                        className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-widest px-2 h-8 min-w-0"
                                    >
                                        Upgrade Plan
                                    </Button>
                                    <Button
                                        variant="light"
                                        size="sm"
                                        radius="md"
                                        className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest px-2 h-8 min-w-0"
                                    >
                                        Clear Cache
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Your Devices */}
                    <Card glass className="shadow-2xl shadow-black/20">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white tracking-tight">Your Devices</h3>
                                <Button
                                    isIconOnly
                                    variant="light"
                                    radius="lg"
                                    className="text-primary-400 min-w-9 w-9 h-9 hover:bg-primary-400/10"
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {mockDevices.map((device) => {
                                    const DeviceIcon = device.icon
                                    return (
                                        <div
                                            key={device.id}
                                            className="group flex items-center justify-between p-4 rounded-xl bg-bg-elevated/30 border border-white/5 hover:border-white/10 hover:bg-bg-elevated/50 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 bg-bg-elevated/50 transition-colors ${device.status === 'online' ? 'text-primary-400 shadow-lg shadow-primary-500/10' : 'text-gray-600'}`}>
                                                    <DeviceIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors">{device.name}</span>
                                                        <Chip
                                                            size="sm"
                                                            variant="dot"
                                                            color={device.status === 'online' ? 'success' : 'default'}
                                                            className={`bg-transparent text-[10px] font-bold uppercase tracking-widest ${device.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}
                                                        >
                                                            {device.status}
                                                        </Chip>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                                        {device.os} • Last seen {device.lastSeen}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-8 text-center">
                                <Button
                                    variant="light"
                                    size="sm"
                                    radius="md"
                                    className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest h-auto min-w-0"
                                >
                                    Manage all devices
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
