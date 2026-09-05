import React, { useState, useMemo } from "react";
import {
  Shield,
  Clock,
  Coins,
  Sparkles,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle2,
  Info,
  Layers,
  Flame,
  Award,
  ChevronDown
} from "lucide-react";
import type { Player } from "../../types";
import { SmartArt } from "../SmartArt";
import { AnimatedCounter, AnimatedProgressBar } from "../ui/AnimatedFeedback";
import { fmtCost, fmtTime, fmtTimeExact, itemKindLabel } from "../../utils/formatters";
import {
  getTop3BuildingRecommendations,
  type UpgradePriorityCriterion,
  type BuildingCategoryFilter,
  type RecommendedBuilding
} from "../../utils/smartBuildingAdvisor";

interface SmartBuildingAdvisorProps {
  player: Player | null;
  manualLevels: Record<string, number>;
  effectiveTownHall: number;
  goldPassDiscount: number;
  onSelectItemDetail: (itemId: string, targetLevel: number) => void;
}

export function SmartBuildingAdvisor({
  player,
  manualLevels,
  effectiveTownHall,
  goldPassDiscount,
  onSelectItemDetail
}: SmartBuildingAdvisorProps) {
  const [criterion, setCriterion] = useState<UpgradePriorityCriterion>("defense-impact");
  const [categoryFilter, setCategoryFilter] = useState<BuildingCategoryFilter>("all");

  const recommendations = useMemo(() => {
    return getTop3BuildingRecommendations({
      player,
      manualLevels,
      targetTownHall: effectiveTownHall,
      goldPassDiscount,
      criterion,
      categoryFilter
    });
  }, [player, manualLevels, effectiveTownHall, goldPassDiscount, criterion, categoryFilter]);

  const criterionLabels: {
    id: UpgradePriorityCriterion;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "defense-impact",
      label: "Ảnh hưởng phòng thủ",
      sublabel: "Ưu tiên vũ khí sát thương lớn nhất để giữ sao và chống 3 sao",
      icon: <Shield className="w-4 h-4 text-rose-400" />
    },
    {
      id: "lowest-time",
      label: "Thời gian thấp nhất",
      sublabel: "Hoàn thành sớm nhất để nhanh chóng giải phóng thợ xây",
      icon: <Clock className="w-4 h-4 text-emerald-400" />
    },
    {
      id: "lowest-cost",
      label: "Tài nguyên thấp nhất",
      sublabel: "Tiết kiệm chi phí nhất, nâng ngay mà không cần farm nhiều",
      icon: <img src="/resources/gold.png" className="w-4 h-4 object-contain inline-block" alt="Cost" />
    },
    {
      id: "balanced",
      label: "Chiến lược cân bằng",
      sublabel: "Tỷ suất hiệu quả (ROI) tối ưu giữa phòng thủ, giá và thời gian",
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />
    }
  ];

  return (
    <section className="bg-[#0b141e] border border-[#213547] rounded-xl p-4 md:p-5 my-4 shadow-lg">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#ffffff14]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-extrabold text-amber-300 tracking-wide">
                Gợi Ý Nâng Cấp Thông Minh
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                TH{effectiveTownHall}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                Top 3 công trình ưu tiên
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Phân tích thuật toán dựa trên thông số công trình, chi phí thực tế và tác động chiến thuật tại Town Hall {effectiveTownHall}.
            </p>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 hidden md:flex">
            <Filter className="w-3 h-3 text-slate-400" />
            Lọc:
          </span>
          <div className="relative w-36">
            <select
              className="w-full appearance-none bg-[#070d14] border border-[#ffffff12] text-white text-xs font-semibold rounded-lg pl-3 pr-7 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
            >
              <option value="all">Tất cả</option>
              <option value="defense">Phòng thủ</option>
              <option value="hero">Anh hùng</option>
              <option value="army">Quân đội</option>
              <option value="resource">Tài nguyên</option>
              <option value="building">Xây dựng</option>
              <option value="trap">Bẫy</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Priority Strategy Selection Tabs */}
      <div className="mt-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {criterionLabels.map(item => {
            const isSelected = criterion === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCriterion(item.id)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-full transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                    : "bg-[#142636] text-slate-300 font-medium hover:bg-[#1a3045]"
                }`}
                aria-pressed={isSelected}
              >
                {isSelected ? React.cloneElement(item.icon as React.ReactElement, { className: "w-4 h-4 text-slate-900" } as any) : item.icon}
                <span className="text-sm">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-slate-400 mt-3 flex items-center gap-1.5 ml-1">
          <Info className="w-4 h-4 text-slate-500 shrink-0" />
          {criterionLabels.find(c => c.id === criterion)?.sublabel}
        </p>
      </div>

      {/* Recommendations Cards (Top 3) */}
      {recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => {
            const nextCostStr = fmtCost({ [rec.nextStep.resource]: rec.nextStep.cost });
            const nextTimeStr = fmtTime(rec.nextStep.timeHours);
            const isRank1 = idx === 0;

            return (
              <article
                key={rec.item.id}
                onClick={() => onSelectItemDetail(rec.item.id, rec.target)}
                className={`relative flex flex-col justify-between rounded-xl p-4 border transition-all cursor-pointer group ${
                  isRank1
                    ? "bg-[#11202e] border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.05)] hover:bg-[#15273a]"
                    : "bg-[#0c1620] border-[#ffffff1a] hover:border-[#ffffff30] hover:bg-[#121e2a]"
                }`}
              >
                <div>
                  {/* Top badges: Rank & Highlight Tag */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`px-3 py-1 text-xs font-black rounded-full tracking-wide ${
                        idx === 0
                          ? "bg-amber-400 text-slate-950"
                          : idx === 1
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-slate-700 text-slate-200"
                      }`}
                    >
                      {rec.rankBadge}
                    </span>

                    <span
                      className="px-2.5 py-1 text-xs font-bold rounded-md text-amber-300"
                      title={rec.highlightTag}
                    >
                      {rec.highlightTag}
                    </span>
                  </div>

                  {/* Building Identity & SmartArt */}
                  <div className="flex items-start gap-4 mb-5 group-hover:transform group-hover:translate-x-1 transition-transform">
                    <div className="shrink-0 relative">
                      <SmartArt item={rec.item} townHallLevel={rec.nextLevel} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <small className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {itemKindLabel[rec.item.kind]}
                        </small>
                        {rec.item.quantity > 1 && (
                          <span className="text-xs text-slate-500 font-medium">
                            (x{rec.item.quantity})
                          </span>
                        )}
                      </div>
                      <h4 className="text-base md:text-lg font-bold text-white truncate" title={rec.item.name}>
                        {rec.item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-sm font-semibold flex-wrap">
                        <span className="text-slate-400">Lv {rec.current}</span>
                        <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-emerald-300 font-bold">Lv {rec.nextLevel}</span>
                        <span className="text-xs text-slate-500 ml-auto font-normal whitespace-nowrap">
                          (Max: {rec.target})
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hidden md:block">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Defense Score / Tactical Impact Meter - Flattened */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-sm mb-1.5 flex-wrap gap-1">
                      <span className="text-slate-300 flex items-center gap-1.5 font-medium whitespace-nowrap">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        Ảnh hưởng
                      </span>
                      <span className="font-bold text-cyan-300 whitespace-nowrap">
                        <AnimatedCounter value={rec.defenseImpact.score} />/100 · Hạng {rec.defenseImpact.tier}
                      </span>
                    </div>
                    <AnimatedProgressBar
                      percent={rec.defenseImpact.score}
                      className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden mb-2"
                      barClassName={`h-full rounded-full ${
                        rec.defenseImpact.score >= 90
                          ? "bg-rose-500"
                          : rec.defenseImpact.score >= 80
                          ? "bg-amber-400"
                          : rec.defenseImpact.score >= 65
                          ? "bg-cyan-400"
                          : "bg-slate-400"
                      }`}
                    />
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      <strong className="text-slate-200 font-semibold">{rec.defenseImpact.role}:</strong> {rec.defenseImpact.description}
                    </p>
                  </div>

                  {/* Cost & Time Next Step Details - Flattened */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-[#ffffff10]">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <img src="/resources/gold.png" className="w-3.5 h-3.5 object-contain inline-block shrink-0" alt="Cost" /> Chi phí
                      </span>
                      <strong className="text-amber-300 font-bold text-sm truncate block" title={nextCostStr}>
                        {nextCostStr}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Thời gian
                      </span>
                      <strong
                        className="text-emerald-300 font-bold text-sm truncate block"
                        title={fmtTimeExact(rec.nextStep.timeHours)}
                      >
                        {nextTimeStr}
                      </strong>
                    </div>
                  </div>

                  {/* Recommendation Reason - Flattened */}
                  <div className="text-xs text-slate-300 mt-auto flex items-start gap-2 leading-relaxed bg-[#142636]/40 p-3 rounded-lg border border-[#ffffff08]">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2" title={rec.reason}>{rec.reason}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-[#0e1925] border border-[#ffffff12] rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
          <h4 className="text-sm font-bold text-slate-200">
            Tất cả công trình phù hợp đã đạt cấp tối đa tại TH{effectiveTownHall}!
          </h4>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            Không còn công trình nào thuộc bộ lọc này cần nâng cấp. Bạn có thể chọn danh mục khác hoặc chuẩn bị nâng cấp Town Hall tiếp theo.
          </p>
        </div>
      )}
    </section>
  );
}
