import { preloadAllBaseImages, getLeveledBuildingImage } from "./imageMapper";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, Maximize, Trash2, Unlock, X, ZoomIn, ZoomOut } from "lucide-react";
import { getBuildingImagePath, preloadImage, getCachedImage } from "./imageMapper";
import { upgradeItems } from "../../upgradeData";
import { targetForTownHall } from "../../utils/upgradeLogic";
import { BUILDINGS_BY_ID, GRID_SIZE, MAP_BORDER } from "./constants";
import {
  HOME_VILLAGE_DEPLOYMENT_RULES,
  computeDeploymentAnalysis,
  getBuildingRect,
  readCell,
  type DeploymentAnalysis,
} from "./deploymentZones";
import { buildOccupancyMatrix, canPlaceBuildingFast, type GridOccupancyMatrix } from "./gridMatrix";
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
  onUpdateBuildings: (newBuildings: PlacedBuilding[], replace?: boolean) => void;
  selectedDefId: string | null;
  onClearSelectedDef: () => void;
  selectedPlacedId: string | null;
  onSelectPlacedId: (instanceId: string | null) => void;
  buildingLimits: Record<string, number>;
  settings: TacticalSettings;
  townHallLevel?: number;
}

/**
 * Isometric tactical view. Reuses the exact same `computeDeploymentAnalysis` mask
 * and `gridMatrix` occupancy/placement validation as CanvasGridBoard (2D) — there
 * is exactly one deployment-rule and one collision implementation, this component
 * only projects them into iso screen space and pan/zoom.
 *
 * Editing is click-based rather than 2D's continuous drag (pixel-perfect drag
 * hit-testing against 3D box faces is a much larger, separate problem): pick a
 * building from the sidebar then click a tile to place it, click an existing
 * building to select it, click an empty tile while a building is selected to
 * move it there, Delete/Backspace or arrow keys to remove/nudge the selection.
 */
export function IsometricGridBoard({
  buildings,
  onUpdateBuildings,
  selectedDefId,
  onClearSelectedDef,
  selectedPlacedId,
  onSelectPlacedId,
  buildingLimits,
  settings,
  townHallLevel = 11,
}: IsometricGridBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawBoardRef = useRef<() => void>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<IsoViewport>({ panX: 0, panY: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const didDragRef = useRef(false);

  const occupancyMatrix: GridOccupancyMatrix = useMemo(() => buildOccupancyMatrix(buildings), [buildings]);

  const placedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of buildings) map[b.buildingId] = (map[b.buildingId] || 0) + 1;
    return map;
  }, [buildings]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.instanceId === selectedPlacedId) || null,
    [buildings, selectedPlacedId]
  );
  const selectedBuildingDef = selectedBuilding ? BUILDINGS_BY_ID.get(selectedBuilding.buildingId) || null : null;

  const deploymentAnalysis: DeploymentAnalysis | null = useMemo(() => {
    if (settings.deploymentDisplayMode === "off") return null;
    return computeDeploymentAnalysis(buildings);
  }, [buildings, settings.deploymentDisplayMode]);

  // What footprint (if any) is "active" at the hovered tile: a new building from
  // the sidebar, or the currently-selected building being relocated.
  const activePlacement = useMemo(() => {
    if (selectedDefId) {
      const def = BUILDINGS_BY_ID.get(selectedDefId);
      if (def) return { kind: "new" as const, def, ignoreInstanceId: null as string | null };
    } else if (selectedBuilding && selectedBuildingDef) {
      return { kind: "move" as const, def: selectedBuildingDef, ignoreInstanceId: selectedBuilding.instanceId };
    }
    return null;
  }, [selectedDefId, selectedBuilding, selectedBuildingDef]);

  const hoverValidity = useMemo(() => {
    if (!activePlacement || !hoverCell) return null;
    return canPlaceBuildingFast(
      occupancyMatrix,
      activePlacement.def.id,
      hoverCell.x,
      hoverCell.y,
      activePlacement.ignoreInstanceId
    ).valid;
  }, [activePlacement, hoverCell, occupancyMatrix]);

  // Center the whole 44x44 board in the viewport on mount / container resize,
  // with safe margins for the bottom tray and right toolbar.
  const [isMapFixed, setIsMapFixed] = useState(false);
  const hasUserAdjustedView = useRef(false);

  const clampPan = useCallback((nextPanX: number, nextPanY: number, currentZoom: number) => {
    const el = containerRef.current;
    if (!el) return { panX: nextPanX, panY: nextPanY };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const th = DEFAULT_ISO_CONFIG.tileHeight;
    const centerWorldY = (GRID_SIZE * th) / 2;
    const defaultPanX = (w - 30) / 2;
    const defaultPanY = (h - 70) / 2 - centerWorldY * currentZoom;
    
    // Prevent map from drifting wildly beyond viewport bounds
    const maxDriftX = Math.max(120, w * 0.35);
    const maxDriftY = Math.max(120, h * 0.35);
    return {
      panX: Math.max(defaultPanX - maxDriftX, Math.min(defaultPanX + maxDriftX, nextPanX)),
      panY: Math.max(defaultPanY - maxDriftY, Math.min(defaultPanY + maxDriftY, nextPanY)),
    };
  }, []);

  const fitToFrame = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;
    const tw = DEFAULT_ISO_CONFIG.tileWidth;
    const th = DEFAULT_ISO_CONFIG.tileHeight;
    const boardWorldWidth = GRID_SIZE * tw;
    const boardWorldHeight = GRID_SIZE * th;

    // Provide safe padding for bottom tray and right toolbar
    const availW = Math.max(100, w - 80);
    const availH = Math.max(100, h - 140);
    const zoom = clampIsoZoom(Math.min(availW / boardWorldWidth, availH / boardWorldHeight) || 0.95);
    
    const centerWorldX = 0;
    const centerWorldY = (GRID_SIZE * th) / 2;
    const targetCenterX = (w - 30) / 2;
    const targetCenterY = (h - 70) / 2;

    setViewport({
      zoom,
      panX: targetCenterX - centerWorldX * zoom,
      panY: targetCenterY - centerWorldY * zoom,
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
  const [redrawCounter, setRedrawCounter] = useState(0);
  useEffect(() => {
    preloadAllBaseImages(() => setRedrawCounter(c => c + 1));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    try {
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

    // 1. Ground plane: the 3-tile grass border ring first (darker — real
    // Clash of Clans shades the deploy strip around the village slightly
    // darker than the base itself), then the buildable 44x44 diamond on top.
    drawDiamond(
      [
        project(-MAP_BORDER, -MAP_BORDER),
        project(GRID_SIZE + MAP_BORDER, -MAP_BORDER),
        project(GRID_SIZE + MAP_BORDER, GRID_SIZE + MAP_BORDER),
        project(-MAP_BORDER, GRID_SIZE + MAP_BORDER),
      ],
      "#0f2417",
      "rgba(255,255,255,0.05)",
      1
    );
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

      for (let y = -MAP_BORDER; y < GRID_SIZE + MAP_BORDER; y++) {
        for (let x = -MAP_BORDER; x < GRID_SIZE + MAP_BORDER; x++) {
          let fill: string | null = null;
          const regionType = readCell(regionGrid, x, y);
          if ((mode === "holes" || mode === "all") && regionType === "internal-hole") {
            fill = "rgba(244, 63, 94, 0.6)";
          } else if ((mode === "holes" || mode === "all") && regionType === "corridor") {
            fill = "rgba(249, 115, 22, 0.42)";
          } else if ((mode === "blocked" || mode === "all") && readCell(deploymentBlockMask, x, y)) {
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

    // 3b. Placement/move preview footprint at the hovered tile.
    if (activePlacement && hoverCell) {
      const { def } = activePlacement;
      const valid = hoverValidity === true;
      const p0 = project(hoverCell.x, hoverCell.y);
      const p1 = project(hoverCell.x + def.width, hoverCell.y);
      const p2 = project(hoverCell.x + def.width, hoverCell.y + def.height);
      const p3 = project(hoverCell.x, hoverCell.y + def.height);
      drawDiamond(
        [p0, p1, p2, p3],
        valid ? "rgba(115, 228, 154, 0.35)" : "rgba(255, 115, 128, 0.4)",
        valid ? "#73e49a" : "#ff7380",
        2
      );
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

        // Draw image on roof (including walls)
        const img = getLeveledBuildingImage(
          b.buildingId,
          b.level,
          townHallLevel,
          () => setRedrawCounter((c) => c + 1)
        );
        if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          try {
            const minX = lift(left).x;
            const maxX = lift(right).x;
            const minY = lift(top).y;
            const maxY = lift(bottom).y;
            const w = maxX - minX;
            const h = maxY - minY;
            
            if (w > 2 && h > 2 && Number.isFinite(w) && Number.isFinite(h) && Number.isFinite(minX) && Number.isFinite(minY)) {
              ctx.save();
              // create clipping path for roof
              ctx.beginPath();
              ctx.moveTo(lift(top).x, lift(top).y);
              ctx.lineTo(lift(right).x, lift(right).y);
              ctx.lineTo(lift(bottom).x, lift(bottom).y);
              ctx.lineTo(lift(left).x, lift(left).y);
              ctx.closePath();
              ctx.clip();
              
              // drawImage with alpha
              ctx.globalAlpha = 0.85;
              ctx.drawImage(img, minX + w * 0.1, minY + h * 0.1, w * 0.8, h * 0.8);
              ctx.restore();
            }
          } catch {
            // Guard against canvas draw failures
          }
        }
    }

    // 5. Selected building's deployment halo (ground-level outline, drawn last so it stays visible).
    if (selectedBuilding) {
      const rect = getBuildingRect(selectedBuilding);
      if (rect) {
        const { blockRadius } = HOME_VILLAGE_DEPLOYMENT_RULES;
        // Clamped to the true 50x50 map (buildable grid + border), matching
        // CanvasGridBoard's 2D halo and computeDeploymentAnalysis.
        const haloLeft = Math.max(-MAP_BORDER, rect.x - blockRadius);
        const haloTop = Math.max(-MAP_BORDER, rect.y - blockRadius);
        const haloRight = Math.min(GRID_SIZE + MAP_BORDER, rect.x + rect.width + blockRadius);
        const haloBottom = Math.min(GRID_SIZE + MAP_BORDER, rect.y + rect.height + blockRadius);
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
    } catch (err) {
      console.warn("Isometric canvas draw error:", err);
    }
  }, [
    activePlacement,
    buildings,
    deploymentAnalysis,
    hoverCell,
    hoverValidity,
    selectedBuilding,
    selectedPlacedId,
    settings.deploymentDisplayMode,
    settings.showGrid,
    viewport,
    redrawCounter,
  ]);

  // ==========================================
  // POINTER EVENTS: drag-to-pan, click-to-place/select/move, wheel-to-zoom
  // ==========================================
  const getCanvasGridCell = useCallback(
    (e: { clientX: number; clientY: number }): { x: number; y: number } | null => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const gridPt = canvasToGrid(canvasPt, viewport);
      const gx = Math.floor(gridPt.x);
      const gy = Math.floor(gridPt.y);
      if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return null;
      return { x: gx, y: gy };
    },
    [viewport]
  );

  const findBuildingAt = useCallback(
    (gx: number, gy: number) => {
      return buildings
        .map((b) => {
          const def = BUILDINGS_BY_ID.get(b.buildingId);
          if (!def) return null;
          return { b, def, depth: depthKeyForRect(b.x, b.y, def.width, def.height) };
        })
        .filter((v): v is { b: PlacedBuilding; def: BuildingDef; depth: number } => v !== null)
        .sort((a, c) => c.depth - a.depth) // topmost (nearest) first
        .find(({ b, def }) => gx >= b.x && gx < b.x + def.width && gy >= b.y && gy < b.y + def.height);
    },
    [buildings]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
    didDragRef.current = false;
    setIsPanning(true);
    panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: viewport.panX, panY: viewport.panY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning && panStartRef.current) {
      if (isMapFixed) {
        // When map is locked, panning is prevented so user can place/inspect stably
        setHoverCell(getCanvasGridCell(e));
        return;
      }
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
      hasUserAdjustedView.current = true;
      const clamped = clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy, viewport.zoom);
      setViewport((prev) => ({ ...prev, panX: clamped.panX, panY: clamped.panY }));
      return;
    }
    setHoverCell(getCanvasGridCell(e));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe release
      }
    }

    if (!didDragRef.current) {
      const cell = getCanvasGridCell(e);
      if (cell) {
        const { x: gx, y: gy } = cell;

        // 1. Placing a new building from the sidebar selection.
        if (selectedDefId) {
          const def = BUILDINGS_BY_ID.get(selectedDefId);
          if (def) {
            const max = buildingLimits[def.id] || 0;
            const current = placedCounts[def.id] || 0;
            if (max === 0 || current < max) {
              const { valid } = canPlaceBuildingFast(occupancyMatrix, def.id, gx, gy);
              if (valid) {
                const newBuilding: PlacedBuilding = {
                  instanceId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  buildingId: def.id,
                  x: gx,
                  y: gy,
                };
                onUpdateBuildings([...buildings, newBuilding]);
                onSelectPlacedId(newBuilding.instanceId);
                if (def.id !== "wall" && current + 1 >= max) onClearSelectedDef();
              }
            }
          }
          panStartRef.current = null;
          return;
        }

        const hitBuilding = findBuildingAt(gx, gy);

        // 2. Clicked an existing building -> select it.
        if (hitBuilding) {
          onSelectPlacedId(hitBuilding.b.instanceId);
          panStartRef.current = null;
          return;
        }

        // 3. Clicked empty ground while a building is selected -> move it there.
        if (selectedBuilding && selectedBuildingDef) {
          const { valid } = canPlaceBuildingFast(occupancyMatrix, selectedBuilding.buildingId, gx, gy, selectedBuilding.instanceId);
          if (valid) {
            const updated = buildings.map((b) => (b.instanceId === selectedBuilding.instanceId ? { ...b, x: gx, y: gy } : b));
            onUpdateBuildings(updated);
          }
          panStartRef.current = null;
          return;
        }

        // 4. Clicked empty ground with nothing active -> deselect.
        onSelectPlacedId(null);
      }
    }
    panStartRef.current = null;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe release
      }
    }
    panStartRef.current = null;
    didDragRef.current = false;
  };

  const handleRemoveSelected = () => {
    if (!selectedPlacedId) return;
    onUpdateBuildings(buildings.filter((b) => b.instanceId !== selectedPlacedId));
    onSelectPlacedId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!selectedPlacedId || !selectedBuilding || !selectedBuildingDef) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      handleRemoveSelected();
      return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowUp") dy = -1;
      if (e.key === "ArrowDown") dy = 1;
      if (e.key === "ArrowLeft") dx = -1;
      if (e.key === "ArrowRight") dx = 1;

      const newX = selectedBuilding.x + dx;
      const newY = selectedBuilding.y + dy;
      if (newX < 0 || newY < 0 || newX + selectedBuildingDef.width > GRID_SIZE || newY + selectedBuildingDef.height > GRID_SIZE) return;

      const { valid } = canPlaceBuildingFast(occupancyMatrix, selectedBuilding.buildingId, newX, newY, selectedBuilding.instanceId);
      if (valid) {
        const updated = buildings.map((b) => (b.instanceId === selectedPlacedId ? { ...b, x: newX, y: newY } : b));
        onUpdateBuildings(updated);
      }
    }
  };

  const handleZoomIn = () => {
    hasUserAdjustedView.current = true;
    setViewport((prev) => {
      const el = containerRef.current;
      const cx = el ? el.clientWidth / 2 : 0;
      const cy = el ? el.clientHeight / 2 : 0;
      const safeZoom = Number.isFinite(prev.zoom) && prev.zoom > 0 ? prev.zoom : 1;
      const nextZoom = clampIsoZoom(safeZoom * 1.18);
      const worldBefore = {
        x: (cx - prev.panX) / safeZoom,
        y: (cy - prev.panY) / safeZoom,
      };
      return {
        zoom: nextZoom,
        panX: cx - worldBefore.x * nextZoom,
        panY: cy - worldBefore.y * nextZoom,
      };
    });
  };

  const handleZoomOut = () => {
    hasUserAdjustedView.current = true;
    setViewport((prev) => {
      const el = containerRef.current;
      const cx = el ? el.clientWidth / 2 : 0;
      const cy = el ? el.clientHeight / 2 : 0;
      const safeZoom = Number.isFinite(prev.zoom) && prev.zoom > 0 ? prev.zoom : 1;
      const nextZoom = clampIsoZoom(safeZoom / 1.18);
      const th = DEFAULT_ISO_CONFIG.tileHeight;
      const worldCenterY = (GRID_SIZE * th) / 2;
      const centeredPanX = cx;
      const centeredPanY = (cy > 30 ? cy - 15 : cy) - worldCenterY * nextZoom;
      const pullFactor = nextZoom <= 1.05 ? 1 : 0.5;
      return {
        zoom: nextZoom,
        panX: prev.panX + (centeredPanX - prev.panX) * pullFactor,
        panY: prev.panY + (centeredPanY - prev.panY) * pullFactor,
      };
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop wheel event from bubbling to parent window or AI Studio
      hasUserAdjustedView.current = true;
      const rect = el.getBoundingClientRect();
      const pointerCanvas = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setViewport((prev) => {
        const safeZoom = Number.isFinite(prev.zoom) && prev.zoom > 0 ? prev.zoom : 1;
        if (e.deltaY < 0) {
          // ZOOM IN: Zoom at mouse cursor position (user preferred)
          const nextZoom = clampIsoZoom(safeZoom * 1.08);
          const worldBefore = {
            x: (pointerCanvas.x - prev.panX) / safeZoom,
            y: (pointerCanvas.y - prev.panY) / safeZoom,
          };
          return {
            zoom: nextZoom,
            panX: pointerCanvas.x - worldBefore.x * nextZoom,
            panY: pointerCanvas.y - worldBefore.y * nextZoom,
          };
        } else {
          // ZOOM OUT: Automatically pull view back to screen center
          const nextZoom = clampIsoZoom(safeZoom / 1.08);
          const screenCenterX = rect.width / 2;
          const screenCenterY = (rect.height - 30) / 2;
          const th = DEFAULT_ISO_CONFIG.tileHeight;
          const worldCenterY = (GRID_SIZE * th) / 2;
          const centeredPanX = screenCenterX;
          const centeredPanY = screenCenterY - worldCenterY * nextZoom;
          const pullFactor = nextZoom <= 1.05 ? 1 : 0.45;
          return {
            zoom: nextZoom,
            panX: prev.panX + (centeredPanX - prev.panX) * pullFactor,
            panY: prev.panY + (centeredPanY - prev.panY) * pullFactor,
          };
        }
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    // Touch pinch-to-zoom and pan support
    let touchState: {
      initialDist: number;
      initialZoom: number;
      midX: number;
      midY: number;
      worldX: number;
      worldY: number;
    } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        hasUserAdjustedView.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const rect = el.getBoundingClientRect();
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        setViewport((prev) => {
          const safeZoom = Number.isFinite(prev.zoom) && prev.zoom > 0 ? prev.zoom : 1;
          touchState = {
            initialDist: dist,
            initialZoom: safeZoom,
            midX,
            midY,
            worldX: (midX - prev.panX) / safeZoom,
            worldY: (midY - prev.panY) / safeZoom,
          };
          return prev;
        });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState && touchState.initialDist > 0) {
        e.preventDefault();
        e.stopPropagation();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = dist / touchState.initialDist;
        const nextZoom = clampIsoZoom(touchState.initialZoom * ratio);
        setViewport({
          zoom: nextZoom,
          panX: touchState.midX - touchState.worldX * nextZoom,
          panY: touchState.midY - touchState.worldY * nextZoom,
        });
      } else {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchState = null;
      }
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    el.addEventListener("gesturestart", onGesture, { passive: false });
    el.addEventListener("gesturechange", onGesture, { passive: false });
    el.addEventListener("gestureend", onGesture, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("gesturestart", onGesture);
      el.removeEventListener("gesturechange", onGesture);
      el.removeEventListener("gestureend", onGesture);
    };
  }, []);

  const handleResetView = () => {
    hasUserAdjustedView.current = false;
    fitToFrame();
  };

  return (
    <div className="grid-canvas-viewport relative !overflow-hidden !p-0 overscroll-none touch-none" ref={containerRef}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label="Bản đồ Isometric Clash of Clans"
        className={`w-full h-full outline-none touch-none ${
          isPanning ? "cursor-grabbing" : selectedDefId ? "cursor-copy" : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      />

      {/* 3D Map Stabilization & Lock Controls */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-2xl">
        <button
          type="button"
          onClick={() => setIsMapFixed((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isMapFixed
              ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
          title={isMapFixed ? "Bản đồ đang cố định (không chạy lung tung)" : "Nhấn để cố định bản đồ"}
        >
          {isMapFixed ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
          <span>{isMapFixed ? "Đã cố định map" : "Cố định map"}</span>
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Căn giữa & Vừa khung hình"
        >
          <Maximize className="w-3.5 h-3.5 text-cyan-400" />
          <span>Căn giữa</span>
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-30 text-[10px] text-slate-400 bg-slate-950/70 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-800">
        {selectedDefId
          ? "Bấm vào ô hợp lệ để đặt công trình — kéo nền để xoay góc nhìn."
          : "Kéo để xoay góc nhìn, cuộn để zoom. Bấm để chọn, bấm ô trống để di chuyển công trình đã chọn."}
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
