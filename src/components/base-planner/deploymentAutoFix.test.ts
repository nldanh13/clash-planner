import { describe, expect, it } from "vitest";
import { suggestDeploymentAutoFix } from "./deploymentAutoFix";
import { computeDeploymentAnalysis } from "./deploymentZones";
import { BUILDINGS_BY_ID } from "./constants";
import type { PlacedBuilding } from "./types";

function b(instanceId: string, buildingId: string, x: number, y: number): PlacedBuilding {
  return { instanceId, buildingId, x, y };
}

/** Hollow 5x5 wall ring (perimeter only) — leaves exactly one internal-hole tile dead-center. */
function buildRing(originX: number, originY: number, buildings: PlacedBuilding[], prefix = "w"): void {
  let id = 1;
  for (let x = originX; x <= originX + 4; x++) {
    buildings.push(b(`${prefix}${id++}`, "wall", x, originY));
    buildings.push(b(`${prefix}${id++}`, "wall", x, originY + 4));
  }
  for (let y = originY + 1; y <= originY + 3; y++) {
    buildings.push(b(`${prefix}${id++}`, "wall", originX, y));
    buildings.push(b(`${prefix}${id++}`, "wall", originX + 4, y));
  }
}

function hasOverlap(buildings: PlacedBuilding[]): boolean {
  for (let i = 0; i < buildings.length; i++) {
    const a = buildings[i];
    const aDef = BUILDINGS_BY_ID.get(a.buildingId)!;
    for (let j = i + 1; j < buildings.length; j++) {
      const c = buildings[j];
      const cDef = BUILDINGS_BY_ID.get(c.buildingId)!;
      const overlap =
        a.x < c.x + cDef.width && a.x + aDef.width > c.x && a.y < c.y + cDef.height && a.y + aDef.height > c.y;
      if (overlap) return true;
    }
  }
  return false;
}

describe("suggestDeploymentAutoFix", () => {
  it("closes a wall-ring internal hole by nudging one wall segment, with no overlaps", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 30, 30)]; // far away, doesn't interfere
    buildRing(10, 10, buildings);

    const before = computeDeploymentAnalysis(buildings);
    expect(before.internalHoleCount).toBe(1);

    const result = suggestDeploymentAutoFix(buildings, 11, "war");

    expect(result.applied).toBe(true);
    expect(result.resolvedHoleCount).toBeGreaterThanOrEqual(1);
    expect(result.changedInstanceIds.length).toBeGreaterThanOrEqual(1);
    expect(result.after.internalHoleCount).toBeLessThan(result.before.internalHoleCount);

    // Same building count — only moved, never added/removed.
    expect(result.updatedBuildings.length).toBe(buildings.length);
    // Every instanceId from the input is still present exactly once.
    const beforeIds = new Set(buildings.map((x) => x.instanceId));
    const afterIds = result.updatedBuildings.map((x) => x.instanceId);
    expect(new Set(afterIds)).toEqual(beforeIds);
    expect(afterIds.length).toBe(new Set(afterIds).size); // no duplicates

    expect(hasOverlap(result.updatedBuildings)).toBe(false);
  });

  it("never moves the Town Hall", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 30, 30)];
    buildRing(10, 10, buildings);
    const result = suggestDeploymentAutoFix(buildings, 11, "war");
    const th = result.updatedBuildings.find((x) => x.instanceId === "th")!;
    expect(th.x).toBe(30);
    expect(th.y).toBe(30);
  });

  it("does not apply anything for a layout with no internal holes", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20), b("c1", "cannon", 10, 10)];
    const result = suggestDeploymentAutoFix(buildings, 11, "war");
    expect(result.applied).toBe(false);
    expect(result.updatedBuildings).toBe(buildings); // untouched, same reference
    expect(result.changedInstanceIds.length).toBe(0);
  });

  it("is a no-op for Showcase bases even with an internal hole (intentional pocket)", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 30, 30)];
    buildRing(10, 10, buildings);
    const result = suggestDeploymentAutoFix(buildings, 11, "showcase");
    expect(result.applied).toBe(false);
  });
});
