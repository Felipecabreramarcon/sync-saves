import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Games from '@/pages/Games';
import Logs from '@/pages/Logs';
import Settings from '@/pages/Settings';
import { useAuthStore } from '@/stores/authStore';
import ToastContainer from '@/components/common/ToastContainer';
import {
  useAuthSession,
  useDeepLinkAuth,
  useAutoSync,
  useBackendConnection,
} from '@/hooks';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Initialize all app-level hooks
  useAuthSession();
  useDeepLinkAuth();
  useAutoSync();
  useBackendConnection();

  if (isLoading) {
    return (
      <div className='min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4'>
        <div className='w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin' />
        <p className='text-gray-400 font-medium'>Initializing Sync Saves...</p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path='/login'
          element={!isAuthenticated ? <Login /> : <Navigate to='/' />}
        />

        <Route
          path='/'
          element={isAuthenticated ? <MainLayout /> : <Navigate to='/login' />}
        >
          <Route index element={<Navigate to='/dashboard' replace />} />
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='games' element={<Games />} />
          <Route path='logs' element={<Logs />} />
          <Route path='settings' element={<Settings />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
