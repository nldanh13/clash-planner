import type { PlacedBuilding } from "../types";
import { GRID_SIZE, BUILDINGS_BY_ID } from "../constants";
import { getTownHallCatalog, type TownHallBuildingEntry } from "../catalog";
import type { GeneratedBaseStats } from "./types";

export interface ValidationOutput {
  isValid: boolean;
  isComplete: boolean;
  errors: string[];
  warnings: string[];
  stats: GeneratedBaseStats;
}

export function validateGeneratedBase(
  buildings: PlacedBuilding[],
  townHallLevel: number
): ValidationOutput {
  const errors: string[] = [];
  const warnings: string[] = [];

  const catalog = getTownHallCatalog(townHallLevel);
  const catalogMap = new Map<string, TownHallBuildingEntry>();
  let requiredBuildings = 0;
  let requiredTraps = 0;
  let requiredWalls = 0;

  const categoryStats: Record<string, { placed: number; required: number }> = {
    defense: { placed: 0, required: 0 },
    resource: { placed: 0, required: 0 },
    army: { placed: 0, required: 0 },
    hero: { placed: 0, required: 0 },
    trap: { placed: 0, required: 0 },
    wall: { placed: 0, required: 0 },
  };

  for (const entry of catalog) {
    catalogMap.set(entry.buildingId, entry);
    if (entry.category === "wall") {
      requiredWalls += entry.count;
    } else if (entry.category === "trap") {
      requiredTraps += entry.count;
    } else {
      requiredBuildings += entry.count;
    }

    if (categoryStats[entry.category]) {
      categoryStats[entry.category].required += entry.count;
    }
  }

  const requiredTotal = requiredBuildings + requiredTraps + requiredWalls;

  if (!Array.isArray(buildings)) {
    errors.push("Dữ liệu layout không phải là danh sách hợp lệ.");
    return {
      isValid: false,
      isComplete: false,
      errors,
      warnings,
      stats: {
        buildingsCount: 0,
        trapsCount: 0,
        wallsCount: 0,
        totalPlaced: 0,
        requiredBuildings,
        requiredTraps,
        requiredWalls,
        requiredTotal,
        isComplete: false,
        isValid: false,
        byCategory: categoryStats,
      },
    };
  }

  // Check unique instanceIds, out-of-bounds, overlaps
  const seenIds = new Set<string>();
  const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const placedCounts: Record<string, number> = {};

  let placedBuildings = 0;
  let placedTraps = 0;
  let placedWalls = 0;

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (!b || typeof b !== "object") {
      errors.push(`Phần tử thứ ${i} không phải object hợp lệ.`);
      continue;
    }

    const { instanceId, buildingId, x, y } = b;

    // Instance ID
    if (!instanceId || typeof instanceId !== "string") {
      errors.push(`Vật thể ${buildingId} thiếu instanceId hợp lệ.`);
      continue;
    }
    if (seenIds.has(instanceId)) {
      errors.push(`Trùng lặp instanceId "${instanceId}" ở công trình ${buildingId}.`);
    }
    seenIds.add(instanceId);

    // Building type definition
    const def = BUILDINGS_BY_ID.get(buildingId);
    if (!def) {
      errors.push(`Không tìm thấy định nghĩa cho loại công trình "${buildingId}".`);
      continue;
    }

    const catalogEntry = catalogMap.get(buildingId);
    if (!catalogEntry) {
      errors.push(`Công trình "${def.name}" (${buildingId}) không được phép hoặc chưa mở khóa ở TH${townHallLevel}.`);
    }

    // Coordinates
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      Math.floor(x) !== x ||
      Math.floor(y) !== y
    ) {
      errors.push(`Tọa độ (${x}, ${y}) của ${def.name} không phải số nguyên hợp lệ.`);
      continue;
    }

    // Out of bounds
    if (x < 0 || y < 0 || x + def.width > GRID_SIZE || y + def.height > GRID_SIZE) {
      errors.push(
        `Công trình ${def.name} đặt tại (${x}, ${y}) kích thước ${def.width}x${def.height} vượt khỏi lưới ${GRID_SIZE}x${GRID_SIZE}.`
      );
      continue;
    }

    // Overlap checking
    let hasOverlap = false;
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const idx = (y + r) * GRID_SIZE + (x + c);
        if (grid[idx] !== 0) {
          hasOverlap = true;
        }
      }
    }

    if (hasOverlap) {
      errors.push(`Công trình ${def.name} tại (${x}, ${y}) bị chồng lấn lên vật thể khác.`);
    } else {
      for (let r = 0; r < def.height; r++) {
        for (let c = 0; c < def.width; c++) {
          grid[(y + r) * GRID_SIZE + (x + c)] = 1;
        }
      }
    }

    // Counting
    placedCounts[buildingId] = (placedCounts[buildingId] || 0) + 1;
    if (def.category === "wall") {
      placedWalls++;
    } else if (def.category === "trap") {
      placedTraps++;
    } else {
      placedBuildings++;
    }

    if (categoryStats[def.category]) {
      categoryStats[def.category].placed++;
    }
  }

  // Verify completeness against catalog limits
  let isComplete = true;

  for (const [buildingId, entry] of catalogMap.entries()) {
    const placed = placedCounts[buildingId] || 0;
    const required = entry.count;
    if (placed < required) {
      isComplete = false;
      errors.push(
        `Thiếu công trình: ${buildingId} mới đặt ${placed}/${required} (Town Hall ${townHallLevel}).`
      );
    } else if (placed > required) {
      isComplete = false;
      errors.push(
        `Thừa công trình: ${buildingId} đã đặt ${placed}/${required} (Town Hall ${townHallLevel}).`
      );
    }
  }

  // Check if any placed building is not in catalog
  for (const buildingId of Object.keys(placedCounts)) {
    if (!catalogMap.has(buildingId)) {
      isComplete = false;
      errors.push(`Công trình lạ không có trong danh mục TH${townHallLevel}: ${buildingId}.`);
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    isComplete: isComplete && isValid,
    errors,
    warnings,
    stats: {
      buildingsCount: placedBuildings,
      trapsCount: placedTraps,
      wallsCount: placedWalls,
      totalPlaced: buildings.length,
      requiredBuildings,
      requiredTraps,
      requiredWalls,
      requiredTotal,
      isComplete: isComplete && isValid,
      isValid,
      byCategory: categoryStats,
    },
  };
}
