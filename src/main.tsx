import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
                <main className="dark min-h-screen bg-bg-primary text-foreground">
                    <App />
                </main>
        </BrowserRouter>
    </React.StrictMode>,
)
