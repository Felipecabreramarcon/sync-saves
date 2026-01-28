import { render, screen } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { SyncActivity } from '@/stores/gamesStore';
import { describe, it, expect } from 'vitest';

describe('Timeline', () => {
  const mockActivities: SyncActivity[] = [
    {
      id: '1',
      game_id: 'g1',
      game_name: 'Game One',
      action: 'upload',
      status: 'success',
      created_at: '2023-01-01T10:00:00Z',
    },
    {
      id: '2',
      game_id: 'g2',
      game_name: 'Game Two',
      action: 'download',
      status: 'success',
      created_at: '2023-01-02T10:00:00Z', // Newer
    },
    {
      id: '3',
      game_id: 'g3',
      game_name: 'Game Three',
      action: 'upload',
      status: 'success',
      created_at: '2023-01-01T09:00:00Z', // Older
    },
  ];

  it('renders activities in descending chronological order', () => {
    render(<Timeline activities={mockActivities} />);

    // Expected order: Game Two (Jan 2), Game One (Jan 1 10:00), Game Three (Jan 1 09:00)
    const items = screen.getAllByText(/Game (One|Two|Three)/);

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Game Two');
    expect(items[1]).toHaveTextContent('Game One');
    expect(items[2]).toHaveTextContent('Game Three');
  });

  it('renders empty state when no activities', () => {
    render(<Timeline activities={[]} />);
    expect(screen.getByText('SYSTEM LOGS EMPTY')).toBeInTheDocument();
  });
});
