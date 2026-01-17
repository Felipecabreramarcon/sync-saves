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
        // Fallback: Check for auth tokens in URL (for when deep links don't work in dev mode)
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Check for OAuth tokens in hash fragment (implicit flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('Found auth tokens in URL hash, setting session...');
          const { supabase } = await import('@/lib/supabase');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('Failed to set session from URL:', error);
          } else {
            // Clear the hash from URL to avoid reprocessing
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        }

        // Check for PKCE code in query params
        const code = queryParams.get('code');
        if (code) {
          console.log(
            'Found auth code in URL query, exchanging for session...'
          );
          const { supabase } = await import('@/lib/supabase');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Failed to exchange code for session:', error);
          } else {
            // Clear the query from URL to avoid reprocessing
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        }

        // Now check for existing session
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
    const {
      data: { subscription },
    } = onAuthStateChange((event, session: any) => {
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
        setUser(null);
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
        let url = event.payload as string;
        console.log('Deep link received (raw):', url);

        // Sanitize URL (remove quotes and whitespace often added by Windows shell)
        url = url.replace(/['"]/g, '').trim();
        console.log('Deep link sanitized:', url);

        try {
          toast.success(
            'Authenticating...',
            'Received login signal from browser.'
          );

          // Normalize: Supabase sometimes sends as hash, sometimes as query
          // Let's try to extract from both locations
          let params: URLSearchParams | null = null;

          if (url.includes('#')) {
            const fragment = url.split('#')[1];
            params = new URLSearchParams(fragment);
          } else if (url.includes('?')) {
            const query = url.split('?')[1];
            params = new URLSearchParams(query);
          }

          if (params) {
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            const code = params.get('code');

            if (access_token && refresh_token) {
              setLoading(true);
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (error) throw error;
              toast.success('Login Successful', 'Welcome back!');
              return; // Success
            }

            if (code) {
              setLoading(true);
              const { error } =
                await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              toast.success('Login Successful', 'Welcome back!');
              return; // Success
            }
          }

          throw new Error('No valid tokens found in link');
        } catch (e: any) {
          console.error('Failed to handle deep link auth:', e);
          toast.error(
            'Login Failed',
            e.message || 'Could not parse login link.'
          );
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
