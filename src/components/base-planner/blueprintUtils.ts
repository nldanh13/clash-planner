import type { BasePurpose, CreationMethod, LayoutProject, LayoutStatus, PlacedBuilding } from "./types";
import { validateLayout } from "./LayoutValidator";
import {
  BUILDING_METADATA_MAP,
  CURRENT_CATALOG_VERSION,
  getAllBuildingLimits,
  getTownHallRequirements,
} from "./catalog";

/**
 * Normalizes layout name by trimming whitespace and collapsing multiple inner spaces.
 */
export function normalizeLayoutName(name: string): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Normalizes name for loose equality comparison (collapsing whitespace, normalizing dashes, lowercase).
 */
export function normalizeForComparison(name: string): string {
  return normalizeLayoutName(name)
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

/**
 * Checks equality of two layout names using Vietnamese locale awareness,
 * case-insensitivity, and whitespace collapse.
 * Example: "TH11 – War Base", "th11 – war base", " TH11  –  War Base" are equal.
 */
export function areLayoutNamesEqual(a: string, b: string): boolean {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return normA.localeCompare(normB, "vi", { sensitivity: "accent" }) === 0;
}

/**
 * Friendly display labels for base purpose (primary Vietnamese labels per project standards)
 */
export const PURPOSE_LABELS: Record<BasePurpose, string> = {
  war: "Chiến tranh",
  trophy: "Đẩy cúp",
  farming: "Giữ tài nguyên",
  hybrid: "Cân bằng",
  progress: "Tiến độ",
  showcase: "Trang trí",
};

/**
 * Secondary English labels for purpose metadata or subtext
 */
export const PURPOSE_LABELS_EN: Record<BasePurpose, string> = {
  war: "War",
  trophy: "Trophy",
  farming: "Farming",
  hybrid: "Hybrid",
  progress: "Progress",
  showcase: "Showcase",
};

/**
 * Friendly display labels for layout statuses
 */
export const STATUS_LABELS: Record<LayoutStatus, string> = {
  valid: "Hợp lệ",
  draft: "Bản nháp",
  warning: "Cảnh báo",
  "needs-update": "Cần cập nhật",
  "data-error": "Lỗi dữ liệu",
};

/**
 * Checks whether candidateName already exists in existingLayouts (excluding optional excludeId).
 * NOTE: Empty candidate is NOT considered a duplicate. Empty validation is handled separately.
 */
export function isLayoutNameDuplicate(
  candidateName: string,
  existingLayouts: LayoutProject[],
  excludeId?: string
): boolean {
  const normalizedCandidate = normalizeLayoutName(candidateName);
  if (!normalizedCandidate) return false;
  return existingLayouts.some(
    (l) => l.id !== excludeId && areLayoutNamesEqual(l.name, normalizedCandidate)
  );
}

/**
 * Town Halls that have verified, fully structured base presets available.
 * TH1-TH8 do not have complete official presets and should be disabled in template selection.
 */
export const SUPPORTED_PRESET_TOWNHALLS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export function hasPresetForTownHall(townHallLevel: number): boolean {
  return SUPPORTED_PRESET_TOWNHALLS.includes(townHallLevel);
}

/**
 * Friendly display labels for creation methods
 */
export const METHOD_LABELS: Record<CreationMethod, string> = {
  auto: "Tự động",
  template: "Bố cục mẫu",
  blank: "Bản đồ trống",
  copy: "Bản sao",
  import: "Nhập",
};

/**
 * Concise tags used for auto-naming blueprints: "TH<level> – <Mục đích> – <Cách tạo> <Số thứ tự 2 chữ số>"
 * e.g. "Tự động", "Mẫu", "Trống"
 */
export const METHOD_NAME_TAGS: Record<CreationMethod, string> = {
  auto: "Tự động",
  template: "Mẫu",
  blank: "Trống",
  copy: "Bản sao",
  import: "Nhập",
};

export interface LayoutPlacementStats {
  validBuildings: PlacedBuilding[];
  placedCount: number;
  requiredTotal: number;
  requiredBuildings: number;
  requiredTraps: number;
  requiredWalls: number;
  missingCount: number;
  placedPercentage: number;
  invalidCount: number;
  isComplete: boolean;
}

/**
 * Accurately calculates placed count and required totals from actual valid objects on the map.
 * Strictly excludes:
 * - Duplicate instance IDs
 * - Objects out of 44x44 bounds
 * - Objects not in Town Hall catalog
 * - Objects exceeding building limit
 * - Corrupted / NaN coordinates
 */
export function getLayoutPlacementStats(
  layout: { buildings?: PlacedBuilding[]; townHallLevel?: number } | null | undefined
): LayoutPlacementStats {
  const th = Math.max(1, Math.min(18, Math.trunc(layout?.townHallLevel || 11)));
  const reqs = getTownHallRequirements(th);
  const limits = getAllBuildingLimits(th);

  if (!layout || !Array.isArray(layout.buildings)) {
    return {
      validBuildings: [],
      placedCount: 0,
      requiredTotal: reqs.total,
      requiredBuildings: reqs.buildings,
      requiredTraps: reqs.traps,
      requiredWalls: reqs.walls,
      missingCount: reqs.total,
      placedPercentage: 0,
      invalidCount: 0,
      isComplete: false,
    };
  }

  const seenInstanceIds = new Set<string>();
  const buildingCounts: Record<string, number> = {};
  const validBuildings: PlacedBuilding[] = [];
  let invalidCount = 0;

  for (const b of layout.buildings) {
    if (
      !b ||
      typeof b.buildingId !== "string" ||
      typeof b.x !== "number" ||
      typeof b.y !== "number" ||
      isNaN(b.x) ||
      isNaN(b.y)
    ) {
      invalidCount++;
      continue;
    }

    // Check duplicate instanceId
    if (b.instanceId) {
      if (seenInstanceIds.has(b.instanceId)) {
        invalidCount++;
        continue;
      }
      seenInstanceIds.add(b.instanceId);
    }

    // Check building exists in catalog
    const meta = BUILDING_METADATA_MAP[b.buildingId];
    const maxLimit = limits[b.buildingId] || 0;
    if (!meta || maxLimit <= 0) {
      invalidCount++;
      continue;
    }

    // Check within 44x44 bounds
    const w = meta.width;
    const h = meta.height;
    if (b.x < 0 || b.y < 0 || b.x + w > 44 || b.y + h > 44) {
      invalidCount++;
      continue;
    }

    // Check limit not exceeded
    const currentCount = buildingCounts[b.buildingId] || 0;
    if (currentCount >= maxLimit) {
      invalidCount++;
      continue;
    }

    buildingCounts[b.buildingId] = currentCount + 1;
    validBuildings.push(b);
  }

  const placedCount = validBuildings.length;
  const missingCount = Math.max(0, reqs.total - placedCount);
  const placedPercentage = reqs.total > 0 ? Math.min(100, Math.round((placedCount / reqs.total) * 100)) : 0;
  const isComplete = placedCount === reqs.total && invalidCount === 0;

  return {
    validBuildings,
    placedCount,
    requiredTotal: reqs.total,
    requiredBuildings: reqs.buildings,
    requiredTraps: reqs.traps,
    requiredWalls: reqs.walls,
    missingCount,
    placedPercentage,
    invalidCount,
    isComplete,
  };
}

/**
 * Formats timestamps into natural, user-friendly Vietnamese text:
 * - "Vừa cập nhật"
 * - "5 phút trước"
 * - "Hôm qua, 12:28"
 * - "03/09/2026, 12:28"
 */
export function formatRelativeUpdateTime(dateInput: string | number | Date | undefined | null): string {
  if (!dateInput) return "Chưa xác định";
  const d = new Date(dateInput);
  const time = d.getTime();
  if (isNaN(time)) return "Chưa xác định";

  const now = Date.now();
  const diffMs = now - time;

  if (diffMs < 60 * 1000) {
    return "Vừa cập nhật";
  }
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const nowDate = new Date();
    if (nowDate.getDate() === d.getDate() && nowDate.getMonth() === d.getMonth() && nowDate.getFullYear() === d.getFullYear()) {
      return `${diffHours} giờ trước`;
    }
  }

  const nowMidnight = new Date();
  nowMidnight.setHours(0, 0, 0, 0);
  const yesterdayMidnight = new Date(nowMidnight.getTime() - 24 * 60 * 60 * 1000);
  const targetMidnight = new Date(d);
  targetMidnight.setHours(0, 0, 0, 0);

  const hoursStr = String(d.getHours()).padStart(2, "0");
  const minsStr = String(d.getMinutes()).padStart(2, "0");

  if (targetMidnight.getTime() === yesterdayMidnight.getTime()) {
    return `Hôm qua, ${hoursStr}:${minsStr}`;
  }

  const dayStr = String(d.getDate()).padStart(2, "0");
  const monthStr = String(d.getMonth() + 1).padStart(2, "0");
  const yearStr = d.getFullYear();

  return `${dayStr}/${monthStr}/${yearStr}, ${hoursStr}:${minsStr}`;
}

/**
 * Determines whether a name is an overly generic default placeholder
 * such as "TH15", "Untitled", "Bản thiết kế mới"
 */
export function isGenericDefaultName(name: string): boolean {
  const norm = normalizeLayoutName(name).toLowerCase();
  if (!norm) return true;
  if (/^th\s*\d{1,2}$/i.test(norm)) return true;
  if (
    norm === "untitled" ||
    norm === "bản thiết kế mới" ||
    norm === "new layout" ||
    norm === "bản thiết kế" ||
    norm === "bản đồ mới" ||
    norm === "imported base" ||
    norm === "bản sao"
  ) {
    return true;
  }
  return false;
}

/**
 * Generates duplicate name per specification:
 * "<Tên cũ> — Bản sao"
 * If already exists: "<Tên cũ> — Bản sao 2", "Bản sao 3"...
 */
export function generateDuplicateName(
  sourceName: string,
  existingLayouts: LayoutProject[],
  excludeId?: string
): string {
  const trimmed = normalizeLayoutName(sourceName);
  let base = trimmed;
  // Match any existing copy pattern like " — Bản sao" or " — Bản sao 2"
  const copyMatch = base.match(/^(.*?)(?:\s*[—–-]\s*Bản sao(?:\s*(\d+))?)$/i);
  if (copyMatch) {
    base = copyMatch[1].trim();
  }

  const candidateFirst = `${base} — Bản sao`;
  if (!isLayoutNameDuplicate(candidateFirst, existingLayouts, excludeId)) {
    return candidateFirst;
  }

  let counter = 2;
  while (counter <= 999) {
    const candidateNext = `${base} — Bản sao ${counter}`;
    if (!isLayoutNameDuplicate(candidateNext, existingLayouts, excludeId)) {
      return candidateNext;
    }
    counter++;
  }
  return `${base} — Bản sao ${Date.now()}`;
}

/**
 * Generates variant name per specification:
 * "<Tên gốc> (Biến thể 01)", "(Biến thể 02)"...
 */
export function generateVariantName(
  sourceName: string,
  existingLayouts: LayoutProject[],
  excludeId?: string
): string {
  const trimmed = normalizeLayoutName(sourceName);
  let base = trimmed;
  const variantMatch = base.match(/^(.*?)(?:\s*[—–-]\s*Biến thể(?:\s*(\d+))?|\s*\(Biến thể(?:\s*(\d+))?\))$/i);
  if (variantMatch) {
    base = variantMatch[1].trim();
  }

  let counter = 1;
  while (counter <= 999) {
    const pad = String(counter).padStart(2, "0");
    const candidate = `${base} (Biến thể ${pad})`;
    if (!isLayoutNameDuplicate(candidate, existingLayouts, excludeId)) {
      return candidate;
    }
    counter++;
  }
  return `${base} (Biến thể ${Date.now()})`;
}

/**
 * Computes exact layout status from data and validation rules.
 * Rules:
 * - "data-error": data corrupted, missing buildings array, or invalid coordinates.
 * - "needs-update": catalogVersion differs from CURRENT_CATALOG_VERSION.
 * - "draft": not all required buildings placed.
 * - "warning": all placed, but tactical or soft validation issues present.
 * - "valid": all placed, zero errors/warnings, current catalog.
 */
export function computeLayoutStatus(layout: LayoutProject): LayoutStatus {
  if (!layout || !Array.isArray(layout.buildings)) {
    return "data-error";
  }

  const stats = getLayoutPlacementStats(layout);

  if (stats.invalidCount > 0) {
    return "data-error";
  }

  if (layout.catalogVersion && layout.catalogVersion !== CURRENT_CATALOG_VERSION) {
    return "needs-update";
  }

  if (stats.placedCount < stats.requiredTotal) {
    return "draft";
  }

  const validation = validateLayout(stats.validBuildings, layout.townHallLevel);
  if (!validation.isValid || validation.issues.length > 0) {
    const hasCritical = validation.issues.some((i) => i.type === "critical");
    if (hasCritical) {
      return "data-error";
    }
    return "warning";
  }

  return "valid";
}

/**
 * Friendly Vietnamese labels for aesthetic patterns
 */
export const PATTERN_LABELS: Record<string, string> = {
  "symmetric-axial": "Đối xứng",
  diamond: "Kim cương",
  shield: "Khiên",
  heart: "Trái tim",
  spiral: "Xoắn ốc",
  crest: "Vương miện",
  radial: "Tỏa tròn",
  letter: "Chữ cái",
};

/**
 * Generates an auto-incremented, non-duplicate blueprint name according to standard patterns:
 * - TH15 – Farming – Tự động 01
 * - TH11 – War – Tự động 02
 * - TH14 – Trophy – Mẫu 01
 * - TH15 – Progress – Đối xứng 01
 */
export function generateUniqueBlueprintName(
  arg1:
    | {
        townHallLevel: number;
        purpose: BasePurpose;
        method: CreationMethod;
        pattern?: string;
      }
    | number,
  arg2: LayoutProject[] | BasePurpose,
  arg3?: string | CreationMethod,
  arg4?: LayoutProject[],
  arg5?: string
): string {
  let townHallLevel: number;
  let purpose: BasePurpose;
  let method: CreationMethod;
  let pattern: string | undefined;
  let existingLayouts: LayoutProject[];
  let excludeId: string | undefined;

  if (typeof arg1 === "object" && arg1 !== null) {
    townHallLevel = arg1.townHallLevel;
    purpose = arg1.purpose;
    method = arg1.method;
    pattern = arg1.pattern;
    existingLayouts = Array.isArray(arg2) ? arg2 : [];
    excludeId = typeof arg3 === "string" ? arg3 : undefined;
  } else {
    townHallLevel = arg1;
    purpose = arg2 as BasePurpose;
    method = arg3 as CreationMethod;
    existingLayouts = Array.isArray(arg4) ? arg4 : [];
    pattern = arg5;
  }

  const th = Math.max(1, Math.min(18, townHallLevel));
  const purposeLabel = PURPOSE_LABELS[purpose] || "Hybrid";

  let modifierLabel = METHOD_NAME_TAGS[method] || "Tự động";
  if (pattern && PATTERN_LABELS[pattern]) {
    modifierLabel = PATTERN_LABELS[pattern];
  } else if (pattern) {
    modifierLabel = pattern;
  }

  let counter = 1;
  while (counter <= 999) {
    const counterStr = String(counter).padStart(2, "0");
    const candidate = `TH${th} – ${purposeLabel} – ${modifierLabel} ${counterStr}`;
    if (!isLayoutNameDuplicate(candidate, existingLayouts, excludeId)) {
      return candidate;
    }
    counter++;
  }

  return `TH${th} – ${purposeLabel} – ${Date.now()}`;
}

/**
 * Infers base purpose from name or existing metadata
 */
export function inferPurpose(name: string, currentPurpose?: unknown): BasePurpose {
  if (
    currentPurpose === "war" ||
    currentPurpose === "trophy" ||
    currentPurpose === "farming" ||
    currentPurpose === "hybrid" ||
    currentPurpose === "progress" ||
    currentPurpose === "showcase"
  ) {
    return currentPurpose;
  }

  const lower = (name || "").toLowerCase();
  if (lower.includes("war") || lower.includes("cwl") || lower.includes("chống 3") || lower.includes("anti")) {
    return "war";
  }
  if (lower.includes("trophy") || lower.includes("cúp") || lower.includes("push")) {
    return "trophy";
  }
  if (lower.includes("farm") || lower.includes("loot") || lower.includes("tài nguyên")) {
    return "farming";
  }
  if (lower.includes("progress") || lower.includes("nâng cấp")) {
    return "progress";
  }
  if (lower.includes("showcase") || lower.includes("art") || lower.includes("trang trí") || lower.includes("kim cương") || lower.includes("trái tim")) {
    return "showcase";
  }

  return "hybrid";
}

/**
 * Infers creation method from name or existing metadata
 */
export function inferCreationMethod(name: string, currentMethod?: unknown): CreationMethod {
  if (
    currentMethod === "auto" ||
    currentMethod === "template" ||
    currentMethod === "blank" ||
    currentMethod === "import"
  ) {
    return currentMethod;
  }

  const lower = (name || "").toLowerCase();
  if (lower.includes("tự động") || lower.includes("auto")) {
    return "auto";
  }
  if (lower.includes("nhập") || lower.includes("import")) {
    return "import";
  }
  if (lower.includes("trống") || lower.includes("blank")) {
    return "blank";
  }

  return "template";
}

/**
 * Validates and fixes layout name so that it doesn't state a mismatched TH
 * (e.g. name says "TH11" but metadata is TH15).
 * If there's a mismatch, update the TH prefix in the name.
 */
export function alignNameWithTownHall(name: string, actualTH: number): string {
  const norm = normalizeLayoutName(name);
  if (!norm) return `TH${actualTH} – Bản thiết kế`;

  // Check if name has a TH prefix like "TH11" or "TH 11"
  const thMatch = norm.match(/\bTH\s*(\d{1,2})\b/i);
  if (thMatch) {
    const namedTH = parseInt(thMatch[1], 10);
    if (namedTH !== actualTH && namedTH >= 1 && namedTH <= 18) {
      // Replace mismatched TH number with actualTH
      return norm.replace(/\bTH\s*\d{1,2}\b/i, `TH${actualTH}`);
    }
  }

  return norm;
}

/**
 * Migrates old or untyped saved layout projects into strictly typed LayoutProject records.
 * 
 * Rules:
 * 1. Safe & Non-destructive: does not drop existing layouts.
 * 2. Source of truth for Town Hall is layout.townHallLevel (1-18), never parsed from name.
 * 3. Fixes name if it mentions a conflicting TH number.
 * 4. Fills missing purpose and creationMethod.
 * 5. Resolves duplicate names with incremental suffixes (02, 03...).
 * 6. Validates buildings strictly.
 * 7. IDEMPOTENT: running this function multiple times produces the exact same output.
 */
export function migrateSavedLayouts(rawList: unknown[]): LayoutProject[] {
  if (!Array.isArray(rawList)) return [];

  const now = new Date().toISOString();
  const assignedLayouts: LayoutProject[] = [];

  for (let idx = 0; idx < rawList.length; idx++) {
    const raw = rawList[idx];
    if (!raw || typeof raw !== "object") continue;

    const r = raw as Record<string, unknown>;

    // 1. Determine stable ID
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : `layout-${Date.now()}-${idx}`;

    // 2. Determine actual Town Hall level
    let th = 11;
    if (typeof r.townHallLevel === "number" && !isNaN(r.townHallLevel)) {
      th = Math.max(1, Math.min(18, Math.trunc(r.townHallLevel)));
    } else if (typeof r.townHall === "number" && !isNaN(r.townHall)) {
      th = Math.max(1, Math.min(18, Math.trunc(r.townHall)));
    }

    // 3. Buildings sanitization
    const rawBuildings = Array.isArray(r.buildings) ? r.buildings : [];
    const validation = validateLayout(rawBuildings, th);
    const validBuildings: PlacedBuilding[] = validation.sanitizedBuildings;

    // 4. Metadata: purpose & creationMethod
    const rawName = typeof r.name === "string" ? r.name : "";
    const purpose = inferPurpose(rawName, r.purpose);
    const creationMethod = inferCreationMethod(rawName, r.creationMethod);

    // 5. Align name: Only rename if name is empty or an overly generic default like "TH15", "Untitled"
    let baseName: string;
    if (isGenericDefaultName(rawName)) {
      baseName = generateUniqueBlueprintName(
        { townHallLevel: th, purpose, method: creationMethod },
        assignedLayouts,
        id
      );
    } else {
      baseName = alignNameWithTownHall(rawName, th);
    }

    // 6. Ensure uniqueness in assigned list
    let finalName = baseName;
    let duplicateCounter = 2;
    while (isLayoutNameDuplicate(finalName, assignedLayouts, id)) {
      const pad = String(duplicateCounter).padStart(2, "0");
      if (/\b\d{2}$/.test(baseName)) {
        finalName = baseName.replace(/\b\d{2}$/, pad);
      } else {
        finalName = `${baseName} ${pad}`;
      }
      duplicateCounter++;
    }

    const createdAt = typeof r.createdAt === "string" && r.createdAt ? r.createdAt : now;
    const updatedAt = typeof r.updatedAt === "string" && r.updatedAt ? r.updatedAt : now;

    const projectWithoutStatus: Omit<LayoutProject, "status"> = {
      id,
      name: finalName,
      townHallLevel: th,
      purpose,
      creationMethod,
      templateId: typeof r.templateId === "string" ? r.templateId : undefined,
      pattern: typeof r.pattern === "string" ? r.pattern : undefined,
      seed: typeof r.seed === "string" || typeof r.seed === "number" ? String(r.seed) : undefined,
      buildings: validBuildings,
      createdAt,
      updatedAt,
      catalogVersion: typeof r.catalogVersion === "string" && r.catalogVersion ? r.catalogVersion : CURRENT_CATALOG_VERSION,
      isPinned: Boolean(r.isPinned),
      deletedAt: typeof r.deletedAt === "string" ? r.deletedAt : undefined,
      sourceLayoutId: typeof r.sourceLayoutId === "string" ? r.sourceLayoutId : undefined,
    };

    const project: LayoutProject = {
      ...projectWithoutStatus,
      status: computeLayoutStatus(projectWithoutStatus as LayoutProject),
    };

    assignedLayouts.push(project);
  }

  return assignedLayouts;
}
