import { Button, Separator, Card } from '@heroui/react';
import { useState } from 'react';
import { Cloud, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';

import TitleBar from '@/components/layout/TitleBar';

export default function Login() {
  const { setLoading } = useAuthStore();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { signInWithGoogle } = await import('@/lib/supabase');
    const { error } = await signInWithGoogle();
    if (error) {
      console.error(error);
      setLoading(false);
    }
  };

  /* State for email login */
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleEmailLogin = async () => {
    if (!email) return;
    setLoading(true);
    const { supabase } = await import('@/lib/supabase');

    // Use Magic Link (OTP)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);
    if (error) {
      console.error(error);
      // Ideally show toast error here
    } else {
      setEmailSent(true);
    }
  };

  if (isEmailMode) {
    return (
      <div className='min-h-screen bg-bg-primary relative overflow-hidden flex items-center justify-center font-sans'>
        <TitleBar />
        <Card className='bg-bg-elevated/40 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md mx-4 relative z-10 shadow-2xl shadow-primary-900/20'>
          <Card.Content className='p-6 sm:p-8 pt-8'>
            <div className='text-center mb-6'>
              <h2 className='text-2xl font-bold text-white mb-2'>
                Sign in with Email
              </h2>
              <p className='text-content-secondary text-sm'>
                {emailSent
                  ? `Check your inbox at ${email}`
                  : 'Enter your email to receive a magic link'}
              </p>
            </div>

            {!emailSent ? (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <input
                    type='email'
                    placeholder='name@example.com'
                    className='w-full px-4 py-3 rounded-xl bg-bg-secondary/50 border border-white/10 text-white placeholder:text-white/20 focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-all'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    autoFocus
                  />
                </div>
                <div className='flex gap-2'>
                  <Button
                    size='lg'
                    variant='ghost'
                    className='flex-1 font-semibold'
                    onPress={() => setIsEmailMode(false)}
                  >
                    Back
                  </Button>
                  <Button
                    size='lg'
                    className='flex-1 font-semibold'
                    onPress={handleEmailLogin}
                    isDisabled={useAuthStore.getState().isLoading}
                  >
                    Send Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className='text-center space-y-4'>
                <div className='p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-200 text-sm'>
                  Magic link sent! Click the link in your email to sign in.
                </div>
                <Button
                  size='lg'
                  variant='ghost'
                  className='w-full font-semibold'
                  onPress={() => {
                    setEmailSent(false);
                    setIsEmailMode(false);
                  }}
                >
                  Back to Login
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    );
  }

  // ... (Login layout below)
  return (
    <div className='min-h-screen bg-bg-primary relative overflow-hidden flex items-center justify-center font-sans'>
      <TitleBar />
      <Card className='bg-bg-elevated/40 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md mx-4 relative z-10 shadow-2xl shadow-primary-900/20'>
        <Card.Content className='p-6 sm:p-8 pt-8'>
          <div className='text-center mb-6'>
            <h2 className='text-2xl font-bold text-white mb-2'>Welcome Back</h2>
            <p className='text-content-secondary text-sm'>
              Sign in to continue to your dashboard.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='space-y-4'
          >
            <Button
              size='lg'
              className='w-full font-semibold'
              onPress={handleGoogleLogin}
              isDisabled={useAuthStore.getState().isLoading}
            >
              <Cloud className='mr-2 h-5 w-5' /> Sign in with Google
            </Button>

            <div className='flex items-center gap-4 my-4'>
              <Separator className='flex-1' />
              <span className='text-small text-default-500'>OR</span>
              <Separator className='flex-1' />
            </div>

            <Button
              size='lg'
              variant='ghost'
              className='w-full font-semibold'
              onPress={() => setIsEmailMode(true)}
            >
              <Mail className='mr-2 h-5 w-5' /> Sign in with Email
            </Button>

            {/* Dev Bypass */}
            <Button
              size='sm'
              variant='ghost'
              className='w-full text-xs'
              onPress={() => {
                useAuthStore.getState().login({
                  id: 'dev-user',
                  email: 'dev@local',
                  name: 'Dev User',
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
            className='flex items-center justify-center gap-6 mt-8'
          >
            <a
              href='#'
              className='text-xs text-content-secondary hover:text-white transition-colors'
            >
              Privacy Policy
            </a>
            <a
              href='#'
              className='text-xs text-content-secondary hover:text-white transition-colors'
            >
              Terms of Service
            </a>
          </motion.div>
        </Card.Content>
      </Card>

      {/* Version footer */}
      <div className='absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-content-tertiary font-mono tracking-wide opacity-50'>
        v2.4.0 • SYNC SAVES
      </div>
    </div>
  );
}
