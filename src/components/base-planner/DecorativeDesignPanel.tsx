import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Sparkles,
  Stamp,
  Trash2,
  Wand2,
} from "lucide-react";
import { GRID_SIZE } from "./constants";
import { getTownHallCatalog } from "./catalog";
import { computeDeploymentMasks, readCell } from "./deploymentZones";
import { DECORATIONS_CATALOG } from "./decorationCatalog";
import { suggestDecorationPlacements } from "./decorationUtils";
import { autoArrangeRemainingBuildings } from "./generator/decorativeAutoArrange";
import {
  GLYPH_CHARS,
  SHAPE_PRESETS,
  getGlyphSize,
  getGlyphWallCoords,
  getPresetShapeWallCoords,
  type GlyphChar,
} from "./generator/glyphShapes";
import type { AestheticPattern } from "./generator/types";
import type { PlacedBuilding, PlacedDecoration } from "./types";
import { useTranslation } from "../../i18n";

const SHAPE_LABEL_KEYS: Record<AestheticPattern, "symmetricAxial" | "diamond" | "shield" | "heart" | "spiral" | "crest" | "letter" | "radial"> = {
  "symmetric-axial": "symmetricAxial",
  diamond: "diamond",
  shield: "shield",
  heart: "heart",
  spiral: "spiral",
  crest: "crest",
  letter: "letter",
  radial: "radial",
};

interface DecorativeDesignPanelProps {
  buildings: PlacedBuilding[];
  decorations: PlacedDecoration[];
  townHallLevel: number;
  buildingLimits: Record<string, number>;
  onUpdateBuildings: (buildings: PlacedBuilding[]) => void;
  onUpdateDecorations: (decorations: PlacedDecoration[]) => void;
  selectedDecorationDefId: string | null;
  onSelectDecorationDefId: (id: string | null) => void;
  onStampPreviewChange: (coords: { x: number; y: number }[] | null) => void;
  showToast: (msg: string) => void;
  onClose?: () => void;
}

type ShapeChoice = { kind: "letter"; char: GlyphChar } | { kind: "preset"; pattern: AestheticPattern };

export function DecorativeDesignPanel({
  buildings,
  decorations,
  townHallLevel,
  buildingLimits,
  onUpdateBuildings,
  onUpdateDecorations,
  selectedDecorationDefId,
  onSelectDecorationDefId,
  onStampPreviewChange,
  showToast,
}: DecorativeDesignPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"shape" | "arrange" | "decorate">("shape");

  // --- Tab 1: Shape Stamp -----------------------------------------------
  const [shapeChoice, setShapeChoice] = useState<ShapeChoice | null>(null);
  const [scale, setScale] = useState(2);
  const [origin, setOrigin] = useState({ x: 17, y: 15 });

  const shapeCoords = useMemo(() => {
    if (!shapeChoice) return [];
    if (shapeChoice.kind === "letter") {
      return getGlyphWallCoords(shapeChoice.char, origin.x, origin.y, scale);
    }
    return getPresetShapeWallCoords(shapeChoice.pattern, origin.x, origin.y);
  }, [shapeChoice, origin, scale]);

  useEffect(() => {
    onStampPreviewChange(activeTab === "shape" && shapeCoords.length > 0 ? shapeCoords : null);
    return () => onStampPreviewChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, shapeCoords]);

  const selectLetter = (char: GlyphChar) => {
    const size = getGlyphSize(scale);
    setShapeChoice({ kind: "letter", char });
    setOrigin({ x: Math.max(0, Math.round((GRID_SIZE - size.width) / 2)), y: Math.max(0, Math.round((GRID_SIZE - size.height) / 2)) });
  };

  const selectPreset = (pattern: AestheticPattern) => {
    setShapeChoice({ kind: "preset", pattern });
    setOrigin({ x: 22, y: 22 });
  };

  const nudge = (dx: number, dy: number) => setOrigin((o) => ({ x: o.x + dx, y: o.y + dy }));

  const handleCommitShape = () => {
    if (shapeCoords.length === 0) return;
    const { occupancyMask } = computeDeploymentMasks(buildings);
    const maxWalls = buildingLimits["wall"] || 0;
    const currentWalls = buildings.filter((b) => b.buildingId === "wall").length;
    const availableSlots = maxWalls > 0 ? Math.max(0, maxWalls - currentWalls) : Infinity;

    const seen = new Set<string>();
    const newWalls: PlacedBuilding[] = [];
    let skippedCollision = 0;
    let skippedOutOfBounds = 0;

    for (const c of shapeCoords) {
      if (newWalls.length >= availableSlots) break;
      if (c.x < 0 || c.y < 0 || c.x >= GRID_SIZE || c.y >= GRID_SIZE) {
        skippedOutOfBounds++;
        continue;
      }
      const key = `${c.x},${c.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (readCell(occupancyMask, c.x, c.y)) {
        skippedCollision++;
        continue;
      }
      newWalls.push({
        instanceId: `wall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${newWalls.length}`,
        buildingId: "wall",
        x: c.x,
        y: c.y,
      });
    }

    if (newWalls.length === 0) {
      showToast(t("basePlanner.decorate.shapeTab.noSpaceToast"));
      return;
    }

    onUpdateBuildings([...buildings, ...newWalls]);
    onStampPreviewChange(null);
    setShapeChoice(null);

    const parts = [t("basePlanner.decorate.shapeTab.placedToast", { count: newWalls.length })];
    if (skippedCollision > 0) parts.push(t("basePlanner.decorate.shapeTab.skippedCollisionToast", { count: skippedCollision }));
    if (skippedOutOfBounds > 0) parts.push(t("basePlanner.decorate.shapeTab.skippedOutOfBoundsToast", { count: skippedOutOfBounds }));
    if (Number.isFinite(availableSlots) && newWalls.length >= availableSlots) {
      parts.push(t("basePlanner.decorate.shapeTab.limitReachedToast", { th: townHallLevel }));
    }
    showToast(parts.join(" "));
  };

  // --- Tab 2: Auto-Arrange ------------------------------------------------
  const missingCount = useMemo(() => {
    const entries = getTownHallCatalog(townHallLevel).filter((e) => e.requiredInLayout && e.category !== "wall");
    const counts: Record<string, number> = {};
    for (const b of buildings) counts[b.buildingId] = (counts[b.buildingId] || 0) + 1;
    let missing = 0;
    for (const e of entries) missing += Math.max(0, e.count - (counts[e.buildingId] || 0));
    return missing;
  }, [buildings, townHallLevel]);

  const handleAutoArrange = () => {
    const result = autoArrangeRemainingBuildings(buildings, townHallLevel);
    if (result.placedCount === 0 && result.skippedCount === 0) {
      showToast(t("basePlanner.decorate.arrangeTab.nothingMissingToast"));
      return;
    }
    onUpdateBuildings(result.buildings);
    const parts = [t("basePlanner.decorate.arrangeTab.placedToast", { count: result.placedCount })];
    parts.push(...result.warnings);
    showToast(parts.join(" "));
  };

  // --- Tab 3: Decorations --------------------------------------------------
  const [suggestionPreview, setSuggestionPreview] = useState<PlacedDecoration[] | null>(null);

  useEffect(() => {
    if (activeTab !== "decorate" || !suggestionPreview) return;
    onStampPreviewChange(suggestionPreview.flatMap((s) => {
      const def = DECORATIONS_CATALOG.find((d) => d.id === s.decorationId);
      if (!def) return [{ x: s.x, y: s.y }];
      const cells: { x: number; y: number }[] = [];
      for (let r = 0; r < def.height; r++) for (let c = 0; c < def.width; c++) cells.push({ x: s.x + c, y: s.y + r });
      return cells;
    }));
    return () => onStampPreviewChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, suggestionPreview]);

  const handleSuggestDecorations = () => {
    if (buildings.length === 0) {
      showToast(t("basePlanner.decorate.decorateTab.noBuildingsToast"));
      return;
    }
    const { occupancyMask } = computeDeploymentMasks(buildings);
    const suggestions = suggestDecorationPlacements(buildings, decorations, occupancyMask);
    if (suggestions.length === 0) {
      showToast(t("basePlanner.decorate.decorateTab.noSpaceToast"));
      setSuggestionPreview(null);
      return;
    }
    setSuggestionPreview(suggestions);
  };

  const handleApplySuggestions = () => {
    if (!suggestionPreview) return;
    onUpdateDecorations([...decorations, ...suggestionPreview]);
    showToast(t("basePlanner.decorate.decorateTab.appliedToast", { count: suggestionPreview.length }));
    setSuggestionPreview(null);
    onStampPreviewChange(null);
  };

  const handleClearAllDecorations = () => {
    if (decorations.length === 0) return;
    if (window.confirm(t("basePlanner.decorate.decorateTab.clearAllConfirm", { count: decorations.length }))) {
      onUpdateDecorations([]);
      showToast(t("basePlanner.decorate.decorateTab.clearedToast"));
    }
  };

  const tabButtonClass = (tab: typeof activeTab) =>
    `flex-1 min-h-[38px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
      activeTab === tab
        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
        : "text-slate-400 hover:text-slate-200 border border-transparent"
    }`;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl overflow-hidden text-slate-200">
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl shrink-0">
        <button className={tabButtonClass("shape")} onClick={() => setActiveTab("shape")}>
          <Stamp className="w-3.5 h-3.5" />
          <span>{t("basePlanner.decorate.tabs.shape")}</span>
        </button>
        <button className={tabButtonClass("arrange")} onClick={() => setActiveTab("arrange")}>
          <Wand2 className="w-3.5 h-3.5" />
          <span>{t("basePlanner.decorate.tabs.arrange")}</span>
        </button>
        <button className={tabButtonClass("decorate")} onClick={() => setActiveTab("decorate")}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t("basePlanner.decorate.tabs.decorate")}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3">
        {activeTab === "shape" && (
          <>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {t("basePlanner.decorate.shapeTab.intro")}
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{t("basePlanner.decorate.shapeTab.lettersLabel")}</span>
              <div className="grid grid-cols-6 gap-1">
                {GLYPH_CHARS.map((c) => (
                  <button
                    key={c}
                    onClick={() => selectLetter(c)}
                    className={`aspect-square rounded-lg text-xs font-black flex items-center justify-center border transition-colors cursor-pointer ${
                      shapeChoice?.kind === "letter" && shapeChoice.char === c
                        ? "bg-amber-500 text-slate-950 border-amber-300"
                        : "bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{t("basePlanner.decorate.shapeTab.presetsLabel")}</span>
              <div className="grid grid-cols-2 gap-1.5">
                {SHAPE_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => selectPreset(p)}
                    className={`px-2 py-2 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer text-left ${
                      shapeChoice?.kind === "preset" && shapeChoice.pattern === p
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {t(`basePlanner.decorate.shapeLabels.${SHAPE_LABEL_KEYS[p]}` as const)}
                  </button>
                ))}
              </div>
            </div>

            {shapeChoice && (
              <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-slate-400 font-semibold">{t("basePlanner.decorate.shapeTab.positionLabel")}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({origin.x}, {origin.y})
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className="grid grid-cols-3 gap-1">
                    <span />
                    <button onClick={() => nudge(0, -1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span />
                    <button onClick={() => nudge(-1, 0)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span />
                    <button onClick={() => nudge(1, 0)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span />
                    <button onClick={() => nudge(0, 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <span />
                  </div>
                </div>

                {shapeChoice.kind === "letter" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-slate-400 font-semibold shrink-0">{t("basePlanner.decorate.shapeTab.sizeLabel")}</span>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={1}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{scale}x</span>
                  </div>
                )}

                <button
                  onClick={handleCommitShape}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  <Stamp className="w-3.5 h-3.5" />
                  {t("basePlanner.decorate.shapeTab.commitButton")}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "arrange" && (
          <>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {t("basePlanner.decorate.arrangeTab.intro")}
            </p>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">{t("basePlanner.decorate.arrangeTab.missingLabel")}</span>
              <span className={`text-lg font-black font-mono ${missingCount > 0 ? "text-amber-300" : "text-emerald-400"}`}>
                {missingCount}
              </span>
            </div>
            <button
              onClick={handleAutoArrange}
              disabled={missingCount === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {t("basePlanner.decorate.arrangeTab.actionButton")}
            </button>
          </>
        )}

        {activeTab === "decorate" && (
          <>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {t("basePlanner.decorate.decorateTab.intro")}
            </p>

            <div className="grid grid-cols-4 gap-1.5">
              {DECORATIONS_CATALOG.map((def) => (
                <button
                  key={def.id}
                  onClick={() => onSelectDecorationDefId(selectedDecorationDefId === def.id ? null : def.id)}
                  title={def.name}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 border transition-colors cursor-pointer ${
                    selectedDecorationDefId === def.id
                      ? "bg-amber-500/20 border-amber-500/50"
                      : "bg-slate-800/70 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <span className="text-base leading-none">{def.emoji}</span>
                  <span className="text-[8px] text-slate-400 leading-none truncate max-w-full px-0.5">{def.name}</span>
                </button>
              ))}
            </div>

            {selectedDecorationDefId && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-950/30 border border-sky-500/30 text-[10.5px] text-sky-300">
                <Stamp className="w-3.5 h-3.5 shrink-0" />
                <span>{t("basePlanner.decorate.decorateTab.selectedHint")}</span>
              </div>
            )}

            <div className="h-px bg-slate-800" />

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSuggestDecorations}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t("basePlanner.decorate.decorateTab.suggestButton")}
              </button>

              {suggestionPreview && (
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10.5px] text-slate-300">
                    {t("basePlanner.decorate.decorateTab.foundPrefix")} <b className="text-sky-300">{suggestionPreview.length}</b> {t("basePlanner.decorate.decorateTab.foundSuffix")}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleApplySuggestions}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      {t("basePlanner.decorate.decorateTab.applyAll")}
                    </button>
                    <button
                      onClick={() => {
                        setSuggestionPreview(null);
                        onStampPreviewChange(null);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      {t("basePlanner.decorate.decorateTab.cancel")}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10.5px] text-slate-400 px-1">
                <span>{t("basePlanner.decorate.decorateTab.placedCountLabel", { count: decorations.length })}</span>
                {decorations.length > 0 && (
                  <button
                    onClick={handleClearAllDecorations}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("basePlanner.decorate.decorateTab.clearAll")}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DecorativeDesignPanel;
