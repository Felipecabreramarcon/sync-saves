import { useState } from "react";
import { useOverlayState, Button } from "@heroui/react";
import { Plus, Search, Filter } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useGamesStore } from "@/stores/gamesStore";
import GameCard from "@/components/features/GameCard";
import { useEffect } from "react";
import AddGameCard from "@/components/features/AddGameCard";
import AddGameModal from "@/components/features/AddGameModal";
import { SaveInput } from "@/components/common/SaveInput";

// Game page component

export default function Games() {
  const [searchQuery, setSearchQuery] = useState("");
  const modalState = useOverlayState();
  const { games, loadGames, addGame, isLoading } = useGamesStore();

  useEffect(() => {
    loadGames();
  }, []);

  const filteredGames = games.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddGame = async (gameData: {
    name: string;
    path: string;
    autoSync: boolean;
  }) => {
    try {
      await addGame({
        name: gameData.name,
        local_path: gameData.path,
        platform: "other",
        sync_enabled: gameData.autoSync,
      });
      modalState.close();
    } catch (error) {
      console.error("Failed to add game:", error);
      // You could add a toast here
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="My Games"
        subtitle="All systems operational"
        rightContent={
          <Button
            variant="primary"
            className="shadow-xl shadow-primary-500/20"
            onPress={modalState.open}
          >
            <Plus className="w-4 h-4" />
            Add Game
          </Button>
        }
      />

      <div className="p-8">
        {/* Search and filters */}
        <div className="flex items-center gap-4 mb-6">
          <SaveInput
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-md"
          />
          <Button
            isIconOnly
            variant="secondary"
            className="border-white/10 text-gray-400 hover:text-white h-12 w-12"
          >
            <Filter className="w-4 h-4" />
          </Button>
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
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
              <AddGameCard onPress={modalState.open} />
            </>
          )}
        </div>
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={modalState.isOpen}
        onClose={modalState.close}
        onAdd={handleAddGame}
      />
    </div>
  );
}
