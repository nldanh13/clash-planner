/**
 * Purpose-aware interpretation of a DeploymentAnalysis.
 *
 * deploymentZones.ts only knows geometry (masks, regions) — it has no idea whether
 * an internal hole is a disaster (War base, right next to the Town Hall) or a
 * deliberate design choice (Showcase/art base). This module adds that judgment,
 * and turns it into three things every other subsystem needs:
 *  - a single 0..100 `deploymentSafetyScore` the generator can weight like any
 *    other strategy score,
 *  - `DefenseWarning`-shaped entries the tactical scorer/UI can show directly,
 *  - a severity classification the auto-fix engine uses to pick what to fix first.
 */
import { BUILDINGS_BY_ID } from "./constants";
import type { BasePurpose, DefenseWarning, PlacedBuilding } from "./types";
import {
  CRITICAL_HOLE_TH_DISTANCE,
  HOME_VILLAGE_DEPLOYMENT_RULES,
  distancePointToRect,
  getBuildingRect,
  type DeploymentAnalysis,
  type DeploymentRegion,
  type DeploymentRuleset,
  type Rect,
  type TileMasks,
} from "./deploymentZones";
import { vi } from "../../i18n/locales/vi";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export type DeploymentSeverity = "critical" | "warning" | "info";

export interface DeploymentHoleClassification {
  severity: DeploymentSeverity;
  reason: string;
  /** Purpose-aware display relabel only — the underlying region.type stays geometric. */
  displayType: "internal-hole" | "intentional-pocket";
}

const RESOURCE_PROXIMITY_TILES = 6;
const TACTICAL_PURPOSES: BasePurpose[] = ["war", "trophy", "hybrid"];

function isResourceBuilding(buildingId: string): boolean {
  const def = BUILDINGS_BY_ID.get(buildingId);
  return !!def && def.category === "resource";
}

function minDistanceRegionToRects(region: DeploymentRegion, rects: Rect[], ruleset: DeploymentRuleset): number | null {
  if (rects.length === 0) return null;
  let min = Infinity;
  for (const c of region.cells) {
    for (const r of rects) {
      const d = distancePointToRect(c.x, c.y, r, ruleset.distanceMetric);
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : null;
}

/**
 * Decides whether one internal-hole region is a critical defect, a soft
 * warning, or (Showcase/Progress) just informational — and why, in a message
 * that's ready to show the user.
 */
export function classifyHoleSeverity(
  region: DeploymentRegion,
  buildings: PlacedBuilding[],
  purpose: BasePurpose,
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES
): DeploymentHoleClassification {
  if (purpose === "showcase") {
    return {
      severity: "info",
      reason: vi.deploymentRisk.showcaseIntentional,
      displayType: "intentional-pocket",
    };
  }

  if (purpose === "progress") {
    return {
      severity: "info",
      reason: vi.deploymentRisk.progressNote,
      displayType: "internal-hole",
    };
  }

  if (purpose === "farming") {
    const resourceRects = buildings
      .filter((b) => isResourceBuilding(b.buildingId))
      .map(getBuildingRect)
      .filter((r): r is Rect => r !== null);
    const distToResource = minDistanceRegionToRects(region, resourceRects, ruleset);
    if (distToResource !== null && distToResource <= RESOURCE_PROXIMITY_TILES) {
      return {
        severity: "critical",
        reason: fmt(vi.deploymentRisk.farmingNearResource, { distance: distToResource }),
        displayType: "internal-hole",
      };
    }
    return {
      severity: "warning",
      reason: vi.deploymentRisk.farmingAwayFromResource,
      displayType: "internal-hole",
    };
  }

  // War / Trophy / Hybrid: strict. internalHoleCount should be 0 whenever possible.
  const dist = region.minDistanceToTownHall;
  if (dist !== null && dist <= CRITICAL_HOLE_TH_DISTANCE) {
    return {
      severity: "critical",
      reason: fmt(vi.deploymentRisk.criticalNearTownHall, { distance: dist }),
      displayType: "internal-hole",
    };
  }
  return {
    severity: "warning",
    reason:
      dist !== null
        ? fmt(vi.deploymentRisk.warningWithDistance, { distance: dist })
        : vi.deploymentRisk.warningUnknownDistance,
    displayType: "internal-hole",
  };
}

// ---------------------------------------------------------------------------
// Risk score: deploymentRiskScore = internalHolePenalty + criticalCoreHolePenalty
//             + corridorPenalty + uncoveredPerimeterPenalty
// ---------------------------------------------------------------------------

export interface DeploymentRiskBreakdown {
  internalHolePenalty: number;
  criticalCoreHolePenalty: number;
  corridorPenalty: number;
  uncoveredPerimeterPenalty: number;
  /** Sum of the four penalties above. 0 = perfect, higher = worse. Unbounded above. */
  deploymentRiskScore: number;
  /** 100 - clamp(deploymentRiskScore), ready to plug into a 0..100 weighted score like any other strategy metric. */
  deploymentSafetyScore: number;
}

/**
 * Measures how "sealed" the ring of tiles immediately outside the build's own
 * bounding box is. A base with no defenses/walls anywhere near its own outer
 * edge has an exploitable, wide-open perimeter even if it has zero internal
 * holes — this is what lets an attacker funnel straight in from any direction.
 */
function computeUncoveredPerimeterPenalty(buildings: PlacedBuilding[], masks: TileMasks, ruleset: DeploymentRuleset): number {
  const rects = buildings.map(getBuildingRect).filter((r): r is Rect => r !== null);
  if (rects.length === 0) return 0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }

  const top = minY - 1;
  const bottom = maxY;
  const left = minX - 1;
  const right = maxX;

  let ringTiles = 0;
  let openRingTiles = 0;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < ruleset.mapWidth && y < ruleset.mapHeight;
  const sample = (x: number, y: number) => {
    if (!inBounds(x, y)) return;
    ringTiles++;
    if (masks.deploymentAllowedMask[y][x]) openRingTiles++;
  };

  for (let x = left; x <= right; x++) {
    sample(x, top);
    sample(x, bottom);
  }
  for (let y = top + 1; y < bottom; y++) {
    sample(left, y);
    sample(right, y);
  }

  if (ringTiles === 0) return 0;
  const openRatio = openRingTiles / ringTiles;
  return Math.round(openRatio * 12); // up to 12 points if the whole outer ring is wide open
}

export function computeDeploymentRisk(
  analysis: DeploymentAnalysis,
  buildings: PlacedBuilding[],
  purpose: BasePurpose,
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES
): DeploymentRiskBreakdown {
  const holeRegions = analysis.regions.filter((r) => r.type === "internal-hole");
  const corridorRegions = analysis.regions.filter((r) => r.type === "corridor");

  let internalHolePenalty = 0;
  let criticalCoreHolePenalty = 0;

  for (const region of holeRegions) {
    const { severity, displayType } = classifyHoleSeverity(region, buildings, purpose, ruleset);
    if (displayType === "intentional-pocket") continue; // Showcase: no penalty
    if (severity === "critical") criticalCoreHolePenalty += 18;
    else if (severity === "warning") internalHolePenalty += 8;
  }

  const corridorPenalty =
    purpose === "progress" || purpose === "showcase" ? 0 : corridorRegions.length * 4;

  const uncoveredPerimeterPenalty = computeUncoveredPerimeterPenalty(buildings, analysis.masks, ruleset);

  const deploymentRiskScore =
    internalHolePenalty + criticalCoreHolePenalty + corridorPenalty + uncoveredPerimeterPenalty;

  return {
    internalHolePenalty,
    criticalCoreHolePenalty,
    corridorPenalty,
    uncoveredPerimeterPenalty,
    deploymentRiskScore,
    deploymentSafetyScore: Math.max(0, 100 - deploymentRiskScore),
  };
}

// ---------------------------------------------------------------------------
// Warnings (DefenseWarning-shaped, ready for defenseScorer/DefenseScorePanel)
// ---------------------------------------------------------------------------

export function getDeploymentWarnings(
  analysis: DeploymentAnalysis,
  buildings: PlacedBuilding[],
  purpose: BasePurpose,
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES
): DefenseWarning[] {
  const warnings: DefenseWarning[] = [];
  const holeRegions = analysis.regions.filter((r) => r.type === "internal-hole");
  const corridorRegions = analysis.regions.filter((r) => r.type === "corridor");

  let criticalCount = 0;
  let warningCount = 0;
  let intentionalCount = 0;

  for (const region of holeRegions) {
    const { severity, displayType } = classifyHoleSeverity(region, buildings, purpose, ruleset);
    if (displayType === "intentional-pocket") {
      intentionalCount++;
    } else if (severity === "critical") {
      criticalCount++;
    } else if (severity === "warning") {
      warningCount++;
    }
  }

  if (criticalCount + warningCount > 0) {
    const total = criticalCount + warningCount;
    const nearest = analysis.nearestHoleToTownHall;
    warnings.push({
      id: "deployment-internal-hole",
      type: criticalCount > 0 ? "critical" : "warning",
      title: fmt(vi.deploymentRisk.holeWarningTitle, { count: total }),
      message:
        nearest !== null
          ? fmt(vi.deploymentRisk.holeWarningMessageWithDistance, { distance: nearest })
          : fmt(vi.deploymentRisk.holeWarningMessageNoDistance, { count: total }),
      category: "core",
    });
  }

  if (corridorRegions.length > 0 && purpose !== "progress" && purpose !== "showcase") {
    warnings.push({
      id: "deployment-corridor",
      type: "warning",
      title: fmt(vi.deploymentRisk.corridorWarningTitle, { count: corridorRegions.length }),
      message: vi.deploymentRisk.corridorWarningMessage,
      category: "core",
    });
  }

  if (intentionalCount > 0 && purpose === "showcase") {
    warnings.push({
      id: "deployment-intentional-pocket",
      type: "tip",
      title: fmt(vi.deploymentRisk.intentionalPocketTitle, { count: intentionalCount }),
      message: vi.deploymentRisk.intentionalPocketMessage,
      category: "core",
    });
  }

  return warnings;
}

/** War/Trophy/Hybrid layouts should never be labelled "optimal"/"ready" while a critical hole remains. */
export function isDeploymentReadyForPurpose(
  analysis: DeploymentAnalysis,
  buildings: PlacedBuilding[],
  purpose: BasePurpose,
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES
): { ready: boolean; reason?: string } {
  if (!TACTICAL_PURPOSES.includes(purpose)) return { ready: true };

  const holeRegions = analysis.regions.filter((r) => r.type === "internal-hole");
  for (const region of holeRegions) {
    const { severity } = classifyHoleSeverity(region, buildings, purpose, ruleset);
    if (severity === "critical") {
      return { ready: false, reason: vi.deploymentRisk.notReadyReason };
    }
  }
  return { ready: true };
}
