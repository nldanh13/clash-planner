import React, { useEffect, useMemo, useState } from "react";
import {
  Bomb,
  ChevronDown,
  ChevronUp,
  Coins,
  Crown,
  Layers,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  X,
} from "lucide-react";
import { BUILDINGS_CATALOG } from "./constants";
import { DECORATIONS_CATALOG } from "./decorationCatalog";
import { getBuildingImagePath } from "./imageMapper";
import { getMaxBuildingLevel } from "./buildingLevels";
import type { BuildingCategory, PlacedBuilding, PlacedDecoration } from "./types";
import { useTranslation, type TranslationKey } from "../../i18n";

export type TrayCategory = BuildingCategory | "decoration" | "all";

interface CoCBuildingTrayProps {
  townHallLevel: number;
  buildingLimits: Record<string, number>;
  placedBuildings: PlacedBuilding[];
  selectedBuildingDefId: string | null;
  onSelectBuildingDef: (defId: string | null) => void;
  selectedDecorationDefId?: string | null;
  onSelectDecorationDefId?: (defId: string | null) => void;
  placedDecorations?: PlacedDecoration[];
  onStartDragNew?: (e: React.DragEvent, defId: string) => void;
  wallBrushActive?: boolean;
  onToggleWallBrush?: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  selectedPlacedId?: string | null;
  onDeselectPlaced?: () => void;
  onDeletePlaced?: () => void;
}

const CATEGORIES: { key: TrayCategory; labelKey: TranslationKey; icon: React.ElementType }[] = [
  { key: "defense", labelKey: "common.defense", icon: Shield },
  { key: "resource", labelKey: "common.resource", icon: Coins },
  { key: "army", labelKey: "common.troopsFull", icon: Swords },
  { key: "hero", labelKey: "common.hero", icon: Crown },
  { key: "trap", labelKey: "common.trap", icon: Bomb },
  { key: "wall", labelKey: "common.wall", icon: Layers },
  { key: "decoration", labelKey: "common.decorate", icon: Sparkles },
];

export const CoCBuildingTray: React.FC<CoCBuildingTrayProps> = ({
  townHallLevel,
  buildingLimits,
  placedBuildings,
  selectedBuildingDefId,
  onSelectBuildingDef,
  selectedDecorationDefId = null,
  onSelectDecorationDefId,
  placedDecorations = [],
  onStartDragNew,
  wallBrushActive = false,
  onToggleWallBrush,
  isZenMode,
  onToggleZenMode,
  selectedPlacedId = null,
  onDeselectPlaced,
  onDeletePlaced,
}) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<TrayCategory>("defense");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-collapse tray down when a building on the map is selected for arranging
  useEffect(() => {
    if (selectedPlacedId) {
      setIsCollapsed(true);
    }
  }, [selectedPlacedId]);

  const selectedPlacedBuilding = useMemo(() => {
    if (!selectedPlacedId) return null;
    return placedBuildings.find((b) => b.instanceId === selectedPlacedId) || null;
  }, [placedBuildings, selectedPlacedId]);

  const selectedPlacedDef = useMemo(() => {
    if (!selectedPlacedBuilding) return null;
    return BUILDINGS_CATALOG.find((b) => b.id === selectedPlacedBuilding.buildingId) || null;
  }, [selectedPlacedBuilding]);

  const selectedBuildingDef = useMemo(() => {
    if (!selectedBuildingDefId) return null;
    return BUILDINGS_CATALOG.find((b) => b.id === selectedBuildingDefId) || null;
  }, [selectedBuildingDefId]);

  const selectedDecoDef = useMemo(() => {
    if (!selectedDecorationDefId) return null;
    return DECORATIONS_CATALOG.find((d) => d.id === selectedDecorationDefId) || null;
  }, [selectedDecorationDefId]);

  // Calculate placed buildings counts
  const placedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of placedBuildings) {
      map[b.buildingId] = (map[b.buildingId] || 0) + 1;
    }
    return map;
  }, [placedBuildings]);

  // Calculate placed decorations counts
  const placedDecorationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of placedDecorations) {
      map[d.decorationId] = (map[d.decorationId] || 0) + 1;
    }
    return map;
  }, [placedDecorations]);

  // Filter available buildings for current TH
  const availableBuildings = useMemo(() => {
    if (activeCategory === "decoration") return [];

    return BUILDINGS_CATALOG.filter((def) => {
      const limit = buildingLimits[def.id] || 0;
      if (limit <= 0) return false;

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

  // Filter available decorations
  const availableDecorations = useMemo(() => {
    if (activeCategory !== "decoration" && activeCategory !== "all") return [];

    return DECORATIONS_CATALOG.filter((deco) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          deco.name.toLowerCase().includes(q) ||
          deco.id.toLowerCase().includes(q) ||
          (deco.description && deco.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  // Overall statistics
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
    <div className="absolute bottom-1.5 left-2 right-14 sm:right-16 z-30 transition-all duration-200 select-none">
      {/* Collapsed Compact Bottom Pill */}
      {isCollapsed ? (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Case 1: Arranging an existing placed building */}
          {selectedPlacedBuilding && selectedPlacedDef ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-amber-500/70 text-amber-300 font-bold text-xs shadow-2xl backdrop-blur-md animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-normal">Đang chọn:</span>
                <span className="text-amber-300 font-bold">{selectedPlacedDef.name}</span>
                {getMaxBuildingLevel(townHallLevel, selectedPlacedDef.id) && (
                  <span className="text-[10px] text-amber-400/80 font-mono bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                    Lv.{getMaxBuildingLevel(townHallLevel, selectedPlacedDef.id)}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-normal hidden md:inline">
                (Kéo hoặc bấm ô trống để dời)
              </span>

              {onDeletePlaced && (
                <button
                  type="button"
                  onClick={onDeletePlaced}
                  className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-600/60 text-rose-300 text-[11px] font-bold transition-all cursor-pointer hover:scale-105"
                  title="Xóa công trình này (Phím Delete)"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Xóa</span>
                </button>
              )}

              {onDeselectPlaced && (
                <button
                  type="button"
                  onClick={onDeselectPlaced}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
                  title="Bỏ chọn"
                >
                  <X className="w-3 h-3" />
                  <span>Xong</span>
                </button>
              )}

              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Mở rộng lại khay công trình"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Kho</span>
              </button>
            </div>
          ) : selectedBuildingDef ? (
            /* Case 2: Placing a new building from catalog */
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-emerald-500/70 text-emerald-300 font-bold text-xs shadow-2xl backdrop-blur-md animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-normal">Đang đặt:</span>
                <span className="text-emerald-300 font-bold">{selectedBuildingDef.name}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal hidden md:inline">
                (Bấm ô trống trên bản đồ để đặt)
              </span>
              <button
                type="button"
                onClick={() => onSelectBuildingDef(null)}
                className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
                title="Hủy đặt công trình"
              >
                <X className="w-3 h-3" />
                <span>Hủy</span>
              </button>
              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Mở rộng lại khay công trình"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Kho</span>
              </button>
            </div>
          ) : selectedDecoDef ? (
            /* Case 3: Placing decoration */
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-pink-500/70 text-pink-300 font-bold text-xs shadow-2xl backdrop-blur-md animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-normal">Đang trang trí:</span>
                <span className="text-pink-300 font-bold">{selectedDecoDef.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectDecorationDefId?.(null)}
                className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
                title="Hủy đặt trang trí"
              >
                <X className="w-3 h-3" />
                <span>Hủy</span>
              </button>
              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Mở rộng lại khay công trình"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Kho</span>
              </button>
            </div>
          ) : (
            /* Case 4: Default collapsed pill */
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-amber-300 font-bold text-xs shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
              title="Mở rộng khay công trình & vật trang trí"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Kho công trình ({totalStats.placedTotal}/{totalStats.maxTotal})
                {placedDecorations.length > 0 && ` · 🌸 ${placedDecorations.length}`}
              </span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      ) : (
        /* Expanded Sleek & Compact Dock */
        <div className="flex flex-col bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-2xl p-1.5 sm:p-2 gap-1 max-h-[125px] overflow-hidden">
          {/* Top Bar: Categories, Stats & Controls */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 shrink-0">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`h-[24px] flex items-center gap-1 px-2 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{t(cat.labelKey)}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Stats, Wall Brush Toggle, & Collapse Button */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {/* Placed Counts Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono">
                <span className="text-slate-400">
                  {t("basePlanner.inventory.buildingsLabel")}{" "}
                  <b className="text-amber-300">
                    {totalStats.placedTotal}/{totalStats.maxTotal}
                  </b>
                </span>
                {totalStats.wallMax > 0 && (
                  <span className="text-slate-400 border-l border-slate-800 pl-1.5">
                    {t("basePlanner.inventory.wallsLabel")}:{" "}
                    <b
                      className={
                        totalStats.wallPlaced >= totalStats.wallMax
                          ? "text-emerald-400"
                          : "text-amber-300"
                      }
                    >
                      {totalStats.wallPlaced}/{totalStats.wallMax}
                    </b>
                  </span>
                )}
              </div>

              {/* Wall Brush Toggle if Wall category is active */}
              {activeCategory === "wall" && onToggleWallBrush && (
                <button
                  type="button"
                  onClick={onToggleWallBrush}
                  className={`h-[24px] flex items-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    wallBrushActive
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                  }`}
                  title={t("basePlanner.inventory.wallBrushTitle")}
                >
                  <Layers className="w-2.5 h-2.5 text-amber-400" />
                  <span>{wallBrushActive ? "Tắt vẽ" : "Vẽ tường"}</span>
                </button>
              )}

              {/* Search Box */}
              <div className="hidden md:flex items-center gap-1 px-1.5 h-[24px] bg-slate-900 border border-slate-800 rounded-md text-xs">
                <Search className="w-2.5 h-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-14 bg-transparent outline-none text-white text-[10px] placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Minimize Tray */}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="w-[24px] h-[24px] flex items-center justify-center rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                title="Thu gọn khay (nhấn để ẩn bớt màn hình)"
                aria-label="Thu gọn khay"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Carousel of Compact Cards */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
            {/* If Decoration category is selected, render decorations */}
            {activeCategory === "decoration" ? (
              availableDecorations.length === 0 ? (
                <div className="py-2 px-4 text-center text-xs text-slate-500 w-full font-medium">
                  Không tìm thấy vật trang trí phù hợp.
                </div>
              ) : (
                availableDecorations.map((deco) => {
                  const isSelected = selectedDecorationDefId === deco.id;
                  const placedCount = placedDecorationCounts[deco.id] || 0;

                  return (
                    <div
                      key={deco.id}
                      onClick={() => {
                        onSelectBuildingDef(null);
                        const next = isSelected ? null : deco.id;
                        onSelectDecorationDefId?.(next);
                        if (next) {
                          setIsCollapsed(true);
                        }
                      }}
                      className={`shrink-0 w-[62px] sm:w-[66px] h-[64px] sm:h-[68px] flex flex-col items-center justify-between p-1 rounded-lg border transition-all select-none relative cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 border-fuchsia-400 shadow-lg ring-2 ring-fuchsia-400/40 scale-105 z-10"
                          : "bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Dimension Badge */}
                      <span className="absolute top-0.5 left-0.5 bg-black/70 text-[7.5px] font-mono px-0.5 rounded text-slate-300">
                        {deco.width}x{deco.height}
                      </span>

                      {/* Placed Count if any */}
                      {placedCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 text-[7.5px] font-bold px-1 rounded">
                          x{placedCount}
                        </span>
                      )}

                      {/* Decoration Visual Emoji / Graphic */}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 mt-1.5 flex items-center justify-center text-xl sm:text-2xl drop-shadow">
                        {deco.emoji}
                      </div>

                      {/* Name */}
                      <div className="w-full text-center">
                        <span className="text-[9px] font-bold text-slate-200 truncate block max-w-full">
                          {deco.name}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Regular Building Cards */
              availableBuildings.length === 0 ? (
                <div className="py-2 px-4 text-center text-xs text-slate-500 w-full font-medium">
                  {t("basePlanner.inventory.noneAtTH", { th: townHallLevel })}
                </div>
              ) : (
                availableBuildings.map((item) => {
                  const placed = placedCounts[item.id] || 0;
                  const max = buildingLimits[item.id] || 0;
                  const remaining = max - placed;
                  const isExhausted = remaining <= 0;
                  const isSelected = selectedBuildingDefId === item.id;
                  const maxLvl = getMaxBuildingLevel(townHallLevel, item.id);

                  return (
                    <div
                      key={item.id}
                      draggable={!isExhausted}
                      onDragStart={(e) => onStartDragNew?.(e, item.id)}
                      onClick={() => {
                        if (isExhausted) return;
                        onSelectDecorationDefId?.(null);
                        const next = isSelected ? null : item.id;
                        onSelectBuildingDef(next);
                        if (next) {
                          setIsCollapsed(true);
                        }
                      }}
                      className={`shrink-0 w-[62px] sm:w-[66px] h-[64px] sm:h-[68px] flex flex-col items-center justify-between p-1 rounded-lg border transition-all select-none relative ${
                        isExhausted
                          ? "opacity-35 bg-slate-950/40 border-slate-900 cursor-not-allowed"
                          : isSelected
                          ? "bg-slate-900 border-amber-400 shadow-lg ring-2 ring-amber-400/40 cursor-pointer scale-105 z-10"
                          : "bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700 cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      {/* Dimension Badge (Top Left) */}
                      <span className="absolute top-0.5 left-0.5 bg-black/70 text-[7.5px] font-mono px-0.5 rounded text-slate-300">
                        {item.width}x{item.height}
                      </span>

                      {/* Level Badge (Top Right) */}
                      {maxLvl && (
                        <span className="absolute top-0.5 right-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[7px] font-bold px-0.5 rounded">
                          Lv.{maxLvl}
                        </span>
                      )}

                      {/* Building Thumbnail */}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 mt-1.5 flex items-center justify-center relative overflow-hidden">
                        {getBuildingImagePath(item.id) ? (
                          <img
                            src={getBuildingImagePath(item.id)!}
                            alt={item.name}
                            className="w-full h-full object-contain drop-shadow-sm pointer-events-none"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center font-bold text-[8px] text-white"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.id.slice(0, 3)}
                          </div>
                        )}
                      </div>

                      {/* Name & Remaining Count */}
                      <div className="w-full flex items-center justify-between gap-0.5">
                        <span className="text-[8.5px] font-bold text-slate-200 truncate flex-1 text-left">
                          {item.name}
                        </span>
                        <span
                          className={`text-[8.5px] font-mono font-extrabold px-1 rounded ${
                            isExhausted
                              ? "text-slate-500 bg-slate-900"
                              : "text-emerald-400 bg-emerald-950/60 border border-emerald-500/30"
                          }`}
                        >
                          {remaining}/{max}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoCBuildingTray;
