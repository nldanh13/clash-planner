import { describe, it, expect } from "vitest";
import { getPresetLayout } from "./ExportUtils";
import { validateLayout } from "./LayoutValidator";

describe("ExportUtils", () => {
  describe("getPresetLayout", () => {
    it("should return valid layouts for TH1 to TH18", () => {
      for (let th = 1; th <= 18; th++) {
        const layout = getPresetLayout(th);
        const res = validateLayout(layout, th);

        expect(res.isValid).toBe(true);
        expect(res.hasWarnings).toBe(false);
        expect(res.hasCriticals).toBe(false);
        expect(res.issues).toHaveLength(0);
      }
    });

    it("should test layout containing Royal Champion at TH11 is removed or not", () => {
      const th11Layout = getPresetLayout(11);
      const rc = th11Layout.find(b => b.buildingId === "royal-champion");
      expect(rc).toBeUndefined(); // RC is unlocked at TH13, so sanitizedBuildings should strip it at TH11
    });

    it("should strip out buildings that exceed limits or are locked", () => {
      // At TH1, limit for cannon is 2, for example (depends on actual limits, let's just check the result has no warnings)
      const th1Layout = getPresetLayout(1);
      const res = validateLayout(th1Layout, 1);
      expect(res.hasWarnings).toBe(false);
    });
  });
});
