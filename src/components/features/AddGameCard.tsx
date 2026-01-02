import { Plus } from "lucide-react";
import { Card } from "@heroui/react";

export default function AddGameCard({ onPress }: { onPress: () => void }) {
  return (
    <Card
      variant="transparent"
      onClick={onPress}
      className="group relative overflow-hidden border-2 border-dashed border-white/10 hover:border-primary-500/50 rounded-2xl transition-all duration-300 min-h-[300px] flex items-center justify-center cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 via-primary-500/0 to-primary-500/0 group-hover:from-primary-500/5 group-hover:to-primary-500/10 transition-all duration-500" />

      <Card.Content className="relative flex flex-col items-center justify-center gap-4 text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated group-hover:bg-primary-500/20 border border-white/5 group-hover:border-primary-500/20 flex items-center justify-center transition-all duration-300 shadow-lg group-hover:shadow-primary-500/20 group-hover:scale-110">
          <Plus className="w-8 h-8 text-gray-400 group-hover:text-primary-400 transition-colors" />
        </div>
        <div>
          <h3 className="font-semibold text-white mb-1 group-hover:text-primary-300 transition-colors">
            Add New Game
          </h3>
          <p className="text-sm text-gray-500 group-hover:text-gray-400">
            Sync a local folder
          </p>
        </div>
      </Card.Content>
    </Card>
  );
}
