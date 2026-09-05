import { describe, expect, it } from "vitest";
import { computeDeploymentMasks, readCell, writeCell } from "./deploymentZones";
import { DECORATIONS_BY_ID, DECORATIONS_CATALOG } from "./decorationCatalog";
import {
  buildDecorationOccupancyMask,
  isDecorationPlacementFree,
  suggestDecorationPlacements,
} from "./decorationUtils";
import type { PlacedBuilding, PlacedDecoration } from "./types";

function b(instanceId: string, buildingId: string, x: number, y: number): PlacedBuilding {
  return { instanceId, buildingId, x, y };
}

function d(instanceId: string, decorationId: string, x: number, y: number): PlacedDecoration {
  return { instanceId, decorationId, x, y };
}

describe("decoration catalog", () => {
  it("every entry has a positive size and is resolvable by id", () => {
    for (const def of DECORATIONS_CATALOG) {
      expect(def.width).toBeGreaterThan(0);
      expect(def.height).toBeGreaterThan(0);
      expect(DECORATIONS_BY_ID.get(def.id)).toBe(def);
    }
  });
});

describe("buildDecorationOccupancyMask", () => {
  it("marks the full footprint of a 2x2 decoration", () => {
    const mask = buildDecorationOccupancyMask([d("1", "deco-statue", 10, 10)]);
    expect(readCell(mask, 10, 10)).toBe(true);
    expect(readCell(mask, 11, 10)).toBe(true);
    expect(readCell(mask, 10, 11)).toBe(true);
    expect(readCell(mask, 11, 11)).toBe(true);
    expect(readCell(mask, 10, 9)).toBe(false);
  });
});

describe("isDecorationPlacementFree", () => {
  it("rejects a tile occupied by a real building", () => {
    const { occupancyMask } = computeDeploymentMasks([b("th", "town-hall", 20, 20)]);
    const decoMask = buildDecorationOccupancyMask([]);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, 20, 20, 1, 1)).toBe(false);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, 0, 0, 1, 1)).toBe(true);
  });

  it("rejects a tile occupied by another decoration", () => {
    const { occupancyMask } = computeDeploymentMasks([]);
    const decoMask = buildDecorationOccupancyMask([d("1", "deco-pine-tree", 5, 5)]);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, 5, 5, 1, 1)).toBe(false);
  });

  it("allows decorations into the 3-tile grass border beyond the buildable grid", () => {
    // Unlike buildings, decorations may extend into the border ring (real
    // Clash of Clans lets you place trees/statues right up to the map edge).
    const { occupancyMask } = computeDeploymentMasks([]);
    const decoMask = buildDecorationOccupancyMask([]);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, 43, 43, 2, 2)).toBe(true);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, -1, 0, 1, 1)).toBe(true);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, -3, -3, 1, 1)).toBe(true);
  });

  it("rejects placements beyond the true 50x50 map edge", () => {
    const { occupancyMask } = computeDeploymentMasks([]);
    const decoMask = buildDecorationOccupancyMask([]);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, -4, 0, 1, 1)).toBe(false);
    expect(isDecorationPlacementFree(occupancyMask, decoMask, 46, 0, 2, 1)).toBe(false);
  });
});

describe("suggestDecorationPlacements", () => {
  it("returns nothing for an empty base (no buildings to frame)", () => {
    const suggestions = suggestDecorationPlacements([], [], buildDecorationOccupancyMask([]));
    expect(suggestions).toEqual([]);
  });

  it("suggests only tiles outside the building/wall footprint", () => {
    const buildings: PlacedBuilding[] = [
      b("th", "town-hall", 20, 20),
      b("c1", "cannon", 16, 16),
    ];
    const { occupancyMask } = computeDeploymentMasks(buildings);
    const suggestions = suggestDecorationPlacements(buildings, [], occupancyMask);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      const def = DECORATIONS_BY_ID.get(s.decorationId)!;
      for (let r = 0; r < def.height; r++) {
        for (let c = 0; c < def.width; c++) {
          expect(readCell(occupancyMask, s.x + c, s.y + r)).toBe(false);
        }
      }
    }
  });

  it("never suggests two decorations overlapping each other", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    const { occupancyMask } = computeDeploymentMasks(buildings);
    const suggestions = suggestDecorationPlacements(buildings, [], occupancyMask, { maxCount: 40 });
    const mask = buildDecorationOccupancyMask([]);
    for (const s of suggestions) {
      const def = DECORATIONS_BY_ID.get(s.decorationId)!;
      for (let r = 0; r < def.height; r++) {
        for (let c = 0; c < def.width; c++) {
          expect(readCell(mask, s.x + c, s.y + r)).toBe(false);
          writeCell(mask, s.x + c, s.y + r, true);
        }
      }
    }
  });

  it("skips tiles already covered by existing decorations", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    const { occupancyMask } = computeDeploymentMasks(buildings);
    const existing = [d("pre-1", "deco-pine-tree", 19, 15)];
    const suggestions = suggestDecorationPlacements(buildings, existing, occupancyMask);
    for (const s of suggestions) {
      expect(s.x === 19 && s.y === 15).toBe(false);
    }
  });

  it("respects the maxCount cap", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    const { occupancyMask } = computeDeploymentMasks(buildings);
    const suggestions = suggestDecorationPlacements(buildings, [], occupancyMask, { maxCount: 5 });
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });
});
