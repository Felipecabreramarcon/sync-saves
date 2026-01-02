import { useState, useMemo } from 'react'
import { Select, SelectItem } from '@heroui/react'
import PageHeader from '@/components/layout/PageHeader'
import HistoryListItem from '@/components/features/HistoryListItem'
import { Card, CardContent } from '@/components/common/Card'
import { useGamesStore } from '@/stores/gamesStore'
import { format, isToday, isYesterday } from 'date-fns'

export default function Logs() {
    const { activities, games } = useGamesStore()
    const [selectedGame, setSelectedGame] = useState<string>('all')

    const filterOptions = useMemo(() => [
        { key: 'all', label: 'All Games' },
        ...games.map(g => ({ key: g.id, label: g.name }))
    ], [games])

    const groupedActivities = useMemo(() => {
        const filtered = selectedGame === 'all'
            ? activities
            : activities.filter(a => a.game_id === selectedGame)

        const groups: Record<string, typeof activities> = {}

        filtered.forEach(activity => {
            const date = new Date(activity.created_at)
            let dateStr = format(date, 'MMM dd, yyyy')
            if (isToday(date)) dateStr = 'Today'
            else if (isYesterday(date)) dateStr = 'Yesterday'

            if (!groups[dateStr]) groups[dateStr] = []
            groups[dateStr].push(activity)
        })

        return Object.entries(groups).map(([date, entries]) => ({ date, entries }))
    }, [activities, selectedGame])

    return (
        <div className="min-h-screen">
            <PageHeader
                title="Activity Logs"
                showSyncButton={false}
                rightContent={
                    <Select
                        label=""
                        placeholder="Filter by game"
                        selectedKeys={[selectedGame]}
                        onSelectionChange={(keys) => setSelectedGame(Array.from(keys)[0] as string)}
                        classNames={{
                            base: "w-48",
                            trigger: "bg-bg-elevated border-white/10 h-10 min-h-unit-10 rounded-lg hover:border-primary-500/30 transition-colors",
                            value: "text-gray-200",
                            popoverContent: "bg-bg-elevated border-white/10"
                        }}
                    >
                        {filterOptions.map((opt) => (
                            <SelectItem key={opt.key} className="text-gray-300 data-[hover=true]:bg-white/5 data-[hover=true]:text-white">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </Select>
                }
            />

            <div className="p-8">
                {/* History Timeline */}
                <div className="space-y-8 relative">
                    {/* Vertical Timeline Guide */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-white/5 hidden md:block" />

                    {groupedActivities.length > 0 ? (
                        groupedActivities.map((group) => (
                            <div key={group.date} className="space-y-4 relative">
                                <div className="flex items-center gap-4 bg-bg-primary/50 backdrop-blur-md sticky top-0 py-2 z-10 px-4 -mx-4 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                                        {/* Assuming Clock is an imported icon component, e.g., from 'lucide-react' */}
                                        {/* <Clock className="w-4 h-4 text-primary-400" /> */}
                                    </div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">{group.date}</h2>
                                    <div className="h-px bg-white/5 flex-1" />
                                </div>

                                <div className="space-y-2 relative">
                                    {group.entries.map((entry) => (
                                        <div key={entry.id} className="group relative">
                                            {/* Dot on timeline */}
                                            <div className="absolute left-[31px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/10 group-hover:bg-primary-500 transition-colors hidden md:block z-20" />

                                            <div className="pl-0 md:pl-16">
                                                <HistoryListItem entry={{
                                                    ...entry,
                                                    status: entry.status as any,
                                                    created_at: format(new Date(entry.created_at), 'HH:mm')
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <p className="text-gray-500">No activity logs found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
