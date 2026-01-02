import { useState } from 'react'
import { Card, CardBody, Select, SelectItem } from '@heroui/react'
import PageHeader from '@/components/layout/PageHeader'
import HistoryListItem, { type HistoryEntry } from '@/components/features/HistoryListItem'

// Mock data grouped by date
const mockHistory: { date: string; entries: HistoryEntry[] }[] = [
    {
        date: 'Today',
        entries: [
            {
                id: '1',
                game_name: 'Elden Ring',
                game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
                action: 'upload',
                version: 15,
                status: 'success',
                device_name: 'PC Casa',
                created_at: '14:30',
            },
            {
                id: '2',
                game_name: 'Elden Ring',
                game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
                action: 'download',
                version: 14,
                status: 'success',
                device_name: 'PC Casa',
                created_at: '14:25',
            },
            {
                id: '3',
                game_name: "Baldur's Gate 3",
                game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.webp',
                action: 'upload',
                version: 8,
                status: 'success',
                device_name: 'Notebook',
                created_at: '10:00',
            },
        ],
    },
    {
        date: 'Yesterday',
        entries: [
            {
                id: '4',
                game_name: 'Elden Ring',
                game_cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
                action: 'upload',
                version: 14,
                status: 'success',
                device_name: 'Notebook',
                created_at: '22:15',
            },
            {
                id: '5',
                game_name: 'Hollow Knight',
                action: 'upload',
                version: 3,
                status: 'success',
                device_name: 'PC Casa',
                created_at: '18:30',
            },
        ],
    },
]

export default function Logs() {
    const [selectedGame, setSelectedGame] = useState<string>('all')

    const games = [
        { key: 'all', label: 'All Games' },
        { key: 'elden-ring', label: 'Elden Ring' },
        { key: 'baldurs-gate-3', label: "Baldur's Gate 3" },
        { key: 'hollow-knight', label: 'Hollow Knight' },
    ]

    return (
        <div className="min-h-screen">
            <PageHeader
                title="Activity Logs"
                showSyncButton={false}
                rightContent={
                    <Select
                        aria-label="Filter by game"
                        placeholder="Filter by game"
                        selectedKeys={[selectedGame]}
                        onSelectionChange={(keys) => setSelectedGame(Array.from(keys)[0] as string)}
                        variant="bordered"
                        className="w-48"
                    >
                        {games.map((game) => (
                            <SelectItem key={game.key}>{game.label}</SelectItem>
                        ))}
                    </Select>
                }
            />

            <div className="p-8">
                {/* History Timeline */}
                <div className="space-y-8">
                    {mockHistory.map((group) => (
                        <div key={group.date}>
                            {/* Date header */}
                            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">
                                {group.date}
                            </h3>

                            {/* Entries */}
                            <Card className="glass-card">
                                <CardBody className="divide-y divide-white/5 p-0">
                                    {group.entries.map((entry) => (
                                        <div key={entry.id} className="px-4">
                                            <HistoryListItem entry={entry} />
                                        </div>
                                    ))}
                                </CardBody>
                            </Card>
                        </div>
                    ))}
                </div>

                {/* Load more */}
                <div className="text-center mt-8">
                    <button className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
                        Load more...
                    </button>
                </div>
            </div>
        </div>
    )
}
