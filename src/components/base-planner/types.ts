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

export interface LayoutProject {
  id: string;
  name: string;
  townHallLevel: number;
  buildings: PlacedBuilding[];
  createdAt: string;
  updatedAt: string;
}

export interface BaseLayoutData {
  version: 1;
  name: string;
  townHallLevel: number;
  buildings: PlacedBuilding[];
  createdAt: string;
  updatedAt: string;
}

export type RangeDisplayMode = "all" | "selected" | "none";

export interface TacticalSettings {
  showRanges: RangeDisplayMode;
  showChainLightning: boolean;
  showHeatmap: boolean;
  showDefenseScore: boolean;
  showGrid: boolean;
  showCoordinates: boolean;
  wallBrushActive: boolean;
  eraserActive: boolean;
  chainMaxDistance: number; // 1 or 2 tiles
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
}
