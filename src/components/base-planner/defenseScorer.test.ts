import { describe, it, expect } from "vitest";
import { evaluateBaseDefense } from "./defenseScorer";
import type { PlacedBuilding } from "./types";
import { scanChainLightningHazards } from "./chainLightningUtils";

describe("evaluateBaseDefense", () => {
  it("trả về điểm 0 và cảnh báo cho layout trống", () => {
    const buildings: PlacedBuilding[] = [];
    const result = evaluateBaseDefense(buildings, 10);
    expect(result.totalScore).toBe(0);
    expect(result.tierTitle).toBe("Bản đồ trống");
    expect(result.warnings.some(w => w.id === "empty")).toBe(true);
  });

  it("giảm điểm khi công trình chồng cụm (chain lightning)", () => {
    const buildings: PlacedBuilding[] = [
      { instanceId: "1", buildingId: "inferno-tower", x: 20, y: 20 },
      { instanceId: "2", buildingId: "inferno-tower", x: 22, y: 20 },
    ];
    const result = evaluateBaseDefense(buildings, 10);
    const chainWarning = result.warnings.find(w => w.category === "chain" && w.type === "critical");
    expect(chainWarning).toBeDefined();
    expect(result.breakdown.chain.score).toBeLessThan(20);
  });

  it("không bị phạt chain khi phân tán hợp lý", () => {
    const buildings: PlacedBuilding[] = [
      { instanceId: "1", buildingId: "inferno-tower", x: 10, y: 10 },
      { instanceId: "2", buildingId: "inferno-tower", x: 30, y: 30 },
      { instanceId: "3", buildingId: "eagle-artillery", x: 20, y: 20 },
      { instanceId: "4", buildingId: "town-hall", x: 20, y: 10 },
      { instanceId: "5", buildingId: "gold-storage", x: 10, y: 15 },
      { instanceId: "6", buildingId: "elixir-storage", x: 30, y: 25 },
    ];
    
    // DEBUG!
    const { dangerPairs } = scanChainLightningHazards(buildings, 1);
    console.log("DANGER PAIRS:", dangerPairs.map(p => p.b1.buildingId + " - " + p.b2.buildingId + " dist: " + p.distance));
    
    const result = evaluateBaseDefense(buildings, 11);
    const chainWarning = result.warnings.find(w => w.category === "chain" && w.type === "critical");
    expect(chainWarning).toBeUndefined();
    expect(result.breakdown.chain.score).toBe(20);
  });

  it("phát hiện thiếu Town Hall", () => {
    const buildings: PlacedBuilding[] = [
      { instanceId: "1", buildingId: "cannon", x: 20, y: 20 },
    ];
    const result = evaluateBaseDefense(buildings, 10);
    const thWarning = result.warnings.find(w => w.id === "th-missing");
    expect(thWarning).toBeDefined();
    expect(result.breakdown.th.score).toBe(0);
  });
});
