import React, { useState } from "react";
import {
  Castle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  FolderOpen,
  HelpCircle,
  Lock,
  Plus,
  RefreshCw,
  Save,
  AlertCircle,
  X,
} from "lucide-react";
import type { LayoutProject } from "./types";
import { METHOD_LABELS, normalizeLayoutName, PURPOSE_LABELS } from "./blueprintUtils";
import { getTownHallRequirements } from "./catalog";

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
}: EditorBlueprintHeaderProps) {
  // Rename Modal State
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Town Hall Action Modal State
  const [isThModalOpen, setIsThModalOpen] = useState(false);
  const [selectedTargetTH, setSelectedTargetTH] = useState<number>(layout.townHallLevel);

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
      setRenameError("Tên bản thiết kế không được để trống.");
      return;
    }

    const res = onRename(clean);
    if (!res.success) {
      setRenameError(res.error || "Tên bản thiết kế đã tồn tại trong danh sách.");
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
      <div className="w-full shrink-0 bg-[#08131e] border border-[#1d3144] rounded-xl p-2.5 sm:p-3 mb-2 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5 select-none">
        {/* Left Side: Blueprint Identification & Status */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Town Hall Read-Only Badge with Lock Indicator */}
          <button
            type="button"
            onClick={() => {
              setSelectedTargetTH(layout.townHallLevel);
              setIsThModalOpen(true);
            }}
            className="group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-b from-[#132738] to-[#0a1824] border border-amber-500/40 text-amber-400 font-black text-xs shrink-0 cursor-pointer shadow-sm hover:border-amber-400 transition-all hover:scale-105"
            title="Town Hall được gắn cố định với bản thiết kế này (Bấm để xem tùy chọn đổi cấp)"
          >
            <div className="flex items-center gap-0.5">
              <Castle className="w-3.5 h-3.5" />
              <Lock className="w-2.5 h-2.5 text-amber-500/70" />
            </div>
            <span className="text-[11px] font-black tracking-tight">TH{layout.townHallLevel}</span>
            <span className="absolute -bottom-1 text-[8px] bg-slate-900 px-1 rounded text-slate-400 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Cố định
            </span>
          </button>

          {/* Blueprint Title & Meta info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="font-black text-sm sm:text-base text-white truncate max-w-lg cursor-pointer hover:text-amber-300 transition-colors"
                onClick={handleOpenRename}
                title="Bấm để đổi tên nhanh"
              >
                {layout.name}
              </h3>
              <button
                type="button"
                onClick={handleOpenRename}
                className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors"
                title="Đổi tên bản thiết kế"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 flex-wrap">
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
                    <span>Đang lưu...</span>
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      {lastSavedTime ? `Đã lưu lúc ${lastSavedTime}` : "Đã lưu"}
                    </span>
                  </span>
                )}
                {saveStatus === "unsaved" && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>Có thay đổi chưa lưu</span>
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>Lưu thất bại</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Core Lifecycle Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Quản lý bản thiết kế */}
          <button
            type="button"
            onClick={onOpenManager}
            className="px-3.5 py-2 rounded-xl bg-[#0f2334] hover:bg-[#16334c] border border-[#23425f] text-cyan-300 hover:text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Xem danh sách bản thiết kế đã lưu, tìm kiếm, nhập/xuất"
          >
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>Quản lý bản thiết kế</span>
          </button>

          {/* Lưu */}
          <button
            type="button"
            onClick={onSaveManual}
            className="px-3.5 py-2 rounded-xl bg-[#142636] hover:bg-[#1c354a] border border-[#23405b] text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Lưu ngay bản thiết kế hiện tại"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>Lưu</span>
          </button>

          {/* Đổi tên */}
          <button
            type="button"
            onClick={handleOpenRename}
            className="px-3 py-2 rounded-xl bg-[#0e1c27] hover:bg-[#142838] border border-[#1f374c] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Đổi tên bản thiết kế"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Đổi tên</span>
          </button>

          {/* Tạo bản sao */}
          <button
            type="button"
            onClick={onDuplicate}
            className="px-3 py-2 rounded-xl bg-[#0e1c27] hover:bg-[#142838] border border-[#1f374c] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Nhân bản bản thiết kế này thành một bản lưu mới"
          >
            <Copy className="w-3.5 h-3.5 text-purple-400" />
            <span>Tạo bản sao</span>
          </button>
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
                  Đổi Tên Bản Thiết Kế
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
                Nhập tên mới:
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
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow transition-all cursor-pointer"
                >
                  Xác nhận đổi tên
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
                    Cấp Town Hall Của Bản Thiết Kế
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bản thiết kế này thuộc <strong className="text-amber-400">TH{layout.townHallLevel}</strong> ({reqs.total} vật thể quy chuẩn).
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
              Town Hall là thuộc tính cấu trúc cơ sở của bản thiết kế. Để tránh làm mất cân bằng hoặc sai lệch giới hạn công trình của bản vẽ hiện tại, bạn có 2 lựa chọn:
            </div>

            {/* Target TH Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">
                Chọn cấp Town Hall mới:
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
                    1. Tạo bản sao ở TH{selectedTargetTH}
                  </span>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Nhân bản layout sang TH{selectedTargetTH}, tự động giữ lại và cắt lọc các công trình theo giới hạn mới.
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
                    2. Tạo bản thiết kế mới
                  </span>
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Mở trình tạo bản thiết kế mới cho TH{selectedTargetTH} (Tự động 100%, Bố cục mẫu hoặc Bản đồ trống).
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
