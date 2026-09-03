/**
 * Deployment Zone Engine
 * ----------------------
 * Models the tiles around every defense/resource/army/hero building and wall segment
 * where the attacker CANNOT deploy troops (Clash of Clans deployment rule: 1 tile halo
 * around any "solid" structure, chebyshev distance). This is completely separate from
 * `occupancyMask` (the real footprint used for placement/collision) — the deployment
 * halo of two neighbouring buildings is ALLOWED to overlap, unlike their footprints.
 *
 * Everything downstream (2D renderer, isometric renderer, generator, scorer, validator,
 * auto-fix) reads from `computeDeploymentMasks` / `computeDeploymentAnalysis` here so
 * there is exactly one implementation of the rule.
 */
import { BUILDINGS_BY_ID } from "./constants";
import type { BuildingCategory, PlacedBuilding } from "./types";

// ---------------------------------------------------------------------------
// 1. Ruleset (versioned, data-driven — never hardcode radius/category elsewhere)
// ---------------------------------------------------------------------------

export type DistanceMetric = "chebyshev" | "manhattan";

export type ObjectCategory = BuildingCategory;

export interface DeploymentRuleset {
  version: string;
  mapWidth: number;
  mapHeight: number;
  blockRadius: number;
  distanceMetric: DistanceMetric;
  blockingCategories: ObjectCategory[];
  nonBlockingCategories: ObjectCategory[];
}

/** Every BuildingCategory that currently exists in the real catalog (see types.ts). */
const ALL_KNOWN_CATEGORIES: BuildingCategory[] = ["defense", "resource", "army", "trap", "wall", "hero"];

/**
 * Home Village ruleset. In real Clash of Clans, every solid structure (defenses,
 * resource buildings, army buildings, hero altars, walls, Town Hall — which is
 * catalog category "defense" here) blocks a 1-tile deployment halo (Chebyshev).
 * Traps are hidden and never block deployment.
 */
export const HOME_VILLAGE_DEPLOYMENT_RULES: DeploymentRuleset = {
  version: "home-village-v1",
  mapWidth: 44,
  mapHeight: 44,
  blockRadius: 1,
  distanceMetric: "chebyshev",
  blockingCategories: ["defense", "resource", "army", "hero", "wall"],
  nonBlockingCategories: ["trap"],
};

/**
 * Fails fast (at import time) if the ruleset does not classify every category the
 * catalog currently defines. This is the "check the catalog before applying" guard
 * required so a future catalog change (new category) cannot silently fall through
 * as neither blocking nor non-blocking.
 */
function assertRulesetCoversCatalog(ruleset: DeploymentRuleset): void {
  const covered = new Set<BuildingCategory>([...ruleset.blockingCategories, ...ruleset.nonBlockingCategories]);
  const missing = ALL_KNOWN_CATEGORIES.filter((c) => !covered.has(c));
  if (missing.length > 0) {
    throw new Error(
      `DeploymentRuleset "${ruleset.version}" does not classify categor${missing.length > 1 ? "ies" : "y"} [${missing.join(", ")}] as blocking or non-blocking. Update the ruleset before using it.`
    );
  }
  const overlap = ruleset.blockingCategories.filter((c) => ruleset.nonBlockingCategories.includes(c));
  if (overlap.length > 0) {
    throw new Error(
      `DeploymentRuleset "${ruleset.version}" lists categor${overlap.length > 1 ? "ies" : "y"} [${overlap.join(", ")}] as BOTH blocking and non-blocking.`
    );
  }
}
assertRulesetCoversCatalog(HOME_VILLAGE_DEPLOYMENT_RULES);

export function isCategoryBlocking(category: BuildingCategory, ruleset: DeploymentRuleset): boolean {
  return ruleset.blockingCategories.includes(category);
}

// ---------------------------------------------------------------------------
// 2. Core geometry types
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TileMasks = {
  /** Real footprint of buildings/walls/traps. Used for collision, bounds, placement. */
  occupancyMask: boolean[][];
  /** Tiles the defender's structures make un-deployable for the attacker. */
  deploymentBlockMask: boolean[][];
  /** Map tiles NOT in deploymentBlockMask. Never used for collision. */
  deploymentAllowedMask: boolean[][];
};

function createBoolGrid(width: number, height: number, fill = false): boolean[][] {
  const grid: boolean[][] = new Array(height);
  for (let y = 0; y < height; y++) {
    grid[y] = new Array(width).fill(fill);
  }
  return grid;
}

export function isInsideMap(x: number, y: number, ruleset: DeploymentRuleset): boolean {
  return x >= 0 && y >= 0 && x < ruleset.mapWidth && y < ruleset.mapHeight;
}

export function getBuildingRect(b: PlacedBuilding): Rect | null {
  const def = BUILDINGS_BY_ID.get(b.buildingId);
  if (!def) return null;
  return { x: b.x, y: b.y, width: def.width, height: def.height };
}

// ---------------------------------------------------------------------------
// 3. Footprint gap (edge-to-edge, NOT center-to-center)
// ---------------------------------------------------------------------------

export interface FootprintGap {
  horizontalGap: number;
  verticalGap: number;
  chebyshevGap: number;
}

/**
 * Empty-tile gap between two rectangular footprints. 0 = touching/overlapping,
 * 1 = exactly one empty tile between them, etc. This is edge-to-edge, matching
 * the same convention used by chainLightningUtils.getTileGap — deliberately NOT
 * a center-to-center distance, since deployment coverage cares about literal
 * empty tiles between two solid rectangles.
 */
export function getFootprintGap(a: Rect, b: Rect): FootprintGap {
  const horizontalGap = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const verticalGap = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return { horizontalGap, verticalGap, chebyshevGap: Math.max(horizontalGap, verticalGap) };
}

/** Chebyshev/Manhattan distance from a single tile to the nearest edge of a rect (0 if inside). */
export function distancePointToRect(x: number, y: number, rect: Rect, metric: DistanceMetric): number {
  const dx = x < rect.x ? rect.x - x : x >= rect.x + rect.width ? x - (rect.x + rect.width - 1) : 0;
  const dy = y < rect.y ? rect.y - y : y >= rect.y + rect.height ? y - (rect.y + rect.height - 1) : 0;
  return metric === "chebyshev" ? Math.max(dx, dy) : dx + dy;
}

// ---------------------------------------------------------------------------
// 4. Mask builders
// ---------------------------------------------------------------------------

export function buildOccupancyMask(buildings: PlacedBuilding[], ruleset: DeploymentRuleset): boolean[][] {
  const mask = createBoolGrid(ruleset.mapWidth, ruleset.mapHeight);
  for (const b of buildings) {
    const rect = getBuildingRect(b);
    if (!rect) continue;
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (isInsideMap(x, y, ruleset)) mask[y][x] = true;
      }
    }
  }
  return mask;
}

/**
 * Generalized halo expansion: marks every in-bounds tile within `radius` (by the
 * ruleset's distance metric) of `rect`'s edge. The radius is a parameter — never a
 * hardcoded literal — so blockRadius can change (e.g. a future game mode ruleset)
 * without touching this function.
 */
export function expandRectByRadius(
  rect: Rect,
  radius: number,
  metric: DistanceMetric,
  ruleset: DeploymentRuleset,
  mark: (x: number, y: number) => void
): void {
  const top = rect.y;
  const left = rect.x;
  const bottom = rect.y + rect.height - 1;
  const right = rect.x + rect.width - 1;

  for (let y = top - radius; y <= bottom + radius; y++) {
    for (let x = left - radius; x <= right + radius; x++) {
      if (!isInsideMap(x, y, ruleset)) continue;
      const dist = distancePointToRect(x, y, rect, metric);
      if (dist <= radius) mark(x, y);
    }
  }
}

/**
 * Union of every blocking object's footprint + halo. Overlapping halos are merged
 * (booleans OR'd) — never double counted, matching the spec's "vành của nhiều vật
 * thể được phép chồng lên nhau, không đếm hai lần" requirement.
 */
export function buildDeploymentBlockMask(buildings: PlacedBuilding[], ruleset: DeploymentRuleset): boolean[][] {
  const mask = createBoolGrid(ruleset.mapWidth, ruleset.mapHeight);
  for (const b of buildings) {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def) continue;
    if (!isCategoryBlocking(def.category, ruleset)) continue;
    const rect = getBuildingRect(b);
    if (!rect) continue;
    expandRectByRadius(rect, ruleset.blockRadius, ruleset.distanceMetric, ruleset, (x, y) => {
      mask[y][x] = true;
    });
  }
  return mask;
}

export function buildDeploymentAllowedMask(blockMask: boolean[][], ruleset: DeploymentRuleset): boolean[][] {
  const mask = createBoolGrid(ruleset.mapWidth, ruleset.mapHeight);
  for (let y = 0; y < ruleset.mapHeight; y++) {
    for (let x = 0; x < ruleset.mapWidth; x++) {
      mask[y][x] = !blockMask[y][x];
    }
  }
  return mask;
}

export function computeDeploymentMasks(
  buildings: PlacedBuilding[],
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES
): TileMasks {
  const occupancyMask = buildOccupancyMask(buildings, ruleset);
  const deploymentBlockMask = buildDeploymentBlockMask(buildings, ruleset);
  const deploymentAllowedMask = buildDeploymentAllowedMask(deploymentBlockMask, ruleset);
  return { occupancyMask, deploymentBlockMask, deploymentAllowedMask };
}

// ---------------------------------------------------------------------------
// 5. Region classification (connected components on deploymentAllowedMask)
// ---------------------------------------------------------------------------

export type DeploymentRegionType = "external" | "internal-hole" | "corridor" | "intentional-pocket";

export interface DeploymentRegion {
  id: number;
  /** Geometric classification only — purpose-aware "is this OK" lives in deploymentRisk.ts. */
  type: DeploymentRegionType;
  cells: Array<{ x: number; y: number }>;
  touchesBorder: boolean;
  size: number;
  minDistanceToTownHall: number | null;
}

/** How many tiles inward from the map border an external region is still considered plain "external" before it counts as a "corridor" (a thin deployment path threading deep into the base). */
export const DEFAULT_CORRIDOR_DEPTH_THRESHOLD = 3;

const NEIGHBOR_OFFSETS_8: Array<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

interface FloodFillResult {
  componentId: number[][]; // -1 if blocked
  components: Array<{ cells: Array<{ x: number; y: number }>; touchesBorder: boolean }>;
}

function floodFillAllowedMask(allowedMask: boolean[][], ruleset: DeploymentRuleset): FloodFillResult {
  const h = ruleset.mapHeight;
  const w = ruleset.mapWidth;
  const componentId: number[][] = createGridFilled(w, h, -1);
  const components: FloodFillResult["components"] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!allowedMask[y][x] || componentId[y][x] !== -1) continue;

      const id = components.length;
      const cells: Array<{ x: number; y: number }> = [];
      let touchesBorder = false;
      const queue: Array<[number, number]> = [[x, y]];
      componentId[y][x] = id;

      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        cells.push({ x: cx, y: cy });
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) touchesBorder = true;

        for (const [dx, dy] of NEIGHBOR_OFFSETS_8) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (!allowedMask[ny][nx] || componentId[ny][nx] !== -1) continue;
          componentId[ny][nx] = id;
          queue.push([nx, ny]);
        }
      }

      components.push({ cells, touchesBorder });
    }
  }

  return { componentId, components };
}

function createGridFilled(width: number, height: number, value: number): number[][] {
  const grid: number[][] = new Array(height);
  for (let y = 0; y < height; y++) grid[y] = new Array(width).fill(value);
  return grid;
}

/** Multi-source BFS distance (in map steps) from every border-touching cell of one component. */
function computeBorderDepth(cells: Array<{ x: number; y: number }>, ruleset: DeploymentRuleset): Map<string, number> {
  const w = ruleset.mapWidth;
  const h = ruleset.mapHeight;
  const cellSet = new Set(cells.map((c) => `${c.x},${c.y}`));
  const depth = new Map<string, number>();
  const queue: Array<[number, number]> = [];

  for (const c of cells) {
    if (c.x === 0 || c.y === 0 || c.x === w - 1 || c.y === h - 1) {
      depth.set(`${c.x},${c.y}`, 0);
      queue.push([c.x, c.y]);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const d = depth.get(`${cx},${cy}`)!;
    for (const [dx, dy] of NEIGHBOR_OFFSETS_8) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (!cellSet.has(key) || depth.has(key)) continue;
      depth.set(key, d + 1);
      queue.push([nx, ny]);
    }
  }

  return depth;
}

function findTownHallRect(buildings: PlacedBuilding[]): Rect | null {
  const th = buildings.find((b) => b.buildingId === "town-hall");
  if (!th) return null;
  return getBuildingRect(th);
}

/** Fraction of blocked tiles in a (2*radius+1) box centered on (x,y), clipped to the map. */
const CORRIDOR_LOCAL_DENSITY_RADIUS = 2;
const CORRIDOR_MIN_LOCAL_BLOCKED_DENSITY = 0.2;

function localBlockedDensity(
  x: number,
  y: number,
  blockMask: boolean[][],
  ruleset: DeploymentRuleset,
  radius: number = CORRIDOR_LOCAL_DENSITY_RADIUS
): number {
  let blocked = 0;
  let total = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (!isInsideMap(nx, ny, ruleset)) continue;
      total++;
      if (blockMask[ny][nx]) blocked++;
    }
  }
  return total > 0 ? blocked / total : 0;
}

/**
 * Flood-fills `deploymentAllowedMask` into connected components (8-connectivity —
 * troops can walk diagonally) and classifies each cell:
 *  - a component that never touches the map border -> "internal-hole" (a fully
 *    enclosed pocket of deployable tiles — a serious defect for War/Trophy/Hybrid).
 *  - a component that touches the border is normally "external" (the open
 *    deployment strip surrounding any base); cells within it whose shortest path
 *    back to the border exceeds `corridorDepthThreshold` AND are locally
 *    surrounded by built structure (not just open, unbuilt field) are
 *    reclassified as "corridor" (a gap wide enough to thread deployment deep
 *    inside the base because of oversized spacing). The local-structure gate
 *    is what stops an entirely empty 44x44 map from being misread as one giant
 *    corridor — depth-from-border alone can't distinguish "deep inside a base"
 *    from "far into empty, unbuilt land".
 *
 * "intentional-pocket" is never produced here — it is a purpose-aware relabelling
 * of "internal-hole" applied downstream (see deploymentRisk.ts) once we know the
 * base's purpose (Showcase bases deliberately carve pockets for art).
 */
export function classifyDeploymentRegions(
  masks: Pick<TileMasks, "deploymentAllowedMask" | "deploymentBlockMask">,
  buildings: PlacedBuilding[],
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES,
  corridorDepthThreshold: number = DEFAULT_CORRIDOR_DEPTH_THRESHOLD
): { regions: DeploymentRegion[]; regionTypeGrid: DeploymentRegionType[][] } {
  const { components } = floodFillAllowedMask(masks.deploymentAllowedMask, ruleset);
  const thRect = findTownHallRect(buildings);
  const typeGrid: DeploymentRegionType[][] = new Array(ruleset.mapHeight);
  for (let y = 0; y < ruleset.mapHeight; y++) typeGrid[y] = new Array(ruleset.mapWidth).fill("external");

  const regions: DeploymentRegion[] = [];

  components.forEach((comp, id) => {
    let minDistanceToTownHall: number | null = null;
    if (thRect) {
      let min = Infinity;
      for (const c of comp.cells) {
        const d = distancePointToRect(c.x, c.y, thRect, ruleset.distanceMetric);
        if (d < min) min = d;
      }
      minDistanceToTownHall = Number.isFinite(min) ? min : null;
    }

    if (!comp.touchesBorder) {
      for (const c of comp.cells) typeGrid[c.y][c.x] = "internal-hole";
      regions.push({
        id,
        type: "internal-hole",
        cells: comp.cells,
        touchesBorder: false,
        size: comp.cells.length,
        minDistanceToTownHall,
      });
      return;
    }

    // Border-touching component: split into "external" (near border, or open
    // unbuilt field) vs "corridor" (deep inward AND squeezed between structure).
    const depth = computeBorderDepth(comp.cells, ruleset);
    let hasCorridor = false;
    for (const c of comp.cells) {
      const d = depth.get(`${c.x},${c.y}`) ?? 0;
      const isDeep = d > corridorDepthThreshold;
      const isNearStructure =
        isDeep &&
        localBlockedDensity(c.x, c.y, masks.deploymentBlockMask, ruleset) >= CORRIDOR_MIN_LOCAL_BLOCKED_DENSITY;
      if (isNearStructure) {
        typeGrid[c.y][c.x] = "corridor";
        hasCorridor = true;
      } else {
        typeGrid[c.y][c.x] = "external";
      }
    }

    regions.push({
      id,
      type: hasCorridor ? "corridor" : "external",
      cells: comp.cells,
      touchesBorder: true,
      size: comp.cells.length,
      minDistanceToTownHall,
    });
  });

  return { regions, regionTypeGrid: typeGrid };
}

// ---------------------------------------------------------------------------
// 6. Aggregate analysis
// ---------------------------------------------------------------------------

export interface DeploymentAnalysis {
  rulesetVersion: string;
  blockedTileCount: number;
  allowedTileCount: number;
  externalAllowedTileCount: number;
  internalHoleCount: number;
  internalHoleTileCount: number;
  largestInternalHole: number;
  corridorCount: number;
  corridorTileCount: number;
  criticalHoleCount: number;
  nearestHoleToTownHall: number | null;
  deploymentCoverageRatio: number;
  regions: DeploymentRegion[];
  regionTypeGrid: DeploymentRegionType[][];
  masks: TileMasks;
}

/** Internal-hole regions within this many tiles of the Town Hall are "critical" (severity escalation used by the scorer/generator/UI). */
export const CRITICAL_HOLE_TH_DISTANCE = 8;

export function computeDeploymentAnalysis(
  buildings: PlacedBuilding[],
  ruleset: DeploymentRuleset = HOME_VILLAGE_DEPLOYMENT_RULES,
  corridorDepthThreshold: number = DEFAULT_CORRIDOR_DEPTH_THRESHOLD
): DeploymentAnalysis {
  const masks = computeDeploymentMasks(buildings, ruleset);
  const { regions, regionTypeGrid } = classifyDeploymentRegions(masks, buildings, ruleset, corridorDepthThreshold);

  let blockedTileCount = 0;
  let allowedTileCount = 0;
  for (let y = 0; y < ruleset.mapHeight; y++) {
    for (let x = 0; x < ruleset.mapWidth; x++) {
      if (masks.deploymentBlockMask[y][x]) blockedTileCount++;
      else allowedTileCount++;
    }
  }

  const holeRegions = regions.filter((r) => r.type === "internal-hole");
  const corridorRegions = regions.filter((r) => r.type === "corridor");
  const externalRegions = regions.filter((r) => r.type === "external" || r.type === "corridor");

  const internalHoleTileCount = holeRegions.reduce((sum, r) => sum + r.size, 0);
  const largestInternalHole = holeRegions.reduce((max, r) => Math.max(max, r.size), 0);
  const corridorTileCount = corridorRegions.reduce((sum, r) => sum + r.size, 0);
  const criticalHoleCount = holeRegions.filter(
    (r) => r.minDistanceToTownHall !== null && r.minDistanceToTownHall <= CRITICAL_HOLE_TH_DISTANCE
  ).length;

  const holeDistances = holeRegions
    .map((r) => r.minDistanceToTownHall)
    .filter((d): d is number => d !== null);
  const nearestHoleToTownHall = holeDistances.length > 0 ? Math.min(...holeDistances) : null;

  const externalAllowedTileCount = externalRegions.reduce((sum, r) => sum + r.size, 0);

  const totalBuildableTileCount = ruleset.mapWidth * ruleset.mapHeight;
  const deploymentCoverageRatio = totalBuildableTileCount > 0 ? blockedTileCount / totalBuildableTileCount : 0;

  return {
    rulesetVersion: ruleset.version,
    blockedTileCount,
    allowedTileCount,
    externalAllowedTileCount,
    internalHoleCount: holeRegions.length,
    internalHoleTileCount,
    largestInternalHole,
    corridorCount: corridorRegions.length,
    corridorTileCount,
    criticalHoleCount,
    nearestHoleToTownHall,
    deploymentCoverageRatio,
    regions,
    regionTypeGrid,
    masks,
  };
}
