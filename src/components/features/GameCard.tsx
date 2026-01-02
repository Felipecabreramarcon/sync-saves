import { memo } from 'react'
import { Card, CardBody, Button, Tooltip } from '@heroui/react'
import { Folder, RefreshCw, Settings } from 'lucide-react'
import { type Game, type GamePlatform } from '@/stores/gamesStore'

const platformConfig: Record<GamePlatform, { label: string; color: string }> = {
    steam: { label: 'STEAM', color: 'bg-blue-600' },
    epic: { label: 'EPIC', color: 'bg-gray-700' },
    gog: { label: 'GOG', color: 'bg-red-600' },
    other: { label: 'OTHER', color: 'bg-gray-600' },
}

function GameCard({ game }: { game: Game }) {
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
        <Card className="glass-card border-primary-600/20 hover:border-primary-500/40 transition-all duration-300 overflow-hidden group">
            {/* Cover Image */}
            <div className="relative h-32 overflow-hidden">
                {game.cover_url ? (
                    <img
                        src={game.cover_url}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-600/20 to-primary-800/20" />
                )}

                {/* Platform badge */}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${platform.color}`}>
                    {platform.label}
                </span>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
            </div>

            <CardBody className="p-4 pt-2">
                {/* Title and status */}
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white text-lg leading-tight">{game.name}</h3>
                    <span className={`w-2.5 h-2.5 rounded-full ${statusColor} shrink-0 mt-1.5`} />
                </div>

                {/* Path */}
                <div className="flex items-center gap-2 mb-3">
                    <Folder className="w-3 h-3 text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-500 font-mono truncate">{game.local_path}</span>
                </div>

                {/* Sync info and actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-gray-500 tracking-wider">LAST SYNC</span>
                        <p className="text-sm text-gray-300 font-medium flex items-center gap-2">
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-xs text-gray-400">v{game.last_synced_version}</span>
                            <span>{getTimeAgo(game.last_synced_at)}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Tooltip content="Sync Now">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-gray-400 hover:text-white flex flex-row items-center justify-center"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Settings">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-gray-400 hover:text-white flex flex-row items-center justify-center"
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default memo(GameCard)
