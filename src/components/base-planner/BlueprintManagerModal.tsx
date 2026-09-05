import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit2,
  FileUp,
  Filter,
  FolderOpen,
  Grid,
  Hammer,
  History,
  Layers,
  List,
  MoreVertical,
  Palette,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Wheat,
  X,
} from "lucide-react";
import type { BasePurpose, CreationMethod, LayoutProject, LayoutStatus } from "./types";
import {
  METHOD_LABELS,
  PURPOSE_LABELS,
  STATUS_LABELS,
  computeLayoutStatus,
  formatRelativeUpdateTime,
  getLayoutPlacementStats,
  isLayoutNameDuplicate,
  normalizeLayoutName,
} from "./blueprintUtils";
import {
  createVariantLayout,
  duplicateLayout,
  emptyTrash,
  exportLibraryJSON,
  getAllLayoutsRaw,
  getSavedLayouts,
  getTrashLayouts,
  moveToTrash,
  parseImportedLayoutJSON,
  permanentlyDeleteLayout,
  renameLayout,
  restoreFromTrash,
  saveLayout,
  serializeLayout,
  STORAGE_KEY_VIEW_MODE,
  supplementMissingObjects,
  togglePinLayout,
  TRASH_EXPIRY_MS,
  updateLayoutToCurrentCatalog,
} from "./layoutStorage";
import { getTownHallRequirements } from "./catalog";
import { BlueprintThumbnail } from "./BlueprintThumbnail";
import { CheckpointModal } from "./CheckpointModal";
import { CatalogUpdateReportModal } from "./CatalogUpdateReportModal";
import { LibraryImportModal } from "./LibraryImportModal";
import type { ValidationIssue } from "./LayoutValidator";
import { useTranslation } from "../../i18n";

interface BlueprintManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayout: LayoutProject | null;
  onSelectLayout: (layout: LayoutProject) => void;
  onOpenNewWizard: () => void;
}

export type SortOption = "default" | "updated" | "created" | "name" | "th-asc" | "th-desc";

export interface BlueprintFilters {
  townHalls: number[];
  purposes: BasePurpose[];
  methods: CreationMethod[];
  statuses: LayoutStatus[];
  onlyPinned?: boolean;
  sortBy: SortOption;
}

const defaultFilters: BlueprintFilters = {
  townHalls: [],
  purposes: [],
  methods: [],
  statuses: [],
  onlyPinned: false,
  sortBy: "default",
};

export function BlueprintManagerModal({
  isOpen,
  onClose,
  activeLayout,
  onSelectLayout,
  onOpenNewWizard,
}: BlueprintManagerModalProps) {
  const { t } = useTranslation();
  // Tabs: "active" (Danh sách bản thiết kế) | "trash" (Thùng rác)
  const [currentTab, setCurrentTab] = useState<"active" | "trash">("active");

  const [layouts, setLayouts] = useState<LayoutProject[]>(() => getSavedLayouts());
  const [trashLayouts, setTrashLayouts] = useState<LayoutProject[]>(() => getTrashLayouts());
  const [searchTerm, setSearchTerm] = useState<string>("");

  // View mode: Grid vs List (persisted in localStorage)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem(STORAGE_KEY_VIEW_MODE) as "grid" | "list") || "grid";
  });

  // Filters State
  const [filters, setFilters] = useState<BlueprintFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<BlueprintFilters>(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Quick Filter Selection
  const [quickFilter, setQuickFilter] = useState<
    "all" | "recent" | "active" | "pinned" | "draft" | "warning" | "needs-update"
  >("all");

  // Rename Dialog State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete Confirm State
  const [trashingId, setTrashingId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState<boolean>(false);
  const [supplementConfirmLayout, setSupplementConfirmLayout] = useState<LayoutProject | null>(null);

  // Menu Dropdown Open State (per card instanceId)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isLibraryMenuOpen, setIsLibraryMenuOpen] = useState<boolean>(false);

  // Submodals
  const [checkpointLayout, setCheckpointLayout] = useState<LayoutProject | null>(null);
  const [catalogReport, setCatalogReport] = useState<{
    layout: LayoutProject;
    report: {
      addedBuildings: string[];
      keptBuildings: number;
      issues: ValidationIssue[];
    };
  } | null>(null);
  const [isLibraryImportOpen, setIsLibraryImportOpen] = useState<boolean>(false);

  // Toast / Status
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Import Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Refresh lists
  const reloadData = () => {
    setLayouts(getSavedLayouts());
    setTrashLayouts(getTrashLayouts());
  };

  useEffect(() => {
    const handleSync = () => {
      reloadData();
    };
    window.addEventListener("local-layout-saved", handleSync);
    return () => window.removeEventListener("local-layout-saved", handleSync);
  }, []);

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setRenamingId(null);
      setRenameError(null);
      setTrashingId(null);
      setPermanentDeleteId(null);
      setIsFilterOpen(false);
      setMenuOpenId(null);
      setIsLibraryMenuOpen(false);
      setSupplementConfirmLayout(null);

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  const handleToggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
    } catch {
      // ignore quota error
    }
  };

  const showToast = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 3000);
  };

  // Compute Active Filter Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.townHalls.length;
    count += filters.purposes.length;
    count += filters.methods.length;
    count += filters.statuses.length;
    if (filters.onlyPinned) count += 1;
    if (filters.sortBy !== "default") count += 1;
    return count;
  }, [filters]);

  // Filtered & Sorted Active Layouts
  const filteredLayouts = useMemo(() => {
    const list = layouts.filter((layout) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchName = layout.name.toLowerCase().includes(term);
        const matchTH = `th${layout.townHallLevel}`.includes(term) || String(layout.townHallLevel) === term;
        const purposeVi = (PURPOSE_LABELS[layout.purpose] || "").toLowerCase();
        const matchPurpose = purposeVi.includes(term) || layout.purpose.toLowerCase().includes(term);
        const methodVi = (METHOD_LABELS[layout.creationMethod] || "").toLowerCase();
        const matchMethod = methodVi.includes(term) || layout.creationMethod.toLowerCase().includes(term);
        const statusComputed = computeLayoutStatus(layout);
        const statusVi = (STATUS_LABELS[statusComputed] || "").toLowerCase();
        const matchStatus = statusVi.includes(term);

        if (!matchName && !matchTH && !matchPurpose && !matchMethod && !matchStatus) {
          return false;
        }
      }

      // Quick filter
      const st = computeLayoutStatus(layout);
      if (quickFilter === "pinned" && !layout.isPinned) return false;
      if (quickFilter === "active" && layout.id !== activeLayout?.id) return false;
      if (quickFilter === "draft" && st !== "draft") return false;
      if (quickFilter === "warning" && st !== "warning") return false;
      if (quickFilter === "needs-update" && st !== "needs-update") return false;
      if (quickFilter === "recent") {
        const diffHours = (Date.now() - new Date(layout.updatedAt).getTime()) / (1000 * 3600);
        if (diffHours > 72) return false;
      }

      // Explicit Filters
      if (filters.townHalls.length > 0 && !filters.townHalls.includes(layout.townHallLevel)) {
        return false;
      }
      if (filters.purposes.length > 0 && !filters.purposes.includes(layout.purpose)) {
        return false;
      }
      if (filters.methods.length > 0 && !filters.methods.includes(layout.creationMethod)) {
        return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(st)) {
        return false;
      }
      if (filters.onlyPinned && !layout.isPinned) {
        return false;
      }

      return true;
    });

    // Sắp xếp
    return list.sort((a, b) => {
      if (filters.sortBy === "default") {
        // Thứ tự mặc định:
        // 1. Bản đang dùng
        const aIsActive = a.id === activeLayout?.id ? 1 : 0;
        const bIsActive = b.id === activeLayout?.id ? 1 : 0;
        if (aIsActive !== bIsActive) return bIsActive - aIsActive;

        // 2. Bản đã ghim
        const aPinned = a.isPinned ? 1 : 0;
        const bPinned = b.isPinned ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        // 3. Cập nhật gần nhất
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }

      switch (filters.sortBy) {
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
          return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
        case "th-asc":
          return a.townHallLevel - b.townHallLevel;
        case "th-desc":
          return b.townHallLevel - a.townHallLevel;
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [layouts, searchTerm, quickFilter, filters, activeLayout]);

  if (!isOpen) return null;

  // Actions
  const handleOpenLayout = (layout: LayoutProject) => {
    // `onSelectLayout` (see BasePlannerTab.tsx) already closes the manager itself.
    // Calling `onClose()` here too used to be redundant AND buggy: `onClose` is
    // `handleCloseManager`, which reads `activeLayout` from a stale closure and,
    // when it was still null (e.g. picking the very first layout of a session),
    // fell through to "no active layout -> leave the Base Planner tab entirely" —
    // kicking the user straight back out right after they opened a layout.
    onSelectLayout(layout);
  };

  const handleTogglePin = (layoutId: string) => {
    togglePinLayout(layoutId);
    reloadData();
  };

  const handleDuplicate = (layoutId: string) => {
    const cloned = duplicateLayout(layoutId);
    if (cloned) {
      reloadData();
      showToast(t("basePlanner.manager.toasts.duplicatedNamed", { name: cloned.name }));
    }
  };

  const handleCreateVariant = (layoutId: string) => {
    const variant = createVariantLayout(layoutId);
    if (variant) {
      reloadData();
      showToast(t("basePlanner.manager.toasts.variantCreatedNamed", { name: variant.name }));
    }
  };

  const handleMoveToTrash = (layoutId: string) => {
    const target = layouts.find((l) => l.id === layoutId);
    const isTargetActive = activeLayout?.id === layoutId;

    const { nextActiveId } = moveToTrash(layoutId);
    reloadData();
    setTrashingId(null);
    setMenuOpenId(null);

    if (isTargetActive) {
      const updated = getSavedLayouts();
      if (nextActiveId) {
        const next = updated.find((l) => l.id === nextActiveId);
        if (next) onSelectLayout(next);
      }
      showToast(t("basePlanner.manager.toasts.movedToTrashNamed", { name: target?.name || t("basePlanner.manager.defaultLayoutName") }));
    } else {
      showToast(t("basePlanner.manager.toasts.movedToTrash"));
    }
  };

  const handleRestoreFromTrash = (layoutId: string) => {
    restoreFromTrash(layoutId);
    reloadData();
    showToast(t("basePlanner.manager.toasts.restored"));
  };

  const handlePermanentDelete = (layoutId: string) => {
    permanentlyDeleteLayout(layoutId);
    reloadData();
    setPermanentDeleteId(null);
    showToast(t("basePlanner.manager.toasts.permanentlyDeleted"));
  };

  const handleEmptyTrash = () => {
    emptyTrash();
    reloadData();
    setIsEmptyTrashConfirmOpen(false);
    showToast(t("basePlanner.manager.toasts.trashEmptied"));
  };

  const handleStartRename = (layout: LayoutProject) => {
    setRenamingId(layout.id);
    setRenameValue(layout.name);
    setRenameError(null);
    setMenuOpenId(null);
  };

  const handleConfirmRename = (layoutId: string) => {
    const clean = normalizeLayoutName(renameValue);
    if (!clean) {
      setRenameError(t("basePlanner.manager.errors.nameEmpty"));
      return;
    }

    if (isLayoutNameDuplicate(clean, layouts, layoutId)) {
      setRenameError(t("basePlanner.manager.errors.nameDuplicate"));
      return;
    }

    const res = renameLayout(layoutId, clean);
    if (res.success) {
      reloadData();
      setRenamingId(null);
      setRenameError(null);
      showToast(t("basePlanner.manager.toasts.renamed"));
    } else {
      setRenameError(res.error || t("basePlanner.manager.errors.renameFailed"));
    }
  };

  const handleExportJSON = (layout: LayoutProject) => {
    try {
      const jsonStr = serializeLayout(layout);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${layout.name.replace(/[^\w\s-]/gi, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMenuOpenId(null);
    } catch {
      alert(t("basePlanner.manager.errors.exportFailed"));
    }
  };

  const handleExportAllLibrary = () => {
    try {
      const jsonStr = exportLibraryJSON();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ClashPath_Blueprints_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsLibraryMenuOpen(false);
      showToast(t("basePlanner.manager.toasts.libraryExported"));
    } catch {
      alert(t("basePlanner.manager.errors.exportLibraryFailed"));
    }
  };

  const handleImportSingleClick = () => {
    fileInputRef.current?.click();
    setIsLibraryMenuOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = parseImportedLayoutJSON(text);
      const saved = saveLayout(imported);
      reloadData();
      onSelectLayout(saved);
      showToast(t("basePlanner.manager.toasts.importedNamed", { name: saved.name }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("basePlanner.manager.errors.invalidJsonFile");
      alert(msg);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpdateCatalog = (layout: LayoutProject) => {
    try {
      const { updatedLayout, report } = updateLayoutToCurrentCatalog(layout.id);
      reloadData();
      setCatalogReport({ layout: updatedLayout, report });
      showToast(t("basePlanner.manager.toasts.catalogUpdated"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("basePlanner.manager.errors.catalogUpdateFailed");
      alert(msg);
    }
  };

  const handleConfirmSupplement = (layout: LayoutProject) => {
    try {
      const res = supplementMissingObjects(layout.id);
      reloadData();
      if (activeLayout?.id === layout.id) {
        onSelectLayout(res.updatedLayout);
      }
      showToast(t("basePlanner.manager.toasts.supplemented", { count: res.addedCount }));
      setSupplementConfirmLayout(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("basePlanner.manager.errors.supplementFailed");
      alert(msg);
    }
  };

  // Purpose Icons
  const getPurposeIcon = (p: BasePurpose) => {
    switch (p) {
      case "war":
        return Swords;
      case "trophy":
        return Trophy;
      case "farming":
        return Wheat;
      case "hybrid":
        return Scale;
      case "progress":
        return Hammer;
      case "showcase":
        return Palette;
    }
  };

  // Status Styling
  const getStatusBadge = (status: LayoutStatus) => {
    switch (status) {
      case "valid":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          label: STATUS_LABELS.valid,
        };
      case "draft":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          label: STATUS_LABELS.draft,
        };
      case "warning":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          text: "text-rose-400",
          label: STATUS_LABELS.warning,
        };
      case "needs-update":
        return {
          bg: "bg-sky-500/10",
          border: "border-sky-500/30",
          text: "text-sky-400",
          label: STATUS_LABELS["needs-update"],
        };
      case "data-error":
        return {
          bg: "bg-red-500/15",
          border: "border-red-500/40",
          text: "text-red-400",
          label: STATUS_LABELS["data-error"],
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-title"
    >
      <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-5xl h-[94vh] sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Toast */}
        {feedbackNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {/* TOP HEADER */}
        <div className="p-3 sm:p-4 border-b border-[#182a3a] flex items-center justify-between gap-2 sm:gap-3 bg-[#0e1d2c] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="manager-title"
                  className="text-xs sm:text-base font-black text-white tracking-wide uppercase truncate"
                >
                  {t("basePlanner.manager.header.title")}
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                {t("basePlanner.manager.header.subtitle")}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Kho bố cục mẫu */}
            <button
              type="button"
              onClick={() => {
                // `onOpenNewWizard` (see BasePlannerTab.tsx) already closes the manager
                // itself — see the comment on `handleOpenLayout` above for why calling
                // the generic `onClose()` here too was buggy, not just redundant.
                onOpenNewWizard();
              }}
              className="p-2 sm:px-3 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#233b52] cursor-pointer transition-colors"
              title={t("basePlanner.manager.header.presetsTitle")}
              aria-label={t("basePlanner.manager.header.presetsLabel")}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{t("basePlanner.manager.header.presetsLabel")}</span>
            </button>

            {/* Nhập JSON */}
            <button
              type="button"
              onClick={handleImportSingleClick}
              className="p-2 sm:px-3 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#233b52] cursor-pointer transition-colors"
              title={t("basePlanner.manager.header.importTitle")}
              aria-label={t("basePlanner.manager.header.importLabel")}
            >
              <FileUp className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{t("basePlanner.manager.header.importLabel")}</span>
            </button>

            {/* Tùy chọn Sao lưu & Xuất */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLibraryMenuOpen(!isLibraryMenuOpen)}
                className="p-2 sm:px-2.5 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#233b52] cursor-pointer transition-colors"
                title={t("basePlanner.manager.header.backupMenuTitle")}
                aria-expanded={isLibraryMenuOpen}
                aria-label={t("basePlanner.manager.header.backupMenuTitle")}
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">{t("basePlanner.manager.header.backupLabel")}</span>
              </button>

              {isLibraryMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-[#0c1824] border border-[#1f374e] rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsLibraryImportOpen(true);
                      setIsLibraryMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 min-h-[40px] rounded-lg text-xs font-bold text-slate-300 hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                    aria-label={t("basePlanner.manager.header.loadLibraryAria")}
                  >
                    <FileUp className="w-4 h-4 text-cyan-400" />
                    <span>{t("basePlanner.manager.header.loadLibraryLabel")}</span>
                  </button>
                  <button
                    onClick={handleExportAllLibrary}
                    className="w-full text-left px-3 py-2 min-h-[40px] rounded-lg text-xs font-bold text-slate-300 hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                    aria-label={t("basePlanner.manager.header.exportAllAria")}
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{t("basePlanner.manager.header.exportAllLabel")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tạo bản thiết kế mới (Nút chính) */}
            {layouts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onOpenNewWizard();
                }}
                className="px-2.5 sm:px-4 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all shrink-0"
                title={t("basePlanner.manager.header.newLayoutTitle")}
                aria-label={t("basePlanner.manager.header.newLayoutLabel")}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t("basePlanner.manager.header.newLayoutLabel")}</span>
                <span className="sm:hidden">{t("basePlanner.manager.header.newLayoutShort")}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 min-h-[38px] sm:min-h-[40px] min-w-[38px] sm:min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={t("basePlanner.manager.header.closeTitle")}
              aria-label={t("basePlanner.manager.header.closeTitle")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB SWITCHER: Bản thiết kế vs Thùng rác */}
        <div className="px-4 py-2 bg-[#09141f] border-b border-[#182837] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentTab("active")}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === "active"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{t("basePlanner.manager.tabs.active")}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                {layouts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("trash")}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === "trash"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("basePlanner.manager.tabs.trash")}</span>
              {trashLayouts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-[10px] text-rose-300 font-black">
                  {trashLayouts.length}
                </span>
              )}
            </button>
          </div>

          {/* View mode toggle (Grid vs List) for active tab */}
          {currentTab === "active" && layouts.length > 0 && (
            <div className="flex items-center gap-1 bg-[#061019] p-1 rounded-xl border border-[#162738]">
              <button
                type="button"
                onClick={() => handleToggleViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#142636] text-amber-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={t("basePlanner.manager.viewMode.gridTitle")}
                aria-label={t("basePlanner.manager.viewMode.gridAria")}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[#142636] text-amber-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={t("basePlanner.manager.viewMode.listTitle")}
                aria-label={t("basePlanner.manager.viewMode.listAria")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* SEARCH & FILTERS (Only when in active tab and at least 1 layout exists) */}
        {currentTab === "active" && layouts.length > 0 && (
          <div className="px-3.5 sm:px-4 py-2.5 bg-[#07131e] border-b border-[#162738] flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="flex-1 relative min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("basePlanner.manager.search.placeholder")}
                  className="w-full pl-9 pr-8 py-2 min-h-[40px] bg-[#060e16] border border-[#1b2e40] rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none transition-colors"
                  aria-label={t("basePlanner.manager.search.aria")}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    aria-label={t("basePlanner.manager.search.clearAria")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Bộ lọc Button */}
              <button
                type="button"
                onClick={() => {
                  setDraftFilters({ ...filters });
                  setIsFilterOpen(true);
                }}
                className={`px-3 py-2 min-h-[40px] rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeFilterCount > 0
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                    : "bg-[#0a1622] border-[#1b2f42] text-slate-300 hover:bg-[#132536]"
                }`}
                aria-label={t("basePlanner.manager.search.filterAria")}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{t("basePlanner.manager.search.filterLabel")}</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Filter Chips */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {[
                { id: "all", label: t("basePlanner.manager.quickFilters.all") },
                { id: "recent", label: t("basePlanner.manager.quickFilters.recent") },
                { id: "active", label: t("basePlanner.manager.quickFilters.active") },
                { id: "pinned", label: t("basePlanner.manager.quickFilters.pinned") },
                { id: "draft", label: t("basePlanner.manager.quickFilters.draft") },
                { id: "warning", label: t("basePlanner.manager.quickFilters.warning") },
                { id: "needs-update", label: t("basePlanner.manager.quickFilters.needsUpdate") },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQuickFilter(chip.id as any)}
                  className={`px-2.5 py-1 min-h-[32px] rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                    quickFilter === chip.id
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-sm"
                      : "bg-[#06101a] text-slate-400 border-[#152535] hover:text-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              ))}

              {/* Reset filter chips button if active */}
              {(activeFilterCount > 0 || quickFilter !== "all" || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(defaultFilters);
                    setQuickFilter("all");
                    setSearchTerm("");
                  }}
                  className="px-2 py-1 text-slate-400 hover:text-rose-300 font-bold whitespace-nowrap underline cursor-pointer ml-auto"
                >
                  {t("basePlanner.manager.emptyState.clearFiltersShort")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-3 sm:p-4 bg-[#08121c]">
          {/* TAB 1: ACTIVE BLUEPRINTS */}
          {currentTab === "active" && (
            <>
              {layouts.length === 0 ? (
                /* EMPTY STATE: ONLY ONE PRIMARY CTA BUTTON PER SPECIFICATION */
                <div className="h-full flex flex-col items-center justify-center p-6 sm:p-8 text-center my-auto min-h-[340px]">
                  <div className="p-4 rounded-2xl bg-[#0a1723] border border-[#1b2f42] text-amber-400 mb-3 shadow-inner">
                    <FolderOpen className="w-10 h-10" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1">
                    {t("basePlanner.manager.emptyState.noLayoutsTitle")}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                    {t("basePlanner.manager.emptyState.noLayoutsHint")}
                  </p>

                  <div className="flex items-center justify-center">
                    {/* ONLY ONE SINGLE PRIMARY CTA BUTTON PER USER SPECIFICATION */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewWizard();
                      }}
                      className="px-6 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                      title={t("basePlanner.manager.emptyState.createFirstTitle")}
                      aria-label={t("basePlanner.manager.emptyState.createFirstTitle")}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t("basePlanner.manager.emptyState.createFirstTitle")}</span>
                    </button>
                  </div>
                </div>
              ) : filteredLayouts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Search className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-300">{t("basePlanner.manager.emptyState.noMatchTitle")}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t("basePlanner.manager.emptyState.noMatchHint")}
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setQuickFilter("all");
                      setFilters(defaultFilters);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {t("basePlanner.manager.emptyState.clearFilters")}
                  </button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                      : "flex flex-col gap-2.5"
                  }
                >
                  {filteredLayouts.map((layout) => {
                    const status = computeLayoutStatus(layout);
                    const statusStyle = getStatusBadge(status);
                    const stats = getLayoutPlacementStats(layout);
                    const PurposeIcon = getPurposeIcon(layout.purpose);
                    const isActive = activeLayout?.id === layout.id;

                    return (
                      <div
                        key={layout.id}
                        className={`rounded-2xl border bg-[#0a1622] hover:bg-[#0d1c2b] transition-all flex flex-col relative group ${
                          isActive
                            ? "border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                            : "border-[#192b3c] hover:border-[#223b52]"
                        }`}
                      >
                        {/* CARD TOP / HEADER */}
                        <div className="p-3 sm:p-3.5 flex items-start gap-3 flex-1 min-w-0">
                          {/* SVG Thumbnail (44x44 tile vector view) */}
                          <div
                            onClick={() => handleOpenLayout(layout)}
                            className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 cursor-pointer relative overflow-hidden rounded-xl group-hover:scale-[1.02] transition-transform"
                            title={t("basePlanner.manager.card.openTitle")}
                          >
                            <BlueprintThumbnail
                              buildings={layout.buildings}
                              townHallLevel={layout.townHallLevel}
                            />
                            {isActive && (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm">
                                {t("basePlanner.manager.card.activeBadge")}
                              </div>
                            )}
                          </div>

                          {/* Card Metadata Details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              {/* Row 1: Badges & Pin button */}
                              <div className="flex items-center justify-between gap-1.5 mb-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Town Hall Badge */}
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-black text-[10px] border border-amber-500/30">
                                    TH{layout.townHallLevel}
                                  </span>

                                  {/* Purpose Badge */}
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center gap-1">
                                    <PurposeIcon className="w-3 h-3 text-amber-400" />
                                    <span>{PURPOSE_LABELS[layout.purpose]}</span>
                                  </span>

                                  {/* Method Badge */}
                                  <span className="px-1.5 py-0.5 rounded-md bg-[#132434] text-slate-400 text-[10px] font-medium border border-[#1c354c]">
                                    {METHOD_LABELS[layout.creationMethod] || t("basePlanner.manager.card.selfMade")}
                                  </span>
                                </div>

                                {/* Pin toggle button */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(layout.id)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                                    layout.isPinned
                                      ? "text-amber-400 hover:text-amber-300"
                                      : "text-slate-500 hover:text-slate-300"
                                  }`}
                                  title={layout.isPinned ? t("basePlanner.manager.card.unpinTitle") : t("basePlanner.manager.card.pinTitle")}
                                  aria-label={layout.isPinned ? t("basePlanner.manager.card.unpinTitle") : t("basePlanner.manager.card.pinTitle")}
                                >
                                  {layout.isPinned ? (
                                    <Pin className="w-3.5 h-3.5 fill-amber-400" />
                                  ) : (
                                    <PinOff className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              {/* Row 2: Layout Name (Ellipsis with Tooltip) */}
                              <h4
                                onClick={() => handleOpenLayout(layout)}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleOpenLayout(layout);
                                  }
                                }}
                                className="text-xs sm:text-sm font-bold text-white truncate max-w-full cursor-pointer hover:text-amber-300 focus:text-amber-300 focus:outline-none transition-colors"
                                title={layout.name}
                                aria-label={t("basePlanner.manager.card.nameAria", { name: layout.name })}
                              >
                                {layout.name}
                              </h4>
                            </div>

                            {/* Row 3: Status & Object count */}
                            <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                              {/* Status badge */}
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                              >
                                {statusStyle.label}
                              </span>

                              {/* Placed count */}
                              <span className="text-slate-400 font-medium">
                                {t("basePlanner.manager.card.placedLabel")}{" "}
                                <strong
                                  className={
                                    stats.placedCount >= stats.requiredTotal
                                      ? "text-emerald-400"
                                      : "text-amber-400"
                                  }
                                >
                                  {stats.placedCount}
                                </strong>
                                /{stats.requiredTotal}
                                {stats.missingCount > 0 && (
                                  <span className="text-rose-400 ml-1">
                                    {t("basePlanner.manager.card.missingSuffix", { count: stats.missingCount })}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* CARD BOTTOM / ACTIONS BAR */}
                        <div className="px-3 py-2 border-t border-[#142332] bg-[#07111a] flex items-center justify-between gap-2 rounded-b-2xl">
                          {/* Updated time info */}
                          <div
                            className="text-[10px] text-slate-500 flex items-center gap-1 truncate"
                            title={t("basePlanner.manager.card.updatedAtTitle", { time: new Date(layout.updatedAt).toLocaleString("vi-VN") })}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {formatRelativeUpdateTime(layout.updatedAt)}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* If needs-update: direct Update button */}
                            {status === "needs-update" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateCatalog(layout)}
                                className="px-2 py-1 min-h-[32px] rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title={t("basePlanner.manager.card.updateCatalogTitle")}
                                aria-label={t("basePlanner.manager.card.updateCatalogAria")}
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>{t("basePlanner.manager.card.updateCatalogLabel")}</span>
                              </button>
                            )}

                            {/* If draft: allow automatic supplement */}
                            {status === "draft" && stats.missingCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setSupplementConfirmLayout(layout)}
                                className="px-2 py-1 min-h-[32px] rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title={t("basePlanner.manager.card.autoSupplementTitle", { count: stats.missingCount })}
                                aria-label={t("basePlanner.manager.card.autoSupplementAria")}
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span className="hidden sm:inline">{t("basePlanner.manager.card.autoSupplementLabel")}</span>
                                <span className="sm:hidden">{t("basePlanner.manager.card.autoSupplementShort")}</span>
                              </button>
                            )}

                            {/* Open / Continue Editing in Editor button */}
                            <button
                              type="button"
                              onClick={() => handleOpenLayout(layout)}
                              className={`px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                  ? "bg-slate-800 text-amber-300 border border-amber-500/30"
                                  : "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm"
                              }`}
                              title={
                                isActive
                                  ? t("basePlanner.manager.card.openActiveTitle")
                                  : status === "draft"
                                  ? t("basePlanner.manager.card.openDraftTitle")
                                  : t("basePlanner.manager.card.openTitleDefault")
                              }
                              aria-label={
                                isActive
                                  ? t("basePlanner.manager.card.openActiveAria")
                                  : status === "draft"
                                  ? t("basePlanner.manager.card.openDraftAria")
                                  : t("basePlanner.manager.card.openAriaDefault")
                              }
                            >
                              {isActive ? t("basePlanner.manager.card.openActiveLabel") : status === "draft" ? t("basePlanner.manager.card.openDraftLabel") : t("basePlanner.manager.card.openLabelDefault")}
                            </button>

                            {/* Three Dots Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setMenuOpenId(menuOpenId === layout.id ? null : layout.id)
                                }
                                className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title={t("basePlanner.manager.card.moreOptionsTitle")}
                                aria-label={t("basePlanner.manager.card.moreOptionsTitle")}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Card Actions Popover Menu */}
                              {menuOpenId === layout.id && (
                                <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-[#0c1824] border border-[#1f374e] rounded-xl shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 text-xs font-bold text-slate-300">
                                  {/* Đổi tên */}
                                  <button
                                    onClick={() => handleStartRename(layout)}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title={t("basePlanner.manager.card.menu.renameTitle")}
                                    aria-label={t("basePlanner.manager.card.menu.renameTitle")}
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{t("basePlanner.manager.card.menu.rename")}</span>
                                  </button>

                                  {/* Tạo biến thể */}
                                  <button
                                    onClick={() => {
                                      handleCreateVariant(layout.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title={t("basePlanner.manager.card.menu.createVariantTitle")}
                                    aria-label={t("basePlanner.manager.card.menu.createVariantTitle")}
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{t("basePlanner.manager.card.menu.createVariant")}</span>
                                  </button>

                                  {/* Nhân bản */}
                                  <button
                                    onClick={() => {
                                      handleDuplicate(layout.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title={t("basePlanner.manager.card.menu.duplicateTitle")}
                                    aria-label={t("basePlanner.manager.card.menu.duplicateTitle")}
                                  >
                                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>{t("basePlanner.manager.card.menu.duplicate")}</span>
                                  </button>

                                  {/* Xuất JSON */}
                                  <button
                                    onClick={() => handleExportJSON(layout)}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title={t("basePlanner.manager.card.menu.exportJsonTitle")}
                                    aria-label={t("basePlanner.manager.card.menu.exportJsonTitle")}
                                  >
                                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{t("basePlanner.manager.card.menu.exportJson")}</span>
                                  </button>

                                  {/* Lịch sử Checkpoint */}
                                  <button
                                    onClick={() => {
                                      setCheckpointLayout(layout);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title={t("basePlanner.manager.card.menu.checkpointsTitle")}
                                    aria-label={t("basePlanner.manager.card.menu.checkpointsTitle")}
                                  >
                                    <History className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{t("basePlanner.manager.card.menu.checkpoints")}</span>
                                  </button>

                                  <div className="h-px bg-[#182837] my-1" />

                                  {/* Chuyển vào thùng rác */}
                                  <button
                                    onClick={() => {
                                      setTrashingId(layout.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center gap-2 cursor-pointer"
                                    title={t("basePlanner.manager.card.menu.trashTitle")}
                                    aria-label={t("basePlanner.manager.card.menu.trashTitle")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{t("basePlanner.manager.card.menu.trash")}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: TRASH (THÙNG RÁC) */}
          {currentTab === "trash" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {t("basePlanner.manager.trash.expiryNotice")}
                  </span>
                </div>
                {trashLayouts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsEmptyTrashConfirmOpen(true)}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {t("basePlanner.manager.trash.emptyTrash")}
                  </button>
                )}
              </div>

              {trashLayouts.length === 0 ? (
                <div className="p-16 text-center text-slate-500">
                  <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-400">{t("basePlanner.manager.trash.emptyTitle")}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t("basePlanner.manager.trash.emptyHint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trashLayouts.map((tLayout) => {
                    const deletedTime = tLayout.deletedAt ? new Date(tLayout.deletedAt).getTime() : Date.now();
                    const daysRemaining = Math.max(
                      1,
                      Math.ceil((TRASH_EXPIRY_MS - (Date.now() - deletedTime)) / (24 * 3600 * 1000))
                    );

                    return (
                      <div
                        key={tLayout.id}
                        className="p-3.5 rounded-xl bg-[#091520] border border-[#182a3a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden opacity-60">
                            <BlueprintThumbnail
                              buildings={tLayout.buildings}
                              townHallLevel={tLayout.townHallLevel}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className="text-xs font-bold text-slate-200 truncate max-w-full"
                                title={tLayout.name}
                                aria-label={t("basePlanner.manager.trash.nameAria", { name: tLayout.name })}
                              >
                                {tLayout.name}
                              </h4>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-black">
                                TH{tLayout.townHallLevel}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {t("basePlanner.manager.trash.expiresInPrefix")}{" "}
                              <strong className="text-amber-400">{t("basePlanner.manager.trash.expiresInValue", { days: daysRemaining })}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreFromTrash(tLayout.id)}
                            className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={t("basePlanner.manager.trash.restoreTitle")}
                            aria-label={t("basePlanner.manager.trash.restoreAria")}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t("basePlanner.manager.trash.restore")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermanentDeleteId(tLayout.id)}
                            className="px-3 py-1.5 min-h-[36px] rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={t("basePlanner.manager.trash.deleteTitle")}
                            aria-label={t("basePlanner.manager.trash.deleteAria")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t("basePlanner.manager.trash.delete")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RENAME MODAL */}
        {renamingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3">
              <h3 className="text-sm font-bold text-white">{t("basePlanner.manager.renameModal.title")}</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value);
                  setRenameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRename(renamingId);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
                className="w-full px-3 py-2 bg-[#060e16] border border-[#1b2e40] rounded-xl text-xs text-white outline-none focus:border-amber-400"
              />
              {renameError && <p className="text-[11px] text-rose-400">{renameError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRename(renamingId)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300"
                >
                  {t("basePlanner.manager.renameModal.save")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOVE TO TRASH CONFIRMATION */}
        {trashingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>{t("basePlanner.manager.trashConfirm.title")}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("basePlanner.manager.trashConfirm.description")}
              </p>
              {activeLayout?.id === trashingId && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                  {t("basePlanner.manager.trashConfirm.activeWarning")}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTrashingId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveToTrash(trashingId)}
                  className="px-4 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400"
                >
                  {t("basePlanner.manager.trashConfirm.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PERMANENT DELETE CONFIRMATION */}
        {permanentDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1723] border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>{t("basePlanner.manager.deleteConfirm.title")}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("basePlanner.manager.deleteConfirm.descriptionPrefix")} <strong className="text-rose-400">{t("basePlanner.manager.deleteConfirm.descriptionBold")}</strong>{t("basePlanner.manager.deleteConfirm.descriptionSuffix")}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPermanentDeleteId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handlePermanentDelete(permanentDeleteId)}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                >
                  {t("basePlanner.manager.deleteConfirm.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY TRASH CONFIRMATION */}
        {isEmptyTrashConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1723] border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>{t("basePlanner.manager.emptyTrashConfirm.title")}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("basePlanner.manager.emptyTrashConfirm.description", { count: trashLayouts.length })}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmptyTrashConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                >
                  {t("basePlanner.manager.emptyTrashConfirm.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FILTER MODAL / BOTTOM SHEET */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1723] border border-[#1f374e] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95">
              <div className="p-4 border-b border-[#182a3a] flex items-center justify-between bg-[#0e1d2c]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">{t("basePlanner.manager.filterModal.title")}</h3>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="no-scrollbar p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
                {/* Town Hall Filter */}
                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">{t("basePlanner.manager.filterModal.townHallLabel")}</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((th) => {
                      const selected = draftFilters.townHalls.includes(th);
                      return (
                        <button
                          key={th}
                          type="button"
                          onClick={() => {
                            setDraftFilters((prev) => ({
                              ...prev,
                              townHalls: selected
                                ? prev.townHalls.filter((x) => x !== th)
                                : [...prev.townHalls, th],
                            }));
                          }}
                          className={`py-1 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer ${
                            selected
                              ? "bg-amber-400 text-slate-950 border-amber-400"
                              : "bg-[#07131e] text-slate-400 border-[#1b2f42] hover:text-slate-200"
                          }`}
                        >
                          TH{th}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Purpose Filter */}
                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">{t("basePlanner.manager.filterModal.purposeLabel")}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(PURPOSE_LABELS) as BasePurpose[]).map((p) => {
                      const selected = draftFilters.purposes.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setDraftFilters((prev) => ({
                              ...prev,
                              purposes: selected
                                ? prev.purposes.filter((x) => x !== p)
                                : [...prev.purposes, p],
                            }));
                          }}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-left text-[11px] border transition-colors cursor-pointer ${
                            selected
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                              : "bg-[#07131e] text-slate-400 border-[#1b2f42] hover:text-slate-200"
                          }`}
                        >
                          {PURPOSE_LABELS[p]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">{t("basePlanner.manager.filterModal.statusLabel")}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(STATUS_LABELS) as LayoutStatus[]).map((st) => {
                      const selected = draftFilters.statuses.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setDraftFilters((prev) => ({
                              ...prev,
                              statuses: selected
                                ? prev.statuses.filter((x) => x !== st)
                                : [...prev.statuses, st],
                            }));
                          }}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-left text-[11px] border transition-colors cursor-pointer ${
                            selected
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                              : "bg-[#07131e] text-slate-400 border-[#1b2f42] hover:text-slate-200"
                          }`}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pin Filter */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#07131e] border border-[#1b2f42]">
                  <span className="font-bold">{t("basePlanner.manager.filterModal.onlyPinnedLabel")}</span>
                  <input
                    type="checkbox"
                    checked={draftFilters.onlyPinned}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, onlyPinned: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-amber-400 cursor-pointer"
                  />
                </div>

                {/* Sort Option */}
                <div>
                  <label className="font-bold text-slate-200 block mb-1.5">{t("basePlanner.manager.filterModal.sortByLabel")}</label>
                  <select
                    value={draftFilters.sortBy}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, sortBy: e.target.value as SortOption }))
                    }
                    className="w-full px-3 py-2 bg-[#07131e] border border-[#1b2f42] rounded-xl text-xs text-white outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="default">{t("basePlanner.manager.filterModal.sortOptions.default")}</option>
                    <option value="updated">{t("basePlanner.manager.filterModal.sortOptions.updated")}</option>
                    <option value="created">{t("basePlanner.manager.filterModal.sortOptions.created")}</option>
                    <option value="name">{t("basePlanner.manager.filterModal.sortOptions.name")}</option>
                    <option value="th-asc">{t("basePlanner.manager.filterModal.sortOptions.thAsc")}</option>
                    <option value="th-desc">{t("basePlanner.manager.filterModal.sortOptions.thDesc")}</option>
                  </select>
                </div>
              </div>

              <div className="p-3 border-t border-[#182a3a] bg-[#07131e] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDraftFilters(defaultFilters)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {t("basePlanner.manager.filterModal.reset")}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    {t("common.close")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ ...draftFilters });
                      setIsFilterOpen(false);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300 cursor-pointer"
                  >
                    {t("basePlanner.manager.filterModal.apply")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMODALS */}
        {checkpointLayout && (
          <CheckpointModal
            layout={checkpointLayout}
            isOpen={Boolean(checkpointLayout)}
            onClose={() => setCheckpointLayout(null)}
            onRestored={(updated) => {
              reloadData();
              onSelectLayout(updated);
              showToast(t("basePlanner.manager.toasts.checkpointRestored"));
            }}
          />
        )}

        {catalogReport && (
          <CatalogUpdateReportModal
            layout={catalogReport.layout}
            report={catalogReport.report}
            isOpen={Boolean(catalogReport)}
            onClose={() => setCatalogReport(null)}
            onOpenInEditor={(layout) => {
              onSelectLayout(layout);
            }}
          />
        )}

        {isLibraryImportOpen && (
          <LibraryImportModal
            isOpen={isLibraryImportOpen}
            onClose={() => setIsLibraryImportOpen(false)}
            onImportComplete={() => {
              reloadData();
              showToast(t("basePlanner.manager.toasts.libraryImported"));
            }}
          />
        )}

        {/* SUPPLEMENT CONFIRMATION MODAL */}
        {supplementConfirmLayout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t("basePlanner.manager.supplementConfirm.title")}</h3>
                  <p className="text-[11px] text-slate-400">{t("basePlanner.manager.supplementConfirm.subtitle", { th: supplementConfirmLayout.townHallLevel })}</p>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 bg-[#060f18] p-3 rounded-xl border border-[#162738]">
                <p>
                  {t("basePlanner.manager.supplementConfirm.firstLinePrefix")} <strong className="text-amber-300">"{supplementConfirmLayout.name}"</strong> {t("basePlanner.manager.supplementConfirm.firstLineSuffix", { th: supplementConfirmLayout.townHallLevel })}
                </p>
                <p className="text-slate-400">
                  {t("basePlanner.manager.supplementConfirm.descriptionSecondPrefix")} <strong>{t("basePlanner.manager.supplementConfirm.descriptionBold")}</strong> {t("basePlanner.manager.supplementConfirm.descriptionSecondSuffix")}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSupplementConfirmLayout(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSupplement(supplementConfirmLayout)}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t("basePlanner.manager.supplementConfirm.confirm")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
