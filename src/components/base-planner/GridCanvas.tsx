import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { checkPlacementValidity, scanChainLightningHazards } from "./chainLightningUtils";
import type { BuildingDef, PlacedBuilding, TacticalSettings } from "./types";

interface GridCanvasProps {
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

interface DragState {
  type: "new" | "move";
  buildingId: string;
  instanceId?: string;
  width: number;
  height: number;
  currentX: number;
  currentY: number;
  isValid: boolean;
}

export function GridCanvas({
  buildings,
  onUpdateBuildings,
  selectedDefId,
  onClearSelectedDef,
  selectedPlacedId,
  onSelectPlacedId,
  buildingLimits,
  settings,
  zoomLevel,
}: GridCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPaintingWalls, setIsPaintingWalls] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  // Calculate Placed counts
  const placedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of buildings) {
      map[b.buildingId] = (map[b.buildingId] || 0) + 1;
    }
    return map;
  }, [buildings]);

  // Chain Lightning Hazard analysis
  const chainAnalysis = useMemo(() => {
    if (!settings.showChainLightning) {
      return {
        dangerPairs: [],
        vulnerableInstanceIds: new Set<string>(),
        criticalCount: 0,
        warningCount: 0,
      };
    }
    return scanChainLightningHazards(buildings, settings.chainMaxDistance);
  }, [buildings, settings.showChainLightning, settings.chainMaxDistance]);

  // Selected building reference
  const selectedPlacedBuilding = useMemo(() => {
    if (!selectedPlacedId) return null;
    return buildings.find((b) => b.instanceId === selectedPlacedId) || null;
  }, [buildings, selectedPlacedId]);

  const selectedPlacedDef = useMemo(() => {
    if (!selectedPlacedBuilding) return null;
    return BUILDINGS_BY_ID.get(selectedPlacedBuilding.buildingId) || null;
  }, [selectedPlacedBuilding]);

  // Cell size scaled by zoom
  const cellSize = CELL_SIZE_PX * zoomLevel;
  const boardPixelSize = GRID_SIZE * cellSize;

  // Helper: Convert client event to grid coordinates
  const getGridCoordFromEvent = useCallback(
    (e: React.MouseEvent | React.DragEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? (e as any).touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? (e as any).touches[0].clientY : e.clientY;

      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;

      if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
        return null;
      }

      const x = Math.floor(offsetX / cellSize);
      const y = Math.floor(offsetY / cellSize);

      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
      return { x, y };
    },
    [cellSize]
  );

  // Place a single wall at (x, y) if within limit and space is free
  const tryPaintWallAt = useCallback(
    (x: number, y: number) => {
      const maxWalls = buildingLimits["wall"] || 0;
      const currentWalls = placedCounts["wall"] || 0;
      if (currentWalls >= maxWalls && maxWalls > 0) return;

      const { valid } = checkPlacementValidity("wall", x, y, buildings);
      if (!valid) return;

      const newWall: PlacedBuilding = {
        instanceId: `wall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        buildingId: "wall",
        x,
        y,
      };
      onUpdateBuildings([...buildings, newWall]);
    },
    [buildingLimits, buildings, onUpdateBuildings, placedCounts]
  );

  // Erase any building at (x, y)
  const tryEraseAt = useCallback(
    (x: number, y: number) => {
      const target = buildings.find((b) => {
        const def = BUILDINGS_BY_ID.get(b.buildingId);
        if (!def) return false;
        return x >= b.x && x < b.x + def.width && y >= b.y && y < b.y + def.height;
      });

      if (target) {
        onUpdateBuildings(buildings.filter((b) => b.instanceId !== target.instanceId));
        if (selectedPlacedId === target.instanceId) {
          onSelectPlacedId(null);
        }
      }
    },
    [buildings, onSelectPlacedId, onUpdateBuildings, selectedPlacedId]
  );

  // Mouse Move on Grid
  const handleMouseMove = (e: React.MouseEvent) => {
    const coord = getGridCoordFromEvent(e);
    setHoverCoord(coord);

    if (!coord) return;

    // Wall brush painting mode
    if (isPaintingWalls && settings.wallBrushActive) {
      tryPaintWallAt(coord.x, coord.y);
    } else if (isErasing && settings.eraserActive) {
      tryEraseAt(coord.x, coord.y);
    }

    // Dragging state update
    if (dragState) {
      const { valid } = checkPlacementValidity(
        dragState.buildingId,
        coord.x,
        coord.y,
        buildings,
        dragState.instanceId
      );
      setDragState((prev) =>
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

  // Mouse Down on Grid
  const handleMouseDown = (e: React.MouseEvent) => {
    const coord = getGridCoordFromEvent(e);
    if (!coord) return;

    // Left click
    if (e.button === 0) {
      if (settings.eraserActive) {
        setIsErasing(true);
        tryEraseAt(coord.x, coord.y);
        return;
      }

      if (settings.wallBrushActive) {
        setIsPaintingWalls(true);
        tryPaintWallAt(coord.x, coord.y);
        return;
      }

      // If user clicked while an inventory item is selected (click-to-place)
      if (selectedDefId) {
        const def = BUILDINGS_BY_ID.get(selectedDefId);
        if (def) {
          const max = buildingLimits[def.id] || 0;
          const current = placedCounts[def.id] || 0;
          if (current < max || max === 0) {
            const { valid } = checkPlacementValidity(def.id, coord.x, coord.y, buildings);
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

      // Check if user clicked an existing building on grid
      const clicked = buildings.find((b) => {
        const def = BUILDINGS_BY_ID.get(b.buildingId);
        if (!def) return false;
        return (
          coord.x >= b.x &&
          coord.x < b.x + def.width &&
          coord.y >= b.y &&
          coord.y < b.y + def.height
        );
      });

      if (clicked) {
        onSelectPlacedId(clicked.instanceId);
      } else {
        onSelectPlacedId(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPaintingWalls(false);
    setIsErasing(false);

    if (dragState) {
      if (dragState.isValid) {
        if (dragState.type === "new") {
          const newBuilding: PlacedBuilding = {
            instanceId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            buildingId: dragState.buildingId,
            x: dragState.currentX,
            y: dragState.currentY,
          };
          onUpdateBuildings([...buildings, newBuilding]);
          onSelectPlacedId(newBuilding.instanceId);
        } else if (dragState.type === "move" && dragState.instanceId) {
          const updated = buildings.map((b) =>
            b.instanceId === dragState.instanceId
              ? { ...b, x: dragState.currentX, y: dragState.currentY }
              : b
          );
          onUpdateBuildings(updated);
        }
      }
      setDragState(null);
    }
  };

  // Drag over handler for HTML5 Drag & Drop from sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const coord = getGridCoordFromEvent(e);
    if (!coord) return;
    setHoverCoord(coord);

    if (dragState) {
      const { valid } = checkPlacementValidity(
        dragState.buildingId,
        coord.x,
        coord.y,
        buildings,
        dragState.instanceId
      );
      setDragState((prev) =>
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const coord = getGridCoordFromEvent(e);
    if (!coord) {
      setDragState(null);
      return;
    }

    const buildingId = e.dataTransfer.getData("text/plain");
    const def = BUILDINGS_BY_ID.get(buildingId);
    if (!def) {
      setDragState(null);
      return;
    }

    const max = buildingLimits[def.id] || 0;
    const current = placedCounts[def.id] || 0;
    if (current >= max && max > 0) {
      setDragState(null);
      return;
    }

    const { valid } = checkPlacementValidity(def.id, coord.x, coord.y, buildings);
    if (valid) {
      const newBuilding: PlacedBuilding = {
        instanceId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        buildingId: def.id,
        x: coord.x,
        y: coord.y,
      };
      onUpdateBuildings([...buildings, newBuilding]);
      onSelectPlacedId(newBuilding.instanceId);
    }
    setDragState(null);
  };

  // Start dragging an existing building on the grid
  const startMovingBuilding = (b: PlacedBuilding, e: React.MouseEvent) => {
    e.stopPropagation();
    const def = BUILDINGS_BY_ID.get(b.buildingId);
    if (!def) return;

    setDragState({
      type: "move",
      buildingId: b.buildingId,
      instanceId: b.instanceId,
      width: def.width,
      height: def.height,
      currentX: b.x,
      currentY: b.y,
      isValid: true,
    });
  };

  // Remove selected building
  const handleRemoveSelected = () => {
    if (!selectedPlacedId) return;
    onUpdateBuildings(buildings.filter((b) => b.instanceId !== selectedPlacedId));
    onSelectPlacedId(null);
  };

  // Center placement helper
  const selectedDef = selectedDefId ? BUILDINGS_BY_ID.get(selectedDefId) : null;

  return (
    <div className="grid-canvas-viewport">
      {/* Tactical Alerts Bar if Chain Hazards exist */}
      {settings.showChainLightning && chainAnalysis.dangerPairs.length > 0 && (
        <div className="chain-alert-banner">
          <Zap />
          <span>
            <b>Phát hiện {chainAnalysis.dangerPairs.length} vị trí có nguy cơ sét lan:</b>{" "}
            {chainAnalysis.criticalCount} cặp công trình cách ≤ 1 ô (nguy hiểm cao) và{" "}
            {chainAnalysis.warningCount} cặp cách 2 ô (E-Dragon chain). Hãy kéo giãn khoảng cách ≥ 3 ô để triệt tiêu sét lan!
          </span>
        </div>
      )}

      {/* 44x44 Grid Board Container */}
      <div
        ref={containerRef}
        className={`grid-canvas-board ${settings.wallBrushActive ? "brush-mode" : ""} ${
          settings.eraserActive ? "eraser-mode" : ""
        }`}
        style={{
          width: `${boardPixelSize}px`,
          height: `${boardPixelSize}px`,
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* SVG Tactical Overlay Layer (Grid lines, Range circles, Chain links) */}
        <svg
          className="canvas-svg-overlay"
          width={boardPixelSize}
          height={boardPixelSize}
          viewBox={`0 0 ${boardPixelSize} ${boardPixelSize}`}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern
              id="grid-tile-pattern"
              width={cellSize}
              height={cellSize}
              patternUnits="userSpaceOnUse"
            >
              <rect
                width={cellSize}
                height={cellSize}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
            </pattern>

            {/* Glowing filter for chain lightning lines */}
            <filter id="glow-electric" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Pattern */}
          {settings.showGrid && (
            <rect width={boardPixelSize} height={boardPixelSize} fill="url(#grid-tile-pattern)" />
          )}

          {/* 4-tile Center Marker Box */}
          <rect
            x={20 * cellSize}
            y={20 * cellSize}
            width={4 * cellSize}
            height={4 * cellSize}
            fill="rgba(255, 200, 87, 0.07)"
            stroke="rgba(255, 200, 87, 0.25)"
            strokeDasharray="4 2"
            strokeWidth="1.5"
          />

          {/* Tactical Range Circles */}
          {buildings.map((b) => {
            const def = BUILDINGS_BY_ID.get(b.buildingId);
            if (!def || !def.range) return null;

            const isSelected = selectedPlacedId === b.instanceId;
            const shouldShow =
              settings.showRanges === "all" ||
              (settings.showRanges === "selected" && isSelected);

            if (!shouldShow) return null;

            const centerX = (b.x + def.width / 2) * cellSize;
            const centerY = (b.y + def.height / 2) * cellSize;
            const radiusPx = def.range * cellSize;
            const minRadiusPx = def.minRange ? def.minRange * cellSize : 0;

            return (
              <g key={`range-${b.instanceId}`} className="range-circle-group">
                {/* Max Range Circle */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radiusPx}
                  fill={isSelected ? "rgba(89, 217, 237, 0.12)" : "rgba(255, 200, 87, 0.05)"}
                  stroke={isSelected ? "#59d9ed" : "rgba(255, 200, 87, 0.35)"}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? "none" : "6 4"}
                />

                {/* Dead Zone / Min Range Circle (Mortar, Eagle, etc.) */}
                {minRadiusPx > 0 && (
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={minRadiusPx}
                    fill="rgba(255, 115, 128, 0.15)"
                    stroke="#ff7380"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
              </g>
            );
          })}

          {/* Chain Lightning Hazard Warning Lines */}
          {settings.showChainLightning &&
            chainAnalysis.dangerPairs.map((pair, idx) => {
              const cx1 = (pair.b1.x + pair.b1Def.width / 2) * cellSize;
              const cy1 = (pair.b1.y + pair.b1Def.height / 2) * cellSize;
              const cx2 = (pair.b2.x + pair.b2Def.width / 2) * cellSize;
              const cy2 = (pair.b2.y + pair.b2Def.height / 2) * cellSize;

              const isCritical = pair.dangerLevel === "critical";
              const strokeColor = isCritical ? "#ff4757" : "#ffa502";

              return (
                <g key={`hazard-${idx}`} className="chain-hazard-line">
                  {/* Glowing warning line */}
                  <line
                    x1={cx1}
                    y1={cy1}
                    x2={cx2}
                    y2={cy2}
                    stroke={strokeColor}
                    strokeWidth={isCritical ? 3 : 2}
                    strokeDasharray={isCritical ? "4 3" : "6 4"}
                    filter="url(#glow-electric)"
                  />
                  {/* Distance badge at midpoint */}
                  <circle
                    cx={(cx1 + cx2) / 2}
                    cy={(cy1 + cy2) / 2}
                    r={9}
                    fill="#111d28"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x={(cx1 + cx2) / 2}
                    y={(cy1 + cy2) / 2 + 3.5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {pair.distance}ô
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Placed Buildings & Walls Layer */}
        {buildings.map((b) => {
          const def = BUILDINGS_BY_ID.get(b.buildingId);
          if (!def) return null;

          const isSelected = selectedPlacedId === b.instanceId;
          const isVulnerable =
            settings.showChainLightning && chainAnalysis.vulnerableInstanceIds.has(b.instanceId);
          const isWall = def.category === "wall";

          return (
            <div
              key={b.instanceId}
              className={`placed-building-entity ${isWall ? "is-wall" : ""} ${
                isSelected ? "is-selected" : ""
              } ${isVulnerable ? "is-vulnerable" : ""}`}
              style={{
                left: `${b.x * cellSize}px`,
                top: `${b.y * cellSize}px`,
                width: `${def.width * cellSize}px`,
                height: `${def.height * cellSize}px`,
                backgroundColor: isWall ? "#8395a7" : def.color || "#34495e",
                borderColor: isSelected
                  ? "#ffc857"
                  : isVulnerable
                  ? "#ff4757"
                  : isWall
                  ? "#576574"
                  : "rgba(0, 0, 0, 0.45)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (settings.eraserActive) {
                  tryEraseAt(b.x, b.y);
                } else {
                  onSelectPlacedId(b.instanceId);
                }
              }}
              title={`${def.name} (${b.x}, ${b.y})`}
            >
              {!isWall && (
                <>
                  <div className="placed-building-label">
                    <span className="building-title">{def.name}</span>
                    <small className="coord-badge">
                      {b.x},{b.y}
                    </small>
                  </div>
                  {/* Move Handle icon on hover */}
                  <div
                    className="building-move-handle"
                    onMouseDown={(e) => startMovingBuilding(b, e)}
                    title="Kéo để di chuyển công trình"
                  >
                    <Move />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Real-Time Collision / Placement Preview Box */}
        {((dragState && dragState.currentX >= 0) || (selectedDef && hoverCoord)) && (
          (() => {
            const previewDef = dragState
              ? BUILDINGS_BY_ID.get(dragState.buildingId)
              : selectedDef;
            if (!previewDef) return null;

            const px = (dragState ? dragState.currentX : hoverCoord?.x || 0) * cellSize;
            const py = (dragState ? dragState.currentY : hoverCoord?.y || 0) * cellSize;
            const pw = previewDef.width * cellSize;
            const ph = previewDef.height * cellSize;

            const isValid = dragState
              ? dragState.isValid
              : checkPlacementValidity(
                  previewDef.id,
                  hoverCoord?.x || 0,
                  hoverCoord?.y || 0,
                  buildings
                ).valid;

            return (
              <div
                className={`placement-preview-box ${isValid ? "valid" : "invalid"}`}
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  width: `${pw}px`,
                  height: `${ph}px`,
                }}
              >
                <div className="preview-indicator-content">
                  <strong>{isValid ? "Hợp lệ" : "Đè vị trí!"}</strong>
                  <small>
                    {previewDef.width}x{previewDef.height} ô
                  </small>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Floating Inspector Panel for Selected Building */}
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
