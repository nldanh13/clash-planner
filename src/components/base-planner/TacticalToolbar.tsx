import React, { useRef } from "react";
import {
  AlertTriangle,
  Award,
  Clock,
  Crosshair,
  Download,
  Flame,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Redo2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Zap,
} from "lucide-react";
import type { DefenseScoreResult, RangeDisplayMode, TacticalSettings } from "./types";

interface TacticalToolbarProps {
  townHallLevel: number;
  onTownHallChange: (th: number) => void;
  settings: TacticalSettings;
  onUpdateSettings: (updater: (prev: TacticalSettings) => TacticalSettings) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onLoadPreset: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chainIssuesCount: number;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  placedCount: number;
  defenseScore?: DefenseScoreResult;
  activeLayoutName?: string;
  onOpenLayoutManager?: () => void;
  autoSaveTime?: string | null;
}

export function TacticalToolbar({
  townHallLevel,
  onTownHallChange,
  settings,
  onUpdateSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onLoadPreset,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  chainIssuesCount,
  zoomLevel,
  onZoomChange,
  placedCount,
  defenseScore,
  activeLayoutName,
  onOpenLayoutManager,
  autoSaveTime,
}: TacticalToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cycleRangeMode = () => {
    onUpdateSettings((s) => {
      const next: RangeDisplayMode =
        s.showRanges === "none" ? "selected" : s.showRanges === "selected" ? "all" : "none";
      return { ...s, showRanges: next };
    });
  };

  return (
    <div className="flex flex-row items-center gap-2 flex-wrap bg-slate-900/90 border border-slate-800 rounded-xl p-2 shadow-lg w-full text-slate-200">
      {/* Hidden File Input for JSON import - Never visible */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportJSON}
        accept=".json,application/json"
        style={{ display: "none" }}
        className="hidden"
      />

      {/* CLUSTER 1: Project & TH Preset */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
        {onOpenLayoutManager && (
          <button
            onClick={onOpenLayoutManager}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
            title="Quản lý bản thiết kế (Lưu, đổi tên, nhân bản)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[120px] truncate">{activeLayoutName || "Bản thiết kế"}</span>
          </button>
        )}

        {/* Town Hall Selector */}
        <div className="flex items-center gap-1 px-1.5">
          <span className="text-[10px] font-black text-amber-400 font-mono">TH</span>
          <select
            value={townHallLevel}
            onChange={(e) => onTownHallChange(Number(e.target.value))}
            className="bg-slate-900 text-white font-black text-xs px-2 py-1 rounded border border-slate-700 outline-none cursor-pointer focus:border-amber-400"
            title="Chọn cấp Town Hall (1 - 18)"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl} className="bg-slate-900 text-white">
                TH {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Preset Sample Button */}
        <button
          onClick={onLoadPreset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          title={`Nạp mẫu bố cục chuẩn cho TH${townHallLevel}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Mẫu TH{townHallLevel}</span>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800 hidden sm:block" />

      {/* CLUSTER 2: Tactical Analytics (Heatmap, Score, Range, Chain) */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
        {/* Heatmap Toggle */}
        <button
          onClick={() => onUpdateSettings((s) => ({ ...s, showHeatmap: !s.showHeatmap }))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            settings.showHeatmap
              ? "bg-orange-500/25 text-orange-300 border border-orange-500/60 shadow-sm"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
          }`}
          title="Bật/Tắt Heatmap phân tích mật độ hỏa lực"
        >
          <Flame className={`w-3.5 h-3.5 ${settings.showHeatmap ? "text-orange-400 animate-pulse" : "text-slate-400"}`} />
          <span>Heatmap</span>
        </button>

        {/* 3-Star Defense Score Toggle */}
        <button
          onClick={() => onUpdateSettings((s) => ({ ...s, showDefenseScore: !s.showDefenseScore }))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            settings.showDefenseScore
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
          }`}
          title="Bật/Tắt Bảng đánh giá Phòng thủ 3-Sao"
        >
          <Award className={`w-3.5 h-3.5 ${settings.showDefenseScore ? "text-cyan-400" : "text-slate-400"}`} />
          <span>Điểm 3-Sao</span>
          {defenseScore && (
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded font-mono ml-0.5 shadow-sm"
              style={{
                backgroundColor: `${defenseScore.tierColor}30`,
                color: defenseScore.tierColor,
                border: `1px solid ${defenseScore.tierColor}60`,
              }}
            >
              {defenseScore.tier} ({defenseScore.totalScore.toFixed(0)})
            </span>
          )}
        </button>

        {/* Range Mode Cycle */}
        <button
          onClick={cycleRangeMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            settings.showRanges !== "none"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
              : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
          }`}
          title="Chuyển chế độ hiển thị tầm bắn: Tắt / Đang chọn / Tất cả"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-400" />
          <span>
            Tầm: {settings.showRanges === "none" ? "Tắt" : settings.showRanges === "selected" ? "Chọn" : "Tất cả"}
          </span>
        </button>

        {/* Chain Lightning Hazard Toggle */}
        <button
          onClick={() => onUpdateSettings((s) => ({ ...s, showChainLightning: !s.showChainLightning }))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            settings.showChainLightning
              ? chainIssuesCount > 0
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
              : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
          }`}
          title="Bật/Tắt Cảnh báo Sét lan (E-Dragon Chain Lightning)"
        >
          <Zap className={`w-3.5 h-3.5 ${chainIssuesCount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`} />
          <span>Sét lan</span>
          {chainIssuesCount > 0 && settings.showChainLightning && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono">
              {chainIssuesCount}
            </span>
          )}
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800 hidden sm:block" />

      {/* CLUSTER 3: Brush, Eraser & History */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
        {/* Wall Brush Mode */}
        <button
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              wallBrushActive: !s.wallBrushActive,
              eraserActive: false,
            }))
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            settings.wallBrushActive
              ? "bg-cyan-500 text-slate-950 border border-cyan-400 shadow-md font-black"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
          }`}
          title="Bật/Tắt Cọ vẽ Tường liên tục (Kéo rê chuột)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Vẽ Tường</span>
        </button>

        {/* Eraser Mode */}
        <button
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              eraserActive: !s.eraserActive,
              wallBrushActive: false,
            }))
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            settings.eraserActive
              ? "bg-rose-600 text-white border border-rose-500 shadow-md font-black"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
          }`}
          title="Bật/Tắt Chế độ Tẩy nhanh"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Tẩy</span>
        </button>

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 transition-all cursor-pointer"
          title="Hoàn tác (Ctrl+Z)"
          aria-label="Hoàn tác"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 transition-all cursor-pointer"
          title="Làm lại (Ctrl+Y)"
          aria-label="Làm lại"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Clear Map */}
        <button
          onClick={onClear}
          disabled={placedCount === 0}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 transition-all cursor-pointer"
          title="Dọn sạch toàn bộ bản đồ"
          aria-label="Dọn sạch toàn bộ bản đồ"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800 hidden sm:block" />

      {/* CLUSTER 4: Zoom & Export */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800 ml-auto">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => onZoomChange(Math.max(0.6, Number((zoomLevel - 0.1).toFixed(1))))}
            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center border border-slate-800 cursor-pointer"
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            -
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[36px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(1.6, Number((zoomLevel + 0.1).toFixed(1))))}
            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center border border-slate-800 cursor-pointer"
            title="Phóng to"
            aria-label="Phóng to"
          >
            +
          </button>
        </div>

        {/* Export PNG */}
        <button
          onClick={onExportPNG}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
          title="Xuất ảnh PNG chất lượng cao 2K"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Xuất PNG</span>
        </button>

        {/* Export JSON */}
        <button
          onClick={onExportJSON}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
          title="Tải tệp bố cục JSON"
          aria-label="Tải tệp bố cục JSON"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Import JSON Trigger */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
          title="Nhập tệp bố cục JSON từ máy tính"
          aria-label="Nhập tệp bố cục JSON"
        >
          <Upload className="w-4 h-4" />
        </button>

        {autoSaveTime && (
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400 font-mono px-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{autoSaveTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TacticalToolbar;
