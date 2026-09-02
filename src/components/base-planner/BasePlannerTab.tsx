import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  Castle,
  CheckCircle2,
  Coins,
  Crown,
  Download,
  Eye,
  FileCode,
  Flame,
  FolderOpen,
  Hammer,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutGrid,
  Maximize2,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Undo,
  Upload,
  Zap,
} from "lucide-react";
import { CanvasGridBoard } from "./CanvasGridBoard";
import { DefenseScorePanel } from "./DefenseScorePanel";
import { InventorySidebar } from "./InventorySidebar";
import { LayoutManagerModal } from "./LayoutManagerModal";
import { TacticalToolbar } from "./TacticalToolbar";
import { getAllBuildingLimits, validateLayoutAgainstLimits } from "./buildingLimits";
import { scanChainLightningHazards } from "./chainLightningUtils";
import { evaluateBaseDefense } from "./defenseScorer";
import {
  exportLayoutAsImage,
  exportLayoutAsJSON,
  getPresetLayout,
  importLayoutFromJSON,
} from "./ExportUtils";
import {
  getActiveLayoutId,
  getSavedLayouts,
  saveLayout,
  setActiveLayoutId,
} from "./layoutStorage";
import { useBasePlannerHistory } from "./useBasePlannerHistory";
import type { LayoutProject, PlacedBuilding, TacticalSettings } from "./types";

interface BasePlannerTabProps {
  initialTownHall?: number;
}

export function BasePlannerTab({ initialTownHall = 11 }: BasePlannerTabProps) {
  // Current active layout metadata
  const [activeLayout, setActiveLayout] = useState<LayoutProject>(() => {
    const all = getSavedLayouts();
    const activeId = getActiveLayoutId();
    const found = all.find((l) => l.id === activeId);
    return found || all[0] || {
      id: "default-layout",
      name: `Bố cục TH${initialTownHall}`,
      townHallLevel: initialTownHall,
      buildings: getPresetLayout(initialTownHall),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [townHallLevel, setTownHallLevel] = useState<number>(activeLayout.townHallLevel || initialTownHall);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  const [pendingTHChange, setPendingTHChange] = useState<{ newTH: number; validBuildings: PlacedBuilding[]; issues: string[] } | null>(null);

  const [settings, setSettings] = useState<TacticalSettings>({
    showRanges: "selected",
    showChainLightning: true,
    showHeatmap: false,
    showDefenseScore: true,
    showGrid: true,
    showCoordinates: true,
    wallBrushActive: false,
    eraserActive: false,
    chainMaxDistance: 2,
  });

  // Undo/Redo History
  const {
    buildings,
    pushState,
    replaceState,
    setEntireState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBasePlannerHistory({
    initialState: () => activeLayout.buildings || getPresetLayout(activeLayout.townHallLevel || initialTownHall),
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic Building Limits for current TH
  const buildingLimits = useMemo(() => {
    return getAllBuildingLimits(townHallLevel);
  }, [townHallLevel]);

  // Real-time 3-Star Defense Score Calculation
  const defenseScoreResult = useMemo(() => {
    return evaluateBaseDefense(buildings, townHallLevel);
  }, [buildings, townHallLevel]);

  // Push buildings update and persist to active layout
  const handleUpdateBuildings = useCallback(
    (newBuildings: PlacedBuilding[], replace: boolean = false) => {
      if (replace) {
        replaceState(newBuildings);
      } else {
        pushState(newBuildings);
      }

      const updated: LayoutProject = {
        ...activeLayout,
        townHallLevel,
        buildings: newBuildings,
        updatedAt: new Date().toISOString(),
      };
      setActiveLayout(updated);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveLayout(updated);
        setAutoSaveTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      }, 500); // 500ms debounce
    },
    [activeLayout, pushState, replaceState, townHallLevel]
  );

  // Auto-Save Interval (every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      const updated: LayoutProject = {
        ...activeLayout,
        townHallLevel,
        buildings,
        updatedAt: new Date().toISOString(),
      };
      saveLayout(updated);
      setAutoSaveTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 30000);

    return () => clearInterval(timer);
  }, [activeLayout, buildings, townHallLevel]);

  // Notify user with auto-dismiss
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Change Town Hall Level
  const handleTownHallChange = (newTH: number) => {
    const safe = Math.max(1, Math.min(18, newTH));
    
    // Check validation against new limits
    const { isValid, validBuildings, issues } = validateLayoutAgainstLimits(buildings, safe);

    if (!isValid && safe < townHallLevel) {
      // Show confirmation prompt
      setPendingTHChange({ newTH: safe, validBuildings, issues });
      return;
    }

    applyTownHallChange(safe, buildings);
  };

  const applyTownHallChange = (newTH: number, newBuildings: PlacedBuilding[]) => {
    setTownHallLevel(newTH);
    setEntireState(newBuildings);
    const updated: LayoutProject = {
      ...activeLayout,
      townHallLevel: newTH,
      buildings: newBuildings,
      updatedAt: new Date().toISOString(),
    };
    setActiveLayout(updated);
    saveLayout(updated);
    showToast(`Đã chuyển cấp độ sang Town Hall ${newTH}.`);
    setPendingTHChange(null);
  };

  // Switch Active Layout from Project Manager
  const handleSelectLayout = (layout: LayoutProject) => {
    setActiveLayout(layout);
    setActiveLayoutId(layout.id);
    setTownHallLevel(layout.townHallLevel);
    setEntireState(layout.buildings || []);
    setSelectedPlacedId(null);
    setSelectedDefId(null);
    showToast(`Đã tải bản thiết kế: "${layout.name}" (TH${layout.townHallLevel})`);
  };

  // Load Preset Layout
  const handleLoadPreset = () => {
    const preset = getPresetLayout(townHallLevel);
    setEntireState(preset);
    const updated: LayoutProject = {
      ...activeLayout,
      townHallLevel,
      buildings: preset,
      updatedAt: new Date().toISOString(),
    };
    setActiveLayout(updated);
    saveLayout(updated);
    showToast(`Đã nạp mẫu bố cục chuẩn cho Town Hall ${townHallLevel}.`);
  };

  // Clear Map
  const handleClearMap = () => {
    if (buildings.length === 0) return;
    if (window.confirm("Bạn có chắc chắn muốn dọn sạch toàn bộ công trình và tường trên bản đồ?")) {
      handleUpdateBuildings([]);
      setSelectedPlacedId(null);
      setSelectedDefId(null);
      showToast("Đã dọn sạch bản đồ.");
    }
  };

  // Export PNG
  const handleExportPNG = async () => {
    try {
      await exportLayoutAsImage(buildings, townHallLevel);
      showToast("Đã xuất file ảnh PNG bản đồ thành công!");
    } catch (e) {
      showToast("Lỗi khi xuất ảnh bản đồ.");
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    try {
      exportLayoutAsJSON(buildings, townHallLevel);
      showToast("Đã xuất dữ liệu bố cục JSON thành công!");
    } catch (e) {
      showToast("Lỗi khi xuất JSON.");
    }
  };

  // Import JSON
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importLayoutFromJSON(file);
      const newLayout: LayoutProject = {
        id: `imported-${Date.now()}`,
        name: data.name || `TH${data.townHallLevel} Nhập khẩu`,
        townHallLevel: data.townHallLevel,
        buildings: data.buildings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveLayout(newLayout);
      handleSelectLayout(newLayout);
      showToast(`Đã nhập bố cục "${data.name}" thành công!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi khi nhập tệp JSON.");
    } finally {
      e.target.value = "";
    }
  };

  // Start HTML5 drag for new building from sidebar
  const handleStartDragNew = (e: React.DragEvent, defId: string) => {
    e.dataTransfer.setData("text/plain", defId);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Count chain issues
  const chainAnalysis = useMemo(() => {
    if (!settings.showChainLightning) return { dangerPairs: [] };
    return scanChainLightningHazards(buildings, settings.chainMaxDistance);
  }, [buildings, settings.showChainLightning, settings.chainMaxDistance]);

  return (
    <section className="base-planner-module">
      {/* Toast Notification */}
      {notification && (
        <div className="planner-toast">
          <CheckCircle2 />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header Control & Tactical Toolbar */}
      <TacticalToolbar
        townHallLevel={townHallLevel}
        onTownHallChange={handleTownHallChange}
        settings={settings}
        onUpdateSettings={setSettings}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={handleClearMap}
        onLoadPreset={handleLoadPreset}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        chainIssuesCount={chainAnalysis.dangerPairs.length}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        placedCount={buildings.length}
        defenseScore={defenseScoreResult}
        activeLayoutName={activeLayout.name}
        onOpenLayoutManager={() => setIsLayoutModalOpen(true)}
        autoSaveTime={autoSaveTime}
      />

      {/* Main Workspace: Inventory Sidebar (Left) + Canvas Grid & Defense Score (Right) */}
      <div className="planner-workspace-grid">
        {/* Left: Inventory Sidebar */}
        <InventorySidebar
          townHallLevel={townHallLevel}
          buildingLimits={buildingLimits}
          placedBuildings={buildings}
          selectedBuildingDefId={selectedDefId}
          onSelectBuildingDef={setSelectedDefId}
          onStartDragNew={handleStartDragNew}
          wallBrushActive={settings.wallBrushActive}
          onToggleWallBrush={() =>
            setSettings((s) => ({
              ...s,
              wallBrushActive: !s.wallBrushActive,
              eraserActive: false,
            }))
          }
        />

        {/* Center/Right: 60 FPS HTML5 Canvas Grid Board + Collapsible Defense Scorer */}
        <div className="planner-canvas-container flex flex-col gap-4">
          <CanvasGridBoard
            buildings={buildings}
            onUpdateBuildings={handleUpdateBuildings}
            selectedDefId={selectedDefId}
            onClearSelectedDef={() => setSelectedDefId(null)}
            selectedPlacedId={selectedPlacedId}
            onSelectPlacedId={setSelectedPlacedId}
            buildingLimits={buildingLimits}
            settings={settings}
            zoomLevel={zoomLevel}
          />

          {/* Real-Time Defense Score & Analytics Panel */}
          {settings.showDefenseScore && (
            <div className="w-full">
              <DefenseScorePanel
                defenseScore={defenseScoreResult}
                onClose={() => setSettings((s) => ({ ...s, showDefenseScore: false }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Layout Manager Modal */}
      <LayoutManagerModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        activeLayout={activeLayout}
        onSelectLayout={handleSelectLayout}
        onRefreshLayouts={() => {
          const all = getSavedLayouts();
          const current = all.find((l) => l.id === activeLayout.id);
          if (current) setActiveLayout(current);
        }}
        autoSaveTime={autoSaveTime}
      />

      {/* TH Downgrade Validation Modal */}
      {pendingTHChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#1e272e] border border-[#ff3f34] p-6 rounded-lg max-w-lg w-full shadow-xl">
            <h2 className="text-xl font-bold text-[#ff3f34] flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6" /> Cảnh báo Hạ Cấp Town Hall
            </h2>
            <p className="text-gray-300 mb-4 text-sm leading-relaxed">
              Bạn đang chuyển xuống Town Hall {pendingTHChange.newTH}, nhưng bản đồ hiện tại đang có các công trình vượt quá giới hạn của cấp độ này.
            </p>
            <ul className="text-xs text-gray-400 mb-6 bg-black/40 p-3 rounded h-32 overflow-y-auto space-y-1">
              {pendingTHChange.issues.map((issue, idx) => (
                <li key={idx} className="flex gap-2"><span className="text-[#ff3f34]">•</span> {issue}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => applyTownHallChange(pendingTHChange.newTH, pendingTHChange.validBuildings)}
                className="w-full py-2 bg-[#ff3f34] text-white font-semibold rounded hover:bg-red-700 transition-colors"
              >
                Xóa các công trình không hợp lệ
              </button>
              <button
                onClick={() => applyTownHallChange(pendingTHChange.newTH, buildings)}
                className="w-full py-2 bg-[#ffc048] text-black font-semibold rounded hover:bg-yellow-600 transition-colors"
              >
                Giữ nguyên bản đồ (Lưu cảnh báo)
              </button>
              <button
                onClick={() => setPendingTHChange(null)}
                className="w-full py-2 bg-gray-600 text-white font-semibold rounded hover:bg-gray-500 transition-colors mt-2"
              >
                Hủy đổi Town Hall
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default BasePlannerTab;
