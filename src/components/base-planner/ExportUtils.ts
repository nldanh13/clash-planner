import { BUILDINGS_BY_ID, GRID_SIZE, MAP_BORDER } from "./constants";
import { validateLayout } from "./LayoutValidator";
import type { BaseLayoutData, BuildingDef, PlacedBuilding } from "./types";
import { BUILDING_METADATA_MAP, getAllBuildingLimits, getTownHallCatalog } from "./catalog";
import { PlacementEngine } from "./generator/placementEngine";
import { PRNG } from "./generator/prng";
import { preloadImagesForBuildings, resolveCachedBuildingImage } from "./imageMapper";
import {
  DEFAULT_ISO_CONFIG,
  createDirtPathPattern,
  createLawnPattern,
  depthKeyForRect,
  drawGrassTufts,
  getForestRing,
  getSpriteContentBounds,
  getWallVariant,
  gridToIso,
  wallBrightnessBucket,
  type IsoViewport,
  type Point,
} from "./isometricUtils";

/**
 * Generates and downloads high-resolution PNG of the 44x44 base layout
 */
export async function exportLayoutAsImage(
  buildings: PlacedBuilding[],
  townHallLevel: number,
  layoutName = "Clash-Path-Base"
): Promise<void> {
  // A one-shot export has no later redraw to pick up a still-loading sprite
  // the way the live canvas does, so the image cache must be fully warm
  // *before* drawing starts — otherwise every building silently falls back
  // to the plain colored box below, images or not.
  await preloadImagesForBuildings(buildings, townHallLevel);

  const canvas = document.createElement("canvas");
  const tileSize = 28; // high resolution export size
  const padding = 40;
  const boardSize = GRID_SIZE * tileSize;
  const width = boardSize + padding * 2;
  const headerHeight = 70;
  const height = boardSize + padding * 2 + headerHeight;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background - Dark Forest / CoC Grass Theme
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#1b3323");
  bgGrad.addColorStop(0.5, "#15281c");
  bgGrad.addColorStop(1, "#0f1c13");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Top Header Banner
  ctx.fillStyle = "#101d27";
  ctx.fillRect(0, 0, width, headerHeight);
  ctx.fillStyle = "#2b3c4b";
  ctx.fillRect(0, headerHeight - 1, width, 1);

  // Header Title & TH Badge
  ctx.fillStyle = "#ffc857";
  ctx.font = "bold 20px 'Segoe UI', Inter, sans-serif";
  ctx.fillText("CLASH PATH — BASE PLANNER", padding, 32);

  ctx.fillStyle = "#91a0ad";
  ctx.font = "12px 'Segoe UI', Inter, sans-serif";
  ctx.fillText(
    `Town Hall ${townHallLevel} · ${buildings.length} công trình/vật phẩm · ${new Date().toLocaleDateString("vi-VN")}`,
    padding,
    52
  );

  // Draw Grid Arena Area
  const startX = padding;
  const startY = headerHeight + padding;

  // Arena Grass Background
  const grassGrad = ctx.createRadialGradient(
    startX + boardSize / 2,
    startY + boardSize / 2,
    50,
    startX + boardSize / 2,
    startY + boardSize / 2,
    boardSize / 1.3
  );
  grassGrad.addColorStop(0, "#2c5238");
  grassGrad.addColorStop(1, "#1e3a27");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(startX, startY, boardSize, boardSize);

  // Grid Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(startX + pos, startY);
    ctx.lineTo(startX + pos, startY + boardSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY + pos);
    ctx.lineTo(startX + boardSize, startY + pos);
    ctx.stroke();
  }

  // 4-tile Center Marker
  const centerStart = 20 * tileSize;
  const centerSize = 4 * tileSize;
  ctx.fillStyle = "rgba(255, 200, 87, 0.08)";
  ctx.fillRect(startX + centerStart, startY + centerStart, centerSize, centerSize);
  ctx.strokeStyle = "rgba(255, 200, 87, 0.25)";
  ctx.strokeRect(startX + centerStart, startY + centerStart, centerSize, centerSize);

  // Draw Walls first (so buildings render cleanly over walls if near)
  const walls = buildings.filter((b) => b.buildingId === "wall");
  for (const wall of walls) {
    const px = startX + wall.x * tileSize;
    const py = startY + wall.y * tileSize;
    const wallImg = resolveCachedBuildingImage("wall", wall.level, townHallLevel);

    if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
      ctx.drawImage(wallImg, px, py, tileSize, tileSize);
    } else {
      ctx.fillStyle = "#a4b0be";
      ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = "#57606f";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);

      // Wall 3D top shine
      ctx.fillStyle = "#dfe4ea";
      ctx.fillRect(px + 4, py + 4, tileSize - 8, 3);
    }
  }

  // Draw Non-Wall Buildings
  const nonWalls = buildings.filter((b) => b.buildingId !== "wall");
  for (const b of nonWalls) {
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def) continue;

    const px = startX + b.x * tileSize;
    const py = startY + b.y * tileSize;
    const w = def.width * tileSize;
    const h = def.height * tileSize;

    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(px + 3, py + 3, w, h);

    const img = resolveCachedBuildingImage(b.buildingId, b.level, townHallLevel);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, px + 1, py + 1, w - 2, h - 2);
    } else {
      // Building Base Box
      ctx.fillStyle = def.color || "#34495e";
      ctx.fillRect(px + 1, py + 1, w - 2, h - 2);

      // Darker inner border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);

      // Top highlight bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(px + 2, py + 2, w - 4, 3);

      // Label
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(9, Math.min(13, (def.width * tileSize) / 4))}px 'Segoe UI', Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const label = def.name.length > 12 && def.width <= 2 ? def.name.slice(0, 8) + ".." : def.name;
      ctx.fillText(label, px + w / 2, py + h / 2);
    }
  }

  // Watermark at bottom right
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "11px 'Segoe UI', Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Clash Path — AI Studio", width - padding, height - 15);

  // Trigger Download
  const link = document.createElement("a");
  link.download = `${layoutName}-TH${townHallLevel}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and downloads a high-resolution PNG of the same isometric "3D"
 * view IsometricGridBoard renders live — mowed-lawn ground texture,
 * depth-sorted real building sprites, brightness-varied walls — as a single
 * static snapshot instead of an interactive canvas.
 */
export async function exportLayoutAsIsometricImage(
  buildings: PlacedBuilding[],
  townHallLevel: number,
  layoutName = "Clash-Path-Base"
): Promise<void> {
  await preloadImagesForBuildings(buildings, townHallLevel);

  const config = DEFAULT_ISO_CONFIG;
  const corners: Point[] = [
    gridToIso(-MAP_BORDER, -MAP_BORDER, config),
    gridToIso(GRID_SIZE + MAP_BORDER, -MAP_BORDER, config),
    gridToIso(GRID_SIZE + MAP_BORDER, GRID_SIZE + MAP_BORDER, config),
    gridToIso(-MAP_BORDER, GRID_SIZE + MAP_BORDER, config),
  ];
  const minX = Math.min(...corners.map((c) => c.x));
  const maxX = Math.max(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  const maxY = Math.max(...corners.map((c) => c.y));
  const worldW = maxX - minX;
  const worldH = maxY - minY;

  const targetWidth = 2200;
  const headerHeight = 90;
  const sidePad = 60;
  // Generous headroom above the diamond: sprites stand upright and extend
  // well past their own footprint (a Town Hall or hero towers over one
  // tile), and near the map's top corner that overflow has nowhere to go
  // but into this margin.
  const topSkyPad = 260;
  const bottomPad = 60;

  const availW = targetWidth - sidePad * 2;
  const zoom = availW / worldW;
  const boardPixelHeight = worldH * zoom;
  const canvasWidth = targetWidth;
  const canvasHeight = Math.ceil(headerHeight + topSkyPad + boardPixelHeight + bottomPad);

  const viewport: IsoViewport = {
    zoom,
    panX: sidePad + (availW - worldW * zoom) / 2 - minX * zoom,
    panY: headerHeight + topSkyPad - minY * zoom,
  };

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const bgGrad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  bgGrad.addColorStop(0, "#0d1822");
  bgGrad.addColorStop(1, "#070d13");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#101d27";
  ctx.fillRect(0, 0, canvasWidth, headerHeight);
  ctx.fillStyle = "#2b3c4b";
  ctx.fillRect(0, headerHeight - 1, canvasWidth, 1);
  ctx.fillStyle = "#ffc857";
  ctx.font = "bold 26px 'Segoe UI', Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("CLASH PATH — BASE PLANNER (3D)", sidePad, 42);
  ctx.fillStyle = "#91a0ad";
  ctx.font = "14px 'Segoe UI', Inter, sans-serif";
  ctx.fillText(
    `Town Hall ${townHallLevel} · ${buildings.length} công trình/vật phẩm · ${new Date().toLocaleDateString("vi-VN")}`,
    sidePad,
    68
  );

  const project = (gx: number, gy: number): Point => {
    const world = gridToIso(gx, gy, config);
    return { x: world.x * viewport.zoom + viewport.panX, y: world.y * viewport.zoom + viewport.panY };
  };

  const drawDiamond = (points: Point[], fill: string | CanvasGradient | CanvasPattern) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  // A ring of procedural trees just outside the map — see getForestRing —
  // so the exported image shows the buildable island sitting in a forest
  // clearing like the real game, instead of fading into empty background.
  const forestRing = getForestRing(GRID_SIZE, MAP_BORDER, config);
  if (forestRing) {
    ctx.drawImage(
      forestRing.canvas,
      forestRing.worldX * viewport.zoom + viewport.panX,
      forestRing.worldY * viewport.zoom + viewport.panY,
      forestRing.canvas.width * viewport.zoom,
      forestRing.canvas.height * viewport.zoom
    );
  }

  // Ground: border ring (a worn dirt path, a different material from the
  // buildable lawn — see createDirtPathPattern) + the buildable diamond
  // with the mowed-lawn texture.
  const borderPoints = [
    project(-MAP_BORDER, -MAP_BORDER),
    project(GRID_SIZE + MAP_BORDER, -MAP_BORDER),
    project(GRID_SIZE + MAP_BORDER, GRID_SIZE + MAP_BORDER),
    project(-MAP_BORDER, GRID_SIZE + MAP_BORDER),
  ];
  drawDiamond(borderPoints, "#6b5334");
  const dirtPattern = createDirtPathPattern(ctx, viewport.zoom, config);
  if (dirtPattern) {
    drawDiamond(borderPoints, dirtPattern);
  }
  const lawnPattern = createLawnPattern(ctx, viewport.zoom, config);
  const groundPoints = [project(0, 0), project(GRID_SIZE, 0), project(GRID_SIZE, GRID_SIZE), project(0, GRID_SIZE)];
  drawDiamond(groundPoints, "#16311f");
  if (lawnPattern) drawDiamond(groundPoints, lawnPattern);
  {
    const gradient = ctx.createLinearGradient(
      groundPoints[0].x,
      groundPoints[0].y,
      groundPoints[2].x,
      groundPoints[2].y
    );
    gradient.addColorStop(0, "rgba(60,110,75,0.28)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,10,5,0.3)");
    drawDiamond(groundPoints, gradient);
  }

  // Buildings, depth-sorted (painter's algorithm) so nearer sprites
  // correctly occlude farther ones — matching the live isometric view.
  const drawable = buildings
    .map((b) => {
      const def = BUILDINGS_BY_ID.get(b.buildingId);
      if (!def) return null;
      return { b, def, depth: depthKeyForRect(b.x, b.y, def.width, def.height) };
    })
    .filter((v): v is { b: PlacedBuilding; def: BuildingDef; depth: number } => v !== null)
    .sort((a, c) => a.depth - c.depth);

  for (const { b, def } of drawable) {
    const top = project(b.x, b.y);
    const right = project(b.x + def.width, b.y);
    const bottom = project(b.x + def.width, b.y + def.height);
    const left = project(b.x, b.y + def.height);
    const isWall = def.category === "wall";

    const img = resolveCachedBuildingImage(b.buildingId, b.level, townHallLevel);
    if (!img || !img.complete || img.naturalWidth <= 0) {
      // No cached art even after preloading (a genuine 404) — a flat
      // footprint tint beats leaving a hole in the export.
      drawDiamond([top, right, bottom, left], def.color || "#34495e");
      continue;
    }

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const footprintSpan = Math.hypot(right.x - left.x, right.y - left.y);
    const bounds = getSpriteContentBounds(img);
    // Floored at 0.85, not the crop's real value — see the matching comment
    // in IsometricGridBoard.tsx for why letting each crop's own padding
    // dictate its width blow-up made same-footprint buildings render at
    // wildly inconsistent sizes next to each other.
    const contentWidthFrac = Math.max(0.85, bounds.right - bounds.left);
    // Fit the sprite's actual non-transparent content to the footprint
    // span, not its raw padded canvas — see getSpriteContentBounds.
    let drawWidth = footprintSpan / contentWidthFrac;
    // Thin natural grass margin around each building's own plot — see the
    // matching comment in IsometricGridBoard.tsx. Walls stay full-width
    // (a continuous barrier, not an individual plot).
    if (!isWall) drawWidth *= 0.93;
    let drawHeight = drawWidth * (nh / nw);
    // Safety ceiling measured against real CONTENT height, applied to
    // HEIGHT ONLY (not rescaling drawWidth back down with it) — see the
    // matching comment in IsometricGridBoard.tsx for why.
    const contentHeightFrac = Math.max(0.2, bounds.bottom - bounds.top);
    const contentHeightPx = drawHeight * contentHeightFrac;
    const oneTileHeightPx = config.tileHeight * viewport.zoom;
    const maxContentHeight = Math.max(def.width, def.height) * oneTileHeightPx * 1.8;
    if (contentHeightPx > maxContentHeight) {
      drawHeight *= maxContentHeight / contentHeightPx;
    }
    const centerX = (top.x + right.x + bottom.x + left.x) / 4;
    const anchorY = bottom.y - (bottom.y - top.y) * 0.12;
    // Anchor on the CONTENT's own edges, not the padded canvas's edges —
    // see the matching comment in IsometricGridBoard.tsx.
    const contentCenterFrac = (bounds.left + bounds.right) / 2;
    const drawX = centerX - drawWidth * contentCenterFrac;
    const drawY = anchorY - drawHeight * bounds.bottom;

    if (isWall) {
      const bucket = wallBrightnessBucket(b.x, b.y);
      const source = bucket === 0 ? img : getWallVariant(img, bucket) || img;
      ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
      continue;
    }

    // Ambient diamond shadow + tight contact-shadow ellipse, matching the
    // live view's grounding cues.
    const shadowRadius =
      Math.max(Math.hypot(right.x - left.x, right.y - left.y), Math.hypot(top.x - bottom.x, top.y - bottom.y)) / 2;
    if (Number.isFinite(shadowRadius) && shadowRadius > 0) {
      const cx = (top.x + right.x + bottom.x + left.x) / 4;
      const cy = (top.y + right.y + bottom.y + left.y) / 4;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, shadowRadius);
      gradient.addColorStop(0, "rgba(0,0,0,0.4)");
      gradient.addColorStop(0.75, "rgba(0,0,0,0.16)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      drawDiamond([top, right, bottom, left], gradient);
    }
    drawGrassTufts(ctx, [top, right, bottom, left], b.x, b.y, viewport.zoom);
    // Sized off footprintSpan (the real content width), not drawWidth (the
    // padded canvas), so the shadow tracks the visible art. Centered a bit
    // above anchorY, not exactly on it — see the matching comment in
    // IsometricGridBoard.tsx for why (a crop's own opaque base art
    // otherwise fully hides the ellipse behind it).
    // Small rightward nudge on top of the upward one — reads as a light
    // source from the upper-left, matching the real game's building icons.
    const shadowCenterX = centerX + footprintSpan * 0.1;
    const shadowCenterY = anchorY - footprintSpan * 0.15;
    ctx.beginPath();
    ctx.ellipse(shadowCenterX, shadowCenterY, footprintSpan * 0.32, Math.max(2, footprintSpan * 0.13), 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.36)";
    ctx.fill();
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "12px 'Segoe UI', Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Clash Path — AI Studio", canvasWidth - sidePad, canvasHeight - 15);

  const link = document.createElement("a");
  link.download = `${layoutName}-TH${townHallLevel}-3D.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports base layout data as a JSON file
 */
export function exportLayoutAsJSON(
  buildings: PlacedBuilding[],
  townHallLevel: number,
  layoutName = "Clash-Path-Base"
): void {
  const data: BaseLayoutData = {
    version: 1,
    name: layoutName,
    townHallLevel,
    buildings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${layoutName}-TH${townHallLevel}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates imported JSON file
 */
export async function importLayoutFromJSON(file: File): Promise<BaseLayoutData> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Tệp JSON không đúng định dạng.");
  }

  if (!Array.isArray(parsed.buildings)) {
    throw new Error("Không tìm thấy danh sách công trình trong tệp JSON.");
  }

  const validBuildings: PlacedBuilding[] = [];
  for (const b of parsed.buildings) {
    if (
      typeof b.buildingId === "string" &&
      typeof b.x === "number" &&
      typeof b.y === "number" &&
      BUILDINGS_BY_ID.has(b.buildingId)
    ) {
      validBuildings.push({
        instanceId: b.instanceId || `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        buildingId: b.buildingId,
        x: Math.max(0, Math.min(43, Math.trunc(b.x))),
        y: Math.max(0, Math.min(43, Math.trunc(b.y))),
      });
    }
  }

  return {
    version: 1,
    name: typeof parsed.name === "string" ? parsed.name : "Imported Base",
    townHallLevel:
      typeof parsed.townHallLevel === "number"
        ? Math.max(1, Math.min(18, Math.trunc(parsed.townHallLevel)))
        : 11,
    buildings: validBuildings,
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pre-built symmetrical starter base presets for quick preview and editing.
 * Dynamically builds a valid layout conforming to the exact catalog of the requested Town Hall level.
 */
export function getPresetLayout(townHallLevel: number): PlacedBuilding[] {
  const th = Math.max(1, Math.min(18, Math.trunc(townHallLevel || 11)));
  const limits = getAllBuildingLimits(th);
  const engine = new PlacementEngine(new PRNG(th * 1000 + 42));
  const list: PlacedBuilding[] = [];
  let idCounter = 1;

  const currentCounts: Record<string, number> = {};

  const place = (buildingId: string, x: number, y: number): boolean => {
    const meta = BUILDING_METADATA_MAP[buildingId];
    if (!meta) return false;
    const maxLimit = limits[buildingId] || 0;
    const current = currentCounts[buildingId] || 0;
    if (current >= maxLimit) return false;

    const w = meta.width;
    const h = meta.height;
    if (!engine.isFree(x, y, w, h)) return false;

    const instId = `preset-${th}-${idCounter++}`;
    if (engine.place(instId, buildingId, x, y, w, h)) {
      currentCounts[buildingId] = current + 1;
      list.push({ instanceId: instId, buildingId, x, y });
      return true;
    }
    return false;
  };

  // 1. Center Core
  place("town-hall", 20, 20);
  if (limits["clan-castle"]) place("clan-castle", 20, 16);
  if (limits["eagle-artillery"]) place("eagle-artillery", 20, 25);
  if (limits["monolith"]) place("monolith", 25, 20);
  if (limits["spell-tower"]) place("spell-tower", 16, 20);

  // 2. Inner Defenses
  if (limits["inferno-tower"]) {
    place("inferno-tower", 16, 20);
    place("inferno-tower", 25, 20);
  }
  if (limits["xbow"]) {
    place("xbow", 16, 16);
    place("xbow", 25, 16);
    place("xbow", 16, 25);
    place("xbow", 25, 25);
  }

  // 3. Air Defenses
  if (limits["air-defense"]) {
    place("air-defense", 12, 16);
    place("air-defense", 29, 16);
    place("air-defense", 12, 25);
    place("air-defense", 29, 25);
  }

  // 4. Wizard Towers
  if (limits["wizard-tower"]) {
    place("wizard-tower", 12, 20);
    place("wizard-tower", 29, 20);
    place("wizard-tower", 20, 12);
    place("wizard-tower", 20, 30);
  }

  // 5. Heroes (if unlocked at this TH)
  if (limits["archer-queen"]) place("archer-queen", 16, 12);
  if (limits["barbarian-king"]) place("barbarian-king", 25, 12);
  if (limits["grand-warden"]) place("grand-warden", 16, 29);
  if (limits["royal-champion"]) place("royal-champion", 25, 29);

  // 6. Storages
  if (limits["dark-elixir-storage"]) place("dark-elixir-storage", 21, 24);
  if (limits["gold-storage"]) {
    place("gold-storage", 12, 12);
    place("gold-storage", 29, 12);
  }
  if (limits["elixir-storage"]) {
    place("elixir-storage", 12, 29);
    place("elixir-storage", 29, 29);
  }

  // 7. Inner Wall Rings if walls available
  const wallLimit = limits["wall"] || 0;
  if (wallLimit > 0) {
    for (let x = 14; x <= 30; x++) {
      place("wall", x, 10);
      place("wall", x, 34);
    }
    for (let y = 10; y <= 34; y++) {
      place("wall", 14, y);
      place("wall", 30, y);
    }
  }

  // 8. Outer Defenses
  if (limits["cannon"]) {
    place("cannon", 8, 12);
    place("cannon", 33, 12);
    place("cannon", 8, 29);
    place("cannon", 33, 29);
    place("cannon", 20, 7);
  }
  if (limits["archer-tower"]) {
    place("archer-tower", 8, 17);
    place("archer-tower", 33, 17);
    place("archer-tower", 8, 24);
    place("archer-tower", 33, 24);
    place("archer-tower", 20, 36);
  }

  // 9. Traps
  if (limits["giant-bomb"]) {
    place("giant-bomb", 14, 8);
    place("giant-bomb", 27, 8);
  }
  if (limits["tornado-trap"]) place("tornado-trap", 20, 19);
  if (limits["seeking-air-mine"]) {
    place("seeking-air-mine", 11, 15);
    place("seeking-air-mine", 30, 15);
  }

  // 10. Dynamically fill all remaining catalog items to reach exact required totals
  const catalog = getTownHallCatalog(th);
  for (const item of catalog) {
    const current = currentCounts[item.buildingId] || 0;
    const missing = item.count - current;
    for (let i = 0; i < missing; i++) {
      const pos = engine.findNearestFree(22, 22, item.width, item.height);
      if (pos) {
        place(item.buildingId, pos.x, pos.y);
      }
    }
  }

  const { sanitizedBuildings } = validateLayout(list, th);
  return sanitizedBuildings;
}
