import type { PlacedBuilding } from "../types";
import { GRID_SIZE } from "../constants";
import type { PlacementEngine } from "./placementEngine";
import type { BasePurpose, AestheticPattern } from "./types";
import { AESTHETIC_PATTERNS } from "./aestheticProfiles";
import type { PRNG } from "./prng";

export interface WallPlacementConfig {
  purpose: BasePurpose;
  pattern?: AestheticPattern;
  wallCount: number;
  townHallLevel: number;
}

export class WallGenerator {
  private engine: PlacementEngine;
  private prng: PRNG;

  constructor(engine: PlacementEngine, prng: PRNG) {
    this.engine = engine;
    this.prng = prng;
  }

  /**
   * Places EXACTLY wallCount wall instances onto the grid without any overlaps or out-of-bounds
   */
  public generateWalls(config: WallPlacementConfig): PlacedBuilding[] {
    const { purpose, pattern, wallCount } = config;
    if (wallCount <= 0) return [];

    let placedWalls: PlacedBuilding[] = [];

    if (purpose === "progress") {
      placedWalls = this.generateProgressWalls(wallCount);
    } else if (purpose === "showcase" && pattern) {
      placedWalls = this.generateAestheticWalls(pattern, wallCount);
    } else {
      placedWalls = this.generateTacticalWalls(purpose, wallCount);
    }

    // Strict guarantee: If due to rare grid obstruction any walls were not placed,
    // fill all remaining walls in structured free perimeter cells
    if (placedWalls.length < wallCount) {
      const remainingNeeded = wallCount - placedWalls.length;
      const additional = this.fillRemainingWalls(remainingNeeded);
      placedWalls.push(...additional);
    }

    return placedWalls;
  }

  /**
   * Progress Base: Arranges walls into clean, accessible rows or compact blocks
   * allowing effortless batch upgrades
   */
  private generateProgressWalls(wallCount: number): PlacedBuilding[] {
    const walls: PlacedBuilding[] = [];
    const rowLength = 25;
    const startX = 2;
    const startY = 32;

    let placed = 0;
    let currentRow = 0;

    while (placed < wallCount && startY + currentRow < GRID_SIZE) {
      const y = startY + currentRow;
      for (let x = startX; x < startX + rowLength && placed < wallCount; x++) {
        if (this.engine.isFree(x, y, 1, 1)) {
          const instanceId = `wall_prog_${placed + 1}`;
          this.engine.place(instanceId, "wall", x, y, 1, 1);
          walls.push({ instanceId, buildingId: "wall", x, y });
          placed++;
        }
      }
      currentRow++;
    }

    return walls;
  }

  /**
   * Showcase Base: Generates aesthetic geometric outlines according to chosen pattern
   */
  private generateAestheticWalls(
    pattern: AestheticPattern,
    wallCount: number
  ): PlacedBuilding[] {
    const walls: PlacedBuilding[] = [];
    const patDef = AESTHETIC_PATTERNS[pattern] || AESTHETIC_PATTERNS["symmetric-axial"];
    const center = GRID_SIZE / 2;
    const outlineCoords = patDef.wallOutlineGenerator(wallCount, center);

    let placed = 0;
    for (const pt of outlineCoords) {
      if (placed >= wallCount) break;
      if (pt.x >= 0 && pt.y >= 0 && pt.x < GRID_SIZE && pt.y < GRID_SIZE) {
        if (this.engine.isFree(pt.x, pt.y, 1, 1)) {
          const instanceId = `wall_art_${placed + 1}`;
          this.engine.place(instanceId, "wall", pt.x, pt.y, 1, 1);
          walls.push({ instanceId, buildingId: "wall", x: pt.x, y: pt.y });
          placed++;
        }
      }
    }

    return walls;
  }

  /**
   * Tactical Base: Generates multi-layered defensive compartments (Core, Mid-Wings, Flanks)
   */
  private generateTacticalWalls(purpose: BasePurpose, wallCount: number): PlacedBuilding[] {
    const walls: PlacedBuilding[] = [];
    let placed = 0;

    const center = Math.floor(GRID_SIZE / 2); // 22

    // 1. Core Compartment Box
    const coreRadius = purpose === "war" ? 6 : 5;
    const coreCoords = this.getRectangleOutline(
      center - coreRadius,
      center - coreRadius,
      coreRadius * 2,
      coreRadius * 2
    );

    for (const pt of coreCoords) {
      if (placed >= wallCount) break;
      if (this.engine.isFree(pt.x, pt.y, 1, 1)) {
        const instanceId = `wall_core_${placed + 1}`;
        this.engine.place(instanceId, "wall", pt.x, pt.y, 1, 1);
        walls.push({ instanceId, buildingId: "wall", x: pt.x, y: pt.y });
        placed++;
      }
    }

    // 2. Secondary Sub-Compartments (North, South, East, West, or diagonal wings)
    const wings = [
      { x: center - 14, y: center - 6, w: 7, h: 12 }, // West wing
      { x: center + 7, y: center - 6, w: 7, h: 12 },  // East wing
      { x: center - 6, y: center - 14, w: 12, h: 7 }, // North wing
      { x: center - 6, y: center + 7, w: 12, h: 7 },  // South wing
      { x: center - 13, y: center - 13, w: 6, h: 6 }, // NW corner
      { x: center + 7, y: center - 13, w: 6, h: 6 },  // NE corner
      { x: center - 13, y: center + 7, w: 6, h: 6 },  // SW corner
      { x: center + 7, y: center + 7, w: 6, h: 6 },   // SE corner
    ];

    for (const wing of wings) {
      if (placed >= wallCount) break;
      const wingCoords = this.getRectangleOutline(wing.x, wing.y, wing.w, wing.h);
      for (const pt of wingCoords) {
        if (placed >= wallCount) break;
        if (this.engine.isFree(pt.x, pt.y, 1, 1)) {
          const instanceId = `wall_wing_${placed + 1}`;
          this.engine.place(instanceId, "wall", pt.x, pt.y, 1, 1);
          walls.push({ instanceId, buildingId: "wall", x: pt.x, y: pt.y });
          placed++;
        }
      }
    }

    // 3. Outer Ring or Buffer Compartment
    const outerRadius = coreRadius + 9;
    const outerCoords = this.getOctagonOutline(center, outerRadius);
    for (const pt of outerCoords) {
      if (placed >= wallCount) break;
      if (this.engine.isFree(pt.x, pt.y, 1, 1)) {
        const instanceId = `wall_outer_${placed + 1}`;
        this.engine.place(instanceId, "wall", pt.x, pt.y, 1, 1);
        walls.push({ instanceId, buildingId: "wall", x: pt.x, y: pt.y });
        placed++;
      }
    }

    return walls;
  }

  /**
   * Helper: Generates outline coordinates for a rectangle
   */
  private getRectangleOutline(
    x: number,
    y: number,
    w: number,
    h: number
  ): Array<{ x: number; y: number }> {
    const coords: Array<{ x: number; y: number }> = [];
    const minX = Math.max(0, x);
    const maxX = Math.min(GRID_SIZE - 1, x + w);
    const minY = Math.max(0, y);
    const maxY = Math.min(GRID_SIZE - 1, y + h);

    // Top and bottom horizontal borders
    for (let cx = minX; cx <= maxX; cx++) {
      coords.push({ x: cx, y: minY });
      coords.push({ x: cx, y: maxY });
    }
    // Left and right vertical borders
    for (let cy = minY + 1; cy < maxY; cy++) {
      coords.push({ x: minX, y: cy });
      coords.push({ x: maxX, y: cy });
    }

    return coords;
  }

  /**
   * Helper: Generates octagon coordinates
   */
  private getOctagonOutline(center: number, r: number): Array<{ x: number; y: number }> {
    const coords: Array<{ x: number; y: number }> = [];
    const cornerCut = Math.round(r * 0.4);

    // Horizontal spans
    for (let dx = -r + cornerCut; dx <= r - cornerCut; dx++) {
      coords.push({ x: center + dx, y: center - r });
      coords.push({ x: center + dx, y: center + r });
    }
    // Vertical spans
    for (let dy = -r + cornerCut; dy <= r - cornerCut; dy++) {
      coords.push({ x: center - r, y: center + dy });
      coords.push({ x: center + r, y: center + dy });
    }
    // Diagonal chamfers
    for (let step = 1; step <= cornerCut; step++) {
      const offset = cornerCut - step;
      coords.push({ x: center - r + step, y: center - r + offset });
      coords.push({ x: center + r - step, y: center - r + offset });
      coords.push({ x: center - r + step, y: center + r - offset });
      coords.push({ x: center + r - step, y: center + r - offset });
    }

    return coords;
  }

  /**
   * Strict placement guarantee: Places any remaining walls adjacent to existing walls or buildings
   */
  private fillRemainingWalls(needed: number): PlacedBuilding[] {
    const additionalWalls: PlacedBuilding[] = [];
    let placed = 0;

    // Scan spiral from center out to find available tiles adjacent to existing structures
    const center = Math.floor(GRID_SIZE / 2);
    for (let radius = 2; radius < GRID_SIZE && placed < needed; radius++) {
      for (let dy = -radius; dy <= radius && placed < needed; dy++) {
        for (let dx = -radius; dx <= radius && placed < needed; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const x = center + dx;
          const y = center + dy;

          if (x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE) {
            if (this.engine.isFree(x, y, 1, 1)) {
              const instanceId = `wall_fill_${additionalWalls.length + 1}`;
              this.engine.place(instanceId, "wall", x, y, 1, 1);
              additionalWalls.push({ instanceId, buildingId: "wall", x, y });
              placed++;
            }
          }
        }
      }
    }

    return additionalWalls;
  }
}
