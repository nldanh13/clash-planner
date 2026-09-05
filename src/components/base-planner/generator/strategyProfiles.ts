import type { BasePurpose, BaseScore } from "./types";
import { vi } from "../../../i18n/locales/vi";

export interface StrategyProfile {
  purpose: BasePurpose;
  name: string;
  description: string;
  townHallPlacement: "center" | "off-center" | "semi-exposed";
  clanCastlePlacement: "dead-center" | "core" | "inner";
  eaglePlacement: "opposite-th" | "core" | "inner";
  storageStrategy: "spread-quadrants" | "buffer-defenses" | "perimeter";
  infernoSpacingMin: number;
  wallStyle: "multi-compartment" | "island-core" | "ring-buffer";
  trapPhilosophy: "funnel-gaps" | "anti-blimp-core" | "perimeter-intercept";
  scoreWeights: {
    symmetry: number;
    compartmentQuality: number;
    defensiveSpacing: number;
    airCoverage: number;
    splashCoverage: number;
    resourceProtection: number;
    pathComplexity: number;
    upgradeAccessibility: number;
    aestheticBalance: number;
    /** Weight of the Deployment Zone safety score (see deploymentRisk.ts) in the overall weighted average. */
    deploymentSafety: number;
  };
}

export const STRATEGY_PROFILES: Record<BasePurpose, StrategyProfile> = {
  war: {
    purpose: "war",
    name: "War Base (Clan War & CWL)",
    description: vi.strategyProfiles.war,
    townHallPlacement: "off-center",
    clanCastlePlacement: "dead-center",
    eaglePlacement: "opposite-th",
    storageStrategy: "buffer-defenses",
    infernoSpacingMin: 3,
    wallStyle: "multi-compartment",
    trapPhilosophy: "anti-blimp-core",
    scoreWeights: {
      symmetry: 0.05,
      compartmentQuality: 0.25,
      defensiveSpacing: 0.20,
      airCoverage: 0.15,
      splashCoverage: 0.10,
      resourceProtection: 0.05,
      pathComplexity: 0.15,
      upgradeAccessibility: 0.0,
      aestheticBalance: 0.05,
      deploymentSafety: 0.15,
    },
  },
  trophy: {
    purpose: "trophy",
    name: "Trophy Push Base",
    description: vi.strategyProfiles.trophy,
    townHallPlacement: "center",
    clanCastlePlacement: "core",
    eaglePlacement: "core",
    storageStrategy: "buffer-defenses",
    infernoSpacingMin: 2,
    wallStyle: "multi-compartment",
    trapPhilosophy: "funnel-gaps",
    scoreWeights: {
      symmetry: 0.15,
      compartmentQuality: 0.20,
      defensiveSpacing: 0.15,
      airCoverage: 0.20,
      splashCoverage: 0.15,
      resourceProtection: 0.05,
      pathComplexity: 0.10,
      upgradeAccessibility: 0.0,
      aestheticBalance: 0.0,
      deploymentSafety: 0.15,
    },
  },
  farming: {
    purpose: "farming",
    name: "Farming Base (Bảo vệ tài nguyên)",
    description: vi.strategyProfiles.farming,
    townHallPlacement: "semi-exposed",
    clanCastlePlacement: "core",
    eaglePlacement: "inner",
    storageStrategy: "spread-quadrants",
    infernoSpacingMin: 2,
    wallStyle: "multi-compartment",
    trapPhilosophy: "funnel-gaps",
    scoreWeights: {
      symmetry: 0.10,
      compartmentQuality: 0.15,
      defensiveSpacing: 0.10,
      airCoverage: 0.10,
      splashCoverage: 0.20,
      resourceProtection: 0.30,
      pathComplexity: 0.05,
      upgradeAccessibility: 0.0,
      aestheticBalance: 0.0,
      deploymentSafety: 0.10,
    },
  },
  hybrid: {
    purpose: "hybrid",
    name: "Hybrid Base (Cân bằng)",
    description: vi.strategyProfiles.hybrid,
    townHallPlacement: "center",
    clanCastlePlacement: "core",
    eaglePlacement: "inner",
    storageStrategy: "spread-quadrants",
    infernoSpacingMin: 2,
    wallStyle: "multi-compartment",
    trapPhilosophy: "funnel-gaps",
    scoreWeights: {
      symmetry: 0.10,
      compartmentQuality: 0.20,
      defensiveSpacing: 0.15,
      airCoverage: 0.15,
      splashCoverage: 0.15,
      resourceProtection: 0.15,
      pathComplexity: 0.10,
      upgradeAccessibility: 0.0,
      aestheticBalance: 0.0,
      deploymentSafety: 0.12,
    },
  },
  progress: {
    purpose: "progress",
    name: "Progress Base (Quy hoạch nâng cấp)",
    description: vi.strategyProfiles.progress,
    townHallPlacement: "center",
    clanCastlePlacement: "inner",
    eaglePlacement: "inner",
    storageStrategy: "perimeter",
    infernoSpacingMin: 0,
    wallStyle: "ring-buffer",
    trapPhilosophy: "funnel-gaps",
    scoreWeights: {
      symmetry: 0.15,
      compartmentQuality: 0.05,
      defensiveSpacing: 0.05,
      airCoverage: 0.05,
      splashCoverage: 0.05,
      resourceProtection: 0.05,
      pathComplexity: 0.05,
      upgradeAccessibility: 0.45,
      aestheticBalance: 0.10,
      deploymentSafety: 0.0,
    },
  },
  showcase: {
    purpose: "showcase",
    name: "Showcase / Art Base (Nghệ thuật & Đối xứng)",
    description: vi.strategyProfiles.showcase,
    townHallPlacement: "center",
    clanCastlePlacement: "core",
    eaglePlacement: "core",
    storageStrategy: "perimeter",
    infernoSpacingMin: 1,
    wallStyle: "island-core",
    trapPhilosophy: "funnel-gaps",
    scoreWeights: {
      symmetry: 0.40,
      compartmentQuality: 0.10,
      defensiveSpacing: 0.05,
      airCoverage: 0.05,
      splashCoverage: 0.05,
      resourceProtection: 0.05,
      pathComplexity: 0.05,
      upgradeAccessibility: 0.0,
      aestheticBalance: 0.25,
      deploymentSafety: 0.0,
    },
  },
};
