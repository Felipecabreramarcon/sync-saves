import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ReactNode } from 'react'

interface MainLayoutProps {
    children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Sidebar />
            <main className="ml-[220px] min-h-screen transition-all duration-300">
                {children || <Outlet />}
            </main>
        </div>
    )
}
