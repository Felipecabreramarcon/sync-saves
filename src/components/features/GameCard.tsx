import { useCallback, useState } from 'react'
import { Button, Tooltip, Dropdown } from '@heroui/react'
import { Folder, RefreshCw, Settings, CloudDownload, Trash2, MoreVertical, FolderOpen } from 'lucide-react'
import { type Game, type GamePlatform, useGamesStore } from '@/stores/gamesStore'
import { Card, CardContent } from '@/components/common/Card'
import { useSyncStore } from '@/stores/syncStore'
import { toast } from '@/stores/toastStore'
import GameSettingsModal from './GameSettingsModal'

const platformConfig: Record<GamePlatform, { label: string; color: string }> = {
    steam: { label: 'STEAM', color: 'bg-blue-600' },
    epic: { label: 'EPIC', color: 'bg-gray-700' },
    gog: { label: 'GOG', color: 'bg-indigo-600' },
    other: { label: 'OTHER', color: 'bg-gray-600' },
}

const statusColorMap: Record<string, string> = {
    synced: 'bg-success',
    syncing: 'bg-warning animate-pulse',
    error: 'bg-danger',
    pending: 'bg-gray-400',
    idle: 'bg-gray-500',
}

function getTimeAgo(date?: string): string {
    if (!date) return 'Never'
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 0) return 'Just now'
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

async function openFolder(path: string): Promise<void> {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(path)
}

export default function GameCard({ game }: { game: Game }) {
    const performSync = useSyncStore(state => state.performSync)
    const performRestore = useSyncStore(state => state.performRestore)
    const removeGame = useGamesStore(state => state.removeGame)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const isSyncing = game.status === 'syncing'
    const platform = platformConfig[game.platform]
    const statusColor = statusColorMap[game.status] ?? 'bg-gray-400'

    const handleSync = useCallback(async () => {
        try {
            await performSync(game.id)
        } catch (error) {
            console.error('Sync failed:', error)
            toast.error('Sync Failed', error instanceof Error ? error.message : 'Unknown error occurred')
        }
    }, [game.id, performSync])

    const handleRestore = useCallback(async () => {
        const confirmed = window.confirm(
            `Do you want to restore the latest cloud backup for ${game.name}? This will overwrite your current local saves.`
        )
        if (!confirmed) return

        try {
            await performRestore(game.id)
            toast.success('Restore Complete', `${game.name} saves restored from cloud`)
        } catch (error) {
            console.error('Restore failed:', error)
            toast.error('Restore Failed', error instanceof Error ? error.message : 'Unknown error occurred')
        }
    }, [game.id, game.name, performRestore])

    const handleDelete = useCallback(async () => {
        const confirmed = window.confirm(
            `Are you sure you want to remove "${game.name}" from tracking? This will NOT delete your save files.`
        )
        if (!confirmed) return

        try {
            await removeGame(game.id)
            toast.success('Game Removed', `${game.name} is no longer being tracked`)
        } catch (error) {
            console.error('Delete failed:', error)
            toast.error('Remove Failed', error instanceof Error ? error.message : 'Unknown error occurred')
        }
    }, [game.id, game.name, removeGame])

    const handleOpenFolder = useCallback(async () => {
        try {
            await openFolder(game.local_path)
        } catch (error) {
            console.error('Failed to open folder:', error)
            toast.error('Could not open folder', 'Make sure the path exists and is accessible')
        }
    }, [game.local_path])

    const handleDropdownAction = useCallback((key: React.Key) => {
        switch (key) {
            case 'open':
                handleOpenFolder()
                break
            case 'settings':
                setIsSettingsOpen(true)
                break
            case 'delete':
                handleDelete()
                break
        }
    }, [handleOpenFolder, handleDelete])

    return (
        <Card glass className="border-primary-600/20 flex flex-col hover:border-primary-500/50 transition-all duration-300  group">
            {/* Cover Image */}
            <div className="relative h-36 overflow-hidden shrink-0">
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

            <CardContent className="p-4 pt-2 overflow-hidden">
                {/* Title and status */}
                <div className="mb-2 -translate-y-4 min-w-0">
                    <h3 className="font-bold text-white text-lg leading-tight truncate drop-shadow-md">{game.name}</h3>
                </div>

                <div className="-mt-2 min-w-0">
                    {/* Path */}
                    <div className="flex items-center gap-2 mb-4 group/path min-w-0">
                        <Folder className="w-3 h-3 text-gray-500 shrink-0 group-hover/path:text-primary-400 transition-colors" />
                        <span className="text-xs text-gray-500 font-mono truncate group-hover/path:text-gray-300 transition-colors min-w-0">{game.local_path}</span>
                    </div>

                    {/* Sync info and actions */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0 shrink">
                            <span className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-500 tracking-wider whitespace-nowrap">SYNC</p>
                                <p className="text-xs text-gray-300 font-medium whitespace-nowrap">
                                    {getTimeAgo(game.last_synced_at)}
                                    <span className="text-gray-600 mx-1">•</span>
                                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-400">v{game.last_synced_version}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Tooltip closeDelay={0}>
                                <Tooltip.Trigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        onPress={handleSync}
                                        isDisabled={isSyncing}
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary-400' : ''}`} />
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
                                        isDisabled={isSyncing}
                                    >
                                        <CloudDownload className="w-4 h-4" />
                                    </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Content>Restore from Cloud</Tooltip.Content>
                            </Tooltip>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </Dropdown.Trigger>
                                <Dropdown.Popover>
                                    <Dropdown.Menu aria-label="Game actions" onAction={handleDropdownAction}>
                                        <Dropdown.Item id="open" textValue="Open Folder">
                                            <div className="flex items-center gap-2">
                                                <FolderOpen className="w-4 h-4" />
                                                <span>Open Folder</span>
                                            </div>
                                        </Dropdown.Item>
                                        <Dropdown.Item id="settings" textValue="Settings">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-4 h-4" />
                                                <span>Settings</span>
                                            </div>
                                        </Dropdown.Item>
                                        <Dropdown.Item id="delete" textValue="Remove Game" className="text-danger">
                                            <div className="flex items-center gap-2">
                                                <Trash2 className="w-4 h-4" />
                                                <span>Remove Game</span>
                                            </div>
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown.Popover>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Game Settings Modal */}
            <GameSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                game={game}
            />
        </Card>
    )
}
