import type { DeploymentAnalysis } from "./deploymentZones";

export type BuildingCategory = "defense" | "resource" | "army" | "trap" | "wall" | "hero";

export interface BuildingDef {
  id: string;
  name: string;
  category: BuildingCategory;
  width: number; // in grid tiles (e.g., 3 means 3x3)
  height: number;
  range?: number; // max firing / patrol range in tiles
  minRange?: number; // dead zone range (e.g. Mortar: 4, Eagle: 7)
  color: string; // theme color
  accentColor?: string;
  description?: string;
  remoteArtKey?: string;
  weaponType?: "ground" | "air" | "both" | "trap" | "none";
}

export interface PlacedBuilding {
  instanceId: string;
  buildingId: string;
  x: number; // 0 to 43 (left grid coordinate)
  y: number; // 0 to 43 (top grid coordinate)
  level?: number;
}

/**
 * Purely cosmetic objects (trees, statues, banners...). Deliberately kept OUT of
 * `PlacedBuilding`/`BuildingCategory` so they never touch the real-gameplay pipeline
 * (defense scoring, deployment-zone masks, generator required-counts, TH unlock
 * validation) — they are visual-only and never affect any of that.
 */
export interface DecorationDef {
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;
  accentColor?: string;
  /** Emoji glyph drawn on the canvas in place of game art (no decoration sprites exist in this project). */
  emoji: string;
  description?: string;
}

export interface PlacedDecoration {
  instanceId: string;
  decorationId: string;
  x: number;
  y: number;
}

export type BasePurpose =
  | "war"
  | "trophy"
  | "farming"
  | "hybrid"
  | "progress"
  | "showcase";

export type CreationMethod = "auto" | "template" | "blank" | "copy" | "import";

export type LayoutStatus =
  | "valid"
  | "draft"
  | "warning"
  | "needs-update"
  | "data-error";

export interface LayoutProject {
  id: string;
  name: string;
  townHallLevel: number;
  purpose: BasePurpose;
  creationMethod: CreationMethod;
  status?: LayoutStatus;
  templateId?: string;
  pattern?: string;
  seed?: number | string;
  buildings: PlacedBuilding[];
  /** Optional — omitted on layouts created before decorations existed. */
  decorations?: PlacedDecoration[];
  createdAt: string;
  updatedAt: string;
  catalogVersion: string;
  isPinned?: boolean;
  deletedAt?: string;
  sourceLayoutId?: string;
}

export interface LayoutCheckpoint {
  id: string;
  layoutId: string;
  timestamp: string;
  reason: string;
  buildings: PlacedBuilding[];
  catalogVersion: string;
  townHallLevel: number;
}

export interface LayoutLibraryBundle {
  app: "ClashPath-BasePlanner";
  version: 2;
  exportDate: string;
  catalogVersion: string;
  layouts: LayoutProject[];
}

export interface BaseLayoutData {
  version: 1;
  name: string;
  townHallLevel: number;
  buildings: PlacedBuilding[];
  createdAt: string;
  updatedAt: string;
}

export type PlannerMode = "design" | "analysis" | "decorate";
export type RangeDisplayMode = "all" | "selected" | "none";
export type ChainLightningMode = "all" | "selected" | "none";
/** off = Tắt, blocked = Vùng cấm, holes = Lỗ nguy hiểm, all = Tất cả. */
export type DeploymentDisplayMode = "off" | "blocked" | "holes" | "all";
export type PlannerViewMode = "2d" | "isometric";

export interface TacticalSettings {
  showRanges: RangeDisplayMode;
  showChainLightning: ChainLightningMode;
  showHeatmap: boolean;
  showDefenseScore: boolean;
  showGrid: boolean;
  showCoordinates: boolean;
  wallBrushActive: boolean;
  eraserActive: boolean;
  plannerMode: PlannerMode;
  showBuildingNames: boolean;
  showBuildingLevels: boolean; // 1 or 2 tiles
  deploymentDisplayMode: DeploymentDisplayMode;
  viewMode: PlannerViewMode;
}

export interface ChainDangerPair {
  b1: PlacedBuilding;
  b2: PlacedBuilding;
  b1Def: BuildingDef;
  b2Def: BuildingDef;
  distance: number; // 0, 1, or 2 tiles gap
  dangerLevel: "critical" | "warning"; // 0-1 is critical, 2 is warning
}

export interface DefenseWarning {
  id: string;
  type: "critical" | "warning" | "tip";
  title: string;
  message: string;
  category: "core" | "chain" | "splash" | "trap" | "th";
}

export interface ScoreCategoryBreakdown {
  id: "core" | "chain" | "splash" | "trap" | "th";
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface DefenseScoreResult {
  totalScore: number; // 0 - 100
  tier: "S" | "A" | "B" | "C" | "D";
  tierTitle: string;
  tierColor: string;
  breakdown: {
    core: ScoreCategoryBreakdown;
    chain: ScoreCategoryBreakdown;
    splash: ScoreCategoryBreakdown;
    trap: ScoreCategoryBreakdown;
    th: ScoreCategoryBreakdown;
  };
  warnings: DefenseWarning[];
  heatStats: {
    maxCoverage: number;
    blindSpotsPercent: number;
    quadrantBalance: { nw: number; ne: number; sw: number; se: number };
  };
  /** Deployment Zone analysis (see deploymentZones.ts). Optional only so older callers/tests compile untouched. */
  deployment?: DeploymentAnalysis;
}
