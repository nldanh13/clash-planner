import { describe, it, expect } from "vitest";
import { normalizeTag, pct, fmtTime, fmtCost } from "./formatters";

describe("formatters", () => {
  it("normalizeTag chuẩn hóa Player Tag", () => {
    expect(normalizeTag("abc12")).toBe("#ABC12");
    expect(normalizeTag("#xyz99")).toBe("#XYZ99");
    expect(normalizeTag("%23xyz99")).toBe("#XYZ99");
    expect(normalizeTag("  # a b C  ")).toBe("#ABC");
  });

  it("pct tính phần trăm nâng cấp", () => {
    expect(pct([{ level: 1, maxLevel: 2 }, { level: 2, maxLevel: 2 }])).toBe(75);
    expect(pct([])).toBe(0);
  });

  it("fmtTime định dạng thời gian hợp lý", () => {
    expect(fmtTime(0)).toBe("Không tốn thời gian");
    expect(fmtTime(12)).toBe("12 giờ");
    expect(fmtTime(24)).toBe("1 ngày");
    expect(fmtTime(26)).toBe("1 ngày 2 giờ");
  });

  it("fmtCost tính toán tài nguyên", () => {
    expect(fmtCost({ Gold: 1000000, Elixir: 500000 })).toBe("1.000.000 Gold · 500.000 Elixir");
    expect(fmtCost({})).toBe("0");
  });
});
