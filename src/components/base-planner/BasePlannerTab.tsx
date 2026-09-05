import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  AlertTriangle,
  Castle,
  CheckCircle2,
  FolderOpen,
  LayoutGrid,
  LoaderCircle,
  Minimize,
  Plus,
  Shield,
} from "lucide-react";
import { exportLayoutAsImage, exportLayoutAsJSON, importLayoutFromJSON } from "./ExportUtils";
import { validateLayout, type ValidationIssue } from "./LayoutValidator";
import { getAllBuildingLimits } from "./buildingLimits";
import { CURRENT_CATALOG_VERSION } from "./catalog";
import { CELL_SIZE_PX } from "./constants";
import { evaluateBaseDefense } from "./defenseScorer";
import { scanChainLightningHazards } from "./chainLightningUtils";
import { suggestDeploymentAutoFix, type AutoFixResult } from "./deploymentAutoFix";
import {
  createCheckpoint,
  duplicateLayout,
  getActiveLayoutId,
  getSavedLayouts,
  renameLayout,
  saveLayout,
  setActiveLayoutId,
} from "./layoutStorage";
import { useBasePlannerHistory } from "./useBasePlannerHistory";
import type { LayoutProject, PlacedBuilding, PlacedDecoration, PlannerViewMode, TacticalSettings } from "./types";
import TacticalToolbar from "./TacticalToolbar";
import { EditorBlueprintHeader } from "./EditorBlueprintHeader";
import { BlueprintManagerModal } from "./BlueprintManagerModal";
import { NewBlueprintWizardModal } from "./NewBlueprintWizardModal";
import { InventorySidebar } from "./InventorySidebar";
import { CanvasGridBoard } from "./CanvasGridBoard";
import { IsometricGridBoard } from "./IsometricGridBoard";
import { DefenseScorePanel } from "./DefenseScorePanel";
import { DecorativeDesignPanel } from "./DecorativeDesignPanel";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { SignInRequiredGate } from "./SignInRequiredGate";
import { useAuth } from "../../contexts/AuthContext";

interface BasePlannerTabProps {
  initialTownHall?: number;
  onBackToPreviousTab?: () => void;
}

export function BasePlannerTab({
  initialTownHall = 11,
  onBackToPreviousTab,
}: BasePlannerTabProps) {
  // Layouts persist to the signed-in user's Firestore doc (see useCloudSync) —
  // a guest's work only lives in this browser's localStorage, so the whole tab
  // is gated behind sign-in rather than risking silent data loss.
  const { user, loading: authLoading } = useAuth();

  // Active Layout state: auto-load last active or first layout if available
  const [activeLayout, setActiveLayout] = useState<LayoutProject | null>(() => {
    const activeId = getActiveLayoutId();
    const saved = getSavedLayouts();
    if (activeId) {
      const found = saved.find((l) => l.id === activeId);
      if (found) return found;
    }
    return saved[0] || null;
  });

  // Modals state: the manager only auto-opens when there's genuinely nothing to
  // show yet (no saved layout) — not on every visit to the tab, which used to
  // pop it up over whatever the user was already working on.
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(() => !activeLayout);
  const [isNewWizardOpen, setIsNewWizardOpen] = useState<boolean>(false);
  const [wizardInitialTH, setWizardInitialTH] = useState<number>(initialTownHall);

  // Save status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "manual">("fit");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Validation recovery
  const [pendingRecovery, setPendingRecovery] = useState<{
    layout: LayoutProject;
    validBuildings: PlacedBuilding[];
    sanitizedBuildings: PlacedBuilding[];
    issues: ValidationIssue[];
  } | null>(null);

  // Mobile Segmented View: 'map' (default) vs 'inventory'
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<"map" | "inventory">("map");

  const [settings, setSettings] = useState<TacticalSettings>({
    plannerMode: "design",
    showBuildingNames: true,
    showBuildingLevels: false,
    showRanges: "selected",
    showChainLightning: "none",
    showHeatmap: false,
    showDefenseScore: false,
    showGrid: true,
    showCoordinates: false,
    wallBrushActive: false,
    eraserActive: false,
    deploymentDisplayMode: "off",
    viewMode: "2d",
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
    initialState: () => activeLayout?.buildings || [],
  });

  // Cosmetic decorations: deliberately NOT part of the undo/redo `buildings`
  // history (kept as a simple, separately-saved layer — see decorationCatalog.ts).
  const [decorations, setDecorations] = useState<PlacedDecoration[]>(() => activeLayout?.decorations || []);
  const [selectedDecorationDefId, setSelectedDecorationDefId] = useState<string | null>(null);
  const [stampPreviewCoords, setStampPreviewCoords] = useState<{ x: number; y: number }[] | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always ensure manager is open when entering Base Planner tab without active layout
  useEffect(() => {
    if (!activeLayout) {
      setIsManagerOpen(true);
    }
  }, [activeLayout]);

  // A stale auto-fix preview from a different layout is worse than no preview.
  useEffect(() => {
    setAutoFixPreview(null);
  }, [activeLayout?.id]);

  // Fullscreen canvas mode covers the whole viewport (including the toolbar's
  // own exit button) with position:fixed, so Escape must work independently
  // of any on-screen control — otherwise the user is stuck until they refresh.
  // (This is CSS `.canvas-fullscreen`, not the browser's native Fullscreen
  // API, so the native Esc-to-exit behavior doesn't apply here for free.)
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  // Close manager logic adhering to specs:
  // - If active layout exists: close modal and return to its editor
  // - If no active layout exists: return user to the previous tab
  const handleCloseManager = () => {
    if (activeLayout) {
      setIsManagerOpen(false);
    } else {
      if (onBackToPreviousTab) {
        onBackToPreviousTab();
      } else {
        setIsManagerOpen(true);
      }
    }
  };

  // townHallLevel is strictly derived from activeLayout
  const townHallLevel = activeLayout ? activeLayout.townHallLevel : wizardInitialTH;

  // Dynamic Building Limits for current TH
  const buildingLimits = useMemo(() => {
    return getAllBuildingLimits(townHallLevel);
  }, [townHallLevel]);

  // Real-time 3-Star Defense Score Calculation (Deployment Zone analysis included)
  const purpose = activeLayout?.purpose || "hybrid";
  const defenseScoreResult = useMemo(() => {
    return evaluateBaseDefense(buildings, townHallLevel, purpose);
  }, [buildings, townHallLevel, purpose]);

  // Deployment Zone auto-fix preview/apply state
  const [autoFixPreview, setAutoFixPreview] = useState<AutoFixResult | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);

  // Notify user with auto-dismiss
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Push buildings update and persist to active layout with 500ms debounce
  const handleUpdateBuildings = useCallback(
    (newBuildings: PlacedBuilding[], replace: boolean = false) => {
      if (replace) {
        replaceState(newBuildings);
      } else {
        pushState(newBuildings);
      }

      if (!activeLayout) return;

      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          const updated = saveLayout({
            ...activeLayout,
            buildings: newBuildings,
          });
          setActiveLayout(updated);
          setSaveStatus("saved");
          setLastSavedTime(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        } catch {
          setSaveStatus("error");
        }
      }, 500); // 500ms debounce autosave
    },
    [activeLayout, pushState, replaceState]
  );

  // Decorations are cosmetic-only and saved immediately (no undo/redo history,
  // no debounce — the interaction volume is far lower than building placement).
  const handleUpdateDecorations = useCallback(
    (newDecorations: PlacedDecoration[]) => {
      setDecorations(newDecorations);
      if (!activeLayout) return;
      try {
        const updated = saveLayout({ ...activeLayout, buildings, decorations: newDecorations });
        setActiveLayout(updated);
      } catch {
        setSaveStatus("error");
      }
    },
    [activeLayout, buildings]
  );

  // Manual Instant Save
  const handleSaveManual = () => {
    if (!activeLayout) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    try {
      const updated = saveLayout({
        ...activeLayout,
        buildings,
        decorations,
      });
      setActiveLayout(updated);
      setSaveStatus("saved");
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedTime(timeStr);
      showToast(`Đã lưu bản thiết kế lúc ${timeStr}!`);
    } catch {
      setSaveStatus("error");
      showToast("Lưu bản thiết kế thất bại.");
    }
  };

  // Switch Active Layout from Project Manager
  const handleSelectLayout = (layout: LayoutProject) => {
    const res = validateLayout(layout.buildings, layout.townHallLevel);
    if (!res.isValid || res.hasWarnings) {
      setPendingRecovery({
        layout,
        validBuildings: res.validBuildings,
        sanitizedBuildings: res.sanitizedBuildings,
        issues: res.issues,
      });
      return;
    }
    applySelectedLayout(layout);
  };

  const applySelectedLayout = (layout: LayoutProject) => {
    setActiveLayout(layout);
    setActiveLayoutId(layout.id);
    setEntireState(layout.buildings || []);
    setDecorations(layout.decorations || []);
    setSelectedDecorationDefId(null);
    setStampPreviewCoords(null);
    setSelectedPlacedId(null);
    setSelectedDefId(null);
    setSaveStatus("saved");
    setLastSavedTime(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
    showToast(`Đã mở bản thiết kế: "${layout.name}" (TH${layout.townHallLevel})`);
  };

  // Rename layout
  const handleRename = (newName: string) => {
    if (!activeLayout) return { success: false, error: "Chưa chọn bản thiết kế." };
    const res = renameLayout(activeLayout.id, newName);
    if (res.success) {
      setActiveLayout((prev) => (prev ? { ...prev, name: newName } : null));
      showToast(`Đã đổi tên thành: "${newName}"`);
    }
    return res;
  };

  // Duplicate layout
  const handleDuplicate = () => {
    if (!activeLayout) return;
    const cloned = duplicateLayout(activeLayout.id);
    if (cloned) {
      applySelectedLayout(cloned);
      showToast(`Đã tạo bản sao: "${cloned.name}"`);
    }
  };

  // Duplicate to another TH
  const handleDuplicateToTownHall = (targetTH: number) => {
    if (!activeLayout) return;
    const cloned = duplicateLayout(activeLayout.id, targetTH);
    if (cloned) {
      applySelectedLayout(cloned);
      showToast(`Đã tạo bản sao tại TH${targetTH}: "${cloned.name}"`);
    }
  };

  // Open Manager with safe check
  const handleOpenManager = () => {
    if (saveStatus === "unsaved" || saveStatus === "saving") {
      handleSaveManual();
    }
    setIsManagerOpen(true);
  };

  // Fit Map zoom
  const handleFitMap = () => {
    setZoomMode("fit");
    const container = document.querySelector(".grid-canvas-viewport");
    if (container) {
      container.scrollTo({
        left: Math.max(0, (container.scrollWidth - container.clientWidth) / 2),
        top: Math.max(0, (container.scrollHeight - container.clientHeight) / 2),
        behavior: "smooth",
      });
    }
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
      await exportLayoutAsImage(buildings, townHallLevel, activeLayout?.name);
      showToast("Đã xuất tệp ảnh PNG bản đồ thành công!");
    } catch {
      showToast("Lỗi khi xuất ảnh bản đồ.");
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    try {
      exportLayoutAsJSON(buildings, townHallLevel, activeLayout?.name);
      showToast("Đã xuất dữ liệu bố cục JSON thành công!");
    } catch {
      showToast("Lỗi khi xuất JSON.");
    }
  };

  // Import JSON
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importLayoutFromJSON(file);
      const newLayout = saveLayout({
        id: `imported-${Date.now()}`,
        name: data.name || `TH${data.townHallLevel} Nhập khẩu`,
        townHallLevel: data.townHallLevel,
        purpose: "hybrid",
        creationMethod: "import",
        buildings: data.buildings,
        catalogVersion: CURRENT_CATALOG_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      applySelectedLayout(newLayout);
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

  // Deployment Zone: scroll+select the nearest dangerous hole in the 2D board.
  const handleViewDeploymentOnMap = () => {
    const deployment = defenseScoreResult.deployment;
    if (!deployment) return;
    const holes = deployment.regions.filter((r) => r.type === "internal-hole");
    if (holes.length === 0) return;

    const target = holes.reduce((best, r) => {
      const bestDist = best.minDistanceToTownHall ?? Infinity;
      const rDist = r.minDistanceToTownHall ?? Infinity;
      return rDist < bestDist ? r : best;
    }, holes[0]);
    const cell = target.cells[0];
    if (!cell) return;

    setSettings((s) => ({
      ...s,
      viewMode: "2d",
      plannerMode: "analysis",
      deploymentDisplayMode: s.deploymentDisplayMode === "off" ? "holes" : s.deploymentDisplayMode,
    }));

    requestAnimationFrame(() => {
      const container = document.querySelector(".grid-canvas-viewport");
      if (container) {
        const cellSize = Math.round(CELL_SIZE_PX * zoomLevel);
        container.scrollTo({
          left: Math.max(0, cell.x * cellSize - container.clientWidth / 2),
          top: Math.max(0, cell.y * cellSize - container.clientHeight / 2),
          behavior: "smooth",
        });
      }
    });
  };

  const handleSuggestDeploymentFix = () => {
    const fix = suggestDeploymentAutoFix(buildings, townHallLevel, purpose);
    setAutoFixPreview(fix);
  };

  const handleApplyDeploymentAutoFix = () => {
    if (!activeLayout) return;
    setIsApplyingFix(true);
    try {
      const fix =
        autoFixPreview && autoFixPreview.applied
          ? autoFixPreview
          : suggestDeploymentAutoFix(buildings, townHallLevel, purpose);

      if (!fix.applied) {
        setAutoFixPreview(fix);
        showToast("Không tìm được cách khắc phục an toàn cho các lỗ thả quân hiện tại.");
        return;
      }

      createCheckpoint(activeLayout.id, "Trước khi Tự động khắc phục Vùng triển khai", buildings);
      handleUpdateBuildings(fix.updatedBuildings);
      setAutoFixPreview(fix);
      showToast(`Đã tự động đóng ${fix.resolvedHoleCount} lỗ thả quân nguy hiểm.`);
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Count chain issues
  const chainAnalysis = useMemo(() => {
    if (settings.showChainLightning === "none") return { dangerPairs: [] };
    return scanChainLightningHazards(buildings, 2);
  }, [buildings, settings.showChainLightning]);

  if (authLoading) {
    return (
      <section className="base-planner-module flex items-center justify-center !min-h-[380px]">
        <LoaderCircle className="w-6 h-6 text-amber-400 animate-spin" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="base-planner-module">
        <SignInRequiredGate onBackToPreviousTab={onBackToPreviousTab} />
      </section>
    );
  }

  return (
    <section className="base-planner-module">
      {/* Toast Notification */}
      {notification && (
        <div className="planner-toast">
          <CheckCircle2 />
          <span>{notification}</span>
        </div>
      )}

      {/* When NO layout is selected, manager modal is opened directly (no intermediate screen) */}
      {!activeLayout ? null : (
        <>
          {/* Top Header Information & Lifecycle Controls */}
          <EditorBlueprintHeader
            layout={activeLayout}
            saveStatus={saveStatus}
            lastSavedTime={lastSavedTime}
            onSaveManual={handleSaveManual}
            onOpenManager={handleOpenManager}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onOpenNewWizard={(th) => {
              setWizardInitialTH(th || activeLayout.townHallLevel);
              setIsNewWizardOpen(true);
            }}
            onDuplicateToTownHall={handleDuplicateToTownHall}
          />

          {/* Tactical Toolbar for In-Canvas Design & Analysis operations */}
          <TacticalToolbar
            settings={settings}
            onUpdateSettings={setSettings}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onClear={handleClearMap}
            onExportPNG={handleExportPNG}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
            chainIssuesCount={chainAnalysis.dangerPairs.length}
            zoomLevel={zoomLevel}
            zoomMode={zoomMode}
            onZoomChange={(newZoom, mode) => {
              setZoomLevel(newZoom);
              setZoomMode(mode || "manual");
            }}
            placedCount={buildings.length}
            defenseScore={defenseScoreResult}
            onFitMap={handleFitMap}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            viewMode={settings.viewMode}
            onViewModeChange={(mode: PlannerViewMode) => setSettings((s) => ({ ...s, viewMode: mode }))}
          />

          {/* Mobile Segmented Workspace Tabs — hides at the same 768px breakpoint
              the .planner-main-layout CSS grid switches to a side-by-side layout at
              (md:hidden, not lg:hidden — using lg here left a 768-1024px dead zone
              where this switcher was visible but did nothing). */}
          <div className="md:hidden flex items-center gap-1.5 p-1 bg-[#0a151f] border border-slate-800 rounded-xl shadow-sm w-full max-w-full min-w-0">
            <button
              onClick={() => setMobileWorkspaceTab("map")}
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mobileWorkspaceTab === "map"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-label="Xem Bản đồ"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Bản đồ (Lưới 44x44)</span>
            </button>
            <button
              onClick={() => setMobileWorkspaceTab("inventory")}
              className={`flex-1 min-h-[42px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mobileWorkspaceTab === "inventory"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-label={
                settings.plannerMode === "design"
                  ? "Xem Kho công trình"
                  : settings.plannerMode === "decorate"
                  ? "Xem Trang trí & Hình dạng"
                  : "Xem Phân tích phòng thủ"
              }
            >
              {settings.plannerMode === "design" ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Kho công trình</span>
                  {selectedDefId && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </>
              ) : settings.plannerMode === "decorate" ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Trang trí</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Phân tích ({defenseScoreResult?.tier || "C"})</span>
                </>
              )}
            </button>
          </div>

          {/* Main Planner Grid Body */}
          <div
            className={`planner-main-layout w-full max-w-full min-w-0 overflow-hidden ${
              isSidebarCollapsed ? "sidebar-collapsed" : ""
            }`}
          >
            {/* Left: Building Inventory / Sidebar */}
            <aside
              className={`planner-sidebar-panel flex-col w-full h-full min-h-0 overflow-hidden ${
                isSidebarCollapsed
                  ? "hidden"
                  : mobileWorkspaceTab === "map"
                  ? "hidden md:flex"
                  : "flex"
              }`}
            >
              {settings.plannerMode === "design" ? (
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
              ) : settings.plannerMode === "decorate" ? (
                <DecorativeDesignPanel
                  buildings={buildings}
                  decorations={decorations}
                  townHallLevel={townHallLevel}
                  buildingLimits={buildingLimits}
                  onUpdateBuildings={handleUpdateBuildings}
                  onUpdateDecorations={handleUpdateDecorations}
                  selectedDecorationDefId={selectedDecorationDefId}
                  onSelectDecorationDefId={setSelectedDecorationDefId}
                  onStampPreviewChange={setStampPreviewCoords}
                  showToast={showToast}
                />
              ) : (
                <DefenseScorePanel
                  defenseScore={defenseScoreResult}
                  onClose={() => setSettings((s) => ({ ...s, plannerMode: "design" }))}
                  deploymentContext={{
                    purpose,
                    buildings,
                    autoFixPreview,
                    isApplyingFix,
                    onViewOnMap: handleViewDeploymentOnMap,
                    onSuggestFix: handleSuggestDeploymentFix,
                    onApplyAutoFix: handleApplyDeploymentAutoFix,
                    onDismissPreview: () => setAutoFixPreview(null),
                  }}
                />
              )}
            </aside>

            {/* Center: Grid Canvas (2D editable board, or read-only Isometric view) */}
            <main
              className={`planner-canvas-panel flex-col w-full h-full min-h-0 min-w-0 relative overflow-hidden ${
                isFullscreen ? "canvas-fullscreen" : ""
              } ${mobileWorkspaceTab === "inventory" ? "hidden md:flex" : "flex"}`}
            >
              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold shadow-2xl transition-colors cursor-pointer"
                  title="Thoát toàn màn hình (Esc)"
                  aria-label="Thoát toàn màn hình"
                >
                  <Minimize className="w-3.5 h-3.5" />
                  <span>Thoát toàn màn hình (Esc)</span>
                </button>
              )}

              {settings.viewMode === "isometric" ? (
                <ErrorBoundary
                  fallbackTitle="Lỗi hiển thị sa bàn Isometric"
                  fallbackMessage="Đã cách ly sự cố hiển thị sa bàn 3D. Bạn có thể khôi phục góc nhìn hoặc chuyển về chế độ 2D."
                >
                  <IsometricGridBoard
                    buildings={buildings}
                    onUpdateBuildings={handleUpdateBuildings}
                    selectedDefId={selectedDefId}
                    onClearSelectedDef={() => setSelectedDefId(null)}
                    selectedPlacedId={selectedPlacedId}
                    onSelectPlacedId={setSelectedPlacedId}
                    buildingLimits={buildingLimits}
                    settings={settings}
                  />
                </ErrorBoundary>
              ) : (
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
                  zoomMode={zoomMode}
                  onZoomChange={(newZoom, mode) => {
                    setZoomLevel(newZoom);
                    if (mode) setZoomMode(mode);
                  }}
                  decorations={decorations}
                  onUpdateDecorations={handleUpdateDecorations}
                  selectedDecorationDefId={settings.plannerMode === "decorate" ? selectedDecorationDefId : null}
                  stampPreviewCoords={settings.plannerMode === "decorate" ? stampPreviewCoords : null}
                />
              )}
            </main>
          </div>
        </>
      )}

      {/* Blueprint Manager Modal (Central Hub) */}
      <BlueprintManagerModal
        isOpen={isManagerOpen}
        onClose={handleCloseManager}
        activeLayout={activeLayout}
        onSelectLayout={(layout) => {
          handleSelectLayout(layout);
          setIsManagerOpen(false);
        }}
        onOpenNewWizard={() => {
          setWizardInitialTH(activeLayout?.townHallLevel || initialTownHall);
          setIsManagerOpen(false);
          setIsNewWizardOpen(true);
        }}
      />

      {/* New Blueprint Creation Wizard Modal (4-step unified flow) */}
      <NewBlueprintWizardModal
        isOpen={isNewWizardOpen}
        onClose={() => setIsNewWizardOpen(false)}
        onCreated={(createdLayout) => {
          applySelectedLayout(createdLayout);
          setIsNewWizardOpen(false);
          setIsManagerOpen(false);
        }}
        initialTownHall={wizardInitialTH}
      />

      {/* Recovery Modal for validation errors */}
      {pendingRecovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#121c24] border border-amber-500/40 p-6 rounded-2xl max-w-lg w-full shadow-2xl">
            <h2 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" /> Phát hiện xung đột dữ liệu bố cục
            </h2>
            <p className="text-slate-300 mb-4 text-xs leading-relaxed">
              Bản thiết kế &quot;{pendingRecovery.layout.name}&quot; có một số công trình vượt giới
              hạn hoặc không khớp với Town Hall {pendingRecovery.layout.townHallLevel}.
            </p>
            <ul className="text-xs text-slate-400 mb-6 bg-black/40 p-3 rounded-xl h-28 overflow-y-auto space-y-1">
              {pendingRecovery.issues.map((issue, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className={issue.type === "critical" ? "text-rose-400" : "text-amber-400"}>
                    •
                  </span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const sanitized = {
                    ...pendingRecovery.layout,
                    buildings: pendingRecovery.sanitizedBuildings,
                  };
                  saveLayout(sanitized);
                  applySelectedLayout(sanitized);
                  setPendingRecovery(null);
                }}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tự động chuẩn hóa và mở bản thiết kế
              </button>
              <button
                onClick={() => setPendingRecovery(null)}
                className="w-full py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition-colors"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default BasePlannerTab;
