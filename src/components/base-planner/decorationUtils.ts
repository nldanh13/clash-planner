/**
 * Decoration placement helpers: collision against real buildings/walls + against
 * other decorations, and an auto-suggest algorithm that scatters decorations into
 * tiles that are provably safe (never inside an internal-hole/corridor the
 * Deployment Zone engine already flags as a defensive problem, reusing that exact
 * classification rather than re-deriving anything).
 */
import { GRID_SIZE } from "./constants";
import { computeDeploymentAnalysis } from "./deploymentZones";
import { DECORATIONS_BY_ID, DECORATIONS_CATALOG } from "./decorationCatalog";
import type { DecorationDef, PlacedBuilding, PlacedDecoration } from "./types";

function createBoolGrid(size: number): boolean[][] {
  const grid: boolean[][] = new Array(size);
  for (let y = 0; y < size; y++) grid[y] = new Array(size).fill(false);
  return grid;
}

export function buildDecorationOccupancyMask(decorations: PlacedDecoration[]): boolean[][] {
  const mask = createBoolGrid(GRID_SIZE);
  for (const d of decorations) {
    const def = DECORATIONS_BY_ID.get(d.decorationId);
    if (!def) continue;
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const y = d.y + r;
        const x = d.x + c;
        if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) mask[y][x] = true;
      }
    }
  }
  return mask;
}

/** Fast lookup for a single instance's own footprint, so it doesn't collide with itself while being dragged. */
export function getDecorationRect(d: PlacedDecoration): { x: number; y: number; width: number; height: number } | null {
  const def = DECORATIONS_BY_ID.get(d.decorationId);
  if (!def) return null;
  return { x: d.x, y: d.y, width: def.width, height: def.height };
}

export function isDecorationPlacementFree(
  buildingOccupancyMask: boolean[][],
  decorationOccupancyMask: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (x < 0 || y < 0 || x + width > GRID_SIZE || y + height > GRID_SIZE) return false;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (buildingOccupancyMask[y + r][x + c] || decorationOccupancyMask[y + r][x + c]) return false;
    }
  }
  return true;
}

export interface DecorationSuggestOptions {
  /** How many tiles beyond the buildings' bounding box to consider (the decorative "frame" ring). Default 5. */
  ringDepth?: number;
  /** Max number of decorations to suggest in one pass. Default 60. */
  maxCount?: number;
}

/**
 * Suggests decoration placements that are guaranteed not to touch any tile the
 * Deployment Zone engine flags as an "internal-hole" or "corridor" (i.e. never
 * papers over a real defensive problem) — only "external" tiles (the open
 * border ring right outside the walls, matching how real showcase bases frame
 * their build with trees/statues) are used as candidates.
 */
export function suggestDecorationPlacements(
  buildings: PlacedBuilding[],
  existingDecorations: PlacedDecoration[],
  buildingOccupancyMask: boolean[][],
  options: DecorationSuggestOptions = {}
): PlacedDecoration[] {
  const ringDepth = options.ringDepth ?? 5;
  const maxCount = options.maxCount ?? 60;

  if (buildings.length === 0) return [];

  const analysis = computeDeploymentAnalysis(buildings);
  const decorationMask = buildDecorationOccupancyMask(existingDecorations);

  // Bounding box of everything already placed, expanded by ringDepth — keeps
  // suggestions hugging the built area instead of scattering across the whole
  // empty 44x44 map.
  let minX = GRID_SIZE, minY = GRID_SIZE, maxX = 0, maxY = 0;
  for (const b of buildings) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + 1);
    maxY = Math.max(maxY, b.y + 1);
  }
  const boxMinX = Math.max(0, minX - ringDepth);
  const boxMinY = Math.max(0, minY - ringDepth);
  const boxMaxX = Math.min(GRID_SIZE - 1, maxX + ringDepth);
  const boxMaxY = Math.min(GRID_SIZE - 1, maxY + ringDepth);

  // Small decorations (1x1) are far more likely to fit checkerboard gaps than
  // 2x2 ones — try small items first, then use the remaining/larger candidate
  // tiles for bigger set-pieces so the suggestion count doesn't collapse to 0
  // on tightly packed bases.
  const smallDefs = DECORATIONS_CATALOG.filter((d) => d.width === 1 && d.height === 1);
  const bigDefs = DECORATIONS_CATALOG.filter((d) => d.width > 1 || d.height > 1);

  const suggestions: PlacedDecoration[] = [];
  let cycle = 0;

  const tryPlace = (x: number, y: number, def: DecorationDef): boolean => {
    if (!isDecorationPlacementFree(buildingOccupancyMask, decorationMask, x, y, def.width, def.height)) return false;
    const placed: PlacedDecoration = {
      instanceId: `deco-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      decorationId: def.id,
      x,
      y,
    };
    suggestions.push(placed);
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) decorationMask[y + r][x + c] = true;
    }
    return true;
  };

  // Checkerboard sampling (step 2) keeps the frame looking deliberate/spaced
  // instead of a solid wall-to-wall carpet of decorations.
  for (let y = boxMinY; y <= boxMaxY && suggestions.length < maxCount; y++) {
    for (let x = boxMinX; x <= boxMaxX && suggestions.length < maxCount; x++) {
      if ((x + y) % 2 !== 0) continue;
      const regionType = analysis.regionTypeGrid[y]?.[x];
      if (regionType !== "external") continue;
      if (buildingOccupancyMask[y][x] || decorationMask[y][x]) continue;

      const useBig = bigDefs.length > 0 && cycle % 4 === 3;
      const pool = useBig ? bigDefs : smallDefs;
      const def = pool[cycle % pool.length] ?? smallDefs[0];
      if (def && tryPlace(x, y, def)) cycle++;
    }
  }

  return suggestions;
}
