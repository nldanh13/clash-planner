/**
 * Isometric projection math for the Isometric tactical view.
 *
 * Pure, framework-free coordinate math — the renderer component owns the
 * canvas/DOM side, this file owns "where does grid cell (x,y) land on screen"
 * and its exact inverse, so hit-testing (click-to-select) and drawing always
 * agree with each other and with pan/zoom.
 *
 * Standard 2:1 diamond projection:
 *   screenX = (gridX - gridY) * (tileWidth / 2)
 *   screenY = (gridX + gridY) * (tileHeight / 2)
 * Increasing gridX moves right+down on screen, increasing gridY moves left+down.
 */

export interface IsoProjectionConfig {
  tileWidth: number;
  tileHeight: number;
}

export const DEFAULT_ISO_TILE_WIDTH = 28;
export const DEFAULT_ISO_TILE_HEIGHT = 14;

export const DEFAULT_ISO_CONFIG: IsoProjectionConfig = {
  tileWidth: DEFAULT_ISO_TILE_WIDTH,
  tileHeight: DEFAULT_ISO_TILE_HEIGHT,
};

export interface Point {
  x: number;
  y: number;
}

/** Grid-space point (fractional coordinates allowed) -> iso "world" pixel space (before pan/zoom). */
export function gridToIso(gx: number, gy: number, config: IsoProjectionConfig = DEFAULT_ISO_CONFIG): Point {
  return {
    x: (gx - gy) * (config.tileWidth / 2),
    y: (gx + gy) * (config.tileHeight / 2),
  };
}

/** Exact inverse of gridToIso. */
export function isoToGrid(sx: number, sy: number, config: IsoProjectionConfig = DEFAULT_ISO_CONFIG): Point {
  const gx = sx / config.tileWidth + sy / config.tileHeight;
  const gy = sy / config.tileHeight - sx / config.tileWidth;
  return { x: gx, y: gy };
}

export interface IsoViewport {
  /** Canvas-space pixel offset of the iso world origin (grid 0,0). */
  panX: number;
  panY: number;
  zoom: number;
}

export const DEFAULT_ISO_ZOOM = 1;
export const MIN_ISO_ZOOM = 0.4;
export const MAX_ISO_ZOOM = 2.5;

export function clampIsoZoom(zoom: number): number {
  return Math.max(MIN_ISO_ZOOM, Math.min(MAX_ISO_ZOOM, zoom));
}

/** Iso world pixel point -> canvas pixel point, applying pan + zoom. */
export function worldToCanvas(world: Point, viewport: IsoViewport): Point {
  return { x: world.x * viewport.zoom + viewport.panX, y: world.y * viewport.zoom + viewport.panY };
}

/** Canvas pixel point -> iso world pixel point, undoing pan + zoom. */
export function canvasToWorld(canvasPoint: Point, viewport: IsoViewport): Point {
  return {
    x: (canvasPoint.x - viewport.panX) / viewport.zoom,
    y: (canvasPoint.y - viewport.panY) / viewport.zoom,
  };
}

/** Grid cell -> final canvas pixel position (composes gridToIso + worldToCanvas). Used for drawing. */
export function gridToCanvas(
  gx: number,
  gy: number,
  viewport: IsoViewport,
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): Point {
  return worldToCanvas(gridToIso(gx, gy, config), viewport);
}

/** Canvas pixel position -> fractional grid cell (composes canvasToWorld + isoToGrid). Used for hit-testing. */
export function canvasToGrid(
  canvasPoint: Point,
  viewport: IsoViewport,
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): Point {
  const world = canvasToWorld(canvasPoint, viewport);
  return isoToGrid(world.x, world.y, config);
}

/**
 * Painter's-algorithm depth key: objects with a larger key are drawn LATER
 * (on top). Using the rect's bottom-right corner means a building occludes
 * anything strictly "behind" it (smaller x+y) and is itself occluded by
 * anything strictly in front, regardless of footprint size.
 */
export function depthKeyForRect(x: number, y: number, width: number, height: number): number {
  return x + width + (y + height);
}

/** The 4 iso-projected corners of a grid rect, in draw order (top, right, bottom, left of the diamond). */
export function rectToIsoPolygon(
  x: number,
  y: number,
  width: number,
  height: number,
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): Point[] {
  return [
    gridToIso(x, y, config),
    gridToIso(x + width, y, config),
    gridToIso(x + width, y + height, config),
    gridToIso(x, y + height, config),
  ];
}
