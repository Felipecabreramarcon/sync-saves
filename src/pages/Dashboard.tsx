import { Gamepad2, Cloud, Monitor } from 'lucide-react'
import { Button } from '@heroui/react'
import PageHeader from '@/components/layout/PageHeader'
import { useGamesStore, type SyncActivity } from '@/stores/gamesStore'
import StatCard from '@/components/features/StatCard'
import ActivityItem from '@/components/features/ActivityItem'

// Mock data for development
const mockActivities: SyncActivity[] = [
    {
        id: '1',
        game_id: 'elden-ring',
        game_name: 'Elden Ring',
        game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
        action: 'upload',
        status: 'success',
        version: 42,
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 mins ago
    },
    {
        id: '2',
        game_id: 'cyberpunk',
        game_name: 'Cyberpunk 2077',
        game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4hku.webp',
        action: 'download',
        status: 'success',
        version: 102,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
        id: '3',
        game_id: 'stardew',
        game_name: 'Stardew Valley',
        game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/xrpmydnu9rpxvxfjkiu7.webp',
        action: 'upload',
        status: 'pending',
        version: 55,
        created_at: new Date().toISOString(), // now
    },
]

export default function Dashboard() {
    const { totalGames, totalSaves, activeDevices } = useGamesStore()

    return (
        <div className="min-h-screen">
            <PageHeader
                title="Dashboard"
                subtitle=""
            />

            <div className="p-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        icon={Gamepad2}
                        title="Total Games"
                        value={totalGames || 3}
                        subtitle="+1 this week"
                        gradient="bg-gradient-to-br from-primary-600/20 to-primary-800/20"
                    />
                    <StatCard
                        icon={Cloud}
                        title="Cloud Saves"
                        value={totalSaves || 47}
                        subtitle="1.2 GB Used"
                        gradient="bg-gradient-to-br from-secondary-500/20 to-secondary-600/20"
                    />
                    <StatCard
                        icon={Monitor}
                        title="Active Devices"
                        value={activeDevices || 2}
                        subtitle="Last active: Desktop PC"
                        gradient="bg-gradient-to-br from-warning/20 to-orange-600/20"
                    />
                </div>

                {/* Recent Activity */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                        <Button
                            variant="light"
                            size="sm"
                            className="text-primary-400 hover:text-primary-300 font-medium flex flex-row items-center gap-2"
                        >
                            View All
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {mockActivities.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
