
import { useState } from 'react'
import { useDisclosure } from '@heroui/react'
import {
    Plus,
    Search,
    Filter,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useGamesStore } from '@/stores/gamesStore'
import GameCard from '@/components/features/GameCard'
import { useEffect } from 'react'
import AddGameCard from '@/components/features/AddGameCard'
import AddGameModal from '@/components/features/AddGameModal'
import { SaveButton } from '@/components/common/SaveButton'
import { SaveInput } from '@/components/common/SaveInput'

// Game page component

export default function Games() {
    const [searchQuery, setSearchQuery] = useState('')
    const { isOpen, onOpen, onClose } = useDisclosure()
    const { games, loadGames, addGame, isLoading } = useGamesStore()

    useEffect(() => {
        loadGames()
    }, [])

    const filteredGames = games.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleAddGame = async (gameData: { name: string; path: string; autoSync: boolean }) => {
        try {
            await addGame({
                name: gameData.name,
                local_path: gameData.path,
                platform: 'other',
                sync_enabled: gameData.autoSync
            })
            onClose()
        } catch (error) {
            console.error('Failed to add game:', error)
            // You could add a toast here
        }
    }

    return (
        <div className="min-h-screen">
            <PageHeader
                title="My Games"
                subtitle="All systems operational"
                rightContent={
                    <SaveButton
                        color="primary"
                        className="shadow-xl shadow-primary-500/20"
                        startContent={<Plus className="w-4 h-4" />}
                        onPress={onOpen}
                    >
                        Add Game
                    </SaveButton>
                }
            />

            <div className="p-8">
                {/* Search and filters */}
                <div className="flex items-center gap-4 mb-6">
                    <SaveInput
                        placeholder="Search your library..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        startContent={<Search className="w-4 h-4 text-gray-400" />}
                        classNames={{
                            base: "flex-1 max-w-md",
                            inputWrapper: "bg-bg-elevated border-white/5 h-12",
                        }}
                    />
                    <SaveButton
                        isIconOnly
                        variant="bordered"
                        className="border-white/10 text-gray-400 hover:text-white h-12 w-12"
                    >
                        <Filter className="w-4 h-4" />
                    </SaveButton>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading && games.length === 0 ? (
                        <div className="col-span-full h-48 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-gray-500 font-medium">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                <span>Loading your library...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {filteredGames.map(game => (
                                <GameCard key={game.id} game={game} />
                            ))}
                            <AddGameCard onPress={onOpen} />
                        </>
                    )}
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

