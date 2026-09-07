import type { BuildingDef } from "./types";

/**
 * Hand-drawn canvas fallback art for every building/defense/trap in
 * BUILDINGS_CATALOG, used only when no real sprite is loaded for that
 * building (see imageMapper.ts's 3-tier priority: local file, coc.guide
 * hotlink, then this). Previously that fallback was a single flat
 * `def.color` rectangle — recognizable only by color, and identical for
 * every building in a category. Every shape here is canvas paths and
 * gradients built from the building's own color/accentColor, not a
 * cropped or stretched screenshot, so it stays easy to retune per id
 * later without touching the others.
 *
 * Coverage strategy: the most visually distinctive defenses each get a
 * bespoke silhouette; buildings that are naturally variations on a theme
 * (storages, mines, production huts, hero altars, traps) share a small
 * set of parameterized templates with a per-id accent icon/emblem, so
 * every one of the ~53 catalog entries reads as a distinct, deliberate
 * drawing instead of a colored box, without hand-authoring 53 unrelated
 * shapes from scratch.
 */

type Ctx = CanvasRenderingContext2D;

function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0x00ff) + amt);
  const b = clamp((num & 0x0000ff) + amt);
  return `rgb(${r},${g},${b})`;
}

function roundBase(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  const cx = x + w / 2;
  const cy = y + h * 0.72;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
  const grad = ctx.createLinearGradient(x, cy - h * 0.22, x, cy + h * 0.22);
  grad.addColorStop(0, shade(color, 15));
  grad.addColorStop(1, shade(color, -20));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();
}

// ---------------------------------------------------------------------
// Bespoke defense silhouettes
// ---------------------------------------------------------------------

function drawTownHall(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const accent = def.accentColor || shade(def.color, -20);
  const bottom = y + h * 0.88;
  const domeTop = y + h * 0.28;
  const half = w * 0.38;

  // Wooden fence ring at the base.
  ctx.strokeStyle = "#6e4423";
  ctx.lineWidth = Math.max(1, w * 0.025);
  ctx.beginPath();
  ctx.ellipse(cx, bottom, w * 0.47, h * 0.07, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = -4; i <= 4; i++) {
    const px = cx + (i / 4) * w * 0.44;
    ctx.beginPath();
    ctx.moveTo(px, bottom - h * 0.05);
    ctx.lineTo(px, bottom + h * 0.05);
    ctx.stroke();
  }

  // Domed thatched-hut body.
  ctx.beginPath();
  ctx.moveTo(cx - half, bottom);
  ctx.lineTo(cx - half, y + h * 0.55);
  ctx.quadraticCurveTo(cx - half, domeTop, cx, domeTop - h * 0.02);
  ctx.quadraticCurveTo(cx + half, domeTop, cx + half, y + h * 0.55);
  ctx.lineTo(cx + half, bottom);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  grad.addColorStop(0, shade(def.color, -12));
  grad.addColorStop(0.5, shade(def.color, 15));
  grad.addColorStop(1, shade(def.color, -12));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.012);
  ctx.stroke();

  // Thatch/plank lines curving with the dome.
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = Math.max(0.5, w * 0.01);
  for (const t of [0.35, 0.62, 0.85]) {
    const yy = domeTop + (bottom - domeTop) * t;
    const spread = half * (0.3 + t * 0.75);
    ctx.beginPath();
    ctx.moveTo(cx - spread, yy);
    ctx.quadraticCurveTo(cx, yy + h * 0.03, cx + spread, yy);
    ctx.stroke();
  }

  // Arched doorway.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.1, bottom);
  ctx.lineTo(cx - w * 0.1, bottom - h * 0.22);
  ctx.quadraticCurveTo(cx, bottom - h * 0.32, cx + w * 0.1, bottom - h * 0.22);
  ctx.lineTo(cx + w * 0.1, bottom);
  ctx.closePath();
  ctx.fill();

  // Roof cap ring + flagpole + banner.
  ctx.beginPath();
  ctx.ellipse(cx, domeTop, w * 0.09, h * 0.025, 0, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.strokeStyle = "#5b3a24";
  ctx.lineWidth = Math.max(1, w * 0.022);
  ctx.beginPath();
  ctx.moveTo(cx, domeTop);
  ctx.lineTo(cx, y - h * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y - h * 0.05);
  ctx.lineTo(cx + w * 0.15, y - h * 0.01);
  ctx.lineTo(cx, y + h * 0.03);
  ctx.closePath();
  ctx.fillStyle = "#c0392b";
  ctx.fill();
}

function drawCannonLike(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef, twin: boolean) {
  const cx = x + w / 2;
  const baseY = y + h * 0.8;
  // Round wooden gun-carriage platform.
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.4, h * 0.15, 0, 0, Math.PI * 2);
  const woodGrad = ctx.createLinearGradient(x, baseY - h * 0.15, x, baseY + h * 0.15);
  woodGrad.addColorStop(0, "#a5713e");
  woodGrad.addColorStop(1, "#6e4423");
  ctx.fillStyle = woodGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  for (const a of [0, Math.PI / 3, (-Math.PI) / 3]) {
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx + Math.cos(a) * w * 0.36, baseY + Math.sin(a) * h * 0.13);
    ctx.stroke();
  }

  const barrels = twin ? [-0.15, 0.15] : [0];
  for (const dx of barrels) {
    const bx = cx + dx * w;
    ctx.save();
    ctx.translate(bx, baseY - h * 0.1);
    ctx.rotate(-0.55);
    const len = h * 0.58;
    const bw = w * (twin ? 0.17 : 0.22);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(-bw / 2, -len, bw, len);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(-bw / 2 - 1, -len * 0.4, bw + 2, h * 0.045);
    ctx.fillRect(-bw / 2 - 1, -len * 0.78, bw + 2, h * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, -len, bw / 2, bw * 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(-bw * 0.28, -len, bw * 0.16, len);
    ctx.restore();
  }
}

function drawArcherTowerLike(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  def: BuildingDef,
  twin: boolean
) {
  const drawOne = (offsetX: number, scale: number) => {
    const cx = x + w / 2 + offsetX;
    const half = w * 0.22 * scale;
    const bottom = y + h * 0.86;
    const top = y + h * 0.24;

    ctx.beginPath();
    ctx.moveTo(cx - half, bottom);
    ctx.lineTo(cx - half * 0.82, top);
    ctx.lineTo(cx + half * 0.82, top);
    ctx.lineTo(cx + half, bottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    grad.addColorStop(0, "#8d8477");
    grad.addColorStop(0.5, "#c4bba8");
    grad.addColorStop(1, "#8d8477");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = Math.max(0.5, w * 0.012);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = Math.max(0.5, w * 0.008);
    for (let i = 1; i < 4; i++) {
      const yy = bottom - ((bottom - top) * i) / 4;
      const t = i / 4;
      const spread = half * (0.82 + t * 0.18);
      ctx.beginPath();
      ctx.moveTo(cx - spread, yy);
      ctx.lineTo(cx + spread, yy);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(cx - w * 0.025 * scale, top + h * 0.14, w * 0.05 * scale, h * 0.16);

    // Platform overhang + crenellations.
    ctx.beginPath();
    ctx.ellipse(cx, top, half * 1.15, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#9a9182";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
    ctx.fillStyle = "#7d7566";
    for (const t of [-0.7, -0.25, 0.25, 0.7]) {
      ctx.fillRect(cx + t * half - half * 0.12, top - h * 0.065, half * 0.24, h * 0.075);
    }

    // Tiny archer silhouette on the platform.
    ctx.fillStyle = def.accentColor || def.color;
    ctx.beginPath();
    ctx.arc(cx, top - h * 0.1, w * 0.032 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - w * 0.014 * scale, top - h * 0.08, w * 0.028 * scale, h * 0.06);
  };
  if (twin) {
    drawOne(-w * 0.17, 0.72);
    drawOne(w * 0.17, 0.72);
  } else {
    drawOne(0, 1);
  }
}

function drawWizardTowerLike(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const bottom = y + h * 0.88;
  const top = y + h * 0.32;
  const half = w * 0.3;

  ctx.beginPath();
  ctx.moveTo(cx - half, bottom);
  ctx.lineTo(cx - half, y + h * 0.55);
  ctx.quadraticCurveTo(cx - half, top, cx, top - h * 0.04);
  ctx.quadraticCurveTo(cx + half, top, cx + half, y + h * 0.55);
  ctx.lineTo(cx + half, bottom);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  grad.addColorStop(0, shade(def.color, -15));
  grad.addColorStop(0.5, shade(def.color, 12));
  grad.addColorStop(1, shade(def.color, -15));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.012);
  ctx.stroke();

  // Round window with glowing eyes peeking out.
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.55, w * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "#1e1e1e";
  ctx.fill();
  ctx.fillStyle = def.accentColor || "#f4d35e";
  ctx.beginPath();
  ctx.arc(cx - w * 0.03, y + h * 0.55, w * 0.015, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.03, y + h * 0.55, w * 0.015, 0, Math.PI * 2);
  ctx.fill();

  // Rounded roof tip + glowing orb.
  const orbGrad = ctx.createRadialGradient(cx, top - h * 0.06, 1, cx, top - h * 0.06, w * 0.07);
  orbGrad.addColorStop(0, "#ffffff");
  orbGrad.addColorStop(1, def.color);
  ctx.beginPath();
  ctx.arc(cx, top - h * 0.06, w * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = orbGrad;
  ctx.fill();
}

function drawTowerLike(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  def: BuildingDef,
  opts: { crenellate?: boolean; orb?: boolean; twin?: boolean }
) {
  roundBase(ctx, x, y, w, h, def.color);
  const drawOne = (offsetX: number, scale: number) => {
    const cx = x + w / 2 + offsetX;
    const half = w * 0.2 * scale;
    const top = y + h * 0.08;
    const bottom = y + h * 0.68;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.75, bottom);
    ctx.lineTo(cx - half, top);
    ctx.lineTo(cx + half, top);
    ctx.lineTo(cx + half * 0.75, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = Math.max(0.5, w * 0.012);
    ctx.stroke();
    if (opts.crenellate) {
      ctx.fillStyle = shade(def.color, -15);
      for (const t of [-1, 0, 1]) {
        ctx.fillRect(cx + t * half * 0.55 - half * 0.14, top - h * 0.06, half * 0.28, h * 0.08);
      }
    }
    if (opts.orb) {
      const orbGrad = ctx.createRadialGradient(cx, top - h * 0.05, 1, cx, top - h * 0.05, w * 0.13);
      orbGrad.addColorStop(0, def.accentColor || "#ffffff");
      orbGrad.addColorStop(1, def.color);
      ctx.beginPath();
      ctx.arc(cx, top - h * 0.05, w * 0.11, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();
    }
    // Window slit.
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(cx - w * 0.02, top + h * 0.18, w * 0.04, h * 0.14);
  };
  if (opts.twin) {
    drawOne(-w * 0.16, 0.75);
    drawOne(w * 0.16, 0.75);
  } else {
    drawOne(0, 1);
  }
}

function drawMortarLike(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef, bulbous: boolean) {
  const cx = x + w / 2;
  const baseY = y + h * 0.8;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.36, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8d8477";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, baseY - h * 0.08);
  ctx.rotate(-1.1);
  const len = h * 0.5;
  const bw = w * 0.34;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, 0);
  ctx.lineTo(-bw * 0.32, -len);
  ctx.lineTo(bw * 0.32, -len);
  ctx.lineTo(bw / 2, 0);
  ctx.closePath();
  ctx.fillStyle = "#5c6266";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -len, bw * 0.33, bw * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.restore();

  if (bulbous) {
    ctx.beginPath();
    ctx.arc(cx, baseY - h * 0.05, w * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
    ctx.strokeStyle = "#5b3a24";
    ctx.beginPath();
    ctx.moveTo(cx, baseY - h * 0.13);
    ctx.lineTo(cx + w * 0.06, baseY - h * 0.21);
    ctx.stroke();
  }
}

function drawAirDefense(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const baseY = y + h * 0.68;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.38, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8a9296";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();

  const angles = [-0.9, -0.3, 0.3, 0.9];
  for (const a of angles) {
    ctx.save();
    ctx.translate(cx, baseY - h * 0.05);
    ctx.rotate(a);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-w * 0.045, 0);
    ctx.lineTo(w * 0.045, 0);
    ctx.lineTo(w * 0.025, -h * 0.45);
    ctx.lineTo(-w * 0.025, -h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#dcdde1";
    ctx.beginPath();
    ctx.moveTo(-w * 0.02, -h * 0.36);
    ctx.lineTo(w * 0.02, -h * 0.36);
    ctx.lineTo(0, -h * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, baseY - h * 0.05, w * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#5c6266";
  ctx.fill();
}

function drawAirSweeper(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  roundBase(ctx, x, y, w, h, def.color);
  const cx = x + w / 2;
  const cy = y + h * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.22, w * 0.08, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? def.color : shade(def.color, -15);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "#2c2c2c";
  ctx.fill();
}

function drawHiddenTesla(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const cy = y + h * 0.65;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.4, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade("#3d8b3d", -5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Coiled rod peeking out of the grass.
  ctx.strokeStyle = def.color;
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const yy = cy - h * 0.1 - i * h * 0.09;
    ctx.moveTo(cx - w * 0.1, yy);
    ctx.lineTo(cx + w * 0.1, yy - h * 0.05);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.48, w * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = def.accentColor || "#fff3c4";
  ctx.fill();
}

function drawXbow(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const cy = y + h * 0.56;

  // Stone mount block.
  ctx.fillStyle = "#8d8477";
  ctx.fillRect(cx - w * 0.24, y + h * 0.68, w * 0.48, h * 0.2);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.strokeRect(cx - w * 0.24, y + h * 0.68, w * 0.48, h * 0.2);

  // Wooden bow arms curving outward from the stock.
  ctx.strokeStyle = "#6e4423";
  ctx.lineWidth = Math.max(1.5, w * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx - w * 0.42, cy - h * 0.06, cx - w * 0.36, cy - h * 0.34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx + w * 0.42, cy - h * 0.06, cx + w * 0.36, cy - h * 0.34);
  ctx.stroke();

  // Taut string between the two bow tips.
  ctx.strokeStyle = "#dcdde1";
  ctx.lineWidth = Math.max(0.5, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.36, cy - h * 0.34);
  ctx.lineTo(cx + w * 0.36, cy - h * 0.34);
  ctx.stroke();

  // Central stock/rail with a nocked bolt.
  ctx.fillStyle = "#4a3222";
  ctx.fillRect(cx - w * 0.05, cy - h * 0.32, w * 0.1, h * 0.38);
  ctx.strokeStyle = def.accentColor || def.color;
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.36);
  ctx.lineTo(cx, cy + h * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.36);
  ctx.lineTo(cx - w * 0.04, cy - h * 0.26);
  ctx.lineTo(cx + w * 0.04, cy - h * 0.26);
  ctx.closePath();
  ctx.fillStyle = def.accentColor || def.color;
  ctx.fill();
}

function drawInfernoTower(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const baseY = y + h * 0.8;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.36, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8d8477";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();

  // Mechanical turret housing.
  ctx.fillStyle = "#5c6266";
  ctx.fillRect(cx - w * 0.17, y + h * 0.4, w * 0.34, h * 0.34);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(cx - w * 0.17, y + h * 0.4, w * 0.34, h * 0.34);

  for (const dx of [-0.14, 0, 0.14]) {
    const bx = cx + dx * w;
    const glow = ctx.createLinearGradient(bx, y + h * 0.08, bx, y + h * 0.42);
    glow.addColorStop(0, "#ffdf6b");
    glow.addColorStop(1, def.color);
    ctx.fillStyle = glow;
    ctx.fillRect(bx - w * 0.04, y + h * 0.08, w * 0.08, h * 0.34);
  }
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.08, w * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,180,60,0.5)";
  ctx.fill();
}

function drawEagleArtillery(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const baseY = y + h * 0.86;

  // Round stone platform.
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.46, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8d8477";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();

  // Folded stone wings swept back on both sides.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.36);
    ctx.quadraticCurveTo(cx + s * w * 0.4, y + h * 0.24, cx + s * w * 0.46, y + h * 0.7);
    ctx.quadraticCurveTo(cx + s * w * 0.22, y + h * 0.6, cx, y + h * 0.55);
    ctx.closePath();
    ctx.fillStyle = shade("#c9b896", s > 0 ? 0 : -12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
  }

  // Eagle head/body.
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.42, w * 0.22, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#c9b896";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();

  // Beak.
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, y + h * 0.32);
  ctx.lineTo(cx - w * 0.18, y + h * 0.36);
  ctx.lineTo(cx - w * 0.05, y + h * 0.4);
  ctx.closePath();
  ctx.fillStyle = def.accentColor || "#f39c12";
  ctx.fill();

  // Massive cannon barrel across the chest.
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(cx - w * 0.09, y + h * 0.56, w * 0.18, h * 0.32);
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.88, w * 0.09, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
}

function drawScattershot(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  roundBase(ctx, x, y, w, h, def.color);
  const cx = x + w / 2;
  const cy = y + h * 0.55;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.4);
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, h * 0.05);
  ctx.lineTo(w * 0.08, h * 0.05);
  ctx.lineTo(w * 0.22, -h * 0.42);
  ctx.lineTo(-w * 0.22, -h * 0.42);
  ctx.closePath();
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();
  ctx.restore();
}

function drawMonolith(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  roundBase(ctx, x, y, w, h, "#3a3f47");
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.16, y + h * 0.62);
  ctx.lineTo(cx - w * 0.08, y + h * 0.06);
  ctx.lineTo(cx + w * 0.08, y + h * 0.06);
  ctx.lineTo(cx + w * 0.16, y + h * 0.62);
  ctx.closePath();
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.02, y + h * 0.1);
  ctx.lineTo(cx + w * 0.03, y + h * 0.32);
  ctx.lineTo(cx - w * 0.01, y + h * 0.32);
  ctx.lineTo(cx + w * 0.04, y + h * 0.58);
  ctx.strokeStyle = def.accentColor || "#9b59b6";
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
}

function drawFirespitter(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  roundBase(ctx, x, y, w, h, def.color);
  const cx = x + w / 2;
  ctx.save();
  ctx.translate(cx, y + h * 0.6);
  ctx.rotate(-0.45);
  ctx.fillStyle = shade(def.color, -10);
  ctx.fillRect(-w * 0.11, -h * 0.5, w * 0.22, h * 0.5);
  const flameGrad = ctx.createLinearGradient(0, -h * 0.55, 0, -h * 0.35);
  flameGrad.addColorStop(0, "#fff3c4");
  flameGrad.addColorStop(1, "#e74c3c");
  ctx.beginPath();
  ctx.arc(0, -h * 0.5, w * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = flameGrad;
  ctx.fill();
  ctx.restore();
}

function drawBuilderHut(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "hammer");
}

// ---------------------------------------------------------------------
// Shared templates: production huts, storages, mines, altars, traps
// ---------------------------------------------------------------------

type AccentIcon = "sword" | "flask" | "potion" | "anvil" | "gear" | "paw" | "crown" | "hammer" | "none";

function drawAccentIcon(ctx: Ctx, cx: number, cy: number, size: number, icon: AccentIcon) {
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(0.5, size * 0.12);
  switch (icon) {
    case "sword":
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx, cy + size * 0.5);
      ctx.moveTo(cx - size * 0.5, cy - size * 0.1);
      ctx.lineTo(cx + size * 0.5, cy - size * 0.1);
      ctx.stroke();
      break;
    case "flask":
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.25, cy - size);
      ctx.lineTo(cx - size * 0.25, cy - size * 0.2);
      ctx.lineTo(cx - size * 0.6, cy + size * 0.7);
      ctx.lineTo(cx + size * 0.6, cy + size * 0.7);
      ctx.lineTo(cx + size * 0.25, cy - size * 0.2);
      ctx.lineTo(cx + size * 0.25, cy - size);
      ctx.stroke();
      break;
    case "potion":
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(cx - size * 0.35, cy - size * 0.1, size * 0.7, size, size * 0.2)
        : ctx.rect(cx - size * 0.35, cy - size * 0.1, size * 0.7, size);
      ctx.fillRect(cx - size * 0.15, cy - size, size * 0.3, size * 0.9);
      ctx.fill();
      break;
    case "anvil":
      ctx.fillRect(cx - size * 0.55, cy + size * 0.2, size * 1.1, size * 0.25);
      ctx.fillRect(cx - size * 0.2, cy - size * 0.4, size * 0.4, size * 0.6);
      break;
    case "hammer":
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.6);
      ctx.fillRect(-size * 0.1, -size * 0.6, size * 0.2, size * 1.1);
      ctx.fillRect(-size * 0.35, -size * 0.65, size * 0.7, size * 0.32);
      ctx.restore();
      break;
    case "gear":
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "transparent";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.save();
        ctx.translate(cx + Math.cos(a) * size * 0.55, cy + Math.sin(a) * size * 0.55);
        ctx.fillRect(-size * 0.12, -size * 0.12, size * 0.24, size * 0.24);
        ctx.restore();
      }
      break;
    case "paw":
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.2, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      for (const dx of [-0.35, 0, 0.35]) {
        ctx.beginPath();
        ctx.arc(cx + dx * size, cy - size * 0.4, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "crown":
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.5, cy + size * 0.4);
      ctx.lineTo(cx - size * 0.5, cy - size * 0.1);
      ctx.lineTo(cx - size * 0.2, cy + size * 0.15);
      ctx.lineTo(cx, cy - size * 0.4);
      ctx.lineTo(cx + size * 0.2, cy + size * 0.15);
      ctx.lineTo(cx + size * 0.5, cy - size * 0.1);
      ctx.lineTo(cx + size * 0.5, cy + size * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      break;
  }
}

function drawHutBuilding(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  wallColor: string,
  roofColor: string,
  accent: AccentIcon = "none"
) {
  const wallTop = y + h * 0.42;
  const wallBottom = y + h * 0.92;
  ctx.fillStyle = wallColor;
  ctx.fillRect(x + w * 0.1, wallTop, w * 0.8, wallBottom - wallTop);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(0.5, w * 0.012);
  ctx.strokeRect(x + w * 0.1, wallTop, w * 0.8, wallBottom - wallTop);

  ctx.beginPath();
  ctx.moveTo(x + w * 0.02, wallTop);
  ctx.lineTo(x + w / 2, y + h * 0.06);
  ctx.lineTo(x + w * 0.98, wallTop);
  ctx.closePath();
  ctx.fillStyle = roofColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + w * 0.42, wallTop + (wallBottom - wallTop) * 0.4, w * 0.16, (wallBottom - wallTop) * 0.6);

  if (accent !== "none") {
    drawAccentIcon(ctx, x + w / 2, wallTop + (wallBottom - wallTop) * 0.28, w * 0.14, accent);
  }
}

function drawClanCastle(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const wallTop = y + h * 0.38;
  const wallBottom = y + h * 0.92;
  ctx.fillStyle = def.color;
  ctx.fillRect(x + w * 0.08, wallTop, w * 0.84, wallBottom - wallTop);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(x + w * 0.08, wallTop, w * 0.84, wallBottom - wallTop);
  for (const cxr of [x + w * 0.16, x + w * 0.84]) {
    ctx.fillStyle = shade(def.color, -10);
    ctx.fillRect(cxr - w * 0.08, y + h * 0.14, w * 0.16, wallTop - y + h * 0.14);
    for (const t of [-1, 0, 1]) {
      ctx.fillRect(cxr + t * w * 0.05 - w * 0.02, y + h * 0.08, w * 0.04, h * 0.06);
    }
  }
  ctx.fillStyle = def.accentColor || "#f1c40f";
  ctx.fillRect(x + w * 0.46, y + h * 0.02, w * 0.03, h * 0.2);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.49, y + h * 0.02);
  ctx.lineTo(x + w * 0.62, y + h * 0.07);
  ctx.lineTo(x + w * 0.49, y + h * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x + w * 0.42, wallTop + (wallBottom - wallTop) * 0.4, w * 0.16, (wallBottom - wallTop) * 0.6);
}

function drawArmyCamp(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const baseY = y + h * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.1);
  ctx.lineTo(x + w * 0.1, baseY);
  ctx.lineTo(x + w * 0.9, baseY);
  ctx.closePath();
  const grad = ctx.createLinearGradient(x, y, x + w, baseY);
  grad.addColorStop(0, shade(def.color, 10));
  grad.addColorStop(1, shade(def.color, -15));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.1);
  ctx.lineTo(cx, baseY);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.45);
  ctx.lineTo(cx - w * 0.12, baseY);
  ctx.lineTo(cx + w * 0.12, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawStorageSilo(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const top = y + h * 0.14;
  const bottom = y + h * 0.88;
  const half = w * 0.32;
  ctx.beginPath();
  ctx.moveTo(cx - half, top + half * 0.4);
  ctx.lineTo(cx - half, bottom);
  ctx.quadraticCurveTo(cx, bottom + h * 0.06, cx + half, bottom);
  ctx.lineTo(cx + half, top + half * 0.4);
  ctx.quadraticCurveTo(cx, top - half * 0.3, cx - half, top + half * 0.4);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  grad.addColorStop(0, shade(def.color, -15));
  grad.addColorStop(0.5, shade(def.color, 20));
  grad.addColorStop(1, shade(def.color, -15));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.5, w * 0.015);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, top + half * 0.35, half, half * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = def.accentColor || shade(def.color, 25);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  for (const t of [0.35, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(cx - half, top + half * 0.4 + (bottom - top) * t * 0.5);
    ctx.lineTo(cx + half, top + half * 0.4 + (bottom - top) * t * 0.5);
    ctx.stroke();
  }
}

function drawResourceMine(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  const baseY = y + h * 0.88;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, baseY);
  ctx.quadraticCurveTo(cx, y + h * 0.5, x + w * 0.9, baseY);
  ctx.closePath();
  ctx.fillStyle = "#7a5c3d";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, y + h * 0.42);
  ctx.rotate(-0.15);
  ctx.fillStyle = def.color;
  ctx.fillRect(-w * 0.08, -h * 0.32, w * 0.16, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, -h * 0.32);
  ctx.lineTo(w * 0.08, -h * 0.32);
  ctx.lineTo(0, -h * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = shade(def.color, 30);
  ctx.lineWidth = Math.max(0.5, w * 0.02);
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.58, w * 0.12, 0.2, Math.PI * 1.3);
  ctx.stroke();
}

type HeroEmblem = "crown" | "bow" | "wings" | "staff" | "hammer" | "flame" | "banner";

function drawEmblem(ctx: Ctx, cx: number, cy: number, size: number, emblem: HeroEmblem) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = Math.max(0.5, size * 0.14);
  switch (emblem) {
    case "crown":
      drawAccentIcon(ctx, cx, cy, size, "crown");
      break;
    case "bow":
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.55, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.2, cy - size * 0.5);
      ctx.lineTo(cx + size * 0.2, cy + size * 0.5);
      ctx.stroke();
      break;
    case "wings":
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx - size * 0.7, cy - size * 0.5, cx - size * 0.9, cy - size * 0.1);
      ctx.quadraticCurveTo(cx - size * 0.5, cy, cx, cy + size * 0.1);
      ctx.quadraticCurveTo(cx + size * 0.5, cy, cx + size * 0.9, cy - size * 0.1);
      ctx.quadraticCurveTo(cx + size * 0.7, cy - size * 0.5, cx, cy);
      ctx.fill();
      break;
    case "staff":
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.6);
      ctx.lineTo(cx, cy + size * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.65, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "hammer":
      ctx.fillRect(cx - size * 0.1, cy - size * 0.2, size * 0.2, size * 0.8);
      ctx.fillRect(cx - size * 0.4, cy - size * 0.55, size * 0.8, size * 0.35);
      break;
    case "flame":
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.6);
      ctx.quadraticCurveTo(cx + size * 0.5, cy, cx, cy + size * 0.6);
      ctx.quadraticCurveTo(cx - size * 0.5, cy, cx, cy - size * 0.6);
      ctx.fill();
      break;
    case "banner":
      ctx.fillRect(cx - size * 0.05, cy - size * 0.7, size * 0.1, size * 1.3);
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.05, cy - size * 0.6);
      ctx.lineTo(cx + size * 0.55, cy - size * 0.4);
      ctx.lineTo(cx + size * 0.05, cy - size * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

function drawHeroAltar(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef, emblem: HeroEmblem) {
  const cx = x + w / 2;
  const topW = w * 0.5;
  const botW = w * 0.68;
  const top = y + h * 0.34;
  const bottom = y + h * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2, top);
  ctx.lineTo(cx + topW / 2, top);
  ctx.lineTo(cx + botW / 2, bottom);
  ctx.lineTo(cx - botW / 2, bottom);
  ctx.closePath();
  ctx.fillStyle = "#8a7a5c";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();

  const glow = ctx.createRadialGradient(cx, y + h * 0.22, 1, cx, y + h * 0.22, w * 0.32);
  glow.addColorStop(0, def.color);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.22, w * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, y + h * 0.2, w * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.stroke();

  drawEmblem(ctx, cx, y + h * 0.2, w * 0.1, emblem);
}

function drawHeroBanner(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) {
  const cx = x + w / 2;
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(cx - w * 0.03, y + h * 0.06, w * 0.06, h * 0.82);
  drawEmblem(ctx, cx, y + h * 0.2, w * 0.22, "banner");
}

type TrapDetail = "fuse" | "spring" | "antenna" | "spikes" | "radar" | "skull" | "swirl" | "crack";

function drawTrapDetail(ctx: Ctx, cx: number, cy: number, size: number, detail: TrapDetail, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(0.5, size * 0.16);
  switch (detail) {
    case "fuse":
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spring":
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(cx - size * 0.3, cy - size * 0.3 + i * size * 0.3);
        ctx.lineTo(cx + size * 0.3, cy - size * 0.15 + i * size * 0.3);
      }
      ctx.stroke();
      break;
    case "antenna":
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.4);
      ctx.lineTo(cx, cy - size * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.5, size * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spikes":
      for (const dx of [-0.3, 0, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * size, cy + size * 0.3);
        ctx.lineTo(cx + dx * size, cy - size * 0.4);
        ctx.stroke();
      }
      break;
    case "radar":
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.35, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "skull":
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e272e";
      ctx.beginPath();
      ctx.arc(cx - size * 0.12, cy - size * 0.02, size * 0.08, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.12, cy - size * 0.02, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "swirl":
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 1.2);
      ctx.stroke();
      break;
    case "crack": {
      const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 0.6);
      glow.addColorStop(0, "rgba(155,89,182,0.6)");
      glow.addColorStop(1, "rgba(155,89,182,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9b59b6";
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.2, cy - size * 0.4);
      ctx.lineTo(cx + size * 0.05, cy);
      ctx.lineTo(cx - size * 0.1, cy + size * 0.05);
      ctx.lineTo(cx + size * 0.2, cy + size * 0.4);
      ctx.stroke();
      break;
    }
  }
}

function drawTrap(ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef, detail: TrapDetail) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3d6b2f";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.3, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5b4632";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  drawTrapDetail(ctx, cx, cy, Math.min(w, h) * 0.32, detail, def.color);
}

// ---------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------

const RENDERERS: Record<string, (ctx: Ctx, x: number, y: number, w: number, h: number, def: BuildingDef) => void> = {
  "town-hall": drawTownHall,
  cannon: (ctx, x, y, w, h, def) => drawCannonLike(ctx, x, y, w, h, def, false),
  "ricochet-cannon": (ctx, x, y, w, h, def) => drawCannonLike(ctx, x, y, w, h, def, true),
  "archer-tower": (ctx, x, y, w, h, def) => drawArcherTowerLike(ctx, x, y, w, h, def, false),
  "multi-archer-tower": (ctx, x, y, w, h, def) => drawArcherTowerLike(ctx, x, y, w, h, def, true),
  "wizard-tower": drawWizardTowerLike,
  "spell-tower": (ctx, x, y, w, h, def) => drawTowerLike(ctx, x, y, w, h, def, { orb: true }),
  mortar: (ctx, x, y, w, h, def) => drawMortarLike(ctx, x, y, w, h, def, false),
  "bomb-tower": (ctx, x, y, w, h, def) => drawMortarLike(ctx, x, y, w, h, def, true),
  "air-defense": drawAirDefense,
  "air-sweeper": drawAirSweeper,
  "hidden-tesla": drawHiddenTesla,
  xbow: drawXbow,
  "inferno-tower": drawInfernoTower,
  "eagle-artillery": drawEagleArtillery,
  scattershot: drawScattershot,
  monolith: drawMonolith,
  firespitter: drawFirespitter,
  "builder-hut": drawBuilderHut,

  "gold-mine": (ctx, x, y, w, h, def) => drawResourceMine(ctx, x, y, w, h, def),
  "elixir-collector": (ctx, x, y, w, h, def) => drawResourceMine(ctx, x, y, w, h, def),
  "dark-elixir-drill": (ctx, x, y, w, h, def) => drawResourceMine(ctx, x, y, w, h, def),
  "gold-storage": (ctx, x, y, w, h, def) => drawStorageSilo(ctx, x, y, w, h, def),
  "elixir-storage": (ctx, x, y, w, h, def) => drawStorageSilo(ctx, x, y, w, h, def),
  "dark-elixir-storage": (ctx, x, y, w, h, def) => drawStorageSilo(ctx, x, y, w, h, def),

  "clan-castle": drawClanCastle,
  "army-camp": drawArmyCamp,
  barracks: (ctx, x, y, w, h, def) => drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "sword"),
  "dark-barracks": (ctx, x, y, w, h, def) =>
    drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -25), "sword"),
  laboratory: (ctx, x, y, w, h, def) => drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "flask"),
  "spell-factory": (ctx, x, y, w, h, def) =>
    drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "potion"),
  "dark-spell-factory": (ctx, x, y, w, h, def) =>
    drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "potion"),
  blacksmith: (ctx, x, y, w, h, def) => drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "anvil"),
  workshop: (ctx, x, y, w, h, def) => drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "gear"),
  "pet-house": (ctx, x, y, w, h, def) => drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "paw"),
  "hero-hall": (ctx, x, y, w, h, def) =>
    drawHutBuilding(ctx, x, y, w, h, def.color, def.accentColor || shade(def.color, -20), "crown"),
  "helper-hut": (ctx, x, y, w, h, def) => drawHutBuilding(ctx, x, y, w, h, def.color, shade(def.color, -20), "none"),

  "hero-banner": drawHeroBanner,
  "barbarian-king": (ctx, x, y, w, h, def) => drawHeroAltar(ctx, x, y, w, h, def, "crown"),
  "archer-queen": (ctx, x, y, w, h, def) => drawHeroAltar(ctx, x, y, w, h, def, "bow"),
  "minion-prince": (ctx, x, y, w, h, def) => drawHeroAltar(ctx, x, y, w, h, def, "wings"),
  "grand-warden": (ctx, x, y, w, h, def) => drawHeroAltar(ctx, x, y, w, h, def, "staff"),
  "royal-champion": (ctx, x, y, w, h, def) => drawHeroAltar(ctx, x, y, w, h, def, "hammer"),
  "dragon-duke": (ctx, x, y, w, h, def) => drawHeroAltar(ctx, x, y, w, h, def, "flame"),

  bomb: (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "fuse"),
  "spring-trap": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "spring"),
  "air-bomb": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "antenna"),
  "giant-bomb": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "spikes"),
  "seeking-air-mine": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "radar"),
  "skeleton-trap": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "skull"),
  "tornado-trap": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "swirl"),
  "giga-bomb": (ctx, x, y, w, h, def) => drawTrap(ctx, x, y, w, h, def, "crack"),
};

/**
 * Draws hand-crafted vector fallback art for a building inside the given
 * pixel box. Returns false for any id with no dedicated art (none today —
 * every BUILDINGS_CATALOG entry except "wall", which the board draws with
 * its own brick texture, has a renderer above), so the caller can fall
 * back to the plain color rectangle for anything added later and not yet
 * covered here.
 */
export function drawBuildingArt(
  ctx: Ctx,
  buildingId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  def: BuildingDef
): boolean {
  const renderer = RENDERERS[buildingId];
  if (!renderer) return false;
  ctx.save();
  try {
    renderer(ctx, x, y, w, h, def);
  } finally {
    ctx.restore();
  }
  return true;
}

/** Brick-textured wall tile, used by the board's dedicated wall render pass. */
export interface WallNeighbors {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

/**
 * Two named parts (agreed with the user in Vietnamese, kept here so code
 * and conversation use the same vocabulary):
 *   - "trụ" (post) — the small square always drawn at the tile center,
 *     what a lone wall tile reduces to when it has no neighbors.
 *   - "cánh nối" (connecting arm) — a bar reaching from the post to the
 *     tile edge, drawn only toward a side that has a connected wall
 *     neighbor, so a run of walls merges into one continuous barrier
 *     instead of a strip of identical disconnected squares.
 * The outline only strokes the shape's true outer boundary (skipping the
 * seam between the post and each active arm), so a connected run reads
 * as one piece, not stacked rectangles.
 */
export function drawWallArt(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  def: BuildingDef,
  neighbors: WallNeighbors = { north: false, south: false, east: false, west: false }
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, shade(def.color, 15));
  grad.addColorStop(1, shade(def.color, -15));
  ctx.fillStyle = grad;

  const half = (size * 0.44) / 2;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const postLeft = cx - half;
  const postRight = cx + half;
  const postTop = cy - half;
  const postBottom = cy + half;

  ctx.fillRect(postLeft, postTop, postRight - postLeft, postBottom - postTop);
  if (neighbors.north) ctx.fillRect(postLeft, y, postRight - postLeft, postTop - y);
  if (neighbors.south) ctx.fillRect(postLeft, postBottom, postRight - postLeft, y + size - postBottom);
  if (neighbors.west) ctx.fillRect(x, postTop, postLeft - x, postBottom - postTop);
  if (neighbors.east) ctx.fillRect(postRight, postTop, x + size - postRight, postBottom - postTop);

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(0.5, size * 0.05);
  ctx.beginPath();
  if (!neighbors.north) {
    ctx.moveTo(postLeft, postTop);
    ctx.lineTo(postRight, postTop);
  }
  if (!neighbors.south) {
    ctx.moveTo(postLeft, postBottom);
    ctx.lineTo(postRight, postBottom);
  }
  if (!neighbors.west) {
    ctx.moveTo(postLeft, postTop);
    ctx.lineTo(postLeft, postBottom);
  }
  if (!neighbors.east) {
    ctx.moveTo(postRight, postTop);
    ctx.lineTo(postRight, postBottom);
  }
  if (neighbors.north) {
    ctx.moveTo(postLeft, y);
    ctx.lineTo(postRight, y);
    ctx.moveTo(postLeft, y);
    ctx.lineTo(postLeft, postTop);
    ctx.moveTo(postRight, y);
    ctx.lineTo(postRight, postTop);
  }
  if (neighbors.south) {
    ctx.moveTo(postLeft, y + size);
    ctx.lineTo(postRight, y + size);
    ctx.moveTo(postLeft, postBottom);
    ctx.lineTo(postLeft, y + size);
    ctx.moveTo(postRight, postBottom);
    ctx.lineTo(postRight, y + size);
  }
  if (neighbors.west) {
    ctx.moveTo(x, postTop);
    ctx.lineTo(x, postBottom);
    ctx.moveTo(x, postTop);
    ctx.lineTo(postLeft, postTop);
    ctx.moveTo(x, postBottom);
    ctx.lineTo(postLeft, postBottom);
  }
  if (neighbors.east) {
    ctx.moveTo(x + size, postTop);
    ctx.lineTo(x + size, postBottom);
    ctx.moveTo(postRight, postTop);
    ctx.lineTo(x + size, postTop);
    ctx.moveTo(postRight, postBottom);
    ctx.lineTo(x + size, postBottom);
  }
  ctx.stroke();

  ctx.fillStyle = def.accentColor || "rgba(255,255,255,0.3)";
  ctx.fillRect(postLeft + half * 0.15, postTop + half * 0.15, postRight - postLeft - half * 0.3, half * 0.3);
  ctx.restore();
}
