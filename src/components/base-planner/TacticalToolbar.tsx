import React, { useRef } from "react";
import {
  Crosshair,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  ImageIcon,
  Layers,
  LayoutTemplate,
  Maximize,
  Redo2,
  RefreshCw,
  Save,
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
  PlannerMode,
  RangeDisplayMode,
  TacticalSettings,
} from "./types";

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
  onZoomChange: (zoom: number) => void;
  placedCount: number;
  defenseScore: DefenseScoreResult | null;
  activeLayoutName?: string;
  onOpenLayoutManager?: () => void;
  autoSaveTime?: string | null;
  onFitMap: () => void;
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
  onZoomChange,
  placedCount,
  onFitMap,
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

  return (
    <div className="flex flex-col gap-2 w-full max-w-full min-w-0 mb-3 select-none">
      {/* Hàng 1: “Thiết kế”, “Phân tích”, “Tên”, “Cấp” */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#0a151f] border border-slate-800 rounded-xl shadow-sm w-full max-w-full min-w-0 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg">
          <button
            onClick={() => setMode("design")}
            className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              settings.plannerMode === "design"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Chế độ Thiết kế"
          >
            <Edit3 className="w-4 h-4" />
            <span>Thiết kế</span>
          </button>
          <button
            onClick={() => setMode("analysis")}
            className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              settings.plannerMode === "analysis"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Chế độ Phân tích"
          >
            <ScanSearch className="w-4 h-4" />
            <span>Phân tích</span>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg">
          <button
            onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingNames: !s.showBuildingNames }))}
            className={`min-h-[40px] px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              settings.showBuildingNames
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Bật/tắt hiển thị tên công trình"
            aria-label={settings.showBuildingNames ? "Ẩn tên công trình" : "Hiện tên công trình"}
          >
            {settings.showBuildingNames ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4" />}
            <span>Tên</span>
          </button>
          <button
            onClick={() => onUpdateSettings((s) => ({ ...s, showBuildingLevels: !s.showBuildingLevels }))}
            className={`min-h-[40px] px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              settings.showBuildingLevels
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Bật/tắt hiển thị cấp độ"
            aria-label={settings.showBuildingLevels ? "Ẩn cấp độ" : "Hiện cấp độ"}
          >
            {settings.showBuildingLevels ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4" />}
            <span>Cấp</span>
          </button>
        </div>
      </div>

      {/* Hàng công cụ: Vẽ tường, Tẩy, Undo, Redo (hoặc Heatmap, Điểm, Tầm, Sét lan) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0a151f] border border-slate-800 rounded-xl shadow-sm w-full max-w-full min-w-0 flex-wrap">
        {settings.plannerMode === "design" ? (
          <>
            <button
              onClick={() =>
                onUpdateSettings((s) => ({
                  ...s,
                  wallBrushActive: !s.wallBrushActive,
                  eraserActive: false,
                }))
              }
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.wallBrushActive
                  ? "bg-cyan-500 text-slate-950 font-black shadow-md"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
              title="Bật cọ vẽ tường liên tục"
              aria-label={settings.wallBrushActive ? "Tắt cọ vẽ tường" : "Bật cọ vẽ tường"}
            >
              <Layers className="w-4 h-4" />
              <span>Vẽ Tường</span>
            </button>

            <button
              onClick={() =>
                onUpdateSettings((s) => ({
                  ...s,
                  eraserActive: !s.eraserActive,
                  wallBrushActive: false,
                }))
              }
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.eraserActive
                  ? "bg-rose-600 text-white font-black shadow-md"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
              title="Chế độ Tẩy công trình/tường khi chạm"
              aria-label={settings.eraserActive ? "Tắt chế độ tẩy" : "Bật chế độ tẩy"}
            >
              <Trash2 className="w-4 h-4" />
              <span>Tẩy</span>
            </button>

            <div className="w-px h-6 bg-slate-800 hidden sm:block mx-0.5" />

            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Hoàn tác"
              aria-label="Hoàn tác"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Làm lại"
              aria-label="Làm lại"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClear}
              disabled={placedCount === 0}
              className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer ml-auto"
              title="Dọn sạch toàn bộ công trình trên bản đồ"
              aria-label="Dọn sạch bản đồ"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onUpdateSettings((s) => ({ ...s, showHeatmap: !s.showHeatmap }))}
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.showHeatmap
                  ? "bg-orange-500/25 text-orange-400 border border-orange-500/50 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
              }`}
              title="Bật/tắt bản đồ nhiệt hỏa lực"
              aria-label="Mật độ hỏa lực Heatmap"
            >
              <Flame className="w-4 h-4" />
              <span>Heatmap</span>
            </button>

            <button
              onClick={() => onUpdateSettings((s) => ({ ...s, showDefenseScore: !s.showDefenseScore }))}
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.showDefenseScore
                  ? "bg-fuchsia-500/25 text-fuchsia-400 border border-fuchsia-500/50 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
              }`}
              title="Bật/tắt bảng điểm phòng thủ tham khảo"
              aria-label="Bảng điểm phòng thủ"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Điểm</span>
            </button>

            <button
              onClick={cycleRangeMode}
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.showRanges !== "none"
                  ? "bg-blue-500/25 text-blue-300 border border-blue-500/50 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
              }`}
              title="Chuyển chế độ hiển thị tầm bắn"
              aria-label="Tầm bắn"
            >
              <Crosshair className="w-4 h-4" />
              <span>Tầm: {settings.showRanges === "none" ? "Tắt" : settings.showRanges === "selected" ? "Chọn" : "Tất cả"}</span>
            </button>

            <button
              onClick={cycleChainMode}
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.showChainLightning !== "none"
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700"
              }`}
              title="Chuyển chế độ phân tích sét lan Electro Dragon"
              aria-label="Sét lan"
            >
              <Zap className="w-4 h-4" />
              <span>Sét: {settings.showChainLightning === "none" ? "Tắt" : settings.showChainLightning === "selected" ? "Chọn" : "Tất cả"}</span>
            </button>
          </>
        )}
      </div>

      {/* Hàng 4: zoom, vừa bản đồ, nhập, xuất và Xuất PNG */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#0a151f] border border-slate-800 rounded-xl shadow-sm w-full max-w-full min-w-0 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg">
          <button
            onClick={() => onZoomChange(Math.max(0.6, Number((zoomLevel - 0.1).toFixed(1))))}
            className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Thu nhỏ bản đồ (-10%)"
            aria-label="Thu nhỏ bản đồ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-200 min-w-[42px] text-center select-none">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(1.6, Number((zoomLevel + 0.1).toFixed(1))))}
            className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Phóng to bản đồ (+10%)"
            aria-label="Phóng to bản đồ"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={onFitMap}
            className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer ml-0.5"
            title="Vừa bản đồ và căn giữa"
            aria-label="Vừa bản đồ và căn giữa"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
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
            className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Nhập dữ liệu bố cục từ tệp JSON"
            aria-label="Nhập tệp JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onExportJSON}
            className="w-[40px] h-[40px] min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Xuất dữ liệu bố cục sang tệp JSON"
            aria-label="Xuất tệp JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onExportPNG}
            className="h-[40px] min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
            title="Xuất bản đồ thành file ảnh PNG"
            aria-label="Xuất ảnh PNG"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Xuất PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TacticalToolbar;

