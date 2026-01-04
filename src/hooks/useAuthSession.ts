import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useGamesStore } from '@/stores/gamesStore';
import { getSession, onAuthStateChange, supabase } from '@/lib/supabase';
import { toast } from '@/stores/toastStore';

/**
 * Hook that manages authentication session lifecycle:
 * - Initial session check on mount
 * - Auth state change listener
 * - Deep link handling for OAuth callbacks
 */
export function useAuthSession() {
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // Initial session check
    const checkInitialSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name || session.user.email,
            avatar_url: session.user.user_metadata.avatar_url,
          });
          
          // Load cloud activities after successful auth
          await useGamesStore.getState().loadActivities();
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // Auth state change listener
    const { data: { subscription } } = onAuthStateChange((event, session: any) => {
      console.log('Auth Event:', event);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email,
          avatar_url: session.user.user_metadata.avatar_url,
        });
        useGamesStore.getState().loadActivities();
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, logout, setLoading]);
}

/**
 * Hook that handles deep link authentication callbacks.
 * Parses OAuth tokens from URL fragments or PKCE codes from query params.
 */
export function useDeepLinkAuth() {
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDeepLinkListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      
      unlisten = await listen('deep-link://new-url', async (event) => {
        const url = event.payload as string;
        console.log('Deep link received:', url);

        try {
          // Try hash fragment first (implicit flow)
          const fragment = url.split('#')[1];
          if (fragment) {
            const params = new URLSearchParams(fragment);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
              setLoading(true);
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (error) throw error;
              console.log('Session set from deep link!');
              return;
            }
          }

          // Try query params (PKCE code flow)
          const query = url.split('?')[1];
          if (query) {
            const params = new URLSearchParams(query);
            const code = params.get('code');
            if (code) {
              setLoading(true);
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
            }
          }
        } catch (e: any) {
          console.error('Failed to handle deep link auth:', e);
          toast.error('Login Failed', e.message || 'Could not authenticate from link.');
        } finally {
          setLoading(false);
        }
      });
    };

    setupDeepLinkListener();

    return () => {
      unlisten?.();
    };
  }, [setLoading]);
}
