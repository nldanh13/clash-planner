import { describe, it, expect } from "vitest";
import {
  getDefenseImpact,
  normalizeResourceCost,
  getTop3BuildingRecommendations
} from "./smartBuildingAdvisor";
import { upgradeItems } from "../upgradeData";

describe("smartBuildingAdvisor", () => {
  it("trả về điểm ảnh hưởng phòng thủ chính xác cho các công trình trọng yếu", () => {
    const eagle = upgradeItems.find(x => x.id === "eagle-artillery")!;
    const monolith = upgradeItems.find(x => x.id === "monolith")!;
    const airDefense = upgradeItems.find(x => x.id === "air-defense")!;

    expect(getDefenseImpact(eagle).score).toBe(99);
    expect(getDefenseImpact(eagle).tier).toBe("S+");
    expect(getDefenseImpact(monolith).score).toBe(98);
    expect(getDefenseImpact(airDefense).score).toBe(88);
  });

  it("chuẩn hóa chi phí tài nguyên (Dark Elixir có hệ số quy đổi cao hơn Gold/Elixir)", () => {
    expect(normalizeResourceCost("Gold", 1000000)).toBe(1000000);
    expect(normalizeResourceCost("Elixir", 500000)).toBe(500000);
    expect(normalizeResourceCost("Dark Elixir", 10000)).toBe(1200000);
  });

  it("gợi ý 3 công trình có ảnh hưởng phòng thủ lớn nhất khi chọn defense-impact", () => {
    // Giả sử người chơi ở TH15, các công trình đều đang ở Lv 1
    const manualLevels: Record<string, number> = {};
    const top3 = getTop3BuildingRecommendations({
      items: upgradeItems,
      player: null,
      manualLevels,
      targetTownHall: 15,
      criterion: "defense-impact"
    });

    expect(top3.length).toBe(3);
    // Eagle Artillery hoặc Monolith phải đứng top đầu ở TH15
    expect(top3[0].defenseImpact.score).toBeGreaterThanOrEqual(top3[1].defenseImpact.score);
    expect(top3[1].defenseImpact.score).toBeGreaterThanOrEqual(top3[2].defenseImpact.score);
    expect(top3[0].item.id).toBe("eagle-artillery");
    expect(top3[0].rankBadge).toBe("#1 Ưu tiên số 1");
  });

  it("gợi ý 3 công trình có thời gian nâng cấp thấp nhất khi chọn lowest-time", () => {
    const manualLevels: Record<string, number> = {};
    const top3 = getTop3BuildingRecommendations({
      items: upgradeItems,
      player: null,
      manualLevels,
      targetTownHall: 11,
      criterion: "lowest-time"
    });

    expect(top3.length).toBe(3);
    // Thời gian bước tiếp theo của công trình trước phải <= công trình sau
    expect(top3[0].nextStep.timeHours).toBeLessThanOrEqual(top3[1].nextStep.timeHours);
    expect(top3[1].nextStep.timeHours).toBeLessThanOrEqual(top3[2].nextStep.timeHours);
  });

  it("gợi ý 3 công trình có chi phí thấp nhất khi chọn lowest-cost", () => {
    const manualLevels: Record<string, number> = {};
    const top3 = getTop3BuildingRecommendations({
      items: upgradeItems,
      player: null,
      manualLevels,
      targetTownHall: 10,
      criterion: "lowest-cost"
    });

    expect(top3.length).toBe(3);
    const cost0 = normalizeResourceCost(top3[0].nextStep.resource, top3[0].nextStep.cost);
    const cost1 = normalizeResourceCost(top3[1].nextStep.resource, top3[1].nextStep.cost);
    const cost2 = normalizeResourceCost(top3[2].nextStep.resource, top3[2].nextStep.cost);

    expect(cost0).toBeLessThanOrEqual(cost1);
    expect(cost1).toBeLessThanOrEqual(cost2);
  });

  it("lọc chính xác theo danh mục (chỉ phòng thủ)", () => {
    const manualLevels: Record<string, number> = {};
    const top3 = getTop3BuildingRecommendations({
      items: upgradeItems,
      player: null,
      manualLevels,
      targetTownHall: 12,
      criterion: "defense-impact",
      categoryFilter: "defense"
    });

    expect(top3.every(entry => entry.item.kind === "defense")).toBe(true);
  });

  it("không đề xuất công trình đã max cấp tại Town Hall mục tiêu", () => {
    const eagle = upgradeItems.find(x => x.id === "eagle-artillery")!;
    // Đặt Eagle Artillery đạt cấp tối đa của TH11
    const manualLevels: Record<string, number> = {
      "guest-eagle-artillery": 2 // Max ở TH11
    };

    const top3 = getTop3BuildingRecommendations({
      items: upgradeItems,
      player: null,
      manualLevels,
      targetTownHall: 11,
      criterion: "defense-impact"
    });

    expect(top3.find(x => x.item.id === "eagle-artillery")).toBeUndefined();
  });
});
