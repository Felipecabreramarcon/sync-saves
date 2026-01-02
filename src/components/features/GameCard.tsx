import { Button, Tooltip } from '@heroui/react'
import { Folder, RefreshCw, Settings, CloudDownload } from 'lucide-react'
import { type Game, type GamePlatform } from '@/stores/gamesStore'
import { Card, CardContent } from '@/components/common/Card'
import { useSyncStore } from '@/stores/syncStore'

const platformConfig: Record<GamePlatform, { label: string; color: string }> = {
    steam: { label: 'STEAM', color: 'bg-blue-600' },
    epic: { label: 'EPIC', color: 'bg-gray-700' },
    gog: { label: 'GOG', color: 'bg-indigo-600' },
    other: { label: 'OTHER', color: 'bg-gray-600' },
}

export default function GameCard({ game }: { game: Game }) {
    const performSync = useSyncStore(state => state.performSync)
    const performRestore = useSyncStore(state => state.performRestore)

    const handleSync = async () => {
        await performSync(game.id)
    }

    const handleRestore = async () => {
        if (confirm(`Do you want to restore the latest cloud backup for ${game.name}? This will overwrite your current local saves.`)) {
            await performRestore(game.id)
        }
    }

    const getTimeAgo = (date?: string) => {
        if (!date) return 'Syncing...'
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
        if (seconds < 60) return 'Just now'
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
        return `${Math.floor(seconds / 86400)}d ago`
    }

    const platform = platformConfig[game.platform]
    const statusColor = {
        synced: 'bg-success',
        syncing: 'bg-warning animate-pulse',
        error: 'bg-danger',
        pending: 'bg-gray-400',
        idle: 'bg-gray-500',
    }[game.status] || 'bg-gray-400'

    return (
        <Card glass className="border-primary-600/20 hover:border-primary-500/50 transition-all duration-300 overflow-hidden group">
            {/* Cover Image */}
            <div className="relative h-36 overflow-hidden">
                {game.cover_url ? (
                    <img
                        src={game.cover_url}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-600/20 to-primary-800/20 flex items-center justify-center p-4">
                        <span className="text-white/20 font-bold text-xl uppercase tracking-widest">{game.name.slice(0, 3)}</span>
                    </div>
                )}

                {/* Platform badge */}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${platform.color} shadow-lg shadow-black/20`}>
                    {platform.label}
                </span>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-80" />
            </div>

            <CardContent className="p-4 pt-2">
                {/* Title and status */}
                <div className="flex items-start justify-between mb-2 translate-y-[-1rem]">
                    <div className="w-full">
                        <h3 className="font-bold text-white text-lg leading-tight truncate pr-2 drop-shadow-md">{game.name}</h3>
                    </div>
                </div>

                <div className="mt-[-0.5rem]">
                    {/* Path */}
                    <div className="flex items-center gap-2 mb-4 group/path">
                        <Folder className="w-3 h-3 text-gray-500 shrink-0 group-hover/path:text-primary-400 transition-colors" />
                        <span className="text-xs text-gray-500 font-mono truncate group-hover/path:text-gray-300 transition-colors">{game.local_path}</span>
                    </div>

                    {/* Sync info and actions */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 tracking-wider">LAST SYNC</p>
                                <p className="text-xs text-gray-300 font-medium">
                                    {getTimeAgo(game.last_synced_at)}
                                    <span className="text-gray-600 mx-1">•</span>
                                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-400">v{game.last_synced_version}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip content="Sync Now" closeDelay={0}>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                    onPress={handleSync}
                                    isDisabled={game.status === 'syncing'}
                                >
                                    <RefreshCw className={`w-4 h-4 ${game.status === 'syncing' ? 'animate-spin text-primary-400' : ''}`} />
                                </Button>
                            </Tooltip>
                            <Tooltip content="Restore from Cloud" closeDelay={0}>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                    onPress={handleRestore}
                                    isDisabled={game.status === 'syncing'}
                                >
                                    <CloudDownload className="w-4 h-4" />
                                </Button>
                            </Tooltip>
                            <Tooltip content="Settings" closeDelay={0}>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
