import type { DecorationDef } from "./types";

/**
 * Hand-drawn canvas art for cosmetic decorations, replacing the old flat
 * color-tile + emoji-glyph placeholder. Every shape is built from canvas
 * paths/gradients (not a cropped or stretched photo) specifically so every
 * proportion, color, and detail stays easy to nudge later — an emoji glyph
 * or an embedded screenshot can't be adjusted piece by piece the way a
 * drawing routine can.
 *
 * Each function draws inside the (x, y, w, h) box already used by the old
 * placeholder, so callers don't need to change their layout math — only
 * swap what gets drawn into that box.
 */

type Ctx = CanvasRenderingContext2D;

function groundShadow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.88, w * 0.38, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();
  ctx.restore();
}

function drawPineTree(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  const trunkW = w * 0.14;
  const trunkH = h * 0.18;
  ctx.fillStyle = "#5b3a24";
  ctx.fillRect(cx - trunkW / 2, y + h * 0.82 - trunkH, trunkW, trunkH);

  const tiers = [
    { yTop: y + h * 0.05, yBase: y + h * 0.42, half: w * 0.42, color: "#2f9653" },
    { yTop: y + h * 0.25, yBase: y + h * 0.62, half: w * 0.36, color: def.color },
    { yTop: y + h * 0.45, yBase: y + h * 0.82, half: w * 0.3, color: def.color },
  ];
  for (const t of tiers) {
    ctx.beginPath();
    ctx.moveTo(cx, t.yTop);
    ctx.lineTo(cx - t.half, t.yBase);
    ctx.lineTo(cx + t.half, t.yBase);
    ctx.closePath();
    ctx.fillStyle = t.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(0.5, w * 0.015);
    ctx.stroke();
  }
  // Highlight sliver down the sunlit side for a bit of volume.
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.05);
  ctx.lineTo(cx - w * 0.06, y + h * 0.42);
  ctx.lineTo(cx, y + h * 0.42);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fill();
}

function drawBush(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const lobes = [
    { dx: -0.28, dy: 0.05, r: 0.34 },
    { dx: 0.26, dy: 0.08, r: 0.32 },
    { dx: 0, dy: -0.15, r: 0.36 },
  ];
  for (const l of lobes) {
    const lx = x + w / 2 + l.dx * w;
    const ly = y + h * 0.6 + l.dy * h;
    ctx.beginPath();
    ctx.ellipse(lx, ly, w * l.r, h * l.r * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
  }
  // A lighter cap on the topmost lobe for depth.
  ctx.beginPath();
  ctx.ellipse(x + w / 2 - w * 0.05, y + h * 0.38, w * 0.2, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = def.accentColor || "rgba(255,255,255,0.3)";
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFlowerPot(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const potTop = y + h * 0.66;
  const potBottom = y + h * 0.9;
  const topHalf = w * 0.26;
  const bottomHalf = w * 0.19;
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf, potTop);
  ctx.lineTo(cx + topHalf, potTop);
  ctx.lineTo(cx + bottomHalf, potBottom);
  ctx.lineTo(cx - bottomHalf, potBottom);
  ctx.closePath();
  ctx.fillStyle = "#a5622f";
  ctx.fill();
  ctx.fillStyle = "#c97b3d";
  ctx.fillRect(cx - topHalf, potTop, topHalf * 2, h * 0.05);

  const stems = [-0.12, 0, 0.13];
  const blossomColors = [def.color, def.accentColor || def.color, "#f4d35e"];
  stems.forEach((dx, i) => {
    const bx = cx + dx * w;
    const by = y + h * (0.42 - Math.abs(dx) * 0.4);
    ctx.beginPath();
    ctx.moveTo(bx, potTop);
    ctx.lineTo(bx, by + h * 0.06);
    ctx.strokeStyle = "#3d8b3d";
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, w * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = blossomColors[i % blossomColors.length];
    ctx.fill();
  });
}

function drawStatue(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  const baseW = w * 0.6;
  const baseH = h * 0.14;
  const baseY = y + h * 0.82;
  ctx.fillStyle = "#7a6c52";
  ctx.fillRect(cx - baseW / 2, baseY, baseW, baseH);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeRect(cx - baseW / 2, baseY, baseW, baseH);

  // Simple carved-figure silhouette: rounded head + tapered robe body.
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.28, w * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.1, y + h * 0.4);
  ctx.quadraticCurveTo(cx - w * 0.3, y + h * 0.7, cx - w * 0.26, baseY);
  ctx.lineTo(cx + w * 0.26, baseY);
  ctx.quadraticCurveTo(cx + w * 0.3, y + h * 0.7, cx + w * 0.1, y + h * 0.4);
  ctx.closePath();
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = Math.max(0.5, w * 0.02);
  ctx.stroke();
  // Weathering highlight down one side.
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, y + h * 0.4);
  ctx.lineTo(cx - w * 0.18, baseY);
  ctx.strokeStyle = def.accentColor || "rgba(255,255,255,0.4)";
  ctx.lineWidth = Math.max(0.5, w * 0.03);
  ctx.stroke();
}

function drawFountain(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.6;
  const rimRx = w * 0.42;
  const rimRy = h * 0.24;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rimRx, rimRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#9aa3a8";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = Math.max(0.5, w * 0.02);
  ctx.stroke();

  const waterGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rimRx * 0.85);
  waterGrad.addColorStop(0, def.accentColor || "#5dade2");
  waterGrad.addColorStop(1, def.color);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rimRx * 0.8, rimRy * 0.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = waterGrad;
  ctx.fill();

  // Center spout with a small splash burst above it.
  ctx.fillStyle = "#8a9296";
  ctx.fillRect(cx - w * 0.05, y + h * 0.22, w * 0.1, h * 0.28);
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.2, w * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (const [dx, dy] of [
    [-0.16, -0.02],
    [0.18, 0.04],
    [0.02, -0.08],
  ]) {
    ctx.beginPath();
    ctx.arc(cx + dx * w, cy + dy * h, w * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLantern(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  ctx.fillStyle = "#4a3a2a";
  ctx.fillRect(cx - w * 0.04, y + h * 0.3, w * 0.08, h * 0.55);

  const glow = ctx.createRadialGradient(cx, y + h * 0.28, 1, cx, y + h * 0.28, w * 0.35);
  glow.addColorStop(0, "rgba(255,201,71,0.55)");
  glow.addColorStop(1, "rgba(255,201,71,0)");
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.28, w * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  const boxW = w * 0.32;
  const boxH = h * 0.32;
  ctx.fillStyle = def.color;
  ctx.fillRect(cx - boxW / 2, y + h * 0.12, boxW, boxH);
  ctx.fillStyle = def.accentColor || "#f39c12";
  ctx.fillRect(cx - boxW / 2 + boxW * 0.18, y + h * 0.12 + boxH * 0.18, boxW * 0.64, boxH * 0.64);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.02);
  ctx.strokeRect(cx - boxW / 2, y + h * 0.12, boxW, boxH);
  ctx.fillStyle = "#4a3a2a";
  ctx.fillRect(cx - boxW * 0.3, y + h * 0.08, boxW * 0.6, h * 0.04);
}

function drawTorch(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  ctx.fillStyle = "#7f5539";
  ctx.fillRect(cx - w * 0.05, y + h * 0.42, w * 0.1, h * 0.46);

  const glow = ctx.createRadialGradient(cx, y + h * 0.32, 1, cx, y + h * 0.32, w * 0.4);
  glow.addColorStop(0, "rgba(243,156,18,0.5)");
  glow.addColorStop(1, "rgba(243,156,18,0)");
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.32, w * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  const flame = (scale: number, color: string, offsetY: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, y + h * (0.06 + offsetY));
    ctx.bezierCurveTo(
      cx + w * 0.16 * scale,
      y + h * (0.22 + offsetY),
      cx + w * 0.1 * scale,
      y + h * (0.38 + offsetY),
      cx,
      y + h * (0.42 + offsetY)
    );
    ctx.bezierCurveTo(
      cx - w * 0.1 * scale,
      y + h * (0.38 + offsetY),
      cx - w * 0.16 * scale,
      y + h * (0.22 + offsetY),
      cx,
      y + h * (0.06 + offsetY)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  flame(1, "#d35400", 0);
  flame(0.7, def.accentColor || "#f39c12", 0.05);
  flame(0.35, "#fff3c4", 0.1);
}

function drawFlag(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const poleX = x + w * 0.32;
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(poleX, y + h * 0.08, w * 0.04, h * 0.78);
  ctx.beginPath();
  ctx.arc(poleX + w * 0.02, y + h * 0.08, w * 0.035, 0, Math.PI * 2);
  ctx.fillStyle = "#c9a227";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(poleX + w * 0.04, y + h * 0.14);
  ctx.quadraticCurveTo(x + w * 0.75, y + h * 0.1, x + w * 0.82, y + h * 0.24);
  ctx.quadraticCurveTo(x + w * 0.68, y + h * 0.3, poleX + w * 0.04, y + h * 0.4);
  ctx.closePath();
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + w * 0.55, y + h * 0.24, w * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = def.accentColor || "#5dade2";
  ctx.fill();
}

function drawRockPile(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const boulders = [
    { dx: -0.2, dy: 0.1, r: 0.32, color: def.color },
    { dx: 0.18, dy: 0.14, r: 0.28, color: "#525a5b" },
    { dx: 0, dy: -0.08, r: 0.3, color: def.accentColor || "#aab7b8" },
  ];
  for (const b of boulders) {
    const bx = x + w / 2 + b.dx * w;
    const by = y + h * 0.62 + b.dy * h;
    const r = w * b.r;
    ctx.beginPath();
    ctx.moveTo(bx - r, by + r * 0.4);
    ctx.lineTo(bx - r * 0.6, by - r * 0.7);
    ctx.lineTo(bx + r * 0.3, by - r);
    ctx.lineTo(bx + r, by - r * 0.2);
    ctx.lineTo(bx + r * 0.7, by + r * 0.6);
    ctx.lineTo(bx - r * 0.3, by + r * 0.7);
    ctx.closePath();
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = Math.max(0.5, w * 0.015);
    ctx.stroke();
    // Crevice line for texture.
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.2, by - r * 0.4);
    ctx.lineTo(bx + r * 0.1, by + r * 0.3);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.stroke();
  }
}

function drawGate(ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) {
  groundShadow(ctx, x, y, w, h);
  const postW = w * 0.06;
  const postTop = y + h * 0.22;
  const postBottom = y + h * 0.88;
  const leftX = x + w * 0.16;
  const rightX = x + w * 0.84 - postW;

  ctx.fillStyle = def.color;
  ctx.fillRect(leftX, postTop, postW, postBottom - postTop);
  ctx.fillRect(rightX, postTop, postW, postBottom - postTop);

  // Torii-style crossbeams: a longer curved top beam and a straight one below it.
  ctx.beginPath();
  ctx.moveTo(x + w * 0.06, y + h * 0.26);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.14, x + w * 0.94, y + h * 0.26);
  ctx.lineTo(x + w * 0.94, y + h * 0.34);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.22, x + w * 0.06, y + h * 0.34);
  ctx.closePath();
  ctx.fillStyle = def.accentColor || "#e59866";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();

  ctx.fillStyle = def.color;
  ctx.fillRect(x + w * 0.1, y + h * 0.4, w * 0.8, h * 0.06);
}

const RENDERERS: Record<
  string,
  (ctx: Ctx, x: number, y: number, w: number, h: number, def: DecorationDef) => void
> = {
  "deco-pine-tree": drawPineTree,
  "deco-bush": drawBush,
  "deco-flower": drawFlowerPot,
  "deco-statue": drawStatue,
  "deco-fountain": drawFountain,
  "deco-lantern": drawLantern,
  "deco-torch": drawTorch,
  "deco-flag": drawFlag,
  "deco-rock": drawRockPile,
  "deco-gate": drawGate,
};

/**
 * Draws hand-crafted vector art for a decoration inside the given pixel box.
 * Returns false if this decoration id has no dedicated art yet, so the
 * caller can fall back to the color-tile + emoji placeholder.
 */
export function drawDecorationArt(
  ctx: Ctx,
  decorationId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  def: DecorationDef
): boolean {
  const renderer = RENDERERS[decorationId];
  if (!renderer) return false;
  ctx.save();
  try {
    renderer(ctx, x, y, w, h, def);
  } finally {
    ctx.restore();
  }
  return true;
}
