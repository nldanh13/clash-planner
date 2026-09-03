import { describe, expect, it } from "vitest";
import {
  canvasToGrid,
  canvasToWorld,
  clampIsoZoom,
  depthKeyForRect,
  gridToCanvas,
  gridToIso,
  isoToGrid,
  rectToIsoPolygon,
  worldToCanvas,
  type IsoViewport,
} from "./isometricUtils";

describe("gridToIso / isoToGrid round-trip", () => {
  const cases: Array<[number, number]> = [
    [0, 0],
    [43, 43],
    [22, 22],
    [10, 30],
    [0, 43],
    [43, 0],
    [17.5, 3.25],
  ];

  for (const [gx, gy] of cases) {
    it(`round-trips grid (${gx}, ${gy}) through the iso projection`, () => {
      const screen = gridToIso(gx, gy);
      const back = isoToGrid(screen.x, screen.y);
      expect(back.x).toBeCloseTo(gx, 10);
      expect(back.y).toBeCloseTo(gy, 10);
    });
  }

  it("grid origin projects to screen origin", () => {
    expect(gridToIso(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("increasing gridX moves right and down; increasing gridY moves left and down", () => {
    const origin = gridToIso(0, 0);
    const alongX = gridToIso(1, 0);
    const alongY = gridToIso(0, 1);
    expect(alongX.x).toBeGreaterThan(origin.x);
    expect(alongX.y).toBeGreaterThan(origin.y);
    expect(alongY.x).toBeLessThan(origin.x);
    expect(alongY.y).toBeGreaterThan(origin.y);
  });
});

describe("worldToCanvas / canvasToWorld round-trip under pan + zoom", () => {
  const viewports: IsoViewport[] = [
    { panX: 0, panY: 0, zoom: 1 },
    { panX: 400, panY: 250, zoom: 1 },
    { panX: -120, panY: 80, zoom: 1.8 },
    { panX: 50, panY: 50, zoom: 0.5 },
  ];

  for (const viewport of viewports) {
    it(`round-trips a world point through pan=(${viewport.panX},${viewport.panY}) zoom=${viewport.zoom}`, () => {
      const world = { x: 137, y: -42 };
      const canvasPt = worldToCanvas(world, viewport);
      const back = canvasToWorld(canvasPt, viewport);
      expect(back.x).toBeCloseTo(world.x, 8);
      expect(back.y).toBeCloseTo(world.y, 8);
    });
  }
});

describe("gridToCanvas / canvasToGrid end-to-end (zoom and pan must never desync the overlay from the grid)", () => {
  const viewport: IsoViewport = { panX: 350, panY: 120, zoom: 1.35 };

  it("a grid cell drawn at the current viewport hit-tests back to the same cell", () => {
    for (const [gx, gy] of [[0, 0], [22, 22], [43, 43], [5, 38]] as const) {
      const canvasPt = gridToCanvas(gx, gy, viewport);
      const back = canvasToGrid(canvasPt, viewport);
      expect(back.x).toBeCloseTo(gx, 8);
      expect(back.y).toBeCloseTo(gy, 8);
    }
  });

  it("panning shifts every projected point by exactly the pan delta, never distorting the grid", () => {
    const before = gridToCanvas(10, 10, viewport);
    const panned: IsoViewport = { ...viewport, panX: viewport.panX + 40, panY: viewport.panY - 15 };
    const after = gridToCanvas(10, 10, panned);
    expect(after.x - before.x).toBeCloseTo(40, 8);
    expect(after.y - before.y).toBeCloseTo(-15, 8);
  });

  it("zooming scales distances between two grid points uniformly around the same origin", () => {
    const base: IsoViewport = { panX: 0, panY: 0, zoom: 1 };
    const zoomed: IsoViewport = { panX: 0, panY: 0, zoom: 2 };
    const a1 = gridToCanvas(0, 0, base);
    const b1 = gridToCanvas(10, 0, base);
    const a2 = gridToCanvas(0, 0, zoomed);
    const b2 = gridToCanvas(10, 0, zoomed);
    const dist1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
    const dist2 = Math.hypot(b2.x - a2.x, b2.y - a2.y);
    expect(dist2).toBeCloseTo(dist1 * 2, 8);
  });
});

describe("clampIsoZoom", () => {
  it("clamps below the minimum", () => {
    expect(clampIsoZoom(0)).toBeGreaterThan(0);
  });
  it("clamps above the maximum", () => {
    expect(clampIsoZoom(999)).toBeLessThan(999);
  });
  it("passes through values already in range", () => {
    expect(clampIsoZoom(1)).toBe(1);
  });
});

describe("depthKeyForRect (painter's algorithm ordering)", () => {
  it("a rect further down-right (larger x+y) has a larger depth key and is drawn later", () => {
    const back = depthKeyForRect(5, 5, 3, 3);
    const front = depthKeyForRect(20, 20, 3, 3);
    expect(front).toBeGreaterThan(back);
  });

  it("a larger footprint at the same origin has a larger depth key than a smaller one", () => {
    const small = depthKeyForRect(10, 10, 1, 1);
    const large = depthKeyForRect(10, 10, 4, 4);
    expect(large).toBeGreaterThan(small);
  });
});

describe("rectToIsoPolygon", () => {
  it("returns 4 points forming a closed diamond for a 1x1 tile", () => {
    const poly = rectToIsoPolygon(5, 5, 1, 1);
    expect(poly.length).toBe(4);
    // Top point (5,5) must be strictly above the bottom point (6,6) in screen Y.
    expect(poly[0].y).toBeLessThan(poly[2].y);
  });
});
