import React from "react";
import {
  Activity,
  AlertOctagon,
  Award,
  CheckCircle2,
  Clock,
  Crosshair,
  Download,
  Flame,
  FolderOpen,
  Grid,
  Image as ImageIcon,
  Layers,
  LucideIcon,
  Maximize2,
  Minimize2,
  Radio,
  Redo2,
  RefreshCw,
  Shield,
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const cycleRangeMode = () => {
    onUpdateSettings((s) => {
      const next: RangeDisplayMode =
        s.showRanges === "none" ? "selected" : s.showRanges === "selected" ? "all" : "none";
      return { ...s, showRanges: next };
    });
  };

  return (
    <div className="tactical-toolbar">
      {/* Group 1: Layout Project & TH Selector */}
      <div className="toolbar-section">
        {onOpenLayoutManager && (
          <button
            className="toolbar-btn primary highlight flex items-center gap-1.5"
            onClick={onOpenLayoutManager}
            title="Mở bảng quản lý danh sách các bản thiết kế, tạo mới hoặc nhân bản"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="max-w-[130px] truncate font-extrabold text-xs">
              {activeLayoutName || "Quản lý Layout"}
            </span>
          </button>
        )}

        <div className="th-selector-wrap">
          <label htmlFor="th-select">TH:</label>
          <select
            id="th-select"
            value={townHallLevel}
            onChange={(e) => onTownHallChange(Number(e.target.value))}
            className="th-select-box"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>
                TH{lvl} {lvl === 18 ? "(Mới)" : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          className="toolbar-btn secondary"
          onClick={onLoadPreset}
          title="Tải mẫu bố cục cân xứng chuẩn để tham khảo"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mẫu TH{townHallLevel}</span>
        </button>
      </div>

      {/* Group 2: Tactical Analytics & Overlays */}
      <div className="toolbar-section tactical-group">
        {/* Heatmap Toggle */}
        <button
          className={`toolbar-btn ${settings.showHeatmap ? "active highlight" : ""}`}
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              showHeatmap: !s.showHeatmap,
            }))
          }
          title="Bản đồ nhiệt hỏa lực (Heatmap): Đánh giá mật độ sát thương và điểm mù phòng thủ"
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Heatmap Hỏa lực</span>
        </button>

        {/* Defense Score Toggle */}
        <button
          className={`toolbar-btn ${settings.showDefenseScore ? "active highlight" : ""}`}
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              showDefenseScore: !s.showDefenseScore,
            }))
          }
          title="Bảng đánh giá phòng thủ 3-sao (0-100đ): Dãn cách trụ chủ lực, chống sét lan, độ phủ splash, bẫy & vị trí TH"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Điểm 3-Sao</span>
          {defenseScore && (
            <span
              className="text-[10px] font-black px-1.5 py-0.2 rounded"
              style={{
                backgroundColor: `${defenseScore.tierColor}33`,
                color: defenseScore.tierColor,
                border: `1px solid ${defenseScore.tierColor}88`,
              }}
            >
              {defenseScore.totalScore.toFixed(0)}đ ({defenseScore.tier})
            </span>
          )}
        </button>

        {/* Range Overlay Toggle */}
        <button
          className={`toolbar-btn ${settings.showRanges !== "none" ? "active" : ""}`}
          onClick={cycleRangeMode}
          title={`Vòng tròn tầm bắn: ${
            settings.showRanges === "all"
              ? "Tất cả trụ"
              : settings.showRanges === "selected"
              ? "Trụ đang chọn"
              : "Tắt"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>
            Tầm bắn:{" "}
            {settings.showRanges === "all"
              ? "Tất cả"
              : settings.showRanges === "selected"
              ? "Khi chọn"
              : "Tắt"}
          </span>
        </button>

        {/* Chain Lightning / Zap Warning Toggle */}
        <button
          className={`toolbar-btn hazard-btn ${settings.showChainLightning ? "active" : ""}`}
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              showChainLightning: !s.showChainLightning,
            }))
          }
          title="Cảnh báo khoảng cách ≤ 2 ô: Nguy cơ sét lan E-Dragon & combo phép Sét (Zap)"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Chống sét lan</span>
          {chainIssuesCount > 0 && settings.showChainLightning && (
            <span className="danger-badge">{chainIssuesCount}</span>
          )}
        </button>

        {/* Wall Brush Toggle */}
        <button
          className={`toolbar-btn ${settings.wallBrushActive ? "active highlight" : ""}`}
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              wallBrushActive: !s.wallBrushActive,
              eraserActive: false,
            }))
          }
          title="Bật/Tắt chế độ vẽ tường liên tục (nhấn giữ chuột trên bản đồ để xây tường)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Vẽ tường</span>
        </button>

        {/* Eraser Mode */}
        <button
          className={`toolbar-btn ${settings.eraserActive ? "active danger" : ""}`}
          onClick={() =>
            onUpdateSettings((s) => ({
              ...s,
              eraserActive: !s.eraserActive,
              wallBrushActive: false,
            }))
          }
          title="Chế độ tẩy xóa (click hoặc rê vào công trình/tường để xóa)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Tẩy</span>
        </button>
      </div>

      {/* Group 3: History & Clear Actions */}
      <div className="toolbar-section">
        <button
          className="toolbar-icon-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Hoàn tác (Ctrl + Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          className="toolbar-icon-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Làm lại (Ctrl + Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button
          className="toolbar-icon-btn"
          onClick={onClear}
          disabled={placedCount === 0}
          title="Dọn sạch toàn bộ bản đồ"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group 4: Zoom & Auto-Save Badge */}
      <div className="toolbar-section zoom-group">
        <button
          className="toolbar-icon-btn"
          onClick={() => onZoomChange(Math.max(0.7, Number((zoomLevel - 0.1).toFixed(1))))}
          title="Thu nhỏ"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
        <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
        <button
          className="toolbar-icon-btn"
          onClick={() => onZoomChange(Math.min(1.6, Number((zoomLevel + 0.1).toFixed(1))))}
          title="Phóng to"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {autoSaveTime && (
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded">
            <Clock className="w-2.5 h-2.5" />
            <span>Đã lưu {autoSaveTime}</span>
          </div>
        )}
      </div>

      {/* Group 5: Export Options */}
      <div className="toolbar-section export-group">
        <button
          className="toolbar-btn primary"
          onClick={onExportPNG}
          title="Xuất bố cục thành file ảnh PNG độ phân giải cao"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Xuất PNG</span>
        </button>
      </div>
    </div>
  );
}
