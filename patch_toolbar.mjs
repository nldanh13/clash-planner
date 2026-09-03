import fs from 'fs';
const content = `import React, { useRef } from "react";
import {
  AlertTriangle, Crosshair, Download, ImageIcon, Layers, Redo2, RefreshCw, Trash2, Undo2, Upload, Zap, Eye, EyeOff, LayoutTemplate, ScanSearch, Edit3, Save, ZoomIn, ZoomOut, Maximize
} from "lucide-react";
import type { DefenseScoreResult, RangeDisplayMode, ChainLightningMode, TacticalSettings, PlannerMode } from "./types";

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
  defenseScore: DefenseScoreResult | null;
  activeLayoutName: string;
  onOpenLayoutManager: () => void;
  autoSaveTime: string | null;
  onFitMap: () => void;
}

const TacticalToolbar: React.FC<TacticalToolbarProps> = ({
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
  onFitMap
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
    <div className="flex flex-col gap-2 w-full mb-3">
      {/* Top row: Mode Switcher & Global View Options & Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[#0a151f] border border-slate-800 rounded-lg shadow-sm">
        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-md">
          <button
            onClick={() => setMode("design")}
            className={\`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all \${settings.plannerMode === "design" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"}\`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Thiết kế
          </button>
          <button
            onClick={() => setMode("analysis")}
            className={\`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all \${settings.plannerMode === "analysis" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"}\`}
          >
            <ScanSearch className="w-3.5 h-3.5" /> Phân tích
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-md">
          <button
            onClick={() => onUpdateSettings(s => ({ ...s, showBuildingNames: !s.showBuildingNames }))}
            className={\`px-2.5 py-1.5 rounded text-[10px] font-bold transition-all \${settings.showBuildingNames ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800"}\`}
            title="Hiện/ẩn tên công trình"
          >
            {settings.showBuildingNames ? <Eye className="w-3.5 h-3.5 inline mr-1"/> : <EyeOff className="w-3.5 h-3.5 inline mr-1"/>}
            Tên
          </button>
          <button
            onClick={() => onUpdateSettings(s => ({ ...s, showBuildingLevels: !s.showBuildingLevels }))}
            className={\`px-2.5 py-1.5 rounded text-[10px] font-bold transition-all \${settings.showBuildingLevels ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800"}\`}
            title="Hiện/ẩn cấp độ"
          >
            {settings.showBuildingLevels ? <Eye className="w-3.5 h-3.5 inline mr-1"/> : <EyeOff className="w-3.5 h-3.5 inline mr-1"/>}
            Cấp
          </button>
        </div>

        <div className="flex items-center gap-1 px-1">
          <button onClick={() => onZoomChange(Math.max(0.6, Number((zoomLevel - 0.1).toFixed(1))))} className="p-1 rounded hover:bg-slate-800 text-slate-300" title="Thu nhỏ">
            <ZoomOut className="w-4 h-4"/>
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[36px] text-center">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => onZoomChange(Math.min(1.6, Number((zoomLevel + 0.1).toFixed(1))))} className="p-1 rounded hover:bg-slate-800 text-slate-300" title="Phóng to">
            <ZoomIn className="w-4 h-4"/>
          </button>
          <button onClick={onFitMap} className="p-1 rounded hover:bg-slate-800 text-slate-300 ml-1" title="Vừa bản đồ">
            <Maximize className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Second row: Mode-specific tools */}
      <div className="flex flex-wrap items-center gap-2">
        {/* BO CUC */}
        <div className="flex items-center gap-1.5 bg-[#0a151f] p-1.5 rounded-lg border border-slate-800 flex-1 min-w-max">
          <select
            value={townHallLevel}
            onChange={(e) => onTownHallChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-amber-400 outline-none w-20"
            title="Chọn cấp Town Hall"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((th) => (
              <option key={th} value={th}>TH{th}</option>
            ))}
          </select>
          <button
            onClick={onLoadPreset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300"
            title="Tải bố cục mẫu cho TH hiện tại"
          >
            <LayoutTemplate className="w-3.5 h-3.5" /> Bố cục mẫu
          </button>
          <button
            onClick={onOpenLayoutManager}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 ml-auto truncate max-w-[120px]"
            title="Quản lý Layouts đã lưu"
          >
            <Save className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{activeLayoutName}</span>
          </button>
        </div>

        {/* CHINH SUA or PHAN TICH */}
        {settings.plannerMode === "design" ? (
          <div className="flex items-center gap-1.5 bg-[#0a151f] p-1.5 rounded-lg border border-slate-800 flex-1 min-w-max">
            <button
              onClick={() => onUpdateSettings((s) => ({ ...s, wallBrushActive: !s.wallBrushActive, eraserActive: false }))}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold \${settings.wallBrushActive ? "bg-cyan-500 text-slate-950 shadow-md font-black" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}\`}
              title="Cọ vẽ Tường"
            >
              <Layers className="w-3.5 h-3.5" /> Vẽ Tường
            </button>
            <button
              onClick={() => onUpdateSettings((s) => ({ ...s, eraserActive: !s.eraserActive, wallBrushActive: false }))}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold \${settings.eraserActive ? "bg-rose-600 text-white shadow-md font-black" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}\`}
              title="Chế độ Tẩy"
            >
              <Trash2 className="w-3.5 h-3.5" /> Tẩy
            </button>
            <div className="w-px h-5 bg-slate-700 mx-1"></div>
            <button onClick={onUndo} disabled={!canUndo} className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30" title="Hoàn tác">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={onRedo} disabled={!canRedo} className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30" title="Làm lại">
              <Redo2 className="w-4 h-4" />
            </button>
            <button onClick={onClear} disabled={placedCount === 0} className="p-1.5 rounded-md bg-slate-900 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 disabled:opacity-30 ml-auto" title="Dọn sạch bản đồ">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#0a151f] p-1.5 rounded-lg border border-slate-800 flex-1 min-w-max">
            <button
              onClick={() => onUpdateSettings(s => ({ ...s, showHeatmap: !s.showHeatmap }))}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold \${settings.showHeatmap ? "bg-orange-500/20 text-orange-400" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}\`}
            >
              <Flame className="w-3.5 h-3.5" /> Heatmap
            </button>
            <button
              onClick={() => onUpdateSettings(s => ({ ...s, showDefenseScore: !s.showDefenseScore }))}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold \${settings.showDefenseScore ? "bg-fuchsia-500/20 text-fuchsia-400" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}\`}
            >
              Điểm
            </button>
            <button
              onClick={cycleRangeMode}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold \${settings.showRanges !== "none" ? "bg-blue-500/20 text-blue-300" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}\`}
            >
              <Crosshair className="w-3.5 h-3.5" /> Tầm: {settings.showRanges === "none" ? "Tắt" : settings.showRanges === "selected" ? "Chọn" : "Tất cả"}
            </button>
            <button
              onClick={cycleChainMode}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold \${settings.showChainLightning !== "none" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}\`}
            >
              <Zap className="w-3.5 h-3.5" /> Sét lan: {settings.showChainLightning === "none" ? "Tắt" : settings.showChainLightning === "selected" ? "Chọn" : "Tất cả"}
            </button>
          </div>
        )}

        {/* XUAT/NHAP */}
        <div className="flex items-center gap-1 bg-[#0a151f] p-1.5 rounded-lg border border-slate-800">
          <input type="file" ref={fileInputRef} onChange={onImportJSON} accept=".json" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300" title="Nhập JSON">
            <Upload className="w-4 h-4" />
          </button>
          <button onClick={onExportJSON} className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300" title="Xuất JSON">
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-700 mx-0.5"></div>
          <button onClick={onExportPNG} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold" title="Xuất PNG">
            <ImageIcon className="w-3.5 h-3.5" /> Xuất PNG
          </button>
        </div>
      </div>
    </div>
  );
};
export default TacticalToolbar;
`;
fs.writeFileSync('src/components/base-planner/TacticalToolbar.tsx', content);
