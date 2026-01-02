import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Cloud, Monitor, Calendar } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import { useGamesStore } from "@/stores/gamesStore";
import { useAuthStore } from "@/stores/authStore";
import StatCard from "@/components/features/StatCard";
import ActivityItem from "@/components/features/ActivityItem";
import { SaveButton } from "@/components/common/SaveButton";
import { Card } from "@heroui/react";

export default function Dashboard() {
  const {
    games,
    activities,
    totalGames,
    totalSaves,
    activeDevices,
    storageUsage,
    deviceName,
    refreshMetrics,
  } = useGamesStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const chartData = useMemo(() => {
    // Generate last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return {
        date: startOfDay(date),
        label: format(date, "MMM dd"),
        uploads: 0,
        downloads: 0,
      };
    }).reverse();

    activities.forEach((activity) => {
      const activityDate = new Date(activity.created_at);
      const day = last7Days.find((d) => isSameDay(d.date, activityDate));
      if (day) {
        if (activity.action === "upload") day.uploads++;
        else if (activity.action === "download") day.downloads++;
      }
    });

    return last7Days;
  }, [activities]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name || "Gamer"}`}
      />

      <div className="p-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Gamepad2}
            title="Total Games"
            value={totalGames}
            subtitle={`${games.length} tracked locally`}
            gradient="bg-gradient-to-br from-primary-600/20 to-primary-800/20"
          />
          <StatCard
            icon={Cloud}
            title="Cloud Saves"
            value={totalSaves}
            subtitle={`${formatSize(storageUsage)} Used`}
            gradient="bg-gradient-to-br from-secondary-500/20 to-secondary-600/20"
          />
          <StatCard
            icon={Monitor}
            title="Active Devices"
            value={activeDevices}
            subtitle={`Primary Device: ${deviceName}`}
            gradient="bg-gradient-to-br from-warning/20 to-orange-600/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Chart */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-white">
                Sync Activity
              </h2>
            </div>
            <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl h-87.5 p-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorUploads"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorDownloads"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#ffffff10"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid #ffffff10",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorUploads)"
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDownloads)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">
                Recent Activity
              </h2>
              <SaveButton onPress={() => navigate("/logs")}>
                View All
              </SaveButton>
            </div>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities
                  .slice(0, 5)
                  .map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
              ) : (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-gray-500">
                    No activity yet. Sync a game to see it here!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
