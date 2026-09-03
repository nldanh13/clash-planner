import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { BUILDINGS_BY_ID, GRID_SIZE } from "./constants";
import {
  HOME_VILLAGE_DEPLOYMENT_RULES,
  computeDeploymentAnalysis,
  getBuildingRect,
  type DeploymentAnalysis,
} from "./deploymentZones";
import {
  DEFAULT_ISO_CONFIG,
  canvasToGrid,
  clampIsoZoom,
  depthKeyForRect,
  gridToCanvas,
  type IsoViewport,
} from "./isometricUtils";
import type { BuildingDef, PlacedBuilding, TacticalSettings } from "./types";

interface IsometricGridBoardProps {
  buildings: PlacedBuilding[];
  selectedPlacedId: string | null;
  onSelectPlacedId: (instanceId: string | null) => void;
  settings: TacticalSettings;
}

/**
 * Read-only isometric tactical view. Reuses the exact same `computeDeploymentAnalysis`
 * mask as CanvasGridBoard (2D) — there is exactly one deployment-rule implementation,
 * this component only projects its output into iso screen space. Editing (placing/
 * moving buildings) stays in the 2D board; this view is for inspection: pan, zoom,
 * select a building to see its footprint + deployment halo from an isometric angle.
 */
export function IsometricGridBoard({ buildings, selectedPlacedId, onSelectPlacedId, settings }: IsometricGridBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<IsoViewport>({ panX: 0, panY: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const didDragRef = useRef(false);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.instanceId === selectedPlacedId) || null,
    [buildings, selectedPlacedId]
  );

  const deploymentAnalysis: DeploymentAnalysis | null = useMemo(() => {
    if (settings.deploymentDisplayMode === "off") return null;
    return computeDeploymentAnalysis(buildings);
  }, [buildings, settings.deploymentDisplayMode]);

  // Center the whole 44x44 board in the viewport on mount / container resize,
  // unless the user has already panned/zoomed manually.
  const hasUserAdjustedView = useRef(false);
  const fitToFrame = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const tw = DEFAULT_ISO_CONFIG.tileWidth;
    const th = DEFAULT_ISO_CONFIG.tileHeight;
    const boardWorldWidth = GRID_SIZE * tw; // full diamond width (N to S is narrower; W-E corner to corner is GRID_SIZE*tw)
    const boardWorldHeight = GRID_SIZE * th;
    const zoom = clampIsoZoom(Math.min((w - 60) / boardWorldWidth, (h - 60) / boardWorldHeight) || 1);
    // Grid (0,0) projects to world (0,0); the board's leftmost point is grid (0,44) at worldX = -GRID_SIZE*tw/2.
    const centerWorldX = 0; // (0,0)-(44,0)-(44,44)-(0,44) diamond is horizontally centered on worldX=0
    const centerWorldY = (GRID_SIZE * th) / 2;
    setViewport({
      zoom,
      panX: w / 2 - centerWorldX * zoom,
      panY: h / 2 - centerWorldY * zoom,
    });
  }, []);

  useEffect(() => {
    fitToFrame();
    const el = containerRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(() => {
      if (!hasUserAdjustedView.current) fitToFrame();
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [fitToFrame]);

  // ==========================================
  // DRAW LOOP
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0b1720";
    ctx.fillRect(0, 0, width, height);

    const project = (gx: number, gy: number) => gridToCanvas(gx, gy, viewport);

    const drawDiamond = (points: Array<{ x: number; y: number }>, fill: string, stroke?: string, lineWidth = 1) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // 1. Ground plane (whole 44x44 diamond)
    drawDiamond(
      [project(0, 0), project(GRID_SIZE, 0), project(GRID_SIZE, GRID_SIZE), project(0, GRID_SIZE)],
      "#16311f",
      "rgba(255,255,255,0.08)",
      1
    );

    // 2. Deployment Zone overlay — ground-level, same mask as the 2D board, drawn
    // strictly before any building face so it never occludes a sprite.
    if (deploymentAnalysis && settings.deploymentDisplayMode !== "off") {
      const mode = settings.deploymentDisplayMode;
      const { deploymentBlockMask } = deploymentAnalysis.masks;
      const regionGrid = deploymentAnalysis.regionTypeGrid;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          let fill: string | null = null;
          const regionType = regionGrid[y][x];
          if ((mode === "holes" || mode === "all") && regionType === "internal-hole") {
            fill = "rgba(244, 63, 94, 0.6)";
          } else if ((mode === "holes" || mode === "all") && regionType === "corridor") {
            fill = "rgba(249, 115, 22, 0.42)";
          } else if ((mode === "blocked" || mode === "all") && deploymentBlockMask[y][x]) {
            fill = "rgba(248, 113, 113, 0.18)";
          }
          if (!fill) continue;
          drawDiamond([project(x, y), project(x + 1, y), project(x + 1, y + 1), project(x, y + 1)], fill);
        }
      }
    }

    // 3. Grid lines (optional)
    if (settings.showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= GRID_SIZE; i++) {
        const a = project(i, 0);
        const b = project(i, GRID_SIZE);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        const c = project(0, i);
        const d = project(GRID_SIZE, i);
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
      }
      ctx.stroke();
    }

    // 4. Buildings, depth-sorted (painter's algorithm) so nearer boxes correctly occlude farther ones.
    const drawable = buildings
      .map((b) => {
        const def = BUILDINGS_BY_ID.get(b.buildingId);
        if (!def) return null;
        return { b, def, depth: depthKeyForRect(b.x, b.y, def.width, def.height) };
      })
      .filter((v): v is { b: PlacedBuilding; def: BuildingDef; depth: number } => v !== null)
      .sort((a, c) => a.depth - c.depth);

    for (const { b, def } of drawable) {
      const isSelected = b.instanceId === selectedPlacedId;
      const heightPx = getBuildingHeightPx(def) * viewport.zoom;

      const top = project(b.x, b.y);
      const right = project(b.x + def.width, b.y);
      const bottom = project(b.x + def.width, b.y + def.height);
      const left = project(b.x, b.y + def.height);
      const lift = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - heightPx });

      const baseColor = def.category === "wall" ? "#7d8796" : def.color || "#34495e";
      const roofColor = shadeColor(baseColor, 12);
      const rightFaceColor = shadeColor(baseColor, -18);
      const leftFaceColor = shadeColor(baseColor, -34);
      const strokeColor = isSelected ? "#ffc857" : "rgba(0,0,0,0.35)";
      const strokeWidth = isSelected ? 2.5 : 1;

      // Right face (between E and S corners, extruded to ground)
      drawDiamond([lift(right), lift(bottom), bottom, right], rightFaceColor, strokeColor, strokeWidth);
      // Left face (between S and W corners, extruded to ground)
      drawDiamond([lift(bottom), lift(left), left, bottom], leftFaceColor, strokeColor, strokeWidth);
      // Roof (top face)
      drawDiamond([lift(top), lift(right), lift(bottom), lift(left)], roofColor, strokeColor, strokeWidth);
    }

    // 5. Selected building's deployment halo (ground-level outline, drawn last so it stays visible).
    if (selectedBuilding) {
      const rect = getBuildingRect(selectedBuilding);
      if (rect) {
        const { blockRadius } = HOME_VILLAGE_DEPLOYMENT_RULES;
        const haloLeft = Math.max(0, rect.x - blockRadius);
        const haloTop = Math.max(0, rect.y - blockRadius);
        const haloRight = Math.min(GRID_SIZE, rect.x + rect.width + blockRadius);
        const haloBottom = Math.min(GRID_SIZE, rect.y + rect.height + blockRadius);
        ctx.setLineDash([6, 3]);
        drawDiamond(
          [project(haloLeft, haloTop), project(haloRight, haloTop), project(haloRight, haloBottom), project(haloLeft, haloBottom)],
          "rgba(56, 189, 248, 0.08)",
          "#38bdf8",
          2
        );
        ctx.setLineDash([]);
      }
    }
  }, [buildings, deploymentAnalysis, selectedBuilding, selectedPlacedId, settings.deploymentDisplayMode, settings.showGrid, viewport]);

  // ==========================================
  // POINTER EVENTS: drag-to-pan, click-to-select, wheel-to-zoom
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    didDragRef.current = false;
    setIsPanning(true);
    panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: viewport.panX, panY: viewport.panY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPanning || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.clientX;
    const dy = e.clientY - panStartRef.current.clientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
    hasUserAdjustedView.current = true;
    setViewport((prev) => ({ ...prev, panX: panStartRef.current!.panX + dx, panY: panStartRef.current!.panY + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!didDragRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const gridPt = canvasToGrid(canvasPt, viewport);
      const gx = Math.floor(gridPt.x);
      const gy = Math.floor(gridPt.y);

      const hit = buildings
        .map((b) => {
          const def = BUILDINGS_BY_ID.get(b.buildingId);
          if (!def) return null;
          return { b, def, depth: depthKeyForRect(b.x, b.y, def.width, def.height) };
        })
        .filter((v): v is { b: PlacedBuilding; def: BuildingDef; depth: number } => v !== null)
        .sort((a, c) => c.depth - a.depth) // topmost (nearest) first
        .find(({ b, def }) => gx >= b.x && gx < b.x + def.width && gy >= b.y && gy < b.y + def.height);

      onSelectPlacedId(hit ? hit.b.instanceId : null);
    }
    panStartRef.current = null;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      hasUserAdjustedView.current = true;
      const rect = el.getBoundingClientRect();
      const pointerCanvas = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setViewport((prev) => {
        const worldBefore = { x: (pointerCanvas.x - prev.panX) / prev.zoom, y: (pointerCanvas.y - prev.panY) / prev.zoom };
        const nextZoom = clampIsoZoom(prev.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
        return {
          zoom: nextZoom,
          panX: pointerCanvas.x - worldBefore.x * nextZoom,
          panY: pointerCanvas.y - worldBefore.y * nextZoom,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleResetView = () => {
    hasUserAdjustedView.current = false;
    fitToFrame();
  };

  return (
    <div className="grid-canvas-viewport relative overflow-hidden" ref={containerRef}>
      <canvas
        ref={canvasRef}
        role="application"
        aria-label="Bản đồ Isometric Clash of Clans"
        className={`w-full h-full outline-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-2xl">
        <button
          onClick={() => {
            hasUserAdjustedView.current = true;
            setViewport((prev) => ({ ...prev, zoom: clampIsoZoom(prev.zoom * 1.15) }));
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Phóng to"
          aria-label="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            hasUserAdjustedView.current = true;
            setViewport((prev) => ({ ...prev, zoom: clampIsoZoom(prev.zoom / 1.15) }));
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Thu nhỏ"
          aria-label="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Vừa khung hình"
          aria-label="Vừa khung hình"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-30 text-[10px] text-slate-400 bg-slate-950/70 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-800">
        Chế độ xem Isometric (chỉ xem) — kéo để xoay góc nhìn, cuộn để zoom, bấm để chọn công trình.
      </div>
    </div>
  );
}

function getBuildingHeightPx(def: BuildingDef): number {
  if (def.id === "town-hall") return 34;
  switch (def.category) {
    case "wall":
      return 8;
    case "trap":
      return 3;
    case "resource":
      return 20;
    case "army":
      return 22;
    case "hero":
      return 22;
    case "defense":
      return 26;
    default:
      return 18;
  }
}

function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const amount = Math.round(2.55 * percent);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let bl = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  bl = Math.max(0, Math.min(255, bl));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + bl).toString(16).slice(1)}`;
}

export default IsometricGridBoard;
