import { getPresetLayout } from "./ExportUtils";
import type {
  LayoutProject,
  PlacedBuilding,
  BasePurpose,
  CreationMethod,
  LayoutStatus,
  LayoutCheckpoint,
  LayoutLibraryBundle,
} from "./types";
import { validateLayout, type ValidationIssue } from "./LayoutValidator";
import {
  computeLayoutStatus,
  generateDuplicateName,
  generateVariantName,
  isLayoutNameDuplicate,
  migrateSavedLayouts,
  normalizeLayoutName,
} from "./blueprintUtils";
import { CURRENT_CATALOG_VERSION, getTownHallCatalog, BUILDING_METADATA_MAP } from "./catalog";
import { PlacementEngine } from "./generator/placementEngine";
import { PRNG } from "./generator/prng";

export const STORAGE_KEY_LAYOUTS = "coc-base-layouts-v2";
export const STORAGE_KEY_ACTIVE_ID = "coc-base-active-layout-id";
export const STORAGE_KEY_BACKUP = "coc-base-layouts-backup-pre-migration";
export const STORAGE_KEY_CHECKPOINTS = "coc-base-layout-checkpoints";
export const STORAGE_KEY_VIEW_MODE = "coc-blueprint-view-mode";

export const TRASH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days auto-purge
export const MAX_CHECKPOINTS_PER_LAYOUT = 10;

/**
 * Safely writes to localStorage, trapping quota exceeded errors
 */
export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: unknown) {
    const e = err as { name?: string; code?: number };
    if (
      e?.name === "QuotaExceededError" ||
      e?.code === 22 ||
      e?.code === 1014
    ) {
      throw new Error(
        "Bộ nhớ trình duyệt (localStorage) đã đầy. Hãy dọn bớt bản thiết kế hoặc thùng rác."
      );
    }
    throw err;
  }
}

/**
 * Generates a unique ID for layout projects
 */
export function generateId(): string {
  return `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Purges trash items older than 30 days
 */
export function purgeExpiredTrash(layouts: LayoutProject[]): LayoutProject[] {
  const now = Date.now();
  return layouts.filter((l) => {
    if (!l.deletedAt) return true;
    const deletedTime = new Date(l.deletedAt).getTime();
    return now - deletedTime < TRASH_EXPIRY_MS;
  });
}

/**
 * Retrieves all raw layout projects (including trash) from localStorage,
 * running safe migration and auto-purging expired trash.
 */
export function getAllLayoutsRaw(): LayoutProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAYOUTS);
    if (!raw) {
      // First-ever visit: start from zero, no seeded example layouts.
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return [];
      }

      // Safe backup before migration if not yet created
      if (!localStorage.getItem(STORAGE_KEY_BACKUP)) {
        try {
          safeSetLocalStorage(STORAGE_KEY_BACKUP, raw);
        } catch {
          // Ignore quota error for backup
        }
      }

      // Run idempotent migration
      const migrated = migrateSavedLayouts(parsed);
      // Auto-purge items deleted > 30 days ago
      const purged = purgeExpiredTrash(migrated);

      const serialized = JSON.stringify(purged);
      if (serialized !== raw) {
        safeSetLocalStorage(STORAGE_KEY_LAYOUTS, serialized);
      }
      return purged;
    }
  } catch (err) {
    console.error("Failed to parse saved base layouts:", err);
  }

  return [];
}

/**
 * Retrieves active (non-deleted) layout projects from localStorage.
 */
export function getSavedLayouts(): LayoutProject[] {
  return getAllLayoutsRaw().filter((l) => !l.deletedAt);
}

/**
 * Retrieves soft-deleted layout projects currently in Trash.
 */
export function getTrashLayouts(): LayoutProject[] {
  return getAllLayoutsRaw().filter((l) => Boolean(l.deletedAt));
}

/**
 * Saves all layouts (active + trash) to localStorage safely
 */
export function saveAllLayouts(layouts: LayoutProject[]): void {
  safeSetLocalStorage(STORAGE_KEY_LAYOUTS, JSON.stringify(layouts));
}

/**
 * Gets the active layout ID, or fallbacks to the first non-deleted layout or null
 */
export function getActiveLayoutId(): string | null {
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  const activeList = getSavedLayouts();
  if (saved && activeList.some((l) => l.id === saved)) {
    return saved;
  }
  return activeList[0]?.id || null;
}

/**
 * Sets the active layout ID
 */
export function setActiveLayoutId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
  }
}

/**
 * Saves or updates a specific layout project in localStorage.
 * Updates in-place if exists, preserving ID and preventing duplicate records.
 */
export function saveLayout(layout: LayoutProject): LayoutProject {
  const { sanitizedBuildings } = validateLayout(layout.buildings, layout.townHallLevel);
  const all = getAllLayoutsRaw();
  const index = all.findIndex((l) => l.id === layout.id);

  const updatedLayout: LayoutProject = {
    ...layout,
    name: normalizeLayoutName(layout.name) || `Bố cục TH${layout.townHallLevel}`,
    catalogVersion: layout.catalogVersion || CURRENT_CATALOG_VERSION,
    buildings: sanitizedBuildings,
    updatedAt: new Date().toISOString(),
  };

  // Compute exact status from data & validation
  updatedLayout.status = computeLayoutStatus(updatedLayout);

  if (index >= 0) {
    all[index] = updatedLayout;
  } else {
    all.unshift(updatedLayout);
  }

  saveAllLayouts(all);
  return updatedLayout;
}

/**
 * Creates a new layout project, validates and stores it
 */
export function createNewLayout(params: {
  name: string;
  townHallLevel: number;
  purpose?: BasePurpose;
  creationMethod?: CreationMethod;
  status?: LayoutStatus;
  templateId?: string;
  pattern?: string;
  seed?: number | string;
  buildings?: PlacedBuilding[];
}): LayoutProject {
  const now = new Date().toISOString();
  const th = Math.max(1, Math.min(18, params.townHallLevel));
  const rawBuildings = params.buildings !== undefined ? params.buildings : getPresetLayout(th);
  const { sanitizedBuildings } = validateLayout(rawBuildings, th);

  const creationMethod = params.creationMethod || "template";

  const newLayout: LayoutProject = {
    id: generateId(),
    name: normalizeLayoutName(params.name) || `Bố cục TH${th}`,
    townHallLevel: th,
    purpose: params.purpose || "hybrid",
    creationMethod,
    templateId: params.templateId,
    pattern: params.pattern,
    seed: params.seed,
    buildings: sanitizedBuildings,
    catalogVersion: CURRENT_CATALOG_VERSION,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  };

  newLayout.status = computeLayoutStatus(newLayout);

  const all = getAllLayoutsRaw();
  all.unshift(newLayout);
  saveAllLayouts(all);
  setActiveLayoutId(newLayout.id);
  return newLayout;
}

/**
 * Duplicates an existing layout project with a new ID and non-colliding unique name:
 * "<Tên cũ> — Bản sao", "<Tên cũ> — Bản sao 2", etc.
 */
export function duplicateLayout(layoutId: string, targetTownHall?: number): LayoutProject | null {
  const all = getAllLayoutsRaw();
  const source = all.find((l) => l.id === layoutId);
  if (!source) return null;

  const now = new Date().toISOString();
  const newTH = targetTownHall ? Math.max(1, Math.min(18, targetTownHall)) : source.townHallLevel;

  // Sanitize buildings if cloning to a different TH
  const rawBuildings = JSON.parse(JSON.stringify(source.buildings));
  const { sanitizedBuildings } = validateLayout(rawBuildings, newTH);

  // Generate unique duplicate name: "<Tên> — Bản sao", "<Tên> — Bản sao 2"...
  let baseName = source.name;
  if (targetTownHall && targetTownHall !== source.townHallLevel) {
    baseName = baseName.replace(/\bTH\s*\d{1,2}\b/i, `TH${newTH}`);
  }
  const candidate = generateDuplicateName(baseName, all);

  const cloned: LayoutProject = {
    ...source,
    id: generateId(),
    name: candidate,
    townHallLevel: newTH,
    creationMethod: "copy",
    sourceLayoutId: source.id,
    catalogVersion: CURRENT_CATALOG_VERSION,
    isPinned: false,
    deletedAt: undefined,
    buildings: sanitizedBuildings,
    // Deep-cloned so editing the copy's decorations can never alias the source's array.
    decorations: source.decorations ? JSON.parse(JSON.stringify(source.decorations)) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  cloned.status = computeLayoutStatus(cloned);

  all.unshift(cloned);
  saveAllLayouts(all);
  setActiveLayoutId(cloned.id);
  return cloned;
}

/**
 * Creates a tactical variant of an existing layout project:
 * Retains TH & purpose, sets new seed, generates "<Tên> (Biến thể 01)", doesn't modify source.
 */
export function createVariantLayout(
  layoutId: string,
  options?: { customSeed?: number }
): LayoutProject | null {
  const all = getAllLayoutsRaw();
  const source = all.find((l) => l.id === layoutId);
  if (!source) return null;

  const now = new Date().toISOString();
  const newSeed = options?.customSeed ?? Math.floor(Math.random() * 1000000);
  const variantName = generateVariantName(source.name, all);

  const variant: LayoutProject = {
    ...source,
    id: generateId(),
    name: variantName,
    seed: newSeed,
    creationMethod: "copy",
    sourceLayoutId: source.id,
    catalogVersion: CURRENT_CATALOG_VERSION,
    isPinned: false,
    deletedAt: undefined,
    buildings: JSON.parse(JSON.stringify(source.buildings)),
    decorations: source.decorations ? JSON.parse(JSON.stringify(source.decorations)) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  variant.status = computeLayoutStatus(variant);

  all.unshift(variant);
  saveAllLayouts(all);
  setActiveLayoutId(variant.id);
  return variant;
}

/**
 * Renames a layout project with duplicate checking (excluding itself)
 */
export function renameLayout(
  layoutId: string,
  newName: string
): { success: boolean; error?: string } {
  const clean = normalizeLayoutName(newName);
  if (!clean) {
    return { success: false, error: "Tên bản thiết kế không được để trống." };
  }

  const all = getAllLayoutsRaw();
  const target = all.find((l) => l.id === layoutId);
  if (!target) {
    return { success: false, error: "Không tìm thấy bản thiết kế." };
  }

  if (isLayoutNameDuplicate(clean, all, layoutId)) {
    return { success: false, error: "Tên bản thiết kế đã tồn tại trong danh sách." };
  }

  target.name = clean;
  target.updatedAt = new Date().toISOString();
  saveAllLayouts(all);
  return { success: true };
}

/**
 * Toggles the pinned state of a layout
 */
export function togglePinLayout(layoutId: string): boolean {
  const all = getAllLayoutsRaw();
  const target = all.find((l) => l.id === layoutId);
  if (!target) return false;

  target.isPinned = !target.isPinned;
  target.updatedAt = new Date().toISOString();
  saveAllLayouts(all);
  return Boolean(target.isPinned);
}

/**
 * Moves a layout to Trash (soft delete).
 * If trashing the active layout, selects the next active layout or resets to null.
 */
export function moveToTrash(layoutId: string): { success: boolean; nextActiveId: string | null } {
  const all = getAllLayoutsRaw();
  const target = all.find((l) => l.id === layoutId);
  if (!target) {
    return { success: false, nextActiveId: getActiveLayoutId() };
  }

  target.deletedAt = new Date().toISOString();
  target.isPinned = false; // unpin when moving to trash
  saveAllLayouts(all);

  let nextActive = getActiveLayoutId();
  if (nextActive === layoutId) {
    const remainingActive = all.filter((l) => !l.deletedAt && l.id !== layoutId);
    nextActive = remainingActive[0]?.id || null;
    setActiveLayoutId(nextActive);
  }

  return { success: true, nextActiveId: nextActive };
}

/**
 * Alias for backward compatibility with deleteLayout:
 * Calls moveToTrash.
 */
export function deleteLayout(layoutId: string): { success: boolean; nextActiveId: string | null } {
  return moveToTrash(layoutId);
}

/**
 * Restores a layout from Trash
 */
export function restoreFromTrash(layoutId: string): boolean {
  const all = getAllLayoutsRaw();
  const target = all.find((l) => l.id === layoutId);
  if (!target || !target.deletedAt) return false;

  target.deletedAt = undefined;
  target.updatedAt = new Date().toISOString();
  saveAllLayouts(all);
  return true;
}

/**
 * Permanently removes a layout from storage
 */
export function permanentlyDeleteLayout(layoutId: string): void {
  let all = getAllLayoutsRaw();
  all = all.filter((l) => l.id !== layoutId);
  saveAllLayouts(all);

  // Clean up checkpoints for this layout
  try {
    const rawCheckpoints = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
    if (rawCheckpoints) {
      const parsed: Record<string, LayoutCheckpoint[]> = JSON.parse(rawCheckpoints);
      delete parsed[layoutId];
      safeSetLocalStorage(STORAGE_KEY_CHECKPOINTS, JSON.stringify(parsed));
    }
  } catch {
    // Ignore error
  }

  if (getActiveLayoutId() === layoutId) {
    const activeList = all.filter((l) => !l.deletedAt);
    setActiveLayoutId(activeList[0]?.id || null);
  }
}

/**
 * Empties all items currently in Trash
 */
export function emptyTrash(): void {
  const all = getAllLayoutsRaw().filter((l) => !l.deletedAt);
  saveAllLayouts(all);
}

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

/**
 * Serializes single layout data to JSON string
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
 * Exports entire non-trash blueprint library to JSON bundle
 */
export function exportLibraryJSON(): string {
  const activeLayouts = getSavedLayouts();
  const bundle: LayoutLibraryBundle = {
    app: "ClashPath-BasePlanner",
    version: 2,
    exportDate: new Date().toISOString(),
    catalogVersion: CURRENT_CATALOG_VERSION,
    layouts: activeLayouts,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Imports entire blueprint library from JSON bundle with schema verification & collision handling:
 * - collisionStrategy: "rename" | "overwrite" | "skip"
 * - Does not import credentials or sensitive data.
 * - Generates new IDs unless overwriting.
 */
export function importLibraryJSON(
  jsonContent: string,
  collisionStrategy: "rename" | "overwrite" | "skip" = "rename"
): {
  importedCount: number;
  overwrittenCount: number;
  skippedCount: number;
  errors: string[];
} {
  const parsed = JSON.parse(jsonContent);
  const errors: string[] = [];

  let layoutsToProcess: unknown[] = [];
  if (parsed.app === "ClashPath-BasePlanner" && Array.isArray(parsed.layouts)) {
    layoutsToProcess = parsed.layouts;
  } else if (Array.isArray(parsed)) {
    layoutsToProcess = parsed;
  } else if (parsed.layout) {
    layoutsToProcess = [parsed.layout];
  } else {
    throw new Error("Định dạng file JSON thư viện không hợp lệ.");
  }

  const all = getAllLayoutsRaw();
  let importedCount = 0;
  let overwrittenCount = 0;
  let skippedCount = 0;

  for (const rawItem of layoutsToProcess) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const item = rawItem as Record<string, unknown>;

    const th = Math.max(1, Math.min(18, Number(item.townHallLevel) || 11));
    const rawBuildings = Array.isArray(item.buildings) ? (item.buildings as PlacedBuilding[]) : [];
    const { sanitizedBuildings, issues } = validateLayout(rawBuildings, th);

    if (issues.some((i) => i.type === "critical")) {
      errors.push(`Bản "${item.name || "Không tên"}": chứa lỗi cấu trúc nghiêm trọng.`);
      continue;
    }

    const rawName = typeof item.name === "string" && item.name.trim() ? item.name.trim() : `TH${th} – Nhập`;
    const purpose = (typeof item.purpose === "string" ? item.purpose : "hybrid") as BasePurpose;
    const isDuplicate = isLayoutNameDuplicate(rawName, all);

    if (isDuplicate) {
      if (collisionStrategy === "skip") {
        skippedCount++;
        continue;
      }

      if (collisionStrategy === "overwrite") {
        const existingIdx = all.findIndex((l) => normalizeLayoutName(l.name) === normalizeLayoutName(rawName));
        if (existingIdx >= 0) {
          createCheckpoint(all[existingIdx].id, "Trước khi ghi đè qua Nhập thư viện");
          all[existingIdx] = {
            ...all[existingIdx],
            townHallLevel: th,
            purpose,
            buildings: sanitizedBuildings,
            catalogVersion: CURRENT_CATALOG_VERSION,
            updatedAt: new Date().toISOString(),
          };
          all[existingIdx].status = computeLayoutStatus(all[existingIdx]);
          overwrittenCount++;
          continue;
        }
      }
    }

    // "rename" strategy or brand new layout
    const finalName = isDuplicate ? generateDuplicateName(rawName, all) : rawName;
    const newProject: LayoutProject = {
      id: generateId(),
      name: finalName,
      townHallLevel: th,
      purpose,
      creationMethod: "copy",
      buildings: sanitizedBuildings,
      catalogVersion: CURRENT_CATALOG_VERSION,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    newProject.status = computeLayoutStatus(newProject);
    all.unshift(newProject);
    importedCount++;
  }

  saveAllLayouts(all);
  return { importedCount, overwrittenCount, skippedCount, errors };
}

/**
 * Parses and imports single layout data from a JSON file content,
 * assigning a clean, non-duplicate name and strictly validating.
 */
export function parseImportedLayoutJSON(jsonContent: string): LayoutProject {
  const data = JSON.parse(jsonContent);
  const now = new Date().toISOString();
  const all = getAllLayoutsRaw();

  let targetBuildings: PlacedBuilding[] = [];
  let name = "Bố cục đã nhập";
  let townHallLevel = 11;
  let purpose: BasePurpose = "hybrid";

  if (data.layout && Array.isArray(data.layout.buildings)) {
    const l = data.layout;
    name = typeof l.name === "string" && l.name.trim() ? l.name.trim() : "Bố cục đã nhập";
    townHallLevel = Math.max(1, Math.min(18, Number(l.townHallLevel) || 11));
    targetBuildings = l.buildings;
    if (l.purpose) purpose = l.purpose;
  } else if (Array.isArray(data.buildings)) {
    name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Bố cục đã nhập";
    townHallLevel = Math.max(1, Math.min(18, Number(data.townHallLevel) || 11));
    targetBuildings = data.buildings;
  } else if (Array.isArray(data)) {
    targetBuildings = data;
  } else {
    throw new Error("Định dạng file JSON không hợp lệ cho Base Planner.");
  }

  const { sanitizedBuildings, issues } = validateLayout(targetBuildings, townHallLevel);
  if (issues.some((i) => i.type === "critical")) {
    throw new Error(
      `File JSON có lỗi nghiêm trọng:\n${issues
        .filter((i) => i.type === "critical")
        .map((i) => i.message)
        .join("\n")}`
    );
  }

  // Ensure unique name: "<Tên> — Bản sao" or next
  const candidate = isLayoutNameDuplicate(name, all)
    ? generateDuplicateName(name, all)
    : normalizeLayoutName(name) || `TH${townHallLevel} – Nhập 01`;

  const importedProject: LayoutProject = {
    id: generateId(),
    name: candidate,
    townHallLevel,
    purpose,
    creationMethod: "copy",
    buildings: sanitizedBuildings,
    catalogVersion: CURRENT_CATALOG_VERSION,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  };

  importedProject.status = computeLayoutStatus(importedProject);
  return importedProject;
}
