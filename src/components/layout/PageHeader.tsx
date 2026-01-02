import { Button } from '@heroui/react'
import { RefreshCw } from 'lucide-react'
import { useSyncStore } from '@/stores/syncStore'

interface PageHeaderProps {
    title: string
    subtitle?: string
    showSyncButton?: boolean
    rightContent?: React.ReactNode
}

export default function PageHeader({
    title,
    subtitle,
    showSyncButton = true,
    rightContent
}: PageHeaderProps) {
    const { status, message, isBackendConnected } = useSyncStore()

    const statusColor = {
        idle: 'bg-gray-500',
        syncing: 'bg-primary animate-pulse',
        success: 'bg-success',
        error: 'bg-danger',
    }[status] || 'bg-gray-500'

    return (
        <header className="px-8 py-6 border-b border-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left Side: Title & Subtitle */}
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                        {title}
                        <div
                            className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-success' : 'bg-danger/50'}`}
                            title={isBackendConnected ? "Backend Connected" : "Backend Disconnected"}
                        />
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-gray-400">{subtitle}</p>
                    )}
                </div>

                {/* Right Side: Sync Status & Actions */}
                <div className="flex items-center gap-4">
                    {showSyncButton && (
                        <div className="hidden sm:flex items-center gap-3 bg-bg-elevated px-4 py-2 rounded-xl border border-white/5">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                            <span className="text-sm font-medium text-gray-300">
                                {message || (status === 'idle' ? 'All Synced' : status.toUpperCase())}
                            </span>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                radius="full"
                                className="ml-2 text-gray-400 hover:text-white min-w-8 w-8 h-8 flex items-center justify-center p-0"
                            >
                                <RefreshCw className={`w-4 h-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    )}

                    {rightContent && (
                        <div className="flex items-center gap-3">
                            {rightContent}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
