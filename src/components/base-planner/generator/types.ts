import type { BuildingCategory, PlacedBuilding } from "../types";

export type BasePurpose =
  | "war"
  | "trophy"
  | "farming"
  | "hybrid"
  | "progress"
  | "showcase";

export type AestheticPattern =
  | "symmetric-axial"
  | "diamond"
  | "shield"
  | "heart"
  | "spiral"
  | "crest"
  | "letter"
  | "radial";

export interface GeneratorPreferences {
  symmetryAxis?: "x" | "y" | "both" | "diagonal";
  spreadStorages?: boolean;
  coreProtectionLevel?: "balanced" | "ultra-tight" | "spacious";
}

export interface GenerateBaseOptions {
  townHallLevel: number;
  purpose: BasePurpose;
  pattern?: AestheticPattern;
  seed?: number | string;
  preferences?: GeneratorPreferences;
}

export interface BaseScore {
  completeness: boolean;
  validity: boolean;
  symmetry: number;
  compartmentQuality: number;
  defensiveSpacing: number;
  airCoverage: number;
  splashCoverage: number;
  resourceProtection: number;
  pathComplexity: number;
  upgradeAccessibility: number;
  aestheticBalance: number;
  /** 0-100 Deployment Zone safety score (see deploymentRisk.ts) — higher is safer (fewer/no internal holes). */
  deploymentSafety: number;
  overallScore: number;
  tier: "S" | "A" | "B" | "C";
  summary: string;
}

export interface GeneratedBaseStats {
  buildingsCount: number;
  trapsCount: number;
  wallsCount: number;
  totalPlaced: number;
  requiredBuildings: number;
  requiredTraps: number;
  requiredWalls: number;
  requiredTotal: number;
  isComplete: boolean;
  isValid: boolean;
  byCategory: Record<string, { placed: number; required: number }>;
}

export interface GeneratedBaseResult {
  success: boolean;
  buildings: PlacedBuilding[];
  townHallLevel: number;
  purpose: BasePurpose;
  pattern?: AestheticPattern;
  seed: number;
  stats: GeneratedBaseStats;
  score: BaseScore;
  warnings: string[];
  error?: string;
  executionTimeMs: number;
}
