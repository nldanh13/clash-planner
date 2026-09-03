import { describe, expect, it } from "vitest";
import { computeDeploymentAnalysis } from "./deploymentZones";
import {
  classifyHoleSeverity,
  computeDeploymentRisk,
  getDeploymentWarnings,
  isDeploymentReadyForPurpose,
} from "./deploymentRisk";
import type { PlacedBuilding } from "./types";

function b(instanceId: string, buildingId: string, x: number, y: number): PlacedBuilding {
  return { instanceId, buildingId, x, y };
}

function buildRing(originX: number, originY: number, prefix: string, buildings: PlacedBuilding[], startId: number): number {
  let id = startId;
  for (let x = originX; x <= originX + 4; x++) {
    buildings.push(b(`${prefix}${id++}`, "wall", x, originY));
    buildings.push(b(`${prefix}${id++}`, "wall", x, originY + 4));
  }
  for (let y = originY + 1; y <= originY + 3; y++) {
    buildings.push(b(`${prefix}${id++}`, "wall", originX, y));
    buildings.push(b(`${prefix}${id++}`, "wall", originX + 4, y));
  }
  return id;
}

describe("classifyHoleSeverity", () => {
  it("marks a hole near the Town Hall critical for a War base", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", buildings, 1); // hole at (17,17), ~3 tiles from TH
    const analysis = computeDeploymentAnalysis(buildings);
    const hole = analysis.regions.find((r) => r.type === "internal-hole")!;
    const result = classifyHoleSeverity(hole, buildings, "war");
    expect(result.severity).toBe("critical");
    expect(result.displayType).toBe("internal-hole");
  });

  it("relabels the same hole as an intentional pocket (info only) for a Showcase base", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", buildings, 1);
    const analysis = computeDeploymentAnalysis(buildings);
    const hole = analysis.regions.find((r) => r.type === "internal-hole")!;
    const result = classifyHoleSeverity(hole, buildings, "showcase");
    expect(result.severity).toBe("info");
    expect(result.displayType).toBe("intentional-pocket");
  });

  it("marks a hole near a resource storage critical for a Farming base", () => {
    const buildings: PlacedBuilding[] = [b("gs", "gold-storage", 20, 20)];
    buildRing(15, 15, "n", buildings, 1); // hole near the gold storage
    const analysis = computeDeploymentAnalysis(buildings);
    const hole = analysis.regions.find((r) => r.type === "internal-hole")!;
    const result = classifyHoleSeverity(hole, buildings, "farming");
    expect(result.severity).toBe("critical");
  });

  it("downgrades a hole far from any storage to a warning for a Farming base", () => {
    const buildings: PlacedBuilding[] = [b("gs", "gold-storage", 2, 2)];
    buildRing(30, 30, "f", buildings, 1); // hole far from the storage
    const analysis = computeDeploymentAnalysis(buildings);
    const hole = analysis.regions.find((r) => r.type === "internal-hole")!;
    const result = classifyHoleSeverity(hole, buildings, "farming");
    expect(result.severity).toBe("warning");
  });
});

describe("computeDeploymentRisk", () => {
  it("scores a clean empty layout with zero holes as fully safe", () => {
    const analysis = computeDeploymentAnalysis([]);
    const risk = computeDeploymentRisk(analysis, [], "war");
    expect(risk.internalHolePenalty).toBe(0);
    expect(risk.criticalCoreHolePenalty).toBe(0);
  });

  it("a critical hole near the Town Hall costs more than a distant warning-level hole", () => {
    const nearBuildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", nearBuildings, 1);
    const nearAnalysis = computeDeploymentAnalysis(nearBuildings);
    const nearRisk = computeDeploymentRisk(nearAnalysis, nearBuildings, "war");

    const farBuildings: PlacedBuilding[] = [b("th", "town-hall", 2, 2)];
    buildRing(30, 30, "f", farBuildings, 1);
    const farAnalysis = computeDeploymentAnalysis(farBuildings);
    const farRisk = computeDeploymentRisk(farAnalysis, farBuildings, "war");

    expect(nearRisk.criticalCoreHolePenalty).toBeGreaterThan(farRisk.criticalCoreHolePenalty);
    expect(nearRisk.deploymentRiskScore).toBeGreaterThan(farRisk.deploymentRiskScore);
  });

  it("Showcase intentional pockets contribute zero penalty", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", buildings, 1);
    const analysis = computeDeploymentAnalysis(buildings);
    const risk = computeDeploymentRisk(analysis, buildings, "showcase");
    expect(risk.internalHolePenalty).toBe(0);
    expect(risk.criticalCoreHolePenalty).toBe(0);
  });
});

describe("getDeploymentWarnings", () => {
  it("produces a critical warning naming the nearest hole's distance to the Town Hall", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", buildings, 1);
    const analysis = computeDeploymentAnalysis(buildings);
    const warnings = getDeploymentWarnings(analysis, buildings, "war");
    const holeWarning = warnings.find((w) => w.id === "deployment-internal-hole");
    expect(holeWarning).toBeDefined();
    expect(holeWarning!.type).toBe("critical");
    expect(holeWarning!.message).toMatch(/\d+ ô/);
  });

  it("produces no warnings for a clean layout", () => {
    const warnings = getDeploymentWarnings(computeDeploymentAnalysis([]), [], "war");
    expect(warnings.length).toBe(0);
  });
});

describe("isDeploymentReadyForPurpose", () => {
  it("is not ready for War while a critical hole remains near the Town Hall", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", buildings, 1);
    const analysis = computeDeploymentAnalysis(buildings);
    const result = isDeploymentReadyForPurpose(analysis, buildings, "war");
    expect(result.ready).toBe(false);
  });

  it("is always ready for Showcase regardless of holes", () => {
    const buildings: PlacedBuilding[] = [b("th", "town-hall", 20, 20)];
    buildRing(15, 15, "n", buildings, 1);
    const analysis = computeDeploymentAnalysis(buildings);
    const result = isDeploymentReadyForPurpose(analysis, buildings, "showcase");
    expect(result.ready).toBe(true);
  });

  it("is ready for War with an empty, hole-free layout", () => {
    const analysis = computeDeploymentAnalysis([]);
    const result = isDeploymentReadyForPurpose(analysis, [], "war");
    expect(result.ready).toBe(true);
  });
});
