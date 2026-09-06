/**
 * Serializing layouts to/from JSON — single-layout export/import and the
 * whole-library bundle import/export used by the Blueprint Manager's
 * import/export UI. Split out of layoutStorage.ts since this is a distinct
 * concern (file format + collision handling) from the base CRUD it builds on.
 */
import type { LayoutProject, PlacedBuilding, BasePurpose, LayoutLibraryBundle } from "./types";
import { validateLayout } from "./LayoutValidator";
import {
  computeLayoutStatus,
  generateDuplicateName,
  isLayoutNameDuplicate,
  normalizeLayoutName,
} from "./blueprintUtils";
import { CURRENT_CATALOG_VERSION } from "./catalog";
import { generateId, getAllLayoutsRaw, getSavedLayouts, saveAllLayouts } from "./layoutStorage";
import { createCheckpoint } from "./layoutCheckpoints";

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
