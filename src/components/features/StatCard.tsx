import { Card, CardBody } from '@heroui/react'

interface StatCardProps {
    icon: React.ElementType
    title: string
    value: string | number
    subtitle?: string
    gradient: string
}

export default function StatCard({
    icon: Icon,
    title,
    value,
    subtitle,
    gradient
}: StatCardProps) {
    return (
        <Card className={`glass-card border-white/5 overflow-hidden relative group hover-glow transition-all duration-300`}>
            <CardBody className="p-6">
                <div className={`absolute inset-0 opacity-10 ${gradient}`} />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-gray-400 text-sm">{title}</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-primary-400 mt-1">{subtitle}</p>
                    )}
                </div>
            </CardBody>
        </Card>
    )
}
