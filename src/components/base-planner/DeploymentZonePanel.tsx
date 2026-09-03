import React from "react";
import { AlertOctagon, CheckCircle2, MapPin, Shield, Sparkles, Wand2 } from "lucide-react";
import { classifyHoleSeverity } from "./deploymentRisk";
import type { DeploymentAnalysis } from "./deploymentZones";
import type { AutoFixResult } from "./deploymentAutoFix";
import type { BasePurpose, PlacedBuilding } from "./types";

interface DeploymentZonePanelProps {
  analysis: DeploymentAnalysis;
  purpose: BasePurpose;
  buildings: PlacedBuilding[];
  autoFixPreview: AutoFixResult | null;
  isApplyingFix: boolean;
  onViewOnMap: () => void;
  onSuggestFix: () => void;
  onApplyAutoFix: () => void;
  onDismissPreview: () => void;
}

export function DeploymentZonePanel({
  analysis,
  purpose,
  buildings,
  autoFixPreview,
  isApplyingFix,
  onViewOnMap,
  onSuggestFix,
  onApplyAutoFix,
  onDismissPreview,
}: DeploymentZonePanelProps) {
  const holeRegions = analysis.regions.filter((r) => r.type === "internal-hole");
  const classified = holeRegions.map((r) => ({ region: r, ...classifyHoleSeverity(r, buildings, purpose) }));
  const dangerousHoles = classified.filter((c) => c.displayType === "internal-hole" && c.severity !== "info");
  const intentionalHoles = classified.filter((c) => c.displayType === "intentional-pocket");
  const coveragePercent = Math.round(analysis.deploymentCoverageRatio * 1000) / 10;

  return (
    <div className="flex flex-col gap-3">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricTile label="Ô bị cấm thả quân" value={analysis.blockedTileCount} accent="rose" />
        <MetricTile label="Ô được phép thả quân" value={analysis.allowedTileCount} accent="emerald" />
        <MetricTile label="Độ phủ (Coverage)" value={`${coveragePercent}%`} accent="sky" />
        <MetricTile label="Lỗ thả quân bên trong" value={analysis.internalHoleCount} accent={analysis.internalHoleCount > 0 ? "rose" : "emerald"} />
        <MetricTile label="Hành lang xuyên base" value={analysis.corridorCount} accent={analysis.corridorCount > 0 ? "amber" : "emerald"} />
        <MetricTile
          label="Gần Town Hall nhất"
          value={analysis.nearestHoleToTownHall !== null ? `${analysis.nearestHoleToTownHall} ô` : "—"}
          accent={analysis.criticalHoleCount > 0 ? "rose" : "slate"}
        />
      </div>

      {/* Dangerous internal holes alert */}
      {dangerousHoles.length > 0 && (
        <div className="p-3 rounded-xl border border-rose-500/50 bg-rose-950/30 text-rose-200 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex flex-col gap-0.5">
              <strong className="text-[11.5px] font-extrabold text-white">
                Phát hiện {dangerousHoles.length} lỗ thả quân bên trong base
              </strong>
              <p className="text-[10.5px] opacity-90 leading-relaxed">
                {analysis.nearestHoleToTownHall !== null
                  ? `Lỗ nguy hiểm nhất cách Town Hall ${analysis.nearestHoleToTownHall} ô.`
                  : "Không xác định được khoảng cách tới Town Hall."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={onViewOnMap}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              Xem trên bản đồ
            </button>
            <button
              onClick={onSuggestFix}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Đề xuất khắc phục
            </button>
            <button
              onClick={onApplyAutoFix}
              disabled={isApplyingFix}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {isApplyingFix ? "Đang khắc phục..." : "Tự động khắc phục"}
            </button>
          </div>
        </div>
      )}

      {dangerousHoles.length === 0 && (
        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/25 text-emerald-300 flex items-center gap-2.5 text-[11px] font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Không có lỗ thả quân nguy hiểm nào trong base.</span>
        </div>
      )}

      {intentionalHoles.length > 0 && (
        <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-950/20 text-blue-200 flex items-start gap-2.5 text-[10.5px]">
          <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-300" />
          <span>
            {intentionalHoles.length} khoảng trống được coi là chủ đích thẩm mỹ cho base Showcase/Nghệ thuật — không tính là lỗi.
          </span>
        </div>
      )}

      {/* Before/After auto-fix preview */}
      {autoFixPreview && (
        <div className="p-3 rounded-xl border border-slate-700/80 bg-slate-950/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <strong className="text-[11px] font-extrabold text-slate-200">
              {autoFixPreview.applied ? "Xem trước kết quả khắc phục" : "Không tìm được cách khắc phục an toàn"}
            </strong>
            <button
              onClick={onDismissPreview}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>

          {autoFixPreview.applied ? (
            <div className="flex flex-col gap-1 text-[10.5px] font-mono">
              <PreviewRow
                label="Lỗ thả quân"
                before={autoFixPreview.before.internalHoleCount}
                after={autoFixPreview.after.internalHoleCount}
                lowerIsBetter
              />
              <PreviewRow
                label="Gần Town Hall nhất"
                before={autoFixPreview.before.nearestHoleToTownHall ?? "Không có"}
                after={autoFixPreview.after.nearestHoleToTownHall ?? "Không còn"}
              />
              <PreviewRow
                label="Điểm rủi ro triển khai"
                before={autoFixPreview.before.deploymentRiskScore}
                after={autoFixPreview.after.deploymentRiskScore}
                lowerIsBetter
              />
              <PreviewRow label="Điểm tổng" before={autoFixPreview.before.totalScore} after={autoFixPreview.after.totalScore} />
            </div>
          ) : (
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Không di chuyển được công trình nào một cách an toàn (không tạo chồng lấn, không làm giảm nghiêm trọng điểm phòng
              thủ) để đóng các lỗ thả quân hiện tại. Hãy thử điều chỉnh thủ công trên Sơ đồ 2D.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewRow({
  label,
  before,
  after,
  lowerIsBetter = false,
}: {
  label: string;
  before: number | string;
  after: number | string;
  lowerIsBetter?: boolean;
}) {
  const improved =
    typeof before === "number" && typeof after === "number" ? (lowerIsBetter ? after < before : after > before) : null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}:</span>
      <span>
        <span className="text-slate-300">{before}</span>
        <span className="text-slate-600 mx-1">→</span>
        <span className={improved === true ? "text-emerald-400 font-bold" : improved === false ? "text-rose-400 font-bold" : "text-slate-200 font-bold"}>
          {after}
        </span>
      </span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "rose" | "emerald" | "sky" | "amber" | "slate";
}) {
  const colorMap: Record<typeof accent, string> = {
    rose: "text-rose-300 border-rose-500/30 bg-rose-950/20",
    emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-950/20",
    sky: "text-sky-300 border-sky-500/30 bg-sky-950/20",
    amber: "text-amber-300 border-amber-500/30 bg-amber-950/20",
    slate: "text-slate-300 border-slate-700 bg-slate-900/40",
  };
  return (
    <div className={`p-2.5 rounded-lg border flex flex-col gap-0.5 ${colorMap[accent]}`}>
      <span className="text-[9.5px] uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-sm font-black font-mono">{value}</span>
    </div>
  );
}

export default DeploymentZonePanel;
