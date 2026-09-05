import React, { useEffect, useRef, useState } from "react";
import {
  Award,
  Box,
  ChevronRight,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Flame,
  Grid3x3,
  ImageIcon,
  Layers,
  Maximize,
  Minimize,
  Redo2,
  RefreshCw,
  ScanSearch,
  Shield,
  ShieldAlert,
  Sliders,
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
  DeploymentDisplayMode,
  PlannerViewMode,
  RangeDisplayMode,
  TacticalSettings,
} from "./types";
import { useTranslation } from "../../i18n";

interface VerticalTacticalToolbarProps {
  settings: TacticalSettings;
  onUpdateSettings: (updater: (prev: TacticalSettings) => TacticalSettings) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  zoomLevel: number;
  zoomMode?: "fit" | "manual";
  onZoomChange: (zoom: number, mode?: "fit" | "manual") => void;
  placedCount: number;
  onFitMap: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  viewMode?: PlannerViewMode;
  onViewModeChange?: (mode: PlannerViewMode) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  isArranging?: boolean;
}

export const VerticalTacticalToolbar: React.FC<VerticalTacticalToolbarProps> = ({
  settings,
  onUpdateSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  zoomLevel,
  zoomMode = "fit",
  onZoomChange,
  placedCount,
  onFitMap,
  isFullscreen = false,
  onToggleFullscreen,
  viewMode = "2d",
  onViewModeChange,
  isZenMode = false,
  onToggleZenMode,
  isArranging = false,
}) => {
  const { t } = useTranslation();
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  // When selection / arranging mode ends, reset manual expansion
  useEffect(() => {
    if (!isArranging) {
      setIsManuallyExpanded(false);
    }
  }, [isArranging]);

  const isHidden = isArranging && !isManuallyExpanded;

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
    <>
      {/* If hidden during arranging, render a compact toggle button to re-open if needed */}
      {isHidden && (
        <button
          type="button"
          onClick={() => setIsManuallyExpanded(true)}
          className="absolute top-2 right-2 sm:right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-amber-400 text-xs font-bold shadow-2xl backdrop-blur-md transition-all cursor-pointer hover:scale-105"
          title="Mở thanh công cụ hỗ trợ"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline text-[11px] text-slate-300">Công cụ</span>
        </button>
      )}

      <aside
        aria-label="Thanh công cụ thiết kế"
        className={`absolute top-2 right-2 sm:right-3 z-30 flex flex-col items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800/80 shadow-2xl select-none max-h-[calc(100%-16px)] overflow-y-auto no-scrollbar transition-all duration-300 ${
          isHidden
            ? "translate-x-[calc(100%+24px)] pointer-events-none opacity-0"
            : "translate-x-0 opacity-100"
        }`}
      >
        {/* Re-hide button when manually expanded while arranging */}
        {isArranging && (
          <button
            type="button"
            onClick={() => setIsManuallyExpanded(false)}
            className="w-full flex items-center justify-center gap-0.5 py-0.5 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[9.5px] font-bold border border-slate-800 transition-colors cursor-pointer"
            title="Ẩn thanh công cụ để tiếp tục sắp xếp"
          >
            <span>Ẩn công cụ</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      {/* 1. Nhóm Công cụ Thao tác & Xây dựng (Build & Edit Tools) */}
      <div className="flex flex-col items-center bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg gap-1 shrink-0">
        {/* Cọ vẽ tường liên tục (Wall Brush) */}
        <button
          type="button"
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              wallBrushActive: !s.wallBrushActive,
              eraserActive: false,
            }))
          }
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
            settings.wallBrushActive
              ? "bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-sm ring-1 ring-amber-400/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
          title={settings.wallBrushActive ? "Tắt vẽ tường liên tục" : "Bật cọ vẽ tường liên tục (Kéo chuột đặt tường)"}
          aria-label="Cọ vẽ tường liên tục"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          {settings.wallBrushActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Cục tẩy (Eraser) */}
        <button
          type="button"
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              eraserActive: !s.eraserActive,
              wallBrushActive: false,
            }))
          }
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
            settings.eraserActive
              ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-sm ring-1 ring-rose-400/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
          title={settings.eraserActive ? "Tắt chế độ tẩy" : "Bật chế độ tẩy (Chạm để xóa công trình/tường/trang trí)"}
          aria-label="Chế độ tẩy"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          {settings.eraserActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          )}
        </button>

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-md bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
          title={`${t("basePlanner.toolbar.undo")} (Ctrl+Z)`}
          aria-label={t("basePlanner.toolbar.undo")}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-md bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
          title={`${t("basePlanner.toolbar.redo")} (Ctrl+Y)`}
          aria-label={t("basePlanner.toolbar.redo")}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {/* Xóa map */}
        <button
          type="button"
          onClick={onClear}
          disabled={placedCount === 0}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-md bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Dọn sạch toàn bộ công trình & tường trên bản đồ"
          aria-label="Dọn sạch bản đồ"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-4 h-px bg-slate-800 shrink-0" />

      {/* 2. Nhóm Lớp phủ Chiến thuật (Tactical Overlays) */}
      <div className="flex flex-col items-center bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg gap-1 shrink-0">
        {/* Bán kính phòng thủ */}
        <button
          type="button"
          onClick={cycleRangeMode}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
            settings.showRanges !== "none"
              ? "bg-blue-500/25 text-blue-300 border border-blue-500/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
          title={`Tầm bắn phòng thủ: ${settings.showRanges === "none" ? "Tắt" : settings.showRanges === "selected" ? "Đang chọn" : "Tất cả"}`}
          aria-label="Tầm bắn phòng thủ"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-400" />
          {settings.showRanges !== "none" && (
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
          )}
        </button>

        {/* Cảnh báo Sét chuyền E-Drag */}
        <button
          type="button"
          onClick={cycleChainMode}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
            settings.showChainLightning !== "none"
              ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
          title={`Phân tích sét lan E-Drag: ${settings.showChainLightning === "none" ? "Tắt" : settings.showChainLightning === "selected" ? "Đang chọn" : "Tất cả"}`}
          aria-label="Sét lan"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          {settings.showChainLightning !== "none" && (
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Vùng cấm thả quân */}
        <button
          type="button"
          onClick={cycleDeploymentMode}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
            settings.deploymentDisplayMode !== "off"
              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
          title={`Vùng thả quân: ${settings.deploymentDisplayMode}`}
          aria-label="Vùng thả quân"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          {settings.deploymentDisplayMode !== "off" && (
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Bản đồ nhiệt hỏa lực */}
        <button
          type="button"
          onClick={() => onUpdateSettings((s) => ({ ...s, showHeatmap: !s.showHeatmap }))}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer ${
            settings.showHeatmap
              ? "bg-orange-500/25 text-orange-300 border border-orange-500/40"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
          title="Bật/tắt bản đồ nhiệt hỏa lực"
          aria-label="Mật độ hỏa lực"
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
        </button>

        {/* Bật/tắt tên & cấp */}
        <button
          type="button"
          onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingNames: !s.showBuildingNames }))}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer ${
            settings.showBuildingNames ? "bg-slate-800 text-cyan-300" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Bật/tắt hiển thị tên công trình"
        >
          {settings.showBuildingNames ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingLevels: !s.showBuildingLevels }))}
          className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer text-[9px] font-black ${
            settings.showBuildingLevels ? "bg-slate-800 text-amber-300" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Bật/tắt hiển thị cấp độ công trình"
        >
          {settings.showBuildingLevels ? "Lv✓" : "Lv✗"}
        </button>
      </div>

      <div className="w-4 h-px bg-slate-800 shrink-0" />

      {/* 3. Nhóm Góc nhìn & Điều hướng (Viewport & Camera) */}
      <div className="flex flex-col items-center bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg gap-1 shrink-0">
        {/* 2D / 3D Isometric View */}
        {onViewModeChange && (
          <button
            type="button"
            onClick={() => onViewModeChange(viewMode === "2d" ? "isometric" : "2d")}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-md transition-all cursor-pointer ${
              viewMode === "isometric"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
            title={viewMode === "2d" ? "Chuyển sang sa bàn 3D Isometric" : "Chuyển về lưới vẽ 2D"}
          >
            {viewMode === "2d" ? <Box className="w-3.5 h-3.5 text-cyan-400" /> : <Grid3x3 className="w-3.5 h-3.5 text-amber-400" />}
          </button>
        )}

        {/* Phóng to */}
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(1.8, Number((zoomLevel + 0.1).toFixed(2))), "manual")}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Phóng to (+10%)"
          aria-label="Phóng to"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Vừa khung / Căn giữa */}
        <button
          type="button"
          onClick={onFitMap}
          className={`px-1 h-[24px] flex items-center justify-center rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
            zoomMode === "fit" ? "text-cyan-300 bg-slate-800" : "text-slate-400 hover:text-white"
          }`}
          title="Vừa vặn khung hình & Căn giữa bản đồ"
        >
          {Math.round(zoomLevel * 100)}%
        </button>

        {/* Thu nhỏ */}
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0.35, Number((zoomLevel - 0.1).toFixed(2))), "manual")}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Thu nhỏ (-10%)"
          aria-label="Thu nhỏ"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Canvas */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`w-[30px] h-[30px] flex items-center justify-center rounded-md transition-all cursor-pointer ${
              isFullscreen
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
            }`}
            title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình canvas"}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Zen Mode: Ẩn thanh công cụ để xem full map */}
        {onToggleZenMode && (
          <button
            type="button"
            onClick={onToggleZenMode}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Ẩn thanh công cụ & khay công trình (Phím H)"
          >
            {isZenMode ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
          </button>
        )}
      </div>
    </aside>
    </>
  );
};

export default VerticalTacticalToolbar;
