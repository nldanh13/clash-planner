import React from "react";
import type { PlacedBuilding } from "./types";
import { BUILDING_METADATA_MAP } from "./catalog";
import { GRID_SIZE } from "./constants";
import { useTranslation } from "../../i18n";

interface BlueprintThumbnailProps {
  buildings: PlacedBuilding[];
  townHallLevel: number;
  className?: string;
}

export function BlueprintThumbnail({
  buildings,
  townHallLevel,
  className = "w-full h-full",
}: BlueprintThumbnailProps) {
  const { t } = useTranslation();
  return (
    <svg
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      className={`rounded-lg bg-[#06101a] border border-[#162738] shadow-inner select-none ${className}`}
      aria-label={t("basePlanner.thumbnailAria", { th: townHallLevel })}
    >
      {/* Background Subtle Grid Boundary */}
      <rect
        x="0"
        y="0"
        width={GRID_SIZE}
        height={GRID_SIZE}
        fill="#07121d"
      />
      {/* 2-tile border safety zone */}
      <rect
        x="2"
        y="2"
        width={GRID_SIZE - 4}
        height={GRID_SIZE - 4}
        fill="none"
        stroke="#0f2234"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />
      {/* Center Subtle Crosshair */}
      <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r="1.5" fill="#1b334a" />

      {/* Buildings layer */}
      {buildings.map((b, index) => {
        const meta = BUILDING_METADATA_MAP[b.buildingId];
        const w = meta ? meta.width : 1;
        const h = meta ? meta.height : 1;
        const isWall = b.buildingId === "wall";
        const isTownHall = b.buildingId === "town-hall";
        const isTrap = meta?.category === "trap";

        if (isWall) {
          return (
            <rect
              key={b.instanceId || `wall-${index}`}
              x={b.x}
              y={b.y}
              width={1}
              height={1}
              fill="#94a3b8"
              stroke="#64748b"
              strokeWidth="0.15"
            />
          );
        }

        if (isTrap) {
          return (
            <circle
              key={b.instanceId || `trap-${index}`}
              cx={b.x + w / 2}
              cy={b.y + h / 2}
              r={Math.min(w, h) * 0.4}
              fill="#cbd5e1"
              opacity="0.8"
            />
          );
        }

        if (isTownHall) {
          return (
            <g key={b.instanceId || `th-${index}`}>
              <rect
                x={b.x}
                y={b.y}
                width={w}
                height={h}
                rx="0.5"
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth="0.3"
              />
              <circle
                cx={b.x + w / 2}
                cy={b.y + h / 2}
                r="1"
                fill="#ffffff"
                opacity="0.9"
              />
            </g>
          );
        }

        // Color coding by building category / importance
        let fill = "#38bdf8"; // Standard defense cyan
        let stroke = "#0284c7";

        if (
          b.buildingId === "eagle-artillery" ||
          b.buildingId === "monolith" ||
          b.buildingId === "inferno-tower" ||
          b.buildingId === "spell-tower" ||
          b.buildingId === "scattershot"
        ) {
          fill = "#ef4444"; // Heavy defense ruby/red
          stroke = "#b91c1c";
        } else if (meta?.category === "resource") {
          fill = b.buildingId.includes("dark") ? "#059669" : "#10b981"; // Emerald
          stroke = "#047857";
        } else if (meta?.category === "army") {
          fill = "#a855f7"; // Purple
          stroke = "#7e22ce";
        } else if (meta?.category === "hero" || b.buildingId === "hero-hall") {
          fill = "#ec4899"; // Pink
          stroke = "#be185d";
        } else if (b.buildingId === "clan-castle") {
          fill = "#3b82f6"; // Royal Blue
          stroke = "#1d4ed8";
        }

        return (
          <rect
            key={b.instanceId || `b-${index}`}
            x={b.x}
            y={b.y}
            width={w}
            height={h}
            rx="0.3"
            fill={fill}
            stroke={stroke}
            strokeWidth="0.2"
          />
        );
      })}
    </svg>
  );
}
