import { Avatar, Chip } from '@heroui/react'
import { ArrowUp, ArrowDown, RefreshCw, ChevronRight } from 'lucide-react'
import { type SyncActivity } from '@/stores/gamesStore'

export default function ActivityItem({ activity }: { activity: SyncActivity }) {
    const getTimeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
        if (seconds < 60) return 'Now'
        if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour ago`
        return `${Math.floor(seconds / 86400)} days ago`
    }

    const actionConfig = {
        upload: { icon: ArrowUp, text: 'Uploaded to Cloud', color: 'text-success' },
        download: { icon: ArrowDown, text: 'Downloaded from Cloud', color: 'text-info' },
        skip: { icon: RefreshCw, text: 'Skipped', color: 'text-gray-400' },
        conflict: { icon: RefreshCw, text: 'Conflict', color: 'text-warning' },
    }

    const statusConfig = {
        success: { label: 'SUCCESS', color: 'success' as const },
        error: { label: 'ERROR', color: 'danger' as const },
        pending: { label: 'IN PROGRESS', color: 'warning' as const },
    }

    const action = actionConfig[activity.action]
    const status = statusConfig[activity.status]
    const ActionIcon = action.icon

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-bg-elevated/50 hover:bg-bg-elevated transition-colors group cursor-pointer">
            {/* Game cover */}
            <Avatar
                src={activity.game_cover}
                name={activity.game_name}
                radius="lg"
                className="w-14 h-14 shrink-0"
                classNames={{
                    base: "ring-2 ring-white/10",
                }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{activity.game_name}</h4>
                    <Chip size="sm" color={status.color} variant="flat" className="h-5 text-[10px] font-semibold">
                        {status.label}
                    </Chip>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <ActionIcon className={`w-3 h-3 ${action.color}`} />
                    <span className="text-sm text-gray-400">{action.text}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-400">{getTimeAgo(activity.created_at)}</span>
                </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>
    )
}
