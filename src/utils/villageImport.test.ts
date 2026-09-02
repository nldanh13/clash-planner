import { describe, it, expect } from "vitest";
import { clampInteger, extractDataLevels } from "./villageImport";

describe("villageImport utils", () => {
  it("clampInteger works correctly", () => {
    expect(clampInteger(5, 1, 10)).toBe(5);
    expect(clampInteger(-5, 1, 10)).toBe(1);
    expect(clampInteger(15, 1, 10)).toBe(10);
    expect(clampInteger("7", 1, 10)).toBe(7);
    expect(clampInteger("abc", 1, 10, 3)).toBe(3);
  });

  it("extractDataLevels parses game export correctly", () => {
    const raw = `
    Đã copy dữ liệu này:
    {"data": 1234, "lvl": 5, "buildings": [{"data": 1, "lvl": 2}], "builderBase": [{"data": 2, "lvl": 3}]}
    `;
    const result = extractDataLevels(raw);
    expect(result.total).toBe(3);
    expect(result.levels.get(1)).toBe(2);
    expect(result.builderBaseIds.has(2)).toBe(true);
  });

  it("extractDataLevels throws on invalid json", () => {
    const raw = `Đã copy dữ liệu này: { "data": 1234, broken json }`;
    expect(() => extractDataLevels(raw)).toThrow("Dữ liệu dán vào không phải JSON hợp lệ");
  });
});
