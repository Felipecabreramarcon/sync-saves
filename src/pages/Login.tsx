import { Button, Separator, Card } from "@heroui/react";
import { Cloud, Mail } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";

export default function Login() {
  const { setLoading } = useAuthStore();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { signInWithGoogle } = await import("@/lib/supabase");
    const { error } = await signInWithGoogle();
    if (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    console.log("Email login clicked");
  };

  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden flex items-center justify-center font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-150 h-150 bg-primary-600/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-5%] w-125 h-125 bg-secondary-600/10 rounded-full blur-[100px]"
        />
      </div>

      {/* Login Card */}
      <Card className="bg-bg-elevated/40 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md mx-4 relative z-10 shadow-2xl shadow-primary-900/20">
        <Card.Content className="p-6 sm:p-8 pt-8">
          {/* Logo */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center mb-10"
          >
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-6 shadow-xl shadow-primary-500/30 relative group">
              <Cloud className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-[3px] border-bg-card"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Sync Saves
            </h1>
            <p className="text-content-secondary text-sm font-medium">
              Your game saves, everywhere.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Error Banner */}
            {/* We can add a state for error message here if we want to show it in UI */}

            {/* Google Login Button */}
            <Button
              size="lg"
              className="w-full flex font-semibold h-14"
              onPress={handleGoogleLogin}
            >
              <div className="p-1">
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
              </div>{" "}
              Sign in with Google
            </Button>

            <div className="flex items-center gap-4 py-2">
              <Separator className="flex-1 bg-white/10" />
              <span className="text-content-tertiary text-[10px] font-bold tracking-widest uppercase">
                Or
              </span>
              <Separator className="flex-1 bg-white/10" />
            </div>

            {/* Email Login Button */}
            <Button
              size="lg"
              variant="ghost"
              className="w-full font-semibold h-14"
              onPress={handleEmailLogin}
            >
              <Mail className="w-5 h-5" /> Sign in with Email
            </Button>

            {/* Dev Bypass */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              onPress={() => {
                useAuthStore.getState().login({
                  id: "dev-user",
                  email: "dev@local",
                  name: "Dev User",
                });
              }}
            >
              (Dev) Skip Auth
            </Button>
          </motion.div>

          {/* Footer links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-6 mt-8"
          >
            <a
              href="#"
              className="text-xs text-content-secondary hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-xs text-content-secondary hover:text-white transition-colors"
            >
              Terms of Service
            </a>
          </motion.div>
        </Card.Content>
      </Card>

      {/* Version footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-content-tertiary font-mono tracking-wide opacity-50">
        v2.4.0 • SYNC SAVES
      </div>
    </div>
  );
}
