import { NavLink, useLocation } from 'react-router-dom';
import { Avatar, Tooltip, Button } from '@heroui/react';
import {
  LayoutDashboard,
  Gamepad2,
  History,
  Settings,
  Cloud,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/games', label: 'My Games', icon: Gamepad2 },
  { path: '/logs', label: 'Logs', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`
        fixed left-0 right-0 bottom-0 top-auto h-16 w-full bg-bg-secondary/50 backdrop-blur-xl border-t border-white/5
        flex flex-row transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-40
        md:left-0 md:right-auto md:bottom-auto md:top-8 md:h-[calc(100vh-2rem)] md:border-t-0 md:border-r md:border-white/5 md:flex-col
        ${isSidebarCollapsed ? 'md:w-18' : 'md:w-60'}
      `}
    >
      {/* Logo */}
      <div className='hidden md:flex p-4 items-center gap-3 border-b border-white/5 h-18'>
        <div className='w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20'>
          <Cloud className='w-5 h-5 text-white' />
        </div>
        {!isSidebarCollapsed && (
          <div className='overflow-hidden'>
            <h1 className='font-bold text-white text-base leading-tight tracking-tight whitespace-nowrap'>
              Sync Saves
            </h1>
            <p className='text-[10px] text-gray-400 font-medium whitespace-nowrap'>
              CLOUD MANAGER
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className='flex-1 p-2 md:p-3 flex items-center justify-around md:block md:space-y-1.5 overflow-x-auto md:overflow-y-auto scrollbar-hide'>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === '/dashboard' && location.pathname === '/');
          const Icon = item.icon;

          const linkContent = (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group relative overflow-hidden
                ${
                  isActive
                    ? 'bg-white/5 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <div className='absolute inset-y-0 left-0 w-1 bg-primary-500 rounded-full' />
              )}
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {!isSidebarCollapsed && (
                <span className='text-sm font-medium whitespace-nowrap'>
                  {item.label}
                </span>
              )}
            </NavLink>
          );

          if (isSidebarCollapsed) {
            return (
              <Tooltip key={item.path}>
                <Tooltip.Trigger>{linkContent}</Tooltip.Trigger>
                <Tooltip.Content>{item.label}</Tooltip.Content>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* User Profile */}
      <div className='hidden md:block p-3 border-t border-white/5'>
        <div
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className='relative'>
            <Avatar size='sm'>
              <Avatar.Image alt={user?.name || 'User'} src={user?.avatar_url} />
              <Avatar.Fallback>{user?.name?.charAt(0) || 'U'}</Avatar.Fallback>
            </Avatar>
            <div className='absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-bg-secondary' />
          </div>
          {!isSidebarCollapsed && (
            <div className='overflow-hidden flex-1'>
              <p className='text-sm font-medium text-white truncate'>
                {user?.name || 'User'}
              </p>
              <div className='flex items-center justify-between'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useAuthStore.getState().logout();
                  }}
                  className='text-[10px] text-red-400 hover:text-red-300 transition-colors'
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
          {!isSidebarCollapsed && (
            <NavLink
              to='/settings'
              className='p-1 rounded-lg hover:bg-white/10 transition-colors'
            >
              <Settings className='w-4 h-4 text-gray-500 group-hover:text-white transition-colors' />
            </NavLink>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <Button
        isIconOnly
        size='sm'
        variant='secondary'
        onPress={toggleSidebar}
        className='hidden md:flex absolute -right-3 top-20 w-6 h-6 min-w-0 rounded-full'
      >
        {isSidebarCollapsed ? (
          <ChevronRight size={12} />
        ) : (
          <ChevronLeft size={12} />
        )}
      </Button>
    </aside>
  );
}
