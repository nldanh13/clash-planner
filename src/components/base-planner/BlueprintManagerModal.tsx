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
      showToast(`Đã tạo bản sao: ${cloned.name}`);
    }
  };

  const handleCreateVariant = (layoutId: string) => {
    const variant = createVariantLayout(layoutId);
    if (variant) {
      reloadData();
      showToast(`Đã tạo biến thể mới: ${variant.name}`);
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
      showToast(`Đã chuyển "${target?.name || "Bản thiết kế"}" vào thùng rác.`);
    } else {
      showToast(`Đã chuyển vào thùng rác.`);
    }
  };

  const handleRestoreFromTrash = (layoutId: string) => {
    restoreFromTrash(layoutId);
    reloadData();
    showToast("Đã khôi phục bản thiết kế.");
  };

  const handlePermanentDelete = (layoutId: string) => {
    permanentlyDeleteLayout(layoutId);
    reloadData();
    setPermanentDeleteId(null);
    showToast("Đã xóa vĩnh viễn.");
  };

  const handleEmptyTrash = () => {
    emptyTrash();
    reloadData();
    setIsEmptyTrashConfirmOpen(false);
    showToast("Đã dọn sạch thùng rác.");
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
      setRenameError("Vui lòng nhập tên bản thiết kế.");
      return;
    }

    if (isLayoutNameDuplicate(clean, layouts, layoutId)) {
      setRenameError("Tên này đã tồn tại trong danh sách.");
      return;
    }

    const res = renameLayout(layoutId, clean);
    if (res.success) {
      reloadData();
      setRenamingId(null);
      setRenameError(null);
      showToast("Đã đổi tên thành công.");
    } else {
      setRenameError(res.error || "Đổi tên thất bại.");
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
      alert("Xuất dữ liệu thất bại.");
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
      showToast("Đã xuất toàn bộ thư viện.");
    } catch {
      alert("Xuất thư viện thất bại.");
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
      showToast(`Đã nhập thành công: ${saved.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tệp JSON không đúng định dạng.";
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
      showToast("Đã cập nhật bản thiết kế theo catalog mới!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật catalog thất bại.";
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
      showToast(`Đã tự động bổ sung ${res.addedCount} vật thể vào bản đồ.`);
      setSupplementConfirmLayout(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bổ sung vật thể thất bại.";
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
                  Quản Lý Bản Thiết Kế
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Quản lý kho layout, phân loại theo Town Hall và mục đích chiến thuật.
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
              title="Xem và chọn bố cục mẫu từ kho"
              aria-label="Kho bố cục mẫu"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Kho bố cục mẫu</span>
            </button>

            {/* Nhập JSON */}
            <button
              type="button"
              onClick={handleImportSingleClick}
              className="p-2 sm:px-3 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#233b52] cursor-pointer transition-colors"
              title="Nhập bản thiết kế từ file JSON"
              aria-label="Nhập JSON"
            >
              <FileUp className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Nhập JSON</span>
            </button>

            {/* Tùy chọn Sao lưu & Xuất */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLibraryMenuOpen(!isLibraryMenuOpen)}
                className="p-2 sm:px-2.5 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#233b52] cursor-pointer transition-colors"
                title="Tùy chọn sao lưu và xuất dữ liệu"
                aria-expanded={isLibraryMenuOpen}
                aria-label="Tùy chọn sao lưu và xuất dữ liệu"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Sao lưu</span>
              </button>

              {isLibraryMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-[#0c1824] border border-[#1f374e] rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsLibraryImportOpen(true);
                      setIsLibraryMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 min-h-[40px] rounded-lg text-xs font-bold text-slate-300 hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                    aria-label="Nạp tệp sao lưu thư viện"
                  >
                    <FileUp className="w-4 h-4 text-cyan-400" />
                    <span>Nạp thư viện (.json)</span>
                  </button>
                  <button
                    onClick={handleExportAllLibrary}
                    className="w-full text-left px-3 py-2 min-h-[40px] rounded-lg text-xs font-bold text-slate-300 hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                    aria-label="Xuất toàn bộ thư viện ra file JSON"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Xuất tất cả (.json)</span>
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
                title="Tạo bản thiết kế mới"
                aria-label="Tạo bản thiết kế mới"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tạo bản thiết kế mới</span>
                <span className="sm:hidden">Tạo mới</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 min-h-[38px] sm:min-h-[40px] min-w-[38px] sm:min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Đóng Quản lý bản thiết kế"
              aria-label="Đóng Quản lý bản thiết kế"
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
              <span>Bản thiết kế</span>
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
              <span>Thùng rác</span>
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
                title="Dạng lưới"
                aria-label="Chuyển sang dạng lưới"
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
                title="Dạng danh sách"
                aria-label="Chuyển sang dạng danh sách"
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
                  placeholder="Tìm theo tên, TH11, Chiến tranh, v.v..."
                  className="w-full pl-9 pr-8 py-2 min-h-[40px] bg-[#060e16] border border-[#1b2e40] rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none transition-colors"
                  aria-label="Tìm kiếm bản thiết kế"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Xóa từ khóa tìm kiếm"
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
                aria-label="Mở bộ lọc nâng cao"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Bộ lọc</span>
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
                { id: "all", label: "Tất cả" },
                { id: "recent", label: "Gần đây" },
                { id: "active", label: "Đang dùng" },
                { id: "pinned", label: "Đã ghim" },
                { id: "draft", label: "Bản nháp" },
                { id: "warning", label: "Có cảnh báo" },
                { id: "needs-update", label: "Cần cập nhật" },
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
                  Xóa lọc
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
                    Chưa có bản thiết kế nào
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                    Khởi tạo bản thiết kế đầu tiên của bạn hoặc nhập file JSON từ máy tính.
                  </p>

                  <div className="flex items-center justify-center">
                    {/* ONLY ONE SINGLE PRIMARY CTA BUTTON PER USER SPECIFICATION */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewWizard();
                      }}
                      className="px-6 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
                      title="Tạo bản thiết kế đầu tiên"
                      aria-label="Tạo bản thiết kế đầu tiên"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tạo bản thiết kế đầu tiên</span>
                    </button>
                  </div>
                </div>
              ) : filteredLayouts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Search className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-300">Không tìm thấy bản thiết kế phù hợp</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Thử thay đổi từ khóa hoặc điều chỉnh tiêu chí trong bộ lọc.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setQuickFilter("all");
                      setFilters(defaultFilters);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Xóa tất cả bộ lọc
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
                            title="Bấm để mở bản thiết kế"
                          >
                            <BlueprintThumbnail
                              buildings={layout.buildings}
                              townHallLevel={layout.townHallLevel}
                            />
                            {isActive && (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm">
                                Đang dùng
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
                                    {METHOD_LABELS[layout.creationMethod] || "Tự tạo"}
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
                                  title={layout.isPinned ? "Bỏ ghim bản thiết kế" : "Ghim bản thiết kế lên đầu"}
                                  aria-label={layout.isPinned ? "Bỏ ghim bản thiết kế" : "Ghim bản thiết kế lên đầu"}
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
                                aria-label={`Bản thiết kế: ${layout.name}`}
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
                                Đã đặt:{" "}
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
                                    (thiếu {stats.missingCount})
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
                            title={`Cập nhật lúc: ${new Date(layout.updatedAt).toLocaleString("vi-VN")}`}
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
                                title="Cập nhật bản thiết kế theo Town Hall catalog hiện hành"
                                aria-label="Cập nhật bản thiết kế"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Cập nhật</span>
                              </button>
                            )}

                            {/* If draft: allow automatic supplement */}
                            {status === "draft" && stats.missingCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setSupplementConfirmLayout(layout)}
                                className="px-2 py-1 min-h-[32px] rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title={`Tự động đặt ${stats.missingCount} công trình/bẫy/tường còn thiếu`}
                                aria-label="Tự động bổ sung vật thể còn thiếu"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span className="hidden sm:inline">Tự động bổ sung</span>
                                <span className="sm:hidden">Bổ sung</span>
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
                                  ? "Bản thiết kế đang mở trên bàn vẽ"
                                  : status === "draft"
                                  ? "Tiếp tục chỉnh sửa bản nháp trên bàn vẽ"
                                  : "Mở bản thiết kế trên bàn vẽ"
                              }
                              aria-label={
                                isActive
                                  ? "Bản thiết kế đang mở"
                                  : status === "draft"
                                  ? "Tiếp tục chỉnh sửa"
                                  : "Mở bản thiết kế"
                              }
                            >
                              {isActive ? "Đang mở" : status === "draft" ? "Tiếp tục sửa" : "Mở"}
                            </button>

                            {/* Three Dots Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setMenuOpenId(menuOpenId === layout.id ? null : layout.id)
                                }
                                className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Tùy chọn khác"
                                aria-label="Tùy chọn khác"
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
                                    title="Đổi tên bản thiết kế"
                                    aria-label="Đổi tên bản thiết kế"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Đổi tên</span>
                                  </button>

                                  {/* Tạo biến thể */}
                                  <button
                                    onClick={() => {
                                      handleCreateVariant(layout.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title="Tạo biến thể mới"
                                    aria-label="Tạo biến thể mới"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Tạo biến thể</span>
                                  </button>

                                  {/* Nhân bản */}
                                  <button
                                    onClick={() => {
                                      handleDuplicate(layout.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title="Nhân bản bản thiết kế"
                                    aria-label="Nhân bản bản thiết kế"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Nhân bản</span>
                                  </button>

                                  {/* Xuất JSON */}
                                  <button
                                    onClick={() => handleExportJSON(layout)}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title="Xuất file JSON"
                                    aria-label="Xuất file JSON"
                                  >
                                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Xuất JSON</span>
                                  </button>

                                  {/* Lịch sử Checkpoint */}
                                  <button
                                    onClick={() => {
                                      setCheckpointLayout(layout);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-[#152a3d] hover:text-white flex items-center gap-2 cursor-pointer"
                                    title="Xem lịch sử Checkpoint"
                                    aria-label="Xem lịch sử Checkpoint"
                                  >
                                    <History className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Lịch sử Checkpoint</span>
                                  </button>

                                  <div className="h-px bg-[#182837] my-1" />

                                  {/* Chuyển vào thùng rác */}
                                  <button
                                    onClick={() => {
                                      setTrashingId(layout.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 min-h-[36px] rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center gap-2 cursor-pointer"
                                    title="Chuyển vào thùng rác"
                                    aria-label="Chuyển vào thùng rác"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Bỏ vào thùng rác</span>
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
                    Các bản thiết kế trong thùng rác sẽ tự động được xóa vĩnh viễn sau 30 ngày.
                  </span>
                </div>
                {trashLayouts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsEmptyTrashConfirmOpen(true)}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Dọn sạch thùng rác
                  </button>
                )}
              </div>

              {trashLayouts.length === 0 ? (
                <div className="p-16 text-center text-slate-500">
                  <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-400">Thùng rác trống</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Các bản thiết kế bạn xóa sẽ xuất hiện ở đây trước khi bị xóa vĩnh viễn.
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
                                aria-label={`Bản thiết kế trong thùng rác: ${tLayout.name}`}
                              >
                                {tLayout.name}
                              </h4>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-black">
                                TH{tLayout.townHallLevel}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Tự động xóa vĩnh viễn sau <strong className="text-amber-400">{daysRemaining} ngày</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreFromTrash(tLayout.id)}
                            className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Khôi phục bản thiết kế về kho chính"
                            aria-label="Khôi phục bản thiết kế"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Khôi phục</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermanentDeleteId(tLayout.id)}
                            className="px-3 py-1.5 min-h-[36px] rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Xóa vĩnh viễn bản thiết kế khỏi hệ thống"
                            aria-label="Xóa vĩnh viễn bản thiết kế"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa vĩnh viễn</span>
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
              <h3 className="text-sm font-bold text-white">Đổi tên bản thiết kế</h3>
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
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRename(renamingId)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300"
                >
                  Lưu tên
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
                <span>Chuyển vào thùng rác?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bản thiết kế này sẽ được đưa vào thùng rác và tự xóa vĩnh viễn sau 30 ngày. Bạn có thể khôi phục bất cứ lúc nào.
              </p>
              {activeLayout?.id === trashingId && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                  ⚠️ Đây là bản thiết kế bạn đang mở. Hệ thống sẽ tự động chuyển sang bản thiết kế kế tiếp.
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTrashingId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveToTrash(trashingId)}
                  className="px-4 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400"
                >
                  Bỏ vào thùng rác
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
                <span>Xác nhận xóa vĩnh viễn?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hành động này <strong className="text-rose-400">không thể khôi phục</strong>. Dữ liệu bản thiết kế và mọi checkpoint sẽ bị xóa hoàn toàn khỏi thiết bị.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPermanentDeleteId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handlePermanentDelete(permanentDeleteId)}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                >
                  Xóa vĩnh viễn
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
                <span>Dọn sạch toàn bộ thùng rác?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tất cả {trashLayouts.length} bản thiết kế trong thùng rác sẽ bị xóa vĩnh viễn ngay lập tức.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmptyTrashConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                >
                  Dọn sạch
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
                  <h3 className="text-sm font-bold text-white">Bộ lọc bản thiết kế</h3>
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
                  <label className="font-bold text-slate-200 block mb-1.5">Cấp Town Hall</label>
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
                  <label className="font-bold text-slate-200 block mb-1.5">Mục đích chiến thuật</label>
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
                  <label className="font-bold text-slate-200 block mb-1.5">Trạng thái</label>
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
                  <span className="font-bold">Chỉ hiển thị bản đã ghim</span>
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
                  <label className="font-bold text-slate-200 block mb-1.5">Sắp xếp theo</label>
                  <select
                    value={draftFilters.sortBy}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, sortBy: e.target.value as SortOption }))
                    }
                    className="w-full px-3 py-2 bg-[#07131e] border border-[#1b2f42] rounded-xl text-xs text-white outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="default">Mặc định (Đang dùng → Đã ghim → Mới cập nhật)</option>
                    <option value="updated">Cập nhật gần nhất</option>
                    <option value="created">Ngày tạo mới nhất</option>
                    <option value="name">Tên (A-Z)</option>
                    <option value="th-asc">Town Hall (Tăng dần)</option>
                    <option value="th-desc">Town Hall (Giảm dần)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 border-t border-[#182a3a] bg-[#07131e] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDraftFilters(defaultFilters)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Đặt lại
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ ...draftFilters });
                      setIsFilterOpen(false);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300 cursor-pointer"
                  >
                    Áp dụng
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
              showToast("Đã khôi phục checkpoint thành công.");
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
              showToast("Đã nạp thư viện thành công.");
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
                  <h3 className="text-sm font-bold text-white">Tự động bổ sung vật thể</h3>
                  <p className="text-[11px] text-slate-400">Town Hall {supplementConfirmLayout.townHallLevel}</p>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 bg-[#060f18] p-3 rounded-xl border border-[#162738]">
                <p>
                  Bản thiết kế <strong className="text-amber-300">"{supplementConfirmLayout.name}"</strong> chưa đủ số lượng công trình, bẫy hoặc tường theo tiêu chuẩn Town Hall {supplementConfirmLayout.townHallLevel}.
                </p>
                <p className="text-slate-400">
                  Hệ thống sẽ tự động tìm các vị trí trống và hợp lệ xung quanh căn cứ để đặt các vật thể còn thiếu. Trước khi thực hiện, một <strong>Checkpoint sao lưu tự động</strong> sẽ được tạo để bạn có thể hoàn tác bất cứ lúc nào.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSupplementConfirmLayout(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSupplement(supplementConfirmLayout)}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bổ sung ngay</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
