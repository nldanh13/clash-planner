import React, { useRef } from "react";
import {
  Box,
  Crosshair,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  Grid3x3,
  ImageIcon,
  Layers,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  ChainLightningMode,
  DefenseScoreResult,
  DeploymentDisplayMode,
  PlannerMode,
  PlannerViewMode,
  RangeDisplayMode,
  TacticalSettings,
} from "./types";
import { useTranslation } from "../../i18n";

interface TacticalToolbarProps {
  townHallLevel?: number;
  onTownHallChange?: (th: number) => void;
  settings: TacticalSettings;
  onUpdateSettings: (updater: (prev: TacticalSettings) => TacticalSettings) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onLoadPreset?: () => void;
  onOpenAutoGenerator?: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chainIssuesCount: number;
  zoomLevel: number;
  zoomMode?: "fit" | "manual";
  onZoomChange: (zoom: number, mode?: "fit" | "manual") => void;
  placedCount: number;
  defenseScore: DefenseScoreResult | null;
  activeLayoutName?: string;
  onOpenLayoutManager?: () => void;
  autoSaveTime?: string | null;
  onFitMap: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  viewMode?: PlannerViewMode;
  onViewModeChange?: (mode: PlannerViewMode) => void;
}

const TacticalToolbar: React.FC<TacticalToolbarProps> = ({
  settings,
  onUpdateSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  zoomLevel,
  zoomMode = "fit",
  onZoomChange,
  placedCount,
  onFitMap,
  isFullscreen = false,
  onToggleFullscreen,
  isSidebarCollapsed = false,
  onToggleSidebar,
  viewMode = "2d",
  onViewModeChange,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEPLOYMENT_MODE_LABELS: Record<DeploymentDisplayMode, string> = {
    off: t("basePlanner.toolbar.deploymentModeLabels.off"),
    blocked: t("basePlanner.toolbar.deploymentModeLabels.blocked"),
    holes: t("basePlanner.toolbar.deploymentModeLabels.holes"),
    all: t("basePlanner.toolbar.deploymentModeLabels.all"),
  };

  const RANGE_MODE_LABELS: Record<RangeDisplayMode & ChainLightningMode, string> = {
    none: t("basePlanner.toolbar.rangeModeLabels.none"),
    selected: t("basePlanner.toolbar.rangeModeLabels.selected"),
    all: t("basePlanner.toolbar.rangeModeLabels.all"),
  };
  const CHAIN_MODE_LABELS = RANGE_MODE_LABELS;

  const setMode = (mode: PlannerMode) => {
    onUpdateSettings((s) => ({ ...s, plannerMode: mode }));
  };

  const cycleRangeMode = () => {
    onUpdateSettings((s) => {
      const modes: RangeDisplayMode[] = ["none", "selected", "all"];
      const next = modes[(modes.indexOf(s.showRanges) + 1) % modes.length];
      return { ...s, showRanges: next };
    });
  };

  const cycleChainMode = () => {
    onUpdateSettings((s) => {
      const modes: ChainLightningMode[] = ["none", "selected", "all"];
      const next = modes[(modes.indexOf(s.showChainLightning) + 1) % modes.length];
      return { ...s, showChainLightning: next };
    });
  };

  const cycleDeploymentMode = () => {
    onUpdateSettings((s) => {
      const modes: DeploymentDisplayMode[] = ["off", "blocked", "holes", "all"];
      const next = modes[(modes.indexOf(s.deploymentDisplayMode) + 1) % modes.length];
      return { ...s, deploymentDisplayMode: next };
    });
  };

  return (
    <div className="sticky top-0 z-20 w-full max-w-full min-w-0 pb-1.5 pt-0.5 select-none bg-[#08121bed]/95 backdrop-blur-md">
      <div className="no-scrollbar flex items-center justify-between gap-2 p-1.5 bg-[#0a151f] border border-slate-800 rounded-xl shadow-md w-full max-w-full min-w-0 overflow-x-auto">
        
        {/* Left Section: Modes & Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* 1. Mode Segmented Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg shrink-0">
            <button
              onClick={() => setMode("design")}
              className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                settings.plannerMode === "design"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={t("basePlanner.toolbar.design")}
              aria-label={t("basePlanner.toolbar.modeDesignAria")}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t("basePlanner.toolbar.design")}</span>
            </button>
            <button
              onClick={() => setMode("analysis")}
              className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                settings.plannerMode === "analysis"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={t("basePlanner.toolbar.analysis")}
              aria-label={t("basePlanner.toolbar.modeAnalysisAria")}
            >
              <ScanSearch className="w-3.5 h-3.5" />
              <span>{t("basePlanner.toolbar.analysis")}</span>
            </button>
            <button
              onClick={() => setMode("decorate")}
              className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                settings.plannerMode === "decorate"
                  ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={t("basePlanner.toolbar.decorate")}
              aria-label={t("basePlanner.toolbar.modeDecorateAria")}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("basePlanner.toolbar.decorate")}</span>
            </button>
          </div>

          <div className="w-px h-5 bg-slate-800 shrink-0 mx-0.5" />

          {/* 2. Contextual Toolset according to Active Mode */}
          {settings.plannerMode === "design" && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Wall Brush Toggle */}
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    wallBrushActive: !s.wallBrushActive,
                    eraserActive: false,
                  }))
                }
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.wallBrushActive
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.wallBrushTitle")}
                aria-label={settings.wallBrushActive ? t("basePlanner.toolbar.wallBrushOff") : t("basePlanner.toolbar.wallBrushOn")}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{t("basePlanner.toolbar.wallBrushLabel")}</span>
              </button>

              {/* Eraser Toggle */}
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    eraserActive: !s.eraserActive,
                    wallBrushActive: false,
                  }))
                }
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.eraserActive
                    ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.eraseTitleDesign")}
                aria-label={settings.eraserActive ? t("basePlanner.toolbar.eraseOff") : t("basePlanner.toolbar.eraseOn")}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{t("basePlanner.toolbar.erase")}</span>
              </button>

              {/* Undo / Redo Joined Pair */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title={`${t("basePlanner.toolbar.undo")} (Ctrl+Z)`}
                  aria-label={t("basePlanner.toolbar.undo")}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-800" />
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title={`${t("basePlanner.toolbar.redo")} (Ctrl+Y)`}
                  aria-label={t("basePlanner.toolbar.redo")}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Clear Map */}
              <button
                onClick={onClear}
                disabled={placedCount === 0}
                className="w-[32px] h-[32px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-700/50 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title={t("basePlanner.toolbar.clearMapTitle")}
                aria-label={t("basePlanner.toolbar.clearMapLabel")}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {settings.plannerMode === "analysis" && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Defense Range Cycle */}
              <button
                onClick={cycleRangeMode}
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.showRanges !== "none"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.rangeTitle")}
                aria-label={t("basePlanner.toolbar.rangeTitle")}
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{t("basePlanner.toolbar.rangeLabel")}:</span>
                <span className="font-semibold">{RANGE_MODE_LABELS[settings.showRanges]}</span>
              </button>

              {/* Chain Lightning Cycle */}
              <button
                onClick={cycleChainMode}
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.showChainLightning !== "none"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.chainTitle")}
                aria-label={t("basePlanner.toolbar.chainTitle")}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t("basePlanner.toolbar.chainLabel")}:</span>
                <span className="font-semibold">{CHAIN_MODE_LABELS[settings.showChainLightning]}</span>
              </button>

              {/* Deployment Zone Cycle */}
              <button
                onClick={cycleDeploymentMode}
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.deploymentDisplayMode !== "off"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.deploymentTitle")}
                aria-label={t("basePlanner.toolbar.deploymentTitle")}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{t("basePlanner.toolbar.deploymentLabel")}:</span>
                <span className="font-semibold">{DEPLOYMENT_MODE_LABELS[settings.deploymentDisplayMode]}</span>
              </button>

              {/* Firepower Heatmap Toggle */}
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    showHeatmap: !s.showHeatmap,
                  }))
                }
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.showHeatmap
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.heatmapTitle")}
                aria-label={t("basePlanner.toolbar.heatmapTitle")}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>{t("basePlanner.toolbar.heatmap")}</span>
              </button>
            </div>
          )}

          {settings.plannerMode === "decorate" && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    eraserActive: !s.eraserActive,
                    wallBrushActive: false,
                  }))
                }
                className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  settings.eraserActive
                    ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
                title={t("basePlanner.toolbar.eraseTitleDecorate")}
                aria-label={settings.eraserActive ? t("basePlanner.toolbar.eraseOff") : t("basePlanner.toolbar.eraseOn")}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{t("basePlanner.toolbar.erase")}</span>
              </button>

              {/* Undo / Redo Joined Pair */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title={`${t("basePlanner.toolbar.undo")} (Ctrl+Z)`}
                  aria-label={t("basePlanner.toolbar.undo")}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-800" />
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title={`${t("basePlanner.toolbar.redo")} (Ctrl+Y)`}
                  aria-label={t("basePlanner.toolbar.redo")}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="w-px h-5 bg-slate-800 shrink-0 mx-0.5" />

          {/* 3. Display Overlays: Names & Levels */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingNames: !s.showBuildingNames }))}
              className={`h-[28px] flex items-center gap-1 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                settings.showBuildingNames
                  ? "bg-slate-800 text-slate-100 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={t("basePlanner.toolbar.showNamesTitle")}
              aria-label={settings.showBuildingNames ? t("basePlanner.toolbar.showNamesOn") : t("basePlanner.toolbar.showNamesOff")}
            >
              {settings.showBuildingNames ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{t("basePlanner.toolbar.namesLabel")}</span>
            </button>
            <div className="w-px h-3.5 bg-slate-800" />
            <button
              onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingLevels: !s.showBuildingLevels }))}
              className={`h-[28px] flex items-center gap-1 px-2 rounded text-xs font-medium transition-all cursor-pointer ${
                settings.showBuildingLevels
                  ? "bg-slate-800 text-slate-100 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={t("basePlanner.toolbar.showLevelsTitle")}
              aria-label={settings.showBuildingLevels ? t("basePlanner.toolbar.showLevelsOn") : t("basePlanner.toolbar.showLevelsOff")}
            >
              {settings.showBuildingLevels ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{t("basePlanner.toolbar.levelsLabel")}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Viewport, Zoom, Fullscreen, & File Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          
          {/* Sidebar Drawer Toggle */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSidebarCollapsed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              }`}
              title={isSidebarCollapsed ? t("basePlanner.toolbar.expandSidebarTitle") : t("basePlanner.toolbar.collapseSidebarTitle")}
              aria-label={isSidebarCollapsed ? t("basePlanner.toolbar.expandSidebarAria") : t("basePlanner.toolbar.collapseSidebarAria")}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isSidebarCollapsed ? t("basePlanner.toolbar.openSidebarLabel") : t("basePlanner.toolbar.collapseSidebarLabel")}</span>
            </button>
          )}

          {/* 2D / Isometric Switcher */}
          {onViewModeChange && (
            <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => onViewModeChange("2d")}
                className={`h-[28px] flex items-center gap-1 px-2 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  viewMode === "2d" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
                title={t("basePlanner.toolbar.view2DTitle")}
                aria-label={t("basePlanner.toolbar.view2DAria")}
              >
                <Grid3x3 className="w-3 h-3 text-cyan-400" />
                <span>2D</span>
              </button>
              <button
                onClick={() => onViewModeChange("isometric")}
                className={`h-[28px] flex items-center gap-1 px-2 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  viewMode === "isometric" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-slate-200"
                }`}
                title={t("basePlanner.toolbar.viewIsoTitle")}
                aria-label={t("basePlanner.toolbar.viewIsoAria")}
              >
                <Box className="w-3 h-3" />
                <span>3D</span>
              </button>
            </div>
          )}

          {/* Zoom Controls (2D only) */}
          {viewMode === "2d" && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => onZoomChange(Math.max(0.35, Number((zoomLevel - 0.1).toFixed(2))), "manual")}
                className="w-[28px] h-[28px] flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title={t("basePlanner.toolbar.zoomOutTitle")}
                aria-label={t("basePlanner.toolbar.zoomOutAria")}
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  if (Math.abs(zoomLevel - 1.0) < 0.05) {
                    onFitMap();
                  } else {
                    onZoomChange(1.0, "manual");
                  }
                }}
                className={`px-1.5 h-[28px] flex items-center justify-center rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  zoomMode === "fit" ? "text-cyan-300" : "text-slate-300 hover:text-white"
                }`}
                title={t("basePlanner.toolbar.zoomToggleTitle")}
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => onZoomChange(Math.min(1.8, Number((zoomLevel + 0.1).toFixed(2))), "manual")}
                className="w-[28px] h-[28px] flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title={t("basePlanner.toolbar.zoomInTitle")}
                aria-label={t("basePlanner.toolbar.zoomInAria")}
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`w-[32px] h-[32px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                isFullscreen
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                  : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
              }`}
              title={isFullscreen ? t("basePlanner.toolbar.exitFullscreenTitle") : t("basePlanner.toolbar.enterFullscreenTitle")}
              aria-label={isFullscreen ? t("basePlanner.toolbar.exitFullscreenAria") : t("basePlanner.toolbar.enterFullscreenAria")}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          )}

          <div className="w-px h-5 bg-slate-800 shrink-0 mx-0.5" />

          {/* File Operations: Import, Export JSON & Export PNG */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onImportJSON}
              accept=".json,application/json"
              className="hidden"
              aria-label={t("basePlanner.toolbar.importJsonAria")}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={t("basePlanner.toolbar.importJsonTitle")}
              aria-label={t("basePlanner.toolbar.importJsonAria")}
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExportJSON}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={t("basePlanner.toolbar.exportJsonTitle")}
              aria-label={t("basePlanner.toolbar.exportJsonAria")}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExportPNG}
              className="h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title={t("basePlanner.toolbar.exportPngTitle")}
              aria-label={t("basePlanner.toolbar.exportPngAria")}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{t("basePlanner.toolbar.exportPngLabel")}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TacticalToolbar;
