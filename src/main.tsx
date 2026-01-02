import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <HeroUIProvider>
                <main className="dark min-h-screen bg-bg-primary text-foreground">
                    <App />
                </main>
            </HeroUIProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
