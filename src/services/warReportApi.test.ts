import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPlayer } from './warReportApi';

describe('fetchPlayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes tag and fetches data successfully', async () => {
    const mockData = {
      tag: '#1234',
      name: 'Test Player',
      townHallLevel: 10,
      expLevel: 100,
      trophies: 2000,
      bestTrophies: 2500,
      warStars: 500,
      attackWins: 100,
      defenseWins: 10,
      heroes: [{ name: 'Barbarian King', level: 10, maxLevel: 50, village: 'home' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchPlayer('1234');
    
    expect(global.fetch).toHaveBeenCalledWith('/api/warreport/v1/players/%231234', expect.any(Object));
    expect(result.name).toBe('Test Player');
    expect(result.heroes.length).toBe(1);
  });

  it('filters out invalid units', async () => {
    const mockData = {
      tag: '#1234',
      name: 'Test Player',
      townHallLevel: 10,
      expLevel: 100,
      trophies: 2000,
      bestTrophies: 2500,
      warStars: 500,
      attackWins: 100,
      defenseWins: 10,
      heroes: [
        { name: 'Barbarian King', level: 10, maxLevel: 50, village: 'home' }, // valid
        { name: 'Archer Queen', level: 10 }, // invalid (missing maxLevel)
        null, // invalid
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchPlayer('#1234');
    expect(result.heroes.length).toBe(1);
    expect(result.heroes[0].name).toBe('Barbarian King');
  });

  it('handles 404 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchPlayer('#1234')).rejects.toThrow('Không tìm thấy người chơi');
  });

  it('handles 403 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(fetchPlayer('#1234')).rejects.toThrow('War Report đã thay đổi quyền');
  });

  it('handles bad payload', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag: '#1234' }), // missing townHallLevel
    });

    await expect(fetchPlayer('#1234')).rejects.toThrow('Dữ liệu phản hồi từ War Report không hợp lệ');
  });
});
