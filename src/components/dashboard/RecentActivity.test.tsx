import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RecentActivity from './RecentActivity';
import { useGamesStore } from '@/stores/gamesStore';

// Mock Supabase to avoid initialization error
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ data: [], error: null }) }),
    }),
  },
}));

// Mock scrollIntoView which is not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('RecentActivity', () => {
  beforeEach(() => {
    // Reset store state
    useGamesStore.setState({
      activities: [],
      games: [],
      isLoading: false,
    });
  });

  it('renders "No activity yet" when there are no activities', () => {
    render(
      <MemoryRouter>
        <RecentActivity />
      </MemoryRouter>
    );

    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(screen.getByText('Sync your games to see your history here.')).toBeInTheDocument();
  });

  it('renders activities grouped by date', () => {
    const now = new Date();
    const today = now.toISOString();
    const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString();

    const activities = [
      {
        id: '1',
        game_id: 'game-1',
        game_name: 'Cyberpunk 2077',
        action: 'upload',
        status: 'success',
        created_at: today,
        message: 'Synced successfully',
      },
      {
        id: '2',
        game_id: 'game-2',
        game_name: 'The Witcher 3',
        action: 'download',
        status: 'success',
        created_at: yesterday,
        message: 'Downloaded save',
      },
    ];

    useGamesStore.setState({ activities: activities as any });

    render(
      <MemoryRouter>
        <RecentActivity />
      </MemoryRouter>
    );

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk 2077')).toBeInTheDocument();
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('filters out "skip" actions by default', () => {
    const today = new Date().toISOString();
    const activities = [
      {
        id: '1',
        game_id: 'game-1',
        game_name: 'Skipped Game',
        action: 'skip',
        status: 'success',
        created_at: today,
      },
      {
        id: '2',
        game_id: 'game-2',
        game_name: 'Visible Game',
        action: 'upload',
        status: 'success',
        created_at: today,
      },
    ];

    useGamesStore.setState({ activities: activities as any });

    render(
      <MemoryRouter>
        <RecentActivity />
      </MemoryRouter>
    );

    expect(screen.queryByText('Skipped Game')).not.toBeInTheDocument();
    expect(screen.getByText('Visible Game')).toBeInTheDocument();
  });
});
