import fs from 'fs';
let content = fs.readFileSync('src/components/app/UpgradeTracker.tsx', 'utf8');

const imports = `import React, { useState } from "react";
import { AlertTriangle, Castle, Clock3, Coins, Crosshair, Gem, Info, Target } from "lucide-react";
import type { Player } from "../../types";
import { type UpgradeItem, upgradeItems } from "../../upgradeData";
import { CostBadges } from "../SmartArt";
import { pct, fmtNumber, fmtTime, fmtTimeExact, itemKindLabel, dataStatusLabel } from "../../utils/formatters";
import { type Playstyle, type StyleFocus, readStoredChoice, currentLevelFor, summarizePlan } from "../../utils/upgradeLogic";
import { useUpgradeTracker, plannerItems } from "../../hooks/useUpgradeTracker";

const playstyleValues: Playstyle[] = ["rush", "balanced", "defense", "rush-hall"];
const styleFocusValues: StyleFocus[] = ["ground", "air", "both"];
const LEVEL_TABLE_PREVIEW = 15;

interface UpgradeTrackerProps {
  player: Player | null;
  manualLevels: Record<string, number>;
  guestTownHall: number;
}

export function UpgradeTracker({ player, manualLevels, guestTownHall }: UpgradeTrackerProps) {
  const [calcMode, setCalcMode] = useState<"suggest"|"town-hall"|"single">("suggest");
  const [plannerKind, setPlannerKind] = useState<UpgradeItem["kind"]|"all">("all");
  const [plannerItemId, setPlannerItemId] = useState("barbarian-king");
  const [targetLevel, setTargetLevel] = useState(100);
  const [maxTownHall, setMaxTownHall] = useState(18);
  const [builderCount, setBuilderCount] = useState(5);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [playstyle, setPlaystyle] = useState<Playstyle>(() => readStoredChoice("coc-playstyle", playstyleValues, "balanced"));
  const [attackFocus, setAttackFocus] = useState<StyleFocus>(() => readStoredChoice("coc-attack-focus", styleFocusValues, "both"));
  const [defenseFocusPick, setDefenseFocusPick] = useState<StyleFocus>(() => readStoredChoice("coc-defense-focus", styleFocusValues, "both"));

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
    guestTownHall
  });

  const plannerItem = plannerItems.find(x => x.id === plannerItemId) || plannerItems[0];
  const currentPlannerLevel = currentLevelFor(plannerItem, player, manualLevels);
  const maxPlannerLevel = plannerItem.levels[plannerItem.levels.length - 1]?.level || 1;
  const safeTargetLevel = Math.max(currentPlannerLevel, Math.min(maxPlannerLevel, targetLevel));
  const plan = summarizePlan(plannerItem, currentPlannerLevel, safeTargetLevel, plannerItem.quantity);

`;

// Remove the condition `{tab==="planner"&&` and the closing brace
content = content.replace(/\{tab==="planner"&&/, '');
content = content.replace(/<\/section>\s*\}$/, '</section>\n}');

// Add the setup at the top
content = imports + content;

fs.writeFileSync('src/components/app/UpgradeTracker.tsx', content);
