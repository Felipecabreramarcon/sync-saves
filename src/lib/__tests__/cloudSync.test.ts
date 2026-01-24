import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserStorageStats } from '../cloudSync';

// Mock Supabase client
const { mockEq, mockSelect, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  return {
    mockEq,
    mockSelect,
    mockFrom,
    mockSupabase: { from: mockFrom },
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock utils if needed, but they are simple functions
vi.mock('@/lib/utils', () => ({
  formatBytes: (b: number) => `${b} B`,
  timeAgo: () => 'Just now',
}));

describe('fetchUserStorageStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore chain return values if they were changed
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it('should return correct stats when data is found', async () => {
    const mockData = [
      { file_size: 100 },
      { file_size: 200 },
      { file_size: 50 },
    ];

    mockEq.mockResolvedValue({ data: mockData, error: null });

    const stats = await fetchUserStorageStats('user123');

    expect(mockFrom).toHaveBeenCalledWith('save_versions');
    expect(mockSelect).toHaveBeenCalledWith('file_size, games!inner(user_id)');
    expect(mockEq).toHaveBeenCalledWith('games.user_id', 'user123');

    expect(stats).toEqual({
      totalSaves: 3,
      totalSize: 350,
    });
  });

  it('should return zeros when error occurs', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'Some error' } });

    const stats = await fetchUserStorageStats('user123');

    expect(stats).toEqual({
      totalSaves: 0,
      totalSize: 0,
    });
  });

  it('should return zeros when data is empty', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    const stats = await fetchUserStorageStats('user123');

    expect(stats).toEqual({
      totalSaves: 0,
      totalSize: 0,
    });
  });

  it('should handle null file_size gracefully', async () => {
      const mockData = [
        { file_size: 100 },
        { file_size: null },
        { file_size: 50 },
      ];

      mockEq.mockResolvedValue({ data: mockData, error: null });

      const stats = await fetchUserStorageStats('user123');

      expect(stats).toEqual({
        totalSaves: 3,
        totalSize: 150,
      });
    });
});
