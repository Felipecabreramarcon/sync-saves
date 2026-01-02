import { Avatar, Chip } from '@heroui/react'
import { ArrowUp, ArrowDown, RefreshCw, AlertCircle } from 'lucide-react'

export interface HistoryEntry {
    id: string
    game_name: string
    game_cover?: string
    action: 'upload' | 'download' | 'skip' | 'conflict'
    version: number
    status: 'success' | 'error'
    device_name: string
    created_at: string
}

export default function HistoryListItem({ entry }: { entry: HistoryEntry }) {
    const actionConfig = {
        upload: { icon: ArrowUp, color: 'text-success', bgColor: 'bg-success/10' },
        download: { icon: ArrowDown, color: 'text-info', bgColor: 'bg-info/10' },
        skip: { icon: RefreshCw, color: 'text-gray-400', bgColor: 'bg-gray-600/10' },
        conflict: { icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10' },
    }

    const action = actionConfig[entry.action]
    const ActionIcon = action.icon

    return (
        <div className="flex items-center gap-4 py-3">
            {/* Time */}
            <span className="text-sm text-gray-500 w-14 shrink-0 font-mono">{entry.created_at}</span>

            {/* Game */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                    src={entry.game_cover}
                    name={entry.game_name}
                    size="sm"
                    radius="md"
                />
                <span className="text-white font-medium truncate">{entry.game_name}</span>
            </div>

            {/* Action */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${action.bgColor}`}>
                <ActionIcon className={`w-4 h-4 ${action.color}`} />
                <span className={`text-sm font-medium capitalize ${action.color}`}>
                    {entry.action}
                </span>
            </div>

            {/* Version */}
            <span className="text-sm text-gray-400 w-12 text-center font-mono">v{entry.version}</span>

            {/* Status */}
            <Chip
                size="sm"
                color={entry.status === 'success' ? 'success' : 'danger'}
                variant="flat"
                className="w-16 justify-center"
            >
                {entry.status === 'success' ? '✓' : '✗'}
            </Chip>

            {/* Device */}
            <span className="text-sm text-gray-400 w-24 text-right truncate">{entry.device_name}</span>
        </div>
    )
}
