import type { PlacedBuilding } from "../types";
import { GRID_SIZE } from "../constants";
import { PRNG } from "./prng";

export class PlacementEngine {
  public readonly size: number = GRID_SIZE;
  private grid: Uint8Array;
  private buildings: PlacedBuilding[] = [];
  private prng: PRNG;

  constructor(prng: PRNG) {
    this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
    this.prng = prng;
  }

  public getBuildings(): PlacedBuilding[] {
    return [...this.buildings];
  }

  public isFree(x: number, y: number, w: number, h: number): boolean {
    if (x < 0 || y < 0 || x + w > this.size || y + h > this.size) {
      return false;
    }
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const idx = (y + r) * this.size + (x + c);
        if (this.grid[idx] !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  public place(
    instanceId: string,
    buildingId: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    if (!this.isFree(x, y, w, h)) {
      return false;
    }
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const idx = (y + r) * this.size + (x + c);
        this.grid[idx] = 1;
      }
    }
    this.buildings.push({ instanceId, buildingId, x, y });
    return true;
  }

  /**
   * Finds the nearest free position (x, y) to a target position using spiral expansion
   */
  public findNearestFree(
    targetX: number,
    targetY: number,
    w: number,
    h: number,
    maxDist: number = 30
  ): { x: number; y: number } | null {
    const clampedTargetX = Math.max(0, Math.min(this.size - w, Math.round(targetX)));
    const clampedTargetY = Math.max(0, Math.min(this.size - h, Math.round(targetY)));

    if (this.isFree(clampedTargetX, clampedTargetY, w, h)) {
      return { x: clampedTargetX, y: clampedTargetY };
    }

    const candidates: Array<{ x: number; y: number; dist: number }> = [];

    for (let radius = 1; radius <= maxDist; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = clampedTargetX + dx;
          const ny = clampedTargetY + dy;
          if (this.isFree(nx, ny, w, h)) {
            const dist = dx * dx + dy * dy;
            candidates.push({ x: nx, y: ny, dist });
          }
        }
      }
      if (candidates.length > 0) {
        // Sort by distance and pick best or slightly perturbed by PRNG
        candidates.sort((a, b) => a.dist - b.dist);
        const topPool = candidates.slice(0, Math.min(3, candidates.length));
        return this.prng.choice(topPool);
      }
    }

    // Fallback: scan whole grid
    for (let y = 0; y <= this.size - h; y++) {
      for (let x = 0; x <= this.size - w; x++) {
        if (this.isFree(x, y, w, h)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Finds an optimal position evaluated by a scoring function over candidate locations
   */
  public findBestPosition(
    w: number,
    h: number,
    scoreFn: (x: number, y: number) => number,
    box?: { minX: number; maxX: number; minY: number; maxY: number }
  ): { x: number; y: number } | null {
    const minX = Math.max(0, box ? box.minX : 0);
    const maxX = Math.min(this.size - w, box ? box.maxX : this.size - w);
    const minY = Math.max(0, box ? box.minY : 0);
    const maxY = Math.min(this.size - h, box ? box.maxY : this.size - h);

    let bestScore = -Infinity;
    let bestCandidates: Array<{ x: number; y: number }> = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.isFree(x, y, w, h)) {
          const score = scoreFn(x, y);
          if (score > bestScore) {
            bestScore = score;
            bestCandidates = [{ x, y }];
          } else if (Math.abs(score - bestScore) < 0.001) {
            bestCandidates.push({ x, y });
          }
        }
      }
    }

    if (bestCandidates.length === 0) {
      // Fallback outside box
      return this.findNearestFree(20, 20, w, h);
    }

    return this.prng.choice(bestCandidates);
  }

  /**
   * Returns distance between a prospective building (x, y, w, h) and other placed buildings
   */
  public minDistanceToCategory(
    x: number,
    y: number,
    w: number,
    h: number,
    filterFn: (b: PlacedBuilding) => boolean
  ): number {
    let minDist = Infinity;
    const cx = x + w / 2;
    const cy = y + h / 2;

    for (const b of this.buildings) {
      if (!filterFn(b)) continue;
      const bDefW = b.buildingId === "town-hall" || b.buildingId === "eagle-artillery" ? 4 : 3;
      const bcx = b.x + bDefW / 2;
      const bcy = b.y + bDefW / 2;
      const d = Math.hypot(cx - bcx, cy - bcy);
      if (d < minDist) minDist = d;
    }

    return minDist === Infinity ? 20 : minDist;
  }

  /**
   * Clears grid state
   */
  public reset(): void {
    this.grid.fill(0);
    this.buildings = [];
  }
}
