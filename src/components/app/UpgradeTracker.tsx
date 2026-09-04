import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Castle, Clock3, Coins, Crosshair, Gem, Info, Target, Hammer, FlaskConical, PawPrint, Wrench, ChevronRight, Sparkles, Filter, ChevronDown } from "lucide-react";
import type { Player } from "../../types";
import { type UpgradeItem, upgradeItems, type UpgradeLane, upgradeSources } from "../../upgradeData";
import { CostBadges, SmartArt, resourceIcon } from "../SmartArt";
import { pct, fmtNumber, fmtTime, fmtTimeExact, itemKindLabel, dataStatusLabel, fmtCost, dataStatusDetail } from "../../utils/formatters";
import { type Playstyle, type StyleFocus, readStoredChoice, readStoredNumber, currentLevelFor, summarizePlan, manualKey, trackerKindOrder, playstyleHint } from "../../utils/upgradeLogic";
import { useUpgradeTracker, plannerItems } from "../../hooks/useUpgradeTracker";
import { clampInteger } from "../../utils/villageImport";
import { SmartBuildingAdvisor } from "./SmartBuildingAdvisor";

const playstyleValues: Playstyle[] = ["rush", "balanced", "defense", "rush-hall"];
const styleFocusValues: StyleFocus[] = ["ground", "air", "both"];
const LEVEL_TABLE_PREVIEW = 15;

interface UpgradeTrackerProps {
  setGuestTownHall: (th: number) => void;
  setManualLevels: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  player: Player | null;
  manualLevels: Record<string, number>;
  guestTownHall: number;
}

export function UpgradeTracker({ player, manualLevels, guestTownHall, setGuestTownHall, setManualLevels }: UpgradeTrackerProps) {
  const [calcMode, setCalcMode] = useState<"suggest" | "town-hall" | "single">("suggest");
  const [plannerKind, setPlannerKind] = useState<UpgradeItem["kind"] | "all">("all");
  const [plannerItemId, setPlannerItemId] = useState("barbarian-king");
  const [targetLevel, setTargetLevel] = useState(100);
  const [maxTownHall, setMaxTownHall] = useState(18);
  const [builderCount, setBuilderCount] = useState(5);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [thCategoryFilter, setThCategoryFilter] = useState<UpgradeItem["kind"] | "all">("all");
  const [playstyle, setPlaystyle] = useState<Playstyle>(() => readStoredChoice("coc-playstyle", playstyleValues, "balanced"));
  const [attackFocus, setAttackFocus] = useState<StyleFocus>(() => readStoredChoice("coc-attack-focus", styleFocusValues, "both"));
  const [defenseFocusPick, setDefenseFocusPick] = useState<StyleFocus>(() => readStoredChoice("coc-defense-focus", styleFocusValues, "both"));
  const [goldPassDiscount, setGoldPassDiscount] = useState<number>(() => readStoredNumber("coc-goldpass", [0, 10, 15, 20], 0));

  const {
    townHallRows,
    townHallGroups,
    townHallTotals,
    suggestRows,
    suggestTotals,
    suggestTop,
    suggestPhases,
    effectiveTownHall
  } = useUpgradeTracker({
    player,
    manualLevels,
    maxTownHall,
    playstyle,
    attackFocus,
    defenseFocusPick,
    guestTownHall,
    goldPassDiscount
  });

  const plannerItem = plannerItems.find(x => x.id === plannerItemId) || plannerItems[0];
  const currentPlannerLevel = currentLevelFor(plannerItem, player, manualLevels);
  const maxPlannerLevel = plannerItem.levels[plannerItem.levels.length - 1]?.level || 1;
  const safeTargetLevel = Math.max(currentPlannerLevel, Math.min(maxPlannerLevel, targetLevel));
  const plan = summarizePlan(plannerItem, currentPlannerLevel, safeTargetLevel, plannerItem.quantity, goldPassDiscount);
  const plannerItemGroups = useMemo(() => trackerKindOrder.map(kind => ({ kind, items: plannerItems.filter(i => i.kind === kind) })).filter(g => g.items.length), []);
  const setManualLevel = (item: any, val: number) => setManualLevels(prev => ({ ...prev, [manualKey(player, item)]: val }));

  // Filter town hall groups according to selected category
  const filteredTownHallGroups = useMemo(() => {
    if (thCategoryFilter === "all") return townHallGroups;
    return townHallGroups.filter(g => g.kind === thCategoryFilter);
  }, [townHallGroups, thCategoryFilter]);

  const selectItemForDetail = (itemId: string, tgtLv?: number) => {
    const item = upgradeItems.find(x => x.id === itemId) || upgradeItems[0];
    setPlannerItemId(item.id);
    if (tgtLv !== undefined) {
      setTargetLevel(tgtLv);
    } else {
      setTargetLevel(item.levels.at(-1)?.level || 1);
    }
    setCalcMode("single");
  };

  return (
    <section className="panel planner-panel">
      <div className="section-head">
        <div>
          <p>CÔNG CỤ NÂNG CẤP CHIẾN THUẬT</p>
          <h2>Upgrade Tracker</h2>
        </div>
        <span className="road-current">{plannerItems.length} mục dữ liệu · bỏ qua Wall</span>
      </div>

      {/* 3 Main Modes Switcher */}
      <div className="flex p-1 bg-[#09141d] rounded-xl border border-[#ffffff12] mb-5 relative z-0 overflow-x-auto min-w-0" role="tablist">
        {[
          { id: "suggest", label: "Gợi ý cho tôi", icon: <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> },
          { id: "town-hall", label: "Theo Town Hall", icon: <Castle className="w-3.5 h-3.5 md:w-4 md:h-4" /> },
          { id: "single", label: "Tra cứu chi tiết", icon: <Target className="w-3.5 h-3.5 md:w-4 md:h-4" /> }
        ].map((tab) => {
          const isActive = calcMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCalcMode(tab.id as any)}
              role="tab"
              aria-selected={isActive}
              className={`flex-1 min-w-[120px] shrink-0 relative flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 text-[11px] md:text-sm font-bold transition-colors z-10 ${
                isActive ? "text-amber-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="upgrade-mode-active-tab"
                  className="absolute inset-0 bg-[#142636] border border-[#ffffff10] rounded-lg -z-10 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ffffff12] bg-[#0c1620] mb-2 overflow-x-auto min-w-0 w-full">
        <strong className="text-xs text-amber-400 whitespace-nowrap">🎟️ Vé Vàng (Gold Pass):</strong>
        <div className="relative w-32 shrink-0">
          <select
            className="w-full appearance-none bg-[#142636] border border-[#ffffff12] text-amber-400 text-xs font-bold rounded-md pl-3 pr-7 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
            value={goldPassDiscount}
            onChange={(e) => {
              const pct = Number(e.target.value);
              setGoldPassDiscount(pct);
              localStorage.setItem("coc-goldpass", pct.toString());
            }}
          >
            <option value={0}>Không có</option>
            <option value={10}>Giảm 10%</option>
            <option value={15}>Giảm 15%</option>
            <option value={20}>Giảm 20%</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-amber-400/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <p className="text-[10px] text-slate-400 ml-auto hidden md:block">Tự động áp dụng giảm chi phí & thời gian</p>
      </div>

      {/* MODE 1: GỢI Ý CHO TÔI (SUGGEST) - Gọn gàng, tập trung xếp hạng ưu tiên */}
      <AnimatePresence mode="wait">
        {calcMode === "suggest" && (
          <motion.div
            key="suggest"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="planner-main min-w-0 w-full"
          >
            {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lối chơi</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-[#101b25] border border-[#ffffff10] text-white text-sm font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-amber-500/50 cursor-pointer"
                  value={playstyle}
                  onChange={(e) => setPlaystyle(e.target.value as Playstyle)}
                >
                  <option value="rush">Tấn công</option>
                  <option value="balanced">Cân bằng</option>
                  <option value="defense">Phòng thủ</option>
                  <option value="rush-hall">Rush Hall</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 px-1">{playstyleHint[playstyle]}</p>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mục tiêu tấn công</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-[#101b25] border border-[#ffffff10] text-white text-sm font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-amber-500/50 cursor-pointer"
                  value={attackFocus}
                  onChange={(e) => setAttackFocus(e.target.value as StyleFocus)}
                >
                  <option value="ground">Trên bộ</option>
                  <option value="air">Trên không</option>
                  <option value="both">Cả hai</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mối lo phòng thủ</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-[#101b25] border border-[#ffffff10] text-white text-sm font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-amber-500/50 cursor-pointer"
                  value={defenseFocusPick}
                  onChange={(e) => setDefenseFocusPick(e.target.value as StyleFocus)}
                >
                  <option value="ground">Chống bộ</option>
                  <option value="air">Chống bay</option>
                  <option value="both">Cả hai</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {!player && (
            <div className="mb-6 p-4 rounded-xl border border-dashed border-[#415565] bg-[#101d27]">
              <div className="flex items-center justify-between mb-2">
                <small className="text-slate-300 font-semibold">Chưa kết nối tài khoản — giả định Town Hall</small>
                <strong className="text-amber-400 font-black text-lg">TH{guestTownHall}</strong>
              </div>
              <input
                type="range"
                className="w-full accent-amber-400"
                min="1"
                max="18"
                step="1"
                value={guestTownHall}
                onChange={e => setGuestTownHall(clampInteger(e.target.valueAsNumber, 1, 18, 8))}
              />
            </div>
          )}

          {/* Quick Metrics for Current TH */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-[#ffffff10] bg-[#101b25]">
              <small className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Sparkles className="w-4 h-4 text-amber-400"/> Mục tiêu hiện tại</small>
              <strong className="text-xl font-black text-white block">Town Hall {effectiveTownHall}</strong>
            </div>
            <div className="p-4 rounded-xl border border-[#ffffff10] bg-[#101b25]">
              <small className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Wrench className="w-4 h-4 text-cyan-400"/> Cần nâng ở TH{effectiveTownHall}</small>
              <strong className="text-xl font-black text-white block">{suggestTotals.count} mục</strong>
            </div>
            <div className="p-4 rounded-xl border border-[#ffffff10] bg-[#101b25]">
              <small className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><img src="/resources/gold.png" className="w-4 h-4 object-contain inline-block" alt="Cost" /> Tổng chi phí</small>
              <div className="mt-1"><CostBadges costs={suggestTotals.costs} /></div>
              {suggestTotals.hasEstimated && <span className="text-xs text-rose-400 mt-1 block flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Có số liệu ước tính</span>}
            </div>
          </div>

          {/* Gợi ý nâng cấp thông minh 3 công trình ưu tiên nhất */}
          <SmartBuildingAdvisor
            player={player}
            manualLevels={manualLevels}
            effectiveTownHall={effectiveTownHall}
            goldPassDiscount={goldPassDiscount}
            onSelectItemDetail={selectItemForDetail}
          />

          {/* Strategic Roadmap Phases */}
          {suggestPhases.length > 0 && (
            <div className="mb-8 min-w-0 w-full">
              <div className="mb-4">
                <h2 className="text-lg md:text-xl font-black text-white mb-1">Lộ Trình Giai Đoạn</h2>
                <p className="text-sm text-slate-400">Các giai đoạn nâng cấp khuyến nghị cho TH{effectiveTownHall}</p>
              </div>
              <div className="flex overflow-x-auto gap-3 pb-2 snap-x w-full">
                {suggestPhases.map((phase, idx) => (
                  <article 
                    key={phase.name}
                    className="flex-shrink-0 w-[180px] md:w-auto md:min-w-[160px] snap-start relative flex items-center gap-3 p-3 rounded-xl border border-[#ffffff10] bg-[#101b25] hover:bg-[#142636] transition-colors"
                  >
                    {idx < suggestPhases.length - 1 && (
                      <div className="hidden md:block absolute -right-2 w-2 h-2 border-t-2 border-r-2 border-amber-400/50 rotate-45 top-1/2 -translate-y-1/2 z-10" />
                    )}
                    <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-amber-400/10 text-amber-400 font-black text-sm">
                      {phase.rows.length}
                    </span>
                    <div className="flex flex-col">
                      <strong className="text-sm text-white">{phase.name}</strong>
                      <small className="text-xs text-slate-400 mt-0.5">{fmtTime(phase.hours)}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Top Priority Upgrade Recommendations */}
          <div className="mt-8 mb-6 min-w-0 w-full">
            <h2 className="text-xl md:text-2xl font-black text-white mb-1">Top Ưu Tiên Nâng Cấp ({suggestTop.length} mục)</h2>
            <p className="text-sm text-slate-400 mb-4">Danh sách sắp xếp theo điểm số chiến lược dựa trên phong cách của bạn</p>

            {suggestTop.length > 0 ? (
              <div className="flex flex-col bg-[#0c1620] border border-[#ffffff10] rounded-xl overflow-hidden w-full">
                {suggestTop.map((row, idx) => {
                  const isTop3 = idx < 3;
                  const isMid = idx >= 3 && idx < 8;
                  
                  return (
                    <article
                      key={row.item.id}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-3.5 border-b border-[#ffffff10] last:border-b-0 hover:bg-[#121f2d] transition-colors cursor-pointer group"
                      onClick={() => selectItemForDetail(row.item.id, row.target)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-black text-xs ${
                          isTop3 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                          : isMid ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" 
                          : "bg-slate-800 text-slate-400"
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="shrink-0">
                          <SmartArt item={row.item} size="sm" townHallLevel={row.target} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <strong className="text-sm md:text-base text-white truncate">{row.item.name}</strong>
                            <span className="text-[10px] md:text-xs font-semibold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 whitespace-nowrap">
                              Lv {row.current} → {row.target}
                            </span>
                            <small className="hidden md:inline-block text-[10px] font-bold text-cyan-400 uppercase tracking-wider ml-1">{itemKindLabel[row.item.kind]}</small>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all">{row.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:flex-row md:justify-end gap-3 md:gap-4 pt-2 md:pt-0 border-t border-[#ffffff10] md:border-none shrink-0 md:min-w-[160px]">
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto">
                          <b className="text-xs md:text-sm text-amber-200">{fmtCost(row.plan.costs)}</b>
                          <span className="text-[10px] md:text-xs text-slate-400">{fmtTime(row.plan.totalHours)} · TH{row.plan.requiredTownHall}</span>
                        </div>
                        <div className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block shrink-0">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="p-8 text-center text-slate-400 bg-[#0c1620] rounded-xl border border-[#ffffff10]">
                Tất cả mục đã đạt cấp tối đa cho phép ở TH{effectiveTownHall}!
              </p>
            )}
          </div>
        </motion.div>
        )}

        {/* MODE 2: TOÀN BỘ THEO TOWN HALL - Đầy đủ theo cấp TH, hỗ trợ lọc danh mục */}
        {calcMode === "town-hall" && (
          <motion.div
            key="town-hall"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="planner-main min-w-0 w-full"
          >
            {/* Controls: Target Town Hall and Builder Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="tracker-builder">
              <small>Tính tới Town Hall</small>
              <input
                type="range"
                min="1"
                max="18"
                step="1"
                value={maxTownHall}
                onChange={e => setMaxTownHall(clampInteger(e.target.valueAsNumber, 1, 18, 18))}
              />
              <strong>TH{maxTownHall}</strong>
            </label>
            <label className="tracker-builder">
              <small>Số thợ xây để ước tính</small>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={builderCount}
                onChange={e => setBuilderCount(clampInteger(e.target.valueAsNumber, 1, 6, 5))}
              />
              <strong>{builderCount} thợ xây</strong>
            </label>
          </div>

          {/* Overview Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="p-4 rounded-xl border border-[#ffffff10] bg-[#101b25]">
              <small className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><img src="/town-halls/th-1.png" className="w-4 h-4 object-contain inline-block" alt="TH" /> Mục tiêu</small>
              <strong className="text-xl font-black text-white block">TH{maxTownHall}</strong>
            </div>
            <div className="p-4 rounded-xl border border-[#ffffff10] bg-[#101b25]">
              <small className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><Wrench className="w-4 h-4 text-cyan-400"/> Việc còn lại</small>
              <strong className="text-xl font-black text-white block">{townHallTotals.count} mục</strong>
            </div>
            <div className="p-4 rounded-xl border border-[#ffffff10] bg-[#101b25]">
              <small className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1.5"><img src="/resources/gold.png" className="w-4 h-4 object-contain inline-block" alt="Cost" /> Tổng chi phí</small>
              <div className="mt-1"><CostBadges costs={townHallTotals.costs} /></div>
              {townHallTotals.hasEstimated && <span className="text-xs text-rose-400 mt-1 block flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Có số liệu ước tính</span>}
            </div>
          </div>

          {/* Lane Hours Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {(["Builder", "Laboratory", "Blacksmith", "Pet House"] as UpgradeLane[]).map(lane => {
              const totalHours = townHallTotals.laneHours[lane];
              if (lane === "Builder") {
                return (
                  <div key={lane} className="flex flex-col p-3 rounded-lg bg-[#0c1620] border border-[#ffffff08]">
                    <small className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                      <img src="/resources/builder.png" className="w-3.5 h-3.5 object-contain inline-block" alt="Builder" /> Thợ xây (Builder)
                    </small>
                    <strong className="text-lg font-bold text-white mb-0.5" title={fmtTimeExact(totalHours / builderCount)}>{fmtTime(totalHours / builderCount)}</strong>
                    <span className="text-xs text-slate-500" title={fmtTimeExact(totalHours)}>Tổng: {fmtTime(totalHours, true)} / {builderCount} thợ</span>
                  </div>
                );
              }
              return (
                <div key={lane} className="flex flex-col p-3 rounded-lg bg-[#0c1620] border border-[#ffffff08]">
                  <small className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                    {lane === "Laboratory" ? <FlaskConical className="w-3.5 h-3.5 text-rose-400"/> : lane === "Blacksmith" ? <img src="/resources/builder.png" className="w-3.5 h-3.5 object-contain inline-block" alt="Blacksmith" /> : <PawPrint className="w-3.5 h-3.5 text-amber-400"/>} {lane}
                  </small>
                  <strong className="text-lg font-bold text-white mb-0.5" title={fmtTimeExact(totalHours)}>{fmtTime(totalHours)}</strong>
                  <span className="text-xs text-slate-500">Hàng chờ riêng</span>
                </div>
              );
            })}
          </div>

          {/* Gợi ý nâng cấp thông minh 3 công trình ưu tiên nhất cho TH mục tiêu */}
          <SmartBuildingAdvisor
            player={player}
            manualLevels={manualLevels}
            effectiveTownHall={maxTownHall}
            goldPassDiscount={goldPassDiscount}
            onSelectItemDetail={selectItemForDetail}
          />

          {/* Category Filter Pills - Giúp giảm tải màn hình, không bị ngợp */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Lọc danh mục:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${thCategoryFilter === "all" ? "bg-amber-400 text-slate-950" : "bg-[#142636] text-slate-300 hover:bg-[#1f374e]"}`}
                onClick={() => setThCategoryFilter("all")}
              >
                Tất cả ({townHallRows.length})
              </button>
              {townHallGroups.map(group => (
                <button
                  key={group.kind}
                  type="button"
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${thCategoryFilter === group.kind ? "bg-amber-400 text-slate-950" : "bg-[#142636] text-slate-300 hover:bg-[#1f374e]"}`}
                  onClick={() => setThCategoryFilter(group.kind)}
                >
                  {itemKindLabel[group.kind]} ({group.rows.length})
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Tables */}
          <div className="flex flex-col gap-6 mt-6 min-w-0 w-full">
            {filteredTownHallGroups.map(group => (
              <section className="bg-[#0c1620] border border-[#ffffff10] rounded-xl overflow-hidden min-w-0 w-full" key={group.kind}>
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-[#ffffff10] bg-[#101b25]">
                  <div>
                    <h2 className="text-lg font-black text-white">{itemKindLabel[group.kind]}</h2>
                    <p className="text-xs text-slate-400 mt-1">Cấp hiện tại so với cấp tối đa cho phép ở TH{maxTownHall}.</p>
                  </div>
                  <span className="text-sm font-semibold text-cyan-400 mt-3 md:mt-0">{group.rows.length} mục · {fmtCost(group.costs)} · {fmtTime(group.totalHours)}</span>
                </div>
                <div className="flex flex-col w-full overflow-x-auto">
                  <div className="min-w-[600px] w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 p-3 bg-[#ffffff05] border-b border-[#ffffff10] text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Mục</span>
                      <span>Cấp</span>
                      <span>Chi phí</span>
                      <span>Thời gian</span>
                      <span>Điều kiện</span>
                    </div>
                    {/* Table Rows */}
                    {group.rows.map(row => (
                      <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 p-3 border-b border-[#ffffff10] last:border-b-0 items-center hover:bg-[#121f2d] transition-colors" key={row.item.id}>
                        <div className="flex items-center gap-3">
                          <SmartArt item={row.item} size="sm" townHallLevel={row.target} />
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => selectItemForDetail(row.item.id, row.target)}
                              className="text-left font-bold text-amber-200 hover:text-amber-400 hover:underline cursor-pointer transition-colors text-sm"
                            >
                              {row.item.name}
                            </button>
                            <small className="text-[10px] text-slate-500 font-medium">
                              {dataStatusLabel[row.item.dataStatus]}{row.item.quantity > 1 ? ` ×${row.item.quantity}` : ""}
                            </small>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-white whitespace-nowrap">{row.current} → <span className="text-emerald-400">{row.target}</span></span>
                        <span className="text-sm font-semibold text-amber-200">{fmtCost(row.plan.costs)}</span>
                        <span className="text-sm text-slate-300">{fmtTime(row.plan.totalHours)}</span>
                        <span className="text-xs text-slate-400">
                          TH{row.plan.requiredTownHall}
                          {row.plan.requires.length > 0 && <span className="block text-rose-300/80 mt-0.5">Yêu cầu: {row.plan.requires.join(", ")}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
            {!filteredTownHallGroups.length && (
              <p className="p-8 text-center text-slate-400 bg-[#0c1620] rounded-xl border border-[#ffffff10]">Không có mục nào cần nâng trong danh mục này để tới TH{maxTownHall}.</p>
            )}
          </div>
        </motion.div>
        )}

        {/* MODE 3: TRA CỨU CHI TIẾT (SINGLE ITEM DEEP DIVE) */}
        {calcMode === "single" && (
          <motion.div
            key="single"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="planner-layout"
          >
            <aside className="planner-controls">
            <label>
              <small>Lọc loại nâng cấp</small>
              <select value={plannerKind} onChange={e => setPlannerKind(e.target.value as UpgradeItem["kind"] | "all")}>
                <option value="all">Tất cả</option>
                {Object.entries(itemKindLabel).filter(([kind]) => kind !== "wall").map(([kind, label]) => (
                  <option key={kind} value={kind}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <small>Chọn mục nâng cấp</small>
              <select
                value={plannerItemId}
                onChange={e => {
                  const next = upgradeItems.find(x => x.id === e.target.value) || upgradeItems[0];
                  setPlannerItemId(next.id);
                  setTargetLevel(next.levels.at(-1)?.level || 1);
                }}
              >
                {plannerItemGroups.map(group => (
                  <optgroup label={itemKindLabel[group.kind]} key={group.kind}>
                    {group.items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {!plannerItem.apiTracked && (
              <label>
                <small>Cấp hiện tại nhập tay</small>
                <input
                  type="number"
                  min="0"
                  max={maxPlannerLevel}
                  step="1"
                  value={currentPlannerLevel}
                  onChange={e => setManualLevel(plannerItem, e.target.valueAsNumber)}
                />
              </label>
            )}
            {plannerItem.apiTracked && !player && (
              <p className="no-data">
                Mục này lấy cấp từ dữ liệu API (hero/quân/phép) — cần kết nối tài khoản mới có cấp hiện tại, tạm coi là cấp 0.
              </p>
            )}
            <label>
              <small>Mục tiêu level</small>
              <input
                type="number"
                min={currentPlannerLevel}
                max={maxPlannerLevel}
                step="1"
                value={safeTargetLevel}
                onChange={e => setTargetLevel(clampInteger(e.target.valueAsNumber, currentPlannerLevel, maxPlannerLevel, currentPlannerLevel))}
              />
            </label>
            <label>
              <small>Số thợ xây để ước tính</small>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={builderCount}
                onChange={e => setBuilderCount(clampInteger(e.target.valueAsNumber, 1, 6, 5))}
              />
              <strong>{builderCount} thợ xây</strong>
            </label>
            <div className="source-box">
              <strong>Nguồn dữ liệu</strong>
              {upgradeSources.map(source => <p key={source}>{source}</p>)}
            </div>
          </aside>

          <div className="planner-main">
            <div className="planner-item-head">
              <SmartArt item={plannerItem} size="sm" townHallLevel={safeTargetLevel} />
              <div>
                <small>{itemKindLabel[plannerItem.kind]} · {plannerItem.lane}</small>
                <strong>{plannerItem.name}{plannerItem.quantity > 1 ? ` ×${plannerItem.quantity}` : ""}</strong>
              </div>
            </div>

            <div className="planner-summary">
              <article>
                <small><img src="/resources/exp.png" className="w-3.5 h-3.5 inline-block object-contain" alt="Progress" /> Tiến độ</small>
                <strong>Lv {currentPlannerLevel} → Lv {safeTargetLevel}</strong>
                <span>{plan.steps.length} cấp cần nâng × {plannerItem.quantity} · Tối đa Lv {maxPlannerLevel}</span>
              </article>
              <article>
                <small><img src="/town-halls/th-1.png" className="w-3.5 h-3.5 inline-block object-contain" alt="TH" /> Town Hall cần đạt</small>
                <strong>TH{plan.requiredTownHall}</strong>
                <span>{plannerItem.id === "town-hall" ? "Theo cấp TH mục tiêu" : "Theo điều kiện từng level"}</span>
              </article>
              <article>
                <small><img src="/resources/gold.png" className="w-3.5 h-3.5 inline-block object-contain" alt="Cost" /> Tổng chi phí</small>
                <strong><CostBadges costs={plan.costs} /></strong>
                <span>{dataStatusLabel[plannerItem.dataStatus]} · {plannerItem.source}</span>
              </article>
              <article>
                <small><img src="/resources/time.png" className="w-3.5 h-3.5 inline-block object-contain" alt="Time" /> Thời gian</small>
                <strong title={fmtTimeExact(plan.totalHours)}>{fmtTime(plan.totalHours)}</strong>
                <span>{plannerItem.lane === "Builder" ? `${fmtTime(plan.totalHours / builderCount)} nếu chia ${builderCount} thợ xây` : "Lab/Blacksmith/Pet House chạy 1 hàng chờ riêng"}</span>
              </article>
            </div>

            {plan.requires.length > 0 && (
              <div className="requires-box">
                <AlertTriangle />
                <div>
                  <strong>Cần chuẩn bị trước</strong>
                  <p>{plan.requires.join(" · ")}</p>
                </div>
              </div>
            )}

            {plannerItem.levels.length > 30 ? (
              <div className="level-progress">
                <div className="level-progress-bar">
                  <span style={{ width: `${Math.min(100, Math.round((safeTargetLevel / maxPlannerLevel) * 100))}%` }} />
                </div>
                <div className="level-progress-labels">
                  <span>Lv {currentPlannerLevel}</span>
                  <span>Mục tiêu Lv {safeTargetLevel}</span>
                  <span>Tối đa Lv {maxPlannerLevel}</span>
                </div>
              </div>
            ) : (
              <div className="level-strip">
                {plannerItem.levels.map(level => {
                  const state = level.level <= currentPlannerLevel ? "done" : level.level <= safeTargetLevel ? "target" : "future";
                  return (
                    <span key={level.level} className={state} title={`${plannerItem.name} level ${level.level}`}>
                      {level.level}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="upgrade-table">
              <div className="upgrade-row head">
                <span>Cấp</span>
                <span>Điều kiện</span>
                <span>Chi phí</span>
                <span>Thời gian</span>
                <span>Ghi chú</span>
              </div>
              {plan.steps.length ? (
                (showAllLevels ? plan.steps : plan.steps.slice(0, LEVEL_TABLE_PREVIEW)).map(step => (
                  <div className="upgrade-row" key={step.level}>
                    <span><b>{currentPlannerLevel + 1 === step.level ? "Tiếp theo" : "Level"} {step.level}</b></span>
                    <span>TH{step.townHall}</span>
                    <span className="flex items-center gap-1.5">
                      {step.resource ? <img src={resourceIcon[step.resource]} alt={step.resource} className="w-3.5 h-3.5 object-contain inline-block" /> : null}
                      {fmtNumber(step.cost * plannerItem.quantity)}
                    </span>
                    <span>{fmtTime(step.timeHours * plannerItem.quantity)}</span>
                    <span>
                      {dataStatusLabel[plannerItem.dataStatus]}. {plannerItem.quantity > 1 ? `Áp dụng cho ${plannerItem.quantity} mục. ` : ""}
                      {step.requires?.join(", ") || "Không có điều kiện phụ"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="no-data">Mục này đã đạt hoặc vượt level mục tiêu.</p>
              )}
            </div>

            {plan.steps.length > LEVEL_TABLE_PREVIEW && (
              <button className="show-more-levels" onClick={() => setShowAllLevels(x => !x)}>
                {showAllLevels ? "Thu gọn danh sách" : `Xem thêm ${plan.steps.length - LEVEL_TABLE_PREVIEW} cấp nữa (tổng ${plan.steps.length} cấp còn lại)`}
              </button>
            )}
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
