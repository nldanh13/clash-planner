import React, { useMemo, useState } from "react";
import {
  Bomb,
  Coins,
  Crown,
  Layers,
  Search,
  Shield,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import { BUILDINGS_CATALOG } from "./constants";
import { getCachedImage, getBuildingImagePath } from "./imageMapper";
import type { BuildingCategory, PlacedBuilding } from "./types";
import { useTranslation, type TranslationKey } from "../../i18n";

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

const CATEGORIES: { key: BuildingCategory | "all"; labelKey: TranslationKey; icon: React.ElementType }[] = [
  { key: "defense", labelKey: "common.defense", icon: Shield },
  { key: "resource", labelKey: "common.resource", icon: Coins },
  { key: "army", labelKey: "common.troopsFull", icon: Swords },
  { key: "hero", labelKey: "common.hero", icon: Crown },
  { key: "trap", labelKey: "common.trap", icon: Bomb },
  { key: "wall", labelKey: "common.wall", icon: Layers },
  { key: "all", labelKey: "common.all", icon: Sparkles },
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
  const { t } = useTranslation();
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
    <div className="w-full h-full min-h-0 flex flex-col gap-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl overflow-hidden text-slate-200">
      {/* Header: Search Box */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t("basePlanner.inventory.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-white p-0.5"
              title={t("basePlanner.inventory.clearSearch")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center flex-wrap gap-1 pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "bg-slate-950/50 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{t(cat.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress & Wall Brush Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-1 text-slate-400">
          <span>{t("basePlanner.inventory.buildingsLabel")}</span>
          <strong className="text-white">
            {totalStats.placedTotal}/{totalStats.maxTotal}
          </strong>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span>{t("basePlanner.inventory.wallsLabel")}</span>
          <strong
            className={
              totalStats.wallPlaced >= totalStats.wallMax && totalStats.wallMax > 0
                ? "text-emerald-400 font-black"
                : "text-amber-300 font-bold"
            }
          >
            {totalStats.wallPlaced}/{totalStats.wallMax}
          </strong>
        </div>
      </div>

      {/* Wall Brush Mode Quick Banner */}
      {buildingLimits["wall"] > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/80 border border-cyan-500/30 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
              <Layers className="w-3 h-3" /> {t("basePlanner.inventory.wallBrushTitle")}
            </span>
            <span className="text-[9.5px] text-slate-400">{t("basePlanner.inventory.wallBrushHint")}</span>
          </div>
          <button
            onClick={onToggleWallBrush}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              wallBrushActive
                ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                : "bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-cyan-500/40"
            }`}
          >
            {wallBrushActive ? t("basePlanner.inventory.on") : t("basePlanner.inventory.off")}
          </button>
        </div>
      )}

      {/* Buildings List (Scrollable) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
        {availableItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {t("basePlanner.inventory.noneAtTH", { th: townHallLevel })}
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
                draggable={!isExhausted}
                onDragStart={(e) => onStartDragNew(e, item.id)}
                onClick={() => {
                  if (isExhausted) return;
                  onSelectBuildingDef(isSelected ? null : item.id);
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all select-none ${
                  isExhausted
                    ? "opacity-40 bg-slate-950/30 border-slate-800/50 cursor-not-allowed"
                    : isSelected
                    ? "bg-slate-800/90 border-amber-400 shadow-md ring-1 ring-amber-400/50 cursor-pointer"
                    : "bg-slate-950/60 border-slate-800/90 hover:bg-slate-800/60 hover:border-slate-700 cursor-grab active:cursor-grabbing"
                }`}
              >
                {/* Thumb Visual Box */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-inner border border-white/10 overflow-hidden relative bg-slate-900"
                >
                  {getBuildingImagePath(item.id) ? (
                    <img 
                      src={getBuildingImagePath(item.id)!} 
                      alt={item.name} 
                      className="w-full h-full object-contain scale-110 drop-shadow-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: item.color }}>
                      <span className="bg-black/40 px-1 py-0.5 rounded text-[8.5px] font-mono">
                        {item.width}x{item.height}
                      </span>
                    </div>
                  )}
                  {/* Small dimension overlay in corner if we use image */}
                  {getBuildingImagePath(item.id) && (
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 px-0.5 py-0 rounded text-[7px] font-mono text-white/80">
                      {item.width}x{item.height}
                    </span>
                  )}
                </div>

                {/* Info & Counter */}
                <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs text-white truncate">{item.name}</span>
                    {item.range && (
                      <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                        {t("basePlanner.inventory.rangeLabel", { range: item.range })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-400">
                      {t("basePlanner.inventory.placedLabel")} <b className="text-slate-200">{placed}</b>/{max}
                    </span>
                    <span
                      className={`font-bold font-mono text-[10px] px-1.5 py-0.2 rounded ${
                        isExhausted
                          ? "bg-slate-800 text-slate-500"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {isExhausted ? t("basePlanner.inventory.exhausted") : t("basePlanner.inventory.remaining", { count: remaining })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default InventorySidebar;
