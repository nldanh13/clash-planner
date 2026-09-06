import { GRID_SIZE } from "../constants";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CompartmentLayout {
  /** Innermost, most heavily walled compartment — Town Hall + Clan Castle live here. */
  core: Rect;
  /** Every other compartment, ordered nearest-to-center first, so higher-tier
   *  defenses can be assigned to inner rings and lower-tier ones pushed outward. */
  compartments: Rect[];
  /** Deduplicated wall tile coordinates realizing every compartment boundary
   *  (core ring(s) + each compartment's own outline, shared edges drawn once). */
  wallTiles: Array<{ x: number; y: number }>;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Outline (perimeter) tiles of a rect, clamped to the grid. */
function rectOutline(r: Rect): Array<{ x: number; y: number }> {
  const minX = clamp(r.x, 0, GRID_SIZE - 1);
  const maxX = clamp(r.x + r.w - 1, 0, GRID_SIZE - 1);
  const minY = clamp(r.y, 0, GRID_SIZE - 1);
  const maxY = clamp(r.y + r.h - 1, 0, GRID_SIZE - 1);
  if (maxX < minX || maxY < minY) return [];

  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x++) {
    tiles.push({ x, y: minY });
    if (maxY !== minY) tiles.push({ x, y: maxY });
  }
  for (let y = minY + 1; y < maxY; y++) {
    tiles.push({ x: minX, y });
    if (maxX !== minX) tiles.push({ x: maxX, y });
  }
  return tiles;
}

function expand(r: Rect, n: number): Rect {
  return { x: r.x - n, y: r.y - n, w: r.w + n * 2, h: r.h + n * 2 };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/**
 * Builds a real, wall-count-aware multi-compartment layout instead of the old
 * scheme of one fixed core ring + 8 hardcoded wing/corner boxes at absolute
 * offsets (unrelated to how many walls a Town Hall level actually has, and
 * generated blind to where buildings end up). Real base-building guidance is
 * "many small compartments, not a few big ones, with the core behind 2+ wall
 * layers" — this tiles the playable area into a grid of compartments sized
 * to fit the wall budget (fewer/bigger at low Town Hall levels that can't
 * afford much walling, many/smaller once the budget allows), with a
 * dedicated inner core getting a genuine double wall ring when the budget
 * supports it. Because this generates the walls FIRST, the caller can then
 * target each building at a specific compartment's center and get an actual
 * match between "where a wall says a building should be" and "where it is" —
 * the old pipeline placed buildings and walls independently and never
 * checked they agreed.
 */
export function generateCompartmentLayout(wallBudget: number): CompartmentLayout {
  const center = GRID_SIZE / 2;

  // Bigger, better-walled core the more walls are available overall — a TH2
  // with 25 walls total can't spare 60+ on an elaborate double-ringed core.
  // 9 is the minimum that leaves a 7-wide interior (coreSize-2) — just
  // enough to seat Town Hall (4x4) and Clan Castle (3x3) side by side
  // without either spilling out of the core; below that (very low wall
  // budgets) Clan Castle isn't guaranteed to fit alongside Town Hall and
  // may land just outside the core instead, which is an acceptable
  // trade-off at levels this small anyway.
  const coreSize = wallBudget >= 150 ? 10 : wallBudget >= 60 ? 9 : 6;
  const core: Rect = {
    x: Math.round(center - coreSize / 2),
    y: Math.round(center - coreSize / 2),
    w: coreSize,
    h: coreSize,
  };

  const wallSet = new Map<string, { x: number; y: number }>();
  const addTiles = (tiles: Array<{ x: number; y: number }>) => {
    for (const t of tiles) wallSet.set(`${t.x},${t.y}`, t);
  };

  addTiles(rectOutline(core));

  // A second ring 2 tiles further out (1-tile gap in between) — a real extra
  // wall LAYER around Town Hall, not just "close to the middle of the map".
  // Only when the budget can afford it; otherwise Town Hall still gets the
  // single core ring, which already beats the old scheme's un-walled
  // placement-by-coordinate-alone.
  const coreOuter = wallBudget >= 90 ? expand(core, 2) : core;
  if (coreOuter !== core) addTiles(rectOutline(coreOuter));

  // Tile the rest of the map into a fine 4x4 compartment grid, then
  // greedily keep only as many compartments — nearest the core first — as
  // the remaining wall budget can actually afford. Real Town Hall wall
  // budgets (25 at TH2 up to 325 at max) can't come close to fully
  // compartmentalizing the whole 44x44 map at any reasonable cell size —
  // even an all-8x8 tiling of just the playable interior needs 700+ wall
  // tiles — which matches how real war bases actually look: walls
  // concentrated in a compact core-and-inner-ring cluster (radius ~10-14
  // once the core itself is paid for), with a genuinely unwalled outer
  // buffer left for farms/army camps, not an attempt to wall the entire map.
  const margin = 2; // leave the outermost ring un-walled for loosely-placed army/resource buildings
  const size = 4;
  const candidateRects: Rect[] = [];
  for (let gy = margin; gy < GRID_SIZE - margin; gy += size) {
    for (let gx = margin; gx < GRID_SIZE - margin; gx += size) {
      const w = Math.min(size, GRID_SIZE - margin - gx);
      const h = Math.min(size, GRID_SIZE - margin - gy);
      if (w < 3 || h < 3) continue; // sliver too thin to hold anything useful
      const rect: Rect = { x: gx, y: gy, w, h };
      if (rectsOverlap(rect, coreOuter)) continue;
      candidateRects.push(rect);
    }
  }
  candidateRects.sort((a, b) => {
    const ca = rectCenter(a);
    const cb = rectCenter(b);
    return Math.hypot(ca.x - center, ca.y - center) - Math.hypot(cb.x - center, cb.y - center);
  });

  // candidateRects is already nearest-to-center first (sorted above), and
  // the greedy loop below fills chosenRects in that same order, so it's
  // already the order the caller wants for handing inner rings to
  // higher-priority defenses and pushing resources/army further out. The
  // budget check on every candidate means this can never exceed wallBudget,
  // so there's no over-budget trim needed afterward — every tile added
  // here is one the caller's exact wall count can actually cover.
  // The inner (4x4) and outer (7x7) grids are built independently, each on
  // its own offset — they aren't a single unified non-overlapping tiling —
  // so a candidate near the radius boundary can spatially overlap an
  // already-chosen compartment even though their centers fell on opposite
  // sides of the radius split. Rejecting that here (rather than only
  // deduplicating wall tiles) keeps every kept compartment's interior
  // genuinely its own.
  const chosenRects: Rect[] = [];
  for (const rect of candidateRects) {
    if (chosenRects.some((r) => rectsOverlap(rect, r))) continue;
    const newTiles = rectOutline(rect).filter((t) => !wallSet.has(`${t.x},${t.y}`));
    if (wallSet.size + newTiles.length > wallBudget) continue;
    for (const t of newTiles) wallSet.set(`${t.x},${t.y}`, t);
    chosenRects.push(rect);
  }

  return { core, compartments: chosenRects, wallTiles: Array.from(wallSet.values()) };
}
