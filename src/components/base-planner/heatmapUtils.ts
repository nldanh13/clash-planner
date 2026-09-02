import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import type { PlacedBuilding } from "./types";

/**
 * Relative firepower weight for defenses based on their DPS, threat level, and splash utility in Clash of Clans
 */
const FIREPOWER_WEIGHTS: Record<string, number> = {
  "monolith": 16,
  "inferno-tower": 14,
  "eagle-artillery": 13,
  "scattershot": 13,
  "town-hall": 12, // TH12+ Giga Tesla / Inferno / Death Bomb
  "xbow": 9,
  "wizard-tower": 8,
  "bomb-tower": 7,
  "air-defense": 8,
  "ricochet-cannon": 8,
  "multi-archer-tower": 8,
  "firespitter": 10,
  "spell-tower": 9,
  "hidden-tesla": 6,
  "archer-tower": 5,
  "cannon": 5,
  "mortar": 4,
  "clan-castle": 6,
  "builder-hut": 4,
};

export interface HeatmapData {
  densityGrid: Float32Array; // Flattened 44 * 44 array
  maxDensity: number;
  coverageCount: number; // cells with > 0 firepower
  totalActiveArea: number;
  blindSpotsPercent: number;
  quadrantBalance: { nw: number; ne: number; sw: number; se: number };
}

/**
 * Calculates the 44x44 Firepower Heatmap grid from all placed defensive structures
 */
export function calculateFirepowerHeatmap(buildings: PlacedBuilding[]): HeatmapData {
  const size = GRID_SIZE;
  const density = new Float32Array(size * size);
  let maxVal = 0;

  // Filter defensive structures
  const defenses = buildings.filter((b) => {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    return def && (def.category === "defense" || def.category === "hero" || b.buildingId === "town-hall" || b.buildingId === "clan-castle");
  });

  for (let i = 0; i < defenses.length; i++) {
    const b = defenses[i];
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def || !def.range) continue;

    const weight = FIREPOWER_WEIGHTS[b.buildingId] || 5;
    const centerX = b.x + def.width / 2;
    const centerY = b.y + def.height / 2;
    const range = def.range;
    const minRange = def.minRange || 0;

    // Bounding box for range to limit iteration
    const minX = Math.max(0, Math.floor(centerX - range));
    const maxX = Math.min(size - 1, Math.ceil(centerX + range));
    const minY = Math.max(0, Math.floor(centerY - range));
    const maxY = Math.min(size - 1, Math.ceil(centerY + range));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - centerX;
        const dy = y + 0.5 - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= range && dist >= minRange) {
          // Distance attenuation (closer to center has slightly higher concentration)
          const falloff = 1 - (dist / (range * 1.2));
          const added = weight * Math.max(0.3, falloff);
          const idx = y * size + x;
          density[idx] += added;

          if (density[idx] > maxVal) {
            maxVal = density[idx];
          }
        }
      }
    }
  }

  // Calculate stats & quadrant balance
  let coverageCount = 0;
  let nw = 0;
  let ne = 0;
  let sw = 0;
  let se = 0;
  const half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const val = density[idx];
      if (val > 0) {
        coverageCount++;
        if (x < half && y < half) nw += val;
        else if (x >= half && y < half) ne += val;
        else if (x < half && y >= half) sw += val;
        else se += val;
      }
    }
  }

  const totalHeat = nw + ne + sw + se || 1;
  const blindSpotsPercent = Math.max(0, Math.round((1 - coverageCount / (size * size * 0.8)) * 100));

  return {
    densityGrid: density,
    maxDensity: Math.max(1, maxVal),
    coverageCount,
    totalActiveArea: size * size,
    blindSpotsPercent,
    quadrantBalance: {
      nw: Math.round((nw / totalHeat) * 100),
      ne: Math.round((ne / totalHeat) * 100),
      sw: Math.round((sw / totalHeat) * 100),
      se: Math.round((se / totalHeat) * 100),
    },
  };
}

/**
 * Returns an RGBA color string representing normalized intensity (0.0 to 1.0)
 * Gradient: Transparent -> Blue -> Cyan -> Green -> Yellow -> Orange -> Crimson Red
 */
export function getHeatmapColor(intensity: number, alphaMultiplier = 0.55): string {
  if (intensity <= 0.01) return "rgba(0, 0, 0, 0)";

  const clamped = Math.min(1, Math.max(0, intensity));

  let r = 0;
  let g = 0;
  let b = 0;
  let a = alphaMultiplier * Math.min(1, clamped * 1.5 + 0.15);

  if (clamped < 0.2) {
    // Deep Blue to Cyan (0.0 - 0.2)
    const t = clamped / 0.2;
    r = Math.round(20 * (1 - t) + 0 * t);
    g = Math.round(120 * (1 - t) + 210 * t);
    b = Math.round(255 * (1 - t) + 240 * t);
  } else if (clamped < 0.45) {
    // Cyan to Green (0.2 - 0.45)
    const t = (clamped - 0.2) / 0.25;
    r = Math.round(0 * (1 - t) + 46 * t);
    g = Math.round(210 * (1 - t) + 213 * t);
    b = Math.round(240 * (1 - t) + 115 * t);
  } else if (clamped < 0.7) {
    // Green to Yellow/Amber (0.45 - 0.7)
    const t = (clamped - 0.45) / 0.25;
    r = Math.round(46 * (1 - t) + 255 * t);
    g = Math.round(213 * (1 - t) + 204 * t);
    b = Math.round(115 * (1 - t) + 0 * t);
  } else if (clamped < 0.88) {
    // Yellow to Bright Orange (0.7 - 0.88)
    const t = (clamped - 0.7) / 0.18;
    r = Math.round(255 * (1 - t) + 255 * t);
    g = Math.round(204 * (1 - t) + 90 * t);
    b = 0;
  } else {
    // Orange to Intense Glowing Crimson Red (0.88 - 1.0)
    const t = (clamped - 0.88) / 0.12;
    r = Math.round(255 * (1 - t) + 255 * t);
    g = Math.round(90 * (1 - t) + 20 * t);
    b = Math.round(0 * (1 - t) + 50 * t);
    a = Math.min(0.85, a * 1.3);
  }

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}
