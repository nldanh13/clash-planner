import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Move,
  RotateCw,
  ShieldAlert,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { BUILDINGS_BY_ID, CELL_SIZE_PX, GRID_SIZE } from "./constants";
import { scanChainLightningHazards } from "./chainLightningUtils";
import { buildOccupancyMatrix, canPlaceBuildingFast, getBuildingAtCell } from "./gridMatrix";
import { calculateFirepowerHeatmap, getHeatmapColor } from "./heatmapUtils";
import type { BuildingDef, PlacedBuilding, TacticalSettings } from "./types";

interface CanvasGridBoardProps {
  buildings: PlacedBuilding[];
  onUpdateBuildings: (newBuildings: PlacedBuilding[]) => void;
  selectedDefId: string | null;
  onClearSelectedDef: () => void;
  selectedPlacedId: string | null;
  onSelectPlacedId: (instanceId: string | null) => void;
  buildingLimits: Record<string, number>;
  settings: TacticalSettings;
  zoomLevel: number;
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
}: CanvasGridBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isPaintingWalls, setIsPaintingWalls] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  // Scaled dimensions
  const cellSize = Math.round(CELL_SIZE_PX * zoomLevel);
  const boardPixelSize = GRID_SIZE * cellSize;

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
    if (!settings.showChainLightning) {
      return { dangerPairs: [], vulnerableInstanceIds: new Set<string>(), criticalCount: 0, warningCount: 0 };
    }
    return scanChainLightningHazards(buildings, settings.chainMaxDistance);
  }, [buildings, settings.showChainLightning, settings.chainMaxDistance]);

  // Calculate Firepower Heatmap
  const heatmapData = useMemo(() => {
    if (!settings.showHeatmap) return null;
    return calculateFirepowerHeatmap(buildings);
  }, [buildings, settings.showHeatmap]);

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

      const x = Math.floor(offsetX / cellSize);
      const y = Math.floor(offsetY / cellSize);

      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
      return { x, y };
    },
    [cellSize]
  );

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
      onUpdateBuildings([...buildings, newWall]);
    },
    [buildingLimits, buildings, occupancyMatrix, onUpdateBuildings, placedCounts]
  );

  // Fast Erase using O(1) matrix lookup
  const tryEraseFast = useCallback(
    (x: number, y: number) => {
      const target = getBuildingAtCell(occupancyMatrix, x, y);
      if (target) {
        onUpdateBuildings(buildings.filter((b) => b.instanceId !== target.instanceId));
        if (selectedPlacedId === target.instanceId) {
          onSelectPlacedId(null);
        }
      }
    },
    [buildings, occupancyMatrix, onSelectPlacedId, onUpdateBuildings, selectedPlacedId]
  );

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
    canvas.width = boardPixelSize * dpr;
    canvas.height = boardPixelSize * dpr;
    ctx.scale(dpr, dpr);

    // 1. Clear background
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

    // Render walls first for clean layering
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.buildingId !== "wall") continue;

      const px = b.x * cellSize;
      const py = b.y * cellSize;
      const isSelected = selectedPlacedId === b.instanceId;

      // Wall block styling
      ctx.fillStyle = isSelected ? "#ffd32a" : "#718093";
      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      // Inner highlight
      ctx.strokeStyle = isSelected ? "#fffa65" : "#a4b0be";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
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

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(px + 2, py + 3, pw - 4, ph - 4);

      // Building Box
      ctx.fillStyle = def.color || "#34495e";
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

      // Border & Selection Highlight
      if (isSelected) {
        ctx.strokeStyle = "#ffc857";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      } else if (isVulnerable && settings.showChainLightning) {
        ctx.strokeStyle = "#ff4757";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      } else {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      }

      // Building Label (Name & Coord)
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const fontSize = Math.max(8, Math.min(11, Math.round(cellSize * 0.55)));
      ctx.font = `bold ${fontSize}px sans-serif`;

      const textY = py + ph / 2 - (ph >= 3 * cellSize ? 4 : 0);
      const displayName = def.name.length > 12 && def.width <= 3 ? def.name.slice(0, 10) + ".." : def.name;
      ctx.fillText(displayName, px + pw / 2, textY);

      if (ph >= 3 * cellSize) {
        ctx.font = `normal ${Math.max(7, fontSize - 2.5)}px sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.fillText(`${b.x},${b.y}`, px + pw / 2, textY + fontSize + 1);
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
    if (settings.showChainLightning && chainAnalysis.dangerPairs.length > 0) {
      for (let i = 0; i < chainAnalysis.dangerPairs.length; i++) {
        const pair = chainAnalysis.dangerPairs[i];
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
    buildings,
    cellSize,
    chainAnalysis,
    heatmapData,
    hoverCoord,
    occupancyMatrix,
    selectedDefId,
    selectedPlacedId,
    settings,
  ]);

  // ==========================================
  // MOUSE & POINTER EVENTS (O(1) FAST)
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsPointerDown(true);

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
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coord = getTileFromEvent(e);
    setHoverCoord(coord);

    if (!coord) return;

    // Wall Painting
    if (isPaintingWalls && settings.wallBrushActive) {
      tryPaintWallFast(coord.x, coord.y);
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

  const handleMouseUp = () => {
    setIsPointerDown(false);
    setIsPaintingWalls(false);
    setIsErasing(false);

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
    if (current >= max && max > 0) {
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

  return (
    <div className="grid-canvas-viewport" ref={containerRef}>
      {/* Alert Banner for Chain Lightning Hazards */}
      {settings.showChainLightning && chainAnalysis.dangerPairs.length > 0 && (
        <div className="chain-alert-banner">
          <Zap />
          <span>
            <b>Phát hiện {chainAnalysis.dangerPairs.length} vị trí có nguy cơ sét lan:</b>{" "}
            {chainAnalysis.criticalCount} cặp công trình cách ≤ 1 ô (nguy hiểm) và{" "}
            {chainAnalysis.warningCount} cặp cách 2 ô (E-Dragon chain). Hãy dãn cách ≥ 3 ô!
          </span>
        </div>
      )}

      {/* Heatmap Legend Bar (if heatmap is active) */}
      {settings.showHeatmap && heatmapData && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 mb-2 w-full max-w-[800px] bg-[#09151e] border border-[#2b4154] rounded-lg text-[10px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-400">Mật độ hỏa lực:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-500/80" />
              <span className="text-[9px]">Thấp</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/80" />
              <span className="text-[9px]">Vừa</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-400/90" />
              <span className="text-[9px]">Cao</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-600" />
              <span className="text-[9px]">Điểm nóng (Hot Zone)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Vùng mù ngoài rìa: <b className="text-amber-300">{heatmapData.blindSpotsPercent}%</b>
            </span>
            <span>
              Phủ sóng 4 góc: <b className="text-cyan-300">NW:{heatmapData.quadrantBalance.nw}% NE:{heatmapData.quadrantBalance.ne}% SW:{heatmapData.quadrantBalance.sw}% SE:{heatmapData.quadrantBalance.se}%</b>
            </span>
          </div>
        </div>
      )}

      {/* HTML5 Canvas Element */}
      <canvas
        ref={canvasRef}
        className={`grid-canvas-board ${settings.wallBrushActive ? "brush-mode" : ""} ${
          settings.eraserActive ? "eraser-mode" : ""
        }`}
        style={{
          width: `${boardPixelSize}px`,
          height: `${boardPixelSize}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      {/* Floating Inspector Panel */}
      {selectedPlacedBuilding && selectedPlacedDef && (
        <div className="building-inspector-card">
          <div className="inspector-head">
            <div className="inspector-title">
              <span
                className="color-dot"
                style={{ backgroundColor: selectedPlacedDef.color }}
              />
              <strong>{selectedPlacedDef.name}</strong>
            </div>
            <button
              className="close-inspector-btn"
              onClick={() => onSelectPlacedId(null)}
              title="Đóng"
            >
              <X />
            </button>
          </div>

          <div className="inspector-body">
            <div className="inspector-stat-row">
              <span>Tọa độ:</span>
              <b>
                ({selectedPlacedBuilding.x}, {selectedPlacedBuilding.y})
              </b>
            </div>
            <div className="inspector-stat-row">
              <span>Kích thước:</span>
              <b>
                {selectedPlacedDef.width}x{selectedPlacedDef.height} ô
              </b>
            </div>
            {selectedPlacedDef.range && (
              <div className="inspector-stat-row">
                <span>Tầm bắn:</span>
                <b>
                  {selectedPlacedDef.minRange ? `${selectedPlacedDef.minRange} - ` : ""}
                  {selectedPlacedDef.range} ô
                </b>
              </div>
            )}
            <p className="inspector-desc">{selectedPlacedDef.description}</p>
          </div>

          <div className="inspector-actions">
            <button
              className="inspector-delete-btn"
              onClick={handleRemoveSelected}
              title="Xóa công trình này khỏi bản đồ"
            >
              <Trash2 />
              <span>Xóa bỏ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
