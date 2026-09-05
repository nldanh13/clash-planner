import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  AlertTriangle,
  Castle,
  CheckCircle2,
  Eye,
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
import { VerticalTacticalToolbar } from "./VerticalTacticalToolbar";
import { CoCBuildingTray } from "./CoCBuildingTray";
import { EditorBlueprintHeader } from "./EditorBlueprintHeader";
import { BlueprintManagerModal } from "./BlueprintManagerModal";
import { NewBlueprintWizardModal } from "./NewBlueprintWizardModal";
import { CanvasGridBoard } from "./CanvasGridBoard";
import { IsometricGridBoard } from "./IsometricGridBoard";
import { DefenseScorePanel } from "./DefenseScorePanel";
import { DecorativeDesignPanel } from "./DecorativeDesignPanel";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { SignInRequiredGate } from "./SignInRequiredGate";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n";

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
  const { t } = useTranslation();

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

  // Floating panels for Analysis (defense score) and Decorate mode
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState(false);
  const [isDecorateModalOpen, setIsDecorateModalOpen] = useState(false);

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

  useEffect(() => {
    if (settings.plannerMode === "analysis") {
      setIsDefenseModalOpen(true);
      setIsDecorateModalOpen(false);
    } else if (settings.plannerMode === "decorate") {
      setIsDecorateModalOpen(true);
      setIsDefenseModalOpen(false);
    } else {
      setIsDefenseModalOpen(false);
      setIsDecorateModalOpen(false);
    }
  }, [settings.plannerMode]);

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

  // The fullscreen overlay is `position: fixed` over the whole viewport, but
  // on mobile a touch-drag can still rubber-band the page underneath it
  // (visible as a flash of background content sliding behind the overlay).
  // Locking body scroll while it's open closes that gap.
  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  // Zen Mode (Full map viewing mode: hides top bar, tactical toolbar and building tray)
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing inside an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") {
        setIsZenMode((prev) => !prev);
      } else if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZenMode]);

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

  // Check whether the user is actively arranging an existing or new building
  const isArranging = Boolean(selectedPlacedId || selectedDefId || selectedDecorationDefId);

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

  // Delete currently selected placed building
  const handleDeleteSelectedPlaced = useCallback(() => {
    if (!selectedPlacedId) return;
    const updated = buildings.filter((b) => b.instanceId !== selectedPlacedId);
    handleUpdateBuildings(updated);
    setSelectedPlacedId(null);
  }, [buildings, handleUpdateBuildings, selectedPlacedId]);

  // Global keydown handler: Escape to deselect or exit fullscreen; Delete/Backspace to remove selected building
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in form inputs
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (selectedPlacedId) {
          setSelectedPlacedId(null);
        } else if (selectedDefId) {
          setSelectedDefId(null);
        } else if (selectedDecorationDefId) {
          setSelectedDecorationDefId(null);
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedPlacedId) {
        e.preventDefault();
        handleDeleteSelectedPlaced();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleDeleteSelectedPlaced,
    isFullscreen,
    selectedDecorationDefId,
    selectedDefId,
    selectedPlacedId,
  ]);

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
      showToast(t("basePlanner.tab.savedAt", { time: timeStr }));
    } catch {
      setSaveStatus("error");
      showToast(t("basePlanner.tab.saveFailed"));
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
    showToast(t("basePlanner.tab.opened", { name: layout.name, th: layout.townHallLevel }));
  };

  // Rename layout
  const handleRename = (newName: string) => {
    if (!activeLayout) return { success: false, error: t("basePlanner.tab.notSelected") };
    const res = renameLayout(activeLayout.id, newName);
    if (res.success) {
      setActiveLayout((prev) => (prev ? { ...prev, name: newName } : null));
      showToast(t("basePlanner.tab.renamed", { name: newName }));
    }
    return res;
  };

  // Duplicate layout
  const handleDuplicate = () => {
    if (!activeLayout) return;
    const cloned = duplicateLayout(activeLayout.id);
    if (cloned) {
      applySelectedLayout(cloned);
      showToast(t("basePlanner.tab.duplicated", { name: cloned.name }));
    }
  };

  // Duplicate to another TH
  const handleDuplicateToTownHall = (targetTH: number) => {
    if (!activeLayout) return;
    const cloned = duplicateLayout(activeLayout.id, targetTH);
    if (cloned) {
      applySelectedLayout(cloned);
      showToast(t("basePlanner.tab.duplicatedAtTH", { th: targetTH, name: cloned.name }));
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
    if (window.confirm(t("basePlanner.tab.confirmClearMap"))) {
      handleUpdateBuildings([]);
      setSelectedPlacedId(null);
      setSelectedDefId(null);
      showToast(t("basePlanner.tab.clearedMap"));
    }
  };

  // Export PNG
  const handleExportPNG = async () => {
    try {
      await exportLayoutAsImage(buildings, townHallLevel, activeLayout?.name);
      showToast(t("basePlanner.tab.exportedPng"));
    } catch {
      showToast(t("basePlanner.tab.exportPngError"));
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    try {
      exportLayoutAsJSON(buildings, townHallLevel, activeLayout?.name);
      showToast(t("basePlanner.tab.exportedJson"));
    } catch {
      showToast(t("basePlanner.tab.exportJsonError"));
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
        name: data.name || t("basePlanner.tab.importedName", { th: data.townHallLevel }),
        townHallLevel: data.townHallLevel,
        purpose: "hybrid",
        creationMethod: "import",
        buildings: data.buildings,
        catalogVersion: CURRENT_CATALOG_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      applySelectedLayout(newLayout);
      showToast(t("basePlanner.tab.importedJson", { name: data.name }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("basePlanner.tab.importJsonError"));
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
        showToast(t("basePlanner.tab.noSafeFix"));
        return;
      }

      createCheckpoint(activeLayout.id, t("basePlanner.tab.fixCheckpointReason"), buildings);
      handleUpdateBuildings(fix.updatedBuildings);
      setAutoFixPreview(fix);
      showToast(t("basePlanner.tab.fixApplied", { count: fix.resolvedHoleCount }));
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
    <section className={`base-planner-module ${isFullscreen ? "planner-fullscreen" : ""}`}>
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
          {!isZenMode && (
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
              onExportPNG={handleExportPNG}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
              onOpenDefenseScore={() => {
                setIsDefenseModalOpen(true);
                setSettings((s) => ({ ...s, plannerMode: "analysis" }));
              }}
              defenseScore={defenseScoreResult}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode((prev) => !prev)}
            />
          )}

          {/* Main Planner Workspace */}
          <div className="planner-main-layout relative w-full h-full flex-1 min-h-0 overflow-hidden">
            {/* Full-bleed Map Canvas (2D editable board or 3D Isometric view) */}
            <main className="w-full h-full min-h-0 min-w-0 relative flex-1 overflow-hidden">
              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-3 right-16 z-[10000] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold shadow-2xl transition-colors cursor-pointer"
                  title={t("basePlanner.tab.exitFullscreenTitle")}
                  aria-label={t("basePlanner.toolbar.exitFullscreenAria")}
                >
                  <Minimize className="w-3.5 h-3.5" />
                  <span>{t("basePlanner.tab.exitFullscreenTitle")}</span>
                </button>
              )}

              {settings.viewMode === "isometric" ? (
                <ErrorBoundary
                  fallbackTitle={t("basePlanner.tab.isoErrorTitle")}
                  fallbackMessage={t("basePlanner.tab.isoErrorMessage")}
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
                    townHallLevel={townHallLevel}
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
                  townHallLevel={townHallLevel}
                  decorations={decorations}
                  onUpdateDecorations={handleUpdateDecorations}
                  selectedDecorationDefId={selectedDecorationDefId}
                  stampPreviewCoords={stampPreviewCoords}
                />
              )}

              {/* Right Vertical Tactical Toolbar */}
              {!isZenMode && (
                <VerticalTacticalToolbar
                  settings={settings}
                  onUpdateSettings={setSettings}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undo}
                  onRedo={redo}
                  onClear={handleClearMap}
                  zoomLevel={zoomLevel}
                  zoomMode={zoomMode}
                  onZoomChange={(newZoom, mode) => {
                    setZoomLevel(newZoom);
                    setZoomMode(mode || "manual");
                  }}
                  placedCount={buildings.length}
                  onFitMap={handleFitMap}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
                  viewMode={settings.viewMode}
                  onViewModeChange={(mode: PlannerViewMode) => setSettings((s) => ({ ...s, viewMode: mode }))}
                  isZenMode={isZenMode}
                  onToggleZenMode={() => setIsZenMode((prev) => !prev)}
                  isArranging={isArranging}
                />
              )}

              {/* Bottom In-Map Building Tray (Clash of Clans Village Edit Mode Style) */}
              {!isZenMode && (
                <CoCBuildingTray
                  townHallLevel={townHallLevel}
                  buildingLimits={buildingLimits}
                  placedBuildings={buildings}
                  selectedBuildingDefId={selectedDefId}
                  onSelectBuildingDef={(id) => {
                    setSelectedDefId(id);
                    if (id) setSelectedDecorationDefId(null);
                  }}
                  selectedDecorationDefId={selectedDecorationDefId}
                  onSelectDecorationDefId={(id) => {
                    setSelectedDecorationDefId(id);
                    if (id) setSelectedDefId(null);
                  }}
                  placedDecorations={decorations}
                  onStartDragNew={handleStartDragNew}
                  wallBrushActive={settings.wallBrushActive}
                  onToggleWallBrush={() =>
                    setSettings((s) => ({
                      ...s,
                      wallBrushActive: !s.wallBrushActive,
                      eraserActive: false,
                    }))
                  }
                  isZenMode={isZenMode}
                  onToggleZenMode={() => setIsZenMode((prev) => !prev)}
                  selectedPlacedId={selectedPlacedId}
                  onDeselectPlaced={() => setSelectedPlacedId(null)}
                  onDeletePlaced={handleDeleteSelectedPlaced}
                />
              )}

              {/* Zen Mode Restore Floating Button */}
              {isZenMode && (
                <button
                  type="button"
                  onClick={() => setIsZenMode(false)}
                  className="absolute bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-amber-500/50 text-amber-300 font-bold text-xs sm:text-sm shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 animate-in fade-in"
                  title="Nhấn phím H hoặc nhấp vào đây để hiện lại thanh công cụ và khay công trình"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Hiện giao diện (Phím H)</span>
                </button>
              )}

              {/* Modal / Slide-in Drawer: Defense Score Panel (Analysis mode) */}
              {isDefenseModalOpen && (
                <div className="absolute top-3 left-3 z-40 w-80 sm:w-96 max-h-[calc(100%-140px)] flex flex-col rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
                  <DefenseScorePanel
                    defenseScore={defenseScoreResult}
                    onClose={() => {
                      setIsDefenseModalOpen(false);
                      setSettings((s) => ({ ...s, plannerMode: "design" }));
                    }}
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
                </div>
              )}

              {/* Modal / Slide-in Drawer: Decorative Design Panel (Decorate mode) */}
              {isDecorateModalOpen && (
                <div className="absolute top-3 left-3 z-40 w-80 sm:w-96 max-h-[calc(100%-140px)] flex flex-col rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
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
                    onClose={() => {
                      setIsDecorateModalOpen(false);
                      setSettings((s) => ({ ...s, plannerMode: "design" }));
                    }}
                  />
                </div>
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
              <AlertTriangle className="w-5 h-5" /> {t("basePlanner.recovery.title")}
            </h2>
            <p className="text-slate-300 mb-4 text-xs leading-relaxed">
              {t("basePlanner.recovery.description", { name: pendingRecovery.layout.name, th: pendingRecovery.layout.townHallLevel })}
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
                {t("basePlanner.recovery.autoFix")}
              </button>
              <button
                onClick={() => setPendingRecovery(null)}
                className="w-full py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition-colors"
              >
                {t("basePlanner.recovery.discard")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default BasePlannerTab;
