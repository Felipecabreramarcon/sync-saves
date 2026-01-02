import { NavLink, useLocation } from 'react-router-dom'
import { Avatar, Progress, Tooltip } from '@heroui/react'
import {
    LayoutDashboard,
    Gamepad2,
    History,
    Settings,
    Cloud,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/games', label: 'My Games', icon: Gamepad2 },
    { path: '/logs', label: 'Logs', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
    const location = useLocation()
    const { user } = useAuthStore()
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Mock storage data - will come from API
    const storageUsed = 13.5
    const storageTotal = 20

    return (
        <aside
            className={`
        fixed left-0 top-0 h-screen bg-bg-secondary border-r border-white/5
        flex flex-col transition-all duration-300 ease-in-out z-50
        ${isCollapsed ? 'w-[72px]' : 'w-[220px]'}
      `}
        >
            {/* Logo */}
            <div className="p-4 flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shrink-0">
                    <Cloud className="w-5 h-5 text-white" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <h1 className="font-semibold text-white text-sm whitespace-nowrap">Sync Saves</h1>
                        <p className="text-[10px] text-gray-500 whitespace-nowrap">Cloud Manager</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/dashboard' && location.pathname === '/')
                    const Icon = item.icon

                    const linkContent = (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
              `}
                        >
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                            {!isCollapsed && (
                                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                            )}
                        </NavLink>
                    )

                    if (isCollapsed) {
                        return (
                            <Tooltip key={item.path} content={item.label} placement="right">
                                {linkContent}
                            </Tooltip>
                        )
                    }

                    return linkContent
                })}
            </nav>

            {/* Storage indicator */}
            {!isCollapsed && (
                <div className="p-4 mx-3 mb-2 rounded-lg bg-bg-elevated/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-primary-400" />
                            <span className="text-xs text-gray-400">Storage</span>
                        </div>
                        <span className="text-xs text-primary-400 font-medium">UPGRADE</span>
                    </div>
                    <Progress
                        value={(storageUsed / storageTotal) * 100}
                        size="sm"
                        classNames={{
                            base: "h-1.5",
                            track: "bg-gray-700",
                            indicator: "bg-gradient-to-r from-primary-600 to-primary-400",
                        }}
                    />
                    <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
                        <span>{storageUsed} GB</span>
                        <span>{storageTotal} GB</span>
                    </div>
                </div>
            )}

            {/* User Profile */}
            <div className="p-3 border-t border-white/5">
                <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}>
                    <Avatar
                        src={user?.avatar_url}
                        name={user?.name || 'User'}
                        size="sm"
                        classNames={{
                            base: "ring-2 ring-primary-600/50",
                        }}
                    />
                </div>
            </div>

            {/* Status Block */}
            <div className="p-3">
                <div className={`
                    bg-primary-900/20 border border-primary-500/20 rounded-xl p-3
                    transition-all duration-300
                    ${isCollapsed ? 'items-center justify-center flex' : 'flex flex-col gap-1'}
                `}>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {!isCollapsed && (
                            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">Status</span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <p className="text-[11px] text-gray-300 font-medium leading-tight">
                            All systems operational.
                        </p>
                    )}
                </div>
            </div>

            {/* Collapse button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-bg-elevated border border-white/10 
          flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary-600 transition-all"
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
        </aside>
    )
}
