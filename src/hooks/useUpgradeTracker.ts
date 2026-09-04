import { useMemo } from "react";
import type { Player } from "../types";
import { type UpgradeItem, type UpgradeLane, upgradeItems } from "../upgradeData";
import { emptyCosts, addCosts } from "../utils/formatters";
import { currentLevelFor, targetForTownHall, summarizePlan, priorityFor, styleScoreFor, styleReasonFor, phaseFor, manualKey, trackerKindOrder } from "../utils/upgradeLogic";
import type { Playstyle, StyleFocus } from "../utils/upgradeLogic";

export const plannerItems = upgradeItems.filter(item => item.kind !== "wall");

export function useUpgradeTracker({
  player,
  manualLevels,
  maxTownHall,
  playstyle,
  attackFocus,
  defenseFocusPick,
  guestTownHall,
  goldPassDiscount
}: {
  player: Player | null;
  manualLevels: Record<string, number>;
  maxTownHall: number;
  playstyle: Playstyle;
  attackFocus: StyleFocus;
  defenseFocusPick: StyleFocus;
  guestTownHall: number;
  goldPassDiscount: number;
}) {
  const townHallRows = useMemo(() => plannerItems.map(item => {
    const current = currentLevelFor(item, player, manualLevels);
    const target = targetForTownHall(item, maxTownHall);
    return { item, current, target, plan: summarizePlan(item, current, target, item.quantity, goldPassDiscount) };
  }).filter(row => row.target > row.current && row.plan.steps.length), [player, manualLevels, maxTownHall, goldPassDiscount]);

  const townHallGroups = useMemo(() => trackerKindOrder.map(kind => {
    const rows = townHallRows.filter(row => row.item.kind === kind);
    const costs = emptyCosts();
    let totalHours = 0;
    for (const row of rows) { addCosts(costs, row.plan.costs); totalHours += row.plan.totalHours; }
    return { kind, rows, costs, totalHours };
  }).filter(group => group.rows.length), [townHallRows]);

  const townHallTotals = useMemo(() => {
    const costs = emptyCosts();
    const laneHours: Record<UpgradeLane, number> = { Builder: 0, Laboratory: 0, Blacksmith: 0, "Pet House": 0, Instant: 0 };
    let hasEstimated = false;
    for (const row of townHallRows) {
        if (row.item.dataStatus === "unchecked") continue;
        if (row.item.dataStatus === "estimated") hasEstimated = true;
        addCosts(costs, row.plan.costs);
        laneHours[row.item.lane] += row.plan.totalHours;
    }
    return { costs, laneHours, count: townHallRows.filter(r => r.item.dataStatus !== "unchecked").length, hasEstimated };
  }, [townHallRows]);

  const effectiveTownHall = player?.townHallLevel || guestTownHall;

  const suggestRows = useMemo(() => {
    const townHall = effectiveTownHall;
    return plannerItems.map(item => {
      const current = currentLevelFor(item, player, manualLevels);
      const target = targetForTownHall(item, townHall);
      const plan = summarizePlan(item, current, target, item.quantity, goldPassDiscount);
      const priority = priorityFor(item);
      const score = styleScoreFor(item, priority.score, playstyle, attackFocus, defenseFocusPick);
      const reason = styleReasonFor(item, playstyle, attackFocus, defenseFocusPick) || priority.reason;
      return { item, current, target, plan, priority, score, reason };
    }).filter(row => row.target > row.current && row.plan.steps.length)
      .sort((a, b) => b.score - a.score || b.plan.totalHours - a.plan.totalHours);
  }, [player, manualLevels, playstyle, attackFocus, defenseFocusPick, effectiveTownHall, goldPassDiscount]);

  const suggestTotals = useMemo(() => {
    const costs = emptyCosts();
    const laneHours: Record<UpgradeLane, number> = { Builder: 0, Laboratory: 0, Blacksmith: 0, "Pet House": 0, Instant: 0 };
    let hasEstimated = false;
    for (const row of suggestRows) {
        if (row.item.dataStatus === "unchecked") continue;
        if (row.item.dataStatus === "estimated") hasEstimated = true;
        addCosts(costs, row.plan.costs);
        laneHours[row.item.lane] += row.plan.totalHours;
    }
    return { costs, laneHours, count: suggestRows.filter(r => r.item.dataStatus !== "unchecked").length, hasEstimated };
  }, [suggestRows]);

  const suggestTop = useMemo(() => suggestRows.slice(0, 14), [suggestRows]);

  const suggestPhases = useMemo(() => {
    const phases = ["Mở khóa", "Farm/đội đánh", "Hero", "Trang bị/Pet", "Phòng thủ", "Khác"];
    return phases.map(name => {
      const rows = suggestRows.filter(row => phaseFor(row.item) === name);
      return { name, rows, hours: rows.reduce((sum, row) => sum + row.plan.totalHours, 0) };
    }).filter(phase => phase.rows.length);
  }, [suggestRows]);

  return {
    townHallRows,
    townHallGroups,
    townHallTotals,
    suggestRows,
    suggestTotals,
    suggestTop,
    suggestPhases,
    effectiveTownHall
  };
}
