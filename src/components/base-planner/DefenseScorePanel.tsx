import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { AnimatedCounter, AnimatedProgressBar } from "../ui/AnimatedFeedback";
import { DeploymentZonePanel } from "./DeploymentZonePanel";
import type { AutoFixResult } from "./deploymentAutoFix";
import type { BasePurpose, DefenseScoreResult, PlacedBuilding } from "./types";
import { useTranslation } from "../../i18n";

interface DefenseScorePanelProps {
  defenseScore: DefenseScoreResult;
  onClose?: () => void;
  /** Deployment Zone tab context — omit to hide the tab entirely (e.g. no layout loaded yet). */
  deploymentContext?: {
    purpose: BasePurpose;
    buildings: PlacedBuilding[];
    autoFixPreview: AutoFixResult | null;
    isApplyingFix: boolean;
    onViewOnMap: () => void;
    onSuggestFix: () => void;
    onApplyAutoFix: () => void;
    onDismissPreview: () => void;
  };
}

export function DefenseScorePanel({ defenseScore, onClose, deploymentContext }: DefenseScorePanelProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"breakdown" | "warnings" | "deployment">("breakdown");

  const { totalScore, tier, tierTitle, tierColor, breakdown, warnings } = defenseScore;

  const criticalWarnings = warnings.filter((w) => w.type === "critical");

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 shadow-2xl text-slate-200 flex flex-col gap-3 w-full h-full min-h-0 overflow-y-auto transition-all">
      {/* Header with Overall Score & Tier */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* Tier Avatar Badge with Glow */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg border-2 transition-transform hover:scale-105 select-none"
            style={{
              backgroundColor: `${tierColor}18`,
              borderColor: tierColor,
              color: tierColor,
              boxShadow: `0 0 16px ${tierColor}30`,
            }}
          >
            {tier}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                {t("basePlanner.defenseScore.title")}
              </h3>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shadow-sm"
                style={{
                  backgroundColor: `${tierColor}25`,
                  color: tierColor,
                  border: `1px solid ${tierColor}60`,
                }}
              >
                {tier}-Tier
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400">{tierTitle}</p>
          </div>
        </div>

        {/* Overall Score Counter & Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              <AnimatedCounter value={totalScore} decimals={1} />
              <span className="text-xs text-slate-400 font-bold ml-1">/100</span>
            </div>
            <span className="text-[9.5px] text-emerald-400 font-black uppercase tracking-wider block">
              {t("basePlanner.defenseScore.liveEngine")}
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? t("basePlanner.defenseScore.collapseTitle") : t("basePlanner.defenseScore.expandTitle")}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                title={t("basePlanner.defenseScore.closeTitle")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "breakdown"
                  ? "bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t("basePlanner.defenseScore.tabs.breakdown")}</span>
            </button>

            <button
              onClick={() => setActiveTab("warnings")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "warnings"
                  ? "bg-slate-800 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("basePlanner.defenseScore.tabs.warnings")}</span>
              {warnings.length > 0 && (
                <span
                  className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full font-mono ml-1 ${
                    criticalWarnings.length > 0
                      ? "bg-rose-500/30 text-rose-300 border border-rose-500/50"
                      : "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                  }`}
                >
                  {warnings.length}
                </span>
              )}
            </button>

            {deploymentContext && defenseScore.deployment && (
              <button
                onClick={() => setActiveTab("deployment")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "deployment"
                    ? "bg-slate-800 text-sky-300 border border-sky-500/40 shadow-sm"
                    : "bg-transparent text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>{t("basePlanner.defenseScore.tabs.deployment")}</span>
                {defenseScore.deployment.internalHoleCount > 0 && (
                  <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full font-mono ml-1 bg-rose-500/30 text-rose-300 border border-rose-500/50">
                    {defenseScore.deployment.internalHoleCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Tab 1: Detailed Breakdown with Visual Progress Bars */}
          {activeTab === "breakdown" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {Object.values(breakdown).map((cat) => {
                const percent = Math.min(100, Math.round((cat.score / cat.maxScore) * 100));
                const barGradient =
                  percent >= 80
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : percent >= 55
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                    : "bg-gradient-to-r from-rose-500 to-red-400";

                const scoreLabel =
                  percent >= 80
                    ? t("basePlanner.defenseScore.scoreLabels.optimal")
                    : percent >= 55
                    ? t("basePlanner.defenseScore.scoreLabels.good")
                    : t("basePlanner.defenseScore.scoreLabels.needsImprovement");

                const badgeColor =
                  percent >= 80
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : percent >= 55
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40";

                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/90 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-200">{cat.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                          {scoreLabel}
                        </span>
                        <span className="font-black font-mono text-white text-xs">
                          <AnimatedCounter value={percent} suffix="%" />
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <AnimatedProgressBar
                      percent={percent}
                      className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800"
                      barClassName={`h-full rounded-full ${barGradient}`}
                    />

                    <p className="text-[10px] text-slate-400 leading-relaxed">{cat.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Actionable Warnings & Recommendations */}
          {activeTab === "warnings" && (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {warnings.length === 0 ? (
                <div className="p-4 text-center text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2.5">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-semibold">
                    {t("basePlanner.defenseScore.noWarnings")}
                  </span>
                </div>
              ) : (
                warnings.map((w) => {
                  const isCrit = w.type === "critical";
                  const isWarn = w.type === "warning";

                  return (
                    <div
                      key={w.id}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                        isCrit
                          ? "bg-rose-950/30 border-rose-500/50 text-rose-200"
                          : isWarn
                          ? "bg-amber-950/25 border-amber-500/40 text-amber-200"
                          : "bg-blue-950/20 border-blue-500/30 text-blue-200"
                      }`}
                    >
                      {isCrit ? (
                        <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                      ) : isWarn ? (
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      )}

                      <div className="flex flex-col gap-0.5 flex-1">
                        <strong className="font-extrabold text-[11.5px] text-white">
                          {w.title}
                        </strong>
                        <p className="text-[10.5px] opacity-90 leading-relaxed">{w.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Deployment Zone */}
          {activeTab === "deployment" && deploymentContext && defenseScore.deployment && (
            <DeploymentZonePanel
              analysis={defenseScore.deployment}
              purpose={deploymentContext.purpose}
              buildings={deploymentContext.buildings}
              autoFixPreview={deploymentContext.autoFixPreview}
              isApplyingFix={deploymentContext.isApplyingFix}
              onViewOnMap={deploymentContext.onViewOnMap}
              onSuggestFix={deploymentContext.onSuggestFix}
              onApplyAutoFix={deploymentContext.onApplyAutoFix}
              onDismissPreview={deploymentContext.onDismissPreview}
            />
          )}
        </>
      )}
    </div>
  );
}

export default DefenseScorePanel;
