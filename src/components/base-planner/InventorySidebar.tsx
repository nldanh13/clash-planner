import React, { useMemo, useState } from "react";
import {
  Bomb,
  Coins,
  Crown,
  Layers,
  Plus,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trash2,
} from "lucide-react";
import { BUILDINGS_CATALOG } from "./constants";
import type { BuildingCategory, BuildingDef, PlacedBuilding } from "./types";

interface InventorySidebarProps {
  townHallLevel: number;
  buildingLimits: Record<string, number>;
  placedBuildings: PlacedBuilding[];
  selectedBuildingDefId: string | null;
  onSelectBuildingDef: (defId: string | null) => void;
  onStartDragNew: (e: React.DragEvent, defId: string) => void;
  wallBrushActive: boolean;
  onToggleWallBrush: () => void;
}

const CATEGORIES: { key: BuildingCategory | "all"; label: string; icon: React.ElementType }[] = [
  { key: "defense", label: "Phòng thủ", icon: Shield },
  { key: "resource", label: "Tài nguyên", icon: Coins },
  { key: "army", label: "Quân đội", icon: Swords },
  { key: "hero", label: "Hero", icon: Crown },
  { key: "trap", label: "Bẫy", icon: Bomb },
  { key: "wall", label: "Tường", icon: Layers },
  { key: "all", label: "Tất cả", icon: Sparkles },
];

export function InventorySidebar({
  townHallLevel,
  buildingLimits,
  placedBuildings,
  selectedBuildingDefId,
  onSelectBuildingDef,
  onStartDragNew,
  wallBrushActive,
  onToggleWallBrush,
}: InventorySidebarProps) {
  const [activeCategory, setActiveCategory] = useState<BuildingCategory | "all">("defense");
  const [searchQuery, setSearchQuery] = useState("");

  // Count placed per building type
  const placedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of placedBuildings) {
      map[b.buildingId] = (map[b.buildingId] || 0) + 1;
    }
    return map;
  }, [placedBuildings]);

  // Filter items by category, TH limit > 0, and search
  const availableItems = useMemo(() => {
    return BUILDINGS_CATALOG.filter((def) => {
      const limit = buildingLimits[def.id] || 0;
      if (limit <= 0) return false; // Not unlocked at this TH

      if (activeCategory !== "all" && def.category !== activeCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          def.name.toLowerCase().includes(q) ||
          def.category.toLowerCase().includes(q) ||
          def.id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeCategory, buildingLimits, searchQuery]);

  // Total summary counts
  const totalStats = useMemo(() => {
    let maxTotal = 0;
    let placedTotal = 0;
    for (const [id, max] of Object.entries(buildingLimits)) {
      if (id !== "wall") {
        maxTotal += max;
        placedTotal += placedCounts[id] || 0;
      }
    }
    const wallMax = buildingLimits["wall"] || 0;
    const wallPlaced = placedCounts["wall"] || 0;
    return { maxTotal, placedTotal, wallMax, wallPlaced };
  }, [buildingLimits, placedCounts]);

  return (
    <aside className="inventory-sidebar">
      {/* Search & Category Tabs */}
      <div className="inventory-header">
        <div className="inventory-search">
          <Search />
          <input
            type="text"
            placeholder="Tìm công trình, bẫy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              title="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="inventory-tabs">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                className={`inventory-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                <Icon />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Progress Pill */}
      <div className="inventory-status-bar">
        <div>
          <span>Công trình:</span>
          <strong>
            {totalStats.placedTotal} / {totalStats.maxTotal}
          </strong>
        </div>
        <div className="wall-status">
          <span>Tường:</span>
          <strong className={totalStats.wallPlaced >= totalStats.wallMax && totalStats.wallMax > 0 ? "maxed" : ""}>
            {totalStats.wallPlaced} / {totalStats.wallMax}
          </strong>
        </div>
      </div>

      {/* Special Quick Action for Wall Brush */}
      {buildingLimits["wall"] > 0 && (
        <div className="wall-brush-card">
          <div className="wall-brush-info">
            <strong>Chế độ vẽ Tường (Wall Brush)</strong>
            <small>
              Nhấn giữ và rê chuột trên bản đồ để xây hàng tường liền mạch.
            </small>
          </div>
          <button
            className={`wall-brush-toggle ${wallBrushActive ? "active" : ""}`}
            onClick={onToggleWallBrush}
          >
            <Layers />
            <span>{wallBrushActive ? "Đang bật" : "Bật cọ tường"}</span>
          </button>
        </div>
      )}

      {/* Items Grid */}
      <div className="inventory-items-grid">
        {availableItems.length === 0 ? (
          <div className="inventory-empty">
            <p>Không có công trình nào phù hợp với bộ lọc ở TH{townHallLevel}.</p>
          </div>
        ) : (
          availableItems.map((item) => {
            const placed = placedCounts[item.id] || 0;
            const max = buildingLimits[item.id] || 0;
            const remaining = max - placed;
            const isExhausted = remaining <= 0;
            const isSelected = selectedBuildingDefId === item.id;

            return (
              <div
                key={item.id}
                className={`inventory-item-card ${isSelected ? "selected" : ""} ${
                  isExhausted ? "exhausted" : ""
                }`}
                draggable={!isExhausted}
                onDragStart={(e) => onStartDragNew(e, item.id)}
                onClick={() => {
                  if (isExhausted) return;
                  if (selectedBuildingDefId === item.id) {
                    onSelectBuildingDef(null);
                  } else {
                    onSelectBuildingDef(item.id);
                  }
                }}
                title={`${item.name} (${item.width}x${item.height}) - Còn ${remaining}/${max}`}
              >
                {/* Building Visual Thumbnail */}
                <div
                  className="inventory-thumb"
                  style={{
                    backgroundColor: `${item.color}22`,
                    borderColor: `${item.color}66`,
                  }}
                >
                  <span
                    className="inventory-thumb-shape"
                    style={{
                      backgroundColor: item.color,
                      width: `${Math.min(32, item.width * 8 + 12)}px`,
                      height: `${Math.min(32, item.height * 8 + 12)}px`,
                    }}
                  >
                    <small className="size-badge">
                      {item.width}x{item.height}
                    </small>
                  </span>
                </div>

                {/* Building Details */}
                <div className="inventory-item-body">
                  <div className="item-title-row">
                    <strong>{item.name}</strong>
                    {item.range && <span className="item-range-tag">Tầm: {item.range}</span>}
                  </div>
                  <div className="item-count-row">
                    <span className="count-label">
                      Đã đặt: <b>{placed}</b>/{max}
                    </span>
                    <span className={`remaining-badge ${isExhausted ? "none" : ""}`}>
                      {isExhausted ? "Hết" : `Còn ${remaining}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
