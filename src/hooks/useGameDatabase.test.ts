/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameDatabase, getTownHallInfo } from './useGameDatabase';
import { imageDb, setTownHallDb } from '../services/gameDatabase';

describe('useGameDatabase', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // clear the db state
    for (const key in imageDb) delete imageDb[key];
    // townHallDb = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should load data successfully and return no warnings when data is valid', async () => {
    const mockImages = { "cannon": "http://img.url" };
    const mockTownHalls = [{ level: 1, title: 'TH1', unlocks: {} }];
    const mockLevels = { "cannon": [{ level: 1, cost: 100, timeHours: 1 }] };

    vi.mocked(fetch).mockImplementation(async (url) => {
      if (url === '/data/images.json') return { ok: true, json: async () => mockImages } as any;
      if (url === '/data/townhalls.json') return { ok: true, json: async () => mockTownHalls } as any;
      if (url === '/data/levels.json') return { ok: true, json: async () => mockLevels } as any;
      return { ok: false } as any;
    });

    const onLoaded = vi.fn();
    const { result } = renderHook(() => useGameDatabase(onLoaded));

    await waitFor(() => {
      expect(onLoaded).toHaveBeenCalled();
    });

    expect(result.current.warnings).toHaveLength(0);
    expect(imageDb['cannon']).toBe('http://img.url');
  });

  it('should fallback and return warnings when a file is invalid', async () => {
    const mockImages = { "cannon": "invalid-url" }; // Invalid, not starting with http
    const mockTownHalls = [{ level: 1, title: 'TH1', unlocks: {} }];
    const mockLevels = null;

    vi.mocked(fetch).mockImplementation(async (url) => {
      if (url === '/data/images.json') return { ok: true, json: async () => mockImages } as any;
      if (url === '/data/townhalls.json') return { ok: true, json: async () => mockTownHalls } as any;
      if (url === '/data/levels.json') return { ok: true, json: async () => mockLevels } as any;
      return { ok: false } as any;
    });

    const onLoaded = vi.fn();
    const { result } = renderHook(() => useGameDatabase(onLoaded));

    await waitFor(() => {
      expect(onLoaded).toHaveBeenCalled();
    });

    expect(result.current.warnings).toContain("images.json has invalid schema, using fallback.");
    expect(imageDb['cannon']).toBeUndefined(); // imageDb wasn't updated
  });
});
