/**
 * Bringing a layout's building set up to date with the current catalog
 * (adding newly-added required buildings/traps/walls it's missing). Split
 * out of layoutStorage.ts since it pulls in the placement-generator engine,
 * which the base storage CRUD functions never need.
 */
import type { LayoutProject } from "./types";
import { validateLayout, type ValidationIssue } from "./LayoutValidator";
import { computeLayoutStatus } from "./blueprintUtils";
import { CURRENT_CATALOG_VERSION, getTownHallCatalog, BUILDING_METADATA_MAP } from "./catalog";
import { PlacementEngine } from "./generator/placementEngine";
import { PRNG } from "./generator/prng";
import { getAllLayoutsRaw, saveAllLayouts } from "./layoutStorage";
import { createCheckpoint } from "./layoutCheckpoints";

/**
 * Updates a layout to CURRENT_CATALOG_VERSION:
 * 1. Creates checkpoint.
 * 2. Keeps existing valid buildings.
 * 3. Identifies missing buildings from the new Town Hall catalog and places them on free tiles.
 * 4. Runs strict validation.
 * 5. Returns updated layout and detailed report.
 */
export function updateLayoutToCurrentCatalog(layoutId: string): {
  updatedLayout: LayoutProject;
  report: {
    addedBuildings: string[];
    keptBuildings: number;
    issues: ValidationIssue[];
  };
} {
  const all = getAllLayoutsRaw();
  const layout = all.find((l) => l.id === layoutId);
  if (!layout) {
    throw new Error("Không tìm thấy bản thiết kế.");
  }

  // 1. Create checkpoint before catalog update
  createCheckpoint(layout.id, "Trước khi cập nhật catalog mới");

  const catalog = getTownHallCatalog(layout.townHallLevel);
  const currentBuildings = [...layout.buildings];

  // Count existing buildings
  const existingCounts = new Map<string, number>();
  for (const b of currentBuildings) {
    existingCounts.set(b.buildingId, (existingCounts.get(b.buildingId) || 0) + 1);
  }

  // Setup PlacementEngine with existing buildings
  const engine = new PlacementEngine(new PRNG(Date.now()));
  for (const b of currentBuildings) {
    const meta = BUILDING_METADATA_MAP[b.buildingId];
    const w = meta ? meta.width : 1;
    const h = meta ? meta.height : 1;
    engine.place(b.instanceId, b.buildingId, b.x, b.y, w, h);
  }

  const addedBuildings: string[] = [];
  let instanceCounter = currentBuildings.length + 1;

  for (const entry of catalog) {
    const currentCount = existingCounts.get(entry.buildingId) || 0;
    const missing = entry.count - currentCount;
    if (missing > 0) {
      for (let i = 0; i < missing; i++) {
        const freePos = engine.findNearestFree(22, 22, entry.width, entry.height);
        if (freePos) {
          const instId = `${entry.buildingId}_${instanceCounter++}`;
          engine.place(instId, entry.buildingId, freePos.x, freePos.y, entry.width, entry.height);
          currentBuildings.push({
            instanceId: instId,
            buildingId: entry.buildingId,
            x: freePos.x,
            y: freePos.y,
          });
          addedBuildings.push(entry.buildingId);
        }
      }
    }
  }

  // Validate sanitized layout
  const validation = validateLayout(currentBuildings, layout.townHallLevel);
  layout.buildings = validation.sanitizedBuildings;
  layout.catalogVersion = CURRENT_CATALOG_VERSION;
  layout.updatedAt = new Date().toISOString();
  layout.status = computeLayoutStatus(layout);

  saveAllLayouts(all);

  return {
    updatedLayout: layout,
    report: {
      addedBuildings,
      keptBuildings: currentBuildings.length - addedBuildings.length,
      issues: validation.issues,
    },
  };
}

/**
 * Automatically places missing buildings, traps, and walls for an incomplete/draft layout.
 * Always creates a checkpoint before adding objects to allow safe rollback.
 */
export function supplementMissingObjects(layoutId: string): {
  updatedLayout: LayoutProject;
  addedCount: number;
} {
  const { updatedLayout, report } = updateLayoutToCurrentCatalog(layoutId);
  return {
    updatedLayout,
    addedCount: report.addedBuildings.length,
  };
}
