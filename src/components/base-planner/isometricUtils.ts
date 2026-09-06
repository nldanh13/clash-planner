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

/**
 * There's only one static wall sprite per level (no separate straight/
 * corner/end art), so tiling it edge-to-edge identically on every tile is
 * unavoidable if walls are to read as a continuous, unbroken line. Shrinking
 * or rotating each tile individually opens visible gaps between neighbors —
 * fine in an isolated close-up, but at the density a full wall run actually
 * has, those gaps break the line into a field of disconnected specks
 * instead of a barrier.
 *
 * Keep every wall tile at full scale and perfectly aligned, and instead vary
 * *brightness* slightly per tile (three pre-baked variants, picked
 * deterministically by grid position so it's stable across redraws/exports).
 * That breaks up the "identical texture pasted N times" monotony without
 * ever opening a gap in the wall itself. Each variant is composited once per
 * unique source image (not per frame) onto an offscreen canvas and cached.
 * Shared between the live isometric view and the static PNG export so both
 * render walls identically.
 */
const wallVariantCache = new Map<string, HTMLCanvasElement>();
export function getWallVariant(img: HTMLImageElement, variant: 1 | 2): HTMLCanvasElement | null {
  const key = `${img.src}::v${variant}`;
  const cached = wallVariantCache.get(key);
  if (cached) return cached;
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = variant === 1 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)";
  c.fillRect(0, 0, canvas.width, canvas.height);
  wallVariantCache.set(key, canvas);
  return canvas;
}

export function wallBrightnessBucket(x: number, y: number): 0 | 1 | 2 {
  const hash = ((x * 374761393 + y * 668265263) ^ ((x * 668265263) >>> 3)) >>> 0;
  return (hash % 3) as 0 | 1 | 2;
}

/**
 * "Mowed lawn" ground texture — the real game's grass isn't a flat color,
 * it's alternating light/dark bands like a mowed field, which reads as an
 * actual lit terrain surface instead of a colored parallelogram. Rows of
 * constant (gridX + gridY) project to perfectly horizontal screen bands
 * under this projection, so a tiny repeating canvas pattern is enough — no
 * texture asset, no per-tile drawing cost. Shared between the live
 * isometric view and the static PNG export.
 */
export function createLawnPattern(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): CanvasPattern | null {
  const lawnStripeTiles = 2; // grid rows per stripe band
  const stripeUnitPx = Math.max(2, (config.tileHeight / 2) * lawnStripeTiles * zoom);
  const stripeCanvas = document.createElement("canvas");
  stripeCanvas.width = 4;
  stripeCanvas.height = Math.round(stripeUnitPx * 2);
  const sctx = stripeCanvas.getContext("2d");
  if (!sctx) return null;
  sctx.fillStyle = "#1a3a25";
  sctx.fillRect(0, 0, 4, stripeUnitPx);
  sctx.fillStyle = "#163420";
  sctx.fillRect(0, stripeUnitPx, 4, stripeUnitPx);
  return ctx.createPattern(stripeCanvas, "repeat");
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
