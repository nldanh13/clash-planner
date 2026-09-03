import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import type { BuildingDef, ChainDangerPair, PlacedBuilding } from "./types";

/**
 * ĐỊNH NGHĨA KHOẢNG CÁCH DUY NHẤT (EDGE-TO-EDGE):
 * Đo khoảng cách rỗng (gap) giữa 2 viền công trình theo Chebyshev distance (tối đa của dx, dy).
 * - Nếu chạm nhau hoặc đè lên nhau: khoảng cách = 0 ô.
 * - Nếu cách nhau đúng 1 ô trống: khoảng cách = 1 ô (Sét lan truyền được).
 * - Nếu cách nhau 2 ô trống: khoảng cách = 2 ô (Sét lan KHÔNG truyền được, nhưng nằm trong diện cảnh báo Zap/Earthquake).
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
 * In Clash of Clans, Electro Dragon chain lightning travels up to 1 tile (gap <= 1). 2 tiles is considered a warning for Zap/Earthquake or slight misplacements. between buildings.
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
