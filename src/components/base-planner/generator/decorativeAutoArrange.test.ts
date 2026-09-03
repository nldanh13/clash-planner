import { describe, expect, it } from "vitest";
import { getTownHallCatalog } from "../catalog";
import { BUILDINGS_BY_ID, GRID_SIZE } from "../constants";
import { autoArrangeRemainingBuildings } from "./decorativeAutoArrange";
import type { PlacedBuilding } from "../types";

function b(instanceId: string, buildingId: string, x: number, y: number, level?: number): PlacedBuilding {
  return { instanceId, buildingId, x, y, level };
}

function hasOverlap(buildings: PlacedBuilding[]): boolean {
  const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (const bld of buildings) {
    const def = BUILDINGS_BY_ID.get(bld.buildingId);
    if (!def) continue;
    for (let r = 0; r < def.height; r++) {
      for (let c = 0; c < def.width; c++) {
        const idx = (bld.y + r) * GRID_SIZE + (bld.x + c);
        if (grid[idx] !== 0) return true;
        grid[idx] = 1;
      }
    }
  }
  return false;
}

describe("autoArrangeRemainingBuildings", () => {
  it("fills every required non-wall building for a bare Town-Hall-only TH3 layout", () => {
    const start = [b("th", "town-hall", 20, 20)];
    const result = autoArrangeRemainingBuildings(start, 3);

    const finalCounts: Record<string, number> = {};
    for (const bld of result.buildings) finalCounts[bld.buildingId] = (finalCounts[bld.buildingId] || 0) + 1;

    const required = getTownHallCatalog(3).filter((e) => e.requiredInLayout && e.category !== "wall");
    for (const entry of required) {
      expect(finalCounts[entry.buildingId] || 0).toBe(entry.count);
    }
    expect(result.skippedCount).toBe(0);
  });

  it("never produces overlapping footprints", () => {
    const start = [b("th", "town-hall", 20, 20)];
    const result = autoArrangeRemainingBuildings(start, 9);
    expect(hasOverlap(result.buildings)).toBe(false);
  });

  it("preserves the original buildings array untouched, including `level`", () => {
    const start = [b("th", "town-hall", 20, 20, 3)];
    const result = autoArrangeRemainingBuildings(start, 3);
    const th = result.buildings.find((bld) => bld.buildingId === "town-hall");
    expect(th?.level).toBe(3);
    expect(th?.x).toBe(20);
    expect(th?.y).toBe(20);
  });

  it("only tops up what's missing when some required buildings already exist", () => {
    const start = [b("th", "town-hall", 20, 20), b("c1", "cannon", 10, 10)];
    const result = autoArrangeRemainingBuildings(start, 3);
    const cannonCount = result.buildings.filter((bld) => bld.buildingId === "cannon").length;
    const required = getTownHallCatalog(3).find((e) => e.buildingId === "cannon")!;
    expect(cannonCount).toBe(required.count);
    // the pre-existing cannon instance must survive unmoved
    expect(result.buildings.some((bld) => bld.instanceId === "c1" && bld.x === 10 && bld.y === 10)).toBe(true);
  });

  it("does not add any wall tiles", () => {
    const start = [b("th", "town-hall", 20, 20)];
    const result = autoArrangeRemainingBuildings(start, 5);
    expect(result.buildings.some((bld) => bld.buildingId === "wall")).toBe(false);
  });

  it("reports skipped buildings instead of throwing when there's no free space", () => {
    // Fill nearly the whole grid with walls to starve the packer of space.
    const walls: PlacedBuilding[] = [];
    let n = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (x < 5 && y < 5) continue; // leave a tiny 5x5 pocket for the Town Hall
        walls.push(b(`w${n++}`, "wall", x, y));
      }
    }
    const start = [b("th", "town-hall", 0, 0), ...walls];
    expect(() => autoArrangeRemainingBuildings(start, 9)).not.toThrow();
    const result = autoArrangeRemainingBuildings(start, 9);
    expect(result.skippedCount).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
