import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import type { BuildingDef, ChainDangerPair, PlacedBuilding } from "./types";

/**
 * Checks if a building at (x, y) with (width, height) is strictly inside 44x44 grid
 */
export function isWithinBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x + width <= GRID_SIZE && y + height <= GRID_SIZE;
}

/**
 * Checks if two bounding boxes overlap
 */
export function doBuildingsOverlap(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Validates whether a building placement or move is legal
 */
export function checkPlacementValidity(
  buildingId: string,
  x: number,
  y: number,
  currentPlaced: PlacedBuilding[],
  ignoreInstanceId?: string
): { valid: boolean; reason?: "out_of_bounds" | "overlap" } {
  const def = BUILDINGS_BY_ID.get(buildingId);
  if (!def) return { valid: false, reason: "out_of_bounds" };

  if (!isWithinBounds(x, y, def.width, def.height)) {
    return { valid: false, reason: "out_of_bounds" };
  }

  for (const item of currentPlaced) {
    if (ignoreInstanceId && item.instanceId === ignoreInstanceId) continue;
    const itemDef = BUILDINGS_BY_ID.get(item.buildingId);
    if (!itemDef) continue;

    if (doBuildingsOverlap(x, y, def.width, def.height, item.x, item.y, itemDef.width, itemDef.height)) {
      return { valid: false, reason: "overlap" };
    }
  }

  return { valid: true };
}

/**
 * Computes edge-to-edge Chebyshev gap distance in tiles between two rectangular buildings.
 * If touching or overlapping: 0.
 * If 1 tile empty space between them: 1.
 * If 2 tiles empty space between them: 2.
 */
export function getTileGap(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): number {
  const dx = Math.max(0, Math.max(x1 - (x2 + w2), x2 - (x1 + w1)));
  const dy = Math.max(0, Math.max(y1 - (y2 + h2), y2 - (y1 + h1)));
  return Math.max(dx, dy);
}

/**
 * Scans all placed non-wall buildings and detects pairs that are ≤ maxGap (default 2 tiles) apart.
 * In Clash of Clans, Electro Dragon chain lightning travels up to 2 tiles between buildings.
 * Lightning (Zap) and Earthquake spells also exploit closely packed core defenses.
 */
export function scanChainLightningHazards(
  buildings: PlacedBuilding[],
  maxGap = 2
): {
  dangerPairs: ChainDangerPair[];
  vulnerableInstanceIds: Set<string>;
  criticalCount: number;
  warningCount: number;
} {
  const dangerPairs: ChainDangerPair[] = [];
  const vulnerableInstanceIds = new Set<string>();
  let criticalCount = 0;
  let warningCount = 0;

  // Filter out walls and traps from chain lightning analysis (walls don't chain e-drag, traps are hidden)
  const nonWallBuildings = buildings.filter((b) => {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    return def && def.category !== "wall" && def.category !== "trap";
  });

  const n = nonWallBuildings.length;
  for (let i = 0; i < n; i++) {
    const b1 = nonWallBuildings[i];
    const def1 = BUILDINGS_BY_ID.get(b1.buildingId);
    if (!def1) continue;

    for (let j = i + 1; j < n; j++) {
      const b2 = nonWallBuildings[j];
      const def2 = BUILDINGS_BY_ID.get(b2.buildingId);
      if (!def2) continue;

      const gap = getTileGap(b1.x, b1.y, def1.width, def1.height, b2.x, b2.y, def2.width, def2.height);

      if (gap <= maxGap) {
        const dangerLevel = gap <= 1 ? "critical" : "warning";
        dangerPairs.push({
          b1,
          b2,
          b1Def: def1,
          b2Def: def2,
          distance: gap,
          dangerLevel,
        });

        vulnerableInstanceIds.add(b1.instanceId);
        vulnerableInstanceIds.add(b2.instanceId);

        if (dangerLevel === "critical") criticalCount++;
        else warningCount++;
      }
    }
  }

  return { dangerPairs, vulnerableInstanceIds, criticalCount, warningCount };
}
