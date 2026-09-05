import React from "react";
import { CheckCircle2, AlertTriangle, Sparkles, X, ShieldAlert } from "lucide-react";
import type { LayoutProject } from "./types";
import type { ValidationIssue } from "./LayoutValidator";
import { BUILDING_METADATA_MAP } from "./catalog";
import { useTranslation } from "../../i18n";

interface CatalogUpdateReportModalProps {
  layout: LayoutProject;
  report: {
    addedBuildings: string[];
    keptBuildings: number;
    issues: ValidationIssue[];
  };
  isOpen: boolean;
  onClose: () => void;
  onOpenInEditor?: (layout: LayoutProject) => void;
}

export function CatalogUpdateReportModal({
  layout,
  report,
  isOpen,
  onClose,
  onOpenInEditor,
}: CatalogUpdateReportModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#182a3a] flex items-center justify-between bg-[#0e1d2c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="report-modal-title" className="text-sm font-bold text-white">
                {t("basePlanner.catalogReport.title")}
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                {t("basePlanner.catalogReport.subtitle", { name: layout.name, version: layout.catalogVersion })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={t("basePlanner.catalogReport.closeAria")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-300">{t("basePlanner.catalogReport.successTitle")}</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                {t("basePlanner.catalogReport.successDescription", { count: report.keptBuildings })}
              </p>
            </div>
          </div>

          {/* Added Buildings Breakdown */}
          <div>
            <h4 className="font-bold text-slate-200 mb-2">{t("basePlanner.catalogReport.addedBuildingsTitle", { count: report.addedBuildings.length })}</h4>
            {report.addedBuildings.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">{t("basePlanner.catalogReport.noneAdded")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {report.addedBuildings.map((id, idx) => {
                  const meta = BUILDING_METADATA_MAP[id];
                  return (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[#07131e] border border-[#1b2f42] text-[11px] text-amber-300"
                    >
                      +{meta?.name || id}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validation report */}
          {report.issues.length > 0 && (
            <div>
              <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{t("basePlanner.catalogReport.notesTitle", { count: report.issues.length })}</span>
              </h4>
              <div className="bg-black/40 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1.5 border border-[#1f374e]">
                {report.issues.map((iss, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                    <span className={iss.type === "critical" ? "text-rose-400" : "text-amber-400"}>•</span>
                    <span className="text-slate-300">{iss.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400">
            {t("basePlanner.catalogReport.checkpointHint")}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#182a3a] bg-[#07131e] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            {t("common.close")}
          </button>
          {onOpenInEditor && (
            <button
              onClick={() => {
                onOpenInEditor(layout);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer"
            >
              {t("basePlanner.catalogReport.openInEditor")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
