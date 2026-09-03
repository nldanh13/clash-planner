import { describe, expect, it } from "vitest";
import {
  GLYPH_CHARS,
  SHAPE_PRESETS,
  getGlyphSize,
  getGlyphWallCoords,
  getPresetShapeWallCoords,
} from "./glyphShapes";

describe("glyph font", () => {
  it("defines exactly A-Z and 0-9", () => {
    expect(GLYPH_CHARS.length).toBe(36);
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
      expect(GLYPH_CHARS).toContain(c);
    }
  });

  it("every glyph produces at least one filled coordinate", () => {
    for (const c of GLYPH_CHARS) {
      const coords = getGlyphWallCoords(c, 0, 0, 1);
      expect(coords.length).toBeGreaterThan(0);
    }
  });

  it("scales the coordinate span by the scale factor", () => {
    const scale1 = getGlyphWallCoords("A", 0, 0, 1);
    const scale2 = getGlyphWallCoords("A", 0, 0, 2);
    const maxX1 = Math.max(...scale1.map((c) => c.x));
    const maxX2 = Math.max(...scale2.map((c) => c.x));
    expect(maxX2).toBeGreaterThan(maxX1);
    expect(scale2.length).toBeGreaterThan(scale1.length);
  });

  it("offsets every coordinate by the given origin", () => {
    const at0 = getGlyphWallCoords("H", 0, 0, 1);
    const at10 = getGlyphWallCoords("H", 10, 5, 1);
    expect(at10.length).toBe(at0.length);
    for (let i = 0; i < at0.length; i++) {
      expect(at10[i].x).toBe(at0[i].x + 10);
      expect(at10[i].y).toBe(at0[i].y + 5);
    }
  });

  it("getGlyphSize matches the 5x7 grid times scale", () => {
    expect(getGlyphSize(2)).toEqual({ width: 10, height: 14 });
  });

  it("returns no coordinates for an unknown character", () => {
    expect(getGlyphWallCoords("?" as any, 0, 0, 1)).toEqual([]);
  });
});

describe("preset shapes", () => {
  it("every preset produces coordinates translated to the given origin", () => {
    for (const pattern of SHAPE_PRESETS) {
      const atOrigin = getPresetShapeWallCoords(pattern, 0, 0);
      const translated = getPresetShapeWallCoords(pattern, 100, 50);
      expect(atOrigin.length).toBeGreaterThan(0);
      expect(translated.length).toBe(atOrigin.length);
      expect(translated[0].x).toBe(atOrigin[0].x + 100);
      expect(translated[0].y).toBe(atOrigin[0].y + 50);
    }
  });
});
