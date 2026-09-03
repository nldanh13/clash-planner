/**
 * Decorative Shape Presets — letter/digit glyphs + wrappers around the existing
 * `AESTHETIC_PATTERNS` shapes (heart, diamond, shield, spiral, crest, radial) so
 * both are exposed through one unified interface for the wall-stamp tool.
 *
 * Letters are a hand-authored 5x7 block bitmap font (no external font dependency),
 * scaled up to grid tiles — one bitmap pixel becomes an NxN block of wall tiles.
 */
import { AESTHETIC_PATTERNS } from "./aestheticProfiles";
import type { AestheticPattern } from "./types";

export type GlyphChar =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M"
  | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

// Each glyph: 7 rows x 5 cols, '#' = filled pixel.
const GLYPH_FONT: Record<GlyphChar, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
};

export const GLYPH_CHARS = Object.keys(GLYPH_FONT) as GlyphChar[];

export interface ShapeCoord {
  x: number;
  y: number;
}

/**
 * Renders a single character to wall-tile coordinates, `scale` tiles per bitmap
 * pixel, positioned so (originX, originY) is the shape's top-left corner.
 */
export function getGlyphWallCoords(char: GlyphChar, originX: number, originY: number, scale: number = 2): ShapeCoord[] {
  const rows = GLYPH_FONT[char];
  if (!rows) return [];
  const coords: ShapeCoord[] = [];
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      if (rows[row][col] !== "#") continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          coords.push({ x: originX + col * scale + dx, y: originY + row * scale + dy });
        }
      }
    }
  }
  return coords;
}

/** Bounding size (in tiles) of a glyph at the given scale — for centering/placement UI. */
export function getGlyphSize(scale: number = 2): { width: number; height: number } {
  return { width: 5 * scale, height: 7 * scale };
}

/** Non-letter presets, reusing the generator's existing symmetric wall-outline shapes. */
export const SHAPE_PRESETS: AestheticPattern[] = [
  "diamond", "heart", "shield", "spiral", "crest", "radial", "symmetric-axial",
];

/**
 * Renders one of the existing `AESTHETIC_PATTERNS` shapes to wall coords centered
 * at (originX, originY), reusing its own generator verbatim (each pattern already
 * produces coordinates relative to a `center` value it treats as the origin).
 */
export function getPresetShapeWallCoords(pattern: AestheticPattern, originX: number, originY: number): ShapeCoord[] {
  const def = AESTHETIC_PATTERNS[pattern];
  if (!def) return [];
  // The generators are written as `half = Math.floor(center)` and offset from
  // there — passing 0 as `center` and translating the result by (originX, originY)
  // reuses them unmodified instead of duplicating their shape math.
  const raw = def.wallOutlineGenerator(0, 0);
  return raw.map((c) => ({ x: c.x + originX, y: c.y + originY }));
}
