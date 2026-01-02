import { Button, Card, CardBody, Divider } from '@heroui/react'
import { Cloud, Gamepad2, Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
    const { login, setLoading } = useAuthStore()

    const handleGoogleLogin = async () => {
        setLoading(true)
        // TODO: Implement real Google OAuth with Supabase
        // For now, mock login for development
        setTimeout(() => {
            login({
                id: '1',
                email: 'alex@example.com',
                name: 'Alex Gamer',
                avatar_url: undefined,
            })
        }, 1000)
    }

    const handleEmailLogin = () => {
        // TODO: Implement email login flow
        console.log('Email login clicked')
    }

    return (
        <div className="min-h-screen bg-bg-primary relative overflow-hidden flex items-center justify-center">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Gradient orbs */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary-800/10 rounded-full blur-3xl" />

                {/* Decorative icons */}
                <Gamepad2 className="absolute top-[15%] left-[10%] w-24 h-24 text-gray-800/30 rotate-[-15deg]" />
                <Gamepad2 className="absolute bottom-[20%] left-[15%] w-20 h-20 text-gray-800/30 rotate-[10deg]" />
                <Cloud className="absolute top-[20%] right-[15%] w-16 h-16 text-gray-800/30" />
                <Cloud className="absolute bottom-[15%] right-[10%] w-28 h-28 text-gray-800/20" />

                {/* Sync arrows decoration */}
                <div className="absolute bottom-[25%] right-[20%] w-32 h-32 text-gray-800/20">
                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                        <path d="M50 10 L70 30 L60 30 L60 60 L40 60 L40 30 L30 30 Z" />
                        <path d="M50 90 L30 70 L40 70 L40 40 L60 40 L60 70 L70 70 Z" opacity="0.5" />
                    </svg>
                </div>
            </div>

            {/* Login Card */}
            <Card className="glass-card w-full max-w-md mx-4 relative z-10">
                <CardBody className="p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/30 relative">
                            <Cloud className="w-8 h-8 text-white" />
                            {/* Status dot */}
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-bg-card" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Sync Saves</h1>
                        <p className="text-gray-400 text-sm mt-1">Your saves, everywhere.</p>
                    </div>

                    {/* Google Login Button */}
                    <Button
                        size="lg"
                        className="w-full bg-white hover:bg-white/90 text-gray-900 font-bold mb-4 h-14 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] group active:scale-[0.98] flex flex-row items-center justify-center gap-3"
                        startContent={
                            <div className="bg-gray-100 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            </div>
                        }
                        onPress={handleGoogleLogin}
                    >
                        Sign in with Google
                    </Button>

                    <div className="flex items-center gap-4 my-6">
                        <Divider className="flex-1 bg-white/5" />
                        <span className="text-gray-600 text-[10px] font-bold tracking-[0.2em]">OR EXPLORE</span>
                        <Divider className="flex-1 bg-white/5" />
                    </div>

                    {/* Email Login Button */}
                    <Button
                        size="lg"
                        className="w-full bg-gradient-to-br from-primary-600 to-primary-800 text-white font-bold h-14 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(147,51,234,0.4)] active:scale-[0.98] border border-primary-400/20 flex flex-row items-center justify-center gap-3"
                        startContent={<Mail className="w-5 h-5 text-primary-200" />}
                        onPress={handleEmailLogin}
                    >
                        Continue with Email
                    </Button>

                    {/* Footer links */}
                    <div className="flex items-center justify-center gap-6 mt-8">
                        <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                            Terms of Service
                        </a>
                    </div>
                </CardBody>
            </Card>

            {/* Version footer */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600">
                v2.4.0 • Sync Saves Cloud
            </div>
        </div>
    )
}
