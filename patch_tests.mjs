import fs from 'fs';
const testCode = `import { describe, it, expect } from "vitest";
import { evaluateBaseDefense } from "./defenseScorer";
import type { PlacedBuilding } from "./types";
import { scanChainLightningHazards, getTileGap } from "./chainLightningUtils";

describe("evaluateBaseDefense", () => {
  it("trả về điểm 0 và cảnh báo cho layout trống", () => {
    const buildings: PlacedBuilding[] = [];
    const result = evaluateBaseDefense(buildings, 10);
    expect(result.totalScore).toBe(0);
    expect(result.tierTitle).toBe("Bản đồ trống");
    expect(result.warnings.some(w => w.id === "empty")).toBe(true);
  });

  it("phát hiện thiếu Town Hall", () => {
    const buildings: PlacedBuilding[] = [
      { instanceId: "1", buildingId: "cannon", x: 20, y: 20 },
    ];
    const result = evaluateBaseDefense(buildings, 10);
    // Note: the original ID is no-th
    const thWarning = result.warnings.find(w => w.id === "no-th" || w.id === "th-missing");
    expect(thWarning).toBeDefined();
    expect(result.breakdown.th.score).toBe(0);
  });

  describe("chainLightningUtils - khoảng cách và đếm trùng", () => {
    it("tính chính xác khoảng cách 0, 1, 2 và 3 ô", () => {
      // 3x3 building at (10, 10), occupies [10-12, 10-12]
      // Touch (0 tiles) -> x=13
      expect(getTileGap(10, 10, 3, 3, 13, 10, 3, 3)).toBe(0);
      // 1 tile gap -> x=14
      expect(getTileGap(10, 10, 3, 3, 14, 10, 3, 3)).toBe(1);
      // 2 tile gap -> x=15
      expect(getTileGap(10, 10, 3, 3, 15, 10, 3, 3)).toBe(2);
      // 3 tile gap -> x=16
      expect(getTileGap(10, 10, 3, 3, 16, 10, 3, 3)).toBe(3);
    });

    it("bỏ qua wall và trap, không đếm trùng cùng một cặp công trình", () => {
      const buildings: PlacedBuilding[] = [
        { instanceId: "1", buildingId: "inferno-tower", x: 10, y: 10 },
        { instanceId: "2", buildingId: "inferno-tower", x: 11, y: 10 }, // Touch (dist=0) -> critical
        { instanceId: "3", buildingId: "wall", x: 14, y: 10 }, // 1 tile gap from inferno 2, but it's a wall -> ignored
        { instanceId: "4", buildingId: "giant-bomb", x: 10, y: 13 }, // Touch with inferno 1, but trap -> ignored
      ];
      const result = scanChainLightningHazards(buildings, 2);
      // Only 1 and 2 should be paired. Wall and trap ignored.
      expect(result.dangerPairs.length).toBe(1);
      expect(result.dangerPairs[0].b1.instanceId).toBe("1");
      expect(result.dangerPairs[0].b2.instanceId).toBe("2");
      expect(result.dangerPairs[0].distance).toBe(0);
      expect(result.dangerPairs[0].dangerLevel).toBe("critical");
      expect(result.criticalCount).toBe(1);
      expect(result.warningCount).toBe(0);
    });

    it("đánh dấu warning cho 2 ô và critical cho 0-1 ô", () => {
      const buildings: PlacedBuilding[] = [
        { instanceId: "1", buildingId: "inferno-tower", x: 10, y: 10 },
        { instanceId: "2", buildingId: "cannon", x: 13, y: 10 }, // gap=0
        { instanceId: "3", buildingId: "archer-tower", x: 17, y: 10 }, // gap=1 from cannon 
        { instanceId: "4", buildingId: "wizard-tower", x: 22, y: 10 }, // gap=2 from archer-tower
      ];
      const result = scanChainLightningHazards(buildings, 2);
      // Pairs: 
      // 1 & 2 (dist=0) -> critical
      // 2 & 3 (dist=1) -> critical
      // 3 & 4 (dist=2) -> warning
      // others are > 2
      expect(result.dangerPairs.length).toBe(3);
      expect(result.criticalCount).toBe(2);
      expect(result.warningCount).toBe(1);
    });
  });
});
`;
fs.writeFileSync('src/components/base-planner/defenseScorer.test.ts', testCode);
