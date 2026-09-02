import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import type { BuildingDef, PlacedBuilding } from "./types";

/**
 * Type for the 44x44 Occupancy Grid Matrix
 * Each cell holds a reference to the PlacedBuilding occupying it, or null if empty.
 */
export type GridOccupancyMatrix = (PlacedBuilding | null)[][];

/**
 * Initializes an empty 44x44 grid matrix
 */
export function createEmptyGridMatrix(): GridOccupancyMatrix {
  const matrix: GridOccupancyMatrix = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = new Array<PlacedBuilding | null>(GRID_SIZE).fill(null);
    matrix.push(row);
  }
  return matrix;
}

/**
 * Builds the 44x44 Spatial Occupancy Matrix from an array of PlacedBuildings.
 * Runs in O(N) where N is the number of buildings.
 */
export function buildOccupancyMatrix(buildings: PlacedBuilding[]): GridOccupancyMatrix {
  const matrix = createEmptyGridMatrix();

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def) continue;

    const w = def.width;
    const h = def.height;
    const maxX = Math.min(GRID_SIZE, b.x + w);
    const maxY = Math.min(GRID_SIZE, b.y + h);

    for (let r = Math.max(0, b.y); r < maxY; r++) {
      for (let c = Math.max(0, b.x); c < maxX; c++) {
        matrix[r][c] = b;
      }
    }
  }

  return matrix;
}

/**
 * O(1) Fast Collision & Validity Checker using the in-memory 2D Grid Matrix.
 * Instead of looping through all 400+ objects, this only inspects the (w * h) cells
 * at target coordinates [x .. x+w-1, y .. y+h-1] (at most 16 array lookups!).
 */
export function canPlaceBuildingFast(
  matrix: GridOccupancyMatrix,
  buildingId: string,
  x: number,
  y: number,
  ignoreInstanceId?: string | null
): { valid: boolean; reason?: "out_of_bounds" | "overlap" } {
  const def = BUILDINGS_BY_ID.get(buildingId);
  if (!def) return { valid: false, reason: "out_of_bounds" };

  const w = def.width;
  const h = def.height;

  // Boundary check
  if (x < 0 || y < 0 || x + w > GRID_SIZE || y + h > GRID_SIZE) {
    return { valid: false, reason: "out_of_bounds" };
  }

  // Fast O(1) cell occupancy lookup
  for (let r = y; r < y + h; r++) {
    for (let c = x; c < x + w; c++) {
      const occupant = matrix[r][c];
      if (occupant !== null) {
        if (ignoreInstanceId && occupant.instanceId === ignoreInstanceId) {
          continue;
        }
        return { valid: false, reason: "overlap" };
      }
    }
  }

  return { valid: true };
}

/**
 * O(1) Fast lookup of the building at cell (x, y)
 */
export function getBuildingAtCell(
  matrix: GridOccupancyMatrix,
  x: number,
  y: number
): PlacedBuilding | null {
  if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
  return matrix[y][x];
}
