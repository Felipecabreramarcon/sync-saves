
import { useState } from 'react'
import {
    Button,
    Input,
    useDisclosure,
} from '@heroui/react'
import {
    Plus,
    Search,
    Filter,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { type Game, useGamesStore } from '@/stores/gamesStore'
import { useShallow } from 'zustand/react/shallow'
import GameCard from '@/components/features/GameCard'
import { useEffect, useMemo } from 'react'
import AddGameCard from '@/components/features/AddGameCard'
import AddGameModal from '@/components/features/AddGameModal'

// Mock data for development
const mockGames: Game[] = [
    {
        id: '1',
        name: 'Cyberpunk 2077',
        slug: 'cyberpunk-2077',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4hku.webp',
        platform: 'steam',
        local_path: 'C:/Users/Alex/Saved Games/CD Projekt R...',
        sync_enabled: true,
        last_synced_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        last_synced_version: 42,
        status: 'synced',
    },
    {
        id: '2',
        name: 'Elden Ring',
        slug: 'elden-ring',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
        platform: 'steam',
        local_path: 'C:/Users/Alex/AppData/Roaming/EldenRin...',
        sync_enabled: true,
        last_synced_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        last_synced_version: 102,
        status: 'synced',
    },
    {
        id: '3',
        name: "Baldur's Gate 3",
        slug: 'baldurs-gate-3',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.webp',
        platform: 'gog',
        local_path: 'C:/Users/Alex/Larian Studios/Baldur\'s ...',
        sync_enabled: true,
        last_synced_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        last_synced_version: 12,
        status: 'synced',
    },
    {
        id: '4',
        name: 'Stardew Valley',
        slug: 'stardew-valley',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/xrpmydnu9rpxvxfjkiu7.webp',
        platform: 'steam',
        local_path: 'C:/Users/Alex/AppData/Roaming/StardewV...',
        sync_enabled: true,
        last_synced_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        last_synced_version: 8,
        status: 'synced',
    },
    {
        id: '5',
        name: 'Hades',
        slug: 'hades',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1nh3.webp',
        platform: 'epic',
        local_path: 'C:/Users/Alex/Documents/Saved Games/Ha...',
        sync_enabled: true,
        last_synced_at: undefined,
        last_synced_version: 55,
        status: 'syncing',
    },
    {
        id: '6',
        name: 'Factorio',
        slug: 'factorio',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1v77.webp',
        platform: 'steam',
        local_path: 'C:/Users/Alex/AppData/Roaming/Factorio...',
        sync_enabled: true,
        last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        last_synced_version: 201,
        status: 'synced',
    },
]

export default function Games() {
    const [searchQuery, setSearchQuery] = useState('')
    const { isOpen, onOpen, onClose } = useDisclosure()
    const { games, loadGames, addGame } = useGamesStore(
        useShallow(state => ({
            games: state.games,
            loadGames: state.loadGames,
            addGame: state.addGame
        }))
    )

    useEffect(() => {
        loadGames()
    }, [])

    // Use games from store instead of mockGames
    const displayGames = games.length > 0 ? games : mockGames

    const filteredGames = useMemo(() => displayGames.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [displayGames, searchQuery])

    const handleAddGame = (gameData: { name: string; path: string; autoSync: boolean }) => {
        addGame({
            name: gameData.name,
            local_path: gameData.path,
            platform: 'other', // Default or selector
            sync_enabled: gameData.autoSync
        })
        onClose()
    }

    return (
        <div className="min-h-screen">
            <PageHeader
                title="My Games"
                subtitle="All systems operational"
                rightContent={
                    <Button
                        color="primary"
                        className="flex flex-row items-center gap-2"
                        startContent={<Plus className="w-4 h-4" />}
                        onPress={onOpen}
                    >
                        Add Game
                    </Button>
                }
            />

            <div className="p-8">
                {/* Search and filters */}
                <div className="flex items-center gap-4 mb-6">
                    <Input
                        placeholder="Search your library..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        startContent={<Search className="w-4 h-4 text-gray-400" />}
                        classNames={{
                            base: "flex-1 max-w-md",
                            inputWrapper: "bg-bg-elevated border-white/5",
                        }}
                    />
                    <Button
                        isIconOnly
                        variant="bordered"
                        className="border-white/10 text-gray-400 hover:text-white"
                    >
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGames.map(game => (
                        <GameCard key={game.id} game={game} />
                    ))}
                    <AddGameCard onPress={onOpen} />
                </div>
            </div>

            {/* Add Game Modal */}
            <AddGameModal
                isOpen={isOpen}
                onClose={onClose}
                onAdd={handleAddGame}
            />
        </div>
    )
}

