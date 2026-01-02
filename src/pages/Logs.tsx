import { useState, useMemo } from 'react'
import { Select, Label, ListBox } from '@heroui/react'
import PageHeader from '@/components/layout/PageHeader'
import HistoryListItem from '@/components/features/HistoryListItem'
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
                        placeholder="Filter by game"
                        selectedKey={selectedGame}
                        onSelectionChange={(key) => setSelectedGame(key as string)}
                        className="w-48"
                    >
                        <Label className="sr-only">Filter by game</Label>
                        <Select.Trigger className="rounded-lg border border-white/10 bg-bg-elevated/50 px-3 py-2 text-sm hover:border-white/20 transition-colors">
                            <Select.Value />
                            <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {filterOptions.map((opt) => (
                                    <ListBox.Item key={opt.key} id={opt.key} textValue={opt.label}>
                                        {opt.label}
                                    </ListBox.Item>
                                ))}
                            </ListBox>
                        </Select.Popover>
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
                                    <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
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
                                            <div className="absolute left-7.75 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/10 group-hover:bg-primary-500 transition-colors hidden md:block z-20" />

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
