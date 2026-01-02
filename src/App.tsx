import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Games from '@/pages/Games'
import Logs from '@/pages/Logs'
import Settings from '@/pages/Settings'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { getSystemInfo } from '@/lib/tauri'

function App() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
    const setBackendConnected = useSyncStore((state) => state.setBackendConnected)

    useEffect(() => {
        // Check backend connection
        const checkConnection = async () => {
            try {
                await getSystemInfo()
                setBackendConnected(true)
            } catch (e) {
                setBackendConnected(false)
            }
        }

        checkConnection()
        const interval = setInterval(checkConnection, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <Routes>
            <Route path="/login" element={
                !isAuthenticated ? <Login /> : <Navigate to="/" />
            } />

            <Route path="/" element={
                isAuthenticated ? <MainLayout /> : <Navigate to="/login" />
            }>
                <Route index path="dashboard" element={<Dashboard />} />
                <Route path="games" element={<Games />} />
                <Route path="logs" element={<Logs />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    )
}

export default App
