import { describe, it, expect } from "vitest";
import { validateLayout } from "./LayoutValidator";
import { BUILDINGS_BY_ID } from "./constants";

describe("LayoutValidator", () => {
  it("rejects non-array input", () => {
    const res = validateLayout({}, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues[0].message).toContain("không phải là một mảng");
  });

  it("rejects too large array", () => {
    const arr = new Array(501).fill({});
    const res = validateLayout(arr, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues[0].message).toContain("quá lớn");
  });

  it("accepts valid layout", () => {
    const buildings = [
      { instanceId: "1", buildingId: "town-hall", x: 20, y: 20 }
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(true);
    expect(res.issues.length).toBe(0);
    expect(res.validBuildings.length).toBe(1);
  });

  it("rejects missing or invalid instanceId", () => {
    const buildings = [
      { buildingId: "town-hall", x: 20, y: 20 },
      { instanceId: 123, buildingId: "cannon", x: 10, y: 10 }
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues.length).toBe(2);
    expect(res.issues[0].message).toContain("thiếu hoặc sai định dạng instanceId");
  });

  it("rejects duplicate instanceId", () => {
    const buildings = [
      { instanceId: "same", buildingId: "town-hall", x: 20, y: 20 },
      { instanceId: "same", buildingId: "cannon", x: 10, y: 10 }
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.message.includes("Trùng lặp mã công trình"))).toBe(true);
  });

  it("rejects non-existent buildingId", () => {
    const buildings = [
      { instanceId: "1", buildingId: "fake-building", x: 20, y: 20 }
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.message.includes("Loại công trình không tồn tại"))).toBe(true);
  });

  it("rejects out of bounds building", () => {
    const buildings = [
      { instanceId: "1", buildingId: "town-hall", x: 42, y: 42 } // town-hall is 4x4, 42+4 = 46 > 44
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.message.includes("vượt ra ngoài lưới"))).toBe(true);
  });

  it("rejects overlapping buildings", () => {
    const buildings = [
      { instanceId: "1", buildingId: "town-hall", x: 20, y: 20 }, // 4x4, covers 20-23
      { instanceId: "2", buildingId: "cannon", x: 22, y: 22 } // 3x3, starts at 22, overlap!
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.message.includes("bị chồng lấn"))).toBe(true);
  });

  it("warns when exceeding Town Hall limits", () => {
    const buildings = [
      { instanceId: "1", buildingId: "town-hall", x: 20, y: 20 },
      { instanceId: "2", buildingId: "town-hall", x: 10, y: 10 } // TH10 only allows 1 TH
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(true); // Warning, not critical
    expect(res.hasWarnings).toBe(true);
    expect(res.issues.some(i => i.message.includes("vượt quá giới hạn"))).toBe(true);
    expect(res.validBuildings.length).toBe(2);
    expect(res.sanitizedBuildings.length).toBe(1);
    expect(res.sanitizedBuildings[0].instanceId).toBe("1");
  });

  it("warns when building is not unlocked at Town Hall", () => {
    const buildings = [
      { instanceId: "1", buildingId: "eagle-artillery", x: 20, y: 20 } // Eagle not at TH10
    ];
    const res = validateLayout(buildings, 10);
    expect(res.isValid).toBe(true);
    expect(res.hasWarnings).toBe(true);
    expect(res.issues.some(i => i.message.includes("chưa được mở khóa"))).toBe(true);
    expect(res.validBuildings.length).toBe(1);
    expect(res.sanitizedBuildings.length).toBe(0);
  });

  it("recovers layout properly by using sanitizedBuildings", () => {
    const buildings = [
      { instanceId: "1", buildingId: "town-hall", x: 20, y: 20 },
      { instanceId: "2", buildingId: "town-hall", x: 10, y: 10 }, // Over limit
      { instanceId: "3", buildingId: "eagle-artillery", x: 30, y: 30 }, // Locked at TH10
      { instanceId: "4", buildingId: "cannon", x: 20, y: 20 } // Overlaps with TH
    ];
    
    // First pass
    const res1 = validateLayout(buildings, 10);
    expect(res1.isValid).toBe(false); // Has overlap critical error
    expect(res1.hasWarnings).toBe(true);
    
    // Recovery using sanitizedBuildings
    const res2 = validateLayout(res1.sanitizedBuildings, 10);
    expect(res2.isValid).toBe(true);
    expect(res2.hasCriticals).toBe(false);
    expect(res2.hasWarnings).toBe(false);
    expect(res2.issues.length).toBe(0);
    
    // Only the first valid TH should remain
    expect(res2.validBuildings.length).toBe(1);
    expect(res2.validBuildings[0].buildingId).toBe("town-hall");
    expect(res2.validBuildings[0].instanceId).toBe("1");
  });
});
