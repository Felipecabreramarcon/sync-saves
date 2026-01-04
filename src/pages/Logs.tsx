import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { useGamesStore } from "@/stores/gamesStore";
import { useAuthStore } from "@/stores/authStore";
import { Timeline } from "@/components/features/Timeline"; // New component
import { RefreshCw } from "lucide-react";
import { Button } from "@heroui/react";

export default function Logs() {
  const { activities, loadActivities } = useGamesStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadActivities()
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]); // Removed loadActivities from dep arr to avoid loop if store changes identity

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadActivities();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Activity Log"
        subtitle="Timeline of sync events and restore points"
        showSyncButton={false}
        rightContent={
          <Button variant="ghost" size="sm" onPress={handleRefresh} isDisabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {!user ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text-gray-500">Sign in to view your activity history.</p>
          </div>
        ) : (
          <Timeline activities={activities} />
        )}
      </div>
    </div>
  );
}
