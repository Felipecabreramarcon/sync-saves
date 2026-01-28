import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthSession } from '../useAuthSession';
import { useAuthStore } from '@/stores/authStore';

// Mock Supabase
const mockSetUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSession: () => mockGetSession(),
  onAuthStateChange: (cb: any) => {
    mockOnAuthStateChange(cb);
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  },
  supabase: {
    auth: {
      setSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
}));

// Mock Store
vi.mock('@/stores/authStore', async () => {
  const actual = await vi.importActual('@/stores/authStore');
  return {
    ...(actual as any),
    useAuthStore: vi.fn(),
  };
});

describe('useAuthSession', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default store mock behavior
    (useAuthStore as any).mockImplementation((selector: any) => {
      const state = {
        setUser: mockSetUser,
        logout: vi.fn(),
        setLoading: vi.fn(),
      };
      return selector(state);
    });
    // Add getState method for access outside hooks if needed
    (useAuthStore as any).getState = () => ({
      setUser: mockSetUser,
      loadActivities: vi.fn(),
    });
  });

  afterEach(() => {
    // @ts-expect-error - JSDOM/Type mismatch for window.location
    window.location = originalLocation;
  });

  it('should check session on mount and set user if exists', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    // return a session
    mockGetSession.mockResolvedValueOnce({ user: mockUser });

    renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          email: 'test@example.com',
        }),
      );
    });
  });

  it('should handle no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });

  it('should subscribe to auth changes', () => {
    mockGetSession.mockResolvedValueOnce(null);
    renderHook(() => useAuthSession());

    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });
});
