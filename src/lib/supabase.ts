import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using development mode.');
}

export const supabase = createClient<Database, 'public'>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Auth helpers
export async function signInWithGoogle() {
  // Use localhost redirect since OAuth happens in Tauri webview
  // The webview will receive the redirect with tokens which useAuthSession will handle
  const isTauri = !!window.__TAURI__;
  const redirectUrl = isTauri
    ? 'sync-saves://auth/callback'
    : window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  // Should open the auth URL in a separate window to keep the main window listening to deep links
  if (data?.url) {
    if (isTauri) {
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        // Create (or focus) the auth window
        const authWindow = new WebviewWindow('auth-google', {
          url: data.url,
          title: 'Sign in with Google',
          width: 500,
          height: 600,
          center: true,
          focus: true,
          alwaysOnTop: true,
          skipTaskbar: true,
        });

        authWindow.once('tauri://error', (e) => {
          console.error('Auth window creation error:', e);
        });
      } catch (e) {
        console.error('Failed to open Tauri auth window:', e);
        // Fallback or alert user
      }
    } else {
      // In browser dev mode, just redirect
      window.location.href = data.url;
    }
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// Listen to auth changes
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
