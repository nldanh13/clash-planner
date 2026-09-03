import { describe, expect, it } from "vitest";
import {
  HOME_VILLAGE_DEPLOYMENT_RULES,
  computeDeploymentAnalysis,
  computeDeploymentMasks,
  classifyDeploymentRegions,
  getFootprintGap,
  CRITICAL_HOLE_TH_DISTANCE,
} from "./deploymentZones";
import type { PlacedBuilding } from "./types";

function countTrue(mask: boolean[][]): number {
  let n = 0;
  for (const row of mask) for (const v of row) if (v) n++;
  return n;
}

function b(instanceId: string, buildingId: string, x: number, y: number): PlacedBuilding {
  return { instanceId, buildingId, x, y };
}

describe("deploymentZones ruleset", () => {
  it("HOME_VILLAGE_DEPLOYMENT_RULES classifies every real catalog category exactly once", () => {
    const all = ["defense", "resource", "army", "trap", "wall", "hero"];
    for (const cat of all) {
      const inBlocking = HOME_VILLAGE_DEPLOYMENT_RULES.blockingCategories.includes(cat as any);
      const inNonBlocking = HOME_VILLAGE_DEPLOYMENT_RULES.nonBlockingCategories.includes(cat as any);
      expect(inBlocking !== inNonBlocking).toBe(true); // exactly one of the two
    }
  });
});

describe("deployment block mask sizing (radius=1, chebyshev)", () => {
  it("a 2x2 building (air-sweeper) away from the border creates a 4x4 blocked mask", () => {
    const buildings = [b("1", "air-sweeper", 20, 20)]; // 2x2
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(countTrue(deploymentBlockMask)).toBe(4 * 4);
  });

  it("a 3x3 building (cannon) away from the border creates a 5x5 blocked mask", () => {
    const buildings = [b("1", "cannon", 20, 20)]; // 3x3
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(countTrue(deploymentBlockMask)).toBe(5 * 5);
  });

  it("a 4x4 building (town-hall) away from the border creates a 6x6 blocked mask", () => {
    const buildings = [b("1", "town-hall", 20, 20)]; // 4x4
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(countTrue(deploymentBlockMask)).toBe(6 * 6);
  });

  it("a 3x3 building pinned at the map corner (0,0) is clipped to 4x4 instead of 5x5", () => {
    const buildings = [b("1", "cannon", 0, 0)];
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(countTrue(deploymentBlockMask)).toBe(4 * 4);
  });

  it("a single 1x1 wall segment blocks exactly a 3x3 halo away from the border", () => {
    const buildings = [b("1", "wall", 20, 20)];
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(countTrue(deploymentBlockMask)).toBe(3 * 3);
  });
});

describe("halo overlap and category rules", () => {
  it("two adjacent buildings' overlapping halos are merged, never double counted", () => {
    // Two 3x3 cannons touching edge-to-edge (gap 0): union area must be strictly
    // less than the sum of two independent 5x5 halos (25 + 25 = 50).
    const buildings = [b("1", "cannon", 20, 20), b("2", "cannon", 23, 20)];
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    const unionCount = countTrue(deploymentBlockMask);
    expect(unionCount).toBeLessThan(50);
    expect(unionCount).toBeGreaterThan(25); // still bigger than a single halo
  });

  it("overlapping halos never cause a placement-style rejection (only occupancy does)", () => {
    // Two buildings close enough that their halos fully overlap must still both
    // be represented in deploymentBlockMask without throwing or corrupting the mask.
    const buildings = [b("1", "cannon", 20, 20), b("2", "archer-tower", 21, 20)]; // overlapping footprints not tested here, just halo math
    expect(() => computeDeploymentMasks(buildings)).not.toThrow();
  });

  it("a wall tile creates a deployment block (including its own tile)", () => {
    const buildings = [b("1", "wall", 25, 25)];
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(deploymentBlockMask[25][25]).toBe(true);
  });

  it("a trap does not create any deployment block, not even on its own tile", () => {
    const buildings = [b("1", "bomb", 25, 25)]; // trap category
    const { deploymentBlockMask } = computeDeploymentMasks(buildings);
    expect(countTrue(deploymentBlockMask)).toBe(0);
    expect(deploymentBlockMask[25][25]).toBe(false);
  });
});

describe("getFootprintGap (edge-to-edge, not center distance)", () => {
  it("computes horizontal gap between two same-row rects", () => {
    const gap = getFootprintGap({ x: 0, y: 0, width: 3, height: 3 }, { x: 6, y: 0, width: 3, height: 3 });
    expect(gap.horizontalGap).toBe(3);
    expect(gap.verticalGap).toBe(0);
    expect(gap.chebyshevGap).toBe(3);
  });

  it("computes vertical gap between two same-column rects", () => {
    const gap = getFootprintGap({ x: 0, y: 0, width: 3, height: 3 }, { x: 0, y: 6, width: 3, height: 3 });
    expect(gap.verticalGap).toBe(3);
    expect(gap.horizontalGap).toBe(0);
    expect(gap.chebyshevGap).toBe(3);
  });

  it("computes diagonal gap as the max of the two axis gaps", () => {
    const gap = getFootprintGap({ x: 0, y: 0, width: 3, height: 3 }, { x: 6, y: 8, width: 3, height: 3 });
    expect(gap.horizontalGap).toBe(3);
    expect(gap.verticalGap).toBe(5);
    expect(gap.chebyshevGap).toBe(5);
  });

  it("returns 0 for touching or overlapping rects", () => {
    const gap = getFootprintGap({ x: 0, y: 0, width: 3, height: 3 }, { x: 3, y: 0, width: 3, height: 3 });
    expect(gap.chebyshevGap).toBe(0);
  });

  it("handles rects of different sizes correctly", () => {
    const gap = getFootprintGap({ x: 0, y: 0, width: 4, height: 4 }, { x: 7, y: 0, width: 1, height: 1 });
    expect(gap.horizontalGap).toBe(3);
  });
});

describe("gap-coverage rule (0/1/2/3 empty tiles between two 1x1 walls)", () => {
  const y = 30;

  it("0 empty tiles: no deployable hole possible (fully touching)", () => {
    const buildings = [b("1", "wall", 10, y), b("2", "wall", 11, y)];
    const { deploymentAllowedMask } = computeDeploymentMasks(buildings);
    // No tile strictly between them since gap is 0.
    expect(deploymentAllowedMask[y][10]).toBe(false);
    expect(deploymentAllowedMask[y][11]).toBe(false);
  });

  it("1 empty tile is fully covered by the two halos", () => {
    const buildings = [b("1", "wall", 10, y), b("2", "wall", 12, y)];
    const { deploymentAllowedMask } = computeDeploymentMasks(buildings);
    expect(deploymentAllowedMask[y][11]).toBe(false);
  });

  it("2 empty tiles are fully covered (each halo reaches one tile in)", () => {
    const buildings = [b("1", "wall", 10, y), b("2", "wall", 13, y)];
    const { deploymentAllowedMask } = computeDeploymentMasks(buildings);
    expect(deploymentAllowedMask[y][11]).toBe(false);
    expect(deploymentAllowedMask[y][12]).toBe(false);
  });

  it("3 empty tiles leave a deployable gap tile in the middle", () => {
    const buildings = [b("1", "wall", 10, y), b("2", "wall", 14, y)];
    const { deploymentAllowedMask } = computeDeploymentMasks(buildings);
    expect(deploymentAllowedMask[y][11]).toBe(false); // covered by left wall
    expect(deploymentAllowedMask[y][13]).toBe(false); // covered by right wall
    expect(deploymentAllowedMask[y][12]).toBe(true); // NOT covered by either — a deploy tile
  });
});

describe("region classification (flood fill on deploymentAllowedMask)", () => {
  it("classifies the open field as a single external region touching the border", () => {
    const buildings: PlacedBuilding[] = [];
    const masks = computeDeploymentMasks(buildings);
    const { regions } = classifyDeploymentRegions(masks, buildings);
    expect(regions.length).toBe(1);
    expect(regions[0].type).toBe("external");
    expect(regions[0].touchesBorder).toBe(true);
  });

  it("detects a single-tile internal hole fully enclosed by a wall ring", () => {
    const buildings: PlacedBuilding[] = [];
    let id = 1;
    // Hollow 5x5 wall ring from (10,10) to (14,14): perimeter only.
    for (let x = 10; x <= 14; x++) {
      buildings.push(b(`w${id++}`, "wall", x, 10));
      buildings.push(b(`w${id++}`, "wall", x, 14));
    }
    for (let y = 11; y <= 13; y++) {
      buildings.push(b(`w${id++}`, "wall", 10, y));
      buildings.push(b(`w${id++}`, "wall", 14, y));
    }

    const masks = computeDeploymentMasks(buildings);
    const { regions, regionTypeGrid } = classifyDeploymentRegions(masks, buildings);

    const holes = regions.filter((r) => r.type === "internal-hole");
    expect(holes.length).toBe(1);
    expect(holes[0].size).toBe(1);
    expect(holes[0].cells[0]).toEqual({ x: 12, y: 12 });
    expect(regionTypeGrid[12][12]).toBe("internal-hole");
    expect(holes[0].touchesBorder).toBe(false);
  });

  it("assigns higher severity distance context to a hole near the Town Hall than one far away", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    let id = 1;

    // 5x5 hollow wall rings (perimeter only) leave exactly one deployable tile
    // dead-center (radius-1 halo cannot reach a cell 2 tiles from every wall).
    function addRing(originX: number, originY: number, prefix: string) {
      for (let x = originX; x <= originX + 4; x++) {
        buildings.push(b(`${prefix}${id++}`, "wall", x, originY));
        buildings.push(b(`${prefix}${id++}`, "wall", x, originY + 4));
      }
      for (let y = originY + 1; y <= originY + 3; y++) {
        buildings.push(b(`${prefix}${id++}`, "wall", originX, y));
        buildings.push(b(`${prefix}${id++}`, "wall", originX + 4, y));
      }
    }

    addRing(15, 15, "n"); // near ring: hole center at (17,17)
    addRing(33, 33, "f"); // far ring: hole center at (35,35)

    const analysis = computeDeploymentAnalysis(buildings);
    expect(analysis.internalHoleCount).toBe(2);

    const holes = analysis.regions.filter((r) => r.type === "internal-hole");
    const nearHole = holes.find((r) => r.cells[0].x === 17 && r.cells[0].y === 17)!;
    const farHole = holes.find((r) => r.cells[0].x === 35 && r.cells[0].y === 35)!;

    expect(nearHole.minDistanceToTownHall).not.toBeNull();
    expect(farHole.minDistanceToTownHall).not.toBeNull();
    expect(nearHole.minDistanceToTownHall!).toBeLessThan(farHole.minDistanceToTownHall!);
    expect(nearHole.minDistanceToTownHall!).toBeLessThanOrEqual(CRITICAL_HOLE_TH_DISTANCE);
    expect(farHole.minDistanceToTownHall!).toBeGreaterThan(CRITICAL_HOLE_TH_DISTANCE);
    expect(analysis.criticalHoleCount).toBe(1);
    expect(analysis.nearestHoleToTownHall).toBe(nearHole.minDistanceToTownHall);
  });
});

describe("computeDeploymentAnalysis aggregate metrics", () => {
  it("deploymentCoverageRatio is computed from the merged mask, not summed footprints", () => {
    const buildings = [b("1", "cannon", 20, 20), b("2", "cannon", 23, 20)]; // overlapping halos
    const analysis = computeDeploymentAnalysis(buildings);
    const totalTiles = HOME_VILLAGE_DEPLOYMENT_RULES.mapWidth * HOME_VILLAGE_DEPLOYMENT_RULES.mapHeight;
    expect(analysis.blockedTileCount + analysis.allowedTileCount).toBe(totalTiles);
    expect(analysis.deploymentCoverageRatio).toBeCloseTo(analysis.blockedTileCount / totalTiles, 10);
  });

  it("an empty layout has zero blocked tiles and one fully external region", () => {
    const analysis = computeDeploymentAnalysis([]);
    expect(analysis.blockedTileCount).toBe(0);
    expect(analysis.internalHoleCount).toBe(0);
    expect(analysis.corridorCount).toBe(0);
    expect(analysis.nearestHoleToTownHall).toBeNull();
  });

  it("still computes a mask correctly for a layout with no version metadata (legacy import)", () => {
    // Deployment masks are derived purely from buildings + catalog, so an
    // imported legacy layout (no deploymentRulesVersion stamped on it) still
    // produces a valid, versioned analysis on the current ruleset.
    const legacyBuildings = [b("1", "town-hall", 20, 20), b("2", "cannon", 10, 10)];
    const analysis = computeDeploymentAnalysis(legacyBuildings);
    expect(analysis.rulesetVersion).toBe(HOME_VILLAGE_DEPLOYMENT_RULES.version);
    expect(analysis.blockedTileCount).toBeGreaterThan(0);
  });
});
