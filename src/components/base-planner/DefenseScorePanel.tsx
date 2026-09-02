import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import type { DefenseScoreResult, DefenseWarning } from "./types";

interface DefenseScorePanelProps {
  defenseScore: DefenseScoreResult;
  onClose?: () => void;
}

export function DefenseScorePanel({ defenseScore, onClose }: DefenseScorePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"breakdown" | "warnings">("breakdown");

  const { totalScore, tier, tierTitle, tierColor, breakdown, warnings } = defenseScore;

  const criticalWarnings = warnings.filter((w) => w.type === "critical");
  const otherWarnings = warnings.filter((w) => w.type !== "critical");

  return (
    <div className="defense-score-card bg-[#0b1622] border border-[#263c4e] rounded-xl p-4 shadow-xl text-slate-200 flex flex-col gap-3">
      {/* Header with Overall Score & Tier */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1c2e3d]">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg border"
            style={{
              backgroundColor: `${tierColor}18`,
              borderColor: tierColor,
              color: tierColor,
            }}
          >
            {tier}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white tracking-wide">
                Đánh giá Phòng thủ 3-Sao
              </h3>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${tierColor}25`,
                  color: tierColor,
                  border: `1px solid ${tierColor}66`,
                }}
              >
                {tier}-Tier
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">{tierTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black text-white tracking-tight">
              {totalScore.toFixed(1)}
              <span className="text-xs text-slate-400 font-semibold">/100</span>
            </div>
            <span className="text-[9.5px] text-emerald-400 font-bold uppercase tracking-wider">
              Real-time Score
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#142636] hover:bg-[#1b344a] text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? "Thu gọn" : "Mở rộng"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === "breakdown"
                  ? "bg-[#183144] text-cyan-400 border border-cyan-500/40"
                  : "bg-[#0f1d2a] text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Tiêu chí chấm điểm (5)</span>
            </button>

            <button
              onClick={() => setActiveTab("warnings")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === "warnings"
                  ? "bg-[#183144] text-amber-400 border border-amber-500/40"
                  : "bg-[#0f1d2a] text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Cảnh báo điểm yếu</span>
              {warnings.length > 0 && (
                <span
                  className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-full ${
                    criticalWarnings.length > 0
                      ? "bg-red-500/30 text-red-300 border border-red-500/50"
                      : "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                  }`}
                >
                  {warnings.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Detailed Breakdown Bars */}
          {activeTab === "breakdown" && (
            <div className="flex flex-col gap-2.5">
              {Object.values(breakdown).map((cat) => {
                const percent = Math.min(100, Math.round((cat.score / cat.maxScore) * 100));
                const barColor =
                  percent >= 80 ? "bg-emerald-500" : percent >= 55 ? "bg-amber-400" : "bg-red-500";

                return (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-lg bg-[#0e1b26] border border-[#1e3344] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{cat.name}</span>
                      <div className="font-extrabold text-white">
                        {cat.score}
                        <span className="text-slate-500 text-[10px]">/{cat.maxScore} đ</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-[#162736] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

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
                <div className="p-4 text-center text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Bố cục hoàn hảo! Không phát hiện điểm mù hoặc cụm hỏa lực nguy hiểm nào.</span>
                </div>
              ) : (
                warnings.map((w) => {
                  const isCrit = w.type === "critical";
                  const isWarn = w.type === "warning";

                  return (
                    <div
                      key={w.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                        isCrit
                          ? "bg-red-950/30 border-red-500/50 text-red-200"
                          : isWarn
                          ? "bg-amber-950/25 border-amber-500/40 text-amber-200"
                          : "bg-blue-950/20 border-blue-500/30 text-blue-200"
                      }`}
                    >
                      {isCrit ? (
                        <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex flex-col gap-0.5 flex-1">
                        <strong className="font-extrabold text-[11px] text-white">
                          {w.title}
                        </strong>
                        <p className="text-[10px] opacity-90 leading-relaxed">{w.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
