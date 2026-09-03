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
  ShieldOff,
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

const DEPLOYMENT_MODE_LABELS: Record<DeploymentDisplayMode, string> = {
  off: "Tắt",
  blocked: "Vùng cấm",
  holes: "Lỗ nguy hiểm",
  all: "Tất cả",
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="sticky top-0 z-20 flex flex-col gap-1.5 w-full max-w-full min-w-0 pb-2 pt-0.5 select-none bg-[#08121bed]/95 backdrop-blur-md">
      {/* Hàng 1: Chế độ, Công cụ chỉnh sửa (Thiết kế / Phân tích) & Nhãn hiển thị */}
      <div className="no-scrollbar flex items-center gap-1.5 p-1 bg-[#0a151f] border border-slate-800 rounded-xl shadow-sm w-full max-w-full min-w-0 overflow-x-auto sm:justify-between sm:flex-wrap">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg shrink-0">
          <button
            onClick={() => setMode("design")}
            className={`min-h-[34px] flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              settings.plannerMode === "design"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Chế độ Thiết kế"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Thiết kế</span>
          </button>
          <button
            onClick={() => setMode("analysis")}
            className={`min-h-[34px] flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              settings.plannerMode === "analysis"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Chế độ Phân tích"
          >
            <ScanSearch className="w-3.5 h-3.5" />
            <span>Phân tích</span>
          </button>
          <button
            onClick={() => setMode("decorate")}
            className={`min-h-[34px] flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              settings.plannerMode === "decorate"
                ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Chế độ Trang trí"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trang trí</span>
          </button>
        </div>

        {/* Tools Section */}
        <div className="flex items-center gap-1.5 shrink-0 sm:flex-wrap">
          {settings.plannerMode === "decorate" ? (
            <>
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    eraserActive: !s.eraserActive,
                    wallBrushActive: false,
                  }))
                }
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.eraserActive
                    ? "bg-rose-600 text-white font-black shadow-md"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Chế độ Tẩy công trình/tường/trang trí khi chạm"
                aria-label={settings.eraserActive ? "Tắt chế độ tẩy" : "Bật chế độ tẩy"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tẩy</span>
              </button>

              <div className="w-px h-5 bg-slate-800 hidden sm:block mx-0.5" />

              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Hoàn tác"
                aria-label="Hoàn tác"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Làm lại"
                aria-label="Làm lại"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : settings.plannerMode === "design" ? (
            <>
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    wallBrushActive: !s.wallBrushActive,
                    eraserActive: false,
                  }))
                }
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.wallBrushActive
                    ? "bg-cyan-500 text-slate-950 font-black shadow-md"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Bật cọ vẽ tường liên tục"
                aria-label={settings.wallBrushActive ? "Tắt cọ vẽ tường" : "Bật cọ vẽ tường"}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vẽ Tường</span>
              </button>

              <button
                onClick={() =>
                  onUpdateSettings((s) => ({
                    ...s,
                    eraserActive: !s.eraserActive,
                    wallBrushActive: false,
                  }))
                }
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.eraserActive
                    ? "bg-rose-600 text-white font-black shadow-md"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Chế độ Tẩy công trình/tường khi chạm"
                aria-label={settings.eraserActive ? "Tắt chế độ tẩy" : "Bật chế độ tẩy"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tẩy</span>
              </button>

              <div className="w-px h-5 bg-slate-800 hidden sm:block mx-0.5" />

              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Hoàn tác"
                aria-label="Hoàn tác"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Làm lại"
                aria-label="Làm lại"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClear}
                disabled={placedCount === 0}
                className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Dọn sạch toàn bộ công trình trên bản đồ"
                aria-label="Dọn sạch bản đồ"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onUpdateSettings((s) => ({ ...s, showHeatmap: !s.showHeatmap }))}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.showHeatmap
                    ? "bg-orange-500/25 text-orange-400 border border-orange-500/50 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Bật/tắt bản đồ nhiệt hỏa lực"
                aria-label="Mật độ hỏa lực Heatmap"
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Heatmap</span>
              </button>

              <button
                onClick={() => onUpdateSettings((s) => ({ ...s, showDefenseScore: !s.showDefenseScore }))}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.showDefenseScore
                    ? "bg-fuchsia-500/25 text-fuchsia-400 border border-fuchsia-500/50 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Bật/tắt bảng điểm phòng thủ tham khảo"
                aria-label="Bảng điểm phòng thủ"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Điểm</span>
              </button>

              <button
                onClick={cycleRangeMode}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.showRanges !== "none"
                    ? "bg-blue-500/25 text-blue-300 border border-blue-500/50 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Chuyển chế độ hiển thị tầm bắn"
                aria-label="Tầm bắn"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tầm: {settings.showRanges === "none" ? "Tắt" : settings.showRanges === "selected" ? "Chọn" : "Tất cả"}</span>
              </button>

              <button
                onClick={cycleChainMode}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.showChainLightning !== "none"
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Chuyển chế độ phân tích sét lan Electro Dragon"
                aria-label="Sét lan"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sét: {settings.showChainLightning === "none" ? "Tắt" : settings.showChainLightning === "selected" ? "Chọn" : "Tất cả"}</span>
              </button>

              <button
                onClick={cycleDeploymentMode}
                className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.deploymentDisplayMode !== "off"
                    ? "bg-sky-500/25 text-sky-300 border border-sky-500/50 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
                }`}
                title="Chuyển chế độ hiển thị Vùng triển khai (Deployment Zone)"
                aria-label="Vùng triển khai"
              >
                {settings.deploymentDisplayMode !== "off" ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <ShieldOff className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Vùng triển khai: {DEPLOYMENT_MODE_LABELS[settings.deploymentDisplayMode]}</span>
              </button>
            </>
          )}
        </div>

        {/* Visibility Toggles (Names & Levels) */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg shrink-0">
          <button
            onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingNames: !s.showBuildingNames }))}
            className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              settings.showBuildingNames
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Bật/tắt hiển thị tên công trình"
            aria-label={settings.showBuildingNames ? "Ẩn tên công trình" : "Hiện tên công trình"}
          >
            {settings.showBuildingNames ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Tên</span>
          </button>
          <button
            onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingLevels: !s.showBuildingLevels }))}
            className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              settings.showBuildingLevels
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Bật/tắt hiển thị cấp độ"
            aria-label={settings.showBuildingLevels ? "Ẩn cấp độ" : "Hiện cấp độ"}
          >
            {settings.showBuildingLevels ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Cấp</span>
          </button>
        </div>
      </div>

      {/* Hàng 2: Điều hướng canvas (Sidebar, Zoom, Vừa khung, Toàn màn hình) + Dữ liệu (Nhập, Xuất) */}
      <div className="no-scrollbar flex items-center gap-1.5 p-1 bg-[#0a151f] border border-slate-800 rounded-xl shadow-sm w-full max-w-full min-w-0 overflow-x-auto sm:justify-between sm:flex-wrap">
        {/* Left: Sidebar & Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg shrink-0 sm:flex-wrap">
          {/* Sidebar collapse/expand toggle on tablet+ (matches the 768px breakpoint the CSS grid layout switches at) */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden md:flex items-center gap-1 px-2 h-[34px] min-h-[34px] rounded-md text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border-r border-slate-800 pr-2.5 mr-1"
              title={isSidebarCollapsed ? "Mở rộng danh mục công trình" : "Thu gọn danh mục công trình để mở rộng bản đồ"}
              aria-label={isSidebarCollapsed ? "Mở sidebar" : "Thu gọn sidebar"}
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mở Sidebar</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thu gọn</span>
                </>
              )}
            </button>
          )}

          {/* 2D / Isometric View Switch */}
          {onViewModeChange && (
            <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-md mr-1 border-r border-slate-800 pr-1.5">
              <button
                onClick={() => onViewModeChange("2d")}
                className={`h-[30px] flex items-center gap-1 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === "2d" ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Xem Sơ đồ 2D (chỉnh sửa được)"
                aria-label="Chế độ xem 2D"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2D</span>
              </button>
              <button
                onClick={() => onViewModeChange("isometric")}
                className={`h-[30px] flex items-center gap-1 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === "isometric" ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Xem Trực quan Isometric (chỉ xem — kéo/zoom, không chỉnh sửa được)"
                aria-label="Chế độ xem Isometric"
              >
                <Box className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Iso</span>
              </button>
            </div>
          )}

          {/* Zoom Out (2D only — Isometric view manages its own pan/zoom) */}
          {viewMode === "2d" && (
          <>
          <button
            onClick={() => onZoomChange(Math.max(0.35, Number((zoomLevel - 0.1).toFixed(2))), "manual")}
            className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Thu nhỏ bản đồ (-10%)"
            aria-label="Thu nhỏ bản đồ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom % / Toggle 100% */}
          <button
            onClick={() => {
              if (Math.abs(zoomLevel - 1.0) < 0.05) {
                onFitMap();
              } else {
                onZoomChange(1.0, "manual");
              }
            }}
            className={`px-2 h-[34px] flex items-center justify-center rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
              zoomMode === "fit"
                ? "text-cyan-300 bg-cyan-950/40 border border-cyan-500/30"
                : "text-slate-200 hover:bg-slate-800"
            }`}
            title="Bấm để chuyển đổi giữa 100% và Vừa khung"
          >
            <span>{Math.round(zoomLevel * 100)}%</span>
            {zoomMode === "fit" && (
              <span className="text-[9px] text-cyan-400 ml-1 font-sans font-normal">(Vừa)</span>
            )}
          </button>

          {/* Zoom In */}
          <button
            onClick={() => onZoomChange(Math.min(1.8, Number((zoomLevel + 0.1).toFixed(2))), "manual")}
            className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Phóng to bản đồ (+10%)"
            aria-label="Phóng to bản đồ"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Fit to Frame Button */}
          <button
            onClick={onFitMap}
            className={`flex items-center gap-1 px-2.5 h-[34px] min-h-[34px] rounded-md text-xs font-bold transition-all cursor-pointer ${
              zoomMode === "fit"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            title="Tự động tính tỷ lệ vừa vặn khung hình canvas"
            aria-label="Vừa khung hình"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vừa khung</span>
          </button>
          </>
          )}

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1 px-2.5 h-[34px] min-h-[34px] rounded-md text-xs font-bold transition-all cursor-pointer ${
                isFullscreen
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình canvas"}
              aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? "Thoát" : "Toàn màn hình"}</span>
            </button>
          )}
        </div>

        {/* Right: Data Actions (Import, Export JSON & PNG) */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onImportJSON}
            accept=".json,application/json"
            className="hidden"
            aria-label="Nhập tệp JSON"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Nhập dữ liệu bố cục từ tệp JSON"
            aria-label="Nhập tệp JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExportJSON}
            className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Xuất dữ liệu bố cục sang tệp JSON"
            aria-label="Xuất tệp JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExportPNG}
            className="h-[34px] min-h-[34px] flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
            title="Xuất bản đồ thành file ảnh PNG"
            aria-label="Xuất ảnh PNG"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TacticalToolbar;

