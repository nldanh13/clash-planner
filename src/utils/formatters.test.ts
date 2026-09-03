import { describe, it, expect } from "vitest";
import { normalizeTag, pct, fmtTime, fmtTimeExact, fmtCost } from "./formatters";

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

    it("fmtTime định dạng thời gian hợp lý (0 giờ, dưới 1 năm, trên 1 năm)", () => {
    // Thời gian bằng 0
    expect(fmtTime(0)).toBe("Không tốn thời gian");
    
    // Một thợ / nhiều thợ hoặc các hàng chờ khác (chỉ là format giờ)
    expect(fmtTime(12)).toBe("12 giờ");
    expect(fmtTime(24)).toBe("1 ngày");
    expect(fmtTime(26)).toBe("1 ngày 2 giờ");
    
    // Builder so với các hàng chờ khác: 5 thợ (ví dụ 10 ngày chia 5)
    expect(fmtTime(240 / 5)).toBe("2 ngày");
    
    // Thời gian lớn hơn một năm (vd: 400 ngày)
    expect(fmtTime(400 * 24)).toBe("1 năm 1 tháng");
    expect(fmtTime(365 * 24)).toBe("1 năm");
    expect(fmtTime(750 * 24)).toBe("2 năm");
  });

  it("fmtTimeExact luôn giữ số ngày/giờ chính xác", () => {
    expect(fmtTimeExact(400 * 24)).toBe("400 ngày");
    expect(fmtTimeExact(400 * 24 + 5)).toBe("400 ngày 5 giờ");
    expect(fmtTimeExact(0)).toBe("Không tốn thời gian");
  });

  it("fmtCost tính toán tài nguyên", () => {
    expect(fmtCost({ Gold: 1000000, Elixir: 500000 })).toBe("1.000.000 Gold · 500.000 Elixir");
    expect(fmtCost({})).toBe("0");
  });
});
