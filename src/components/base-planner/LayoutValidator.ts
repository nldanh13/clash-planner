import { BasePurpose, PlacedBuilding } from "./types";
import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import { getAllBuildingLimits } from "./buildingLimits";
import { computeDeploymentAnalysis } from "./deploymentZones";
import { getDeploymentWarnings } from "./deploymentRisk";

export type ValidationIssueType = "critical" | "warning";

export interface ValidationIssue {
  type: ValidationIssueType;
  message: string;
  instanceId?: string;
}

export interface ValidationResult {
  isValid: boolean; // True only if there are NO critical issues
  validBuildings: PlacedBuilding[]; // Best-effort array of structurally valid buildings (no overlaps, no out-of-bounds)
  sanitizedBuildings: PlacedBuilding[]; // Strictly valid buildings (also respects TH limits and unlocks)
  issues: ValidationIssue[];
  hasCriticals: boolean;
  hasWarnings: boolean;
}

/**
 * Structural validation always runs (overlaps, bounds, counts, duplicate IDs,
 * missing Town Hall — anything that must block saving). Strategic (Deployment
 * Zone) validation is opt-in via `purpose`: it never flips isValid to false —
 * internal holes/corridors are reported as non-blocking warnings so a layout
 * with a deployment hole can still be saved, just not labelled "ready"/"optimal".
 */
export function validateLayout(buildings: unknown, thLevel: number, purpose?: BasePurpose): ValidationResult {
  const issues: ValidationIssue[] = [];
  const validBuildings: PlacedBuilding[] = [];
  const sanitizedBuildings: PlacedBuilding[] = [];
  
  if (!Array.isArray(buildings)) {
    issues.push({ type: "critical", message: "Dữ liệu layout không phải là một mảng hợp lệ." });
    return { isValid: false, validBuildings: [], sanitizedBuildings: [], issues, hasCriticals: true, hasWarnings: false };
  }

  if (buildings.length > 500) {
    issues.push({ type: "critical", message: `Số lượng công trình quá lớn (${buildings.length}), vượt giới hạn 500.` });
    return { isValid: false, validBuildings: [], sanitizedBuildings: [], issues, hasCriticals: true, hasWarnings: false };
  }

  const limits = getAllBuildingLimits(thLevel);
  const currentCounts: Record<string, number> = {};
  const seenInstanceIds = new Set<string>();
  const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (!b || typeof b !== "object") {
      issues.push({ type: "critical", message: `Phần tử thứ ${i + 1} không hợp lệ.` });
      continue;
    }

    const { instanceId, buildingId, x, y } = b as Record<string, unknown>;
    if (typeof instanceId !== "string" || !instanceId) {
      issues.push({ type: "critical", message: `Phần tử thứ ${i + 1} thiếu hoặc sai định dạng instanceId.` });
      continue;
    }
    if (seenInstanceIds.has(instanceId)) {
      issues.push({ type: "critical", instanceId, message: `Trùng lặp mã công trình (instanceId: ${instanceId}).` });
      continue;
    }
    seenInstanceIds.add(instanceId);

    if (typeof buildingId !== "string" || !BUILDINGS_BY_ID.has(buildingId)) {
      issues.push({ type: "critical", instanceId, message: `Loại công trình không tồn tại: ${buildingId}.` });
      continue;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.floor(Number(x)) !== x || Math.floor(Number(y)) !== y) {
      issues.push({ type: "critical", instanceId, message: `Tọa độ x, y không hợp lệ ở công trình ${buildingId}.` });
      continue;
    }

    const def = BUILDINGS_BY_ID.get(buildingId)!;
    const numX = Number(x);
    const numY = Number(y);

    if (numX < 0 || numY < 0 || numX + def.width > GRID_SIZE || numY + def.height > GRID_SIZE) {
      issues.push({ type: "critical", instanceId, message: `Công trình ${def.name} (${buildingId}) vượt ra ngoài lưới ${GRID_SIZE}x${GRID_SIZE}.` });
      continue;
    }

    let overlap = false;
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const idx = (numY + r) * GRID_SIZE + (numX + c);
        if (grid[idx] !== 0) {
          overlap = true;
        }
      }
    }

    if (overlap) {
      issues.push({ type: "critical", instanceId, message: `Công trình ${def.name} bị chồng lấn với công trình khác.` });
      continue;
    }

    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const idx = (numY + r) * GRID_SIZE + (numX + c);
        grid[idx] = 1;
      }
    }

    const limit = limits[buildingId] || 0;
    const currentCount = currentCounts[buildingId] || 0;
    
    const validBuilding: PlacedBuilding = {
      instanceId,
      buildingId,
      x: numX,
      y: numY,
      level: typeof (b as any).level === "number" ? (b as any).level : undefined
    };

    validBuildings.push(validBuilding);

    if (limit === 0) {
      issues.push({ type: "warning", instanceId, message: `Công trình ${def.name} chưa được mở khóa ở TH${thLevel}.` });
    } else if (currentCount >= limit) {
      issues.push({ type: "warning", instanceId, message: `Công trình ${def.name} vượt quá giới hạn số lượng ở TH${thLevel} (Tối đa: ${limit}).` });
    } else {
      sanitizedBuildings.push(validBuilding);
      currentCounts[buildingId] = currentCount + 1;
    }
  }

  // --- Strategic (Deployment Zone) validation: warnings only, never blocks saving ---
  if (purpose) {
    const analysis = computeDeploymentAnalysis(validBuildings);
    const deploymentWarnings = getDeploymentWarnings(analysis, validBuildings, purpose);
    for (const w of deploymentWarnings) {
      issues.push({ type: "warning", message: `${w.title}: ${w.message}` });
    }
  }

  const hasCriticals = issues.some(i => i.type === "critical");
  const hasWarnings = issues.some(i => i.type === "warning");

  return {
    isValid: !hasCriticals,
    validBuildings,
    sanitizedBuildings,
    issues,
    hasCriticals,
    hasWarnings
  };
}
