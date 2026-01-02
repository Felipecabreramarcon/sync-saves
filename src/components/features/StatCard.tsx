import { Card } from "@heroui/react";

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  gradient: string;
}

export default function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  gradient,
}: StatCardProps) {
  return (
    <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
      <Card.Content className="p-6 relative">
        <div
          className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${gradient}`}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient} shadow-lg shadow-black/10`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-400 text-sm font-medium">{title}</span>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-primary-400 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
