/**
 * Deployment Zone auto-fix: a heuristic, minimal-displacement engine that tries
 * to close dangerous internal deployment holes by nudging ONE nearby blocking
 * building or wall segment at a time.
 *
 * This is intentionally NOT a global re-optimizer — finding a provably optimal
 * fix is a much larger combinatorial search than "close the hole the user is
 * looking at". The heuristic here mirrors the spec's own priority order:
 * prefer walls (least disruptive/cheapest to re-place in-game) over buildings,
 * prefer the nearest candidate, and only accept a move that (a) creates no
 * overlap/out-of-bounds and (b) does not make the overall defense score drop
 * severely. The caller (UI layer) is responsible for creating an undo
 * checkpoint before applying `updatedBuildings` — this module never touches
 * storage, it only computes a proposed layout.
 */
import { BUILDINGS_BY_ID } from "./constants";
import { evaluateBaseDefense } from "./defenseScorer";
import { classifyHoleSeverity, computeDeploymentRisk } from "./deploymentRisk";
import {
  HOME_VILLAGE_DEPLOYMENT_RULES,
  computeDeploymentAnalysis,
  type DeploymentRegion,
  type DeploymentRuleset,
} from "./deploymentZones";
import type { BasePurpose, BuildingDef, PlacedBuilding } from "./types";

export interface DeploymentFixSnapshot {
  internalHoleCount: number;
  nearestHoleToTownHall: number | null;
  deploymentRiskScore: number;
  totalScore: number;
}

export interface AutoFixResult {
  /** The buildings to apply. Equals the original array (same reference) when nothing was changed/applied. */
  updatedBuildings: PlacedBuilding[];
  changedInstanceIds: string[];
  resolvedHoleCount: number;
  unresolvedCriticalHoleCount: number;
  before: DeploymentFixSnapshot;
  after: DeploymentFixSnapshot;
  /** False when no safe fix was found, or the best fix found would drop the total score too much. */
  applied: boolean;
}

const MAX_HOLES_PROCESSED = 8;
const MAX_NUDGE_STEPS = 4;
const CANDIDATE_SEARCH_RADIUS_TILES = 10;
/** Reject an auto-fix whose net effect drops the overall defense score by more than this many points. */
const SEVERE_SCORE_DROP_THRESHOLD = 5;

function snapshot(
  buildings: PlacedBuilding[],
  townHallLevel: number,
  purpose: BasePurpose,
  ruleset: DeploymentRuleset
): DeploymentFixSnapshot {
  const analysis = computeDeploymentAnalysis(buildings, ruleset);
  const risk = computeDeploymentRisk(analysis, buildings, purpose, ruleset);
  const totalScore = evaluateBaseDefense(buildings, townHallLevel, purpose).totalScore;
  return {
    internalHoleCount: analysis.internalHoleCount,
    nearestHoleToTownHall: analysis.nearestHoleToTownHall,
    deploymentRiskScore: risk.deploymentRiskScore,
    totalScore,
  };
}

/** Tile-center convention consistent with `b.x + def.width / 2` used elsewhere (defenseScorer, generator). */
function regionCenter(region: DeploymentRegion): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const c of region.cells) {
    sx += c.x + 0.5;
    sy += c.y + 0.5;
  }
  const n = region.cells.length || 1;
  return { x: sx / n, y: sy / n };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Tries moving one building up to `MAX_NUDGE_STEPS` tiles toward the hole
 * center, biased toward the hole first, then straight along each axis. Accepts
 * the first candidate position that (a) doesn't overlap any other building,
 * (b) stays in bounds, and (c) removes every one of the hole's original cells
 * from the resulting deployment-allowed mask.
 */
function tryNudgeTowardHole(
  buildings: PlacedBuilding[],
  building: PlacedBuilding,
  def: BuildingDef,
  holeCells: Set<string>,
  ruleset: DeploymentRuleset
): PlacedBuilding | null {
  const center = { x: building.x + def.width / 2, y: building.y + def.height / 2 };
  const target = regionCenterFromCells(holeCells);
  const dirX = Math.sign(target.x - center.x);
  const dirY = Math.sign(target.y - center.y);

  const offsets: Array<[number, number]> = [];
  for (let step = 1; step <= MAX_NUDGE_STEPS; step++) {
    if (dirX !== 0 || dirY !== 0) offsets.push([dirX * step, dirY * step]);
    if (dirX !== 0) offsets.push([dirX * step, 0]);
    if (dirY !== 0) offsets.push([0, dirY * step]);
  }

  const others = buildings.filter((b) => b.instanceId !== building.instanceId);

  for (const [dx, dy] of offsets) {
    if (dx === 0 && dy === 0) continue;
    const nx = building.x + dx;
    const ny = building.y + dy;
    if (nx < 0 || ny < 0 || nx + def.width > ruleset.mapWidth || ny + def.height > ruleset.mapHeight) continue;

    let overlaps = false;
    for (const other of others) {
      const otherDef = BUILDINGS_BY_ID.get(other.buildingId);
      if (!otherDef) continue;
      if (rectsOverlap(nx, ny, def.width, def.height, other.x, other.y, otherDef.width, otherDef.height)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const candidateBuilding: PlacedBuilding = { ...building, x: nx, y: ny };
    const candidateLayout = others.concat(candidateBuilding);
    const candidateAnalysis = computeDeploymentAnalysis(candidateLayout, ruleset);
    const holeStillOpen = candidateAnalysis.regions.some(
      (r) => r.type === "internal-hole" && r.cells.some((c) => holeCells.has(`${c.x},${c.y}`))
    );
    if (!holeStillOpen) {
      return candidateBuilding;
    }
  }

  return null;
}

function regionCenterFromCells(cells: Set<string>): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const key of cells) {
    const [x, y] = key.split(",").map(Number);
    sx += x + 0.5;
    sy += y + 0.5;
    n++;
  }
  return n > 0 ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
}

function tryCloseHole(
  buildings: PlacedBuilding[],
  region: DeploymentRegion,
  ruleset: DeploymentRuleset
): { updated: PlacedBuilding[]; changedInstanceId: string } | null {
  const center = regionCenter(region);
  const holeCells = new Set(region.cells.map((c) => `${c.x},${c.y}`));

  const candidates = buildings
    .filter((b) => b.buildingId !== "town-hall") // never auto-move the Town Hall
    .map((b) => {
      const def = BUILDINGS_BY_ID.get(b.buildingId);
      if (!def) return null;
      const cx = b.x + def.width / 2;
      const cy = b.y + def.height / 2;
      const dist = Math.hypot(cx - center.x, cy - center.y);
      return { building: b, def, dist };
    })
    .filter((c): c is { building: PlacedBuilding; def: BuildingDef; dist: number } =>
      c !== null && c.dist <= CANDIDATE_SEARCH_RADIUS_TILES
    )
    .sort((a, c) => {
      const aWall = a.def.category === "wall" ? 0 : 1;
      const cWall = c.def.category === "wall" ? 0 : 1;
      if (aWall !== cWall) return aWall - cWall; // walls first: cheapest/least disruptive to move
      return a.dist - c.dist; // then nearest first: smallest displacement
    });

  for (const candidate of candidates) {
    const moved = tryNudgeTowardHole(buildings, candidate.building, candidate.def, holeCells, ruleset);
    if (moved) {
      return {
        updated: buildings.map((b) => (b.instanceId === moved.instanceId ? moved : b)),
        changedInstanceId: moved.instanceId,
      };
    }
  }

  return null;
}

/**
 * Computes a proposed fix for the current layout's most dangerous deployment
 * holes (nearest to the Town Hall / resources first). Returns `applied: false`
 * (with `updatedBuildings` equal to the input array) when no safe, score-preserving
 * fix could be found — the caller should not touch the layout in that case.
 */
export function suggestDeploymentAutoFix(
  buildings: PlacedBuilding[],
  townHallLevel: number,
  purpose: BasePurpose,
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES
): AutoFixResult {
  const before = snapshot(buildings, townHallLevel, purpose, ruleset);

  let working = buildings.map((b) => ({ ...b }));
  const changedInstanceIds = new Set<string>();
  let resolvedHoleCount = 0;

  let analysis = computeDeploymentAnalysis(working, ruleset);
  let holesToTry = analysis.regions
    .filter((r) => r.type === "internal-hole")
    .filter((r) => classifyHoleSeverity(r, working, purpose, ruleset).severity !== "info")
    .sort((a, b) => (a.minDistanceToTownHall ?? Infinity) - (b.minDistanceToTownHall ?? Infinity))
    .slice(0, MAX_HOLES_PROCESSED);

  for (const region of holesToTry) {
    // Re-check this exact hole still exists on the (possibly already patched) working layout.
    const holeCellKey = region.cells.length > 0 ? `${region.cells[0].x},${region.cells[0].y}` : null;
    if (holeCellKey) {
      const stillPresent = computeDeploymentAnalysis(working, ruleset).regions.some(
        (r) => r.type === "internal-hole" && r.cells.some((c) => `${c.x},${c.y}` === holeCellKey)
      );
      if (!stillPresent) continue; // already closed as a side effect of an earlier fix
    }

    const fix = tryCloseHole(working, region, ruleset);
    if (fix) {
      working = fix.updated;
      changedInstanceIds.add(fix.changedInstanceId);
      resolvedHoleCount++;
    }
  }

  const after = snapshot(working, townHallLevel, purpose, ruleset);
  const finalAnalysis = computeDeploymentAnalysis(working, ruleset);
  const unresolvedCriticalHoleCount = finalAnalysis.regions.filter(
    (r) => r.type === "internal-hole" && classifyHoleSeverity(r, working, purpose, ruleset).severity === "critical"
  ).length;

  const scoreDropped = before.totalScore - after.totalScore > SEVERE_SCORE_DROP_THRESHOLD;
  const applied = changedInstanceIds.size > 0 && !scoreDropped;

  return {
    updatedBuildings: applied ? working : buildings,
    changedInstanceIds: applied ? Array.from(changedInstanceIds) : [],
    resolvedHoleCount: applied ? resolvedHoleCount : 0,
    unresolvedCriticalHoleCount: applied ? unresolvedCriticalHoleCount : before.internalHoleCount,
    before,
    after: applied ? after : before,
    applied,
  };
}
