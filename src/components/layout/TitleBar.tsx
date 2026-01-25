import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function TitleBar() {
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error('Failed to minimize:', e);
    }
  };

  const handleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.error('Failed to maximize:', e);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close:', e);
    }
  };

  const handleDragStart = async (e: React.MouseEvent) => {
    // Prevent drag on buttons
    if ((e.target as HTMLElement).closest('button')) return;

    try {
      await getCurrentWindow().startDragging();
    } catch (e) {
      console.error('Failed to start dragging:', e);
    }
  };

  return (
    <div
      onMouseDown={handleDragStart}
      className='fixed top-0 left-0 right-0 h-8 z-50 flex items-center justify-between select-none bg-[var(--color-background)]/90 backdrop-blur-md border-b border-[var(--color-primary)]/20'
    >
      {/* App Title - draggable area */}
      <div className='flex-1 h-full flex items-center px-4 cursor-default'>
        <span className='text-xs font-semibold text-[var(--color-text-muted)] tracking-wider font-display text-neon'>
          SYNC SAVES
        </span>
      </div>

      {/* Window Controls */}
      <div className='flex items-center h-full'>
        <button
          onClick={handleMinimize}
          className='h-full w-12 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/10 hover:text-white transition-colors'
          aria-label='Minimize'
        >
          <Minus className='w-4 h-4' />
        </button>
        <button
          onClick={handleMaximize}
          className='h-full w-12 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors'
          aria-label='Maximize'
        >
          <Square className='w-3.5 h-3.5' />
        </button>
        <button
          onClick={handleClose}
          className='h-full w-12 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors'
          aria-label='Close'
        >
          <X className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
}
