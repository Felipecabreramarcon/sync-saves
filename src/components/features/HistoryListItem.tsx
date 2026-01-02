import { Avatar } from '@heroui/react'
import { ArrowUp, ArrowDown, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HistoryEntry {
    id: string
    game_name: string
    game_cover?: string
    action: 'upload' | 'download' | 'skip' | 'conflict'
    version?: number
    status: 'success' | 'error' | 'pending'
    device_name?: string
    created_at: string
}

export default function HistoryListItem({ entry }: { entry: HistoryEntry }) {
    const actionConfig = {
        upload: { icon: ArrowUp, color: 'text-success', bgColor: 'bg-success/10', border: 'border-success/20' },
        download: { icon: ArrowDown, color: 'text-info', bgColor: 'bg-info/10', border: 'border-info/20' },
        skip: { icon: RefreshCw, color: 'text-gray-400', bgColor: 'bg-gray-600/10', border: 'border-gray-600/20' },
        conflict: { icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10', border: 'border-warning/20' },
    }

    const action = actionConfig[entry.action]
    const ActionIcon = action.icon

    return (
        <div className="flex items-center gap-4 py-3 group hover:bg-white/5 -mx-4 px-4 transition-colors rounded-lg">
            {/* Time */}
            <span className="text-xs font-bold text-gray-500 w-12 shrink-0 font-mono tracking-wide">{entry.created_at}</span>

            {/* Game */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                    size="sm"
                    className="border border-white/10 group-hover:border-white/30 transition-colors rounded-md"
                >
                    <Avatar.Image src={entry.game_cover} alt={entry.game_name} />
                    <Avatar.Fallback>{entry.game_name.charAt(0)}</Avatar.Fallback>
                </Avatar>
                <span className="text-white font-semibold truncate text-sm group-hover:text-primary-300 transition-colors">{entry.game_name}</span>
            </div>

            {/* Action */}
            <div className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wider",
                action.bgColor,
                action.border,
                action.color
            )}>
                <ActionIcon className="w-3 h-3" />
                <span>{entry.action}</span>
            </div>

            {/* Version */}
            <div className="flex flex-col items-center w-16">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">VERSION</span>
                <span className="text-sm text-gray-400 font-mono font-medium">v{entry.version || '-'}</span>
            </div>

            {/* Status */}
            <div className="w-10 flex justify-center">
                <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center border",
                    entry.status === 'success'
                        ? "bg-success-soft-hover border-success/30 text-success"
                        : entry.status === 'pending'
                            ? "bg-warning-soft-hover border-warning/30 text-warning animate-pulse"
                            : "bg-danger-soft-hover border-danger/30 text-danger"
                )}>
                    {entry.status === 'success'
                        ? <div className="w-2 h-2 bg-current rounded-full" />
                        : entry.status === 'pending'
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <span className="text-xs font-bold">!</span>
                    }
                </div>
            </div>

            {/* Device */}
            <span className="text-xs font-bold text-gray-500 w-24 text-right truncate">{entry.device_name}</span>
        </div>
    )
}
