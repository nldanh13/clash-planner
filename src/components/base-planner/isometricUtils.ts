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
 *
 * A perfectly flat, noise-free fill still clashes with the building sprites
 * sitting on it: every crop's own grass-tufted edge (see drawGrassTufts and
 * getSpriteContentBounds) is grainy, organic, mixed-tone art, and a
 * mathematically smooth ground plane right up against that reads as a
 * cutout sticker pasted onto a flat color rather than the same material
 * continuing underneath it. Baking real per-pixel noise plus a scatter of
 * soft dirt/tonal blotches into the tile — generated once and cached by
 * size, not regenerated per redraw, so the grain stays put instead of
 * flickering on every pan/zoom tick — closes that gap without needing an
 * external texture asset.
 */
const lawnPatternTileCache = new Map<string, HTMLCanvasElement>();
export function createLawnPattern(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): CanvasPattern | null {
  const lawnStripeTiles = 2; // grid rows per stripe band
  const stripeUnitPx = Math.max(2, (config.tileHeight / 2) * lawnStripeTiles * zoom);
  const tileWidth = 96;
  const tileHeight = Math.round(stripeUnitPx * 2);
  const key = `${tileWidth}x${tileHeight}`;

  let stripeCanvas = lawnPatternTileCache.get(key);
  if (!stripeCanvas) {
    stripeCanvas = document.createElement("canvas");
    stripeCanvas.width = tileWidth;
    stripeCanvas.height = tileHeight;
    const sctx = stripeCanvas.getContext("2d");
    if (!sctx) return null;

    sctx.fillStyle = "#1a3a25";
    sctx.fillRect(0, 0, tileWidth, tileHeight / 2);
    sctx.fillStyle = "#163420";
    sctx.fillRect(0, tileHeight / 2, tileWidth, tileHeight / 2);

    const imageData = sctx.getImageData(0, 0, tileWidth, tileHeight);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain * 0.6));
    }
    sctx.putImageData(imageData, 0, 0);

    const blotchCount = Math.round((tileWidth * tileHeight) / 140);
    for (let i = 0; i < blotchCount; i++) {
      const x = Math.random() * tileWidth;
      const y = Math.random() * tileHeight;
      const r = 1 + Math.random() * 2.5;
      const warm = Math.random() > 0.55;
      sctx.beginPath();
      sctx.arc(x, y, r, 0, Math.PI * 2);
      sctx.fillStyle = warm ? "rgba(120,100,50,0.14)" : "rgba(8,18,10,0.16)";
      sctx.fill();
    }

    lawnPatternTileCache.set(key, stripeCanvas);
  }

  return ctx.createPattern(stripeCanvas, "repeat");
}

export interface SpriteContentBounds {
  /** Fraction (0-1) of image width where non-transparent content starts. */
  left: number;
  /** Fraction (0-1) of image width where non-transparent content ends. */
  right: number;
  /** Fraction (0-1) of image height where non-transparent content starts (from the top). */
  top: number;
  /** Fraction (0-1) of image height where non-transparent content ends (from the top). */
  bottom: number;
}

/**
 * Source crops carry wildly inconsistent amounts of empty transparent
 * margin around the sprite itself in BOTH directions — e.g. Army Camp's
 * PNG is only ~49% content width and ~52% content height, versus ~95%/~97%
 * for Cannon; wall tiles run ~77-94% content width depending on level. Two
 * visible bugs come from treating every crop as if it were tight to its
 * content:
 *
 *  - Vertically: anchoring by the raw image bottom edge leaves the padding
 *    as a gap between the sprite and its ground-contact shadow, reading as
 *    the building floating above the grass instead of standing on it.
 *  - Horizontally: sizing the sprite to the footprint's on-screen span
 *    (`drawWidth = footprintSpan`) sizes the PADDED CANVAS to the
 *    footprint, not the actual brick/wall art inside it — so two adjacent
 *    1x1 wall tiles, each ~15-25% narrower in real content than their own
 *    canvas, end up with a visible gap of real content between them
 *    instead of touching. The same under-sizing shrinks core buildings
 *    enough that tall ones (Inferno Tower, X-Bow) never spill over their
 *    own tile's edge, flattening the whole board's sense of depth.
 *
 * Scanning each image once for its true content bounding box (cached by
 * src) and scaling/anchoring on that box instead of the raw canvas fixes
 * both without touching any of the hundreds of source PNGs — the scale
 * correction is per-image (each crop's own padding), not a single guessed
 * multiplier, because the padding fraction varies building to building and
 * even level to level of the same building. `top` exists (in addition to
 * `bottom`) so callers can also derive a sprite's true content height —
 * needed for the height safety-cap next to this scaling to be measured
 * against real art, not against however much padding a given crop happens
 * to carry above/below it.
 */
const contentBoundsCache = new Map<string, SpriteContentBounds>();
export function getSpriteContentBounds(img: HTMLImageElement): SpriteContentBounds {
  const key = img.src;
  const cached = contentBoundsCache.get(key);
  if (cached) return cached;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  let bounds: SpriteContentBounds = { left: 0, right: 1, top: 0, bottom: 1 };
  if (w > 0 && h > 0) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, w, h);
        let firstCol = w;
        let lastCol = -1;
        let firstRow = h;
        let lastRow = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 10) {
              if (x < firstCol) firstCol = x;
              if (x > lastCol) lastCol = x;
              if (y < firstRow) firstRow = y;
              if (y > lastRow) lastRow = y;
            }
          }
        }
        if (lastCol >= 0) {
          bounds = { left: firstCol / w, right: (lastCol + 1) / w, top: firstRow / h, bottom: (lastRow + 1) / h };
        }
      }
    } catch {
      // Cross-origin canvas taint or other read failure — fall back to
      // trusting the raw image edges (previous behavior).
    }
  }
  contentBoundsCache.set(key, bounds);
  return bounds;
}

/**
 * Small tufts of grass poking out around a building's footprint — the real
 * game never plants a building on bare dirt; a fringe of grass blades at
 * the base sells "standing in the lawn" the way a flat shadow alone can't.
 * Drawn at the footprint diamond's side corners and front-side midpoints —
 * the parts of the diamond a roughly-rectangular sprite silhouette leaves
 * exposed on either side — so tufts peek out from beside/behind the
 * building instead of being immediately painted over once the sprite draws
 * on top. Placement is hashed by grid position (not Math.random) so it's
 * stable across redraws/exports instead of flickering every frame; cheap
 * enough (a handful of short strokes) to run per building every redraw.
 * Skipped for walls, which tile edge-to-edge with no visible ground gap.
 */
export function drawGrassTufts(
  ctx: CanvasRenderingContext2D,
  points: [Point, Point, Point, Point],
  gx: number,
  gy: number,
  zoom: number
): void {
  const [, right, bottom, left] = points;
  const spots: Point[] = [
    left,
    right,
    { x: (left.x + bottom.x) / 2, y: (left.y + bottom.y) / 2 },
    { x: (right.x + bottom.x) / 2, y: (right.y + bottom.y) / 2 },
  ];

  let seed = ((gx * 374761393 + gy * 668265263) ^ ((gx * 668265263) >>> 3)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (const spot of spots) {
    const tufts = 2;
    for (let i = 0; i < tufts; i++) {
      const jx = (rand() - 0.5) * 8 * zoom;
      const jy = (rand() - 0.5) * 4 * zoom;
      const h = (4 + rand() * 3) * zoom;
      drawGrassBlade(ctx, spot.x + jx, spot.y + jy, h);
    }
  }
}

const GRASS_BLADE_SHADES = ["#2f6a35", "#4a9b4f", "#3a7d40"];
function drawGrassBlade(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  for (let i = 0; i < 3; i++) {
    const lean = (i - 1) * h * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + (i - 1) * h * 0.25, y);
    ctx.quadraticCurveTo(x + lean * 0.5, y - h * 0.65, x + lean, y - h);
    ctx.strokeStyle = GRASS_BLADE_SHADES[i];
    ctx.lineWidth = Math.max(0.7, h * 0.12);
    ctx.lineCap = "round";
    ctx.stroke();
  }
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
