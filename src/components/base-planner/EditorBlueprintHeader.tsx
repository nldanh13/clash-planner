import React, { useEffect, useRef, useState } from "react";
import {
  Castle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileJson,
  FolderOpen,
  HelpCircle,
  ImageIcon,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Shield,
  SlidersHorizontal,
  Upload,
  AlertCircle,
  X,
} from "lucide-react";
import type { DefenseScoreResult, LayoutProject } from "./types";
import { METHOD_LABELS, normalizeLayoutName, PURPOSE_LABELS } from "./blueprintUtils";
import { getTownHallRequirements } from "./catalog";
import { useTranslation } from "../../i18n";

interface EditorBlueprintHeaderProps {
  layout: LayoutProject;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  lastSavedTime: string | null;
  onSaveManual: () => void;
  onOpenManager: () => void;
  onRename: (newName: string) => { success: boolean; error?: string };
  onDuplicate: () => void;
  onOpenNewWizard: (th?: number) => void;
  onDuplicateToTownHall: (targetTH: number) => void;
  onExportPNG?: () => void;
  onExportJSON?: () => void;
  onImportJSON?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenDefenseScore?: () => void;
  defenseScore?: DefenseScoreResult | null;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export function EditorBlueprintHeader({
  layout,
  saveStatus,
  lastSavedTime,
  onSaveManual,
  onOpenManager,
  onRename,
  onDuplicate,
  onOpenNewWizard,
  onDuplicateToTownHall,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onOpenDefenseScore,
  defenseScore,
  isZenMode,
  onToggleZenMode,
}: EditorBlueprintHeaderProps) {
  const { t } = useTranslation();
  // Dropdown Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename Modal State
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Town Hall Action Modal State
  const [isThModalOpen, setIsThModalOpen] = useState(false);
  const [selectedTargetTH, setSelectedTargetTH] = useState<number>(layout.townHallLevel);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reqs = getTownHallRequirements(layout.townHallLevel);

  const handleOpenRename = () => {
    setRenameInput(layout.name);
    setRenameError(null);
    setIsRenameOpen(true);
  };

  const handleConfirmRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizeLayoutName(renameInput);
    if (!clean) {
      setRenameError(t("basePlanner.editorHeader.renameModal.nameEmpty"));
      return;
    }

    const res = onRename(clean);
    if (!res.success) {
      setRenameError(res.error || t("basePlanner.editorHeader.renameModal.nameExists"));
      return;
    }

    setIsRenameOpen(false);
  };

  const handleConfirmDuplicateToTH = () => {
    setIsThModalOpen(false);
    onDuplicateToTownHall(selectedTargetTH);
  };

  const handleOpenNewWizardForTH = () => {
    setIsThModalOpen(false);
    onOpenNewWizard(selectedTargetTH);
  };

  return (
    <>
      <div className="w-full shrink-0 bg-[#08131e] border border-[#1d3144] rounded-xl p-2 sm:p-2.5 mb-2 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2 select-none">
        {/* Left Side: Blueprint Identification & Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Town Hall Read-Only Badge with Lock Indicator */}
          <button
            type="button"
            onClick={() => {
              setSelectedTargetTH(layout.townHallLevel);
              setIsThModalOpen(true);
            }}
            className="group relative flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-b from-[#132738] to-[#0a1824] border border-amber-500/40 text-amber-400 font-black text-xs shrink-0 cursor-pointer shadow-sm hover:border-amber-400 transition-all hover:scale-105"
            title={t("basePlanner.editorHeader.thFixedTooltip")}
          >
            <div className="flex items-center gap-0.5">
              <Castle className="w-3.5 h-3.5" />
              <Lock className="w-2.5 h-2.5 text-amber-500/70" />
            </div>
            <span className="text-[11px] font-black tracking-tight">TH{layout.townHallLevel}</span>
          </button>

          {/* Blueprint Title & Meta info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3
                className="font-black text-sm sm:text-base text-white truncate max-w-md cursor-pointer hover:text-amber-300 transition-colors"
                onClick={handleOpenRename}
                title={t("basePlanner.editorHeader.renameQuickTitle")}
              >
                {layout.name}
              </h3>
              <button
                type="button"
                onClick={handleOpenRename}
                className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                title={t("basePlanner.editorHeader.renameTitle")}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
              <span className="font-bold text-amber-400">TH{layout.townHallLevel}</span>
              <span className="text-slate-600">·</span>
              <span className="font-semibold text-slate-300">
                {PURPOSE_LABELS[layout.purpose]}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400 font-medium">
                {METHOD_LABELS[layout.creationMethod]}
              </span>
              <span className="text-slate-600">·</span>

              {/* Save Status Indicator */}
              <div className="flex items-center gap-1.5 font-medium text-[11px]">
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-cyan-400 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{t("basePlanner.editorHeader.saving")}</span>
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      {lastSavedTime ? t("basePlanner.editorHeader.savedAt", { time: lastSavedTime }) : t("basePlanner.editorHeader.saved")}
                    </span>
                  </span>
                )}
                {saveStatus === "unsaved" && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>{t("basePlanner.editorHeader.unsaved")}</span>
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>{t("basePlanner.editorHeader.saveFailed")}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Dedicated Defense Score, Quick Save, Zen Mode & Unified Action Dropdown */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Nút Phân tích phòng thủ riêng biệt (Tách biệt khỏi thanh công cụ vẽ) */}
          {onOpenDefenseScore && (
            <button
              type="button"
              onClick={onOpenDefenseScore}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Phân tích bố trí & điểm số phòng thủ của base"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Phân tích</span>
              {defenseScore && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950">
                  {defenseScore.tier}
                </span>
              )}
            </button>
          )}

          {/* Quick Save */}
          <button
            type="button"
            onClick={onSaveManual}
            className="px-3 py-1.5 rounded-xl bg-[#142636] hover:bg-[#1c354a] border border-[#23405b] text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title={t("basePlanner.editorHeader.saveNowTitle")}
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{t("common.save")}</span>
          </button>

          {/* Zen Mode / Xem toàn cảnh (Ẩn hiện UI) */}
          {onToggleZenMode && (
            <button
              type="button"
              onClick={onToggleZenMode}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isZenMode
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-[#0e1c27] hover:bg-[#142838] border-[#1f374c] text-slate-300 hover:text-white"
              }`}
              title="Ẩn/Hiện thanh công cụ & khay công trình (Phím tắt: H)"
            >
              {isZenMode ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline">{isZenMode ? "Hiện UI" : "Toàn cảnh"}</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded bg-black/40 text-[9px] text-slate-400">H</kbd>
            </button>
          )}

          {/* Unified Actions Dropdown: Gom các nút xuất, nhập, lưu bản sao, quản lý, đổi TH */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-[#0f2334] hover:bg-[#16334c] border border-[#23425f] text-cyan-300 hover:text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Tùy chọn bản thiết kế & xuất nhập"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tùy chọn</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#091522] border border-[#21374c] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Quản lý bản thiết kế */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenManager();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Quản lý bản thiết kế</span>
                </button>

                {/* Tạo bản sao */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicate();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-purple-400" />
                  <span>Tạo bản sao</span>
                </button>

                <div className="w-full h-px bg-[#192b3c] my-1" />

                {/* Xuất PNG */}
                {onExportPNG && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExportPNG();
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Xuất ảnh HD (PNG)</span>
                  </button>
                )}

                {/* Xuất JSON */}
                {onExportJSON && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExportJSON();
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Xuất tệp JSON</span>
                  </button>
                )}

                {/* Nhập JSON */}
                {onImportJSON && (
                  <label className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Nhập tệp JSON</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        setIsMenuOpen(false);
                        onImportJSON(e);
                      }}
                    />
                  </label>
                )}

                <div className="w-full h-px bg-[#192b3c] my-1" />

                {/* Chuyển đổi Town Hall */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setSelectedTargetTH(layout.townHallLevel);
                    setIsThModalOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Castle className="w-4 h-4 text-amber-400" />
                  <span>Đổi cấp Town Hall</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENAME MODAL */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#091522] border border-[#21374c] rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1b2b3a] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {t("basePlanner.editorHeader.renameModal.title")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRenameOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRename} className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-300">
                {t("basePlanner.editorHeader.renameModal.label")}
              </label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => {
                  setRenameInput(e.target.value);
                  setRenameError(null);
                }}
                className={`w-full px-3.5 py-2 bg-[#060e15] border rounded-xl text-xs font-bold text-white outline-none ${
                  renameError
                    ? "border-rose-500 focus:border-rose-400"
                    : "border-cyan-500/50 focus:border-cyan-400"
                }`}
                autoFocus
              />

              {renameError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{renameError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#182837]">
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow transition-all cursor-pointer"
                >
                  {t("basePlanner.editorHeader.renameModal.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE TOWN HALL MODAL */}
      {isThModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#091522] border border-[#21374c] rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1b2b3a] pb-3">
              <div className="flex items-center gap-2">
                <Castle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {t("basePlanner.editorHeader.thModal.title")}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t("basePlanner.editorHeader.thModal.belongsToPrefix")} <strong className="text-amber-400">TH{layout.townHallLevel}</strong> {t("basePlanner.editorHeader.thModal.belongsToSuffix", { count: reqs.total })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060e15] border border-[#1b2b3a] text-xs text-slate-300 leading-relaxed">
              {t("basePlanner.editorHeader.thModal.explanation")}
            </div>

            {/* Target TH Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">
                {t("basePlanner.editorHeader.thModal.pickLabel")}
              </label>
              <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#060e15] rounded-xl border border-[#182837]">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                  const isSelected = selectedTargetTH === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedTargetTH(lvl)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-400 text-slate-950 font-black shadow"
                          : "bg-[#0b1723] text-slate-300 hover:bg-[#122435]"
                      }`}
                    >
                      TH{lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {/* Option 1: Clone to new TH */}
              <button
                type="button"
                onClick={handleConfirmDuplicateToTH}
                className="p-3.5 rounded-xl bg-[#0c1a26] hover:bg-[#102436] border border-[#213b52] hover:border-cyan-500/60 text-left flex flex-col gap-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-300 group-hover:text-cyan-200">
                    {t("basePlanner.editorHeader.thModal.option1Title", { th: `TH${selectedTargetTH}` })}
                  </span>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {t("basePlanner.editorHeader.thModal.option1Desc", { th: `TH${selectedTargetTH}` })}
                </p>
              </button>

              {/* Option 2: Create new blueprint via wizard */}
              <button
                type="button"
                onClick={handleOpenNewWizardForTH}
                className="p-3.5 rounded-xl bg-[#0c1a26] hover:bg-[#102436] border border-[#213b52] hover:border-amber-500/60 text-left flex flex-col gap-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                    {t("basePlanner.editorHeader.thModal.option2Title")}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {t("basePlanner.editorHeader.thModal.option2Desc", { th: `TH${selectedTargetTH}` })}
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
