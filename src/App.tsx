import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Games from "@/pages/Games";
import Logs from "@/pages/Logs";
import Settings from "@/pages/Settings";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";
import { getSystemInfo, getDeviceName } from "@/lib/tauri";
import { useGamesStore } from "@/stores/gamesStore";
import ToastContainer from "@/components/common/ToastContainer";
import { toast } from "@/stores/toastStore";

import { getSession, onAuthStateChange } from "@/lib/supabase";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setBackendConnected = useSyncStore(
    (state) => state.setBackendConnected
  );
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const setLoading = useAuthStore((state) => state.setLoading);

  const performSync = useSyncStore((state) => state.performSync);

  useEffect(() => {
    // 1. Initial Check & Listener Setup
    const initialize = async () => {
      const { listen } = await import("@tauri-apps/api/event");

      try {
        const session = await getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name || session.user.email,
            avatar_url: session.user.user_metadata.avatar_url,
          });

          // Load cloud logs into local activity timeline
          await useGamesStore.getState().loadActivities();
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }

      // Listen for Tauri events (Automatic Sync)
      const unlistenSync = await listen("sync-required", async (event) => {
        const gameId = event.payload as string;
        console.log(`Automatic sync triggered for game: ${gameId}`);

        try {
          await performSync(gameId);

          // Check if desktop notifications are enabled before sending
          const { getAppSettings } = await import("@/lib/tauri");
          const settings = await getAppSettings();

          if (settings.desktop_notifications) {
            const { isPermissionGranted, requestPermission, sendNotification } =
              await import("@tauri-apps/plugin-notification");
            let permission = await isPermissionGranted();
            if (!permission) {
              permission = (await requestPermission()) === "granted";
            }

            if (permission) {
              sendNotification({
                title: "Sync Saves: Auto-Backup",
                body: `Your save for this game has been successfully backed up to the cloud!`,
                icon: "cloud",
              });
            }
          }

          toast.success(
            "Auto-Sync Complete",
            "Your save has been backed up to the cloud"
          );
        } catch (err: any) {
          console.error("Auto sync failed:", err);
          toast.error(
            "Auto-Sync Failed",
            err.message || "Failed to backup save files"
          );
        }
      });

      return () => {
        unlistenSync();
      };
    };

    initialize();

    const {
      data: { subscription },
    } = onAuthStateChange((event, session: any) => {
      console.log("Auth Event:", event);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email,
          avatar_url: session.user.user_metadata.avatar_url,
        });

        // Refresh cloud activity timeline on sign-in
        useGamesStore.getState().loadActivities();
      } else if (event === "SIGNED_OUT") {
        logout();
      }
      setLoading(false);
    });

    // 2. Connection check
    const checkConnection = async () => {
      try {
        await getSystemInfo();
        const deviceName = await getDeviceName();
        useGamesStore.getState().setDeviceName(deviceName);
        setBackendConnected(true);
      } catch (e) {
        setBackendConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    // 3. Deep Link Listener (Auth Callback)
    const setupDeepLinkListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen("deep-link://new-url", async (event) => {
        const url = event.payload as string;
        console.log("Deep link received:", url);

        // Supabase passes tokens in the hash usually: #access_token=...&refresh_token=...
        // Or sometimes query params.
        // We can just let supabase-js handle the URL session parsing if we use setSession
        // or manually parse it.
        // Easiest is to manually extract access_token and refresh_token from the URL.

        try {
          // Check for # or ?
          // Example: sync-saves://auth/callback#access_token=...&refresh_token=...&token_type=bearer...
          const { supabase } = await import("@/lib/supabase");

          // Extract fragment
          const fragment = url.split('#')[1];
          if (fragment) {
            const params = new URLSearchParams(fragment);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
              setLoading(true);
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token
              });
              if (error) throw error;
              console.log("Session set from deep link!");
              // Auth state listener will handle the rest
            }
          } else {
            // Should handle error cases or query params (PKCE code flow)
            // If using PKCE, we get a code query param.
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
          }
        } catch (e: any) {
          console.error("Failed to handle deep link auth:", e);
          toast.error("Login Failed", e.message || "Could not authenticate from link.");
        } finally {
          setLoading(false);
        }
      });
      return unlisten;
    };

    let deepLinkUnlisten: (() => void) | undefined;
    setupDeepLinkListener().then(unlisten => { deepLinkUnlisten = unlisten; });

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      if (deepLinkUnlisten) deepLinkUnlisten();
    };
  }, [setUser, logout, setLoading, setBackendConnected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium">Initializing Sync Saves...</p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
        />

        <Route
          path="/"
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="games" element={<Games />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
