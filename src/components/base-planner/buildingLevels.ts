/**
 * Clash of Clans Building Max Levels Registry (Town Hall 1 -> 18)
 * 
 * Provides official max building levels by Town Hall for accurate graphics rendering,
 * level badges, and inventory displays.
 */

// Max level for each building at each Town Hall level (1 to 18)
export const BUILDING_MAX_LEVELS_BY_TH: Record<string, Record<number, number>> = {
  // Town Hall: Level is always the Town Hall level itself
  "town-hall": {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
    11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18,
  },

  // Defenses
  "cannon": {
    1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 10, 9: 11, 10: 13,
    11: 14, 12: 17, 13: 19, 14: 20, 15: 21, 16: 21, 17: 21, 18: 21,
  },
  "archer-tower": {
    2: 2, 3: 3, 4: 4, 5: 6, 6: 7, 7: 8, 8: 10, 9: 11, 10: 13,
    11: 14, 12: 17, 13: 19, 14: 20, 15: 21, 16: 21, 17: 21, 18: 21,
  },
  "mortar": {
    3: 2, 4: 3, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18,
  },
  "air-defense": {
    4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 10, 13: 11, 14: 12, 15: 13, 16: 14, 17: 14, 18: 14,
  },
  "wizard-tower": {
    5: 2, 6: 3, 7: 4, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 11, 13: 12, 14: 13, 15: 15, 16: 16, 17: 17, 18: 18,
  },
  "air-sweeper": {
    6: 2, 7: 3, 8: 4, 9: 5, 10: 6,
    11: 6, 12: 7, 13: 7, 14: 7, 15: 7, 16: 7, 17: 7, 18: 7,
  },
  "hidden-tesla": {
    7: 3, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 10, 13: 11, 14: 12, 15: 13, 16: 14, 17: 15, 18: 16,
  },
  "bomb-tower": {
    8: 2, 9: 3, 10: 4,
    11: 5, 12: 7, 13: 8, 14: 9, 15: 10, 16: 11, 17: 12, 18: 12,
  },
  "xbow": {
    9: 3, 10: 4,
    11: 5, 12: 6, 13: 7, 14: 8, 15: 9, 16: 10, 17: 11, 18: 12,
  },
  "inferno-tower": {
    10: 3,
    11: 5, 12: 6, 13: 7, 14: 8, 15: 9, 16: 10, 17: 11, 18: 11,
  },
  "eagle-artillery": {
    11: 2, 12: 3, 13: 4, 14: 5, 15: 6, 16: 6, 17: 7, 18: 7,
  },
  "scattershot": {
    13: 2, 14: 3, 15: 4, 16: 4, 17: 5, 18: 6,
  },
  "monolith": {
    15: 2, 16: 3, 17: 4, 18: 4,
  },
  "spell-tower": {
    15: 3, 16: 3, 17: 4, 18: 4,
  },
  "multi-archer-tower": {
    16: 1, 17: 2, 18: 2,
  },
  "ricochet-cannon": {
    16: 1, 17: 2, 18: 2,
  },
  "firespitter": {
    17: 1, 18: 2,
  },

  // Walls
  "wall": {
    2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
    11: 12, 12: 13, 13: 14, 14: 15, 15: 16, 16: 17, 17: 18, 18: 18,
  },

  // Resources
  "gold-mine": {
    1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 10, 7: 11, 8: 12, 9: 12, 10: 12,
    11: 12, 12: 13, 13: 14, 14: 14, 15: 15, 16: 15, 17: 16, 18: 16,
  },
  "elixir-collector": {
    1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 10, 7: 11, 8: 12, 9: 12, 10: 12,
    11: 12, 12: 13, 13: 14, 14: 14, 15: 15, 16: 15, 17: 16, 18: 16,
  },
  "dark-elixir-drill": {
    7: 3, 8: 3, 9: 6, 10: 6,
    11: 6, 12: 7, 13: 8, 14: 8, 15: 9, 16: 9, 17: 10, 18: 10,
  },
  "gold-storage": {
    1: 1, 2: 3, 3: 6, 4: 8, 5: 9, 6: 10, 7: 11, 8: 11, 9: 11, 10: 11,
    11: 12, 12: 13, 13: 14, 14: 15, 15: 16, 16: 17, 17: 18, 18: 18,
  },
  "elixir-storage": {
    1: 1, 2: 3, 3: 6, 4: 8, 5: 9, 6: 10, 7: 11, 8: 11, 9: 11, 10: 11,
    11: 12, 12: 13, 13: 14, 14: 15, 15: 16, 16: 17, 17: 18, 18: 18,
  },
  "dark-elixir-storage": {
    7: 2, 8: 4, 9: 6, 10: 6,
    11: 6, 12: 7, 13: 8, 14: 9, 15: 10, 16: 10, 17: 11, 18: 11,
  },

  // Army
  "clan-castle": {
    2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3, 8: 4, 9: 5, 10: 6,
    11: 7, 12: 8, 13: 9, 14: 10, 15: 11, 16: 12, 17: 12, 18: 13,
  },
  "army-camp": {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 6, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 10, 13: 11, 14: 11, 15: 11, 16: 12, 17: 12, 18: 13,
  },
  "barracks": {
    1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 11, 10: 12,
    11: 12, 12: 13, 13: 14, 14: 15, 15: 16, 16: 17, 17: 17, 18: 17,
  },
  "dark-barracks": {
    7: 2, 8: 4, 9: 6, 10: 7,
    11: 7, 12: 8, 13: 9, 14: 9, 15: 10, 16: 10, 17: 10, 18: 10,
  },
  "laboratory": {
    3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 10, 13: 11, 14: 12, 15: 13, 16: 14, 17: 15, 18: 16,
  },
  "spell-factory": {
    5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 5,
    11: 5, 12: 6, 13: 6, 14: 6, 15: 7, 16: 7, 17: 7, 18: 7,
  },
  "dark-spell-factory": {
    8: 2, 9: 3, 10: 4,
    11: 4, 12: 5, 13: 5, 14: 5, 15: 6, 16: 6, 17: 6, 18: 6,
  },
  "blacksmith": {
    8: 1, 9: 2, 10: 3,
    11: 4, 12: 5, 13: 6, 14: 7, 15: 8, 16: 9, 17: 9, 18: 9,
  },
  "workshop": {
    12: 3, 13: 4, 14: 5, 15: 6, 16: 7, 17: 7, 18: 7,
  },
  "pet-house": {
    14: 4, 15: 8, 16: 9, 17: 10, 18: 10,
  },
  "hero-hall": {
    4: 1, 5: 1, 6: 1, 7: 2, 8: 3, 9: 4, 10: 5,
    11: 5, 12: 6, 13: 7, 14: 8, 15: 9, 16: 10, 17: 11, 18: 11,
  },
  "helper-hut": {
    9: 1, 10: 1,
    11: 1, 12: 2, 13: 2, 14: 3, 15: 3, 16: 4, 17: 4, 18: 4,
  },
  "builder-hut": {
    1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1,
    11: 1, 12: 1, 13: 1, 14: 2, 15: 3, 16: 4, 17: 5, 18: 5,
  },
  "hero-banner": {
    7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1,
  },

  // Traps
  "bomb": {
    3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 6, 9: 6, 10: 7,
    11: 7, 12: 8, 13: 9, 14: 10, 15: 11, 16: 12, 17: 12, 18: 12,
  },
  "spring-trap": {
    4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 4, 10: 5,
    11: 5, 12: 5, 13: 5, 14: 5, 15: 5, 16: 5, 17: 5, 18: 5,
  },
  "air-bomb": {
    5: 2, 6: 3, 7: 3, 8: 4, 9: 4, 10: 4,
    11: 4, 12: 5, 13: 6, 14: 7, 15: 8, 16: 9, 17: 10, 18: 10,
  },
  "giant-bomb": {
    6: 2, 7: 2, 8: 3, 9: 3, 10: 4,
    11: 4, 12: 5, 13: 6, 14: 7, 15: 8, 16: 9, 17: 10, 18: 10,
  },
  "seeking-air-mine": {
    7: 1, 8: 1, 9: 2, 10: 3,
    11: 3, 12: 4, 13: 5, 14: 5, 15: 6, 16: 7, 17: 8, 18: 8,
  },
  "skeleton-trap": {
    8: 2, 9: 3, 10: 3,
    11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4,
  },
  "tornado-trap": {
    11: 1, 12: 2, 13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3,
  },
  "giga-bomb": {
    17: 1, 18: 2,
  },
};

/**
 * Returns the maximum allowed level for a given building at a specific Town Hall level.
 */
export function getMaxBuildingLevel(townHallLevel: number, buildingId: string): number {
  const safeTH = Math.max(1, Math.min(18, townHallLevel || 11));
  if (buildingId === "town-hall") {
    return safeTH;
  }

  const table = BUILDING_MAX_LEVELS_BY_TH[buildingId];
  if (!table) return 1;

  if (table[safeTH] !== undefined) {
    return table[safeTH];
  }

  // If not exact, find highest unlocked TH <= safeTH
  let bestLevel = 1;
  for (let th = safeTH; th >= 1; th--) {
    if (table[th] !== undefined) {
      return table[th];
    }
  }

  return bestLevel;
}

/**
 * Resolves the effective level for a placed building.
 * If the building already has an explicit level > 0, returns that.
 * Otherwise, falls back to the max level allowed by the layout's Town Hall level.
 */
export function getEffectiveBuildingLevel(
  townHallLevel: number,
  buildingId: string,
  level?: number
): number {
  if (typeof level === "number" && level > 0) {
    return level;
  }
  return getMaxBuildingLevel(townHallLevel, buildingId);
}
