/**
 * Layout checkpoints: automatic recovery snapshots taken before a risky bulk
 * operation (catalog migration, library import overwrite, manual checkpoint
 * restore) so a user can roll back if the result isn't what they wanted.
 * Split out of layoutStorage.ts, which also owns getAllLayoutsRaw/
 * saveAllLayouts/safeSetLocalStorage that these functions build on.
 */
import {
  safeSetLocalStorage,
  getAllLayoutsRaw,
  saveAllLayouts,
  STORAGE_KEY_CHECKPOINTS,
  MAX_CHECKPOINTS_PER_LAYOUT,
} from "./layoutStorage";
import type { LayoutProject, PlacedBuilding, LayoutCheckpoint } from "./types";
import { computeLayoutStatus } from "./blueprintUtils";
import { CURRENT_CATALOG_VERSION } from "./catalog";

/**
 * Checkpoint Management:
 * Creates a checkpoint for a layout (max 10 checkpoints preserved per layout)
 */
export function createCheckpoint(
  layoutId: string,
  reason: string,
  customBuildings?: PlacedBuilding[]
): LayoutCheckpoint | null {
  const all = getAllLayoutsRaw();
  const layout = all.find((l) => l.id === layoutId);
  if (!layout) return null;

  const checkpoint: LayoutCheckpoint = {
    id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    layoutId,
    timestamp: new Date().toISOString(),
    reason,
    buildings: JSON.parse(JSON.stringify(customBuildings || layout.buildings)),
    catalogVersion: layout.catalogVersion || CURRENT_CATALOG_VERSION,
    townHallLevel: layout.townHallLevel,
  };

  try {
    let store: Record<string, LayoutCheckpoint[]> = {};
    const raw = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
    if (raw) {
      store = JSON.parse(raw);
    }
    const list = store[layoutId] || [];
    list.unshift(checkpoint);
    // Keep maximum 10 checkpoints
    store[layoutId] = list.slice(0, MAX_CHECKPOINTS_PER_LAYOUT);
    safeSetLocalStorage(STORAGE_KEY_CHECKPOINTS, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to save layout checkpoint:", err);
  }

  return checkpoint;
}

/**
 * Retrieves all saved checkpoints for a layout
 */
export function getCheckpoints(layoutId: string): LayoutCheckpoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
    if (!raw) return [];
    const store: Record<string, LayoutCheckpoint[]> = JSON.parse(raw);
    return store[layoutId] || [];
  } catch {
    return [];
  }
}

/**
 * Restores a layout from a checkpoint, creating a recovery checkpoint beforehand
 */
export function restoreCheckpoint(checkpointId: string): LayoutProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
    if (!raw) return null;
    const store: Record<string, LayoutCheckpoint[]> = JSON.parse(raw);

    let targetCheckpoint: LayoutCheckpoint | null = null;
    for (const list of Object.values(store)) {
      const found = list.find((c) => c.id === checkpointId);
      if (found) {
        targetCheckpoint = found;
        break;
      }
    }
    if (!targetCheckpoint) return null;

    const all = getAllLayoutsRaw();
    const layout = all.find((l) => l.id === targetCheckpoint!.layoutId);
    if (!layout) return null;

    // Save automatic checkpoint before rollback
    createCheckpoint(layout.id, "Trước khi khôi phục checkpoint");

    layout.buildings = JSON.parse(JSON.stringify(targetCheckpoint.buildings));
    layout.catalogVersion = targetCheckpoint.catalogVersion;
    layout.updatedAt = new Date().toISOString();
    layout.status = computeLayoutStatus(layout);

    saveAllLayouts(all);
    return layout;
  } catch (err) {
    console.error("Failed to restore checkpoint:", err);
    return null;
  }
}
