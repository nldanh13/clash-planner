import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Move,
  RotateCw,
  ShieldAlert,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { BUILDINGS_BY_ID, CELL_SIZE_PX, GRID_SIZE, MAP_BORDER } from "./constants";
import { scanChainLightningHazards } from "./chainLightningUtils";
import { buildOccupancyMatrix, canPlaceBuildingFast, getBuildingAtCell } from "./gridMatrix";
import { calculateFirepowerHeatmap, getHeatmapColor } from "./heatmapUtils";
import {
  HOME_VILLAGE_DEPLOYMENT_RULES,
  computeDeploymentAnalysis,
  computeDeploymentMasks,
  getBuildingRect,
  readCell,
  type DeploymentAnalysis,
} from "./deploymentZones";
import { DECORATIONS_BY_ID } from "./decorationCatalog";
import { buildDecorationOccupancyMask, isDecorationPlacementFree } from "./decorationUtils";
import type { BuildingDef, PlacedBuilding, PlacedDecoration, TacticalSettings } from "./types";
import { getLeveledBuildingImage, preloadAllBaseImages } from "./imageMapper";
import { getDecorationImage } from "./decorationImageMapper";
import { getMaxBuildingLevel } from "./buildingLevels";

interface CanvasGridBoardProps {
  buildings: PlacedBuilding[];
  onUpdateBuildings: (newBuildings: PlacedBuilding[], replace?: boolean) => void;
  selectedDefId: string | null;
  onClearSelectedDef: () => void;
  selectedPlacedId: string | null;
  onSelectPlacedId: (instanceId: string | null) => void;
  buildingLimits: Record<string, number>;
  settings: TacticalSettings;
  zoomLevel: number;
  zoomMode?: "fit" | "manual";
  onZoomChange?: (zoom: number, mode?: "fit" | "manual") => void;
  townHallLevel?: number;
  /** Cosmetic-only decoration layer — see decorationCatalog.ts. Optional so every other caller/test compiles untouched. */
  decorations?: PlacedDecoration[];
  onUpdateDecorations?: (newDecorations: PlacedDecoration[]) => void;
  /** When set, clicking/dragging on the canvas paints this decoration type instead of placing a building. */
  selectedDecorationDefId?: string | null;
  /** Ghost preview tiles for the Shape Stamp tool (wall-shape presets), drawn as a translucent overlay before the user commits them. */
  stampPreviewCoords?: { x: number; y: number }[] | null;
}

interface ActiveDrag {
  type: "new" | "move";
  buildingId: string;
  instanceId?: string;
  width: number;
  height: number;
  currentX: number;
  currentY: number;
  isValid: boolean;
}

// Includes the 3-tile grass border beyond the 44x44 buildable grid (real
// Clash of Clans map is 50x50) so zoom-to-fit accounts for the full visible
// playfield, not just the buildable area.
const BASE_BOARD_PIXELS = (GRID_SIZE + 2 * MAP_BORDER) * CELL_SIZE_PX;

export function CanvasGridBoard({
  buildings,
  onUpdateBuildings,
  selectedDefId,
  onClearSelectedDef,
  selectedPlacedId,
  onSelectPlacedId,
  buildingLimits,
  settings,
  zoomLevel,
  zoomMode = "fit",
  onZoomChange,
  townHallLevel = 11,
  decorations = [],
  onUpdateDecorations,
  selectedDecorationDefId = null,
  stampPreviewCoords = null,
}: CanvasGridBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoverValidity, setHoverValidity] = useState<boolean | null>(null);
  
  const [redrawCounter, setRedrawCounter] = useState(0);
  useEffect(() => {
    preloadAllBaseImages(() => setRedrawCounter(c => c + 1));
  }, []);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isPaintingWalls, setIsPaintingWalls] = useState(false);
  const [isPaintingDecorations, setIsPaintingDecorations] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isHeatmapHudExpanded, setIsHeatmapHudExpanded] = useState(false);
  const [isChainAlertDismissed, setIsChainAlertDismissed] = useState(true);
  const [isChainAlertExpanded, setIsChainAlertExpanded] = useState(true);
  const panStartRef = useRef<{
    clientX: number;
    clientY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  // Scaled dimensions
  const cellSize = Math.round(CELL_SIZE_PX * zoomLevel);
  const boardPixelSize = GRID_SIZE * cellSize;
  // Pixel width of the grass border ring, and the full canvas size including
  // it on every side (real Clash of Clans map: 44x44 buildable + 3-tile
  // border = 50x50). The render effect below draws everything through a
  // single `ctx.translate(borderPx, borderPx)`, so grid-coordinate math
  // elsewhere in this file (buildings, decorations, halos) stays exactly as
  // it was — only the canvas's own pixel dimensions and the pointer↔tile
  // conversion need to know about the border explicitly.
  const borderPx = MAP_BORDER * cellSize;
  const totalBoardPixelSize = boardPixelSize + 2 * borderPx;

  // Build O(1) Occupancy Matrix whenever buildings array changes
  const occupancyMatrix = useMemo(() => {
    return buildOccupancyMatrix(buildings);
  }, [buildings]);

  // Count placed buildings
  const placedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      map[b.buildingId] = (map[b.buildingId] || 0) + 1;
    }
    return map;
  }, [buildings]);

  // Scan chain hazards
  const chainAnalysis = useMemo(() => {
    if (settings.showChainLightning === "none") {
      return { dangerPairs: [], vulnerableInstanceIds: new Set<string>(), criticalCount: 0, warningCount: 0 };
    }
    return scanChainLightningHazards(buildings, 2);
  }, [buildings, settings.showChainLightning]);

  // Calculate Firepower Heatmap
  const heatmapData = useMemo(() => {
    if (settings.plannerMode !== "analysis" || !settings.showHeatmap) return null;
    return calculateFirepowerHeatmap(buildings);
  }, [buildings, settings.showHeatmap, settings.plannerMode]);

  // Deployment Zone: buildings array used for the mask, substituting the
  // in-progress drag position so the overlay updates live while dragging
  // without waiting for pointer-up (and without creating any checkpoint).
  const deploymentPreviewBuildings = useMemo(() => {
    if (!activeDrag) return buildings;
    if (activeDrag.type === "move" && activeDrag.instanceId) {
      return buildings.map((b) =>
        b.instanceId === activeDrag.instanceId
          ? { ...b, x: activeDrag.currentX, y: activeDrag.currentY }
          : b
      );
    }
    if (activeDrag.type === "new" && BUILDINGS_BY_ID.has(activeDrag.buildingId)) {
      return [
        ...buildings,
        { instanceId: "__deployment-preview__", buildingId: activeDrag.buildingId, x: activeDrag.currentX, y: activeDrag.currentY },
      ];
    }
    return buildings;
  }, [buildings, activeDrag]);

  const deploymentAnalysis: DeploymentAnalysis | null = useMemo(() => {
    if (settings.deploymentDisplayMode === "off") return null;
    return computeDeploymentAnalysis(deploymentPreviewBuildings);
  }, [deploymentPreviewBuildings, settings.deploymentDisplayMode]);

  // Center canvas in viewport helper
  const centerCanvasInViewport = useCallback(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        const el = containerRef.current;
        el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
        el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
      }
    });
  }, []);

  // Fit to frame calculation: determines the scale to fit the 44x44 board completely inside the viewport
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current) return null;
    const el = containerRef.current;
    // 72px safe margin for right toolbar, 130px safe margin for bottom tray
    const availW = Math.max(120, el.clientWidth - 72);
    const availH = Math.max(120, el.clientHeight - 130);
    const scale = Math.min(availW / BASE_BOARD_PIXELS, availH / BASE_BOARD_PIXELS);
    return Math.max(0.35, Math.min(1.6, Number(scale.toFixed(2))));
  }, []);

  // Responsive ResizeObserver: when zoomMode is 'fit', automatically adjust zoom level on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateFit = () => {
      if (zoomMode === "fit") {
        const fitScale = calculateFitScale();
        if (fitScale && Math.abs(fitScale - zoomLevel) > 0.01) {
          onZoomChange?.(fitScale, "fit");
        }
        centerCanvasInViewport();
      }
    };

    updateFit();

    const resizeObserver = new ResizeObserver(() => {
      updateFit();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [zoomMode, calculateFitScale, onZoomChange, zoomLevel, centerCanvasInViewport]);

  // Smooth zooming with trackpad pinch or Ctrl/Cmd + Wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const nextZoom = Math.max(0.35, Math.min(1.8, Number((zoomLevel + delta).toFixed(2))));
        onZoomChange?.(nextZoom, "manual");
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [zoomLevel, onZoomChange]);

  // Auto-center viewport to show center of base on mount
  useEffect(() => {
    centerCanvasInViewport();
  }, [centerCanvasInViewport]);

  // Selected Building lookup
  const selectedPlacedBuilding = useMemo(() => {
    if (!selectedPlacedId) return null;
    return buildings.find((b) => b.instanceId === selectedPlacedId) || null;
  }, [buildings, selectedPlacedId]);

  const selectedPlacedDef = useMemo(() => {
    if (!selectedPlacedBuilding) return null;
    return BUILDINGS_BY_ID.get(selectedPlacedBuilding.buildingId) || null;
  }, [selectedPlacedBuilding]);

  // Helper: Convert screen/mouse event to grid tile coordinates
  const getTileFromEvent = useCallback(
    (e: React.MouseEvent | React.DragEvent | MouseEvent): { x: number; y: number } | null => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = "clientX" in e ? e.clientX : 0;
      const clientY = "clientY" in e ? e.clientY : 0;

      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;

      if (offsetX < 0 || offsetY < 0 || offsetX >= rect.width || offsetY >= rect.height) {
        return null;
      }

      // The canvas now spans the border ring too, so offsetX/Y=0 is the true
      // map edge, MAP_BORDER cells before the buildable grid's (0,0) —
      // subtract it to get back to the same building/decoration coordinate
      // space used everywhere else in the app.
      const x = Math.floor(offsetX / cellSize) - MAP_BORDER;
      const y = Math.floor(offsetY / cellSize) - MAP_BORDER;

      if (x < -MAP_BORDER || y < -MAP_BORDER || x >= GRID_SIZE + MAP_BORDER || y >= GRID_SIZE + MAP_BORDER) return null;
      return { x, y };
    },
    [cellSize]
  );

  const dragActionCommittedRef = useRef(false);

  // Fast Wall placement using O(1) matrix check
  const tryPaintWallFast = useCallback(
    (x: number, y: number) => {
      const maxWalls = buildingLimits["wall"] || 0;
      const currentWalls = placedCounts["wall"] || 0;
      if (currentWalls >= maxWalls && maxWalls > 0) return;

      const { valid } = canPlaceBuildingFast(occupancyMatrix, "wall", x, y);
      if (!valid) return;

      const newWall: PlacedBuilding = {
        instanceId: `wall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        buildingId: "wall",
        x,
        y,
      };
      
      const replace = dragActionCommittedRef.current;
      onUpdateBuildings([...buildings, newWall], replace);
      dragActionCommittedRef.current = true;
    },
    [buildingLimits, buildings, occupancyMatrix, onUpdateBuildings, placedCounts]
  );

  // Fast Erase using O(1) matrix lookup
  const tryEraseFast = useCallback(
    (x: number, y: number) => {
      const target = getBuildingAtCell(occupancyMatrix, x, y);
      if (target) {
        const replace = dragActionCommittedRef.current;
        onUpdateBuildings(buildings.filter((b) => b.instanceId !== target.instanceId), replace);
        dragActionCommittedRef.current = true;

        if (selectedPlacedId === target.instanceId) {
          onSelectPlacedId(null);
        }
        return;
      }

      // Nothing real at this tile — try erasing a decoration instead, so the
      // eraser tool doubles as the decoration-removal tool (one mental model).
      if (onUpdateDecorations && decorations.length > 0) {
        const hit = decorations.find((d) => {
          const def = DECORATIONS_BY_ID.get(d.decorationId);
          if (!def) return false;
          return x >= d.x && x < d.x + def.width && y >= d.y && y < d.y + def.height;
        });
        if (hit) {
          onUpdateDecorations(decorations.filter((d) => d.instanceId !== hit.instanceId));
        }
      }
    },
    [buildings, decorations, occupancyMatrix, onSelectPlacedId, onUpdateBuildings, onUpdateDecorations, selectedPlacedId]
  );

  // Building-only occupancy mask (used for decoration collision — decorations
  // must not overlap real buildings/walls, but their own tiles are tracked
  // separately in `decorationOccupancyMask` below).
  const buildingOccupancyMask = useMemo(() => computeDeploymentMasks(buildings).occupancyMask, [buildings]);
  const decorationOccupancyMask = useMemo(() => buildDecorationOccupancyMask(decorations), [decorations]);

  // Fast Decoration placement (brush-paint, same interaction feel as walls)
  const tryPaintDecorationFast = useCallback(
    (x: number, y: number) => {
      if (!selectedDecorationDefId || !onUpdateDecorations) return;
      const def = DECORATIONS_BY_ID.get(selectedDecorationDefId);
      if (!def) return;
      if (!isDecorationPlacementFree(buildingOccupancyMask, decorationOccupancyMask, x, y, def.width, def.height)) return;

      const newDecoration: PlacedDecoration = {
        instanceId: `deco-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        decorationId: def.id,
        x,
        y,
      };
      onUpdateDecorations([...decorations, newDecoration]);
    },
    [buildingOccupancyMask, decorationOccupancyMask, decorations, onUpdateDecorations, selectedDecorationDefId]
  );

  const { invalidBuildings } = React.useMemo(() => {
     // We need validateLayoutAgainstLimits here, so let's just do a quick loop
     const counts: Record<string, number> = {};
     const invalid = new Set<string>();
     for (const b of buildings) {
        const limit = buildingLimits[b.buildingId] || 0;
        const c = counts[b.buildingId] || 0;
        if (limit === 0 || c >= limit) {
           invalid.add(b.instanceId);
        } else {
           counts[b.buildingId] = c + 1;
        }
     }
     return { invalidBuildings: invalid };
  }, [buildings, buildingLimits]);

  // ==========================================
  // HTML5 CANVAS 2D RENDER LOOP (60 FPS)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina / HiDPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalBoardPixelSize * dpr;
    canvas.height = totalBoardPixelSize * dpr;
    ctx.scale(dpr, dpr);

    // 1. Clear background — the border ring gets a darker plain grass fill
    // (matching the real game's look for the deploy strip surrounding the
    // village), THEN every coordinate below is translated by the border
    // width so grid-cell (0,0) still lands where it always has, leaving all
    // the building/decoration/overlay drawing math below untouched.
    ctx.fillStyle = "#142219";
    ctx.fillRect(0, 0, totalBoardPixelSize, totalBoardPixelSize);
    ctx.translate(borderPx, borderPx);

    ctx.fillStyle = "#1c3624"; // Lush Clash grass green
    ctx.fillRect(0, 0, boardPixelSize, boardPixelSize);

    // 2. Heatmap Layer (if active)
    if (heatmapData && settings.showHeatmap) {
      const density = heatmapData.densityGrid;
      const maxD = heatmapData.maxDensity;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const idx = y * GRID_SIZE + x;
          const val = density[idx];
          if (val > 0) {
            const intensity = val / maxD;
            ctx.fillStyle = getHeatmapColor(intensity, 0.65);
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    // 2b. Deployment Zone Overlay (uses the exact same mask as the Isometric
    // renderer and every non-visual consumer — see deploymentZones.ts).
    if (deploymentAnalysis && settings.deploymentDisplayMode !== "off") {
      const mode = settings.deploymentDisplayMode;
      const { deploymentBlockMask } = deploymentAnalysis.masks;
      const regionGrid = deploymentAnalysis.regionTypeGrid;

      if (mode === "blocked" || mode === "all") {
        ctx.fillStyle = "rgba(248, 113, 113, 0.16)";
        // Spans the border ring too — a building hugging the buildable edge
        // now correctly shows its halo bleeding onto the grass border.
        for (let y = -MAP_BORDER; y < GRID_SIZE + MAP_BORDER; y++) {
          for (let x = -MAP_BORDER; x < GRID_SIZE + MAP_BORDER; x++) {
            if (readCell(deploymentBlockMask, x, y)) {
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
          }
        }
      }

      if (mode === "holes" || mode === "all") {
        for (let y = -MAP_BORDER; y < GRID_SIZE + MAP_BORDER; y++) {
          for (let x = -MAP_BORDER; x < GRID_SIZE + MAP_BORDER; x++) {
            const regionType = readCell(regionGrid, x, y);
            if (regionType === "internal-hole") {
              ctx.fillStyle = "rgba(244, 63, 94, 0.55)";
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else if (regionType === "corridor") {
              ctx.fillStyle = "rgba(249, 115, 22, 0.38)";
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
          }
        }
      }
    }

    // 3. Grid Lines
    if (settings.showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = 0; i <= GRID_SIZE; i++) {
        // Vertical lines
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, boardPixelSize);
        // Horizontal lines
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(boardPixelSize, i * cellSize);
      }
      ctx.stroke();

      // Center 4-tile marker box (20,20 to 24,24)
      ctx.fillStyle = "rgba(255, 200, 87, 0.08)";
      ctx.fillRect(20 * cellSize, 20 * cellSize, 4 * cellSize, 4 * cellSize);
      ctx.strokeStyle = "rgba(255, 200, 87, 0.35)";
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(20 * cellSize, 20 * cellSize, 4 * cellSize, 4 * cellSize);
      ctx.setLineDash([]);
    }

    // 4. Draw Placed Buildings & Walls
    const vulnerableIds = chainAnalysis.vulnerableInstanceIds;
    const safeTH = Math.max(1, Math.min(18, townHallLevel || 11));
    const defaultWallLevel = getMaxBuildingLevel(safeTH, "wall");

    // Render walls first for clean layering
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.buildingId !== "wall") continue;

      const px = b.x * cellSize;
      const py = b.y * cellSize;
      const isSelected = selectedPlacedId === b.instanceId;
      const wallLevel = b.level ?? defaultWallLevel;

      // Draw leveled wall image if available
      const wallImg = getLeveledBuildingImage("wall", wallLevel, safeTH, () =>
        setRedrawCounter((c) => c + 1)
      );

      if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
        ctx.drawImage(wallImg, px, py, cellSize, cellSize);
      } else {
        // High-contrast fallback block while image is loading
        ctx.fillStyle = isSelected ? "#ffd32a" : "#64748b";
        ctx.fillRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        ctx.strokeStyle = isSelected ? "#fffa65" : "#94a3b8";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }

      // Selection indicator
      if (isSelected) {
        ctx.strokeStyle = "#ffc857";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
      }
    }

    // Render non-wall buildings
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.buildingId === "wall") continue;

      const def = BUILDINGS_BY_ID.get(b.buildingId);
      if (!def) continue;

      const px = b.x * cellSize;
      const py = b.y * cellSize;
      const pw = def.width * cellSize;
      const ph = def.height * cellSize;
      const isSelected = selectedPlacedId === b.instanceId;
      const isVulnerable = vulnerableIds.has(b.instanceId);
      const isInvalid = invalidBuildings.has(b.instanceId);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(px + 2, py + 3, pw - 4, ph - 4);

      // Building Image / Box
      const img = getLeveledBuildingImage(b.buildingId, b.level, safeTH, () =>
        setRedrawCounter((c) => c + 1)
      );

      if (img && !isInvalid) {
        // Subtle backing for clean contrast
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
        ctx.drawImage(img, px + 1, py + 1, pw - 2, ph - 2);
      } else {
        ctx.fillStyle = isInvalid ? "#7f8c8d" : (def.color || "#34495e");
        ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      }

      // Border & Selection Highlight
      if (isSelected) {
        ctx.strokeStyle = "#ffc857";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      } else if (isInvalid) {
        ctx.strokeStyle = "#e84118";
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        ctx.setLineDash([]);
      } else if (isVulnerable && settings.plannerMode === "analysis" && settings.showChainLightning !== "none") {
        ctx.strokeStyle = "#ff4757";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      } else {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      }

      // Invalid Warning Icon (Draw a red circle with '!')
      if (isInvalid) {
        ctx.fillStyle = "#e84118";
        ctx.beginPath();
        ctx.arc(px + pw - 8, py + 8, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", px + pw - 8, py + 8);
      }

      // Building Label (Name, Level, Coords) with zero overlap
      if (settings.showBuildingNames || settings.showBuildingLevels || settings.showCoordinates) {
        const isHovered =
          hoverCoord &&
          hoverCoord.x >= b.x &&
          hoverCoord.x < b.x + def.width &&
          hoverCoord.y >= b.y &&
          hoverCoord.y < b.y + def.height;

        const maxTextWidth = Math.max(0, pw - 4); // 2px margin each side
        const baseFontSize = Math.max(7, Math.min(11, Math.round(cellSize * 0.52)));
        ctx.font = `bold ${baseFontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Selective density: on small buildings, hide name at very small zooms unless hovered/selected
        let shouldDrawName = settings.showBuildingNames;
        if (cellSize < 12) {
          if (def.width < 4 && !isSelected && !isHovered) {
            shouldDrawName = false;
          }
        } else if (cellSize < 15) {
          if (def.width <= 2 && !isSelected && !isHovered) {
            shouldDrawName = false;
          }
        }

        if (shouldDrawName && maxTextWidth >= 16) {
          // Mathematical truncation with measureText: guarantee it NEVER overflows pw - 4
          let displayName = def.name;
          if (ctx.measureText(displayName).width > maxTextWidth) {
            let left = 1;
            let right = def.name.length - 1;
            let best = "";
            while (left <= right) {
              const mid = Math.floor((left + right) / 2);
              const testStr = def.name.slice(0, mid) + "..";
              if (ctx.measureText(testStr).width <= maxTextWidth) {
                best = testStr;
                left = mid + 1;
              } else {
                right = mid - 1;
              }
            }
            displayName = best;
          }

          if (displayName) {
            const buildingLevel = b.level ?? getMaxBuildingLevel(safeTH, b.buildingId);
            const hasSubText =
              (settings.showBuildingLevels && buildingLevel && ph >= 2 * cellSize + 4) ||
              (settings.showCoordinates && ph >= 3 * cellSize && cellSize >= 14);
            const textY = py + ph / 2 - (hasSubText ? Math.round(baseFontSize * 0.55) : 0);

            // Subtle dark background backing / drop shadow for crisp legibility
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillText(displayName, px + pw / 2, textY + 1);
            ctx.fillStyle = isSelected ? "#ffffff" : "#f8fafc";
            ctx.fillText(displayName, px + pw / 2, textY);

            // Secondary row: Level or Coordinates
            if (settings.showBuildingLevels && buildingLevel && ph >= 2 * cellSize + 4) {
              const subFontSize = Math.max(7, baseFontSize - 2);
              ctx.font = `bold ${subFontSize}px sans-serif`;
              const subText = cellSize < 15 ? `L${buildingLevel}` : `Lv.${buildingLevel}`;
              if (ctx.measureText(subText).width <= maxTextWidth) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
                ctx.fillText(subText, px + pw / 2, textY + baseFontSize + 2);
                ctx.fillStyle = isSelected ? "#fef08a" : "#facc15";
                ctx.fillText(subText, px + pw / 2, textY + baseFontSize + 1);
              }
            } else if (settings.showCoordinates && ph >= 3 * cellSize && cellSize >= 14) {
              const subFontSize = Math.max(7, baseFontSize - 2);
              ctx.font = `normal ${subFontSize}px sans-serif`;
              const coordText = `${b.x},${b.y}`;
              if (ctx.measureText(coordText).width <= maxTextWidth) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.fillText(coordText, px + pw / 2, textY + baseFontSize + 2);
                ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
                ctx.fillText(coordText, px + pw / 2, textY + baseFontSize + 1);
              }
            }
          }
        }
      }
    }

    // 4c. Cosmetic Decorations (never affects occupancy/deployment — visual only)
    for (let i = 0; i < decorations.length; i++) {
      const dcor = decorations[i];
      const def = DECORATIONS_BY_ID.get(dcor.decorationId);
      if (!def) continue;

      const px = dcor.x * cellSize;
      const py = dcor.y * cellSize;
      const pw = def.width * cellSize;
      const ph = def.height * cellSize;
      const radius = Math.min(pw, ph) * 0.22;

      // Decorations ship with no bundled art (see decorationCatalog.ts) — an
      // admin can upload one via AdminImageManager, at which point it takes
      // over from the color-tile-plus-emoji placeholder entirely.
      const decoImg = getDecorationImage(def.id, () => setRedrawCounter((c) => c + 1));
      if (decoImg && decoImg.complete && decoImg.naturalWidth > 0) {
        ctx.drawImage(decoImg, px + 1, py + 1, pw - 2, ph - 2);
      } else {
        ctx.beginPath();
        if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: Function }).roundRect === "function") {
          ctx.roundRect(px + 1, py + 1, pw - 2, ph - 2, radius);
        } else {
          ctx.rect(px + 1, py + 1, pw - 2, ph - 2);
        }
        ctx.fillStyle = def.color;
        ctx.globalAlpha = 0.88;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = def.accentColor || "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const fontSize = Math.max(8, Math.min(pw, ph) * 0.62);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(def.emoji, px + pw / 2, py + ph / 2 + 1);
      }
    }

    // 4d. Shape Stamp ghost preview (Decorative Design tool)
    if (stampPreviewCoords && stampPreviewCoords.length > 0) {
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      for (const c of stampPreviewCoords) {
        if (c.x < 0 || c.y < 0 || c.x >= GRID_SIZE || c.y >= GRID_SIZE) continue;
        const px = c.x * cellSize;
        const py = c.y * cellSize;
        ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
      }
    }

    // 4b. Selected Building's Deployment Halo (independent of the global
    // overlay toggle — a quick per-building inspector, distinct color from
    // both the amber selection border and the block/hole overlay above).
    if (selectedPlacedBuilding) {
      const selRect = getBuildingRect(selectedPlacedBuilding);
      if (selRect) {
        const { blockRadius } = HOME_VILLAGE_DEPLOYMENT_RULES;
        // Clamped to the true 50x50 map (buildable grid + border), not just
        // the 44x44 buildable grid — a building hugging the edge still has
        // its halo land on the grass border, matching computeDeploymentAnalysis.
        const haloLeft = Math.max(-MAP_BORDER, selRect.x - blockRadius);
        const haloTop = Math.max(-MAP_BORDER, selRect.y - blockRadius);
        const haloRight = Math.min(GRID_SIZE + MAP_BORDER, selRect.x + selRect.width + blockRadius);
        const haloBottom = Math.min(GRID_SIZE + MAP_BORDER, selRect.y + selRect.height + blockRadius);

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(
          haloLeft * cellSize,
          haloTop * cellSize,
          (haloRight - haloLeft) * cellSize,
          (haloBottom - haloTop) * cellSize
        );
        ctx.setLineDash([]);
      }
    }

    // 5. Tactical Range Circles Layer
    if (settings.showRanges !== "none") {
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        const def = BUILDINGS_BY_ID.get(b.buildingId);
        if (!def || !def.range) continue;

        const isSelected = selectedPlacedId === b.instanceId;
        const shouldShow =
          settings.showRanges === "all" || (settings.showRanges === "selected" && isSelected);

        if (!shouldShow) continue;

        const cx = (b.x + def.width / 2) * cellSize;
        const cy = (b.y + def.height / 2) * cellSize;
        const radius = def.range * cellSize;

        // Max Range Circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "rgba(89, 217, 237, 0.12)" : "rgba(255, 200, 87, 0.05)";
        ctx.fill();

        ctx.strokeStyle = isSelected ? "#59d9ed" : "rgba(255, 200, 87, 0.4)";
        ctx.lineWidth = isSelected ? 2 : 1;
        if (!isSelected) ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dead Zone / Min Range (Mortar, Eagle, etc.)
        if (def.minRange && def.minRange > 0) {
          const minRadius = def.minRange * cellSize;
          ctx.beginPath();
          ctx.arc(cx, cy, minRadius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 115, 128, 0.15)";
          ctx.fill();
          ctx.strokeStyle = "#ff7380";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // 6. Chain Lightning Hazard Lines & Badges
    if (settings.plannerMode === "analysis" && settings.showChainLightning !== "none" && chainAnalysis.dangerPairs.length > 0) {
      for (let i = 0; i < chainAnalysis.dangerPairs.length; i++) {
        const pair = chainAnalysis.dangerPairs[i];
        if (settings.showChainLightning === "selected" && selectedPlacedId) {
          if (pair.b1.instanceId !== selectedPlacedId && pair.b2.instanceId !== selectedPlacedId) continue;
        }
        const cx1 = (pair.b1.x + pair.b1Def.width / 2) * cellSize;
        const cy1 = (pair.b1.y + pair.b1Def.height / 2) * cellSize;
        const cx2 = (pair.b2.x + pair.b2Def.width / 2) * cellSize;
        const cy2 = (pair.b2.y + pair.b2Def.height / 2) * cellSize;

        const isCritical = pair.dangerLevel === "critical";
        const strokeColor = isCritical ? "#ff4757" : "#ffa502";

        // Line
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isCritical ? 2.5 : 1.8;
        ctx.setLineDash(isCritical ? [4, 3] : [6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint distance badge
        const midX = (cx1 + cx2) / 2;
        const midY = (cy1 + cy2) / 2;

        ctx.beginPath();
        ctx.arc(midX, midY, 9, 0, Math.PI * 2);
        ctx.fillStyle = "#111d28";
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${pair.distance}ô`, midX, midY);
      }
    }

    // 7. Active Drag & Placement Preview Box
    const previewDef = activeDrag
      ? BUILDINGS_BY_ID.get(activeDrag.buildingId)
      : selectedDefId
      ? BUILDINGS_BY_ID.get(selectedDefId)
      : null;

    const previewCoord = activeDrag
      ? { x: activeDrag.currentX, y: activeDrag.currentY }
      : hoverCoord;

    if (previewDef && previewCoord) {
      const px = previewCoord.x * cellSize;
      const py = previewCoord.y * cellSize;
      const pw = previewDef.width * cellSize;
      const ph = previewDef.height * cellSize;

      const isValid = activeDrag
        ? activeDrag.isValid
        : canPlaceBuildingFast(occupancyMatrix, previewDef.id, previewCoord.x, previewCoord.y).valid;

      // Draw Range Preview
      if (previewDef.range) {
        const pcx = (previewCoord.x + previewDef.width / 2) * cellSize;
        const pcy = (previewCoord.y + previewDef.height / 2) * cellSize;
        ctx.beginPath();
        ctx.arc(pcx, pcy, previewDef.range * cellSize, 0, Math.PI * 2);
        ctx.fillStyle = isValid ? "rgba(115, 228, 154, 0.12)" : "rgba(255, 115, 128, 0.1)";
        ctx.fill();
        ctx.strokeStyle = isValid ? "#73e49a" : "#ff7380";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Box
      ctx.fillStyle = isValid ? "rgba(115, 228, 154, 0.35)" : "rgba(255, 115, 128, 0.45)";
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = isValid ? "#73e49a" : "#ff7380";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(px, py, pw, ph);
      ctx.setLineDash([]);

      // Status text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isValid ? "Hợp lệ" : "Đè vị trí!", px + pw / 2, py + ph / 2);
    }
  }, [
    activeDrag,
    boardPixelSize,
    borderPx,
    totalBoardPixelSize,
    buildings,
    cellSize,
    chainAnalysis,
    decorations,
    deploymentAnalysis,
    heatmapData,
    hoverCoord,
    occupancyMatrix,
    redrawCounter,
    selectedDefId,
    selectedPlacedBuilding,
    selectedPlacedId,
    settings,
    stampPreviewCoords,
  ]);

  // ==========================================
  // MOUSE & POINTER EVENTS (O(1) FAST)
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.button !== 1) return; // Left or Middle click
    setIsPointerDown(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
    dragActionCommittedRef.current = false;

    // Middle click pan
    if (e.button === 1) {
      e.preventDefault();
      if (containerRef.current) {
        setIsPanning(true);
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop,
        };
      }
      return;
    }

    const coord = getTileFromEvent(e);
    if (!coord) return;

    // 1. Eraser mode
    if (settings.eraserActive) {
      setIsErasing(true);
      tryEraseFast(coord.x, coord.y);
      return;
    }

    // 2. Wall brush mode
    if (settings.wallBrushActive) {
      setIsPaintingWalls(true);
      tryPaintWallFast(coord.x, coord.y);
      return;
    }

    // 2b. Decoration brush mode (Decorative Design tool)
    if (selectedDecorationDefId) {
      setIsPaintingDecorations(true);
      tryPaintDecorationFast(coord.x, coord.y);
      return;
    }

    // 3. Click-to-place active inventory item
    if (selectedDefId) {
      const def = BUILDINGS_BY_ID.get(selectedDefId);
      if (def) {
        const max = buildingLimits[def.id] || 0;
        const current = placedCounts[def.id] || 0;
        if (current < max || max === 0) {
          const { valid } = canPlaceBuildingFast(occupancyMatrix, def.id, coord.x, coord.y);
          if (valid) {
            const newBuilding: PlacedBuilding = {
              instanceId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              buildingId: def.id,
              x: coord.x,
              y: coord.y,
            };
            onUpdateBuildings([...buildings, newBuilding]);
            if (def.id !== "wall" && current + 1 >= max) {
              onClearSelectedDef();
            }
            return;
          }
        }
      }
    }

    // 4. Click existing building -> Select & Start Drag-to-move
    const clicked = getBuildingAtCell(occupancyMatrix, coord.x, coord.y);
    if (clicked) {
      onSelectPlacedId(clicked.instanceId);
      const def = BUILDINGS_BY_ID.get(clicked.buildingId);
      if (def) {
        setActiveDrag({
          type: "move",
          buildingId: clicked.buildingId,
          instanceId: clicked.instanceId,
          width: def.width,
          height: def.height,
          currentX: clicked.x,
          currentY: clicked.y,
          isValid: true,
        });
      }
    } else {
      onSelectPlacedId(null);
      // Empty background clicked -> start panning viewport
      if (containerRef.current) {
        setIsPanning(true);
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop,
        };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Panning canvas
    if (isPanning && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
      return;
    }

    const coord = getTileFromEvent(e);
    setHoverCoord(coord);

    if (!coord) return;

    // Wall Painting
    if (isPaintingWalls && settings.wallBrushActive) {
      tryPaintWallFast(coord.x, coord.y);
      return;
    }

    // Decoration Painting
    if (isPaintingDecorations && selectedDecorationDefId) {
      tryPaintDecorationFast(coord.x, coord.y);
      return;
    }

    // Erasing
    if (isErasing && settings.eraserActive) {
      tryEraseFast(coord.x, coord.y);
      return;
    }

    // Moving building
    if (activeDrag && isPointerDown) {
      const { valid } = canPlaceBuildingFast(
        occupancyMatrix,
        activeDrag.buildingId,
        coord.x,
        coord.y,
        activeDrag.instanceId
      );

      setActiveDrag((prev) =>
        prev
          ? {
              ...prev,
              currentX: coord.x,
              currentY: coord.y,
              isValid: valid,
            }
          : null
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPointerDown(false);
    setIsPaintingWalls(false);
    setIsPaintingDecorations(false);
    setIsErasing(false);
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe release
      }
    }

    if (activeDrag) {
      if (activeDrag.isValid) {
        if (activeDrag.type === "new") {
          const newB: PlacedBuilding = {
            instanceId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            buildingId: activeDrag.buildingId,
            x: activeDrag.currentX,
            y: activeDrag.currentY,
          };
          onUpdateBuildings([...buildings, newB]);
          onSelectPlacedId(newB.instanceId);
        } else if (activeDrag.type === "move" && activeDrag.instanceId) {
          const updated = buildings.map((b) =>
            b.instanceId === activeDrag.instanceId
              ? { ...b, x: activeDrag.currentX, y: activeDrag.currentY }
              : b
          );
          onUpdateBuildings(updated);
        }
      }
      setActiveDrag(null);
    }
  };

  // HTML5 Drag & Drop from Sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const coord = getTileFromEvent(e);
    if (!coord) return;
    setHoverCoord(coord);

    if (activeDrag) {
      const { valid } = canPlaceBuildingFast(
        occupancyMatrix,
        activeDrag.buildingId,
        coord.x,
        coord.y,
        activeDrag.instanceId
      );
      setActiveDrag((prev) =>
        prev ? { ...prev, currentX: coord.x, currentY: coord.y, isValid: valid } : null
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const coord = getTileFromEvent(e);
    if (!coord) {
      setActiveDrag(null);
      return;
    }

    const buildingId = e.dataTransfer.getData("text/plain");
    const def = BUILDINGS_BY_ID.get(buildingId);
    if (!def) {
      setActiveDrag(null);
      return;
    }

    const max = buildingLimits[def.id] || 0;
    const current = placedCounts[def.id] || 0;
    
    // Ngăn chặn đặt nếu giới hạn = 0 hoặc đã đạt tối đa
    if (max === 0 || current >= max) {
      setActiveDrag(null);
      return;
    }

    const { valid } = canPlaceBuildingFast(occupancyMatrix, def.id, coord.x, coord.y);
    if (valid) {
      const newB: PlacedBuilding = {
        instanceId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        buildingId: def.id,
        x: coord.x,
        y: coord.y,
      };
      onUpdateBuildings([...buildings, newB]);
      onSelectPlacedId(newB.instanceId);
    }
    setActiveDrag(null);
  };

  // Remove selected building
  const handleRemoveSelected = () => {
    if (!selectedPlacedId) return;
    onUpdateBuildings(buildings.filter((b) => b.instanceId !== selectedPlacedId));
    onSelectPlacedId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!selectedPlacedId) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      handleRemoveSelected();
      return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const target = buildings.find(b => b.instanceId === selectedPlacedId);
      if (!target) return;

      const def = BUILDINGS_BY_ID.get(target.buildingId);
      if (!def) return;

      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowUp") dy = -1;
      if (e.key === "ArrowDown") dy = 1;
      if (e.key === "ArrowLeft") dx = -1;
      if (e.key === "ArrowRight") dx = 1;

      const newX = target.x + dx;
      const newY = target.y + dy;

      if (newX < 0 || newY < 0 || newX + def.width > GRID_SIZE || newY + def.height > GRID_SIZE) return;

      const { valid } = canPlaceBuildingFast(occupancyMatrix, target.buildingId, newX, newY, target.instanceId);
      if (valid) {
        const updated = buildings.map(b => b.instanceId === selectedPlacedId ? { ...b, x: newX, y: newY } : b);
        onUpdateBuildings(updated);
      }
    }
  };

  return (
    <div className="grid-canvas-viewport relative" ref={containerRef}>
      {/* SMART COMPACT ALERT: Chain Lightning Hazards (Top-Left Floating Toast) */}
      {settings.plannerMode === "analysis" && settings.showChainLightning !== "none" && chainAnalysis.dangerPairs.length > 0 && (
        <div className="absolute top-4 left-4 z-30 transition-all">
          {isChainAlertDismissed ? (
            <button
              onClick={() => setIsChainAlertDismissed(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/85 backdrop-blur-md border border-rose-500/50 text-rose-300 hover:text-white shadow-xl text-xs font-bold transition-all hover:scale-105"
              title="Nhấn để mở lại cảnh báo sét lan"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{chainAnalysis.dangerPairs.length} vị trí sét lan</span>
            </button>
          ) : (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-rose-500/50 text-slate-200 shadow-2xl max-w-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <Zap className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <strong className="text-xs text-rose-300 font-extrabold">
                    Nguy cơ Sét lan (≤2 ô)
                  </strong>
                  <span className="bg-rose-600 text-white font-black text-[9.5px] px-2 py-0.5 rounded-full font-mono">
                    {chainAnalysis.dangerPairs.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsChainAlertExpanded(!isChainAlertExpanded)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title={isChainAlertExpanded ? "Thu gọn" : "Mở rộng"}
                    aria-label={isChainAlertExpanded ? "Thu gọn cảnh báo sét" : "Mở rộng cảnh báo sét"}
                  >
                    {isChainAlertExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setIsChainAlertDismissed(true)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Đóng thông báo"
                    aria-label="Đóng thông báo cảnh báo sét"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isChainAlertExpanded && (
                <div className="text-[11px] text-slate-300 leading-snug pt-1 border-t border-slate-800/80">
                  <p>
                    <b className="text-rose-400">{chainAnalysis.criticalCount}</b> cặp cách ≤ 1 ô (nguy hiểm) &amp;{" "}
                    <b className="text-amber-400">{chainAnalysis.warningCount}</b> cặp cách 2 ô (E-Dragon chain).
                  </p>
                  <span className="text-[10px] text-slate-400 italic block mt-1">
                    Gợi ý: Dãn cách các trụ phòng thủ chủ lực ≥ 3 ô để vô hiệu hóa chuỗi sét.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FLOATING HUD: Firepower Heatmap & Quadrants Balance (Top-Right Floating HUD) */}
      {settings.showHeatmap && heatmapData && (
        <div className="absolute top-4 right-4 z-30 transition-all">
          <div className="p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-slate-200 shadow-2xl max-w-xs sm:max-w-sm flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <strong className="text-xs text-orange-300 font-extrabold tracking-wide">
                    Mật độ Hỏa lực
                  </strong>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    Phân tích phủ sóng phòng thủ
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsHeatmapHudExpanded(!isHeatmapHudExpanded)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isHeatmapHudExpanded ? "Thu gọn" : "Mở rộng"}
                aria-label={isHeatmapHudExpanded ? "Thu gọn mật độ hỏa lực" : "Mở rộng mật độ hỏa lực"}
              >
                {isHeatmapHudExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isHeatmapHudExpanded ? (
              <div className="flex flex-col gap-2.5 pt-0.5">
                {/* 4-level Color Legend */}
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80 shrink-0" />
                    <span className="text-[9.5px] text-slate-300">Thấp</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 shrink-0" />
                    <span className="text-[9.5px] text-slate-300">Vừa</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
                    <span className="text-[9.5px] text-slate-300">Cao</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-600 shrink-0" />
                    <span className="text-[9.5px] text-red-300 font-bold">Hot</span>
                  </div>
                </div>

                {/* Metrics: Blind Spots + Quadrant Balance */}
                <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-850">
                  <span className="text-slate-400">Vùng mù ngoài rìa:</span>
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
                    {heatmapData.blindSpotsPercent}%
                  </span>
                </div>

                {/* Quadrants */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Cân bằng hỏa lực 4 hướng:
                  </span>
                  <div className="grid grid-cols-4 gap-1 text-[9.5px] font-mono text-center">
                    <div className="bg-slate-900/80 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500 text-[8.5px] block">NW</span>
                      <b className="text-cyan-300">{heatmapData.quadrantBalance.nw}%</b>
                    </div>
                    <div className="bg-slate-900/80 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500 text-[8.5px] block">NE</span>
                      <b className="text-cyan-300">{heatmapData.quadrantBalance.ne}%</b>
                    </div>
                    <div className="bg-slate-900/80 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500 text-[8.5px] block">SW</span>
                      <b className="text-cyan-300">{heatmapData.quadrantBalance.sw}%</b>
                    </div>
                    <div className="bg-slate-900/80 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500 text-[8.5px] block">SE</span>
                      <b className="text-cyan-300">{heatmapData.quadrantBalance.se}%</b>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300 pt-0.5 font-mono">
                <span>Vùng mù: <b className="text-amber-300">{heatmapData.blindSpotsPercent}%</b></span>
                <span>NW:{heatmapData.quadrantBalance.nw}% SE:{heatmapData.quadrantBalance.se}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HTML5 Canvas Element */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Bản đồ Clash of Clans"
        role="application"
        className={`grid-canvas-board outline-none ${
          isPanning
            ? "cursor-grabbing"
            : settings.wallBrushActive
            ? "brush-mode"
            : settings.eraserActive
            ? "eraser-mode"
            : selectedDefId
            ? "cursor-copy"
            : "cursor-crosshair"
        }`}
        style={{
          width: `${totalBoardPixelSize}px`,
          height: `${totalBoardPixelSize}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  );
}
