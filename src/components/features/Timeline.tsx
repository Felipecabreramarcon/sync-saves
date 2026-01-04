import { useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
    GitCommit,
    GitPullRequest,
    GitMerge,
    ArrowUpCircle,
    ArrowDownCircle,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type SyncActivity } from "@/stores/gamesStore";
import { Avatar, AvatarFallback, AvatarImage } from "@heroui/react";

interface TimelineProps {
    activities: SyncActivity[];
}

export function Timeline({ activities }: TimelineProps) {
    // Group activities by date
    const groups = useMemo(() => {
        const grouped: Record<string, SyncActivity[]> = {};

        // Sort all activities by date desc first
        const sorted = [...activities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        sorted.forEach(activity => {
            const date = new Date(activity.created_at);
            let key = format(date, "yyyy-MM-dd");

            if (isToday(date)) key = "Today";
            else if (isYesterday(date)) key = "Yesterday";
            else key = format(date, "MMMM d, yyyy");

            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(activity);
        });

        return Object.entries(grouped).map(([date, items]) => ({
            date,
            items
        }));
    }, [activities]);

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <GitCommit className="w-12 h-12 mb-4 opacity-20" />
                <p>No activity history found.</p>
            </div>
        );
    }

    return (
        <div className="relative pl-8 space-y-8">
            {/* Vertical Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />

            {groups.map((group) => (
                <div key={group.date} className="relative">
                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="absolute -left-[29px] w-2.5 h-2.5 rounded-full bg-primary-500 ring-4 ring-bg-main" />
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{group.date}</h3>
                    </div>

                    <div className="space-y-6">
                        {group.items.map((item) => (
                            <TimelineItem key={item.id} activity={item} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TimelineItem({ activity }: { activity: SyncActivity }) {
    const statusColor =
        activity.status === 'success' ? 'text-success' :
            activity.status === 'error' ? 'text-danger' :
                'text-warning';

    const StatusIcon =
        activity.status === 'success' ? CheckCircle2 :
            activity.status === 'error' ? AlertCircle :
                Clock;

    const actionMap = {
        upload: { icon: ArrowUpCircle, label: "Pushed to cloud" },
        download: { icon: ArrowDownCircle, label: "Pulled from cloud" },
        conflict: { icon: GitMerge, label: "Merge conflict" },
        skip: { icon: GitPullRequest, label: "Skipped sync" },
    };

    const { label } = actionMap[activity.action] || actionMap.upload;

    return (
        <div className="relative group">
            {/* Node on line */}
            <div className={cn(
                "absolute -left-[26px] top-3 w-4 h-4 rounded-full border-2 border-bg-main flex items-center justify-center transition-all bg-bg-elevated/50 z-10",
                statusColor
            )}>
                <div className={cn("w-1.5 h-1.5 rounded-full",
                    activity.status === 'success' ? "bg-success" :
                        activity.status === 'error' ? "bg-danger" : "bg-warning"
                )} />
            </div>

            <div className="ml-4 p-4 rounded-xl bg-bg-elevated/20 border border-white/5 hover:bg-bg-elevated/30 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 rounded-lg ring-1 ring-white/10">
                            <AvatarImage src={activity.game_cover} />
                            <AvatarFallback className="rounded-lg">{activity.game_name[0]}</AvatarFallback>
                        </Avatar>

                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-sm">{activity.game_name}</h4>
                                <span className="text-gray-600 text-[10px]">•</span>
                                <span className={cn("text-xs font-medium flex items-center gap-1", statusColor)}>
                                    <StatusIcon className="w-3 h-3" />
                                    {label}
                                </span>
                            </div>

                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 font-mono">
                                <span>{format(new Date(activity.created_at), "HH:mm")}</span>
                                {activity.version && (
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px]">
                                        v{activity.version}
                                    </span>
                                )}
                                {activity.device_name && (
                                    <span>via {activity.device_name}</span>
                                )}
                            </div>

                            {activity.message && (
                                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                                    {activity.message}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
