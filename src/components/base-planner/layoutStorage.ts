import { getPresetLayout } from "./ExportUtils";
import type { LayoutProject, PlacedBuilding } from "./types";

const STORAGE_KEY_LAYOUTS = "coc-base-layouts-v2";
const STORAGE_KEY_ACTIVE_ID = "coc-base-active-layout-id";

/**
 * Generates a unique ID for layout projects
 */
function generateId(): string {
  return `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Retrieves all saved layout projects from localStorage
 */
export function getSavedLayouts(): LayoutProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAYOUTS);
    if (!raw) {
      // Initialize with default layouts if first time
      const initial = createDefaultInitialLayouts();
      localStorage.setItem(STORAGE_KEY_LAYOUTS, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to parse saved base layouts:", err);
  }
  return createDefaultInitialLayouts();
}

/**
 * Creates default layouts for TH11, TH14, TH16 if empty
 */
function createDefaultInitialLayouts(): LayoutProject[] {
  const now = new Date().toISOString();
  return [
    {
      id: "layout-th11-war",
      name: "TH11 - War Base Anti 3-Star",
      townHallLevel: 11,
      buildings: getPresetLayout(11),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "layout-th14-hybrid",
      name: "TH14 - Trophy & Farming Base",
      townHallLevel: 14,
      buildings: getPresetLayout(14),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "layout-th16-meta",
      name: "TH16 - CWL Anti E-Drag Base",
      townHallLevel: 16,
      buildings: getPresetLayout(16),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Saves all layouts to localStorage
 */
export function saveAllLayouts(layouts: LayoutProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAYOUTS, JSON.stringify(layouts));
  } catch (err) {
    console.error("Failed to save layouts to localStorage:", err);
  }
}

/**
 * Gets the active layout ID, or fallback to the first saved layout
 */
export function getActiveLayoutId(): string {
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  if (saved) return saved;
  const all = getSavedLayouts();
  return all[0]?.id || "layout-th11-war";
}

/**
 * Sets the active layout ID
 */
export function setActiveLayoutId(id: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
}

/**
 * Saves or updates a specific layout project in localStorage
 */
export function saveLayout(layout: LayoutProject): void {
  const all = getSavedLayouts();
  const index = all.findIndex((l) => l.id === layout.id);
  const updatedLayout: LayoutProject = {
    ...layout,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    all[index] = updatedLayout;
  } else {
    all.unshift(updatedLayout);
  }

  saveAllLayouts(all);
}

/**
 * Creates a new layout project
 */
export function createNewLayout(name: string, townHallLevel: number, usePreset = true): LayoutProject {
  const now = new Date().toISOString();
  const newLayout: LayoutProject = {
    id: generateId(),
    name: name.trim() || `Bố cục TH${townHallLevel}`,
    townHallLevel,
    buildings: usePreset ? getPresetLayout(townHallLevel) : [],
    createdAt: now,
    updatedAt: now,
  };

  const all = getSavedLayouts();
  all.unshift(newLayout);
  saveAllLayouts(all);
  setActiveLayoutId(newLayout.id);
  return newLayout;
}

/**
 * Duplicates an existing layout project
 */
export function duplicateLayout(layoutId: string): LayoutProject | null {
  const all = getSavedLayouts();
  const source = all.find((l) => l.id === layoutId);
  if (!source) return null;

  const now = new Date().toISOString();
  const cloned: LayoutProject = {
    ...source,
    id: generateId(),
    name: `${source.name} (Bản sao)`,
    buildings: JSON.parse(JSON.stringify(source.buildings)),
    createdAt: now,
    updatedAt: now,
  };

  all.unshift(cloned);
  saveAllLayouts(all);
  setActiveLayoutId(cloned.id);
  return cloned;
}

/**
 * Renames a layout project
 */
export function renameLayout(layoutId: string, newName: string): boolean {
  const all = getSavedLayouts();
  const target = all.find((l) => l.id === layoutId);
  if (!target) return false;

  target.name = newName.trim() || target.name;
  target.updatedAt = new Date().toISOString();
  saveAllLayouts(all);
  return true;
}

/**
 * Deletes a layout project
 */
export function deleteLayout(layoutId: string): { success: boolean; nextActiveId?: string } {
  let all = getSavedLayouts();
  if (all.length <= 1) {
    // Keep at least 1 layout
    return { success: false };
  }

  all = all.filter((l) => l.id !== layoutId);
  saveAllLayouts(all);

  const nextActive = all[0]?.id;
  if (nextActive) {
    setActiveLayoutId(nextActive);
  }

  return { success: true, nextActiveId: nextActive };
}

/**
 * Serializes and exports layout data to a JSON string
 */
export function serializeLayout(layout: LayoutProject): string {
  return JSON.stringify(
    {
      app: "ClashPath-BasePlanner",
      version: 2,
      exportedAt: new Date().toISOString(),
      layout,
    },
    null,
    2
  );
}

/**
 * Parses and imports layout data from a JSON file content
 */
export function parseImportedLayoutJSON(jsonContent: string): LayoutProject {
  const data = JSON.parse(jsonContent);

  // Handle version 2 format
  if (data.layout && Array.isArray(data.layout.buildings)) {
    const l = data.layout;
    return {
      id: generateId(),
      name: l.name || "Bố cục đã nhập",
      townHallLevel: Math.max(1, Math.min(18, Number(l.townHallLevel) || 11)),
      buildings: l.buildings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Handle version 1 format or raw layout array
  if (Array.isArray(data.buildings)) {
    return {
      id: generateId(),
      name: data.name || "Bố cục đã nhập",
      townHallLevel: Math.max(1, Math.min(18, Number(data.townHallLevel) || 11)),
      buildings: data.buildings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (Array.isArray(data)) {
    return {
      id: generateId(),
      name: "Bố cục đã nhập",
      townHallLevel: 11,
      buildings: data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  throw new Error("Định dạng file JSON không hợp lệ cho Base Planner.");
}
