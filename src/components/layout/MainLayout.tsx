import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import { ReactNode } from 'react'
import { useUIStore } from '@/stores/uiStore'

interface MainLayoutProps {
    children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { isSidebarCollapsed } = useUIStore()

    return (
        <div className="min-h-screen bg-bg-primary font-sans text-content-primary">
            <TitleBar />
            <Sidebar />
            <main
                className={`
                    min-h-screen pt-8 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                    ${isSidebarCollapsed ? 'ml-18' : 'ml-60'}
                `}
            >
                {children || <Outlet />}
            </main>
        </div>
    )
}
