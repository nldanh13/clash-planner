import React, { useRef, useState } from "react";
import {
  Castle,
  Check,
  Clock,
  Copy,
  Download,
  Edit2,
  FileCode,
  FolderOpen,
  Layers,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createNewLayout,
  deleteLayout,
  duplicateLayout,
  getSavedLayouts,
  parseImportedLayoutJSON,
  renameLayout,
  saveLayout,
  serializeLayout,
} from "./layoutStorage";
import type { LayoutProject } from "./types";

interface LayoutManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayout: LayoutProject;
  onSelectLayout: (layout: LayoutProject) => void;
  onRefreshLayouts: () => void;
  autoSaveTime: string | null;
}

export function LayoutManagerModal({
  isOpen,
  onClose,
  activeLayout,
  onSelectLayout,
  onRefreshLayouts,
  autoSaveTime,
}: LayoutManagerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [layouts, setLayouts] = useState<LayoutProject[]>(() => getSavedLayouts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState("");

  // New Layout Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [newLayoutTH, setNewLayoutTH] = useState<number>(activeLayout.townHallLevel || 11);
  const [newUsePreset, setNewUsePreset] = useState(true);

  if (!isOpen) return null;

  const refreshList = () => {
    const list = getSavedLayouts();
    setLayouts(list);
    onRefreshLayouts();
  };

  const handleStartRename = (layout: LayoutProject) => {
    setEditingId(layout.id);
    setEditNameText(layout.name);
  };

  const handleSaveRename = (layoutId: string) => {
    if (editNameText.trim()) {
      renameLayout(layoutId, editNameText);
      refreshList();
    }
    setEditingId(null);
  };

  const handleDuplicate = (layoutId: string) => {
    const cloned = duplicateLayout(layoutId);
    if (cloned) {
      refreshList();
      onSelectLayout(cloned);
    }
  };

  const handleDelete = (layoutId: string, name: string) => {
    if (layouts.length <= 1) {
      alert("Bạn phải giữ ít nhất 1 bản thiết kế trong danh sách.");
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa bản thiết kế "${name}"?`)) {
      const { success, nextActiveId } = deleteLayout(layoutId);
      if (success) {
        refreshList();
        if (activeLayout.id === layoutId && nextActiveId) {
          const next = getSavedLayouts().find((l) => l.id === nextActiveId);
          if (next) onSelectLayout(next);
        }
      }
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createNewLayout(newLayoutName, newLayoutTH, newUsePreset);
    setIsCreating(false);
    setNewLayoutName("");
    refreshList();
    onSelectLayout(created);
  };

  const handleExportJSON = (layout: LayoutProject) => {
    const serialized = serializeLayout(layout);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `COC_Base_TH${layout.townHallLevel}_${layout.name.replace(/\s+/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseImportedLayoutJSON(text);
      saveLayout(parsed);
      refreshList();
      onSelectLayout(parsed);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Tệp JSON không hợp lệ.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0d1a24] border border-[#2d4355] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#203241] bg-[#09131b]">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide">
                Quản lý Bản thiết kế & Auto-Save
              </h2>
              <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                <span>Lưu trữ cục bộ trình duyệt</span>
                {autoSaveTime && (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Clock className="w-3 h-3" /> Auto-save: {autoSaveTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#142634] hover:bg-[#1c3548] text-slate-300 text-xs font-bold border border-[#2c4458] transition-colors"
              title="Nhập tệp JSON vào danh sách"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportJSON}
            />

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Create New Layout Form toggle */}
          {isCreating ? (
            <form
              onSubmit={handleCreateNew}
              className="p-4 rounded-xl bg-[#09141e] border border-amber-500/40 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <strong className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Tạo Bản Thiết Kế Mới
                </strong>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-300">Tên bản thiết kế:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TH15 War Anti-Lalo"
                    value={newLayoutName}
                    onChange={(e) => setNewLayoutName(e.target.value)}
                    className="px-3 py-1.5 bg-[#0e1f2d] border border-[#2b4458] rounded-lg text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-300">Cấp Town Hall:</label>
                  <select
                    value={newLayoutTH}
                    onChange={(e) => setNewLayoutTH(Number(e.target.value))}
                    className="px-3 py-1.5 bg-[#0e1f2d] border border-[#2b4458] rounded-lg text-xs text-white outline-none focus:border-amber-400"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Town Hall {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUsePreset}
                    onChange={(e) => setNewUsePreset(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>Tự động nạp mẫu bố cục tiêu chuẩn TH{newLayoutTH} (thay vì lưới trống)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-all"
                >
                  Xác nhận tạo
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#345169] hover:border-amber-400/80 bg-[#09141e]/70 hover:bg-[#0f2130] text-slate-300 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bản Thiết Kế Mới</span>
            </button>
          )}

          {/* Saved Layouts List */}
          <div className="flex flex-col gap-2.5">
            {layouts.map((l) => {
              const isActive = l.id === activeLayout.id;
              const isEditing = editingId === l.id;

              return (
                <div
                  key={l.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isActive
                      ? "bg-[#112433] border-amber-400/70 shadow-lg shadow-amber-950/20"
                      : "bg-[#0a151f] border-[#223646] hover:border-[#37536b]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* TH Badge */}
                    <div className="w-10 h-10 rounded-lg bg-[#183144] border border-[#2d4f6a] flex flex-col items-center justify-center flex-shrink-0 text-amber-400">
                      <Castle className="w-4 h-4" />
                      <span className="text-[9px] font-black">TH{l.townHallLevel}</span>
                    </div>

                    {/* Layout Info / Rename input */}
                    <div className="flex flex-col min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editNameText}
                            onChange={(e) => setEditNameText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(l.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            className="px-2 py-0.5 bg-[#071017] border border-cyan-400 rounded text-xs text-white outline-none w-full"
                          />
                          <button
                            onClick={() => handleSaveRename(l.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-white truncate">{l.name}</strong>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-black">
                              ĐANG DÙNG
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span>{l.buildings?.length || 0} công trình</span>
                        <span>•</span>
                        <span>Cập nhật: {new Date(l.updatedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {!isActive && (
                      <button
                        onClick={() => {
                          onSelectLayout(l);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                        title="Tải và chỉnh sửa bản thiết kế này"
                      >
                        Chọn dùng
                      </button>
                    )}

                    <button
                      onClick={() => handleStartRename(l)}
                      className="p-1.5 rounded-lg bg-[#142634] hover:bg-[#1e394e] text-slate-300 hover:text-white transition-colors"
                      title="Đổi tên"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDuplicate(l.id)}
                      className="p-1.5 rounded-lg bg-[#142634] hover:bg-[#1e394e] text-slate-300 hover:text-white transition-colors"
                      title="Nhân bản (Clone) layout này"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleExportJSON(l)}
                      className="p-1.5 rounded-lg bg-[#142634] hover:bg-[#1e394e] text-cyan-300 hover:text-cyan-200 transition-colors"
                      title="Xuất file JSON của bản thiết kế này"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(l.id, l.name)}
                      disabled={layouts.length <= 1}
                      className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Xóa layout này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1d2d3a] bg-[#09131b] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Tổng số: <b>{layouts.length}</b> bản thiết kế đã lưu
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a2c3b] hover:bg-[#233b4e] text-white font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
