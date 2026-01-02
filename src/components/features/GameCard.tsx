import { Button, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { Folder, RefreshCw, Settings, CloudDownload, Trash2, MoreVertical, FolderOpen } from 'lucide-react'
import { type Game, type GamePlatform, useGamesStore } from '@/stores/gamesStore'
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
    const removeGame = useGamesStore(state => state.removeGame)

    const handleSync = async () => {
        await performSync(game.id)
    }

    const handleRestore = async () => {
        if (confirm(`Do you want to restore the latest cloud backup for ${game.name}? This will overwrite your current local saves.`)) {
            await performRestore(game.id)
        }
    }

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to remove "${game.name}" from tracking? This will NOT delete your save files.`)) {
            await removeGame(game.id)
        }
    }

    const handleOpenFolder = async () => {
        try {
            const { open } = await import('@tauri-apps/plugin-shell')
            await open(game.local_path)
        } catch (e) {
            console.error('Failed to open folder:', e)
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
                    <div className="w-full h-full bg-linear-to-br from-primary-600/20 to-primary-800/20 flex items-center justify-center p-4">
                        <span className="text-white/20 font-bold text-xl uppercase tracking-widest">{game.name.slice(0, 3)}</span>
                    </div>
                )}

                {/* Platform badge */}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${platform.color} shadow-lg shadow-black/20`}>
                    {platform.label}
                </span>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-bg-card via-transparent to-transparent opacity-80" />
            </div>

            <CardContent className="p-4 pt-2">
                {/* Title and status */}
                <div className="flex items-start justify-between mb-2 -translate-y-4">
                    <div className="w-full">
                        <h3 className="font-bold text-white text-lg leading-tight truncate pr-2 drop-shadow-md">{game.name}</h3>
                    </div>
                </div>

                <div className="-mt-2">
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
                            <Tooltip closeDelay={0}>
                                <Tooltip.Trigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        onPress={handleSync}
                                        isDisabled={game.status === 'syncing'}
                                    >
                                        <RefreshCw className={`w-4 h-4 ${game.status === 'syncing' ? 'animate-spin text-primary-400' : ''}`} />
                                    </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Content>Sync Now</Tooltip.Content>
                            </Tooltip>
                            <Tooltip closeDelay={0}>
                                <Tooltip.Trigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        onPress={handleRestore}
                                        isDisabled={game.status === 'syncing'}
                                    >
                                        <CloudDownload className="w-4 h-4" />
                                    </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Content>Restore from Cloud</Tooltip.Content>
                            </Tooltip>
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Game actions">
                                    <DropdownItem
                                        key="open"
                                        onPress={handleOpenFolder}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="w-4 h-4" />
                                            <span>Open Folder</span>
                                        </div>
                                    </DropdownItem>
                                    <DropdownItem
                                        key="settings"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Settings className="w-4 h-4" />
                                            <span>Settings</span>
                                        </div>
                                    </DropdownItem>
                                    <DropdownItem
                                        key="delete"
                                        className="text-danger"
                                        onPress={handleDelete}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" />
                                            <span>Remove Game</span>
                                        </div>
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
