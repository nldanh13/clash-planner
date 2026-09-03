import React from "react";
import { History, RotateCcw, X, Clock, AlertCircle } from "lucide-react";
import type { LayoutCheckpoint, LayoutProject } from "./types";
import { getCheckpoints, restoreCheckpoint } from "./layoutStorage";

interface CheckpointModalProps {
  layout: LayoutProject;
  isOpen: boolean;
  onClose: () => void;
  onRestored: (updated: LayoutProject) => void;
}

export function CheckpointModal({
  layout,
  isOpen,
  onClose,
  onRestored,
}: CheckpointModalProps) {
  if (!isOpen) return null;

  const checkpoints = getCheckpoints(layout.id);

  const handleRestore = (checkpointId: string) => {
    const restored = restoreCheckpoint(checkpointId);
    if (restored) {
      onRestored(restored);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkpoint-modal-title"
    >
      <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#182a3a] flex items-center justify-between bg-[#0e1d2c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 id="checkpoint-modal-title" className="text-sm font-bold text-white">
                Lịch Sử Checkpoint
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                {layout.name} (Tối đa 10 checkpoint gần nhất)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Đóng lịch sử checkpoint"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {checkpoints.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">Chưa có checkpoint nào</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Checkpoint sẽ tự động được tạo trước các thao tác lớn như cập nhật catalog, ghi đè hoặc tự động sắp xếp.
              </p>
            </div>
          ) : (
            checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="p-3 rounded-xl bg-[#07131e] border border-[#1b2f42] flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{cp.reason}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>
                      {new Date(cp.timestamp).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span>{cp.buildings.length} vật thể</span>
                    <span>•</span>
                    <span className="text-amber-300/80">v{cp.catalogVersion}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(cp.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#182a3a] bg-[#07131e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
