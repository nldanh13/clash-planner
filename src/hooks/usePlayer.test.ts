// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlayer } from './usePlayer';

// Mock fetchPlayer
vi.mock('../services/warReportApi', () => ({
  fetchPlayer: vi.fn(),
}));

import { fetchPlayer } from '../services/warReportApi';

describe('usePlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads player successfully and caches it', async () => {
    const mockPlayer = {
      tag: '#ABCD',
      name: 'Player 1',
      townHallLevel: 10,
    };
    
    (fetchPlayer as any).mockResolvedValue(mockPlayer);

    const { result } = renderHook(() => usePlayer());

    // Initially no player
    expect(result.current.player).toBeNull();

    await act(async () => {
      await result.current.load('#ABCD');
    });

    expect(fetchPlayer).toHaveBeenCalledWith('#ABCD', expect.any(AbortSignal));
    expect(result.current.player).toEqual(mockPlayer);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');

    // Check localStorage
    expect(localStorage.getItem('coc-last-tag')).toBe('#ABCD');
    expect(localStorage.getItem('coc-cache-#ABCD')).toBe(JSON.stringify(mockPlayer));
  });

  it('uses cache when API fails', async () => {
    const mockPlayer = {
      tag: '#ABCD',
      name: 'Cached Player',
      townHallLevel: 10,
      heroes: [], troops: [], spells: [], heroEquipment: []
    };
    
    localStorage.setItem('coc-cache-#ABCD', JSON.stringify(mockPlayer));
    localStorage.setItem('coc-cache-time-#ABCD', Date.now().toString());

    (fetchPlayer as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePlayer());

    await act(async () => {
      await result.current.load('#ABCD');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.player?.name).toBe('Cached Player');
    expect(result.current.cacheWarning).toMatch(/Đang dùng dữ liệu lưu trên máy từ lúc/);
  });
  
  it('handles timeout correctly', async () => {
    vi.useFakeTimers();
    
    (fetchPlayer as any).mockImplementation((tag: string, signal: AbortSignal) => {
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const { result } = renderHook(() => usePlayer());

    let promise: Promise<void>;
    act(() => {
      promise = result.current.load('#ABCD');
    });

    // Fast-forward 15 seconds
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    await act(async () => {
      await promise;
    });

    expect(result.current.error).toBe('Yêu cầu quá hạn (timeout). Máy chủ không phản hồi.');
    expect(result.current.loading).toBe(false);
    
    vi.useRealTimers();
  });
});
