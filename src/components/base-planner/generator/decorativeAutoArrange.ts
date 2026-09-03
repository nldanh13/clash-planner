/**
 * Standalone "place whatever is still missing" heuristic used by the Decorative
 * Design tool: after a player stamps a custom wall shape (a letter, a heart...)
 * this fills in the remaining required defense/resource/army/hero/trap buildings
 * around it. Deliberately NOT wired into `baseGenerator.ts` — that engine always
 * builds a layout from scratch and has no notion of "keep these existing tiles
 * fixed, fill in the rest"; retrofitting it would risk regressing an already
 * tested, tuned pipeline for a comparatively small MVP feature. This is a simpler,
 * self-contained greedy packer instead.
 */
import { BUILDINGS_BY_ID, GRID_SIZE } from "../constants";
import { getTownHallCatalog } from "../catalog";
import { computeDeploymentAnalysis } from "../deploymentZones";
import { PlacementEngine } from "./placementEngine";
import { PRNG } from "./prng";
import type { PlacedBuilding } from "../types";

export interface AutoArrangeResult {
  buildings: PlacedBuilding[];
  placedCount: number;
  skippedCount: number;
  warnings: string[];
}

const CATEGORY_PRIORITY: Record<string, number> = {
  defense: 0,
  resource: 1,
  hero: 2,
  army: 3,
  trap: 4,
};

/**
 * Places every required building the current layout is still missing (per the
 * TH's catalog counts), avoiding all existing footprints (including any wall
 * shape the user just stamped). Walls themselves are intentionally left alone —
 * this tool arranges *buildings around* a wall shape, it does not add more walls.
 */
export function autoArrangeRemainingBuildings(
  currentBuildings: PlacedBuilding[],
  townHallLevel: number
): AutoArrangeResult {
  const entries = getTownHallCatalog(townHallLevel).filter(
    (e) => e.requiredInLayout && e.category !== "wall"
  );

  const placedCounts: Record<string, number> = {};
  for (const b of currentBuildings) {
    placedCounts[b.buildingId] = (placedCounts[b.buildingId] || 0) + 1;
  }

  type QueueItem = { buildingId: string; width: number; height: number; category: string };
  const queue: QueueItem[] = [];
  for (const entry of entries) {
    const needed = entry.count - (placedCounts[entry.buildingId] || 0);
    for (let i = 0; i < needed; i++) {
      queue.push({ buildingId: entry.buildingId, width: entry.width, height: entry.height, category: entry.category });
    }
  }

  // Bigger footprints first (greedy bin-packing: large items fragment free
  // space badly if placed last), then by category importance.
  queue.sort((a, b) => {
    const areaDiff = b.width * b.height - a.width * a.height;
    if (areaDiff !== 0) return areaDiff;
    return (CATEGORY_PRIORITY[a.category] ?? 9) - (CATEGORY_PRIORITY[b.category] ?? 9);
  });

  const prng = new PRNG();
  const engine = new PlacementEngine(prng);

  // Seed the grid with everything already on the map (buildings + walls +
  // whatever shape was just stamped) so nothing new can overlap it. We keep the
  // ORIGINAL `currentBuildings` array as the source of truth for the final
  // result (preserving each building's `level`, which `engine.place()` does not
  // carry) — the engine copies are only used to occupy the collision grid.
  for (const b of currentBuildings) {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def) continue;
    engine.place(b.instanceId, b.buildingId, b.x, b.y, def.width, def.height);
  }

  const center = GRID_SIZE / 2;
  const newlyPlaced: PlacedBuilding[] = [];
  let skippedCount = 0;
  let autoIdCounter = 0;
  let trapAnchorAngle = 0;

  for (const item of queue) {
    const instanceId = `auto-${Date.now()}-${autoIdCounter++}-${Math.random().toString(36).slice(2, 6)}`;
    let pos: { x: number; y: number } | null = null;

    if (item.category === "defense" || item.category === "hero") {
      // Prefer positions close to the Town Hall / core, but keep >=2 tiles from
      // other defenses of the same building type to reduce chain-lightning risk.
      pos = engine.findBestPosition(item.width, item.height, (x, y) => {
        const cx = x + item.width / 2;
        const cy = y + item.height / 2;
        const distToCenter = Math.hypot(cx - center, cy - center);
        const sameTypeDist = engine.minDistanceToCategory(x, y, item.width, item.height, (b) => b.buildingId === item.buildingId);
        const spacingPenalty = sameTypeDist < 2 ? 1000 : 0;
        return -distToCenter - spacingPenalty;
      });
    } else if (item.category === "resource") {
      // Spread storages/collectors apart from each other rather than clustering.
      pos = engine.findBestPosition(item.width, item.height, (x, y) => {
        return engine.minDistanceToCategory(x, y, item.width, item.height, (b) => {
          const bDef = BUILDINGS_BY_ID.get(b.buildingId);
          return bDef?.category === "resource";
        });
      });
    } else if (item.category === "trap") {
      // Scatter traps around the perimeter instead of stacking them in one corner.
      trapAnchorAngle += Math.PI / 3;
      const anchorX = center + Math.cos(trapAnchorAngle) * (center - 3);
      const anchorY = center + Math.sin(trapAnchorAngle) * (center - 3);
      pos = engine.findNearestFree(anchorX, anchorY, item.width, item.height);
    } else {
      // Army buildings: no strong placement rule needed, just find free space.
      pos = engine.findNearestFree(center, center, item.width, item.height, 40);
    }

    if (!pos) {
      skippedCount++;
      continue;
    }

    if (engine.place(instanceId, item.buildingId, pos.x, pos.y, item.width, item.height)) {
      newlyPlaced.push({ instanceId, buildingId: item.buildingId, x: pos.x, y: pos.y });
    } else {
      skippedCount++;
    }
  }

  const finalBuildings = [...currentBuildings, ...newlyPlaced];
  const warnings: string[] = [];

  if (skippedCount > 0) {
    warnings.push(
      `Không đủ chỗ trống để đặt ${skippedCount} công trình còn thiếu — hãy mở rộng khoảng trống hoặc thu nhỏ hình dạng tường đã vẽ.`
    );
  }

  if (newlyPlaced.length > 0) {
    const analysis = computeDeploymentAnalysis(finalBuildings);
    if (analysis.criticalHoleCount > 0) {
      warnings.push(
        `Cách sắp xếp này tạo ra ${analysis.criticalHoleCount} lỗ thả quân nguy hiểm gần Town Hall — hãy kiểm tra tab Phân tích phòng thủ để khắc phục.`
      );
    }
  }

  return {
    buildings: finalBuildings,
    placedCount: newlyPlaced.length,
    skippedCount,
    warnings,
  };
}
